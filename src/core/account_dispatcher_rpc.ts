/**
 * RPC 路径账户填充（`fillAccountsFromTransactionDataRpc`）。
 * `RaydiumClmmOpenPositionWithTokenExtNft` 与 `openPosition` 共用账户索引（见 `account_fill_raydium.ts`）。
 */
import type { DexEvent } from "./dex_event.js";
import {
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
  METEORA_POOLS_PROGRAM_ID,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PUMPFUN_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
} from "../instr/program_ids.js";
import type {
  ConfirmedTransactionMeta,
  Message,
  MessageV0,
  PublicKey,
} from "@solana/web3.js";
import {
  findMaxAccountsInvoke,
  getInstructionDataBytes,
  countInstructionAccounts,
  makeInvokeAccountGetter,
  type InvokePair,
} from "./rpc_invoke_map.js";
import {
  fillPumpfunCreateAccounts,
  fillPumpfunCreateV2Accounts,
  fillPumpfunMigrateAccounts,
  fillPumpfunTradeAccounts,
} from "./account_fill_pumpfun.js";
import {
  fillPumpswapBuyAccounts,
  fillPumpswapCreatePoolAccounts,
  fillPumpswapLiquidityAddedAccounts,
  fillPumpswapLiquidityRemovedAccounts,
  fillPumpswapSellAccounts,
  fillPumpswapTradeAccounts,
} from "./account_fill_pumpswap.js";
import {
  fillRaydiumAmmV4DepositAccounts,
  fillRaydiumAmmV4SwapAccounts,
  fillRaydiumAmmV4WithdrawAccounts,
  fillRaydiumClmmClosePositionAccounts,
  fillRaydiumClmmCreatePoolAccounts,
  fillRaydiumClmmDecreaseLiquidityAccounts,
  fillRaydiumClmmIncreaseLiquidityAccounts,
  fillRaydiumClmmOpenPositionAccounts,
  fillRaydiumClmmOpenPositionWithTokenExtNftAccounts,
  fillRaydiumClmmSwapAccounts,
  fillRaydiumCpmmDepositAccounts,
  fillRaydiumCpmmInitializeAccounts,
  fillRaydiumCpmmSwapAccounts,
  fillRaydiumCpmmWithdrawAccounts,
} from "./account_fill_raydium.js";
import {
  fillOrcaWhirlpoolLiquidityDecreasedAccounts,
  fillOrcaWhirlpoolLiquidityIncreasedAccounts,
  fillOrcaWhirlpoolSwapAccounts,
} from "./account_fill_orca.js";
import {
  fillRaydiumLaunchlabPoolCreateAccounts,
  fillRaydiumLaunchlabTradeAccounts,
} from "./account_fill_raydium_launchlab.js";
import {
  fillMeteoraDammV2AddLiquidityAccounts,
  fillMeteoraDammV2ClosePositionAccounts,
  fillMeteoraDammV2CreatePositionAccounts,
  fillMeteoraDammV2InitializePoolAccounts,
  fillMeteoraDammV2RemoveLiquidityAccounts,
  fillMeteoraDammV2SwapAccounts,
  fillMeteoraDlmmAddLiquidityAccounts,
  fillMeteoraDlmmRemoveLiquidityAccounts,
  fillMeteoraDlmmSwapAccounts,
  fillMeteoraPoolsAddLiquidityAccounts,
  fillMeteoraPoolsRemoveLiquidityAccounts,
  fillMeteoraPoolsSwapAccounts,
} from "./account_fill_meteora.js";

function tryFill(
  programId: string,
  programInvokes: Map<string, InvokePair[]>,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  resolver: { get(i: number): PublicKey | undefined },
  fn: (get: (i: number) => string) => void,
  anchor?: { pool: string; index: number },
  unambiguous = false,
): void {
  if (anchor || unambiguous) {
    const hasAnchor = anchor && anchor.pool && anchor.pool !== "11111111111111111111111111111111";
    if (!hasAnchor && !unambiguous) return;
    let selected: ((i: number) => string) | null = null;
    for (const invocation of programInvokes.get(programId) ?? []) {
      const candidate = makeInvokeAccountGetter(
        resolver,
        invocation,
        message,
        meta,
      );
      if (!candidate || (hasAnchor && candidate(anchor!.index) !== anchor!.pool)) continue;
      // One pool can be traded by multiple users within the same transaction.
      // Without an invocation position, keep missing context instead of guessing.
      if (
        selected &&
        Array.from({ length: 18 }, (_, i) => i).some(
          (i) => selected!(i) !== candidate(i),
        )
      )
        return;
      selected = candidate;
    }
    if (selected) fn(selected);
    return;
  }
  const invoke = findMaxAccountsInvoke(
    programId,
    programInvokes,
    message,
    meta,
  );
  if (!invoke) return;
  const get = makeInvokeAccountGetter(resolver, invoke, message, meta);
  if (!get) return;
  fn(get);
}

/** 就地修改事件体内字段 */
export function fillAccountsFromTransactionDataRpc(
  ev: DexEvent,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  programInvokes: Map<string, InvokePair[]>,
  resolver: { get(i: number): PublicKey | undefined },
): void {
  const fillSwap = (
    e:
      | Parameters<typeof fillPumpswapBuyAccounts>[0]
      | Parameters<typeof fillPumpswapSellAccounts>[0],
    buy: boolean,
  ): void => {
    if (!e.pool || e.pool === "11111111111111111111111111111111") return;
    const legacy = buy
      ? ["102,6,61,18,1,218,235,234", "198,46,21,82,180,217,232,112"]
      : ["51,230,133,164,1,127,131,173"];
    const compact = buy
      ? ["184,23,238,97,103,197,211,61", "194,171,28,70,104,77,91,47"]
      : ["93,246,130,60,231,233,64,178"];
    let selected: ((i: number) => string) | undefined;
    for (const invoke of programInvokes.get(PUMPSWAP_PROGRAM_ID) ?? []) {
      const raw = getInstructionDataBytes(message, meta, invoke);
      const disc = raw?.slice(0, 8).join(",");
      if (!disc || (!legacy.includes(disc) && !compact.includes(disc))) continue;
      const minimum = compact.includes(disc) ? 17 : buy ? 23 : 21;
      if (countInstructionAccounts(message, meta, invoke) < minimum) continue;
      const get = makeInvokeAccountGetter(resolver, invoke, message, meta);
      if (
        !get ||
        get(0) !== e.pool ||
        (e.user &&
          e.user !== "11111111111111111111111111111111" &&
          get(1) !== e.user)
      )
        continue;
      if (selected) return;
      selected = get;
    }
    if (selected) {
      if (buy)
        fillPumpswapBuyAccounts(
          e as Parameters<typeof fillPumpswapBuyAccounts>[0],
          selected,
        );
      else
        fillPumpswapSellAccounts(
          e as Parameters<typeof fillPumpswapSellAccounts>[0],
          selected,
        );
    }
  };
  const fillCreate = (e: Parameters<typeof fillPumpfunCreateAccounts>[0], v2Only = false): void => {
    let selected: {get: (i: number) => string; v2: boolean} | undefined;
    for (const invoke of programInvokes.get(PUMPFUN_PROGRAM_ID) ?? []) {
      const raw = getInstructionDataBytes(message, meta, invoke);
      const matches = (disc: number[]) => raw && disc.every((b, i) => raw[i] === b);
      const v2 = !!matches([214,144,76,236,95,139,49,180]);
      if (!v2 && (v2Only || !matches([24,30,200,40,5,28,7,119]))) continue;
      if (countInstructionAccounts(message, meta, invoke) < (v2 ? 16 : 14)) continue;
      const get = makeInvokeAccountGetter(resolver, invoke, message, meta);
      if (!get || (e.mint && e.mint !== "11111111111111111111111111111111" && get(0) !== e.mint)) continue;
      if (selected) return;
      selected = {get, v2};
    }
    if (selected) {
      if (selected.v2) fillPumpfunCreateV2Accounts(e as Parameters<typeof fillPumpfunCreateV2Accounts>[0], selected.get);
      else fillPumpfunCreateAccounts(e, selected.get);
    }
  };
  if ("PumpFunTrade" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunTrade, g),
    );
  } else if ("PumpFunBuy" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunBuy, g),
    );
  } else if ("PumpFunSell" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunSell, g),
    );
  } else if ("PumpFunBuyExactSolIn" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunBuyExactSolIn, g),
    );
  } else if ("PumpFunCreate" in ev) {
    fillCreate(ev.PumpFunCreate);
  } else if ("PumpFunCreateV2" in ev) {
    fillCreate(ev.PumpFunCreateV2, true);
  } else if ("PumpFunMigrate" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunMigrateAccounts(ev.PumpFunMigrate, g),
    );
  } else if ("PumpSwapBuy" in ev) {
    fillSwap(ev.PumpSwapBuy, true);
  } else if ("PumpSwapSell" in ev) {
    fillSwap(ev.PumpSwapSell, false);
  } else if ("PumpSwapTrade" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapTradeAccounts(ev.PumpSwapTrade, g),
    );
  } else if ("PumpSwapCreatePool" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapCreatePoolAccounts(ev.PumpSwapCreatePool, g),
    );
  } else if ("PumpSwapLiquidityAdded" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapLiquidityAddedAccounts(ev.PumpSwapLiquidityAdded, g),
    );
  } else if ("PumpSwapLiquidityRemoved" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapLiquidityRemovedAccounts(ev.PumpSwapLiquidityRemoved, g),
    );
  } else if ("RaydiumClmmSwap" in ev) {
    tryFill(
      RAYDIUM_CLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumClmmSwapAccounts(ev.RaydiumClmmSwap, g),
    );
  } else if ("RaydiumClmmCreatePool" in ev) {
    tryFill(
      RAYDIUM_CLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumClmmCreatePoolAccounts(ev.RaydiumClmmCreatePool, g),
    );
  } else if ("RaydiumClmmOpenPosition" in ev) {
    tryFill(
      RAYDIUM_CLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumClmmOpenPositionAccounts(ev.RaydiumClmmOpenPosition, g),
    );
  } else if ("RaydiumClmmOpenPositionWithTokenExtNft" in ev) {
    tryFill(
      RAYDIUM_CLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillRaydiumClmmOpenPositionWithTokenExtNftAccounts(
          ev.RaydiumClmmOpenPositionWithTokenExtNft,
          g,
        ),
    );
  } else if ("RaydiumClmmClosePosition" in ev) {
    tryFill(
      RAYDIUM_CLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillRaydiumClmmClosePositionAccounts(ev.RaydiumClmmClosePosition, g),
    );
  } else if ("RaydiumClmmIncreaseLiquidity" in ev) {
    tryFill(
      RAYDIUM_CLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillRaydiumClmmIncreaseLiquidityAccounts(
          ev.RaydiumClmmIncreaseLiquidity,
          g,
        ),
    );
  } else if ("RaydiumClmmDecreaseLiquidity" in ev) {
    tryFill(
      RAYDIUM_CLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillRaydiumClmmDecreaseLiquidityAccounts(
          ev.RaydiumClmmDecreaseLiquidity,
          g,
        ),
    );
  } else if ("RaydiumCpmmSwap" in ev) {
    tryFill(
      RAYDIUM_CPMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumCpmmSwapAccounts(ev.RaydiumCpmmSwap, g),
    );
  } else if ("RaydiumCpmmDeposit" in ev) {
    tryFill(
      RAYDIUM_CPMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumCpmmDepositAccounts(ev.RaydiumCpmmDeposit, g),
    );
  } else if ("RaydiumCpmmWithdraw" in ev) {
    tryFill(
      RAYDIUM_CPMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumCpmmWithdrawAccounts(ev.RaydiumCpmmWithdraw, g),
    );
  } else if ("RaydiumCpmmInitialize" in ev) {
    tryFill(
      RAYDIUM_CPMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumCpmmInitializeAccounts(ev.RaydiumCpmmInitialize, g),
    );
  } else if ("RaydiumAmmV4Swap" in ev) {
    tryFill(
      RAYDIUM_AMM_V4_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumAmmV4SwapAccounts(ev.RaydiumAmmV4Swap, g),
      {pool:ev.RaydiumAmmV4Swap.amm,index:1},
      true,
    );
  } else if ("RaydiumAmmV4Deposit" in ev) {
    tryFill(
      RAYDIUM_AMM_V4_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumAmmV4DepositAccounts(ev.RaydiumAmmV4Deposit, g),
    );
  } else if ("RaydiumAmmV4Withdraw" in ev) {
    tryFill(
      RAYDIUM_AMM_V4_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumAmmV4WithdrawAccounts(ev.RaydiumAmmV4Withdraw, g),
    );
  } else if ("OrcaWhirlpoolSwap" in ev) {
    tryFill(
      ORCA_WHIRLPOOL_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillOrcaWhirlpoolSwapAccounts(ev.OrcaWhirlpoolSwap, g),
    );
  } else if ("OrcaWhirlpoolLiquidityIncreased" in ev) {
    tryFill(
      ORCA_WHIRLPOOL_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillOrcaWhirlpoolLiquidityIncreasedAccounts(
          ev.OrcaWhirlpoolLiquidityIncreased,
          g,
        ),
    );
  } else if ("OrcaWhirlpoolLiquidityDecreased" in ev) {
    tryFill(
      ORCA_WHIRLPOOL_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillOrcaWhirlpoolLiquidityDecreasedAccounts(
          ev.OrcaWhirlpoolLiquidityDecreased,
          g,
        ),
    );
  } else if ("MeteoraDammV2Swap" in ev) {
    tryFill(
      METEORA_DAMM_V2_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillMeteoraDammV2SwapAccounts(ev.MeteoraDammV2Swap, g),
    );
  } else if ("MeteoraDammV2CreatePosition" in ev) {
    tryFill(
      METEORA_DAMM_V2_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraDammV2CreatePositionAccounts(
          ev.MeteoraDammV2CreatePosition,
          g,
        ),
    );
  } else if ("MeteoraDammV2InitializePool" in ev) {
    tryFill(
      METEORA_DAMM_V2_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraDammV2InitializePoolAccounts(
          ev.MeteoraDammV2InitializePool,
          g,
        ),
    );
  } else if ("MeteoraDammV2ClosePosition" in ev) {
    tryFill(
      METEORA_DAMM_V2_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraDammV2ClosePositionAccounts(
          ev.MeteoraDammV2ClosePosition,
          g,
        ),
    );
  } else if ("MeteoraDammV2AddLiquidity" in ev) {
    tryFill(
      METEORA_DAMM_V2_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraDammV2AddLiquidityAccounts(ev.MeteoraDammV2AddLiquidity, g),
    );
  } else if ("MeteoraDammV2RemoveLiquidity" in ev) {
    tryFill(
      METEORA_DAMM_V2_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraDammV2RemoveLiquidityAccounts(
          ev.MeteoraDammV2RemoveLiquidity,
          g,
        ),
    );
  } else if ("MeteoraPoolsSwap" in ev) {
    tryFill(
      METEORA_POOLS_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillMeteoraPoolsSwapAccounts(ev.MeteoraPoolsSwap, g),
    );
  } else if ("MeteoraPoolsAddLiquidity" in ev) {
    tryFill(
      METEORA_POOLS_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraPoolsAddLiquidityAccounts(ev.MeteoraPoolsAddLiquidity, g),
    );
  } else if ("MeteoraPoolsRemoveLiquidity" in ev) {
    tryFill(
      METEORA_POOLS_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraPoolsRemoveLiquidityAccounts(
          ev.MeteoraPoolsRemoveLiquidity,
          g,
        ),
    );
  } else if ("MeteoraDlmmSwap" in ev) {
    tryFill(
      METEORA_DLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillMeteoraDlmmSwapAccounts(ev.MeteoraDlmmSwap, g),
    );
  } else if ("MeteoraDlmmAddLiquidity" in ev) {
    tryFill(
      METEORA_DLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillMeteoraDlmmAddLiquidityAccounts(ev.MeteoraDlmmAddLiquidity, g),
    );
  } else if ("MeteoraDlmmRemoveLiquidity" in ev) {
    tryFill(
      METEORA_DLMM_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillMeteoraDlmmRemoveLiquidityAccounts(
          ev.MeteoraDlmmRemoveLiquidity,
          g,
        ),
    );
  } else if ("RaydiumLaunchlabTrade" in ev) {
    tryFill(
      RAYDIUM_LAUNCHLAB_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) => fillRaydiumLaunchlabTradeAccounts(ev.RaydiumLaunchlabTrade, g),
      { pool: ev.RaydiumLaunchlabTrade.pool_state, index: 4 },
    );
  } else if ("RaydiumLaunchlabPoolCreate" in ev) {
    tryFill(
      RAYDIUM_LAUNCHLAB_PROGRAM_ID,
      programInvokes,
      message,
      meta,
      resolver,
      (g) =>
        fillRaydiumLaunchlabPoolCreateAccounts(
          ev.RaydiumLaunchlabPoolCreate,
          g,
        ),
      { pool: ev.RaydiumLaunchlabPoolCreate.pool_state, index: 5 },
    );
  }
}
