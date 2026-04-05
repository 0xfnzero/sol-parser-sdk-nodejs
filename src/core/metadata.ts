/** 事件元数据（signature 为 Base58 字符串） */
export interface EventMetadata {
  signature: string;
  slot: number;
  tx_index: number;
  block_time_us: number;
  grpc_recv_us: number;
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
