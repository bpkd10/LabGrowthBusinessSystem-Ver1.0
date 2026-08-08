import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ASSET_FILES } from "./assets.mjs";
import { SECURITY_HEADERS } from "./security-headers.mjs";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

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
  // AI Analysis ใช้ key ของผู้ใช้เอง (BYOK) ไม่มี env var ฝั่ง server ให้รายงานสถานะแล้ว (ADR-001)
});
