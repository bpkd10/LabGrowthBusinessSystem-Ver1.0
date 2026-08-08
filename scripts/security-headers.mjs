// แหล่งความจริงเดียวของ Security Header ที่ต้องเหมือนกันทั้ง Dev Server (scripts/dev.mjs)
// และ Production Worker ที่ build ออกมา (scripts/build.mjs)
//
// เหตุผลที่แยกไฟล์นี้ออกมา: ก่อนหน้านี้ scripts/build.mjs hardcode header พวกนี้ไว้ใน
// template literal ส่วน scripts/dev.mjs ไม่ส่งเลย ทำให้โค้ดที่ผ่าน `npm run dev` และ
// `npm run check` ทุกตัวสามารถพังเฉพาะตอนขึ้น Production เท่านั้น (เช่นถ้ามีคนเผลอเติม
// inline <script> ใน app/index.html) การรวมมาไว้ที่เดียวแล้วให้ทั้งสองฝั่ง import ทำให้
// ความไม่ตรงกันแบบนี้เกิดขึ้นไม่ได้เชิงโครงสร้าง
//
// หมายเหตุ (ระยะ 0 ของ ADR-001): ยังไม่เพิ่ม connect-src ใน CSP ที่นี่โดยตั้งใจ
// เพราะ connect-src ผูกกับงาน BYOK ในระยะ 1 (ข้อ #4) ซึ่งเป็นงานของ Engineer อีกคน
// ค่าด้านล่างนี้คือค่าที่ Production ส่งอยู่แล้ววันนี้ ยกมาโดยไม่เปลี่ยนแปลง

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
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
