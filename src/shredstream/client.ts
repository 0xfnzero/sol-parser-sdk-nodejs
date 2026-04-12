/**
 * ShredStream 客户端：与 Rust `shredstream/client.rs` 对齐（gRPC + bincode 解码 + `parseTransactionEvents`）。
 */
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { createRequire } from "node:module";
import { join } from "node:path";
import { type DexEvent } from "../core/dex_event.js";
import { nowUs } from "../core/unified_parser.js";
import {
  dexEventsFromShredWasmTx,
  dexEventsFromShredWasmTxWithFullKeys,
  type ShredWasmTx,
} from "./instruction_parse.js";
import { fullAccountKeyStringsFromShredTx, loadAddressLookupTableAccounts } from "./alt_lookup.js";
import {
  type ShredStreamConfig,
  defaultShredStreamConfig,
} from "./config.js";

/** 与编译产物 `dist/shredstream/client.js` 同目录解析 wasm / proto（CommonJS 下 `__dirname` 可用） */
const nodeRequire = createRequire(join(__dirname, "client.js"));

/** wasm-pack `--target nodejs` 产物（构建后位于 `dist/shredstream/wasm/pkg`） */
function loadWasm(): { decode_shredstream_entries_bincode: (data: Uint8Array) => unknown } {
  const pkg = join(__dirname, "wasm", "pkg", "sol_parser_shredstream_wasm.js");
  return nodeRequire(pkg) as { decode_shredstream_entries_bincode: (data: Uint8Array) => unknown };
}

let wasmModule: { decode_shredstream_entries_bincode: (data: Uint8Array) => unknown } | null = null;
function wasm(): { decode_shredstream_entries_bincode: (data: Uint8Array) => unknown } {
  if (!wasmModule) wasmModule = loadWasm();
  return wasmModule;
}

const PROTO_PATH = join(__dirname, "shredstream.proto");

function loadProtoDefinition(): grpc.GrpcObject {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
}

function grpcTarget(endpoint: string): string {
  try {
    const u = new URL(endpoint.includes("://") ? endpoint : `http://${endpoint}`);
    return u.host;
  } catch {
    return endpoint;
  }
}

/** 与 tonic 对 `https://` 端点使用 TLS 的行为对齐 */
function grpcCredentialsForEndpoint(endpoint: string): grpc.ChannelCredentials {
  try {
    const u = new URL(endpoint.includes("://") ? endpoint : `http://${endpoint}`);
    if (u.protocol === "https:") {
      return grpc.credentials.createSsl();
    }
  } catch {
    /* use insecure */
  }
  return grpc.credentials.createInsecure();
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}


/** 订阅周期内累计（用于排查「无 gRPC 包 / 解码失败 / 无 DEX 事件」） */
export type ShredStreamReceiveStats = {
  entryMessagesReceived: number;
  entryDecodeFailures: number;
  transactionsDecoded: number;
  dexEventsQueued: number;
};

function shredDebugEnabled(): boolean {
  const v = process.env.SHREDSTREAM_DEBUG;
  return v === "1" || v === "true";
}

/** 有界 FIFO 队列（容量与 Rust `ArrayQueue::new(100_000)` 一致；`clone()` 共享底层缓冲，同 `Arc<ArrayQueue>`） */
export class ShredEventQueue {
  private static readonly CAP = 100_000;
  private readonly buf: DexEvent[];

  constructor(sharedBuf?: DexEvent[]) {
    this.buf = sharedBuf ?? [];
  }

  /** 当前元素个数（与 Rust `ArrayQueue::len` 一致） */
  len(): number {
    return this.buf.length;
  }

  /** 最大容量 */
  capacity(): number {
    return ShredEventQueue.CAP;
  }

  push(e: DexEvent): boolean {
    if (this.buf.length >= ShredEventQueue.CAP) return false;
    this.buf.push(e);
    return true;
  }

  pop(): DexEvent | undefined {
    return this.buf.shift();
  }

  clone(): ShredEventQueue {
    return new ShredEventQueue(this.buf);
  }
}

function setGrpcRecvUsMut(event: DexEvent, grpcRecvUs: number): void {
  const key = Object.keys(event)[0];
  if (key === "Error") return;
  const inner = (event as Record<string, { metadata?: { grpc_recv_us?: number } }>)[key];
  if (inner?.metadata) inner.metadata.grpc_recv_us = grpcRecvUs;
}

export class ShredStreamClient {
  private readonly endpoint: string;
  private readonly config: ShredStreamConfig;
  private readonly ServiceClient: grpc.ServiceClientConstructor;
  private loopAbort: AbortController | null = null;
  private loopPromise: Promise<void> | null = null;
  private activeCall: grpc.ClientReadableStream<unknown> | null = null;
  private receiveStats: ShredStreamReceiveStats = {
    entryMessagesReceived: 0,
    entryDecodeFailures: 0,
    transactionsDecoded: 0,
    dexEventsQueued: 0,
  };

  private constructor(endpoint: string, config: ShredStreamConfig) {
    this.endpoint = endpoint;
    this.config = config;
    const root = loadProtoDefinition();
    const shred = root.shredstream as grpc.GrpcObject;
    this.ServiceClient = shred.ShredstreamProxy as grpc.ServiceClientConstructor;
  }

  static async connect(endpoint: string): Promise<ShredStreamClient> {
    return ShredStreamClient.connectWithConfig(endpoint, defaultShredStreamConfig());
  }

  /** 与 Rust `ShredStreamClient::new` 一致 */
  static new(endpoint: string): Promise<ShredStreamClient> {
    return ShredStreamClient.connect(endpoint);
  }

  static async connectWithConfig(
    endpoint: string,
    config: ShredStreamConfig
  ): Promise<ShredStreamClient> {
    const client = new ShredStreamClient(endpoint, config);
    await client.pingConnection();
    return client;
  }

  /** 与 Rust `ShredStreamClient::new_with_config` 一致 */
  static newWithConfig(endpoint: string, config: ShredStreamConfig): Promise<ShredStreamClient> {
    return ShredStreamClient.connectWithConfig(endpoint, config);
  }

  /** 与 Rust `#[derive(Clone)]` 一致：多句柄共享同一连接状态（TS 中为同一对象引用） */
  clone(): ShredStreamClient {
    return this;
  }

  /** 当前订阅周期内 gRPC Entry 条数、解码失败次数、解码出的交易数、入队 DexEvent 数 */
  getReceiveStats(): Readonly<ShredStreamReceiveStats> {
    return { ...this.receiveStats };
  }

  /**
   * 与 Rust `new_with_config` 中 `ShredstreamProxyClient::connect_with_config(endpoint, &config)` 一致：
   * `connection_timeout_ms` / `request_timeout_ms` / `max_decoding_message_size` 见 `shredstream/proto/mod.rs`。
   */
  private pingConnection(): Promise<void> {
    const target = grpcTarget(this.endpoint);
    const creds = grpcCredentialsForEndpoint(this.endpoint);
    const channelOpts: grpc.ChannelOptions = {
      "grpc.max_receive_message_length": this.config.max_decoding_message_size,
      "grpc.max_send_message_length": this.config.max_decoding_message_size,
    };
    const c = new this.ServiceClient(target, creds, channelOpts);
    const deadline = Date.now() + this.config.connection_timeout_ms;
    return new Promise((resolve, reject) => {
      c.waitForReady(deadline, (err) => {
        c.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 订阅 DEX 事件（自动重连）；返回队列供轮询消费（与 Rust `subscribe` 一致）。
   * 重连循环使用订阅时刻的配置快照（与 Rust 在 `tokio::spawn` 前 `config.clone()` 一致）。
   */
  async subscribe(): Promise<ShredEventQueue> {
    await this.stop();
    this.receiveStats = {
      entryMessagesReceived: 0,
      entryDecodeFailures: 0,
      transactionsDecoded: 0,
      dexEventsQueued: 0,
    };
    const queue = new ShredEventQueue();
    const ac = new AbortController();
    this.loopAbort = ac;
    const configSnapshot: ShredStreamConfig = { ...this.config };
    this.loopPromise = this.runReconnectLoop(queue, ac.signal, configSnapshot);
    return queue;
  }

  /** 停止订阅并中止当前流 */
  async stop(): Promise<void> {
    this.loopAbort?.abort();
    this.loopAbort = null;
    this.activeCall?.cancel();
    this.activeCall = null;
    if (this.loopPromise) {
      await this.loopPromise.catch(() => undefined);
      this.loopPromise = null;
    }
  }

  private async runReconnectLoop(
    queue: ShredEventQueue,
    signal: AbortSignal,
    config: ShredStreamConfig
  ): Promise<void> {
    let delay = config.reconnect_delay_ms;
    let attempts = 0;

    while (!signal.aborted) {
      const max = config.max_reconnect_attempts;
      if (max > 0 && attempts >= max) {
        console.error("Max reconnection attempts reached, giving up");
        break;
      }
      attempts += 1;

      try {
        await this.streamOnce(queue, signal, config);
        delay = config.reconnect_delay_ms;
        attempts = 0;
      } catch (e) {
        if (signal.aborted) break;
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`ShredStream error: ${msg} - retry in ${delay}ms`);
        await sleepMs(delay);
        if (signal.aborted) break;
        delay = Math.min(delay * 2, 60_000);
      }
    }
  }

  /** 与 Rust `stream_events` + `connect_with_config`（tonic Endpoint / Grpc 消息上限）一致 */
  private streamOnce(
    queue: ShredEventQueue,
    signal: AbortSignal,
    config: ShredStreamConfig
  ): Promise<void> {
    if (signal.aborted) return Promise.resolve();

    const target = grpcTarget(this.endpoint);
    const creds = grpcCredentialsForEndpoint(this.endpoint);
    const channelOpts: grpc.ChannelOptions = {
      "grpc.max_receive_message_length": config.max_decoding_message_size,
      "grpc.max_send_message_length": config.max_decoding_message_size,
    };
    const client = new this.ServiceClient(target, creds, channelOpts);

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const call = client.subscribeEntries({}, new grpc.Metadata()) as grpc.ClientReadableStream<{
        slot: string | number | bigint;
        entries: Buffer | Uint8Array;
      }>;
      this.activeCall = call;

      console.info("ShredStream connected, receiving entries...");

      call.on("data", (entry) => {
        if (signal.aborted) return;
        try {
          void this.processEntryMessage(entry, queue);
        } catch (err) {
          console.error("processEntryMessage:", err);
        }
      });
      call.on("error", (err: Error & { code?: number }) => {
        client.close();
        if (signal.aborted || err.code === grpc.status.CANCELLED) {
          finish(() => resolve());
          return;
        }
        console.error("Stream error:", err);
        finish(() => reject(err));
      });
      call.on("end", () => {
        client.close();
        finish(() => resolve());
      });
    });
  }

  private async processEntryMessage(
    entry: { slot: string | number | bigint; entries: Buffer | Uint8Array },
    queue: ShredEventQueue
  ): Promise<void> {
    this.receiveStats.entryMessagesReceived += 1;
    const recvUs = nowUs();
    const slotNum = toSlotNumber(entry.slot);
    const raw = entry.entries;
    const bytes = raw instanceof Buffer ? new Uint8Array(raw) : new Uint8Array(raw);

    let decoded: unknown;
    try {
      decoded = wasm().decode_shredstream_entries_bincode(bytes);
    } catch (e) {
      this.receiveStats.entryDecodeFailures += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[shredstream] bincode 解码失败 slot=${slotNum} bytes=${bytes.length}: ${msg}`);
      return;
    }
    if (!Array.isArray(decoded)) {
      console.warn(`[shredstream] 解码结果非数组 slot=${slotNum}`);
      return;
    }

    const conn = this.config.connection;
    if (conn) {
      try {
        await this.processEntryMessageWithAlt(decoded, slotNum, recvUs, queue, bytes.length, conn);
      } catch (e) {
        console.warn(`[shredstream] ALT/RPC 解析失败 slot=${slotNum}:`, e);
        this.processEntryMessageSync(decoded, slotNum, recvUs, queue, bytes.length);
      }
      return;
    }

    this.processEntryMessageSync(decoded, slotNum, recvUs, queue, bytes.length);
  }

  /** 无 RPC：仅用静态账户表 */
  private processEntryMessageSync(
    decoded: unknown[],
    slotNum: number,
    recvUs: number,
    queue: ShredEventQueue,
    entriesBytesLen: number
  ): void {
    let txTotal = 0;
    let evTotal = 0;

    for (const outer of decoded) {
      if (!Array.isArray(outer)) continue;
      const txs = outer as ShredWasmTx[];
      txTotal += txs.length;
      for (let txIndex = 0; txIndex < txs.length; txIndex++) {
        const tx = txs[txIndex];
        if (!tx?.signature) continue;
        const events = dexEventsFromShredWasmTx(tx, slotNum, txIndex, recvUs, undefined);
        evTotal += events.length;
        for (const ev of events) {
          setGrpcRecvUsMut(ev, recvUs);
          queue.push(ev);
        }
      }
    }

    this.receiveStats.transactionsDecoded += txTotal;
    this.receiveStats.dexEventsQueued += evTotal;

    if (shredDebugEnabled()) {
      console.info(
        `[shredstream] slot=${slotNum} entries_bytes=${entriesBytesLen} solana_entries=${decoded.length} txs=${txTotal} dex_events=${evTotal} (static_accounts_only)`
      );
    }
  }

  /** 拉取 ALT 后完整账户表解析 */
  private async processEntryMessageWithAlt(
    decoded: unknown[],
    slotNum: number,
    recvUs: number,
    queue: ShredEventQueue,
    entriesBytesLen: number,
    conn: import("@solana/web3.js").Connection
  ): Promise<void> {
    const altKeys = new Set<string>();
    for (const outer of decoded) {
      if (!Array.isArray(outer)) continue;
      for (const tx of outer as ShredWasmTx[]) {
        for (const l of tx.addressTableLookups ?? []) {
          altKeys.add(l.accountKey);
        }
      }
    }
    const altMap = await loadAddressLookupTableAccounts(conn, [...altKeys]);

    let txTotal = 0;
    let evTotal = 0;

    for (const outer of decoded) {
      if (!Array.isArray(outer)) continue;
      const txs = outer as ShredWasmTx[];
      txTotal += txs.length;
      for (let txIndex = 0; txIndex < txs.length; txIndex++) {
        const tx = txs[txIndex];
        if (!tx?.signature) continue;
        const fullKeys = fullAccountKeyStringsFromShredTx(tx, altMap);
        const events = dexEventsFromShredWasmTxWithFullKeys(
          tx,
          fullKeys,
          slotNum,
          txIndex,
          recvUs,
          undefined
        );
        evTotal += events.length;
        for (const ev of events) {
          setGrpcRecvUsMut(ev, recvUs);
          queue.push(ev);
        }
      }
    }

    this.receiveStats.transactionsDecoded += txTotal;
    this.receiveStats.dexEventsQueued += evTotal;

    if (shredDebugEnabled()) {
      console.info(
        `[shredstream] slot=${slotNum} entries_bytes=${entriesBytesLen} solana_entries=${decoded.length} txs=${txTotal} dex_events=${evTotal} alt_tables=${altKeys.size}`
      );
    }
  }
}

function toSlotNumber(slot: string | number | bigint): number {
  if (typeof slot === "number") return slot;
  if (typeof slot === "bigint") return Number(slot);
  const n = Number(slot);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}
