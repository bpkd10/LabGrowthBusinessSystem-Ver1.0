// ตรวจว่าระบบแยกสาเหตุของ error ได้ตรงกับวิธีแก้จริง
//
// ที่ต้องมีไฟล์นี้: 429 เคยถูกแปลเป็นข้อความเดียวว่า "ถึงขีดจำกัดหรือเครดิตหมด
// ... หรือรอสักครู่แล้วส่งใหม่" ทั้งที่ 429 มีสามสาเหตุที่แก้คนละแบบสิ้นเชิง
// ผู้ใช้ที่เครดิตหมดจริงได้คำแนะนำให้ "รอ" ซึ่งรอไปกี่ชั่วโมงก็ไม่มีวันสำเร็จ
//
// error message ที่แนะนำผิดทางอันตรายกว่าไม่มีข้อความเลย เพราะผู้ใช้จะเชื่อ
// แล้วเสียเวลาไล่แก้จุดที่ไม่ใช่ปัญหา โดยไม่มีอะไรบอกว่ากำลังไปผิดทาง

import assert from "node:assert/strict";
import { errorCodeForStatus, providerErrorMessage, scrubSecrets } from "../app/ai-provider.js";

let passed = 0;
function check(label, run) {
  run();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

console.log("การแยกสาเหตุของ HTTP 429:");

check("เครดิตหมดต้องแยกออกจากยิงถี่เกิน", () => {
  assert.equal(errorCodeForStatus(429, "insufficient_quota", true), "insufficient_quota");
  assert.equal(errorCodeForStatus(429, "rate_limit_exceeded", true), "rate_limited");
  assert.notEqual(
    providerErrorMessage("insufficient_quota", {}),
    providerErrorMessage("rate_limited", {}),
    "สองสาเหตุนี้แก้คนละแบบ ข้อความจึงต้องต่างกัน"
  );
});

check("เครดิตหมดต้องไม่บอกให้ผู้ใช้รอ เพราะรอแล้วไม่หาย", () => {
  const message = providerErrorMessage("insufficient_quota", { consoleLabel: "OpenAI" });
  assert.match(message, /เติมเ(งิน|ครดิต)/, "ต้องบอกวิธีแก้จริงคือเติมเครดิต");
  assert.match(message, /ไม่ทำให้หายเอง|ไม่มีวัน|รอ.*ไม่/, "ต้องบอกชัดว่าการรอไม่ช่วย");
});

check("ยิงถี่เกินต้องบอกว่าไม่ใช่ปัญหาเรื่องเงิน", () => {
  const message = providerErrorMessage("rate_limited", {});
  assert.match(message, /ไม่มีปัญหา|ไม่ใช่/, "ต้องบอกว่า key และเครดิตไม่ใช่ปัญหา");
  assert.doesNotMatch(message, /เติมเงิน|เครดิตหมด/, "ห้ามบอกให้เติมเงินทั้งที่เครดิตยังมี");
});

check("429 ที่ไม่มี error ของผู้ให้บริการ = ถูกบล็อกก่อนถึงปลายทาง", () => {
  // Cloudflare Rate Limiting ก็ตอบ 429 เหมือนกัน แต่ body ไม่ใช่ JSON ของ OpenAI
  // กรณีนี้ปัญหาอยู่ที่ระบบเรา การบอกให้ผู้ใช้ไปเติมเงินคือการโยนความผิดให้เขา
  assert.equal(errorCodeForStatus(429, "", false), "edge_rate_limited");
  const message = providerErrorMessage("edge_rate_limited", {});
  assert.match(message, /ระบบของเรา/, "ต้องบอกว่าเป็นปัญหาฝั่งระบบ");
  // ตรวจ "คำสั่งให้ไปแก้บัญชี" ไม่ใช่แค่คำว่าเครดิต เพราะข้อความบอกว่า
  // "ไม่ใช่ปัญหาของ key หรือเครดิตของคุณ" ซึ่งมีคำว่าเครดิตแต่เป็นการปฏิเสธ
  assert.doesNotMatch(message, /กรุณา.{0,40}(เติมเครดิต|เติมเงิน|สร้าง key ใหม่)/, "ห้ามสั่งให้ผู้ใช้ไปแก้บัญชีทั้งที่ปัญหาอยู่ฝั่งระบบ");
});

console.log("\nการแยกสาเหตุอื่นต้องไม่ถูกกระทบ:");

check("รหัสสถานะอื่นยังแปลเหมือนเดิม", () => {
  assert.equal(errorCodeForStatus(401, "invalid_api_key", true), "unauthorized");
  assert.equal(errorCodeForStatus(404, "", true), "model_not_found");
  assert.equal(errorCodeForStatus(413, "", true), "request_too_large");
  assert.equal(errorCodeForStatus(500, "", true), "provider_error");
  assert.equal(errorCodeForStatus(400, "", true), "bad_request");
});

check("model_not_found ชนะรหัสสถานะเสมอ ไม่ว่ามาด้วยสถานะใด", () => {
  assert.equal(errorCodeForStatus(429, "model_not_found", true), "model_not_found");
  assert.equal(errorCodeForStatus(400, "model_not_available", true), "model_not_found");
});

check("ทุกข้อความบอกว่าต้องทำอะไรต่อ ไม่ใช่แค่บอกว่าพัง", () => {
  for (const code of ["unauthorized", "insufficient_quota", "rate_limited", "edge_rate_limited", "model_not_found", "network", "empty_analysis"]) {
    const message = providerErrorMessage(code, {});
    assert.ok(message.length > 40, `ข้อความ ${code} สั้นเกินกว่าจะบอกวิธีแก้ได้`);
    assert.match(message, /กรุณา|ให้|ต้อง/, `ข้อความ ${code} ไม่ได้บอกว่าผู้ใช้ต้องทำอะไรต่อ`);
  }
});

console.log("\nการปิดบังความลับก่อนแสดงผล:");

check("ข้อความจากผู้ให้บริการต้องถูกล้าง key ออกก่อนแสดง", () => {
  const raw = "Incorrect API key provided: sk-proj-AbCdEf1234567890XyZ. You can find your API key at ...";
  const clean = scrubSecrets(raw);
  assert.ok(!clean.includes("sk-proj-AbCdEf1234567890XyZ"), "key หลุดออกมาบนหน้าจอ");
  assert.match(clean, /sk-\*\*\*/);
  assert.match(clean, /You can find your API key/, "ต้องเหลือเนื้อความที่ช่วยแก้ปัญหาไว้");
});

check("scrubSecrets ไม่พังกับค่าว่างหรือ null", () => {
  assert.equal(scrubSecrets(""), "");
  assert.equal(scrubSecrets(null), "");
  assert.equal(scrubSecrets(undefined), "");
});

console.log(`\nAI error mapping passed: ${passed} assertions`);
