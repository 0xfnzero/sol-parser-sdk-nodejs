import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import bs58 from "bs58";
import {
  decodeWireTransaction,
  decodeWireTransactionBytes,
} from "../wire_transaction.js";
import { wireBytesToShredWasmTx } from "./wire_to_shred_tx.js";
import { dexEventsFromShredWasmTxWithLoadedAddresses } from "./instruction_parse.js";
import { eventTypeFilterIncludeOnly } from "../grpc/types.js";
const fixtures: {
  wire: string;
  slot: number;
  loaded_writable: string[];
  loaded_readonly: string[];
  expected: unknown[];
}[] = JSON.parse(
  readFileSync(
    new URL("../../examples/fixtures/pump_shred_routes.json", import.meta.url),
    "utf8",
  ),
);
describe("binary hotpath decoder retains canonical signed-wire semantics", () => {
  it("matches public string decoding across captured wrapped-CPI and ALT routes, with owned bytes", () => {
    for (const f of fixtures) {
      const wire = Buffer.from(f.wire, "base64"),
        decoded = decodeWireTransaction(wire),
        binary = decodeWireTransactionBytes(wire);
      expect({
        ...binary,
        transaction: {
          ...binary.transaction,
          message: {
            ...binary.transaction.message,
            recentBlockhash: bs58.encode(
              binary.transaction.message.recentBlockhash,
            ),
            instructions: binary.transaction.message.instructions.map((ix) => ({
              ...ix,
              data: bs58.encode(ix.data),
            })),
          },
        },
      }).toEqual(decoded);
      const tx = wireBytesToShredWasmTx(wire)!;
      const parse = () =>
        dexEventsFromShredWasmTxWithLoadedAddresses(
          tx,
          f.loaded_writable,
          f.loaded_readonly,
          f.slot,
          888,
          999,
          eventTypeFilterIncludeOnly(["PumpFunTrade", "PumpFunCreate"]),
        );
      const events = parse();
      expect(events).toHaveLength(f.expected.length);
      wire.fill(0);
      expect(parse()).toEqual(events);
      expect(() =>
        dexEventsFromShredWasmTxWithLoadedAddresses(
          tx,
          [...f.loaded_writable, "11111111111111111111111111111111"],
          f.loaded_readonly,
          0,
          0,
          0,
        ),
      ).toThrow();
    }
  });
  it("rejects truncation/trailing bytes identically and performs one hash encoding per multi-event parse", () => {
    for (const f of fixtures) {
      const raw = Buffer.from(f.wire, "base64");
      for (const malformed of [
        raw.subarray(0, raw.length - 1),
        Buffer.concat([raw, Buffer.from([0])]),
      ]) {
        expect(() => decodeWireTransaction(malformed)).toThrow();
        expect(() => decodeWireTransactionBytes(malformed)).toThrow();
        expect(wireBytesToShredWasmTx(malformed)).toBeNull();
      }
    }
    const f = fixtures.find((f) => f.expected.length > 1)!;
    expect(f).toBeDefined();
    const tx = wireBytesToShredWasmTx(Buffer.from(f.wire, "base64"))!;
    const spy = vi.spyOn(bs58, "encode");
    try {
      const events = dexEventsFromShredWasmTxWithLoadedAddresses(
        tx,
        f.loaded_writable,
        f.loaded_readonly,
        f.slot,
        888,
        999,
        eventTypeFilterIncludeOnly(["PumpFunTrade"]),
      );
      expect(events).toHaveLength(f.expected.length);
      expect(
        spy.mock.calls.filter((args) => args[0] === tx.recentBlockhash),
      ).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});
