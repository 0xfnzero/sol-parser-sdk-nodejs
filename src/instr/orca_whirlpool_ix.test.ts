import { describe, expect, it } from "vitest";
import { eventTypeFilterExclude, eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { ORCA_WHIRLPOOL_PROGRAM_ID } from "./program_ids.js";
import { parseInstructionUnified } from "./mod.js";
import { parseOrcaWhirlpoolInstruction } from "./orca_whirlpool_ix.js";

const SWAP_DISC = [248, 198, 158, 145, 225, 117, 135, 200];
const SWAP_V2_DISC = [43, 4, 237, 11, 26, 201, 30, 98];
const INC_LIQ_DISC = [46, 156, 243, 118, 13, 205, 251, 178];
const DEC_LIQ_DISC = [160, 38, 208, 111, 104, 91, 44, 1];
const INIT_POOL_DISC = [17, 43, 80, 74, 168, 202, 6, 113];

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `account_${i}`);
}

function writeU128(view: DataView, offset: number, value: bigint): void {
  view.setBigUint64(offset, value & ((1n << 64n) - 1n), true);
  view.setBigUint64(offset + 8, value >> 64n, true);
}

function swapInstruction(
  disc: number[],
  amount: bigint,
  threshold: bigint,
  sqrtPriceLimit: bigint,
  inputSpecified: boolean,
  aToB: boolean
): Uint8Array {
  const data = new Uint8Array(8 + 8 + 8 + 16 + 1 + 1);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  view.setBigUint64(8, amount, true);
  view.setBigUint64(16, threshold, true);
  writeU128(view, 24, sqrtPriceLimit);
  data[40] = inputSpecified ? 1 : 0;
  data[41] = aToB ? 1 : 0;
  return data;
}

function liquidityInstruction(disc: number[], liquidity: bigint, amountA: bigint, amountB: bigint): Uint8Array {
  const data = new Uint8Array(8 + 16 + 8 + 8);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  writeU128(view, 8, liquidity);
  view.setBigUint64(24, amountA, true);
  view.setBigUint64(32, amountB, true);
  return data;
}

function initPoolInstruction(tickSpacing: number, initialSqrtPrice: bigint): Uint8Array {
  const data = new Uint8Array(8 + 2 + 16);
  data.set(INIT_POOL_DISC, 0);
  const view = new DataView(data.buffer);
  view.setUint16(8, tickSpacing, true);
  writeU128(view, 10, initialSqrtPrice);
  return data;
}

describe("Orca Whirlpool instruction parity", () => {
  it("parses swap and swap_v2 with Rust instruction fields and account indexes", () => {
    const sqrtPriceLimit = (1n << 80n) + 123n;
    const ev = parseOrcaWhirlpoolInstruction(
      swapInstruction(SWAP_DISC, 111n, 222n, sqrtPriceLimit, true, false),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(ev && "OrcaWhirlpoolSwap" in ev).toBe(true);
    const data = ev && "OrcaWhirlpoolSwap" in ev ? ev.OrcaWhirlpoolSwap : null;
    expect(data?.whirlpool).toBe("account_1");
    expect(data?.a_to_b).toBe(false);
    expect(data?.pre_sqrt_price).toBe(sqrtPriceLimit);
    expect(data?.post_sqrt_price).toBe(0n);
    expect(data?.input_amount).toBe(111n);
    expect(data?.output_amount).toBe(222n);

    const swapV2 = parseInstructionUnified(
      swapInstruction(SWAP_V2_DISC, 333n, 444n, sqrtPriceLimit + 1n, false, true),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["OrcaWhirlpoolSwap"]),
      ORCA_WHIRLPOOL_PROGRAM_ID
    );
    expect(swapV2 && "OrcaWhirlpoolSwap" in swapV2).toBe(true);
    const swapV2Data = swapV2 && "OrcaWhirlpoolSwap" in swapV2 ? swapV2.OrcaWhirlpoolSwap : null;
    expect(swapV2Data?.whirlpool).toBe("account_1");
    expect(swapV2Data?.a_to_b).toBe(true);
    expect(swapV2Data?.pre_sqrt_price).toBe(sqrtPriceLimit + 1n);
    expect(swapV2Data?.input_amount).toBe(0n);
    expect(swapV2Data?.output_amount).toBe(333n);
  });

  it("parses liquidity instructions using Rust payload values", () => {
    const inc = parseOrcaWhirlpoolInstruction(
      liquidityInstruction(INC_LIQ_DISC, (1n << 80n) + 1n, 222n, 333n),
      accounts(5),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(inc && "OrcaWhirlpoolLiquidityIncreased" in inc).toBe(true);
    const incData = inc && "OrcaWhirlpoolLiquidityIncreased" in inc ? inc.OrcaWhirlpoolLiquidityIncreased : null;
    expect(incData?.whirlpool).toBe("account_1");
    expect(incData?.position).toBe("account_3");
    expect(incData?.liquidity).toBe((1n << 80n) + 1n);
    expect(incData?.token_a_amount).toBe(222n);
    expect(incData?.token_b_amount).toBe(333n);

    const dec = parseOrcaWhirlpoolInstruction(
      liquidityInstruction(DEC_LIQ_DISC, (1n << 80n) + 2n, 444n, 555n),
      accounts(5),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(dec && "OrcaWhirlpoolLiquidityDecreased" in dec).toBe(true);
    const decData = dec && "OrcaWhirlpoolLiquidityDecreased" in dec ? dec.OrcaWhirlpoolLiquidityDecreased : null;
    expect(decData?.whirlpool).toBe("account_1");
    expect(decData?.position).toBe("account_3");
    expect(decData?.liquidity).toBe((1n << 80n) + 2n);
    expect(decData?.token_a_amount).toBe(444n);
    expect(decData?.token_b_amount).toBe(555n);
  });

  it("parses initialize_pool and honors include/exclude filters", () => {
    const initialSqrtPrice = (1n << 96n) + 99n;
    const ev = parseInstructionUnified(
      initPoolInstruction(128, initialSqrtPrice),
      accounts(10),
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["OrcaWhirlpoolPoolInitialized"]),
      ORCA_WHIRLPOOL_PROGRAM_ID
    );
    expect(ev && "OrcaWhirlpoolPoolInitialized" in ev).toBe(true);
    const data = ev && "OrcaWhirlpoolPoolInitialized" in ev ? ev.OrcaWhirlpoolPoolInitialized : null;
    expect(data?.whirlpool).toBe("account_1");
    expect(data?.whirlpools_config).toBe("account_2");
    expect(data?.token_mint_a).toBe("account_3");
    expect(data?.token_mint_b).toBe("account_4");
    expect(data?.tick_spacing).toBe(128);
    expect(data?.token_program_a).toBe("account_8");
    expect(data?.token_program_b).toBe("account_9");
    expect(data?.decimals_a).toBe(0);
    expect(data?.decimals_b).toBe(0);
    expect(data?.initial_sqrt_price).toBe(initialSqrtPrice);

    expect(parseInstructionUnified(
      initPoolInstruction(128, initialSqrtPrice),
      accounts(10),
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterExclude(["OrcaWhirlpoolPoolInitialized"]),
      ORCA_WHIRLPOOL_PROGRAM_ID
    )).toBeNull();
  });
});
