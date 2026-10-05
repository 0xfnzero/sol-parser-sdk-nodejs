/** Refresh saved LaunchLab/CPMM snapshots from GRPC_URL/GRPC_TOKEN.
 * npx tsx examples/stonkfun_snapshot_refresh.ts snapshots.json [--require-pool-update]
 * Retained cold-bootstrap accounts can be stale: trade preparation will reject
 * them according to read_slot/maximum_slot_age. This example never submits trades.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  exactU64,
  YellowstoneGrpc,
  eventTypeFilterIncludeOnly,
  CommitmentLevel,
  type RawAccountSnapshotEvent,
} from "../src/index.js";
const CLOCK = "SysvarC1ock11111111111111111111111111111111";
export interface SavedAccount {
  pubkey: string;
  owner: string;
  data: string;
  slot: string;
  write_version: string;
}
export function applyRawSnapshot(
  current: SavedAccount,
  e: RawAccountSnapshotEvent,
): SavedAccount {
  if (current.pubkey !== e.account.pubkey)
    throw new Error("Snapshot identity mismatch");
  const slot = exactU64(e.metadata.slot, "account slot"),
    version = e.write_version,
    oldSlot = BigInt(current.slot),
    oldVersion = BigInt(current.write_version);
  if (slot < oldSlot || (slot === oldSlot && version < oldVersion))
    return current;
  const next = {
    pubkey: e.account.pubkey,
    owner: e.account.owner,
    data: Buffer.from(
      e.account.lamports === 0n ? new Uint8Array() : e.account.data,
    ).toString("base64"),
    slot: slot.toString(),
    write_version: version.toString(),
  };
  if (slot === oldSlot && version === oldVersion) {
    if (
      current.owner !== next.owner ||
      !Buffer.from(current.data, "base64").equals(
        Buffer.from(next.data, "base64"),
      )
    )
      throw new Error("Conflicting account version; select a fork explicitly");
    return current;
  }
  return next;
}
async function main() {
  const file = process.argv[2],
    url = process.env.GRPC_URL;
  if (!file || !url) throw new Error("Provide snapshot path and GRPC_URL");
  const snapshot = JSON.parse(readFileSync(file, "utf8"));
  const listed: SavedAccount[] | undefined = snapshot.accounts;
  const names = new Map<string, string | number>();
  if (listed) {
    listed.forEach((a, i) => {
      if (a.pubkey !== CLOCK) names.set(a.pubkey, i);
    });
  } else
    for (const n of [
      "pool",
      "global",
      "platform",
      "config",
      "base_mint",
      "quote_mint",
      "base_vault",
      "quote_vault",
    ]) {
      if (snapshot[n] && typeof snapshot[n] === "object")
        names.set(snapshot[n].pubkey, n);
    }
  const pools = new Set<string>((snapshot.legs ?? []).map((h: any) => h.pool));
  if (snapshot.pool)
    pools.add(
      typeof snapshot.pool === "string" ? snapshot.pool : snapshot.pool.pubkey,
    );
  const updatedPools = new Set<string>();
  const client = new YellowstoneGrpc(url, process.env.GRPC_TOKEN ?? "");
  let clock: SavedAccount | undefined,
    poolUpdated = false,
    streamError: Error | undefined;
  const sub = await client.subscribeDexEvents(
    [],
    [{ account: [CLOCK, ...names.keys()], owner: [], filters: [] }],
    eventTypeFilterIncludeOnly(["AccountRawSnapshot"]),
  );
  const timeout = setTimeout(() => {
    streamError = new Error("Timed out waiting for required snapshots");
    sub.cancel();
  }, 30000);
  const errors = (async () => {
    for await (const e of sub.errors) {
      streamError = e;
      sub.cancel();
    }
  })();
  try {
    for await (const event of sub) {
      if (!("RawAccountSnapshot" in event)) continue;
      const raw = event.RawAccountSnapshot,
        account = raw.account,
        name = names.get(account.pubkey);
      if (name !== undefined) {
        const previous = listed ? listed[name as number] : snapshot[name];
        const updated = applyRawSnapshot(previous, raw);
        if (listed) listed[name as number] = updated;
        else snapshot[name] = updated;
        if (pools.has(account.pubkey) && updated !== previous)
          updatedPools.add(account.pubkey);
        poolUpdated = pools.size > 0 && updatedPools.size === pools.size;
      } else if (account.pubkey === CLOCK) {
        if (account.lamports === 0n || account.data.length !== 40)
          throw new Error("Invalid Clock account");
        const previous = clock ?? {
          pubkey: CLOCK,
          owner: account.owner,
          data: "",
          slot: "0",
          write_version: "0",
        };
        const next = applyRawSnapshot(previous, raw);
        if (next === clock) continue;
        clock = next;
        if (listed) {
          const i = listed.findIndex((a) => a.pubkey === CLOCK);
          if (i >= 0) listed[i] = next;
        }
        const data = Buffer.from(clock.data, "base64");
        snapshot.epoch = data.readBigUInt64LE(16).toString();
        snapshot.unix_timestamp = data.readBigInt64LE(32).toString();
        snapshot.read_slot = data.readBigUInt64LE(0).toString();
      }
      if (
        clock &&
        (poolUpdated || !process.argv.includes("--require-pool-update"))
      ) {
        const blockhash = await client.getLatestBlockhash(
          CommitmentLevel.CONFIRMED,
        );
        snapshot.recent_blockhash = blockhash.blockhash;
        writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");
        console.log(
          JSON.stringify({
            slot: snapshot.read_slot,
            epoch: snapshot.epoch,
            blockhash_slot: blockhash.slot,
            pool_updated: poolUpdated,
          }),
        );
        return;
      }
    }
    throw (
      streamError ?? new Error("Subscription closed before required snapshots")
    );
  } finally {
    clearTimeout(timeout);
    sub.cancel();
    await client.disconnect();
    await errors;
  }
}
if (process.argv[1]?.endsWith("stonkfun_snapshot_refresh.ts"))
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
