import { describe, it, expect } from "vitest";
import { Message } from "@solana/web3.js";
import bs58 from "bs58";
import fixture from "../../tests/fixtures/pump_upgrade/account_context.json";
import boostFixture from "../../tests/fixtures/pump_upgrade/boost_account_context.json";
import { fillAccountsFromTransactionDataRpc } from "./account_dispatcher_rpc";
import {
  getAccountKeyResolver,
  buildProgramInvokesMap,
} from "./rpc_invoke_map";
import type { DexEvent } from "./dex_event";

describe("PumpSwap log account context", () => {
  for (const c of [...fixture.cases, ...boostFixture.cases])
    for (const inner of [false, true]) {
      it(`${c.signature.slice(0, 12)} inner=${inner}`, () => {
        const instructions = c.instructions.map((i) => ({
          programIdIndex: c.keys.indexOf(fixture.program),
          accounts: i.accounts,
          data: bs58.encode(Buffer.from(i.data, "hex")),
        }));
        const message = new Message({
          header: {
            numRequiredSignatures: 1,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 0,
          },
          accountKeys: c.keys,
          recentBlockhash: "11111111111111111111111111111111",
          instructions: inner ? [] : instructions,
        });
        const meta: any = {
          fee: 0,
          preBalances: [],
          postBalances: [],
          err: null,
          innerInstructions: inner ? [{ index: 0, instructions }] : [],
        };
        const resolver = getAccountKeyResolver(message, meta);
        const invokes = buildProgramInvokesMap(message, meta, resolver);
        for (const expected of c.events) {
          const body: any = { pool: expected.pool, user: expected.user };
          const event = (
            expected.buy ? { PumpSwapBuy: body } : { PumpSwapSell: body }
          ) as DexEvent;
          fillAccountsFromTransactionDataRpc(
            event,
            message,
            meta,
            invokes,
            resolver,
          );
          for (const [field, key] of Object.entries(expected.expected))
            expect(body[field], field).toBe(key);
          if (c.signature.startsWith("IDL-")) {
            const preserved = { ...body, base_mint: c.keys[2], pool_base_token_account: c.keys[8], user_base_token_account: c.keys[8], protocol_fee_recipient: c.keys[2] };
            fillAccountsFromTransactionDataRpc({ PumpSwapBuy: preserved } as DexEvent, message, meta, invokes, resolver);
            expect(preserved.base_mint).toBe(c.keys[2]);
            expect(preserved.pool_base_token_account).toBe(c.keys[8]);
            expect(preserved.user_base_token_account).toBe(c.keys[8]);
            expect(preserved.protocol_fee_recipient).toBe(c.keys[2]);
            expect(body.user).toBe(c.keys[7]);
            for (const field of ["user_base_token_account", "user_quote_token_account", "protocol_fee_recipient", "coin_creator_vault_ata", "pool_v2"])
              expect(body[field]).toBeUndefined();
          }
        }
      });
    }
});

it("leaves ambiguous, malformed or unmatched trade context unresolved", () => {
  for (const source of [fixture, boostFixture]) {
    const c = source.cases[0]!,
      expected = c.events[0]!,
      ix = c.instructions[0]!;
    for (const mode of [
      "duplicate",
      "wrong_user",
      "wrong_direction",
      "truncated",
      "foreign_instruction",
    ]) {
      const instruction = {
        programIdIndex: c.keys.indexOf(fixture.program),
        accounts: mode === "truncated" ? ix.accounts.slice(0, -1) : ix.accounts,
        data: bs58.encode(
          mode === "foreign_instruction"
            ? Buffer.alloc(24)
            : Buffer.from(ix.data, "hex"),
        ),
      };
      const message = new Message({
        header: {
          numRequiredSignatures: 1,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 0,
        },
        accountKeys: c.keys,
        recentBlockhash: "11111111111111111111111111111111",
        instructions:
          mode === "duplicate" ? [instruction, instruction] : [instruction],
      });
      const resolver = getAccountKeyResolver(message, null),
        invokes = buildProgramInvokesMap(message, null, resolver);
      const body: any = {
        pool: expected.pool,
        user: mode === "wrong_user" ? c.keys[0] : expected.user,
        user_base_token_account: "",
      };
      const event = (
        mode === "wrong_direction"
          ? { PumpSwapSell: body }
          : { PumpSwapBuy: body }
      ) as DexEvent;
      fillAccountsFromTransactionDataRpc(event, message, null, invokes, resolver);
      expect(body.user_base_token_account, mode).toBe("");
    }
  }
});
