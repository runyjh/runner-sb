// S99 통장 이름을 바꾸면 그 통장을 가리키던 곳(배분 설정 · 통장 흐름 · 지출 · 올린 통장 내역)도 같이 바뀜 + 2026-11-20 에 바꾼 「러너 쿠팡정산 인건비」 한 번 고치기 (TZ=UTC)
const fs = require('fs'), path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const S = sbMakeStore(); S.DateCls = KDate; const G = sbMakeGas(S, { Date: KDate });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const ev = (src) => fresh().__sbEval(src);
KDate.__setClock(() => Date.parse('2026-11-20T21:30:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); 1");
const tok = fresh().__sbLogin('boss', true).token;
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
// 이름만 바꾼 뒤의 상태 (실제로 생긴 일): 통장 목록은 새 이름 · 다른 표는 예전 이름
ev("stlWriteAll_('stl_bank', [{ name: '러너 쿠팡정산', role: '쿠팡 입금', bankName: '카카오뱅크', account: '3333-01-6179' }, { name: '러너 운영비', role: '운영비', bankName: '카카오뱅크', account: '3333-02-2066' }]);" +
  "stlAppend_('stl_alloc', [{ label: '시험 항목', bank: '러너 쿠팡정산 인건비', rule: '', desc: '' }]);" +
  "stlAppend_('stl_expense', [{ month: '2026-10', date: '2026-10-05', cat: '기타', name: '가', amt: '1000', bank: '러너 쿠팡정산 인건비' }, { month: '2026-10', date: '2026-10-06', cat: '기타', name: '나', amt: '2000', bank: '러너 운영비' }, { month: '2026-10', date: '2026-10-07', cat: '기타', name: '다', amt: '3000', bank: '유정훈 개인계좌' }]);" +
  "stlAppend_('stl_banktx', [{ date: '2026-10-01', kind: '이체', from: '러너 쿠팡정산 인건비', to: '러너 운영비', amt: '500', memo: 'x', month: '2026-10' }]);" +
  "stlAppend_('stl_bankrows', [{ month: '2026-10', key: 'k1', bank: '카카오뱅크', acct4: '6179', bankName: '러너 쿠팡정산 인건비', date: '2026-10-16', io: '출금', amt: '100' }, { month: '2026-10', key: 'k2', bank: '카카오뱅크', acct4: '2066', bankName: '러너 운영비', date: '2026-10-16', io: '입금', amt: '100' }]); 1");
const refs = () => JSON.parse(ev("JSON.stringify({ alloc: stlRead_('stl_alloc').filter(function (r) { return r.label === '시험 항목'; }).map(function (r) { return r.bank; }), exp: stlRead_('stl_expense').map(function (r) { return r.bank; }), tx: stlRead_('stl_banktx').map(function (r) { return r.from + '>' + r.to; }), rows: stlRead_('stl_bankrows').map(function (r) { return r.bankName; }) })"));
const n = ev('bankRenameFixS99_()'); let R = refs();
ok(n === 4 && /^2026-11-20/.test(S.props.BANK_RENAME_S99 || ''), '1 한 번 고치기: 예전 이름 줄 4곳 (' + n + ') · 표시 남김');
ok(R.alloc.join() === '러너 쿠팡정산' && R.exp.join() === '러너 쿠팡정산,러너 운영비,유정훈 개인계좌' && R.tx.join() === '러너 쿠팡정산>러너 운영비' && R.rows.join() === '러너 쿠팡정산,러너 운영비', '2 배분 설정 · 지출 · 통장 흐름 · 통장 내역이 새 이름으로 (다른 통장 · 자유 글은 그대로)');
ok(ev('bankRenameFixS99_()') === 0, '3 한 번만');
// 통장 설정에서 이름을 바꾸면 같이 따라감 (계좌번호가 같은 줄)
const ren = (o, nw) => JSON.stringify(JSON.parse(ev('JSON.stringify(stlBankRenames_(' + JSON.stringify(o) + ', ' + JSON.stringify(nw) + '))')));
const A = { name: '가', account: '1-1' }, B = { name: '나', account: '2-2' };
ok(ren([A, B], [{ name: '가2', account: '11' }, B]) === '{"가":"가2"}', '4 계좌번호가 같고 이름만 달라짐 → 바꾼 것으로 봄');
ok(ren([A, B], [B]) === '{}' && ren([A, B], [A, B, { name: '다', account: '3' }]) === '{}', '5 지우기 · 새로 넣기는 이름 바꾸기가 아님');
ok(ren([{ name: '가', account: '' }, B], [{ name: '가2', account: '' }, B]) === '{"가":"가2"}' && ren([A, B], [{ name: '가2', account: '9' }, { name: '나2', account: '8' }]) === '{}', '6 계좌번호가 없으면 하나만 바뀌었을 때만 · 여러 개가 한꺼번에 달라지면 건드리지 않음');
const sv = call('adm_stlTableSave', [tok, 'banks', '', [{ name: '러너 주거래', role: '쿠팡 입금', bankName: '우리은행', account: '3333-01-6179' }, { name: '러너 운영비', role: '운영비', bankName: '카카오뱅크', account: '3333-02-2066' }]]);
R = refs();
ok(sv.ok && R.alloc.join() === '러너 주거래' && R.exp[0] === '러너 주거래' && R.tx.join() === '러너 주거래>러너 운영비' && R.rows[0] === '러너 주거래', '7 통장 설정에서 이름을 바꿔 저장 → 가리키던 곳이 모두 새 이름 ' + (sv.msg || ''));
const st = fs.readFileSync(path.join(SRC, 'Settle.gs'), 'utf8');
ok((st.match(/try \{ bankRenameFixS99_\(\); \}/g) || []).length === 2, '8 매입매출 · 통장 화면을 열 때 한 번 고치기');
