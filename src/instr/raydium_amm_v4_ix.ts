/**
 * Raydium AMM V4 指令解析
 * 注意：Raydium AMM V4 使用单字节 instruction discriminator
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta } from "./utils.js";

const Z = defaultPubkey();

// Raydium AMM V4 使用单字节指令类型
const INSTR_TYPE = {
  SWAP_BASE_IN: 9,
  SWAP_BASE_OUT: 11,
};

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

  if (instrType === INSTR_TYPE.SWAP_BASE_IN || instrType === INSTR_TYPE.SWAP_BASE_OUT) {
    return {
      RaydiumAmmV4Swap: {
        metadata: meta,
        amm: getAccount(accounts, 1) ?? Z,
        user_source_owner: getAccount(accounts, 17) ?? Z,
        amount_in: 0n,
        minimum_amount_out: 0n,
        max_amount_in: 0n,
        amount_out: 0n,
        token_program: Z,
        amm_authority: Z,
        amm_open_orders: Z,
        pool_coin_token_account: Z,
        pool_pc_token_account: Z,
        serum_program: Z,
        serum_market: Z,
        serum_bids: Z,
        serum_asks: Z,
        serum_event_queue: Z,
        serum_coin_vault_account: Z,
        serum_pc_vault_account: Z,
        serum_vault_signer: Z,
        user_source_token_account: Z,
        user_destination_token_account: Z,
      },
    };
  }

  return null;
}
