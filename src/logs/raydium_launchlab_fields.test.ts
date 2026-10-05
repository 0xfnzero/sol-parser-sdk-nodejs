import { it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { parseRaydiumLaunchlabTradeFromData } from "./raydium_launchlab.js";
import { parseRaydiumLaunchlabInstruction } from "../instr/raydium_launchlab_ix.js";
const meta = {
  signature: "sig",
  slot: 1,
  tx_index: 0,
  block_time_us: 0,
  grpc_recv_us: 0,
};
it("retains all current reserves and fee legs and rejects malformed event tails", () => {
  const d = Buffer.alloc(139);
  new PublicKey("So11111111111111111111111111111111111111112")
    .toBuffer()
    .copy(d);
  for (let i = 0; i < 13; i++) d.writeBigUInt64LE(BigInt(100 + i), 32 + i * 8);
  d[137] = 2;
  d[138] = 1;
  const ev = parseRaydiumLaunchlabTradeFromData(d, meta);
  expect(
    ev &&
      "RaydiumLaunchlabTrade" in ev && [
        ev.RaydiumLaunchlabTrade.virtual_base,
        ev.RaydiumLaunchlabTrade.real_quote_after,
        ev.RaydiumLaunchlabTrade.protocol_fee,
        ev.RaydiumLaunchlabTrade.platform_fee,
        ev.RaydiumLaunchlabTrade.creator_fee,
        ev.RaydiumLaunchlabTrade.share_fee,
        ev.RaydiumLaunchlabTrade.pool_status,
      ],
  ).toEqual([101n, 106n, 109n, 110n, 111n, 112n, "Trade"]);
  for (const o of [136, 137, 138]) {
    const bad = Buffer.from(d);
    bad[o] = 3;
    expect(parseRaydiumLaunchlabTradeFromData(bad, meta)).toBeNull();
  }
  expect(
    parseRaydiumLaunchlabTradeFromData(
      Buffer.concat([d, Buffer.from([0])]),
      meta,
    ),
  ).toBeNull();
});
it("migration exposes destination/quote/platform and never invents executed liquidity", () => {
  const keys = Array.from({ length: 32 }, (_, i) => "account_" + i),
    cp = Uint8Array.from([136, 92, 200, 103, 28, 218, 144, 140]);
  const ev = parseRaydiumLaunchlabInstruction(cp, keys, "sig", 1, 0, null, 0);
  expect(
    ev && "RaydiumLaunchlabMigrateAmm" in ev && ev.RaydiumLaunchlabMigrateAmm,
  ).toMatchObject({
    old_pool: keys[17],
    new_pool: keys[5],
    platform_config: keys[3],
    base_mint: keys[1],
    quote_mint: keys[2],
    destination_program: keys[4],
    liquidity_amount: 0n,
    liquidity_amount_known: false,
  });
  expect(
    parseRaydiumLaunchlabInstruction(
      cp,
      keys.slice(0, 27),
      "sig",
      1,
      0,
      null,
      0,
    ),
  ).toBeNull();
  const amm = Buffer.alloc(17);
  Buffer.from([207, 82, 192, 145, 254, 207, 145, 223]).copy(amm);
  const migrated = parseRaydiumLaunchlabInstruction(
    amm,
    keys,
    "sig",
    1,
    0,
    null,
    0,
  );
  expect(
    migrated &&
      "RaydiumLaunchlabMigrateAmm" in migrated &&
      migrated.RaydiumLaunchlabMigrateAmm,
  ).toMatchObject({
    old_pool: keys[23],
    new_pool: keys[13],
    destination_program: keys[12],
    platform_config: PublicKey.default.toBase58(),
    liquidity_amount_known: false,
  });
});
