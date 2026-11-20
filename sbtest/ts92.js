// S92 세무자료 엑셀: 합계 줄 (빈 칸이 글자로 이어 붙던 오류) · 대표님 양식 (머리글 색·높이·칸 너비·가운데) · 예전 정산 달 보험 기준 (TZ=UTC)
//  사용: node sbtest/ts92.js <runner-allinone 폴더> [만든 엑셀 저장 경로]
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), st = fs.readFileSync(path.join(SRC, 'Settle.gs'), 'utf8');
const f0 = ad.indexOf('  function tpFit(sh) {'), fnS = ad.slice(f0, ad.indexOf("  $('#stCloseBtn')", f0));
const z0 = ad.indexOf('  const ZIPW = (function () {'), z1 = ad.indexOf('  })();', z0) + 7;
const env = { ymTitle: (m) => m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월', ymdLocal: () => '2026-11-20' };
const mod = new Function(...Object.keys(env), fnS + '\n' + ad.slice(z0, z1) + '\nreturn { tpSheets, tpFit, ZIPW };')(...Object.values(env));
const dn = ['분실파손 부담', '용차(지출)', '산재보험', '고용보험', '가불금 상환', '기타 공제'];
const P = (m, name, pay, ded, san, goy) => { const d = {}; Object.keys(ded).forEach((k) => { d[k] = ded[k]; }); const sum = Object.values(ded).reduce((a, x) => a + x, 0); return { month: m, name, cids: name + 'id', workDays: 20, qty: 1000, pay, ded: d, dedSum: sum, net: pay - sum }; };
const pays = [P('2026-10', '나', 5000000, { '산재보험': 39000, '고용보험': 36000 }), P('2026-09', '가', 8000000, { '분실파손 부담': 12110, '산재보험': 62980, '고용보험': 57840 }), P('2026-09', '다', 0, { '기타 공제': -100000 }), P('2026-10', '라', 7000000, { '용차(지출)': 155440, '가불금 상환': 1000000, '산재보험': 54000 })];
const r = { company: {}, summary: [{ month: '2026-09' }, { month: '2026-10' }], invoices: [], pays, dedNames: dn, staff: [], insPaid: [{ month: '2026-09', amt: null }],
  ins: [{ month: '2026-09', name: '가', base: 8000000, bosu: 6360000, san: 62980, goy: 57840, runner: 0, total: 120820, oldIns: true }, { month: '2026-10', name: '나', base: 5000000, bosu: 3975000, san: 39000, goy: 36000, runner: 25000, total: 100000 }],
  costs: [], deposits: [], advances: [], losses: [], files: [], bankRows: [], noBiz: [] };
const sh = mod.tpSheets(r), dp = sh.find((x) => x.k === 'drvpay'), ins = sh.find((x) => x.k === 'ins');
const tot = dp.rows.find((x) => x[0] === '합계');
const col = (lab) => dp.rows[0].indexOf(lab);
ok(tot.every((v, i) => i === 0 || v === '' || typeof v === 'number'), '1 합계 줄은 모두 숫자 (글자로 이어 붙지 않음)');
ok(tot[col('공제: 분실파손 부담')] === 12110 && tot[col('공제: 산재보험')] === 155980 && tot[col('공제: 기타 공제')] === -100000 && tot[col('공제: 가불금 상환')] === 1000000, '2 공제 칸 합계가 맞음 (빈 칸 있는 열 포함)');
const sumOf = (lab) => dp.rows.slice(1).filter((x) => x.length > 2 && x[0] !== '합계').reduce((a, x) => a + (Number(x[col(lab)]) || 0), 0);
ok(dp.rows[0].every((lab, i) => i < 3 || tot[i] === sumOf(lab)), '3 모든 숫자 열: 합계 = 위 칸들을 더한 값 (근무일 포함)');
ok(tot[col('지급 합계 (지급합계 -공제합계 =실지급액)')] - tot[col('공제 합계')] === tot[col('실 지급액')], '4 지급 합계 − 공제 합계 = 실 지급액');
ok(dp.rows[0].join('|') === ['정산월', '기사명', '정산 아이디', '근무일', '배송건수', '지급 합계 (지급합계 -공제합계 =실지급액)'].concat(dn.map((d) => '공제: ' + d), ['공제 합계', '실 지급액']).join('|'), '5 머리글 = 대표님 양식 (은행·계좌 칸 없음)');
ok(dp.rows[1][0] === '2026년9월' && dp.rows[1][1] === '가' && dp.rows[3][1] === '나', '6 월 → 이름 순');
ok(dp.hdrFill[0] === '3B7D23' && dp.hdrFill[5] === '3B7D23' && dp.hdrFill[6] === 'C04F15' && dp.hdrFill[col('공제 합계')] === 'C04F15' && dp.hdrFill[col('실 지급액')] === '4E95D9' && dp.hdrHt === 72 && dp.center, '7 머리글 색: 기본 초록 · 공제 주황 · 실 지급액 파랑 · 높이 72 · 가운데');
ok(mod.tpFit(dp).widths.join(',') === [13, 19, 32, 9, 11, 23].concat(dn.map(() => 10.86), [10.86, 15]).join(','), '8 칸 너비 = 양식 그대로 (자동 맞춤이 바꾸지 않음)');
const it = ins.rows.find((x) => x[0] === '합계');
ok(it.slice(3, 9).every((v) => typeof v === 'number') && it[8] === 220820 && Number.isInteger(it[4]), '9 고용산재 합계도 숫자 · 정수');
ok(ins.rows.some((x) => x[9] === '예전 정산 (기준=지급합계)'), '10 예전 정산 달은 비고에 표시');
ok(/oldIns = !ins\.base && \(\(d\.san \|\| 0\) \+ \(d\.goy \|\| 0\)\) > 0/.test(st) && /Math\.round\(iBosu\)/.test(st), '11 서버: 예전 정산 달은 지급 합계를 기준 공급가로 · 반올림');
// 실제 엑셀 파일 (스타일 확인)
const blob = mod.ZIPW.xlsx(sh.map(mod.tpFit));
blob.arrayBuffer().then((ab) => {
  const buf = Buffer.from(ab); if (process.argv[3]) fs.writeFileSync(process.argv[3], buf);
  const files = {}; let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) { const nl = buf.readUInt16LE(o + 26), sz = buf.readUInt32LE(o + 18), nm = buf.slice(o + 30, o + 30 + nl).toString(); files[nm] = buf.slice(o + 30 + nl, o + 30 + nl + sz).toString(); o += 30 + nl + sz; }
  const styles = files['xl/styles.xml'];
  ok(/FF3B7D23/.test(styles) && /FFC04F15/.test(styles) && /FF4E95D9/.test(styles), '12 엑셀 스타일에 세 가지 머리글 색');
  const xfN = (styles.match(/<cellXfs count="(\d+)"/) || [])[1], xfs = (styles.split('<cellXfs')[1].split('</cellXfs>')[0].match(/<xf /g) || []).length;
  const fN = (styles.match(/<fills count="(\d+)"/) || [])[1], fs2 = (styles.split('<fills')[1].split('</fills>')[0].match(/<fill>/g) || []).length;
  ok(Number(xfN) === xfs && Number(fN) === fs2, '13 스타일 개수 표시가 실제와 같음 (엑셀이 깨지지 않게) ' + xfN + '/' + xfs + ' · ' + fN + '/' + fs2);
  ok(Object.keys(files).some((k) => /sheet\d+\.xml$/.test(k) && /<row r="1" ht="72"/.test(files[k])), '14 기사 급여정산서 머리글 높이 72');
});
