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
  captureSnapshot,
  clone,
  compareToPrevious,
  computeMetrics,
  countBy,
  escapeHTML,
  initials,
  loadStateFrom,
  monthKey,
  normalizeOfferCategory,
  normalizeState,
  recordSnapshot,
  revenueTargetOf,
  thaiMonthLabel,
  sumDealsBySource,
  validIsoDate
} from "../app/state-model.js";
import {
  businessCatalogs,
  businessModes,
  dealStages,
  HISTORY_MONTH_LIMIT,
  leadStatuses,
  SCHEMA_VERSION,
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
  assert.equal(state.schemaVersion, SCHEMA_VERSION);
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

// เส้นแบ่งของทั้งระบบ: ฟิลด์ "ป้ายกำกับ" ผู้ใช้ตั้งเองได้ ส่วนฟิลด์ "โครงสร้าง"
// ที่ระบบใช้คำนวณต้องคงที่เสมอ ถ้าเส้นนี้เลือน หน้าจอทุกหน้าจะเชื่อมกันไม่ได้
check("ประเภทข้อเสนอที่ผู้ใช้ตั้งเองต้องถูกเก็บไว้ตามที่พิมพ์ ไม่ถูกดันกลับเป็น Package", () => {
  const input = clone(seedData);
  input.products = [{ id: "p9", name: "อะไรสักอย่าง", category: "งานรับจ้างผลิต", price: 100, cost: 10, pipelineStage: "ไม่มีขั้นนี้" }];
  const state = normalizeState(input);
  assert.equal(state.products[0].category, "งานรับจ้างผลิต", "ค่าที่ผู้ใช้พิมพ์เองถูกเขียนทับ ฟิลด์นี้จึงยืดหยุ่นไม่จริง");
  assert.equal(state.products[0].pipelineStage, "Proposal", "pipelineStage เป็นฟิลด์โครงสร้าง ต้องถูกดันกลับเป็นค่าที่ปลอดภัยเสมอ");
});

check("ประเภทข้อเสนอภาษาอังกฤษรุ่นเก่ายังถูกแปลงเป็นคำไทย และค่าว่างได้ค่าตั้งต้น", () => {
  assert.equal(normalizeOfferCategory("consulting"), "บริการ");
  assert.equal(normalizeOfferCategory("Course"), "สินค้า");
  assert.equal(normalizeOfferCategory("   "), "Package", "ค่าว่างต้องได้ค่าตั้งต้น ไม่ใช่ปล่อยให้ประเภทหายไป");
  assert.equal(normalizeOfferCategory("คอร์สออนไลน์"), "คอร์สออนไลน์");
});

check("ประเภทลูกค้าที่ผู้ใช้ตั้งเองต้องอยู่รอด และค่าว่างเท่านั้นที่ได้ค่าตั้งต้น", () => {
  const custom = alignCustomerType({ businessMode: "wholesale", customerType: "ดีลเลอร์ภาคเหนือ" });
  assert.equal(custom.customerType, "ดีลเลอร์ภาคเหนือ", "กลุ่มลูกค้าที่ผู้ใช้ตั้งเองถูกเขียนทับ");
  const kept = alignCustomerType({ businessMode: "wholesale", customerType: "Key Account" });
  assert.equal(kept.customerType, "Key Account");
  const empty = alignCustomerType({ businessMode: "wholesale", customerType: "  " });
  assert.equal(empty.customerType, businessModes.wholesale.customerTypes[0], "ค่าว่างต้องได้กลุ่มตั้งต้น ไม่ใช่ปล่อยให้ลูกค้าไม่มีกลุ่ม");
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

console.log("\nประวัติรายเดือนและการเทียบงวด:");

// ระบบชื่อ Growth System แต่เดิมบอกได้แค่ "วันนี้เป็นยังไง" ไม่ใช่ "ดีขึ้นหรือแย่ลง"
// เพราะ saveState เขียนทับ state ทั้งก้อนทุกครั้งโดยไม่เก็บประวัติเลย
// ชุดตรวจนี้ล็อกพฤติกรรมของประวัติไว้ เพราะมันคือแกนของคุณค่าที่เพิ่มเข้ามา
const historyBase = loadStateFrom({ getItem: () => null }, "unused");

check("monthKey และ thaiMonthLabel แปลงวันที่เป็นเดือนไทยได้ถูกต้อง", () => {
  assert.equal(monthKey("2026-08-09"), "2026-08");
  assert.equal(thaiMonthLabel("2026-08"), "ส.ค. 2569", "ต้องแปลงเป็น พ.ศ. เพราะทั้งระบบใช้ภาษาไทย");
});

check("snapshot เก็บเฉพาะตัวเลขสรุป ไม่มีข้อมูลส่วนบุคคลติดไปด้วย", () => {
  const snapshot = captureSnapshot(historyBase, "2026-08-09");
  const serialized = JSON.stringify(snapshot);
  for (const customer of historyBase.customers) {
    assert.ok(!serialized.includes(customer.fullName), `snapshot มีชื่อลูกค้า ${customer.fullName} ติดไปด้วย`);
    if (customer.phone && customer.phone !== "-") {
      assert.ok(!serialized.includes(customer.phone), `snapshot มีเบอร์โทร ${customer.phone} ติดไปด้วย`);
    }
  }
  assert.equal(snapshot.revenue, computeMetrics(historyBase, "2026-08-09").revenue);
});

check("บันทึกซ้ำในเดือนเดียวกันต้องทับรายการเดิม ไม่ใช่เพิ่มรายการใหม่", () => {
  let state = clone(historyBase);
  state.history = recordSnapshot(state, "2026-08-01");
  state.history = recordSnapshot(state, "2026-08-20");
  assert.equal(state.history.length, 1, "เดือนเดียวกันต้องมีรายการเดียว ไม่งั้นประวัติจะบวมตามจำนวนครั้งที่กดบันทึก");
  assert.equal(state.history[0].capturedAt, "2026-08-20", "ต้องเก็บค่าล่าสุดของเดือนที่ยังไม่จบ");
});

check("ขึ้นเดือนใหม่แล้วรายการของเดือนก่อนหยุดนิ่ง ไม่ถูกเขียนทับย้อนหลัง", () => {
  let state = clone(historyBase);
  state.history = recordSnapshot(state, "2026-07-15");
  const julyRevenue = state.history[0].revenue;
  state.deals.push({ id: "dx", customerId: state.customers[0].id, productId: "", name: "ดีลใหม่", value: 99000, stage: "Won", probability: 100 });
  state.history = recordSnapshot(state, "2026-08-09");
  assert.equal(state.history.length, 2);
  assert.equal(state.history[0].month, "2026-07");
  assert.equal(state.history[0].revenue, julyRevenue, "ตัวเลขของเดือนที่ผ่านไปแล้วต้องไม่เปลี่ยน ไม่งั้นเทียบงวดไม่มีความหมาย");
  assert.equal(state.history[1].revenue, julyRevenue + 99000);
});

check("ยังไม่มีเดือนก่อนหน้าต้องบอกว่าเทียบไม่ได้ ห้ามแสดงเป็น 0%", () => {
  const state = clone(historyBase);
  state.history = recordSnapshot(state, "2026-08-09");
  const comparison = compareToPrevious(state, "2026-08-09");
  assert.equal(comparison.available, false, "มีแค่เดือนปัจจุบันจึงเทียบไม่ได้");
  assert.deepEqual(comparison.changes, {}, "ห้ามคืนตัวเลขเปลี่ยนแปลงที่คิดขึ้นเอง");
  assert.ok(comparison.reason.length > 10);
});

check("เทียบงวดคำนวณส่วนต่างและเปอร์เซ็นต์ถูกต้อง", () => {
  let state = clone(historyBase);
  state.history = recordSnapshot(state, "2026-07-15");
  const before = state.history[0].revenue;
  state.deals.push({ id: "dy", customerId: state.customers[0].id, productId: "", name: "ดีลเพิ่ม", value: before, stage: "Won", probability: 100 });
  state.history = recordSnapshot(state, "2026-08-09");
  const comparison = compareToPrevious(state, "2026-08-09");
  assert.equal(comparison.available, true);
  assert.equal(comparison.changes.revenue.before, before);
  assert.equal(comparison.changes.revenue.after, before * 2);
  assert.equal(comparison.changes.revenue.percent, 100, "รายได้เพิ่มเท่าตัวต้องได้ +100%");
  assert.match(comparison.reason, /ก\.ค\./, "ต้องบอกผู้ใช้ว่ากำลังเทียบกับเดือนไหน");
});

check("เพิ่มจากศูนย์ต้องคืน percent เป็น null ไม่ใช่ Infinity", () => {
  const state = clone(historyBase);
  state.history = [{ month: "2026-07", capturedAt: "2026-07-31", revenue: 0, pipelineValue: 0, totalLeads: 0, openDeals: 0, conversionRate: 0, pendingTasks: 0, overdueTasks: 0, customers: 0, wonDeals: 0 }];
  const comparison = compareToPrevious(state, "2026-08-09");
  assert.equal(comparison.changes.revenue.percent, null, "หารด้วยศูนย์ต้องไม่หลุดออกไปเป็น Infinity ให้ผู้ใช้เห็น");
  assert.ok(comparison.changes.revenue.diff > 0);
});

check("normalizeState เก็บประวัติไว้ข้ามการโหลด และทิ้งรายการที่รูปแบบเดือนผิด", () => {
  const input = clone(seedData);
  input.history = [
    { month: "2026-07", revenue: 1000 },
    { month: "พังแน่", revenue: 9999 },
    { month: "2026-06", revenue: 500 }
  ];
  const state = normalizeState(input);
  assert.equal(state.history.length, 2, "รายการที่เดือนผิดรูปแบบต้องถูกทิ้ง ไม่งั้นกราฟเทียบงวดเพี้ยน");
  assert.deepEqual(state.history.map((item) => item.month), ["2026-06", "2026-07"], "ต้องเรียงตามเดือนเสมอ");
});

check("ประวัติถูกจำกัดไม่ให้โตไม่สิ้นสุดจนกิน localStorage", () => {
  let state = clone(historyBase);
  for (let year = 2020; year <= 2026; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      state.history = recordSnapshot(state, `${year}-${String(month).padStart(2, "0")}-05`);
    }
  }
  assert.ok(state.history.length <= HISTORY_MONTH_LIMIT, `ประวัติโตถึง ${state.history.length} รายการ เกินเพดานที่ตั้งไว้`);
  assert.equal(state.history.at(-1).month, "2026-12", "ต้องเก็บรายการล่าสุดไว้ ไม่ใช่ตัดท้ายทิ้ง");
});

console.log(`\nApp model passed: ${passed} behaviour assertions`);
