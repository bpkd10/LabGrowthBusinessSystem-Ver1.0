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

const zero = createZeroState();
for (const key of ["customers", "leads", "products", "deals", "tasks"]) {
  assert.deepEqual(zero[key], [], `Set Zero ต้องล้าง ${key} ทั้งหมด`);
}
assert.equal(zero.businessProfile.revenueTarget, 0, "Set Zero ต้องล้างเป้ารายได้");
assert.equal(zero.businessProfile.businessName, "", "Set Zero ต้องล้างชื่อธุรกิจเดิม");

console.log("Business workflow passed: profile-aware packages and true Set Zero");
