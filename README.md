# eLeave+ : ระบบลาออนไลน์ (Enterprise Leave Management on Google Apps Script)

ระบบบริหารจัดการการลาออนไลน์ระดับองค์กร (eLeave+) พัฒนาด้วย Google Apps Script (GAS) ขับเคลื่อนด้วยฐานข้อมูล Google Sheets และระบบจัดเก็บไฟล์แนบผ่าน Google Drive โดยอ้างอิงและปรับปรุงสถาปัตยกรรมจากระบบ eLeave เดิม (Kotchasan/Goragod Framework) ให้ทำงานได้แบบ 100% Serverless บน Google Workspace ปราศจากค่าใช้จ่ายเซิร์ฟเวอร์ ดูแลรักษาง่าย และรองรับการขยายตัว

---

## 🌟 จุดเด่นและคุณสมบัติหลัก (Key Features)

1. **สถาปัตยกรรม Serverless 100%**
   - รันบน Google Apps Script V8 Runtime
   - ฐานข้อมูล Relational แบบ Multi-Sheet บน Google Spreadsheet
   - เก็บไฟล์แนบเอกสาร (PDF, รูปภาพ) บน Google Drive อัตโนมัติ พร้อมสิทธิ์เข้าถึงเฉพาะองค์กร
   - ไม่ต้องติดตั้ง MySQL, Apache, Nginx หรือ PHP

2. **ระบบการอนุมัติหลายระดับ (Multi-Level Approval Flow)**
   - รองรับการกำหนดขั้นตอนการอนุมัติแบบ Dynamic (เช่น ลำดับ 1: หัวหน้าฝ่าย `APPROVER` แผนกตนเอง -> ลำดับ 2: ฝ่ายบุคคล `HR` กลาง)
   - การกระทำที่รองรับ: **อนุมัติ (Approve)**, **ปฏิเสธ (Reject)**, **ส่งกลับเพื่อแก้ไข (Return for edit)**
   - บันทึกประวัติและ Audit Trail ทุกความเคลื่อนไหวลงในตาราง `LEAVE_LOGS`

3. **คำนวณวันลาและสิทธิ์อย่างแม่นยำ (Fiscal Year & Policy Validation)**
   - คำนวณวันลาตามประเภท: เต็มวัน (1.0), ครึ่งวันเช้า (0.5), ครึ่งวันบ่าย (0.5)
   - หักวันหยุดประจำสัปดาห์ (เสาร์-อาทิตย์) และวันหยุดนักขัตฤกษ์ในปฏิทินบริษัทอัตโนมัติ
   - คำนวณโควตาแยกตามปีงบประมาณ/ปีสิทธิ์วันลา พร้อมระบบป้องกันการลาเกินโควตาแบบ Real-time
   - ตรวจสอบเงื่อนไขการแนบเอกสารประกอบ (เช่น ลาป่วยตั้งแต่ 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์)
   - ตรวจสอบสิทธิ์การยื่นลาย้อนหลังตามนโยบายของแต่ละประเภทการลา

4. **ส่วนติดต่อผู้ใช้งานที่ทันสมัย (Single Page Application - SPA)**
   - ออกแบบด้วย Tailwind CSS และ Google Fonts (Prompt)
   - รองรับ Responsive เต็มรูปแบบ (Desktop, Tablet, Mobile)
   - **Dashboard**: แสดงสรุปยอดวันลา สถิติการลา และรายการผู้ที่ลาในวันนี้
   - **ปฏิทินการลา (Leave Calendar)**: ปฏิทินรายเดือน 7 วัน (อาทิตย์ - เสาร์ พร้อมตัวย่อ EN) แสดงแถบสีแยกตามประเภทการลา
   - **รายงานการลาและโควตา (Leave Balance Matrix)**: ตารางสรุปสิทธิ์วันลา วันที่ใช้ วันที่รออนุมัติ และวันลาคงเหลือของพนักงานทุกคน พร้อมปุ่ม Export CSV
   - **ระบบจัดการสำหรับผู้ดูแลระบบ (Admin Control Panel)**: จัดการพนักงาน, แผนก, ประเภทการลา, ขั้นตอนการอนุมัติ, วันหยุดประจำปี และตั้งค่าระบบ

5. **ระบบความปลอดภัย (Security & Concurrency Safety)**
   - ป้องกัน Race Condition และ Concurrency Collision ใน Google Sheets ด้วย `LockService` แบบ Re-entrant
   - รหัสผ่านเข้ารหัสแบบ Salted SHA-256 Iteration 1,000 รอบ
   - ระบบป้องกัน Brute-force Login (จำกัด 5 ครั้ง / ล็อกชั่วคราว 15 นาที)
   - Session Token มีวันหมดอายุและสามารถเพิกถอนได้ทันที

---

## 🗄️ โครงสร้างฐานข้อมูล (Google Sheets Database Schema)

ฐานข้อมูลเชื่อมต่อกับ Spreadsheet ID: `1KggnNTB-eNaUN-YIBjEwbsYviIo_EcyIRGoM1VzqmaA`
ประกอบด้วย 9 ตาราง (Sheets):

| ตาราง | วัตถุประสงค์ |
|---|---|
| `USERS` | ข้อมูลพนักงาน, แผนก, ตำแหน่ง, รหัสผ่านเข้ารหัส, บทบาท (`ADMIN`, `HR`, `APPROVER`, `EMPLOYEE`) |
| `SESSIONS` | โทเค็นและอายุของเซสชันการเข้าสู่ระบบ |
| `DEPARTMENTS` | รายชื่อแผนก/ฝ่ายงาน |
| `LEAVE_TYPES` | ประเภทการลา, โควตาต่อปี, เงื่อนไขการแนบเอกสาร, สิทธิ์ลาย้อนหลัง, สีประจำประเภท |
| `APPROVAL_STEPS` | ขั้นตอนและสายอนุมัติใบลา |
| `HOLIDAYS` | ปฏิทินวันหยุดนักขัตฤกษ์และวันหยุดบริษัท |
| `LEAVE_REQUESTS` | ข้อมูลคำขอการลา, วันที่, ช่วงเวลา, จำนวนวัน, สถานะ, เหตุผล, ลิงก์ไฟล์แนบ |
| `LEAVE_LOGS` | บันทึกประวัติการดำเนินการ (Audit Trail) ทุกขั้นตอน |
| `CONFIG` | ค่ากำหนดระบบ (ชื่อบริษัท, รอบปีงบประมาณ, การแจ้งเตือน, โฟลเดอร์ Drive) |

---

## 👥 บัญชีผู้ใช้งานสำหรับทดสอบระบบ (Default Test Accounts)

ทุกบัญชีมีรหัสผ่านเริ่มต้นตามที่ระบุ:

| บัญชี (Username) | รหัสผ่าน (Password) | บทบาท (Role) | แผนก (Department) | คำอธิบาย |
|---|---|---|---|---|
| `admin` | `Admin@1234` | **ADMIN** | ฝ่ายบริหาร | ผู้ดูแลระบบสูงสุด จัดการตั้งค่าได้ทุกส่วน |
| `hr.somying` | `Demo@1234` | **HR** | ฝ่ายบุคคล | ฝ่ายบุคคล ตรวจสอบใบลาขั้นสุดท้าย และดูรายงานพนักงานทุกคน |
| `boss.it` | `Demo@1234` | **APPROVER** | ฝ่าย IT | หัวหน้าฝ่าย IT อนุมัติใบลาของพนักงานในฝ่าย IT (ขั้นที่ 1) |
| `emp.it` | `Demo@1234` | **EMPLOYEE** | ฝ่าย IT | พนักงานฝ่าย IT ยื่นขอลา ตรวจสอบสถานะ และดูสิทธิ์คงเหลือ |
| `boss.sales` | `Demo@1234` | **APPROVER** | ฝ่ายขายและการตลาด | หัวหน้าฝ่ายขาย |
| `emp.sales` | `Demo@1234` | **EMPLOYEE** | ฝ่ายขายและการตลาด | พนักงานฝ่ายขาย |

---

## 🚀 ลิงก์การใช้งานระบบ (Deployment Links)

- **Web App URL (Live):**
  https://script.google.com/macros/s/AKfycbyPNo5qtRla_zb_mDDsqm2GNf683NCHb57VKYzO1PdYolHudwAEJYrXvpa14iFOTuKooQ/exec

- **Google Apps Script Editor:**
  https://script.google.com/d/1eoivGvc_v-_Q6Kj9W3oGw-6wK216uvlOebpW9tO18ExSyiye7utADZoY/edit

- **Google Sheets Database:**
  https://docs.google.com/spreadsheets/d/1KggnNTB-eNaUN-YIBjEwbsYviIo_EcyIRGoM1VzqmaA/edit

---

## 📦 โครงสร้างไฟล์ในแพ็กเกจ (Source Code Structure)

```
eLeavePlus/
├── .clasp.json          # clasp configuration
├── README.md            # คู่มือและเอกสารระบบฉบับสมบูรณ์
└── src/
    ├── appsscript.json  # Manifest, Scopes & Web App Config
    ├── Config.gs        # ค่าคงที่, สคีมาฐานข้อมูล, บทบาท, การตั้งค่าเริ่มต้น
    ├── Utils.gs         # ฟังก์ชันคำนวณวัน, เข้ารหัส SHA-256, Envelopes
    ├── Db.gs            # Database Layer & LockService concurrency control
    ├── Setup.gs         # ตัวสร้างและฟอร์แมตโครงสร้างตารางอัตโนมัติ
    ├── Auth.gs          # ระบบยืนยันตัวตน, เซสชัน, ป้องกัน Brute-force
    ├── Workflow.gs      # Business Rules, ตรวจสอบโควตา, สายอนุมัติ
    ├── Files.gs         # ระบบอัปโหลดและจัดเก็บเอกสารบน Google Drive
    ├── Notify.gs        # ระบบแจ้งเตือนทางอีเมลและ Telegram
    ├── Reports.gs       # แดชบอร์ด, รายงานสรุปวันลาคงเหลือ, ปฏิทิน
    ├── Admin.gs         # เมนูและ API จัดการระบบสำหรับแอดมิน
    ├── Code.gs          # Entry Point (doGet) และ RPC Bridge (apiCall)
    └── Index.html       # Single Page Application Frontend (Tailwind + Vanilla JS)
```
