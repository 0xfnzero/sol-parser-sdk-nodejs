import { describe, expect, it } from "vitest";
import {
  ALL_EVENT_TYPES,
  eventTypeFilterExclude,
  eventTypeFilterAllowsInstructionParsing,
  eventTypeFilterIncludeOnly,
  eventTypeFilterIncludesMeteoraDbc,
  eventTypeFilterIncludesMeteoraDlmm,
  eventTypeFilterIncludesMeteoraPools,
  eventTypeFilterIncludesOrcaWhirlpool,
  eventTypeFilterIncludesPumpFees,
  eventTypeFilterIncludesPumpfun,
  eventTypeFilterIncludesPumpswap,
  eventTypeFilterIncludesRaydiumAmmV4,
  eventTypeFilterIncludesRaydiumClmm,
  eventTypeFilterIncludesRaydiumCpmm,
  eventTypeFilterIncludesRaydiumLaunchlab,
} from "./types.js";

describe("event type filters", () => {
  it("matches the Rust EventType inventory", () => {
    const rustEventTypes = [
      "BlockMeta",
      "RaydiumLaunchlabTrade",
      "RaydiumLaunchlabPoolCreate",
      "RaydiumLaunchlabMigrateAmm",
      "PumpFunTrade",
      "PumpFunBuy",
      "PumpFunSell",
      "PumpFunBuyExactSolIn",
      "PumpFunCreate",
      "PumpFunCreateV2",
      "PumpFunComplete",
      "PumpFunMigrate",
      "PumpFeesCreateFeeSharingConfig",
      "PumpFeesInitializeFeeConfig",
      "PumpFeesResetFeeSharingConfig",
      "PumpFeesRevokeFeeSharingAuthority",
      "PumpFeesTransferFeeSharingAuthority",
      "PumpFeesUpdateAdmin",
      "PumpFeesUpdateFeeConfig",
      "PumpFeesUpdateFeeShares",
      "PumpFeesUpsertFeeTiers",
      "PumpFunMigrateBondingCurveCreator",
      "PumpSwapTrade",
      "PumpSwapBuy",
      "PumpSwapSell",
      "PumpSwapCreatePool",
      "PumpSwapLiquidityAdded",
      "PumpSwapLiquidityRemoved",
      "RaydiumCpmmSwap",
      "RaydiumCpmmDeposit",
      "RaydiumCpmmWithdraw",
      "RaydiumCpmmInitialize",
      "RaydiumClmmSwap",
      "RaydiumClmmCreatePool",
      "RaydiumClmmOpenPosition",
      "RaydiumClmmClosePosition",
      "RaydiumClmmIncreaseLiquidity",
      "RaydiumClmmDecreaseLiquidity",
      "RaydiumClmmLiquidityChange",
      "RaydiumClmmConfigChange",
      "RaydiumClmmCreatePersonalPosition",
      "RaydiumClmmLiquidityCalculate",
      "RaydiumClmmOpenLimitOrder",
      "RaydiumClmmIncreaseLimitOrder",
      "RaydiumClmmDecreaseLimitOrder",
      "RaydiumClmmSettleLimitOrder",
      "RaydiumClmmUpdateRewardInfos",
      "RaydiumClmmOpenPositionWithTokenExtNft",
      "RaydiumClmmCollectFee",
      "RaydiumAmmV4Swap",
      "RaydiumAmmV4Deposit",
      "RaydiumAmmV4Withdraw",
      "RaydiumAmmV4Initialize2",
      "RaydiumAmmV4WithdrawPnl",
      "OrcaWhirlpoolSwap",
      "OrcaWhirlpoolLiquidityIncreased",
      "OrcaWhirlpoolLiquidityDecreased",
      "OrcaWhirlpoolPoolInitialized",
      "MeteoraPoolsSwap",
      "MeteoraPoolsAddLiquidity",
      "MeteoraPoolsRemoveLiquidity",
      "MeteoraPoolsBootstrapLiquidity",
      "MeteoraPoolsPoolCreated",
      "MeteoraPoolsSetPoolFees",
      "MeteoraDammV2Swap",
      "MeteoraDammV2AddLiquidity",
      "MeteoraDammV2RemoveLiquidity",
      "MeteoraDammV2InitializePool",
      "MeteoraDammV2CreatePosition",
      "MeteoraDammV2ClosePosition",
      "MeteoraDbcSwap",
      "MeteoraDbcInitializePool",
      "MeteoraDbcCurveComplete",
      "MeteoraDlmmSwap",
      "MeteoraDlmmAddLiquidity",
      "MeteoraDlmmRemoveLiquidity",
      "MeteoraDlmmInitializePool",
      "MeteoraDlmmInitializeBinArray",
      "MeteoraDlmmCreatePosition",
      "MeteoraDlmmClosePosition",
      "MeteoraDlmmClaimFee",
      "TokenAccount",
      "TokenInfo",
      "NonceAccount",
      "AccountPumpFunGlobal",
      "AccountPumpFunBondingCurve",
      "AccountPumpFunFeeConfig",
      "AccountPumpFunSharingConfig",
      "AccountPumpFunGlobalVolumeAccumulator",
      "AccountPumpFunUserVolumeAccumulator",
      "AccountPumpSwapGlobalConfig",
      "AccountPumpSwapPool",
      "AccountRaydiumClmmAmmConfig",
      "AccountRaydiumClmmPoolState",
      "AccountRaydiumClmmTickArrayState",
      "AccountRaydiumCpmmAmmConfig",
      "AccountRaydiumCpmmPoolState",
      "AccountOrcaWhirlpool",
      "AccountOrcaPosition",
      "AccountOrcaTickArray",
      "AccountOrcaFeeTier",
      "AccountOrcaWhirlpoolsConfig",
    ];
    expect(ALL_EVENT_TYPES).toEqual(rustEventTypes);
  });

  it("keeps Meteora DBC log-only events out of instruction prefilter", () => {
    expect(eventTypeFilterIncludesMeteoraDbc({ include_only: ["MeteoraDbcSwap"] })).toBe(true);
    expect(eventTypeFilterAllowsInstructionParsing(["MeteoraDbcSwap"])).toBe(false);
  });

  it("exposes Meteora Pools and DLMM protocol filter helpers", () => {
    expect(eventTypeFilterIncludesMeteoraPools(eventTypeFilterIncludeOnly(["MeteoraPoolsSwap"]))).toBe(true);
    expect(eventTypeFilterIncludesMeteoraPools(eventTypeFilterIncludeOnly(["PumpFunTrade"]))).toBe(false);
    expect(eventTypeFilterIncludesMeteoraDlmm(eventTypeFilterIncludeOnly(["MeteoraDlmmSwap"]))).toBe(true);
    expect(eventTypeFilterIncludesMeteoraDlmm(eventTypeFilterIncludeOnly(["PumpFunTrade"]))).toBe(false);
  });

  it("exposes new non-Pump account event names without enabling transaction parsers", () => {
    expect(ALL_EVENT_TYPES).toContain("AccountRaydiumClmmPoolState");
    expect(ALL_EVENT_TYPES).toContain("AccountRaydiumCpmmPoolState");
    expect(ALL_EVENT_TYPES).toContain("AccountOrcaWhirlpool");
    expect(eventTypeFilterIncludesRaydiumClmm({ include_only: ["AccountRaydiumClmmPoolState"] }))
      .toBe(false);
    expect(eventTypeFilterIncludesRaydiumCpmm({ include_only: ["AccountRaydiumCpmmPoolState"] }))
      .toBe(false);
    expect(eventTypeFilterIncludesOrcaWhirlpool({ include_only: ["AccountOrcaWhirlpool"] }))
      .toBe(false);
  });

  it("keeps protocol routes open for exclude filters and filters exact events later", () => {
    expect(eventTypeFilterIncludesPumpFees(eventTypeFilterExclude(["PumpFeesUpdateAdmin"]))).toBe(true);
    expect(eventTypeFilterIncludesRaydiumCpmm(eventTypeFilterExclude(["RaydiumCpmmSwap"]))).toBe(true);
    expect(eventTypeFilterIncludesRaydiumLaunchlab(eventTypeFilterExclude(["RaydiumLaunchlabPoolCreate"])))
      .toBe(true);
    expect(eventTypeFilterIncludesRaydiumCpmm(eventTypeFilterExclude([
      "RaydiumCpmmSwap",
      "RaydiumCpmmDeposit",
      "RaydiumCpmmWithdraw",
      "RaydiumCpmmInitialize",
    ]))).toBe(false);
    expect(eventTypeFilterIncludesRaydiumLaunchlab(eventTypeFilterExclude([
      "RaydiumLaunchlabTrade",
      "RaydiumLaunchlabPoolCreate",
      "RaydiumLaunchlabMigrateAmm",
    ]))).toBe(false);
  });

  it("matches Rust grouped event aliases for actual event filtering", () => {
    expect(eventTypeFilterIncludesPumpswap(eventTypeFilterIncludeOnly(["PumpSwapTrade"]))).toBe(true);
    expect(eventTypeFilterAllowsInstructionParsing(["PumpSwapTrade"])).toBe(true);
    expect(eventTypeFilterIncludeOnly(["PumpSwapTrade"]).shouldInclude("PumpSwapBuy")).toBe(true);
    expect(eventTypeFilterExclude(["PumpSwapTrade"]).shouldInclude("PumpSwapSell")).toBe(false);
    expect(eventTypeFilterIncludeOnly(["PumpFunBuy"]).shouldInclude("PumpFunBuyExactSolIn")).toBe(true);
  });

  it("keeps non-swap instruction variants on their protocol routes", () => {
    expect(eventTypeFilterIncludesRaydiumAmmV4(eventTypeFilterIncludeOnly(["RaydiumAmmV4Deposit"])))
      .toBe(true);
    expect(eventTypeFilterIncludesRaydiumClmm(eventTypeFilterIncludeOnly(["RaydiumClmmOpenLimitOrder"])))
      .toBe(true);
    expect(eventTypeFilterIncludesRaydiumClmm(eventTypeFilterExclude(["RaydiumClmmSwap"])))
      .toBe(true);
    expect(eventTypeFilterAllowsInstructionParsing(["MeteoraDammV2InitializePool"])).toBe(true);
  });

  it("keeps account-only filters off instruction protocol routes", () => {
    const pumpAccountOnly = eventTypeFilterIncludeOnly(["AccountPumpFunGlobal"]);
    expect(eventTypeFilterIncludesPumpfun(pumpAccountOnly)).toBe(false);
    expect(eventTypeFilterAllowsInstructionParsing(["AccountPumpFunGlobal"])).toBe(false);
    expect(eventTypeFilterIncludesPumpfun(eventTypeFilterIncludeOnly(["PumpFeesUpdateAdmin"])))
      .toBe(false);
    expect(eventTypeFilterAllowsInstructionParsing(["PumpFeesUpdateAdmin"])).toBe(true);
  });
});
