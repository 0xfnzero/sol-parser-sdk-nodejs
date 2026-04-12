import type { Connection } from "@solana/web3.js";

/**
 * 与 Rust `sol-parser-sdk/src/shredstream/config.rs` 字段一一对应。
 *
 * Rust：`connect_with_config` 使用 `connection_timeout_ms` → tonic `Endpoint::connect_timeout`，
 * `max_decoding_message_size` → `Grpc::max_*_message_size`；**未**对长流设置 `Endpoint::timeout`
 * （`request_timeout_ms` 保留与 Rust `config.rs` 一致，流式路径不填 deadline）。
 * `reconnect_delay_ms` / `max_reconnect_attempts` 由 `client.rs` 重连循环使用。
 *
 * **TS 扩展**：`connection` 用于拉取链上 ALT，补全 V0 交易账户表以解析外层指令（主网 Pump 等必需）。
 */
export interface ShredStreamConfig {
  /** 连接超时（毫秒）→ tonic `Endpoint::connect_timeout` / gRPC `waitForReady` */
  connection_timeout_ms: number;
  /** 与 Rust 字段一致；长流 `SubscribeEntries` 不设单 RPC deadline（避免断流） */
  request_timeout_ms: number;
  /** 最大编解码消息大小（字节）→ tonic `Grpc` / `@grpc/grpc-js` channel 选项 */
  max_decoding_message_size: number;
  /** 自动重连延迟（毫秒） */
  reconnect_delay_ms: number;
  /** 最大重连次数（0 表示无限重连） */
  max_reconnect_attempts: number;
  /** 可选：主网 RPC，用于解析 V0 地址查找表（ALT） */
  connection?: Connection;
}

export function defaultShredStreamConfig(): ShredStreamConfig {
  return {
    connection_timeout_ms: 8000,
    request_timeout_ms: 15_000,
    max_decoding_message_size: 1024 * 1024 * 100,
    reconnect_delay_ms: 1000,
    max_reconnect_attempts: 3,
  };
}

/** 低延迟：更短超时与重连间隔 */
export function lowLatencyShredStreamConfig(): ShredStreamConfig {
  return {
    connection_timeout_ms: 5000,
    request_timeout_ms: 10_000,
    max_decoding_message_size: 1024 * 1024 * 50,
    reconnect_delay_ms: 100,
    max_reconnect_attempts: 1,
  };
}

/** 高吞吐：更大消息与更多重试 */
export function highThroughputShredStreamConfig(): ShredStreamConfig {
  return {
    connection_timeout_ms: 10_000,
    request_timeout_ms: 30_000,
    max_decoding_message_size: 1024 * 1024 * 200,
    reconnect_delay_ms: 2000,
    max_reconnect_attempts: 5,
  };
}
