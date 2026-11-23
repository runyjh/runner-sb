// (S180) 기사앱 속도: 품앗이 목록이 정산 버전이 바뀔 때마다 정산 원본을 다시 읽지 않음 (노선 평균 수량은 6시간 기억)
//  사용: node sbtest/ts180.js <runner-allinone 폴더>
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
const keys = () => Object.keys(S.cache || {}).concat(Object.keys((S.caches && S.caches.script) || {}));
const volKeys = () => J("(function(){ var c = cache_(), out = []; ['stl:vol4:' + stlVer_(), 'pm:vol1:2026-11'].forEach(function (k) { out.push(k.split(':')[0] + ':' + k.split(':')[1] + '=' + (c.get(k) != null ? 'O' : 'X')); }); return out; })()");
let L = call('api_pmList', [T.B, {}]);
const vq1 = L.jobs.map((j) => j.route + ':' + j.vq).join(',');
ok(/212A:180개/.test(vq1) && /212B:170개/.test(vq1), '1 품앗이 목록 코드 수량 = 정산서 하루 평균 (' + vq1 + ')');
console.log('  기억: ' + volKeys().join(' '));
ev("stlBump_(); 1"); // 품앗이 확정 · 정산 저장 때처럼 정산 버전이 바뀜
const before = volKeys();
L = call('api_pmList', [T.B, {}]);
const after = volKeys();
ok(/stl:vol4=X/.test(before.join()) && /stl:vol4=X/.test(after.join()) && /pm:vol1=O/.test(after.join()), '2 정산 버전이 바뀐 뒤에도 품앗이 목록은 정산 원본을 다시 읽지 않음 (' + before.join(' ') + ' → ' + after.join(' ') + ')');
ok(L.jobs.every((j) => /개$/.test(j.vq)), '3 수량은 그대로 나옴');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
