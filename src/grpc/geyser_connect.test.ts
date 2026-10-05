import {expect,it} from "vitest";
import {defaultGeyserConnectConfig,geyserGrpcChannelOptions} from "./geyser_connect.js";
it("maps pure JavaScript gRPC options and deadlines",()=>{
 const options=geyserGrpcChannelOptions({...defaultGeyserConnectConfig(),keepAliveIntervalMs:10000,keepAliveTimeoutMs:2000,initialReconnectBackoffMs:100,maxReconnectBackoffMs:5000,flowControlWindowBytes:16*1024*1024});
 expect(options["grpc.keepalive_time_ms"]).toBe(10000);
 expect(options["grpc.keepalive_timeout_ms"]).toBe(2000);
 expect(options["grpc-node.flow_control_window"]).toBe(16*1024*1024);
 expect(options["grpc.initial_reconnect_backoff_ms"]).toBe(100);
 expect(options["grpc.max_reconnect_backoff_ms"]).toBe(5000);
 expect(options.connectTimeoutMs).toBe(8000);
});
