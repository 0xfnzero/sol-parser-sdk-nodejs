/** 当前时间微秒戳（用于 `grpc_recv_us`） */
export function nowUs(): number {
  return Math.floor(Date.now() * 1000);
}
