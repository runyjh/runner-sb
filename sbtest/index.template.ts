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
__HANDLER__

const handler = sbMakeHandler({ core, db, who, allowed, origins: ORIGINS, realLogin: !!secrets.PEPPER, secretNames: Object.keys(secrets) });
Deno.serve(handler);
