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
  "dropZone",
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
  ,"welcomeDialog"
  ,"welcomeTitle"
  ,"welcomeSample"
  ,"welcomeFresh"
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

// ── ต้องบอกชื่อโมเดลที่ถูกเรียกใช้จริง ────────────────────────────────────
//
// callProvider คืน data.model ซึ่งเป็นชื่อที่ผู้ให้บริการใช้จริง เดิมค่านี้ถูกทิ้งทั้งหมด
// หน้าจอจึงแสดงแต่ชื่อที่ผู้ใช้พิมพ์ ทั้งที่ OpenAI แปลงชื่อย่อเป็นรุ่นลงวันที่
// ("gpt-5.6-sol" → "gpt-5.6-sol-2026-05-14") ผู้ใช้จึงเข้าใจผิดว่ารู้ว่ากำลังใช้โมเดลอะไร
// และเปรียบเทียบคำตอบข้ามช่วงเวลาบนสมมติฐานที่ผิด
assert.match(appJs, /lastResolvedModel = data\.model/, "ชื่อโมเดลที่ผู้ให้บริการใช้จริงถูกทิ้ง ไม่ได้ถูกนำมาแสดง");
assert.match(appJs, /function modelBylineMarkup/, "ไม่พบป้ายบอกโมเดลที่ใช้จริงในคำตอบ");
assert.match(appJs, /function modelStatusText/, "แถบสถานะยังไม่บอกโมเดลที่ใช้จริง");
assert.match(appJs, /ผู้ให้บริการใช้ \$\{escapeHTML\(resolved\)\}/, "เมื่อชื่อที่ระบุกับชื่อที่ใช้จริงไม่ตรงกัน ต้องแสดงทั้งคู่ ไม่ใช่แสดงอันเดียว");

// คอมเมนต์ที่บอกว่าข้อมูลไม่วิ่งผ่าน server เป็นเท็จตั้งแต่มี relay (ADR ภาคผนวก ก)
// คอมเมนต์ที่ขัดกับความจริงอันตรายกว่าไม่มีคอมเมนต์ เพราะคนอ่านจะเชื่อแล้วตัดสินใจผิด
assert.doesNotMatch(
  appJs,
  /ไม่วิ่งผ่าน server ของเจ้าของระบบ/,
  "พบคำอธิบายที่ขัดกับสถาปัตยกรรมจริง — key และข้อมูลวิ่งผ่าน Worker ตั้งแต่มีตัวส่งต่อแล้ว"
);

// ── ต้องบอกผู้ใช้ว่ายังมีเนื้อหาเลื่อนต่อได้ ────────────────────────────────
//
// บนมือถือ เมนูหลักกว้าง 1032px บนจอ 343px และ scrollbar ถูกซ่อนด้วย
// scrollbar-width: none ผู้ใช้จึงเห็นเมนู 3 จาก 8 รายการโดยไม่มีอะไรบอกว่ามีต่อ
// เมนูที่มองไม่เห็นเท่ากับเมนูที่ไม่มีอยู่จริง
assert.match(appJs, /function attachScrollHint/, "ไม่พบกลไกบอกว่าเนื้อหาเลื่อนต่อได้");
assert.match(css, /\.scroll-hint\[data-overflow="both"\]::before/, "CSS ยังไม่แสดงลูกศรตามทิศที่เลื่อนได้");
// ลูกศรต้องหายไปเมื่อเลื่อนสุดด้านนั้นแล้ว ไม่ใช่ค้างอยู่ตลอดจนคนเลิกสังเกต
assert.match(appJs, /wrap\.dataset\.overflow = "none"/, "ต้องซ่อนลูกศรเมื่อไม่มีอะไรให้เลื่อน");
assert.match(appJs, /atStart \? "end" : atEnd \? "start" : "both"/, "ต้องแยกทิศทางที่ยังเลื่อนได้ ไม่ใช่แสดงลูกศรสองข้างตลอด");
// เมนูหลักเป็นตัวที่ล้นจริงบนมือถือ ถ้าหลุดจากรายการนี้เมื่อไรปัญหาเดิมกลับมาทันที
assert.match(appJs, /scrollHintTargets = \[[^\]]*"\.nav"/, "เมนูหลักต้องอยู่ในรายการที่ได้ลูกศรบอกทิศ");
// ResizeObserver กับ rAF ถูกหยุดเมื่อแท็บถูกซ่อน ต้องมีตัวสำรองไม่งั้นค่าค้าง
assert.match(appJs, /setTimeout\(run, \d+\)/, "ต้องมีตัววัดซ้ำสำรอง เพราะ rAF หยุดทำงานเมื่อแท็บถูกซ่อน");

// หัวหน้า AI ต้องไม่บีบหัวเรื่องจนตัดคำละบรรทัด
assert.match(css, /\.ai-workspace-head \{[^}]*display: grid/, "หัวหน้า AI ต้องเป็นตาราง 2 แถว ไม่ใช่แถวเดียวที่ทุกกล่องแย่งพื้นที่กัน");
assert.match(css, /\.ai-workspace-head \.ai-alternative-note \{[^}]*grid-column: 1 \/ -1/, "ย่อหน้าอธิบายต้องอยู่แถวล่างเต็มความกว้าง");
assert.match(css, /\.ai-heading \{[^}]*min-width: 0/, "ขาด min-width: 0 หัวเรื่องจะถูกบีบจนตัดคำผิดที่");

// ── นำเข้าไฟล์หลายชีตต้องเริ่มที่ "ทุกชีต" ────────────────────────────────────
//
// รายงานที่ระบบออกให้แยกข้อมูลไว้ 11 ชีต โดยชีตแรกคือ "สรุปผู้บริหาร" ซึ่งนำเข้าไม่ได้
// ถ้ากล่องเลือกเปิดมาที่ชีตแรกตามค่าเริ่มต้นของ <select> ผู้ใช้จะเห็น "0 รายการ"
// ทันทีที่เปิดหน้าต่าง แล้วสรุปว่าระบบนำเข้าไม่ได้ ทั้งที่ข้อมูลอยู่ในชีตถัดไป
assert.match(appJs, /value="all">ทุกชีตในไฟล์/, "ไฟล์หลายชีตต้องมีตัวเลือกนำเข้าทั้งไฟล์");
assert.match(appJs, /sheetSelect\.value = manySheets \? "all"/, "ไฟล์หลายชีตต้องเปิดมาที่ \"ทุกชีต\" ไม่ใช่ชีตแรกที่มักเป็นชีตสรุป");
// เลือกทุกชีตแล้วระบบจัดเส้นทางเอง ช่องประเภทข้อมูลจึงต้องถูกปิด ไม่ใช่ปล่อยให้กดแล้วไม่มีผล
assert.match(appJs, /collectionSelect\.disabled = parsed\.kind === "state" \|\| wholeWorkbook/, "เลือกทุกชีตแล้วต้องปิดช่องเลือกประเภทข้อมูล");
// ชีตที่ระบบข้ามต้องแสดงเหตุผลไว้ ผู้ใช้จะได้รู้ว่าระบบเห็นแล้วตั้งใจข้าม ไม่ใช่อ่านไม่เจอ
assert.match(appJs, /import-row-muted/, "ต้องแสดงชีตที่ถูกข้ามพร้อมเหตุผล ไม่ใช่เงียบหายไปเฉย ๆ");
assert.match(css, /\.import-preview \.import-row-muted td/, "CSS ต้องแยกแถวชีตที่ถูกข้ามออกจากแถวที่นำเข้าจริง");

// ── หน้าจอต้อนรับครั้งแรกต้องไม่กลายเป็นกับดัก ──────────────────────────────
//
// ระบบเปิดมาพร้อมข้อมูลตัวอย่างที่หน้าตาเหมือนข้อมูลจริง คนที่ได้รับลิงก์ต่อจึง
// เข้าใจผิดว่ากำลังเห็นงานของคนที่ส่งลิงก์มา ทั้งที่ข้อมูลแยกตามเบราว์เซอร์
// หน้าจอนี้จึงมีไว้ให้ผู้ใช้เลือกเองว่าจะลองข้อมูลตัวอย่างหรือเริ่มที่ศูนย์
assert.match(appJs, /const isFirstVisit = lastKnownStorageValue === null;/, "ไม่พบการตรวจว่าเป็นการเปิดครั้งแรก");
// ต้องอ่านค่าก่อนโค้ดส่วนใดเขียน storage ไม่งั้นจะเป็นเท็จเสมอและหน้าจอนี้จะไม่เคยขึ้น
assert.ok(
  appJs.indexOf("const isFirstVisit") < appJs.indexOf("function saveState()"),
  "isFirstVisit ต้องถูกอ่านก่อน saveState() ถูกประกาศใช้งาน ไม่งั้นค่าอาจถูกเขียนทับไปแล้ว"
);
assert.match(appJs, /if \(isFirstVisit\) \{[\s\S]{0,160}welcomeDialog"\)\.showModal\(\)/, "หน้าจอต้อนรับยังไม่ถูกแสดงเมื่อเปิดครั้งแรก");
// ทั้งสองทางต้องบันทึกลงเครื่อง ไม่งั้นผู้ใช้จะโดนถามซ้ำทุกครั้งที่เปิดหน้าใหม่
const welcomeSampleBlock = appJs.match(/#welcomeSample"\)\.addEventListener\("click",[\s\S]*?\n}\);/)?.[0] || "";
const welcomeFreshBlock = appJs.match(/#welcomeFresh"\)\.addEventListener\("click",[\s\S]*?\n}\);/)?.[0] || "";
assert.match(welcomeSampleBlock, /saveState\(\)/, "เลือกข้อมูลตัวอย่างแล้วต้องบันทึกลงเครื่อง ไม่งั้นจะถูกถามซ้ำทุกครั้ง");
assert.match(welcomeFreshBlock, /createZeroState\(\)/, "เลือกเริ่มด้วยข้อมูลตัวเองแล้วต้องล้างข้อมูลตัวอย่างจริง");
assert.match(welcomeFreshBlock, /saveState\(\)/, "เลือกเริ่มที่ศูนย์แล้วต้องบันทึกลงเครื่อง ไม่งั้นจะถูกถามซ้ำทุกครั้ง");
// เครื่องที่ปิด storage จะบันทึกไม่สำเร็จ ถ้าผูกการปิดหน้าต่างไว้กับผลบันทึก
// ผู้ใช้จะติดอยู่ในหน้าต่างนี้โดยไม่มีทางออกและใช้แอปไม่ได้เลย
for (const [name, block] of [["welcomeSample", welcomeSampleBlock], ["welcomeFresh", welcomeFreshBlock]]) {
  assert.doesNotMatch(block, /if \(!saveState\(\)\) return;/, `${name} ต้องไม่ปิดทางออกเมื่อบันทึกไม่สำเร็จ ผู้ใช้จะติดอยู่ในหน้าต่างต้อนรับ`);
  assert.match(block, /closeWelcome\(/, `${name} ต้องปิดหน้าต่างต้อนรับเสมอ`);
}

// ── เมนูข้างต้องเลื่อนได้ ห้ามตัดปุ่มล่างสุดทิ้ง ────────────────────────────
//
// .sidebar ตรึง height: 100vh ไว้ ถ้าเนื้อหายาวกว่าจอ ส่วนที่เกินจะถูกตัดหาย
// โดยไม่มีแถบเลื่อนให้ผู้ใช้เข้าถึง ปุ่มล่างสุดคือ "นำเข้าข้อมูล" กับ "Set Zero"
// ซึ่งเป็นทางเดียวที่ผู้ใช้เอาข้อมูลเข้า/ล้างข้อมูลได้ ปุ่มที่กดไม่ถึงเท่ากับปุ่มที่ไม่มีอยู่จริง
// เคยพังมาแล้วตอนเพิ่มปุ่มที่ 4 เข้าไปในแถบเครื่องมือ
const sidebarBlock = css.match(/^\.sidebar \{[\s\S]*?\n\}/m)?.[0] || "";
assert.ok(sidebarBlock, "ไม่พบกฎ .sidebar ใน styles.css");
assert.match(sidebarBlock, /height:\s*100vh/, "กฎ .sidebar ที่ตรวจอยู่ไม่ใช่ตัวที่ตรึงความสูง — assertion ถัดไปจะไม่ได้ตรวจอะไรเลย");
assert.match(sidebarBlock, /overflow-y:\s*auto/, "เมนูข้างตรึงความสูงไว้แต่เลื่อนไม่ได้ ปุ่มล่างสุดจะถูกตัดหายบนจอเตี้ย");

// ปุ่มคัดลอกลิงก์หน้าหลักต้องระบุปลายทางไว้ในลิงก์ ไม่ใช่คัดลอกลิงก์เปล่า
// เพราะลิงก์เปล่าจะถูก rememberedRoute() พาไปยังหน้าที่เครื่องนั้นเปิดค้างไว้ล่าสุด
// ปุ่มที่ชื่อ "ลิงก์หน้าหลัก" จึงพาไปหน้าอื่นได้ ซึ่งขัดกับสิ่งที่ปุ่มสัญญาไว้
const copyHomeBlock = appJs.match(/#copyHomeLink"\)\.addEventListener\("click",[\s\S]*?\n}\);/)?.[0] || "";
assert.match(copyHomeBlock, /#dashboard\/owner/, "ลิงก์หน้าหลักต้องระบุหน้าปลายทาง ไม่งั้นจะถูกพาไปหน้าที่เปิดค้างไว้ล่าสุดแทน");

// ── ชั้นรับไฟล์ลากวางต้องไม่รบกวน UI เดิม ──────────────────────────────────
//
// feature นี้ถูกเพิ่มทีหลังเพื่อแก้ทางตันตอนหน้าต่างเลือกไฟล์ของ OS เปิดไม่ขึ้น
// เงื่อนไขคือห้ามขยับหรือบังของเดิมแม้แต่นิดเดียว ทั้งสามกฎด้านล่างคือสิ่งที่ทำให้
// เงื่อนไขนั้นเป็นจริง ถ้ากฎใดหลุด หน้าเว็บจะพังแบบที่ผู้ใช้แก้เองไม่ได้
const dropZoneBlock = css.match(/^\.drop-zone \{[\s\S]*?\n\}/m)?.[0] || "";
assert.ok(dropZoneBlock, "ไม่พบกฎ .drop-zone ใน styles.css");
assert.match(
  dropZoneBlock,
  /position:\s*fixed/,
  "ชั้นรับไฟล์ต้องเป็น fixed เพื่ออยู่นอกกระแสเอกสาร ไม่งั้นจะดัน layout เดิมให้เลื่อน"
);
assert.match(
  dropZoneBlock,
  /pointer-events:\s*none/,
  "ชั้นรับไฟล์ต้องปล่อย event ทะลุผ่าน ไม่งั้นจะดักคลิกจนปุ่มทั้งหน้ากดไม่ได้"
);

// display: grid ใน .drop-zone ชนะกฎ hidden ของ browser ถ้าไม่ประกาศทับตรง ๆ
// ชั้นนี้จะค้างเต็มจอตั้งแต่เปิดหน้าเว็บ และผู้ใช้จะใช้ระบบไม่ได้เลยทั้งหน้า
assert.match(
  css,
  /\.drop-zone\[hidden\]\s*\{[^}]*display:\s*none/,
  "ต้องบังคับ .drop-zone[hidden] { display: none } ไม่งั้นชั้นรับไฟล์จะค้างเต็มจอตลอดเวลา"
);

const dropHandler = appJs.match(/window\.addEventListener\("drop",[\s\S]*?\n {2}\}\);/)?.[0] || "";
assert.ok(dropHandler, "ไม่พบตัวรับเหตุการณ์ drop ใน app.js");
assert.match(
  dropHandler,
  /event\.preventDefault\(\)/,
  "ตัวรับ drop ต้อง preventDefault ไม่งั้น browser จะเปิดไฟล์ทับหน้าเว็บและงานที่ยังไม่บันทึกจะหายทันที"
);

// ทั้งปุ่มเลือกไฟล์และการลากวางต้องวิ่งผ่านฟังก์ชันเดียวกัน ถ้าแยกโค้ดกัน สองทาง
// จะค่อย ๆ ทำงานไม่เหมือนกัน แล้วผู้ใช้จะเจอผลลัพธ์ต่างกันโดยไม่มีใครรู้ว่าทำไม
assert.equal(
  (appJs.match(/await handleImportFile\(/g) || []).length,
  2,
  "ทั้งปุ่มนำเข้าและการลากไฟล์มาวางต้องเรียก handleImportFile ตัวเดียวกัน ห้ามเขียนโค้ดอ่านไฟล์ซ้ำสองชุด"
);

// ลากข้อความหรือลิงก์ในหน้าเว็บต้องไม่ทำให้ชั้นนี้โผล่ขึ้นมาบังหน้าจอ
assert.match(
  appJs,
  /includes\("Files"\)/,
  "ต้องตรวจ dataTransfer.types ว่ามีไฟล์จริง ไม่งั้นการลากข้อความธรรมดาจะทำให้ชั้นรับไฟล์โผล่มาบังหน้าจอ"
);

// ── ปุ่มนำเข้าห้ามเงียบเมื่อหน้าต่างเลือกไฟล์ไม่โผล่ ────────────────────────
//
// หน้าต่างเลือกไฟล์เป็นของ OS หน้าเว็บสั่งให้มันโผล่ไม่ได้ สิ่งเดียวที่ทำได้คือไม่ปล่อย
// ให้ผู้ใช้ยืนงงหน้าจอนิ่ง ๆ โดยไม่รู้ว่าเกิดอะไรขึ้นและต้องทำอะไรต่อ
const cancelHandler = appJs.match(/#importData"\)\.addEventListener\("cancel",[\s\S]*?\n\}\);/)?.[0] || "";
assert.ok(
  cancelHandler,
  "ต้องดักเหตุการณ์ cancel ของช่องนำเข้าไฟล์ ไม่งั้นผู้ใช้จะกดปุ่มแล้วหน้าจอเงียบสนิทโดยไม่รู้สาเหตุ"
);
assert.match(
  cancelHandler,
  /notify\(/,
  "ตัวดัก cancel ต้องขึ้นข้อความบอกผู้ใช้ ไม่ใช่เงียบไปเฉย ๆ"
);
assert.match(
  cancelHandler,
  /ลากไฟล์/,
  "ข้อความตอน cancel ต้องชี้ทางออกที่ใช้ได้จริง (ลากไฟล์มาวาง) ไม่ใช่แค่บอกว่าไม่สำเร็จ"
);

console.log(`UI contract passed: ${requiredHtmlContracts.length} DOM contracts and reversible workflows are present`);
