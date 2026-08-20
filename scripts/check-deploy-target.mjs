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

const declaredHosts = [...new Set([
  ...activeConfig.matchAll(/(?:pattern|route|custom_domain)\s*=\s*["']([^"']+)["']/g),
  ...activeConfig.matchAll(/routes\s*=\s*\[([^\]]*)\]/g)
].flatMap((match) => [...match[1].matchAll(/["']?([A-Za-z0-9.*-]+\.[A-Za-z]{2,})[^"',]*["']?/g)].map((host) => host[1])))];

for (const host of declaredHosts) {
  const bare = host.replace(/^\*\./, "").replace(/\/.*$/, "").toLowerCase();
  assert.ok(
    !PROTECTED_HOSTS.includes(bare),
    `wrangler.toml ประกาศ route ครอบ ${bare} ซึ่งเป็นเว็บธุรกิจจริงที่ให้บริการอยู่ ` +
    `การ deploy จะดัก traffic ของเว็บนั้นทั้งหมด ให้ใช้ subdomain ที่ยังว่างแทน ` +
    `(ตรวจก่อนด้วย \`dig +short <ชื่อ>.uncletungai.site\`)`
  );
  // wildcard ที่ครอบ apex ก็ครอบเว็บหลักด้วย
  assert.ok(
    !host.startsWith("*.") || !PROTECTED_HOSTS.includes(bare) ,
    `wrangler.toml ใช้ wildcard ${host} ที่ครอบเว็บธุรกิจจริง`
  );
}

// ชื่อโดเมนทางการต้องมีชื่อเดียวเท่านั้น
//
// เหตุผลไม่ใช่ความสวยงามของ URL แต่เป็นเรื่องข้อมูลผู้ใช้หาย: แอปเก็บข้อมูลไว้ใน
// localStorage ซึ่ง browser ผูกไว้กับ "ชื่อโดเมน" ไม่ใช่กับเครื่อง ถ้าผูกสองชื่อให้เสิร์ฟ
// ไฟล์ชุดเดียวกัน จะกลายเป็นคลังข้อมูลสองใบที่มองไม่เห็นกัน คนที่กรอกงานไว้ที่ชื่อหนึ่ง
// แล้ววันหนึ่งเปิดอีกชื่อจะเจอแอปเปล่าและเข้าใจว่าข้อมูลหาย โดยไม่มีอะไรบนหน้าจออธิบายให้
// เกิดขึ้นจริงมาแล้วกับ crm.uncletungai.site (ถอดออก 2026-08-20, ADR-001 ภาคผนวก ง)
//
// ถ้าวันหนึ่งต้องย้ายชื่อโดเมน ให้ชื่อเก่าตอบ 301 ไปชื่อใหม่ อย่าเสิร์ฟไฟล์ซ้ำสองที่
const customDomains = [...activeConfig.matchAll(/pattern\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]);
assert.ok(
  customDomains.length <= 1,
  `wrangler.toml ผูกโดเมนไว้ ${customDomains.length} ชื่อ (${customDomains.join(", ")}) ` +
  `แต่ระบบนี้ต้องมีชื่อทางการชื่อเดียว ไม่งั้นข้อมูลผู้ใช้จะแยกเป็นคนละคลังตามชื่อโดเมน ` +
  `โดยที่ผู้ใช้ไม่รู้ตัว ถ้าต้องการชื่อสำรองให้ทำเป็น 301 redirect แทนการเสิร์ฟไฟล์ซ้ำ`
);

// URL แถม *.workers.dev ต้องปิด ด้วยเหตุผลเดียวกับข้อบน
//
// การนับ pattern อย่างเดียวยังไม่พอ เพราะ workers_dev เปิดประตูเพิ่มอีกสองบานโดยไม่ต้อง
// แตะ routes เลย (Production กับ Preview) และค่า default ของ Cloudflare คือ "เปิด"
// การลบบรรทัดนี้ทิ้งจึงไม่ใช่การปิด แต่เป็นการเปิดแบบเงียบ ๆ — ต้องประกาศ false ตรง ๆ
assert.match(
  activeConfig,
  /workers_dev\s*=\s*false/,
  "wrangler.toml ต้องประกาศ workers_dev = false ตรง ๆ ไม่งั้น Cloudflare จะเปิด URL " +
  "*.workers.dev ให้เองสองตัว (Production + Preview) ซึ่งเสิร์ฟแอปเดียวกันคนละ origin " +
  "และกลายเป็นคลังข้อมูลผู้ใช้แยกใบโดยที่ผู้ใช้ไม่รู้ตัว (ADR-001 ภาคผนวก ง.1)"
);

// ไม่มี secret หรือ env binding ในไฟล์ config ตามการตัดสินใจใน ADR-001
assert.doesNotMatch(activeConfig, /OPENAI_API_KEY|api_key|secret/i, "wrangler.toml ต้องไม่มี secret ใด ๆ (ADR-001 ข้อ 5.2)");

const target = declaredHosts.length ? declaredHosts.join(", ") : "*.workers.dev (ไม่มี custom route)";
console.log(`Deploy target passed: ปลายทางคือ ${target} — ไม่ทับ ${PROTECTED_HOSTS.join(" หรือ ")}`);
