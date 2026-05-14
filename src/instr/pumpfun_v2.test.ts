import { describe, expect, it } from "vitest";
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { enrichPumpfunSameTxPostMerge } from "../core/pumpfun_fee_enrich.js";
import { parsePumpfunInstruction } from "./pumpfun_ix.js";

const BUY_V2_DISC = [184, 23, 238, 97, 103, 197, 211, 61];

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `account_${i}`);
}

function u64Instruction(disc: number[], first: bigint, second: bigint): Uint8Array {
  const data = new Uint8Array(24);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  view.setBigUint64(8, first, true);
  view.setBigUint64(16, second, true);
  return data;
}

function trade(ev: DexEvent) {
  if ("PumpFunTrade" in ev) return ev.PumpFunTrade;
  if ("PumpFunBuy" in ev) return ev.PumpFunBuy;
  if ("PumpFunSell" in ev) return ev.PumpFunSell;
  if ("PumpFunBuyExactSolIn" in ev) return ev.PumpFunBuyExactSolIn;
  throw new Error("expected PumpFun trade event");
}

describe("PumpFun v2 parity", () => {
  it("parses buy_v2 with Rust account indexes", () => {
    const ev = parsePumpfunInstruction(
      u64Instruction(BUY_V2_DISC, 123n, 456n),
      accounts(27),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    const t = trade(ev!);
    expect(t.ix_name).toBe("buy_v2");
    expect(t.mint).toBe("account_1");
    expect(t.fee_recipient).toBe("account_6");
    expect(t.bonding_curve).toBe("account_10");
    expect(t.associated_bonding_curve).toBe("account_11");
    expect(t.user).toBe("account_13");
    expect(t.token_program).toBe("account_3");
    expect(t.creator_vault).toBe("account_16");
    expect(t.token_amount).toBe(123n);
    expect(t.sol_amount).toBe(456n);
  });

  it("enriches CreateV2 observed fee and trade flags in one pass", () => {
    const events: DexEvent[] = [
      {
        PumpFunCreateV2: {
          metadata: { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 10 },
          name: "n",
          symbol: "s",
          uri: "u",
          mint: "mint",
          bonding_curve: defaultPubkey(),
          user: defaultPubkey(),
          creator: defaultPubkey(),
          timestamp: 0n,
          virtual_token_reserves: 0n,
          virtual_sol_reserves: 0n,
          real_token_reserves: 0n,
          token_total_supply: 0n,
          token_program: defaultPubkey(),
          is_mayhem_mode: true,
          is_cashback_enabled: true,
          mint_authority: defaultPubkey(),
          associated_bonding_curve: defaultPubkey(),
          global: defaultPubkey(),
          system_program: defaultPubkey(),
          associated_token_program: defaultPubkey(),
          mayhem_program_id: defaultPubkey(),
          global_params: defaultPubkey(),
          sol_vault: defaultPubkey(),
          mayhem_state: defaultPubkey(),
          mayhem_token_vault: defaultPubkey(),
          event_authority: defaultPubkey(),
          program: defaultPubkey(),
          observed_fee_recipient: defaultPubkey(),
        },
      },
      {
        PumpFunBuy: {
          metadata: { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 10 },
          mint: "mint",
          sol_amount: 1n,
          token_amount: 2n,
          is_buy: true,
          is_created_buy: false,
          user: defaultPubkey(),
          timestamp: 0n,
          virtual_sol_reserves: 0n,
          virtual_token_reserves: 0n,
          real_sol_reserves: 0n,
          real_token_reserves: 0n,
          fee_recipient: "fee",
          fee_basis_points: 0n,
          fee: 0n,
          creator: defaultPubkey(),
          creator_fee_basis_points: 0n,
          creator_fee: 0n,
          track_volume: false,
          total_unclaimed_tokens: 0n,
          total_claimed_tokens: 0n,
          current_sol_volume: 0n,
          last_update_timestamp: 0n,
          ix_name: "buy_v2",
          mayhem_mode: false,
          cashback_fee_basis_points: 0n,
          cashback: 0n,
          is_cashback_coin: false,
          bonding_curve: defaultPubkey(),
          associated_bonding_curve: defaultPubkey(),
          token_program: defaultPubkey(),
          creator_vault: defaultPubkey(),
        },
      },
    ];

    enrichPumpfunSameTxPostMerge(events);

    expect(events[0]!.PumpFunCreateV2.observed_fee_recipient).toBe("fee");
    const t = trade(events[1]!);
    expect(t.mayhem_mode).toBe(true);
    expect(t.is_cashback_coin).toBe(true);
    expect(t.track_volume).toBe(true);
  });
});
