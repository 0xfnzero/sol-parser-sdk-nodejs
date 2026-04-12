<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>高性能 Solana DEX 事件解析器，专为 Node.js/TypeScript 设计</em></h3>
</div>

<p align="center">
    <strong>通过 Yellowstone gRPC 实时解析 Solana DEX 事件的 Node.js/TypeScript 库</strong>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/sol-parser-sdk-nodejs">
        <img src="https://img.shields.io/badge/npm-sol--parser--sdk--nodejs-red.svg" alt="npm">
    </a>
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/LICENSE">
        <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
    </a>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana">
    <img src="https://img.shields.io/badge/gRPC-4285F4?style=for-the-badge&logo=grpc&logoColor=white" alt="gRPC">
</p>

<p align="center">
    <a href="./README_CN.md">中文</a> |
    <a href="./README.md">English</a> |
    <a href="https://fnzero.dev/">官网</a> |
    <a href="https://t.me/fnzero_group">Telegram</a> |
    <a href="https://discord.gg/vuazbGkqQE">Discord</a>
</p>

---

## 📦 SDK 版本

本 SDK 提供多种语言版本：

| 语言 | 仓库 | 描述 |
|------|------|------|
| **Rust** | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) | 超低延迟，SIMD 优化 |
| **Node.js** | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) | TypeScript/JavaScript，Node.js 支持 |
| **Python** | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) | 原生 async/await 支持 |
| **Go** | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) | 并发安全，goroutine 支持 |

---

## 📊 性能亮点

### ⚡ 实时解析
- **零延迟** 基于日志的事件解析
- **gRPC 流式传输** 支持 Yellowstone/Geyser 协议
- **多协议** 单次订阅同时监听多个 DEX
- **事件类型过滤** 精准解析所需事件

### 🏗️ 支持的协议
- ✅ **PumpFun** - Meme 代币交易
- ✅ **PumpSwap** - PumpFun 交换协议
- ✅ **Raydium AMM V4** - 自动做市商
- ✅ **Raydium CLMM** - 集中流动性
- ✅ **Raydium CPMM** - 集中池
- ✅ **Orca Whirlpool** - 集中流动性 AMM
- ✅ **Meteora DAMM V2** - 动态 AMM
- ✅ **Meteora DLMM** - 动态流动性做市商
- ✅ **Bonk Launchpad** - 代币发射平台

---

## 🔥 快速开始

### 安装

```bash
git clone https://github.com/0xfnzero/sol-parser-sdk-nodejs
cd sol-parser-sdk-nodejs
npm install --ignore-scripts
npm run build
```

若本地目录名为 **`sol-parser-sdk-ts`**（例如在 monorepo 中），请进入该目录再执行上述命令；npm 包名仍为 **`sol-parser-sdk-nodejs`**。

### 配置环境（推荐）

在**本包根目录**（与 `package.json` 同级）配置 gRPC 凭证，避免每次在命令行前写一长串变量：

```bash
cp .env.example .env
# 编辑 .env，填写 GRPC_URL 与 GRPC_TOKEN
```

说明：

- 克隆仓库并 `npm install` 后，开发依赖里包含 **`dotenv`**。凡导入 **`scripts/grpc_env.ts`** 的脚本（含所有 gRPC 示例与 `scripts/test-grpc-ts.ts` / `scripts/debug-grpc-ts.ts`）会在运行时加载**当前工作目录**下的 **`.env`**，并注入 `process.env`（**不会覆盖**已在 shell 里 `export` 的同名变量）。
- **`examples/shredstream_*.ts`** 在文件内 **`import "dotenv/config"`**，包根目录 **`.env`** 同样对 ShredStream 示例生效（见下文 **ShredStream 端点**）。
- 请在**包根目录**执行 `npx tsx examples/...`、`npx tsx scripts/test-grpc-ts.ts`、`npx tsx scripts/debug-grpc-ts.ts`，这样 `.env` 路径正确。
- 若不用 `.env` 文件，也可在终端执行 `export GRPC_URL=...` 与 `export GRPC_TOKEN=...`（或 CI 密钥管理），效果相同。

#### ShredStream 端点

ShredStream 示例**不**使用 Yellowstone 的 **`GRPC_URL`**，而是连接**本机或代理提供的 HTTP** Shred 流（具体 host/port 以你的服务方文档为准）。

**优先级（由高到低）：** 命令行 **`--url`** / **`-u`** / **`--endpoint=`** → 环境变量 **`SHREDSTREAM_URL`** 或 **`SHRED_URL`** → 默认 **`http://127.0.0.1:10800`**。

| 方式 | 示例 |
|------|------|
| **命令行参数** | `npx tsx examples/shredstream_example.ts -- --url=http://127.0.0.1:10800` |
| **当前 shell 环境变量** | `SHREDSTREAM_URL=http://127.0.0.1:10800 npx tsx examples/shredstream_example.ts`（也可用 `SHRED_URL`） |
| **包根目录 `.env`** | 写入 `SHREDSTREAM_URL=http://127.0.0.1:10800` 后执行 `npx tsx examples/shredstream_example.ts` |

完整参数见：`npx tsx examples/shredstream_example.ts -- --help`、`npx tsx examples/shredstream_pumpfun_json.ts -- --help`。

**`shredstream_pumpfun_json.ts`** 另需 Solana **HTTP RPC** 以解析 ALT：在 **`.env` / 环境变量** 中设 **`RPC_URL`**，或使用 **`--rpc=`** / **`-r`**。生产环境请使用**自有** RPC；**切勿**将真实 ShredStream 地址、RPC URL 或密钥提交到仓库，仅放在本地 **`.env`**（已 gitignore）或密钥管理。

下表示例命令均以 **`npx tsx`** 在**包根目录**执行；将示例中的 `http://127.0.0.1:10800` 换成你自己的端点即可。

### 性能测试

在**本包根目录**执行。示例使用 **`npx tsx`** 直接加载 **`src/`**，**无需先 `npm run build`**（首次需 `npm install`）。**先按上一节配置 `.env`**，然后：

```bash
# 集成测试：PumpFun + PumpSwap，含账户填充的 DexEvent（与 Rust gRPC 路径一致）
npx tsx scripts/test-grpc-ts.ts

# PumpFun 详细性能指标（单事件明细 + 每 10 秒统计）
npx tsx examples/pumpfun_with_metrics.ts

# PumpSwap 详细性能指标（单事件明细 + 每 10 秒统计）
npx tsx examples/pumpswap_with_metrics.ts

# PumpSwap 超低延迟测试
npx tsx examples/pumpswap_low_latency.ts
```

### 环境变量（gRPC 示例）

**必填：** **`GRPC_URL`**、**`GRPC_TOKEN`**。若未设置或为空字符串，gRPC 相关示例及 `npx tsx scripts/test-grpc-ts.ts` / `npx tsx scripts/debug-grpc-ts.ts` 会打印错误并退出（见 **`scripts/grpc_env.ts`**，内含 `dotenv` 加载 **`.env`**）。

**推荐**从 **`.env.example`** 复制为 **`.env`** 并填写；变量说明见下表。

| 变量 | 说明 |
|------|------|
| **`GRPC_URL`** | Yellowstone gRPC 端点（如 `https://host:443`） |
| **`GRPC_TOKEN`** | 对应端点的 `x-token` |
| **`MAX_EVENTS`** | `*_grpc_json.ts` 与 `npx tsx scripts/test-grpc-ts.ts`：解析满 N 条事件后退出；`0` 表示持续运行直到 Ctrl+C |
| **`TIMEOUT_MS`** | 仅 `npx tsx scripts/test-grpc-ts.ts`：运行 N 毫秒后自动退出；`0` 表示不超时（可与 `MAX_EVENTS` 同时设，先满足任一条件即退出） |
| **`JSON_PRETTY`** | `npx tsx scripts/test-grpc-ts.ts`：设为 `1` 或 `true` 时多行缩进打印（默认单行紧凑 JSON） |
| **`JSON_MAX_CHARS`** | `npx tsx scripts/test-grpc-ts.ts`：每条事件 JSON 最大字符数；不设或 `0` 表示不截断 |
| **`TX_SIGNATURE`** | 仅 `parse_tx_by_signature.ts`：Base58 交易签名（可写在 `.env`） |
| **`RPC_URL`** | `parse_tx_by_signature.ts`、**`shredstream_pumpfun_json.ts`**：Solana HTTP RPC（默认主网公开端点；可写在 `.env`） |
| **`SHREDSTREAM_URL`** / **`SHRED_URL`** | 仅 **ShredStream** 示例：代理 HTTP 端点（默认 `http://127.0.0.1:10800`）；也可用 CLI `--url` / `-u` 覆盖（见下表） |
| **`SHREDSTREAM_STATS_SEC`** | 仅 `shredstream_pumpfun_json.ts`：每 N 秒打印统计；`0` 表示关闭 |

### 示例列表

以下命令均在**本包根目录**执行；示例依赖 `npm install`（含 `tsx`），**跑示例不必先 `npm run build`**。下表统一以 **`npx tsx …`** 为例（`package.json` 里另有可选的 **`npm run`** 别名，例如 `example:shredstream:subscribe`，非必须）。

| 描述 | 运行命令 | 源码 |
|------|----------|------|
| **本包脚本** | | |
| gRPC 集成测试（PumpFun + PumpSwap，账户填充后的 DexEvent） | `npx tsx scripts/test-grpc-ts.ts` | [scripts/test-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/test-grpc-ts.ts) |
| 调试：打印 meta / 日志结构 | `npx tsx scripts/debug-grpc-ts.ts` | [scripts/debug-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/debug-grpc-ts.ts) |
| **PumpFun** | | |
| gRPC 订阅并输出**完整 JSON** DexEvent（字段与 Rust 对齐） | `npx tsx examples/pumpfun_grpc_json.ts` | [examples/pumpfun_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.ts) |
| PumpFun 事件解析 + 性能指标 | `npx tsx examples/pumpfun_with_metrics.ts` | [examples/pumpfun_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.ts) |
| PumpFun 交易类型过滤 | `npx tsx examples/pumpfun_trade_filter.ts` | [examples/pumpfun_trade_filter.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.ts) |
| PumpFun 快速连接测试 | `npx tsx examples/pumpfun_quick_test.ts` | [examples/pumpfun_quick_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.ts) |
| **PumpSwap** | | |
| gRPC 订阅并输出**完整 JSON** DexEvent（字段与 Rust 对齐） | `npx tsx examples/pumpswap_grpc_json.ts` | [examples/pumpswap_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.ts) |
| PumpSwap 事件 + 性能统计 | `npx tsx examples/pumpswap_with_metrics.ts` | [examples/pumpswap_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.ts) |
| PumpSwap 超低延迟 | `npx tsx examples/pumpswap_low_latency.ts` | [examples/pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.ts) |
| **Meteora DAMM** | | |
| Meteora DAMM V2 事件 | `npx tsx examples/meteora_damm_grpc.ts` | [examples/meteora_damm_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.ts) |
| **ShredStream**（**非** Yellowstone gRPC；需本地/代理 Shred 流；端点配置见上文「ShredStream 端点」） | | |
| 超低延迟订阅、队列与延迟统计 | `npx tsx examples/shredstream_example.ts`（端点见 **`--url` / `SHREDSTREAM_URL` / `.env`**；示例：`-- --url=http://127.0.0.1:10800`） | [examples/shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts) |
| ShredStream → PumpFun `DexEvent` JSON（需 **RPC** 拉 ALT） | `npx tsx examples/shredstream_pumpfun_json.ts`（同上设 ShredStream；另加 **`RPC_URL`** 或 **`--rpc=`**） | [examples/shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts) |
| **多协议** | | |
| 同时订阅所有 DEX 协议 | `npx tsx examples/multi_protocol_grpc.ts` | [examples/multi_protocol_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.ts) |
| **工具 / 测试** | | |
| 验证 onUpdate 同步抛错不会打断 gRPC 流 | `npx tsx examples/grpc_onupdate_error_test.ts` | [examples/grpc_onupdate_error_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/grpc_onupdate_error_test.ts) |
| 通过签名解析交易（**`parseTransactionFromRpc`** 全量 RPC 路径；非 gRPC） | `npx tsx examples/parse_tx_by_signature.ts`（在 `.env` 或环境中设置 `TX_SIGNATURE`） | [examples/parse_tx_by_signature.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.ts) |

**示例说明**

- 所有 **gRPC** 示例必须设置 **`GRPC_URL`** 与 **`GRPC_TOKEN`**（推荐写入包根目录 **`.env`**）。
- **ShredStream** 示例使用 **`SHREDSTREAM_URL`** / **`SHRED_URL`** 或命令行 **`--url`**；**`shredstream_pumpfun_json`** 另需 **`RPC_URL`** 或 **`--rpc`**（与 gRPC 凭证无关）。详见 **`.env.example`**。
- **`parse_tx_by_signature.ts`** 必须设置 **`TX_SIGNATURE`**（Base58）。可选 **`RPC_URL`**。二者均可写在 **`.env`**（见 **`.env.example`**）。
- 使用 **`parseLogsOnly`** 的 gRPC 示例将签名编码为 **Base58**（来自 `txInfo.signature`），与 `EventMetadata.signature` 一致。
- **`pumpfun_with_metrics` / `pumpswap_with_metrics` / `pumpswap_low_latency` / `pumpfun_trade_filter`** 使用 SDK 导出的 **`nowUs`** 与 `metadata.grpc_recv_us` 同一时钟基准统计延迟。
- **`meteora_damm_grpc`** 与 **`multi_protocol_grpc`** 中的程序 ID 与 `src/instr/program_ids.ts` 对齐（Meteora DAMM V2：`cpamdpZCGKUy5JxQXB2MWgCm3hcnGjEJbYTJgfm4E8a`）。

### 基本用法

**推荐（与 Rust gRPC `parse_logs` 一致）：** 在解析 `Program data` 日志后，用订阅里的 **`transactionRaw` + `metaRaw`** 做账户填充，得到完整 `DexEvent`（如 PumpSwap 的 `base_mint`、池子 ATA 等）：

```typescript
import {
  YellowstoneGrpc,
  parseDexEventsFromGrpcTransactionInfo,
  dexEventToJsonString,
} from "sol-parser-sdk-nodejs";
// 本仓库内示例使用：from "../src/index.js"（`npx tsx` 运行，无需先 build）
// 需设置 GRPC_URL 与 GRPC_TOKEN（示例通过 requireGrpcEnv() 校验；可从 .env 加载）

const ENDPOINT = process.env.GRPC_URL?.trim() ?? "";
const X_TOKEN = process.env.GRPC_TOKEN?.trim() ?? "";
if (!ENDPOINT || !X_TOKEN) {
  throw new Error("GRPC_URL and GRPC_TOKEN are required");
}

const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

const filter = {
  account_include: [
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // PumpFun
    "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // PumpSwap（Pump AMM）
  ],
  account_exclude: [],
  account_required: [],
  vote: false,
  failed: false,
};

const sub = await client.subscribeTransactions(filter, {
  onUpdate: (update) => {
    if (!update.transaction?.transaction) return;
    const txInfo = update.transaction.transaction;
    const slot = update.transaction.slot;
    if (!txInfo.transactionRaw || !txInfo.metaRaw) return;

    const events = parseDexEventsFromGrpcTransactionInfo(txInfo, slot, undefined);
    for (const ev of events) {
      console.log(dexEventToJsonString(ev, 2));
    }
  },
  onError: (err) => console.error("错误:", err.message),
  onEnd: () => console.log("流已结束"),
});

console.log(`已订阅: ${sub.id}`);
```

**仅日志（更轻）：** `parseLogsOnly(logs, signature, slot, blockTimeUs, txIndex?)` 不需要 `transactionRaw`；gRPC 场景第五参传入 `grpcTxIndexFromInfo(txInfo)`，与 Rust `info.index` 一致。部分账户字段可能仍为占位零地址，除非自行对 `VersionedTransaction.message` + `meta` 调用 `applyAccountFillsToLogEvents`。

---

## 🏗️ 支持的协议与事件

### 事件类型
每个协议均支持：
- 📈 **交易/兑换事件** - 买入/卖出交易
- 💧 **流动性事件** - 存入/提取
- 🏊 **池子事件** - 池子创建/初始化
- 🎯 **仓位事件** - 开仓/平仓（CLMM）

### PumpFun 事件
- `PumpFunBuy` - 买入代币
- `PumpFunSell` - 卖出代币
- `PumpFunBuyExactSolIn` - 指定 SOL 数量买入
- `PumpFunCreate` - 创建新代币
- `PumpFunTrade` - 通用交易（兜底）

### PumpSwap 事件
- `PumpSwapBuy` - 通过池子买入代币
- `PumpSwapSell` - 通过池子卖出代币
- `PumpSwapCreatePool` - 创建流动性池
- `PumpSwapLiquidityAdded` - 添加流动性
- `PumpSwapLiquidityRemoved` - 移除流动性

### Raydium 事件
- `RaydiumAmmV4Swap` - AMM V4 兑换
- `RaydiumClmmSwap` - CLMM 兑换
- `RaydiumCpmmSwap` - CPMM 兑换

### Orca 事件
- `OrcaWhirlpoolSwap` - Whirlpool 兑换

### Meteora 事件
- `MeteoraDammV2Swap` - DAMM V2 兑换
- `MeteoraDammV2AddLiquidity` - 添加流动性
- `MeteoraDammV2RemoveLiquidity` - 移除流动性
- `MeteoraDammV2CreatePosition` - 创建仓位
- `MeteoraDammV2ClosePosition` - 关闭仓位

### Bonk 事件
- `BonkTrade` - Bonk Launchpad 交易

---

## 📁 项目结构

```
sol-parser-sdk-ts/   （npm 包名：sol-parser-sdk-nodejs）
├── src/
│   ├── core/
│   │   ├── unified_parser.ts   # parseLogsOnly 等
│   │   ├── dex_event.ts        # DexEvent 类型定义
│   │   ├── rpc_invoke_map.ts   # 程序 invoke 映射、accountKeyToBase58
│   │   └── json_utils.ts       # dexEventToJsonString
│   ├── grpc/
│   │   ├── client.ts           # YellowstoneGrpc 客户端
│   │   ├── yellowstone_parse.ts # parseDexEventsFromGrpcTransactionInfo
│   │   └── types.ts            # ClientConfig、TransactionFilter 等
│   ├── rpc_transaction.ts      # parseRpcTransaction、applyAccountFillsToLogEvents
│   ├── logs/
│   │   └── optimized_matcher.ts  # 日志解析（所有协议）
│   ├── instr/
│   │   └── *.ts                  # 指令解析器
│   └── index.ts                  # 公共 API 导出
├── dist/                         # 编译后的 JavaScript
├── .env.example                  # 环境变量模板（复制为 .env 后填写，勿提交 .env）
├── scripts/
│   ├── grpc_env.ts               # dotenv + 校验 GRPC_URL / GRPC_TOKEN（gRPC 示例共用）
│   ├── test-grpc-ts.ts           # npx tsx scripts/test-grpc-ts.ts
│   └── debug-grpc-ts.ts          # npx tsx scripts/debug-grpc-ts.ts
├── examples/
│   ├── pumpfun_grpc_json.ts
│   ├── pumpswap_grpc_json.ts
│   ├── grpc_onupdate_error_test.ts
│   ├── pumpfun_with_metrics.ts
│   ├── pumpfun_trade_filter.ts
│   ├── pumpfun_quick_test.ts
│   ├── pumpswap_with_metrics.ts
│   ├── pumpswap_low_latency.ts
│   ├── meteora_damm_grpc.ts
│   ├── multi_protocol_grpc.ts
│   └── parse_tx_by_signature.ts
└── package.json
```

---

## 🔧 高级用法

### 自定义 gRPC 端点

```typescript
const ENDPOINT = process.env.GRPC_URL?.trim() ?? "";
const TOKEN = process.env.GRPC_TOKEN?.trim() ?? "";
if (!ENDPOINT || !TOKEN) {
  throw new Error("GRPC_URL and GRPC_TOKEN are required");
}
const client = new YellowstoneGrpc(ENDPOINT, TOKEN);
```

### gRPC 辅助 API（与 Rust 对齐）

- **`parseDexEventsFromGrpcTransactionInfo(txInfo, slot, options?)`** — 先解析日志，再执行与 Rust gRPC 相同的账户/数据填充。需要 `txInfo.transactionRaw` 与 `txInfo.metaRaw`。
- **`applyAccountFillsToLogEvents(events, message, meta)`** — 若你已有日志解析结果，用手里的 message + meta 补全字段。
- **`parseRpcTransaction` / `parseTransactionFromRpc`** — 完整 RPC 交易解析（指令 + 日志 + 填充）。

### 取消订阅

```javascript
const sub = await client.subscribeTransactions(filter, callbacks);

// 稍后取消：
client.unsubscribe(sub.id);
```

### JSON 序列化

```typescript
import { dexEventToJsonString } from "sol-parser-sdk-nodejs";

for (const ev of events) {
  console.log(dexEventToJsonString(ev));
}
```

### 性能建议

1. **使用事件过滤** — 按程序 ID 过滤可获得 60-80% 性能提升
2. **gRPC 场景优先 `parseDexEventsFromGrpcTransactionInfo`** — 在提供 `transactionRaw` + `metaRaw` 时，`DexEvent` 字段与 Rust SDK 一致（mint、池子账户等）
3. **仅解析一次日志** — `parseLogsOnly` 热路径无堆分配
4. **避免对 BigInt 使用 JSON.stringify** — 请使用 `dexEventToJsonString`
5. **监控延迟** — 生产环境检查 `metadata.grpc_recv_us`

---

## 🔬 开发

```bash
npm run build           # TypeScript 编译到 dist/
npx tsx scripts/test-grpc-ts.ts   # gRPC 集成冒烟（需 GRPC_URL / GRPC_TOKEN，见 .env.example）
npm run check:migration # DexEvent 对齐 + discriminator + JSON 工具检查（需先 build）
```

---

## 📄 许可证

MIT License

## 📞 联系我们

- **仓库**: https://github.com/0xfnzero/sol-parser-sdk-nodejs
- **官网**: https://fnzero.dev/
- **Telegram**: https://t.me/fnzero_group
- **Discord**: https://discord.gg/vuazbGkqQE
