// แหล่งความจริงเดียวของ Security Header ที่ต้องเหมือนกันทั้ง Dev Server (scripts/dev.mjs)
// และ Production Worker ที่ build ออกมา (scripts/build.mjs)
//
// เหตุผลที่แยกไฟล์นี้ออกมา: ก่อนหน้านี้ scripts/build.mjs hardcode header พวกนี้ไว้ใน
// template literal ส่วน scripts/dev.mjs ไม่ส่งเลย ทำให้โค้ดที่ผ่าน `npm run dev` และ
// `npm run check` ทุกตัวสามารถพังเฉพาะตอนขึ้น Production เท่านั้น (เช่นถ้ามีคนเผลอเติม
// inline <script> ใน app/index.html) การรวมมาไว้ที่เดียวแล้วให้ทั้งสองฝั่ง import ทำให้
// ความไม่ตรงกันแบบนี้เกิดขึ้นไม่ได้เชิงโครงสร้าง
//
// AI_CONNECT_HOSTS คือรายชื่อ host ที่ browser ได้รับอนุญาตให้ยิง request ออกไป
// นอกจาก origin ตัวเอง (ADR-001 ข้อ 6.3 / ระยะ 1 งาน #4)
//
// ห้ามใช้ wildcard ในบรรทัด connect-src เด็ดขาด ภายใต้ BYOK ผู้ใช้เก็บ API key ของ
// ตัวเองไว้ในเบราว์เซอร์ และบรรทัดนี้คือด่านสุดท้ายที่กันไม่ให้โค้ดแปลกปลอมบนหน้านี้
// POST key ออกไปยัง host ของผู้โจมตี — ระบุ host ทีละตัวเสมอ
//
// การเพิ่มผู้ให้บริการรายใหม่ใน app/ai-provider.js ต้องเพิ่ม host ที่นี่ด้วย
// มิฉะนั้น fetch จะถูก CSP บล็อกและได้ TypeError ที่ไม่บอกสาเหตุ
export const AI_CONNECT_HOSTS = Object.freeze(["https://api.openai.com"]);

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  `connect-src 'self' ${AI_CONNECT_HOSTS.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join("; ");

// SECURITY_HEADERS คือ header "ด้านความปลอดภัย" เท่านั้น ไม่รวม cache-control
// เพราะ dev กับ production ตั้งใจให้ cache-control ต่างกัน (dev ใช้ no-store เสมอ
// เพื่อกันปัญหาไฟล์ค้าง cache ระหว่างพัฒนา, production ใช้ cache ตามชนิดไฟล์)
export const SECURITY_HEADERS = Object.freeze({
  "content-security-policy": CONTENT_SECURITY_POLICY,
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff"
});
