import type { EventMetadata } from "../core/metadata.js";
import { readBorshString, readPubkey } from "../util/binary.js";

export function ixMeta(
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): EventMetadata {
  return {
    signature,
    slot,
    tx_index: txIndex,
    block_time_us: blockTimeUs ?? 0,
    grpc_recv_us: grpcRecvUs,
  };
}

export function getAccount(accounts: string[], i: number): string | undefined {
  return accounts[i];
}

/** Borsh 前缀字符串，返回 (utf8, 下一个 offset)；失败返回 null */
export function readBorshStrAt(data: Uint8Array, offset: number): { s: string; next: number } | null {
  return readBorshString(data, offset);
}

export function readPubkeyIx(data: Uint8Array, o: number): string | null {
  return readPubkey(data, o);
}

export {
  readU64LE,
  readU128LE,
  readU8,
  readBool,
  readI64LE,
  readI32LE,
} from "../util/binary.js";
