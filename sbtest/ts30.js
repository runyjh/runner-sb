// S40 스케줄 변경 알림 = 이번 주(일~토) 안의 날짜만 (토요일에 고친 일요일 포함) · 지시사항 팝업 = 출근 전 하루만(PDD = 내일) · 확인 기록 (TZ=UTC)
//  사용: node sbtest/ts30.js <runner-allinone 폴더>
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
const at = (kst) => KDate.__setClock(() => Date.parse(kst + '+09:00'));
at('2026-11-18T09:00:00'); // 수요일 · 이번 주 = 11/15(일) ~ 11/21(토)
fresh().ensureColumns_();
// 1. 날짜 규칙
const wk = (d, m) => ev('seenWeekOk_(' + JSON.stringify(d) + ', ' + JSON.stringify(m) + ')');
ok(wk('2026-11-19', '2026-11-18') && wk('2026-11-21', '2026-11-18'), '1 수요일에 고친 이번 주 목 · 토 → 알림');
ok(!wk('2026-11-22', '2026-11-18') && !wk('2026-11-25', '2026-11-18'), '2 수요일에 고친 다음 주(일 · 수) → 알리지 않음');
ok(wk('2026-11-22', '2026-11-21') && !wk('2026-11-23', '2026-11-21'), '3 토요일에 고친 내일(일요일 = PDD)은 알림 · 월요일은 아님');
ok(wk('2026-11-22', '2026-11-22') && wk('2026-11-28', '2026-11-22') && !wk('2026-11-29', '2026-11-22'), '4 일요일에 고치면 그 주 토요일까지');
// 2. 저장할 때 고르기
const pick = ev("seenSchPick_([{ row: 'D1', date: '2026-11-20', value: '휴무', old: '출근' }, { row: 'D1', date: '2026-11-24', value: '휴무', old: '출근' }, { row: 'D1', date: '2026-11-21', value: '출근', old: '' }]).map(function (x) { return x.date; }).join(',')");
ok(pick === '2026-11-20', '5 저장: 이번 주 변경만 기록 (다음 주 · 빈칸 채움은 빠짐) → ' + pick);
// 3. 기사앱이 받는 변경 · 대시보드 미확인
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_();");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_routeSave', [tok, { campId: camps['강서1캠프'], code: '527B' }]);
call('adm_createDriver', [tok, { name: '임동준', loginId: 'id1@df', driverType: '고정', phone: '010-3000-1001', schCampId: camps['강서1캠프'], baseRoute: '527B' }]);
const d = call('adm_listDrivers', [tok]).rows[0];
// 지난주(11/12)에 미리 고쳐 둔 이번 주 날짜(예전 방식으로 남은 기록) + 이번 주에 고친 것
ev("seenAppend_([{ kind: 'sch', driverId: " + JSON.stringify(d.id) + ", name: '임동준', key: '2026-11-20', old: '출근', text: '휴무', at: '2026-11-12 10:00:00', by: '대표' }, { kind: 'sch', driverId: " + JSON.stringify(d.id) + ", name: '임동준', key: '2026-11-19', old: '출근', text: '강서1 529A', at: '2026-11-17 10:00:00', by: '대표' }]); 1");
const src = fs.readFileSync(path.join(SRC, 'Seen.gs'), 'utf8'), home = fs.readFileSync(path.join(SRC, 'Home.gs'), 'utf8');
ok(/o\.key >= today && seenWeekOk_\(o\.key, o\.at\)/.test(src), '6 기사앱: 고친 날의 주를 벗어난 변경은 내려 주지 않음 (지난주에 미리 고친 것 포함)');
ok(/seenWeekOk_\(r\.key, r\.at\)/.test(home), '7 대시보드 "스케줄 변경 미확인 기사"도 같은 규칙');
const list = ev("readAll_(SH.SEEN).filter(function (o) { return o.kind === 'sch' && !o.ackAt && o.key >= todayText_() && seenWeekOk_(o.key, o.at); }).map(function (o) { return o.key; }).join(',')");
ok(list === '2026-11-19', '8 실제 기록으로: 이번 주에 고친 11/19 만 (지난주에 고친 11/20 은 빠짐) → ' + list);
ok(/x\.k === SEEN_KIND\.INST\) && x\.key/.test(src) && ev('SEEN_KIND.INST') === 'inst', '9 지시사항 확인 기록(inst)을 받음');
// 4. 화면: 지시사항 팝업은 PDD(내일) 것만 · 확인하면 안 뜸 · 내용이 바뀌면 다시
const html = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
const fnSrc = html.slice(html.indexOf('  const instKey ='), html.indexOf('  function instBoot('));
const mk = () => new Function('pddOf', 'store', 'USER', fnSrc + '; return { instDue: instDue, instKey: instKey };')((t) => { const p = t.split('-'); const x = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 1)); return x.toISOString().slice(0, 10); }, { get: () => JSON.stringify({ id: 'D1' }) }, 'u');
const I = mk();
const R = { ok: true, today: '2026-11-19', inst: { '2026-11-19': '오늘 것', '2026-11-20': '3동 비밀번호 변경', '2026-11-21': '모레 것' } };
let due = I.instDue(R, []);
ok(due && due.d === '2026-11-20' && due.text === '3동 비밀번호 변경', '10 출근 전 하루만: PDD(내일 11/20) 지시사항만 뜸');
ok(I.instDue(R, [due.key]) === null, '11 [확인했습니다] 뒤에는 다시 안 뜸');
ok(!!I.instDue({ ok: true, today: '2026-11-19', inst: { '2026-11-20': '내용이 바뀜' } }, [due.key]), '12 내용이 바뀌면 다시 뜸');
ok(I.instDue({ ok: true, today: '2026-11-20', inst: R.inst }, []).d === '2026-11-21' && I.instDue({ ok: true, today: '2026-11-21', inst: R.inst }, []) === null, '13 다음 날에는 그 다음 PDD 것만 · 지시사항 없으면 안 뜸');
ok(/id="instPop"/.test(html) && /try \{ instBoot\(\); \}/.test(html) && /SEEN\.q\.push\(\{ k: 'inst', key: el\.dataset\.d \}\)/.test(html), '14 팝업 + 앱을 열 때 확인 + 확인 기록 보냄');
