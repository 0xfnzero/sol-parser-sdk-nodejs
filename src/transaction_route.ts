/** Opt-in execution evidence, aligned with Rust sol-parser-sdk 0.7.7. */
import bs58 from "bs58";
import { decodeWireTransaction } from "./wire_transaction.js";
export const ZERO = "11111111111111111111111111111111";
export const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const WSOL = "So11111111111111111111111111111111111111112";
export const STONKFUN_STANDARD_PLATFORM_CONFIG =
  "4E876qZTE9FJMrBzgVtBrSrzz2TLivB5Y5QXPjB4gZL7";
export const STONKFUN_REWARD_PLATFORM_CONFIG =
  "6BwHHDg3u1854jC8PDLXvR4spTcLNaoBxLJNGC4nTESt";
export type StonkFunMode = "Standard" | "Reward";
export function stonkfunModeFromPlatformConfig(
  key: string,
): StonkFunMode | null {
  return key === STONKFUN_STANDARD_PLATFORM_CONFIG
    ? "Standard"
    : key === STONKFUN_REWARD_PLATFORM_CONFIG
      ? "Reward"
      : null;
}
export const ROUTE_PROGRAMS = {
  PumpFun: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  RaydiumClmm: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  RaydiumCpmm: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  RaydiumAmmV4: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  LaunchLab: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  OrcaWhirlpool: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  MeteoraDammV2: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
  MeteoraDlmm: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  PumpSwap: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
} as const;
export type SwapProtocol = keyof typeof ROUTE_PROGRAMS;
export interface InstructionPosition {
  outer_index: number;
  inner_index: number | null;
  stack_height: number | null;
}
export interface RouteSwapLeg {
  position: InstructionPosition;
  program: string;
  protocol: SwapProtocol;
  pool: string;
  trader: string;
  input_account: string;
  output_account: string;
  input_mint: string | null;
  output_mint: string | null;
  amount_specified_is_input: boolean;
  specified_amount: bigint;
  other_amount_threshold: bigint;
  actual_input_amount: bigint | null;
  actual_output_amount: bigint | null;
  stonkfun_mode: StonkFunMode | null;
  stonkfun_graduated: boolean;
}
export interface RouteTokenTransfer {
  position: InstructionPosition;
  program: string;
  source: string;
  destination: string;
  mint: string | null;
  amount: bigint;
  withheld_fee: bigint | null;
}
export interface RouteUnknownInvocation {
  position: InstructionPosition;
  program: string;
  has_token_transfers: boolean;
  has_known_swap_descendants: boolean;
}
export type NativeTokenAction =
  | "SyncNative"
  | { Fund: { source: string; lamports: bigint } }
  | { Close: { destination: string; authority: string } };
export interface RouteNativeTokenAction {
  position: InstructionPosition;
  account: string;
  action: NativeTokenAction;
}
export interface TransactionRoute {
  signature: string;
  succeeded: boolean;
  legs: RouteSwapLeg[];
  transfers: RouteTokenTransfer[];
  native_token_actions: RouteNativeTokenAction[];
  unknown_invocations: RouteUnknownInvocation[];
}
interface Invocation {
  position: InstructionPosition;
  program: string;
  accounts: string[];
  data: Buffer;
}
const hex = (values: number[]) => Buffer.from(values).toString("hex");
const SWAP = hex([248, 198, 158, 145, 225, 117, 135, 200]),
  V2 = hex([43, 4, 237, 11, 26, 201, 30, 98]);
const CPI = hex([143, 190, 90, 218, 196, 30, 51, 222]),
  CPO = hex([55, 217, 98, 86, 163, 74, 180, 173]);
const DLI = new Set([SWAP, hex([65, 75, 63, 76, 235, 91, 91, 136])]),
  DLO = new Set([
    hex([250, 73, 101, 33, 38, 207, 75, 184]),
    hex([43, 215, 247, 132, 137, 60, 243, 81]),
  ]);
const LAB = new Map<string, [boolean, boolean]>([
  [hex([250, 234, 13, 123, 213, 156, 19, 236]), [true, true]],
  [hex([24, 211, 116, 40, 105, 3, 153, 56]), [true, false]],
  [hex([149, 39, 222, 155, 211, 124, 152, 26]), [false, true]],
  [hex([95, 200, 71, 34, 8, 9, 11, 166]), [false, false]],
]);
const PUMP = new Map<string, [boolean, boolean]>([
 [hex([184,23,238,97,103,197,211,61]),[true,false]],
 [hex([194,171,28,70,104,77,91,47]),[true,true]],
 [hex([93,246,130,60,231,233,64,178]),[false,true]],
  [hex([198, 46, 21, 82, 180, 217, 232, 112]), [true, true]],
  [hex([102, 6, 61, 18, 1, 218, 235, 234]), [true, false]],
  [hex([51, 230, 133, 164, 1, 127, 131, 173]), [false, true]],
]);
const CURVE_V3=new Map<string,[boolean,boolean]>([[hex([7,5,29,196,245,23,101,80]),[true,false]],[hex([225,247,80,30,213,179,132,136]),[true,true]],[hex([28,146,222,119,38,196,105,213]),[false,true]]]);
const CURVE_V2=new Map<string,[boolean,boolean]>([
 [hex([194,171,28,70,104,77,91,47]),[true,true]],
 [hex([184,23,238,97,103,197,211,61]),[true,false]],
 [hex([93,246,130,60,231,233,64,178]),[false,true]],
]);
const CURVE_LEGACY=new Map<string,[boolean,boolean]>([
 [hex([56,252,116,8,158,223,205,95]),[true,true]],
 [hex([102,6,61,18,1,218,235,234]),[true,false]],
 [hex([51,230,133,164,1,127,131,173]),[false,true]],
]);
const account = (ix: Invocation, i: number) => ix.accounts[i] ?? ZERO;
function swap(
  ix: Invocation,
  mints: Map<string, string>,
  graduated: Set<string>,
): RouteSwapLeg | null {
  const d = ix.data,
    n = ix.accounts.length,
    disc = d.subarray(0, 8).toString("hex"),
    a = (i: number) => account(ix, i);
  const protocol = (Object.keys(ROUTE_PROGRAMS) as SwapProtocol[]).find(
    (p) => ROUTE_PROGRAMS[p] === ix.program,
  );
  let pool: string,
    user: string,
    source: string,
    dest: string,
    pair: [string, string] | null = null,
    mode: StonkFunMode | null = null,
    exact = true,
    offset = 8,
    invert = false;
  if (
    protocol === "RaydiumClmm" &&
    (disc === SWAP || disc === V2) &&
    n >= 10 &&
    d.length >= 41
  ) {
    pool = a(2);
    user = a(0);
    source = a(3);
    dest = a(4);
    exact = d[40] !== 0;
    if (disc === V2 && n >= 13) pair = [a(11), a(12)];
  } else if (
    protocol === "OrcaWhirlpool" &&
    (disc === SWAP || disc === V2) &&
    d.length >= 42
  ) {
    const v2 = disc === V2,
      dir = d[41] !== 0;
    if (n < (v2 ? 15 : 11)) return null;
    pool = a(v2 ? 4 : 2);
    user = a(v2 ? 3 : 1);
    const x = v2 ? 7 : 3,
      y = v2 ? 9 : 5;
    source = a(dir ? x : y);
    dest = a(dir ? y : x);
    exact = d[40] !== 0;
    if (v2) pair = dir ? [a(5), a(6)] : [a(6), a(5)];
  } else if (
    protocol === "RaydiumCpmm" &&
    (disc === CPI || disc === CPO) &&
    n >= 13
  ) {
    pool = a(3);
    user = a(0);
    source = a(4);
    dest = a(5);
    pair = [a(10), a(11)];
    exact = disc === CPI;
    invert = !exact;
  } else if (
    protocol === "MeteoraDammV2" && (disc === SWAP || disc === "414b3f4ceb5b5b88") && n >= 11
  ) {
    if (d.length < 24) return null;
    if (disc !== SWAP) {
      if (d.length < 25 || d[24]! > 2) return null;
      exact = d[24] !== 2;
    }
    pool = a(1); user = a(8); source = a(2); dest = a(3);
    // Resolve direction using user-account evidence.
  } else if (
    protocol === "MeteoraDlmm" &&
    (DLI.has(disc) || DLO.has(disc)) &&
    n >= 11
  ) {
    pool = a(0);
    user = a(10);
    source = a(4);
    dest = a(5);
    exact = DLI.has(disc);
    invert = !exact;
  } else if (
    (protocol === "LaunchLab" || protocol === "PumpSwap") &&
    (protocol === "LaunchLab" ? LAB : PUMP).has(disc)
  ) {
    const [buy, input] = (protocol === "LaunchLab" ? LAB : PUMP).get(disc)!;
    exact = input;
    if (n < (protocol === "LaunchLab" ? 18 : (["b817ee6167c5d33d","c2ab1c46684d5b2f","5df6823ce7e940b2"].includes(disc)?17:21))) return null;
    source = a(buy ? 6 : 5);
    dest = a(buy ? 5 : 6);
    if (protocol === "LaunchLab") {
      pool = a(4);
      user = a(0);
      pair = buy ? [a(10), a(9)] : [a(9), a(10)];
      mode = stonkfunModeFromPlatformConfig(a(3));
    } else {
      pool = a(0);
      user = a(1);
      pair = buy ? [a(4), a(3)] : [a(3), a(4)];
    }
  } else if(protocol==='PumpFun'&&CURVE_V3.has(disc)&&n===17&&d.length>=24) {
    const [buy,input]=CURVE_V3.get(disc)!;exact=input;pool=a(5);user=a(8);source=a(buy?10:9);dest=a(buy?9:10);pair=buy?[a(2),a(1)]:[a(1),a(2)];if(a(2)===WSOL){if(buy)source=user;else dest=user;}
  } else if (protocol==='PumpFun'&&CURVE_V2.has(disc)&&n>=16) {
    const [buy,input]=CURVE_V2.get(disc)!;exact=input;
    pool=a(10);user=a(13);source=a(buy?15:14);dest=a(buy?14:15);
    pair=buy?[a(2),a(1)]:[a(1),a(2)];
    if(a(2)===WSOL){if(buy)source=user;else dest=user;}
  } else if(protocol==='PumpFun'&&CURVE_LEGACY.has(disc)&&n>=12) {
    const [buy,input]=CURVE_LEGACY.get(disc)!;exact=input;
    pool=a(3);user=a(6);source=a(buy?6:5);dest=a(buy?5:6);pair=buy?[WSOL,a(2)]:[a(2),WSOL];
  } else if (
    protocol === "RaydiumAmmV4" &&
    d.length >= 17 &&
    [9, 11, 16, 17].includes(d[0]!)
  ) {
    const modern = d[0] === 16 || d[0] === 17;
    if (n < (modern ? 8 : 17)) return null;
    pool = a(1);
    user = a(modern ? 7 : n - 1);
    source = a(modern ? 5 : n - 3);
    dest = a(modern ? 6 : n - 2);
    offset = 1;
    exact = d[0] === 9 || d[0] === 16;
    invert = !exact;
  } else return null;
  if (d.length < offset + 16) return null;
  const first = d.readBigUInt64LE(offset),
    second = d.readBigUInt64LE(offset + 8);
  return {
    position: ix.position,
    program: ix.program,
    protocol: protocol!,
    pool,
    trader: user,
    input_account: source,
    output_account: dest,
    input_mint:
      mints.get(source) ?? (pair && pair[0] !== ZERO ? pair[0] : null),
    output_mint: mints.get(dest) ?? (pair && pair[1] !== ZERO ? pair[1] : null),
    amount_specified_is_input: exact,
    specified_amount: invert ? second : first,
    other_amount_threshold: invert ? first : second,
    actual_input_amount: null,
    actual_output_amount: null,
    stonkfun_mode: mode,
    stonkfun_graduated: protocol === "RaydiumCpmm" && graduated.has(pool),
  };
}
const token = (ix: Invocation) =>
  ix.program === TOKEN || ix.program === TOKEN_2022;
const checked = (ix: Invocation) =>
  token(ix) &&
  ix.data.length >= 10 &&
  ix.data[0] === 12 &&
  ix.accounts.length >= 4;
const withFee = (ix: Invocation) =>
  ix.program === TOKEN_2022 &&
  ix.data.length >= 19 &&
  ix.data[0] === 26 &&
  ix.data[1] === 1 &&
  ix.accounts.length >= 4;
function transfer(
  ix: Invocation,
  mints: Map<string, string>,
): RouteTokenTransfer | null {
  if (!token(ix) || !ix.data.length) return null;
  let dest: number, offset: number, fee: bigint | null;
  if (checked(ix)) {
    dest = 2;
    offset = 1;
    fee = ix.program === TOKEN ? 0n : null;
  } else if (withFee(ix)) {
    dest = 2;
    offset = 2;
    fee = ix.data.readBigUInt64LE(11);
  } else if (
    ix.data[0] === 3 &&
    ix.data.length >= 9 &&
    ix.accounts.length >= 3
  ) {
    dest = 1;
    offset = 1;
    fee = 0n;
  } else return null;
  return {
    position: ix.position,
    program: ix.program,
    source: account(ix, 0),
    destination: account(ix, dest),
    mint: mints.get(account(ix, 0)) ?? null,
    amount: ix.data.readBigUInt64LE(offset),
    withheld_fee: fee,
  };
}
function descendant(
  parent: InstructionPosition,
  child: InstructionPosition,
): boolean {
  return (
    parent.outer_index === child.outer_index &&
    (parent.inner_index === null
      ? child.inner_index !== null
      : child.inner_index !== null &&
        child.inner_index > parent.inner_index &&
        parent.stack_height !== null &&
        child.stack_height !== null &&
        child.stack_height > parent.stack_height)
  );
}
const U64_MAX = (1n << 64n) - 1n;
function pumpfunNativeDebit(ix:Invocation,children:Invocation[],leg:RouteSwapLeg):bigint|null {
 if(leg.protocol!=='PumpFun'||ix.accounts.length<17||account(ix,2)!==WSOL||leg.input_account!==leg.trader||ix.position.stack_height===null)return null;
 const recipients=new Set([6,8,10,16].map(i=>account(ix,i)));let total=0n,paidPool=false;
 for(const child of children){
  if(child.program!==ZERO||child.data.length!==12||child.data.readUInt32LE(0)!==2||child.accounts.length<2||account(child,0)!==leg.trader)continue;
  if(child.position.stack_height!==ix.position.stack_height+1)return null;
  if(!recipients.has(account(child,1)))return null;
  paidPool ||= account(child,1)===leg.pool;total+=child.data.readBigUInt64LE(4);if(total>U64_MAX)return null;
 }
 return paidPool?total:null;
}
function sum(values: (bigint | null)[]): bigint | null {
  if (!values.length || values.some((v) => v === null)) return null;
  const value = values.reduce<bigint>((n, v) => n + v!, 0n);
  return value <= U64_MAX ? value : null;
}
/** JSON-encoded or base64-encoded RPC response; amounts are exact bigint. */
export function analyzeRpcTransactionRoutes(
  transaction: unknown,
  graduatedStonkfunPools: Iterable<string> = [],
): TransactionRoute {
  const root = transaction as Record<string, any>,
    tx = root.result ?? root;
  if (!tx || !tx.meta || typeof tx.meta !== "object")
    throw new Error("Transaction metadata missing");
  if (!("err" in tx.meta)) throw new Error("Transaction execution status missing");
  let body = tx.transaction;
  if (Array.isArray(body)) {
    if (body.length !== 2 || body[1] !== "base64")
      throw new Error("Expected base64 wire encoding");
    body = decodeWireTransaction(Buffer.from(body[0], "base64")).transaction;
  }
  const message = body.message,
    meta = tx.meta;
  if (!message || typeof message !== "object")
    throw new Error("Expected compiled transaction");
  const loaded = meta.loadedAddresses ?? {},
    keys: string[] = message.accountKeys.map((k: any) =>
      typeof k === "string" ? k : (k.pubkey ?? k.toBase58()),
    );
  keys.push(...(loaded.writable ?? []), ...(loaded.readonly ?? []));
  const key = (i: number): string => {
    if (!Number.isInteger(i) || i < 0 || i >= keys.length)
      throw Error("Invalid compiled account index");
    return keys[i]!;
  };
  const groups = meta.innerInstructions ?? [], seen = new Set<number>();
  if (!Array.isArray(groups)) throw Error("Invalid compiled instruction groups");
  for (const group of groups) {
    if (!group || !Number.isInteger(group.index) || group.index < 0 ||
        group.index >= message.instructions.length || seen.has(group.index) ||
        !Array.isArray(group.instructions)) throw Error("Invalid compiled instruction group");
    seen.add(group.index);
    for (const ix of group.instructions)
      if (!ix || (ix.stackHeight != null && (!Number.isInteger(ix.stackHeight) || ix.stackHeight < 2)))
        throw Error("Invalid compiled stack height");
  }
  const invocations: Invocation[] = [];
  message.instructions.forEach((outer: any, i: number) => {
    const batch: [any, InstructionPosition][] = [
      [outer, { outer_index: i, inner_index: null, stack_height: 1 }],
    ];
    for (const group of groups)
      if (group.index === i)
        group.instructions.forEach((ix: any, j: number) =>
          batch.push([
            ix,
            {
              outer_index: i,
              inner_index: j,
              stack_height: ix.stackHeight ?? null,
            },
          ]),
        );
    for (const [ix, position] of batch) {
      if (ix.programIdIndex === undefined)
        throw new Error("Expected compiled instructions, not jsonParsed");
      const data = typeof ix.data === "string" ? bs58.decode(ix.data) : ix.data;
      invocations.push({
        position,
        program: key(ix.programIdIndex),
        accounts: Array.from(ix.accounts as number[], (k) => key(k)),
        data: Buffer.from(data),
      });
    }
  });
  const mints = new Map<string, string>();
  for (const balance of [
    ...(meta.preTokenBalances ?? []),
    ...(meta.postTokenBalances ?? []),
  ]) {
    if (bs58.decode(balance.mint).length === 32)
      mints.set(key(balance.accountIndex), balance.mint);
  }
  for (const ix of invocations) {
    if (checked(ix) || withFee(ix)) {
      mints.set(account(ix, 0), account(ix, 1));
      mints.set(account(ix, 2), account(ix, 1));
    }
    if (
      token(ix) &&
      ix.accounts.length >= 2 &&
      ((ix.data.length === 1 && ix.data[0] === 1) ||
        (ix.data.length === 33 && [16, 18].includes(ix.data[0]!)))
    )
      mints.set(account(ix, 0), account(ix, 1));
  }
  for (;;) {
    const before = mints.size;
    for (const ix of invocations)
      if (
        token(ix) &&
        ix.data.length >= 9 &&
        ix.data[0] === 3 &&
        ix.accounts.length >= 3
      ) {
        const mint = mints.get(account(ix, 0)) ?? mints.get(account(ix, 1));
        if (mint) {
          if (!mints.has(account(ix, 0))) mints.set(account(ix, 0), mint);
          if (!mints.has(account(ix, 1))) mints.set(account(ix, 1), mint);
        }
      }
    if (mints.size === before) break;
  }
  mints.delete(ZERO);
  const route: TransactionRoute = {
    signature: body.signatures?.[0] ?? bs58.encode(new Uint8Array(64)),
    succeeded: meta.err == null,
    legs: [],
    transfers: [],
    native_token_actions: [],
    unknown_invocations: [],
  };
  const graduated = new Set(graduatedStonkfunPools);
  const known = new Set([
    TOKEN,
    TOKEN_2022,
    ZERO,
    "ComputeBudget111111111111111111111111111111",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  ]);
  invocations.forEach((ix, i) => {
    const own = transfer(ix, mints);
    if (own) route.transfers.push(own);
    const children: Invocation[] = [];
    for (const child of invocations.slice(i + 1)) {
      if (!descendant(ix.position, child.position)) break;
      children.push(child);
    }
    const nested = children
        .map((c) => transfer(c, mints))
        .filter((x): x is RouteTokenTransfer => x !== null),
      leg = swap(ix, mints, graduated);
    if (leg) {
      if (route.succeeded) {
        leg.actual_input_amount = sum(
          nested
            .filter((t) => t.source === leg.input_account)
            .map((t) => t.amount),
        );
        leg.actual_output_amount = sum(
          nested
            .filter((t) => t.destination === leg.output_account)
            .map((t) =>
              t.withheld_fee === null || t.withheld_fee > t.amount
                ? null
                : t.amount - t.withheld_fee,
            ),
        );
      }
      route.legs.push(leg);
      if(route.succeeded&&leg.protocol==='PumpFun'&&leg.input_mint===WSOL&&leg.input_account===leg.trader)leg.actual_input_amount=pumpfunNativeDebit(ix,children,leg);
    } else if (!known.has(ix.program))
      route.unknown_invocations.push({
        position: ix.position,
        program: ix.program,
        has_token_transfers: nested.length > 0,
        has_known_swap_descendants: children.some(
          (c) => swap(c, mints, graduated) !== null,
        ),
      });
    let target: string | null = null,
      action: NativeTokenAction | null = null;
    if (
      ix.program === ZERO &&
      ix.data.length === 12 &&
      ix.data.readUInt32LE(0) === 2 &&
      ix.accounts.length >= 2
    ) {
      target = account(ix, 1);
      action = {
        Fund: { source: account(ix, 0), lamports: ix.data.readBigUInt64LE(4) },
      };
    } else if (token(ix)) {
      if (ix.data.length === 1 && ix.data[0] === 17 && ix.accounts.length) {
        target = account(ix, 0);
        action = "SyncNative";
      } else if (
        ix.data.length === 1 &&
        ix.data[0] === 9 &&
        ix.accounts.length >= 3
      ) {
        target = account(ix, 0);
        action = {
          Close: { destination: account(ix, 1), authority: account(ix, 2) },
        };
      }
    }
    if (target && action && mints.get(target) === WSOL)
      route.native_token_actions.push({
        position: ix.position,
        account: target,
        action,
      });
  });
  return route;
}
