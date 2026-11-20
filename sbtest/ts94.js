// S94 입금확인: 우리은행 「자주쓰는 입금계좌」 일괄등록 파일 (입금계좌명 · 입금은행 · 입금계좌번호 · 받는분 · 이메일 · 휴대폰번호) (TZ=UTC)
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const a0 = ad.indexOf('  const PAY_BANKS = '), a1 = ad.indexOf("  $('#paySel').addEventListener('click'", a0);
const z0 = ad.indexOf('  const ZIPW = (function () {'), z1 = ad.indexOf('  })();', z0) + 7;
const mod = new Function(ad.slice(a0, a1) + '\n' + ad.slice(z0, z1) + '\nreturn { payBankName, payFavRows, ZIPW };')();
const B = mod.payBankName;
ok([['KB국민은행', '국민은행'], ['국민은행', '국민은행'], ['토스', '토스뱅크'], ['농협', '농협은행'], ['농협은행', '농협은행'], ['지역농축협', '지역농축협'], ['신한', '신한은행'], ['우리', '우리은행'], ['하나', '하나은행'], ['카카오뱅크', '카카오뱅크'], ['케이뱅크', '케이뱅크'], ['새마을금고', '새마을금고'], ['신협', '신협'], ['기업은행', '기업은행']].every((x) => B(x[0]) === x[1]), '1 은행 이름 맞추기 (실제 기사 정보에 적힌 17가지 표기)');
const L = [{ name: '가', bank: 'KB국민은행', account: '0123-45-678901', holder: '가' }, { name: '나(다)', bank: '토스', account: '1000-1234-5678', holder: '다' }, { name: '라', bank: '우리', account: '', holder: '라' }, { name: '마', bank: '국민', account: '012345678901', holder: '마' }, { name: '바', bank: '별난은행', account: '111-22', holder: '' }];
const f = mod.payFavRows(L);
ok(f.rows[0].join('|') === '입금계좌명|입금은행|입금계좌번호|받는분|이메일|휴대폰번호', '2 머리글 = 은행 양식 그대로');
ok(f.rows.length === 4 && f.skip === 2, '3 계좌 없는 사람 · 같은 계좌(하이픈만 다름)는 뺌 (' + (f.rows.length - 1) + '명 · 뺌 ' + f.skip + ')');
ok(f.rows[1][0] === '가' && f.rows[1][1] === '국민은행' && f.rows[1][2].v === '0123-45-678901' && f.rows[1][2].txt && f.rows[2][3] === '다' && f.rows[3][3] === '바', '4 계좌번호는 글자 칸(앞 0 유지) · 받는분 = 예금주 (없으면 이름)');
ok(f.check.join() === '바', '5 모르는 은행 이름은 확인하라고 알려 줌');
ok(/id="paySelFav"/.test(ad) && /우리은행_자주쓰는계좌_/.test(ad), '6 입금확인 선택 줄에 「자주쓰는 계좌 파일」 단추');
mod.ZIPW.xlsx([{ name: 'Sheet1', rows: f.rows, filter: false }]).arrayBuffer().then((ab) => {
  const buf = Buffer.from(ab), files = {}; let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) { const nl = buf.readUInt16LE(o + 26), sz = buf.readUInt32LE(o + 18), nm = buf.slice(o + 30, o + 30 + nl).toString(); files[nm] = buf.slice(o + 30 + nl, o + 30 + nl + sz).toString(); o += 30 + nl + sz; }
  if (process.argv[3]) fs.writeFileSync(process.argv[3], buf);
  const sx = files['xl/worksheets/sheet1.xml'];
  ok(/<c r="C2" s="17" t="inlineStr"><is><t xml:space="preserve">0123-45-678901<\/t>/.test(sx) && !/autoFilter/.test(sx), '7 엑셀: C2 글자 칸 · 자동 필터 없음');
});
