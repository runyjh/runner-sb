// S64 스케줄 변경 기록(app_seen 의 sch 줄)을 한 번 비우고 이번 주 규칙대로만 새로 쌓기 (TZ=UTC)
//  사용: node sbtest/ts64.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-19T20:50:00+09:00')); // 목요일
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '홍길동', status: ST.ACTIVE, createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token;
const sch = (key, at, ack) => ({ kind: 'sch', driverId: 'D1', name: '', key, old: '출근', text: '휴무', at, ackAt: ack || '', by: '대표' });
ev("seenAppend_(" + JSON.stringify([sch('2026-12-31', '2026-11-18 10:00:00'), { kind: 'open', driverId: 'D1', name: '홍길동', key: '', text: '3', at: '2026-11-15 10:00:00', ackAt: '2026-11-19 20:16:03' }, sch('2026-11-21', '2026-11-19 15:00:00'), { kind: 'notice', driverId: 'D1', name: '홍길동', key: 'N1', at: '2026-11-19 19:00:00' }, sch('2026-11-20', '2026-11-18 10:00:00', '2026-11-19 09:00:00'), { kind: 'slip', driverId: 'D1', name: '홍길동', key: '2026-10', at: '2026-11-15 10:00:00' }]) + "); 1");
const kinds = () => JSON.parse(ev("JSON.stringify(readAll_(SH.SEEN).filter(function (o) { return o.kind; }).map(function (o) { return o.kind + ':' + o.key; }))"));
ok(kinds().filter((k) => /^sch:/.test(k)).length === 3, '1 준비: 스케줄 변경 3줄 + 공지 · 정산서 · 앱 연 기록');
let r = call('adm_seenList', [tok]);
ok(r.ok && !r.rows.some((x) => x.k === 'sch'), '2 확인 기록 화면을 열면 스케줄 변경 기록이 모두 비워짐');
ok(kinds().join() === 'open:,notice:N1,slip:2026-10', '3 공지 · 정산서 · 앱 연 기록은 그대로 ' + JSON.stringify(kinds()));
ok(/ · 3$/.test(S.props.SEEN_SCH_RESET || ''), '4 한 번만 (표시 남김) ' + S.props.SEEN_SCH_RESET);
// 새로 쌓기: 이번 주 안 변경만
const n = ev("seenSchChanges_({ name: '대표' }, [{ row: 'D1', date: '2026-11-21', old: '출근', value: '휴무' }, { row: 'D1', date: '2026-12-06', old: '출근', value: '휴무' }, { row: 'D1', date: '2026-11-18', old: '출근', value: '휴무' }, { row: 'D1', date: '2026-11-20', old: '', value: '출근' }])");
ok(n === 1 && kinds().filter((k) => /^sch:/.test(k)).join() === 'sch:2026-11-21', '5 그 뒤로는 이번 주(11/21 토요일까지) 변경만 쌓임 — 다음 주 · 지난 날 · 빈 칸에 처음 넣은 것은 안 쌓임');
call('adm_seenList', [tok]);
ok(kinds().filter((k) => /^sch:/.test(k)).length === 1, '6 다시 열어도 새 기록은 안 지워짐');
