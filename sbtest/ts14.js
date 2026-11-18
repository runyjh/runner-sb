// S20 영문이 붙은 캠프 이름 (F_삼성1): 칸 앞 캠프 글자 'F_삼성1 204D,205AB' 를 캠프로 알아봄 (서버 업로드표 · 화면 미입차 계산) (TZ=UTC)
//  사용: node sbtest/ts14.js <runner-allinone 폴더>
const path = require('path');
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
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_();");
const tok = fresh().__sbLogin('boss', true).token;
const today = ev('todayText_()');
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const D0 = addDays(today, 3), DB = addDays(today, 1), D1 = addDays(today, 4), D2 = addDays(today, 5), D3 = addDays(today, 6);

call('adm_campSave', [tok, { name: 'F_삼성1캠프', rot: 'D1,D2' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
['204ABCD', '205ABCD'].forEach((code) => call('adm_routeSave', [tok, { campId: camps['F_삼성1캠프'], code }]));
call('adm_createDriver', [tok, { name: '김도윤', loginId: 'k1@df', driverType: '고정', phone: '010-3000-1001', schCampId: camps['F_삼성1캠프'], baseRoute: '204D,205AB' }]);
call('adm_createDriver', [tok, { name: '이용', loginId: 'k2@df', driverType: '백업', phone: '010-3000-1002', baseRoute: '백업' }]);
const drv = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { drv[d.name] = d; });
const A = addDays(today, 2);
call('adm_schSave', [tok, [{ row: drv['김도윤'].id, date: A, value: '휴무', old: '' }, { row: drv['이용'].id, date: A, value: 'F_삼성1 204D,205AB', old: '' }]]);
const up = call('adm_schUploadTable', [tok, A, '4w']);
const rows = [].concat(...up.weeks).filter((r) => r[0] === A);
const mine = rows.filter((r) => r[10] === '이용'); if (process.env.DBG) console.log(JSON.stringify(mine));
ok(up.ok && mine.length && mine.every((r) => r[2] === 'F_삼성1') && ['204D', '205A', '205B'].every((u) => mine.some((r) => String(r[7]).split(',').includes(u))), '1 업로드표: 이용 → ' + mine.map((r) => r[2] + ' ' + r[7]).join(' / '));
ok(!up.missing.some((r) => String(r[0]) === A && /204D|205A|205B/.test(r[7])), '2 김도윤 휴무 날 204D · 205AB 미입차 아님 (이용이 탐)');
// 3. 화면 계산 (SchedCalc): 캠프 글자가 영문으로 시작해도 그 캠프 노선으로 셈
const fs = require('fs'), H = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const i0 = H.indexOf('const SchedCalc = (function () {'), i1 = H.indexOf('return { compute, routeExpand, isWorkDay };', i0);
const SC = new Function(H.slice(i0, i1) + 'return { compute, routeExpand, isWorkDay }; })(); return SchedCalc;')();
const res = SC.compute([
  { key: 'K1', camp: 'F_삼성1', name: '김도윤', baseRoute: '204D,205AB', type: '고정', cells: ['휴무'] },
  { key: 'K2', camp: '', name: '이용', baseRoute: '백업', type: '백업', cells: ['F_삼성1 204D,205AB'] }], { 'F_삼성1': ['D1', 'D2'] }, 1, []);
const miss = JSON.stringify(res.missing || []);
ok(!/204D|205A|205B/.test(miss), '3 화면 미입차 계산: 비어 있는 노선 없음 ' + miss.slice(0, 120));
