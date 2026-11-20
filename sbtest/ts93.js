// S93 세무자료 엑셀 2차: 대표님 양식 그대로 (계좌내역 11칸 · 계좌 끝번호 4자리 글자 칸 · 색/너비/높이) · 지급 합계 두 번 더하기 · 깨진 공제 이름 → 기타 공제 · 기본 4가지 (TZ=UTC)
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), st = fs.readFileSync(path.join(SRC, 'Settle.gs'), 'utf8');
const f0 = ad.indexOf('  function tpFit(sh) {'), fnS = ad.slice(f0, ad.indexOf("  $('#stCloseBtn')", f0));
const z0 = ad.indexOf('  const ZIPW = (function () {'), z1 = ad.indexOf('  })();', z0) + 7;
const env = { ymTitle: (m) => m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월', ymdLocal: () => '2026-11-20' };
const mod = new Function(...Object.keys(env), fnS + '\n' + ad.slice(z0, z1) + '\nreturn { tpSheets, tpFit, ZIPW };')(...Object.values(env));
const r = { company: {}, summary: [{ month: '2026-10' }], invoices: [], pays: [], dedNames: [], staff: [], ins: [], insPaid: [], costs: [], deposits: [], advances: [], losses: [], files: [], noBiz: [],
  bankRows: [{ bank: '우리은행_대표통장', acct4: '0127', date: '2026-10-01', time: '10:00:00', io: '입금', amt: 1000, bal: 5000, memo: '가', kind: '이체', cat: '매출', refName: 'x', note: 'y' }, { bank: '우리은행_대표통장', acct4: '0127', date: '2026-10-02', time: '10:00:00', io: '출금', amt: 300, bal: 4700, memo: '나', kind: '이체', cat: '운영비' }] };
const bk = mod.tpSheets(r).find((x) => x.k === 'bank');
ok(bk.rows[0].join('|') === '통장|계좌 끝번호 4자리|날짜|시각|입/출|입금|출금|잔액|거래내용|거래구분|분류', '1 계좌내역 머리글 = 양식 (연결·메모 칸 없음)');
ok(bk.rows[1][1].v === '0127' && bk.rows[1][1].txt && bk.rows[1].length === 11, '2 계좌 끝번호는 4자리 글자 그대로 (앞 0 유지 · ··· 없음)');
ok(bk.widths.join(',') === '29.86,13.29,13,11,8,16,16,14,30.57,30.57,30.57' && bk.hdrHt === 42 && bk.fixW && bk.center, '3 너비·높이 = 양식');
ok(bk.hdrFill.join(',') === '3B7D23,3B7D23,3B7D23,3B7D23,3B7D23,163E64,163E64,163E64,3B7D23,3B7D23,3B7D23', '4 머리글 색: 입금·출금·잔액 남색 · 나머지 초록');
const t = bk.rows.find((x) => x[0] === '합계'); ok(t[5] === 1000 && t[6] === 300, '5 입금·출금 합계');
mod.ZIPW.xlsx([mod.tpFit(bk)]).arrayBuffer().then((ab) => {
  const buf = Buffer.from(ab), files = {}; let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) { const nl = buf.readUInt16LE(o + 26), sz = buf.readUInt32LE(o + 18), nm = buf.slice(o + 30, o + 30 + nl).toString(); files[nm] = buf.slice(o + 30 + nl, o + 30 + nl + sz).toString(); o += 30 + nl + sz; }
  const sx = files['xl/worksheets/sheet1.xml'], sty = files['xl/styles.xml'];
  ok(/<c r="B2" s="17" t="inlineStr"><is><t xml:space="preserve">0127<\/t>/.test(sx), '6 엑셀: B2 = 글자 칸 0127');
  const xfs = sty.split('<cellXfs')[1].split('</cellXfs>')[0].match(/<xf [^>]*>/g); ok(/numFmtId="49"/.test(xfs[17]) && Number((sty.match(/<cellXfs count="(\d+)"/) || [])[1]) === xfs.length, '7 스타일 17 = 글자(@) · 개수 맞음');
  ok(/<row r="1" ht="42"/.test(sx) && /FF163E64/.test(sty), '8 머리글 높이 42 · 남색');
});
// 서버
ok(/pay: \(d\.invoice \|\| 0\) \+ \(d\.taxDed \|\| 0\) \+ \(d\.depAdd \|\| 0\), ded: ded/.test(st), '9 지급 합계 = 계산서 + 계산서 차감 + 입금가산 (프로모션 두 번 더하지 않음)');
ok(/dedNames\.indexOf\(L\.name\) >= 0 \? L\.name : etcName/.test(st), '10 목록에 없는 공제 이름(깨진 예전 이름) → 기타 공제');
ok(/acct4: acctLast4\(x\)/.test(st) && /b4\[d\.slice\(0, 4\)\] = b4\[d\.slice\(0, 4\)\] \|\| last/.test(st), '11 계좌 끝 4자리 = 등록 계좌번호의 진짜 끝 4자리 (앞 4자리로 기억한 경우도) · 통장 = 은행_통장명');
// 위 지급 합계식이 정산 계산식과 맞는지: net = invoice − san − goy − depDed + depAdd · dedSum = san + goy + depDed + taxDed
const d = { invoice: 0, taxDed: 0, depAdd: 100000, depDed: 23770, san: 0, goy: 0, pay: 100000 }; d.net = d.invoice - d.san - d.goy - d.depDed + d.depAdd;
const pay = d.invoice + d.taxDed + d.depAdd, dedSum = d.san + d.goy + d.depDed + d.taxDed;
ok(pay - dedSum === d.net && /const net = invoice - san - goy - depDed \+ depAdd;/.test(st), '12 지급 합계 − 공제 합계 = 실 지급액 (프로모션만 있는 기사도: ' + pay + ' − ' + dedSum + ' = ' + d.net + ')');
const tp = ad.slice(ad.indexOf('const TP_SHEETS'), ad.indexOf('const TP_VER'));
ok([...tp.matchAll(/\['(\w+)', '[^']+', true\]/g)].map((m) => m[1]).join(',') === 'drvpay,bank,paper,ins' && /TP_VER = 3/.test(ad), '13 기본 = 양식의 4가지 (원본 링크는 골라서)');
