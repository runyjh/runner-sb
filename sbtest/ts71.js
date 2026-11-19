// S71 확인 기록: 안 본 사람에게 다시 알림 — 공지 · 정산서 · 스케줄 변경 · 허위배송 · 기사별 한 번에 · 1시간 안 다시 보내기 막기 (TZ=UTC)
//  사용: node sbtest/ts71.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=', SEEN_SCH_RESET: 'x', FK_SEEN_INIT: 'x' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-19T22:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); ['가','나','다'].forEach(function (n, i) { appendObj_(SH.DRIVERS, { id: 'D' + i, loginId: 'd' + i, name: n + '기사', status: ST.ACTIVE, schCamp: '안양1캠프', baseRoute: '723C', createdAt: nowText_() }); }); 1");
const tok = fresh().__sbLogin('boss', true).token;
ev("appendObj_(SH.NOTICE, { id: 'N1', title: '안전 교육', body: '내용', status: NST.ON, start: '2026-11-18', createdAt: nowText_() }); " +
  "appendObj_(SH.SEEN, { kind: 'notice', driverId: 'D0', name: '가기사', key: 'N1', at: nowText_() }); " +
  "appendObj_(SH.SEEN, { kind: 'sch', driverId: 'D1', name: '나기사', key: '2026-11-20', old: '723C', text: '휴무', at: '2026-11-19 10:00:00' }); " +
  "appendObj_(SH.SEEN, { kind: 'sch', driverId: 'D2', name: '다기사', key: '2026-11-20', old: '723C', text: '724A', at: '2026-11-19 10:00:00', ackAt: '2026-11-19 11:00:00' }); " +
  "appendObj_(SH.SEEN, { kind: 'fake', driverId: 'D2', name: '다기사', key: 'C|x', text: '11/18 06:58 인천7 917D01', at: nowText_() }); " +
  "appendObj_(SH.SEEN, { kind: 'slip', driverId: 'D0', name: '가기사', key: '2026-10', at: nowText_() }); 1");
const SL = "stlRead_ = function (n) { if (n === 'stl_close') return [{ month: '2026-10' }]; if (n === 'stl_closed') return [{ month: '2026-10', acct: '_summary', data: JSON.stringify({ drivers: [{ ownerId: 'D0' }, { ownerId: 'D1' }] }) }]; return []; }; ";
const rem = (p) => JSON.parse(ev(SL + "JSON.stringify(adm_seenRemind(" + JSON.stringify(tok) + ", " + JSON.stringify(p) + "))"));
let r = rem({ kind: 'notice', key: 'N1' });
ok(r.ok && r.target === 2 && r.off.sort().join() === '나기사,다기사', '1 공지: 안 본 2명(나 · 다) · 알림 꺼진 기사 이름 돌려줌 ' + JSON.stringify(r));
r = rem({ kind: 'notice', key: 'N1' });
ok(!r.ok && /이미 보냈습니다/.test(r.msg), '2 같은 항목 1시간 안 다시 보내기 막음 · ' + r.msg);
r = rem({ kind: 'slip', key: '2026-10' });
ok(r.ok && r.target === 1, '3 정산서: 그 달 정산서가 있는 기사(가 · 나) 중 안 연 1명(나)만 — 정산서 없는 다기사 제외 ' + JSON.stringify(r));
r = rem({ kind: 'sch' });
ok(r.ok && r.target === 1 && r.off.join() === '나기사', '4 스케줄 변경: 확인 안 한 1명(나) · 확인한 다기사 제외');
r = rem({ kind: 'fake' });
ok(r.ok && r.target === 1 && r.off.join() === '다기사', '5 허위배송: [확인했습니다] 안 누른 1명(다)');
r = rem({ kind: 'drv', driverId: 'D1' });
ok(r.ok && r.target === 1, '6 기사별(나기사): 공지 · 정산서 · 스케줄 변경을 알림 한 번에');
const txt = ev(SL + "(function () { var o = []; pmPushSend_ = function (l) { o = l; return l.length; }; seenRemindMark_ = function () { return { at: 1, n: 1 }; }; adm_seenRemind(" + JSON.stringify(tok) + ", { kind: 'drv', driverId: 'D1', force: 1 }); return o[0].title + ' | ' + o[0].text; })()");
ok(/확인할 것이 3건/.test(txt) && /공지 1건/.test(txt) && /10월 정산서/.test(txt) && /스케줄 변경 1건/.test(txt), '7 기사별 알림 글: ' + txt);
const m = JSON.parse(ev("JSON.stringify(seenRemindMap_())"));
ok(m['notice|N1'] && m['slip|2026-10'] && m['sch|'] && m['fake|'] && m['drv|D1'], '8 보낸 시각을 항목별로 남김 → 확인 기록 화면에 「보냄 11/19 22:00」');
r = call('adm_seenList', [tok]);
ok(r.ok && r.remind && r.remind['notice|N1'], '9 확인 기록 목록에 보낸 시각 같이 내려줌');
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/remBtn\('notice'/.test(ad) && /remBtn\('slip'/.test(ad) && /remBtn\('sch'/.test(ad) && /remBtn\('fake'/.test(ad) && /remBtn\('drv'/.test(ad) && /api\('adm_seenRemind'/.test(ad), '10 관리자 확인 기록: 공지 · 정산서 · 스케줄 변경 · 허위배송 · 기사별 탭에 다시 알림 버튼');
