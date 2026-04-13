/**
 * gRPC `Entry.entries` 负载解码：对齐 sol-parser-sdk-golang `shredstream/entries_decode.go`
 *（bincode Vec<Entry> 前缀 + 每笔线格式交易定长扫描）。
 */
import type { ShredWasmTx } from "./instruction_parse.js";
import { wireBytesToShredWasmTx } from "./wire_to_shred_tx.js";

export type DecodedWireTransaction = {
  raw: Uint8Array;
  /** 全部签名（每笔交易至少一枚；展示用首签） */
  signatures: Uint8Array[];
};

const MAX_VEC_ENTRIES = 100_000;

function readU64LE(buf: Uint8Array, offset: number): bigint {
  const v = new DataView(buf.buffer, buf.byteOffset + offset, 8);
  return v.getBigUint64(0, true);
}

/** 与 Go `BincodeVecEntryCount` 一致 */
export function bincodeVecEntryCount(entriesBytes: Uint8Array): bigint {
  if (entriesBytes.length < 8) {
    throw new Error("shredstream: entries payload too short for vec length");
  }
  const n = readU64LE(entriesBytes, 0);
  if (n > BigInt(MAX_VEC_ENTRIES)) {
    throw new Error(`shredstream: corrupt entry_count ${n} exceeds limit`);
  }
  return n;
}

/** compact-u16，与 Go `decodeCompactU16` 一致 */
export function decodeCompactU16(buf: Uint8Array, pos: number): { value: number; bytes: number } | null {
  if (pos >= buf.length) return null;
  const b0 = buf[pos]!;
  if (b0 < 0x80) return { value: b0, bytes: 1 };
  if (pos + 1 >= buf.length) return null;
  const b1 = buf[pos + 1]!;
  if (b1 < 0x80) {
    return { value: (b0 & 0x7f) | (b1 << 7), bytes: 2 };
  }
  if (pos + 2 >= buf.length) return null;
  const b2 = buf[pos + 2]!;
  return { value: (b0 & 0x7f) | ((b1 & 0x7f) << 7) | (b2 << 14), bytes: 3 };
}

/** 返回 (txWireLength, signatures)；失败返回 null */
export function parseTransaction(buf: Uint8Array, pos: number): { txLen: number; sigs: Uint8Array[] } | null {
  const start = pos;
  if (pos >= buf.length) return null;

  const sigCountEnc = decodeCompactU16(buf, pos);
  if (!sigCountEnc) return null;
  let p = pos + sigCountEnc.bytes;
  const sigCount = sigCountEnc.value;

  const sigsEnd = p + sigCount * 64;
  if (sigsEnd > buf.length) return null;

  const sigs: Uint8Array[] = [];
  for (let i = 0; i < sigCount; i++) {
    sigs.push(buf.subarray(p, p + 64));
    p += 64;
  }

  if (p >= buf.length) return null;
  const msgFirst = buf[p]!;
  const isV0 = msgFirst >= 0x80;
  if (isV0) p += 1;

  p += 3;
  if (p > buf.length) return null;

  const acctEnc = decodeCompactU16(buf, p);
  if (!acctEnc) return null;
  p += acctEnc.bytes;
  p += acctEnc.value * 32;
  if (p > buf.length) return null;

  p += 32;
  if (p > buf.length) return null;

  const ixCountEnc = decodeCompactU16(buf, p);
  if (!ixCountEnc) return null;
  p += ixCountEnc.bytes;
  const ixCount = ixCountEnc.value;

  for (let ix = 0; ix < ixCount; ix++) {
    p += 1;
    if (p > buf.length) return null;
    const acctLenEnc = decodeCompactU16(buf, p);
    if (!acctLenEnc) return null;
    p += acctLenEnc.bytes;
    p += acctLenEnc.value;
    if (p > buf.length) return null;
    const dataLenEnc = decodeCompactU16(buf, p);
    if (!dataLenEnc) return null;
    p += dataLenEnc.bytes;
    p += dataLenEnc.value;
    if (p > buf.length) return null;
  }

  if (isV0) {
    if (p >= buf.length) return null;
    const atlCountEnc = decodeCompactU16(buf, p);
    if (!atlCountEnc) return null;
    p += atlCountEnc.bytes;
    const atlCount = atlCountEnc.value;
    for (let atl = 0; atl < atlCount; atl++) {
      p += 32;
      if (p > buf.length) return null;
      const wLenEnc = decodeCompactU16(buf, p);
      if (!wLenEnc) return null;
      p += wLenEnc.bytes;
      p += wLenEnc.value;
      if (p > buf.length) return null;
      const rLenEnc = decodeCompactU16(buf, p);
      if (!rLenEnc) return null;
      p += rLenEnc.bytes;
      p += rLenEnc.value;
      if (p > buf.length) return null;
    }
  }

  return { txLen: p - start, sigs };
}

class BatchDecoder {
  private buffer = new Uint8Array(0);
  private expectedEntryCount = 0;
  private entriesYielded = 0;
  private cursor = 0;

  private append(payload: Uint8Array): void {
    const merged = new Uint8Array(this.buffer.length + payload.length);
    merged.set(this.buffer);
    merged.set(payload, this.buffer.length);
    this.buffer = merged;
  }

  private tryDecodeEntry(): DecodedWireTransaction[] | null {
    const pos = this.cursor;
    const buf = this.buffer;
    if (pos + 48 > buf.length) return null;

    let p = pos + 8 + 32;
    const txCount = Number(readU64LE(buf, p));
    p += 8;

    const txs: DecodedWireTransaction[] = [];
    for (let i = 0; i < txCount; i++) {
      const txStart = p;
      const parsed = parseTransaction(buf, p);
      if (!parsed) {
        throw new Error(`shredstream: truncated transaction ${i} in entry`);
      }
      const { txLen, sigs } = parsed;
      const raw = buf.subarray(txStart, txStart + txLen);
      txs.push({
        raw: Uint8Array.from(raw),
        signatures: sigs.map((s) => Uint8Array.from(s)),
      });
      p = txStart + txLen;
    }

    this.cursor = p;
    return txs;
  }

  /** 扁平列表，对齐 Go `DecodeEntriesBincode` */
  pushFlat(payload: Uint8Array): DecodedWireTransaction[] {
    this.append(payload);

    if (this.expectedEntryCount === 0 && this.entriesYielded === 0 && this.cursor === 0) {
      if (this.buffer.length < 8) {
        throw new Error("shredstream: entries payload too short for vec length");
      }
      const count = readU64LE(this.buffer, 0);
      if (count > BigInt(MAX_VEC_ENTRIES)) {
        throw new Error(`shredstream: corrupt entry_count ${count} exceeds limit`);
      }
      this.expectedEntryCount = Number(count);
      this.cursor = 8;
    }

    const out: DecodedWireTransaction[] = [];
    while (this.entriesYielded < this.expectedEntryCount) {
      const entryTxs = this.tryDecodeEntry();
      if (entryTxs === null) {
        throw new Error(`shredstream: incomplete entry at offset ${this.cursor}`);
      }
      out.push(...entryTxs);
      this.entriesYielded++;
    }

    return out;
  }

  /** 按 Solana `Entry` 分层，供 ShredStream 客户端（Entry 内 tx_index） */
  pushNested(payload: Uint8Array): DecodedWireTransaction[][] {
    this.append(payload);

    if (this.expectedEntryCount === 0 && this.entriesYielded === 0 && this.cursor === 0) {
      if (this.buffer.length < 8) {
        throw new Error("shredstream: entries payload too short for vec length");
      }
      const count = readU64LE(this.buffer, 0);
      if (count > BigInt(MAX_VEC_ENTRIES)) {
        throw new Error(`shredstream: corrupt entry_count ${count} exceeds limit`);
      }
      this.expectedEntryCount = Number(count);
      this.cursor = 8;
    }

    const nested: DecodedWireTransaction[][] = [];
    while (this.entriesYielded < this.expectedEntryCount) {
      const entryTxs = this.tryDecodeEntry();
      if (entryTxs === null) {
        throw new Error(`shredstream: incomplete entry at offset ${this.cursor}`);
      }
      nested.push(entryTxs);
      this.entriesYielded++;
    }

    return nested;
  }
}

export function decodeEntriesBincodeFlat(entriesBytes: Uint8Array): DecodedWireTransaction[] {
  if (entriesBytes.length === 0) return [];
  const dec = new BatchDecoder();
  return dec.pushFlat(entriesBytes);
}

export function decodeEntriesBincodeNested(entriesBytes: Uint8Array): DecodedWireTransaction[][] {
  if (entriesBytes.length === 0) return [];
  const dec = new BatchDecoder();
  return dec.pushNested(entriesBytes);
}

/**
 * 解码 gRPC `entries` 字节并展开为与旧 WASM 相同的嵌套 `ShredWasmTx`（跳过无法反序列化的单笔交易）。
 */
export function decodeShredstreamEntriesBincode(bytes: Uint8Array): ShredWasmTx[][] {
  const nested = decodeEntriesBincodeNested(bytes);
  const out: ShredWasmTx[][] = [];
  for (const entryTxs of nested) {
    const row: ShredWasmTx[] = [];
    for (const w of entryTxs) {
      const tx = wireBytesToShredWasmTx(w.raw);
      if (tx) row.push(tx);
    }
    out.push(row);
  }
  return out;
}
