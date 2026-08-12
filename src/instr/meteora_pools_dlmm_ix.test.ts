import { describe, expect, it } from "vitest";
import {
  eventTypeFilterAllowsInstructionParsing,
  eventTypeFilterIncludeOnly,
} from "../grpc/types.js";
import {
  METEORA_DLMM_PROGRAM_ID,
  METEORA_POOLS_PROGRAM_ID,
} from "./program_ids.js";
import { parseInstructionUnified } from "./mod.js";
import { parseInnerInstructionUnified } from "./inner.js";

const METEORA_POOLS_SWAP_DISC = [248, 198, 158, 145, 225, 117, 135, 200] as const;
const METEORA_DLMM_SWAP_DISC = [248, 198, 158, 145, 225, 117, 135, 200] as const;
const METEORA_DLMM_ADD_LIQUIDITY2_DISC = [228, 162, 78, 28, 70, 219, 116, 115] as const;
const METEORA_DLMM_SWAP2_EVENT_DISC = [46, 116, 82, 215, 148, 27, 84, 77] as const;
const EVENT_CPI_PREFIX = [228, 69, 165, 46, 81, 203, 154, 29] as const;

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

describe("Meteora Pools and DLMM instruction parity", () => {
  it("routes Meteora Pools outer swap through parseInstructionUnified", () => {
    const ev = parseInstructionUnified(
      u64Instruction(METEORA_POOLS_SWAP_DISC, 111n, 222n),
      accounts(2),
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["MeteoraPoolsSwap"]),
      METEORA_POOLS_PROGRAM_ID
    );

    expect(eventTypeFilterAllowsInstructionParsing(["MeteoraPoolsSwap"])).toBe(true);
    expect(ev).toBeTruthy();
    expect("MeteoraPoolsSwap" in ev!).toBe(true);
    const data = ev && "MeteoraPoolsSwap" in ev ? ev.MeteoraPoolsSwap : null;
    expect(data?.in_amount).toBe(111n);
    expect(data?.out_amount).toBe(222n);

    expect(
      parseInstructionUnified(
        u64Instruction(METEORA_POOLS_SWAP_DISC, 111n, 222n),
        accounts(2),
        "sig",
        1,
        0,
        undefined,
        10,
        eventTypeFilterIncludeOnly(["PumpFunTrade"]),
        METEORA_POOLS_PROGRAM_ID
      )
    ).toBeNull();
  });

  it("routes Meteora DLMM outer swap through parseInstructionUnified", () => {
    const ev = parseInstructionUnified(
      u64Instruction(METEORA_DLMM_SWAP_DISC, 333n, 444n),
      accounts(11),
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["MeteoraDlmmSwap"]),
      METEORA_DLMM_PROGRAM_ID
    );

    expect(eventTypeFilterAllowsInstructionParsing(["MeteoraDlmmSwap"])).toBe(true);
    expect(ev).toBeTruthy();
    expect("MeteoraDlmmSwap" in ev!).toBe(true);
    const data = ev && "MeteoraDlmmSwap" in ev ? ev.MeteoraDlmmSwap : null;
    expect(data?.pool).toBe("account_0");
    expect(data?.from).toBe("account_10");
    expect(data?.amount_in).toBe(333n);
  });

  it("uses the add_liquidity2 sender index from the current IDL", () => {
    const ev = parseInstructionUnified(
      u64Instruction(METEORA_DLMM_ADD_LIQUIDITY2_DISC),
      accounts(14),
      "sig",
      1,
      0,
      undefined,
      10,
      undefined,
      METEORA_DLMM_PROGRAM_ID
    );
    expect(ev && "MeteoraDlmmAddLiquidity" in ev ? ev.MeteoraDlmmAddLiquidity.from : null)
      .toBe("account_9");
  });

  it("parses current Anchor event-CPI DLMM Swap2 without rebuilding the payload", () => {
    const ix = new Uint8Array(16 + 147);
    ix.set(EVENT_CPI_PREFIX, 0);
    ix.set(METEORA_DLMM_SWAP2_EVENT_DISC, 8);
    const view = new DataView(ix.buffer);
    ix[16 + 72] = 1;
    view.setBigUint64(16 + 89, 100n, true);
    view.setBigUint64(16 + 105, 90n, true);

    const ev = parseInnerInstructionUnified(
      ix,
      [],
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["MeteoraDlmmSwap"]),
      METEORA_DLMM_PROGRAM_ID
    );
    const swap = ev && "MeteoraDlmmSwap" in ev ? ev.MeteoraDlmmSwap : null;
    expect(swap?.amount_in).toBe(100n);
    expect(swap?.amount_out).toBe(90n);
  });
});
