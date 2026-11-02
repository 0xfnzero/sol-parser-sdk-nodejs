/** Native offline inputs shared by stock and wrapper replays. No fallback RPC. */
import { readFileSync } from "node:fs";
import { Message, MessageV0, MessageV1, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { decodeWireTransaction } from "../../src/wire_transaction.js";
import { parseRpcTransaction } from "../../src/rpc_transaction.js";

export function loadCases(defaultPath: string): any[] {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--fixture"))
    throw Error("Usage: --fixture FILE");
  const document = JSON.parse(readFileSync(args[1] ?? defaultPath, "utf8"));
  const cases = document.cases ?? [{ rpc: document.result ?? document }];
  if (!Array.isArray(cases) || !cases.length)
    throw Error("Empty or malformed replay");
  return cases.map((c) => ({ ...c, rpc: c.rpc ?? c.wire_rpc ?? c.raw }));
}
export function replayEvents(raw: any, recvUs = 1_000_000n) {
  if (Array.isArray(raw.transaction) && raw.transaction[1] !== "base64")
    throw Error("Expected base64 transaction");
  const body = Array.isArray(raw.transaction)
    ? decodeWireTransaction(Buffer.from(raw.transaction[0], "base64"))
        .transaction
    : raw.transaction;
  const message = replayMessage(body.message, raw.version);
  const loaded = raw.meta?.loadedAddresses ?? { writable: [], readonly: [] };
  const result = parseRpcTransaction(
    {
      ...raw,
      transaction: { ...body, message },
      meta: {
        ...raw.meta,
        loadedAddresses: {
          writable: loaded.writable.map((k: string) => new PublicKey(k)),
          readonly: loaded.readonly.map((k: string) => new PublicKey(k)),
        },
      },
    },
    body.signatures[0],
    undefined,
    { grpcRecvUs: recvUs },
  );
  if (!result.ok) throw Error(JSON.stringify(result.error));
  return result.events;
}
export function printJson(value: unknown): void {
  console.log(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

/** Captured RPC JSON is untyped here; the SDK validates compiled instructions. */
export function replayMessage(msg: any, version: unknown) {
  if (version !== 1 && version !== 0 && !msg.addressTableLookups) return new Message(msg);
  const common = {
    header: msg.header,
    staticAccountKeys: msg.accountKeys.map((key: string) => new PublicKey(key)),
    recentBlockhash: msg.recentBlockhash,
    compiledInstructions: msg.instructions.map((ix: any) => ({
      programIdIndex: ix.programIdIndex,
      accountKeyIndexes: ix.accounts,
      data: bs58.decode(ix.data),
    })),
  };
  if (version === 1) return new MessageV1({ ...common, transactionConfig: msg.transactionConfig });
  return new MessageV0({
    ...common,
    addressTableLookups: (msg.addressTableLookups ?? []).map((lookup: any) => ({
      ...lookup, accountKey: new PublicKey(lookup.accountKey),
    })),
  });
}
