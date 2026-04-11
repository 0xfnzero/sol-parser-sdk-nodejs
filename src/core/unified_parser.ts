import type { DexEvent } from "./dex_event.js";
import { parseLogUnified, parseLogOptimized } from "../logs/optimized_matcher.js";
import type { EventTypeFilter } from "../grpc/types.js";
import { nowUs } from "./clock.js";

export type EventListener = { onDexEvent: (event: DexEvent) => void };
export type StreamingEventListener = { onDexEventStreaming: (event: DexEvent) => void };

/** 从交易解析事件；当前主路径为日志解析 */
export function parseTransactionEvents(
  _instructionData: Uint8Array,
  _accounts: string[],
  logs: string[],
  signature: string,
  slot: number,
  _txIndex: number,
  blockTimeUs: number | undefined,
  _programId: string
): DexEvent[] {
  return parseLogsOnly(logs, signature, slot, blockTimeUs, _txIndex);
}

export function parseLogsOnly(
  logs: string[],
  signature: string,
  slot: number,
  blockTimeUs: number | undefined,
  txIndex: number = 0
): DexEvent[] {
  const out: DexEvent[] = [];
  for (const log of logs) {
    const e = parseLogUnified(log, signature, slot, blockTimeUs, txIndex);
    if (e) out.push(e);
  }
  return out;
}

export function parseTransactionWithListener(
  instructionData: Uint8Array,
  accounts: string[],
  logs: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  programId: string,
  listener: EventListener
): void {
  for (const e of parseTransactionEvents(
    instructionData,
    accounts,
    logs,
    signature,
    slot,
    txIndex,
    blockTimeUs,
    programId
  )) {
    listener.onDexEvent(e);
  }
}

export function parseTransactionEventsStreaming(
  _instructionData: Uint8Array,
  _accounts: string[],
  logs: string[],
  signature: string,
  slot: number,
  _txIndex: number,
  blockTimeUs: number | undefined,
  _programId: string,
  callback: (event: DexEvent) => void
): void {
  parseLogsStreaming(logs, signature, slot, blockTimeUs, callback, _txIndex);
}

export function parseLogsStreaming(
  logs: string[],
  signature: string,
  slot: number,
  blockTimeUs: number | undefined,
  callback: (event: DexEvent) => void,
  txIndex: number = 0
): void {
  for (const log of logs) {
    const e = parseLogUnified(log, signature, slot, blockTimeUs, txIndex);
    if (e) callback(e);
  }
}

export function parseTransactionWithStreamingListener(
  instructionData: Uint8Array,
  accounts: string[],
  logs: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  programId: string,
  listener: StreamingEventListener
): void {
  parseTransactionEventsStreaming(
    instructionData,
    accounts,
    logs,
    signature,
    slot,
    txIndex,
    blockTimeUs,
    programId,
    (ev) => listener.onDexEventStreaming(ev)
  );
}

/** 带完整 gRPC 元数据字段的日志解析 */
export function parseLog(
  log: string,
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  eventTypeFilter: EventTypeFilter | undefined,
  isCreatedBuy: boolean,
  recentBlockhash?: Uint8Array
): DexEvent | null {
  return parseLogOptimized(
    log,
    signature,
    slot,
    txIndex,
    blockTimeUs,
    grpcRecvUs,
    eventTypeFilter,
    isCreatedBuy,
    recentBlockhash
  );
}

export { nowUs };
