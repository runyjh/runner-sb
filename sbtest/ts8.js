// S12 노선 이관: 백업 기사 같이 옮기기 · 이관 취소 때 이관이 만든 노선 정지 (TZ=UTC)
//  사용: node sbtest/ts8.js <runner-allinone 폴더(src 가 있는 곳)>
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
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
['404ABCD', '410AB'].forEach((code) => call('adm_routeSave', [tok, { campId: camps['서초1캠프'], code }]));
// 기사: 고정 1 · 백업 2 (하나만 같이 옮김) · 퇴사 백업 1 (목록에 안 나와야 함)
const mk = (name, type, base, extra) => call('adm_createDriver', [tok, Object.assign({ name, loginId: name + '@df', driverType: type, phone: '010-2000-' + String(1000 + name.length * 37).slice(-4), schCampId: camps['서초1캠프'], baseRoute: base }, extra || {})]);
[['고정가', '고정', '404ABC'], ['백업나', '백업', '백업'], ['백업다', '백업', '백업'], ['백업라', '백업', '백업']].forEach((x) => mk(x[0], x[1], x[2]));
const LD = call('adm_listDrivers', [tok]); 
const drv = {}; LD.rows.forEach((d) => { drv[d.name] = d.id; });
ev("(function () { const o = driverById_('" + drv['백업라'] + "'); writeFields_(SH.DRIVERS, o._row, { workStatus: '퇴사' }); })()");
// 백업나 칸: 이관 전날 · 이관날부터 여러 모양
const cells = [[DB, '404ABC'], [D0, '404ABC'], [D1, '410AB'], [D2, '강서1 529A'], [D3, '휴무']];
call('adm_schSave', [tok, cells.map(([d, v]) => ({ row: drv['백업나'], date: d, value: v, old: '' })).concat([{ row: drv['백업다'], date: D1, value: '410AB', old: '' }])]);
// 1. 미리보기: 같이 옮길 수 있는 백업 = 백업나 · 백업다 (퇴사 제외)
const f = { fromCampId: camps['서초1캠프'], fromNum: '404', toCampId: camps['F_삼성1캠프'], toNum: '204', date: D0, copyPrice: false };
let r = call('adm_rcMove', [tok, f, true]);
const plan = r;
ok(plan.ok && plan.drivers.map((x) => x.name).join() === '고정가', '1 미리보기: 바뀌는 고정 기사 ' + plan.drivers.map((x) => x.name).join());
ok((plan.backups || []).map((x) => x.name).sort().join() === '백업나,백업다', '  같이 옮길 수 있는 백업 ' + (plan.backups || []).map((x) => x.name + '(' + x.base + ')').join(' · ') + ' (퇴사 백업 빠짐)');
// 2. 실제: 백업나만 같이
r = call('adm_rcMove', [tok, Object.assign({}, f, { backups: [drv['백업나'], 'XXX'] }), false]);
ok(r.ok && r.made.sort().join() === '고정가,백업나', '2 이관 예약: 옮긴 기사 ' + (r.made || []).join() + ' (모르는 번호 XXX 는 무시)');
const rc = ev("rcRows_(true).filter(function (c) { return c.kind === RCK.DRV && c.status === RCS.WAIT; }).map(function (c) { return [c.name, c.toCamp, c.toRoute, c.date, !!c.parentId]; })");
const bk = rc.find((x) => x[0] === '백업나');
ok(bk && bk[1] === 'F_삼성1캠프' && bk[2] === '백업' && bk[3] === D0 && bk[4], '  백업나 → F_삼성1캠프 · 기본노선 백업 그대로 · 적용일 ' + D0 + ' · 이관에 묶임 ' + JSON.stringify(bk));
ok(!rc.some((x) => x[0] === '백업다'), '  고르지 않은 백업다는 그대로');
const sch = call('adm_schRange', [tok, DB, D3]).cells;
const got = cells.map(([d]) => sch[drv['백업나']][d]);
ok(JSON.stringify(got) === JSON.stringify(['404ABC', '204ABC', '서초1 410AB', '강서1 529A', '휴무']), '3 백업나 칸: ' + got.join(' | ') + ' (이관 전날 그대로 · 옮긴 번호는 새 번호 · 옛 캠프 다른 노선은 캠프 이름 붙임)');
ok(sch[drv['백업다']][D1] === '410AB', '  안 옮긴 백업다 칸 그대로: ' + sch[drv['백업다']][D1]);
// 4. 취소: 묶인 기사 예약 같이 취소 · 이관이 만든 F_삼성1 204 노선 정지
const mvId = r.moveId;
r = call('adm_rcCancel', [tok, mvId]);
ok(r.ok && r.cancelled === 3 && r.stopped === 1, '4 이관 취소: 예약 ' + r.cancelled + '건 취소 · 이관이 만든 노선 ' + r.stopped + '개 정지');
const rt = call('adm_routeAll', [tok]).routes.filter((x) => x.campId === camps['F_삼성1캠프']).map((x) => x.code + ':' + x.status);
ok(rt.join() === '204ABCD:정지', '  F_삼성1 노선 ' + rt.join());
const old = call('adm_routeAll', [tok]).routes.filter((x) => x.campId === camps['서초1캠프']).map((x) => x.code + ':' + x.status);
ok(old.join() === '404ABCD:사용,410AB:사용', '  서초1 노선 그대로 ' + old.join());
// 5. 같은 노선을 쓰는 다른 이관이 있으면 정지하지 않음
call('adm_routeSave', [tok, { campId: camps['서초1캠프'], code: '405AB' }]);
const a1 = call('adm_rcMove', [tok, { fromCampId: camps['서초1캠프'], fromNum: '405', toCampId: camps['F_삼성1캠프'], toNum: '205', date: D0 }, false]);
const a2 = call('adm_rcMove', [tok, { fromCampId: camps['서초1캠프'], fromNum: '410', toCampId: camps['F_삼성1캠프'], toNum: '205', date: D1 }, false]);
r = call('adm_rcCancel', [tok, a2.moveId]);
ok(a1.ok && a2.ok && r.ok && r.stopped === 0, '5 같은 새 노선(205)을 쓰는 다른 이관이 남아 있으면 정지 안 함 (stopped ' + r.stopped + ')');
// 6. S13: 두 번호를 같이 맡은 기사 (404D,405AB) — 404 이관 뒤 405 이관을 하면 같은 예약의 405AB 도 205AB 로
{
  call('adm_campSave', [tok, { name: '양재1캠프', rot: 'D1,D2' }]); call('adm_campSave', [tok, { name: 'G_삼성2캠프', rot: 'D1,D2' }]);
  const cc = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { cc[c.name] = c.id; });
  ['606ABCD', '607ABCD'].forEach((code) => call('adm_routeSave', [tok, { campId: cc['양재1캠프'], code }]));
  mk('둘다맡음', '백업', '606D,607AB', { schCampId: cc['양재1캠프'] });
  const id2 = call('adm_listDrivers', [tok]).rows.find((d) => d.name === '둘다맡음').id;
  const m1 = call('adm_rcMove', [tok, { fromCampId: cc['양재1캠프'], fromNum: '606', toCampId: cc['G_삼성2캠프'], toNum: '306', date: D0 }, false]);
  const p2 = call('adm_rcMove', [tok, { fromCampId: cc['양재1캠프'], fromNum: '607', toCampId: cc['G_삼성2캠프'], toNum: '307', date: D0 }, true]);
  ok(m1.ok && p2.ok && p2.drivers.some((x) => x.name === '둘다맡음' && x.to === '306D,307AB'), '6 두 번째 이관 미리보기에 둘다맡음 306D,607AB → ' + JSON.stringify(p2.drivers.map((x) => x.name + ':' + x.to)));
  const m2 = call('adm_rcMove', [tok, { fromCampId: cc['양재1캠프'], fromNum: '607', toCampId: cc['G_삼성2캠프'], toNum: '307', date: D0 }, false]);
  const w = ev("rcRows_(true).filter(function (c) { return c.driverId === '" + id2 + "' && c.status === RCS.WAIT; }).map(function (c) { return c.toCamp + ' ' + c.toRoute; })");
  ok(m2.ok && w.length === 1 && w[0] === 'G_삼성2캠프 306D,307AB', '  예약 한 줄로 G_삼성2캠프 306D,307AB ' + JSON.stringify(w));
}
