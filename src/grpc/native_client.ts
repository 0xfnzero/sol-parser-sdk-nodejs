/** Pure JavaScript Yellowstone transport. Exact protobuf integers are decimal strings. */
import * as grpc from "@grpc/grpc-js";
import {loadSync} from "@grpc/proto-loader";
import {join} from "node:path";
import type {CommitmentLevel, SubscribeRequest, SubscribeUpdate} from "./protocol/geyser.js";
export interface NativeChannelOptions extends grpc.ChannelOptions { connectTimeoutMs?: number; }
const definition=loadSync(join(__dirname,"protocol/geyser.proto"),{longs:String,bytes:Buffer,defaults:true,oneofs:true});
const loaded=grpc.loadPackageDefinition(definition) as unknown as {geyser:{Geyser:grpc.ServiceClientConstructor}};
export const geyserService=loaded.geyser.Geyser.service;
export default class NativeYellowstoneClient {
 private raw?:grpc.Client;
 private readonly address:string;
 private readonly credentials:grpc.ChannelCredentials;
 private readonly metadata:grpc.Metadata;
 constructor(endpoint:string,token?:string,private readonly options:NativeChannelOptions={}){
  let address=endpoint,tls=true;
  if(endpoint.includes("://")){
   let url:URL;try{url=new URL(endpoint);}catch{throw Error("Invalid gRPC endpoint");}
   if(!["http:","https:"].includes(url.protocol)||url.username||url.password||url.search||url.hash||(url.pathname!==""&&url.pathname!=="/"))throw Error("Invalid gRPC endpoint");
   address=url.host;tls=url.protocol==="https:";
  }
  if(!address)throw Error("Invalid gRPC endpoint");
  this.address=address;this.credentials=tls?grpc.credentials.createSsl():grpc.credentials.createInsecure();
  this.metadata=new grpc.Metadata();if(token)this.metadata.set("x-token",token);
 }
 private client():grpc.Client{
  if(!this.raw){const {connectTimeoutMs:_,...channel}=this.options;this.raw=new loaded.geyser.Geyser(this.address,this.credentials,channel);}
  return this.raw;
 }
 async connect():Promise<void>{
  const timeout=this.options.connectTimeoutMs??8000;
  await new Promise<void>((resolve,reject)=>this.client().waitForReady(Date.now()+timeout,e=>e?reject(e):resolve()));
 }
 close():void{this.raw?.close();this.raw=undefined;}
 async subscribe():Promise<grpc.ClientDuplexStream<SubscribeRequest,SubscribeUpdate>>{
  const client=this.client() as grpc.Client & {subscribe:(metadata:grpc.Metadata)=>grpc.ClientDuplexStream<SubscribeRequest,SubscribeUpdate>};
  return client.subscribe(this.metadata);
 }
 private unary(method:string,request:object):Promise<any>{
  const client=this.client() as any;
  return new Promise((resolve,reject)=>client[method](request,this.metadata,{deadline:Date.now()+(this.options.connectTimeoutMs??8000)},(error:Error|null,response:unknown)=>error?reject(error):resolve(response)));
 }
 getLatestBlockhash(commitment?:CommitmentLevel){return this.unary("getLatestBlockhash",{commitment});}
 getBlockHeight(commitment?:CommitmentLevel){return this.unary("getBlockHeight",{commitment});}
 getSlot(commitment?:CommitmentLevel){return this.unary("getSlot",{commitment});}
 getVersion(){return this.unary("getVersion",{});}
 isBlockhashValid(blockhash:string,commitment?:CommitmentLevel){return this.unary("isBlockhashValid",{blockhash,commitment});}
 async ping(count:number):Promise<number>{return (await this.unary("ping",{count})).count;}
}
