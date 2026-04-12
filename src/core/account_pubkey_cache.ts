/**
 * 与 Rust `sol-parser-sdk/src/core/cache.rs` 对齐：账户公钥索引解析缓存。
 * JS 主线程单线程，使用模块级单例代替 Rust `thread_local`。
 */
import { PublicKey } from "@solana/web3.js";

export class AccountPubkeyCache {
  private readonly cache: PublicKey[] = [];

  /** 与 Rust `AccountPubkeyCache::build_account_pubkeys` 一致 */
  buildAccountPubkeys(
    instructionAccounts: Uint8Array | readonly number[],
    allAccounts: readonly PublicKey[]
  ): PublicKey[] {
    this.cache.length = 0;
    for (let i = 0; i < instructionAccounts.length; i++) {
      const idx = instructionAccounts[i]!;
      if (idx < allAccounts.length) {
        this.cache.push(allAccounts[idx]!);
      }
    }
    return this.cache;
  }
}

let threadLocalLike: AccountPubkeyCache | undefined;

/** 与 Rust `build_account_pubkeys_with_cache` 一致（返回 `Vec` 拷贝，与 Rust `.to_vec()` 相同） */
export function buildAccountPubkeysWithCache(
  instructionAccounts: Uint8Array | readonly number[],
  allAccounts: readonly PublicKey[]
): PublicKey[] {
  if (!threadLocalLike) threadLocalLike = new AccountPubkeyCache();
  return [...threadLocalLike.buildAccountPubkeys(instructionAccounts, allAccounts)];
}
