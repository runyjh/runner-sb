// (S148) 기사앱 읽기 묶음(api_batch): 앱을 열 때 나가는 읽기 요청을 한 번에
//  (예전: 따로 보내 서버에서 한 번에 하나씩 · 뒤 요청이 줄 서서 기다림)
//  사용: node sbtest/ts148.js <runner-allinone 폴더>
//  사용: node sbtest/ts110b.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const R = [];
const rep = (good, id, m) => { R.push([good, id, m]); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-22T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '인천8캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
call('adm_createDriver', [tok, { name: '기사B', loginId: 'b@df', driverType: '고정', phone: '010-4000-1011', schCampId: CAMP, baseRoute: '101A' }]);
const DB_ = call('adm_listDrivers', [tok]).rows[0].id, TB = ev("createSession_('" + DB_ + "', true).token");

const t1 = '2026-11'; 
const calls = [['api_checkSession', [TB]], ['api_notices', [TB]], ['api_mySchedule', [TB, t1]], ['api_pmList', [TB, { onlyAvail: false, q: '' }]], ['api_myInfo', [TB]], ['api_pmAlerts', [TB]]];
const sep = calls.map((c) => call(c[0], c[1]));
const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === '_ms' || k === '_st' ? undefined : v)));
const bt = call('api_batch', [TB, calls.map((c) => ({ fn: c[0], args: c[1] }))]);
ok(bt.ok && bt.res.length === calls.length, '1 묶음 응답 ' + (bt.res || []).length + '개');
ok(calls.every((c, i) => JSON.stringify(strip(bt.res[i])) === JSON.stringify(strip(sep[i]))), '2 묶음 결과 = 따로 부른 결과 (' + calls.map((c) => c[0].slice(4)).join(' · ') + ')');
const wr = call('api_batch', [TB, [{ fn: 'api_pmApply', args: [TB, 'x', ''] }, { fn: 'api_pmSave', args: [TB, {}] }, { fn: 'adm_listDrivers', args: [tok] }]]);
ok(wr.ok && wr.res.every((r) => r && r.code === 'NOBATCH'), '3 저장 · 지원 · 관리자 요청은 묶음으로 안 됨 (NOBATCH)');
const bad2 = call('api_batch', ['x', [{ fn: 'api_notices', args: ['없는토큰'] }, { fn: 'api_myInfo', args: [TB] }]]);
ok(bad2.ok && bad2.res[0] && bad2.res[0].ok === false && bad2.res[1] && bad2.res[1].ok, '4 각 요청은 자기 토큰으로 확인 (잘못된 토큰만 실패)');
const fs = require('fs'), IX = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), LT = fs.readFileSync(path.join(SRC, 'Later.gs'), 'utf8');
const lst = (src, re) => { const m = src.match(re); return m ? m[1].replace(/\s+/g, '') : ''; };
const cl = lst(IX, /const API_BATCH_OK = new Set\(\[([^\]]*)\]\)/), sl = lst(LT, /const API_BATCH_OK = \[([^\]]*)\]/);
ok(cl && cl === sl, '5 기사앱과 서버의 묶을 수 있는 목록이 같음');
ok(/return gsBatch\(fn, args\)\.then/.test(IX), '6 기사앱이 요청을 묶음으로 보냄 (gsCall0 → gsBatch)');
const SC = fs.readFileSync(path.join(__dirname, 'server-core.js'), 'utf8');
ok(/fn !== 'api_batch'/.test(SC), '7 서버가 묶음 내용별로 필요한 탭을 기억 (api_batch)');
// 수파베이스 서버: 묶음 1번 = 실행 1번
const { makeFakeDb } = require('./fake-db.js'), { sbMakeServer } = require('./server-core.js');
S.takeDirty && S.takeDirty();
(async () => {
  const db = makeFakeDb({ lag: 5 }); db.seed(S);
  const A = sbMakeServer({ engine: F, gasNames: GAS_NAMES, db, storage: db.storage, secrets: { PEPPER: S.props.PEPPER, ENC_KEY: S.props.ENC_KEY, MAC_KEY: S.props.MAC_KEY }, Date: KDate, ext: async () => ({ code: 0, err: 'x', text: '' }) });
  await A.call('api_checkSession', [TB]);
  const n0 = db.__calls ? db.__calls.length : 0;
  const r = await A.call('api_batch', [TB, calls.map((c) => ({ fn: c[0], args: c[1] }))]);
  ok(r.out && r.out.ok && r.out.res.length === calls.length && r.out.res.every((x) => x && x.ok !== false), '8 수파베이스 서버: 묶음 하나로 ' + calls.length + '개 모두 (실행 ' + r.T.runs + '번)');
  console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('FAIL 오류 ' + (e && e.stack || e)); process.exit(1); });
