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

const METEORA_POOLS_SWAP_DISC = [248, 198, 158, 145, 225, 117, 135, 200] as const;

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

function dlmmSwapInstruction(amountIn: bigint, minOut: bigint): Uint8Array {
  const data = new Uint8Array(1 + 8 + 8);
  data[0] = 11;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, amountIn, true);
  view.setBigUint64(9, minOut, true);
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
      dlmmSwapInstruction(333n, 444n),
      accounts(3),
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
    expect(data?.from).toBe("account_1");
    expect(data?.amount_in).toBe(333n);
  });
});
