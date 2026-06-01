<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>High-performance Solana DEX event parser for Node.js/TypeScript</em></h3>
</div>

<p align="center">
    <a href="https://www.npmjs.com/package/sol-parser-sdk-nodejs"><img src="https://img.shields.io/badge/npm-sol--parser--sdk--nodejs-red.svg" alt="npm"></a>
    <a href="https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

<p align="center">
    <a href="./README_CN.md">中文</a> |
    <a href="./README.md">English</a> |
    <a href="https://fnzero.dev/">Website</a> |
    <a href="https://t.me/fnzero_group">Telegram</a> |
    <a href="https://discord.gg/vuazbGkqQE">Discord</a>
</p>

> ☕ **Support This Project**
>
> This SDK is completely free and open source. However, maintaining and continuously updating it requires significant AI computing resources and token consumption. If this SDK helps with your development, consider making a monthly SOL donation — any amount is appreciated and helps keep this project alive!
>
> **Donation Wallet:** `6oW7AXz1yRb57pYSxysuXnMs2aR1ha5rzGzReZ1MjPV8`

---

## Other language SDKs

| Language | Repository |
|----------|------------|
| Rust | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) |
| Node.js | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) |
| Python | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) |
| Go | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) |

---

## Release notes

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
npm install sol-parser-sdk-nodejs@0.5.6
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
} from "sol-parser-sdk-nodejs";

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
| Pretty-print full JSON `DexEvent` over gRPC | `npx tsx examples/pumpfun_grpc_json.ts` | [pumpfun_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_grpc_json.ts) |
| PumpFun events + metrics | `npx tsx examples/pumpfun_with_metrics.ts` | [pumpfun_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_with_metrics.ts) |
| PumpFun trade filter | `npx tsx examples/pumpfun_trade_filter.ts` | [pumpfun_trade_filter.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_trade_filter.ts) |
| Quick PumpFun connection test | `npx tsx examples/pumpfun_quick_test.ts` | [pumpfun_quick_test.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpfun_quick_test.ts) |
| **PumpSwap** | | |
| Pretty-print full JSON `DexEvent` over gRPC | `npx tsx examples/pumpswap_grpc_json.ts` | [pumpswap_grpc_json.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_grpc_json.ts) |
| PumpSwap events + metrics | `npx tsx examples/pumpswap_with_metrics.ts` | [pumpswap_with_metrics.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_with_metrics.ts) |
| PumpSwap ultra-low latency | `npx tsx examples/pumpswap_low_latency.ts` | [pumpswap_low_latency.ts](https://github.com/0xfnzero/sol-parser-sdk-nodejs/blob/main/examples/pumpswap_low_latency.ts) |
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

**Env:** gRPC examples need **`GRPC_URL`** + **`GRPC_TOKEN`**. ShredStream uses **`SHREDSTREAM_URL`** / **`SHRED_URL`** or **`--url`**; `shredstream_pumpfun_json` also needs **`RPC_URL`** / **`--rpc`**. See **`.env.example`**.

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
