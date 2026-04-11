import "dotenv/config";

/**
 * gRPC 示例与 `scripts/test-grpc-ts.ts` / `scripts/debug-grpc-ts.ts` 共用：仅使用 **GRPC_URL**、**GRPC_TOKEN**。
 * 启动时会加载当前工作目录下的 `.env`（由 `dotenv` 注入 `process.env`，不覆盖已有环境变量）。
 * 任一未设置或为空字符串则打印错误并 `process.exit(1)`。
 */
export function requireGrpcEnv(): { ENDPOINT: string; X_TOKEN: string } {
  const ENDPOINT = (process.env.GRPC_URL ?? "").trim();
  const X_TOKEN = (process.env.GRPC_TOKEN ?? "").trim();

  if (!ENDPOINT) {
    console.error(
      "Error: GRPC_URL is required.\n" +
        "  Copy .env.example to .env in the package root and set GRPC_URL (and GRPC_TOKEN), or:\n" +
        "  export GRPC_URL=https://your-yellowstone-host:443"
    );
    process.exit(1);
  }
  if (!X_TOKEN) {
    console.error(
      "Error: GRPC_TOKEN is required (x-token header for the gRPC endpoint).\n" +
        "  Copy .env.example to .env in the package root and set GRPC_TOKEN, or:\n" +
        "  export GRPC_TOKEN=<your_token>"
    );
    process.exit(1);
  }

  return { ENDPOINT, X_TOKEN };
}
