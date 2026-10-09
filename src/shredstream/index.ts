/**
 * Jito ShredStream 超低延迟订阅（与 Rust `sol-parser-sdk::shredstream` 对齐）。
 *
 * 限制（与 Rust `shredstream/mod.rs` 文档一致）：
 * - ALT 仅使用预热缓存；启用缓存后 miss 会跳过该交易并记录 altCacheMissTransactions，不回放
 * - 无 inner instructions，无法 CPI 解析
 * - 无 block_time
 * - 无交易日志（program logs）；客户端使用外层指令解析。未配置 ALT 缓存时保留静态账户 best-effort 行为。
 * - `metadata.tx_index` 为**单条 gRPC `Entry` 消息内**跨所有 Solana `Entry` 分组的连续下标（与 golang `shredstream_entries` 扁平 `ti` 对齐），非 slot 级全局序号
 */
export {
  type ShredStreamConfig,
  defaultShredStreamConfig,
  lowLatencyShredStreamConfig,
  highThroughputShredStreamConfig,
} from "./config.js";
export {
  ShredStreamClient,
  ShredEventQueue,
  type ShredStreamReceiveStats,
} from "./client.js";
export {
  dexEventsFromShredWasmTx,
  dexEventsFromShredWasmTxWithFullKeys,
  type ShredWasmTx,
  type ShredWasmCompiledIx,
} from "./instruction_parse.js";
export { fullAccountKeyStringsFromShredTx, loadAddressLookupTableAccounts } from "./alt_lookup.js";
export type { SubscribeEntriesRequest, ShredstreamEntryMessage } from "./proto_types.js";
export {
  bincodeVecEntryCount,
  decodeEntriesBincodeFlat,
  decodeEntriesBincodeNested,
  decodeShredstreamEntriesBincode,
  type DecodedWireTransaction,
} from "./entries_decode.js";
export { wireBytesToShredWasmTx } from "./wire_to_shred_tx.js";

export { AddressLookupTableCache } from "./alt_cache.js";
