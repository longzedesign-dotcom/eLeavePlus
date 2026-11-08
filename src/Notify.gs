/**
 * eLeave+ : File: Notify.gs
 * Purpose: Email & Telegram notifications for leave lifecycle events.
 */
const Notify = (() => {

  function sendEmail_(to, subject, htmlBody) {
    if (!to || !isEmail_(to)) return;
    try {
      MailApp.sendEmail({
        to: to,
        subject: subject,
        htmlBody: htmlBody
      });
    } catch (e) {
      console.warn('MailApp failed to send to ' + to + ': ' + e);
    }
  }

  function sendTelegram_(chatId, text) {
    if (!chatId) return;
    const cfg = Db.getConfig();
    const token = str_(cfg.TELEGRAM_BOT_TOKEN);
    if (!token) return;
    try {
      const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
      UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        }),
        muteHttpExceptions: true
      });
    } catch (e) {
      console.warn('Telegram send failed: ' + e);
    }
  }

  function formatLeavePeriod_(row) {
    if (row.startDate === row.endDate) {
      return row.startDate + ' (' + row.startPeriodLabel + ')';
    }
    return row.startDate + ' (' + row.startPeriodLabel + ') ถึง ' + row.endDate + ' (' + row.endPeriodLabel + ')';
  }

  function submitted(row, actionType) {
    const cfg = Db.getConfig();
    const notifyEmail = bool_(cfg.NOTIFY_EMAIL);
    const company = str_(cfg.COMPANY_NAME) || APP.NAME;

    const actionText = actionType === 'EDIT' ? 'แก้ไขใบลา' : 'ยื่นใบลาใหม่';
    const periodText = formatLeavePeriod_(row);

    // 1. Notify Approvers for the current step
    if (row.status === STATUS.PENDING && row.currentStep > 0) {
      const currentStepObj = Workflow.steps().filter(function(s) { return s.step === row.currentStep; })[0];
      if (currentStepObj) {
        const approvers = Workflow.eligibleApprovers(currentStepObj, row, true);
        approvers.forEach(function(appr) {
          if (notifyEmail && appr.email) {
            const subject = '[' + company + '] มีคำขอลาใหม่รอการอนุมัติ: ' + row.requestNo + ' (' + row.userName + ')';
            const html = `
              <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                <h3 style="color: #1e3a8a; margin-top: 0;">แจ้งเตือน: คำขอลาใหม่รอการพิจารณา</h3>
                <p>เรียน <strong>${appr.name}</strong> (${currentStepObj.label}),</p>
                <p>มีรายการยื่นขอลาใหม่จากพนักงานในขั้นตอนการอนุมัติของท่าน ดังนี้:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">เลขที่ใบลา:</td><td><strong>${row.requestNo}</strong></td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b;">ผู้ขอลา:</td><td>${row.userName} (${row.departmentName || '-'})</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b;">ประเภทการลา:</td><td><strong style="color: ${row.color || '#1e3a8a'};">${row.leaveTypeName}</strong></td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b;">ช่วงวันลา:</td><td>${periodText} (รวม <strong>${row.days}</strong> วัน)</td></tr>
                  <tr><td style="padding: 6px 0; color: #64748b;">เหตุผล:</td><td>${row.reason}</td></tr>
                  ${row.contact ? `<tr><td style="padding: 6px 0; color: #64748b;">ติดต่อระหว่างลา:</td><td>${row.contact}</td></tr>` : ''}
                </table>
                <p style="margin-top: 20px;">กรุณาเข้าสู่ระบบ ${APP.NAME} เพื่อพิจารณาอนุมัติหรือให้ความเห็นต่อไป</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">ข้อความนี้สร้างโดยระบบ ${APP.NAME} (${company})</p>
              </div>
            `;
            sendEmail_(appr.email, subject, html);
          }
          if (appr.telegramId) {
            const tg = `🔔 <b>มีคำขอลาใหม่รอการอนุมัติ</b>\nเลขที่: <code>${row.requestNo}</code>\nผู้ขอ: ${row.userName}\nประเภท: ${row.leaveTypeName}\nช่วงวัน: ${periodText}\nจำนวน: ${row.days} วัน\nเหตุผล: ${row.reason}`;
            sendTelegram_(appr.telegramId, tg);
          }
        });
      }
    }

    // 2. Central telegram channel
    if (cfg.TELEGRAM_CHAT_ID) {
      const centralTg = `📋 <b>${actionText} (${company})</b>\nเลขที่: <code>${row.requestNo}</code>\nพนักงาน: ${row.userName} (${row.departmentName})\nประเภท: ${row.leaveTypeName} (${row.days} วัน)\nช่วงวัน: ${periodText}`;
      sendTelegram_(cfg.TELEGRAM_CHAT_ID, centralTg);
    }
  }

  function decided(row, decision, note, decider) {
    const cfg = Db.getConfig();
    const notifyEmail = bool_(cfg.NOTIFY_EMAIL);
    const company = str_(cfg.COMPANY_NAME) || APP.NAME;

    const requester = Db.findOne(SHEET.USERS, 'userId', row.userId);
    if (!requester) return;

    let decisionLabel = 'ได้รับการอนุมัติ';
    let statusColor = '#10b981';
    if (decision === 'REJECT') {
      decisionLabel = 'ถูกปฏิเสธ';
      statusColor = '#ef4444';
    } else if (decision === 'RETURN') {
      decisionLabel = 'ถูกส่งกลับเพื่อแก้ไข';
      statusColor = '#f59e0b';
    } else if (decision === 'CANCEL') {
      decisionLabel = 'ถูกยกเลิกแล้ว';
      statusColor = '#64748b';
    } else if (row.status === STATUS.PENDING) {
      decisionLabel = 'ผ่านการอนุมัติขั้นที่ผ่านมา (กำลังรอพิจารณาในขั้นถัดไป)';
      statusColor = '#3b82f6';
    }

    const periodText = formatLeavePeriod_(row);

    // Notify requester
    if (notifyEmail && requester.email) {
      const subject = '[' + company + '] ผลการพิจารณาใบลา: ' + row.requestNo + ' (' + decisionLabel + ')';
      const html = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h3 style="color: ${statusColor}; margin-top: 0;">ผลการพิจารณาคำขอลา: ${decisionLabel}</h3>
          <p>เรียน <strong>${requester.name}</strong>,</p>
          <p>ใบลาเลขที่ <strong>${row.requestNo}</strong> ของท่าน ได้รับการดำเนินการเรียบร้อยแล้ว:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 140px;">สถานะ:</td><td><strong style="color: ${statusColor};">${row.statusLabel}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">ประเภทการลา:</td><td>${row.leaveTypeName}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">ช่วงวันลา:</td><td>${periodText} (${row.days} วัน)</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">ผู้ดำเนินการ:</td><td>${decider ? decider.name : '-'}</td></tr>
            ${note ? `<tr><td style="padding: 6px 0; color: #64748b;">ความเห็น / เหตุผล:</td><td><strong style="color: #b91c1c;">${note}</strong></td></tr>` : ''}
          </table>
          <p style="margin-top: 20px;">ท่านสามารถเข้าสู่ระบบเพื่อตรวจสอบประวัติและยอดวันลาคงเหลือได้ตลอดเวลา</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">ข้อความนี้สร้างโดยระบบ ${APP.NAME} (${company})</p>
        </div>
      `;
      sendEmail_(requester.email, subject, html);
    }

    if (requester.telegramId) {
      const tg = `📢 <b>ผลการพิจารณาใบลา</b>\nเลขที่: <code>${row.requestNo}</code>\nสถานะ: <b>${row.statusLabel}</b>\nประเภท: ${row.leaveTypeName} (${row.days} วัน)\n${note ? 'ความเห็น: ' + note : ''}`;
      sendTelegram_(requester.telegramId, tg);
    }

    // If approved and moved to NEXT step, also notify next step approvers!
    if (row.status === STATUS.PENDING && row.currentStep > 0) {
      submitted(row, 'STEP_ADVANCE');
    }
  }

  return Object.freeze({
    submitted,
    decided
  });
})();
