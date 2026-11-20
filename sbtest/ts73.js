// S73 확인 기록 리뉴얼 「챙길 사람」: 알림이 가는 메뉴 8곳(공지 · 정산서 · 스케줄 · 품앗이 · 허위배송 · 서류 · 게시판 · 앱)을 사람마다 꼬리표로 · 메뉴별/기사별 다시 알림 · 확인 기록 초기화(대표만 · 백업 · 되돌리기) (TZ=UTC)
//  사용: node sbtest/ts73.js <runner-allinone 폴더>
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
const full = "docQual: 'f', docLicense: 'f', docBiz: 'f', docCar: 'f'";
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.ADMINS, { id: 'A2', loginId: 'staff', name: '직원', status: AST.ACTIVE, createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D9', loginId: 'boss', name: '유대표', title: '대표', status: ST.ACTIVE, schCamp: '운영자', createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D0', loginId: 'd0', name: '가기사', status: ST.ACTIVE, schCamp: '안양1캠프', " + full + ", createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'd1', name: '나기사', status: ST.ACTIVE, schCamp: '안양1캠프', docQual: 'f', docBiz: 'f', docCar: 'f', createdAt: nowText_() }); " +
  "appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'd2', name: '다기사', status: ST.ACTIVE, schCamp: '군포1캠프', " + full + ", createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token, tok2 = fresh().__sbLogin('staff', true).token;
ev("appendObj_(SH.NOTICE, { id: 'N1', title: '안전 교육', body: '내용', status: NST.ON, start: '2026-11-18', createdAt: nowText_() }); " +
  "['D9','D0','D2'].forEach(function (d) { appendObj_(SH.SEEN, { kind: 'notice', driverId: d, key: 'N1', at: nowText_() }); appendObj_(SH.SEEN, { kind: 'open', driverId: d, at: '2026-11-19 09:00:00', text: '3' }); }); " +
  "appendObj_(SH.SEEN, { kind: 'open', driverId: 'D1', at: '2026-11-14 09:00:00', text: '1' }); " +
  "appendObj_(SH.SEEN, { kind: 'sch', driverId: 'D2', key: '2026-11-21', old: '723C', text: '휴무', at: '2026-11-19 10:00:00' }); " +
  "appendObj_(SH.SEEN, { kind: 'sch', driverId: 'D0', key: '2026-11-20', old: '723C', text: '724A', at: '2026-11-19 10:00:00', ackAt: '2026-11-19 11:00:00' }); " +
  "appendObj_(SH.SEEN, { kind: 'fake', driverId: 'D2', key: 'C|x', text: '11/18 인천7 917D01', at: nowText_() }); " +
  "appendObj_(SH.SEEN, { kind: 'inst', driverId: 'D0', key: '2026-11-19', at: nowText_() }); " +
  "appendObj_(SH.BIB, { id: 'B1', driverId: 'D1', name: '나기사', status: '최종서류', docCar: 'f', createdAt: nowText_() }); " +
  "appendObjs_(SH.PALERT, [{ id: 'P1', driverId: 'D0', jobId: 'J1', kind: 'conv', text: '배차 확정 · 11/20 723C', createdAt: '2026-11-19 08:00:00' }, { id: 'P2', driverId: 'D0', jobId: 'BD-x', kind: 'board', text: '내 글에 댓글 · 안녕하세요', createdAt: '2026-11-19 08:00:00' }, { id: 'P3', driverId: 'D2', jobId: 'J2', kind: 'need', text: '일감 요청 · 11/22', createdAt: '2026-11-19 08:00:00', readAt: '2026-11-19 09:00:00' }]); 1");
const items = JSON.parse(ev("JSON.stringify(seenItems_())"));
const tags = (id) => (items[id] ? items[id].items.map((x) => x.m + ':' + x.t) : []);
ok(!items.D9, '1 다 본 사람(유대표)은 목록에 없음 ' + JSON.stringify(tags('D9')));
ok(tags('D1').indexOf('notice:공지 1') >= 0 && tags('D1').indexOf('docs:배번호 서류 2종') >= 0 && tags('D1').indexOf('app:앱 5일') >= 0 && !tags('D1').some((x) => /^docs:서류/.test(x)), '2 나기사: 공지 1 · 배번호 서류 2종 · 앱 5일 (3일 넘게) · 기사 필수 서류(면허증)는 넣지 않음 ' + JSON.stringify(tags('D1')));
ok(tags('D0').indexOf('pm:품앗이 알림 1') >= 0 && tags('D0').length === 1, '3 가기사: 품앗이 알림 1 (게시판 댓글은 S97 부터 챙길 것에서 뺌 · 읽은 알림 · 확인한 스케줄은 빠짐) ' + JSON.stringify(tags('D0')));
ok(tags('D2').indexOf('sched:스케줄 11/21') >= 0 && tags('D2').indexOf('fake:허위배송 1') >= 0 && !tags('D2').some((x) => /^pm:/.test(x)), '4 다기사: 스케줄 11/21 · 허위배송 1 (읽은 품앗이 알림은 빠짐) ' + JSON.stringify(tags('D2')));
ok(items.D1.items.find((x) => x.m === 'docs').d === '화물운송 허가증 · 화물운송 자격증 안 올림' && items.D1.items.find((x) => x.m === 'docs').j === 'BIB-B1', '5 꼬리표를 누르면 자세히: 안 올린 배번호 서류 · 알림을 누르면 배번호 안내 창 ' + JSON.stringify(items.D1.items.find((x) => x.m === 'docs')));
// 메뉴별 · 기사별 다시 알림
const rem = (p) => { const out = JSON.parse(ev("(function () { var o = []; pmPushSend_ = function (l) { o = l; return l.length; }; var r = adm_seenRemind(" + JSON.stringify(tok) + ", " + JSON.stringify(p) + "); return JSON.stringify({ r: r, sent: o }); })()")); return out; };
let x = rem({ kind: 'menu', key: 'pm' });
ok(x.r.ok && x.r.target === 1 && x.sent[0].driverId === 'D0' && /품앗이 알림을 확인/.test(x.sent[0].title), '6 메뉴별(품앗이): 가기사 1명에게 품앗이 알림 · ' + x.sent[0].title);
x = rem({ kind: 'menu', key: 'all' });
ok(x.r.target === 3 && x.sent.every((s) => /확인할 것이 \d건/.test(s.title)), '7 모두에게 알림: 챙길 사람 3명 · 각자 안 본 것을 알림 하나로');
x = rem({ kind: 'drv', driverId: 'D1' });
ok(x.r.target === 1 && /확인할 것이 3건/.test(x.sent[0].title) && /공지 1 · 배번호 서류 2종 · 앱 5일/.test(x.sent[0].text), '8 기사별(나기사): ' + x.sent[0].title + ' | ' + x.sent[0].text);
ok(!rem({ kind: 'menu', key: 'hack' }).r.ok, '9 모르는 메뉴는 안 받음');
let r = call('adm_seenList', [tok]);
ok(r.ok && r.items && r.items.D1 && r.menus.length === 9, '10 확인 기록 목록에 챙길 사람 · 메뉴 9곳(S101 지시사항 더함) 같이 내려줌');
// 초기화
r = call('adm_seenReset', [tok2, '초기화']);
ok(!r.ok && /대표만/.test(r.msg), '11 대표가 아니면 초기화 못 함 · ' + r.msg);
ok(!call('adm_seenReset', [tok, '초기']).ok, '12 「초기화」를 정확히 입력해야 함');
const before = JSON.parse(ev("JSON.stringify(readAll_(SH.SEEN).map(function (o) { return o.kind + (o.ackAt ? '+' : ''); }))"));
r = call('adm_seenReset', [tok, '초기화']);
const after = JSON.parse(ev("JSON.stringify(readAll_(SH.SEEN).map(function (o) { return o.kind + (o.ackAt ? '+' : ''); }))"));
ok(r.ok && r.deleted === 5 && after.sort().join() === ['fake', 'open', 'open', 'open', 'open', 'sch'].sort().join(), '13 초기화: 공지 열람 3 · [확인]한 스케줄 1 · 지시사항 1 비움 / 앱 접속 · 아직 확인 안 한 스케줄 · 허위배송은 남김 ' + JSON.stringify([before.length, after]));
ok(JSON.parse(ev("JSON.stringify(seenItems_())")).D9.items.some((x) => x.m === 'notice'), '14 초기화 뒤에는 공지를 다시 「안 봄」으로 셈 (오늘부터 새로)');
ok(ev("seenRemindMap_()['menu|pm'] ? 'y' : 'n'") === 'n', '15 다시 알림 보낸 기록도 비움');
r = call('adm_seenList', [tok]);
ok(r.bak && r.bak.n === 5, '16 백업 남음 → 화면에 「되돌리기 (5줄)」');
r = call('adm_seenRestore', [tok]);
ok(r.ok && r.restored === 5 && JSON.parse(ev("JSON.stringify(readAll_(SH.SEEN).length)")) === before.length, '17 되돌리기: 지운 5줄을 다시 넣음');
ok(!call('adm_seenRestore', [tok]).ok, '18 백업은 한 번만 되돌림');
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/30초마다 저절로 새로/.test(ad) && /td-live/.test(ad) && /isOn\(id\) \? '<i class="al-dot"/.test(ad), '20 실시간: 확인 기록을 열어 둔 동안 30초마다 새로 · 접속 중인 사람은 초록 점');
ok(/\['todo', '📋 챙길 사람'\]/.test(ad) && /tab: 'todo'/.test(ad) && /data-almenu/.test(ad) && /data-alreset/.test(ad) && /data-alrestore/.test(ad), '19 관리자: 확인 기록 첫 탭 「챙길 사람」 · 메뉴 칸 · 초기화 · 되돌리기');
