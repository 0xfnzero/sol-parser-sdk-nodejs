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

---

## 📦 SDK Versions

This SDK is available in multiple languages:

| Language | Repository | Description |
|----------|------------|-------------|
| **Rust** | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) | Ultra-low latency with SIMD optimization |
| **Node.js** | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) | TypeScript/JavaScript for Node.js |
| **Python** | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) | Async/await native support |
| **Go** | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) | Concurrent-safe with goroutine support |

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

If your local folder is named `sol-parser-sdk-ts` (for example inside a monorepo), `cd` into that directory instead—the npm package name remains **`sol-parser-sdk-nodejs`**.

### Use npm

```bash
npm install sol-parser-sdk-nodejs
```

### Performance Testing

From the **package root** (`sol-parser-sdk-ts/`). Examples use **`npx tsx`** and import **`src/`** directly — **no `npm run build` required** to run them (install deps once: `npm install`).

```bash
# Integration test: PumpFun + PumpSwap, parsed events with account fills (same path as Rust gRPC)
GRPC_URL=https://solana-yellowstone-grpc.publicnode.com:443 GRPC_TOKEN=your_token npm run test:grpc

# PumpFun with detailed metrics (per-event + 10s stats)
GRPC_TOKEN=your_token npx tsx examples/pumpfun_with_metrics.ts

# PumpSwap with detailed metrics (per-event + 10s stats)
GRPC_TOKEN=your_token npx tsx examples/pumpswap_with_metrics.ts

# PumpSwap ultra-low latency test
GRPC_TOKEN=your_token npx tsx examples/pumpswap_low_latency.ts
```

### Environment variables (gRPC examples)

| Variable | Description |
|----------|-------------|
| **`GRPC_URL`** | Yellowstone gRPC endpoint (preferred). Example: `https://solana-yellowstone-grpc.publicnode.com:443` |
| **`GRPC_TOKEN`** | `x-token` for the endpoint (preferred) |
| **`GEYSER_ENDPOINT`** | Alias for `GRPC_URL` (backward compatible) |
| **`GEYSER_API_TOKEN`** | Alias for `GRPC_TOKEN` (backward compatible) |
| **`MAX_EVENTS`** | In `*_grpc_json.ts` and `npm run test:grpc`: stop after N parsed events; `0` = run until Ctrl+C |
| **`TIMEOUT_MS`** | `npm run test:grpc` only: auto-exit after N ms; `0` = no timeout (can combine with `MAX_EVENTS`, whichever first) |
| **`JSON_PRETTY`** | `npm run test:grpc`: set to `1` or `true` for indented JSON (default is compact one-line) |
| **`JSON_MAX_CHARS`** | `npm run test:grpc`: max characters per event line; unset or `0` = no truncation |
| **`RPC_URL`** | `parse_tx_by_signature.ts` only: Solana HTTP RPC (default `https://api.mainnet-beta.solana.com`) |

Some scripts ship a default public token for public endpoints; for production, set `GRPC_TOKEN` explicitly.

### Examples

All commands assume the **package root** and `npm install` (examples use `tsx` + `src/`; no build required for examples).

| Description | Run Command | Source Code |
|-------------|-------------|-------------|
| **Scripts (package)** | | |
| gRPC integration test (PumpFun + PumpSwap, account-filled `DexEvent`) | `npm run test:grpc` | [scripts/test-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/test-grpc-ts.ts) |
| Debug: print `metaRaw` / log structure | `npm run debug:grpc` | [scripts/debug-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/debug-grpc-ts.ts) |
| **PumpFun** | | |
| Pretty-print **full JSON** `DexEvent` over gRPC (Rust-compatible fields) | `npx tsx examples/pumpfun_grpc_json.ts` | [examples/pumpfun_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.ts) |
| PumpFun event parsing with metrics | `npx tsx examples/pumpfun_with_metrics.ts` | [examples/pumpfun_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.ts) |
| PumpFun trade type filtering | `npx tsx examples/pumpfun_trade_filter.ts` | [examples/pumpfun_trade_filter.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.ts) |
| Quick PumpFun connection test | `npx tsx examples/pumpfun_quick_test.ts` | [examples/pumpfun_quick_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.ts) |
| **PumpSwap** | | |
| Pretty-print **full JSON** `DexEvent` over gRPC (Rust-compatible fields) | `npx tsx examples/pumpswap_grpc_json.ts` | [examples/pumpswap_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.ts) |
| PumpSwap events with metrics | `npx tsx examples/pumpswap_with_metrics.ts` | [examples/pumpswap_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.ts) |
| PumpSwap ultra-low latency | `npx tsx examples/pumpswap_low_latency.ts` | [examples/pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.ts) |
| **Meteora DAMM** | | |
| Meteora DAMM V2 events | `npx tsx examples/meteora_damm_grpc.ts` | [examples/meteora_damm_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.ts) |
| **Multi-Protocol** | | |
| Subscribe to all DEX protocols | `npx tsx examples/multi_protocol_grpc.ts` | [examples/multi_protocol_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.ts) |
| **Utility / QA** | | |
| Verify `onUpdate` sync errors do not kill the gRPC stream | `npx tsx examples/grpc_onupdate_error_test.ts` | [examples/grpc_onupdate_error_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/grpc_onupdate_error_test.ts) |
| Parse tx by signature via **`parseTransactionFromRpc`** (full RPC path; not gRPC) | `TX_SIGNATURE=<sig> [RPC_URL=...] npx tsx examples/parse_tx_by_signature.ts` | [examples/parse_tx_by_signature.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.ts) |

**Example notes**

- **`parse_tx_by_signature.ts`** requires **`TX_SIGNATURE`** (Base58). Optional **`RPC_URL`** for archive or dedicated endpoints.
- gRPC examples that call **`parseLogsOnly`** pass the transaction signature as **Base58** (from `txInfo.signature`), matching `EventMetadata.signature`.
- **`pumpfun_with_metrics` / `pumpswap_with_metrics` / `pumpswap_low_latency` / `pumpfun_trade_filter`** measure delay using the SDK’s **`nowUs`** clock and `metadata.grpc_recv_us` (same time base).
- **`meteora_damm_grpc`** and **`multi_protocol_grpc`** use program IDs aligned with `src/instr/program_ids.ts` (Meteora DAMM V2: `cpamdpZCGKUy5JxQXB2MWgCm3hcnGjEJbYTJgfm4E8a`).

### Basic Usage

**Recommended (aligned with Rust gRPC `parse_logs`):** parse log lines **and** fill mint / pool token accounts from the compiled transaction using `transactionRaw` + `metaRaw` from the subscription:

```typescript
import {
  YellowstoneGrpc,
  parseDexEventsFromGrpcTransactionInfo,
  dexEventToJsonString,
} from "sol-parser-sdk-nodejs";
// In this repository, examples use: from "../src/index.js" (run with `npx tsx`, no build step).

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
    "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // PumpSwap (Pump AMM)
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
  onError: (err) => console.error("Error:", err.message),
  onEnd: () => console.log("Stream ended"),
});

console.log(`Subscribed: ${sub.id}`);
```

**Logs-only (lighter):** `parseLogsOnly(logs, signature, slot, blockTimeUs)` does not require `transactionRaw`; some account fields (e.g. PumpSwap `base_mint`) may stay as the default zero pubkey until you call `applyAccountFillsToLogEvents` yourself with a deserialized message + meta.

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
```typescript
import { dexEventToJsonString } from "sol-parser-sdk-nodejs";

for (const ev of events) {
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
const ENDPOINT =
  process.env.GRPC_URL ||
  process.env.GEYSER_ENDPOINT ||
  "https://solana-yellowstone-grpc.publicnode.com:443";
const TOKEN =
  process.env.GRPC_TOKEN || process.env.GEYSER_API_TOKEN || "";
const client = new YellowstoneGrpc(ENDPOINT, TOKEN);
```

### gRPC helpers (Rust parity)

- **`parseDexEventsFromGrpcTransactionInfo(txInfo, slot, options?)`** — Decode logs, then apply the same account / data filling as the Rust SDK’s gRPC path (`fill_accounts` + `fill_data`). Requires `txInfo.transactionRaw` and `txInfo.metaRaw`.
- **`applyAccountFillsToLogEvents(events, message, meta)`** — If you already parsed events from logs, apply fills using a `VersionedTransaction` message and `ConfirmedTransactionMeta`.
- **`parseRpcTransaction`** / **`parseTransactionFromRpc`** — Full RPC transaction parsing (instructions + logs + fills).

### Unsubscribe

```javascript
const sub = await client.subscribeTransactions(filter, callbacks);

// Later, cancel:
client.unsubscribe(sub.id);
```

---

## 📁 Project Structure

```
sol-parser-sdk-ts/   (npm: sol-parser-sdk-nodejs)
├── src/
│   ├── core/
│   │   ├── unified_parser.ts   # parseLogsOnly, etc.
│   │   ├── dex_event.ts        # DexEvent type definition
│   │   ├── rpc_invoke_map.ts   # Program invoke map, accountKeyToBase58
│   │   └── json_utils.ts       # dexEventToJsonString
│   ├── grpc/
│   │   ├── client.ts           # YellowstoneGrpc client
│   │   ├── yellowstone_parse.ts # parseDexEventsFromGrpcTransactionInfo
│   │   └── types.ts            # ClientConfig, TransactionFilter, etc.
│   ├── rpc_transaction.ts      # parseRpcTransaction, applyAccountFillsToLogEvents
│   ├── logs/
│   │   └── optimized_matcher.ts  # Log parsing (all protocols)
│   ├── instr/
│   │   └── *.ts                  # Instruction parsers
│   └── index.ts                  # Public API exports
├── dist/                         # Compiled JavaScript
├── scripts/
│   ├── test-grpc-ts.ts           # npm run test:grpc (tsx + src)
│   └── debug-grpc-ts.ts          # npm run debug:grpc
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
2. **Prefer `parseDexEventsFromGrpcTransactionInfo` for gRPC** — Full `DexEvent` fields (mints, pool ATAs) match the Rust SDK when `transactionRaw` + `metaRaw` are present
3. **Read logs only once** — `parseLogsOnly` is optimized for hot path
4. **Avoid JSON.stringify on BigInt** — Use `dexEventToJsonString` instead
5. **Monitor latency** — Check `metadata.grpc_recv_us` in production
6. **Use latest Node.js** — Newer versions have better optimization

## 🔬 Development

```bash
npm run build          # compile TypeScript → dist/
npm run test:grpc      # gRPC integration smoke (needs GRPC_URL / GRPC_TOKEN)
npm run check:migration # dex-event parity + discriminators + json-utils (requires build)
```
