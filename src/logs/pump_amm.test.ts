import { describe, expect, it } from "vitest";
import { parseBuyFromData, parseCreatePoolFromData, parseSellFromData } from "./pump_amm.js";

const metadata = { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 1 };

function pushU64(out: number[], value: bigint): void {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  out.push(...bytes);
}

function pushI128(out: number[], value: bigint): void {
  const unsigned = BigInt.asUintN(128, value);
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, unsigned & ((1n << 64n) - 1n), true);
  view.setBigUint64(8, unsigned >> 64n, true);
  out.push(...bytes);
}

function currentTail(): number[] {
  const out: number[] = [];
  pushU64(out, 177n);
  pushU64(out, 188n);
  pushU64(out, 199n);
  pushU64(out, 211n);
  pushI128(out, -987_654_321n);
  out.push(1);
  pushU64(out, 222n);
  pushU64(out, 233n);
  pushU64(out, 244n);
  return out;
}

function buyPayload(includeTail: boolean): Uint8Array {
  const out = Array.from(new Uint8Array(393));
  out[352] = 1;
  const minBase = new Uint8Array(8);
  new DataView(minBase.buffer).setBigUint64(0, 22n, true);
  out.splice(385, 8, ...minBase);
  out.push(3, 0, 0, 0, ...new TextEncoder().encode("buy"));
  if (includeTail) out.push(...currentTail());
  return Uint8Array.from(out);
}

describe("PumpSwap log parser", () => {
  it("parses current buy and sell upgrade fields", () => {
    const buy = parseBuyFromData(buyPayload(true), metadata);
    expect(buy && "PumpSwapBuy" in buy).toBe(true);
    const b = (buy as any).PumpSwapBuy;
    expect(b.min_base_amount_out).toBe(22n);
    expect(b.ix_name).toBe("buy");
    expect(b.cashback_fee_basis_points).toBe(177n);
    expect(b.cashback).toBe(188n);
    expect(b.buyback_fee_basis_points).toBe(199n);
    expect(b.buyback_fee).toBe(211n);
    expect(b.virtual_quote_reserves).toBe(-987_654_321n);
    expect(b.can_boost).toBe(true);
    expect(b.base_supply).toBe(222n);
    expect(b.holder_rewards_bps).toBe(233n);
    expect(b.holder_rewards).toBe(244n);

    const sell = parseSellFromData(Uint8Array.from([...new Uint8Array(352), ...currentTail()]), metadata);
    expect(sell && "PumpSwapSell" in sell).toBe(true);
    const s = (sell as any).PumpSwapSell;
    expect(s.cashback_fee_basis_points).toBe(177n);
    expect(s.buyback_fee_basis_points).toBe(199n);
    expect(s.virtual_quote_reserves).toBe(-987_654_321n);
    expect(s.can_boost).toBe(true);
    expect(s.base_supply).toBe(222n);
    expect(s.holder_rewards_bps).toBe(233n);
    expect(s.holder_rewards).toBe(244n);
  });

  it("accepts historical layouts and rejects partial tails", () => {
    expect(parseBuyFromData(new Uint8Array(385), metadata)).not.toBeNull();
    expect(parseBuyFromData(new Uint8Array(396), metadata)).toBeNull();
    expect(parseBuyFromData(new Uint8Array(397), metadata)).not.toBeNull();
    expect(parseSellFromData(new Uint8Array(352), metadata)).not.toBeNull();

    for (let length = 0; length <= 80; length++) {
      const expected = length === 0 || length === 16 || length === 32 || length === 57 || length >= 73;
      const sell = Uint8Array.from([...new Uint8Array(352), ...new Uint8Array(length)]);
      expect(parseSellFromData(sell, metadata) !== null, `tail ${length}`).toBe(expected);
    }

    for (const length of [1, 15, 17, 31, 33, 56]) {
      const buy = Uint8Array.from([...buyPayload(false), ...new Uint8Array(length)]);
      expect(parseBuyFromData(buy, metadata), `buy tail ${length}`).toBeNull();
      const sell = Uint8Array.from([...new Uint8Array(352), ...new Uint8Array(length)]);
      expect(parseSellFromData(sell, metadata), `sell tail ${length}`).toBeNull();
    }
  });

  it("rejects malformed booleans and strings", () => {
    const invalidTrack = buyPayload(false);
    invalidTrack[352] = 2;
    expect(parseBuyFromData(invalidTrack, metadata)).toBeNull();

    const invalidUtf8 = buyPayload(false);
    invalidUtf8[397] = 0xff;
    expect(parseBuyFromData(invalidUtf8, metadata)).toBeNull();

    const invalidBoost = Uint8Array.from([...new Uint8Array(352), ...currentTail()]);
    invalidBoost[400] = 2;
    expect(parseSellFromData(invalidBoost, metadata)).toBeNull();
  });

  it("preserves signed i128 extremes", () => {
    for (const value of [-(1n << 127n), -1n, (1n << 127n) - 1n]) {
      const tail = currentTail();
      const encoded: number[] = [];
      pushI128(encoded, value);
      tail.splice(32, 16, ...encoded);
      const sell = parseSellFromData(
        Uint8Array.from([...new Uint8Array(352), ...tail]),
        metadata
      );
      expect((sell as any).PumpSwapSell.virtual_quote_reserves).toBe(value);
    }
  });

  it("parses current create pool creator fee fields", () => {
    const data = new Uint8Array(336);
    const view = new DataView(data.buffer);
    view.setUint16(8, 42, true);
    data[325] = 1;
    view.setBigUint64(326, 250n, true);
    data[334] = 1;
    data[335] = 1;

    const event = parseCreatePoolFromData(data, metadata);
    expect(event && "PumpSwapCreatePool" in event).toBe(true);
    const create = (event as any).PumpSwapCreatePool;
    expect(create.index).toBe(42);
    expect(create.is_mayhem_mode).toBe(true);
    expect(create.creator_fee_bps).toBe(250n);
    expect(create.can_edit_creator_fee).toBe(true);
    expect(create.is_holder_reward).toBe(true);

    for (let length = 326; length <= 336; length++) {
      const expected = length === 326 || length >= 335;
      expect(parseCreatePoolFromData(new Uint8Array(length), metadata) !== null).toBe(expected);
    }
  });
});
