/**
 * eLeave+ : File: Admin.gs
 * Purpose: Administrative operations (User management, Leave Types, Steps, Holidays, Settings).
 */
const Admin = (() => {

  function assertAdmin_(user) {
    if (!Auth.isAdmin(user) && user.role !== ROLE.HR) {
      throwApp_('FORBIDDEN', 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบหรือฝ่ายบุคคล');
    }
  }

  /* ====================== Users ====================== */
  function listUsers(user) {
    assertAdmin_(user);
    const depts = {};
    Db.readAll(SHEET.DEPARTMENTS).forEach(function(d) { depts[d.departmentId] = d.name; });
    return Db.readAll(SHEET.USERS).map(function(u) {
      return {
        userId: u.userId,
        username: u.username,
        email: u.email,
        name: u.name,
        role: u.role,
        roleLabel: ROLE_LABEL[u.role] || u.role,
        departmentId: u.departmentId,
        departmentName: depts[u.departmentId] || '-',
        position: u.position,
        phone: u.phone,
        telegramId: u.telegramId,
        hireDate: u.hireDate,
        active: u.active,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt
      };
    });
  }

  function saveUser(user, payload) {
    assertAdmin_(user);
    const userId = str_(payload.userId);
    const username = requireStr_(payload.username, 'ชื่อผู้ใช้', 50).toLowerCase();
    const email = requireStr_(payload.email, 'อีเมล', 100).toLowerCase();
    const name = requireStr_(payload.name, 'ชื่อ-นามสกุล', 150);
    const role = requireStr_(payload.role, 'สิทธิ์การใช้งาน');
    const departmentId = str_(payload.departmentId);
    const position = str_(payload.position);
    const phone = str_(payload.phone);
    const telegramId = str_(payload.telegramId);
    const hireDate = toIsoDate_(payload.hireDate);
    const active = payload.active === undefined ? true : bool_(payload.active);

    if (!isEmail_(email)) throwApp_('VALIDATION', 'รูปแบบอีเมลไม่ถูกต้อง');
    if (!ROLE[role]) throwApp_('VALIDATION', 'สิทธิ์การใช้งานไม่ถูกต้อง');

    return Db.withLock(function() {
      // Check duplicate username or email
      const clash = Db.readAll(SHEET.USERS).filter(function(u) {
        if (userId && u.userId === userId) return false;
        return u.username === username || (u.email && u.email === email);
      })[0];
      if (clash) throwApp_('VALIDATION', 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว');

      if (userId) {
        const existing = Db.findOne(SHEET.USERS, 'userId', userId);
        if (!existing) throwApp_('NOT_FOUND', 'ไม่พบผู้ใช้');
        const patch = {
          username: username,
          email: email,
          name: name,
          role: role,
          departmentId: departmentId,
          position: position,
          phone: phone,
          telegramId: telegramId,
          hireDate: hireDate,
          active: active,
          updatedAt: nowIso_()
        };
        Db.update(SHEET.USERS, 'userId', userId, patch);
        log_('', user.userId, 'USER_UPDATE', '', '', 0, 'แก้ไขผู้ใช้: ' + username);
        return { userId: userId, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' };
      } else {
        const password = String(payload.password || 'User@1234');
        Auth.validatePassword(password);
        const salt = randomSalt_();
        const row = {
          userId: makeId_('U'),
          username: username,
          email: email,
          passwordHash: hashPassword_(password, salt),
          salt: salt,
          name: name,
          role: role,
          departmentId: departmentId,
          position: position,
          phone: phone,
          telegramId: telegramId,
          hireDate: hireDate,
          active: active,
          mustChangePassword: true,
          createdAt: nowIso_(),
          updatedAt: nowIso_(),
          lastLoginAt: ''
        };
        Db.append(SHEET.USERS, row);
        log_('', user.userId, 'USER_CREATE', '', '', 0, 'เพิ่มผู้ใช้: ' + username);
        return { userId: row.userId, message: 'สร้างผู้ใช้ใหม่เรียบร้อยแล้ว' };
      }
    });
  }

  function resetPassword(user, payload) {
    assertAdmin_(user);
    const userId = requireStr_(payload.userId, 'รหัสผู้ใช้');
    const newPassword = requireStr_(payload.newPassword, 'รหัสผ่านใหม่');
    Auth.validatePassword(newPassword);
    Auth.setPassword(userId, newPassword, true);
    log_('', user.userId, 'PASSWORD_RESET', '', '', 0, 'รีเซ็ตรหัสผ่านสำหรับ userId: ' + userId);
    return { success: true, message: 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว (ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าใช้งานครั้งถัดไป)' };
  }

  /* ====================== Departments ====================== */
  function listDepartments(user) {
    return Db.readAll(SHEET.DEPARTMENTS);
  }

  function saveDepartment(user, payload) {
    assertAdmin_(user);
    const id = str_(payload.departmentId);
    const name = requireStr_(payload.name, 'ชื่อแผนก/ฝ่าย', 100);
    const active = payload.active === undefined ? true : bool_(payload.active);

    return Db.withLock(function() {
      if (id) {
        Db.update(SHEET.DEPARTMENTS, 'departmentId', id, { name: name, active: active });
        return { departmentId: id, message: 'แก้ไขแผนกเรียบร้อยแล้ว' };
      } else {
        const newId = makeId_('DEP');
        Db.append(SHEET.DEPARTMENTS, { departmentId: newId, name: name, active: active });
        return { departmentId: newId, message: 'เพิ่มแผนกเรียบร้อยแล้ว' };
      }
    });
  }

  /* ====================== Leave Types ====================== */
  function listLeaveTypes(user) {
    return Db.readAll(SHEET.LEAVE_TYPES).sort(function(a, b) { return a.sortOrder - b.sortOrder; });
  }

  function saveLeaveType(user, payload) {
    assertAdmin_(user);
    const id = str_(payload.leaveTypeId);
    const name = requireStr_(payload.name, 'ชื่อประเภทการลา', 100);
    const desc = str_(payload.description);
    const quotaDays = Math.max(0, num_(payload.quotaDays, 0));
    const attachReqDays = Math.max(0, num_(payload.attachmentRequiredDays, 0));
    const allowBackdate = bool_(payload.allowBackdate);
    const color = str_(payload.color) || '#3b82f6';
    const sortOrder = Math.max(1, num_(payload.sortOrder, 1));
    const active = payload.active === undefined ? true : bool_(payload.active);

    return Db.withLock(function() {
      if (id) {
        Db.update(SHEET.LEAVE_TYPES, 'leaveTypeId', id, {
          name: name,
          description: desc,
          quotaDays: quotaDays,
          attachmentRequiredDays: attachReqDays,
          allowBackdate: allowBackdate,
          color: color,
          sortOrder: sortOrder,
          active: active
        });
        return { leaveTypeId: id, message: 'แก้ไขประเภทการลาเรียบร้อยแล้ว' };
      } else {
        const newId = makeId_('LT');
        Db.append(SHEET.LEAVE_TYPES, {
          leaveTypeId: newId,
          name: name,
          description: desc,
          quotaDays: quotaDays,
          attachmentRequiredDays: attachReqDays,
          allowBackdate: allowBackdate,
          color: color,
          sortOrder: sortOrder,
          active: active
        });
        return { leaveTypeId: newId, message: 'เพิ่มประเภทการลาเรียบร้อยแล้ว' };
      }
    });
  }

  /* ====================== Approval Steps ====================== */
  function listApprovalSteps(user) {
    return Workflow.steps();
  }

  function saveApprovalSteps(user, stepsList) {
    assertAdmin_(user);
    if (!Array.isArray(stepsList)) throwApp_('VALIDATION', 'รูปแบบข้อมูลไม่ถูกต้อง');

    return Db.withLock(function() {
      Db.sheet(SHEET.APPROVAL_STEPS).clearContents();
      Db.sheet(SHEET.APPROVAL_STEPS).getRange(1, 1, 1, SCHEMA.APPROVAL_STEPS.length).setValues([SCHEMA.APPROVAL_STEPS]);

      const rows = stepsList.map(function(s, idx) {
        return {
          step: idx + 1,
          role: s.role || ROLE.APPROVER,
          departmentId: s.departmentId || '',
          label: s.label || ('ขั้นที่ ' + (idx + 1))
        };
      });
      if (rows.length) {
        Db.appendMany(SHEET.APPROVAL_STEPS, rows);
      }
      log_('', user.userId, 'STEPS_UPDATE', '', '', 0, 'ปรับเปลี่ยนลำดับการอนุมัติ (' + rows.length + ' ขั้นตอน)');
      return { success: true, count: rows.length, message: 'บันทึกลำดับการอนุมัติเรียบร้อยแล้ว' };
    });
  }

  /* ====================== Holidays ====================== */
  function listHolidays(user) {
    return Db.readAll(SHEET.HOLIDAYS).sort(function(a, b) { return a.date < b.date ? -1 : 1; });
  }

  function saveHoliday(user, payload) {
    assertAdmin_(user);
    const date = toIsoDate_(payload.date);
    const name = requireStr_(payload.name, 'ชื่อวันหยุด', 100);
    if (!date) throwApp_('VALIDATION', 'กรุณาระบุวันที่');

    return Db.withLock(function() {
      const existing = Db.findOne(SHEET.HOLIDAYS, 'date', date);
      if (existing) {
        Db.update(SHEET.HOLIDAYS, 'date', date, { name: name });
      } else {
        Db.append(SHEET.HOLIDAYS, { date: date, name: name });
      }
      return { date: date, message: 'บันทึกวันหยุดเรียบร้อยแล้ว' };
    });
  }

  function deleteHoliday(user, payload) {
    assertAdmin_(user);
    const date = toIsoDate_(payload.date);
    Db.withLock(function() {
      Db.remove(SHEET.HOLIDAYS, 'date', date);
    });
    return { success: true, message: 'ลบวันหยุดเรียบร้อยแล้ว' };
  }

  /* ====================== Settings ====================== */
  function getSettings(user) {
    assertAdmin_(user);
    return Db.getConfig();
  }

  function saveSettings(user, payload) {
    assertAdmin_(user);
    return Db.withLock(function() {
      Object.keys(payload).forEach(function(k) {
        Db.setConfig(k, String(payload[k]));
      });
      log_('', user.userId, 'CONFIG_UPDATE', '', '', 0, 'อัปเดตการตั้งค่าระบบ');
      return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' };
    });
  }

  function seedDemoUsers(user) {
    assertAdmin_(user);
    const count = seedDemoUsers_();
    return { success: true, count: count, message: 'สร้างผู้ใช้ตัวอย่างสำเร็จ ' + count + ' บัญชี (รหัสผ่านเริ่มต้น Demo@1234)' };
  }

  function getAuditLogs(user, limit) {
    assertAdmin_(user);
    const lim = Math.min(200, Math.max(10, num_(limit, 50)));
    const ctx = Workflow.context();
    return Db.readAll(SHEET.LEAVE_LOGS)
      .sort(function(a, b) { return a.timestamp < b.timestamp ? 1 : -1; })
      .slice(0, lim)
      .map(function(l) {
        const u = ctx.users[l.actorUserId];
        return {
          logId: l.logId,
          timestamp: l.timestamp,
          requestId: l.requestId,
          actorName: u ? u.name : (l.actorUserId || 'System'),
          action: l.action,
          fromStatus: l.fromStatus,
          toStatus: l.toStatus,
          note: l.note
        };
      });
  }

  return Object.freeze({
    listUsers,
    saveUser,
    resetPassword,
    listDepartments,
    saveDepartment,
    listLeaveTypes,
    saveLeaveType,
    listApprovalSteps,
    saveApprovalSteps,
    listHolidays,
    saveHoliday,
    deleteHoliday,
    getSettings,
    saveSettings,
    seedDemoUsers,
    getAuditLogs
  });
})();
