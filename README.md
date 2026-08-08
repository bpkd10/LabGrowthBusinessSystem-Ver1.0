# Business Growth CRM

ระบบบริหารลูกค้า งานขาย แพ็กเกจ และงานติดตามสำหรับธุรกิจ Online, Onsite, Wholesale และ Retail รองรับการใช้งานจริงแบบข้อมูลเฉพาะเครื่อง และใช้เป็น Workshop Demo ได้

## ไฟล์สำคัญ

- `course-outline.md`: โครงคอร์ส, learning outcome, agenda และวิธีวัดผล
- `workbook.md`: ใบงานสำหรับผู้เรียน ใช้กรอก business diagnosis, data map, KPI และ scenario test
- `app/index.html`: ตัวอย่าง web app ที่เปิดใช้ได้ทันที
- `app/styles.css`: หน้าตาและ responsive layout
- `app/app.js`: sample data, KPI calculation, CRM workflow และ localStorage
- `logo.svg/`: ไฟล์ต้นฉบับ Logo CI ทั้ง Wordmark, Dark, Light และ Favicon
- `app/brand/`: สำเนา Logo สำหรับ deployment bundle ห้ามแก้แยกจากไฟล์ต้นฉบับ
- `app/icons.svg`: Vector Icon Sprite กลางของทุก Business, Role และช่องทางติดต่อ
- `scripts/assets.mjs`: Asset Manifest กลางที่ Build และ Dev Server ใช้ร่วมกัน

## วิธีเปิด demo

แอปโหลดไฟล์แบบ ES module และต้องส่ง Security Header ชุดเดียวกับ production จึงต้องเปิดผ่าน local server ไม่ใช่เปิดไฟล์ `index.html` ตรง ๆ:

```bash
npm run dev
```

แล้วเข้า:

```text
http://localhost:4173/
```

### AI Analysis ใช้ API key ของผู้ใช้เอง (BYOK)

ระบบไม่มี API key ฝั่ง server อีกต่อไป ผู้ใช้แต่ละคนใส่ key ของตัวเองในหน้า "วิเคราะห์ด้วย AI" แล้วเบราว์เซอร์จะเรียก OpenAI โดยตรง ทั้ง key และข้อมูลธุรกิจไม่ผ่าน server ของระบบนี้ ค่าใช้จ่ายจึงอยู่ที่บัญชีของผู้ใช้เอง

สิ่งที่ต้องรู้ก่อนใช้:

- key ถูกเก็บใน `sessionStorage` ของเบราว์เซอร์ ปิดแท็บแล้วหาย ถ้าติ๊ก "จำ key ไว้ในเครื่องนี้" จะย้ายไปเก็บใน `localStorage` ห้ามติ๊กบนเครื่องที่ใช้ร่วมกันหรือเครื่องในห้องอบรม
- key ไม่ถูกเก็บรวมกับข้อมูลธุรกิจ การ Export JSON จึงไม่พ่วง key ไปกับไฟล์ที่แชร์
- JavaScript ที่รันบนหน้านี้อ่าน key ได้ตามธรรมชาติของการเก็บฝั่ง browser
- ชื่อโมเดลแก้ได้เอง ถ้าบัญชีของคุณไม่มีสิทธิ์ใช้โมเดลค่าเริ่มต้น ระบบจะบอกให้เปลี่ยนชื่อโมเดลแทนที่จะแจ้ง error กว้าง ๆ
- เมื่อยังไม่ตั้งค่า key ส่วนอื่นของแอปใช้งานได้ครบตามปกติ

หากเคยตั้ง `OPENAI_API_KEY` ไว้ใน `.env.local` ตอนนี้ไม่มีอะไรอ่านค่านั้นแล้ว ควรเพิกถอน key เดิมในหน้า dashboard ของ OpenAI แล้วลบไฟล์ทิ้ง

## นำขึ้นใช้งานจริง (Public Link)

```bash
npm run deploy
```

คำสั่งนี้รัน `npm run check` ให้ผ่านก่อน แล้วค่อย `npx wrangler deploy` ขึ้น Cloudflare Workers ตาม `wrangler.toml` เป็นคำสั่งที่ต้องรันด้วยมือ CI ไม่เรียกให้ ก่อนรันควรอ่าน `docs/adr-001-byok-and-public-link.md` หัวข้อ 5.3 ว่าอะไรกลายเป็นสาธารณะบ้าง

ข้อมูลลูกค้าทั้งหมดอยู่ใน browser ของผู้ใช้แต่ละคน การ deploy จึงเผยแพร่เฉพาะตัวแอป ไม่ได้เผยแพร่ข้อมูลของใคร แต่หมายความว่าใครก็เปิด URL นี้ได้ ถ้าต้องการจำกัดผู้เข้าถึง ใช้ Cloudflare Access ครอบไว้โดยไม่ต้องแก้โค้ด

## ฟังก์ชันหลัก

- Business Profile ปรับ KPI, Customer Journey และบริบทตามรูปแบบธุรกิจ
- Avatar แบบ Pixel เลือกตามหมวดธุรกิจ พร้อมอัปโหลดรูปจริงให้ลูกค้าได้
- ไอคอนช่องทางติดต่อสำหรับ Social, Website, Marketplace, POS, โทรศัพท์ และตัวแทนจำหน่าย
- Role Dashboard สำหรับเจ้าของ ฝ่ายขาย การตลาด และทีมปฏิบัติการ
- เมนูภาษาไทยและการเปลี่ยนหน้าแบบชัดเจนผ่าน URL hash
- Dashboard เหลือ 4 KPI หลัก แต่ละ KPI คลิกไปหน้ารายละเอียดได้
- รูปโปรไฟล์ลูกค้า อัปโหลดแล้วลดขนาดก่อนบันทึกใน browser
- Marketing Solution Package 4 ระดับ เชื่อมจากลูกค้าไป CRM และสร้างโอกาสขายได้
- CRM แก้ไข Lead, เปลี่ยน Stage ย้อนกลับ, ทำ Bulk Action, ลบข้อมูล และ Undo ได้
- AI Analysis วิเคราะห์โอกาสรายได้ ลำดับ Lead แผนขาย และงานค้างจากข้อมูลในระบบ โดยใช้ API key ของผู้ใช้เอง
- ไม่ส่งเบอร์โทรหรือรูปโปรไฟล์ไปที่ AI API และข้อมูลไม่ผ่าน server ของระบบนี้

## ตรวจระบบก่อน Deploy

```bash
npm run check
```

คำสั่งนี้ตรวจ Asset Manifest, Logo SVG ทั้ง 4 แบบ, ความตรงกันระหว่าง `logo.svg/` กับ `app/brand/`, CI color token, Vector Icon ที่ถูกเรียกใช้, UI contract, JavaScript syntax และ Build route จริงทั้ง 9 เส้นทาง หากไฟล์ Logo/Icon อยู่นอก deployment bundle, หาย, สี CI ไม่ตรง หรือ Build ส่งไฟล์เก่าไม่ตรงกับ source ระบบจะหยุดก่อน Deploy

## Flow การใช้งาน

1. ตั้งค่า Business Profile และเลือกรูปแบบ Online, Onsite, Wholesale หรือ Retail
2. เปิด Dashboard เพื่อดู KPI ตามบทบาท
3. ไปที่ Customers แล้วเพิ่มลูกค้าใหม่ เลือกช่องทางและ Avatar ตามประเภทธุรกิจ
4. ไปที่ CRM แล้วตรวจว่า Lead ใหม่เข้ามาใน Pipeline
5. เปลี่ยนสถานะ Lead สร้างโอกาสขาย หรือสร้างงานติดตาม
6. ไปที่ Pipeline ธุรกิจ แล้วเพิ่มดีลหรือเปลี่ยนสถานะเป็นชนะดีล
7. กลับมาที่ Dashboard แล้วดู Revenue, Conversion และงานค้างที่เปลี่ยนตามข้อมูล

## ขอบเขตข้อมูล

เวอร์ชันนี้เก็บข้อมูลใน browser ด้วย localStorage จึงเหมาะกับเจ้าของธุรกิจรายเดียว การทดลองใช้ และ Workshop หากต้องใช้ร่วมกันหลายคนควรย้าย data layer ไปยังฐานข้อมูลกลางและเพิ่มระบบสิทธิ์ผู้ใช้
