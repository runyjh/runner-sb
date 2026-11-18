/* 시험용 가짜 DB — sb_sync · sb_commit 과 같은 규칙 (순서 번호 ver · 잠금 · 충돌) */
function makeFakeDb(opt) {
  opt = opt || {};
  const DB = { seq: 0, tabs: new Map(), rows: new Map(), props: new Map(), gone: [], cache: new Map(), files: new Map(), store: new Map(), calls: [], lag: opt.lag || 0 };
  const nv = () => ++DB.seq;
  const dmax = (m) => [...m.values()].reduce((a, x) => Math.max(a, x.ver || 0), 0);
  const head = () => Math.max(dmax(DB.tabs), dmax(DB.rows), dmax(DB.props), dmax(DB.files), DB.gone.reduce((a, g) => Math.max(a, g.ver), 0));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const wait = () => new Promise((ok) => setTimeout(ok, DB.lag));
  let lock = Promise.resolve();
  const db = {
    async cachePut(list) { await wait(); DB.calls.push('cache ' + list.length); list.forEach((x) => DB.cache.set(x.k, { v: x.v, exp: x.exp, ver: nv() })); },
    async sync(ver, cver, loaded, want) {
      await wait(); DB.calls.push('sync ' + (ver == null ? 'null' : ver) + ' L' + loaded.length + ' W' + want.length);
      const L = new Set(loaded), W = new Set(want);
      const tabs = [...DB.tabs.values()].filter((t) => ver == null || t.ver > ver).map((t) => [t.uid, t.book, t.tab, t.ord, t.max_rows, t.max_cols]);
      const gone = ver == null ? [] : DB.gone.filter((g) => g.ver > ver).map((g) => [g.kind, g.id]);
      const props = {}; DB.props.forEach((p, k) => { if (ver == null || p.ver > ver) props[k] = p.v; });
      const rows = [...DB.rows.values()].filter((r) => (ver != null && L.has(r.tab_uid) && r.ver > ver) || W.has(r.tab_uid)).sort((a, b) => (a.tab_uid < b.tab_uid ? -1 : a.tab_uid > b.tab_uid ? 1 : a.pos - b.pos)).map((r) => [r.tab_uid, r.id, r.pos, clone(r.cells)]);
      const cache = [...DB.cache.entries()].filter(([k, c]) => (cver == null ? c.v != null && c.exp > Date.now() : c.ver > cver)).map(([k, c]) => [k, c.v, c.exp]);
      const files = [...DB.files.values()].filter((x) => ver == null || x.ver > ver).map((x) => [x.id, x.name, x.mime, x.size, x.parent, x.folder, x.trashed, x.stored, x.created, x.updated]);
      return clone({ head: head(), chead: dmax(DB.cache), tabs, gone, props, rows, cache, files });
    },
    async commit(ops, base) {
      const run = async () => {
        await wait(); DB.calls.push('commit ' + base);
        const newer = (m) => [...m.values()].some((x) => x.ver > base);
        if (newer(DB.rows) || newer(DB.tabs) || newer(DB.props) || newer(DB.files) || DB.gone.some((g) => g.ver > base)) return { conflict: true };
        (ops.files || []).forEach((x) => { const o = DB.files.get(x.id); DB.files.set(x.id, Object.assign({}, x, { created: o ? o.created : Date.now(), updated: Date.now(), ver: nv() })); });
        ops = clone(ops);
        ops.delTabs.forEach((u) => { if (DB.tabs.delete(u)) { DB.gone.push({ kind: 'tab', id: u, ver: nv() }); [...DB.rows.values()].forEach((r) => { if (r.tab_uid === u) DB.rows.delete(r.id); }); } });
        ops.tabs.forEach((t) => DB.tabs.set(t.uid, Object.assign({}, t, { ver: nv() })));
        ops.delRows.forEach((id) => { if (DB.rows.delete(id)) DB.gone.push({ kind: 'row', id, ver: nv() }); });
        ops.rows.forEach((r) => { if (DB.tabs.has(r.tab_uid)) DB.rows.set(r.id, Object.assign({}, r, { ver: nv() })); });
        ops.delProps.forEach((k) => { if (DB.props.delete(k)) DB.gone.push({ kind: 'prop', id: k, ver: nv() }); });
        ops.props.forEach((p) => DB.props.set(p.k, { v: p.v, ver: nv() }));
        return { head: head() };
      };
      const p = lock.then(run); lock = p.catch(() => {}); return p;
    },
    storage: { get: async (id) => { await wait(); DB.calls.push('get ' + id.slice(0, 6)); return DB.store.has(id) ? new Uint8Array(DB.store.get(id)) : null; }, put: async (id, b) => { await wait(); DB.calls.push('put ' + id.slice(0, 6) + ' ' + b.length); DB.store.set(id, new Uint8Array(b)); } },
    /** 드라이브에서 옮긴 파일처럼 넣기 */
    seedFile(rec, bytes) { DB.files.set(rec.id, Object.assign({ mime: '', size: bytes ? bytes.length : 0, parent: null, folder: false, trashed: false, stored: !!bytes, created: Date.now(), updated: Date.now() }, rec, { ver: nv() })); if (bytes) DB.store.set(rec.id, new Uint8Array(bytes)); },
    /** 시험 자료 넣기: store.js 의 S.books 그대로 */
    seed(S) {
      Object.keys(S.books).forEach((b) => S.books[b].tabs.forEach((t) => {
        DB.tabs.set(t.uid, { uid: t.uid, book: b, tab: t.name, ord: t.ord, max_rows: t.maxRows, max_cols: t.maxCols, ver: nv() });
        t.rows.forEach((r) => DB.rows.set(r.id, { id: r.id, tab_uid: t.uid, pos: r.pos, cells: S.encCells(r.c), ver: nv() }));
      }));
      Object.keys(S.props).forEach((k) => DB.props.set(k, { v: S.props[k], ver: nv() }));
    },
    /** 손으로 표를 고친 것처럼 */
    manualEdit(tabName, find, col, value) { const t = [...DB.tabs.values()].find((x) => x.tab === tabName); const r = [...DB.rows.values()].find((x) => x.tab_uid === t.uid && x.cells.includes(find)); r.cells[col] = value; r.ver = nv(); return r; },
    DB
  };
  return db;
}
module.exports = { makeFakeDb };
