/**
 * Jito ShredStream 超低延迟订阅（与 Rust `sol-parser-sdk::shredstream` 对齐）。
 *
 * 限制（与 Rust `shredstream/mod.rs` 文档一致）：
 * - 仅静态账户键；使用 ALT 的交易账户列表不完整
 * - 无 inner instructions，无法 CPI 解析
 * - 无 block_time
 * - 无交易日志（program logs）；客户端对每条交易走 **外层 `parseInstructionUnified`**（与 gRPC 指令解析同源），可产出 `DexEvent`（V0+ALT 若账户下标超出静态表则跳过该指令）
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
