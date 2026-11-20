// S84 마감한 달: 정산 결과를 캐시에서 꺼낼 때도 입금체크를 덮어씀 → 입금확인 체크가 10분 동안 풀려 보이던 문제 (TZ=UTC)
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
KDate.__setClock(() => Date.parse('2026-11-20T12:30:00+09:00'));
fresh().ensureColumns_();
const stub = "stlClosedInfo_ = function () { return { at: '2026-11-10', admin: '대표' }; }; stlClosedLoad_ = function () { return { summary: { drivers: [{ id: 'jrd', name: '유정근', net: 8000000 }, { id: 'kim', name: '김기사', net: 3000000 }] }, slips: {} }; }; ";
const look = () => JSON.parse(fresh().__sbEval(stub + "JSON.stringify(stlResult_('2026-10', false).summary.drivers.map(function (d) { return d.id + ':' + d.checked + ':' + d.payDate; }))"));
fresh().__sbEval("stlAppend_('stl_pay', [{ month: '2026-10', acct: 'jrd', name: '유정근', checked: 'TRUE', date: '2026-11-18' }]); 1");
const a = look(), b = look(); // 두 번째는 캐시에서
ok(a[0] === 'jrd:true:2026-11-18', '1 처음 (스냅샷에서): 유정근 입금 체크 · 11/18 ' + a[0]);
ok(b[0] === 'jrd:true:2026-11-18' && b[1] === 'kim:false:', '2 캐시에서 꺼내도 체크 그대로 (예전엔 풀려 보임) ' + JSON.stringify(b));
fresh().__sbEval("stlAppend_('stl_pay', [{ month: '2026-10', acct: 'kim', name: '김기사', checked: 'TRUE', date: '2026-11-20' }]); 1");
const c = look();
ok(c[1] === 'kim:true:2026-11-20', '3 캐시가 남아 있는 동안 새로 체크해도 바로 보임 ' + c[1]);
