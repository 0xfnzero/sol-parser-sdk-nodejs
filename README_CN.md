<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>高性能 Solana DEX 事件解析（Node.js / TypeScript）</em></h3>
</div>

<p align="center">
    <strong>从 gRPC、ShredStream、RPC 交易及协议账户解析类型化事件，用于索引、监控和交易系统。</strong>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/sol-parser-sdk"><img src="https://img.shields.io/npm/v/sol-parser-sdk.svg" alt="sol-parser-sdk"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&amp;logo=typescript&amp;logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&amp;logo=solana&amp;logoColor=white" alt="Solana">
    <img src="https://img.shields.io/badge/gRPC-4285F4?style=for-the-badge&amp;logo=grpc&amp;logoColor=white" alt="gRPC">
</p>

<p align="center">
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/README_CN.md">中文</a> |
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/README.md">English</a> |
    <a href="https://fnzero.dev/">Website</a> |
    <a href="https://t.me/fnzero_group">Telegram</a> |
    <a href="https://discord.gg/vuazbGkqQE">Discord</a>
</p>

当前版本：**0.9.1**。升级前请阅读 [迁移说明](RELEASE_NOTES.md)；历史变更见 [版本记录](CHANGELOG_CN.md)。

## 目录

- [SDK 版本与相关项目](#sdk-版本与相关项目)
- [怎么用](#怎么用)
- [这个 SDK 适合什么场景](#这个-sdk-适合什么场景)
- [交易来源与解析边界](#交易来源与解析边界)
- [协议](#协议)
- [文档导航](#文档导航)

<a id="sdk-版本与相关项目"></a>

## 📦 SDK 版本与相关项目

各仓库版本独立，依赖兼容要求以对应 SDK 的安装说明为准。

| 语言 | 仓库 | 用途 | 版本 |
|----------|------------|-------------|---------|
| Rust | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) | DEX 交易与账户事件解析 | `v0.9.1` |
| Node.js | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) | DEX 交易与账户事件解析 | `v0.9.1` |
| Python | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) | DEX 交易与账户事件解析 | `v0.9.1` |
| Go | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) | DEX 交易与账户事件解析 | `v0.9.1` |
| Rust | [sol-trade-sdk](https://github.com/0xfnzero/sol-trade-sdk) | 交易构建、签名与多通道提交 | `v9.0.1` |
| Node.js | [sol-trade-sdk-nodejs](https://github.com/0xfnzero/sol-trade-sdk-nodejs) | 交易构建、签名与多通道提交 | `v9.0.1` |
| Python | [sol-trade-sdk-python](https://github.com/0xfnzero/sol-trade-sdk-python) | 交易构建、签名与多通道提交 | `v9.0.1` |
| Go | [sol-trade-sdk-golang](https://github.com/0xfnzero/sol-trade-sdk-golang) | 交易构建、签名与多通道提交 | `v9.0.1` |
| Rust | [sol-shred-sdk](https://github.com/0xfnzero/sol-shred-sdk) | 原始 Shred 解码与 ShredStream 指令事件 | `v6.0.1` |
| Rust | [solana-streamer](https://github.com/0xfnzero/solana-streamer) | gRPC / ShredStream 订阅与事件流封装 | `v5.0.0` |
| Rust | [sol-trade-router-sdk](https://github.com/0xfnzero/sol-trade-router-sdk) | 链上多跳 Router 与客户端 SDK | `v0.3.0` |

<a id="怎么用"></a>

## 怎么用

### 1. 安装

**npm**

```bash
npm install sol-parser-sdk@0.9.1
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

自动重连默认从最后一个成功解析的 slot 继续订阅，并对回放的 transaction/account update
去重。可通过 `sub.isStreamConnected()`、`sub.streamDisconnects()`、`sub.reconnects()`、
`sub.replayedUpdates()` 和 `sub.continuityBreaks()` 监控传输连续性。本地 drop 为零并不能说明
进入 gRPC `data` 回调之前没有丢数据。如果 provider 拒绝 Yellowstone `fromSlot`，SDK 会通过
`sub.errors` 明确报告，增加 `continuityBreaks()`，再降级为 live 重连。只有在“绝不接收回放重复”
比“补偿断线窗口”更重要时，才应设置 `replayOnReconnect: false`。

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

未配置 `connection` 或预热 ALT 快照时，默认跳过含未解析索引的指令；旧占位行为仅通过显式 `dexEventsFromShredWasmTxBestEffort` API 提供。配置 `connection` 或 `address_lookup_tables` 后，解析只读取完整的 ALT 缓存快照：缓存 miss 跳过整笔交易，累计 `getReceiveStats().altCacheMissTransactions`，不会重放。`connection` 仅用于订阅前显式调用 `await client.preloadAddressLookupTables(altAddresses)` 预热，以及独立后台刷新任务（默认间隔 1000 毫秒，最多一个请求在途）；也可通过 `config.address_lookup_tables` 注入已加载的快照。缓存和待刷新队列各最多保留 2048 张表，刷新结果只供后续消息使用。`shredstream_pumpfun_json.ts` 的 **`RPC_URL`**（或 `--rpc`）用于后台刷新，Entry 解析不等待 RPC。

<a id="这个-sdk-适合什么场景"></a>

## 这个 SDK 适合什么场景

`sol-parser-sdk` 是 FnZero Solana DEX 解析 SDK 的 TypeScript/Node.js 版本。GitHub 仓库名为 `sol-parser-sdk-nodejs`，用于和 Rust/Python/Go 仓库区分。它适合 Bot、索引服务、跟单服务、狙击管道和后端系统，从 Yellowstone gRPC、Jito ShredStream、RPC 交易或协议账户数据中解析强类型 DEX 事件。

| 方向 | 覆盖范围 |
|------|----------|
| 解析输入 | Yellowstone gRPC、ShredStream、RPC 交易、编码交易、协议账户数据 |
| DEX 协议 | PumpFun、PumpSwap、Pump Fees、Raydium LaunchLab、Raydium CPMM、Raydium CLMM、Raydium AMM V4、Meteora DAMM v2、Meteora DLMM、Meteora DBC、Orca Whirlpool |
| 使用场景 | 实时 DEX 事件解析、代币发射监控、跟单交易、狙击机器人、账户填充、JSON 事件管道 |
| 运行环境 | Node.js 20.18+、TypeScript、npm/yarn/pnpm 项目 |

<a id="交易来源与解析边界"></a>

## 交易来源与解析边界

gRPC/RPC 使用提供的执行元数据和实际 CPI 指令；Shred 只能看到外层指令与本地已解析的账户。未知第三方指令在自身账户中引用 Pump.fun 时，可回调 `PumpFunTrade` 候选，携带 `third_program` 原始输入与 `Unresolved` 状态；这不证明交易已执行，也不确定方向或金额。买入／卖出专用过滤器不会把未知方向当作成交。

解析热路径不调用 RPC。按 `parse_status` 判断证据，缺失字段的默认值不代表实际零成交。账户顺序与原始指令数据保留在 `third_program`；交易序号和接收时间仍在事件元数据中，本地 Shred 序号不等于全 slot 执行顺序。详见 [第三方包装交易](docs/wrapped-pumpfun.md)及[跨语言接口与证据约定](docs/cross-language-sync.md)。

<a id="示例列表"></a>

## 示例列表

在**包根目录**执行，`npm install` 后即可。示例用 `npx tsx` 直接加载 **`src/`**，**不必先 `npm run build`**。**源码**列每个文件单独一行，链接指向 GitHub 上的对应源码（GitHub / npm 均可点击）。

| 描述 | 运行命令 | 源码 |
|------|----------|------|
| **本包脚本** | | |
| gRPC 集成测试（PumpFun + PumpSwap，账户填充后的 `DexEvent`） | `npx tsx scripts/test-grpc-ts.ts` | [test-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/test-grpc-ts.ts) | `v0.9.1` |
| 调试：打印 `metaRaw` / 日志结构 | `npx tsx scripts/debug-grpc-ts.ts` | [debug-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/debug-grpc-ts.ts) | `v0.9.1` |
| **PumpFun** | | |
| CREATE + dev BUY/SELL 长时间低延迟订阅 | `npx tsx examples/devtrades_low_latency.ts` | [devtrades_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_low_latency.ts) | `v0.9.1` |
| PumpFun + 全量 PumpSwap 开发者交易/加池 | `npm run example:grpc:devtrades:pumpswap` | [devtrades_pumpfun_pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_pumpfun_pumpswap_low_latency.ts) | `v0.9.1` |
| gRPC 输出完整 JSON `DexEvent` | `npx tsx examples/pumpfun_grpc_json.ts` | [pumpfun_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.ts) | `v0.9.1` |
| PumpFun 事件 + 性能指标 | `npx tsx examples/pumpfun_with_metrics.ts` | [pumpfun_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.ts) | `v0.9.1` |
| PumpFun 交易类型过滤 | `npx tsx examples/pumpfun_trade_filter.ts` | [pumpfun_trade_filter.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.ts) | `v0.9.1` |
| PumpFun 快速连接测试 | `npx tsx examples/pumpfun_quick_test.ts` | [pumpfun_quick_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.ts) | `v0.9.1` |
| **PumpSwap** | | |
| gRPC 输出完整 JSON `DexEvent` | `npx tsx examples/pumpswap_grpc_json.ts` | [pumpswap_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.ts) | `v0.9.1` |
| PumpSwap 事件 + 性能指标 | `npx tsx examples/pumpswap_with_metrics.ts` | [pumpswap_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.ts) | `v0.9.1` |
| PumpSwap 交易、创建池及流动性事件（超低延迟） | `npm run example:grpc:pumpswap` | [pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.ts) | `v0.9.1` |
| **Meteora DAMM** | | |
| Meteora DAMM V2 事件 | `npx tsx examples/meteora_damm_grpc.ts` | [meteora_damm_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.ts) | `v0.9.1` |
| **ShredStream**（HTTP，**非** Yellowstone gRPC；端点见上文步骤 5） | | |
| 超低延迟订阅、队列与延迟统计。端点：`--url` / `SHREDSTREAM_URL` / `.env`（默认 `http://127.0.0.1:10800`）。 | `npx tsx examples/shredstream_example.ts` | [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts) | `v0.9.1` |
| ShredStream → PumpFun `DexEvent` JSON；RPC（`RPC_URL` 或 `--rpc`）只后台刷新 ALT，冷缓存 miss 跳过并计数、不重放；应预热所需表。 | `npx tsx examples/shredstream_pumpfun_json.ts` | [shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts) | `v0.9.1` |
| **多协议** | | |
| 同时订阅所有 DEX 协议 | `npx tsx examples/multi_protocol_grpc.ts` | [multi_protocol_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.ts) | `v0.9.1` |
| **工具** | | |
| 验证 onUpdate 同步错误不会打断 gRPC 流 | `npx tsx examples/grpc_onupdate_error_test.ts` | [grpc_onupdate_error_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/grpc_onupdate_error_test.ts) | `v0.9.1` |
| 按签名解析交易（`parseTransactionFromRpc`；非 gRPC）。在 `.env` 或环境中设置 `TX_SIGNATURE`。 | `npx tsx examples/parse_tx_by_signature.ts` | [parse_tx_by_signature.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.ts) | `v0.9.1` |

**`npm run` 别名**（与上表 ShredStream 行同一源码文件，每行一条）：

- `npm run example:shredstream` → [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts)
- `npm run example:shredstream:subscribe` → [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts)
- `npm run example:shredstream:pumpfun-json` → [shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts)

**环境变量：** gRPC 示例需要 **`GRPC_URL`**、**`GRPC_TOKEN`**。已 export 的 shell 环境变量优先，`.env` 只补充尚未设置的值。ShredStream 使用 **`SHREDSTREAM_URL`** / **`SHRED_URL`** 或 **`--url`**；**`shredstream_pumpfun_json`** 另需 **`RPC_URL`** / **`--rpc`**。详见 **`.env.example`**。

<a id="协议"></a>

## 协议

PumpFun、PumpSwap、Raydium AMM V4 / CLMM / CPMM、Orca Whirlpool、Meteora DAMM V2 / DLMM、Raydium LaunchLab（见 `src/instr/`）。

<a id="常用-api"></a>

## 常用 API

- `parseDexEventsFromGrpcTransactionInfo` — 需要 `transactionRaw` + `metaRaw`（与 Rust gRPC 对齐）。
- `parseRpcTransaction` / `parseTransactionFromRpc` — HTTP RPC 全量解析。
- `dexEventToJsonString` — 含 BigInt 的安全 JSON 输出。

<a id="开发"></a>

## 开发

```bash
npm run build
npm run check:migration   # 对齐与校验，需先 build
```

<a id="api-兼容性"></a>

## API 兼容性

完整跨语言 API 对齐仍在进行；公开行为和支持边界见 [API 迁移说明](docs/USAGE.md#api-compatibility)，使用方法见 examples 目录。

PumpFun create/create_v2 的共享主网样本、重放方法和验证边界见 [验证说明](https://github.com/0xfnzero/sol-parser-sdk-golang/tree/main/validation/pumpfun_create_20261007)。

### Pump ShredStream 离线回归

用户示例位于 examples，自动回归测试单独维护。旧路由意图模拟入口及其无引用快照已移除；当前包装交易回放与过滤语义见 [包装交易说明](docs/wrapped-pumpfun.md)。Shred 只解码已解析完整的外层账户；第三方候选通过 PumpFunTrade 的 third_program 透传，不能当作已确认成交，热路径不调用 RPC。

### 可重复的本地热路径基准

运行 `npx tsx examples/hotpath_benchmark.ts`；可选第二个参数为 JSON
配置路径。默认配置在 `examples/hotpath_benchmark.json`，可修改预热次数、
样本数与批大小。固定工作负载覆盖真实签名的包装程序和 ALT 交易，分别测量
完整账户解析与 wire 解码加解析。文件读取、配置及样例准备均在计时之外，
计时循环无 RPC/网络请求。输出 p50/p95/p99 为每批折算的单交易微秒分布，
包含调度和 GC 影响；这不是生产延迟或上链速度保证。比较时保持运行时、
配置和主机负载一致，双方均需先预热。

<a id="文档导航"></a>

## 文档导航

- [发布与迁移](RELEASE_NOTES.md)
- [使用指南](docs/USAGE.md)
- [跨语言功能与边界](docs/cross-language-sync.md)


<a id="许可证"></a>

## 许可证

MIT — https://github.com/0xfnzero/sol-parser-sdk-nodejs


股票池同步：33 种官方股票/ETF、58 个股票池；配置扩展、USDC 起点、缓存选路与使用边界见 [11 SDK 同步说明](docs/STOCK_BRIDGE_SYNC.md)。
