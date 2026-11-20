// S82 매입매출: 입금확인은 실입금액만 · 운영자 선지급(입금확인 체크)이 자금배분에서 완료로 보이게 (완료 수 · 날짜) (TZ=UTC)
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
KDate.__setClock(() => Date.parse('2026-11-20T12:00:00+09:00'));
fresh().ensureColumns_();
// 정산 결과는 흉내 (선지급 1명 · 일반 1명)
const stub = "stlResult_ = function () { return { summary: { drivers: [{ id: 'jrd', cid: 'jrd', cids: ['jrd'], name: '유정근', net: 8000000, checked: CK, payDate: PD }, { id: 'kim', cid: 'kim', cids: ['kim'], name: '김기사', net: 3000000 }], total: { net: 11000000 }, company: {}, dates: { coupang: '2026-11-16', pay: '2026-11-20' } }, slips: {} }; }; " +
  "stlCfg_ = function () { return { earlyPay: '유정근' }; }; stlPnl_ = function () { return { net: 0, vatDue: 0, ins: { total: 0 }, staff: 0 }; }; ";
const fund = (ck, pd) => JSON.parse(fresh().__sbEval("var CK = " + ck + ", PD = '" + pd + "'; " + stub + "JSON.stringify(stlFund_('2026-10').items.filter(function (x) { return x.key === 'early'; })[0])"));
const a = fund(false, ''), b = fund(true, '2026-11-18');
ok(a && !a.done && a.amt === 8000000, '1 입금확인에서 체크 안 했으면 선지급 줄은 미완료 · 금액 = 선지급 기사 실입금액');
ok(b && b.done && b.date === '2026-11-18', '2 입금확인에서 체크하면 자금배분 선지급 줄도 완료 · 날짜 = 입금일 (완료 수 · 단계 표시에 들어감)');
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), i = ad.indexOf('function renderPay()'), body = ad.slice(i, ad.indexOf('tsApply($(\'#payTable\'))', i)).replace(/\/\/ \(S82\)[^\n]*/, '');
ok(/<th class="n">실입금액<\/th>/.test(body) && !/지급총액|계산서 공급가|>공제</.test(body) && !/wn\(x\.pay\)|wn\(x\.supply\)|wn\(x\.tax\)/.test(body), '3 입금확인 표: 실입금액만 (지급총액 · 공제 · 계산서 공급가 · 세액 칸 없음)');
ok(/총 실입금액/.test(body), '4 위쪽 요약도 「총 실입금액」');
