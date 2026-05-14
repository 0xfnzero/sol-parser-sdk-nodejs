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
  enrichCreateV2ObservedFeeRecipient(events);
  enrichPumpfunTradesFromCreateInstructions(events);
}
