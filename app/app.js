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
    { id: "p1", name: "AI Fundamentals Course", category: "Course", price: 5900, cost: 1500, status: "active" },
    { id: "p2", name: "Corporate AI Training", category: "Training", price: 85000, cost: 25000, status: "active" },
    { id: "p3", name: "AI Consulting Package", category: "Consulting", price: 45000, cost: 12000, status: "active" },
    { id: "mp1", name: "Marketing Starter", category: "Marketing Solution", price: 15000, cost: 3500, status: "active" },
    { id: "mp2", name: "Content Growth", category: "Marketing Solution", price: 25000, cost: 7000, status: "active" },
    { id: "mp3", name: "Lead Generation", category: "Marketing Solution", price: 35000, cost: 11000, status: "active" },
    { id: "mp4", name: "Full Funnel Solution", category: "Marketing Solution", price: 59000, cost: 18000, status: "active" }
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
    return isValid ? normalizeState(parsed) : clone(seedData);
  } catch {
    return clone(seedData);
  }
}

function normalizeState(data) {
  data.businessProfile = {
    ...clone(seedData.businessProfile),
    ...(data.businessProfile || {})
  };
  const mode = businessModes[data.businessProfile.businessMode] || businessModes.online;
  const catalog = businessCatalogs[data.businessProfile.businessMode] || businessCatalogs.online;
  const legacyPackageNames = marketingPackages.map((item) => item.name);
  const needsLegacyMapping = Number(data.schemaVersion || 0) < 4;
  data.customers = data.customers.map((customer, index) => {
    const solutionPackage = needsLegacyMapping && legacyPackageNames.includes(customer.solutionPackage)
      ? catalog[Math.max(0, legacyPackageNames.indexOf(customer.solutionPackage))]?.name || catalog[0].name
      : customer.solutionPackage || catalog[0].name;
    const matchedMode = Object.entries(businessCatalogs)
      .find(([, offers]) => offers.some((offer) => offer.name === solutionPackage))?.[0];
    return {
      ...customer,
      solutionPackage,
      businessMode: customer.businessMode || matchedMode || "online",
      avatar: customer.avatar || "",
      avatarPreset: customer.avatarPreset || data.businessProfile.businessCategory || "service",
      customerType: customer.customerType || mode.customerTypes[Math.min(index, mode.customerTypes.length - 1)]
    };
  });
  const existingNames = new Set(data.products.map((product) => product.name));
  seedData.products.filter((product) => product.id.startsWith("mp") && !existingNames.has(product.name))
    .forEach((product) => data.products.push(clone(product)));
  catalog.filter((product) => !existingNames.has(product.name)).forEach((product) => data.products.push({
    ...clone(product), id: uid("p"), status: "active", businessMode: data.businessProfile.businessMode
  }));
  data.schemaVersion = 5;
  return data;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
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

function notify(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
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
  return Math.max(1000, Number(state.businessProfile?.revenueTarget) || REVENUE_TARGET);
}

function currentBusinessMode() {
  return businessModes[state.businessProfile?.businessMode] || businessModes.online;
}

function currentBusinessCatalog() {
  return businessCatalogs[state.businessProfile?.businessMode] || businessCatalogs.online;
}

function iconMarkup(name, className = "ui-icon") {
  return `<svg class="${escapeHTML(className)}" aria-hidden="true" focusable="false"><use href="/icons.svg#${escapeHTML(name)}"></use></svg>`;
}

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
      ["รายได้ที่ปิดได้", currency(data.revenue), "เทียบเป้ารายได้รอบนี้", data.revenue >= revenueTarget() ? "success" : "", "deals", "THB"],
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
      <div class="bar-track"><div class="bar-fill" style="width:${(value / max) * 100}%; background:${color}"></div></div>
    </div>
  `).join("");
}

function renderBusinessProfile() {
  const profile = state.businessProfile;
  const mode = businessModes[profile.businessMode] || businessModes.online;
  const categoryLabel = businessCategories[profile.businessCategory] || businessCategories.service;
  const form = document.querySelector("#businessProfileForm");
  document.body.dataset.businessMode = profile.businessMode;
  document.querySelector("#sidebarBusinessName").textContent = profile.businessName;
  document.querySelector("#sidebarBusinessMode").textContent = `${mode.label} · ${categoryLabel}`;
  document.querySelector("#businessAvatarPreview").innerHTML = avatarPresetMarkup(profile.businessAvatar, "large", `โปรไฟล์ ${profile.businessName}`);
  document.querySelector("#businessProfileSummary").textContent = `${mode.description} ระบบจะปรับ KPI, Customer Journey และคำแนะนำตามบริบทนี้`;
  document.querySelector("#businessModeBadge").textContent = mode.label;
  document.querySelector("#businessCategoryBadge").textContent = categoryLabel;
  document.querySelector("#businessCatalogPreview").innerHTML = currentBusinessCatalog().map((item) =>
    `<span class="catalog-chip"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(currency(item.price))}</small></span>`
  ).join("");

  document.querySelector("#businessModeSelect").innerHTML = Object.entries(businessModes)
    .map(([value, item]) => `<option value="${escapeHTML(value)}" ${profile.businessMode === value ? "selected" : ""}>${escapeHTML(item.label)}</option>`).join("");
  document.querySelector("#businessCategorySelect").innerHTML = Object.entries(businessCategories)
    .map(([value, label]) => `<option value="${escapeHTML(value)}" ${profile.businessCategory === value ? "selected" : ""}>${escapeHTML(label)}</option>`).join("");
  document.querySelector("#businessAvatarSelect").innerHTML = Object.entries(avatarPresets)
    .map(([value, item]) => `<option value="${escapeHTML(value)}" ${profile.businessAvatar === value ? "selected" : ""}>${escapeHTML(item.code)} · ${escapeHTML(item.label)}</option>`).join("");
  form.elements.businessName.value = profile.businessName;
  form.elements.revenueTarget.value = profile.revenueTarget;
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
  const progress = Math.min((data.revenue / target) * 100, 100);
  const remaining = Math.max(target - data.revenue, 0);
  renderKpis();
  renderBusinessProfile();
  renderBusinessViewSwitch();
  renderRoleWorkspace(data);
  document.querySelector("#pipelineBadge").textContent = currency(data.pipelineValue);
  renderJourneyFlow();
  renderPriorityLeads();
  renderSignals(data);

  document.querySelector("#goalTitle").textContent = `${state.businessProfile.businessName}: เป้ารายได้ ${currency(target)}`;
  document.querySelector("#goalCurrent").textContent = `${currency(data.revenue)} / ${currency(target)}`;
  document.querySelector("#goalPercent").textContent = percent(progress);
  document.querySelector("#goalProgress").style.width = `${progress}%`;
  document.querySelector(".goal-meter").setAttribute("aria-valuenow", String(Math.round(progress)));
  document.querySelector("#goalMessage").textContent = remaining
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
          const offer = [...currentBusinessCatalog(), ...state.products].find((item) => item.name === customer?.solutionPackage);
          return sum + Number(deal?.value || offer?.price || 0);
        }, 0);
    return { key, label, detail, count, value };
  });
  const maxCount = Math.max(...stageData.map((item) => item.count), 1);
  const bottleneck = [...stageData.slice(0, -1)].sort((a, b) => b.count - a.count)[0];

  document.querySelector("#journeyTitle").textContent = `Owner Customer Journey · ${mode.label}`;
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
    <div><small>Owner decision</small><strong>${staleLeads ? `มี ${staleLeads} Lead เกินกำหนดติดตาม` : `คอขวดอยู่ที่ “${escapeHTML(bottleneck?.label || "ยังไม่มีข้อมูล")}”`}</strong><p>${staleLeads ? "มอบหมายเจ้าของงานและกำหนดวันติดตามใหม่ก่อนดู Lead ชุดถัดไป" : `มี ${bottleneck?.count || 0} รายในช่วงนี้ เปิด CRM เพื่อกำหนดขั้นตอนถัดไป`}</p></div>
    <button type="button" class="small-button" data-jump="${staleLeads ? "tasks" : "crm"}">${staleLeads ? "จัดการงานค้าง" : "เปิด CRM Board"}</button>`;
  document.querySelector("#journeyFlow").innerHTML = stageData.map((item, index) => {
    const width = Math.max(item.count ? 12 : 0, (item.count / maxCount) * 100);
    return `<button class="journey-step ${item.count ? "has-data" : ""}" data-jump="${item.key === "Won" ? "deals" : "crm"}">
      <span class="journey-stage-icon">${iconMarkup(index === 4 ? "target" : mode.icon)}</span>
      <span class="journey-stage-copy"><span class="journey-number">ขั้น ${index + 1} · ${escapeHTML(item.detail)}</span><strong>${escapeHTML(item.label)}</strong></span>
      <span class="journey-stage-metrics"><b>${item.count}</b><small>${percent((item.count / journeyBase) * 100)} ของ Journey</small></span>
      <span class="journey-bar" aria-hidden="true"><i style="width:${width}%"></i></span>
      <span class="journey-stage-value">${escapeHTML(currency(item.value))}</span>
    </button>`;
  }).join("");
}

function renderPriorityLeads() {
  const leads = [...state.leads]
    .filter((lead) => lead.status !== "Proposal Sent" || lead.nextFollowUp <= today())
    .sort((a, b) => b.leadScore - a.leadScore || a.nextFollowUp.localeCompare(b.nextFollowUp))
    .slice(0, 3);
  document.querySelector("#priorityLeadBadge").textContent = leads.length ? `${leads.length} รายการสำคัญ` : "ไม่มีรายการเร่งด่วน";
  document.querySelector("#priorityLeads").innerHTML = leads.map((lead) => {
    const customer = customerById(lead.customerId);
    const overdue = lead.nextFollowUp < today();
    return `<article class="priority-item"><div class="lead-profile">${avatarMarkup(customer, "small")}<div><strong>${escapeHTML(customer?.fullName || "-")}</strong><span>${escapeHTML(customer?.solutionPackage || "-")}</span></div></div><div class="priority-meta"><span class="score-tag">${lead.leadScore} คะแนน</span><small class="${overdue ? "danger" : ""}">${overdue ? "เกินกำหนด" : `ติดตาม ${lead.nextFollowUp}`}</small></div><button class="small-button" data-task-from-lead="${escapeHTML(lead.id)}">สร้างงาน</button></article>`;
  }).join("") || `<div class="empty-state">Lead ทุกคนมีแผนติดตามแล้ว</div>`;
}

function renderSignals(data) {
  const proposalLeads = state.leads.filter((lead) => lead.status === "Proposal Sent").length;
  const sourceDeals = sumDealsBySource();
  const sourceValue = sourceDeals[data.topSource] || 0;
  const signals = [
    ["ช่องทางที่คุ้มสุด", data.topSource, sourceValue ? `${currency(sourceValue)} ใน pipeline` : "ยังไม่มีมูลค่า Deal", "customers"],
    ["ข้อเสนอที่ต้องดู", proposalLeads, proposalLeads ? "Lead รอการตัดสินใจ" : "ยังไม่มีข้อเสนอค้าง", "crm"],
    ["งานที่เสี่ยงหลุด", data.overdueTasks, data.overdueTasks ? "งานเกินกำหนด ควรจัดการวันนี้" : "ไม่มีงานเกินกำหนด", "tasks"]
  ];
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
      const recommended = currentBusinessCatalog().some((item) => item.name === customer.solutionPackage);
      const customerMode = businessModes[customer.businessMode] || businessModes.online;
      return `<tr><td><div class="customer-cell">${avatarMarkup(customer, "small")}<div><strong>${escapeHTML(customer.fullName)}</strong><span>${escapeHTML(customer.interest)}</span></div></div></td><td><span class="customer-type-pill">${escapeHTML(customerMode.label)} · ${escapeHTML(customer.customerType || "ยังไม่จัดกลุ่ม")}</span></td><td><a class="contact-link" href="tel:${escapeHTML(phone.replace(/[^0-9+]/g, ""))}" aria-label="โทรหา ${escapeHTML(customer.fullName)}">${escapeHTML(phone)}</a></td><td>${contactBadge(customer.source)}</td><td><span class="package-pill ${recommended ? "package-pill--fit" : ""}">${escapeHTML(customer.solutionPackage)}</span></td><td>${escapeHTML(leadStatusLabels[lead?.status] || "-")}</td><td><div class="table-actions"><button class="row-action" data-edit-record="customer:${escapeHTML(customer.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="customer:${escapeHTML(customer.id)}">ลบ</button></div></td></tr>`;
    })
  );
}

function renderCrm() {
  document.querySelector("#crmBoard").innerHTML = leadStatuses.map((status) => {
    const leads = state.leads.filter((lead) => lead.status === status);
    return `
      <section class="pipeline-col">
        <h2>${escapeHTML(leadStatusLabels[status])} <span class="badge">${leads.length}</span></h2>
        ${leads.map((lead) => leadCard(lead)).join("") || `<p class="muted">ยังไม่มี lead</p>`}
      </section>
    `;
  }).join("");
}

function leadCard(lead) {
  const customer = customerById(lead.customerId);
  const currentIndex = leadStatuses.indexOf(lead.status);
  const nextStatus = leadStatuses[Math.min(currentIndex + 1, leadStatuses.length - 1)];
  return `
    <article class="lead-card">
      <div class="lead-profile">
        ${avatarMarkup(customer)}
        <div>
          <strong>${escapeHTML(customer?.fullName || "-")}</strong>
          ${contactBadge(customer?.source || "-")}
        </div>
      </div>
      <span class="package-pill">${escapeHTML(customer?.solutionPackage || "ยังไม่เลือกแพ็กเกจ")}</span>
      <span>${escapeHTML(customer?.interest || "-")}</span>
      <span>คะแนน Lead ${escapeHTML(lead.leadScore)} · ติดตาม ${escapeHTML(lead.nextFollowUp)}</span>
      <div class="lead-actions">
        <button class="row-action" data-advance-lead="${escapeHTML(lead.id)}" ${lead.status === nextStatus ? "disabled" : ""}>ขั้นถัดไป</button>
        <button class="row-action" data-deal-from-lead="${escapeHTML(lead.id)}">สร้างโอกาสขาย</button>
        <button class="row-action" data-task-from-lead="${escapeHTML(lead.id)}">สร้างงานติดตาม</button>
      </div>
    </article>
  `;
}

function renderProducts() {
  document.querySelector("#productTable").innerHTML = table(
    ["สินค้า/บริการ/ข้อเสนอ", "ประเภท", "ใช้กับธุรกิจ", "ราคาขาย", "ต้นทุน", "กำไรขั้นต้น", "สถานะ", "จัดการ"],
    state.products.map((product) => {
      const margin = Number(product.price) - Number(product.cost);
      const modeLabel = product.businessMode ? businessModes[product.businessMode]?.label || "ทั่วไป" : "ทุกธุรกิจ";
      return `<tr><td><strong>${escapeHTML(product.name)}</strong></td><td>${escapeHTML(product.category)}</td><td><span class="context-badge context-badge--table">${escapeHTML(modeLabel)}</span></td><td>${escapeHTML(currency(product.price))}</td><td>${escapeHTML(currency(product.cost))}</td><td class="success">${escapeHTML(currency(margin))}</td><td>${product.status === "active" ? "เปิดขาย" : "ปิดขาย"}</td><td><div class="table-actions"><button class="row-action" data-edit-record="product:${escapeHTML(product.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="product:${escapeHTML(product.id)}">ลบ</button></div></td></tr>`;
    })
  );
}

function renderDeals() {
  document.querySelector("#dealCustomerSelect").innerHTML = state.customers.map((customer) =>
    `<option value="${escapeHTML(customer.id)}">${escapeHTML(customer.fullName)}</option>`
  ).join("");

  document.querySelector("#dealTable").innerHTML = table(
    ["ดีลธุรกิจ", "ลูกค้า", "มูลค่า", "สถานะดีล", "โอกาสสำเร็จ", "จัดการ"],
    state.deals.map((deal) => `
      <tr>
        <td>${escapeHTML(deal.name)}</td>
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
}

function renderPackageOptions() {
  const select = document.querySelector("#customerPackageSelect");
  const selected = select.value;
  const recommended = currentBusinessCatalog();
  const recommendedNames = new Set(recommended.map((item) => item.name));
  const otherProducts = state.products.filter((item) => item.status === "active" && !recommendedNames.has(item.name));
  select.innerHTML = `
    <optgroup label="แนะนำสำหรับ ${escapeHTML(currentBusinessMode().label)}">
      ${recommended.map((item) => `<option value="${escapeHTML(item.name)}" ${selected === item.name ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(currency(item.price))}</option>`).join("")}
    </optgroup>
    ${otherProducts.length ? `<optgroup label="สินค้าและบริการอื่นในระบบ">${otherProducts.map((item) => `<option value="${escapeHTML(item.name)}" ${selected === item.name ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(currency(item.price))}</option>`).join("")}</optgroup>` : ""}
  `;
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

function roleInsight(data) {
  if (activeRole === "sales") return `ฝ่ายขาย: มี ${data.openDeals} โอกาสขาย มูลค่ารวม ${currency(data.pipelineValue)}`;
  if (activeRole === "marketing") return `การตลาด: ${data.topSource} สร้าง Lead สูงสุด ควรตรวจคุณภาพก่อนเพิ่มงบ`;
  if (activeRole === "ops") return `ทีมงาน: มี ${data.pendingTasks} งานค้าง และ ${data.overdueTasks} งานเลยกำหนด`;
  return `เจ้าของ: ทำได้ ${percent((data.revenue / revenueTarget()) * 100)} ของเป้ารายได้`;
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
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
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
  if (options.scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelector("#pageAction").addEventListener("click", (event) => showView(event.currentTarget.dataset.target));

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
  saveState();
  renderAll();
  document.querySelector("#customerPackageSelect").value = currentBusinessCatalog()[0].name;
  document.querySelector("#customerTypeSelect").value = currentBusinessMode().customerTypes[0];
  showView(`dashboard/${activeRole}`, { scroll: false });
  notify(`เปลี่ยน Dashboard เป็นธุรกิจ ${currentBusinessMode().label} แล้ว`);
});

document.querySelector("#businessProfileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.businessProfile = {
    businessName: form.get("businessName").trim(),
    businessMode: form.get("businessMode"),
    businessCategory: form.get("businessCategory"),
    businessAvatar: form.get("businessAvatar"),
    revenueTarget: Math.max(1000, Number(form.get("revenueTarget")) || REVENUE_TARGET)
  };
  saveState();
  renderAll();
  document.querySelector("#customerPackageSelect").value = currentBusinessCatalog()[0].name;
  document.querySelector("#customerTypeSelect").value = currentBusinessMode().customerTypes[0];
  document.querySelector(".business-context").open = false;
  notify("บันทึก Business Profile และปรับ Dashboard แล้ว");
});

document.querySelector("#installBusinessCatalog").addEventListener("click", () => {
  const existingNames = new Set(state.products.map((product) => product.name));
  const additions = currentBusinessCatalog().filter((item) => !existingNames.has(item.name));
  additions.forEach((item) => state.products.push({
    id: uid("p"),
    name: item.name,
    category: item.category,
    price: item.price,
    cost: item.cost,
    status: "active",
    businessMode: state.businessProfile.businessMode
  }));
  saveState();
  renderAll();
  notify(additions.length ? `เพิ่มข้อเสนอแนะนำ ${additions.length} รายการแล้ว` : "ชุดข้อเสนอแนะนำอยู่ในระบบแล้ว");
});

document.querySelector("#businessCategorySelect").addEventListener("change", (event) => {
  document.querySelector("#businessAvatarSelect").value = event.target.value;
  document.querySelector("#businessAvatarPreview").innerHTML = avatarPresetMarkup(event.target.value, "large", "ตัวอย่างรูปโปรไฟล์ธุรกิจ");
});

document.querySelector("#businessAvatarSelect").addEventListener("change", (event) => {
  document.querySelector("#businessAvatarPreview").innerHTML = avatarPresetMarkup(event.target.value, "large", "ตัวอย่างรูปโปรไฟล์ธุรกิจ");
});

function debounce(callback, delay = 140) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

document.querySelector("#customerSearch").addEventListener("input", debounce(renderCustomers));
document.querySelector("#customerSourceFilter").addEventListener("change", renderCustomers);

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
      ["solutionPackage", "ข้อเสนอที่สนใจ", "select", []], ["interest", "ความต้องการ", "text"]
    ]
  },
  product: {
    title: "แก้ไขแพ็กเกจ/บริการ", collection: "products",
    fields: [["name", "ชื่อแพ็กเกจ/บริการ", "text"], ["category", "ประเภท", "text"], ["price", "ราคาขาย", "number"], ["cost", "ต้นทุน", "number"], ["status", "สถานะ", "select", ["active", "inactive"]]]
  },
  deal: {
    title: "แก้ไขดีลธุรกิจ", collection: "deals",
    fields: [["name", "ชื่อดีลธุรกิจ", "text"], ["value", "มูลค่า", "number"], ["stage", "สถานะการพัฒนาดีล", "select", dealStages], ["probability", "โอกาสสำเร็จ (%)", "number"]]
  },
  task: {
    title: "แก้ไขงานติดตาม", collection: "tasks",
    fields: [["title", "งานที่ต้องทำ", "text"], ["owner", "ผู้รับผิดชอบ", "text"], ["dueDate", "กำหนดเสร็จ", "date"], ["priority", "ความสำคัญ", "select", ["High", "Medium", "Low"]], ["status", "สถานะ", "select", taskStatuses]]
  }
};

function recordFieldMarkup([name, label, type, options], record) {
  const value = record[name] ?? "";
  if (type === "select") {
    const labelMap = name === "stage" ? dealStageLabels : name === "status" ? { ...taskStatusLabels, active: "เปิดขาย", inactive: "ปิดขาย" } : name === "priority" ? priorityLabels : name === "avatarPreset" ? Object.fromEntries(Object.entries(avatarPresets).map(([key, item]) => [key, `${item.code} · ${item.label}`])) : {};
    const optionMarkup = name === "stage"
      ? dealStageOptionMarkup(String(value))
      : options.map((option) => `<option value="${escapeHTML(option)}" ${String(value) === String(option) ? "selected" : ""}>${escapeHTML(labelMap[option] || option)}</option>`).join("");
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
    if (field[0] === "customerType") return [field[0], currentBusinessMode().customerTypeLabel, field[2], currentBusinessMode().customerTypes];
    if (field[0] === "solutionPackage") return [field[0], field[1], field[2], [...new Set([...currentBusinessCatalog().map((item) => item.name), ...state.products.map((item) => item.name), record.solutionPackage])]];
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
  const related = type === "customer" ? " Lead และ Deal ที่เชื่อมกับลูกค้ารายนี้จะถูกลบด้วย" : "";
  if (!window.confirm(`ยืนยันลบรายการนี้หรือไม่?${related}`)) return;
  state[config.collection] = state[config.collection].filter((item) => item.id !== id);
  if (type === "customer") {
    state.leads = state.leads.filter((lead) => lead.customerId !== id);
    state.deals = state.deals.filter((deal) => deal.customerId !== id);
  }
  saveState();
  renderAll();
  notify("ลบรายการเรียบร้อยแล้ว");
}

document.querySelector("#recordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const config = recordConfigs[form.dataset.recordType];
  const record = config && state[config.collection].find((item) => item.id === form.dataset.recordId);
  if (!record) return;
  const values = new FormData(form);
  config.fields.forEach(([name, , type]) => {
    record[name] = type === "number" ? Number(values.get(name)) : values.get(name).trim();
  });
  if (config.collection === "deals") record.probability = record.stage === "Won" ? 100 : record.stage === "Lost" ? 0 : Math.min(100, Math.max(0, Number(record.probability)));
  saveState();
  renderAll();
  document.querySelector("#recordDialog").close();
  notify("บันทึกการแก้ไขแล้ว");
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.querySelector("#recordDialog").close()));

document.querySelector("#customerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const customerId = uid("c");
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
    solutionPackage: form.get("solutionPackage"),
    customerType: form.get("customerType"),
    businessMode: state.businessProfile.businessMode,
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
  event.currentTarget.reset();
  saveState();
  renderAll();
  notify("เพิ่มลูกค้าและสร้าง Lead แล้ว");
});

document.querySelector("#productForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.products.push({
    id: uid("p"),
    name: form.get("name").trim(),
    category: form.get("category").trim(),
    price: Number(form.get("price")),
    cost: Number(form.get("cost")),
    status: "active",
    businessMode: state.businessProfile.businessMode
  });
  event.currentTarget.reset();
  saveState();
  renderAll();
  notify("เพิ่มสินค้า/บริการแล้ว");
});

document.querySelector("#dealForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const stage = form.get("stage");
  state.deals.push({
    id: uid("d"),
    customerId: form.get("customerId"),
    name: form.get("name").trim(),
    value: Number(form.get("value")),
    stage,
    probability: stage === "Won" ? 100 : 50
  });
  event.currentTarget.reset();
  saveState();
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
  event.currentTarget.reset();
  setDefaultDueDate();
  saveState();
  renderAll();
  notify("เพิ่ม Task แล้ว");
});

document.addEventListener("change", (event) => {
  const dealId = event.target.dataset.dealStage;
  const taskId = event.target.dataset.taskStatus;

  if (dealId) {
    const deal = state.deals.find((item) => item.id === dealId);
    deal.stage = event.target.value;
    deal.probability = deal.stage === "Won" ? 100 : deal.stage === "Lost" ? 0 : deal.probability;
    saveState();
    renderAll();
    notify(`อัปเดต Deal เป็น ${deal.stage}`);
  }

  if (taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    task.status = event.target.value;
    saveState();
    renderAll();
    notify("อัปเดตสถานะ Task แล้ว");
  }
});

document.addEventListener("click", (event) => {
  const jumpTarget = event.target.closest("[data-jump]")?.dataset.jump;
  const leadId = event.target.dataset.advanceLead;
  const taskLeadId = event.target.dataset.taskFromLead;
  const dealLeadId = event.target.dataset.dealFromLead;
  const editRecord = event.target.dataset.editRecord;
  const deleteRecordRef = event.target.dataset.deleteRecord;

  if (jumpTarget) showView(jumpTarget);

  if (editRecord) {
    const [type, id] = editRecord.split(":");
    openRecordDialog(type, id);
  }

  if (deleteRecordRef) {
    const [type, id] = deleteRecordRef.split(":");
    deleteRecord(type, id);
  }

  if (leadId) {
    const lead = state.leads.find((item) => item.id === leadId);
    const currentIndex = leadStatuses.indexOf(lead.status);
    lead.status = leadStatuses[Math.min(currentIndex + 1, leadStatuses.length - 1)];
    saveState();
    renderAll();
    notify(`ย้าย Lead ไปขั้น ${lead.status}`);
  }

  if (taskLeadId) {
    const lead = state.leads.find((item) => item.id === taskLeadId);
    const customer = customerById(lead.customerId);
    state.tasks.push({
      id: uid("t"),
      title: `ติดตาม ${customer?.fullName || "ลูกค้า"} เรื่อง ${customer?.solutionPackage || "แพ็กเกจบริการ"}`,
      owner: lead.assignedTo,
      dueDate: lead.nextFollowUp,
      priority: lead.leadScore > 70 ? "High" : "Medium",
      status: "todo"
    });
    saveState();
    renderAll();
    showView("tasks");
    notify("สร้าง Follow-up task แล้ว");
  }

  if (dealLeadId) {
    const lead = state.leads.find((item) => item.id === dealLeadId);
    const customer = customerById(lead.customerId);
    const solution = [...currentBusinessCatalog(), ...state.products].find((item) => item.name === customer?.solutionPackage);
    showView("deals");
    document.querySelector("#dealCustomerSelect").value = customer.id;
    document.querySelector('#dealForm input[name="name"]').value = customer.solutionPackage || "Marketing Solution Package";
    document.querySelector('#dealForm input[name="value"]').value = solution?.price || 25000;
    notify("เตรียมข้อมูลโอกาสขายจาก CRM แล้ว กดบันทึกเพื่อยืนยัน");
  }
});

function analysisPayload() {
  return {
    focus: document.querySelector("#analysisFocus").value,
    businessProfile: state.businessProfile,
    targetRevenue: revenueTarget(),
    metrics: metrics(),
    customers: state.customers.map(({ id, fullName, source, solutionPackage, interest, createdAt }) => ({ id, fullName, source, solutionPackage, interest, createdAt })),
    leads: state.leads,
    deals: state.deals,
    tasks: state.tasks,
    packages: state.products,
    recommendedCatalog: currentBusinessCatalog()
  };
}

document.querySelector("#analyzeBusiness").addEventListener("click", async () => {
  const button = document.querySelector("#analyzeBusiness");
  const result = document.querySelector("#analysisResult");
  const status = document.querySelector("#analysisStatus");
  button.disabled = true;
  button.textContent = "AI กำลังวิเคราะห์...";
  status.textContent = "กำลังประมวลผล";
  result.classList.remove("empty-analysis");
  result.textContent = "กำลังอ่านข้อมูล Lead, โอกาสขาย, งานติดตาม และแพ็กเกจบริการ...";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(analysisPayload())
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "วิเคราะห์ไม่สำเร็จ");
    document.querySelector("#analysisTitle").textContent = "ข้อเสนอจาก AI สำหรับธุรกิจนี้";
    result.textContent = data.analysis;
    status.textContent = "วิเคราะห์แล้ว";
  } catch (error) {
    document.querySelector("#analysisTitle").textContent = "ยังเชื่อมต่อ AI ไม่สำเร็จ";
    result.textContent = error.message === "Failed to fetch"
      ? "กรุณาเปิด app ผ่าน server ด้วยคำสั่ง npm run dev แล้วลองอีกครั้ง"
      : error.message;
    status.textContent = "เกิดข้อผิดพลาด";
  } finally {
    button.disabled = false;
    button.textContent = "วิเคราะห์อีกครั้ง";
  }
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  if (!window.confirm("ต้องการล้างข้อมูลที่เพิ่มทั้งหมดและกลับไปใช้ข้อมูลตัวอย่างหรือไม่?")) return;
  state = normalizeState(clone(seedData));
  saveState();
  renderAll();
  showView("dashboard");
  notify("รีเซ็ตข้อมูลตัวอย่างแล้ว");
});

document.querySelector("#exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `business-growth-data-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notify("ส่งออกข้อมูลเป็นไฟล์ JSON แล้ว");
});

document.querySelector("#importData").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    const valid = ["customers", "leads", "products", "deals", "tasks"]
      .every((key) => Array.isArray(imported[key]));
    if (!valid) throw new Error("invalid schema");
    state = normalizeState(imported);
    saveState();
    renderAll();
    showView("dashboard");
    notify("นำเข้าข้อมูลเรียบร้อยแล้ว");
  } catch {
    notify("นำเข้าไม่สำเร็จ กรุณาใช้ไฟล์ JSON ที่ Export จาก app นี้");
  } finally {
    event.target.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
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
