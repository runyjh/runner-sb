// (S181) 기사앱 속도: 정산 버전이 바뀌어도(품앗이 확정 · 정산 저장) 노선 평균 수량(피크 물량 · 내 스케줄 · 품앗이)은 정산 원본을 다시 읽지 않음 · 정산서를 새로 올리면 바로 새로
//  사용: node sbtest/ts181.js <runner-allinone 폴더>
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
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const C1 = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: C1, code: r }]));
['A', 'B'].forEach((k, i) => call('adm_createDriver', [tok, { name: '기사' + k, loginId: k.toLowerCase() + 'drv01', driverType: '고정', phone: '010-4000-20' + (10 + i), schCampId: C1, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { D[d.name.slice(-1)] = d.id; });
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
// 정산 원본 (10월분 → 11월 기준 전월)
const dates = []; for (let t = Date.parse('2026-09-26T00:00:00Z'); t <= Date.parse('2026-10-25T00:00:00Z'); t += 864e5) dates.push(new Date(t).toISOString().slice(0, 10));
const raw = []; dates.forEach((d) => { raw.push(['배송', 'adrv01', '212A', d, '군포1캠프', '일반', '러너', 180, 0, 1000, 0, 180000, 0, 180000, 0]); raw.push(['배송', 'adrv01', '212B', d, '군포1캠프', '일반', '러너', 170, 0, 1000, 0, 170000, 0, 170000, 0]); });
const im = call('adm_stlImport', [tok, { month: '2026-10', round: 1, file: 't.xlsx', raw, loss: [] }]);
if (!im.ok) console.log('import', im.msg);
call('adm_schSave', [tok, [{ row: D.A, date: '2026-11-20', value: '212AB', old: '' }]]);
call('api_pmGive', [T.A, { date: '2026-11-20', codes: ['212A', '212B'] }]);
// 새 서버(새 실행)에서 품앗이 목록 + 평균 수량을 부르고, 정산 원본을 몇 번 읽었는지 센다
const reads = () => J("(function(){ var n = 0, f = stlReadMonth_; stlReadMonth_ = function (t) { if (t === 'stl_raw') n++; return f.apply(null, arguments); }; var L = JSON.parse(JSON.stringify(api_pmList(" + JSON.stringify(T.B) + ", {}))); adm_myVol(" + JSON.stringify(tok) + "); return { n: n, vq: ((L.out || L).jobs || []).map(function (j) { return j.route + ':' + j.vq; }).join(',') }; })()");
let a = reads();
ok(/212A:180개/.test(a.vq) && /212B:170개/.test(a.vq), '1 품앗이 목록 코드 수량 = 정산서 하루 평균 (' + a.vq + ', 원본 읽기 ' + a.n + ')');
a = reads();
ok(a.n === 0, '2 다음 요청은 정산 원본을 읽지 않음 (읽기 ' + a.n + ')');
ev("stlBump_(); 1"); // 품앗이 확정 · 정산 저장 때처럼 정산 버전이 바뀜
a = reads();
ok(a.n === 0 && /212A:180개/.test(a.vq), '3 정산 버전이 바뀐 뒤에도 정산 원본을 다시 읽지 않음 (읽기 ' + a.n + ', ' + a.vq + ')');
// 정산서를 새로 올리면 바로 새 수량
const raw2 = raw.map((x) => { const y = x.slice(); if (y[2] === '212A') y[7] = 200; return y; });
call('adm_stlImport', [tok, { month: '2026-10', round: 2, file: 't2.xlsx', raw: raw2, loss: [] }]);
a = reads();
ok(a.n > 0 && !/212A:180개/.test(a.vq), '4 정산서를 새로 올리면 새로 계산 (읽기 ' + a.n + ', ' + a.vq + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
