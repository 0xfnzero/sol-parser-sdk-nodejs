import { describe, expect, it } from "vitest";
import {
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DBC_PROGRAM_ID,
  PUMPFUN_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
} from "../grpc/program_ids.js";
import { eventTypeFilterExclude, eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { parseLogOptimized, parseLogOptimizedWithProgramId } from "./optimized_matcher.js";
import { METEORA_DBC_DISC } from "./meteora_dbc.js";
import { PROGRAM_LOG_DISC } from "./program_log_discriminators.js";

function pushU16(out: number[], value: number): void {
  out.push(value & 0xff, (value >> 8) & 0xff);
}

function pushU32(out: number[], value: number): void {
  out.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

function pushU64(out: number[], value: bigint): void {
  for (let i = 0n; i < 8n; i++) out.push(Number((value >> (8n * i)) & 0xffn));
}

function pushI64(out: number[], value: bigint): void {
  pushU64(out, BigInt.asUintN(64, value));
}

function pushPubkey(out: number[], seed: number): void {
  for (let i = 0; i < 32; i++) out.push((seed + i) & 0xff);
}

function pushString(out: number[], value: string): void {
  const bytes = new TextEncoder().encode(value);
  pushU32(out, bytes.length);
  out.push(...bytes);
}

function pumpFeesUpdateAdminLog(): string {
  const buf = new Uint8Array(8 + 8 + 32 + 32);
  new DataView(buf.buffer).setBigUint64(0, PROGRAM_LOG_DISC.PUMP_FEES_UPDATE_ADMIN, true);
  return `Program data: ${Buffer.from(buf).toString("base64")}`;
}

function pumpfunBuyExactSolInTradeLog(): string {
  const out: number[] = [];
  pushU64(out, PROGRAM_LOG_DISC.PUMPFUN_TRADE);
  pushPubkey(out, 1);
  pushU64(out, 10n);
  pushU64(out, 20n);
  out.push(1);
  pushPubkey(out, 2);
  pushI64(out, 30n);
  pushU64(out, 40n);
  pushU64(out, 50n);
  pushU64(out, 60n);
  pushU64(out, 70n);
  pushPubkey(out, 3);
  pushU64(out, 80n);
  pushU64(out, 90n);
  pushPubkey(out, 4);
  pushU64(out, 100n);
  pushU64(out, 110n);
  out.push(0);
  pushU64(out, 120n);
  pushU64(out, 130n);
  pushU64(out, 140n);
  pushI64(out, 150n);
  pushString(out, "buy_exact_sol_in");
  return `Program data: ${Buffer.from(out).toString("base64")}`;
}

function pumpFeesLargeUpdateFeeSharesLog(): string {
  const out: number[] = [];
  pushU64(out, PROGRAM_LOG_DISC.PUMP_FEES_UPDATE_FEE_SHARES);
  pushI64(out, 1_777_920_719n);
  pushPubkey(out, 1);
  pushPubkey(out, 2);
  pushPubkey(out, 3);
  pushU32(out, 64);
  for (let i = 0; i < 64; i++) {
    pushPubkey(out, 40 + i);
    pushU16(out, 1000 + i);
  }
  expect(out.length).toBeGreaterThan(2048);
  return `Program data: ${Buffer.from(out).toString("base64")}`;
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

function cpmmCreatePoolLog(): string {
  const out: number[] = [];
  pushU64(out, PROGRAM_LOG_DISC.RAYDIUM_CPMM_CREATE_POOL);
  pushPubkey(out, 10);
  pushPubkey(out, 11);
  pushPubkey(out, 12);
  pushPubkey(out, 13);
  pushU64(out, 1_000n);
  pushU64(out, 2_000n);
  return `Program data: ${Buffer.from(out).toString("base64")}`;
}

function dammAddLiquidityLog(): string {
  const out: number[] = [];
  pushU64(out, PROGRAM_LOG_DISC.METEORA_DAMM_ADD_LIQUIDITY);
  pushPubkey(out, 20);
  pushPubkey(out, 21);
  pushPubkey(out, 22);
  pushU64(out, 123n);
  pushU64(out, 0n);
  for (const v of [1n, 2n, 3n, 4n, 5n, 6n]) pushU64(out, v);
  return `Program data: ${Buffer.from(out).toString("base64")}`;
}

function dammInitializePoolLog(): string {
  const out: number[] = [];
  pushU64(out, PROGRAM_LOG_DISC.METEORA_DAMM_INITIALIZE_POOL);
  for (const seed of [30, 31, 32, 33, 34, 35]) pushPubkey(out, seed);
  for (let i = 0; i < 27; i++) out.push(i);
  pushU16(out, 25);
  out.push(0);
  out.push(0);
  pushU64(out, 10n);
  pushU64(out, 0n);
  pushU64(out, 20n);
  pushU64(out, 0n);
  out.push(1);
  out.push(2);
  pushU64(out, 30n);
  pushU64(out, 0n);
  pushU64(out, 40n);
  pushU64(out, 0n);
  pushU64(out, 50n);
  out.push(3);
  out.push(4);
  for (const v of [60n, 70n, 80n, 90n]) pushU64(out, v);
  out.push(5);
  return `Program data: ${Buffer.from(out).toString("base64")}`;
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

  it("parses Program data payloads larger than the Rust stack decode buffer", () => {
    const ev = parseLogOptimized(
      pumpFeesLargeUpdateFeeSharesLog(),
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["PumpFeesUpdateFeeShares"]),
      false
    );

    expect(ev?.PumpFeesUpdateFeeShares?.new_shareholders).toHaveLength(64);
    expect(ev?.PumpFeesUpdateFeeShares?.new_shareholders[63]?.share_bps).toBe(1063);
  });

  it("keeps scoped PumpFun trade logs for buy-family include filters", () => {
    const ev = parseLogOptimizedWithProgramId(
      pumpfunBuyExactSolInTradeLog(),
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["PumpFunBuy"]),
      false,
      undefined,
      PUMPFUN_PROGRAM_ID
    );

    expect(ev && "PumpFunBuyExactSolIn" in ev).toBe(true);
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

  it("routes scoped Raydium CPMM create pool without leaking into CLMM", () => {
    const log = cpmmCreatePoolLog();

    expect(
      parseLogOptimized(log, "sig", 1, 0, undefined, 1, eventTypeFilterIncludeOnly(["RaydiumCpmmInitialize"]), false)
    ).toBeNull();

    const cpmm = parseLogOptimizedWithProgramId(
      log,
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["RaydiumCpmmInitialize"]),
      false,
      undefined,
      RAYDIUM_CPMM_PROGRAM_ID
    );
    expect(cpmm?.RaydiumCpmmInitialize?.init_amount0).toBe(1_000n);

    const clmm = parseLogOptimizedWithProgramId(
      log,
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["RaydiumClmmCreatePool"]),
      false,
      undefined,
      RAYDIUM_CLMM_PROGRAM_ID
    );
    expect(clmm).toBeNull();
  });

  it("parses scoped Meteora DAMM non-swap Program data events", () => {
    const ev = parseLogOptimizedWithProgramId(
      dammAddLiquidityLog(),
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["MeteoraDammV2AddLiquidity"]),
      false,
      undefined,
      METEORA_DAMM_V2_PROGRAM_ID
    );

    expect(ev?.MeteoraDammV2AddLiquidity?.liquidity_delta).toBe(123n);
    expect(ev?.MeteoraDammV2AddLiquidity?.token_b_amount).toBe(4n);

    const init = parseLogOptimizedWithProgramId(
      dammInitializePoolLog(),
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["MeteoraDammV2InitializePool"]),
      false,
      undefined,
      METEORA_DAMM_V2_PROGRAM_ID
    );
    expect(init?.MeteoraDammV2InitializePool?.sqrt_min_price).toBe(10n);
    expect(init?.MeteoraDammV2InitializePool?.token_b_amount).toBe(70n);
    expect(init?.MeteoraDammV2InitializePool?.pool_type).toBe(5);
  });
});
