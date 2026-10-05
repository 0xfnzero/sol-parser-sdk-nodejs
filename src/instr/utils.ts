import { makeMetadata, type EventMetadata } from "../core/metadata.js";
import { readBorshString, readPubkey } from "../util/binary.js";

export function ixMeta(
  signature: string,
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  blockTimeUs: number | bigint | string | undefined,
  grpcRecvUs: number | bigint | string
): EventMetadata {
  return makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
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
  readU16LE,
  readU8,
  readBool,
  readI64LE,
  readI32LE,
} from "../util/binary.js";
