/** Exact outer-instruction provenance shared by RPC and in-memory gRPC parsing. */
import type { DexEvent } from "./dex_event.js";
import type {
  Message,
  MessageV0,
  ConfirmedTransactionMeta,
} from "@solana/web3.js";
import { TradeParseStatus } from "./raw_instruction.js";
import type { RawInstructionPayload } from "./raw_instruction.js";
import type { EventMetadata } from "./metadata.js";

/** Account reference only: direction, mint, pool and amounts remain unknown. */
export function unresolvedPumpfunTrade(
  metadata: EventMetadata,
  third_program: RawInstructionPayload,
): DexEvent {
  return {
    PumpFunTrade: {
      metadata,
      third_program,
      parse_status: TradeParseStatus.Unresolved,
      mint: "11111111111111111111111111111111",
      sol_amount: 0n,
      token_amount: 0n,
      is_buy: false,
      is_created_buy: false,
      user: "11111111111111111111111111111111",
      timestamp: 0n,
      virtual_sol_reserves: 0n,
      virtual_token_reserves: 0n,
      real_sol_reserves: 0n,
      real_token_reserves: 0n,
      fee_recipient: "11111111111111111111111111111111",
      fee_basis_points: 0n,
      fee: 0n,
      creator: "11111111111111111111111111111111",
      creator_fee_basis_points: 0n,
      creator_fee: 0n,
      track_volume: false,
      total_unclaimed_tokens: 0n,
      total_claimed_tokens: 0n,
      current_sol_volume: 0n,
      last_update_timestamp: 0n,
      ix_name: "",
      mayhem_mode: false,
      cashback_fee_basis_points: 0n,
      cashback: 0n,
      holder_rewards_bps: 0n,
      holder_rewards: 0n,
      is_cashback_coin: false,
      bonding_curve: "11111111111111111111111111111111",
      associated_bonding_curve: "11111111111111111111111111111111",
      token_program: "11111111111111111111111111111111",
      creator_vault: "11111111111111111111111111111111",
    },
  };
}
import * as programs from "../instr/program_ids.js";
import {
  getAccountKeyResolver,
  accountKeyToBase58,
  decodeIxData,
} from "./rpc_invoke_map.js";
export const TRADE_PROGRAMS: Readonly<Record<string, string>> = {
  PumpFunTrade: programs.PUMPFUN_PROGRAM_ID,
  PumpFunBuy: programs.PUMPFUN_PROGRAM_ID,
  PumpFunSell: programs.PUMPFUN_PROGRAM_ID,
  PumpFunBuyExactSolIn: programs.PUMPFUN_PROGRAM_ID,
  PumpSwapTrade: programs.PUMPSWAP_PROGRAM_ID,
  PumpSwapBuy: programs.PUMPSWAP_PROGRAM_ID,
  PumpSwapSell: programs.PUMPSWAP_PROGRAM_ID,
  RaydiumLaunchlabTrade: programs.RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  RaydiumClmmSwap: programs.RAYDIUM_CLMM_PROGRAM_ID,
  RaydiumCpmmSwap: programs.RAYDIUM_CPMM_PROGRAM_ID,
  RaydiumAmmV4Swap: programs.RAYDIUM_AMM_V4_PROGRAM_ID,
  OrcaWhirlpoolSwap: programs.ORCA_WHIRLPOOL_PROGRAM_ID,
  MeteoraPoolsSwap: programs.METEORA_POOLS_PROGRAM_ID,
  MeteoraDammV2Swap: programs.METEORA_DAMM_V2_PROGRAM_ID,
  MeteoraDlmmSwap: programs.METEORA_DLMM_PROGRAM_ID,
  MeteoraDbcSwap: programs.METEORA_DBC_PROGRAM_ID,
};

/** Missing/truncated top-level invocations never shift a later router's identity. */
export function logOuterIndices(
  logs: readonly string[],
  programs: readonly (string | undefined)[],
): number[] {
  const positions = new Map<string, number[]>(),
    counts = new Map<string, number>();
  programs.forEach((pid, i) => {
    if (pid) positions.set(pid, [...(positions.get(pid) ?? []), i]);
  });
  const invocations = logs.map(
    (log) => /^Program (\S+) invoke \[1\]$/.exec(log)?.[1],
  );
  for (const pid of invocations)
    if (pid) counts.set(pid, (counts.get(pid) ?? 0) + 1);
  const used = new Map<string, number>();
  let current = -1;
  return invocations.map((pid) => {
    if (pid) {
      const n = used.get(pid) ?? 0;
      used.set(pid, n + 1);
      current =
        counts.get(pid) === positions.get(pid)?.length
          ? positions.get(pid)![n]!
          : -1;
    }
    return current;
  });
}
export function markTradeExecutionSource(
  event: DexEvent,
  index: number,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
): void {
  const [name, data] = Object.entries(event)[0]!;
  const native = TRADE_PROGRAMS[name];
  if (!native || !meta || meta.err != null) return;
  data.parse_status = TradeParseStatus.ExecutionConfirmed;
  const ix = message.compiledInstructions[index];
  if (!ix) return;
  const keys = getAccountKeyResolver(message, meta);
  const program = accountKeyToBase58(keys.get(ix.programIdIndex));
  if (name === "RaydiumClmmSwap" || name === "OrcaWhirlpoolSwap") {
    const clmm = name === "RaydiumClmmSwap",
      pairs = new Map<string, [string, string]>();
    const candidates = [
      ix,
      ...(meta.innerInstructions?.find((group) => group.index === index)
        ?.instructions ?? []),
    ];
    for (const candidate of candidates) {
      if (
        !("programIdIndex" in candidate) ||
        !("data" in candidate) ||
        accountKeyToBase58(keys.get(candidate.programIdIndex)) !== native ||
        Array.from(decodeIxData(candidate.data).subarray(0, 8)).join(",") !==
          "43,4,237,11,26,201,30,98"
      )
        continue;
      const accounts =
        "accountKeyIndexes" in candidate
          ? candidate.accountKeyIndexes
          : candidate.accounts;
      const get = (i: number) => accountKeyToBase58(keys.get(accounts[i]!));
      if (get(clmm ? 2 : 4) !== (clmm ? data.pool_state : data.whirlpool))
        continue;
      const a = get(clmm ? 11 : 5),
        b = get(clmm ? 12 : 6);
      if (a && b) pairs.set(a + "|" + b, [a, b]);
    }
    if (pairs.size === 1) {
      const [a, b] = pairs.values().next().value!;
      if (clmm) {
        data.input_mint = a;
        data.output_mint = b;
      } else {
        data.token_mint_a = a;
        data.token_mint_b = b;
      }
    }
  }
  if (program && program !== native)
    data.third_program = {
      program_id: program,
      instruction_index: index,
      accounts: Array.from(
        ix.accountKeyIndexes,
        (i) => accountKeyToBase58(keys.get(i)) ?? null,
      ),
      account_indices: Array.from(ix.accountKeyIndexes),
      instruction_data: Array.from(decodeIxData(ix.data)),
    };
}
