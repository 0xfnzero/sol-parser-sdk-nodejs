import type { DexEvent } from "../core/dex_event.js";
import { metadataForDexEvent } from "../core/dex_event.js";
import type { EventMetadata } from "../core/metadata.js";
import type { ClientConfig, OrderMode } from "./types.js";

type TxBatch = {
  slot: number;
  txIndex: number;
  seq: number;
  events: DexEvent[];
};

function eventSlotAndIndex(events: readonly DexEvent[], fallbackSlot: number, fallbackTxIndex: number) {
  const meta = events.length > 0 ? metadataForDexEvent(events[0]) : null;
  return {
    slot: Number.isFinite(meta?.slot) ? (meta as EventMetadata).slot : fallbackSlot,
    txIndex: Number.isFinite(meta?.tx_index) ? (meta as EventMetadata).tx_index : fallbackTxIndex,
  };
}

export class OrderDispatcher {
  private readonly mode: OrderMode;
  private readonly timeoutMs: number;
  private readonly microBatchUs: number;
  private readonly slots = new Map<number, TxBatch[]>();
  private readonly streamingWatermarks = new Map<number, number>();
  private microBatch: TxBatch[] = [];
  private microBatchStartUs = 0;
  private lastFlushMs = Date.now();
  private currentSlot = 0;
  private seq = 0;

  constructor(config: ClientConfig) {
    this.mode = config.order_mode;
    this.timeoutMs = Math.max(1, config.order_timeout_ms || 100);
    this.microBatchUs = Math.max(1, config.micro_batch_us || 100);
  }

  get needsTimer(): boolean {
    return this.mode !== "Unordered";
  }

  pushTransactionEvents(
    events: DexEvent[],
    fallbackSlot: number,
    fallbackTxIndex: number,
    emit: (event: DexEvent) => void
  ): void {
    if (events.length === 0) return;
    const { slot, txIndex } = eventSlotAndIndex(events, fallbackSlot, fallbackTxIndex);
    const batch: TxBatch = { slot, txIndex, seq: this.seq++, events };

    switch (this.mode) {
      case "Unordered":
        this.emitBatch(batch, emit);
        return;
      case "Ordered":
        this.pushOrdered(batch, emit);
        return;
      case "StreamingOrdered":
        this.pushStreaming(batch, emit);
        return;
      case "MicroBatch":
        this.pushMicroBatch(batch, emit);
        return;
    }
  }

  flushDue(emit: (event: DexEvent) => void): void {
    const nowMs = Date.now();
    if ((this.mode === "Ordered" || this.mode === "StreamingOrdered") && nowMs - this.lastFlushMs > this.timeoutMs) {
      this.flushAllSlots(emit);
    }
    if (this.mode === "MicroBatch") {
      const nowUs = Math.floor(nowMs * 1000);
      if (this.microBatch.length > 0 && nowUs - this.microBatchStartUs >= this.microBatchUs) {
        this.flushMicroBatch(emit);
      }
    }
  }

  flushAll(emit: (event: DexEvent) => void): void {
    this.flushAllSlots(emit);
    this.flushMicroBatch(emit);
  }

  private pushOrdered(batch: TxBatch, emit: (event: DexEvent) => void): void {
    if (batch.slot > this.currentSlot && this.currentSlot > 0) {
      this.flushBefore(batch.slot, emit);
    }
    if (batch.slot > this.currentSlot) this.currentSlot = batch.slot;
    this.pushSlotBatch(batch);
  }

  private pushStreaming(batch: TxBatch, emit: (event: DexEvent) => void): void {
    if (batch.slot > this.currentSlot && this.currentSlot > 0) {
      this.flushBefore(batch.slot, emit);
      for (const slot of [...this.streamingWatermarks.keys()]) {
        if (slot < batch.slot) this.streamingWatermarks.delete(slot);
      }
    }
    if (batch.slot > this.currentSlot) this.currentSlot = batch.slot;

    const expected = this.streamingWatermarks.get(batch.slot) ?? 0;
    if (batch.txIndex === expected) {
      this.emitBatch(batch, emit);
      let watermark = expected + 1;
      const buffered = this.slots.get(batch.slot);
      if (buffered) {
        buffered.sort(compareBatch);
        let pos = buffered.findIndex((b) => b.txIndex === watermark);
        while (pos >= 0) {
          const [next] = buffered.splice(pos, 1);
          this.emitBatch(next, emit);
          watermark += 1;
          pos = buffered.findIndex((b) => b.txIndex === watermark);
        }
        if (buffered.length === 0) this.slots.delete(batch.slot);
      }
      this.streamingWatermarks.set(batch.slot, watermark);
    } else if (batch.txIndex > expected) {
      this.pushSlotBatch(batch);
    }
  }

  private pushMicroBatch(batch: TxBatch, emit: (event: DexEvent) => void): void {
    const nowUs = Math.floor(Date.now() * 1000);
    if (this.microBatch.length === 0) this.microBatchStartUs = nowUs;
    this.microBatch.push(batch);
    if (nowUs - this.microBatchStartUs >= this.microBatchUs) {
      this.flushMicroBatch(emit);
    }
  }

  private pushSlotBatch(batch: TxBatch): void {
    const list = this.slots.get(batch.slot);
    if (list) list.push(batch);
    else this.slots.set(batch.slot, [batch]);
  }

  private flushBefore(slot: number, emit: (event: DexEvent) => void): void {
    for (const s of [...this.slots.keys()].sort((a, b) => a - b)) {
      if (s >= slot) continue;
      const batches = this.slots.get(s) ?? [];
      batches.sort(compareBatch);
      for (const batch of batches) this.emitBatch(batch, emit);
      this.slots.delete(s);
      this.streamingWatermarks.delete(s);
    }
    this.lastFlushMs = Date.now();
  }

  private flushAllSlots(emit: (event: DexEvent) => void): void {
    for (const s of [...this.slots.keys()].sort((a, b) => a - b)) {
      const batches = this.slots.get(s) ?? [];
      batches.sort(compareBatch);
      for (const batch of batches) this.emitBatch(batch, emit);
      this.slots.delete(s);
      this.streamingWatermarks.delete(s);
    }
    this.lastFlushMs = Date.now();
  }

  private flushMicroBatch(emit: (event: DexEvent) => void): void {
    if (this.microBatch.length === 0) return;
    this.microBatch.sort(compareBatch);
    for (const batch of this.microBatch) this.emitBatch(batch, emit);
    this.microBatch = [];
    this.microBatchStartUs = 0;
    this.lastFlushMs = Date.now();
  }

  private emitBatch(batch: TxBatch, emit: (event: DexEvent) => void): void {
    for (const event of batch.events) emit(event);
  }
}

function compareBatch(a: TxBatch, b: TxBatch): number {
  return a.slot - b.slot || a.txIndex - b.txIndex || a.seq - b.seq;
}
