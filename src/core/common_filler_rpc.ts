/** RPC / web3 路径补充字段（如 PumpSwap fees 指令 → `is_pump_pool`） */
import type { DexEvent } from "./dex_event.js";
import { PUMPSWAP_FEES_PROGRAM_ID } from "../instr/program_ids.js";
import type { InvokePair } from "./rpc_invoke_map.js";
import { getInstructionDataBytes } from "./rpc_invoke_map.js";
import type { Message, MessageV0 } from "@solana/web3.js";
import type { ConfirmedTransactionMeta } from "@solana/web3.js";

export function fillDataRpc(
  ev: DexEvent,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  programInvokes: Map<string, InvokePair[]>
): void {
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
