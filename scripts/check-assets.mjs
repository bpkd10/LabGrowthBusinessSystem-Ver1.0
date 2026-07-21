import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { ASSET_FILES, ASSET_VERSION } from "./assets.mjs";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "app/index.html"), "utf8");
const appJs = await readFile(resolve(root, "app/app.js"), "utf8");
const css = await readFile(resolve(root, "app/styles.css"), "utf8");
const sprite = await readFile(resolve(root, "app/icons.svg"), "utf8");

const requiredRoutes = [
  "/icons.svg",
  "/brand/logo-wordmark.svg",
  "/brand/logo-wordmark-dark.svg",
  "/brand/logo-wordmark-light.svg",
  "/brand/icon-favicon.svg"
];

for (const route of requiredRoutes) {
  assert.ok(ASSET_FILES[route], `Asset manifest ไม่มี route ${route}`);
  const [relativePath, contentType] = ASSET_FILES[route];
  const absolutePath = resolve(root, relativePath);
  await access(absolutePath);
  assert.ok((await stat(absolutePath)).size > 100, `${relativePath} ว่างหรือมีขนาดผิดปกติ`);
  assert.equal(contentType, "image/svg+xml", `${route} ต้องใช้ SVG content type`);
  const svg = await readFile(absolutePath, "utf8");
  assert.match(svg, /<svg\b/, `${relativePath} ไม่มี root <svg>`);
}

for (const route of requiredRoutes.slice(1)) {
  assert.ok(html.includes(`${route}?v=${ASSET_VERSION}`), `HTML ยังไม่ได้ใช้ ${route} หรือใช้ Asset Version ไม่ตรงกัน`);
}

assert.ok(html.includes(`/icons.svg?v=${ASSET_VERSION}`), "HTML ไม่ได้อ้างอิง icon sprite version ปัจจุบัน");
assert.ok(appJs.includes(`/icons.svg?v=${ASSET_VERSION}`), "JavaScript ไม่ได้อ้างอิง icon sprite version ปัจจุบัน");
assert.ok(html.includes(`styles.css?v=${ASSET_VERSION}`), "HTML ยังไม่ได้ใช้ CSS Asset Version ปัจจุบัน");
assert.ok(html.includes(`app.js?v=${ASSET_VERSION}`), "HTML ยังไม่ได้ใช้ JavaScript Asset Version ปัจจุบัน");

const symbolIds = new Set([...sprite.matchAll(/<symbol\s+id="([^"]+)"/g)].map((match) => match[1]));
const referencedSymbols = new Set([
  ...[...html.matchAll(/icons\.svg\?v=\d+#([a-z0-9-]+)/g)].map((match) => match[1]),
  ...[...appJs.matchAll(/icon:\s*["']([a-z0-9-]+)["']/g)].map((match) => match[1])
]);

for (const call of appJs.matchAll(/iconMarkup\(([^)]*)\)/g)) {
  const firstArgument = call[1].split(",", 1)[0];
  for (const match of firstArgument.matchAll(/["']([a-z0-9-]+)["']/g)) referencedSymbols.add(match[1]);
}

for (const objectName of ["contactChannelIcons", "roleIcons"]) {
  const block = appJs.match(new RegExp(`const ${objectName} = \\{([\\s\\S]*?)\\};`))?.[1] || "";
  for (const match of block.matchAll(/:\s*"([a-z0-9-]+)"/g)) referencedSymbols.add(match[1]);
}

for (const symbol of referencedSymbols) {
  assert.ok(symbolIds.has(symbol), `Vector icon #${symbol} หายจาก app/icons.svg`);
}

for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const route = match[1].split("?", 1)[0];
  if (route.startsWith("/")) assert.ok(ASSET_FILES[route], `CSS อ้าง Asset ${route} ที่ไม่มีใน manifest`);
}

assert.equal(ASSET_VERSION, "14", "ต้องเพิ่ม Asset Version หลังแก้ UI/Logo/Icon เพื่อป้องกัน cache เก่า");

console.log(`Asset contract passed: ${requiredRoutes.length} SVG routes, ${referencedSymbols.size} referenced vector symbols, version ${ASSET_VERSION}`);
