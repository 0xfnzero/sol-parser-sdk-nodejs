import { it, expect } from 'vitest';
import { MessageV0, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/damm_reward_admin_20261009.json';
import { parseRpcTransaction } from '../rpc_transaction';
const kinds=['MeteoraDammV2WithdrawIneligibleReward','MeteoraDammV2WithdrawDeadLiquidityReward','MeteoraDammV2FundReward','MeteoraDammV2InitializeReward','MeteoraDammV2UpdateRewardDuration','MeteoraDammV2UpdateRewardFunder'];
for(const c of fixture.cases)it(`DAMM v2 reward administration bank ${c.name}`,()=>{
 const raw:any=c.raw,m=raw.transaction.message;
 // Semantic V1 compiled view; not web3.js V1 wire deserialization.
 const message=new MessageV0({header:m.header,staticAccountKeys:m.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:m.recentBlockhash,compiledInstructions:m.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:[]});
 const parsed=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:[],readonly:[]}}},'simulation');
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 if(raw.meta.err!==null){expect(parsed.events).toEqual([]);return;}
 const lp=parsed.events.flatMap(e=>{const v=e as any;const kind=kinds.find(k=>v[k]);return kind?[{type:kind,...v[kind]}]:[];});
 expect(lp).toHaveLength(c.expected.length);
 c.expected.forEach((want,i)=>{for(const [key,value] of Object.entries(want))expect(String(lp[i][key])).toEqual(value);});
});

import { parseMeteoraDammLog } from './meteora_damm';
for (const c of fixture.cases) it(`DAMM administration logs and truncation ${c.name}`, () => {
  for (const item of c.logs) {
    const event = parseMeteoraDammLog(item.log, 'simulation', 1, 0, undefined, 0) as any;
    const kind = item.expected.type;
    expect(event?.[kind]).toBeDefined();
    for (const [key, value] of Object.entries(item.expected)) {
      if (key !== 'type') expect(String(event[kind][key])).toEqual(value);
    }
    const wire = Buffer.from(item.bytes);
    for (let end = 0; end < wire.length; end++) {
      expect(parseMeteoraDammLog('Program data: ' + wire.subarray(0, end).toString('base64'), 'simulation', 1, 0, undefined, 0)).toBeNull();
    }
  }
});
