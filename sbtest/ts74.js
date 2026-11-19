// S74 신규입차 Commit: 기사스케줄 기준 신규 입차 · 2주 미입차 후 복귀 → ACM 공유 글 · 보냄 표시 · 2주 입차 이력 없는 ID · 대시보드 할 일 (TZ=UTC)
//  사용: node sbtest/ts74.js <runner-allinone 폴더>
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
KDate.__setClock(() => Date.parse('2026-11-20T01:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); ['안양1캠프', '군포1캠프'].forEach(function (n, i) { appendObj_(SH.CAMPS, { id: 'C' + i, name: n, createdAt: nowText_() }); }); " +
  "appendObj_(SH.DRIVERS, { id: 'D1', loginId: 'new_kim', name: '김신규', status: ST.ACTIVE, schCamp: '안양1캠프', schCampId: 'C0', baseRoute: '723C', createdAt: '2026-11-15 10:00:00' }); " +
  "appendObj_(SH.DRIVERS, { id: 'D2', loginId: 'back_lee', name: '이복귀', status: ST.ACTIVE, schCamp: '안양1캠프', schCampId: 'C0', baseRoute: '723D', createdAt: '2025-01-01 10:00:00' }); " +
  "appendObj_(SH.DRIVERS, { id: 'D3', loginId: 'reg_park', name: '박꾸준', status: ST.ACTIVE, schCamp: '안양1캠프', schCampId: 'C0', baseRoute: '724A', createdAt: '2025-01-01 10:00:00' }); " +
  "appendObj_(SH.DRIVERS, { id: 'D4', loginId: 'idle_choi', name: '최쉼', status: ST.ACTIVE, schCamp: '군포1캠프', schCampId: 'C1', baseRoute: '212A', createdAt: '2025-01-01 10:00:00' }); " +
  "appendObj_(SH.DRIVERS, { id: 'D5', loginId: 'boss', name: '유대표', title: '대표', status: ST.ACTIVE, schCamp: '안양1캠프', schCampId: 'C0', createdAt: '2026-11-15 10:00:00' }); 1");
const tok = fresh().__sbLogin('boss', true).token;
ev("(function () { schEnsureDates_(parseYmd_('2026-10-01'), parseYmd_('2027-01-05')); var sh = schSheet_(), h = schHeader_(true), w = sh.getLastColumn(); " +
  "var put = function (id, cells) { var a = new Array(w).fill(''); a[h.fixed['행ID']] = id; a[h.fixed['구분']] = '기사'; Object.keys(cells).forEach(function (d) { a[h.dates[d]] = cells[d]; }); sh.getRange(sh.getLastRow() + 1, 1, 1, w).setValues([a]); }; " +
  "put('D1', { '2026-11-30': '출근', '2026-12-01': '출근' }); " +
  "put('D2', { '2026-10-28': '출근', '2026-10-30': '휴무', '2026-11-25': '군포1 212A' }); " +
  "put('D3', { '2026-11-18': '출근', '2026-11-19': '출근', '2026-11-21': '출근' }); " +
  "put('D4', { '2026-11-01': '출근', '2026-11-03': '출근', '2026-11-25': '휴무' }); " +
  "put('D5', { '2026-11-25': '출근' }); return 1; })()");
let r = call('adm_cmList', [tok]);
const by = (n) => r.items.find((x) => x.name === n);
ok(r.ok && r.items.length === 2, '1 공유할 것 2건 (신규 · 복귀) — 계속 다니는 기사 · 대표는 빠짐 ' + JSON.stringify(r.items.map((x) => x.name + ':' + x.kind)));
ok(by('김신규') && by('김신규').kind === 'new' && by('김신규').date === '2026-11-30' && by('김신규').camp === '안양1', '2 신규: 최근 가입 · 입차 기록 없음 → 첫 입차 예정일 11/30 (10일 전에 미리 뜸)');
ok(by('이복귀') && by('이복귀').kind === 'back' && by('이복귀').date === '2026-11-25' && by('이복귀').camp === '군포1' && by('이복귀').gap === 27, '3 2주 미입차 후 복귀: 10/28 뒤 27일 쉬고 11/25 군포1 (칸에 적힌 캠프) ' + JSON.stringify(by('이복귀')));
ok(by('이복귀').text === '신규입차 Commit (2주 미입차 후 복귀)\n기사ID: back_lee\nPDD 입차예정일: 2026-11-25\nWAVE/CAMP : 1W / 군포1', '4 공유 글 = ACM 양식 · 러너 1W(야간)\n' + by('이복귀').text);
ok(by('김신규').text.indexOf('신규입차 Commit\n기사ID: new_kim\nPDD 입차예정일: 2026-11-30\nWAVE/CAMP : 1W / 안양1') === 0, '5 신규 글에는 「복귀」 없음');
ok(r.idle.map((x) => x.name).join() === '최쉼' && r.idle[0].days === 17, '6 2주 입차 이력 없는 ID: 최쉼 (11/3 뒤 17일 · 앞으로 입차 없음, 휴무는 입차 아님) ' + JSON.stringify(r.idle));
r = call('adm_home', [tok, true]);
const td = (r.todo || []).find((x) => x.k === 'cm');
ok(td && td.n === 2 && td.go === 'sched', '7 대시보드 「확인할 것」: 신규입차 Commit 공유할 것 2건 → 기사스케줄 ' + JSON.stringify(td));
r = call('adm_cmSent', [tok, ['D2|2026-11-25']]);
ok(r.ok, '8 보냄 표시');
r = call('adm_cmList', [tok]);
ok(by('이복귀').sentAt > 0 && !by('김신규').sentAt, '9 보낸 것은 「보낸 것」으로 · 안 보낸 것만 「공유할 것」');
r = call('adm_home', [tok, true]);
ok(((r.todo || []).find((x) => x.k === 'cm') || {}).n === 1, '10 대시보드 건수도 1로');
call('adm_cmSent', [tok, ['D2|2026-11-25'], true]); r = call('adm_cmList', [tok]);
ok(!by('이복귀').sentAt, '11 보냄 취소');
ok(!call('adm_cmSent', ['bad', ['D2|2026-11-25']]).ok, '12 관리자만');
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(!/data-cm-go/.test(ad) && /data-mmc="#cmOpen"/.test(ad) && /cmBadge\(cm \? cm\.n : 0\)/.test(ad), '14 왼쪽 메뉴에는 없음 · 기사스케줄 화면 안(도구 줄 · ⋯ 더 보기) · 휴대폰 더보기 · 공유할 건수 숫자');
ok(/id="sUpload"[^\n]*\n\s*<button class="btn" id="cmOpen"/.test(ad) && /id="sMoreCm"/.test(ad) && /id="cmModal"/.test(ad) && /adm_cmList/.test(ad) && /전체 복사 · 보냄 표시/.test(ad), '13 관리자 기사스케줄 위 「🚚 신규입차 Commit」 버튼 · 창 · 전체 복사');
