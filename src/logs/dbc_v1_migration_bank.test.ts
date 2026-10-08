import { it, expect } from 'vitest';
import { VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/dbc_v1_migration_20261008.json';
import { parseRpcTransaction } from '../rpc_transaction';
const kinds=['MeteoraPoolsPoolCreated'];
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

import createFixture from '../fixtures/damm_v1_config2_instruction_20261008.json';
import {parseMeteoraPoolsInstruction} from '../instr/meteora_pools_ix';
import {parseInnerCompiledInstructionIfSupported} from '../instr/inner';
it('actual DAMM config2 instruction without logs validates Option and permission type',()=>{
 const data=Buffer.from(bs58.decode(createFixture.data));
 const invoke=(d:Uint8Array)=>parseMeteoraPoolsInstruction(d,createFixture.accounts,'simulation',0,0,undefined,0);
 const e=invoke(data) as any;expect(e).not.toBeNull();
 for(const [k,v]of Object.entries(createFixture.expected))if(k!=='type')expect(String(e.MeteoraPoolsPoolCreated[k])).toBe(v);
 expect(parseInnerCompiledInstructionIfSupported(data,createFixture.accounts,'simulation',0,0,undefined,0,undefined,'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB')).not.toBeNull();
 expect(invoke(data.subarray(0,24))).toBeNull();const bad=Buffer.from(data);bad[24]=2;expect(invoke(bad)).toBeNull();bad[24]=1;expect(invoke(bad.subarray(0,32))).toBeNull();
 const obsolete=Buffer.concat([Buffer.from([95,180,10,172,84,174,232,40]),Buffer.alloc(49)]);expect(invoke(obsolete)).toBeNull();
});
