// S23 ① 다른 기사 칸이 바뀌면 같은 날 칸 모양(남은 회전 표시)도 바로 다시 그림 ② Firestore 없이도 변경 시각 기록 → 60초 확인으로 다른 관리자 변경 반영 (TZ=UTC)
//  사용: node sbtest/ts17.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || '.', 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const H = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const i0 = H.indexOf('function refreshAfterChange('), blk = H.slice(i0, i0 + 4000);
ok(/const vk = cellHtml\(v, r\.row, dt\)/.test(blk) && !/const vk = v \+/.test(blk), '1 칸을 다시 그릴지 = 그려질 모양으로 비교 (다른 칸 때문에 바뀐 모양도 다시 그림)');
// 2. 서버: Firestore 꺼져 있어도(FS_OFF) 기사스케줄 저장 → adm_live 의 schAt · schBy 가 바뀜
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_();");
const tok = fresh().__sbLogin('boss', true).token;
const l0 = call('adm_live', [tok]);
call('adm_campSave', [tok, { name: '강서1캠프', rot: 'D1,D2,F3' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_createDriver', [tok, { name: '김창호', loginId: 'k@df', driverType: '백업', phone: '010-3000-1001', schCampId: camps['강서1캠프'], baseRoute: '백업' }]);
const id = call('adm_listDrivers', [tok]).rows[0].id, today = ev('todayText_()');
call('adm_schSave', [tok, [{ row: id, date: today, value: '527B', old: '' }]]);
const l1 = call('adm_live', [tok]);
ok(l1.ok && +l1.schAt > +(l0.schAt || 0) && l1.schBy === 'boss', '2 Firestore 꺼져도 저장하면 변경 시각 · 저장한 사람 기록 (' + (l0.schAt || 0) + ' → ' + l1.schAt + ' · ' + l1.schBy + ')');
ok(/LIVE\.unsub (\|\| LW\.on )?\? 20000 : 90000/.test(H), '3 60초 확인일 때 내가 방금 저장한 것은 다시 받지 않음 (90초)');
