type Context = {
  request: Request;
  env: { ASSETS: { fetch(request: Request): Promise<Response> } };
};
declare const FixedLengthStream: new (length: number) => TransformStream<Uint8Array, Uint8Array>;

// Pages static assets ignore Range. Limit this adapter to article audio so
// all other routes continue to be served directly by Pages.
export async function onRequest({ request, env }: Context): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return env.ASSETS.fetch(request);
  const headers = new Headers(request.headers);
  headers.delete("Range");
  headers.delete("If-Range");
  // Use GET even for HEAD: the asset binding may omit Content-Length on HEAD.
  let asset = await env.ASSETS.fetch(new Request(request.url, { headers }));
  if (asset.status !== 200 || !asset.body) return asset;
  let size = Number(asset.headers.get("Content-Length"));
  // The binding omits the length in some environments. Obtain it from the
  // asset when needed; Pages already limits individual assets to 25 MiB.
  if (!Number.isSafeInteger(size) || size <= 0) {
    const data = await asset.arrayBuffer();
    size = data.byteLength;
    asset = new Response(data, { headers: asset.headers });
    asset.headers.set("Content-Length", String(size));
  }
  const output = new Headers(asset.headers);
  output.set("Accept-Ranges", "bytes");
  if (request.method === "HEAD") {
    await asset.body!.cancel();
    return new Response(null, { headers: output });
  }
  const ifRange = request.headers.get("If-Range");
  const matchesValidator = !ifRange ||
    (!ifRange.startsWith("W/") && ifRange === asset.headers.get("ETag")) ||
    (Number.isFinite(Date.parse(ifRange)) &&
      Date.parse(asset.headers.get("Last-Modified") ?? "") <= Date.parse(ifRange));
  const match = matchesValidator && /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("Range") ?? "");
  // Ignore malformed, unsupported multi-range, and stale If-Range requests.
  if (!match || (!match[1] && !match[2])) return new Response(asset.body, { headers: output });
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
    await asset.body!.cancel();
    output.set("Content-Range", `bytes */${size}`);
    output.set("Content-Length", "0");
    return new Response(null, { status: 416, headers: output });
  }
  output.set("Content-Range", `bytes ${start}-${end}/${size}`);
  output.set("Content-Length", String(end - start + 1));
  const reader = asset.body!.getReader();
  let offset = 0;
  // Stream the requested interval, rather than buffering a whole recording.
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) { controller.close(); return; }
        const chunkStart = offset;
        offset += value.length;
        if (offset <= start) continue;
        controller.enqueue(value.subarray(Math.max(0, start - chunkStart), Math.min(value.length, end + 1 - chunkStart)));
        if (offset > end) { controller.close(); await reader.cancel(); }
        return;
      }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
  // Workers derives Content-Length from the stream, not the supplied header.
  const sizedBody = typeof FixedLengthStream === "undefined" ? body :
    body.pipeThrough(new FixedLengthStream(end - start + 1));
  return new Response(sizedBody, { status: 206, headers: output });
}
