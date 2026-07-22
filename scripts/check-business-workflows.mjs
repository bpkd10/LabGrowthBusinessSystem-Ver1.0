import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workflowPath = resolve(root, "app/business-workflows.js");

assert.ok(existsSync(workflowPath), "ยังไม่มี workflow กลางสำหรับ Profile, Package และ Set Zero");

const {
  buildProfileCatalog,
  packagesMissingFromCatalog,
  mergeCatalogWithProducts,
  normalizeOfferRelations,
  updateProductAcrossState,
  detachProductRelations,
  createZeroState
} = await import(pathToFileURL(workflowPath));

assert.equal(typeof mergeCatalogWithProducts, "function", "ยังไม่มี workflow กระจายข้อมูล Package ที่แก้ไขไปฟังก์ชันอื่น");

const catalogs = {
  retail: [
    { name: "POS Starter", category: "Retail Offer", price: 15000, cost: 4500, description: "เก็บสมาชิกหน้าร้าน" },
    { name: "Repeat Purchase", category: "Retail Offer", price: 25000, cost: 7500, description: "กระตุ้นการซื้อซ้ำ" }
  ]
};

const creatorRetail = buildProfileCatalog({
  businessName: "Creator Store",
  businessMode: "retail",
  businessCategory: "creator"
}, catalogs);

assert.equal(creatorRetail.length, 2, "ต้องสร้างชุดแนะนำครบตามรูปแบบการขาย");
assert.match(creatorRetail[0].name, /Creator/, "ชื่อ Package ต้องสัมพันธ์กับหมวดธุรกิจ Creator");
assert.match(creatorRetail[0].description, /Creator Store/, "คำอธิบายต้องสัมพันธ์กับชื่อธุรกิจที่สร้างใหม่");
assert.equal(creatorRetail[0].businessMode, "retail", "Package ต้องจำรูปแบบการขาย");
assert.equal(creatorRetail[0].businessCategory, "creator", "Package ต้องจำหมวดธุรกิจ");

const missing = packagesMissingFromCatalog([
  { id: "p1", name: creatorRetail[0].name }
], creatorRetail);
assert.deepEqual(missing.map((item) => item.name), [creatorRetail[1].name], "ปุ่มเพิ่มชุดแนะนำเพิ่มเฉพาะ Package ที่ยังไม่มี");

const editedCatalog = mergeCatalogWithProducts(creatorRetail, [
  { ...creatorRetail[0], price: 18000, cost: 5000, status: "active" }
]);
assert.equal(editedCatalog[0].price, 18000, "ราคา Package ที่แก้ไขต้องอัปเดตไปยังฟังก์ชันแนะนำลูกค้า");
assert.equal(editedCatalog[0].cost, 5000, "ต้นทุน Package ที่แก้ไขต้องอัปเดตไปยัง AI และ Dashboard");

const relatedState = normalizeOfferRelations({
  products: [
    { id: "p-offer", name: "Growth Offer", price: 25000, cost: 5000, status: "active", businessMode: "online", pipelineStage: "Proposal" }
  ],
  customers: [
    { id: "c1", fullName: "ลูกค้า A", solutionPackage: "Growth Offer" }
  ],
  deals: [
    { id: "d1", customerId: "c1", name: "ดีลเฉพาะของลูกค้า A", offerName: "Growth Offer", value: 23000, stage: "Proposal" }
  ],
  tasks: [
    { id: "t1", title: "ติดตามเงื่อนไขเฉพาะ", offerName: "Growth Offer" }
  ]
});
assert.equal(relatedState.customers[0].solutionPackageId, "p-offer", "Customer ต้องเชื่อม Offer ด้วย ID ไม่ใช่ชื่ออย่างเดียว");
assert.equal(relatedState.deals[0].productId, "p-offer", "Deal ต้องเชื่อม Offer เดียวกับ Customer ใน Pipeline");

const renamedState = updateProductAcrossState(relatedState, "p-offer", {
  name: "Growth Offer Pro",
  price: 32000,
  pipelineStage: "Negotiation",
  businessMode: "wholesale"
});
assert.equal(renamedState.customers[0].solutionPackage, "Growth Offer Pro", "แก้ชื่อ Offer แล้ว Customer และ CRM ต้องแสดงชื่อใหม่");
assert.equal(renamedState.customers[0].solutionPackageId, "p-offer", "แก้ชื่อ Offer แล้ว ID ที่เชื่อมต้องไม่เปลี่ยน");
assert.equal(renamedState.customers[0].businessMode, "wholesale", "แก้ Business Mode ของ Offer แล้ว Customer ต้องใช้บริบทเดียวกัน");
assert.equal(renamedState.deals[0].name, "ดีลเฉพาะของลูกค้า A", "ชื่อดีลเฉพาะของ User ต้องไม่ถูกเขียนทับเมื่อแก้ชื่อ Offer");
assert.equal(renamedState.deals[0].value, 23000, "ราคาดีลที่ตกลงแล้วต้องไม่ถูกเขียนทับเมื่อแก้ราคา Offer");
assert.equal(renamedState.products[0].pipelineStage, "Negotiation", "Offer ต้องจำ Pipeline Stage ที่เกี่ยวข้อง");
assert.equal(renamedState.tasks[0].offerName, "Growth Offer Pro", "แก้ชื่อ Offer แล้วงานติดตามที่เชื่อมต้องอัปเดตชื่ออ้างอิง");

const detachedState = detachProductRelations(renamedState, "p-offer");
assert.equal(detachedState.customers[0].solutionPackageId, "", "ลบ Offer แล้วต้องถอด ID ออกจาก Customer");
assert.equal(detachedState.customers[0].solutionPackage, "Growth Offer Pro", "ลบ Offer แล้วยังคงชื่อ Snapshot เพื่ออ่านประวัติได้");
assert.equal(detachedState.deals[0].productId, "", "ลบ Offer แล้วต้องถอด ID ออกจาก Deal");
assert.equal(detachedState.tasks[0].productId, "", "ลบ Offer แล้วต้องถอด ID ออกจากงานติดตาม");

const zero = createZeroState();
for (const key of ["customers", "leads", "products", "deals", "tasks"]) {
  assert.deepEqual(zero[key], [], `Set Zero ต้องล้าง ${key} ทั้งหมด`);
}
assert.equal(zero.businessProfile.revenueTarget, 0, "Set Zero ต้องล้างเป้ารายได้");
assert.equal(zero.businessProfile.businessName, "", "Set Zero ต้องล้างชื่อธุรกิจเดิม");

console.log("Business workflow passed: profile-aware packages and true Set Zero");
