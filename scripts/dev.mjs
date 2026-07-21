import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { analyzeWithOpenAI } from "./ai-analysis.mjs";

const root = resolve(import.meta.dirname, "..");
const appRoot = resolve(root, "app");
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

const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };

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
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(result));
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const assetFiles = {
      "/index.html": resolve(appRoot, "index.html"),
      "/app.js": resolve(appRoot, "app.js"),
      "/styles.css": resolve(appRoot, "styles.css"),
      "/icons.svg": resolve(appRoot, "icons.svg"),
      "/brand/logo-wordmark.svg": resolve(root, "logo.svg/logo-wordmark.svg"),
      "/brand/logo-wordmark-dark.svg": resolve(root, "logo.svg/logo-wordmark-dark.svg"),
      "/brand/logo-wordmark-light.svg": resolve(root, "logo.svg/logo-wordmark-light.svg"),
      "/brand/icon-favicon.svg": resolve(root, "logo.svg/icon-favicon.svg")
    };
    if (!assetFiles[pathname]) {
      response.writeHead(404).end("Not found");
      return;
    }
    const file = assetFiles[pathname];
    const content = await readFile(file);
    response.writeHead(200, { "content-type": contentTypes[extname(file)], "x-content-type-options": "nosniff" });
    response.end(content);
  } catch (error) {
    const status = Number(error.status) || 500;
    response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ error: error.message || "เกิดข้อผิดพลาดที่ server" }));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Business Growth app: http://127.0.0.1:${port}`);
  console.log(`AI Analysis: ${process.env.OPENAI_API_KEY ? "ready" : "missing OPENAI_API_KEY"}`);
});
