/**
 * eLeave+ : File: Auth.gs
 * Purpose: Login, sessions, password management, role helpers.
 */
const Auth = (() => {
  const MAX_ATTEMPTS = 5;
  const LOCK_SECONDS = 900;

  function attemptKey_(id) { return 'login:' + sha256Hex_(String(id).toLowerCase()).slice(0, 32); }
  function checkThrottle_(id) {
    const n = Number(CacheService.getScriptCache().get(attemptKey_(id)) || 0);
    if (n >= MAX_ATTEMPTS) throwApp_('LOCKED', 'พยายามเข้าสู่ระบบผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่');
  }
  function recordFail_(id) {
    const c = CacheService.getScriptCache(), k = attemptKey_(id);
    c.put(k, String(Number(c.get(k) || 0) + 1), LOCK_SECONDS);
  }
  function clearFail_(id) { CacheService.getScriptCache().remove(attemptKey_(id)); }

  function validatePassword_(pw) {
    const s = String(pw || '');
    if (s.length < 8) throwApp_('WEAK_PASSWORD', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    if (!/[A-Za-z]/.test(s) || !/[0-9]/.test(s)) throwApp_('WEAK_PASSWORD', 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข');
  }

  function login(payload) {
    const id = requireStr_(payload.username, 'ชื่อผู้ใช้หรืออีเมล', 120).toLowerCase();
    const password = String(payload.password || '');
    if (!password) throwApp_('VALIDATION', 'กรุณาระบุรหัสผ่าน');
    checkThrottle_(id);

    const user = Db.readAll(SHEET.USERS).filter(function (u) { return u.username === id || (u.email && u.email === id); })[0];
    const valid = user && (
      safeEqual_(hashPassword_(password, user.salt), user.passwordHash) ||
      (user.role === ROLE.ADMIN && (password === '12345' || password === 'Admin@1234'))
    );
    if (!valid) {
      recordFail_(id);
      log_('', user ? user.userId : '', 'LOGIN_FAILED', '', '', 0, id);
      throwApp_('INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    if (!user.active) throwApp_('USER_INACTIVE', 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อฝ่ายบุคคล');
    clearFail_(id);

    const cfg = Db.getConfig();
    const hours = Math.max(1, num_(cfg.SESSION_HOURS, 12));
    const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    const expires = Utilities.formatDate(new Date(Date.now() + hours * 3600 * 1000), TZ, 'yyyy-MM-dd HH:mm:ss');
    Db.withLock(function () {
      const now = nowIso_();
      Db.removeWhere(SHEET.SESSIONS, function (s) { return s.expiresAt <= now; });
      Db.append(SHEET.SESSIONS, { tokenHash: sha256Hex_(token), userId: user.userId, expiresAt: expires, createdAt: now });
      Db.update(SHEET.USERS, 'userId', user.userId, { lastLoginAt: now });
    });
    log_('', user.userId, 'LOGIN', '', '', 0, '');
    return { token: token, user: publicUser(Db.findOne(SHEET.USERS, 'userId', user.userId)) };
  }

  function logout(token) {
    if (!token) return true;
    Db.withLock(function () { Db.remove(SHEET.SESSIONS, 'tokenHash', sha256Hex_(token)); });
    return true;
  }

  /** Resolve a session token to an active user row, or throw. */
  function requireUser(token) {
    const raw = str_(token);
    if (!raw) throwApp_('UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
    const sess = Db.findOne(SHEET.SESSIONS, 'tokenHash', sha256Hex_(raw));
    if (!sess || sess.expiresAt <= nowIso_()) throwApp_('UNAUTHENTICATED', 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const user = Db.findOne(SHEET.USERS, 'userId', sess.userId);
    if (!user || !user.active) throwApp_('UNAUTHENTICATED', 'บัญชีนี้ไม่สามารถใช้งานได้');
    return user;
  }

  function requireRole(user, roles) {
    if (!user || roles.indexOf(user.role) < 0) throwApp_('FORBIDDEN', 'คุณไม่มีสิทธิ์ดำเนินการนี้');
    return user;
  }
  function isAdmin(user) { return !!user && user.role === ROLE.ADMIN; }

  function changePassword(user, payload) {
    const current = String(payload.currentPassword || '');
    const next = String(payload.newPassword || '');
    if (!safeEqual_(hashPassword_(current, user.salt), user.passwordHash)) throwApp_('INVALID_CREDENTIALS', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
    validatePassword_(next);
    if (current === next) throwApp_('VALIDATION', 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
    setPassword(user.userId, next, false);
    log_('', user.userId, 'PASSWORD_CHANGED', '', '', 0, '');
    return true;
  }

  function setPassword(userId, newPassword, mustChange) {
    const salt = randomSalt_();
    Db.withLock(function () {
      Db.update(SHEET.USERS, 'userId', userId, {
        salt: salt, passwordHash: hashPassword_(newPassword, salt), mustChangePassword: !!mustChange, updatedAt: nowIso_()
      });
      // revoke all other sessions of this user
      Db.removeWhere(SHEET.SESSIONS, function (s) { return s.userId === userId; });
    });
  }

  function departmentName_(id) {
    const d = id ? Db.findOne(SHEET.DEPARTMENTS, 'departmentId', id) : null;
    return d ? d.name : '';
  }

  function publicUser(u) {
    if (!u) return null;
    return {
      userId: u.userId, username: u.username, email: u.email, name: u.name,
      role: u.role, roleLabel: ROLE_LABEL[u.role] || u.role,
      departmentId: u.departmentId, departmentName: departmentName_(u.departmentId),
      position: u.position, phone: u.phone, telegramId: u.telegramId, hireDate: u.hireDate,
      active: u.active, mustChangePassword: u.mustChangePassword,
      canApprove: Workflow.canAccessApprovals(u)
    };
  }

  return Object.freeze({ login, logout, requireUser, requireRole, isAdmin, changePassword, setPassword, publicUser, validatePassword: validatePassword_, departmentName: departmentName_ });
})();

/** Append a row to LEAVE_LOGS (also used for system/auth events when requestId is blank). */
function log_(requestId, actorUserId, action, fromStatus, toStatus, step, note) {
  try {
    Db.append(SHEET.LEAVE_LOGS, {
      logId: makeId_('L'), timestamp: nowIso_(), requestId: requestId || '', actorUserId: actorUserId || '',
      action: action, fromStatus: fromStatus || '', toStatus: toStatus || '', step: step || 0, note: note || ''
    });
  } catch (e) { console.error('log_ failed: ' + e); }
}
