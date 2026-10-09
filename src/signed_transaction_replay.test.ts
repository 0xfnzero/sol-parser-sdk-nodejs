import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createPublicKey, verify } from "node:crypto";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { decodeWireTransaction } from "./wire_transaction.js";
import { parseRpcTransaction } from "./rpc_transaction.js";
import { analyzeSimulationRoutes } from "./simulation_route.js";
const corpus = JSON.parse(readFileSync(new URL("./fixtures/signed_replay_20261009.json", import.meta.url), "utf8"));
for (const c of corpus.cases) {
  it(`signed historical wire and metadata replay: ${c.name}`, () => {
    const wire = Buffer.from(c.wire, "base64");
    const reference = VersionedTransaction.deserialize(wire);
    const decoded = decodeWireTransaction(wire).transaction;
    expect(decoded.signatures).toEqual(reference.signatures.map(s => bs58.encode(s)));
    expect(decoded.message.accountKeys).toEqual(reference.message.staticAccountKeys.map(k => k.toBase58()));
    expect(decoded.message.instructions.length).toBe(c.expected.instruction_count);
    expect(decoded.version).toBe(reference.version);
    expect(reference.signatures.length).toBe(c.expected.signature_count);
    const message = reference.message.serialize();
    for (let i = 0; i < reference.signatures.length; i++) {
      const key = createPublicKey({key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), reference.message.staticAccountKeys[i]!.toBuffer()]), format: "der", type: "spki"});
      expect(verify(null, message, key, reference.signatures[i]!)).toBe(true);
      const badSignature = Buffer.from(reference.signatures[i]!); badSignature[0] ^= 1;
      expect(verify(null, message, key, badSignature)).toBe(false);
      const badMessage = Buffer.from(message); badMessage[badMessage.length - 1] ^= 1;
      expect(verify(null, badMessage, key, reference.signatures[i]!)).toBe(false);
    }
    expect(() => decodeWireTransaction(wire.subarray(0, -1))).toThrow();
    expect(() => decodeWireTransaction(Buffer.concat([wire, Buffer.from([0])]))).toThrow();
    // Historical execution metadata is replayed; this does not invoke a bank or RPC.
    const route = analyzeSimulationRoutes(wire, {result: {value: c.rpc.meta}});
    expect(route.signature).toBe(c.expected.signature);
    expect(route.succeeded).toBe(true);
    expect(route.legs).toHaveLength(c.name === "generated_legacy_two_signers" ? 0 : 1);
    if (route.legs.length) {
      expect(route.legs[0]!.protocol).toBe(c.name === "pumpfun" ? "PumpFun" : "PumpSwap");
      expect(route.legs[0]!.specified_amount).toBe(c.name === "pumpfun" ? 30765521374696n : 10000000n);
      expect(route.legs[0]!.actual_input_amount).toBe(c.name === "pumpfun" ? null : 10000000n);
      expect(route.legs[0]!.actual_output_amount).toBeNull();
      const failedMeta = structuredClone(c.rpc.meta); failedMeta.err = {InstructionError: [0, "Custom"]};
      const failed = analyzeSimulationRoutes(wire, {result: {value: failedMeta}});
      expect(failed.succeeded).toBe(false);
      expect(failed.legs.every(l => l.actual_input_amount === null && l.actual_output_amount === null)).toBe(true);
    }
  });
}

const dexCorpus = JSON.parse(readFileSync(new URL("./fixtures/signed_dex_replay_20261009.json", import.meta.url), "utf8"));
for (const c of dexCorpus.cases) it(`signed multi-ALT CPI or failed metadata replay: ${c.name}`, () => {
  const wire = Buffer.from(c.wire, "base64");
  const reference = VersionedTransaction.deserialize(wire);
  const decoded = decodeWireTransaction(wire).transaction;
  expect(decoded.message.addressTableLookups).toEqual(reference.message.addressTableLookups.map(l => ({accountKey: l.accountKey.toBase58(), writableIndexes: [...l.writableIndexes], readonlyIndexes: [...l.readonlyIndexes]})));
  expect(reference.message.addressTableLookups).toHaveLength(c.expected.lookup_count);
  for (let i = 0; i < reference.signatures.length; i++) {
    const key = createPublicKey({key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), reference.message.staticAccountKeys[i]!.toBuffer()]), format: "der", type: "spki"});
    expect(verify(null, reference.message.serialize(), key, reference.signatures[i]!)).toBe(true);
  }
  // Check fixed expected amounts against raw SPL transfer bytes, independently of route parsing.
  const keys = [...reference.message.staticAccountKeys.map(k => k.toBase58()), ...c.rpc.meta.loadedAddresses.writable, ...c.rpc.meta.loadedAddresses.readonly];
  const transferAmounts: bigint[] = [];
  for (const group of c.rpc.meta.innerInstructions) for (const ix of group.instructions) {
    if (!["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"].includes(keys[ix.programIdIndex]!)) continue;
    const data = Buffer.from(bs58.decode(ix.data));
    if ((data[0] === 3 && data.length === 9) || (data[0] === 12 && data.length === 10)) transferAmounts.push(data.readBigUInt64LE(1));
  }
  for (const expected of c.expected.legs) {
    expect(keys).toContain(expected.pool);
    for (const mint of [expected.input_mint, expected.output_mint]) expect([...c.rpc.meta.preTokenBalances, ...c.rpc.meta.postTokenBalances].map(b => b.mint)).toContain(mint);
    if (c.expected.succeeded) {
      expect(transferAmounts).toContain(BigInt(expected.specified_amount));
      expect(transferAmounts).toContain(BigInt(expected.actual_output_amount));
    }
  }
  const route = analyzeSimulationRoutes(wire, {result: {value: c.rpc.meta}});
  expect(route.signature).toBe(bs58.encode(reference.signatures[0]!));
  expect(route.succeeded).toBe(c.expected.succeeded);
  expect(route.legs).toHaveLength(c.expected.legs.length);
  for (const [i, expected] of c.expected.legs.entries()) {
    const leg = route.legs[i]!;
    expect([leg.protocol, leg.pool, leg.input_mint, leg.output_mint]).toEqual([expected.protocol, expected.pool, expected.input_mint, expected.output_mint]);
    expect(leg.specified_amount).toBe(BigInt(expected.specified_amount));
    expect(leg.actual_input_amount).toBe(route.succeeded ? BigInt(expected.specified_amount) : null);
    expect(leg.actual_output_amount).toBe(expected.actual_output_amount === null ? null : BigInt(expected.actual_output_amount));
    if (route.succeeded) expect(leg.position.stack_height).toBe(2);
  }
  const parsed = parseRpcTransaction({...c.rpc, transaction: {message: reference.message, signatures: decoded.signatures}}, route.signature);
  expect(parsed.ok).toBe(true);
  if (parsed.ok) {
    expect(parsed.events).toHaveLength(route.succeeded ? 3 : 0);
    for (const [i, event] of parsed.events.entries()) {
      const body = Object.values(event)[0] as Record<string, unknown> & {metadata: {signature: string}};
      const expected = c.expected.legs[i];
      expect(Object.keys(event)[0]).toBe(`${expected.protocol}Swap`);
      expect(body.metadata.signature).toBe(route.signature);
      expect(body.pool_id ?? body.pool_state ?? body.whirlpool ?? body.pool).toBe(expected.pool);
      const input = body.input_amount ?? body.amount_in ?? (body.zero_for_one ? body.amount_0 : body.amount_1);
      const output = body.output_amount ?? body.amount_out ?? (body.zero_for_one ? body.amount_1 : body.amount_0);
      expect(String(input)).toBe(expected.specified_amount);
      expect(String(output)).toBe(expected.actual_output_amount);
    }
  }
  if (!route.succeeded) {
    expect(route.transfers).toHaveLength(0);
    expect(route.native_token_actions).toHaveLength(0);
  }
});

const boundaries = JSON.parse(readFileSync(new URL("./fixtures/signed_wire_boundaries_20261009.json", import.meta.url), "utf8"));
const altRejections = JSON.parse(readFileSync(new URL('./fixtures/signed_alt_load_rejections_20261009.json', import.meta.url), 'utf8'));
for (const c of [...boundaries.cases, ...altRejections.cases]) it(`official sanitizer boundary: ${c.name}`, () => {
  const wire = Buffer.from(c.wire, "base64");
  if (!c.valid_structure) expect(() => decodeWireTransaction(wire)).toThrow();
  else {
    expect(decodeWireTransaction(wire).length).toBe(wire.length);
    const tx = VersionedTransaction.deserialize(wire);
    const valid = tx.signatures.every((sig, i) => verify(null, tx.message.serialize(), createPublicKey({key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), tx.message.staticAccountKeys[i]!.toBuffer()]), format: "der", type: "spki"}), sig));
    expect(valid).toBe(c.valid_signature);
    // Entry stream decoding consumes one valid wire, leaving the following bytes untouched.
    expect(decodeWireTransaction(Buffer.concat([Buffer.from([9]), wire, Buffer.from([10])]), 1, false).length).toBe(wire.length);
  }
});

it("signed customizable pool public parse boundaries valid-bad-valid", () => {
  const corpus = JSON.parse(readFileSync(new URL("./fixtures/signed_clmm_boundaries_20261009.json", import.meta.url), "utf8"));
  for (const c of corpus.cases) {
    const wire = Buffer.from(c.wire, "base64");
    const decoded = decodeWireTransaction(wire).transaction;
    const reference = VersionedTransaction.deserialize(wire);
    const key = createPublicKey({key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), reference.message.staticAccountKeys[0]!.toBuffer()]), format: "der", type: "spki"});
    expect(verify(null, reference.message.serialize(), key, reference.signatures[0]!)).toBe(true);
    const result = parseRpcTransaction({...c.rpc, transaction: {message: reference.message, signatures: decoded.signatures}}, decoded.signatures[0]!);
    expect(result.events.length, c.name).toBe(Number(c.valid_instruction));
  }
});

const bankCorpus = JSON.parse(readFileSync(new URL('./fixtures/signed_cpmm_bank_20261009.json', import.meta.url), 'utf8'));
for (const c of bankCorpus.cases) it(`captured CPMM signed bank fee/failure replay: ${c.name}`, () => {
  const wire = Buffer.from(c.wire, 'base64');
  const tx = VersionedTransaction.deserialize(wire);
  const decoded = decodeWireTransaction(wire).transaction;
  const key = createPublicKey({key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), tx.message.staticAccountKeys[0]!.toBuffer()]), format: 'der', type: 'spki'});
  expect(verify(null, tx.message.serialize(), key, tx.signatures[0]!)).toBe(true);
  const denyNetwork = () => { throw new Error('Parser hot path attempted RPC'); };
  const originalFetch = globalThis.fetch;
  const originalRpc = Connection.prototype.getMultipleAccountsInfo;
  globalThis.fetch = denyNetwork;
  Connection.prototype.getMultipleAccountsInfo = denyNetwork;
  try {
    const parsed = parseRpcTransaction({...c.rpc, transaction: {message: tx.message, signatures: decoded.signatures}}, decoded.signatures[0]!);
    expect(parsed.ok).toBe(true);
    expect(parsed.events).toHaveLength(Number(c.succeeded));
    const route = analyzeSimulationRoutes(wire, {result: {value: c.rpc.meta}});
    expect(route.succeeded).toBe(c.succeeded);
    expect(route.legs).toHaveLength(1);
    expect(route.legs[0]!.protocol).toBe('RaydiumCpmm');
    if (c.succeeded) {
      const event = parsed.events[0]!;
      expect('RaydiumCpmmSwap' in event).toBe(true);
      if ('RaydiumCpmmSwap' in event) {
        expect(event.RaydiumCpmmSwap.input_amount).toBe(BigInt(c.vault_credit));
        expect(event.RaydiumCpmmSwap.output_amount).toBe(BigInt(c.vault_debit));
      }
      expect(route.legs[0]!.actual_input_amount).toBe(BigInt(c.gross_input));
      expect(route.legs[0]!.actual_output_amount).toBe(c.name === 'fee-output' ? null : BigInt(c.net_output));
    } else {
      expect(route.legs[0]!.actual_input_amount).toBeNull();
      expect(route.legs[0]!.actual_output_amount).toBeNull();
      expect(route.transfers).toHaveLength(0);
      expect(route.native_token_actions).toHaveLength(0);
    }
  } finally {
    globalThis.fetch = originalFetch;
    Connection.prototype.getMultipleAccountsInfo = originalRpc;
  }
});

const multiBank = JSON.parse(readFileSync(new URL('./fixtures/signed_multileg_bank_20261009.json', import.meta.url), 'utf8'));
const identicalBank = JSON.parse(readFileSync(new URL('./fixtures/signed_identical_alt_bank_20261009.json', import.meta.url), 'utf8'));
for (const c of [...multiBank.cases, ...identicalBank.cases]) it(`same pool multileg bank invocation settlement: ${c.name}`, () => {
  const wire = Buffer.from(c.wire, 'base64');
  const tx = VersionedTransaction.deserialize(wire);
  const decoded = decodeWireTransaction(wire).transaction;
  for (let i = 0; i < tx.signatures.length; i++) {
    const key = createPublicKey({key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), tx.message.staticAccountKeys[i]!.toBuffer()]), format: 'der', type: 'spki'});
    expect(verify(null, tx.message.serialize(), key, tx.signatures[i]!)).toBe(true);
  }

  if (c.lookup_tables) {
    const tables = new Map<string, string[]>(c.lookup_tables.map((t: any) => [t.key, t.addresses]));
    for (const side of ['writable', 'readonly'] as const) {
      const expected = decoded.message.addressTableLookups.flatMap(t => t[`${side}Indexes`].map(i => tables.get(t.accountKey)![i]!));
      expect(c.rpc.meta.loadedAddresses[side]).toEqual(expected);
    }
  }

  // Metadata fault injection keeps the original authenticated wire unchanged.
  if (c.lookup_tables?.length) for (const side of ['writable', 'readonly'] as const) {
    for (const action of ['short', 'extra']) {
      const bad = structuredClone(c.rpc.meta);
      if (action === 'short') bad.loadedAddresses[side].pop();
      else bad.loadedAddresses[side].push(bad.loadedAddresses[side][0]);
      expect(() => analyzeSimulationRoutes(wire, {result: {value: bad}})).toThrow();
    }
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('parser must not use RPC'); };
  try {
    const parsed = parseRpcTransaction({...c.rpc, transaction: {message: tx.message, signatures: decoded.signatures}}, decoded.signatures[0]!);
    expect(parsed.ok).toBe(true);
    expect(parsed.events).toHaveLength(c.succeeded ? 2 : 0);
    const route = analyzeSimulationRoutes(wire, {result: {value: c.rpc.meta}});
    expect(route.succeeded).toBe(c.succeeded);
    expect(route.legs).toHaveLength(2);
    expect(route.legs[0]!.pool).toBe(route.legs[1]!.pool);
    expect(route.legs[0]!.trader).toBe(route.legs[1]!.trader);
    if (c.identity) for (const leg of route.legs) {
      for (const [key, value] of Object.entries(c.identity)) expect((leg as any)[key]).toBe(value);
    }
    for (let i = 0; i < 2; i++) {
      const leg = route.legs[i]!;
      expect(leg.position.outer_index).toBe(i + 1);
      expect(leg.specified_amount).toBe(BigInt(c.requested_gross_inputs[i]));
      if (c.succeeded) {
        const expected = c.legs[i];
        expect(leg.actual_input_amount).toBe(BigInt(expected.gross_input));
        expect(leg.actual_output_amount).toBe(c.fee_output_legs[i] ? null : BigInt(expected.net_output));
        const event = parsed.events[i]!;
        expect('RaydiumCpmmSwap' in event).toBe(true);
        if ('RaydiumCpmmSwap' in event) {
          expect(event.RaydiumCpmmSwap.input_amount).toBe(BigInt(expected.vault_credit));
          expect(event.RaydiumCpmmSwap.output_amount).toBe(BigInt(expected.vault_debit));
        }
      } else {
        expect(leg.actual_input_amount).toBeNull();
        expect(leg.actual_output_amount).toBeNull();
      }
    }
  } finally { globalThis.fetch = originalFetch; }
});

const nestedBank = JSON.parse(readFileSync(new URL('./fixtures/signed_nested_cpi_bank_20261009.json', import.meta.url), 'utf8'));
for (const c of nestedBank.cases) it(`actual signed nested CPI bank failure cannot invent settlement: ${c.name}`, () => {
  const wire = Buffer.from(c.wire, 'base64');
  const tx = VersionedTransaction.deserialize(wire);
  const decoded = decodeWireTransaction(wire).transaction;
  for (let i = 0; i < tx.signatures.length; i++) {
    const key = createPublicKey({key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), tx.message.staticAccountKeys[i]!.toBuffer()]), format: 'der', type: 'spki'});
    expect(verify(null, tx.message.serialize(), key, tx.signatures[i]!)).toBe(true);
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('parser must not use RPC'); };
  try {
    const parsed = parseRpcTransaction({...c.rpc, transaction: {message: tx.message, signatures: decoded.signatures}}, decoded.signatures[0]!);
    expect(parsed.ok).toBe(true);
    expect(parsed.events).toHaveLength(Number(c.succeeded));
    const route = analyzeSimulationRoutes(wire, {result: {value: c.rpc.meta}});
    expect(route.succeeded).toBe(c.succeeded);
    expect(route.legs).toHaveLength(1);
    const leg = route.legs[0]!;
    expect(leg.position.stack_height).toBe(c.succeeded ? 2 : 3);
    expect(leg.specified_amount).toBe(10001n);
    if (c.succeeded) {
      expect(leg.actual_input_amount).toBe(10001n);
      expect(leg.actual_output_amount).toBe(468207n);
      expect(c.token_deltas[leg.input_account]).toBe(-10001);
      expect(c.token_deltas[leg.output_account]).toBe(468207);
      const event = parsed.events[0]!;
      expect('RaydiumCpmmSwap' in event).toBe(true);
      if ('RaydiumCpmmSwap' in event) {
        expect(event.RaydiumCpmmSwap.input_amount).toBe(9800n);
        expect(event.RaydiumCpmmSwap.output_amount).toBe(468207n);
      }
    } else {
      expect(leg.actual_input_amount).toBeNull();
      expect(leg.actual_output_amount).toBeNull();
      expect(Object.values(c.token_deltas).every(v => v === 0)).toBe(true);
    }
    expect(c.rpc.meta.logMessages.some((log: string) => log.includes('Tokenkeg') && log.endsWith(' success'))).toBe(true);
  } finally { globalThis.fetch = originalFetch; }
});

it("mixed signed Legacy-V0-Legacy framed stream isolates messages and truncated final frame", () => {
  const legacy = corpus.cases.find((c: any) => c.name === "generated_legacy_two_signers");
  const v0 = identicalBank.cases.find((c: any) => c.name === "identical-intents-two-alt");
  const cases = [legacy, v0, legacy];
  const wires = cases.map(c => Buffer.from(c.wire, "base64"));
  const stream = Buffer.concat(wires);
  expect(() => decodeWireTransaction(stream)).toThrow();
  let offset = 0;
  for (const [i, c] of cases.entries()) {
    const {transaction: decoded, length} = decodeWireTransaction(stream, offset, false);
    expect(length).toBe(wires[i]!.length);
    expect(decoded).toEqual(decodeWireTransaction(wires[i]!).transaction);
    expect(decoded.signatures).toHaveLength(2);
    expect(decoded.version).toBe(i === 1 ? 0 : "legacy");
    const reference = VersionedTransaction.deserialize(wires[i]!);
    for (let signer = 0; signer < 2; signer++) {
      const key = createPublicKey({key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), reference.message.staticAccountKeys[signer]!.toBuffer()]), format: "der", type: "spki"});
      expect(verify(null, reference.message.serialize(), key, reference.signatures[signer]!)).toBe(true);
    }
    const parsed = parseRpcTransaction({...c.rpc, transaction: {message: reference.message, signatures: decoded.signatures}}, decoded.signatures[0]!);
    expect(parsed.ok).toBe(true);
    expect(parsed.events).toHaveLength(i === 1 ? 2 : 0);
    offset += length;
  }
  expect(offset).toBe(stream.length);
  const damaged = stream.subarray(0, -1);
  expect(decodeWireTransaction(damaged, 0, false).length).toBe(wires[0]!.length);
  expect(decodeWireTransaction(damaged, wires[0]!.length, false).length).toBe(wires[1]!.length);
  expect(() => decodeWireTransaction(damaged, wires[0]!.length + wires[1]!.length, false)).toThrow();
});
