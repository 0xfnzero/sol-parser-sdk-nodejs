import { describe, expect, it } from "vitest";
import { defaultPubkey } from "../core/dex_event.js";
import {
  fillRaydiumLaunchlabPoolCreateAccounts,
  fillRaydiumLaunchlabTradeAccounts,
} from "../core/account_fill_raydium_launchlab.js";
import { parseRaydiumLaunchlabInstruction } from "./raydium_launchlab_ix.js";

const BUY_EXACT_IN_DISC = [250, 234, 13, 123, 213, 156, 19, 236];

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `account_${i}`);
}

function u64Instruction(disc: readonly number[], ...values: bigint[]): Uint8Array {
  const data = new Uint8Array(8 + values.length * 8);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  values.forEach((value, i) => view.setBigUint64(8 + i * 8, value, true));
  return data;
}

describe("Raydium LaunchLab instruction parity", () => {
  it("uses the IDL discriminator and Rust account layout for buy_exact_in", () => {
    const ev = parseRaydiumLaunchlabInstruction(
      u64Instruction(BUY_EXACT_IN_DISC, 111n, 222n),
      accounts(6),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    expect("RaydiumLaunchlabTrade" in ev!).toBe(true);
    const data = ev && "RaydiumLaunchlabTrade" in ev ? ev.RaydiumLaunchlabTrade : null;
    expect(data?.pool_state).toBe("account_4");
    expect(data?.user).toBe("account_0");
    expect(data?.amount_in).toBe(111n);
    expect(data?.amount_out).toBe(222n);
    expect(data?.is_buy).toBe(true);
    expect(data?.exact_in).toBe(true);
  });

  it("fills fallback accounts with the Rust LaunchLab account indexes", () => {
    const zero = defaultPubkey();
    const trade = {
      metadata: { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 10 },
      pool_state: zero,
      user: zero,
      amount_in: 0n,
      amount_out: 0n,
      is_buy: true,
      trade_direction: "Buy" as const,
      exact_in: true,
    };
    fillRaydiumLaunchlabTradeAccounts(trade, (i) => `account_${i}`);
    expect(trade.user).toBe("account_0");
    expect(trade.pool_state).toBe("account_4");

    const poolCreate = {
      metadata: { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 10 },
      base_mint_param: { symbol: "", name: "", uri: "", decimals: 0 },
      pool_state: zero,
      creator: zero,
    };
    fillRaydiumLaunchlabPoolCreateAccounts(poolCreate, (i) => `account_${i}`);
    expect(poolCreate.creator).toBe("account_1");
    expect(poolCreate.pool_state).toBe("account_5");
  });
});
