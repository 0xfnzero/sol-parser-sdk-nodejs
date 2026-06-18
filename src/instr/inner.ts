import type { DexEvent } from "../core/dex_event.js";
import { makeMetadata } from "../core/metadata.js";
import type { EventTypeFilter } from "../grpc/types.js";
import {
  eventTypeFilterIncludesMeteoraDammV2,
  eventTypeFilterIncludesMeteoraDlmm,
  eventTypeFilterIncludesMeteoraPools,
  eventTypeFilterIncludesOrcaWhirlpool,
  eventTypeFilterIncludesPumpFees,
  eventTypeFilterIncludesPumpfun,
  eventTypeFilterIncludesPumpswap,
  eventTypeFilterIncludesRaydiumAmmV4,
  eventTypeFilterIncludesRaydiumClmm,
  eventTypeFilterIncludesRaydiumCpmm,
  eventTypeFilterIncludesRaydiumLaunchlab,
  eventTypeFilterNormalizeDexEvent,
  eventTypeFilterShouldIncludeDexEvent,
} from "../grpc/types.js";
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
} from "../grpc/program_ids.js";
import {
  parseCreateFeeSharingConfigFromData,
  parseInitializeFeeConfigFromData,
  parseResetFeeSharingConfigFromData,
  parseRevokeFeeSharingAuthorityFromData,
  parseTransferFeeSharingAuthorityFromData,
  parseUpdateAdminFromData,
  parseUpdateFeeConfigFromData,
  parseUpdateFeeSharesFromData,
  parseUpsertFeeTiersFromData,
} from "../logs/pump_fees.js";
import { parseCreateFromData, parseMigrateFromData, parseTradeFromData } from "../logs/pump.js";
import {
  parseAddLiquidityFromData as parsePumpswapAddLiquidity,
  parseBuyFromData as parsePumpswapBuy,
  parseCreatePoolFromData as parsePumpswapCreatePool,
  parseRemoveLiquidityFromData as parsePumpswapRemoveLiquidity,
  parseSellFromData as parsePumpswapSell,
} from "../logs/pump_amm.js";
import {
  parseCollectPersonalFeeFromData,
  parseCollectProtocolFeeFromData,
  parseConfigChangeFromData,
  parseCreatePoolFromData as parseClmmCreatePool,
  parseCreatePersonalPositionFromData,
  parseDecreaseLimitOrderFromData,
  parseDecreaseLiquidityFromData,
  parseIncreaseLimitOrderFromData,
  parseIncreaseLiquidityFromData,
  parseLiquidityCalculateFromData,
  parseLiquidityChangeFromData,
  parseOpenLimitOrderFromData,
  parseSettleLimitOrderFromData,
  parseSwapFromData as parseClmmSwap,
  parseUpdateRewardInfosFromData,
} from "../logs/raydium_clmm.js";
import {
  parseCreatePoolFromData as parseCpmmCreatePool,
  parseDepositFromData as parseCpmmDeposit,
  parseSwapBaseInFromData as parseCpmmSwapBaseIn,
  parseSwapBaseOutFromData as parseCpmmSwapBaseOut,
  parseWithdrawFromData as parseCpmmWithdraw,
} from "../logs/raydium_cpmm.js";
import {
  parseDepositFromData as parseAmmDeposit,
  parseInitialize2FromData as parseAmmInitialize2,
  parseSwapBaseInFromData as parseAmmSwapBaseIn,
  parseSwapBaseOutFromData as parseAmmSwapBaseOut,
  parseWithdrawFromData as parseAmmWithdraw,
  parseWithdrawPnlFromData as parseAmmWithdrawPnl,
} from "../logs/raydium_amm.js";
import {
  parseLiquidityDecreasedFromData as parseOrcaLiquidityDecreased,
  parseLiquidityIncreasedFromData as parseOrcaLiquidityIncreased,
  parsePoolInitializedFromData as parseOrcaPoolInitialized,
  parseTradedFromData as parseOrcaTraded,
} from "../logs/orca.js";
import {
  parseAddLiquidityFromData as parseMeteoraPoolsAddLiquidity,
  parseBootstrapLiquidityFromData as parseMeteoraPoolsBootstrapLiquidity,
  parsePoolCreatedFromData as parseMeteoraPoolsPoolCreated,
  parseRemoveLiquidityFromData as parseMeteoraPoolsRemoveLiquidity,
  parseSetPoolFeesFromData as parseMeteoraPoolsSetPoolFees,
  parseSwapFromData as parseMeteoraPoolsSwap,
} from "../logs/meteora_amm.js";
import { parseDlmmFromDecoded } from "../logs/meteora_dlmm.js";
import {
  parseRaydiumLaunchlabPoolCreateFromData,
  parseRaydiumLaunchlabTradeFromData,
} from "../logs/raydium_launchlab.js";
import { parseMeteoraDammInstruction } from "./meteora_damm_ix.js";
import { parseInstructionUnified } from "./mod.js";
import { readU64LE } from "../util/binary.js";

const EVENT_CPI_PREFIX = [228, 69, 165, 46, 81, 203, 154, 29] as const;
const EVENT_CPI_SUFFIX = [155, 167, 108, 32, 122, 76, 173, 64] as const;

function disc8(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

function bytesEq(data: Uint8Array, offset: number, bytes: readonly number[]): boolean {
  if (offset + bytes.length > data.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (data[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function discEq(data: Uint8Array, disc: readonly number[]): boolean {
  return bytesEq(data, 0, disc);
}

function discTailEq(data: Uint8Array, disc: readonly number[]): boolean {
  return bytesEq(data, 8, disc);
}

function filterDexEvent(ev: DexEvent | null, filter?: EventTypeFilter): DexEvent | null {
  if (!ev || !filter) return ev;
  return eventTypeFilterShouldIncludeDexEvent(filter, ev)
    ? eventTypeFilterNormalizeDexEvent(filter, ev)
    : null;
}

function pumpFeesEventDisc(disc: Uint8Array): bigint | null {
  if (bytesEq(disc, 0, EVENT_CPI_PREFIX)) return readU64LE(disc, 8);
  if (bytesEq(disc, 8, EVENT_CPI_SUFFIX)) return readU64LE(disc, 0);
  return null;
}

const LOG = {
  PUMPFUN_CREATE: [27, 114, 169, 77, 222, 235, 99, 118],
  PUMPFUN_TRADE: [189, 219, 127, 211, 78, 230, 97, 238],
  PUMPFUN_MIGRATE: [189, 233, 93, 185, 92, 148, 234, 148],
  PUMPSWAP_BUY: [103, 244, 82, 31, 44, 245, 119, 119],
  PUMPSWAP_SELL: [62, 47, 55, 10, 165, 3, 220, 42],
  PUMPSWAP_CREATE_POOL: [177, 49, 12, 210, 160, 118, 167, 116],
  PUMPSWAP_ADD_LIQUIDITY: [120, 248, 61, 83, 31, 142, 107, 144],
  PUMPSWAP_REMOVE_LIQUIDITY: [22, 9, 133, 26, 160, 44, 71, 192],
  PUMP_FEES_CREATE_FEE_SHARING_CONFIG: [133, 105, 170, 200, 184, 116, 251, 88],
  PUMP_FEES_INITIALIZE_FEE_CONFIG: [89, 138, 244, 230, 10, 56, 226, 126],
  PUMP_FEES_RESET_FEE_SHARING_CONFIG: [203, 204, 151, 226, 120, 55, 214, 243],
  PUMP_FEES_REVOKE_FEE_SHARING_AUTHORITY: [114, 23, 101, 60, 14, 190, 153, 62],
  PUMP_FEES_TRANSFER_FEE_SHARING_AUTHORITY: [124, 143, 198, 245, 77, 184, 8, 236],
  PUMP_FEES_UPDATE_ADMIN: [225, 152, 171, 87, 246, 63, 66, 234],
  PUMP_FEES_UPDATE_FEE_CONFIG: [90, 23, 65, 35, 62, 244, 188, 208],
  PUMP_FEES_UPDATE_FEE_SHARES: [21, 186, 196, 184, 91, 228, 225, 203],
  PUMP_FEES_UPSERT_FEE_TIERS: [171, 89, 169, 187, 122, 186, 33, 204],
  RAYDIUM_CLMM_SWAP: [64, 198, 205, 232, 38, 8, 113, 226],
  RAYDIUM_CLMM_INCREASE_LIQUIDITY: [49, 79, 105, 212, 32, 34, 30, 84],
  RAYDIUM_CLMM_DECREASE_LIQUIDITY: [58, 222, 86, 58, 68, 50, 85, 56],
  RAYDIUM_CLMM_LIQUIDITY_CHANGE: [126, 240, 175, 206, 158, 88, 153, 107],
  RAYDIUM_CLMM_CONFIG_CHANGE: [247, 189, 7, 119, 106, 112, 95, 151],
  RAYDIUM_CLMM_CREATE_PERSONAL_POSITION: [100, 30, 87, 249, 196, 223, 154, 206],
  RAYDIUM_CLMM_LIQUIDITY_CALCULATE: [237, 112, 148, 230, 57, 84, 180, 162],
  RAYDIUM_CLMM_OPEN_LIMIT_ORDER: [106, 24, 71, 85, 57, 169, 158, 216],
  RAYDIUM_CLMM_INCREASE_LIMIT_ORDER: [11, 120, 13, 204, 199, 87, 19, 200],
  RAYDIUM_CLMM_DECREASE_LIMIT_ORDER: [70, 48, 40, 221, 219, 237, 212, 163],
  RAYDIUM_CLMM_SETTLE_LIMIT_ORDER: [88, 119, 77, 164, 125, 124, 10, 194],
  RAYDIUM_CLMM_UPDATE_REWARD_INFOS: [109, 127, 186, 78, 114, 65, 37, 236],
  RAYDIUM_CLMM_CREATE_POOL: [25, 94, 75, 47, 112, 99, 53, 63],
  RAYDIUM_CLMM_COLLECT_PERSONAL_FEE: [166, 174, 105, 192, 81, 161, 83, 105],
  RAYDIUM_CLMM_COLLECT_PROTOCOL_FEE: [206, 87, 17, 79, 45, 41, 213, 61],
  RAYDIUM_CPMM_SWAP_BASE_IN: [143, 190, 90, 218, 196, 30, 51, 222],
  RAYDIUM_CPMM_SWAP_BASE_OUT: [55, 217, 98, 86, 163, 74, 180, 173],
  RAYDIUM_CPMM_CREATE_POOL: [233, 146, 209, 142, 207, 104, 64, 188],
  RAYDIUM_CPMM_DEPOSIT: [242, 35, 198, 137, 82, 225, 242, 182],
  RAYDIUM_CPMM_WITHDRAW: [183, 18, 70, 156, 148, 109, 161, 34],
  RAYDIUM_AMM_SWAP_BASE_IN: [0, 0, 0, 0, 0, 0, 0, 9],
  RAYDIUM_AMM_SWAP_BASE_OUT: [0, 0, 0, 0, 0, 0, 0, 11],
  RAYDIUM_AMM_DEPOSIT: [0, 0, 0, 0, 0, 0, 0, 3],
  RAYDIUM_AMM_WITHDRAW: [0, 0, 0, 0, 0, 0, 0, 4],
  RAYDIUM_AMM_INITIALIZE2: [0, 0, 0, 0, 0, 0, 0, 1],
  RAYDIUM_AMM_WITHDRAW_PNL: [0, 0, 0, 0, 0, 0, 0, 7],
  ORCA_TRADED: [225, 202, 73, 175, 147, 43, 160, 150],
  ORCA_LIQUIDITY_INCREASED: [30, 7, 144, 181, 102, 254, 155, 161],
  ORCA_LIQUIDITY_DECREASED: [166, 1, 36, 71, 112, 202, 181, 171],
  ORCA_POOL_INITIALIZED: [100, 118, 173, 87, 12, 198, 254, 229],
  METEORA_POOLS_SWAP: [81, 108, 227, 190, 205, 208, 10, 196],
  METEORA_POOLS_ADD_LIQUIDITY: [31, 94, 125, 90, 227, 52, 61, 186],
  METEORA_POOLS_REMOVE_LIQUIDITY: [116, 244, 97, 232, 103, 31, 152, 58],
  METEORA_POOLS_BOOTSTRAP_LIQUIDITY: [121, 127, 38, 136, 92, 55, 14, 247],
  METEORA_POOLS_POOL_CREATED: [202, 44, 41, 88, 104, 220, 157, 82],
  METEORA_POOLS_SET_POOL_FEES: [245, 26, 198, 164, 88, 18, 75, 9],
  METEORA_DAMM_SWAP: [27, 60, 21, 213, 138, 170, 187, 147],
  METEORA_DAMM_SWAP2: [189, 66, 51, 168, 38, 80, 117, 153],
  METEORA_DAMM_ADD_LIQUIDITY: [175, 242, 8, 157, 30, 247, 185, 169],
  METEORA_DAMM_REMOVE_LIQUIDITY: [87, 46, 88, 98, 175, 96, 34, 91],
  METEORA_DAMM_INITIALIZE_POOL: [228, 50, 246, 85, 203, 66, 134, 37],
  METEORA_DAMM_CREATE_POSITION: [156, 15, 119, 198, 29, 181, 221, 55],
  METEORA_DAMM_CLOSE_POSITION: [20, 145, 144, 68, 143, 142, 214, 178],
  METEORA_DLMM_SWAP: [143, 190, 90, 218, 196, 30, 51, 222],
  METEORA_DLMM_ADD_LIQUIDITY: [181, 157, 89, 67, 143, 182, 52, 72],
  METEORA_DLMM_REMOVE_LIQUIDITY: [80, 85, 209, 72, 24, 206, 35, 178],
  METEORA_DLMM_INITIALIZE_POOL: [95, 180, 10, 172, 84, 174, 232, 40],
  METEORA_DLMM_INITIALIZE_BIN_ARRAY: [11, 18, 155, 194, 33, 115, 238, 119],
  METEORA_DLMM_CREATE_POSITION: [123, 233, 11, 43, 146, 180, 97, 119],
  METEORA_DLMM_CLOSE_POSITION: [94, 168, 102, 45, 59, 122, 137, 54],
  METEORA_DLMM_CLAIM_FEE: [152, 70, 208, 111, 104, 91, 44, 1],
  RAYDIUM_LAUNCHLAB_POOL_CREATE: [151, 215, 226, 9, 118, 161, 115, 174],
  RAYDIUM_LAUNCHLAB_TRADE: [189, 219, 127, 211, 78, 230, 97, 238],
} as const;

const IX = {
  PUMPFUN: [
    [24, 30, 200, 40, 5, 28, 7, 119],
    [214, 144, 76, 236, 95, 139, 49, 180],
    [102, 6, 61, 18, 1, 218, 235, 234],
    [51, 230, 133, 164, 1, 127, 131, 173],
    [56, 252, 116, 8, 158, 223, 205, 95],
    [184, 23, 238, 97, 103, 197, 211, 61],
    [194, 171, 28, 70, 104, 77, 91, 47],
    [93, 246, 130, 60, 231, 233, 64, 178],
  ],
  PUMPSWAP: [
    [102, 6, 61, 18, 1, 218, 235, 234],
    [51, 230, 133, 164, 1, 127, 131, 173],
    [233, 146, 209, 142, 207, 104, 64, 188],
    [198, 46, 21, 82, 180, 217, 232, 112],
    [242, 35, 198, 137, 82, 225, 242, 182],
    [183, 18, 70, 156, 148, 109, 161, 34],
  ],
  PUMP_FEES: [
    [195, 78, 86, 76, 111, 52, 251, 213],
    [62, 162, 20, 133, 121, 65, 145, 27],
    [10, 2, 182, 95, 16, 127, 129, 186],
    [169, 245, 17, 209, 94, 91, 248, 128],
    [18, 233, 158, 39, 185, 207, 58, 104],
    [202, 10, 75, 200, 164, 34, 210, 96],
    [161, 176, 40, 213, 60, 184, 179, 228],
    [104, 184, 103, 242, 88, 151, 107, 20],
    [189, 13, 136, 99, 187, 164, 237, 35],
    [111, 251, 49, 6, 78, 78, 106, 18],
    [227, 23, 150, 12, 77, 86, 94, 4],
  ],
  RAYDIUM_LAUNCHLAB: [
    [250, 234, 13, 123, 213, 156, 19, 236],
    [24, 211, 116, 40, 105, 3, 153, 56],
    [149, 39, 222, 155, 211, 124, 152, 26],
    [95, 200, 71, 34, 8, 9, 11, 166],
    [175, 175, 109, 31, 13, 152, 155, 237],
    [67, 153, 175, 39, 218, 16, 38, 32],
    [37, 190, 126, 222, 44, 154, 171, 17],
  ],
  RAYDIUM_CPMM: [
    LOG.RAYDIUM_CPMM_SWAP_BASE_IN,
    LOG.RAYDIUM_CPMM_SWAP_BASE_OUT,
    [175, 175, 109, 31, 13, 152, 155, 237],
    LOG.RAYDIUM_CPMM_DEPOSIT,
    LOG.RAYDIUM_CPMM_WITHDRAW,
  ],
  RAYDIUM_CLMM: [
    [248, 198, 158, 145, 225, 117, 135, 200],
    [43, 4, 237, 11, 26, 201, 30, 98],
    [133, 29, 89, 223, 69, 238, 176, 10],
    [58, 127, 188, 62, 79, 82, 196, 96],
    [233, 146, 209, 142, 207, 104, 64, 188],
    [43, 68, 212, 167, 89, 47, 164, 1],
    [135, 128, 47, 77, 15, 152, 240, 49],
    [77, 184, 74, 214, 112, 86, 241, 199],
    [77, 255, 174, 82, 125, 29, 201, 46],
    [123, 134, 81, 0, 49, 68, 98, 98],
  ],
  ORCA: [
    [248, 198, 158, 145, 225, 117, 135, 200],
    [43, 4, 237, 11, 26, 201, 30, 98],
    [46, 156, 243, 118, 13, 205, 251, 178],
    [160, 38, 208, 111, 104, 91, 44, 1],
    [17, 43, 80, 74, 168, 202, 6, 113],
  ],
  METEORA_POOLS: [
    [248, 198, 158, 145, 225, 117, 135, 200],
    [181, 157, 89, 67, 143, 182, 52, 72],
    [80, 85, 209, 72, 24, 206, 177, 108],
    [95, 180, 10, 172, 84, 174, 232, 40],
  ],
} as const;

function firstByteIn(data: Uint8Array, allowed: readonly number[]): boolean {
  return data.length > 0 && allowed.includes(data[0]!);
}

function headIn(data: Uint8Array, discs: readonly (readonly number[])[]): boolean {
  return discs.some((disc) => discEq(data, disc));
}

function normalInstructionDataMayParse(programId: string, data: Uint8Array): boolean {
  if (data.length === 0) return false;
  if (programId === RAYDIUM_AMM_V4_PROGRAM_ID) return firstByteIn(data, [1, 3, 4, 7, 9, 11]);
  if (programId === METEORA_DLMM_PROGRAM_ID) return firstByteIn(data, [0, 1, 2, 7, 8, 11, 13, 14]);
  if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    return discEq(data, LOG.METEORA_DAMM_INITIALIZE_POOL);
  }
  if (data.length < 8) return false;
  if (programId === PUMPFUN_PROGRAM_ID) return headIn(data, IX.PUMPFUN);
  if (programId === PUMPSWAP_PROGRAM_ID) return headIn(data, IX.PUMPSWAP);
  if (programId === PUMP_FEES_PROGRAM_ID) return headIn(data, IX.PUMP_FEES);
  if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) return headIn(data, IX.RAYDIUM_LAUNCHLAB);
  if (programId === RAYDIUM_CPMM_PROGRAM_ID) return headIn(data, IX.RAYDIUM_CPMM);
  if (programId === RAYDIUM_CLMM_PROGRAM_ID) return headIn(data, IX.RAYDIUM_CLMM);
  if (programId === ORCA_WHIRLPOOL_PROGRAM_ID) return headIn(data, IX.ORCA);
  if (programId === METEORA_POOLS_PROGRAM_ID) return headIn(data, IX.METEORA_POOLS);
  return false;
}

export function parseInnerCompiledInstructionIfSupported(
  data: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  filter: EventTypeFilter | undefined,
  programId: string
): DexEvent | null {
  if (!normalInstructionDataMayParse(programId, data)) return null;
  return parseInstructionUnified(
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
}

function parsePumpFeesInner(disc: Uint8Array, data: Uint8Array, metadata: ReturnType<typeof makeMetadata>): DexEvent | null {
  const eventDisc = pumpFeesEventDisc(disc);
  if (eventDisc === null) return null;
  if (eventDisc === disc8(LOG.PUMP_FEES_CREATE_FEE_SHARING_CONFIG)) {
    return parseCreateFeeSharingConfigFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_INITIALIZE_FEE_CONFIG)) {
    return parseInitializeFeeConfigFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_RESET_FEE_SHARING_CONFIG)) {
    return parseResetFeeSharingConfigFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_REVOKE_FEE_SHARING_AUTHORITY)) {
    return parseRevokeFeeSharingAuthorityFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_TRANSFER_FEE_SHARING_AUTHORITY)) {
    return parseTransferFeeSharingAuthorityFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_UPDATE_ADMIN)) {
    return parseUpdateAdminFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_UPDATE_FEE_CONFIG)) {
    return parseUpdateFeeConfigFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_UPDATE_FEE_SHARES)) {
    return parseUpdateFeeSharesFromData(data, metadata);
  }
  if (eventDisc === disc8(LOG.PUMP_FEES_UPSERT_FEE_TIERS)) {
    return parseUpsertFeeTiersFromData(data, metadata);
  }
  return null;
}

export function parseInnerInstructionUnified(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  filter: EventTypeFilter | undefined,
  programId: string,
  isCreatedBuy = false
): DexEvent | null {
  if (instructionData.length < 16) return null;

  const disc = instructionData.subarray(0, 16);
  const data = instructionData.subarray(16);
  const metadata = makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
  let ev: DexEvent | null = null;

  if (programId === PUMPFUN_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesPumpfun(filter)) return null;
    if (discEq(disc, LOG.PUMPFUN_TRADE) && discTailEq(disc, EVENT_CPI_SUFFIX)) {
      ev = parseTradeFromData(data, metadata, isCreatedBuy);
    } else if (discEq(disc, LOG.PUMPFUN_CREATE) && discTailEq(disc, EVENT_CPI_SUFFIX)) {
      ev = parseCreateFromData(data, metadata);
    } else if (discEq(disc, LOG.PUMPFUN_MIGRATE) && discTailEq(disc, EVENT_CPI_SUFFIX)) {
      ev = parseMigrateFromData(data, metadata);
    }
  } else if (programId === PUMPSWAP_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesPumpswap(filter)) return null;
    if (discEq(disc, EVENT_CPI_PREFIX) && discTailEq(disc, LOG.PUMPSWAP_BUY)) {
      ev = parsePumpswapBuy(data, metadata);
    } else if (discEq(disc, EVENT_CPI_PREFIX) && discTailEq(disc, LOG.PUMPSWAP_SELL)) {
      ev = parsePumpswapSell(data, metadata);
    } else if (discEq(disc, EVENT_CPI_PREFIX) && discTailEq(disc, LOG.PUMPSWAP_CREATE_POOL)) {
      ev = parsePumpswapCreatePool(data, metadata);
    } else if (discEq(disc, EVENT_CPI_PREFIX) && discTailEq(disc, LOG.PUMPSWAP_ADD_LIQUIDITY)) {
      ev = parsePumpswapAddLiquidity(data, metadata);
    } else if (discEq(disc, EVENT_CPI_PREFIX) && discTailEq(disc, LOG.PUMPSWAP_REMOVE_LIQUIDITY)) {
      ev = parsePumpswapRemoveLiquidity(data, metadata);
    }
  } else if (programId === PUMP_FEES_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesPumpFees(filter)) return null;
    ev = parsePumpFeesInner(disc, data, metadata);
  } else if (programId === RAYDIUM_CLMM_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesRaydiumClmm(filter)) return null;
    if (!discTailEq(disc, EVENT_CPI_SUFFIX)) return null;
    if (discEq(disc, LOG.RAYDIUM_CLMM_SWAP)) ev = parseClmmSwap(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_INCREASE_LIQUIDITY)) ev = parseIncreaseLiquidityFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_DECREASE_LIQUIDITY)) ev = parseDecreaseLiquidityFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_LIQUIDITY_CHANGE)) ev = parseLiquidityChangeFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_CONFIG_CHANGE)) ev = parseConfigChangeFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_CREATE_PERSONAL_POSITION)) ev = parseCreatePersonalPositionFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_LIQUIDITY_CALCULATE)) ev = parseLiquidityCalculateFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_OPEN_LIMIT_ORDER)) ev = parseOpenLimitOrderFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_INCREASE_LIMIT_ORDER)) ev = parseIncreaseLimitOrderFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_DECREASE_LIMIT_ORDER)) ev = parseDecreaseLimitOrderFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_SETTLE_LIMIT_ORDER)) ev = parseSettleLimitOrderFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_UPDATE_REWARD_INFOS)) ev = parseUpdateRewardInfosFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_CREATE_POOL)) ev = parseClmmCreatePool(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_COLLECT_PERSONAL_FEE)) ev = parseCollectPersonalFeeFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CLMM_COLLECT_PROTOCOL_FEE)) ev = parseCollectProtocolFeeFromData(data, metadata);
  } else if (programId === RAYDIUM_CPMM_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesRaydiumCpmm(filter)) return null;
    if (!discTailEq(disc, EVENT_CPI_SUFFIX)) return null;
    if (discEq(disc, LOG.RAYDIUM_CPMM_SWAP_BASE_IN)) ev = parseCpmmSwapBaseIn(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CPMM_SWAP_BASE_OUT)) ev = parseCpmmSwapBaseOut(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CPMM_CREATE_POOL)) ev = parseCpmmCreatePool(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CPMM_DEPOSIT)) ev = parseCpmmDeposit(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_CPMM_WITHDRAW)) ev = parseCpmmWithdraw(data, metadata);
  } else if (programId === RAYDIUM_AMM_V4_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesRaydiumAmmV4(filter)) return null;
    if (!discTailEq(disc, EVENT_CPI_SUFFIX)) return null;
    if (discEq(disc, LOG.RAYDIUM_AMM_SWAP_BASE_IN)) ev = parseAmmSwapBaseIn(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_AMM_SWAP_BASE_OUT)) ev = parseAmmSwapBaseOut(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_AMM_DEPOSIT)) ev = parseAmmDeposit(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_AMM_WITHDRAW)) ev = parseAmmWithdraw(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_AMM_INITIALIZE2)) ev = parseAmmInitialize2(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_AMM_WITHDRAW_PNL)) ev = parseAmmWithdrawPnl(data, metadata);
  } else if (programId === ORCA_WHIRLPOOL_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesOrcaWhirlpool(filter)) return null;
    if (!discTailEq(disc, EVENT_CPI_SUFFIX)) return null;
    if (discEq(disc, LOG.ORCA_TRADED)) ev = parseOrcaTraded(data, metadata);
    else if (discEq(disc, LOG.ORCA_LIQUIDITY_INCREASED)) ev = parseOrcaLiquidityIncreased(data, metadata);
    else if (discEq(disc, LOG.ORCA_LIQUIDITY_DECREASED)) ev = parseOrcaLiquidityDecreased(data, metadata);
    else if (discEq(disc, LOG.ORCA_POOL_INITIALIZED)) ev = parseOrcaPoolInitialized(data, metadata);
  } else if (programId === METEORA_POOLS_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesMeteoraPools(filter)) return null;
    if (!discTailEq(disc, EVENT_CPI_SUFFIX)) return null;
    if (discEq(disc, LOG.METEORA_POOLS_SWAP)) ev = parseMeteoraPoolsSwap(data, metadata);
    else if (discEq(disc, LOG.METEORA_POOLS_ADD_LIQUIDITY)) ev = parseMeteoraPoolsAddLiquidity(data, metadata);
    else if (discEq(disc, LOG.METEORA_POOLS_REMOVE_LIQUIDITY)) ev = parseMeteoraPoolsRemoveLiquidity(data, metadata);
    else if (discEq(disc, LOG.METEORA_POOLS_BOOTSTRAP_LIQUIDITY)) ev = parseMeteoraPoolsBootstrapLiquidity(data, metadata);
    else if (discEq(disc, LOG.METEORA_POOLS_POOL_CREATED)) ev = parseMeteoraPoolsPoolCreated(data, metadata);
    else if (discEq(disc, LOG.METEORA_POOLS_SET_POOL_FEES)) ev = parseMeteoraPoolsSetPoolFees(data, metadata);
  } else if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesMeteoraDammV2(filter)) return null;
    if (!discEq(disc, EVENT_CPI_PREFIX)) return null;
    ev = parseMeteoraDammInstruction(
      instructionData,
      accounts,
      signature,
      slot,
      txIndex,
      blockTimeUs,
      grpcRecvUs
    );
  } else if (programId === METEORA_DLMM_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesMeteoraDlmm(filter)) return null;
    if (!discTailEq(disc, EVENT_CPI_SUFFIX)) return null;
    const decoded = new Uint8Array(8 + data.length);
    decoded.set(disc.subarray(0, 8), 0);
    decoded.set(data, 8);
    ev = parseDlmmFromDecoded(decoded, metadata);
  } else if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) {
    if (filter && !eventTypeFilterIncludesRaydiumLaunchlab(filter)) return null;
    if (!discTailEq(disc, EVENT_CPI_SUFFIX)) return null;
    if (discEq(disc, LOG.RAYDIUM_LAUNCHLAB_TRADE)) ev = parseRaydiumLaunchlabTradeFromData(data, metadata);
    else if (discEq(disc, LOG.RAYDIUM_LAUNCHLAB_POOL_CREATE)) {
      ev = parseRaydiumLaunchlabPoolCreateFromData(data, metadata);
    }
  }

  return filterDexEvent(ev, filter);
}
