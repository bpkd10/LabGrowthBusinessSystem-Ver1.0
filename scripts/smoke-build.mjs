import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { ASSET_FILES } from "./assets.mjs";

const root = resolve(import.meta.dirname, "..");
const workerPath = pathToFileURL(resolve(root, "dist/server/index.js"));
workerPath.searchParams.set("smoke", Date.now().toString());
const worker = (await import(workerPath.href)).default;

for (const [route, [relativePath, contentType]] of Object.entries(ASSET_FILES)) {
  const response = await worker.fetch(new Request(`https://app.example${route}`), {});
  assert.equal(response.status, 200, `${route} ต้องตอบ 200`);
  assert.ok((response.headers.get("content-type") || "").includes(contentType.split(";")[0]), `${route} มี Content-Type ไม่ถูกต้อง`);
  const body = await response.text();
  // /robots.txt เป็นไฟล์เล็กโดยธรรมชาติ (แค่ 2 บรรทัด) เกณฑ์ 100 byte ใช้กับ
  // asset อื่นที่ควรมีเนื้อหาเยอะ (JS/CSS/SVG) เพื่อจับกรณีไฟล์ถูก build มาว่างเปล่า
  // ความถูกต้องของเนื้อหาจริงยังถูกตรวจอยู่แล้วด้วย exact match กับ source ด้านล่าง
  const minLength = route === "/robots.txt" ? 1 : 100;
  assert.ok(body.length > minLength, `${route} ตอบ Body ว่างหรือสั้นผิดปกติ`);
  const source = await readFile(resolve(root, relativePath), "utf8");
  assert.equal(body, source, `${route} ใน build ไม่ตรงกับ source ปัจจุบัน`);
}

console.log(`Build smoke passed: ${Object.keys(ASSET_FILES).length} routes`);
