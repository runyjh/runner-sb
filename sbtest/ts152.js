// (S152) 정리: '운영자' 가짜 캠프 삭제(소속 직원은 캠프 비움) · teams_msgs 표 삭제 · 세금계산서 한 메뉴 · 매입·매출은 정산관리 안 탭 · 기존 스케줄 가져오기 버튼 없앰
//  사용: node sbtest/ts152.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-21T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));

const fs = require('fs');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
// '운영자' 캠프 + 직원 2명 + 일반 기사 1명 · teams_msgs 표
ev("appendObj_(SH.CAMPS, { id: 'CSTAFF', name: '운영자', createdAt: nowText_() }); bumpMaster_(); 1");
call('adm_createDriver', [tok, { name: '직원갑', loginId: 'staffa01', driverType: '고정', phone: '010-4000-2001', schCampId: 'CSTAFF', title: '대표' }]);
call('adm_createDriver', [tok, { name: '직원을', loginId: 'staffb01', driverType: '고정', phone: '010-4000-2002', schCampId: 'CSTAFF', title: '관리자' }]);
call('adm_createDriver', [tok, { name: '기사갑', loginId: 'drva01', driverType: '고정', phone: '010-4000-2003', schCampId: CAMP, baseRoute: '212A' }]);
ev("ss_().insertSheet('teams_msgs'); 1");
const before = J("readAll_(SH.DRIVERS).filter(function(d){return d.schCampId==='CSTAFF';}).length");
ok(before === 2, '0 운영자 캠프 소속 2명 (' + before + ')');
ev("PropertiesService.getScriptProperties().deleteProperty(ONCE152); _props = null; 1");
call('adm_listDrivers', [tok]);
const camps = J("readAll_(SH.CAMPS).map(function(c){return c.name;})");
ok(camps.indexOf('운영자') < 0 && camps.indexOf('군포1캠프') >= 0, '1 운영자 캠프만 지움 (' + camps.join(',') + ')');
const st = J("readAll_(SH.DRIVERS).filter(function(d){return d.name.indexOf('직원')===0;}).map(function(d){return [d.schCampId||'', d.schCamp||'', d.title];})");
ok(st.length === 2 && st.every((x) => !x[0] && !x[1] && x[2]), '2 직원 2명은 캠프 비움 · 직함 그대로 (' + JSON.stringify(st) + ')');
const nm = J("readAll_(SH.DRIVERS).filter(function(d){return d.name==='기사갑';})[0].schCampId");
ok(nm === CAMP, '3 일반 기사 캠프는 그대로');
ok(!J("!!ss_().getSheetByName('teams_msgs')"), '4 teams_msgs 표 삭제');
ok(J("!!PropertiesService.getScriptProperties().getProperty(ONCE152)"), '5 한 번만 (표시 남음)');
// 다시 운영자 캠프를 만들어도 다시 돌지 않음
ev("appendObj_(SH.CAMPS, { id: 'CSTAFF2', name: '운영자', createdAt: nowText_() }); 1");
call('adm_listDrivers', [tok]);
ok(J("readAll_(SH.CAMPS).filter(function(c){return c.id==='CSTAFF2';}).length") === 1, '6 두 번째 부름에서는 아무것도 안 함');
ev("readAll_(SH.CAMPS).filter(function(c){return c.id==='CSTAFF2';}).forEach(function(c){ sheet_(SH.CAMPS).deleteRow(c._row); }); bumpMaster_(); 1");
// 기사앱: 캠프 없는 직함자 → 직원 스케줄 (백업 줄 아님)
const sid = J("readAll_(SH.DRIVERS).filter(function(d){return d.name==='직원갑';})[0].id");
const stok = ev("createSession_('" + sid + "', true).token");
const ms = call('api_mySchedule', [stok]);
ok(ms && ms.ok && ms.staff && typeof ms.staff === 'object', '7 기사앱: 캠프 없는 직함자도 직원 스케줄 (' + (ms && (ms.msg || Object.keys(ms).slice(0, 8).join(','))) + ')');
// 관리자 화면
const A = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const nav = A.slice(A.indexOf('<nav class="nav">'), A.indexOf('</nav>'));
ok(!/data-st-go="pnl"/.test(nav) && /data-view="settle">정산관리</.test(nav), '8 메뉴: 매입·매출 줄 없음 (정산관리 안 탭)');
ok(/data-view="taxinv"[^>]*>세금계산서</.test(nav) && !/data-view="einv"/.test(nav), '9 메뉴: 세금계산서 한 줄');
ok((A.match(/data-txv="einv"/g) || []).length >= 2 && /id="stFinSw"/.test(A), '10 화면 안 탭: 역발행 ↔ 발행 체크 · 정산 ↔ 매입·매출');
ok(!/id="sLegPull"/.test(A) && !/data-mmv="einv"|data-mmgo="pnl"/.test(A), '11 기존 스케줄 가져오기 버튼 없음 · 휴대폰 더보기도 한 줄씩');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
