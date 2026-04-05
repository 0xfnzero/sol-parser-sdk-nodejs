import type { EventMetadata } from "../core/metadata.js";
import type { DexEvent, NonceAccountEvent } from "../core/dex_event.js";
import type { AccountData } from "./types.js";
import { hasDiscriminator } from "./utils.js";
import bs58 from "bs58";

const NONCE_SIZE = 80;
const NONCE_DISC = Uint8Array.from([1, 0, 0, 0, 1, 0, 0, 0]);

export function isNonceAccount(data: Uint8Array): boolean {
  return data.length >= 8 && hasDiscriminator(data, NONCE_DISC);
}

export function parseNonceAccount(account: AccountData, metadata: EventMetadata): DexEvent | null {
  const { data } = account;
  if (data.length !== NONCE_SIZE) return null;
  const authority = bs58.encode(data.subarray(8, 40));
  const nonce = bs58.encode(data.subarray(40, 72));
  const ev: NonceAccountEvent = {
    metadata,
    pubkey: account.pubkey,
    executable: account.executable,
    lamports: account.lamports,
    owner: account.owner,
    rent_epoch: account.rent_epoch,
    nonce,
    authority,
  };
  return { NonceAccount: ev };
}
