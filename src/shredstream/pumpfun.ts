/** Pump.fun Shred inputs only. No RPC, CPI inference or estimated hop fills. */
import {PublicKey} from "@solana/web3.js";
import {defaultPubkey, type DexEvent} from "../core/dex_event.js";
import type {EventMetadata} from "../core/metadata.js";
import {unresolvedPumpfunTrade} from "../core/trade_source.js";
import {PUMPFUN_PROGRAM_ID, PUMPSWAP_PROGRAM_ID} from "../instr/program_ids.js";
import type {ShredWasmCompiledIx} from "./instruction_parse.js";

const Z = defaultPubkey();
export const MULTI_HOP_SWAP = Uint8Array.from([43,100,73,19,233,246,111,148]);
export function hasDiscriminator(data: Uint8Array, disc: Uint8Array): boolean {
  return data.length >= 8 && disc.every((b,i) => data[i] === b);
}
const CREATE = Uint8Array.from([24,30,200,40,5,28,7,119]);
const CREATE_V2 = Uint8Array.from([214,144,76,236,95,139,49,180]);
const V2_BUYS = ['184,23,238,97,103,197,211,61', '194,171,28,70,104,77,91,47'];
const V2_SELL = '93,246,130,60,231,233,64,178';

// Keep legacy best-effort short layouts opt-in when ALT addresses are missing.
export function validUnresolvedPumpLayout(ix: ShredWasmCompiledIx): boolean {
  const disc = Array.from(ix.data.subarray(0,8)).join(',');
  return V2_BUYS.includes(disc) ? ix.accounts.length >= 27
    : disc === V2_SELL ? ix.accounts.length >= 26 : true;
}
export function pumpCreationContext(ixs: ShredWasmCompiledIx[], keys: string[]) {
  const created = new Set<string>(), mayhem = new Set<string>();
  for (const ix of ixs) {
    if (keys[ix.programIdIndex] !== PUMPFUN_PROGRAM_ID || !ix.accounts.length) continue;
    const v2 = hasDiscriminator(ix.data, CREATE_V2);
    if (!v2 && !hasDiscriminator(ix.data, CREATE)) continue;
    const mint = keys[ix.accounts[0]!];
    if (!mint || mint === Z) continue;
    created.add(mint);
    if (v2) {
      let offset = 8;
      const view = new DataView(ix.data.buffer, ix.data.byteOffset, ix.data.byteLength);
      for (let i=0; i<3 && offset+4<=ix.data.length; i++) offset += 4+view.getUint32(offset,true);
      if (offset+32<ix.data.length && ix.data[offset+32] !== 0) mayhem.add(mint);
    }
  }
  return {created, mayhem};
}
export function preservePumpInputs(event: DexEvent, indices: Uint8Array, keys: string[],
  context: ReturnType<typeof pumpCreationContext>): void {
  const trade = 'PumpFunTrade' in event ? event.PumpFunTrade
    : 'PumpFunBuy' in event ? event.PumpFunBuy : 'PumpFunSell' in event ? event.PumpFunSell
    : 'PumpFunBuyExactSolIn' in event ? event.PumpFunBuyExactSolIn : undefined;
  if (!trade) return;
  trade.is_created_buy = trade.is_buy && context.created.has(trade.mint);
  trade.mayhem_mode = context.mayhem.has(trade.mint);
  const missing = (i: number) => indices[i] !== undefined && indices[i]! >= keys.length;
  if (/_v[23]$/.test(trade.ix_name)) {
    if (missing(2)) trade.quote_mint = Z;
    if (missing(3)) trade.token_program = Z;
    if (missing(4)) trade.quote_token_program = Z;
  } else if (missing(trade.ix_name === 'sell' ? 9 : 8)) trade.token_program = Z;
}

/** The fixed Pump account also exists in all-AMM routes; validate the venue PDA. */
export function parsePumpCurveHops(ix: ShredWasmCompiledIx, keys: string[], index: number,
  metadata: EventMetadata): DexEvent[] {
  const {accounts, data} = ix;
  if (data.length !== 24 || !hasDiscriminator(data,MULTI_HOP_SWAP) || accounts.length<21
      || (accounts.length-16)%5 || !data.subarray(8,16).some(Boolean) || !data.subarray(16).some(Boolean)) return [];
  const get = (i: number) => keys[accounts[i]!];
  if (get(11)!==PUMPSWAP_PROGRAM_ID || get(12)!==PUMPFUN_PROGRAM_ID || !get(0)) return [];
  const hops=(accounts.length-16)/5;
  const connected=(buy:boolean) => hops>1 && Array.from({length:hops-1},(_,i)=>{
    const from=get(16+i*5+Number(!buy));
    return !!from && from!==Z && from===get(16+(i+1)*5+Number(buy));
  }).every(Boolean);
  const buy=connected(true), sell=connected(false), known=buy!==sell;
  const out: DexEvent[]=[];
  for(let h=0;h<hops;h++) {
    const start=16+h*5, mint=get(start), quote=get(start+1), curve=get(start+2);
    if(!mint || !quote || !curve || mint===Z || quote===Z || mint===quote) continue;
    let expected: string;
    try { expected=PublicKey.findProgramAddressSync([Buffer.from('bonding-curve'),new PublicKey(mint).toBuffer()],new PublicKey(PUMPFUN_PROGRAM_ID))[0].toBase58(); }
    catch {continue;}
    if(curve!==expected) continue;
    const event=unresolvedPumpfunTrade({...metadata},{program_id:PUMPSWAP_PROGRAM_ID,instruction_index:index,
      accounts:Array.from(accounts,i=>keys[i]??null),account_indices:Array.from(accounts),instruction_data:Array.from(data)});
    if(!('PumpFunTrade' in event)) continue;
    Object.assign(event.PumpFunTrade,{ix_name:'multi_hop_swap',mint,quote_mint:quote,user:get(0),bonding_curve:curve,
      associated_bonding_curve:get(start+3)??Z,associated_quote_bonding_curve:get(start+4)??Z,
      global:get(13)??Z,fee_config:get(14)??Z,event_authority:get(15)??Z,program:PUMPFUN_PROGRAM_ID,
      system_program:get(9)??Z,is_buy:known&&buy});
    out.push(event);
  }
  return out;
}
