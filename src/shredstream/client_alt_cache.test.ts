import { describe, expect, it, vi } from "vitest";
import { AddressLookupTableAccount, type Connection, PublicKey } from "@solana/web3.js";
import { defaultShredStreamConfig } from "./config.js";
import { ShredEventQueue, ShredStreamClient } from "./client.js";
import { decodeShredstreamEntriesBincode } from "./entries_decode.js";
import type { ShredWasmTx } from "./instruction_parse.js";
import { PUMPFUN_PROGRAM_ID } from "../instr/program_ids.js";
vi.mock("./entries_decode.js", () => ({ decodeShredstreamEntriesBincode: vi.fn() }));

const key = new PublicKey(new Uint8Array(32).fill(1));
const table = new AddressLookupTableAccount({ key, state: {
  deactivationSlot: 0xffffffffffffffffn, lastExtendedSlot: 0,
  lastExtendedSlotStartIndex: 0, authority: undefined, addresses: [PublicKey.default],
} });
function transaction(signature: string): ShredWasmTx {
  const data = new Uint8Array(24);
  data.set([184, 23, 238, 97, 103, 197, 211, 61]);
  new DataView(data.buffer).setBigUint64(8, 111n, true);
  return { signature, messageVersion: "v0", accounts: [PUMPFUN_PROGRAM_ID, PublicKey.default.toBase58(), key.toBase58()],
    instructions: [{ programIdIndex: 0, accounts: new Uint8Array([1, 2]), data }],
    header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 },
    recentBlockhash: new Uint8Array(32),
    addressTableLookups: [{ accountKey: key.toBase58(), writableIndexes: new Uint8Array([0]), readonlyIndexes: new Uint8Array() }],
  };
}
function createClient(prewarmed: boolean) {
  const rpc = vi.fn();
  // Reflect constructs the private factory implementation offline without pinging a server.
  const client = Reflect.construct(ShredStreamClient, ["http://localhost:1", {
    ...defaultShredStreamConfig(), connection: { getMultipleAccountsInfo: rpc } as unknown as Connection,
    address_lookup_tables: prewarmed ? [table] : [],
  }]) as ShredStreamClient;
  const process = (client as unknown as { processEntryMessage(entry: { slot: number; entries: Uint8Array }, queue: ShredEventQueue): void })
    .processEntryMessage.bind(client);
  return { client, process, rpc };
}

describe("ShredStream ALT cache parsing", () => {
  it("parses consecutive messages synchronously in arrival order without any RPC", () => {
    const { client, process, rpc } = createClient(true);
    const queue = new ShredEventQueue();
    for (const signature of ["first", "second"]) {
      vi.mocked(decodeShredstreamEntriesBincode).mockReturnValue([[transaction(signature)]]);
      expect(process({ slot: 42, entries: new Uint8Array() }, queue)).toBeUndefined();
    }
    expect(queue.len()).toBe(2);
    const first = queue.pop(), second = queue.pop();
    expect(first && "PumpFunBuy" in first && first.PumpFunBuy.metadata.signature).toBe("first");
    expect(second && "PumpFunBuy" in second && second.PumpFunBuy.metadata.signature).toBe("second");
    expect(rpc).not.toHaveBeenCalled();
    expect(client.getReceiveStats().altCacheMissTransactions).toBe(0);
  });

  it("skips a cache miss entirely and exposes its count rather than emitting guessed accounts", () => {
    const { client, process, rpc } = createClient(false);
    const queue = new ShredEventQueue();
    vi.mocked(decodeShredstreamEntriesBincode).mockReturnValue([[transaction("missing")]]);
    expect(process({ slot: 42, entries: new Uint8Array() }, queue)).toBeUndefined();
    expect(queue.len()).toBe(0);
    expect(client.getReceiveStats().altCacheMissTransactions).toBe(1);
    expect(client.getReceiveStats().transactionsDecoded).toBe(1);
    expect(rpc).not.toHaveBeenCalled();
  });
});
