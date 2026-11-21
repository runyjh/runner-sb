// (S131) 15일 선지급 기사: 이름에 영문이 있어도 찾음 (이름도 아이디처럼 대소문자 · 띄어쓰기 맞춰 비교)
//  사용: node sbtest/ts131.js <runner-allinone 폴더>
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
const im = call('adm_stlImport', [tok, { month: '2026-11', round: 1, file: 't.xlsx', raw, loss }]);
KDate.__setClock(() => Date.parse('2026-11-27T10:00:00+09:00'));
const R = []; const rep = (good, id, m) => { R.push(good); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
const s = call('adm_stlMonth', [tok, '2026-11', true]).summary, a = s.drivers.find((d) => d.name === '기사A');
for (const [id, v] of [['#v1', '기사A'], ['#v2', 'adrv01'], ['#v3', '기사B,기사A']]) {
  call('adm_stlEarlyPaySet', [tok, v]);
  const f = call('adm_stlFund', [tok, '2026-11']), e = f.items.find((x) => x.key === 'early'), d = f.items.find((x) => x.key === 'driver');
  const want = v.indexOf('기사B') >= 0 ? a.net + s.drivers.find((x) => x.name === '기사B').net : a.net;
  rep(!!e && e.plan === want && d.plan === s.total.net - want, id, '선지급 「' + v + '」: 선지급 ' + (e ? e.plan : '없음') + ' · 기사정산 ' + d.plan + ' (기대 ' + want + ' · ' + (s.total.net - want) + ')');
}
console.log(R.every(Boolean) ? '\n모두 정상 / ' + R.length : '\n문제 있음');
process.exit(R.every(Boolean) ? 0 : 1);
