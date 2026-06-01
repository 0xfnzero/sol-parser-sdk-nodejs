import { describe, expect, it } from "vitest";
import { METEORA_DBC_PROGRAM_ID } from "../grpc/program_ids.js";
import { eventTypeFilterExclude, eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { parseLogOptimized, parseLogOptimizedWithProgramId } from "./optimized_matcher.js";
import { METEORA_DBC_DISC } from "./meteora_dbc.js";
import { PROGRAM_LOG_DISC } from "./program_log_discriminators.js";

function pumpFeesUpdateAdminLog(): string {
  const buf = new Uint8Array(8 + 8 + 32 + 32);
  new DataView(buf.buffer).setBigUint64(0, PROGRAM_LOG_DISC.PUMP_FEES_UPDATE_ADMIN, true);
  return `Program data: ${Buffer.from(buf).toString("base64")}`;
}

function dbcSwapLog(): string {
  const buf = new Uint8Array(8 + 32 + 32 + 2 + 8 * 9 + 16);
  const dv = new DataView(buf.buffer);
  let o = 0;
  dv.setBigUint64(o, METEORA_DBC_DISC.SWAP, true);
  o += 8;
  buf.fill(1, o, o + 32);
  o += 32;
  buf.fill(2, o, o + 32);
  o += 32;
  buf[o++] = 1;
  buf[o++] = 1;
  for (const v of [10n, 9n, 10n, 8n]) {
    dv.setBigUint64(o, v, true);
    o += 8;
  }
  dv.setBigUint64(o, 0n, true);
  dv.setBigUint64(o + 8, 1n, true);
  o += 16;
  for (const v of [1n, 2n, 3n, 10n, 123n]) {
    dv.setBigUint64(o, v, true);
    o += 8;
  }
  return `Program data: ${Buffer.from(buf).toString("base64")}`;
}

describe("parseLogOptimized event filters", () => {
  it("filters by discriminator before parsing", () => {
    const log = pumpFeesUpdateAdminLog();

    expect(
      parseLogOptimized(log, "sig", 1, 0, undefined, 1, undefined, false)?.PumpFeesUpdateAdmin
    ).toBeTruthy();

    expect(
      parseLogOptimized(
        log,
        "sig",
        1,
        0,
        undefined,
        1,
        eventTypeFilterIncludeOnly(["PumpFeesUpdateAdmin"]),
        false
      )?.PumpFeesUpdateAdmin
    ).toBeTruthy();

    expect(
      parseLogOptimized(
        log,
        "sig",
        1,
        0,
        undefined,
        1,
        eventTypeFilterIncludeOnly(["PumpFunCreate"]),
        false
      )
    ).toBeNull();

    expect(
      parseLogOptimized(
        log,
        "sig",
        1,
        0,
        undefined,
        1,
        eventTypeFilterExclude(["PumpFeesUpdateAdmin"]),
        false
      )
    ).toBeNull();
  });

  it("uses program context for Meteora DBC shared discriminators", () => {
    const log = dbcSwapLog();
    const unscoped = parseLogOptimized(
      log,
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["MeteoraDbcSwap"]),
      false
    );
    expect(unscoped).toBeNull();

    const scoped = parseLogOptimizedWithProgramId(
      log,
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["MeteoraDbcSwap"]),
      false,
      undefined,
      METEORA_DBC_PROGRAM_ID
    );
    expect(scoped?.MeteoraDbcSwap?.output_amount).toBe(8n);
  });
});
