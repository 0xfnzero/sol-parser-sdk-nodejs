import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseLogUnified} from './optimized_matcher.js';
const cases=JSON.parse(readFileSync(new URL('../fixtures/damm_v1_live_simulations_20261008.json',import.meta.url),'utf8')).cases;
for(const c of cases)it(`real DAMM v1 execution ${c.name}`,()=>{
 for(let i=0;i<c.logs.length;i++){
  const e=(parseLogUnified(c.logs[i],'simulation',1) as any).MeteoraPoolsSwap;
  expect(e).toBeDefined();
  for(const [k,v]of Object.entries(c.expected[i]))expect(String(e[k])).toBe(String(v));
  expect(e.amount_in??0n).toBe(0n);expect(e.minimum_out_amount??0n).toBe(0n);
 }
 if(c.error===null){
  expect(c.expected.length).toBeGreaterThan(0);
  if(c.expected.length===1)expect(c.expected[0].out_amount).toBe(c.bank_output_balances[0]);
  else{expect(c.expected[0].out_amount-c.sell_source_debits.reduce((a:number,b:number)=>a+b,0)).toBe(c.bank_output_balances[0]);expect(9900000+c.expected[1].out_amount).toBe(c.bank_output_balances[1]);}
 }
});
