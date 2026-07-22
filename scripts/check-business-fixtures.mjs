import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseImportFile, buildImportPlan, applyImportPlan } from "../app/data-import.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/business-samples");
const fixtureProfiles = {
  "uncletungai-course-training": { businessMode: "online", businessCategory: "creator" },
  "porn-bakery": { businessMode: "onsite", businessCategory: "restaurant" },
  "carlab-plus": { businessMode: "online", businessCategory: "retail" },
  "complete-massage": { businessMode: "onsite", businessCategory: "service" }
};

async function asImportFile(filePath) {
  const buffer = await readFile(filePath);
  return {
    name: path.basename(filePath),
    size: buffer.byteLength,
    text: async () => buffer.toString("utf8"),
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  };
}

for (const [folder, profile] of Object.entries(fixtureProfiles)) {
  let state = { businessProfile: profile, customers: [], leads: [], products: [], deals: [], tasks: [] };
  const base = path.join(root, folder);
  const sequence = [
    ["01-products.cvs", "products"],
    ["02-customers.md", "customers"],
    ["03-deals.doc", "deals"],
    ["04-tasks.txt", "tasks"]
  ];
  for (const [fileName, collection] of sequence) {
    const parsed = await parseImportFile(await asImportFile(path.join(base, fileName)));
    assert.ok(parsed.rows.length > 0, `${folder}/${fileName} ต้องมีข้อมูลอย่างน้อย 1 แถว`);
    const plan = buildImportPlan(parsed, { collection, businessProfile: profile, state });
    assert.equal(plan.collection, collection, `${folder}/${fileName} ต้อง Mapping เป็น ${collection}`);
    assert.ok(plan.records.length > 0, `${folder}/${fileName} ต้องสร้าง record ได้`);
    const applied = applyImportPlan(state, plan);
    state = applied.state;
  }
  assert.ok(state.products.length >= 5, `${folder} ต้องมีสินค้า/Package หลายรายการ`);
  assert.ok(state.customers.length >= 5, `${folder} ต้องมีลูกค้าหลายรายการ`);
  assert.equal(state.leads.length, state.customers.length, `${folder} ลูกค้าที่นำเข้าต้องมี Lead ที่สัมพันธ์กัน`);
  assert.ok(state.deals.every((deal) => deal.customerId), `${folder} ทุก Deal ต้องเชื่อมลูกค้าได้`);
  assert.ok(state.deals.every((deal) => deal.productId), `${folder} ทุก Deal ต้องเชื่อม Package ได้`);
  assert.ok(state.tasks.every((task) => task.productId), `${folder} ทุก Task ที่ระบุ Package ต้องเชื่อม Package ได้`);
  console.log(`Fixture passed: ${folder} (${state.products.length} products, ${state.customers.length} customers, ${state.deals.length} deals, ${state.tasks.length} tasks)`);
}

