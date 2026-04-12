/**
 * 与 `sol-parser-sdk/examples/shredstream_example.rs` 对应的 Node 示例：
 * ShredStream 超低延迟订阅、队列 clone、统计与 `metadataForDexEvent`。
 *
 * 运行（包根目录）：
 *   `npm run example:shredstream:subscribe -- --url=http://host:10800`
 *   或 `npx tsx examples/shredstream_example.ts -- --url=http://host:10800`
 *
 * 端点：`--url` / `-u` / `--endpoint=` > 环境变量 `SHREDSTREAM_URL` / `SHRED_URL` > 默认 `http://127.0.0.1:10800`
 *
 * 说明：客户端对每条交易走 **外层指令解析**（`parseInstructionUnified`），可产出 DexEvent；无链上日志时与 gRPC 日志解析路径不同。
 * 用 `SHREDSTREAM_DEBUG=1` 可看每条 Entry 的 slot/交易数；看累计情况用 `receive_stats`。
 */
import "dotenv/config";
import {
  ShredStreamClient,
  type ShredStreamConfig,
  metadataForDexEvent,
  nowUs,
} from "../src/index.js";
import { exitIfShredstreamHelpRequested, parseShredstreamEndpoint } from "./shredstream_cli.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  exitIfShredstreamHelpRequested(argv, [
    "shredstream_example — ShredStream 延迟 / 队列统计 demo",
    "",
    "用法: npm run example:shredstream:subscribe -- [选项]",
    "  或 npx tsx examples/shredstream_example.ts -- [选项]",
    "",
    "选项:",
    "  --url, -u, --endpoint=   ShredStream HTTP 端点（覆盖环境变量）",
    "  -h, --help              显示本说明",
    "",
    "环境: SHREDSTREAM_URL / SHRED_URL（可在包根目录 .env 中配置）",
    "默认端点: http://127.0.0.1:10800",
  ]);
  const url = parseShredstreamEndpoint(argv);

  const config: ShredStreamConfig = {
    connection_timeout_ms: 5000,
    request_timeout_ms: 30_000,
    max_decoding_message_size: 1024 * 1024 * 1024,
    reconnect_delay_ms: 1000,
    max_reconnect_attempts: 0,
  };

  console.log("ShredStream Low-Latency Test");
  console.log("Endpoint:", url, "reconnect: infinite");
  console.log("提示: 与 gRPC 的 JSON 示例见 `examples/shredstream_pumpfun_json.ts`；调试设 SHREDSTREAM_DEBUG=1。\n");

  const client = await ShredStreamClient.newWithConfig(url, config);
  console.log("ShredStream client connected");
  console.log("Starting subscription...\n");

  const queue = await client.subscribe();
  const queueForStats = queue.clone();

  let minLatency = Number.MAX_SAFE_INTEGER;
  let maxLatency = 0;
  let totalLatency = 0;
  let eventCount = 0;

  const statsInterval = setInterval(() => {
    const len = queueForStats.len();
    const avg = eventCount > 0 ? Math.floor(totalLatency / eventCount) : 0;
    const rs = client.getReceiveStats();
    console.log(
      `[stats] events=${eventCount} queue_len=${len} avg_us=${avg} min=${minLatency === Number.MAX_SAFE_INTEGER ? 0 : minLatency} max=${maxLatency}`
    );
    console.log(
      `[receive_stats] grpc_entry_msgs=${rs.entryMessagesReceived} decode_fail=${rs.entryDecodeFailures} txs_decoded=${rs.transactionsDecoded} dex_queued=${rs.dexEventsQueued}`
    );
    if (rs.entryMessagesReceived === 0) {
      console.warn(
        "[receive_stats] 尚未收到任何 gRPC Entry：请确认代理地址/端口、防火墙，以及该节点是否在推送 shreds。"
      );
    }
    if (len > 1000) {
      console.warn(`warning: queue backlog (${len}), consumer slower than producer`);
    }
  }, 10_000);

  const clientForAutoStop = client.clone();
  const autoStop = setTimeout(() => {
    console.log("Auto-stopping after 600s...");
    void clientForAutoStop.stop();
  }, 600_000);

  void (async () => {
    let spin = 0;
    for (;;) {
      const ev = queue.pop();
      if (ev) {
        spin = 0;
        const queueRecvUs = nowUs();
        const meta = metadataForDexEvent(ev);
        if (meta) {
          const grpcRecvUs = meta.grpc_recv_us;
          const latencyUs = queueRecvUs - grpcRecvUs;
          if (latencyUs >= 0) {
            eventCount += 1;
            totalLatency += latencyUs;
            minLatency = Math.min(minLatency, latencyUs);
            maxLatency = Math.max(maxLatency, latencyUs);
          }
          console.log(
            "ShredStream recv (grpc_recv_us):",
            grpcRecvUs,
            "event recv (queue_recv_us):",
            queueRecvUs,
            "latency_us:",
            latencyUs,
            "queue.len:",
            queue.len()
          );
          console.dir(ev, { depth: 4 });
        }
      } else {
        spin += 1;
        if (spin < 1000) {
          continue;
        }
        await new Promise<void>((r) => setImmediate(r));
        spin = 0;
      }
    }
  })();

  await new Promise<void>((resolve) => {
    process.once("SIGINT", () => resolve());
  });

  console.log("\nShutting down gracefully...");
  clearInterval(statsInterval);
  clearTimeout(autoStop);
  await client.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
