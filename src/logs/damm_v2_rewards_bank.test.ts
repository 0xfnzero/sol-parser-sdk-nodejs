import { it, expect } from 'vitest';
import { VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/damm_v2_rewards_20261008.json';
import { parseRpcTransaction } from '../rpc_transaction';
const kinds=['MeteoraDammV2ClaimReward'];
for(const c of fixture.cases)it(`DAMM v2 fee claim bank ${c.name}`,()=>{
 const raw:any=c.raw,m=raw.transaction.message;
 const message=VersionedTransaction.deserialize(Buffer.from(c.wire_rpc.transaction[0],'base64')).message;
 const parsed=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:[],readonly:[]}}},'simulation');
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 if(raw.meta.err!==null){expect(parsed.events).toEqual([]);return;}
 const lp=parsed.events.flatMap(e=>{const v=e as any;const kind=kinds.find(k=>v[k]);return kind?[{type:kind,...v[kind]}]:[];});
 expect(lp).toHaveLength(c.expected.length);
 c.expected.forEach((want,i)=>{for(const [key,value] of Object.entries(want))expect(String(lp[i][key])).toEqual(value);});
});

import { parseMeteoraDammLog } from './meteora_damm';
import { parseLogOptimized, parseLogOptimizedWithProgramId } from './optimized_matcher';
import { eventTypeFilterIncludeOnly, eventTypeFilterExclude } from '../grpc/types';
import { METEORA_DAMM_V2_PROGRAM_ID } from '../grpc/program_ids';
it('reward claim precision, filtering and all truncated lengths',()=>{
 const body=Buffer.alloc(145);body.set([218,86,147,200,235,188,215,231]);for(let i=0;i<128;i++)body[8+i]=i;
 body[136]=1;body.writeBigUInt64LE((1n<<64n)-1n,137);
 const log=(b:Uint8Array)=>`Program data: ${Buffer.from(b).toString('base64')}`;
 for(let n=0;n<body.length;n++)expect(parseMeteoraDammLog(log(body.subarray(0,n)),'simulation',0,0,null,0)).toBeNull();
 const kind='MeteoraDammV2ClaimReward' as const;
 const ev:any=parseLogOptimizedWithProgramId(log(body),'simulation',0,0,null,0,eventTypeFilterIncludeOnly([kind]),false,null,METEORA_DAMM_V2_PROGRAM_ID);
 expect(ev[kind].total_reward).toBe((1n<<64n)-1n);expect(ev[kind].reward_index).toBe(1);
 expect(parseLogOptimized(log(body),'simulation',0,0,null,0,eventTypeFilterIncludeOnly([kind]),false,null)).toEqual(ev);
 expect(parseLogOptimizedWithProgramId(log(body),'simulation',0,0,null,0,eventTypeFilterExclude([kind]),false,null,METEORA_DAMM_V2_PROGRAM_ID)).toBeNull();
});
