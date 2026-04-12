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
  eventTypeFilterIncludesRaydiumClmm,
  eventTypeFilterIncludesRaydiumCpmm,
  eventTypeFilterIncludesRaydiumAmmV4,
  eventTypeFilterIncludesOrcaWhirlpool,
  eventTypeFilterIncludesBonk,
} from "../grpc/types.js";
import {
  BONK_PROGRAM_ID,
  BONK_LAUNCHPAD_PROGRAM_ID,
  BONK_PROGRAM_ID_LEGACY,
  METEORA_DAMM_V2_PROGRAM_ID,
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
import { parseRaydiumClmmInstruction } from "./raydium_clmm_ix.js";
import { parseRaydiumCpmmInstruction } from "./raydium_cpmm_ix.js";
import { parseRaydiumAmmV4Instruction } from "./raydium_amm_v4_ix.js";
import { parseOrcaWhirlpoolInstruction } from "./orca_whirlpool_ix.js";
import { parseBonkInstruction } from "./bonk_ix.js";

function isBonkProgram(programId: string): boolean {
  return (
    programId === BONK_PROGRAM_ID ||
    programId === BONK_LAUNCHPAD_PROGRAM_ID ||
    programId === BONK_PROGRAM_ID_LEGACY
  );
}

export { parsePumpfunInstruction } from "./pumpfun_ix.js";
export { parsePumpswapInstruction } from "./pumpswap_ix.js";
export { parseMeteoraDammInstruction } from "./meteora_damm_ix.js";
export { parseRaydiumClmmInstruction } from "./raydium_clmm_ix.js";
export { parseRaydiumCpmmInstruction } from "./raydium_cpmm_ix.js";
export { parseRaydiumAmmV4Instruction } from "./raydium_amm_v4_ix.js";
export { parseOrcaWhirlpoolInstruction } from "./orca_whirlpool_ix.js";
export { parseBonkInstruction } from "./bonk_ix.js";
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
      blockTimeUs,
      grpcRecvUs
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
  if (programId === RAYDIUM_CLMM_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesRaydiumClmm(eventTypeFilter)) return null;
    return parseRaydiumClmmInstruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs
    );
  }
  if (programId === RAYDIUM_CPMM_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesRaydiumCpmm(eventTypeFilter)) return null;
    return parseRaydiumCpmmInstruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs
    );
  }
  if (programId === RAYDIUM_AMM_V4_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesRaydiumAmmV4(eventTypeFilter)) return null;
    return parseRaydiumAmmV4Instruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs
    );
  }
  if (programId === ORCA_WHIRLPOOL_PROGRAM_ID) {
    if (eventTypeFilter && !eventTypeFilterIncludesOrcaWhirlpool(eventTypeFilter)) return null;
    return parseOrcaWhirlpoolInstruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs
    );
  }
  if (isBonkProgram(programId)) {
    if (eventTypeFilter && !eventTypeFilterIncludesBonk(eventTypeFilter)) return null;
    return parseBonkInstruction(
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
