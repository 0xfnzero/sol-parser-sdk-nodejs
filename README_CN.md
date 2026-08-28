<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>高性能 Solana DEX 事件解析（Node.js / TypeScript）</em></h3>
</div>

<p align="center">
    <a href="https://www.npmjs.com/package/sol-parser-sdk"><img src="https://img.shields.io/badge/npm-sol--parser--sdk-red.svg" alt="npm"></a>
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
    <a href="./README_CN.md">中文</a> |
    <a href="./README.md">English</a> |
    <a href="https://fnzero.dev/">官网</a> |
    <a href="https://t.me/fnzero_group">Telegram</a> |
    <a href="https://discord.gg/vuazbGkqQE">Discord</a>
</p>

---

## 其他语言 SDK

| 语言 | 仓库 |
|------|------|
| Rust | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) |
| Node.js | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) |
| Python | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) |
| Go | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) |

---

## 这个 SDK 适合什么场景

`sol-parser-sdk` 是 FnZero Solana DEX 解析 SDK 的 TypeScript/Node.js 版本。GitHub 仓库名为 `sol-parser-sdk-nodejs`，用于和 Rust/Python/Go 仓库区分。它适合 Bot、索引服务、跟单服务、狙击管道和后端系统，从 Yellowstone gRPC、Jito ShredStream、RPC 交易或协议账户数据中解析强类型 DEX 事件。

| 方向 | 覆盖范围 |
|------|----------|
| 解析输入 | Yellowstone gRPC、ShredStream、RPC 交易、编码交易、协议账户数据 |
| DEX 协议 | PumpFun、PumpSwap、Pump Fees、Raydium LaunchLab、Raydium CPMM、Raydium CLMM、Raydium AMM V4、Meteora DAMM v2、Meteora DLMM、Meteora DBC、Orca Whirlpool |
| 使用场景 | 实时 DEX 事件解析、代币发射监控、跟单交易、狙击机器人、账户填充、JSON 事件管道 |
| 运行环境 | Node.js 18+、TypeScript、npm/yarn/pnpm 项目 |

---

## 发布说明

### v0.5.8

- 与 Rust SDK 的事件模型和 program 路由保持解析对齐。
- 保持 PumpFun create 指令名与 ShredStream quote-mint 处理在多语言 SDK 中一致。
- 继续维护支持 DEX 协议的低延迟 gRPC/RPC/ShredStream 解析路径。

### v0.5.6

- 新增 Meteora DBC 日志解析，并按当前 program context 做路由与过滤。
- 新增 Raydium CLMM/CPMM、Orca account parser 与导出。
- RPC 解析保留区块内交易序号，并在日志解析中维护 active program context。
- ShredStream 对 account-only 或空 include-only filter 直接跳过指令解析。
- 收紧 ShredStream/RPC 的过滤行为，与 Rust/Python/Go 低延迟路径保持一致。

### v0.5.5

- ShredStream 低延迟静态账户路径与 Rust/Python/Go 对齐。
- V0 ALT-loaded 指令账户不再整条跳过，而是用默认 pubkey 占位继续 best-effort 解析。
- 当 ShredStream 外层 program id 来自 ALT 时，按 discriminator 做候选 program id fallback。
- 改进 Pump.fun v2 短账户解析、create/create_v2 处理和事件类型过滤一致性。
- 更新 Pump.fun、PumpSwap、Pump Fees、Raydium、Orca、Meteora 的多协议路由。

---

## 怎么用

### 1. 安装

**npm**

```bash
npm install sol-parser-sdk@0.5.12
```

**源码**（monorepo 里目录可能是 `sol-parser-sdk-ts`）

```bash
git clone https://github.com/0xfnzero/sol-parser-sdk-nodejs
cd sol-parser-sdk-nodejs
npm install
# npm run build   # 若从 dist 引用而非 tsx 跑 examples，再执行
```

### 2. 环境变量（Yellowstone gRPC 示例）

在**包根目录**（与 `package.json` 同级）：

```bash
cp .env.example .env
# 填写 GRPC_URL、GRPC_TOKEN
```

在该目录下执行下面的 `npx tsx`，以便加载 `.env`。

### 3. 冒烟

```bash
npx tsx scripts/test-grpc-ts.ts
```

需要 `GRPC_URL`、`GRPC_TOKEN`。更多变量见 `.env.example`（如 `MAX_EVENTS`、`TIMEOUT_MS`）。

### 4. 最小 gRPC 订阅示例

```typescript
import {
  YellowstoneGrpc,
  parseDexEventsFromGrpcTransactionInfo,
  dexEventToJsonString,
} from "sol-parser-sdk";

const ENDPOINT = process.env.GRPC_URL?.trim() ?? "";
const X_TOKEN = process.env.GRPC_TOKEN?.trim() ?? "";
if (!ENDPOINT || !X_TOKEN) throw new Error("GRPC_URL and GRPC_TOKEN are required");

const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

const filter = {
  account_include: [
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // PumpFun
    "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // PumpSwap
  ],
  account_exclude: [],
  account_required: [],
  vote: false,
  failed: false,
};

const sub = await client.subscribeTransactions(filter, {
  onUpdate: (update) => {
    const txInfo = update.transaction?.transaction;
    if (!txInfo?.transactionRaw || !txInfo.metaRaw) return;
    const slot = update.transaction!.slot;
    const events = parseDexEventsFromGrpcTransactionInfo(txInfo, slot, undefined);
    for (const ev of events) console.log(dexEventToJsonString(ev, 2));
  },
  onError: (err) => console.error(err.message),
  onEnd: () => {},
});

console.log("subscribed", sub.id);
```

### 长时间运行的低延迟 DEX 订阅

公开 API 保持队列式调用，与 Rust SDK 的 `subscribe_dex_events` 形态一致。Node 使用异步
迭代器代替 Rust 的 `ArrayQueue`。Yellowstone 原始 protobuf 对象会直接映射给解析器，不再经过
旧的 protobuf/WASM/JSON/Base58 整笔交易往返；环形队列出队、有界解析前调度、HTTP/2 接收窗口
和重连优化全部由 SDK 内部完成：

```typescript
import { YellowstoneGrpc, lowLatencyClientConfig } from "sol-parser-sdk";

const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN, lowLatencyClientConfig());
const sub = await client.subscribeDexEvents(txFilters, accountFilters, eventTypeFilter);

void (async () => {
  for await (const error of sub.errors) console.error("subscription error", error);
})();

for await (const event of sub) {
  handleEvent(event);
}
```

若使用 `for await`，默认溢出策略仍是 `drop-newest`，以保持兼容。更重视贴近链尖的消费者
可以设置 `queueOverflowStrategy: "drop-oldest"`。通过 `sub.len()` / `sub.eventDropped()` 监控
公开事件队列，通过 `sub.ingressLen()` / `sub.ingressDropped()` 监控解析前入口队列；
`sub.dropped()` 返回两者之和。每次溢出都会计数，并定期通过 `sub.errors` 报告。

如需精确测量纯本地延迟，请设置 `config.enable_metrics = true`。事件 metadata 将包含
`local_queue_latency_us`、`parse_duration_us` 和 `local_processing_latency_us`，这些字段使用
Node 单调高精度时钟，只测量本地排队与解析。热路径不会调用 `getSlot`、`getTransaction`、
JSON-RPC 或任何 unary RPC 方法。

`local_processing_latency_us` 是本地端到端指标：从进入 Yellowstone gRPC `data` 回调开始，
到完整事件解析和字段填充结束为止。

PumpFun 与 PumpSwap 全量交易可以直接使用和 Rust 对齐的 Program ID 过滤器。Yellowstone 的
`account_include` 是 ANY 语义，因此下面会接收包含任一协议程序的全部交易：

```typescript
const allPumpTransactions = transactionFilterForProtocols(["PumpFun", "PumpSwap"]);
const sub = await client.subscribeDexEvents([allPumpTransactions], [], eventTypeFilter);
```

`eventTypeFilter` 可以减少无关事件解码，但不会减少 Yellowstone 发来的交易。只有应用明确只想
监控部分 mint、pool 或 user 时，才需要下面的可选限定过滤器；它要求交易同时包含协议程序，
并包含任意一个已跟踪账户：

```typescript
const pumpSwap = transactionFilterForProtocolAccounts("PumpSwap", knownMintsAndPools);
const sub = await client.subscribeDexEvents(
  [transactionFilterForProtocols(["PumpFun"]), pumpSwap],
  [],
  eventTypeFilter
);
```

组合示例默认订阅全量 PumpSwap。只有设置 `PUMPSWAP_FILTER_MODE=scoped` 时才按账户限定；
该模式会通过 `updateSubscription()` 刷新活跃账户过滤器。`PumpSwapCreatePool` 可把已知 base
mint 或 quote mint 映射到 pool，再将 `PumpSwapLiquidityAdded.user` 与该 mint 的开发者比较。

同一 Node 进程里的两个 `YellowstoneGrpc` 实例仍共享一个 JavaScript 事件循环。直接 protobuf
路径支持在一条订阅中接收全量 PumpFun + PumpSwap；只有业务回调、数据库写入或更多协议使事件
循环饱和时，才需要独立进程或 Worker Thread。仅拆成两条 gRPC 连接不能隔离 CPU。数据库写入
应进入有界交接队列并异步批量写 SQLite WAL，不要在订阅循环中逐事件等待写入。

当消费者平均处理速度低于过滤后的入流速度时，任何有界内存流都无法同时保证零丢失和
有界延迟。消费循环应保持轻量，避免逐事件同步日志，在服务端尽量缩小过滤范围，并把
慢 I/O 的持久化或分发移出消费循环。

更轻量：仅用日志用 `parseLogsOnly`；要补账户可再配合 `applyAccountFillsToLogEvents`。

### 5. ShredStream（HTTP，不是 Yellowstone gRPC）

使用 **`SHREDSTREAM_URL`** / **`SHRED_URL`**（默认 `http://127.0.0.1:10800`）或命令行 **`--url`**，**不用** `GRPC_URL`。

客户端在 **TypeScript** 中解码 gRPC `entries` 负载（布局与 Go `shredstream/entries_decode` 一致），并用 `@solana/web3.js` 反序列化线格式交易，**无需 WebAssembly / wasm-pack**。

```bash
npx tsx examples/shredstream_example.ts -- --url=http://127.0.0.1:10800
```

无 RPC 时，V0 ALT-loaded 账户索引用默认 pubkey 占位并继续 best-effort 解析。若需要精确的 ALT 加载账户字段，`shredstream_pumpfun_json.ts` 也可以使用 Solana **`RPC_URL`**（或 `--rpc`）展开 ALT。

---

## 示例列表

在**包根目录**执行，`npm install` 后即可。示例用 `npx tsx` 直接加载 **`src/`**，**不必先 `npm run build`**。**源码**列每个文件单独一行，链接指向 GitHub 上的对应源码（GitHub / npm 均可点击）。

| 描述 | 运行命令 | 源码 |
|------|----------|------|
| **本包脚本** | | |
| gRPC 集成测试（PumpFun + PumpSwap，账户填充后的 `DexEvent`） | `npx tsx scripts/test-grpc-ts.ts` | [test-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/test-grpc-ts.ts) |
| 调试：打印 `metaRaw` / 日志结构 | `npx tsx scripts/debug-grpc-ts.ts` | [debug-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/debug-grpc-ts.ts) |
| **PumpFun** | | |
| CREATE + dev BUY/SELL 长时间低延迟订阅 | `npx tsx examples/devtrades_low_latency.ts` | [devtrades_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_low_latency.ts) |
| PumpFun + 全量 PumpSwap 开发者交易/加池 | `npm run example:grpc:devtrades:pumpswap` | [devtrades_pumpfun_pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_pumpfun_pumpswap_low_latency.ts) |
| gRPC 输出完整 JSON `DexEvent` | `npx tsx examples/pumpfun_grpc_json.ts` | [pumpfun_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.ts) |
| PumpFun 事件 + 性能指标 | `npx tsx examples/pumpfun_with_metrics.ts` | [pumpfun_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.ts) |
| PumpFun 交易类型过滤 | `npx tsx examples/pumpfun_trade_filter.ts` | [pumpfun_trade_filter.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.ts) |
| PumpFun 快速连接测试 | `npx tsx examples/pumpfun_quick_test.ts` | [pumpfun_quick_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.ts) |
| **PumpSwap** | | |
| gRPC 输出完整 JSON `DexEvent` | `npx tsx examples/pumpswap_grpc_json.ts` | [pumpswap_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.ts) |
| PumpSwap 事件 + 性能指标 | `npx tsx examples/pumpswap_with_metrics.ts` | [pumpswap_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.ts) |
| PumpSwap 交易、创建池及流动性事件（超低延迟） | `npm run example:grpc:pumpswap` | [pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.ts) |
| **Meteora DAMM** | | |
| Meteora DAMM V2 事件 | `npx tsx examples/meteora_damm_grpc.ts` | [meteora_damm_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.ts) |
| **ShredStream**（HTTP，**非** Yellowstone gRPC；端点见上文步骤 5） | | |
| 超低延迟订阅、队列与延迟统计。端点：`--url` / `SHREDSTREAM_URL` / `.env`（默认 `http://127.0.0.1:10800`）。 | `npx tsx examples/shredstream_example.ts` | [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts) |
| ShredStream → PumpFun `DexEvent` JSON；无 RPC 时可静态 ALT fallback，配置 Solana **RPC**（`RPC_URL` 或 `--rpc`）时可展开完整 ALT 账户。 | `npx tsx examples/shredstream_pumpfun_json.ts` | [shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts) |
| **多协议** | | |
| 同时订阅所有 DEX 协议 | `npx tsx examples/multi_protocol_grpc.ts` | [multi_protocol_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.ts) |
| **工具** | | |
| 验证 onUpdate 同步错误不会打断 gRPC 流 | `npx tsx examples/grpc_onupdate_error_test.ts` | [grpc_onupdate_error_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/grpc_onupdate_error_test.ts) |
| 按签名解析交易（`parseTransactionFromRpc`；非 gRPC）。在 `.env` 或环境中设置 `TX_SIGNATURE`。 | `npx tsx examples/parse_tx_by_signature.ts` | [parse_tx_by_signature.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.ts) |

**`npm run` 别名**（与上表 ShredStream 行同一源码文件，每行一条）：

- `npm run example:shredstream` → [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts)
- `npm run example:shredstream:subscribe` → [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts)
- `npm run example:shredstream:pumpfun-json` → [shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts)

**环境变量：** gRPC 示例需要 **`GRPC_URL`**、**`GRPC_TOKEN`**。已 export 的 shell 环境变量优先，`.env` 只补充尚未设置的值。ShredStream 使用 **`SHREDSTREAM_URL`** / **`SHRED_URL`** 或 **`--url`**；**`shredstream_pumpfun_json`** 另需 **`RPC_URL`** / **`--rpc`**。详见 **`.env.example`**。

---

## 协议

PumpFun、PumpSwap、Raydium AMM V4 / CLMM / CPMM、Orca Whirlpool、Meteora DAMM V2 / DLMM、Raydium LaunchLab（见 `src/instr/`）。

---

## 常用 API

- `parseDexEventsFromGrpcTransactionInfo` — 需要 `transactionRaw` + `metaRaw`（与 Rust gRPC 对齐）。
- `parseRpcTransaction` / `parseTransactionFromRpc` — HTTP RPC 全量解析。
- `dexEventToJsonString` — 含 BigInt 的安全 JSON 输出。

---

## 开发

```bash
npm run build
npm run check:migration   # 对齐与校验，需先 build
```

---

## 许可证

MIT — https://github.com/0xfnzero/sol-parser-sdk-nodejs
