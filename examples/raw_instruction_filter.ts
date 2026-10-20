/** npx tsx examples/raw_instruction_filter.ts — offline signed transaction replay. */
import {readFileSync} from "node:fs";
import {wireBytesToShredWasmTx} from "../src/shredstream/wire_to_shred_tx.js";
import {dexEventsFromShredWasmTxWithLoadedAddresses} from "../src/shredstream/instruction_parse.js";
import {eventTypeFilterIncludeOnly} from "../src/grpc/types.js";
const cases = JSON.parse(readFileSync(new URL("./fixtures/raw_instructions.json", import.meta.url), "utf8"));
for (const c of cases) {
 const tx = wireBytesToShredWasmTx(Buffer.from(c.wire, "base64"))!;
 for (const type of ["PumpFunTrade", "RaydiumCpmmSwap", "RawInstruction"] as const) {
  const events = dexEventsFromShredWasmTxWithLoadedAddresses(tx, c.loaded_writable, c.loaded_readonly, c.slot, 0, 0, eventTypeFilterIncludeOnly([type]));
  console.log(JSON.stringify({signature:c.signature,filter:type,events}, (_,v)=>typeof v==="bigint"?v.toString():v));
 }
}
