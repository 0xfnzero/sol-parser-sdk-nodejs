import {expect,it,expectTypeOf} from "vitest";
import {readFileSync} from "node:fs";
import {wireBytesToShredWasmTx} from "./wire_to_shred_tx.js";
import {dexEventsFromShredWasmTx,dexEventsFromShredWasmTxWithLoadedAddresses} from "./instruction_parse.js";
import {eventTypeFilterIncludeOnly} from "../grpc/types.js";

const fixtures=JSON.parse(readFileSync(new URL("../../examples/fixtures/raw_instructions.json",import.meta.url),"utf8"));
it("preserves all signed outer instructions without CPI metadata",()=>{
 for(const f of fixtures){
  const tx=wireBytesToShredWasmTx(Buffer.from(f.wire,"base64"))!;
  const all=[...tx.accounts,...f.loaded_writable,...f.loaded_readonly];
  const events=dexEventsFromShredWasmTxWithLoadedAddresses(tx,f.loaded_writable,f.loaded_readonly,f.slot,0,0,eventTypeFilterIncludeOnly(["RawInstruction"]));
  expect(events).toHaveLength(tx.instructions!.length);
  events.forEach((e,index)=>{
   if(!("RawInstruction" in e))throw Error("raw");
   const ix=tx.instructions![index],r=e.RawInstruction;
   expect(r.program_id).toBe(all[ix.programIdIndex]);
   expect(r.accounts).toEqual(Array.from(ix.accounts,i=>all[i]));
   expect(r.account_indices).toEqual(Array.from(ix.accounts));
   expect(r.instruction_data).toEqual(Array.from(ix.data));
   expect(r).not.toHaveProperty("is_buy"); expect(r).not.toHaveProperty("ix_name");
  });
  if(f.raw_instruction_count !== undefined) {
   const events=dexEventsFromShredWasmTxWithLoadedAddresses(tx,f.loaded_writable,f.loaded_readonly,f.slot,0,0);
   expect(events.filter(e=>"RawInstruction" in e)).toHaveLength(f.raw_instruction_count);
   expect(events.some(e=>["PumpFunTrade","PumpFunBuy","PumpFunSell","PumpFunBuyExactSolIn"].some(k=>k in e))).toBe(false);
  }
  if(f.signature.startsWith("3nMX")||f.signature.startsWith("2r4u")){
   const raw=dexEventsFromShredWasmTx(tx,0,0,0);
   expect(raw).toHaveLength(f.signature.startsWith("3nMX")?2:3);
   expect(raw.every(e=>"RawInstruction" in e)).toBe(true);
  }
 }
});
it("does not infer semantics when arbitrary programs reorder accounts or change data",()=>{
 const tx=wireBytesToShredWasmTx(Buffer.from(fixtures[0].wire,"base64"))!;
 const ix=tx.instructions![1];
 tx.instructions=[{programIdIndex:0,accounts:Uint8Array.from([ix.accounts[2],ix.accounts[1],ix.accounts[2],250]),data:Uint8Array.from([255,0,1])}];
 const events=dexEventsFromShredWasmTx(tx,0,0,0);
 expect(events).toHaveLength(1);
 if(!("RawInstruction" in events[0]))throw Error("raw");
 expect(events[0].RawInstruction.accounts).toEqual([tx.accounts[ix.accounts[2]],tx.accounts[ix.accounts[1]],tx.accounts[ix.accounts[2]],null]);
 expect(events[0].RawInstruction.instruction_data).toEqual([255,0,1]);
});

it("filters each wrapper instruction by its own DEX references, including multi-DEX and missing ALT", () => {
 const pump = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
 const ray = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
 const tx=wireBytesToShredWasmTx(Buffer.from(fixtures[0].wire,"base64"))!;
 tx.accounts=[tx.accounts[0],pump,ray];
 tx.instructions=[
  {programIdIndex:0,accounts:Uint8Array.from([1,1]),data:Uint8Array.from([255])},
  {programIdIndex:0,accounts:Uint8Array.from([2]),data:Uint8Array.from([254])},
  {programIdIndex:0,accounts:Uint8Array.from([]),data:Uint8Array.from([253])},
  {programIdIndex:0,accounts:Uint8Array.from([1,2,250]),data:Uint8Array.from([252])},
  {programIdIndex:0,accounts:Uint8Array.from([250]),data:Uint8Array.from([251])},
 ];
 for (const [type,indices] of [["PumpFunTrade",[0,3]],["RaydiumCpmmSwap",[1,3]],["PumpFunBuy",[]],["RawInstruction",[0,1,2,3,4]]] as const) {
  const events=dexEventsFromShredWasmTx(tx,0,0,0,eventTypeFilterIncludeOnly([type]));
  expect(events.map(e=>"RawInstruction" in e ? e.RawInstruction.instruction_index : -1)).toEqual(indices);
 }
 const all=dexEventsFromShredWasmTx(tx,0,0,0);
 const multi=all[3];
 if (!("RawInstruction" in multi)) throw Error("expected raw");
 expect(multi.RawInstruction.dexes).toEqual([
  {dex_type:"pumpfun",program_id:pump,pool:null},
  {dex_type:"raydium_cpmm",program_id:ray,pool:null}
 ]);
 expect(multi.RawInstruction.accounts[2]).toBeNull();
 const excluded=eventTypeFilterIncludeOnly(["PumpFunTrade"]);
 excluded.exclude_types=["RawInstruction"];
 expect(dexEventsFromShredWasmTx(tx,0,0,0,excluded)).toEqual([]);
});

import {RawInstructionDexType, type RawInstructionDex} from "../index.js";

it("exports a typed DEX enum with stable JSON strings", () => {
 expectTypeOf<RawInstructionDex["dex_type"]>().toEqualTypeOf<RawInstructionDexType>();
 expect(Object.values(RawInstructionDexType)).toEqual(["pumpfun","pumpswap","raydium_launchlab","raydium_cpmm","raydium_clmm","raydium_amm_v4","orca_whirlpool","meteora_pools","meteora_damm_v2","meteora_dlmm","meteora_dbc"]);
 for (const kind of Object.values(RawInstructionDexType)) expect(JSON.parse(JSON.stringify(kind))).toBe(kind);
 expect(RawInstructionDexType.PumpFun).toBe("pumpfun");
});
