/**
 * eLeave+ : File: Utils.gs
 * Purpose: Pure helpers (dates, ids, hashing, validation, API envelopes).
 */
const TZ = 'Asia/Bangkok';

class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
function throwApp_(code, message) { throw new AppError(code, message); }

function ok_(data) { return { success: true, data: data === undefined ? null : data }; }
function fail_(error) {
  const isApp = error && error.name === 'AppError';
  if (!isApp) console.error(error && error.stack ? error.stack : String(error));
  return {
    success: false,
    error: {
      code: isApp ? error.code : 'SERVER_ERROR',
      message: isApp ? error.message : 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง'
    }
  };
}

/* ---------- strings ---------- */
function str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function bool_(v) {
  if (v === true) return true;
  const s = String(v === null || v === undefined ? '' : v).trim().toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES';
}
function num_(v, fallback) {
  if (v === '' || v === null || v === undefined) return fallback === undefined ? 0 : fallback;
  const n = Number(v);
  return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
}
function requireStr_(v, label, max) {
  const s = str_(v);
  if (!s) throwApp_('VALIDATION', 'กรุณาระบุ' + label);
  if (max && s.length > max) throwApp_('VALIDATION', label + 'ยาวเกินกำหนด (สูงสุด ' + max + ' ตัวอักษร)');
  return s;
}
function isEmail_(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

/* ---------- dates (ISO yyyy-MM-dd, arithmetic in UTC) ---------- */
function toIsoDate_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = str_(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
}
function toIsoDateTime_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm:ss');
  const s = str_(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s : '';
}
function nowIso_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function todayIso_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function parseDate_(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // reject overflow such as 2026-02-31
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return d;
}
function fmtDate_(d) {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
function addDays_(iso, n) {
  const d = parseDate_(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fmtDate_(d);
}
function diffDays_(fromIso, toIso) {
  return Math.round((parseDate_(toIso).getTime() - parseDate_(fromIso).getTime()) / 86400000);
}
function weekday_(iso) { return parseDate_(iso).getUTCDay(); }
function eachDate_(fromIso, toIso) {
  const out = [];
  const total = diffDays_(fromIso, toIso);
  for (let i = 0; i <= total; i++) out.push(addDays_(fromIso, i));
  return out;
}

/* ---------- ids & crypto ---------- */
function makeId_(prefix) {
  return prefix + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
}
function toHex_(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function sha256Hex_(text) {
  return toHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8));
}
function randomSalt_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
/** Salted, iterated SHA-256 (1,000 rounds). */
function hashPassword_(password, salt) {
  let h = sha256Hex_(salt + ':' + password);
  for (let i = 0; i < 1000; i++) h = sha256Hex_(h + salt);
  return h;
}
function safeEqual_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function csv_(v) { return String(v === null || v === undefined ? '' : v).split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
function round2_(n) { return Math.round(n * 100) / 100; }
