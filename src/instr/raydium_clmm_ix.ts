/**
 * Raydium CLMM 指令解析
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

// Discriminators (little-endian u64)
const DISC = {
  SWAP: 14494794552504610216n,           // disc8(248, 198, 158, 145, 225, 117, 135, 200)
  INCREASE_LIQUIDITY: 746211110853564037n, // disc8(133, 29, 89, 223, 69, 238, 176, 10)
  DECREASE_LIQUIDITY: 100389049586398241n, // disc8(160, 38, 208, 111, 104, 91, 44, 1)
  CREATE_POOL: 13543951572834378153n,      // disc8(233, 146, 209, 142, 207, 104, 64, 188)
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

export function parseRaydiumClmmInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (discEq(instructionData, DISC.SWAP)) {
    return {
      RaydiumClmmSwap: {
        metadata: meta,
        pool_state: getAccount(accounts, 2) ?? Z,
        sender: getAccount(accounts, 0) ?? Z,
        token_account_0: Z,
        token_account_1: Z,
        amount_0: 0n,
        amount_1: 0n,
        zero_for_one: false,
        sqrt_price_x64: 0n,
        liquidity: 0n,
        transfer_fee_0: 0n,
        transfer_fee_1: 0n,
        tick: 0,
      },
    };
  }

  if (discEq(instructionData, DISC.INCREASE_LIQUIDITY)) {
    return {
      RaydiumClmmIncreaseLiquidity: {
        metadata: meta,
        pool: getAccount(accounts, 3) ?? Z,
        position_nft_mint: Z,
        user: getAccount(accounts, 0) ?? Z,
        liquidity: 0n,
        amount0_max: 0n,
        amount1_max: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.DECREASE_LIQUIDITY)) {
    return {
      RaydiumClmmDecreaseLiquidity: {
        metadata: meta,
        pool: getAccount(accounts, 3) ?? Z,
        position_nft_mint: Z,
        user: getAccount(accounts, 0) ?? Z,
        liquidity: 0n,
        amount0_min: 0n,
        amount1_min: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.CREATE_POOL)) {
    return {
      RaydiumClmmCreatePool: {
        metadata: meta,
        pool: getAccount(accounts, 4) ?? Z,
        creator: getAccount(accounts, 0) ?? Z,
        token_0_mint: Z,
        token_1_mint: Z,
        tick_spacing: 0,
        fee_rate: 0,
        sqrt_price_x64: 0n,
        open_time: 0n,
      },
    };
  }

  return null;
}
