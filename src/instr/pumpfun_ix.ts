/**
 * PumpFun 指令解析
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import type { EventMetadata } from "../core/metadata.js";
import { getAccount, ixMeta, readBool, readBorshStrAt, readPubkeyIx, readU64LE } from "./utils.js";
import { readI64LE } from "../util/binary.js";

const Z = defaultPubkey();
export const PUMPFUN_SOL_QUOTE_MINT = "So11111111111111111111111111111111111111111";

const DISC = {
  BUY: Uint8Array.from([102, 6, 61, 18, 1, 218, 235, 234]),
  SELL: Uint8Array.from([51, 230, 133, 164, 1, 127, 131, 173]),
  CREATE: Uint8Array.from([24, 30, 200, 40, 5, 28, 7, 119]),
  CREATE_V2: Uint8Array.from([214, 144, 76, 236, 95, 139, 49, 180]),
  BUY_EXACT_SOL_IN: Uint8Array.from([56, 252, 116, 8, 158, 223, 205, 95]),
  BUY_V2: Uint8Array.from([184, 23, 238, 97, 103, 197, 211, 61]),
  SELL_V2: Uint8Array.from([93, 246, 130, 60, 231, 233, 64, 178]),
  BUY_EXACT_QUOTE_IN_V2: Uint8Array.from([194, 171, 28, 70, 104, 77, 91, 47]),
  MIGRATE_EVENT_LOG: Uint8Array.from([189, 233, 93, 185, 92, 148, 234, 148]),
};

function discEq(data: Uint8Array, disc: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) if (data[i] !== disc[i]) return false;
  return true;
}

function createNumericDefaults() {
  return {
    timestamp: 0n,
    virtual_token_reserves: 0n,
    virtual_sol_reserves: 0n,
    real_token_reserves: 0n,
    token_total_supply: 0n,
    is_mayhem_mode: false,
    is_cashback_enabled: false,
    quote_mint: PUMPFUN_SOL_QUOTE_MINT,
    virtual_quote_reserves: 0n,
  };
}

function parsePumpfunTradeV2Instruction(
  ixName: "buy_v2" | "sell_v2" | "buy_exact_quote_in_v2",
  data: Uint8Array,
  accounts: string[],
  metadata: EventMetadata
): DexEvent | null {
  if (!accounts[1]) return null;
  const normalizedIxName =
    ixName === "buy_v2" ? "buy" : ixName === "sell_v2" ? "sell" : "buy_exact_quote_in";

  const first = data.length >= 8 ? readU64LE(data, 0) ?? 0n : 0n;
  const second = data.length >= 16 ? readU64LE(data, 8) ?? 0n : 0n;
  const tokenAmount = ixName === "buy_exact_quote_in_v2" ? second : first;
  const solAmount = ixName === "buy_exact_quote_in_v2" ? first : second;

  const trade = {
    metadata,
    mint: accounts[1] ?? Z,
    quote_mint: accounts[2] ?? Z,
    global: accounts[0] ?? Z,
    bonding_curve: accounts[10] ?? Z,
    bonding_curve_v2: Z,
    user: accounts[13] ?? Z,
    sol_amount: solAmount,
    token_amount: tokenAmount,
    amount: ixName === "buy_exact_quote_in_v2" ? second : first,
    max_sol_cost: ixName === "buy_exact_quote_in_v2" ? 0n : ixName === "sell_v2" ? 0n : second,
    min_sol_output: ixName === "sell_v2" ? second : 0n,
    spendable_sol_in: 0n,
    spendable_quote_in: ixName === "buy_exact_quote_in_v2" ? first : 0n,
    min_tokens_out: ixName === "buy_exact_quote_in_v2" ? second : 0n,
    quote_amount: ixName === "buy_exact_quote_in_v2" ? first : 0n,
    fee_recipient: accounts[6] ?? Z,
    is_buy: ixName !== "sell_v2",
    is_created_buy: false,
    timestamp: 0n,
    virtual_sol_reserves: 0n,
    virtual_token_reserves: 0n,
    real_sol_reserves: 0n,
    real_token_reserves: 0n,
    fee_basis_points: 0n,
    fee: 0n,
    creator: Z,
    creator_fee_basis_points: 0n,
    creator_fee: 0n,
    track_volume: false,
    total_unclaimed_tokens: 0n,
    total_claimed_tokens: 0n,
    current_sol_volume: 0n,
    last_update_timestamp: 0n,
    ix_name: normalizedIxName,
    mayhem_mode: false,
    cashback_fee_basis_points: 0n,
    cashback: 0n,
    is_cashback_coin: false,
    associated_bonding_curve: accounts[11] ?? Z,
    associated_user: accounts[14] ?? Z,
    system_program: accounts[ixName === "sell_v2" ? 23 : 24] ?? Z,
    token_program: accounts[3] ?? Z,
    quote_token_program: accounts[4] ?? Z,
    associated_token_program: accounts[5] ?? Z,
    creator_vault: accounts[16] ?? Z,
    associated_quote_fee_recipient: accounts[7] ?? Z,
    buyback_fee_recipient: accounts[8] ?? Z,
    associated_quote_buyback_fee_recipient: accounts[9] ?? Z,
    associated_quote_bonding_curve: accounts[12] ?? Z,
    associated_quote_user: accounts[15] ?? Z,
    associated_creator_vault: accounts[17] ?? Z,
    sharing_config: accounts[18] ?? Z,
    event_authority: accounts[ixName === "sell_v2" ? 24 : 25] ?? Z,
    program: accounts[ixName === "sell_v2" ? 25 : 26] ?? Z,
    global_volume_accumulator: ixName === "sell_v2" ? Z : accounts[19] ?? Z,
    user_volume_accumulator: accounts[ixName === "sell_v2" ? 19 : 20] ?? Z,
    associated_user_volume_accumulator: accounts[ixName === "sell_v2" ? 20 : 21] ?? Z,
    fee_config: accounts[ixName === "sell_v2" ? 21 : 22] ?? Z,
    fee_program: accounts[ixName === "sell_v2" ? 22 : 23] ?? Z,
  };

  if (normalizedIxName === "buy") return { PumpFunBuy: trade };
  if (normalizedIxName === "sell") return { PumpFunSell: trade };
  return { PumpFunBuy: trade };
}

function parsePumpfunLegacyBuyInstruction(
  ixName: "buy" | "buy_exact_sol_in",
  data: Uint8Array,
  accounts: string[],
  metadata: EventMetadata
): DexEvent | null {
  if (accounts.length < 16) return null;

  const first = data.length >= 8 ? readU64LE(data, 0) ?? 0n : 0n;
  const second = data.length >= 16 ? readU64LE(data, 8) ?? 0n : 0n;
  const exactSolIn = ixName === "buy_exact_sol_in";
  const buybackFeeRecipient = accounts[17] ?? Z;
  const trade = {
    metadata,
    mint: accounts[2] ?? Z,
    global: accounts[0] ?? Z,
    bonding_curve: accounts[3] ?? Z,
    bonding_curve_v2: accounts[16] ?? Z,
    associated_bonding_curve: accounts[4] ?? Z,
    associated_user: accounts[5] ?? Z,
    user: accounts[6] ?? Z,
    system_program: accounts[7] ?? Z,
    token_program: accounts[8] ?? Z,
    creator_vault: accounts[9] ?? Z,
    event_authority: accounts[10] ?? Z,
    program: accounts[11] ?? Z,
    global_volume_accumulator: accounts[12] ?? Z,
    user_volume_accumulator: accounts[13] ?? Z,
    fee_config: accounts[14] ?? Z,
    fee_program: accounts[15] ?? Z,
    buyback_fee_recipient: buybackFeeRecipient,
    is_buy: true,
    is_created_buy: false,
    sol_amount: exactSolIn ? first : second,
    token_amount: exactSolIn ? second : first,
    amount: exactSolIn ? second : first,
    max_sol_cost: exactSolIn ? first : second,
    spendable_sol_in: exactSolIn ? first : 0n,
    spendable_quote_in: 0n,
    min_tokens_out: exactSolIn ? second : 0n,
    min_sol_output: 0n,
    quote_amount: 0n,
    fee_recipient: accounts[1] ?? Z,
    timestamp: 0n,
    virtual_sol_reserves: 0n,
    virtual_token_reserves: 0n,
    real_sol_reserves: 0n,
    real_token_reserves: 0n,
    fee_basis_points: 0n,
    fee: 0n,
    creator: Z,
    creator_fee_basis_points: 0n,
    creator_fee: 0n,
    track_volume: (data[16] ?? 0) !== 0,
    total_unclaimed_tokens: 0n,
    total_claimed_tokens: 0n,
    current_sol_volume: 0n,
    last_update_timestamp: 0n,
    ix_name: ixName,
    mayhem_mode: false,
    cashback_fee_basis_points: 0n,
    cashback: 0n,
    is_cashback_coin: false,
    quote_mint: PUMPFUN_SOL_QUOTE_MINT,
    quote_token_program: Z,
    associated_token_program: Z,
    associated_quote_fee_recipient: Z,
    associated_quote_buyback_fee_recipient: Z,
    associated_quote_bonding_curve: Z,
    associated_quote_user: Z,
    associated_creator_vault: Z,
    sharing_config: Z,
    associated_user_volume_accumulator: Z,
    ...(buybackFeeRecipient !== Z ? { account: buybackFeeRecipient } : {}),
  };

  if (exactSolIn) return { PumpFunBuyExactSolIn: trade };
  return { PumpFunBuy: trade };
}

function parsePumpfunLegacySellInstruction(
  data: Uint8Array,
  accounts: string[],
  metadata: EventMetadata
): DexEvent | null {
  if (accounts.length < 14) return null;

  const amount = data.length >= 8 ? readU64LE(data, 0) ?? 0n : 0n;
  const minSolOutput = data.length >= 16 ? readU64LE(data, 8) ?? 0n : 0n;
  let legacyUserVolumeAccumulator = Z;
  let legacyBondingCurveV2 = accounts[14] ?? Z;
  let legacyBuybackFeeRecipient = Z;
  if (accounts.length >= 17) {
    legacyUserVolumeAccumulator = accounts[14] ?? Z;
    legacyBondingCurveV2 = accounts[15] ?? Z;
    legacyBuybackFeeRecipient = accounts[16] ?? Z;
  } else if (accounts.length >= 16) {
    legacyBondingCurveV2 = accounts[14] ?? Z;
    legacyBuybackFeeRecipient = accounts[15] ?? Z;
  }

  const trade = {
    metadata,
    mint: accounts[2] ?? Z,
    quote_mint: PUMPFUN_SOL_QUOTE_MINT,
    is_buy: false,
    is_created_buy: false,
    global: accounts[0] ?? Z,
    bonding_curve: accounts[3] ?? Z,
    bonding_curve_v2: legacyBondingCurveV2,
    associated_bonding_curve: accounts[4] ?? Z,
    associated_user: accounts[5] ?? Z,
    user: accounts[6] ?? Z,
    system_program: accounts[7] ?? Z,
    fee_recipient: accounts[1] ?? Z,
    token_program: accounts[9] ?? Z,
    quote_token_program: Z,
    associated_token_program: Z,
    creator_vault: accounts[8] ?? Z,
    associated_quote_fee_recipient: Z,
    buyback_fee_recipient: legacyBuybackFeeRecipient,
    associated_quote_buyback_fee_recipient: Z,
    associated_quote_bonding_curve: Z,
    associated_quote_user: Z,
    associated_creator_vault: Z,
    sharing_config: Z,
    event_authority: accounts[10] ?? Z,
    program: accounts[11] ?? Z,
    global_volume_accumulator: Z,
    user_volume_accumulator: legacyUserVolumeAccumulator,
    associated_user_volume_accumulator: Z,
    fee_config: accounts[12] ?? Z,
    fee_program: accounts[13] ?? Z,
    sol_amount: minSolOutput,
    token_amount: amount,
    amount,
    max_sol_cost: 0n,
    min_sol_output: minSolOutput,
    spendable_sol_in: 0n,
    spendable_quote_in: 0n,
    min_tokens_out: 0n,
    quote_amount: 0n,
    timestamp: 0n,
    virtual_sol_reserves: 0n,
    virtual_token_reserves: 0n,
    real_sol_reserves: 0n,
    real_token_reserves: 0n,
    fee_basis_points: 0n,
    fee: 0n,
    creator: Z,
    creator_fee_basis_points: 0n,
    creator_fee: 0n,
    track_volume: false,
    total_unclaimed_tokens: 0n,
    total_claimed_tokens: 0n,
    current_sol_volume: 0n,
    last_update_timestamp: 0n,
    ix_name: "sell",
    mayhem_mode: false,
    cashback_fee_basis_points: 0n,
    cashback: 0n,
    is_cashback_coin: false,
    ...(legacyBuybackFeeRecipient !== Z ? { account: legacyBuybackFeeRecipient } : {}),
  };

  return { PumpFunSell: trade };
}

export function parsePumpfunInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const outer = instructionData.subarray(0, 8);
  const data = instructionData.subarray(8);
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (discEq(outer, DISC.CREATE_V2)) {
    if (accounts.length < 16) return null;
    let o = 0;
    const n1 = readBorshStrAt(data, o);
    if (!n1) return null;
    o = n1.next;
    const n2 = readBorshStrAt(data, o);
    if (!n2) return null;
    o = n2.next;
    const n3 = readBorshStrAt(data, o);
    if (!n3) return null;
    o = n3.next;
    if (o + 33 > data.length) return null;
    const creator = readPubkeyIx(data, o);
    if (!creator) return null;
    o += 32;
    const isMayhemMode = readBool(data, o);
    if (isMayhemMode === null) return null;
    o += 1;
    const isCashbackEnabled = readBool(data, o) ?? false;
    const mint = accounts[0]!;
    const ev = {
      metadata: meta,
      name: n1.s,
      symbol: n2.s,
      uri: n3.s,
      mint,
      bonding_curve: accounts[2] ?? Z,
      user: accounts[5] ?? Z,
      creator,
      mint_authority: accounts[1] ?? Z,
      associated_bonding_curve: accounts[3] ?? Z,
      global: accounts[4] ?? Z,
      system_program: accounts[6] ?? Z,
      token_program: accounts[7] ?? Z,
      associated_token_program: accounts[8] ?? Z,
      mayhem_program_id: accounts[9] ?? Z,
      global_params: accounts[10] ?? Z,
      sol_vault: accounts[11] ?? Z,
      mayhem_state: accounts[12] ?? Z,
      mayhem_token_vault: accounts[13] ?? Z,
      event_authority: accounts[14] ?? Z,
      program: accounts[15] ?? Z,
      observed_fee_recipient: Z,
      ...createNumericDefaults(),
      is_mayhem_mode: isMayhemMode,
      is_cashback_enabled: isCashbackEnabled,
    };
    return { PumpFunCreateV2: ev };
  }

  if (discEq(outer, DISC.BUY)) {
    return parsePumpfunLegacyBuyInstruction("buy", data, accounts, meta);
  }

  if (discEq(outer, DISC.BUY_EXACT_SOL_IN)) {
    return parsePumpfunLegacyBuyInstruction("buy_exact_sol_in", data, accounts, meta);
  }

  if (discEq(outer, DISC.SELL)) {
    return parsePumpfunLegacySellInstruction(data, accounts, meta);
  }

  if (discEq(outer, DISC.BUY_V2)) {
    return parsePumpfunTradeV2Instruction("buy_v2", data, accounts, meta);
  }

  if (discEq(outer, DISC.BUY_EXACT_QUOTE_IN_V2)) {
    return parsePumpfunTradeV2Instruction("buy_exact_quote_in_v2", data, accounts, meta);
  }

  if (discEq(outer, DISC.SELL_V2)) {
    return parsePumpfunTradeV2Instruction("sell_v2", data, accounts, meta);
  }

  if (discEq(outer, DISC.CREATE)) {
    if (accounts.length < 8) return null;
    let o = 0;
    const n1 = readBorshStrAt(data, o);
    if (!n1) return null;
    o = n1.next;
    const n2 = readBorshStrAt(data, o);
    if (!n2) return null;
    o = n2.next;
    const n3 = readBorshStrAt(data, o);
    if (!n3) return null;
    o = n3.next;
    const creator = o + 32 <= data.length ? readPubkeyIx(data, o) ?? Z : Z;
    const mint = accounts[0]!;
    return {
      PumpFunCreate: {
        metadata: meta,
        name: n1.s,
        symbol: n2.s,
        uri: n3.s,
        mint,
        bonding_curve: accounts[2] ?? Z,
        user: accounts[7] ?? Z,
        creator,
        token_program: Z,
        ...createNumericDefaults(),
      },
    };
  }

  if (instructionData.length >= 16) {
    const cpi = instructionData.subarray(8, 16);
    if (discEq(cpi, DISC.MIGRATE_EVENT_LOG)) {
      const payload = instructionData.subarray(16);
      let o = 0;
      const user = readPubkeyIx(payload, o);
      if (!user) return null;
      o += 32;
      const mint = readPubkeyIx(payload, o);
      if (!mint) return null;
      o += 32;
      const mint_amount = readU64LE(payload, o);
      if (mint_amount === null) return null;
      o += 8;
      const sol_amount = readU64LE(payload, o);
      if (sol_amount === null) return null;
      o += 8;
      const pool_migration_fee = readU64LE(payload, o);
      if (pool_migration_fee === null) return null;
      o += 8;
      const bonding_curve = readPubkeyIx(payload, o);
      if (!bonding_curve) return null;
      o += 32;
      const ts = readI64LE(payload, o);
      if (ts === null) return null;
      o += 8;
      const pool = readPubkeyIx(payload, o);
      if (!pool) return null;
      return {
        PumpFunMigrate: {
          metadata: meta,
          user,
          mint,
          mint_amount,
          sol_amount,
          pool_migration_fee,
          bonding_curve,
          timestamp: BigInt(ts),
          pool,
        },
      };
    }
  }

  return null;
}
