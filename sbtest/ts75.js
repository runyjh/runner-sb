// S75 드라이브 기사 서류 넣기: DOC_IMPORT 할 일 → 기사 정보관리를 열 때 한 번 서류 칸에 넣고 비움 · 같은 이름 · 캠프 한 명만 (TZ=UTC)
//  사용: node sbtest/ts75.js <runner-allinone 폴더>
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
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-20T01:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '임정한', status: ST.ACTIVE, schCamp: '일산5캠프', createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'd2', name: '이용석', status: ST.ACTIVE, schCamp: '일산5캠프', docCar: 'https://drive.google.com/file/d/OLDOLDOLDOLDOLDOLDOLDOLD/view', createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D3', loginId: 'd3', name: '김동명', status: ST.ACTIVE, schCamp: '일산5캠프', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D4', loginId: 'd4', name: '김동명', status: ST.ACTIVE, schCamp: '일산5캠프', createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token;
const id = (n) => 'X' + String(n).repeat(25);
S.props.DOC_IMPORT = JSON.stringify([
  { name: '임정한', camp: '일산5', docs: { car: id(1), biz: id(2), qual: id(3), license: id(3) } },
  { name: '이용석', camp: '일산5', docs: { car: id(4), qual: id(5), biz: id(6), license: id(7) } },
  { name: '김동명', camp: '일산5', docs: { car: id(8) } },
  { name: '없는사람', camp: '일산5', docs: { car: id(9) } }]);
let r = call('adm_listDrivers', [tok]);
ok(r.ok, '1 기사 정보관리 열기 정상');
const d = (x) => JSON.parse(ev("JSON.stringify(driverById_('" + x + "'))"));
ok(d('D1').docQual === 'https://drive.google.com/file/d/' + id(3) + '/view' && d('D1').docLicense === d('D1').docQual && d('D1').docCar.indexOf(id(1)) > 0 && d('D1').docBiz.indexOf(id(2)) > 0, '2 임정한: 자동차 · 사업자 · 자격증 · 면허증 (자격증·면허증 한 장이면 같은 파일 두 칸)');
ok(d('D2').docCar.indexOf(id(4)) > 0 && d('D2').docLicense.indexOf(id(7)) > 0, '3 이용석: 예전 자동차등록증은 새 것으로 바뀜');
ok(!d('D3').docCar && !d('D4').docCar, '4 같은 이름 두 명이면 넣지 않음');
ok(!S.props.DOC_IMPORT, '5 할 일은 한 번 넣고 비움');
const log = JSON.parse(S.props.DOC_IMPORT_LOG || '[]');
ok(log.length === 4 && log.some((x) => /김동명 · 같은 이름 2명/.test(x)) && log.some((x) => /없는사람 · 기사 없음/.test(x)) && log.some((x) => /임정한 · .*운전면허증/.test(x)), '6 결과 기록 ' + JSON.stringify(log));
r = call('adm_getDriver', [tok, 'D1']);
ok(r.ok && r.driver && r.driver.docs && r.driver.docs.qual && r.driver.docs.license && r.driver.docs.biz && r.driver.docs.car, '7 기사 상세에 서류 4종 「등록됨」 ' + JSON.stringify(r.driver && r.driver.docs));
r = call('adm_listDrivers', [tok]);
ok(r.ok && JSON.parse(S.props.DOC_IMPORT_LOG).length === 4, '8 다시 열어도 또 넣지 않음');
