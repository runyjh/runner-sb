// S91 대시보드 확인할 것 정리: 예전에 확정된 품앗이도 맡긴 기사 칸 휴무로 (한 번) · 같은 날 같은 노선 두 명은 칸에 노선을 직접 적었을 때만 · 실입금 마이너스 이유 · 세무자료 메뉴 이름 · 실고지 · 칸 너비 (TZ=UTC)
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
KDate.__setClock(() => Date.parse('2026-11-20T15:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '안양1캠프' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
['723D', '116C', '723ABC', '724A'].forEach((r) => call('adm_routeSave', [tok, { campId: camps['안양1캠프'], code: r }]));
const mk = (name, lid, base) => call('adm_createDriver', [tok, { name, loginId: lid, driverType: '고정', phone: '010-3000-' + String(1000 + lid.length * 7 + name.length), schCampId: camps['안양1캠프'], baseRoute: base }]);
mk('강준길', 'kjg@df', '723ABC'); mk('임동준', 'ldj@df', '724A'); mk('고광필', 'kkp@df', '723D,116C'); mk('이윤형', 'lyh@df', '116C,723D');
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { D[d.name] = d.id; });
call('adm_schSave', [tok, [{ row: D['강준길'], date: '2026-11-26', value: '안양1 723ABC', old: '' }, { row: D['고광필'], date: '2026-11-29', value: '출근', old: '' }, { row: D['이윤형'], date: '2026-11-29', value: '출근', old: '' }]]);
// 옛 서버에서 확정된 품앗이 (맡긴 기사 칸이 그대로 남은 상태)
ev("appendObj_(SH.PJOB, { id: 'J1', date: '2026-11-26', camp: '안양1캠프', route: '723ABC', status: PST.DONE, posterId: '" + D['강준길'] + "', poster: '강준길', acceptedId: '" + D['임동준'] + "', accepted: '임동준', createdAt: '2026-11-15 01:36:10' }); pmTouch_(); 1");
const cellOf = (who, d) => ev("(function () { var h = schHeader_(true), sh = schSheet_(), last = sh.getLastRow(), ids = sh.getRange(2, h.fixed['행ID'] + 1, last - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === '" + who + "') return String(sh.getRange(i + 2, h.dates['" + d + "'] + 1).getValue()); return '?'; })()");
ok(cellOf(D['강준길'], '2026-11-26') === '안양1 723ABC', '0 처음: 맡긴 기사(강준길) 칸에 노선이 남아 있음');
call('adm_schRange', [tok, '2026-11-22', '2026-11-30']);
ok(cellOf(D['강준길'], '2026-11-26') === '휴무' && S.props.PM_GIVE_FILL && /안양1 723ABC/.test(S.props.PM_GIVE_OFF || ''), '1 기사스케줄을 열면 한 번: 맡긴 기사 칸 → 휴무 (원래 값 기억 · 품앗이 취소하면 되돌아감)');
const colTxt = JSON.parse(ev("(function () { var h = schHeader_(true), sh = schSheet_(), last = sh.getLastRow(); return JSON.stringify(sh.getRange(2, 1, last - 1, h.dates['2026-11-26'] + 1).getValues().map(function (r) { return [r[h.fixed['행ID']], r[h.dates['2026-11-26']]]; })); })()"));
ok(colTxt.some((r) => String(r[0]) !== D['강준길'] && /723ABC/.test(r[1])), '2 받은 기사(임동준) 쪽에는 그 노선이 적힘 (' + colTxt.filter((r) => /723/.test(r[1])).length + '칸)');
ok(ev('pmGiveFill_()') === 0 && cellOf(D['강준길'], '2026-11-26') === '휴무', '3 한 번만 (표시 있으면 다시 안 돌림)');
// 같은 날 같은 노선 두 명 — 기본 노선만 겹치면 경고 안 함 · 칸에 노선을 직접 적으면 경고
const sameList = () => { const r = JSON.parse(ev("JSON.stringify(dataCheckLive_(readAll_(SH.DRIVERS).filter(function (o) { return o.id; }), '2026-11-20'))")); const c = r.find((x) => x.k === 'sameRoute'); return c ? c.list : []; };
ok(!sameList().some((t) => /고광필|이윤형/.test(t)), '4 둘 다 「출근」(기본 노선 723D·116C 공유) → 같은 노선 경고 없음');
call('adm_schSave', [tok, [{ row: D['이윤형'], date: '2026-11-29', value: '안양1 723D', old: '출근' }]]);
ok(sameList().some((t) => /고광필/.test(t) && /이윤형/.test(t)), '5 한 명이라도 칸에 723D 를 직접 적으면 → 경고 (진짜 겹침)');
// 실입금 마이너스 설명 · 대시보드 문구
const settle = fs.readFileSync(path.join(SRC, 'Settle.gs'), 'utf8'), home = fs.readFileSync(path.join(SRC, 'Home.gs'), 'utf8');
ok(/받을 돈 ' \+/.test(settle) && /공제 ' \+/.test(settle) && /가불 상환 '/.test(settle) && /이 달 근무 아직 없음/.test(settle), '6 마이너스 항목: 받을 돈 · 공제 · 가불 상환(건수·상계일) · 근무 없음');
ok(/근무가 들어오면 풀림/.test(home) && /가불 상계일을 미루기/.test(home), '7 대시보드: 어떻게 풀리는지 안내');
// 세무자료
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const tp = adm.slice(adm.indexOf('const TP_SHEETS'), adm.indexOf('const TP_VER'));
const defs = [...tp.matchAll(/\['(\w+)', '([^']+)', true\]/g)].map((m) => m[1] + ':' + m[2]);
ok(defs.join('|') === 'drvpay:기사 급여정산서|bank:사업용 계좌내역|paper:종이 세금계산서|ins:고용산재보험료 내역서 (실고지 납부고지서)|file:쿠팡정산서 원본 링크', '8 기본 5가지 이름·순서 (' + defs.length + ')');
ok(/\['pay', '직원 급여 \(원천세\)', false\]/.test(tp), '9 직원 급여는 추가 자료로');
ok(/TP_VER = 2/.test(adm) && /kv\.v === TP_VER/.test(adm), '10 예전에 기억한 고르기 → 새 기본으로 (버전)');
['기사 급여정산서', '사업용 계좌내역', '고용산재보험료 내역서', '쿠팡정산서 원본 링크'].forEach((n, i) => ok(adm.includes("name: '" + n + "'"), '11-' + i + ' 엑셀 시트 이름: ' + n));
ok(/실고지 · 납부/.test(adm) && /insPaid/.test(settle) && /'ins\|' \+ m/.test(settle), '12 고용산재 시트에 실고지·납부액과 차이');
ok(/\.sort\(\(a, b\) => \(a\.month \+ '\|' \+ a\.name\)/.test(adm), '13 월·이름 순으로 정렬');
// 칸 너비 계산
const fitSrc = adm.slice(adm.indexOf('function tpFit('), adm.indexOf('function tpSheets('));
const tpFit = new Function(fitSrc + '; return tpFit;')();
const out = tpFit({ rows: [Object.assign(['정산월', '이름'], { n: 0 }), ['2026-11', '아주아주긴한글이름입니다', 1234567], ['※ 아주 긴 설명 줄은 너비에 안 넣음 ※ 아주 긴 설명 줄은 너비에 안 넣음']], widths: [6] });
ok(out.widths[0] >= 10 && out.widths[1] >= 25 && out.widths[1] <= 60 && out.widths[2] >= 12, '14 칸 너비 = 내용 길이 (한글 2칸) · 설명 줄 제외 (' + out.widths.join(',') + ')');
