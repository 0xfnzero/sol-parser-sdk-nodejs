/**
 * V0 交易：从链上拉取 ALT 账户，拼出与运行时一致的完整账户 key 列表（静态 + 查找表展开）。
 */
import {
  AddressLookupTableAccount,
  Connection,
  MessageV0,
  type MessageHeader,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";
import type { ShredWasmTx } from "./instruction_parse.js";

/** 批量拉取 ALT，供同一 Entry 内多笔交易复用 */
export async function loadAddressLookupTableAccounts(
  connection: Connection,
  lookupTableAddresses: readonly string[]
): Promise<Map<string, AddressLookupTableAccount>> {
  const map = new Map<string, AddressLookupTableAccount>();
  if (lookupTableAddresses.length === 0) return map;
  const pks = lookupTableAddresses.map((s) => new PublicKey(s));
  const infos = await connection.getMultipleAccountsInfo(pks);
  for (let i = 0; i < pks.length; i++) {
    const info = infos[i];
    if (!info?.data) continue;
    const state = AddressLookupTableAccount.deserialize(info.data);
    const alt = new AddressLookupTableAccount({ key: pks[i]!, state });
    map.set(pks[i]!.toBase58(), alt);
  }
  return map;
}

/** 使用已拉取的 ALT 构造完整账户表（base58）；失败时退回仅静态表 */
export function fullAccountKeyStringsFromShredTx(
  tx: ShredWasmTx,
  altByAddress: Map<string, AddressLookupTableAccount>
): string[] {
  if (tx.messageVersion !== "v0" || !tx.addressTableLookups?.length) {
    return tx.accounts;
  }
  const lookups = tx.addressTableLookups;
  const altAccounts: AddressLookupTableAccount[] = [];
  for (const l of lookups) {
    const alt = altByAddress.get(l.accountKey);
    if (!alt) {
      return tx.accounts;
    }
    altAccounts.push(alt);
  }
  const header = tx.header as MessageHeader;
  const rb = tx.recentBlockhash;
  if (!header || !rb || rb.length !== 32) {
    return tx.accounts;
  }
  const msg = new MessageV0({
    header,
    staticAccountKeys: tx.accounts.map((s) => new PublicKey(s)),
    recentBlockhash: bs58.encode(rb),
    compiledInstructions: (tx.instructions ?? []).map((ix) => ({
      programIdIndex: ix.programIdIndex,
      accountKeyIndexes: Array.from(ix.accounts),
      data: Buffer.from(ix.data),
    })),
    addressTableLookups: lookups.map((l) => ({
      accountKey: new PublicKey(l.accountKey),
      writableIndexes: Array.from(l.writableIndexes),
      readonlyIndexes: Array.from(l.readonlyIndexes),
    })),
  });
  const keys = msg.getAccountKeys({ addressLookupTableAccounts: altAccounts });
  const out: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    out.push(keys.get(i)!.toBase58());
  }
  return out;
}
