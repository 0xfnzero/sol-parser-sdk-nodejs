export enum TradeParseStatus {
  Unresolved = "Unresolved",
  InstructionDecoded = "InstructionDecoded",
  ExecutionConfirmed = "ExecutionConfirmed",
}
export interface RawInstructionPayload {
  program_id: string;
  instruction_index: number;
  accounts: (string | null)[];
  account_indices: number[];
  instruction_data: number[];
}
export const INFRASTRUCTURE_PROGRAMS: ReadonlySet<string> = new Set(["11111111111111111111111111111111","TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb","ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL","ComputeBudget111111111111111111111111111111","MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr","Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo","AddressLookupTab1e1111111111111111111111111","Vote111111111111111111111111111111111111111","Ed25519SigVerify111111111111111111111111111","KeccakSecp256k11111111111111111111111111111","Secp256r1SigVerify1111111111111111111111111"]);

/** Stable DEX identifiers; JSON values match the Rust/Python/Go enums. */
export enum RawInstructionDexType {
  PumpFun = "pumpfun",
  PumpSwap = "pumpswap",
  RaydiumLaunchlab = "raydium_launchlab",
  RaydiumCpmm = "raydium_cpmm",
  RaydiumClmm = "raydium_clmm",
  RaydiumAmmV4 = "raydium_amm_v4",
  OrcaWhirlpool = "orca_whirlpool",
  MeteoraPools = "meteora_pools",
  MeteoraDammV2 = "meteora_damm_v2",
  MeteoraDlmm = "meteora_dlmm",
  MeteoraDbc = "meteora_dbc",
}
