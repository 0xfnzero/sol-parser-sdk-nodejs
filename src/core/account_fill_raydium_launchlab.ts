/** RaydiumLaunchlab（LaunchLab）账户填充 */
import type { RaydiumLaunchlabPoolCreateEvent, RaydiumLaunchlabTradeEvent } from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

const Z = () => defaultPubkey();

export function fillRaydiumLaunchlabTradeAccounts(e: RaydiumLaunchlabTradeEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.pool_state || e.pool_state === zero) e.pool_state = get(4);
}

export function fillRaydiumLaunchlabPoolCreateAccounts(e: RaydiumLaunchlabPoolCreateEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.pool_state || e.pool_state === zero) e.pool_state = get(5);
  if (!e.creator || e.creator === zero) e.creator = get(1);
}
