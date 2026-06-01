import type { EventMetadata } from "../core/metadata.js";
import type { DexEvent } from "../core/dex_event.js";
import type { AccountData } from "./types.js";
import type { EventType, EventTypeFilter } from "../grpc/types.js";
import { eventTypeFilterShouldIncludeDexEvent } from "../grpc/types.js";
import { PUMP_FEES_PROGRAM_ID, PUMPFUN_PROGRAM_ID, PUMPSWAP_PROGRAM_ID } from "../instr/program_ids.js";
import { parseNonceAccount, isNonceAccount } from "./nonce.js";
import { parseTokenAccount } from "./token.js";
import { parsePumpswapAccount } from "./pumpswap.js";
import { parsePumpfunAccount } from "./pumpfun.js";

export type { AccountData } from "./types.js";
export { parseNonceAccount, isNonceAccount } from "./nonce.js";
export { parseTokenAccount } from "./token.js";
export {
  parsePumpfunGlobal,
  parsePumpfunBondingCurve,
  parsePumpfunFeeConfig,
  parsePumpfunSharingConfig,
  parsePumpfunGlobalVolumeAccumulator,
  parsePumpfunUserVolumeAccumulator,
  parsePumpfunAccount,
  isPumpfunGlobalAccount,
  isPumpfunBondingCurveAccount,
  isPumpfunFeeConfigAccount,
  isPumpfunSharingConfigAccount,
  isPumpfunGlobalVolumeAccumulatorAccount,
  isPumpfunUserVolumeAccumulatorAccount,
} from "./pumpfun.js";
export {
  parsePumpswapGlobalConfig,
  parsePumpswapPool,
  parsePumpswapAccount,
  isGlobalConfigAccount,
  isPoolAccount,
} from "./pumpswap.js";
export { hasDiscriminator } from "./utils.js";
export { userWalletPubkeyForOnchainAccount } from "./wallet_resolve.js";
export { rpcResolveUserWalletPubkey } from "./rpc_wallet.js";

const ACCOUNT_EVENT_TYPES: EventType[] = [
  "TokenAccount",
  "TokenInfo",
  "NonceAccount",
  "AccountPumpFunGlobal",
  "AccountPumpFunBondingCurve",
  "AccountPumpFunFeeConfig",
  "AccountPumpFunSharingConfig",
  "AccountPumpFunGlobalVolumeAccumulator",
  "AccountPumpFunUserVolumeAccumulator",
  "AccountPumpSwapGlobalConfig",
  "AccountPumpSwapPool",
];

function filterParsedEvent(ev: DexEvent | null, eventTypeFilter?: EventTypeFilter): DexEvent | null {
  if (!ev || !eventTypeFilter) return ev;
  return eventTypeFilterShouldIncludeDexEvent(eventTypeFilter, ev) ? ev : null;
}

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

  if (account.owner === PUMPSWAP_PROGRAM_ID) {
    if (
      !eventTypeFilter ||
      eventTypeFilter.shouldInclude("AccountPumpSwapGlobalConfig") ||
      eventTypeFilter.shouldInclude("AccountPumpSwapPool")
    ) {
      const ev = parsePumpswapAccount(account, metadata);
      if (ev) return filterParsedEvent(ev, eventTypeFilter);
    }
    return null;
  }

  if (account.owner === PUMPFUN_PROGRAM_ID || account.owner === PUMP_FEES_PROGRAM_ID) {
    if (
      !eventTypeFilter ||
      eventTypeFilter.shouldInclude("AccountPumpFunGlobal") ||
      eventTypeFilter.shouldInclude("AccountPumpFunBondingCurve") ||
      eventTypeFilter.shouldInclude("AccountPumpFunFeeConfig") ||
      eventTypeFilter.shouldInclude("AccountPumpFunSharingConfig") ||
      eventTypeFilter.shouldInclude("AccountPumpFunGlobalVolumeAccumulator") ||
      eventTypeFilter.shouldInclude("AccountPumpFunUserVolumeAccumulator")
    ) {
      const ev = parsePumpfunAccount(account, metadata);
      if (ev) return filterParsedEvent(ev, eventTypeFilter);
    }
    return null;
  }

  if (isNonceAccount(account.data)) {
    if (eventTypeFilter && !eventTypeFilter.shouldInclude("NonceAccount")) return null;
    return parseNonceAccount(account, metadata);
  }

  if (
    eventTypeFilter &&
    !eventTypeFilter.shouldInclude("TokenAccount") &&
    !eventTypeFilter.shouldInclude("TokenInfo")
  ) {
    return null;
  }
  return filterParsedEvent(parseTokenAccount(account, metadata), eventTypeFilter);
}
