/** Full subscription bytes and validated liquidity identities, without RPC. */
import bs58 from "bs58";
import type { AccountData } from "./accounts/types.js";
import type { EventMetadata } from "./core/metadata.js";
import { ROUTE_PROGRAMS } from "./transaction_route.js";
export interface RawAccountSnapshotEvent {
  metadata: EventMetadata;
  account: AccountData;
  write_version: bigint;
  is_startup: boolean;
}
export type LiquiditySnapshotKind =
  | "LaunchLabGlobalConfig"
  | "LaunchLabPlatformConfig"
  | {
      LaunchLabPool: {
        base_mint: string;
        quote_mint: string;
        global_config: string;
        platform_config: string;
      };
    }
  | {
      DlmmPool: {
        token_x_mint: string;
        token_y_mint: string;
        active_id: number;
        bin_step: number;
      };
    }
  | { DlmmBinArray: { pool: string; index: bigint } }
  | { DlmmBitmap: { pool: string } }
  | {
      OrcaDynamicTickArray: {
        pool: string;
        start_tick_index: number;
        tick_bitmap: bigint;
      };
    }
  | { OrcaAdaptiveOracle: { pool: string } }
  | { ClmmBitmap: { pool: string } };
export interface LiquidityAccountSnapshotEvent {
  metadata: EventMetadata;
  pubkey: string;
  owner: string;
  kind: LiquiditySnapshotKind;
  data: Uint8Array;
}
export function parseLiquidityAccount(
  account: AccountData,
  metadata: EventMetadata,
): LiquidityAccountSnapshotEvent | null {
  if (account.lamports <= 0n || account.executable) return null;
  const d = Buffer.from(account.data),
    disc = d.subarray(0, 8).toString("hex"),
    owner = account.owner,
    key = (o: number) => bs58.encode(d.subarray(o, o + 32));
  let kind: LiquiditySnapshotKind | undefined;
  if (owner === ROUTE_PROGRAMS.LaunchLab) {
    if (disc === "f7ede3f5d7c3de46" && d.length >= 429)
      kind = {
        LaunchLabPool: {
          base_mint: key(205),
          quote_mint: key(237),
          global_config: key(141),
          platform_config: key(173),
        },
      };
    else if (disc === "95089ccaa0fcb0d9" && d.length >= 35)
      kind = "LaunchLabGlobalConfig";
    else if (disc === "a04e8000f853e6a0" && d.length >= 728)
      kind = "LaunchLabPlatformConfig";
  } else if (owner === ROUTE_PROGRAMS.MeteoraDlmm) {
    if (disc === "210b3162b565b10d" && d.length >= 904)
      kind = {
        DlmmPool: {
          token_x_mint: key(88),
          token_y_mint: key(120),
          active_id: d.readInt32LE(76),
          bin_step: d.readUInt16LE(80),
        },
      };
    else if (disc === "5c8e5cdc059446b5" && d.length >= 10136)
      kind = { DlmmBinArray: { pool: key(24), index: d.readBigInt64LE(8) } };
    else if (disc === "506f7c7137ed1205" && d.length >= 1576)
      kind = { DlmmBitmap: { pool: key(8) } };
  } else if (owner === ROUTE_PROGRAMS.OrcaWhirlpool) {
    if (disc === "11d8f68ee1c7da38" && d.length >= 148) {
      const bitmap = d.readBigUInt64LE(44) + (d.readBigUInt64LE(52) << 64n);
      if (bitmap >> 88n) return null;
      let offset = 60;
      for (let i = 0; i < 88; i++) {
        const tag = d[offset];
        if (
          offset >= d.length ||
          (tag !== 0 && tag !== 1) ||
          tag !== Number((bitmap >> BigInt(i)) & 1n)
        )
          return null;
        offset += 1 + (tag ? 112 : 0);
        if (offset > d.length) return null;
      }
      kind = {
        OrcaDynamicTickArray: {
          pool: key(12),
          start_tick_index: d.readInt32LE(8),
          tick_bitmap: bitmap,
        },
      };
    } else if (disc === "8bc283b38cb3e5f4" && d.length >= 254)
      kind = { OrcaAdaptiveOracle: { pool: key(8) } };
  } else if (
    owner === ROUTE_PROGRAMS.RaydiumClmm &&
    disc === "3c9624db61808b99" &&
    d.length >= 1832
  )
    kind = { ClmmBitmap: { pool: key(8) } };
  return kind
    ? {
        metadata,
        pubkey: account.pubkey,
        owner,
        kind,
        data: Uint8Array.from(d),
      }
    : null;
}
