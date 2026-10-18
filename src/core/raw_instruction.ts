import type {EventMetadata} from "./metadata.js";

/** Outer instruction only; contains no inferred CPI, trade direction or amounts. */
export interface RawInstructionEvent {
  metadata: EventMetadata;
  program_id: string;
  instruction_index: number;
  /** Original order including duplicates; null denotes an unresolved ALT key. */
  accounts: (string | null)[];
  account_indices: number[];
  instruction_data: number[];
}

export const INFRASTRUCTURE_PROGRAMS: ReadonlySet<string> = new Set(["11111111111111111111111111111111","TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA","TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb","ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL","ComputeBudget111111111111111111111111111111","MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr","Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo","AddressLookupTab1e1111111111111111111111111","Vote111111111111111111111111111111111111111","Ed25519SigVerify111111111111111111111111111","KeccakSecp256k11111111111111111111111111111","Secp256r1SigVerify1111111111111111111111111"]);
