import { Connection } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import type { DexEvent } from "./core/dex_event.js";
import { parseTransactionFromRpc } from "./rpc_parser.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const mainnet = process.env.RUN_MAINNET_TESTS === "1" ? describe.sequential : describe.skip;

function eventsOf(events: DexEvent[], name: string): Record<string, any>[] {
  return events.flatMap((event) => {
    const payload = (event as unknown as Record<string, Record<string, any>>)[name];
    return payload ? [payload] : [];
  });
}

async function parse(signature: string): Promise<DexEvent[]> {
  const result = await parseTransactionFromRpc(
    new Connection(RPC_URL, "confirmed"),
    signature
  );
  if (!result.ok) throw new Error(`${signature}: ${result.error.kind}: ${result.error.message}`);
  return result.events;
}

function expectFixtureMetadata(event: Record<string, any>, signature: string, slot: number): void {
  expect(event.metadata.signature).toBe(signature);
  expect(Number(event.metadata.slot)).toBe(slot);
}

// Captured from current mainnet transactions on 2026-08-13. Run with:
// RUN_MAINNET_TESTS=1 SOLANA_RPC_URL=<optional archive RPC> npm test
mainnet("current mainnet transaction fixtures", () => {
  it("parses the current Meteora DLMM event-CPI swap layout", async () => {
    const signature =
      "eEWaGsbRPoiD36Xf3epzSMmdtXX36va76b13YfsDV3ncsxQHBTjC68zZ8mbzFXTNWy3n3qKUAHjgHBconX4Gu1i";
    const events = await parse(signature);
    const swaps = eventsOf(events, "MeteoraDlmmSwap");
    expect(swaps).toHaveLength(1);
    expectFixtureMetadata(swaps[0], signature, 438873646);
    expect(swaps[0]).toMatchObject({
      amount_in: 2738183783n,
      amount_out: 81555062n,
      fee: 18486656n,
      protocol_fee: 2054072n,
    });

    const orcaSwaps = eventsOf(events, "OrcaWhirlpoolSwap");
    expect(orcaSwaps).toHaveLength(1);
    expect(orcaSwaps[0].whirlpool).toBe("coj59LYbLc6DhMwnxxfPc9mUiknjFSsW4XcuYw4DMPk");
    expect(orcaSwaps[0].input_amount).toBe(2397194654n);
    expect(orcaSwaps[0].output_amount).toBe(942951733n);
  }, 30_000);

  it("preserves all current Meteora DLMM add-liquidity occurrences", async () => {
    const signature =
      "h3sGiriW4jCGgbnNF8DaEKnsWhjtcH5ZM1dkyZFidgD2fx9aDNatray38yRmkxaWez3g5qFNpyXhE8ho716vjgp";
    const adds = eventsOf(await parse(signature), "MeteoraDlmmAddLiquidity");
    expect(adds).toHaveLength(3);
    expectFixtureMetadata(adds[0], signature, 438873652);
    expect(adds.map((event) => event.amounts)).toEqual([
      [0n, 389400592n],
      [4957546677n, 65633812n],
      [6984260460n, 0n],
    ]);
  }, 30_000);

  it("parses a current PumpFun buy", async () => {
    const signature =
      "QUYUtVPVkkjV2GGFTC4MfxtauNpRvWDViGCGxTckxPWbPZvEY92d1sZD9Lq5iK31sy3Drwy28gHmV89iRt9hz9R";
    const buys = eventsOf(await parse(signature), "PumpFunBuy");
    expect(buys).toHaveLength(1);
    expectFixtureMetadata(buys[0], signature, 438880952);
    expect(buys[0]).toMatchObject({
      sol_amount: 977777777n,
      token_amount: 30765521374696n,
      ix_name: "buy",
    });
  }, 30_000);

  it("parses a current PumpSwap buy", async () => {
    const signature =
      "2qgqjVi7XtBeSudSkZhbQrsdFNeMUB4jApLdcdihAwcWWb5SxQvQKjrfr2ZQ12TrR4BEwvaY7PiHLqE3uZD24iw7";
    const buys = eventsOf(await parse(signature), "PumpSwapBuy");
    expect(buys).toHaveLength(1);
    expectFixtureMetadata(buys[0], signature, 438881023);
    expect(buys[0]).toMatchObject({
      base_amount_out: 7317003080n,
      quote_amount_in: 10000000n,
      ix_name: "buy_exact_quote_in",
    });
  }, 30_000);

  it("parses a current Raydium CLMM swap", async () => {
    const signature =
      "2TyjCWrh3zqNmDg7NgdGAFqGaCbEkUHE8zrjzsRyqRVTXYZNKFFJgFEDce5mD4se3h2u6GyNJLXbeAW1ad8dsApq";
    const swaps = eventsOf(await parse(signature), "RaydiumClmmSwap");
    expect(swaps).toHaveLength(1);
    expectFixtureMetadata(swaps[0], signature, 438880315);
    expect(swaps[0]).toMatchObject({ amount_0: 156679n, amount_1: 11888n });
  }, 30_000);

  it("preserves all current Raydium CPMM swap occurrences", async () => {
    const signature =
      "4v27ccyrAgpCdCHLvjvn8smFn4Fb4HGcRVTSt952eNcF5jg5niA5bKRLPoGrzxXZdZULEZujgA5TXdESNbwmFYE8";
    const swaps = eventsOf(await parse(signature), "RaydiumCpmmSwap");
    expect(swaps).toHaveLength(3);
    expectFixtureMetadata(swaps[0], signature, 438881024);
    expect(swaps.map(({ pool_id, input_amount, output_amount }) => [
      pool_id,
      input_amount,
      output_amount,
    ])).toEqual([
      ["2VhaFEYL1exY86u8tTisfRjNwtCkX8bNbupHvSKzJuQJ", 851111n, 3788666n],
      ["3WYho5XjXfAzGsXdwdkFHw84rH6kCGCQnSYg6wHqypQo", 636739n, 1163813842n],
      ["DEHrWvTA1npSrcVt7xnWoyxdEgtpD4ZstmEeB2QLgFJj", 1163813842n, 2843080n],
    ]);
  }, 30_000);

  it("parses the official Raydium AMM V4 ray_log layout", async () => {
    const signature =
      "2iHYs4AHC5nutcbBxpA5aptBYTGaDUYBgamohfetDnAPiPBW5NkguxgnjVF5886Jy8MZ19UXdeZyPKq9C5wqAki4";
    const swaps = eventsOf(await parse(signature), "RaydiumAmmV4Swap");
    expect(swaps).toHaveLength(1);
    expectFixtureMetadata(swaps[0], signature, 438881026);
    expect(swaps[0]).toMatchObject({
      amm: "FuemMjepntbzthvSEVmDGnfq7YWr8UebZrAXJrP46VtF",
      amount_in: 28804156949609n,
      amount_out: 428715251n,
    });
  }, 30_000);

  it("parses a current Raydium LaunchLab trade", async () => {
    const signature =
      "4pSXdZEdL3oFCcbccroG7GkV4oEVtbygS2pBVP28chfNETEN8yqE3q6gMws4F2ZsbfE8rDGEbgBqTnv5xahH5RFT";
    const trades = eventsOf(await parse(signature), "RaydiumLaunchlabTrade");
    expect(trades).toHaveLength(1);
    expectFixtureMetadata(trades[0], signature, 438880206);
    expect(trades[0]).toMatchObject({
      amount_in: 511580573n,
      amount_out: 5169841048834n,
      trade_direction: "Buy",
    });
  }, 30_000);
});
