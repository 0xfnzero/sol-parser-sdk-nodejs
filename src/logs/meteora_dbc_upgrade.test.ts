import {eventTypeFilterIncludeOnly} from "../grpc/types.js";
import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseInnerInstructionUnified} from '../instr/inner.js';
import {dedupeLogInstructionEvents} from '../grpc/log_instr_dedup.js';
import type {DexEvent} from '../core/dex_event.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/dbc_swap2.json',import.meta.url),'utf8'));
const program='dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN';
for(const c of fixture.cases){
 it(`decodes ${c.name} mode ${c.mode} with a DBC-only filter`,()=>{
  const data=Buffer.concat([Buffer.from([228,69,165,46,81,203,154,29]),Buffer.from(c.data,'base64')]);
  const parse=(b:Uint8Array)=>parseInnerInstructionUnified(b,[],'sig',1,0,undefined,0,eventTypeFilterIncludeOnly(['MeteoraDbcSwap']),program);
  const e=(parse(data) as any).MeteoraDbcSwap;
  expect(e.event_version).toBe(2);expect(e.swap_mode).toBe(c.mode);
  expect(e.amount_in).toBe(c.mode===0?100000n:90000n);
  expect(e.actual_input_amount).toBe(e.amount_in-1000n);
  expect(e.minimum_amount_out).toBe(c.mode===2?0n:79000n);
  expect(e.maximum_amount_in).toBe(c.mode===2?100000n:0n);
  expect(e.amount_left).toBe(c.mode===1?10000n:0n);
  expect(e.output_amount).toBe(80000n);expect(e.next_sqrt_price).toBe((1n<<100n)+7n);
  expect(e.quote_reserve_amount).toBe(9007199254740993n);
  expect(e.has_transfer_hook).toBe(c.name==='EvtSwap2WithTransferHook');
  for(let len=0;len<data.length;len++)expect(parse(data.subarray(0,len))).toBeNull();
  const invalid=Buffer.from(data);invalid[16+82]=3;expect(parse(invalid)).toBeNull();
  expect(parseInnerInstructionUnified(data,[],'sig',1,0,undefined,0,eventTypeFilterIncludeOnly(['PumpFunTrade']),program)).toBeNull();
  const old={MeteoraDbcSwap:{...e,event_version:0}} as DexEvent;
  expect(dedupeLogInstructionEvents([], [old,parse(data)!])).toHaveLength(1);
  expect(dedupeLogInstructionEvents([], [old,old,parse(data)!,parse(data)!])).toHaveLength(2);
  expect(dedupeLogInstructionEvents([], [old,old,parse(data)!])).toHaveLength(3);
 });
}

const live=JSON.parse(readFileSync(new URL('../fixtures/dbc_live_simulations_20261008.json',import.meta.url),'utf8'));
for(const c of live.cases)it(`real DBC bank event ${c.name}`,()=>{
 const events:DexEvent[]=[];
 for(const row of c.events){
  const event=parseInnerInstructionUnified(Buffer.from(row.data,'base64'),[],'simulation',c.slot,0,undefined,0,eventTypeFilterIncludeOnly(['MeteoraDbcSwap']),c.program)!;
  expect(event).not.toBeNull();
  const e=(event as any).MeteoraDbcSwap;
  for(const key of ['output_amount','actual_input_amount','swap_mode','event_version','trade_direction','amount_0','amount_1'])expect(String(e[key] ?? 0)).toBe(String(row.expected[key]));
  events.push(event);
 }
 const current=dedupeLogInstructionEvents([],events);
 expect(current).toHaveLength(c.dedup_count);
 if(c.error===null){
  expect(current.length).toBeGreaterThan(0);
  if(current.length===1)expect(String((current[current.length-1] as any).MeteoraDbcSwap.output_amount)).toBe(String(c.bank_output_balances[0]));
 }else expect(current).toHaveLength(0);
});
