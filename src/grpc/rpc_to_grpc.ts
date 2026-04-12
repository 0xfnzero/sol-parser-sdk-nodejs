/**
 * 将 `@solana/web3.js` 的 `VersionedTransactionResponse` 转为 Yellowstone `Transaction` + `TransactionStatusMeta`，
 * 与 Rust `rpc_parser::convert_rpc_to_grpc` 字段取舍一致（token balances / rewards 置空，err 置空等）。
 */
import bs58 from "bs58";
import type {
  Message as YMessage,
  Transaction as YTransaction,
  TransactionStatusMeta,
  InnerInstructions,
  InnerInstruction,
  CompiledInstruction as YCompiledInstruction,
  MessageAddressTableLookup as YMessageAddressTableLookup,
} from "@triton-one/yellowstone-grpc/dist/grpc/solana-storage.js";
import {
  type Message,
  type MessageV0,
  type VersionedTransactionResponse,
  type ConfirmedTransactionMeta,
  type CompiledInstruction,
  type MessageCompiledInstruction,
} from "@solana/web3.js";
import type { ParseError } from "../core/error.js";
import { decodeIxData, isCompiledVersionedMessage } from "../core/rpc_invoke_map.js";

function toYCompiled(ix: CompiledInstruction | MessageCompiledInstruction): YCompiledInstruction {
  const accounts = "accountKeyIndexes" in ix ? ix.accountKeyIndexes : ix.accounts;
  return {
    programIdIndex: ix.programIdIndex,
    accounts: Uint8Array.from(accounts),
    data: decodeIxData(ix.data as Uint8Array | string),
  };
}

function toYInnerInstruction(ix: CompiledInstruction): InnerInstruction {
  const stackHeight = (ix as { stackHeight?: number }).stackHeight;
  return {
    programIdIndex: ix.programIdIndex,
    accounts: Uint8Array.from(ix.accounts),
    data: decodeIxData(ix.data),
    ...(stackHeight !== undefined ? { stackHeight } : {}),
  };
}

function legacyMessageToYellowstone(msg: Message): YMessage {
  return {
    header: {
      numRequiredSignatures: msg.header.numRequiredSignatures,
      numReadonlySignedAccounts: msg.header.numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts: msg.header.numReadonlyUnsignedAccounts,
    },
    accountKeys: msg.accountKeys.map((k) => new Uint8Array(k.toBytes())),
    recentBlockhash: new Uint8Array(bs58.decode(msg.recentBlockhash)),
    instructions: msg.compiledInstructions.map(toYCompiled),
    versioned: false,
    addressTableLookups: [],
  };
}

function v0MessageToYellowstone(msg: MessageV0): YMessage {
  const lookups: YMessageAddressTableLookup[] = msg.addressTableLookups.map((l) => ({
    accountKey: new Uint8Array(l.accountKey.toBytes()),
    writableIndexes: l.writableIndexes instanceof Uint8Array ? l.writableIndexes : Uint8Array.from(l.writableIndexes),
    readonlyIndexes: l.readonlyIndexes instanceof Uint8Array ? l.readonlyIndexes : Uint8Array.from(l.readonlyIndexes),
  }));
  return {
    header: {
      numRequiredSignatures: msg.header.numRequiredSignatures,
      numReadonlySignedAccounts: msg.header.numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts: msg.header.numReadonlyUnsignedAccounts,
    },
    accountKeys: msg.staticAccountKeys.map((k) => new Uint8Array(k.toBytes())),
    recentBlockhash: new Uint8Array(bs58.decode(msg.recentBlockhash)),
    instructions: msg.compiledInstructions.map(toYCompiled),
    versioned: true,
    addressTableLookups: lookups,
  };
}

function metaToYellowstone(meta: ConfirmedTransactionMeta): TransactionStatusMeta {
  const innerGroups = meta.innerInstructions;
  const innerInstructions: InnerInstructions[] = [];
  if (innerGroups) {
    for (const g of innerGroups) {
      innerInstructions.push({
        index: g.index,
        instructions: g.instructions.map(toYInnerInstruction),
      });
    }
  }

  const loaded = meta.loadedAddresses;
  const loadedWritable = loaded?.writable.map((k) => new Uint8Array(k.toBytes())) ?? [];
  const loadedReadonly = loaded?.readonly.map((k) => new Uint8Array(k.toBytes())) ?? [];

  const logs = meta.logMessages ?? [];

  return {
    err: undefined,
    fee: String(meta.fee),
    preBalances: meta.preBalances.map(String),
    postBalances: meta.postBalances.map(String),
    innerInstructions,
    innerInstructionsNone: innerGroups == null,
    logMessages: [...logs],
    logMessagesNone: logs.length === 0,
    preTokenBalances: [],
    postTokenBalances: [],
    rewards: [],
    loadedWritableAddresses: loadedWritable,
    loadedReadonlyAddresses: loadedReadonly,
    returnData: undefined,
    returnDataNone: true,
    computeUnitsConsumed:
      meta.computeUnitsConsumed !== undefined ? String(meta.computeUnitsConsumed) : undefined,
  };
}

export type ConvertRpcToGrpcOk = { ok: true; meta: TransactionStatusMeta; transaction: YTransaction };
export type ConvertRpcToGrpcErr = { ok: false; error: ParseError };

/**
 * 与 Rust `convert_rpc_to_grpc` 对齐：输入为 RPC `getTransaction` 的 **非 jsonParsed**、已编译 message 的响应。
 */
export function convertRpcToGrpc(tx: VersionedTransactionResponse): ConvertRpcToGrpcOk | ConvertRpcToGrpcErr {
  const msg = tx.transaction?.message;
  if (!msg || !isCompiledVersionedMessage(msg)) {
    return {
      ok: false,
      error: {
        kind: "ConversionError",
        message:
          "交易 message 非编译形态（例如 jsonParsed）。请使用默认编码的 getTransaction 响应后再转换。",
      },
    };
  }
  const meta = tx.meta;
  if (meta == null) {
    return {
      ok: false,
      error: { kind: "MissingField", field: "meta" },
    };
  }

  const yMsg: YMessage =
    msg.version === "legacy" ? legacyMessageToYellowstone(msg as Message) : v0MessageToYellowstone(msg as MessageV0);

  const transaction: YTransaction = {
    signatures: tx.transaction.signatures.map((s) => new Uint8Array(bs58.decode(s))),
    message: yMsg,
  };

  return { ok: true, meta: metaToYellowstone(meta), transaction };
}

/** Rust 蛇形命名 */
export const convert_rpc_to_grpc = convertRpcToGrpc;
