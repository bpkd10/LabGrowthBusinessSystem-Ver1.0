const STORAGE_KEY = "business-growth-dashboard-demo";
const REVENUE_TARGET = 100000;
const VALID_VIEWS = ["dashboard", "customers", "crm", "products", "deals", "tasks", "ai"];

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
  customers: [
    { id: "c1", fullName: "สมชาย ใจดี", phone: "0811111111", source: "Facebook", solutionPackage: "Marketing Starter", interest: "ต้องการเริ่มทำ Content อย่างเป็นระบบ", avatar: "", createdAt: "2026-07-01" },
    { id: "c2", fullName: "วราภรณ์ ดีมาก", phone: "0822222222", source: "LINE OA", solutionPackage: "Lead Generation", interest: "ต้องการเพิ่มจำนวนลูกค้าองค์กร", avatar: "", createdAt: "2026-07-01" },
    { id: "c3", fullName: "บริษัท ABC จำกัด", phone: "0833333333", source: "Website", solutionPackage: "Full Funnel Solution", interest: "ต้องการเชื่อม Marketing กับ CRM", avatar: "", createdAt: "2026-07-02" },
    { id: "c4", fullName: "คลินิก Bright Care", phone: "0844444444", source: "Referral", solutionPackage: "Content Growth", interest: "ต้องการ Content ที่สร้างความน่าเชื่อถือ", avatar: "", createdAt: "2026-07-02" }
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
let activeRole = "owner";
let toastTimer;

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return clone(seedData);
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
  data.customers = data.customers.map((customer) => ({
    ...customer,
    solutionPackage: customer.solutionPackage || "Marketing Starter",
    avatar: customer.avatar || ""
  }));
  const existingNames = new Set(data.products.map((product) => product.name));
  seedData.products.filter((product) => product.id.startsWith("mp") && !existingNames.has(product.name))
    .forEach((product) => data.products.push(clone(product)));
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

function avatarMarkup(customer, size = "normal") {
  const label = escapeHTML(customer?.fullName || "ลูกค้า");
  if (customer?.avatar?.startsWith("data:image/")) {
    return `<img class="customer-avatar ${size}" src="${escapeHTML(customer.avatar)}" alt="รูปโปรไฟล์ ${label}">`;
  }
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
  const cards = [
    ["รายได้ที่ปิดได้", currency(data.revenue), "คลิกเพื่อดูโอกาสขาย", data.revenue >= REVENUE_TARGET ? "success" : "", "deals"],
    ["มูลค่าโอกาสขาย", currency(data.pipelineValue), `${data.openDeals} รายการที่กำลังติดตาม`, "", "deals"],
    ["อัตราปิดการขาย", percent(data.conversionRate), `${data.totalLeads} Lead ในระบบ`, "", "crm"],
    ["งานที่ต้องทำ", data.pendingTasks, data.overdueTasks ? `${data.overdueTasks} งานเลยกำหนด` : "ไม่มีงานเลยกำหนด", data.overdueTasks ? "warning" : "success", "tasks"]
  ];

  document.querySelector("#kpiGrid").innerHTML = cards.map(([label, value, note, tone, target]) => `
    <button class="kpi-card" data-jump="${target}" ${tone ? `data-tone="${tone}"` : ""}>
      <span>${escapeHTML(label)}</span>
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

function renderDashboard() {
  const data = metrics();
  const progress = Math.min((data.revenue / REVENUE_TARGET) * 100, 100);
  const remaining = Math.max(REVENUE_TARGET - data.revenue, 0);
  renderKpis();
  document.querySelector("#pipelineBadge").textContent = currency(data.pipelineValue);
  renderJourneyFlow();
  renderPriorityLeads();
  renderSignals(data);

  document.querySelector("#goalCurrent").textContent = `${currency(data.revenue)} / ${currency(REVENUE_TARGET)}`;
  document.querySelector("#goalPercent").textContent = percent(progress);
  document.querySelector("#goalProgress").style.width = `${progress}%`;
  document.querySelector(".goal-meter").setAttribute("aria-valuenow", String(Math.round(progress)));
  document.querySelector("#goalMessage").textContent = remaining
    ? `ต้องสร้างรายได้เพิ่มอีก ${currency(remaining)} เพื่อถึงเป้ารอบนี้`
    : "ถึงเป้ารายได้แล้ว เลือก deal ถัดไปเพื่อสร้างการเติบโตต่อเนื่อง";
  document.querySelector("#roleInsight").textContent = roleInsight(data);

  document.querySelector("#latestLeads").innerHTML = state.leads.slice(-5).reverse().map((lead) => {
    const customer = customerById(lead.customerId);
    return compactItem(customer?.fullName || "-", `${customer?.source || "-"} · ${leadStatusLabels[lead.status] || lead.status}`, `${lead.leadScore} คะแนน`);
  }).join("");

  document.querySelector("#pendingTasks").innerHTML = state.tasks.filter((task) => task.status !== "done").slice(0, 5).map((task) =>
    compactItem(task.title, `${task.owner} · ${task.dueDate}`, task.priority)
  ).join("");
}

function renderJourneyFlow() {
  const steps = [
    ["New Lead", "รู้จักเรา", "ลูกค้าใหม่"],
    ["Contacted", "ติดต่อแล้ว", "เริ่มสนทนา"],
    ["Interested", "สนใจ", "เห็นความต้องการ"],
    ["Proposal Sent", "ส่งข้อเสนอ", "พร้อมตัดสินใจ"],
    ["Won", "ปิดการขาย", "รายได้เกิดขึ้น"]
  ];
  document.querySelector("#journeyFlow").innerHTML = steps.map(([key, label, detail], index) => {
    const count = key === "Won" ? state.deals.filter((deal) => deal.stage === "Won").length : state.leads.filter((lead) => lead.status === key).length;
    return `<button class="journey-step ${count ? "has-data" : ""}" data-jump="${key === "Won" ? "deals" : "crm"}"><span class="journey-number">0${index + 1}</span><strong>${escapeHTML(label)}</strong><b>${count}</b><small>${escapeHTML(detail)}</small></button>`;
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
    ["ลูกค้า", "เบอร์โทร", "ช่องทาง", "แพ็กเกจที่สนใจ", "สถานะ Lead", "จัดการ"],
    customers.map((customer) => {
      const lead = state.leads.find((item) => item.customerId === customer.id);
      return `<tr><td><div class="customer-cell">${avatarMarkup(customer, "small")}<div><strong>${escapeHTML(customer.fullName)}</strong><span>${escapeHTML(customer.interest)}</span></div></div></td><td>${escapeHTML(customer.phone)}</td><td>${escapeHTML(customer.source)}</td><td><span class="package-pill">${escapeHTML(customer.solutionPackage)}</span></td><td>${escapeHTML(leadStatusLabels[lead?.status] || "-")}</td><td><div class="table-actions"><button class="row-action" data-edit-record="customer:${escapeHTML(customer.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="customer:${escapeHTML(customer.id)}">ลบ</button></div></td></tr>`;
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
          <span>${escapeHTML(customer?.source || "-")}</span>
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
    ["แพ็กเกจ/บริการ", "ประเภท", "ราคาขาย", "ต้นทุน", "กำไรขั้นต้น", "สถานะ", "จัดการ"],
    state.products.map((product) => {
      const margin = Number(product.price) - Number(product.cost);
      return `<tr><td><strong>${escapeHTML(product.name)}</strong></td><td>${escapeHTML(product.category)}</td><td>${escapeHTML(currency(product.price))}</td><td>${escapeHTML(currency(product.cost))}</td><td class="success">${escapeHTML(currency(margin))}</td><td>${product.status === "active" ? "เปิดขาย" : "ปิดขาย"}</td><td><div class="table-actions"><button class="row-action" data-edit-record="product:${escapeHTML(product.id)}">แก้ไข</button><button class="row-action danger" data-delete-record="product:${escapeHTML(product.id)}">ลบ</button></div></td></tr>`;
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
}

function renderPackageOptions() {
  const select = document.querySelector("#customerPackageSelect");
  const selected = select.value;
  select.innerHTML = marketingPackages.map((item) => `<option value="${escapeHTML(item.name)}" ${selected === item.name ? "selected" : ""}>${escapeHTML(item.name)} · ${escapeHTML(currency(item.price))}</option>`).join("");
}

function roleInsight(data) {
  if (activeRole === "sales") return `ฝ่ายขาย: มี ${data.openDeals} โอกาสขาย มูลค่ารวม ${currency(data.pipelineValue)}`;
  if (activeRole === "ops") return `ทีมงาน: มี ${data.pendingTasks} งานค้าง และ ${data.overdueTasks} งานเลยกำหนด`;
  return `เจ้าของ: ทำได้ ${percent((data.revenue / REVENUE_TARGET) * 100)} ของเป้ารายได้`;
}

const viewConfig = {
  dashboard: ["ภาพรวมธุรกิจ", "ดูรายได้ งานขาย และสิ่งที่ต้องทำวันนี้", "เพิ่มลูกค้าใหม่", "customers"],
  customers: ["ข้อมูลลูกค้า", "เก็บข้อมูลลูกค้า รูปโปรไฟล์ และแพ็กเกจที่สนใจ", "ไปหน้า CRM", "crm"],
  crm: ["CRM งานขาย", "ติดตาม Lead และเปลี่ยนความสนใจให้เป็นโอกาสขาย", "วิเคราะห์ด้วย AI", "ai"],
  products: ["แพ็กเกจบริการ", "จัดการสินค้า บริการ และ Marketing Solution Package", "เพิ่มดีลธุรกิจ", "deals"],
  deals: ["Pipeline ธุรกิจ", "พัฒนาดีลตั้งแต่ตรวจความต้องการ ออกแบบข้อเสนอ จนเริ่มส่งมอบงาน", "ดูภาพรวม", "dashboard"],
  tasks: ["งานติดตาม", "จัดลำดับงานที่ต้องทำและป้องกัน Lead หลุด", "เปิด CRM", "crm"],
  ai: ["วิเคราะห์ด้วย AI", "ใช้ข้อมูลจริงในระบบเพื่อหาโอกาสและวางแผนงานต่อ", "กลับภาพรวม", "dashboard"]
};

function showView(view) {
  if (!VALID_VIEWS.includes(view)) view = "dashboard";
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  document.querySelector(`#${view}View`).classList.add("active");
  const [title, description, actionLabel, actionTarget] = viewConfig[view];
  document.querySelector("#viewTitle").textContent = title;
  document.querySelector("#viewDescription").textContent = description;
  document.querySelector("#pageAction").textContent = actionLabel;
  document.querySelector("#pageAction").dataset.target = actionTarget;
  history.replaceState(null, "", `#${view}`);
  document.title = `${document.querySelector("#viewTitle").textContent} | Business Growth`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelector("#pageAction").addEventListener("click", (event) => showView(event.currentTarget.dataset.target));

document.querySelectorAll(".role-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".role-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeRole = button.dataset.role;
    document.querySelector("#roleInsight").textContent = roleInsight(metrics());
    notify(`เปลี่ยนเป็นมุมมอง ${button.textContent}`);
  });
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
      ["source", "ช่องทางที่มา", "select", ["Facebook", "LINE OA", "Website", "Google Form", "Event", "Referral"]],
      ["solutionPackage", "แพ็กเกจที่สนใจ", "select", marketingPackages.map((item) => item.name)], ["interest", "ความต้องการ", "text"]
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
    const labelMap = name === "stage" ? dealStageLabels : name === "status" ? { ...taskStatusLabels, active: "เปิดขาย", inactive: "ปิดขาย" } : name === "priority" ? priorityLabels : {};
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
  document.querySelector("#recordFields").innerHTML = config.fields.map((field) => recordFieldMarkup(field, record)).join("");
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
    interest: form.get("interest").trim(),
    avatar,
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
    status: "active"
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
    const solution = marketingPackages.find((item) => item.name === customer?.solutionPackage);
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
    targetRevenue: REVENUE_TARGET,
    metrics: metrics(),
    customers: state.customers.map(({ id, fullName, source, solutionPackage, interest, createdAt }) => ({ id, fullName, source, solutionPackage, interest, createdAt })),
    leads: state.leads,
    deals: state.deals,
    tasks: state.tasks,
    packages: marketingPackages
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
  state = clone(seedData);
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

window.addEventListener("hashchange", () => showView(location.hash.slice(1)));

function setDefaultDueDate() {
  const input = document.querySelector('input[name="dueDate"]');
  input.value = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

setDefaultDueDate();
renderAll();
showView(location.hash.slice(1) || "dashboard");
