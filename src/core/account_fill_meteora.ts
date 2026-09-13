/** Meteora DAMM V2 / Pools / DLMM 账户填充（部分占位） */
import type {
  MeteoraDammV2AddLiquidityEvent,
  MeteoraDammV2ClosePositionEvent,
  MeteoraDammV2CreatePositionEvent,
  MeteoraDammV2InitializePoolEvent,
  MeteoraDammV2RemoveLiquidityEvent,
  MeteoraDammV2SwapEvent,
  MeteoraDlmmAddLiquidityEvent,
  MeteoraDlmmRemoveLiquidityEvent,
  MeteoraDlmmSwapEvent,
  MeteoraPoolsAddLiquidityEvent,
  MeteoraPoolsRemoveLiquidityEvent,
  MeteoraPoolsSwapEvent,
} from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

/** 预留：gRPC+meta 全量路径若需从 account_keys 补 vault，应对齐 cp_amm `swap` 账户顺序（IDL 中 vault/mint/token program 下标） */
export function fillMeteoraDammV2SwapAccounts(
  _e: MeteoraDammV2SwapEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDammV2CreatePositionAccounts(
  _e: MeteoraDammV2CreatePositionEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDammV2InitializePoolAccounts(
  _e: MeteoraDammV2InitializePoolEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDammV2ClosePositionAccounts(
  _e: MeteoraDammV2ClosePositionEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDammV2AddLiquidityAccounts(
  _e: MeteoraDammV2AddLiquidityEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDammV2RemoveLiquidityAccounts(
  _e: MeteoraDammV2RemoveLiquidityEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraPoolsSwapAccounts(
  _e: MeteoraPoolsSwapEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraPoolsAddLiquidityAccounts(
  _e: MeteoraPoolsAddLiquidityEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraPoolsRemoveLiquidityAccounts(
  _e: MeteoraPoolsRemoveLiquidityEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDlmmSwapAccounts(
  e: MeteoraDlmmSwapEvent,
  get: (i: number) => string
): void {
  const zero = defaultPubkey();
  if (!e.user_token_in || e.user_token_in === zero) e.user_token_in = get(4);
  if (!e.user_token_out || e.user_token_out === zero) e.user_token_out = get(5);
  if (!e.token_x_mint || e.token_x_mint === zero) e.token_x_mint = get(6);
  if (!e.token_y_mint || e.token_y_mint === zero) e.token_y_mint = get(7);
}

export function fillMeteoraDlmmAddLiquidityAccounts(
  _e: MeteoraDlmmAddLiquidityEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDlmmRemoveLiquidityAccounts(
  _e: MeteoraDlmmRemoveLiquidityEvent,
  _get: (i: number) => string
): void {}
