// (S147) 기사앱 속도: 노선 평균 · 피크 물량처럼 모두가 같이 쓰는 계산 결과를 4,000자 조각으로 나눠 여러 서버가 같이 씀
//  (예전: 4,096자 넘는 값은 그 서버 메모리에만 → 새 서버가 뜰 때마다 정산 원본 3만 줄을 받아 다시 계산 · 그동안 다른 요청은 줄 서서 기다림)
//  사용: node sbtest/ts147.js <runner-allinone 폴더>
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
// 12월 피크 파일: 라우트 60개 × 7일 (결과가 4,096자를 넘게)
const rows = []; for (let i = 0; i < 60; i++) for (let d = 0; d < 7; d++) rows.push({ wave: '(야간W1)', camp: '인천8', code: (100 + i) + 'A', date: '2026-12-0' + (d + 1), qty: 100 + i + d });
const sv = call('adm_peakSave', [tok, { file: 'pk.xlsx', period: '2026-12', rows, push: false }]);
ok(sv.ok && sv.added === 420, '0 피크 자료 420줄 저장');
// 큰 값 조각 저장 → 다른 서버에서 그대로 읽힘
const { makeFakeDb } = require('./fake-db.js'), { sbMakeServer } = require('./server-core.js');
S.takeDirty && S.takeDirty();
(async () => {
  const db = makeFakeDb({ lag: 5 }); db.seed(S);
  const mk = () => sbMakeServer({ engine: F, gasNames: GAS_NAMES, db, storage: db.storage, secrets: { PEPPER: S.props.PEPPER, ENC_KEY: S.props.ENC_KEY, MAC_KEY: S.props.MAC_KEY }, Date: KDate, ext: async () => ({ code: 0, err: 'x', text: '' }) });
  const A1 = mk();
  const r1 = await A1.call('api_myPeak', [TB]);
  ok(r1.out && r1.out.ok && r1.out.on && Object.keys(r1.out.q).length === 7, '1 첫 서버: 피크 물량 계산 (7일)');
  const big = JSON.stringify(r1.out).length;
  const parts = [...db.__db ? [] : []];
  const cache = await db.sync(null, null, [], []);
  const pk = cache.cache.filter((x) => /^mypk:/.test(x[0]));
  ok(big > 4096 && pk.length >= 2 && pk.every((x) => String(x[1]).length <= 4096), '2 4,096자 넘는 결과(' + big + '자)가 DB 임시 기억에 조각으로 (' + pk.length + '개 · 모두 4,096자 이하)');
  const A2 = mk(); // 새로 뜬 서버
  const r2 = await A2.call('api_myPeak', [TB]);
  ok(r2.out && JSON.stringify(r2.out) === JSON.stringify(r1.out), '3 새 서버: 같은 결과');
  ok(!(r2.T.load || []).some((k) => /route_peak|route_lineage/.test(k)), '4 새 서버는 피크 · 계보 탭을 받지 않고 바로 (받은 탭: ' + JSON.stringify(r2.T.load || []) + ')');
  const e = await A1.call('', ["(function(){ var o = { a: new Array(3000).join('가나다') }; shCPut_('t:big', o, 600); return JSON.stringify(stlCGet_('t:big')) === JSON.stringify(o); })()"], 'eval');
  ok(e.out === true, '5 shCPut_ 로 넣은 값을 stlCGet_ 로 그대로 읽음');
  const fs = require('fs'), ST = fs.readFileSync(path.join(SRC, 'Settle.gs'), 'utf8');
  ok(/shCPut_\(key, out, 21600\); \/\/ 6시간/.test(ST), '6 노선 평균(routeVolumes_)도 여러 서버가 같이 쓰는 조각으로');
  console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('FAIL 오류 ' + (e && e.stack || e)); process.exit(1); });
