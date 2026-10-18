import type {EventType, EventTypeFilter} from "../grpc/types.js";
import * as programs from "../grpc/program_ids.js";
import type {EventMetadata} from "./metadata.js";

/** Outer instruction only; contains no inferred CPI, trade direction or amounts. */
export interface RawInstructionEvent {
  metadata: EventMetadata;
  dexes: RawInstructionDex[];
  program_id: string;
  instruction_index: number;
  /** Original order including duplicates; null denotes an unresolved ALT key. */
  accounts: (string | null)[];
  account_indices: number[];
  instruction_data: number[];
}

export const INFRASTRUCTURE_PROGRAMS: ReadonlySet<string> = new Set(["11111111111111111111111111111111","TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb","ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL","ComputeBudget111111111111111111111111111111","MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr","Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo","AddressLookupTab1e1111111111111111111111111","Vote111111111111111111111111111111111111111","Ed25519SigVerify111111111111111111111111111","KeccakSecp256k11111111111111111111111111111","Secp256r1SigVerify1111111111111111111111111"]);

/** Stable DEX identifiers; JSON values match the Rust/Python/Go enums. */
export enum RawInstructionDexType {
  PumpFun = "pumpfun",
  PumpSwap = "pumpswap",
  RaydiumLaunchlab = "raydium_launchlab",
  RaydiumCpmm = "raydium_cpmm",
  RaydiumClmm = "raydium_clmm",
  RaydiumAmmV4 = "raydium_amm_v4",
  OrcaWhirlpool = "orca_whirlpool",
  MeteoraPools = "meteora_pools",
  MeteoraDammV2 = "meteora_damm_v2",
  MeteoraDlmm = "meteora_dlmm",
  MeteoraDbc = "meteora_dbc",
}

/** Program association only; pool is null when the wrapper layout is unknown. */
export interface RawInstructionDex {
  dex_type: RawInstructionDexType;
  program_id: string;
  pool: string | null;
}
const DEX_PROGRAMS: readonly [RawInstructionDexType, string, EventType][] = [
  [RawInstructionDexType.PumpFun, programs.PUMPFUN_PROGRAM_ID, "PumpFunTrade"],
  [RawInstructionDexType.PumpSwap, programs.PUMPSWAP_PROGRAM_ID, "PumpSwapTrade"],
  [RawInstructionDexType.RaydiumLaunchlab, programs.RAYDIUM_LAUNCHLAB_PROGRAM_ID, "RaydiumLaunchlabTrade"],
  [RawInstructionDexType.RaydiumCpmm, programs.RAYDIUM_CPMM_PROGRAM_ID, "RaydiumCpmmSwap"],
  [RawInstructionDexType.RaydiumClmm, programs.RAYDIUM_CLMM_PROGRAM_ID, "RaydiumClmmSwap"],
  [RawInstructionDexType.RaydiumAmmV4, programs.RAYDIUM_AMM_V4_PROGRAM_ID, "RaydiumAmmV4Swap"],
  [RawInstructionDexType.OrcaWhirlpool, programs.ORCA_WHIRLPOOL_PROGRAM_ID, "OrcaWhirlpoolSwap"],
  [RawInstructionDexType.MeteoraPools, programs.METEORA_POOLS_PROGRAM_ID, "MeteoraPoolsSwap"],
  [RawInstructionDexType.MeteoraDammV2, programs.METEORA_DAMM_V2_PROGRAM_ID, "MeteoraDammV2Swap"],
  [RawInstructionDexType.MeteoraDlmm, programs.METEORA_DLMM_PROGRAM_ID, "MeteoraDlmmSwap"],
  [RawInstructionDexType.MeteoraDbc, programs.METEORA_DBC_PROGRAM_ID, "MeteoraDbcSwap"],
];
export function rawInstructionDexes(program: string | undefined, accounts: (string | null)[]): RawInstructionDex[] {
  return DEX_PROGRAMS.filter(([, pid]) => program === pid || accounts.includes(pid))
    .map(([dex_type, program_id]) => ({dex_type, program_id, pool: null}));
}
export function rawInstructionMatchesFilter(dexes: RawInstructionDex[] = [], filter?: EventTypeFilter): boolean {
  if (!filter) return true;
  if (filter.exclude_types?.includes("RawInstruction")) return false;
  if (filter.include_only?.includes("RawInstruction")) return true;
  if (!dexes.length) return filter.include_only == null;
  return dexes.some(dex => {
    const row = DEX_PROGRAMS.find(([name]) => name === dex.dex_type);
    return !!row && (filter.include_only == null || filter.include_only.includes(row[2])) && filter.shouldInclude(row[2]);
  });
}
