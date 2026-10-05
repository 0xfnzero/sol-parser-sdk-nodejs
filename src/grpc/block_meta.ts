import { exactInteger, exactU64, exactI64 } from "../core/metadata.js";
/** Local BlockMeta adapter; never fetches a block or blockhash. */
import type { DexEvent } from "../core/dex_event.js";
export function parseBlockMetaUpdate(
  meta: {
    slot: string | number | bigint;
    blockhash: string;
    blockTime?: { timestamp: string | number | bigint };
  },
  grpcRecvUs: number | bigint | string,
  fallbackBlockUs?: number | bigint | string,
): DexEvent {
  const slot = exactInteger(meta.slot, "slot");
  exactU64(slot, "slot");
  const seconds = meta.blockTime?.timestamp;
  let blockUs = exactI64(fallbackBlockUs ?? 0);
  if (seconds !== undefined) {
    const v = exactInteger(seconds, "timestamp") * 1000000n,
      lo = -(1n << 63n),
      hi = (1n << 63n) - 1n;
    blockUs = v < lo ? lo : v > hi ? hi : v;
  }
  return {
    BlockMeta: {
      metadata: {
        signature: "1".repeat(64),
        slot,
        tx_index: 0n,
        block_time_us: blockUs,
        grpc_recv_us: exactI64(grpcRecvUs),
        recent_blockhash: meta.blockhash || undefined,
      },
    },
  };
}
