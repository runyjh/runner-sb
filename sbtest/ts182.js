// (S182) 관리자 품앗이 일감 창 · 목록 = 러너 내부용 말과 칸: 최근 한 달 하루 평균 (코드별 + 합계) · 사무실 대신 등록 표시 · 신청 말 · 등록 창 내부용 칸
//  사용: node sbtest/ts182.js <runner-allinone 폴더>
const path = require('path');
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
KDate.__setClock(() => Date.parse('2026-11-23T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const C1 = call('adm_routeAll', [tok]).camps[0].id;
['212C', '212D'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));
['A', 'B'].forEach((k, i) => call('adm_createDriver', [tok, { name: '기사' + k, loginId: k.toLowerCase() + 'drv01', driverType: '고정', phone: '010-4000-20' + (10 + i), schCampId: C1, baseRoute: '212C' }]).msg && console.log('cd', k));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { D[d.name.slice(-1)] = d.id; });
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const dates = []; for (let t = Date.parse('2026-10-26T00:00:00Z'); t <= Date.parse('2026-11-22T00:00:00Z'); t += 864e5) dates.push(new Date(t).toISOString().slice(0, 10));
const raw = []; dates.forEach((d) => { raw.push(['배송', 'adrv01', '212C', d, '군포1캠프', '일반', '러너', 160, 0, 1000, 0, 160000, 0, 160000, 0]); raw.push(['배송', 'adrv01', '212D', d, '군포1캠프', '일반', '러너', 145, 0, 1000, 0, 145000, 0, 145000, 0]); });
call('adm_stlImport', [tok, { month: '2026-11', round: 1, file: 't.xlsx', raw, loss: [] }]);
const meta = call('adm_pmMeta', [tok]);
ok(meta.ok && meta.extOn === false, '1 등록 창 정보에 내부용 표시 (extOn=' + meta.extOn + ')');
const cr = call('adm_pmCreate', [tok, { posterId: D.A, date: '2026-11-26', kind: '야간', campId: C1, route: '212CD', price: 1100, pay: '러너 정산서', useId: '받는 기사 아이디', mode: 'open' }]);
ok(cr.ok, '2 사무실 대신 등록 (모집) ' + (cr.msg || ''));
const L = call('adm_pmList', [tok, {}]);
const lj = (L.jobs || []).filter((j) => j.route === '212CD')[0] || {};
ok(lj.vq === '305개' && /\S/.test(lj.office || ''), '3 목록: 최근 한 달 하루 평균 · 사무실 등록 (' + lj.vq + ' / ' + lj.office + ')');
const J1 = call('adm_pmJob', [tok, lj.id]);
const parts = ((J1.job || {}).vqs || []).map((p) => p.c + ':' + p.q).join(',');
ok(J1.ok && parts === '212C:160,212D:145' && J1.extOn === false && /\S/.test(J1.job.office || ''), '4 일감 창: 코드별 하루 평균 (' + parts + ') · 내부용 · 사무실 (' + (J1.job || {}).office + ')');
// 신청 취소 알림 말 (내부용)
const msg = J("PM_ALERT_TEXT.cancel({ date: '2026-11-26', camp: '군포1캠프', route: '212CD', kind: '야간' }, '기사B')");
ok(Array.isArray(msg) && msg[0] === '신청 취소' && /신청을 취소/.test(msg[1]), '5 내부용 알림 말: ' + JSON.stringify(msg));
// 외부용 켜면 예전 말
ev("appSetPut_('pmExtOn', 'ON', ''); 1");
const msg2 = J("PM_ALERT_TEXT.cancel({ date: '2026-11-26', camp: '군포1캠프', route: '212CD', kind: '야간' }, '기사B')");
ok(msg2[0] === '지원 취소' && call('adm_pmMeta', [tok]).extOn === true, '6 외부용은 예전 말 (' + msg2[0] + ')');
// 화면 글: 관리자 · 기사앱에 내부용 말이 들어 있음
const fs = require('fs'), adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/물량 \(최근 한 달 하루 평균\)/.test(adm) && /'맡긴 기사'/.test(adm) && /합계 /.test(adm) && /pmc-x/.test(adm), '7 관리자 화면: 최근 한 달 하루 평균 · 맡긴 기사 · 합계 · 등록 창 내부용 칸 숨김');
ok(/신청하면 바로 확정/.test(idx) && !/먼저 누른 기사님으로 바로 확정됩니다\. 같은 기사님이/.test(idx), '8 기사앱: 사무실 = 신청하면 바로 확정 · 예전 「먼저 누른 기사님으로 바로 확정」 안내 없음');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
