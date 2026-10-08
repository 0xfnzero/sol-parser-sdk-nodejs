/** Raydium CLMM / CPMM / AMM V4 账户填充（字符串公钥） */
import type {
  RaydiumAmmV4DepositEvent,
  RaydiumAmmV4SwapEvent,
  RaydiumAmmV4WithdrawEvent,
  RaydiumClmmClosePositionEvent,
  RaydiumClmmCreatePoolEvent,
  RaydiumClmmDecreaseLiquidityEvent,
  RaydiumClmmIncreaseLiquidityEvent,
  RaydiumClmmOpenPositionEvent,
  RaydiumClmmOpenPositionWithTokenExtNftEvent,
  RaydiumClmmSwapEvent,
  RaydiumCpmmDepositEvent,
  RaydiumCpmmInitializeEvent,
  RaydiumCpmmSwapEvent,
  RaydiumCpmmWithdrawEvent,
} from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

const Z = () => defaultPubkey();

export function fillRaydiumClmmSwapAccounts(e: RaydiumClmmSwapEvent, get: (i: number) => string): void {
  const zero = Z();
  if (!e.pool_state || e.pool_state === zero) e.pool_state = get(2);
  if (!e.sender || e.sender === zero) e.sender = get(0);
}

export function fillRaydiumClmmCreatePoolAccounts(
  e: RaydiumClmmCreatePoolEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.creator || e.creator === zero) e.creator = get(0);
}

export function fillRaydiumClmmOpenPositionAccounts(
  e: RaydiumClmmOpenPositionEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.position_nft_mint || e.position_nft_mint === zero) e.position_nft_mint = get(2);
}

/**
 * `fill_clmm_open_position_accounts` 账户索引相同（openPosition / token-ext 变体共用 IDL 布局）。
 * 参考实现未对该 `DexEvent` 变体做账户调度；本包在 RPC 路径补全。
 */
export function fillRaydiumClmmOpenPositionWithTokenExtNftAccounts(
  e: RaydiumClmmOpenPositionWithTokenExtNftEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.position_nft_mint || e.position_nft_mint === zero) e.position_nft_mint = get(2);
}

export function fillRaydiumClmmClosePositionAccounts(
  e: RaydiumClmmClosePositionEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.position_nft_mint || e.position_nft_mint === zero) e.position_nft_mint = get(1);
}

export function fillRaydiumClmmIncreaseLiquidityAccounts(
  e: RaydiumClmmIncreaseLiquidityEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.pool || e.pool === zero) e.pool = get(2);
}

export function fillRaydiumClmmDecreaseLiquidityAccounts(
  e: RaydiumClmmDecreaseLiquidityEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
  if (!e.pool || e.pool === zero) e.pool = get(3);
}

export function fillRaydiumCpmmSwapAccounts(
  e: RaydiumCpmmSwapEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.pool_id || e.pool_id === zero) e.pool_id = get(3);
}

export function fillRaydiumCpmmDepositAccounts(
  e: RaydiumCpmmDepositEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
}

export function fillRaydiumCpmmWithdrawAccounts(
  e: RaydiumCpmmWithdrawEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.user || e.user === zero) e.user = get(0);
}

export function fillRaydiumCpmmInitializeAccounts(
  e: RaydiumCpmmInitializeEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.creator || e.creator === zero) e.creator = get(0);
  if (!e.pool || e.pool === zero) e.pool = get(3);
}

export function fillRaydiumAmmV4SwapAccounts(e: RaydiumAmmV4SwapEvent, get: (i: number) => string): void {
  const empty=(v:string)=>!v||v===Z();
  if(empty(e.amm))e.amm=get(1);
  const modern=empty(get(8))&&!empty(get(7));
  if(modern){
    for(const [field,index]of [['token_program',0],['amm_authority',2],['pool_coin_token_account',3],['pool_pc_token_account',4],['user_source_token_account',5],['user_destination_token_account',6],['user_source_owner',7]]as const){if(empty(e[field]))e[field]=get(index);}
  }else if(empty(e.user_source_owner)){e.user_source_owner=empty(get(17))?get(16):get(17);}
}

export function fillRaydiumAmmV4DepositAccounts(
  e: RaydiumAmmV4DepositEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.token_program || e.token_program === zero) e.token_program = get(0);
  if (!e.amm_authority || e.amm_authority === zero) e.amm_authority = get(2);
}

export function fillRaydiumAmmV4WithdrawAccounts(
  e: RaydiumAmmV4WithdrawEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.token_program || e.token_program === zero) e.token_program = get(0);
  if (!e.amm_authority || e.amm_authority === zero) e.amm_authority = get(2);
  if (!e.amm_open_orders || e.amm_open_orders === zero) e.amm_open_orders = get(3);
}
