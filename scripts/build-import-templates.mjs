// สร้างไฟล์ Excel Template สำหรับ "นำเข้าข้อมูลทั้งไฟล์" ของระบบ
//
// ชื่อแผ่นงานและข้อความหัวตารางในไฟล์นี้ต้องตรงกับที่ app/data-import.js รู้จักทุกตัวอักษร
// เพราะระบบจับคู่ข้อมูลจากสองอย่างนี้เท่านั้น ไม่ได้ดูตำแหน่งคอลัมน์
// scripts/check-import-templates.mjs จะรันตัวนำเข้าจริงกับไฟล์ที่สร้างจากที่นี่
// ถ้าใครแก้ชื่อหัวตารางในไฟล์นี้แล้วระบบอ่านไม่ได้ ตัวตรวจจะฟ้องทันที
//
// รูปแบบหน้าตาไฟล์จงใจทำให้เหมือนรายงานที่ระบบส่งออก (แถบดำ-ส้ม ฟอนต์ Tahoma
// หัวตารางแถวที่ 4) เพื่อให้ผู้ใช้เห็นว่าไฟล์กรอกเข้ากับไฟล์รายงานเป็นชุดเดียวกัน

import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { businessCategories, businessModes, dealStageLabels, leadStatusLabels, taskStatusLabels, priorityLabels } from "../app/business-config.js";
import { coffeeShop, blankTemplate } from "./import-template-data.mjs";

// สี CI ชุดเดียวกับ app/report-export.js — ปรับให้เข้ากับฟอร์มกรอกโดยเพิ่มโทนอ่อน
// สำหรับ "ช่องที่ต้องกรอก" ให้ผู้ใช้เห็นด้วยตาว่าต้องพิมพ์ตรงไหน
const BRAND = {
  ink: "FF17171F",
  orange: "FFFF6B1A",
  orangeDeep: "FFC34500",
  soft: "FFFEE9CE",
  white: "FFFFFFFF",
  grey: "FFF4F5F7",
  greyLine: "FFD8DBE0",
  slate: "FF4A4A57"
};

const MONEY = "#,##0 \"บาท\"";
const PERCENT = "0\"%\"";
const BLANK_ROW_COUNT = 200;

// รายการค่าที่ระบบยอมรับ ดึงจาก app/business-config.js ตัวจริง ไม่ได้พิมพ์ซ้ำ
// ถ้าวันหนึ่งมีการเพิ่มขั้น Pipeline หรือหมวดธุรกิจ Dropdown ในไฟล์จะตามให้เอง
const VALUE_LISTS = [
  ["mode", "ค่าที่ใช้ได้ — รูปแบบธุรกิจ", Object.values(businessModes).map((mode) => mode.label)],
  ["category", "ค่าที่ใช้ได้ — หมวดธุรกิจ", Object.values(businessCategories)],
  ["stage", "ค่าที่ใช้ได้ — ขั้น Pipeline และขั้นดีล", Object.values(dealStageLabels)],
  ["leadStatus", "ค่าที่ใช้ได้ — ขั้นปัจจุบันของ Lead", Object.values(leadStatusLabels)],
  ["taskStatus", "ค่าที่ใช้ได้ — สถานะงาน", Object.values(taskStatusLabels)],
  ["priority", "ค่าที่ใช้ได้ — ความสำคัญ", Object.values(priorityLabels)],
  ["offerStatus", "ค่าที่ใช้ได้ — สถานะข้อเสนอ", ["เปิดขาย", "ปิดขาย"]]
];

const REFERENCE_SHEET = "ค่าที่ระบบรู้จัก";
const GUIDE_SHEET = "วิธีใช้ไฟล์นี้";

// แผ่นงานข้อมูล เรียงตามลำดับที่คนกรอกควรกรอก (ตั้งค่า → ของที่ขาย → คนซื้อ → งาน)
// ระบบจะจัดลำดับนำเข้าตาม dependency ให้เองอยู่แล้ว ลำดับในไฟล์จึงเลือกเพื่อคนอ่านได้
const SHEETS = [
  {
    key: "profile",
    name: "ตั้งค่าธุรกิจ",
    title: "ตั้งค่าธุรกิจ",
    subtitle: "กรอกแถวเดียวพอ · ระบบใช้แผ่นนี้ตั้งชื่อธุรกิจและแถบเป้าหมายบนหน้าภาพรวม",
    headers: ["ชื่อธุรกิจ", "รูปแบบธุรกิจ", "หมวดธุรกิจ", "เป้ารายได้"],
    widths: [34, 20, 30, 20],
    required: [1, 4],
    money: [4],
    lists: { 2: "mode", 3: "category" },
    blankRows: 1,
    rows: (data) => (data.profile.businessName || data.profile.revenueTarget
      ? [[data.profile.businessName, data.profile.businessMode, data.profile.businessCategory, data.profile.revenueTarget]]
      : [])
  },
  {
    key: "products",
    name: "ข้อมูลข้อเสนอ",
    title: "ข้อเสนอ / เมนู / สินค้าที่ขาย",
    subtitle: "หนึ่งแถวคือหนึ่งอย่างที่ขายได้ · ราคาขายกับต้นทุนใส่เป็นตัวเลขล้วน ไม่ต้องพิมพ์คำว่าบาท",
    headers: ["ชื่อข้อเสนอ", "หมวด", "ราคาขาย", "ต้นทุน", "รูปแบบธุรกิจ", "ขั้น Pipeline", "สถานะ", "คำอธิบาย", "เหตุผลแนะนำ"],
    widths: [34, 16, 14, 14, 16, 26, 12, 44, 38],
    required: [1, 3],
    money: [3, 4],
    lists: { 5: "mode", 6: "stage", 7: "offerStatus" },
    rows: (data) => data.products
  },
  {
    key: "customers",
    name: "ข้อมูลลูกค้า",
    title: "ลูกค้าและผู้ที่สนใจ",
    subtitle: "ช่อง \"ข้อเสนอที่สนใจ\" ต้องพิมพ์ชื่อให้ตรงกับแผ่น \"ข้อมูลข้อเสนอ\" ระบบจึงจะผูกให้อัตโนมัติ",
    headers: ["ชื่อลูกค้า", "เบอร์โทร", "ช่องทางที่มา", "ประเภทลูกค้า", "ข้อเสนอที่สนใจ", "ความต้องการ", "วันที่เริ่มเป็นลูกค้า"],
    widths: [32, 16, 20, 22, 34, 46, 20],
    required: [1],
    rows: (data) => data.customers
  },
  {
    key: "leads",
    name: "Lead",
    title: "สถานะการติดตามลูกค้าแต่ละราย",
    subtitle: "ชื่อในช่อง \"ลูกค้า\" ต้องตรงกับแผ่น \"ข้อมูลลูกค้า\" ถ้าไม่ตรง ระบบจะตีตกแถวนั้นและบอกเลขแถวให้",
    headers: ["ลูกค้า", "ขั้นปัจจุบัน", "ผู้รับผิดชอบ", "คะแนนความสนใจ", "นัดติดตามครั้งถัดไป"],
    widths: [32, 22, 22, 18, 24],
    required: [1],
    lists: { 2: "leadStatus" },
    rows: (data) => data.leads
  },
  {
    key: "deals",
    name: "ดีล",
    title: "ดีลและโอกาสทางธุรกิจ",
    subtitle: "ระบบคิดรายได้ที่ทำได้จากดีลขั้น \"ชนะดีล / เริ่มส่งมอบ\" เท่านั้น · ดีลขั้นอื่นนับเป็น Pipeline",
    headers: ["ชื่อดีล", "ลูกค้า", "ข้อเสนอ", "มูลค่า", "ขั้น", "โอกาสปิด (%)"],
    widths: [38, 32, 34, 18, 26, 16],
    required: [1, 2, 4],
    money: [4],
    percent: [6],
    lists: { 5: "stage" },
    rows: (data) => data.deals
  },
  {
    key: "tasks",
    name: "งานติดตาม",
    title: "งานที่ต้องทำและงานค้าง",
    subtitle: "กำหนดส่งพิมพ์เป็น ปี-เดือน-วัน เช่น 2026-08-31 · ระบบใช้วันนี้คำนวณงานที่เลยกำหนด",
    headers: ["งาน", "ผู้รับผิดชอบ", "กำหนดส่ง", "ความสำคัญ", "สถานะ"],
    widths: [48, 24, 18, 16, 20],
    required: [1],
    lists: { 4: "priority", 5: "taskStatus" },
    rows: (data) => data.tasks
  }
];

const GUIDE_ROWS = SHEETS.map((sheet) => [sheet.name, sheet.title, sheet.headers.filter((_, index) => (sheet.required || []).includes(index + 1)).join(" และ "), sheet.subtitle]);

function columnLetter(index) {
  let value = index;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - remainder) / 26);
  }
  return letters;
}

function styleTitle(sheet, text, subtitle, columnCount) {
  const titleRow = sheet.addRow([text]);
  titleRow.font = { name: "Tahoma", size: 16, bold: true, color: { argb: BRAND.white } };
  titleRow.height = 28;
  sheet.mergeCells(titleRow.number, 1, titleRow.number, columnCount);
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.ink } };
  titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const subtitleRow = sheet.addRow([subtitle]);
  subtitleRow.font = { name: "Tahoma", size: 10, color: { argb: BRAND.orangeDeep } };
  sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, columnCount);
  subtitleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.soft } };
  subtitleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  subtitleRow.height = 20;
  sheet.addRow([]);
}

// หัวตารางต้องอยู่แถวที่ 4 เท่ากับไฟล์รายงานของระบบ ตัวอ่านหาหัวตารางเองได้ก็จริง
// แต่การวางให้ตรงกันทำให้ไฟล์กรอกกับไฟล์รายงานสลับกันใช้ได้โดยไม่ต้องจำข้อยกเว้น
function styleHeader(sheet, headers, requiredColumns = []) {
  const row = sheet.addRow(headers);
  row.height = 26;
  row.eachCell((cell, index) => {
    const isRequired = requiredColumns.includes(index);
    cell.font = { name: "Tahoma", size: 10, bold: true, color: { argb: BRAND.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isRequired ? BRAND.orangeDeep : BRAND.slate } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND.ink } } };
  });
  sheet.views = [{ state: "frozen", ySplit: row.number }];
  return row;
}

function styleDataRow(row, { zebra = false, requiredColumns = [], empty = false } = {}) {
  row.eachCell({ includeEmpty: true }, (cell, index) => {
    const requiredTint = empty && requiredColumns.includes(index);
    cell.font = { name: "Tahoma", size: 10, color: { argb: BRAND.ink } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: requiredTint ? BRAND.soft : zebra ? BRAND.grey : BRAND.white } };
    cell.border = { bottom: { style: "hair", color: { argb: BRAND.greyLine } } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function addDataSheet(workbook, spec, data) {
  const sheet = workbook.addWorksheet(spec.name, { properties: { tabColor: { argb: BRAND.orange } } });
  sheet.columns = spec.widths.map((width) => ({ width }));
  styleTitle(sheet, spec.title, spec.subtitle, spec.headers.length);
  styleHeader(sheet, spec.headers, spec.required || []);

  const rows = spec.rows(data);
  rows.forEach((values, index) => {
    styleDataRow(sheet.addRow(values), { zebra: index % 2 === 1 });
  });

  // เว้นแถวว่างที่จัดรูปแบบไว้แล้วให้กรอกต่อได้ทันที ทั้งไฟล์ตัวอย่างและไฟล์เปล่า
  // ระบบตัดแถวที่ว่างทั้งแถวทิ้งตอนนำเข้าอยู่แล้ว แถวเปล่าจึงไม่กลายเป็นข้อมูลขยะ
  const blankCount = spec.blankRows ?? BLANK_ROW_COUNT - rows.length;
  const firstDataRow = sheet.rowCount + 1;
  for (let index = 0; index < Math.max(blankCount, 0); index += 1) {
    const row = sheet.addRow(new Array(spec.headers.length).fill(""));
    styleDataRow(row, { requiredColumns: spec.required || [], empty: true });
  }
  const lastRow = sheet.rowCount;

  for (const column of spec.money || []) sheet.getColumn(column).numFmt = MONEY;
  for (const column of spec.percent || []) sheet.getColumn(column).numFmt = PERCENT;

  for (const [column, listKey] of Object.entries(spec.lists || {})) {
    const listIndex = VALUE_LISTS.findIndex(([key]) => key === listKey);
    const values = VALUE_LISTS[listIndex][2];
    const letter = columnLetter(listIndex + 1);
    const formula = `'${REFERENCE_SHEET}'!$${letter}$5:$${letter}$${4 + values.length}`;
    for (let row = 5; row <= lastRow; row += 1) {
      sheet.getCell(`${columnLetter(Number(column))}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "ค่านี้ระบบยังไม่รู้จัก",
        error: "เลือกจากรายการเพื่อให้นำเข้าได้ตรงช่อง หรือดูค่าทั้งหมดที่แผ่น \"ค่าที่ระบบรู้จัก\""
      };
    }
  }

  // อ้าง firstDataRow ไว้ให้สคริปต์ตรวจใช้ยืนยันว่าหัวตารางอยู่แถว 4 จริง
  return { sheet, firstDataRow };
}

function addGuideSheet(workbook, data) {
  const sheet = workbook.addWorksheet(GUIDE_SHEET, { properties: { tabColor: { argb: BRAND.ink } } });
  sheet.columns = [{ width: 24 }, { width: 34 }, { width: 34 }, { width: 72 }];
  styleTitle(sheet, data.title, data.subtitle, 4);
  styleHeader(sheet, ["แผ่นงานในไฟล์นี้", "ใส่ข้อมูลอะไร", "ต้องกรอกอย่างน้อย", "ข้อควรรู้"], [1]);
  GUIDE_ROWS.forEach((values, index) => styleDataRow(sheet.addRow(values), { zebra: index % 2 === 1 }));

  sheet.addRow([]);
  const noteHeading = sheet.addRow(["กฎ 5 ข้อที่ทำให้ไฟล์นี้นำเข้าได้เสมอ"]);
  noteHeading.font = { name: "Tahoma", size: 12, bold: true, color: { argb: BRAND.orangeDeep } };

  // เขียนกฎเป็นข้อความยาวช่องเดียว ไม่ทำเป็นตารางที่มีหัวคอลัมน์
  // เพราะถ้าเผลอใช้คำว่า "ชื่อลูกค้า" หรือ "ราคาขาย" เป็นหัวคอลัมน์ในแผ่นนี้
  // ตัวนำเข้าจะเข้าใจผิดว่าแผ่นวิธีใช้คือข้อมูลจริง แล้วสร้างข้อมูลขยะเข้าระบบ
  const notes = [
    "1. ห้ามเปลี่ยนชื่อแผ่นงาน และห้ามแก้ข้อความในแถวหัวตาราง (แถวที่ 4) เพราะระบบใช้สองอย่างนี้จับคู่ข้อมูล ไม่ได้ดูตำแหน่งคอลัมน์",
    "2. เพิ่มคอลัมน์ของตัวเองต่อท้ายได้ ระบบจะข้ามคอลัมน์ที่ไม่รู้จักไปเฉย ๆ ไม่ทำให้นำเข้าล้มเหลว",
    "3. หัวตารางสีส้มคือช่องที่ต้องกรอก ถ้าเว้นไว้ระบบจะตีตกแถวนั้นแล้วบอกเลขแถวให้ทราบ · หัวสีเทาเข้มจะกรอกหรือเว้นก็ได้",
    "4. ช่องที่มีลูกศรให้เลือก ต้องใช้ค่าจากรายการเท่านั้น พิมพ์เองแล้วสะกดไม่ตรง ระบบจะใส่ค่าเริ่มต้นแทนโดยไม่แจ้งเตือน · ส่วนช่องทางที่มา ประเภทลูกค้า และหมวด พิมพ์อะไรก็ได้ตามที่ธุรกิจใช้จริง",
    "5. ตอนนำเข้าให้เลือก \"นำเข้าทั้งไฟล์\" ระบบจะไล่อ่านทุกแผ่นตามลำดับที่ถูกต้องเอง แล้วแสดงจำนวนที่จะเข้าให้ตรวจก่อนกดยืนยัน",
    "",
    "แผ่น \"ค่าที่ระบบรู้จัก\" กับแผ่นนี้ ระบบจะข้ามตอนนำเข้า ไม่กลายเป็นข้อมูลในระบบ"
  ];
  for (const note of notes) {
    const row = sheet.addRow([note]);
    sheet.mergeCells(row.number, 1, row.number, 4);
    row.getCell(1).font = { name: "Tahoma", size: 10, color: { argb: BRAND.ink } };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
    row.height = 30;
  }
  return sheet;
}

function addReferenceSheet(workbook) {
  const sheet = workbook.addWorksheet(REFERENCE_SHEET, { properties: { tabColor: { argb: BRAND.ink } } });
  sheet.columns = VALUE_LISTS.map(() => ({ width: 30 }));
  styleTitle(sheet, "ค่าที่ระบบรู้จัก", "แผ่นนี้เป็นแหล่งของรายการให้เลือกในช่องต่าง ๆ · ระบบจะข้ามแผ่นนี้ตอนนำเข้า", VALUE_LISTS.length);
  styleHeader(sheet, VALUE_LISTS.map(([, label]) => label));

  const longest = Math.max(...VALUE_LISTS.map(([, , values]) => values.length));
  for (let index = 0; index < longest; index += 1) {
    styleDataRow(sheet.addRow(VALUE_LISTS.map(([, , values]) => values[index] ?? "")), { zebra: index % 2 === 1 });
  }
  return sheet;
}

export async function buildTemplateWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UTAI Business Growth System";
  workbook.created = new Date();
  addGuideSheet(workbook, data);
  for (const spec of SHEETS) addDataSheet(workbook, spec, data);
  addReferenceSheet(workbook);
  return workbook;
}

export const templateSheetSpecs = SHEETS;
export const templateSkippedSheets = [GUIDE_SHEET, REFERENCE_SHEET];

const outputDirectory = resolve(import.meta.dirname, "../outputs/import-templates");

export async function buildAll() {
  await mkdir(outputDirectory, { recursive: true });
  const written = [];
  for (const data of [coffeeShop, blankTemplate]) {
    const workbook = await buildTemplateWorkbook(data);
    const buffer = await workbook.xlsx.writeBuffer();
    const path = resolve(outputDirectory, data.fileName);
    await writeFile(path, Buffer.from(buffer));
    written.push({ path, bytes: buffer.byteLength });
  }
  return written;
}

if (process.argv[1] === import.meta.filename) {
  for (const file of await buildAll()) console.log(`สร้างแล้ว: ${file.path} (${file.bytes.toLocaleString()} bytes)`);
}
