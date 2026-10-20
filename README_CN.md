当前版本：**0.6.0**。本轮同步 SDK、原生语言测试、示例及文档。升级说明见 [RELEASE_NOTES.md](RELEASE_NOTES.md)。

[v0.6.0: SDK、原生 examples、股票目录与交易来源同步说明](docs/cross-language-sync.md)

<div align="center">

## v0.5.24 — Shred 元数据透传与顺序范围

保留并验证 `tx_index`、接收时间从解析入口传到原始指令回调。明确 Entries 消息内序号与 Yellowstone 节点 index 的区别：本地序号不是全 slot 索引；跨消息去重使用交易签名。此版本完善文档和回归保护，不改变现有字段或编号规则。


## v0.5.24 — RawInstruction 协议过滤与 DEX 枚举

修复原始指令绕过 DEX 订阅范围的问题。按单条指令引用的官方程序识别 DEX，使用 `RawInstructionDexType` 枚举；JSON 字符串保持不变。未知 router 不推断池子地址、买卖方向或方法版本。


## v0.5.24 — Pump 执行事件与最新回放示例

修复官方 Anchor CPI TradeEvent 前缀识别，保留历史编码兼容。RPC/gRPC 的实际 `sol_amount`、`quote_amount`、`token_amount` 只从执行事件合并；预算和最小输出保留在指令参数字段。如果日志及事件 CPI 均缺失，实际金额字段为 0（表示无执行数据，不代表已确认零成交）。非 SOL 报价金额不能当作 SOL。

在本仓库运行 `npx tsx examples/pump_execution_replay.ts`，离线回放 2026-10-19 重新抓取的真实交易。示例输出完整日志、无日志、截断日志三种结果；命令末尾追加最新签名可在线验证。通过 `SOLANA_RPC_URL` 选择 RPC，支持 transaction v1。

新 Delta 卖出样本：`4ARos3Yq1SMNE3izDpy9YdKrRgMmD7UCDxvnVrBRaGCJHiifPHSmQWc4DPfjUaEUcxS7puGmEN64K7EZdeXLJaj2`，slot 458542546。日期样本文件还包含 Rapid 创建后买入、BuyV3 和 PumpSwap 买入的完整签名及 slot。旧的五种双跳组合仅作为回归样本，未冒充本次新抓取交易。

## v0.5.24 — Shred 原始指令透传

默认 Shred 入口将未适配的第三方程序（包括 Rapid/Delta）作为 `RawInstruction` 返回，不再推断买卖方向、金额或内部 buy 版本。System、Token、ATA、ComputeBudget 等基础程序默认不透传；已支持的官方 DEX 指令继续正常解析，官方 Pump/PumpSwap 多跳仍返回 `PumpRouteIntent`。

事件包含 `program_id`、`instruction_index`、`accounts`、`account_indices`、`instruction_data` 和交易 metadata。账户保留原顺序与重复项；未解析 ALT 地址为 null/None，原始索引仍保留。使用缓存 loaded-addresses/resolver 补齐，热路径不请求 RPC。data 是完整原始字节，不要求已知布局。

运行 `npx tsx examples/raw_instruction_filter.ts` 对比同一组已签名交易的 PumpFun、Raydium CPMM 与全量原始指令订阅；输出包含 `dexes`。

原始事件保留调用方传入的 `metadata.tx_index` 和 `metadata.grpc_recv_us`（streamer 对应 `metadata.recv_us`）。默认 Entries 客户端的交易序号仅在单条接收消息内递增，下一条消息从 0 重新计数，不等于已确认的整个 slot 交易序号。`instruction_index` 表示交易内外层指令顺序；接收时间是本地微秒时间戳，不保证链上执行顺序。独立回放 API 可能默认填 0，调用时应传入上游已有的序号与接收时间。

无过滤器时返回未知第三方指令。宽泛交易/Swap 订阅（如 `PumpFunTrade`、`RaydiumCpmmSwap`）也返回关联该 DEX 的原始指令；买/卖方向订阅不推测方向。显式 `RawInstruction` 仅在未限制协议时返回全部外层指令，streamer 的协议限制始终生效；显式排除 `RawInstruction` 优先。`dex_type` 使用公开枚举 `RawInstructionDexType`（Go 为命名字符串类型与常量）；JSON 仍为 `"pumpfun"`、`"raydium_cpmm"` 等原有字符串。`dexes` 数组包含各关联 DEX 的 `{ dex_type, program_id, pool }`，只识别本条指令直接调用或账户中引用的 DEX 程序，不借用同笔其他指令的账户；多 DEX 包装保留所有关联。未知或未解析 ALT 中的程序不能匹配 DEX 订阅。`pool` 当前为 null：未知包装布局无法确定池子账户。program 引用不证明执行了 CPI，原始回调不是成交。

已有 wrapper 适配函数仅作为显式调用的兼容接口保留，不参与默认 Shred 解码。以下已发布版本的历史说明描述旧行为。

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

## 📦 SDK 版本与相关项目

解析 SDK 的各语言版本及相关 Rust SDK：

| 语言 | 仓库 | 描述 | 版本 |
|------|------|------|
| Rust | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) | Solana DEX 交易与账户事件解析 | `v0.8.0` |
| Node.js | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) | TypeScript/JavaScript，Node.js 支持 | `v0.6.0` |
| Python | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) | 原生 async/await 支持 | `v0.6.0` |
| Go | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) | Go 交易与账户事件解析 | `v0.6.0` |
| **Rust** | [sol-shred-sdk](https://github.com/0xfnzero/sol-shred-sdk) | Solana 原始 shred 解码与 ShredStream DEX 事件解析 | `v5.0.0` |
| **Rust** | [sol-trade-sdk](https://github.com/0xfnzero/sol-trade-sdk) | Solana DEX 交易构建与交易执行 | `v8.0.0` |

---

## 这个 SDK 适合什么场景

`sol-parser-sdk` 是 FnZero Solana DEX 解析 SDK 的 TypeScript/Node.js 版本。GitHub 仓库名为 `sol-parser-sdk-nodejs`，用于和 Rust/Python/Go 仓库区分。它适合 Bot、索引服务、跟单服务、狙击管道和后端系统，从 Yellowstone gRPC、Jito ShredStream、RPC 交易或协议账户数据中解析强类型 DEX 事件。

| 方向 | 覆盖范围 |
|------|----------|
| 解析输入 | Yellowstone gRPC、ShredStream、RPC 交易、编码交易、协议账户数据 |
| DEX 协议 | PumpFun、PumpSwap、Pump Fees、Raydium LaunchLab、Raydium CPMM、Raydium CLMM、Raydium AMM V4、Meteora DAMM v2、Meteora DLMM、Meteora DBC、Orca Whirlpool |
| 使用场景 | 实时 DEX 事件解析、代币发射监控、跟单交易、狙击机器人、账户填充、JSON 事件管道 |
| 运行环境 | Node.js 20.18+、TypeScript、npm/yarn/pnpm 项目 |

---

## 发布说明

## v0.5.21 — Pump 路由方向与指令名称

路由事件沿用 `is_buy`、`ix_name` 命名。RapidBuy 为买入意图，指令名为官方 IDL 的 `buy_exact_quote_in_v2`；BuyPumpDelta 仅确定买入方向。多跳路由方向和无法确定的方法保持为空。币种读取 `hops[].base_mint` / `quote_mint`。这些字段不代表已成交；过滤器不会把路由事件转换为交易事件。

旧 JSON 缺少新字段时保持未知。Rust 结构体字面量须补齐新字段；Go 新字段为指针，Node.js/Python 未知值为 null/None。Streamer 新增 `DexEvent::PumpRouteIntentEvent` 并保留路由字段，支持协议与事件过滤。

## v0.5.20 — Pump routes and offline replay

Adds native Pump route-intent parsing for official multi-hop instructions and the exact RapidBuy/BuyPumpDelta wrapper layouts captured in reported transactions. Adds locally cached ALT resolution and rejects unresolved account identities by default, with explicit best-effort compatibility APIs where supported. Route intents expose instruction constraints and hop identities; confirmed execution amounts require execution metadata.

Includes the latest complete implementation, signed transaction fixtures, native offline-bank regression examples and reproducible local hot-path benchmarks. Unknown wrapper layouts are not inferred from embedded bytes. Local tests do not measure production network latency.

## v0.5.19 — Pump depth-2 compatibility

Adds signed Pump depth-2 create-event replay coverage, including ALT-loaded accounts and executed logs. Existing event layouts and public parsing interfaces remain unchanged.

Validation includes official Pump SDK 4.1.0 instruction comparisons, signed local LiteSVM simulations and SDK regressions. Local simulation state/config is synthetic; no funded transactions were broadcast and production latency was not measured.

## v0.5.18 — Signed transaction and hot-path hardening

Hardens signed transaction sanitization, loaded-address boundaries, ordered stream filtering and parser lifecycle. Aligns CLMM and DEX instruction/event layouts, nested CPI route attribution and liquidity/reward accounting. Adds independently signed wire fixtures, ALT failure cases and offline bank regressions.

Validation includes local CPU benchmarks and offline signed-bank scenarios. Measured hot paths use cached inputs without RPC. Benchmarks do not establish production network or transaction-landing latency. No funded mainnet transactions were broadcast.

### v0.5.17

- 按实际指令 discriminator 和事件 mint 匹配 PumpFun create/create_v2 账户，支持 CPI，并拒绝猜测有歧义的匹配。
- 停止从 create_v2 的任意尾部账户推断 quote mint、vault、token program，保留权威解码字段。
- 恢复历史 CreateEvent 布局，并通过保存的真实主网成功、失败交易验证。
- 过滤失败交易中已经回滚的 Create/Buy 等 DEX 事件，并在 RPC/gRPC 转换中保留失败状态。

### v0.5.16

- Adds native gRPC lifecycle and block metadata support, instruction-level route analysis and StonkFun registry/snapshot examples.
- Improves exact metadata serialization, account matching and wire transaction bounds validation.
- Includes native alignment evidence and simulation route fixtures. These language releases do not yet implement the new CPMM creator-fee collection event API.

### v0.5.15

- 对齐 Rust sol-parser-sdk **0.7.3**，覆盖当前 PumpFun、PumpSwap、Pump Fees 与 Meteora DAMM v2 协议字段。
- DLMM Swap 上下文字段（`token_x/y_mint`、`user_token_in/out`、`min_amount_out`）、PumpFun 可选 pre/post SOL/token 余额、Raydium LaunchLab quote/global/platform 账户上下文与 Rust 对齐。
- 在 PumpFun/PumpSwap instruction、log、account、gRPC 与 JSON 事件链路中补齐 creator fee 和 holder reward 字段。
- 拒绝 PumpSwap trade 与 CreatePool 已知字段的截断尾部，并避免 PumpSwap 专属字段进入 PumpFun CreateV2 payload。

### v0.5.14

- 将 Yellowstone 客户端升级到 `@triton-one/yellowstone-grpc` 7.0.0，使用其原生 Rust N-API 传输层。
- 新增 `source_to_grpc_latency_us`，用于区分服务商或传输层积压与精确的本地处理延迟。
- 修复 Yellowstone `createdAt` 使用 JavaScript `Date` 对象表示时的时间戳解析。
- 更新原生连接、keepalive、流量控制、流生命周期和 unary RPC 兼容处理。
- 要求 Node.js 20.18 或更高版本。

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
npm install sol-parser-sdk@0.6.0
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

---

## 示例列表

在**包根目录**执行，`npm install` 后即可。示例用 `npx tsx` 直接加载 **`src/`**，**不必先 `npm run build`**。**源码**列每个文件单独一行，链接指向 GitHub 上的对应源码（GitHub / npm 均可点击）。

| 描述 | 运行命令 | 源码 |
|------|----------|------|
| **本包脚本** | | |
| gRPC 集成测试（PumpFun + PumpSwap，账户填充后的 `DexEvent`） | `npx tsx scripts/test-grpc-ts.ts` | [test-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/test-grpc-ts.ts) | `v0.6.0` |
| 调试：打印 `metaRaw` / 日志结构 | `npx tsx scripts/debug-grpc-ts.ts` | [debug-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/debug-grpc-ts.ts) | `v0.6.0` |
| **PumpFun** | | |
| CREATE + dev BUY/SELL 长时间低延迟订阅 | `npx tsx examples/devtrades_low_latency.ts` | [devtrades_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_low_latency.ts) | `v0.6.0` |
| PumpFun + 全量 PumpSwap 开发者交易/加池 | `npm run example:grpc:devtrades:pumpswap` | [devtrades_pumpfun_pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_pumpfun_pumpswap_low_latency.ts) | `v0.6.0` |
| gRPC 输出完整 JSON `DexEvent` | `npx tsx examples/pumpfun_grpc_json.ts` | [pumpfun_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.ts) | `v0.6.0` |
| PumpFun 事件 + 性能指标 | `npx tsx examples/pumpfun_with_metrics.ts` | [pumpfun_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.ts) | `v0.6.0` |
| PumpFun 交易类型过滤 | `npx tsx examples/pumpfun_trade_filter.ts` | [pumpfun_trade_filter.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.ts) | `v0.6.0` |
| PumpFun 快速连接测试 | `npx tsx examples/pumpfun_quick_test.ts` | [pumpfun_quick_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.ts) | `v0.6.0` |
| **PumpSwap** | | |
| gRPC 输出完整 JSON `DexEvent` | `npx tsx examples/pumpswap_grpc_json.ts` | [pumpswap_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.ts) | `v0.6.0` |
| PumpSwap 事件 + 性能指标 | `npx tsx examples/pumpswap_with_metrics.ts` | [pumpswap_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.ts) | `v0.6.0` |
| PumpSwap 交易、创建池及流动性事件（超低延迟） | `npm run example:grpc:pumpswap` | [pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.ts) | `v0.6.0` |
| **Meteora DAMM** | | |
| Meteora DAMM V2 事件 | `npx tsx examples/meteora_damm_grpc.ts` | [meteora_damm_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.ts) | `v0.6.0` |
| **ShredStream**（HTTP，**非** Yellowstone gRPC；端点见上文步骤 5） | | |
| 超低延迟订阅、队列与延迟统计。端点：`--url` / `SHREDSTREAM_URL` / `.env`（默认 `http://127.0.0.1:10800`）。 | `npx tsx examples/shredstream_example.ts` | [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts) | `v0.6.0` |
| ShredStream → PumpFun `DexEvent` JSON；RPC（`RPC_URL` 或 `--rpc`）只后台刷新 ALT，冷缓存 miss 跳过并计数、不重放；应预热所需表。 | `npx tsx examples/shredstream_pumpfun_json.ts` | [shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts) | `v0.6.0` |
| **多协议** | | |
| 同时订阅所有 DEX 协议 | `npx tsx examples/multi_protocol_grpc.ts` | [multi_protocol_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.ts) | `v0.6.0` |
| **工具** | | |
| 验证 onUpdate 同步错误不会打断 gRPC 流 | `npx tsx examples/grpc_onupdate_error_test.ts` | [grpc_onupdate_error_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/grpc_onupdate_error_test.ts) | `v0.6.0` |
| 按签名解析交易（`parseTransactionFromRpc`；非 gRPC）。在 `.env` 或环境中设置 `TX_SIGNATURE`。 | `npx tsx examples/parse_tx_by_signature.ts` | [parse_tx_by_signature.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.ts) | `v0.6.0` |

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

## API 兼容性

完整跨语言 API 对齐仍在进行；公开行为和支持边界见 [API 迁移说明](docs/USAGE.md#api-compatibility)，使用方法见 examples 目录。

PumpFun create/create_v2 的共享主网样本、重放方法和验证边界见 [验证说明](https://github.com/0xfnzero/sol-parser-sdk-golang/tree/main/validation/pumpfun_create_20261007)。

### Pump ShredStream 离线回归

已同步路由意图事件、严格 ALT 缓存解析和本语言原生签名回放／SBF 模拟示例。运行命令、缓存 API、冻结数据来源与测试范围见 [examples/offline_bank/README.md](examples/offline_bank/README.md)。默认跳过账户未解析完整的指令；旧行为需显式使用 best-effort 入口。路由意图不等于已成交事件，解析热路径不调用 RPC。

### 可重复的本地热路径基准

运行 `npx tsx examples/hotpath_benchmark.ts`；可选第二个参数为 JSON
配置路径。默认配置在 `examples/hotpath_benchmark.json`，可修改预热次数、
样本数与批大小。固定工作负载覆盖真实签名的包装程序和 ALT 交易，分别测量
完整账户解析与 wire 解码加解析。文件读取、配置及样例准备均在计时之外，
计时循环无 RPC/网络请求。输出 p50/p95/p99 为每批折算的单交易微秒分布，
包含调度和 GC 影响；这不是生产延迟或上链速度保证。比较时保持运行时、
配置和主机负载一致，双方均需先预热。
