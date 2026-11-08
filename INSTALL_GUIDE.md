# 📘 คู่มือการติดตั้งและตั้งค่าระบบ eLeave+ ฉบับสมบูรณ์ (Installation & Admin Setup Guide)
### ระบบบริหารจัดการการลาออนไลน์ระดับองค์กรบน Google Apps Script 100% Serverless

<div align="center">

[![Platform](https://img.shields.io/badge/Platform-Google%20Apps%20Script%20%7C%20Web%20App-34A853?style=flat-square&logo=google)](https://script.google.com/)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets%20(9%20Sheets)-0F9D58?style=flat-square&logo=googlesheets)](https://www.google.com/sheets/about/)
[![Serverless](https://img.shields.io/badge/Architecture-100%25%20Serverless-orange?style=flat-square)](#)

</div>

---

## 📋 สารบัญ
1. [ภาพรวมของระบบและสถาปัตยกรรม (Architecture)](#1-ภาพรวมของระบบและสถาปัตยกรรม-architecture)
2. [สิ่งที่ต้องเตรียมก่อนเริ่มติดตั้ง (Prerequisites)](#2-สิ่งที่ต้องเตรียมก่อนเริ่มติดตั้ง-prerequisites)
3. [วิธีที่ 1: การติดตั้งผ่าน Google Apps Script Editor (แนะนำ - ทำผ่านเบราว์เซอร์ 100%)](#3-วิธีที่-1-การติดตั้งผ่าน-google-apps-script-editor-แนะนำ---ทำผ่านเบราว์เซอร์-100)
   - [3.1 สร้างฐานข้อมูล Google Spreadsheet](#31-สร้างฐานข้อมูล-google-spreadsheet)
   - [3.2 สร้างโปรเจกต์ Apps Script](#32-สร้างโปรเจกต์-apps-script)
   - [3.3 ตั้งค่า Manifest `appsscript.json`](#33-ตั้งค่า-manifest-appsscriptjson)
   - [3.4 นำเข้าไฟล์โค้ด (Source Code) ทั้งหมด](#34-นำเข้าไฟล์โค้ด-source-code-ทั้งหมด)
   - [3.5 สั่งสร้างฐานข้อมูลและหัวตารางอัตโนมัติ (Initialize Schema)](#35-สั่งสร้างฐานข้อมูลและหัวตารางอัตโนมัติ-initialize-schema)
   - [3.6 เผยแพร่เว็บแอป (Deploy Web App)](#36-เผยแพร่เว็บแอป-deploy-web-app)
4. [วิธีที่ 2: การติดตั้งผ่าน Google Clasp CLI (สำหรับนักพัฒนา)](#4-วิธีที่-2-การติดตั้งผ่าน-google-clasp-cli-สำหรับนักพัฒนา)
5. [การตั้งค่าระบบแจ้งเตือนผ่าน Telegram Bot (แบบละเอียด)](#5-การตั้งค่าระบบแจ้งเตือนผ่าน-telegram-bot-แบบละเอียด)
6. [การตั้งค่ารอบปีงบประมาณและนโยบายวันลา (Fiscal Year & Policy)](#6-การตั้งค่ารอบปีงบประมาณและนโยบายวันลา-fiscal-year--policy)
7. [บัญชีผู้ดูแลระบบเริ่มต้นและการรักษาความปลอดภัย (Security & First Login)](#7-บัญชีผู้ดูแลระบบเริ่มต้นและการรักษาความปลอดภัย-security--first-login)
8. [การสำรองข้อมูลและการกู้คืน (Backup & Maintenance)](#8-การสำรองข้อมูลและการกู้คืน-backup--maintenance)
9. [การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)](#9-การแก้ไขปัญหาที่พบบ่อย-troubleshooting--faq)

---

## 1. ภาพรวมของระบบและสถาปัตยกรรม (Architecture)

**eLeave+** ถูกออกแบบให้ทำงานแบบ **100% Serverless บน Google Workspace Ecosystem**:
- **Frontend Layer:** Single Page Application (SPA) เขียนด้วย HTML5, Tailwind CSS, และ JavaScript ES6+ โหลดเร็ว ไหลลื่น ไม่ต้องรีเฟรชหน้าจอ ทำงานได้สมบูรณ์บนทุกหน้าจอ (Responsive Mobile, Tablet, Desktop)
- **Backend API Layer:** Google Apps Script V8 Runtime ทำหน้าที่ประมวลผลคำขอคำนวณวันลา สิทธิ์การอนุมัติ และบันทึกข้อมูล
- **Database Layer:** Google Spreadsheet ทำหน้าที่เป็น Relational Database 9 ตาราง พร้อมระบบ **`LockService` แบบ Re-entrant** ป้องกันปัญหาข้อมูลชนกัน (Race Condition / Concurrency Collision)
- **Storage Layer:** Google Drive จัดเก็บไฟล์แนบ (PDF, รูปภาพใบรับรองแพทย์) อัตโนมัติในโฟลเดอร์เฉพาะ พร้อมจำกัดสิทธิ์เข้าถึงเฉพาะองค์กร

---

## 2. สิ่งที่ต้องเตรียมก่อนเริ่มติดตั้ง (Prerequisites)

1. **บัญชี Google Account** (สามารถใช้ได้ทั้ง Gmail ส่วนบุคคลฟรี หรือ Google Workspace ขององค์กร)
2. **เว็บเบราว์เซอร์** แนะนำ Google Chrome, Microsoft Edge, หรือ Safari
3. ซอร์สโค้ดของ **eLeave+** จาก GitHub Repository: [https://github.com/longzedesign-dotcom/eLeavePlus](https://github.com/longzedesign-dotcom/eLeavePlus)

---

## 3. วิธีที่ 1: การติดตั้งผ่าน Google Apps Script Editor (แนะนำ - ทำผ่านเบราว์เซอร์ 100%)

วิธีนี้เป็นวิธีที่ง่ายที่สุด ไม่จำเป็นต้องติดตั้งโปรแกรมหรือพิมพ์คำสั่งใดๆ ในคอมพิวเตอร์ ทำงานผ่านหน้าเว็บเบราว์เซอร์ทั้งหมด:

### 3.1 สร้างฐานข้อมูล Google Spreadsheet
1. ไปที่ [Google Sheets](https://sheets.new) เพื่อสร้างสเปรดชีตเปล่าใหม่
2. ตั้งชื่อไฟล์สเปรดชีต เช่น `eLeavePlus_Database`
3. คัดลอก **Spreadsheet ID** จากแถบ URL ของเบราว์เซอร์:
   ```text
   https://docs.google.com/spreadsheets/d/ 【คัดลอกรหัสตรงนี้】 /edit
   ```
   *ตัวอย่าง:* หาก URL คือ `https://docs.google.com/spreadsheets/d/1KggnNTB-eNaUN-YIBjEwbsYviIo_EcyIRGoM1VzqmaA/edit`  
   **Spreadsheet ID** คือ: `1KggnNTB-eNaUN-YIBjEwbsYviIo_EcyIRGoM1VzqmaA`

---

### 3.2 สร้างโปรเจกต์ Apps Script
1. ไปที่ [Google Apps Script Home](https://script.google.com/home/start)
2. คลิกปุ่ม **"โปรเจกต์ใหม่" (New Project)** ที่มุมซ้ายบน
3. ตั้งชื่อโปรเจกต์ที่มุมซ้ายบน เช่น `eLeavePlus_WebApp`

---

### 3.3 ตั้งค่า Manifest `appsscript.json`
1. ที่แถบเมนูด้านซ้ายของ Apps Script ให้คลิกที่ไอคอนรูปเฟือง **"การตั้งค่าโครงการ" (Project Settings)**
2. ทำเครื่องหมายถูกที่ **"แสดงไฟล์ Manifest "appsscript.json" ในตัวแก้ไข" (Show "appsscript.json" manifest file in editor)**
3. คลิกกลับมาที่ไอคอนโค้ด `<>` (ตัวแก้ไข / Editor)
4. คลิกเปิดไฟล์ **`appsscript.json`** แล้วนำโค้ดด้านล่างนี้ไปวางแทนที่ทั้งหมด:

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

### 3.4 นำเข้าไฟล์โค้ด (Source Code) ทั้งหมด
ในโปรเจกต์ Apps Script ให้กดปุ่ม **`+`** ข้างหัวข้อ **"ไฟล์" (Files)** เพื่อสร้างไฟล์ให้ครบตามโครงสร้างในโฟลเดอร์ `src/`:

#### 1) ไฟล์สคริปต์ (.gs) — เลือกประเภทเป็น "สคริปต์" (Script):
1. **`Config.gs`** : คัดลอกโค้ดจาก `src/Config.gs`  
   > ⚠️ **จุดสำคัญ:** ในไฟล์ `Config.gs` บรรทัดที่ระบุ `DEFAULT_SPREADSHEET_ID:` ให้นำ **Spreadsheet ID** ของท่านที่ได้จากข้อ 3.1 มาใส่แทนที่
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

#### 2) ไฟล์หน้าเว็บ (.html) — เลือกประเภทเป็น "HTML":
12. **`Index.html`** : คัดลอกโค้ดจาก `src/Index.html`

> 💾 กดปุ่ม **"บันทึกโครงการ" (Save Project)** หรือกดแป้นลัด `Ctrl + S` (`Cmd + S` บน Mac) หลังจากวางโค้ดครบทุกไฟล์

---

### 3.5 สั่งสร้างฐานข้อมูลและหัวตารางอัตโนมัติ (Initialize Schema)
1. ในแถบเมนูด้านบนของหน้าต่าง Apps Script ให้เลือกฟังก์ชันที่จะรันเป็น: **`ensureSchema_`** หรือ **`doGet`**
2. คลิกปุ่ม **"เรียกใช้" (Run)**
3. Google จะแสดงหน้าต่างขอสิทธิ์การเข้าถึง **"จำเป็นต้องได้รับอนุญาต" (Authorization Required)**:
   - คลิก **"ตรวจสอบสิทธิ์" (Review Permissions)**
   - เลือกบัญชี Google ของท่าน
   - คลิก **"ขั้นสูง" (Advanced)**
   - คลิก **"ไปที่ eLeavePlus_WebApp (ไม่ปลอดภัย)" / Go to eLeavePlus_WebApp**
   - คลิก **"อนุญาต" (Allow)**
4. เมื่อคำสั่งทำงานเสร็จสิ้น ให้เปิด Google Spreadsheet ที่สร้างไว้ จะพบว่าระบบสร้างชีตทั้ง 9 ตาราง (`USERS`, `SESSIONS`, `DEPARTMENTS`, `LEAVE_TYPES`, `LEAVE_REQUESTS`, `LEAVE_LOGS`, `APPROVAL_STEPS`, `HOLIDAYS`, `CONFIG`) พร้อมหัวตารางและข้อมูลเริ่มต้นให้อัตโนมัติทันที

---

### 3.6 เผยแพร่เว็บแอป (Deploy Web App)
1. คลิกปุ่มสีน้ำเงิน **"ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New Deployment)**
2. คลิกไอคอนรูปเฟืองข้าง "เลือกประเภท" แล้วเลือก **"เว็บแอป" (Web app)**
3. ตั้งค่าการเผยแพร่ดังนี้:
   - **คำอธิบาย (Description):** `eLeave+ Production v1.0`
   - **ดำเนินการในฐานะ (Execute as):** **`ฉัน (Me / your-email@gmail.com)`** *(จำเป็นต้องเลือก Me เพื่อให้ระบบมีสิทธิ์ในการอ่าน/เขียน Spreadsheet และบันทึกไฟล์ลง Drive)*
   - **ผู้มีสิทธิ์เข้าถึง (Who has access):** **`ทุกคน (Anyone)`** *(เพื่อให้พนักงานทุกคนสามารถเปิดใช้งานหน้าเว็บผ่านมือถือหรือคอมพิวเตอร์ได้)*
4. คลิกปุ่ม **"ทำให้ใช้งานได้" (Deploy)**
5. คัดลอก **URL เว็บแอป (Web App URL)** ที่ลงท้ายด้วย `/exec` เช่น:
   ```text
   https://script.google.com/macros/s/AKfycbyPNo5qtRla_zb_mDDsqm2GNf683NCHb57VKYzO1PdYolHudwAEJYrXvpa14iFOTuKooQ/exec
   ```
   *นำลิงก์นี้ไปส่งให้พนักงานในองค์กรใช้งานได้ทันที!*

---

## 4. วิธีที่ 2: การติดตั้งผ่าน Google Clasp CLI (สำหรับนักพัฒนา)

หากท่านใช้ Node.js และเครื่องมือ Google Clasp:

```bash
# 1. ติดตั้ง Clasp แบบ Global
npm install -g @google/clasp

# 2. ทำการ Login ด้วยบัญชี Google
clasp login

# 3. Clone Repository
git clone https://github.com/longzedesign-dotcom/eLeavePlus.git
cd eLeavePlus

# 4. ตรวจสอบไฟล์ .clasp.json และปรับ scriptId ให้ตรงกับ Apps Script ของท่าน
# หรือสั่งสร้างโปรเจกต์ใหม่:
# clasp create --title "eLeavePlus" --type webapp --rootDir src

# 5. Push ซอร์สโค้ดทั้งหมดขึ้น Google Apps Script
clasp push --force

# 6. สร้าง Version ใหม่ และ Deploy
clasp version "Production v1.0.0"
clasp deploy --description "eLeavePlus Production Release"

# 7. เปิดหน้า Web App
clasp open --webapp
```

---

## 5. การตั้งค่าระบบแจ้งเตือนผ่าน Telegram Bot (แบบละเอียด)

ระบบ **eLeave+** มีฟังก์ชันแจ้งเตือนผ่าน Telegram Bot เมื่อมีพนักงานยื่นใบลาใหม่ หรือเมื่อคำขอได้รับการอนุมัติ/ส่งกลับ:

### ขั้นตอนการสร้าง Bot และขอ Token:
1. เปิดแอป **Telegram** ค้นหาบอทชื่อ **`@BotFather`**
2. พิมพ์คำสั่ง `/newbot`
3. ตั้งชื่อบอท (Display Name) เช่น `eLeavePlus Notification Bot`
4. ตั้งชื่อผู้ใช้ของบอท (Username ต้องลงท้ายด้วย `bot`) เช่น `eleave_mycompany_bot`
5. เมื่อสร้างเสร็จ @BotFather จะส่ง **HTTP API Token** มาให้ (เช่น `7123456789:AAFn_xyz...`) ให้นำ Token นี้ไปใช้งาน

### ขั้นตอนการหา Chat ID:
- **กรณีแจ้งเตือนกลุ่ม:**
  1. ดึงบอทที่สร้างเข้ากลุ่ม Telegram ของผู้บริหารหรือฝ่ายบุคคล
  2. ตั้งค่าบอทให้เป็น Admin ในกลุ่ม
  3. ส่งข้อความทดสอบลงในกลุ่ม เช่น `Hello Bot`
  4. ใช้เบราว์เซอร์เปิด URL: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
  5. มองหาคำว่า `"chat":{"id": -100xxxxxxxxxx}` ตัวเลขติดลบนี้คือ **Group Chat ID**
- **กรณีแจ้งเตือนบุคคล:** ให้ทักคุยกับบอท `@userinfobot` เพื่อดู Chat ID ของตนเอง

### การบันทึกค่าลงใน eLeave+:
1. เข้าสู่ระบบด้วยบัญชี Admin > เมนู **"การตั้งค่าระบบ" > "ตั้งค่าทั่วไป"**
2. กรอก **Telegram Bot Token**
3. กรอก **Telegram Chat ID**
4. กดบันทึกการตั้งค่า ระบบจะเริ่มส่งการแจ้งเตือนทันทีที่มีความเคลื่อนไหว

---

## 6. การตั้งค่ารอบปีงบประมาณและนโยบายวันลา (Fiscal Year & Policy)

ในเมนู **การตั้งค่าระบบ (System Settings)** ผู้ดูแลระบบสามารถปรับแต่งให้สอดคล้องกับระเบียบองค์กร:

| ค่ากำหนด (Setting Key) | ตัวเลือก / ค่าแนะนำ | คำอธิบาย |
|---|:---:|---|
| **`COMPANY_NAME`** | ข้อความชื่อบริษัท | แสดงที่ส่วนหัวของระบบและในหัวข้ออีเมลแจ้งเตือน |
| **`FISCAL_YEAR_START_MONTH`** | `1` หรือ `10` | **1** = รอบปีปฏิทินทั่วไป (ม.ค. - ธ.ค.)<br>**10** = รอบปีงบประมาณราชการ (ต.ค. - ก.ย.) |
| **`EXCLUDE_WEEKENDS_HOLIDAYS`** | `TRUE` / `FALSE` | **TRUE** = ไม่นับเสาร์-อาทิตย์และวันหยุดนักขัตฤกษ์เป็นวันลา |
| **`WEEKEND_DAYS`** | `0,6` | `0` = อาทิตย์, `6` = เสาร์ (หากทำงานเสาร์เว้นเสาร์สามารถปรับแต่งได้) |
| **`NOTIFY_EMAIL`** | `TRUE` / `FALSE` | ส่งอีเมลแจ้งเตือนผ่านระบบ Gmail อัตโนมัติ |
| **`ATTACH_MAX_MB`** | `5` | ขนาดไฟล์แนบสูงสุดต่อไฟล์ (MB) |

---

## 7. บัญชีผู้ดูแลระบบเริ่มต้นและการรักษาความปลอดภัย (Security & First Login)

### ข้อมูลผู้ดูแลระบบเริ่มต้น (Default Super Admin):
- **Username / Email:** `admin` หรือ `c.thakot@gmail.com`
- **Password:** `12345` หรือ `Admin@1234`
- **Role:** `ADMIN` (ผู้ดูแลระบบสูงสุด)

> 🔒 **ข้อแนะนำด้านความปลอดภัย:**  
> หลังจากติดตั้งเสร็จสิ้นและเข้าสู่ระบบครั้งแรก กรุณาไปที่ **การตั้งค่าระบบ > จัดการพนักงาน** แล้วทำการเปลี่ยนรหัสผ่านของบัญชี `admin` และแก้ไขอีเมลให้เป็นอีเมลจริงของผู้ดูแลระบบทันที

---

## 8. การสำรองข้อมูลและการกู้คืน (Backup & Maintenance)

1. **การสำรองข้อมูลอัตโนมัติ (Google Drive Version History):**
   - Google Spreadsheet มีระบบ **Version History** ในตัว สามารถย้อนดูหรือกู้คืนข้อมูลย้อนหลังได้ทุกจุดเวลา
2. **การดาวน์โหลดสำรองข้อมูลประจำเดือน (Manual Backup):**
   - เปิด Google Spreadsheet > เมนู **File** > **Download** > **Microsoft Excel (.xlsx)** เพื่อเก็บไฟล์สำรองไว้ในเครื่อง
3. **การล้างไฟล์ขยะใน Google Drive:**
   - ไฟล์แนบเอกสารจะถูกจัดเก็บในโฟลเดอร์ Google Drive ของผู้ Deploy หากพื้นที่ใกล้เต็ม สามารถจัดเก็บถาวร (Archive) แยกออกไปได้

---

## 9. การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)

### Q1: เข้าเว็บแอปแล้วขึ้นหน้าขาว หรือแจ้งเตือน "Script function not found: doGet"
- **วิธีแก้:** ตรวจสอบใน Apps Script ว่ามีไฟล์ `Code.gs` และมีฟังก์ชัน `doGet(e)` อยู่หรือไม่ จากนั้นให้กด **Deploy > Manage deployments > คลิกรูปดินสอ > เลือก Version เป็น New (ใหม่) > Deploy** อีกครั้ง

### Q2: พนักงานยื่นลาแล้วขึ้นว่า "ไม่มีสิทธิ์เข้าถึง Spreadsheet"
- **วิธีแก้:** ไปที่การตั้งค่า Deploy ตรวจสอบให้แน่ใจว่าได้เลือก **Execute as: "Me"** (ดำเนินการในฐานะ: ฉัน) ไม่ใช่ User accessing the web app

### Q3: พนักงานแนบไฟล์ใบรับรองแพทย์ไม่ได้ ขึ้น Error Upload
- **วิธีแก้:** ตรวจสอบขนาดไฟล์ต้องไม่เกิน 5 MB และนามสกุลต้องเป็น PDF, JPG, หรือ PNG รวมทั้งตรวจสอบพื้นที่จัดเก็บใน Google Drive ของบัญชีผู้ Deploy ว่าเต็มหรือไม่

---
**eLeave+** © 2026 ระบบบริหารจัดการการลาออนไลน์ระดับองค์กร  
Repository: [https://github.com/longzedesign-dotcom/eLeavePlus](https://github.com/longzedesign-dotcom/eLeavePlus)
