/**
 * 校验 `dexEventToJsonString` 对嵌套 `bigint` 的序列化（与 Go/Python 十进制字符串管线一致）。
 */
import { dexEventToJsonString } from "../src/core/json_utils.js";

const ev = {
  RaydiumClmmSwap: {
    sqrt_price_x64: 12345678901234567890n,
    liquidity: 0n,
  },
};
const s = dexEventToJsonString(ev);
const j = JSON.parse(s);
if (j.RaydiumClmmSwap.sqrt_price_x64 !== "12345678901234567890") {
  console.error("[check-json-utils] sqrt_price_x64 序列化不符:", s);
  process.exit(1);
}
if (j.RaydiumClmmSwap.liquidity !== "0") {
  console.error("[check-json-utils] liquidity 序列化不符:", s);
  process.exit(1);
}

const dlmm = {
  MeteoraDlmmSwap: {
    fee_bps: 42424242424242424242424242424242n,
    fee: 0n,
    protocol_fee: 0n,
    host_fee: 0n,
    amount_in: 0n,
    amount_out: 0n,
  },
};
const s2 = dexEventToJsonString(dlmm);
const j2 = JSON.parse(s2);
if (j2.MeteoraDlmmSwap.fee_bps !== "42424242424242424242424242424242") {
  console.error("[check-json-utils] MeteoraDlmmSwap.fee_bps 序列化不符:", s2);
  process.exit(1);
}

console.log("[check-json-utils] OK");
