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

export function fillMeteoraDammV2SwapAccounts(
  _e: MeteoraDammV2SwapEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDammV2CreatePositionAccounts(
  _e: MeteoraDammV2CreatePositionEvent,
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

export function fillMeteoraDammV2InitializePoolAccounts(
  _e: MeteoraDammV2InitializePoolEvent,
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
  _e: MeteoraDlmmSwapEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDlmmAddLiquidityAccounts(
  _e: MeteoraDlmmAddLiquidityEvent,
  _get: (i: number) => string
): void {}

export function fillMeteoraDlmmRemoveLiquidityAccounts(
  _e: MeteoraDlmmRemoveLiquidityEvent,
  _get: (i: number) => string
): void {}
