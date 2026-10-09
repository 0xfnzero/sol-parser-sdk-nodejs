import type { AddressLookupTableAccount, Connection } from "@solana/web3.js";
import { loadAddressLookupTableAccounts } from "./alt_lookup.js";
import type { ShredWasmTx } from "./instruction_parse.js";

/** Bounded ALT cache. resolve() only reads memory; its misses are refreshed by a timer. */
export class AddressLookupTableCache {
  private static readonly CAPACITY = 2048;
  private readonly tables = new Map<string, readonly string[]>();
  private readonly pending = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;
  private refreshing = false;
  private generation = 0;
  private refreshOffset = 0;
  private failures = 0;

  constructor(
    private readonly connection?: Connection,
    initial: readonly AddressLookupTableAccount[] = [],
    private readonly refreshIntervalMs = 1000,
  ) {
    if (!Number.isFinite(refreshIntervalMs) || refreshIntervalMs < 1) {
      throw new RangeError("alt_refresh_interval_ms must be positive");
    }
    this.store(initial);
  }

  get refreshFailures(): number { return this.failures; }

  private store(tables: Iterable<AddressLookupTableAccount>): void {
    for (const table of tables) {
      const key = table.key.toBase58();
      // Encode each loaded pubkey once during refresh, never per transaction.
      this.tables.set(key, table.state.addresses.map(address => address.toBase58()));
      this.pending.delete(key);
      if (this.tables.size > AddressLookupTableCache.CAPACITY) {
        this.tables.delete(this.tables.keys().next().value!);
      }
    }
  }

  private schedule(key: string): void {
    if (this.pending.has(key)) return;
    // Keep new misses eligible even when old tables remain unavailable forever.
    if (this.pending.size >= AddressLookupTableCache.CAPACITY) {
      this.pending.delete(this.pending.keys().next().value!);
    }
    this.pending.add(key);
  }

  /** null means this transaction is unresolved; callers must skip it, never emit guessed keys. */
  resolve(tx: ShredWasmTx): string[] | null {
    if (tx.messageVersion !== "v0" || !tx.addressTableLookups?.length) return tx.accounts;
    let missing = false;
    for (const lookup of tx.addressTableLookups) {
      if (!this.tables.has(lookup.accountKey)) {
        missing = true;
        this.schedule(lookup.accountKey);
      }
    }
    if (missing) return null;
    const keys = tx.accounts.slice();
    // Runtime layout is all writable keys across tables, then all readonly keys.
    for (const kind of ["writableIndexes", "readonlyIndexes"] as const) {
      for (const lookup of tx.addressTableLookups) {
        const table = this.tables.get(lookup.accountKey)!;
        for (const index of lookup[kind]) {
          const key = table[index];
          if (key === undefined) {
            // A snapshot can predate an ALT extension. Refresh outside parsing.
            this.schedule(lookup.accountKey);
            return null;
          }
          keys.push(key);
        }
      }
    }
    return keys;
  }

  /** Explicit pre-subscription network operation, batched to the RPC's 100-account limit. */
  async preload(addresses: readonly string[]): Promise<void> {
    if (!this.connection) throw new Error("ALT preloading requires config.connection");
    const unique = [...new Set(addresses)];
    for (let start = 0; start < unique.length; start += 100) {
      this.store((await loadAddressLookupTableAccounts(this.connection, unique.slice(start, start + 100))).values());
    }
  }

  start(): void {
    if (!this.connection || this.timer) return;
    const generation = ++this.generation;
    this.timer = setInterval(() => { void this.refresh(generation); }, this.refreshIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.generation++;
  }

  private async refresh(generation: number): Promise<void> {
    if (!this.connection || this.refreshing) return;
    // Reserve a share of each batch for existing snapshots under a full miss queue.
    const pendingLimit = 100 - Math.min(25, this.tables.size);
    const keys = [...this.pending].slice(0, pendingLimit);
    // Rotate unresolved misses too; absent tables must not starve the rest of the queue.
    for (const key of keys) { this.pending.delete(key); this.pending.add(key); }
    // Rotate cached snapshots as well, so existing tables can acquire appended addresses.
    const cached = [...this.tables.keys()];
    if (cached.length) {
      let visited = 0;
      while (visited < cached.length && keys.length < 100) {
        const key = cached[(this.refreshOffset + visited) % cached.length]!;
        visited++;
        if (!keys.includes(key)) keys.push(key);
      }
      this.refreshOffset = (this.refreshOffset + visited) % cached.length;
    }
    if (!keys.length) return;
    this.refreshing = true;
    try {
      const tables = await loadAddressLookupTableAccounts(this.connection, keys);
      if (generation === this.generation) this.store(tables.values());
    } catch {
      this.failures++;
    } finally {
      this.refreshing = false;
    }
  }
}
