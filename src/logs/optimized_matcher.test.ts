import { describe, expect, it } from "vitest";
import { eventTypeFilterExclude, eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { parseLogOptimized } from "./optimized_matcher.js";
import { PROGRAM_LOG_DISC } from "./program_log_discriminators.js";

function pumpFeesUpdateAdminLog(): string {
  const buf = new Uint8Array(8 + 8 + 32 + 32);
  new DataView(buf.buffer).setBigUint64(0, PROGRAM_LOG_DISC.PUMP_FEES_UPDATE_ADMIN, true);
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
});
