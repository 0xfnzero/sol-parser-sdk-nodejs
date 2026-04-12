/**
 * 与 Rust `accounts::rpc_resolve_user_wallet_pubkey` 对齐（异步 RPC）。
 */
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { userWalletPubkeyForOnchainAccount } from "./wallet_resolve.js";

export async function rpcResolveUserWalletPubkey(
  connection: Connection,
  addressBs58: string
): Promise<string | null> {
  let pk: PublicKey;
  try {
    pk = new PublicKey(addressBs58);
  } catch {
    return null;
  }
  const acc = await connection.getAccountInfo(pk);
  if (!acc) return null;
  return userWalletPubkeyForOnchainAccount(
    addressBs58,
    acc.owner.toBase58(),
    acc.data,
    acc.executable
  );
}
