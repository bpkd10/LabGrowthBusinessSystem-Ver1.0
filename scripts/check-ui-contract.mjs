import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "app/index.html"), "utf8");
const appJs = await readFile(resolve(root, "app/app.js"), "utf8");
const css = await readFile(resolve(root, "app/styles.css"), "utf8");

const requiredHtmlContracts = [
  "businessChangeSummary",
  "ownerCommandGrid",
  "dashboardSecondary",
  "crmBulkToolbar",
  "bulkLeadStage",
  "customerAdvancedFields",
  "customerPackageHint",
  "analysisQuickQuestions",
  "analysisFreshness",
  "analysisMetricsSummary",
  "toastUndo",
  "toastDismiss"
];

for (const id of requiredHtmlContracts) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `HTML contract #${id} ยังไม่มี`);
}

for (const functionName of ["registerUndo", "setLeadStatus", "analysisEvidenceMarkup", "validIsoDate", "resetCustomerFormDefaults"]) {
  assert.match(appJs, new RegExp(`function\\s+${functionName}\\s*\\(`), `JavaScript contract ${functionName}() ยังไม่มี`);
}

assert.match(appJs, /data-lead-status/, "CRM ยังไม่มี Stage Select ที่เปลี่ยนย้อนกลับได้");
assert.match(appJs, /data-lead-select/, "CRM ยังไม่มี Checkbox สำหรับ Bulk Action");
assert.match(appJs, /data-analysis-question/, "AI ยังไม่มี Quick Question");
assert.match(appJs, /analysisInFlight/, "AI ยังไม่มี guard ป้องกันการส่ง API ซ้ำ");
assert.match(appJs, /persistedStateSnapshot/, "การบันทึกยังไม่มี snapshot สำหรับ rollback เมื่อ localStorage เต็ม");
assert.match(appJs, /aria-current/, "เมนู SPA ยังไม่ประกาศหน้าปัจจุบันให้ Screen Reader");
assert.doesNotMatch(appJs, /^\s*saveState\(\);/m, "พบการบันทึกที่ไม่ตรวจผลสำเร็จ อาจแจ้งข้อมูลสำเร็จทั้งที่ localStorage เต็ม");
assert.match(html, /id=["']viewTitle["'][^>]*tabindex=["']-1["']/, "หัวข้อหน้าไม่สามารถรับ focus หลังเปลี่ยนหน้า");
assert.match(html, /id=["']businessViewSwitch["'][^>]*role=["']group["']/, "ตัวเลือกรูปแบบธุรกิจยังไม่มี semantic group");
assert.match(html, /class=["']role-switch["'][^>]*role=["']group["']/, "ตัวเลือกมุมมองตามหน้าที่ยังไม่มี semantic group");
assert.match(html, /id=["']toast["'][^>]*hidden/, "Toast ที่ยังไม่แสดงต้องออกจาก Tab order");
assert.match(appJs, /const\s+evidenceMarkup\s*=\s*analysisEvidenceMarkup\(\)/, "ผล AI ยังไม่ได้ล็อก Evidence Snapshot ให้ตรงกับ Request");
assert.match(css, /summary:focus-visible/, "Summary control ยังไม่มี visible keyboard focus");
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/, "Reduced Motion ยังไม่ปิด animation ของการเปลี่ยนหน้า");
assert.doesNotMatch(css, /transition:\s*width\b/, "ยังพบ transition: width ซึ่งทำให้ layout animation ไม่ลื่น");
assert.doesNotMatch(css, /border-left:\s*[2-9]px\s+solid\s+var\(--accent\)/, "ยังพบ Side-stripe Accent Pattern");

console.log(`UI contract passed: ${requiredHtmlContracts.length} DOM contracts and reversible workflows are present`);
