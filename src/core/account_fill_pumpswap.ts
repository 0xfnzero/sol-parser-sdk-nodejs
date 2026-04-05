/** PumpSwap 账户填充 */
import type {
  PumpSwapBuyEvent,
  PumpSwapCreatePoolEvent,
  PumpSwapLiquidityAdded,
  PumpSwapLiquidityRemoved,
  PumpSwapSellEvent,
  PumpSwapTradeEvent,
} from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

const Z = () => defaultPubkey();

function fillPumpswapTradeCommon(
  e: PumpSwapBuyEvent | PumpSwapSellEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.pool || e.pool === zero) e.pool = get(0);
  if (!e.user || e.user === zero) e.user = get(1);
  if (!e.base_mint || e.base_mint === zero) e.base_mint = get(3);
  if (!e.quote_mint || e.quote_mint === zero) e.quote_mint = get(4);
  if (!e.user_base_token_account || e.user_base_token_account === zero) {
    e.user_base_token_account = get(5);
  }
  if (!e.user_quote_token_account || e.user_quote_token_account === zero) {
    e.user_quote_token_account = get(6);
  }
  if (!e.pool_base_token_account || e.pool_base_token_account === zero) {
    e.pool_base_token_account = get(7);
  }
  if (!e.pool_quote_token_account || e.pool_quote_token_account === zero) {
    e.pool_quote_token_account = get(8);
  }
  if (!e.protocol_fee_recipient || e.protocol_fee_recipient === zero) {
    e.protocol_fee_recipient = get(9);
  }
  if (!e.protocol_fee_recipient_token_account || e.protocol_fee_recipient_token_account === zero) {
    e.protocol_fee_recipient_token_account = get(10);
  }
  if (!e.base_token_program || e.base_token_program === zero) e.base_token_program = get(11);
  if (!e.quote_token_program || e.quote_token_program === zero) e.quote_token_program = get(12);
  if (!e.coin_creator_vault_ata || e.coin_creator_vault_ata === zero) e.coin_creator_vault_ata = get(17);
  if (!e.coin_creator_vault_authority || e.coin_creator_vault_authority === zero) {
    e.coin_creator_vault_authority = get(18);
  }
}

export function fillPumpswapBuyAccounts(e: PumpSwapBuyEvent, get: (i: number) => string): void {
  fillPumpswapTradeCommon(e, get);
}

export function fillPumpswapSellAccounts(e: PumpSwapSellEvent, get: (i: number) => string): void {
  fillPumpswapTradeCommon(e, get);
}

export function fillPumpswapCreatePoolAccounts(
  e: PumpSwapCreatePoolEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.pool || e.pool === zero) e.pool = get(0);
  if (!e.creator || e.creator === zero) e.creator = get(2);
  if (!e.base_mint || e.base_mint === zero) e.base_mint = get(3);
  if (!e.quote_mint || e.quote_mint === zero) e.quote_mint = get(4);
  if (!e.lp_mint || e.lp_mint === zero) e.lp_mint = get(5);
  if (!e.user_base_token_account || e.user_base_token_account === zero) {
    e.user_base_token_account = get(6);
  }
  if (!e.user_quote_token_account || e.user_quote_token_account === zero) {
    e.user_quote_token_account = get(7);
  }
}

/** PumpSwapTrade：字段已由事件数据解析，不从账户表补 */
export function fillPumpswapTradeAccounts(
  _e: PumpSwapTradeEvent,
  _get: (i: number) => string
): void {}

/** 加/减流动性：占位（字段来自事件数据） */
export function fillPumpswapLiquidityAddedAccounts(
  _e: PumpSwapLiquidityAdded,
  _get: (i: number) => string
): void {}

export function fillPumpswapLiquidityRemovedAccounts(
  _e: PumpSwapLiquidityRemoved,
  _get: (i: number) => string
): void {}
