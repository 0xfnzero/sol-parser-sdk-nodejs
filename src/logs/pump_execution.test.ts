import {it, expect} from 'vitest';
import {PublicKey, Message, MessageV0} from '@solana/web3.js';
import bs58 from 'bs58';
import fresh from '../../tests/fixtures/pump_execution_20261019.json';
import routes from '../fixtures/pump_routes_20261009.json';
import {parseRpcTransaction} from '../rpc_transaction';
import {convertRpcToGrpc} from '../grpc/rpc_to_grpc';
import {parseDexEventsFromGrpcTransactionInfo} from '../grpc/yellowstone_parse';
const fields=['mint','user','pool','is_buy','token_amount','quote_amount','sol_amount','base_amount_in','base_amount_out','quote_amount_in','quote_amount_out'];
const kinds=['PumpFunTrade','PumpFunBuy','PumpFunSell','PumpFunBuyExactSolIn','PumpSwapBuy','PumpSwapSell'];
for(const c of [...fresh.cases,...routes.cases]) it(`execution replay ${c.name}`,()=>{
 const raw=structuredClone(c.raw) as any;
 const msg=raw.transaction.message;
 const message=msg.addressTableLookups ? new MessageV0({header:msg.header,staticAccountKeys:msg.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:msg.recentBlockhash,compiledInstructions:msg.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:msg.addressTableLookups.map((a:any)=>({...a,accountKey:new PublicKey(a.accountKey)}))}) : new Message(msg);
 const parse=()=>{
  const response={...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:raw.meta.loadedAddresses.writable.map((k:string)=>new PublicKey(k)),readonly:raw.meta.loadedAddresses.readonly.map((k:string)=>new PublicKey(k))}}};
  const result=parseRpcTransaction(response,'replay');
  const converted=convertRpcToGrpc(response);
  expect(converted.ok).toBe(true);
  if(converted.ok && result.ok) {
   const grpc=parseDexEventsFromGrpcTransactionInfo({signature:bs58.decode(raw.transaction.signatures[0]),isVote:false,index:0,transactionRaw:converted.transaction,metaRaw:converted.meta} as any, String(raw.slot));
   expect(trades(grpc)).toEqual(trades(result.events));
  }
  expect(result.ok).toBe(true); return result.ok?result.events:[];
 };
 const trades=(events:any[])=>events.flatMap(e=>{const k=kinds.find(k=>e[k]);return k?[fields.map(f=>e[k][f])]:[];});
 const baseline=trades(parse());expect(baseline.length).toBeGreaterThan(0);
 for(const logs of [raw.meta.logMessages.slice(0,raw.meta.logMessages.length/2),[]]){
  raw.meta.logMessages=logs;expect(trades(parse())).toEqual(baseline);
 }
 for(const group of raw.meta.innerInstructions)group.instructions=group.instructions.filter((ix:any)=>!Buffer.from(bs58.decode(ix.data)).subarray(0,8).equals(Buffer.from([228,69,165,46,81,203,154,29])));
 for(const e of parse())for(const k of kinds.filter(k=>k.startsWith('PumpFun'))){const t=(e as any)[k];if(t)expect([t.sol_amount,t.quote_amount,t.token_amount]).toEqual([0n,0n,0n]);}
 raw.meta.err={InstructionError:[0,'InvalidArgument']};expect(parse()).toEqual([]);
});
