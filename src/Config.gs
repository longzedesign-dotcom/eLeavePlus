/**
 * eLeave+ : ระบบลาออนไลน์ (Google Apps Script)
 * File: Config.gs
 * Purpose: Constants, schema contract, default settings.
 */
const APP = Object.freeze({
  NAME: 'eLeave+',
  NAME_TH: 'ระบบลาออนไลน์',
  VERSION: '1.0.0',
  // Fallback spreadsheet id. Can be overridden by Script Property SPREADSHEET_ID.
  DEFAULT_SPREADSHEET_ID: '1KggnNTB-eNaUN-YIBjEwbsYviIo_EcyIRGoM1VzqmaA'
});

const SHEET = Object.freeze({
  USERS: 'USERS',
  SESSIONS: 'SESSIONS',
  DEPARTMENTS: 'DEPARTMENTS',
  LEAVE_TYPES: 'LEAVE_TYPES',
  LEAVE_REQUESTS: 'LEAVE_REQUESTS',
  LEAVE_LOGS: 'LEAVE_LOGS',
  APPROVAL_STEPS: 'APPROVAL_STEPS',
  HOLIDAYS: 'HOLIDAYS',
  CONFIG: 'CONFIG'
});

/** Column contract for every sheet (order = column order). */
const SCHEMA = Object.freeze({
  USERS: ['userId', 'username', 'email', 'passwordHash', 'salt', 'name', 'role', 'departmentId', 'position', 'phone', 'telegramId', 'hireDate', 'active', 'mustChangePassword', 'createdAt', 'updatedAt', 'lastLoginAt'],
  SESSIONS: ['tokenHash', 'userId', 'expiresAt', 'createdAt'],
  DEPARTMENTS: ['departmentId', 'name', 'active'],
  LEAVE_TYPES: ['leaveTypeId', 'name', 'description', 'quotaDays', 'attachmentRequiredDays', 'allowBackdate', 'color', 'sortOrder', 'active'],
  LEAVE_REQUESTS: ['requestId', 'requestNo', 'userId', 'departmentId', 'leaveTypeId', 'startDate', 'startPeriod', 'endDate', 'endPeriod', 'days', 'reason', 'contact', 'attachmentsJson', 'status', 'currentStep', 'fiscalYear', 'decisionNote', 'createdAt', 'updatedAt'],
  LEAVE_LOGS: ['logId', 'timestamp', 'requestId', 'actorUserId', 'action', 'fromStatus', 'toStatus', 'step', 'note'],
  APPROVAL_STEPS: ['step', 'role', 'departmentId', 'label'],
  HOLIDAYS: ['date', 'name'],
  CONFIG: ['key', 'value', 'description']
});

/** Columns holding numbers (everything else is treated as text). */
const NUMERIC_COLS = Object.freeze({
  LEAVE_TYPES: ['quotaDays', 'attachmentRequiredDays', 'sortOrder'],
  LEAVE_REQUESTS: ['startPeriod', 'endPeriod', 'days', 'currentStep', 'fiscalYear'],
  APPROVAL_STEPS: ['step']
});

const BOOLEAN_COLS = Object.freeze({
  USERS: ['active', 'mustChangePassword'],
  DEPARTMENTS: ['active'],
  LEAVE_TYPES: ['allowBackdate', 'active']
});

const ROLE = Object.freeze({ EMPLOYEE: 'EMPLOYEE', APPROVER: 'APPROVER', HR: 'HR', ADMIN: 'ADMIN' });
const ROLE_LABEL = Object.freeze({ EMPLOYEE: 'พนักงาน', APPROVER: 'ผู้อนุมัติ (หัวหน้า)', HR: 'ฝ่ายบุคคล (HR)', ADMIN: 'ผู้ดูแลระบบ' });

const STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED'
});
const STATUS_LABEL = Object.freeze({
  PENDING: 'รอการอนุมัติ',
  APPROVED: 'อนุมัติ',
  REJECTED: 'ปฏิเสธ',
  CANCELLED: 'ยกเลิก',
  RETURNED: 'ส่งกลับเพื่อแก้ไข'
});

/** 0 = เต็มวัน, 1 = ครึ่งวันเช้า, 2 = ครึ่งวันบ่าย */
const PERIOD = Object.freeze({ FULL: 0, AM: 1, PM: 2 });
const PERIOD_LABEL = Object.freeze({ 0: 'เต็มวัน', 1: 'ครึ่งวันเช้า', 2: 'ครึ่งวันบ่าย' });

/** Default settings written to CONFIG on first run. */
const DEFAULT_CONFIG = Object.freeze([
  ['COMPANY_NAME', 'บริษัท ตัวอย่าง จำกัด', 'ชื่อบริษัท/องค์กร'],
  ['FISCAL_YEAR_START_MONTH', '1', 'เดือนเริ่มต้นปีงบประมาณ/ปีสิทธิ์วันลา (1 = มกราคม, 10 = ตุลาคม)'],
  ['EXCLUDE_WEEKENDS_HOLIDAYS', 'TRUE', 'ไม่นับเสาร์-อาทิตย์และวันหยุดนักขัตฤกษ์เป็นวันลา (TRUE/FALSE)'],
  ['WEEKEND_DAYS', '0,6', 'วันหยุดประจำสัปดาห์ (0=อาทิตย์ ... 6=เสาร์)'],
  ['ALLOW_BACKDATE_DAYS', '0', 'จำนวนวันที่อนุญาตให้ยื่นลาย้อนหลัง (ประเภทลาที่อนุญาตย้อนหลังไม่จำกัด)'],
  ['ALLOW_ADMIN_SELF_APPROVAL', 'TRUE', 'อนุญาตให้ผู้ดูแลระบบอนุมัติใบลาของตนเอง'],
  ['NOTIFY_EMAIL', 'TRUE', 'ส่งอีเมลแจ้งเตือน (TRUE/FALSE)'],
  ['TELEGRAM_BOT_TOKEN', '', 'Telegram Bot Token (เว้นว่างหากไม่ใช้)'],
  ['TELEGRAM_CHAT_ID', '', 'Telegram Chat ID สำหรับแจ้งเตือนส่วนกลาง'],
  ['ATTACH_MAX_MB', '5', 'ขนาดไฟล์แนบสูงสุด (MB)'],
  ['ATTACH_FILE_TYPES', 'jpg,jpeg,png,pdf', 'ประเภทไฟล์แนบที่อนุญาต'],
  ['ATTACH_FOLDER_ID', '', 'โฟลเดอร์ Google Drive เก็บไฟล์แนบ (สร้างอัตโนมัติ)'],
  ['SESSION_HOURS', '12', 'อายุ Session (ชั่วโมง)'],
  ['CALENDAR_SCOPE', 'ALL', 'ขอบเขตปฏิทินการลา: ALL = ทั้งบริษัท, DEPARTMENT = เฉพาะแผนกตนเอง']
]);

const DEFAULT_DEPARTMENTS = Object.freeze([
  ['DEP001', 'ฝ่ายบริหาร'],
  ['DEP002', 'ฝ่ายบุคคล'],
  ['DEP003', 'ฝ่ายบัญชีและการเงิน'],
  ['DEP004', 'ฝ่ายขายและการตลาด'],
  ['DEP005', 'ฝ่ายเทคโนโลยีสารสนเทศ']
]);

/** [id, name, description, quotaDays(0=ไม่จำกัด), attachReqDays(0=ไม่บังคับ), allowBackdate, color, sort] */
const DEFAULT_LEAVE_TYPES = Object.freeze([
  ['LT001', 'ลาป่วย', 'แจ้งผู้บังคับบัญชาโดยเร็ว หากลาตั้งแต่ 3 วันขึ้นไปต้องแนบใบรับรองแพทย์ สามารถยื่นลาย้อนหลังได้', 30, 3, true, '#ef4444', 1],
  ['LT002', 'ลากิจส่วนตัว', 'ต้องยื่นขออนุญาตล่วงหน้า และหยุดได้เมื่อผู้บังคับบัญชาอนุมัติแล้วเท่านั้น', 10, 0, false, '#f59e0b', 2],
  ['LT003', 'ลาพักผ่อนประจำปี', 'ต้องยื่นขออนุญาตล่วงหน้า และหยุดได้เมื่อผู้บังคับบัญชาอนุมัติแล้วเท่านั้น', 10, 0, false, '#10b981', 3],
  ['LT004', 'ลาคลอดบุตร', 'ลาคลอดตามสิทธิ์กฎหมายแรงงาน (ไม่จำกัดโควตาในระบบ) แนบเอกสารประกอบ', 0, 1, false, '#ec4899', 4],
  ['LT005', 'ลาไปช่วยเหลือภริยาที่คลอดบุตร', 'ลาได้ตามนโยบายบริษัท ต้องยื่นล่วงหน้า', 15, 0, false, '#6366f1', 5],
  ['LT006', 'ลาเข้ารับการตรวจเลือกทหาร / เตรียมพล', 'แนบหมายเรียกหรือเอกสารจากทางราชการ', 10, 1, false, '#14b8a6', 6],
  ['LT007', 'ลาไปศึกษา ฝึกอบรม ดูงาน', 'ต้องได้รับอนุมัติล่วงหน้าและแนบเอกสารโครงการ', 5, 0, false, '#3b82f6', 7]
]);

/**
 * [step, role, departmentScope, label]
 * departmentScope: 'SAME' = ผู้อนุมัติต้องอยู่แผนกเดียวกับผู้ลา, '*' = ทุกแผนก, หรือรหัสแผนกที่ระบุ
 */
const DEFAULT_APPROVAL_STEPS = Object.freeze([
  [1, 'APPROVER', 'SAME', 'หัวหน้าแผนก'],
  [2, 'HR', '*', 'ฝ่ายบุคคล']
]);
