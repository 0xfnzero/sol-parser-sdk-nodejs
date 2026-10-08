import { it, expect } from 'vitest';
import { MessageV0, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import fixture from '../fixtures/pumpswap_liquidity_20261008.json';
import { parseRpcTransaction } from '../rpc_transaction';
for(const c of fixture.cases)it(`PumpSwap liquidity bank ${c.name}`,()=>{
 const raw:any=c.raw,m=raw.transaction.message;
 // Semantic V1 compiled view; not web3.js V1 wire deserialization.
 const message=new MessageV0({header:m.header,staticAccountKeys:m.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:m.recentBlockhash,compiledInstructions:m.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:[]});
 const parsed=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:[],readonly:[]}}},'simulation');
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 if(raw.meta.err!==null){expect(parsed.events).toEqual([]);return;}
 const lp=parsed.events.flatMap(e=>{const v=e as any;return v.PumpSwapLiquidityAdded?[{type:'PumpSwapLiquidityAdded',...v.PumpSwapLiquidityAdded}]:v.PumpSwapLiquidityRemoved?[{type:'PumpSwapLiquidityRemoved',...v.PumpSwapLiquidityRemoved}]:[];});
 expect(lp).toHaveLength(c.expected.length);
 c.expected.forEach((want,i)=>{for(const [key,value] of Object.entries(want))expect(String(lp[i][key])).toEqual(value);});
});

import { parseAddLiquidityFromData,parseRemoveLiquidityFromData } from './pump_amm';
import { parsePumpswapInstruction } from '../instr/pumpswap_ix';
it('rejects all truncated LP event bodies',()=>{
 for(const parser of [parseAddLiquidityFromData,parseRemoveLiquidityFromData])for(let size=0;size<248;size++)expect(parser(new Uint8Array(size),{} as any)).toBeNull();
});
it('uses IDL LP instruction account identities without event enrichment',()=>{
 const keys=Array.from({length:15},(_,i)=>`account_${i}`);
 for(const disc of [[242,35,198,137,82,225,242,182],[183,18,70,156,148,109,161,34]]){
  const data=new Uint8Array(32);data.set(disc);
  const event=parsePumpswapInstruction(data,keys,'simulation',1,0,undefined) as any;
  const body=event.PumpSwapLiquidityAdded??event.PumpSwapLiquidityRemoved;
  expect([body.pool,body.user,body.user_base_token_account,body.user_quote_token_account,body.user_pool_token_account]).toEqual([keys[0],keys[2],keys[6],keys[7],keys[8]]);
  expect(parsePumpswapInstruction(data,keys.slice(0,14),'simulation',1,0,undefined)).toBeNull();
  expect(parsePumpswapInstruction(data.slice(0,31),keys,'simulation',1,0,undefined)).toBeNull();
 }
});
