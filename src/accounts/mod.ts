import type { EventMetadata } from "../core/metadata.js";
import type { DexEvent } from "../core/dex_event.js";
import type { AccountData } from "./types.js";
import type { EventType, EventTypeFilter } from "../grpc/types.js";
import { PUMPSWAP_PROGRAM_ID } from "../instr/program_ids.js";
import { parseNonceAccount, isNonceAccount } from "./nonce.js";
import { parseTokenAccount } from "./token.js";
import { parsePumpswapAccount } from "./pumpswap.js";

export type { AccountData } from "./types.js";
export { parseNonceAccount, isNonceAccount } from "./nonce.js";
export { parseTokenAccount } from "./token.js";
export {
  parsePumpswapGlobalConfig,
  parsePumpswapPool,
  parsePumpswapAccount,
  isGlobalConfigAccount,
  isPoolAccount,
} from "./pumpswap.js";
export { hasDiscriminator } from "./utils.js";

const ACCOUNT_EVENT_TYPES: EventType[] = [
  "TokenAccount",
  "NonceAccount",
  "AccountPumpSwapGlobalConfig",
  "AccountPumpSwapPool",
];

/** 账户数据统一解析入口 */
export function parseAccountUnified(
  account: AccountData,
  metadata: EventMetadata,
  eventTypeFilter?: EventTypeFilter
): DexEvent | null {
  if (account.data.length === 0) return null;

  if (eventTypeFilter?.include_only) {
    const shouldParse = eventTypeFilter.include_only.some((t) => ACCOUNT_EVENT_TYPES.includes(t));
    if (!shouldParse) return null;
  }

  if (account.owner === PUMPSWAP_PROGRAM_ID && eventTypeFilter) {
    if (
      eventTypeFilter.shouldInclude("AccountPumpSwapGlobalConfig") ||
      eventTypeFilter.shouldInclude("AccountPumpSwapPool")
    ) {
      const ev = parsePumpswapAccount(account, metadata);
      if (ev) return ev;
    }
  }

  if (isNonceAccount(account.data)) {
    if (eventTypeFilter && !eventTypeFilter.shouldInclude("NonceAccount")) return null;
    return parseNonceAccount(account, metadata);
  }

  if (eventTypeFilter && !eventTypeFilter.shouldInclude("TokenAccount")) return null;
  return parseTokenAccount(account, metadata);
}
