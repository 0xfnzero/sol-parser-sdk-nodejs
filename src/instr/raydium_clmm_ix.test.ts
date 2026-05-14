import { describe, expect, it } from "vitest";
import { eventTypeFilterIncludesRaydiumClmm } from "../grpc/types.js";
import { parseRaydiumClmmInstruction } from "./raydium_clmm_ix.js";

const DEC_LIQ_V2_DISC = [58, 127, 188, 62, 79, 82, 196, 96];
const DEC_LIQ_LOG_DISC = [160, 38, 208, 111, 104, 91, 44, 1];
const OPEN_POSITION_V2_DISC = [77, 184, 74, 214, 112, 86, 241, 199];
const CLOSE_POSITION_DISC = [123, 134, 81, 0, 49, 68, 98, 98];

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `account_${i}`);
}

function clmmU64Instruction(disc: number[], values: bigint[]): Uint8Array {
  const data = new Uint8Array(8 + values.length * 8);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  values.forEach((value, index) => view.setBigUint64(8 + index * 8, value, true));
  return data;
}

function openPositionInstruction(disc: number[], lower: number, upper: number, liquidity: bigint): Uint8Array {
  const data = new Uint8Array(8 + 4 + 4 + 4 + 4 + 8 + 8 + 8);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  view.setInt32(8, lower, true);
  view.setInt32(12, upper, true);
  view.setBigUint64(24, liquidity, true);
  return data;
}

describe("Raydium CLMM instruction parity", () => {
  it("uses the Rust V2 decrease-liquidity instruction discriminator", () => {
    const ev = parseRaydiumClmmInstruction(
      clmmU64Instruction(DEC_LIQ_V2_DISC, [111n, 222n, 333n]),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    expect("RaydiumClmmDecreaseLiquidity" in ev!).toBe(true);
    const data = ev && "RaydiumClmmDecreaseLiquidity" in ev ? ev.RaydiumClmmDecreaseLiquidity : null;
    expect(data?.pool).toBe("account_0");
    expect(data?.position_nft_mint).toBe("account_1");
    expect(data?.user).toBe("account_2");
    expect(data?.liquidity).toBe(111n);
    expect(data?.amount0_min).toBe(222n);
    expect(data?.amount1_min).toBe(333n);

    expect(parseRaydiumClmmInstruction(
      clmmU64Instruction(DEC_LIQ_LOG_DISC, [111n, 222n, 333n]),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    )).toBeNull();
  });

  it("parses open and close position with Rust account indexes", () => {
    const open = parseRaydiumClmmInstruction(
      openPositionInstruction(OPEN_POSITION_V2_DISC, -10, 20, 123n),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(open).toBeTruthy();
    const openData = open && "RaydiumClmmOpenPosition" in open ? open.RaydiumClmmOpenPosition : null;
    expect(openData?.pool).toBe("account_0");
    expect(openData?.user).toBe("account_1");
    expect(openData?.position_nft_mint).toBe("account_2");
    expect(openData?.tick_lower_index).toBe(-10);
    expect(openData?.tick_upper_index).toBe(20);
    expect(openData?.liquidity).toBe(123n);
    expect(eventTypeFilterIncludesRaydiumClmm({ include_only: ["RaydiumClmmOpenPosition"] })).toBe(true);

    const close = parseRaydiumClmmInstruction(new Uint8Array(CLOSE_POSITION_DISC), accounts(4), "sig", 1, 0, undefined, 10);
    expect(close).toBeTruthy();
    const closeData = close && "RaydiumClmmClosePosition" in close ? close.RaydiumClmmClosePosition : null;
    expect(closeData?.pool).toBe("account_0");
    expect(closeData?.user).toBe("account_1");
    expect(closeData?.position_nft_mint).toBe("account_2");
  });
});
