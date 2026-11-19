// S59 업로드 · 메일 수집 기록은 업무스케줄에 적지 않고 수집 · 업로드 기록(mail_log)에만 · 쿠팡 정산 일정은 필수 정보만 · 예전 줄 한 번 정리 (TZ=UTC)
//  사용: node sbtest/ts59.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-19T09:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
const memos = () => JSON.parse(ev("JSON.stringify(readAll_(SH.MEMO).filter(function (m) { return m.id; }).map(function (m) { return m.content; }))"));
const logs = () => JSON.parse(ev("JSON.stringify(readAll_(SH.MAILLOG).filter(function (o) { return o.at; }).map(function (o) { return [o.from, o.file, o.kind, o.status, o.detail]; }))"));
// 1. 직접 올림 → 업무스케줄 X · 기록 O
let r = ev("var a = { name: '대표', loginId: 'boss' }; JSON.stringify([uploadMemo_(a, '46주차 수행률 업로드', '3~4등급 6 · 개선 요청 2', true), uploadMemo_(a, '11월 피크 예상 물량 업로드', '11/1~11/7', false)])");
ok(r === '[null,null]' && memos().length === 0, '1 직접 올려도 업무스케줄에는 안 적힘');
let L = logs();
ok(L.length === 2 && L[0][0] === '직접 올림 · 대표' && L[0][1] === '46주차 수행률 업로드' && L[0][2] === '주간 수행률' && L[0][3] === '저장' && L[0][4] === '⚠ 3~4등급 6 · 개선 요청 2', '2 수집 · 업로드 기록에 한 줄 (확인할 것 있으면 ⚠) ' + JSON.stringify(L[0]));
ok(L[1][2] === '피크 물량' && L[1][4] === '11/1~11/7', '3 확인할 것 없으면 ⚠ 없음');
ok(ev("[upKind_('11월 SLA 업로드'), upKind_('가중요인 업로드 (11/17 기준)'), upKind_('10월 정산서 업로드')].join()") === 'SLA 점수,가중요인,정산서', '4 종류 알아보기');
// 2. 메일 자동 수집 → 업무스케줄 X · 여기서는 기록도 안 씀 (수집기가 자기 줄을 씀) · 표시만 넘김
r = ev("_sysAdmin = { token: 'x', a: { name: '메일 자동수집', loginId: 'mail' } }; _upNeed = false; var o = uploadMemo_(_sysAdmin.a, '47주차 수행률 업로드', '3~4등급 1', true); JSON.stringify([o, _upNeed])");
ok(r === '[null,true]' && memos().length === 0 && logs().length === 2, '5 메일 수집: 업무스케줄에 안 적힘 · 확인 표시만 넘김');
r = ev("_sysAdmin = { token: 'x', a: { name: '메일 자동수집', loginId: 'mail' } }; _upNeed = false; uploadMemo_(_sysAdmin.a, '47주차 수행률 업로드', '', false); _upNeed");
ok(r === false, '6 확인할 것 없으면 표시 없음');
const mi = fs.readFileSync(path.join(SRC, 'MailIn.gs'), 'utf8');
ok(/_upNeed = false;\s*\n\s*const r = mailSave_\(U, name, sheets, f\);\s*\n\s*if \(_upNeed && r\.status === MAIL_ST\.SAVED\) r\.detail = UP_WARN \+ str_\(r\.detail\);/.test(mi), '7 수집기 기록 줄 앞에 ⚠ (저장됐을 때만 · 상태는 그대로 저장 → 중복 판정 안 바뀜)');
ok(ev("perfMemoOn_()") === true && call('adm_perfSet', [tok, {}]).memoOn === false, '8 기록은 늘 남김 · 화면의 「업무스케줄에」 스위치는 꺼진 값');
// 3. 쿠팡 정산 일정: 필수 정보만
const mail = '26년 11월 퀵플렉스 수수료 정산 일정 안내\n11.28 (금) | 정산서 발송 | 메일로 발송되며 첨부파일 확인\n12.03 (수) | 역발행 승인 기한 | 미승인 시 지급 지연\n12.10 (수) | 수수료 지급 | 은행 사정에 따라 지연 가능\n* 정산서 수정접수 기한 : 11월 28일 ~ 12월 03일 오후 12시까지';
r = call('adm_cpStlPaste', [tok, mail]);
let M = memos();
ok(r.ok && M.length === 4, '9 정산 일정 4건이 업무스케줄에 (실제 할 일이라 유지) ' + JSON.stringify(r.msg || M.length));
ok(M.indexOf('[쿠팡 정산] 11월 정산서 발송') >= 0 && M.indexOf('[쿠팡 정산] 11월 역발행 승인 기한') >= 0 && M.indexOf('[쿠팡 정산] 11월 수수료 지급') >= 0, '10 내용만 (비고 없음) ' + JSON.stringify(M));
ok(M.some((c) => c === '[쿠팡 정산] 11월 정산서 수정접수 기한 — 11/28 (토) ~ 12/3 (목) 12:00까지' || /^\[쿠팡 정산\] 11월 정산서 수정접수 기한 — 11\/28 \(.\) ~ 12\/3 \(.\) 12:00까지$/.test(c)), '11 수정접수 기한: 기간 · 시각만');
ok(!M.some((c) => /첨부파일|지연|메일로 요청/.test(c)), '12 비고 · 덧말이 안 들어감');
ok(/첨부파일 확인/.test(JSON.stringify(call('adm_cpStlSched', [tok]))), '13 비고는 정산관리 위 일정 줄에 그대로 남아 있음');
// 4. 예전 자동 줄 한 번 정리
ev("['46주차 수행률 업로드', '46주차 수행률 업로드 (3~4등급 6 · 개선 요청 2)', '가중요인 업로드 (11/17 기준) (둘 다 미해당 9 · 하나 미해당 13)', '11월 피크 예상 물량 업로드 (11/1~11/7)', '10월 정산서 업로드', '9월 SLA 업로드 (위험 24)', '11월 가중요인 확정 업로드', '수행률 업로드 방법 정리하기', '46주차 수행률 업로드 확인 전화'].forEach(function (c, i) { appendObj_(SH.MEMO, { id: 'MX' + i, date: '2026-11-1' + i, time: '', content: c, done: 'Y', cat: '', author: i < 2 ? '메일 자동수집' : '대표', createdAt: nowText_(), updatedAt: nowText_() }); }); 1");
ok(memos().length === 13, '14 준비: 예전 자동 줄 7 + 사람이 쓴 비슷한 글 2 + 정산 일정 4');
r = call('adm_memoMonth', [tok, '2026-11']);
M = memos();
ok(r.ok && M.length === 6 && M.indexOf('수행률 업로드 방법 정리하기') >= 0 && M.indexOf('46주차 수행률 업로드 확인 전화') >= 0 && M.filter((c) => /^\[쿠팡 정산\]/.test(c)).length === 4, '15 업무스케줄을 열면 자동 줄 7개만 지워짐 (사람이 쓴 글 · 정산 일정은 그대로) ' + JSON.stringify(M));
ok(/ · 7$/.test(S.props.UP_MEMO_CLEAN || ''), '16 정리는 한 번만 (표시 남김) ' + S.props.UP_MEMO_CLEAN);
ev("appendObj_(SH.MEMO, { id: 'MY1', date: '2026-11-20', time: '', content: '47주차 수행률 업로드', done: '', cat: '', author: '대표', createdAt: nowText_(), updatedAt: nowText_() }); 1");
call('adm_memoMonth', [tok, '2026-11']);
ok(memos().indexOf('47주차 수행률 업로드') >= 0, '17 정리 뒤에 사람이 같은 글을 적으면 지우지 않음');
// 5. 화면
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(!/onBtn\('memo'/.test(adm), '18 화면: 「업로드 기록을 업무스케줄에」 스위치 없앰');
ok(/수집 · 업로드 기록/.test(adm) && /확인할 것 있음/.test(adm) && /오늘 확인할 것<b>/.test(adm) && /manual\(r\) \? ' · ' \+ esc\(r\.from\)/.test(adm), '19 화면: 기록 제목 · ⚠ 줄 노랑 + 「확인할 것 있음」 · 오늘 확인할 것 개수 · 직접 올린 사람');
