// S60 기존 정산 이식 달의 분실파손: 쿠팡 정산서 원본에서 건별(날짜 · 상품 · 운송장)로 보여 주기 — 금액 합계는 예전 정산서 그대로 (TZ=UTC)
//  사용: node sbtest/ts60.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T09:00:00+09:00'));
fresh().ensureColumns_();
const L = (month, date, cid, amt, waybill, item) => ({ month, round: 1, date, camp: '강서1', cid, type: '분실파손', detail: '오배송 후 분실', cnt: 1, amt, vendor: '', waybill, item });
ev("stlAppend_('stl_loss', " + JSON.stringify([
  L('2026-10', '2026-09-29', 'jrd@df', 6920, '10331277136456', '밀폐용기'),
  L('2026-09', '2026-08-18', 'jrd@df', 11750, '10327498658131', '파티접시'), L('2026-09', '2026-08-18', 'JRD@DF', 23400, '10327498270596', '테이블세트'), L('2026-09', '2026-09-10', 'jrd@df', 9000, '10329624513036', '장지갑'),
  L('2026-09', '2026-09-11', 'other@df', 5000, '10300000000001', '남의 것'),
  L('2026-08', '2026-08-02', 'jrd@df', 30000, '10300000000002', '금액 안 맞는 달'),
  L('2026-07', '2026-07-02', 'jrd@df', 3333, '10300000000003', 'A'), L('2026-07', '2026-07-03', 'jrd@df', 3333, '10300000000004', 'B'), L('2026-07', '2026-07-04', 'jrd@df', 3334, '10300000000005', 'C')
]) + "); 1");
const det = (month, sl) => JSON.parse(ev("JSON.stringify(stlLossDetail_('" + month + "', " + JSON.stringify(sl) + "))"));
const leg = (amt, qty, item) => ({ row: { id: 'jrd', legacy: 'x.pdf', cids: ['jrd@df'] }, members: ['jrd@df'], loss: [{ date: '', type: '분실파손', item: item || '', waybill: '', amt, qty }] });
let r = det('2026-10', leg(7610, 1));
ok(r.length === 1 && r[0].waybill === '10331277136456' && r[0].date === '2026-09-29' && r[0].item === '밀폐용기' && r[0].amt === 7610 && r[0].cp === 6920, '1 부가세 포함 달(6,920 → 7,610): 운송장 · 날짜 · 상품이 붙고 금액은 예전 정산서 그대로 ' + JSON.stringify(r[0]));
r = det('2026-09', leg(44150, 3, '장지갑'));
ok(r.length === 3 && r.map((x) => x.amt).join() === '11750,23400,9000' && r.every((x) => /^1032/.test(x.waybill)) && !r.some((x) => x.item === '남의 것'), '2 합계 한 줄(3건 44,150) → 건별 3줄 · 대소문자 다른 아이디도 · 남의 줄은 안 섞임');
r = det('2026-08', leg(12000, 1));
ok(r.length === 1 && r[0].waybill === '' && r[0].amt === 12000, '3 원본 합이 예전 정산서 금액과 안 맞으면 예전 한 줄 그대로 (틀린 내역을 붙이지 않음)');
r = det('2026-07', leg(11000, 3));
ok(r.length === 3 && r.reduce((a, x) => a + x.amt, 0) === 11000 && r.every((x) => x.amt % 10 === 0), '4 나눈 금액의 합이 예전 정산서 금액과 정확히 같음 (' + r.map((x) => x.amt).join('+') + ')');
r = det('2026-06', leg(5000, 1));
ok(r.length === 1 && r[0].waybill === '', '5 원본에 줄이 없는 달은 그대로');
r = det('2026-10', { row: { id: 'jrd', cids: ['jrd@df'] }, loss: [{ date: '2026-09-29', item: '밀폐용기', waybill: '10331277136456', amt: 6920, cp: 6920 }] });
ok(r.length === 1 && r[0].amt === 6920, '6 보통 달(이식 아님)은 손대지 않음');
r = det('2026-10', { row: { id: 'jrd', legacy: true, cids: ['jrd@df'] }, loss: [] });
ok(r.length === 0, '7 분실파손이 없으면 없음 그대로');
const st = fs.readFileSync(path.join(SRC, 'Settle.gs'), 'utf8');
ok(/s = Object\.assign\(\{\}, s, \{ loss: stlLossDetail_\(month, s\) \}\)/.test(st) && /loss: stlLossDetail_\(month, sl\),/.test(st) && /stlLossDetail_\(m, slip\)\.forEach/.test(st), '8 관리자 정산서 · 기사앱 정산서 · 분실파손 엑셀 세 곳 모두 적용 (마감 기록은 안 고침)');
ok(/'stl:my2:'/.test(st), '9 기사앱에 기억해 둔 예전 모양은 다시 만들게 함');
