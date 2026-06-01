import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { PUMPFUN_PROGRAM_ID, RAYDIUM_CLMM_PROGRAM_ID } from "../instr/program_ids.js";
import { eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { parseAccountUnified, parseTokenAccount } from "./mod.js";
import type { AccountData } from "./types.js";

const BONDING_CURVE_DISC = [23, 183, 248, 55, 96, 216, 172, 96];

function pk(seed: number): PublicKey {
  return new PublicKey(Uint8Array.from({ length: 32 }, () => seed));
}

function pushU64(out: number[], value: bigint): void {
  const data = new Uint8Array(8);
  new DataView(data.buffer).setBigUint64(0, value, true);
  out.push(...data);
}

function pushPk(out: number[], key: PublicKey): void {
  out.push(...key.toBytes());
}

function bondingCurveAccountData(creator: PublicKey, quoteMint: PublicKey): Uint8Array {
  const out = [...BONDING_CURVE_DISC];
  pushU64(out, 100n);
  pushU64(out, 4_292_000_000n);
  pushU64(out, 200n);
  pushU64(out, 3_000_000_000n);
  pushU64(out, 1_000n);
  out.push(1);
  pushPk(out, creator);
  out.push(1);
  out.push(0);
  pushPk(out, quoteMint);
  return Uint8Array.from(out);
}

describe("PumpFun account parser", () => {
  it("parses BondingCurve quote fields through the unified account parser", () => {
    const creator = pk(7);
    const quoteMint = pk(8);
    const account: AccountData = {
      pubkey: "bonding_curve",
      executable: false,
      lamports: 0n,
      owner: PUMPFUN_PROGRAM_ID,
      rent_epoch: 0n,
      data: bondingCurveAccountData(creator, quoteMint),
    };

    const ev = parseAccountUnified(
      account,
      { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 0 },
      eventTypeFilterIncludeOnly(["AccountPumpFunBondingCurve"])
    );

    expect(ev).toBeTruthy();
    expect(ev && "PumpFunBondingCurveAccount" in ev).toBe(true);
    const curve = (ev as any).PumpFunBondingCurveAccount.bonding_curve;
    expect(curve.virtual_quote_reserves).toBe(4_292_000_000n);
    expect(curve.real_quote_reserves).toBe(3_000_000_000n);
    expect(curve.creator).toBe(creator.toBase58());
    expect(curve.quote_mint).toBe(quoteMint.toBase58());
    expect(curve.complete).toBe(true);
    expect(curve.is_mayhem_mode).toBe(true);
    expect(curve.is_cashback_coin).toBe(false);
  });

  it("drops account variants that are not requested by include-only filters", () => {
    const account: AccountData = {
      pubkey: "bonding_curve",
      executable: false,
      lamports: 0n,
      owner: PUMPFUN_PROGRAM_ID,
      rent_epoch: 0n,
      data: bondingCurveAccountData(pk(7), pk(8)),
    };

    const ev = parseAccountUnified(
      account,
      { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 0 },
      eventTypeFilterIncludeOnly(["AccountPumpFunGlobal"])
    );

    expect(ev).toBeNull();
  });

  it("filters TokenInfo separately from TokenAccount", () => {
    const tokenProgram = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBase58();
    const data = new Uint8Array(82);
    new DataView(data.buffer).setBigUint64(36, 1_000_000n, true);
    data[44] = 6;
    const account: AccountData = {
      pubkey: "mint",
      executable: false,
      lamports: 0n,
      owner: tokenProgram,
      rent_epoch: 0n,
      data,
    };

    const metadata = { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 0 };
    expect(parseAccountUnified(account, metadata, eventTypeFilterIncludeOnly(["TokenInfo"]))).toMatchObject({
      TokenInfo: { supply: 1_000_000n, decimals: 6 },
    });
    expect(parseAccountUnified(account, metadata, eventTypeFilterIncludeOnly(["TokenAccount"]))).toBeNull();
  });

  it("does not fall through to token parsing for known DEX owners", () => {
    const data = new Uint8Array(82);
    new DataView(data.buffer).setBigUint64(36, 1_000_000n, true);
    data[44] = 6;
    const account: AccountData = {
      pubkey: "not_a_pumpfun_account",
      executable: false,
      lamports: 0n,
      owner: PUMPFUN_PROGRAM_ID,
      rent_epoch: 0n,
      data,
    };

    const metadata = { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 0 };
    expect(parseAccountUnified(account, metadata)).toBeNull();
  });

  it("rejects token-shaped accounts owned by non-token programs", () => {
    const data = new Uint8Array(82);
    new DataView(data.buffer).setBigUint64(36, 1_000_000n, true);
    data[44] = 6;
    const account: AccountData = {
      pubkey: "not_a_token_mint",
      executable: false,
      lamports: 0n,
      owner: RAYDIUM_CLMM_PROGRAM_ID,
      rent_epoch: 0n,
      data,
    };

    const metadata = { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 0 };
    expect(parseTokenAccount(account, metadata)).toBeNull();
  });
});
