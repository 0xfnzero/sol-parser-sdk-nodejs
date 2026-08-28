/** 事件元数据（signature 为 Base58 字符串） */
export interface EventMetadata {
  signature: string;
  slot: number;
  /** gRPC：与 Yellowstone `SubscribeUpdateTransactionInfo.index` 一致（Rust `info.index`）。Shred 等其它路径含义见各实现说明。 */
  tx_index: number;
  block_time_us: number;
  grpc_recv_us: number;
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
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  recentBlockhash?: string
): EventMetadata {
  return {
    signature,
    slot,
    tx_index: txIndex,
    block_time_us: blockTimeUs ?? 0,
    grpc_recv_us: grpcRecvUs,
    recent_blockhash: recentBlockhash,
  };
}
