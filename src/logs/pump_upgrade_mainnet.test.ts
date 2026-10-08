import { describe, it, expect } from "vitest";
import { Message, MessageV0, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import fixture from "../../tests/fixtures/pump_upgrade/mainnet.json";
import simulated from "../../tests/fixtures/pump_upgrade/simulation_events.json";
import { parseRpcTransaction } from "../rpc_transaction.js";

describe("captured mainnet Pump upgrade regression", () => {
  for (const c of [...fixture.cases, ...simulated.cases])
    it((c as any).name ?? c.signature.slice(0, 12), () => {
      const raw: any = c.raw,
        m = raw.transaction.message;
      // JSON RPC provides compiled keys/instructions for V1 too; reconstruct this
      // semantic view for the parser, without claiming to deserialize V1 wire here.
      const message = m.addressTableLookups
        ? new MessageV0({
            header: m.header,
            staticAccountKeys: m.accountKeys.map(
              (k: string) => new PublicKey(k),
            ),
            recentBlockhash: m.recentBlockhash,
            compiledInstructions: m.instructions.map((i: any) => ({
              programIdIndex: i.programIdIndex,
              accountKeyIndexes: i.accounts,
              data: bs58.decode(i.data),
            })),
            addressTableLookups: m.addressTableLookups.map((a: any) => ({
              ...a,
              accountKey: new PublicKey(a.accountKey),
            })),
          })
        : new Message(m);
      const meta = {
        ...raw.meta,
        loadedAddresses: {
          writable: (raw.meta.loadedAddresses?.writable ?? []).map(
            (k: string) => new PublicKey(k),
          ),
          readonly: (raw.meta.loadedAddresses?.readonly ?? []).map(
            (k: string) => new PublicKey(k),
          ),
        },
      };
      const parsed = parseRpcTransaction(
        { ...raw, meta, transaction: { ...raw.transaction, message } },
        c.signature,
      );
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      if (raw.meta.err != null) {
        expect(parsed.events).toEqual([]);
        return;
      }
      for (const expected of c.expected) {
        const d: any = expected.data,
          identity = expected.name === "TradeEvent" ? "mint" : "pool";
        const matches = parsed.events
          .flatMap((e) => Object.values(e))
          .filter(
            (a: any) =>
              a[identity] === d[identity] &&
              a.user === d.user &&
              (d.is_buy === undefined || a.is_buy === d.is_buy) &&
              (expected.name !== "BuyEvent" ||
                a.base_amount_out !== undefined) &&
              (expected.name !== "SellEvent" || a.base_amount_in !== undefined),
          );
        expect(matches).toHaveLength(1);
        const actual: any = matches[0];
        for (const [k, v] of Object.entries(d)) {
          if (k === "shareholders") continue;
          if (k === "quote_mint" && v === "11111111111111111111111111111111")
            expect([
              v,
              "So11111111111111111111111111111111111111111",
              "So11111111111111111111111111111111111111112",
            ]).toContain(actual[k]);
          else expect(String(actual[k]), k).toBe(String(v));
        }
      }
    });
});
