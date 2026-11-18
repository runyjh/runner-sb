// S39 내 스케줄 전월 평균 수량: 직함 있는 사람(관리자 · 운영자 · 대표)만 · 하위 캠프는 상위 캠프 노선으로 · 화면 계산(요일 평균 → 하루 평균 → 정보 없음) (TZ=UTC)
//  사용: node sbtest/ts29.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_();");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '서초1캠프', rot: 'D1,D2' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_campSave', [tok, { name: 'F_삼성1캠프', rot: 'D1,D2', parent: camps['서초1캠프'] }]);
// 서버: 전월 물량 자료를 흉내 (routeVolumes_ 를 바꿔 끼움) → 상위 캠프 잇기 · 직함 확인
const RV = "routeVolumes_ = function () { return { ok: true, pm: '2026-10', vol: { '서초1|204A': { avg: 168, wd: [null, 150, 160, 165, 170, 175, 180] }, '강서1|527B': { avg: 182, wd: [] }, '서초1|999Z': { avg: 0, wd: [] } } }; };";
const m = JSON.parse(ev(RV + " JSON.stringify(myVolMap_())"));
ok(m.on && m.month === '2026-10' && m.vol['서초1|204A'].a === 168 && m.vol['서초1|204A'].w[5] === 175, '1 평균 · 요일별 평균이 내려감');
ok(m.vol['F_삼성1|204A'] && m.vol['F_삼성1|204A'].a === 168 && m.vol['F_삼성1|204A'].from === '서초1', '2 하위 캠프(F_삼성1)는 상위 캠프(서초1) 노선 수량으로');
ok(!m.vol['서초1|999Z'], '3 평균 0 인 노선은 안 내려감 (정보 없음)');
const m2 = JSON.parse(ev(RV + " rlnEdges_ = function () { return [{ kind: '개명', fromCamp: '서초1', fromCode: '204A', toCamp: 'F_삼성1', toCode: '304A' }, { kind: '개명', fromCamp: '강서1', fromCode: '527B', toCamp: '강서1', toCode: '627B' }]; }; JSON.stringify(myVolMap_())"));
ok(m2.vol['강서1|627B'] && m2.vol['강서1|627B'].a === 182 && m2.vol['강서1|627B'].from === '강서1|527B', '3-1 노선 코드가 바뀌면(계보 개명) 옛 코드 수량을 새 코드로');
ok(m2.vol['F_삼성1|304A'] && m2.vol['F_삼성1|304A'].a === 168, '3-2 캠프 이관 + 코드 변경도 계보대로 (서초1 204A → F_삼성1 304A)');
ok(/if \(!u\.info\.title\) return \{ ok: true, on: false/.test(fs.readFileSync(path.join(SRC, 'RoutePerf.gs'), 'utf8')), '4 기사앱: 직함 없는 기사에게는 꺼짐(on:false)');
call('adm_createDriver', [tok, { name: '일반기사', loginId: 'id1@df', driverType: '고정', phone: '010-3000-1001', schCampId: camps['서초1캠프'], baseRoute: '204A' }]);
call('adm_createDriver', [tok, { name: '운영기사', loginId: 'id2@df', driverType: '고정', title: '운영자', phone: '010-3000-1002', schCampId: camps['서초1캠프'], baseRoute: '204A' }]);
const ds = call('adm_listDrivers', [tok]).rows;
const t1 = ev("driverInfo_(" + JSON.stringify(ds.find((d) => d.name === '일반기사').id) + ").title"), t2 = ev("driverInfo_(" + JSON.stringify(ds.find((d) => d.name === '운영기사').id) + ").title");
ok(!t1 && t2 === '운영자', '5 직함: 일반기사 없음 · 운영기사 운영자 (' + JSON.stringify([t1, t2]) + ')');
const av = ev(RV + ' adm_myVol(' + JSON.stringify(tok) + ')'), bad = ev(RV + " adm_myVol('nope')");
ok(av && av.ok === true && av.on === true && !!av.vol['강서1|527B'] && !(bad && bad.on), '6 관리자앱 함수: 로그인한 관리자만 받음');
// 화면(기사앱): volOfDay 를 꺼내 계산 확인
const html = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
const src = html.slice(html.indexOf('  function volOfDay('), html.indexOf('  const volMonthTxt'));
const mk = (routes) => new Function('VOL', 'dayRoutes', src + '; return volOfDay;')({ month: '2026-10', vol: m.vol }, () => routes);
let L = mk([{ camp: 'F_삼성1', code: '204A' }])({}, '2026-11-20'); // 금요일
ok(L[0].q === 175 && L[0].wd === true, '7 그날 요일(금) 평균 175');
L = mk([{ camp: 'F_삼성1', code: '204A' }])({}, '2026-11-22'); // 일요일: 요일 기록 없음
ok(L[0].q === 168 && L[0].wd === false, '8 요일 기록이 없으면 하루 평균 168');
L = mk([{ camp: '강서1', code: '527B' }, { camp: '강서1', code: '111A' }])({}, '2026-11-20');
ok(L[0].q === 182 && L[1].q === null, '9 정보 없는 노선은 null → "해당 정보가 없습니다."');
L = mk([{ camp: '', code: '527B' }])({}, '2026-11-20');
ok(L[0].q === 182, '10 캠프를 모르면 노선 코드가 하나뿐일 때 그 수량');
ok(/해당 정보가 없습니다\./.test(html) && /volBox\(r, d\) \+ peakBox\(r, d\)/.test(html) && /volChip\(r, d\)/.test(html), '11 기사앱: 그날 카드 + 달력 칸에 표시');
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/vqmBox\(r, d, rt\) \+ pkmBox\(r, d\)/.test(adm) && /api\('adm_myVol'\)/.test(adm), '12 관리자앱 휴대폰: 그날 카드에 표시');
