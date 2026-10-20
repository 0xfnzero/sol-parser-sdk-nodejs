import { expect, it } from "vitest";
import {
  logOuterIndices,
  markTradeExecutionSource,
  unresolvedPumpfunTrade,
} from "./trade_source";
import { makeMetadata } from "./metadata";
import { Message } from "@solana/web3.js";
import bs58 from "bs58";
it("does not shift router identity when top-level logs are truncated", () => {
  expect(
    logOuterIndices(
      ["Program router invoke [1]", "Program data: x"],
      ["router", "router"],
    ),
  ).toEqual([-1, -1]);
  expect(
    logOuterIndices(
      [
        "Program router invoke [1]",
        "Program data: x",
        "Program other invoke [1]",
      ],
      ["router", "other"],
    ),
  ).toEqual([0, 0, 1]);
});
it("preserves exact outer bytes, duplicates and unresolved indices", () => {
  const message = new Message({
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 0,
    },
    accountKeys: ["11111111111111111111111111111111"],
    recentBlockhash: "11111111111111111111111111111111",
    instructions: [
      {
        programIdIndex: 0,
        accounts: [0, 0, 250],
        data: bs58.encode(Uint8Array.of(1, 2, 3)),
      },
    ],
  });
  const event = unresolvedPumpfunTrade(makeMetadata("", 1, 2, undefined, 3), {
    program_id: "old",
    instruction_index: 5,
    accounts: [],
    account_indices: [],
    instruction_data: [],
  });
  markTradeExecutionSource(event, 0, message, { err: null } as any);
  const e = (event as any).PumpFunTrade;
  expect(e.parse_status).toBe("ExecutionConfirmed");
  expect(e.third_program).toMatchObject({
    instruction_index: 0,
    account_indices: [0, 0, 250],
    instruction_data: [1, 2, 3],
    accounts: [
      "11111111111111111111111111111111",
      "11111111111111111111111111111111",
      null,
    ],
  });
});
