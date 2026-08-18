import { dealStageLabels, leadStatusLabels, taskStatusLabels, priorityLabels, businessCategories } from "./business-config.js";
import { normalizeOfferCategory } from "./state-model.js";

export const supportedImportExtensions = ["json", "csv", "cvs", "tsv", "xls", "xlsx", "md", "txt", "doc", "docx"];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// เรียงตามลำดับที่ต้องนำเข้าจริง ไม่ใช่ตามตัวอักษร
// products ต้องมาก่อน customers เพราะลูกค้าอ้างชื่อข้อเสนอ, customers ต้องมาก่อน
// leads/deals เพราะทั้งสองอย่างผูกกับ customerId ถ้าสลับลำดับ ดีลจะถูกตีตกว่า
// "ไม่พบลูกค้าที่ตรงกับดีล" ทั้งที่ลูกค้าอยู่ในไฟล์เดียวกัน
// profile ต้องมาก่อนทุกอย่าง เพราะลูกค้าและข้อเสนอที่ไม่ได้ระบุรูปแบบธุรกิจมาเอง
// จะยืมค่าจากโปรไฟล์ ถ้ายังไม่ได้กู้โปรไฟล์คืนก่อน ทุกรายการจะไปกองอยู่ที่ค่า default
const collections = ["profile", "products", "customers", "leads", "deals", "tasks"];

const fieldAliases = {
  profile: {
    businessName: ["businessname", "ชื่อธุรกิจ", "ชื่อบริษัท", "ชื่อกิจการ"],
    businessMode: ["businessmode", "รูปแบบธุรกิจ", "รูปแบบการขาย"],
    businessCategory: ["businesscategory", "หมวดธุรกิจ", "ประเภทธุรกิจ"],
    revenueTarget: ["revenuetarget", "เป้ารายได้", "เป้าหมายรายได้"]
  },
  customers: {
    fullName: ["fullname", "name", "customer", "customername", "ชื่อลูกค้า", "ชื่อนามสกุล", "ชื่อ"],
    phone: ["phone", "tel", "telephone", "mobile", "เบอร์โทร", "โทรศัพท์", "มือถือ"],
    source: ["source", "channel", "contactchannel", "ช่องทาง", "ช่องทางที่มา", "แหล่งที่มา"],
    solutionPackage: ["solutionpackage", "package", "offer", "product", "แพ็กเกจ", "packageoffer", "ข้อเสนอ", "สินค้า", "ข้อเสนอที่สนใจ", "แพ็กเกจที่สนใจ"],
    interest: ["interest", "need", "needs", "requirement", "ความสนใจ", "ความต้องการ", "โจทย์ธุรกิจ"],
    customerType: ["customertype", "segment", "type", "ประเภทลูกค้า", "กลุ่มลูกค้า"],
    leadStatus: ["leadstatus", "crmstatus", "สถานะlead", "สถานะลูกค้า"],
    createdAt: ["createdat", "วันที่เริ่มเป็นลูกค้า", "วันที่สร้าง", "วันที่รู้จัก"]
  },
  products: {
    name: ["name", "product", "productname", "package", "packagename", "offer", "offername", "ชื่อสินค้า", "ชื่อแพ็กเกจ", "ชื่อข้อเสนอ", "สินค้า", "ข้อเสนอ"],
    category: ["category", "type", "producttype", "ประเภท", "ประเภทข้อเสนอ", "หมวดสินค้า", "หมวด"],
    price: ["price", "sellingprice", "amount", "ราคา", "ราคาขาย"],
    cost: ["cost", "ต้นทุน", "ราคาทุน"],
    businessMode: ["businessmode", "salesmode", "รูปแบบธุรกิจ", "รูปแบบการขาย"],
    businessCategory: ["businesscategory", "industry", "หมวดธุรกิจ", "ประเภทธุรกิจ"],
    pipelineStage: ["pipelinestage", "stage", "ขั้นpipeline", "สถานะpipeline"],
    description: ["description", "detail", "details", "คำอธิบาย", "รายละเอียด"],
    recommendationReason: ["recommendationreason", "reason", "เหตุผลแนะนำ", "จุดขาย"],
    status: ["status", "สถานะ"]
  },
  leads: {
    customerName: ["customer", "customername", "ชื่อลูกค้า", "ลูกค้า"],
    customerId: ["customerid", "รหัสลูกค้า"],
    status: ["leadstatus", "status", "stage", "สถานะlead", "สถานะ", "ขั้นปัจจุบัน", "ขั้น"],
    assignedTo: ["assignedto", "owner", "assignee", "ผู้รับผิดชอบ", "เจ้าของงาน"],
    leadScore: ["leadscore", "score", "คะแนน", "คะแนนความสนใจ"],
    nextFollowUp: ["nextfollowup", "followup", "นัดติดตาม", "นัดติดตามครั้งถัดไป", "ติดตามครั้งถัดไป"]
  },
  deals: {
    name: ["dealname", "opportunity", "opportunityname", "ชื่อดีล", "ชื่อโอกาส", "ดีล"],
    customerId: ["customerid", "รหัสลูกค้า"],
    customerName: ["customer", "customername", "ชื่อลูกค้า", "ลูกค้า"],
    offerName: ["offer", "product", "package", "ข้อเสนอ", "สินค้า", "แพ็กเกจ"],
    value: ["value", "amount", "dealvalue", "มูลค่า", "ยอดขาย", "มูลค่าดีล"],
    stage: ["stage", "dealstage", "pipeline", "สถานะดีล", "ขั้นpipeline", "ขั้น", "ขั้นปัจจุบัน"],
    probability: ["probability", "chance", "โอกาสสำเร็จ", "เปอร์เซ็นต์", "โอกาสปิด"]
  },
  tasks: {
    title: ["title", "task", "taskname", "งาน", "ชื่องาน", "งานที่ต้องทำ"],
    owner: ["owner", "assignee", "assignedto", "ผู้รับผิดชอบ", "เจ้าของงาน"],
    dueDate: ["duedate", "deadline", "date", "กำหนดเสร็จ", "วันครบกำหนด", "กำหนดส่ง"],
    priority: ["priority", "ความสำคัญ"],
    status: ["status", "taskstatus", "สถานะ", "สถานะงาน"],
    offerName: ["offer", "product", "package", "ข้อเสนอ", "สินค้า", "แพ็กเกจ"]
  }
};

function copy(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

// ต้องตัด % ฿ : , ออกด้วย ไม่ใช่แค่วรรคกับวงเล็บ
// เพราะหัวคอลัมน์ในรายงานเขียนหน่วยติดมาด้วย เช่น "โอกาสปิด (%)" ถ้าเหลือ % ค้างไว้
// จะจับคู่กับ alias "โอกาสปิด" ไม่ได้ แล้วเปอร์เซ็นต์ของทุกดีลจะกลายเป็นค่า default 50
function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_./()\-%฿:,]+/g, "");
}

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

function numberValue(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // ไฟล์ที่ระบบนี้ export ออกไปเขียนตัวเลขเป็นข้อความอ่านง่าย เช่น "85,000 บาท" หรือ "70.6%"
  // การ Number() ทั้งก้อนจะได้ NaN แล้วตกไปเป็น 0 เงียบ ๆ ทำให้ราคากับมูลค่าดีลหายทั้งไฟล์
  // จึงดึงเฉพาะตัวเลขก้อนแรกออกมาแทน
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

// สร้าง map ย้อนกลับจาก "ป้ายที่คนอ่าน" → "ค่าที่ระบบเก็บจริง"
// จำเป็นเพราะรายงาน Excel เขียนป้ายภาษาไทย (เช่น "ชนะดีล / เริ่มส่งมอบ") ไม่ใช่คีย์ ("Won")
// ถ้าไม่มี map นี้ ดีลที่ปิดได้แล้วจะถูกนำเข้ากลับมาเป็นขั้น "New" ทั้งหมด
function reverseLabels(labels) {
  return Object.fromEntries(Object.entries(labels).map(([key, label]) => [normalizeKey(label), key]));
}

const dealStageFromLabel = reverseLabels(dealStageLabels);
const leadStatusFromLabel = reverseLabels(leadStatusLabels);
const taskStatusFromLabel = reverseLabels(taskStatusLabels);
const priorityFromLabel = reverseLabels(priorityLabels);

const knownHeaderKeys = new Set(
  collections.flatMap((collection) =>
    Object.values(fieldAliases[collection]).flatMap((aliases) => aliases.map(normalizeKey))
  )
);

function headerMatchCount(cells) {
  const seen = new Set();
  for (const cell of cells || []) {
    const key = normalizeKey(cell);
    if (key && knownHeaderKeys.has(key)) seen.add(key);
  }
  return seen.size;
}

// แถวแรกของไฟล์ไม่ใช่หัวตารางเสมอไป รายงานที่ระบบนี้ออกให้มีชื่อรายงานอยู่แถว 1
// คำอธิบายอยู่แถว 2 แถว 3 ว่าง แล้วหัวตารางจริงอยู่แถว 4 — การอ่านแถว 1 เป็นหัวตาราง
// ทำให้ทุกคอลัมน์กลายเป็น __EMPTY และไม่มีแถวไหนนำเข้าได้เลย
export function matrixToRows(matrix, { scanLimit = 15 } = {}) {
  const source = (Array.isArray(matrix) ? matrix : []).map((row) => (Array.isArray(row) ? row : []));
  let headerRow = 0;
  let bestScore = 0;
  for (let index = 0; index < Math.min(source.length, scanLimit); index += 1) {
    const score = headerMatchCount(source[index]);
    if (score > bestScore) {
      bestScore = score;
      headerRow = index;
    }
  }
  // ไม่มั่นใจว่าแถวไหนคือหัวตาราง (ไฟล์ที่ระบบไม่รู้จักคอลัมน์เลย) ให้กลับไปใช้
  // แถวที่มีข้อความแถวแรกตามพฤติกรรมเดิม จะได้ไม่เปลี่ยนผลลัพธ์ของไฟล์ที่เคยนำเข้าได้อยู่แล้ว
  if (bestScore < 2) headerRow = source.findIndex((row) => row.some((cell) => String(cell ?? "").trim()));
  if (headerRow < 0) return { rows: [], headerRow: 0, firstDataRow: 2 };

  const used = new Map();
  const headers = (source[headerRow] || []).map((cell, index) => {
    const base = String(cell ?? "").trim() || `คอลัมน์ ${index + 1}`;
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });

  const rows = source.slice(headerRow + 1)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, cleanValue(row[index] ?? "")])))
    .filter((row) => Object.values(row).some((value) => String(value).trim()));

  return { rows, headerRow, firstDataRow: headerRow + 2 };
}

function parseDelimitedLine(text, delimiter) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += character;
  }
  values.push(value.trim());
  return values;
}

function delimitedMatrix(text, delimiter) {
  const logicalLines = [];
  let line = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        line += '""';
        index += 1;
      } else {
        quoted = !quoted;
        line += character;
      }
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      if (line.trim()) logicalLines.push(line);
      line = "";
    } else line += character;
  }
  if (line.trim()) logicalLines.push(line);
  if (!logicalLines.length) return [];
  return logicalLines.map((line) => parseDelimitedLine(line, delimiter));
}

function delimitedRows(text, delimiter) {
  return matrixToRows(delimitedMatrix(text, delimiter)).rows;
}

export function parseCsvText(text) {
  const firstLine = String(text || "").split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? "\t" : ",";
  return delimitedRows(text, delimiter);
}

export function parseMarkdownText(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tableStart = lines.findIndex((line, index) => line.includes("|") && /^\|?\s*:?-{3,}/.test(lines[index + 1] || ""));
  if (tableStart >= 0) {
    const split = (line) => line.replace(/^\||\|$/g, "").split("|").map((value) => value.trim());
    const headers = split(lines[tableStart]);
    return lines.slice(tableStart + 2).filter((line) => line.includes("|")).map((line) => {
      const values = split(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    });
  }
  return textToRows(text);
}

function textToRows(text) {
  const cleaned = String(text || "")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .trim();
  if (!cleaned) return [];
  const blocks = cleaned.split(/\n\s*\n+/).filter(Boolean);
  const records = blocks.map((block) => {
    const row = {};
    block.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([^:=|]{1,60})\s*[:=]\s*(.+?)\s*$/);
      if (match) row[match[1].trim()] = match[2].trim();
    });
    return row;
  }).filter((row) => Object.keys(row).length);
  if (records.length) return records;
  return cleaned.split(/\r?\n/).filter((line) => line.trim()).map((line) => ({ รายละเอียด: line.trim() }));
}

function extractLegacyDocText(buffer) {
  const bytes = new Uint8Array(buffer);
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const latin = new TextDecoder("windows-1252").decode(bytes);
  const unicode = bytes.byteLength % 2 === 0 ? new TextDecoder("utf-16le").decode(bytes) : "";
  const clean = (value) => value.replace(/[^\p{L}\p{M}\p{N}\s:,.+\-@/()]/gu, " ").replace(/[ \t]{2,}/g, " ");
  if (!utf8.includes("\uFFFD") && /[\p{L}\p{N}]/u.test(utf8)) return clean(utf8);
  return `${clean(latin)}\n${clean(unicode)}`;
}

function extensionOf(fileName) {
  return String(fileName || "").toLowerCase().split(".").pop();
}

export async function parseImportFile(file, adapters = {}) {
  if (!file) throw new Error("กรุณาเลือกไฟล์");
  if (Number(file.size || 0) > MAX_FILE_SIZE) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
  const extension = extensionOf(file.name);
  if (!supportedImportExtensions.includes(extension)) throw new Error(`ยังไม่รองรับไฟล์ .${extension || "unknown"}`);

  if (extension === "json") {
    const value = JSON.parse(await file.text());
    const isState = value && typeof value === "object" && !Array.isArray(value)
      && ["customers", "leads", "products", "deals", "tasks"].every((key) => Array.isArray(value[key]));
    if (isState) return { kind: "state", format: extension, fileName: file.name, importedState: value, rows: [], sheets: [] };
    const rows = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    return { kind: "rows", format: extension, fileName: file.name, rows, sheets: [{ name: "JSON", rows }] };
  }

  if (["csv", "cvs", "tsv"].includes(extension)) {
    const text = await file.text();
    const rows = extension === "tsv" ? delimitedRows(text, "\t") : parseCsvText(text);
    return { kind: "rows", format: extension === "cvs" ? "csv" : extension, fileName: file.name, rows, sheets: [{ name: extension.toUpperCase(), rows }] };
  }

  if (["md", "txt"].includes(extension)) {
    const rows = extension === "md" ? parseMarkdownText(await file.text()) : textToRows(await file.text());
    return { kind: "rows", format: extension, fileName: file.name, rows, sheets: [{ name: "ข้อความ", rows }] };
  }

  if (["xls", "xlsx"].includes(extension)) {
    const xlsx = adapters.xlsx || globalThis.XLSX;
    if (!xlsx?.read || !xlsx?.utils?.sheet_to_json) throw new Error("ตัวอ่าน Excel ยังโหลดไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่");
    const workbook = xlsx.read(await file.arrayBuffer(), { type: "array", cellDates: true, dense: true });
    // header: 1 อ่านออกมาเป็นตารางดิบก่อน แล้วค่อยให้ matrixToRows หาว่าแถวไหนคือหัวตาราง
    // ถ้าปล่อยให้ sheet_to_json เดาเอง มันจะยึดแถวแรกเป็นหัวตารางเสมอ
    // raw: true เพื่อให้ได้ตัวเลขจริง (5900) แทนข้อความที่จัดรูปแล้ว ("5,900 บาท")
    const sheets = workbook.SheetNames.map((name) => {
      const matrix = xlsx.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: true, blankrows: true });
      const { rows, headerRow, firstDataRow } = matrixToRows(matrix);
      return { name, rows, headerRow, firstDataRow };
    });
    const firstSheet = sheets.find((sheet) => sheet.rows.length) || sheets[0] || { name: "Sheet 1", rows: [], firstDataRow: 2 };
    return { kind: "rows", format: extension, fileName: file.name, rows: firstSheet.rows, sheets };
  }

  if (extension === "docx") {
    const mammoth = adapters.mammoth || globalThis.mammoth;
    if (!mammoth?.extractRawText) throw new Error("ตัวอ่าน Word ยังโหลดไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const rows = textToRows(result.value);
    return { kind: "rows", format: extension, fileName: file.name, rows, sheets: [{ name: "Word", rows }], warnings: result.messages || [] };
  }

  const rows = textToRows(extractLegacyDocText(await file.arrayBuffer()));
  if (!rows.length) throw new Error("ไฟล์ DOC รุ่นเก่าไม่มีข้อความที่อ่านได้ กรุณาบันทึกเป็น DOCX แล้วนำเข้าอีกครั้ง");
  return {
    kind: "rows", format: extension, fileName: file.name, rows, sheets: [{ name: "Legacy Word", rows }],
    warnings: ["DOC รุ่นเก่าอ่านด้วยการดึงข้อความพื้นฐาน ควรตรวจ Preview ก่อนยืนยัน"]
  };
}

function fieldLookup(row, collection) {
  const source = new Map(Object.entries(row || {}).map(([key, value]) => [normalizeKey(key), cleanValue(value)]));
  return Object.fromEntries(Object.entries(fieldAliases[collection]).map(([field, aliases]) => {
    const alias = aliases.find((item) => source.has(normalizeKey(item)));
    return [field, alias ? source.get(normalizeKey(alias)) : ""];
  }));
}

const collectionWeights = {
  profile: { businessName: 5, revenueTarget: 4, businessCategory: 3, businessMode: 1 },
  customers: { fullName: 5, phone: 4, source: 2, interest: 2, solutionPackage: 1 },
  products: { name: 5, price: 4, cost: 3, businessMode: 2, category: 2, description: 1 },
  leads: { leadScore: 5, nextFollowUp: 4, customerName: 3, status: 2, assignedTo: 1 },
  deals: { name: 4, value: 4, customerName: 4, stage: 2, probability: 2 },
  tasks: { title: 5, owner: 3, dueDate: 4, priority: 2, status: 1 }
};

function collectionScore(row, collection) {
  const mapped = fieldLookup(row, collection);
  const weight = collectionWeights[collection];
  return Object.entries(weight).reduce((score, [field]) => score + (mapped[field] !== "" ? weight[field] : 0), 0);
}

// คะแนนขั้นต่ำที่ยอมให้ระบบ "เดา" ว่าชีตนี้คือข้อมูลอะไร
// ต่ำกว่านี้แปลว่าเจอคอลัมน์ที่รู้จักแค่ 1 ช่อง ซึ่งเดาผิดได้ง่ายมาก
// เช่นชีตสรุปที่มีคำว่า "ลูกค้า" อยู่คอลัมน์เดียว ถ้าเดาต่อจะสร้างข้อมูลขยะเข้าระบบ
const MIN_DETECTION_SCORE = 5;

export function classifyRows(rows) {
  const sample = rows?.[0] || {};
  const ranked = collections
    .map((collection) => ({ collection, score: collectionScore(sample, collection) }))
    .sort((left, right) => right.score - left.score);
  return ranked[0] || { collection: "customers", score: 0 };
}

export function detectImportCollection(rows) {
  return classifyRows(rows).collection || "customers";
}

// ชีตที่รายงานของระบบนี้ออกให้ ระบุชื่อไว้ตรง ๆ ดีกว่าปล่อยให้เดาจากหัวคอลัมน์
// เพราะชีตวิเคราะห์หลายใบใช้หัวคอลัมน์ซ้ำกับชีตข้อมูลดิบ (เช่น "งานค้างและความเสี่ยง"
// มีคอลัมน์เหมือน "งานติดตาม") ถ้าเดาแล้วนำเข้าทั้งคู่ ข้อมูลชุดเดียวจะถูกนับสองรอบ
const sheetRoutes = new Map([
  ["ตั้งค่าธุรกิจ", "profile"],
  ["ข้อมูลข้อเสนอ", "products"],
  ["ข้อมูลลูกค้า", "customers"],
  ["lead", "leads"],
  ["ดีล", "deals"],
  ["งานติดตาม", "tasks"],
  ["สินค้าและข้อเสนอ", "products"]
]);

const skippedSheets = new Map([
  ["สรุปผู้บริหาร", "ชีตสรุปตัวเลข ไม่มีข้อมูลดิบให้นำเข้า"],
  ["เทียบกับเดือนก่อน", "ชีตนี้เป็นผลคำนวณย้อนหลัง ไม่ใช่ข้อมูลตั้งต้น"],
  ["คิวติดตาม", "เป็นมุมมองซ้ำของชีต Lead ระบบใช้ชีต Lead แทนเพื่อไม่ให้ข้อมูลซ้ำ"],
  ["ช่องทางการตลาด", "ชีตสรุปรายช่องทาง เป็นผลคำนวณจากลูกค้าและดีล"],
  ["customerjourney", "ชีตวิเคราะห์เส้นทางลูกค้า เป็นผลคำนวณ"],
  ["งานค้างและความเสี่ยง", "เป็นมุมมองซ้ำของชีตงานติดตาม ระบบใช้ชีตงานติดตามแทน"]
]);

// "ข้อเสนอและกำไร" เป็นชีตวิเคราะห์ ไม่ได้เก็บขั้น Pipeline หรือรูปแบบธุรกิจของข้อเสนอ
// รายงานรุ่นใหม่จึงมีชีต "ข้อมูลข้อเสนอ" ที่เก็บครบให้แทน แต่ไฟล์ที่ผู้ใช้ export ไปแล้ว
// ก่อนหน้านี้ไม่มีชีตนั้น ถ้าตัดทิ้งเลยไฟล์เก่าจะนำเข้าข้อเสนอไม่ได้เลย จึงยังใช้เป็น
// ตัวสำรองเมื่อไฟล์ไม่มีชีตข้อมูลดิบของข้อเสนอ
const OFFER_ANALYSIS_SHEET = "ข้อเสนอและกำไร";
const OFFER_RAW_SHEET = "ข้อมูลข้อเสนอ";

export function routeSheet(sheet, workbookSheetNames = []) {
  const key = normalizeKey(sheet?.name);
  const names = workbookSheetNames.map(normalizeKey);
  if (key === normalizeKey(OFFER_ANALYSIS_SHEET)) {
    return names.includes(normalizeKey(OFFER_RAW_SHEET))
      ? { collection: null, reason: "ไฟล์นี้มีชีตข้อมูลข้อเสนอที่ครบกว่าแล้ว ระบบใช้ชีตนั้นแทน", source: "name" }
      : { collection: "products", reason: "", source: "name" };
  }
  const skipReason = skippedSheets.get(key);
  if (skipReason) return { collection: null, reason: skipReason, source: "name" };
  const named = sheetRoutes.get(key);
  if (named) return { collection: named, reason: "", source: "name" };
  if (!sheet?.rows?.length) return { collection: null, reason: "ไม่พบแถวข้อมูลในชีตนี้", source: "empty" };
  const { collection, score } = classifyRows(sheet.rows);
  if (score < MIN_DETECTION_SCORE) return { collection: null, reason: "ไม่พบคอลัมน์ที่ตรงกับข้อมูลชุดใดในระบบ", source: "detect" };
  return { collection, reason: "", source: "detect" };
}

function importedId(prefix, index) {
  return `${prefix}-import-${Date.now().toString(36)}-${index.toString(36)}`;
}

function normalizeBusinessMode(value, fallback) {
  const normalized = normalizeKey(value);
  const values = { online: "online", onsite: "onsite", wholesale: "wholesale", retail: "retail", ออนไลน์: "online", ออนไซต์: "onsite", ขายส่ง: "wholesale", ค้าปลีก: "retail" };
  return values[normalized] || fallback || "online";
}

// รายงานเขียนหมวดธุรกิจเป็นป้ายที่คนอ่าน ("Creator / ธุรกิจออนไลน์") ไม่ใช่คีย์ ("creator")
// คืนค่าว่างเมื่อจับคู่ไม่ได้ เพื่อให้ผู้เรียกเลือกได้ว่าจะคงค่าเดิมไว้ ดีกว่าเดาผิดแล้วเปลี่ยน
// หมวดธุรกิจของผู้ใช้ทิ้งโดยที่เจ้าตัวไม่ได้สั่ง
function normalizeBusinessCategory(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return "";
  if (businessCategories[normalized]) return normalized;
  const matched = Object.entries(businessCategories).find(([, label]) => normalizeKey(label) === normalized);
  return matched ? matched[0] : "";
}

function normalizePipelineStage(value, fallback = "Proposal") {
  const normalized = normalizeKey(value);
  const stages = { new: "New", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost", สนใจ: "Qualified", เสนอราคา: "Proposal", เจรจา: "Negotiation", ชนะ: "Won", แพ้: "Lost" };
  return stages[normalized] || dealStageFromLabel[normalized] || fallback;
}

function normalizeTaskStatus(value) {
  const normalized = normalizeKey(value);
  return ({ todo: "todo", inprogress: "in_progress", done: "done", overdue: "overdue" })[normalized]
    || taskStatusFromLabel[normalized] || "todo";
}

function normalizePriority(value) {
  const normalized = normalizeKey(value);
  const direct = ["High", "Medium", "Low"].find((item) => normalizeKey(item) === normalized);
  return direct || priorityFromLabel[normalized] || "Medium";
}

function normalizeLeadStatus(value) {
  const normalized = normalizeKey(value);
  return ({
    newlead: "New Lead", contacted: "Contacted", interested: "Interested", proposalsent: "Proposal Sent",
    ใหม่: "New Lead"
  })[normalized] || leadStatusFromLabel[normalized] || "New Lead";
}

function dateValue(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function findCustomer(currentState, fields) {
  return (currentState.customers || []).find((item) =>
    item.id === fields.customerId || normalizeKey(item.fullName) === normalizeKey(fields.customerName));
}

export function buildImportPlan(parsed, options = {}) {
  if (parsed?.kind === "state") {
    return { kind: "state", collection: "state", importedState: copy(parsed.importedState), records: [], relatedRecords: { leads: [] }, rejected: [], format: parsed.format };
  }
  if (options.collection === "all") return buildWorkbookPlan(parsed, options);
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  const collection = options.collection && options.collection !== "auto" ? options.collection : detectImportCollection(rows);
  if (!collections.includes(collection)) throw new Error("กรุณาเลือกประเภทข้อมูลที่จะนำเข้า");
  const profile = options.businessProfile || {};
  const currentState = options.state || {};
  // แถวแรกของข้อมูลอยู่บรรทัดไหนในไฟล์จริง ใช้รายงานเลขแถวให้ตรงกับที่ผู้ใช้เห็นใน Excel
  const firstDataRow = Number(options.firstDataRow) || 2;
  const records = [];
  const leads = [];
  const rejected = [];

  rows.forEach((row, index) => {
    const fields = fieldLookup(row, collection);
    const rowNumber = index + firstDataRow;
    if (collection === "profile") {
      // แถวเดียวพอ ถ้ามีหลายแถวให้ใช้แถวแรกที่มีชื่อธุรกิจ เพื่อไม่ให้โปรไฟล์ถูกเขียนทับไปมา
      if (records.length) return;
      const name = String(fields.businessName || "").trim();
      const target = numberValue(fields.revenueTarget, -1);
      if (!name && target < 0) return rejected.push({ row: rowNumber, reason: "ไม่พบชื่อธุรกิจหรือเป้ารายได้" });
      const nextProfile = {};
      if (name) nextProfile.businessName = name;
      if (fields.businessMode) nextProfile.businessMode = normalizeBusinessMode(fields.businessMode, profile.businessMode);
      const category = normalizeBusinessCategory(fields.businessCategory);
      if (category) {
        nextProfile.businessCategory = category;
        nextProfile.businessAvatar = category;
      }
      if (target >= 0) nextProfile.revenueTarget = target;
      records.push(nextProfile);
    } else if (collection === "customers") {
      if (!fields.fullName) return rejected.push({ row: rowNumber, reason: "ไม่พบชื่อลูกค้า" });
      const id = importedId("c", index);
      const offer = (currentState.products || []).find((item) => normalizeKey(item.name) === normalizeKey(fields.solutionPackage));
      records.push({
        id, fullName: String(fields.fullName), phone: String(fields.phone || "-"), source: String(fields.source || "ไม่ระบุ"),
        solutionPackageId: offer?.id || "", solutionPackage: offer?.name || String(fields.solutionPackage || ""),
        interest: String(fields.interest || "นำเข้าจากไฟล์"), customerType: String(fields.customerType || "ยังไม่จัดกลุ่ม"),
        businessMode: offer?.businessMode || profile.businessMode || "online", businessCategory: offer?.businessCategory || profile.businessCategory || "service",
        avatar: "", avatarPreset: profile.businessCategory || "service",
        // วันที่รู้จักลูกค้าเป็นข้อมูลของธุรกิจ ไม่ใช่วันที่กดนำเข้า ถ้าไฟล์บอกมาต้องใช้ตามนั้น
        createdAt: fields.createdAt ? dateValue(fields.createdAt) : new Date().toISOString().slice(0, 10)
      });
      leads.push({ id: importedId("l", index), customerId: id, status: normalizeLeadStatus(fields.leadStatus), assignedTo: "Sales Team", leadScore: 50, nextFollowUp: dateValue(Date.now() + 2 * 86400000) });
    } else if (collection === "products") {
      if (!fields.name) return rejected.push({ row: rowNumber, reason: "ไม่พบชื่อสินค้า/Package" });
      const businessMode = normalizeBusinessMode(fields.businessMode, profile.businessMode);
      const pipelineStage = normalizePipelineStage(fields.pipelineStage);
      records.push({
        id: importedId("p", index), name: String(fields.name), category: normalizeOfferCategory(fields.category),
        price: Math.max(0, numberValue(fields.price)), cost: Math.max(0, numberValue(fields.cost)), status: ["inactive", "ปิดขาย", "ปิด"].includes(normalizeKey(fields.status)) ? "inactive" : "active",
        businessMode, businessCategory: String(fields.businessCategory || profile.businessCategory || "service"), pipelineStage,
        description: String(fields.description || `ข้อเสนอที่นำเข้าสำหรับธุรกิจ ${businessMode}`),
        recommendationReason: String(fields.recommendationReason || `ใช้ในขั้น ${pipelineStage}`)
      });
    } else if (collection === "leads") {
      const customer = findCustomer(currentState, fields);
      if (!customer) return rejected.push({ row: rowNumber, reason: "ไม่พบลูกค้าที่ตรงกับ Lead นี้" });
      records.push({
        id: importedId("l", index), customerId: customer.id, status: normalizeLeadStatus(fields.status),
        assignedTo: String(fields.assignedTo || "Sales Team"),
        leadScore: Math.min(100, Math.max(0, numberValue(fields.leadScore, 50))),
        nextFollowUp: dateValue(fields.nextFollowUp)
      });
    } else if (collection === "deals") {
      const customer = findCustomer(currentState, fields);
      if (!fields.name || !customer) return rejected.push({ row: rowNumber, reason: !fields.name ? "ไม่พบชื่อดีล" : "ไม่พบลูกค้าที่ตรงกับดีล" });
      const offer = (currentState.products || []).find((item) => normalizeKey(item.name) === normalizeKey(fields.offerName));
      const stage = normalizePipelineStage(fields.stage, "New");
      records.push({ id: importedId("d", index), customerId: customer.id, productId: offer?.id || "", offerName: offer?.name || String(fields.offerName || ""), name: String(fields.name), value: Math.max(0, numberValue(fields.value)), stage, probability: stage === "Won" ? 100 : stage === "Lost" ? 0 : Math.min(100, Math.max(0, numberValue(fields.probability, 50))) });
    } else {
      if (!fields.title) return rejected.push({ row: rowNumber, reason: "ไม่พบชื่องาน" });
      const offer = (currentState.products || []).find((item) => normalizeKey(item.name) === normalizeKey(fields.offerName));
      records.push({ id: importedId("t", index), title: String(fields.title), owner: String(fields.owner || "ทีมงาน"), dueDate: dateValue(fields.dueDate), priority: normalizePriority(fields.priority), status: normalizeTaskStatus(fields.status), productId: offer?.id || "", offerName: offer?.name || String(fields.offerName || "") });
    }
  });

  return { kind: "rows", collection, records, relatedRecords: { leads }, rejected, sourceRows: rows, format: parsed?.format || "unknown" };
}

// นำเข้าทั้งไฟล์: จัดเส้นทางทุกชีตก่อน แล้วค่อยเรียงลำดับตาม dependency
// การ dry-run ตรงนี้ทำให้ตัวเลขที่โชว์ใน Preview เท่ากับผลจริงตอนกดยืนยัน
// ไม่ใช่ตัวเลขที่คำนวณจาก state เก่าซึ่งจะต่ำกว่าความจริงเสมอ
export function buildWorkbookPlan(parsed, options = {}) {
  const sheets = Array.isArray(parsed?.sheets) ? parsed.sheets : [];
  const sheetNames = sheets.map((sheet) => sheet.name);
  const steps = [];
  const skipped = [];
  for (const [index, sheet] of sheets.entries()) {
    const route = routeSheet(sheet, sheetNames);
    if (!route.collection) {
      skipped.push({ index, name: sheet.name, reason: route.reason });
      continue;
    }
    steps.push({ index, name: sheet.name, collection: route.collection, rows: sheet.rows || [], firstDataRow: sheet.firstDataRow || 2 });
  }
  steps.sort((left, right) => collections.indexOf(left.collection) - collections.indexOf(right.collection));

  const businessProfile = options.businessProfile || {};
  const dryRun = runWorkbookImport(options.state || {}, { steps, businessProfile });
  return {
    kind: "workbook", collection: "all", steps, skipped, businessProfile,
    sheetResults: dryRun.sheetResults, records: [], relatedRecords: { leads: [] },
    rejected: dryRun.rejected, format: parsed?.format || "unknown"
  };
}

function runWorkbookImport(inputState, plan) {
  let state = copy(inputState);
  for (const key of ["customers", "leads", "products", "deals", "tasks"]) if (!Array.isArray(state[key])) state[key] = [];
  const sheetResults = [];
  const rejected = [];
  let created = 0;
  let updated = 0;
  for (const step of plan.steps) {
    const subPlan = buildImportPlan(
      { kind: "rows", rows: step.rows, format: "workbook" },
      {
        collection: step.collection,
        // ต้องอ่านโปรไฟล์จาก state ที่กำลังเดินอยู่ ไม่ใช่ค่าที่ล็อกไว้ตอนสร้างแผน
        // เพราะชีตตั้งค่าธุรกิจถูกนำเข้าไปแล้วในรอบก่อนหน้า ข้อเสนอและลูกค้าที่ตามมา
        // ต้องยืมค่าจากโปรไฟล์ที่กู้คืนแล้ว ไม่ใช่โปรไฟล์เปล่าหลัง Set Zero
        businessProfile: state.businessProfile || plan.businessProfile,
        state,
        firstDataRow: step.firstDataRow
      }
    );
    const applied = applyImportPlan(state, subPlan);
    state = applied.state;
    created += applied.stats.created;
    updated += applied.stats.updated;
    for (const item of subPlan.rejected) rejected.push({ ...item, sheet: step.name });
    sheetResults.push({
      name: step.name, collection: step.collection,
      created: applied.stats.created, updated: applied.stats.updated, rejected: subPlan.rejected.length
    });
  }
  return { state, sheetResults, rejected, stats: { created, updated, rejected: rejected.length, replacedState: false } };
}

function recordMatch(collection, existing, incoming) {
  if (existing.id === incoming.id) return true;
  if (collection === "customers") {
    const incomingPhone = normalizeKey(incoming.phone);
    return incomingPhone && incomingPhone !== "-" ? normalizeKey(existing.phone) === incomingPhone : normalizeKey(existing.fullName) === normalizeKey(incoming.fullName);
  }
  if (collection === "products") return normalizeKey(existing.name) === normalizeKey(incoming.name);
  if (collection === "leads") return existing.customerId === incoming.customerId;
  if (collection === "deals") return normalizeKey(existing.name) === normalizeKey(incoming.name) && existing.customerId === incoming.customerId;
  if (collection === "tasks") return normalizeKey(existing.title) === normalizeKey(incoming.title)
    && normalizeKey(existing.owner) === normalizeKey(incoming.owner)
    && existing.dueDate === incoming.dueDate;
  return false;
}

export function applyImportPlan(inputState, plan) {
  if (plan.kind === "state") return { state: copy(plan.importedState), stats: { created: 0, updated: 0, rejected: 0, replacedState: true } };
  if (plan.kind === "workbook") {
    const result = runWorkbookImport(inputState, plan);
    return { state: result.state, stats: { ...result.stats, sheetResults: result.sheetResults } };
  }
  const state = copy(inputState);
  for (const key of ["customers", "leads", "products", "deals", "tasks"]) if (!Array.isArray(state[key])) state[key] = [];
  if (plan.collection === "profile") {
    // ทับเฉพาะช่องที่ไฟล์บอกมาจริง ช่องที่ไฟล์ไม่มีต้องคงของเดิมไว้
    const patch = plan.records[0];
    if (!patch) return { state, stats: { created: 0, updated: 0, rejected: plan.rejected?.length || 0, replacedState: false } };
    state.businessProfile = { ...(state.businessProfile || {}), ...patch };
    return { state, stats: { created: 0, updated: 1, rejected: plan.rejected?.length || 0, replacedState: false } };
  }
  let created = 0;
  let updated = 0;
  const idMap = new Map();
  plan.records.forEach((record) => {
    const existing = state[plan.collection].find((item) => recordMatch(plan.collection, item, record));
    if (existing) {
      idMap.set(record.id, existing.id);
      Object.assign(existing, record, { id: existing.id });
      updated += 1;
    } else {
      state[plan.collection].push(copy(record));
      idMap.set(record.id, record.id);
      created += 1;
    }
  });
  if (plan.collection === "customers") {
    (plan.relatedRecords?.leads || []).forEach((lead) => {
      const customerId = idMap.get(lead.customerId) || lead.customerId;
      const existingLead = state.leads.find((item) => item.customerId === customerId);
      if (!existingLead) state.leads.push({ ...copy(lead), customerId });
    });
  }
  return { state, stats: { created, updated, rejected: plan.rejected?.length || 0, replacedState: false } };
}
