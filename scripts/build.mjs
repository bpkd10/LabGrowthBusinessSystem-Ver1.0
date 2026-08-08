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

// แปะซอร์สของตัวส่งต่อ AI เข้าไปใน bundle ตรง ๆ (ไฟล์นั้นจงใจไม่มี import)
// เพื่อให้ dev และ production ใช้โค้ดชุดเดียวกันจริง ๆ ไม่ใช่สองสำเนาที่ต้องคอยไล่ให้ตรงกัน
const aiRelaySource = await readFile(resolve(root, "scripts/ai-relay.mjs"), "utf8");

const worker = `const assets = ${JSON.stringify(assets)};
const securityHeaders = ${JSON.stringify(SECURITY_HEADERS)};

${aiRelaySource}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ส่งต่อคำขอ AI ด้วย key ของผู้ใช้ — Worker ไม่มี key ของตัวเอง ไม่อ่าน env ใด ๆ
    const relayed = await handleAiRelay(request, url);
    if (relayed) {
      const headers = new Headers(relayed.headers);
      for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
      headers.set("cache-control", "no-store");
      return new Response(relayed.body, { status: relayed.status, headers });
    }

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
