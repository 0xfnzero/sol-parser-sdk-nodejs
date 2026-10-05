import { expect, it } from "vitest";
import { makeMetadata } from "./metadata.js";
import { dexEventToJsonString } from "./json_utils.js";
import { parseBlockMetaUpdate } from "../grpc/block_meta.js";
import { grpcTxIndexFromInfo } from "../grpc/yellowstone_parse.js";
it("preserves complete u64/i64 metadata and decimal JSON without Number conversion", () => {
  const max = (1n << 64n) - 1n, min = -(1n << 63n);
  const m = makeMetadata("sig", max.toString(), max, min.toString(), (1n << 63n) - 1n);
  expect(m.slot).toBe(max);
  expect(m.tx_index).toBe(max);
  expect(m.block_time_us).toBe(min);
  expect(JSON.parse(dexEventToJsonString(m)).slot).toBe(max.toString());
  expect(grpcTxIndexFromInfo({index: max.toString()})).toBe(max);
  expect(parseBlockMetaUpdate({slot: max.toString(), blockhash: ""}, 0).BlockMeta.metadata.slot).toBe(max);
});
it("rejects unsafe inputs and signed/unsigned overflow instead of truncating", () => {
  for (const slot of [-1, 1n << 64n, Number.MAX_SAFE_INTEGER + 1, "1.2", "", true])
    expect(() => makeMetadata("sig", slot as any, 0, 0, 0)).toThrow();
  expect(() => makeMetadata("sig", 1, -1, 0, 0)).toThrow();
  expect(() => makeMetadata("sig", 1, 0, 1n << 63n, 0)).toThrow();
  expect(() => grpcTxIndexFromInfo({index: "1.9"})).toThrow();
});
