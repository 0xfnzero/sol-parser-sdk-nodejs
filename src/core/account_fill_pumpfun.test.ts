import { describe, expect, it } from "vitest";
import { fillPumpfunTradeAccounts } from "./account_fill_pumpfun.js";
import type { PumpFunTradeEvent } from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

const zero = defaultPubkey();

function accountsWith(overrides: Record<number, string>): (i: number) => string {
  return (i: number) => overrides[i] ?? zero;
}

describe("fillPumpfunTradeAccounts", () => {
  it("uses v2 indexes for short buy_exact_quote_in when account #1 is the mint", () => {
    const trade = {
      ix_name: "buy_exact_quote_in",
      is_buy: true,
      mint: "mint",
      quote_mint: zero,
      token_program: zero,
      fee_recipient: zero,
      bonding_curve: zero,
      associated_bonding_curve: zero,
      user: zero,
      creator_vault: zero,
    } as PumpFunTradeEvent;

    fillPumpfunTradeAccounts(
      trade,
      accountsWith({
        1: "mint",
        2: "usdc",
        3: "token_program_2022",
        6: "fee",
        9: "legacy_creator_vault",
        10: "bonding_curve",
        11: "associated_bonding_curve",
        13: "user",
        16: "creator_vault",
      })
    );

    expect(trade.quote_mint).toBe("usdc");
    expect(trade.token_program).toBe("token_program_2022");
    expect(trade.fee_recipient).toBe("fee");
    expect(trade.bonding_curve).toBe("bonding_curve");
    expect(trade.associated_bonding_curve).toBe("associated_bonding_curve");
    expect(trade.user).toBe("user");
    expect(trade.creator_vault).toBe("creator_vault");
  });

  it("keeps legacy indexes for legacy-shaped short buy_exact_quote_in", () => {
    const trade = {
      ix_name: "buy_exact_quote_in",
      is_buy: true,
      mint: "mint",
      token_program: zero,
      creator_vault: zero,
    } as PumpFunTradeEvent;

    fillPumpfunTradeAccounts(
      trade,
      accountsWith({
        2: "mint",
        8: "spl_token",
        9: "legacy_creator_vault",
      })
    );

    expect(trade.token_program).toBe("spl_token");
    expect(trade.creator_vault).toBe("legacy_creator_vault");
  });
});
