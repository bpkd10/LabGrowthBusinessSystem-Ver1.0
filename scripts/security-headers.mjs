// แหล่งความจริงเดียวของ Security Header ที่ต้องเหมือนกันทั้ง Dev Server (scripts/dev.mjs)
// และ Production Worker ที่ build ออกมา (scripts/build.mjs)
//
// เหตุผลที่แยกไฟล์นี้ออกมา: ก่อนหน้านี้ scripts/build.mjs hardcode header พวกนี้ไว้ใน
// template literal ส่วน scripts/dev.mjs ไม่ส่งเลย ทำให้โค้ดที่ผ่าน `npm run dev` และ
// `npm run check` ทุกตัวสามารถพังเฉพาะตอนขึ้น Production เท่านั้น (เช่นถ้ามีคนเผลอเติม
// inline <script> ใน app/index.html) การรวมมาไว้ที่เดียวแล้วให้ทั้งสองฝั่ง import ทำให้
// ความไม่ตรงกันแบบนี้เกิดขึ้นไม่ได้เชิงโครงสร้าง
//
// connect-src เหลือ 'self' อย่างเดียวตั้งแต่เปลี่ยนมาใช้ตัวส่งต่อ (scripts/ai-relay.mjs)
// เบราว์เซอร์ยิงไปที่ path ของเราเองเท่านั้น ไม่ได้ยิงออกไป host ภายนอกอีกแล้ว
//
// ห้ามเติม host ภายนอกหรือ wildcard กลับเข้ามาในบรรทัด connect-src เด็ดขาด
// ภายใต้ BYOK ผู้ใช้เก็บ API key ของตัวเองไว้ในเบราว์เซอร์ และบรรทัดนี้คือด่านสุดท้าย
// ที่กันไม่ให้โค้ดแปลกปลอมบนหน้านี้ POST key ออกไปยัง host ของผู้โจมตี
// ตอนนี้แคบที่สุดเท่าที่จะเป็นไปได้แล้ว ทุกการเพิ่ม host คือการถอยหลัง
//
// การเพิ่มผู้ให้บริการรายใหม่ให้เพิ่มปลายทางใน scripts/ai-relay.mjs ฝั่ง server
// ไม่ใช่เปิด connect-src ให้เบราว์เซอร์ยิงตรง
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
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
