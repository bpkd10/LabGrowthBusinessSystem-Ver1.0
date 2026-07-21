# Training Outline: Business Growth Dashboard Web App

## 1. ภาพรวมคอร์ส

**ชื่อคอร์ส:** สร้างระบบธุรกิจด้วย Web App: CDP + CRM + Mini ERP + Data Analysis

**English headline:** Business Growth Dashboard Web App Workshop

**กลุ่มเป้าหมาย:** เจ้าของธุรกิจ, ทีมการตลาด, ทีมขาย, operation, admin, ผู้เรียนที่ต้องการสร้าง web app เพื่อใช้กับธุรกิจจริง

**ปัญหาที่คอร์สนี้แก้:** ข้อมูลลูกค้ากระจายอยู่หลายที่, ทีมขายติดตามไม่ครบ, เจ้าของธุรกิจไม่เห็นตัวเลขสำคัญ, และผู้เรียนไม่รู้วิธีแปลง requirement ธุรกิจเป็น web app ที่ใช้งานได้

**เป้าหมายหลัก:** ผู้เรียนสร้าง prototype ระบบธุรกิจที่รวมข้อมูลลูกค้า, CRM pipeline, สินค้า/บริการ, deal/order, task และ dashboard วิเคราะห์ธุรกิจได้ 1 ชุด

## 2. Learning Outcomes

หลังจบคอร์ส ผู้เรียนจะสามารถ:

1. แปลง pain point ธุรกิจเป็น requirement ของระบบได้
2. ออกแบบ data structure สำหรับ CDP, CRM, Mini ERP และ dashboard ได้
3. สร้าง web app prototype สำหรับเพิ่ม lead, ติดตามงานขาย, ดูสินค้า, ปิด deal และจัดการ task ได้
4. คำนวณ metric สำคัญ เช่น revenue, conversion rate, pipeline value และ pending task ได้
5. อธิบาย next step เพื่อพัฒนาจาก prototype ไปเป็นระบบจริง เช่น Supabase, Google Sheets, LINE OA หรือ AI insight ได้

## 3. Course Structure

| Module | Topic | Outcome | Activity |
|---|---|---|---|
| 1 | Business System Thinking | เข้าใจระบบธุรกิจและบทบาทของ CDP, CRM, Mini ERP | วิเคราะห์ธุรกิจตัวอย่าง |
| 2 | Data Mapping | ระบุข้อมูลที่ต้องเก็บและความสัมพันธ์ระหว่างตาราง | ทำ data map 7 ตาราง |
| 3 | Dashboard Requirement | เลือก KPI ที่ตอบคำถามเจ้าของธุรกิจ | ออกแบบ metric board |
| 4 | Web App Prototype | สร้างหน้าหลักของระบบและ workflow สำคัญ | ใช้ demo app ทดลอง flow |
| 5 | Workflow Testing | ทดสอบเพิ่ม lead, follow-up, ปิด deal, สร้าง task | ทำ scenario test |
| 6 | Next Build Plan | วางแผนต่อยอดเป็นระบบจริง | ทำ implementation roadmap |

## 4. Agenda แบบ 1 วัน

| Time | Session | Method | Output |
|---|---|---|---|
| 09:00-09:30 | ทำไมธุรกิจต้องมีระบบรวมข้อมูล | Lecture + case | Business pain point list |
| 09:30-10:30 | แยก CDP, CRM, Mini ERP, Data Analysis | Demo | System map |
| 10:30-10:45 | Break |  |  |
| 10:45-12:00 | ออกแบบ data model 7 ตาราง | Workshop | Data mapping sheet |
| 12:00-13:00 | Lunch |  |  |
| 13:00-14:15 | สร้าง dashboard requirement และ KPI | Demo + workshop | KPI list |
| 14:15-15:30 | ทดลอง web app prototype | Hands-on | Prototype scenario result |
| 15:30-15:45 | Break |  |  |
| 15:45-16:45 | ปรับ workflow ให้เข้ากับธุรกิจของผู้เรียน | Group work | Custom workflow plan |
| 16:45-17:00 | สรุป next step | Discussion | Build roadmap |

## 5. Workshop

**โจทย์:** ธุรกิจมี lead จาก Facebook, LINE OA, Website และ referral แต่ข้อมูลกระจายอยู่ในแชทกับ spreadsheet ทำให้เจ้าของธุรกิจไม่รู้ว่าช่องทางไหนสร้างรายได้จริง และทีมขายลืม follow-up บางราย

**สิ่งที่ผู้เรียนต้องทำ:**

1. ระบุ business goal และคำถามที่เจ้าของธุรกิจต้องการตอบ
2. กำหนดข้อมูลลูกค้า, lead, deal, order, product และ task ที่ต้องเก็บ
3. ใช้ demo web app เพิ่ม lead ใหม่ 2 ราย
4. เปลี่ยนสถานะ lead อย่างน้อย 1 รายใน CRM pipeline
5. สร้าง deal และปิดเป็น Won 1 ราย
6. สร้าง follow-up task และตรวจ dashboard ว่า KPI เปลี่ยนหรือไม่
7. เขียน next action เพื่อเพิ่มรายได้จากข้อมูลที่เห็น

**ชิ้นงานที่ได้:** Business system canvas, data map, KPI list, prototype workflow, และ build roadmap

## 6. Tools

| Tool | ใช้เพื่ออะไร | เตรียมก่อนเรียน |
|---|---|---|
| Browser | เปิด web app prototype | ใช้ Chrome หรือ Edge |
| Spreadsheet | ทำ data mapping และ import/export | Google Sheets หรือ Excel |
| Supabase | ใช้อธิบาย backend/database ต่อได้ | ยังไม่จำเป็นใน MVP demo |
| AI assistant | ช่วยสร้าง requirement, schema, prompt และ test case | เตรียม account ที่องค์กรอนุญาต |
| Canva/Slides | สรุป system map และนำเสนอผลงาน | ไม่บังคับ |

## 7. Materials

- `course-outline.md`: โครงคอร์สและ agenda
- `workbook.md`: ใบงานสำหรับผู้เรียน
- `app/index.html`: web app demo
- `app/styles.css`: style ของ demo
- `app/app.js`: logic และ sample data
- ตัวอย่าง SQL schema จาก brief ต้นทาง
- แบบประเมินผลหลังอบรม

## 8. Measurement

- ผู้เรียนอธิบาย business problem เป็น requirement ได้อย่างน้อย 3 ข้อ
- ผู้เรียนสร้าง data map ครบ 4 กลุ่มข้อมูล: customer, sales, operation, analysis
- ผู้เรียนทดสอบ scenario ใน web app ได้ครบ 4 flow: add lead, follow-up, close deal, owner dashboard
- ผู้เรียนระบุ KPI ที่ช่วยตัดสินใจเพิ่มรายได้ได้อย่างน้อย 5 ตัว
- ผู้เรียนส่ง roadmap ต่อระบบจริงได้ 1 หน้า

## 9. Preparation Checklist

- ผู้เรียนมี notebook และ browser
- เตรียมธุรกิจตัวอย่างหรือธุรกิจจริงของผู้เรียน 1 ธุรกิจ
- เตรียมรายการสินค้า/บริการ 3 รายการ
- เตรียมช่องทาง lead อย่างน้อย 3 ช่องทาง
- ถ้าเรียนแบบองค์กร ให้ยืนยัน policy การใช้ AI และข้อมูลลูกค้าก่อนเรียน

## 10. Assumptions

- คอร์สนี้ออกแบบเป็น workshop 1 วัน
- ผู้เรียนไม่จำเป็นต้องเขียน backend ได้ก่อน
- Demo app ใช้ข้อมูลใน browser เพื่อให้ลอง workflow ได้เร็ว
- รอบต่อยอดสามารถเปลี่ยน storage เป็น Supabase, Google Sheets หรือฐานข้อมูลจริงได้
