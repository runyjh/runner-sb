// S90 대시보드 「자료 크기가 한도에 가까움」: 수파베이스 서버 전용 저장값(__learn 등 '__' 로 시작)은 9KB 한도가 없으므로 경고에서 뺌 (TZ=UTC)
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', __learn: 'x'.repeat(16000), BIG_ONE: 'y'.repeat(9000) });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
fresh().ensureColumns_();
const w = JSON.parse(fresh().__sbEval('JSON.stringify(sizeInfo_().warn)'));
ok(!w.some((x) => /__learn/.test(x)), '1 __learn(16KB · 서버 전용)은 경고 안 함 ' + JSON.stringify(w));
ok(w.some((x) => /BIG_ONE/.test(x)), '2 보통 설정값이 9KB 가까우면 그대로 경고');
