// ค่าคงที่และข้อมูลตั้งต้นของโดเมนธุรกิจ แยกออกจาก app.js เพื่อให้ทดสอบได้โดยไม่ต้องมี DOM
//
// ไฟล์นี้ต้องไม่มีการอ้างถึง document, window, localStorage หรือ Intl ใด ๆ
// เพราะ scripts/check-app-model.mjs import ไฟล์นี้ตรง ๆ ใน Node ที่ไม่มี DOM
// ถ้าเผลอใส่โค้ดที่แตะ browser API เข้ามา ชุดตรวจจะพังทันที ไม่ใช่ไปพังตอน runtime

// ต้องประกาศไว้บนสุดเพราะ seedData ด้านล่างอ้างค่านี้ตอน evaluate module
export const SCHEMA_VERSION = 8;

export const businessModes = {
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

export const businessCatalogs = {
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

export const businessCategories = {
  creator: "Creator / ธุรกิจออนไลน์",
  service: "บริการ / ที่ปรึกษา",
  retail: "ร้านค้า / Retail",
  restaurant: "ร้านอาหาร / คาเฟ่",
  health: "สุขภาพ / คลินิก",
  education: "การศึกษา / Training",
  factory: "โรงงาน / Wholesale",
  property: "อสังหาริมทรัพย์"
};

export const pipelineModeLabels = {
  online: "Online · Social / Website / Marketplace",
  onsite: "Onsite · นัดหมาย / หน้าสาขา",
  wholesale: "Wholesale · B2B / ตัวแทน / องค์กร",
  retail: "Retail · หน้าร้าน / POS / สมาชิก"
};

export const avatarPresets = {
  creator: { code: "ON", label: "Online Creator", tone: "violet", icon: "globe" },
  service: { code: "SV", label: "Professional Service", tone: "teal", icon: "handshake" },
  retail: { code: "RT", label: "Retail Store", tone: "orange", icon: "store" },
  restaurant: { code: "FD", label: "Food & Cafe", tone: "red", icon: "shopping-bag" },
  health: { code: "HC", label: "Health & Clinic", tone: "blue", icon: "target" },
  education: { code: "ED", label: "Education", tone: "indigo", icon: "users" },
  factory: { code: "WH", label: "Wholesale & Factory", tone: "slate", icon: "warehouse" },
  property: { code: "RE", label: "Real Estate", tone: "gold", icon: "map-pin" }
};

export const contactChannelIcons = {
  Facebook: "facebook", "LINE OA": "message", Website: "globe", Marketplace: "shopping-bag",
  "Walk-in": "map-pin", "หน้าร้าน / POS": "store", "โทรศัพท์": "phone",
  "ตัวแทนจำหน่าย": "warehouse", "Google Form": "clipboard", Event: "calendar", Referral: "users"
};
export const contactSources = Object.keys(contactChannelIcons);

export const roleIcons = { owner: "crown", sales: "handshake", marketing: "megaphone", ops: "settings" };

export const leadStatuses = ["New Lead", "Contacted", "Interested", "Proposal Sent"];
export const dealStages = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
export const productCategories = ["สินค้า", "บริการ", "Package", "Subscription", "Bundle"];
export const taskStatuses = ["todo", "in_progress", "done", "overdue"];
export const leadStatusLabels = { "New Lead": "ลูกค้าใหม่", Contacted: "ติดต่อแล้ว", Interested: "สนใจ", "Proposal Sent": "ส่งข้อเสนอแล้ว" };
export const dealStageLabels = {
  New: "รับโอกาสธุรกิจใหม่",
  Qualified: "ตรวจคุณภาพและความต้องการ",
  Proposal: "ออกแบบและส่งข้อเสนอ",
  Negotiation: "เจรจาเพื่อการตัดสินใจ",
  Won: "ชนะดีล / เริ่มส่งมอบ",
  Lost: "ไม่เดินหน้าต่อ"
};
export const dealStageGroups = [
  ["กำลังพัฒนาดีล", ["New", "Qualified", "Proposal", "Negotiation"]],
  ["ผลลัพธ์ของดีล", ["Won", "Lost"]]
];
export const taskStatusLabels = { todo: "รอดำเนินการ", in_progress: "กำลังทำ", done: "เสร็จแล้ว", overdue: "เลยกำหนด" };
export const priorityLabels = { High: "สูง", Medium: "ปานกลาง", Low: "ต่ำ" };
export const marketingPackages = [
  { name: "Marketing Starter", price: 15000, description: "วางแผนช่องทางและ Content 30 วัน" },
  { name: "Content Growth", price: 25000, description: "ระบบผลิต Content และวัดผลรายเดือน" },
  { name: "Lead Generation", price: 35000, description: "แคมเปญหาลูกค้าและระบบเก็บ Lead" },
  { name: "Full Funnel Solution", price: 59000, description: "วางระบบ Marketing + CRM ครบ Funnel" }
];

export const seedData = {
  meta: { updatedAt: "2026-07-22T00:00:00.000Z" },
  // ต้องประกาศ schemaVersion ปัจจุบันไว้เสมอ ไม่งั้น normalizeState จะเข้าใจว่าข้อมูล
  // ตั้งต้นเป็นข้อมูลเก่ารุ่นก่อน schema 4 แล้วรันขั้นตอนแปลงชื่อ Package ย้อนหลังใส่
  // ผลคือลูกค้าตั้งต้นทั้ง 4 คนถูกเปลี่ยนไปอ้างชื่อ Package ที่ไม่มีอยู่ใน products
  // ทำให้ solutionPackageId ว่างทั้งหมด และการแก้ Package ไม่กระทบลูกค้าคนไหนเลย
  // ตั้งแต่เปิดแอปครั้งแรก
  schemaVersion: SCHEMA_VERSION,
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
    // productId ต้องระบุไว้ ไม่งั้นดีลตั้งต้นทั้งสามใบจะไม่ผูกกับข้อเสนอใด ทำให้หน้า
    // Pipeline แสดงช่องข้อเสนอว่างตั้งแต่เปิดแอปครั้งแรก และการแก้ราคา/ชื่อข้อเสนอ
    // จะไม่สะท้อนไปที่ดีล ค่า value ตรงกับราคาสินค้าที่อ้างถึงพอดี
    { id: "d1", customerId: "c1", productId: "p1", name: "Public course enrollment", value: 5900, stage: "Won", probability: 100 },
    { id: "d2", customerId: "c2", productId: "p2", name: "Corporate training batch 1", value: 85000, stage: "Proposal", probability: 65 },
    { id: "d3", customerId: "c3", productId: "p3", name: "Monthly consulting package", value: 45000, stage: "Negotiation", probability: 75 }
  ],
  tasks: [
    { id: "t1", title: "โทรติดตามข้อเสนอ บริษัท ABC", owner: "ทีมขาย", dueDate: "2026-07-04", priority: "High", status: "todo" },
    { id: "t2", title: "ส่งตัวอย่าง curriculum ให้คุณวราภรณ์", owner: "Uncle Tung AI", dueDate: "2026-07-04", priority: "High", status: "in_progress" },
    { id: "t3", title: "ออกใบแจ้งหนี้คอร์ส", owner: "ฝ่ายดูแลระบบ", dueDate: "2026-07-03", priority: "Medium", status: "done" }
  ]
};


export const roleViews = {
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

export const STORAGE_KEY = "business-growth-dashboard-demo";

// API key ของผู้ใช้ต้องอยู่คนละ storage entry กับ STORAGE_KEY เด็ดขาด (ADR-001 ข้อ 4.5)
// เหตุผลรูปธรรม: ปุ่ม "ส่งออกข้อมูล" และขั้นตอน Set Zero อ่าน/เขียน STORAGE_KEY
// ทั้งก้อน ถ้าเก็บ key ไว้ในนั้น ผู้ใช้ที่กด Export แล้วส่งไฟล์ให้ที่ปรึกษาหรือโพสต์
// ในกลุ่ม Workshop จะยกกุญแจบัญชีของตัวเองให้คนอื่นไปพร้อมไฟล์ทันที
export const AI_KEY_STORAGE_KEY = "bgc-ai-key";
// ชื่อ model ไม่ใช่ความลับ จึงเก็บใน localStorage เสมอเพื่อให้ค่าที่ผู้ใช้แก้เองไม่หาย
// ตอนปิดแท็บ (ต่างจาก key ที่ default เป็น sessionStorage)
export const AI_MODEL_STORAGE_KEY = "bgc-ai-model";
export const REVENUE_TARGET = 100000;
export const VALID_VIEWS = ["dashboard", "customers", "crm", "products", "deals", "tasks", "insights", "ai"];
