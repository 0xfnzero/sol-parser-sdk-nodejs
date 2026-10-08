import { it, expect, vi } from "vitest";
import fs from "node:fs";
import bs58 from "bs58";
import { analyzeSimulationRoutes } from "./simulation_route.js";
import {
  analyzeRpcTransactionRoutes,
  TOKEN_2022,
} from "./transaction_route.js";
import { decodeWireTransaction } from "./wire_transaction.js";
const corpus = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/cached_tip_routes_20261002.json", import.meta.url),
    "utf8",
  ),
);
const canonical = (v: unknown) =>
  JSON.parse(
    JSON.stringify(v, (_, x) => (typeof x === "bigint" ? String(x) : x)),
  );
const pumpfunCorpus=JSON.parse(fs.readFileSync(new URL('./fixtures/pumpfun_current_mainnet_simulations_20261004.json',import.meta.url),'utf8'));
const settledPumpfunCorpus=JSON.parse(fs.readFileSync(new URL('./fixtures/pumpfun_settlement_mainnet_simulations_20261004.json',import.meta.url),'utf8'));
const fundedSellCorpus=JSON.parse(fs.readFileSync(new URL('./fixtures/pumpfun_funded_sell_mainnet_simulations_20261004.json',import.meta.url),'utf8'));
const nativeUsdcCorpus=JSON.parse(fs.readFileSync(new URL('./fixtures/pumpfun_usdc_multihop_mainnet_simulations_20261004.json',import.meta.url),'utf8'));
const concentratedCorpus=JSON.parse(fs.readFileSync(new URL('./fixtures/pumpfun_concentrated_multihop_mainnet_simulations_20261005.json',import.meta.url),'utf8'));
for(const c of concentratedCorpus.cases)it(`PumpFun concentrated native-quote ${c.name}`,()=>{
 const r=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response),buy=c.name.endsWith('buy');
 expect(canonical(r)).toEqual(c.expected);expect(r.succeeded).toBe(true);expect(r.legs).toHaveLength(2);
 expect(r.legs[0]!.actual_input_amount).toBe(buy?1000n:100000000n);
 const dex=r.legs[buy?0:1]!;expect(dex.protocol).toBe(c.name.startsWith('whirlpool')?'OrcaWhirlpool':c.name.startsWith('dlmm')?'MeteoraDlmm':'RaydiumClmm');
 expect(dex.actual_output_amount!>=dex.other_amount_threshold).toBe(true);expect(r.legs[buy?1:0]!.actual_output_amount).toBeNull();
});
for(const c of nativeUsdcCorpus.cases)it(`PumpFun native-quote USDC route ${c.name}`,()=>{const r=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response);expect(canonical(r)).toEqual(c.expected);expect(r.succeeded).toBe(true);expect(r.legs).toHaveLength(2);expect(r.legs[0]!.actual_input_amount).toBe(c.name.endsWith('buy')?1000n:100000000n);expect(r.legs[1]!.actual_input_amount).toBe(c.name.endsWith('buy')?7800n:7452n)});
for(const c of fundedSellCorpus.cases)it(`funded PumpFun sell ${c.name}`,()=>{const r=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response);expect(canonical(r)).toEqual(c.expected);expect(r.legs).toHaveLength(1);expect(r.legs[0]!.output_account).toBe(r.legs[0]!.trader);expect(r.legs[0]!.actual_input_amount).toBe(r.succeeded?100000000n:null);expect(r.legs[0]!.actual_output_amount).toBeNull()});
for(const c of settledPumpfunCorpus.cases)it(`actual PumpFun settlement ${c.name}`,()=>{
 const r=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response);expect(canonical(r)).toEqual(c.expected);expect(r.legs[0]!.actual_input_amount).toBe(10000n);
 if(c.name.startsWith('funded_wsol'))expect(r.transfers.some(t=>t.mint==='So11111111111111111111111111111111111111112'&&t.amount===10000n)).toBe(true);
});
for(const c of pumpfunCorpus.cases)it(`PumpFun mainnet simulation ${c.name}`,()=>{const route=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response);expect(canonical(route)).toEqual(c.expected);expect(route.legs).toHaveLength(1);expect(route.legs[0]!.protocol).toBe('PumpFun');expect(route.legs[0]!.actual_input_amount).toBe(10000n);expect(route.legs[0]!.input_account).toBe(route.legs[0]!.trader)});
for(const condition of ['missing_pool','nested','unknown_recipient','missing_depth','overflow'])it(`native PumpFun debit evidence ${condition}`,()=>{
 const c=pumpfunCorpus.cases[0],response=structuredClone(c.response);
 for(const g of response.result.value.innerInstructions)for(const ix of g.instructions){
  if(ix.program!=='system'||ix.parsed?.type!=='transfer')continue;
  if(condition==='nested')ix.stackHeight=3;
  else if(condition==='missing_depth')delete ix.stackHeight;
  else if(condition==='missing_pool'&&ix.parsed.info.destination===c.expected.legs[0].pool)ix.stackHeight=3;
  else if(condition==='unknown_recipient')ix.parsed.info.destination=c.expected.legs[0].output_account;
  else if(condition==='overflow')ix.parsed.info.lamports=((1n<<64n)-1n).toString();
 }
 const r=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),response);expect(r.legs).toHaveLength(1);expect(r.legs[0]!.actual_input_amount).toBeNull();
});
for(const [disc,exactIn] of [['c2ab1c46684d5b2f',true],['b817ee6167c5d33d',false],['5df6823ce7e940b2',true]] as const)it(`failed PumpFun V2 intent ${disc}`,()=>{
 const c=pumpfunCorpus.cases[0],wire=Buffer.from(c.wire,'base64'),at=wire.indexOf(Buffer.from('c2ab1c46684d5b2f','hex'));expect(at).toBeGreaterThanOrEqual(0);Buffer.from(disc,'hex').copy(wire,at);
 const response=structuredClone(c.response);response.result.value.err={InstructionError:[0,'Custom']};const route=analyzeSimulationRoutes(wire,response);
 expect(route.succeeded).toBe(false);expect(route.legs).toHaveLength(1);expect(route.legs[0]!.amount_specified_is_input).toBe(exactIn);expect(route.legs[0]!.actual_input_amount).toBeNull();expect(route.legs[0]!.actual_output_amount).toBeNull();
});
const liveCorpus = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/simulation_routes_live_20261002.json", import.meta.url),
    "utf8",
  ),
);
const ataCorpus = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/simulation_ata_20261002.json", import.meta.url),
    "utf8",
  ),
);
for (const c of ataCorpus.cases)
  it(`first ATA simulation ${c.name}`, () => {
    const route = analyzeSimulationRoutes(
      Buffer.from(c.wire, "base64"),
      c.response,
    );
    expect(canonical(route)).toEqual(c.expected);
    expect(route.succeeded).toBe(true);
    expect(route.transfers.every((t) => t.position.outer_index !== 0)).toBe(
      true,
    );
    expect(
      route.legs.every((l) => l.actual_input_amount === l.specified_amount),
    ).toBe(true);
  });
it("preserves ATA initialization mint inference without token balances", () => {
  const c = ataCorpus.cases[0],
    response = structuredClone(c.response);
  const value = response.result.value,
    group = value.innerInstructions[0];
  const info = group.instructions[3].parsed.info;
  value.preTokenBalances = [];
  value.postTokenBalances = [];
  group.instructions.push({
    programId: group.instructions[3].programId,
    stackHeight: 2,
    parsed: {
      type: "transfer",
      info: {
        source: info.account,
        destination: info.owner,
        authority: info.owner,
        amount: "1",
      },
    },
  });
  const route = analyzeSimulationRoutes(
    Buffer.from(c.wire, "base64"),
    response,
  );
  expect(route.transfers[0].mint).toBe(info.mint);
  expect(route.transfers[0].position.inner_index).toBe(4);
});
it("rejects unknown ATA extensions and malformed public keys", () => {
  const c = ataCorpus.cases[0];
  for (const kind of ["extension", "owner", "lamports"]) {
    const response = structuredClone(c.response),
      ixs = response.result.value.innerInstructions[0].instructions;
    if (kind === "extension") ixs[0].parsed.info.extensionTypes = ["unknown"];
    if (kind === "owner") ixs[3].parsed.info.owner = "1";
    if (kind === "lamports") ixs[1].parsed.info.lamports = -1;
    expect(() =>
      analyzeSimulationRoutes(Buffer.from(c.wire, "base64"), response),
    ).toThrow();
  }
});
it("rejects absent execution status in the compiled route entry", () => {
  const c = corpus.cases[0],
    transaction = decodeWireTransaction(
      Buffer.from(c.wire, "base64"),
    ).transaction;
  const meta = { ...c.response.result.value, innerInstructions: [] };
  delete meta.err;
  expect(() => analyzeRpcTransactionRoutes({ transaction, meta })).toThrow(
    /status/,
  );
});
for (const shape of [null, [], "invalid"])
  it(`rejects malformed parsed payload ${JSON.stringify(shape)}`, () => {
    const c = corpus.cases[0],
      response = structuredClone(c.response);
    response.result.value.innerInstructions[0].instructions[0].parsed = shape;
    expect(() =>
      analyzeSimulationRoutes(Buffer.from(c.wire, "base64"), response),
    ).toThrow(/parsed/);
  });
for (const c of liveCorpus.cases)
  it(`current bank simulation ${c.name}`, () => {
    const route = analyzeSimulationRoutes(
      Buffer.from(c.wire, "base64"),
      c.response,
    );
    expect(canonical(route)).toEqual(c.expected);
    if (!route.succeeded)
      for (const leg of route.legs) {
        expect(leg.actual_input_amount).toBeNull();
        expect(leg.actual_output_amount).toBeNull();
      }
  });
it("preserves compiled CPI evidence without parsed conversion", () => {
  const c = corpus.cases[0],
    response = structuredClone(c.response),
    wire = Buffer.from(c.wire, "base64");
  const tx = decodeWireTransaction(wire).transaction,
    ix = response.result.value.innerInstructions[0].instructions[0],
    info = ix.parsed.info,
    data = Buffer.alloc(9);
  data[0] = 3;
  data.writeBigUInt64LE(BigInt(info.amount), 1);
  response.result.value.innerInstructions[0].instructions[0] = {
    programIdIndex: tx.message.accountKeys.indexOf(ix.programId),
    accounts: [info.source, info.destination, info.authority].map((k) =>
      tx.message.accountKeys.indexOf(k),
    ),
    data: bs58.encode(data),
    stackHeight: ix.stackHeight,
  };
  expect(canonical(analyzeSimulationRoutes(wire, response))).toEqual(
    c.expected,
  );
});
const altCase = JSON.parse(fs.readFileSync(new URL("./fixtures/simulation_alt_20261008.json", import.meta.url), "utf8")).cases[0];
it("resolves actual V0 ALT two-leg simulation without mutating evidence", () => {
  const response = structuredClone(altCase.response);
  const route = analyzeSimulationRoutes(Buffer.from(altCase.wire, "base64"), response);
  expect(canonical(route)).toEqual(altCase.expected);
  expect(route.succeeded).toBe(true);
  expect(route.legs).toHaveLength(2);
  expect(response).toEqual(altCase.response);
});
for (const kind of ["missing", "short_writable", "extra_writable", "short_readonly", "extra_readonly", "invalid_key"]) it(`rejects ALT resolution ${kind}`, () => {
  const response = structuredClone(altCase.response), value = response.result.value;
  if (kind === "missing") delete value.loadedAddresses;
  else if (kind === "invalid_key") value.loadedAddresses.writable[0] = "1";
  else {
    const [action, side] = kind.split("_");
    const addresses = value.loadedAddresses[side!];
    if (action === "short") addresses.pop(); else addresses.push(addresses[0]);
  }
  expect(() => analyzeSimulationRoutes(Buffer.from(altCase.wire, "base64"), response)).toThrow();
});
it("accepts empty and rejects extra loaded addresses on static wire", () => {
  const c = corpus.cases[0], response = structuredClone(c.response);
  response.result.value.loadedAddresses = {writable: [], readonly: []};
  expect(canonical(analyzeSimulationRoutes(Buffer.from(c.wire, "base64"), response))).toEqual(c.expected);
  response.result.value.loadedAddresses.readonly.push(altCase.response.result.value.loadedAddresses.readonly[0]);
  expect(() => analyzeSimulationRoutes(Buffer.from(c.wire, "base64"), response)).toThrow();
});
for (const c of corpus.cases)
  it(`simulation evidence ${c.name}`, () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw Error("implicit RPC");
    });
    try {
      const wire = Buffer.from(c.wire, "base64"),
        before = JSON.stringify(c.response),
        route = analyzeSimulationRoutes(wire, c.response);
      expect(canonical(route)).toEqual(c.expected);
      expect(JSON.stringify(c.response)).toBe(before);
      expect(route.legs).toHaveLength(c.name.startsWith("route") ? 3 : 1);
      expect(
        route.legs.every((l) => l.actual_input_amount === l.specified_amount),
      ).toBe(true);
      expect(route.native_token_actions).toHaveLength(2);
      expect(
        route.native_token_actions.some(
          (a) => a.account === "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
        ),
      ).toBe(false);
      const tx = decodeWireTransaction(wire).transaction,
        tipIndex = tx.message.accountKeys.indexOf(
          "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
        );
      const balances = c.response.result.value;
      expect(
        BigInt(balances.postBalances[tipIndex]) -
          BigInt(balances.preBalances[tipIndex]),
      ).toBe(5000n);
      expect(() =>
        analyzeRpcTransactionRoutes({ transaction: tx, meta: balances }),
      ).toThrow(/compiled/);
    } finally {
      fetch.mockRestore();
    }
  });
it("failed simulation preserves intent and clears actual fills", () => {
  const c = corpus.cases[2],
    response = structuredClone(c.response);
  response.result.value.err = { InstructionError: [8, "Custom"] };
  const route = analyzeSimulationRoutes(
    Buffer.from(c.wire, "base64"),
    response,
  );
  expect(route.succeeded).toBe(false);
  expect(route.legs).toHaveLength(3);
  expect(
    route.legs.every(
      (l) => l.actual_input_amount === null && l.actual_output_amount === null,
    ),
  ).toBe(true);
});
it("explicit Token-2022 fee resolves output; missing fee remains unknown", () => {
  const c = corpus.cases.find((x: any) => x.name === "route-buy"),
    response = structuredClone(c.response),
    wire = Buffer.from(c.wire, "base64");
  const original = analyzeSimulationRoutes(wire, response);
  expect(original.legs[1]!.actual_output_amount).toBe(null);
  const ix = response.result.value.innerInstructions
    .flatMap((g: any) => g.instructions)
    .find(
      (ix: any) =>
        ix.programId === TOKEN_2022 &&
        ix.parsed?.info.destination === original.legs[1]!.output_account,
    );
  expect(ix.parsed.type).toBe("transferChecked");
  const gross = BigInt(ix.parsed.info.tokenAmount.amount);
  ix.parsed.type = "transferCheckedWithFee";
  ix.parsed.info.feeAmount = "7";
  expect(
    analyzeSimulationRoutes(wire, response).legs[1]!.actual_output_amount,
  ).toBe(gross - 7n);
  delete ix.parsed.info.feeAmount;
  expect(() => analyzeSimulationRoutes(wire, response)).toThrow(/integer/);
});
it.each([
  "amount",
  "program",
  "account",
  "kind",
  "group",
  "stack",
  "missing",
  "error",
])("rejects malformed %s evidence", (kind) => {
  const c = corpus.cases[0],
    response = structuredClone(c.response),
    ix = response.result.value.innerInstructions[0].instructions[0];
  if (kind === "amount") ix.parsed.info.amount = 9007199254740992;
  if (kind === "program")
    ix.programId = decodeWireTransaction(
      Buffer.from(c.wire, "base64"),
    ).transaction.message.accountKeys[0];
  if (kind === "account") ix.parsed.info.source = "not-in-transaction";
  if (kind === "kind") ix.parsed.type = "approve";
  if (kind === "group")
    response.result.value.innerInstructions.push(
      response.result.value.innerInstructions[0],
    );
  if (kind === "stack") ix.stackHeight = 1;
  if (kind === "missing") delete response.result.value.innerInstructions;
  if (kind === "error") response.error = { code: -1, message: "no simulation" };
  expect(() =>
    analyzeSimulationRoutes(Buffer.from(c.wire, "base64"), response),
  ).toThrow();
});

const pumpSwapCorpus = JSON.parse(fs.readFileSync(new URL('./fixtures/pumpswap_mainnet_simulations_20261004.json',import.meta.url),'utf8'));
for (const c of pumpSwapCorpus.cases) it(`PumpSwap mainnet simulation ${c.name}`,()=>{
 const route=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response);
 expect(canonical(route)).toEqual(c.expected);
 expect(route.succeeded).toBe(true);
 expect(route.legs).toHaveLength(1);
 if(c.name==='pumpswap_buy') expect(route.legs[0]!.actual_output_amount).toBeNull();
});

const dammCorpus=JSON.parse(fs.readFileSync(new URL('./fixtures/damm_v2_mainnet_simulations_20261004.json',import.meta.url),'utf8'));
for(const c of dammCorpus.cases)it(`DAMM v2 actual simulation ${c.name}`,()=>{const route=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response);expect(canonical(route)).toEqual(c.expected);if(!route.succeeded){for(const leg of route.legs){expect(leg.actual_input_amount).toBeNull();expect(leg.actual_output_amount).toBeNull()}}});

const cachedDammCorpus=JSON.parse(fs.readFileSync(new URL('./fixtures/cached_damm_v2_mainnet_simulations_20261004.json',import.meta.url),'utf8'));
for(const c of cachedDammCorpus.cases)it(`Cached DAMM actual simulation ${c.name}`,()=>{
 const route=analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),c.response);
 expect(canonical(route)).toEqual(c.expected);expect(route.legs).toHaveLength(1);
 expect(route.legs[0]!.protocol).toBe('MeteoraDammV2');
 expect(route.legs[0]!.actual_input_amount).toBe(route.succeeded?10000n:null);
 expect(route.legs[0]!.actual_output_amount).toBeNull();
});
for(const mode of [0,1,2,3])it(`DAMM swap2 mode intent ${mode}`,()=>{
 const c=cachedDammCorpus.cases[0],wire=Buffer.from(c.wire,'base64'),original=Buffer.alloc(25);
 Buffer.from([65,75,63,76,235,91,91,136]).copy(original);original.writeBigUInt64LE(10000n,8);original.writeBigUInt64LE(1n,16);
 const at=wire.indexOf(original);expect(at).toBeGreaterThanOrEqual(0);wire[at+24]=mode;
 const route=analyzeSimulationRoutes(wire,c.response);
 if(mode===3)expect(route.legs).toHaveLength(0);else{expect(route.legs).toHaveLength(1);expect(route.legs[0]!.amount_specified_is_input).toBe(mode!==2);expect(route.legs[0]!.specified_amount).toBe(10000n);expect(route.legs[0]!.other_amount_threshold).toBe(1n)}
});

const lpCorpus = JSON.parse(fs.readFileSync(new URL('./fixtures/cpmm_lp_simulations_20261006.json', import.meta.url), 'utf8'));
for (const c of lpCorpus.cases) it(`CPMM LP simulation ${c.name} preserves only funding swap`, () => {
  const route = analyzeSimulationRoutes(Buffer.from(c.wire, 'base64'), c.response);
  expect(canonical(route)).toEqual(c.expected);
  expect(route.succeeded).toBe(true);
  expect(route.legs).toHaveLength(1);
});

for (const type of ['mintTo', 'burn', 'mintToChecked', 'burnChecked']) {
  for (const invalid of ['18446744073709551616', '-1', true, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    it(`supply CPI ${type} rejects invalid amount ${String(invalid)}`, () => {
      const c = lpCorpus.cases[0], response = structuredClone(c.response);
      const ix = response.result.value.innerInstructions.flatMap((g: any) => g.instructions).find((ix: any) => ix.parsed?.type === 'mintTo');
      const info = ix.parsed.info;
      if (type.startsWith('burn')) { info.authority = info.mintAuthority; delete info.mintAuthority; }
      ix.parsed.type = type;
      if (type.endsWith('Checked')) { info.tokenAmount = { amount: invalid, decimals: 6 }; delete info.amount; }
      else info.amount = invalid;
      expect(() => analyzeSimulationRoutes(Buffer.from(c.wire, 'base64'), response)).toThrow();
    });
  }
  it(`supply CPI ${type} preserves multisig and rejects invalid signers`, () => {
    const c = lpCorpus.cases[0], response = structuredClone(c.response);
    const ix = response.result.value.innerInstructions.flatMap((g: any) => g.instructions).find((ix: any) => ix.parsed?.type === 'mintTo');
    const info = ix.parsed.info, minting = type.startsWith('mintTo');
    info[minting ? 'multisigMintAuthority' : 'multisigAuthority'] = info.mintAuthority;
    delete info.mintAuthority;
    ix.parsed.type = type;
    if (type.endsWith('Checked')) { info.tokenAmount = {amount: info.amount, decimals: 6}; delete info.amount; }
    info.signers = [];
    expect(canonical(analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),response))).toEqual(c.expected);
    info.signers = 'invalid';
    expect(() => analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),response)).toThrow();
    if (type.endsWith('Checked')) {
      info.signers = []; info.tokenAmount.decimals = 256;
      expect(() => analyzeSimulationRoutes(Buffer.from(c.wire,'base64'),response)).toThrow();
    }
  });
}
