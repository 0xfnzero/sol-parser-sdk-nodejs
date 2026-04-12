/**
 * ShredStream 示例共用 CLI：端点 / RPC 解析、`--help`。
 *
 * 优先级（由高到低）：
 * 1. `--url=<endpoint>` / `-u <endpoint>` / `--endpoint=<endpoint>`
 * 2. 环境变量 `SHREDSTREAM_URL` 或 `SHRED_URL`
 * 3. `defaultUrl`
 */

const URL_FLAGS = new Set(["--url", "-u", "--endpoint"]);

/** 若 argv 含 `-h` / `--help`，打印说明后 `process.exit(0)` */
export function exitIfShredstreamHelpRequested(
  argv: readonly string[],
  lines: readonly string[]
): void {
  if (!argv.some((a) => a === "-h" || a === "--help")) return;
  for (const line of lines) console.log(line);
  process.exit(0);
}

export function parseShredstreamEndpoint(
  argv: readonly string[],
  defaultUrl = "http://127.0.0.1:10800"
): string {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (URL_FLAGS.has(a)) {
      const v = argv[i + 1]?.trim();
      if (v) return v;
    }
    if (a.startsWith("--url=")) return a.slice("--url=".length).trim();
    if (a.startsWith("--endpoint=")) return a.slice("--endpoint=".length).trim();
  }
  const fromEnv =
    process.env.SHREDSTREAM_URL?.trim() ||
    process.env.SHRED_URL?.trim() ||
    "";
  return fromEnv || defaultUrl;
}

/** PumpFun 示例：`--rpc=` / `-r` > `RPC_URL` > default */
export function parseOptionalRpcUrl(
  argv: readonly string[],
  defaultRpc = "https://api.mainnet-beta.solana.com"
): string {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--rpc" || a === "-r") {
      const v = argv[i + 1]?.trim();
      if (v) return v;
    }
    if (a.startsWith("--rpc=")) return a.slice("--rpc=".length).trim();
  }
  return process.env.RPC_URL?.trim() || defaultRpc;
}
