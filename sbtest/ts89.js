// S89 세무자료 내보내기: 세무사 요청 4가지(급여내역서 · 사업용계좌내역 · 고용산재보험료내역서 · 종이 세금계산서)만 기본 · 나머지는 골라서 · 증빙 「종이 세금계산서」 (TZ=UTC)
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const sv = JSON.parse(fresh().__sbEval("JSON.stringify({ p: STL_PROOFS, v: stlSplitVat_(110000, '종이 세금계산서') })"));
ok(sv.p.indexOf('종이 세금계산서') >= 0 && sv.v.supply === 100000 && sv.v.vat === 10000, '1 증빙에 「종이 세금계산서」 (부가세 공제 = 세금계산서와 같이 ÷1.1)');
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const t0 = ad.indexOf('  const TP_SHEETS = '), tpS = ad.slice(t0, ad.indexOf("  $('#tpCancel')", t0));
const f0 = ad.indexOf('  function tpSheets(r) {'), fnS = ad.slice(f0, ad.indexOf("  $('#stCloseBtn')", f0));
const env = { ymTitle: (m) => m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월', ymdLocal: () => '2026-11-20' };
const mod = new Function(...Object.keys(env), tpS + fnS + '\nreturn { TP_SHEETS, tpSheets };')(...Object.values(env));
const need = mod.TP_SHEETS.filter((x) => x[2]).map((x) => x[1]);
ok(need.join('|') === '급여내역서|사업용계좌내역|고용산재보험료내역서|종이 세금계산서 (목록)', '2 기본으로 체크되는 것 = 세무사 요청 4가지 ' + need.join(', '));
const r = { company: {}, summary: [{ month: '2026-10', closed: true }], invoices: [], pays: [], dedNames: [], staff: [{ month: '2026-10', name: '직원', pay: 2500000, rate: '3.3%', wht: 82500, net: 2417500 }], ins: [{ month: '2026-10', name: '가', base: 1, bosu: 1, san: 1, goy: 1, runner: 1, total: 3 }],
  costs: [{ month: '2026-10', date: '2026-10-05', kind: '지출 기록', name: '사무실 임대', vendor: '김건물', amt: 1100000, supply: 1000000, vat: 100000, proof: '종이 세금계산서', cat: '임대료' }, { month: '2026-10', date: '2026-10-06', kind: '지출 기록', name: '주유', amt: 55000, supply: 50000, vat: 5000, proof: '카드' }],
  deposits: [], advances: [], losses: [], files: [], bankRows: [], noBiz: [] };
const sh = mod.tpSheets(r), keys = sh.map((x) => x.k), names = sh.map((x) => x.name);
ok(['pay', 'bank', 'ins', 'paper'].every((k) => keys.indexOf(k) >= 0) && names.indexOf('급여내역서') >= 0 && names.indexOf('고용산재보험료내역서') >= 0 && names.indexOf('사업용계좌내역') >= 0, '3 시트 이름 = 세무사가 부르는 이름 (급여내역서 · 고용산재보험료내역서 · 사업용계좌내역)');
const paper = sh.find((x) => x.k === 'paper').rows;
ok(paper.length >= 3 && paper[1][2] === '김건물' && paper[1][7] === 1100000 && !JSON.stringify(paper).includes('주유'), '4 종이 세금계산서 시트 = 증빙이 종이 세금계산서인 지출만 (카드 주유는 빠짐)');
ok(/안 올렸|올리지 않았/.test(JSON.stringify(sh.find((x) => x.k === 'bank').rows)), '5 통장 내역을 안 올렸으면 사업용계좌내역 시트에 「은행 엑셀을 같이 보내세요」 안내');
ok(sh.every((x) => x.k), '6 모든 시트에 고르기용 이름표 (고른 것만 엑셀에 넣음)');
ok(/data-tps=/.test(ad) && /runner\.tpSheets/.test(ad) && /<details class="tp-more">/.test(ad) && /만드는 중… 잠시만 기다려 주세요/.test(ad), '7 창: 기본 4가지 + 「추가 자료」 접기 · 고른 것 기억 · 누르면 「만드는 중… 잠시만 기다려 주세요」');
