// เครื่องวิเคราะห์ธุรกิจแบบกฎตายตัว — ไม่ใช้ AI ไม่ต้องมี API key ไม่ต้องต่อเน็ต
//
// เหตุผลที่ต้องมี: 9 ใน 10 มิติที่เคยส่งให้ AI วิเคราะห์เป็นเลขคณิตล้วนที่คำนวณจาก
// ข้อมูลในระบบได้ตรง ๆ AI ไม่ได้ทำหน้าที่วิเคราะห์ แต่ทำหน้าที่เรียบเรียงเป็นภาษาคน
// การย้ายส่วนคำนวณมาทำเองทำให้ผู้ใช้ทุกคนได้คำตอบทันทีตั้งแต่นาทีแรกโดยไม่ต้องมี key
// และที่สำคัญกว่านั้นคือผลลัพธ์คงที่ ทดสอบด้วย assertion ได้จริง ซึ่ง AI ทำไม่ได้
//
// กฎของไฟล์นี้เหมือน state-model.js: รับ state เป็นพารามิเตอร์เสมอ ห้ามแตะ DOM
// ห้ามอ่านตัวแปรส่วนกลาง เพราะ scripts/check-business-insights.mjs เรียกตรงใน Node
//
// ทุกฟังก์ชันต้องคืน "เหตุผล" ควบคู่กับตัวเลขเสมอ ตัวเลขลอย ๆ ที่ไม่บอกที่มาทำให้
// เจ้าของธุรกิจตัดสินใจไม่ได้ และตรวจสอบไม่ได้ว่าระบบคิดถูกหรือเปล่า

import { businessModes, dealStages, leadStatusLabels, leadStatuses } from "./business-config.js?v=23";
import { computeMetrics, revenueTargetOf, todayIso } from "./state-model.js?v=23";

const OPEN_STAGES = dealStages.filter((stage) => !["Won", "Lost"].includes(stage));

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function customerOf(state, customerId) {
  return state.customers.find((customer) => customer.id === customerId);
}

// ---------- การ์ด 1: ช่องว่างถึงเป้ารายได้ ----------
// ตอบคำถามเดียวที่เจ้าของธุรกิจถามบ่อยที่สุด: "ขาดอีกเท่าไร และต้องปิดดีลไหน"
export function revenueGap(state) {
  const target = revenueTargetOf(state);
  const won = state.deals.filter((deal) => deal.stage === "Won");
  const achieved = won.reduce((sum, deal) => sum + toNumber(deal.value), 0);
  const gap = Math.max(0, target - achieved);

  // เรียงดีลที่ยังเปิดอยู่ตามมูลค่าคาดหวัง แล้วไล่หยิบจนกว่าจะปิดช่องว่างได้
  const candidates = state.deals
    .filter((deal) => OPEN_STAGES.includes(deal.stage))
    .map((deal) => ({
      id: deal.id,
      name: deal.name,
      customerName: customerOf(state, deal.customerId)?.fullName || "ไม่ระบุลูกค้า",
      value: toNumber(deal.value),
      probability: toNumber(deal.probability),
      expectedValue: round(toNumber(deal.value) * toNumber(deal.probability) / 100)
    }))
    .sort((a, b) => b.expectedValue - a.expectedValue);

  const dealsToClose = [];
  let running = 0;
  for (const deal of candidates) {
    if (running >= gap) break;
    dealsToClose.push(deal);
    running += deal.value;
  }

  return {
    target,
    achieved,
    gap,
    achievedPercent: target > 0 ? round((achieved / target) * 100, 1) : 0,
    // ปิดช่องว่างได้ไหมถ้าดีลที่เปิดอยู่ทั้งหมดชนะ — ถ้าไม่ได้แปลว่าต้องหา Lead ใหม่ ไม่ใช่แค่ตามดีลเดิม
    coverableByOpenDeals: candidates.reduce((sum, deal) => sum + deal.value, 0) >= gap,
    dealsToClose,
    reason: target === 0
      ? "ยังไม่ได้ตั้งเป้ารายได้ ไปตั้งค่าที่หน้าโปรไฟล์ธุรกิจก่อน ระบบจึงจะคำนวณช่องว่างให้ได้"
      : gap === 0
        ? `ถึงเป้าแล้วจากดีลที่ชนะ ${won.length} รายการ`
        : `ขาดอีก ${gap.toLocaleString("th-TH")} บาท ต้องปิดดีลที่เปิดอยู่อีก ${dealsToClose.length} รายการ`
  };
}

// ---------- การ์ด 2: Forecast ถ่วงน้ำหนัก ----------
// มูลค่า Pipeline ดิบมักหลอกให้เจ้าของธุรกิจมองโลกในแง่ดีเกินจริง เพราะรวมดีลที่
// โอกาสปิด 10% เข้ากับดีลที่โอกาส 90% เท่า ๆ กัน จึงต้องถ่วงด้วย probability
export function weightedForecast(state) {
  const openDeals = state.deals.filter((deal) => OPEN_STAGES.includes(deal.stage));
  const rawPipeline = openDeals.reduce((sum, deal) => sum + toNumber(deal.value), 0);
  const weighted = openDeals.reduce((sum, deal) => sum + toNumber(deal.value) * toNumber(deal.probability) / 100, 0);
  const won = state.deals.filter((deal) => deal.stage === "Won").reduce((sum, deal) => sum + toNumber(deal.value), 0);

  // ดีลที่โอกาสปิดตั้งแต่ 70% ขึ้นไปคือกลุ่มที่ทีมขาย "รับปากได้" ตามเกณฑ์ที่ใช้กันทั่วไป
  //
  // ระวังการตีความ: ตัวเลขนี้ไม่ใช่ค่าต่ำสุดของช่วงคาดการณ์ มันคิดดีลกลุ่มนี้เต็มมูลค่า
  // จึงมากกว่าค่าถ่วงน้ำหนักได้เมื่อ Pipeline ส่วนใหญ่เป็นดีลโอกาสสูง เป็นคนละคำถามกัน
  // ค่าต่ำสุดจริงคือเงินที่ปิดได้แล้ว (banked) เพราะเป็นยอดเดียวที่ไม่มีทางลดลง
  const committed = openDeals
    .filter((deal) => toNumber(deal.probability) >= 70)
    .reduce((sum, deal) => sum + toNumber(deal.value), 0);

  const byStage = OPEN_STAGES.map((stage) => {
    const deals = openDeals.filter((deal) => deal.stage === stage);
    return {
      stage,
      count: deals.length,
      value: deals.reduce((sum, deal) => sum + toNumber(deal.value), 0),
      weighted: round(deals.reduce((sum, deal) => sum + toNumber(deal.value) * toNumber(deal.probability) / 100, 0))
    };
  }).filter((entry) => entry.count > 0);

  return {
    rawPipeline,
    weighted: round(weighted),
    banked: won,
    committedCase: won + committed,
    likelyCase: round(won + weighted),
    bestCase: won + rawPipeline,
    byStage,
    reason: openDeals.length === 0
      ? "ยังไม่มีดีลที่เปิดอยู่ ระบบจึงคาดการณ์รายได้ล่วงหน้าไม่ได้"
      : `ถ่วงน้ำหนักจาก ${openDeals.length} ดีลที่เปิดอยู่ มูลค่าดิบ ${rawPipeline.toLocaleString("th-TH")} บาท เหลือ ${round(weighted).toLocaleString("th-TH")} บาทเมื่อคิดโอกาสปิดจริง`
  };
}

// ---------- การ์ด 3: คิวที่ต้องติดตามก่อน ----------
// คะแนนต้องอธิบายได้ทีละองค์ประกอบ ไม่ใช่เลขวิเศษ เพราะฝ่ายขายจะเชื่อลำดับนี้
// ก็ต่อเมื่อเห็นว่าทำไม Lead นี้ถึงอยู่อันดับหนึ่ง
export function callQueue(state, referenceDate = todayIso()) {
  const dealValueByCustomer = state.deals
    .filter((deal) => OPEN_STAGES.includes(deal.stage))
    .reduce((acc, deal) => {
      acc[deal.customerId] = (acc[deal.customerId] || 0) + toNumber(deal.value);
      return acc;
    }, {});

  const maxDealValue = Math.max(1, ...Object.values(dealValueByCustomer));

  const ranked = state.leads.map((lead) => {
    const customer = customerOf(state, lead.customerId);
    const stageIndex = Math.max(0, leadStatuses.indexOf(lead.status));
    const dealValue = dealValueByCustomer[lead.customerId] || 0;
    const overdueDays = lead.nextFollowUp && lead.nextFollowUp < referenceDate
      ? Math.round((Date.parse(referenceDate) - Date.parse(lead.nextFollowUp)) / 86400000)
      : 0;

    const reasons = [];
    // คะแนนความสนใจที่บันทึกไว้ — น้ำหนักมากสุดเพราะเป็นการประเมินจากคนที่คุยจริง
    const scorePart = toNumber(lead.leadScore) * 0.4;
    if (toNumber(lead.leadScore) >= 70) reasons.push(`คะแนนความสนใจสูง ${toNumber(lead.leadScore)}`);

    // ยิ่งใกล้ปิดยิ่งเสียดายถ้าปล่อยหลุด
    const stagePart = (stageIndex / Math.max(1, leadStatuses.length - 1)) * 25;
    if (stageIndex >= leadStatuses.length - 1) reasons.push(`ส่งข้อเสนอแล้ว รอการตัดสินใจ`);

    // ดีลมูลค่าสูงคุ้มกับเวลาที่ใช้ตามมากกว่า
    const valuePart = (dealValue / maxDealValue) * 20;
    if (dealValue > 0) reasons.push(`มีดีลเปิดอยู่ ${dealValue.toLocaleString("th-TH")} บาท`);

    // เลยนัดติดตามคือสัญญาณเสียลูกค้าที่แก้ได้ทันที จึงดันขึ้นแรงสุด
    const overduePart = overdueDays > 0 ? Math.min(30, 15 + overdueDays) : 0;
    if (overdueDays > 0) reasons.push(`เลยนัดติดตามมา ${overdueDays} วัน`);

    return {
      leadId: lead.id,
      customerId: lead.customerId,
      customerName: customer?.fullName || "ไม่ระบุลูกค้า",
      source: customer?.source || "ไม่ระบุช่องทาง",
      status: lead.status,
      statusLabel: leadStatusLabels[lead.status] || lead.status,
      assignedTo: lead.assignedTo || "ยังไม่มีผู้รับผิดชอบ",
      leadScore: toNumber(lead.leadScore),
      dealValue,
      nextFollowUp: lead.nextFollowUp || "",
      overdueDays,
      priorityScore: round(scorePart + stagePart + valuePart + overduePart, 1),
      reasons: reasons.length ? reasons : ["ยังไม่มีสัญญาณเร่งด่วน ติดตามตามรอบปกติ"]
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    queue: ranked,
    overdueCount: ranked.filter((item) => item.overdueDays > 0).length,
    unassignedCount: ranked.filter((item) => item.assignedTo === "ยังไม่มีผู้รับผิดชอบ").length,
    reason: ranked.length === 0
      ? "ยังไม่มี Lead ในระบบ"
      : `เรียงจากคะแนนความสนใจ ขั้นที่ไปถึง มูลค่าดีลที่เปิดอยู่ และวันที่เลยนัดติดตาม`
  };
}

// ---------- การ์ด 4: กำไรรายข้อเสนอ ----------
// ราคาขายสูงไม่ได้แปลว่ากำไรดี การ์ดนี้จับกรณี "ขายดีแต่กำไรบาง" ซึ่งมองจาก
// หน้า Pipeline อย่างเดียวไม่มีทางเห็น
export function offerMargins(state) {
  const dealCountByProduct = state.deals.reduce((acc, deal) => {
    if (deal.productId) acc[deal.productId] = (acc[deal.productId] || 0) + 1;
    return acc;
  }, {});
  const customerCountByProduct = state.customers.reduce((acc, customer) => {
    if (customer.solutionPackageId) acc[customer.solutionPackageId] = (acc[customer.solutionPackageId] || 0) + 1;
    return acc;
  }, {});

  const offers = state.products.map((product) => {
    const price = toNumber(product.price);
    const cost = toNumber(product.cost);
    const margin = price - cost;
    const marginPercent = price > 0 ? round((margin / price) * 100, 1) : 0;
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price,
      cost,
      margin,
      marginPercent,
      dealCount: dealCountByProduct[product.id] || 0,
      customerCount: customerCountByProduct[product.id] || 0
    };
  }).sort((a, b) => b.margin - a.margin);

  const withDemand = offers.filter((offer) => offer.dealCount + offer.customerCount > 0);
  const averageMarginPercent = offers.length
    ? round(offers.reduce((sum, offer) => sum + offer.marginPercent, 0) / offers.length, 1)
    : 0;

  // "ขายได้แต่กำไรต่ำกว่าค่าเฉลี่ย" คือรายการที่ควรขึ้นราคาหรือลดต้นทุนก่อนใคร
  const thinMargin = withDemand.filter((offer) => offer.marginPercent < averageMarginPercent);

  return {
    offers,
    averageMarginPercent,
    thinMargin,
    bestMargin: offers[0] || null,
    reason: offers.length === 0
      ? "ยังไม่มีข้อเสนอในระบบ"
      : `กำไรขั้นต้นเฉลี่ย ${averageMarginPercent}% มี ${thinMargin.length} ข้อเสนอที่มีคนสนใจแต่กำไรต่ำกว่าค่าเฉลี่ย`
  };
}

// ---------- การ์ด 5: ช่องทางไหนคุ้ม ----------
// จำนวน Lead มากไม่ได้แปลว่าช่องทางดี ต้องดูถึงรายได้จริงที่ปลายทาง
export function channelPerformance(state) {
  const customersBySource = state.customers.reduce((acc, customer) => {
    const source = customer.source || "ไม่ระบุช่องทาง";
    (acc[source] = acc[source] || []).push(customer.id);
    return acc;
  }, {});

  const channels = Object.entries(customersBySource).map(([source, customerIds]) => {
    const ids = new Set(customerIds);
    const deals = state.deals.filter((deal) => ids.has(deal.customerId));
    const wonDeals = deals.filter((deal) => deal.stage === "Won");
    const revenue = wonDeals.reduce((sum, deal) => sum + toNumber(deal.value), 0);
    const pipeline = deals
      .filter((deal) => OPEN_STAGES.includes(deal.stage))
      .reduce((sum, deal) => sum + toNumber(deal.value), 0);
    const leadCount = state.leads.filter((lead) => ids.has(lead.customerId)).length;

    return {
      source,
      customerCount: customerIds.length,
      leadCount,
      dealCount: deals.length,
      wonCount: wonDeals.length,
      revenue,
      pipeline,
      conversionRate: leadCount > 0 ? round((wonDeals.length / leadCount) * 100, 1) : 0,
      revenuePerCustomer: customerIds.length > 0 ? round(revenue / customerIds.length) : 0
    };
  }).sort((a, b) => b.revenue - a.revenue || b.pipeline - a.pipeline);

  // ช่องทางที่มีลูกค้าเยอะแต่ยังไม่เคยสร้างรายได้เลย คือจุดที่ควรตรวจก่อนลงเงินเพิ่ม
  const noRevenueYet = channels.filter((channel) => channel.revenue === 0 && channel.customerCount > 0);

  return {
    channels,
    topByRevenue: channels[0] || null,
    noRevenueYet,
    reason: channels.length === 0
      ? "ยังไม่มีข้อมูลช่องทางที่มาของลูกค้า"
      : `เทียบจาก ${channels.length} ช่องทาง โดยไล่จากรายได้จริงที่ปิดได้ ไม่ใช่จำนวน Lead`
  };
}

// ---------- การ์ด 6: คอขวดใน Customer Journey ----------
// ขั้นที่ Lead กองมากที่สุดคือขั้นที่ทีมทำงานไม่ทันหรือกระบวนการมีปัญหา
export function journeyBottleneck(state) {
  const total = state.leads.length;
  const mode = businessModes[state.businessProfile?.businessMode] || businessModes.online;
  const journeyLabels = Object.fromEntries(mode.journey.map(([stage, label]) => [stage, label]));

  const stages = leadStatuses.map((status, index) => {
    const count = state.leads.filter((lead) => lead.status === status).length;
    // สัดส่วนที่ผ่านขั้นนี้ไปแล้ว = Lead ที่อยู่ขั้นถัดไปขึ้นไป
    const passed = state.leads.filter((lead) => leadStatuses.indexOf(lead.status) > index).length;
    return {
      status,
      label: leadStatusLabels[status] || status,
      journeyLabel: journeyLabels[status] || "",
      count,
      sharePercent: total > 0 ? round((count / total) * 100, 1) : 0,
      passedPercent: total > 0 ? round((passed / total) * 100, 1) : 0
    };
  });

  const bottleneck = [...stages].sort((a, b) => b.count - a.count)[0] || null;

  return {
    total,
    stages,
    bottleneck,
    reason: total === 0
      ? "ยังไม่มี Lead ในระบบ จึงยังหาคอขวดไม่ได้"
      : `Lead กองอยู่ที่ขั้น “${bottleneck.label}” มากที่สุด ${bottleneck.count} จาก ${total} รายการ`
  };
}

// ---------- งานและความเสี่ยง ----------
export function taskRisks(state, referenceDate = todayIso()) {
  const open = state.tasks.filter((task) => task.status !== "done");
  const overdue = open.filter((task) => task.dueDate && task.dueDate < referenceDate);
  const byOwner = open.reduce((acc, task) => {
    const owner = task.owner || "ยังไม่มีผู้รับผิดชอบ";
    acc[owner] = (acc[owner] || 0) + 1;
    return acc;
  }, {});

  return {
    openCount: open.length,
    overdueCount: overdue.length,
    overdue: overdue.map((task) => ({
      id: task.id,
      title: task.title,
      owner: task.owner || "ยังไม่มีผู้รับผิดชอบ",
      dueDate: task.dueDate,
      priority: task.priority,
      lateDays: Math.round((Date.parse(referenceDate) - Date.parse(task.dueDate)) / 86400000)
    })).sort((a, b) => b.lateDays - a.lateDays),
    workload: Object.entries(byOwner).map(([owner, count]) => ({ owner, count })).sort((a, b) => b.count - a.count),
    reason: open.length === 0
      ? "ไม่มีงานค้างในระบบ"
      : `มีงานค้าง ${open.length} รายการ เลยกำหนดแล้ว ${overdue.length} รายการ`
  };
}

/** รวมทุกการ์ดไว้ในที่เดียว ใช้ทั้งหน้าจอและตัวสร้างรายงาน */
export function buildInsightReport(state, referenceDate = todayIso()) {
  return {
    generatedAt: new Date().toISOString(),
    referenceDate,
    businessName: state.businessProfile?.businessName || "ยังไม่ได้ตั้งชื่อธุรกิจ",
    businessMode: state.businessProfile?.businessMode || "online",
    metrics: computeMetrics(state, referenceDate),
    revenueGap: revenueGap(state),
    forecast: weightedForecast(state),
    callQueue: callQueue(state, referenceDate),
    offers: offerMargins(state),
    channels: channelPerformance(state),
    journey: journeyBottleneck(state),
    tasks: taskRisks(state, referenceDate)
  };
}
