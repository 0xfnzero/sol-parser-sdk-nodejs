// Yellowstone protocol shapes, adapted from rpcpool/yellowstone-grpc 7.0.0 (Apache-2.0).
import type {BlockHeight,Rewards,Transaction,TransactionError,TransactionStatusMeta,UnixTimestamp} from "./solana-storage.js";
export enum CommitmentLevel {
    PROCESSED = 0,
    CONFIRMED = 1,
    FINALIZED = 2,
    UNRECOGNIZED = -1
}
export enum SlotStatus {
    SLOT_PROCESSED = 0,
    SLOT_CONFIRMED = 1,
    SLOT_FINALIZED = 2,
    SLOT_FIRST_SHRED_RECEIVED = 3,
    SLOT_COMPLETED = 4,
    SLOT_CREATED_BANK = 5,
    SLOT_DEAD = 6,
    UNRECOGNIZED = -1
}
export enum CuckooHashAlgorithm {
    SIP_HASH = 0,
    UNRECOGNIZED = -1
}
export enum TokenAccountExpansionControlFlag {
    /** ALL - Match an owner if it owns a pre OR post token balance on the tx. */
    ALL = 0,
    /**
     * BALANCE_CHANGED - Match an owner whose token balance changed in amount (per
     * `account_index`) or whose token account was closed.
     */
    BALANCE_CHANGED = 1,
    UNRECOGNIZED = -1
}
export interface SubscribeRequest {
    accounts: {
        [key: string]: SubscribeRequestFilterAccounts;
    };
    slots: {
        [key: string]: SubscribeRequestFilterSlots;
    };
    transactions: {
        [key: string]: SubscribeRequestFilterTransactions;
    };
    transactionsStatus: {
        [key: string]: SubscribeRequestFilterTransactions;
    };
    blocks: {
        [key: string]: SubscribeRequestFilterBlocks;
    };
    blocksMeta: {
        [key: string]: SubscribeRequestFilterBlocksMeta;
    };
    entry: {
        [key: string]: SubscribeRequestFilterEntry;
    };
    commitment?: CommitmentLevel | undefined;
    accountsDataSlice: SubscribeRequestAccountsDataSlice[];
    ping?: SubscribeRequestPing | undefined;
    fromSlot?: string | undefined;
}
export interface SubscribeRequest_AccountsEntry {
    key: string;
    value: SubscribeRequestFilterAccounts | undefined;
}
export interface SubscribeRequest_SlotsEntry {
    key: string;
    value: SubscribeRequestFilterSlots | undefined;
}
export interface SubscribeRequest_TransactionsEntry {
    key: string;
    value: SubscribeRequestFilterTransactions | undefined;
}
export interface SubscribeRequest_TransactionsStatusEntry {
    key: string;
    value: SubscribeRequestFilterTransactions | undefined;
}
export interface SubscribeRequest_BlocksEntry {
    key: string;
    value: SubscribeRequestFilterBlocks | undefined;
}
export interface SubscribeRequest_BlocksMetaEntry {
    key: string;
    value: SubscribeRequestFilterBlocksMeta | undefined;
}
export interface SubscribeRequest_EntryEntry {
    key: string;
    value: SubscribeRequestFilterEntry | undefined;
}
export interface CuckooFilter {
    /** bucket data */
    data: Uint8Array;
    /** number of buckets */
    bucketCount: number;
    /** slots per bucket (typically 4) */
    entriesPerBucket: number;
    /** fingerprint size (8, 12, or 16) */
    fingerprintBits: number;
    /** seed for deterministic hashing */
    hashSeed: string;
    hashAlgorithm: CuckooHashAlgorithm;
}
export interface SubscribeRequestFilterAccounts {
    account: string[];
    owner: string[];
    filters: SubscribeRequestFilterAccountsFilter[];
    nonemptyTxnSignature?: boolean | undefined;
    cuckooAccountsFilter?: CuckooFilter | undefined;
}
export interface SubscribeRequestFilterAccountsFilter {
    memcmp?: SubscribeRequestFilterAccountsFilterMemcmp | undefined;
    datasize?: string | undefined;
    tokenAccountState?: boolean | undefined;
    lamports?: SubscribeRequestFilterAccountsFilterLamports | undefined;
}
export interface SubscribeRequestFilterAccountsFilterMemcmp {
    offset: string;
    bytes?: Uint8Array | undefined;
    base58?: string | undefined;
    base64?: string | undefined;
}
export interface SubscribeRequestFilterAccountsFilterLamports {
    eq?: string | undefined;
    ne?: string | undefined;
    lt?: string | undefined;
    gt?: string | undefined;
}
export interface SubscribeRequestFilterSlots {
    filterByCommitment?: boolean | undefined;
    interslotUpdates?: boolean | undefined;
}
export interface SubscribeRequestFilterTransactions {
    vote?: boolean | undefined;
    failed?: boolean | undefined;
    signature?: string | undefined;
    accountInclude: string[];
    accountExclude: string[];
    accountRequired: string[];
    cuckooAccountInclude?: CuckooFilter | undefined;
    /**
     * ATA / token-account expansion control. When set, account_include /
     * account_exclude / account_required also match against owners of
     * pre/post token balances on each transaction. Absent = no expansion.
     */
    tokenAccounts?: TokenAccountExpansionControlFlag | undefined;
}
export interface SubscribeRequestFilterBlocks {
    accountInclude: string[];
    includeTransactions?: boolean | undefined;
    includeAccounts?: boolean | undefined;
    includeEntries?: boolean | undefined;
    cuckooAccountInclude?: CuckooFilter | undefined;
}
export interface SubscribeRequestFilterBlocksMeta {
}
export interface SubscribeRequestFilterEntry {
}
export interface SubscribeRequestFilterDeshredTransactions {
    vote?: boolean | undefined;
    accountInclude: string[];
    accountExclude: string[];
    accountRequired: string[];
}
export interface SubscribeRequestAccountsDataSlice {
    offset: string;
    length: string;
}
export interface SubscribeRequestPing {
    id: number;
}
export interface SubscribeDeshredRequest {
    deshredTransactions: {
        [key: string]: SubscribeRequestFilterDeshredTransactions;
    };
    ping?: SubscribeRequestPing | undefined;
    slots: {
        [key: string]: SubscribeRequestFilterSlots;
    };
}
export interface SubscribeDeshredRequest_DeshredTransactionsEntry {
    key: string;
    value: SubscribeRequestFilterDeshredTransactions | undefined;
}
export interface SubscribeDeshredRequest_SlotsEntry {
    key: string;
    value: SubscribeRequestFilterSlots | undefined;
}
export interface SubscribeUpdate {
    filters: string[];
    account?: SubscribeUpdateAccount | undefined;
    slot?: SubscribeUpdateSlot | undefined;
    transaction?: SubscribeUpdateTransaction | undefined;
    transactionStatus?: SubscribeUpdateTransactionStatus | undefined;
    block?: SubscribeUpdateBlock | undefined;
    ping?: SubscribeUpdatePing | undefined;
    pong?: SubscribeUpdatePong | undefined;
    blockMeta?: SubscribeUpdateBlockMeta | undefined;
    entry?: SubscribeUpdateEntry | undefined;
    createdAt: Date | undefined;
}
export interface SubscribeUpdateAccount {
    account: SubscribeUpdateAccountInfo | undefined;
    slot: string;
    isStartup: boolean;
}
export interface SubscribeUpdateAccountInfo {
    pubkey: Uint8Array;
    lamports: string;
    owner: Uint8Array;
    executable: boolean;
    rentEpoch: string;
    data: Uint8Array;
    writeVersion: string;
    txnSignature?: Uint8Array | undefined;
}
export interface SubscribeUpdateSlot {
    slot: string;
    parent?: string | undefined;
    status: SlotStatus;
    deadError?: string | undefined;
}
export interface SubscribeUpdateTransaction {
    transaction: SubscribeUpdateTransactionInfo | undefined;
    slot: string;
}
export interface SubscribeUpdateTransactionInfo {
    signature: Uint8Array;
    isVote: boolean;
    transaction: Transaction | undefined;
    meta: TransactionStatusMeta | undefined;
    index: string;
}
export interface SubscribeUpdateTransactionStatus {
    slot: string;
    signature: Uint8Array;
    isVote: boolean;
    index: string;
    err: TransactionError | undefined;
}
export interface SubscribeUpdateBlock {
    slot: string;
    blockhash: string;
    rewards: Rewards | undefined;
    blockTime: UnixTimestamp | undefined;
    blockHeight: BlockHeight | undefined;
    parentSlot: string;
    parentBlockhash: string;
    executedTransactionCount: string;
    transactions: SubscribeUpdateTransactionInfo[];
    updatedAccountCount: string;
    accounts: SubscribeUpdateAccountInfo[];
    entriesCount: string;
    entries: SubscribeUpdateEntry[];
}
export interface SubscribeUpdateBlockMeta {
    slot: string;
    blockhash: string;
    rewards: Rewards | undefined;
    blockTime: UnixTimestamp | undefined;
    blockHeight: BlockHeight | undefined;
    parentSlot: string;
    parentBlockhash: string;
    executedTransactionCount: string;
    entriesCount: string;
}
export interface SubscribeUpdateEntry {
    slot: string;
    index: string;
    numHashes: string;
    hash: Uint8Array;
    executedTransactionCount: string;
    /** added in v1.18, for solana 1.17 value is always 0 */
    startingTransactionIndex: string;
}
export interface SubscribeUpdateDeshredTransaction {
    transaction: SubscribeUpdateDeshredTransactionInfo | undefined;
    slot: string;
}
export interface SubscribeUpdateDeshredTransactionInfo {
    signature: Uint8Array;
    isVote: boolean;
    transaction: Transaction | undefined;
    loadedWritableAddresses: Uint8Array[];
    loadedReadonlyAddresses: Uint8Array[];
    completedDataSetStartingShredIndex: number;
    completedDataSetEndingShredIndexExclusive: number;
}
export interface SubscribeUpdatePing {
}
export interface SubscribeUpdatePong {
    id: number;
}
export interface SubscribeUpdateDeshred {
    filters: string[];
    deshredTransaction?: SubscribeUpdateDeshredTransaction | undefined;
    ping?: SubscribeUpdatePing | undefined;
    pong?: SubscribeUpdatePong | undefined;
    /** field 5 is reserved for created_at (below the oneof) */
    slot?: SubscribeUpdateSlot | undefined;
    createdAt: Date | undefined;
}
export interface SubscribeReplayInfoRequest {
}
export interface SubscribeReplayInfoResponse {
    firstAvailable?: string | undefined;
}
export interface PingRequest {
    count: number;
}
export interface PongResponse {
    count: number;
}
export interface GetLatestBlockhashRequest {
    commitment?: CommitmentLevel | undefined;
}
export interface GetLatestBlockhashResponse {
    slot: string;
    blockhash: string;
    lastValidBlockHeight: string;
}
export interface GetBlockHeightRequest {
    commitment?: CommitmentLevel | undefined;
}
export interface GetBlockHeightResponse {
    blockHeight: string;
}
export interface GetSlotRequest {
    commitment?: CommitmentLevel | undefined;
}
export interface GetSlotResponse {
    slot: string;
}
export interface GetVersionRequest {
}
export interface GetVersionResponse {
    version: string;
}
export interface IsBlockhashValidRequest {
    blockhash: string;
    commitment?: CommitmentLevel | undefined;
}
export interface IsBlockhashValidResponse {
    slot: string;
    valid: boolean;
}
