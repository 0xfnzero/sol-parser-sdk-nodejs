export {
  DEFAULT_CHANNEL_SIZE,
  DEFAULT_CONNECT_TIMEOUT,
  DEFAULT_MAX_DECODING_MESSAGE_SIZE,
  DEFAULT_METRICS_PRINT_INTERVAL_SECONDS,
  DEFAULT_METRICS_WINDOW_SECONDS,
  DEFAULT_REQUEST_TIMEOUT,
  SLOW_PROCESSING_THRESHOLD_US,
} from "./common/constants.js";

export type { DexEvent } from "./core/dex_event.js";
export { metadataForDexEvent, defaultPubkey } from "./core/dex_event.js";
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
  parseLog as parse_log,
  nowUs,
  type EventListener,
  type StreamingEventListener,
} from "./core/unified_parser.js";

export { nowMicros, nowNanos, elapsedMicrosSince } from "./core/clock.js";

export {
  AccountPubkeyCache,
  buildAccountPubkeysWithCache,
  buildAccountPubkeysWithCache as build_account_pubkeys_with_cache,
} from "./core/account_pubkey_cache.js";

export { warmupParser, isWarmedUp } from "./warmup.js";
export {
  parseTransactionFromRpc,
  parseRpcTransaction,
  fillAccountsFromTransactionDataRpc,
  fillDataRpc,
  applyAccountFillsToLogEvents,
  convertRpcToGrpc,
  convert_rpc_to_grpc,
  type ConvertRpcToGrpcOk,
  type ConvertRpcToGrpcErr,
} from "./rpc_parser.js";
export {
  parseDexEventsFromGrpcTransactionInfo,
  grpcTxIndexFromInfo,
} from "./grpc/yellowstone_parse.js";

export {
  pubkeyBytesToBs58,
  collectAccountKeysBs58,
  lamportBalanceDeltas,
  heuristicSolCounterpartiesForWatchedKeys,
  tokenBalanceRawAmount,
  splTokenCounterpartyByOwner,
  collectWatchTransferCounterpartyPairs,
  tryYellowstoneSignature,
} from "./grpc/transaction_meta.js";

/** Rust `grpc::transaction_meta` 蛇形命名别名（便于从 Rust 迁移） */
export {
  pubkeyBytesToBs58 as pubkey_bytes_to_bs58,
  collectAccountKeysBs58 as collect_account_keys_bs58,
  lamportBalanceDeltas as lamport_balance_deltas,
  heuristicSolCounterpartiesForWatchedKeys as heuristic_sol_counterparties_for_watched_keys,
  tokenBalanceRawAmount as token_balance_raw_amount,
  splTokenCounterpartyByOwner as spl_token_counterparty_by_owner,
  collectWatchTransferCounterpartyPairs as collect_watch_transfer_counterparty_pairs,
  tryYellowstoneSignature as try_yellowstone_signature,
} from "./grpc/transaction_meta.js";

export {
  type OrderMode,
  type Protocol,
  type ClientConfig,
  type StreamingConfig,
  type TransactionFilter,
  type AccountFilter,
  type AccountFilterData,
  type AccountFilterMemcmp,
  type SlotFilter,
  type EventType,
  type StreamingEventType,
  type EventTypeFilter,
  defaultClientConfig,
  lowLatencyClientConfig,
  highThroughputClientConfig,
  newTransactionFilter,
  transactionFilterFromProgramIds,
  newAccountFilter,
  newSlotFilter,
  slotFilterMinSlot,
  slotFilterMaxSlot,
  accountFilterFromProgramOwners,
  accountFilterMemcmp,
  eventTypeFilterIncludeOnly,
  eventTypeFilterExclude,
  eventTypeFilterIncludesPumpfun,
  eventTypeFilterIncludesPumpswap,
  eventTypeFilterIncludesMeteoraDammV2,
  eventTypeFilterIncludesRaydiumClmm,
  eventTypeFilterIncludesRaydiumCpmm,
  eventTypeFilterIncludesRaydiumAmmV4,
  eventTypeFilterIncludesOrcaWhirlpool,
  eventTypeFilterIncludesBonk,
  eventTypeFilterIncludesRaydiumLaunchpad,
  eventTypeFilterAllowsInstructionParsing,
  ALL_EVENT_TYPES,
} from "./grpc/types.js";

export { ALL_EVENT_TYPES as all_event_types } from "./grpc/types.js";

export type { StreamingConfig as streaming_config } from "./grpc/types.js";

export {
  PROTOCOL_PROGRAM_IDS,
  PUMPFUN_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
  PUMPSWAP_FEES_PROGRAM_ID,
  BONK_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  METEORA_POOLS_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
  getProgramIdsForProtocols,
  transactionFilterForProtocols,
  accountFilterForProtocols,
} from "./grpc/program_ids.js";

export {
  PROTOCOL_PROGRAM_IDS as protocol_program_ids,
  getProgramIdsForProtocols as get_program_ids_for_protocols,
  transactionFilterForProtocols as transaction_filter_for_protocols,
  accountFilterForProtocols as account_filter_for_protocols,
} from "./grpc/program_ids.js";

/** Rust `grpc::types` 蛇形命名别名 */
export {
  defaultClientConfig as default_client_config,
  lowLatencyClientConfig as low_latency_client_config,
  highThroughputClientConfig as high_throughput_client_config,
  newTransactionFilter as new_transaction_filter,
  transactionFilterFromProgramIds as transaction_filter_from_program_ids,
  newAccountFilter as new_account_filter,
  newSlotFilter as new_slot_filter,
  slotFilterMinSlot as slot_filter_min_slot,
  slotFilterMaxSlot as slot_filter_max_slot,
  accountFilterFromProgramOwners as account_filter_from_program_owners,
  accountFilterMemcmp as account_filter_memcmp,
  eventTypeFilterIncludeOnly as event_type_filter_include_only,
  eventTypeFilterExclude as event_type_filter_exclude,
  eventTypeFilterIncludeOnly as include_only,
  eventTypeFilterExclude as exclude_types,
} from "./grpc/types.js";

export {
  buildSubscribeRequest,
  buildSubscribeRequestWithCommitment,
  buildSubscribeTransactionFiltersNamed,
  CommitmentLevel,
} from "./grpc/subscribe_builder.js";

/** Rust `grpc::subscribe_builder` 蛇形命名 */
export {
  buildSubscribeRequest as build_subscribe_request,
  buildSubscribeRequestWithCommitment as build_subscribe_request_with_commitment,
  buildSubscribeTransactionFiltersNamed as build_subscribe_transaction_filters_named,
} from "./grpc/subscribe_builder.js";

export { parseLogUnified, parseLogOptimized } from "./logs/optimized_matcher.js";

/** Rust `logs` 蛇形命名别名（`parse_meteora_damm_log` 等） */
export {
  parse_meteora_damm_log,
  parse_meteora_dlmm_log,
  parse_log_optimized,
  parse_log_unified,
} from "./logs/rust_aliases.js";

/** 与 Rust `logs::discriminator_lut` 名称 / 协议查询对齐 */
export {
  discriminatorToName,
  discriminator_to_name,
  discriminatorToProtocol,
  discriminator_to_protocol,
  lookupDiscriminator,
  lookup_discriminator,
  type LogProtocol,
  type LutDiscriminatorInfo,
} from "./logs/discriminator_lut.js";
export { parseMeteoraDammLog } from "./logs/meteora_damm.js";
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
  userWalletPubkeyForOnchainAccount,
  rpcResolveUserWalletPubkey,
} from "./accounts/mod.js";

/** Rust `accounts` 蛇形命名别名 */
export {
  parse_account_unified,
  parse_nonce_account,
  parse_token_account,
  parse_pumpswap_global_config,
  parse_pumpswap_pool,
  rpc_resolve_user_wallet_pubkey,
  user_wallet_pubkey_for_onchain_account,
} from "./accounts/rust_aliases.js";

export {
  parseInstructionUnified,
  parsePumpfunInstruction,
  parsePumpswapInstruction,
  parseMeteoraDammInstruction,
} from "./instr/mod.js";

/** Rust `instr` 根模块蛇形命名别名 */
export {
  parse_instruction_unified,
  parse_pumpfun_instruction,
  parse_pumpswap_instruction,
  parse_meteora_damm_instruction,
} from "./instr/rust_aliases.js";

export * as programIds from "./instr/program_ids.js";

export { YellowstoneGrpc, type SubscribeCallbacks } from "./grpc/client.js";

export {
  connectYellowstoneGeyser,
  defaultGeyserConnectConfig,
  geyserGrpcChannelOptions,
  type GeyserConnectConfig,
} from "./grpc/geyser_connect.js";

/** 与 Rust `sol_parser_sdk::grpc::event_parser` 模块对应 */
export * as event_parser from "./grpc/event_parser.js";

export {
  connectYellowstoneGeyser as connect_yellowstone_geyser,
  defaultGeyserConnectConfig as default_geyser_connect_config,
  geyserGrpcChannelOptions as geyser_grpc_channel_options,
} from "./grpc/geyser_connect.js";

export {
  ShredStreamClient,
  ShredEventQueue,
  dexEventsFromShredWasmTx,
  dexEventsFromShredWasmTxWithFullKeys,
  fullAccountKeyStringsFromShredTx,
  loadAddressLookupTableAccounts,
  type ShredStreamReceiveStats,
  type ShredWasmTx,
  type ShredWasmCompiledIx,
  type ShredStreamConfig,
  defaultShredStreamConfig,
  lowLatencyShredStreamConfig,
  highThroughputShredStreamConfig,
  type SubscribeEntriesRequest,
  type ShredstreamEntryMessage,
} from "./shredstream/index.js";

export {
  defaultShredStreamConfig as default_shred_stream_config,
  lowLatencyShredStreamConfig as low_latency_shred_stream_config,
  highThroughputShredStreamConfig as high_throughput_shred_stream_config,
} from "./shredstream/index.js";
