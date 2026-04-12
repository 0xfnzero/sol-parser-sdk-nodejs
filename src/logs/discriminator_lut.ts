/**
 * 与 Rust `logs::discriminator_lut` 中的名称 / 协议查询对齐（基于 `PROGRAM_LOG_DISC`，含 PumpSwap 子表）。
 * 不含 `parse_with_discriminator`：完整数据路径请用 `parseLogOptimized` / `parse_log_optimized`。
 */
import { PROGRAM_LOG_DISC } from "./program_log_discriminators.js";

/** 与 Rust `discriminator_lut::Protocol` 变体名一致（字符串联合，便于 JSON / 日志）。 */
export type LogProtocol =
  | "PumpFun"
  | "PumpSwap"
  | "RaydiumClmm"
  | "RaydiumCpmm"
  | "RaydiumAmm"
  | "OrcaWhirlpool"
  | "MeteoraAmm"
  | "MeteoraDamm";

function protocolForProgramLogKey(key: string): LogProtocol {
  if (key.startsWith("PUMPFUN_")) return "PumpFun";
  if (key.startsWith("PUMPSWAP_")) return "PumpSwap";
  if (key.startsWith("RAYDIUM_CLMM_")) return "RaydiumClmm";
  if (key.startsWith("RAYDIUM_CPMM_")) return "RaydiumCpmm";
  if (key.startsWith("RAYDIUM_AMM_")) return "RaydiumAmm";
  if (key.startsWith("ORCA_")) return "OrcaWhirlpool";
  if (key.startsWith("METEORA_AMM_")) return "MeteoraAmm";
  if (key.startsWith("METEORA_DAMM_")) return "MeteoraDamm";
  throw new Error(`discriminator_lut: 无法从键推断协议: ${key}`);
}

const NAME_BY_DISC = new Map<bigint, string>();
const PROTOCOL_BY_DISC = new Map<bigint, LogProtocol>();

for (const [name, disc] of Object.entries(PROGRAM_LOG_DISC)) {
  NAME_BY_DISC.set(disc, name);
  PROTOCOL_BY_DISC.set(disc, protocolForProgramLogKey(name));
}

/** Rust `discriminator_to_name` */
export function discriminatorToName(discriminator: bigint): string | undefined {
  return NAME_BY_DISC.get(discriminator);
}

/** Rust `discriminator_to_protocol` */
export function discriminatorToProtocol(discriminator: bigint): LogProtocol | undefined {
  return PROTOCOL_BY_DISC.get(discriminator);
}

export type LutDiscriminatorInfo = { discriminator: bigint; name: string; protocol: LogProtocol };

/** Rust `lookup_discriminator`（无 parser 函数指针；含 `protocol`） */
export function lookupDiscriminator(discriminator: bigint): LutDiscriminatorInfo | undefined {
  const name = NAME_BY_DISC.get(discriminator);
  if (name === undefined) return undefined;
  const protocol = PROTOCOL_BY_DISC.get(discriminator);
  if (protocol === undefined) return undefined;
  return { discriminator, name, protocol };
}

/** Rust `discriminator_to_name` */
export const discriminator_to_name = discriminatorToName;

/** Rust `discriminator_to_protocol` */
export const discriminator_to_protocol = discriminatorToProtocol;

/** Rust `lookup_discriminator` */
export const lookup_discriminator = lookupDiscriminator;
