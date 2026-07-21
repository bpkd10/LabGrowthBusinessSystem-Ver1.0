# Workshop Project 4: Business Growth Dashboard Web App

แพ็กนี้ใช้สำหรับสอน workshop สร้าง web app ระบบธุรกิจแบบ CDP + CRM + Mini ERP + Data Analysis

## ไฟล์สำคัญ

- `course-outline.md`: โครงคอร์ส, learning outcome, agenda และวิธีวัดผล
- `workbook.md`: ใบงานสำหรับผู้เรียน ใช้กรอก business diagnosis, data map, KPI และ scenario test
- `app/index.html`: ตัวอย่าง web app ที่เปิดใช้ได้ทันที
- `app/styles.css`: หน้าตาและ responsive layout
- `app/app.js`: sample data, KPI calculation, CRM workflow และ localStorage

## วิธีเปิด demo

เวอร์ชันนี้มี AI Analysis จึงควรเปิดผ่าน local server:

```bash
npm run dev
```

แล้วเข้า:

```text
http://localhost:4173/
```

ระบบจะอ่าน `OPENAI_API_KEY` จาก `.env.local` เฉพาะฝั่ง server ห้ามนำ key ไปใส่ใน `app/index.html` หรือ `app/app.js` เพราะผู้เปิดเว็บจะมองเห็นได้

## ฟังก์ชันที่เพิ่มในเวอร์ชัน 2

- เมนูภาษาไทยและการเปลี่ยนหน้าแบบชัดเจนผ่าน URL hash
- Dashboard เหลือ 4 KPI หลัก แต่ละ KPI คลิกไปหน้ารายละเอียดได้
- รูปโปรไฟล์ลูกค้า อัปโหลดแล้วลดขนาดก่อนบันทึกใน browser
- Marketing Solution Package 4 ระดับ เชื่อมจากลูกค้าไป CRM และสร้างโอกาสขายได้
- AI Analysis วิเคราะห์โอกาสรายได้ ลำดับ Lead แผนขาย และงานค้างจากข้อมูลในระบบ
- ไม่ส่งเบอร์โทรหรือรูปโปรไฟล์ไปที่ AI API

## Flow ที่ใช้สอน

1. เปิด Dashboard เพื่อดู KPI เริ่มต้น
2. ไปที่ Customers แล้วเพิ่มลูกค้าใหม่
3. ไปที่ CRM แล้วตรวจว่า lead ใหม่เข้ามาใน pipeline
4. กด Move next เพื่อเปลี่ยนสถานะ lead
5. กด Create task เพื่อสร้าง follow-up task
6. ไปที่ Deals แล้วเพิ่ม deal หรือเปลี่ยน stage เป็น Won
7. กลับมาที่ Dashboard แล้วดูว่า revenue, conversion rate และ pending task เปลี่ยนอย่างไร

## จุดที่ตั้งใจให้เป็น MVP

Demo นี้ยังไม่ใช้ backend จริง เพราะเป้าหมายคือให้ผู้เรียนเข้าใจ workflow และทดลองระบบได้เร็ว ข้อมูลถูกเก็บใน browser ด้วย localStorage ถ้าต้องการต่อยอดเป็นระบบจริง ให้ย้าย data layer ไปที่ Supabase, Google Sheets หรือ database ที่องค์กรใช้
