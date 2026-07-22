export const supportedImportExtensions = ["json", "csv", "cvs", "tsv", "xls", "xlsx", "md", "txt", "doc", "docx"];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const collections = ["customers", "products", "deals", "tasks"];

const fieldAliases = {
  customers: {
    fullName: ["fullname", "name", "customer", "customername", "ชื่อลูกค้า", "ชื่อนามสกุล", "ชื่อ"],
    phone: ["phone", "tel", "telephone", "mobile", "เบอร์โทร", "โทรศัพท์", "มือถือ"],
    source: ["source", "channel", "contactchannel", "ช่องทาง", "ช่องทางที่มา", "แหล่งที่มา"],
    solutionPackage: ["solutionpackage", "package", "offer", "product", "แพ็กเกจ", "packageoffer", "ข้อเสนอ", "สินค้า"],
    interest: ["interest", "need", "needs", "requirement", "ความสนใจ", "ความต้องการ", "โจทย์ธุรกิจ"],
    customerType: ["customertype", "segment", "type", "ประเภทลูกค้า", "กลุ่มลูกค้า"],
    leadStatus: ["leadstatus", "crmstatus", "สถานะlead", "สถานะลูกค้า"]
  },
  products: {
    name: ["name", "product", "productname", "package", "packagename", "offer", "offername", "ชื่อสินค้า", "ชื่อแพ็กเกจ", "ชื่อข้อเสนอ", "สินค้า"],
    category: ["category", "type", "producttype", "ประเภท", "ประเภทข้อเสนอ", "หมวดสินค้า"],
    price: ["price", "sellingprice", "amount", "ราคา", "ราคาขาย"],
    cost: ["cost", "ต้นทุน", "ราคาทุน"],
    businessMode: ["businessmode", "salesmode", "รูปแบบธุรกิจ", "รูปแบบการขาย"],
    businessCategory: ["businesscategory", "industry", "หมวดธุรกิจ", "ประเภทธุรกิจ"],
    pipelineStage: ["pipelinestage", "stage", "ขั้นpipeline", "สถานะpipeline"],
    description: ["description", "detail", "details", "คำอธิบาย", "รายละเอียด"],
    recommendationReason: ["recommendationreason", "reason", "เหตุผลแนะนำ", "จุดขาย"],
    status: ["status", "สถานะ"]
  },
  deals: {
    name: ["dealname", "opportunity", "opportunityname", "ชื่อดีล", "ชื่อโอกาส", "ดีล"],
    customerId: ["customerid", "รหัสลูกค้า"],
    customerName: ["customer", "customername", "ชื่อลูกค้า", "ลูกค้า"],
    offerName: ["offer", "product", "package", "ข้อเสนอ", "สินค้า", "แพ็กเกจ"],
    value: ["value", "amount", "dealvalue", "มูลค่า", "ยอดขาย"],
    stage: ["stage", "dealstage", "pipeline", "สถานะดีล", "ขั้นpipeline"],
    probability: ["probability", "chance", "โอกาสสำเร็จ", "เปอร์เซ็นต์"]
  },
  tasks: {
    title: ["title", "task", "taskname", "งาน", "ชื่องาน", "งานที่ต้องทำ"],
    owner: ["owner", "assignee", "assignedto", "ผู้รับผิดชอบ", "เจ้าของงาน"],
    dueDate: ["duedate", "deadline", "date", "กำหนดเสร็จ", "วันครบกำหนด"],
    priority: ["priority", "ความสำคัญ"],
    status: ["status", "taskstatus", "สถานะ", "สถานะงาน"],
    offerName: ["offer", "product", "package", "ข้อเสนอ", "สินค้า", "แพ็กเกจ"]
  }
};

function copy(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_./()\-]+/g, "");
}

function cleanValue(value) {
  return typeof value === "string" ? value.trim() : value;
}

function numberValue(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[,฿%\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
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

function delimitedRows(text, delimiter) {
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
  const headers = parseDelimitedLine(logicalLines[0], delimiter).map((header, index) => header || `คอลัมน์ ${index + 1}`);
  return logicalLines.slice(1).map((item) => {
    const values = parseDelimitedLine(item, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cleanValue(values[index] ?? "")]));
  }).filter((row) => Object.values(row).some((value) => String(value).trim()));
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
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      rows: xlsx.utils.sheet_to_json(workbook.Sheets[name], { defval: "", raw: false })
    }));
    const firstSheet = sheets.find((sheet) => sheet.rows.length) || sheets[0] || { name: "Sheet 1", rows: [] };
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

function collectionScore(row, collection) {
  const mapped = fieldLookup(row, collection);
  const weight = collection === "customers"
    ? { fullName: 5, phone: 4, source: 2, interest: 2, solutionPackage: 1 }
    : collection === "products"
      ? { name: 5, price: 4, cost: 3, businessMode: 2, category: 2, description: 1 }
      : collection === "deals"
        ? { name: 4, value: 4, customerName: 4, stage: 2, probability: 2 }
        : { title: 5, owner: 3, dueDate: 4, priority: 2, status: 1 };
  return Object.entries(weight).reduce((score, [field, value]) => score + (mapped[field] !== "" ? value : 0), 0);
}

export function detectImportCollection(rows) {
  const sample = rows?.[0] || {};
  return collections
    .map((collection) => [collection, collectionScore(sample, collection)])
    .sort((left, right) => right[1] - left[1])[0]?.[0] || "customers";
}

function importedId(prefix, index) {
  return `${prefix}-import-${Date.now().toString(36)}-${index.toString(36)}`;
}

function normalizeBusinessMode(value, fallback) {
  const normalized = normalizeKey(value);
  const values = { online: "online", onsite: "onsite", wholesale: "wholesale", retail: "retail", ออนไลน์: "online", ออนไซต์: "onsite", ขายส่ง: "wholesale", ค้าปลีก: "retail" };
  return values[normalized] || fallback || "online";
}

function normalizePipelineStage(value, fallback = "Proposal") {
  const normalized = normalizeKey(value);
  const stages = { new: "New", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost", สนใจ: "Qualified", เสนอราคา: "Proposal", เจรจา: "Negotiation", ชนะ: "Won", แพ้: "Lost" };
  return stages[normalized] || fallback;
}

function normalizeProductCategory(value) {
  const allowed = ["สินค้า", "บริการ", "Package", "Subscription", "Bundle"];
  const exact = allowed.find((item) => normalizeKey(item) === normalizeKey(value));
  return exact || "Package";
}

function normalizeTaskStatus(value) {
  const normalized = normalizeKey(value);
  return ({ todo: "todo", inprogress: "in_progress", done: "done", overdue: "overdue", รอดำเนินการ: "todo", กำลังทำ: "in_progress", เสร็จแล้ว: "done", เลยกำหนด: "overdue" })[normalized] || "todo";
}

function normalizeLeadStatus(value) {
  const normalized = normalizeKey(value);
  return ({
    newlead: "New Lead", contacted: "Contacted", interested: "Interested", proposalsent: "Proposal Sent",
    ลูกค้าใหม่: "New Lead", ใหม่: "New Lead", ติดต่อแล้ว: "Contacted", สนใจ: "Interested", ส่งข้อเสนอแล้ว: "Proposal Sent"
  })[normalized] || "New Lead";
}

function dateValue(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

export function buildImportPlan(parsed, options = {}) {
  if (parsed?.kind === "state") {
    return { kind: "state", collection: "state", importedState: copy(parsed.importedState), records: [], relatedRecords: { leads: [] }, rejected: [], format: parsed.format };
  }
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  const collection = options.collection && options.collection !== "auto" ? options.collection : detectImportCollection(rows);
  if (!collections.includes(collection)) throw new Error("กรุณาเลือกประเภทข้อมูลที่จะนำเข้า");
  const profile = options.businessProfile || {};
  const currentState = options.state || {};
  const records = [];
  const leads = [];
  const rejected = [];

  rows.forEach((row, index) => {
    const fields = fieldLookup(row, collection);
    if (collection === "customers") {
      if (!fields.fullName) return rejected.push({ row: index + 2, reason: "ไม่พบชื่อลูกค้า" });
      const id = importedId("c", index);
      const offer = (currentState.products || []).find((item) => normalizeKey(item.name) === normalizeKey(fields.solutionPackage));
      records.push({
        id, fullName: String(fields.fullName), phone: String(fields.phone || "-"), source: String(fields.source || "ไม่ระบุ"),
        solutionPackageId: offer?.id || "", solutionPackage: offer?.name || String(fields.solutionPackage || ""),
        interest: String(fields.interest || "นำเข้าจากไฟล์"), customerType: String(fields.customerType || "ยังไม่จัดกลุ่ม"),
        businessMode: offer?.businessMode || profile.businessMode || "online", businessCategory: offer?.businessCategory || profile.businessCategory || "service",
        avatar: "", avatarPreset: profile.businessCategory || "service", createdAt: new Date().toISOString().slice(0, 10)
      });
      leads.push({ id: importedId("l", index), customerId: id, status: normalizeLeadStatus(fields.leadStatus), assignedTo: "Sales Team", leadScore: 50, nextFollowUp: dateValue(Date.now() + 2 * 86400000) });
    } else if (collection === "products") {
      if (!fields.name) return rejected.push({ row: index + 2, reason: "ไม่พบชื่อสินค้า/Package" });
      const businessMode = normalizeBusinessMode(fields.businessMode, profile.businessMode);
      const pipelineStage = normalizePipelineStage(fields.pipelineStage);
      records.push({
        id: importedId("p", index), name: String(fields.name), category: normalizeProductCategory(fields.category),
        price: Math.max(0, numberValue(fields.price)), cost: Math.max(0, numberValue(fields.cost)), status: normalizeKey(fields.status) === "inactive" ? "inactive" : "active",
        businessMode, businessCategory: String(fields.businessCategory || profile.businessCategory || "service"), pipelineStage,
        description: String(fields.description || `ข้อเสนอที่นำเข้าสำหรับธุรกิจ ${businessMode}`),
        recommendationReason: String(fields.recommendationReason || `ใช้ในขั้น ${pipelineStage}`)
      });
    } else if (collection === "deals") {
      const customer = (currentState.customers || []).find((item) => item.id === fields.customerId || normalizeKey(item.fullName) === normalizeKey(fields.customerName));
      if (!fields.name || !customer) return rejected.push({ row: index + 2, reason: !fields.name ? "ไม่พบชื่อดีล" : "ไม่พบลูกค้าที่ตรงกับดีล" });
      const offer = (currentState.products || []).find((item) => normalizeKey(item.name) === normalizeKey(fields.offerName));
      const stage = normalizePipelineStage(fields.stage, "New");
      records.push({ id: importedId("d", index), customerId: customer.id, productId: offer?.id || "", offerName: offer?.name || String(fields.offerName || ""), name: String(fields.name), value: Math.max(0, numberValue(fields.value)), stage, probability: stage === "Won" ? 100 : stage === "Lost" ? 0 : Math.min(100, Math.max(0, numberValue(fields.probability, 50))) });
    } else {
      if (!fields.title) return rejected.push({ row: index + 2, reason: "ไม่พบชื่องาน" });
      const offer = (currentState.products || []).find((item) => normalizeKey(item.name) === normalizeKey(fields.offerName));
      records.push({ id: importedId("t", index), title: String(fields.title), owner: String(fields.owner || "ทีมงาน"), dueDate: dateValue(fields.dueDate), priority: ["High", "Medium", "Low"].includes(fields.priority) ? fields.priority : "Medium", status: normalizeTaskStatus(fields.status), productId: offer?.id || "", offerName: offer?.name || String(fields.offerName || "") });
    }
  });

  return { kind: "rows", collection, records, relatedRecords: { leads }, rejected, sourceRows: rows, format: parsed?.format || "unknown" };
}

function recordMatch(collection, existing, incoming) {
  if (existing.id === incoming.id) return true;
  if (collection === "customers") {
    const incomingPhone = normalizeKey(incoming.phone);
    return incomingPhone && incomingPhone !== "-" ? normalizeKey(existing.phone) === incomingPhone : normalizeKey(existing.fullName) === normalizeKey(incoming.fullName);
  }
  if (collection === "products") return normalizeKey(existing.name) === normalizeKey(incoming.name);
  if (collection === "deals") return normalizeKey(existing.name) === normalizeKey(incoming.name) && existing.customerId === incoming.customerId;
  if (collection === "tasks") return normalizeKey(existing.title) === normalizeKey(incoming.title)
    && normalizeKey(existing.owner) === normalizeKey(incoming.owner)
    && existing.dueDate === incoming.dueDate;
  return false;
}

export function applyImportPlan(inputState, plan) {
  if (plan.kind === "state") return { state: copy(plan.importedState), stats: { created: 0, updated: 0, rejected: 0, replacedState: true } };
  const state = copy(inputState);
  for (const key of ["customers", "leads", "products", "deals", "tasks"]) if (!Array.isArray(state[key])) state[key] = [];
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
