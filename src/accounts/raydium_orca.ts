import { PublicKey } from "@solana/web3.js";
import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  OrcaFeeTierAccount,
  OrcaPositionAccount,
  OrcaPositionRewardInfo,
  OrcaTick,
  OrcaTickArrayAccount,
  OrcaWhirlpoolAccount,
  OrcaWhirlpoolRewardInfo,
  OrcaWhirlpoolsConfigAccount,
  RaydiumClmmAmmConfig,
  RaydiumClmmDynamicFeeInfo,
  RaydiumClmmPoolState,
  RaydiumClmmRewardInfo,
  RaydiumClmmTickArrayState,
  RaydiumCpmmAmmConfig,
  RaydiumCpmmPoolState,
  Tick,
} from "../core/dex_event.js";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
} from "../instr/program_ids.js";
import type { AccountData } from "./types.js";
import { hasDiscriminator } from "./utils.js";

const CLMM_AMM_CONFIG_DISC = Uint8Array.from([218, 244, 33, 104, 203, 203, 43, 111]);
const CLMM_POOL_STATE_DISC = Uint8Array.from([247, 237, 227, 245, 215, 195, 222, 70]);
const CLMM_TICK_ARRAY_STATE_DISC = Uint8Array.from([192, 155, 85, 205, 49, 249, 129, 42]);
const CLMM_AMM_CONFIG_BODY = 109;
const CLMM_POOL_STATE_BODY = 1536;
const CLMM_TICK_ARRAY_STATE_BODY = 10232;
const CLMM_TICK_ARRAY_LEN = 60;

const CPMM_AMM_CONFIG_DISC = CLMM_AMM_CONFIG_DISC;
const CPMM_POOL_STATE_DISC = CLMM_POOL_STATE_DISC;
const CPMM_AMM_CONFIG_BODY = 228;
const CPMM_POOL_STATE_BODY = 629;

const ORCA_WHIRLPOOL_DISC = Uint8Array.from([63, 149, 209, 12, 225, 128, 99, 9]);
const ORCA_POSITION_DISC = Uint8Array.from([170, 188, 143, 228, 122, 64, 247, 208]);
const ORCA_TICK_ARRAY_DISC = Uint8Array.from([69, 97, 189, 190, 110, 7, 66, 187]);
const ORCA_FEE_TIER_DISC = Uint8Array.from([56, 75, 159, 76, 142, 68, 190, 105]);
const ORCA_WHIRLPOOLS_CONFIG_DISC = Uint8Array.from([157, 20, 49, 224, 217, 87, 193, 254]);
const ORCA_WHIRLPOOL_BODY = 645;
const ORCA_POSITION_BODY = 208;
const ORCA_TICK_ARRAY_BODY = 9980;
const ORCA_FEE_TIER_BODY = 36;
const ORCA_WHIRLPOOLS_CONFIG_BODY = 98;
const ORCA_TICK_ARRAY_LEN = 88;

const U128_SIGN_BIT = 1n << 127n;
const U128_MOD = 1n << 128n;

class Reader {
  private offset = 0;
  private readonly view: DataView;

  constructor(private readonly data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  private require(size: number): number {
    if (this.offset + size > this.data.length) {
      throw new RangeError("account data is truncated");
    }
    const start = this.offset;
    this.offset += size;
    return start;
  }

  u8(): number {
    return this.view.getUint8(this.require(1));
  }

  bool(): boolean {
    return this.u8() !== 0;
  }

  u16(): number {
    return this.view.getUint16(this.require(2), true);
  }

  u32(): number {
    return this.view.getUint32(this.require(4), true);
  }

  i32(): number {
    return this.view.getInt32(this.require(4), true);
  }

  u64(): bigint {
    return this.view.getBigUint64(this.require(8), true);
  }

  u128(): bigint {
    const lo = this.u64();
    const hi = this.u64();
    return lo | (hi << 64n);
  }

  i128(): bigint {
    const value = this.u128();
    return value >= U128_SIGN_BIT ? value - U128_MOD : value;
  }

  pubkey(): string {
    const start = this.require(32);
    return new PublicKey(this.data.subarray(start, start + 32)).toBase58();
  }

  bytes(len: number): number[] {
    const start = this.require(len);
    return Array.from(this.data.subarray(start, start + len));
  }
}

function readArray<T>(len: number, read: () => T): T[] {
  const out = new Array<T>(len);
  for (let i = 0; i < len; i++) out[i] = read();
  return out;
}

function parseBody<T>(data: Uint8Array, parse: (r: Reader) => T): T | null {
  try {
    return parse(new Reader(data));
  } catch {
    return null;
  }
}

function bodyAfterDiscriminator(account: AccountData, disc: Uint8Array, bodySize: number): Uint8Array | null {
  if (account.data.length < 8 + bodySize || !hasDiscriminator(account.data, disc)) return null;
  return account.data.subarray(8);
}

export function isRaydiumClmmAmmConfigAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, CLMM_AMM_CONFIG_DISC);
}

export function isRaydiumClmmPoolStateAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, CLMM_POOL_STATE_DISC);
}

export function isRaydiumClmmTickArrayStateAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, CLMM_TICK_ARRAY_STATE_DISC);
}

export function isRaydiumCpmmAmmConfigAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, CPMM_AMM_CONFIG_DISC);
}

export function isRaydiumCpmmPoolStateAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, CPMM_POOL_STATE_DISC);
}

export function isOrcaWhirlpoolAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, ORCA_WHIRLPOOL_DISC);
}

export function isOrcaPositionAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, ORCA_POSITION_DISC);
}

export function isOrcaTickArrayAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, ORCA_TICK_ARRAY_DISC);
}

export function isOrcaFeeTierAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, ORCA_FEE_TIER_DISC);
}

export function isOrcaWhirlpoolsConfigAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, ORCA_WHIRLPOOLS_CONFIG_DISC);
}

export function parseRaydiumClmmAccount(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.owner !== RAYDIUM_CLMM_PROGRAM_ID) return null;
  return (
    parseRaydiumClmmAmmConfig(account, metadata) ??
    parseRaydiumClmmPoolState(account, metadata) ??
    parseRaydiumClmmTickArrayState(account, metadata)
  );
}

export function parseRaydiumCpmmAccount(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.owner !== RAYDIUM_CPMM_PROGRAM_ID) return null;
  return parseRaydiumCpmmAmmConfig(account, metadata) ?? parseRaydiumCpmmPoolState(account, metadata);
}

export function parseOrcaWhirlpoolAccount(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.owner !== ORCA_WHIRLPOOL_PROGRAM_ID) return null;
  return (
    parseOrcaWhirlpool(account, metadata) ??
    parseOrcaPosition(account, metadata) ??
    parseOrcaTickArray(account, metadata) ??
    parseOrcaFeeTier(account, metadata) ??
    parseOrcaWhirlpoolsConfig(account, metadata)
  );
}

export function parseRaydiumClmmAmmConfig(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, CLMM_AMM_CONFIG_DISC, CLMM_AMM_CONFIG_BODY);
  if (!body) return null;
  const amm_config = parseBody<RaydiumClmmAmmConfig>(body, (r) => ({
    bump: r.u8(),
    index: r.u16(),
    owner: r.pubkey(),
    protocol_fee_rate: r.u32(),
    trade_fee_rate: r.u32(),
    tick_spacing: r.u16(),
    fund_fee_rate: r.u32(),
    padding_u32: r.u32(),
    fund_owner: r.pubkey(),
    padding: readArray(3, () => r.u64()),
  }));
  return amm_config ? { RaydiumClmmAmmConfigAccount: { metadata, pubkey: account.pubkey, amm_config } } : null;
}

export function parseRaydiumClmmPoolState(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, CLMM_POOL_STATE_DISC, CLMM_POOL_STATE_BODY);
  if (!body) return null;
  const pool_state = parseBody<RaydiumClmmPoolState>(body, (r) => ({
    bump: [r.u8()],
    amm_config: r.pubkey(),
    owner: r.pubkey(),
    token_mint_0: r.pubkey(),
    token_mint_1: r.pubkey(),
    token_vault_0: r.pubkey(),
    token_vault_1: r.pubkey(),
    observation_key: r.pubkey(),
    mint_decimals_0: r.u8(),
    mint_decimals_1: r.u8(),
    tick_spacing: r.u16(),
    liquidity: r.u128(),
    sqrt_price_x64: r.u128(),
    tick_current: r.i32(),
    padding3: r.u16(),
    padding4: r.u16(),
    fee_growth_global_0_x64: r.u128(),
    fee_growth_global_1_x64: r.u128(),
    protocol_fees_token_0: r.u64(),
    protocol_fees_token_1: r.u64(),
    padding5: readArray(4, () => r.u128()),
    status: r.u8(),
    fee_on: r.u8(),
    padding: r.bytes(6),
    reward_infos: readArray(3, () => readClmmRewardInfo(r)),
    tick_array_bitmap: readArray(16, () => r.u64()),
    padding6: readArray(4, () => r.u64()),
    fund_fees_token_0: r.u64(),
    fund_fees_token_1: r.u64(),
    open_time: r.u64(),
    recent_epoch: r.u64(),
    dynamic_fee_info: readClmmDynamicFeeInfo(r),
    padding1: readArray(14, () => r.u64()),
    padding2: readArray(32, () => r.u64()),
  }));
  return pool_state ? { RaydiumClmmPoolStateAccount: { metadata, pubkey: account.pubkey, pool_state } } : null;
}

export function parseRaydiumClmmTickArrayState(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, CLMM_TICK_ARRAY_STATE_DISC, CLMM_TICK_ARRAY_STATE_BODY);
  if (!body) return null;
  const tick_array_state = parseBody<RaydiumClmmTickArrayState>(body, (r) => ({
    pool_id: r.pubkey(),
    start_tick_index: r.i32(),
    ticks: readArray(CLMM_TICK_ARRAY_LEN, () => readClmmTick(r)),
    initialized_tick_count: r.u8(),
    recent_epoch: r.u64(),
    padding: r.bytes(107),
  }));
  return tick_array_state
    ? { RaydiumClmmTickArrayStateAccount: { metadata, pubkey: account.pubkey, tick_array_state } }
    : null;
}

function readClmmRewardInfo(r: Reader): RaydiumClmmRewardInfo {
  return {
    reward_state: r.u8(),
    open_time: r.u64(),
    end_time: r.u64(),
    last_update_time: r.u64(),
    emissions_per_second_x64: r.u128(),
    reward_total_emitted: r.u64(),
    reward_claimed: r.u64(),
    token_mint: r.pubkey(),
    token_vault: r.pubkey(),
    authority: r.pubkey(),
    reward_growth_global_x64: r.u128(),
  };
}

function readClmmDynamicFeeInfo(r: Reader): RaydiumClmmDynamicFeeInfo {
  return {
    filter_period: r.u16(),
    decay_period: r.u16(),
    reduction_factor: r.u16(),
    dynamic_fee_control: r.u32(),
    max_volatility_accumulator: r.u32(),
    tick_spacing_index_reference: r.i32(),
    volatility_reference: r.u32(),
    volatility_accumulator: r.u32(),
    last_update_timestamp: r.u64(),
    padding: r.bytes(46),
  };
}

function readClmmTick(r: Reader): Tick {
  return {
    tick: r.i32(),
    liquidity_net: r.i128(),
    liquidity_gross: r.u128(),
    fee_growth_outside_0_x64: r.u128(),
    fee_growth_outside_1_x64: r.u128(),
    reward_growths_outside_x64: readArray(3, () => r.u128()),
    order_phase: r.u64(),
    orders_amount: r.u64(),
    part_filled_orders_remaining: r.u64(),
    unfilled_ratio_x64: r.u128(),
    padding: readArray(3, () => r.u32()),
  };
}

export function parseRaydiumCpmmAmmConfig(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, CPMM_AMM_CONFIG_DISC, CPMM_AMM_CONFIG_BODY);
  if (!body) return null;
  const amm_config = parseBody<RaydiumCpmmAmmConfig>(body, (r) => ({
    bump: r.u8(),
    disable_create_pool: r.bool(),
    index: r.u16(),
    trade_fee_rate: r.u64(),
    protocol_fee_rate: r.u64(),
    fund_fee_rate: r.u64(),
    create_pool_fee: r.u64(),
    protocol_owner: r.pubkey(),
    fund_owner: r.pubkey(),
    creator_fee_rate: r.u64(),
    padding: readArray(15, () => r.u64()),
  }));
  return amm_config ? { RaydiumCpmmAmmConfigAccount: { metadata, pubkey: account.pubkey, amm_config } } : null;
}

export function parseRaydiumCpmmPoolState(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, CPMM_POOL_STATE_DISC, CPMM_POOL_STATE_BODY);
  if (!body) return null;
  const pool_state = parseBody<RaydiumCpmmPoolState>(body, (r) => ({
    amm_config: r.pubkey(),
    pool_creator: r.pubkey(),
    token_0_vault: r.pubkey(),
    token_1_vault: r.pubkey(),
    lp_mint: r.pubkey(),
    token_0_mint: r.pubkey(),
    token_1_mint: r.pubkey(),
    token_0_program: r.pubkey(),
    token_1_program: r.pubkey(),
    observation_key: r.pubkey(),
    auth_bump: r.u8(),
    status: r.u8(),
    lp_mint_decimals: r.u8(),
    mint_0_decimals: r.u8(),
    mint_1_decimals: r.u8(),
    lp_supply: r.u64(),
    protocol_fees_token_0: r.u64(),
    protocol_fees_token_1: r.u64(),
    fund_fees_token_0: r.u64(),
    fund_fees_token_1: r.u64(),
    open_time: r.u64(),
    recent_epoch: r.u64(),
    creator_fee_on: r.u8(),
    enable_creator_fee: r.bool(),
    padding1: r.bytes(6),
    creator_fees_token_0: r.u64(),
    creator_fees_token_1: r.u64(),
    padding: readArray(28, () => r.u64()),
  }));
  return pool_state ? { RaydiumCpmmPoolStateAccount: { metadata, pubkey: account.pubkey, pool_state } } : null;
}

export function parseOrcaWhirlpool(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, ORCA_WHIRLPOOL_DISC, ORCA_WHIRLPOOL_BODY);
  if (!body) return null;
  const whirlpool = parseBody<OrcaWhirlpoolAccount>(body, (r) => ({
    whirlpools_config: r.pubkey(),
    whirlpool_bump: r.u8(),
    tick_spacing: r.u16(),
    tick_spacing_seed: r.bytes(2),
    fee_rate: r.u16(),
    protocol_fee_rate: r.u16(),
    liquidity: r.u128(),
    sqrt_price: r.u128(),
    tick_current_index: r.i32(),
    protocol_fee_owed_a: r.u64(),
    protocol_fee_owed_b: r.u64(),
    token_mint_a: r.pubkey(),
    token_vault_a: r.pubkey(),
    fee_growth_global_a: r.u128(),
    token_mint_b: r.pubkey(),
    token_vault_b: r.pubkey(),
    fee_growth_global_b: r.u128(),
    reward_last_updated_timestamp: r.u64(),
    reward_infos: readArray(3, () => readOrcaWhirlpoolRewardInfo(r)),
  }));
  return whirlpool ? { OrcaWhirlpoolAccount: { metadata, pubkey: account.pubkey, whirlpool } } : null;
}

export function parseOrcaPosition(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, ORCA_POSITION_DISC, ORCA_POSITION_BODY);
  if (!body) return null;
  const position = parseBody<OrcaPositionAccount>(body, (r) => ({
    whirlpool: r.pubkey(),
    position_mint: r.pubkey(),
    liquidity: r.u128(),
    tick_lower_index: r.i32(),
    tick_upper_index: r.i32(),
    fee_growth_checkpoint_a: r.u128(),
    fee_owed_a: r.u64(),
    fee_growth_checkpoint_b: r.u128(),
    fee_owed_b: r.u64(),
    reward_infos: readArray(3, () => readOrcaPositionRewardInfo(r)),
  }));
  return position ? { OrcaPositionAccount: { metadata, pubkey: account.pubkey, position } } : null;
}

export function parseOrcaTickArray(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, ORCA_TICK_ARRAY_DISC, ORCA_TICK_ARRAY_BODY);
  if (!body) return null;
  const tick_array = parseBody<OrcaTickArrayAccount>(body, (r) => ({
    start_tick_index: r.i32(),
    ticks: readArray(ORCA_TICK_ARRAY_LEN, () => readOrcaTick(r)),
    whirlpool: r.pubkey(),
  }));
  return tick_array ? { OrcaTickArrayAccount: { metadata, pubkey: account.pubkey, tick_array } } : null;
}

export function parseOrcaFeeTier(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, ORCA_FEE_TIER_DISC, ORCA_FEE_TIER_BODY);
  if (!body) return null;
  const fee_tier = parseBody<OrcaFeeTierAccount>(body, (r) => ({
    whirlpools_config: r.pubkey(),
    tick_spacing: r.u16(),
    default_fee_rate: r.u16(),
  }));
  return fee_tier ? { OrcaFeeTierAccount: { metadata, pubkey: account.pubkey, fee_tier } } : null;
}

export function parseOrcaWhirlpoolsConfig(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const body = bodyAfterDiscriminator(account, ORCA_WHIRLPOOLS_CONFIG_DISC, ORCA_WHIRLPOOLS_CONFIG_BODY);
  if (!body) return null;
  const config = parseBody<OrcaWhirlpoolsConfigAccount>(body, (r) => ({
    fee_authority: r.pubkey(),
    collect_protocol_fees_authority: r.pubkey(),
    reward_emissions_super_authority: r.pubkey(),
    default_protocol_fee_rate: r.u16(),
  }));
  return config ? { OrcaWhirlpoolsConfigAccount: { metadata, pubkey: account.pubkey, config } } : null;
}

function readOrcaWhirlpoolRewardInfo(r: Reader): OrcaWhirlpoolRewardInfo {
  return {
    mint: r.pubkey(),
    vault: r.pubkey(),
    authority: r.pubkey(),
    emissions_per_second_x64: r.u128(),
    growth_global_x64: r.u128(),
  };
}

function readOrcaPositionRewardInfo(r: Reader): OrcaPositionRewardInfo {
  return {
    growth_inside_checkpoint: r.u128(),
    amount_owed: r.u64(),
  };
}

function readOrcaTick(r: Reader): OrcaTick {
  return {
    initialized: r.bool(),
    liquidity_net: r.i128(),
    liquidity_gross: r.u128(),
    fee_growth_outside_a: r.u128(),
    fee_growth_outside_b: r.u128(),
    reward_growths_outside: readArray(3, () => r.u128()),
  };
}
