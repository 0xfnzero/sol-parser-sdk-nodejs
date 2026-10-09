import { afterEach, describe, expect, it, vi } from "vitest";
import { AddressLookupTableAccount, type Connection, PublicKey } from "@solana/web3.js";
import { AddressLookupTableCache } from "./alt_cache.js";
import type { ShredWasmTx } from "./instruction_parse.js";

const key = new PublicKey(new Uint8Array(32).fill(1));
const loaded = new PublicKey(new Uint8Array(32).fill(2));
const table = new AddressLookupTableAccount({
  key, state: { deactivationSlot: 0xffffffffffffffffn, lastExtendedSlot: 0,
    lastExtendedSlotStartIndex: 0, authority: undefined, addresses: [loaded] },
});
const tx: ShredWasmTx = { signature: "signature", messageVersion: "v0",
  accounts: [PublicKey.default.toBase58()], instructions: [], recentBlockhash: new Uint8Array(32),
  header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 },
  addressTableLookups: [{ accountKey: key.toBase58(), writableIndexes: new Uint8Array([0]), readonlyIndexes: new Uint8Array() }],
};
function wireTable(): Buffer {
  const data = Buffer.alloc(88);
  data.writeUInt32LE(1); data.writeBigUInt64LE(0xffffffffffffffffn, 4);
  data.set(loaded.toBytes(), 56);
  return data;
}
function connection(fetch: ReturnType<typeof vi.fn>): Connection {
  return { getMultipleAccountsInfo: fetch } as unknown as Connection;
}

afterEach(() => vi.useRealTimers());

describe("AddressLookupTableCache", () => {
  it("reads prewarmed keys synchronously without RPC and rejects stale indexes", () => {
    const fetch = vi.fn();
    const cache = new AddressLookupTableCache(connection(fetch), [table]);
    expect(cache.resolve(tx)).toEqual([PublicKey.default.toBase58(), loaded.toBase58()]);
    expect(cache.resolve({ ...tx, addressTableLookups: [{ ...tx.addressTableLookups![0], writableIndexes: new Uint8Array([1]) }] })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("expands multiple tables in runtime writable-then-readonly order", () => {
    const address = (value: number) => new PublicKey(new Uint8Array(32).fill(value));
    const secondKey = address(3);
    const first = new AddressLookupTableAccount({ key, state: { ...table.state, addresses: [address(4), address(5)] } });
    const second = new AddressLookupTableAccount({ key: secondKey, state: { ...table.state, addresses: [address(6), address(7)] } });
    const cache = new AddressLookupTableCache(undefined, [first, second]);
    expect(cache.resolve({ ...tx, addressTableLookups: [
      { accountKey: key.toBase58(), writableIndexes: new Uint8Array([1]), readonlyIndexes: new Uint8Array([0]) },
      { accountKey: secondKey.toBase58(), writableIndexes: new Uint8Array([0]), readonlyIndexes: new Uint8Array([1]) },
    ] })).toEqual([PublicKey.default.toBase58(), ...[5, 6, 4, 7].map(n => address(n).toBase58())]);
  });

  it("queues misses for a separate worker, then uses its snapshot without replaying", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue([{ data: wireTable() }]);
    const cache = new AddressLookupTableCache(connection(fetch), [], 10);
    cache.start();
    for (let i = 0; i < 100; i++) expect(cache.resolve(tx)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.resolve(tx)).toEqual([PublicKey.default.toBase58(), loaded.toBase58()]);
    cache.stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("bounds concurrent refreshes and discards a response from a stopped subscription", async () => {
    vi.useFakeTimers();
    let finish!: (value: { data: Buffer }[]) => void;
    const fetch = vi.fn(() => new Promise<{ data: Buffer }[]>(resolve => { finish = resolve; }));
    const cache = new AddressLookupTableCache(connection(fetch), [], 10);
    cache.start(); cache.resolve(tx);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetch).toHaveBeenCalledTimes(1);
    cache.stop(); finish([{ data: wireTable() }]);
    await Promise.resolve(); await Promise.resolve();
    expect(cache.resolve(tx)).toBeNull();
  });

  it("preloads explicitly in batches of at most 100", async () => {
    const fetch = vi.fn().mockImplementation(async (keys: PublicKey[]) => keys.map(() => null));
    const cache = new AddressLookupTableCache(connection(fetch));
    const keys = Array.from({ length: 101 }, (_, i) => {
      const bytes = new Uint8Array(32); bytes[0] = i; return new PublicKey(bytes).toBase58();
    });
    await cache.preload(keys);
    expect(fetch.mock.calls.map(call => call[0].length)).toEqual([100, 1]);
  });
  it("loads new misses from a saturated queue while continuing cached-table refresh", async () => {
    vi.useFakeTimers();
    const pubkey = (id: number) => { const bytes = Buffer.alloc(32); bytes.writeUInt32LE(id); return new PublicKey(bytes); };
    const id = (key: PublicKey) => Buffer.from(key.toBytes()).readUInt32LE();
    const initial = Array.from({ length: 200 }, (_, n) => new AddressLookupTableAccount({ key: pubkey(n), state: table.state }));
    const fetch = vi.fn().mockImplementation(async (keys: PublicKey[]) => keys.map(key => id(key) < 200 || id(key) === 9999 ? { data: wireTable() } : null));
    const cache = new AddressLookupTableCache(connection(fetch), initial, 1);
    const lookup = (n: number): ShredWasmTx => ({ ...tx, addressTableLookups: [{ ...tx.addressTableLookups![0], accountKey: pubkey(n).toBase58() }] });
    for (let n = 1000; n < 3048; n++) expect(cache.resolve(lookup(n))).toBeNull();
    expect(cache.resolve(lookup(9999))).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect((cache as unknown as { pending: Set<string> }).pending.size).toBe(2048);
    cache.start();
    await vi.advanceTimersByTimeAsync(30);
    cache.stop();
    expect(cache.resolve(lookup(9999))).toEqual([PublicKey.default.toBase58(), loaded.toBase58()]);
    const refreshed = new Set(fetch.mock.calls.flatMap(call => (call[0] as PublicKey[]).map(id).filter(n => n < 200)));
    expect(refreshed.size).toBe(200);
    expect(fetch.mock.calls.every(call => call[0].length <= 100)).toBe(true);
    expect((cache as unknown as { pending: Set<string> }).pending.size).toBeLessThanOrEqual(2048);
  });
  it("refreshes every cached table even when 99 unresolved misses occupy each RPC batch", async () => {
    vi.useFakeTimers();
    const pubkey = (id: number) => { const bytes = Buffer.alloc(32); bytes.writeUInt32LE(id); return new PublicKey(bytes); };
    const id = (key: PublicKey) => Buffer.from(key.toBytes()).readUInt32LE();
    const initial = Array.from({ length: 200 }, (_, n) => new AddressLookupTableAccount({ key: pubkey(n), state: table.state }));
    const fetch = vi.fn().mockImplementation(async (keys: PublicKey[]) => keys.map(key => id(key) < 200 ? { data: wireTable() } : null));
    const cache = new AddressLookupTableCache(connection(fetch), initial, 1);
    for (let n = 1000; n < 1099; n++) {
      cache.resolve({ ...tx, addressTableLookups: [{ ...tx.addressTableLookups![0], accountKey: pubkey(n).toBase58() }] });
    }
    cache.start();
    await vi.advanceTimersByTimeAsync(200);
    cache.stop();
    const refreshed = new Set(fetch.mock.calls.flatMap(call => (call[0] as PublicKey[]).map(id).filter(n => n < 200)));
    expect(refreshed.size).toBe(200);
    expect(fetch.mock.calls.every(call => call[0].length <= 100)).toBe(true);
  });

});
