/**
 * Orca Whirlpool 指令解析
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

// Discriminators (little-endian u64)
const DISC = {
  SWAP: 10853759504616839521n,                  // disc8(225, 202, 73, 175, 147, 43, 160, 150)
  INCREASE_LIQUIDITY: 11605574446925869086n,    // disc8(30, 7, 144, 181, 102, 254, 155, 161)
  DECREASE_LIQUIDITY: 12404363784710077478n,    // disc8(166, 1, 36, 71, 112, 202, 181, 171)
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

export function parseOrcaWhirlpoolInstruction(
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
      OrcaWhirlpoolSwap: {
        metadata: meta,
        whirlpool: getAccount(accounts, 2) ?? Z,
        a_to_b: true,
        pre_sqrt_price: 0n,
        post_sqrt_price: 0n,
        input_amount: 0n,
        output_amount: 0n,
        input_transfer_fee: 0n,
        output_transfer_fee: 0n,
        lp_fee: 0n,
        protocol_fee: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.INCREASE_LIQUIDITY)) {
    return {
      OrcaWhirlpoolLiquidityIncreased: {
        metadata: meta,
        whirlpool: getAccount(accounts, 1) ?? Z,
        position: getAccount(accounts, 3) ?? Z,
        tick_lower_index: 0,
        tick_upper_index: 0,
        liquidity: 0n,
        token_a_amount: 0n,
        token_b_amount: 0n,
        token_a_transfer_fee: 0n,
        token_b_transfer_fee: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.DECREASE_LIQUIDITY)) {
    return {
      OrcaWhirlpoolLiquidityDecreased: {
        metadata: meta,
        whirlpool: getAccount(accounts, 1) ?? Z,
        position: getAccount(accounts, 3) ?? Z,
        tick_lower_index: 0,
        tick_upper_index: 0,
        liquidity: 0n,
        token_a_amount: 0n,
        token_b_amount: 0n,
        token_a_transfer_fee: 0n,
        token_b_transfer_fee: 0n,
      },
    };
  }

  return null;
}
