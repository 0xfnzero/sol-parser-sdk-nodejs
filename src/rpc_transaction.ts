/**
 * RPC 交易解析：外层 + 内层指令 → 日志 → `fillAccountsFromTransactionDataRpc` → `fillDataRpc`。
 */
import bs58 from "bs58";
import {
  PublicKey,
  type CompiledInstruction,
  type MessageCompiledInstruction,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import type { Message, MessageV0 } from "@solana/web3.js";
import type { ConfirmedTransactionMeta } from "@solana/web3.js";
import type { DexEvent } from "./core/dex_event.js";
import type { ParseError } from "./core/error.js";
import type { EventTypeFilter } from "./grpc/types.js";
import { fillAccountsFromTransactionDataRpc } from "./core/account_dispatcher_rpc.js";
import { fillDataRpc } from "./core/common_filler_rpc.js";
import {
  accountKeyToBase58,
  buildProgramInvokesMap,
  decodeIxData,
  getAccountKeyResolver,
  isCompiledVersionedMessage,
} from "./core/rpc_invoke_map.js";
import { parseInstructionUnified } from "./instr/mod.js";
import { parseLogOptimized } from "./logs/optimized_matcher.js";

const DEFAULT_PK = PublicKey.default.toBase58();

function resolveAccounts(
  resolver: { get(i: number): PublicKey | undefined; length: number },
  indices: readonly number[] | Uint8Array
): string[] {
  const idxs = indices instanceof Uint8Array ? Array.from(indices) : indices;
  return idxs.map((i) => accountKeyToBase58(resolver.get(i)) ?? DEFAULT_PK);
}

function parseOuterAndInnerInstructions(
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  filter: EventTypeFilter | undefined,
  events: DexEvent[]
): void {
  const resolver = getAccountKeyResolver(message, meta);

  for (const ix of message.compiledInstructions as MessageCompiledInstruction[]) {
    const programId = accountKeyToBase58(resolver.get(ix.programIdIndex));
    if (!programId) continue;
    const data = decodeIxData(ix.data);
    const accounts = resolveAccounts(resolver, ix.accountKeyIndexes);
    const ev = parseInstructionUnified(
      data,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs,
      filter,
      programId
    );
    if (ev) events.push(ev);
  }

  const innerGroups = meta?.innerInstructions;
  if (!innerGroups) return;

  for (const group of innerGroups) {
    for (const ix of group.instructions as CompiledInstruction[]) {
      const programId = accountKeyToBase58(resolver.get(ix.programIdIndex));
      if (!programId) continue;
      const data = decodeIxData(ix.data);
      const accounts = resolveAccounts(resolver, ix.accounts);
      const ev = parseInstructionUnified(
        data,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs,
        filter,
        programId
      );
      if (ev) events.push(ev);
    }
  }
}

function recentBlockhashBytes(recentBlockhash: string): Uint8Array | undefined {
  try {
    return Uint8Array.from(bs58.decode(recentBlockhash));
  } catch {
    return undefined;
  }
}

function applyRpcFills(
  events: DexEvent[],
  msg: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null
): void {
  const resolver = getAccountKeyResolver(msg, meta);
  const programInvokes = buildProgramInvokesMap(msg, meta, resolver);
  for (const ev of events) {
    fillAccountsFromTransactionDataRpc(ev, msg, meta, programInvokes, resolver);
    fillDataRpc(ev, msg, meta, programInvokes);
  }
}

/**
 * 与 Rust gRPC `parse_logs` 中 `fill_accounts_from_transaction_data` + `fill_data` 对齐：
 * 对已由日志解析出的 `DexEvent` 用交易 message + meta 补全账户等字段。
 */
export function applyAccountFillsToLogEvents(
  events: DexEvent[],
  msg: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null
): void {
  applyRpcFills(events, msg, meta);
}

/**
 * 解析已获取的 `VersionedTransactionResponse`（顺序：指令 → 日志 → 账户/数据填充）。
 */
export function parseRpcTransaction(
  tx: VersionedTransactionResponse,
  signature: string,
  filter?: EventTypeFilter,
  options?: { grpcRecvUs?: number }
): { ok: true; events: DexEvent[] } | { ok: false; error: ParseError } {
  const msg = tx.transaction?.message;
  if (!msg || !isCompiledVersionedMessage(msg)) {
    return {
      ok: false,
      error: {
        kind: "ConversionError",
        message:
          "交易 message 非编译形态（例如使用了 jsonParsed）。请使用默认/非 parsed 的 getTransaction 响应。",
      },
    };
  }

  const meta = tx.meta ?? null;
  const slot = tx.slot;
  const blockTimeUs = tx.blockTime != null ? tx.blockTime * 1_000_000 : undefined;
  const grpcRecvUs = options?.grpcRecvUs ?? Math.floor(Date.now() * 1000);
  const rb = recentBlockhashBytes(msg.recentBlockhash);

  const events: DexEvent[] = [];

  parseOuterAndInnerInstructions(
    msg,
    meta,
    signature,
    slot,
    0,
    blockTimeUs,
    grpcRecvUs,
    filter,
    events
  );

  let isCreatedBuy = false;
  for (const log of meta?.logMessages ?? []) {
    const e = parseLogOptimized(
      log,
      signature,
      slot,
      0,
      blockTimeUs,
      grpcRecvUs,
      filter,
      isCreatedBuy,
      rb
    );
    if (e) {
      if ("PumpFunCreate" in e || "PumpFunCreateV2" in e) isCreatedBuy = true;
      events.push(e);
    }
  }

  applyRpcFills(events, msg, meta);

  return { ok: true, events };
}

export { fillAccountsFromTransactionDataRpc } from "./core/account_dispatcher_rpc.js";
export { fillDataRpc } from "./core/common_filler_rpc.js";
