// ทดสอบพฤติกรรมจริงของตรรกะหลัก โดยเรียกฟังก์ชันแล้วตรวจผลลัพธ์
//
// ต่างจาก check-ui-contract.mjs ที่อ่านซอร์สด้วย regex ว่า "มีฟังก์ชันชื่อนี้ไหม"
// ไฟล์นี้เรียกของจริงและตรวจค่าที่ได้ ทำให้จับ regression ที่โค้ดยังอยู่ครบแต่คำนวณผิดได้
//
// ทดสอบได้ใน Node ล้วนเพราะ app/state-model.js กับ app/business-config.js ถูกแยก
// ออกมาไม่ให้แตะ DOM แล้ว ถ้าวันหนึ่งมีคนใส่ document หรือ localStorage กลับเข้าไป
// การ import บรรทัดล่างนี้จะพังทันที ซึ่งเป็นพฤติกรรมที่ต้องการ

import assert from "node:assert/strict";
import {
  alignCustomerType,
  clone,
  computeMetrics,
  countBy,
  escapeHTML,
  initials,
  loadStateFrom,
  normalizeState,
  revenueTargetOf,
  sumDealsBySource,
  validIsoDate
} from "../app/state-model.js";
import {
  businessCatalogs,
  businessModes,
  dealStages,
  leadStatuses,
  seedData,
  taskStatuses,
  AI_KEY_STORAGE_KEY,
  STORAGE_KEY
} from "../app/business-config.js";
import {
  createZeroState,
  detachProductRelations,
  updateProductAcrossState
} from "../app/business-workflows.js";

let passed = 0;
function check(label, run) {
  run();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

// storage จำลองแบบง่ายที่สุดที่ยัง match API ที่โค้ดจริงใช้
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
}

console.log("ข้อมูลตั้งต้นต้องอ้างอิงกันครบ:");

check("ทุก Lead ชี้ไปยัง Customer ที่มีอยู่จริง", () => {
  const customerIds = new Set(seedData.customers.map((customer) => customer.id));
  for (const lead of seedData.leads) {
    assert.ok(customerIds.has(lead.customerId), `Lead ${lead.id} ชี้ไปยัง Customer ${lead.customerId} ที่ไม่มีในระบบ`);
  }
});

check("ทุก Deal ชี้ไปยัง Customer ที่มีอยู่จริง", () => {
  const customerIds = new Set(seedData.customers.map((customer) => customer.id));
  for (const deal of seedData.deals) {
    assert.ok(customerIds.has(deal.customerId), `Deal ${deal.id} ชี้ไปยัง Customer ${deal.customerId} ที่ไม่มีในระบบ`);
  }
});

check("ทุก Lead/Deal/Task ใช้สถานะที่ระบบรู้จัก", () => {
  for (const lead of seedData.leads) assert.ok(leadStatuses.includes(lead.status), `Lead ${lead.id} ใช้สถานะ ${lead.status} ที่ไม่มีใน leadStatuses`);
  for (const deal of seedData.deals) assert.ok(dealStages.includes(deal.stage), `Deal ${deal.id} ใช้ stage ${deal.stage} ที่ไม่มีใน dealStages`);
  for (const task of seedData.tasks) assert.ok(taskStatuses.includes(task.status), `Task ${task.id} ใช้สถานะ ${task.status} ที่ไม่มีใน taskStatuses`);
});

check("ทุก Business Mode มี Catalog และ Journey ครบ 5 ขั้น", () => {
  for (const [mode, config] of Object.entries(businessModes)) {
    assert.ok(Array.isArray(businessCatalogs[mode]), `Business Mode ${mode} ไม่มี catalog`);
    assert.equal(businessCatalogs[mode].length, 4, `Business Mode ${mode} ต้องมี 4 ข้อเสนอ`);
    assert.equal(config.journey.length, 5, `Business Mode ${mode} ต้องมี Customer Journey 5 ขั้น`);
    assert.equal(config.customerTypes.length, 4, `Business Mode ${mode} ต้องมีกลุ่มลูกค้า 4 กลุ่ม`);
  }
});

check("API key ไม่ใช้ storage entry เดียวกับข้อมูลธุรกิจ", () => {
  assert.notEqual(AI_KEY_STORAGE_KEY, STORAGE_KEY);
});

console.log("\nการอ่านและซ่อมข้อมูลที่บันทึกไว้:");

check("ยังไม่เคยบันทึก → ใช้ข้อมูลตั้งต้น", () => {
  const state = loadStateFrom(fakeStorage(), STORAGE_KEY);
  assert.equal(state.customers.length, seedData.customers.length);
});

check("ข้อมูลที่บันทึกไว้พัง (ไม่ใช่ JSON) → ไม่ throw และกลับไปใช้ข้อมูลตั้งต้น", () => {
  const state = loadStateFrom(fakeStorage({ [STORAGE_KEY]: "{ไม่ใช่ json" }), STORAGE_KEY);
  assert.equal(state.customers.length, seedData.customers.length);
});

check("ข้อมูลที่บันทึกไว้ขาด collection → กลับไปใช้ข้อมูลตั้งต้น ไม่ใช่พังทั้งแอป", () => {
  const broken = JSON.stringify({ customers: [], leads: [], products: [] });
  const state = loadStateFrom(fakeStorage({ [STORAGE_KEY]: broken }), STORAGE_KEY);
  assert.equal(state.customers.length, seedData.customers.length);
});

check("ข้อมูลที่บันทึกไว้ถูกต้อง → ใช้ของผู้ใช้ ไม่เขียนทับด้วยข้อมูลตั้งต้น", () => {
  const mine = clone(seedData);
  mine.schemaVersion = 8;
  mine.customers = [{ id: "x1", fullName: "ลูกค้าของฉัน", phone: "0900000000", source: "Website", solutionPackage: "", businessMode: "online" }];
  mine.leads = [];
  mine.deals = [];
  mine.tasks = [];
  const state = loadStateFrom(fakeStorage({ [STORAGE_KEY]: JSON.stringify(mine) }), STORAGE_KEY);
  assert.equal(state.customers.length, 1);
  assert.equal(state.customers[0].fullName, "ลูกค้าของฉัน");
});

check("วันที่พังใน meta ถูกแทนด้วยเวลาปัจจุบัน ไม่ปล่อยเป็น Invalid Date", () => {
  assert.ok(!Number.isNaN(new Date(validIsoDate("ไม่ใช่วันที่")).getTime()));
  assert.equal(validIsoDate("2026-07-22T00:00:00.000Z"), "2026-07-22T00:00:00.000Z");
  assert.ok(!Number.isNaN(new Date(validIsoDate(undefined)).getTime()));
});

check("normalizeState ตั้ง schemaVersion ปัจจุบันและเติมฟิลด์ที่ขาดให้ทุกลูกค้า", () => {
  const state = normalizeState(clone(seedData));
  assert.equal(state.schemaVersion, 8);
  for (const customer of state.customers) {
    assert.ok(customer.customerType, `ลูกค้า ${customer.id} ไม่มี customerType`);
    assert.ok(businessModes[customer.businessMode], `ลูกค้า ${customer.id} มี businessMode ที่ไม่รู้จัก`);
  }
});

// กันบั๊กที่เคยเกิดจริง: seedData ไม่มี schemaVersion ทำให้ normalizeState เข้าใจว่าเป็น
// ข้อมูลเก่ารุ่นก่อน schema 4 แล้วรันขั้นตอนแปลงชื่อ Package ย้อนหลัง ผลคือลูกค้าตั้งต้น
// ทุกคนอ้างชื่อ Package ที่ไม่มีใน products และ solutionPackageId ว่างหมด
// อาการที่ผู้ใช้เจอคือแก้ Package แล้วไม่มีอะไรเปลี่ยนเลยตั้งแต่เปิดแอปครั้งแรก
check("เปิดแอปครั้งแรกแล้วลูกค้าและดีลตั้งต้นผูกกับ Package จริงทุกรายการ", () => {
  const state = loadStateFrom(fakeStorage(), STORAGE_KEY);
  const productIds = new Set(state.products.map((product) => product.id));
  for (const customer of state.customers) {
    assert.ok(customer.solutionPackageId, `ลูกค้า ${customer.fullName} ไม่ได้ผูกกับ Package ใดเลยตั้งแต่เปิดแอปครั้งแรก`);
    assert.ok(productIds.has(customer.solutionPackageId), `ลูกค้า ${customer.fullName} ผูกกับ Package ที่ไม่มีในระบบ`);
  }
  for (const deal of state.deals) {
    assert.ok(deal.productId, `ดีล ${deal.name} ไม่ได้ผูกกับข้อเสนอใดเลยตั้งแต่เปิดแอปครั้งแรก`);
    assert.ok(productIds.has(deal.productId), `ดีล ${deal.name} ผูกกับข้อเสนอที่ไม่มีในระบบ`);
  }
});

check("มูลค่าดีลตั้งต้นตรงกับราคาข้อเสนอที่ผูกไว้", () => {
  const state = loadStateFrom(fakeStorage(), STORAGE_KEY);
  const priceById = new Map(state.products.map((product) => [product.id, Number(product.price)]));
  for (const deal of state.deals) {
    assert.equal(Number(deal.value), priceById.get(deal.productId), `ดีล ${deal.name} มีมูลค่าไม่ตรงกับราคาข้อเสนอที่ผูกไว้`);
  }
});

check("normalizeState แปลงหมวดสินค้าที่ไม่รู้จักให้เป็นหมวดที่ระบบรองรับ", () => {
  const input = clone(seedData);
  input.products = [{ id: "p9", name: "อะไรสักอย่าง", category: "totally-unknown", price: 100, cost: 10, pipelineStage: "ไม่มีขั้นนี้" }];
  const state = normalizeState(input);
  assert.equal(state.products[0].category, "Package");
  assert.equal(state.products[0].pipelineStage, "Proposal", "pipelineStage ที่ไม่รู้จักต้องถูกดันกลับเป็นค่าที่ปลอดภัย");
});

check("customerType ที่ไม่ตรงกับ Business Mode ถูกดึงกลับเป็นค่าแรกของ mode นั้น", () => {
  const aligned = alignCustomerType({ businessMode: "wholesale", customerType: "ลูกค้า VIP" });
  assert.equal(aligned.customerType, businessModes.wholesale.customerTypes[0]);
  const kept = alignCustomerType({ businessMode: "wholesale", customerType: "Key Account" });
  assert.equal(kept.customerType, "Key Account", "ค่าที่ถูกต้องอยู่แล้วต้องไม่ถูกเปลี่ยน");
});

console.log("\nการคำนวณ KPI:");

const metricsFixture = {
  businessProfile: { revenueTarget: 100000 },
  customers: [
    { id: "c1", source: "Facebook" },
    { id: "c2", source: "Facebook" },
    { id: "c3", source: "Website" }
  ],
  leads: [{ id: "l1" }, { id: "l2" }, { id: "l3" }, { id: "l4" }],
  deals: [
    { id: "d1", customerId: "c1", value: 10000, stage: "Won" },
    { id: "d2", customerId: "c2", value: 30000, stage: "Proposal" },
    { id: "d3", customerId: "c3", value: 5000, stage: "Lost" }
  ],
  tasks: [
    { id: "t1", status: "todo", dueDate: "2026-01-01" },
    { id: "t2", status: "todo", dueDate: "2026-12-31" },
    { id: "t3", status: "done", dueDate: "2026-01-01" }
  ]
};

check("รายได้นับเฉพาะดีลที่ชนะ", () => {
  assert.equal(computeMetrics(metricsFixture, "2026-06-01").revenue, 10000);
});

check("มูลค่า Pipeline ไม่รวมดีลที่ปิดไปแล้วทั้งชนะและแพ้", () => {
  const data = computeMetrics(metricsFixture, "2026-06-01");
  assert.equal(data.pipelineValue, 30000);
  assert.equal(data.openDeals, 1);
});

check("Conversion คิดจากดีลที่ชนะเทียบจำนวน Lead", () => {
  assert.equal(computeMetrics(metricsFixture, "2026-06-01").conversionRate, 25);
});

check("ไม่มี Lead เลยต้องไม่หารด้วยศูนย์", () => {
  const empty = { ...metricsFixture, leads: [] };
  assert.equal(computeMetrics(empty, "2026-06-01").conversionRate, 0);
});

check("งานเลยกำหนดนับเฉพาะงานที่ยังไม่เสร็จและเลยวันอ้างอิง", () => {
  const data = computeMetrics(metricsFixture, "2026-06-01");
  assert.equal(data.overdueTasks, 1, "งานที่ done แล้วต้องไม่ถูกนับว่าเลยกำหนด");
  assert.equal(data.pendingTasks, 2);
});

check("ช่องทางหลักคือช่องทางที่มีลูกค้ามากที่สุด", () => {
  assert.equal(computeMetrics(metricsFixture, "2026-06-01").topSource, "Facebook");
  assert.deepEqual(countBy(metricsFixture.customers, "source"), { Facebook: 2, Website: 1 });
});

check("รายได้แยกตามช่องทางผูกกลับไปที่ลูกค้าเจ้าของดีล", () => {
  assert.deepEqual(sumDealsBySource(metricsFixture), { Facebook: 40000, Website: 5000 });
});

check("เป้ารายได้ติดลบหรือพังถูกดันเป็นศูนย์ ไม่ทำให้กราฟติดลบ", () => {
  assert.equal(revenueTargetOf({ businessProfile: { revenueTarget: -5 } }), 0);
  assert.equal(revenueTargetOf({ businessProfile: { revenueTarget: "ไม่ใช่ตัวเลข" } }), 0);
  assert.equal(revenueTargetOf({}), 0);
  assert.equal(revenueTargetOf({ businessProfile: { revenueTarget: 250000 } }), 250000);
});

console.log("\nความปลอดภัยของการแสดงผล:");

check("escapeHTML แปลงอักขระอันตรายครบทั้ง 5 ตัว", () => {
  assert.equal(escapeHTML(`&<>'"`), "&amp;&lt;&gt;&#39;&quot;");
});

check("ชื่อลูกค้าที่เป็นสคริปต์ถูกทำให้ไม่ทำงาน", () => {
  const output = escapeHTML(`<img src=x onerror="alert(document.cookie)">`);
  assert.ok(!output.includes("<img"), "ยังหลุด tag ออกมาได้");
  assert.ok(!output.includes(`"`), "ยังหลุดเครื่องหมายคำพูดที่ใช้ปิด attribute ได้");
});

check("escapeHTML รับ null/undefined ได้โดยไม่พ่นคำว่า null ออกหน้าจอ", () => {
  assert.equal(escapeHTML(null), "");
  assert.equal(escapeHTML(undefined), "");
});

check("initials ไม่พังกับชื่อว่างหรือช่องว่างล้วน", () => {
  assert.equal(initials(""), "ล");
  assert.equal(initials("สมชาย ใจดี"), "สใ");
});

console.log("\nSet Zero และความสัมพันธ์ของข้อมูล:");

check("Set Zero ล้างข้อมูลทุก collection จริง ไม่เหลือค้าง", () => {
  const zero = createZeroState();
  for (const key of ["customers", "leads", "products", "deals", "tasks"]) {
    assert.deepEqual(zero[key], [], `Set Zero ยังเหลือข้อมูลใน ${key}`);
  }
  assert.equal(zero.businessProfile.businessName, "");
  assert.equal(zero.businessProfile.revenueTarget, 0);
});

check("Set Zero แล้ว KPI ทุกตัวเป็นศูนย์ ไม่ใช่ NaN", () => {
  const data = computeMetrics(createZeroState(), "2026-06-01");
  for (const [key, value] of Object.entries(data)) {
    if (key === "topSource") continue;
    assert.ok(Number.isFinite(value), `KPI ${key} เป็น ${value} ไม่ใช่ตัวเลข`);
    assert.equal(value, 0, `KPI ${key} ต้องเป็น 0 หลัง Set Zero`);
  }
  assert.equal(data.topSource, "-");
});

check("แก้ชื่อ Package แล้วชื่อที่ลูกค้า ดีล และงานอ้างถึงเปลี่ยนตาม", () => {
  const before = normalizeState(clone(seedData));
  // หา Package ที่มีลูกค้าผูกอยู่จริงหลัง normalize แทนที่จะฮาร์ดโค้ดชื่อ เพราะ
  // normalizeState แปลงชื่อ Package ตาม Business Profile ชื่อตั้งต้นจึงไม่คงอยู่
  const linkedId = before.customers.map((customer) => customer.solutionPackageId).find(Boolean);
  const target = before.products.find((product) => product.id === linkedId);
  assert.ok(target, "ไม่พบ Package ตั้งต้นที่ใช้ทดสอบ");
  const linkedCustomer = before.customers.find((customer) => customer.solutionPackageId === target.id);
  assert.ok(linkedCustomer, "ไม่มีลูกค้าที่ผูกกับ Package นี้ ทดสอบไม่ได้");

  const after = updateProductAcrossState(before, target.id, { name: "ชื่อใหม่ที่ผู้ใช้ตั้งเอง" });
  const movedCustomer = after.customers.find((customer) => customer.id === linkedCustomer.id);
  assert.equal(movedCustomer.solutionPackage, "ชื่อใหม่ที่ผู้ใช้ตั้งเอง");
  assert.equal(movedCustomer.solutionPackageId, target.id, "ID ต้องไม่เปลี่ยนตามชื่อ");
});

check("ลบ Package แล้วลูกค้าไม่หายไปด้วย แค่ถูกตัดความสัมพันธ์", () => {
  const before = normalizeState(clone(seedData));
  // หา Package ที่มีลูกค้าผูกอยู่จริงหลัง normalize แทนที่จะฮาร์ดโค้ดชื่อ เพราะ
  // normalizeState แปลงชื่อ Package ตาม Business Profile ชื่อตั้งต้นจึงไม่คงอยู่
  const linkedId = before.customers.map((customer) => customer.solutionPackageId).find(Boolean);
  const target = before.products.find((product) => product.id === linkedId);
  const customerCount = before.customers.length;

  const after = detachProductRelations(before, target.id);
  assert.equal(after.products.find((product) => product.id === target.id), undefined, "Package ยังไม่ถูกลบ");
  assert.equal(after.customers.length, customerCount, "ลบ Package แล้วลูกค้าหายไปด้วย");
  for (const customer of after.customers) {
    assert.notEqual(customer.solutionPackageId, target.id, `ลูกค้า ${customer.id} ยังชี้ไปยัง Package ที่ถูกลบแล้ว`);
  }
  for (const deal of after.deals) {
    assert.notEqual(deal.productId, target.id, `ดีล ${deal.id} ยังชี้ไปยัง Package ที่ถูกลบแล้ว`);
  }
});

console.log(`\nApp model passed: ${passed} behaviour assertions`);
