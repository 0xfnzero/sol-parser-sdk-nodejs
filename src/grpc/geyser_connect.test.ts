import { describe, expect, it } from "vitest";
import { defaultGeyserConnectConfig, geyserGrpcChannelOptions } from "./geyser_connect.js";

describe("geyserGrpcChannelOptions", () => {
  it("maps keepalive, reconnect, and HTTP/2 receive-window settings", () => {
    const options = geyserGrpcChannelOptions({
      ...defaultGeyserConnectConfig(),
      keepAliveIntervalMs: 10_000,
      keepAliveTimeoutMs: 2_000,
      initialReconnectBackoffMs: 100,
      maxReconnectBackoffMs: 5_000,
      flowControlWindowBytes: 16 * 1024 * 1024,
    });

    expect(options["grpc.keepalive_time_ms"]).toBe(10_000);
    expect(options["grpc.keepalive_timeout_ms"]).toBe(2_000);
    expect(options["grpc.initial_reconnect_backoff_ms"]).toBe(100);
    expect(options["grpc.max_reconnect_backoff_ms"]).toBe(5_000);
    expect(options["grpc-node.flow_control_window"]).toBe(16 * 1024 * 1024);
  });
});
