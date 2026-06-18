import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { PUMPFUN_PROGRAM_ID } from "./grpc/program_ids.js";
import { parseRpcTransaction } from "./rpc_transaction.js";

const PUMPFUN_BUY = [102, 6, 61, 18, 1, 218, 235, 234] as const;
const PUMPFUN_TRADE = [189, 219, 127, 211, 78, 230, 97, 238] as const;
const EVENT_CPI_SUFFIX = [155, 167, 108, 32, 122, 76, 173, 64] as const;
const PUMPFUN_CREATE_PREFIX = "Program data: G3KpTd7rY3Y";

function pk(seed: number): PublicKey {
  return new PublicKey(Uint8Array.from({ length: 32 }, (_, i) => (seed + i) & 0xff));
}

function pushU32(out: number[], value: number): void {
  out.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

function pushU64(out: number[], value: bigint): void {
  for (let i = 0n; i < 8n; i++) out.push(Number((value >> (8n * i)) & 0xffn));
}

function pushI64(out: number[], value: bigint): void {
  pushU64(out, BigInt.asUintN(64, value));
}

function pushPubkey(out: number[], key: PublicKey): void {
  out.push(...key.toBytes());
}

function pushString(out: number[], value: string): void {
  const bytes = new TextEncoder().encode(value);
  pushU32(out, bytes.length);
  out.push(...bytes);
}

function pumpfunTradePayload(ixName: string): Uint8Array {
  const out: number[] = [];
  pushPubkey(out, pk(70));
  pushU64(out, 10n);
  pushU64(out, 20n);
  out.push(1);
  pushPubkey(out, pk(71));
  pushI64(out, 30n);
  for (const value of [40n, 50n, 60n, 70n]) pushU64(out, value);
  pushPubkey(out, pk(72));
  pushU64(out, 80n);
  pushU64(out, 90n);
  pushPubkey(out, pk(73));
  pushU64(out, 100n);
  pushU64(out, 110n);
  out.push(0);
  for (const value of [120n, 130n, 140n]) pushU64(out, value);
  pushI64(out, 150n);
  pushString(out, ixName);
  return Uint8Array.from(out);
}

function innerTradeIxData(ixName: string): Uint8Array {
  return Uint8Array.from([
    ...PUMPFUN_TRADE,
    ...EVENT_CPI_SUFFIX,
    ...pumpfunTradePayload(ixName),
  ]);
}

function outerBuyIxData(amount: bigint, maxSolCost: bigint): Uint8Array {
  const out = [...PUMPFUN_BUY];
  pushU64(out, amount);
  pushU64(out, maxSolCost);
  out.push(0);
  return Uint8Array.from(out);
}

function pumpfunTradeLog(ixName: string): string {
  return `Program data: ${Buffer.from(Uint8Array.from([...PUMPFUN_TRADE, ...pumpfunTradePayload(ixName)])).toString("base64")}`;
}

function rpcTx(instructions: TransactionInstruction[], logMessages: string[], innerData?: Uint8Array) {
  const payerKey = pk(240);
  const message = new TransactionMessage({
    payerKey,
    recentBlockhash: "11111111111111111111111111111111",
    instructions,
  }).compileToV0Message();
  const vt = new VersionedTransaction(message);
  const meta: any = {
    fee: 0,
    preBalances: [],
    postBalances: [],
    logMessages,
    innerInstructions: innerData ? [{
      index: 0,
      instructions: [{
        programIdIndex: message.compiledInstructions[0]!.programIdIndex,
        accounts: message.compiledInstructions[0]!.accountKeyIndexes,
        data: innerData,
      }],
    }] : [],
    preTokenBalances: [],
    postTokenBalances: [],
    err: null,
  };
  return { slot: 7, blockTime: null, meta, transaction: vt } as any;
}

describe("parseRpcTransaction parity", () => {
  it("merges outer and inner PumpFun instructions by outer index", () => {
    const programId = new PublicKey(PUMPFUN_PROGRAM_ID);
    const keys = Array.from({ length: 18 }, (_, i) => ({
      pubkey: pk(i + 1),
      isSigner: false,
      isWritable: true,
    }));
    const tx = rpcTx(
      [new TransactionInstruction({ programId, keys, data: Buffer.from(outerBuyIxData(123n, 456n)) })],
      [],
      innerTradeIxData("buy")
    );

    const parsed = parseRpcTransaction(tx, "sig", undefined, { grpcRecvUs: 99, txIndex: 42 });
    expect(parsed.ok).toBe(true);
    const events = parsed.ok ? parsed.events : [];
    expect(events).toHaveLength(1);
    expect("PumpFunBuy" in events[0]!).toBe(true);
    const trade = (events[0] as any).PumpFunBuy;
    expect(trade.sol_amount).toBe(10n);
    expect(trade.token_amount).toBe(20n);
    expect(trade.amount).toBe(123n);
    expect(trade.max_sol_cost).toBe(456n);
    expect(trade.bonding_curve).toBe(keys[3]!.pubkey.toBase58());
    expect(trade.metadata.tx_index).toBe(42);
    expect(trade.metadata.recent_blockhash).toBe("11111111111111111111111111111111");
  });

  it("uses whole-transaction PumpFun create detection for log trades", () => {
    const tx = rpcTx(
      [],
      [
        `Program ${PUMPFUN_PROGRAM_ID} invoke [1]`,
        pumpfunTradeLog("buy"),
        PUMPFUN_CREATE_PREFIX,
        `Program ${PUMPFUN_PROGRAM_ID} success`,
      ],
    );

    const parsed = parseRpcTransaction(tx, "sig", undefined, { grpcRecvUs: 99, txIndex: 7 });
    expect(parsed.ok).toBe(true);
    const events = parsed.ok ? parsed.events : [];
    expect(events).toHaveLength(1);
    expect("PumpFunBuy" in events[0]!).toBe(true);
    expect((events[0] as any).PumpFunBuy.is_created_buy).toBe(true);
  });
});
