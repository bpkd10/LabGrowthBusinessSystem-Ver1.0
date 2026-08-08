// ตรวจว่าไฟล์รายงาน Excel ที่ระบบสร้างมีชีตครบ มีข้อมูลจริง และจัดรูปแบบไว้จริง
//
// สร้าง workbook ขึ้นมาแล้วอ่านค่ากลับจากตัว workbook เอง ไม่ได้เช็คแค่ว่า "ไม่ throw"
// เพราะไฟล์ที่เปิดได้แต่ข้างในว่างเปล่าคือความล้มเหลวที่เงียบที่สุด
//
// app/report-export.js โหลด ExcelJS ผ่าน <script> ตอนรันในเบราว์เซอร์ ที่นี่จึงต้องวาง
// ไลบรารีไว้ที่ globalThis ก่อน import เพื่อให้โค้ดเส้นทางเดียวกันทำงานได้ใน Node

import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import ExcelJS from "exceljs";

globalThis.ExcelJS = ExcelJS;

const root = resolve(import.meta.dirname, "..");
const { buildReportWorkbook } = await import("../app/report-export.js");
const { loadStateFrom } = await import("../app/state-model.js");
const { STORAGE_KEY } = await import("../app/business-config.js");

let passed = 0;
function check(label, run) {
  run();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const state = loadStateFrom({ getItem: () => null }, STORAGE_KEY);
const { workbook, report } = await buildReportWorkbook(state, "2026-08-09");

const EXPECTED_SHEETS = [
  "สรุปผู้บริหาร",
  "คิวติดตาม",
  "ข้อเสนอและกำไร",
  "ช่องทางการตลาด",
  "Customer Journey",
  "งานค้างและความเสี่ยง",
  "ข้อมูลลูกค้า",
  "Lead",
  "ดีล",
  "งานติดตาม"
];

check("มีชีตครบทุกหัวข้อตามที่ออกแบบไว้", () => {
  const names = workbook.worksheets.map((sheet) => sheet.name);
  assert.deepEqual(names, EXPECTED_SHEETS);
});

check("ทุกชีตมีเนื้อหาจริง ไม่ใช่ชีตเปล่า", () => {
  for (const sheet of workbook.worksheets) {
    assert.ok(sheet.rowCount >= 4, `ชีต ${sheet.name} มีแค่ ${sheet.rowCount} แถว น่าจะไม่มีข้อมูล`);
    assert.ok(sheet.columnCount >= 2, `ชีต ${sheet.name} มีคอลัมน์น้อยผิดปกติ`);
  }
});

check("หัวเรื่องและหัวตารางถูกใส่สีตาม CI จริง", () => {
  for (const sheet of workbook.worksheets) {
    const titleFill = sheet.getRow(1).getCell(1).fill;
    assert.equal(titleFill?.type, "pattern", `ชีต ${sheet.name} ไม่ได้ใส่สีพื้นหัวเรื่อง`);
    assert.equal(titleFill.fgColor.argb, "FF17171F", `ชีต ${sheet.name} ใช้สีหัวเรื่องไม่ตรงกับ CI`);
    assert.ok(sheet.getRow(1).getCell(1).font?.bold, `ชีต ${sheet.name} หัวเรื่องไม่ได้เป็นตัวหนา`);
  }
});

check("ทุกชีตตรึงแถวหัวตารางไว้ ตารางยาวจึงยังอ่านออก", () => {
  for (const sheet of workbook.worksheets) {
    const frozen = (sheet.views || []).some((view) => view.state === "frozen" && view.ySplit > 0);
    assert.ok(frozen, `ชีต ${sheet.name} ไม่ได้ตรึงหัวตาราง`);
  }
});

check("ทุกชีตกำหนดความกว้างคอลัมน์ไว้ ไม่ปล่อยให้ข้อความล้น", () => {
  for (const sheet of workbook.worksheets) {
    const widths = sheet.columns.map((column) => column.width).filter(Boolean);
    assert.ok(widths.length > 0, `ชีต ${sheet.name} ไม่ได้ตั้งความกว้างคอลัมน์`);
    assert.ok(widths.every((width) => width >= 8), `ชีต ${sheet.name} มีคอลัมน์แคบเกินอ่าน`);
  }
});

check("ตัวเลขเงินถูกจัดรูปแบบเป็นสกุลเงิน ไม่ใช่เลขดิบ", () => {
  const deals = workbook.getWorksheet("ดีล");
  assert.match(deals.getColumn(4).numFmt || "", /บาท/, "คอลัมน์มูลค่าดีลไม่ได้จัดรูปแบบเป็นเงินบาท");
  const offers = workbook.getWorksheet("ข้อเสนอและกำไร");
  assert.match(offers.getColumn(3).numFmt || "", /บาท/, "คอลัมน์ราคาขายไม่ได้จัดรูปแบบเป็นเงินบาท");
  assert.match(offers.getColumn(6).numFmt || "", /%/, "คอลัมน์กำไรเปอร์เซ็นต์ไม่ได้จัดรูปแบบเป็นเปอร์เซ็นต์");
});

check("ข้อมูลดิบในรายงานตรงกับจำนวนที่มีในระบบ", () => {
  const customers = workbook.getWorksheet("ข้อมูลลูกค้า");
  // 3 แถวหัวเรื่อง + 1 แถวหัวตาราง + จำนวนลูกค้า
  assert.equal(customers.rowCount, 4 + state.customers.length, "จำนวนแถวลูกค้าในรายงานไม่ตรงกับในระบบ");
  const deals = workbook.getWorksheet("ดีล");
  assert.equal(deals.rowCount, 4 + state.deals.length, "จำนวนแถวดีลในรายงานไม่ตรงกับในระบบ");
});

check("รายงานไม่มีเบอร์โทรของลูกค้าหลุดไปอยู่ชีตวิเคราะห์", () => {
  const phones = state.customers.map((customer) => customer.phone).filter(Boolean);
  // ชีต "ข้อมูลลูกค้า" มีเบอร์โทรโดยตั้งใจ เพราะเป็นสำเนาข้อมูลของเจ้าของเอง
  // แต่ชีตวิเคราะห์ที่มักถูกส่งต่อให้ทีมหรือที่ปรึกษาไม่ควรมี
  const analysisSheets = EXPECTED_SHEETS.slice(0, 6);
  for (const name of analysisSheets) {
    const sheet = workbook.getWorksheet(name);
    let text = "";
    sheet.eachRow((row) => row.eachCell((cell) => { text += String(cell.value ?? ""); }));
    for (const phone of phones) {
      assert.ok(!text.includes(phone), `ชีต ${name} มีเบอร์โทร ${phone} หลุดออกมา`);
    }
  }
});

check("ทุกชีตวิเคราะห์อธิบายที่มาของตัวเลขไว้ใต้หัวเรื่อง", () => {
  for (const name of EXPECTED_SHEETS.slice(0, 6)) {
    const sheet = workbook.getWorksheet(name);
    const subtitle = String(sheet.getRow(2).getCell(1).value ?? "").trim();
    assert.ok(subtitle.length > 10, `ชีต ${name} ไม่มีคำอธิบายที่มาของตัวเลข`);
  }
});

const buffer = await workbook.xlsx.writeBuffer();

check("เขียนไฟล์ .xlsx ออกมาได้จริงและมีขนาดสมเหตุสมผล", () => {
  assert.ok(buffer.byteLength > 8000, `ไฟล์เล็กผิดปกติ (${buffer.byteLength} bytes) น่าจะไม่มีเนื้อหา`);
  // ไฟล์ xlsx คือ zip จึงต้องขึ้นต้นด้วยลายเซ็น PK
  const header = Buffer.from(buffer.slice(0, 2));
  assert.equal(header.toString("latin1"), "PK", "ไฟล์ที่ได้ไม่ใช่ .xlsx ที่ถูกต้อง");
});

if (process.env.WRITE_SAMPLE) {
  await writeFile(resolve(root, "outputs/ตัวอย่างรายงานวิเคราะห์ธุรกิจ.xlsx"), Buffer.from(buffer));
  console.log("  · เขียนไฟล์ตัวอย่างไว้ที่ outputs/");
}

console.log(`Report export passed: ${passed} assertions, ${workbook.worksheets.length} sheets, ${Math.round(buffer.byteLength / 1024)} KB (ธุรกิจ: ${report.businessName})`);
