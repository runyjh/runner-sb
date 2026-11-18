// S25 상위 캠프(서브캠프): F_삼성1 → 서초1 · 정산서가 서초1 로 와도 F_삼성1 노선 단가 · 업로드는 F_삼성1 그대로 (TZ=UTC)
//  사용: node sbtest/ts19.js <runner-allinone 폴더>
const path = require('path');
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
const today = ev('todayText_()');
call('adm_campSave', [tok, { name: '서초1캠프', rot: 'D1,D2' }]); call('adm_campSave', [tok, { name: 'F_삼성1캠프', rot: 'D1,D2' }]); call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2,F3' }]);
const C = () => { const o = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { o[c.name] = c; }); return o; };
let cp = C();
call('adm_routeSave', [tok, { campId: cp['F_삼성1캠프'].id, code: '204ABCD' }]); call('adm_routeSave', [tok, { campId: cp['서초1캠프'].id, code: '410AB' }]);
call('adm_routeSave', [tok, { campId: cp['강서1캠프'].id, code: '204A' }]);
const ps = call('adm_priceSave', [tok, cp['F_삼성1캠프'].id, [{ num: '204', level: '2', value: 'D', p1: 1000, p2: 900 }]]);
// 1. 상위 캠프 저장 · 규칙
const s1 = call('adm_campSave', [tok, { id: cp['F_삼성1캠프'].id, name: 'F_삼성1캠프', rot: 'D1,D2', parent: cp['서초1캠프'].id, seen: cp['F_삼성1캠프'].updatedAt }]);
cp = C();
ok(s1.ok && cp['F_삼성1캠프'].parent === cp['서초1캠프'].id && !cp['서초1캠프'].parent, '1 F_삼성1 의 상위 캠프 = 서초1 (저장 · 노선관리 목록에 보임)');
const bad1 = call('adm_campSave', [tok, { id: cp['서초1캠프'].id, name: '서초1캠프', rot: 'D1,D2', parent: cp['강서1캠프'].id, seen: cp['서초1캠프'].updatedAt }]);
const bad2 = call('adm_campSave', [tok, { id: cp['강서1캠프'].id, name: '강서1캠프', rot: 'D1,D2,F3', parent: cp['F_삼성1캠프'].id, seen: cp['강서1캠프'].updatedAt }]);
ok(bad1.ok === false && bad2.ok === false, '2 한 단계만: 서브캠프가 있는 캠프는 서브가 못 되고, 서브캠프 아래로는 못 붙임');
// 3. 정산 단가: 정산서에 '서초1' 로 찍혀 와도 F_삼성1 의 204D 를 찾음 · F_삼성1 로 와도 그대로
const f1 = ev("(function(){ var I = stlPriceIndex_(); var a = I.find('서초1', '204D'), b = I.find('F_삼성1', '204D'), c = I.find('서초1', '410A'), d = I.find('강서1', '204A'); return { a: a.camp && a.camp.name, ar: !!a.row, ak: a.routeKnown, b: b.camp && b.camp.name, br: !!b.row, c: c.camp && c.camp.name, ck: c.routeKnown, d: d.camp && d.camp.name }; })()");
ok(ps.ok !== false && f1.a === 'F_삼성1캠프' && f1.ar && f1.ak && f1.b === 'F_삼성1캠프' && f1.br, '3 정산서 캠프가 서초1 이든 F_삼성1 이든 204D 단가를 F_삼성1 에서 찾음 (' + f1.a + ')');
ok(f1.c === '서초1캠프' && f1.ck && f1.d === '강서1캠프', '4 상위 캠프 자기 노선 · 다른 캠프(강서1 204A)는 그대로');
// 5. 쿠팡 업로드는 F_삼성1 이름 그대로
call('adm_createDriver', [tok, { name: '김기화', loginId: 'k1@df', driverType: '고정', phone: '010-3000-1001', schCampId: cp['F_삼성1캠프'].id, baseRoute: '204ABC' }]);
const id = call('adm_listDrivers', [tok]).rows.find((d) => d.name === '김기화').id;
const A = (() => { const x = new Date(today + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 2); return x.toISOString().slice(0, 10); })();
call('adm_schSave', [tok, [{ row: id, date: A, value: '출근', old: '' }]]);
const up = call('adm_schUploadTable', [tok, A, '4w']); const r = [].concat(...up.weeks).find((x) => x[0] === A && x[10] === '김기화') || [];
ok(up.ok && r[2] === 'F_삼성1', '5 쿠팡 어드민 업로드 캠프 = ' + r[2]);
// 6. 기사스케줄 자료에 상위 캠프가 실려 감 (화면 정렬 · 필터용)
const sr = call('adm_schRange', [tok, A, A]); const sc = (sr.camps || []).find((c) => c.name === 'F_삼성1캠프') || {};
ok(sr.ok !== false && sc.parent === cp['서초1캠프'].id, '6 기사스케줄 캠프 목록에 상위 캠프');
// 7. 화면: 정렬 열쇠 · 필터
const fs = require('fs'), H = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const key = new Function(H.match(/const campSortKey = [^\n]*/)[0] + ' return campSortKey;')();
const L = [{ id: 'a', name: '서초1캠프' }, { id: 'b', name: 'F_삼성1캠프', parent: 'a' }, { id: 'c', name: '수원1캠프' }, { id: 'd', name: '강서1캠프' }];
const sorted = L.slice().sort((x, y) => key(x, L).localeCompare(key(y, L), 'ko')).map((x) => x.name);
ok(sorted.join(',') === '강서1캠프,서초1캠프,F_삼성1캠프,수원1캠프', '7 기사스케줄 · 노선관리 정렬: 서초1 바로 아래 F_삼성1 (' + sorted.join(' · ') + ')');
ok(/camps\[d\.campId\]\.parent === sf\.camp/.test(H), '8 캠프 고르기에서 서초1 → F_삼성1 기사도 같이');
