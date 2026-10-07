import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Message, MessageV0, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { describe, expect, it } from "vitest";
import { parseRpcTransaction } from "./rpc_transaction.js";
import { parseCreateFromData } from "./logs/pump.js";
import { fillAccountsFromTransactionDataRpc } from "./core/account_dispatcher_rpc.js";
import { PUMPFUN_PROGRAM_ID } from "./instr/program_ids.js";

const V2 = [214,144,76,236,95,139,49,180];
const legacy = [24,30,200,40,5,28,7,119];
const zero = PublicKey.default.toBase58();
const dir = process.env.PUMPFUN_CREATE_CORPUS ?? fileURLToPath(new URL("./fixtures/pumpfun_create", import.meta.url));
const metadata = {signature:"", slot:0n, tx_index:0n, block_time_us:0n, grpc_recv_us:0n};
const matches = (data: Uint8Array, disc: number[]) => disc.every((v,i) => data[i] === v);
for (const filename of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  it(`mainnet create accounts: ${filename}`, () => {
    const raw = JSON.parse(readFileSync(`${dir}/${filename}`, 'utf8'));
    const msg = raw.transaction.message;
    const message = msg.addressTableLookups ? new MessageV0({header:msg.header, staticAccountKeys:msg.accountKeys.map((k:string)=>new PublicKey(k)), recentBlockhash:msg.recentBlockhash,
      compiledInstructions:msg.instructions.map((i:any)=>({programIdIndex:i.programIdIndex,accountKeyIndexes:i.accounts,data:bs58.decode(i.data)})),
      addressTableLookups:msg.addressTableLookups.map((a:any)=>({...a,accountKey:new PublicKey(a.accountKey)}))}) : new Message(msg);
    const result = parseRpcTransaction({...raw,meta:{...raw.meta,loadedAddresses:{writable:raw.meta.loadedAddresses.writable.map((k:string)=>new PublicKey(k)),readonly:raw.meta.loadedAddresses.readonly.map((k:string)=>new PublicKey(k))}},transaction:{...raw.transaction,message}}, raw.transaction.signatures[0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (raw.meta.err !== null) { expect(result.events).toEqual([]); return; }
    const keys = [...msg.accountKeys, ...raw.meta.loadedAddresses.writable, ...raw.meta.loadedAddresses.readonly];
    const creates = result.events.flatMap(e => 'PumpFunCreate' in e ? [e.PumpFunCreate] : 'PumpFunCreateV2' in e ? [e.PumpFunCreateV2] : []);
    expect(creates.length).toBeGreaterThan(0);
    for (const c of creates) {
      const ix = msg.instructions.find((i:any) => keys[i.programIdIndex] === PUMPFUN_PROGRAM_ID && (matches(bs58.decode(i.data),V2)||matches(bs58.decode(i.data),legacy)) && keys[i.accounts[0]] === c.mint);
      expect(ix).toBeDefined();
      const v2 = matches(bs58.decode(ix.data), V2);
      expect(c.user).toBe(keys[ix.accounts[v2?5:7]]);
      expect(c.token_program).toBe(keys[ix.accounts[v2?7:9]]);
      expect([zero,'So11111111111111111111111111111111111111111']).toContain(c.quote_mint);
      expect(c.quote_vault).toBe(zero);
    }
  });
}
const strings = Buffer.concat(['name','SYM','uri'].map(s=>{const len=Buffer.alloc(4);len.writeUInt32LE(s.length);return Buffer.concat([len,Buffer.from(s)]);}));
const historical = Buffer.concat([strings,Buffer.alloc(32,1),Buffer.alloc(32,2),Buffer.alloc(32,3)]);
it('accepts exact historical CreateEvent and rejects partial modern layouts',()=>{
  const event = parseCreateFromData(historical,metadata);
  expect(event && 'PumpFunCreate' in event).toBe(true);
  for (const payload of [historical.subarray(0,-1),Buffer.concat([historical,Buffer.alloc(1)]),Buffer.concat([historical,Buffer.alloc(104)])]) expect(parseCreateFromData(payload,metadata)).toBeNull();
});
for (const inner of [false,true]) for (const ambiguous of [false,true]) it(`selector matches mint and discriminator: inner=${inner} ambiguous=${ambiguous}`,()=>{
  const keys = Array.from({length:40},(_,i)=>new PublicKey(Buffer.alloc(32,i+1)));
  const create = {programIdIndex:39,accounts:Array.from({length:19},(_,i)=>i),data:bs58.encode(Uint8Array.from(V2))};
  const other = {...create,accounts:[20,...create.accounts.slice(1)]};
  const buy = {...create,accounts:Array.from({length:30},(_,i)=>i),data:bs58.encode(Uint8Array.from([102,6,61,18,1,218,235,234]))};
  const instructions=[create,other,buy,...(ambiguous?[create]:[])];
  const message=new Message({header:{numRequiredSignatures:1,numReadonlySignedAccounts:0,numReadonlyUnsignedAccounts:0},accountKeys:keys,recentBlockhash:zero,instructions:inner?[]:instructions});
  const meta:any={innerInstructions:inner?[{index:0,instructions}]:[]};
  const invokes:Map<string,[number,number][]> = new Map([[PUMPFUN_PROGRAM_ID,instructions.map((_,i)=>inner?[0,i]:[i,-1])]]);
  const event = parseCreateFromData(historical,metadata)!;
  if (!('PumpFunCreate' in event)) throw Error('create');
  const c=event.PumpFunCreate;c.mint=keys[0]!.toBase58();c.user=zero;c.quote_mint='decoded_quote';c.quote_vault='decoded_vault';
  fillAccountsFromTransactionDataRpc(event,message,meta,invokes,{get:i=>keys[i]});
  expect(c.token_program).toBe(ambiguous?zero:keys[7]!.toBase58());
  expect(c.quote_mint).toBe('decoded_quote');expect(c.quote_vault).toBe('decoded_vault');
});

it('preserves Yellowstone failure status and suppresses rolled-back events', async () => {
  const { convertRpcToGrpc } = await import('./grpc/rpc_to_grpc.js');
  const { yellowstoneTransactionToWeb3 } = await import('./grpc/yellowstone_transaction_adapter.js');
  const { parseDexEventsFromGrpcTransactionInfo } = await import('./grpc/yellowstone_parse.js');
  const filename = readdirSync(dir).find(f => f.startsWith('2Mfm'))!;
  const raw = JSON.parse(readFileSync(`${dir}/${filename}`, 'utf8'));
  const message = new Message(raw.transaction.message);
  const rpc = {...raw,transaction:{...raw.transaction,message}};
  const baseline = parseRpcTransaction(rpc, raw.transaction.signatures[0]);
  expect(baseline.ok && baseline.events.length).toBeGreaterThan(0);
  const converted = convertRpcToGrpc(rpc);
  if (!converted.ok) throw Error(converted.error.message);
  const failed = convertRpcToGrpc({...rpc,meta:{...rpc.meta,err:{InstructionError:[0,{Custom:1}]}}});
  if (!failed.ok) throw Error(failed.error.message);
  expect(failed.meta.err).toBeDefined();
  expect(yellowstoneTransactionToWeb3(failed.transaction,failed.meta,raw.slot,raw.blockTime).meta?.err).not.toBeNull();
  for (const bytes of [new Uint8Array(), Uint8Array.of(1)]) {
    converted.meta.err = {err:bytes};
    const adapted = yellowstoneTransactionToWeb3(converted.transaction,converted.meta,raw.slot,raw.blockTime);
    expect(adapted.meta?.err).not.toBeNull();
    expect(parseRpcTransaction(adapted,raw.transaction.signatures[0])).toEqual({ok:true,events:[]});
    const info = {signature:bs58.decode(raw.transaction.signatures[0]),isVote:false,index:0n,transactionRaw:converted.transaction,metaRaw:converted.meta};
    expect(parseDexEventsFromGrpcTransactionInfo(info,BigInt(raw.slot))).toEqual([]);
  }
});
