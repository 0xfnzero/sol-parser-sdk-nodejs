import { PublicKey } from "@solana/web3.js";

export function readU8(u8: Uint8Array, o: number): number | null {
  if (o >= u8.length) return null;
  return u8[o]!;
}

export function readU16LE(u8: Uint8Array, o: number): number | null {
  if (o + 2 > u8.length) return null;
  const v = new DataView(u8.buffer, u8.byteOffset + o, 2);
  return v.getUint16(0, true);
}

export function readU32LE(u8: Uint8Array, o: number): number | null {
  if (o + 4 > u8.length) return null;
  const v = new DataView(u8.buffer, u8.byteOffset + o, 4);
  return v.getUint32(0, true);
}

export function readI32LE(u8: Uint8Array, o: number): number | null {
  if (o + 4 > u8.length) return null;
  const v = new DataView(u8.buffer, u8.byteOffset + o, 4);
  return v.getInt32(0, true);
}

export function readU64LE(u8: Uint8Array, o: number): bigint | null {
  if (o + 8 > u8.length) return null;
  const v = new DataView(u8.buffer, u8.byteOffset + o, 8);
  return v.getBigUint64(0, true);
}

export function readI64LE(u8: Uint8Array, o: number): bigint | null {
  if (o + 8 > u8.length) return null;
  const v = new DataView(u8.buffer, u8.byteOffset + o, 8);
  return v.getBigInt64(0, true);
}

export function readU128LE(u8: Uint8Array, o: number): bigint | null {
  const lo = readU64LE(u8, o);
  const hi = readU64LE(u8, o + 8);
  if (lo === null || hi === null) return null;
  return lo | (hi << 64n);
}

export function readBool(u8: Uint8Array, o: number): boolean | null {
  const b = readU8(u8, o);
  if (b === null) return null;
  return b === 1;
}

export function readPubkey(u8: Uint8Array, o: number): string | null {
  if (o + 32 > u8.length) return null;
  return new PublicKey(u8.subarray(o, o + 32)).toBase58();
}

export function readBorshString(u8: Uint8Array, o: number): { s: string; next: number } | null {
  const len = readU32LE(u8, o);
  if (len === null || o + 4 + len > u8.length) return null;
  const bytes = u8.subarray(o + 4, o + 4 + len);
  try {
    return { s: new TextDecoder().decode(bytes), next: o + 4 + len };
  } catch {
    return null;
  }
}

export function readDiscriminatorU64(u8: Uint8Array): bigint | null {
  return readU64LE(u8, 0);
}
