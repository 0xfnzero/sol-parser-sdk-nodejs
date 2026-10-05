/**
 * Raydium LaunchLab 指令解析
 *
 * 1) **Program data 日志形载荷**（与 `logs/raydium_launchlab` 一致）：前 8 字节为事件 disc，后跟 pool/user/金额…
 * 2) **Anchor 外层指令**：`global:buy` / `sell` / `create_pool` / `migrate_to_amm` 等（sha256 前 8 字节），参数多为 Borsh u64。
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import {
  RAYDIUM_LAUNCHLAB_DISC,
  parseRaydiumLaunchlabPoolCreateFromData,
  parseRaydiumLaunchlabTradeFromData,
} from "../logs/raydium_launchlab.js";
import {
  getAccount,
  ixMeta,
  readBorshStrAt,
  readU64LE,
  readU8,
} from "./utils.js";

const Z = defaultPubkey();

/** Anchor `sha256("global:<name>")[0..8]`，与链上 LaunchLab / pAMM 系指令一致 */
const ANCHOR = {
  BUY_EXACT_IN: [250, 234, 13, 123, 213, 156, 19, 236] as const,
  BUY_EXACT_OUT: [24, 211, 116, 40, 105, 3, 153, 56] as const,
  INITIALIZE: [175, 175, 109, 31, 13, 152, 155, 237] as const,
  INITIALIZE_V2: [67, 153, 175, 39, 218, 16, 38, 32] as const,
  INITIALIZE_WITH_TOKEN_2022: [37, 190, 126, 222, 44, 154, 171, 17] as const,
  SELL_EXACT_OUT: [95, 200, 71, 34, 8, 9, 11, 166] as const,
  SELL_EXACT_IN: [149, 39, 222, 155, 211, 124, 152, 26] as const,
  MIGRATE_TO_AMM: [207, 82, 192, 145, 254, 207, 145, 223] as const,
  MIGRATE_TO_CPSWAP: [136, 92, 200, 103, 28, 218, 144, 140] as const,
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
function parseMintParams(
  payload: Uint8Array,
): { symbol: string; name: string; uri: string; decimals: number } | null {
  const decimals = readU8(payload, 0);
  if (decimals === null) return null;
  let o = 1;
  const name = readBorshStrAt(payload, o);
  if (!name) return null;
  o = name.next;
  const symbol = readBorshStrAt(payload, o);
  if (!symbol) return null;
  o = symbol.next;
  const uri = readBorshStrAt(payload, o);
  if (!uri) return null;
  return { symbol: symbol.s, name: name.s, uri: uri.s, decimals };
}

function tradeFromTwoU64(
  payload: Uint8Array,
  accounts: string[],
  meta: ReturnType<typeof ixMeta>,
  isBuy: boolean,
  exactIn: boolean,
): DexEvent | null {
  if (payload.length < 16 || accounts.length < 5) return null;
  const first = readU64LE(payload, 0) ?? 0n;
  const second = readU64LE(payload, 8) ?? 0n;
  const amount_in = exactIn ? first : second;
  const amount_out = exactIn ? second : first;
  const pool = getAccount(accounts, 4) ?? Z;
  const user = getAccount(accounts, 0) ?? Z;
  return {
    RaydiumLaunchlabTrade: {
      metadata: meta,
      pool_state: pool,
      user,
      amount_in,
      amount_out,
      is_buy: isBuy,
      trade_direction: isBuy ? "Buy" : "Sell",
      total_base_sell: 0n,
      virtual_base: 0n,
      virtual_quote: 0n,
      real_base_before: 0n,
      real_quote_before: 0n,
      real_base_after: 0n,
      real_quote_after: 0n,
      protocol_fee: 0n,
      platform_fee: 0n,
      creator_fee: 0n,
      share_fee: 0n,
      pool_status: "Fund",
      global_config: getAccount(accounts, 2) ?? Z,
      platform_config: getAccount(accounts, 3) ?? Z,
      user_base_token: getAccount(accounts, 5) ?? Z,
      user_quote_token: getAccount(accounts, 6) ?? Z,
      base_vault: getAccount(accounts, 7) ?? Z,
      quote_vault: getAccount(accounts, 8) ?? Z,
      base_mint: getAccount(accounts, 9) ?? Z,
      quote_mint: getAccount(accounts, 10) ?? Z,
      base_token_program: getAccount(accounts, 11) ?? Z,
      quote_token_program: getAccount(accounts, 12) ?? Z,
      system_program: getAccount(accounts, 15) ?? Z,
      platform_associated_account: getAccount(accounts, 16) ?? Z,
      creator_associated_account: getAccount(accounts, 17) ?? Z,
      exact_in: exactIn,
    },
  };
}

export function parseRaydiumLaunchlabInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  blockTimeUs: number | bigint | string | undefined,
  grpcRecvUs: number | bigint | string,
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  // --- Program data 事件形（与链上 emit 载荷一致，偶见于外层） ---
  if (discEqU64(instructionData, RAYDIUM_LAUNCHLAB_DISC.TRADE)) {
    return parseRaydiumLaunchlabTradeFromData(
      instructionData.subarray(8),
      meta,
    );
  }
  if (discEqU64(instructionData, RAYDIUM_LAUNCHLAB_DISC.POOL_CREATE)) {
    return parseRaydiumLaunchlabPoolCreateFromData(
      instructionData.subarray(8),
      meta,
    );
  }

  const rest = instructionData.subarray(8);

  // --- Anchor：买卖（两 u64） ---
  if (headEq(instructionData, ANCHOR.BUY_EXACT_IN)) {
    if (rest.length < 16) return null;
    return tradeFromTwoU64(rest, accounts, meta, true, true);
  }
  if (headEq(instructionData, ANCHOR.BUY_EXACT_OUT)) {
    if (rest.length < 16) return null;
    return tradeFromTwoU64(rest, accounts, meta, true, false);
  }
  if (headEq(instructionData, ANCHOR.SELL_EXACT_IN)) {
    if (rest.length < 16) return null;
    return tradeFromTwoU64(rest, accounts, meta, false, true);
  }
  if (headEq(instructionData, ANCHOR.SELL_EXACT_OUT)) {
    if (rest.length < 16) return null;
    return tradeFromTwoU64(rest, accounts, meta, false, false);
  }

  if (
    headEq(instructionData, ANCHOR.INITIALIZE) ||
    headEq(instructionData, ANCHOR.INITIALIZE_V2) ||
    headEq(instructionData, ANCHOR.INITIALIZE_WITH_TOKEN_2022)
  ) {
    if (accounts.length < 6) return null;
    const base_mint_param = parseMintParams(rest);
    if (!base_mint_param) return null;
    return {
      RaydiumLaunchlabPoolCreate: {
        metadata: meta,
        base_mint_param,
        pool_state: getAccount(accounts, 5) ?? Z,
        creator: getAccount(accounts, 1) ?? Z,
        payer: getAccount(accounts, 0) ?? Z,
        global_config: getAccount(accounts, 2) ?? Z,
        platform_config: getAccount(accounts, 3) ?? Z,
        base_mint: getAccount(accounts, 6) ?? Z,
        quote_mint: getAccount(accounts, 7) ?? Z,
        base_vault: getAccount(accounts, 8) ?? Z,
        quote_vault: getAccount(accounts, 9) ?? Z,
        base_token_program:
          getAccount(
            accounts,
            headEq(instructionData, ANCHOR.INITIALIZE_WITH_TOKEN_2022)
              ? 10
              : 11,
          ) ?? Z,
        quote_token_program:
          getAccount(
            accounts,
            headEq(instructionData, ANCHOR.INITIALIZE_WITH_TOKEN_2022)
              ? 11
              : 12,
          ) ?? Z,
      },
    };
  }

  if (
    headEq(instructionData, ANCHOR.MIGRATE_TO_AMM) ||
    headEq(instructionData, ANCHOR.MIGRATE_TO_CPSWAP)
  ) {
    const cp = headEq(instructionData, ANCHOR.MIGRATE_TO_CPSWAP);
    if (
      accounts.length < (cp ? 28 : 32) ||
      (!cp && instructionData.length < 17)
    )
      return null;
    return {
      RaydiumLaunchlabMigrateAmm: {
        metadata: meta,
        old_pool: accounts[cp ? 17 : 23]!,
        new_pool: accounts[cp ? 5 : 13]!,
        user: accounts[0]!,
        liquidity_amount: 0n,
        liquidity_amount_known: false,
        base_mint: accounts[1]!,
        quote_mint: accounts[2]!,
        platform_config: cp ? accounts[3]! : Z,
        destination_program: accounts[cp ? 4 : 12]!,
      },
    };
  }

  return null;
}
