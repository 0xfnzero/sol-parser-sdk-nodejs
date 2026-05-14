/**
 * Yellowstone gRPC 客户端实现 - 基于 @triton-one/yellowstone-grpc
 */
import Client, { CommitmentLevel } from "@triton-one/yellowstone-grpc";
import bs58 from "bs58";
import type { DexEvent } from "../core/dex_event.js";
import { makeMetadata } from "../core/metadata.js";
import { parseAccountUnified, type AccountData } from "../accounts/mod.js";
import { defaultGeyserConnectConfig, geyserGrpcChannelOptions } from "./geyser_connect.js";
import { OrderDispatcher } from "./order_buffer.js";
import { buildSubscribeRequest } from "./subscribe_builder.js";
import { parseDexEventsFromGrpcTransactionInfo } from "./yellowstone_parse.js";
import type {
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateAccount,
  SubscribeUpdateSlot,
  SubscribeUpdateTransaction,
  SubscribeUpdateBlock,
  SubscribeUpdateBlockMeta,
  SubscribeUpdatePing,
} from "@triton-one/yellowstone-grpc";
import {
  type AccountFilter,
  type ClientConfig,
  type EventTypeFilter,
  type TransactionFilter,
  type SubscribeCallbacks,
  type SubscribeUpdate as LocalSubscribeUpdate,
  type SubscribeUpdateAccount as LocalSubscribeUpdateAccount,
  type SubscribeUpdateAccountInfo,
  type SubscribeUpdateSlot as LocalSubscribeUpdateSlot,
  type SubscribeUpdateTransaction as LocalSubscribeUpdateTransaction,
  type SubscribeUpdateTransactionInfo,
  type SubscribeUpdateBlock as LocalSubscribeUpdateBlock,
  type SubscribeUpdateBlockMeta as LocalSubscribeUpdateBlockMeta,
  type SubscribeUpdatePing as LocalSubscribeUpdatePing,
  type SubscribeUpdatePong as LocalSubscribeUpdatePong,
  type SlotStatus,
  defaultClientConfig,
} from "./types.js";

export { SubscribeCallbacks };

class AsyncEventQueue<T> implements AsyncIterable<T>, AsyncIterator<T> {
  private readonly items: T[] = [];
  private readonly waiters: Array<(result: IteratorResult<T>) => void> = [];
  private closed = false;

  constructor(private readonly maxSize: number) {}

  push(item: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: item, done: false });
      return;
    }
    if (this.items.length < this.maxSize) {
      this.items.push(item);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  next(): Promise<IteratorResult<T>> {
    const item = this.items.shift();
    if (item !== undefined) {
      return Promise.resolve({ value: item, done: false });
    }
    if (this.closed) {
      return Promise.resolve({ value: undefined, done: true });
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this;
  }
}

export interface DexEventSubscription extends AsyncIterable<DexEvent> {
  id: string;
  errors: AsyncIterable<Error>;
  cancel(): void;
  next(): Promise<IteratorResult<DexEvent>>;
}

/** Yellowstone gRPC 客户端包装器 */
export class YellowstoneGrpc {
  private client: Client;
  private config: ClientConfig;
  private connected = false;
  private subscribers = new Map<
    string,
    {
      filter: TransactionFilter;
      callbacks: SubscribeCallbacks;
      cancel: () => void;
    }
  >();
  private dexSubscribers = new Map<
    string,
    {
      cancel: () => void;
      update?: (transactionFilters: TransactionFilter[], accountFilters: AccountFilter[]) => Promise<void>;
    }
  >();

  constructor(
    endpoint: string,
    xToken: string,
    config: ClientConfig = defaultClientConfig()
  ) {
    this.config = config;
    const gc = defaultGeyserConnectConfig();
    this.client = new Client(
      endpoint,
      xToken || undefined,
      geyserGrpcChannelOptions({
        ...gc,
        keepAliveIntervalMs: config.keep_alive_interval_ms,
        keepAliveTimeoutMs: config.keep_alive_timeout_ms,
      })
    );
  }

  /** 连接到 gRPC 服务器 */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    this.connected = true;
  }

  /** 断开连接 */
  async disconnect(): Promise<void> {
    for (const [, sub] of this.subscribers) {
      sub.cancel();
    }
    this.subscribers.clear();
    for (const [, sub] of this.dexSubscribers) {
      sub.cancel();
    }
    this.dexSubscribers.clear();
    this.connected = false;
  }

  /** 检查是否已连接 */
  isConnected(): boolean {
    return this.connected;
  }

  /** 获取客户端配置 */
  getConfig(): ClientConfig {
    return this.config;
  }

  /** 转换 SlotStatus */
  private convertSlotStatus(status: number): SlotStatus {
    const map: Record<number, SlotStatus> = {
      0: "Processed",
      1: "Confirmed",
      2: "Finalized",
      3: "FirstShredReceived",
      4: "Completed",
      5: "CreatedBank",
      6: "Dead",
    };
    return map[status] ?? "Processed";
  }

  /** 转换订阅更新 */
  private convertUpdate(update: SubscribeUpdate): LocalSubscribeUpdate {
    const result: LocalSubscribeUpdate = {
      filters: update.filters,
    };

    const createdAtUs = YellowstoneGrpc.timestampToMicros(
      (update as any).createdAt ?? (update as any).created_at
    );
    if (createdAtUs !== undefined) result.createdAtUs = createdAtUs;

    if (update.account) {
      const acc = update.account;
      result.account = {
        slot: acc.slot,
        isStartup: acc.isStartup,
      } as LocalSubscribeUpdateAccount;

      if (acc.account) {
        result.account.account = {
          pubkey: acc.account.pubkey,
          lamports: acc.account.lamports,
          owner: acc.account.owner,
          executable: acc.account.executable,
          rentEpoch: acc.account.rentEpoch,
          data: acc.account.data,
          writeVersion: acc.account.writeVersion,
          txnSignature: acc.account.txnSignature,
        } as SubscribeUpdateAccountInfo;
      }
    }

    if (update.slot) {
      const slot = update.slot;
      result.slot = {
        slot: slot.slot,
        status: this.convertSlotStatus(slot.status as unknown as number),
      } as LocalSubscribeUpdateSlot;

      if (slot.parent !== undefined) {
        result.slot.parent = slot.parent;
      }
      if ((slot as any).deadError !== undefined) {
        result.slot.deadError = (slot as any).deadError;
      }
    }

    if (update.transaction) {
      const tx = update.transaction;
      result.transaction = {
        slot: tx.slot,
      } as LocalSubscribeUpdateTransaction;

      if (tx.transaction) {
        result.transaction.transaction = {
          signature: tx.transaction.signature,
          isVote: tx.transaction.isVote,
          transactionRaw: tx.transaction.transaction,
          metaRaw: tx.transaction.meta,
          index: tx.transaction.index,
        } as SubscribeUpdateTransactionInfo;
      }
    }

    if (update.block) {
      const block = update.block;
      result.block = {
        slot: block.slot,
        blockhash: block.blockhash,
        parentSlot: block.parentSlot,
        parentBlockhash: block.parentBlockhash,
        executedTransactionCount: block.executedTransactionCount,
      } as LocalSubscribeUpdateBlock;
    }

    if (update.blockMeta) {
      const meta = update.blockMeta;
      result.blockMeta = {
        slot: meta.slot,
        blockhash: meta.blockhash,
        parentSlot: meta.parentSlot,
        parentBlockhash: meta.parentBlockhash,
        executedTransactionCount: meta.executedTransactionCount,
      } as LocalSubscribeUpdateBlockMeta;
    }

    if (update.ping) {
      result.ping = {} as LocalSubscribeUpdatePing;
    }

    if ((update as any).pong) {
      result.pong = {
        id: (update as any).pong.id,
      } as LocalSubscribeUpdatePong;
    }

    return result;
  }

  /**
   * 应答 Geyser 在 SubscribeUpdate 中下发的 ping（与 `solana-streamer` / Rust 侧一致）。
   * 若不回复，公共节点或 LB 可能在超时后 RST_STREAM（HTTP/2 CANCEL）。
   */
  private subscribePingPongRequest(): SubscribeRequest {
    return {
      accounts: {},
      slots: {},
      transactions: {},
      transactionsStatus: {},
      entry: {},
      blocks: {},
      blocksMeta: {},
      commitment: CommitmentLevel.CONFIRMED,
      accountsDataSlice: [],
      ping: { id: 1 },
    } as unknown as SubscribeRequest;
  }

  private static toBytes(value: Uint8Array | readonly number[] | undefined): Uint8Array {
    if (!value) return new Uint8Array();
    return value instanceof Uint8Array ? value : Uint8Array.from(value);
  }

  private static toBigInt(value: string | bigint | number): bigint {
    return typeof value === "bigint" ? value : BigInt(value);
  }

  private static protobufNumber(value: unknown): number {
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    if (value && typeof value === "object") {
      const longLike = value as { toNumber?: () => number; toString?: () => string };
      if (typeof longLike.toNumber === "function") return longLike.toNumber();
      if (typeof longLike.toString === "function") return Number(longLike.toString());
    }
    return Number.NaN;
  }

  private static timestampToMicros(value: unknown): number | undefined {
    if (!value || typeof value !== "object") return undefined;
    const ts = value as { seconds?: unknown; nanos?: unknown };
    if (ts.seconds === undefined) return undefined;
    const seconds = YellowstoneGrpc.protobufNumber(ts.seconds);
    const nanos = Number(ts.nanos ?? 0);
    if (!Number.isFinite(seconds) || !Number.isFinite(nanos)) return undefined;
    return Math.trunc(seconds * 1_000_000 + nanos / 1_000);
  }

  private parseAccountEvent(
    update: LocalSubscribeUpdateAccount,
    grpcRecvUs: number,
    eventTypeFilter?: EventTypeFilter,
    blockTimeUs?: number
  ): DexEvent | null {
    const acc = update.account;
    if (!acc) return null;

    const signatureBytes = YellowstoneGrpc.toBytes(acc.txnSignature);
    const account: AccountData = {
      pubkey: bs58.encode(YellowstoneGrpc.toBytes(acc.pubkey)),
      executable: acc.executable,
      lamports: YellowstoneGrpc.toBigInt(acc.lamports),
      owner: bs58.encode(YellowstoneGrpc.toBytes(acc.owner)),
      rent_epoch: YellowstoneGrpc.toBigInt(acc.rentEpoch),
      data: YellowstoneGrpc.toBytes(acc.data),
    };
    const metadata = makeMetadata(
      signatureBytes.length > 0 ? bs58.encode(signatureBytes) : "",
      Number(update.slot),
      0,
      blockTimeUs,
      grpcRecvUs
    );
    return parseAccountUnified(account, metadata, eventTypeFilter);
  }

  private initialSubscribeRequest(filter: TransactionFilter): SubscribeRequest {
    return {
      transactions: {
        client: {
          accountInclude: filter.account_include,
          accountExclude: filter.account_exclude,
          accountRequired: filter.account_required,
          vote: (filter as { vote?: boolean }).vote,
          failed: (filter as { failed?: boolean }).failed,
          signature: (filter as { signature?: string }).signature,
        },
      },
      accounts: {},
      slots: {},
      transactionsStatus: {},
      entry: {},
      blocks: {},
      blocksMeta: {},
      commitment: CommitmentLevel.CONFIRMED,
      accountsDataSlice: [],
      ping: undefined,
    } as unknown as SubscribeRequest;
  }

  /** 订阅交易 */
  async subscribeTransactions(
    filter: TransactionFilter,
    callbacks: SubscribeCallbacks
  ): Promise<{ id: string; cancel: () => void }> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    let isCancelled = false;
    const streamHolder: {
      current: Awaited<ReturnType<Client["subscribe"]>> | null;
    } = { current: null };
    const cancel = () => {
      isCancelled = true;
      streamHolder.current?.end();
      streamHolder.current = null;
    };

    this.subscribers.set(id, { filter, callbacks, cancel });

    (async () => {
      const autoReconnect = callbacks.autoReconnect !== false;
      const maxBackoffMs = 60_000;
      let backoffMs = this.config.retry_delay_ms;

      try {
        while (!isCancelled) {
          try {
            const stream = await this.client.subscribe();
            streamHolder.current = stream;

            await new Promise<void>((resolve, reject) => {
              stream.write(this.initialSubscribeRequest(filter), (err: Error | null | undefined) => {
                if (err) reject(err);
                else resolve();
              });
            });

            backoffMs = this.config.retry_delay_ms;

            await new Promise<void>((resolve, reject) => {
              const cleanup = () => {
                stream.removeAllListeners();
                if (streamHolder.current === stream) {
                  streamHolder.current = null;
                }
              };

              stream.on("data", (update: SubscribeUpdate) => {
                if (isCancelled) return;

                if (update.ping) {
                  stream.write(this.subscribePingPongRequest(), (werr: Error | null | undefined) => {
                    if (werr && callbacks.onError && !isCancelled) {
                      callbacks.onError(
                        werr instanceof Error ? werr : new Error(String(werr))
                      );
                    }
                  });
                  return;
                }

                if (!callbacks.onUpdate) return;
                try {
                  const converted = this.convertUpdate(update);
                  callbacks.onUpdate(converted);
                } catch (err) {
                  const e = err instanceof Error ? err : new Error(String(err));
                  callbacks.onError?.(e);
                }
              });

              stream.on("error", (err: Error) => {
                cleanup();
                reject(err);
              });

              stream.on("end", () => {
                cleanup();
                resolve();
              });
            });
          } catch (err) {
            if (isCancelled) break;
            const e = err instanceof Error ? err : new Error(String(err));
            callbacks.onError?.(e);
            if (!autoReconnect) break;

            await new Promise((r) => setTimeout(r, backoffMs));
            backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
            continue;
          }

          if (isCancelled) break;

          if (!autoReconnect) {
            callbacks.onEnd?.();
            break;
          }

          await new Promise((r) => setTimeout(r, backoffMs));
          backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
        }
      } finally {
        streamHolder.current?.end();
        streamHolder.current = null;
        this.subscribers.delete(id);
      }
    })();

    return {
      id,
      cancel: () => {
        cancel();
        this.subscribers.delete(id);
      },
    };
  }

  /**
   * 订阅并直接产出 `DexEvent`。
   *
   * 交易更新走统一交易解析（外层/内层指令 + 日志 + 数据填充）；账户更新走 `parseAccountUnified`。
   * 事件队列满时丢弃新事件，避免回调阻塞 gRPC 读循环，保持低延迟。
   */
  async subscribeDexEvents(
    transactionFilters: TransactionFilter[] = [],
    accountFilters: AccountFilter[] = [],
    eventTypeFilter?: EventTypeFilter,
    options?: { autoReconnect?: boolean }
  ): Promise<DexEventSubscription> {
    await this.connect();

    const id = `dex_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const events = new AsyncEventQueue<DexEvent>(Math.max(1, this.config.buffer_size));
    const errors = new AsyncEventQueue<Error>(Math.max(1, this.config.buffer_size));
    const order = new OrderDispatcher(this.config);
    const emitEvent = (event: DexEvent) => events.push(event);
    let flushTimer: ReturnType<typeof setInterval> | undefined;
    if (order.needsTimer) {
      const intervalMs =
        this.config.order_mode === "MicroBatch"
          ? Math.max(1, Math.ceil(this.config.micro_batch_us / 1000))
          : Math.max(1, Math.floor(this.config.order_timeout_ms / 2));
      flushTimer = setInterval(() => order.flushDue(emitEvent), intervalMs);
    }
    let isCancelled = false;
    let currentTransactionFilters = transactionFilters;
    let currentAccountFilters = accountFilters;
    const streamHolder: {
      current: Awaited<ReturnType<Client["subscribe"]>> | null;
    } = { current: null };
    const cancel = () => {
      isCancelled = true;
      streamHolder.current?.end();
      streamHolder.current = null;
      if (flushTimer) clearInterval(flushTimer);
      events.close();
      errors.close();
    };

    const update = async (nextTxFilters: TransactionFilter[], nextAccFilters: AccountFilter[]) => {
      currentTransactionFilters = nextTxFilters;
      currentAccountFilters = nextAccFilters;
      const stream = streamHolder.current;
      if (!stream) return;
      await new Promise<void>((resolve, reject) => {
        stream.write(
          buildSubscribeRequest(currentTransactionFilters, currentAccountFilters),
          (err: Error | null | undefined) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    };

    this.dexSubscribers.set(id, { cancel, update });

    (async () => {
      const autoReconnect = options?.autoReconnect !== false;
      const maxBackoffMs = 60_000;
      let backoffMs = this.config.retry_delay_ms;

      try {
        while (!isCancelled) {
          try {
            const stream = await this.client.subscribe();
            streamHolder.current = stream;

            await new Promise<void>((resolve, reject) => {
              stream.write(
                buildSubscribeRequest(currentTransactionFilters, currentAccountFilters),
                (err: Error | null | undefined) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });

            backoffMs = this.config.retry_delay_ms;

            await new Promise<void>((resolve, reject) => {
              const cleanup = () => {
                stream.removeAllListeners();
                if (streamHolder.current === stream) {
                  streamHolder.current = null;
                }
              };

              stream.on("data", (update: SubscribeUpdate) => {
                if (isCancelled) return;
                order.flushDue(emitEvent);

                if (update.ping) {
                  stream.write(this.subscribePingPongRequest(), (werr: Error | null | undefined) => {
                    if (werr && !isCancelled) {
                      errors.push(werr instanceof Error ? werr : new Error(String(werr)));
                    }
                  });
                  return;
                }

                try {
                  const grpcRecvUs = Math.floor(Date.now() * 1000);
                  const converted = this.convertUpdate(update);
                  const tx = converted.transaction?.transaction;
                  if (tx) {
                    const fallbackSlot = YellowstoneGrpc.protobufNumber(
                      converted.transaction?.slot ?? 0
                    );
                    const fallbackTxIndex = YellowstoneGrpc.protobufNumber(tx.index ?? 0);
                    const txEvents = parseDexEventsFromGrpcTransactionInfo(
                      tx,
                      converted.transaction?.slot ?? 0n,
                      { blockTimeUs: converted.createdAtUs, grpcRecvUs, eventTypeFilter }
                    );
                    order.pushTransactionEvents(txEvents, fallbackSlot, fallbackTxIndex, emitEvent);
                  }

                  if (converted.account) {
                    const ev = this.parseAccountEvent(
                      converted.account,
                      grpcRecvUs,
                      eventTypeFilter,
                      converted.createdAtUs
                    );
                    if (ev) emitEvent(ev);
                  }
                } catch (err) {
                  errors.push(err instanceof Error ? err : new Error(String(err)));
                }
              });

              stream.on("error", (err: Error) => {
                cleanup();
                reject(err);
              });

              stream.on("end", () => {
                cleanup();
                resolve();
              });
            });
          } catch (err) {
            if (isCancelled) break;
            errors.push(err instanceof Error ? err : new Error(String(err)));
            if (!autoReconnect) break;

            await new Promise((r) => setTimeout(r, backoffMs));
            backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
            continue;
          }

          if (isCancelled || !autoReconnect) break;

          await new Promise((r) => setTimeout(r, backoffMs));
          backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
        }
      } finally {
        streamHolder.current?.end();
        streamHolder.current = null;
        if (flushTimer) clearInterval(flushTimer);
        order.flushAll(emitEvent);
        events.close();
        errors.close();
        this.dexSubscribers.delete(id);
      }
    })();

    return Object.assign(events, {
      id,
      errors,
      cancel: () => {
        cancel();
        this.dexSubscribers.delete(id);
      },
    });
  }

  /** 取消订阅 */
  unsubscribe(subId: string): void {
    const sub = this.subscribers.get(subId);
    if (sub) {
      sub.cancel();
      this.subscribers.delete(subId);
    }
    const dexSub = this.dexSubscribers.get(subId);
    if (dexSub) {
      dexSub.cancel();
      this.dexSubscribers.delete(subId);
    }
  }

  /** 动态更新当前 DEX 订阅过滤器（与 Rust update_subscription 语义对齐）。 */
  async updateSubscription(
    transactionFilters: TransactionFilter[],
    accountFilters: AccountFilter[]
  ): Promise<void> {
    const active = this.dexSubscribers.values().next().value as
      | {
          update?: (
            transactionFilters: TransactionFilter[],
            accountFilters: AccountFilter[]
          ) => Promise<void>;
        }
      | undefined;
    if (!active?.update) {
      throw new Error("No active DEX subscription");
    }
    await active.update(transactionFilters, accountFilters);
  }

  async update_subscription(
    transactionFilters: TransactionFilter[],
    accountFilters: AccountFilter[]
  ): Promise<void> {
    await this.updateSubscription(transactionFilters, accountFilters);
  }

  /** 获取最新区块哈希 */
  async getLatestBlockhash(commitment?: CommitmentLevel): Promise<{
    slot: number;
    blockhash: string;
    lastValidBlockHeight: number;
  }> {
    const resp = await this.client.getLatestBlockhash(commitment);
    return {
      slot: Number(resp.slot),
      blockhash: resp.blockhash,
      lastValidBlockHeight: Number(resp.lastValidBlockHeight),
    };
  }

  /** 获取区块高度 */
  async getBlockHeight(commitment?: CommitmentLevel): Promise<number> {
    const resp = await this.client.getBlockHeight(commitment);
    return Number(resp);
  }

  /** 获取当前 Slot */
  async getSlot(commitment?: CommitmentLevel): Promise<number> {
    const resp = await this.client.getSlot(commitment);
    return Number(resp);
  }

  /** 获取服务器版本 */
  async getVersion(): Promise<string> {
    const resp = await this.client.getVersion();
    return String(resp);
  }

  /** 验证区块哈希是否有效 */
  async isBlockhashValid(
    blockhash: string,
    commitment?: CommitmentLevel
  ): Promise<{ slot: number; valid: boolean }> {
    const resp = await this.client.isBlockhashValid(blockhash, commitment);
    return {
      slot: Number(resp.slot),
      valid: resp.valid,
    };
  }

  /** 发送 Ping 请求 */
  async ping(count: number): Promise<number> {
    const resp = await this.client.ping(count);
    return Number(resp);
  }
}
