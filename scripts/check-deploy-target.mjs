// กันการ deploy ทับเว็บหลักของเจ้าของระบบ
//
// uncletungai.site และ www.uncletungai.site คือเว็บธุรกิจจริงที่ให้บริการอยู่บน Netlify
// (A record ชี้ไป 75.2.60.5 ของ Netlify, www CNAME ไป uncle-tung-business-growth-dashboard.netlify.app)
// ถ้ามีใครเพิ่ม route ของ Worker ตัวนี้ให้ครอบโดเมนนั้น traffic ของเว็บธุรกิจจะถูก
// Worker ดักไปทั้งหมดทันทีที่ deploy และหน้าเว็บจริงจะหายไปจากสายตาลูกค้า
//
// ระบบนี้ต้องอยู่บน subdomain ที่ยังไม่มีใครใช้ หรือบน *.workers.dev เท่านั้น

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const config = await readFile(resolve(root, "wrangler.toml"), "utf8");

// โดเมนที่ห้ามแตะเด็ดขาด เทียบแบบตรงตัวและแบบมี path ต่อท้าย
const PROTECTED_HOSTS = ["uncletungai.site", "www.uncletungai.site"];

// ตัดบรรทัด comment ออกก่อน ไม่งั้นคำอธิบายที่พูดถึงโดเมนจะถูกนับเป็น config
const activeConfig = config
  .split("\n")
  .filter((line) => !line.trim().startsWith("#"))
  .join("\n");

const declaredHosts = [
  ...activeConfig.matchAll(/(?:pattern|route|custom_domain)\s*=\s*["']([^"']+)["']/g),
  ...activeConfig.matchAll(/routes\s*=\s*\[([^\]]*)\]/g)
].flatMap((match) => [...match[1].matchAll(/["']?([A-Za-z0-9.*-]+\.[A-Za-z]{2,})[^"',]*["']?/g)].map((host) => host[1]));

for (const host of declaredHosts) {
  const bare = host.replace(/^\*\./, "").replace(/\/.*$/, "").toLowerCase();
  assert.ok(
    !PROTECTED_HOSTS.includes(bare),
    `wrangler.toml ประกาศ route ครอบ ${bare} ซึ่งเป็นเว็บธุรกิจจริงที่ให้บริการอยู่ ` +
    `การ deploy จะดัก traffic ของเว็บนั้นทั้งหมด ให้ใช้ subdomain ที่ยังว่างแทน เช่น crm.uncletungai.site`
  );
  // wildcard ที่ครอบ apex ก็ครอบเว็บหลักด้วย
  assert.ok(
    !host.startsWith("*.") || !PROTECTED_HOSTS.includes(bare) ,
    `wrangler.toml ใช้ wildcard ${host} ที่ครอบเว็บธุรกิจจริง`
  );
}

// ไม่มี secret หรือ env binding ในไฟล์ config ตามการตัดสินใจใน ADR-001
assert.doesNotMatch(activeConfig, /OPENAI_API_KEY|api_key|secret/i, "wrangler.toml ต้องไม่มี secret ใด ๆ (ADR-001 ข้อ 5.2)");

const target = declaredHosts.length ? declaredHosts.join(", ") : "*.workers.dev (ไม่มี custom route)";
console.log(`Deploy target passed: ปลายทางคือ ${target} — ไม่ทับ ${PROTECTED_HOSTS.join(" หรือ ")}`);
