import { exactU64, exactI64 } from "./core/metadata.js";
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
import { eventTypeFilterNormalizeDexEvent } from "./grpc/types.js";
import { fillAccountsFromTransactionDataRpc } from "./core/account_dispatcher_rpc.js";
import { fillDataRpc } from "./core/common_filler_rpc.js";
import { enrichPumpfunSameTxPostMerge } from "./core/pumpfun_fee_enrich.js";
import {
  accountKeyToBase58,
  buildProgramInvokesMap,
  decodeIxData,
  getAccountKeyResolver,
  isCompiledVersionedMessage,
} from "./core/rpc_invoke_map.js";
import { dedupeLogInstructionEvents } from "./grpc/log_instr_dedup.js";
import {
  parseInnerCompiledInstructionIfSupported,
  parseInnerInstructionUnified,
} from "./instr/inner.js";
import { parseInstructionUnified } from "./instr/mod.js";
import {
  METEORA_DBC_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
  METEORA_POOLS_PROGRAM_ID,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PUMP_FEES_PROGRAM_ID,
  PUMPFUN_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
} from "./instr/program_ids.js";
import {
  parseInvokeInfo,
  parseLogOptimizedWithProgramId,
  parseProgramCompleteInfo,
} from "./logs/optimized_matcher.js";

const DEFAULT_PK = PublicKey.default.toBase58();
const PUMPFUN_TRADE_EVENT_NAMES = new Set([
  "PumpFunTrade",
  "PumpFunBuy",
  "PumpFunSell",
  "PumpFunBuyExactSolIn",
]);
type IndexedInstructionEvent = {
  outerIdx: number;
  innerIdx: number | null;
  stackHeight?: number;
  isEventCpi: boolean;
  event: DexEvent;
};

const EVENT_CPI_PREFIX = Uint8Array.from([228, 69, 165, 46, 81, 203, 154, 29]);
const LEGACY_EVENT_CPI_SUFFIX = Uint8Array.from([155, 167, 108, 32, 122, 76, 173, 64]);
const SUPPORTED_INSTRUCTION_PROGRAM_IDS = new Set([
  PUMPFUN_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
  PUMP_FEES_PROGRAM_ID,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  METEORA_POOLS_PROGRAM_ID,
  METEORA_DBC_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
]);

function bytesEqualAt(data: Uint8Array, expected: Uint8Array, offset: number): boolean {
  for (let i = 0; i < expected.length; i++) {
    if (data[offset + i] !== expected[i]) return false;
  }
  return true;
}

function isEventCpi(programId: string, data: Uint8Array): boolean {
  return [METEORA_DLMM_PROGRAM_ID, PUMPFUN_PROGRAM_ID, PUMPSWAP_PROGRAM_ID].includes(programId) && data.length >= 16 && (
    bytesEqualAt(data, EVENT_CPI_PREFIX, 0) ||
    bytesEqualAt(data, LEGACY_EVENT_CPI_SUFFIX, 8)
  );
}

function isDlmmEvent(event: DexEvent): boolean {
  return eventName(event).startsWith("MeteoraDlmm");
}

function eventName(ev: DexEvent): string {
  return Object.keys(ev)[0] ?? "";
}

function eventPayload(ev: DexEvent): Record<string, any> | null {
  const name = eventName(ev);
  return name ? ((ev as any)[name] as Record<string, any>) : null;
}

function isDefaultValue(v: unknown): boolean {
  return v == null || v === "" || v === DEFAULT_PK;
}

function putStringIfSet(to: Record<string, any>, key: string, from: Record<string, any>): void {
  const value = from[key];
  if (!isDefaultValue(value)) to[key] = value;
}

function putNonZero(to: Record<string, any>, key: string, from: Record<string, any>): void {
  const value = from[key];
  if (value !== undefined && value !== 0 && value !== 0n) to[key] = value;
}

function fillStringIfEmpty(to: Record<string, any>, key: string, from: Record<string, any>): void {
  const value = from[key];
  if (isDefaultValue(to[key]) && !isDefaultValue(value)) to[key] = value;
}

function mergePumpfunTradeInstruction(base: Record<string, any>, inner: Record<string, any>): void {
  const leg = inner.sol_amount !== 0n || inner.token_amount !== 0n;

  for (const key of ["mint", "user", "fee_recipient", "creator"]) {
    putStringIfSet(base, key, inner);
  }

  if (leg) {
    for (const key of [
      "sol_amount",
      "token_amount",
      "timestamp",
      "virtual_sol_reserves",
      "virtual_token_reserves",
      "real_sol_reserves",
      "real_token_reserves",
      "fee_basis_points",
      "fee",
      "creator_fee_basis_points",
      "creator_fee",
      "total_unclaimed_tokens",
      "total_claimed_tokens",
      "current_sol_volume",
      "last_update_timestamp",
    ]) {
      base[key] = inner[key];
    }
    base.is_buy = inner.is_buy;
    base.track_volume = Boolean(base.track_volume) || Boolean(inner.track_volume);
    base.mayhem_mode = Boolean(base.mayhem_mode) || Boolean(inner.mayhem_mode);
    if ((base.shareholders?.length ?? 0) === 0 && (inner.shareholders?.length ?? 0) !== 0) {
      base.shareholders = inner.shareholders;
    }
    if ((inner.ix_name ?? "") !== "") base.ix_name = inner.ix_name;
    base.is_cashback_coin = Boolean(base.is_cashback_coin) || Boolean(inner.is_cashback_coin);
  } else {
    for (const key of [
      "fee",
      "creator_fee",
      "fee_basis_points",
      "creator_fee_basis_points",
      "virtual_sol_reserves",
      "virtual_token_reserves",
      "real_sol_reserves",
      "real_token_reserves",
      "total_unclaimed_tokens",
      "total_claimed_tokens",
      "current_sol_volume",
      "timestamp",
      "last_update_timestamp",
    ]) {
      putNonZero(base, key, inner);
    }
    base.track_volume = Boolean(base.track_volume) || Boolean(inner.track_volume);
    base.mayhem_mode = Boolean(base.mayhem_mode) || Boolean(inner.mayhem_mode);
    base.is_cashback_coin = Boolean(base.is_cashback_coin) || Boolean(inner.is_cashback_coin);
    if ((base.shareholders?.length ?? 0) === 0 && (inner.shareholders?.length ?? 0) !== 0) {
      base.shareholders = inner.shareholders;
    }
    if ((inner.ix_name ?? "") !== "") base.ix_name = inner.ix_name;
  }

  for (const key of [
    "cashback_fee_basis_points",
    "cashback",
    "buyback_fee_basis_points",
    "buyback_fee",
    "quote_amount",
    "virtual_quote_reserves",
    "real_quote_reserves",
    "amount",
    "max_sol_cost",
    "min_sol_output",
    "spendable_sol_in",
    "spendable_quote_in",
    "min_tokens_out",
  ]) {
    putNonZero(base, key, inner);
  }

  for (const key of [
    "quote_mint",
    "global",
    "bonding_curve",
    "bonding_curve_v2",
    "associated_bonding_curve",
    "associated_user",
    "system_program",
    "token_program",
    "quote_token_program",
    "associated_token_program",
    "creator_vault",
    "associated_quote_fee_recipient",
    "buyback_fee_recipient",
    "associated_quote_buyback_fee_recipient",
    "associated_quote_bonding_curve",
    "associated_quote_user",
    "associated_creator_vault",
    "sharing_config",
    "event_authority",
    "program",
    "global_volume_accumulator",
    "user_volume_accumulator",
    "associated_user_volume_accumulator",
    "fee_config",
    "fee_program",
  ]) {
    putStringIfSet(base, key, inner);
  }

  if (base.account == null && inner.account != null) base.account = inner.account;
  base.is_created_buy = Boolean(base.is_created_buy) || Boolean(inner.is_created_buy);
}

function mergePumpfunCreateV2Instruction(base: Record<string, any>, inner: Record<string, any>): void {
  for (const key of ["name", "symbol", "uri"]) fillStringIfEmpty(base, key, inner);
  for (const key of [
    "mint",
    "bonding_curve",
    "user",
    "creator",
    "token_program",
    "quote_mint",
    "quote_vault",
    "quote_token_program",
    "mint_authority",
    "associated_bonding_curve",
    "global",
    "system_program",
    "associated_token_program",
    "mayhem_program_id",
    "global_params",
    "sol_vault",
    "mayhem_state",
    "mayhem_token_vault",
    "event_authority",
    "program",
    "observed_fee_recipient",
  ]) {
    putStringIfSet(base, key, inner);
  }
  for (const key of [
    "timestamp",
    "virtual_token_reserves",
    "virtual_sol_reserves",
    "real_token_reserves",
    "token_total_supply",
    "virtual_quote_reserves",
  ]) {
    putNonZero(base, key, inner);
  }
  base.is_mayhem_mode = Boolean(base.is_mayhem_mode) || Boolean(inner.is_mayhem_mode);
  base.is_cashback_enabled = Boolean(base.is_cashback_enabled) || Boolean(inner.is_cashback_enabled);
  if ((inner.ix_name ?? "") !== "") base.ix_name = inner.ix_name;
}

function mergePumpSwapBuySellInstruction(base: Record<string, any>, inner: Record<string, any>): void {
  const ix = { ...base };
  Object.assign(base, inner);
  for (const key of [
    "base_mint",
    "quote_mint",
    "user_base_token_account",
    "user_quote_token_account",
    "pool_base_token_account",
    "pool_quote_token_account",
    "protocol_fee_recipient",
    "protocol_fee_recipient_token_account",
    "coin_creator_vault_ata",
    "coin_creator_vault_authority",
    "base_token_program",
    "quote_token_program",
    "pool_v2",
    "fee_recipient",
    "fee_recipient_quote_token_account",
  ]) {
    fillStringIfEmpty(base, key, ix);
  }
}

function mergeDlmmInstruction(baseName: string, base: Record<string, any>, inner: Record<string, any>): void {
  const context = baseName === "MeteoraDlmmInitializePool"
    ? { creator: base.creator, active_bin_id: base.active_bin_id }
    : baseName === "MeteoraDlmmCreatePosition"
      ? { lower_bin_id: base.lower_bin_id, width: base.width }
      : baseName === "MeteoraDlmmClosePosition"
        ? { pool: base.pool }
        : null;
  Object.assign(base, inner);
  if (context) Object.assign(base, context);
}

function pumpIdentityKeyConflicts(a: unknown, b: unknown): boolean {
  return !isDefaultValue(a) && !isDefaultValue(b) && a !== b;
}

function mergeInstructionEvent(base: DexEvent, inner: DexEvent): boolean {
  const baseName = eventName(base);
  const innerName = eventName(inner);
  const baseData = eventPayload(base);
  const innerData = eventPayload(inner);
  if (!baseData || !innerData) return false;

  if (PUMPFUN_TRADE_EVENT_NAMES.has(baseName) && PUMPFUN_TRADE_EVENT_NAMES.has(innerName)) {
    if (baseData.is_buy !== innerData.is_buy || pumpIdentityKeyConflicts(baseData.mint, innerData.mint) || pumpIdentityKeyConflicts(baseData.user, innerData.user)) return false;
    mergePumpfunTradeInstruction(baseData, innerData);
    return true;
  }

  if (baseName === "PumpFunCreateV2" && innerName === "PumpFunCreateV2") {
    mergePumpfunCreateV2Instruction(baseData, innerData);
    return true;
  }

  if (
    (baseName === "PumpSwapBuy" && innerName === "PumpSwapBuy") ||
    (baseName === "PumpSwapSell" && innerName === "PumpSwapSell")
  ) {
    if (pumpIdentityKeyConflicts(baseData.pool, innerData.pool) || pumpIdentityKeyConflicts(baseData.user, innerData.user)) return false;
    mergePumpSwapBuySellInstruction(baseData, innerData);
    return true;
  }

  if (baseName === innerName) {
    if (baseName.startsWith("MeteoraDlmm")) {
      mergeDlmmInstruction(baseName, baseData, innerData);
    } else {
      Object.assign(baseData, innerData);
    }
    return true;
  }
  return false;
}

function isPumpTrade(event: DexEvent): boolean {
  const name = eventName(event);
  return PUMPFUN_TRADE_EVENT_NAMES.has(name) || name === "PumpSwapBuy" || name === "PumpSwapSell";
}

function mergeInstructionEvents(events: IndexedInstructionEvent[]): DexEvent[] {
  if (events.length === 0) return [];
  events.sort((a, b) => {
    if (a.outerIdx !== b.outerIdx) return a.outerIdx - b.outerIdx;
    const ak = a.innerIdx === null ? 0 : 1 + a.innerIdx;
    const bk = b.innerIdx === null ? 0 : 1 + b.innerIdx;
    return ak - bk;
  });

  const out: DexEvent[] = [];
  let outerTarget: { outerIdx: number; resultIdx: number } | null = null;
  const dlmmTargets: Array<{
    outerIdx: number;
    stackHeight?: number;
    resultIdx: number;
  }> = [];
  const pumpTargets: Array<{outerIdx: number; stackHeight?: number; resultIdx: number; consumed: boolean}> = [];
  for (const item of events) {
    if (item.innerIdx === null) {
      out.push(item.event);
      const resultIdx = out.length - 1;
      outerTarget = { outerIdx: item.outerIdx, resultIdx };
      pumpTargets.length = 0;
      if (isPumpTrade(item.event)) pumpTargets.push({outerIdx: item.outerIdx, stackHeight: item.stackHeight, resultIdx, consumed: false});
      dlmmTargets.length = 0;
      if (isDlmmEvent(item.event)) {
        dlmmTargets.push({
          outerIdx: item.outerIdx,
          stackHeight: item.stackHeight,
          resultIdx,
        });
      }
      continue;
    }

    if (isPumpTrade(item.event) && (item.isEventCpi || !PUMPFUN_TRADE_EVENT_NAMES.has(eventName(item.event)) || eventPayload(item.event)?.ix_name)) {
      if (item.isEventCpi) {
        let target: typeof pumpTargets[number] | undefined;
        for (let i = pumpTargets.length - 1; i >= 0; i--) {
          const candidate = pumpTargets[i]!;
          if (candidate.outerIdx === item.outerIdx && (candidate.stackHeight === undefined || item.stackHeight === undefined || item.stackHeight === candidate.stackHeight + 1)) {
            target = candidate;
            break;
          }
        }
        if (target && !target.consumed) {
          target.consumed = true;
          if (mergeInstructionEvent(out[target.resultIdx]!, item.event)) continue;
        }
        out.push(item.event);
      } else {
        if (item.stackHeight === undefined) pumpTargets.length = 0;
        else while (pumpTargets.length) {
          const last = pumpTargets[pumpTargets.length - 1]!;
          if (last.outerIdx !== item.outerIdx || (last.stackHeight !== undefined && last.stackHeight >= item.stackHeight)) pumpTargets.pop();
          else break;
        }
        out.push(item.event);
        pumpTargets.push({outerIdx: item.outerIdx, stackHeight: item.stackHeight, resultIdx: out.length - 1, consumed: false});
      }
      continue;
    }

    if (item.isEventCpi && isDlmmEvent(item.event)) {
      let merged = false;
      for (let i = dlmmTargets.length - 1; i >= 0; i--) {
        const target = dlmmTargets[i]!;
        const directChild = target.stackHeight === undefined || item.stackHeight === undefined ||
          item.stackHeight === target.stackHeight + 1;
        if (target.outerIdx === item.outerIdx && directChild) {
          dlmmTargets.length = i + 1;
          merged = mergeInstructionEvent(out[target.resultIdx]!, item.event);
          break;
        }
      }
      if (!merged) out.push(item.event);
      continue;
    }

    let resultIdx = -1;
    if (outerTarget && outerTarget.outerIdx === item.outerIdx &&
        mergeInstructionEvent(out[outerTarget.resultIdx]!, item.event)) {
      resultIdx = outerTarget.resultIdx;
    } else {
      out.push(item.event);
      resultIdx = out.length - 1;
    }

    if (isDlmmEvent(item.event)) {
      if (item.stackHeight === undefined) {
        dlmmTargets.length = 0;
      } else {
        while (dlmmTargets.length > 0) {
          const last = dlmmTargets[dlmmTargets.length - 1]!;
          if (last.outerIdx !== item.outerIdx ||
              (last.stackHeight !== undefined && last.stackHeight >= item.stackHeight)) {
            dlmmTargets.pop();
          } else {
            break;
          }
        }
      }
      dlmmTargets.push({
        outerIdx: item.outerIdx,
        stackHeight: item.stackHeight,
        resultIdx,
      });
    }
  }
  return out;
}

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
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  blockTimeUs: number | bigint | string | undefined,
  grpcRecvUs: number | bigint | string,
  filter: EventTypeFilter | undefined,
  isCreatedBuy: boolean,
): DexEvent[] {
  const resolver = getAccountKeyResolver(message, meta);
  const indexedEvents: IndexedInstructionEvent[] = [];

  for (const [outerIdx, ix] of (message.compiledInstructions as MessageCompiledInstruction[]).entries()) {
    const programId = accountKeyToBase58(resolver.get(ix.programIdIndex));
    if (!programId) continue;
    if (!SUPPORTED_INSTRUCTION_PROGRAM_IDS.has(programId)) continue;
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
    if (ev) indexedEvents.push({
      outerIdx,
      innerIdx: null,
      stackHeight: 1,
      isEventCpi: false,
      event: ev,
    });
  }

  const innerGroups = meta?.innerInstructions;
  if (!innerGroups) return mergeInstructionEvents(indexedEvents);

  for (const group of innerGroups) {
    for (const [innerIdx, ix] of (group.instructions as CompiledInstruction[]).entries()) {
      const programId = accountKeyToBase58(resolver.get(ix.programIdIndex));
      if (!programId) continue;
      if (!SUPPORTED_INSTRUCTION_PROGRAM_IDS.has(programId)) continue;
      const data = decodeIxData(ix.data);
      const accounts = resolveAccounts(resolver, ix.accounts);
      const ev =
        parseInnerCompiledInstructionIfSupported(
          data,
          accounts,
          signature,
          slot,
          txIndex,
          blockTimeUs,
          grpcRecvUs,
          filter,
          programId
        ) ??
        parseInnerInstructionUnified(
          data,
          accounts,
          signature,
          slot,
          txIndex,
          blockTimeUs,
          grpcRecvUs,
          filter,
          programId,
          isCreatedBuy
        );
      if (ev) indexedEvents.push({
        outerIdx: group.index,
        innerIdx,
        stackHeight: (ix as CompiledInstruction & { stackHeight?: number }).stackHeight,
        isEventCpi: isEventCpi(programId, data),
        event: ev,
      });
    }
  }

  return mergeInstructionEvents(indexedEvents);
}

function recentBlockhashBytes(recentBlockhash: string): Uint8Array | undefined {
  try {
    return Uint8Array.from(bs58.decode(recentBlockhash));
  } catch {
    return undefined;
  }
}

function detectPumpfunCreateInLogs(
  logMessages: readonly string[],
  signature: string,
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  blockTimeUs: number | bigint | string | undefined,
  grpcRecvUs: number | bigint | string,
  recentBlockhash: Uint8Array | undefined
): boolean {
  const stack: string[] = [];
  for (const log of logMessages) {
    const invoke = parseInvokeInfo(log);
    if (invoke && log === `Program ${invoke.programId} invoke [${invoke.depth}]`) {
      stack.length = Math.min(stack.length, invoke.depth - 1);
      stack.push(invoke.programId);
      continue;
    }
    // The last base64 character of the discriminator also contains payload bits.
    if (stack[stack.length - 1] === PUMPFUN_PROGRAM_ID &&
        log.startsWith("Program data: G3KpTd7rY3")) {
      const encoded = log.slice("Program data: ".length);
      if (Buffer.from(encoded, "base64").toString("base64") === encoded) {
        // Ignore the caller's output filter: a real create still classifies buys
        // when Create events are excluded. Decode only rare create candidates.
        const event = parseLogOptimizedWithProgramId(
          log, signature, slot, txIndex, blockTimeUs, grpcRecvUs,
          undefined, false, recentBlockhash, PUMPFUN_PROGRAM_ID
        );
        if (event && ("PumpFunCreate" in event || "PumpFunCreateV2" in event)) return true;
      }
    }
    const completed = parseProgramCompleteInfo(log);
    if (completed && (log === `Program ${completed} success` ||
        log.startsWith(`Program ${completed} failed: `))) {
      const index = stack.lastIndexOf(completed);
      if (index >= 0) stack.length = index;
    }
  }
  return false;
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

function setRecentBlockhash(events: DexEvent[], recentBlockhash: string | undefined): void {
  if (!recentBlockhash) return;
  for (const ev of events) {
    const data = eventPayload(ev);
    if (data?.metadata) data.metadata.recent_blockhash = recentBlockhash;
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
  enrichPumpfunSameTxPostMerge(events);
}

/**
 * 解析已获取的 `VersionedTransactionResponse`（顺序：指令 → 日志 → 账户/数据填充）。
 */
export function parseRpcTransaction(
  tx: VersionedTransactionResponse,
  signature: string,
  filter?: EventTypeFilter,
  options?: { slot?: bigint | string | number; grpcRecvUs?: bigint | string | number; txIndex?: bigint | string | number; blockTimeUs?: bigint | string | number }
): { ok: true; events: DexEvent[] } | { ok: false; error: ParseError } {
  // Failed transactions roll back every instruction, including earlier create logs.
  if (tx.meta?.err != null) return { ok: true, events: [] };
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
  const slot = exactU64(options?.slot ?? tx.slot, "slot");
  const blockTimeUs =
    options?.blockTimeUs ?? (tx.blockTime != null ? exactI64(tx.blockTime) * 1_000_000n : undefined);
  const grpcRecvUs = options?.grpcRecvUs ?? Math.floor(Date.now() * 1000);
  const txIndex = options?.txIndex ?? 0;
  const rb = recentBlockhashBytes(msg.recentBlockhash);
  const hasPumpfunCreateLog = detectPumpfunCreateInLogs(
    meta?.logMessages ?? [],
    signature,
    slot,
    txIndex,
    blockTimeUs,
    grpcRecvUs,
    rb
  );

  const instructionEvents = parseOuterAndInnerInstructions(
    msg,
    meta,
    signature,
    slot,
    txIndex,
    blockTimeUs,
    grpcRecvUs,
    filter,
    hasPumpfunCreateLog
  );
  setRecentBlockhash(instructionEvents, msg.recentBlockhash);

  const logEvents: DexEvent[] = [];
  const activeProgramStack: string[] = [];
  for (const log of meta?.logMessages ?? []) {
    const invoke = parseInvokeInfo(log);
    if (invoke) {
      activeProgramStack.length = Math.max(0, invoke.depth - 1);
      activeProgramStack.push(invoke.programId);
    }

    const e = parseLogOptimizedWithProgramId(
      log,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs,
      filter,
      hasPumpfunCreateLog,
      rb,
      activeProgramStack[activeProgramStack.length - 1]
    );
    if (e) {
      logEvents.push(e);
    }

    const completed = parseProgramCompleteInfo(log);
    if (completed) {
      const idx = activeProgramStack.lastIndexOf(completed);
      if (idx >= 0) activeProgramStack.length = idx;
    }
  }

  applyRpcFills([...instructionEvents, ...logEvents], msg, meta);
  const events = dedupeLogInstructionEvents(logEvents, instructionEvents);
  enrichPumpfunSameTxPostMerge(events);

  return {
    ok: true,
    events: filter ? events.map((event) => eventTypeFilterNormalizeDexEvent(filter, event)) : events,
  };
}

export { fillAccountsFromTransactionDataRpc } from "./core/account_dispatcher_rpc.js";
export { fillDataRpc } from "./core/common_filler_rpc.js";
