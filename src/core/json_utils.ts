/**
 * `JSON.stringify` 默认无法处理 `bigint`。
 * 下列工具将树中所有 `bigint` 转为十进制字符串，便于与 Go `DexEvent` / Python 字典经 JSON 输出对齐。
 */

/** 供 `JSON.stringify(value, replacer)` 使用 */
export function bigintToJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** 将含 `bigint` 的值序列化为 JSON 字符串（`DexEvent`、元数据等） */
export function dexEventToJsonString(value: unknown, space?: string | number): string {
  return JSON.stringify(value, bigintToJsonReplacer, space);
}
