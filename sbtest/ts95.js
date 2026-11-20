// S95 입금확인: 우리은행 대량이체 올리기 파일 (옛 엑셀 .xls · 머리글 없음 · 8칸: 은행 · 계좌 · 금액 · 수취인 · 생년월일 · CMS · 통장표시 · 내부 메모) (TZ=UTC)
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const a0 = ad.indexOf('  const PAY_BANKS = '), a1 = ad.indexOf("  $('#paySel').addEventListener('click'", a0);
const z0 = ad.indexOf('  const XLSW = (function () {'), z1 = ad.indexOf('  })();', ad.indexOf('  const ZIPW = (function () {')) + 7;
const mod = new Function(ad.slice(a0, a1) + '\n' + ad.slice(z0, z1) + '\nreturn { payBulkRows, ZIPW, XLSW };')();
const L = [{ name: '가', bank: 'KB국민은행', account: '0123-45-678901', holder: '가', net: 7962535 }, { name: '나(다)', bank: '농협', account: '301-0000-1111-22', holder: '다', net: 100000, checked: true }, { name: '라', bank: '우리', account: '', holder: '라', net: 5 }, { name: '마', bank: '신한', account: '110-1-2', holder: '마', net: -2000000 }];
const f = mod.payBulkRows(L, '2026-10');
ok(f.rows.length === 2 && f.skip === 2 && f.sum === 8062535 && f.done === 1, '1 계좌 없음 · 0원 이하는 뺌 · 합계 · 이미 입금 완료 수 (' + f.rows.length + '명 · ' + f.sum + ')');
ok(f.rows[0].length === 8 && f.rows[0][0] === '국민은행' && f.rows[0][1].v === '012345678901' && f.rows[0][1].txt && f.rows[0][2] === 7962535 && f.rows[0][3] === '가' && f.rows[0][4] === '' && f.rows[0][5] === '', '2 8칸: 은행 · 계좌(숫자만 · 글자 칸 · 앞 0 유지) · 금액(숫자) · 수취인 · 빈 칸 2개');
ok(f.rows[0][6] === '러너 급여' && f.rows[0][7] === '가' && f.rows[1][7] === '나(다)' && f.rows[1][0] === '농협' && f.rows[1][3] === '다', '3 받는분 통장표시 「러너 급여」 · 내부 메모 = 기사 이름 (10자까지) · 수취인 = 예금주');
ok(/id="paySelBulk"/.test(ad) && /우리은행_대량이체_/.test(ad), '4 입금확인 선택 줄에 「대량이체 파일」 단추');
ok(/XLSW\.xls\(f\.rows/.test(ad) && /명\.xls'/.test(ad), '5 은행 샘플과 같은 옛 엑셀 형식(.xls)으로 내려받음');
// .xls 파일을 실제로 만들어 구조 확인 (+ 경로를 주면 저장 → 다른 프로그램으로 열어 확인)
const big = Array.from({ length: 600 }, (_, i) => ['국민은행', { v: '0' + String(10000000000 + i), txt: true }, 1000 + i, '수취인' + i, '', '', '러너 급여', '2026-10|기사' + i]);
Promise.all([mod.XLSW.xls(f.rows, [10, 20]).arrayBuffer(), mod.XLSW.xls(big).arrayBuffer()]).then(([a, b]) => {
  const A = Buffer.from(a), Bg = Buffer.from(b);
  if (process.argv[3]) { fs.writeFileSync(process.argv[3], A); fs.writeFileSync(process.argv[3].replace(/\.xls$/, '_big.xls'), Bg); }
  ok(A.slice(0, 8).toString('hex') === 'd0cf11e0a1b11ae1' && A.length % 512 === 0 && A.length >= 512 + 4096 + 1024, '6 OLE2 묶음 머리 · 512 바이트 조각 · 흐름 4096 이상');
  ok(A.readUInt16LE(512) === 0x0809 && A.readUInt16LE(516) === 0x0600 && A.readUInt16LE(518) === 0x0005, '7 통합 문서 흐름이 BIFF8 머리(BOF)로 시작');
  const n = A.readUInt32LE(48), dir = 512 * (1 + n);
  ok(A.slice(dir + 128, dir + 144).toString('utf16le') === 'Workbook' && A.readUInt32LE(dir + 128 + 116) === 0 && A.readUInt32LE(dir + 128 + 120) === n * 512, '8 목록에 Workbook 흐름 (시작 0 · 크기 맞음)');
  // 큰 파일: SST 가 여러 줄(CONTINUE)로 나뉘는지 · 모든 record 길이 ≤ 8224
  let o = 512, cont = 0, bad = 0, eofs = 0; while (eofs < 2 && o < Bg.length - 4) { const id = Bg.readUInt16LE(o), len = Bg.readUInt16LE(o + 2); if (len > 8224) bad++; if (id === 0x003C) cont++; if (id === 0x000A) eofs++; o += 4 + len; }
  ok(cont >= 1 && bad === 0 && eofs === 2, '9 600명: 글자 모음이 여러 줄로 나뉨 (' + cont + '번) · 긴 줄 없음');
});
