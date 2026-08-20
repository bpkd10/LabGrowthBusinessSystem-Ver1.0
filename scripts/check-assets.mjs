import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { ASSET_FILES, ASSET_VERSION } from "./assets.mjs";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "app/index.html"), "utf8");
const appJs = await readFile(resolve(root, "app/app.js"), "utf8");
// ข้อมูลโดเมนที่ประกาศชื่อ icon (businessModes, avatarPresets, contactChannelIcons,
// roleIcons) ย้ายจาก app.js ไป business-config.js แล้ว ต้องอ่านไฟล์นี้ด้วย ไม่งั้น
// การสแกนชื่อ icon ด้านล่างจะกลายเป็นสแกนไฟล์เปล่าและผ่านทุกกรณีโดยไม่ตรวจอะไรเลย
const businessConfigJs = await readFile(resolve(root, "app/business-config.js"), "utf8");
const css = await readFile(resolve(root, "app/styles.css"), "utf8");
const sprite = await readFile(resolve(root, "app/icons.svg"), "utf8");

const requiredRoutes = [
  "/business-workflows.js",
  "/icons.svg",
  "/brand/logo-wordmark.svg",
  "/brand/logo-wordmark-dark.svg",
  "/brand/logo-wordmark-light.svg",
  "/brand/icon-favicon.svg"
];

for (const route of requiredRoutes) {
  assert.ok(ASSET_FILES[route], `Asset manifest ไม่มี route ${route}`);
  const [relativePath, contentType] = ASSET_FILES[route];
  assert.ok(
    relativePath.startsWith("app/"),
    `${route} ต้องอยู่ภายใน app/ เพื่อไม่ให้หายเมื่อ deploy แบบ static`
  );
  const absolutePath = resolve(root, relativePath);
  await access(absolutePath);
  assert.ok((await stat(absolutePath)).size > 100, `${relativePath} ว่างหรือมีขนาดผิดปกติ`);
  if (route === "/business-workflows.js") {
    assert.match(contentType, /text\/javascript/, `${route} ต้องใช้ JavaScript content type`);
    continue;
  }
  assert.equal(contentType, "image/svg+xml", `${route} ต้องใช้ SVG content type`);
  const svg = await readFile(absolutePath, "utf8");
  assert.match(svg, /<svg\b/, `${relativePath} ไม่มี root <svg>`);

  if (route.startsWith("/brand/")) {
    const sourceSvg = await readFile(resolve(root, "logo.svg", route.split("/").pop()), "utf8");
    assert.equal(svg, sourceSvg, `${relativePath} ไม่ตรงกับไฟล์ต้นฉบับใน logo.svg/`);
  }
}

assert.match(css, /--brand-orange:\s*#ff6b1a/i, "CSS ต้องประกาศสีส้มหลักจาก Logo เป็น CI token");
assert.match(css, /--brand-ink:\s*#17171f/i, "CSS ต้องประกาศสีดำหลักจาก Logo เป็น CI token");
assert.match(css, /--brand-soft:\s*#fee9ce/i, "CSS ต้องประกาศสีพื้นอ่อนจาก Logo เป็น CI token");
assert.match(css, /--accent:\s*var\(--brand-orange-aa\)/, "สี action ต้องอ้าง CI token ที่ผ่าน contrast");

for (const route of requiredRoutes.slice(2)) {
  assert.ok(html.includes(`${route}?v=${ASSET_VERSION}`), `HTML ยังไม่ได้ใช้ ${route} หรือใช้ Asset Version ไม่ตรงกัน`);
}

assert.ok(html.includes(`/icons.svg?v=${ASSET_VERSION}`), "HTML ไม่ได้อ้างอิง icon sprite version ปัจจุบัน");
assert.ok(appJs.includes(`/icons.svg?v=${ASSET_VERSION}`), "JavaScript ไม่ได้อ้างอิง icon sprite version ปัจจุบัน");
assert.ok(html.includes(`styles.css?v=${ASSET_VERSION}`), "HTML ยังไม่ได้ใช้ CSS Asset Version ปัจจุบัน");
assert.ok(html.includes(`app.js?v=${ASSET_VERSION}`), "HTML ยังไม่ได้ใช้ JavaScript Asset Version ปัจจุบัน");
assert.ok(appJs.includes(`business-workflows.js?v=${ASSET_VERSION}`), "JavaScript workflow ยังไม่ได้ใช้ Asset Version ปัจจุบัน");

// app/ai-provider.js เป็น ES module ที่ app.js import โดยตรง ถ้าไม่ลงทะเบียนใน manifest
// ไฟล์จะหายตอน deploy และหน้า AI จะพังทั้งหน้า (ADR-001 ข้อ 4.4)
assert.ok(ASSET_FILES["/ai-provider.js"], "Asset manifest ไม่มี route /ai-provider.js");
assert.match(ASSET_FILES["/ai-provider.js"][1], /text\/javascript/, "/ai-provider.js ต้องใช้ JavaScript content type");
assert.ok(appJs.includes(`ai-provider.js?v=${ASSET_VERSION}`), "app.js ยังไม่ได้ import ai-provider.js ด้วย Asset Version ปัจจุบัน");

// business-config.js และ state-model.js ถูกแยกออกจาก app.js เป็น ES module ที่ import
// ตรง ๆ เหมือนกัน ถ้าลืมลงทะเบียนใน manifest แอปจะขึ้นหน้าขาวทั้งหน้าตอน deploy
// เพราะ browser โหลด module ไม่เจอ — เช็คทั้ง route และเวอร์ชันที่ import
for (const moduleRoute of ["/business-config.js", "/state-model.js"]) {
  const fileName = moduleRoute.slice(1);
  assert.ok(ASSET_FILES[moduleRoute], `Asset manifest ไม่มี route ${moduleRoute}`);
  assert.match(ASSET_FILES[moduleRoute][1], /text\/javascript/, `${moduleRoute} ต้องใช้ JavaScript content type`);
  assert.ok(appJs.includes(`${fileName}?v=${ASSET_VERSION}`), `app.js ยังไม่ได้ import ${fileName} ด้วย Asset Version ปัจจุบัน`);
}

const symbolIds = new Set([...sprite.matchAll(/<symbol\s+id="([^"]+)"/g)].map((match) => match[1]));
const referencedSymbols = new Set([
  ...[...html.matchAll(/icons\.svg\?v=\d+#([a-z0-9-]+)/g)].map((match) => match[1]),
  ...[...appJs.matchAll(/icon:\s*["']([a-z0-9-]+)["']/g)].map((match) => match[1]),
  ...[...businessConfigJs.matchAll(/icon:\s*["']([a-z0-9-]+)["']/g)].map((match) => match[1])
]);

for (const call of appJs.matchAll(/iconMarkup\(([^)]*)\)/g)) {
  const firstArgument = call[1].split(",", 1)[0];
  for (const match of firstArgument.matchAll(/["']([a-z0-9-]+)["']/g)) referencedSymbols.add(match[1]);
}

for (const objectName of ["contactChannelIcons", "roleIcons"]) {
  const block = businessConfigJs.match(new RegExp(`export const ${objectName} = \\{([\\s\\S]*?)\\};`))?.[1];
  assert.ok(block, `หา ${objectName} ใน app/business-config.js ไม่เจอ — การสแกน icon จะไม่ตรวจอะไรเลย`);
  for (const match of block.matchAll(/:\s*"([a-z0-9-]+)"/g)) referencedSymbols.add(match[1]);
}

for (const symbol of referencedSymbols) {
  assert.ok(symbolIds.has(symbol), `Vector icon #${symbol} หายจาก app/icons.svg`);
}

for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const route = match[1].split("?", 1)[0];
  if (route.startsWith("/")) assert.ok(ASSET_FILES[route], `CSS อ้าง Asset ${route} ที่ไม่มีใน manifest`);
}

assert.equal(ASSET_VERSION, "25", "ต้องเพิ่ม Asset Version หลังแก้ UI/Logo/Icon เพื่อป้องกัน cache เก่า");

console.log(`Asset contract passed: ${requiredRoutes.length} required routes, ${referencedSymbols.size} referenced vector symbols, version ${ASSET_VERSION}`);
