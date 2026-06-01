import { describe, expect, it } from "vitest";
import { defaultPubkey } from "../core/dex_event.js";
import { eventTypeFilterIncludeOnly } from "../grpc/types.js";
import { PUMPFUN_PROGRAM_ID, RAYDIUM_CLMM_PROGRAM_ID } from "../instr/program_ids.js";
import { dexEventsFromShredWasmTx, type ShredWasmTx } from "./instruction_parse.js";

const BUY_V2_DISC = [184, 23, 238, 97, 103, 197, 211, 61];
const CLMM_SWAP_DISC = [248, 198, 158, 145, 225, 117, 135, 200];

function u64Instruction(disc: number[], first: bigint, second: bigint): Uint8Array {
  const data = new Uint8Array(24);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  view.setBigUint64(8, first, true);
  view.setBigUint64(16, second, true);
  return data;
}

function clmmSwapInstruction(): Uint8Array {
  const data = new Uint8Array(33);
  data.set(CLMM_SWAP_DISC, 0);
  new DataView(data.buffer).setBigUint64(24, 123n, true);
  data[32] = 1;
  return data;
}

describe("ShredStream instruction parser", () => {
  it("parses PumpFun v2 with static mint and ALT-loaded trailing accounts best-effort", () => {
    const tx: ShredWasmTx = {
      signature: "sig",
      accounts: [PUMPFUN_PROGRAM_ID, "global", "mint"],
      instructions: [
        {
          programIdIndex: 0,
          accounts: Uint8Array.from([1, 2, 99, 100]),
          data: u64Instruction(BUY_V2_DISC, 111n, 222n),
        },
      ],
    };

    const events = dexEventsFromShredWasmTx(tx, 1, 0, 10);
    expect(events).toHaveLength(1);
    expect("PumpFunBuy" in events[0]!).toBe(true);
    const trade = "PumpFunBuy" in events[0]! ? events[0]!.PumpFunBuy : null;
    expect(trade?.mint).toBe("mint");
    expect(trade?.token_amount).toBe(111n);
    expect(trade?.sol_amount).toBe(222n);
  });

  it("applies event type filters on the ShredStream unified path", () => {
    const tx: ShredWasmTx = {
      signature: "sig",
      accounts: [PUMPFUN_PROGRAM_ID, "global", "mint"],
      instructions: [
        {
          programIdIndex: 0,
          accounts: Uint8Array.from([1, 2]),
          data: u64Instruction(BUY_V2_DISC, 111n, 222n),
        },
      ],
    };

    expect(dexEventsFromShredWasmTx(tx, 1, 0, 10, eventTypeFilterIncludeOnly(["PumpFunSell"]))).toHaveLength(0);
    expect(dexEventsFromShredWasmTx(tx, 1, 0, 10, eventTypeFilterIncludeOnly(["PumpFunTrade"]))).toHaveLength(1);
  });

  it("uses default pubkey placeholders for ALT-loaded non-PumpFun accounts", () => {
    const tx: ShredWasmTx = {
      signature: "sig",
      accounts: [RAYDIUM_CLMM_PROGRAM_ID, "pool"],
      instructions: [
        {
          programIdIndex: 0,
          accounts: Uint8Array.from([1, 99]),
          data: clmmSwapInstruction(),
        },
      ],
    };

    const events = dexEventsFromShredWasmTx(tx, 1, 0, 10);
    expect(events).toHaveLength(1);
    expect("RaydiumClmmSwap" in events[0]!).toBe(true);
    const swap = "RaydiumClmmSwap" in events[0]! ? events[0]!.RaydiumClmmSwap : null;
    expect(swap?.pool_state).toBe("pool");
    expect(swap?.sender).toBe(defaultPubkey());
  });

  it("falls back to discriminator parsing when the program id is ALT-loaded", () => {
    const tx: ShredWasmTx = {
      signature: "sig",
      accounts: ["global", "mint"],
      instructions: [
        {
          programIdIndex: 99,
          accounts: Uint8Array.from([0, 1]),
          data: u64Instruction(BUY_V2_DISC, 111n, 222n),
        },
      ],
    };

    const events = dexEventsFromShredWasmTx(tx, 1, 0, 10, eventTypeFilterIncludeOnly(["PumpFunBuy"]));
    expect(events).toHaveLength(1);
    expect("PumpFunBuy" in events[0]!).toBe(true);
    const trade = "PumpFunBuy" in events[0]! ? events[0]!.PumpFunBuy : null;
    expect(trade?.mint).toBe("mint");
  });
});
