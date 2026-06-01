import type {
  DexEvent,
  PumpFunCreateTokenEvent,
  PumpFunCreateV2TokenEvent,
  PumpFunTradeEvent,
} from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

function pumpfunTradeEvent(ev: DexEvent): PumpFunTradeEvent | null {
  if ("PumpFunTrade" in ev) return ev.PumpFunTrade;
  if ("PumpFunBuy" in ev) return ev.PumpFunBuy;
  if ("PumpFunSell" in ev) return ev.PumpFunSell;
  if ("PumpFunBuyExactSolIn" in ev) return ev.PumpFunBuyExactSolIn;
  return null;
}

function pumpfunCreateFlags(ev: DexEvent): [string, boolean, boolean] | null {
  let c: PumpFunCreateTokenEvent | PumpFunCreateV2TokenEvent | null = null;
  if ("PumpFunCreate" in ev) c = ev.PumpFunCreate;
  if ("PumpFunCreateV2" in ev) c = ev.PumpFunCreateV2;
  if (!c || !c.mint || c.mint === defaultPubkey()) return null;
  return [c.mint, c.is_cashback_enabled, c.is_mayhem_mode];
}

function fillString(dst: PumpFunCreateV2TokenEvent, key: keyof PumpFunCreateTokenEvent, value: string): void {
  const zero = defaultPubkey();
  if ((!dst[key] || dst[key] === zero) && value && value !== zero) {
    (dst as unknown as Record<string, unknown>)[key] = value;
  }
}

function fillBigint(dst: PumpFunCreateV2TokenEvent, key: keyof PumpFunCreateTokenEvent, value: bigint): void {
  if (dst[key] === 0n && value !== 0n) {
    (dst as unknown as Record<string, unknown>)[key] = value;
  }
}

export function enrichCreateV2FromCreateEvents(events: DexEvent[]): void {
  const zero = defaultPubkey();
  const creates = new Map<string, PumpFunCreateTokenEvent>();

  for (const ev of events) {
    if (!("PumpFunCreate" in ev)) continue;
    const c = ev.PumpFunCreate;
    if (c.mint && c.mint !== zero && !creates.has(c.mint)) {
      creates.set(c.mint, c);
    }
  }

  if (creates.size === 0) return;

  for (const ev of events) {
    if (!("PumpFunCreateV2" in ev)) continue;
    const c2 = ev.PumpFunCreateV2;
    const c = creates.get(c2.mint);
    if (!c) continue;

    fillString(c2, "name", c.name);
    fillString(c2, "symbol", c.symbol);
    fillString(c2, "uri", c.uri);
    fillString(c2, "bonding_curve", c.bonding_curve);
    fillString(c2, "user", c.user);
    fillString(c2, "creator", c.creator);
    fillString(c2, "token_program", c.token_program);
    fillString(c2, "quote_mint", c.quote_mint);
    fillBigint(c2, "timestamp", c.timestamp);
    fillBigint(c2, "virtual_token_reserves", c.virtual_token_reserves);
    fillBigint(c2, "virtual_sol_reserves", c.virtual_sol_reserves);
    fillBigint(c2, "real_token_reserves", c.real_token_reserves);
    fillBigint(c2, "token_total_supply", c.token_total_supply);
    fillBigint(c2, "virtual_quote_reserves", c.virtual_quote_reserves);
    c2.is_mayhem_mode ||= c.is_mayhem_mode;
    c2.is_cashback_enabled ||= c.is_cashback_enabled;
  }
}

export function enrichCreateV2ObservedFeeRecipient(events: DexEvent[]): void {
  const zero = defaultPubkey();
  const mintToFee = new Map<string, string>();

  for (const ev of events) {
    const t = pumpfunTradeEvent(ev);
    if (!t || !t.mint || t.mint === zero || !t.fee_recipient || t.fee_recipient === zero) {
      continue;
    }
    const buyLike =
      ("PumpFunTrade" in ev && t.is_buy) ||
      "PumpFunBuy" in ev ||
      "PumpFunBuyExactSolIn" in ev;
    if (buyLike && !mintToFee.has(t.mint)) {
      mintToFee.set(t.mint, t.fee_recipient);
    }
  }

  if (mintToFee.size === 0) return;

  for (const ev of events) {
    if (!("PumpFunCreateV2" in ev)) continue;
    const c = ev.PumpFunCreateV2;
    if (!c.observed_fee_recipient || c.observed_fee_recipient === zero) {
      c.observed_fee_recipient = mintToFee.get(c.mint) ?? c.observed_fee_recipient;
    }
  }
}

export function enrichPumpfunTradesFromCreateInstructions(events: DexEvent[]): void {
  const flags = new Map<string, [boolean, boolean]>();
  for (const ev of events) {
    const f = pumpfunCreateFlags(ev);
    if (f && !flags.has(f[0])) flags.set(f[0], [f[1], f[2]]);
  }
  if (flags.size === 0) return;

  for (const ev of events) {
    const t = pumpfunTradeEvent(ev);
    if (!t || !t.mint || t.mint === defaultPubkey()) continue;
    const f = flags.get(t.mint);
    if (!f) continue;
    const [cashbackEnabled, mayhemMode] = f;
    t.is_cashback_coin ||= cashbackEnabled;
    t.mayhem_mode ||= mayhemMode;
    if (cashbackEnabled) t.track_volume = true;
  }
}

export function enrichPumpfunSameTxPostMerge(events: DexEvent[]): void {
  enrichCreateV2FromCreateEvents(events);
  enrichCreateV2ObservedFeeRecipient(events);
  enrichPumpfunTradesFromCreateInstructions(events);
}
