import { it, expect } from "vitest";
import {
  StonkFunPoolRegistry,
  type StonkFunGraduatedPool,
} from "./stonkfun_registry";
import { parseLiquidityAccount } from "./liquidity_snapshot";
import {
  ROUTE_PROGRAMS,
  STONKFUN_STANDARD_PLATFORM_CONFIG,
} from "./transaction_route";
import bs58 from "bs58";
const pk = (n: number) => bs58.encode(new Uint8Array(32).fill(n));
const entry: StonkFunGraduatedPool = {
  curve_pool: pk(1),
  pool: pk(2),
  base_mint: pk(3),
  quote_mint: pk(4),
  platform_config: STONKFUN_STANDARD_PLATFORM_CONFIG,
  migration_signature: bs58.encode(new Uint8Array(64).fill(5)),
  migration_slot: 1n,
};
it("migration registry replays and rejects conflicting batches atomically", () => {
  const r = new StonkFunPoolRegistry();
  expect(r.observeMigrations([entry], false)).toBe(0);
  expect(r.observeMigrations([entry], true)).toBe(1);
  expect(r.observeMigrations([entry], true)).toBe(0);
  expect(() =>
    r.observeMigrations(
      [
        { ...entry, pool: pk(6) },
        { ...entry, migration_slot: 2n },
      ],
      true,
    ),
  ).toThrow("Conflicting");
  expect(r.verifiedCpmmPools()).toEqual([pk(2)]);
  expect(StonkFunPoolRegistry.fromJSON(r.toJSON()).toJSON()).toEqual(
    r.toJSON(),
  );
  expect(Object.isFrozen(r.get(pk(2)))).toBe(true);
});
it("dynamic ticks reject inconsistent bitmap, truncated payloads and foreign owner", () => {
  const metadata = {
      signature: "",
      slot: 1,
      tx_index: 0,
      block_time_us: 0,
      grpc_recv_us: 0,
    },
    data = Buffer.alloc(148);
  Buffer.from("11d8f68ee1c7da38", "hex").copy(data);
  const a = {
    pubkey: pk(1),
    owner: ROUTE_PROGRAMS.OrcaWhirlpool,
    data,
    executable: false,
    lamports: 1n,
    rent_epoch: 0n,
  };
  expect(parseLiquidityAccount(a, metadata)?.kind).toEqual({
    OrcaDynamicTickArray: { pool: pk(0), start_tick_index: 0, tick_bitmap: 0n },
  });
  data[44] = 1;
  expect(parseLiquidityAccount(a, metadata)).toBeNull();
  data[60] = 1;
  expect(parseLiquidityAccount(a, metadata)).toBeNull();
  data[44] = 0;
  data[60] = 0;
  expect(parseLiquidityAccount({ ...a, owner: pk(9) }, metadata)).toBeNull();
});
