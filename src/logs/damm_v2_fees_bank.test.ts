import { it, expect } from 'vitest';
import { MessageV0, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/damm_v2_fees_20261008.json';
import { parseRpcTransaction } from '../rpc_transaction';
const kinds=['MeteoraDammV2ClaimPositionFee'];
for(const c of fixture.cases)it(`DAMM v2 fee claim bank ${c.name}`,()=>{
 const raw:any=c.raw,m=raw.transaction.message;
 // Semantic V1 compiled view; not web3.js V1 wire deserialization.
 const message=new MessageV0({header:m.header,staticAccountKeys:m.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:m.recentBlockhash,compiledInstructions:m.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:[]});
 const parsed=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:[],readonly:[]}}},'simulation');
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 if(raw.meta.err!==null){expect(parsed.events).toEqual([]);if(c.name==='owner_claim_then_failed_delegate')expect((c.bank_validation as any).rolled_back_claim_events).toBeGreaterThan(0);return;}
 const lp=parsed.events.flatMap(e=>{const v=e as any;const kind=kinds.find(k=>v[k]);return kind?[{type:kind,...v[kind]}]:[];});
 expect(lp).toHaveLength(c.expected.length);
 c.expected.forEach((want,i)=>{for(const [key,value] of Object.entries(want))expect(String(lp[i][key])).toEqual(value);});
});

import { parseMeteoraDammLog } from './meteora_damm';
import { parseLogOptimized, parseLogOptimizedWithProgramId } from './optimized_matcher';
import { eventTypeFilterIncludeOnly, eventTypeFilterExclude } from '../grpc/types';
import { METEORA_DAMM_V2_PROGRAM_ID } from '../grpc/program_ids';
it('fee claim log filtering, truncation and exact u64',()=>{
 const c:any=fixture.cases[0];
 const ix=c.raw.meta.innerInstructions.flatMap((g:any)=>g.instructions).find((i:any)=>Buffer.from(bs58.decode(i.data).subarray(8,16)).equals(Buffer.from([198,182,183,52,97,12,49,56])));
 const body=bs58.decode(ix.data).subarray(8);
 const log=(b:Uint8Array)=>`Program data: ${Buffer.from(b).toString('base64')}`;
 for(let n=0;n<body.length;n++)expect(parseMeteoraDammLog(log(body.subarray(0,n)),'simulation',0,0,null,0)).toBeNull();
 const kind='MeteoraDammV2ClaimPositionFee' as const;
 const ev:any=parseLogOptimizedWithProgramId(log(body),'simulation',0,0,null,0,eventTypeFilterIncludeOnly([kind]),false,null,METEORA_DAMM_V2_PROGRAM_ID);
 expect(ev[kind].fee_a_claimed).toBe(209095310084412990n);
 expect(parseLogOptimized(log(body),'simulation',0,0,null,0,eventTypeFilterIncludeOnly([kind]),false,null)).toEqual(ev);
 expect(parseLogOptimizedWithProgramId(log(body),'simulation',0,0,null,0,eventTypeFilterExclude([kind]),false,null,METEORA_DAMM_V2_PROGRAM_ID)).toBeNull();
});
