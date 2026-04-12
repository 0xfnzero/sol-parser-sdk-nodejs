/**
 * 各 DEX 程序 ID（Base58）。与 Rust 对齐的常量来自 `grpc/program_ids.ts`。
 */
export {
  PUMPFUN_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
  PUMPSWAP_FEES_PROGRAM_ID,
  BONK_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  METEORA_POOLS_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
} from "../grpc/program_ids.js";

/** Launchpad 等场景使用的程序 ID（非 Rust `Protocol` 映射项） */
export const BONK_LAUNCHPAD_PROGRAM_ID = "LanCh3hDdY7M6x8urBSLJhsQBgPNGKHNqJqGwzAEmBm";

/** 旧版 TS 包中的 Bonk ID，仅作兼容保留 */
export const BONK_PROGRAM_ID_LEGACY = "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1";
