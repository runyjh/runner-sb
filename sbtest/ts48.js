// S57 배번호 진행 관리: 등기 주소 알림 · 허가 → 최종서류(3종) → 쿠팡 전달 = 허가완료 · 기사앱 올리기 (TZ=UTC)
//  사용: node sbtest/ts48.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const FILES = new Map([['DOCSxxxxxxxxxxxxxxxxxxxxxxxxxx', { id: 'DOCSxxxxxxxxxxxxxxxxxxxxxxxxxx', name: '기사 서류', folder: true, parent: null }]]), BYTES = new Map(); let fseq = 0;
const FS = { get: (id) => FILES.get(id), put: (r) => { FILES.set(r.id, r); }, children: (pid) => [...FILES.values()].filter((f) => f.parent === pid), content: (id) => BYTES.get(id) || null, setContent: (id, b) => { BYTES.set(id, b); }, newId: () => 'FILE' + String(++fseq).padStart(26, 'x') };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate, files: FS });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DOCS_FOLDER_ID: 'DOCSxxxxxxxxxxxxxxxxxxxxxxxxxx',  DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-18T09:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); ensureCompany_();");
const tok = fresh().__sbLogin('boss', true).token;
ev("appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '홍길동', status: ST.ACTIVE, carName: '포터2', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'd2', name: '김다른', status: ST.ACTIVE, createdAt: nowText_() }); 1");
const T1 = ev("createSession_('D1', true).token"), T2 = ev("createSession_('D2', true).token");
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const file = { data: PNG, mime: 'image/png' };
const alerts = (d) => ev("JSON.stringify(readAll_(SH.PALERT).filter(function (o) { return o.driverId === '" + d + "'; }).map(function (o) { return o.kind + '|' + o.text; }))");
let r = call('adm_bibSave', [tok, { driverId: 'D1' }]); const id = r.app.id;
ok(r.ok && r.app.stage === '작성' && r.app.docs && r.app.docs.permit === false && r.app.docPermit === undefined, '1 새 신청서: 단계 작성 · 최종 서류 없음 · 파일 주소는 화면에 안 내려감');
// 1. 등기 주소 알림
r = call('adm_bibNotify', [tok, id, 'mail']); ok(!r.ok, '2 출력 전에는 등기 주소 알림을 못 보냄');
r = call('adm_bibPrint', [tok, id, true]); ok(r.ok && r.detail.app.stage === '출력', '3 출력');
r = call('api_bibMine', [T1]); ok(r.ok && r.items.length === 0 && JSON.parse(alerts('D1')).length === 0, '4 출력만 해서는 기사에게 아무것도 안 감 (버튼을 눌러야)');
r = call('adm_bibNotify', [tok, id, 'mail']); ok(r.ok && !!r.app.mailNotiAt, '5 [기사에게 등기 주소 알림]');
let al = JSON.parse(alerts('D1'));
ok(al.length === 1 && /^bib\|배번호 서류 등기 발송 안내드립니다/.test(al[0]) && /05552/.test(al[0]) && /잠실로 209, 지하1층 메일룸 배번호담당자 귀하/.test(al[0]) && JSON.parse(alerts('D2')).length === 0, '6 그 기사에게만 알림: 우편번호 · 주소');
r = call('api_bibMine', [T1]);
ok(r.items.length === 1 && r.items[0].step === 'mail' && r.items[0].zip === '05552' && /잠실로 209/.test(r.items[0].addr), '7 기사앱: 등기 보낼 주소가 보임');
r = call('api_bibMine', [T2]); ok(r.ok && r.items.length === 0, '8 다른 기사 앱에는 안 보임');
// 2. 제출 → 허가 났음 → 최종서류 단계 + 알림
r = call('adm_bibStatus', [tok, id, 'submit', '']); ok(r.ok && r.app.stage === '제출', '9 제출');
r = call('adm_bibStatus', [tok, id, 'approve', '경기93배1540']);
ok(r.ok && r.app.status === '최종서류' && r.app.stage === '최종서류 대기' && r.app.plateNo === '경기93배1540' && ev("driverById_('D1').carNo") === '경기93배1540', '10 허가 났음: 최종서류 대기 단계 · 배 번호가 기사 정보에 반영');
al = JSON.parse(alerts('D1'));
ok(al.length === 2 && /^bib\|배번호 최종제출 서류 안내드립니다/.test(al[1]) && /화물운송 허가증 · 자동차등록증 · 화물운송 자격증/.test(al[1]), '11 기사에게 "배번호 최종제출 서류 안내드립니다" 알림');
r = call('api_bibMine', [T1]);
ok(r.items.length === 1 && r.items[0].step === 'final' && r.items[0].docs.permit === false && r.labels.length === 3 && r.labels[0][1] === '화물운송 허가증', '12 기사앱: 최종 서류 3종 올리기 안내');
// 3. 기사가 올림
r = call('api_bibDocUp', [T2, id, 'permit', file]); ok(!r.ok, '13 남의 신청서에는 못 올림');
r = call('api_bibDocUp', [T1, id, 'etc', file]); ok(!r.ok, '14 모르는 서류 종류는 거절');
r = call('api_bibDocUp', [T1, id, 'permit', { data: PNG, mime: 'text/html' }]); ok(!r.ok, '15 사진 · PDF 가 아니면 거절');
r = call('api_bibDocUp', [T1, id, 'permit', file]); if (!r.ok) console.log('DBG', JSON.stringify(r)); ok(r.ok && r.docs.permit === true && r.all === false, '16 허가증 올림 (1/3)');
r = call('adm_bibStatus', [tok, id, 'sent', '']); ok(!r.ok, '17 3종이 다 안 모이면 완료 처리 못 함');
r = call('api_bibDocUp', [T1, id, 'car', file]); r = call('adm_bibDocUp', [tok, id, 'qual', file]);
ok(r.ok && r.app.stage === '쿠팡 전달 대기' && r.app.docs.qual === true, '18 관리자가 대신 올릴 수 있음 → 3종 다 모이면 쿠팡 전달 대기');
r = call('adm_bibDoc', [tok, id, 'car']); ok(r.ok && r.data === PNG && r.mime === 'image/png' && /홍길동_배번호_자동차등록증_/.test(r.name), '19 관리자: 올라온 서류 열기 (파일 이름에 기사 · 서류 종류)');
r = call('adm_bibDocUp', [tok, id, 'qual', null]); ok(r.ok && r.app.docs.qual === false && r.app.stage === '최종서류 대기', '20 잘못 올린 서류 지우기');
r = call('adm_bibNotify', [tok, id, 'final']); ok(r.ok && JSON.parse(alerts('D1')).length === 3, '21 [기사에게 다시 알림]');
call('adm_bibDocUp', [tok, id, 'qual', file]);
// 4. 쿠팡 전달 = 허가완료
r = call('adm_bibStatus', [tok, id, 'sent', '']);
ok(r.ok && r.app.status === '허가' && r.app.stage === '허가완료' && !!r.app.sentAt, '22 [쿠팡에 보냈음] = 허가완료');
r = call('api_bibMine', [T1]); ok(r.items.length === 0, '23 끝나면 기사앱 안내도 사라짐');
r = call('api_bibDocUp', [T1, id, 'permit', file]); ok(!r.ok, '24 끝난 뒤에는 못 올림');
// 5. 재허가: 최종서류 단계 없음
r = call('adm_bibSave', [tok, { driverId: 'D2', kind: '재허가' }]); const rid = r.app.id;
call('adm_bibPrint', [tok, rid, true]); call('adm_bibStatus', [tok, rid, 'submit', '']);
r = call('adm_bibStatus', [tok, rid, 'approve', '경기90배0001']);
ok(r.ok && r.app.status === '허가' && r.app.stage === '허가완료' && JSON.parse(alerts('D2')).length === 0, '25 재허가는 그대로: 제출 → 허가 (알림 없음)');
// 6. 설정: 주소를 바꾸면 알림 · 앱에 반영
r = call('adm_companySave', [tok, { bibMailZip: '12345', bibMailAddr: '새 주소 1' }]);
ok(r.ok && ev('bibMailInfo_().zip') === '12345' && ev('bibMailInfo_().addr') === '새 주소 1', '26 등기 주소는 올인원 설정에서 고침');
r = call('adm_companyGet', [tok]); const kinds = {}; r.fields.forEach((f) => { kinds[f.key] = f.kind; });
ok(kinds.courierLogo === 'img' && kinds.bibMailAddr === 'opt', '27 설정 항목: 쿠팡 로고(그림) · 등기 주소');
ok(ev("alertMenuOf_({ kind: 'bib', jobId: 'BIB-1' })") === '', '28 배번호 알림은 품앗이 메뉴를 꺼도 감');
// 7. 화면
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/'작성', '출력', '제출', '최종서류 대기', '쿠팡 전달 대기', '허가완료', '반려'/.test(adm) && /bStages\(\)\.map\(\(s\) => \[s, mine\.filter\(\(a\) => bStage\(a\) === s\)\.length\]\)/.test(adm), '29 관리자: 단계 탭 6개 + 반려 · 단계별 개수');
ok(/data-bact="mailnoti">📮 기사에게 등기 주소 알림</.test(adm) && /data-bact="finalnoti">🔔 기사에게 다시 알림</.test(adm) && /data-bact="sent">✉ 쿠팡에 보냈음 → 허가완료</.test(adm) && /data-bact="docall">3종 모두 내려받기</.test(adm), '30 관리자: 등기 주소 알림 · 다시 알림 · 3종 내려받기 · 쿠팡에 보냈음');
ok(/id="bizLogoFile"/.test(adm) && /vals\.courierLogo = BIZ\.logo/.test(adm) && /<div class="clg"><img src="' \+ e\(co\.courierLogo\)/.test(adm), '31 설정에 쿠팡 로고 올리기 · 올린 그림이 제3자 제공 동의서에 찍힘');
ok(/배번호 최종제출 서류 안내드립니다/.test(idx) && /api\('api_bibMine', token\)/.test(idx) && /api\('api_bibDocUp', token, it\.id, key/.test(idx) && /id="bibCopy"/.test(idx) && /indexOf\('BIB-'\) === 0/.test(idx), '32 기사앱: 안내 제목 · 3종 올리기 · 주소 복사 · 알림을 누르면 안내 창');
ok(/try \{ bibBoot\(\); \}/.test(idx) && /lsGet\(BIB_SEEN\) !== k/.test(idx), '33 기사앱: 홈을 열 때 확인 · 새 안내는 한 번 자동으로 띄움');
// 로고가 있으면 그림 · 없으면 글자
const esc2 = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = new Function('esc', adm.slice(adm.indexOf('  const BIB_DOCS = '), adm.indexOf('  function printHtml(html)')) + '; return bibDocsHtml;')(esc2);
const LOGO = 'data:image/png;base64,' + PNG;
ok(/<div class="clg"><img src="data:image\/png;base64,/.test(html({ company: { courierLogo: LOGO } }, { cls3: 1 })) && /<div class="cl">coupang <span>logistics services<\/span>/.test(html({ company: {} }, { cls3: 1 })) && !/class="clg"/.test(html({ company: { courierLogo: 'javascript:1' } }, { cls3: 1 })), '34 로고: 올린 그림이 있으면 그림 · 없으면 글자 · 그림 주소가 아니면 무시');
