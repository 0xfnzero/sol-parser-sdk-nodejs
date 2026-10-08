import { Message } from '@solana/web3.js';
import bs58 from 'bs58';
import { describe, it, expect } from 'vitest';
import fixture from '../tests/fixtures/pump_upgrade/pump_trade_account_context.json';
import swapFixture from '../tests/fixtures/pump_upgrade/account_context.json';
import { parseRpcTransaction } from './rpc_transaction';
describe('nested Pump trade identity', () => {
    for (const mismatch of ['venue', 'user', 'direction', 'none'])
        it(mismatch, () => {
            const c = fixture.cases.find(c => c.name === 'buy_v3')!;
            const sell = fixture.cases.find(c => c.name === 'sell_v3')!;
            const outer = c.instructions[0]!;
            const inner = mismatch === 'direction' ? sell.instructions[0]! : outer;
            const accounts = [...inner.accounts];
            if (mismatch === 'venue')
                accounts[1] = 38;
            if (mismatch === 'user')
                accounts[8] = 38;
            const ix = (i: typeof outer, a: number[]) => ({ programIdIndex: c.keys.indexOf(fixture.program), accounts: a, data: bs58.encode(Buffer.from(i.data, 'hex')) });
            const message = new Message({ header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 }, accountKeys: c.keys, recentBlockhash: '11111111111111111111111111111111', instructions: [ix(outer, outer.accounts)] });
            const result = parseRpcTransaction({ slot: 1, blockTime: 1, transaction: { message, signatures: [] }, meta: { err: null, fee: 0, preBalances: [], postBalances: [], innerInstructions: [{ index: 0, instructions: [ix(inner, accounts)] }], logMessages: [] } } as any, 'synthetic-nested-trade-context');
            expect(result.ok).toBe(true);
            if (!result.ok)
                throw Error(result.error.message);
            expect(result.events).toHaveLength(mismatch === 'none' ? 1 : 2);
            const body = Object.values(result.events[0]!)[0] as any;
            expect(body.mint).toBe(c.mint);
            expect(body.user).toBe(c.user);
            expect(body.is_buy).toBe(true);
        });
});
describe('nested PumpSwap trade identity', () => {
    for (const mismatch of ['venue', 'user', 'direction', 'none'])
        it(mismatch, () => {
            const c = swapFixture.cases[0]!;
            const outer = c.instructions[0]!;
            const accounts = [...outer.accounts];
            if (mismatch === 'venue')
                accounts[0] = accounts[2]!;
            if (mismatch === 'user')
                accounts[1] = accounts[2]!;
            const raw = Buffer.from(outer.data, 'hex');
            if (mismatch === 'direction')
                raw.set([93, 246, 130, 60, 231, 233, 64, 178], 0);
            const ix = (data: Buffer, a: number[]) => ({ programIdIndex: c.keys.indexOf(swapFixture.program), accounts: a, data: bs58.encode(data) });
            const message = new Message({ header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 }, accountKeys: c.keys, recentBlockhash: '11111111111111111111111111111111', instructions: [ix(Buffer.from(outer.data, 'hex'), outer.accounts)] });
            const result = parseRpcTransaction({ slot: 1, blockTime: 1, transaction: { message, signatures: [] }, meta: { err: null, fee: 0, preBalances: [], postBalances: [], innerInstructions: [{ index: 0, instructions: [ix(raw, accounts)] }], logMessages: [] } } as any, 'synthetic-nested-swap-context');
            expect(result.ok).toBe(true);
            if (!result.ok)
                throw Error(result.error.message);
            expect(result.events).toHaveLength(mismatch === 'none' ? 1 : 2);
            const body = Object.values(result.events[0]!)[0] as any;
            expect(body.pool).toBe(c.events[0]!.pool);
            expect(body.user).toBe(c.events[0]!.user);
        });
});
