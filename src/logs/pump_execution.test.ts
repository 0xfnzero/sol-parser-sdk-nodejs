import {it, expect} from 'vitest';
import {PublicKey} from '@solana/web3.js';
import {replayMessage} from "../../examples/support/replay_input.js";
import bs58 from 'bs58';
import fresh from '../../tests/fixtures/pump_execution_20261019.json';
import routes from '../fixtures/pump_routes_20261009.json';
import wrapped from '../../tests/fixtures/wrapped_pumpfun_reported.json';
import {parseRpcTransaction} from '../rpc_transaction';
import {convertRpcToGrpc} from '../grpc/rpc_to_grpc';
import {parseDexEventsFromGrpcTransactionInfo} from '../grpc/yellowstone_parse';
import alt from '../../tests/fixtures/pump_create_alt_20261026.json';
import multi from '../../tests/fixtures/pump_multi_hop_20261025.json';
const fields=['mint','user','pool','is_buy','is_created_buy','ix_name','token_amount','quote_amount','sol_amount','base_amount_in','base_amount_out','quote_amount_in','quote_amount_out'];
const kinds=['PumpFunTrade','PumpFunBuy','PumpFunSell','PumpFunBuyExactSolIn','PumpSwapBuy','PumpSwapSell'];
for(const c of [...fresh.cases,...routes.cases,...wrapped.cases,...alt.cases,...multi.cases]) it(`execution replay ${c.name}`,()=>{
 const raw=structuredClone(c.raw) as any;
 const msg=raw.transaction.message;
 const message=replayMessage(msg,raw.version);
 const parse=()=>{
  const response={...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:raw.meta.loadedAddresses.writable.map((k:string)=>new PublicKey(k)),readonly:raw.meta.loadedAddresses.readonly.map((k:string)=>new PublicKey(k))}}};
  const result=parseRpcTransaction(response,'replay');
  const converted=convertRpcToGrpc(response);
  expect(converted.ok).toBe(true);
  if(converted.ok && result.ok) {
   const grpc=parseDexEventsFromGrpcTransactionInfo({signature:bs58.decode(raw.transaction.signatures[0]),isVote:false,index:0,transactionRaw:converted.transaction,metaRaw:converted.meta} as any, String(raw.slot));
   expect(trades(grpc)).toEqual(trades(result.events));
   for (const event of [...result.events, ...grpc]) {
    const create = "PumpFunCreate" in event ? event.PumpFunCreate : "PumpFunCreateV2" in event ? event.PumpFunCreateV2 : undefined;
    if (create) {
      expect(create.transaction_version).toBe(raw.version === "legacy" ? "legacy" : `v${raw.version}`);
      expect(create.alt_addresses).toEqual(msg.addressTableLookups?.length ? msg.addressTableLookups.map((l:any)=>l.accountKey) : undefined);
    }
   }
  }
  expect(result.ok).toBe(true); return result.ok?result.events:[];
 };
 const trades=(events:any[])=>events.flatMap(e=>{const k=kinds.find(k=>e[k]);return k?[fields.map(f=>e[k][f])]:[];});
 const baseline=trades(parse());expect(baseline.length).toBeGreaterThan(0);
 if(c.name==='official_pool_then_curve_multi_hop') {
  const curve=baseline.find(row=>row[0]==='Aijxkeq5L9iaDYZxfaXUhnHQj4cYeo8um6a3t5vzpump');
  expect(curve?.slice(5,9)).toEqual(['multi_hop_swap',255705136795915n,11728308720756n,0n]);
 }
 for(const logs of [raw.meta.logMessages.slice(0,raw.meta.logMessages.length/2),[]]){
  raw.meta.logMessages=logs;expect(trades(parse())).toEqual(baseline);
 }
 for(const group of raw.meta.innerInstructions)group.instructions=group.instructions.filter((ix:any)=>!Buffer.from(bs58.decode(ix.data)).subarray(0,8).equals(Buffer.from([228,69,165,46,81,203,154,29])));
 for(const e of parse())for(const k of kinds.filter(k=>k.startsWith('PumpFun'))){const t=(e as any)[k];if(t)expect([t.sol_amount,t.quote_amount,t.token_amount]).toEqual([0n,0n,0n]);}
 raw.meta.err={InstructionError:[0,'InvalidArgument']};expect(parse()).toEqual([]);
});

import {dexEventsFromShredWasmTx, dexEventsFromShredWasmTxWithLoadedAddresses} from '../shredstream/instruction_parse';
import {wireBytesToShredWasmTx} from '../shredstream/wire_to_shred_tx';
import {eventTypeFilterIncludeOnly} from '../grpc/types';
const pumpFilter=eventTypeFilterIncludeOnly(['PumpFunCreate','PumpFunTrade']);
for(const [i,c] of alt.cases.entries()) it(`signed ALT create and buy ${c.signature}`,()=>{
 const tx=wireBytesToShredWasmTx(Buffer.from(c.wire_rpc.transaction[0],'base64'))!;
 expect(tx.signature).toBe(c.signature);
 const events=dexEventsFromShredWasmTx(tx,c.wire_rpc.slot,888,123456,pumpFilter);
 const loaded=c.wire_rpc.meta.loadedAddresses;
 const full=dexEventsFromShredWasmTxWithLoadedAddresses(tx,loaded.writable,loaded.readonly,c.wire_rpc.slot,888,123456,pumpFilter);
 expect(events.map(e=>Object.keys(e)[0])).toEqual(['PumpFunCreateV2','PumpFunTrade']);
 expect(full.map(e=>Object.keys(e)[0])).toEqual(['PumpFunCreateV2','PumpFunTrade']);
 const create=(events[0] as any).PumpFunCreateV2, trade=(events[1] as any).PumpFunTrade;
 expect(create.ix_name).toBe('create_v2');
 expect(create.transaction_version).toBe(tx.messageVersion);
 expect(create.alt_addresses).toEqual(tx.addressTableLookups?.map(l=>l.accountKey));
 expect(trade.ix_name).toBe(['buy_exact_sol_in','buy_v2','buy_v3'][i]);
 expect(trade.is_created_buy).toBe(true);
 expect(trade.mint).toBe(create.mint);
 for(const e of events) {const meta=Object.values(e)[0].metadata;expect(BigInt(meta.tx_index)).toBe(888n);expect(BigInt(meta.grpc_recv_us)).toBe(123456n);expect(meta.recent_blockhash).toBe(bs58.encode(tx.recentBlockhash!));}
 for(const f of ['mint','name','symbol','uri','creator','user'])expect(create[f]).toEqual((full[0] as any).PumpFunCreateV2[f]);
 const only=dexEventsFromShredWasmTx(tx,1,0,1,eventTypeFilterIncludeOnly(['PumpFunTrade']));
 expect(only).toHaveLength(1);expect((only[0] as any).PumpFunTrade.is_created_buy).toBe(true);
 if(i>0)expect(trade.quote_mint).toBe('11111111111111111111111111111111');
 const invalid=structuredClone(tx);invalid.instructions!.find(ix=>tx.accounts[ix.programIdIndex]==='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')!.accounts[0]=255;
 expect(dexEventsFromShredWasmTx(invalid,1,0,1,pumpFilter).some(e=>'PumpFunCreate' in e)).toBe(false);
});
it('official multi_hop_swap exposes curve provenance and keeps route limits out of hop fills',()=>{
 const c=multi.cases[0]!,tx=wireBytesToShredWasmTx(Buffer.from(c.wire_rpc.transaction[0],'base64'))!;
 const events=dexEventsFromShredWasmTx(tx,c.wire_rpc.slot,888,123456,pumpFilter);
 const trade=events.flatMap(e=>'PumpFunTrade' in e?[e.PumpFunTrade]:[]);
 expect(trade).toHaveLength(1);
 expect(trade[0]).toMatchObject({ix_name:'multi_hop_swap',mint:'Aijxkeq5L9iaDYZxfaXUhnHQj4cYeo8um6a3t5vzpump',quote_mint:'6Vk3fAQWYEot6JbQb8Nx8j5wZeDnMhzk8FajjHhZpump',is_buy:true,is_created_buy:true,sol_amount:0n,token_amount:0n});
 const source=trade[0]!.third_program!;expect(source.program_id).toBe('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA');
 expect(source.instruction_data).toEqual(Array.from(tx.instructions![source.instruction_index]!.data));
 expect(dexEventsFromShredWasmTx(tx,1,0,1,eventTypeFilterIncludeOnly(['PumpFunBuy']))).toEqual([]);
 const bad=structuredClone(tx),ix=bad.instructions![source.instruction_index]!;
 ix.accounts[23]=ix.accounts[0]!;
 expect(dexEventsFromShredWasmTx(bad,1,0,1,pumpFilter).some(e=>'PumpFunTrade' in e)).toBe(false);
});

for (const c of wrapped.cases.filter(c => 'resolved_pump_trade_count' in c)) it(`reported ALT-only Pump program ${c.signature}`, () => {
 const tx=wireBytesToShredWasmTx(Buffer.from(c.wire_rpc.transaction[0],'base64'))!;
 const loaded=c.wire_rpc.meta.loadedAddresses;
 const staticEvents=dexEventsFromShredWasmTx(tx,c.wire_rpc.slot,888,123456,pumpFilter);
 const full=dexEventsFromShredWasmTxWithLoadedAddresses(tx,loaded.writable,loaded.readonly,c.wire_rpc.slot,888,123456,pumpFilter);
 expect(staticEvents.filter(e=>'PumpFunTrade' in e)).toHaveLength(0);
 const candidates=full.flatMap(e=>'PumpFunTrade' in e?[e.PumpFunTrade]:[]);
 expect(candidates).toHaveLength(3);
 expect(candidates.every(t=>t.third_program != null && t.ix_name === '' && t.token_amount === 0n)).toBe(true);
});
