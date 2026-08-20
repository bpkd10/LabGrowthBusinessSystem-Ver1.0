// สร้างรายงาน Excel ที่จัดรูปแบบและใส่สีตาม CI จากผลวิเคราะห์ในระบบ
//
// ใช้ ExcelJS เพราะ SheetJS รุ่นชุมชนที่ระบบใช้อยู่ (สำหรับ "นำเข้าข้อมูล") เขียนไฟล์ได้
// แต่ใส่สี ฟอนต์ หรือเส้นขอบไม่ได้ ความสามารถนั้นอยู่ในรุ่น Pro เท่านั้น
// ทั้งสองไลบรารีจึงอยู่ร่วมกันโดยแบ่งหน้าที่: SheetJS อ่านไฟล์ที่ผู้ใช้นำเข้า
// ส่วน ExcelJS เขียนไฟล์รายงานที่ระบบสร้างออกไป
//
// ExcelJS ถูกโหลดเป็น global script (window.ExcelJS) แบบเดียวกับ vendor ตัวอื่น
// ของโปรเจกต์นี้ เพราะระบบไม่มี bundler

import {
  buildInsightReport
} from "./business-insights.js?v=29";
import {
  dealStageLabels,
  leadStatusLabels,
  taskStatusLabels,
  businessCategories,
  businessModes
} from "./business-config.js?v=29";
import {
  compareToPrevious,
  thaiMonthLabel
} from "./state-model.js?v=29";

// สีจาก CI เดียวกับ app/styles.css — ExcelJS ใช้รูปแบบ ARGB จึงต้องเติม FF นำหน้า
const BRAND = {
  ink: "FF17171F",
  orange: "FFFF6B1A",
  orangeDeep: "FFC34500",
  soft: "FFFEE9CE",
  white: "FFFFFFFF",
  grey: "FFF4F5F7",
  greyLine: "FFD8DBE0",
  good: "FF1B7F4B",
  goodSoft: "FFE3F5EB",
  warn: "FFB45309",
  warnSoft: "FFFDF0DC",
  bad: "FFB42318",
  badSoft: "FFFDE7E5"
};

const MONEY = "#,##0 \"บาท\"";
const PERCENT = "0.0\"%\"";

// ตัวชี้วัดในชีตเทียบงวด พร้อมทิศทางที่ถือว่า "ดี" ของแต่ละตัว
// งานเกินกำหนดเป็นตัวเดียวที่ลดลงแล้วดี ถ้าไม่แยกไว้ รายงานจะทาสีเขียวให้ข่าวร้าย
const TREND_ROWS = [
  ["revenue", "รายได้ที่ปิดได้แล้ว", "money", "up"],
  ["pipelineValue", "มูลค่า Pipeline", "money", "up"],
  ["customers", "จำนวนลูกค้า", "count", "up"],
  ["totalLeads", "จำนวน Lead", "count", "up"],
  ["wonDeals", "ดีลที่ปิดได้", "count", "up"],
  ["conversionRate", "อัตราปิดการขาย", "percent", "up"],
  ["overdueTasks", "งานที่เลยกำหนด", "count", "down"]
];

// โหลด ExcelJS ตอนกดปุ่มดาวน์โหลดเท่านั้น ไม่โหลดพร้อมหน้าเว็บ
//
// ไฟล์นี้ใหญ่ 925 KB ถ้าใส่เป็น <script> ในหน้าจะถ่วงเวลาเปิดแอปของทุกคน
// ทั้งที่ส่วนใหญ่ไม่ได้กดออกรายงานทุกครั้ง การโหลดตอนใช้จริงจึงคุ้มกว่ามาก
// วิธีนี้ยังผ่าน Content-Security-Policy (script-src 'self') เพราะโหลดจาก origin เดียวกัน
let excelJsLoader = null;

function loadExcelJS() {
  if (globalThis.ExcelJS?.Workbook) return Promise.resolve(globalThis.ExcelJS);
  if (excelJsLoader) return excelJsLoader;

  excelJsLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/exceljs.min.js?v=29";
    script.onload = () => {
      if (globalThis.ExcelJS?.Workbook) resolve(globalThis.ExcelJS);
      else reject(new Error("โหลดตัวสร้างไฟล์ Excel ได้ แต่ไลบรารีไม่พร้อมใช้งาน กรุณารีเฟรชหน้าเว็บแล้วลองใหม่"));
    };
    script.onerror = () => {
      // ให้ลองใหม่ได้ ไม่ใช่ค้างสถานะพังถาวรเพราะเน็ตสะดุดครั้งเดียว
      excelJsLoader = null;
      reject(new Error("โหลดตัวสร้างไฟล์ Excel ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วกดดาวน์โหลดใหม่อีกครั้ง"));
    };
    document.head.appendChild(script);
  });
  return excelJsLoader;
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
  subtitleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  subtitleRow.height = 20;
  sheet.addRow([]);
}

function styleHeader(sheet, headers) {
  const row = sheet.addRow(headers);
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: "Tahoma", size: 10, bold: true, color: { argb: BRAND.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.orangeDeep } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND.ink } } };
  });
  // ตรึงหัวตารางไว้เสมอ ตารางยาว ๆ จะได้ยังอ่านออกว่าคอลัมน์ไหนคืออะไร
  sheet.views = [{ state: "frozen", ySplit: row.number }];
  return row;
}

function styleDataRow(row, { tone = "", zebra = false } = {}) {
  const fills = {
    good: BRAND.goodSoft,
    warn: BRAND.warnSoft,
    bad: BRAND.badSoft
  };
  const background = fills[tone] || (zebra ? BRAND.grey : BRAND.white);
  row.eachCell((cell) => {
    cell.font = { name: "Tahoma", size: 10, color: { argb: BRAND.ink } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: background } };
    cell.border = { bottom: { style: "hair", color: { argb: BRAND.greyLine } } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function setColumns(sheet, widths) {
  sheet.columns = widths.map((width) => ({ width }));
}

function addTable(sheet, headers, rows, widths, toneOf = () => "") {
  setColumns(sheet, widths);
  styleHeader(sheet, headers);
  rows.forEach((values, index) => {
    const row = sheet.addRow(values);
    styleDataRow(row, { tone: toneOf(values, index), zebra: index % 2 === 1 });
  });
  if (rows.length === 0) {
    const row = sheet.addRow(["ยังไม่มีข้อมูลในส่วนนี้"]);
    styleDataRow(row);
  }
}

function addKpiBlock(sheet, entries) {
  for (const [label, value, format, tone] of entries) {
    const row = sheet.addRow([label, value]);
    row.height = 20;
    const labelCell = row.getCell(1);
    const valueCell = row.getCell(2);
    labelCell.font = { name: "Tahoma", size: 10, color: { argb: BRAND.ink } };
    valueCell.font = { name: "Tahoma", size: 12, bold: true, color: { argb: tone === "bad" ? BRAND.bad : tone === "good" ? BRAND.good : BRAND.ink } };
    if (format) valueCell.numFmt = format;
    for (const cell of [labelCell, valueCell]) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.white } };
      cell.border = { bottom: { style: "hair", color: { argb: BRAND.greyLine } } };
      cell.alignment = { vertical: "middle" };
    }
  }
}

function thaiDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" });
}

/**
 * สร้าง Workbook จากผลวิเคราะห์ คืนค่าเป็น ArrayBuffer พร้อมดาวน์โหลด
 * แยกจากตัวสั่งดาวน์โหลดเพื่อให้ทดสอบเนื้อหาไฟล์ได้โดยไม่ต้องมี DOM
 */
export async function buildReportWorkbook(state, referenceDate) {
  const ExcelJS = await loadExcelJS();
  const report = buildInsightReport(state, referenceDate);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UTAI Business Growth System";
  workbook.created = new Date();

  const stamp = thaiDateTime(report.generatedAt);
  const heading = `${report.businessName} · รายงานวิเคราะห์ธุรกิจ`;

  // ---------- ชีต 1: สรุปผู้บริหาร ----------
  const summary = workbook.addWorksheet("สรุปผู้บริหาร", { properties: { tabColor: { argb: BRAND.orange } } });
  setColumns(summary, [42, 26, 20, 18, 16, 14]);
  styleTitle(summary, heading, `ออกรายงานเมื่อ ${stamp} · ข้อมูล ณ วันที่ ${report.referenceDate}`, 6);

  summary.addRow(["ตัวเลขหลัก"]).font = { name: "Tahoma", size: 12, bold: true, color: { argb: BRAND.orangeDeep } };
  addKpiBlock(summary, [
    ["รายได้ที่ปิดได้แล้ว", report.revenueGap.achieved, MONEY, "good"],
    ["เป้ารายได้", report.revenueGap.target, MONEY, ""],
    ["ยังขาดอีก", report.revenueGap.gap, MONEY, report.revenueGap.gap > 0 ? "bad" : "good"],
    ["ทำได้แล้วคิดเป็น", report.revenueGap.achievedPercent, PERCENT, ""],
    ["มูลค่า Pipeline ดิบ", report.forecast.rawPipeline, MONEY, ""],
    ["Pipeline ถ่วงน้ำหนักโอกาสปิด", report.forecast.weighted, MONEY, ""],
    ["Lead ทั้งหมด", report.metrics.totalLeads, "", ""],
    ["Lead ที่เลยนัดติดตาม", report.callQueue.overdueCount, "", report.callQueue.overdueCount > 0 ? "bad" : "good"],
    ["งานค้างทั้งหมด", report.tasks.openCount, "", ""],
    ["งานที่เลยกำหนด", report.tasks.overdueCount, "", report.tasks.overdueCount > 0 ? "bad" : "good"]
  ]);

  summary.addRow([]);
  summary.addRow(["ช่วงคาดการณ์รายได้"]).font = { name: "Tahoma", size: 12, bold: true, color: { argb: BRAND.orangeDeep } };
  // จำแถวไว้ก่อน เพราะหน่วยเงินต้องลงเฉพาะตารางคาดการณ์นี้เท่านั้น
  const forecastFirstRow = summary.rowCount + 2;
  addTable(
    summary,
    ["มุมมอง", "ยอดคาดการณ์", "ความหมาย"],
    [
      ["ปิดได้แล้ว", report.forecast.banked, "เงินที่เข้าแล้วจริง ไม่มีทางลดลง"],
      ["ที่ทีมรับปากได้", report.forecast.committedCase, "รวมดีลที่โอกาสปิดตั้งแต่ 70% ขึ้นไปแบบเต็มมูลค่า"],
      ["ที่น่าจะเป็น", report.forecast.likelyCase, "ถ่วงน้ำหนักทุกดีลด้วยโอกาสปิดที่บันทึกไว้"],
      ["ถ้าทุกดีลชนะ", report.forecast.bestCase, "เพดานสูงสุดถ้าไม่มีดีลไหนหลุดเลย"]
    ],
    [42, 26, 60]
  );
  // ห้ามใช้ getColumn(2).numFmt ที่นี่ เพราะคอลัมน์นี้กินบล็อกตัวเลขหลักด้านบนด้วย
  // ผลคือ "ทำได้แล้วคิดเป็น 5.9%" ถูกเขียนทับเป็น "6 บาท" และจำนวน Lead กับจำนวนงาน
  // ก็ถูกติดหน่วยบาททั้งที่เป็นการนับ — ตัวเลขผิดหน่วยบนหน้าแรกของรายงานที่เจ้าของ
  // เอาไปคุยกับธนาคาร อันตรายกว่าตัวเลขที่หายไปเสียอีก เพราะมันดูน่าเชื่อถือ
  for (let row = forecastFirstRow; row <= summary.rowCount; row += 1) summary.getRow(row).getCell(2).numFmt = MONEY;

  summary.addRow([]);
  const noteRow = summary.addRow([`ที่มาของตัวเลข: ${report.revenueGap.reason} · ${report.forecast.reason}`]);
  noteRow.font = { name: "Tahoma", size: 9, italic: true, color: { argb: BRAND.orangeDeep } };
  summary.mergeCells(noteRow.number, 1, noteRow.number, 6);
  noteRow.getCell(1).alignment = { wrapText: true, vertical: "top" };
  noteRow.height = 32;

  // ---------- ชีต 2: เทียบกับเดือนก่อน ----------
  //
  // วางไว้เป็นชีตที่สองเพราะคำถามแรกของคนอ่านรายงานคือ "ดีขึ้นหรือแย่ลง"
  // ไม่ใช่ "ตอนนี้เท่าไร" ตัวเลขสถานะที่ไม่มีทิศทางกำกับตัดสินใจอะไรไม่ได้
  const trend = workbook.addWorksheet("เทียบกับเดือนก่อน", { properties: { tabColor: { argb: BRAND.orange } } });
  const comparison = compareToPrevious(state, referenceDate);
  styleTitle(trend, "ทิศทางเทียบกับเดือนก่อนหน้า", comparison.reason, 6);

  if (!comparison.available) {
    // ยังเทียบไม่ได้ แต่ยังต้องมีหัวตารางและตรึงแถวเหมือนชีตอื่น เพื่อให้รายงานที่
    // ผู้ใช้ส่งต่อดูเป็นชุดเดียวกัน ไม่ใช่มีชีตหนึ่งที่หน้าตาหลุดจากที่เหลือ
    addTable(
      trend,
      ["ตัวชี้วัด", "เดือนก่อน", "เดือนนี้", "เปลี่ยนแปลง", "คิดเป็น %", "อ่านว่า"],
      TREND_ROWS.map(([key, label]) => [label, "—", comparison.current[key], "—", "—", "ยังไม่มีเดือนก่อนให้เทียบ"]),
      [30, 22, 22, 18, 14, 24]
    );
  } else {
    // อ่านว่า "ดีขึ้น/แย่ลง" ไม่ใช่ "เพิ่ม/ลด" เพราะงานเกินกำหนดที่เพิ่มขึ้นคือข่าวร้าย
    // และรายงานที่ให้คนอ่านตีความทิศทางเองคือรายงานที่ยังทำงานไม่เสร็จ
    const trendRows = TREND_ROWS.map(([key, label, , goodDirection]) => {
      const change = comparison.changes[key];
      const flat = change.diff === 0;
      const good = flat ? null : (goodDirection === "up") === (change.diff > 0);
      return [
        label,
        change.before,
        change.after,
        change.diff,
        change.percent === null ? "—" : change.percent,
        flat ? "เท่าเดิม" : good ? "ดีขึ้น" : "แย่ลง"
      ];
    });
    addTable(
      trend,
      ["ตัวชี้วัด", `เดือนก่อน (${thaiMonthLabel(comparison.previous.month)})`, `เดือนนี้ (${thaiMonthLabel(comparison.current.month)})`, "เปลี่ยนแปลง", "คิดเป็น %", "อ่านว่า"],
      trendRows,
      [30, 22, 22, 18, 14, 14],
      (values) => (values[5] === "ดีขึ้น" ? "good" : values[5] === "แย่ลง" ? "bad" : "")
    );
    for (const column of [2, 3, 4]) {
      trend.getColumn(column).numFmt = MONEY;
    }
    // อัตราปิดการขายเป็นเปอร์เซ็นต์ ไม่ใช่เงิน จึงต้องล้างรูปแบบเงินของทั้งคอลัมน์
    // ออกเฉพาะแถวนั้น ไม่งั้นจะอ่านว่า "12 บาท" ทั้งที่หมายถึง 12%
    const conversionRowIndex = TREND_ROWS.findIndex(([key]) => key === "conversionRate");
    if (conversionRowIndex >= 0) {
      const row = trend.getRow(trend.rowCount - TREND_ROWS.length + 1 + conversionRowIndex);
      for (const column of [2, 3, 4]) row.getCell(column).numFmt = PERCENT;
    }
  }

  // ---------- ชีต 3: คิวติดตาม ----------
  const queue = workbook.addWorksheet("คิวติดตาม", { properties: { tabColor: { argb: BRAND.orange } } });
  styleTitle(queue, "Lead ที่ควรติดตามก่อน", report.callQueue.reason, 9);
  addTable(
    queue,
    ["อันดับ", "ลูกค้า", "ช่องทาง", "ขั้นปัจจุบัน", "ผู้รับผิดชอบ", "คะแนนความสนใจ", "มูลค่าดีลที่เปิดอยู่", "เลยนัด (วัน)", "เหตุผลที่ต้องรีบ"],
    report.callQueue.queue.map((item, index) => [
      index + 1,
      item.customerName,
      item.source,
      item.statusLabel,
      item.assignedTo,
      item.leadScore,
      item.dealValue,
      item.overdueDays,
      item.reasons.join(" · ")
    ]),
    [8, 26, 16, 18, 20, 14, 20, 12, 52],
    (values) => (values[7] > 0 ? "bad" : values[5] >= 70 ? "warn" : "")
  );
  queue.getColumn(7).numFmt = MONEY;

  // ---------- ชีต 3: ข้อเสนอและกำไร ----------
  const offers = workbook.addWorksheet("ข้อเสนอและกำไร", { properties: { tabColor: { argb: BRAND.orange } } });
  styleTitle(offers, "กำไรขั้นต้นรายข้อเสนอ", report.offers.reason, 8);
  const averageMargin = report.offers.averageMarginPercent;
  addTable(
    offers,
    ["ข้อเสนอ", "หมวด", "ราคาขาย", "ต้นทุน", "กำไรขั้นต้น", "กำไร (%)", "ลูกค้าที่ใช้อยู่", "ดีลที่ผูกไว้"],
    report.offers.offers.map((offer) => [
      offer.name, offer.category, offer.price, offer.cost, offer.margin, offer.marginPercent, offer.customerCount, offer.dealCount
    ]),
    [38, 16, 16, 16, 18, 12, 16, 14],
    (values) => {
      const hasDemand = values[6] + values[7] > 0;
      if (hasDemand && values[5] < averageMargin) return "bad";
      if (values[5] >= averageMargin) return "good";
      return "";
    }
  );
  for (const index of [3, 4, 5]) offers.getColumn(index).numFmt = MONEY;
  offers.getColumn(6).numFmt = PERCENT;

  // ---------- ชีต 4: ช่องทางการตลาด ----------
  const channels = workbook.addWorksheet("ช่องทางการตลาด", { properties: { tabColor: { argb: BRAND.orange } } });
  styleTitle(channels, "ช่องทางไหนสร้างรายได้จริง", report.channels.reason, 8);
  addTable(
    channels,
    ["ช่องทาง", "ลูกค้า", "Lead", "ดีลทั้งหมด", "ดีลที่ชนะ", "อัตราปิด (%)", "รายได้จริง", "Pipeline ที่เหลือ"],
    report.channels.channels.map((channel) => [
      channel.source, channel.customerCount, channel.leadCount, channel.dealCount,
      channel.wonCount, channel.conversionRate, channel.revenue, channel.pipeline
    ]),
    [24, 12, 12, 14, 14, 16, 20, 20],
    (values) => (values[6] > 0 ? "good" : values[1] > 0 ? "warn" : "")
  );
  channels.getColumn(6).numFmt = PERCENT;
  for (const index of [7, 8]) channels.getColumn(index).numFmt = MONEY;

  // ---------- ชีต 5: Customer Journey ----------
  const journey = workbook.addWorksheet("Customer Journey", { properties: { tabColor: { argb: BRAND.orange } } });
  styleTitle(journey, "คอขวดในเส้นทางลูกค้า", report.journey.reason, 5);
  const bottleneckStatus = report.journey.bottleneck?.status;
  addTable(
    journey,
    ["ขั้น", "ความหมายในธุรกิจนี้", "จำนวน Lead", "สัดส่วน (%)", "ผ่านขั้นนี้ไปแล้ว (%)"],
    report.journey.stages.map((stage) => [
      stage.label, stage.journeyLabel, stage.count, stage.sharePercent, stage.passedPercent
    ]),
    [22, 30, 16, 16, 22],
    (values, index) => (report.journey.stages[index]?.status === bottleneckStatus ? "warn" : "")
  );
  for (const index of [4, 5]) journey.getColumn(index).numFmt = PERCENT;

  // ---------- ชีต 6: งานค้าง ----------
  const tasks = workbook.addWorksheet("งานค้างและความเสี่ยง", { properties: { tabColor: { argb: BRAND.orange } } });
  styleTitle(tasks, "งานที่เลยกำหนดและภาระของทีม", report.tasks.reason, 5);
  addTable(
    tasks,
    ["งาน", "ผู้รับผิดชอบ", "กำหนดส่ง", "ความสำคัญ", "ค้างมาแล้ว (วัน)"],
    report.tasks.overdue.map((task) => [task.title, task.owner, task.dueDate, task.priority, task.lateDays]),
    [46, 22, 16, 14, 18],
    (values) => (values[4] >= 7 ? "bad" : "warn")
  );
  tasks.addRow([]);
  tasks.addRow(["ภาระงานที่ยังไม่เสร็จ แยกตามผู้รับผิดชอบ"]).font = { name: "Tahoma", size: 12, bold: true, color: { argb: BRAND.orangeDeep } };
  addTable(tasks, ["ผู้รับผิดชอบ", "จำนวนงานค้าง"], report.tasks.workload.map((item) => [item.owner, item.count]), [46, 22]);

  // ---------- ชีตข้อมูลดิบ ----------
  //
  // ชีตกลุ่มนี้มีไว้ให้ "นำเข้าข้อมูล" อ่านกลับเข้าระบบได้ ต่างจากชีตวิเคราะห์ด้านบน
  // ที่มีไว้ให้คนอ่าน จึงต้องเก็บ field ที่ระบบใช้จริงให้ครบ แม้บาง field จะดูไม่สวย
  // ในสายตาคนอ่าน เช่น ขั้น Pipeline ของข้อเสนอ — ถ้าไม่เก็บ พอ Set Zero แล้วนำเข้ากลับ
  // ข้อเสนอทุกตัวจะกองอยู่ขั้นเดียวกันหมด และ Journey ก็จะคำนวณผิดตาม

  const settings = workbook.addWorksheet("ตั้งค่าธุรกิจ", { properties: { tabColor: { argb: BRAND.ink } } });
  styleTitle(settings, "ตั้งค่าธุรกิจที่บันทึกไว้", "ใช้กู้คืนโปรไฟล์ธุรกิจเมื่อนำไฟล์นี้กลับเข้าระบบ", 4);
  addTable(
    settings,
    ["ชื่อธุรกิจ", "รูปแบบธุรกิจ", "หมวดธุรกิจ", "เป้ารายได้"],
    [[
      state.businessProfile.businessName || "",
      businessModes[state.businessProfile.businessMode]?.label || state.businessProfile.businessMode || "",
      businessCategories[state.businessProfile.businessCategory] || state.businessProfile.businessCategory || "",
      Number(state.businessProfile.revenueTarget) || 0
    ]],
    [34, 20, 28, 20]
  );
  settings.getColumn(4).numFmt = MONEY;

  const rawProducts = workbook.addWorksheet("ข้อมูลข้อเสนอ", { properties: { tabColor: { argb: BRAND.ink } } });
  styleTitle(rawProducts, "ข้อเสนอทั้งหมดในระบบ", `รวม ${state.products.length} รายการ · เก็บครบทุกช่องที่ระบบใช้`, 9);
  addTable(
    rawProducts,
    ["ชื่อข้อเสนอ", "หมวด", "ราคาขาย", "ต้นทุน", "รูปแบบธุรกิจ", "ขั้น Pipeline", "สถานะ", "คำอธิบาย", "เหตุผลแนะนำ"],
    state.products.map((product) => [
      product.name,
      product.category || "",
      Number(product.price) || 0,
      Number(product.cost) || 0,
      businessModes[product.businessMode]?.label || product.businessMode || "",
      dealStageLabels[product.pipelineStage] || product.pipelineStage || "",
      product.status === "inactive" ? "ปิดขาย" : "เปิดขาย",
      product.description || "",
      product.recommendationReason || ""
    ]),
    [34, 16, 16, 16, 16, 26, 12, 44, 34]
  );
  for (const index of [3, 4]) rawProducts.getColumn(index).numFmt = MONEY;

  const rawCustomers = workbook.addWorksheet("ข้อมูลลูกค้า", { properties: { tabColor: { argb: BRAND.ink } } });
  styleTitle(rawCustomers, "ข้อมูลลูกค้าทั้งหมดในระบบ", `รวม ${state.customers.length} รายการ · ไม่รวมรูปโปรไฟล์`, 7);
  addTable(
    rawCustomers,
    ["ชื่อลูกค้า", "เบอร์โทร", "ช่องทางที่มา", "ประเภทลูกค้า", "ข้อเสนอที่สนใจ", "ความต้องการ", "วันที่เริ่มเป็นลูกค้า"],
    state.customers.map((customer) => [
      customer.fullName, customer.phone || "", customer.source || "", customer.customerType || "",
      customer.solutionPackage || "", customer.interest || "", customer.createdAt || ""
    ]),
    [28, 16, 18, 20, 32, 44, 20]
  );

  const rawLeads = workbook.addWorksheet("Lead", { properties: { tabColor: { argb: BRAND.ink } } });
  styleTitle(rawLeads, "Lead ทั้งหมดในระบบ", `รวม ${state.leads.length} รายการ`, 5);
  addTable(
    rawLeads,
    ["ลูกค้า", "ขั้นปัจจุบัน", "ผู้รับผิดชอบ", "คะแนนความสนใจ", "นัดติดตามครั้งถัดไป"],
    state.leads.map((lead) => [
      state.customers.find((customer) => customer.id === lead.customerId)?.fullName || "ไม่ระบุลูกค้า",
      leadStatusLabels[lead.status] || lead.status,
      lead.assignedTo || "",
      Number(lead.leadScore) || 0,
      lead.nextFollowUp || ""
    ]),
    [28, 20, 22, 18, 22]
  );

  const rawDeals = workbook.addWorksheet("ดีล", { properties: { tabColor: { argb: BRAND.ink } } });
  styleTitle(rawDeals, "ดีลทั้งหมดในระบบ", `รวม ${state.deals.length} รายการ`, 6);
  addTable(
    rawDeals,
    ["ชื่อดีล", "ลูกค้า", "ข้อเสนอ", "มูลค่า", "ขั้น", "โอกาสปิด (%)"],
    state.deals.map((deal) => [
      deal.name,
      state.customers.find((customer) => customer.id === deal.customerId)?.fullName || "ไม่ระบุลูกค้า",
      deal.offerName || state.products.find((product) => product.id === deal.productId)?.name || "",
      Number(deal.value) || 0,
      dealStageLabels[deal.stage] || deal.stage,
      Number(deal.probability) || 0
    ]),
    [32, 26, 30, 18, 24, 16],
    (values) => (values[4] === dealStageLabels.Won ? "good" : values[4] === dealStageLabels.Lost ? "bad" : "")
  );
  rawDeals.getColumn(4).numFmt = MONEY;
  rawDeals.getColumn(6).numFmt = PERCENT;

  const rawTasks = workbook.addWorksheet("งานติดตาม", { properties: { tabColor: { argb: BRAND.ink } } });
  styleTitle(rawTasks, "งานติดตามทั้งหมดในระบบ", `รวม ${state.tasks.length} รายการ`, 5);
  addTable(
    rawTasks,
    ["งาน", "ผู้รับผิดชอบ", "กำหนดส่ง", "ความสำคัญ", "สถานะ"],
    state.tasks.map((task) => [
      task.title, task.owner || "", task.dueDate || "", task.priority || "",
      taskStatusLabels[task.status] || task.status
    ]),
    [46, 22, 16, 14, 18],
    (values) => (values[4] === taskStatusLabels.done ? "good" : "")
  );

  return { workbook, report };
}

/** สร้างไฟล์แล้วสั่งดาวน์โหลด คืนชื่อไฟล์ที่บันทึก */
export async function downloadReport(state, referenceDate) {
  const { workbook, report } = await buildReportWorkbook(state, referenceDate);
  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = String(report.businessName).replace(/[\\/:*?"<>|]/g, "-").trim() || "ธุรกิจ";
  const fileName = `รายงานวิเคราะห์ธุรกิจ-${safeName}-${report.referenceDate}.xlsx`;

  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // ปล่อย object URL ทิ้ง ไม่งั้น buffer ของไฟล์ค้างใน memory จนกว่าจะปิดแท็บ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
