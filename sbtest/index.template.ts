// @ts-nocheck
// 러너 올인원 수파베이스판 서버 함수 (api) — 지금 Apps Script doPost 자리
//  - 서버 코드 묶음(engine.js)은 runner-sb 깃허브 페이지에서 받아, 지문(SHA-256)이 맞을 때만 돌린다
//  - 표는 이 함수만 읽고 쓴다 (DB 직접 연결). 화면은 표에 직접 닿지 않는다
//  - 로그인 확인은 이 함수가 직접 한다 (수파베이스 로그인 + 사용 승인 sb_allow)
import postgres from 'npm:postgres@3.4.7';

const ENGINE_URL = 'https://runyjh.github.io/runner-sb/engine.js';
const ENGINE_SHA256 = '__SHA__';
const ENGINE_OLD: string[] = __OLD__; // 올리는 동안 잠깐 같이 받아 주는 이전 묶음 지문
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
let coreP: Promise<any> | null = null;
function core() {
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
        if (h !== ENGINE_SHA256 && ENGINE_OLD.indexOf(h) < 0) throw new Error('서버 묶음(engine.js)이 이 서버 함수와 맞지 않습니다. runner-sb 저장소에 engine.js 를 다시 올려 주세요.');
        if (h === ENGINE_SHA256) { try { await sql`insert into public.sb_code (name, sha, src) values (${'engine:' + h}, ${h}, ${src}) on conflict (name) do nothing`; } catch (_) { /* 보관 실패해도 이번엔 그대로 돈다 */ } }
      }
      const m = new Function(src + '\n;return { sbMakeServer: sbMakeServer, sbMakeKDate: sbMakeKDate, sbMakeExt: typeof sbMakeExt === "function" ? sbMakeExt : null, __ENGINE: __ENGINE, __GAS_NAMES: __GAS_NAMES };')();
      return m.sbMakeServer({ engine: m.__ENGINE, gasNames: m.__GAS_NAMES, db, storage, secrets, ext: m.sbMakeExt ? m.sbMakeExt({ fetch }) : null, Date: m.sbMakeKDate(), ref: 'nlczahktyiwdbuakfncb', now: () => performance.now() });
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
__HANDLER__

// ───── 같이 짜기 (sbtest/live-core.js 와 같은 코드) ─────
__LIVE__
const live = sbMakeLive({
  listen: (ch: string, onMsg: (p: string) => void, onListen: () => void) => sql.listen(ch, onMsg, onListen),
  notify: (ch: string, t: string) => sql`select pg_notify(${ch}, ${t})`,
  readAreas: async () => { const r = await sql`select v from public.sb_props where k = 'FS_AREAS'`; return r.length ? String(r[0].v) : ''; },
  listeners: async () => (await sql`select count(*)::int as n from pg_stat_activity where query ilike 'listen "sb_live"%'`)[0].n,
  now: () => Date.now()
});

const handler = sbMakeHandler({ core, db, who, allowed, mig, cronOk, live, rate: db.rate, origins: ORIGINS, realLogin: !!secrets.PEPPER, secretNames: Object.keys(secrets) });
Deno.serve(handler);
