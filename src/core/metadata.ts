/** 事件元数据（signature 为 Base58 字符串） */
export interface EventMetadata {
  signature: string;
  slot: bigint;
  /** gRPC：与 Yellowstone `SubscribeUpdateTransactionInfo.index` 一致（Rust `info.index`）。Shred 等其它路径含义见各实现说明。 */
  tx_index: bigint;
  block_time_us: bigint;
  grpc_recv_us: bigint;
  /** Time waiting in the local pre-parser queue, measured with a monotonic clock. */
  local_queue_latency_us?: number;
  /** Pure local adapter + parser duration. No network or RPC calls are included. */
  parse_duration_us?: number;
  /** Start of the local gRPC data callback through parser completion. No RPC calls are included. */
  local_processing_latency_us?: number;
  /** Yellowstone update creation through the local gRPC data callback; includes provider and transport delay. */
  source_to_grpc_latency_us?: number;
  recent_blockhash?: string;
}

export function makeMetadata(
  signature: string,
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  blockTimeUs: number | bigint | string | undefined,
  grpcRecvUs: number | bigint | string,
  recentBlockhash?: string
): EventMetadata {
  return {
    signature,
    slot: exactU64(slot, "slot"),
    tx_index: exactU64(txIndex, "tx_index"),
    block_time_us: exactI64(blockTimeUs ?? 0, "block_time_us"),
    grpc_recv_us: exactI64(grpcRecvUs, "grpc_recv_us"),
    recent_blockhash: recentBlockhash,
  };
}

export type ExactIntegerInput = bigint | string | number;
export function exactInteger(value: ExactIntegerInput, label = "integer"): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new RangeError(`Unsafe ${label} integer`);
  if (typeof value === "string" && !/^-?\d+$/.test(value)) throw new TypeError(`Invalid ${label} integer`);
  if (!["bigint", "number", "string"].includes(typeof value)) throw new TypeError(`Invalid ${label} type`);
  return BigInt(value);
}
export function exactU64(value: ExactIntegerInput, label = "u64"): bigint {
  const n = exactInteger(value, label);
  if (n < 0n || n > (1n << 64n) - 1n) throw new RangeError(`${label} outside u64`);
  return n;
}
export function exactI64(value: ExactIntegerInput, label = "i64"): bigint {
  const n = exactInteger(value, label);
  if (n < -(1n << 63n) || n > (1n << 63n) - 1n) throw new RangeError(`${label} outside i64`);
  return n;
}
