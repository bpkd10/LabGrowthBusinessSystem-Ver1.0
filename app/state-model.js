// ตรรกะจัดการ state และการคำนวณตัวเลข แยกออกจาก app.js เพื่อให้ทดสอบได้โดยไม่ต้องมี DOM
//
// กฎของไฟล์นี้: ทุกฟังก์ชันต้องรับ state เข้ามาเป็นพารามิเตอร์ ห้ามอ่านตัวแปร state
// ส่วนกลางของแอป และห้ามแตะ document, window หรือ localStorage
// scripts/check-app-model.mjs import ไฟล์นี้ตรง ๆ ใน Node ที่ไม่มี DOM ถ้าเผลอใส่โค้ด
// ที่แตะ browser API เข้ามา ชุดตรวจจะพังทันที
//
// ที่ต้องแยกออกมาเพราะเดิมตรรกะพวกนี้อยู่ใน closure เดียวกับโค้ด render ทำให้ทดสอบ
// normalizeState หรือ computeMetrics ไม่ได้เลยนอกจากเปิด browser จริง

import {
  buildProfileCatalog,
  mergeCatalogWithProducts,
  normalizeOfferRelations
} from "./business-workflows.js?v=25";
import {
  businessCatalogs,
  businessModes,
  dealStages,
  HISTORY_MONTH_LIMIT,
  marketingPackages,
  productCategories,
  seedData,
  SCHEMA_VERSION,
  thaiMonthLabels
} from "./business-config.js?v=25";

export function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

export function currency(value) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

export function percent(value) {
  return `${Math.round(value)}%`;
}

export function uid(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export function initials(name) {
  return String(name || "ลูกค้า").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

export function validIsoDate(value) {
  if (typeof value !== "string") return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

// ประเภทลูกค้าเป็น "ป้ายกำกับ" ที่ระบบใช้แค่จัดกลุ่มและนับ ไม่มีตรรกะไหนคำนวณจากค่านี้
// จึงปล่อยให้ผู้ใช้ตั้งชื่อกลุ่มเองได้ตามธุรกิจจริง เช่น "ลูกค้าประจำหน้าร้าน" หรือ
// "ดีลเลอร์ภาคเหนือ" — เดิมโค้ดนี้ดึงค่ากลับเข้ากรอบ 4 กลุ่มของ Business Mode เสมอ
// ผู้ใช้ที่พิมพ์ชื่อกลุ่มของตัวเองจึงถูกเขียนทับเงียบ ๆ โดยไม่มีอะไรเตือน
//
// ยังคงเติมค่าเริ่มต้นให้เมื่อไม่มีค่า เพื่อไม่ให้เกิดลูกค้าที่ไม่มีกลุ่มเลย
// ซึ่งจะทำให้ตารางสรุปตามกลุ่มมีช่องว่างที่อธิบายไม่ได้
export function alignCustomerType(customer) {
  const mode = businessModes[customer.businessMode] || businessModes.online;
  const typed = typeof customer.customerType === "string" ? customer.customerType.trim() : "";
  return { ...customer, customerType: typed || mode.customerTypes[0] };
}

// "2026-08" จากวันที่รูปแบบ ISO — ใช้เป็นกุญแจของ snapshot รายเดือน
export function monthKey(dateIso = todayIso()) {
  return String(dateIso).slice(0, 7);
}

// แปลง "2026-08" เป็น "ส.ค. 2569" สำหรับแสดงผล (พ.ศ. = ค.ศ. + 543)
export function thaiMonthLabel(key) {
  const [year, month] = String(key).split("-").map(Number);
  if (!year || !month) return String(key);
  return `${thaiMonthLabels[month - 1] || month} ${year + 543}`;
}

// ตัวเลขสรุปของเดือนหนึ่ง เก็บเฉพาะผลรวม ไม่เก็บข้อมูลดิบของลูกค้าเลย
// เพราะจุดประสงค์คือดูทิศทาง ไม่ใช่ย้อนดูรายการเก่า และการไม่เก็บข้อมูลบุคคล
// ซ้ำซ้อนทำให้ไฟล์สำรองไม่บวมและไม่มีสำเนาเบอร์โทรกระจายอยู่หลายที่
export function captureSnapshot(state, referenceDate = todayIso()) {
  const data = computeMetrics(state, referenceDate);
  return {
    month: monthKey(referenceDate),
    capturedAt: referenceDate,
    revenue: data.revenue,
    pipelineValue: data.pipelineValue,
    totalLeads: data.totalLeads,
    openDeals: data.openDeals,
    conversionRate: Math.round(data.conversionRate * 10) / 10,
    pendingTasks: data.pendingTasks,
    overdueTasks: data.overdueTasks,
    customers: state.customers.length,
    wonDeals: state.deals.filter((deal) => deal.stage === "Won").length
  };
}

// บันทึกสรุปของเดือนปัจจุบันทับรายการเดิมของเดือนเดียวกัน
//
// ที่เขียนทับแทนที่จะเพิ่มใหม่ เพราะเดือนที่ยังไม่จบต้องสะท้อนสถานะล่าสุดเสมอ
// พอขึ้นเดือนใหม่ รายการของเดือนก่อนจะหยุดนิ่งเองโดยไม่ต้องมีตัวตั้งเวลาใด ๆ
// ซึ่งจำเป็น เพราะแอปนี้ไม่มีเซิร์ฟเวอร์ที่จะรันงานตามกำหนดเวลาให้
export function recordSnapshot(state, referenceDate = todayIso()) {
  const snapshot = captureSnapshot(state, referenceDate);
  const history = Array.isArray(state.history) ? [...state.history] : [];
  const existingIndex = history.findIndex((item) => item.month === snapshot.month);
  if (existingIndex >= 0) history[existingIndex] = snapshot;
  else history.push(snapshot);
  history.sort((a, b) => a.month.localeCompare(b.month));
  return history.slice(-HISTORY_MONTH_LIMIT);
}

// เทียบเดือนปัจจุบันกับ snapshot ล่าสุดที่ไม่ใช่เดือนปัจจุบัน
//
// คืน available: false เมื่อยังไม่มีเดือนก่อนหน้าให้เทียบ ซึ่งเป็นเรื่องปกติของ
// ผู้ใช้ใหม่ ผู้เรียกต้องบอกผู้ใช้ตรง ๆ ว่ายังเทียบไม่ได้ ห้ามแสดง 0% เพราะ
// "ไม่มีข้อมูล" กับ "ไม่เปลี่ยนแปลง" เป็นคนละเรื่องและนำไปสู่การตัดสินใจคนละแบบ
export function compareToPrevious(state, referenceDate = todayIso()) {
  const current = captureSnapshot(state, referenceDate);
  const history = Array.isArray(state.history) ? state.history : [];
  const previous = [...history]
    .filter((item) => item.month < current.month)
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
  if (!previous) {
    return { available: false, current, previous: null, changes: {}, reason: "ยังไม่มีข้อมูลเดือนก่อนหน้าให้เทียบ ระบบเพิ่งเริ่มเก็บประวัติเดือนนี้" };
  }
  const metricKeys = ["revenue", "pipelineValue", "totalLeads", "openDeals", "conversionRate", "customers", "wonDeals", "pendingTasks", "overdueTasks"];
  const changes = {};
  for (const key of metricKeys) {
    const before = Number(previous[key] || 0);
    const after = Number(current[key] || 0);
    const diff = after - before;
    changes[key] = {
      before,
      after,
      diff,
      // เพิ่มจากศูนย์คำนวณเป็นเปอร์เซ็นต์ไม่ได้ (หารด้วยศูนย์) จึงคืน null ให้ผู้เรียก
      // แสดงเป็น "ใหม่" แทนที่จะโชว์ Infinity หรือ 100% ซึ่งทั้งคู่ให้ความหมายผิด
      percent: before === 0 ? null : Math.round((diff / before) * 1000) / 10
    };
  }
  return {
    available: true,
    current,
    previous,
    changes,
    reason: `เทียบกับ ${thaiMonthLabel(previous.month)} ซึ่งเป็นเดือนล่าสุดที่มีข้อมูลบันทึกไว้`
  };
}

// ประเภทข้อเสนอเป็นป้ายกำกับเช่นเดียวกับประเภทลูกค้า ผู้ใช้ตั้งเองได้
// เช่น "คอร์สออนไลน์" หรือ "งานรับจ้างผลิต" — เดิมค่าที่ไม่รู้จักถูกเปลี่ยนเป็น
// "Package" ทั้งหมด ผู้ใช้จึงตั้งชื่อประเภทของตัวเองไม่ได้เลย
//
// ยังต้องแปลงค่าภาษาอังกฤษรุ่นเก่าอยู่ เพราะข้อมูลที่บันทึกไว้ก่อน schema 4 ใช้คำ
// อย่าง "course" หรือ "consulting" ซึ่งไม่มีในหน้าจอแล้ว ถ้าไม่แปลงจะเห็นคำอังกฤษ
// ปนอยู่ในรายงานภาษาไทยโดยที่ผู้ใช้ไม่เคยพิมพ์เอง
export function normalizeOfferCategory(value) {
  const category = typeof value === "string" ? value.trim() : "";
  if (!category) return "Package";
  if (productCategories.includes(category)) return category;
  if (/^(course|product)$/i.test(category)) return "สินค้า";
  if (/^(training|consulting|service)$/i.test(category)) return "บริการ";
  if (/^subscription$/i.test(category)) return "Subscription";
  if (/^bundle$/i.test(category)) return "Bundle";
  return category;
}

export function normalizeState(data) {
  data.meta = {
    updatedAt: validIsoDate(data.meta?.updatedAt)
  };
  // ประวัติรายเดือนต้องรอดข้ามการ normalize ทุกครั้ง ไม่งั้นแค่เปิดแอปใหม่
  // ก็ล้างประวัติที่สะสมมาทั้งหมด กรองเฉพาะรายการที่มีเดือนถูกรูปแบบ เพื่อกัน
  // ไฟล์สำรองที่ถูกแก้มือจากภายนอกทำให้กราฟเทียบงวดเพี้ยน
  data.history = (Array.isArray(data.history) ? data.history : [])
    .filter((item) => item && /^\d{4}-\d{2}$/.test(String(item.month)))
    .map((item) => ({ ...item, month: String(item.month) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-HISTORY_MONTH_LIMIT);
  data.businessProfile = {
    ...clone(seedData.businessProfile),
    ...(data.businessProfile || {})
  };
  const catalog = buildProfileCatalog(data.businessProfile, businessCatalogs);
  const legacyPackageNames = marketingPackages.map((item) => item.name);
  const needsLegacyMapping = Number(data.schemaVersion || 0) < 4;
  data.customers = data.customers.map((customer, index) => {
    const solutionPackage = needsLegacyMapping && legacyPackageNames.includes(customer.solutionPackage)
      ? catalog[Math.max(0, legacyPackageNames.indexOf(customer.solutionPackage))]?.name || catalog[0].name
      : customer.solutionPackage || catalog[0].name;
    const matchedMode = Object.entries(businessCatalogs)
      .find(([, offers]) => offers.some((offer) => offer.name === solutionPackage))?.[0];
    const businessMode = businessModes[customer.businessMode]
      ? customer.businessMode
      : matchedMode || data.businessProfile.businessMode || "online";
    const customerMode = businessModes[businessMode] || businessModes.online;
    return {
      ...customer,
      solutionPackage,
      businessMode,
      businessCategory: customer.businessCategory || data.businessProfile.businessCategory || "service",
      avatar: customer.avatar || "",
      avatarPreset: customer.avatarPreset || data.businessProfile.businessCategory || "service",
      customerType: customer.customerType || customerMode.customerTypes[Math.min(index, customerMode.customerTypes.length - 1)]
    };
  });
  data.products = data.products.map((product) => ({
    ...product,
    category: normalizeOfferCategory(product.category),
    businessMode: businessModes[product.businessMode] ? product.businessMode : data.businessProfile.businessMode,
    businessCategory: product.businessCategory || data.businessProfile.businessCategory,
    pipelineStage: dealStages.includes(product.pipelineStage) ? product.pipelineStage : "Proposal"
  }));
  data.schemaVersion = SCHEMA_VERSION;
  const relatedState = normalizeOfferRelations(data);
  relatedState.customers = relatedState.customers.map(alignCustomerType);
  return relatedState;
}

// อ่าน state ที่บันทึกไว้จาก storage ใด ๆ ที่มี getItem — รับ storage เข้ามาแทนที่จะ
// อ้าง localStorage ตรง ๆ เพื่อให้ทดสอบเคส "ข้อมูลพัง" และ "ยังไม่เคยบันทึก" ได้ใน Node
export function loadStateFrom(storage, storageKey) {
  const saved = storage.getItem(storageKey);
  if (!saved) return normalizeState(clone(seedData));
  try {
    const parsed = JSON.parse(saved);
    const isValid = ["customers", "leads", "products", "deals", "tasks"]
      .every((key) => Array.isArray(parsed[key]));
    return isValid ? normalizeState(parsed) : normalizeState(clone(seedData));
  } catch {
    return normalizeState(clone(seedData));
  }
}

export function computeMetrics(state, referenceDate = todayIso()) {
  const totalLeads = state.leads.length;
  const wonDeals = state.deals.filter((deal) => deal.stage === "Won");
  const revenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const openDeals = state.deals.filter((deal) => !["Won", "Lost"].includes(deal.stage));
  const pendingTasks = state.tasks.filter((task) => task.status !== "done").length;
  const overdueTasks = state.tasks.filter((task) => task.status !== "done" && task.dueDate < referenceDate).length;
  const conversionRate = totalLeads ? (wonDeals.length / totalLeads) * 100 : 0;
  const pipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const sourceCounts = countBy(state.customers, "source");
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  return { totalLeads, revenue, openDeals: openDeals.length, pendingTasks, overdueTasks, conversionRate, pipelineValue, topSource };
}

export function sumDealsBySource(state) {
  return state.deals.reduce((acc, deal) => {
    const customer = state.customers.find((item) => item.id === deal.customerId);
    const source = customer?.source || "Unknown";
    acc[source] = (acc[source] || 0) + Number(deal.value);
    return acc;
  }, {});
}

export function revenueTargetOf(state) {
  return Math.max(0, Number(state.businessProfile?.revenueTarget) || 0);
}

export function currentBusinessModeOf(state) {
  return businessModes[state.businessProfile?.businessMode] || businessModes.online;
}

export function currentBusinessCatalogOf(state) {
  return mergeCatalogWithProducts(buildProfileCatalog(state.businessProfile, businessCatalogs), state.products);
}
