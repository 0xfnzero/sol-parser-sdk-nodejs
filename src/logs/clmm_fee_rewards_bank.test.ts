import { it, expect } from 'vitest';
import { MessageV0, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/clmm_fee_rewards_20261008.json';
import { parseRpcTransaction } from '../rpc_transaction';
const kinds=['RaydiumClmmIncreaseLiquidity','RaydiumClmmDecreaseLiquidity'];
for(const c of fixture.cases)it(`CLMM fees/rewards bank ${c.name}`,()=>{
 const raw:any=c.raw,m=raw.transaction.message;
 // Semantic V1 compiled view; not web3.js V1 wire deserialization.
 const message=new MessageV0({header:m.header,staticAccountKeys:m.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:m.recentBlockhash,compiledInstructions:m.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:[]});
 const parsed=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:[],readonly:[]}}},'simulation');
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 if(raw.meta.err!==null){expect(parsed.events).toEqual([]);if(c.name.endsWith('close_nonempty'))expect((c.bank_validation as any).rolled_back_liquidity_events).toBeGreaterThan(0);return;}
 const lp=parsed.events.flatMap(e=>{const v=e as any;const kind=kinds.find(k=>v[k]);return kind?[{type:kind,...v[kind]}]:[];});
 expect(lp).toHaveLength(c.expected.length);
 c.expected.forEach((want,i)=>{for(const [key,value] of Object.entries(want))expect((key==='reward_amounts'?lp[i][key].map(String).join(','):String(lp[i][key]))).toEqual(value);});
});
