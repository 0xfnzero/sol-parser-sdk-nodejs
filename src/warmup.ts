import { decodeProgramDataLine } from "./logs/program_data.js";

let warmed = false;

/** 预热 Base64 解码与热路径 */
export function warmupParser(): void {
  if (warmed) return;
  warmed = true;
  decodeProgramDataLine("Program data: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  const dummy = "Program data: Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke [1]";
  dummy.includes("Program data:");
  dummy.includes("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
  dummy.includes("pumpswap");
  dummy.includes("PumpSwap");
  dummy.includes("whirL");
  dummy.includes("meteora");
}

export function isWarmedUp(): boolean {
  return warmed;
}
