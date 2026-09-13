import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  PumpSwapBuyEvent,
  PumpSwapCreatePoolEvent,
  PumpSwapLiquidityAdded,
  PumpSwapLiquidityRemoved,
  PumpSwapSellEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import {
  readBool,
  readI64LE,
  readPubkey,
  readU128LE,
  readU16LE,
  readU32LE,
  readU64LE,
  readU8,
} from "../util/binary.js";
import { PUMPSWAP_DISC } from "./program_log_discriminators.js";

export { PUMPSWAP_DISC };

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

function bnI64(v: ReturnType<typeof readI64LE>): bigint {
  return v ?? 0n;
}

const ZP = defaultPubkey();

interface PumpSwapTradeTail {
  cashback_fee_basis_points: bigint;
  cashback: bigint;
  buyback_fee_basis_points: bigint;
  buyback_fee: bigint;
  virtual_quote_reserves: bigint;
  can_boost: boolean;
  base_supply: bigint;
  holder_rewards_bps: bigint;
  holder_rewards: bigint;
}

function emptyTradeTail(): PumpSwapTradeTail {
  return {
    cashback_fee_basis_points: 0n,
    cashback: 0n,
    buyback_fee_basis_points: 0n,
    buyback_fee: 0n,
    virtual_quote_reserves: 0n,
    can_boost: false,
    base_supply: 0n,
    holder_rewards_bps: 0n,
    holder_rewards: 0n,
  };
}

function parseTradeTail(data: Uint8Array): PumpSwapTradeTail | null {
  const tail = emptyTradeTail();
  if (data.length === 0) return tail;
  if (data.length < 16) return null;

  tail.cashback_fee_basis_points = bn64(readU64LE(data, 0));
  tail.cashback = bn64(readU64LE(data, 8));
  if (data.length === 16) return tail;
  if (data.length < 32) return null;

  tail.buyback_fee_basis_points = bn64(readU64LE(data, 16));
  tail.buyback_fee = bn64(readU64LE(data, 24));
  if (data.length === 32) return tail;
  if (data.length < 57) return null;

  const virtual = readU128LE(data, 32);
  if (virtual === null) return null;
  tail.virtual_quote_reserves = BigInt.asIntN(128, virtual);
  const canBoost = readU8(data, 48);
  if (canBoost !== 0 && canBoost !== 1) return null;
  tail.can_boost = canBoost === 1;
  tail.base_supply = bn64(readU64LE(data, 49));
  if (data.length !== 57 && data.length < 73) return null;
  if (data.length >= 73) {
    tail.holder_rewards_bps = bn64(readU64LE(data, 57));
    tail.holder_rewards = bn64(readU64LE(data, 65));
  }
  return tail;
}

function readStrictBorshString(
  data: Uint8Array,
  offset: number
): { value: string; next: number } | null {
  const len = readU32LE(data, offset);
  if (len === null || offset + 4 + len > data.length) return null;
  try {
    const value = new TextDecoder("utf-8", { fatal: true }).decode(
      data.subarray(offset + 4, offset + 4 + len)
    );
    return { value, next: offset + 4 + len };
  } catch {
    return null;
  }
}

export function parseBuyFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const LEGACY_LEN = 16 * 8 + 7 * 32 + 1 + 4 * 8;
  const MIN_REQUIRED_LEN = LEGACY_LEN + 8 + 4;
  if (data.length !== LEGACY_LEN && data.length < MIN_REQUIRED_LEN) return null;
  if (data[352] !== 0 && data[352] !== 1) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const base_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const max_quote_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const user_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const user_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const quote_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const lp_fee_basis_points = bn64(readU64LE(data, o));
  o += 8;
  const lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee_basis_points = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  o += 8;
  const quote_amount_in_with_lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const user_quote_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const pool = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const user_base_token_account = readPubkey(data, o)!;
  o += 32;
  const user_quote_token_account = readPubkey(data, o)!;
  o += 32;
  const protocol_fee_recipient = readPubkey(data, o)!;
  o += 32;
  const protocol_fee_recipient_token_account = readPubkey(data, o)!;
  o += 32;
  const coin_creator = readPubkey(data, o)!;
  o += 32;
  const coin_creator_fee_basis_points = bn64(readU64LE(data, o));
  o += 8;
  const coin_creator_fee = bn64(readU64LE(data, o));
  o += 8;
  const track_volume = data[o] === 1;
  o += 1;
  const total_unclaimed_tokens = bn64(readU64LE(data, o));
  o += 8;
  const total_claimed_tokens = bn64(readU64LE(data, o));
  o += 8;
  const current_sol_volume = bn64(readU64LE(data, o));
  o += 8;
  const last_update_timestamp = bnI64(readI64LE(data, o));
  o += 8;
  let min_base_amount_out = 0n;
  let ix_name = "";
  let tail = emptyTradeTail();
  if (data.length !== LEGACY_LEN) {
    min_base_amount_out = bn64(readU64LE(data, o));
    o += 8;
    const name = readStrictBorshString(data, o);
    if (name === null) return null;
    ix_name = name.value;
    o = name.next;
    const parsedTail = parseTradeTail(data.subarray(o));
    if (parsedTail === null) return null;
    tail = parsedTail;
  }
  const ev: PumpSwapBuyEvent = {
    metadata,
    timestamp,
    base_amount_out,
    max_quote_amount_in,
    user_base_token_reserves,
    user_quote_token_reserves,
    pool_base_token_reserves,
    pool_quote_token_reserves,
    quote_amount_in,
    lp_fee_basis_points,
    lp_fee,
    protocol_fee_basis_points,
    protocol_fee,
    quote_amount_in_with_lp_fee,
    user_quote_amount_in,
    pool,
    user,
    user_base_token_account,
    user_quote_token_account,
    protocol_fee_recipient,
    protocol_fee_recipient_token_account,
    coin_creator,
    coin_creator_fee_basis_points,
    coin_creator_fee,
    track_volume,
    total_unclaimed_tokens,
    total_claimed_tokens,
    current_sol_volume,
    last_update_timestamp,
    min_base_amount_out,
    ix_name,
    cashback_fee_basis_points: tail.cashback_fee_basis_points,
    cashback: tail.cashback,
    buyback_fee_basis_points: tail.buyback_fee_basis_points,
    buyback_fee: tail.buyback_fee,
    virtual_quote_reserves: tail.virtual_quote_reserves,
    can_boost: tail.can_boost,
    base_supply: tail.base_supply,
    holder_rewards_bps: tail.holder_rewards_bps,
    holder_rewards: tail.holder_rewards,
    is_pump_pool: false,
    base_mint: ZP,
    quote_mint: ZP,
    pool_base_token_account: ZP,
    pool_quote_token_account: ZP,
    coin_creator_vault_ata: ZP,
    coin_creator_vault_authority: ZP,
    base_token_program: ZP,
    quote_token_program: ZP,
  };
  return { PumpSwapBuy: ev };
}

export function parseSellFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const REQUIRED = 14 * 8 + 7 * 32 + 2 * 8;
  if (data.length < REQUIRED) return null;
  const tail = parseTradeTail(data.subarray(REQUIRED));
  if (tail === null) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const base_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const min_quote_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const user_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const user_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const quote_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const lp_fee_basis_points = bn64(readU64LE(data, o));
  o += 8;
  const lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee_basis_points = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  o += 8;
  const quote_amount_out_without_lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const user_quote_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const pool = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const user_base_token_account = readPubkey(data, o)!;
  o += 32;
  const user_quote_token_account = readPubkey(data, o)!;
  o += 32;
  const protocol_fee_recipient = readPubkey(data, o)!;
  o += 32;
  const protocol_fee_recipient_token_account = readPubkey(data, o)!;
  o += 32;
  const coin_creator = readPubkey(data, o)!;
  o += 32;
  const coin_creator_fee_basis_points = bn64(readU64LE(data, o));
  o += 8;
  const coin_creator_fee = bn64(readU64LE(data, o));
  o += 8;
  const ev: PumpSwapSellEvent = {
    metadata,
    timestamp,
    base_amount_in,
    min_quote_amount_out,
    user_base_token_reserves,
    user_quote_token_reserves,
    pool_base_token_reserves,
    pool_quote_token_reserves,
    quote_amount_out,
    lp_fee_basis_points,
    lp_fee,
    protocol_fee_basis_points,
    protocol_fee,
    quote_amount_out_without_lp_fee,
    user_quote_amount_out,
    pool,
    user,
    user_base_token_account,
    user_quote_token_account,
    protocol_fee_recipient,
    protocol_fee_recipient_token_account,
    coin_creator,
    coin_creator_fee_basis_points,
    coin_creator_fee,
    cashback_fee_basis_points: tail.cashback_fee_basis_points,
    cashback: tail.cashback,
    buyback_fee_basis_points: tail.buyback_fee_basis_points,
    buyback_fee: tail.buyback_fee,
    virtual_quote_reserves: tail.virtual_quote_reserves,
    can_boost: tail.can_boost,
    base_supply: tail.base_supply,
    holder_rewards_bps: tail.holder_rewards_bps,
    holder_rewards: tail.holder_rewards,
    is_pump_pool: false,
    base_mint: ZP,
    quote_mint: ZP,
    pool_base_token_account: ZP,
    pool_quote_token_account: ZP,
    coin_creator_vault_ata: ZP,
    coin_creator_vault_authority: ZP,
    base_token_program: ZP,
    quote_token_program: ZP,
  };
  return { PumpSwapSell: ev };
}

export function parseCreatePoolFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const REQUIRED = 326;
  if (data.length < REQUIRED) return null;
  if (data.length !== REQUIRED && data.length < 335) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const index = readU16LE(data, o)!;
  o += 2;
  const creator = readPubkey(data, o)!;
  o += 32;
  const base_mint = readPubkey(data, o)!;
  o += 32;
  const quote_mint = readPubkey(data, o)!;
  o += 32;
  const base_mint_decimals = readU8(data, o)!;
  o += 1;
  const quote_mint_decimals = readU8(data, o)!;
  o += 1;
  const base_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const quote_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const pool_base_amount = bn64(readU64LE(data, o));
  o += 8;
  const pool_quote_amount = bn64(readU64LE(data, o));
  o += 8;
  const minimum_liquidity = bn64(readU64LE(data, o));
  o += 8;
  const initial_liquidity = bn64(readU64LE(data, o));
  o += 8;
  const lp_token_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const pool_bump = readU8(data, o)!;
  o += 1;
  const pool = readPubkey(data, o)!;
  o += 32;
  const lp_mint = readPubkey(data, o)!;
  o += 32;
  const user_base_token_account = readPubkey(data, o)!;
  o += 32;
  const user_quote_token_account = readPubkey(data, o)!;
  o += 32;
  const coin_creator = readPubkey(data, o)!;
  o += 32;
  const is_mayhem_mode = data.length > 325 && readBool(data, 325) === true;
  const creator_fee_bps = data.length >= 334 ? bn64(readU64LE(data, 326)) : 0n;
  const can_edit_creator_fee = data.length > 334 && readBool(data, 334) === true;
  const is_holder_reward = data.length > 335 && readBool(data, 335) === true;
  const ev: PumpSwapCreatePoolEvent = {
    metadata,
    timestamp,
    index,
    creator,
    base_mint,
    quote_mint,
    base_mint_decimals,
    quote_mint_decimals,
    base_amount_in,
    quote_amount_in,
    pool_base_amount,
    pool_quote_amount,
    minimum_liquidity,
    initial_liquidity,
    lp_token_amount_out,
    pool_bump,
    pool,
    lp_mint,
    user_base_token_account,
    user_quote_token_account,
    coin_creator,
    is_mayhem_mode,
    is_cashback_coin: false,
    creator_fee_bps,
    can_edit_creator_fee,
    is_holder_reward,
  };
  return { PumpSwapCreatePool: ev };
}

export function parseAddLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const REQUIRED = 10 * 8 + 5 * 32;
  if (data.length < REQUIRED) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const lp_token_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const max_base_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const max_quote_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const user_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const user_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const base_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const quote_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const lp_mint_supply = bn64(readU64LE(data, o));
  o += 8;
  const pool = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const user_base_token_account = readPubkey(data, o)!;
  o += 32;
  const user_quote_token_account = readPubkey(data, o)!;
  o += 32;
  const user_pool_token_account = readPubkey(data, o)!;
  const ev: PumpSwapLiquidityAdded = {
    metadata,
    timestamp,
    lp_token_amount_out,
    max_base_amount_in,
    max_quote_amount_in,
    user_base_token_reserves,
    user_quote_token_reserves,
    pool_base_token_reserves,
    pool_quote_token_reserves,
    base_amount_in,
    quote_amount_in,
    lp_mint_supply,
    pool,
    user,
    user_base_token_account,
    user_quote_token_account,
    user_pool_token_account,
  };
  return { PumpSwapLiquidityAdded: ev };
}

export function parseRemoveLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const REQUIRED = 10 * 8 + 5 * 32;
  if (data.length < REQUIRED) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const lp_token_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const min_base_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const min_quote_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const user_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const user_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_base_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const pool_quote_token_reserves = bn64(readU64LE(data, o));
  o += 8;
  const base_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const quote_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const lp_mint_supply = bn64(readU64LE(data, o));
  o += 8;
  const pool = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const user_base_token_account = readPubkey(data, o)!;
  o += 32;
  const user_quote_token_account = readPubkey(data, o)!;
  o += 32;
  const user_pool_token_account = readPubkey(data, o)!;
  const ev: PumpSwapLiquidityRemoved = {
    metadata,
    timestamp,
    lp_token_amount_in,
    min_base_amount_out,
    min_quote_amount_out,
    user_base_token_reserves,
    user_quote_token_reserves,
    pool_base_token_reserves,
    pool_quote_token_reserves,
    base_amount_out,
    quote_amount_out,
    lp_mint_supply,
    pool,
    user,
    user_base_token_account,
    user_quote_token_account,
    user_pool_token_account,
  };
  return { PumpSwapLiquidityRemoved: ev };
}
