import { it, expect } from "vitest";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
} from "@solana/web3.js";
import { fillAccountsFromTransactionDataRpc } from "./account_dispatcher_rpc.js";
import {
  getAccountKeyResolver,
  buildProgramInvokesMap,
} from "./rpc_invoke_map.js";
import { parseRaydiumLaunchlabTradeFromData } from "../logs/raydium_launchlab.js";
function fixture(samePool = false) {
  const program = new PublicKey("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj");
  const key = (n: number) =>
    new PublicKey(Uint8Array.from({ length: 32 }, () => n));
  const first = Array.from({ length: 18 }, (_, i) => key(i + 1)),
    second = Array.from({ length: 18 }, (_, i) => key(i + 40));
  if (samePool) second[4] = first[4]!;
  const ix = (keys: PublicKey[]) =>
    new TransactionInstruction({
      programId: program,
      data: Buffer.from([
        250,
        234,
        13,
        123,
        213,
        156,
        19,
        236,
        ...Array(24).fill(0),
      ]),
      keys: keys.map((pubkey) => ({
        pubkey,
        isSigner: false,
        isWritable: false,
      })),
    });
  const message = new TransactionMessage({
    payerKey: key(99),
    recentBlockhash: PublicKey.default.toBase58(),
    instructions: [ix(first), ix(second)],
  }).compileToLegacyMessage();
  const data = Buffer.alloc(139);
  second[4]!.toBuffer().copy(data);
  data[138] = 1;
  const event = parseRaydiumLaunchlabTradeFromData(data, {
    signature: "sig",
    slot: 1,
    tx_index: 0,
    block_time_us: 0,
    grpc_recv_us: 0,
  })!;
  const resolver = getAccountKeyResolver(message, null);
  fillAccountsFromTransactionDataRpc(
    event,
    message,
    null,
    buildProgramInvokesMap(message, null, resolver),
    resolver,
  );
  return { event, second };
}
it("fills the matching LaunchLab pool rather than another invocation of the program", () => {
  const { event, second } = fixture();
  expect(
    "RaydiumLaunchlabTrade" in event && event.RaydiumLaunchlabTrade.base_mint,
  ).toBe(second[9]!.toBase58());
  expect(
    "RaydiumLaunchlabTrade" in event && event.RaydiumLaunchlabTrade.user,
  ).toBe(second[0]!.toBase58());
});
it("leaves missing context when one pool has ambiguous users", () => {
  const { event } = fixture(true);
  expect(
    "RaydiumLaunchlabTrade" in event && event.RaydiumLaunchlabTrade.user,
  ).toBe(PublicKey.default.toBase58());
  expect(
    "RaydiumLaunchlabTrade" in event &&
      event.RaydiumLaunchlabTrade.platform_config,
  ).toBeUndefined();
});
