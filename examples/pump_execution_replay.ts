/** npx tsx examples/pump_execution_replay.ts [SIGNATURE]; offline by default.
 * Inspect third_program and parse_status in each event. Supplied execution metadata
 * is not available to Shred parsing; one outer wrapper may produce several fills.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Message, MessageV0, PublicKey} from '@solana/web3.js';
import bs58 from 'bs58';
import {dexEventsFromShredWasmTx,dexEventsFromShredWasmTxWithLoadedAddresses} from '../src/shredstream/instruction_parse.js';
import {wireBytesToShredWasmTx} from '../src/shredstream/wire_to_shred_tx.js';
import {eventTypeFilterIncludeOnly} from '../src/grpc/types.js';
import {parseRpcTransaction} from '../src/rpc_transaction.js';

async function main() {
 let cases:any[];
 if(process.argv[2]) {
  const response=await fetch(process.env.SOLANA_RPC_URL??'https://api.mainnet-beta.solana.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTransaction',params:[process.argv[2],{encoding:'json',maxSupportedTransactionVersion:1}]})});
  const body:any=await response.json();
  if(body.error||!body.result)throw Error(JSON.stringify(body.error??'Transaction not found; use a recent signature or archive RPC'));
  const wireResponse=await fetch(process.env.SOLANA_RPC_URL??'https://api.mainnet-beta.solana.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'getTransaction',params:[process.argv[2],{encoding:'base64',maxSupportedTransactionVersion:1}]})});
  const wireBody:any=await wireResponse.json();
  if(wireBody.error||!wireBody.result)throw Error('Wire transaction unavailable');
  cases=[{raw:body.result,wire_rpc:wireBody.result}];
 } else cases=['pump_create_alt_20261026.json','pump_multi_hop_20261025.json','wrapped_pumpfun_reported.json'].flatMap(name=>JSON.parse(readFileSync(resolve(__dirname,'../tests/fixtures',name),'utf8')).cases);
 for(const {raw,wire_rpc} of cases) {
  if(wire_rpc) {
   const tx=wireBytesToShredWasmTx(Buffer.from(wire_rpc.transaction[0],'base64'));
   if(!tx)throw Error('Invalid captured wire');
   const filter=eventTypeFilterIncludeOnly(['PumpFunCreate','PumpFunTrade']),loaded=wire_rpc.meta.loadedAddresses;
   for(const [mode,events] of [
    ['static_keys',dexEventsFromShredWasmTx(tx,raw.slot,888,123456,filter)],
    ['resolved_alt',dexEventsFromShredWasmTxWithLoadedAddresses(tx,loaded.writable,loaded.readonly,raw.slot,888,123456,filter)]
   ])console.log(JSON.stringify({source:'shred',mode,signature:tx.signature,events},(_,v)=>typeof v==='bigint'?v.toString():v));
  }
  // Use decoded instruction fields; web3.js VersionedTransaction does not support v1 wire.
  const msg=raw.transaction.message;
  const message=msg.addressTableLookups?new MessageV0({header:msg.header,staticAccountKeys:msg.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:msg.recentBlockhash,compiledInstructions:msg.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:msg.addressTableLookups.map((a:any)=>({...a,accountKey:new PublicKey(a.accountKey)}))}):new Message(msg);
  for(const [mode,logs] of [['full',raw.meta.logMessages],['no_logs',[]],['truncated_logs',raw.meta.logMessages.slice(0,raw.meta.logMessages.length/2)]]) {
   const result=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,logMessages:logs,loadedAddresses:{writable:raw.meta.loadedAddresses.writable.map((k:string)=>new PublicKey(k)),readonly:raw.meta.loadedAddresses.readonly.map((k:string)=>new PublicKey(k))}}},raw.transaction.signatures[0]);
   if(!result.ok)throw Error(JSON.stringify(result));
   console.log(JSON.stringify({source:'execution_replay',mode,event_count:result.events.length,slot:raw.slot,signature:raw.transaction.signatures[0],events:result.events},(_,v)=>typeof v==='bigint'?v.toString():v));
  }
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
