import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  supportedImportExtensions,
  parseCsvText,
  parseMarkdownText,
  parseImportFile,
  buildImportPlan,
  applyImportPlan
} from "../app/data-import.js";

for (const extension of ["json", "csv", "tsv", "xls", "xlsx", "md", "txt", "doc", "docx"]) {
  assert.ok(supportedImportExtensions.includes(extension), `ต้องรองรับไฟล์ .${extension}`);
}

const csvRows = parseCsvText("ชื่อลูกค้า,เบอร์โทร,ช่องทาง,ความต้องการ\nร้านเหนือ,081-111-2222,Facebook,เพิ่มยอดขาย\n\"บริษัท, ไทย\",02-111-2222,Website,ระบบ CRM");
assert.equal(csvRows.length, 2, "CSV ต้องอ่านจำนวนแถวถูกต้อง");
assert.equal(csvRows[1]["ชื่อลูกค้า"], "บริษัท, ไทย", "CSV ต้องอ่านค่าที่มี comma ใน quote ได้");

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

console.log("Data import passed: JSON, CSV, XLS/XLSX, Markdown, DOC/DOCX and relational mapping");
