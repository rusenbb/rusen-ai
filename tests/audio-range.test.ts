// @vitest-environment node
import { describe, expect, it } from "vitest";
import { onRequest } from "../functions/audio/blog/[file]";

const bytes = Uint8Array.from({ length: 100 }, (_, i) => i);
async function serve(headers: Record<string, string> = {}, method = "GET") {
  return onRequest({ request: new Request("https://example.com/audio/blog/test.m4a", { headers, method }), env: { ASSETS: { fetch: async (request) => {
    expect(request.headers.has("Range")).toBe(false);
    expect(request.headers.has("If-Range")).toBe(false);
    let offset = 0;
    return new Response(new ReadableStream({ pull(controller) {
      if (offset === bytes.length) { controller.close(); return; }
      controller.enqueue(bytes.slice(offset, offset + 10)); offset += 10;
    } }), { headers: { "Content-Length": "100", "Content-Type": "audio/mp4", ETag: '"version1"', "Last-Modified": "Mon, 16 Nov 2026 10:00:00 GMT" } });
  } } } });
}

describe("article audio byte ranges", () => {
  it.each([
    ["bytes=0-1", 0, 1], ["bytes=17-34", 17, 34], ["bytes=90-", 90, 99],
    ["bytes=-7", 93, 99], ["bytes=90-200", 90, 99], ["bytes=-200", 0, 99],
  ])("serves %s across streamed chunks", async (range, start, end) => {
    const response = await serve({ Range: range });
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes ${start}-${end}/100`);
    expect(response.headers.get("Content-Length")).toBe(String(end - start + 1));
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes.slice(start, end + 1));
  });
  it.each(["bytes=100-", "bytes=50-40", "bytes=-0", "bytes=999999999999999999999-"])("rejects unsatisfiable %s", async (Range) => {
    const response = await serve({ Range });
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */100");
    expect(await response.text()).toBe("");
  });
  it.each([{}, { Range: "invalid" }, { Range: "bytes=0-1,3-4" }, { Range: "bytes=0-1", "If-Range": '"old"' }, { Range: "bytes=0-1", "If-Range": 'W/"version1"' }])("returns a full response for %j", async (headers) => {
    const response = await serve(headers as Record<string, string>);
    expect(response.status).toBe(200);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });
  it.each(['"version1"', "Mon, 16 Nov 2026 10:00:00 GMT"])("honors matching If-Range %s", async (validator) => {
    const response = await serve({ Range: "bytes=10-19", "If-Range": validator });
    expect(response.status).toBe(206);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes.slice(10, 20));
  });
  it("HEAD advertises ranges and length with no body", async () => {
    const response = await serve({}, "HEAD");
    expect(response.headers.get("Content-Length")).toBe("100");
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(await response.text()).toBe("");
  });
  it("preserves asset errors", async () => {
    const response = await onRequest({ request: new Request("https://example.com/missing.m4a"), env: { ASSETS: { fetch: async () => new Response("not found", { status: 404 }) } } });
    expect(response.status).toBe(404);
  });
  it("supports assets without a Content-Length header", async () => {
    const response = await onRequest({ request: new Request("https://example.com/audio.m4a", { headers: { Range: "bytes=2-4" } }), env: { ASSETS: { fetch: async () => new Response(bytes) } } });
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 2-4/100");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes.slice(2, 5));
  });
});
