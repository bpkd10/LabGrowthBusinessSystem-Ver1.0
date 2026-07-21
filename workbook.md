# Workbook: Business Growth Dashboard Web App

## วิธีใช้

ใช้ workbook นี้ระหว่างอบรมเพื่อแปลงไอเดียธุรกิจเป็นระบบ web app จริง ให้เขียนคำตอบสั้น ตรง และใช้ธุรกิจของตัวเองถ้ามี

## Part 1: Business Diagnosis

### 1. ธุรกิจขายอะไร

ตัวอย่าง: คอร์ส AI สำหรับองค์กร, package consulting, สินค้า skincare, clinic service

คำตอบ:

```text

```

### 2. ลูกค้าหลักคือใคร

คำตอบ:

```text

```

### 3. Lead มาจากช่องทางไหน

เลือกอย่างน้อย 3 ช่องทาง

```text
Facebook:
TikTok:
LINE OA:
Website:
Google Form:
Event:
Walk-in:
Referral:
อื่น ๆ:
```

### 4. ตอนนี้ข้อมูลกระจายอยู่ตรงไหน

```text
LINE:
Facebook inbox:
Excel/Google Sheets:
โทรศัพท์ของทีมขาย:
Notebook หรือ paper:
ระบบอื่น:
```

### 5. ปัญหาที่กระทบรายได้มากที่สุด

เลือก 1-2 ข้อที่สำคัญจริง

```text
ลูกค้าหลุดเพราะไม่ follow-up:
ไม่รู้ว่าช่องทางไหนคุ้ม:
ไม่รู้ว่า deal ไหนควรปิดก่อน:
เจ้าของต้องถามทีมเองตลอด:
ข้อมูลซ้ำหรือหาย:
งานหลังบ้านส่งมอบช้า:
อื่น ๆ:
```

## Part 2: Data Mapping

### Customer Data

```text
ชื่อ:
เบอร์:
Email:
LINE ID:
Source:
Interest:
Note:
```

### Sales Data

```text
Lead status:
Deal value:
Probability:
Expected close date:
Order amount:
Payment status:
```

### Operation Data

```text
Task:
Owner:
Due date:
Priority:
Delivery status:
```

### Analysis Data

```text
Revenue:
Conversion rate:
Top source:
Top product:
Pipeline value:
Pending tasks:
```

## Part 3: KPI Design

ให้เลือก KPI 5 ตัวที่เจ้าของธุรกิจควรเปิดดูทุกสัปดาห์

```text
1.
2.
3.
4.
5.
```

คำถามที่ KPI ต้องตอบ:

```text
เราควรเร่งติดตามลูกค้ากลุ่มไหน:
ช่องทางไหนสร้างรายได้ดีที่สุด:
สินค้า/บริการไหนควรผลักดัน:
งานหลังบ้านค้างตรงไหน:
เดือนนี้ธุรกิจดีขึ้นหรือแย่ลง:
```

## Part 4: Web App Scenario Test

เปิดไฟล์ `app/index.html` แล้วทดสอบ workflow นี้

### Scenario A: Add Lead

```text
1. ไปหน้า Customers
2. เพิ่มลูกค้าใหม่
3. เลือก source
4. ใส่ interest
5. ตรวจว่าลูกค้าไปอยู่ใน CRM pipeline
```

ผลที่เห็น:

```text

```

### Scenario B: Follow-up

```text
1. ไปหน้า CRM
2. เลือก lead ที่ยังเป็น New Lead
3. เปลี่ยนสถานะเป็น Contacted หรือ Interested
4. สร้าง task เพื่อติดตามต่อ
5. กลับไปดู Dashboard
```

ผลที่เห็น:

```text

```

### Scenario C: Close Deal

```text
1. ไปหน้า Deals
2. เพิ่ม deal ใหม่
3. ใส่มูลค่า deal
4. เปลี่ยน stage เป็น Won
5. กลับไปดู revenue และ conversion rate
```

ผลที่เห็น:

```text

```

### Scenario D: Owner Decision

เจ้าของธุรกิจเปิด Dashboard แล้วควรตัดสินใจอะไรต่อ

```text
Insight ที่เห็น:
Action ที่ควรทำ:
Owner ที่รับผิดชอบ:
Deadline:
```

## Part 5: Roadmap จาก Prototype ไปสู่ระบบจริง

### Version 1: ใช้ในทีมเล็ก

```text
Data storage:
User role:
Import/export:
Report:
```

### Version 2: เชื่อม automation

```text
LINE OA:
Google Form:
Google Sheets:
Notification:
```

### Version 3: เพิ่ม AI Insight

```text
AI วิเคราะห์ lead:
AI แนะนำ next action:
AI สรุป performance:
AI สร้าง follow-up message:
```

## Part 6: Prompt Template สำหรับผู้เรียน

ใช้ prompt นี้เพื่อให้ AI ช่วยแปลงธุรกิจจริงเป็น requirement

```text
คุณคือ Business System Analyst
ช่วยออกแบบ web app สำหรับธุรกิจนี้:

ธุรกิจ:
ลูกค้าหลัก:
สินค้า/บริการ:
ช่องทางที่ lead เข้ามา:
ปัญหาปัจจุบัน:
เป้าหมายรายได้:

ขอ output เป็น:
1. Module ที่ควรมี
2. Data table ที่ต้องเก็บ
3. KPI dashboard
4. User flow หลัก
5. MVP scope ที่ทำได้ใน 1-2 สัปดาห์
```
