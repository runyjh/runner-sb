// (S153) 정리: 안 쓰는 표(계좌 붙여넣기(임시) · 서류 연결 · msg_log) 삭제 · 서초1 204/205 정지 노선 삭제 · 기존 정산 가져오기 · 이식 · 기존 스케줄 가져오기 코드 삭제
//  사용: node sbtest/ts153.js <runner-allinone 폴더>
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
call('adm_campSave', [tok, { name: '서초1캠프' }]); call('adm_campSave', [tok, { name: 'F_삼성1캠프' }]);
const cs = call('adm_routeAll', [tok]).camps, SC = cs.find((c) => /서초1/.test(c.name)).id, FS = cs.find((c) => /삼성1/.test(c.name)).id;
['204ABCD', '205ABCD', '404ABCD'].forEach((r) => call('adm_routeSave', [tok, { campId: SC, code: r }]));
['204ABCD', '205ABCD'].forEach((r) => call('adm_routeSave', [tok, { campId: FS, code: r }]));
ev("readAll_(SH.ROUTES).forEach(function(r){ if (/서초1/.test(r.campName) && /^20[45]/.test(r.code)) writeFields_(SH.ROUTES, r._row, { status: '정지' }); }); bumpMaster_(); 1");
ev("['계좌 붙여넣기(임시)', '서류 연결', 'msg_log'].forEach(function(n){ ss_().insertSheet(n); }); 1");
ev("PropertiesService.getScriptProperties().deleteProperty(ONCE153); _props = null; 1");
call('adm_listDrivers', [tok]);
const tabs = J("['계좌 붙여넣기(임시)', '서류 연결', 'msg_log'].filter(function(n){ return !!ss_().getSheetByName(n); })");
ok(tabs.length === 0, '1 안 쓰는 표 3개 삭제 (' + tabs.join(',') + ')');
const rts = J("readAll_(SH.ROUTES).filter(function(r){return r.code;}).map(function(r){return r.campName.replace('캠프','') + ' ' + r.code + ' ' + r.status;}).sort()");
ok(!rts.some((x) => /^서초1 20[45]/.test(x)) && rts.filter((x) => /^F_삼성1 20[45]ABCD 사용/.test(x)).length === 2 && rts.some((x) => /^서초1 404ABCD/.test(x)) && rts.some((x) => /^군포1 212A/.test(x)), '2 서초1 204/205 정지만 지움 · F_삼성1 것과 다른 노선은 그대로 (' + rts.join(' / ') + ')');
const A = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
ok(!/id="stMigrate"|data-cfg="migrate"|id="legModal"|id="stLegBtn"|adm_stlMigrate|adm_stlLegacyClose|adm_stlLegacyPreview/.test(A), '4 화면: 기존 정산 시트 가져오기 · 이식 지움');
ok(!/id="lpModal"|adm_schLegacyPull/.test(A) && /stLegCmp/.test(A), '5 화면: 기존 스케줄 가져오기 지움 · 이식한 달 비교는 남김');
ok(!fs.existsSync(path.join(SRC, 'SettleMigrate.gs')) && !fs.existsSync(path.join(SRC, 'SchLegacy.gs')), '6 서버: SettleMigrate.gs · SchLegacy.gs 지움');
const fns = J("[typeof adm_stlMigrate, typeof adm_stlLegacyClose, typeof adm_stlLegacyPreview, typeof adm_schLegacyPull, typeof ensureTools_, typeof adm_stlLegacyCompare, typeof stlLegacyClosed_, typeof folderFromUrl_]");
ok(fns.join() === 'undefined,undefined,undefined,undefined,undefined,function,function,function', '7 서버 함수 정리 (' + fns.join() + ')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
