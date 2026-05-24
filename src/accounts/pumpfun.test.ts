import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { PUMPFUN_PROGRAM_ID } from "../instr/program_ids.js";
import { eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { parseAccountUnified } from "./mod.js";
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
});
