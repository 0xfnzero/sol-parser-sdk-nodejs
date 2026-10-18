/** Native LiteSVM execution. Run: npx tsx examples/pump_offline_bank.ts [config.json]. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import bs58 from 'bs58';
import {Keypair,PublicKey,TransactionInstruction,TransactionMessage,VersionedTransaction,AddressLookupTableAccount,ComputeBudgetProgram} from '@solana/web3.js';
import {LiteSVM,Clock,FailedTransactionMetadata,SimulatedTransactionInfo} from 'litesvm';
// Numeric fieldless error values from the pinned LiteSVM 1.6.0 API.
const SIGNATURE_FAILURE=11, INVALID_ALT_INDEX=25;
import {address,getTransactionDecoder,lamports} from '@solana/kit';
import {wireBytesToShredWasmTx} from '../src/shredstream/wire_to_shred_tx.js';
import {dexEventsFromShredWasmTx,dexEventsFromShredWasmTxWithLoadedAddresses} from '../src/shredstream/instruction_parse.js';
import {parseLog} from '../src/core/unified_parser.js';
import {parseRpcTransaction} from '../src/rpc_transaction.js';

const ROOT=resolve(__dirname,'offline_bank');
const p=(s:string)=>new PublicKey(s),AMM=p('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA'),PUMP=p('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const ATA=p('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),TOKENS=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
const wallet=Keypair.fromSeed(new Uint8Array(32).fill(117));
const ata=(user:PublicKey,owner:PublicKey,mint:PublicKey)=>PublicKey.findProgramAddressSync([user.toBuffer(),owner.toBuffer(),mint.toBuffer()],ATA)[0];
const canonical=(v:unknown)=>JSON.stringify(v,(_,v)=>typeof v==='bigint'?v.toString():v);

function initialize(bundle:any,c:any,alt:boolean){
 const msg=c.raw.transaction.message,keys=msg.accountKeys.map(p),original=msg.instructions.find((i:any)=>keys[i.programIdIndex].equals(AMM));
 const old=keys[original.accounts[0]],mapping=new Map<string,PublicKey>([[old.toBase58(),wallet.publicKey]]);
 for(const program of [AMM,PUMP])mapping.set(PublicKey.findProgramAddressSync([Buffer.from('user_volume_accumulator'),old.toBuffer()],program)[0].toBase58(),PublicKey.findProgramAddressSync([Buffer.from('user_volume_accumulator'),wallet.publicKey.toBuffer()],program)[0]);
 for(const [key,a] of Object.entries<any>(c.accounts)){
  const data=Buffer.from(a.data[0],'base64'),owner=p(a.owner);
  if(TOKENS.includes(a.owner)&&data.length>=165&&data.subarray(32,64).equals(old.toBuffer())){
   const mint=new PublicKey(data.subarray(0,32));if(ata(old,owner,mint).toBase58()===key)mapping.set(key,ata(wallet.publicKey,owner,mint));
  }
 }
 const mapped=(key:PublicKey)=>mapping.get(key.toBase58())??key;
 const bank=new LiteSVM().withSigverify(true).withBlockhashCheck(true);
 bank.setClock(new Clock(...bundle.clock.map(BigInt) as [bigint,bigint,bigint,bigint,bigint]));
 for(const [program,code] of Object.entries<string>(bundle.programs))bank.addProgram(address(program),Buffer.from(code,'base64'));
 const tracked=new Set<string>();
 for(const [key,a] of Object.entries<any>(c.accounts)){
  const source=Buffer.from(a.data[0],'base64'),data=Buffer.from(source);
  for(const [from,to] of mapping){const before=p(from).toBuffer();for(let i=0;i+32<=source.length;i++)if(source.subarray(i,i+32).equals(before))to.toBuffer().copy(data,i);}
  const pubkey=mapped(p(key)).toBase58();tracked.add(pubkey);
  bank.setAccount({address:address(pubkey),lamports:lamports(BigInt(a.lamports)),data,programAddress:address(a.owner),executable:a.executable,space:BigInt(data.length)});
 }
 const airdrop=bank.airdrop(address(wallet.publicKey.toBase58()),lamports(500_000_000_000n));assert(!(airdrop instanceof FailedTransactionMetadata));
 const h=msg.header,ns=h.numRequiredSignatures,rs=h.numReadonlySignedAccounts,ru=h.numReadonlyUnsignedAccounts;
 const metas=keys.map((key:PublicKey,i:number)=>({pubkey:mapped(key),isSigner:i<ns,isWritable:i<ns?i<ns-rs:i<keys.length-ru}));
 const ix=new TransactionInstruction({programId:AMM,data:Buffer.from(bs58.decode(original.data)),keys:original.accounts.map((i:number)=>metas[i])});
 ix.keys.forEach(k=>tracked.add(k.pubkey.toBase58()));tracked.add(wallet.publicKey.toBase58());
 const tables:AddressLookupTableAccount[]=[];
 if(alt){
  const addresses=[...new Set(ix.keys.filter(k=>!k.isSigner).map(k=>k.pubkey.toBase58()))].map(p),key=new PublicKey(new Uint8Array(32).fill(118));
  const header=Buffer.alloc(56);header.writeUInt32LE(1);header.writeBigUInt64LE(0xffffffffffffffffn,4);
  const data=Buffer.concat([header,...addresses.map(k=>k.toBuffer())]);
  bank.setAccount({address:address(key.toBase58()),lamports:lamports(bank.minimumBalanceForRentExemption(BigInt(data.length))),data,programAddress:address('AddressLookupTab1e1111111111111111111111111'),executable:false,space:BigInt(data.length)});
  tables.push(new AddressLookupTableAccount({key,state:{deactivationSlot:0xffffffffffffffffn,lastExtendedSlot:0,lastExtendedSlotStartIndex:0,addresses}}));tracked.add(key.toBase58());
 }
 return {bank,ix,tables,tracked};
}
function execute(bundle:any,c:any,alt:boolean,reject:boolean,oracle:any[]){
 const {bank,ix,tables,tracked}=initialize(bundle,c,alt);
 if(reject)ix.data.fill(255,16,24);
 const msg=new TransactionMessage({payerKey:wallet.publicKey,recentBlockhash:bank.latestBlockhash(),instructions:[ComputeBudgetProgram.setComputeUnitLimit({units:1_400_000}),ix]}).compileToV0Message(tables);
 const tx=new VersionedTransaction(msg);tx.sign([wallet]);msg.staticAccountKeys.forEach(k=>tracked.add(k.toBase58()));
 const state=()=>new Map([...tracked].sort().map(k=>[k,bank.getAccount(address(k))]));
 const before=state(),wire=tx.serialize(),native=getTransactionDecoder().decode(wire),sim=bank.simulateTransaction(native);
 assert.equal(sim instanceof SimulatedTransactionInfo,!reject,`${c.name}: ${sim}`);assert.deepEqual(state(),before,'simulation changed state');
 const meta=sim.meta(),commit=bank.sendTransaction(native),after=state();assert.equal(commit instanceof FailedTransactionMetadata,reject);
 if(reject){
  const err=(sim as FailedTransactionMetadata).err() as {index:number;err:()=>{code:number}};assert.equal(err.index,1);assert.equal(err.err().code,6004);
  for(const [key,a] of before)if(key!==wallet.publicKey.toBase58())assert.deepEqual(after.get(key),a,'parent rollback leaked writes');
  const key=wallet.publicKey.toBase58(),pre=before.get(key)!,post=after.get(key)!;assert(pre.exists&&post.exists);assert.equal(pre.lamports-post.lamports,5000n);
 }else{
  assert([...before].some(([key,a])=>key!==wallet.publicKey.toBase58()&&canonical(a)!==canonical(after.get(key))));
  for(const a of (sim as SimulatedTransactionInfo).postAccounts())if(tracked.has(a.address))assert.deepEqual(after.get(a.address),{...a,exists:true});
 }
 const loaded=(writable:boolean)=>msg.addressTableLookups.flatMap(l=>Array.from(writable?l.writableIndexes:l.readonlyIndexes,i=>tables[0]!.state.addresses[i]!.toBase58()));
 const w=loaded(true),r=loaded(false),decoded=wireBytesToShredWasmTx(wire)!;
 const events=dexEventsFromShredWasmTxWithLoadedAddresses(decoded,w,r,bundle.clock[0],0,0);
 assert.equal(events.length,1);assert('PumpRouteIntent' in events[0]!);const intent=events[0].PumpRouteIntent;
 assert.equal(intent.kind,'MultiHopSwap');assert.equal(intent.hops.length,2);assert.equal(intent.instruction_index,1);
 assert.equal(intent.user,wallet.publicKey.toBase58());assert.equal(intent.input_account,ix.keys[1]!.pubkey.toBase58());assert.equal(intent.output_account,ix.keys[2]!.pubkey.toBase58());
 assert.equal(intent.amount_in,ix.data.readBigUInt64LE(8));assert.equal(intent.min_amount_out,ix.data.readBigUInt64LE(16));
 assert.equal(dexEventsFromShredWasmTx(decoded,0,0,0).length,alt?0:1);
 const fills=meta.logs().map(line=>parseLog(line,decoded.signature,0,0,undefined,0,undefined,false)).filter((e:any)=>e&&['PumpFunTrade','PumpSwapBuy','PumpSwapSell'].some(k=>k in e));
 assert.equal(fills.length,oracle.length);
 fills.forEach((event:any,i)=>{const want=oracle[i],body=event[want.type];assert(body);for(const [field,value] of Object.entries(want))if(field!=='type')assert.equal(String(body[field]),field==='user'?wallet.publicKey.toBase58():value,`${c.name}: ${field}`);});
 // Decode local execution metadata through the status-aware API, without an RPC request.
 const settled=parseRpcTransaction({slot:bundle.clock[0],version:0,transaction:{signatures:[decoded.signature],message:msg},meta:{err:reject?{InstructionError:[1,{Custom:6004}]}:null,fee:5000,preBalances:[],postBalances:[],preTokenBalances:[],postTokenBalances:[],innerInstructions:[],logMessages:meta.logs(),loadedAddresses:{writable:w.map(p),readonly:r.map(p)}}},decoded.signature,undefined,{grpcRecvUs:0});
 assert(settled.ok);assert.equal(settled.events.filter(e=>'PumpFunTrade' in e||'PumpSwapBuy' in e||'PumpSwapSell' in e).length,reject?0:2);
 const bad=Uint8Array.from(wire);bad[1]^=1;const failed=bank.simulateTransaction(getTransactionDecoder().decode(bad));
 assert(failed instanceof FailedTransactionMetadata);assert.equal(failed.err(),SIGNATURE_FAILURE);assert.equal(failed.meta().logs().length,0);
 if(alt)for(const side of ['writableIndexes','readonlyIndexes'] as const){
  const copy=VersionedTransaction.deserialize(wire);copy.message.addressTableLookups[0]![side][0]=255;copy.sign([wallet]);
  const failed=bank.simulateTransaction(getTransactionDecoder().decode(copy.serialize()));assert(failed instanceof FailedTransactionMetadata);assert.equal(failed.err(),INVALID_ALT_INDEX);assert.equal(failed.meta().logs().length,0);
 }
 assert.deepEqual(state(),after);
 return canonical({name:c.name,alt,reject,wire:Buffer.from(wire).toString('base64'),logs:meta.logs(),after:[...after]});
}
export function runBank(configPath?:string):number {
 const config=JSON.parse(readFileSync(configPath??resolve(ROOT,'config.json'),'utf8')),payload=readFileSync(resolve(ROOT,config.snapshot));
 assert.equal(createHash('sha256').update(payload).digest('hex'),config.sha256);
 const bundle=JSON.parse(gunzipSync(payload).toString()),oracle=JSON.parse(readFileSync(resolve(ROOT,'expected.json'),'utf8'));assert.equal(bundle.schema,1);assert(config.repetitions>=2);
 let baseline:string[]|undefined;
 for(let pass=0;pass<config.repetitions;pass++){
  const trace=bundle.cases.flatMap((c:any)=>[false,true].flatMap(alt=>[false,true].map(reject=>execute(bundle,c,alt,reject,oracle[c.name]))));
  assert.equal(trace.length,20);if(baseline)assert.deepEqual(trace,baseline);baseline=trace;
  console.log(`Offline bank pass ${pass+1}: 20 freshly signed routes + native SDK parsing passed`);
 }
 return baseline!.length;
}
if(process.argv[1]?.endsWith('pump_offline_bank.ts'))runBank(process.argv[2]);
