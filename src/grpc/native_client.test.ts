import * as grpc from "@grpc/grpc-js";
import {it,expect} from "vitest";
import {YellowstoneGrpc} from "./client.js";
import {geyserService} from "./native_client.js";
import {defaultClientConfig,eventTypeFilterIncludeOnly} from "./types.js";
it("uses real TCP gRPC with exact u64, filters, reconnect and joined cancellation",async()=>{
 const server=new grpc.Server(), requests:any[]=[],calls:grpc.ServerDuplexStream<any,any>[]=[];
 let count=0;
 server.addService(geyserService,{
  subscribe:(call:grpc.ServerDuplexStream<any,any>)=>{
   calls.push(call);
   call.on("data",request=>{
    requests.push(request);
    call.write({blockMeta:{slot:"18446744073709551615",blockhash:"11111111111111111111111111111111",parentSlot:"18446744073709551614",blockTime:{timestamp:"1791000000"},blockHeight:{blockHeight:"123"},executedTransactionCount:"0",entriesCount:"0"}});
   });
   count++;
  },
  getSlot:(_:unknown,callback:Function)=>callback(null,{slot:"18446744073709551615"}),
 });
 const port=await new Promise<number>((resolve,reject)=>server.bindAsync("127.0.0.1:0",grpc.ServerCredentials.createInsecure(),(e,p)=>e?reject(e):resolve(p)));
 const client=new YellowstoneGrpc(`http://127.0.0.1:${port}`,"",{...defaultClientConfig(),retry_delay_ms:1,order_mode:"Unordered"});
 try{
  expect(await client.getSlot()).toBe((1n<<64n)-1n);
  const sub=await client.subscribeDexEvents([],[],eventTypeFilterIncludeOnly(["BlockMeta"]));
  const event=await sub.next();expect(event.done).toBe(false);
  expect((event.value as any).BlockMeta.metadata.slot).toBe((1n<<64n)-1n);
  await client.updateSubscription([{account_include:["latest"],account_exclude:[],account_required:[]}],[]);
  await viWait(()=>requests.some(r=>Object.values(r.transactions).some((t:any)=>t.accountInclude.includes("latest"))));
  calls[0].emit("error",Object.assign(new Error("test disconnect"),{code:grpc.status.UNAVAILABLE}));
  await viWait(()=>count===2);
  await viWait(()=>sub.status().state==="connected"&&requests.length>=3);expect(sub.status().continuityBroken).toBe(true);
  expect(Object.values(requests.at(-1).transactions).some((t:any)=>t.accountInclude.includes("latest"))).toBe(true);
  await client.stop();await sub.join();expect(sub.status().state).toBe("stopped");
 }finally{await client.disconnect();server.forceShutdown();}
},10000);
async function viWait(predicate:()=>boolean){const limit=Date.now()+3000;while(!predicate()){if(Date.now()>limit)throw Error("gRPC condition timed out");await new Promise(r=>setTimeout(r,10));}}
