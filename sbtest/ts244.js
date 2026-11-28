// (S244) 정산서: 노선별 내역 칸 순서(노선·건수·단가·추가단가·합계단가·금액) · 가불금 잔여 표시 · 휴대폰 표 정렬
//  사용: node sbtest/ts244.js <runner-allinone 폴더>
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
const fs = require('fs');
// 가불: 기사A 이번 달(11월 정산) 상환 1건 + 다음 달 이후 1건, 기사C 상환일 없는 1건, 기사B 없음
ev("stlAppend_('stl_advance', [{ name: '기사A', acct: 'adrv01', date: '2026-08-21', amt: '1000000', due: '2026-12-15', paid: '', memo: '' }, { name: '기사A', acct: 'adrv01', date: '2026-10-20', amt: '2000000', due: '2027-01-15', paid: '300000', memo: '' }, { name: '기사C', acct: 'cdrv01', date: '2026-11-02', amt: '500000', due: '', paid: '', memo: '' }]); 1");
let im = call('adm_stlImport', [tok, { month: '2026-11', round: 1, file: 't.xlsx', raw, loss }]); if (!im.ok) console.log('import', im.msg);
const sum = call('adm_stlMonth', [tok, '2026-11', true]).summary;
const slip = (nm) => { const d = (sum.drivers || []).find((x) => x.name === nm); return call('adm_stlSlip', [tok, '2026-11', d.id]).slip; };
const a = slip('기사A'), b = slip('기사B'), c = slip('기사C');
ok(a.adv && a.adv.now === 1000000 && a.adv.left === 1700000, '1 이번 정산 상환 1,000,000 · 잔여 1,700,000 (' + JSON.stringify(a.adv) + ')');
ok(a.adv && a.adv.rows.length === 1 && a.adv.rows[0].due === '2027-01-15' && a.adv.rows[0].amt === 1700000 && a.adv.rows[0].date === '2026-10-20', '2 남은 건: 10/20 가불 · 상환 예정 2027-01-15');
ok(a.lines.some((l) => l.name === '가불금 상환' && l.amt === 1000000), '3 정산 금액은 그대로 (가불금 상환 1,000,000 한 줄)');
ok(!b.adv, '4 가불 없는 기사 = 표시 없음');
ok(c.adv && c.adv.now === 0 && c.adv.left === 500000 && c.adv.rows[0].due === '', '5 상환일 없는 가불 = 상환 없음 · 잔여 500,000');
// 마감하면 가불금 표에 상환금이 적히지만, 그 달 정산서의 잔여 표시는 마감 때 그대로 (두 번 빼지 않음)
const cl = call('adm_stlClose', [tok, '2026-11', true]);
const a2 = cl.ok ? slip('기사A') : {};
ok(cl.ok && a2.adv && a2.adv.now === 1000000 && a2.adv.left === 1700000, '5-1 마감 뒤에도 잔여 1,700,000 그대로 (' + (cl.ok ? JSON.stringify(a2.adv) : cl.msg) + ')');
const op = call('adm_stlClose', [tok, '2026-11', false]), a3 = op.ok ? slip('기사A') : {};
ok(op.ok && a3.adv && a3.adv.now === 1000000 && a3.adv.left === 1700000, '5-2 마감 해제 뒤에도 같음 (' + (op.ok ? JSON.stringify(a3.adv) : op.msg) + ')');
// 화면: 노선별 내역 칸 순서 · 가불금 잔여 상자
const H = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const hd = '<th>노선</th><th>건수</th><th>단가</th><th>추가단가<small>(프백가중치)</small></th><th>합계단가</th><th>금액</th>';
ok(H.split(hd).length === 3, '6 노선별 내역: 노선 · 건수 · 단가 · 추가단가(프백가중치) · 합계단가 · 금액 (PC · 휴대폰 둘 다)');
ok(/class="advbox"/.test(H) && /가불금 잔여/.test(H) && /\+ advBox \+/.test(H), '7 정산서에 가불금 잔여 상자');
ok(/#stSlip td\.n \{ text-align: right !important; \}/.test(H) && /#stSlip table\.kv2 \{ display: table; \}/.test(H), '8 숫자 오른쪽 정렬 · 기본 정보 표 너비');
ok(/html\.m \.slip \.invbox \.iamt \{ flex-direction: column;/.test(H), '9 휴대폰: 발행 금액 잘리지 않게');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
