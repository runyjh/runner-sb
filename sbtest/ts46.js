// S54 배번호 관리: 신규 배번호 신청(기본 6장) · 배번호 재허가 신청(5장 · 예전 확인서 양식 · 대리점 계약서 · 별지2호) (TZ=UTC)
//  사용: node sbtest/ts46.js <runner-allinone 폴더>
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
drv('D1', '홍길동', { carName: '봉고3 EV', carYear: '2023', maxLoad: '1000', carNo: '경기93배1540', address: '주소지', phone: '010-1-2', birthDate: '1990-01-02' });
// 1. 서버: 종류
let r = call('adm_bibSave', [tok, { driverId: 'D1' }]);
ok(r.ok && r.app.kind === '신규', '1 그냥 만들면 신규');
r = call('adm_bibSave', [tok, { driverId: 'D1', kind: '재허가' }]); const reId = r.app.id;
ok(r.ok && r.app.kind === '재허가' && !r.missing.some((x) => /경력/.test(x)), '2 재허가로 만들 수 있음 · 경력기간은 빈 항목으로 안 잡힘');
r = call('adm_bibSave', [tok, { driverId: 'D1', kind: '이상한값' }]);
ok(r.ok && r.app.kind === '신규', '3 모르는 종류는 신규');
ev("appendObj_(SH.BIB, { id: 'OLD1', driverId: 'D1', name: '홍길동', status: BST.DRAFT, applyDate: '2026-11-01', createdAt: nowText_() }); 1");
r = call('adm_bibList', [tok]);
ok(r.ok && r.apps.find((a) => a.id === 'OLD1').kind === '신규' && r.apps.find((a) => a.id === reId).kind === '재허가', '4 예전 신청서(구분 빈칸)는 신규로 보임');
r = call('adm_bibPrint', [tok, reId, true]);
ok(r.ok && r.data.kind === '재허가' && r.data.carNo === '경기93배1540', '5 재허가 서류 자료: 종류 · 지금 배 번호');
// 2. 서류 묶음
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = new Function('esc', adm.slice(adm.indexOf('  const BIB_DOCS = '), adm.indexOf('  function printHtml(html)')) + '; return { html: bibDocsHtml, sets: BIB_SETS, of: bibDocsOf, off: BIB_DOC_OFF };')(esc);
const co = { courierName: '쿠팡로지스틱스서비스 유한회사', courierCeo: '강현오', branchName: '러너', branchCeo: '대표', branchAddr: '부천시 사무실', court: '서울중앙' };
const v = Object.assign({}, r.data, { name: '홍길동', rrn: '900102-1234567', address: '주소지', fuel: '경유', bodyType: '밴형', contractStart: '2026-02-23', contractEnd: '2027-02-22', contractYears: '1', applyDate: '2026-02-23', company: co });
const pagesOf = (kind) => { const p = {}; Object.keys(M.of(kind)).forEach((k) => { if (!M.off[k]) p[k] = true; }); return p; };
const text = (h) => h.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const nw = M.html(v, pagesOf('신규')), re = M.html(v, pagesOf('재허가')), tn = text(nw), tr = text(re);
ok((nw.match(/<section/g) || []).length === 6 && (tn.match(/택배용 화물자동차 전속 운송 계약서/g) || []).length >= 3 && (nw.match(/class="page contract"/g) || []).length === 3, '6 신규 기본 6장: 계약서 3부');
ok(/개인정보 활용 동의서/.test(tn) && /허가 후 관리 신청서/.test(tn) && !/별지2호/.test(tn), '7 신규: 동의서 · 허가 후 관리 신청서 있음 · 별지2호 없음');
ok((re.match(/<section/g) || []).length === 5 && (re.match(/class="page contract"/g) || []).length === 3, '8 재허가 5장: 확인서 1 · 계약서 3 · 별지2호 1');
ok(!/개인정보 활용 동의서/.test(tr) && !/허가 후 관리 신청서/.test(tr), '9 재허가: 동의서 · 허가 후 관리 신청서 빠짐');
const secs = re.split('<section').slice(1).map(text);
ok(/허가 신청 현황 확인서/.test(secs[0]) && /전속 운송 계약서/.test(secs[1]) && /전속 운송 계약서/.test(secs[3]) && /\[별지2호\]/.test(secs[4]), '10 재허가 순서: 확인서 → 계약서 3부 → 별지2호');
// 3. 재허가 확인서 = 예전 양식
ok(/제조사 : □ 현대 ☑ 기아/.test(secs[0]) && /계약번호 : \(친환경자동차 매매계약서\)/.test(secs[0]) && /차명\(연식\) : 봉고3 EV\s+\(\s*2023\s*\)/.test(secs[0]) && !/경력기간/.test(secs[0]), '11 예전 양식: 제조사(봉고 → 기아) · 계약번호 · 차명(연식) · 경력기간 없음');
ok(/연료 : □ LPG □ 전기 ☑ 기타 \(\s*경유\s*\)/.test(secs[0]) && /형태 : □ 탑형 ☑ 밴형/.test(secs[0]), '12 연료: LPG · 전기 말고는 기타( ) 안에 적음 · 형태');
ok(/연료 : ☑ LPG □ 전기 □ 기타 \(\s*\)/.test(text(M.html(Object.assign({}, v, { fuel: 'LPG' }), { confirmOld: 1 }))), '13 LPG 는 LPG 에 체크');
// 4. 재허가 계약서 = 대리점 문구
ok(/택배 대리점 계약을 체결하고/.test(secs[1]) && /택배 대리점 계약이 종료/.test(secs[1]) && /대리점과의 위수탁/.test(secs[1]) && /대리점명 :/.test(secs[1]) && !/영업점/.test(secs[1]) && /관리감독한다/.test(secs[1]), '14 재허가 계약서: 대리점 문구 4곳 · 관리감독');
ok(/^[\s\S]{0,60}쿠팡로지스틱스서비스 \(이하 “갑”/.test(secs[1].replace(/\s+/g, ' ').replace(/^.*?계약서 /, '')), '15 재허가 계약서 첫 줄 회사명에 유한회사 없음');
const sn = nw.split('<section').slice(1).map(text);
ok(/택배 영업점 계약을 체결하고/.test(sn[1]) && /영업점명 :/.test(sn[1]) && !/대리점/.test(sn[1]) && /쿠팡로지스틱스서비스 유한회사 \(이하/.test(sn[1]), '16 신규 계약서는 그대로 영업점 문구');
// 5. 별지2호
ok(/택배용 화물자동차 운송사업허가 확인서/.test(secs[4]) && /근\s+무\s+처2\)\s*부천시 사무실/.test(secs[4]) && /자동차등록번호3\)\s*경기93배1540/.test(secs[4]) && /대수종류차명형식연식최대적재량/.test(secs[4]), '17 별지2호: 근무처 = 영업점 주소 · 자동차등록번호 = 배 번호 · 차량 표');
ok(/화물의 집화·배송 관련 화물자동차 운송사업 재허가를 위해 시행규칙 제6조 제2항 제1호, 제2호에 따라 확인서를 제출합니다\./.test(secs[4]) && /회사명 :\(인, 서명\)/.test(secs[4]) && /신청자 :\s+홍 길 동\(인, 서명\)/.test(secs[4]), '18 별지2호 문구 · 서명란');
ok(/주1\) 허가를 신청하는 자가 설치한 주사무소의 주소를 의미하며 별도의 주사무소를/.test(secs[4]) && /주2\) 전속 운송 계약을 체결하고 있는 택배사업자 및 업소\(대리점\) 주소 기재/.test(secs[4]) && /주3\) 현재 허가받아 운행 중인 실제 차량의 등록번호 기재 \( 00배0000 \)/.test(secs[4]), '19 별지2호 주석 3개');
// 6. 화면
ok(/data-kind="신규" class="on">신규 배번호 신청</.test(adm) && /data-kind="재허가">배번호 재허가 신청</.test(adm) && /api\('adm_bibSave', \{ driverId: b\.dataset\.id, kind: bkind \}\)/.test(adm), '20 배번호 관리 위에 신규 / 재허가 고르기 · 새 신청서는 고른 종류로');
ok(/Object\.keys\(bibDocsOf\(a\.kind\)\)/.test(adm) && /const list = bOfKind\(\)\.filter/.test(adm), '21 신청서 종류에 맞는 서류 묶음 · 목록도 종류별');
