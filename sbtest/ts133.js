// (S133) 노선관리: 노선 고치기(번호 · 캠프 바꾸기)로 기사 기본노선 · 노선 변경 예약이 갈 곳을 잃지 않게 막기,
//  212AB 가 A 를 맡고 있으면 212A 지우기는 됨, 서브캠프가 있는 상위 캠프 지우기 막기,
//  노선 이관 때 새 캠프에 같은 번호가 있어도 없는 글자 노선을 만듦, 해 넘김 수행률 파일(WK52 · WK53 · WK1) 주차 · 연도 맞게
//  사용: node sbtest/ts133.js <runner-allinone 폴더>
const path = require('path'), fs = require('fs');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', STL_IDS_V2: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-21T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
['군포1캠프', '서초1캠프', 'F_삼성1캠프'].forEach((n) => call('adm_campSave', [tok, { name: n, rot: 'D1,D2' }]));
const cs = () => call('adm_routeAll', [tok]).camps, C = {}; cs().forEach((c) => { C[c.name] = c.id; });
['212A', '213B', '212AB', '214C'].forEach((r) => call('adm_routeSave', [tok, { campId: C['군포1캠프'], code: r }]));
call('adm_routeSave', [tok, { campId: C['서초1캠프'], code: '404A' }]);
call('adm_createDriver', [tok, { name: '기사A', loginId: 'adrv01', driverType: '고정', phone: '010-4000-2010', schCampId: C['군포1캠프'], baseRoute: '213B' }]);
call('adm_createDriver', [tok, { name: '기사B', loginId: 'bdrv01', driverType: '고정', phone: '010-4000-2011', schCampId: C['서초1캠프'], baseRoute: '404A' }]);
const DR = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { DR[d.name] = d.id; });
const R = () => { const m = {}; call('adm_routeAll', [tok]).routes.forEach((r) => { m[r.campId + '|' + r.code] = r; }); return m; };
// 1) 기사 기본노선 213B → 노선 번호를 213C 로 고치기: 막혀야 함
let r = R()[C['군포1캠프'] + '|213B'];
let x = call('adm_routeSave', [tok, { id: r.id, seen: r.updatedAt, code: '213C' }]);
ok(!x.ok && /기본노선인 기사/.test(x.msg), '1 기본노선 노선 번호 바꾸기 막음 (' + (x.ok ? '바뀜' : x.msg.slice(0, 30)) + ')');
// 2) 기사B 가 12/1 부터 군포1 214C 로 가는 예약 → 214C 를 서초1캠프로 옮기기: 막혀야 함
x = call('adm_rcSave', [tok, { driverId: DR['기사B'], date: '2026-12-01', toCampId: C['군포1캠프'], toRoute: '214C' }]);
r = R()[C['군포1캠프'] + '|214C'];
x = call('adm_routeSave', [tok, { id: r.id, seen: r.updatedAt, campId: C['서초1캠프'] }]);
ok(!x.ok && /노선 변경 예약/.test(x.msg), '2 예약이 가는 노선 다른 캠프로 옮기기 막음 (' + (x.ok ? '옮겨짐' : x.msg.slice(0, 30)) + ')');
// 3) 212AB 가 A 를 맡으니 212A 지우기는 됨 (기사Z 기본노선 212A)
call('adm_createDriver', [tok, { name: '기사Z', loginId: 'zdrv01', driverType: '고정', phone: '010-4000-2012', schCampId: C['군포1캠프'], baseRoute: '212A' }]);
x = call('adm_routeDelete', [tok, [R()[C['군포1캠프'] + '|212A'].id]]);
ok(x.ok, '3 212AB 가 있으면 212A 지우기 됨 (' + (x.ok ? '됨' : x.msg.slice(0, 30)) + ')');
x = call('adm_routeDelete', [tok, [R()[C['군포1캠프'] + '|212AB'].id]]);
ok(!x.ok, '3b 마지막 212AB 지우기는 막음');
// 4) 서브캠프가 있는 상위 캠프 지우기 막기
call('adm_campSave', [tok, { name: '빈캠프', rot: 'D1' }]);
const sc2 = cs().find((c) => c.name === '빈캠프'); x = call('adm_campSave', [tok, { id: sc2.id, name: sc2.name, parent: C['F_삼성1캠프'], seen: sc2.updatedAt }]); if (!x.ok) console.log('서브캠프 만들기 실패', x.msg);
x = call('adm_campDelete', [tok, C['F_삼성1캠프']]);
ok(!x.ok && /서브캠프/.test(x.msg), '4 서브캠프가 있는 상위 캠프 지우기 막음 (' + (x.ok ? '지워짐' : x.msg.slice(0, 30)) + ')');
// 5) 노선 이관: 서초1 404A → 군포1 212 (군포1 에 212AB 만 있음 · 글자 A 는 있음) / 군포1 214C → 서초1 404 (404A 만 있음 → 404C 새로)
call('adm_rcMove', [tok, { fromCampId: C['군포1캠프'], fromNum: '214', toCampId: C['서초1캠프'], toNum: '404', date: '2026-11-25' }, false]);
const has404C = !!R()[C['서초1캠프'] + '|404C'];
ok(has404C, '5 이관 때 새 캠프에 없는 글자 노선(404C) 만듦');
const pend = J("rcRows_(true).filter(function(c){return c.status===RCS.WAIT && c.driverId;}).map(function(c){return [c.toCampId,c.toRoute];})");
const codesOf = (cid) => Object.values(R()).filter((r) => r.campId === cid).map((r) => r.code);
const lost = pend.filter((p) => !codesOf(p[0]).some((c) => c.replace(/\d+/, (n) => n) === p[1] || (c.match(/^\d+/) || [''])[0] === (p[1].match(/^\d+/) || [''])[0] && [...p[1].replace(/^\d+/, '')].every((ch) => c.includes(ch))));
ok(!lost.length, '5b 예약이 가는 노선이 다 있음 (' + JSON.stringify(lost) + ')');
// 6) 해 넘김 수행률 파일: WK52 · WK53 · WK1 (2027-01-05 파일) → WK1 이 최신, WK53 · WK52 는 2026 년
const A = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const grab = (name) => { const i = A.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = A.indexOf('{', i); for (; j < A.length; j++) { if (A[j] === '{') d++; else if (A[j] === '}' && --d === 0) break; } return A.slice(i, j + 1); };
const code = grab('rpWkBack') + '\n' + grab('parsePerfSheet') + '\nreturn { parsePerfSheet: parsePerfSheet, back: typeof rpWkBack === "function" ? rpWkBack : null };';
const M = new Function(code)();
const head = ['Wave', 'Camp', 'Route', 'WK52', 'WK53', 'WK1'], grp = ['', '', '', '배송 수행률', '', ''];
const P = M.parsePerfSheet([{ name: 's', rows: [['수행률 안내'], grp, head, ['D1', '군포1', '212A', 0.99, 0.98, 0.97]] }], '수행률_20270105.xlsx');
ok(P.wk === 1, '6 해 넘김 파일 최신 주차 = WK1 (지금 ' + P.wk + ')');
const save = (r) => M.back ? M.back(P.year, P.wk, r.ago) : { wk: r.wk, year: P.year };
const got = P.rows.map((r) => { const t = save(r); return t.year + '-W' + t.wk; }).sort().join(',');
ok(got === '2026-W52,2026-W53,2027-W1', '6b 지난 주차는 지난해로 저장 (' + got + ')');
const P2 = M.parsePerfSheet([{ name: 's', rows: [['수행률 안내 WK44'], ['', '', '', '배송 수행률', ''], ['Wave', 'Camp', 'Route', 'WK43', 'WK44'], ['D1', '군포1', '212A', 0.99, 0.98]] }], '수행률_20261103.xlsx');
const got2 = P2.rows.map((r) => { const t = save.call(null, r); return t; });
const got2b = P2.rows.map((r) => { const t = M.back ? M.back(P2.year, P2.wk, r.ago) : { wk: r.wk, year: P2.year }; return t.year + '-W' + t.wk; }).sort().join(',');
ok(got2b === '2026-W43,2026-W44', '6c 보통 파일은 그대로 (' + got2b + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
