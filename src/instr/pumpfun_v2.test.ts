import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { enrichPumpfunSameTxPostMerge } from "../core/pumpfun_fee_enrich.js";
import { parsePumpfunInstruction, PUMPFUN_SOL_QUOTE_MINT } from "./pumpfun_ix.js";

const BUY_DISC = [102, 6, 61, 18, 1, 218, 235, 234];
const SELL_DISC = [51, 230, 133, 164, 1, 127, 131, 173];
const CREATE_V2_DISC = [214, 144, 76, 236, 95, 139, 49, 180];
const BUY_EXACT_SOL_IN_DISC = [56, 252, 116, 8, 158, 223, 205, 95];
const BUY_V2_DISC = [184, 23, 238, 97, 103, 197, 211, 61];
const BUY_EXACT_QUOTE_IN_V2_DISC = [194, 171, 28, 70, 104, 77, 91, 47];
const SELL_V2_DISC = [93, 246, 130, 60, 231, 233, 64, 178];

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

function pubkeyBytes(seed: number): Uint8Array {
  return Uint8Array.from({ length: 32 }, (_, i) => (seed + i) & 0xff);
}

function pubkey(seed: number): string {
  return new PublicKey(pubkeyBytes(seed)).toBase58();
}

function pushString(out: number[], value: string): void {
  const bytes = Array.from(new TextEncoder().encode(value));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  out.push(...len, ...bytes);
}

function createV2Instruction(mayhem: boolean, cashback: boolean): Uint8Array {
  const out = [...CREATE_V2_DISC];
  pushString(out, "name");
  pushString(out, "SYM");
  pushString(out, "uri");
  out.push(...pubkeyBytes(120), mayhem ? 1 : 0, cashback ? 1 : 0);
  return Uint8Array.from(out);
}

function trade(ev: DexEvent) {
  if ("PumpFunTrade" in ev) return ev.PumpFunTrade;
  if ("PumpFunBuy" in ev) return ev.PumpFunBuy;
  if ("PumpFunSell" in ev) return ev.PumpFunSell;
  if ("PumpFunBuyExactSolIn" in ev) return ev.PumpFunBuyExactSolIn;
  throw new Error("expected PumpFun trade event");
}

describe("PumpFun v2 parity", () => {
  it("parses create_v2 official args and account indexes", () => {
    const ev = parsePumpfunInstruction(
      createV2Instruction(true, true),
      accounts(16),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    if (!ev || !("PumpFunCreateV2" in ev)) throw new Error("expected PumpFunCreateV2");
    const create = ev.PumpFunCreateV2;
    expect(create.mint).toBe("account_0");
    expect(create.bonding_curve).toBe("account_2");
    expect(create.user).toBe("account_5");
    expect(create.creator).toBe(pubkey(120));
    expect(create.is_mayhem_mode).toBe(true);
    expect(create.is_cashback_enabled).toBe(true);
    expect(create.quote_mint).toBe(PUMPFUN_SOL_QUOTE_MINT);
  });

  it("parses legacy buy, exact-sol-in buy, and sell instructions", () => {
    const buy = parsePumpfunInstruction(
      u64Instruction(BUY_DISC, 111n, 222n),
      accounts(18),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(buy && "PumpFunBuy" in buy).toBe(true);
    let t = trade(buy!);
    expect(t.ix_name).toBe("buy");
    expect(t.mint).toBe("account_2");
    expect(t.fee_recipient).toBe("account_1");
    expect(t.token_program).toBe("account_8");
    expect(t.creator_vault).toBe("account_9");
    expect(t.bonding_curve_v2).toBe("account_16");
    expect(t.buyback_fee_recipient).toBe("account_17");
    expect(t.quote_mint).toBe(PUMPFUN_SOL_QUOTE_MINT);
    expect(t.amount).toBe(111n);
    expect(t.max_sol_cost).toBe(222n);

    const exact = parsePumpfunInstruction(
      u64Instruction(BUY_EXACT_SOL_IN_DISC, 333n, 444n),
      accounts(16),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(exact && "PumpFunBuyExactSolIn" in exact).toBe(true);
    t = trade(exact!);
    expect(t.ix_name).toBe("buy_exact_sol_in");
    expect(t.spendable_sol_in).toBe(333n);
    expect(t.min_tokens_out).toBe(444n);
    expect(t.amount).toBe(444n);

    const sell = parsePumpfunInstruction(
      u64Instruction(SELL_DISC, 555n, 666n),
      accounts(17),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(sell && "PumpFunSell" in sell).toBe(true);
    t = trade(sell!);
    expect(t.ix_name).toBe("sell");
    expect(t.mint).toBe("account_2");
    expect(t.creator_vault).toBe("account_8");
    expect(t.token_program).toBe("account_9");
    expect(t.user_volume_accumulator).toBe("account_14");
    expect(t.bonding_curve_v2).toBe("account_15");
    expect(t.buyback_fee_recipient).toBe("account_16");
    expect(t.amount).toBe(555n);
    expect(t.min_sol_output).toBe(666n);
  });

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
    expect("PumpFunBuy" in ev!).toBe(true);
    const t = trade(ev!);
    expect(t.ix_name).toBe("buy");
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

  it("parses buy_exact_quote_in_v2 into quote amount fields", () => {
    const ev = parsePumpfunInstruction(
      u64Instruction(BUY_EXACT_QUOTE_IN_V2_DISC, 777n, 888n),
      accounts(27),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    expect("PumpFunBuy" in ev!).toBe(true);
    const t = trade(ev!);
    expect(t.ix_name).toBe("buy_exact_quote_in");
    expect(t.amount).toBe(888n);
    expect(t.max_sol_cost).toBe(0n);
    expect(t.quote_amount).toBe(777n);
    expect(t.spendable_quote_in).toBe(777n);
    expect(t.min_tokens_out).toBe(888n);
    expect(t.quote_mint).toBe("account_2");
  });

  it("parses sell_v2 as PumpFunSell", () => {
    const ev = parsePumpfunInstruction(
      u64Instruction(SELL_V2_DISC, 333n, 444n),
      accounts(26),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    expect("PumpFunSell" in ev!).toBe(true);
    const t = trade(ev!);
    expect(t.ix_name).toBe("sell");
    expect(t.amount).toBe(333n);
    expect(t.min_sol_output).toBe(444n);
    expect(t.max_sol_cost).toBe(0n);
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
          quote_mint: defaultPubkey(),
          virtual_quote_reserves: 0n,
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
          ix_name: "buy",
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

  it("enriches CreateV2 launch reserves from same-tx Create event", () => {
    const events: DexEvent[] = [
      {
        PumpFunCreateV2: {
          metadata: { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 10 },
          name: "ix-name",
          symbol: "",
          uri: "",
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
          is_mayhem_mode: false,
          is_cashback_enabled: false,
          quote_mint: defaultPubkey(),
          virtual_quote_reserves: 0n,
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
        PumpFunCreate: {
          metadata: { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 10 },
          name: "event-name",
          symbol: "EVT",
          uri: "uri",
          mint: "mint",
          bonding_curve: "curve",
          user: "user",
          creator: "creator",
          timestamp: 123n,
          virtual_token_reserves: 1n,
          virtual_sol_reserves: 30_000_000_000n,
          real_token_reserves: 2n,
          token_total_supply: 3n,
          token_program: "token-program",
          is_mayhem_mode: true,
          is_cashback_enabled: true,
          quote_mint: "USDC",
          virtual_quote_reserves: 4_292_000_000n,
        },
      },
    ];

    enrichPumpfunSameTxPostMerge(events);

    const create = events[0]!.PumpFunCreateV2;
    expect(create.name).toBe("ix-name");
    expect(create.quote_mint).toBe("USDC");
    expect(create.virtual_quote_reserves).toBe(4_292_000_000n);
    expect(create.virtual_sol_reserves).toBe(30_000_000_000n);
    expect(create.is_cashback_enabled).toBe(true);
    expect(create.is_mayhem_mode).toBe(true);
  });

  it("enriches create quote mint from same-tx trade when trade has a real quote", () => {
    const events: DexEvent[] = [
      {
        PumpFunCreate: {
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
          is_mayhem_mode: false,
          is_cashback_enabled: false,
          quote_mint: PUMPFUN_SOL_QUOTE_MINT,
          virtual_quote_reserves: 0n,
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
          fee_recipient: defaultPubkey(),
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
          quote_mint: "USDC",
          is_cashback_coin: false,
          bonding_curve: defaultPubkey(),
          associated_bonding_curve: defaultPubkey(),
          token_program: defaultPubkey(),
          creator_vault: defaultPubkey(),
        },
      },
    ];

    enrichPumpfunSameTxPostMerge(events);

    expect(events[0]!.PumpFunCreate.quote_mint).toBe("USDC");
  });
});
