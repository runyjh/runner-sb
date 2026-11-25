// (S202) 관리자 기사스케줄 칸 편집기 · 칸 말풍선: 같은 사람끼리 코드별로 주고받은 품앗이는 한 카드로 (200A · 200B → 200AB) · 묶음 [취소하고 출근으로]는 묶인 일감 모두 취소
//  사용: node sbtest/ts202.js <runner-allinone 폴더>
const path = require('path'), fs = require('fs');
const SRC = path.join(process.argv[2], 'src');
const A = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const grab = (name) => { const i = A.indexOf('function ' + name + '('); if (i < 0) return ''; let d = 0, j = A.indexOf('{', i); for (let k = j; k < A.length; k++) { if (A[k] === '{') d++; else if (A[k] === '}' && !--d) return A.slice(i, k + 1); } return ''; };
const src = ['pmCodesJoin', 'ceJobGroups'].map(grab);
let G = null; try { G = new Function(src.join('\n') + '; return ceJobGroups;')(); } catch (e) { G = null; }
const job = (id, from, to, route, kind) => ({ id, from, to, route, camp: '군포1캠프', kind: kind || '야간', time: '' });
const L = [job('j1', '김기화', '김도윤', '204A'), job('j2', '김기화', '김도윤', '204B'), job('j3', '김기화', '김도윤', '204C')];
let g = G ? G(L) : [];
ok(g.length === 1 && g[0].route === '204ABC' && g[0].ids.join(',') === 'j1,j2,j3', '1 한 사람이 다 받으면 한 카드 「204ABC」 (' + g.map((x) => x.route).join(',') + ')');
g = G ? G([job('j1', '김기화', '김도윤', '204A'), job('j2', '김기화', '김도윤', '204B'), job('j3', '김기화', '배만호', '204C')]) : [];
ok(g.length === 2 && g.map((x) => x.route + '→' + x.to).sort().join(',') === '204AB→김도윤,204C→배만호', '2 나눠 받으면 사람마다 따로');
g = G ? G([job('j1', '김기화', '김도윤', '204A', '주간'), job('j2', '김기화', '김도윤', '204B', '야간')]) : [];
ok(g.length === 2, '3 주간 · 야간은 따로');
ok(/data-cetake="' \+ esc\(t\.ids\.join\(','\)\)/.test(A) && /const ids = String\(jobId \|\| ''\)\.split\(','\)/.test(grab('ceTakeBack')) && /api\('adm_pmAction', id, 'cancel'\)/.test(grab('ceTakeBack')), '4 묶음 [취소하고 출근으로]는 묶인 일감 모두 취소');
ok(/pmCodesJoin\(t\._r\)/.test(grab('pmTipHtml')), '5 칸 말풍선도 묶어서');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(A))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '6 관리자 화면 문법 ' + se); }
// ── 서버: 맡긴 기사도 배차 확정 알림 · 코드 합친 글자 ──
{
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-23T11:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B', '212C'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { G: '맡긴G', O: '받는O', P: '받는P', S: '관리S' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'abc01', driverType: '고정', phone: '010-4800-10' + (10 + i), schCampId: CAMP, baseRoute: k === 'G' ? '212ABC' : '' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { if (o.name === '관리S') writeFields_(SH.DRIVERS, o._row, { title: '관리자' }); }); 1");
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
const APP = (jobId, who) => J("readAll_(SH.PAPP).filter(function (a) { return a.jobId === '" + jobId + "' && a.driverId === '" + D[who] + "' && a.status === '지원'; })[0].id");
const LEG = (who, dt, codes, time) => ({ ok: true, ids: J("(function () { var me = readAll_(SH.DRIVERS).filter(function (d) { return d.id === '" + D[who] + "'; })[0], w = pmWorkDays_(me)['" + dt + "'], c = master_().camps.filter(function (x) { return x.id === w.campId; })[0], now = nowText_(), ids = []; " + JSON.stringify(codes) + ".forEach(function (x) { var id = uniqId_('J'); ids.push(id); var q = ''; try { q = pmQtyOf_(c.name, x); } catch (e) { q = ''; } appendObjs_(SH.PJOB, [{ id: id, status: PST.OPEN, posterId: me.id, poster: me.name, kind: '야간', date: '" + dt + "', time: '" + (time || '') + "', area: c.name, campId: c.id, camp: c.name, route: x, qty: q, top: pmTopOf_(me), price: 1100, pay: PM_PAY_DEF, desc: '', secret: '', attach: '', useId: '받는 기사 아이디', createdAt: now, updatedAt: now }]); }); pmTouch_(); return ids; })()") }); // (S205) 예전 방식(코드마다 일감)으로 올라가 있던 자료 그대로 넣기 — 기사앱은 이제 노선 통째로 1건
const sched = (dt) => call('adm_schSave', [tok, [{ row: D.G, date: dt, value: '212ABC', old: '' }, { row: D.O, date: dt, value: '휴무', old: '' }, { row: D.P, date: dt, value: '휴무', old: '' }]]);
const AL = (who, kind) => J("readAll_(SH.PALERT).filter(function (a) { return a.driverId === '" + D[who] + "' && a.kind === '" + kind + "'; }).map(function (a) { return a.text; })");
sched('2026-11-27');
let ids = call('api_pmGive', [T.G, { date: '2026-11-27', codes: ['212A', '212B', '212C'] }]).ids || [];
call('api_pmApplyMany', [T.O, ids, '']);
call('api_pmPick', [T.G, ids.map((j) => APP(j, 'O'))]);
let pg = AL('G', 'picked'), ac = AL('O', 'accept');
ok(pg.length === 1 && /212ABC 일감을 받는O 기사님으로 배차 확정/.test(pg[0]), '7 맡긴 기사에게도 배차 확정 알림 1건 (' + pg.join(' / ') + ')');
ok(ac.length === 1 && / 212ABC 일감이 기사님으로 확정/.test(ac[0]), '8 받은 기사 확정 알림도 「212ABC」 (' + ac.join(' / ') + ')');
sched('2026-11-28');
ids = LEG('G', '2026-11-28', ['212A', '212B', '212C']).ids; // 사무실 대행 등록처럼 코드별 일감 (S205)
const rt = (id) => J("readAll_(SH.PJOB).filter(function (j) { return j.id === '" + id + "'; })[0].route");
const ab = ids.filter((j) => rt(j) !== '212C'), cc = ids.filter((j) => rt(j) === '212C');
call('api_pmApplyMany', [T.O, ab, '']); call('api_pmApplyMany', [T.P, cc, '']);
call('api_pmPick', [T.G, ab.map((j) => APP(j, 'O')).concat(cc.map((j) => APP(j, 'P')))]);
pg = AL('G', 'picked').filter((x) => /11\/28/.test(x));
ok(pg.length === 2 && pg.some((x) => /212AB 일감을 받는O/.test(x)) && pg.some((x) => /212C 일감을 받는P/.test(x)), '9 나눠 맡기면 받은 기사별로 (' + pg.join(' / ') + ')');

// 한 명만 골라 확정 (자세히 보기 [확정]) 도 맡긴 기사에게 확정 알림
sched('2026-12-15');
{ const x = call('api_pmGive', [T.G, { date: '2026-12-15' }]).ids || []; call('api_pmApplyMany', [T.P, x, '']); call('api_pmDecide', [T.G, x[0], APP(x[0], 'P'), 'accept']);
  const pk = AL('G', 'picked').filter((t) => /12\/15/.test(t)); ok(pk.length === 1 && /212ABC 일감을 받는P/.test(pk[0]), '17 한 명 확정(api_pmDecide)도 맡긴 기사 알림 (' + pk.join(' / ') + ')'); }
// 배차 확정 카드: 최근 10묶음까지 (지난 날짜도) · 수행 기사 이름
for (let i = 0; i < 12; i++) {
  const dt = '2026-12-' + String(i + 1).padStart(2, '0'); sched(dt);
  const x = call('api_pmGive', [T.G, { date: dt }]).ids || [];
  call('api_pmApplyMany', [T.O, x, '']); call('api_pmPick', [T.G, x.map((j) => APP(j, 'O'))]);
}
const doneG = (who) => { const L = call('api_pmList', [T[who], {}]).jobs || []; const g = {}; L.filter((j) => j.status === '배차 확정' || j.status === '완료').forEach((j) => { g[j.grp] = 1; }); return { n: Object.keys(g).length, L }; };
let dg = doneG('S');
ok(dg.n === 10, '10 다른 기사 목록: 배차 확정 카드 10묶음까지 (' + dg.n + ')');
ok(dg.L.some((j) => j.taker === '받는O') && dg.L.filter((j) => j.status === '배차 확정').every((j) => j.taker), '11 카드에 수행 기사 이름 (taker)');
ok(!dg.L.some((j) => j.date === '2026-11-27'), '12 오래전에 확정된 묶음은 빠짐 (최근 확정 순)');
KDate.__setClock(() => Date.parse('2026-12-20T11:00:00+09:00'));
dg = doneG('S');
ok(dg.n === 10 && dg.L.every((j) => j.status === '완료'), '13 지난 날짜여도 최근 10묶음은 보임 (' + dg.n + ')');
}
const IX = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(/\(j\.taker \? '<dt>수행 기사<\/dt>/.test(IX) && !/function pmTakers\(/.test(IX), '14 기사앱: 수행 기사 이름은 [자세히 보기]에서만 (S204)');
ok(/escH\(j\.route \|\| lab\)/.test(IX) && /'배차 확정' : '모집 마감'\) \+ '<\/span><\/div><\/div>'/.test(IX), '15 기사앱 카드: 코드 박스에 노선 전체 (123B · 147개) · 배차 확정 띠는 가운데 (S204)');
{ const vm = require('vm'); let se = ''; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(IX))) { try { new vm.Script(m[1].replace(/<\?[\s\S]*?\?>/g, '0')); } catch (e) { se += e.message + ' '; } } ok(!se, '16 기사앱 화면 문법 ' + se); }
console.log(bad ? '실패 ' + bad : '모두 통과'); process.exit(bad ? 1 : 0);
