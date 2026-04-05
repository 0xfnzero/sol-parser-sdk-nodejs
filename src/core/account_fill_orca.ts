/** Orca Whirlpool 账户填充 */
import type {
  OrcaWhirlpoolLiquidityDecreasedEvent,
  OrcaWhirlpoolLiquidityIncreasedEvent,
  OrcaWhirlpoolSwapEvent,
} from "./dex_event.js";
import { defaultPubkey } from "./dex_event.js";

const Z = () => defaultPubkey();

export function fillOrcaWhirlpoolSwapAccounts(
  _e: OrcaWhirlpoolSwapEvent,
  _get: (i: number) => string
): void {}

export function fillOrcaWhirlpoolLiquidityIncreasedAccounts(
  e: OrcaWhirlpoolLiquidityIncreasedEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.position || e.position === zero) e.position = get(3);
}

export function fillOrcaWhirlpoolLiquidityDecreasedAccounts(
  e: OrcaWhirlpoolLiquidityDecreasedEvent,
  get: (i: number) => string
): void {
  const zero = Z();
  if (!e.position || e.position === zero) e.position = get(3);
}
