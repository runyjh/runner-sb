// S76 기사 정보 빈 칸 채우기: INFO_IMPORT → 기사 정보관리 열 때 한 번 · 빈 칸만 · 암호화 · 틀린 칸만 빼고 · 할 일 바로 지움 (TZ=UTC)
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
  "appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '홍길동', status: ST.ACTIVE, phone: '010-1111-2222', carName: '포터2', createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'd2', name: '김둘', status: ST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D3', loginId: 'd3', name: '김둘', status: ST.STOPPED, createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token;
S.props.INFO_IMPORT = JSON.stringify([
  { name: '홍길동', fields: { phone: '010-9999-8888', carName: '봉고3', carNo: '경기89배2050', rrn: '900101-1234567', qualDate: '2019-11-05', licenseType: '1종 보통', licenseNo: '23-14-034309-00', account: '1002593820127', bankName: '우리은행', accountHolder: '홍길동', maxLoad: '1000', carYear: '20x6' } },
  { name: '김둘', fields: { carNo: '서울81배1111' } }, { name: '없는사람', fields: { carNo: '서울81배2222' } }]);
let r = call('adm_listDrivers', [tok]);
ok(r.ok && !S.props.INFO_IMPORT, '1 기사 정보관리 열기 · 할 일(주민번호 · 계좌 들어 있음)은 바로 지움');
const d = JSON.parse(ev("JSON.stringify(driverById_('D1'))"));
ok(d.phone === '010-1111-2222' && d.carName === '포터2', '2 이미 있는 칸(연락처 · 차명)은 그대로');
ok(d.carNo === '경기89배2050' && d.qualDate === '2019-11-05' && d.licenseType === '1종 보통' && d.bankName === '우리은행' && d.maxLoad === '1000', '3 빈 칸은 채움 (차량번호 · 자격 취득일 · 면허 종류 · 은행 · 적재량)');
ok(d.rrn === '900101-1******' && d.rrnEnc && d.rrnEnc.indexOf('900101') < 0 && d.account === '*********0127' && d.accountEnc && d.licenseNo === '23-14-******-00', '4 주민번호 · 계좌 · 면허번호는 가린 값 + 암호화 (기사 정보 고치기와 같은 길)');
ok(!d.carYear, '5 틀린 칸(연식 20x6)만 빼고 나머지는 넣음');
const log = JSON.parse(S.props.INFO_IMPORT_LOG || '[]');
ok(log.some((x) => /홍길동 · 9칸 · 못 넣음 carYear/.test(x)) && log.some((x) => /김둘 · 같은 이름 2명/.test(x)) && log.some((x) => /없는사람 · 기사 없음/.test(x)), '6 결과 기록 ' + JSON.stringify(log));
