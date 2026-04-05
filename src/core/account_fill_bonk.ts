/** Bonk（Launchpad）账户填充 */
import type { BonkPoolCreateEvent, BonkTradeEvent } from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

const Z = () => defaultPubkey();

export function fillBonkTradeAccounts(e: BonkTradeEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.pool_state || e.pool_state === zero) e.pool_state = get(1);
}

export function fillBonkPoolCreateAccounts(e: BonkPoolCreateEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.pool_state || e.pool_state === zero) e.pool_state = get(1);
  if (!e.creator || e.creator === zero) e.creator = get(8);
}
