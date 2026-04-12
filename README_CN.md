<div align="center">
    <h1>⚡ Sol Parser SDK - Node.js</h1>
    <h3><em>高性能 Solana DEX 事件解析（Node.js / TypeScript）</em></h3>
</div>

<p align="center">
    <a href="https://www.npmjs.com/package/sol-parser-sdk-nodejs"><img src="https://img.shields.io/badge/npm-sol--parser--sdk--nodejs-red.svg" alt="npm"></a>
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

## 其他语言 SDK

| 语言 | 仓库 |
|------|------|
| Rust | [sol-parser-sdk](https://github.com/0xfnzero/sol-parser-sdk) |
| Node.js | [sol-parser-sdk-nodejs](https://github.com/0xfnzero/sol-parser-sdk-nodejs) |
| Python | [sol-parser-sdk-python](https://github.com/0xfnzero/sol-parser-sdk-python) |
| Go | [sol-parser-sdk-golang](https://github.com/0xfnzero/sol-parser-sdk-golang) |

---

## 怎么用

### 1. 安装

**npm**

```bash
npm install sol-parser-sdk-nodejs
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

更轻量：仅用日志用 `parseLogsOnly`；要补账户可再配合 `applyAccountFillsToLogEvents`。

### 5. ShredStream（HTTP，不是 Yellowstone gRPC）

使用 **`SHREDSTREAM_URL`** / **`SHRED_URL`**（默认 `http://127.0.0.1:10800`）或命令行 **`--url`**，**不用** `GRPC_URL`。

```bash
npx tsx examples/shredstream_example.ts -- --url=http://127.0.0.1:10800
```

`shredstream_pumpfun_json.ts` 另需 Solana **`RPC_URL`**（或 `--rpc`）解析 ALT。

---

## 示例命令

| | |
|--|--|
| gRPC 集成（PumpFun + PumpSwap） | `npx tsx scripts/test-grpc-ts.ts` |
| PumpFun JSON / 指标 / 过滤 | `npx tsx examples/pumpfun_grpc_json.ts` · `pumpfun_with_metrics.ts` · `pumpfun_trade_filter.ts` |
| PumpSwap JSON / 指标 / 低延迟 | `npx tsx examples/pumpswap_grpc_json.ts` · `pumpswap_with_metrics.ts` · `pumpswap_low_latency.ts` |
| Meteora / 多协议 | `npx tsx examples/meteora_damm_grpc.ts` · `multi_protocol_grpc.ts` |
| ShredStream | `npx tsx examples/shredstream_example.ts` · `shredstream_pumpfun_json.ts` |
| 仅 RPC 按签名解析交易 | `npx tsx examples/parse_tx_by_signature.ts` |

`package.json` 中 `npm run example:shredstream`、`example:shredstream:pumpfun-json` 为上述脚本的别名。

---

## 协议

PumpFun、PumpSwap、Raydium AMM V4 / CLMM / CPMM、Orca Whirlpool、Meteora DAMM V2 / DLMM、Bonk Launchpad（见 `src/instr/`）。

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
