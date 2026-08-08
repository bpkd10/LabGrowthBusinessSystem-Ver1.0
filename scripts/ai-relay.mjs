// ตัวส่งต่อคำขอ AI (ADR-001 ภาคผนวก ก)
//
// ทำไมต้องมี: เดิมออกแบบให้เบราว์เซอร์ยิงไป api.openai.com ตรง ๆ แต่ทดสอบจริงแล้ว
// OpenAI ตอบ preflight ด้วย access-control-allow-origin: * ก็จริง แต่ response ของ
// คำขอจริงไม่มี header นั้น เบราว์เซอร์จึงบล็อกและ JavaScript อ่านคำตอบไม่ได้เลย
// ทางออกคือให้ Worker ของเราเป็นตัวส่งต่อ เพราะคำขอจากเบราว์เซอร์เป็น same-origin
// จึงไม่ติด CORS ส่วนขา Worker → OpenAI เป็น server-to-server ซึ่งไม่มี CORS ตั้งแต่ต้น
//
// หลักการที่ห้ามละเมิด:
// 1. Worker ตัวนี้ต้องไม่มี API key ของตัวเองเด็ดขาด key มาจาก header ของผู้ใช้
//    เท่านั้น ไม่มี key มา = ตอบ 401 ทันที ห้าม fallback ไปใช้ key ของเจ้าของระบบ
//    ไม่งั้นจะกลับไปเป็น proxy สาธารณะที่ใครก็เผาเครดิตเจ้าของได้ (ข้อบกพร่อง b เดิม)
// 2. key ผ่าน Worker แค่ระหว่างส่งต่อ ห้ามเก็บ ห้าม log ห้ามใส่ใน error message
// 3. ปลายทางถูก hardcode ไว้ ผู้ใช้กำหนดเองไม่ได้ ไม่งั้นจะกลายเป็น open proxy
//    ที่ยิงไปที่ไหนก็ได้ (SSRF)
// 4. จำกัดขนาด body เสมอ (ข้อบกพร่อง a เดิม)
//
// ไฟล์นี้ต้องไม่มี import ใด ๆ เพราะ scripts/build.mjs เอาซอร์สไปแปะตรง ๆ ใน
// Worker bundle และใช้เฉพาะ Web API ที่มีทั้งใน Cloudflare Workers และ Node 22

export const AI_RELAY_PATH = "/api/ai-relay";

// ปลายทางเดียวที่อนุญาต — ผู้ใช้กำหนดเองไม่ได้โดยเจตนา
export const AI_UPSTREAM_ENDPOINT = "https://api.openai.com/v1/responses";

// 128 KB พอสำหรับ payload ธุรกิจที่ใหญ่ที่สุดที่แอปสร้าง (ลูกค้าหลักพันราย)
// แต่เล็กพอที่จะไม่ให้ใครใช้ Worker นี้ยิงข้อมูลก้อนใหญ่ผ่านบัญชี Cloudflare ของเจ้าของ
export const AI_MAX_REQUEST_BYTES = 128 * 1024;

function jsonError(status, code, message) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

/**
 * รับคำขอจากเบราว์เซอร์ ส่งต่อไปผู้ให้บริการด้วย key ที่ผู้ใช้แนบมา แล้วคืนคำตอบตามเดิม
 * คืนค่า null ถ้าคำขอไม่ใช่ของเส้นทางนี้ เพื่อให้ผู้เรียกไปจัดการต่อเอง
 */
export async function handleAiRelay(request, url) {
  if (url.pathname !== AI_RELAY_PATH) return null;

  if (request.method !== "POST") {
    return jsonError(405, "method_not_allowed", "เส้นทางนี้รับเฉพาะ POST");
  }

  // key ต้องมาจากผู้ใช้เท่านั้น ไม่มี = จบตรงนี้ ไม่ส่งต่อ ไม่มี fallback
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/.test(authorization)) {
    return jsonError(401, "missing_key", "คำขอนี้ไม่มี API key ของผู้ใช้แนบมา");
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > AI_MAX_REQUEST_BYTES) {
    return jsonError(413, "request_too_large", "ข้อมูลที่ส่งมายาวเกินขีดจำกัดของระบบ");
  }

  // อ่านเป็นข้อความแล้ววัดขนาดจริงอีกชั้น เพราะ content-length ปลอมได้
  const body = await request.text();
  if (new TextEncoder().encode(body).length > AI_MAX_REQUEST_BYTES) {
    return jsonError(413, "request_too_large", "ข้อมูลที่ส่งมายาวเกินขีดจำกัดของระบบ");
  }

  let upstream;
  try {
    upstream = await fetch(AI_UPSTREAM_ENDPOINT, {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json"
      },
      body
    });
  } catch {
    // ห้ามแนบ error ต้นทางกลับไป เพราะข้อความอาจมี URL หรือ header ติดไปด้วย
    return jsonError(502, "provider_unreachable", "ติดต่อผู้ให้บริการ AI ไม่สำเร็จ");
  }

  // ส่งคำตอบกลับตามเดิมทั้ง status และเนื้อหา เพื่อให้ฝั่ง browser แปล error code
  // ของผู้ให้บริการได้เหมือนตอนเรียกตรง ไม่ต้องมีตรรกะแปล error สองชุด
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8" }
  });
}
