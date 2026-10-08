import {it,expect} from 'vitest';
import {parseSwapEventFromData} from './raydium_cpmm.js';
import {parseDlmmFromDecoded} from './meteora_dlmm.js';
import {makeMetadata} from '../core/metadata.js';
const meta=makeMetadata('sig',1,0,undefined,0);
it('preserves current CPMM mints and creator fees while accepting the legacy layout',()=>{
 const b=Buffer.alloc(162);b.fill(1,81,113);b.fill(2,113,145);b.writeBigUInt64LE(9007199254740993n,145);b.writeBigUInt64LE(77n,153);b[161]=1;
 const e=(parseSwapEventFromData(b,meta) as any).RaydiumCpmmSwap;
 expect(e.trade_fee).toBe(9007199254740993n);expect(e.creator_fee).toBe(77n);expect(e.creator_fee_on_input).toBe(true);expect(e.input_mint).not.toBe(e.output_mint);
 expect(parseSwapEventFromData(b.subarray(0,81),meta)).not.toBeNull();
 for(let n=0;n<162;n++)if(n!==81)expect(parseSwapEventFromData(b.subarray(0,n),meta)).toBeNull();
 b[161]=2;expect(parseSwapEventFromData(b,meta)).toBeNull();
});
it('sums DLMM fee components, exposes flags and rejects truncated or overflowing events',()=>{
 const b=Buffer.alloc(155);Buffer.from([46,116,82,215,148,27,84,77]).copy(b);b.writeBigUInt64LE(9007199254740993n,8+97);b.writeBigUInt64LE(17531n,8+113);b.writeBigUInt64LE(1947n,8+121);b[8+145]=1;
 const e=(parseDlmmFromDecoded(b,meta) as any).MeteoraDlmmSwap;
 expect(e.fee).toBe(19478n);expect(e.mm_fee).toBe(17531n);expect(e.amount_left).toBe(9007199254740993n);expect(e.fees_on_input).toBe(true);expect(e.fees_on_token_x).toBe(false);
 for(let n=0;n<b.length;n++)expect(parseDlmmFromDecoded(b.subarray(0,n),meta)).toBeNull();
 b.writeBigUInt64LE(0xffffffffffffffffn,8+113);expect(parseDlmmFromDecoded(b,meta)).toBeNull();
 b.writeBigUInt64LE(3n,8+113);b[8+146]=2;expect(parseDlmmFromDecoded(b,meta)).toBeNull();
});
