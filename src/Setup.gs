/**
 * eLeave+ : File: Setup.gs
 * Purpose: Create database structure & seed defaults (idempotent), demo data.
 */
const SCHEMA_VERSION = '1.0.0';

/** Called from doGet / login. Cheap after first run (guarded by a script property). */
function ensureSchema_(force) {
  const props = PropertiesService.getScriptProperties();
  if (!force && props.getProperty('SCHEMA_VERSION') === SCHEMA_VERSION) return false;
  Db.withLock(function () {
    const ss = Db.ss();
    Object.keys(SCHEMA).forEach(function (name) {
      let sh = ss.getSheetByName(name);
      if (!sh) sh = ss.insertSheet(name);
      const cols = SCHEMA[name];
      const existing = sh.getLastColumn() > 0 ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(str_) : [];
      // add any missing columns at the end, never reorder user data
      const missing = cols.filter(function (c) { return existing.indexOf(c) < 0; });
      if (existing.filter(Boolean).length === 0) {
        sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      } else if (missing.length) {
        sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
      }
      const total = Math.max(sh.getLastColumn(), cols.length);
      const head = sh.getRange(1, 1, 1, total);
      head.setFontWeight('bold');
      head.setBackground('#1e3a8a');
      head.setFontColor('#ffffff');
      sh.setFrozenRows(1);
      // keep ids, dates and phones as plain text so Sheets never re-formats them
      const all = sh.getRange(1, 1, 1, total).getValues()[0].map(str_);
      const numeric = NUMERIC_COLS[name] || [], bools = BOOLEAN_COLS[name] || [];
      all.forEach(function (c, i) {
        if (!c) return;
        if (numeric.indexOf(c) >= 0 || bools.indexOf(c) >= 0) return;
        sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
      });
    });
    // remove the default empty sheet created by Google
    ['Sheet1', 'ชีต1'].forEach(function (n) {
      const d = ss.getSheetByName(n);
      if (d && ss.getSheets().length > 1 && d.getLastRow() <= 1 && d.getLastColumn() <= 1) {
        try { ss.deleteSheet(d); } catch (e) { /* ignore */ }
      }
    });
    Db.reset();
    seedDefaults_();
  });
  props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
  return true;
}

function seedDefaults_() {
  if (Db.readAll(SHEET.CONFIG).length === 0) {
    Db.appendMany(SHEET.CONFIG, DEFAULT_CONFIG.map(function (d) { return { key: d[0], value: d[1], description: d[2] }; }));
  }
  if (Db.readAll(SHEET.DEPARTMENTS).length === 0) {
    Db.appendMany(SHEET.DEPARTMENTS, DEFAULT_DEPARTMENTS.map(function (d) { return { departmentId: d[0], name: d[1], active: true }; }));
  }
  if (Db.readAll(SHEET.LEAVE_TYPES).length === 0) {
    Db.appendMany(SHEET.LEAVE_TYPES, DEFAULT_LEAVE_TYPES.map(function (t) {
      return { leaveTypeId: t[0], name: t[1], description: t[2], quotaDays: t[3], attachmentRequiredDays: t[4], allowBackdate: t[5], color: t[6], sortOrder: t[7], active: true };
    }));
  }
  if (Db.readAll(SHEET.APPROVAL_STEPS).length === 0) {
    Db.appendMany(SHEET.APPROVAL_STEPS, DEFAULT_APPROVAL_STEPS.map(function (s) { return { step: s[0], role: s[1], departmentId: s[2], label: s[3] }; }));
  }
  if (Db.readAll(SHEET.HOLIDAYS).length === 0) {
    const sample = [['2026-01-01', 'วันขึ้นปีใหม่'], ['2026-04-06', 'วันจักรี'], ['2026-04-13', 'วันสงกรานต์'], ['2026-04-14', 'วันสงกรานต์'], ['2026-04-15', 'วันสงกรานต์'],
      ['2026-05-01', 'วันแรงงานแห่งชาติ'], ['2026-05-04', 'วันฉัตรมงคล'], ['2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'], ['2026-07-28', 'วันเฉลิมพระชนมพรรษา ร.10'],
      ['2026-08-12', 'วันแม่แห่งชาติ'], ['2026-10-13', 'วันนวมินทรมหาราช'], ['2026-10-23', 'วันปิยมหาราช'], ['2026-12-05', 'วันพ่อแห่งชาติ'], ['2026-12-10', 'วันรัฐธรรมนูญ'], ['2026-12-31', 'วันสิ้นปี']];
    Db.appendMany(SHEET.HOLIDAYS, sample.map(function (h) { return { date: h[0], name: h[1] }; }));
  }
  if (Db.readAll(SHEET.USERS).length === 0) {
    createUserRecord_({
      username: 'admin', email: 'c.thakot@gmail.com', password: 'Admin@1234', name: 'ผู้ดูแลระบบ',
      role: ROLE.ADMIN, departmentId: 'DEP001', position: 'System Administrator', mustChangePassword: false
    });
  }
}

/** Insert a user (password is hashed here). Returns the stored row. */
function createUserRecord_(u) {
  const salt = randomSalt_();
  const now = nowIso_();
  const row = {
    userId: makeId_('U'),
    username: str_(u.username).toLowerCase(),
    email: str_(u.email).toLowerCase(),
    passwordHash: hashPassword_(u.password, salt),
    salt: salt,
    name: str_(u.name),
    role: u.role || ROLE.EMPLOYEE,
    departmentId: str_(u.departmentId),
    position: str_(u.position),
    phone: str_(u.phone),
    telegramId: str_(u.telegramId),
    hireDate: toIsoDate_(u.hireDate),
    active: u.active === undefined ? true : !!u.active,
    mustChangePassword: !!u.mustChangePassword,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: ''
  };
  Db.append(SHEET.USERS, row);
  return row;
}

/** Admin tool: create demo staff for trying the workflow (password Demo@1234). */
function seedDemoUsers_() {
  const demo = [
    ['hr.somying', 'somying.hr@example.com', 'สมหญิง ใจดี', ROLE.HR, 'DEP002', 'เจ้าหน้าที่ฝ่ายบุคคล'],
    ['boss.it', 'boss.it@example.com', 'ธนากร เทคโนโลยี', ROLE.APPROVER, 'DEP005', 'หัวหน้าฝ่าย IT'],
    ['emp.it', 'emp.it@example.com', 'วิชัย โปรแกรมเมอร์', ROLE.EMPLOYEE, 'DEP005', 'Developer'],
    ['boss.sales', 'boss.sales@example.com', 'สุรีย์ การตลาด', ROLE.APPROVER, 'DEP004', 'หัวหน้าฝ่ายขาย'],
    ['emp.sales', 'emp.sales@example.com', 'นภา ขายเก่ง', ROLE.EMPLOYEE, 'DEP004', 'Sales Executive']
  ];
  let created = 0;
  demo.forEach(function (d) {
    if (Db.findOne(SHEET.USERS, 'username', d[0])) return;
    createUserRecord_({ username: d[0], email: d[1], password: 'Demo@1234', name: d[2], role: d[3], departmentId: d[4], position: d[5], hireDate: '2024-01-15' });
    created++;
  });
  return created;
}

/** Manual entry points (Run from the Apps Script editor if desired). */
function setupDatabase() { ensureSchema_(true); return 'OK: ' + Db.spreadsheetId(); }
