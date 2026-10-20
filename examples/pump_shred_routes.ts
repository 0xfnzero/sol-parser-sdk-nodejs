
/** Native signed-wire replay: npx tsx examples/pump_shred_routes.ts. No network. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createPublicKey,verify} from 'node:crypto';
import bs58 from 'bs58';
import {Keypair,PublicKey,TransactionInstruction,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {makeMetadata} from '../src/core/metadata.js';
import {decodeWireTransaction} from '../src/wire_transaction.js';
import {wireBytesToShredWasmTx} from '../src/shredstream/wire_to_shred_tx.js';
import {dexEventsFromShredWasmTx,dexEventsFromShredWasmTxWithLoadedAddresses} from '../src/shredstream/instruction_parse.js';
import {eventTypeFilterIncludeOnly,eventTypeFilterExclude} from '../src/grpc/types.js';
import {parsePumpRoute} from '../src/instr/pump_routes.js';

export function runReplay():number {
 const fixtures=JSON.parse(readFileSync(resolve(__dirname,'fixtures/pump_shred_routes.json'),'utf8'));
 let baseline:unknown;
 for(let pass=0;pass<2;pass++){
  const trace=[];
  for(const f of fixtures){
   const raw=Buffer.from(f.wire,'base64'),{transaction:decoded}=decodeWireTransaction(raw),tx=wireBytesToShredWasmTx(raw)!;
   assert(tx);assert.equal(tx.signature,f.signature);
   const signed=decoded.version===1?raw.subarray(0,raw.length-64*decoded.signatures.length):raw.subarray(1+64*decoded.signatures.length);
   decoded.signatures.forEach((sig,i)=>assert(verify(null,signed,createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),bs58.decode(decoded.message.accountKeys[i]!)]),format:'der',type:'spki'}),bs58.decode(sig))));
   const parse=(filter?:Parameters<typeof dexEventsFromShredWasmTx>[4])=>dexEventsFromShredWasmTxWithLoadedAddresses(tx,f.loaded_writable,f.loaded_readonly,f.slot,888,999,filter);
   if (['RapidBuy','BuyPumpDelta'].includes(f.expected[0].kind)) {
    const events=parse(), keys=[...tx.accounts,...f.loaded_writable,...f.loaded_readonly];
    assert.equal(events.length,f.expected.length);
    for (const event of events) {
     assert('PumpFunTrade' in event); assert.equal(event.PumpFunTrade.parse_status,'Unresolved');
     assert.equal(event.PumpFunTrade.sol_amount,0n);
     const e=event.PumpFunTrade.third_program!; assert(e); const ix=tx.instructions![e.instruction_index]!;
     assert.equal(e.program_id,keys[ix.programIdIndex]);
     assert.deepEqual(e.accounts,Array.from(ix.accounts,i=>keys[i]));
     assert.deepEqual(e.account_indices,Array.from(ix.accounts));
     assert.deepEqual(e.instruction_data,Array.from(ix.data));
     assert(!('is_buy' in e)); assert(!('ix_name' in e));
    }
    const selected = parse(eventTypeFilterIncludeOnly(['PumpFunTrade']));
    assert(selected.length > 0);
    assert(selected.every(e => 'PumpFunTrade' in e && e.PumpFunTrade.third_program));
    assert.equal(parse(eventTypeFilterExclude(['RawInstruction'])).length,events.length);
    trace.push(events); continue;
   }
   const events=parse(eventTypeFilterIncludeOnly(['PumpFunTrade','PumpFunCreate']));
   assert.equal(events.length,f.expected.length);
   assert.equal(dexEventsFromShredWasmTx(tx,0,0,0).length,f.loaded_writable.length+f.loaded_readonly.length?0:events.length);
   const keys=[...tx.accounts,...f.loaded_writable,...f.loaded_readonly];
   events.forEach((event,i)=>{
    assert('PumpRouteIntent' in event);const e=event.PumpRouteIntent,w=f.expected[i];
    assert.equal(e.is_buy,e.kind==='RapidBuy'||e.kind==='BuyPumpDelta'?true:null);
    assert.equal(e.ix_name,e.kind==='RapidBuy'?'buy_exact_quote_in_v2':null);
    const hints=JSON.parse(JSON.stringify({is_buy:e.is_buy,ix_name:e.ix_name}));
    assert.equal(hints.is_buy,e.is_buy);assert.equal(hints.ix_name,e.ix_name);
    assert.equal(e.kind,w.kind);assert.equal(e.user,w.user);assert.equal(e.input_account,w.input);assert.equal(e.output_account,w.output);
    assert.equal(e.amount_in,w.amount_in===null?null:BigInt(w.amount_in));assert.equal(e.min_amount_out,w.min_amount_out===null?null:BigInt(w.min_amount_out));
    assert.equal(e.instruction_index,w.instruction_index);assert.deepEqual(e.hops.map(h=>Object.values(h)),w.hops);
    assert.equal(e.metadata.signature,f.signature);assert.equal(e.metadata.tx_index,888n);assert.equal(e.metadata.grpc_recv_us,999n);
    assert.equal(e.metadata.recent_blockhash,decoded.message.recentBlockhash);
    const ix=tx.instructions![e.instruction_index]!,a=Array.from(ix.accounts,k=>keys[k]!);
    for(const bad of [ix.data.subarray(0,3),Uint8Array.from([...ix.data,1])])assert.equal(parsePumpRoute(e.program,bad,a,e.metadata,0),null);
    assert.equal(parsePumpRoute('11111111111111111111111111111111',ix.data,a,e.metadata,0),null);
    assert.equal(parsePumpRoute(e.program,ix.data,a.slice(0,-1),e.metadata,0),null);
   });
   assert.equal(parse(eventTypeFilterIncludeOnly(['PumpRouteIntent'])).length,events.length);
   for(const filter of [eventTypeFilterExclude(['PumpRouteIntent']),eventTypeFilterIncludeOnly(['PumpFunBuy']),eventTypeFilterIncludeOnly(['PumpFunCreate'])])assert.equal(parse(filter).length,0);
   assert.throws(()=>dexEventsFromShredWasmTxWithLoadedAddresses(tx,[...f.loaded_writable,'11111111111111111111111111111111'],f.loaded_readonly,0,0,0));
   trace.push(events);
  }
  if(baseline)assert.deepEqual(trace,baseline);baseline=trace;
 }
 checkBoundaries(fixtures);
 return fixtures.length;
}
function checkBoundaries(fixtures:any[]){
 const f=JSON.parse(readFileSync(resolve(__dirname,'fixtures/pump_curve_instruction.json'),'utf8')),wallet=Keypair.fromSeed(new Uint8Array(32).fill(117));
 const a=[...f.accounts];a[3]=wallet.publicKey.toBase58();const data=Buffer.from(f.data),metadata=makeMetadata('',0,0,undefined,0);
 for(const amount of [1n,0xffffffffffffffffn]){
  const bytes=Buffer.from(data);bytes.writeBigUInt64LE(amount,8);
  const ix=new TransactionInstruction({programId:new PublicKey(f.program),data:bytes,keys:a.map((key:string,i:number)=>({pubkey:new PublicKey(key),isSigner:i===3,isWritable:true}))});
  const msg=new TransactionMessage({payerKey:wallet.publicKey,recentBlockhash:'11111111111111111111111111111111',instructions:[ix]}).compileToV0Message();
  const tx=new VersionedTransaction(msg);tx.sign([wallet]);const events=dexEventsFromShredWasmTx(wireBytesToShredWasmTx(tx.serialize())!,0,0,0,eventTypeFilterIncludeOnly(['PumpFunTrade']));
  assert.equal(events.length,1);assert('PumpRouteIntent' in events[0]!);assert.equal(events[0].PumpRouteIntent.kind,'MultiHopCurveSwap');assert.equal(events[0].PumpRouteIntent.amount_in,amount);
 }
 const zero=Buffer.from(data);zero.fill(0,8,16);assert.equal(parsePumpRoute(f.program,zero,a,metadata,0),null);
 const fixture=fixtures.find(f=>f.expected[0].kind==='MultiHopSwap'),tx=wireBytesToShredWasmTx(Buffer.from(fixture.wire,'base64'))!,keys=[...tx.accounts,...fixture.loaded_writable,...fixture.loaded_readonly];
 const ix=tx.instructions![fixture.expected[0].instruction_index]!,accounts=Array.from(ix.accounts,i=>keys[i]!),bytes=Buffer.from(ix.data),program=tx.accounts[ix.programIdIndex]!;
 bytes.fill(0,16,24);assert.equal(parsePumpRoute(program,bytes,accounts,metadata,0)!.min_amount_out,0n);
 bytes.fill(0,8,16);assert.equal(parsePumpRoute(program,bytes,accounts,metadata,0),null);
 const bad=[...accounts];bad[7]='11111111111111111111111111111111';assert.equal(parsePumpRoute(program,ix.data,bad,metadata,0),null);
}
if(process.argv[1]?.endsWith('pump_shred_routes.ts'))console.log(`${runReplay()} signed ShredStream transactions verified twice; offline replay, zero RPC.`);
