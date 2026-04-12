/**
 * 与 Rust `sol-parser-sdk/src/grpc/program_ids.rs` 对齐的 DEX 程序 ID 与协议映射。
 */
import type { Protocol } from "./types.js";
import type { AccountFilter, TransactionFilter } from "./types.js";

export const PUMPFUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMPSWAP_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const PUMPSWAP_FEES_PROGRAM_ID = "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ";
/** 与 Rust `BONK_PROGRAM_ID`（`Protocol::Bonk`）一致 */
export const BONK_PROGRAM_ID = "BSwp6bEBihVLdqJRKS58NaebUBSDNjN7MdpFwNaR6gn3";
export const RAYDIUM_CPMM_PROGRAM_ID = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
export const RAYDIUM_CLMM_PROGRAM_ID = "CAMMCzo5YL8w4VFF8KVHrK22GGUQtcaMpgYqJPXBDvfE";
export const RAYDIUM_AMM_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
export const ORCA_WHIRLPOOL_PROGRAM_ID = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
export const METEORA_POOLS_PROGRAM_ID = "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB";
export const METEORA_DAMM_V2_PROGRAM_ID = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";
export const METEORA_DLMM_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";

/** 与 Rust `PROTOCOL_PROGRAM_IDS` 一致（仅含 Rust 中存在的协议） */
export const PROTOCOL_PROGRAM_IDS: Record<Protocol, readonly string[]> = {
  PumpFun: [PUMPFUN_PROGRAM_ID],
  PumpSwap: [PUMPSWAP_PROGRAM_ID],
  Bonk: [BONK_PROGRAM_ID],
  RaydiumCpmm: [RAYDIUM_CPMM_PROGRAM_ID],
  RaydiumClmm: [RAYDIUM_CLMM_PROGRAM_ID],
  RaydiumAmmV4: [RAYDIUM_AMM_V4_PROGRAM_ID],
  MeteoraDammV2: [METEORA_DAMM_V2_PROGRAM_ID],
};

/** 与 Rust `get_program_ids_for_protocols` 一致 */
export function getProgramIdsForProtocols(protocols: readonly Protocol[]): string[] {
  const out: string[] = [];
  for (const p of protocols) {
    const ids = PROTOCOL_PROGRAM_IDS[p];
    if (ids) out.push(...ids);
  }
  return [...new Set(out)].sort();
}

/** 与 Rust `TransactionFilter::for_protocols` 一致 */
export function transactionFilterForProtocols(protocols: readonly Protocol[]): TransactionFilter {
  return {
    account_include: getProgramIdsForProtocols(protocols),
    account_exclude: [],
    account_required: [],
  };
}

/** 与 Rust `AccountFilter::for_protocols` 一致 */
export function accountFilterForProtocols(protocols: readonly Protocol[]): AccountFilter {
  return {
    account: [],
    owner: getProgramIdsForProtocols(protocols),
    filters: [],
  };
}
