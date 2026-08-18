// ตรวจว่าไฟล์ Template ที่ scripts/build-import-templates.mjs สร้าง นำเข้าระบบได้จริง
//
// ไม่ได้ตรวจแค่ว่า "ไฟล์เปิดได้" แต่รันตัวนำเข้าตัวเดียวกับที่แอปใช้ ตั้งแต่อ่านไฟล์
// จนถึงลง state แล้วเทียบทุกช่องกับข้อมูลต้นทางใน scripts/import-template-data.mjs
// เพราะบทเรียนจากไฟล์รายงานรุ่นเก่าคือ "จำนวนครบ" ไม่ได้แปลว่า "ค่าถูก"

import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { buildTemplateWorkbook, templateSkippedSheets } from "./build-import-templates.mjs";
import { coffeeShop, blankTemplate } from "./import-template-data.mjs";
import { parseImportFile, buildImportPlan, applyImportPlan } from "../app/data-import.js";
import { createZeroState } from "../app/business-workflows.js";
import { normalizeState } from "../app/state-model.js";
import { buildInsightReport } from "../app/business-insights.js";

async function importTemplate(data) {
  const workbook = await buildTemplateWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const file = {
    name: data.fileName,
    size: buffer.byteLength,
    arrayBuffer: async () => buffer,
    text: async () => ""
  };
  const parsed = await parseImportFile(file, { xlsx: XLSX });
  // เริ่มจาก Set Zero ทุกครั้ง เพื่อพิสูจน์ว่าไฟล์นี้ใช้ตั้งต้นระบบเปล่าได้จริง
  const zero = normalizeState(createZeroState());
  const plan = buildImportPlan(parsed, { collection: "all", businessProfile: zero.businessProfile, state: zero });
  const applied = applyImportPlan(zero, plan);
  return { parsed, plan, state: normalizeState(applied.state), stats: applied.stats };
}

// ---------- ไฟล์ตัวอย่างร้านกาแฟ ----------
const cafe = await importTemplate(coffeeShop);

for (const name of templateSkippedSheets) {
  assert.ok(
    cafe.plan.skipped.some((sheet) => sheet.name === name),
    `แผ่น "${name}" ต้องถูกข้ามตอนนำเข้า ไม่งั้นคำอธิบายวิธีใช้จะกลายเป็นข้อมูลจริงในระบบ`
  );
}
assert.equal(cafe.plan.steps.length, 6, "ต้องนำเข้าครบทั้ง 6 แผ่นข้อมูล");
assert.deepEqual(
  cafe.plan.steps.map((step) => step.collection),
  ["profile", "products", "customers", "leads", "deals", "tasks"],
  "ต้องเรียงลำดับนำเข้าตาม dependency ไม่งั้นดีลจะหาลูกค้าไม่เจอ"
);

// หัวตารางอยู่แถวที่ 4 เสมอ เลขแถวที่ระบบรายงานตอนตีตกจึงต้องเริ่มที่ 5
for (const step of cafe.plan.steps) {
  assert.equal(step.firstDataRow, 5, `แผ่น ${step.name} ต้องเริ่มนับข้อมูลที่แถว 5 ให้ตรงกับที่เห็นใน Excel`);
}

assert.deepEqual(
  cafe.state.businessProfile.businessName, coffeeShop.profile.businessName,
  "ชื่อธุรกิจต้องเข้าระบบ ไม่ใช่ค้างเป็น \"ยังไม่ได้ตั้งชื่อธุรกิจ\""
);
assert.equal(cafe.state.businessProfile.revenueTarget, 150000, "เป้ารายได้ต้องเป็น 150,000 ไม่ใช่ 0");
assert.equal(cafe.state.businessProfile.businessMode, "onsite", "รูปแบบธุรกิจต้องแปลงจากป้าย Onsite เป็นคีย์ onsite");
assert.equal(cafe.state.businessProfile.businessCategory, "restaurant", "หมวดธุรกิจต้องแปลงจากป้าย \"ร้านอาหาร / คาเฟ่\" เป็นคีย์ restaurant");

assert.equal(cafe.state.products.length, coffeeShop.products.length, "ข้อเสนอต้องเข้าครบทุกรายการ");
const drinkCount = cafe.state.products.filter((item) => item.category === "เครื่องดื่ม").length;
const bakeryCount = cafe.state.products.filter((item) => item.category === "เบเกอรี่").length;
assert.ok(drinkCount >= 10, `เครื่องดื่มต้องมีอย่างน้อย 10 รายการ พบ ${drinkCount}`);
assert.ok(bakeryCount >= 10, `เบเกอรี่ต้องมีอย่างน้อย 10 รายการ พบ ${bakeryCount}`);

const stageKeys = { "รับโอกาสธุรกิจใหม่": "New", "ตรวจคุณภาพและความต้องการ": "Qualified", "ออกแบบและส่งข้อเสนอ": "Proposal", "เจรจาเพื่อการตัดสินใจ": "Negotiation", "ชนะดีล / เริ่มส่งมอบ": "Won", "ไม่เดินหน้าต่อ": "Lost" };
const modeKeys = { Online: "online", Onsite: "onsite", Wholesale: "wholesale", Retail: "retail" };

for (const [name, category, price, cost, mode, stage, status, description, reason] of coffeeShop.products) {
  const product = cafe.state.products.find((item) => item.name === name);
  assert.ok(product, `ข้อเสนอ "${name}" ต้องเข้าระบบ`);
  assert.equal(product.category, category, `ข้อเสนอ "${name}" หมวดต้องตรง — หมวดเป็นค่าที่ผู้ใช้ตั้งเอง ห้ามระบบเปลี่ยนให้`);
  assert.equal(product.price, price, `ข้อเสนอ "${name}" ราคาขายต้องตรง`);
  assert.equal(product.cost, cost, `ข้อเสนอ "${name}" ต้นทุนต้องตรง`);
  assert.equal(product.businessMode, modeKeys[mode], `ข้อเสนอ "${name}" รูปแบบธุรกิจต้องตรง`);
  assert.equal(product.pipelineStage, stageKeys[stage], `ข้อเสนอ "${name}" ขั้น Pipeline ต้องตรง`);
  assert.equal(product.status, status === "ปิดขาย" ? "inactive" : "active", `ข้อเสนอ "${name}" สถานะต้องตรง`);
  assert.equal(product.description, description, `ข้อเสนอ "${name}" คำอธิบายต้องตรง`);
  assert.equal(product.recommendationReason, reason, `ข้อเสนอ "${name}" เหตุผลแนะนำต้องตรง`);
}

assert.equal(cafe.state.customers.length, coffeeShop.customers.length, "ลูกค้าต้องเข้าครบทุกราย");
for (const [fullName, phone, source, customerType, offer, interest, createdAt] of coffeeShop.customers) {
  const customer = cafe.state.customers.find((item) => item.fullName === fullName);
  assert.ok(customer, `ลูกค้า "${fullName}" ต้องเข้าระบบ`);
  assert.equal(customer.phone, phone, `ลูกค้า "${fullName}" เบอร์โทรต้องตรง`);
  assert.equal(customer.source, source, `ลูกค้า "${fullName}" ช่องทางที่มาต้องตรง — ช่องนี้ผู้ใช้พิมพ์เองได้`);
  assert.equal(customer.customerType, customerType, `ลูกค้า "${fullName}" ประเภทลูกค้าต้องตรง`);
  assert.equal(customer.interest, interest, `ลูกค้า "${fullName}" ความต้องการต้องตรง`);
  assert.equal(customer.createdAt, createdAt, `ลูกค้า "${fullName}" วันที่เริ่มเป็นลูกค้าต้องเป็นวันที่ในไฟล์ ไม่ใช่วันที่กดนำเข้า`);
  assert.equal(customer.solutionPackage, offer, `ลูกค้า "${fullName}" ข้อเสนอที่สนใจต้องตรง`);
  assert.ok(customer.solutionPackageId, `ลูกค้า "${fullName}" ต้องผูกกับข้อเสนอในระบบได้ ไม่ใช่เก็บไว้แค่ชื่อ`);
}

assert.equal(cafe.state.leads.length, coffeeShop.leads.length, "Lead ต้องมีเท่าจำนวนในไฟล์ ไม่ใช่ซ้ำจากลูกค้าอีกชุด");
const leadStatusKeys = { "ลูกค้าใหม่": "New Lead", "ติดต่อแล้ว": "Contacted", "สนใจ": "Interested", "ส่งข้อเสนอแล้ว": "Proposal Sent" };
for (const [customerName, status, owner, score, followUp] of coffeeShop.leads) {
  const customer = cafe.state.customers.find((item) => item.fullName === customerName);
  const lead = cafe.state.leads.find((item) => item.customerId === customer.id);
  assert.ok(lead, `Lead ของ "${customerName}" ต้องเข้าระบบ`);
  assert.equal(lead.status, leadStatusKeys[status], `Lead ของ "${customerName}" ขั้นปัจจุบันต้องตรง ไม่ใช่ถูกทับด้วยค่าเริ่มต้น`);
  assert.equal(lead.assignedTo, owner, `Lead ของ "${customerName}" ผู้รับผิดชอบต้องตรง`);
  assert.equal(lead.leadScore, score, `Lead ของ "${customerName}" คะแนนความสนใจต้องตรง ไม่ใช่ค่าเริ่มต้น 50`);
  assert.equal(lead.nextFollowUp, followUp, `Lead ของ "${customerName}" วันนัดติดตามต้องตรง`);
}

assert.equal(cafe.state.deals.length, coffeeShop.deals.length, "ดีลต้องเข้าครบ");
for (const [name, customerName, offerName, value, stage, probability] of coffeeShop.deals) {
  const deal = cafe.state.deals.find((item) => item.name === name);
  assert.ok(deal, `ดีล "${name}" ต้องเข้าระบบ`);
  const customer = cafe.state.customers.find((item) => item.id === deal.customerId);
  assert.equal(customer?.fullName, customerName, `ดีล "${name}" ต้องผูกกับลูกค้าที่ถูกคน`);
  assert.equal(deal.offerName, offerName, `ดีล "${name}" ต้องผูกกับข้อเสนอที่ถูกตัว`);
  assert.ok(deal.productId, `ดีล "${name}" ต้องอ้างรหัสข้อเสนอจริง ไม่ใช่เก็บแค่ชื่อ`);
  assert.equal(deal.value, value, `ดีล "${name}" มูลค่าต้องตรง`);
  assert.equal(deal.stage, stageKeys[stage], `ดีล "${name}" ขั้นต้องตรง`);
  assert.equal(deal.probability, probability, `ดีล "${name}" โอกาสปิดต้องตรง`);
}

assert.equal(cafe.state.tasks.length, coffeeShop.tasks.length, "งานติดตามต้องเข้าครบ");
const taskStatusKeys = { "รอดำเนินการ": "todo", "กำลังทำ": "in_progress", "เสร็จแล้ว": "done", "เลยกำหนด": "overdue" };
const priorityKeys = { "สูง": "High", "ปานกลาง": "Medium", "ต่ำ": "Low" };
for (const [title, owner, dueDate, priority, status] of coffeeShop.tasks) {
  const task = cafe.state.tasks.find((item) => item.title === title);
  assert.ok(task, `งาน "${title}" ต้องเข้าระบบ`);
  assert.equal(task.owner, owner, `งาน "${title}" ผู้รับผิดชอบต้องตรง`);
  assert.equal(task.dueDate, dueDate, `งาน "${title}" กำหนดส่งต้องตรง`);
  assert.equal(task.priority, priorityKeys[priority], `งาน "${title}" ความสำคัญต้องตรง`);
  assert.equal(task.status, taskStatusKeys[status], `งาน "${title}" สถานะต้องตรง`);
}

assert.deepEqual(cafe.plan.rejected, [], "ไฟล์ตัวอย่างต้องไม่มีแถวไหนถูกตีตกเลย");

// ตัวเลขบนหน้าภาพรวมต้องออกมาเป็นเรื่องที่เจ้าของร้านอ่านรู้เรื่อง ไม่ใช่ 0 ทุกช่อง
const report = buildInsightReport(cafe.state, "2026-08-18");
const wonTotal = coffeeShop.deals.filter(([, , , , stage]) => stage === "ชนะดีล / เริ่มส่งมอบ").reduce((sum, [, , , value]) => sum + value, 0);
assert.equal(report.revenueGap.target, 150000, "เป้ารายได้ในรายงานต้องเป็น 150,000");
assert.equal(report.revenueGap.achieved, wonTotal, `รายได้ที่ปิดได้ต้องเท่ากับดีลที่ชนะรวมกัน (${wonTotal})`);
assert.ok(report.revenueGap.gap > 0, "ตัวอย่างต้องยังไม่ถึงเป้า เพื่อให้เห็นว่าระบบชี้ช่องว่างได้");
assert.ok(report.forecast.weighted > 0, "Pipeline ถ่วงน้ำหนักต้องมีค่า ไม่งั้นหน้าคาดการณ์จะว่าง");

// ---------- ไฟล์แบบฟอร์มเปล่า ----------
const blank = await importTemplate(blankTemplate);

for (const name of templateSkippedSheets) {
  assert.ok(blank.plan.skipped.some((sheet) => sheet.name === name), `แบบฟอร์มเปล่า: แผ่น "${name}" ต้องถูกข้าม`);
}
assert.deepEqual(
  blank.plan.steps.map((step) => step.collection),
  ["profile", "products", "customers", "leads", "deals", "tasks"],
  "แบบฟอร์มเปล่าต้องถูกจัดเส้นทางครบทั้ง 6 ชุดข้อมูล ทั้งที่ยังไม่มีแถวข้อมูล"
);
// แถวว่างที่จัดรูปแบบไว้ล่วงหน้าต้องไม่กลายเป็นข้อมูลขยะ
for (const key of ["customers", "leads", "products", "deals", "tasks"]) {
  assert.equal(blank.state[key].length, 0, `แบบฟอร์มเปล่าต้องไม่สร้าง ${key} ขึ้นมาเอง`);
}
assert.equal(blank.state.businessProfile.revenueTarget, 0, "แบบฟอร์มเปล่าต้องไม่ไปทับเป้ารายได้");
assert.deepEqual(blank.plan.rejected, [], "แบบฟอร์มเปล่าต้องไม่มีแถวถูกตีตก");

// หัวตารางของแบบฟอร์มเปล่าต้องสะกดตรงกับไฟล์ตัวอย่างทุกตัวอักษร
// ถ้าสองไฟล์หลุดจากกัน คนกรอกจะเจอว่าไฟล์ตัวอย่างนำเข้าได้แต่ไฟล์ที่ตัวเองกรอกไม่เข้า
for (const sheet of blank.parsed.sheets) {
  const twin = cafe.parsed.sheets.find((item) => item.name === sheet.name);
  assert.ok(twin, `แผ่น "${sheet.name}" ต้องมีในไฟล์ตัวอย่างด้วย`);
  assert.equal(sheet.headerRow, twin.headerRow, `แผ่น "${sheet.name}" ต้องวางหัวตารางแถวเดียวกันทั้งสองไฟล์`);
}

console.log(`Import template contract passed: ${cafe.state.products.length} ข้อเสนอ (เครื่องดื่ม ${drinkCount} · เบเกอรี่ ${bakeryCount}), ${cafe.state.customers.length} ลูกค้า, ${cafe.state.leads.length} lead, ${cafe.state.deals.length} ดีล, ${cafe.state.tasks.length} งาน · รายได้ ${report.revenueGap.achieved.toLocaleString()}/${report.revenueGap.target.toLocaleString()} บาท · แบบฟอร์มเปล่านำเข้าแล้วได้ 0 รายการตามที่ควรเป็น`);
