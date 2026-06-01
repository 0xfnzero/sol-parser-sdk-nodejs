/** PumpFun 账户填充（字符串公钥） */
import type {
  PumpFunCreateTokenEvent,
  PumpFunCreateV2TokenEvent,
  PumpFunMigrateEvent,
  PumpFunTradeEvent,
} from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

const Z = () => defaultPubkey();

export function fillPumpfunTradeAccounts(e: PumpFunTradeEvent, get: (i: number) => string): void {
  const zero = Z();
  const accountAtMatchesMint = (idx: number): boolean =>
    Boolean(e.mint && e.mint !== zero && get(idx) === e.mint);
  const set = (key: keyof PumpFunTradeEvent, idx: number): void => {
    const current = e[key];
    if (!current || current === zero) {
      (e as any)[key] = get(idx);
    }
  };
  const isV2 =
    e.ix_name === "buy_v2" ||
    e.ix_name === "sell_v2" ||
    e.ix_name === "buy_exact_quote_in_v2" ||
    accountAtMatchesMint(1);
  if (isV2) {
    set("global", 0);
    set("quote_mint", 2);
    set("fee_recipient", 6);
    set("bonding_curve", 10);
    set("associated_bonding_curve", 11);
    set("associated_quote_bonding_curve", 12);
    set("user", 13);
    set("associated_user", 14);
    set("associated_quote_user", 15);
    set("token_program", 3);
    set("quote_token_program", 4);
    set("associated_token_program", 5);
    set("creator_vault", 16);
    set("associated_quote_fee_recipient", 7);
    set("buyback_fee_recipient", 8);
    set("associated_quote_buyback_fee_recipient", 9);
    set("associated_creator_vault", 17);
    set("sharing_config", 18);
    if (e.ix_name === "sell_v2" || (!e.is_buy && e.ix_name === "sell")) {
      set("user_volume_accumulator", 19);
      set("associated_user_volume_accumulator", 20);
      set("fee_config", 21);
      set("fee_program", 22);
      set("system_program", 23);
      set("event_authority", 24);
      set("program", 25);
    } else {
      set("global_volume_accumulator", 19);
      set("user_volume_accumulator", 20);
      set("associated_user_volume_accumulator", 21);
      set("fee_config", 22);
      set("fee_program", 23);
      set("system_program", 24);
      set("event_authority", 25);
      set("program", 26);
    }
    return;
  }
  set("global", 0);
  set("fee_recipient", 1);
  set("bonding_curve", 3);
  set("associated_bonding_curve", 4);
  set("associated_user", 5);
  set("user", 6);
  set("system_program", 7);
  set("creator_vault", e.is_buy ? 9 : 8);
  set("token_program", e.is_buy ? 8 : 9);
  set("event_authority", 10);
  set("program", 11);
  if (e.is_buy) {
    set("global_volume_accumulator", 12);
    set("user_volume_accumulator", 13);
    set("fee_config", 14);
    set("fee_program", 15);
    set("bonding_curve_v2", 16);
    set("buyback_fee_recipient", 17);
    const a17 = get(17);
    if (a17 && a17 !== zero && e.account == null) e.account = a17;
    return;
  }

  set("fee_config", 12);
  set("fee_program", 13);
  const a16 = get(16);
  if (a16 && a16 !== zero) {
    set("user_volume_accumulator", 14);
    set("bonding_curve_v2", 15);
    set("buyback_fee_recipient", 16);
    if (e.account == null) e.account = a16;
    return;
  }
  if (e.is_cashback_coin) {
    set("user_volume_accumulator", 14);
    set("bonding_curve_v2", 15);
    return;
  }
  set("bonding_curve_v2", 14);
  set("buyback_fee_recipient", 15);
  const a15 = get(15);
  if (a15 && a15 !== zero && e.account == null) e.account = a15;
}

export function fillPumpfunCreateAccounts(e: PumpFunCreateTokenEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.mint || e.mint === zero) e.mint = get(0);
  if (!e.bonding_curve || e.bonding_curve === zero) e.bonding_curve = get(2);
  if (!e.user || e.user === zero) e.user = get(7);
}

export function fillPumpfunCreateV2Accounts(
  e: PumpFunCreateV2TokenEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.mint || e.mint === zero) e.mint = get(0);
  if (!e.bonding_curve || e.bonding_curve === zero) e.bonding_curve = get(2);
  if (!e.user || e.user === zero) e.user = get(5);
  if (!e.mint_authority || e.mint_authority === zero) e.mint_authority = get(1);
  if (!e.associated_bonding_curve || e.associated_bonding_curve === zero) {
    e.associated_bonding_curve = get(3);
  }
  if (!e.global || e.global === zero) e.global = get(4);
  if (!e.system_program || e.system_program === zero) e.system_program = get(6);
  if (!e.token_program || e.token_program === zero) e.token_program = get(7);
  if (!e.associated_token_program || e.associated_token_program === zero) {
    e.associated_token_program = get(8);
  }
  if (!e.mayhem_program_id || e.mayhem_program_id === zero) e.mayhem_program_id = get(9);
  if (!e.global_params || e.global_params === zero) e.global_params = get(10);
  if (!e.sol_vault || e.sol_vault === zero) e.sol_vault = get(11);
  if (!e.mayhem_state || e.mayhem_state === zero) e.mayhem_state = get(12);
  if (!e.mayhem_token_vault || e.mayhem_token_vault === zero) e.mayhem_token_vault = get(13);
  if (!e.event_authority || e.event_authority === zero) e.event_authority = get(14);
  if (!e.program || e.program === zero) e.program = get(15);
}

/** Migrate：占位，待 IDL 账户映射 */
export function fillPumpfunMigrateAccounts(
  _e: PumpFunMigrateEvent,
  _get: (i: number) => string
): void {}
