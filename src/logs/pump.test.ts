import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { parseCreateFromData, parseTradeFromData } from "./pump.js";
import { parseLogOptimized } from "./optimized_matcher.js";
import { RAYDIUM_LAUNCHLAB_DISC } from "./raydium_launchlab.js";
import { eventTypeFilterExclude, eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { METEORA_DLMM_PROGRAM_ID } from "../grpc/program_ids.js";

function pk(seed: number): PublicKey {
  return new PublicKey(Uint8Array.from({ length: 32 }, (_, i) => (seed + i) & 0xff));
}

function pushPubkey(out: number[], key: PublicKey): void {
  out.push(...key.toBytes());
}

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

function pushString(out: number[], value: string): void {
  const bytes = new TextEncoder().encode(value);
  pushU32(out, bytes.length);
  out.push(...bytes);
}

describe("PumpFun TradeEvent log parser", () => {
  it("keeps v2 quote reserve tail fields", () => {
    const quoteMint = pk(90);
    const shareholder = pk(120);
    const out: number[] = [];

    pushPubkey(out, pk(1));
    pushU64(out, 10n);
    pushU64(out, 20n);
    out.push(1);
    pushPubkey(out, pk(2));
    pushI64(out, 30n);
    pushU64(out, 40n);
    pushU64(out, 50n);
    pushU64(out, 60n);
    pushU64(out, 70n);
    pushPubkey(out, pk(3));
    pushU64(out, 80n);
    pushU64(out, 90n);
    pushPubkey(out, pk(4));
    pushU64(out, 100n);
    pushU64(out, 110n);
    out.push(0);
    pushU64(out, 120n);
    pushU64(out, 130n);
    pushU64(out, 140n);
    pushI64(out, 150n);
    pushString(out, "buy_exact_quote_in_v2");
    out.push(0);
    pushU64(out, 30n);
    pushU64(out, 170n);
    pushU64(out, 500n);
    pushU64(out, 600n);
    pushU32(out, 1);
    pushPubkey(out, shareholder);
    pushU16(out, 2500);
    pushPubkey(out, quoteMint);
    pushU64(out, 700n);
    pushU64(out, 800n);
    pushU64(out, 900n);

    const ev = parseTradeFromData(Uint8Array.from(out), {
      signature: "sig",
      slot: 1,
      tx_index: 0,
      block_time_us: 0,
      grpc_recv_us: 1,
    }, false);

    expect(ev).not.toBeNull();
    const trade = (ev as any).PumpFunBuy;
    expect(trade.quote_mint).toBe(quoteMint.toBase58());
    expect(trade.quote_amount).toBe(700n);
    expect(trade.virtual_quote_reserves).toBe(800n);
    expect(trade.real_quote_reserves).toBe(900n);
    expect(trade.buyback_fee_basis_points).toBe(500n);
    expect(trade.buyback_fee).toBe(600n);
    expect(trade.shareholders).toEqual([{ address: shareholder.toBase58(), share_bps: 2500 }]);
  });
});

describe("PumpFun CreateEvent log parser", () => {
  it("keeps quote mint and initial virtual quote reserves", () => {
    const mint = pk(10);
    const bondingCurve = pk(20);
    const user = pk(30);
    const creator = pk(40);
    const tokenProgram = pk(50);
    const quoteMint = pk(60);
    const out: number[] = [];

    pushString(out, "Name");
    pushString(out, "SYM");
    pushString(out, "https://example.invalid/meta.json");
    pushPubkey(out, mint);
    pushPubkey(out, bondingCurve);
    pushPubkey(out, user);
    pushPubkey(out, creator);
    pushI64(out, 123n);
    pushU64(out, 1_073_000_000_000_000n);
    pushU64(out, 30_000_000_000n);
    pushU64(out, 793_100_000_000_000n);
    pushU64(out, 1_000_000_000_000_000n);
    pushPubkey(out, tokenProgram);
    out.push(0);
    out.push(1);
    pushPubkey(out, quoteMint);
    pushU64(out, 4_292_000_000n);

    const ev = parseCreateFromData(Uint8Array.from(out), {
      signature: "sig",
      slot: 1,
      tx_index: 0,
      block_time_us: 0,
      grpc_recv_us: 1,
    });

    expect(ev).not.toBeNull();
    const create = (ev as any).PumpFunCreate;
    expect(create.quote_mint).toBe(quoteMint.toBase58());
    expect(create.virtual_quote_reserves).toBe(4_292_000_000n);
    expect(create.is_cashback_enabled).toBe(true);
  });
});

describe("fallback log parsers", () => {
  it("parses the shared PumpFun/Raydium LaunchLab trade discriminator by requested event type", () => {
    const out: number[] = [];
    pushU64(out, RAYDIUM_LAUNCHLAB_DISC.TRADE);
    pushPubkey(out, pk(10));
    while (out.length < 8 + 88) out.push(0);
    pushU64(out, 111n);
    pushU64(out, 222n);
    while (out.length < 8 + 136) out.push(0);
    out.push(0);
    out.push(0);
    out.push(1);

    const log = `Program data: ${Buffer.from(out).toString("base64")}`;
    const ev = parseLogOptimized(
      log,
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["RaydiumLaunchlabTrade"]),
      false
    );

    expect(ev && "RaydiumLaunchlabTrade" in ev).toBe(true);
    const trade = ev && "RaydiumLaunchlabTrade" in ev ? ev.RaydiumLaunchlabTrade : null;
    expect(trade?.pool_state).toBe(pk(10).toBase58());
    expect(trade?.amount_in).toBe(111n);
    expect(trade?.amount_out).toBe(222n);
    expect(trade?.is_buy).toBe(true);
    expect(trade?.exact_in).toBe(true);
  });

  it("routes shared CPMM/DLMM swap Program data by scoped program id", () => {
    const out: number[] = [];
    pushU64(out, 0xDE331EC4DA5ABE8Fn);
    pushPubkey(out, pk(11));
    pushPubkey(out, pk(12));
    out.push(0, 0, 0, 0);
    out.push(0, 0, 0, 0);
    pushU64(out, 333n);
    pushU64(out, 444n);
    out.push(1);
    pushU64(out, 5n);
    pushU64(out, 6n);
    for (let i = 0; i < 16; i++) out.push(0);
    pushU64(out, 7n);

    const log = `Program data: ${Buffer.from(out).toString("base64")}`;
    const ev = parseLogOptimized(
      log,
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterIncludeOnly(["MeteoraDlmmSwap"]),
      false,
      undefined,
      METEORA_DLMM_PROGRAM_ID
    );

    expect(ev && "MeteoraDlmmSwap" in ev).toBe(true);
    const swap = ev && "MeteoraDlmmSwap" in ev ? ev.MeteoraDlmmSwap : null;
    expect(swap?.pool).toBe(pk(11).toBase58());
    expect(swap?.from).toBe(pk(12).toBase58());
    expect(swap?.amount_in).toBe(333n);
    expect(swap?.amount_out).toBe(444n);
  });

  it("applies actual event filters to Raydium LaunchLab fallback events", () => {
    const out: number[] = [];
    pushU64(out, RAYDIUM_LAUNCHLAB_DISC.POOL_CREATE);
    pushPubkey(out, pk(1)); // pool_state
    pushPubkey(out, pk(2));
    pushPubkey(out, pk(3));
    pushPubkey(out, pk(4)); // creator
    pushU64(out, 0n);
    pushU64(out, 0n);

    const log = `Program data: ${Buffer.from(out).toString("base64")}`;
    expect(parseLogOptimized(
      log,
      "sig",
      1,
      0,
      undefined,
      1,
      eventTypeFilterExclude([
        "RaydiumLaunchlabTrade",
        "RaydiumLaunchlabPoolCreate",
        "RaydiumLaunchlabMigrateAmm",
      ]),
      false
    )).toBeNull();
  });
});
