import bs58 from "bs58";
import {
  Message,
  MessageV0,
  PublicKey,
  type ConfirmedTransactionMeta,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { convertRpcToGrpc } from "./rpc_to_grpc.js";
import { yellowstoneTransactionToWeb3 } from "./yellowstone_transaction_adapter.js";

function key(seed: number): PublicKey {
  return new PublicKey(Uint8Array.from({ length: 32 }, (_, index) => (seed + index) & 0xff));
}

function signature(seed: number): string {
  return bs58.encode(Uint8Array.from({ length: 64 }, (_, index) => (seed + index) & 0xff));
}

function meta(overrides: Partial<ConfirmedTransactionMeta> = {}): ConfirmedTransactionMeta {
  return {
    err: null,
    fee: 5_000,
    preBalances: [10_000, 20_000],
    postBalances: [5_000, 20_000],
    innerInstructions: null,
    logMessages: ["Program log: adapter-test"],
    preTokenBalances: [],
    postTokenBalances: [],
    loadedAddresses: { writable: [], readonly: [] },
    ...overrides,
  };
}

function roundTrip(
  message: Message | MessageV0,
  transactionMeta: ConfirmedTransactionMeta
): VersionedTransactionResponse {
  const rpc = {
    slot: 123,
    blockTime: 456,
    meta: transactionMeta,
    transaction: {
      message,
      signatures: [signature(9)],
    },
    version: message.version,
  } as unknown as VersionedTransactionResponse;
  const converted = convertRpcToGrpc(rpc);
  expect(converted.ok).toBe(true);
  if (!converted.ok) throw new Error(converted.error.message);
  return yellowstoneTransactionToWeb3(converted.transaction, converted.meta, rpc.slot, rpc.blockTime);
}

describe("yellowstoneTransactionToWeb3", () => {
  it("preserves legacy messages without serializing the whole transaction", () => {
    const message = new Message({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      accountKeys: [key(1), key(2)],
      recentBlockhash: key(3).toBase58(),
      instructions: [
        {
          programIdIndex: 1,
          accounts: [0],
          data: bs58.encode(Uint8Array.from([1, 2, 3, 4])),
        },
      ],
    });

    const adapted = roundTrip(message, meta());
    expect(adapted.version).toBe("legacy");
    expect(adapted.transaction.message).toBeInstanceOf(Message);
    const adaptedMessage = adapted.transaction.message as Message;
    expect(adaptedMessage.header).toEqual(message.header);
    expect(adaptedMessage.accountKeys.map(String)).toEqual(message.accountKeys.map(String));
    expect(adaptedMessage.recentBlockhash).toBe(message.recentBlockhash);
    expect(adaptedMessage.compiledInstructions).toEqual(message.compiledInstructions);
    expect(adapted.transaction.signatures).toEqual([signature(9)]);
    expect(adapted.meta?.logMessages).toEqual(["Program log: adapter-test"]);
  });

  it("preserves v0 lookups, loaded addresses, and inner instruction stack heights", () => {
    const lookupKey = key(30);
    const message = new MessageV0({
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      staticAccountKeys: [key(10), key(11)],
      recentBlockhash: key(12).toBase58(),
      compiledInstructions: [
        {
          programIdIndex: 1,
          accountKeyIndexes: Uint8Array.from([0, 2]),
          data: Uint8Array.from([5, 6, 7]),
        },
      ],
      addressTableLookups: [
        {
          accountKey: lookupKey,
          writableIndexes: Uint8Array.from([1, 3]),
          readonlyIndexes: Uint8Array.from([2]),
        },
      ],
    });
    const writable = key(40);
    const readonly = key(41);
    const innerData = Uint8Array.from([8, 9, 10]);
    const adapted = roundTrip(
      message,
      meta({
        loadedAddresses: { writable: [writable], readonly: [readonly] },
        innerInstructions: [
          {
            index: 0,
            instructions: [
              {
                programIdIndex: 1,
                accounts: [0, 2],
                data: bs58.encode(innerData),
                stackHeight: 3,
              },
            ],
          },
        ],
        computeUnitsConsumed: 99,
      })
    );

    expect(adapted.version).toBe(0);
    expect(adapted.transaction.message).toBeInstanceOf(MessageV0);
    const adaptedMessage = adapted.transaction.message as MessageV0;
    expect(adaptedMessage.compiledInstructions).toHaveLength(1);
    expect(adaptedMessage.compiledInstructions[0]?.programIdIndex).toBe(1);
    expect([...adaptedMessage.compiledInstructions[0]!.accountKeyIndexes]).toEqual([0, 2]);
    expect([...adaptedMessage.compiledInstructions[0]!.data]).toEqual([5, 6, 7]);
    expect(adaptedMessage.addressTableLookups[0]?.accountKey.equals(lookupKey)).toBe(true);
    expect(adaptedMessage.addressTableLookups[0]?.writableIndexes).toEqual([1, 3]);
    expect(adaptedMessage.addressTableLookups[0]?.readonlyIndexes).toEqual([2]);
    expect(adapted.meta?.loadedAddresses?.writable[0]?.equals(writable)).toBe(true);
    expect(adapted.meta?.loadedAddresses?.readonly[0]?.equals(readonly)).toBe(true);
    expect(adapted.meta?.innerInstructions).toEqual([
      {
        index: 0,
        instructions: [
          {
            programIdIndex: 1,
            accounts: [0, 2],
            data: innerData,
            stackHeight: 3,
          },
        ],
      },
    ]);
    expect(adapted.meta?.computeUnitsConsumed).toBe(99);
  });
});
