import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  supportedImportExtensions,
  parseCsvText,
  parseMarkdownText,
  parseImportFile,
  buildImportPlan,
  applyImportPlan,
  matrixToRows,
  routeSheet
} from "../app/data-import.js";

for (const extension of ["json", "csv", "cvs", "tsv", "xls", "xlsx", "md", "txt", "doc", "docx"]) {
  assert.ok(supportedImportExtensions.includes(extension), `ต้องรองรับไฟล์ .${extension}`);
}

const csvRows = parseCsvText("ชื่อลูกค้า,เบอร์โทร,ช่องทาง,ความต้องการ\nร้านเหนือ,081-111-2222,Facebook,เพิ่มยอดขาย\n\"บริษัท, ไทย\",02-111-2222,Website,ระบบ CRM");
assert.equal(csvRows.length, 2, "CSV ต้องอ่านจำนวนแถวถูกต้อง");
assert.equal(csvRows[1]["ชื่อลูกค้า"], "บริษัท, ไทย", "CSV ต้องอ่านค่าที่มี comma ใน quote ได้");

const cvsFile = {
  name: "customers.cvs",
  size: 64,
  text: async () => "ชื่อลูกค้า,เบอร์โทร\nลูกค้า CVS,0800000000",
  arrayBuffer: async () => new ArrayBuffer(0)
};
const parsedCvs = await parseImportFile(cvsFile);
assert.equal(parsedCvs.format, "csv", ".CVS ต้องทำงานเป็น alias ของ CSV");
assert.equal(parsedCvs.rows[0]["ชื่อลูกค้า"], "ลูกค้า CVS", ".CVS ต้องอ่านข้อมูลลูกค้าได้");

const markdownRows = parseMarkdownText(`| ชื่อสินค้า | ราคา | ต้นทุน | รูปแบบธุรกิจ |
| --- | ---: | ---: | --- |
| Wholesale Pro | 50000 | 12000 | Wholesale |`);
assert.equal(markdownRows[0]["ชื่อสินค้า"], "Wholesale Pro", "Markdown table ต้องแปลงเป็น row ได้");

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
  { "ชื่อสินค้า": "Retail Starter", "ราคา": 15000, "ต้นทุน": 4000, "รูปแบบธุรกิจ": "Retail" }
]), "Packages");
const xlsxBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
const xlsxFile = {
  name: "packages.xlsx",
  size: xlsxBuffer.byteLength,
  arrayBuffer: async () => xlsxBuffer,
  text: async () => ""
};
const parsedWorkbook = await parseImportFile(xlsxFile, { xlsx: XLSX });
assert.equal(parsedWorkbook.rows[0]["ชื่อสินค้า"], "Retail Starter", "XLSX ต้องอ่านแถวข้อมูลจริงได้");
assert.equal(parsedWorkbook.sheets.length, 1, "XLSX ต้องรายงานรายชื่อ Sheet");

const fakeDocxFile = {
  name: "customers.docx",
  size: 128,
  arrayBuffer: async () => new ArrayBuffer(8),
  text: async () => ""
};
const parsedDocx = await parseImportFile(fakeDocxFile, {
  mammoth: { extractRawText: async () => ({ value: "ชื่อลูกค้า: คลินิกใหม่\nเบอร์โทร: 0899999999\nช่องทาง: Referral" }) }
});
assert.equal(parsedDocx.rows[0]["ชื่อลูกค้า"], "คลินิกใหม่", "DOCX ต้องแปลง key-value text เป็น row ได้");

const profile = { businessMode: "retail", businessCategory: "retail" };
const customerPlan = buildImportPlan({ rows: csvRows, kind: "rows", format: "csv" }, { collection: "auto", businessProfile: profile, state: { customers: [], products: [] } });
assert.equal(customerPlan.collection, "customers", "ต้องตรวจจับข้อมูลลูกค้าจากหัวตารางได้");
assert.equal(customerPlan.records[0].businessMode, "retail", "ข้อมูลนำเข้าต้องรับ Business Profile ปัจจุบัน");
assert.equal(customerPlan.relatedRecords.leads.length, 2, "นำเข้าลูกค้าต้องสร้าง Lead ที่สัมพันธ์กัน");

const productPlan = buildImportPlan({ rows: markdownRows, kind: "rows", format: "md" }, { collection: "auto", businessProfile: profile, state: { customers: [], products: [] } });
assert.equal(productPlan.collection, "products", "ต้องตรวจจับข้อมูล Package จากหัวตารางได้");
assert.equal(productPlan.records[0].pipelineStage, "Proposal", "Package ที่นำเข้าต้องมี Pipeline Stage มาตรฐาน");

const applied = applyImportPlan({
  businessProfile: profile,
  customers: [], leads: [], products: [], deals: [], tasks: []
}, customerPlan);
assert.equal(applied.state.customers.length, 2, "ยืนยัน Import แล้วต้องเพิ่มลูกค้าเข้าระบบ");
assert.equal(applied.state.leads.length, 2, "Lead ที่สร้างจาก Import ต้องเข้าระบบพร้อมลูกค้า");
assert.equal(applied.stats.created, 2, "ต้องสรุปจำนวนรายการที่สร้างได้");

const reapplied = applyImportPlan(applied.state, customerPlan);
assert.equal(reapplied.state.customers.length, 2, "นำเข้าไฟล์ลูกค้าเดิมซ้ำต้อง Update ไม่สร้างลูกค้าซ้ำ");
assert.equal(reapplied.state.leads.length, 2, "นำเข้าลูกค้าเดิมซ้ำต้องไม่สร้าง Lead ซ้ำ");
assert.equal(reapplied.stats.updated, 2, "ต้องรายงานจำนวนลูกค้าที่ Update จากไฟล์ซ้ำ");

const taskPlan = buildImportPlan({
  kind: "rows", format: "csv", rows: [{ "ชื่องาน": "โทรติดตามร้านเหนือ", "ผู้รับผิดชอบ": "ฝ่ายขาย", "กำหนดเสร็จ": "2026-07-30" }]
}, { collection: "tasks", businessProfile: profile, state: reapplied.state });
const taskApplied = applyImportPlan(reapplied.state, taskPlan);
const taskPlanAgain = structuredClone(taskPlan);
taskPlanAgain.records[0].id = `${taskPlanAgain.records[0].id}-again`;
const taskReapplied = applyImportPlan(taskApplied.state, taskPlanAgain);
assert.equal(taskReapplied.state.tasks.length, 1, "นำเข้างานเดิมซ้ำต้อง Update ไม่สร้าง Task ซ้ำ");

const thaiLeadPlan = buildImportPlan({
  kind: "rows", format: "csv", rows: [{ "ชื่อลูกค้า": "ลูกค้าไทย", "สถานะ Lead": "สนใจ" }]
}, { collection: "customers", businessProfile: profile, state: reapplied.state });
assert.equal(thaiLeadPlan.relatedRecords.leads[0].status, "Interested", "สถานะ Lead ภาษาไทยต้องแปลงเป็นสถานะ CRM ที่ระบบรองรับ");

const jsonState = {
  businessProfile: profile,
  customers: [], leads: [], products: [], deals: [], tasks: []
};
const jsonFile = {
  name: "backup.json",
  size: 100,
  text: async () => JSON.stringify(jsonState),
  arrayBuffer: async () => new ArrayBuffer(0)
};
const parsedState = await parseImportFile(jsonFile);
assert.equal(parsedState.kind, "state", "JSON backup ทั้งระบบต้องถูกตรวจเป็น State import");

await assert.rejects(
  () => parseImportFile({ name: "too-large.csv", size: 11 * 1024 * 1024, text: async () => "" }),
  /10 MB/,
  "ต้องป้องกันไฟล์ใหญ่เกินกำหนดก่อนอ่าน"
);

// ── หัวตารางที่ไม่ได้อยู่แถวแรก ───────────────────────────────────────────────
// รายงานที่ระบบนี้ออกให้วางชื่อรายงานไว้แถว 1 คำอธิบายแถว 2 แถว 3 ว่าง แล้วหัวตารางจริงอยู่แถว 4
// ถ้าตัวอ่านยังยึดแถวแรกเป็นหัวตาราง ทุกคอลัมน์จะกลายเป็น __EMPTY และไม่มีแถวไหนนำเข้าได้เลย
const banner = matrixToRows([
  ["ข้อมูลลูกค้าทั้งหมดในระบบ", "", "", ""],
  ["รวม 2 รายการ · ไม่รวมรูปโปรไฟล์", "", "", ""],
  ["", "", "", ""],
  ["ชื่อลูกค้า", "เบอร์โทร", "ช่องทางที่มา", "ความต้องการ"],
  ["ร้านเหนือ", "0811112222", "Facebook", "เพิ่มยอดขาย"]
]);
assert.equal(banner.headerRow, 3, "ต้องหาหัวตารางเจอแม้จะไม่ได้อยู่แถวแรก");
assert.equal(banner.firstDataRow, 5, "ต้องรายงานเลขแถวข้อมูลให้ตรงกับที่ผู้ใช้เห็นใน Excel");
assert.equal(banner.rows[0]["ชื่อลูกค้า"], "ร้านเหนือ", "ต้องอ่านค่าจากหัวตารางแถวที่ถูกต้อง");

const bannerPlan = buildImportPlan({ kind: "rows", rows: banner.rows, format: "xlsx" }, {
  collection: "auto", businessProfile: profile, state: { customers: [], products: [] }, firstDataRow: banner.firstDataRow
});
assert.equal(bannerPlan.records.length, 1, "ไฟล์ที่มีหัวรายงานคั่นต้องนำเข้าได้จริง ไม่ใช่ได้ 0 รายการ");

const badRowPlan = buildImportPlan({ kind: "rows", rows: [{ "เบอร์โทร": "0899999999" }], format: "xlsx" }, {
  collection: "customers", businessProfile: profile, state: { customers: [], products: [] }, firstDataRow: 5
});
assert.equal(badRowPlan.rejected[0].row, 5, "เลขแถวที่แจ้งว่าใช้ไม่ได้ ต้องนับจากแถวข้อมูลจริง ไม่ใช่แถวที่ 2 เสมอ");

// ── ตัวเลขและป้ายภาษาไทยที่ไฟล์ export เขียนออกไป ──────────────────────────────
// "85,000 บาท" ที่ผ่าน Number() ตรง ๆ จะได้ NaN แล้วตกเป็น 0 เงียบ ๆ — ราคาหายทั้งไฟล์
const thaiValuePlan = buildImportPlan({
  kind: "rows", format: "xlsx",
  rows: [{ "ชื่อดีล": "ดีลองค์กร", "ลูกค้า": "ร้านเหนือ", "มูลค่า": "85,000 บาท", "ขั้น": "ออกแบบและส่งข้อเสนอ", "โอกาสปิด (%)": "65.0%" }]
}, { collection: "deals", businessProfile: profile, state: { customers: [{ id: "c1", fullName: "ร้านเหนือ" }], products: [] } });
assert.equal(thaiValuePlan.records[0].value, 85000, "มูลค่าที่เขียนเป็น \"85,000 บาท\" ต้องอ่านกลับเป็นตัวเลขได้");
assert.equal(thaiValuePlan.records[0].stage, "Proposal", "ป้ายขั้นดีลภาษาไทยต้องแปลงกลับเป็นขั้นจริง ไม่ใช่ตกไปเป็น New");
assert.equal(thaiValuePlan.records[0].probability, 65, "หัวคอลัมน์ที่มีหน่วย (%) ต่อท้ายต้องยังจับคู่กับ alias ได้");

const thaiTaskPlan = buildImportPlan({
  kind: "rows", format: "xlsx",
  rows: [{ "งาน": "โทรติดตาม", "ผู้รับผิดชอบ": "ทีมขาย", "กำหนดส่ง": "2026-07-04", "ความสำคัญ": "สูง", "สถานะ": "กำลังทำ" }]
}, { collection: "tasks", businessProfile: profile, state: {} });
assert.equal(thaiTaskPlan.records[0].status, "in_progress", "สถานะงานภาษาไทยต้องแปลงกลับเป็นค่าที่ระบบใช้");
assert.equal(thaiTaskPlan.records[0].priority, "High", "ความสำคัญภาษาไทยต้องแปลงกลับเป็นค่าที่ระบบใช้");
assert.equal(thaiTaskPlan.records[0].dueDate, "2026-07-04", "คอลัมน์ \"กำหนดส่ง\" ต้องถูกอ่านเป็นวันครบกำหนด");

// หมวดข้อเสนอเป็น field ประเภทป้ายกำกับ ผู้ใช้ตั้งเองได้ (ADR-001 ภาคผนวก ค)
// การนำเข้าต้องเคารพกฎเดียวกับการกรอกในหน้าจอ ไม่ใช่บีบทุกอย่างกลับเป็น "Package"
const customCategoryPlan = buildImportPlan({
  kind: "rows", format: "csv", rows: [{ "ชื่อสินค้า": "คอร์สเฉพาะทาง", "หมวด": "คอร์สอบรม", "ราคาขาย": "9,900 บาท" }]
}, { collection: "products", businessProfile: profile, state: {} });
assert.equal(customCategoryPlan.records[0].category, "คอร์สอบรม", "หมวดที่ผู้ใช้ตั้งเองต้องไม่ถูกเขียนทับเป็น Package");
assert.equal(customCategoryPlan.records[0].price, 9900, "ราคาที่มีหน่วยบาทต่อท้ายต้องอ่านกลับเป็นตัวเลขได้");

// ── นำเข้าทั้งไฟล์: รายงานที่ระบบ export ต้องนำกลับเข้าระบบได้ครบ ────────────────
globalThis.ExcelJS = (await import("exceljs")).default;
const { buildReportWorkbook } = await import("../app/report-export.js");
const { loadStateFrom } = await import("../app/state-model.js");
const { STORAGE_KEY } = await import("../app/business-config.js");

const seeded = loadStateFrom({ getItem: () => null }, STORAGE_KEY);
const { workbook: reportWorkbook } = await buildReportWorkbook(seeded, "2026-08-09");
const reportBuffer = await reportWorkbook.xlsx.writeBuffer();
const reportFile = {
  name: "รายงานวิเคราะห์ธุรกิจ.xlsx",
  size: reportBuffer.byteLength,
  arrayBuffer: async () => reportBuffer,
  text: async () => ""
};
const parsedReport = await parseImportFile(reportFile, { xlsx: XLSX });

const routes = Object.fromEntries(parsedReport.sheets.map((sheet) => [sheet.name, routeSheet(sheet).collection]));
assert.equal(routes["ข้อมูลลูกค้า"], "customers", "ชีตข้อมูลลูกค้าต้องถูกจัดเข้าเป็นลูกค้า");
assert.equal(routes["Lead"], "leads", "ชีต Lead ต้องถูกจัดเข้าเป็นสถานะ Lead");
assert.equal(routes["ดีล"], "deals", "ชีตดีลต้องถูกจัดเข้าเป็นดีล");
assert.equal(routes["งานติดตาม"], "tasks", "ชีตงานติดตามต้องถูกจัดเข้าเป็นงาน");
assert.equal(routes["ข้อเสนอและกำไร"], "products", "ชีตข้อเสนอต้องถูกจัดเข้าเป็นสินค้า/ข้อเสนอ");
// ชีตวิเคราะห์ต้องถูกข้าม ไม่ใช่นำเข้า มิฉะนั้นข้อมูลชุดเดียวจะถูกนับซ้ำสองรอบ
for (const analysis of ["สรุปผู้บริหาร", "เทียบกับเดือนก่อน", "คิวติดตาม", "ช่องทางการตลาด", "Customer Journey", "งานค้างและความเสี่ยง"]) {
  assert.equal(routes[analysis], null, `ชีตวิเคราะห์ ${analysis} ต้องถูกข้าม ไม่ใช่นำเข้าเป็นข้อมูลซ้ำ`);
}

const blankState = { businessProfile: seeded.businessProfile, customers: [], leads: [], products: [], deals: [], tasks: [] };
const workbookPlan = buildImportPlan(parsedReport, { collection: "all", businessProfile: seeded.businessProfile, state: blankState });
assert.equal(workbookPlan.kind, "workbook", "เลือกนำเข้าทั้งไฟล์ต้องได้แผนแบบหลายชีต");
assert.deepEqual(
  workbookPlan.steps.map((step) => step.collection),
  ["profile", "products", "customers", "leads", "deals", "tasks"],
  "ต้องเรียงลำดับนำเข้าตาม dependency ไม่งั้นดีลจะหาลูกค้าในไฟล์เดียวกันไม่เจอ และข้อเสนอจะยืมโปรไฟล์เปล่า"
);

const workbookApplied = applyImportPlan(blankState, workbookPlan);
assert.equal(workbookApplied.state.customers.length, seeded.customers.length, "ลูกค้าต้องกลับเข้าระบบครบ");
assert.equal(workbookApplied.state.products.length, seeded.products.length, "ข้อเสนอต้องกลับเข้าระบบครบ");
assert.equal(workbookApplied.state.deals.length, seeded.deals.length, "ดีลต้องกลับเข้าระบบครบ ไม่ถูกตีตกเพราะหาลูกค้าไม่เจอ");
assert.equal(workbookApplied.state.tasks.length, seeded.tasks.length, "งานติดตามต้องกลับเข้าระบบครบ");
assert.equal(workbookApplied.state.leads.length, seeded.leads.length, "Lead ต้องกลับเข้าระบบครบ");
assert.equal(workbookApplied.stats.rejected, 0, "รายงานที่ระบบสร้างเองต้องไม่มีแถวไหนถูกตีตก");

// ตัวเลขที่โชว์ตอน Preview ต้องเท่ากับผลจริงตอนกดยืนยัน ไม่ใช่ประเมินต่ำจาก state เก่า
const previewTotal = workbookPlan.sheetResults.reduce((total, sheet) => total + sheet.created + sheet.updated, 0);
assert.equal(previewTotal, workbookApplied.stats.created + workbookApplied.stats.updated, "จำนวนที่โชว์ก่อนยืนยันต้องตรงกับผลจริง");

const wonDeal = workbookApplied.state.deals.find((deal) => deal.stage === "Won");
assert.ok(wonDeal, "ดีลที่ปิดได้แล้วต้องกลับมาเป็นขั้น Won ไม่ใช่ถูกรีเซ็ตเป็น New");
assert.ok(wonDeal.value > 0, "มูลค่าดีลต้องไม่หายกลายเป็น 0 ตอนนำเข้ากลับ");
assert.ok(workbookApplied.state.products.every((product) => product.price > 0), "ราคาข้อเสนอต้องไม่หายกลายเป็น 0 ตอนนำเข้ากลับ");
assert.ok(workbookApplied.state.leads.some((lead) => lead.status !== "New Lead"), "สถานะ Lead ต้องกลับมาตามเดิม ไม่ใช่รีเซ็ตเป็น New Lead ทั้งหมด");

// นำเข้าไฟล์เดิมซ้ำต้องอัปเดตของเดิม ไม่ใช่โคลนข้อมูลทั้งระบบเป็นสองชุด
const workbookAgain = applyImportPlan(
  workbookApplied.state,
  buildImportPlan(parsedReport, { collection: "all", businessProfile: seeded.businessProfile, state: workbookApplied.state })
);
assert.equal(workbookAgain.state.customers.length, seeded.customers.length, "นำเข้าไฟล์เดิมซ้ำต้องไม่สร้างลูกค้าซ้ำ");
assert.equal(workbookAgain.state.deals.length, seeded.deals.length, "นำเข้าไฟล์เดิมซ้ำต้องไม่สร้างดีลซ้ำ");
assert.equal(workbookAgain.stats.created, 0, "นำเข้าไฟล์เดิมซ้ำต้องเป็นการอัปเดตล้วน");

// ── Set Zero แล้วนำเข้ากลับ ต้องได้ค่าเดิมทุกช่อง ────────────────────────────
//
// นี่คือเส้นทางที่ผู้ใช้เดินจริงตอนกู้ข้อมูล: ล้างระบบ แล้วนำไฟล์รายงานกลับเข้ามา
// จำนวนรายการเท่าเดิมยังไม่พอ ถ้าเป้ารายได้กลายเป็น 0 หรือข้อเสนอ Onsite กลายเป็น Online
// ผู้ใช้จะเห็นตัวเลขครบแต่ตัดสินใจผิด ซึ่งแย่กว่าเห็นว่าข้อมูลหายไปตรง ๆ
const { createZeroState } = await import("../app/business-workflows.js");
const { normalizeState } = await import("../app/state-model.js");

let restored = normalizeState(createZeroState());
assert.equal(restored.customers.length, 0, "Set Zero ต้องล้างข้อมูลจริง");
assert.equal(restored.businessProfile.revenueTarget, 0, "Set Zero ต้องล้างเป้ารายได้ด้วย");

const restorePlan = buildImportPlan(parsedReport, { collection: "all", businessProfile: restored.businessProfile, state: restored });
restored = normalizeState(applyImportPlan(restored, restorePlan).state);

for (const key of ["businessName", "businessMode", "businessCategory", "businessAvatar", "revenueTarget"]) {
  assert.deepEqual(restored.businessProfile[key], seeded.businessProfile[key],
    `โปรไฟล์ธุรกิจช่อง ${key} ต้องกลับมาเหมือนเดิมหลัง Set Zero แล้วนำเข้าไฟล์รายงาน`);
}
for (const product of seeded.products) {
  const match = restored.products.find((item) => item.name === product.name);
  assert.ok(match, `ข้อเสนอ ${product.name} ต้องกลับมา`);
  for (const key of ["price", "cost", "category", "pipelineStage", "businessMode", "businessCategory", "status"]) {
    assert.deepEqual(match[key], product[key], `ข้อเสนอ ${product.name} ช่อง ${key} ต้องกลับมาเหมือนเดิม`);
  }
}
for (const customer of seeded.customers) {
  const match = restored.customers.find((item) => item.fullName === customer.fullName);
  assert.equal(match?.createdAt, customer.createdAt, `วันที่เริ่มเป็นลูกค้าของ ${customer.fullName} ต้องไม่ถูกแทนด้วยวันที่กดนำเข้า`);
}
for (const deal of seeded.deals) {
  const match = restored.deals.find((item) => item.name === deal.name);
  assert.deepEqual([match?.value, match?.stage, match?.probability], [deal.value, deal.stage, deal.probability], `ดีล ${deal.name} ต้องกลับมาเหมือนเดิม`);
}

// ไฟล์ที่ผู้ใช้ export ไปแล้วก่อนมีชีตข้อมูลดิบของข้อเสนอ ต้องยังนำเข้าได้อยู่
// ลิงก์และไฟล์ที่ส่งออกไปแล้วอยู่ในมือคนอื่น การทำให้มันใช้ไม่ได้คือความเสียหายที่มองไม่เห็น
const legacySheets = parsedReport.sheets.filter((sheet) => sheet.name !== "ข้อมูลข้อเสนอ" && sheet.name !== "ตั้งค่าธุรกิจ");
const legacyPlan = buildImportPlan({ kind: "rows", sheets: legacySheets, format: "xlsx" }, {
  collection: "all", businessProfile: seeded.businessProfile, state: blankState
});
const legacyRoutes = Object.fromEntries(legacyPlan.steps.map((step) => [step.name, step.collection]));
assert.equal(legacyRoutes["ข้อเสนอและกำไร"], "products", "ไฟล์รุ่นเก่าที่ไม่มีชีตข้อมูลข้อเสนอ ต้องยังอ่านข้อเสนอจากชีตวิเคราะห์ได้");
const legacyApplied = applyImportPlan(blankState, legacyPlan);
assert.equal(legacyApplied.state.products.length, seeded.products.length, "ไฟล์รุ่นเก่าต้องยังนำเข้าข้อเสนอได้ครบ");
assert.equal(legacyApplied.state.deals.length, seeded.deals.length, "ไฟล์รุ่นเก่าต้องยังนำเข้าดีลได้ครบ");
// แต่พอมีชีตใหม่แล้ว ชีตวิเคราะห์ต้องถูกข้าม ไม่งั้นข้อเสนอชุดเดียวจะถูกนำเข้าสองรอบ
assert.equal(
  workbookPlan.skipped.some((sheet) => sheet.name === "ข้อเสนอและกำไร"), true,
  "เมื่อไฟล์มีชีตข้อมูลข้อเสนอแล้ว ชีตวิเคราะห์ต้องถูกข้ามเพื่อไม่ให้นำเข้าซ้ำ"
);

console.log(`Data import passed: JSON, CSV, XLS/XLSX, Markdown, DOC/DOCX, header detection, Set Zero restore fidelity and legacy-file compatibility (${parsedReport.sheets.length} sheets)`);
