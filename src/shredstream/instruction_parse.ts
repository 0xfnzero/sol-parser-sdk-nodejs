import bs58 from "bs58";
import {INFRASTRUCTURE_PROGRAMS} from "../core/raw_instruction.js";
import {makeMetadata} from "../core/metadata.js";
import {allowsPumpRoute, mayParsePumpRoute, parsePumpRoute} from "../instr/pump_routes.js";
/**
 * ShredStream：外层编译指令 → `parseInstructionUnified`（与 gRPC 指令解析同源）。
 * `ShredWasmTx` 来自线格式交易经 `@solana/web3.js` 反序列化（见 `wire_to_shred_tx.ts`），非 WASM。
 * 客户端通过预热 ALT 缓存展开 V0 账户；connection 只供独立刷新使用。
 */
import type { MessageHeader } from "@solana/web3.js";
import { defaultPubkey, metadataForDexEvent, type DexEvent } from "../core/dex_event.js";
import { enrichPumpfunSameTxPostMerge } from "../core/pumpfun_fee_enrich.js";
import { eventTypeFilterAllowsInstructionParsing, type EventTypeFilter } from "../grpc/types.js";
import { parseInstructionUnified } from "../instr/mod.js";
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
} from "../instr/program_ids.js";

export type ShredWasmCompiledIx = {
  programIdIndex: number;
  accounts: Uint8Array;
  data: Uint8Array;
};

export type ShredAddressTableLookup = {
  accountKey: string;
  writableIndexes: Uint8Array;
  readonlyIndexes: Uint8Array;
};

export type ShredWasmTx = {
  signature: string;
  accounts: string[];
  instructions?: ShredWasmCompiledIx[];
  /** 缺省则按仅静态账户处理 */
  messageVersion?: "legacy" | "v0" | "v1";
  header?: MessageHeader;
  recentBlockhash?: Uint8Array;
  addressTableLookups?: ShredAddressTableLookup[];
};

function asU8(b: Uint8Array | number[]): Uint8Array {
  if (b instanceof Uint8Array) return b;
  return Uint8Array.from(b);
}

const UNKNOWN_PROGRAM_CANDIDATES = [
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
] as const;

const SHRED_DEFAULT_PUBKEY = defaultPubkey();

function shouldParseShredInstructions(eventTypeFilter?: EventTypeFilter): boolean {
  const includeOnly = eventTypeFilter?.include_only;
  return !includeOnly || eventTypeFilterAllowsInstructionParsing(includeOnly);
}

function ixAccountStrings(fullAccountKeys: string[], accBytes: Uint8Array): string[] {
  const accountStrs: string[] = [];
  for (let i = 0; i < accBytes.length; i++) {
    const ai = accBytes[i]!;
    accountStrs.push(ai < fullAccountKeys.length ? fullAccountKeys[ai]! : SHRED_DEFAULT_PUBKEY);
  }
  return accountStrs;
}

/**
 * 使用已解析的完整账户表（静态+ALT）解析外层指令。
 */
function parseShredKeys(
  tx: ShredWasmTx,
  fullAccountKeys: string[],
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  grpcRecvUs: number | bigint | string,
  eventTypeFilter?: EventTypeFilter,
  bestEffort = false
): DexEvent[] {
  const ixs = tx.instructions;
  if (!ixs?.length || fullAccountKeys.length === 0) return [];
  if (!shouldParseShredInstructions(eventTypeFilter)) return [];

  const out: DexEvent[] = [];

  for (const [instructionIndex, rawIx] of ixs.entries()) {
    const pidIdx = rawIx.programIdIndex;
    if (!Number.isInteger(pidIdx) || pidIdx < 0) continue;
    const accBytes = asU8(rawIx.accounts);
    const data = asU8(rawIx.data);
    const resolved = pidIdx < fullAccountKeys.length && accBytes.every(i => i < fullAccountKeys.length);
    const pid = fullAccountKeys[pidIdx];
    const unknown = pid && !UNKNOWN_PROGRAM_CANDIDATES.some(p => p === pid) && !INFRASTRUCTURE_PROGRAMS.has(pid);
    const explicitRaw = eventTypeFilter?.include_only?.includes("RawInstruction");
    if (pid && (unknown || explicitRaw) && (!eventTypeFilter || eventTypeFilter.shouldInclude("RawInstruction"))) {
      out.push({RawInstruction: {
        metadata: makeMetadata(tx.signature, slot, txIndex, undefined, grpcRecvUs),
        program_id: pid, instruction_index: instructionIndex,
        accounts: Array.from(accBytes, i => fullAccountKeys[i] ?? null),
        account_indices: Array.from(accBytes), instruction_data: Array.from(data),
      }});
    }
    if (unknown) continue;
    if (!resolved && !bestEffort) continue;
    if (pid && mayParsePumpRoute(pid, data)) {
      if (resolved && allowsPumpRoute(eventTypeFilter, pid)) {
        const metadata = makeMetadata(tx.signature, slot, txIndex, undefined, grpcRecvUs);
        const intent = parsePumpRoute(pid, data, Array.from(accBytes, i => fullAccountKeys[i]!), metadata, instructionIndex, eventTypeFilter);
        if (intent) out.push({PumpRouteIntent: intent});
      }
      continue;
    }
    const accountStrs = ixAccountStrings(fullAccountKeys, accBytes);

    if (pidIdx >= fullAccountKeys.length) {
      for (const programId of UNKNOWN_PROGRAM_CANDIDATES) {
        const ev = parseInstructionUnified(
          data,
          accountStrs,
          tx.signature,
          slot,
          txIndex,
          undefined,
          grpcRecvUs,
          eventTypeFilter,
          programId
        );
        if (ev) {
          out.push(ev);
          break;
        }
      }
      continue;
    }

    const programId = fullAccountKeys[pidIdx]!;
    const ev = parseInstructionUnified(
      data,
      accountStrs,
      tx.signature,
      slot,
      txIndex,
      undefined,
      grpcRecvUs,
      eventTypeFilter,
      programId
    );
    if (ev) out.push(ev);
  }

  if (tx.recentBlockhash && out.length) {
    const recentBlockhash=bs58.encode(tx.recentBlockhash);
    for (const event of out) {
      const metadata = metadataForDexEvent(event);
      if (metadata) metadata.recent_blockhash = recentBlockhash;
    }
  }
  enrichPumpfunSameTxPostMerge(out);
  return out;
}

/** 仅静态账户表（无 RPC；跳过未解析账户的指令） */
export function dexEventsFromShredWasmTx(
  tx: ShredWasmTx,
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  grpcRecvUs: number | bigint | string,
  eventTypeFilter?: EventTypeFilter
): DexEvent[] {
  return parseShredKeys(tx, tx.accounts, slot, txIndex, grpcRecvUs, eventTypeFilter);
}

/** Full-key entry point rejects inconsistent ALT counts and indices before emitting anything. */
export function dexEventsFromShredWasmTxWithFullKeys(tx: ShredWasmTx, keys: string[], slot: number|bigint|string,
  txIndex:number|bigint|string, recvUs:number|bigint|string, filter?:EventTypeFilter):DexEvent[] {
  const loaded = (tx.addressTableLookups ?? []).reduce((n,l) => n + l.writableIndexes.length + l.readonlyIndexes.length,0);
  if (keys.length !== tx.accounts.length + loaded || tx.accounts.some((k,i) => keys[i] !== k)
      || tx.instructions?.some(ix => !Number.isInteger(ix.programIdIndex) || ix.programIdIndex < 0 || ix.programIdIndex >= keys.length || ix.accounts.some(i => i >= keys.length)))
    throw new RangeError('Inconsistent ALT keys or instruction index');
  return parseShredKeys(tx,keys,slot,txIndex,recvUs,filter);
}
/** Explicit legacy placeholder/discriminator fallback; route adapters always require resolved keys. */
export function dexEventsFromShredWasmTxBestEffort(tx:ShredWasmTx,slot:number|bigint|string,txIndex:number|bigint|string,recvUs:number|bigint|string,filter?:EventTypeFilter):DexEvent[] {
  return parseShredKeys(tx,tx.accounts,slot,txIndex,recvUs,filter,true);
}
/** Separate writable/readonly validation avoids ambiguous counts between the two classes. */
export function dexEventsFromShredWasmTxWithLoadedAddresses(tx:ShredWasmTx,writable:readonly string[],readonly:readonly string[],slot:number|bigint|string,txIndex:number|bigint|string,recvUs:number|bigint|string,filter?:EventTypeFilter):DexEvent[] {
  const lookups=tx.addressTableLookups??[];
  if(writable.length!==lookups.reduce((n,l)=>n+l.writableIndexes.length,0)||readonly.length!==lookups.reduce((n,l)=>n+l.readonlyIndexes.length,0))throw new RangeError('ALT address counts do not match transaction');
  return dexEventsFromShredWasmTxWithFullKeys(tx,[...tx.accounts,...writable,...readonly],slot,txIndex,recvUs,filter);
}
