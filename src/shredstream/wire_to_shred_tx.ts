/** Native wire decoding shared with RPC routes, including V1 without ALT. */
import bs58 from 'bs58';
import {decodeWireTransaction} from '../wire_transaction.js';
import type {ShredWasmTx} from './instruction_parse.js';
export function wireBytesToShredWasmTx(raw:Uint8Array):ShredWasmTx|null {
 try {
  const {transaction:tx}=decodeWireTransaction(raw),msg=tx.message;
  if(!tx.signatures[0])return null;
  return {signature:tx.signatures[0],accounts:msg.accountKeys,
   instructions:msg.instructions.map(ix=>({programIdIndex:ix.programIdIndex,accounts:Uint8Array.from(ix.accounts),data:bs58.decode(ix.data)})),
   messageVersion:tx.version==='legacy'?'legacy':tx.version===0?'v0':'v1',header:msg.header,
   recentBlockhash:bs58.decode(msg.recentBlockhash),
   addressTableLookups:msg.addressTableLookups.map(l=>({...l,writableIndexes:Uint8Array.from(l.writableIndexes),readonlyIndexes:Uint8Array.from(l.readonlyIndexes)}))};
 }catch{return null;}
}
