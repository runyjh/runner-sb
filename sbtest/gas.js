/*
 * 시험판 구글 서비스 대역 — 서버 코드(.gs)가 쓰는 SpreadsheetApp · Cache · Lock · Properties · Utilities 를
 * 메모리 저장소(store.js) 위에서 같은 모양으로 흉내 낸다. 서식·메모·드롭다운은 받기만 하고 버린다(화면이 읽지 않음).
 * 드라이브 파일 · 외부 통신 · 메일은 '시험판에서는 안 됨'.
 */
function sbMakeGas(S, opt) {
  opt = opt || {};
  const TZ_OFF = 9 * 3600000; // Asia/Seoul (서머타임 없음)
  const nope = function (what) { const e = new Error('시험판에서는 안 됩니다 (' + what + ')'); e.userMsg = e.message; e.code = 'SB_NA'; return e; };

  // ───── 바이트·해시 ─────
  const sb = function (x) { x &= 255; return x > 127 ? x - 256 : x; };
  const toU8 = function (v, cs) {
    if (typeof v === 'string') return new TextEncoder().encode(v);
    const u = new Uint8Array(v.length); for (let i = 0; i < v.length; i++) u[i] = v[i] & 255; return u;
  };
  const signed = function (u) { const a = new Array(u.length); for (let i = 0; i < u.length; i++) a[i] = sb(u[i]); return a; };
  const K256 = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const pad = function (u, big) {
    const n = u.length, len = ((n + 9 + 63) >> 6) << 6, p = new Uint8Array(len);
    p.set(u); p[n] = 0x80;
    const bits = n * 8, hi = Math.floor(bits / 4294967296), lo = bits >>> 0, dv = new DataView(p.buffer);
    if (big) { dv.setUint32(len - 8, hi); dv.setUint32(len - 4, lo); } else { dv.setUint32(len - 8, lo, true); dv.setUint32(len - 4, hi, true); }
    return p;
  };
  const sha256 = function (u) {
    const p = pad(u, true), dv = new DataView(p.buffer), w = new Uint32Array(64);
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    for (let o = 0; o < p.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const x = w[i - 15], y = w[i - 2]; w[i] = (w[i - 16] + (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + w[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10))) >>> 0; }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
        const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach(function (x, i) { ov.setUint32(i * 4, x); });
    return out;
  };
  const sha1 = function (u) {
    const p = pad(u, true), dv = new DataView(p.buffer), w = new Uint32Array(80);
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    for (let o = 0; o < p.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 80; i++) { const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = ((x << 1) | (x >>> 31)) >>> 0; }
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let i = 0; i < 80; i++) {
        const f = i < 20 ? ((b & c) | (~b & d)) : i < 40 ? (b ^ c ^ d) : i < 60 ? ((b & c) | (b & d) | (c & d)) : (b ^ c ^ d);
        const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6;
        const t = ((((a << 5) | (a >>> 27)) >>> 0) + (f >>> 0) + e + k + w[i]) >>> 0;
        e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = t;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    const out = new Uint8Array(20), ov = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach(function (x, i) { ov.setUint32(i * 4, x); });
    return out;
  };
  const md5 = function (u) {
    const p = pad(u, false), dv = new DataView(p.buffer);
    const s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    const K = new Uint32Array(64); for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    const M = new Uint32Array(16);
    for (let o = 0; o < p.length; o += 64) {
      for (let i = 0; i < 16; i++) M[i] = dv.getUint32(o + i * 4, true);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) >>> 0; A = D; D = C; C = B; B = (B + ((F << s[i]) | (F >>> (32 - s[i])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    const out = new Uint8Array(16), ov = new DataView(out.buffer);
    [a0, b0, c0, d0].forEach(function (x, i) { ov.setUint32(i * 4, x, true); });
    return out;
  };
  const hmac256 = function (msg, key) {
    let k = key; if (k.length > 64) k = sha256(k);
    const ip = new Uint8Array(64 + msg.length), op = new Uint8Array(96);
    for (let i = 0; i < 64; i++) { const b = i < k.length ? k[i] : 0; ip[i] = b ^ 0x36; op[i] = b ^ 0x5c; }
    ip.set(msg, 64); op.set(sha256(ip), 64);
    return sha256(op);
  };
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', B64W = B64.slice(0, 62) + '-_';
  const b64enc = function (u, abc) {
    let o = '';
    for (let i = 0; i < u.length; i += 3) {
      const a = u[i], b = i + 1 < u.length ? u[i + 1] : 0, c = i + 2 < u.length ? u[i + 2] : 0;
      o += abc[a >> 2] + abc[((a & 3) << 4) | (b >> 4)] + (i + 1 < u.length ? abc[((b & 15) << 2) | (c >> 6)] : '=') + (i + 2 < u.length ? abc[c & 63] : '=');
    }
    return o;
  };
  const b64dec = function (s) {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
    const n = Math.floor(s.length * 3 / 4), u = new Uint8Array(n); let j = 0, acc = 0, bits = 0;
    for (let i = 0; i < s.length; i++) { acc = (acc << 6) | B64.indexOf(s[i]); bits += 6; if (bits >= 8) { bits -= 8; u[j++] = (acc >> bits) & 255; } }
    return u.subarray(0, j);
  };
  const blob = function (data, mime, name) {
    const u = toU8(data == null ? '' : data);
    return { getBytes: function () { return signed(u); }, getDataAsString: function () { return new TextDecoder('utf-8').decode(u); }, getContentType: function () { return mime || null; }, getName: function () { return name || null; }, setName: function (n) { name = n; return this; } };
  };
  const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  const Utilities = {
    DigestAlgorithm: { MD5: 'MD5', SHA_1: 'SHA_1', SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8', US_ASCII: 'US_ASCII' },
    computeDigest: function (alg, v) { const u = toU8(v); return signed(alg === 'MD5' ? md5(u) : alg === 'SHA_1' ? sha1(u) : sha256(u)); },
    computeHmacSha256Signature: function (v, key) { return signed(hmac256(toU8(v), toU8(key))); },
    computeRsaSha256Signature: function () { throw nope('외부 서비스 서명'); },
    base64Encode: function (v) { return b64enc(toU8(v), B64); },
    base64EncodeWebSafe: function (v) { return b64enc(toU8(v), B64W); },
    base64Decode: function (s) { return signed(b64dec(s)); },
    base64DecodeWebSafe: function (s) { return signed(b64dec(s)); },
    newBlob: blob,
    getUuid: function () { return S.uuid(); },
    sleep: function () {},
    unzip: function () { throw nope('압축 파일 풀기'); },
    formatDate: function (d, tz, f) {
      const k = new Date(new Date(d).getTime() + TZ_OFF), y = k.getUTCFullYear();
      const map = { yyyy: String(y), yy: p2(y % 100), MM: p2(k.getUTCMonth() + 1), M: String(k.getUTCMonth() + 1), dd: p2(k.getUTCDate()), d: String(k.getUTCDate()), HH: p2(k.getUTCHours()), H: String(k.getUTCHours()), mm: p2(k.getUTCMinutes()), ss: p2(k.getUTCSeconds()), SSS: ('00' + k.getUTCMilliseconds()).slice(-3), E: '일월화수목금토'[k.getUTCDay()] };
      return String(f).replace(/'([^']*)'|yyyy|yy|MM|M|dd|d|HH|H|mm|ss|SSS|E+/g, function (m, q) { return q != null ? q : (map[m] != null ? map[m] : map.E); });
    }
  };

  // ───── 캐시 · 잠금 · 속성 ─────
  const CACHE = opt.cache || new Map();
  const cache = {
    get: function (k) { const e = CACHE.get(String(k)); if (!e) return null; if (e.x < Date.now()) { CACHE.delete(String(k)); return null; } return e.v; },
    put: function (k, v, sec) { if (CACHE.size > 20000) CACHE.forEach(function (e, kk) { if (e.x < Date.now()) CACHE.delete(kk); }); CACHE.set(String(k), { v: String(v), x: Date.now() + Math.min(+sec || 600, 21600) * 1000 }); },
    remove: function (k) { CACHE.delete(String(k)); },
    getAll: function (ks) { const o = {}; ks.forEach(function (k) { const v = cache.get(k); if (v !== null) o[k] = v; }); return o; },
    putAll: function (o, sec) { Object.keys(o).forEach(function (k) { cache.put(k, o[k], sec); }); },
    removeAll: function (ks) { ks.forEach(function (k) { CACHE.delete(String(k)); }); }
  };
  const lock = { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {}, hasLock: function () { return true; } };
  const props = {
    getProperties: function () { return Object.assign({}, S.props); },
    getProperty: function (k) { return Object.prototype.hasOwnProperty.call(S.props, k) ? S.props[k] : null; },
    setProperty: function (k, v) { S.props[k] = String(v); S.dirty.props.set(k, String(v)); return props; },
    setProperties: function (o, del) { if (del) props.deleteAllProperties(); Object.keys(o).forEach(function (k) { props.setProperty(k, o[k]); }); return props; },
    deleteProperty: function (k) { if (Object.prototype.hasOwnProperty.call(S.props, k)) { delete S.props[k]; S.dirty.props.set(k, null); } return props; },
    deleteAllProperties: function () { Object.keys(S.props).forEach(function (k) { props.deleteProperty(k); }); return props; },
    getKeys: function () { return Object.keys(S.props); }
  };

  // ───── 시트 ─────
  const a1 = function (s) { // 'B5' · 'A1:C3'
    const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(String(s).replace(/\$/g, '').toUpperCase());
    if (!m) throw new Error('범위를 알 수 없습니다: ' + s);
    const col = function (x) { let n = 0; for (let i = 0; i < x.length; i++) n = n * 26 + x.charCodeAt(i) - 64; return n; };
    const r = +m[2], c = col(m[1]);
    return [r, c, m[3] ? +m[4] - r + 1 : 1, m[3] ? col(m[3]) - c + 1 : 1];
  };
  const colName = function (n) { let s = ''; while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s; };
  const disp = function (v) { // 화면에 보이는 글자 (getDisplayValues)
    if (v instanceof Date) { const k = new Date(v.getTime() + TZ_OFF); const t = k.getUTCHours() || k.getUTCMinutes() || k.getUTCSeconds(); return k.getUTCFullYear() + '. ' + (k.getUTCMonth() + 1) + '. ' + k.getUTCDate() + (t ? ' ' + p2(k.getUTCHours()) + ':' + p2(k.getUTCMinutes()) + ':' + p2(k.getUTCSeconds()) : ''); }
    if (v === true) return 'TRUE'; if (v === false) return 'FALSE';
    return v == null ? '' : String(v);
  };
  const cellIn = function (v) { return v === undefined || v === null ? '' : v; };
  const Range = function (sh, r, c, nr, nc) {
    const t = sh._t, self = {};
    const same = function () { return self; };
    ['setNumberFormat', 'setNumberFormats', 'setBackground', 'setBackgrounds', 'setFontColor', 'setFontColors', 'setFontWeight', 'setFontWeights', 'setFontSize', 'setFontLine', 'setFontStyle', 'setNote', 'setNotes', 'clearNote', 'setDataValidation', 'setDataValidations', 'clearDataValidations',
      'setHorizontalAlignment', 'setVerticalAlignment', 'setWrap', 'setWrapStrategy', 'setBorder', 'insertCheckboxes', 'removeCheckboxes', 'merge', 'breakApart', 'activate', 'setFormula', 'setFormulas', 'clearFormat', 'setShowHyperlink', 'protect', 'setTextStyle', 'setFontFamily'].forEach(function (k) { self[k] = same; });
    self.getRow = function () { return r; }; self.getColumn = function () { return c; };
    self.getNumRows = function () { return nr; }; self.getNumColumns = function () { return nc; };
    self.getLastRow = function () { return r + nr - 1; }; self.getLastColumn = function () { return c + nc - 1; };
    self.getSheet = function () { return sh; };
    self.getA1Notation = function () { return colName(c) + r + (nr > 1 || nc > 1 ? ':' + colName(c + nc - 1) + (r + nr - 1) : ''); };
    self.getValues = function () {
      const out = new Array(nr), rows = t.rows;
      for (let i = 0; i < nr; i++) {
        const src = r - 1 + i < rows.length ? rows[r - 1 + i].c : null, o = new Array(nc);
        if (src) for (let j = 0; j < nc; j++) { const v = src[c - 1 + j]; o[j] = v === undefined || v === null ? '' : v; }
        else for (let j = 0; j < nc; j++) o[j] = '';
        out[i] = o;
      }
      return out;
    };
    self.getValue = function () { const row = t.rows[r - 1]; const v = row ? row.c[c - 1] : ''; return v === undefined || v === null ? '' : v; };
    self.getDisplayValues = function () { return self.getValues().map(function (x) { return x.map(disp); }); };
    self.getDisplayValue = function () { return disp(self.getValue()); };
    self.getNotes = function () { return self.getValues().map(function (x) { return x.map(function () { return ''; }); }); };
    self.getNote = function () { return ''; };
    self.getFormulas = self.getNotes; self.getFormula = self.getNote;
    self.isBlank = function () { return self.getValues().every(function (x) { return x.every(function (v) { return v === ''; }); }); };
    const put = function (get) {
      if (r + nr - 1 > t.maxRows || c + nc - 1 > t.maxCols) throw new Error('범위가 시트 크기를 벗어났습니다 (' + t.name + ' ' + self.getA1Notation() + ')');
      let any = false;
      for (let i = 0; i < nr && !any; i++) for (let j = 0; j < nc; j++) { const v = get(i, j); if (v !== '' && v != null) { any = true; break; } }
      if (any) S.need(t, r + nr - 1); // 빈 값만 쓸 때는 줄을 늘리지 않는다
      for (let i = 0; i < nr; i++) {
        const row = t.rows[r - 1 + i]; if (!row) break;
        const cc = row.c; let ch = false;
        for (let j = 0; j < nc; j++) {
          const v = cellIn(get(i, j)), k = c - 1 + j, old = k < cc.length ? cc[k] : '';
          if (old === v || (old instanceof Date && v instanceof Date && old.getTime() === v.getTime())) continue;
          if (v === '' && k >= cc.length) continue;
          while (cc.length < k) cc.push('');
          cc[k] = v; ch = true;
        }
        if (ch) { let n = cc.length; while (n > 0 && cc[n - 1] === '') n--; cc.length = n; S.markRow(t, row); }
      }
      t.lc = -1;
    };
    self.setValues = function (vals) {
      if (!Array.isArray(vals) || vals.length !== nr || (nr && (!Array.isArray(vals[0]) || vals[0].length !== nc))) throw new Error('데이터의 행·열 수가 범위와 맞지 않습니다 (' + t.name + ' · 범위 ' + nr + '×' + nc + ' · 데이터 ' + (vals && vals.length) + '×' + (vals && vals[0] && vals[0].length) + ')');
      put(function (i, j) { return vals[i][j]; }); return self;
    };
    self.setValue = function (v) { put(function () { return v; }); return self; };
    self.clearContent = function () { put(function () { return ''; }); return self; };
    self.clear = self.clearContent;
    self.offset = function (dr, dc, n1, n2) { return Range(sh, r + dr, c + dc, n1 || nr, n2 || nc); };
    self.getCell = function (i, j) { return Range(sh, r + i - 1, c + j - 1, 1, 1); };
    self.sort = function (spec) {
      const specs = (Array.isArray(spec) ? spec : [spec]).map(function (x) { return typeof x === 'object' ? { col: x.column, asc: x.ascending !== false } : { col: x, asc: true }; });
      const vals = self.getValues();
      const rank = function (v) { return v === '' ? 3 : typeof v === 'number' || v instanceof Date ? 0 : typeof v === 'string' ? 1 : 2; };
      vals.sort(function (a, b) {
        for (let i = 0; i < specs.length; i++) {
          const x = a[specs[i].col - c], y = b[specs[i].col - c];
          if (x === '' && y !== '') return 1; if (y === '' && x !== '') return -1; // 빈 칸은 항상 아래
          const rx = rank(x), ry = rank(y); let d = rx - ry;
          if (!d) d = x < y ? -1 : x > y ? 1 : 0;
          if (d) return specs[i].asc ? d : -d;
        }
        return 0;
      });
      return self.setValues(vals);
    };
    self.createTextFinder = function (text) {
      let entire = false, mcase = false;
      const f = {
        matchEntireCell: function (b) { entire = !!b; return f; }, matchCase: function (b) { mcase = !!b; return f; }, useRegularExpression: function () { return f; }, matchFormulaText: function () { return f; },
        findAll: function () {
          const want = mcase ? String(text) : String(text).toLowerCase(), out = [], rows = t.rows, end = Math.min(r + nr - 1, rows.length);
          for (let i = r; i <= end; i++) {
            const cc = rows[i - 1].c;
            for (let j = c; j < c + nc; j++) {
              let v = cc[j - 1]; if (v === undefined || v === '' || v === null) continue;
              v = mcase ? disp(v) : disp(v).toLowerCase();
              if (entire ? v === want : v.indexOf(want) >= 0) out.push(Range(sh, i, j, 1, 1));
            }
          }
          return out;
        },
        findNext: function () {
          const want = mcase ? String(text) : String(text).toLowerCase(), rows = t.rows, end = Math.min(r + nr - 1, rows.length);
          for (let i = r; i <= end; i++) {
            const cc = rows[i - 1].c;
            for (let j = c; j < c + nc; j++) {
              let v = cc[j - 1]; if (v === undefined || v === '' || v === null) continue;
              v = typeof v === 'string' ? v : disp(v); if (!mcase) v = v.toLowerCase();
              if (entire ? v === want : v.indexOf(want) >= 0) return Range(sh, i, j, 1, 1);
            }
          }
          return null;
        }
      };
      return f;
    };
    return self;
  };
  const Sheet = function (book, t) {
    if (t._sh) return t._sh;
    const sh = { _t: t };
    const same = function () { return sh; };
    ['setFrozenRows', 'setFrozenColumns', 'setColumnWidth', 'setColumnWidths', 'setRowHeight', 'setRowHeights', 'hideColumns', 'showColumns', 'hideSheet', 'showSheet', 'setTabColor', 'autoResizeColumns', 'autoResizeColumn', 'activate', 'clearNotes', 'clearFormats', 'setHiddenGridlines', 'hideColumn', 'hideRows', 'showRows'].forEach(function (k) { sh[k] = same; });
    sh.getName = function () { return t.name; };
    sh.setName = function (n) { t.name = String(n); S.markTab(t); return sh; };
    sh.getSheetId = function () { return t.uid; };
    sh.getParent = function () { return Book(book); };
    sh.getLastRow = function () { return S.lastRow(t); };
    sh.getLastColumn = function () { return S.lastCol(t); };
    sh.getMaxRows = function () { return t.maxRows; };
    sh.getMaxColumns = function () { return t.maxCols; };
    sh.getFrozenRows = function () { return 1; }; sh.getFrozenColumns = function () { return 0; };
    sh.getRange = function (r, c, nr, nc) {
      if (typeof r === 'string') { const x = a1(r); return Range(sh, x[0], x[1], x[2], x[3]); }
      nr = nr === undefined ? 1 : nr; nc = nc === undefined ? 1 : nc;
      if (!(r >= 1) || !(c >= 1) || !(nr >= 1) || !(nc >= 1)) throw new Error('범위의 좌표나 크기가 잘못되었습니다 (' + t.name + ' ' + [r, c, nr, nc].join(',') + ')');
      return Range(sh, r, c, nr, nc);
    };
    sh.getDataRange = function () { return Range(sh, 1, 1, Math.max(S.lastRow(t), 1), Math.max(S.lastCol(t), 1)); };
    sh.appendRow = function (arr) {
      const n = S.lastRow(t) + 1;
      if (n > t.maxRows) { t.maxRows = n; S.markTab(t); }
      if (arr.length > t.maxCols) { t.maxCols = arr.length; S.markTab(t); }
      Range(sh, n, 1, 1, Math.max(arr.length, 1)).setValues([arr.length ? arr : ['']]);
      return sh;
    };
    sh.insertRowsAfter = function (at, n) { n = n || 1; if (at < t.rows.length) S.insert(t, at + 1, n); t.maxRows += n; S.markTab(t); return sh; };
    sh.insertRowsBefore = function (at, n) { n = n || 1; S.insert(t, at, n); t.maxRows += n; S.markTab(t); return sh; };
    sh.insertRowAfter = function (at) { return sh.insertRowsAfter(at, 1); };
    sh.insertRowBefore = function (at) { return sh.insertRowsBefore(at, 1); };
    sh.insertRows = function (at, n) { return sh.insertRowsBefore(at, n || 1); };
    sh.deleteRows = function (at, n) {
      n = n || 1;
      if (at < 1 || at + n - 1 > t.maxRows) throw new Error('지울 줄이 시트 범위를 벗어났습니다 (' + t.name + ')');
      if (n >= t.maxRows) throw new Error('시트의 모든 행을 삭제할 수 없습니다 (' + t.name + ')');
      if (at <= t.rows.length) S.remove(t, at, Math.min(n, t.rows.length - at + 1));
      t.maxRows -= n; S.markTab(t); return sh;
    };
    sh.deleteRow = function (at) { return sh.deleteRows(at, 1); };
    const colIns = function (at0, n) { // at0: 0부터, 그 자리 앞에 n칸
      t.rows.forEach(function (row) { if (row.c.length > at0) { const add = []; for (let i = 0; i < n; i++) add.push(''); row.c.splice.apply(row.c, [at0, 0].concat(add)); S.markRow(t, row); } });
      t.maxCols += n; t.lc = -1; S.markTab(t);
    };
    sh.insertColumnsAfter = function (at, n) { colIns(at, n || 1); return sh; };
    sh.insertColumnAfter = function (at) { colIns(at, 1); return sh; };
    sh.insertColumnsBefore = function (at, n) { colIns(at - 1, n || 1); return sh; };
    sh.insertColumnBefore = function (at) { colIns(at - 1, 1); return sh; };
    sh.insertColumns = function (at, n) { colIns(at - 1, n || 1); return sh; };
    sh.deleteColumns = function (at, n) {
      n = n || 1;
      t.rows.forEach(function (row) { if (row.c.length >= at) { row.c.splice(at - 1, n); let k = row.c.length; while (k > 0 && row.c[k - 1] === '') k--; row.c.length = k; S.markRow(t, row); } });
      t.maxCols = Math.max(1, t.maxCols - n); t.lc = -1; S.markTab(t); return sh;
    };
    sh.deleteColumn = function (at) { return sh.deleteColumns(at, 1); };
    sh.clearContents = function () { t.rows.forEach(function (row) { if (row.c.length) { row.c = []; S.markRow(t, row); } }); t.lc = -1; return sh; };
    sh.clear = sh.clearContents;
    sh.copyTo = function (book2) {
      const b2 = book2._b, t2 = S.newTab(b2, t.name + '의 사본');
      t2.maxRows = t.maxRows; t2.maxCols = t.maxCols;
      t.rows.forEach(function (row) { const r2 = { id: S.uuid(), pos: row.pos, c: row.c.slice(), fresh: true }; t2.rows.push(r2); S.markRow(t2, r2); });
      return Sheet(b2, t2);
    };
    sh.getProtections = function () { return []; };
    sh.getFilter = function () { return null; };
    return (t._sh = sh);
  };
  const Book = function (b) {
    if (b._bk) return b._bk;
    const bk = { _b: b };
    bk.getId = function () { return b.id; };
    bk.getName = function () { return b.name; };
    bk.getUrl = function () { return 'https://supabase.com/dashboard/project/' + (opt.ref || '') + '/editor?book=' + encodeURIComponent(b.id); };
    bk.getSheetByName = function (n) { for (let i = 0; i < b.tabs.length; i++) if (b.tabs[i].name === n) return Sheet(b, b.tabs[i]); return null; };
    bk.getSheets = function () { return b.tabs.map(function (t) { return Sheet(b, t); }); };
    bk.insertSheet = function (n) {
      if (n == null) { let i = b.tabs.length + 1; while (bk.getSheetByName('시트' + i)) i++; n = '시트' + i; }
      if (bk.getSheetByName(n)) throw new Error('이름이 "' + n + '"인 시트가 이미 있습니다.');
      return Sheet(b, S.newTab(b, String(n)));
    };
    bk.deleteSheet = function (sh) { if (b.tabs.length <= 1) throw new Error('마지막 시트는 지울 수 없습니다.'); S.dropTab(b, sh._t); };
    bk.setSpreadsheetTimeZone = function () { return bk; };
    bk.getSpreadsheetTimeZone = function () { return 'Asia/Seoul'; };
    bk.getRange = function (s) { const m = /^'?([^'!]+)'?!(.+)$/.exec(String(s)); return m ? bk.getSheetByName(m[1]).getRange(m[2]) : bk.getSheets()[0].getRange(s); };
    bk.toast = function () {}; bk.rename = function (n) { b.name = n; return bk; };
    return (b._bk = bk);
  };
  const dv = function () { const o = {}; ['requireValueInList', 'requireValueInRange', 'requireCheckbox', 'requireNumberBetween', 'requireDate', 'requireTextMatchesPattern', 'setAllowInvalid', 'setHelpText'].forEach(function (k) { o[k] = function () { return o; }; }); o.build = function () { return {}; }; return o; };
  const SpreadsheetApp = {
    openById: function (id) { const b = S.books[id]; if (!b) throw new Error('파일을 찾을 수 없습니다: ' + id); return Book(b); },
    create: function (name) { const id = 'bk_' + S.uuid().replace(/-/g, '').slice(0, 16); const b = S.book(id, name); S.newTab(b, '시트1'); return Book(b); },
    flush: function () {},
    newDataValidation: dv,
    getActiveSpreadsheet: function () { return null; },
    getUi: function () { throw nope('시트 메뉴'); }
  };
  const drive = new Proxy({}, { get: function (o, k) { return function () { throw nope('드라이브 파일'); }; } });
  const trig = function () { const o = {}; ['timeBased', 'everyDays', 'everyMinutes', 'everyHours', 'atHour', 'nearMinute', 'forSpreadsheet', 'onEdit', 'onChange', 'onOpen', 'inTimezone', 'onWeekDay', 'everyWeeks', 'after', 'at'].forEach(function (k) { o[k] = function () { return o; }; }); o.create = function () { return {}; }; return o; };
  const textOut = function (s) { const o = { _text: String(s), setMimeType: function () { return o; }, getContent: function () { return o._text; } }; return o; };
  return {
    SpreadsheetApp: SpreadsheetApp, Utilities: Utilities,
    CacheService: { getScriptCache: function () { return cache; }, getUserCache: function () { return cache; } },
    LockService: { getScriptLock: function () { return lock; }, getDocumentLock: function () { return lock; } },
    PropertiesService: { getScriptProperties: function () { return props; } },
    DriveApp: drive,
    UrlFetchApp: { fetch: function () { throw nope('외부 서비스 연결'); }, fetchAll: function () { throw nope('외부 서비스 연결'); } },
    ScriptApp: { getProjectTriggers: function () { return []; }, newTrigger: trig, deleteTrigger: function () {}, getService: function () { return { getUrl: function () { return ''; } }; }, getScriptId: function () { return 'sb-test'; } },
    Session: { getActiveUser: function () { return { getEmail: function () { return ''; } }; }, getEffectiveUser: function () { return { getEmail: function () { return 'sb-test'; } }; }, getScriptTimeZone: function () { return 'Asia/Seoul'; } },
    HtmlService: { createHtmlOutput: function (h) { const o = { _html: h, setTitle: function () { return o; }, addMetaTag: function () { return o; }, setXFrameOptionsMode: function () { return o; } }; return o; }, XFrameOptionsMode: {} },
    ContentService: { createTextOutput: textOut, MimeType: { JSON: 'json', TEXT: 'text' } },
    Logger: { log: function () {} },
    MailApp: { sendEmail: function () { throw nope('메일 보내기'); }, getRemainingDailyQuota: function () { return 0; } },
    GmailApp: new Proxy({}, { get: function () { return function () { throw nope('메일'); }; } }),
    Date: opt.Date || Date
  };
}
if (typeof module !== 'undefined') module.exports = { sbMakeGas: sbMakeGas };
