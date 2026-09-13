/** RPC / web3 路径补充字段（如 PumpSwap fees 指令 → `is_pump_pool`，PumpFun 余额） */
import type { DexEvent, PumpFunTradeEvent } from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";
import { PUMPSWAP_FEES_PROGRAM_ID } from "../instr/program_ids.js";
import { getAccountKeyResolver, getInstructionDataBytes, type InvokePair } from "./rpc_invoke_map.js";
import type { Message, MessageV0 } from "@solana/web3.js";
import type { ConfirmedTransactionMeta } from "@solana/web3.js";

function findAccountIndex(
  resolver: { get(i: number): { toBase58(): string } | undefined; length: number },
  account: string
): number | null {
  const zero = defaultPubkey();
  if (!account || account === zero) return null;
  for (let i = 0; i < resolver.length; i++) {
    if (resolver.get(i)?.toBase58() === account) return i;
  }
  return null;
}

function tokenBalanceRawAmount(amount: string | undefined): bigint | null {
  if (amount == null || amount === "") return null;
  try {
    return BigInt(amount);
  } catch {
    return null;
  }
}

function fillPumpfunTradeBalances(
  trade: PumpFunTradeEvent,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null
): void {
  if (!meta) return;
  const resolver = getAccountKeyResolver(message, meta);

  const userIndex = findAccountIndex(resolver, trade.user);
  if (userIndex !== null) {
    trade.pre_sol_balance =
      meta.preBalances[userIndex] !== undefined ? BigInt(meta.preBalances[userIndex]!) : undefined;
    trade.post_sol_balance =
      meta.postBalances[userIndex] !== undefined ? BigInt(meta.postBalances[userIndex]!) : undefined;
  }

  const associated = trade.associated_user;
  if (!associated || associated === defaultPubkey()) return;

  const preBalances = meta.preTokenBalances ?? [];
  const postBalances = meta.postTokenBalances ?? [];
  const matchIndex = [...preBalances, ...postBalances].find((b) => {
    const key = resolver.get(b.accountIndex);
    return key?.toBase58() === associated;
  })?.accountIndex;

  if (matchIndex === undefined) return;

  const pre = preBalances.find((b) => b.accountIndex === matchIndex);
  const post = postBalances.find((b) => b.accountIndex === matchIndex);
  const preAmt = tokenBalanceRawAmount(pre?.uiTokenAmount?.amount);
  const postAmt = tokenBalanceRawAmount(post?.uiTokenAmount?.amount);
  if (preAmt !== null || postAmt !== null) {
    trade.pre_token_balance = preAmt ?? 0n;
    trade.post_token_balance = postAmt ?? 0n;
  }
}

function pumpfunTradeFromEvent(ev: DexEvent): PumpFunTradeEvent | null {
  if ("PumpFunTrade" in ev) return ev.PumpFunTrade;
  if ("PumpFunBuy" in ev) return ev.PumpFunBuy;
  if ("PumpFunSell" in ev) return ev.PumpFunSell;
  if ("PumpFunBuyExactSolIn" in ev) return ev.PumpFunBuyExactSolIn;
  return null;
}

export function fillDataRpc(
  ev: DexEvent,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  programInvokes: Map<string, InvokePair[]>
): void {
  const trade = pumpfunTradeFromEvent(ev);
  if (trade) fillPumpfunTradeBalances(trade, message, meta);

  const list = programInvokes.get(PUMPSWAP_FEES_PROGRAM_ID);
  const last = list?.[list.length - 1];
  if (!last) return;
  const data = getInstructionDataBytes(message, meta, last);
  if (!data || data.length <= 9) return;
  const isPumpPool = data[9] !== 0;

  if ("PumpSwapBuy" in ev) {
    ev.PumpSwapBuy.is_pump_pool = isPumpPool;
  } else if ("PumpSwapSell" in ev) {
    ev.PumpSwapSell.is_pump_pool = isPumpPool;
  }
}
