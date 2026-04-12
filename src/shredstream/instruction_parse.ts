/**
 * ShredStream：外层编译指令 → `parseInstructionUnified`（与 gRPC 指令解析同源）。
 * 完整账户列表需含 V0 ALT 展开，见 `alt_lookup.ts` + `ShredStreamConfig.connection`。
 */
import type { MessageHeader } from "@solana/web3.js";
import type { DexEvent } from "../core/dex_event.js";
import type { EventTypeFilter } from "../grpc/types.js";
import { parseInstructionUnified } from "../instr/mod.js";

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
  /** WASM 新增；缺省则按仅静态账户处理 */
  messageVersion?: "legacy" | "v0";
  header?: MessageHeader;
  recentBlockhash?: Uint8Array;
  addressTableLookups?: ShredAddressTableLookup[];
};

function asU8(b: Uint8Array | number[]): Uint8Array {
  if (b instanceof Uint8Array) return b;
  return Uint8Array.from(b);
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

  const out: DexEvent[] = [];

  for (const rawIx of ixs) {
    const pidIdx = rawIx.programIdIndex;
    if (!Number.isFinite(pidIdx) || pidIdx < 0 || pidIdx >= fullAccountKeys.length) continue;

    const programId = fullAccountKeys[pidIdx]!;
    const accBytes = asU8(rawIx.accounts);
    const data = asU8(rawIx.data);

    const accountStrs: string[] = [];
    let oob = false;
    for (let i = 0; i < accBytes.length; i++) {
      const ai = accBytes[i]!;
      if (ai >= fullAccountKeys.length) {
        oob = true;
        break;
      }
      accountStrs.push(fullAccountKeys[ai]!);
    }
    if (oob) continue;

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

  return out;
}

/** 仅静态账户表（无 RPC 时；V0+ALT 交易多数指令无法解析） */
export function dexEventsFromShredWasmTx(
  tx: ShredWasmTx,
  slot: number,
  txIndex: number,
  grpcRecvUs: number,
  eventTypeFilter?: EventTypeFilter
): DexEvent[] {
  return dexEventsFromShredWasmTxWithFullKeys(tx, tx.accounts, slot, txIndex, grpcRecvUs, eventTypeFilter);
}
