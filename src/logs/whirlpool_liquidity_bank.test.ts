import { it, expect } from 'vitest';
import { MessageV0, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/whirlpool_liquidity_20261008.json';
import { parseRpcTransaction } from '../rpc_transaction';
const kinds=['OrcaWhirlpoolLiquidityIncreased','OrcaWhirlpoolLiquidityDecreased'];
for(const c of fixture.cases)it(`Whirlpool liquidity bank ${c.name}`,()=>{
 const raw:any=c.raw,m=raw.transaction.message;
 // Semantic V1 compiled view; not web3.js V1 wire deserialization.
 const message=new MessageV0({header:m.header,staticAccountKeys:m.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:m.recentBlockhash,compiledInstructions:m.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:[]});
 const parsed=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:[],readonly:[]}}},'simulation');
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 if(raw.meta.err!==null){expect(parsed.events).toEqual([]);if(c.name==='close_nonempty')expect((c.bank_validation as any).rolled_back_liquidity_events).toBeGreaterThan(0);return;}
 const lp=parsed.events.flatMap(e=>{const v=e as any;const kind=kinds.find(k=>v[k]);return kind?[{type:kind,...v[kind]}]:[];});
 expect(lp).toHaveLength(c.expected.length);
 c.expected.forEach((want,i)=>{for(const [key,value] of Object.entries(want))expect(String(lp[i][key])).toEqual(value);});
});

import { dedupeLogInstructionEvents } from '../grpc/log_instr_dedup';
it('keeps repeated liquidity operations and unpaired logs',()=>{
 const want=fixture.cases.find(c=>c.name==='increase')!.expected[0]!;
 const log:any={OrcaWhirlpoolLiquidityIncreased:{...want,metadata:{}}};
 const ix:any={OrcaWhirlpoolLiquidityIncreased:{...want,metadata:{},token_a_amount:'18446744073709551615',token_b_amount:'18446744073709551615',tick_lower_index:0,tick_upper_index:0}};
 const merged=dedupeLogInstructionEvents([structuredClone(log),structuredClone(log)],[structuredClone(ix),structuredClone(ix)]);
 expect(merged).toEqual([log,log]);
 expect(dedupeLogInstructionEvents([structuredClone(log)],[structuredClone(ix),structuredClone(ix)])).toHaveLength(3);
 ix.OrcaWhirlpoolLiquidityIncreased.position='11111111111111111111111111111111';
 expect(dedupeLogInstructionEvents([structuredClone(log)],[ix])).toHaveLength(2);
});
