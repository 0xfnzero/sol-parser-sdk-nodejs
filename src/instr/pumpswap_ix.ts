/**
 * PumpSwap 指令解析
 */
import type {
  DexEvent,
  PumpSwapBuyEvent,
  PumpSwapCreatePoolEvent,
  PumpSwapLiquidityAdded,
  PumpSwapLiquidityRemoved,
  PumpSwapSellEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const ZP = defaultPubkey();
const Z = ZP;

function disc8(a: readonly number[]): Uint8Array {
  return Uint8Array.from(a);
}

const PS = {
  BUY: disc8([102, 6, 61, 18, 1, 218, 235, 234]),
  SELL: disc8([51, 230, 133, 164, 1, 127, 131, 173]),
  CREATE_POOL: disc8([233, 146, 209, 142, 207, 104, 64, 188]),
  BUY_EXACT_QUOTE_IN: disc8([198, 46, 21, 82, 180, 217, 232, 112]),
  DEPOSIT: disc8([242, 35, 198, 137, 82, 225, 242, 182]),
  WITHDRAW: disc8([183, 18, 70, 156, 148, 109, 161, 34]),
};

function discEq(h: Uint8Array, d: Uint8Array): boolean {
  for (let i = 0; i < 8; i++) if (h[i] !== d[i]) return false;
  return true;
}

function buyLike(
  data: Uint8Array,
  accounts: string[],
  meta: PumpSwapBuyEvent["metadata"],
  swapOrder: "buy" | "buy_exact"
): PumpSwapBuyEvent {
  const [a0, a1] =
    data.length >= 16
      ? [readU64LE(data, 0) ?? 0n, readU64LE(data, 8) ?? 0n]
      : [0n, 0n];
  const [base_amount_out, max_quote_amount_in] =
    swapOrder === "buy" ? [a0, a1] : [a1, a0];
  const ev: PumpSwapBuyEvent = {
    metadata: meta,
    timestamp: 0n,
    base_amount_out,
    max_quote_amount_in,
    user_base_token_reserves: 0n,
    user_quote_token_reserves: 0n,
    pool_base_token_reserves: 0n,
    pool_quote_token_reserves: 0n,
    quote_amount_in: 0n,
    lp_fee_basis_points: 0n,
    lp_fee: 0n,
    protocol_fee_basis_points: 0n,
    protocol_fee: 0n,
    quote_amount_in_with_lp_fee: 0n,
    user_quote_amount_in: 0n,
    pool: getAccount(accounts, 0) ?? Z,
    user: getAccount(accounts, 1) ?? Z,
    user_base_token_account: getAccount(accounts, 5) ?? Z,
    user_quote_token_account: getAccount(accounts, 6) ?? Z,
    protocol_fee_recipient: getAccount(accounts, 9) ?? Z,
    protocol_fee_recipient_token_account: getAccount(accounts, 10) ?? Z,
    coin_creator: Z,
    coin_creator_fee_basis_points: 0n,
    coin_creator_fee: 0n,
    track_volume: false,
    total_unclaimed_tokens: 0n,
    total_claimed_tokens: 0n,
    current_sol_volume: 0n,
    last_update_timestamp: 0n,
    min_base_amount_out: 0n,
    ix_name: "",
    cashback_fee_basis_points: 0n,
    cashback: 0n,
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
  return ev;
}

export function parsePumpswapInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const head = instructionData.subarray(0, 8);
  const data = instructionData.subarray(8);
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, 0);

  if (discEq(head, PS.BUY)) {
    if (accounts.length < 13) return null;
    return { PumpSwapBuy: buyLike(data, accounts, meta, "buy") };
  }
  if (discEq(head, PS.BUY_EXACT_QUOTE_IN)) {
    if (accounts.length < 13) return null;
    return { PumpSwapBuy: buyLike(data, accounts, meta, "buy_exact") };
  }
  if (discEq(head, PS.SELL)) {
    if (accounts.length < 13) return null;
    const [base_amount_in, min_quote_amount_out] =
      data.length >= 16
        ? [readU64LE(data, 0) ?? 0n, readU64LE(data, 8) ?? 0n]
        : [0n, 0n];
    const ev: PumpSwapSellEvent = {
      metadata: meta,
      timestamp: 0n,
      base_amount_in,
      min_quote_amount_out,
      user_base_token_reserves: 0n,
      user_quote_token_reserves: 0n,
      pool_base_token_reserves: 0n,
      pool_quote_token_reserves: 0n,
      quote_amount_out: 0n,
      lp_fee_basis_points: 0n,
      lp_fee: 0n,
      protocol_fee_basis_points: 0n,
      protocol_fee: 0n,
      quote_amount_out_without_lp_fee: 0n,
      user_quote_amount_out: 0n,
      pool: getAccount(accounts, 0) ?? Z,
      user: getAccount(accounts, 1) ?? Z,
      user_base_token_account: getAccount(accounts, 5) ?? Z,
      user_quote_token_account: getAccount(accounts, 6) ?? Z,
      protocol_fee_recipient: getAccount(accounts, 9) ?? Z,
      protocol_fee_recipient_token_account: getAccount(accounts, 10) ?? Z,
      coin_creator: Z,
      coin_creator_fee_basis_points: 0n,
      coin_creator_fee: 0n,
      cashback_fee_basis_points: 0n,
      cashback: 0n,
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
  if (discEq(head, PS.CREATE_POOL)) {
    if (accounts.length < 5) return null;
    const ev: PumpSwapCreatePoolEvent = {
      metadata: meta,
      timestamp: 0n,
      index: 0,
      creator: getAccount(accounts, 0) ?? Z,
      base_mint: getAccount(accounts, 2) ?? Z,
      quote_mint: getAccount(accounts, 3) ?? Z,
      base_mint_decimals: 0,
      quote_mint_decimals: 0,
      base_amount_in: 0n,
      quote_amount_in: 0n,
      pool_base_amount: 0n,
      pool_quote_amount: 0n,
      minimum_liquidity: 0n,
      initial_liquidity: 0n,
      lp_token_amount_out: 0n,
      pool_bump: 0,
      pool: Z,
      lp_mint: Z,
      user_base_token_account: Z,
      user_quote_token_account: Z,
      coin_creator: Z,
      is_mayhem_mode: false,
    };
    return { PumpSwapCreatePool: ev };
  }
  if (discEq(head, PS.DEPOSIT)) {
    if (accounts.length < 8) return null;
    const ev: PumpSwapLiquidityAdded = {
      metadata: meta,
      timestamp: 0n,
      lp_token_amount_out: 0n,
      max_base_amount_in: 0n,
      max_quote_amount_in: 0n,
      user_base_token_reserves: 0n,
      user_quote_token_reserves: 0n,
      pool_base_token_reserves: 0n,
      pool_quote_token_reserves: 0n,
      base_amount_in: 0n,
      quote_amount_in: 0n,
      lp_mint_supply: 0n,
      pool: getAccount(accounts, 0) ?? Z,
      user: getAccount(accounts, 1) ?? Z,
      user_base_token_account: getAccount(accounts, 4) ?? Z,
      user_quote_token_account: getAccount(accounts, 5) ?? Z,
      user_pool_token_account: getAccount(accounts, 6) ?? Z,
    };
    return { PumpSwapLiquidityAdded: ev };
  }
  if (discEq(head, PS.WITHDRAW)) {
    if (accounts.length < 8) return null;
    const ev: PumpSwapLiquidityRemoved = {
      metadata: meta,
      timestamp: 0n,
      lp_token_amount_in: 0n,
      min_base_amount_out: 0n,
      min_quote_amount_out: 0n,
      user_base_token_reserves: 0n,
      user_quote_token_reserves: 0n,
      pool_base_token_reserves: 0n,
      pool_quote_token_reserves: 0n,
      base_amount_out: 0n,
      quote_amount_out: 0n,
      lp_mint_supply: 0n,
      pool: getAccount(accounts, 0) ?? Z,
      user: getAccount(accounts, 1) ?? Z,
      user_base_token_account: getAccount(accounts, 4) ?? Z,
      user_quote_token_account: getAccount(accounts, 5) ?? Z,
      user_pool_token_account: getAccount(accounts, 6) ?? Z,
    };
    return { PumpSwapLiquidityRemoved: ev };
  }
  return null;
}
