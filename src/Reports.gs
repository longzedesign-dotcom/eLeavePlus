/**
 * eLeave+ : File: Reports.gs
 * Purpose: Dashboard stats, leave balance matrix, calendar feed, and analytics.
 */
const Reports = (() => {

  function dashboard(user) {
    const cfg = Db.getConfig();
    const today = todayIso_();
    const currentFy = Workflow.fiscalYearOf(today, cfg);
    const ctx = Workflow.context();

    // 1. My Summary
    const myAll = Db.readAll(SHEET.LEAVE_REQUESTS).filter(function(r) { return r.userId === user.userId && r.fiscalYear === currentFy; });
    let myApprovedDays = 0;
    let myPendingCount = 0;
    myAll.forEach(function(r) {
      if (r.status === STATUS.APPROVED) myApprovedDays += r.days;
      else if (r.status === STATUS.PENDING) myPendingCount++;
    });

    // 2. Pending approvals waiting for me
    let pendingApprovalCount = 0;
    if (Workflow.canAccessApprovals(user)) {
      pendingApprovalCount = Workflow.approvalsList(user, { scope: 'inbox' }).length;
    }

    // 3. Who is on leave today
    const leavesToday = Db.readAll(SHEET.LEAVE_REQUESTS)
      .filter(function(r) {
        if (r.status !== STATUS.APPROVED) return false;
        return r.startDate <= today && r.endDate >= today;
      })
      .map(function(r) { return Workflow.enrich(r, ctx); });

    // 4. Department breakdown for current fiscal year
    const deptStats = {};
    Object.keys(ctx.depts).forEach(function(dId) {
      deptStats[dId] = { departmentId: dId, departmentName: ctx.depts[dId].name, approvedDays: 0, count: 0 };
    });
    Db.readAll(SHEET.LEAVE_REQUESTS).forEach(function(r) {
      if (r.fiscalYear === currentFy && r.status === STATUS.APPROVED && deptStats[r.departmentId]) {
        deptStats[r.departmentId].approvedDays = round2_(deptStats[r.departmentId].approvedDays + r.days);
        deptStats[r.departmentId].count++;
      }
    });

    // 5. My Leave Balances for all types
    const myBalances = Object.keys(ctx.types)
      .filter(function(tId) { return ctx.types[tId].active; })
      .map(function(tId) { return Workflow.balance(user.userId, ctx.types[tId], currentFy); });

    // 6. Recent Requests
    const recentRequests = Workflow.myLeaves(user, {}).slice(0, 5);

    return {
      fiscalYear: currentFy,
      myApprovedDays: round2_(myApprovedDays),
      myPendingCount: myPendingCount,
      pendingApprovalCount: pendingApprovalCount,
      leavesToday: leavesToday,
      leavesTodayCount: leavesToday.length,
      deptBreakdown: Object.keys(deptStats).map(function(k) { return deptStats[k]; }),
      myBalances: myBalances,
      recentRequests: recentRequests
    };
  }

  function balanceReport(user, filters) {
    filters = filters || {};
    const cfg = Db.getConfig();
    const fy = filters.fiscalYear ? num_(filters.fiscalYear, 2026) : Workflow.fiscalYearOf(todayIso_(), cfg);

    const isHrOrAdmin = user.role === ROLE.ADMIN || user.role === ROLE.HR;
    const isApprover = user.role === ROLE.APPROVER;

    let targetMemberId = filters.memberId ? str_(filters.memberId) : '';
    let targetDeptId = filters.departmentId ? str_(filters.departmentId) : '';

    // Permission scope
    if (!isHrOrAdmin && !isApprover) {
      // Employee sees ONLY themselves
      targetMemberId = user.userId;
      targetDeptId = user.departmentId;
    } else if (isApprover && !isHrOrAdmin) {
      // Approver sees only their own department by default
      if (!targetDeptId) targetDeptId = user.departmentId;
    }

    const allMembers = Db.readAll(SHEET.USERS).filter(function(u) {
      if (!u.active) return false;
      if (targetMemberId && u.userId !== targetMemberId) return false;
      if (targetDeptId && u.departmentId !== targetDeptId) return false;
      return true;
    });

    const targetLeaveTypeId = filters.leaveTypeId ? str_(filters.leaveTypeId) : '';
    const allTypes = Db.readAll(SHEET.LEAVE_TYPES).filter(function(t) {
      if (targetLeaveTypeId) return t.leaveTypeId === targetLeaveTypeId;
      return t.active;
    });

    const ctx = Workflow.context();
    const rows = [];
    let overQuotaCount = 0;

    allMembers.forEach(function(member) {
      allTypes.forEach(function(type) {
        const bal = Workflow.balance(member.userId, type, fy);
        const isOver = !bal.unlimited && bal.remaining < 0;
        if (isOver) overQuotaCount++;

        rows.push({
          userId: member.userId,
          userName: member.name,
          departmentId: member.departmentId,
          departmentName: (ctx.depts[member.departmentId] || {}).name || '-',
          leaveTypeId: type.leaveTypeId,
          leaveTypeName: type.name,
          color: type.color || '#64748b',
          fiscalYear: fy,
          unlimited: bal.unlimited,
          quota: bal.quota,
          approved: bal.approved,
          pending: bal.pending,
          remaining: bal.remaining,
          isOver: isOver
        });
      });
    });

    return {
      fiscalYear: fy,
      employeeCount: allMembers.length,
      leaveTypeCount: allTypes.length,
      rowCount: rows.length,
      overQuotaCount: overQuotaCount,
      rows: rows
    };
  }

  function calendarFeed(user, year, month) {
    const cfg = Db.getConfig();
    const scope = str_(cfg.CALENDAR_SCOPE) || 'ALL';
    const isHrOrAdmin = user.role === ROLE.ADMIN || user.role === ROLE.HR;

    const y = num_(year, new Date().getFullYear());
    const m = num_(month, new Date().getMonth() + 1);
    const startStr = y + '-' + String(m).padStart(2, '0') + '-01';
    const endStr = y + '-' + String(m).padStart(2, '0') + '-31';

    const ctx = Workflow.context();

    const requests = Db.readAll(SHEET.LEAVE_REQUESTS).filter(function(r) {
      // Must fall in this month window
      if (r.endDate < startStr || r.startDate > endStr) return false;
      // Only approved or pending
      if (r.status !== STATUS.APPROVED && r.status !== STATUS.PENDING) return false;
      // Scope filter
      if (!isHrOrAdmin && scope === 'DEPARTMENT' && r.departmentId !== user.departmentId) {
        return false;
      }
      return true;
    }).map(function(r) { return Workflow.enrich(r, ctx); });

    // Holidays for this month
    const holidays = Db.readAll(SHEET.HOLIDAYS).filter(function(h) {
      return h.date >= startStr && h.date <= endStr;
    });

    return {
      year: y,
      month: m,
      requests: requests,
      holidays: holidays
    };
  }

  function statistics(user, fy) {
    const cfg = Db.getConfig();
    fy = fy ? num_(fy, 2026) : Workflow.fiscalYearOf(todayIso_(), cfg);
    const ctx = Workflow.context();

    const range = Workflow.fiscalRange(fy, cfg);
    const months = []; // 12 months array
    for (let i = 0; i < 12; i++) {
      const d = parseDate_(range.from);
      d.setUTCMonth(d.getUTCMonth() + i);
      const key = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
      months.push({ key: key, label: d.getUTCFullYear() + '/' + (d.getUTCMonth() + 1), approvedDays: 0, count: 0 });
    }

    const typeStats = {};
    Object.keys(ctx.types).forEach(function(tId) {
      typeStats[tId] = { leaveTypeId: tId, name: ctx.types[tId].name, color: ctx.types[tId].color, approvedDays: 0, count: 0 };
    });

    Db.readAll(SHEET.LEAVE_REQUESTS).forEach(function(r) {
      if (r.fiscalYear !== fy || r.status !== STATUS.APPROVED) return;
      const monthKey = r.startDate.slice(0, 7);
      months.forEach(function(m) {
        if (m.key === monthKey) {
          m.approvedDays = round2_(m.approvedDays + r.days);
          m.count++;
        }
      });
      if (typeStats[r.leaveTypeId]) {
        typeStats[r.leaveTypeId].approvedDays = round2_(typeStats[r.leaveTypeId].approvedDays + r.days);
        typeStats[r.leaveTypeId].count++;
      }
    });

    return {
      fiscalYear: fy,
      range: range,
      monthlyBreakdown: months,
      typeBreakdown: Object.keys(typeStats).map(function(k) { return typeStats[k]; })
    };
  }

  return Object.freeze({
    dashboard,
    balanceReport,
    calendarFeed,
    statistics
  });
})();
