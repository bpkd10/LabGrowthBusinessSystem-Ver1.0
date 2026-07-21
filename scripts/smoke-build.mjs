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
  assert.ok(body.length > 100, `${route} ตอบ Body ว่างหรือสั้นผิดปกติ`);
  const source = await readFile(resolve(root, relativePath), "utf8");
  assert.equal(body, source, `${route} ใน build ไม่ตรงกับ source ปัจจุบัน`);
}

console.log(`Build smoke passed: ${Object.keys(ASSET_FILES).length} routes`);
