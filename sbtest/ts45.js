// S53 배번호 신청서: 연료 · 차량 형태는 기사 정보에서 자동 · 관리 = 자동 증명 · 선택 동의 = 체크가 기본 (TZ=UTC)
//  사용: node sbtest/ts45.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-18T09:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); ensureCompany_();");
const tok = fresh().__sbLogin('boss', true).token;
const drv = (id, name, extra) => ev("appendObj_(SH.DRIVERS, Object.assign({ id: '" + id + "', loginId: '" + id + "', name: '" + name + "', status: 'ACTIVE', createdAt: nowText_() }, " + JSON.stringify(extra || {}) + ")); 1");
drv('D1', '전기기사', { carName: '포터2전기', carYear: '2024', maxLoad: '1000' });
drv('D2', '적어둔기사', { carName: '봉고3', carFuel: 'LPG', carBody: '탑형' });
drv('D3', '모르는기사', { carName: '포터2' });
drv('D4', '밴기사', { carName: '스타리아 카고 LPI' });
drv('D5', '차없는기사', {});
// 1. 새 신청서: 차명으로 짐작 (전기) · 형태 탑형 · 관리 자동 증명 · 선택 동의 체크
let r = call('adm_bibSave', [tok, { driverId: 'D1' }]);
ok(r.ok && r.app.fuel === '전기' && r.app.bodyType === '탑형' && r.app.manageMethod === '자동 증명' && r.app.optConsent === true, '1 새 신청서: 포터2전기 → 전기 · 탑형 · 자동 증명 · 선택 동의 체크 (' + [r.app && r.app.fuel, r.app && r.app.bodyType, r.app && r.app.manageMethod, r.app && r.app.optConsent].join(' / ') + ')');
ok(!r.missing.some((x) => /연료|형태|관리 방법/.test(x)), '2 빈 항목에 연료 · 형태 · 관리 방법이 없음');
// 2. 기사 정보에 적어 둔 값이 먼저
r = call('adm_bibSave', [tok, { driverId: 'D2' }]);
ok(r.ok && r.app.fuel === 'LPG' && r.app.bodyType === '탑형', '3 기사 정보의 연료 · 형태가 그대로 들어감');
// 3. 차명으로 모르면 연료는 빈칸(짐작 안 함) · 형태는 탑형
r = call('adm_bibSave', [tok, { driverId: 'D3' }]); const id3 = r.app.id;
ok(r.ok && r.app.fuel === '' && r.app.bodyType === '탑형' && r.missing.indexOf('연료') >= 0, '4 포터2: 연료는 모름(빈칸 · 빈 항목에 표시) · 형태 탑형');
// 4. 신청서에서 고르면 기사 정보에도 저장 → 다음 신청서는 자동
r = call('adm_bibSave', [tok, { id: id3, fuel: '경유' }]);
ok(r.ok && r.app.fuel === '경유' && ev("driverById_('D3').carFuel") === '경유', '5 신청서에서 경유를 고르면 기사 정보에도 저장됨');
r = call('adm_bibSave', [tok, { driverId: 'D3' }]);
ok(r.ok && r.app.fuel === '경유', '6 같은 기사의 다음 신청서는 자동으로 경유');
// 5. 밴 · LPI
r = call('adm_bibSave', [tok, { driverId: 'D4' }]);
ok(r.ok && r.app.fuel === 'LPG' && r.app.bodyType === '밴형', '7 스타리아 카고 LPI → LPG · 밴형');
// 6. 차명이 없으면 짐작하지 않음
r = call('adm_bibSave', [tok, { driverId: 'D5' }]);
ok(r.ok && r.app.fuel === '' && r.app.bodyType === '', '8 차명이 없으면 비워 둠');
// 7. 선택 동의를 끄면 꺼진 채로 · 관리 방법을 바꾸면 그대로
const id5 = r.app.id;
r = call('adm_bibSave', [tok, { id: id5, optConsent: false, manageMethod: '직접 증명' }]);
ok(r.ok && r.app.optConsent === false && r.app.manageMethod === '직접 증명', '9 선택 동의 끄기 · 직접 증명으로 바꾸기는 그대로 됨');
// 8. 예전 신청서(연료 · 형태 · 관리 방법이 빈칸): 화면 · 서류에 자동 값
ev("appendObj_(SH.BIB, { id: 'OLD1', driverId: 'D1', name: '전기기사', status: BST.DRAFT, applyDate: '2026-11-01', createdAt: nowText_() }); 1");
r = call('adm_bibGet', [tok, 'OLD1']);
ok(r.ok && r.app.fuel === '전기' && r.app.bodyType === '탑형' && r.app.manageMethod === '자동 증명', '10 예전 신청서도 열면 전기 · 탑형 · 자동 증명으로 보임');
r = call('adm_bibPrint', [tok, 'OLD1', true]);
ok(r.ok && r.data.fuel === '전기' && r.data.bodyType === '탑형' && r.data.manageMethod === '자동 증명', '11 서류에도 그대로 찍힘');
// 9. 기사 정보관리에서 연료 · 형태 고치기
r = call('adm_updateDriver', [tok, 'D1', { carFuel: 'LPG', carBody: '밴형' }]);
ok(r.ok && ev("driverById_('D1').carFuel") === 'LPG' && ev("driverById_('D1').carBody") === '밴형', '12 기사 정보관리에서 연료 · 차량 형태 저장');
r = call('adm_updateDriver', [tok, 'D1', { carFuel: '수소' }]);
ok(!r.ok, '13 목록에 없는 연료는 거절');
r = call('adm_bibGet', [tok, 'OLD1']);
ok(r.app.fuel === 'LPG' && r.app.bodyType === '밴형', '14 기사 정보를 고치면 (값을 안 고른) 신청서에 바로 반영');
// 10. 화면
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/fld\('carFuel', '연료 \(배번호 서류\)', d\.carFuel, \{ select: FUELS \}\)/.test(adm) && /fld\('carBody', '차량 형태 \(배번호 서류\)'/.test(adm) && /기사 정보에서 자동으로 가져옵니다/.test(adm), '15 기사 정보 화면에 연료 · 차량 형태 칸 · 신청서에 안내');
