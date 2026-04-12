/**
 * RPC 路径账户填充（`fillAccountsFromTransactionDataRpc`）。
 * `RaydiumClmmOpenPositionWithTokenExtNft` 与 `openPosition` 共用账户索引（见 `account_fill_raydium.ts`）。
 */
import type { DexEvent } from "./dex_event.js";
import {
  BONK_PROGRAM_ID,
  BONK_LAUNCHPAD_PROGRAM_ID,
  BONK_PROGRAM_ID_LEGACY,
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
import type { ConfirmedTransactionMeta, Message, MessageV0, PublicKey } from "@solana/web3.js";
import {
  findMaxAccountsInvoke,
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
  fillBonkPoolCreateAccounts,
  fillBonkTradeAccounts,
} from "./account_fill_bonk.js";
import {
  fillMeteoraDammV2AddLiquidityAccounts,
  fillMeteoraDammV2ClosePositionAccounts,
  fillMeteoraDammV2CreatePositionAccounts,
  fillMeteoraDammV2InitializePoolAccounts,
  fillMeteoraDammV2RemoveAllLiquidityAccounts,
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
  fn: (get: (i: number) => string) => void
): void {
  const invoke = findMaxAccountsInvoke(programId, programInvokes, message, meta);
  if (!invoke) return;
  const get = makeInvokeAccountGetter(resolver, invoke, message, meta);
  if (!get) return;
  fn(get);
}

const BONK_PROGRAM_FILL_ORDER = [
  BONK_PROGRAM_ID,
  BONK_LAUNCHPAD_PROGRAM_ID,
  BONK_PROGRAM_ID_LEGACY,
] as const;

/** Bonk 多程序 ID：按 Rust 主网 ID → Launchpad → 旧 TS 兼容顺序尝试 CPI 账户填充 */
function tryFillBonk(
  programInvokes: Map<string, InvokePair[]>,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  resolver: { get(i: number): PublicKey | undefined },
  fn: (get: (i: number) => string) => void
): void {
  for (const programId of BONK_PROGRAM_FILL_ORDER) {
    const invoke = findMaxAccountsInvoke(programId, programInvokes, message, meta);
    if (!invoke) continue;
    const get = makeInvokeAccountGetter(resolver, invoke, message, meta);
    if (!get) continue;
    fn(get);
    return;
  }
}

/** 就地修改事件体内字段 */
export function fillAccountsFromTransactionDataRpc(
  ev: DexEvent,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  programInvokes: Map<string, InvokePair[]>,
  resolver: { get(i: number): PublicKey | undefined }
): void {
  if ("PumpFunTrade" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunTrade, g)
    );
  } else if ("PumpFunBuy" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunBuy, g)
    );
  } else if ("PumpFunSell" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunSell, g)
    );
  } else if ("PumpFunBuyExactSolIn" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunTradeAccounts(ev.PumpFunBuyExactSolIn, g)
    );
  } else if ("PumpFunCreate" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunCreateAccounts(ev.PumpFunCreate, g)
    );
  } else if ("PumpFunCreateV2" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunCreateV2Accounts(ev.PumpFunCreateV2, g)
    );
  } else if ("PumpFunMigrate" in ev) {
    tryFill(PUMPFUN_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpfunMigrateAccounts(ev.PumpFunMigrate, g)
    );
  } else if ("PumpSwapBuy" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapBuyAccounts(ev.PumpSwapBuy, g)
    );
  } else if ("PumpSwapSell" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapSellAccounts(ev.PumpSwapSell, g)
    );
  } else if ("PumpSwapTrade" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapTradeAccounts(ev.PumpSwapTrade, g)
    );
  } else if ("PumpSwapCreatePool" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapCreatePoolAccounts(ev.PumpSwapCreatePool, g)
    );
  } else if ("PumpSwapLiquidityAdded" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapLiquidityAddedAccounts(ev.PumpSwapLiquidityAdded, g)
    );
  } else if ("PumpSwapLiquidityRemoved" in ev) {
    tryFill(PUMPSWAP_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillPumpswapLiquidityRemovedAccounts(ev.PumpSwapLiquidityRemoved, g)
    );
  } else if ("RaydiumClmmSwap" in ev) {
    tryFill(RAYDIUM_CLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumClmmSwapAccounts(ev.RaydiumClmmSwap, g)
    );
  } else if ("RaydiumClmmCreatePool" in ev) {
    tryFill(RAYDIUM_CLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumClmmCreatePoolAccounts(ev.RaydiumClmmCreatePool, g)
    );
  } else if ("RaydiumClmmOpenPosition" in ev) {
    tryFill(RAYDIUM_CLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumClmmOpenPositionAccounts(ev.RaydiumClmmOpenPosition, g)
    );
  } else if ("RaydiumClmmOpenPositionWithTokenExtNft" in ev) {
    tryFill(RAYDIUM_CLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumClmmOpenPositionWithTokenExtNftAccounts(ev.RaydiumClmmOpenPositionWithTokenExtNft, g)
    );
  } else if ("RaydiumClmmClosePosition" in ev) {
    tryFill(RAYDIUM_CLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumClmmClosePositionAccounts(ev.RaydiumClmmClosePosition, g)
    );
  } else if ("RaydiumClmmIncreaseLiquidity" in ev) {
    tryFill(RAYDIUM_CLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumClmmIncreaseLiquidityAccounts(ev.RaydiumClmmIncreaseLiquidity, g)
    );
  } else if ("RaydiumClmmDecreaseLiquidity" in ev) {
    tryFill(RAYDIUM_CLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumClmmDecreaseLiquidityAccounts(ev.RaydiumClmmDecreaseLiquidity, g)
    );
  } else if ("RaydiumCpmmSwap" in ev) {
    tryFill(RAYDIUM_CPMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumCpmmSwapAccounts(ev.RaydiumCpmmSwap, g)
    );
  } else if ("RaydiumCpmmDeposit" in ev) {
    tryFill(RAYDIUM_CPMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumCpmmDepositAccounts(ev.RaydiumCpmmDeposit, g)
    );
  } else if ("RaydiumCpmmWithdraw" in ev) {
    tryFill(RAYDIUM_CPMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumCpmmWithdrawAccounts(ev.RaydiumCpmmWithdraw, g)
    );
  } else if ("RaydiumCpmmInitialize" in ev) {
    tryFill(RAYDIUM_CPMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumCpmmInitializeAccounts(ev.RaydiumCpmmInitialize, g)
    );
  } else if ("RaydiumAmmV4Swap" in ev) {
    tryFill(RAYDIUM_AMM_V4_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumAmmV4SwapAccounts(ev.RaydiumAmmV4Swap, g)
    );
  } else if ("RaydiumAmmV4Deposit" in ev) {
    tryFill(RAYDIUM_AMM_V4_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumAmmV4DepositAccounts(ev.RaydiumAmmV4Deposit, g)
    );
  } else if ("RaydiumAmmV4Withdraw" in ev) {
    tryFill(RAYDIUM_AMM_V4_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillRaydiumAmmV4WithdrawAccounts(ev.RaydiumAmmV4Withdraw, g)
    );
  } else if ("OrcaWhirlpoolSwap" in ev) {
    tryFill(ORCA_WHIRLPOOL_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillOrcaWhirlpoolSwapAccounts(ev.OrcaWhirlpoolSwap, g)
    );
  } else if ("OrcaWhirlpoolLiquidityIncreased" in ev) {
    tryFill(ORCA_WHIRLPOOL_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillOrcaWhirlpoolLiquidityIncreasedAccounts(ev.OrcaWhirlpoolLiquidityIncreased, g)
    );
  } else if ("OrcaWhirlpoolLiquidityDecreased" in ev) {
    tryFill(ORCA_WHIRLPOOL_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillOrcaWhirlpoolLiquidityDecreasedAccounts(ev.OrcaWhirlpoolLiquidityDecreased, g)
    );
  } else if ("MeteoraDammV2Swap" in ev) {
    tryFill(METEORA_DAMM_V2_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDammV2SwapAccounts(ev.MeteoraDammV2Swap, g)
    );
  } else if ("MeteoraDammV2CreatePosition" in ev) {
    tryFill(METEORA_DAMM_V2_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDammV2CreatePositionAccounts(ev.MeteoraDammV2CreatePosition, g)
    );
  } else if ("MeteoraDammV2InitializePool" in ev) {
    tryFill(METEORA_DAMM_V2_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDammV2InitializePoolAccounts(ev.MeteoraDammV2InitializePool, g)
    );
  } else if ("MeteoraDammV2ClosePosition" in ev) {
    tryFill(METEORA_DAMM_V2_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDammV2ClosePositionAccounts(ev.MeteoraDammV2ClosePosition, g)
    );
  } else if ("MeteoraDammV2AddLiquidity" in ev) {
    tryFill(METEORA_DAMM_V2_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDammV2AddLiquidityAccounts(ev.MeteoraDammV2AddLiquidity, g)
    );
  } else if ("MeteoraDammV2RemoveAllLiquidity" in ev) {
    tryFill(METEORA_DAMM_V2_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDammV2RemoveAllLiquidityAccounts(ev.MeteoraDammV2RemoveAllLiquidity, g)
    );
  } else if ("MeteoraDammV2RemoveLiquidity" in ev) {
    tryFill(METEORA_DAMM_V2_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDammV2RemoveLiquidityAccounts(ev.MeteoraDammV2RemoveLiquidity, g)
    );
  } else if ("MeteoraPoolsSwap" in ev) {
    tryFill(METEORA_POOLS_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraPoolsSwapAccounts(ev.MeteoraPoolsSwap, g)
    );
  } else if ("MeteoraPoolsAddLiquidity" in ev) {
    tryFill(METEORA_POOLS_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraPoolsAddLiquidityAccounts(ev.MeteoraPoolsAddLiquidity, g)
    );
  } else if ("MeteoraPoolsRemoveLiquidity" in ev) {
    tryFill(METEORA_POOLS_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraPoolsRemoveLiquidityAccounts(ev.MeteoraPoolsRemoveLiquidity, g)
    );
  } else if ("MeteoraDlmmSwap" in ev) {
    tryFill(METEORA_DLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDlmmSwapAccounts(ev.MeteoraDlmmSwap, g)
    );
  } else if ("MeteoraDlmmAddLiquidity" in ev) {
    tryFill(METEORA_DLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDlmmAddLiquidityAccounts(ev.MeteoraDlmmAddLiquidity, g)
    );
  } else if ("MeteoraDlmmRemoveLiquidity" in ev) {
    tryFill(METEORA_DLMM_PROGRAM_ID, programInvokes, message, meta, resolver, (g) =>
      fillMeteoraDlmmRemoveLiquidityAccounts(ev.MeteoraDlmmRemoveLiquidity, g)
    );
  } else if ("BonkTrade" in ev) {
    tryFillBonk(programInvokes, message, meta, resolver, (g) =>
      fillBonkTradeAccounts(ev.BonkTrade, g)
    );
  } else if ("BonkPoolCreate" in ev) {
    tryFillBonk(programInvokes, message, meta, resolver, (g) =>
      fillBonkPoolCreateAccounts(ev.BonkPoolCreate, g)
    );
  }
}
