<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>High-performance Solana DEX event parser for Node.js/TypeScript</em></h3>
</div>

<p align="center">
    <strong>High-performance Node.js/TypeScript library for parsing Solana DEX events in real-time via Yellowstone gRPC</strong>
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
    <a href="https://fnzero.dev/">Website</a> |
    <a href="https://t.me/fnzero_group">Telegram</a> |
    <a href="https://discord.gg/vuazbGkqQE">Discord</a>
</p>

<p align="center">
    <a href="https://github.com/0xfnzero/sol-parser-sdk">Rust</a> |
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs"><strong>Node.js</strong></a> |
    <a href="https://github.com/0xfnzero/sol-parser-sdk-python">Python</a> |
    <a href="https://github.com/0xfnzero/sol-parser-sdk-golang">Go</a>
</p>

---

## 📊 Performance Highlights

### ⚡ Real-Time Parsing
- **Sub-millisecond** log-based event parsing
- **gRPC streaming** with Yellowstone/Geyser protocol
- **Optimized pattern matching** with compiled regex
- **Event type filtering** for targeted parsing
- **Zero-allocation** on hot paths where possible

### 🎚️ Flexible Order Modes
| Mode | Latency | Description |
|------|---------|-------------|
| **Unordered** | <1ms | Immediate output, ultra-low latency |
| **MicroBatch** | 1-5ms | Micro-batch ordering with time window |
| **StreamingOrdered** | 5-20ms | Stream ordering with continuous sequence release |
| **Ordered** | 10-100ms | Full slot ordering, wait for complete slot |

### 🚀 Optimization Highlights
- ✅ **Optimized log parsing** with minimal allocations
- ✅ **Compiled pattern matchers** for all protocol detection
- ✅ **Event type filtering** for targeted parsing
- ✅ **Conditional Create detection** (only when needed)
- ✅ **Multiple order modes** for latency vs ordering trade-off
- ✅ **BigInt-safe JSON serialization** for correct number handling

---

## 🔥 Quick Start

### Installation

```bash
git clone https://github.com/0xfnzero/sol-parser-sdk-nodejs
cd sol-parser-sdk-nodejs
npm install --ignore-scripts
npm run build
```

### Use npm

```bash
npm install sol-parser-sdk-nodejs
```

### Performance Testing

Test parsing with the optimized examples:

```bash
# PumpFun with detailed metrics (per-event + 10s stats)
GEYSER_API_TOKEN=your_token node examples/pumpfun_with_metrics.mjs

# PumpSwap with detailed metrics (per-event + 10s stats)
GEYSER_API_TOKEN=your_token node examples/pumpswap_with_metrics.mjs

# PumpSwap ultra-low latency test
GEYSER_API_TOKEN=your_token node examples/pumpswap_low_latency.mjs

# Expected output:
# gRPC接收时间: 1234567890 μs
# 事件接收时间: 1234567900 μs
# 延迟时间: 10 μs  <-- Ultra-low latency!
```

### Examples

| Description | Command | Source Code |
|-------------|---------|-------------|
| **PumpFun** | | |
| PumpFun event parsing with detailed performance metrics | `node examples/pumpfun_with_metrics.mjs` | [examples/pumpfun_with_metrics.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.mjs) |
| PumpFun trade type filtering (Buy/Sell/BuyExactSolIn/Create) | `node examples/pumpfun_trade_filter.mjs` | [examples/pumpfun_trade_filter.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.mjs) |
| Quick PumpFun connection test (first 10 events) | `node examples/pumpfun_quick_test.mjs` | [examples/pumpfun_quick_test.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.mjs) |
| **PumpSwap** | | |
| PumpSwap events with per-event and 10s performance stats | `node examples/pumpswap_with_metrics.mjs` | [examples/pumpswap_with_metrics.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.mjs) |
| PumpSwap ultra-low latency (full event data) | `node examples/pumpswap_low_latency.mjs` | [examples/pumpswap_low_latency.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.mjs) |
| **Meteora DAMM** | | |
| Meteora DAMM V2 gRPC (Swap/AddLiquidity/RemoveLiquidity/CreatePosition/ClosePosition) | `node examples/meteora_damm_grpc.mjs` | [examples/meteora_damm_grpc.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.mjs) |
| **Multi-Protocol** | | |
| Subscribe to all DEX protocols simultaneously | `node examples/multi_protocol_grpc.mjs` | [examples/multi_protocol_grpc.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.mjs) |
| **Utility** | | |
| Parse a specific transaction from RPC by signature | `TX_SIGNATURE=<sig> node examples/parse_tx_by_signature.mjs` | [examples/parse_tx_by_signature.mjs](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.mjs) |

### Basic Usage

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
  onError: (err) => console.error("Error:", err.message),
  onEnd: () => console.log("Stream ended"),
});

console.log(`Subscribed: ${sub.id}`);
```

---

## 🏗️ Supported Protocols

### DEX Protocols
- ✅ **PumpFun** - Meme coin trading
- ✅ **PumpSwap** - PumpFun swap protocol
- ✅ **Raydium AMM V4** - Automated Market Maker
- ✅ **Raydium CLMM** - Concentrated Liquidity
- ✅ **Raydium CPMM** - Concentrated Pool
- ✅ **Orca Whirlpool** - Concentrated liquidity AMM
- ✅ **Meteora DAMM V2** - Dynamic AMM
- ✅ **Meteora DLMM** - Dynamic Liquidity Market Maker
- ✅ **Bonk Launchpad** - Token launch platform

### Event Types
Each protocol supports:
- 📈 **Trade/Swap Events** - Buy/sell transactions
- 💧 **Liquidity Events** - Deposits/withdrawals
- 🏊 **Pool Events** - Pool creation/initialization
- 🎯 **Position Events** - Open/close positions (CLMM)

---

## ⚡ Performance Features

### Optimized Pattern Matching
```javascript
// Pre-compiled regex patterns for fast protocol detection
const PUMPFUN_PATTERN = /Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P/;

// Fast check before full parsing
if (PUMPFUN_PATTERN.test(logString)) {
  return parsePumpFunEvent(logs, signature, slot);
}
```

### Event Type Filtering
```javascript
// Filter specific event types for targeted parsing
const eventFilter = {
  include_only: ["PumpFunTrade", "PumpSwapBuy", "PumpSwapSell"]
};
```

### JSON Serialization
```javascript
const { dexEventToJsonString } = require("./dist/index.js");

for (const ev of events) {
  // Handles BigInt serialization correctly
  console.log(dexEventToJsonString(ev));
}
```

---

## 🎯 Event Filtering

Reduce processing overhead by filtering specific events:

### Example: Trading Bot
```javascript
const eventFilter = {
  include_only: [
    "PumpFunTrade",
    "RaydiumAmmV4Swap",
    "RaydiumClmmSwap",
    "OrcaWhirlpoolSwap",
  ]
};
```

### Example: Pool Monitor
```javascript
const eventFilter = {
  include_only: [
    "PumpFunCreate",
    "PumpSwapCreatePool",
  ]
};
```

**Performance Impact:**
- 60-80% reduction in processing
- Lower memory usage
- Reduced network bandwidth

---

## 🔧 Advanced Features

### Create+Buy Detection
Automatically detects when a token is created and immediately bought in the same transaction:

```javascript
// Automatically detects "Program data: GB7IKAUcB3c..." pattern
const events = parseLogsOnly(logs, signature, slot, undefined);

// Sets is_created_buy flag on Trade events
for (const ev of events) {
  if (ev.PumpFunTrade && ev.PumpFunTrade.is_created_buy) {
    console.log("Create+Buy detected!");
  }
}
```

### Custom gRPC Endpoint

```javascript
const ENDPOINT = process.env.GEYSER_ENDPOINT || "https://solana-yellowstone-grpc.publicnode.com:443";
const TOKEN = process.env.GEYSER_API_TOKEN || "";
const client = new YellowstoneGrpc(ENDPOINT, TOKEN);
```

### Unsubscribe

```javascript
const sub = await client.subscribeTransactions(filter, callbacks);

// Later, cancel:
client.unsubscribe(sub.id);
```

---

## 📁 Project Structure

```
sol-parser-sdk-nodejs/
├── src/
│   ├── core/
│   │   ├── unified_parser.ts   # Main parsing entry point
│   │   ├── dex_event.ts        # DexEvent type definition
│   │   └── json_utils.ts       # JSON serialization utilities
│   ├── grpc/
│   │   ├── client.ts           # YellowstoneGrpc client
│   │   └── types.ts            # ClientConfig, TransactionFilter, etc.
│   ├── logs/
│   │   └── optimized_matcher.ts  # Log parsing (all protocols)
│   ├── instr/
│   │   └── *.ts                  # Instruction parsers
│   └── index.ts                  # Public API exports
├── dist/                         # Compiled JavaScript
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

## 🚀 Optimization Techniques

### 1. **Optimized Pattern Matching**
- Pre-compiled regex patterns for protocol detection
- Fast path for single-protocol filtering
- Minimal string allocations

### 2. **Event Type Filtering**
- Early filtering at protocol level
- Conditional Create detection
- Single-type ultra-fast path

### 3. **BigInt-Safe Serialization**
- Custom JSON serializer for BigInt values
- Avoids JSON.stringify overflow
- Preserves numeric precision

### 4. **Efficient Buffer Handling**
- Direct Buffer operations for hex encoding
- Minimal conversions between formats
- Reusable buffers where possible

### 5. **Callback-Based Streaming**
- Direct event delivery via callbacks
- No intermediate queue overhead
- Immediate processing on receipt

---

## 📄 License

MIT License

## 📞 Contact

- **Repository**: https://github.com/0xfnzero/sol-parser-sdk-nodejs
- **Website**: https://fnzero.dev/
- **Telegram**: https://t.me/fnzero_group
- **Discord**: https://discord.gg/vuazbGkqQE

---

## ⚠️ Performance Tips

1. **Use Event Filtering** — Filter by program ID for 60-80% performance gain
2. **Read logs only once** — `parseLogsOnly` is optimized for hot path
3. **Avoid JSON.stringify on BigInt** — Use `dexEventToJsonString` instead
4. **Monitor latency** — Check `metadata.grpc_recv_us` in production
5. **Use latest Node.js** — Newer versions have better optimization

## 🔬 Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck
```
