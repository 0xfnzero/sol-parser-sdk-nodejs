/**
 * Bonk / Raydium Launchpad 指令解析
 *
 * 1) **Program data 日志形载荷**（与 `logs/raydium_launchpad` 一致）：前 8 字节为事件 disc，后跟 pool/user/金额…
 * 2) **Anchor 外层指令**：`global:buy` / `sell` / `create_pool` / `migrate_to_amm` 等（sha256 前 8 字节），参数多为 Borsh u64。
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import {
  BONK_DISC,
  parseBonkMigrateAmmFromData,
  parseBonkPoolCreateFromData,
  parseBonkTradeFromData,
} from "../logs/raydium_launchpad.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

/** Anchor `sha256("global:<name>")[0..8]`，与链上 Launchpad / pAMM 系指令一致 */
const ANCHOR = {
  BUY: [102, 6, 61, 18, 1, 218, 235, 234] as const,
  SELL: [51, 230, 133, 164, 1, 127, 131, 173] as const,
  BUY_EXACT_IN: [250, 234, 13, 123, 213, 156, 19, 236] as const,
  SELL_EXACT_OUT: [95, 200, 71, 34, 8, 9, 11, 166] as const,
  CREATE_POOL: [233, 146, 209, 142, 207, 104, 64, 188] as const,
  MIGRATE_TO_AMM: [207, 82, 192, 145, 254, 207, 145, 223] as const,
} as const;

function discEqU64(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

function headEq(data: Uint8Array, bytes: readonly number[]): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) if (data[i] !== bytes[i]) return false;
  return true;
}

/** 与 PumpSwap buy/sell 一致：两 u64（base / quote 侧限额） */
function tradeFromTwoU64(
  payload: Uint8Array,
  accounts: string[],
  meta: ReturnType<typeof ixMeta>,
  mode: "buy" | "sell"
): DexEvent {
  const a0 = readU64LE(payload, 0) ?? 0n;
  const a1 = readU64LE(payload, 8) ?? 0n;
  const pool = getAccount(accounts, 1) ?? Z;
  const user = getAccount(accounts, 0) ?? Z;
  if (mode === "buy") {
    return {
      BonkTrade: {
        metadata: meta,
        pool_state: pool,
        user,
        amount_in: a1,
        amount_out: a0,
        is_buy: true,
        trade_direction: "Buy",
        exact_in: true,
      },
    };
  }
  return {
    BonkTrade: {
      metadata: meta,
      pool_state: pool,
      user,
      amount_in: a0,
      amount_out: a1,
      is_buy: false,
      trade_direction: "Sell",
      exact_in: true,
    },
  };
}

export function parseBonkInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  // --- Program data 事件形（与链上 emit 载荷一致，偶见于外层） ---
  if (discEqU64(instructionData, BONK_DISC.TRADE)) {
    return parseBonkTradeFromData(instructionData.subarray(8), meta);
  }
  if (discEqU64(instructionData, BONK_DISC.POOL_CREATE)) {
    return parseBonkPoolCreateFromData(instructionData.subarray(8), meta);
  }
  if (discEqU64(instructionData, BONK_DISC.MIGRATE_AMM)) {
    return parseBonkMigrateAmmFromData(instructionData.subarray(8), meta);
  }

  const rest = instructionData.subarray(8);

  // --- Anchor：买卖（两 u64） ---
  if (headEq(instructionData, ANCHOR.BUY) || headEq(instructionData, ANCHOR.BUY_EXACT_IN)) {
    if (rest.length < 16) return null;
    return tradeFromTwoU64(rest, accounts, meta, "buy");
  }
  if (headEq(instructionData, ANCHOR.SELL) || headEq(instructionData, ANCHOR.SELL_EXACT_OUT)) {
    if (rest.length < 16) return null;
    return tradeFromTwoU64(rest, accounts, meta, "sell");
  }

  // --- create_pool：优先按日志形载荷解析；否则用账户兜底 ---
  if (headEq(instructionData, ANCHOR.CREATE_POOL)) {
    const parsed = parseBonkPoolCreateFromData(rest, meta);
    if (parsed) return parsed;
    if (accounts.length >= 9) {
      return {
        BonkPoolCreate: {
          metadata: meta,
          base_mint_param: {
            symbol: "BONK",
            name: "Bonk Pool",
            uri: "https://bonk.com",
            decimals: 5,
          },
          pool_state: getAccount(accounts, 1) ?? Z,
          creator: getAccount(accounts, 8) ?? Z,
        },
      };
    }
    return null;
  }

  // --- migrate_to_amm ---
  if (headEq(instructionData, ANCHOR.MIGRATE_TO_AMM)) {
    const parsed = parseBonkMigrateAmmFromData(rest, meta);
    if (parsed) return parsed;
    if (rest.length >= 8 && accounts.length >= 3) {
      return {
        BonkMigrateAmm: {
          metadata: meta,
          old_pool: getAccount(accounts, 0) ?? Z,
          new_pool: getAccount(accounts, 1) ?? Z,
          user: getAccount(accounts, 2) ?? Z,
          liquidity_amount: readU64LE(rest, 0) ?? 0n,
        },
      };
    }
    return null;
  }

  return null;
}
