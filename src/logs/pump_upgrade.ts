import type { DexEvent } from "../core/dex_event.js";
import type { EventMetadata } from "../core/metadata.js";
import { readPubkey, readU64LE, readI64LE } from "../util/binary.js";
export interface PumpFunPostCompleteBuyEvent {
  metadata: EventMetadata;
  user: string;
  mint: string;
  bonding_curve: string;
  quote_mint: string;
  timestamp: bigint;
  base_out: bigint;
  quote_in: bigint;
  fee_basis_points: bigint;
  fee: bigint;
  creator_fee_basis_points: bigint;
  creator_fee: bigint;
  buyback_fee: bigint;
  pool_base_reserves_before: bigint;
  pool_quote_reserves_before: bigint;
  pool_base_reserves_after: bigint;
  pool_quote_reserves_after: bigint;
}
export interface PumpFunSweepBondingCurveFeeEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  mint: string;
  bonding_curve: string;
  quote_mint: string;
  recipient: string;
  amount: bigint;
  bucket: number;
}
export interface PumpFunCompleteEvent {
  metadata: EventMetadata;
  user: string;
  mint: string;
  bonding_curve: string;
  timestamp: bigint;
  quote_mint: string;
}
export interface PumpSwapSweepPoolFeeEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  pool: string;
  base_mint: string;
  quote_mint: string;
  recipient: string;
  payer: string;
  amount: bigint;
  bucket: number;
}
export function pumpUpgradeEventType(
  disc: bigint,
  programId?: string,
):
  | "PumpFunPostCompleteBuy"
  | "PumpFunSweepBondingCurveFee"
  | "PumpFunComplete"
  | "PumpSwapSweepPoolFee"
  | null {
  if (
    disc === 18146529233607700591n &&
    (!programId || programId === "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
  )
    return "PumpFunPostCompleteBuy";
  if (
    disc === 3118876958563052404n &&
    (!programId || programId === "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
  )
    return "PumpFunSweepBondingCurveFee";
  if (
    disc === 619296439455019615n &&
    (!programId || programId === "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
  )
    return "PumpFunComplete";
  if (
    disc === 11927646055507993730n &&
    (!programId || programId === "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA")
  )
    return "PumpSwapSweepPoolFee";
  return null;
}
export function parsePumpUpgradeEvent(
  disc: bigint,
  data: Uint8Array,
  metadata: EventMetadata,
  programId?: string,
): DexEvent | null {
  const type = pumpUpgradeEventType(disc, programId);
  if (type === "PumpFunPostCompleteBuy") {
    if (data.length != 224) return null;
    return {
      PumpFunPostCompleteBuy: {
        metadata,
        user: readPubkey(data, 0)!,
        mint: readPubkey(data, 32)!,
        bonding_curve: readPubkey(data, 64)!,
        quote_mint: readPubkey(data, 96)!,
        timestamp: readI64LE(data, 128)!,
        base_out: readU64LE(data, 136)!,
        quote_in: readU64LE(data, 144)!,
        fee_basis_points: readU64LE(data, 152)!,
        fee: readU64LE(data, 160)!,
        creator_fee_basis_points: readU64LE(data, 168)!,
        creator_fee: readU64LE(data, 176)!,
        buyback_fee: readU64LE(data, 184)!,
        pool_base_reserves_before: readU64LE(data, 192)!,
        pool_quote_reserves_before: readU64LE(data, 200)!,
        pool_base_reserves_after: readU64LE(data, 208)!,
        pool_quote_reserves_after: readU64LE(data, 216)!,
      },
    };
  }
  if (type === "PumpFunSweepBondingCurveFee") {
    if (data.length != 145) return null;
    return {
      PumpFunSweepBondingCurveFee: {
        metadata,
        timestamp: readI64LE(data, 0)!,
        mint: readPubkey(data, 8)!,
        bonding_curve: readPubkey(data, 40)!,
        quote_mint: readPubkey(data, 72)!,
        recipient: readPubkey(data, 104)!,
        amount: readU64LE(data, 136)!,
        bucket: data[144]!,
      },
    };
  }
  if (type === "PumpFunComplete") {
    if (data.length != 136 && data.length != 104) return null;
    return {
      PumpFunComplete: {
        metadata,
        user: readPubkey(data, 0)!,
        mint: readPubkey(data, 32)!,
        bonding_curve: readPubkey(data, 64)!,
        timestamp: readI64LE(data, 96)!,
        quote_mint:
          data.length === 104
            ? "So11111111111111111111111111111111111111112"
            : readPubkey(data, 104)!,
      },
    };
  }
  if (type === "PumpSwapSweepPoolFee") {
    if (data.length != 177) return null;
    return {
      PumpSwapSweepPoolFee: {
        metadata,
        timestamp: readI64LE(data, 0)!,
        pool: readPubkey(data, 8)!,
        base_mint: readPubkey(data, 40)!,
        quote_mint: readPubkey(data, 72)!,
        recipient: readPubkey(data, 104)!,
        payer: readPubkey(data, 136)!,
        amount: readU64LE(data, 168)!,
        bucket: data[176]!,
      },
    };
  }
  return null;
}

export interface PumpMultiHopIntent {
  user: string;
  inputAccount: string;
  outputAccount: string;
  amountIn: bigint;
  minAmountOut: bigint;
  hops: {
    baseMint: string;
    quoteMint: string;
    venue: string;
    baseVault: string;
    quoteVault: string;
  }[];
}
/** Intent amounts are limits, not execution. Each hop emits its own actual trade. */
export function decodePumpMultiHopIntent(
  program: string,
  data: Uint8Array,
  accounts: readonly string[],
): PumpMultiHopIntent | null {
  if (
    program !== "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA" ||
    data.length !== 24 ||
    readU64LE(data, 0) !== 10696039120939607083n ||
    accounts.length < 21 ||
    (accounts.length - 16) % 5 !== 0
  )
    return null;
  const amountIn = readU64LE(data, 8)!,
    minAmountOut = readU64LE(data, 16)!;
  if (!amountIn || !minAmountOut) return null;
  const hops: PumpMultiHopIntent["hops"] = [];
  for (let i = 16; i < accounts.length; i += 5)
    hops.push({
      baseMint: accounts[i]!,
      quoteMint: accounts[i + 1]!,
      venue: accounts[i + 2]!,
      baseVault: accounts[i + 3]!,
      quoteVault: accounts[i + 4]!,
    });
  return {
    user: accounts[0]!,
    inputAccount: accounts[1]!,
    outputAccount: accounts[2]!,
    amountIn,
    minAmountOut,
    hops,
  };
}
