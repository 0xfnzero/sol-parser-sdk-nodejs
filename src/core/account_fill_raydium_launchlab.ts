/** RaydiumLaunchlab（LaunchLab）账户填充 */
import type { RaydiumLaunchlabPoolCreateEvent, RaydiumLaunchlabTradeEvent } from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";
import { RAYDIUM_LAUNCHLAB_PROGRAM_ID } from "../instr/program_ids.js";

const Z = () => defaultPubkey();

export function fillRaydiumLaunchlabTradeAccounts(e: RaydiumLaunchlabTradeEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.pool_state || e.pool_state === zero) e.pool_state = get(4);
  if (!e.global_config || e.global_config === zero) e.global_config = get(2);
  if (!e.platform_config || e.platform_config === zero) e.platform_config = get(3);
  if (!e.user_base_token || e.user_base_token === zero) e.user_base_token = get(5);
  if (!e.user_quote_token || e.user_quote_token === zero) e.user_quote_token = get(6);
  if (!e.base_vault || e.base_vault === zero) e.base_vault = get(7);
  if (!e.quote_vault || e.quote_vault === zero) e.quote_vault = get(8);
  if (!e.base_mint || e.base_mint === zero) e.base_mint = get(9);
  if (!e.quote_mint || e.quote_mint === zero) e.quote_mint = get(10);
  if (!e.base_token_program || e.base_token_program === zero) e.base_token_program = get(11);
  if (!e.quote_token_program || e.quote_token_program === zero) e.quote_token_program = get(12);
}

export function fillRaydiumLaunchlabPoolCreateAccounts(e: RaydiumLaunchlabPoolCreateEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.pool_state || e.pool_state === zero) e.pool_state = get(5);
  if (!e.creator || e.creator === zero) e.creator = get(1);
  if (!e.payer || e.payer === zero) e.payer = get(0);
  if (!e.global_config || e.global_config === zero) e.global_config = get(2);
  if (!e.platform_config || e.platform_config === zero) e.platform_config = get(3);
  if (!e.base_mint || e.base_mint === zero) e.base_mint = get(6);
  if (!e.quote_mint || e.quote_mint === zero) e.quote_mint = get(7);
  if (!e.base_vault || e.base_vault === zero) e.base_vault = get(8);
  if (!e.quote_vault || e.quote_vault === zero) e.quote_vault = get(9);

  const tokenProgramIndices =
    get(17) === RAYDIUM_LAUNCHLAB_PROGRAM_ID
      ? ([11, 12] as const)
      : get(14) === RAYDIUM_LAUNCHLAB_PROGRAM_ID
        ? ([10, 11] as const)
        : null;
  if (!tokenProgramIndices) return;
  if (!e.base_token_program || e.base_token_program === zero) {
    e.base_token_program = get(tokenProgramIndices[0]);
  }
  if (!e.quote_token_program || e.quote_token_program === zero) {
    e.quote_token_program = get(tokenProgramIndices[1]);
  }
}
