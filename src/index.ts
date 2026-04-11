export type { DexEvent } from "./core/dex_event.js";
export { bigintToJsonReplacer, dexEventToJsonString } from "./core/json_utils.js";
export type { EventMetadata } from "./core/metadata.js";
export type { ParseError } from "./core/error.js";
export { formatParseError } from "./core/error.js";

export {
  parseTransactionEvents,
  parseLogsOnly,
  parseTransactionWithListener,
  parseTransactionEventsStreaming,
  parseLogsStreaming,
  parseTransactionWithStreamingListener,
  parseLog,
  nowUs,
  type EventListener,
  type StreamingEventListener,
} from "./core/unified_parser.js";

export { warmupParser, isWarmedUp } from "./warmup.js";
export {
  parseTransactionFromRpc,
  parseRpcTransaction,
  fillAccountsFromTransactionDataRpc,
  fillDataRpc,
  applyAccountFillsToLogEvents,
} from "./rpc_parser.js";
export { parseDexEventsFromGrpcTransactionInfo } from "./grpc/yellowstone_parse.js";

export {
  type OrderMode,
  type ClientConfig,
  type TransactionFilter,
  type EventType,
  type EventTypeFilter,
  defaultClientConfig,
  newTransactionFilter,
  eventTypeFilterIncludeOnly,
  eventTypeFilterExclude,
  eventTypeFilterIncludesPumpfun,
  eventTypeFilterIncludesPumpswap,
  eventTypeFilterIncludesMeteoraDammV2,
  eventTypeFilterAllowsInstructionParsing,
} from "./grpc/types.js";

export { parseLogUnified, parseLogOptimized } from "./logs/optimized_matcher.js";
export { parseMeteoraDammLog, parseInitializePoolEvent } from "./logs/meteora_damm.js";
export {
  PROGRAM_LOG_DISC,
  PUMPSWAP_DISC,
  u64leDiscriminator,
  type ProgramLogDiscriminatorKey,
} from "./logs/program_log_discriminators.js";
export type { ParsedEvent } from "./parser_alias.js";

export {
  parseAccountUnified,
  type AccountData,
  parseNonceAccount,
  isNonceAccount,
  parseTokenAccount,
  parsePumpswapGlobalConfig,
  parsePumpswapPool,
  parsePumpswapAccount,
  isGlobalConfigAccount,
  isPoolAccount,
  hasDiscriminator,
} from "./accounts/mod.js";

export {
  parseInstructionUnified,
  parsePumpfunInstruction,
  parsePumpswapInstruction,
  parseMeteoraDammInstruction,
} from "./instr/mod.js";

export * as programIds from "./instr/program_ids.js";

export { YellowstoneGrpc, type SubscribeCallbacks } from "./grpc/client.js";
