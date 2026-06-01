import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
} from "../instr/program_ids.js";
import { eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { parseAccountUnified } from "./mod.js";
import type { AccountData } from "./types.js";

const CLMM_AMM_CONFIG_DISC = [218, 244, 33, 104, 203, 203, 43, 111];
const CPMM_POOL_STATE_DISC = [247, 237, 227, 245, 215, 195, 222, 70];
const ORCA_FEE_TIER_DISC = [56, 75, 159, 76, 142, 68, 190, 105];

const metadata = { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 0 };

function pk(seed: number): PublicKey {
  return new PublicKey(Uint8Array.from({ length: 32 }, () => seed));
}

function pushPk(out: number[], key: PublicKey): void {
  out.push(...key.toBytes());
}

function pushU16(out: number[], value: number): void {
  const data = new Uint8Array(2);
  new DataView(data.buffer).setUint16(0, value, true);
  out.push(...data);
}

function pushU32(out: number[], value: number): void {
  const data = new Uint8Array(4);
  new DataView(data.buffer).setUint32(0, value, true);
  out.push(...data);
}

function pushU64(out: number[], value: bigint): void {
  const data = new Uint8Array(8);
  new DataView(data.buffer).setBigUint64(0, value, true);
  out.push(...data);
}

function account(owner: string, data: Uint8Array): AccountData {
  return {
    pubkey: "account",
    executable: false,
    lamports: 1n,
    owner,
    rent_epoch: 0n,
    data,
  };
}

function clmmAmmConfigData(): Uint8Array {
  const out = [...CLMM_AMM_CONFIG_DISC];
  out.push(9);
  pushU16(out, 7);
  pushPk(out, pk(1));
  pushU32(out, 111);
  pushU32(out, 222);
  pushU16(out, 64);
  pushU32(out, 333);
  pushU32(out, 444);
  pushPk(out, pk(2));
  for (const value of [1n, 2n, 3n]) pushU64(out, value);
  return Uint8Array.from(out);
}

function cpmmPoolStateData(): Uint8Array {
  const out = [...CPMM_POOL_STATE_DISC];
  for (let seed = 1; seed <= 10; seed++) pushPk(out, pk(seed));
  for (const byte of [11, 1, 9, 6, 6]) out.push(byte);
  for (const value of [100n, 1n, 2n, 3n, 4n, 123456n, 99n]) pushU64(out, value);
  out.push(2);
  out.push(1);
  out.push(0, 0, 0, 0, 0, 0);
  pushU64(out, 5n);
  pushU64(out, 6n);
  for (let value = 0n; value < 28n; value++) pushU64(out, value);
  return Uint8Array.from(out);
}

function orcaFeeTierData(): Uint8Array {
  const out = [...ORCA_FEE_TIER_DISC];
  pushPk(out, pk(9));
  pushU16(out, 128);
  pushU16(out, 500);
  return Uint8Array.from(out);
}

describe("Raydium/Orca account parser", () => {
  it("parses Raydium CLMM AMM config through the unified account parser", () => {
    const ev = parseAccountUnified(
      account(RAYDIUM_CLMM_PROGRAM_ID, clmmAmmConfigData()),
      metadata,
      eventTypeFilterIncludeOnly(["AccountRaydiumClmmAmmConfig"])
    );

    expect(ev && "RaydiumClmmAmmConfigAccount" in ev).toBe(true);
    const data = ev && "RaydiumClmmAmmConfigAccount" in ev ? ev.RaydiumClmmAmmConfigAccount.amm_config : null;
    expect(data?.owner).toBe(pk(1).toBase58());
    expect(data?.tick_spacing).toBe(64);
    expect(data?.padding).toEqual([1n, 2n, 3n]);
  });

  it("keeps Raydium CPMM shared discriminators scoped by program owner and filter", () => {
    const ev = parseAccountUnified(
      account(RAYDIUM_CPMM_PROGRAM_ID, cpmmPoolStateData()),
      metadata,
      eventTypeFilterIncludeOnly(["AccountRaydiumCpmmPoolState"])
    );
    expect(ev && "RaydiumCpmmPoolStateAccount" in ev).toBe(true);
    const data = ev && "RaydiumCpmmPoolStateAccount" in ev ? ev.RaydiumCpmmPoolStateAccount.pool_state : null;
    expect(data?.auth_bump).toBe(11);
    expect(data?.lp_supply).toBe(100n);
    expect(data?.enable_creator_fee).toBe(true);

    expect(
      parseAccountUnified(
        account(RAYDIUM_CPMM_PROGRAM_ID, cpmmPoolStateData()),
        metadata,
        eventTypeFilterIncludeOnly(["AccountRaydiumClmmPoolState"])
      )
    ).toBeNull();
  });

  it("parses Orca Whirlpool fee tier accounts", () => {
    const ev = parseAccountUnified(
      account(ORCA_WHIRLPOOL_PROGRAM_ID, orcaFeeTierData()),
      metadata,
      eventTypeFilterIncludeOnly(["AccountOrcaFeeTier"])
    );

    expect(ev && "OrcaFeeTierAccount" in ev).toBe(true);
    const data = ev && "OrcaFeeTierAccount" in ev ? ev.OrcaFeeTierAccount.fee_tier : null;
    expect(data?.whirlpools_config).toBe(pk(9).toBase58());
    expect(data?.tick_spacing).toBe(128);
    expect(data?.default_fee_rate).toBe(500);
  });
});
