/**
 * PumpFun 指令解析
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readBorshStrAt, readPubkeyIx, readU64LE } from "./utils.js";
import { readI64LE } from "../util/binary.js";

const Z = defaultPubkey();

const DISC = {
  CREATE: Uint8Array.from([24, 30, 200, 40, 5, 28, 7, 119]),
  CREATE_V2: Uint8Array.from([214, 144, 76, 236, 95, 139, 49, 180]),
  MIGRATE_EVENT_LOG: Uint8Array.from([189, 233, 93, 185, 92, 148, 234, 148]),
};

function discEq(data: Uint8Array, disc: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) if (data[i] !== disc[i]) return false;
  return true;
}

function createNumericDefaults() {
  return {
    timestamp: 0n,
    virtual_token_reserves: 0n,
    virtual_sol_reserves: 0n,
    real_token_reserves: 0n,
    token_total_supply: 0n,
    is_mayhem_mode: false,
    is_cashback_enabled: false,
  };
}

export function parsePumpfunInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const outer = instructionData.subarray(0, 8);
  const data = instructionData.subarray(8);
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (discEq(outer, DISC.CREATE_V2)) {
    if (accounts.length < 16) return null;
    let o = 0;
    const n1 = readBorshStrAt(data, o);
    if (!n1) return null;
    o = n1.next;
    const n2 = readBorshStrAt(data, o);
    if (!n2) return null;
    o = n2.next;
    const n3 = readBorshStrAt(data, o);
    if (!n3) return null;
    o = n3.next;
    const creator =
      o + 32 <= data.length ? readPubkeyIx(data, o) ?? Z : Z;
    const mint = accounts[0]!;
    const ev = {
      metadata: meta,
      name: n1.s,
      symbol: n2.s,
      uri: n3.s,
      mint,
      bonding_curve: accounts[2] ?? Z,
      user: accounts[5] ?? Z,
      creator,
      mint_authority: accounts[1] ?? Z,
      associated_bonding_curve: accounts[3] ?? Z,
      global: accounts[4] ?? Z,
      system_program: accounts[6] ?? Z,
      token_program: accounts[7] ?? Z,
      associated_token_program: accounts[8] ?? Z,
      mayhem_program_id: accounts[9] ?? Z,
      global_params: accounts[10] ?? Z,
      sol_vault: accounts[11] ?? Z,
      mayhem_state: accounts[12] ?? Z,
      mayhem_token_vault: accounts[13] ?? Z,
      event_authority: accounts[14] ?? Z,
      program: accounts[15] ?? Z,
      ...createNumericDefaults(),
    };
    return { PumpFunCreateV2: ev };
  }

  if (discEq(outer, DISC.CREATE)) {
    if (accounts.length < 8) return null;
    let o = 0;
    const n1 = readBorshStrAt(data, o);
    if (!n1) return null;
    o = n1.next;
    const n2 = readBorshStrAt(data, o);
    if (!n2) return null;
    o = n2.next;
    const n3 = readBorshStrAt(data, o);
    if (!n3) return null;
    o = n3.next;
    const creator = o + 32 <= data.length ? readPubkeyIx(data, o) ?? Z : Z;
    const mint = accounts[0]!;
    return {
      PumpFunCreate: {
        metadata: meta,
        name: n1.s,
        symbol: n2.s,
        uri: n3.s,
        mint,
        bonding_curve: accounts[2] ?? Z,
        user: accounts[7] ?? Z,
        creator,
        token_program: Z,
        ...createNumericDefaults(),
      },
    };
  }

  if (instructionData.length >= 16) {
    const cpi = instructionData.subarray(8, 16);
    if (discEq(cpi, DISC.MIGRATE_EVENT_LOG)) {
      const payload = instructionData.subarray(16);
      let o = 0;
      const user = readPubkeyIx(payload, o);
      if (!user) return null;
      o += 32;
      const mint = readPubkeyIx(payload, o);
      if (!mint) return null;
      o += 32;
      const mint_amount = readU64LE(payload, o);
      if (mint_amount === null) return null;
      o += 8;
      const sol_amount = readU64LE(payload, o);
      if (sol_amount === null) return null;
      o += 8;
      const pool_migration_fee = readU64LE(payload, o);
      if (pool_migration_fee === null) return null;
      o += 8;
      const bonding_curve = readPubkeyIx(payload, o);
      if (!bonding_curve) return null;
      o += 32;
      const ts = readI64LE(payload, o);
      if (ts === null) return null;
      o += 8;
      const pool = readPubkeyIx(payload, o);
      if (!pool) return null;
      return {
        PumpFunMigrate: {
          metadata: meta,
          user,
          mint,
          mint_amount,
          sol_amount,
          pool_migration_fee,
          bonding_curve,
          timestamp: BigInt(ts),
          pool,
        },
      };
    }
  }

  return null;
}
