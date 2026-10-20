/** Native offline inputs shared by stock and wrapper replays. No fallback RPC. */
import { readFileSync } from "node:fs";
import { Message, MessageV0, PublicKey } from "@solana/web3.js";
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
  const msg = body.message;
  const message = msg.addressTableLookups
    ? new MessageV0({
        header: msg.header,
        staticAccountKeys: msg.accountKeys.map((k: string) => new PublicKey(k)),
        recentBlockhash: msg.recentBlockhash,
        compiledInstructions: msg.instructions.map((ix: any) => ({
          programIdIndex: ix.programIdIndex,
          accountKeyIndexes: ix.accounts,
          data: bs58.decode(ix.data),
        })),
        addressTableLookups: msg.addressTableLookups.map((a: any) => ({
          ...a,
          accountKey: new PublicKey(a.accountKey),
        })),
      })
    : new Message(msg);
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
