// (S245) 정산 속도: 정산 원본(3만 줄)을 통째로 받지 않고 그 정산월 줄만 받기 — 금액 · 정산서 · 저장 내용이 예전 방식과 1원도 다르지 않은지
//  사용: node sbtest/ts245.js <runner-allinone 폴더>
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
// 자료: 10월 · 11월 정산 원본 + 가불 (11월 상환 1건)
ev("stlAppend_('stl_advance', [{ name: '기사A', acct: 'adrv01', date: '2026-08-21', amt: '1000000', due: '2026-12-15', paid: '', memo: '' }]); 1");
const shift = (rows, days) => rows.map((r) => { const x = r.slice(); x[3] = new Date(Date.parse(x[3] + 'T00:00:00Z') - days * 864e5).toISOString().slice(0, 10); return x; });
let im = call('adm_stlImport', [tok, { month: '2026-10', round: 1, file: 'o.xlsx', raw: shift(raw, 30), loss: [] }]); if (!im.ok) console.log('import10', im.msg);
im = call('adm_stlImport', [tok, { month: '2026-11', round: 1, file: 't.xlsx', raw, loss }]); if (!im.ok) console.log('import11', im.msg);
// 실제처럼: 정산 탭들이 이미 다 만들어져 있는 상태에서 시작 (탭을 새로 만들 때는 모든 탭을 훑음)
{ const s0 = call('adm_stlMonth', [tok, '2026-11', true]); ((s0.summary || {}).drivers || []).slice(0, 1).forEach((d) => call('adm_stlSlip', [tok, '2026-11', d.id])); call('adm_stlTable', [tok, '2026-11', true]); }
const { makeFakeDb } = require('./fake-db.js'), { sbMakeServer } = require('./server-core.js');
S.takeDirty && S.takeDirty();
const strip = (o) => JSON.stringify(o, (k, v) => (/^(at|calcAt|ts|time|ms|ver|stamp)$/.test(k) ? undefined : v));
(async () => {
  const dbN = makeFakeDb(), dbO = makeFakeDb(); dbN.seed(S); dbO.seed(S); delete dbO.slice; // dbO = 예전 방식 (탭 통째로)
  const mk = (db) => sbMakeServer({ engine: F, gasNames: GAS_NAMES, db, storage: db.storage, secrets: { PEPPER: S.props.PEPPER, ENC_KEY: S.props.ENC_KEY, MAC_KEY: S.props.MAC_KEY }, Date: KDate, ext: async () => ({ code: 0, err: 'x', text: '' }) });
  const both = async (N, O, fn, args) => { const a = await N.call(fn, args), b = await O.call(fn, args); return { a, b, same: strip(a.out) === strip(b.out) }; };
  let N = mk(dbN), O = mk(dbO);
  // 1) 새로 뜬 서버의 첫 정산 계산
  const m1 = await both(N, O, 'adm_stlMonth', [tok, '2026-11', true]);
  const ids = ((m1.a.out.summary || {}).drivers || []).map((d) => d.id);
  ok(m1.a.out.ok && ids.length >= 3 && m1.same, '1 11월 정산 합계: 새 방식 = 예전 방식 (기사 ' + ids.length + '명 · 금액 모두 같음)');
  ok(!(m1.a.T.load || []).some((k) => /stl_raw|stl_loss|stl_closed/.test(k)) && m1.a.T.slice > 0, '2 새 방식: 정산 원본 탭을 통째로 받지 않음 (받은 탭 ' + JSON.stringify(m1.a.T.load || []) + ' · 조각 ' + m1.a.T.slice + ')');
  ok((m1.b.T.load || []).indexOf('stl:stl_raw') >= 0, '2-1 예전 방식은 통째로 받았음 (비교 기준 확인)');
  const rawUid = [...dbN.DB.tabs.values()].find((t) => t.tab === 'stl_raw').uid;
  let allSame = true; const diff = [];
  for (const fn of ['adm_stlSlip']) for (const id of ids) { const r = await both(N, O, fn, [tok, '2026-11', id]); if (!r.same || !r.a.out.ok) { allSame = false; diff.push(id); } }
  for (const mth of ['2026-10', '2026-11']) for (const fn of ['adm_stlMonth', 'adm_stlTable']) { const r = await both(N, O, fn, [tok, mth, true]); if (!r.same) { allSame = false; diff.push(fn + mth); } }
  ok(allSame, '3 기사별 정산서 · 10월/11월 합계 · 정산 표 모두 같음' + (diff.length ? ' (다름: ' + diff.join(',') + ')' : ''));
  // 2) 새 서버(방금 뜸)도 같음 + 통째로 안 받음
  const N2 = mk(dbN); const s2 = await N2.call('adm_stlSlip', [tok, '2026-11', ids[0]]), s2o = await O.call('adm_stlSlip', [tok, '2026-11', ids[0]]);
  ok(strip(s2.out) === strip(s2o.out) && !(s2.T.load || []).some((k) => /stl_raw/.test(k)), '4 또 새로 뜬 서버: 정산서 같음 · 통째로 안 받음');
  // 3) 다른 서버가 정산 파일을 다시 올림(건수 바뀜) → 조각을 쓰던 서버도 새 값
  const raw2 = raw.map((r) => { const x = r.slice(); x[7] = Number(x[7]) + 1; x[11] = x[7] * x[9]; x[12] = x[7] * x[10]; x[13] = x[7] * (x[9] + x[10]); return x; });
  const N3 = mk(dbN), i3 = await N3.call('adm_stlImport', [tok, { month: '2026-11', round: 2, file: 't2.xlsx', raw: raw2, loss }]), i3o = await O.call('adm_stlImport', [tok, { month: '2026-11', round: 2, file: 't2.xlsx', raw: raw2, loss }]);
  ok(i3.out.ok && strip(i3.out) === strip(i3o.out), '5 정산 파일 다시 올리기(쓰기) 결과 같음' + (i3.out.ok ? '' : ' ' + i3.out.msg));
  const m3 = await both(N, O, 'adm_stlMonth', [tok, '2026-11', true]), m3b = await N2.call('adm_stlMonth', [tok, '2026-11', true]);
  ok(m3.same && strip(m3b.out) === strip(m3.b.out) && strip(m3.a.out) !== strip(m1.a.out), '6 다른 서버가 올린 뒤: 조각을 쓰던 서버들도 새 금액 (예전 방식과 같음 · 올리기 전과 다름)');
  // 4) 마감 → 마감 해제 (가불 상환금 쓰기)
  const c4 = await both(N, O, 'adm_stlClose', [tok, '2026-11', true]);
  const s4 = await both(N2, O, 'adm_stlSlip', [tok, '2026-11', ids[0]]);
  const c5 = await both(N, O, 'adm_stlClose', [tok, '2026-11', false]);
  const s5 = await both(N2, O, 'adm_stlSlip', [tok, '2026-11', ids[0]]);
  ok(c4.a.out.ok && c4.same && s4.same && c5.a.out.ok && c5.same && s5.same, '7 마감 · 마감 해제와 그 뒤 정산서 같음');
  // 5) 쓰기 뒤 DB 내용이 두 방식에서 같은지 (정산 탭 줄 내용)
  const dump = (db) => { const o = {}; [...db.DB.tabs.values()].filter((t) => t.book === 'stl' && /^stl_(raw|loss|advance|closed|rounds)$/.test(t.tab)).forEach((t) => { o[t.tab] = [...db.DB.rows.values()].filter((r) => r.tab_uid === t.uid).sort((a, b) => a.pos - b.pos).map((r) => JSON.stringify(r.cells).replace(/20\d\d-\d\d-\d\d \d\d:\d\d(:\d\d)?/g, 'T')); }); return o; };
  const dN = dump(dbN), dO = dump(dbO);
  const dd = Object.keys(dO).filter((k) => JSON.stringify(dN[k]) !== JSON.stringify(dO[k]));
  ok(Object.keys(dO).length >= 4 && !dd.length, '8 저장된 표 내용(원본 · 분실파손 · 가불 · 마감)도 두 방식이 같음' + (dd.length ? ' (다름: ' + dd.join(',') + ')' : ''));
  ok(dbN.DB.calls.some((x) => /^slice /.test(x)) && !dbO.DB.calls.some((x) => /^slice /.test(x)), '9 조각 받기는 새 방식에서만');
  // 6) 조각 받기가 실패해도 화면은 원래 방식으로 그대로 동작
  const dbX = makeFakeDb(); dbX.seed(S); dbX.slice = async () => { throw new Error('고장'); };
  const dbY = makeFakeDb(); dbY.seed(S); delete dbY.slice;
  const X = mk(dbX), Y = mk(dbY), mx = await both(X, Y, 'adm_stlMonth', [tok, '2026-11', true]), sx = await both(X, Y, 'adm_stlSlip', [tok, '2026-11', ids[0]]);
  ok(mx.a.out.ok && mx.same && sx.a.out.ok && sx.same && (mx.a.T.load || []).indexOf('stl:stl_raw') >= 0, '10 조각 받기가 고장 나도 원래 방식으로 같은 결과');
  console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('문제 오류 ' + (e && e.stack || e)); process.exit(1); });
