/*
 * 엑셀(.xlsx) 읽기 — 구글 시트에서 '다운로드 › Microsoft Excel' 로 받은 파일을 탭별 값으로.
 *  반환: [{ name, rows: [[값...]...], maxRows, maxCols }]  (값: 글자 · 숫자 · true/false · Date(한국 시각))
 */
async function sbReadXlsx(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), td = new TextDecoder('utf-8');
  // ── zip 목록 ──
  let eo = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error('엑셀(.xlsx) 파일이 아닙니다');
  const n = dv.getUint16(eo + 10, true); let p = dv.getUint32(eo + 16, true);
  const ent = {};
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    ent[td.decode(u8.subarray(p + 46, p + 46 + nl))] = { method: method, csize: csize, off: off };
    p += 46 + nl + el + cl;
  }
  const inflate = async function (data) {
    if (typeof DecompressionStream !== 'undefined') return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    return new Uint8Array(require('zlib').inflateRawSync(data)); // node 시험용
  };
  const read = async function (name) {
    const e = ent[name]; if (!e) return null;
    const nl = dv.getUint16(e.off + 26, true), el = dv.getUint16(e.off + 28, true), s = e.off + 30 + nl + el;
    const data = u8.subarray(s, s + e.csize);
    return td.decode(e.method === 0 ? data : await inflate(data));
  };
  const unesc = function (s) {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, function (m, k) { return k === 'lt' ? '<' : k === 'gt' ? '>' : k === 'amp' ? '&' : k === 'quot' ? '"' : k === 'apos' ? "'" : String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)); });
  };
  const xesc = function (s) { return s.indexOf('_x') < 0 ? s : s.replace(/_x([0-9A-Fa-f]{4})_/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); }); };
  const attr = function (s, k) { const m = new RegExp('(?:^|\\s)' + k + '="([^"]*)"').exec(s); return m ? unesc(m[1]) : null; };
  const texts = function (xml) { // <t>…</t> 들을 이어 붙임 (발음 표기 rPh 는 뺌)
    xml = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
    let o = ''; const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g; let m;
    while ((m = re.exec(xml))) o += m[1] || '';
    return xesc(unesc(o));
  };
  // ── 탭 목록 ──
  const wb = await read('xl/workbook.xml'), rels = await read('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('엑셀(.xlsx) 파일이 아닙니다');
  const target = {}; { const re = /<Relationship\b([^>]*)>/g; let m; while ((m = re.exec(rels))) target[attr(m[1], 'Id')] = attr(m[1], 'Target'); }
  const sheets = []; { const re = /<sheet\b([^>]*)>/g; let m; while ((m = re.exec(wb))) { const t = target[attr(m[1], 'r:id')] || ''; sheets.push({ name: attr(m[1], 'name'), path: t[0] === '/' ? t.slice(1) : 'xl/' + t }); } }
  // ── 공유 글자 ──
  const sst = []; { const x = await read('xl/sharedStrings.xml'); if (x) { const re = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g; let m; while ((m = re.exec(x))) sst.push(m[1] ? texts(m[1]) : ''); } }
  // ── 날짜 서식인 칸 찾기 ──
  const isDate = []; {
    const x = await read('xl/styles.xml') || '';
    const fmt = {}; { const re = /<numFmt\b([^>]*)>/g; let m; while ((m = re.exec(x))) fmt[attr(m[1], 'numFmtId')] = attr(m[1], 'formatCode') || ''; }
    const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(x);
    if (xfs) { const re = /<xf\b([^>]*)>/g; let m; while ((m = re.exec(xfs[1]))) {
      const id = +attr(m[1], 'numFmtId') || 0; let d = (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58);
      if (fmt[id] != null) { const code = fmt[id].replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, ''); d = /[ymdhs]/i.test(code) && !/General/i.test(code); }
      isDate.push(d);
    } }
  }
  const colNo = function (ref) { let c = 0; for (let i = 0; i < ref.length; i++) { const k = ref.charCodeAt(i); if (k >= 65 && k <= 90) c = c * 26 + k - 64; else break; } return c; };
  const out = [];
  for (const sh of sheets) {
    const x = await read(sh.path); if (x == null) continue;
    const rows = []; let maxC = 0, rn = 0;
    const dim = /<dimension\b[^>]*ref="[A-Z]+\d+(?::([A-Z]+)(\d+))?"/.exec(x);
    const rre = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g; let rm;
    while ((rm = rre.exec(x))) {
      const r = +attr(rm[1], 'r') || rn + 1; rn = r;
      if (!rm[2]) continue;
      const cells = []; let cn = 0;
      const cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm;
      while ((cm = cre.exec(rm[2]))) {
        const a = cm[1], ref = attr(a, 'r'), c = ref ? colNo(ref) : cn + 1; cn = c;
        if (cm[2] == null) continue;
        const t = attr(a, 't'), vm = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cm[2]); let v = '';
        if (t === 'inlineStr') v = texts(cm[2]);
        else if (!vm) continue;
        else if (t === 's') v = sst[+vm[1]] || '';
        else if (t === 'str' || t === 'e') v = xesc(unesc(vm[1]));
        else if (t === 'b') v = vm[1] === '1';
        else { const num = Number(vm[1]); v = isDate[+attr(a, 's') || 0] ? new Date(Math.round((num - 25569) * 86400000) - 9 * 3600000) : num; }
        if (v === '') continue;
        while (cells.length < c - 1) cells.push('');
        cells[c - 1] = v; if (c > maxC) maxC = c;
      }
      if (cells.length) { while (rows.length < r - 1) rows.push([]); rows[r - 1] = cells; }
    }
    out.push({ name: sh.name, rows: rows, maxRows: Math.max(1000, rows.length, dim && dim[2] ? +dim[2] : 0), maxCols: Math.max(26, maxC, dim && dim[1] ? colNo(dim[1]) : 0) });
  }
  return out;
}
