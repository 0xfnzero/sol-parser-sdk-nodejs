/** 当前时间微秒戳（用于 `grpc_recv_us`） */
export function nowUs(): number {
  return Math.floor(Date.now() * 1000);
}

/** 与 Rust `now_micros` 一致（别名） */
export const nowMicros = nowUs;

/** 与 Rust `now_nanos` 同语义：墙钟纳秒（`Date` 精度为毫秒，纳秒位为推算值） */
export function nowNanos(): bigint {
  return BigInt(Math.floor(Date.now() * 1_000_000));
}

/** 与 Rust `elapsed_micros_since` 一致 */
export function elapsedMicrosSince(startUs: number): number {
  return nowUs() - startUs;
}
