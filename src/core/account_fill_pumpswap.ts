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

const TOKEN_PROGRAMS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);
function isCompactTrade(get: (i: number) => string): boolean {
  // Index 16 is the program in both legacy and compact layouts.
  return (
    get(16) === "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA" &&
    TOKEN_PROGRAMS.has(get(9)) &&
    TOKEN_PROGRAMS.has(get(10))
  );
}

function fillPumpswapTradeCommon(
  e: PumpSwapBuyEvent | PumpSwapSellEvent,
  get: (i: number) => string,
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
  if (isCompactTrade(get)) {
    if (!e.base_token_program || e.base_token_program === zero)
      e.base_token_program = get(9);
    if (!e.quote_token_program || e.quote_token_program === zero)
      e.quote_token_program = get(10);
    if (
      !e.fee_recipient_quote_token_account ||
      e.fee_recipient_quote_token_account === zero
    )
      e.fee_recipient_quote_token_account = get(14);
    return;
  }
  if (!e.protocol_fee_recipient || e.protocol_fee_recipient === zero) {
    e.protocol_fee_recipient = get(9);
  }
  if (
    !e.protocol_fee_recipient_token_account ||
    e.protocol_fee_recipient_token_account === zero
  ) {
    e.protocol_fee_recipient_token_account = get(10);
  }
  if (!e.base_token_program || e.base_token_program === zero)
    e.base_token_program = get(11);
  if (!e.quote_token_program || e.quote_token_program === zero)
    e.quote_token_program = get(12);
  if (!e.coin_creator_vault_ata || e.coin_creator_vault_ata === zero)
    e.coin_creator_vault_ata = get(17);
  if (
    !e.coin_creator_vault_authority ||
    e.coin_creator_vault_authority === zero
  ) {
    e.coin_creator_vault_authority = get(18);
  }
}

/** The boost layout has no user ATAs or fee accounts. Preserve decoded values. */
export function fillPumpswapBoostBuyAccounts(
  e: PumpSwapBuyEvent,
  get: (i: number) => string,
): void {
  const zero = Z();
  const roles = {
    pool: 0,
    base_mint: 3,
    quote_mint: 4,
    pool_base_token_account: 5,
    pool_quote_token_account: 6,
    base_token_program: 9,
    quote_token_program: 10,
  } as const;
  for (const [field, index] of Object.entries(roles)) {
    const key = field as keyof typeof roles;
    if (!e[key] || e[key] === zero) e[key] = get(index);
  }
}

export function fillPumpswapBuyAccounts(
  e: PumpSwapBuyEvent,
  get: (i: number) => string,
): void {
  fillPumpswapTradeCommon(e, get);
  if (isCompactTrade(get)) return;
  const zero = Z();
  const a26 = get(26);
  if (a26 && a26 !== zero) {
    if (!e.pool_v2 || e.pool_v2 === zero) e.pool_v2 = get(24);
    if (!e.fee_recipient || e.fee_recipient === zero) e.fee_recipient = get(25);
    if (
      !e.fee_recipient_quote_token_account ||
      e.fee_recipient_quote_token_account === zero
    ) {
      e.fee_recipient_quote_token_account = a26;
    }
    return;
  }
  const a25 = get(25);
  if (a25 && a25 !== zero) {
    if (!e.pool_v2 || e.pool_v2 === zero) e.pool_v2 = get(23);
    if (!e.fee_recipient || e.fee_recipient === zero) e.fee_recipient = get(24);
    if (
      !e.fee_recipient_quote_token_account ||
      e.fee_recipient_quote_token_account === zero
    ) {
      e.fee_recipient_quote_token_account = a25;
    }
    return;
  }
  if (!e.pool_v2 || e.pool_v2 === zero) e.pool_v2 = get(23);
}

export function fillPumpswapSellAccounts(
  e: PumpSwapSellEvent,
  get: (i: number) => string,
): void {
  fillPumpswapTradeCommon(e, get);
  if (isCompactTrade(get)) return;
  const zero = Z();
  const a25 = get(25);
  if (a25 && a25 !== zero) {
    if (!e.pool_v2 || e.pool_v2 === zero) e.pool_v2 = get(23);
    if (!e.fee_recipient || e.fee_recipient === zero) e.fee_recipient = get(24);
    if (
      !e.fee_recipient_quote_token_account ||
      e.fee_recipient_quote_token_account === zero
    ) {
      e.fee_recipient_quote_token_account = a25;
    }
    return;
  }
  const a23 = get(23);
  if (a23 && a23 !== zero) {
    if (!e.pool_v2 || e.pool_v2 === zero) e.pool_v2 = get(21);
    if (!e.fee_recipient || e.fee_recipient === zero) e.fee_recipient = get(22);
    if (
      !e.fee_recipient_quote_token_account ||
      e.fee_recipient_quote_token_account === zero
    ) {
      e.fee_recipient_quote_token_account = a23;
    }
    return;
  }
  if (!e.pool_v2 || e.pool_v2 === zero) e.pool_v2 = get(21);
}

export function fillPumpswapCreatePoolAccounts(
  e: PumpSwapCreatePoolEvent,
  get: (i: number) => string,
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
  _get: (i: number) => string,
): void {}

/** 加/减流动性：占位（字段来自事件数据） */
export function fillPumpswapLiquidityAddedAccounts(
  _e: PumpSwapLiquidityAdded,
  _get: (i: number) => string,
): void {}

export function fillPumpswapLiquidityRemovedAccounts(
  _e: PumpSwapLiquidityRemoved,
  _get: (i: number) => string,
): void {}
