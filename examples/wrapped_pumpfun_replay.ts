// Captured real outer inputs; no network access. Load reviewed rules at startup.
import fixture from '../tests/fixtures/wrapped_pumpfun_inputs.json';
import {parseWrappedPumpfunInstruction, type WrappedPumpfunRule} from '../src/wrapped_pumpfun_parser.js';
import type {RawInstructionEvent} from '../src/core/raw_instruction.js';
import {dexEventToJsonString} from '../src/core/json_utils.js';
for(const input of fixture.inputs) {
  const raw=input.raw as unknown as RawInstructionEvent;
  const event=(fixture.rules as WrappedPumpfunRule[]).map(rule=>parseWrappedPumpfunInstruction(raw,rule)).find(Boolean);
  console.log(dexEventToJsonString(event ?? {RawInstruction:raw}));
}
