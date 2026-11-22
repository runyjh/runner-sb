// (S160) 꼬임 점검: 퇴사 번복(재직)한 기사는 보류금 반환을 미루지 않음 (S158 「다음 달 그대로 반환」 안내와 S157 「본인 배송이 있으면 미룸」이 엇갈리던 것)
//  사용: node sbtest/ts160.js <runner-allinone 폴더>
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
W(D.A, { workStatus: '퇴사', leaveDate: '2026-10-20' });
ev("stlAppend_('stl_leave', [{ name: '기사A', acct: 'adrv01', month: '2026-10', amt: '100000', memo: '' }]); 1");
let im = call('adm_stlImport', [tok, { month: '2026-11', round: 1, file: 't.xlsx', raw, loss: [] }]); if (!im.ok) console.log('import', im.msg);
let MON = '2026-11';
const slip = (nm) => { const s = call('adm_stlMonth', [tok, MON, true]).summary; const d = (s.drivers || []).find((x) => x.name === nm); return d ? JSON.stringify(call('adm_stlSlip', [tok, MON, d.id])) : ''; };
ok(!/보류금 반환/.test(slip('기사A')), '1 퇴사 중 · 11월 배송 있음 → 반환 미룸 (S157)');
call('adm_updateDriver', [tok, D.A, { workStatus: '재직' }, null]); // 번복 · 보류금 등록은 그대로 둠
ok(/보류금 반환/.test(slip('기사A')), '2 번복(재직) 뒤 11월: 원래대로 반환 (배송이 있어도 미루지 않음)');
const datesD = []; for (let t = Date.parse('2026-11-26T00:00:00Z'); t <= Date.parse('2026-12-25T00:00:00Z'); t += 864e5) datesD.push(new Date(t).toISOString().slice(0, 10));
im = call('adm_stlImport', [tok, { month: '2026-12', round: 1, file: 't2.xlsx', raw: datesD.map((d) => row('배송', 'adrv01', '212A', d, 100, 1000, 0)), loss: [] }]);
MON = '2026-12';
ok(!/보류금 반환/.test(slip('기사A')), '3 12월: 이미 11월에 반환 → 다시 안 줌');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
