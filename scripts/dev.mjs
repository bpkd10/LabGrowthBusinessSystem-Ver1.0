import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzeWithOpenAI } from "./ai-analysis.mjs";
import { ASSET_FILES } from "./assets.mjs";
import { SECURITY_HEADERS } from "./security-headers.mjs";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4173);

async function loadLocalEnv() {
  try {
    const content = await readFile(resolve(root, ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadLocalEnv();

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 1_000_000) throw Object.assign(new Error("ข้อมูลมีขนาดใหญ่เกินไป"), { status: 413 });
      }
      const result = await analyzeWithOpenAI(JSON.parse(body), process.env.OPENAI_API_KEY);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...SECURITY_HEADERS });
      response.end(JSON.stringify(result));
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = ASSET_FILES[pathname];
    if (!asset) {
      response.writeHead(404).end("Not found");
      return;
    }
    const [relativePath, contentType] = asset;
    const file = resolve(root, relativePath);
    const content = await readFile(file);
    // cache-control ตั้งใจต่างจาก production (no-store เสมอ) แต่ security header
    // ต้องเหมือนกันเป๊ะ อ่านจากแหล่งเดียวกับที่ build.mjs ใช้สร้าง production Worker
    response.writeHead(200, { "content-type": contentType, "cache-control": "no-store", ...SECURITY_HEADERS });
    response.end(content);
  } catch (error) {
    const status = Number(error.status) || 500;
    response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...SECURITY_HEADERS });
    response.end(JSON.stringify({ error: error.message || "เกิดข้อผิดพลาดที่ server" }));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Business Growth app: http://127.0.0.1:${port}`);
  console.log(`AI Analysis: ${process.env.OPENAI_API_KEY ? "ready" : "missing OPENAI_API_KEY"}`);
});
