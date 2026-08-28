import bs58 from "bs58";
import {
  Message,
  MessageV0,
  PublicKey,
  type CompiledInstruction,
  type ConfirmedTransactionMeta,
  type MessageCompiledInstruction,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import type { SubscribeUpdateTransactionInfo } from "@triton-one/yellowstone-grpc";

type YellowstoneTransaction = NonNullable<SubscribeUpdateTransactionInfo["transaction"]>;
type YellowstoneMessage = NonNullable<YellowstoneTransaction["message"]>;
type YellowstoneMeta = NonNullable<SubscribeUpdateTransactionInfo["meta"]>;

function publicKey(bytes: Uint8Array): PublicKey {
  return new PublicKey(bytes);
}

function messageHeader(message: YellowstoneMessage) {
  const header = message.header;
  if (!header) throw new TypeError("Yellowstone transaction message is missing its header");
  return {
    numRequiredSignatures: header.numRequiredSignatures,
    numReadonlySignedAccounts: header.numReadonlySignedAccounts,
    numReadonlyUnsignedAccounts: header.numReadonlyUnsignedAccounts,
  };
}

function legacyMessage(message: YellowstoneMessage): Message {
  const instructions: CompiledInstruction[] = message.instructions.map((instruction) => ({
    programIdIndex: instruction.programIdIndex,
    accounts: [...instruction.accounts],
    data: bs58.encode(instruction.data),
  }));
  return new Message({
    header: messageHeader(message),
    accountKeys: message.accountKeys.map(publicKey),
    recentBlockhash: bs58.encode(message.recentBlockhash),
    instructions,
  });
}

function versionedMessage(message: YellowstoneMessage): MessageV0 {
  const compiledInstructions: MessageCompiledInstruction[] = message.instructions.map(
    (instruction) => ({
      programIdIndex: instruction.programIdIndex,
      accountKeyIndexes: [...instruction.accounts],
      data: instruction.data,
    })
  );
  return new MessageV0({
    header: messageHeader(message),
    staticAccountKeys: message.accountKeys.map(publicKey),
    recentBlockhash: bs58.encode(message.recentBlockhash),
    compiledInstructions,
    addressTableLookups: message.addressTableLookups.map((lookup) => ({
      accountKey: publicKey(lookup.accountKey),
      writableIndexes: [...lookup.writableIndexes],
      readonlyIndexes: [...lookup.readonlyIndexes],
    })),
  });
}

function transactionMeta(meta: YellowstoneMeta): ConfirmedTransactionMeta {
  return {
    err: null,
    fee: Number(meta.fee),
    preBalances: meta.preBalances.map(Number),
    postBalances: meta.postBalances.map(Number),
    innerInstructions: meta.innerInstructionsNone
      ? null
      : meta.innerInstructions.map((group) => ({
          index: group.index,
          instructions: group.instructions.map((instruction) => ({
            programIdIndex: instruction.programIdIndex,
            accounts: [...instruction.accounts],
            // The internal parser accepts bytes directly; keep Yellowstone's representation
            // instead of paying for a Base58 encode followed by an immediate decode.
            data: instruction.data as unknown as string,
            ...(instruction.stackHeight !== undefined
              ? { stackHeight: instruction.stackHeight }
              : {}),
          })),
        })),
    logMessages: meta.logMessagesNone ? null : meta.logMessages,
    preTokenBalances: [],
    postTokenBalances: [],
    loadedAddresses: {
      writable: meta.loadedWritableAddresses.map(publicKey),
      readonly: meta.loadedReadonlyAddresses.map(publicKey),
    },
    ...(meta.computeUnitsConsumed !== undefined
      ? { computeUnitsConsumed: Number(meta.computeUnitsConsumed) }
      : {}),
  };
}

/** Convert Yellowstone protobuf objects directly, without a WASM/Base58 serialization round trip. */
export function yellowstoneTransactionToWeb3(
  transaction: YellowstoneTransaction,
  meta: YellowstoneMeta,
  slot: number,
  blockTime: number | null
): VersionedTransactionResponse {
  const message = transaction.message;
  if (!message) throw new TypeError("Yellowstone transaction is missing its message");

  return {
    slot,
    blockTime,
    meta: transactionMeta(meta),
    transaction: {
      message: message.versioned ? versionedMessage(message) : legacyMessage(message),
      signatures: transaction.signatures.map((signature) => bs58.encode(signature)),
    },
    version: message.versioned ? 0 : "legacy",
  };
}
