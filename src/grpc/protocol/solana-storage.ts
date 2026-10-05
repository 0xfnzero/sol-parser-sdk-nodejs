// Yellowstone protocol shapes, adapted from rpcpool/yellowstone-grpc 7.0.0 (Apache-2.0).
export enum RewardType {
    Unspecified = 0,
    Fee = 1,
    Rent = 2,
    Staking = 3,
    Voting = 4,
    DeactivatedStake = 5,
    UNRECOGNIZED = -1
}
export interface ConfirmedBlock {
    previousBlockhash: string;
    blockhash: string;
    parentSlot: string;
    transactions: ConfirmedTransaction[];
    rewards: Reward[];
    blockTime: UnixTimestamp | undefined;
    blockHeight: BlockHeight | undefined;
    numPartitions: NumPartitions | undefined;
}
export interface ConfirmedTransaction {
    transaction: Transaction | undefined;
    meta: TransactionStatusMeta | undefined;
}
export interface Transaction {
    signatures: Uint8Array[];
    message: Message | undefined;
}
export interface Message {
    header: MessageHeader | undefined;
    accountKeys: Uint8Array[];
    recentBlockhash: Uint8Array;
    instructions: CompiledInstruction[];
    versioned: boolean;
    addressTableLookups: MessageAddressTableLookup[];
    /** Set only for V1 transaction messages (SIMD-0385). Absent for legacy/V0. */
    config?: TransactionConfig | undefined;
}
export interface TransactionConfig {
    priorityFee?: string | undefined;
    computeUnitLimit?: number | undefined;
    loadedAccountsDataSizeLimit?: number | undefined;
    heapSize?: number | undefined;
}
export interface MessageHeader {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
}
export interface MessageAddressTableLookup {
    accountKey: Uint8Array;
    writableIndexes: Uint8Array;
    readonlyIndexes: Uint8Array;
}
export interface TransactionStatusMeta {
    err: TransactionError | undefined;
    fee: string;
    preBalances: string[];
    postBalances: string[];
    innerInstructions: InnerInstructions[];
    innerInstructionsNone: boolean;
    logMessages: string[];
    logMessagesNone: boolean;
    preTokenBalances: TokenBalance[];
    postTokenBalances: TokenBalance[];
    rewards: Reward[];
    loadedWritableAddresses: Uint8Array[];
    loadedReadonlyAddresses: Uint8Array[];
    returnData: ReturnData | undefined;
    returnDataNone: boolean;
    /**
     * Sum of compute units consumed by all instructions.
     * Available since Solana v1.10.35 / v1.11.6.
     * Set to `None` for txs executed on earlier versions.
     */
    computeUnitsConsumed?: string | undefined;
    /** Total transaction cost */
    costUnits?: string | undefined;
}
export interface TransactionError {
    err: Uint8Array;
}
export interface InnerInstructions {
    index: number;
    instructions: InnerInstruction[];
}
export interface InnerInstruction {
    programIdIndex: number;
    accounts: Uint8Array;
    data: Uint8Array;
    /**
     * Invocation stack height of an inner instruction.
     * Available since Solana v1.14.6
     * Set to `None` for txs executed on earlier versions.
     */
    stackHeight?: number | undefined;
}
export interface CompiledInstruction {
    programIdIndex: number;
    accounts: Uint8Array;
    data: Uint8Array;
}
export interface TokenBalance {
    accountIndex: number;
    mint: string;
    uiTokenAmount: UiTokenAmount | undefined;
    owner: string;
    programId: string;
}
export interface UiTokenAmount {
    uiAmount: number;
    decimals: number;
    amount: string;
    uiAmountString: string;
}
export interface ReturnData {
    programId: Uint8Array;
    data: Uint8Array;
}
export interface Reward {
    pubkey: string;
    lamports: string;
    postBalance: string;
    rewardType: RewardType;
    commission: string;
    commissionBps: string;
}
export interface Rewards {
    rewards: Reward[];
    numPartitions: NumPartitions | undefined;
}
export interface UnixTimestamp {
    timestamp: string;
}
export interface BlockHeight {
    blockHeight: string;
}
export interface NumPartitions {
    numPartitions: string;
}
