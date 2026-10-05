/** Read one gRPC BlockMeta using GRPC_URL/GRPC_TOKEN. No RPC. */
import { YellowstoneGrpc, eventTypeFilterIncludeOnly, bigintToJsonReplacer } from "../src/index.js";
async function main() {
  if (!process.env.GRPC_URL) throw Error("Set GRPC_URL");
  const client = new YellowstoneGrpc(
    process.env.GRPC_URL!,
    process.env.GRPC_TOKEN ?? "",
  );
  const sub = await client.subscribeDexEvents(
    [],
    [],
    eventTypeFilterIncludeOnly(["BlockMeta"]),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const event = await Promise.race([
      sub.next(),
      sub.errors[Symbol.asyncIterator]()
        .next()
        .then((error) => {
          throw error.value ?? Error("Error stream closed");
        }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error("BlockMeta timeout")), 30000);
      }),
    ]);
    if (event.done || !("BlockMeta" in event.value))
      throw Error("Expected BlockMeta");
    console.log(JSON.stringify(event.value.BlockMeta.metadata, bigintToJsonReplacer));
  } finally {
    if (timer) clearTimeout(timer);
    sub.cancel();
    await client.disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
