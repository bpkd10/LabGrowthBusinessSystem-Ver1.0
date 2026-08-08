// ตรวจว่า scripts/dev.mjs กับ Production Worker ที่ build แล้ว (dist/server/index.js)
// ส่ง Security Header ชุดเดียวกันเป๊ะ (ตาม ADR-001 ข้อ 6.3 / ระยะ 0 งาน #2)
//
// พิสูจน์กับของจริง ไม่ใช่ regex หา source code:
//   - ฝั่ง production: import dist/server/index.js แล้วเรียก worker.fetch(...) ตรง ๆ
//     (เทคนิคเดียวกับ scripts/smoke-build.mjs)
//   - ฝั่ง dev: เปิด scripts/dev.mjs เป็น child process จริงบน port ว่าง แล้วยิง
//     request จริงด้วย fetch()
//
// และ scan app/index.html หา construct ที่ Content-Security-Policy ปัจจุบันจะบล็อก
// เพื่อป้องกันข้อบกพร่อง (c) ใน ADR ไม่ให้ย้อนกลับมาแบบเงียบ ๆ

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SECURITY_HEADERS } from "./security-headers.mjs";

const root = resolve(import.meta.dirname, "..");

// ---------- 1) Scan app/index.html หา pattern ที่ CSP ปัจจุบันจะบล็อก ----------
// (style-src มี 'unsafe-inline' อยู่แล้ว จึงไม่ตรวจ inline style= — อนุญาตตามที่ตั้งใจ)

const html = await readFile(resolve(root, "app/index.html"), "utf8");

for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const [, attributes, body] = match;
  if (/\bsrc\s*=/i.test(attributes)) continue; // <script src="..."> โหลดจากไฟล์ ผ่านได้
  assert.equal(
    body.trim(),
    "",
    `app/index.html มี inline <script> ที่มีเนื้อหาอยู่ในตัว (ไม่ได้ใช้ src=) ซึ่ง Content-Security-Policy (script-src 'self') จะบล็อกใน Production กรุณาย้ายโค้ดไปไฟล์ .js แล้ว import ผ่าน src= แทน`
  );
}

assert.doesNotMatch(
  html,
  /\son[a-z]+\s*=\s*["']/i,
  `app/index.html มี inline event handler attribute (เช่น onclick=, onload=) ซึ่ง Content-Security-Policy (script-src 'self') จะบล็อกใน Production กรุณาใช้ addEventListener ใน app.js แทน`
);

assert.doesNotMatch(
  html,
  /["'\s]javascript:/i,
  `app/index.html มี URL แบบ javascript: ซึ่ง Content-Security-Policy จะบล็อกใน Production กรุณาใช้ addEventListener แทนการยัด JavaScript ไว้ใน href/src`
);

console.log("Static scan passed: ไม่พบ inline <script>, inline event handler, หรือ javascript: URL ใน app/index.html");

// ---------- 2) Production Worker ต้องส่ง SECURITY_HEADERS ครบและตรงเป๊ะ ----------

const workerUrl = pathToFileURL(resolve(root, "dist/server/index.js"));
workerUrl.searchParams.set("check-headers", Date.now().toString());
const worker = (await import(workerUrl.href)).default;
const prodResponse = await worker.fetch(new Request("https://app.example/"), {});

for (const [headerName, expectedValue] of Object.entries(SECURITY_HEADERS)) {
  assert.equal(
    prodResponse.headers.get(headerName),
    expectedValue,
    `dist/server/index.js (Production Worker) ไม่ได้ส่ง header "${headerName}: ${expectedValue}" ตามที่กำหนดใน scripts/security-headers.mjs`
  );
}

console.log(`Production Worker headers passed: ${Object.keys(SECURITY_HEADERS).length} security headers ตรงกับ scripts/security-headers.mjs`);

// ---------- 2b) ป้องกันการย้อนกลับของ /api/analyze (ADR-001 ข้อ 6.1, 6.2, ระยะ 2 งาน #9) ----------
// server-side AI path ถูกลบไปแล้วโดยตั้งใจ (BYOK เรียก OpenAI ตรงจาก browser) ถ้าใครเผลอ
// เติม endpoint นี้กลับมา จะไม่มี body limit และไม่มี rate limit เหมือนเดิม — เป็น proxy
// สาธารณะที่ไม่มี auth ให้ใครก็เผาเครดิตของเจ้าของได้ ต้อง assert ว่าเส้นทางนี้ไม่มีอยู่จริง
// ทั้งสองฝั่ง ไม่ใช่แค่ scan source code
const prodAnalyzeResponse = await worker.fetch(
  new Request("https://app.example/api/analyze", { method: "POST", body: "{}" }),
  {}
);
assert.ok(
  [404, 405].includes(prodAnalyzeResponse.status),
  `dist/server/index.js (Production Worker) ต้องตอบ 404 หรือ 405 ต่อ POST /api/analyze (เส้นทาง server-side AI ถูกลบแล้วตาม ADR-001 ข้อ 4.3 ถ้ามีคนเผลอเติมกลับมา นี่คือ public proxy ที่ไม่มี auth/rate limit) แต่ตอบ ${prodAnalyzeResponse.status}`
);
console.log(`Production Worker POST /api/analyze passed: ตอบ ${prodAnalyzeResponse.status} ตามที่คาดไว้`);

// ---------- 3) Dev server (child process จริง) ต้องส่ง header ชุดเดียวกัน ----------

function findFreePort() {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", rejectPort);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

async function waitForDevServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(
    `scripts/dev.mjs ไม่ยอมตอบสนอง request ภายใน ${timeoutMs}ms (${url}) — ${lastError?.message || "ไม่ทราบสาเหตุ"}`
  );
}

async function shutdownDevProcess(devProcess) {
  if (devProcess.exitCode !== null || devProcess.signalCode !== null) return;
  const exited = new Promise((r) => devProcess.once("exit", r));
  devProcess.kill("SIGTERM");
  const timedOut = await Promise.race([exited.then(() => false), new Promise((r) => setTimeout(() => r(true), 3000))]);
  if (timedOut) {
    devProcess.kill("SIGKILL");
    await exited;
  }
}

const devPort = await findFreePort();
const devProcess = spawn(process.execPath, [resolve(root, "scripts/dev.mjs")], {
  cwd: root,
  env: { ...process.env, PORT: String(devPort) },
  stdio: ["ignore", "pipe", "pipe"]
});

let devStderr = "";
devProcess.stdout.on("data", () => {}); // ระบาย stdout กัน pipe buffer เต็ม ไม่ได้ใช้เนื้อหา
devProcess.stderr.on("data", (chunk) => {
  devStderr += chunk.toString();
});
devProcess.on("error", (error) => {
  devStderr += `\n[spawn error] ${error.message}`;
});

try {
  const devResponse = await waitForDevServer(`http://127.0.0.1:${devPort}/`, 8000);
  for (const [headerName, expectedValue] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(
      devResponse.headers.get(headerName),
      expectedValue,
      `scripts/dev.mjs ไม่ได้ส่ง header "${headerName}: ${expectedValue}" ตามที่กำหนดใน scripts/security-headers.mjs — dev กับ production ต้องส่ง Security Header ชุดเดียวกันเสมอ` +
        (devStderr ? `\n[dev.mjs stderr]\n${devStderr}` : "")
    );
  }
  console.log(`Dev server headers passed: ${Object.keys(SECURITY_HEADERS).length} security headers ตรงกับ scripts/security-headers.mjs`);

  // ป้องกันการย้อนกลับของ /api/analyze ฝั่ง dev เช่นเดียวกับฝั่ง production ข้างบน
  const devAnalyzeResponse = await fetch(`http://127.0.0.1:${devPort}/api/analyze`, {
    method: "POST",
    body: "{}"
  });
  assert.ok(
    [404, 405].includes(devAnalyzeResponse.status),
    `scripts/dev.mjs ต้องตอบ 404 หรือ 405 ต่อ POST /api/analyze (เส้นทาง server-side AI ถูกลบแล้วตาม ADR-001 ข้อ 4.3) แต่ตอบ ${devAnalyzeResponse.status}` +
      (devStderr ? `\n[dev.mjs stderr]\n${devStderr}` : "")
  );
  console.log(`Dev server POST /api/analyze passed: ตอบ ${devAnalyzeResponse.status} ตามที่คาดไว้`);
} finally {
  await shutdownDevProcess(devProcess);
}

console.log("Security header parity passed: dev.mjs และ dist/server/index.js ส่ง Security Header ชุดเดียวกัน");
