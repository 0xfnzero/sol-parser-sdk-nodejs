/**
 * Yellowstone gRPC 客户端实现 - 基于 @triton-one/yellowstone-grpc
 */
import Client, { CommitmentLevel } from "@triton-one/yellowstone-grpc";
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
  type ClientConfig,
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

  constructor(
    endpoint: string,
    xToken: string,
    config: ClientConfig = defaultClientConfig()
  ) {
    this.config = config;
    this.client = new Client(endpoint, xToken || undefined, undefined);
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

  /** 订阅交易 */
  async subscribeTransactions(
    filter: TransactionFilter,
    callbacks: SubscribeCallbacks
  ): Promise<{ id: string; cancel: () => void }> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    let isCancelled = false;
    const cancel = () => {
      isCancelled = true;
    };

    this.subscribers.set(id, { filter, callbacks, cancel });

    (async () => {
      try {
        const stream = await this.client.subscribe();

        await new Promise<void>((resolve, reject) => {
          stream.write(
            {
              transactions: {
                client: {
                  accountInclude: filter.account_include,
                  accountExclude: filter.account_exclude,
                  accountRequired: filter.account_required,
                  vote: (filter as any).vote,
                  failed: (filter as any).failed,
                  signature: (filter as any).signature,
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
            } as unknown as SubscribeRequest,
            (err: Error | null | undefined) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        stream.on("data", (update: SubscribeUpdate) => {
          if (isCancelled) return;
          if (callbacks.onUpdate) {
            const converted = this.convertUpdate(update);
            callbacks.onUpdate(converted);
          }
        });

        stream.on("error", (err: Error) => {
          if (isCancelled) return;
          if (callbacks.onError) {
            callbacks.onError(err);
          }
        });

        stream.on("end", () => {
          if (isCancelled) return;
          this.subscribers.delete(id);
          if (callbacks.onEnd) {
            callbacks.onEnd();
          }
        });

        while (!isCancelled) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        stream.end();
      } catch (err) {
        if (isCancelled) return;
        this.subscribers.delete(id);
        if (callbacks.onError) {
          callbacks.onError(err as Error);
        }
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

  /** 取消订阅 */
  unsubscribe(subId: string): void {
    const sub = this.subscribers.get(subId);
    if (sub) {
      sub.cancel();
      this.subscribers.delete(subId);
    }
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
