import { describe, expect, it } from "vitest";
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { dedupeLogInstructionEvents } from "./log_instr_dedup.js";

describe("dedupeLogInstructionEvents", () => {
  it("keeps log trade values and fills instruction account fields", () => {
    const logEvent = {
      PumpFunTrade: {
        metadata: {},
        mint: "Mint111111111111111111111111111111111111",
        user: "User111111111111111111111111111111111111",
        is_buy: true,
        sol_amount: 50n,
        token_amount: 10n,
        fee_recipient: defaultPubkey(),
        creator: defaultPubkey(),
        bonding_curve: defaultPubkey(),
        associated_bonding_curve: defaultPubkey(),
        token_program: defaultPubkey(),
        creator_vault: defaultPubkey(),
        ix_name: "",
        is_created_buy: false,
      },
    } as unknown as DexEvent;
    const ixEvent = {
      PumpFunBuy: {
        metadata: {},
        mint: "Mint111111111111111111111111111111111111",
        user: "User111111111111111111111111111111111111",
        is_buy: true,
        sol_amount: 999n,
        token_amount: 999n,
        fee_recipient: "Fee1111111111111111111111111111111111111",
        creator: "Creator1111111111111111111111111111111111",
        bonding_curve: "Curve11111111111111111111111111111111111",
        associated_bonding_curve: "Assoc11111111111111111111111111111111111",
        token_program: "Token11111111111111111111111111111111111",
        creator_vault: "Vault11111111111111111111111111111111111",
        ix_name: "buy",
        is_created_buy: true,
      },
    } as unknown as DexEvent;

    const out = dedupeLogInstructionEvents([logEvent], [ixEvent]);

    expect(out).toHaveLength(1);
    const trade = (out[0] as any).PumpFunTrade;
    expect(trade.sol_amount).toBe(50n);
    expect(trade.fee_recipient).toBe("Fee1111111111111111111111111111111111111");
    expect(trade.bonding_curve).toBe("Curve11111111111111111111111111111111111");
    expect(trade.is_created_buy).toBe(true);
  });

  it("keeps v2 buy lanes distinct when occurrence order differs", () => {
    const base = {
      metadata: {},
      mint: "Mint222222222222222222222222222222222222",
      user: "User222222222222222222222222222222222222",
      is_buy: true,
      sol_amount: 1n,
      token_amount: 1n,
      bonding_curve: defaultPubkey(),
    };
    const buyLog = { PumpFunTrade: { ...base, ix_name: "buy_v2" } } as unknown as DexEvent;
    const exactLog = {
      PumpFunTrade: { ...base, ix_name: "buy_exact_quote_in_v2" },
    } as unknown as DexEvent;
    const exactIx = {
      PumpFunBuy: {
        ...base,
        ix_name: "buy_exact_quote_in_v2",
        bonding_curve: "ExactCurve2222222222222222222222222222222",
      },
    } as unknown as DexEvent;
    const buyIx = {
      PumpFunBuy: {
        ...base,
        ix_name: "buy_v2",
        bonding_curve: "BuyCurve22222222222222222222222222222222",
      },
    } as unknown as DexEvent;

    const out = dedupeLogInstructionEvents([buyLog, exactLog], [exactIx, buyIx]);

    expect(out).toHaveLength(2);
    expect((out[0] as any).PumpFunTrade.bonding_curve).toBe(
      "BuyCurve22222222222222222222222222222222"
    );
    expect((out[1] as any).PumpFunTrade.bonding_curve).toBe(
      "ExactCurve2222222222222222222222222222222"
    );
  });

  it("dedupes PumpFun Create and CreateV2 by mint like Rust", () => {
    const logEvent = {
      PumpFunCreate: {
        metadata: {},
        mint: "Mint333333333333333333333333333333333333",
        name: "Log Name",
        symbol: "LOG",
        uri: "https://log.example/token.json",
        bonding_curve: defaultPubkey(),
        user: defaultPubkey(),
        creator: defaultPubkey(),
        token_program: defaultPubkey(),
        quote_mint: defaultPubkey(),
        quote_vault: defaultPubkey(),
        quote_token_program: defaultPubkey(),
        virtual_quote_reserves: 0n,
      },
    } as unknown as DexEvent;
    const ixEvent = {
      PumpFunCreateV2: {
        metadata: {},
        mint: "Mint333333333333333333333333333333333333",
        name: "",
        symbol: "",
        uri: "",
        bonding_curve: "Curve333333333333333333333333333333333333",
        user: "User333333333333333333333333333333333333",
        creator: "Creator3333333333333333333333333333333333",
        token_program: "Token33333333333333333333333333333333333",
        quote_mint: "Quote33333333333333333333333333333333333",
        quote_vault: "Vault33333333333333333333333333333333333",
        quote_token_program: "QToken333333333333333333333333333333333",
        timestamp: 456n,
        virtual_token_reserves: 1n,
        virtual_sol_reserves: 2n,
        real_token_reserves: 3n,
        token_total_supply: 4n,
        virtual_quote_reserves: 123n,
        is_mayhem_mode: true,
        is_cashback_enabled: true,
      },
    } as unknown as DexEvent;

    const out = dedupeLogInstructionEvents([logEvent], [ixEvent]);

    expect(out).toHaveLength(1);
    expect("PumpFunCreate" in (out[0] as any)).toBe(true);
    const create = (out[0] as any).PumpFunCreate;
    expect(create.name).toBe("Log Name");
    expect(create.bonding_curve).toBe("Curve333333333333333333333333333333333333");
    expect(create.quote_vault).toBe("Vault33333333333333333333333333333333333");
    expect(create.timestamp).toBe(456n);
    expect(create.token_total_supply).toBe(4n);
    expect(create.virtual_quote_reserves).toBe(123n);
    expect(create.is_mayhem_mode).toBe(true);
    expect(create.is_cashback_enabled).toBe(true);
  });
});
