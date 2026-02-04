import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export interface Env {
  __STATIC_CONTENT: KVNamespace;
  __STATIC_CONTENT_MANIFEST: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: JSON.parse(env.__STATIC_CONTENT_MANIFEST),
        }
      );
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  },
};
