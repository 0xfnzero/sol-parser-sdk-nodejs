/**
 * Meteora DAMM V2 指令解析
 *
 * 1) **外层用户指令**（`@meteora-ag/cp-amm-sdk` / `cp_amm.json`）：`swap` / `initialize_pool` / `add_liquidity` / `remove_liquidity` / `remove_all_liquidity` / `create_position` / `close_position` 等
 * 2) **CPI 事件形**：前 8 字节为外层 Anchor discriminator，8..16 为 `emit!` 事件 disc，16.. 为载荷。
 */
import type {
  DexEvent,
  MeteoraDammV2AddLiquidityEvent,
  MeteoraDammV2ClosePositionEvent,
  MeteoraDammV2CreatePositionEvent,
  MeteoraDammV2InitializePoolEvent,
  MeteoraDammV2RemoveAllLiquidityEvent,
  MeteoraDammV2RemoveLiquidityEvent,
  MeteoraDammV2SwapEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readBool, readPubkeyIx, readU128LE, readU64LE, readU8 } from "./utils.js";

const Z = defaultPubkey();

function disc8(a: readonly number[]): Uint8Array {
  return Uint8Array.from(a);
}

const CPI = {
  SWAP_LOG: disc8([27, 60, 21, 213, 138, 170, 187, 147]),
  SWAP2_LOG: disc8([189, 66, 51, 168, 38, 80, 117, 153]),
  CREATE_POSITION_LOG: disc8([156, 15, 119, 198, 29, 181, 221, 55]),
  CLOSE_POSITION_LOG: disc8([20, 145, 144, 68, 143, 142, 214, 178]),
  ADD_LIQUIDITY_LOG: disc8([175, 242, 8, 157, 30, 247, 185, 169]),
  REMOVE_LIQUIDITY_LOG: disc8([87, 46, 88, 98, 175, 96, 34, 91]),
};

/** 与 cp_amm Anchor IDL `instructions[].discriminator` 一致（用户直接调用的外层指令） */
const ANCHOR = {
  SWAP: disc8([248, 198, 158, 145, 225, 117, 135, 200]),
  /** `swap2` — `SwapParameters2`（amount_0, amount_1, swap_mode） */
  SWAP2: disc8([65, 75, 63, 76, 235, 91, 91, 136]),
  ADD_LIQUIDITY: disc8([181, 157, 89, 67, 143, 182, 52, 72]),
  REMOVE_LIQUIDITY: disc8([80, 85, 209, 72, 24, 206, 177, 108]),
  REMOVE_ALL_LIQUIDITY: disc8([10, 51, 61, 35, 112, 105, 24, 85]),
  INITIALIZE_POOL: disc8([95, 180, 10, 172, 84, 174, 232, 40]),
  /** `create_position` / `close_position` 无额外 Borsh 参数，仅 8 字节 disc */
  CREATE_POSITION: disc8([48, 215, 197, 153, 96, 203, 180, 133]),
  CLOSE_POSITION: disc8([123, 134, 81, 0, 49, 68, 98, 98]),
};

function headEq(data: Uint8Array, disc: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) if (data[i] !== disc[i]) return false;
  return true;
}

function discEq(h: Uint8Array, d: Uint8Array): boolean {
  for (let i = 0; i < 8; i++) if (h[i] !== d[i]) return false;
  return true;
}

function vaults() {
  return {
    token_a_vault: Z,
    token_b_vault: Z,
    token_a_mint: Z,
    token_b_mint: Z,
    token_a_program: Z,
    token_b_program: Z,
  };
}

/**
 * cp_amm 外层 `swap` / `swap2` 账户顺序（见 `idls/meteora_damm_v2.json`）：
 * 0 pool_authority, 1 pool, 2 input_token_account, 3 output_token_account,
 * 4 token_a_vault, 5 token_b_vault, 6–7 mints, 8 payer, 9–10 token programs；
 * 11 起为可选 referral、event_authority、program 等。
 */
function meteoraSwapVaultsFromAccounts(accounts: string[]) {
  if (accounts.length < 11) {
    return vaults();
  }
  return {
    token_a_vault: getAccount(accounts, 4) ?? Z,
    token_b_vault: getAccount(accounts, 5) ?? Z,
    token_a_mint: getAccount(accounts, 6) ?? Z,
    token_b_mint: getAccount(accounts, 7) ?? Z,
    token_a_program: getAccount(accounts, 9) ?? Z,
    token_b_program: getAccount(accounts, 10) ?? Z,
  };
}

/**
 * 外层 `swap`：`SwapParameters` = amount_in (u64) + minimum_amount_out (u64)。
 * 成交额、手续费、`next_sqrt_price` 等仅在程序 `emit!`（日志 / 内联 CPI 载荷）中；**仅解析外层指令时这些字段保持 0**（与无日志的 ShredStream 一致）。
 */
function parseOuterSwapIx(
  instructionData: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2SwapEvent["metadata"]
): DexEvent {
  const amount_in = readU64LE(instructionData, 8) ?? 0n;
  const minimum_amount_out = readU64LE(instructionData, 16) ?? 0n;
  const pool = getAccount(accounts, 1) ?? Z;
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    trade_direction: 0,
    has_referral: false,
    amount_in,
    minimum_amount_out,
    output_amount: 0n,
    next_sqrt_price: 0n,
    lp_fee: 0n,
    protocol_fee: 0n,
    partner_fee: 0n,
    referral_fee: 0n,
    actual_amount_in: amount_in,
    current_timestamp: 0n,
    ...meteoraSwapVaultsFromAccounts(accounts),
  };
  return { MeteoraDammV2Swap: ev };
}

/** 外层 `swap2`：`SwapParameters2` = amount_0 + amount_1 + swap_mode (u8) */
function parseOuterSwap2Ix(
  instructionData: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2SwapEvent["metadata"]
): DexEvent | null {
  if (instructionData.length < 25) return null;
  const amount_0 = readU64LE(instructionData, 8) ?? 0n;
  const amount_1 = readU64LE(instructionData, 16) ?? 0n;
  const swap_mode = readU8(instructionData, 24);
  if (swap_mode === null) return null;
  const [amount_in, minimum_amount_out] =
    swap_mode === 0 ? [amount_0, amount_1] : [amount_1, amount_0];
  const pool = getAccount(accounts, 1) ?? Z;
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    trade_direction: 0,
    has_referral: false,
    amount_in,
    minimum_amount_out,
    output_amount: 0n,
    next_sqrt_price: 0n,
    lp_fee: 0n,
    protocol_fee: 0n,
    partner_fee: 0n,
    referral_fee: 0n,
    actual_amount_in: amount_in,
    current_timestamp: 0n,
    ...meteoraSwapVaultsFromAccounts(accounts),
  };
  return { MeteoraDammV2Swap: ev };
}

/** 外层 `add_liquidity`：`AddLiquidityParameters` = u128 + u64 + u64；pool(0), position(1), owner(9) */
function parseOuterAddLiquidityIx(
  instructionData: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2AddLiquidityEvent["metadata"]
): DexEvent {
  const liquidity_delta = readU128LE(instructionData, 8) ?? 0n;
  const token_a_amount_threshold = readU64LE(instructionData, 24) ?? 0n;
  const token_b_amount_threshold = readU64LE(instructionData, 32) ?? 0n;
  return {
    MeteoraDammV2AddLiquidity: {
      metadata: meta,
      pool: getAccount(accounts, 0) ?? Z,
      position: getAccount(accounts, 1) ?? Z,
      owner: getAccount(accounts, 9) ?? Z,
      liquidity_delta,
      token_a_amount_threshold,
      token_b_amount_threshold,
      token_a_amount: 0n,
      token_b_amount: 0n,
      total_amount_a: 0n,
      total_amount_b: 0n,
    },
  };
}

/** 外层 `remove_all_liquidity`：两 u64 阈值；账户顺序同 `remove_liquidity` */
function parseOuterRemoveAllLiquidityIx(
  instructionData: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2RemoveAllLiquidityEvent["metadata"]
): DexEvent {
  const token_a_amount_threshold = readU64LE(instructionData, 8) ?? 0n;
  const token_b_amount_threshold = readU64LE(instructionData, 16) ?? 0n;
  return {
    MeteoraDammV2RemoveAllLiquidity: {
      metadata: meta,
      pool: getAccount(accounts, 1) ?? Z,
      position: getAccount(accounts, 2) ?? Z,
      owner: getAccount(accounts, 10) ?? Z,
      token_a_amount_threshold,
      token_b_amount_threshold,
    },
  };
}

/** 外层 `initialize_pool`：`InitializePoolParameters` = u128 + u128 + Option(u64)；creator(0), pool(6), position(7), mints(8,9) */
function parseOuterInitializePoolIx(
  instructionData: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2InitializePoolEvent["metadata"]
): DexEvent | null {
  if (instructionData.length < 41) return null;
  const liquidity = readU128LE(instructionData, 8) ?? 0n;
  const sqrt_price = readU128LE(instructionData, 24) ?? 0n;
  const tag = readU8(instructionData, 40);
  if (tag === null) return null;
  let activation_point: bigint | null = null;
  if (tag === 1) {
    if (instructionData.length < 49) return null;
    activation_point = readU64LE(instructionData, 41) ?? 0n;
  } else if (tag !== 0) return null;
  if (accounts.length < 10) return null;
  return {
    MeteoraDammV2InitializePool: {
      metadata: meta,
      creator: getAccount(accounts, 0) ?? Z,
      position_nft_mint: getAccount(accounts, 1) ?? Z,
      pool: getAccount(accounts, 6) ?? Z,
      position: getAccount(accounts, 7) ?? Z,
      token_a_mint: getAccount(accounts, 8) ?? Z,
      token_b_mint: getAccount(accounts, 9) ?? Z,
      liquidity,
      sqrt_price,
      activation_point,
    },
  };
}

/** 外层 `remove_liquidity`：同上 Borsh；pool_authority(0), pool(1), position(2), owner(10) */
function parseOuterRemoveLiquidityIx(
  instructionData: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2RemoveLiquidityEvent["metadata"]
): DexEvent {
  const liquidity_delta = readU128LE(instructionData, 8) ?? 0n;
  const token_a_amount_threshold = readU64LE(instructionData, 24) ?? 0n;
  const token_b_amount_threshold = readU64LE(instructionData, 32) ?? 0n;
  return {
    MeteoraDammV2RemoveLiquidity: {
      metadata: meta,
      pool: getAccount(accounts, 1) ?? Z,
      position: getAccount(accounts, 2) ?? Z,
      owner: getAccount(accounts, 10) ?? Z,
      liquidity_delta,
      token_a_amount_threshold,
      token_b_amount_threshold,
      token_a_amount: 0n,
      token_b_amount: 0n,
    },
  };
}

/** 外层 `create_position`：无 args；owner(0), position_nft_mint(1), position_nft_account(2), pool(3), position(4) */
function parseOuterCreatePositionIx(
  accounts: string[],
  meta: MeteoraDammV2CreatePositionEvent["metadata"]
): DexEvent | null {
  if (accounts.length < 5) return null;
  return {
    MeteoraDammV2CreatePosition: {
      metadata: meta,
      owner: getAccount(accounts, 0) ?? Z,
      position_nft_mint: getAccount(accounts, 1) ?? Z,
      pool: getAccount(accounts, 3) ?? Z,
      position: getAccount(accounts, 4) ?? Z,
    },
  };
}

/** 外层 `close_position`：无 args；position_nft_mint(0), …, pool(2), position(3), …, owner(6) */
function parseOuterClosePositionIx(
  accounts: string[],
  meta: MeteoraDammV2ClosePositionEvent["metadata"]
): DexEvent | null {
  if (accounts.length < 7) return null;
  return {
    MeteoraDammV2ClosePosition: {
      metadata: meta,
      position_nft_mint: getAccount(accounts, 0) ?? Z,
      pool: getAccount(accounts, 2) ?? Z,
      position: getAccount(accounts, 3) ?? Z,
      owner: getAccount(accounts, 6) ?? Z,
    },
  };
}


function parseSwapCpi(
  data: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2SwapEvent["metadata"]
): DexEvent | null {
  let o = 0;
  const pool = readPubkeyIx(data, o);
  if (!pool) return null;
  o += 32;
  const trade_direction = readU8(data, o);
  if (trade_direction === null) return null;
  o += 1;
  const has_referral = readBool(data, o);
  if (has_referral === null) return null;
  o += 1;
  const amount_in = readU64LE(data, o);
  if (amount_in === null) return null;
  o += 8;
  const min_out = readU64LE(data, o);
  if (min_out === null) return null;
  o += 8;
  const output_amount = readU64LE(data, o);
  if (output_amount === null) return null;
  o += 8;
  const next_sqrt_price = readU128LE(data, o);
  if (next_sqrt_price === null) return null;
  o += 16;
  const lp_fee = readU64LE(data, o);
  if (lp_fee === null) return null;
  o += 8;
  const protocol_fee = readU64LE(data, o);
  if (protocol_fee === null) return null;
  o += 8;
  const partner_fee = readU64LE(data, o);
  if (partner_fee === null) return null;
  o += 8;
  const referral_fee = readU64LE(data, o);
  if (referral_fee === null) return null;
  o += 8;
  const actual_amount_in = readU64LE(data, o);
  if (actual_amount_in === null) return null;
  o += 8;
  const current_timestamp = readU64LE(data, o);
  if (current_timestamp === null) return null;
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    trade_direction,
    has_referral,
    amount_in,
    minimum_amount_out: min_out,
    output_amount,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee,
    referral_fee,
    actual_amount_in,
    current_timestamp,
    ...meteoraSwapVaultsFromAccounts(accounts),
  };
  return { MeteoraDammV2Swap: ev };
}

function parseSwap2Cpi(
  data: Uint8Array,
  accounts: string[],
  meta: MeteoraDammV2SwapEvent["metadata"]
): DexEvent | null {
  let o = 0;
  const pool = readPubkeyIx(data, o);
  if (!pool) return null;
  o += 32;
  const trade_direction = readU8(data, o);
  if (trade_direction === null) return null;
  o += 1;
  const _cfm = readU8(data, o);
  if (_cfm === null) return null;
  o += 1;
  const has_referral = readBool(data, o);
  if (has_referral === null) return null;
  o += 1;
  const amount_0 = readU64LE(data, o);
  if (amount_0 === null) return null;
  o += 8;
  const amount_1 = readU64LE(data, o);
  if (amount_1 === null) return null;
  o += 8;
  const swap_mode = readU8(data, o);
  if (swap_mode === null) return null;
  o += 1;
  const included_fee_input_amount = readU64LE(data, o);
  if (included_fee_input_amount === null) return null;
  o += 8;
  o += 8;
  o += 8;
  const output_amount = readU64LE(data, o);
  if (output_amount === null) return null;
  o += 8;
  const next_sqrt_price = readU128LE(data, o);
  if (next_sqrt_price === null) return null;
  o += 16;
  const lp_fee = readU64LE(data, o);
  if (lp_fee === null) return null;
  o += 8;
  const protocol_fee = readU64LE(data, o);
  if (protocol_fee === null) return null;
  o += 8;
  const referral_fee = readU64LE(data, o);
  if (referral_fee === null) return null;
  o += 8;
  o += 8;
  o += 8;
  const current_timestamp = readU64LE(data, o);
  if (current_timestamp === null) return null;
  const [amount_in, minimum_amount_out] =
    swap_mode === 0 ? [amount_0, amount_1] : [amount_1, amount_0];
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    trade_direction,
    has_referral,
    amount_in,
    minimum_amount_out,
    output_amount,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee: 0n,
    referral_fee,
    actual_amount_in: included_fee_input_amount,
    current_timestamp,
    ...meteoraSwapVaultsFromAccounts(accounts),
  };
  return { MeteoraDammV2Swap: ev };
}

export function parseMeteoraDammInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (instructionData.length >= 24 && headEq(instructionData, ANCHOR.SWAP)) {
    return parseOuterSwapIx(instructionData, accounts, meta);
  }
  if (instructionData.length >= 25 && headEq(instructionData, ANCHOR.SWAP2)) {
    return parseOuterSwap2Ix(instructionData, accounts, meta);
  }
  if (instructionData.length >= 41 && headEq(instructionData, ANCHOR.INITIALIZE_POOL)) {
    return parseOuterInitializePoolIx(instructionData, accounts, meta);
  }
  if (instructionData.length >= 40 && headEq(instructionData, ANCHOR.ADD_LIQUIDITY)) {
    return parseOuterAddLiquidityIx(instructionData, accounts, meta);
  }
  if (instructionData.length >= 40 && headEq(instructionData, ANCHOR.REMOVE_LIQUIDITY)) {
    return parseOuterRemoveLiquidityIx(instructionData, accounts, meta);
  }
  if (instructionData.length >= 24 && headEq(instructionData, ANCHOR.REMOVE_ALL_LIQUIDITY)) {
    return parseOuterRemoveAllLiquidityIx(instructionData, accounts, meta);
  }
  if (instructionData.length >= 8 && headEq(instructionData, ANCHOR.CREATE_POSITION)) {
    return parseOuterCreatePositionIx(accounts, meta);
  }
  if (instructionData.length >= 8 && headEq(instructionData, ANCHOR.CLOSE_POSITION)) {
    return parseOuterClosePositionIx(accounts, meta);
  }

  if (instructionData.length < 16) return null;
  const cpiHead = instructionData.subarray(8, 16);
  const cpiData = instructionData.subarray(16);

  if (discEq(cpiHead, CPI.SWAP_LOG)) return parseSwapCpi(cpiData, accounts, meta);
  if (discEq(cpiHead, CPI.SWAP2_LOG)) return parseSwap2Cpi(cpiData, accounts, meta);
  if (discEq(cpiHead, CPI.CREATE_POSITION_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const position_nft_mint = readPubkeyIx(cpiData, o);
    if (!position_nft_mint) return null;
    return {
      MeteoraDammV2CreatePosition: { metadata: meta, pool, owner, position, position_nft_mint },
    };
  }
  if (discEq(cpiHead, CPI.CLOSE_POSITION_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const position_nft_mint = readPubkeyIx(cpiData, o);
    if (!position_nft_mint) return null;
    return {
      MeteoraDammV2ClosePosition: { metadata: meta, pool, owner, position, position_nft_mint },
    };
  }
  if (discEq(cpiHead, CPI.ADD_LIQUIDITY_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const liquidity_delta = readU128LE(cpiData, o);
    if (liquidity_delta === null) return null;
    o += 16;
    const token_a_amount_threshold = readU64LE(cpiData, o);
    if (token_a_amount_threshold === null) return null;
    o += 8;
    const token_b_amount_threshold = readU64LE(cpiData, o);
    if (token_b_amount_threshold === null) return null;
    o += 8;
    const token_a_amount = readU64LE(cpiData, o);
    if (token_a_amount === null) return null;
    o += 8;
    const token_b_amount = readU64LE(cpiData, o);
    if (token_b_amount === null) return null;
    o += 8;
    const total_amount_a = readU64LE(cpiData, o);
    if (total_amount_a === null) return null;
    o += 8;
    const total_amount_b = readU64LE(cpiData, o);
    if (total_amount_b === null) return null;
    return {
      MeteoraDammV2AddLiquidity: {
        metadata: meta,
        pool,
        position,
        owner,
        liquidity_delta,
        token_a_amount_threshold,
        token_b_amount_threshold,
        token_a_amount,
        token_b_amount,
        total_amount_a,
        total_amount_b,
      },
    };
  }
  if (discEq(cpiHead, CPI.REMOVE_LIQUIDITY_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const liquidity_delta = readU128LE(cpiData, o);
    if (liquidity_delta === null) return null;
    o += 16;
    const token_a_amount_threshold = readU64LE(cpiData, o);
    if (token_a_amount_threshold === null) return null;
    o += 8;
    const token_b_amount_threshold = readU64LE(cpiData, o);
    if (token_b_amount_threshold === null) return null;
    o += 8;
    const token_a_amount = readU64LE(cpiData, o);
    if (token_a_amount === null) return null;
    o += 8;
    const token_b_amount = readU64LE(cpiData, o);
    if (token_b_amount === null) return null;
    return {
      MeteoraDammV2RemoveLiquidity: {
        metadata: meta,
        pool,
        position,
        owner,
        liquidity_delta,
        token_a_amount_threshold,
        token_b_amount_threshold,
        token_a_amount,
        token_b_amount,
      },
    };
  }
  return null;
}
