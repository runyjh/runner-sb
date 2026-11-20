// S95 입금확인: 우리은행 대량이체 올리기 파일 (머리글 없음 · 8칸: 은행 · 계좌 · 금액 · 수취인 · 생년월일 · CMS · 통장표시 · 내부 메모) (TZ=UTC)
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const a0 = ad.indexOf('  const PAY_BANKS = '), a1 = ad.indexOf("  $('#paySel').addEventListener('click'", a0);
const z0 = ad.indexOf('  const ZIPW = (function () {'), z1 = ad.indexOf('  })();', z0) + 7;
const mod = new Function(ad.slice(a0, a1) + '\n' + ad.slice(z0, z1) + '\nreturn { payBulkRows, ZIPW };')();
const L = [{ name: '가', bank: 'KB국민은행', account: '0123-45-678901', holder: '가', net: 7962535 }, { name: '나(다)', bank: '농협', account: '301-0000-1111-22', holder: '다', net: 100000, checked: true }, { name: '라', bank: '우리', account: '', holder: '라', net: 5 }, { name: '마', bank: '신한', account: '110-1-2', holder: '마', net: -2000000 }];
const f = mod.payBulkRows(L, '2026-10');
ok(f.rows.length === 2 && f.skip === 2 && f.sum === 8062535 && f.done === 1, '1 계좌 없음 · 0원 이하는 뺌 · 합계 · 이미 입금 완료 수 (' + f.rows.length + '명 · ' + f.sum + ')');
ok(f.rows[0].length === 8 && f.rows[0][0] === '국민은행' && f.rows[0][1].v === '012345678901' && f.rows[0][1].txt && f.rows[0][2] === 7962535 && f.rows[0][3] === '가' && f.rows[0][4] === '' && f.rows[0][5] === '', '2 8칸: 은행 · 계좌(숫자만 · 글자 칸 · 앞 0 유지) · 금액(숫자) · 수취인 · 빈 칸 2개');
ok(f.rows[0][6] === '러너10월정산' && f.rows[0][7] === '2026-10|가' && f.rows[1][0] === '농협' && f.rows[1][3] === '다', '3 받는분 통장표시 「러너10월정산」 · 내부 메모 = 정산월|이름 · 수취인 = 예금주');
ok(/id="paySelBulk"/.test(ad) && /우리은행_대량이체_/.test(ad), '4 입금확인 선택 줄에 「대량이체 파일」 단추');
mod.ZIPW.xlsx([{ name: 'Sheet1', rows: f.rows, plain: true, filter: false }]).arrayBuffer().then((ab) => {
  const buf = Buffer.from(ab), files = {}; let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) { const nl = buf.readUInt16LE(o + 26), sz = buf.readUInt32LE(o + 18), nm = buf.slice(o + 30, o + 30 + nl).toString(); files[nm] = buf.slice(o + 30 + nl, o + 30 + nl + sz).toString(); o += 30 + nl + sz; }
  if (process.argv[3]) fs.writeFileSync(process.argv[3], buf);
  const sx = files['xl/worksheets/sheet1.xml'];
  ok(/<c r="A1" s="4" t="inlineStr">/.test(sx) && /<c r="B1" s="17" t="inlineStr"><is><t xml:space="preserve">012345678901</.test(sx) && /<c r="C1" s="3"><v>7962535<\/v>/.test(sx), '5 엑셀: 첫 줄이 머리글이 아니라 자료 (A1 글자 · B1 글자 칸 · C1 숫자)');
  ok(!/<pane /.test(sx) && !/autoFilter/.test(sx), '6 머리글 고정 · 자동 필터 없음');
});
