/** Opt-in Shred rules. Pure input transformation: no RPC or account fetches. */
import bs58 from "bs58";
import type {DexEvent, PumpFunTradeEvent} from "./core/dex_event.js";
import type {RawInstructionEvent} from "./core/raw_instruction.js";
import {rawInstructionPayload, TradeParseStatus} from "./core/raw_instruction.js";
import {parsePumpfunInstruction} from "./instr/pumpfun_ix.js";
import {eventTypeFilterShouldIncludeDexEvent, type EventTypeFilter} from "./grpc/types.js";
export interface WrappedPumpfunRule {
  rule_id: string;
  program_id: string | number[];
  outer_account_count: number;
  data_pattern: (number | null)[];
  pump_discriminator: number[];
  argument_offsets: [number, number];
  account_map: number[];
  fixed_accounts: [number, string | number[]][];
  equal_accounts: [number, number][];
}
const key = (value: string | number[]) => typeof value === "string" ? value : bs58.encode(Uint8Array.from(value));
const discs = new Set(["184,23,238,97,103,197,211,61", "194,171,28,70,104,77,91,47", "93,246,130,60,231,233,64,178"]);
export function parseWrappedPumpfunInstruction(raw: RawInstructionEvent, rule: WrappedPumpfunRule, filter?: EventTypeFilter): DexEvent | null {
  if (raw.program_id !== key(rule.program_id) || raw.accounts.length !== rule.outer_account_count || raw.accounts.some(k => k == null)
    || raw.instruction_data.length !== rule.data_pattern.length || !rule.data_pattern.some(v => v != null)
    || !discs.has(rule.pump_discriminator.join(","))
    || rule.data_pattern.some((v, i) => v != null && v !== raw.instruction_data[i])) return null;
  const valid = (i: number) => Number.isSafeInteger(i) && i >= 0 && i < raw.accounts.length;
  if (rule.fixed_accounts.some(([i,k]) => !valid(i) || raw.accounts[i] !== key(k))
    || rule.equal_accounts.some(([a,b]) => !valid(a) || !valid(b) || raw.accounts[a] !== raw.accounts[b])
    || rule.account_map.some(i => !valid(i))
    || rule.argument_offsets.length !== 2
    || rule.argument_offsets.some(i => !Number.isSafeInteger(i) || i < 0 || i + 8 > raw.instruction_data.length)) return null;
  const data = Uint8Array.from([...rule.pump_discriminator, ...rule.argument_offsets.flatMap(i => raw.instruction_data.slice(i, i + 8))]);
  const m = raw.metadata;
  const parsed = parsePumpfunInstruction(data, rule.account_map.map(i => raw.accounts[i]!), m.signature, m.slot, m.tx_index, m.block_time_us, m.grpc_recv_us);
  if (!parsed) return null;
  const trade = Object.values(parsed)[0] as PumpFunTradeEvent;
  trade.metadata = {...m};
  trade.sol_amount = trade.quote_amount = trade.token_amount = 0n;
  trade.third_program = {...rawInstructionPayload(raw), rule_id: rule.rule_id};
  trade.parse_status = TradeParseStatus.InstructionDecoded;
  const event: DexEvent = {PumpFunTrade: trade};
  return !filter || eventTypeFilterShouldIncludeDexEvent(filter, event) ? event : null;
}
