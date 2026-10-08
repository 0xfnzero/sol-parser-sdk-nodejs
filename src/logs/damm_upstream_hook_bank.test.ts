import { it, expect } from 'vitest';
import { VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/damm_upstream_hook_20261009.json';
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
