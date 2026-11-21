// (S132) 서버 함수가 서버 묶음(engine.js)을 받는 순서: 보관된 묶음 → 깃허브 → (아직 이전 묶음이면) 잠깐 이전 묶음으로 돌고 30초 뒤 다시 → 받으면 보관
//  사용: node sbtest/ts132.js  (index.template.ts 의 core() 를 가짜 DB · 가짜 깃허브로 돌려 봄)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const esbuild = require('/opt/npm-tools/node_modules/esbuild');
const T = fs.readFileSync(path.join(__dirname, 'index.template.ts'), 'utf8');
const part = T.slice(T.indexOf('const hex = async'), T.indexOf('async function who'));
const R = []; const rep = (good, id, m) => { R.push(good); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
const H = (s) => crypto.createHash('sha256').update(s).digest('hex');
const bundle = (v) => 'function sbMakeServer(o){return {v:' + JSON.stringify(v) + '};} function sbMakeKDate(){return Date;} var __ENGINE = 1, __GAS_NAMES = [];';
const OLD = bundle('old'), NEW = bundle('new'), NEXT = bundle('next');
function load(shaNow, oldList, env) {
  const js = esbuild.transformSync(part, { loader: 'ts' }).code;
  const f = new Function('sql', 'fetch', 'ENGINE_URL', 'ENGINE_SHA256', 'ENGINE_OLD', 'db', 'storage', 'secrets', 'performance', 'crypto', 'TextEncoder', 'Date', js + '\nreturn { core, hex };');
  return f(env.sql, env.fetch, 'https://x/engine.js', shaNow, oldList, {}, {}, {}, { now: () => 0 }, require('crypto').webcrypto, TextEncoder, env.Date);
}
function mkEnv(stored, gh) {
  const env = { stored: Object.assign({}, stored), gh, fetches: 0, now: 1e12 };
  env.Date = class extends Date { static now() { return env.now; } };
  env.fetch = async () => { env.fetches++; return { ok: true, text: async () => env.gh }; };
  env.sql = async (strs, ...vals) => {
    const q = strs.join('?');
    if (/select src from public.sb_code where sha = \?/.test(q)) { const s = env.stored[vals[0]]; return s ? [{ src: s }] : []; }
    if (/select src, sha from public.sb_code where sha = any/.test(q)) { const list = String(vals[0]).replace(/[{}]/g, '').split(',').filter(Boolean); const k = list.find((x) => env.stored[x]); return k ? [{ src: env.stored[k], sha: k }] : []; }
    if (/insert into public.sb_code/.test(q)) { env.stored[vals[1]] = vals[2]; return []; }
    throw new Error('모르는 질의 ' + q);
  };
  return env;
}
(async () => {
  // 1) 내 묶음이 보관돼 있으면 깃허브를 안 봄
  let e = mkEnv({ [H(NEW)]: NEW }, NEXT), m = load(H(NEW), [H(OLD)], e);
  let s = await m.core(); rep(s.v === 'new' && e.fetches === 0, '#u1', '보관된 내 묶음 사용 · 깃허브 ' + e.fetches + '번');
  // 2) 보관 안 됨 + 깃허브가 아직 이전 묶음 → 이전 묶음으로 돌다가, 30초 뒤 다시 받아 새 묶음 · 보관
  e = mkEnv({}, OLD); m = load(H(NEW), [H(OLD)], e);
  s = await m.core(); const a = s.v;
  e.gh = NEW; e.now += 10000; s = await m.core(); const b = s.v;
  e.now += 25000; s = await m.core(); const c = s.v;
  rep(a === 'old' && b === 'old' && c === 'new' && e.stored[H(NEW)] === NEW, '#u2', '깃허브 늦게 바뀜: 처음 ' + a + ' → 10초 뒤 ' + b + ' → 35초 뒤 ' + c + ' · 보관 ' + (e.stored[H(NEW)] ? '됨' : '안 됨'));
  // 3) 이전 서버 함수가 떴는데 깃허브는 벌써 다음 묶음 → 보관해 둔 내 묶음이 있으면 그것 (예전 21:46 오류)
  e = mkEnv({ [H(OLD)]: OLD }, NEXT); m = load(H(OLD), [], e);
  s = await m.core(); rep(s.v === 'old' && e.fetches === 0, '#u3', '다음 묶음이 먼저 올라간 사이 뜬 이전 함수: 보관된 자기 묶음으로 ' + s.v);
  // 4) 내 묶음 · 이전 묶음 모두 없고 깃허브는 모르는 묶음 → 보관된 이전 묶음으로 잠깐 · 그것도 없으면 오류
  e = mkEnv({ [H(OLD)]: OLD }, NEXT); m = load(H(NEW), [H(OLD)], e);
  s = await m.core(); rep(s.v === 'old', '#u4', '깃허브가 모르는 묶음 · 보관된 이전 묶음으로 잠깐: ' + s.v);
  e = mkEnv({}, NEXT); m = load(H(NEW), [H(OLD)], e);
  let err = ''; try { await m.core(); } catch (x) { err = x.message; }
  rep(/맞지 않습니다/.test(err), '#u5', '아무 묶음도 못 찾으면 예전처럼 오류: ' + err.slice(0, 40));
  console.log(R.every(Boolean) ? '\n모두 정상 / ' + R.length : '\n문제 있음'); process.exit(R.every(Boolean) ? 0 : 1);
})();
