import { describe, it, expect } from "vitest";
import { Message } from "@solana/web3.js";
import bs58 from "bs58";
import fixture from "../../tests/fixtures/pump_upgrade/pump_trade_account_context.json";
import { fillAccountsFromTransactionDataRpc } from "./account_dispatcher_rpc";
import { getAccountKeyResolver, buildProgramInvokesMap, } from "./rpc_invoke_map";
import type { DexEvent } from "./dex_event";
describe("Pump trade log account context", () => {
    for (const c of fixture.cases)
        for (const inner of [false, true]) {
            it(`${c.name} inner=${inner}`, () => {
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
                const body: any = { mint: c.mint, user: c.user, is_buy: c.buy };
                fillAccountsFromTransactionDataRpc({ PumpFunTrade: body } as DexEvent, message, meta, invokes, resolver);
                for (const [field, key] of Object.entries(c.expected))
                    expect(body[field], field).toBe(key);
            });
        }
});
it("rejects ambiguous or unmatched trade contexts", () => {
    for (const c of fixture.cases)
        for (const mode of ["duplicate", "wrong_mint", "wrong_user", "wrong_direction", "truncated", "foreign_instruction"]) {
            const ix = c.instructions[0]!;
            const instruction = { programIdIndex: c.keys.indexOf(fixture.program), accounts: mode === "truncated" ? ix.accounts.slice(0, -1) : ix.accounts, data: bs58.encode(mode === "foreign_instruction" ? Buffer.alloc(24) : Buffer.from(ix.data, "hex")) };
            const message = new Message({ header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 }, accountKeys: c.keys, recentBlockhash: "11111111111111111111111111111111", instructions: mode === "duplicate" ? [instruction, instruction] : [instruction] });
            const resolver = getAccountKeyResolver(message, null), invokes = buildProgramInvokesMap(message, null, resolver);
            const body: any = { mint: mode === "wrong_mint" ? c.keys.at(-2) : c.mint, user: mode === "wrong_user" ? c.keys.at(-2) : c.user, is_buy: mode === "wrong_direction" ? !c.buy : c.buy, associated_user: "" };
            fillAccountsFromTransactionDataRpc({ PumpFunTrade: body } as DexEvent, message, null, invokes, resolver);
            expect(body.associated_user, c.name + mode).toBe("");
        }
});
