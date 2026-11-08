/**
 * eLeave+ : File: Workflow.gs
 * Purpose: Leave rules engine — day calculation, policy/balance, approval workflow, request lifecycle.
 */
const Workflow = (() => {

  /* ====================== fiscal year ====================== */
  function fiscalStartMonth_(cfg) {
    const m = Math.floor(num_(cfg.FISCAL_YEAR_START_MONTH, 1));
    return m >= 1 && m <= 12 ? m : 1;
  }
  /** Fiscal year label. m=1 → calendar year; m>1 → year in which the fiscal year ENDS (ปีงบประมาณ). */
  function fiscalYearOf(iso, cfg) {
    const y = Number(iso.slice(0, 4)), mo = Number(iso.slice(5, 7)), m = fiscalStartMonth_(cfg);
    if (m === 1) return y;
    return mo >= m ? y + 1 : y;
  }
  function fiscalRange(fy, cfg) {
    const m = fiscalStartMonth_(cfg), mm = String(m).padStart(2, '0');
    if (m === 1) return { from: fy + '-01-01', to: fy + '-12-31' };
    return { from: (fy - 1) + '-' + mm + '-01', to: addDays_(fy + '-' + mm + '-01', -1) };
  }

  /* ====================== calendar helpers ====================== */
  function holidaySet_() {
    const set = {};
    Db.readAll(SHEET.HOLIDAYS).forEach(function (h) { if (h.date) set[h.date] = h.name; });
    return set;
  }
  function isOffDay_(iso, cfg, holidays) {
    if (!bool_(cfg.EXCLUDE_WEEKENDS_HOLIDAYS)) return false;
    const weekend = csv_(cfg.WEEKEND_DAYS).map(Number);
    return weekend.indexOf(weekday_(iso)) >= 0 || !!holidays[iso];
  }

  /**
   * Validate dates/periods and return per-date weights.
   * @returns {{error:string, weights:Array<{date:string,weight:number}>, days:number, startDate:string, endDate:string, startPeriod:number, endPeriod:number}}
   */
  function dayWeights(input, cfg, holidays) {
    const res = { error: '', weights: [], days: 0 };
    const startDate = toIsoDate_(input.startDate);
    let endDate = toIsoDate_(input.endDate) || startDate;
    let startPeriod = Math.floor(num_(input.startPeriod, 0));
    let endPeriod = Math.floor(num_(input.endPeriod, 0));
    res.startDate = startDate; res.endDate = endDate;
    if (!startDate || !parseDate_(startDate)) { res.error = 'กรุณาระบุวันที่เริ่มลา'; return res; }
    if (!parseDate_(endDate)) { res.error = 'วันที่สิ้นสุดไม่ถูกต้อง'; return res; }
    if ([0, 1, 2].indexOf(startPeriod) < 0 || [0, 1, 2].indexOf(endPeriod) < 0) { res.error = 'ช่วงเวลาลาไม่ถูกต้อง'; return res; }
    if (endDate < startDate) { res.error = 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มลา'; return res; }
    if (diffDays_(startDate, endDate) > 366) { res.error = 'ช่วงวันลายาวเกินไป'; return res; }

    const same = startDate === endDate;
    if (same) {
      endPeriod = startPeriod;
    } else {
      if (startPeriod === 1) { res.error = 'ลาหลายวัน: วันเริ่มต้นเลือกได้เฉพาะ "เต็มวัน" หรือ "ครึ่งวันบ่าย"'; return res; }
      if (endPeriod === 2) { res.error = 'ลาหลายวัน: วันสิ้นสุดเลือกได้เฉพาะ "เต็มวัน" หรือ "ครึ่งวันเช้า"'; return res; }
    }
    res.startPeriod = startPeriod; res.endPeriod = endPeriod;

    let total = 0;
    eachDate_(startDate, endDate).forEach(function (d) {
      let w = 1;
      if (same) w = startPeriod === 0 ? 1 : 0.5;
      else if (d === startDate && startPeriod === 2) w = 0.5;
      else if (d === endDate && endPeriod === 1) w = 0.5;
      if (isOffDay_(d, cfg, holidays)) w = 0;
      res.weights.push({ date: d, weight: w });
      total += w;
    });
    res.days = round2_(total);
    if (res.days <= 0) { res.error = 'ช่วงวันที่เลือกเป็นวันหยุดทั้งหมด ไม่ต้องยื่นใบลา'; }

    const fy1 = fiscalYearOf(startDate, cfg), fy2 = fiscalYearOf(endDate, cfg);
    if (!res.error && fy1 !== fy2) {
      res.error = 'ไม่สามารถลาคาบเกี่ยวข้ามปีงบประมาณได้ กรุณาแยกใบลาเป็น 2 ใบ (ปีงบประมาณ ' + fy1 + ' และ ' + fy2 + ')';
    }
    res.fiscalYear = fy1;
    return res;
  }

  /** Half-day aware slots for overlap detection (calendar days, ignoring weekends). */
  function slots_(r) {
    const out = [];
    const same = r.startDate === r.endDate;
    eachDate_(r.startDate, r.endDate).forEach(function (d) {
      let am = true, pm = true;
      if (same) { am = r.startPeriod !== 2; pm = r.startPeriod !== 1; }
      else {
        if (d === r.startDate && r.startPeriod === 2) am = false;
        if (d === r.endDate && r.endPeriod === 1) pm = false;
      }
      if (am) out.push(d + 'A');
      if (pm) out.push(d + 'P');
    });
    return out;
  }

  /* ====================== usage & balance ====================== */
  function usage(userId, leaveTypeId, fy, excludeRequestId) {
    let approved = 0, pending = 0;
    Db.readAll(SHEET.LEAVE_REQUESTS).forEach(function (r) {
      if (r.userId !== userId || r.leaveTypeId !== leaveTypeId || r.fiscalYear !== fy) return;
      if (excludeRequestId && r.requestId === excludeRequestId) return;
      if (r.status === STATUS.APPROVED) approved += r.days;
      else if (r.status === STATUS.PENDING || r.status === STATUS.RETURNED) pending += r.days;
    });
    return { approved: round2_(approved), pending: round2_(pending) };
  }
  function balance(userId, type, fy, excludeRequestId) {
    const u = usage(userId, type.leaveTypeId, fy, excludeRequestId);
    const unlimited = !(type.quotaDays > 0);
    return {
      leaveTypeId: type.leaveTypeId, leaveTypeName: type.name, fiscalYear: fy,
      unlimited: unlimited, quota: unlimited ? null : type.quotaDays,
      approved: u.approved, pending: u.pending,
      remaining: unlimited ? null : round2_(type.quotaDays - u.approved - u.pending)
    };
  }

  /* ====================== approval steps & eligibility ====================== */
  function steps() {
    return Db.readAll(SHEET.APPROVAL_STEPS).filter(function (s) { return num_(s.step, 0) > 0; }).sort(function (a, b) { return num_(a.step, 0) - num_(b.step, 0); });
  }
  function matchesStep_(approver, step, requestDeptId) {
    if (!approver || !approver.active) return false;
    if (approver.role === ROLE.ADMIN) return true;
    if (approver.role !== step.role) return false;
    const scope = step.departmentId;
    if (!scope || scope === '*') return true;
    if (scope === 'SAME') return !!approver.departmentId && approver.departmentId === requestDeptId;
    return approver.departmentId === scope;
  }
  /** Non-admin approvers able to act on a step (excluding the requester). */
  function eligibleApprovers(step, request, includeAdmin) {
    return Db.readAll(SHEET.USERS).filter(function (u) {
      if (u.userId === request.userId) return false;
      if (!includeAdmin && u.role === ROLE.ADMIN) return false;
      return matchesStep_(u, step, request.departmentId);
    });
  }
  /** Next step number after `after` that has at least one non-admin approver. 0 = none left. */
  function nextStep(request, after) {
    const all = steps();
    const afterNum = num_(after, 0);
    const rest = all.filter(function (s) { return num_(s.step, 0) > afterNum; });
    for (let i = 0; i < rest.length; i++) {
      if (eligibleApprovers(rest[i], request, false).length > 0) return num_(rest[i].step, 0);
    }
    // nobody (except admins) can approve at all → let an admin handle the first configured step
    if (afterNum === 0 && all.length > 0 && !all.some(function (s) { return eligibleApprovers(s, request, false).length > 0; })) return num_(all[0].step, 0);
    return 0;
  }
  function canAccessApprovals(user) {
    if (!user || !user.active) return false;
    if (user.role === ROLE.ADMIN || user.role === ROLE.HR) return true;
    return steps().some(function (s) { return s.role === user.role; });
  }
  function canDecide(user, request) {
    if (!user || !user.active) return false;
    if (request.status !== STATUS.PENDING) return false;
    const cfg = Db.getConfig();
    // Requester check
    if (request.userId === user.userId) {
      return user.role === ROLE.ADMIN && (cfg.ALLOW_ADMIN_SELF_APPROVAL === undefined || bool_(cfg.ALLOW_ADMIN_SELF_APPROVAL));
    }
    // Master Admin override
    if (user.role === ROLE.ADMIN) return true;

    const reqStep = num_(request.currentStep, 1);
    const step = steps().filter(function (s) { return num_(s.step, 0) === reqStep; })[0];

    // HR authority
    if (user.role === ROLE.HR) {
      return true; // HR has company-wide authority to approve or act on any request
    }

    if (!step) return false;
    return matchesStep_(user, step, request.departmentId);
  }
  function canViewRequest(user, request) {
    if (!user) return false;
    if (request.userId === user.userId) return true;
    if (user.role === ROLE.ADMIN || user.role === ROLE.HR) return true;
    if (user.role === ROLE.APPROVER) return !!user.departmentId && user.departmentId === request.departmentId;
    return false;
  }

  /* ====================== enrichment ====================== */
  function context() {
    const ctx = { users: {}, types: {}, depts: {}, steps: steps() };
    Db.readAll(SHEET.USERS).forEach(function (u) { ctx.users[u.userId] = u; });
    Db.readAll(SHEET.LEAVE_TYPES).forEach(function (t) { ctx.types[t.leaveTypeId] = t; });
    Db.readAll(SHEET.DEPARTMENTS).forEach(function (d) { ctx.depts[d.departmentId] = d; });
    return ctx;
  }
  function enrich(r, ctx) {
    const u = ctx.users[r.userId] || {}, t = ctx.types[r.leaveTypeId] || {}, d = ctx.depts[r.departmentId] || {};
    const step = ctx.steps.filter(function (s) { return num_(s.step, 0) === num_(r.currentStep, 0); })[0];
    let attachments = [];
    try { attachments = r.attachmentsJson ? JSON.parse(r.attachmentsJson) : []; } catch (e) { attachments = []; }
    return {
      requestId: r.requestId, requestNo: r.requestNo, userId: r.userId, userName: u.name || '-', position: u.position || '',
      departmentId: r.departmentId, departmentName: d.name || '-',
      leaveTypeId: r.leaveTypeId, leaveTypeName: t.name || '-', color: t.color || '#64748b',
      startDate: r.startDate, startPeriod: r.startPeriod, startPeriodLabel: PERIOD_LABEL[r.startPeriod] || '',
      endDate: r.endDate, endPeriod: r.endPeriod, endPeriodLabel: PERIOD_LABEL[r.endPeriod] || '',
      days: r.days, reason: r.reason, contact: r.contact, attachments: attachments,
      status: r.status, statusLabel: STATUS_LABEL[r.status] || r.status,
      currentStep: r.currentStep, currentStepLabel: r.status === STATUS.PENDING && step ? step.label : '',
      fiscalYear: r.fiscalYear, decisionNote: r.decisionNote, createdAt: r.createdAt, updatedAt: r.updatedAt
    };
  }

  /* ====================== validation shared by preview & save ====================== */
  function evaluate_(user, input, excludeRequestId) {
    const cfg = Db.getConfig();
    const errors = [];
    const type = Db.findOne(SHEET.LEAVE_TYPES, 'leaveTypeId', str_(input.leaveTypeId));
    if (!type || !type.active) errors.push('กรุณาเลือกประเภทการลา');

    const calc = dayWeights(input, cfg, holidaySet_());
    if (calc.error) errors.push(calc.error);

    let bal = null;
    if (type && !calc.error) {
      // back-dating rule
      const today = todayIso_();
      if (calc.startDate < today && !type.allowBackdate) {
        const allowed = Math.max(0, Math.floor(num_(cfg.ALLOW_BACKDATE_DAYS, 0)));
        if (diffDays_(calc.startDate, today) > allowed) {
          errors.push('ประเภทการลานี้ต้องยื่นล่วงหน้า' + (allowed ? ' (ย้อนหลังได้ไม่เกิน ' + allowed + ' วัน)' : ' ไม่สามารถย้อนหลังได้'));
        }
      }
      // overlap with own active requests
      const mine = slots_({ startDate: calc.startDate, endDate: calc.endDate, startPeriod: calc.startPeriod, endPeriod: calc.endPeriod });
      const clash = Db.readAll(SHEET.LEAVE_REQUESTS).filter(function (r) {
        if (r.userId !== user.userId || r.requestId === excludeRequestId) return false;
        if ([STATUS.PENDING, STATUS.APPROVED, STATUS.RETURNED].indexOf(r.status) < 0) return false;
        if (r.endDate < calc.startDate || r.startDate > calc.endDate) return false;
        return slots_(r).some(function (s) { return mine.indexOf(s) >= 0; });
      })[0];
      if (clash) errors.push('ช่วงวันที่ซ้อนกับใบลาเลขที่ ' + clash.requestNo + ' (' + clash.startDate + ' ถึง ' + clash.endDate + ')');

      // balance
      bal = balance(user.userId, type, calc.fiscalYear, excludeRequestId);
      if (!bal.unlimited && bal.remaining - calc.days < -0.00001) {
        errors.push('วันลาคงเหลือไม่เพียงพอ (เหลือ ' + bal.remaining + ' วัน, ขอลา ' + calc.days + ' วัน)');
      }
    }
    return { cfg: cfg, type: type, calc: calc, balance: bal, errors: errors };
  }

  function policyPreview(user, input) {
    const ev = evaluate_(user, input, str_(input.requestId));
    const type = ev.type;
    const needAttach = !!(type && type.attachmentRequiredDays > 0 && ev.calc.days >= type.attachmentRequiredDays);
    return {
      days: ev.calc.error ? 0 : ev.calc.days,
      fiscalYear: ev.calc.fiscalYear || null,
      errors: ev.errors,
      attachmentRequired: needAttach,
      type: type ? { leaveTypeId: type.leaveTypeId, name: type.name, description: type.description, quotaDays: type.quotaDays, attachmentRequiredDays: type.attachmentRequiredDays, allowBackdate: type.allowBackdate } : null,
      balance: ev.balance,
      holidays: ev.calc.weights ? ev.calc.weights.filter(function (w) { return w.weight === 0; }).map(function (w) { return w.date; }) : []
    };
  }

  /* ====================== request lifecycle ====================== */
  function canEditRequest(user, r) {
    return r.userId === user.userId && (r.status === STATUS.PENDING || r.status === STATUS.RETURNED);
  }
  function canCancelRequest(user, r) {
    if (r.userId !== user.userId) return false;
    if (r.status === STATUS.PENDING || r.status === STATUS.RETURNED) return true;
    return r.status === STATUS.APPROVED && r.startDate > todayIso_();
  }

  function nextRequestNo_(year) {
    const prefix = 'LV' + year + '-';
    let max = 0;
    Db.readAll(SHEET.LEAVE_REQUESTS).forEach(function (r) {
      if (r.requestNo.indexOf(prefix) === 0) max = Math.max(max, Number(r.requestNo.slice(prefix.length)) || 0);
    });
    return prefix + String(max + 1).padStart(4, '0');
  }

  function sanitizeAttachments_(user, list, cfg) {
    const arr = Array.isArray(list) ? list : [];
    if (arr.length > 5) throwApp_('VALIDATION', 'แนบไฟล์ได้ไม่เกิน 5 ไฟล์');
    return arr.map(function (a) {
      const fileId = requireStr_(a.fileId, 'ไฟล์แนบ', 200);
      Files.assertOwner(user, fileId);
      return { fileId: fileId, name: str_(a.name).slice(0, 150), mime: str_(a.mime).slice(0, 100), size: num_(a.size, 0) };
    });
  }

  function save(user, input) {
    return Db.withLock(function () {
      const id = str_(input.requestId);
      let existing = null;
      if (id) {
        existing = Db.findOne(SHEET.LEAVE_REQUESTS, 'requestId', id);
        if (!existing || existing.userId !== user.userId) throwApp_('NOT_FOUND', 'ไม่พบใบลา');
        if (!canEditRequest(user, existing)) throwApp_('FORBIDDEN', 'ใบลานี้ไม่สามารถแก้ไขได้แล้ว');
      }
      const reason = requireStr_(input.reason, 'เหตุผลการลา', 1000);
      const ev = evaluate_(user, input, id);
      if (ev.errors.length) throwApp_('VALIDATION', ev.errors[0]);

      const attachments = sanitizeAttachments_(user, input.attachments, ev.cfg);
      if (ev.type.attachmentRequiredDays > 0 && ev.calc.days >= ev.type.attachmentRequiredDays && attachments.length === 0) {
        throwApp_('VALIDATION', 'ประเภท "' + ev.type.name + '" ต้องแนบเอกสารประกอบเมื่อลาตั้งแต่ ' + ev.type.attachmentRequiredDays + ' วันขึ้นไป');
      }

      const now = nowIso_();
      const draft = {
        userId: user.userId, departmentId: user.departmentId, leaveTypeId: ev.type.leaveTypeId,
        startDate: ev.calc.startDate, startPeriod: ev.calc.startPeriod, endDate: ev.calc.endDate, endPeriod: ev.calc.endPeriod,
        days: ev.calc.days, reason: reason, contact: str_(input.contact).slice(0, 300),
        attachmentsJson: JSON.stringify(attachments), fiscalYear: ev.calc.fiscalYear
      };

      // determine first approval step
      let first = 0;
      if (steps().length > 0) first = nextStep(draft, 0);
      const autoApprove = first === 0;
      const status = autoApprove ? STATUS.APPROVED : STATUS.PENDING;
      const patch = Object.assign({}, draft, {
        status: status, currentStep: autoApprove ? 0 : first, decisionNote: '', updatedAt: now
      });

      let saved;
      if (existing) {
        saved = Db.update(SHEET.LEAVE_REQUESTS, 'requestId', id, patch);
        log_(id, user.userId, 'EDIT', existing.status, status, patch.currentStep, 'แก้ไขใบลา');
      } else {
        patch.requestId = makeId_('R');
        patch.requestNo = nextRequestNo_(new Date().getFullYear());
        patch.createdAt = now;
        saved = Db.append(SHEET.LEAVE_REQUESTS, patch);
        log_(patch.requestId, user.userId, 'SUBMIT', '', status, patch.currentStep, autoApprove ? 'อนุมัติอัตโนมัติ (ไม่มีผู้อนุมัติ)' : 'ยื่นใบลา');
      }
      const ctx = context();
      const row = enrich(saved, ctx);
      Notify.submitted(row, existing ? 'EDIT' : 'NEW');
      return row;
    });
  }

  function cancel(user, input) {
    return Db.withLock(function () {
      const r = Db.findOne(SHEET.LEAVE_REQUESTS, 'requestId', requireStr_(input.requestId, 'ใบลา'));
      if (!r || r.userId !== user.userId) throwApp_('NOT_FOUND', 'ไม่พบใบลา');
      if (!canCancelRequest(user, r)) throwApp_('FORBIDDEN', 'ใบลานี้ไม่สามารถยกเลิกได้');
      const note = str_(input.note).slice(0, 300);
      const saved = Db.update(SHEET.LEAVE_REQUESTS, 'requestId', r.requestId, { status: STATUS.CANCELLED, currentStep: 0, decisionNote: note, updatedAt: nowIso_() });
      log_(r.requestId, user.userId, 'CANCEL', r.status, STATUS.CANCELLED, 0, note);
      const row = enrich(saved, context());
      Notify.decided(row, 'CANCEL', note, user);
      return row;
    });
  }

  /** decision: APPROVE | REJECT | RETURN */
  function decide(user, input) {
    return Db.withLock(function () {
      const decision = str_(input.decision).toUpperCase();
      if (['APPROVE', 'REJECT', 'RETURN'].indexOf(decision) < 0) throwApp_('VALIDATION', 'การดำเนินการไม่ถูกต้อง');
      const note = str_(input.note).slice(0, 500);
      if (decision !== 'APPROVE' && !note) throwApp_('VALIDATION', 'กรุณาระบุเหตุผล');
      const r = Db.findOne(SHEET.LEAVE_REQUESTS, 'requestId', requireStr_(input.requestId, 'ใบลา'));
      if (!r) throwApp_('NOT_FOUND', 'ไม่พบใบลา');
      if (r.status !== STATUS.PENDING) throwApp_('CONFLICT', 'ใบลานี้ถูกดำเนินการไปแล้ว');
      if (!canDecide(user, r)) throwApp_('FORBIDDEN', 'คุณไม่มีสิทธิ์พิจารณาใบลานี้ในขั้นตอนปัจจุบัน');

      let status, step = r.currentStep, extra = '';
      if (decision === 'REJECT') { status = STATUS.REJECTED; step = 0; }
      else if (decision === 'RETURN') { status = STATUS.RETURNED; step = 0; }
      else {
        const type = Db.findOne(SHEET.LEAVE_TYPES, 'leaveTypeId', r.leaveTypeId);
        if (type && type.quotaDays > 0) {
          const bal = balance(r.userId, type, r.fiscalYear, r.requestId);
          if (bal.remaining - r.days < -0.00001) throwApp_('VALIDATION', 'ไม่สามารถอนุมัติได้ เนื่องจากวันลาคงเหลือไม่เพียงพอ (เหลือ ' + bal.remaining + ' วัน)');
        }
        if (user.role === ROLE.ADMIN) { status = STATUS.APPROVED; step = 0; extra = ' (ผู้ดูแลระบบอนุมัติขั้นสุดท้าย)'; }
        else {
          const nxt = nextStep(r, r.currentStep);
          if (nxt === 0) { status = STATUS.APPROVED; step = 0; }
          else { status = STATUS.PENDING; step = nxt; }
        }
      }
      const saved = Db.update(SHEET.LEAVE_REQUESTS, 'requestId', r.requestId, {
        status: status, currentStep: step, decisionNote: note || r.decisionNote, updatedAt: nowIso_()
      });
      log_(r.requestId, user.userId, decision, r.status, status, r.currentStep, (note || '') + extra);
      const row = enrich(saved, context());
      Notify.decided(row, decision, note, user);
      return row;
    });
  }

  /* ====================== queries ====================== */
  function sortDesc_(a, b) { return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0; }

  function myLeaves(user, f) {
    const ctx = context();
    f = f || {};
    const showAll = f.scope === 'all' && (user.role === ROLE.ADMIN || user.role === ROLE.HR);
    return Db.readAll(SHEET.LEAVE_REQUESTS)
      .filter(function (r) {
        if (!showAll && r.userId !== user.userId) return false;
        if (showAll && !canViewRequest(user, r)) return false;
        if (f.status && r.status !== f.status) return false;
        if (f.fiscalYear && Number(r.fiscalYear) !== Number(f.fiscalYear)) return false;
        if (f.leaveTypeId && r.leaveTypeId !== f.leaveTypeId) return false;
        return true;
      })
      .sort(sortDesc_)
      .map(function (r) {
        const e = enrich(r, ctx);
        e.canEdit = canEditRequest(user, r);
        e.canCancel = canCancelRequest(user, r);
        return e;
      });
  }

  /** scope: 'inbox' (waiting for me) | 'all' (everything I may see) */
  function approvalsList(user, f) {
    if (!canAccessApprovals(user)) throwApp_('FORBIDDEN', 'คุณไม่มีสิทธิ์เข้าถึงหน้าอนุมัติ');
    const ctx = context();
    const inbox = f.scope !== 'all';
    return Db.readAll(SHEET.LEAVE_REQUESTS)
      .filter(function (r) {
        if (inbox) { if (!canDecide(user, r)) return false; }
        else {
          if (!canViewRequest(user, r) || r.userId === user.userId && user.role !== ROLE.ADMIN && user.role !== ROLE.HR) return false;
          if (f.status && r.status !== f.status) return false;
        }
        if (f.leaveTypeId && r.leaveTypeId !== f.leaveTypeId) return false;
        if (f.departmentId && r.departmentId !== f.departmentId) return false;
        if (f.from && r.endDate < f.from) return false;
        if (f.to && r.startDate > f.to) return false;
        return true;
      })
      .sort(sortDesc_)
      .map(function (r) { const e = enrich(r, ctx); e.canDecide = canDecide(user, r); return e; });
  }

  function detail(user, requestId) {
    const r = Db.findOne(SHEET.LEAVE_REQUESTS, 'requestId', str_(requestId));
    if (!r || !canViewRequest(user, r)) throwApp_('NOT_FOUND', 'ไม่พบใบลา');
    const ctx = context();
    const e = enrich(r, ctx);
    const type = ctx.types[r.leaveTypeId];
    const logs = Db.readAll(SHEET.LEAVE_LOGS)
      .filter(function (l) { return l.requestId === r.requestId; })
      .sort(function (a, b) { return a.timestamp < b.timestamp ? -1 : 1; })
      .map(function (l) {
        return { timestamp: l.timestamp, action: l.action, actorName: (ctx.users[l.actorUserId] || {}).name || '-', fromStatus: l.fromStatus, toStatus: l.toStatus, note: l.note };
      });
    e.logs = logs;
    e.balance = type ? balance(r.userId, type, r.fiscalYear, r.status === STATUS.PENDING || r.status === STATUS.RETURNED ? r.requestId : '') : null;
    e.balanceIncludesThis = e.balance && type && type.quotaDays > 0 ? round2_(e.balance.remaining - (r.status === STATUS.PENDING ? r.days : 0)) : null;
    e.canEdit = canEditRequest(user, r);
    e.canCancel = canCancelRequest(user, r);
    e.canDecide = canDecide(user, r);
    e.steps = ctx.steps.map(function (s) { return { step: s.step, label: s.label, role: s.role }; });
    e.typeDescription = type ? type.description : '';
    return e;
  }

  function requestForm(user, requestId) {
    const types = Db.readAll(SHEET.LEAVE_TYPES).filter(function (t) { return t.active; })
      .sort(function (a, b) { return a.sortOrder - b.sortOrder; })
      .map(function (t) { return { leaveTypeId: t.leaveTypeId, name: t.name, description: t.description, quotaDays: t.quotaDays, attachmentRequiredDays: t.attachmentRequiredDays, allowBackdate: t.allowBackdate, color: t.color }; });
    let request = null;
    if (requestId) {
      const r = Db.findOne(SHEET.LEAVE_REQUESTS, 'requestId', requestId);
      if (!r || !canEditRequest(user, r)) throwApp_('NOT_FOUND', 'ไม่พบใบลาที่แก้ไขได้');
      request = enrich(r, context());
    }
    const cfg = Db.getConfig();
    return { types: types, request: request, attach: { maxMb: num_(cfg.ATTACH_MAX_MB, 5), types: csv_(cfg.ATTACH_FILE_TYPES) } };
  }

  return Object.freeze({
    fiscalYearOf, fiscalRange, fiscalStartMonth: fiscalStartMonth_, holidaySet: holidaySet_, dayWeights, usage, balance, steps,
    eligibleApprovers, nextStep, canAccessApprovals, canDecide, canViewRequest, context, enrich,
    policyPreview, save, cancel, decide, myLeaves, approvalsList, detail, requestForm, canEditRequest, canCancelRequest
  });
})();
