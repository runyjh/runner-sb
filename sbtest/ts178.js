// (S178) 품앗이 연동 점검: 기사관리 · 기사스케줄 · 쿠팡 업로드 · 정산서 · 노선관리
//  사용: node sbtest/ts178.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', STL_IDS_V2: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-20T10:00:00+09:00'));
KDate.__setClock(() => Date.parse('2026-11-10T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프', rot: 'D1,D2', guide: '입차 전 사무실 단톡 필수' }]);
const C1 = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B', '213A'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));
const pr = (num, value, p) => ({ num, level: 2, value, p1: p[0], p2: p[1], p3: p[2], p4: p[3], p5: p[4] });
call('adm_priceSave', [tok, C1, [pr('212', 'A', [1000, 800, 850, 1050, 900]), pr('212', 'B', [1100, 880, 900, 1080, 950]), pr('213', 'A', [1200, 950, 980, 960, 1000])]]);
const NM = { A: '기사A', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'drv01', driverType: ['고정', '백업', '고정'][i], phone: '010-4000-20' + (10 + i), schCampId: C1, baseRoute: ['212A', '', '213A'][i] }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
const LEG = (who, dt, codes, time) => ({ ok: true, ids: J("(function () { var me = readAll_(SH.DRIVERS).filter(function (d) { return d.id === '" + D[who] + "'; })[0], w = pmWorkDays_(me)['" + dt + "'], c = master_().camps.filter(function (x) { return x.id === w.campId; })[0], now = nowText_(), ids = []; " + JSON.stringify(codes) + ".forEach(function (x) { var id = uniqId_('J'); ids.push(id); var q = ''; try { q = pmQtyOf_(c.name, x); } catch (e) { q = ''; } appendObjs_(SH.PJOB, [{ id: id, status: PST.OPEN, posterId: me.id, poster: me.name, kind: '야간', date: '" + dt + "', time: '" + (time || '') + "', area: c.name, campId: c.id, camp: c.name, route: x, qty: q, top: pmTopOf_(me), price: 1100, pay: PM_PAY_DEF, desc: '', secret: '', attach: '', useId: '받는 기사 아이디', createdAt: now, updatedAt: now }]); }); pmTouch_(); return ids; })()") }); // (S205) 예전 방식(코드마다 일감)으로 올라가 있던 자료 그대로 넣기 — 기사앱은 이제 노선 통째로 1건
const R = []; const rep = (good, id, m) => { R.push(good); console.log((good ? '정상 ' : '문제 ') + id + ' ' + m); };
const cell = (rowId, d) => J("(function(){ var h = schHeader_(), sh = schSheet_(), ids = sh.getRange(2, h.fixed['행ID'] + 1, sh.getLastRow() - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === '" + rowId + "') return String(sh.getRange(i + 2, h.dates['" + d + "'] + 1).getValue()); return '(줄 없음)'; })()");
const DT = '2026-11-20';
call('adm_schSave', [tok, [{ row: D.A, date: DT, value: '212AB', old: '' }, { row: D.B, date: DT, value: '휴무', old: '' }, { row: D.C, date: DT, value: '213A', old: '' }]]);
// 1 맡기기
let g = LEG('A', DT, ['212A', '212B'], '21:00');
rep(g.ok && g.ids.length === 2, '1', '기사A 가 212A · 212B 맡김 ' + (g.msg || ''));
const [JA, JB] = g.ids;
// 2 노선관리 연동: 정보 · 단가
const jinfo = call('api_pmJob', [T.B, JA]).job.info || {};
rep(jinfo.qtySrc !== 'typed' || /개$/.test(jinfo.qty), '2a', '일감 정보 수량: 정산 자료 없으면 「올린 쪽이 적은 수량」으로 구분 (' + jinfo.qty + ' · ' + (jinfo.qtySrc || '없음') + ')');
ev("writeFields_(SH.PJOB, findRow_(SH.PJOB, 'id', '" + JA + "'), { qty: '300' }); pmTouch_(); 1");
const ji2 = call('api_pmJob', [T.B, JA]).job.info || {};
rep(ji2.qty === '300개' && ji2.qtySrc === 'typed', '2b', '정산 자료가 없고 올린 쪽이 300 이라고 적었으면 「300개 · 올린 쪽이 적은 수량」 (' + ji2.qty + ' · ' + ji2.qtySrc + ')');
const ix = require('fs').readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
rep(/올린 쪽이 적은 수량 \(정산 자료 없음\)/.test(ix) && /i\.qtySrc === 'typed'/.test(ix), '2c', '화면: 정산 자료가 없는 수량은 「최근 한 달 하루 평균」이라고 쓰지 않음');
rep(/단톡/.test(jinfo.guide || ''), '2', '일감 정보에 캠프 「기사 필수 안내」(노선관리) 나옴: ' + (jinfo.guide || '없음'));
let low = call('api_pmGive', [T.A, { date: DT, codes: ['212A'], price: 1100 }]);
rep(low.ok === false && /이미 맡/.test(low.msg || ''), '3', '이미 맡긴 노선 다시 맡기기 막힘: ' + (low.msg || '').slice(0, 40));
call('adm_schSave', [tok, [{ row: D.A, date: '2026-11-21', value: '212A', old: '' }]]);
low = call('api_pmGive', [T.A, { date: '2026-11-21', codes: ['212A'], price: 900 }]);
rep(low.ok === false && low.code === 'LOW', '3b', '1,100원보다 낮으면 먼저 확인: ' + (low.msg || '').replace(/\n/g, ' ').slice(0, 60));
// 3 기사관리 연동: 퇴사 예정 기사는 그날 못 맡음
ev("writeFields_(SH.DRIVERS, driverById_('" + D.C + "')._row, { workStatus: '퇴사', leaveDate: '2026-11-15' }); forgetDriver_(driverById_('" + D.C + "')); 1");
let r = call("api_pmApplyMany", [T.C, [JA], ""]); const r4 = r;
rep(r.ok === false, '4', '퇴사일 지난 날짜 일감은 신청 막힘: ' + (r.msg || '').slice(0, 50));
ev("writeFields_(SH.DRIVERS, driverById_('" + D.C + "')._row, { workStatus: '재직', leaveDate: '' }); forgetDriver_(driverById_('" + D.C + "')); 1");
// 앱 정지 기사
r = call('api_pmApplyMany', [T.B, [JA, JB], '둘 다']);
rep(r.ok, '5', '기사B 신청 ' + (r.msg || ''));
const M = call('api_pmMine', [T.A, 'posted']);
const ap = M.jobs.filter((j) => [JA, JB].includes(j.id)).map((j) => j.apps.find((a) => a.name === '기사B').id);
const apInfo = M.jobs.find((j) => j.id === JA).apps.find((a) => a.name === "기사B");
rep(apInfo.type === '백업' && apInfo.camp === '군포1캠프', '6', '맡긴 기사 화면 신청자 정보 = 기사관리 정보 (' + apInfo.type + ' · ' + apInfo.camp + ')');
r = call('api_pmPick', [T.A, ap]);
rep(r.ok && r.count === 2, '7', '기사A 가 기사B 로 두 코드 확정');
// 4 기사스케줄 연동
rep(/212A/.test(cell('PM' + D.B, DT)) && /212B/.test(cell('PM' + D.B, DT)), '8', '기사B 품앗이 줄: ' + cell('PM' + D.B, DT).replace(/\n/g, ' / '));
rep(cell(D.A, DT) === '휴무', '9', '기사A 그날 칸 → 휴무 (다 맡김): ' + cell(D.A, DT));
// 4-1 받은 기사가 한 코드 취소 → 맡긴 기사 칸에 그 코드가 돌아오고 품앗이 줄에서 빠짐
r = call('api_pmCancelMany', [T.B, [JB]]);
rep(r.ok && cell(D.A, DT) === '212B' && /212A/.test(cell('PM' + D.B, DT)) && !/212B/.test(cell('PM' + D.B, DT)), '9b', '기사B 가 212B 취소 → 기사A 칸 「' + cell(D.A, DT) + '」 · 기사B 품앗이 줄 「' + cell('PM' + D.B, DT).replace(/\n/g, ' / ') + '」');
const mid = call('adm_schUploadTable', [tok, '2026-11-15', '4w']);
const midRows = [].concat.apply([], mid.weeks || []).filter((x) => String(x[0]) === DT);
rep(midRows.some((x) => x[4] === 'adrv01' && x[7] === '212B') && midRows.some((x) => x[4] === 'bdrv01' && x[7] === '212A') && !(mid.dups || []).length, '9c', '그때 쿠팡 업로드: 기사A 212B · 기사B 212A (중복 없음) ' + JSON.stringify(midRows.map((x) => x[4] + ':' + x[7])));
// 사무실이 그 사이 기사A 칸을 직접 고침 → 다시 확정 · 취소해도 사무실이 고친 칸은 그대로
r = call('api_pmApplyMany', [T.B, [JB], '']); const ap2 = call('api_pmMine', [T.A, 'posted']).jobs.find((j) => j.id === JB).apps.find((a) => a.name === '기사B').id;
r = call('api_pmPick', [T.A, [ap2]]);
rep(r.ok && cell(D.A, DT) === '휴무' && /212B/.test(cell('PM' + D.B, DT)), '9d', '다시 신청 · 확정 → 기사A 칸 다시 휴무 · 기사B 줄에 212B');
const ms = call("api_mySchedule", [T.B, "2026-11"]), msA = call("api_mySchedule", [T.A, "2026-11"]);
const pB = JSON.stringify((ms.pumasi || {})[DT] || ''), pA = JSON.stringify((msA.pumasi || {})[DT] || '');
rep(/212A/.test(pB) && /212B/.test(pB) && /212/.test(pA), '9e', '기사앱 내 스케줄: 기사B 그날 품앗이 ' + pB.slice(0, 120) + ' / 기사A ' + pA.slice(0, 120));
const av = call('api_pmAvailMine', [T.B]);
rep(!(av.offDays || []).some((x) => x.date === DT), '9f', '기사B 근무 가능일(쉬는 날) 목록에서 확정된 날은 빠짐');
// 기사관리 › 앱 메뉴: 품앗이를 끄면 새 기능도 막힘
ev("appSetPut_('appMenu', JSON.stringify({ pm: false }), ''); 1");
const off1 = call('api_pmApplyMany', [T.C, [JA], '']), off2 = call('api_pmPick', [T.A, ['x']]), off3 = call('api_pmGive', [T.A, { date: DT, codes: ['212A'] }]);
rep([off1, off2, off3].every((x) => x.ok === false && x.code === 'MENU_OFF'), '9g', '품앗이 메뉴를 끄면 신청 · 고르기 · 맡기기 모두 막힘 ' + JSON.stringify([off1.code, off2.code, off3.code]));
ev("appSetPut_('appMenu', '{}', ''); 1");
// 사무실 대행 등록 (주는 기사 아이디로 배송 · 바로 확정) → 정산 「아이디 사용 기록」 자동 줄 · 확정 취소하면 지워짐
call('adm_schSave', [tok, [{ row: D.C, date: '2026-11-22', value: '213A', old: '' }]]);
const oc = call('adm_pmCreate', [tok, { posterId: D.C, kind: '야간', date: '2026-11-22', campId: C1, route: '213A', price: 1100, pay: '러너 정산서', useId: '주는 기사 아이디', mode: 'confirm', toId: D.B, okLow: true }]);
const usage = () => J("stlRead_('stl_usage').filter(function (r) { return String(r.memo).indexOf('품앗이 자동') >= 0; }).map(function (r) { return r.cid + '|' + r.name + '|' + r.from; })");
rep(oc.ok && usage().join() === 'cdrv01|기사B|2026-11-22', '9h', '사무실 대행 등록(주는 기사 아이디) → 정산 아이디 사용 기록 자동 ' + JSON.stringify(usage()));
rep(/213A/.test(cell('PM' + D.B, '2026-11-22')), '9i', '대행 확정도 기사B 품앗이 줄에 적힘');
{ const u2 = call('adm_schUploadTable', [tok, '2026-11-15', '4w']); const rr = [].concat.apply([], u2.weeks || []).filter((x) => String(x[0]) === '2026-11-22'), ms2 = (u2.missing || []).filter((x) => String(x[0]) === '2026-11-22' && /213A/.test(x[7]));
  rep(cell(D.C, '2026-11-22') === '213A' && rr.some((x) => x[4] === 'cdrv01' && x[7] === '213A') && !rr.some((x) => x[4] === 'bdrv01') && !ms2.length, '9k', '(S178) 주는 기사 아이디: 기사C 칸 그대로 「' + cell(D.C, '2026-11-22') + '」 · 쿠팡 업로드 ' + JSON.stringify(rr.map((x) => x[4] + ':' + x[7])) + ' · 213A 미입차 ' + ms2.length + '건'); }
const oa = J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + oc.id + "'; })[0].id");
call('adm_pmAction', [tok, oc.id, 'back', oa]);
rep(!usage().length && !/213A/.test(cell('PM' + D.B, '2026-11-22')) && cell(D.C, '2026-11-22') === '213A', '9j', '사무실이 확정을 풀면 아이디 사용 기록 · 품앗이 줄 지워지고 기사C 칸은 그대로 213A');
call('adm_pmAction', [tok, oc.id, 'cancel', '']);
// 정산 확인용: 11/23 도 주는 기사 아이디로 대행 확정 (기사B 가 기사C 아이디로 213A)
call('adm_schSave', [tok, [{ row: D.C, date: '2026-11-23', value: '213A', old: '' }]]);
const oc2 = call('adm_pmCreate', [tok, { posterId: D.C, kind: '야간', date: '2026-11-23', campId: C1, route: '213A', price: 1100, pay: '러너 정산서', useId: '주는 기사 아이디', mode: 'confirm', toId: D.B, okLow: true }]);
rep(oc2.ok && cell(D.C, '2026-11-23') === '213A' && /213A/.test(cell('PM' + D.B, '2026-11-23')), '9l', '11/23 대행 확정: 기사C 칸 213A 그대로 · 기사B 품앗이 줄 213A');
// 5 쿠팡 업로드
KDate.__setClock(() => Date.parse('2026-11-18T09:00:00+09:00'));
const up = call('adm_schUploadTable', [tok, '2026-11-15', '4w']);
const rowsOf = (w) => [].concat.apply([], up.weeks || []).filter((x) => String(x[0]) === DT);
rep(rowsOf().some((x) => x[4] === 'bdrv01' && /212A/.test(x[7]) && /212B/.test(x[7])) && !rowsOf().some((x) => x[4] === 'adrv01') && !(up.dups || []).length, '10', '쿠팡 업로드: 그날 212A·212B 는 기사B 아이디로 한 줄 · 기사A 없음 · 중복 없음');
// 6 정산서
const dates = []; for (let t = Date.parse('2026-10-26T00:00:00Z'); t <= Date.parse('2026-11-25T00:00:00Z'); t += 864e5) dates.push(new Date(t).toISOString().slice(0, 10));
const raw = [], row = (cid, route, d, qty, price) => ['배송', cid, route, d, '군포1캠프', '일반', '러너', qty, 0, price, 0, qty * price, 0, qty * price, 0];
dates.forEach((d) => {
  if (d === DT) { raw.push(row('bdrv01', '212A', d, 150, 850)); raw.push(row('bdrv01', '212B', d, 140, 900)); }
  else { raw.push(row('adrv01', '212A', d, 150, 1000)); raw.push(row('adrv01', '212B', d, 140, 1100)); }
  raw.push(row('cdrv01', '213A', d, 170, 1200));
});
KDate.__setClock(() => Date.parse('2026-11-27T10:00:00+09:00'));
const im = call('adm_stlImport', [tok, { month: '2026-11', round: 1, file: 't.xlsx', raw, loss: [] }]);
if (!im.ok) console.log('  import', im.msg);
const SM = call('adm_stlMonth', [tok, '2026-11', true]);
const wp = (SM.summary.warnings || []).find((w) => w.key === 'pmAuto');
rep(wp && wp.items.length === 3 && wp.items.filter((t) => /기사A → 기사B/.test(t) && /× 1,100/.test(t)).length === 2 && wp.items.some((t) => /11\/23 기사C → 기사B/.test(t) && /213A · 170건 × 1,100/.test(t)), '11', '정산: 품앗이 자동 3줄 (11/20 기사A 2줄 · 11/23 기사C 아이디로 뛴 213A 1줄) ' + (wp ? wp.items.length : 0));
const dv = (nm) => (SM.summary.drivers || []).find((x) => x.name === nm) || {};
rep(dv('기사B').pay === (290 + 170) * 1100 && dv('기사B').yongPay === 65500 + 170 * (1100 - 980), '12', '정산: 기사B 지급 = (150+140+170)건 × 1,100 = ' + dv('기사B').pay + ' (추가지급 ' + dv('기사B').yongPay + ')');
rep(dv('기사C').qty === 30 * 170 && dv('기사C').depDed === 170 * (1100 - 980), '12b', '(S178) 정산: 기사C 는 11/23 배송(기사B 가 C 아이디로 뜀)이 빠지고 (' + dv('기사C').qty + '건) 차액 부담 ' + dv('기사C').depDed);
rep(dv('기사A').depDed === 65500 && dv('기사A').yongCut === 65500, '13', '정산: 기사A 차액 부담 공제 ' + dv('기사A').depDed);
rep(dv('기사B').workDays === 2, '14', '정산: 기사B 근무일 = 품앗이 받은 11/20 + 기사C 아이디로 뛴 11/23 (' + dv('기사B').workDays + '일)');
rep(dv('기사C').workDays === 2, '14b', '(S178) 정산: 기사C 근무일에 11/23 은 안 셈 (칸은 213A 그대로지만 그날 아이디는 기사B 가 씀) · 11/20 · 11/22 만 (' + dv('기사C').workDays + '일)');
rep(!(SM.summary.warnings || []).some((w) => /^pm(Skip|NoPerf|NoPrice|Low)$/.test(w.key)), '15', '정산: 품앗이 관련 경고 없음 (' + (SM.summary.warnings || []).map((w) => w.key).join(',') + ')');
// 기사앱 정산서 노선별 내역: 기본단가와 가중치를 나눠 보임
{ const ix2 = require('fs').readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
  const a0 = ix2.indexOf('    const hows = [...new Set((sl.routes'), a1 = ix2.indexOf('\n', ix2.indexOf('    const routes = (sl.routes || []).map((x) => \'<tr><td>\' + escH(x.camp)'));
  let html = '';
  try { const slWon = (n) => Math.round(n).toLocaleString('en-US'), escH = (x) => String(x); const sl = { routes: [{ camp: '강서1', route: '527B', how: '고정', unit: 850, inc: 50, qty: 10, amt: 9000 }, { camp: '강서1', route: '529A', how: '고정', unit: 970, inc: 0, qty: 5, amt: 4850 }] };
    html = eval('(() => {' + ix2.slice(a0, a1) + '; return howHead + "|" + hasInc + "|" + routes; })()'); } catch (e) { html = 'ERR ' + e.message; }
  rep(/^고정단가\|true\|/.test(html) && /<td class="n">850<\/td><td class="n">\+50<\/td>/.test(html) && /<td class="n">970<\/td><td class="n">-<\/td>/.test(html), '16', '(S178) 기사앱 정산서 노선별 내역: 「고정단가 850 · 가중치 +50」 처럼 나눠 보임 (' + html.slice(0, 60) + ')'); }
console.log(R.every(Boolean) ? '\n모두 정상 / ' + R.length : '\n문제 있음');
process.exit(R.every(Boolean) ? 0 : 1);
