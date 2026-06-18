import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { parsePumpFeesInstruction } from "./pump_fees_ix.js";

const UPDATE_FEE_SHARES_IX = [189, 13, 136, 99, 187, 164, 237, 35];
const UPDATE_FEE_SHARES_V2_IX = [111, 251, 49, 6, 78, 78, 106, 18];
const RESET_FEE_SHARING_IX = [10, 2, 182, 95, 16, 127, 129, 186];
const RESET_FEE_SHARING_V2_IX = [169, 245, 17, 209, 94, 91, 248, 128];

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `account_${i}`);
}

function updateFeeSharesData(disc: number[]): Uint8Array {
  const data = new Uint8Array(8 + 4 + 32 + 2);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  view.setUint32(8, 1, true);
  data.set(new Uint8Array(32).fill(42), 12);
  view.setUint16(44, 2500, true);
  return data;
}

describe("parsePumpFeesInstruction", () => {
  it("parses update_fee_shares v1/v2 with Rust instruction layout", () => {
    for (const disc of [UPDATE_FEE_SHARES_IX, UPDATE_FEE_SHARES_V2_IX]) {
      const ev = parsePumpFeesInstruction(updateFeeSharesData(disc), accounts(8), "sig", 1, 0, undefined, 10);
      expect(ev && "PumpFeesUpdateFeeShares" in ev).toBe(true);
      const data = ev && "PumpFeesUpdateFeeShares" in ev ? ev.PumpFeesUpdateFeeShares : null;
      expect(data?.mint).toBe("account_4");
      expect(data?.sharing_config).toBe("account_5");
      expect(data?.admin).toBe("account_2");
      expect(data?.bonding_curve).toBe("account_6");
      expect(data?.pump_creator_vault).toBe("account_7");
      expect(data?.new_shareholders).toEqual([
        { address: new PublicKey(new Uint8Array(32).fill(42)).toBase58(), share_bps: 2500 },
      ]);
    }
  });

  it("parses reset_fee_sharing v1/v2 using Rust IDL account order", () => {
    for (const disc of [RESET_FEE_SHARING_IX, RESET_FEE_SHARING_V2_IX]) {
      const ev = parsePumpFeesInstruction(new Uint8Array(disc), accounts(7), "sig", 1, 0, undefined, 10);
      expect(ev && "PumpFeesResetFeeSharingConfig" in ev).toBe(true);
      const data = ev && "PumpFeesResetFeeSharingConfig" in ev ? ev.PumpFeesResetFeeSharingConfig : null;
      expect(data?.new_admin).toBe("account_0");
      expect(data?.old_admin).toBe("account_3");
      expect(data?.mint).toBe("account_5");
      expect(data?.sharing_config).toBe("account_6");
    }
  });
});
