// ทดสอบเครื่องวิเคราะห์ธุรกิจด้วยข้อมูลที่คุมค่าไว้ทุกตัว แล้วตรวจตัวเลขที่คำนวณด้วยมือได้
//
// นี่คือข้อได้เปรียบที่สำคัญที่สุดของการวิเคราะห์แบบกฎตายตัวเหนือ AI: ผลลัพธ์คงที่
// จึงยืนยันความถูกต้องได้จริง ถ้าสูตรคำนวณเพี้ยนเมื่อไร ชุดตรวจนี้จะจับได้ทันที
// ต่างจากคำตอบของ AI ที่ตรวจว่า "ถูก" หรือ "ผิด" ด้วย assertion ไม่ได้เลย

import assert from "node:assert/strict";
import {
  buildInsightReport,
  callQueue,
  channelPerformance,
  journeyBottleneck,
  offerMargins,
  revenueGap,
  taskRisks,
  weightedForecast
} from "../app/business-insights.js";

let passed = 0;
function check(label, run) {
  run();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

const TODAY = "2026-08-09";

// ข้อมูลทดสอบที่คำนวณผลลัพธ์ด้วยมือได้ทุกตัว:
//   ชนะแล้ว: d1 = 20,000
//   เปิดอยู่: d2 = 100,000 @80%, d3 = 50,000 @20%, d4 = 30,000 @70%
//   เป้า 200,000 → ขาด 180,000
//   ถ่วงน้ำหนัก = 80,000 + 10,000 + 21,000 = 111,000
//   commit ได้ (>=70%) = 100,000 + 30,000 = 130,000
const fixture = {
  businessProfile: { businessName: "ร้านทดสอบ", businessMode: "online", revenueTarget: 200000 },
  customers: [
    { id: "c1", fullName: "ลูกค้า หนึ่ง", source: "Facebook", solutionPackageId: "p1" },
    { id: "c2", fullName: "ลูกค้า สอง", source: "Facebook", solutionPackageId: "p2" },
    { id: "c3", fullName: "ลูกค้า สาม", source: "Website", solutionPackageId: "p1" },
    { id: "c4", fullName: "ลูกค้า สี่", source: "Referral", solutionPackageId: "" }
  ],
  leads: [
    { id: "l1", customerId: "c1", status: "Proposal Sent", assignedTo: "ทีมขาย", leadScore: 90, nextFollowUp: "2026-08-01" },
    { id: "l2", customerId: "c2", status: "Interested", assignedTo: "ทีมขาย", leadScore: 60, nextFollowUp: "2026-12-01" },
    { id: "l3", customerId: "c3", status: "New Lead", assignedTo: "", leadScore: 20, nextFollowUp: "2026-12-01" },
    { id: "l4", customerId: "c4", status: "Interested", assignedTo: "ทีมขาย", leadScore: 55, nextFollowUp: "2026-12-01" }
  ],
  products: [
    { id: "p1", name: "แพ็กกำไรดี", category: "Package", price: 100000, cost: 20000 },
    { id: "p2", name: "แพ็กกำไรบาง", category: "บริการ", price: 50000, cost: 45000 },
    { id: "p3", name: "แพ็กไม่มีคนซื้อ", category: "สินค้า", price: 10000, cost: 9000 }
  ],
  deals: [
    { id: "d1", customerId: "c1", productId: "p1", name: "ดีลที่ชนะแล้ว", value: 20000, stage: "Won", probability: 100 },
    { id: "d2", customerId: "c1", productId: "p1", name: "ดีลใหญ่ใกล้ปิด", value: 100000, stage: "Negotiation", probability: 80 },
    { id: "d3", customerId: "c2", productId: "p2", name: "ดีลโอกาสน้อย", value: 50000, stage: "Qualified", probability: 20 },
    { id: "d4", customerId: "c3", productId: "p1", name: "ดีลกลาง", value: 30000, stage: "Proposal", probability: 70 }
  ],
  tasks: [
    { id: "t1", title: "งานเลยกำหนดนาน", owner: "ทีมขาย", dueDate: "2026-07-01", priority: "High", status: "todo" },
    { id: "t2", title: "งานเลยกำหนดไม่นาน", owner: "ทีมขาย", dueDate: "2026-08-05", priority: "Medium", status: "in_progress" },
    { id: "t3", title: "งานยังไม่ถึงกำหนด", owner: "ฝ่ายบัญชี", dueDate: "2026-12-31", priority: "Low", status: "todo" },
    { id: "t4", title: "งานเสร็จแล้ว", owner: "ทีมขาย", dueDate: "2026-07-01", priority: "High", status: "done" }
  ]
};

const emptyState = {
  businessProfile: { businessName: "", businessMode: "online", revenueTarget: 0 },
  customers: [], leads: [], products: [], deals: [], tasks: []
};

console.log("การ์ด 1 — ช่องว่างถึงเป้ารายได้:");

check("นับรายได้เฉพาะดีลที่ชนะ และคำนวณช่องว่างถูก", () => {
  const result = revenueGap(fixture);
  assert.equal(result.target, 200000);
  assert.equal(result.achieved, 20000);
  assert.equal(result.gap, 180000);
  assert.equal(result.achievedPercent, 10);
});

check("เสนอดีลที่ควรปิดโดยเรียงจากมูลค่าคาดหวังสูงสุดก่อน", () => {
  const result = revenueGap(fixture);
  assert.equal(result.dealsToClose[0].id, "d2", "ดีลที่มูลค่าคาดหวังสูงสุด (100,000 × 80% = 80,000) ต้องมาก่อน");
  assert.equal(result.dealsToClose[0].expectedValue, 80000);
  // ต้องหยิบดีลจนกว่ามูลค่ารวมจะปิดช่องว่าง 180,000 ได้
  const total = result.dealsToClose.reduce((sum, deal) => sum + deal.value, 0);
  assert.ok(total >= 180000, `ดีลที่เสนอรวมกัน ${total} ยังปิดช่องว่าง 180,000 ไม่ได้`);
});

check("บอกตรง ๆ เมื่อดีลที่เปิดอยู่ทั้งหมดยังไม่พอปิดช่องว่าง", () => {
  const tight = { ...fixture, businessProfile: { ...fixture.businessProfile, revenueTarget: 900000 } };
  assert.equal(revenueGap(tight).coverableByOpenDeals, false, "ต้องบอกว่าปิดไม่ได้ เพื่อให้เจ้าของรู้ว่าต้องหา Lead ใหม่ ไม่ใช่แค่ตามดีลเดิม");
  assert.equal(revenueGap(fixture).coverableByOpenDeals, true);
});

check("ยังไม่ตั้งเป้า → ไม่พังและบอกวิธีแก้", () => {
  const result = revenueGap(emptyState);
  assert.equal(result.gap, 0);
  assert.match(result.reason, /ยังไม่ได้ตั้งเป้า/);
});

console.log("\nการ์ด 2 — Forecast ถ่วงน้ำหนัก:");

check("ถ่วงน้ำหนักด้วยโอกาสปิดจริง ไม่ใช่มูลค่าดิบ", () => {
  const result = weightedForecast(fixture);
  assert.equal(result.rawPipeline, 180000, "มูลค่าดิบ = 100,000 + 50,000 + 30,000");
  assert.equal(result.weighted, 111000, "ถ่วงน้ำหนัก = 80,000 + 10,000 + 21,000");
});

check("แยกยอดที่ปิดได้แล้ว ยอดที่รับปากได้ ยอดที่น่าจะเป็น และยอดสูงสุด", () => {
  const result = weightedForecast(fixture);
  assert.equal(result.banked, 20000, "เงินที่ปิดได้แล้วคือค่าต่ำสุดจริง เพราะไม่มีทางลดลง");
  assert.equal(result.committedCase, 150000, "ชนะแล้ว 20,000 + ดีลที่โอกาส ≥70% เต็มมูลค่า 130,000");
  assert.equal(result.likelyCase, 131000, "ชนะแล้ว 20,000 + ถ่วงน้ำหนัก 111,000");
  assert.equal(result.bestCase, 200000, "ชนะแล้ว 20,000 + Pipeline ดิบ 180,000");
});

// committedCase คิดดีลโอกาสสูงเต็มมูลค่า จึงมากกว่า likelyCase ได้เมื่อ Pipeline
// ส่วนใหญ่เป็นดีลโอกาสสูง มันเป็นคนละคำถามกัน ไม่ใช่ช่วงบน-ล่างของค่าเดียวกัน
// สิ่งที่ต้องจริงเสมอคือทุกค่าอยู่ระหว่างเงินที่ปิดได้แล้วกับกรณีที่ทุกดีลชนะ
check("ทุกตัวเลขคาดการณ์ต้องอยู่ระหว่างยอดที่ปิดได้แล้วกับยอดสูงสุด", () => {
  for (const state of [fixture, emptyState]) {
    const result = weightedForecast(state);
    for (const key of ["committedCase", "likelyCase"]) {
      assert.ok(result[key] >= result.banked, `${key} (${result[key]}) น้อยกว่ายอดที่ปิดได้แล้ว (${result.banked}) ซึ่งเป็นไปไม่ได้`);
      assert.ok(result[key] <= result.bestCase, `${key} (${result[key]}) มากกว่ากรณีที่ทุกดีลชนะ (${result.bestCase}) ซึ่งเป็นไปไม่ได้`);
    }
  }
});

check("ไม่มีดีลเปิดอยู่ → ทุกค่าเป็นศูนย์ ไม่ใช่ NaN", () => {
  const result = weightedForecast(emptyState);
  for (const key of ["rawPipeline", "weighted", "banked", "committedCase", "likelyCase", "bestCase"]) {
    assert.equal(result[key], 0, `${key} ต้องเป็น 0`);
  }
});

console.log("\nการ์ด 3 — คิวที่ต้องติดตามก่อน:");

check("Lead ที่เลยนัดติดตามและมีดีลใหญ่ถูกดันขึ้นอันดับหนึ่ง", () => {
  const result = callQueue(fixture, TODAY);
  assert.equal(result.queue[0].leadId, "l1");
  assert.equal(result.queue[0].overdueDays, 8, "2026-08-01 ถึง 2026-08-09 คือ 8 วัน");
});

check("ทุกอันดับต้องบอกเหตุผลได้ ไม่ใช่คะแนนลอย ๆ", () => {
  const result = callQueue(fixture, TODAY);
  for (const item of result.queue) {
    assert.ok(item.reasons.length > 0, `Lead ${item.leadId} ไม่มีเหตุผลกำกับ`);
    assert.ok(item.reasons.every((reason) => typeof reason === "string" && reason.trim()), "เหตุผลต้องเป็นข้อความที่อ่านได้");
  }
  assert.ok(result.queue[0].reasons.some((reason) => /เลยนัดติดตาม/.test(reason)), "อันดับหนึ่งต้องบอกว่าเลยนัดติดตาม");
});

check("นับ Lead ที่ยังไม่มีผู้รับผิดชอบได้ถูก", () => {
  const result = callQueue(fixture, TODAY);
  assert.equal(result.unassignedCount, 1, "l3 ยังไม่มีผู้รับผิดชอบ");
  assert.equal(result.overdueCount, 1);
});

check("Lead ที่ยังไม่ถึงนัดต้องไม่ถูกนับว่าเลยกำหนด", () => {
  const result = callQueue(fixture, TODAY);
  const future = result.queue.find((item) => item.leadId === "l2");
  assert.equal(future.overdueDays, 0);
});

console.log("\nการ์ด 4 — กำไรรายข้อเสนอ:");

check("คำนวณกำไรขั้นต้นและเปอร์เซ็นต์ถูก", () => {
  const result = offerMargins(fixture);
  const good = result.offers.find((offer) => offer.id === "p1");
  assert.equal(good.margin, 80000);
  assert.equal(good.marginPercent, 80);
});

check("จับข้อเสนอที่มีคนสนใจแต่กำไรต่ำกว่าค่าเฉลี่ยได้", () => {
  const result = offerMargins(fixture);
  const thin = result.thinMargin.map((offer) => offer.id);
  assert.ok(thin.includes("p2"), "แพ็กกำไรบาง (10%) ที่มีลูกค้าใช้อยู่ต้องถูกเตือน");
  assert.ok(!thin.includes("p3"), "แพ็กที่ยังไม่มีใครสนใจไม่ควรอยู่ในรายการเร่งแก้");
});

check("เรียงจากกำไรมากไปน้อย", () => {
  const result = offerMargins(fixture);
  const margins = result.offers.map((offer) => offer.margin);
  assert.deepEqual(margins, [...margins].sort((a, b) => b - a));
  assert.equal(result.bestMargin.id, "p1");
});

check("ราคาเป็นศูนย์ต้องไม่ทำให้เปอร์เซ็นต์กลายเป็น NaN หรือ Infinity", () => {
  const free = { ...fixture, products: [{ id: "px", name: "ของแถม", category: "สินค้า", price: 0, cost: 0 }] };
  const result = offerMargins(free);
  assert.equal(result.offers[0].marginPercent, 0);
  assert.ok(Number.isFinite(result.averageMarginPercent));
});

console.log("\nการ์ด 5 — ช่องทางไหนคุ้ม:");

check("เรียงช่องทางจากรายได้จริง ไม่ใช่จำนวนลูกค้า", () => {
  const result = channelPerformance(fixture);
  assert.equal(result.topByRevenue.source, "Facebook");
  assert.equal(result.topByRevenue.revenue, 20000);
});

check("จับช่องทางที่มีลูกค้าแต่ยังไม่เคยสร้างรายได้", () => {
  const result = channelPerformance(fixture);
  const sources = result.noRevenueYet.map((channel) => channel.source);
  assert.ok(sources.includes("Website"), "Website มีลูกค้าและมีดีลเปิดอยู่ แต่ยังไม่เคยปิดได้");
  assert.ok(sources.includes("Referral"), "Referral มีลูกค้าแต่ยังไม่มีดีลเลย");
});

check("อัตราปิดคิดจาก Lead ของช่องทางนั้น และไม่หารด้วยศูนย์", () => {
  const result = channelPerformance(fixture);
  for (const channel of result.channels) {
    assert.ok(Number.isFinite(channel.conversionRate), `${channel.source} มีอัตราปิดที่ไม่ใช่ตัวเลข`);
    assert.ok(channel.conversionRate >= 0 && channel.conversionRate <= 100, `${channel.source} มีอัตราปิดนอกช่วง 0-100`);
  }
});

console.log("\nการ์ด 6 — คอขวดใน Customer Journey:");

check("ชี้ขั้นที่ Lead กองมากที่สุด", () => {
  const result = journeyBottleneck(fixture);
  assert.equal(result.bottleneck.status, "Interested", "l2 กับ l4 อยู่ขั้นนี้ มากกว่าขั้นอื่นที่มีขั้นละ 1");
  assert.equal(result.bottleneck.count, 2);
});

check("สัดส่วนแต่ละขั้นรวมกันได้ 100%", () => {
  const result = journeyBottleneck(fixture);
  const total = result.stages.reduce((sum, stage) => sum + stage.sharePercent, 0);
  assert.ok(Math.abs(total - 100) < 0.5, `สัดส่วนรวม ${total}% ไม่ใช่ 100%`);
});

check("สัดส่วนที่ผ่านขั้นไปแล้วต้องลดลงเรื่อย ๆ ตาม Journey", () => {
  const result = journeyBottleneck(fixture);
  const passed = result.stages.map((stage) => stage.passedPercent);
  for (let index = 1; index < passed.length; index += 1) {
    assert.ok(passed[index] <= passed[index - 1], `ขั้น ${index} มีคนผ่านมากกว่าขั้นก่อนหน้า ซึ่งเป็นไปไม่ได้`);
  }
});

console.log("\nงานและความเสี่ยง:");

check("นับเฉพาะงานที่ยังไม่เสร็จ และเรียงงานที่ค้างนานที่สุดก่อน", () => {
  const result = taskRisks(fixture, TODAY);
  assert.equal(result.openCount, 3, "t4 เสร็จแล้วต้องไม่ถูกนับ");
  assert.equal(result.overdueCount, 2);
  assert.equal(result.overdue[0].id, "t1", "งานที่ค้างนานที่สุดต้องมาก่อน");
  assert.equal(result.overdue[0].lateDays, 39);
});

check("สรุปภาระงานต่อผู้รับผิดชอบได้", () => {
  const result = taskRisks(fixture, TODAY);
  assert.equal(result.workload[0].owner, "ทีมขาย");
  assert.equal(result.workload[0].count, 2, "นับเฉพาะงานที่ยังไม่เสร็จ");
});

console.log("\nรายงานรวม:");

check("buildInsightReport รวมทุกการ์ดและไม่มีค่าที่ไม่ใช่ตัวเลขหลุดออกมา", () => {
  const report = buildInsightReport(fixture, TODAY);
  for (const key of ["metrics", "revenueGap", "forecast", "callQueue", "offers", "channels", "journey", "tasks"]) {
    assert.ok(report[key], `รายงานขาดส่วน ${key}`);
  }
  const serialised = JSON.stringify(report);
  assert.ok(!serialised.includes("null,"), "พบค่า null ในรายงาน");
  assert.ok(!/NaN|Infinity/.test(serialised), "พบ NaN หรือ Infinity ในรายงาน");
});

check("ระบบว่างเปล่าต้องสร้างรายงานได้โดยไม่ throw และไม่มี NaN", () => {
  const report = buildInsightReport(emptyState, TODAY);
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(report)), "รายงานของระบบว่างมี NaN");
  for (const section of ["revenueGap", "forecast", "callQueue", "offers", "channels", "journey", "tasks"]) {
    assert.ok(report[section].reason, `${section} ไม่ได้อธิบายว่าทำไมถึงไม่มีข้อมูล`);
  }
});

check("ทุกการ์ดต้องมีคำอธิบายที่มาของตัวเลขเสมอ", () => {
  const report = buildInsightReport(fixture, TODAY);
  for (const section of ["revenueGap", "forecast", "callQueue", "offers", "channels", "journey", "tasks"]) {
    assert.ok(report[section].reason?.trim(), `${section} ไม่มีคำอธิบาย ตัวเลขลอย ๆ ทำให้ตรวจสอบไม่ได้`);
  }
});

console.log(`\nBusiness insights passed: ${passed} behaviour assertions`);
