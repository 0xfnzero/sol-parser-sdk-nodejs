/**
 * 与 Rust `sol-parser-sdk/src/grpc/geyser_connect.rs` 对齐：Yellowstone Geyser gRPC 连接选项。
 *
 * `@triton-one/yellowstone-grpc` 的 `Client` 通过构造函数第三参传入 `ChannelOptions`；
 * `connectTimeoutMs` 无与 tonic 完全一一对应的项，仅作文档与默认值对齐（可配合环境网络调优）。
 */
import type { ChannelOptions } from "@grpc/grpc-js";
import Client from "@triton-one/yellowstone-grpc";

/** 与 Rust `GeyserConnectConfig` 字段对应（毫秒 / 字节） */
export interface GeyserConnectConfig {
  /** 对应 Rust `connect_timeout`（毫秒） */
  connectTimeoutMs: number;
  /** 对应 Rust `max_decoding_message_size` */
  maxDecodingMessageSize: number;
  /** 对应 Rust `x_token` */
  xToken?: string;
  /** gRPC 通道 HTTP/2 keepalive 间隔（毫秒），与 Rust `ClientConfig.keep_alive_interval_ms` 默认对齐 */
  keepAliveIntervalMs?: number;
  /** gRPC keepalive 应答超时（毫秒） */
  keepAliveTimeoutMs?: number;
}

/** 与 Rust `GeyserConnectConfig::default` 一致 */
export function defaultGeyserConnectConfig(): GeyserConnectConfig {
  return {
    connectTimeoutMs: 8000,
    maxDecodingMessageSize: 1024 * 1024 * 1024,
    xToken: undefined,
    keepAliveIntervalMs: 30_000,
    keepAliveTimeoutMs: 5000,
  };
}

/** 与 `ClientConfig` / `grpc.keepalive_*` 对齐，用于长连接抗 NAT/负载均衡 idle 断开 */
export function geyserGrpcChannelOptions(
  config: GeyserConnectConfig = defaultGeyserConnectConfig()
): ChannelOptions {
  const max = config.maxDecodingMessageSize;
  const interval = config.keepAliveIntervalMs ?? 30_000;
  const timeout = config.keepAliveTimeoutMs ?? 5000;
  return {
    "grpc.max_receive_message_length": max,
    "grpc.max_send_message_length": max,
    "grpc.keepalive_time_ms": interval,
    "grpc.keepalive_timeout_ms": timeout,
    /** 无活跃 RPC 时仍发 keepalive，避免长时间仅订阅时被中间设备掐断 */
    "grpc.keepalive_permit_without_calls": 1,
  };
}

/**
 * 建立 Yellowstone Geyser 客户端（与 Rust `connect_yellowstone_geyser` 一致）。
 * Rust 为 async；此处构造同步完成，返回 `Promise` 以保持 `await connectYellowstoneGeyser(...)` 写法。
 */
export async function connectYellowstoneGeyser(
  endpoint: string,
  config: GeyserConnectConfig = defaultGeyserConnectConfig()
): Promise<Client> {
  return new Client(endpoint, config.xToken, geyserGrpcChannelOptions(config));
}
