import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { parseTradeFromData } from "./pump.js";

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
    const trade = (ev as any).PumpFunBuyExactSolIn;
    expect(trade.quote_mint).toBe(quoteMint.toBase58());
    expect(trade.quote_amount).toBe(700n);
    expect(trade.virtual_quote_reserves).toBe(800n);
    expect(trade.real_quote_reserves).toBe(900n);
    expect(trade.buyback_fee_basis_points).toBe(500n);
    expect(trade.buyback_fee).toBe(600n);
    expect(trade.shareholders).toEqual([{ address: shareholder.toBase58(), share_bps: 2500 }]);
  });
});
