#!/usr/bin/env node
/**
 * 对比 `src/logs/program_log_discriminators.ts` 与 scripts/program-log-discriminators.json。
 * 通过 tsx 直接加载源码，无需先 build。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toBig(bytes) {
  if (!Array.isArray(bytes) || bytes.length !== 8) {
    throw new Error("每条条目须为长度 8 的 number[]");
  }
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i];
  return new DataView(u8.buffer).getBigUint64(0, true);
}

async function main() {
  const snapPath = path.join(__dirname, "program-log-discriminators.json");
  const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
  const { PUMPSWAP_DISC, PROGRAM_LOG_DISC } = await import("../src/logs/program_log_discriminators.js");

  let failed = false;

  const ps = snap.PUMPSWAP_DISC;
  for (const k of Object.keys(ps)) {
    const exp = toBig(ps[k]);
    const act = PUMPSWAP_DISC[k];
    if (act !== exp) {
      console.error(`[verify-discriminators] PUMPSWAP_DISC.${k} 快照 ${exp} !== 实现 ${act}`);
      failed = true;
    }
  }

  const pl = snap.PROGRAM_LOG_DISC;
  const snapKeys = Object.keys(pl).sort();
  const implKeys = Object.keys(PROGRAM_LOG_DISC).sort();
  if (snapKeys.join(",") !== implKeys.join(",")) {
    console.error("[verify-discriminators] PROGRAM_LOG_DISC 键集合不一致");
    console.error("  仅快照:", snapKeys.filter((k) => !implKeys.includes(k)));
    console.error("  仅实现:", implKeys.filter((k) => !snapKeys.includes(k)));
    failed = true;
  }

  for (const k of snapKeys) {
    const exp = toBig(pl[k]);
    const act = PROGRAM_LOG_DISC[k];
    if (act !== exp) {
      console.error(`[verify-discriminators] PROGRAM_LOG_DISC.${k} 快照 ${exp} !== 实现 ${act}`);
      failed = true;
    }
  }

  if (failed) {
    console.error("[verify-discriminators] 请同步 src/logs/program_log_discriminators.ts 与 scripts/program-log-discriminators.json");
    process.exit(1);
  }
  console.log(`[verify-discriminators] OK：PUMPSWAP_DISC ${Object.keys(ps).length} + PROGRAM_LOG_DISC ${snapKeys.length} 条与快照一致`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
