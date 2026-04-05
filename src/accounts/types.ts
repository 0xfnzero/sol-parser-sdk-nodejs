/** 账户解析结果载体 */
export interface AccountData {
  pubkey: string;
  executable: boolean;
  lamports: bigint;
  owner: string;
  rent_epoch: bigint;
  data: Uint8Array;
}
