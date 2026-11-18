// S24 쿠팡 정산 일정 메일 → 업무스케줄 (수집기 본문 · 붙여넣기 · 같은 달 다시 받으면 바꿈) (TZ=UTC)
//  사용: node sbtest/ts18.js <runner-allinone 폴더>
const path = require('path');
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
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_();");
const tok = fresh().__sbLogin('boss', true).token;
const today = ev('todayText_()');
const key = call('adm_mailKeyNew', [tok]).key;
const HTML = '<p>안녕하세요. 쿠팡로지스틱스 서비스입니다.<br>26년 11월 퀵플렉스 정산 일정을 아래와 같이 안내 드립니다.</p><p><b>1.정산일정 :</b></p><table><tr><th>일 자</th><th>내 용</th><th>비 고</th></tr>' +
  '<tr><td>11.28 (토요일)</td><td>1차 정산서</td><td>프레시백 추가 인센티브 포함 예정 - 당월 누적기준</td></tr>' +
  '<tr><td>12.01 (화요일)</td><td>2차 정산서<br>(1차 정산서 수정 내역이 있을 경우 )</td><td></td></tr>' +
  '<tr><td>12.03 (목요일)</td><td>3차 최종 정산서<br>(1차 혹은 2차 정산서 수정 내역이 있을 경우)</td><td>프레시백 추가 인센티브 포함 예정 - 당월 누적기준</td></tr>' +
  '<tr><td>12.03 (목요일)</td><td>유니포스트 역발행 계산서 송부</td><td></td></tr>' +
  '<tr><td>12.09 (수요일)</td><td>유니포스트 역발행 승인 기한</td><td>역발행 계산서를 기한내에 승인해주시지 않으면, 국세청 전송이 누락되어 미신고로 인한 가산세가 부과됨</td></tr>' +
  '<tr><td>12.15 (화요일)</td><td>수수료입금</td><td>12월 09일 기간내 승인 영업점</td></tr></table>' +
  '<p>* 정산서 수정접수 기한 : 11월 28일 ~ 12월 03일 오후 12시까지<br>* 프레시백 추가 인센티브의 경우, 최종적으로 어뷰징 검수가 완료된 누적 기준의 리스트로 반영될 예정입니다.</p><p><b>2.정산자료 검토</b><br>2-1. 정산자료 수정 요청은 위 표의 접수 기한내 메일로 부탁드리겠습니다.</p>';
const SUBJ = '26년 11월 퀵플렉스 수수료 정산 일정 안내의 건 (11월 수수료 발생 영업점限)';
const memos = () => ev("readAll_(SH.MEMO)").filter((m) => m.author === '쿠팡 메일' || /쿠팡 정산/.test(m.content));
const r1 = call('api_mailBody', [key, { msgId: 'M1', from: 'GRP_CLS_Quick_pay <grp_cls_quick_pay@coupangls.com>', subject: SUBJ, date: '2026-11-18 10:00', html: HTML }]);
const m1 = memos(), by = (d) => m1.filter((m) => m.date === d).map((m) => m.content);
ok(r1.ok && r1.status === '저장' && r1.period === '2026-11' && m1.length === 7, '1 메일 본문 → 업무스케줄 7건 (표 6줄 + 수정접수 기한) · ' + r1.status);
ok(by('2026-11-28').some((c) => /11월 1차 정산서 — 프레시백/.test(c)) && by('2026-12-15').some((c) => /수수료입금/.test(c)), '2 날짜 · 내용 · 비고 (11/28 1차 정산서 · 12/15 수수료입금)');
const pins = m1.filter((m) => String(m.pin) === 'Y');
ok(pins.length === 2 && pins.some((m) => m.date === '2026-12-09' && /승인 기한/.test(m.content) && m.until === '2026-12-09' && m.color === '빨강') && pins.some((m) => m.date === '2026-12-03' && m.time === '12:00' && /수정접수 기한 — 11\/28 \(토\) ~ 12\/3 \(목\) 12:00까지/.test(m.content)), '3 기한 2건은 📌 항상 보기 · 빨강 (승인 기한 12/9 · 수정접수 12/3 12시)');
const r2 = call('api_mailBody', [key, { msgId: 'M1', from: 'grp_cls_quick_pay@coupangls.com', subject: SUBJ, date: '2026-11-18 10:00', html: HTML }]);
ok(r2.dup && memos().length === 7, '4 같은 메일은 한 번만');
const r3 = call('adm_cpStlPaste', [tok, SUBJ + '\n1.정산일정 :\n일 자\t내 용\t비 고\n11.28 (토요일)\t1차 정산서\t프레시백\n12.01 (화요일)\t2차 정산서\t\n12.16 (수요일)\t수수료입금\t\n* 정산서 수정접수 기한 : 11월 28일 ~ 12월 02일 오후 1시까지']);
const m3 = memos();
ok(r3.ok && r3.sched.ym === '2026-11' && m3.length === 4 && m3.some((m) => m.date === '2026-12-16') && !m3.some((m) => m.date === '2026-12-15') && m3.some((m) => m.time === '13:00'), '5 붙여넣기(같은 달 정정) → 예전 7건 지우고 새로 4건 (입금 12/16 · 마감 13시)');
const r4 = call('api_mailBody', [key, { msgId: 'X', from: 'someone@gmail.com', subject: '정산 일정', html: HTML }]);
ok(r4.ok && r4.status === '쿠팡 파일 아님' && memos().length === 4, '6 쿠팡이 아닌 메일은 넣지 않음');
const s = call('adm_cpStlSched', [tok]);
ok(s.ok && s.sched.ym === '2026-11' && s.sched.rows.length === 3 && s.sched.fix.to === '2026-12-02', '7 정산관리 위 한 줄에 쓸 일정 (' + s.sched.rows.map((r) => r.date.slice(5) + ' ' + r.what).join(' · ') + ')');
const y = call('adm_cpStlPaste', [tok, '26년 12월 정산 일정\n12.28 (월요일) | 1차 정산서\n01.05 (화요일) | 수수료입금']);
ok(y.ok && y.sched.rows[1].date === '2027-01-05', '8 12월 정산의 1월 날짜는 다음 해 (2027-01-05)');
