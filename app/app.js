import {
  buildProfileCatalog,
  packagesMissingFromCatalog,
  mergeCatalogWithProducts,
  normalizeOfferRelations,
  updateProductAcrossState,
  detachProductRelations,
  createZeroState
} from "./business-workflows.js?v=23";
import {
  parseImportFile,
  buildImportPlan,
  applyImportPlan
} from "./data-import.js?v=23";
import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER_ID,
  PROVIDERS,
  callProvider,
  maskApiKey,
  providerErrorMessage,
  validateKeyFormat
} from "./ai-provider.js?v=23";
// ข้อมูลโดเมนและค่าคงที่ย้ายไป business-config.js ส่วนตรรกะ state ย้ายไป state-model.js
// เพื่อให้ทั้งสองส่วนทดสอบได้ใน Node โดยไม่ต้องมี DOM (scripts/check-app-model.mjs)
import {
  AI_KEY_STORAGE_KEY,
  AI_MODEL_STORAGE_KEY,
  BACKUP_REMINDER_DAYS,
  BACKUP_STORAGE_KEY,
  REVENUE_TARGET,
  STORAGE_KEY,
  VALID_VIEWS,
  VIEW_STORAGE_KEY,
  avatarPresets,
  businessCatalogs,
  businessCategories,
  businessModes,
  contactChannelIcons,
  contactSources,
  dealStageGroups,
  dealStageLabels,
  dealStages,
  leadStatusLabels,
  leadStatuses,
  marketingPackages,
  pipelineModeLabels,
  priorityLabels,
  productCategories,
  roleIcons,
  roleViews,
  seedData,
  taskStatusLabels,
  taskStatuses
} from "./business-config.js?v=23";
import { buildInsightReport } from "./business-insights.js?v=23";
import { downloadReport } from "./report-export.js?v=23";
import {
  alignCustomerType,
  clone,
  compareToPrevious,
  computeMetrics,
  countBy,
  currency,
  currentBusinessCatalogOf,
  currentBusinessModeOf,
  escapeHTML,
  initials,
  loadStateFrom,
  normalizeState,
  percent,
  recordSnapshot,
  revenueTargetOf,
  thaiMonthLabel,
  sumDealsBySource as sumDealsBySourceOf,
  todayIso as today,
  uid,
  validIsoDate
} from "./state-model.js?v=23";

let state = loadStateFrom(localStorage, STORAGE_KEY);

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
// สำเนาข้อความดิบที่เราเป็นคนเขียนลง localStorage ล่าสุด ใช้เทียบตอนแท็บอื่นแก้ข้อมูล
// เพื่อแยกให้ออกว่า event ที่ได้รับมาจากการแก้จริง หรือเป็นเสียงสะท้อนของเราเอง
let lastKnownStorageValue = localStorage.getItem(STORAGE_KEY);
let staleTabWarned = false;

function saveState() {
  try {
    state.meta = { ...(state.meta || {}), updatedAt: new Date().toISOString() };
    // บันทึกสรุปตัวเลขของเดือนปัจจุบันทุกครั้งที่มีการแก้ข้อมูล ทับรายการเดิม
    // ของเดือนเดียวกัน แอปนี้ไม่มีเซิร์ฟเวอร์ที่จะรันงานตามเวลาให้ ประวัติจึงต้อง
    // เกิดจากการใช้งานปกติเท่านั้น เก็บแค่ตัวเลขสรุปจึงแทบไม่กระทบขนาดไฟล์
    state.history = recordSnapshot(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    persistedStateSnapshot = clone(state);
    lastKnownStorageValue = localStorage.getItem(STORAGE_KEY);
    renderBackupReminder();
    return true;
  } catch {
    state = normalizeState(clone(persistedStateSnapshot));
    selectedLeadIds.clear();
    renderAll();
    notify("บันทึกข้อมูลไม่สำเร็จ พื้นที่จัดเก็บของ browser อาจเต็ม");
    return false;
  }
}

// กันสองแท็บเขียนทับกันเงียบ ๆ
//
// state ทั้งก้อนถูกบันทึกเป็นข้อความเดียว การบันทึกจึงเป็นการเขียนทับทั้งหมดเสมอ
// ถ้าเปิดแอปไว้สองแท็บ แท็บที่กดบันทึกทีหลังจะลบงานของอีกแท็บทิ้งโดยไม่มีใครรู้
// เบราว์เซอร์ยิง event "storage" ให้เฉพาะแท็บอื่น ไม่ยิงให้แท็บที่เป็นคนเขียน
// จึงใช้เป็นสัญญาณได้ตรง ๆ ว่ามีคนแก้ข้อมูลชุดเดียวกันอยู่ที่อื่น
//
// เลือกเตือนแทนที่จะรวมข้อมูลอัตโนมัติ เพราะการรวมผิดทำให้ข้อมูลธุรกิจเพี้ยน
// แบบที่ผู้ใช้ไม่มีทางรู้ ส่วนการเตือนแล้วให้ผู้ใช้ตัดสินใจเองนั้นผิดพลาดไม่ได้
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || event.newValue === null) return;
  if (event.newValue === lastKnownStorageValue) return;
  lastKnownStorageValue = event.newValue;
  if (staleTabWarned) return;
  staleTabWarned = true;
  document.querySelector("#staleTabWarning")?.removeAttribute("hidden");
  // ตั้งใจไม่ใช้ปุ่มใน toast เพราะปุ่มนั้นผูกกับกลไก "เลิกทำ" ซึ่งจะเรียก saveState
  // ต่อทันที = เขียนข้อมูลเก่าของแท็บนี้ทับงานของแท็บอื่น ซึ่งตรงข้ามกับที่ต้องการ
  notify("ข้อมูลถูกแก้ไขจากแท็บอื่น หน้านี้จึงไม่ใช่ข้อมูลล่าสุดแล้ว");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#staleTabReload")) return;
  location.reload();
});

function lastBackupDate() {
  try {
    return localStorage.getItem(BACKUP_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function markBackupTaken() {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, today());
  } catch {
    // storage ถูกปิดอยู่ ผู้ใช้ยังส่งออกไฟล์ได้ตามปกติ แค่จำวันที่ให้ไม่ได้
  }
  renderBackupReminder();
}

function daysSinceBackup() {
  const last = lastBackupDate();
  if (!last) return null;
  const diff = (Date.parse(today()) - Date.parse(last)) / 86400000;
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff)) : null;
}

// เตือนสำรองข้อมูล — ไม่ใช่ฟีเจอร์เสริม แต่เป็นทางรอดเดียวของผู้ใช้
// ข้อมูลอยู่ใน localStorage ของเครื่องเขาเท่านั้น ล้าง browser หรือเปลี่ยนเครื่อง
// แล้วข้อมูลหายถาวร ไม่มีใครกู้คืนให้ได้รวมถึงผู้ดูแลระบบ
function renderBackupReminder() {
  const banner = document.querySelector("#backupReminder");
  if (!banner) return;
  const message = document.querySelector("#backupReminderText");
  const days = daysSinceBackup();
  const hasData = state.customers.length > 0 || state.deals.length > 0;
  if (!hasData || (days !== null && days < BACKUP_REMINDER_DAYS)) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  if (message) {
    message.textContent = days === null
      ? "ยังไม่เคยสำรองข้อมูล — ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ถ้าล้าง browser จะหายถาวรและกู้คืนให้ไม่ได้"
      : `สำรองข้อมูลครั้งล่าสุดเมื่อ ${days} วันก่อน ควรส่งออกไฟล์เก็บไว้อีกครั้ง`;
  }
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

function customerById(id) {
  return state.customers.find((customer) => customer.id === id);
}

function revenueTarget() {
  return revenueTargetOf(state);
}

function currentBusinessMode() {
  return currentBusinessModeOf(state);
}

function currentBusinessCatalog() {
  return currentBusinessCatalogOf(state);
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
  return `<svg class="${escapeHTML(className)}" aria-hidden="true" focusable="false"><use href="/icons.svg?v=23#${escapeHTML(name)}"></use></svg>`;
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
  return computeMetrics(state);
}

function sumDealsBySource() {
  return sumDealsBySourceOf(state);
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

// ---------- ศูนย์วิเคราะห์ธุรกิจ ----------
// ทุกการ์ดต้องแสดง "ที่มาของตัวเลข" เสมอ ตัวเลขที่ไม่บอกว่าคิดมาจากอะไรทำให้เจ้าของ
// ธุรกิจตรวจสอบไม่ได้ว่าระบบคิดถูกหรือเปล่า และไม่กล้าใช้ตัดสินใจจริง

function insightCard(title, kicker, bodyMarkup, reason) {
  return `
    <article class="insight-card">
      <header>
        <p class="eyebrow">${escapeHTML(kicker)}</p>
        <h3>${escapeHTML(title)}</h3>
      </header>
      ${bodyMarkup}
      <footer class="insight-reason">${escapeHTML(reason)}</footer>
    </article>
  `;
}

function insightStat(label, value, tone = "") {
  return `<div class="insight-stat"${tone ? ` data-tone="${escapeHTML(tone)}"` : ""}><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function insightList(items) {
  if (!items.length) return `<p class="muted insight-empty">ยังไม่มีข้อมูลในส่วนนี้</p>`;
  return `<ul class="insight-list">${items.join("")}</ul>`;
}

// ตัวชี้วัดที่ "มากขึ้น = ดีขึ้น" กับตัวที่กลับด้าน ต้องแยกกันให้ชัด
// งานค้างเพิ่มขึ้น 40% ไม่ใช่ข่าวดี การใช้สีเขียวกับทุกลูกศรขึ้นคือการโกหกผู้ใช้
const TREND_METRICS = [
  ["revenue", "รายได้ปิดแล้ว", "money", "up"],
  ["pipelineValue", "มูลค่า Pipeline", "money", "up"],
  ["customers", "ลูกค้าทั้งหมด", "count", "up"],
  ["wonDeals", "ดีลที่ปิดได้", "count", "up"],
  ["conversionRate", "อัตราปิดการขาย", "percent", "up"],
  ["overdueTasks", "งานเกินกำหนด", "count", "down"]
];

function trendValueText(value, format) {
  if (format === "money") return currency(value);
  if (format === "percent") return `${value}%`;
  return String(value);
}

function renderTrend() {
  const grid = document.querySelector("#trendGrid");
  const reason = document.querySelector("#trendReason");
  if (!grid) return;
  const comparison = compareToPrevious(state);
  if (reason) reason.textContent = comparison.reason;
  if (!comparison.available) {
    // ตั้งใจไม่แสดง 0% ตอนไม่มีข้อมูล เพราะผู้ใช้จะอ่านว่า "ทรงตัว" ซึ่งไม่จริง
    grid.innerHTML = `<div class="empty-state">ระบบเริ่มเก็บสรุปรายเดือนให้แล้วตั้งแต่วันนี้ พอขึ้นเดือนใหม่จะเทียบให้อัตโนมัติโดยไม่ต้องตั้งค่าอะไร</div>`;
    return;
  }
  grid.innerHTML = TREND_METRICS.map(([key, label, format, goodDirection]) => {
    const change = comparison.changes[key];
    if (!change) return "";
    const flat = change.diff === 0;
    const rising = change.diff > 0;
    const good = flat ? null : (goodDirection === "up") === rising;
    const tone = flat ? "flat" : good ? "good" : "bad";
    const arrow = flat ? "→" : rising ? "▲" : "▼";
    // ตัวชี้วัดที่เป็นเปอร์เซ็นต์อยู่แล้วต้องบอกส่วนต่างเป็น "จุด" ไม่ใช่เปอร์เซ็นต์ของ
    // เปอร์เซ็นต์ ไม่งั้น 25% → 20% จะขึ้นว่า -20% ซึ่งคนอ่านแยกไม่ออกว่าหมายถึงอะไร
    //
    // ส่วนกรณีเพิ่มจากศูนย์คำนวณเปอร์เซ็นต์ไม่ได้ จึงบอกส่วนต่างจริงแทน
    // เพราะ "งานเกินกำหนดเพิ่ม 2 รายการ" มีความหมายกว่าคำว่า "เริ่มมีข้อมูล"
    const sign = change.diff > 0 ? "+" : "";
    const percentText = format === "percent"
      ? `${sign}${Math.round(change.diff * 10) / 10} จุด`
      : change.percent === null
        ? (flat ? "เท่าเดิม" : `${sign}${trendValueText(change.diff, format)} จาก 0`)
        : `${sign}${change.percent}%`;
    return `<article class="trend-card trend-card--${tone}">
      <span class="trend-label">${escapeHTML(label)}</span>
      <strong class="trend-value">${escapeHTML(trendValueText(change.after, format))}</strong>
      <span class="trend-delta">${arrow} ${escapeHTML(percentText)}</span>
      <small class="trend-before">เดือนก่อน ${escapeHTML(trendValueText(change.before, format))}</small>
    </article>`;
  }).join("");
}

function renderInsights() {
  const container = document.querySelector("#insightCards");
  if (!container) return;
  const report = buildInsightReport(state);

  const gapCard = insightCard("ช่องว่างถึงเป้ารายได้", "Revenue gap", `
    <div class="insight-stats">
      ${insightStat("ปิดได้แล้ว", currency(report.revenueGap.achieved), "good")}
      ${insightStat("เป้าหมาย", currency(report.revenueGap.target))}
      ${insightStat("ยังขาดอีก", currency(report.revenueGap.gap), report.revenueGap.gap > 0 ? "bad" : "good")}
      ${insightStat("ทำได้แล้ว", percent(report.revenueGap.achievedPercent))}
    </div>
    ${report.revenueGap.gap > 0 && !report.revenueGap.coverableByOpenDeals
      ? `<p class="insight-warning">ดีลที่เปิดอยู่ทั้งหมดรวมกันยังปิดช่องว่างนี้ไม่ได้ ต้องหา Lead ใหม่เพิ่ม ไม่ใช่แค่ตามดีลเดิม</p>`
      : ""}
    ${insightList(report.revenueGap.dealsToClose.slice(0, 5).map((deal) => `
      <li><span>${escapeHTML(deal.name)} · ${escapeHTML(deal.customerName)}</span><b>${escapeHTML(currency(deal.value))} · โอกาส ${escapeHTML(percent(deal.probability))}</b></li>
    `))}
  `, report.revenueGap.reason);

  const forecastCard = insightCard("คาดการณ์รายได้", "Weighted forecast", `
    <div class="insight-stats">
      ${insightStat("ปิดได้แล้ว", currency(report.forecast.banked), "good")}
      ${insightStat("ที่ทีมรับปากได้", currency(report.forecast.committedCase))}
      ${insightStat("ที่น่าจะเป็น", currency(report.forecast.likelyCase))}
      ${insightStat("ถ้าทุกดีลชนะ", currency(report.forecast.bestCase))}
    </div>
    ${insightList(report.forecast.byStage.map((entry) => `
      <li><span>${escapeHTML(dealStageLabels[entry.stage] || entry.stage)} · ${escapeHTML(String(entry.count))} ดีล</span><b>${escapeHTML(currency(entry.weighted))}</b></li>
    `))}
  `, report.forecast.reason);

  const queueCard = insightCard("คิวที่ต้องติดตามก่อน", "Next best action", `
    <div class="insight-stats">
      ${insightStat("เลยนัดติดตาม", `${report.callQueue.overdueCount} ราย`, report.callQueue.overdueCount > 0 ? "bad" : "good")}
      ${insightStat("ยังไม่มีผู้รับผิดชอบ", `${report.callQueue.unassignedCount} ราย`, report.callQueue.unassignedCount > 0 ? "warn" : "good")}
    </div>
    ${insightList(report.callQueue.queue.slice(0, 6).map((item, index) => `
      <li class="insight-queue-item"${item.overdueDays > 0 ? ` data-tone="bad"` : ""}>
        <span><b class="insight-rank">${index + 1}</b> ${escapeHTML(item.customerName)} · ${escapeHTML(item.statusLabel)}</span>
        <small>${escapeHTML(item.reasons.join(" · "))}</small>
      </li>
    `))}
  `, report.callQueue.reason);

  const offerCard = insightCard("กำไรรายข้อเสนอ", "Offer margin", `
    <div class="insight-stats">
      ${insightStat("กำไรเฉลี่ย", percent(report.offers.averageMarginPercent))}
      ${insightStat("ต้องรีบแก้ราคา", `${report.offers.thinMargin.length} รายการ`, report.offers.thinMargin.length > 0 ? "warn" : "good")}
    </div>
    ${insightList(report.offers.offers.slice(0, 6).map((offer) => `
      <li${report.offers.thinMargin.some((thin) => thin.id === offer.id) ? ` data-tone="warn"` : ""}>
        <span>${escapeHTML(offer.name)}</span><b>${escapeHTML(currency(offer.margin))} · ${escapeHTML(percent(offer.marginPercent))}</b>
      </li>
    `))}
  `, report.offers.reason);

  const channelCard = insightCard("ช่องทางไหนคุ้ม", "Channel performance", `
    ${report.channels.noRevenueYet.length
      ? `<p class="insight-warning">${escapeHTML(report.channels.noRevenueYet.map((channel) => channel.source).join(", "))} มีลูกค้าแล้วแต่ยังไม่เคยปิดรายได้เลย</p>`
      : ""}
    ${insightList(report.channels.channels.map((channel) => `
      <li${channel.revenue > 0 ? ` data-tone="good"` : ""}>
        <span>${escapeHTML(channel.source)} · ${escapeHTML(String(channel.customerCount))} ลูกค้า</span>
        <b>${escapeHTML(currency(channel.revenue))} · ปิดได้ ${escapeHTML(percent(channel.conversionRate))}</b>
      </li>
    `))}
  `, report.channels.reason);

  const journeyCard = insightCard("คอขวดใน Customer Journey", "Funnel bottleneck", `
    ${insightList(report.journey.stages.map((stage) => `
      <li${stage.status === report.journey.bottleneck?.status ? ` data-tone="warn"` : ""}>
        <span>${escapeHTML(stage.label)}${stage.journeyLabel ? ` · ${escapeHTML(stage.journeyLabel)}` : ""}</span>
        <b>${escapeHTML(String(stage.count))} ราย · ${escapeHTML(percent(stage.sharePercent))}</b>
      </li>
    `))}
  `, report.journey.reason);

  const taskCard = insightCard("งานค้างและความเสี่ยง", "Delivery risk", `
    <div class="insight-stats">
      ${insightStat("งานค้าง", `${report.tasks.openCount} งาน`)}
      ${insightStat("เลยกำหนด", `${report.tasks.overdueCount} งาน`, report.tasks.overdueCount > 0 ? "bad" : "good")}
    </div>
    ${insightList(report.tasks.overdue.slice(0, 5).map((task) => `
      <li data-tone="bad"><span>${escapeHTML(task.title)} · ${escapeHTML(task.owner)}</span><b>ค้าง ${escapeHTML(String(task.lateDays))} วัน</b></li>
    `))}
  `, report.tasks.reason);

  container.innerHTML = [gapCard, forecastCard, queueCard, offerCard, channelCard, journeyCard, taskCard].join("");
}

document.querySelector("#exportReport")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const status = document.querySelector("#exportReportStatus");
  button.disabled = true;
  button.textContent = "กำลังสร้างรายงาน...";
  if (status) status.textContent = "";
  try {
    const fileName = await downloadReport(state);
    if (status) status.textContent = `บันทึกไฟล์ ${fileName} แล้ว`;
    notify("ดาวน์โหลดรายงาน Excel แล้ว");
  } catch (error) {
    if (status) status.textContent = error.message || "สร้างรายงานไม่สำเร็จ";
    notify(error.message || "สร้างรายงานไม่สำเร็จ");
  } finally {
    button.disabled = false;
    button.textContent = "ดาวน์โหลดรายงาน Excel";
  }
});

function renderAll() {
  renderTrend();
  renderInsights();
  renderBackupReminder();
  renderFieldSuggestions();
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
  document.querySelector("#customerTypeLabel").textContent = currentBusinessMode().customerTypeLabel;
  renderFieldSuggestions();
}

// รวมตัวเลือกแนะนำของฟิลด์ป้ายกำกับจาก 2 แหล่ง: ค่าตั้งต้นที่ระบบเตรียมไว้
// กับค่าที่ผู้ใช้เคยพิมพ์เองในข้อมูลจริงของเขา
//
// แหล่งที่สองสำคัญกว่า เพราะทำให้ค่าที่ผู้ใช้คิดขึ้นเองครั้งแรกกลายเป็นตัวเลือก
// ในครั้งถัดไปโดยอัตโนมัติ ผู้ใช้จึงไม่ต้องพิมพ์ซ้ำและไม่พิมพ์เพี้ยนจนกลายเป็น
// คนละกลุ่มในรายงาน เพราะ "Facebook" กับ "Facebook " จะถูกนับแยกกันทันที
function suggestionMarkup(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "th"))
    .map((value) => `<option value="${escapeHTML(value)}"></option>`)
    .join("");
}

function renderFieldSuggestions() {
  const sourceList = document.querySelector("#sourceOptions");
  if (sourceList) {
    sourceList.innerHTML = suggestionMarkup([...contactSources, ...state.customers.map((customer) => customer.source)]);
  }
  const typeList = document.querySelector("#customerTypeOptions");
  if (typeList) {
    typeList.innerHTML = suggestionMarkup([...currentBusinessMode().customerTypes, ...state.customers.map((customer) => customer.customerType)]);
  }
  const categoryList = document.querySelector("#productCategoryOptions");
  if (categoryList) {
    categoryList.innerHTML = suggestionMarkup([...productCategories, ...state.products.map((product) => product.category)]);
  }
}

// ค่าที่ผู้ใช้พิมพ์เองต้องตัดช่องว่างหัวท้ายเสมอ ไม่งั้น "Facebook " กับ "Facebook"
// จะกลายเป็นสองช่องทางในรายงานวิเคราะห์การตลาด ซึ่งผู้ใช้มองไม่เห็นสาเหตุเลย
function cleanLabel(value, fallback = "") {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text || fallback;
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
  crm: ["CRM งานขาย", "ติดตาม Lead และเปลี่ยนความสนใจให้เป็นโอกาสขาย", "เปิดศูนย์วิเคราะห์", "insights"],
  products: ["สินค้าและข้อเสนอ", "จัดการสินค้า บริการ Subscription และ Package ให้ตรงกับรูปแบบธุรกิจ", "เพิ่มดีลธุรกิจ", "deals"],
  deals: ["Pipeline ธุรกิจ", "พัฒนาดีลตั้งแต่ตรวจความต้องการ ออกแบบข้อเสนอ จนเริ่มส่งมอบงาน", "ดูภาพรวม", "dashboard"],
  tasks: ["งานติดตาม", "จัดลำดับงานที่ต้องทำและป้องกัน Lead หลุด", "เปิด CRM", "crm"],
  insights: ["ศูนย์วิเคราะห์ธุรกิจ", "คำตอบที่คำนวณจากข้อมูลในระบบโดยตรง พร้อมดาวน์โหลดเป็นรายงาน Excel", "ดาวน์โหลดรายงาน", "insights"],
  ai: ["วิเคราะห์ด้วย AI", "ถามเป็นภาษาปกติเพื่อให้ AI เรียบเรียงข้อมูลในระบบ (ต้องใช้ API key ของคุณเอง)", "กลับภาพรวม", "dashboard"]
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
  // จำไว้ที่นี่เพราะ history.pushState ไม่ยิง event hashchange การดักที่ hashchange
  // อย่างเดียวจึงพลาดทุกครั้งที่ผู้ใช้กดเมนู ซึ่งเป็นวิธีเปลี่ยนหน้าหลักของแอป
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, nextRoute);
  } catch {
    // storage ถูกปิดอยู่ ผู้ใช้ยังสลับมุมมองได้ตามปกติ แค่จำข้ามรอบให้ไม่ได้
  }
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
      ["source", "ช่องทางที่มา", "combo", contactSources],
      ["avatarPreset", "Avatar ตามประเภทธุรกิจ", "select", Object.keys(avatarPresets)],
      ["customerType", "ประเภทลูกค้า", "combo", []],
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
    fields: [["name", "ชื่อเฉพาะของสินค้า/ข้อเสนอ", "text"], ["category", "ประเภท", "combo", productCategories], ["businessMode", "รูปแบบธุรกิจใน Pipeline", "select", Object.keys(businessModes)], ["businessCategory", "หมวดธุรกิจ", "select", Object.keys(businessCategories)], ["pipelineStage", "เสนอในขั้น Pipeline", "select", dealStages], ["price", "ราคาขาย", "number"], ["cost", "ต้นทุน", "number"], ["description", "รายละเอียด Package", "text"], ["recommendationReason", "เหตุผลที่ควรแนะนำ", "text"], ["status", "สถานะ", "select", ["active", "inactive"]]]
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
  // combo = พิมพ์เองได้ พร้อมรายการแนะนำ ใช้กับฟิลด์ป้ายกำกับเท่านั้น
  //
  // ถ้าหน้าต่างแก้ไขยังเป็น select อยู่ ค่าที่ผู้ใช้พิมพ์เองตอนสร้างจะหายทันทีที่กด
  // แก้ไข เพราะ select แสดงค่าที่ไม่มีใน option ไม่ได้ แล้วจะบันทึกค่าแรกกลับไปแทน
  if (type === "combo") {
    const listId = `combo-${name}`;
    const suggestions = [...new Set([...(options || []), String(value ?? "")].map((item) => String(item ?? "").trim()).filter(Boolean))];
    return `<label>${escapeHTML(label)}
      <input name="${escapeHTML(name)}" list="${escapeHTML(listId)}" value="${escapeHTML(value)}" autocomplete="off" required>
      <datalist id="${escapeHTML(listId)}">${suggestions.map((item) => `<option value="${escapeHTML(item)}"></option>`).join("")}</datalist>
    </label>`;
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
    changes[name] = fieldType === "number"
      ? Number(value)
      : fieldType === "combo"
        ? cleanLabel(value, record[name])
        : String(value || "").trim();
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
    source: cleanLabel(form.get("source"), "ไม่ระบุช่องทาง"),
    solutionPackageId: selectedOffer?.id || "",
    solutionPackage: selectedOffer?.name || "ยังไม่เลือกข้อเสนอ",
    customerType: selectedOffer?.businessMode && selectedOffer.businessMode !== state.businessProfile.businessMode
      ? selectedOfferMode.customerTypes[0]
      : cleanLabel(form.get("customerType"), currentBusinessMode().customerTypes[0]),
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
    category: cleanLabel(form.get("category"), "Package"),
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

// ---------------------------------------------------------------------------
// Key store ของผู้ใช้ (Bring-Your-Own-Key) — ADR-001 ข้อ 4.5 / 4.6 / 4.7
//
// default = sessionStorage (หายเมื่อปิดแท็บ) เพื่อลดความเสียหายบนเครื่องที่ใช้
// ร่วมกันใน Workshop เมื่อผู้ใช้ติ๊ก "จำ key ไว้ในเครื่องนี้" จึงย้ายไป localStorage
// ค่า key ไม่ถูกเก็บใน state, ไม่ถูกใส่ลงใน innerHTML และไม่ถูกเขียนลง console
// ---------------------------------------------------------------------------

function readStoredKey() {
  try {
    return sessionStorage.getItem(AI_KEY_STORAGE_KEY) || localStorage.getItem(AI_KEY_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

// key ที่ผู้ใช้พิมพ์/วางไว้แต่ยังไม่ได้กดบันทึก
//
// เดิมค่านี้ถูกมองข้ามทั้งหมด ผู้ใช้ที่วาง key แล้วถามคำถามทันทีจะเจอ
// "ยังไม่ได้ตั้งค่า key" ทั้งที่ key อยู่ตรงหน้าต่อตา ซึ่งเป็นทางตันที่หาสาเหตุเองไม่ได้
function typedKey() {
  return document.querySelector("#aiKeyInput")?.value.trim() || "";
}

// key ที่จะใช้กับคำขอรอบนี้ — ค่าที่พิมพ์ไว้ชนะค่าที่บันทึกไว้เสมอ
//
// เจตนาสำคัญ: ผู้ใช้ที่ไม่อยากให้ key ถูกเก็บที่ไหนเลย แค่วางแล้วใช้ได้ทันที
// key จะอยู่ในช่องกรอกของแท็บนั้นเท่านั้น ไม่แตะ sessionStorage หรือ localStorage
// ปิดแท็บแล้วหายทันทีโดยไม่ต้องกดลบอะไร
function activeApiKey() {
  return typedKey() || readStoredKey();
}

function keyIsRemembered() {
  try {
    return Boolean(localStorage.getItem(AI_KEY_STORAGE_KEY));
  } catch {
    return false;
  }
}

function writeStoredKey(apiKey, remember) {
  try {
    if (remember) {
      localStorage.setItem(AI_KEY_STORAGE_KEY, apiKey);
      sessionStorage.removeItem(AI_KEY_STORAGE_KEY);
    } else {
      sessionStorage.setItem(AI_KEY_STORAGE_KEY, apiKey);
      localStorage.removeItem(AI_KEY_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

function clearStoredKey() {
  try {
    sessionStorage.removeItem(AI_KEY_STORAGE_KEY);
    localStorage.removeItem(AI_KEY_STORAGE_KEY);
  } catch {
    // storage ถูกปิดใช้งานอยู่แล้ว ไม่มี key ค้างให้ลบ
  }
}

function readStoredModel() {
  try {
    return (localStorage.getItem(AI_MODEL_STORAGE_KEY) || "").trim() || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

function writeStoredModel(model) {
  try {
    const value = String(model || "").trim();
    if (!value || value === DEFAULT_MODEL) localStorage.removeItem(AI_MODEL_STORAGE_KEY);
    else localStorage.setItem(AI_MODEL_STORAGE_KEY, value);
  } catch {
    // เก็บไม่ได้ก็ยังใช้ค่าที่พิมพ์ในช่องได้ในรอบนี้
  }
}

// เก็บสถานะล่าสุดไว้ให้ #aiKeyStatus แสดง โดยแยก "รูปแบบถูกต้องและบันทึกแล้ว"
// ออกจาก "ผู้ให้บริการปฏิเสธ key นี้" ตามข้อ 4.6 (ตรวจ 2 ชั้น)
let aiKeyRejectedMessage = "";

function currentAnalysisModel() {
  const input = document.querySelector("#aiModelInput");
  return (input?.value || "").trim() || readStoredModel();
}

function analysisEmptyStateMarkup(kind) {
  if (kind === "no-key") {
    return `<div class="chat-empty">
      <strong>ยังใช้ AI ไม่ได้ เพราะยังไม่ได้ตั้งค่า API key</strong>
      <span>ส่วนอื่นของระบบใช้งานได้ตามปกติทั้งหมด เฉพาะการวิเคราะห์ด้วย AI เท่านั้นที่ต้องใช้ key ของคุณเอง</span>
      <span>ใส่ API key ของ ${escapeHTML(PROVIDERS[DEFAULT_PROVIDER_ID].label)} ในช่องด้านซ้ายแล้วกดบันทึก ระบบจะเรียกผู้ให้บริการจากเบราว์เซอร์ของคุณโดยตรง ค่าใช้จ่ายอยู่กับบัญชีของคุณ</span>
      <div class="analysis-empty-actions"><button type="button" class="small-button" data-focus-ai-key>ไปที่ช่องใส่ API key</button></div>
    </div>`;
  }
  return `<div class="chat-empty"><strong>เลือกคำถามแนะนำ หรือถามด้วยคำของคุณเอง</strong><span>คำตอบจะอ้างอิงเฉพาะข้อมูลที่มีอยู่ใน Web App</span></div>`;
}

// gating + empty state: ไม่มี key ต้องไม่ทำให้อะไรพัง (ADR ข้อ 4.7)
// เมนู AI ยังกดเข้าได้ Snapshot/Prompt/Quick question ยังทำงาน มีแค่ปุ่มส่งที่ปิด
function renderAiKeyState() {
  const input = document.querySelector("#aiKeyInput");
  const modelInput = document.querySelector("#aiModelInput");
  const remember = document.querySelector("#aiKeyRemember");
  const statusNode = document.querySelector("#aiKeyStatus");
  const clearButton = document.querySelector("#aiKeyClear");
  const analyzeButton = document.querySelector("#analyzeBusiness");
  const analysisStatus = document.querySelector("#analysisStatus");
  const result = document.querySelector("#analysisResult");
  if (!input || !statusNode || !analyzeButton) return;

  const storedKey = readStoredKey();
  const pendingKey = typedKey();
  // ใช้งานได้ทันทีที่มี key ไม่ว่าจะบันทึกแล้วหรือแค่วางไว้ในช่อง
  const hasKey = Boolean(storedKey || pendingKey);
  const usingUnsavedKey = Boolean(pendingKey) && pendingKey !== storedKey;
  if (document.activeElement !== modelInput) modelInput.value = readStoredModel();
  remember.checked = storedKey ? keyIsRemembered() : remember.checked;
  clearButton.disabled = !storedKey;

  // ค่าใน #aiKeyStatus ตั้งด้วย textContent เสมอ ห้ามใช้ innerHTML เพราะมีเศษของ key อยู่
  if (aiKeyRejectedMessage) {
    statusNode.dataset.keyState = "error";
    statusNode.textContent = aiKeyRejectedMessage;
  } else if (usingUnsavedKey) {
    // สถานะที่ปลอดภัยที่สุด และเป็นค่าตั้งต้นสำหรับคนที่ไม่อยากให้ key ถูกเก็บ
    statusNode.dataset.keyState = "ready";
    statusNode.textContent = `${maskApiKey(pendingKey)} · พร้อมใช้งานทันที ยังไม่ได้บันทึกลงเครื่อง ปิดแท็บแล้วหายเอง · โมเดล ${readStoredModel()}`;
  } else if (hasKey) {
    statusNode.dataset.keyState = "ready";
    statusNode.textContent = `${maskApiKey(storedKey)} · ${keyIsRemembered() ? "จำไว้ในเครื่องนี้จนกว่าจะกดลบ" : "ใช้ได้จนกว่าจะปิดแท็บนี้"} · โมเดล ${readStoredModel()}`;
  } else {
    statusNode.dataset.keyState = "empty";
    statusNode.textContent = "ยังไม่ได้ตั้งค่า key — วาง key ของคุณในช่องด้านบนแล้วถามได้เลย ไม่ต้องกดบันทึก";
  }

  analyzeButton.disabled = !hasKey || analysisInFlight;
  analyzeButton.setAttribute("aria-describedby", "aiKeyStatus");
  if (!hasKey) {
    analysisStatus.textContent = "ยังไม่ได้ตั้งค่า key";
    if (!result.dataset.hasAnalysis) {
      result.classList.add("empty-analysis");
      result.innerHTML = analysisEmptyStateMarkup("no-key");
    }
  } else if (!result.dataset.hasAnalysis) {
    analysisStatus.textContent = "พร้อมใช้งาน";
    result.classList.add("empty-analysis");
    result.innerHTML = analysisEmptyStateMarkup("ready");
  }
}

// อัปเดตสถานะทันทีที่ผู้ใช้วาง key ปุ่มส่งคำถามจึงเปิดใช้งานเองโดยไม่ต้องกดบันทึก
// ถ้าไม่มีบรรทัดนี้ ผู้ใช้จะวาง key แล้วเห็นปุ่มยังเป็นสีเทาอยู่ ซึ่งอ่านได้ว่า "ยังใช้ไม่ได้"
document.querySelector("#aiKeyInput").addEventListener("input", () => {
  aiKeyRejectedMessage = "";
  renderAiKeyState();
});

document.querySelector("#aiKeyReveal").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const input = document.querySelector("#aiKeyInput");
  const reveal = button.getAttribute("aria-pressed") !== "true";
  input.type = reveal ? "text" : "password";
  button.setAttribute("aria-pressed", String(reveal));
  button.textContent = reveal ? "ซ่อน key" : "แสดง key";
  // ตั้งใจไม่ย้าย focus ไปที่ input เพราะผู้ใช้ที่กดปุ่มนี้ด้วยคีย์บอร์ดจะเสียตำแหน่ง
  // และไม่ได้ยินการประกาศสถานะ aria-pressed ที่เพิ่งเปลี่ยน
});

document.querySelector("#aiKeyForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#aiKeyInput");
  const statusNode = document.querySelector("#aiKeyStatus");
  const remember = document.querySelector("#aiKeyRemember").checked;
  const typedValue = input.value.trim();
  const model = (document.querySelector("#aiModelInput").value || "").trim() || DEFAULT_MODEL;

  // ผู้ใช้แก้เฉพาะชื่อโมเดลโดยไม่พิมพ์ key ใหม่ได้ ถ้ามี key เก็บไว้อยู่แล้ว
  if (!typedValue && readStoredKey()) {
    writeStoredModel(model);
    aiKeyRejectedMessage = "";
    renderAiKeyState();
    notify(`บันทึกโมเดล ${model} แล้ว`);
    return;
  }

  const format = validateKeyFormat(typedValue, DEFAULT_PROVIDER_ID);
  if (!format.ok) {
    aiKeyRejectedMessage = format.message;
    renderAiKeyState();
    statusNode.dataset.keyState = "error";
    input.focus();
    return;
  }

  if (!writeStoredKey(typedValue, remember)) {
    aiKeyRejectedMessage = "บันทึก key ไม่สำเร็จ เบราว์เซอร์ปิดการใช้งานพื้นที่จัดเก็บอยู่ กรุณาเปิด storage ของเว็บนี้แล้วบันทึกใหม่";
    renderAiKeyState();
    input.focus();
    return;
  }
  writeStoredModel(model);
  aiKeyRejectedMessage = "";
  input.value = "";
  input.type = "password";
  const revealButton = document.querySelector("#aiKeyReveal");
  revealButton.setAttribute("aria-pressed", "false");
  revealButton.textContent = "แสดง key";
  renderAiKeyState();
  notify(remember ? "บันทึก key ไว้ในเครื่องนี้แล้ว" : "บันทึก key สำหรับแท็บนี้แล้ว จะหายเมื่อปิดแท็บ");
});

document.querySelector("#aiKeyClear").addEventListener("click", () => {
  clearStoredKey();
  aiKeyRejectedMessage = "";
  const input = document.querySelector("#aiKeyInput");
  input.value = "";
  input.type = "password";
  document.querySelector("#aiKeyRemember").checked = false;
  const revealButton = document.querySelector("#aiKeyReveal");
  revealButton.setAttribute("aria-pressed", "false");
  revealButton.textContent = "แสดง key";
  renderAiKeyState();
  notify("ลบ API key ออกจากเครื่องนี้แล้ว");
  input.focus();
});

document.querySelector("#analysisResult").addEventListener("click", (event) => {
  if (!event.target.closest("[data-focus-ai-key]")) return;
  const input = document.querySelector("#aiKeyInput");
  input.scrollIntoView({ block: "center", behavior: "smooth" });
  input.focus();
});

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
  // เก็บ reference ของ form ไว้ตั้งแต่ต้น เพราะ currentTarget ของ event จะกลายเป็น
  // null ทันทีที่ handler คืน control ให้ event loop การอ้างถึงมันในบล็อก finally
  // จึงโยน TypeError และทำให้ปุ่มค้างสถานะ "กำลังวิเคราะห์" ตลอดไป
  // (เป็นรูปแบบเดียวกับที่ #customerForm แก้ไว้แล้ว)
  const formElement = event.currentTarget;
  const button = document.querySelector("#analyzeBusiness");
  const result = document.querySelector("#analysisResult");
  const status = document.querySelector("#analysisStatus");
  const prompt = document.querySelector("#analysisPrompt");
  const focusSelect = document.querySelector("#analysisFocus");
  const quickButtons = [...document.querySelectorAll("#analysisQuickQuestions button")];
  const userPrompt = prompt.value.trim();
  if (!userPrompt) return prompt.focus();
  const evidenceMarkup = analysisEvidenceMarkup();

  // ปุ่มถูก disable อยู่แล้วเมื่อไม่มี key แต่ Enter ในช่องคำถามเรียก requestSubmit()
  // ได้โดยตรง จึงต้องกันซ้ำที่นี่ ไม่ปล่อยให้ยิงคำขอที่รู้อยู่แล้วว่าจะล้มเหลว
  const apiKey = activeApiKey();
  if (!apiKey) {
    aiKeyRejectedMessage = providerErrorMessage("missing_key");
    renderAiKeyState();
    document.querySelector("#analysisTitle").textContent = "ยังตั้งค่า API key ไม่ครบ";
    status.textContent = "ยังไม่ได้ตั้งค่า key";
    document.querySelector("#aiKeyInput").focus();
    notify(providerErrorMessage("missing_key"));
    return;
  }

  // ล้างคำเตือนของรอบก่อนทุกครั้งที่เริ่มรอบใหม่ ไม่งั้นข้อความเช่น "โมเดลนี้ใช้ไม่ได้"
  // จะค้างอยู่ใน #aiKeyStatus แม้รอบถัดไปจะล้มด้วยสาเหตุอื่น (เช่นเน็ตหลุด)
  // ทำให้ผู้ใช้ไล่แก้ผิดจุด
  aiKeyRejectedMessage = "";
  analysisInFlight = true;
  button.disabled = true;
  prompt.readOnly = true;
  focusSelect.disabled = true;
  quickButtons.forEach((quickButton) => { quickButton.disabled = true; });
  formElement.setAttribute("aria-busy", "true");
  button.textContent = "กำลังวิเคราะห์...";
  status.textContent = "กำลังประมวลผล";
  result.classList.remove("empty-analysis");
  result.innerHTML = `${evidenceMarkup}<article class="chat-message user-message"><span>คำถามของคุณ</span><p>${escapeHTML(userPrompt)}</p></article><article class="chat-message assistant-message loading-message"><span>AI Business Analyst</span><p>กำลังอ่านข้อมูลในระบบและตรวจตัวเลขที่เกี่ยวข้อง...</p></article>`;

  try {
    // เรียกผู้ให้บริการตรงจากเบราว์เซอร์ด้วย key ของผู้ใช้ (ADR-001 ข้อ 4.2)
    // ทั้งข้อมูลธุรกิจและ key ไม่วิ่งผ่าน server ของเจ้าของระบบอีกต่อไป
    const data = await callProvider(DEFAULT_PROVIDER_ID, apiKey, analysisPayload(userPrompt), {
      model: currentAnalysisModel()
    });
    aiKeyRejectedMessage = "";
    document.querySelector("#analysisTitle").textContent = "ข้อเสนอจาก AI สำหรับธุรกิจนี้";
    result.innerHTML = `${evidenceMarkup}<article class="chat-message user-message"><span>คำถามของคุณ</span><p>${escapeHTML(userPrompt)}</p></article><article class="chat-message assistant-message"><span>AI Business Analyst</span><p>${escapeHTML(data.analysis)}</p></article>`;
    result.dataset.hasAnalysis = "true";
    status.textContent = "วิเคราะห์แล้ว";
  } catch (error) {
    // ข้อความไทยทุกกรณีมาจาก app/ai-provider.js ที่เดียว และแยกกันตามสาเหตุจริง
    // (key ผิดรูปแบบ / ถูกปฏิเสธ / ไม่มีสิทธิ์ใช้โมเดล / เครดิตหมด / เน็ตล่ม / ตอบว่าง)
    const code = error?.code || "provider_error";
    const errorText = error?.message || providerErrorMessage("provider_error");
    // แสดงข้อความดิบของผู้ให้บริการควบคู่กับคำอธิบายภาษาไทย
    //
    // คำอธิบายของเราคือการตีความ ส่วนบรรทัดนี้คือสิ่งที่ผู้ให้บริการพูดจริง
    // เมื่อทั้งสองไม่ตรงกัน ผู้ใช้จะเห็นทันทีว่าเราตีความพลาด แทนที่จะไล่แก้ผิดทาง
    // ตามคำแนะนำที่ผิดของเราไปเรื่อย ๆ โดยไม่มีทางรู้ตัว
    const upstreamDetail = error?.upstreamMessage
      ? `<p class="error-upstream"><strong>ข้อความจากผู้ให้บริการ:</strong> ${escapeHTML(error.upstreamMessage)}${error.upstreamCode ? ` (${escapeHTML(error.upstreamCode)})` : ""}</p>`
      : "";
    const titles = {
      unauthorized: "API key ถูกปฏิเสธ",
      invalid_key_format: "รูปแบบ API key ไม่ถูกต้อง",
      missing_key: "ยังตั้งค่า API key ไม่ครบ",
      model_not_found: "บัญชีนี้ยังใช้โมเดลที่เลือกไม่ได้",
      forbidden: "บัญชีนี้ไม่มีสิทธิ์เรียกใช้บริการ",
      insufficient_quota: "บัญชี OpenAI ไม่มีเครดิตเหลือ",
      rate_limited: "ส่งคำถามถี่เกินไปชั่วคราว",
      edge_rate_limited: "ถูกจำกัดโดยระบบของเราเอง",
      network: "เชื่อมต่อบริการ AI ไม่สำเร็จ",
      empty_analysis: "AI ตอบกลับมาแบบไม่มีเนื้อหา"
    };
    document.querySelector("#analysisTitle").textContent = titles[code] || "ยังวิเคราะห์ไม่สำเร็จ";
    result.innerHTML = `${evidenceMarkup}<article class="chat-message user-message"><span>คำถามของคุณ</span><p>${escapeHTML(userPrompt)}</p></article><article class="chat-message assistant-message error-message"><span>ระบบวิเคราะห์</span><p>${escapeHTML(errorText)}</p>${upstreamDetail}<p>ข้อมูล Snapshot ด้านบนและคำถามของคุณยังอยู่ครบ แก้ตามคำแนะนำแล้วส่งใหม่ได้ทันที</p></article>`;
    result.dataset.hasAnalysis = "true";
    status.textContent = "เกิดข้อผิดพลาด";

    // ชั้นตรวจที่สองของ ADR ข้อ 4.6: key ที่ผ่านชั้นรูปแบบแล้วแต่ถูกปฏิเสธจริง
    // ต้องล้างสถานะ "พร้อมใช้งาน" แล้วพา focus กลับไปที่ช่องกรอก key
    if (code === "unauthorized" || code === "invalid_key_format" || code === "missing_key" || code === "forbidden") {
      aiKeyRejectedMessage = errorText;
      renderAiKeyState();
      document.querySelector("#aiKeyInput").focus();
    } else if (code === "model_not_found") {
      aiKeyRejectedMessage = errorText;
      renderAiKeyState();
      document.querySelector("#aiModelInput").focus();
      document.querySelector("#aiModelInput").select();
    }
  } finally {
    analysisInFlight = false;
    prompt.readOnly = false;
    focusSelect.disabled = false;
    quickButtons.forEach((quickButton) => { quickButton.disabled = false; });
    formElement.removeAttribute("aria-busy");
    button.textContent = "ส่งคำถามให้ AI";
    renderAiKeyState();
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
  markBackupTaken();
  notify("ส่งออกข้อมูลเป็นไฟล์ JSON แล้ว เก็บไฟล์นี้ไว้ให้ดี เป็นสำเนาเดียวที่กู้คืนได้");
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
  // Set Zero ต้องลบ API key ของผู้ใช้ทั้ง sessionStorage และ localStorage ด้วย
  // (ADR-001 ข้อ 4.5) เพราะเหตุผลหลักที่คนกด Set Zero คือ "ส่งเครื่องนี้ให้คนอื่นใช้ต่อ"
  clearStoredKey();
  aiKeyRejectedMessage = "";
  document.querySelector("#aiKeyInput").value = "";
  document.querySelector("#aiKeyInput").type = "password";
  document.querySelector("#aiKeyRemember").checked = false;
  document.querySelector("#aiKeyReveal").setAttribute("aria-pressed", "false");
  document.querySelector("#aiKeyReveal").textContent = "แสดง key";
  delete document.querySelector("#analysisResult").dataset.hasAnalysis;
  document.querySelector("#resetDialog").close();
  renderAll();
  renderAiKeyState();
  resetCustomerFormDefaults();
  showView("dashboard", { focusHeading: true });
  notify("Set Zero เรียบร้อย ข้อมูลธุรกิจทั้งหมดเริ่มต้นที่ศูนย์ และลบ API key ออกจากเครื่องนี้แล้ว");
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
  document.querySelector("#importFileSummary").innerHTML = `<span><svg class="ui-icon" aria-hidden="true"><use href="/icons.svg?v=23#clipboard"></use></svg><strong>${escapeHTML(file.name)}</strong></span><span>${escapeHTML(parsed.format.toUpperCase())}</span><span>${escapeHTML(`${Math.max(1, Math.ceil(file.size / 1024))} KB`)}</span>`;
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

document.querySelector("#backupReminderExport").addEventListener("click", exportStateData);

// จำมุมมองที่เปิดค้างไว้ล่าสุด
//
// ลิงก์ที่มี hash ต้องชนะเสมอ เพราะผู้ใช้ที่กดลิงก์ "ดูมุมมองฝ่ายขาย" ที่เพื่อนส่งมา
// ตั้งใจจะเปิดมุมมองนั้นจริง ๆ ไม่ใช่มุมมองที่ตัวเองเปิดค้างไว้เมื่อวาน
function rememberedRoute() {
  if (location.hash.length > 1) return location.hash.slice(1);
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY) || "";
    return VALID_VIEWS.includes(String(saved).split("/")[0]) ? saved : "dashboard/owner";
  } catch {
    return "dashboard/owner";
  }
}

setDefaultDueDate();
renderAll();
renderAiKeyState();
showView(rememberedRoute(), { historyMode: "replace" });
