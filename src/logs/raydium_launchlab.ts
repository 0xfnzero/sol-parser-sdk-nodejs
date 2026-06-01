/** Raydium LaunchLab 日志解析 */
import type { EventMetadata } from "../core/metadata.js";
import type { RaydiumLaunchlabPoolCreateEvent, RaydiumLaunchlabTradeEvent, DexEvent } from "../core/dex_event.js";
import { readBool, readBorshString, readPubkey, readU64LE, readU8 } from "../util/binary.js";

function disc(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

export const RAYDIUM_LAUNCHLAB_DISC = {
  TRADE: disc([189, 219, 127, 211, 78, 230, 97, 238]),
  POOL_CREATE: disc([151, 215, 226, 9, 118, 161, 115, 174]),
};

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

export function parseRaydiumLaunchlabTradeFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const pool_state = readPubkey(data, 0);
  const amount_in = readU64LE(data, 88);
  const amount_out = readU64LE(data, 96);
  const trade_direction = readU8(data, 136);
  const exact_in = readBool(data, 138);
  if (!pool_state || amount_in === null || amount_out === null || trade_direction === null || exact_in === null) {
    return null;
  }
  const is_buy = trade_direction === 0;
  const ev: RaydiumLaunchlabTradeEvent = {
    metadata,
    pool_state,
    user: "11111111111111111111111111111111",
    amount_in: bn64(amount_in),
    amount_out: bn64(amount_out),
    is_buy,
    trade_direction: is_buy ? "Buy" : "Sell",
    exact_in,
  };
  return { RaydiumLaunchlabTrade: ev };
}

export function parseRaydiumLaunchlabPoolCreateFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length < 97) return null;
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  const creator = readPubkey(data, o)!;
  o += 32;
  const config = readPubkey(data, o);
  if (!pool_state || !creator || !config) return null;
  o += 32;
  const decimals = readU8(data, o);
  if (decimals === null) return null;
  o += 1;
  const name = readBorshString(data, o);
  if (!name) return null;
  o = name.next;
  const symbol = readBorshString(data, o);
  if (!symbol) return null;
  o = symbol.next;
  const uri = readBorshString(data, o);
  if (!uri) return null;
  const ev: RaydiumLaunchlabPoolCreateEvent = {
    metadata,
    base_mint_param: { symbol: symbol.s, name: name.s, uri: uri.s, decimals },
    pool_state,
    creator,
  };
  return { RaydiumLaunchlabPoolCreate: ev };
}

export function parseRaydiumLaunchlabFromDiscriminator(
  discriminator: bigint,
  data: Uint8Array,
  metadata: EventMetadata
): DexEvent | null {
  if (discriminator === RAYDIUM_LAUNCHLAB_DISC.TRADE) return parseRaydiumLaunchlabTradeFromData(data, metadata);
  if (discriminator === RAYDIUM_LAUNCHLAB_DISC.POOL_CREATE) return parseRaydiumLaunchlabPoolCreateFromData(data, metadata);
  return null;
}
