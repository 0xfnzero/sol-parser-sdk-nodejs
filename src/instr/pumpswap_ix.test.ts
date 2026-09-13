import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { defaultPubkey } from "../core/dex_event.js";
import { parsePumpswapInstruction } from "./pumpswap_ix.js";

function ix(disc: number[]): Uint8Array {
  const out = new Uint8Array(24);
  out.set(disc, 0);
  return out;
}

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Account${String(i).padStart(2, "0")}`);
}

describe("parsePumpswapInstruction", () => {
  it("does not infer coin_creator from the program account", () => {
    const ev = parsePumpswapInstruction(
      ix([102, 6, 61, 18, 1, 218, 235, 234]),
      accounts(26),
      "sig",
      1,
      0,
      undefined
    );

    expect(ev).not.toBeNull();
    const buy = (ev as any).PumpSwapBuy;
    expect(buy.coin_creator).toBe(defaultPubkey());
    expect(buy.pool_v2).toBe("Account23");
    expect(buy.fee_recipient).toBe("Account24");
    expect(buy.fee_recipient_quote_token_account).toBe("Account25");
  });

  it("parses current create_pool args and official account indexes", () => {
    const data = new Uint8Array(70);
    data.set([233, 146, 209, 142, 207, 104, 64, 188]);
    const view = new DataView(data.buffer);
    view.setUint16(8, 7, true);
    view.setBigUint64(10, 100n, true);
    view.setBigUint64(18, 200n, true);
    const coinCreator = Uint8Array.from({ length: 32 }, (_, i) => i);
    data.set(coinCreator, 26);
    data[58] = 1;
    data[59] = 1;
    view.setBigUint64(60, 250n, true);
    data[68] = 1;
    data[69] = 1;

    const ev = parsePumpswapInstruction(data, accounts(18), "sig", 1, 0, undefined);
    expect(ev && "PumpSwapCreatePool" in ev).toBe(true);
    const create = (ev as any).PumpSwapCreatePool;
    expect(create.index).toBe(7);
    expect(create.base_amount_in).toBe(100n);
    expect(create.quote_amount_in).toBe(200n);
    expect(create.pool).toBe("Account00");
    expect(create.creator).toBe("Account02");
    expect(create.base_mint).toBe("Account03");
    expect(create.quote_mint).toBe("Account04");
    expect(create.coin_creator).toBe(new PublicKey(coinCreator).toBase58());
    expect(create.creator_fee_bps).toBe(250n);
    expect(create.can_edit_creator_fee).toBe(true);
    expect(create.is_holder_reward).toBe(true);
  });
});
