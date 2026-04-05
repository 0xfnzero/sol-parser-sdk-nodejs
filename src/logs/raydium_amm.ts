import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  RaydiumAmmV4DepositEvent,
  RaydiumAmmV4Initialize2Event,
  RaydiumAmmV4SwapEvent,
  RaydiumAmmV4WithdrawEvent,
  RaydiumAmmV4WithdrawPnlEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readPubkey, readU64LE, readU8 } from "../util/binary.js";

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

function emptySwap(metadata: EventMetadata, amm: string, user: string): RaydiumAmmV4SwapEvent {
  return {
    metadata,
    amount_in: 0n,
    minimum_amount_out: 0n,
    max_amount_in: 0n,
    amount_out: 0n,
    token_program: defaultPubkey(),
    amm,
    amm_authority: defaultPubkey(),
    amm_open_orders: defaultPubkey(),
    pool_coin_token_account: defaultPubkey(),
    pool_pc_token_account: defaultPubkey(),
    serum_program: defaultPubkey(),
    serum_market: defaultPubkey(),
    serum_bids: defaultPubkey(),
    serum_asks: defaultPubkey(),
    serum_event_queue: defaultPubkey(),
    serum_coin_vault_account: defaultPubkey(),
    serum_pc_vault_account: defaultPubkey(),
    serum_vault_signer: defaultPubkey(),
    user_source_token_account: defaultPubkey(),
    user_destination_token_account: defaultPubkey(),
    user_source_owner: user,
  };
}

export function parseSwapBaseInFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const amm = readPubkey(data, o);
  if (!amm) return null;
  o += 32;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  const amount_in = bn64(readU64LE(data, o));
  o += 8;
  const minimum_amount_out = bn64(readU64LE(data, o));
  const ev = emptySwap(metadata, amm, user);
  ev.amount_in = amount_in;
  ev.minimum_amount_out = minimum_amount_out;
  return { RaydiumAmmV4Swap: ev };
}

export function parseSwapBaseOutFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const amm = readPubkey(data, o);
  if (!amm) return null;
  o += 32;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  const max_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const amount_out = bn64(readU64LE(data, o));
  const ev = emptySwap(metadata, amm, user);
  ev.max_amount_in = max_amount_in;
  ev.amount_out = amount_out;
  return { RaydiumAmmV4Swap: ev };
}

export function parseDepositFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const amm = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const max_coin_amount = bn64(readU64LE(data, o));
  o += 8;
  const max_pc_amount = bn64(readU64LE(data, o));
  o += 8;
  const base_side = bn64(readU64LE(data, o));
  const ev: RaydiumAmmV4DepositEvent = {
    metadata,
    max_coin_amount,
    max_pc_amount,
    base_side,
    token_program: defaultPubkey(),
    amm,
    amm_authority: defaultPubkey(),
    amm_open_orders: defaultPubkey(),
    amm_target_orders: defaultPubkey(),
    lp_mint_address: defaultPubkey(),
    pool_coin_token_account: defaultPubkey(),
    pool_pc_token_account: defaultPubkey(),
    serum_market: defaultPubkey(),
    user_coin_token_account: defaultPubkey(),
    user_pc_token_account: defaultPubkey(),
    user_lp_token_account: defaultPubkey(),
    user_owner: user,
    serum_event_queue: defaultPubkey(),
  };
  return { RaydiumAmmV4Deposit: ev };
}

export function parseWithdrawFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const amm = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const amount = bn64(readU64LE(data, o));
  const ev: RaydiumAmmV4WithdrawEvent = {
    metadata,
    amount,
    token_program: defaultPubkey(),
    amm,
    amm_authority: defaultPubkey(),
    amm_open_orders: defaultPubkey(),
    amm_target_orders: defaultPubkey(),
    lp_mint_address: defaultPubkey(),
    pool_coin_token_account: defaultPubkey(),
    pool_pc_token_account: defaultPubkey(),
    pool_withdraw_queue: defaultPubkey(),
    pool_temp_lp_token_account: defaultPubkey(),
    serum_program: defaultPubkey(),
    serum_market: defaultPubkey(),
    serum_coin_vault_account: defaultPubkey(),
    serum_pc_vault_account: defaultPubkey(),
    serum_vault_signer: defaultPubkey(),
    user_lp_token_account: defaultPubkey(),
    user_coin_token_account: defaultPubkey(),
    user_pc_token_account: defaultPubkey(),
    user_owner: user,
    serum_event_queue: defaultPubkey(),
    serum_bids: defaultPubkey(),
    serum_asks: defaultPubkey(),
  };
  return { RaydiumAmmV4Withdraw: ev };
}

/** Withdraw PnL 事件；discriminator `[0,0,0,0,0,0,0,7]` */
export function parseWithdrawPnlFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const amm = readPubkey(data, o);
  if (!amm) return null;
  o += 32;
  const pnl_owner = readPubkey(data, o);
  if (!pnl_owner) return null;
  const z = defaultPubkey();
  const ev: RaydiumAmmV4WithdrawPnlEvent = {
    metadata,
    token_program: z,
    amm,
    amm_config: z,
    amm_authority: z,
    amm_open_orders: z,
    pool_coin_token_account: z,
    pool_pc_token_account: z,
    coin_pnl_token_account: z,
    pc_pnl_token_account: z,
    pnl_owner,
    amm_target_orders: z,
    serum_program: z,
    serum_market: z,
    serum_event_queue: z,
    serum_coin_vault_account: z,
    serum_pc_vault_account: z,
    serum_vault_signer: z,
  };
  return { RaydiumAmmV4WithdrawPnl: ev };
}

export function parseInitialize2FromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const amm = readPubkey(data, o);
  if (!amm) return null;
  o += 32;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  const nonce = readU8(data, o)!;
  o += 1;
  const open_time = bn64(readU64LE(data, o));
  o += 8;
  const init_pc_amount = bn64(readU64LE(data, o));
  o += 8;
  const init_coin_amount = bn64(readU64LE(data, o));
  const z = defaultPubkey();
  const ev: RaydiumAmmV4Initialize2Event = {
    metadata,
    nonce,
    open_time,
    init_pc_amount,
    init_coin_amount,
    token_program: z,
    spl_associated_token_account: z,
    system_program: z,
    rent: z,
    amm,
    amm_authority: z,
    amm_open_orders: z,
    lp_mint: z,
    coin_mint: z,
    pc_mint: z,
    pool_coin_token_account: z,
    pool_pc_token_account: z,
    pool_withdraw_queue: z,
    amm_target_orders: z,
    pool_temp_lp: z,
    serum_program: z,
    serum_market: z,
    user_wallet: user,
    user_token_coin: z,
    user_token_pc: z,
    user_lp_token_account: z,
  };
  return { RaydiumAmmV4Initialize2: ev };
}
