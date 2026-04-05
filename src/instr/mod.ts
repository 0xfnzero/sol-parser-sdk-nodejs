/**
 * 指令解析统一入口
 */
import type { DexEvent } from "../core/dex_event.js";
import type { EventTypeFilter } from "../grpc/types.js";
import {
  eventTypeFilterAllowsInstructionParsing,
  eventTypeFilterIncludesMeteoraDammV2,
  eventTypeFilterIncludesPumpfun,
  eventTypeFilterIncludesPumpswap,
} from "../grpc/types.js";
import {
  METEORA_DAMM_V2_PROGRAM_ID,
  PUMPFUN_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
} from "./program_ids.js";
import { parsePumpfunInstruction } from "./pumpfun_ix.js";
import { parsePumpswapInstruction } from "./pumpswap_ix.js";
import { parseMeteoraDammInstruction } from "./meteora_damm_ix.js";

export { parsePumpfunInstruction } from "./pumpfun_ix.js";
export { parsePumpswapInstruction } from "./pumpswap_ix.js";
export { parseMeteoraDammInstruction } from "./meteora_damm_ix.js";
export * from "./program_ids.js";

export function parseInstructionUnified(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  eventTypeFilter: EventTypeFilter | undefined,
  programId: string
): DexEvent | null {
  if (instructionData.length === 0) return null;

  if (eventTypeFilter?.include_only) {
    if (!eventTypeFilterAllowsInstructionParsing(eventTypeFilter.include_only)) {
      return null;
    }
  }

  if (programId === PUMPFUN_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesPumpfun(eventTypeFilter)) return null;
    return parsePumpfunInstruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs
    );
  }
  if (programId === PUMPSWAP_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesPumpswap(eventTypeFilter)) return null;
    return parsePumpswapInstruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs
    );
  }
  if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesMeteoraDammV2(eventTypeFilter)) return null;
    return parseMeteoraDammInstruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs
    );
  }

  return null;
}
