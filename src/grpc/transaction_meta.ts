/**
 * Yellowstone `Transaction` / `TransactionStatusMeta` 通用工具（与 Rust `grpc/transaction_meta` 对齐）。
 * 不依赖 DEX 日志解析，用于 mentions 订阅后的 SOL/SPL 转账启发式分析等。
 */
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import type {
  TokenBalance,
  Transaction,
  TransactionStatusMeta,
} from "@triton-one/yellowstone-grpc/dist/grpc/solana-storage.js";

/** 32 字节公钥 → Base58（无效长度返回 `null`） */
export function pubkeyBytesToBs58(bytes: Uint8Array): string | null {
  if (bytes.length !== 32) return null;
  try {
    return new PublicKey(bytes).toBase58();
  } catch {
    return null;
  }
}

/**
 * 消息静态 `accountKeys` + meta 中 `loadedWritableAddresses` / `loadedReadonlyAddresses`，
 * 顺序与 `preBalances` / `postBalances` 对齐。
 */
export function collectAccountKeysBs58(
  tx: Transaction,
  meta: TransactionStatusMeta
): string[] | null {
  const msg = tx.message;
  if (!msg) return null;
  const keys: string[] = [];
  for (const b of msg.accountKeys) {
    const s = pubkeyBytesToBs58(b);
    if (!s) continue;
    keys.push(s);
  }
  for (const b of meta.loadedWritableAddresses) {
    const s = pubkeyBytesToBs58(b);
    if (!s) continue;
    keys.push(s);
  }
  for (const b of meta.loadedReadonlyAddresses) {
    const s = pubkeyBytesToBs58(b);
    if (!s) continue;
    keys.push(s);
  }
  return keys;
}

/** 每个账户索引的 lamports 变化（post − pre） */
export function lamportBalanceDeltas(meta: TransactionStatusMeta): bigint[] {
  const n = Math.min(meta.preBalances.length, meta.postBalances.length);
  const out: bigint[] = [];
  for (let i = 0; i < n; i++) {
    out.push(BigInt(meta.postBalances[i] ?? "0") - BigInt(meta.preBalances[i] ?? "0"));
  }
  return out;
}

/**
 * 启发式原生 SOL：对 `watchedBs58` 中出现的账户，若 lamports 净减少 ≥ `minOutflowLamports`，
 * 再与其它索引配对，要求对方 delta ≥ `minOutflowLamports/2`。
 */
export function heuristicSolCounterpartiesForWatchedKeys(
  accountKeysBs58: string[],
  lamportDeltas: bigint[],
  watchedBs58: Set<string>,
  minOutflowLamports: bigint
): [string, string][] {
  const minL = minOutflowLamports;
  const half = minL / 2n;
  const pairs: [string, string][] = [];
  for (let i = 0; i < accountKeysBs58.length; i++) {
    const key = accountKeysBs58[i]!;
    if (!watchedBs58.has(key)) continue;
    const d = lamportDeltas[i] ?? 0n;
    if (d >= -minL) continue;
    for (let j = 0; j < lamportDeltas.length; j++) {
      if (i === j) continue;
      const dj = lamportDeltas[j] ?? 0n;
      if (dj <= half) continue;
      pairs.push([key, accountKeysBs58[j]!]);
    }
  }
  return pairs;
}

/** `TokenBalance.uiTokenAmount.amount` → 原始整数；解析失败为 `0n` */
export function tokenBalanceRawAmount(t: TokenBalance): bigint {
  const a = t.uiTokenAmount?.amount;
  if (a === undefined || a === "") return 0n;
  try {
    return BigInt(a);
  } catch {
    return 0n;
  }
}

function mapKey(mint: string, owner: string): string {
  return `${mint}\0${owner}`;
}

function parseMapKey(k: string): { mint: string; owner: string } | null {
  const i = k.indexOf("\0");
  if (i <= 0) return null;
  return { mint: k.slice(0, i), owner: k.slice(i + 1) };
}

/**
 * SPL：当 `watchOwnerBs58` 在某 mint 上余额净减少 ≥ `minWatchDecreaseRaw` 时，
 * 找同 mint 下余额增加的其它 owner，返回 `(watch_owner, counterparty_owner)`。
 */
export function splTokenCounterpartyByOwner(
  meta: TransactionStatusMeta,
  watchOwnerBs58: string,
  minWatchDecreaseRaw: bigint
): [string, string][] {
  const pre = meta.preTokenBalances ?? [];
  const post = meta.postTokenBalances ?? [];

  const preM = new Map<string, bigint>();
  for (const b of pre) {
    if (!b.owner) continue;
    const k = mapKey(b.mint, b.owner);
    preM.set(k, (preM.get(k) ?? 0n) + tokenBalanceRawAmount(b));
  }
  const postM = new Map<string, bigint>();
  for (const b of post) {
    if (!b.owner) continue;
    const k = mapKey(b.mint, b.owner);
    postM.set(k, (postM.get(k) ?? 0n) + tokenBalanceRawAmount(b));
  }

  const mints = new Set<string>();
  for (const k of preM.keys()) {
    const p = parseMapKey(k);
    if (p && p.owner === watchOwnerBs58) mints.add(p.mint);
  }
  for (const k of postM.keys()) {
    const p = parseMapKey(k);
    if (p && p.owner === watchOwnerBs58) mints.add(p.mint);
  }

  const out: [string, string][] = [];
  const minL = minWatchDecreaseRaw > 0n ? minWatchDecreaseRaw : 1n;

  for (const mint of mints) {
    const wPre = preM.get(mapKey(mint, watchOwnerBs58)) ?? 0n;
    const wPost = postM.get(mapKey(mint, watchOwnerBs58)) ?? 0n;
    const lost = wPre > wPost ? wPre - wPost : 0n;
    if (lost < minL) continue;

    for (const [k, po] of postM) {
      const parsed = parseMapKey(k);
      if (!parsed || parsed.mint !== mint || parsed.owner === watchOwnerBs58) continue;
      const pr = preM.get(k) ?? 0n;
      if (po > pr) {
        out.push([watchOwnerBs58, parsed.owner]);
      }
    }
  }

  out.sort((a, b) => a[1].localeCompare(b[1]));
  const dedup: [string, string][] = [];
  for (const p of out) {
    const prev = dedup[dedup.length - 1];
    if (prev && prev[0] === p[0] && prev[1] === p[1]) continue;
    dedup.push(p);
  }
  return dedup;
}

/**
 * 汇总监控地址在一笔交易中的转出对手方（原生 SOL 启发式 + SPL token balance 启发式）。
 * 若账户 key 与 balance 数组长度不一致则返回 `null`。
 */
export function collectWatchTransferCounterpartyPairs(
  tx: Transaction,
  meta: TransactionStatusMeta,
  watchedBs58: string[],
  minNativeOutflowLamports: bigint,
  splMinWatchDecreaseRaw: bigint
): [string, string][] | null {
  const keys = collectAccountKeysBs58(tx, meta);
  if (!keys) return null;
  const n = keys.length;
  if (meta.preBalances.length !== n || meta.postBalances.length !== n) return null;

  const deltas = lamportBalanceDeltas(meta);
  const watchedH = new Set(watchedBs58);

  const pairs: [string, string][] = heuristicSolCounterpartiesForWatchedKeys(
    keys,
    deltas,
    watchedH,
    minNativeOutflowLamports
  );

  for (const w of watchedBs58) {
    pairs.push(...splTokenCounterpartyByOwner(meta, w, splMinWatchDecreaseRaw));
  }

  pairs.sort((a, b) => a[1].localeCompare(b[1]));
  const dedup: [string, string][] = [];
  for (const p of pairs) {
    const prev = dedup[dedup.length - 1];
    if (prev && prev[0] === p[0] && prev[1] === p[1]) continue;
    dedup.push(p);
  }
  return dedup;
}

/** Yellowstone 交易签名原始字节（64）→ Base58 签名字符串；长度非 64 返回 `null` */
export function tryYellowstoneSignature(sig: Uint8Array): string | null {
  if (sig.length !== 64) return null;
  return bs58.encode(sig);
}
