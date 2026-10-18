/** Program-bound wire intents. No RPC, fills, balances or reserves are inferred. */
import type { EventMetadata } from '../core/metadata.js';
import type { EventTypeFilter } from '../grpc/types.js';
export interface PumpRouteHop {base_mint:string;quote_mint:string;venue:string;base_vault:string;quote_vault:string}
export interface PumpRouteIntentEvent {
  /** Intended direction relative to the wrapper hop's base mint, not a fill. */
  is_buy?: boolean|null;
  /** Official underlying instruction encoded in the wrapper; null when unknown. */
  ix_name?: string|null;
  metadata:EventMetadata;kind:'MultiHopSwap'|'MultiHopCurveSwap'|'RapidBuy'|'BuyPumpDelta';program:string;
  instruction_index:number;user:string;input_account:string;output_account:string;
  amount_in:bigint|null;min_amount_out:bigint|null;hops:PumpRouteHop[];instruction_data:number[];
}
const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',AMM='pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
 RAPID='rapidV5DAKtecYzetwCNoxXWHpezjeg4hGt9BGiVcGW',DELTA='J7pourVwqP1VtRNBiFNqbdGxwkx7ta2LHAURURRRJqmd',
 TOKEN='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',TOKEN22='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
 SYSTEM='11111111111111111111111111111111',ATA='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
 GLOBAL='4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf',EVENT='Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1',FEES='pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ';
function matches(data:Uint8Array,at:number,bytes:number[]):boolean{return bytes.every((v,i)=>data[at+i]===v)}
const MULTI=[43,100,73,19,233,246,111,148],CURVE=[225,154,117,22,215,86,246,103];
export function mayParsePumpRoute(program:string,data:Uint8Array):boolean {
 return (program===AMM&&matches(data,0,MULTI))||(program===PUMP&&matches(data,0,CURVE))
 ||(program===DELTA&&data.length===28&&matches(data,0,[122,28,94,147,180,45,240,97]))
 ||(program===RAPID&&data.length===41&&data[0]===0&&matches(data,9,[1,0,0,27,15,14,8,24])&&matches(data,17,[194,171,28,70,104,77,91,47])&&matches(data,25,Array(8).fill(0)));
}
export function allowsPumpRoute(filter:EventTypeFilter|undefined,program:string):boolean {
 if(!filter)return true;
 const excluded=filter.exclude_types??[];
 if(excluded.includes('PumpRouteIntent')||excluded.includes('PumpFunTrade')||(program===AMM&&excluded.includes('PumpSwapTrade')))return false;
 const included=filter.include_only;
 return included ? included.includes('PumpRouteIntent')||included.includes('PumpFunTrade')||(program===AMM&&included.includes('PumpSwapTrade')) : filter.shouldInclude('PumpRouteIntent');
}
function context(a:readonly string[],pairs:Record<number,string>):boolean{return Object.entries(pairs).every(([i,v])=>a[Number(i)]===v)}
export function pumpMultiHopArgs(program:string,data:Uint8Array,a:readonly string[]):[bigint,bigint]|null {
 if(program!==AMM||data.length!==24||!matches(data,0,MULTI)||a.length<21||(a.length-16)%5||!context(a,{7:TOKEN,8:TOKEN22,9:SYSTEM,11:AMM,12:PUMP}))return null;
 const d=new DataView(data.buffer,data.byteOffset,data.byteLength),amount=d.getBigUint64(8,true);
 return amount ? [amount,d.getBigUint64(16,true)] : null;
}
export function parsePumpRoute(program:string,data:Uint8Array,a:readonly string[],metadata:EventMetadata,index:number,filter?:EventTypeFilter):PumpRouteIntentEvent|null {
 if(!mayParsePumpRoute(program,data)||!allowsPumpRoute(filter,program))return null;
 const d=new DataView(data.buffer,data.byteOffset,data.byteLength),u=(at:number)=>d.getBigUint64(at,true);
 let kind:PumpRouteIntentEvent['kind'],fixed:number,user:number,input:number,output:number,amount:bigint|null,minimum:bigint|null;
 if(program===AMM){const args=pumpMultiHopArgs(program,data,a);if(!args)return null;[kind,fixed,user,input,output,amount,minimum]=['MultiHopSwap',16,0,1,2,...args];}
 else if(program===PUMP){
  if(data.length<20)return null;const count=d.getUint32(16,true);
  if(!count||data.length!==20+count||a.length!==13+count*5||!context(a,{8:TOKEN,9:TOKEN22,10:SYSTEM,11:EVENT,12:PUMP}))return null;
  [kind,fixed,user,input,output,amount,minimum]=['MultiHopCurveSwap',13,3,5,6,u(8),null];
 }else if(program===RAPID){
  if(a.length!==33||a[0]!==a[19]||a[2]!==a[8]||![TOKEN,TOKEN22].includes(a[9]!)||!context(a,{3:TOKEN,4:SYSTEM,5:PUMP,6:GLOBAL,10:TOKEN,11:ATA,29:FEES,30:SYSTEM,31:EVENT,32:PUMP}))return null;
  [kind,fixed,user,input,output,amount,minimum]=['RapidBuy',0,0,21,20,u(1),u(33)];
 }else{
  if(a.length!==30||a[0]!==a[14]||![TOKEN,TOKEN22].includes(a[4]!)||![TOKEN,TOKEN22].includes(a[5]!)||!context(a,{1:GLOBAL,6:ATA,24:FEES,25:SYSTEM,26:EVENT,27:PUMP}))return null;
  [kind,fixed,user,input,output,amount,minimum]=['BuyPumpDelta',0,0,16,15,null,null];
 }
 if(amount===0n)return null;
 const hop=(h:readonly string[]):PumpRouteHop=>({base_mint:h[0]!,quote_mint:h[1]!,venue:h[2]!,base_vault:h[3]!,quote_vault:h[4]!});
 const hops:PumpRouteHop[]=[];
 if(fixed){for(let i=fixed;i<a.length;i+=5)hops.push(hop(a.slice(i,i+5)));}
 else hops.push(hop((program===RAPID?[7,2,16,17,18]:[2,3,11,12,13]).map(i=>a[i]!)));
 return {metadata,kind,program,instruction_index:index,user:a[user]!,input_account:a[input]!,output_account:a[output]!,amount_in:amount,min_amount_out:minimum,hops,instruction_data:Array.from(data),
  is_buy:kind==='RapidBuy'||kind==='BuyPumpDelta'?true:null,
  ix_name:kind==='RapidBuy'?'buy_exact_quote_in_v2':null};
}
