/** Explicit simulation evidence adapter. No RPC or transaction reserialization. */
import bs58 from "bs58";
import { decodeWireTransaction } from "./wire_transaction.js";
import {
  analyzeRpcTransactionRoutes,
  TOKEN,
  TOKEN_2022,
  ZERO,
  type TransactionRoute,
} from "./transaction_route.js";

function unsigned(value: unknown, bits: number): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw Error("Unsafe simulation integer");
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    !/^[0-9]+$/.test(String(value))
  )
    throw Error("Invalid simulation integer");
  const n = BigInt(value);
  if (n < 0n || n >= 1n << BigInt(bits))
    throw Error("Simulation integer outside range");
  return n;
}

/** Original wire plus simulateTransaction response. Parsed SPL transfers and ATA setup.
 * Unsupported parsed CPI fail explicitly; raw/compiled CPI are preserved.
 * V0 requires caller-resolved addresses in result.value.loadedAddresses.
 */
export function analyzeSimulationRoutes(
  wire: Uint8Array,
  response: unknown,
  graduatedPools: readonly string[] = [],
): TransactionRoute {
  const tx = decodeWireTransaction(wire).transaction;
  const root = response as any,
    value = root?.result?.value;
  if (
    root?.error ||
    !value ||
    typeof value !== "object" ||
    !("err" in value) ||
    !("innerInstructions" in value)
  )
    throw Error("Simulation response missing execution metadata");
  if (
    value.innerInstructions !== null &&
    !Array.isArray(value.innerInstructions)
  )
    throw Error("Invalid simulation inner instructions");
  const lookups = tx.message.addressTableLookups;
  const loaded = value.loadedAddresses ?? { writable: [], readonly: [] };
  if (lookups.length && value.loadedAddresses == null)
    throw Error("V0 ALT addresses unavailable; provide loadedAddresses");
  if (!loaded || typeof loaded !== "object" || Array.isArray(loaded))
    throw Error("Invalid simulation loaded addresses");
  for (const side of ["writable", "readonly"] as const) {
    const expected = lookups.reduce((n, lookup) => n + lookup[side === "writable" ? "writableIndexes" : "readonlyIndexes"].length, 0);
    if (!Array.isArray(loaded[side]) || loaded[side].length !== expected)
      throw Error("Simulation loaded address count does not match wire lookups");
    for (const key of loaded[side]) {
      if (typeof key !== "string" || bs58.decode(key).length !== 32)
        throw Error("Invalid simulation loaded public key");
    }
  }
  const keys = [...tx.message.accountKeys, ...loaded.writable, ...loaded.readonly];
  const index = (key: unknown): number => {
    if (typeof key !== "string") throw Error("Missing simulation account key");
    const n = keys.indexOf(key);
    if (n < 0) throw Error("Simulation account absent from transaction");
    return n;
  };
  const validIndex = (n: unknown): number => {
    if (
      typeof n !== "number" ||
      !Number.isInteger(n) ||
      n < 0 ||
      n >= keys.length
    )
      throw Error("Invalid simulation account index");
    return n;
  };
  const seen = new Set<number>();
  const groups = (value.innerInstructions ?? []).map((group: any) => {
    if (
      !group ||
      typeof group !== "object" ||
      !Number.isInteger(group.index) ||
      group.index < 0 ||
      group.index >= tx.message.instructions.length ||
      seen.has(group.index) ||
      !Array.isArray(group.instructions)
    )
      throw Error("Invalid simulation instruction group");
    seen.add(group.index);
    return {
      index: group.index,
      instructions: group.instructions.map((ix: any) => {
        if (!ix || typeof ix !== "object")
          throw Error("Invalid simulation instruction");
        if (
          ix.stackHeight !== undefined &&
          ix.stackHeight !== null &&
          (!Number.isInteger(ix.stackHeight) || ix.stackHeight < 2)
        )
          throw Error("Invalid simulation stack height");
        const stackHeight = ix.stackHeight ?? null;
        if (ix.programIdIndex !== undefined) {
          if (
            ix.parsed !== undefined ||
            typeof ix.data !== "string" ||
            !Array.isArray(ix.accounts)
          )
            throw Error("Invalid compiled simulation instruction");
          bs58.decode(ix.data);
          return {
            programIdIndex: validIndex(ix.programIdIndex),
            accounts: ix.accounts.map(validIndex),
            data: ix.data,
            stackHeight,
          };
        }
        const programIdIndex = index(ix.programId);
        if (ix.parsed === undefined) {
          if (typeof ix.data !== "string" || !Array.isArray(ix.accounts))
            throw Error("Invalid raw simulation instruction");
          bs58.decode(ix.data);
          return {
            programIdIndex,
            accounts: ix.accounts.map(index),
            data: ix.data,
            stackHeight,
          };
        }
        if (
          !ix.parsed ||
          typeof ix.parsed !== "object" ||
          Array.isArray(ix.parsed) ||
          !ix.parsed.info ||
          typeof ix.parsed.info !== "object" ||
          Array.isArray(ix.parsed.info)
        )
          throw Error("Unsupported parsed simulation instruction");
        const setup = simulationAccountSetup(
          ix.programId,
          ix.parsed.type,
          ix.parsed.info,
        );
        if (setup)
          return {
            programIdIndex,
            accounts: setup.accounts.map(index),
            data: bs58.encode(setup.data),
            stackHeight,
          };
        if (ix.programId !== TOKEN && ix.programId !== TOKEN_2022)
          throw Error("Unsupported parsed simulation program");
        const { type, info } = ix.parsed;
        if (
          !info ||
          !["transfer", "transferChecked", "transferCheckedWithFee"].includes(
            type,
          )
        )
          throw Error("Unsupported parsed simulation instruction");
        const authority = info.authority ?? info.multisigAuthority,
          signers = info.signers ?? [];
        if (!Array.isArray(signers)) throw Error("Invalid simulation signers");
        let accounts: unknown[], data: Buffer;
        if (type === "transfer") {
          accounts = [info.source, info.destination, authority, ...signers];
          data = Buffer.alloc(9);
          data[0] = 3;
          data.writeBigUInt64LE(unsigned(info.amount, 64), 1);
        } else {
          const withFee = type === "transferCheckedWithFee";
          if (withFee && ix.programId !== TOKEN_2022)
            throw Error("Transfer fee requires Token-2022");
          if (
            !info.tokenAmount ||
            typeof info.tokenAmount !== "object" ||
            Array.isArray(info.tokenAmount)
          )
            throw Error("Invalid simulation token amount");
          const amount = unsigned(info.tokenAmount?.amount, 64),
            decimals = Number(unsigned(info.tokenAmount?.decimals, 8));
          accounts = [
            info.source,
            info.mint,
            info.destination,
            authority,
            ...signers,
          ];
          data = Buffer.alloc(withFee ? 19 : 10);
          if (withFee) {
            data[0] = 26;
            data[1] = 1;
            data.writeBigUInt64LE(amount, 2);
            data[10] = decimals;
            data.writeBigUInt64LE(unsigned(info.feeAmount, 64), 11);
          } else {
            data[0] = 12;
            data.writeBigUInt64LE(amount, 1);
            data[9] = decimals;
          }
        }
        return {
          programIdIndex,
          accounts: accounts.map(index),
          data: bs58.encode(data),
          stackHeight,
        };
      }),
    };
  });
  return analyzeRpcTransactionRoutes(
    { transaction: tx, meta: { ...value, innerInstructions: groups } },
    graduatedPools,
  );
}

/** Reconstruct only understood setup layouts; extension names are deliberately bounded. */
function simulationAccountSetup(
  program: string,
  type: unknown,
  info: any,
): { accounts: unknown[]; data: Buffer } | null {
  const pubkey = (key: unknown): Buffer => {
    if (typeof key !== "string") throw Error("Invalid simulation public key");
    const bytes = Buffer.from(bs58.decode(key));
    if (bytes.length !== 32) throw Error("Invalid simulation public key");
    return bytes;
  };
  if (program === ZERO && type === "createAccount") {
    const data = Buffer.alloc(52);
    data.writeBigUInt64LE(unsigned(info.lamports, 64), 4);
    data.writeBigUInt64LE(unsigned(info.space, 64), 12);
    pubkey(info.owner).copy(data, 20);
    return { accounts: [info.source, info.newAccount], data };
  }
  if (program === ZERO && (type === "transfer" || type === "allocate")) {
    const data = Buffer.alloc(12);
    data.writeUInt32LE(type === "transfer" ? 2 : 8, 0);
    data.writeBigUInt64LE(unsigned(type === "transfer" ? info.lamports : info.space,64),4);
    return {accounts:type === "transfer" ? [info.source,info.destination] : [info.account],data};
  }
  if (program === ZERO && type === "assign") {
    const data=Buffer.alloc(36);data.writeUInt32LE(1,0);pubkey(info.owner).copy(data,4);
    return {accounts:[info.account],data};
  }
  if (program !== TOKEN && program !== TOKEN_2022) return null;
  if (typeof type === "string" && ["mintTo", "mintToChecked", "burn", "burnChecked"].includes(type)) {
    const minting = type.startsWith("mintTo"), checked = type.endsWith("Checked");
    const authority = minting ? (info.mintAuthority ?? info.multisigMintAuthority) : (info.authority ?? info.multisigAuthority);
    const signers = info.signers === undefined ? [] : info.signers;
    if (!Array.isArray(signers)) throw Error("Invalid simulation signers");
    const amount = checked ? info.tokenAmount : info;
    if (!amount || typeof amount !== "object" || Array.isArray(amount)) throw Error("Invalid simulation token amount");
    const data = Buffer.alloc(checked ? 10 : 9);
    data[0] = checked ? (minting ? 14 : 15) : (minting ? 7 : 8);
    data.writeBigUInt64LE(unsigned(amount.amount, 64), 1);
    if (checked) data[9] = Number(unsigned(amount.decimals, 8));
    return { accounts: [...(minting ? [info.mint, info.account] : [info.account, info.mint]), authority, ...signers], data };
  }
  if (type === "initializeImmutableOwner")
    return { accounts: [info.account], data: Buffer.from([22]) };
  if (type === "initializeAccount3")
    return {
      accounts: [info.account, info.mint],
      data: Buffer.concat([Buffer.from([18]), pubkey(info.owner)]),
    };
  if (type === "getAccountDataSize") {
    if (!Array.isArray(info.extensionTypes))
      throw Error("Invalid simulation extension types");
    const data = Buffer.alloc(1 + info.extensionTypes.length * 2);
    data[0] = 21;
    info.extensionTypes.forEach((extension: unknown, i: number) => {
      if (extension !== "immutableOwner")
        throw Error("Unsupported simulation extension type");
      data.writeUInt16LE(7, 1 + 2 * i);
    });
    return { accounts: [info.mint], data };
  }
  return null;
}
