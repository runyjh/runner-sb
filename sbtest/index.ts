// @ts-nocheck
// 러너 올인원 수파베이스판 서버 함수 (api) — 지금 Apps Script doPost 자리
//  - 서버 코드 묶음(engine.js)은 runner-sb 깃허브 페이지에서 받아, 지문(SHA-256)이 맞을 때만 돌린다
//  - 표는 이 함수만 읽고 쓴다 (DB 직접 연결). 화면은 표에 직접 닿지 않는다
//  - 로그인 확인은 이 함수가 직접 한다 (수파베이스 로그인 + 사용 승인 sb_allow)
import postgres from 'npm:postgres@3.4.7';

const ENGINE_URL = 'https://runyjh.github.io/runner-sb/engine.js';
const ENGINE_SHA256 = '8176cad96bf6ce1fa810e5eef5fe3dbc4e48500d7d55e379a715b15cb64ce0dd';
const ENGINE_OLD: string[] = []; // 올리는 동안 잠깐 같이 받아 주는 이전 묶음 지문
const ORIGINS = ['https://runyjh.github.io'];
const SB_URL = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 3, prepare: false, idle_timeout: 30, connect_timeout: 10 });
const arr = (a: string[]) => '{' + (a || []).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).join(',') + '}';

const db = {
  sync: async (...a: any[]) => a.length === 3
    ? (await sql`select public.sb_sync(${a[0]}::bigint, ${arr(a[1])}::uuid[], ${arr(a[2])}::uuid[]) as j`)[0].j // 이전 묶음
    : (await sql`select public.sb_sync2(${a[0]}::bigint, ${a[1]}::bigint, ${arr(a[2])}::uuid[], ${arr(a[3])}::uuid[]) as j`)[0].j,
  cachePut: async (list: unknown[]) => (await sql`select public.sb_cache_put(${sql.json(list as never)}) as v`)[0].v,
  commit: async (ops: unknown, base: number) => (await sql`select public.sb_commit(${sql.json(ops as never)}, ${base}::bigint) as j`)[0].j,
  impBegin: async (books: string[]) => { await sql.begin(async (tx) => { await tx`select pg_advisory_xact_lock(727001)`; await tx`delete from public.sb_tabs where book = any(${'{' + books.filter((b) => /^\w+$/.test(b)).join(',') + '}'}::text[])`; }); },
  impTabs: async (tabs: Record<string, unknown>[]) => { if (tabs.length) await sql`insert into public.sb_tabs (uid, book, tab, ord, max_rows, max_cols) select x.uid, x.book, x.tab, x.ord, x.max_rows, x.max_cols from jsonb_to_recordset(${sql.json(tabs as never)}) as x (uid uuid, book text, tab text, ord int, max_rows int, max_cols int)`; },
  impRows: async (rows: unknown[]) => rows.length ? (await sql`select public.sb_import_rows(${sql.json(rows as never)}) as n`)[0].n : 0,
  status: async () => (await sql`select (select count(*) from public.sb_tabs)::int as tabs, (select count(*) from public.sb_rows)::int as rows`)[0],
  perf: async (rows: Record<string, unknown>[]) => { if (rows.length) await sql`insert into public.sb_perf (sess, fn, ms, save_ms, n, note) select x.sess, x.fn, x.ms, x.save_ms, x.n, x.note from jsonb_to_recordset(${sql.json(rows as never)}) as x (sess text, fn text, ms real, save_ms real, n int, note text)`; }
};
const secrets: Record<string, string> = {};
for (const k of ['ENC_KEY', 'MAC_KEY', 'PEPPER']) { const v = Deno.env.get('RUNNER_' + k); if (v) secrets[k] = v.trim(); }

const hex = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('');
let coreP: Promise<any> | null = null;
function core() {
  if (!coreP) {
    coreP = (async () => {
      const r = await fetch(ENGINE_URL + '?v=' + ENGINE_SHA256.slice(0, 8) + '-' + Math.floor(Date.now() / 60000), { cache: 'no-store' });
      if (!r.ok) throw new Error('서버 묶음을 받지 못했습니다 (' + r.status + ')');
      const src = await r.text();
      const h = await hex(src);
      if (h !== ENGINE_SHA256 && ENGINE_OLD.indexOf(h) < 0) throw new Error('서버 묶음(engine.js)이 이 서버 함수와 맞지 않습니다. runner-sb 저장소에 engine.js 를 다시 올려 주세요.');
      const m = new Function(src + '\n;return { sbMakeServer: sbMakeServer, sbMakeKDate: sbMakeKDate, __ENGINE: __ENGINE, __GAS_NAMES: __GAS_NAMES };')();
      return m.sbMakeServer({ engine: m.__ENGINE, gasNames: m.__GAS_NAMES, db, secrets, Date: m.sbMakeKDate(), ref: 'nlczahktyiwdbuakfncb', now: () => performance.now() });
    })();
    coreP.catch(() => { coreP = null; });
  }
  return coreP;
}
async function who(tok: string) {
  // 점검용 열쇠: DB 의 __test (지문|만료 시각) 와 맞을 때만 · 점검이 끝나면 지운다
  if (tok.startsWith('sbtest_')) {
    const r0 = await sql`select v from public.sb_props where k = '__test'`;
    if (!r0.length) return null;
    const [h, until] = String(r0[0].v).split('|');
    return Date.now() < Number(until) && (await hex(tok)) === h ? 'test' : null;
  }
  const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + tok } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? String(u.id) : null;
}
async function allowed(uid: string) { if (uid === 'test') return true; return (await sql`select 1 from public.sb_allow where uid = ${uid}::uuid`).length > 0; }

// ───── 요청 처리 (sbtest/api-handler.js 와 같은 코드) ─────
// 암호화 키 점검: 기사 정보의 암호화된 칸을 실제로 풀어 보고 개수만 돌려준다 (값은 돌려주지 않음)
var SB_KEYCHECK = "(function () { var n = 0, ok = 0, bad = 0; readAll_(SH.DRIVERS).slice(0, 60).forEach(function (d) { Object.keys(d).forEach(function (k) { var v = d[k]; if (typeof v === 'string' && v.indexOf('v1:') === 0) { n++; try { decrypt_(v); ok++; } catch (e) { bad++; } } }); }); return { n: n, ok: ok, bad: bad }; })()";
function sbMakeHandler(deps) {
  var allowCache = new Map();
  var cors = function (req) {
    var o = req.headers.get('origin') || '';
    return { 'Access-Control-Allow-Origin': deps.origins.indexOf(o) >= 0 ? o : deps.origins[0], 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  };
  var json = function (req, status, body) { return new Response(JSON.stringify(body), { status: status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors(req)) }); };
  async function gate(req) {
    var tok = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!tok) return null;
    var hit = allowCache.get(tok);
    if (hit && hit.exp > Date.now()) return hit.uid;
    var uid = await deps.who(tok);
    if (!uid) return null;
    var ok = await deps.allowed(uid);
    if (!ok) return false;
    if (allowCache.size > 500) allowCache.clear();
    allowCache.set(tok, { uid: uid, exp: Date.now() + 300000 });
    return uid;
  }
  return async function (req) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'POST') return json(req, 405, { ok: false, msg: 'POST 만 받습니다' });
    var body;
    try { body = await req.json(); } catch (e) { return json(req, 400, { ok: false, msg: '요청 형식이 다릅니다' }); }
    // 기사앱(api_)은 서버 코드가 기사 아이디·비밀번호·세션으로 직접 확인한다 (원래 앱과 같음) → 수파베이스 로그인 문은 관리자 쪽(adm_ · 관리 작업)에만
    var driverCall = !(body && body.op) && /^api_[A-Za-z0-9_]+$/.test(String(body && body.fn || '')) && !/_$/.test(String(body.fn));
    if (!driverCall) {
      var uid;
      try { uid = await gate(req); } catch (e) { return json(req, 503, { ok: false, msg: '로그인 확인 실패: ' + String(e && e.message || e) }); }
      if (uid === null) return json(req, 401, { ok: false, msg: '로그인이 필요합니다' });
      if (uid === false) return json(req, 403, { ok: false, msg: '사용 승인이 되지 않은 계정입니다' });
    }
    try {
      if (body && body.op) {
        var d = body.data || {};
        if (body.op === 'status') return json(req, 200, await deps.db.status());
        if (body.op === 'perf') { await deps.db.perf((Array.isArray(d) ? d : []).slice(0, 500)); return json(req, 200, { ok: true }); }
        var core = await deps.core();
        if (body.op === 'imp-begin') { await deps.db.impBegin(d.books || []); await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-tabs') { await deps.db.impTabs(d.tabs || []); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-rows') { var n = await deps.db.impRows(d.rows || []); return json(req, 200, { ok: true, n: n }); }
        if (body.op === 'imp-end') { await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'stat') return json(req, 200, core.stat());
        if (body.op === 'keycheck') { var kc = await core.call('', [SB_KEYCHECK], 'eval'); return json(req, 200, { names: deps.secretNames || [], realLogin: !!deps.realLogin, result: kc.out }); }
        return json(req, 400, { ok: false, msg: '알 수 없는 작업' });
      }
      var fn = String(body && body.fn || ''), args = Array.isArray(body && body.args) ? body.args : [];
      if (!/^(api|adm)_[A-Za-z0-9_]+$/.test(fn) || /_$/.test(fn)) return json(req, 200, { out: { ok: false, code: 'UNKNOWN_FN', msg: '알 수 없는 요청입니다. 화면을 새로고침해 주세요.' } });
      var c = await deps.core();
      var r = await c.call(fn, args, fn === 'adm_login' && !deps.realLogin ? 'login' : '');
      return json(req, 200, r);
    } catch (e) {
      return json(req, 500, { ok: false, msg: '서버 오류: ' + String(e && e.message || e) });
    }
  };
}


const handler = sbMakeHandler({ core, db, who, allowed, origins: ORIGINS, realLogin: !!secrets.PEPPER, secretNames: Object.keys(secrets) });
Deno.serve(handler);
