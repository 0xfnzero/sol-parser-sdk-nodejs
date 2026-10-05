import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { analyzeRpcTransactionRoutes } from "./transaction_route.js";
import { decodeWireTransaction } from "./wire_transaction.js";
import { wireBytesToShredWasmTx } from "./shredstream/wire_to_shred_tx.js";
const corpus = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/stonkfun_routes_0_7_7.json", import.meta.url),
    "utf8",
  ),
);
const canonical = (v: unknown) =>
  JSON.parse(
    JSON.stringify(v, (_, n) => (typeof n === "bigint" ? n.toString() : n)),
  );
describe("native Rust 0.7.7 transaction evidence", () => {
  for (const c of corpus.cases) {
    it(c.name + " route matches all Rust fields", () =>
      expect(canonical(analyzeRpcTransactionRoutes(c.transaction))).toEqual(
        c.expected,
      ),
    );
    it(c.name + " native wire and ShredStream", () => {
      const tx = c.transaction.result ?? c.transaction,
        bytes = Buffer.from(tx.transaction[0], "base64");
      const decoded = decodeWireTransaction(bytes);
      expect(decoded.length).toBe(bytes.length);
      expect(decoded.transaction.signatures[0]).toBe(c.expected.signature);
      expect(wireBytesToShredWasmTx(bytes)?.signature).toBe(
        c.expected.signature,
      );
      expect(() => decodeWireTransaction(bytes.subarray(0, -1))).toThrow();
      expect(() =>
        decodeWireTransaction(Buffer.concat([bytes, Buffer.from([0])])),
      ).toThrow();
    });
  }
});
