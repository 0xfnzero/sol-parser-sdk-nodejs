#!/usr/bin/env node
/**
 * 校验 `discriminator_lut` 与 Rust `discriminator_lut` 测试向量一致。
 */
import { PROGRAM_LOG_DISC } from "../src/logs/program_log_discriminators.js";
import {
  discriminatorToName,
  discriminatorToProtocol,
  lookupDiscriminator,
} from "../src/logs/discriminator_lut.js";

function fail(msg: string): never {
  console.error(`[check-discriminator-lut] ${msg}`);
  process.exit(1);
}

function main() {
  // 与 Rust `discriminator_lut` 单测同一批事件；数值以 PROGRAM_LOG_DISC 为权威（little-endian u64）
  const pumpfunCreate = PROGRAM_LOG_DISC.PUMPFUN_CREATE;
  if (discriminatorToName(pumpfunCreate) !== "PUMPFUN_CREATE") {
    fail(`PumpFun Create 名称: 期望 PUMPFUN_CREATE，得到 ${discriminatorToName(pumpfunCreate)}`);
  }
  if (discriminatorToProtocol(pumpfunCreate) !== "PumpFun") {
    fail(`PumpFun Create 协议: 期望 PumpFun，得到 ${discriminatorToProtocol(pumpfunCreate)}`);
  }

  const raydiumClmmSwap = PROGRAM_LOG_DISC.RAYDIUM_CLMM_SWAP;
  if (discriminatorToName(raydiumClmmSwap) !== "RAYDIUM_CLMM_SWAP") {
    fail(`Raydium CLMM Swap 名称不一致`);
  }
  if (discriminatorToProtocol(raydiumClmmSwap) !== "RaydiumClmm") {
    fail(`Raydium CLMM Swap 协议不一致`);
  }

  const pumpswapBuy = PROGRAM_LOG_DISC.PUMPSWAP_BUY;
  if (discriminatorToName(pumpswapBuy) !== "PUMPSWAP_BUY") fail("PumpSwap Buy 名称不一致");
  if (discriminatorToProtocol(pumpswapBuy) !== "PumpSwap") fail("PumpSwap Buy 协议不一致");

  const orcaTraded = PROGRAM_LOG_DISC.ORCA_TRADED;
  if (discriminatorToProtocol(orcaTraded) !== "OrcaWhirlpool") fail("Orca Traded 协议不一致");

  const unknown = 0xffffffffffffffffn;
  if (lookupDiscriminator(unknown) !== undefined) fail("未知 discriminator 应返回 undefined");

  const info = lookupDiscriminator(PROGRAM_LOG_DISC.METEORA_DAMM_SWAP);
  if (!info || info.protocol !== "MeteoraDamm" || info.name !== "METEORA_DAMM_SWAP") {
    fail("lookupDiscriminator(METEORA_DAMM_SWAP) 不完整");
  }

  console.log("[check-discriminator-lut] OK：与 Rust 测试向量及 PROGRAM_LOG_DISC 一致");
}

main();
