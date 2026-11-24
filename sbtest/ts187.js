// (S187) 쿠팡 업로드 표: 회전 없이 노선만 적힌 칸 + 같은 노선을 다른 사람이 일부 회전으로 맡음 → 남은 회전만 (배만호 527B D1,D2 · 유정근 527B → F3)
//  사용: node sbtest/ts187.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-24T08:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2,F3' }]);
const C1 = call('adm_routeAll', [tok]).camps[0].id;
['527B', '529A', '529B'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));
const NM = { B: '배만호', Y: '유정근', K: '계동희', H: '황의식' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'up01', driverType: ['백업', '백업', '고정', '백업'][i], phone: '010-4100-20' + (10 + i), schCampId: C1, baseRoute: ['', '', '529AB', ''][i] }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const DT = '2026-11-29', DT2 = '2026-11-30', DT3 = '2026-12-01';
call('adm_schSave', [tok, [
  { row: D.B, date: DT, value: '강서1 527B (D1,D2)', old: '' }, { row: D.Y, date: DT, value: '강서1 527B', old: '' }, { row: D.K, date: DT, value: '출근', old: '' },
  { row: D.B, date: DT2, value: '강서1 527B (D1,D2)', old: '' }, { row: D.Y, date: DT2, value: '강서1 527B (F3)', old: '' },
  { row: D.B, date: DT3, value: '강서1 527B', old: '' }, { row: D.Y, date: DT3, value: '강서1 527B', old: '' }]]);
const up = call('adm_schUploadTable', [tok, '2026-11-29', '4w']);
const rows = [].concat.apply([], up.weeks || []);
const R = (d, id) => rows.filter((x) => String(x[0]) === d && String(x[4]) === id).map((x) => x[6] + ' ' + x[7]).join(' | ');
ok(R(DT, 'bup01') === 'D1,D2 527B', '1 배만호 527B D1,D2 그대로 (' + R(DT, 'bup01') + ')');
ok(R(DT, 'yup01') === 'F3 527B', '2 유정근 (회전 없이 527B) → 남은 F3 만 (' + R(DT, 'yup01') + ')');
ok(R(DT, 'kup01') === 'D1,D2,F3 529A,529B', '3 다른 노선 기사는 그대로 (' + R(DT, 'kup01') + ')');
ok(R(DT2, 'yup01') === 'F3 527B' && R(DT2, 'bup01') === 'D1,D2 527B', '4 둘 다 회전을 적은 날은 적힌 그대로');
ok(R(DT3, 'bup01') === 'D1,D2,F3 527B' && R(DT3, 'yup01') === 'D1,D2,F3 527B' && (up.dups || []).some((x) => String(x[0]) === DT3), '5 둘 다 회전 없이 같은 노선 → 예전처럼 중복으로 잡힘');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
