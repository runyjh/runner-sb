// S61 가중요인 누적 기간 표시(10/26~11/17) · 쿠팡 정산 일정 메모 짧은 이름 + 이미 넣은 메모 한 번 다시 적기 (TZ=UTC)
//  사용: node sbtest/ts61.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=', UP_MEMO_CLEAN: 'x' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T09:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
// 1. 가중요인 누적 기간
ok(ev("[fbCumFromMd_('2026-11-17'), fbCumFromMd_('2026-11-25'), fbCumFromMd_('2026-11-26'), fbCumFromMd_('2026-01-10'), fbCumFromMd_('2026-12-31')].join()") === '10/26,10/26,11/26,12/26,12/26', '1 누적 시작일: 25일까지는 전달 26일 · 26일부터 그 달 26일 · 1월은 12/26');
const rp = fs.readFileSync(path.join(SRC, 'RoutePerf.gs'), 'utf8'), adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/'가중요인 업로드 \(' \+ fbCumFromMd_\(cumTo\) \+ '~'/.test(rp) && !/' 기준\)'/.test(rp.split('function uploadMemo_')[0].split('가중요인 업로드 (')[1] || ''), '2 기록 제목: 가중요인 업로드 (10/26~11/17)');
ok(/<b>누적 ' \+ esc\(fbCumFrom\(to\) \+ '~' \+ slaPd\(to\)\)/.test(adm) && !/기준일 ' \+ esc\(slaPd\(to\)\)/.test(adm), '3 관리자 화면: 「누적 10/26~11/17」 (기준일만 보이던 자리)');
const fbCumFrom = eval('(' + adm.match(/const fbCumFrom = (\(to\) => \{[^\n]*?\});/)[1] + ')');
ok(fbCumFrom('2026-11-17') === '10/26' && fbCumFrom('2026-01-03') === '12/26' && fbCumFrom('2026-11-26') === '11/26', '4 관리자 화면 계산이 서버와 같음');
ok(/'월 정산 · 누적 ' \+/.test(idx) && !/md\(to\) \+ ' 기준'/.test(idx), '5 기사앱: 「11월 정산 · 누적 10/26~11/17」');
// 2. 정산 일정 짧은 이름
const sh = (t) => ev("cpsShort_(" + JSON.stringify(t) + ")");
ok(sh('1차 정산서 프레시백 추가 인센티브 포함 예정 - 당월 누적기준') === '1차 정산서' && sh('3차 최종 정산서 (1차 혹은 2차 정산서 수정 내역이 있을 경우) 프레시백 추가 인센티브 포함 예정 - 당월 누적기준') === '3차 최종 정산서' && sh('2차 정산서 (1차 정산서 수정 내역이 있을 경우)') === '2차 정산서', '6 정산서 줄: 차수만');
ok(sh('유니포스트 역발행 계산서 송부') === '유니포스트 역발행 계산서 송부' && sh('유니포스트 역발행 승인 기한 역발행 계산서를 기한내에 승인해주시지 않으면, 국세청 전송이 누락되어 미신고로 인한 가산세가 부과됨') === '유니포스트 역발행 승인 기한' && sh('수수료입금 12월 09일 기간내 승인 영업점') === '수수료입금', '7 역발행 · 입금 줄: 일 이름만');
ok(sh('정산서 발송') === '정산서 발송' && sh('수수료 지급') === '수수료 지급' && sh('알 수 없는 긴 안내 문구 - 뒤쪽 설명') === '알 수 없는 긴 안내 문구', '8 「정산서 발송」처럼 붙은 말은 유지 · 모르는 글은 - 앞까지');
// 3. 이미 넣은 메모 한 번 다시 적기
const rows = [{ date: '2026-11-28', what: '1차 정산서 프레시백 추가 인센티브 포함 예정 - 당월 누적기준', note: '', pin: false }, { date: '2026-12-09', what: '유니포스트 역발행 승인 기한 역발행 계산서를 기한내에 승인해주시지 않으면, 가산세가 부과됨', note: '', pin: true }, { date: '2026-12-15', what: '수수료입금 12월 09일 기간내 승인 영업점', note: '', pin: false }];
ev("var ids = " + JSON.stringify(rows) + ".map(function (r) { return memoSave_({ name: '쿠팡 메일' }, { date: r.date, content: '[쿠팡 정산] 11월 ' + r.what }).memo.id; }); PropertiesService.getScriptProperties().setProperty('CP_STL_SCHED', JSON.stringify({ ym: '2026-11', rows: " + JSON.stringify(rows) + ", fix: { from: '2026-11-28', to: '2026-12-03', time: '12:00' }, memoIds: ids, msgId: 'M1', by: '메일 수집', at: nowText_(), subject: 's' })); 1");
const memos = () => JSON.parse(ev("JSON.stringify(readAll_(SH.MEMO).filter(function (m) { return m.id; }).map(function (m) { return [normDate_(m.date) || m.date, m.content, m.pin || '', m.color || '']; }))"));
ok(memos().length === 3 && /누적기준/.test(memos()[0][1]), '9 준비: 긴 글로 들어가 있는 메모 3건');
call('adm_memoMonth', [tok, '2026-11']);
let M = memos();
ok(M.length === 4 && M.map((m) => m[1]).sort().join('|') === ['[쿠팡 정산] 11월 1차 정산서', '[쿠팡 정산] 11월 수수료입금', '[쿠팡 정산] 11월 유니포스트 역발행 승인 기한', '[쿠팡 정산] 11월 정산서 수정접수 기한 — 11/28 (토) ~ 12/3 (목) 12:00까지'].sort().join('|'), '10 업무스케줄을 열면 짧은 이름으로 다시 적힘 (예전 긴 글은 지워짐) ' + JSON.stringify(M.map((m) => m[1])));
ok(M.filter((m) => m[3] === '빨강').length === 2, '11 기한 2건은 빨강 📌 그대로');
ok(/누적기준/.test(JSON.stringify(call('adm_cpStlSched', [tok]))) && JSON.parse(S.props.CP_STL_SCHED).msgId === 'M1', '12 정산관리 위 일정 줄에는 전체 글 그대로 · 같은 메일로 기억');
call('adm_memoMonth', [tok, '2026-11']);
ok(memos().length === 4 && / · 4$/.test(S.props.CPS_SHORT_FIX), '13 다시 적기는 한 번만');
