/**
 * Anchor `emit!` / program data 日志的前 8 字节 discriminator（小端 u64）。
 * 本仓库内唯一权威列表；变更须同步 `scripts/program-log-discriminators.json` 并运行 `npm run verify:discriminators`。
 */
export function u64leDiscriminator(bytes: readonly [number, number, number, number, number, number, number, number]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

/** PumpSwap（pAMMBay）program data 事件 */
export const PUMPSWAP_DISC = {
  BUY: u64leDiscriminator([103, 244, 82, 31, 44, 245, 119, 119]),
  SELL: u64leDiscriminator([62, 47, 55, 10, 165, 3, 220, 42]),
  CREATE_POOL: u64leDiscriminator([177, 49, 12, 210, 160, 118, 167, 116]),
  ADD_LIQUIDITY: u64leDiscriminator([120, 248, 61, 83, 31, 142, 107, 144]),
  REMOVE_LIQUIDITY: u64leDiscriminator([22, 9, 133, 26, 160, 44, 71, 192]),
} as const;

/**
 * `parseLogOptimized` 使用的全部分支 discriminator（含 PumpSwap 引用上表）。
 */
export const PROGRAM_LOG_DISC = {
  PUMPFUN_CREATE: u64leDiscriminator([27, 114, 169, 77, 222, 235, 99, 118]),
  PUMPFUN_TRADE: u64leDiscriminator([189, 219, 127, 211, 78, 230, 97, 238]),
  PUMPFUN_MIGRATE: u64leDiscriminator([189, 233, 93, 185, 92, 148, 234, 148]),
  PUMPSWAP_BUY: PUMPSWAP_DISC.BUY,
  PUMPSWAP_SELL: PUMPSWAP_DISC.SELL,
  PUMPSWAP_CREATE_POOL: PUMPSWAP_DISC.CREATE_POOL,
  PUMPSWAP_ADD_LIQUIDITY: PUMPSWAP_DISC.ADD_LIQUIDITY,
  PUMPSWAP_REMOVE_LIQUIDITY: PUMPSWAP_DISC.REMOVE_LIQUIDITY,
  RAYDIUM_CLMM_SWAP: u64leDiscriminator([248, 198, 158, 145, 225, 117, 135, 200]),
  RAYDIUM_CLMM_INCREASE_LIQUIDITY: u64leDiscriminator([133, 29, 89, 223, 69, 238, 176, 10]),
  RAYDIUM_CLMM_DECREASE_LIQUIDITY: u64leDiscriminator([160, 38, 208, 111, 104, 91, 44, 1]),
  RAYDIUM_CLMM_CREATE_POOL: u64leDiscriminator([233, 146, 209, 142, 207, 104, 64, 188]),
  RAYDIUM_CLMM_COLLECT_FEE: u64leDiscriminator([164, 152, 207, 99, 187, 104, 171, 119]),
  RAYDIUM_CPMM_SWAP_BASE_IN: u64leDiscriminator([143, 190, 90, 218, 196, 30, 51, 222]),
  RAYDIUM_CPMM_SWAP_BASE_OUT: u64leDiscriminator([55, 217, 98, 86, 163, 74, 180, 173]),
  RAYDIUM_CPMM_DEPOSIT: u64leDiscriminator([242, 35, 198, 137, 82, 225, 242, 182]),
  RAYDIUM_CPMM_WITHDRAW: u64leDiscriminator([183, 18, 70, 156, 148, 109, 161, 34]),
  RAYDIUM_AMM_SWAP_BASE_IN: u64leDiscriminator([0, 0, 0, 0, 0, 0, 0, 9]),
  RAYDIUM_AMM_SWAP_BASE_OUT: u64leDiscriminator([0, 0, 0, 0, 0, 0, 0, 11]),
  RAYDIUM_AMM_DEPOSIT: u64leDiscriminator([0, 0, 0, 0, 0, 0, 0, 3]),
  RAYDIUM_AMM_WITHDRAW: u64leDiscriminator([0, 0, 0, 0, 0, 0, 0, 4]),
  RAYDIUM_AMM_INITIALIZE2: u64leDiscriminator([0, 0, 0, 0, 0, 0, 0, 1]),
  RAYDIUM_AMM_WITHDRAW_PNL: u64leDiscriminator([0, 0, 0, 0, 0, 0, 0, 7]),
  ORCA_TRADED: u64leDiscriminator([225, 202, 73, 175, 147, 43, 160, 150]),
  ORCA_LIQUIDITY_INCREASED: u64leDiscriminator([30, 7, 144, 181, 102, 254, 155, 161]),
  ORCA_LIQUIDITY_DECREASED: u64leDiscriminator([166, 1, 36, 71, 112, 202, 181, 171]),
  ORCA_POOL_INITIALIZED: u64leDiscriminator([100, 118, 173, 87, 12, 198, 254, 229]),
  METEORA_AMM_SWAP: u64leDiscriminator([81, 108, 227, 190, 205, 208, 10, 196]),
  METEORA_AMM_ADD_LIQUIDITY: u64leDiscriminator([31, 94, 125, 90, 227, 52, 61, 186]),
  METEORA_AMM_REMOVE_LIQUIDITY: u64leDiscriminator([116, 244, 97, 232, 103, 31, 152, 58]),
  METEORA_AMM_BOOTSTRAP_LIQUIDITY: u64leDiscriminator([121, 127, 38, 136, 92, 55, 14, 247]),
  METEORA_AMM_POOL_CREATED: u64leDiscriminator([202, 44, 41, 88, 104, 220, 157, 82]),
  METEORA_AMM_SET_POOL_FEES: u64leDiscriminator([245, 26, 198, 164, 88, 18, 75, 9]),
  METEORA_DAMM_SWAP: u64leDiscriminator([27, 60, 21, 213, 138, 170, 187, 147]),
  METEORA_DAMM_SWAP2: u64leDiscriminator([189, 66, 51, 168, 38, 80, 117, 153]),
  METEORA_DAMM_ADD_LIQUIDITY: u64leDiscriminator([175, 242, 8, 157, 30, 247, 185, 169]),
  METEORA_DAMM_REMOVE_LIQUIDITY: u64leDiscriminator([87, 46, 88, 98, 175, 96, 34, 91]),
  METEORA_DAMM_INITIALIZE_POOL: u64leDiscriminator([228, 50, 246, 85, 203, 66, 134, 37]),
  METEORA_DAMM_CREATE_POSITION: u64leDiscriminator([156, 15, 119, 198, 29, 181, 221, 55]),
  METEORA_DAMM_CLOSE_POSITION: u64leDiscriminator([20, 145, 144, 68, 143, 142, 214, 178]),
} as const;

export type ProgramLogDiscriminatorKey = keyof typeof PROGRAM_LOG_DISC;
