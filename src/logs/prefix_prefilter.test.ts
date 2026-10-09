import { describe, expect, it, vi } from "vitest";
import * as programData from "./program_data.js";
import { parseLogOptimized } from "./optimized_matcher.js";
import { eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { PUMP_FEES_PROGRAM_ID } from "../grpc/program_ids.js";
import { PROGRAM_LOG_DISC } from "./program_log_discriminators.js";

const body = Buffer.alloc(80);
body.writeBigUInt64LE(PROGRAM_LOG_DISC.PUMP_FEES_UPDATE_ADMIN);
const encoded = body.toString("base64");
const included = eventTypeFilterIncludeOnly(["PumpFeesUpdateAdmin"]);
const excluded = eventTypeFilterIncludeOnly(["RaydiumCpmmSwap"]);
const parse = (payload: string, filter = included) => parseLogOptimized(
  `Program data: ${payload}`, "offline", 1, 0, 0, 0, filter, false, undefined, PUMP_FEES_PROGRAM_ID
);

describe("bounded discriminator prefilter", () => {
  it("rejects excluded large events without complete decoding", () => {
    const decode = vi.spyOn(programData, "decodeProgramDataLine");
    try {
      for (const size of [512, 4096]) {
        const data = Buffer.alloc(size); body.copy(data, 0, 0, 8);
        expect(parse(data.toString("base64"), excluded)).toBeNull();
      }
      expect(decode).not.toHaveBeenCalled();
    } finally { decode.mockRestore(); }
  });
  it.each([encoded, ` ${encoded} `, `${encoded.slice(0, 4)}\n${encoded.slice(4)}`, `${encoded.slice(0, 4)}!${encoded.slice(4)}`, encoded.slice(0, -1), `${encoded}!`, "AA=="])(
    "retains original encoding semantics for included events: %s", payload => {
      const raw = programData.decodeProgramDataLine(`Program data: ${payload}`);
      const expected = raw ? parse(Buffer.from(raw).toString("base64")) : null;
      expect(parse(payload)).toEqual(expected);
    }
  );
});
