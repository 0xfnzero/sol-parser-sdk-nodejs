import { describe, it, expect } from "vitest";
import fixtures from "../../tests/fixtures/pump_upgrade/events.json";
import {
  parsePumpUpgradeEvent,
  decodePumpMultiHopIntent,
} from "./pump_upgrade";
import { makeMetadata } from "../core/metadata";
import { parseInnerInstructionUnified } from "../instr/inner";
import { eventTypeFilterIncludeOnly } from "../grpc/types";
describe("official Pump upgrade layouts", () => {
  it("parses scoped logs and CPI, rejects truncation and foreign programs", () => {
    for (const f of fixtures) {
      const b = Buffer.from(f.body, "hex"),
        meta = makeMetadata("sig", 1, 0, 0, 0); // JSON numbers above 2^53 must use wire bytes below
      const ds = Buffer.alloc(8);
      ds.writeBigUInt64LE(BigInt(f.discString));
      const n = ds.readBigUInt64LE();
      const parsed = parsePumpUpgradeEvent(n, b, meta, f.program)!;
      expect(parsed).not.toBeNull();
      const body = (parsed as any)[f.variant];
      for (const [k, v] of Object.entries(f.values))
        expect(body[k]).toBe(
          typeof v === "number" && k !== "bucket" ? BigInt(v) : v,
        );
      expect(
        parsePumpUpgradeEvent(n, b.subarray(0, -1), meta, f.program),
      ).toBeNull();
      expect(
        parsePumpUpgradeEvent(n, b, meta, "11111111111111111111111111111111"),
      ).toBeNull();
      const cpi = Buffer.concat([
        Buffer.from([228, 69, 165, 46, 81, 203, 154, 29]),
        ds,
        b,
      ]);
      expect(
        parseInnerInstructionUnified(
          cpi,
          [],
          "sig",
          1,
          0,
          0,
          0,
          eventTypeFilterIncludeOnly([f.variant as any]),
          f.program,
        ),
      ).not.toBeNull();
    }
  });
  it("accepts historical SOL completion and rejects invalid multi-hop intent", () => {
    const ds = 619296439455019615n;
    const e: any = parsePumpUpgradeEvent(
      ds,
      new Uint8Array(104),
      makeMetadata("sig", 1, 0, 0, 0),
    );
    expect(e.PumpFunComplete.quote_mint).toBe(
      "So11111111111111111111111111111111111111112",
    );
    const b = Buffer.alloc(24);
    Buffer.from([43, 100, 73, 19, 233, 246, 111, 148]).copy(b);
    b.writeBigUInt64LE(7n, 8);
    b.writeBigUInt64LE(9n, 16);
    const a = Array(26).fill("11111111111111111111111111111111");
    expect(
      decodePumpMultiHopIntent(
        "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
        b,
        a,
      )?.hops.length,
    ).toBe(2);
    expect(decodePumpMultiHopIntent("bad", b, a)).toBeNull();
  });
});
