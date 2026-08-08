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
} from "./business-workflows.js?v=20";
import {
  businessCatalogs,
  businessModes,
  dealStages,
  marketingPackages,
  productCategories,
  seedData,
  SCHEMA_VERSION
} from "./business-config.js?v=20";

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

export function alignCustomerType(customer) {
  const mode = businessModes[customer.businessMode] || businessModes.online;
  return {
    ...customer,
    customerType: mode.customerTypes.includes(customer.customerType) ? customer.customerType : mode.customerTypes[0]
  };
}

export function normalizeState(data) {
  data.meta = {
    updatedAt: validIsoDate(data.meta?.updatedAt)
  };
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
    category: productCategories.includes(product.category)
      ? product.category
      : /course|product/i.test(product.category) ? "สินค้า"
        : /training|consulting|service/i.test(product.category) ? "บริการ"
          : /subscription/i.test(product.category) ? "Subscription"
            : /bundle/i.test(product.category) ? "Bundle" : "Package",
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
