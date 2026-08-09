import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "app/index.html"), "utf8");
const appJs = await readFile(resolve(root, "app/app.js"), "utf8");
const css = await readFile(resolve(root, "app/styles.css"), "utf8");
const businessConfigJs = await readFile(resolve(root, "app/business-config.js"), "utf8");
const aiProviderJs = await readFile(resolve(root, "app/ai-provider.js"), "utf8");
const aiRelayJs = await readFile(resolve(root, "scripts/ai-relay.mjs"), "utf8");

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
  "toastDismiss",
  "resetDialog",
  "resetStepCard",
  "resetBack",
  "resetNext",
  "resetExport",
  "resetConfirm",
  "resetProgress",
  "productBusinessMode",
  "productPipelineStage",
  "dealProductSelect"
  ,"importDialog"
  ,"importCollection"
  ,"importPreview"
  ,"importConfirm"
  ,"productBusinessCategory"
  ,"productDescription"
  ,"aiKeyForm"
  ,"aiKeyInput"
  ,"aiKeyReveal"
  ,"aiKeyRemember"
  ,"aiKeySave"
  ,"aiKeyClear"
  ,"aiKeyStatus"
  ,"aiKeyWarning"
  ,"aiModelInput"
];

for (const id of requiredHtmlContracts) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `HTML contract #${id} ยังไม่มี`);
}

for (const functionName of ["registerUndo", "setLeadStatus", "analysisEvidenceMarkup", "resetCustomerFormDefaults", "setResetStep"]) {
  assert.match(appJs, new RegExp(`function\\s+${functionName}\\s*\\(`), `JavaScript contract ${functionName}() ยังไม่มี`);
}
// validIsoDate ย้ายไป state-model.js แล้ว และตอนนี้มีการทดสอบพฤติกรรมจริงใน
// scripts/check-app-model.mjs — ที่นี่เหลือแค่ตรวจว่า app.js ยัง import มาใช้อยู่
assert.match(appJs, /\bvalidIsoDate\b/, "app.js ไม่ได้ใช้ validIsoDate แล้ว วันที่จาก Import อาจเข้าระบบโดยไม่ผ่านการตรวจ");

assert.match(html, /accept=["'][^"']*\.csv[^"']*\.xlsx[^"']*\.docx[^"']*["']/, "ตัวเลือกไฟล์ยังไม่ประกาศ format ที่รองรับ");
assert.match(appJs, /parseImportFile/, "Import UI ยังไม่ได้เรียก File Parser กลาง");
assert.match(appJs, /buildImportPlan/, "Import UI ยังไม่ได้วิเคราะห์และ Mapping ข้อมูลก่อนบันทึก");
assert.match(appJs, /applyImportPlan/, "Import UI ยังไม่ได้บันทึกแผน Import เข้าระบบ");

assert.match(appJs, /data-lead-status/, "CRM ยังไม่มี Stage Select ที่เปลี่ยนย้อนกลับได้");
assert.match(appJs, /data-lead-select/, "CRM ยังไม่มี Checkbox สำหรับ Bulk Action");
assert.match(appJs, /data-analysis-question/, "AI ยังไม่มี Quick Question");
assert.match(appJs, /analysisInFlight/, "AI ยังไม่มี guard ป้องกันการส่ง API ซ้ำ");
assert.match(appJs, /persistedStateSnapshot/, "การบันทึกยังไม่มี snapshot สำหรับ rollback เมื่อ localStorage เต็ม");
assert.match(appJs, /aria-current/, "เมนู SPA ยังไม่ประกาศหน้าปัจจุบันให้ Screen Reader");
assert.doesNotMatch(appJs, /^\s*saveState\(\);/m, "พบการบันทึกที่ไม่ตรวจผลสำเร็จ อาจแจ้งข้อมูลสำเร็จทั้งที่ localStorage เต็ม");
assert.doesNotMatch(appJs, /#resetDemo[\s\S]{0,180}window\.confirm/, "Set Zero ยังใช้ confirm ชั้นเดียวแทนคำเตือน 3 ขั้น");
assert.match(appJs, /createZeroState\(\)/, "Set Zero ยังไม่ได้ล้างข้อมูลจริงทุก collection");
assert.doesNotMatch(appJs, /resetStep\s*===\s*2\s*&&\s*!resetExported/, "Set Zero ขั้น 2 ยังบังคับส่งออกข้อมูลก่อนกดถัดไป");
assert.match(appJs, /solutionPackageId/, "Customer ยังเชื่อม Offer ด้วยชื่อแทน ID ถาวร");
assert.match(appJs, /productId/, "Deal ยังไม่เชื่อมกับ Offer ใน Business Pipeline");
const customerSubmitBlock = appJs.match(/#customerForm"\)\.addEventListener\("submit",\s*async[\s\S]*?\n}\);/)?.[0] || "";
assert.match(customerSubmitBlock, /const\s+formElement\s*=\s*event\.currentTarget/, "ฟอร์มลูกค้ายังไม่ได้เก็บ reference ก่อน async upload");
assert.match(customerSubmitBlock, /formElement\.reset\(\)/, "ฟอร์มลูกค้ายังไม่ได้ใช้ reference เดิมหลัง async upload");
assert.doesNotMatch(customerSubmitBlock, /await[\s\S]*event\.currentTarget/, "ห้ามใช้ event.currentTarget หลัง await เพราะค่าอาจเป็น null");
assert.match(html, /id=["']viewTitle["'][^>]*tabindex=["']-1["']/, "หัวข้อหน้าไม่สามารถรับ focus หลังเปลี่ยนหน้า");
assert.match(html, /id=["']businessViewSwitch["'][^>]*role=["']group["']/, "ตัวเลือกรูปแบบธุรกิจยังไม่มี semantic group");
assert.match(html, /class=["']role-switch["'][^>]*role=["']group["']/, "ตัวเลือกมุมมองตามหน้าที่ยังไม่มี semantic group");
assert.match(html, /id=["']toast["'][^>]*hidden/, "Toast ที่ยังไม่แสดงต้องออกจาก Tab order");
assert.match(appJs, /const\s+evidenceMarkup\s*=\s*analysisEvidenceMarkup\(\)/, "ผล AI ยังไม่ได้ล็อก Evidence Snapshot ให้ตรงกับ Request");
// --- Bring-Your-Own-Key (ADR-001 ระยะ 1) ---------------------------------
// สัญญาเหล่านี้จับ regression ที่ "ดูเหมือนทำงาน" แต่ทำให้ผู้ใช้เสียความลับหรือ
// ทำให้แอปพังทั้งหน้าเมื่อยังไม่มี key
assert.match(html, /id=["']aiKeyInput["'][^>]*type=["']password["']/, "ช่องกรอก API key ต้องเป็น type=password ไม่ให้ key โผล่บนหน้าจอโดยไม่ตั้งใจ");
assert.match(html, /<label[^>]*for=["']aiKeyInput["']/, "ช่องกรอก API key ยังไม่มี <label> ที่ผูกกับ input จริง");
assert.match(html, /<label[^>]*for=["']aiModelInput["']/, "ช่องเลือกโมเดลยังไม่มี <label> ที่ผูกกับ input จริง");
assert.match(html, /id=["']aiKeyReveal["'][^>]*aria-pressed=/, "ปุ่มแสดง/ซ่อน key ต้องประกาศสถานะด้วย aria-pressed ให้ Screen Reader");
assert.match(html, /id=["']aiKeyStatus["'][^>]*role=["']status["']/, "สถานะ key ต้องประกาศเป็น role=status เพื่ออ่านการเปลี่ยนแปลงแบบ async");
assert.doesNotMatch(html, /API key ไม่แสดงใน browser/, "ข้อความความปลอดภัยเดิมเป็นเท็จภายใต้ BYOK เพราะ key อยู่ในเบราว์เซอร์ของผู้ใช้เอง");
// ตั้งแต่เปลี่ยนมาใช้ตัวส่งต่อ (scripts/ai-relay.mjs) คำขอเดินผ่าน server ของระบบจริง
// การบอกผู้ใช้ว่า "ไม่ผ่าน server" จึงกลายเป็นคำสัญญาที่ผิด และเป็นเรื่องความเป็นส่วนตัว
// ที่ผู้ใช้ใช้ตัดสินใจว่าจะใส่ key กับข้อมูลลูกค้าลงไปหรือไม่ ห้ามพูดเกินจริงเด็ดขาด
assert.doesNotMatch(html, /ไม่ผ่าน server/, "หน้าจอยังบอกว่าข้อมูลไม่ผ่าน server ซึ่งไม่จริงแล้วเมื่อใช้ตัวส่งต่อ");

// endpoint ที่ browser ยิงต้องตรงกับ path ที่ฝั่ง server เปิดรับจริง ถ้าสองค่านี้หลุดจากกัน
// หน้า AI จะพังทั้งหน้าโดยที่ไม่มีชุดตรวจไหนจับได้ เพราะแต่ละไฟล์ดูถูกต้องในตัวเอง
const relayPath = aiRelayJs.match(/export\s+const\s+AI_RELAY_PATH\s*=\s*["']([^"']+)["']/)?.[1];
assert.ok(relayPath, "หา AI_RELAY_PATH ใน scripts/ai-relay.mjs ไม่เจอ");
assert.match(
  aiProviderJs,
  new RegExp(`endpoint:\\s*["']${relayPath}["']`),
  `app/ai-provider.js ต้องยิงไปที่ ${relayPath} ให้ตรงกับ path ที่ scripts/ai-relay.mjs เปิดรับ`
);
assert.doesNotMatch(
  aiProviderJs,
  /endpoint:\s*["']https?:\/\//,
  "app/ai-provider.js ต้องไม่ยิงไป host ภายนอกตรง ๆ เพราะ OpenAI ไม่ส่ง CORS header กลับมาในคำขอจริง เบราว์เซอร์จะบล็อก"
);

assert.match(appJs, /callProvider\(/, "app.js ยังไม่ได้เรียกผู้ให้บริการ AI ตรงด้วย key ของผู้ใช้");
assert.doesNotMatch(appJs, /["']\/api\/analyze["']/, "app.js ยังเรียก endpoint ฝั่ง server อยู่ ต้องเรียกผู้ให้บริการตรงด้วย key ของผู้ใช้แทน");
assert.match(appJs, /function\s+renderAiKeyState\s*\(/, "ยังไม่มีฟังก์ชัน gating/empty state สำหรับกรณีที่ผู้ใช้ยังไม่ตั้งค่า key");
assert.match(businessConfigJs, /export\s+const\s+AI_KEY_STORAGE_KEY\s*=\s*["']bgc-ai-key["']/, "API key ต้องเก็บใน storage key ของตัวเอง");
assert.notEqual(
  businessConfigJs.match(/export\s+const\s+AI_KEY_STORAGE_KEY\s*=\s*["']([^"']+)["']/)?.[1],
  businessConfigJs.match(/export\s+const\s+STORAGE_KEY\s*=\s*["']([^"']+)["']/)?.[1],
  "API key ต้องอยู่คนละ storage entry กับ state ที่ถูก Export เป็นไฟล์ JSON"
);
assert.doesNotMatch(appJs, /STORAGE_KEY\s*\+[^\n]*ai-key|state\.(aiKey|apiKey)/, "ห้ามเก็บ API key ปนกับ state ที่ถูก Export เป็นไฟล์ JSON");
assert.match(appJs, /clearStoredKey\(\)/, "Set Zero และปุ่มลบ key ต้องล้าง API key ออกจากเครื่อง");
const resetConfirmBlock = appJs.match(/#resetConfirm"\)\.addEventListener\("click",[\s\S]*?\n}\);/)?.[0] || "";
assert.match(resetConfirmBlock, /clearStoredKey\(\)/, "Set Zero ยังไม่ได้ลบ API key ของผู้ใช้ออกจากเครื่องนี้");
assert.match(css, /\.ai-key-status\[data-key-state="ready"\]::before/, "สถานะ key ยังใช้สีเป็นสัญญาณเดียว ต้องมีข้อความกำกับด้วย");
const analysisSubmitBlock = appJs.match(/#analysisChatForm"\)\.addEventListener\("submit",\s*async[\s\S]*?\n}\);/)?.[0] || "";
assert.ok(analysisSubmitBlock, "ไม่พบ handler ส่งคำถามให้ AI");
assert.doesNotMatch(analysisSubmitBlock, /await[\s\S]*event\.currentTarget/, "ห้ามใช้ event.currentTarget หลัง await เพราะค่าเป็น null แล้ว จะทำให้ finally พังและปุ่มค้างสถานะกำลังวิเคราะห์");

assert.match(css, /summary:focus-visible/, "Summary control ยังไม่มี visible keyboard focus");
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/, "Reduced Motion ยังไม่ปิด animation ของการเปลี่ยนหน้า");
assert.doesNotMatch(css, /transition:\s*width\b/, "ยังพบ transition: width ซึ่งทำให้ layout animation ไม่ลื่น");
assert.doesNotMatch(css, /border-left:\s*[2-9]px\s+solid\s+var\(--accent\)/, "ยังพบ Side-stripe Accent Pattern");

// ── เส้นแบ่ง "ป้ายกำกับ" กับ "โครงสร้าง" ───────────────────────────────────
//
// ฟิลด์ป้ายกำกับ (ช่องทาง ประเภทลูกค้า ประเภทข้อเสนอ) ผู้ใช้ตั้งชื่อเองได้
// ส่วนฟิลด์โครงสร้าง (ขั้น Pipeline สถานะ Lead สถานะงาน ความสำคัญ รูปแบบธุรกิจ)
// ต้องเป็นรายการปิดเสมอ เพราะ Journey ศูนย์วิเคราะห์ และรายงาน Excel คำนวณจากค่าพวกนี้
// ถ้าวันหนึ่งมีคนเปิดให้พิมพ์เอง หน้าจอทุกหน้าจะเชื่อมความหมายกันไม่ได้อีก
// และตัวเลขในรายงานจะเงียบ ๆ ผิดโดยไม่มีอะไรพัง ซึ่งจับได้ยากที่สุด
const STRUCTURAL_FIELDS = ["stage", "pipelineStage", "status", "priority", "businessMode", "businessCategory"];
const recordConfigBlock = appJs.match(/const recordConfigs = \{[\s\S]*?\n\};/)?.[0] || "";
assert.ok(recordConfigBlock, "ไม่พบ recordConfigs ใน app.js");
for (const field of STRUCTURAL_FIELDS) {
  const pattern = new RegExp(`\\["${field}",[^\\]]*"combo"`);
  assert.doesNotMatch(
    recordConfigBlock,
    pattern,
    `ฟิลด์ "${field}" เป็นฟิลด์โครงสร้างที่ระบบใช้คำนวณ ห้ามเปลี่ยนเป็น combo ให้ผู้ใช้พิมพ์เอง`
  );
}
for (const field of ["source", "customerType", "category"]) {
  const pattern = new RegExp(`\\["${field}",[^\\]]*"combo"`);
  assert.match(
    recordConfigBlock,
    pattern,
    `ฟิลด์ "${field}" เป็นป้ายกำกับ ต้องเปิดให้ผู้ใช้พิมพ์ค่าของตัวเองได้ในหน้าต่างแก้ไขด้วย`
  );
}
// หน้าต่างแก้ไขต้องเป็น combo ให้ตรงกับฟอร์มเพิ่มใหม่ ไม่งั้นค่าที่ผู้ใช้พิมพ์เอง
// จะหายทันทีที่กดแก้ไข เพราะ select แสดงค่าที่ไม่มีใน option ไม่ได้
assert.match(html, /input name="source" list="sourceOptions"/, "ฟอร์มเพิ่มลูกค้ายังใช้ dropdown ปิดสำหรับช่องทางที่มา");
assert.match(html, /<datalist id="sourceOptions">/, "ไม่พบรายการแนะนำช่องทางที่มา");
assert.match(appJs, /function renderFieldSuggestions/, "ไม่พบตัวเติมรายการแนะนำจากข้อมูลจริงของผู้ใช้");

// กันข้อมูลหาย: สองความเสี่ยงเดียวที่ทำให้ผู้ใช้เสียงานจริงเมื่อไม่มีเซิร์ฟเวอร์สำรอง
assert.match(appJs, /addEventListener\("storage"/, "ยังไม่มีตัวดักการแก้ข้อมูลจากแท็บอื่น สองแท็บจะเขียนทับกันเงียบ ๆ");
assert.match(html, /id="staleTabWarning"/, "ไม่พบแบนเนอร์เตือนว่าข้อมูลถูกแก้จากแท็บอื่น");
assert.match(html, /id="backupReminder"/, "ไม่พบแบนเนอร์เตือนสำรองข้อมูล");
assert.match(appJs, /markBackupTaken\(\)/, "ส่งออกข้อมูลแล้วต้องจำวันที่สำรองล่าสุดไว้");


// ── วาง key แล้วต้องใช้ได้ทันที ────────────────────────────────────────────
//
// เดิมคำขอ AI อ่าน key จาก storage อย่างเดียว ผู้ใช้ที่วาง key แล้วถามทันทีจึงเจอ
// "ยังไม่ได้ตั้งค่า key" ทั้งที่ key อยู่ตรงหน้า และไม่มีอะไรบอกว่าต้องกดบันทึกก่อน
// เป็นทางตันที่ผู้ใช้หาสาเหตุเองไม่ได้ และทำให้คนที่ไม่อยากให้ key ถูกเก็บใช้งานไม่ได้เลย
assert.match(appJs, /function activeApiKey\(\)/, "ไม่พบตัวเลือก key ที่ใช้กับคำขอ");
assert.match(
  appJs,
  /function activeApiKey\(\)\s*\{\s*return typedKey\(\) \|\| readStoredKey\(\);/,
  "key ที่ผู้ใช้วางไว้ต้องมาก่อน key ที่บันทึกไว้ ไม่งั้นวางแล้วใช้ไม่ได้"
);
const chatSubmitBlock = appJs.match(/#analysisChatForm"\)\.addEventListener\("submit",\s*async[\s\S]*?\n}\);/)?.[0] || "";
assert.match(chatSubmitBlock, /activeApiKey\(\)/, "การส่งคำถามยังอ่าน key จาก storage อย่างเดียว ผู้ใช้ที่ไม่กดบันทึกจะใช้งานไม่ได้");
assert.doesNotMatch(chatSubmitBlock, /const apiKey = readStoredKey\(\)/, "การส่งคำถามต้องไม่บังคับให้บันทึก key ก่อน");
assert.match(appJs, /#aiKeyInput"\)\.addEventListener\("input"/, "ต้องอัปเดตสถานะทันทีที่วาง key ไม่งั้นปุ่มส่งยังดูเหมือนใช้ไม่ได้");

// การใช้งานโดยไม่บันทึกต้องไม่แตะพื้นที่จัดเก็บของเครื่องเลย
const activeKeyRegion = appJs.slice(appJs.indexOf("function typedKey()"), appJs.indexOf("function keyIsRemembered()"));
assert.doesNotMatch(activeKeyRegion, /setItem/, "เส้นทาง 'วางแล้วใช้เลย' ต้องไม่เขียน key ลง storage");

assert.match(html, /class="ai-key-trust"/, "ไม่พบคำอธิบายว่า key เดินทางไปไหนบ้าง");
assert.match(html, /api\/ai-relay/, "คำอธิบายต้องบอกปลายทางที่ผู้ใช้ตรวจสอบเองได้ใน DevTools");

console.log(`UI contract passed: ${requiredHtmlContracts.length} DOM contracts and reversible workflows are present`);
