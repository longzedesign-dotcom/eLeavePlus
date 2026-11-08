# 📘 คู่มือการติดตั้งระบบ eLeave+ (GAS Installation Guide)
### ระบบบริหารจัดการการลาออนไลน์ระดับองค์กรบน Google Apps Script 100% Serverless

---

## 📋 สารบัญ
1. [ภาพรวมของระบบ eLeave+](#1-ภาพรวมของระบบ-eleave)
2. [สิ่งที่ต้องเตรียมก่อนติดตั้ง](#2-สิ่งที่ต้องเตรียมก่อนติดตั้ง)
3. [วิธีที่ 1: การติดตั้งผ่าน Google Apps Script Editor (แนะนำ - ง่ายที่สุด)](#3-วิธีที่-1-การติดตั้งผ่าน-google-apps-script-editor-แนะนำ---ง่ายที่สุด)
4. [วิธีที่ 2: การติดตั้งผ่าน Clasp CLI (สำหรับนักพัฒนา)](#4-วิธีที่-2-การติดตั้งผ่าน-clasp-cli-สำหรับนักพัฒนา)
5. [การเข้าสู่ระบบครั้งแรก (First Login)](#5-การเข้าสู่ระบบครั้งแรก-first-login)
6. [การตั้งค่าระบบหลังติดตั้ง (Post-Installation Configuration)](#6-การตั้งค่าระบบหลังติดตั้ง-post-installation-configuration)
7. [การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)](#7-การแก้ไขปัญหาที่พบบ่อย-troubleshooting--faq)

---

## 1. ภาพรวมของระบบ eLeave+

**eLeave+** คือระบบลางานออนไลน์ระดับองค์กรที่ทำงานแบบ **100% Serverless บน Google Workspace**
* **Frontend:** Single Page Application (SPA) เขียนด้วย HTML5, Tailwind CSS, และ Vanilla JavaScript (เร็ว ลื่นไหล ไม่โหลดหน้าใหม่)
* **Backend:** Google Apps Script V8 Runtime
* **Database:** Google Spreadsheet (9 Sheets ทำงานร่วมกัน พร้อมระบบ LockService ป้องกันข้อมูลชนกัน)
* **Storage:** Google Drive จัดเก็บเอกสารแนบ (ใบรับรองแพทย์, เอกสารราชการ) อัตโนมัติ

---

## 2. สิ่งที่ต้องเตรียมก่อนติดตั้ง

1. **บัญชี Google Account** (Gmail ทั่วไป หรือ Google Workspace ขององค์กร)
2. **ไฟล์ต้นฉบับ eLeave+** (โฟลเดอร์ `src/` หรือไฟล์ Zip `eLeavePlus_v1.0.0_COMPLETE_PACKAGE.zip`)

---

## 3. วิธีที่ 1: การติดตั้งผ่าน Google Apps Script Editor (แนะนำ - ง่ายที่สุด)

วิธีนี้เหมาะสำหรับทุกคน ไม่ต้องพิมพ์คำสั่งหรือติดตั้งโปรแกรมเสริมใดๆ ทำผ่านเว็บเบราว์เซอร์ทั้งหมด

### ขั้นตอนที่ 3.1: สร้างฐานข้อมูล Google Spreadsheet
1. ไปที่ [Google Sheets](https://sheets.new) เพื่อสร้างสเปรดชีตเปล่าใหม่ 1 ไฟล์
2. ตั้งชื่อไฟล์ เช่น `eLeavePlus_Database`
3. คัดลอก **Spreadsheet ID** จากแถบ URL ของเบราว์เซอร์:
   ```
   https://docs.google.com/spreadsheets/d/【คัดลอกรหัสตรงนี้】/edit
   ```
   *ตัวอย่าง:* ถ้า URL คือ `https://docs.google.com/spreadsheets/d/1KggnNTB-eNaUN-YIBjEwbsYviIo_EcyIRGoM1VzqmaA/edit`  
   Spreadsheet ID คือ: `1KggnNTB-eNaUN-YIBjEwbsYviIo_EcyIRGoM1VzqmaA`

---

### ขั้นตอนที่ 3.2: สร้างโปรเจกต์ Google Apps Script
1. ไปที่ [Google Apps Script Home](https://script.google.com/home/start)
2. คลิกปุ่ม **"โปรเจกต์ใหม่" (New Project)** ที่มุมซ้ายบน
3. ตั้งชื่อโปรเจกต์ที่มุมซ้ายบนเป็น `eLeavePlus_WebApp`

---

### ขั้นตอนที่ 3.3: เปิดใช้งานไฟล์การกำหนดค่า `appsscript.json`
1. ที่เมนูด้านซ้าย คลิกไอคอนรูปเฟือง **"การตั้งค่าโครงการ" (Project Settings)**
2. ติ๊กถูกที่ช่อง **"แสดงไฟล์ Manifest "appsscript.json" ในตัวแก้ไข" (Show "appsscript.json" manifest file in editor)**
3. คลิกกลับมาที่ไอคอนโค้ด `<>` (Editor) จะเห็นไฟล์ `appsscript.json` ปรากฏขึ้น
4. เปิดไฟล์ `appsscript.json` แล้วนำโค้ดด้านล่างนี้ไปวางแทนที่ทั้งหมด:

```json
{
  "timeZone": "Asia/Bangkok",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}
```

---

### ขั้นตอนที่ 3.4: นำเข้าไฟล์โค้ด (Source Code Files)
ในโปรเจกต์ Apps Script ให้สร้างไฟล์ตามรายชื่อด้านล่างนี้ โดยกดปุ่ม **`+` ข้างคำว่า "ไฟล์" (Files)**:

#### 1) ไฟล์สคริปต์ (.gs) — เลือกสร้างเป็น "สคริปต์" (Script):
1. **`Config.gs`** : คัดลอกโค้ดจาก `src/Config.gs`  
   *(สำคัญ: ในบรรทัดที่ระบุ `DEFAULT_SPREADSHEET_ID` ให้เปลี่ยนเป็น Spreadsheet ID ของคุณที่คัดลอกมาจากขั้นตอน 3.1)*
2. **`Utils.gs`** : คัดลอกโค้ดจาก `src/Utils.gs`
3. **`Db.gs`** : คัดลอกโค้ดจาก `src/Db.gs`
4. **`Setup.gs`** : คัดลอกโค้ดจาก `src/Setup.gs`
5. **`Auth.gs`** : คัดลอกโค้ดจาก `src/Auth.gs`
6. **`Workflow.gs`** : คัดลอกโค้ดจาก `src/Workflow.gs`
7. **`Files.gs`** : คัดลอกโค้ดจาก `src/Files.gs`
8. **`Notify.gs`** : คัดลอกโค้ดจาก `src/Notify.gs`
9. **`Reports.gs`** : คัดลอกโค้ดจาก `src/Reports.gs`
10. **`Admin.gs`** : คัดลอกโค้ดจาก `src/Admin.gs`
11. **`Code.gs`** : คัดลอกโค้ดจาก `src/Code.gs`

#### 2) ไฟล์หน้าเว็บ (.html) — เลือกสร้างเป็น "HTML":
12. **`Index.html`** : คัดลอกโค้ดจาก `src/Index.html`

> [!TIP]
> กดปุ่ม **"บันทึกโครงการ" (Save Project)** หรือกด `Ctrl + S` (`Cmd + S` บน Mac) หลังจากวางโค้ดครบทุกไฟล์

---

### ขั้นตอนที่ 3.5: สั่งเริ่มต้นสร้างฐานข้อมูลอัตโนมัติ (Initialize Database)
1. ในแถบเมนูด้านบนของหน้าต่าง Apps Script เลือกฟังก์ชันที่จะรันเป็น: **`ensureSchema_`** หรือ **`doGet`**
2. คลิกปุ่ม **"เรียกใช้" (Run)**
3. Google จะขึ้นหน้าต่างขอสิทธิ์การเข้าถึง **"จำเป็นต้องได้รับอนุญาต" (Authorization Required)**:
   - คลิก **"ตรวจสอบสิทธิ์" (Review Permissions)**
   - เลือกบัญชี Google ของคุณ
   - คลิก **"ขั้นสูง" (Advanced)** (หากมีข้อความแจ้งเตือน Google ยังไม่ได้ยืนยันแอปนี้)
   - คลิก **"ไปที่ eLeavePlus_WebApp (ไม่ปลอดภัย)" / Go to eLeavePlus_WebApp**
   - คลิก **"อนุญาต" (Allow)**
4. เมื่อรันเสร็จ ให้เปิด Google Spreadsheet ที่สร้างไว้ จะพบว่าระบบสร้างชีตทั้ง 9 ตาราง พร้อมหัวตารางสีน้ำเงินเข้มและข้อมูลเริ่มต้นให้ครบถ้วนทันที!

---

### ขั้นตอนที่ 3.6: เผยแพร่เป็น Web App (Deploy)
1. คลิกปุ่มสีน้ำเงิน **"ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New Deployment)**
2. คลิกไอคอนรูปเฟืองข้าง "เลือกประเภท" เลือก **"เว็บแอป" (Web app)**
3. ตั้งค่าดังนี้:
   * **คำอธิบาย (Description):** `eLeave+ Production v1.0`
   * **ดำเนินการในฐานะ (Execute as):** **`ฉัน` (Me / your-email@gmail.com)** *(สำคัญมาก! เพื่อให้ระบบมีสิทธิ์เขียนชีต)*
   * **ผู้มีสิทธิ์เข้าถึง (Who has access):** **`ทุกคน` (Anyone)** *(สำคัญ! เพื่อให้พนักงานเปิดเข้าลิงก์หน้าเว็บได้ทันที)*
4. คลิกปุ่ม **"ทำให้ใช้งานได้" (Deploy)**
5. คัดลอก **URL เว็บแอป (Web App URL)** ที่ลงท้ายด้วย `/exec` เช่น:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   *นำลิงก์นี้ไปส่งให้พนักงานเข้าใช้งานได้ทันที!*

---

## 4. วิธีที่ 2: การติดตั้งผ่าน Clasp CLI (สำหรับนักพัฒนา)

หากคุณใช้ Node.js และ Google Clasp ในการพัฒนา:

```bash
# 1. ติดตั้ง clasp ทั่วระบบ
npm install -g @google/clasp

# 2. เข้าสู่ระบบ Google
clasp login

# 3. Clone หรือสร้างโปรเจกต์ใหม่
cd eLeavePlus
clasp create --title "eLeavePlus" --type webapp --rootDir src

# 4. Push โค้ดทั้งหมดขึ้น Google Apps Script
clasp push -f

# 5. สั่ง Deploy เป็นเวอร์ชันใหม่
clasp deploy --description "Production Release"

# 6. เปิดดูหน้าเว็บ
clasp open --webapp
```

---

## 5. การเข้าสู่ระบบครั้งแรก (First Login)

เมื่อเปิด Web App URL ระบบจะแสดงหน้าจอเข้าสู่ระบบที่ปลอดภัย (ไม่มีบัญชีตัวอย่างค้างอยู่)

### ข้อมูลผู้ดูแลระบบเริ่มต้น (Default Super Admin):
* **Username หรือ Email:** `admin` หรือ `c.thakot@gmail.com`
* **Password:** `12345` หรือ `Admin@1234`
* **Role:** `ADMIN` (ผู้ดูแลระบบสูงสุด)

> [!IMPORTANT]
> หลังจากเข้าสู่ระบบครั้งแรก แนะนำให้ไปที่เมนู **"การตั้งค่าระบบ" > "จัดการพนักงาน"** แล้วแก้ไขรหัสผ่านและข้อมูลส่วนตัวของผู้ดูแลระบบเพื่อความปลอดภัยสูงสุด

---

## 6. การตั้งค่าระบบหลังติดตั้ง (Post-Installation Configuration)

เมื่อเข้าสู่ระบบด้วยบัญชี Admin ให้ไปที่เมนู **"การตั้งค่าระบบ"** ที่แถบเมนูด้านซ้าย:

### 1) จัดการพนักงาน (Users Management)
* สามารถกดปุ่ม **"+ เพิ่มพนักงานใหม่"** เพื่อสร้างบัญชีพนักงานตามแผนกและบทบาท:
  * **EMPLOYEE**: พนักงานทั่วไป (ยื่นลา, ดูประวัติ, ดูวันลาคงเหลือ, ดูปฏิทิน)
  * **APPROVER**: หัวหน้างาน (พิจารณาอนุมัติคำขอในระดับแผนก)
  * **HR**: เจ้าหน้าที่ฝ่ายบุคคล (ตรวจสอบคำขอทุกแผนก, อนุมัติขั้นสุดท้าย, ดูรายงานองค์กร)
  * **ADMIN**: ผู้ดูแลระบบสูงสุด (จัดการตั้งค่าระบบและผู้ใช้งานได้ทั้งหมด)
* มี **Toggle Switch** ให้คลิกเปิด/ระงับบัญชีพนักงานได้ทันทีในตาราง
* มีปุ่ม **"🔑 รีเซ็ตรหัส"** สำหรับรีเซ็ตรหัสผ่านให้พนักงานที่ลืมรหัสผ่าน

### 2) จัดการแผนก (Departments)
* ปรับแต่งรายชื่อแผนก/ฝ่ายงานขององค์กร เปิดหรือปิดการใช้งานแผนกได้ด้วย Toggle Switch

### 3) ประเภทการลา (Leave Types)
* กำหนดโควตาวันลาต่อปีของแต่ละประเภทลา
* กำหนดเงื่อนไขการบังคับแนบเอกสาร (เช่น 3 วันขึ้นไป)
* กำหนดการอนุญาตยื่นลาย้อนหลังด้วย Toggle Switch
* กำหนดสีประจำประเภทการลาสำหรับแสดงบนปฏิทิน

### 4) กำหนดสายการอนุมัติ (Approval Steps)
* กำหนดขั้นตอนการอนุมัติ เช่น:
  * **ขั้นตอนที่ 1:** หัวหน้างาน (`APPROVER`) - ขอบเขต: แผนกเดียวกัน (`SAME`)
  * **ขั้นตอนที่ 2:** ฝ่ายบุคคล (`HR`) - ขอบเขต: ทุกแผนก (`*`)
* เพิ่มหรือลดจำนวนขั้นตอนการอนุมัติได้อิสระ

### 5) ปฏิทินวันหยุด (Holidays)
* มีวันหยุดนักขัตฤกษ์ของไทยเริ่มต้นให้ครบทั้งปี สามารถเพิ่มหรือแก้ไขวันหยุดพิเศษของบริษัทได้

### 6) ตั้งค่าระบบส่วนกลาง (System Configuration)
* **ชื่อบริษัท / องค์กร**
* **เดือนเริ่มต้นปีงบประมาณ** (1 = มกราคม, 10 = ตุลาคม)
* **Toggle สวิตช์:** ไม่นับเสาร์-อาทิตย์และวันหยุดนักขัตฤกษ์เป็นวันลา
* **Toggle สวิตช์:** ส่งอีเมลแจ้งเตือน (Email Notification) ผ่าน Gmail อัตโนมัติ
* **Toggle สวิตช์:** อนุญาตให้ผู้ดูแลระบบอนุมัติใบลาของตนเองได้
* **Telegram Bot Notification:** ระบุ Bot Token และ Chat ID เพื่อรับการแจ้งเตือนคำขอลาใหม่แบบ Real-time เข้ากลุ่มไลน์/เทเลแกรม

---

## 7. การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)

### Q: เข้าลิงก์ Web App แล้วหน้าจอขาว หรือขึ้นว่า "Script function not found: doGet"
* **สาเหตุ:** ยังไม่ได้ Deploy ไฟล์ `Code.gs` หรือตั้งค่าชื่อไฟล์ผิด
* **วิธีแก้:** ตรวจสอบว่าใน Apps Script มีไฟล์ `Code.gs` ที่มีฟังก์ชัน `doGet(e)` อยู่ และกด Deploy เวอร์ชันใหม่อีกครั้ง

### Q: พนักงานกดเข้าสู่ระบบแล้วขึ้น "บัญชีนี้ถูกปิดการใช้งาน"
* **สาเหตุ:** สถานะของบัญชีในตารางพนักงานถูกปิดอยู่
* **วิธีแก้:** ให้ Admin ไปที่เมนู "จัดการพนักงาน" แล้วคลิก Toggle Switch เปิดใช้งานบัญชี (สีเขียว)

### Q: พนักงานแนบไฟล์แล้วขึ้นข้อผิดพลาด
* **สาเหตุ:** โฟลเดอร์ใน Google Drive เต็ม หรือยังไม่ได้ให้สิทธิ์เข้าถึง Google Drive
* **วิธีแก้:** ตรวจสอบพื้นที่ว่างใน Google Drive ของบัญชีที่ใช้ Deploy ระบบ

---
**eLeave+** © 2026 Developed with Google Apps Script, Tailwind CSS & Google Workspace.
