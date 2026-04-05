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

### 性能测试

使用优化示例测试解析延迟：

```bash
# PumpFun 详细性能指标（单事件明细 + 每 10 秒统计）
GEYSER_API_TOKEN=your_token node examples/pumpfun_with_metrics.mjs

# PumpSwap 详细性能指标（单事件明细 + 每 10 秒统计）
GEYSER_API_TOKEN=your_token node examples/pumpswap_with_metrics.mjs

# PumpSwap 超低延迟测试
GEYSER_API_TOKEN=your_token node examples/pumpswap_low_latency.mjs
```

### 示例列表

| 描述 | 运行命令 | 源码 |
|------|----------|------|
| **PumpFun** | | |
| PumpFun 事件解析 + 详细性能指标（单事件 + 10 秒汇总） | `node examples/pumpfun_with_metrics.mjs` | [examples/pumpfun_with_metrics.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.mjs) |
| PumpFun 交易类型过滤（Buy/Sell/BuyExactSolIn/Create） | `node examples/pumpfun_trade_filter.mjs` | [examples/pumpfun_trade_filter.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.mjs) |
| PumpFun 快速连接测试（前 10 个事件） | `node examples/pumpfun_quick_test.mjs` | [examples/pumpfun_quick_test.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.mjs) |
| **PumpSwap** | | |
| PumpSwap 事件 + 单事件与 10 秒性能统计 | `node examples/pumpswap_with_metrics.mjs` | [examples/pumpswap_with_metrics.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.mjs) |
| PumpSwap 超低延迟（完整事件数据） | `node examples/pumpswap_low_latency.mjs` | [examples/pumpswap_low_latency.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.mjs) |
| **Meteora DAMM** | | |
| Meteora DAMM V2 gRPC（Swap/AddLiquidity/RemoveLiquidity/CreatePosition/ClosePosition） | `node examples/meteora_damm_grpc.mjs` | [examples/meteora_damm_grpc.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.mjs) |
| **多协议** | | |
| 同时订阅所有 DEX 协议 | `node examples/multi_protocol_grpc.mjs` | [examples/multi_protocol_grpc.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.mjs) |
| **工具** | | |
| 通过签名从 RPC 解析指定交易 | `TX_SIGNATURE=<sig> node examples/parse_tx_by_signature.mjs` | [examples/parse_tx_by_signature.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.mjs) |

### 基本用法

```javascript
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { YellowstoneGrpc, parseLogsOnly } = require(path.join(__dirname, "../dist/index.js"));

const ENDPOINT = process.env.GEYSER_ENDPOINT || "https://solana-yellowstone-grpc.publicnode.com:443";
const X_TOKEN = process.env.GEYSER_API_TOKEN || "";

const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

const filter = {
  account_include: [
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // PumpFun
    "pAMMBay6oceH9fJKBRdGP4LmT4saRGfEE7xmrCaGWpZ", // PumpSwap
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
    const logs = txInfo.metaRaw?.logMessages;
    if (!Array.isArray(logs) || logs.length === 0) return;

    const sig = Buffer.from(txInfo.signature ?? []).toString("hex");
    const events = parseLogsOnly(logs, sig, Number(slot), undefined);

    for (const ev of events) {
      const key = Object.keys(ev)[0];
      console.log(`[${key}]`, JSON.stringify(ev[key], null, 2));
    }
  },
  onError: (err) => console.error("错误:", err.message),
  onEnd: () => console.log("流已结束"),
});

console.log(`已订阅: ${sub.id}`);
```

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
sol-parser-sdk-nodejs/
├── src/
│   ├── core/
│   │   ├── unified_parser.ts   # 主解析入口
│   │   ├── dex_event.ts        # DexEvent 类型定义
│   │   └── json_utils.ts       # JSON 序列化工具
│   ├── grpc/
│   │   ├── client.ts           # YellowstoneGrpc 客户端
│   │   └── types.ts            # ClientConfig、TransactionFilter 等
│   ├── logs/
│   │   └── optimized_matcher.ts  # 日志解析（所有协议）
│   ├── instr/
│   │   └── *.ts                  # 指令解析器
│   └── index.ts                  # 公共 API 导出
├── dist/                         # 编译后的 JavaScript
├── examples/
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
const ENDPOINT = process.env.GEYSER_ENDPOINT || "https://solana-yellowstone-grpc.publicnode.com:443";
const TOKEN = process.env.GEYSER_API_TOKEN || "";
const client = new YellowstoneGrpc(ENDPOINT, TOKEN);
```

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
2. **仅解析一次日志** — `parseLogsOnly` 热路径无堆分配
3. **避免对 BigInt 使用 JSON.stringify** — 请使用 `dexEventToJsonString`
4. **监控延迟** — 生产环境检查 `metadata.grpc_recv_us`

---

## 📄 许可证

MIT License

## 📞 联系我们

- **仓库**: https://github.com/0xfnzero/sol-parser-sdk-nodejs
- **官网**: https://fnzero.dev/
- **Telegram**: https://t.me/fnzero_group
- **Discord**: https://discord.gg/vuazbGkqQE
