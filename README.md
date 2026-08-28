<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>High-performance Solana DEX event parser for Node.js/TypeScript</em></h3>
</div>

<p align="center">
    <a href="https://www.npmjs.com/package/sol-parser-sdk"><img src="https://img.shields.io/badge/npm-sol--parser--sdk-red.svg" alt="npm"></a>
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
    <a href="./README_CN.md">中文</a> |
    <a href="./README.md">English</a> |
    <a href="https://fnzero.dev/">Website</a> |
    <a href="https://t.me/fnzero_group">Telegram</a> |
    <a href="https://discord.gg/vuazbGkqQE">Discord</a>
</p>

---

## Other language SDKs

| Language | Repository |
|----------|------------|
| Rust | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) |
| Node.js | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) |
| Python | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) |
| Go | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) |

---

## What This SDK Is For

`sol-parser-sdk` is the TypeScript/Node.js implementation of the FnZero Solana DEX parser SDK. The GitHub repository is named `sol-parser-sdk-nodejs` to distinguish it from the Rust/Python/Go repositories. It is built for bots, indexers, copy-trading services, sniper pipelines, and backend systems that need typed DEX events from Yellowstone gRPC, Jito ShredStream, RPC transactions, or protocol account data.

| Area | Coverage |
|------|----------|
| Parser inputs | Yellowstone gRPC, ShredStream, RPC transactions, encoded transactions, protocol account data |
| DEX protocols | PumpFun, PumpSwap, Pump Fees, Raydium LaunchLab, Raydium CPMM, Raydium CLMM, Raydium AMM V4, Meteora DAMM v2, Meteora DLMM, Meteora DBC, Orca Whirlpool |
| Use cases | Real-time DEX event parsing, token launch monitoring, copy trading, sniper bots, account filling, JSON event pipelines |
| Runtime | Node.js 18+, TypeScript, npm/yarn/pnpm projects |

---

## Release notes

### v0.5.8

- Syncs parser parity with the Rust SDK event model and program routing.
- Keeps PumpFun create instruction names and ShredStream quote-mint handling aligned across language SDKs.
- Maintains low-latency gRPC/RPC/ShredStream parsing paths for supported DEX protocols.

### v0.5.6

- Adds Meteora DBC log parsing with program-context routing and filter parity.
- Adds Raydium CLMM/CPMM and Orca account parsers and exports.
- Preserves RPC block transaction indexes and active program context for log parsing.
- Skips ShredStream instruction parsing early for account-only or empty include-only filters.
- Tightens ShredStream/RPC filter behavior to match Rust/Python/Go low-latency paths.

### v0.5.5

- Aligns ShredStream parsing with Rust/Python/Go for low-latency static-account paths.
- Uses default pubkey placeholders for V0 ALT-loaded instruction accounts instead of dropping the instruction.
- Adds discriminator fallback when the ShredStream outer program id is ALT-loaded.
- Improves Pump.fun v2 short-account parsing, create/create_v2 handling, and event-type filter parity.
- Refreshes multi-protocol routing for Pump.fun, PumpSwap, Pump Fees, Raydium, Orca, and Meteora paths.

---

## How to use

### 1. Install

**From npm**

```bash
npm install sol-parser-sdk@0.5.13
```

**From source** (folder may be named `sol-parser-sdk-ts` in a monorepo)

```bash
git clone https://github.com/0xfnzero/sol-parser-sdk-nodejs
cd sol-parser-sdk-nodejs
npm install
# npm run build   # only if you import from dist/ instead of examples/tsx → src
```

### 2. Environment (Yellowstone gRPC examples)

At the **package root** (next to `package.json`):

```bash
cp .env.example .env
# Set GRPC_URL and GRPC_TOKEN
```

Run examples from that directory so `.env` is picked up.

### 3. Smoke test

```bash
npx tsx scripts/test-grpc-ts.ts
```

Requires `GRPC_URL` and `GRPC_TOKEN`. See `.env.example` for optional vars (`MAX_EVENTS`, `TIMEOUT_MS`, etc.).

### 4. Minimal gRPC subscribe + parse

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

### Long-running low-latency DEX subscriptions

The public API remains queue-based, matching the Rust SDK's `subscribe_dex_events` shape. The Node
subscription is an async iterable instead of Rust's `ArrayQueue`. Raw Yellowstone protobuf objects
are mapped directly into the parser without the former protobuf/WASM/JSON/Base58 transaction
round-trip. Ring-buffer dequeue, bounded pre-parser scheduling, HTTP/2 receive-window tuning, and
reconnect behavior are handled inside the SDK:

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

If using `for await`, the default overflow behavior remains `drop-newest` for compatibility. A
tip-oriented consumer can choose `queueOverflowStrategy: "drop-oldest"`. Monitor the public event
queue with `sub.len()` / `sub.eventDropped()` and the pre-parser queue with
`sub.ingressLen()` / `sub.ingressDropped()`. `sub.dropped()` is the combined count. Every overflow
is counted and periodically reported through `sub.errors`.

Automatic reconnect resumes from the last successfully parsed slot by default and deduplicates
replayed transaction/account updates. Monitor transport continuity with `sub.isStreamConnected()`,
`sub.streamDisconnects()`, `sub.reconnects()`, `sub.replayedUpdates()`, and
`sub.continuityBreaks()`. A zero local drop count does not describe updates lost before the gRPC
`data` callback. If a provider rejects Yellowstone `fromSlot`, the SDK reports the failure through
`sub.errors`, increments `continuityBreaks()`, and reconnects live. Set `replayOnReconnect: false`
only when duplicate-free live delivery is more important than recovering a disconnect window.

For precise local-only measurements, set `config.enable_metrics = true`. Event metadata then includes
`local_queue_latency_us`, `parse_duration_us`, and `local_processing_latency_us`. These values use
Node's monotonic high-resolution clock. They measure only local queueing and parsing; the hot path
does not call `getSlot`, `getTransaction`, JSON-RPC, or any unary RPC method.

`local_processing_latency_us` is the end-to-end local metric: it starts at entry to Yellowstone's
gRPC `data` callback and ends immediately after complete event parsing and field filling.

Full-volume PumpFun and PumpSwap can use the same Rust-aligned program filter. Yellowstone applies
`account_include` as ANY, so this receives every transaction containing either supported program:

```typescript
const allPumpTransactions = transactionFilterForProtocols(["PumpFun", "PumpSwap"]);
const sub = await client.subscribeDexEvents([allPumpTransactions], [], eventTypeFilter);
```

`eventTypeFilter` avoids unnecessary event decoding, but it does not reduce traffic sent by
Yellowstone. When an application intentionally needs only selected mints, pools, or users, the
optional scoped filter requires the protocol program and any one tracked account:

```typescript
const pumpSwap = transactionFilterForProtocolAccounts("PumpSwap", knownMintsAndPools);
const sub = await client.subscribeDexEvents(
  [transactionFilterForProtocols(["PumpFun"]), pumpSwap],
  [],
  eventTypeFilter
);
```

The combined example uses full-volume PumpSwap by default. Set `PUMPSWAP_FILTER_MODE=scoped` only when
scoped monitoring is desired; in that mode `updateSubscription()` refreshes the active account
filters. `PumpSwapCreatePool` maps a known base or quote mint to its pool, and
`PumpSwapLiquidityAdded` can then be compared with the developer associated with that mint.

Two `YellowstoneGrpc` instances in one Node process still share one JavaScript event loop. The direct
protobuf path supports full PumpFun + PumpSwap in one subscription; use a separate OS process or
Worker Thread only when application callbacks, database work, or additional protocols saturate that
event loop. A separate gRPC connection alone does not provide CPU isolation. Send database work to a
bounded handoff queue and batch asynchronous SQLite WAL writes; do not await one write per event in
the subscription loop.

No bounded in-memory stream can guarantee both zero loss and bounded latency when the consumer's
average processing rate is below the filtered input rate. Keep the loop body CPU-light, avoid
per-event synchronous logging, filter at the server, and persist or dispatch slow work outside the
consumer loop.

**Lighter path:** `parseLogsOnly(logs, signature, slot, …)` — no `transactionRaw`; use `applyAccountFillsToLogEvents` if you need filled accounts without full gRPC meta.

### 5. ShredStream (HTTP — not Yellowstone gRPC)

Uses **`SHREDSTREAM_URL`** or **`SHRED_URL`** (default `http://127.0.0.1:10800`), or CLI **`--url`**. Not `GRPC_URL`.

The client decodes gRPC `entries` bytes in **TypeScript** (same layout as the Go `shredstream/entries_decode` path) and deserializes wire transactions with `@solana/web3.js` — **no WebAssembly or wasm-pack build**.

```bash
npx tsx examples/shredstream_example.ts -- --url=http://127.0.0.1:10800
```

Without RPC, V0 ALT-loaded account indexes are represented with default pubkey placeholders and parsed best-effort. `shredstream_pumpfun_json.ts` can also use Solana **`RPC_URL`** (or `--rpc`) to expand ALTs when exact loaded-account fields are required.

---

## Examples

From the **package root** after `npm install`. Examples use `npx tsx` and load `src/` directly — **no `npm run build` required** for examples. **Source** is one file per row (click to open on GitHub or npm).

| Description | Run command | Source |
|-------------|-------------|--------|
| **Scripts** | | |
| gRPC integration test (PumpFun + PumpSwap, account-filled `DexEvent`) | `npx tsx scripts/test-grpc-ts.ts` | [test-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/test-grpc-ts.ts) |
| Debug: print `metaRaw` / log structure | `npx tsx scripts/debug-grpc-ts.ts` | [debug-grpc-ts.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/scripts/debug-grpc-ts.ts) |
| **PumpFun** | | |
| CREATE + dev BUY/SELL, long-running low latency | `npx tsx examples/devtrades_low_latency.ts` | [devtrades_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_low_latency.ts) |
| PumpFun + full-volume PumpSwap dev trades/liquidity | `npm run example:grpc:devtrades:pumpswap` | [devtrades_pumpfun_pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/devtrades_pumpfun_pumpswap_low_latency.ts) |
| Pretty-print full JSON `DexEvent` over gRPC | `npx tsx examples/pumpfun_grpc_json.ts` | [pumpfun_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.ts) |
| PumpFun events + metrics | `npx tsx examples/pumpfun_with_metrics.ts` | [pumpfun_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.ts) |
| PumpFun trade filter | `npx tsx examples/pumpfun_trade_filter.ts` | [pumpfun_trade_filter.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.ts) |
| Quick PumpFun connection test | `npx tsx examples/pumpfun_quick_test.ts` | [pumpfun_quick_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.ts) |
| **PumpSwap** | | |
| Pretty-print full JSON `DexEvent` over gRPC | `npx tsx examples/pumpswap_grpc_json.ts` | [pumpswap_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.ts) |
| PumpSwap events + metrics | `npx tsx examples/pumpswap_with_metrics.ts` | [pumpswap_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.ts) |
| PumpSwap swaps, pool creation, and liquidity events (ultra-low latency) | `npm run example:grpc:pumpswap` | [pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.ts) |
| **Meteora DAMM** | | |
| Meteora DAMM V2 events | `npx tsx examples/meteora_damm_grpc.ts` | [meteora_damm_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/meteora_damm_grpc.ts) |
| **ShredStream** (HTTP, not Yellowstone gRPC; see **step 5** above) | | |
| Ultra-low-latency subscribe + queue / latency stats. URL: `--url` / `SHREDSTREAM_URL` / `.env` (default `http://127.0.0.1:10800`). | `npx tsx examples/shredstream_example.ts` | [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts) |
| PumpFun `DexEvent` JSON from ShredStream; static ALT fallback works without RPC, and Solana **RPC** (`RPC_URL` or `--rpc`) expands full ALT accounts when needed. | `npx tsx examples/shredstream_pumpfun_json.ts` | [shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts) |
| **Multi-protocol** | | |
| Subscribe to all DEX protocols | `npx tsx examples/multi_protocol_grpc.ts` | [multi_protocol_grpc.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/multi_protocol_grpc.ts) |
| **Utility** | | |
| Verify `onUpdate` sync errors do not kill the gRPC stream | `npx tsx examples/grpc_onupdate_error_test.ts` | [grpc_onupdate_error_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/grpc_onupdate_error_test.ts) |
| Parse tx by signature (`parseTransactionFromRpc`; not gRPC). Set `TX_SIGNATURE` in `.env` or env. | `npx tsx examples/parse_tx_by_signature.ts` | [parse_tx_by_signature.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/parse_tx_by_signature.ts) |

**`npm run` aliases** (same source files as the ShredStream rows above):

- `npm run example:shredstream` → [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts)
- `npm run example:shredstream:subscribe` → [shredstream_example.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_example.ts)
- `npm run example:shredstream:pumpfun-json` → [shredstream_pumpfun_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/shredstream_pumpfun_json.ts)

**Env:** gRPC examples need **`GRPC_URL`** + **`GRPC_TOKEN`**. Exported shell values take precedence; `.env` supplies values that are not already present. ShredStream uses **`SHREDSTREAM_URL`** / **`SHRED_URL`** or **`--url`**; `shredstream_pumpfun_json` also needs **`RPC_URL`** / **`--rpc`**. See **`.env.example`**.

---

## Protocols

PumpFun, PumpSwap, Raydium AMM V4 / CLMM / CPMM, Orca Whirlpool, Meteora DAMM V2 / DLMM, Raydium LaunchLab (see `src/instr/`).

---

## Useful exports

- `parseDexEventsFromGrpcTransactionInfo` — needs `transactionRaw` + `metaRaw` (Rust gRPC parity).
- `parseRpcTransaction` / `parseTransactionFromRpc` — HTTP RPC path.
- `dexEventToJsonString` — BigInt-safe JSON.

---

## Development

```bash
npm run build
npm run check:migration   # parity checks; needs build
```

---

## License

MIT — https://github.com/0xfnzero/sol-parser-sdk-nodejs
