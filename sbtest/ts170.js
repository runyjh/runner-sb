// (S170) 품앗이 목록: 최근 올라온 일감이 맨 위 · 지난 날짜는 맨 아래
//  사용: node sbtest/ts170.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-21T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { P: '기사P', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'pm01', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '', carName: o.name === '기사P' ? '봉고3 하이탑' : '포터2' }); }); 1"); // 자격증 번호 없음
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });




let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-24', value: '212A', old: '' }, { row: D.P, date: '2026-11-28', value: '212A', old: '' }]]);
const a = call('api_pmGive', [T.P, { date: '2026-11-28', codes: ['212A'] }]).ids[0]; // 늦은 날짜 · 먼저 올림
const b = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['212A'] }]).ids[0]; // 빠른 날짜 · 나중에 올림
ev("writeFields_(SH.PJOB, findRow_(SH.PJOB, 'id', '" + a + "'), { createdAt: '2026-11-21 09:00:00' }); writeFields_(SH.PJOB, findRow_(SH.PJOB, 'id', '" + b + "'), { createdAt: '2026-11-21 09:30:00' }); pmTouch_(); 1");
let l = call('api_pmList', [T.B, {}]).jobs.map((j) => j.id);
ok(l.indexOf(b) === 0 && l.indexOf(a) === 1, '1 나중에 올린 일감(11/24)이 위 · 먼저 올린 일감(11/28)이 아래');
ev("writeFields_(SH.PJOB, findRow_(SH.PJOB, 'id', '" + a + "'), { createdAt: '2026-11-21 09:50:00' }); pmTouch_(); 1");
l = call('api_pmList', [T.B, {}]).jobs.map((j) => j.id);
ok(l.indexOf(a) === 0, '2 더 최근에 올린 일감이 맨 위');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
