// S31 쿠팡 업로드: 회전이 같은 노선만 맡은 사람은 적힌 그대로 (임동준 527B D1,D2 · 황의식 527B F3) · 회전이 섞인 줄은 많은 쪽만 올리고 나머지는 그 노선 다른 사람 줄에 합침 (TZ=UTC)
//  사용: node sbtest/ts23.js <runner-allinone 폴더>
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
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const D0 = addDays(today, 3), DB = addDays(today, 1), D1 = addDays(today, 4), D2 = addDays(today, 5), D3 = addDays(today, 6);
// 캠프 · 노선
call('adm_campSave', [tok, { name: '서초1캠프', rot: 'D1,D2' }]); call('adm_campSave', [tok, { name: 'F_삼성1캠프', rot: 'D1,D2' }]);
call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2,F3' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_routeSave', [tok, { campId: camps['강서1캠프'], code: '527B' }]); call('adm_routeSave', [tok, { campId: camps['강서1캠프'], code: '530AB' }]);
const mk = (name, type, base, i) => call('adm_createDriver', [tok, { name, loginId: 'id' + i + '@df', driverType: type, phone: '010-3000-100' + i, schCampId: camps['강서1캠프'], baseRoute: base }]);
mk('임동준', '백업', '백업', 1); mk('황의식', '백업', '백업', 2); mk('홍종현', '고정', '530AB', 3);
const drv = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { drv[d.name] = d; });
const A = addDays(today, 2), B = addDays(today, 3), C = addDays(today, 4);
call('adm_schSave', [tok, [
  { row: drv['임동준'].id, date: A, value: '527B (D1,D2)', old: '' }, { row: drv['황의식'].id, date: A, value: '527B (F3)', old: '' }, { row: drv['홍종현'].id, date: A, value: '출근', old: '' },
  { row: drv['임동준'].id, date: B, value: '527B (D1,D2)', old: '' }, { row: drv['황의식'].id, date: B, value: '527B(F3),530AB', old: '' }, { row: drv['홍종현'].id, date: B, value: '휴무', old: '' },
  { row: drv['임동준'].id, date: C, value: '527B (D1,D2)', old: '' }, { row: drv['황의식'].id, date: C, value: '휴무', old: '' }]]);
const up = call('adm_schUploadTable', [tok, A, '4w']);
const rows = [].concat(...up.weeks), at = (d, who) => rows.filter((r) => r[0] === d && r[10] === who);
const t = (r) => r ? r.slice(6, 9).join(' / ') : '(없음)';
const a1 = at(A, '임동준')[0], a2 = at(A, '황의식')[0];
ok(a1 && a1[7] === '527B' && a1[6] === 'D1,D2' && !/미입차/.test(a1[8]) && a2 && a2[7] === '527B' && a2[6] === 'F3' && !/미입차/.test(a2[8]), '1 적힌 그대로: 임동준 ' + t(a1) + ' · 황의식 ' + t(a2));
ok(!up.dups.some((r) => String(r[0]) === A) && !up.missing.some((r) => String(r[0]) === A && /527/.test(r[7])), '2 527B 중복 · 미입차 없음');
const b1 = at(B, '임동준')[0], b2 = at(B, '황의식')[0];
ok(b2 && b2[7] === '530A,530B' && b2[6] === 'D1,D2,F3' && /표시: 527B\(F3\)/.test(b2[8]) && b1 && b1[7] === '527B' && b1[6] === 'D1,D2,F3' && /표시: 527B\(D1,D2\)/.test(b1[8]), '3 황의식 527B(F3),530AB (회전이 섞임) → 황의식 ' + t(b2) + ' · 뺀 F3 는 임동준 줄에 합침 ' + t(b1));
ok(!up.missing.some((r) => String(r[0]) === B && /527|530/.test(r[7])), '4 그날 527B · 530AB 미입차 없음');
const c1 = at(C, '임동준')[0];
ok(c1 && c1[7] === '527B' && c1[6] === 'D1,D2' && /미입차\(F3\)/.test(c1[8]) && up.missing.some((r) => String(r[0]) === C && /527B/.test(r[7]) && r[6] === 'F3'), '5 혼자 나눠 맡은 날(황의식 휴무) → 임동준 ' + t(c1) + ' · F3 미입차 줄');
