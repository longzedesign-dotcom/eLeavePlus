/**
 * eLeave+ : File: Db.gs
 * Purpose: The only layer that touches Google Sheets. Per-execution cache + script lock for writes.
 */
const Db = (() => {
  let ss_ = null;
  const cache_ = {};
  const headerCache_ = {};

  function spreadsheetId_() {
    const p = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    return p || APP.DEFAULT_SPREADSHEET_ID;
  }
  function ss() {
    if (!ss_) ss_ = SpreadsheetApp.openById(spreadsheetId_());
    return ss_;
  }
  function sheet(name) {
    const s = ss().getSheetByName(name);
    if (!s) throwApp_('SHEET_NOT_FOUND', 'ไม่พบชีต ' + name + ' (กรุณารีเฟรชหน้าเพื่อสร้างโครงสร้างฐานข้อมูล)');
    return s;
  }
  function headers(name) {
    if (!headerCache_[name]) {
      const s = sheet(name);
      const last = Math.max(s.getLastColumn(), 1);
      headerCache_[name] = s.getRange(1, 1, 1, last).getValues()[0].map(str_);
    }
    return headerCache_[name];
  }
  function coerce_(name, col, v) {
    if ((NUMERIC_COLS[name] || []).indexOf(col) >= 0) return num_(v, 0);
    if ((BOOLEAN_COLS[name] || []).indexOf(col) >= 0) return bool_(v);
    if (/(^|[a-z])Date$/.test(col) || col === 'date') return toIsoDate_(v);
    if (/At$/.test(col) || col === 'timestamp') return toIsoDateTime_(v);
    return v === null || v === undefined ? '' : (v instanceof Date ? toIsoDateTime_(v) : String(v));
  }
  function rowToObj_(name, h, row) {
    const o = {};
    for (let i = 0; i < h.length; i++) if (h[i]) o[h[i]] = coerce_(name, h[i], row[i]);
    return o;
  }
  function objToRow_(h, o) {
    return h.map(function (k) {
      const v = Object.prototype.hasOwnProperty.call(o, k) ? o[k] : '';
      return v === null || v === undefined ? '' : v;
    });
  }

  function readAll(name) {
    if (!cache_[name]) {
      const s = sheet(name), h = headers(name), last = s.getLastRow();
      if (last < 2) cache_[name] = [];
      else {
        cache_[name] = s.getRange(2, 1, last - 1, h.length).getValues()
          .filter(function (r) { return r.some(function (v) { return v !== '' && v !== null; }); })
          .map(function (r) { return rowToObj_(name, h, r); });
      }
    }
    return cache_[name].map(function (r) { return Object.assign({}, r); });
  }
  function invalidate(name) { if (name) delete cache_[name]; else Object.keys(cache_).forEach(function (k) { delete cache_[k]; }); }
  function find(name, pred) { return readAll(name).filter(pred); }
  function findOne(name, field, value) {
    const v = String(value);
    return readAll(name).filter(function (r) { return String(r[field]) === v; })[0] || null;
  }

  function append_raw(name, obj) {
    const s = sheet(name), h = headers(name);
    const row = objToRow_(h, obj);
    s.getRange(Math.max(s.getLastRow() + 1, 2), 1, 1, row.length).setValues([row]);
    invalidate(name);
    return obj;
  }
  function appendMany_raw(name, objs) {
    if (!objs.length) return;
    const s = sheet(name), h = headers(name);
    const rows = objs.map(function (o) { return objToRow_(h, o); });
    s.getRange(Math.max(s.getLastRow() + 1, 2), 1, rows.length, h.length).setValues(rows);
    invalidate(name);
  }
  function rowIndex_(name, field, value) {
    const s = sheet(name), h = headers(name), last = s.getLastRow();
    const col = h.indexOf(field);
    if (col < 0) throwApp_('HEADER_NOT_FOUND', 'ไม่พบคอลัมน์ ' + field);
    if (last < 2) return -1;
    const vals = s.getRange(2, col + 1, last - 1, 1).getValues();
    const v = String(value);
    for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === v) return i + 2;
    return -1;
  }
  function update_raw(name, field, value, patch) {
    const s = sheet(name), h = headers(name);
    const idx = rowIndex_(name, field, value);
    if (idx < 0) throwApp_('NOT_FOUND', 'ไม่พบข้อมูล ' + value);
    const row = s.getRange(idx, 1, 1, h.length).getValues()[0];
    Object.keys(patch).forEach(function (k) {
      const c = h.indexOf(k);
      if (c >= 0) row[c] = patch[k] === null || patch[k] === undefined ? '' : patch[k];
    });
    s.getRange(idx, 1, 1, h.length).setValues([row]);
    invalidate(name);
    return rowToObj_(name, h, row);
  }
  function remove_raw(name, field, value) {
    const idx = rowIndex_(name, field, value);
    if (idx < 0) return false;
    sheet(name).deleteRow(idx);
    invalidate(name);
    return true;
  }
  function removeWhere_raw(name, pred) {
    // delete from bottom to keep indexes valid
    const s = sheet(name), h = headers(name), last = s.getLastRow();
    if (last < 2) return 0;
    const vals = s.getRange(2, 1, last - 1, h.length).getValues();
    let n = 0;
    for (let i = vals.length - 1; i >= 0; i--) {
      if (pred(rowToObj_(name, h, vals[i]))) { s.deleteRow(i + 2); n++; }
    }
    invalidate(name);
    return n;
  }

  let lockDepth_ = 0;
  function lockRun_(fn, fresh) {
    if (lockDepth_ > 0) return fn();
    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    lockDepth_++;
    try { if (fresh) invalidate(); return fn(); } finally { lockDepth_--; lock.releaseLock(); }
  }
  /** Serialise a read-modify-write block across concurrent executions (re-entrant within one execution). */
  function withLock(fn) { return lockRun_(fn, true); }
  function append(name, obj) { return lockRun_(function () { return append_raw(name, obj); }, false); }
  function appendMany(name, objs) { return lockRun_(function () { return appendMany_raw(name, objs); }, false); }
  function update(name, field, value, patch) { return lockRun_(function () { return update_raw(name, field, value, patch); }, false); }
  function remove(name, field, value) { return lockRun_(function () { return remove_raw(name, field, value); }, false); }
  function removeWhere(name, pred) { return lockRun_(function () { return removeWhere_raw(name, pred); }, false); }

  function getConfig() {
    const map = {};
    readAll(SHEET.CONFIG).forEach(function (r) { if (r.key) map[r.key] = r.value; });
    DEFAULT_CONFIG.forEach(function (d) { if (!(d[0] in map)) map[d[0]] = d[1]; });
    return map;
  }
  function setConfig(key, value) {
    if (findOne(SHEET.CONFIG, 'key', key)) update(SHEET.CONFIG, 'key', key, { value: value });
    else append(SHEET.CONFIG, { key: key, value: value, description: '' });
  }

  function reset() { ss_ = null; invalidate(); Object.keys(headerCache_).forEach(function (k) { delete headerCache_[k]; }); }

  return Object.freeze({
    ss, sheet, headers, readAll, find, findOne, append, appendMany, update, remove, removeWhere,
    invalidate, withLock, getConfig, setConfig, reset, spreadsheetId: spreadsheetId_
  });
})();
