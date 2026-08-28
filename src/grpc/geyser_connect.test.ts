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

    expect(options.grpcHttp2KeepAliveInterval).toBe(10_000);
    expect(options.grpcKeepAliveTimeout).toBe(2_000);
    expect(options.grpcInitialConnectionWindowSize).toBe(16 * 1024 * 1024);
    expect(options.grpcInitialStreamWindowSize).toBe(16 * 1024 * 1024);
    expect(options.grpcHttp2AdaptiveWindow).toBe(true);
    expect(options.grpcKeepAliveWhileIdle).toBe(true);
    expect(options.grpcTcpNodelay).toBe(true);
  });
});
