# 🏢 eLeave+ : ระบบบริหารจัดการการลาออนไลน์ระดับองค์กร
### Enterprise Leave Management System on Google Apps Script (100% Serverless)

<div align="center">

[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)](https://github.com/longzedesign-dotcom/eLeavePlus)
[![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script%20%7C%20Web%20App-34A853?style=flat-square&logo=google)](https://script.google.com/)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets%20(9%20Sheets)-0F9D58?style=flat-square&logo=googlesheets)](https://www.google.com/sheets/about/)
[![Serverless](https://img.shields.io/badge/Architecture-100%25%20Serverless-orange?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**🌐 Web App Production URL:**  
[https://script.google.com/macros/s/AKfycbyPNo5qtRla_zb_mDDsqm2GNf683NCHb57VKYzO1PdYolHudwAEJYrXvpa14iFOTuKooQ/exec](https://script.google.com/macros/s/AKfycbyPNo5qtRla_zb_mDDsqm2GNf683NCHb57VKYzO1PdYolHudwAEJYrXvpa14iFOTuKooQ/exec)

---

### 📚 เอกสารคู่มือฉบับสมบูรณ์ (Documentation)
**[📗 คู่มือการใช้งานระบบฉบับสมบูรณ์ (MANUAL_USER.md)](./MANUAL_USER.md)** · **[📘 คู่มือการติดตั้งและตั้งค่าระบบ (INSTALL_GUIDE.md)](./INSTALL_GUIDE.md)**

---

</div>

## 🌟 ภาพรวมระบบ (System Overview)

**eLeave+** คือระบบบริหารจัดการการลาออนไลน์ระดับองค์กร พัฒนาด้วยเทคโนโลยี **Google Apps Script (GAS) V8 Runtime** ขับเคลื่อนด้วยฐานข้อมูล **Google Sheets** และจัดเก็บเอกสารแนบผ่าน **Google Drive** โดยถูกออกแบบให้ทำงานแบบ **100% Serverless บน Google Workspace** ปราศจากค่าใช้จ่ายค่าโฮสติ้งหรือเซิร์ฟเวอร์ ดูแลรักษาง่าย รองรับการใช้งานผ่านมือถือ แท็บเล็ต และคอมพิวเตอร์อย่างราบรื่น

---

## 🚀 คุณสมบัติเด่นของระบบ (Key Features)

### 1. สถาปัตยกรรม Serverless 100% (Zero Infrastructure Cost)
- ทำงานบน Google Apps Script และ Google Workspace Ecosystem เต็มรูปแบบ
- ไม่ต้องติดตั้งและดูแลรักษาฐานข้อมูล MySQL, PostgreSQL, Apache หรือ Nginx
- จัดเก็บไฟล์แนบ (PDF, ใบรับรองแพทย์, เอกสารราชการ) ลงบน Google Drive อัตโนมัติ พร้อมสิทธิ์เข้าถึงเฉพาะองค์กร

### 2. ระบบสายการอนุมัติหลายระดับ (Multi-Level Approval Flow)
- กำหนดขั้นตอนการอนุมัติแบบยืดหยุ่น (เช่น ลำดับ 1: หัวหน้าฝ่าย `APPROVER` แผนกตนเอง -> ลำดับ 2: ฝ่ายบุคคล `HR`)
- รองรับการดำเนินการ: **อนุมัติ (Approve)**, **ปฏิเสธ (Reject)**, และ **ส่งกลับเพื่อแก้ไข (Return for edit)**
- บันทึกประวัติและ Audit Trail ทุกขั้นตอนลงในตาราง `LEAVE_LOGS`

### 3. คำนวณวันลาและสิทธิ์อย่างแม่นยำ (Fiscal Year & Policy Validation)
- คำนวณวันลาตามประเภท: เต็มวัน (1.0), ครึ่งวันเช้า (0.5), ครึ่งวันบ่าย (0.5)
- **หักวันหยุดประจำสัปดาห์ (เสาร์-อาทิตย์) และวันหยุดนักขัตฤกษ์ในปฏิทินบริษัทอัตโนมัติ**
- คำนวณโควตาแยกตามปีงบประมาณ/ปีสิทธิ์วันลา ป้องกันการยื่นลาเกินสิทธิ์แบบ Real-time
- บังคับแนบเอกสารตามเงื่อนไข (เช่น ลาป่วยตั้งแต่ 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์)
- ตรวจสอบสิทธิ์การยื่นลาย้อนหลังตามนโยบายของแต่ละประเภทการลา

### 4. ส่วนติดต่อผู้ใช้งานทันสมัย (Responsive SPA)
- พัฒนาแบบ Single Page Application (SPA) ด้วย HTML5, Tailwind CSS, และ JavaScript ES6+ โหลดรวดเร็ว ไม่กระตุก ไม่ต้องรีเฟรชหน้าจอ
- **Dashboard**: สรุปยอดวันลาคงเหลือ สถิติการลา และรายชื่อผู้ที่ลาในวันนี้
- **ปฏิทินการลา (Leave Calendar)**: ปฏิทินรายเดือนแสดงแถบสีแยกตามประเภทการลา
- **รายงานการลาและโควตา (Leave Balance Matrix)**: ตารางสรุปสิทธิ์วันลา วันที่ใช้ วันที่รออนุมัติ และวันลาคงเหลือของพนักงานทุกคน พร้อมปุ่ม Export CSV สำหรับโปรแกรม Excel
- **Admin Control Panel**: จัดการพนักงาน, แผนก, ประเภทการลา, สายอนุมัติ, วันหยุดประจำปี และตั้งค่าระบบ

### 5. ความปลอดภัยและเสถียรภาพสูง (Enterprise Security)
- ป้องกัน Race Condition และ Concurrency Collision ใน Google Sheets ด้วย `LockService` แบบ Re-entrant
- รหัสผ่านเข้ารหัสแบบ Salted SHA-256 Iteration 1,000 รอบ
- ป้องกัน Brute-force Login (จำกัด 5 ครั้ง / ระงับชั่วคราว 15 นาที)
- Session Token มีอายุจำกัดและสามารถเพิกถอนได้ทันที

---

## 👥 ตารางสิทธิ์และบทบาทผู้ใช้งาน (Role Matrix)

| บทบาท (Role) | สัญลักษณ์ | ยื่นใบลา / ดูโควตาตนเอง | อนุมัติระดับแผนก | อนุมัติระดับ HR / ดูทั้งบริษัท | Export CSV รายงาน | จัดการพนักงาน & ตั้งค่าระบบ |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **EMPLOYEE** | 👤 | ✅ | ❌ | ❌ | ❌ | ❌ |
| **APPROVER** | 👔 | ✅ | ✅ (เฉพาะแผนกตนเอง) | ❌ | ❌ | ❌ |
| **HR** | 📋 | ✅ | ✅ | ✅ (ทุกแผนก) | ✅ | ❌ |
| **ADMIN** | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ (สิทธิ์เต็มทุกส่วน) |

---

## 🔄 ผังกระบวนการอนุมัติใบลา (Approval Workflow)

```mermaid
flowchart TD
    A([พนักงานยื่นใบลา]) --> B{ระบบตรวจสอบเงื่อนไข\nและโควตาวันลาคงเหลือ}
    B -- เกินโควตา / ผิดนโยบาย --> C[แจ้งเตือนข้อผิดพลาดบนหน้าจอ]
    B -- ข้อมูลถูกต้อง --> D[บันทึกลงระบบ: สถานะ PENDING]
    D --> E[ส่งการแจ้งเตือน Email & Telegram]
    E --> F{หัวหน้างาน / ผู้อนุมัติพิจารณา}
    
    F -- ส่งกลับเพื่อแก้ไข --> G[สถานะ: RETURNED\nพนักงานแก้ไขและส่งใหม่]
    G --> D
    
    F -- ปฏิเสธ --> H[สถานะ: REJECTED\nแจ้งเตือนผลถึงพนักงาน]
    
    F -- อนุมัติ --> I{มีขั้นตอนถัดไปหรือไม่?\n(เช่น ฝ่ายบุคคล HR)}
    I -- มี --> J[ส่งต่อให้ฝ่ายบุคคล HR พิจารณา]
    J --> K{HR พิจารณา}
    K -- ปฏิเสธ --> H
    K -- อนุมัติ --> L[สถานะ: APPROVED\nตัดยอดโควตาวันลาจริง]
    
    I -- ไม่มี --> L
    L --> M[แจ้งเตือนพนักงานทราบผลสำเร็จ\nบันทึกลงปฏิทินบริษัท]
```

---

## 🗄️ โครงสร้างฐานข้อมูล (Google Sheets Database Schema)

ฐานข้อมูลเชื่อมต่อกับ Google Spreadsheet ประกอบด้วย 9 ตาราง (Sheets):

| ตาราง | วัตถุประสงค์และฟิลด์ข้อมูลสำคัญ |
|---|---|
| **`USERS`** | ข้อมูลพนักงาน: `userId`, `username`, `email`, `passwordHash`, `name`, `role`, `departmentId`, `position`, `phone`, `hireDate`, `active` |
| **`SESSIONS`** | เซสชันและโทเค็นการเข้าสู่ระบบ: `tokenHash`, `userId`, `expiresAt`, `createdAt` |
| **`DEPARTMENTS`** | รายชื่อแผนก/ฝ่ายงาน: `departmentId`, `name`, `active` |
| **`LEAVE_TYPES`** | ประเภทการลา: `leaveTypeId`, `name`, `quotaDays`, `attachmentRequiredDays`, `allowBackdate`, `color`, `sortOrder`, `active` |
| **`LEAVE_REQUESTS`** | ข้อมูลคำขอการลา: `requestId`, `requestNo`, `userId`, `departmentId`, `leaveTypeId`, `startDate`, `endDate`, `days`, `reason`, `attachmentsJson`, `status`, `currentStep`, `fiscalYear` |
| **`LEAVE_LOGS`** | บันทึกประวัติและ Audit Trail: `logId`, `timestamp`, `requestId`, `actorUserId`, `action`, `fromStatus`, `toStatus`, `step`, `note` |
| **`APPROVAL_STEPS`** | สายอนุมัติใบลา: `step`, `role`, `departmentId`, `label` |
| **`HOLIDAYS`** | ปฏิทินวันหยุดนักขัตฤกษ์และวันหยุดบริษัท: `date`, `name` |
| **`CONFIG`** | ค่ากำหนดระบบ: `key`, `value`, `description` (ชื่อบริษัท, รอบปีงบประมาณ, การแจ้งเตือน Email & Telegram) |

---

## 📦 โครงสร้างไฟล์ซอร์สโค้ด (Source Code Structure)

```text
eLeavePlus/
├── .clasp.json                   # ตั้งค่า Clasp สำหรับการ Deploy ไปยัง Google Apps Script
├── .gitignore                    # ไฟล์และโฟลเดอร์ที่ยกเว้นในการ Commit
├── README.md                     # เอกสารแนะนำระบบและภาพรวมหลัก (เอกสารฉบับนี้)
├── MANUAL_USER.md                # คู่มือการใช้งานระบบฉบับสมบูรณ์ (สำหรับพนักงาน, หัวหน้า, HR, Admin)
├── INSTALL_GUIDE.md              # คู่มือการติดตั้งและตั้งค่าระบบฉบับสมบูรณ์
└── src/
    ├── appsscript.json           # การกำหนดค่าสิทธิ์ (Manifest & OAuth Scopes)
    ├── Config.gs                 # ค่าคงที่, สคีมาฐานข้อมูล 9 ตาราง, บทบาท, การตั้งค่าเริ่มต้น
    ├── Utils.gs                  # ตัวคำนวณวันลา, เข้ารหัส SHA-256, จัดการ Response Envelope
    ├── Db.gs                     # Database Layer พร้อม LockService ควบคุม Concurrency
    ├── Setup.gs                  # ตัวสร้างโครงสร้างตารางและหัวตารางอัตโนมัติ (Schema Seeder)
    ├── Auth.gs                   # จัดการ Login, Session, และระบบป้องกัน Brute-Force
    ├── Workflow.gs               # หัวใจของระบบลา: คำนวณวัน, ยื่นลา, อนุมัติ, ปฏิเสธ, ส่งกลับ
    ├── Files.gs                  # จัดการอัปโหลดไฟล์แนบเอกสารลงใน Google Drive
    ├── Notify.gs                 # ส่งการแจ้งเตือนอัตโนมัติผ่าน Gmail และ Telegram Bot
    ├── Reports.gs                # สรุปสถิติวันลา, Leave Balance Matrix, Export CSV สำหรับ Excel
    ├── Admin.gs                  # แดชบอร์ดผู้ดูแลระบบ: จัดการพนักงาน, แผนก, ประเภทลา, สายอนุมัติ
    ├── Code.gs                   # Web App Entry Point (doGet) และ Universal API Dispatcher
    └── Index.html                # Single Page Application (HTML5, Tailwind CSS, Vanilla JS)
```

---

## 👤 บัญชีผู้ดูแลระบบเริ่มต้น (Default Super Admin)

เมื่อติดตั้งระบบครั้งแรก สามารถเข้าใช้งานด้วยบัญชีผู้ดูแลระบบเริ่มต้น:

| บัญชี (Username / Email) | รหัสผ่าน (Password) | บทบาท (Role) | แผนก (Department) | สิทธิ์การใช้งาน |
|---|---|:---:|---|---|
| `admin` หรือ `c.thakot@gmail.com` | `12345` หรือ `Admin@1234` | **ADMIN** | ฝ่ายบริหาร | ผู้ดูแลระบบสูงสุด จัดการได้ครบทุกส่วน |

> 🔒 **ข้อแนะนำ:** หลังเข้าสู่ระบบครั้งแรก แนะนำให้ไปที่เมนู **"การตั้งค่าระบบ" > "จัดการพนักงาน"** แล้วเปลี่ยนรหัสผ่านเพื่อความปลอดภัยสูงสุด

---

## 🚀 ขั้นตอนการติดตั้งอย่างย่อ (Quick Start)

1. สร้าง Google Spreadsheet ใหม่ คัดลอก Spreadsheet ID
2. สร้าง Google Apps Script โปรเจกต์ใหม่ นำไฟล์ในโฟลเดอร์ `src/` ไปวาง
3. ใน `Config.gs` ระบุ Spreadsheet ID ในตัวแปร `DEFAULT_SPREADSHEET_ID`
4. สั่งรันฟังก์ชัน **`ensureSchema_`** ใน Apps Script 1 ครั้ง เพื่อสร้างตารางฐานข้อมูลและใส่ข้อมูลเริ่มต้น
5. สั่ง **Deploy as Web App** (ตั้งค่า: Execute as `Me`, Who has access `Anyone`)
6. คัดลอก Web App URL ไปส่งให้พนักงานเริ่มใช้งานได้ทันที

*(อ่านขั้นตอนการติดตั้งอย่างละเอียดพร้อมภาพประกอบได้ที่ [📘 INSTALL_GUIDE.md](./INSTALL_GUIDE.md))*

---

## 📄 ลิขสิทธิ์และการพัฒนา (License)
พัฒนาและเผยแพร่ภายใต้ **MIT License**  
Repository: [https://github.com/longzedesign-dotcom/eLeavePlus](https://github.com/longzedesign-dotcom/eLeavePlus)
