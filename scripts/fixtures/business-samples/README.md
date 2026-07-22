# Business data fixtures สำหรับทดสอบ Import

ชุดนี้เป็นข้อมูลจำลองสำหรับ 4 ธุรกิจ ใช้ทดสอบ Import ใน Business Growth CRM

## ธุรกิจที่เตรียมไว้

1. `uncletungai-course-training` — คอร์ส Training ของ Uncle Tung AI ใช้ลูกค้าตัวอย่างเดิมในระบบ และเพิ่มช่องทาง Facebook, Line, TikTok
2. `porn-bakery` — ร้านอาหารและ Bakery Porn (ป้อน) มีเมนูอาหาร, Bakery, Cake, ลูกค้าจอง, walk-in และ preorder
3. `carlab-plus` — CARLab+ น้ำยาเคลือบสีรถและ Premium Car Wash พร้อมช่องทาง Line, Lazada, Shopee, TikTok
4. `complete-massage` — ร้านนวดครบวงจร มีบริการนวด, ลูกค้าจอง, walk-in และ preorder

## ลำดับทดสอบที่แนะนำ

1. ตั้งค่า Business Profile ให้ตรงกับโฟลเดอร์ เช่น `Restaurant` สำหรับ `porn-bakery`
2. นำเข้า `01-products.cvs` แล้วเลือกประเภท `สินค้า / Package / ข้อเสนอ`
3. นำเข้า `02-customers.md` แล้วเลือก `ลูกค้าและ Lead`
4. นำเข้า `03-deals.doc` แล้วเลือก `ดีลและ Pipeline`
5. นำเข้า `04-tasks.txt` แล้วเลือก `งานติดตาม`

ระบบจะรวมข้อมูลซ้ำโดยใช้ชื่อ/เบอร์โทรของลูกค้า, ชื่อสินค้า, ชื่อดีล+ลูกค้า และชื่องาน+ผู้รับผิดชอบ+กำหนดเสร็จ จึงนำเข้าไฟล์เดิมซ้ำเพื่อทดสอบ Update ได้

`.cvs` ในชุดนี้เป็นนามสกุลที่ผู้ใช้ระบุมา ระบบรองรับเป็น alias ของ `.csv` แล้ว ส่วน `.doc` เป็นข้อความ key-value เพื่อจำลองเอกสาร Word รุ่นเก่าและให้ตรวจสอบ Preview ได้ง่าย หากใช้งานจริงควรบันทึกเป็น `.docx`

## ช่องทางที่ครอบคลุม

ลูกค้าจอง, walkin onsite, preorder online, Line, Facebook, Shopee, Lazada และ TikTok ถูกใส่ไว้ในช่อง `ช่องทาง` ของข้อมูลลูกค้า

