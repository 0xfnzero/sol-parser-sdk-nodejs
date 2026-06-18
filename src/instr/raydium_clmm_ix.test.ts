import { describe, expect, it } from "vitest";
import { eventTypeFilterIncludesRaydiumClmm } from "../grpc/types.js";
import { parseRaydiumCpmmInstruction } from "./raydium_cpmm_ix.js";
import { parseRaydiumClmmInstruction } from "./raydium_clmm_ix.js";

const DEC_LIQ_V2_DISC = [58, 127, 188, 62, 79, 82, 196, 96];
const DEC_LIQ_LOG_DISC = [160, 38, 208, 111, 104, 91, 44, 1];
const CREATE_CUSTOMIZABLE_POOL_DISC = [43, 68, 212, 167, 89, 47, 164, 1];
const OPEN_POSITION_DISC = [135, 128, 47, 77, 15, 152, 240, 49];
const OPEN_POSITION_V2_DISC = [77, 184, 74, 214, 112, 86, 241, 199];
const OPEN_POSITION_WITH_TOKEN_22_NFT_DISC = [77, 255, 174, 82, 125, 29, 201, 46];
const CLOSE_POSITION_DISC = [123, 134, 81, 0, 49, 68, 98, 98];
const CPMM_DEPOSIT_DISC = [242, 35, 198, 137, 82, 225, 242, 182];
const CPMM_WITHDRAW_DISC = [183, 18, 70, 156, 148, 109, 161, 34];
const CPMM_SWAP_IN_DISC = [143, 190, 90, 218, 196, 30, 51, 222];

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `account_${i}`);
}

function clmmU64Instruction(disc: number[], values: bigint[]): Uint8Array {
  const data = new Uint8Array(8 + values.length * 8);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  values.forEach((value, index) => view.setBigUint64(8 + index * 8, value, true));
  return data;
}

function clmmLiquidityInstruction(disc: number[], liquidity: bigint, amount0: bigint, amount1: bigint): Uint8Array {
  const data = new Uint8Array(8 + 16 + 8 + 8);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  view.setBigUint64(8, liquidity & ((1n << 64n) - 1n), true);
  view.setBigUint64(16, liquidity >> 64n, true);
  view.setBigUint64(24, amount0, true);
  view.setBigUint64(32, amount1, true);
  return data;
}

function openPositionInstruction(disc: number[], lower: number, upper: number, liquidity: bigint): Uint8Array {
  const data = new Uint8Array(8 + 4 + 4 + 4 + 4 + 16 + 8 + 8);
  data.set(disc, 0);
  const view = new DataView(data.buffer);
  view.setInt32(8, lower, true);
  view.setInt32(12, upper, true);
  view.setBigUint64(24, liquidity & ((1n << 64n) - 1n), true);
  view.setBigUint64(32, liquidity >> 64n, true);
  return data;
}

function createCustomizablePoolInstruction(sqrtPriceX64: bigint): Uint8Array {
  const data = new Uint8Array(8 + 16);
  data.set(CREATE_CUSTOMIZABLE_POOL_DISC, 0);
  const view = new DataView(data.buffer);
  view.setBigUint64(8, sqrtPriceX64 & ((1n << 64n) - 1n), true);
  view.setBigUint64(16, sqrtPriceX64 >> 64n, true);
  return data;
}

describe("Raydium CLMM instruction parity", () => {
  it("uses the Rust V2 decrease-liquidity instruction discriminator", () => {
    const ev = parseRaydiumClmmInstruction(
      clmmLiquidityInstruction(DEC_LIQ_V2_DISC, (1n << 80n) + 111n, 222n, 333n),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    expect("RaydiumClmmDecreaseLiquidity" in ev!).toBe(true);
    const data = ev && "RaydiumClmmDecreaseLiquidity" in ev ? ev.RaydiumClmmDecreaseLiquidity : null;
    expect(data?.pool).toBe("account_3");
    expect(data?.position_nft_mint).toBe("account_1");
    expect(data?.user).toBe("account_0");
    expect(data?.liquidity).toBe((1n << 80n) + 111n);
    expect(data?.amount0_min).toBe(222n);
    expect(data?.amount1_min).toBe(333n);

    expect(parseRaydiumClmmInstruction(
      clmmLiquidityInstruction(DEC_LIQ_LOG_DISC, 111n, 222n, 333n),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    )).toBeNull();
  });

  it("parses open and close position with Rust account indexes", () => {
    const liquidity = (1n << 80n) + 123n;
    const open = parseRaydiumClmmInstruction(
      openPositionInstruction(OPEN_POSITION_V2_DISC, -10, 20, liquidity),
      accounts(7),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(open).toBeTruthy();
    const openData = open && "RaydiumClmmOpenPosition" in open ? open.RaydiumClmmOpenPosition : null;
    expect(openData?.pool).toBe("account_5");
    expect(openData?.user).toBe("account_1");
    expect(openData?.position_nft_mint).toBe("account_2");
    expect(openData?.tick_lower_index).toBe(-10);
    expect(openData?.tick_upper_index).toBe(20);
    expect(openData?.liquidity).toBe(liquidity);
    expect(eventTypeFilterIncludesRaydiumClmm({ include_only: ["RaydiumClmmOpenPosition"] })).toBe(true);

    const legacyOpen = parseRaydiumClmmInstruction(
      openPositionInstruction(OPEN_POSITION_DISC, -11, 21, 456n),
      accounts(7),
      "sig",
      1,
      0,
      undefined,
      10
    );
    const legacyOpenData = legacyOpen && "RaydiumClmmOpenPosition" in legacyOpen ? legacyOpen.RaydiumClmmOpenPosition : null;
    expect(legacyOpenData?.pool).toBe("account_5");

    const token22Open = parseRaydiumClmmInstruction(
      openPositionInstruction(OPEN_POSITION_WITH_TOKEN_22_NFT_DISC, -12, 22, 789n),
      accounts(7),
      "sig",
      1,
      0,
      undefined,
      10
    );
    const token22OpenData = token22Open && "RaydiumClmmOpenPosition" in token22Open ? token22Open.RaydiumClmmOpenPosition : null;
    expect(token22OpenData?.pool).toBe("account_4");

    const close = parseRaydiumClmmInstruction(new Uint8Array(CLOSE_POSITION_DISC), accounts(4), "sig", 1, 0, undefined, 10);
    expect(close).toBeTruthy();
    const closeData = close && "RaydiumClmmClosePosition" in close ? close.RaydiumClmmClosePosition : null;
    expect(closeData?.pool).toBe("11111111111111111111111111111111");
    expect(closeData?.user).toBe("account_0");
    expect(closeData?.position_nft_mint).toBe("account_1");
  });

  it("parses customizable pool create with Rust defaults", () => {
    const sqrtPriceX64 = (1n << 80n) + 999n;
    const ev = parseRaydiumClmmInstruction(
      createCustomizablePoolInstruction(sqrtPriceX64),
      accounts(7),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(ev && "RaydiumClmmCreatePool" in ev).toBe(true);
    const data = ev && "RaydiumClmmCreatePool" in ev ? ev.RaydiumClmmCreatePool : null;
    expect(data?.pool).toBe("account_2");
    expect(data?.creator).toBe("account_0");
    expect(data?.token_0_mint).toBe("account_3");
    expect(data?.token_1_mint).toBe("account_4");
    expect(data?.sqrt_price_x64).toBe(sqrtPriceX64);
    expect(data?.token_vault_0).toBe("account_5");
    expect(data?.token_vault_1).toBe("account_6");
    expect(data?.open_time).toBe(0n);
  });
});

describe("Raydium CPMM instruction parity", () => {
  it("uses Rust normal-instruction account indexes and log-backed swap defaults", () => {
    const deposit = parseRaydiumCpmmInstruction(
      clmmU64Instruction(CPMM_DEPOSIT_DISC, [111n, 222n, 333n]),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(deposit && "RaydiumCpmmDeposit" in deposit).toBe(true);
    const depositData = deposit && "RaydiumCpmmDeposit" in deposit ? deposit.RaydiumCpmmDeposit : null;
    expect(depositData?.pool).toBe("account_0");
    expect(depositData?.user).toBe("account_1");
    expect(depositData?.lp_token_amount).toBe(111n);
    expect(depositData?.token0_amount).toBe(222n);
    expect(depositData?.token1_amount).toBe(333n);

    const withdraw = parseRaydiumCpmmInstruction(
      clmmU64Instruction(CPMM_WITHDRAW_DISC, [444n, 555n, 666n]),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(withdraw && "RaydiumCpmmWithdraw" in withdraw).toBe(true);
    const withdrawData = withdraw && "RaydiumCpmmWithdraw" in withdraw ? withdraw.RaydiumCpmmWithdraw : null;
    expect(withdrawData?.pool).toBe("account_0");
    expect(withdrawData?.user).toBe("account_1");
    expect(withdrawData?.lp_token_amount).toBe(444n);
    expect(withdrawData?.token0_amount).toBe(555n);
    expect(withdrawData?.token1_amount).toBe(666n);

    const swap = parseRaydiumCpmmInstruction(
      clmmU64Instruction(CPMM_SWAP_IN_DISC, [777n, 888n]),
      accounts(4),
      "sig",
      1,
      0,
      undefined,
      10
    );
    expect(swap && "RaydiumCpmmSwap" in swap).toBe(true);
    const swapData = swap && "RaydiumCpmmSwap" in swap ? swap.RaydiumCpmmSwap : null;
    expect(swapData?.pool_id).toBe("11111111111111111111111111111111");
    expect(swapData?.input_amount).toBe(0n);
    expect(swapData?.output_amount).toBe(0n);
    expect(swapData?.base_input).toBe(true);
  });
});
