import { it, expect } from "vitest";
import { applyRawSnapshot } from "../examples/stonkfun_snapshot_refresh.js";
import type { RawAccountSnapshotEvent } from "./liquidity_snapshot.js";
it("refresh example rejects conflicting versions and preserves closure tombstones", () => {
  const old = {
    pubkey: "key",
    owner: "owner",
    data: Buffer.from("one").toString("base64"),
    slot: "100",
    write_version: "1",
  };
  const event = (
    data = "one",
    slot = 100,
    version = 1n,
    lamports = 1n,
  ): RawAccountSnapshotEvent => ({
    metadata: {
      signature: "",
      slot: BigInt(slot),
      tx_index: 0n,
      block_time_us: 0n,
      grpc_recv_us: 0n,
    },
    write_version: version,
    is_startup: false,
    account: {
      pubkey: "key",
      owner: "owner",
      data: Buffer.from(data),
      lamports,
      executable: false,
      rent_epoch: 0n,
    },
  });
  expect(applyRawSnapshot(old, event())).toBe(old);
  expect(applyRawSnapshot(old, event("old", 99, 999n))).toBe(old);
  expect(() => applyRawSnapshot(old, event("bad"))).toThrow(/Conflicting/);
  expect(applyRawSnapshot(old, event("stale bytes", 101, 0n, 0n)).data).toBe(
    "",
  );
});

it("refresh preserves full u64 slots", () => {
 const slot=(1n<<64n)-1n;
 const current={pubkey:"key",owner:"owner",data:"",slot:"1",write_version:"0"};
 const e={metadata:{slot},account:{pubkey:"key",owner:"owner",data:new Uint8Array(),lamports:1n},write_version:0n} as RawAccountSnapshotEvent;
 expect(applyRawSnapshot(current,e).slot).toBe(slot.toString());
});
