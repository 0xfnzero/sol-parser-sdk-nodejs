import { it, expect } from 'vitest';
import fs from 'node:fs';
import { decodeWireTransaction } from './wire_transaction.js';
import { analyzeRpcTransactionRoutes } from './transaction_route.js';
import { analyzeSimulationRoutes } from './simulation_route.js';
import {parseLiquidityAccount} from './liquidity_snapshot.js';
it('closed or executable accounts do not yield liquidity candidates',()=>{
 const data=Buffer.alloc(148);Buffer.from('11d8f68ee1c7da38','hex').copy(data);
 const a={pubkey:'11111111111111111111111111111111',owner:'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',data,lamports:1n,executable:false,rent_epoch:0n};
 const metadata={slot:1,signature:'',tx_index:0,block_time_us:0,grpc_recv_us:0};
 expect(parseLiquidityAccount(a,metadata)).not.toBeNull();
 expect(parseLiquidityAccount({...a,lamports:0n},metadata)).toBeNull();
 expect(parseLiquidityAccount({...a,executable:true},metadata)).toBeNull();
});
const prefunded = JSON.parse(fs.readFileSync(new URL('./fixtures/review10_prefunded_ata.json',import.meta.url),'utf8'));
it('prefunded ATA simulation parses without fictitious fills',()=>{
 const r=analyzeSimulationRoutes(Buffer.from(prefunded.wire,'base64'),prefunded.response);
 expect(r.succeeded).toBe(true);expect(r.legs).toEqual([]);expect(r.transfers).toEqual([]);
});
it('invalid allocation space is rejected',()=>{
 const response=structuredClone(prefunded.response);
 response.result.value.innerInstructions[0].instructions[2].parsed.info.space=-1;
 expect(()=>analyzeSimulationRoutes(Buffer.from(prefunded.wire,'base64'),response)).toThrow();
});
const compiled = JSON.parse(fs.readFileSync(new URL('./fixtures/review10_compiled_bounds.json',import.meta.url),'utf8'));
for(const c of compiled)it(`compiled bounds ${c.name}`,()=>{
  const analyze=()=>analyzeRpcTransactionRoutes(c.transaction);
  if(c.valid)expect(analyze).not.toThrow();else expect(analyze).toThrow();
});
const wires = JSON.parse(fs.readFileSync(new URL('./fixtures/review10_wire_bounds.json', import.meta.url),'utf8'));
for (const c of wires) it(`wire bounds ${c.name}`,()=>{
  const decode=()=>decodeWireTransaction(Buffer.from(c.wire,'base64'));
  if(c.valid)expect(decode).not.toThrow();else expect(decode).toThrow();
});
