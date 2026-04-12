/**
 * ShredStream → PumpFun `DexEvent` 标准 JSON（与 `pumpfun_grpc_json.ts` 输出格式一致：`dexEventToJsonString`）
 *
 * 运行（包根目录）:
 *   `npm run example:shredstream:pumpfun-json -- --url=http://host:10800 --rpc=https://api.mainnet-beta.solana.com`
 *   或 `npx tsx examples/shredstream_pumpfun_json.ts -- --url=...`
 *
 * 端点：`--url` / `-u` / `--endpoint=` > `SHREDSTREAM_URL` / `SHRED_URL` > 默认 `http://127.0.0.1:10800`
 * RPC：`--rpc` / `-r` / `--rpc=` > `RPC_URL` > 默认主网公开 RPC
 *
 * 环境变量:
 *   SHREDSTREAM_URL / SHRED_URL — ShredStream 端点（可被 CLI 覆盖）
 *   RPC_URL — 主网 RPC（用于拉取 ALT；公开端点易 429，请换自有节点或 Helius/QuickNode 等）
 *   MAX_EVENTS — 打印条数后退出；默认 0 = 持续打印直到 Ctrl+C
 *   SHREDSTREAM_DEBUG=1 — 在客户端侧打印每条 Entry 的解码统计
 *   SHREDSTREAM_STATS_SEC=N — 每 N 秒打印一次入队/过滤统计（区分「没数据」与「有数据但非 PumpFun」）
 */
import "dotenv/config";
import { Connection } from "@solana/web3.js";
import {
  ShredStreamClient,
  bigintToJsonReplacer,
  dexEventToJsonString,
  metadataForDexEvent,
  nowUs,
} from "../src/index.js";
import {
  exitIfShredstreamHelpRequested,
  parseOptionalRpcUrl,
  parseShredstreamEndpoint,
} from "./shredstream_cli.js";

const MAX_EVENTS = (() => {
  const raw = process.env.MAX_EVENTS;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();

const STATS_SEC = (() => {
  const raw = process.env.SHREDSTREAM_STATS_SEC;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
})();

function matchesPumpfun(ev: object): boolean {
  const k = Object.keys(ev)[0];
  return k !== undefined && k.startsWith("PumpFun");
}

/** 与 gRPC 示例一致：事件 JSON 中含 PumpFun 程序 ID（含 bigint 字段须用 replacer） */
const PUMPFUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
function eventTouchesPumpfun(ev: object): boolean {
  return JSON.stringify(ev, bigintToJsonReplacer).includes(PUMPFUN_PROGRAM);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  exitIfShredstreamHelpRequested(argv, [
    "shredstream_pumpfun_json — ShredStream → PumpFun DexEvent JSON",
    "",
    "用法: npm run example:shredstream:pumpfun-json -- [选项]",
    "  或 npx tsx examples/shredstream_pumpfun_json.ts -- [选项]",
    "",
    "选项:",
    "  --url, -u, --endpoint=   ShredStream 端点",
    "  --rpc, -r, --rpc=        主网 HTTP RPC（拉取 ALT；覆盖 RPC_URL）",
    "  -h, --help                显示本说明",
    "",
    "环境: SHREDSTREAM_URL / SHRED_URL、RPC_URL、MAX_EVENTS、SHREDSTREAM_STATS_SEC 等（见文件头注释）",
  ]);
  const url = parseShredstreamEndpoint(argv);
  const rpcUrl = parseOptionalRpcUrl(argv);
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("=== PumpFun ShredStream → JSON（DexEvent 标准结构）===\n");
  console.log(`ShredStream: ${url}`);
  console.log(`RPC (ALT): ${rpcUrl}`);
  if (MAX_EVENTS > 0) {
    console.log(`Stop after ${MAX_EVENTS} PumpFun event(s).\n`);
  } else {
    console.log("Printing until Ctrl+C.\n");
  }

  const client = await ShredStreamClient.newWithConfig(url, {
    connection_timeout_ms: 5000,
    request_timeout_ms: 30_000,
    max_decoding_message_size: 1024 * 1024 * 1024,
    reconnect_delay_ms: 1000,
    max_reconnect_attempts: 0,
    connection,
  });

  const queue = await client.subscribe();
  let printed = 0;
  /** 从队列弹出的 DexEvent 总数（含被过滤的） */
  let poppedDex = 0;
  let stopping = false;

  const statsTimer =
    STATS_SEC > 0
      ? setInterval(() => {
          const s = client.getReceiveStats();
          console.error(
            `[stats] printed_pumpfun=${printed} popped_all_dex=${poppedDex} queue_len=${queue.len()} ` +
              `grpc_entries=${s.entryMessagesReceived} decode_fail=${s.entryDecodeFailures} ` +
              `txs_decoded=${s.transactionsDecoded} dex_queued=${s.dexEventsQueued}`
          );
        }, STATS_SEC * 1000)
      : null;

  process.once("SIGINT", () => {
    stopping = true;
    console.log("\n(interrupted)");
  });

  let spin = 0;
  while (!stopping) {
    const ev = queue.pop();
    if (ev) {
      spin = 0;
      poppedDex += 1;
      if (!matchesPumpfun(ev) || !eventTouchesPumpfun(ev)) continue;

      printed++;
      const meta = metadataForDexEvent(ev);
      const slot = meta?.slot ?? 0;
      const queueRecvUs = nowUs();
      const grpcRecvUs = meta?.grpc_recv_us ?? 0;
      console.log(
        `--- Event #${printed} slot=${slot} queue_recv_us=${queueRecvUs} grpc_recv_us=${grpcRecvUs} ---`
      );
      console.log(dexEventToJsonString(ev, 2));
      console.log();

      if (MAX_EVENTS > 0 && printed >= MAX_EVENTS) break;
    } else {
      spin += 1;
      if (spin < 500) continue;
      await new Promise<void>((r) => setImmediate(r));
      spin = 0;
    }
  }

  if (statsTimer) clearInterval(statsTimer);
  await client.stop();
  console.log(`Done. Printed ${printed} PumpFun JSON event(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
