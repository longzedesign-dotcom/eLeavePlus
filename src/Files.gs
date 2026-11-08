/**
 * eLeave+ : File: Files.gs
 * Purpose: Drive file storage for leave attachments (certificates, documents).
 */
const Files = (() => {

  function getFolder_() {
    const cfg = Db.getConfig();
    let folderId = str_(cfg.ATTACH_FOLDER_ID);
    if (folderId) {
      try {
        return DriveApp.getFolderById(folderId);
      } catch (e) {
        console.warn('Folder ID in config invalid, creating new one: ' + e);
      }
    }
    // Create new folder in root or alongside spreadsheet
    const folder = DriveApp.createFolder('eLeave_Attachments_' + APP.NAME);
    Db.setConfig('ATTACH_FOLDER_ID', folder.getId());
    return folder;
  }

  function validateFileType_(name, mime, allowedTypes) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const allowed = allowedTypes.map(function(t) { return t.toLowerCase().trim(); });
    if (allowed.indexOf(ext) < 0) {
      throwApp_('INVALID_FILE_TYPE', 'ประเภทไฟล์ไม่ได้รับอนุญาต (อนุญาตเฉพาะ: ' + allowed.join(', ') + ')');
    }
  }

  function upload(user, payload) {
    const name = requireStr_(payload.name || payload.fileName, 'ชื่อไฟล์', 150);
    const mime = str_(payload.mime || payload.mimeType) || 'application/octet-stream';
    const base64 = requireStr_(payload.base64 || payload.data, 'ข้อมูลไฟล์');

    const cfg = Db.getConfig();
    const maxMb = num_(cfg.ATTACH_MAX_MB, 5);
    const allowed = csv_(cfg.ATTACH_FILE_TYPES);
    validateFileType_(name, mime, allowed);

    const bytes = Utilities.base64Decode(base64);
    const size = bytes.length;
    if (size > maxMb * 1024 * 1024) {
      throwApp_('FILE_TOO_LARGE', 'ขนาดไฟล์เกินกำหนด (สูงสุด ' + maxMb + ' MB)');
    }

    const folder = getFolder_();
    const blob = Utilities.newBlob(bytes, mime, name);
    const file = folder.createFile(blob);
    file.setDescription(JSON.stringify({
      uploaderUserId: user.userId,
      uploadedAt: nowIso_(),
      originalName: name
    }));

    // Grant viewer access to anyone with link for easy preview in corporate iframe/modal
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn('Could not set file sharing to ANYONE_WITH_LINK: ' + e);
    }

    return {
      fileId: file.getId(),
      name: name,
      mime: mime,
      size: size,
      url: 'https://drive.google.com/file/d/' + file.getId() + '/view',
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId()
    };
  }

  function assertOwner(user, fileId) {
    if (!fileId) return;
    try {
      const file = DriveApp.getFileById(fileId);
      const desc = file.getDescription();
      if (desc) {
        try {
          const meta = JSON.parse(desc);
          if (meta.uploaderUserId && meta.uploaderUserId !== user.userId && user.role !== ROLE.ADMIN) {
            // Also allow approvers/HR
            if (user.role !== ROLE.HR && user.role !== ROLE.APPROVER) {
              console.warn('File owner mismatch for ' + fileId);
            }
          }
        } catch (je) { /* non-json desc */ }
      }
    } catch (e) {
      console.warn('assertOwner check error: ' + e);
    }
  }

  function getFileUrl(fileId) {
    return 'https://drive.google.com/file/d/' + fileId + '/view';
  }

  return Object.freeze({
    upload,
    assertOwner,
    getFileUrl
  });
})();
