# Business Growth CRM UX Workflow Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับ Dashboard, CRM, Customer Form, AI Analysis และ Motion พร้อม Asset Regression Guard โดยรักษา Logo และ Vector Icon ทุกตำแหน่ง

**Architecture:** ใช้ Vanilla HTML/CSS/JavaScript เดิม เพิ่ม Asset Manifest ฝั่ง Node เป็น Single Source of Truth และเพิ่ม UI State สำหรับ Lead Selection กับ Undo โดยไม่เปลี่ยน Storage Key หรือเพิ่ม Browser Dependency

**Tech Stack:** HTML5, CSS, JavaScript ES Modules, Node.js built-in test/assert/fs, localStorage, SVG sprite

## Global Constraints

- Logo ทั้งสี่ไฟล์ใน `logo.svg` และ `app/icons.svg` ต้องผ่าน Automated Check ก่อน Build
- ใช้ CI สีเดิมและ Vector Icon เดิม ห้ามแทนด้วย Emoji หรือ Icon Font
- Import JSON เก่าต้อง Normalize ได้
- ทุก Stage Control ต้องใช้ Keyboard ได้
- Animation ต้องรองรับ Reduced Motion และไม่ Transition ค่า Width

---

### Task 1: Asset Manifest และ Regression Guard

**Files:**
- Create: `scripts/assets.mjs`
- Create: `scripts/check-assets.mjs`
- Create: `scripts/smoke-build.mjs`
- Modify: `scripts/dev.mjs`
- Modify: `scripts/build.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `ASSET_FILES: Record<string, [string, string]>`
- Produces: `npm run check:assets` และ `npm run check:smoke`

- [ ] สร้าง Manifest ที่มี `/icons.svg` และ `/brand/*.svg` ครบทุก Route
- [ ] เขียน Check ที่อ่าน HTML/JS, เทียบ Logo Route และ Symbol ID ที่อ้างอิงกับ Sprite
- [ ] ปรับ Dev/Build ให้ Import Manifest เดียวกัน
- [ ] Build แล้ว Import Worker และยิง Request ทุก Route โดย Assert Status, Content-Type และ Body
- [ ] รัน `npm run check` คาดว่า Exit Code 0 และรายงาน Asset ครบ

### Task 2: Dashboard Information Hierarchy

**Files:**
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`

**Interfaces:**
- Produces: `#businessChangeSummary`, `.owner-command-grid`, `.dashboard-secondary`

- [ ] ย้าย Priority Panel มาวางคู่ Goal Banner ใน Command Grid
- [ ] ย้าย Signal, Latest Customer และ Pending Task เข้า Collapsible Secondary Details
- [ ] เพิ่ม Context Confirmation ที่อัปเดตจาก `renderBusinessViewSwitch()`
- [ ] ปรับ Responsive ให้ Command Grid เป็นหนึ่งคอลัมน์ต่ำกว่า 980px
- [ ] ตรวจ Owner, Sales, Marketing และ Ops ว่าหัวข้อ CTA และ Priority ยังเปลี่ยนตาม Role

### Task 3: CRM Stage Control, Bulk Move และ Undo

**Files:**
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`

**Interfaces:**
- Produces: `selectedLeadIds: Set<string>`
- Produces: `setLeadStatus(leadId, nextStatus)` และ `registerUndo(message, restore)`

- [ ] เพิ่ม Bulk Toolbar และ Checkbox ให้ Lead Card
- [ ] ใช้ Native Select แสดงทุก Lead Stage และย้ายได้สองทิศทาง
- [ ] Bulk Move เฉพาะ Lead ที่ยังมีอยู่ พร้อมแจ้งจำนวน
- [ ] ขยาย Toast ให้มีปุ่ม `เลิกทำ` และคืน State ล่าสุด
- [ ] เพิ่ม Undo ให้ Lead Move, Bulk Move, Deal/Task Status และ Delete
- [ ] ตรวจ Stage Move เดี่ยว, ย้อนกลับ, Bulk Move และ Undo

### Task 4: Customer Progressive Form และ Package Suggestion

**Files:**
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`

**Interfaces:**
- Produces: `#customerAdvancedFields`, `#customerPackageHint`

- [ ] แบ่งช่องหลักสี่ช่องและย้ายข้อมูลเสริมเข้า Details
- [ ] อัปเดต Hint จาก Catalog รายการแรกตาม Business Mode
- [ ] หลัง Reset ให้ Render ค่าเริ่มต้นที่สัมพันธ์กับ Business Mode
- [ ] ตรวจ Submit เมื่อ Details ปิดและเปิด รวมถึง Avatar Upload เดิม

### Task 5: AI First-use และ Evidence Snapshot

**Files:**
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`

**Interfaces:**
- Produces: `analysisEvidenceMarkup()` และ `[data-analysis-question]`

- [ ] เพิ่ม Quick Question สี่รายการและ Snapshot Metadata
- [ ] หยุด Auto-fill Textarea เมื่อเปลี่ยนมิติ แต่คงปุ่มใช้ Prompt
- [ ] แสดง Evidence Strip ก่อนคำตอบ AI และ Error Recovery ที่ยังเห็น Snapshot
- [ ] ลดความสูง Empty State และจัด Responsive ของ Quick Questions

### Task 6: Motion, Accessibility และ Final Browser Verification

**Files:**
- Modify: `app/app.js`
- Modify: `app/styles.css`
- Test: `scripts/check-assets.mjs`
- Test: `scripts/smoke-build.mjs`

**Interfaces:**
- Consumes: UI และ Test Contract จาก Task 1 ถึง 5

- [ ] เปลี่ยน Goal, Bar และ Journey Progress เป็น `transform: scaleX()`
- [ ] ลบ Side-stripe Pattern และตรวจ Focus/Disabled/Touch State
- [ ] รัน `npm run check` คาดว่า Syntax, Asset Contract, Build และ Smoke ผ่าน
- [ ] ทดสอบ Browser ที่ 1440x900, 900x900 และ 390x844 โดยไม่มี Console Error
- [ ] ตรวจ `.brand-logo`, `.journey-brand-logo`, `.ai-brand-logo` มี `naturalWidth > 0` และ SVG Use ทุกกลุ่มแสดงผล
- [ ] บันทึก Screenshot Before/After และสรุปข้อจำกัดที่ยังเหลือ

