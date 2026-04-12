/**
 * ShredStream gRPC 消息形状（与 Rust `shredstream::proto` 中 prost 定义一致）。
 * 实际线路仍由 `shredstream.proto` + `@grpc/proto-loader` 解析。
 */
export type SubscribeEntriesRequest = Record<string, never>;

export interface ShredstreamEntryMessage {
  slot: number | string | bigint;
  entries: Uint8Array | Buffer;
}
