/**
 * Yellowstone gRPC 单笔交易：日志解析 + 与 Rust `parse_logs` 相同的账户/数据填充。
 * 依赖 `@triton-one/yellowstone-grpc` 的 `txEncode`（Binary）得到与 web3 兼容的 meta + 反序列化交易。
 */
import { txEncode } from "@triton-one/yellowstone-grpc";
import type { SubscribeUpdateTransactionInfo as YellowstoneTxInfo } from "@triton-one/yellowstone-grpc";
import { WasmUiTransactionEncoding } from "@triton-one/yellowstone-grpc/dist/encoding/yellowstone_grpc_solana_encoding_wasm.js";
import bs58 from "bs58";
import { VersionedTransaction, type ConfirmedTransactionMeta } from "@solana/web3.js";
import type { DexEvent } from "../core/dex_event.js";
import { parseLogsOnly } from "../core/unified_parser.js";
import { applyAccountFillsToLogEvents } from "../rpc_transaction.js";
import type { SubscribeUpdateTransactionInfo } from "./types.js";

/**
 * 从 gRPC 回调中的 `SubscribeUpdateTransactionInfo`（须含 `transactionRaw` + `metaRaw` 原始 proto）
 * 解析 `DexEvent[]`，并对 PumpSwap/PumpFun 等补齐 mint、池子 ATA 等（与 Rust 订阅路径一致）。
 */
export function parseDexEventsFromGrpcTransactionInfo(
  info: SubscribeUpdateTransactionInfo,
  slot: string | bigint,
  options?: { blockTimeUs?: number }
): DexEvent[] {
  const tr = info.transactionRaw;
  const mr = info.metaRaw;
  if (!tr || !mr) return [];

  const y: YellowstoneTxInfo = {
    signature: info.signature,
    isVote: info.isVote,
    transaction: tr as unknown as YellowstoneTxInfo["transaction"],
    meta: mr as unknown as YellowstoneTxInfo["meta"],
    index: String(info.index),
  };

  const enc = txEncode.encode(y, WasmUiTransactionEncoding.Binary, 0, false);
  const vt = VersionedTransaction.deserialize(bs58.decode(enc.transaction as string));
  const meta = enc.meta as unknown as ConfirmedTransactionMeta;

  const logs = meta?.logMessages;
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const slotNum = typeof slot === "bigint" ? Number(slot) : Number(slot);
  const sigHint = bs58.encode(Uint8Array.from(info.signature)) + "...";

  const events = parseLogsOnly(logs, sigHint, slotNum, options?.blockTimeUs);
  if (events.length === 0) return [];

  applyAccountFillsToLogEvents(events, vt.message, meta);
  return events;
}
