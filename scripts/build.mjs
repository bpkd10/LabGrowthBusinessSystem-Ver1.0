import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BUSINESS_ANALYSIS_INSTRUCTIONS } from "./ai-analysis.mjs";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist/server/index.js");

const files = {
  "/": ["app/index.html", "text/html; charset=utf-8"],
  "/index.html": ["app/index.html", "text/html; charset=utf-8"],
  "/app.js": ["app/app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["app/styles.css", "text/css; charset=utf-8"],
  "/icons.svg": ["app/icons.svg", "image/svg+xml"],
  "/brand/logo-wordmark.svg": ["logo.svg/logo-wordmark.svg", "image/svg+xml"],
  "/brand/logo-wordmark-dark.svg": ["logo.svg/logo-wordmark-dark.svg", "image/svg+xml"],
  "/brand/logo-wordmark-light.svg": ["logo.svg/logo-wordmark-light.svg", "image/svg+xml"],
  "/brand/icon-favicon.svg": ["logo.svg/icon-favicon.svg", "image/svg+xml"]
};

const assets = {};
for (const [pathname, [file, contentType]] of Object.entries(files)) {
  assets[pathname] = {
    body: await readFile(resolve(root, file), "utf8"),
    contentType
  };
}

const worker = `const assets = ${JSON.stringify(assets)};
const analysisInstructions = ${JSON.stringify(BUSINESS_ANALYSIS_INSTRUCTIONS)};

function extractResponseText(response) {
  return response.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\\n")
    .trim() || "";
}

async function analyzeBusiness(request, env) {
  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: "ยังไม่ได้ตั้งค่า OPENAI_API_KEY ที่ server" }, { status: 503 });
  }
  const payload = await request.json();
  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: "Bearer " + env.OPENAI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-sol",
      reasoning: { effort: "low" },
      text: { verbosity: "medium" },
      max_output_tokens: 1800,
      instructions: analysisInstructions,
      input: "หัวข้อที่ผู้ใช้เลือก: " + (payload.focus || "growth") + "\\nข้อมูลจากระบบ:\\n" + JSON.stringify(payload)
    })
  });
  const data = await upstream.json();
  if (!upstream.ok) {
    const message = upstream.status === 429
      ? "บัญชี API ถึงขีดจำกัดการใช้งาน กรุณาตรวจสอบเครดิตหรือ Usage limit"
      : upstream.status === 401
        ? "API key ใช้งานไม่ได้ กรุณาสร้าง key ใหม่หรือตรวจสอบ Project"
        : "OpenAI API ยังประมวลผลไม่สำเร็จ กรุณาลองใหม่";
    return Response.json({ error: message }, { status: upstream.status });
  }
  const analysis = extractResponseText(data);
  if (!analysis) return Response.json({ error: "AI ไม่ได้ส่งผลวิเคราะห์กลับมา กรุณาลองใหม่" }, { status: 502 });
  return Response.json({ analysis, model: data.model || "gpt-5.6-sol" }, { headers: { "cache-control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        return await analyzeBusiness(request, env);
      } catch {
        return Response.json({ error: "ข้อมูลที่ส่งมาวิเคราะห์ไม่ถูกต้อง" }, { status: 400 });
      }
    }
    const asset = assets[url.pathname];
    if (!asset) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }

    const cacheControl = url.pathname === "/" || url.pathname === "/index.html"
      ? "no-cache"
      : "public, max-age=3600";

    return new Response(request.method === "HEAD" ? null : asset.body, {
      headers: {
        "content-type": asset.contentType,
        "cache-control": cacheControl,
        "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-content-type-options": "nosniff"
      }
    });
  }
};
`;

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(resolve(root, "dist/server"), { recursive: true });
await writeFile(output, worker);
console.log(`Built ${Object.keys(assets).length} routes to dist/server/index.js`);
