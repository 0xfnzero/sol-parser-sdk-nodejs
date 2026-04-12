/**
 * Raydium AMM V4 指令解析
 * 单字节 discriminator；Swap 账户顺序与链上 `SwapBaseIn`/`SwapBaseOut` 一致（18 个账户）。
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

const INSTR_TYPE = {
  SWAP_BASE_IN: 9,
  SWAP_BASE_OUT: 11,
};

/** 指令内账户顺序（与 Raydium AMM V4 swap 一致） */
const SWAP = {
  TOKEN_PROGRAM: 0,
  AMM: 1,
  AMM_AUTHORITY: 2,
  AMM_OPEN_ORDERS: 3,
  AMM_TARGET_ORDERS: 4,
  POOL_COIN_TOKEN: 5,
  POOL_PC_TOKEN: 6,
  SERUM_PROGRAM: 7,
  SERUM_MARKET: 8,
  SERUM_BIDS: 9,
  SERUM_ASKS: 10,
  SERUM_EVENT_QUEUE: 11,
  SERUM_COIN_VAULT: 12,
  SERUM_PC_VAULT: 13,
  SERUM_VAULT_SIGNER: 14,
  USER_SOURCE_TOKEN: 15,
  USER_DEST_TOKEN: 16,
  USER_OWNER: 17,
} as const;

function swapBaseInFromIx(
  instructionData: Uint8Array,
  accounts: string[],
  meta: ReturnType<typeof ixMeta>
): DexEvent | null {
  if (instructionData.length < 1 + 8 + 8) return null;
  const amount_in = readU64LE(instructionData, 1) ?? 0n;
  const minimum_amount_out = readU64LE(instructionData, 9) ?? 0n;
  const g = (i: number) => getAccount(accounts, i) ?? Z;
  return {
    RaydiumAmmV4Swap: {
      metadata: meta,
      amount_in,
      minimum_amount_out,
      max_amount_in: 0n,
      amount_out: 0n,
      token_program: g(SWAP.TOKEN_PROGRAM),
      amm: g(SWAP.AMM),
      amm_authority: g(SWAP.AMM_AUTHORITY),
      amm_open_orders: g(SWAP.AMM_OPEN_ORDERS),
      amm_target_orders: g(SWAP.AMM_TARGET_ORDERS),
      pool_coin_token_account: g(SWAP.POOL_COIN_TOKEN),
      pool_pc_token_account: g(SWAP.POOL_PC_TOKEN),
      serum_program: g(SWAP.SERUM_PROGRAM),
      serum_market: g(SWAP.SERUM_MARKET),
      serum_bids: g(SWAP.SERUM_BIDS),
      serum_asks: g(SWAP.SERUM_ASKS),
      serum_event_queue: g(SWAP.SERUM_EVENT_QUEUE),
      serum_coin_vault_account: g(SWAP.SERUM_COIN_VAULT),
      serum_pc_vault_account: g(SWAP.SERUM_PC_VAULT),
      serum_vault_signer: g(SWAP.SERUM_VAULT_SIGNER),
      user_source_token_account: g(SWAP.USER_SOURCE_TOKEN),
      user_destination_token_account: g(SWAP.USER_DEST_TOKEN),
      user_source_owner: g(SWAP.USER_OWNER),
    },
  };
}

function swapBaseOutFromIx(
  instructionData: Uint8Array,
  accounts: string[],
  meta: ReturnType<typeof ixMeta>
): DexEvent | null {
  if (instructionData.length < 1 + 8 + 8) return null;
  const max_amount_in = readU64LE(instructionData, 1) ?? 0n;
  const amount_out = readU64LE(instructionData, 9) ?? 0n;
  const g = (i: number) => getAccount(accounts, i) ?? Z;
  return {
    RaydiumAmmV4Swap: {
      metadata: meta,
      amount_in: 0n,
      minimum_amount_out: 0n,
      max_amount_in,
      amount_out,
      token_program: g(SWAP.TOKEN_PROGRAM),
      amm: g(SWAP.AMM),
      amm_authority: g(SWAP.AMM_AUTHORITY),
      amm_open_orders: g(SWAP.AMM_OPEN_ORDERS),
      amm_target_orders: g(SWAP.AMM_TARGET_ORDERS),
      pool_coin_token_account: g(SWAP.POOL_COIN_TOKEN),
      pool_pc_token_account: g(SWAP.POOL_PC_TOKEN),
      serum_program: g(SWAP.SERUM_PROGRAM),
      serum_market: g(SWAP.SERUM_MARKET),
      serum_bids: g(SWAP.SERUM_BIDS),
      serum_asks: g(SWAP.SERUM_ASKS),
      serum_event_queue: g(SWAP.SERUM_EVENT_QUEUE),
      serum_coin_vault_account: g(SWAP.SERUM_COIN_VAULT),
      serum_pc_vault_account: g(SWAP.SERUM_PC_VAULT),
      serum_vault_signer: g(SWAP.SERUM_VAULT_SIGNER),
      user_source_token_account: g(SWAP.USER_SOURCE_TOKEN),
      user_destination_token_account: g(SWAP.USER_DEST_TOKEN),
      user_source_owner: g(SWAP.USER_OWNER),
    },
  };
}

export function parseRaydiumAmmV4Instruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 1) return null;

  const instrType = instructionData[0];
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (instrType === INSTR_TYPE.SWAP_BASE_IN) {
    return swapBaseInFromIx(instructionData, accounts, meta);
  }
  if (instrType === INSTR_TYPE.SWAP_BASE_OUT) {
    return swapBaseOutFromIx(instructionData, accounts, meta);
  }

  return null;
}
