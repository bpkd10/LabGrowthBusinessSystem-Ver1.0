import {
  buildProfileCatalog,
  packagesMissingFromCatalog,
  mergeCatalogWithProducts,
  normalizeOfferRelations,
  updateProductAcrossState,
  detachProductRelations,
  createZeroState
} from "./business-workflows.js?v=18";
import {
  parseImportFile,
  buildImportPlan,
  applyImportPlan
} from "./data-import.js?v=18";

const STORAGE_KEY = "business-growth-dashboard-demo";
const REVENUE_TARGET = 100000;
const VALID_VIEWS = ["dashboard", "customers", "crm", "products", "deals", "tasks", "ai"];

const businessModes = {
  online: {
    code: "EC",
    icon: "shopping-bag",
    label: "Online",
    description: "ขายผ่าน Social, Website และ Marketplace",
    customerTypeLabel: "กลุ่มลูกค้าออนไลน์",
    customerTypes: ["ผู้ติดตามใหม่", "ผู้ซื้อครั้งแรก", "ลูกค้าซื้อซ้ำ", "ลูกค้า VIP"],
    journey: [
      ["New Lead", "เห็นสินค้า", "Reach / Visit"],
      ["Contacted", "เริ่มสนทนา", "Chat / Inbox"],
      ["Interested", "สนใจสินค้า", "Intent"],
      ["Proposal Sent", "เช็กเอาต์", "Cart / Order"],
      ["Won", "ชำระเงิน", "Paid"]
    ]
  },
  onsite: {
    code: "SV",
    icon: "map-pin",
    label: "Onsite",
    description: "บริการที่สาขา นัดหมาย หรือพบลูกค้านอกสถานที่",
    customerTypeLabel: "ประเภทผู้รับบริการ",
    customerTypes: ["ผู้สอบถาม", "ผู้นัดหมาย", "ผู้เข้ารับบริการ", "สมาชิกประจำ"],
    journey: [
      ["New Lead", "รู้จักบริการ", "Awareness"],
      ["Contacted", "สอบถาม", "Inquiry"],
      ["Interested", "นัดหมาย", "Booking"],
      ["Proposal Sent", "รับบริการ", "Visit"],
      ["Won", "ชำระเงิน", "Complete"]
    ]
  },
  wholesale: {
    code: "B2B",
    icon: "warehouse",
    label: "Wholesale",
    description: "ขายส่ง ตัวแทนจำหน่าย และลูกค้าองค์กร",
    customerTypeLabel: "ประเภทคู่ค้า",
    customerTypes: ["Prospect", "ร้านค้าปลีก", "ตัวแทนจำหน่าย", "Key Account"],
    journey: [
      ["New Lead", "รับรายชื่อคู่ค้า", "Prospect"],
      ["Contacted", "ตรวจคุณสมบัติ", "Qualify"],
      ["Interested", "ขอราคา", "RFQ"],
      ["Proposal Sent", "เจรจา PO", "Quote / PO"],
      ["Won", "ส่งมอบสินค้า", "Fulfillment"]
    ]
  },
  retail: {
    code: "RT",
    icon: "store",
    label: "Retail",
    description: "หน้าร้าน POS สมาชิก และการซื้อซ้ำ",
    customerTypeLabel: "กลุ่มลูกค้าหน้าร้าน",
    customerTypes: ["Walk-in", "สมาชิกใหม่", "ลูกค้าซื้อซ้ำ", "VIP / High Value"],
    journey: [
      ["New Lead", "เข้าร้าน", "Visit"],
      ["Contacted", "เลือกสินค้า", "Browse"],
      ["Interested", "รับคำแนะนำ", "Assist"],
      ["Proposal Sent", "ชำระเงิน", "Checkout"],
      ["Won", "สมาชิกซื้อซ้ำ", "Retention"]
    ]
  }
};

const businessCatalogs = {
  online: [
    { name: "Social Commerce Starter", category: "Online Offer", price: 12000, cost: 3000, description: "จัดระบบ Social, Chat และการรับออเดอร์" },
    { name: "Marketplace Growth", category: "Online Offer", price: 25000, cost: 7000, description: "ปรับหน้าร้าน Marketplace และแคมเปญขาย" },
    { name: "Content & Ads Growth", category: "Online Offer", price: 35000, cost: 11000, description: "Content, Ads และระบบเก็บ Lead" },
    { name: "Omnichannel Commerce", category: "Online Offer", price: 59000, cost: 18000, description: "เชื่อม Social, Website, Marketplace และ CRM" }
  ],
  onsite: [
    { name: "Booking Starter", category: "Onsite Offer", price: 15000, cost: 4000, description: "ระบบสอบถาม นัดหมาย และแจ้งเตือน" },
    { name: "Service Experience", category: "Onsite Offer", price: 28000, cost: 8000, description: "ออกแบบขั้นตอนรับบริการและ Follow-up" },
    { name: "Member Retention", category: "Onsite Offer", price: 39000, cost: 12000, description: "สมาชิก การกลับมาใช้ซ้ำ และ Referral" },
    { name: "Multi-branch Service", category: "Onsite Offer", price: 79000, cost: 25000, description: "จัดการลูกค้าและมาตรฐานบริการหลายสาขา" }
  ],
  wholesale: [
    { name: "Dealer Starter", category: "Wholesale Offer", price: 25000, cost: 7000, description: "รับสมัครและจัดกลุ่มตัวแทนจำหน่าย" },
    { name: "Volume Order Growth", category: "Wholesale Offer", price: 50000, cost: 16000, description: "ราคาแบบขั้นบันได MOQ และ Repeat Order" },
    { name: "Distributor Pro", category: "Wholesale Offer", price: 95000, cost: 32000, description: "Pipeline คู่ค้า ใบเสนอราคา และ PO" },
    { name: "Key Account Program", category: "Wholesale Offer", price: 150000, cost: 52000, description: "แผนดูแลลูกค้าองค์กรและ Forecast" }
  ],
  retail: [
    { name: "POS & Member Starter", category: "Retail Offer", price: 15000, cost: 4500, description: "เก็บสมาชิกและประวัติซื้อจากหน้าร้าน" },
    { name: "Repeat Purchase", category: "Retail Offer", price: 25000, cost: 7500, description: "Coupon, Point และแคมเปญซื้อซ้ำ" },
    { name: "Store Campaign", category: "Retail Offer", price: 35000, cost: 11000, description: "แคมเปญหน้าร้านร่วมกับ Social" },
    { name: "Multi-branch Retail", category: "Retail Offer", price: 79000, cost: 26000, description: "สมาชิกกลางและรายงานหลายสาขา" }
  ]
};

const businessCategories = {
  creator: "Creator / ธุรกิจออนไลน์",
  service: "บริการ / ที่ปรึกษา",
  retail: "ร้านค้า / Retail",
  restaurant: "ร้านอาหาร / คาเฟ่",
  health: "สุขภาพ / คลินิก",
  education: "การศึกษา / Training",
  factory: "โรงงาน / Wholesale",
  property: "อสังหาริมทรัพย์"
};

const pipelineModeLabels = {
  online: "Online · Social / Website / Marketplace",
  onsite: "Onsite · นัดหมาย / หน้าสาขา",
  wholesale: "Wholesale · B2B / ตัวแทน / องค์กร",
  retail: "Retail · หน้าร้าน / POS / สมาชิก"
};

const avatarPresets = {
  creator: { code: "ON", label: "Online Creator", tone: "violet", icon: "globe" },
  service: { code: "SV", label: "Professional Service", tone: "teal", icon: "handshake" },
  retail: { code: "RT", label: "Retail Store", tone: "orange", icon: "store" },
  restaurant: { code: "FD", label: "Food & Cafe", tone: "red", icon: "shopping-bag" },
  health: { code: "HC", label: "Health & Clinic", tone: "blue", icon: "target" },
  education: { code: "ED", label: "Education", tone: "indigo", icon: "users" },
  factory: { code: "WH", label: "Wholesale & Factory", tone: "slate", icon: "warehouse" },
  property: { code: "RE", label: "Real Estate", tone: "gold", icon: "map-pin" }
};

const contactChannelIcons = {
  Facebook: "facebook", "LINE OA": "message", Website: "globe", Marketplace: "shopping-bag",
  "Walk-in": "map-pin", "หน้าร้าน / POS": "store", "โทรศัพท์": "phone",
  "ตัวแทนจำหน่าย": "warehouse", "Google Form": "clipboard", Event: "calendar", Referral: "users"
};
const contactSources = Object.keys(contactChannelIcons);

const roleIcons = { owner: "crown", sales: "handshake", marketing: "megaphone", ops: "settings" };

const leadStatuses = ["New Lead", "Contacted", "Interested", "Proposal Sent"];
const dealStages = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
const productCategories = ["สินค้า", "บริการ", "Package", "Subscription", "Bundle"];
const taskStatuses = ["todo", "in_progress", "done", "overdue"];
const leadStatusLabels = { "New Lead": "ลูกค้าใหม่", Contacted: "ติดต่อแล้ว", Interested: "สนใจ", "Proposal Sent": "ส่งข้อเสนอแล้ว" };
const dealStageLabels = {
  New: "รับโอกาสธุรกิจใหม่",
  Qualified: "ตรวจคุณภาพและความต้องการ",
  Proposal: "ออกแบบและส่งข้อเสนอ",
  Negotiation: "เจรจาเพื่อการตัดสินใจ",
  Won: "ชนะดีล / เริ่มส่งมอบ",
  Lost: "ไม่เดินหน้าต่อ"
};
const dealStageGroups = [
  ["กำลังพัฒนาดีล", ["New", "Qualified", "Proposal", "Negotiation"]],
  ["ผลลัพธ์ของดีล", ["Won", "Lost"]]
];
const taskStatusLabels = { todo: "รอดำเนินการ", in_progress: "กำลังทำ", done: "เสร็จแล้ว", overdue: "เลยกำหนด" };
const priorityLabels = { High: "สูง", Medium: "ปานกลาง", Low: "ต่ำ" };
const marketingPackages = [
  { name: "Marketing Starter", price: 15000, description: "วางแผนช่องทางและ Content 30 วัน" },
  { name: "Content Growth", price: 25000, description: "ระบบผลิต Content และวัดผลรายเดือน" },
  { name: "Lead Generation", price: 35000, description: "แคมเปญหาลูกค้าและระบบเก็บ Lead" },
  { name: "Full Funnel Solution", price: 59000, description: "วางระบบ Marketing + CRM ครบ Funnel" }
];

const seedData = {
  meta: { updatedAt: "2026-07-22T00:00:00.000Z" },
  businessProfile: {
    businessName: "Uncle Tung Business Lab",
    businessMode: "online",
    businessCategory: "creator",
    businessAvatar: "creator",
    revenueTarget: 100000
  },
  customers: [
    { id: "c1", fullName: "สมชาย ใจดี", phone: "0811111111", source: "Facebook", solutionPackage: "Marketing Starter", interest: "ต้องการเริ่มทำ Content อย่างเป็นระบบ", avatar: "", avatarPreset: "creator", createdAt: "2026-07-01" },
    { id: "c2", fullName: "วราภรณ์ ดีมาก", phone: "0822222222", source: "LINE OA", solutionPackage: "Lead Generation", interest: "ต้องการเพิ่มจำนวนลูกค้าองค์กร", avatar: "", avatarPreset: "service", createdAt: "2026-07-01" },
    { id: "c3", fullName: "บริษัท ABC จำกัด", phone: "0833333333", source: "Website", solutionPackage: "Full Funnel Solution", interest: "ต้องการเชื่อม Marketing กับ CRM", avatar: "", avatarPreset: "factory", createdAt: "2026-07-02" },
    { id: "c4", fullName: "คลินิก Bright Care", phone: "0844444444", source: "Referral", solutionPackage: "Content Growth", interest: "ต้องการ Content ที่สร้างความน่าเชื่อถือ", avatar: "", avatarPreset: "health", createdAt: "2026-07-02" }
  ],
  leads: [
    { id: "l1", customerId: "c1", status: "Interested", assignedTo: "Sales Team", leadScore: 72, nextFollowUp: "2026-07-05" },
    { id: "l2", customerId: "c2", status: "Proposal Sent", assignedTo: "Uncle Tung AI", leadScore: 88, nextFollowUp: "2026-07-04" },
    { id: "l3", customerId: "c3", status: "Contacted", assignedTo: "Sales Team", leadScore: 65, nextFollowUp: "2026-07-06" },
    { id: "l4", customerId: "c4", status: "New Lead", assignedTo: "Admin", leadScore: 43, nextFollowUp: "2026-07-07" }
  ],
  products: [
    { id: "p1", name: "AI Fundamentals Course", category: "สินค้า", price: 5900, cost: 1500, status: "active", businessMode: "online", pipelineStage: "Qualified" },
    { id: "p2", name: "Corporate AI Training", category: "บริการ", price: 85000, cost: 25000, status: "active", businessMode: "onsite", pipelineStage: "Proposal" },
    { id: "p3", name: "AI Consulting Package", category: "Package", price: 45000, cost: 12000, status: "active", businessMode: "onsite", pipelineStage: "Negotiation" },
    { id: "mp1", name: "Marketing Starter", category: "Package", price: 15000, cost: 3500, status: "active", businessMode: "online", pipelineStage: "Qualified" },
    { id: "mp2", name: "Content Growth", category: "Subscription", price: 25000, cost: 7000, status: "active", businessMode: "online", pipelineStage: "Proposal" },
    { id: "mp3", name: "Lead Generation", category: "บริการ", price: 35000, cost: 11000, status: "active", businessMode: "online", pipelineStage: "Proposal" },
    { id: "mp4", name: "Full Funnel Solution", category: "Bundle", price: 59000, cost: 18000, status: "active", businessMode: "online", pipelineStage: "Negotiation" }
  ],
  deals: [
    { id: "d1", customerId: "c1", name: "Public course enrollment", value: 5900, stage: "Won", probability: 100 },
    { id: "d2", customerId: "c2", name: "Corporate training batch 1", value: 85000, stage: "Proposal", probability: 65 },
    { id: "d3", customerId: "c3", name: "Monthly consulting package", value: 45000, stage: "Negotiation", probability: 75 }
  ],
  tasks: [
    { id: "t1", title: "โทรติดตามข้อเสนอ บริษัท ABC", owner: "ทีมขาย", dueDate: "2026-07-04", priority: "High", status: "todo" },
    { id: "t2", title: "ส่งตัวอย่าง curriculum ให้คุณวราภรณ์", owner: "Uncle Tung AI", dueDate: "2026-07-04", priority: "High", status: "in_progress" },
    { id: "t3", title: "ออกใบแจ้งหนี้คอร์ส", owner: "ฝ่ายดูแลระบบ", dueDate: "2026-07-03", priority: "Medium", status: "done" }
  ]
};

let state = loadState();
const roleViews = {
  owner: {
    label: "เจ้าของธุรกิจ",
    kicker: "Owner command center",
    title: "ภาพรวมสำหรับเจ้าของธุรกิจ",
    description: "ตัดสินใจจากรายได้ Pipeline และเรื่องที่ต้องแก้วันนี้",
    pageDescription: "ดูรายได้ ความเสี่ยง และสิ่งที่ต้องตัดสินใจของทั้งธุรกิจ",
    action: "ตรวจ Pipeline",
    target: "deals",
    focus: ["รายได้เทียบเป้า", "มูลค่า Pipeline", "งานเสี่ยงหลุด"],
    priorityTitle: "เรื่องที่ต้องตัดสินใจก่อน",
    priorityKicker: "Decision queue",
    signalTitle: "สัญญาณสุขภาพธุรกิจ",
    signalKicker: "Business health"
  },
  sales: {
    label: "ฝ่ายขาย",
    kicker: "Sales workspace",
    title: "พื้นที่ทำงานของฝ่ายขาย",
    description: "เห็น Lead ที่ควรโทร ดีลที่ควรตาม และขั้นตอนถัดไปทันที",
    pageDescription: "โฟกัส Lead, Follow-up และดีลที่มีโอกาสปิดการขาย",
    action: "เปิด CRM Board",
    target: "crm",
    focus: ["Lead คะแนนสูง", "ข้อเสนอรอตอบ", "Follow-up วันนี้"],
    priorityTitle: "Lead ที่ควรติดตามก่อน",
    priorityKicker: "Sales action queue",
    signalTitle: "สัญญาณช่วยปิดการขาย",
    signalKicker: "Sales signals"
  },
  marketing: {
    label: "การตลาด",
    kicker: "Marketing performance",
    title: "ภาพรวมสำหรับทีมการตลาด",
    description: "เชื่อมช่องทางที่มาของ Lead กับคุณภาพและมูลค่าที่สร้างได้",
    pageDescription: "ดูช่องทาง แคมเปญ คุณภาพ Lead และรายได้ที่การตลาดมีส่วนสร้าง",
    action: "ดูลูกค้าตามช่องทาง",
    target: "customers",
    focus: ["ช่องทางสร้าง Lead", "Lead เป็นลูกค้า", "มูลค่าจากแคมเปญ"],
    priorityTitle: "Lead จากการตลาดที่ควรดู",
    priorityKicker: "Campaign response",
    signalTitle: "โอกาสปรับช่องทางและข้อเสนอ",
    signalKicker: "Marketing signals"
  },
  ops: {
    label: "ทีมปฏิบัติการ",
    kicker: "Operations desk",
    title: "พื้นที่ทำงานของทีมปฏิบัติการ",
    description: "จัดลำดับงานค้าง งานส่งมอบ และลูกค้าที่ต้องดูแลต่อ",
    pageDescription: "ดูงานค้าง กำหนดส่งมอบ และความเสี่ยงที่กระทบลูกค้า",
    action: "เปิดงานติดตาม",
    target: "tasks",
    focus: ["งานครบกำหนด", "งานส่งมอบใหม่", "ลูกค้ารอดำเนินการ"],
    priorityTitle: "งานลูกค้าที่ต้องจัดการก่อน",
    priorityKicker: "Operations queue",
    signalTitle: "สัญญาณความเสี่ยงในการส่งมอบ",
    signalKicker: "Delivery health"
  }
};

let activeRole = "owner";
let toastTimer;
let lastUndoAction = null;
let toastReturnFocus = null;
const selectedLeadIds = new Set();
let persistedStateSnapshot = clone(state);
let analysisInFlight = false;
let resetStep = 1;
let resetExported = false;
let importSession = null;

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
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

function validIsoDate(value) {
  if (typeof value !== "string") return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function alignCustomerType(customer) {
  const mode = businessModes[customer.businessMode] || businessModes.online;
  return {
    ...customer,
    customerType: mode.customerTypes.includes(customer.customerType) ? customer.customerType : mode.customerTypes[0]
  };
}

function normalizeState(data) {
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
  data.schemaVersion = 8;
  const relatedState = normalizeOfferRelations(data);
  relatedState.customers = relatedState.customers.map(alignCustomerType);
  return relatedState;
}

function saveState() {
  try {
    state.meta = { ...(state.meta || {}), updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    persistedStateSnapshot = clone(state);
    return true;
  } catch {
    state = normalizeState(clone(persistedStateSnapshot));
    selectedLeadIds.clear();
    renderAll();
    notify("บันทึกข้อมูลไม่สำเร็จ พื้นที่จัดเก็บของ browser อาจเต็ม");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function notify(message, action = null) {
  const toast = document.querySelector("#toast");
  const messageNode = document.querySelector("#toastMessage");
  const undoButton = document.querySelector("#toastUndo");
  if (toast.hidden) toastReturnFocus = document.activeElement;
  toast.hidden = false;
  messageNode.textContent = message;
  lastUndoAction = action;
  undoButton.hidden = !action;
  undoButton.textContent = action?.label || "เลิกทำ";
  if (!action && document.activeElement === undoButton) document.querySelector("#toastDismiss").focus();
  toast.classList.add("show");
  clearTimeout(toastTimer);
  if (!action) toastTimer = setTimeout(hideToast, 3600);
}

function hideToast() {
  const toast = document.querySelector("#toast");
  const shouldRestoreFocus = toast.contains(document.activeElement);
  const restoreTarget = toastReturnFocus?.isConnected ? toastReturnFocus : document.querySelector("#viewTitle");
  toast.classList.remove("show");
  toast.hidden = true;
  lastUndoAction = null;
  document.querySelector("#toastUndo").hidden = true;
  if (shouldRestoreFocus) restoreTarget?.focus({ preventScroll: true });
  toastReturnFocus = null;
}

function registerUndo(message, restore) {
  notify(message, { label: "เลิกทำ", restore });
}

function setLeadStatus(leadId, nextStatus) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead || !leadStatuses.includes(nextStatus) || lead.status === nextStatus) return false;
  const previousStatus = lead.status;
  lead.status = nextStatus;
  if (!saveState()) return false;
  renderAll();
  registerUndo(`ย้าย Lead ไปขั้น ${leadStatusLabels[nextStatus]}`, () => {
    const currentLead = state.leads.find((item) => item.id === leadId);
    if (currentLead) currentLead.status = previousStatus;
  });
  return true;
}

function currency(value) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
}

function percent(value) {
  return `${Math.round(value)}%`;
}

function uid(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function customerById(id) {
  return state.customers.find((customer) => customer.id === id);
}

function initials(name) {
  return String(name || "ลูกค้า").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function revenueTarget() {
  return Math.max(0, Number(state.businessProfile?.revenueTarget) || 0);
}

function currentBusinessMode() {
  return businessModes[state.businessProfile?.businessMode] || businessModes.online;
}

function currentBusinessCatalog() {
  return mergeCatalogWithProducts(buildProfileCatalog(state.businessProfile, businessCatalogs), state.products);
}

function offerByReference(reference) {
  const value = String(reference || "");
  if (value.startsWith("product:")) return state.products.find((item) => item.id === value.slice(8));
  if (value.startsWith("catalog:")) return currentBusinessCatalog().find((item) => item.catalogKey === value.slice(8));
  return state.products.find((item) => item.id === value || item.name === value)
    || currentBusinessCatalog().find((item) => item.name === value);
}

function offerReference(offer) {
  if (!offer) return "";
  return offer.id ? `product:${offer.id}` : `catalog:${offer.catalogKey}`;
}

function customerOffer(customer) {
  return state.products.find((item) => item.id === customer?.solutionPackageId)
    || state.products.find((item) => item.name === customer?.solutionPackage)
    || currentBusinessCatalog().find((item) => item.name === customer?.solutionPackage);
}

function iconMarkup(name, className = "ui-icon") {
  return `<svg class="${escapeHTML(className)}" aria-hidden="true" focusable="false"><use href="/icons.svg?v=18#${escapeHTML(name)}"></use></svg>`;
}

document.querySelector("#toastUndo").addEventListener("click", () => {
  const action = lastUndoAction;
  if (!action) return;
  lastUndoAction = null;
  action.restore();
  if (!saveState()) return;
  renderAll();
  notify("คืนค่าการเปลี่ยนแปลงล่าสุดแล้ว");
});

document.querySelector("#toastDismiss").addEventListener("click", hideToast);

function avatarPresetMarkup(presetKey, size = "normal", label = "โปรไฟล์ธุรกิจ") {
  const preset = avatarPresets[presetKey] || avatarPresets.service;
  return `<span class="customer-avatar avatar-preset ${size}" data-avatar-tone="${escapeHTML(preset.tone)}" aria-label="${escapeHTML(label)}">${iconMarkup(preset.icon, "avatar-vector")}<b>${escapeHTML(preset.code)}</b></span>`;
}

function contactBadge(source) {
  const icon = contactChannelIcons[source] || "message";
  return `<span class="contact-badge"><span class="contact-icon">${iconMarkup(icon)}</span>${escapeHTML(source || "ไม่ระบุช่องทาง")}</span>`;
}

function avatarMarkup(customer, size = "normal") {
  const label = escapeHTML(customer?.fullName || "ลูกค้า");
  if (customer?.avatar?.startsWith("data:image/")) {
    return `<img class="customer-avatar ${size}" src="${escapeHTML(customer.avatar)}" alt="รูปโปรไฟล์ ${label}">`;
  }
  if (customer?.avatarPreset) return avatarPresetMarkup(customer.avatarPreset, size, `โปรไฟล์ ${label}`);
  const hue = [...String(customer?.id || label)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return `<span class="customer-avatar avatar-fallback ${size}" style="--avatar-hue:${hue}" aria-label="โปรไฟล์ ${label}">${escapeHTML(initials(label))}</span>`;
}

function metrics() {
  const totalLeads = state.leads.length;
  const wonDeals = state.deals.filter((deal) => deal.stage === "Won");
  const revenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const openDeals = state.deals.filter((deal) => !["Won", "Lost"].includes(deal.stage));
  const pendingTasks = state.tasks.filter((task) => task.status !== "done").length;
  const overdueTasks = state.tasks.filter((task) => task.status !== "done" && task.dueDate < today()).length;
  const conversionRate = totalLeads ? (wonDeals.length / totalLeads) * 100 : 0;
  const pipelineValue = openDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const sourceCounts = countBy(state.customers, "source");
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  return { totalLeads, revenue, openDeals: openDeals.length, pendingTasks, overdueTasks, conversionRate, pipelineValue, topSource };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function sumDealsBySource() {
  return state.deals.reduce((acc, deal) => {
    const customer = customerById(deal.customerId);
    const source = customer?.source || "Unknown";
    acc[source] = (acc[source] || 0) + Number(deal.value);
    return acc;
  }, {});
}

function dealStageOptionMarkup(selectedStage) {
  return dealStageGroups.map(([groupLabel, stages]) => `
    <optgroup label="${escapeHTML(groupLabel)}">
      ${stages.map((stage) => `<option value="${escapeHTML(stage)}" ${selectedStage === stage ? "selected" : ""}>${escapeHTML(dealStageLabels[stage])}</option>`).join("")}
    </optgroup>
  `).join("");
}

function renderKpis() {
  const data = metrics();
  const roleCards = {
    owner: [
      ["รายได้ที่ปิดได้", currency(data.revenue), "เทียบเป้ารายได้รอบนี้", revenueTarget() > 0 && data.revenue >= revenueTarget() ? "success" : "", "deals", "THB"],
      ["มูลค่า Pipeline", currency(data.pipelineValue), `${data.openDeals} ดีลที่กำลังพัฒนา`, "", "deals", "PL"],
      ["อัตราปิดการขาย", percent(data.conversionRate), `${data.totalLeads} Lead ในระบบ`, "", "crm", "CV"],
      ["งานที่ต้องตัดสินใจ", data.pendingTasks, data.overdueTasks ? `${data.overdueTasks} งานเลยกำหนด` : "ไม่มีงานเลยกำหนด", data.overdueTasks ? "warning" : "success", "tasks", "AC"]
    ],
    sales: [
      ["Lead ที่ดูแล", data.totalLeads, "เปิด CRM เพื่อเริ่มติดตาม", "", "crm", "LD"],
      ["ดีลที่กำลังพัฒนา", data.openDeals, currency(data.pipelineValue), "", "deals", "PL"],
      ["อัตราชนะดีล", percent(data.conversionRate), "ดูจังหวะที่ลูกค้าหยุดอยู่", "", "crm", "WN"],
      ["Follow-up ค้าง", data.pendingTasks, data.overdueTasks ? `${data.overdueTasks} งานต้องทำวันนี้` : "งานอยู่ในแผน", data.overdueTasks ? "warning" : "success", "tasks", "FU"]
    ],
    marketing: [
      ["Lead ทั้งหมด", data.totalLeads, `ช่องทางหลัก ${data.topSource}`, "", "customers", "LD"],
      ["ช่องทางที่ทำผลงาน", data.topSource, "ดูรายชื่อลูกค้าจากช่องทางนี้", "success", "customers", "CH"],
      ["Lead เป็นลูกค้า", percent(data.conversionRate), "วัดผลตั้งแต่ช่องทางถึงรายได้", "", "crm", "CV"],
      ["มูลค่าที่การตลาดสร้าง", currency(data.pipelineValue), `${data.openDeals} โอกาสขาย`, "", "deals", "THB"]
    ],
    ops: [
      ["งานที่ต้องทำ", data.pendingTasks, "เรียงตามวันครบกำหนด", "", "tasks", "TK"],
      ["งานเลยกำหนด", data.overdueTasks, data.overdueTasks ? "จัดการก่อนเกิดความล่าช้า" : "ไม่มีงานเสี่ยง", data.overdueTasks ? "warning" : "success", "tasks", "AL"],
      ["งานส่งมอบใหม่", state.deals.filter((deal) => deal.stage === "Won").length, "ดีลที่ชนะและต้องเริ่มส่งมอบ", "", "deals", "DL"],
      ["ลูกค้าที่ต้องดูแล", state.customers.length, "ดูข้อมูลและช่องทางติดต่อ", "", "customers", "CU"]
    ]
  };
  const cards = roleCards[activeRole] || roleCards.owner;

  document.querySelector("#kpiGrid").innerHTML = cards.map(([label, value, note, tone, target, icon]) => `
    <button class="kpi-card" data-jump="${target}" ${tone ? `data-tone="${tone}"` : ""}>
      <span class="kpi-heading"><span class="metric-pixel" aria-hidden="true">${escapeHTML(icon)}</span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
      <small>${escapeHTML(note)} <b>ดูรายละเอียด →</b></small>
    </button>
  `).join("");
}

function renderBars(containerId, entries, color) {
  const max = Math.max(...entries.map(([, value]) => value), 1);
  document.querySelector(containerId).innerHTML = entries.map(([label, value]) => `
    <div class="bar-row">
      <div class="bar-meta"><strong>${escapeHTML(label)}</strong><span>${escapeHTML(typeof value === "number" && value > 999 ? currency(value) : value)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="--bar-scale:${Math.max(0, value / max)}; background:${color}"></div></div>
    </div>
  `).join("");
}

function renderBusinessProfile() {
  const profile = state.businessProfile;
  const mode = businessModes[profile.businessMode] || businessModes.online;
  const categoryLabel = businessCategories[profile.businessCategory] || businessCategories.service;
  const form = document.querySelector("#businessProfileForm");
  document.body.dataset.businessMode = profile.businessMode;
  document.querySelector("#sidebarBusinessName").textContent = profile.businessName || "ยังไม่ได้ตั้งชื่อธุรกิจ";
  document.querySelector("#sidebarBusinessMode").textContent = `${mode.label} · ${categoryLabel}`;
  document.querySelector("#businessAvatarPreview").innerHTML = avatarPresetMarkup(profile.businessAvatar, "large", `โปรไฟล์ ${profile.businessName}`);
  document.querySelector("#businessProfileSummary").textContent = `${mode.description} ระบบจะปรับ KPI, Customer Journey และคำแนะนำตามบริบทนี้`;
  document.querySelector("#businessModeBadge").textContent = mode.label;
  document.querySelector("#businessCategoryBadge").textContent = categoryLabel;
  renderBusinessCatalogPreview(currentBusinessCatalog());

  document.querySelector("#businessModeSelect").innerHTML = Object.entries(businessModes)
    .map(([value, item]) => `<option value="${escapeHTML(value)}" ${profile.businessMode === value ? "selected" : ""}>${escapeHTML(item.label)}</option>`).join("");
  document.querySelector("#businessCategorySelect").innerHTML = Object.entries(businessCategories)
    .map(([value, label]) => `<option value="${escapeHTML(value)}" ${profile.businessCategory === value ? "selected" : ""}>${escapeHTML(label)}</option>`).join("");
  document.querySelector("#businessAvatarSelect").innerHTML = Object.entries(avatarPresets)
    .map(([value, item]) => `<option value="${escapeHTML(value)}" ${profile.businessAvatar === value ? "selected" : ""}>${escapeHTML(item.code)} · ${escapeHTML(item.label)}</option>`).join("");
  form.elements.businessName.value = profile.businessName;
  form.elements.revenueTarget.value = profile.revenueTarget;
}

function renderBusinessCatalogPreview(catalog) {
  document.querySelector("#businessCatalogPreview").innerHTML = catalog.map((item) =>
    `<span class="catalog-chip" title="${escapeHTML(item.description)}"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(currency(item.price))}</small></span>`
  ).join("");
  const missingCount = packagesMissingFromCatalog(state.products, catalog).length;
  const button = document.querySelector("#installBusinessCatalog");
  button.textContent = missingCount ? `เพิ่ม ${missingCount} Package ให้ธุรกิจ` : "เพิ่มแล้วครบทุก Package";
  button.disabled = missingCount === 0;
}

function draftBusinessProfile() {
  const form = document.querySelector("#businessProfileForm");
  return {
    businessName: form.elements.businessName.value.trim(),
    businessMode: form.elements.businessMode.value,
    businessCategory: form.elements.businessCategory.value,
    businessAvatar: form.elements.businessAvatar.value,
    revenueTarget: Number(form.elements.revenueTarget.value) || 0
  };
}

function previewDraftBusinessCatalog() {
  renderBusinessCatalogPreview(mergeCatalogWithProducts(buildProfileCatalog(draftBusinessProfile(), businessCatalogs), state.products));
}

function renderBusinessViewSwitch() {
  const mode = currentBusinessMode();
  document.querySelector("#businessViewTitle").textContent = `Dashboard ธุรกิจ ${mode.label}`;
  document.querySelector("#businessViewDescription").textContent = `${mode.description} เมื่อเลือก ระบบจะเปลี่ยน Journey, ข้อเสนอ และคำเรียกของลูกค้าทันที`;
  document.querySelector("#businessViewSwitch").innerHTML = Object.entries(businessModes).map(([key, item]) => `
    <button type="button" class="business-view-button ${key === state.businessProfile.businessMode ? "active" : ""}" data-business-view="${escapeHTML(key)}" aria-pressed="${key === state.businessProfile.businessMode}">
      <span class="business-vector">${iconMarkup(item.icon, "business-vector-icon")}</span>
      <strong>${escapeHTML(item.label)}</strong>
      <small>${escapeHTML(item.description)}</small>
    </button>
  `).join("");
  document.querySelector("#businessChangeSummary").innerHTML = `${iconMarkup(mode.icon)}<strong>ปรับตาม ${escapeHTML(mode.label)} แล้ว</strong><span>KPI, Customer Journey, กลุ่มลูกค้า และ Package ใช้บริบทเดียวกัน</span>`;
}

function renderRoleWorkspace(data) {
  const role = roleViews[activeRole] || roleViews.owner;
  document.body.dataset.activeRole = activeRole;
  document.querySelectorAll(".role-button").forEach((button) => {
    const selected = button.dataset.role === activeRole;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
    const rolePixel = button.querySelector(".role-pixel");
    if (rolePixel) rolePixel.innerHTML = iconMarkup(roleIcons[button.dataset.role] || "users");
  });
  document.querySelector("#roleKicker").textContent = role.kicker;
  document.querySelector("#roleDashboardTitle").textContent = role.title;
  document.querySelector("#roleDashboardDescription").textContent = role.description;
  document.querySelector("#roleFocus").innerHTML = role.focus.map((item, index) => `<span><b>0${index + 1}</b>${escapeHTML(item)}</span>`).join("");
  const primary = document.querySelector("#rolePrimaryAction");
  primary.textContent = role.action;
  primary.dataset.jump = role.target;
  document.querySelector("#priorityPanelTitle").textContent = role.priorityTitle;
  document.querySelector("#priorityPanelKicker").textContent = role.priorityKicker;
  document.querySelector("#signalPanelTitle").textContent = role.signalTitle;
  document.querySelector("#signalPanelKicker").textContent = role.signalKicker;
  document.querySelector("#roleInsight").textContent = roleInsight(data);
}

function renderDashboard() {
  const data = metrics();
  const target = revenueTarget();
  const progress = target > 0 ? Math.min((data.revenue / target) * 100, 100) : 0;
  const remaining = Math.max(target - data.revenue, 0);
  renderKpis();
  renderBusinessProfile();
  renderBusinessViewSwitch();
  renderRoleWorkspace(data);
  document.querySelector("#pipelineBadge").textContent = currency(data.pipelineValue);
  renderJourneyFlow();
  renderPriorityLeads();
  renderSignals(data);

  document.querySelector("#goalTitle").textContent = target > 0
    ? `${state.businessProfile.businessName || "ธุรกิจของฉัน"}: เป้ารายได้ ${currency(target)}`
    : "เริ่มต้นด้วยการตั้งเป้ารายได้ของธุรกิจ";
  document.querySelector("#goalCurrent").textContent = `${currency(data.revenue)} / ${currency(target)}`;
  document.querySelector("#goalPercent").textContent = percent(progress);
  document.querySelector("#goalProgress").style.setProperty("--progress-scale", String(Math.max(0, progress / 100)));
  document.querySelector(".goal-meter").setAttribute("aria-valuenow", String(Math.round(progress)));
  document.querySelector("#goalMessage").textContent = target <= 0
    ? "เปิดโปรไฟล์ธุรกิจด้านล่าง กรอกชื่อธุรกิจ รูปแบบการขาย และเป้ารายได้เพื่อเริ่มใช้งาน"
    : remaining
    ? `ต้องสร้างรายได้เพิ่มอีก ${currency(remaining)} เพื่อถึงเป้ารอบนี้`
    : "ถึงเป้ารายได้แล้ว เลือก deal ถัดไปเพื่อสร้างการเติบโตต่อเนื่อง";
  document.querySelector("#latestLeads").innerHTML = state.leads.slice(-5).reverse().map((lead) => {
    const customer = customerById(lead.customerId);
    return compactItem(customer?.fullName || "-", `${customer?.source || "-"} · ${leadStatusLabels[lead.status] || lead.status}`, `${lead.leadScore} คะแนน`);
  }).join("");

  document.querySelector("#pendingTasks").innerHTML = state.tasks.filter((task) => task.status !== "done").slice(0, 5).map((task) =>
    compactItem(task.title, `${task.owner} · ${task.dueDate}`, task.priority)
  ).join("");
}

function renderJourneyFlow() {
  const mode = businessModes[state.businessProfile.businessMode] || businessModes.online;
  const steps = mode.journey;
  const data = metrics();
  const wonDeals = state.deals.filter((deal) => deal.stage === "Won");
  const wonCount = wonDeals.length;
  const journeyBase = Math.max(state.leads.length, wonCount, 1);
  const conversion = Math.min(100, (wonCount / journeyBase) * 100);
  const staleLeads = state.leads.filter((lead) => lead.nextFollowUp && lead.nextFollowUp < today()).length;
  const stageData = steps.map(([key, label, detail]) => {
    const stageLeads = key === "Won" ? [] : state.leads.filter((lead) => lead.status === key);
    const count = key === "Won" ? wonCount : stageLeads.length;
    const value = key === "Won"
      ? wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0)
      : stageLeads.reduce((sum, lead) => {
          const deal = state.deals.find((item) => item.customerId === lead.customerId && item.stage !== "Lost");
          const customer = customerById(lead.customerId);
          const offer = customerOffer(customer);
          return sum + Number(deal?.value || offer?.price || 0);
        }, 0);
    return { key, label, detail, count, value };
  });
  const maxCount = Math.max(...stageData.map((item) => item.count), 1);
  const bottleneck = [...stageData.slice(0, -1)].sort((a, b) => b.count - a.count)[0];

  const role = roleViews[activeRole] || roleViews.owner;
  document.querySelector("#journeyTitle").textContent = `${role.label} Customer Journey · ${mode.label}`;
  document.querySelector("#journeyContext").textContent = `${mode.description} สรุปจำนวนลูกค้า มูลค่า Conversion และจุดที่ควรเร่งจัดการ`;
  document.querySelector("#journeyDonut").style.setProperty("--donut-value", `${conversion * 3.6}deg`);
  document.querySelector("#journeyDonut").setAttribute("aria-label", `อัตราปิดการขาย ${percent(conversion)}`);
  document.querySelector("#journeyDonutValue").textContent = percent(conversion);
  document.querySelector("#journeyDonutNote").textContent = `${wonCount} รายสร้างรายได้ จาก ${state.leads.length} Lead ในระบบ`;
  document.querySelector("#journeySummary").innerHTML = [
    ["ลูกค้าทั้งหมด", state.customers.length, "users"],
    ["Pipeline", currency(data.pipelineValue), "chart"],
    ["รายได้ปิดแล้ว", currency(data.revenue), "target"],
    ["Follow-up เกินกำหนด", staleLeads, staleLeads ? "alert" : "clock"]
  ].map(([label, value, icon]) => `<div class="journey-summary-item">${iconMarkup(icon)}<span>${escapeHTML(label)}</span><strong>${escapeHTML(String(value))}</strong></div>`).join("");
  document.querySelector("#journeyDecision").innerHTML = `
    <span class="decision-icon">${iconMarkup(staleLeads ? "alert" : "sparkles")}</span>
    <div><small>${escapeHTML(role.label)} decision</small><strong>${staleLeads ? `มี ${staleLeads} Lead เกินกำหนดติดตาม` : `คอขวดอยู่ที่ “${escapeHTML(bottleneck?.label || "ยังไม่มีข้อมูล")}”`}</strong><p>${staleLeads ? "มอบหมายเจ้าของงานและกำหนดวันติดตามใหม่ก่อนดู Lead ชุดถัดไป" : `มี ${bottleneck?.count || 0} รายในช่วงนี้ เปิด CRM เพื่อกำหนดขั้นตอนถัดไป`}</p></div>
    <button type="button" class="small-button" data-jump="${staleLeads ? "tasks" : "crm"}">${staleLeads ? "จัดการงานค้าง" : "เปิด CRM Board"}</button>`;
  document.querySelector("#journeyFlow").innerHTML = stageData.map((item, index) => {
    const width = Math.max(item.count ? 12 : 0, (item.count / maxCount) * 100);
    return `<button class="journey-step ${item.count ? "has-data" : ""}" data-jump="${item.key === "Won" ? "deals" : "crm"}">
      <span class="journey-stage-icon">${iconMarkup(index === 4 ? "target" : mode.icon)}</span>
      <span class="journey-stage-copy"><span class="journey-number">ขั้น ${index + 1} · ${escapeHTML(item.detail)}</span><strong>${escapeHTML(item.label)}</strong></span>
      <span class="journey-stage-metrics"><b>${item.count}</b><small>${percent((item.count / journeyBase) * 100)} ของ Journey</small></span>
      <span class="journey-bar" aria-hidden="true"><i style="--journey-scale:${width / 100}"></i></span>
      <span class="journey-stage-value">${escapeHTML(currency(item.value))}</span>
    </button>`;
  }).join("");
}

function renderPriorityLeads() {
  if (activeRole === "ops") {
    const priorityTasks = state.tasks
      .filter((task) => task.status !== "done")
      .sort((a, b) => (a.dueDate < today() ? -1 : 0) - (b.dueDate < today() ? -1 : 0) || a.dueDate.localeCompare(b.dueDate))
      .slice(0, 3);
    document.querySelector("#priorityLeadBadge").textContent = priorityTasks.length ? `${priorityTasks.length} งานสำคัญ` : "ไม่มีงานค้าง";
    document.querySelector("#priorityLeads").innerHTML = priorityTasks.map((task) => {
      const overdue = task.dueDate < today();
      return `<article class="priority-item"><div class="lead-profile"><span class="decision-icon">${iconMarkup(overdue ? "alert" : "clipboard")}</span><div><strong>${escapeHTML(task.title)}</strong><span>${escapeHTML(task.owner)}</span></div></div><div class="priority-meta"><span class="score-tag">${escapeHTML(priorityLabels[task.priority] || task.priority)}</span><small class="${overdue ? "danger" : ""}">${overdue ? "เกินกำหนด" : `ครบกำหนด ${task.dueDate}`}</small></div><button class="small-button" data-jump="tasks">เปิดงาน</button></article>`;
    }).join("") || `<div class="empty-state">งานทั้งหมดอยู่ในแผนแล้ว</div>`;
    return;
  }
  const topSource = metrics().topSource;
  const roleLeads = activeRole === "marketing"
    ? state.leads.filter((lead) => customerById(lead.customerId)?.source === topSource)
    : state.leads;
  const leads = [...(roleLeads.length ? roleLeads : state.leads)]
    .filter((lead) => lead.status !== "Proposal Sent" || lead.nextFollowUp <= today())
    .sort((a, b) => (a.nextFollowUp < today() ? -1 : 0) - (b.nextFollowUp < today() ? -1 : 0) || b.leadScore - a.leadScore)
    .slice(0, 3);
  document.querySelector("#priorityLeadBadge").textContent = leads.length ? `${leads.length} รายการสำคัญ` : "ไม่มีรายการเร่งด่วน";
  document.querySelector("#priorityLeads").innerHTML = leads.map((lead) => {
    const customer = customerById(lead.customerId);
    const overdue = lead.nextFollowUp < today();
    return `<article class="priority-item"><div class="lead-profile">${avatarMarkup(customer, "small")}<div><strong>${escapeHTML(customer?.fullName || "-")}</strong><span>${escapeHTML(customerOffer(customer)?.name || customer?.solutionPackage || "-")}</span></div></div><div class="priority-meta"><span class="score-tag">${lead.leadScore} คะแนน</span><small class="${overdue ? "danger" : ""}">${overdue ? "เกินกำหนด" : `ติดตาม ${lead.nextFollowUp}`}</small></div><button class="small-button" data-task-from-lead="${escapeHTML(lead.id)}">สร้างงาน</button></article>`;
  }).join("") || `<div class="empty-state">Lead ทุกคนมีแผนติดตามแล้ว</div>`;
}

function renderSignals(data) {
  const proposalLeads = state.leads.filter((lead) => lead.status === "Proposal Sent").length;
  const sourceDeals = sumDealsBySource();
  const sourceValue = sourceDeals[data.topSource] || 0;
  const roleSignals = {
    owner: [
      ["ช่องทางที่คุ้มสุด", data.topSource, sourceValue ? `${currency(sourceValue)} ใน pipeline` : "ยังไม่มีมูลค่า Deal", "customers"],
      ["ข้อเสนอที่ต้องดู", proposalLeads, proposalLeads ? "Lead รอการตัดสินใจ" : "ยังไม่มีข้อเสนอค้าง", "crm"],
      ["งานที่เสี่ยงหลุด", data.overdueTasks, data.overdueTasks ? "งานเกินกำหนด ควรจัดการวันนี้" : "ไม่มีงานเกินกำหนด", "tasks"]
    ],
    sales: [
      ["มูลค่าที่กำลังปิด", currency(data.pipelineValue), `${data.openDeals} ดีลที่ยังเปิด`, "deals"],
      ["ข้อเสนอรอตอบ", proposalLeads, proposalLeads ? "ติดตามคำตอบและ Next Step" : "ไม่มีข้อเสนอค้าง", "crm"],
      ["Follow-up เกินกำหนด", state.leads.filter((lead) => lead.nextFollowUp < today()).length, "จัดลำดับโทรติดตามวันนี้", "crm"]
    ],
    marketing: [
      ["ช่องทาง Lead สูงสุด", data.topSource, `${countBy(state.customers, "source")[data.topSource] || 0} ราย`, "customers"],
      ["มูลค่าจากช่องทางหลัก", currency(sourceValue), "ตรวจคุณภาพก่อนเพิ่มงบ", "deals"],
      ["Lead เป็นลูกค้า", percent(data.conversionRate), "ดู Journey ตั้งแต่ช่องทางถึงรายได้", "crm"]
    ],
    ops: [
      ["งานเกินกำหนด", data.overdueTasks, "จัดการก่อนกระทบลูกค้า", "tasks"],
      ["งานที่ยังไม่จบ", data.pendingTasks, "ตรวจเจ้าของงานและวันส่งมอบ", "tasks"],
      ["ดีลเริ่มส่งมอบ", state.deals.filter((deal) => deal.stage === "Won").length, "เตรียมทีมและข้อมูลลูกค้า", "deals"]
    ]
  };
  const signals = roleSignals[activeRole] || roleSignals.owner;
  document.querySelector("#signalGrid").innerHTML = signals.map(([label, value, note, target]) => `<button class="signal-card" data-jump="${target}"><span>${escapeHTML(label)}</span><strong>${escapeHTML(String(value))}</strong><small>${escapeHTML(note)} <b>ดู →</b></small></button>`).join("");
}

function compactItem(title, subtitle, value) {
  return `
    <div class="compact-item">
      <div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(subtitle)}</span></div>
      <span>${escapeHTML(value)}</span>
    </div>
  `;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="empty-state">ยังไม่มีข้อมูลที่ตรงกับเงื่อนไข</div>`;
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th scope="col">${escapeHTML(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderCustomers() {
  const query = document.querySelector("#customerSearch")?.value.toLowerCase() || "";
  const source = document.querySelector("#customerSourceFilter")?.value || "";
  const sources = [...new Set(state.customers.map((customer) => customer.source))].sort();
  const sourceFilter = document.querySelector("#customerSourceFilter");
  sourceFilter.innerHTML = `<option value="">ทุกช่องทาง</option>${sources.map((item) => `<option ${item === source ? "selected" : ""}>${escapeHTML(item)}</option>`).join("")}`;
  const customers = state.customers.filter((customer) => {
    const searchable = `${customer.fullName} ${customer.phone} ${customer.source} ${customer.interest}`.toLowerCase();
    return searchable.includes(query) && (!source || customer.source === source);
  });

  document.querySelector("#customerCount").textContent = `พบ ${customers.length} ราย`;
  document.querySelector("#customerTable").innerHTML = table(
    ["ลูกค้า", "ประเภทธุรกิจ / ลูกค้า", "เบอร์โทร", "ช่องทาง", "ข้อเสนอที่สนใจ", "สถานะ Lead", "จัดการ"],
    customers.map((customer) => {
      const lead = state.leads.find((item) => item.customerId === customer.id);
      const phone = String(customer.phone || "-");
      const customerCatalog = mergeCatalogWithProducts(buildProfileCatalog({
        ...state.businessProfile,
        businessMode: customer.businessMode,
        businessCategory: customer.businessCategory || state.businessProfile.businessCategory
      }, businessCatalogs), state.products);
      const offer = customerOffer(customer);
      const recommended = customerCatalog.some((item) => item.id === offer?.id || item.catalogKey === offer?.catalogKey || item.name === offer?.name);
      const customerMode = businessModes[customer.businessMode] || businessModes.online;
      return `<tr><td><div class="customer-cell">${avatarMarkup(customer, "small")}<div><strong>${escapeHTML(customer.fullName)}</strong><span>${escapeHTML(customer.interest)}</span></div></div></td><td><span class="customer-type-pill">${escapeHTML(customerMode.label)} · ${escapeHTML(customer.customerType || "ยังไม่จัดกลุ่ม")}</span></td><td><a class="contact-link" href="tel:${escapeHTML(phone.replace(/[^0-9+]/g, ""))}" aria-label="โทรหา ${escapeHTML(customer.fullName)}">${escapeHTML(phone)}</a></td><td>${contactBadge(customer.source)}</td><td><span class="package-pill ${recommended ? "package-pill--fit" : ""}">${escapeHTML(offer?.name || customer.solutionPackage || "ยังไม่เลือกข้อเสนอ")}</span></td><td>${escapeHTML(leadStatusLabels[lead?.status] || "-")}</td><td><div class="table-actions"><button class="row-action" data-edit-record="customer:${escapeHTML(customer.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="customer:${escapeHTML(customer.id)}">ลบ</button></div></td></tr>`;
    })
  );
}

function renderCrm() {
  const activeLeadIds = new Set(state.leads.map((lead) => lead.id));
  [...selectedLeadIds].forEach((id) => {
    if (!activeLeadIds.has(id)) selectedLeadIds.delete(id);
  });
  document.querySelector("#crmBoard").innerHTML = leadStatuses.map((status) => {
    const leads = state.leads.filter((lead) => lead.status === status);
    return `
      <section class="pipeline-col">
        <h2>${escapeHTML(leadStatusLabels[status])} <span class="badge">${leads.length}</span></h2>
        ${leads.map((lead) => leadCard(lead)).join("") || `<p class="muted">ยังไม่มี lead</p>`}
      </section>
    `;
  }).join("");
  updateCrmBulkToolbar();
}

function leadCard(lead) {
  const customer = customerById(lead.customerId);
  return `
    <article class="lead-card ${selectedLeadIds.has(lead.id) ? "selected" : ""}">
      <div class="lead-card-toolbar">
        <label class="lead-select"><input type="checkbox" data-lead-select="${escapeHTML(lead.id)}" ${selectedLeadIds.has(lead.id) ? "checked" : ""}> เลือก</label>
        <label class="lead-stage-control"><span class="sr-only">สถานะของ ${escapeHTML(customer?.fullName || "Lead")}</span><select data-lead-status="${escapeHTML(lead.id)}" aria-label="เปลี่ยนสถานะ Lead ${escapeHTML(customer?.fullName || "")}">${leadStatuses.map((status) => `<option value="${escapeHTML(status)}" ${status === lead.status ? "selected" : ""}>${escapeHTML(leadStatusLabels[status])}</option>`).join("")}</select></label>
      </div>
      <div class="lead-profile">
        ${avatarMarkup(customer)}
        <div>
          <strong>${escapeHTML(customer?.fullName || "-")}</strong>
          ${contactBadge(customer?.source || "-")}
        </div>
      </div>
      <span class="package-pill">${escapeHTML(customerOffer(customer)?.name || customer?.solutionPackage || "ยังไม่เลือกข้อเสนอ")}</span>
      <span>${escapeHTML(customer?.interest || "-")}</span>
      <span>คะแนน Lead ${escapeHTML(lead.leadScore)} · ติดตาม ${escapeHTML(lead.nextFollowUp)}</span>
      <div class="lead-actions">
        <button class="row-action" data-edit-record="lead:${escapeHTML(lead.id)}">แก้ไข Lead</button>
        <button class="row-action" data-deal-from-lead="${escapeHTML(lead.id)}">สร้างโอกาสขาย</button>
        <button class="row-action" data-task-from-lead="${escapeHTML(lead.id)}">สร้างงานติดตาม</button>
      </div>
    </article>
  `;
}

function updateCrmBulkToolbar() {
  const count = selectedLeadIds.size;
  document.querySelector("#selectedLeadCount").textContent = count ? `เลือกแล้ว ${count} Lead` : "ยังไม่ได้เลือก Lead";
  document.querySelector("#applyBulkLeadStage").disabled = count === 0;
  document.querySelector("#clearLeadSelection").disabled = count === 0;
  const selectAll = document.querySelector("#selectAllLeads");
  selectAll.checked = Boolean(state.leads.length) && count === state.leads.length;
  selectAll.indeterminate = count > 0 && count < state.leads.length;
}

function renderProducts() {
  const modeSelect = document.querySelector("#productBusinessMode");
  const selectedMode = modeSelect.value || state.businessProfile.businessMode;
  modeSelect.innerHTML = Object.entries(businessModes).map(([value, item]) =>
    `<option value="${escapeHTML(value)}" ${value === selectedMode ? "selected" : ""}>${escapeHTML(pipelineModeLabels[value] || item.label)}</option>`
  ).join("");
  const categorySelect = document.querySelector("#productBusinessCategory");
  const selectedCategory = categorySelect.value || state.businessProfile.businessCategory;
  categorySelect.innerHTML = Object.entries(businessCategories).map(([value, label]) =>
    `<option value="${escapeHTML(value)}" ${value === selectedCategory ? "selected" : ""}>${escapeHTML(label)}</option>`
  ).join("");
  const stageSelect = document.querySelector("#productPipelineStage");
  const selectedStage = stageSelect.value || "Proposal";
  stageSelect.innerHTML = dealStages.map((stage) =>
    `<option value="${escapeHTML(stage)}" ${stage === selectedStage ? "selected" : ""}>${escapeHTML(dealStageLabels[stage])}</option>`
  ).join("");
  document.querySelector("#productTable").innerHTML = table(
    ["สินค้า/บริการ/ข้อเสนอ", "ประเภท", "Business Mode", "ใช้ใน Pipeline", "ราคาขาย", "ต้นทุน", "กำไรขั้นต้น", "สถานะ", "จัดการ"],
    state.products.map((product) => {
      const margin = Number(product.price) - Number(product.cost);
      const modeLabel = product.businessMode ? businessModes[product.businessMode]?.label || "ทั่วไป" : "ทุกธุรกิจ";
      const categoryLabel = product.businessCategory ? businessCategories[product.businessCategory] || "ทุกหมวด" : "ทุกหมวด";
      const relation = product.businessMode ? `${modeLabel} · ${categoryLabel}` : modeLabel;
      const reason = product.recommendationReason || product.description || "";
      return `<tr><td><div class="product-name-cell"><strong>${escapeHTML(product.name)}</strong>${reason ? `<span>${escapeHTML(reason)}</span>` : ""}</div></td><td>${escapeHTML(product.category)}</td><td><span class="context-badge context-badge--table">${escapeHTML(relation)}</span></td><td><span class="pipeline-fit">${escapeHTML(dealStageLabels[product.pipelineStage] || dealStageLabels.Proposal)}</span></td><td>${escapeHTML(currency(product.price))}</td><td>${escapeHTML(currency(product.cost))}</td><td class="success">${escapeHTML(currency(margin))}</td><td>${product.status === "active" ? "เปิดขาย" : "ปิดขาย"}</td><td><div class="table-actions"><button class="row-action" data-edit-record="product:${escapeHTML(product.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="product:${escapeHTML(product.id)}">ลบ</button></div></td></tr>`;
    })
  );
}

function renderDealOfferOptions(preferredProductId = "") {
  const select = document.querySelector("#dealProductSelect");
  if (!select) return;
  const selected = preferredProductId || select.value;
  const activeProducts = state.products.filter((product) => product.status === "active");
  select.innerHTML = `<option value="">ไม่เชื่อมสินค้า/ข้อเสนอ</option>${activeProducts.map((product) =>
    `<option value="${escapeHTML(product.id)}" ${product.id === selected ? "selected" : ""}>${escapeHTML(product.name)} · ${escapeHTML(businessModes[product.businessMode]?.label || "ทุกธุรกิจ")} · ${escapeHTML(dealStageLabels[product.pipelineStage] || dealStageLabels.Proposal)}</option>`
  ).join("")}`;
}

function renderDeals() {
  document.querySelector("#dealCustomerSelect").innerHTML = state.customers.length
    ? state.customers.map((customer) => `<option value="${escapeHTML(customer.id)}">${escapeHTML(customer.fullName)}</option>`).join("")
    : `<option value="">เพิ่มลูกค้าก่อนสร้าง Deal</option>`;
  const submitButton = document.querySelector('#dealForm button[type="submit"]');
  submitButton.disabled = state.customers.length === 0;
  submitButton.textContent = state.customers.length ? "เพิ่มดีลธุรกิจ" : "เพิ่มลูกค้าก่อนสร้าง Deal";

  document.querySelector("#dealTable").innerHTML = table(
    ["ชื่อดีลเฉพาะ", "สินค้า/ข้อเสนอที่เชื่อม", "ลูกค้า", "มูลค่า", "สถานะดีล", "โอกาสสำเร็จ", "จัดการ"],
    state.deals.map((deal) => `
      <tr>
        <td>${escapeHTML(deal.name)}</td>
        <td><span class="package-pill">${escapeHTML(state.products.find((item) => item.id === deal.productId)?.name || deal.offerName || "ไม่ได้เชื่อมข้อเสนอ")}</span></td>
        <td>${escapeHTML(customerById(deal.customerId)?.fullName || "-")}</td>
        <td>${escapeHTML(currency(deal.value))}</td>
        <td>
          <select class="status-select" data-deal-stage="${escapeHTML(deal.id)}" aria-label="สถานะ ${escapeHTML(deal.name)}">
            ${dealStageOptionMarkup(deal.stage)}
          </select>
        </td>
        <td>${deal.probability}%</td>
        <td><div class="table-actions"><button class="row-action" data-edit-record="deal:${escapeHTML(deal.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="deal:${escapeHTML(deal.id)}">ลบ</button></div></td>
      </tr>
    `)
  );
  renderDealOfferOptions();
}

function renderTasks() {
  document.querySelector("#taskTable").innerHTML = table(
    ["งานที่ต้องทำ", "ผู้รับผิดชอบ", "กำหนดเสร็จ", "ความสำคัญ", "สถานะ", "จัดการ"],
    state.tasks.map((task) => `
      <tr>
        <td>${escapeHTML(task.title)}</td>
        <td>${escapeHTML(task.owner)}</td>
        <td class="${task.status !== "done" && task.dueDate < today() ? "danger" : ""}">${escapeHTML(task.dueDate)}</td>
        <td>${escapeHTML(priorityLabels[task.priority] || task.priority)}</td>
        <td>
          <select class="status-select" data-task-status="${escapeHTML(task.id)}" aria-label="สถานะ ${escapeHTML(task.title)}">
            ${taskStatuses.map((status) => `<option value="${escapeHTML(status)}" ${task.status === status ? "selected" : ""}>${escapeHTML(taskStatusLabels[status])}</option>`).join("")}
          </select>
        </td>
        <td><div class="table-actions"><button class="row-action" data-edit-record="task:${escapeHTML(task.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="task:${escapeHTML(task.id)}">ลบ</button></div></td>
      </tr>
    `)
  );
}

function renderAll() {
  renderDashboard();
  renderCustomers();
  renderCrm();
  renderProducts();
  renderDeals();
  renderTasks();
  renderPackageOptions();
  renderCustomerTypeOptions();
  renderAvatarOptions();
  renderAnalysisSnapshot();
}

function renderPackageOptions() {
  const select = document.querySelector("#customerPackageSelect");
  const selected = select.value;
  const recommended = currentBusinessCatalog();
  const recommendedIds = new Set(recommended.map((item) => item.id).filter(Boolean));
  const recommendedNames = new Set(recommended.map((item) => item.name));
  const otherProducts = state.products.filter((item) => item.status === "active" && !recommendedIds.has(item.id) && !recommendedNames.has(item.name));
  select.innerHTML = `
    <optgroup label="แนะนำสำหรับ ${escapeHTML(currentBusinessMode().label)}">
      ${recommended.map((item) => `<option value="${escapeHTML(offerReference(item))}" ${selected === offerReference(item) ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(currency(item.price))}</option>`).join("")}
    </optgroup>
    ${otherProducts.length ? `<optgroup label="สินค้าและบริการอื่นในระบบ">${otherProducts.map((item) => `<option value="${escapeHTML(offerReference(item))}" ${selected === offerReference(item) ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(currency(item.price))}</option>`).join("")}</optgroup>` : ""}
  `;
  const selectedOffer = offerByReference(select.value) || recommended[0] || otherProducts[0];
  const hint = document.querySelector("#customerPackageHint");
  if (hint && selectedOffer) {
    const offerMode = businessModes[selectedOffer.businessMode] || currentBusinessMode();
    hint.textContent = `ใช้กับ ${offerMode.label} ในขั้น ${dealStageLabels[selectedOffer.pipelineStage] || dealStageLabels.Proposal}: ${selectedOffer.description || `${selectedOffer.category} ที่สัมพันธ์กับรูปแบบการขายนี้`}`;
  }
}

function renderCustomerTypeOptions() {
  const mode = currentBusinessMode();
  const select = document.querySelector("#customerTypeSelect");
  const selected = select.value;
  document.querySelector("#customerTypeLabel").textContent = mode.customerTypeLabel;
  select.innerHTML = mode.customerTypes.map((item) =>
    `<option value="${escapeHTML(item)}" ${selected === item ? "selected" : ""}>${escapeHTML(item)}</option>`
  ).join("");
}

function renderAvatarOptions() {
  const select = document.querySelector("#customerAvatarPreset");
  const selected = select.value || state.businessProfile.businessCategory;
  select.innerHTML = Object.entries(avatarPresets).map(([value, item]) =>
    `<option value="${escapeHTML(value)}" ${selected === value ? "selected" : ""}>${escapeHTML(item.code)} · ${escapeHTML(item.label)}</option>`
  ).join("");
}

function resetCustomerFormDefaults() {
  document.querySelector("#customerPackageSelect").value = offerReference(currentBusinessCatalog()[0]);
  document.querySelector("#customerTypeSelect").value = currentBusinessMode().customerTypes[0];
  document.querySelector("#customerAvatarPreset").value = state.businessProfile.businessCategory;
  renderPackageOptions();
}

function roleInsight(data) {
  if (activeRole === "sales") return `ฝ่ายขาย: มี ${data.openDeals} โอกาสขาย มูลค่ารวม ${currency(data.pipelineValue)}`;
  if (activeRole === "marketing") return `การตลาด: ${data.topSource} สร้าง Lead สูงสุด ควรตรวจคุณภาพก่อนเพิ่มงบ`;
  if (activeRole === "ops") return `ทีมงาน: มี ${data.pendingTasks} งานค้าง และ ${data.overdueTasks} งานเลยกำหนด`;
  return revenueTarget() > 0
    ? `เจ้าของ: ทำได้ ${percent((data.revenue / revenueTarget()) * 100)} ของเป้ารายได้`
    : "เจ้าของ: ตั้งค่าโปรไฟล์และเป้ารายได้เพื่อเริ่มวัดผล";
}

const viewConfig = {
  dashboard: ["ภาพรวมธุรกิจ", "ดูรายได้ งานขาย และสิ่งที่ต้องทำวันนี้", "เพิ่มลูกค้าใหม่", "customers"],
  customers: ["ข้อมูลลูกค้า", "เก็บข้อมูลลูกค้า รูปโปรไฟล์ และแพ็กเกจที่สนใจ", "ไปหน้า CRM", "crm"],
  crm: ["CRM งานขาย", "ติดตาม Lead และเปลี่ยนความสนใจให้เป็นโอกาสขาย", "วิเคราะห์ด้วย AI", "ai"],
  products: ["สินค้าและข้อเสนอ", "จัดการสินค้า บริการ Subscription และ Package ให้ตรงกับรูปแบบธุรกิจ", "เพิ่มดีลธุรกิจ", "deals"],
  deals: ["Pipeline ธุรกิจ", "พัฒนาดีลตั้งแต่ตรวจความต้องการ ออกแบบข้อเสนอ จนเริ่มส่งมอบงาน", "ดูภาพรวม", "dashboard"],
  tasks: ["งานติดตาม", "จัดลำดับงานที่ต้องทำและป้องกัน Lead หลุด", "เปิด CRM", "crm"],
  ai: ["วิเคราะห์ด้วย AI", "ใช้ข้อมูลจริงในระบบเพื่อหาโอกาสและวางแผนงานต่อ", "กลับภาพรวม", "dashboard"]
};

function showView(route, options = {}) {
  let [view, routeRole] = String(route || "dashboard").split("/");
  if (!VALID_VIEWS.includes(view)) view = "dashboard";
  if (view === "dashboard" && roleViews[routeRole] && routeRole !== activeRole) {
    activeRole = routeRole;
    renderDashboard();
  }
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((item) => {
    const selected = item.dataset.view === view;
    item.classList.toggle("active", selected);
    if (selected) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  document.querySelector(`#${view}View`).classList.add("active");
  const [defaultTitle, defaultDescription, defaultActionLabel, defaultActionTarget] = viewConfig[view];
  const role = roleViews[activeRole] || roleViews.owner;
  const title = view === "dashboard" ? role.title : defaultTitle;
  const description = view === "dashboard" ? role.pageDescription : defaultDescription;
  const actionLabel = view === "dashboard" ? role.action : defaultActionLabel;
  const actionTarget = view === "dashboard" ? role.target : defaultActionTarget;
  document.querySelector("#viewTitle").textContent = title;
  document.querySelector("#viewDescription").textContent = description;
  document.querySelector("#pageAction").textContent = actionLabel;
  document.querySelector("#pageAction").dataset.target = actionTarget;
  const nextRoute = view === "dashboard" ? `dashboard/${activeRole}` : view;
  if (options.historyMode !== "none") {
    const method = options.historyMode === "replace" || location.hash === `#${nextRoute}` ? "replaceState" : "pushState";
    history[method](null, "", `#${nextRoute}`);
  }
  document.title = `${document.querySelector("#viewTitle").textContent} | Business Growth`;
  if (options.scroll !== false) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }
  if (options.focusHeading) requestAnimationFrame(() => document.querySelector("#viewTitle").focus({ preventScroll: true }));
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view, { focusHeading: true }));
});

document.querySelector("#pageAction").addEventListener("click", (event) => showView(event.currentTarget.dataset.target, { focusHeading: true }));

document.querySelectorAll(".role-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeRole = button.dataset.role;
    renderDashboard();
    showView(`dashboard/${activeRole}`, { scroll: false });
    notify(`เปิดมุมมอง ${roleViews[activeRole].label} แล้ว`);
  });
});

document.querySelector("#businessViewSwitch").addEventListener("click", (event) => {
  const button = event.target.closest("[data-business-view]");
  if (!button || !businessModes[button.dataset.businessView]) return;
  state.businessProfile.businessMode = button.dataset.businessView;
  document.querySelector("#productBusinessMode").value = state.businessProfile.businessMode;
  if (!saveState()) return;
  renderAll();
  resetCustomerFormDefaults();
  showView(`dashboard/${activeRole}`, { scroll: false });
  document.querySelector(`[data-business-view="${state.businessProfile.businessMode}"]`)?.focus();
  notify(`ปรับ KPI, Journey, กลุ่มลูกค้า และ Package เป็น ${currentBusinessMode().label} แล้ว`);
});

document.querySelector("#businessProfileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.businessProfile = {
    businessName: form.get("businessName").trim(),
    businessMode: form.get("businessMode"),
    businessCategory: form.get("businessCategory"),
    businessAvatar: form.get("businessAvatar"),
    revenueTarget: Math.max(0, Number(form.get("revenueTarget")) || 0)
  };
  document.querySelector("#productBusinessMode").value = state.businessProfile.businessMode;
  if (!saveState()) return;
  renderAll();
  resetCustomerFormDefaults();
  document.querySelector(".business-context").open = false;
  notify("บันทึก Business Profile และปรับ Dashboard แล้ว");
});

document.querySelector("#installBusinessCatalog").addEventListener("click", () => {
  const additions = packagesMissingFromCatalog(state.products, currentBusinessCatalog());
  additions.forEach((item) => state.products.push({
    id: uid("p"),
    name: item.name,
    category: item.category,
    price: item.price,
    cost: item.cost,
    status: "active",
    businessMode: item.businessMode,
    businessCategory: item.businessCategory,
    pipelineStage: item.pipelineStage,
    catalogKey: item.catalogKey,
    description: item.description,
    recommendationReason: item.recommendationReason
  }));
  state = normalizeOfferRelations(state);
  state.customers = state.customers.map(alignCustomerType);
  if (!saveState()) return;
  renderAll();
  notify(additions.length ? `เพิ่มข้อเสนอแนะนำ ${additions.length} รายการแล้ว` : "ชุดข้อเสนอแนะนำอยู่ในระบบแล้ว");
});

document.querySelector("#businessCategorySelect").addEventListener("change", (event) => {
  document.querySelector("#businessAvatarSelect").value = event.target.value;
  document.querySelector("#businessAvatarPreview").innerHTML = avatarPresetMarkup(event.target.value, "large", "ตัวอย่างรูปโปรไฟล์ธุรกิจ");
  previewDraftBusinessCatalog();
});

document.querySelector("#businessAvatarSelect").addEventListener("change", (event) => {
  document.querySelector("#businessAvatarPreview").innerHTML = avatarPresetMarkup(event.target.value, "large", "ตัวอย่างรูปโปรไฟล์ธุรกิจ");
});

document.querySelector("#businessModeSelect").addEventListener("change", previewDraftBusinessCatalog);
document.querySelector('#businessProfileForm input[name="businessName"]').addEventListener("input", debounce(previewDraftBusinessCatalog, 180));

function debounce(callback, delay = 140) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

document.querySelector("#customerSearch").addEventListener("input", debounce(renderCustomers));
document.querySelector("#customerSourceFilter").addEventListener("change", renderCustomers);
document.querySelector("#customerPackageSelect").addEventListener("change", renderPackageOptions);
document.querySelector("#dealProductSelect").addEventListener("change", (event) => {
  const product = state.products.find((item) => item.id === event.target.value);
  if (!product) return;
  document.querySelector('#dealForm input[name="name"]').value = product.name;
  document.querySelector('#dealForm input[name="value"]').value = product.price;
  document.querySelector('#dealForm select[name="stage"]').value = product.pipelineStage || "Proposal";
});
document.querySelector("#dealCustomerSelect").addEventListener("change", (event) => {
  const customer = customerById(event.target.value);
  if (customer?.solutionPackageId) {
    renderDealOfferOptions(customer.solutionPackageId);
    document.querySelector("#dealProductSelect").dispatchEvent(new Event("change"));
  }
});

function resizeProfilePhoto(file) {
  if (!file) return Promise.resolve("");
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("invalid image"));
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 160;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      const crop = Math.min(image.width, image.height);
      const x = (image.width - crop) / 2;
      const y = (image.height - crop) / 2;
      context.drawImage(image, x, y, crop, crop, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", .78));
      URL.revokeObjectURL(image.src);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

const recordConfigs = {
  customer: {
    title: "แก้ไขข้อมูลลูกค้า",
    collection: "customers",
    fields: [
      ["fullName", "ชื่อลูกค้า", "text"], ["phone", "เบอร์โทร", "text"],
      ["source", "ช่องทางที่มา", "select", contactSources],
      ["avatarPreset", "Avatar ตามประเภทธุรกิจ", "select", Object.keys(avatarPresets)],
      ["customerType", "ประเภทลูกค้า", "select", []],
      ["solutionPackageId", "ข้อเสนอที่สนใจ", "select", []], ["interest", "ความต้องการ", "text"]
    ]
  },
  lead: {
    title: "แก้ไข Lead และงานติดตาม",
    collection: "leads",
    fields: [
      ["status", "สถานะ Lead", "select", leadStatuses],
      ["assignedTo", "ผู้รับผิดชอบ", "text"],
      ["leadScore", "คะแนน Lead", "number"],
      ["nextFollowUp", "วันติดตามครั้งถัดไป", "date"]
    ]
  },
  product: {
    title: "แก้ไขแพ็กเกจ/บริการ", collection: "products",
    fields: [["name", "ชื่อเฉพาะของสินค้า/ข้อเสนอ", "text"], ["category", "ประเภท", "select", productCategories], ["businessMode", "รูปแบบธุรกิจใน Pipeline", "select", Object.keys(businessModes)], ["businessCategory", "หมวดธุรกิจ", "select", Object.keys(businessCategories)], ["pipelineStage", "เสนอในขั้น Pipeline", "select", dealStages], ["price", "ราคาขาย", "number"], ["cost", "ต้นทุน", "number"], ["description", "รายละเอียด Package", "text"], ["recommendationReason", "เหตุผลที่ควรแนะนำ", "text"], ["status", "สถานะ", "select", ["active", "inactive"]]]
  },
  deal: {
    title: "แก้ไขดีลธุรกิจ", collection: "deals",
    fields: [["customerId", "ลูกค้า", "select", []], ["productId", "สินค้า/ข้อเสนอที่เชื่อม", "select", []], ["name", "ชื่อดีลเฉพาะสำหรับลูกค้า", "text"], ["value", "มูลค่า", "number"], ["stage", "สถานะการพัฒนาดีล", "select", dealStages], ["probability", "โอกาสสำเร็จ (%)", "number"]]
  },
  task: {
    title: "แก้ไขงานติดตาม", collection: "tasks",
    fields: [["title", "งานที่ต้องทำ", "text"], ["owner", "ผู้รับผิดชอบ", "text"], ["dueDate", "กำหนดเสร็จ", "date"], ["priority", "ความสำคัญ", "select", ["High", "Medium", "Low"]], ["status", "สถานะ", "select", taskStatuses]]
  }
};

function recordFieldMarkup([name, label, type, options], record) {
  const value = name === "solutionPackageId" && record[name] ? `product:${record[name]}` : record[name] ?? "";
  if (type === "select") {
    const labelMap = name === "stage" || name === "pipelineStage" ? dealStageLabels : name === "businessMode" ? pipelineModeLabels : name === "businessCategory" ? businessCategories : name === "status" ? { ...taskStatusLabels, ...leadStatusLabels, active: "เปิดขาย", inactive: "ปิดขาย" } : name === "priority" ? priorityLabels : name === "avatarPreset" ? Object.fromEntries(Object.entries(avatarPresets).map(([key, item]) => [key, `${item.code} · ${item.label}`])) : {};
    const optionMarkup = name === "stage"
      ? dealStageOptionMarkup(String(value))
      : options.map((option) => {
        const optionValue = typeof option === "object" ? option.value : option;
        const optionLabel = typeof option === "object" ? option.label : labelMap[option] || option;
        return `<option value="${escapeHTML(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${escapeHTML(optionLabel)}</option>`;
      }).join("");
    return `<label>${escapeHTML(label)}<select name="${escapeHTML(name)}">${optionMarkup}</select></label>`;
  }
  return `<label>${escapeHTML(label)}<input name="${escapeHTML(name)}" type="${escapeHTML(type)}" value="${escapeHTML(value)}" ${type === "number" ? "min=\"0\"" : ""} required></label>`;
}

function openRecordDialog(type, id) {
  const config = recordConfigs[type];
  const record = config && state[config.collection].find((item) => item.id === id);
  if (!record) return;
  const dialog = document.querySelector("#recordDialog");
  const form = document.querySelector("#recordForm");
  document.querySelector("#recordDialogTitle").textContent = config.title;
  const fields = type === "customer" ? config.fields.map((field) => {
    const recordMode = businessModes[record.businessMode] || currentBusinessMode();
    const recordCatalog = mergeCatalogWithProducts(buildProfileCatalog({
      ...state.businessProfile,
      businessMode: record.businessMode,
      businessCategory: record.businessCategory || state.businessProfile.businessCategory
    }, businessCatalogs), state.products);
    if (field[0] === "customerType") return [field[0], recordMode.customerTypeLabel, field[2], recordMode.customerTypes];
    if (field[0] === "solutionPackageId") {
      const offers = [...recordCatalog, ...state.products].filter((item, index, all) => all.findIndex((candidate) => (candidate.id && candidate.id === item.id) || (!candidate.id && candidate.name === item.name)) === index);
      const options = offers.map((item) => ({ value: offerReference(item), label: `${item.name} · ${currency(item.price)}` }));
      if (!record.solutionPackageId && record.solutionPackage) options.unshift({ value: "", label: `${record.solutionPackage} · เก็บจากข้อมูลเดิม` });
      return [field[0], field[1], field[2], options];
    }
    return field;
  }) : type === "deal" ? config.fields.map((field) => {
    if (field[0] === "customerId") return [field[0], field[1], field[2], state.customers.map((customer) => ({ value: customer.id, label: customer.fullName }))];
    if (field[0] === "productId") return [field[0], field[1], field[2], [{ value: "", label: "ไม่เชื่อมสินค้า/ข้อเสนอ" }, ...state.products.map((product) => ({ value: product.id, label: `${product.name} · ${dealStageLabels[product.pipelineStage] || dealStageLabels.Proposal}` }))]];
    return field;
  }) : config.fields;
  document.querySelector("#recordFields").innerHTML = fields.map((field) => recordFieldMarkup(field, record)).join("");
  form.dataset.recordType = type;
  form.dataset.recordId = id;
  dialog.showModal();
}

function deleteRecord(type, id) {
  const config = recordConfigs[type];
  const record = config && state[config.collection].find((item) => item.id === id);
  if (!record) return;
  const related = type === "customer"
    ? " Lead และ Deal ที่เชื่อมกับลูกค้ารายนี้จะถูกลบด้วย"
    : type === "product"
      ? " ระบบจะถอดการเชื่อมจาก Customer, Deal และงานติดตาม แต่ยังเก็บชื่อเดิมไว้ในประวัติ"
      : "";
  if (!window.confirm(`ยืนยันลบรายการนี้หรือไม่?${related}`)) return;
  const previousState = clone(state);
  if (type === "product") state = detachProductRelations(state, id);
  else state[config.collection] = state[config.collection].filter((item) => item.id !== id);
  if (type === "customer") {
    state.leads = state.leads.filter((lead) => lead.customerId !== id);
    state.deals = state.deals.filter((deal) => deal.customerId !== id);
  }
  if (!saveState()) return;
  renderAll();
  registerUndo("ลบรายการเรียบร้อยแล้ว", () => {
    state = normalizeState(clone(previousState));
  });
}

document.querySelector("#recordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const config = recordConfigs[form.dataset.recordType];
  const record = config && state[config.collection].find((item) => item.id === form.dataset.recordId);
  if (!record) return;
  const values = new FormData(form);
  const changes = {};
  config.fields.forEach(([name, , fieldType]) => {
    if (name === "solutionPackageId") return;
    const value = values.get(name);
    changes[name] = fieldType === "number" ? Number(value) : String(value || "").trim();
  });
  if (form.dataset.recordType === "product") {
    state = updateProductAcrossState(state, record.id, changes);
    state.customers = state.customers.map(alignCustomerType);
  } else {
    Object.assign(record, changes);
  }
  if (config.collection === "customers") {
    const offer = offerByReference(values.get("solutionPackageId"));
    if (offer) {
      record.solutionPackageId = offer.id || "";
      record.solutionPackage = offer.name;
      record.businessMode = offer.businessMode || record.businessMode;
      record.businessCategory = offer.businessCategory || record.businessCategory;
      Object.assign(record, alignCustomerType(record));
    }
  }
  if (config.collection === "deals") {
    const offer = state.products.find((item) => item.id === record.productId);
    record.offerName = offer?.name || record.offerName || "";
    record.probability = record.stage === "Won" ? 100 : record.stage === "Lost" ? 0 : Math.min(100, Math.max(0, Number(record.probability)));
  }
  if (config.collection === "leads") record.leadScore = Math.min(100, Math.max(0, Number(record.leadScore)));
  if (!saveState()) return;
  renderAll();
  document.querySelector("#recordDialog").close();
  notify("บันทึกการแก้ไขแล้ว");
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.querySelector("#recordDialog").close()));

document.querySelector("#customerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const customerId = uid("c");
  const selectedOffer = offerByReference(form.get("solutionPackage"));
  const selectedOfferMode = businessModes[selectedOffer?.businessMode] || currentBusinessMode();
  let avatar = "";
  try {
    avatar = await resizeProfilePhoto(form.get("profilePhoto"));
  } catch {
    notify("อ่านรูปโปรไฟล์ไม่สำเร็จ ระบบจะใช้รูปตัวอักษรแทน");
  }
  state.customers.push({
    id: customerId,
    fullName: form.get("fullName").trim(),
    phone: form.get("phone").trim() || "-",
    source: form.get("source"),
    solutionPackageId: selectedOffer?.id || "",
    solutionPackage: selectedOffer?.name || "ยังไม่เลือกข้อเสนอ",
    customerType: selectedOffer?.businessMode && selectedOffer.businessMode !== state.businessProfile.businessMode
      ? selectedOfferMode.customerTypes[0]
      : form.get("customerType"),
    businessMode: selectedOffer?.businessMode || state.businessProfile.businessMode,
    businessCategory: selectedOffer?.businessCategory || state.businessProfile.businessCategory,
    interest: form.get("interest").trim(),
    avatar,
    avatarPreset: form.get("avatarPreset") || state.businessProfile.businessCategory,
    createdAt: new Date().toISOString().slice(0, 10)
  });
  state.leads.push({
    id: uid("l"),
    customerId,
    status: "New Lead",
    assignedTo: "Sales Team",
    leadScore: 50,
    nextFollowUp: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  });
  if (!saveState()) return;
  formElement.reset();
  renderAll();
  document.querySelector("#customerAdvancedFields").open = false;
  resetCustomerFormDefaults();
  notify("เพิ่มลูกค้าและสร้าง Lead แล้ว");
});

document.querySelector("#productForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.products.push({
    id: uid("p"),
    name: form.get("name").trim(),
    category: form.get("category"),
    price: Number(form.get("price")),
    cost: Number(form.get("cost")),
    status: "active",
    businessMode: form.get("businessMode"),
    businessCategory: form.get("businessCategory"),
    pipelineStage: form.get("pipelineStage"),
    description: form.get("description").trim(),
    recommendationReason: form.get("recommendationReason").trim() || `ใช้ในขั้น ${dealStageLabels[form.get("pipelineStage")] || dealStageLabels.Proposal}`
  });
  state = normalizeOfferRelations(state);
  state.customers = state.customers.map(alignCustomerType);
  if (!saveState()) return;
  event.currentTarget.reset();
  document.querySelector("#productBusinessMode").value = state.businessProfile.businessMode;
  document.querySelector("#productBusinessCategory").value = state.businessProfile.businessCategory;
  document.querySelector("#productPipelineStage").value = "Proposal";
  renderAll();
  notify("สร้างสินค้าและเชื่อมกับ Business Pipeline แล้ว");
});

document.querySelector("#dealForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const stage = form.get("stage");
  state.deals.push({
    id: uid("d"),
    customerId: form.get("customerId"),
    productId: form.get("productId"),
    offerName: state.products.find((item) => item.id === form.get("productId"))?.name || "",
    name: form.get("name").trim(),
    value: Number(form.get("value")),
    stage,
    probability: stage === "Won" ? 100 : 50
  });
  if (!saveState()) return;
  event.currentTarget.reset();
  renderAll();
  notify("เพิ่ม Deal แล้ว");
});

document.querySelector("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.tasks.push({
    id: uid("t"),
    title: form.get("title").trim(),
    owner: form.get("owner").trim(),
    dueDate: form.get("dueDate"),
    priority: form.get("priority"),
    status: "todo"
  });
  if (!saveState()) return;
  event.currentTarget.reset();
  setDefaultDueDate();
  renderAll();
  notify("เพิ่ม Task แล้ว");
});

document.addEventListener("change", (event) => {
  const dealId = event.target.dataset.dealStage;
  const taskId = event.target.dataset.taskStatus;
  const leadId = event.target.dataset.leadStatus;
  const selectedLeadId = event.target.dataset.leadSelect;

  if (selectedLeadId) {
    if (event.target.checked) selectedLeadIds.add(selectedLeadId);
    else selectedLeadIds.delete(selectedLeadId);
    event.target.closest(".lead-card")?.classList.toggle("selected", event.target.checked);
    updateCrmBulkToolbar();
  }

  if (leadId) setLeadStatus(leadId, event.target.value);

  if (dealId) {
    const deal = state.deals.find((item) => item.id === dealId);
    const previousStage = deal.stage;
    const previousProbability = deal.probability;
    deal.stage = event.target.value;
    deal.probability = deal.stage === "Won" ? 100 : deal.stage === "Lost" ? 0 : deal.probability;
    if (!saveState()) return;
    renderAll();
    registerUndo(`อัปเดต Deal เป็น ${dealStageLabels[deal.stage]}`, () => {
      const currentDeal = state.deals.find((item) => item.id === dealId);
      if (currentDeal) {
        currentDeal.stage = previousStage;
        currentDeal.probability = previousProbability;
      }
    });
  }

  if (taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    const previousStatus = task.status;
    task.status = event.target.value;
    if (!saveState()) return;
    renderAll();
    registerUndo("อัปเดตสถานะ Task แล้ว", () => {
      const currentTask = state.tasks.find((item) => item.id === taskId);
      if (currentTask) currentTask.status = previousStatus;
    });
  }
});

document.querySelector("#selectAllLeads").addEventListener("change", (event) => {
  selectedLeadIds.clear();
  if (event.currentTarget.checked) state.leads.forEach((lead) => selectedLeadIds.add(lead.id));
  renderCrm();
});

document.querySelector("#clearLeadSelection").addEventListener("click", () => {
  selectedLeadIds.clear();
  renderCrm();
});

document.querySelector("#applyBulkLeadStage").addEventListener("click", () => {
  const nextStatus = document.querySelector("#bulkLeadStage").value;
  const previousStatuses = [];
  state.leads.forEach((lead) => {
    if (!selectedLeadIds.has(lead.id) || lead.status === nextStatus) return;
    previousStatuses.push([lead.id, lead.status]);
    lead.status = nextStatus;
  });
  if (!previousStatuses.length) {
    notify("Lead ที่เลือกอยู่ในขั้นนี้แล้ว");
    return;
  }
  if (!saveState()) return;
  selectedLeadIds.clear();
  renderAll();
  registerUndo(`ย้าย ${previousStatuses.length} Lead ไปขั้น ${leadStatusLabels[nextStatus]}`, () => {
    previousStatuses.forEach(([id, status]) => {
      const lead = state.leads.find((item) => item.id === id);
      if (lead) lead.status = status;
    });
  });
});

document.addEventListener("click", (event) => {
  const jumpTarget = event.target.closest("[data-jump]")?.dataset.jump;
  const taskLeadId = event.target.dataset.taskFromLead;
  const dealLeadId = event.target.dataset.dealFromLead;
  const editRecord = event.target.dataset.editRecord;
  const deleteRecordRef = event.target.dataset.deleteRecord;

  if (jumpTarget) showView(jumpTarget, { focusHeading: true });

  if (editRecord) {
    const [type, id] = editRecord.split(":");
    openRecordDialog(type, id);
  }

  if (deleteRecordRef) {
    const [type, id] = deleteRecordRef.split(":");
    deleteRecord(type, id);
  }

  if (taskLeadId) {
    const lead = state.leads.find((item) => item.id === taskLeadId);
    const customer = customerById(lead.customerId);
    const offer = customerOffer(customer);
    state.tasks.push({
      id: uid("t"),
      title: `ติดตาม ${customer?.fullName || "ลูกค้า"} เรื่อง ${offer?.name || customer?.solutionPackage || "แพ็กเกจบริการ"}`,
      productId: offer?.id || "",
      offerName: offer?.name || customer?.solutionPackage || "",
      owner: lead.assignedTo,
      dueDate: lead.nextFollowUp,
      priority: lead.leadScore > 70 ? "High" : "Medium",
      status: "todo"
    });
    if (!saveState()) return;
    renderAll();
    showView("tasks", { focusHeading: true });
    notify("สร้าง Follow-up task แล้ว");
  }

  if (dealLeadId) {
    const lead = state.leads.find((item) => item.id === dealLeadId);
    const customer = customerById(lead.customerId);
    const solution = customerOffer(customer);
    showView("deals", { focusHeading: true });
    document.querySelector("#dealCustomerSelect").value = customer.id;
    renderDealOfferOptions(solution?.id || "");
    document.querySelector('#dealForm input[name="name"]').value = solution?.name || customer.solutionPackage || "ข้อเสนอเฉพาะสำหรับลูกค้า";
    document.querySelector('#dealForm input[name="value"]').value = solution?.price || 25000;
    document.querySelector('#dealForm select[name="stage"]').value = solution?.pipelineStage || "Proposal";
    notify("เตรียมข้อมูลโอกาสขายจาก CRM แล้ว กดบันทึกเพื่อยืนยัน");
  }
});

const analysisPrompts = {
  executive: "สรุปภาพรวมธุรกิจสำหรับเจ้าของ โดยชี้ 3 ตัวเลขสำคัญ สถานการณ์ปัจจุบัน เรื่องที่ต้องตัดสินใจ และผู้รับผิดชอบสิ่งที่ควรทำต่อ",
  revenue: "วิเคราะห์รายได้เทียบเป้าหมาย มูลค่าที่ปิดได้ ช่องว่างรายได้ และโอกาสที่มีหลักฐานรองรับ พร้อมระบุสิ่งที่ควรทำเพื่อเข้าใกล้เป้าหมาย",
  pipeline: "วิเคราะห์สุขภาพ Pipeline จำนวนและมูลค่าในแต่ละขั้น อัตราปิดการขาย ดีลที่มีโอกาส และดีลที่เสี่ยงหยุดนิ่ง พร้อมลำดับการติดตาม",
  journey: "วิเคราะห์ Customer Journey ตั้งแต่รู้จักจนปิดการขาย ระบุขั้นที่ลูกค้าติดค้างมากที่สุด เหตุผลจากข้อมูล และวิธีแก้คอขวด",
  customer: "แบ่งกลุ่มลูกค้าจากประเภท รูปแบบธุรกิจ ความสนใจ และ Package ที่สนใจ ระบุกลุ่มมูลค่าสูง กลุ่มที่ควรรักษา และข้อมูลลูกค้าที่ควรเก็บเพิ่ม",
  marketing: "วิเคราะห์ช่องทางที่สร้าง Lead คุณภาพและรายได้ เปรียบเทียบจำนวน Lead กับผลลัพธ์การขาย และแนะนำช่องทางหรือข้อความการตลาดที่ควรให้ความสำคัญ",
  package: "วิเคราะห์ Package ที่ลูกค้าสนใจ ราคา ต้นทุน กำไรขั้นต้น และความเหมาะสมกับกลุ่มลูกค้า พร้อมหาโอกาส Cross-sell หรือ Upsell โดยไม่เดาข้อมูลเพิ่ม",
  sales: "จัดลำดับ Lead ที่ควรติดตามก่อน โดยใช้คะแนน Lead ขั้นการขาย มูลค่าดีล และวันติดตาม พร้อมเสนอ Next Best Action และผู้รับผิดชอบ",
  operations: "ตรวจงานติดตาม งานเกินกำหนด ภาระของผู้รับผิดชอบ และความเสี่ยงต่อการส่งมอบหรือปิดการขาย พร้อมจัดลำดับงาน 7 วัน",
  forecast: "ประเมินแนวโน้มรายได้จากดีลและความน่าจะเป็นที่มีในระบบ ระบุสมมติฐาน ความเสี่ยง ข้อมูลที่ยังขาด และทำแผนลงมือทำ 7 วันสำหรับแต่ละทีม"
};

const analysisQuickQuestions = [
  "วันนี้ควรติดตามลูกค้ารายใดก่อน เพราะอะไร",
  "Package ใดสร้างรายได้และกำไรได้ดีที่สุด",
  "ลูกค้ากลุ่มใดมีโอกาสซื้อซ้ำหรือ Upsell",
  "Lead ใดเสี่ยงหลุดจาก Pipeline และควรทำอะไรต่อ"
];

function selectedAnalysisPrompt() {
  return analysisPrompts[document.querySelector("#analysisFocus").value] || analysisPrompts.executive;
}

function analysisPayload(userPrompt) {
  return {
    focus: document.querySelector("#analysisFocus").value,
    userPrompt,
    businessProfile: state.businessProfile,
    targetRevenue: revenueTarget(),
    metrics: metrics(),
    customers: state.customers.map((customer) => ({
      id: customer.id,
      fullName: customer.fullName,
      source: customer.source,
      solutionPackageId: customer.solutionPackageId,
      solutionPackage: customerOffer(customer)?.name || customer.solutionPackage,
      interest: customer.interest,
      createdAt: customer.createdAt
    })),
    leads: state.leads,
    deals: state.deals.map((deal) => ({ ...deal, offerName: state.products.find((product) => product.id === deal.productId)?.name || deal.offerName })),
    tasks: state.tasks.map((task) => ({ ...task, offerName: state.products.find((product) => product.id === task.productId)?.name || task.offerName })),
    packages: state.products,
    recommendedCatalog: currentBusinessCatalog()
  };
}

function analysisEvidenceMarkup() {
  const data = metrics();
  const updatedAt = new Date(state.meta?.updatedAt || Date.now());
  return `<div class="analysis-evidence"><strong>ข้อมูลอ้างอิง</strong><span>${state.customers.length} ลูกค้า</span><span>${state.leads.length} Lead</span><span>${data.openDeals} ดีลเปิด</span><span>${data.pendingTasks} งานค้าง</span><time datetime="${escapeHTML(updatedAt.toISOString())}">${escapeHTML(updatedAt.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }))}</time></div>`;
}

function renderAnalysisSnapshot() {
  const data = metrics();
  const updatedAt = new Date(state.meta?.updatedAt || Date.now());
  document.querySelector("#analysisFreshness").innerHTML = `${iconMarkup("clock")} ข้อมูลล่าสุด <time datetime="${escapeHTML(updatedAt.toISOString())}">${escapeHTML(updatedAt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }))}</time>`;
  document.querySelector("#analysisMetricsSummary").innerHTML = [
    ["ลูกค้า", state.customers.length],
    ["Lead", state.leads.length],
    ["ดีลเปิด", data.openDeals],
    ["งานค้าง", data.pendingTasks]
  ].map(([label, value]) => `<span><b>${escapeHTML(value)}</b>${escapeHTML(label)}</span>`).join("");
  const quickQuestions = document.querySelector("#analysisQuickQuestions");
  if (quickQuestions) {
    quickQuestions.innerHTML = analysisQuickQuestions.map((question) => `<button type="button" data-analysis-question="${escapeHTML(question)}">${escapeHTML(question)}</button>`).join("");
  }
}

function renderPromptPreview() {
  const preview = document.querySelector("#analysisPromptPreview");
  const prompt = document.querySelector("#analysisPrompt");
  const template = selectedAnalysisPrompt();
  preview.innerHTML = `<strong>กรอบวิเคราะห์ที่เลือก</strong><p>${escapeHTML(template)}</p><button type="button" class="text-button" id="useAnalysisPrompt">ใช้ Prompt นี้ในช่องถาม</button>`;
  document.querySelector("#useAnalysisPrompt").addEventListener("click", () => {
    prompt.value = template;
    prompt.dataset.template = "true";
    prompt.focus();
  });
}

document.querySelector("#analysisFocus").addEventListener("change", renderPromptPreview);
document.querySelector("#analysisPrompt").addEventListener("input", (event) => {
  event.currentTarget.dataset.template = "false";
});
document.querySelector("#analysisPrompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !analysisInFlight) {
    event.preventDefault();
    document.querySelector("#analysisChatForm").requestSubmit();
  }
});
document.querySelector("#analysisQuickQuestions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-analysis-question]");
  if (!button) return;
  const prompt = document.querySelector("#analysisPrompt");
  prompt.value = button.dataset.analysisQuestion;
  prompt.dataset.template = "false";
  prompt.focus();
});

document.querySelector("#analysisChatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (analysisInFlight) return;
  const button = document.querySelector("#analyzeBusiness");
  const result = document.querySelector("#analysisResult");
  const status = document.querySelector("#analysisStatus");
  const prompt = document.querySelector("#analysisPrompt");
  const focusSelect = document.querySelector("#analysisFocus");
  const quickButtons = [...document.querySelectorAll("#analysisQuickQuestions button")];
  const userPrompt = prompt.value.trim();
  if (!userPrompt) return prompt.focus();
  const evidenceMarkup = analysisEvidenceMarkup();
  analysisInFlight = true;
  button.disabled = true;
  prompt.readOnly = true;
  focusSelect.disabled = true;
  quickButtons.forEach((quickButton) => { quickButton.disabled = true; });
  event.currentTarget.setAttribute("aria-busy", "true");
  button.textContent = "กำลังวิเคราะห์...";
  status.textContent = "กำลังประมวลผล";
  result.classList.remove("empty-analysis");
  result.innerHTML = `${evidenceMarkup}<article class="chat-message user-message"><span>คำถามของคุณ</span><p>${escapeHTML(userPrompt)}</p></article><article class="chat-message assistant-message loading-message"><span>AI Business Analyst</span><p>กำลังอ่านข้อมูลในระบบและตรวจตัวเลขที่เกี่ยวข้อง...</p></article>`;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(analysisPayload(userPrompt))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "วิเคราะห์ไม่สำเร็จ");
    document.querySelector("#analysisTitle").textContent = "ข้อเสนอจาก AI สำหรับธุรกิจนี้";
    result.innerHTML = `${evidenceMarkup}<article class="chat-message user-message"><span>คำถามของคุณ</span><p>${escapeHTML(userPrompt)}</p></article><article class="chat-message assistant-message"><span>AI Business Analyst</span><p>${escapeHTML(data.analysis)}</p></article>`;
    status.textContent = "วิเคราะห์แล้ว";
  } catch (error) {
    document.querySelector("#analysisTitle").textContent = "ยังเชื่อมต่อ AI ไม่สำเร็จ";
    const errorText = error.message === "Failed to fetch"
      ? "ระบบยังเชื่อมต่อบริการวิเคราะห์ไม่ได้ กรุณาลองใหม่"
      : error.message;
    result.innerHTML = `${evidenceMarkup}<article class="chat-message user-message"><span>คำถามของคุณ</span><p>${escapeHTML(userPrompt)}</p></article><article class="chat-message assistant-message error-message"><span>ระบบวิเคราะห์</span><p>${escapeHTML(errorText)} ข้อมูล Snapshot ด้านบนยังอยู่ครบ คุณสามารถแก้คำถามแล้วลองอีกครั้ง</p></article>`;
    status.textContent = "เกิดข้อผิดพลาด";
  } finally {
    analysisInFlight = false;
    button.disabled = false;
    prompt.readOnly = false;
    focusSelect.disabled = false;
    quickButtons.forEach((quickButton) => { quickButton.disabled = false; });
    event.currentTarget.removeAttribute("aria-busy");
    button.textContent = "ส่งคำถามให้ AI";
  }
});

renderPromptPreview();

function exportStateData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `business-growth-data-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notify("ส่งออกข้อมูลเป็นไฟล์ JSON แล้ว");
  return true;
}

const resetStepContent = {
  1: {
    label: "ตรวจสอบคำสั่ง",
    title: "คุณต้องการคืนค่าเริ่มต้นใช่ไหม?",
    description: "คำสั่งนี้จะล้างข้อมูลธุรกิจในระบบทั้งหมด ระบบจะให้คุณตรวจสอบอีก 2 ขั้นก่อนดำเนินการ"
  },
  2: {
    label: "ป้องกันข้อมูลสูญหาย",
    title: "การคืนค่านี้จะไม่เก็บข้อมูลชุดเก่า",
    description: "แนะนำให้ส่งออกข้อมูลเป็นไฟล์ JSON ก่อน แต่ไม่บังคับ คุณสามารถกดถัดไปได้ทันที"
  },
  3: {
    label: "ยืนยันครั้งสุดท้าย",
    title: "เริ่มการคืนค่าข้อมูลเป็น Set Zero",
    description: "ลูกค้า Lead Package ดีล งานติดตาม ชื่อธุรกิจ และเป้ารายได้จะถูกล้างเป็นศูนย์ทั้งหมด"
  }
};

function setResetStep(step) {
  resetStep = Math.min(3, Math.max(1, step));
  const content = resetStepContent[resetStep];
  document.querySelector("#resetProgress").textContent = `ขั้น ${resetStep} จาก 3`;
  document.querySelector("#resetStepLabel").textContent = content.label;
  document.querySelector("#resetDialogTitle").textContent = content.title;
  document.querySelector("#resetStepDescription").textContent = content.description;
  document.querySelector("#resetStepCard").dataset.step = String(resetStep);
  const backButton = document.querySelector("#resetBack");
  const exportButton = document.querySelector("#resetExport");
  const nextButton = document.querySelector("#resetNext");
  const confirmButton = document.querySelector("#resetConfirm");
  backButton.textContent = resetStep === 1 ? "ยกเลิก" : "ย้อนกลับ";
  exportButton.hidden = resetStep !== 2;
  exportButton.textContent = resetExported ? "ส่งออกข้อมูลแล้ว" : "ส่งออกข้อมูล (ไม่บังคับ)";
  exportButton.disabled = resetExported;
  nextButton.hidden = resetStep === 3;
  nextButton.disabled = false;
  confirmButton.hidden = resetStep !== 3;
  requestAnimationFrame(() => document.querySelector("#resetDialogTitle").focus?.());
}

document.querySelector("#resetDemo").addEventListener("click", () => {
  resetExported = false;
  setResetStep(1);
  document.querySelector("#resetDialog").showModal();
});

document.querySelector("#resetBack").addEventListener("click", () => {
  if (resetStep === 1) return document.querySelector("#resetDialog").close();
  setResetStep(resetStep - 1);
});

document.querySelector("#resetNext").addEventListener("click", () => {
  setResetStep(resetStep + 1);
});

document.querySelector("#resetExport").addEventListener("click", () => {
  resetExported = exportStateData();
  setResetStep(2);
});

document.querySelector("#resetConfirm").addEventListener("click", () => {
  if (resetStep !== 3) return;
  state = createZeroState();
  if (!saveState()) return;
  selectedLeadIds.clear();
  document.querySelector("#resetDialog").close();
  renderAll();
  resetCustomerFormDefaults();
  showView("dashboard", { focusHeading: true });
  notify("Set Zero เรียบร้อย ข้อมูลธุรกิจทั้งหมดเริ่มต้นที่ศูนย์");
});

document.querySelector("#exportData").addEventListener("click", exportStateData);

const importCollectionLabels = {
  state: "ข้อมูลสำรองทั้งระบบ",
  customers: "ลูกค้าและ Lead",
  products: "สินค้า / Package / ข้อเสนอ",
  deals: "ดีลและ Pipeline",
  tasks: "งานติดตาม"
};

function importPreviewMarkup(plan) {
  if (plan.kind === "state") {
    const imported = plan.importedState;
    return `<div class="import-state-grid">${["customers", "leads", "products", "deals", "tasks"].map((key) =>
      `<span><strong>${escapeHTML(importCollectionLabels[key] || key)}</strong><b>${escapeHTML(imported[key].length)}</b> รายการ</span>`
    ).join("")}</div>`;
  }
  if (!plan.records.length) return '<div class="empty-state">ยังไม่มีแถวที่พร้อมนำเข้า กรุณาเลือกประเภทข้อมูลอื่นหรือตรวจหัวตาราง</div>';
  const hiddenFields = new Set(["id", "avatar", "solutionPackageId", "productId", "customerId", "businessCategory"]);
  const headers = Object.keys(plan.records[0]).filter((key) => !hiddenFields.has(key)).slice(0, 6);
  const rows = plan.records.slice(0, 5).map((record) => `<tr>${headers.map((key) => `<td>${escapeHTML(record[key] ?? "-")}</td>`).join("")}</tr>`);
  return table(headers, rows);
}

function refreshImportPlan() {
  if (!importSession) return;
  const collectionSelect = document.querySelector("#importCollection");
  const sheetSelect = document.querySelector("#importSheet");
  let parsed = importSession.parsed;
  if (parsed.kind === "rows") {
    const sheet = parsed.sheets[Number(sheetSelect.value) || 0] || parsed.sheets[0];
    parsed = { ...parsed, rows: sheet?.rows || [] };
  }
  const plan = buildImportPlan(parsed, {
    collection: parsed.kind === "state" ? "auto" : collectionSelect.value,
    businessProfile: state.businessProfile,
    state
  });
  importSession.plan = plan;
  const detectedText = parsed.kind === "state" ? "ระบบจะใช้ข้อมูลชุดนี้แทนข้อมูลปัจจุบัน" : collectionSelect.value === "auto" ? "ตรวจจับอัตโนมัติ" : "เลือกโดยผู้ใช้";
  document.querySelector("#importPlanSummary").innerHTML = `<div><span>รูปแบบที่พบ</span><strong>${escapeHTML(importCollectionLabels[plan.collection])}</strong></div><div><span>พร้อมนำเข้า</span><strong>${plan.kind === "state" ? "ทั้งระบบ" : `${plan.records.length} รายการ`}</strong></div><div><span>วิธี Mapping</span><strong>${escapeHTML(detectedText)}</strong></div>`;
  document.querySelector("#importPreview").innerHTML = importPreviewMarkup(plan);
  const warnings = [
    ...(importSession.parsed.warnings || []).map((warning) => typeof warning === "string" ? warning : warning.message).filter(Boolean),
    ...(plan.rejected || []).slice(0, 3).map((item) => `แถว ${item.row}: ${item.reason}`)
  ];
  document.querySelector("#importWarning").textContent = warnings.length ? warnings.join(" · ") : "ระบบจะรวมข้อมูลซ้ำด้วยเบอร์โทรลูกค้าหรือชื่อ Package และอัปเดต Dashboard หลังยืนยัน";
  document.querySelector("#importConfirm").disabled = plan.kind !== "state" && plan.records.length === 0;
}

function openImportReview(parsed, file) {
  importSession = { parsed, file, plan: null };
  const collectionSelect = document.querySelector("#importCollection");
  const sheetSelect = document.querySelector("#importSheet");
  collectionSelect.value = "auto";
  collectionSelect.disabled = parsed.kind === "state";
  sheetSelect.innerHTML = parsed.kind === "state"
    ? '<option value="0">ข้อมูลสำรองทั้งระบบ</option>'
    : parsed.sheets.map((sheet, index) => `<option value="${index}">${escapeHTML(sheet.name)} · ${sheet.rows.length} แถว</option>`).join("");
  sheetSelect.disabled = parsed.kind === "state" || parsed.sheets.length <= 1;
  document.querySelector("#importFileSummary").innerHTML = `<span><svg class="ui-icon" aria-hidden="true"><use href="/icons.svg?v=18#clipboard"></use></svg><strong>${escapeHTML(file.name)}</strong></span><span>${escapeHTML(parsed.format.toUpperCase())}</span><span>${escapeHTML(`${Math.max(1, Math.ceil(file.size / 1024))} KB`)}</span>`;
  refreshImportPlan();
  document.querySelector("#importDialog").showModal();
}

function closeImportDialog() {
  document.querySelector("#importDialog").close();
  importSession = null;
}

document.querySelector("#importData").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    notify(`กำลังอ่านและวิเคราะห์ ${file.name}`);
    const parsed = await parseImportFile(file, { xlsx: globalThis.XLSX, mammoth: globalThis.mammoth });
    if (parsed.kind === "rows" && !parsed.rows.length) throw new Error("ไม่พบแถวข้อมูลที่อ่านได้จากไฟล์นี้");
    openImportReview(parsed, file);
  } catch (error) {
    notify(`นำเข้าไม่สำเร็จ: ${error.message || "รูปแบบไฟล์ไม่ถูกต้อง"}`);
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#importCollection").addEventListener("change", refreshImportPlan);
document.querySelector("#importSheet").addEventListener("change", refreshImportPlan);
document.querySelector("#importClose").addEventListener("click", closeImportDialog);
document.querySelector("#importCancel").addEventListener("click", closeImportDialog);
document.querySelector("#importConfirm").addEventListener("click", () => {
  if (!importSession?.plan) return;
  const previousState = clone(state);
  const result = applyImportPlan(state, importSession.plan);
  state = normalizeState(result.state);
  if (!saveState()) return;
  const collection = importSession.plan.collection;
  selectedLeadIds.clear();
  closeImportDialog();
  renderAll();
  resetCustomerFormDefaults();
  const target = collection === "state" ? "dashboard" : collection;
  showView(target, { focusHeading: true });
  const resultText = result.stats.replacedState
    ? "นำเข้าข้อมูลสำรองทั้งระบบแล้ว"
    : `นำเข้าแล้ว ${result.stats.created} รายการ อัปเดตข้อมูลเดิม ${result.stats.updated} รายการ${result.stats.rejected ? ` ข้าม ${result.stats.rejected} แถว` : ""}`;
  registerUndo(resultText, () => { state = normalizeState(clone(previousState)); });
});

document.addEventListener("keydown", (event) => {
  const isFormControl = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && lastUndoAction && !isFormControl) {
    event.preventDefault();
    document.querySelector("#toastUndo").click();
    return;
  }
  if (event.key === "/" && !isFormControl) {
    event.preventDefault();
    showView("customers");
    document.querySelector("#customerSearch").focus();
  }
});

window.addEventListener("hashchange", () => showView(location.hash.slice(1), { historyMode: "none" }));

function setDefaultDueDate() {
  const input = document.querySelector('input[name="dueDate"]');
  input.value = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

setDefaultDueDate();
renderAll();
showView(location.hash.slice(1) || "dashboard/owner", { historyMode: "replace" });
