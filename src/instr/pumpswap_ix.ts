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
  const g = (i: number) => getAccount(accounts, i) ?? ZP;
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
    pool: g(0),
    user: g(1),
    user_base_token_account: g(5),
    user_quote_token_account: g(6),
    protocol_fee_recipient: g(9),
    protocol_fee_recipient_token_account: g(10),
    coin_creator: accounts.length > 16 ? g(16) : Z,
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
    base_mint: g(3),
    quote_mint: g(4),
    pool_base_token_account: g(7),
    pool_quote_token_account: g(8),
    coin_creator_vault_ata: accounts.length > 17 ? g(17) : ZP,
    coin_creator_vault_authority: accounts.length > 18 ? g(18) : ZP,
    base_token_program: g(11),
    quote_token_program: g(12),
  };
  return ev;
}

export function parsePumpswapInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs = 0
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const head = instructionData.subarray(0, 8);
  const data = instructionData.subarray(8);
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

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
    const g = (i: number) => getAccount(accounts, i) ?? ZP;
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
      pool: g(0),
      user: g(1),
      user_base_token_account: g(5),
      user_quote_token_account: g(6),
      protocol_fee_recipient: g(9),
      protocol_fee_recipient_token_account: g(10),
      coin_creator: accounts.length > 16 ? g(16) : Z,
      coin_creator_fee_basis_points: 0n,
      coin_creator_fee: 0n,
      cashback_fee_basis_points: 0n,
      cashback: 0n,
      is_pump_pool: false,
      base_mint: g(3),
      quote_mint: g(4),
      pool_base_token_account: g(7),
      pool_quote_token_account: g(8),
      coin_creator_vault_ata: accounts.length > 17 ? g(17) : ZP,
      coin_creator_vault_authority: accounts.length > 18 ? g(18) : ZP,
      base_token_program: g(11),
      quote_token_program: g(12),
    };
    return { PumpSwapSell: ev };
  }
  if (discEq(head, PS.CREATE_POOL)) {
    if (accounts.length < 8) return null;
    const g = (i: number) => getAccount(accounts, i) ?? Z;
    const ev: PumpSwapCreatePoolEvent = {
      metadata: meta,
      timestamp: 0n,
      index: 0,
      pool: g(0),
      creator: g(2),
      base_mint: g(3),
      quote_mint: g(4),
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
      lp_mint: g(5),
      user_base_token_account: g(6),
      user_quote_token_account: g(7),
      coin_creator: g(1),
      is_mayhem_mode: false,
    };
    return { PumpSwapCreatePool: ev };
  }
  if (discEq(head, PS.DEPOSIT)) {
    if (accounts.length < 8) return null;
    const g = (i: number) => getAccount(accounts, i) ?? Z;
    let lp_out = 0n;
    let max_base = 0n;
    let max_quote = 0n;
    if (data.length >= 24) {
      lp_out = readU64LE(data, 0) ?? 0n;
      max_base = readU64LE(data, 8) ?? 0n;
      max_quote = readU64LE(data, 16) ?? 0n;
    }
    const ev: PumpSwapLiquidityAdded = {
      metadata: meta,
      timestamp: 0n,
      lp_token_amount_out: lp_out,
      max_base_amount_in: max_base,
      max_quote_amount_in: max_quote,
      user_base_token_reserves: 0n,
      user_quote_token_reserves: 0n,
      pool_base_token_reserves: 0n,
      pool_quote_token_reserves: 0n,
      base_amount_in: 0n,
      quote_amount_in: 0n,
      lp_mint_supply: 0n,
      pool: g(0),
      user: g(1),
      user_base_token_account: g(4),
      user_quote_token_account: g(5),
      user_pool_token_account: g(6),
    };
    return { PumpSwapLiquidityAdded: ev };
  }
  if (discEq(head, PS.WITHDRAW)) {
    if (accounts.length < 8) return null;
    const g = (i: number) => getAccount(accounts, i) ?? Z;
    let lp_in = 0n;
    let min_base = 0n;
    let min_quote = 0n;
    if (data.length >= 24) {
      lp_in = readU64LE(data, 0) ?? 0n;
      min_base = readU64LE(data, 8) ?? 0n;
      min_quote = readU64LE(data, 16) ?? 0n;
    }
    const ev: PumpSwapLiquidityRemoved = {
      metadata: meta,
      timestamp: 0n,
      lp_token_amount_in: lp_in,
      min_base_amount_out: min_base,
      min_quote_amount_out: min_quote,
      user_base_token_reserves: 0n,
      user_quote_token_reserves: 0n,
      pool_base_token_reserves: 0n,
      pool_quote_token_reserves: 0n,
      base_amount_out: 0n,
      quote_amount_out: 0n,
      lp_mint_supply: 0n,
      pool: g(0),
      user: g(1),
      user_base_token_account: g(4),
      user_quote_token_account: g(5),
      user_pool_token_account: g(6),
    };
    return { PumpSwapLiquidityRemoved: ev };
  }
  return null;
}
