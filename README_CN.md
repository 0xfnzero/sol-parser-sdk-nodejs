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

### 性能测试

在**本包根目录**（`sol-parser-sdk-ts/`）执行，需先 `npm run build`：

```bash
# 集成测试：PumpFun + PumpSwap，含账户填充的 DexEvent（与 Rust gRPC 路径一致）
GRPC_URL=https://solana-yellowstone-grpc.publicnode.com:443 GRPC_TOKEN=你的token npm run test:grpc

# PumpFun 详细性能指标（单事件明细 + 每 10 秒统计）
GRPC_TOKEN=你的token node examples/pumpfun_with_metrics.mjs

# PumpSwap 详细性能指标（单事件明细 + 每 10 秒统计）
GRPC_TOKEN=你的token node examples/pumpswap_with_metrics.mjs

# PumpSwap 超低延迟测试
GRPC_TOKEN=你的token node examples/pumpswap_low_latency.mjs
```

### 环境变量（gRPC 示例）

| 变量 | 说明 |
|------|------|
| **`GRPC_URL`** | Yellowstone gRPC 端点（优先使用）。例：`https://solana-yellowstone-grpc.publicnode.com:443` |
| **`GRPC_TOKEN`** | 对应端点的 `x-token`（优先使用） |
| **`GEYSER_ENDPOINT`** | 与 `GRPC_URL` 同义，兼容旧配置 |
| **`GEYSER_API_TOKEN`** | 与 `GRPC_TOKEN` 同义，兼容旧配置 |
| **`MAX_EVENTS`** | `*_grpc_json.mjs` 与 `npm run test:grpc`：解析满 N 条事件后退出；`0` 表示持续运行直到 Ctrl+C |
| **`TIMEOUT_MS`** | 仅 `npm run test:grpc`：运行 N 毫秒后自动退出；`0` 表示不超时（可与 `MAX_EVENTS` 同时设，先满足任一条件即退出） |
| **`JSON_PRETTY`** | `npm run test:grpc`：设为 `1` 或 `true` 时多行缩进打印（默认单行紧凑 JSON） |
| **`JSON_MAX_CHARS`** | `npm run test:grpc`：每条事件 JSON 最大字符数；不设或 `0` 表示不截断 |
| **`RPC_URL`** | 仅 `parse_tx_by_signature.mjs`：Solana HTTP RPC（默认 `https://api.mainnet-beta.solana.com`） |

部分脚本对公共节点带默认 token；生产环境请显式设置 `GRPC_TOKEN`。

### 示例列表

以下命令均在**本包根目录**执行，且已 `npm run build`。

| 描述 | 运行命令 | 源码 |
|------|----------|------|
| **本包脚本** | | |
| gRPC 集成测试（PumpFun + PumpSwap，账户填充后的 DexEvent） | `npm run test:grpc` | [scripts/test-grpc-ts.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/test-grpc-ts.mjs) |
| 调试：打印 meta / 日志结构 | `npm run debug:grpc` | [scripts/debug-grpc-ts.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/debug-grpc-ts.mjs) |
| **PumpFun** | | |
| gRPC 订阅并输出**完整 JSON** DexEvent（字段与 Rust 对齐） | `node examples/pumpfun_grpc_json.mjs` | [examples/pumpfun_grpc_json.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.mjs) |
| PumpFun 事件解析 + 性能指标 | `node examples/pumpfun_with_metrics.mjs` | [examples/pumpfun_with_metrics.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.mjs) |
| PumpFun 交易类型过滤 | `node examples/pumpfun_trade_filter.mjs` | [examples/pumpfun_trade_filter.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.mjs) |
| PumpFun 快速连接测试 | `node examples/pumpfun_quick_test.mjs` | [examples/pumpfun_quick_test.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.mjs) |
| **PumpSwap** | | |
| gRPC 订阅并输出**完整 JSON** DexEvent（字段与 Rust 对齐） | `node examples/pumpswap_grpc_json.mjs` | [examples/pumpswap_grpc_json.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.mjs) |
| PumpSwap 事件 + 性能统计 | `node examples/pumpswap_with_metrics.mjs` | [examples/pumpswap_with_metrics.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.mjs) |
| PumpSwap 超低延迟 | `node examples/pumpswap_low_latency.mjs` | [examples/pumpswap_low_latency.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.mjs) |
| **Meteora DAMM** | | |
| Meteora DAMM V2 事件 | `node examples/meteora_damm_grpc.mjs` | [examples/meteora_damm_grpc.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.mjs) |
| **多协议** | | |
| 同时订阅所有 DEX 协议 | `node examples/multi_protocol_grpc.mjs` | [examples/multi_protocol_grpc.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.mjs) |
| **工具 / 测试** | | |
| 验证 onUpdate 同步抛错不会打断 gRPC 流 | `node examples/grpc_onupdate_error_test.mjs` | [examples/grpc_onupdate_error_test.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/grpc_onupdate_error_test.mjs) |
| 通过签名解析交易（**`parseTransactionFromRpc`** 全量 RPC 路径；非 gRPC） | `TX_SIGNATURE=<sig> [RPC_URL=...] node examples/parse_tx_by_signature.mjs` | [examples/parse_tx_by_signature.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.mjs) |

**示例说明**

- **`parse_tx_by_signature.mjs`** 必须设置 **`TX_SIGNATURE`**（Base58）。可选 **`RPC_URL`**（归档节点或专用 RPC）。
- 使用 **`parseLogsOnly`** 的 gRPC 示例将签名编码为 **Base58**（来自 `txInfo.signature`），与 `EventMetadata.signature` 一致。
- **`pumpfun_with_metrics` / `pumpswap_with_metrics` / `pumpswap_low_latency` / `pumpfun_trade_filter`** 使用 SDK 导出的 **`nowUs`** 与 `metadata.grpc_recv_us` 同一时钟基准统计延迟。
- **`meteora_damm_grpc`** 与 **`multi_protocol_grpc`** 中的程序 ID 与 `src/instr/program_ids.ts` 对齐（Meteora DAMM V2：`cpamdpZCGKUy5JxQXB2MWgCm3hcnGjEJbYTJgfm4E8a`）。

### 基本用法

**推荐（与 Rust gRPC `parse_logs` 一致）：** 在解析 `Program data` 日志后，用订阅里的 **`transactionRaw` + `metaRaw`** 做账户填充，得到完整 `DexEvent`（如 PumpSwap 的 `base_mint`、池子 ATA 等）：

```javascript
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const {
  YellowstoneGrpc,
  parseDexEventsFromGrpcTransactionInfo,
  dexEventToJsonString,
} = require(path.join(__dirname, "../dist/index.js"));

const ENDPOINT =
  process.env.GRPC_URL ||
  process.env.GEYSER_ENDPOINT ||
  "https://solana-yellowstone-grpc.publicnode.com:443";
const X_TOKEN =
  process.env.GRPC_TOKEN || process.env.GEYSER_API_TOKEN || "";

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

**仅日志（更轻）：** `parseLogsOnly(logs, signature, slot, blockTimeUs)` 不需要 `transactionRaw`；部分账户字段可能仍为占位零地址，除非自行对 `VersionedTransaction.message` + `meta` 调用 `applyAccountFillsToLogEvents`。

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
├── scripts/
│   ├── test-grpc-ts.mjs          # npm run test:grpc
│   └── debug-grpc-ts.mjs         # npm run debug:grpc
├── examples/
│   ├── pumpfun_grpc_json.mjs
│   ├── pumpswap_grpc_json.mjs
│   ├── grpc_onupdate_error_test.mjs
│   ├── pumpfun_with_metrics.mjs
│   ├── pumpfun_trade_filter.mjs
│   ├── pumpfun_quick_test.mjs
│   ├── pumpswap_with_metrics.mjs
│   ├── pumpswap_low_latency.mjs
│   ├── meteora_damm_grpc.mjs
│   ├── multi_protocol_grpc.mjs
│   └── parse_tx_by_signature.mjs
└── package.json
```

---

## 🔧 高级用法

### 自定义 gRPC 端点

```javascript
const ENDPOINT =
  process.env.GRPC_URL ||
  process.env.GEYSER_ENDPOINT ||
  "https://solana-yellowstone-grpc.publicnode.com:443";
const TOKEN =
  process.env.GRPC_TOKEN || process.env.GEYSER_API_TOKEN || "";
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

```javascript
const { dexEventToJsonString } = require("./dist/index.js");

for (const ev of events) {
  // 正确处理 BigInt 序列化
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
npm run test:grpc       # gRPC 集成冒烟（需 GRPC_URL / GRPC_TOKEN）
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
