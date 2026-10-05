/** Native canonical Solana Legacy, V0 and V1 decoder; no Rust runtime. */
import bs58 from "bs58";
export interface WireInstruction {
  programIdIndex: number;
  accounts: number[];
  data: string;
}
export interface WireMessage {
  header: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  };
  accountKeys: string[];
  recentBlockhash: string;
  instructions: WireInstruction[];
  addressTableLookups: {
    accountKey: string;
    writableIndexes: number[];
    readonlyIndexes: number[];
  }[];
  config?: {
    priorityFee?: bigint;
    computeUnitLimit?: number;
    loadedAccountsDataSizeLimit?: number;
    heapSize?: number;
  };
}
export interface DecodedWireTransaction {
  signatures: string[];
  message: WireMessage;
  version: "legacy" | 0 | 1;
}
class Reader {
  pos: number;
  constructor(
    readonly data: Uint8Array,
    offset: number,
  ) {
    this.pos = offset;
  }
  take(n: number): Uint8Array {
    if (!Number.isSafeInteger(n) || n < 0 || this.pos + n > this.data.length)
      throw new Error("Truncated transaction");
    const value = this.data.slice(this.pos, this.pos + n);
    this.pos += n;
    return value;
  }
  uint(n = 1): number {
    const bytes = this.take(n);
    let value = 0;
    for (let i = n - 1; i >= 0; i--) value = value * 256 + bytes[i]!;
    return value;
  }
  u64(): bigint {
    const b = this.take(8);
    let value = 0n;
    for (let i = 7; i >= 0; i--) value = value * 256n + BigInt(b[i]!);
    return value;
  }
  short(): number {
    let value = 0;
    for (let i = 0; i < 3; i++) {
      const b = this.uint();
      if (i === 2 && b > 3) throw new Error("Invalid short-u16");
      value |= (b & 127) << (7 * i);
      if (!(b & 128)) {
        if (i && b === 0) throw new Error("Noncanonical short-u16");
        return value;
      }
    }
    throw new Error("Invalid short-u16");
  }
}
export function decodeWireTransaction(
  data: Uint8Array,
  offset = 0,
  requireComplete = true,
): { transaction: DecodedWireTransaction; length: number } {
  if (!Number.isInteger(offset) || offset < 0 || offset >= data.length)
    throw new Error("Invalid wire offset");
  const r = new Reader(data, offset);
  let version: "legacy" | 0 | 1 = "legacy";
  let signatures: Uint8Array[] = [];
  let header: Uint8Array;
  let keys: Uint8Array[];
  let hash: Uint8Array;
  let instructions: WireInstruction[] = [];
  const lookups: WireMessage["addressTableLookups"] = [];
  let config: WireMessage["config"];
  if (data[offset] === 129) {
    r.take(1);
    version = 1;
    header = r.take(3);
    const mask = r.uint(4);
    hash = r.take(32);
    if (mask & ~31 || ((mask & 3) !== 0 && (mask & 3) !== 3))
      throw new Error("Invalid V1 config mask");
    const count = r.uint(),
      keyCount = r.uint();
    if (count > 64 || keyCount > 64 || header[0]! > 12)
      throw new Error("V1 transaction limit exceeded");
    keys = Array.from({ length: keyCount }, () => r.take(32));
    config = {};
    if (mask & 3) config.priorityFee = r.u64();
    if (mask & 4) config.computeUnitLimit = r.uint(4);
    if (mask & 8) config.loadedAccountsDataSizeLimit = r.uint(4);
    if (mask & 16) config.heapSize = r.uint(4);
    if (
      config.heapSize !== undefined &&
      (config.heapSize < 32768 ||
        config.heapSize > 262144 ||
        config.heapSize % 1024)
    )
      throw new Error("Invalid heap size");
    const headers = Array.from(
      { length: count },
      () => [r.uint(), r.uint(), r.uint(2)] as const,
    );
    instructions = headers.map(([programIdIndex, n, length]) => ({
      programIdIndex,
      accounts: Array.from(r.take(n)),
      data: bs58.encode(r.take(length)),
    }));
    signatures = Array.from({ length: header[0]! }, () => r.take(64));
    if (r.pos - offset > 4096)
      throw new Error("V1 transaction exceeds 4096 bytes");
  } else {
    const sigCount = r.short();
    if (sigCount > 127) throw new Error("Too many signatures");
    signatures = Array.from({ length: sigCount }, () => r.take(64));
    const first = r.uint();
    if (first & 128) {
      if (first !== 128) throw new Error("Unknown transaction version");
      version = 0;
      header = r.take(3);
    } else header = Uint8Array.from([first, ...r.take(2)]);
    const keyCount = r.short();
    if (keyCount > 256) throw new Error("Too many account keys");
    keys = Array.from({ length: keyCount }, () => r.take(32));
    hash = r.take(32);
    const count = r.short();
    for (let i = 0; i < count; i++) {
      const programIdIndex = r.uint();
      const accounts = Array.from(r.take(r.short()));
      const payload = r.take(r.short());
      instructions.push({
        programIdIndex,
        accounts,
        data: bs58.encode(payload),
      });
    }
    if (version === 0) {
      const count = r.short();
      for (let i = 0; i < count; i++) {
        const key = r.take(32);
        const writableIndexes = Array.from(r.take(r.short()));
        const readonlyIndexes = Array.from(r.take(r.short()));
        lookups.push({
          accountKey: bs58.encode(key),
          writableIndexes,
          readonlyIndexes,
        });
      }
    }
    if (signatures.length !== header[0])
      throw new Error("Signature count does not match header");
  }
  if (
    header[0]! > keys.length ||
    header[1]! > header[0]! ||
    header[2]! > keys.length - header[0]!
  )
    throw new Error("Invalid message header");
  if (version === 1) {
    if (header[1]! >= header[0]!)
      throw new Error("V1 requires a writable fee payer");
    if (new Set(keys.map((k) => bs58.encode(k))).size !== keys.length)
      throw new Error("Duplicate V1 accounts");
    for (const ix of instructions)
      if (
        ix.programIdIndex === 0 ||
        ix.programIdIndex >= keys.length ||
        ix.accounts.some((i) => i >= keys.length)
      )
        throw new Error("Invalid V1 instruction index");
  }
  const accountCount = keys.length + lookups.reduce(
    (n, l) => n + l.writableIndexes.length + l.readonlyIndexes.length, 0);
  if (accountCount > 256) throw new Error("Too many resolved account keys");
  for (const ix of instructions)
    if (ix.programIdIndex >= keys.length || ix.accounts.some(i => i >= accountCount))
      throw new Error("Invalid instruction index");
  if (requireComplete && r.pos !== data.length)
    throw new Error("Trailing transaction bytes");
  const message: WireMessage = {
    header: {
      numRequiredSignatures: header[0]!,
      numReadonlySignedAccounts: header[1]!,
      numReadonlyUnsignedAccounts: header[2]!,
    },
    accountKeys: keys.map((k) => bs58.encode(k)),
    recentBlockhash: bs58.encode(hash),
    instructions,
    addressTableLookups: lookups,
  };
  if (config) message.config = config;
  return {
    transaction: {
      signatures: signatures.map((s) => bs58.encode(s)),
      message,
      version,
    },
    length: r.pos - offset,
  };
}
