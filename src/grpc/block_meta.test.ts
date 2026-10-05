import { it, expect } from "vitest";
import { parseBlockMetaUpdate } from "./block_meta.js";
import { buildSubscribeRequestWithEventFilter } from "./subscribe_builder.js";
import { eventTypeFilterIncludeOnly, eventTypeFilterExclude } from "./types.js";
import {
  getProgramIdsForProtocols,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
} from "./program_ids.js";
it("LaunchLab aliases subscribe to one shared program, without guessing attribution", () => {
  expect(
    getProgramIdsForProtocols(["LaunchLab", "StonkFun", "RaydiumLaunchlab"]),
  ).toEqual([RAYDIUM_LAUNCHLAB_PROGRAM_ID]);
});
it("BlockMeta subscription opt-in follows include/exclude and survives no transaction filters", () => {
  expect(buildSubscribeRequestWithEventFilter([], []).blocksMeta).toEqual({});
  expect(
    buildSubscribeRequestWithEventFilter(
      [],
      [],
      eventTypeFilterIncludeOnly(["PumpFunTrade"]),
    ).blocksMeta,
  ).toEqual({});
  expect(
    buildSubscribeRequestWithEventFilter(
      [],
      [],
      eventTypeFilterIncludeOnly(["BlockMeta"]),
    ).blocksMeta,
  ).toEqual({ block_meta: {} });
  expect(
    buildSubscribeRequestWithEventFilter(
      [],
      [],
      eventTypeFilterExclude(["BlockMeta"]),
    ).blocksMeta,
  ).toEqual({});
});
it("BlockMeta exposes bank time and recent blockhash instead of transport creation time", () => {
  const e = parseBlockMetaUpdate(
    {
      slot: 452558748n,
      blockhash: "observed",
      blockTime: { timestamp: "1790928211" },
    },
    123,
    456,
  );
  expect("BlockMeta" in e && e.BlockMeta.metadata).toEqual({
    signature: "1".repeat(64),
    slot: 452558748n,
    tx_index: 0n,
    block_time_us: 1790928211000000n,
    grpc_recv_us: 123n,
    recent_blockhash: "observed",
  });
  const missing = parseBlockMetaUpdate({ slot: "1", blockhash: "" }, 123, 456);
  expect(
    "BlockMeta" in missing && missing.BlockMeta.metadata.block_time_us,
  ).toBe(456n);
});
it("BlockMeta saturates signed i64 timestamp multiplication like Rust", () => {
  const e = parseBlockMetaUpdate(
    {
      slot: 1n,
      blockhash: "",
      blockTime: { timestamp: "9223372036854775807" },
    },
    0,
  );
  expect("BlockMeta" in e && e.BlockMeta.metadata.block_time_us).toBe(
    (1n << 63n) - 1n,
  );
});
