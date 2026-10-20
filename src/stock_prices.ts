/** Opt-in reported execution prices. No RPC, discovery or quote calculation. */
import type { DexEvent } from "./core/dex_event.js";
import type { EventMetadata } from "./core/metadata.js";
import { TradeParseStatus } from "./core/raw_instruction.js";
import {
  STOCK_DEX_PROGRAMS,
  type StockTokenCatalog,
  type StockPool,
  type StockToken,
  type StockDexType,
} from "./stock_catalog.js";
import { PublicKey } from "@solana/web3.js";

export const STOCK_WSOL = "So11111111111111111111111111111111111111112";
export const STOCK_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const DEFAULT_STOCK_SOL_USDC_POOL =
  "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE";
export interface StockPriceConfig {
  catalog?: StockTokenCatalog;
  sol_usdc_pool?: string;
  sol_usdc_dex?: StockDexType;
  max_age_us?: bigint;
  max_slot_lag?: bigint;
}
export interface StockPoolLiquidity {
  pool: string;
  slot: bigint;
  observed_us: bigint;
  source: string;
  tvl_usdc?: number | null;
  buy_depth_usdc?: number | null;
  sell_depth_usdc?: number | null;
  depth_max_price_impact_bps?: number | null;
}
export interface SolUsdcReference {
  pool: string;
  usdc_per_sol: number;
  metadata: EventMetadata;
}
export interface StockTokenPriceEvent {
  metadata: EventMetadata;
  mint: string;
  symbol: string;
  pool: string;
  dex_type: StockDexType;
  quote_mint: string;
  price_in_quote: number;
  price_sol: number | null;
  price_usdc: number | null;
  basis: "ReportedSwapAmounts";
  stock_amount_raw: bigint;
  quote_amount_raw: bigint;
  sol_usdc_reference: SolUsdcReference | null;
  liquidity: StockPoolLiquidity | null;
}
const validKey = (key: string) => {
  try {
    return !new PublicKey(key).equals(PublicKey.default);
  } catch {
    return false;
  }
};
type Swap = {
  pool: string;
  dex: StockDexType;
  input: string;
  output: string;
  amountIn: bigint;
  amountOut: bigint;
};
function executedSwap(event: DexEvent): Swap | null {
  const [name, d] = Object.entries(event)[0]!;
  if (d.parse_status !== TradeParseStatus.ExecutionConfirmed) return null;
  switch (name) {
    case "RaydiumCpmmSwap":
      return d.input_vault_before > 0n && d.output_vault_before > 0n
        ? {
            pool: d.pool_id,
            dex: "raydium_cpmm",
            input: d.input_mint,
            output: d.output_mint,
            amountIn: d.input_amount,
            amountOut: d.output_amount,
          }
        : null;
    case "RaydiumClmmSwap":
      return d.sqrt_price_x64 > 0n
        ? {
            pool: d.pool_state,
            dex: "raydium_clmm",
            input: d.input_mint,
            output: d.output_mint,
            amountIn: d.zero_for_one ? d.amount_0 : d.amount_1,
            amountOut: d.zero_for_one ? d.amount_1 : d.amount_0,
          }
        : null;
    case "OrcaWhirlpoolSwap":
      return d.post_sqrt_price > 0n
        ? {
            pool: d.whirlpool,
            dex: "orca_whirlpool",
            input: d.a_to_b ? d.token_mint_a : d.token_mint_b,
            output: d.a_to_b ? d.token_mint_b : d.token_mint_a,
            amountIn: d.input_amount,
            amountOut: d.output_amount,
          }
        : null;
    case "MeteoraDlmmSwap":
      return [1, 2].includes(d.event_version)
        ? {
            pool: d.pool,
            dex: "meteora_dlmm",
            input: d.swap_for_y ? d.token_x_mint : d.token_y_mint,
            output: d.swap_for_y ? d.token_y_mint : d.token_x_mint,
            amountIn: d.amount_in,
            amountOut: d.amount_out,
          }
        : null;
    default:
      return null;
  }
}
export class StockPriceTracker {
  private readonly tokens = new Map<string, StockToken>();
  private readonly pools = new Map<
    string,
    { pool: StockPool; scale: number }
  >();
  private readonly liquidity = new Map<string, StockPoolLiquidity>();
  private readonly positions = new Map<string, readonly [bigint, bigint]>();
  private reference: SolUsdcReference | null = null;
  private readonly referencePool: string;
  private readonly referenceDex: StockDexType;
  private readonly maxAge: bigint;
  private readonly maxSlots: bigint;
  constructor(config: StockPriceConfig = {}) {
    this.referencePool = config.sol_usdc_pool ?? DEFAULT_STOCK_SOL_USDC_POOL;
    this.referenceDex = config.sol_usdc_dex ?? "orca_whirlpool";
    this.maxAge = config.max_age_us ?? 30_000_000n;
    this.maxSlots = config.max_slot_lag ?? 75n;
    if (
      !validKey(this.referencePool) ||
      !(this.referenceDex in STOCK_DEX_PROGRAMS) ||
      this.maxAge <= 0n ||
      this.maxSlots < 0n
    )
      throw Error("Invalid stock reference or freshness");
    for (const token of config.catalog?.tokens ?? []) {
      if (
        !validKey(token.mint) ||
        [STOCK_WSOL, STOCK_USDC].includes(token.mint) ||
        !Number.isInteger(token.decimals) ||
        token.decimals < 0 ||
        token.decimals > 18 ||
        this.tokens.has(token.mint)
      )
        throw Error("Invalid or duplicate stock token");
      this.tokens.set(token.mint, { ...token });
    }
    for (const pool of config.catalog?.pools ?? []) {
      const token = this.tokens.get(pool.mint);
      if (
        !token ||
        !validKey(pool.pool) ||
        pool.pool === this.referencePool ||
        this.pools.has(pool.pool) ||
        !(pool.dex_type in STOCK_DEX_PROGRAMS) ||
        ![STOCK_WSOL, STOCK_USDC].includes(pool.quote_mint)
      )
        throw Error("Invalid or duplicate stock pool");
      this.pools.set(pool.pool, {
        pool: structuredClone(pool),
        scale:
          10 ** (token.decimals - (pool.quote_mint === STOCK_WSOL ? 9 : 6)),
      });
    }
  }
  /** Call on disconnect, queue loss, or a selected-fork change. */
  reset(): void {
    this.reference = null;
    this.liquidity.clear();
    this.positions.clear();
  }
  updateLiquidity(snapshot: StockPoolLiquidity): void {
    const depths = [snapshot.buy_depth_usdc, snapshot.sell_depth_usdc];
    if (
      !this.pools.has(snapshot.pool) ||
      snapshot.slot < 0n ||
      snapshot.observed_us <= 0n ||
      !snapshot.source.trim() ||
      [snapshot.tvl_usdc, ...depths].some(
        (v) => v != null && (!Number.isFinite(v) || v < 0),
      ) ||
      (depths.some((v) => v != null) &&
        snapshot.depth_max_price_impact_bps == null) ||
      (snapshot.depth_max_price_impact_bps != null &&
        (!Number.isInteger(snapshot.depth_max_price_impact_bps) ||
          snapshot.depth_max_price_impact_bps < 0 ||
          snapshot.depth_max_price_impact_bps >= 10000))
    )
      throw Error("Invalid liquidity snapshot");
    const old = this.liquidity.get(snapshot.pool);
    if (
      old &&
      (snapshot.slot < old.slot || snapshot.observed_us < old.observed_us)
    )
      throw Error("Out-of-order liquidity");
    this.liquidity.set(snapshot.pool, { ...snapshot });
  }
  private fresh(
    time: bigint,
    slot: bigint,
    meta: EventMetadata,
    now: bigint,
  ): boolean {
    return (
      time > 0n &&
      time <= now &&
      now - time <= this.maxAge &&
      slot <= meta.slot &&
      meta.slot - slot <= this.maxSlots
    );
  }
  process(event: DexEvent, nowUs: bigint): StockTokenPriceEvent | null {
    if (!this.pools.size) return null;
    const swap = executedSwap(event),
      meta = Object.values(event)[0].metadata as EventMetadata;
    if (
      !swap ||
      swap.amountIn <= 0n ||
      swap.amountOut <= 0n ||
      !this.fresh(meta.grpc_recv_us, meta.slot, meta, nowUs)
    )
      return null;
    const position = [meta.slot, meta.tx_index] as const,
      old = this.positions.get(swap.pool);
    const before = (
      a: readonly [bigint, bigint],
      b: readonly [bigint, bigint],
    ) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
    if (old && before(position, old)) return null;
    if (swap.pool === this.referencePool && swap.dex === this.referenceDex) {
      const forward = swap.input === STOCK_WSOL && swap.output === STOCK_USDC,
        reverse = swap.input === STOCK_USDC && swap.output === STOCK_WSOL;
      if (!forward && !reverse) return null;
      const price =
        (Number(forward ? swap.amountOut : swap.amountIn) /
          Number(forward ? swap.amountIn : swap.amountOut)) *
        1000;
      if (!Number.isFinite(price) || price <= 0) return null;
      this.reference = {
        pool: swap.pool,
        usdc_per_sol: price,
        metadata: { ...meta },
      };
      this.positions.set(swap.pool, position);
      return null;
    }
    const tracked = this.pools.get(swap.pool);
    if (!tracked || tracked.pool.dex_type !== swap.dex) return null;
    const { pool, scale } = tracked,
      forward = swap.input === pool.mint && swap.output === pool.quote_mint,
      reverse = swap.output === pool.mint && swap.input === pool.quote_mint;
    if (!forward && !reverse) return null;
    const stock = forward ? swap.amountIn : swap.amountOut,
      quote = forward ? swap.amountOut : swap.amountIn,
      price = (Number(quote) / Number(stock)) * scale;
    if (!Number.isFinite(price) || price <= 0) return null;
    const r = this.reference;
    const reference =
      r &&
      before([r.metadata.slot, r.metadata.tx_index], position) &&
      this.fresh(r.metadata.grpc_recv_us, r.metadata.slot, meta, nowUs)
        ? structuredClone(r)
        : null;
    const l = this.liquidity.get(swap.pool),
      liquidity =
        l && this.fresh(l.observed_us, l.slot, meta, nowUs) ? { ...l } : null;
    this.positions.set(swap.pool, position);
    return {
      metadata: { ...meta },
      mint: pool.mint,
      symbol: this.tokens.get(pool.mint)!.symbol,
      pool: pool.pool,
      dex_type: pool.dex_type,
      quote_mint: pool.quote_mint,
      price_in_quote: price,
      price_sol:
        pool.quote_mint === STOCK_WSOL
          ? price
          : reference
            ? price / reference.usdc_per_sol
            : null,
      price_usdc:
        pool.quote_mint === STOCK_USDC
          ? price
          : reference
            ? price * reference.usdc_per_sol
            : null,
      basis: "ReportedSwapAmounts",
      stock_amount_raw: stock,
      quote_amount_raw: quote,
      sol_usdc_reference: reference,
      liquidity,
    };
  }
}
