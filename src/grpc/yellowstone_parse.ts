/**
 * Yellowstone gRPC 单笔交易：统一交易解析（指令 + 日志 + 与 Rust 相同的账户/数据填充）。
 * 直接将 Yellowstone protobuf transaction/meta 映射为 web3 兼容结构，避免每笔交易经过
 * protobuf encode、WASM JSON/Base58 encode、Base58 decode 和反序列化的往返开销。
 */
import type { SubscribeUpdateTransactionInfo as YellowstoneTxInfo } from "@triton-one/yellowstone-grpc";
import bs58 from "bs58";
import type { DexEvent } from "../core/dex_event.js";
import { parseRpcTransaction } from "../rpc_transaction.js";
import type { EventTypeFilter, SubscribeUpdateTransactionInfo } from "./types.js";
import { yellowstoneTransactionToWeb3 } from "./yellowstone_transaction_adapter.js";

/**
 * Yellowstone `SubscribeUpdateTransactionInfo.index` → `EventMetadata.tx_index`。
 * 与 Rust `sol-parser-sdk` gRPC 路径中 `let idx = info.index` 传入 `parse_logs(..., idx, ...)` 一致。
 */
export function grpcTxIndexFromInfo(info: Pick<SubscribeUpdateTransactionInfo, "index">): number {
  const index = info.index;
  if (index === undefined) return 0;
  const n = typeof index === "bigint" ? Number(index) : Number(index);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/**
 * 从 gRPC 回调中的 `SubscribeUpdateTransactionInfo`（须含 `transactionRaw` + `metaRaw` 原始 proto）
 * 解析 `DexEvent[]`，并对 PumpSwap/PumpFun 等补齐 mint、池子 ATA 等（与 Rust 订阅路径一致）。
 */
export function parseDexEventsFromGrpcTransactionInfo(
  info: SubscribeUpdateTransactionInfo,
  slot: string | bigint,
  options?: { blockTimeUs?: number; grpcRecvUs?: number; eventTypeFilter?: EventTypeFilter }
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

  const slotNum = typeof slot === "bigint" ? Number(slot) : Number(slot);
  const signatureBase58 = bs58.encode(Uint8Array.from(info.signature));
  const txIndex = grpcTxIndexFromInfo(info);
  const blockTime = options?.blockTimeUs == null ? null : Math.floor(options.blockTimeUs / 1_000_000);
  const response = yellowstoneTransactionToWeb3(y.transaction!, y.meta!, slotNum, blockTime);
  // This reuses the parser for the web3-compatible in-memory shape. It does not
  // perform an RPC request or any other network I/O.
  const parsed = parseRpcTransaction(
    response,
    signatureBase58,
    options?.eventTypeFilter,
    {
      blockTimeUs: options?.blockTimeUs,
      grpcRecvUs: options?.grpcRecvUs,
      txIndex,
    }
  );
  return parsed.ok ? parsed.events : [];
}
