import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { parseLogOptimized } from "./optimized_matcher.js";
import { PROGRAM_LOG_DISC } from "./program_log_discriminators.js";
import { eventTypeFilterExclude, eventTypeFilterIncludeOnly } from "../grpc/types.js";

function discBytes(disc: bigint): number[] {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, disc, true);
  return Array.from(out);
}

function pk(seed: number): Uint8Array {
  return Uint8Array.from({ length: 32 }, (_, i) => (seed + i) & 0xff);
}

function pkString(seed: number): string {
  return new PublicKey(pk(seed)).toBase58();
}

function i32Bytes(value: number): number[] {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, value, true);
  return Array.from(out);
}

function u64Bytes(value: bigint): number[] {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, value, true);
  return Array.from(out);
}

function u128Bytes(value: bigint): number[] {
  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, value & ((1n << 64n) - 1n), true);
  view.setBigUint64(8, value >> 64n, true);
  return Array.from(out);
}

function u16Bytes(value: number): number[] {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return Array.from(out);
}

function programData(bytes: number[]): string {
  return `Program data: ${Buffer.from(bytes).toString("base64")}`;
}

describe("Raydium CLMM advanced log events", () => {
  it("parses base Program data layouts with Rust discriminators", () => {
    const swapPayload = [
      ...discBytes(PROGRAM_LOG_DISC.RAYDIUM_CLMM_SWAP),
      ...pk(1),
      ...pk(2),
      ...pk(3),
      ...pk(4),
      ...u64Bytes(10n),
      ...u64Bytes(1n),
      ...u64Bytes(20n),
      ...u64Bytes(2n),
      1,
      ...u128Bytes((1n << 80n) + 30n),
      ...u128Bytes((1n << 96n) + 40n),
      ...i32Bytes(-77),
    ];
    const swap = parseLogOptimized(programData(swapPayload), "sig", 1, 0, undefined, 10, undefined, false);

    expect(swap && "RaydiumClmmSwap" in swap).toBe(true);
    const swapData = swap && "RaydiumClmmSwap" in swap ? swap.RaydiumClmmSwap : null;
    expect(swapData?.pool_state).toBe(pkString(1));
    expect(swapData?.sender).toBe(pkString(2));
    expect(swapData?.token_account_0).toBe(pkString(3));
    expect(swapData?.token_account_1).toBe(pkString(4));
    expect(swapData?.amount_0).toBe(10n);
    expect(swapData?.transfer_fee_0).toBe(1n);
    expect(swapData?.amount_1).toBe(20n);
    expect(swapData?.transfer_fee_1).toBe(2n);
    expect(swapData?.zero_for_one).toBe(true);
    expect(swapData?.sqrt_price_x64).toBe((1n << 80n) + 30n);
    expect(swapData?.liquidity).toBe((1n << 96n) + 40n);
    expect(swapData?.tick).toBe(-77);

    const createPayload = [
      ...discBytes(PROGRAM_LOG_DISC.RAYDIUM_CLMM_CREATE_POOL),
      ...pk(5),
      ...pk(6),
      ...u16Bytes(64),
      ...pk(7),
      ...u128Bytes((1n << 72n) + 55n),
      ...i32Bytes(88),
      ...pk(8),
      ...pk(9),
    ];
    const create = parseLogOptimized(programData(createPayload), "sig", 1, 0, undefined, 10, undefined, false);
    expect(create && "RaydiumClmmCreatePool" in create).toBe(true);
    const createData = create && "RaydiumClmmCreatePool" in create ? create.RaydiumClmmCreatePool : null;
    expect(createData?.token_0_mint).toBe(pkString(5));
    expect(createData?.token_1_mint).toBe(pkString(6));
    expect(createData?.tick_spacing).toBe(64);
    expect(createData?.pool).toBe(pkString(7));
    expect(createData?.sqrt_price_x64).toBe((1n << 72n) + 55n);
    expect(createData?.tick).toBe(88);
    expect(createData?.token_vault_0).toBe(pkString(8));
    expect(createData?.token_vault_1).toBe(pkString(9));

    const oldInstructionDisc = [248, 198, 158, 145, 225, 117, 135, 200];
    expect(parseLogOptimized(programData([...oldInstructionDisc, ...pk(1)]), "sig", 1, 0, undefined, 10, undefined, false))
      .toBeNull();
  });

  it("normalizes personal and protocol collect fee logs", () => {
    const personal = parseLogOptimized(
      programData([
        ...discBytes(PROGRAM_LOG_DISC.RAYDIUM_CLMM_COLLECT_PERSONAL_FEE),
        ...pk(10),
        ...pk(11),
        ...pk(12),
        ...u64Bytes(70n),
        ...u64Bytes(80n),
      ]),
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["RaydiumClmmCollectFee"]),
      false
    );
    expect(personal && "RaydiumClmmCollectFee" in personal).toBe(true);
    const personalData = personal && "RaydiumClmmCollectFee" in personal ? personal.RaydiumClmmCollectFee : null;
    expect(personalData?.position_nft_mint).toBe(pkString(10));
    expect(personalData?.recipient_token_account_0).toBe(pkString(11));
    expect(personalData?.recipient_token_account_1).toBe(pkString(12));
    expect(personalData?.amount_0).toBe(70n);
    expect(personalData?.amount_1).toBe(80n);

    const protocol = parseLogOptimized(
      programData([
        ...discBytes(PROGRAM_LOG_DISC.RAYDIUM_CLMM_COLLECT_PROTOCOL_FEE),
        ...pk(13),
        ...pk(14),
        ...pk(15),
        ...u64Bytes(90n),
        ...u64Bytes(100n),
      ]),
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["RaydiumClmmCollectFee"]),
      false
    );
    expect(protocol && "RaydiumClmmCollectFee" in protocol).toBe(true);
    const protocolData = protocol && "RaydiumClmmCollectFee" in protocol ? protocol.RaydiumClmmCollectFee : null;
    expect(protocolData?.pool_state).toBe(pkString(13));
    expect(protocolData?.recipient_token_account_0).toBe(pkString(14));
    expect(protocolData?.recipient_token_account_1).toBe(pkString(15));
    expect(protocolData?.amount_0).toBe(90n);
    expect(protocolData?.amount_1).toBe(100n);
  });

  it("parses OpenLimitOrder and applies exact event filters", () => {
    const payload = [
      ...discBytes(PROGRAM_LOG_DISC.RAYDIUM_CLMM_OPEN_LIMIT_ORDER),
      ...pk(1),
      ...pk(2),
      1,
      ...i32Bytes(-123),
      ...u64Bytes(456n),
      ...u64Bytes(7n),
    ];
    const log = programData(payload);

    const ev = parseLogOptimized(
      log,
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterIncludeOnly(["RaydiumClmmOpenLimitOrder"]),
      false
    );

    expect(ev && "RaydiumClmmOpenLimitOrder" in ev).toBe(true);
    const data = ev && "RaydiumClmmOpenLimitOrder" in ev ? ev.RaydiumClmmOpenLimitOrder : null;
    expect(data?.pool_id).toBe(pkString(1));
    expect(data?.limit_order).toBe(pkString(2));
    expect(data?.zero_for_one).toBe(true);
    expect(data?.tick_index).toBe(-123);
    expect(data?.total_amount).toBe(456n);
    expect(data?.transfer_fee).toBe(7n);

    expect(parseLogOptimized(
      log,
      "sig",
      1,
      0,
      undefined,
      10,
      eventTypeFilterExclude(["RaydiumClmmOpenLimitOrder"]),
      false
    )).toBeNull();
  });
});
