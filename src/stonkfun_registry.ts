/** Caller-owned migration provenance; transactions never mutate a global registry. */
import bs58 from "bs58";
import { decodeWireTransaction } from "./wire_transaction.js";
import {
  ROUTE_PROGRAMS,
  analyzeRpcTransactionRoutes,
  ZERO,
  stonkfunModeFromPlatformConfig,
} from "./transaction_route.js";
export interface StonkFunGraduatedPool {
  curve_pool: string;
  pool: string;
  base_mint: string;
  quote_mint: string;
  platform_config: string;
  migration_signature: string;
  migration_slot: bigint;
}
function validate(p: StonkFunGraduatedPool): void {
  if (
    !stonkfunModeFromPlatformConfig(p.platform_config) ||
    p.curve_pool === p.pool ||
    p.base_mint === p.quote_mint
  )
    throw new Error("Invalid StonkFun registry identity");
  for (const key of [p.curve_pool, p.pool, p.base_mint, p.quote_mint])
    if (key === ZERO || bs58.decode(key).length !== 32)
      throw new Error("Invalid registry key");
  if (
    bs58.decode(p.migration_signature).length !== 64 ||
    typeof p.migration_slot !== "bigint" ||
    p.migration_slot < 0n ||
    p.migration_slot >= 1n << 64n
  )
    throw new Error("Invalid migration provenance");
}
const equal = (a: StonkFunGraduatedPool, b: StonkFunGraduatedPool) =>
  Object.keys(a).every(
    (k) =>
      a[k as keyof StonkFunGraduatedPool] ===
      b[k as keyof StonkFunGraduatedPool],
  );
export class StonkFunPoolRegistry {
  private pools = new Map<string, Readonly<StonkFunGraduatedPool>>();
  constructor(entries: Iterable<StonkFunGraduatedPool> = []) {
    for (const p of entries) {
      validate(p);
      if (this.pools.has(p.pool)) throw new Error("Duplicate registry entry");
      this.pools.set(p.pool, Object.freeze({ ...p }));
    }
  }
  get(pool: string): Readonly<StonkFunGraduatedPool> | undefined {
    return this.pools.get(pool);
  }
  verifiedCpmmPools(): string[] {
    return [...this.pools.keys()].sort();
  }
  poolsForBaseMint(mint: string): Readonly<StonkFunGraduatedPool>[] {
    return this.verifiedCpmmPools()
      .map((k) => this.pools.get(k)!)
      .filter((p) => p.base_mint === mint);
  }
  toJSON() {
    return {
      pools: this.verifiedCpmmPools().map((k) => ({
        ...this.pools.get(k)!,
        migration_slot: this.pools.get(k)!.migration_slot.toString(),
      })),
    };
  }
  static fromJSON(
    data: ReturnType<StonkFunPoolRegistry["toJSON"]>,
  ): StonkFunPoolRegistry {
    return new StonkFunPoolRegistry(
      data.pools.map((p) => ({
        ...p,
        migration_slot: BigInt(p.migration_slot),
      })),
    );
  }
  observeMigrations(
    entries: Iterable<StonkFunGraduatedPool>,
    succeeded: boolean,
  ): number {
    if (!succeeded) return 0;
    const pending = new Map<string, StonkFunGraduatedPool>();
    for (const p of entries) {
      validate(p);
      const prior = pending.get(p.pool) ?? this.pools.get(p.pool);
      if (prior && !equal(prior, p))
        throw new Error("Conflicting migration provenance");
      pending.set(p.pool, p);
    }
    let count = 0;
    for (const [k, p] of pending) {
      if (!this.pools.has(k)) count++;
      this.pools.set(k, Object.freeze({ ...p }));
    }
    return count;
  }
  observeRpcTransaction(transaction: unknown): number {
    const root = transaction as Record<string, any>,
      tx = root.result ?? root;
    if (!tx.meta || typeof tx.meta !== "object")
      throw new Error("Transaction metadata missing");
    if (!("err" in tx.meta))
      throw new Error("Transaction execution status missing");
    if (tx.meta.err !== null) return 0;
    // Use the same compiled index/group validation as route analysis.
    analyzeRpcTransactionRoutes(transaction);
    let body = tx.transaction;
    if (Array.isArray(body)) {
      if (body.length !== 2 || body[1] !== "base64")
        throw new Error("Expected base64 encoding");
      body = decodeWireTransaction(Buffer.from(body[0], "base64")).transaction;
    }
    const loaded = tx.meta.loadedAddresses ?? {},
      keys: string[] = [
        ...body.message.accountKeys.map((k: any) =>
          typeof k === "string" ? k : k.pubkey,
        ),
        ...(loaded.writable ?? []),
        ...(loaded.readonly ?? []),
      ];
    const instructions = [...body.message.instructions];
    for (const group of tx.meta.innerInstructions ?? [])
      instructions.push(...group.instructions);
    const entries: StonkFunGraduatedPool[] = [];
    for (const ix of instructions) {
      if (ix.programIdIndex === undefined)
        throw new Error("Expected compiled instructions");
      const d = typeof ix.data === "string" ? bs58.decode(ix.data) : ix.data;
      if (
        keys[ix.programIdIndex] !== ROUTE_PROGRAMS.LaunchLab ||
        Buffer.from(d).subarray(0, 8).toString("hex") !== "885cc8671cda908c" ||
        ix.accounts.length < 28
      )
        continue;
      const a: string[] = Array.from(
        ix.accounts as number[],
        (k) => keys[k] ?? ZERO,
      );
      if (
        a[4] !== ROUTE_PROGRAMS.RaydiumCpmm ||
        !stonkfunModeFromPlatformConfig(a[3]!)
      )
        continue;
      if (
        [a[17], a[5], a[1], a[2]].includes(ZERO) ||
        a[17] === a[5] ||
        a[1] === a[2]
      )
        continue;
      if (typeof tx.slot === "number" && !Number.isSafeInteger(tx.slot))
        throw new Error("Unsafe slot integer");
      entries.push({
        curve_pool: a[17]!,
        pool: a[5]!,
        base_mint: a[1]!,
        quote_mint: a[2]!,
        platform_config: a[3]!,
        migration_signature: body.signatures[0],
        migration_slot: BigInt(tx.slot),
      });
    }
    return this.observeMigrations(entries, true);
  }
}
