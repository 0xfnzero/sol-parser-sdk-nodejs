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
});
