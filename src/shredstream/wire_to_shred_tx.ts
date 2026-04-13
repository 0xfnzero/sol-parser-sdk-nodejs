/**
 * 线格式交易字节 → `ShredWasmTx`（与原 wasm-pack 展开字段对齐，供 `parseInstructionUnified`）。
 */
import { Message, MessageV0, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type {
  ShredAddressTableLookup,
  ShredWasmCompiledIx,
  ShredWasmTx,
} from "./instruction_parse.js";

export function wireBytesToShredWasmTx(raw: Uint8Array): ShredWasmTx | null {
  try {
    const vt = VersionedTransaction.deserialize(Buffer.from(raw));
    const sig0 = vt.signatures[0];
    if (!sig0) return null;
    const signature = bs58.encode(sig0);
    const msg = vt.message;

    if (msg instanceof MessageV0) {
      const lookups: ShredAddressTableLookup[] = msg.addressTableLookups.map((l) => ({
        accountKey: l.accountKey.toBase58(),
        writableIndexes: new Uint8Array(l.writableIndexes),
        readonlyIndexes: new Uint8Array(l.readonlyIndexes),
      }));
      const instructions: ShredWasmCompiledIx[] = msg.compiledInstructions.map((ix) => ({
        programIdIndex: ix.programIdIndex,
        accounts: new Uint8Array(ix.accountKeyIndexes),
        data: new Uint8Array(ix.data),
      }));
      return {
        signature,
        accounts: msg.staticAccountKeys.map((k) => k.toBase58()),
        instructions,
        messageVersion: "v0",
        header: msg.header,
        recentBlockhash: Uint8Array.from(bs58.decode(msg.recentBlockhash)),
        addressTableLookups: lookups,
      };
    }

    const m = msg as Message;
    const instructions: ShredWasmCompiledIx[] = m.compiledInstructions.map((ix) => ({
      programIdIndex: ix.programIdIndex,
      accounts: new Uint8Array(ix.accountKeyIndexes),
      data: new Uint8Array(ix.data),
    }));
    return {
      signature,
      accounts: m.staticAccountKeys.map((k) => k.toBase58()),
      instructions,
      messageVersion: "legacy",
      header: m.header,
      recentBlockhash: Uint8Array.from(bs58.decode(m.recentBlockhash)),
    };
  } catch {
    return null;
  }
}
