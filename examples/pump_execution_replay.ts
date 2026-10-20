/** npx tsx examples/pump_execution_replay.ts [SIGNATURE]; offline by default. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Message, MessageV0, PublicKey} from '@solana/web3.js';
import bs58 from 'bs58';
import {parseRpcTransaction} from '../src/rpc_transaction.js';

async function main() {
 let cases:any[];
 if(process.argv[2]) {
  const response=await fetch(process.env.SOLANA_RPC_URL??'https://api.mainnet-beta.solana.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTransaction',params:[process.argv[2],{encoding:'json',maxSupportedTransactionVersion:1}]})});
  const body:any=await response.json();
  if(body.error||!body.result)throw Error(JSON.stringify(body.error??'Transaction not found; use a recent signature or archive RPC'));
  cases=[{raw:body.result}];
 } else cases=['pump_execution_20261019.json','wrapped_pumpfun_reported.json'].flatMap(name=>JSON.parse(readFileSync(resolve(__dirname,'../tests/fixtures',name),'utf8')).cases);
 for(const {raw} of cases) {
  // Use decoded instruction fields; web3.js VersionedTransaction does not support v1 wire.
  const msg=raw.transaction.message;
  const message=msg.addressTableLookups?new MessageV0({header:msg.header,staticAccountKeys:msg.accountKeys.map((k:string)=>new PublicKey(k)),recentBlockhash:msg.recentBlockhash,compiledInstructions:msg.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),addressTableLookups:msg.addressTableLookups.map((a:any)=>({...a,accountKey:new PublicKey(a.accountKey)}))}):new Message(msg);
  for(const [mode,logs] of [['full',raw.meta.logMessages],['no_logs',[]],['truncated_logs',raw.meta.logMessages.slice(0,raw.meta.logMessages.length/2)]]) {
   const result=parseRpcTransaction({...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,logMessages:logs,loadedAddresses:{writable:raw.meta.loadedAddresses.writable.map((k:string)=>new PublicKey(k)),readonly:raw.meta.loadedAddresses.readonly.map((k:string)=>new PublicKey(k))}}},raw.transaction.signatures[0]);
   if(!result.ok)throw Error(JSON.stringify(result));
   console.log(JSON.stringify({mode,slot:raw.slot,signature:raw.transaction.signatures[0],events:result.events},(_,v)=>typeof v==='bigint'?v.toString():v));
  }
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
