import {createHash} from "node:crypto";
import bs58 from "bs58";
/** Log ix_name can predate IDL method names. Verify V3 using signed instruction bytes. */
export function expectedPumpMethod(raw:any,legacy:string):string {
 const method=legacy+"_v3",disc=createHash("sha256").update("global:"+method).digest().subarray(0,8);
 const keys=[...raw.transaction.message.accountKeys,...(raw.meta.loadedAddresses?.writable??[]),...(raw.meta.loadedAddresses?.readonly??[])];
 const instructions=[...raw.transaction.message.instructions,...(raw.meta.innerInstructions??[]).flatMap((g:any)=>g.instructions)];
 return instructions.some((ix:any)=>keys[ix.programIdIndex]==="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"&&Buffer.from(bs58.decode(ix.data)).subarray(0,8).equals(disc))?method:legacy;
}
