// S46 사업자 정보를 올인원 설정 한 곳에서: 도장 그림 저장 · 쿠팡 업로드 엑셀 벤더명/사업자번호 연동 · 배번호 관리의 [회사 정보] 삭제 (TZ=UTC)
//  사용: node sbtest/ts37.js <runner-allinone 폴더>
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
// 1. 항목 · 종류
let g = call('adm_companyGet', [tok]);
const kind = {}; g.fields.forEach((f) => { kind[f.key] = f.kind; });
ok(g.ok && kind.branchStamp === 'img' && kind.branchVendor === 'opt' && kind.branchName === '' && kind.branchEmail === 'tax', '1 항목에 도장(img) · 쿠팡 벤더명(opt)이 있음');
// 2. 저장: 글자 + 도장
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
let r = call('adm_companySave', [tok, { branchName: '러너', branchBizNo: '111-22-33333', branchVendor: '러너테스트/RT', branchStamp: PNG }]);
ok(r.ok, '2 저장 됨');
g = call('adm_companyGet', [tok]); const val = {}; g.fields.forEach((f) => { val[f.key] = f.value; });
ok(val.branchStamp === PNG && val.branchBizNo === '111-22-33333' && val.branchVendor === '러너테스트/RT', '3 도장 그림(200자 넘어도 그대로) · 사업자번호 · 벤더명이 저장됨');
// 3. 도장 검사
r = call('adm_companySave', [tok, { branchStamp: 'javascript:alert(1)' }]);
ok(!r.ok, '4 그림이 아닌 값은 거절');
r = call('adm_companySave', [tok, { branchStamp: 'data:image/png;base64,' + 'A'.repeat(46000) }]);
ok(!r.ok, '5 너무 큰 그림은 거절');
ok(ev('companyInfo_().branchStamp') === PNG, '6 거절해도 저장된 도장은 그대로');
r = call('adm_companySave', [tok, { branchStamp: '' }]);
ok(r.ok && ev('companyInfo_().branchStamp') === '', '7 도장 지우기');
call('adm_companySave', [tok, { branchStamp: PNG }]);
// 4. 배번호 서류: 도장 · 벤더명이 비어도 빈 항목으로 안 잡힘 · 서류 자료에 도장이 실림
ok(ev("bibMissing_({ name: 'a' }, {}, Object.assign(companyInfo_(), { branchStamp: '', branchVendor: '', branchEmail: '' })).filter(function (x) { return /도장|벤더|이메일/.test(x); }).length") === 0, '8 도장 · 벤더명 · 이메일은 배번호 필수 항목이 아님');
ok(ev("bibMissing_({ name: 'a' }, {}, Object.assign(companyInfo_(), { branchBizNo: '' })).some(function (x) { return x === '사업자 정보: 영업점 사업자번호'; })"), '9 사업자번호가 비면 "사업자 정보: …" 로 알려 줌');
// 5. 쿠팡 업로드 표: 벤더명 · 사업자번호 = 사업자 정보
call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2' }]);
let up = call('adm_schUploadTable', [tok, '', '4w']);
ok(up.ok && up.cpVendor === '러너테스트/RT' && up.cpBizNo === '1112233333', '10 업로드 표: 벤더명 · 사업자번호가 사업자 정보 값 (' + up.cpVendor + ' · ' + up.cpBizNo + ')');
ev("appSetPut_('cpVendor', '옛값/OLD', ''); appSetPut_('cpBizNo', '9999999999', ''); 1");
up = call('adm_schUploadTable', [tok, '', '4w']);
ok(up.cpVendor === '러너테스트/RT' && up.cpBizNo === '1112233333', '11 쿠팡 목록에서 읽어 둔 옛 값보다 사업자 정보가 먼저');
call('adm_companySave', [tok, { branchVendor: '' }]);
ok(call('adm_schUploadTable', [tok, '', '4w']).cpVendor === '옛값/OLD', '12 벤더명을 비워 두면 쿠팡 목록에서 읽어 둔 값');
ok(!/654-37-01141/.test(fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8').split('const COMPANY = [')[1].split('];')[1]), '13 코드에 박힌 사업자번호 기본값 없음 (처음 채우는 값 말고)');
// 6. 화면
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(!/id="coBtn"/.test(adm) && !/id="coModal"/.test(adm) && !/\$\('#coBtn'\)/.test(adm), '14 배번호 관리의 [회사 정보] 버튼 · 창 삭제');
ok(/data-cfgt="biz">🏢 사업자 정보/.test(adm) && /id="cfgBiz"/.test(adm) && /if \(t === 'biz'\) cfgBizLoad\(\)/.test(adm), '15 올인원 설정에 🏢 사업자 정보 탭');
ok(!/6543701141/.test(adm), '16 화면 코드에 박힌 사업자번호 없음');
const seal = new Function('esc', adm.slice(adm.indexOf('  function coSeal('), adm.indexOf('  function bibDocsHtml(')) + '; return coSeal;')((x) => String(x).replace(/"/g, '&quot;'));
ok(seal({}) === '(인)' && seal({ branchStamp: 'x' }) === '(인)', '17 도장이 없으면 (인) 글자만');
ok(/^<span[^>]*>\(인\)<img src="data:image\/png;base64,/.test(seal({ branchStamp: PNG })), '18 도장이 있으면 (인) 위에 그림');
ok((adm.match(/' \+ coSeal\(co\) \+ '/g) || []).length === 2, '19 배번호 서류 두 곳(계약서 을 · 관리 신청서 대표자)에 도장');
