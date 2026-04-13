import { describe, expect, it } from "vitest";
import {
  bincodeVecEntryCount,
  decodeEntriesBincodeFlat,
  decodeEntriesBincodeNested,
} from "./entries_decode.js";

function u64le(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
}

describe("decodeEntriesBincode", () => {
  it("empty vec (length 0)", () => {
    const data = new Uint8Array(8);
    const txs = decodeEntriesBincodeFlat(data);
    expect(txs.length).toBe(0);
  });

  it("one Entry with zero transactions", () => {
    const parts: Uint8Array[] = [];
    parts.push(u64le(1n)); // vec len 1
    parts.push(u64le(0n)); // num_hashes
    parts.push(new Uint8Array(32)); // hash
    parts.push(u64le(0n)); // tx_count
    const buf = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
    let o = 0;
    for (const p of parts) {
      buf.set(p, o);
      o += p.length;
    }
    const flat = decodeEntriesBincodeFlat(buf);
    expect(flat.length).toBe(0);

    const nested = decodeEntriesBincodeNested(buf);
    expect(nested.length).toBe(1);
    expect(nested[0]!.length).toBe(0);
  });

  it("truncated vec header throws", () => {
    expect(() => decodeEntriesBincodeFlat(new Uint8Array([1, 0, 0, 0]))).toThrow();
  });
});

describe("bincodeVecEntryCount", () => {
  it("reads length", () => {
    const data = new Uint8Array(8);
    new DataView(data.buffer).setBigUint64(0, 3n, true);
    expect(bincodeVecEntryCount(data)).toBe(3n);
  });

  it("rejects short buffer", () => {
    expect(() => bincodeVecEntryCount(new Uint8Array([1, 2]))).toThrow();
  });
});
