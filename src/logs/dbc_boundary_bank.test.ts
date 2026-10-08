import { it, expect } from 'vitest';
import { MessageV0, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/dbc_boundary_20261008.json';
import { parseRpcTransaction } from '../rpc_transaction';

for(const c of fixture.cases)it(`DBC boundary bank ${c.name}`,()=>{
 const raw:any=c.raw,m=raw.transaction.message;
 // Semantic compiled view of V1; this is not web3.js V1 deserialization.
 const message=new MessageV0({header:m.header,staticAccountKeys:m.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:m.recentBlockhash,compiledInstructions:m.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:[]});
 const parsed=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:[],readonly:[]}}},'simulation');
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 if(raw.meta.err!==null){expect(parsed.events).toEqual([]);if(c.name.includes('after_curve_completed'))expect(c.rolled_back_curve_complete_payloads).toBeGreaterThan(0);return;}
 const swaps=parsed.events.flatMap(e=>(e as any).MeteoraDbcSwap?[(e as any).MeteoraDbcSwap]:[]);
 const complete=parsed.events.flatMap(e=>(e as any).MeteoraDbcCurveComplete?[(e as any).MeteoraDbcCurveComplete]:[]);
 expect(swaps).toHaveLength(1);expect(complete).toHaveLength(1);
 const e=swaps[0],v=c.validation as any;
 for(const [key,want] of Object.entries(c.expected_swap!))expect(typeof want==='boolean'?e[key]:String(e[key])).toEqual(want);
 expect(e.included_fee_input_amount).toBe(BigInt(v.bank_consumed_quote));
 expect(e.output_amount).toBe(BigInt(v.bank_base_credit));expect(e.referral_fee).toBe(BigInt(v.bank_referral_credit));
 expect(e.amount_left).not.toBe(BigInt(v.bank_unconsumed_quote));
 expect(e.amount_left+BigInt(v.initial_requested_input_fee)-BigInt(v.recalculated_fill_fee)).toBe(BigInt(v.bank_unconsumed_quote));
 expect(complete[0].quote_reserve).toBe(e.quote_reserve_amount);expect(e.quote_reserve_amount>=e.migration_threshold).toBe(true);
});
