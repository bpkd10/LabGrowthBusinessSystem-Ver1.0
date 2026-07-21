# Business Growth CRM UX Workflow Polish Design

วันที่: 2026-07-22
สถานะ: อนุมัติจากคำขอให้ดำเนินการตามข้อเสนอ UX/UI วันที่ 2026-07-21

## เป้าหมาย

ยกระดับ Web App จาก 7.8/10 ให้ใกล้ระดับใช้งานจริง 9/10 โดยลดภาระการอ่าน Dashboard เพิ่มอิสระในการจัดการ Lead ลดความซับซ้อนของฟอร์มลูกค้า ทำหน้า AI ให้เริ่มใช้งานได้ทันที และสร้าง Asset Guard เพื่อป้องกัน Logo กับ Vector Icon หายซ้ำ

## แนวทางที่พิจารณา

1. ปรับเฉพาะ CSS: เร็วและเสี่ยงต่ำ แต่ไม่แก้ CRM ที่ย้อน Stage ไม่ได้, ไม่มี Undo และ Form ที่เปิดทุกช่องพร้อมกัน
2. ปรับ Incremental บน Vanilla App เดิม: แก้ HTML, CSS, JavaScript และเพิ่ม Automated Check โดยรักษา State และโครงสร้างเดิม เป็นแนวทางที่เลือก
3. เขียน Dashboard ใหม่ทั้งชุด: จัดโครงสร้างได้สะอาดที่สุด แต่เสี่ยงต่อข้อมูลใน localStorage, Asset route และพฤติกรรมที่ทำงานอยู่แล้ว จึงไม่เหมาะกับรอบนี้

## ข้อกำหนดห้ามถอยหลัง

- ต้องแสดง Uncle Tung AI Logo จากโฟลเดอร์ `logo.svg` ใน Sidebar, Customer Journey และ AI Analysis
- Navigation, Business Mode, Avatar, Contact Channel, Role และ Journey ต้องใช้ Vector Symbol จาก `app/icons.svg`
- Build และ Dev Server ต้องอ่าน Asset จาก Manifest กลางเดียวกัน
- `npm run check` ต้องหยุดด้วย Exit Code 1 หาก Logo, SVG, Symbol หรือ Asset route ใดหาย
- รักษา CI หลัก: Ink `#17171f`, Orange `#e84f00`, Accent Orange `#ff6b1a` และสีบริบทธุรกิจเดิม
- ไม่เพิ่ม Dependency ฝั่ง Browser และไม่เปลี่ยนรูปแบบข้อมูลเดิมจน Import JSON เก่าใช้ไม่ได้
- รองรับ Keyboard, Reduced Motion และพื้นที่กดอย่างน้อย 44 พิกเซลบน Touch Device

## โครงสร้างประสบการณ์

### 1. Dashboard สำหรับตัดสินใจ

คง Business Mode Switch และ Role Workspace เพราะเป็นตัวแยกบริบทธุรกิจที่สำคัญ แต่ลดการซ้อนข้อมูลด้วยการวาง “เป้ารายได้” คู่กับ “เรื่องที่ต้องตัดสินใจก่อน” ใน Command Grid เดียวกัน KPI หลักสี่ตัวและ Customer Journey ยังคงมองเห็นทันที ส่วน Business Health, ลูกค้าล่าสุด และงานติดตามย้ายเข้า `details` ชื่อ “ข้อมูลประกอบการตัดสินใจ” ที่เปิดเมื่อผู้ใช้ต้องการ

หลังเปลี่ยน Business Mode ระบบแสดง Context Confirmation ว่าได้ปรับ KPI, Journey, Customer Segment และ Package แล้ว เพื่อให้ผู้ใช้เข้าใจผลของปุ่มทันที

### 2. CRM ที่ควบคุมและย้อนกลับได้

Lead Card ทุกใบมี Checkbox และ Native Stage Select ซึ่งย้ายได้ทั้งเดินหน้าและย้อนกลับ การเลือกหลาย Lead เปิด Bulk Toolbar สำหรับย้าย Stage พร้อมกัน ใช้ Native Control เพื่อรองรับ Keyboard และ Touch โดยไม่พึ่ง Drag-and-drop

การเปลี่ยน Stage, Bulk Move และ Delete สร้าง Undo Action หนึ่งระดับใน Toast ผู้ใช้กด “เลิกทำ” เพื่อคืนค่าล่าสุดได้ การลบ Customer คืน Customer, Lead และ Deal ที่เกี่ยวข้องกลับมาพร้อมกัน

### 3. Customer Form แบบ Progressive Disclosure

ช่องหลักที่เห็นทันทีมีชื่อ เบอร์โทร ช่องทาง และความต้องการ ส่วน Package, ประเภทลูกค้า, Avatar และ Upload อยู่ใน `details` ชื่อ “ข้อเสนอและโปรไฟล์เพิ่มเติม” ระบบเลือก Package แนะนำอันดับแรกตาม Business Mode และแสดงเหตุผลสั้นจาก Catalog

เมื่อบันทึกสำเร็จ Form กลับสู่สถานะเริ่มต้น แต่คง Package และประเภทลูกค้าที่สัมพันธ์กับ Business Mode ปัจจุบัน

### 4. AI Analysis First-use

Textarea เริ่มว่างเพื่อไม่แสดง Prompt ซ้ำกับ Preview ผู้ใช้เลือก “ใช้ Prompt นี้” หรือ Quick Question ได้ หน้าเริ่มต้นแสดงคำถามแนะนำสี่แบบ, เวลาที่ข้อมูลเปลี่ยนล่าสุด และ Source Metrics ได้แก่จำนวนลูกค้า Lead ดีล และงาน

หลัง AI ตอบ ระบบแสดง Evidence Strip เหนือคำตอบ เพื่อให้รู้ว่าคำแนะนำอ้างอิง Snapshot ใด ไม่แสดงเบอร์โทร รูปโปรไฟล์ หรือ API Key

### 5. Motion และ Performance

Progress Bar ทั้งหมดใช้ `transform: scaleX()` แทน `transition: width` เพื่อลด Layout Work และเคารพ `prefers-reduced-motion` Prompt Preview เลิกใช้ Side-stripe Border และใช้ Full Border กับ Background Tint ตาม Design System

## Data Flow

- `saveState()` บันทึก `meta.updatedAt` ทุกครั้งที่ข้อมูลเปลี่ยน
- `renderAll()` คำนวณ Dashboard, Form Suggestion, CRM Selection และ AI Snapshot จาก State ชุดเดียว
- Lead Selection เป็น UI State ในหน่วยความจำ ไม่ถูกส่งออก JSON
- Undo เก็บ Callback ของการเปลี่ยนแปลงล่าสุดในหน่วยความจำ และบันทึก State ใหม่เมื่อผู้ใช้กู้คืน
- Import เก่าที่ไม่มี `meta` จะได้รับค่าเริ่มต้นผ่าน `normalizeState()`

## Error Handling

- หาก Asset Contract ไม่ครบ Build Check ต้องล้มก่อน Deploy
- หาก Lead ที่เลือกถูกลบหรือไม่มีอยู่ Bulk Action จะข้ามรายการนั้นและแจ้งจำนวนที่เปลี่ยนจริง
- หาก AI API ล้ม หน้าเดิมยังคงแสดง Snapshot ของข้อมูลและมีข้อความให้ลองใหม่
- Undo หมดอายุเมื่อ Toast ปิดหรือมี Action ใหม่ เพื่อป้องกันการคืน State ที่ไม่ตรงบริบท

## Verification

- Static Asset Contract ตรวจ Logo ทั้งสี่ไฟล์, Sprite, Symbol ที่อ้างอิง และ Route ใน Manifest
- Build Smoke ตรวจทุก Asset Route ได้ HTTP 200, Content-Type ถูก และ Body ไม่ว่าง
- Browser ตรวจ Desktop, Tablet และ Mobile: Logo มี `naturalWidth > 0`, Vector Symbol แสดง, Business/Role Switch เปลี่ยนเนื้อหา, CRM ย้ายกลับได้, Bulk Move และ Undo ทำงาน, Customer Details เปิดปิดได้, Quick Question เติม Prompt ได้
- ตรวจ Console Error, Keyboard Focus และ Reduced Motion

