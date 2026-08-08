import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ASSET_FILES } from "./assets.mjs";
import { SECURITY_HEADERS } from "./security-headers.mjs";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist/server/index.js");

const assets = {};
for (const [pathname, [file, contentType]] of Object.entries(ASSET_FILES)) {
  assets[pathname] = {
    body: await readFile(resolve(root, file), "utf8"),
    contentType
  };
}

const worker = `const assets = ${JSON.stringify(assets)};
const securityHeaders = ${JSON.stringify(SECURITY_HEADERS)};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const asset = assets[url.pathname];
    if (!asset) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    const cacheControl = url.pathname === "/" || url.pathname === "/index.html"
      ? "no-cache"
      : "public, max-age=3600";

    return new Response(request.method === "HEAD" ? null : asset.body, {
      headers: {
        "content-type": asset.contentType,
        "cache-control": cacheControl,
        ...securityHeaders
      }
    });
  }
};
`;

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(resolve(root, "dist/server"), { recursive: true });
await writeFile(output, worker);
console.log(`Built ${Object.keys(assets).length} routes to dist/server/index.js`);
