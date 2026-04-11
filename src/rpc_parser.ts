import { Connection } from "@solana/web3.js";
import type { DexEvent } from "./core/dex_event.js";
import type { EventTypeFilter } from "./grpc/types.js";
import type { ParseError } from "./core/error.js";
import { parseRpcTransaction } from "./rpc_transaction.js";

export {
  parseRpcTransaction,
  fillAccountsFromTransactionDataRpc,
  fillDataRpc,
  applyAccountFillsToLogEvents,
} from "./rpc_transaction.js";

/**
 * 通过 RPC 拉取交易并解析：
 * 外层 + 内层编译指令 + 日志；不含账户字段填充（需另行调用 RPC 填充 API）。
 */
export async function parseTransactionFromRpc(
  connection: Connection,
  signature: string,
  filter?: EventTypeFilter
): Promise<{ ok: true; events: DexEvent[] } | { ok: false; error: ParseError }> {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) {
      return {
        ok: false,
        error: {
          kind: "RpcError",
          message: "Transaction not found or null response (try archive RPC for old txs).",
        },
      };
    }
    const grpcRecvUs = Math.floor(Date.now() * 1000);
    return parseRpcTransaction(tx, signature, filter, { grpcRecvUs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: { kind: "RpcError", message: msg } };
  }
}
