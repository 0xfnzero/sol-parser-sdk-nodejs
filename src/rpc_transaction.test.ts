import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { PUMPFUN_PROGRAM_ID } from "./grpc/program_ids.js";
import { METEORA_DLMM_PROGRAM_ID } from "./instr/program_ids.js";
import { parseRpcTransaction } from "./rpc_transaction.js";

const PUMPFUN_BUY = [102, 6, 61, 18, 1, 218, 235, 234] as const;
const PUMPFUN_TRADE = [189, 219, 127, 211, 78, 230, 97, 238] as const;
const EVENT_CPI_SUFFIX = [155, 167, 108, 32, 122, 76, 173, 64] as const;
const PUMPFUN_CREATE_PREFIX = "Program data: G3KpTd7rY3Y";
const DLMM_SWAP = [248, 198, 158, 145, 225, 117, 135, 200] as const;
const DLMM_SWAP2_EVENT = [46, 116, 82, 215, 148, 27, 84, 77] as const;
const ANCHOR_EVENT_CPI = [228, 69, 165, 46, 81, 203, 154, 29] as const;

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

function dlmmSwapIxData(amountIn: bigint, minOut: bigint): Uint8Array {
  const out = [...DLMM_SWAP];
  pushU64(out, amountIn);
  pushU64(out, minOut);
  return Uint8Array.from(out);
}

function dlmmSwap2EventData(amountIn: bigint, amountOut: bigint): Uint8Array {
  const data = new Uint8Array(16 + 147);
  data.set(ANCHOR_EVENT_CPI, 0);
  data.set(DLMM_SWAP2_EVENT, 8);
  const view = new DataView(data.buffer);
  view.setBigUint64(16 + 89, amountIn, true);
  view.setBigUint64(16 + 105, amountOut, true);
  return data;
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

  it("merges each aggregator DLMM swap with its direct event CPI", () => {
    const dlmmProgram = new PublicKey(METEORA_DLMM_PROGRAM_ID);
    const aggregatorProgram = pk(210);
    const dlmmAccounts = Array.from({ length: 11 }, (_, i) => ({
      pubkey: pk(20 + i),
      isSigner: false,
      isWritable: true,
    }));
    const message = new TransactionMessage({
      payerKey: pk(240),
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [new TransactionInstruction({
        programId: aggregatorProgram,
        keys: [{ pubkey: dlmmProgram, isSigner: false, isWritable: false }, ...dlmmAccounts],
        data: Buffer.alloc(0),
      })],
    }).compileToV0Message();
    const dlmmProgramIndex = message.staticAccountKeys.findIndex((key) => key.equals(dlmmProgram));
    const accountIndexes = dlmmAccounts.map(({ pubkey }) =>
      message.staticAccountKeys.findIndex((key) => key.equals(pubkey))
    );
    const innerInstructions = [
      { data: dlmmSwapIxData(1n, 1n), stackHeight: 2 },
      { data: dlmmSwap2EventData(10n, 9n), stackHeight: 3 },
      { data: dlmmSwapIxData(2n, 2n), stackHeight: 2 },
      { data: dlmmSwap2EventData(20n, 18n), stackHeight: 3 },
    ].map(({ data, stackHeight }, index) => ({
      programIdIndex: dlmmProgramIndex,
      accounts: index % 2 === 0 ? accountIndexes : [],
      data,
      stackHeight,
    }));
    const tx = {
      slot: 7,
      blockTime: null,
      meta: {
        fee: 0,
        preBalances: [],
        postBalances: [],
        logMessages: [],
        innerInstructions: [{ index: 0, instructions: innerInstructions }],
        preTokenBalances: [],
        postTokenBalances: [],
        err: null,
      },
      transaction: new VersionedTransaction(message),
    } as any;

    const parsed = parseRpcTransaction(tx, "sig", undefined, { grpcRecvUs: 99 });
    expect(parsed.ok).toBe(true);
    const events = parsed.ok ? parsed.events : [];
    expect(events).toHaveLength(2);
    expect(events.map((event) => (event as any).MeteoraDlmmSwap.amount_in))
      .toEqual([10n, 20n]);
    expect(events.map((event) => (event as any).MeteoraDlmmSwap.amount_out))
      .toEqual([9n, 18n]);
  });

  it("keeps DLMM position fields that are absent from PositionCreate event CPI", () => {
    const dlmmProgram = new PublicKey(METEORA_DLMM_PROGRAM_ID);
    const accounts = Array.from({ length: 5 }, (_, i) => ({
      pubkey: pk(80 + i), isSigner: false, isWritable: true,
    }));
    const positionIx = new Uint8Array(16);
    positionIx.set([219, 192, 234, 71, 190, 191, 102, 80]);
    new DataView(positionIx.buffer).setInt32(8, -42, true);
    new DataView(positionIx.buffer).setInt32(12, 70, true);
    const positionEvent = new Uint8Array(16 + 96);
    positionEvent.set(ANCHOR_EVENT_CPI, 0);
    positionEvent.set([144, 142, 252, 84, 157, 53, 37, 121], 8);
    positionEvent.set(accounts[2]!.pubkey.toBytes(), 16);
    positionEvent.set(accounts[1]!.pubkey.toBytes(), 48);
    positionEvent.set(accounts[3]!.pubkey.toBytes(), 80);
    const message = new TransactionMessage({
      payerKey: pk(240),
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [new TransactionInstruction({
        programId: dlmmProgram, keys: accounts, data: Buffer.from(positionIx),
      })],
    }).compileToV0Message();
    const outer = message.compiledInstructions[0]!;
    const tx = {
      slot: 7,
      blockTime: null,
      meta: {
        fee: 0, preBalances: [], postBalances: [], logMessages: [],
        innerInstructions: [{
          index: 0,
          instructions: [{
            programIdIndex: outer.programIdIndex,
            accounts: [],
            data: positionEvent,
            stackHeight: 2,
          }],
        }],
        preTokenBalances: [], postTokenBalances: [], err: null,
      },
      transaction: new VersionedTransaction(message),
    } as any;

    const parsed = parseRpcTransaction(tx, "sig", undefined, { grpcRecvUs: 99 });
    expect(parsed.ok).toBe(true);
    const event = parsed.ok ? (parsed.events[0] as any).MeteoraDlmmCreatePosition : null;
    expect(event?.lower_bin_id).toBe(-42);
    expect(event?.width).toBe(70);
  });
});
