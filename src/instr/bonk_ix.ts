/**
 * Bonk Launchpad 指令解析
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

// Discriminators (little-endian u64)
const DISC = {
  TRADE: 397092801079849094n,       // disc8(2, 3, 4, 5, 6, 7, 8, 9)
  POOL_CREATE: 578530140957057025n, // disc8(1, 2, 3, 4, 5, 6, 7, 8)
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

export function parseBonkInstruction(
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

  if (discEq(instructionData, DISC.TRADE)) {
    return {
      BonkTrade: {
        metadata: meta,
        pool_state: getAccount(accounts, 1) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        amount_in: 0n,
        amount_out: 0n,
        is_buy: true,
        trade_direction: "Buy",
        exact_in: true,
      },
    };
  }

  if (discEq(instructionData, DISC.POOL_CREATE)) {
    return {
      BonkPoolCreate: {
        metadata: meta,
        base_mint_param: {
          symbol: "BONK",
          name: "Bonk Pool",
          uri: "https://bonk.com",
          decimals: 5,
        },
        pool_state: getAccount(accounts, 1) ?? Z,
        creator: getAccount(accounts, 8) ?? Z,
      },
    };
  }

  return null;
}
