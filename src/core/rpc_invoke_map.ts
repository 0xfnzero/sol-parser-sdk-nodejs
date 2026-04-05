/**
 * 从 web3.js 交易构建「程序 → 指令调用 (outer, inner)」映射，供 RPC 路径账户填充。
 * 构造 `program_invokes`（按程序 ID 聚合 invoke，选账户数最多的那次）。
 */
import bs58 from "bs58";
import {
  Message,
  MessageV0,
  PublicKey,
  type CompiledInstruction,
  type ConfirmedTransactionMeta,
  type MessageCompiledInstruction,
} from "@solana/web3.js";

export type InvokePair = readonly [outerIndex: number, innerIndex: number];

export function isCompiledVersionedMessage(msg: unknown): msg is Message | MessageV0 {
  if (msg === null || typeof msg !== "object") return false;
  return (
    "compiledInstructions" in msg &&
    Array.isArray((msg as Message).compiledInstructions) &&
    typeof (msg as Message).getAccountKeys === "function"
  );
}

export function getAccountKeyResolver(
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null
): { get(i: number): PublicKey | undefined; length: number } {
  if (message.version === "legacy") {
    const keys = message.getAccountKeys();
    return { get: (i) => keys.get(i), length: keys.length };
  }
  const loaded = meta?.loadedAddresses;
  const keys = message.getAccountKeys(
    loaded ? { accountKeysFromLookups: loaded } : undefined
  );
  return { get: (i) => keys.get(i), length: keys.length };
}

export function decodeIxData(data: Uint8Array | string): Uint8Array {
  if (typeof data === "string") return Uint8Array.from(bs58.decode(data));
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

export function buildProgramInvokesMap(
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  resolver: { get(i: number): PublicKey | undefined }
): Map<string, InvokePair[]> {
  const m = new Map<string, InvokePair[]>();
  const push = (pid: string, inv: InvokePair) => {
    const arr = m.get(pid);
    if (arr) arr.push(inv);
    else m.set(pid, [inv]);
  };

  message.compiledInstructions.forEach((ix: MessageCompiledInstruction, idx: number) => {
    const pk = resolver.get(ix.programIdIndex)?.toBase58();
    if (pk) push(pk, [idx, -1]);
  });

  for (const group of meta?.innerInstructions ?? []) {
    const outer = group.index;
    group.instructions.forEach((raw, j) => {
      const ix = raw as CompiledInstruction;
      const pk = resolver.get(ix.programIdIndex)?.toBase58();
      if (pk) push(pk, [outer, j]);
    });
  }

  return m;
}

export function instructionAccountIndices(
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  invoke: InvokePair
): number[] | null {
  const [outerIdx, innerIdx] = invoke;
  if (innerIdx < 0) {
    const ix = message.compiledInstructions[outerIdx];
    return ix ? [...ix.accountKeyIndexes] : null;
  }
  const g = meta?.innerInstructions?.find((x) => x.index === outerIdx);
  const ix = g?.instructions[innerIdx] as CompiledInstruction | undefined;
  return ix ? [...ix.accounts] : null;
}

export function countInstructionAccounts(
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  invoke: InvokePair
): number {
  return instructionAccountIndices(message, meta, invoke)?.length ?? 0;
}

export function findMaxAccountsInvoke(
  programId: string,
  invokes: Map<string, InvokePair[]>,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null
): InvokePair | null {
  const list = invokes.get(programId);
  if (!list?.length) return null;
  let best = list[0]!;
  let bestN = countInstructionAccounts(message, meta, best);
  for (let i = 1; i < list.length; i++) {
    const inv = list[i]!;
    const n = countInstructionAccounts(message, meta, inv);
    if (n > bestN) {
      best = inv;
      bestN = n;
    }
  }
  return best;
}

const DEFAULT_PK = PublicKey.default.toBase58();

export function makeInvokeAccountGetter(
  resolver: { get(i: number): PublicKey | undefined },
  invoke: InvokePair,
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null
): ((i: number) => string) | null {
  const indices = instructionAccountIndices(message, meta, invoke);
  if (!indices) return null;
  return (i: number) => {
    const ai = indices[i];
    if (ai === undefined) return DEFAULT_PK;
    return resolver.get(ai)?.toBase58() ?? DEFAULT_PK;
  };
}

export function getInstructionDataBytes(
  message: Message | MessageV0,
  meta: ConfirmedTransactionMeta | null,
  invoke: InvokePair
): Uint8Array | null {
  const [outerIdx, innerIdx] = invoke;
  if (innerIdx < 0) {
    const ix = message.compiledInstructions[outerIdx];
    if (!ix) return null;
    return decodeIxData(ix.data);
  }
  const g = meta?.innerInstructions?.find((x) => x.index === outerIdx);
  const ix = g?.instructions[innerIdx] as CompiledInstruction | undefined;
  if (!ix) return null;
  return decodeIxData(ix.data);
}
