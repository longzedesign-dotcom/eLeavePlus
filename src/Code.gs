/**
 * eLeave+ : ระบบลาออนไลน์
 * File: Code.gs
 * Purpose: Web App entry point & client-server RPC bridge.
 */

function doGet(e) {
  // Ensure database sheets exist and are seeded
  try {
    ensureSchema_(false);
  } catch (err) {
    console.error('ensureSchema_ error in doGet: ' + err);
  }

  const template = HtmlService.createTemplateFromFile('Index');
  template.appConfig = {
    name: APP.NAME,
    nameTH: APP.NAME_TH,
    version: APP.VERSION
  };

  return template.evaluate()
    .setTitle(APP.NAME + ' | ' + APP.NAME_TH)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Universal RPC endpoint called from client JavaScript via:
 * google.script.run.withSuccessHandler(...).apiCall(action, payload, token)
 */
function apiCall(action, payload, token) {
  try {
    payload = payload || {};
    ensureSchema_(false);

    // Public / Unauthenticated actions
    if (action === 'getBootstrap') {
      const cfg = Db.getConfig();
      let user = null;
      if (token) {
        try {
          user = Auth.requireUser(token);
        } catch (e) {
          user = null;
        }
      }
      return ok_({
        app: {
          name: APP.NAME,
          nameTH: APP.NAME_TH,
          version: APP.VERSION,
          companyName: cfg.COMPANY_NAME || APP.NAME
        },
        user: user ? Auth.publicUser(user) : null,
        departments: Db.readAll(SHEET.DEPARTMENTS).filter(function(d) { return d.active; }),
        leaveTypes: Db.readAll(SHEET.LEAVE_TYPES).filter(function(t) { return t.active; }).sort(function(a, b) { return a.sortOrder - b.sortOrder; })
      });
    }

    if (action === 'getLeaveTypesAndDepts') {
      return ok_({
        departments: Db.readAll(SHEET.DEPARTMENTS).filter(function(d) { return d.active; }),
        leaveTypes: Db.readAll(SHEET.LEAVE_TYPES).filter(function(t) { return t.active; }).sort(function(a, b) { return a.sortOrder - b.sortOrder; })
      });
    }

    if (action === 'login') {
      return ok_(Auth.login(payload));
    }

    // Authenticated actions
    const user = Auth.requireUser(token);

    switch (action) {
      case 'logout':
        return ok_(Auth.logout(token));
      case 'changePassword':
        return ok_(Auth.changePassword(user, payload));
      case 'getProfile':
        return ok_(Auth.publicUser(user));

      // Workflow & Leaves
      case 'policyPreview':
        return ok_(Workflow.policyPreview(user, payload));
      case 'submitLeave':
        return ok_(Workflow.save(user, payload));
      case 'cancelLeave':
        return ok_(Workflow.cancel(user, payload));
      case 'decideLeave':
        return ok_(Workflow.decide(user, payload));
      case 'getMyLeaves':
        return ok_(Workflow.myLeaves(user, payload));
      case 'getApprovals':
        return ok_(Workflow.approvalsList(user, payload));
      case 'getLeaveDetail':
        return ok_(Workflow.detail(user, payload.requestId));
      case 'getRequestForm':
        return ok_(Workflow.requestForm(user, payload.requestId));

      // Files
      case 'uploadAttachment':
        return ok_(Files.upload(user, payload));

      // Reports & Dashboard
      case 'getDashboard':
        return ok_(Reports.dashboard(user));
      case 'getBalanceReport':
        return ok_(Reports.balanceReport(user, payload));
      case 'getCalendarFeed':
        return ok_(Reports.calendarFeed(user, payload.year, payload.month));
      case 'getStatistics':
        return ok_(Reports.statistics(user, payload.fiscalYear));

      // Admin Management
      case 'adminListUsers':
        return ok_(Admin.listUsers(user));
      case 'adminSaveUser':
        return ok_(Admin.saveUser(user, payload));
      case 'adminResetPassword':
        return ok_(Admin.resetPassword(user, payload));
      case 'adminToggleUser':
        return ok_(Admin.toggleUserActive(user, payload.userId));
      case 'adminListDepartments':
        return ok_(Admin.listDepartments(user));
      case 'adminSaveDepartment':
        return ok_(Admin.saveDepartment(user, payload));
      case 'adminToggleDepartment':
        return ok_(Admin.toggleDepartmentActive(user, payload.departmentId));
      case 'adminListLeaveTypes':
        return ok_(Admin.listLeaveTypes(user));
      case 'adminSaveLeaveType':
        return ok_(Admin.saveLeaveType(user, payload));
      case 'adminToggleLeaveType':
        return ok_(Admin.toggleLeaveTypeActive(user, payload.leaveTypeId));
      case 'adminListApprovalSteps':
        return ok_(Admin.listApprovalSteps(user));
      case 'adminSaveApprovalSteps':
        return ok_(Admin.saveApprovalSteps(user, payload.steps));
      case 'adminListHolidays':
        return ok_(Admin.listHolidays(user));
      case 'adminSaveHoliday':
        return ok_(Admin.saveHoliday(user, payload));
      case 'adminDeleteHoliday':
        return ok_(Admin.deleteHoliday(user, payload));
      case 'adminGetSettings':
        return ok_(Admin.getSettings(user));
      case 'adminSaveSettings':
        return ok_(Admin.saveSettings(user, payload));
      case 'adminSeedDemo':
        return ok_(Admin.seedDemoUsers(user));
      case 'adminGetLogs':
        return ok_(Admin.getAuditLogs(user, payload.limit));

      default:
        throwApp_('NOT_FOUND', 'ไม่พบการทำงานที่ระบุ: ' + action);
    }
  } catch (err) {
    return fail_(err);
  }
}
