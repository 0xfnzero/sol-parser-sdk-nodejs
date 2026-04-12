/**
 * 与 Rust `accounts/utils::user_wallet_pubkey_for_onchain_account` 对齐：
 * 由链上账户 owner / data / executable 推断「用户钱包」公钥（Base58）。
 */
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { readPubkey } from "../util/binary.js";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBase58();
const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb").toBase58();
const SYSTEM = SystemProgram.programId.toBase58();
/** SPL Token `Account` 布局长度（与 `spl_token::state::Account::LEN` 一致） */
const SPL_TOKEN_ACCOUNT_LEN = 165;

function isTokenProgramOwner(owner: string): boolean {
  return owner === TOKEN_PROGRAM || owner === TOKEN_2022;
}

export function userWalletPubkeyForOnchainAccount(
  address: string,
  owner: string,
  data: Uint8Array,
  executable: boolean
): string | null {
  if (executable) return null;
  if (owner === SYSTEM) {
    return data.length === 0 ? address : null;
  }
  if (isTokenProgramOwner(owner) && data.length === SPL_TOKEN_ACCOUNT_LEN) {
    return readPubkey(data, 32);
  }
  return null;
}
