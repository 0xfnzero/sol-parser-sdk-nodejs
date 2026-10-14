import {it,expect} from 'vitest';
import {PublicKey,VersionedTransaction} from '@solana/web3.js';
import fixture from '../fixtures/pump_depth2_20261014.json';
import {parseRpcTransaction} from '../rpc_transaction';
for(const c of fixture.cases)it(`signed depth-2 bank ${c.name}`,()=>{
 const raw=c.raw;
 const message=VersionedTransaction.deserialize(Buffer.from(c.wire_rpc.transaction[0]!,'base64')).message;
 const response={...raw,transaction:{...raw.transaction,message},meta:{...raw.meta,loadedAddresses:{writable:raw.meta.loadedAddresses.writable.map(k=>new PublicKey(k)),readonly:raw.meta.loadedAddresses.readonly.map(k=>new PublicKey(k))}}};
 const parsed=parseRpcTransaction(response as any,raw.transaction.signatures[0]!);
 expect(parsed.ok).toBe(true);if(!parsed.ok)return;
 const creates=parsed.events.flatMap(e=>'PumpFunCreate' in e?[e.PumpFunCreate]:[]);
 expect(creates).toHaveLength(1);
 for(const [k,v]of Object.entries(c.expected))expect(String((creates[0] as any)[k])).toBe(String(v));
 const failed=parseRpcTransaction({...response,meta:{...response.meta,err:{InstructionError:[1,{Custom:6109}]}}} as any,'failed');
 expect(failed.ok).toBe(true);if(failed.ok)expect(failed.events).toEqual([]);
});
