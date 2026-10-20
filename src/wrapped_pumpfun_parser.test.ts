import {it, expect} from 'vitest';
import fixture from '../tests/fixtures/wrapped_pumpfun_inputs.json';
import {parseWrappedPumpfunInstruction, type WrappedPumpfunRule} from './wrapped_pumpfun_parser';
import type {RawInstructionEvent} from './core/raw_instruction';
it('restores only verified outer layouts and agrees with real CPI inputs', () => {
 let count=0;
 for(const item of fixture.inputs) {
  const raw=item.raw as unknown as RawInstructionEvent;
  const rule=(fixture.rules as WrappedPumpfunRule[]).find(r=>parseWrappedPumpfunInstruction(raw,r));
  if(!rule) continue;
  const event=parseWrappedPumpfunInstruction(raw,rule)!;
  if(!('PumpFunTrade' in event)) throw new Error('wrong event');
  const t=event.PumpFunTrade;
  expect(item.actual_cpis).toHaveLength(1);
  const actual=item.actual_cpis[0]!;
  expect(t.spendable_quote_in).toBe(Buffer.from(actual.data).readBigUInt64LE(8));
  expect(t.min_tokens_out).toBe(Buffer.from(actual.data).readBigUInt64LE(16));
  expect(t.mint).toBe(actual.accounts[1]); expect(t.user).toBe(actual.accounts[13]);
  expect(t.third_program?.program_id).toBe(raw.program_id);
  expect([t.sol_amount,t.quote_amount,t.token_amount]).toEqual([0n,0n,0n]);
  expect(parseWrappedPumpfunInstruction({...raw,accounts:[null,...raw.accounts.slice(1)]},rule)).toBeNull();
  expect(parseWrappedPumpfunInstruction({...raw,instruction_data:[255,...raw.instruction_data.slice(1)]},rule)).toBeNull();
  count++;
 }
 expect(count).toBe(5);
});
