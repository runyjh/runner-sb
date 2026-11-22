// @ts-nocheck
// 러너 올인원 수파베이스판 서버 함수 (api) — 지금 Apps Script doPost 자리
//  - 서버 코드 묶음(engine.js)은 runner-sb 깃허브 페이지에서 받아, 지문(SHA-256)이 맞을 때만 돌린다
//  - 표는 이 함수만 읽고 쓴다 (DB 직접 연결). 화면은 표에 직접 닿지 않는다
//  - 로그인 확인은 이 함수가 직접 한다 (수파베이스 로그인 + 사용 승인 sb_allow)
import postgres from 'npm:postgres@3.4.7';

const ENGINE_URL = 'https://runyjh.github.io/runner-sb/engine.js';
const ENGINE_SHA256 = 'bc1768d9ffb8f77448ce4734695f7a857b01b26166be44d33676aca2fa0b8123';
const ENGINE_OLD: string[] = ["7567b51c2def2e1e1f5e21e03391f1736abe9d98b9cb3f9c06dc82ec0ca0494e"]; // 올리는 동안 잠깐 같이 받아 주는 이전 묶음 지문
const ORIGINS = ['https://runyjh.github.io'];
const SB_URL = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 3, prepare: false, idle_timeout: 30, connect_timeout: 10 });
const arr = (a: string[]) => '{' + (a || []).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).join(',') + '}';

const db = {
  sync: async (ver: number | null, cver: number | null, loaded: string[], want: string[]) => (await sql`select public.sb_sync3(${ver}::bigint, ${cver}::bigint, ${arr(loaded)}::uuid[], ${arr(want)}::uuid[]) as j`)[0].j,
  cachePut: async (list: unknown[]) => (await sql`select public.sb_cache_put(${sql.json(list as never)}) as v`)[0].v,
  commit: async (ops: unknown, base: number) => (await sql`select public.sb_commit2(${sql.json(ops as never)}, ${base}::bigint) as j`)[0].j,
  impBegin: async (books: string[]) => { await sql.begin(async (tx) => { await tx`select pg_advisory_xact_lock(727001)`; await tx`delete from public.sb_tabs where book = any(${'{' + books.filter((b) => /^\w+$/.test(b)).join(',') + '}'}::text[])`; }); },
  impTabs: async (tabs: Record<string, unknown>[]) => { if (tabs.length) await sql`insert into public.sb_tabs (uid, book, tab, ord, max_rows, max_cols) select x.uid, x.book, x.tab, x.ord, x.max_rows, x.max_cols from jsonb_to_recordset(${sql.json(tabs as never)}) as x (uid uuid, book text, tab text, ord int, max_rows int, max_cols int)`; },
  impRows: async (rows: unknown[]) => rows.length ? (await sql`select public.sb_import_rows(${sql.json(rows as never)}) as n`)[0].n : 0,
  // 가져오기가 끝나면 함께 쓰는 임시 기억을 모두 비운다 (예전 자료로 만든 정산 색인 등이 남지 않게 · 2026-11-18)
  rate: async (k: string) => (await sql`select public.sb_rate_hit(${k}) as n`)[0].n,
  cacheClear: async () => (await sql`select public.sb_cache_clear() as v`)[0].v,
  status: async () => (await sql`select (select count(*) from public.sb_tabs)::int as tabs, (select count(*) from public.sb_rows)::int as rows, (select v from public.sb_props where k = '__backup') as backup_at`)[0],
  // 백업 내려받기 (관리자 화면): 탭 목록 → 탭마다 줄 순서대로 나눠 받기 · 로그인 기록(sessions)은 머리글만
  expTabs: async () => ({ tabs: await sql`select uid, book, tab, ord, max_rows, max_cols from public.sb_tabs order by book, ord`, rows: (await sql`select count(*)::int as n from public.sb_rows`)[0].n }),
  expRows: async (uid: string, after: number | null) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(uid))) throw new Error('탭 번호가 이상합니다');
    const t = await sql`select tab from public.sb_tabs where uid = ${uid}::uuid`;
    if (!t.length) throw new Error('없는 탭입니다');
    const lim = t[0].tab === 'sessions' ? 1 : 3000;
    const rows = await sql`select pos, cells from public.sb_rows where tab_uid = ${uid}::uuid and (${after}::float8 is null or pos > ${after}::float8) order by pos limit ${lim}`;
    return { rows: rows.map((r: any) => [r.pos, r.cells]), more: t[0].tab !== 'sessions' && rows.length === lim };
  },
  expDone: async () => { await sql`insert into public.sb_props (k, v) values ('__backup', ${new Date().toISOString()}) on conflict (k) do update set v = excluded.v, updated_at = now()`; },
  errLog: async (fn: string, msg: string, stack: string) => { await sql`insert into public.sb_perf (sess, fn, note) values ('server-error', ${fn.slice(0, 80)}, ${('ERR ' + msg + (stack ? ' | ' + stack : '')).slice(0, 1500)})`; },
  perf: async (rows: Record<string, unknown>[]) => { if (rows.length) await sql`insert into public.sb_perf (sess, fn, ms, save_ms, n, note) select x.sess, x.fn, x.ms, x.save_ms, x.n, x.note from jsonb_to_recordset(${sql.json(rows as never)}) as x (sess text, fn text, ms real, save_ms real, n int, note text)`; }
};
// 파일 저장소 (비공개 버킷 files · 이 서버 함수만 서비스 키로)
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const objUrl = (id: string) => SB_URL + '/storage/v1/object/files/' + encodeURIComponent(id);
const storage = {
  get: async (id: string) => { const r = await fetch(objUrl(id), { headers: { Authorization: 'Bearer ' + SVC, apikey: SVC } }); if (r.status === 404 || r.status === 400) { await r.body?.cancel(); return null; } if (!r.ok) throw new Error('저장소 읽기 ' + r.status); return new Uint8Array(await r.arrayBuffer()); },
  put: async (id: string, bytes: Uint8Array, mime: string) => { const r = await fetch(objUrl(id), { method: 'POST', headers: { Authorization: 'Bearer ' + SVC, apikey: SVC, 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' }, body: bytes }); if (!r.ok) throw new Error('저장소 올리기 ' + r.status + ' ' + (await r.text()).slice(0, 120)); }
};
const b64bytes = (s: string) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
// 파일 옮기기 (구글 쪽 복사용 스크립트 → 옮기기 전용 열쇠)
const MIG_PROPS = ['ROOT_FOLDER_ID', 'DOCS_FOLDER_ID', 'CAMP_IMG_FOLDER_ID', 'NT_FOLDER', 'BD_FOLDER', 'PM_FOLDER', 'RN_FOLDER', 'STL_FILE_FOLDER', 'UPLOAD_FOLDER_ID'];
const mig = {
  ok: async (k: string) => { if (!k.startsWith('sbmig_')) return false; const r0 = await sql`select v from public.sb_props where k = '__mig'`; if (!r0.length) return false; const [h, until] = String(r0[0].v).split('|'); return Date.now() < Number(until) && (await hex(k)) === h; },
  have: async () => (await sql`select id, stored, folder from public.sb_files`).map((r: any) => [r.id, r.stored, r.folder]),
  refs: async () => (await sql`select distinct m[1] as id from public.sb_rows r, lateral regexp_matches(r.cells::text, '(?:/d/|[?&]id=)([A-Za-z0-9_-]{25,})', 'g') m where not exists (select 1 from public.sb_files f where f.id = m[1] and f.stored)`).map((r: any) => r.id),
  put: async (list: unknown[]) => list.length ? (await sql`select public.sb_files_put(${sql.json(list as never)}) as n`)[0].n : 0,
  blob: async (meta: any, b64: string) => { if (!/^[A-Za-z0-9_-]{10,}$/.test(String(meta.id || ''))) throw new Error('파일 번호가 이상합니다'); const bytes = b64bytes(b64); await storage.put(meta.id, bytes, meta.mime); await sql`select public.sb_files_put(${sql.json([Object.assign({}, meta, { size: bytes.length, stored: true, folder: false })] as never)})`; },
  props: async (p: Record<string, string>) => { const ks = Object.keys(p).filter((k) => MIG_PROPS.includes(k) && /^[A-Za-z0-9_-]{10,}$/.test(String(p[k]))); for (const k of ks) await sql`insert into public.sb_props (k, v) values (${k}, ${String(p[k])}) on conflict (k) do update set v = excluded.v`; return ks; }
};
const secrets: Record<string, string> = {};
for (const k of ['ENC_KEY', 'MAC_KEY', 'PEPPER', 'FCM_SA']) { const v = Deno.env.get('RUNNER_' + k); if (v) secrets[k] = v.trim(); }

const hex = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('');
let coreP: Promise<any> | null = null, coreStaleAt = 0;
function core() {
  // (S132) 이전 묶음으로 잠깐 돌던 중이면 30초마다 새 묶음을 다시 받아 본다 (예전: 깃허브 페이지가 늦게 바뀐 사이 뜬 서버가 이전 코드로 계속 돌았음)
  if (coreP && coreStaleAt && Date.now() > coreStaleAt) { coreP = null; coreStaleAt = 0; }
  if (!coreP) {
    coreP = (async () => {
      // 서버 묶음은 DB(sb_code)에 보관된 것을 먼저 쓴다 → 깃허브가 멈춰도 서버는 돈다
      // DB 에 맞는 지문이 없을 때만(새 묶음을 올린 직후 한 번) 깃허브에서 받아 DB 에 넣는다
      // 묶음은 지문별로 따로 보관 (engine:<지문>) → 새 묶음을 넣어도 아직 돌고 있는 이전 서버 함수는 자기 묶음을 그대로 읽는다
      let src = '';
      try { const c = await sql`select src from public.sb_code where sha = ${ENGINE_SHA256} limit 1`; if (c.length && (await hex(c[0].src)) === ENGINE_SHA256) src = c[0].src; } catch (_) { src = ''; }
      if (!src) {
        const r = await fetch(ENGINE_URL + '?v=' + ENGINE_SHA256.slice(0, 8) + '-' + Math.floor(Date.now() / 60000), { cache: 'no-store' });
        if (!r.ok) throw new Error('서버 묶음을 받지 못했습니다 (' + r.status + ')');
        src = await r.text();
        const h = await hex(src);
        if (h === ENGINE_SHA256) { try { await sql`insert into public.sb_code (name, sha, src) values (${'engine:' + h}, ${h}, ${src}) on conflict (name) do nothing`; } catch (_) { /* 보관 실패해도 이번엔 그대로 돈다 */ } }
        else {
          // (S132) 깃허브 페이지가 아직 이전 묶음이거나 벌써 다음 묶음 → 보관해 둔 이전 묶음으로 잠깐 돌고, 30초 뒤 다시 받아 본다
          let keep = ENGINE_OLD.indexOf(h) >= 0 ? src : '';
          if (!keep && ENGINE_OLD.length) { try { const c2 = await sql`select src, sha from public.sb_code where sha = any(${'{' + ENGINE_OLD.filter((x) => /^[0-9a-f]{64}$/.test(x)).join(',') + '}'}::text[]) limit 1`; if (c2.length && (await hex(c2[0].src)) === c2[0].sha) keep = c2[0].src; } catch (_) { keep = ''; } }
          if (!keep) throw new Error('서버 묶음(engine.js)이 이 서버 함수와 맞지 않습니다. runner-sb 저장소에 engine.js 를 다시 올려 주세요.');
          src = keep; coreStaleAt = Date.now() + 30000;
        }
      }
      const m = new Function(src + '\n;return { sbMakeServer: sbMakeServer, sbMakeKDate: sbMakeKDate, sbMakeExt: typeof sbMakeExt === "function" ? sbMakeExt : null, __ENGINE: __ENGINE, __GAS_NAMES: __GAS_NAMES };')();
      return m.sbMakeServer({ engine: m.__ENGINE, gasNames: m.__GAS_NAMES, db, storage, secrets, ext: m.sbMakeExt ? m.sbMakeExt({ fetch }) : null, Date: m.sbMakeKDate(), ref: 'nlczahktyiwdbuakfncb', now: () => performance.now(), bg: (p: Promise<unknown>) => { try { (globalThis as any).EdgeRuntime.waitUntil(p); } catch (_) { /* 없으면 그냥 */ } } });
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
// 정해진 시간 작업 열쇠: DB 예약 작업만 안다 (금고 vault 에 보관 · 여기엔 지문 __cron 만)
async function cronOk(k: string) { if (!k.startsWith('sbcron_')) return false; const r0 = await sql`select v from public.sb_props where k = '__cron'`; return r0.length > 0 && (await hex(k)) === String(r0[0].v); }
async function allowed(uid: string) { if (uid === 'test') return true; return (await sql`select 1 from public.sb_allow where uid = ${uid}::uuid`).length > 0; }

// ───── 요청 처리 (sbtest/api-handler.js 와 같은 코드) ─────
// 암호화 키 점검: 기사 정보의 암호화된 칸을 실제로 풀어 보고 개수만 돌려준다 (값은 돌려주지 않음)
var SB_KEYCHECK = "(function () { var n = 0, ok = 0, bad = 0; readAll_(SH.DRIVERS).slice(0, 60).forEach(function (d) { Object.keys(d).forEach(function (k) { var v = d[k]; if (typeof v === 'string' && v.indexOf('v1:') === 0) { n++; try { decrypt_(v); ok++; } catch (e) { bad++; } } }); }); return { n: n, ok: ok, bad: bad }; })()";
var CRON_FNS = ['cleanupSessions', 'firstRunNotify', 'pushQuietFlush']; // 원래 서버의 시간 트리거 (세션 정리 매일 4시 · 처음 가는 노선 알림 매일 18시)
var MAIL_FNS = ['api_mailFile', 'api_mailPing', 'api_mailBody']; // api_mailBody: 쿠팡 정산 일정 메일 본문 (S24)
// 기사앱 요청 제한: 같은 인터넷 주소에서 1분에 이만큼 넘게 오면 잠깐 막는다 (통신사 공용 주소로 여러 기사가 함께 써도 넉넉하게)
var RATE_MAX = 300;
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
    // 정해진 시간 작업(cron): DB 예약 작업(pg_cron)만 부른다 → 예약 작업 전용 열쇠 · 정해 둔 함수만
    if (body && body.op === 'cron') {
      var ck = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!deps.cronOk || !(await deps.cronOk(ck))) return json(req, 401, { ok: false, msg: '예약 작업 열쇠가 맞지 않습니다' });
      if (CRON_FNS.indexOf(String(body.fn)) < 0) return json(req, 400, { ok: false, msg: '예약 작업으로 부를 수 없는 기능입니다' });
      try { var cc = await deps.core(); var cr = await cc.call(String(body.fn), [], 'cron'); return json(req, 200, { ok: true, out: cr.out, T: cr.T }); }
      catch (e) {
        // (S38) 실패를 남긴다: 서버 오류 기록(sb_perf) + 대시보드 경고(HB.fail) — 기록에 실패해도 응답은 그대로
        var cm = String(e && e.message || e);
        try { if (deps.db && deps.db.errLog) await deps.db.errLog('cron:' + String(body.fn), cm, String(e && e.stack || '').slice(0, 600)); } catch (e2) { /* 무시 */ }
        try { var c2 = await deps.core(); await c2.call('', ['hbFail_(' + JSON.stringify(String(body.fn)) + ', ' + JSON.stringify(cm.slice(0, 200)) + ')'], 'eval'); } catch (e3) { /* 무시 */ }
        return json(req, 500, { ok: false, msg: '예약 작업 오류: ' + cm });
      }
    }
    // 파일 옮기기(mig-): 구글 쪽 복사용 스크립트가 부른다 → 옮기기 전용 열쇠로만 (다른 기능은 못 씀)
    if (body && typeof body.op === 'string' && body.op.indexOf('mig-') === 0) {
      var mk = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!deps.mig || !(await deps.mig.ok(mk))) return json(req, 401, { ok: false, msg: '옮기기 열쇠가 맞지 않거나 기한이 지났습니다' });
      try {
        var md = body.data || {};
        if (body.op === 'mig-have') return json(req, 200, { ok: true, files: await deps.mig.have() });
        if (body.op === 'mig-refs') return json(req, 200, { ok: true, ids: await deps.mig.refs() });
        if (body.op === 'mig-put') return json(req, 200, { ok: true, n: await deps.mig.put((md.files || []).slice(0, 2000)) });
        if (body.op === 'mig-blob') { await deps.mig.blob(md.meta || {}, String(md.b64 || '')); return json(req, 200, { ok: true }); }
        if (body.op === 'mig-props') return json(req, 200, { ok: true, set: await deps.mig.props(md.props || {}) });
        return json(req, 400, { ok: false, msg: '알 수 없는 작업' });
      } catch (e) { return json(req, 500, { ok: false, msg: '옮기기 오류: ' + String(e && e.message || e) }); }
    }
    // 기사앱(api_)은 서버 코드가 기사 아이디·비밀번호·세션으로 직접 확인한다 (원래 앱과 같음) → 수파베이스 로그인 문은 관리자 쪽(adm_ · 관리 작업)에만
    var driverCall = !(body && body.op) && /^api_[A-Za-z0-9_]+$/.test(String(body && body.fn || '')) && !/_$/.test(String(body.fn));
    if (driverCall && deps.rate && MAIL_FNS.indexOf(String(body.fn)) < 0) {
      var ip = String(req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || String(req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim();
      var hits = 0;
      try { hits = await deps.rate('ip:' + (ip || '?')); } catch (e) { hits = 0; } // 세기에 실패하면 막지 않는다
      if (hits > RATE_MAX) return json(req, 429, { out: { ok: false, code: 'BUSY', msg: '요청이 너무 많습니다. 1분 뒤에 다시 시도해 주세요.' } });
    }
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
        if (body.op === 'exp-tabs') return json(req, 200, await deps.db.expTabs());
        if (body.op === 'exp-rows') return json(req, 200, await deps.db.expRows(String(d.tab || ''), d.after == null ? null : Number(d.after)));
        if (body.op === 'exp-done') { await deps.db.expDone(); return json(req, 200, { ok: true }); }
        if (body.op === 'perf') { await deps.db.perf((Array.isArray(d) ? d : []).slice(0, 500)); return json(req, 200, { ok: true }); }
        // (S47) 같이 짜기: 바뀌면 그때 답하기 (서버 프로그램을 거치지 않음 · 최대 25초 쥐고 있음) / 보고 있는 칸 알리기
        if (body.op === 'live-wait' || body.op === 'live-here') {
          if (!deps.live) return json(req, 200, { ok: false, busy: true });
          return json(req, 200, await (body.op === 'live-wait' ? deps.live.wait(d) : deps.live.here(d)));
        }
        var core = await deps.core();
        if (body.op === 'imp-begin') { await deps.db.impBegin(d.books || []); await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-tabs') { await deps.db.impTabs(d.tabs || []); return json(req, 200, { ok: true }); }
        if (body.op === 'imp-rows') { var n = await deps.db.impRows(d.rows || []); return json(req, 200, { ok: true, n: n }); }
        if (body.op === 'imp-end') { if (deps.db.cacheClear) await deps.db.cacheClear(); await core.reset(); return json(req, 200, { ok: true }); }
        if (body.op === 'stat') return json(req, 200, core.stat());
        // 전체 점검(7단계): 점검용 열쇠(sbtest_)로만 · 읽기만 하고 쓰기는 모두 버린다 · 외부 연결 안 함
        if (body.op === 'check') { if (uid !== 'test') return json(req, 403, { ok: false, msg: '점검용 열쇠로만 됩니다' }); var ck2 = await core.call('', [String(d.src || '')], 'dry'); return json(req, 200, ck2); }
        if (body.op === 'keycheck') { var kc = await core.call('', [SB_KEYCHECK], 'eval'); return json(req, 200, { names: deps.secretNames || [], realLogin: !!deps.realLogin, result: kc.out }); }
        return json(req, 400, { ok: false, msg: '알 수 없는 작업' });
      }
      var fn = String(body && body.fn || ''), args = Array.isArray(body && body.args) ? body.args : [];
      if (!/^(api|adm)_[A-Za-z0-9_]+$/.test(fn) || /_$/.test(fn)) return json(req, 200, { out: { ok: false, code: 'UNKNOWN_FN', msg: '알 수 없는 요청입니다. 화면을 새로고침해 주세요.' } });
      var c = await deps.core(), t0 = Date.now();
      var r = await c.call(fn, args, fn === 'adm_login' && !deps.realLogin ? 'login' : '');
      // (S111) 기사앱 호출은 느리거나(2.5초 넘게) 서버 오류일 때만 기록 (관리자앱처럼 화면이 보내는 속도 기록이 없어서 · 기사 쪽 느림을 알 수 있게)
      if (driverCall && deps.db && deps.db.perf) { var ms = Date.now() - t0, o = (r && r.out) || {}, bad = o && o.ok === false && /^서버 오류/.test(String(o.msg || '')); if (ms > 2500 || bad) { try { await deps.db.perf([{ sess: 'drv', fn: fn, ms: ms, save_ms: Math.round((r.T && r.T.db) || 0), n: (r.T && r.T.runs) || 1, note: (bad ? 'ERR ' + String(o.msg).slice(0, 200) : '') + (r.T && r.T.conflicts ? ' 충돌 ' + r.T.conflicts : '') + (r.T && r.T.push ? ' 알림 ' + Math.round(r.T.push) + 'ms' : '') }]); } catch (e4) { /* 기록 실패는 무시 */ } } }
      if (MAIL_FNS.indexOf(fn) >= 0) return json(req, 200, r.out); // 메일 수집기는 원래 서버와 같은 모양({ ok, … })을 읽는다
      return json(req, 200, r);
    } catch (e) {
      // 서버 오류는 원인을 찾을 수 있게 기록한다 (sb_perf · note 'ERR …' · 2026-11-18 S13)
      var em = String(e && e.message || e);
      try { if (deps.db && deps.db.errLog) await deps.db.errLog(String(body && (body.fn || body.op) || ''), em, String(e && e.stack || '').slice(0, 600)); } catch (e2) { /* 기록 실패는 무시 */ }
      return json(req, 500, { ok: false, msg: '서버 오류: ' + em });
    }
  };
}


// ───── 같이 짜기 (sbtest/live-core.js 와 같은 코드) ─────
function sbMakeLive(deps) {
  var CH = 'sb_live', MAXL = 6, WAIT = 25000, IDLE = 30000, PTTL = 30000, BUSY = 60000;
  var T = deps.setTimeout || setTimeout, C = deps.clearTimeout || clearTimeout;
  var st = { on: null, sub: null, areas: '', pres: {}, waiters: [], idleT: null, busyUntil: 0 };
  var cut = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
  function areasObj() { try { return JSON.parse(st.areas || '{}') || {}; } catch (e) { return {}; } }
  function presList(exId) {
    var now = deps.now(), out = [];
    Object.keys(st.pres).sort().forEach(function (k) { var p = st.pres[k]; if (now - p.at > PTTL) { delete st.pres[k]; return; } if (k !== exId) out.push({ id: k, who: p.who, name: p.name, sel: p.sel, view: p.view }); });
    return out;
  }
  function snap(q) { var a = areasObj(), pl = presList(cut(q && q.id, 80)); return { ok: true, schAt: +a.sch || 0, schBy: a.schBy || '', pmAt: +a.pm || 0, pmBy: a.pmBy || '', nbAt: +a.nb || 0, pres: pl, ph: JSON.stringify(pl) }; }
  function changed(q, s) { return s.schAt > (+q.schAt || 0) || s.pmAt > (+q.pmAt || 0) || s.nbAt > (+q.nbAt || 0) || s.ph !== String(q.ph == null ? '[]' : q.ph); }
  function wake() {
    st.waiters.slice().forEach(function (w) { var s = snap(w.q); if (changed(w.q, s)) w.done(s); });
  }
  function onMsg(p) {
    p = String(p || '');
    if (p.charAt(0) === 'A') { st.areas = p.slice(1); wake(); return; }
    if (p.charAt(0) !== 'P') return;
    var o = null; try { o = JSON.parse(p.slice(1)); } catch (e) { o = null; }
    if (!o || !o.id) return;
    if (o.gone) delete st.pres[o.id]; else st.pres[o.id] = { who: cut(o.who, 60), name: cut(o.name, 40), sel: cut(o.sel, 80), view: cut(o.view, 60), at: deps.now() };
    wake();
  }
  function stop() {
    var sub = st.sub; st.on = null; st.sub = null; st.pres = {}; st.areas = '';
    try { if (sub && sub.unlisten) sub.unlisten(); } catch (e) { /* 이미 끊김 */ }
  }
  function idleCheck() { C(st.idleT); st.idleT = null; if (!st.waiters.length && st.on) st.idleT = T(function () { if (!st.waiters.length) stop(); }, IDLE); }
  function start() {
    C(st.idleT); st.idleT = null;
    if (st.on) return st.on;
    if (deps.now() < st.busyUntil) return Promise.reject(new Error('BUSY'));
    var p = st.on = Promise.resolve().then(function () { return deps.listeners(); }).then(function (n) {
      if (n >= MAXL) { st.busyUntil = deps.now() + BUSY; throw new Error('BUSY'); }
      // 듣기 시작 · 다시 이어질 때마다 지금 값을 한 번 읽는다 (끊긴 사이의 변경을 놓치지 않게)
      return deps.listen(CH, onMsg, function () { Promise.resolve(deps.readAreas()).then(function (a) { st.areas = String(a || ''); wake(); }, function () {}); });
    }).then(function (sub) { st.sub = sub; return Promise.resolve(deps.readAreas()).then(function (a) { st.areas = String(a || ''); }); });
    p.catch(function () { if (st.on === p) { st.on = null; st.sub = null; } });
    return p;
  }
  return {
    /** q = { first, schAt, pmAt, nbAt, ph, id } → 지금 값이 q 와 다르면 바로 · 같으면 바뀔 때까지(최대 25초) 기다렸다가 */
    wait: function (q) {
      q = q || {};
      return start().then(function () {
        var s = snap(q);
        if (q.first || changed(q, s)) { idleCheck(); return s; }
        return new Promise(function (res) {
          var w = { q: q, done: null }, t = T(function () { w.done(Object.assign(snap(q), { idle: true })); }, WAIT);
          w.done = function (v) { C(t); var i = st.waiters.indexOf(w); if (i >= 0) st.waiters.splice(i, 1); idleCheck(); res(v); };
          st.waiters.push(w);
        });
      }, function (e) { if (String(e && e.message) === 'BUSY') return { ok: false, busy: true }; throw e; });
    },
    /** p = { id, who, name, sel, view, gone } → 다른 서버들에도 알림 (저장 안 함) */
    here: function (p) {
      p = p || {};
      var id = cut(p.id, 80); if (!id) return Promise.resolve({ ok: false });
      var o = { id: id, who: cut(p.who, 60), name: cut(p.name, 40), sel: cut(p.sel, 80), view: cut(p.view, 60) }; if (p.gone) o.gone = 1;
      return Promise.resolve(deps.notify(CH, 'P' + JSON.stringify(o))).then(function () { return { ok: true }; });
    },
    stat: function () { return { on: !!st.on, waiters: st.waiters.length, pres: Object.keys(st.pres).length }; },
    _msg: onMsg, _stop: stop
  };
}

const live = sbMakeLive({
  listen: (ch: string, onMsg: (p: string) => void, onListen: () => void) => sql.listen(ch, onMsg, onListen),
  notify: (ch: string, t: string) => sql`select pg_notify(${ch}, ${t})`,
  readAreas: async () => { const r = await sql`select v from public.sb_props where k = 'FS_AREAS'`; return r.length ? String(r[0].v) : ''; },
  listeners: async () => (await sql`select count(*)::int as n from pg_stat_activity where query ilike 'listen "sb_live"%'`)[0].n,
  now: () => Date.now()
});

const handler = sbMakeHandler({ core, db, who, allowed, mig, cronOk, live, rate: db.rate, origins: ORIGINS, realLogin: !!secrets.PEPPER, secretNames: Object.keys(secrets) });
Deno.serve(handler);
