/**
 * Yellowstone `SubscribeRequest` 构造（与 Rust `grpc/subscribe_builder` 对齐）。
 */
import type {
  SubscribeRequest,
  SubscribeRequestFilterAccounts,
  SubscribeRequestFilterTransactions,
} from "@triton-one/yellowstone-grpc";
import { CommitmentLevel } from "@triton-one/yellowstone-grpc";
import type { AccountFilter, TransactionFilter } from "./types.js";

function txFilterToProto(f: TransactionFilter): SubscribeRequestFilterTransactions {
  return {
    vote: false,
    failed: false,
    signature: undefined,
    accountInclude: f.account_include,
    accountExclude: f.account_exclude,
    accountRequired: f.account_required,
  };
}

function accFilterToProto(f: AccountFilter): SubscribeRequestFilterAccounts {
  return {
    account: f.account,
    owner: f.owner,
    filters: f.filters,
    nonemptyTxnSignature: undefined,
  };
}

function finalize(
  transactions: Record<string, SubscribeRequestFilterTransactions>,
  accounts: Record<string, SubscribeRequestFilterAccounts>,
  commitment: CommitmentLevel
): SubscribeRequest {
  return {
    slots: {},
    accounts,
    transactions,
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    commitment,
    accountsDataSlice: [],
    ping: undefined,
    fromSlot: undefined,
  };
}

export function buildSubscribeRequest(
  txFilters: TransactionFilter[],
  accFilters: AccountFilter[]
): SubscribeRequest {
  return buildSubscribeRequestWithCommitment(txFilters, accFilters, CommitmentLevel.PROCESSED);
}

export function buildSubscribeRequestWithCommitment(
  txFilters: TransactionFilter[],
  accFilters: AccountFilter[],
  commitment: CommitmentLevel
): SubscribeRequest {
  const transactions: Record<string, SubscribeRequestFilterTransactions> = {};
  txFilters.forEach((f, i) => {
    transactions[`tx_${i}`] = txFilterToProto(f);
  });
  const accounts: Record<string, SubscribeRequestFilterAccounts> = {};
  accFilters.forEach((f, i) => {
    accounts[`acc_${i}`] = accFilterToProto(f);
  });
  return finalize(transactions, accounts, commitment);
}

export function buildSubscribeTransactionFiltersNamed(
  namedTxFilters: readonly { name: string; filter: TransactionFilter }[],
  accFilters: AccountFilter[],
  commitment: CommitmentLevel
): SubscribeRequest {
  const transactions: Record<string, SubscribeRequestFilterTransactions> = {};
  for (const { name, filter } of namedTxFilters) {
    transactions[name] = txFilterToProto(filter);
  }
  const accounts: Record<string, SubscribeRequestFilterAccounts> = {};
  accFilters.forEach((f, i) => {
    accounts[`acc_${i}`] = accFilterToProto(f);
  });
  return finalize(transactions, accounts, commitment);
}

export { CommitmentLevel };
