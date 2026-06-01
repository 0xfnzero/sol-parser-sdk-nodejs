/**
 * ShredStream：外层编译指令 → `parseInstructionUnified`（与 gRPC 指令解析同源）。
 * `ShredWasmTx` 来自线格式交易经 `@solana/web3.js` 反序列化（见 `wire_to_shred_tx.ts`），非 WASM。
 * 有 `ShredStreamConfig.connection` 时可展开 V0 ALT；无 RPC 时用静态账户表 + 默认 pubkey best-effort。
 */
import type { MessageHeader } from "@solana/web3.js";
import { defaultPubkey, type DexEvent } from "../core/dex_event.js";
import { enrichPumpfunSameTxPostMerge } from "../core/pumpfun_fee_enrich.js";
import { eventTypeFilterAllowsInstructionParsing, type EventTypeFilter } from "../grpc/types.js";
import { parseInstructionUnified } from "../instr/mod.js";
import {
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
  messageVersion?: "legacy" | "v0";
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
export function dexEventsFromShredWasmTxWithFullKeys(
  tx: ShredWasmTx,
  fullAccountKeys: string[],
  slot: number,
  txIndex: number,
  grpcRecvUs: number,
  eventTypeFilter?: EventTypeFilter
): DexEvent[] {
  const ixs = tx.instructions;
  if (!ixs?.length || fullAccountKeys.length === 0) return [];
  if (!shouldParseShredInstructions(eventTypeFilter)) return [];

  const out: DexEvent[] = [];

  for (const rawIx of ixs) {
    const pidIdx = rawIx.programIdIndex;
    if (!Number.isFinite(pidIdx) || pidIdx < 0) continue;
    const accBytes = asU8(rawIx.accounts);
    const data = asU8(rawIx.data);
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

  enrichPumpfunSameTxPostMerge(out);
  return out;
}

/** 仅静态账户表（无 RPC 时；V0+ALT 缺失账户以默认 pubkey 占位） */
export function dexEventsFromShredWasmTx(
  tx: ShredWasmTx,
  slot: number,
  txIndex: number,
  grpcRecvUs: number,
  eventTypeFilter?: EventTypeFilter
): DexEvent[] {
  return dexEventsFromShredWasmTxWithFullKeys(tx, tx.accounts, slot, txIndex, grpcRecvUs, eventTypeFilter);
}
