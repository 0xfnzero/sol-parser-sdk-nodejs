import { it, expect } from "vitest";
import bs58 from "bs58";
import {
  StonkFunPoolRegistry,
  type StonkFunGraduatedPool,
} from "./stonkfun_registry";
import {
  ROUTE_PROGRAMS,
  STONKFUN_STANDARD_PLATFORM_CONFIG,
} from "./transaction_route";
import { parseBlockMetaUpdate } from "./grpc/block_meta";
const pk = (n: number) => bs58.encode(new Uint8Array(32).fill(n));
function migration(): any {
  const keys = Array.from({ length: 28 }, (_, i) => pk(i + 1));
  keys[3] = STONKFUN_STANDARD_PLATFORM_CONFIG;
  keys[4] = ROUTE_PROGRAMS.RaydiumCpmm;
  keys.push(ROUTE_PROGRAMS.LaunchLab);
  return {
    slot: 1,
    transaction: {
      signatures: [bs58.encode(new Uint8Array(64).fill(31))],
      message: {
        accountKeys: keys,
        instructions: [
          {
            programIdIndex: 28,
            accounts: Array.from({ length: 28 }, (_, i) => i),
            data: bs58.encode(Buffer.from("885cc8671cda908c", "hex")),
          },
        ],
      },
    },
    meta: { err: null },
  };
}
it("registry validates execution evidence and indices atomically", () => {
  const tx = migration(),
    r = new StonkFunPoolRegistry();
  expect(r.observeRpcTransaction(tx)).toBe(1);
  expect(r.observeRpcTransaction(tx)).toBe(0);
  for (const kind of [
    "missing_status",
    "negative_program",
    "out_of_range_account",
    "duplicate_group",
  ]) {
    const bad = migration();
    if (kind === "missing_status") delete bad.meta.err;
    if (kind === "negative_program")
      bad.transaction.message.instructions[0].programIdIndex = -1;
    if (kind === "out_of_range_account")
      bad.transaction.message.instructions[0].accounts[27] = 99;
    if (kind === "duplicate_group")
      bad.meta.innerInstructions = [
        { index: 0, instructions: [] },
        { index: 0, instructions: [] },
      ];
    const fresh = new StonkFunPoolRegistry();
    expect(() => fresh.observeRpcTransaction(bad)).toThrow();
    expect(fresh.verifiedCpmmPools()).toEqual([]);
  }
  const failed = migration();
  failed.meta.err = { InstructionError: [0, "x"] };
  expect(new StonkFunPoolRegistry().observeRpcTransaction(failed)).toBe(0);
});
it("blockmeta refuses silent unsafe numeric conversion", () => {
  for (const slot of [
    Number.MAX_SAFE_INTEGER + 1,
    -1,
    "1.5",
  ])
    expect(() => parseBlockMetaUpdate({ slot, blockhash: "" }, 0)).toThrow();
  expect(() =>
    parseBlockMetaUpdate(
      {
        slot: "100",
        blockhash: "",
        blockTime: { timestamp: Number.MAX_SAFE_INTEGER + 1 },
      },
      0,
    ),
  ).toThrow();
  expect(
    parseBlockMetaUpdate(
      { slot: "100", blockhash: "", blockTime: { timestamp: "1" } },
      0,
    ).BlockMeta.metadata.block_time_us,
  ).toBe(1000000n);
});
