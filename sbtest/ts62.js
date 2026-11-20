// S62 확인 기록: 기사앱에 알리지 않은 스케줄 변경(다음 주 이후)은 '미확인'으로 세지 않음 · 가중요인 누적은 최신 기준일 줄만 (TZ=UTC)
//  사용: node sbtest/ts62.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=', SEEN_SCH_RESET: 'x' }); // S64 한 번 비우기는 이미 한 것으로
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T20:00:00+09:00')); // 목요일
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '홍길동', status: ST.ACTIVE, createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token;
// 1. 확인 기록
const seen = (key, at, ack) => ({ kind: 'sch', driverId: 'D1', name: '', key, old: '출근', text: '휴무', at, ackAt: ack || '', by: '대표' });
ev("seenAppend_(" + JSON.stringify([seen('2026-11-21', '2026-11-19 15:00:00'), seen('2026-12-07', '2026-11-19 00:18:00'), seen('2026-12-31', '2026-11-18 10:00:00'), seen('2026-11-20', '2026-11-18 10:00:00', '2026-11-19 09:00:00'), seen('2026-11-22', '2026-11-21 10:00:00'), seen('2026-11-23', '2026-11-21 10:00:00')]) + "); 1");
let r = call('adm_seenList', [tok]);
const sch = r.rows.filter((x) => x.k === 'sch'), by = (k) => sch.find((x) => x.key === k);
ok(r.ok && sch.length === 6, '1 스케줄 변경 기록 6줄 그대로 내려옴 (지우지 않음)');
ok(!by('2026-11-21').skip && by('2026-12-07').skip === 1 && by('2026-12-31').skip === 1, '2 이번 주(토요일까지) 변경은 확인 대상 · 다음 주 이후는 「알림 대상 아님」');
ok(!by('2026-11-20').skip && !!by('2026-11-20').ack, '3 이미 확인한 것은 그대로');
ok(by('2026-11-22').skip === 1 && by('2026-11-23').skip === 1, '4 (S100) 오늘(목) 기준: 다음 주 일 · 월은 아직 안 뜸 (고친 날이 아니라 오늘 기준)');
KDate.__setClock(() => Date.parse('2026-11-21T20:00:00+09:00')); // 토요일
{ const r2 = call('adm_seenList', [tok]), b2 = (k) => r2.rows.find((x) => x.k === 'sch' && x.key === k); ok(!b2('2026-11-22').skip && b2('2026-11-23').skip === 1, '4b 토요일이 되면 일요일(내일 = PDD)은 확인 대상 · 월요일은 아직 (기사앱 규칙과 같음)'); }
KDate.__setClock(() => Date.parse('2026-11-19T20:00:00+09:00'));
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/schOpen = sch\.filter\(\(r\) => !r\.ack && !r\.skip && r\.key >= D\.today\)/.test(adm) && (adm.match(/r\.skip \? 'al-dim">아직 안 보냄/g) || []).length === 2, '5 화면: 미확인 숫자 · 「확인 안 한 것만」 에서 빠지고 줄에는 「아직 안 보냄 · 그 주 일요일부터」');
// 2. 가중요인 누적: 최신 기준일만
const fb = (to, code, period, kind) => ({ key: [period, kind || '누적', '안양1', code, to].join('|'), period, kind: kind || '누적', from: '', to, date: kind === '일별' ? to : '', wave: '', camp: '안양1', code, f1pct: '100', f1: '해당', f2pct: '90', f2: '해당', file: 'f', uploadedAt: '2026-11-19 17:16:07', uploadedBy: 'x' });
ev("appendObjs_(SH.RFB, " + JSON.stringify([fb('2026-11-10', '110A', '2026-11-25'), fb('2026-11-10', '110B', '2026-11-25'), fb('2026-11-17', '724A', '2026-11-25'), fb('2026-11-17', '724B', '2026-11-25'), fb('2026-10-25', '110A', '2026-10-25'), fb('2026-11-10', '110A', '2026-11-25', '일별')]) + "); 1");
const live = JSON.parse(ev("JSON.stringify(fbLive_().map(function (o) { return o.period + ' ' + o.kind + ' ' + o.code + ' ' + o.to; }))"));
ok(live.length === 4 && !live.some((x) => /2026-11-25 누적 110[AB]/.test(x)) && live.filter((x) => /2026-11-25 누적 724/.test(x)).length === 2, '6 이번 정산기간 누적: 최신 기준일(11/17) 줄만 — 새 파일에서 빠진 예전 코드는 안 보임 ' + JSON.stringify(live));
ok(live.indexOf('2026-10-25 누적 110A 2026-10-25') >= 0 && live.some((x) => /일별 110A/.test(x)), '7 지난 정산기간 · 일별 줄은 그대로');
ok(ev("fbAll_().length") === 6, '8 자료는 지우지 않음 (저장할 때는 전체를 봄)');
r = call('adm_fbList', [tok]);
ok(r.ok && r.cum.filter((x) => x.period === '2026-11-25').length === 2, '9 관리자 가중요인 화면: 이번 기간 라우트 2개');
