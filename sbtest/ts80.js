// S80 확인 기록 「지금까지 것 정리」: 지금 보이는 안 본 알림에 정리 표시 → 목록 · 다시 알림에서 빠짐 · 새로 생기는 것만 · 메뉴 하나만도 · 되돌리기 · 기사앱은 그대로 (TZ=UTC)
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', SEEN_SCH_RESET: 'done' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-20T11:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); " +
  "['가','나'].forEach(function (n, i) { appendObj_(SH.DRIVERS, { id: 'D' + i, loginId: 'd' + i, name: n + '기사', status: ST.ACTIVE, schCamp: '안양1캠프', createdAt: nowText_() }); appendObj_(SH.SEEN, { kind: 'open', driverId: 'D' + i, at: '2026-11-20 09:00:00' }); }); " +
  "appendObj_(SH.NOTICE, { id: 'N1', title: '예전 공지', body: 'x', status: NST.ON, start: '2026-11-18', createdAt: nowText_() }); " +
  "appendObj_(SH.SEEN, { kind: 'sch', driverId: 'D0', key: '2026-11-21', old: '723C', text: '휴무', at: '2026-11-19 10:00:00' }); " +
  "appendObj_(SH.SEEN, { kind: 'fake', driverId: 'D1', key: 'C|old', text: '11/10 예전 의심 건', at: nowText_() }); " +
  "appendObj_(SH.PALERT, { id: 'PA1', driverId: 'D1', kind: 'pm', jobId: 'PM-1', text: '예전 품앗이 알림', createdAt: '2026-11-15 10:00:00' }); 1");
const tok = fresh().__sbLogin('boss', true).token;
const items = () => call('adm_seenList', [tok]).items;
const tags = (I, id) => (I[id] ? I[id].items.map((x) => x.m) : []).sort().join(',');
let I = items();
ok(tags(I, 'D0') === 'notice,sched' && tags(I, 'D1') === 'fake,notice,pm', '1 처음: 가기사 공지·스케줄 / 나기사 공지·허위배송·품앗이 ' + tags(I, 'D0') + ' / ' + tags(I, 'D1'));
// 메뉴 하나(공지)만 정리
let r = call('adm_seenClear', [tok, 'notice']);
I = items();
ok(r.ok && r.n === 2 && r.people === 2 && tags(I, 'D0') === 'sched' && tags(I, 'D1') === 'fake,pm', '2 「공지」만 정리 → 2건 빠지고 다른 메뉴는 그대로');
ok(!JSON.stringify(I).includes('"sg"'), '3 화면으로는 정리용 이름(sg)을 보내지 않음');
// 새 공지는 다시 보임
ev("appendObj_(SH.NOTICE, { id: 'N2', title: '새 공지', body: 'y', status: NST.ON, start: '2026-11-20', createdAt: nowText_() }); cache_().remove('nt:all'); 1");
I = items();
ok(tags(I, 'D0') === 'notice,sched' && I.D0.items.find((x) => x.m === 'notice').t === '공지 1' && /새 공지/.test(I.D0.items.find((x) => x.m === 'notice').d), '4 정리 뒤 새로 올린 공지만 보임 (공지 1 · 새 공지)');
// 전체 정리
r = call('adm_seenClear', [tok, 'all']);
I = items();
ok(r.ok && r.n === 5 && !I.D0 && !I.D1, '5 「전체」 정리 → 챙길 사람 0명 ' + JSON.stringify(r));
const rem = call('adm_seenRemind', [tok, { kind: 'menu', key: 'all', force: true }]);
ok(rem.ok && rem.target === 0, '6 정리한 것은 다시 알림에서도 빠짐');
// 같은 날 스케줄이 또 바뀌면 다시 보임 · 새 품앗이 알림도
ev("var rs = readAll_(SH.SEEN).filter(function (o) { return o.kind === 'sch'; }); writeFields_(SH.SEEN, rs[0]._row, { at: '2026-11-20 10:30:00', text: '724A' }); appendObj_(SH.PALERT, { id: 'PA2', driverId: 'D1', kind: 'pm', jobId: 'PM-2', text: '새 품앗이', createdAt: '2026-11-20 10:40:00' }); 1");
I = items();
ok(tags(I, 'D0') === 'sched' && tags(I, 'D1') === 'pm' && I.D1.items[0].t === '품앗이 알림 1', '7 같은 날 스케줄이 또 바뀜 · 새 품앗이 알림 → 다시 보임 (예전 것은 계속 정리됨)');
// 되돌리기 (한 단계)
r = call('adm_seenClearUndo', [tok]);
I = items();
ok(r.ok && tags(I, 'D1') === 'fake,notice,pm' && I.D1.items.find((x) => x.m === 'notice').t === '공지 1' && I.D1.items.find((x) => x.m === 'pm').t === '품앗이 알림 2', '8 [정리 되돌리기] → 「전체」 정리 전으로 (예전 공지 정리는 남고 새 공지 1 · 품앗이 2)');
ok(!call('adm_seenClear', [tok, 'app']).ok, '9 📱 앱(3일 안 엶)은 정리 안 됨');
// 기사앱은 그대로: 기사 알림함 안 읽음 · 기록 줄 그대로
ok(ev("JSON.stringify(readAll_(SH.PALERT).filter(function (a) { return !a.readAt; }).length)") === '2' && ev("JSON.stringify(readAll_(SH.SEEN).filter(function (o) { return o.kind === 'notice'; }).length)") === '0', '10 기사앱은 그대로 (알림함 안 읽음 2건 · 공지 열람 기록 안 만듦)');
const lst = call('adm_seenList', [tok]);
ok(lst.clr && lst.clr.menu === '📢 공지' && lst.clr.undo === false && lst.clrMenus.indexOf('app') < 0, '11 마지막 정리 표시 (되돌린 뒤 = 공지 정리 · 더 되돌릴 것 없음)');
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(/data-alclr=/.test(ad) && /정리 중… 잠시만 기다려 주세요/.test(ad) && /data-alclrundo/.test(ad), '12 관리자 화면: [🧹 N건 정리] · 누르면 「정리 중… 잠시만 기다려 주세요」 · [정리 되돌리기]');
