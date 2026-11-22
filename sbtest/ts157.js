// (S157) 퇴사 후 근무: 보류금 반환 달에 본인 배송(쿠팡 정산 파일)이 있으면 반환을 다음 달로 미룸 · 경고 · 앱 자동 정지도 늦춤 · 정지 아이디 [퇴사 처리]가 퇴사일을 덮지 않음
//  사용: node sbtest/ts157.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-20T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프', rot: 'D1,D2' }]);
const C1 = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B', '213A'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));
const pr = (num, value, p) => ({ num, level: 2, value, p1: p[0], p2: p[1], p3: p[2], p4: p[3], p5: p[4] });
let r0 = call('adm_priceSave', [tok, C1, [pr('212', 'A', [1000, 800, 850, 820, 900]), pr('212', 'B', [1100, 880, 900, 890, 950]), pr('213', 'A', [1200, 950, 980, 960, 1000])]]); if (!r0.ok) console.log('price', r0.msg);
const NM = { A: '기사A', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'drv01', driverType: ['고정', '백업', '고정'][i], phone: '010-4000-20' + (10 + i), schCampId: C1, baseRoute: ['212A', '', '213A'][i] }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
const W = (id, f) => ev("writeFields_(SH.DRIVERS, driverById_('" + id + "')._row, " + JSON.stringify(f) + "); forgetDriver_(driverById_('" + id + "')); 1");
W(D.A, { subId1: 'asub01' });
S.props.STL_IDS_V2 = '1';
const dates = []; for (let t = Date.parse('2026-10-26T00:00:00Z'); t <= Date.parse('2026-11-25T00:00:00Z'); t += 864e5) dates.push(new Date(t).toISOString().slice(0, 10));
const raw = [], loss = [];
const row = (kind, cid, route, d, qty, price, inc, fresh) => [kind, cid, route, d, '군포1캠프', '일반', '러너', qty, 0, price, inc, qty * price, qty * inc, qty * (price + inc), fresh || 0];
dates.forEach((d, i) => {
  if (i % 7 !== 0) raw.push(row('배송', i % 5 === 0 ? 'asub01' : 'adrv01', '212A', d, 150 + i, 1000, 50));
  if (i % 3 === 0) raw.push(row('배송', 'bdrv01', '212B', d, 120, 1100, 0));
  if (i % 7 !== 3) raw.push(row('배송', 'cdrv01', '213A', d, 170, 1200, 30));
  if (i % 10 === 0) raw.push(['재사용포장재 회수 인센티브', 'adrv01', '', d, '군포1캠프', '', '', 0, 0, 0, 0, 0, 0, 0, 12345]);
  if (i === 5) raw.push(row('미계약 라우트', 'bdrv01', '299Z', d, 30, 1000, 0));
  if (i === 6) raw.push(['시설 및 장비 사용료', 'RUNNERVENDOR', '', d, '', '', '', 0, 0, 0, 0, -50000, 0, -50000, 0]);
});
loss.push([dates[3], '군포1캠프', 'cdrv01', '분실', '상품', 1, 23000, '러너', 'W1', '물건']);

let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
W(D.A, { workStatus: '퇴사', leaveDate: '2026-10-20' }); W(D.C, { workStatus: '퇴사', leaveDate: '2026-10-20' });
ev("stlAppend_('stl_leave', [{ name: '기사A', acct: 'adrv01', month: '2026-10', amt: '100000', memo: '' }, { name: '기사C', acct: 'cdrv01', month: '2026-10', amt: '100000', memo: '' }]); 1");
// 11월 정산 (10/26~11/25): 기사A 는 퇴사 후에도 배송 있음 · 기사C 는 11월 배송 없음
const rawN = raw.filter((r) => r[1] !== 'cdrv01');
let im = call('adm_stlImport', [tok, { month: '2026-11', round: 1, file: 't.xlsx', raw: rawN, loss: [] }]); if (!im.ok) console.log('import', im.msg);
const adjOf = (s, nm) => { const d = ((s && s.drivers) || []).find((x) => x.name === nm); if (!d) return ''; const sl = call('adm_stlSlip', [tok, s.month || MON, d.id]); return JSON.stringify(sl); };
let MON = '2026-11';
let s = call('adm_stlMonth', [tok, '2026-11', true]).summary;
ok(!/보류금 반환/.test(adjOf(s, '기사A')), '1 11월: 기사A 는 퇴사 후 배송이 있어 보류금 반환 안 함 (미룸)');
ok(/보류금 반환/.test(adjOf(s, '기사C')) || !(s.drivers || []).some((x) => x.name === '기사C'), '2 11월: 기사C 는 배송 없음 → 원래대로 반환 (정산서가 있으면 반환 줄)');
const wl = (s.warnings || []).find((w) => w.key === 'leaveHold');
ok(wl && /기사A/.test(JSON.stringify(wl.items)) && !/기사C/.test(JSON.stringify(wl.items)), '3 경고 「반환 다음 달로 미룸」에 기사A만 (' + (wl ? JSON.stringify(wl.items) : '없음') + ')');
// 12월 정산 (11/26~12/25): 기사A 배송 없음 → 미뤘던 반환
const datesD = []; for (let t = Date.parse('2026-11-26T00:00:00Z'); t <= Date.parse('2026-12-25T00:00:00Z'); t += 864e5) datesD.push(new Date(t).toISOString().slice(0, 10));
const rawD = datesD.map((d) => row('배송', 'bdrv01', '212B', d, 120, 1100, 0));
im = call('adm_stlImport', [tok, { month: '2026-12', round: 1, file: 't2.xlsx', raw: rawD, loss: [] }]); if (!im.ok) console.log('import12', im.msg);
MON = '2026-12';
const r12 = call('adm_stlMonth', [tok, '2026-12', true]); if (!r12.summary) console.log('12월', r12.msg || JSON.stringify(r12).slice(0, 200));
s = call('adm_stlMonth', [tok, '2026-12', true]).summary;
ok(/보류금 반환/.test(adjOf(s, '기사A')) && /미뤘던/.test(adjOf(s, '기사A')), '4 12월: 기사A 미뤘던 보류금 반환 ' + (adjOf(s, '기사A').match(/[^"]*보류금 반환[^"]*/) || [''])[0]);
ok(!/보류금 반환/.test(adjOf(s, '기사C')), '5 12월: 기사C 는 11월에 이미 반환 → 다시 안 줌');
// 앱 자동 정지: 기사C 는 12/27(11월 지급 12/20 + 7) · 기사A 는 퇴사 후 11월 근무 → 12월 지급(1/20) + 7 = 1/27
KDate.__setClock(() => Date.parse('2027-01-02T05:00:00+09:00'));
let st = J("leaveAutoStop_()");
ok(st.indexOf('기사C') >= 0 && st.indexOf('기사A') < 0, '6 1/2 자동 정지: 기사C 만 (기사A 는 퇴사 후 근무로 늦춤) ' + JSON.stringify(st));
KDate.__setClock(() => Date.parse('2027-01-28T05:00:00+09:00'));
st = J("leaveAutoStop_()");
ok(st.indexOf('기사A') >= 0, '7 1/28 자동 정지: 기사A ' + JSON.stringify(st));
// [퇴사 처리] 버튼: 이미 퇴사일이 있는 퇴사자의 퇴사일은 덮지 않음
const src = require('fs').readFileSync(path.join(SRC, 'Settle.gs'), 'utf8');
ok(/!\(str_\(h\.drv\.workStatus\) === '퇴사' && str_\(h\.drv\.leaveDate\)\)\) stlSetDrv_/.test(src), '8 [퇴사 처리]: 이미 퇴사일이 있으면 그대로');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
