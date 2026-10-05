import { it, expect } from "vitest";
import { parseRaydiumAmmV4Instruction } from "./raydium_amm_v4_ix.js";
const zero = "11111111111111111111111111111111";
for (const tag of [16, 17])
  it("V2 eight account event " + tag, () => {
    const keys = Array.from({ length: 8 }, (_, i) => "account-" + i),
      data = Buffer.alloc(17);
    data[0] = tag;
    data.writeBigUInt64LE(1001n, 1);
    data.writeBigUInt64LE(500n, 9);
    const event = parseRaydiumAmmV4Instruction(
      data,
      keys,
      "signature",
      123,
      4,
      567,
      890,
    )!;
    expect("RaydiumAmmV4Swap" in event).toBe(true);
    if (!("RaydiumAmmV4Swap" in event)) throw Error("wrong event");
    expect(event.RaydiumAmmV4Swap).toMatchObject({
      amm: keys[1],
      pool_coin_token_account: keys[3],
      pool_pc_token_account: keys[4],
      user_source_token_account: keys[5],
      user_destination_token_account: keys[6],
      user_source_owner: keys[7],
      amm_open_orders: zero,
      serum_program: zero,
      serum_market: zero,
      ...(tag === 16
        ? {
            amount_in: 1001n,
            minimum_amount_out: 500n,
            max_amount_in: 0n,
            amount_out: 0n,
          }
        : {
            amount_in: 0n,
            minimum_amount_out: 0n,
            max_amount_in: 1001n,
            amount_out: 500n,
          }),
    });
    expect(
      parseRaydiumAmmV4Instruction(
        data,
        keys.slice(0, 7),
        "s",
        1,
        0,
        undefined,
        0,
      ),
    ).toBeNull();
    expect(
      parseRaydiumAmmV4Instruction(
        data.subarray(0, 16),
        keys,
        "s",
        1,
        0,
        undefined,
        0,
      ),
    ).toBeNull();
  });

import { PublicKey, type Message } from "@solana/web3.js";
import { fillAccountsFromTransactionDataRpc } from "../core/account_dispatcher_rpc.js";
for (const mode of ["single", "anchored", "ambiguous"])
  it("V2 log context " + mode, () => {
    const keys = Array.from(
        { length: 16 },
        (_, i) => new PublicKey(Buffer.alloc(32, i + 1)),
      ),
      data = Buffer.alloc(17);
    data[0] = 16;
    const event = parseRaydiumAmmV4Instruction(
      data,
      Array(8).fill(zero),
      "s",
      1,
      0,
      undefined,
      0,
    )!;
    if (!("RaydiumAmmV4Swap" in event)) throw Error("missing swap");
    if (mode === "anchored") event.RaydiumAmmV4Swap.amm = keys[9]!.toBase58();
    const message = {
      compiledInstructions: [
        { accountKeyIndexes: [0, 1, 2, 3, 4, 5, 6, 7] },
        { accountKeyIndexes: [8, 9, 10, 11, 12, 13, 14, 15] },
      ],
    } as unknown as Message;
    const inv: Array<[number, number]> =
      mode === "single"
        ? [[0, -1]]
        : [
            [0, -1],
            [1, -1],
          ];
    fillAccountsFromTransactionDataRpc(
      event,
      message,
      null,
      new Map([["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", inv]]),
      { get: (i) => keys[i] },
    );
    if (mode === "ambiguous")
      expect(event.RaydiumAmmV4Swap).toMatchObject({
        amm: zero,
        user_source_owner: zero,
      });
    else {
      const offset = mode === "single" ? 0 : 8;
      expect(event.RaydiumAmmV4Swap).toMatchObject({
        user_source_owner: keys[offset + 7]!.toBase58(),
        pool_coin_token_account: keys[offset + 3]!.toBase58(),
      });
    }
  });
