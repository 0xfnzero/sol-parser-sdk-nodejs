<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>High-performance Solana DEX event parser for Node.js/TypeScript</em></h3>
</div>

<p align="center">
    <strong>Node.js/TypeScript library for parsing Solana DEX events in real-time via Yellowstone gRPC</strong>
</p>

<p align="center">
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs">
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

---

## 📊 Performance Highlights

### ⚡ Real-Time Parsing
- **Zero-latency** log-based event parsing
- **gRPC streaming** with Yellowstone/Geyser protocol
- **Multi-protocol** support in a single subscription
- **Event type filtering** for targeted parsing

### 🏗️ Supported Protocols
- ✅ **PumpFun** - Meme coin trading
- ✅ **PumpSwap** - PumpFun swap protocol
- ✅ **Raydium AMM V4** - Automated Market Maker
- ✅ **Raydium CLMM** - Concentrated Liquidity
- ✅ **Raydium CPMM** - Concentrated Pool
- ✅ **Orca Whirlpool** - Concentrated liquidity AMM
- ✅ **Meteora DAMM V2** - Dynamic AMM
- ✅ **Meteora DLMM** - Dynamic Liquidity Market Maker
- ✅ **Bonk Launchpad** - Token launch platform

---

## 🔥 Quick Start

### Installation

```bash
git clone https://github.com/0xfnzero/sol-parser-sdk-nodejs
cd sol-parser-sdk-nodejs
npm install --ignore-scripts
npm run build
```

### Run Examples

```bash
# PumpFun trade filter (Buy/Sell/BuyExactSolIn/Create)
GEYSER_API_TOKEN=your_token node examples/pumpfun_trade_filter.mjs

# PumpSwap low-latency with performance metrics
GEYSER_API_TOKEN=your_token node examples/pumpswap_low_latency.mjs

# All protocols simultaneously
GEYSER_API_TOKEN=your_token node examples/multi_protocol_grpc.mjs

# Meteora DAMM V2 events
GEYSER_API_TOKEN=your_token node examples/meteora_damm_grpc.mjs

# Parse a specific transaction by signature
TX_SIGNATURE=<sig> node examples/parse_tx_by_signature.mjs
```

### Examples

| Example | Description | Command |
|---------|-------------|---------|
| **PumpFun** | | |
| `pumpfun_trade_filter` | PumpFun trade filtering (Buy/Sell/BuyExactSolIn/Create) with latency metrics | `node examples/pumpfun_trade_filter.mjs` |
| **PumpSwap** | | |
| `pumpswap_low_latency` | PumpSwap ultra-low latency with per-event + 10s stats | `node examples/pumpswap_low_latency.mjs` |
| **Multi-Protocol** | | |
| `multi_protocol_grpc` | Subscribe to all DEX protocols simultaneously | `node examples/multi_protocol_grpc.mjs` |
| **Meteora** | | |
| `meteora_damm_grpc` | Meteora DAMM V2 (Swap/AddLiquidity/RemoveLiquidity/CreatePosition/ClosePosition) | `node examples/meteora_damm_grpc.mjs` |
| **Utility** | | |
| `parse_tx_by_signature` | Parse a transaction from RPC by signature | `TX_SIGNATURE=<sig> node examples/parse_tx_by_signature.mjs` |

### Basic Usage

```javascript
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { YellowstoneGrpc, parseLogsOnly } = require(path.join(__dirname, "../dist/index.js"));

const ENDPOINT = "https://solana-yellowstone-grpc.publicnode.com:443";
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

### Parse Logs Only (No gRPC)

```javascript
const { parseLogsOnly } = require("./dist/index.js");

// Parse from transaction logs (e.g., from RPC response)
const logs = [
  "Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke [1]",
  "Program data: vdt/pQ8AAA...",  // base64 encoded event
  "Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success",
];

const events = parseLogsOnly(logs, "tx_signature", 123456789, undefined);
for (const ev of events) {
  const key = Object.keys(ev)[0];
  console.log(key, ev[key]);
}
```

---

## 🏗️ Supported Protocols & Events

### Event Types
Each protocol supports:
- 📈 **Trade/Swap Events** - Buy/sell transactions
- 💧 **Liquidity Events** - Deposits/withdrawals
- 🏊 **Pool Events** - Pool creation/initialization
- 🎯 **Position Events** - Open/close positions (CLMM)

### PumpFun Events
- `PumpFunBuy` - Buy token
- `PumpFunSell` - Sell token
- `PumpFunBuyExactSolIn` - Buy with exact SOL amount
- `PumpFunCreate` - Create new token
- `PumpFunTrade` - Generic trade (fallback)

### PumpSwap Events
- `PumpSwapBuy` - Buy token via pool
- `PumpSwapSell` - Sell token via pool
- `PumpSwapCreatePool` - Create liquidity pool
- `PumpSwapLiquidityAdded` - Add liquidity
- `PumpSwapLiquidityRemoved` - Remove liquidity

### Raydium Events
- `RaydiumAmmV4Swap` - AMM V4 swap
- `RaydiumClmmSwap` - CLMM swap
- `RaydiumCpmmSwap` - CPMM swap

### Orca Events
- `OrcaWhirlpoolSwap` - Whirlpool swap

### Meteora Events
- `MeteoraDammV2Swap` - DAMM V2 swap
- `MeteoraDammV2AddLiquidity` - Add liquidity
- `MeteoraDammV2RemoveLiquidity` - Remove liquidity
- `MeteoraDammV2CreatePosition` - Create position
- `MeteoraDammV2ClosePosition` - Close position

### Bonk Events
- `BonkTrade` - Bonk Launchpad trade

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
│   │   ├── client.ts           # YellowstoneGrpc client (real implementation)
│   │   ├── client_stub.ts      # Re-export from client.ts
│   │   └── types.ts            # ClientConfig, TransactionFilter, etc.
│   ├── logs/
│   │   └── optimized_matcher.ts  # Log parsing (all protocols)
│   ├── instr/
│   │   └── *.ts                  # Instruction parsers
│   └── index.ts                  # Public API exports
├── dist/                         # Compiled JavaScript
├── examples/
│   ├── pumpfun_trade_filter.mjs
│   ├── pumpswap_low_latency.mjs
│   ├── multi_protocol_grpc.mjs
│   ├── meteora_damm_grpc.mjs
│   └── parse_tx_by_signature.mjs
└── package.json
```

---

## 🔧 Advanced Usage

### Custom gRPC Endpoint

```javascript
const ENDPOINT = process.env.GEYSER_ENDPOINT || "https://solana-yellowstone-grpc.publicnode.com:443";
const TOKEN = process.env.GEYSER_API_TOKEN || "";
const client = new YellowstoneGrpc(ENDPOINT, TOKEN);
```

### Unsubscribe

```javascript
const sub = await client.subscribeTransactions(filter, callbacks);

// Later, unsubscribe:
client.unsubscribe(sub.id);
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

## 📄 License

MIT License

## 📞 Contact

- **Repository**: https://github.com/0xfnzero/sol-parser-sdk-nodejs
- **Website**: https://fnzero.dev/
- **Telegram**: https://t.me/fnzero_group
- **Discord**: https://discord.gg/vuazbGkqQE
