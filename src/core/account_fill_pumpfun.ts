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
  if (!e.user || e.user === zero) e.user = get(6);
  if (!e.bonding_curve || e.bonding_curve === zero) e.bonding_curve = get(3);
  if (!e.associated_bonding_curve || e.associated_bonding_curve === zero) {
    e.associated_bonding_curve = get(4);
  }
  if (!e.creator_vault || e.creator_vault === zero) {
    e.creator_vault = e.is_buy ? get(9) : get(8);
  }
  if (!e.token_program || e.token_program === zero) {
    e.token_program = e.is_buy ? get(8) : get(9);
  }
  const a17 = get(16);
  if (a17 !== zero) e.account = a17;
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
