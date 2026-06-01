/**
 * 指令解析统一入口
 */
import type { DexEvent } from "../core/dex_event.js";
import type { EventTypeFilter } from "../grpc/types.js";
import {
  eventTypeFilterAllowsInstructionParsing,
  eventTypeFilterIncludesMeteoraDammV2,
  eventTypeFilterIncludesMeteoraDlmm,
  eventTypeFilterIncludesMeteoraPools,
  eventTypeFilterIncludesPumpfun,
  eventTypeFilterIncludesPumpswap,
  eventTypeFilterIncludesRaydiumClmm,
  eventTypeFilterIncludesRaydiumCpmm,
  eventTypeFilterIncludesRaydiumAmmV4,
  eventTypeFilterIncludesOrcaWhirlpool,
  eventTypeFilterIncludesRaydiumLaunchlab,
  eventTypeFilterIncludesPumpFees,
  eventTypeFilterShouldIncludeDexEvent,
} from "../grpc/types.js";
import {
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
  METEORA_POOLS_PROGRAM_ID,
  PUMP_FEES_PROGRAM_ID,
  PUMPFUN_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  ORCA_WHIRLPOOL_PROGRAM_ID,
} from "./program_ids.js";
import { parsePumpfunInstruction } from "./pumpfun_ix.js";
import { parsePumpswapInstruction } from "./pumpswap_ix.js";
import { parseMeteoraDammInstruction } from "./meteora_damm_ix.js";
import { parseMeteoraDlmmInstruction } from "./meteora_dlmm_ix.js";
import { parseMeteoraPoolsInstruction } from "./meteora_pools_ix.js";
import { parseRaydiumClmmInstruction } from "./raydium_clmm_ix.js";
import { parseRaydiumCpmmInstruction } from "./raydium_cpmm_ix.js";
import { parseRaydiumAmmV4Instruction } from "./raydium_amm_v4_ix.js";
import { parseOrcaWhirlpoolInstruction } from "./orca_whirlpool_ix.js";
import { parseRaydiumLaunchlabInstruction } from "./raydium_launchlab_ix.js";
import { parsePumpFeesInstruction } from "./pump_fees_ix.js";

function isRaydiumLaunchlabProgram(programId: string): boolean {
  return programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID;
}

export { parsePumpfunInstruction } from "./pumpfun_ix.js";
export { parsePumpswapInstruction } from "./pumpswap_ix.js";
export { parseMeteoraDammInstruction } from "./meteora_damm_ix.js";
export { parseMeteoraDlmmInstruction } from "./meteora_dlmm_ix.js";
export { parseMeteoraPoolsInstruction } from "./meteora_pools_ix.js";
export { parseRaydiumClmmInstruction } from "./raydium_clmm_ix.js";
export { parseRaydiumCpmmInstruction } from "./raydium_cpmm_ix.js";
export { parseRaydiumAmmV4Instruction } from "./raydium_amm_v4_ix.js";
export { parseOrcaWhirlpoolInstruction } from "./orca_whirlpool_ix.js";
export { parseRaydiumLaunchlabInstruction } from "./raydium_launchlab_ix.js";
export { parsePumpFeesInstruction } from "./pump_fees_ix.js";
export * from "./program_ids.js";

function filterParsedEvent(ev: DexEvent | null, eventTypeFilter?: EventTypeFilter): DexEvent | null {
  if (!ev || !eventTypeFilter) return ev;
  return eventTypeFilterShouldIncludeDexEvent(eventTypeFilter, ev) ? ev : null;
}

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
    return filterParsedEvent(
      parsePumpfunInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === PUMPSWAP_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesPumpswap(eventTypeFilter)) return null;
    return filterParsedEvent(
      parsePumpswapInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesMeteoraDammV2(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseMeteoraDammInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === METEORA_POOLS_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesMeteoraPools(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseMeteoraPoolsInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === METEORA_DLMM_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesMeteoraDlmm(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseMeteoraDlmmInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === PUMP_FEES_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesPumpFees(eventTypeFilter)) return null;
    return filterParsedEvent(
      parsePumpFeesInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === RAYDIUM_CLMM_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesRaydiumClmm(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseRaydiumClmmInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === RAYDIUM_CPMM_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesRaydiumCpmm(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseRaydiumCpmmInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === RAYDIUM_AMM_V4_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesRaydiumAmmV4(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseRaydiumAmmV4Instruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (programId === ORCA_WHIRLPOOL_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesOrcaWhirlpool(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseOrcaWhirlpoolInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }
  if (isRaydiumLaunchlabProgram(programId)) {
    if (eventTypeFilter && !eventTypeFilterIncludesRaydiumLaunchlab(eventTypeFilter)) return null;
    return filterParsedEvent(
      parseRaydiumLaunchlabInstruction(
        instructionData,
        accounts,
        signature,
        slot,
        txIndex,
        blockTimeUs,
        grpcRecvUs
      ),
      eventTypeFilter
    );
  }

  return null;
}
