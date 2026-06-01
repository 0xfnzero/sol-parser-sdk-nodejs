import { describe, expect, it } from "vitest";
import {
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  METEORA_DBC_PROGRAM_ID,
  PUMP_FEES_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  getProgramIdsForProtocols,
} from "./program_ids.js";

describe("protocol program ids", () => {
  it("matches the Rust canonical non-Pump ids", () => {
    expect(RAYDIUM_LAUNCHLAB_PROGRAM_ID).toBe("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj");
    expect(RAYDIUM_CLMM_PROGRAM_ID).toBe("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK");
    expect(METEORA_DBC_PROGRAM_ID).toBe("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN");
  });

  it("keeps PumpSwap and PumpFees as separate protocol filters", () => {
    expect(getProgramIdsForProtocols(["PumpSwap"])).toEqual([
      "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
    ]);
    expect(getProgramIdsForProtocols(["PumpFees"])).toEqual([PUMP_FEES_PROGRAM_ID]);
  });
});
