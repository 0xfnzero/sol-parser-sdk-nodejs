#!/usr/bin/env node
/**
 * 校验 `src/core/dex_event.ts` 中的 DexEvent 联合键名与本仓库快照
 * `scripts/dex-event-variant-names.json` 完全一致（不读取任何外部语言源码）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseTsVariantKeys(tsSrc) {
  const names = new Set();
  const re = /\|\s*\{\s*([A-Za-z0-9_]+)\s*:/g;
  let m;
  while ((m = re.exec(tsSrc)) !== null) {
    names.add(m[1]);
  }
  return names;
}

function main() {
  const tsPath = path.join(__dirname, "../src/core/dex_event.ts");
  const snapshotPath = path.join(__dirname, "dex-event-variant-names.json");

  const tsSrc = fs.readFileSync(tsPath, "utf8");
  const tsKeys = parseTsVariantKeys(tsSrc);

  if (!fs.existsSync(snapshotPath)) {
    console.error(`[check-dex-event-parity] 缺少快照文件：${snapshotPath}`);
    process.exit(1);
  }

  const snap = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const expected = snap.variants;
  if (!Array.isArray(expected)) {
    console.error("[check-dex-event-parity] dex-event-variant-names.json 缺少 variants 数组");
    process.exit(1);
  }

  const expectedSet = new Set(expected);
  const onlySnapshot = [...expectedSet].filter((k) => !tsKeys.has(k)).sort();
  const onlyTs = [...tsKeys].filter((k) => !expectedSet.has(k)).sort();

  if (expected.length !== expectedSet.size) {
    console.error("[check-dex-event-parity] 快照 variants 含重复项");
    process.exit(1);
  }

  if (onlySnapshot.length === 0 && onlyTs.length === 0) {
    console.log(
      `[check-dex-event-parity] OK：DexEvent 键名与快照一致（共 ${tsKeys.size} 个）`
    );
    process.exit(0);
  }

  console.error("[check-dex-event-parity] DexEvent 键名与快照 dex-event-variant-names.json 不一致：");
  if (onlySnapshot.length) {
    console.error("  仅在快照中（TS 缺）：", onlySnapshot.join(", "));
  }
  if (onlyTs.length) {
    console.error("  仅在 TS 中（快照缺）：", onlyTs.join(", "));
  }
  console.error("  请同步修改 dex_event.ts 与 scripts/dex-event-variant-names.json。");
  process.exit(1);
}

main();
