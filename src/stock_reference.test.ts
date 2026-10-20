import {expect,it} from "vitest";
import {PublicKey} from "@solana/web3.js";
import {StockPriceTracker,STOCK_USDC,STOCK_WSOL,DEFAULT_STOCK_SOL_USDC_POOL} from "./stock_prices";
import {makeMetadata} from "./core/metadata";
import type {DexEvent} from "./core/dex_event";
const key=(n:number)=>new PublicKey(new Uint8Array(32).fill(n)).toBase58(),mint=key(21),pool=key(22);
const tracker=()=>new StockPriceTracker({catalog:{tokens:[{mint,symbol:"TEST",decimals:6,catalog_source:"test"}],pools:[{pool,mint,quote_mint:STOCK_USDC,dex_type:"raydium_cpmm"}]},sol_usdc_dex:"raydium_cpmm"});
function swap(reference:boolean,index:number):DexEvent{return {RaydiumCpmmSwap:{
 metadata:makeMetadata("test",100,index,undefined,1000),parse_status:"ExecutionConfirmed",pool_id:reference?DEFAULT_STOCK_SOL_USDC_POOL:pool,
 input_mint:reference?STOCK_WSOL:mint,output_mint:STOCK_USDC,input_amount:reference?1_000_000_000n:1_000_000n,output_amount:reference?100_000_000n:10_000_000n,input_vault_before:1n,output_vault_before:1n
 }} as unknown as DexEvent;}
it("requires an earlier reference and invalidates reference/liquidity after gaps",()=>{
 const t=tracker();t.process(swap(true,1),1000n);
 expect(t.process(swap(false,1),1000n)?.price_sol).toBeNull();
 t.updateLiquidity({pool,slot:100n,observed_us:1000n,source:"coherent-test",tvl_usdc:500});
 for (const depth_max_price_impact_bps of [10000, 65535]) {
  expect(() => t.updateLiquidity({pool, slot:100n, observed_us:1000n, source:"test", depth_max_price_impact_bps})).toThrow();
 }
 expect(() => t.updateLiquidity({pool, slot:100n, observed_us:1000n, source:" \t\n"})).toThrow();
 const p=t.process(swap(false,2),1000n)!;expect(p.price_sol).toBe(0.1);expect(p.liquidity?.tvl_usdc).toBe(500);
 p.liquidity!.tvl_usdc=1;expect(t.process(swap(false,3),1000n)?.liquidity?.tvl_usdc).toBe(500);
 t.reset();expect(t.process(swap(false,4),1000n)?.price_sol).toBeNull();expect(t.process(swap(false,5),1000n)?.liquidity).toBeNull();
});
