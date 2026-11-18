/*
 * 시험판 저장소 — 시트(파일 › 탭 › 줄)를 메모리에 올려 두고, 바뀐 줄만 모아 수파베이스로 보낸다.
 *  book = { id, name, tabs: [tab] }
 *  tab  = { book, name, ord, maxRows, maxCols, rows: [row] }   rows[i] = i+1 번째 줄
 *  row  = { id, pos, c: [칸 값...] }   (빈 칸은 '' · 끝쪽 빈 칸은 잘라 둠)
 */
function sbMakeStore() {
  const S = { books: {}, props: {}, dirty: { rows: new Map(), tabs: new Map(), props: new Map() }, seq: 0 };
  const uuid = function () {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    const h = function (n) { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16); return s; };
    return h(8) + '-' + h(4) + '-4' + h(3) + '-a' + h(3) + '-' + h(12);
  };
  S.uuid = uuid;
  S.book = function (id, name) { return S.books[id] || (S.books[id] = { id: id, name: name || id, tabs: [] }); };
  S.tabKey = function (t) { return t.book + '\u0001' + t.name; };
  S.onTouch = null; // 서버: 이번 실행에서 손댄 탭을 기억 (되돌리기용)
  const touch = function (t) { if (S.onTouch) S.onTouch(t); };
  S.markTab = function (t) { touch(t); S.dirty.tabs.set(t.uid, t); };
  S.markRow = function (t, r) { touch(t); r.t = t; S.dirty.rows.set(r.id, r); };
  S.dropRow = function (r) { if (r.fresh && S.dirty.rows.has(r.id)) { S.dirty.rows.delete(r.id); return; } S.dirty.rows.set(r.id, { id: r.id, gone: true }); };
  S.newTab = function (book, name, ord) {
    const t = { uid: S.uuid(), book: book.id, name: name, ord: ord == null ? book.tabs.length : ord, maxRows: 1000, maxCols: 26, rows: [], lc: -1, isNew: true };
    book.tabs.push(t); S.markTab(t); return t;
  };
  S.dropTab = function (book, t) {
    touch(t);
    const i = book.tabs.indexOf(t); if (i >= 0) book.tabs.splice(i, 1);
    S.dirty.rows.forEach(function (r, id) { if (r.t === t) S.dirty.rows.delete(id); }); // 줄은 탭과 함께 지워진다 (DB cascade)
    S.dirty.tabs.set(t.uid, { uid: t.uid, gone: true });
  };
  /** n 번째 줄(1부터)까지 줄 객체가 있게 한다 */
  S.need = function (t, n) {
    while (t.rows.length < n) {
      const last = t.rows[t.rows.length - 1];
      const r = { id: S.uuid(), pos: last ? last.pos + 1024 : 1024, c: [], fresh: true };
      t.rows.push(r); S.markRow(t, r);
    }
  };
  /** at 번째 줄 앞에 빈 줄 n개 (at 은 1부터) */
  S.insert = function (t, at, n) {
    if (at > t.rows.length) return; // 내용 아래쪽 → 줄 객체가 아직 없음
    const prev = at >= 2 ? t.rows[at - 2].pos : 0, next = t.rows[at - 1].pos;
    const step = (next - prev) / (n + 1), add = [];
    if (step < 1e-6) { // 사이가 너무 좁으면 그 탭 전체 번호를 다시 매긴다
      for (let i = 0; i < n; i++) add.push({ id: S.uuid(), pos: 0, c: [], fresh: true });
      t.rows.splice.apply(t.rows, [at - 1, 0].concat(add));
      t.rows.forEach(function (r, i) { r.pos = (i + 1) * 1024; S.markRow(t, r); });
      return;
    }
    for (let i = 0; i < n; i++) { const r = { id: S.uuid(), pos: prev + step * (i + 1), c: [], fresh: true }; add.push(r); S.markRow(t, r); }
    t.rows.splice.apply(t.rows, [at - 1, 0].concat(add));
  };
  S.remove = function (t, at, n) {
    touch(t);
    const gone = t.rows.splice(at - 1, n);
    gone.forEach(function (r) { S.dropRow(r); });
    t.lc = -1;
  };
  S.lastRow = function (t) {
    let i = t.rows.length;
    while (i > 0) { const c = t.rows[i - 1].c; let any = false; for (let k = 0; k < c.length; k++) if (c[k] !== '' && c[k] != null) { any = true; break; } if (any) break; i--; }
    return i;
  };
  S.lastCol = function (t) {
    if (t.lc >= 0) return t.lc;
    let m = 0;
    for (let i = 0; i < t.rows.length; i++) { const c = t.rows[i].c; let k = c.length; while (k > m && (c[k - 1] === '' || c[k - 1] == null)) k--; if (k > m) m = k; }
    return (t.lc = m);
  };
  // ── 보내기·받기 모양 ──
  const enc = function (v) { return v instanceof Date ? { $d: v.getTime() } : (v == null ? '' : v); };
  const dec = function (v) { return v && typeof v === 'object' && v.$d != null ? new (S.DateCls || Date)(v.$d) : v; };
  S.encCells = function (c) { let n = c.length; while (n > 0 && (c[n - 1] === '' || c[n - 1] == null)) n--; const o = new Array(n); for (let i = 0; i < n; i++) o[i] = enc(c[i]); return o; };
  S.decCells = function (c) { for (let i = 0; i < c.length; i++) { const v = c[i]; if (v && typeof v === 'object') c[i] = dec(v); else if (v == null) c[i] = ''; } return c; };
  /** 바뀐 것 꺼내기 (보낼 묶음). 없으면 null */
  S.takeDirty = function () {
    const d = S.dirty;
    if (!d.rows.size && !d.tabs.size && !d.props.size) return null;
    const ops = { rows: [], delRows: [], tabs: [], delTabs: [], props: [], delProps: [] };
    d.tabs.forEach(function (t) { if (t.gone) ops.delTabs.push(t.uid); else ops.tabs.push({ uid: t.uid, book: t.book, tab: t.name, ord: t.ord, max_rows: t.maxRows, max_cols: t.maxCols }); });
    d.rows.forEach(function (r) { if (r.gone) ops.delRows.push(r.id); else { ops.rows.push({ id: r.id, tab_uid: r.t.uid, pos: r.pos, cells: S.encCells(r.c) }); r.fresh = false; } });
    d.props.forEach(function (v, k) { if (v === null) ops.delProps.push(k); else ops.props.push({ k: k, v: v }); });
    S.dirty = { rows: new Map(), tabs: new Map(), props: new Map() };
    return ops;
  };
  /** 수파베이스에서 받은 것 올리기: { tabs:[{uid,book,tab,ord,max_rows,max_cols}], rows:[[tab_uid,id,pos,cells]...] (pos 순) } */
  S.load = function (data, bookNames) {
    const byUid = {};
    (data.tabs || []).slice().sort(function (a, b) { return a.ord - b.ord; }).forEach(function (x) {
      const b = S.book(x.book, (bookNames || {})[x.book]);
      const t = { uid: x.uid, book: x.book, name: x.tab, ord: x.ord, maxRows: x.max_rows || 1000, maxCols: x.max_cols || 26, rows: [], lc: -1 };
      b.tabs.push(t); byUid[x.uid] = t;
    });
    (data.rows || []).forEach(function (r) { const t = byUid[r[0]]; if (t) t.rows.push({ id: r[1], pos: r[2], c: S.decCells(r[3] || []) }); });
    S.props = Object.assign(S.props, data.props || {});
  };
  return S;
}
if (typeof module !== 'undefined') module.exports = { sbMakeStore: sbMakeStore };
