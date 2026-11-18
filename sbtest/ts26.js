// S34 쿠팡 어드민 업로드 테이블 = 쿠팡에 올라가는 기준: D-1 마감 W1 오전 10시 · 마감 전 내일부터 · 지나면 모레부터 (TZ=UTC)
//  사용: node sbtest/ts26.js <runner-allinone 폴더>
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
const at = (kst) => KDate.__setClock(() => Date.parse(kst + '+09:00'));
at('2026-11-18T09:00:00');
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_();");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '일산5캠프', rot: 'D1,D2' }]);
const camps = {}; call('adm_routeAll', [tok]).camps.forEach((c) => { camps[c.name] = c.id; });
call('adm_routeSave', [tok, { campId: camps['일산5캠프'], code: '527B' }]);
call('adm_createDriver', [tok, { name: '임동준', loginId: 'id1@df', driverType: '고정', phone: '010-3000-1001', schCampId: camps['일산5캠프'], baseRoute: '527B' }]);
const d = call('adm_listDrivers', [tok]).rows[0];
const days = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];
call('adm_schSave', [tok, days.map((x) => ({ row: d.id, date: x, value: '출근', old: '' }))]);
const dates = (up) => [].concat(...up.weeks).map((r) => r[0]);
// 09시(마감 전) → 19일
ok(ev('schPddGap_()') === 1, '09시 → 내일까지 1일');
let up = call('adm_schUploadTable', [tok, '2026-11-15', '4w']);
ok(up.ok && up.target === '2026-11-19', '09시: 화면 첫 날짜(지난 15일)여도 PDD 19일부터 (' + up.target + ')');
ok(!dates(up).includes('2026-11-18') && dates(up).includes('2026-11-19'), '09시: 18일 줄 없음 · 19일 줄 있음');
// 21:59 → 그대로 19일
at('2026-11-18T09:59:00');
ok(call('adm_schUploadTable', [tok, '2026-11-15', '4w']).target === '2026-11-19', '09:59 → 19일');
ok(ev("schPddGap_(new Date(), 'WAVE2')") === 1, 'W2 는 09:59 → 1일');
// 22시 → 20일
at('2026-11-18T10:00:00');
ok(ev('schPddGap_()') === 2, '10시(W1 마감) → 2일');
up = call('adm_schUploadTable', [tok, '2026-11-15', '4w']);
ok(up.target === '2026-11-20' && !dates(up).includes('2026-11-19') && dates(up).includes('2026-11-20'), '10시: 20일부터 · 19일 줄 없음');
ok(call('adm_schUploadTable', [tok, '', 'tomorrow']).target === '2026-11-20', '10시: 다른 보기(tomorrow)도 20일');
// 화면 첫 날짜가 PDD 보다 뒤면 그 날짜부터
ok(call('adm_schUploadTable', [tok, '2026-11-22', '4w']).target === '2026-11-22', '첫 날짜가 PDD 뒤(22일) → 22일부터');
at('2026-11-18T14:59:00'); ok(ev("schPddGap_(new Date(), 'WAVE2')") === 1, 'W2 14:59 → 1일');
at('2026-11-18T15:00:00'); ok(ev("schPddGap_(new Date(), 'WAVE2')") === 2, 'W2 15시(마감) → 2일');
// 다음 날 이른 아침 (19일 08:00) → 20일 (19일 10시 전이라 20일 아직 가능)
at('2026-11-19T08:00:00');
ok(call('adm_schUploadTable', [tok, '', '4w']).target === '2026-11-20', '19일 08:00 → 20일');
at('2026-11-19T11:00:00');
ok(call('adm_schUploadTable', [tok, '', '4w']).target === '2026-11-21', '19일 11:00 → 21일');
// 표 복사 = 쿠팡 업로드 양식 (머리글 + 10열) — 화면 코드(upCpRows)를 꺼내 같은 줄로 돌려 봄
const fs = require('fs');
const html = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const fnSrc = html.slice(html.indexOf('function upCpRows('), html.indexOf('function upXlsxNow('));
const sample = [['2026-11-20', '654-37-01141', '일산5캠프', 'WAVE1', 'lyomvke', '출근', 'D1,D2,F3', '408A', '표시: 408A(D2,F3)', '', '용민경'],
  ['2026-11-20', '654-37-01141', '인천8', 'WAVE1', 'leey510', '출근', 'D1,D2,F3', '122D', '', '', '이용(김대현)'],
  ['2026-11-20', '', '일산5', 'WAVE1', '미입차', '', 'D1', '408A', '', '', '']];
const upCpRows = new Function('upRows', 'upRes', fnSrc + '; return upCpRows;')(() => sample, { cpVendor: '러너/RUNNER', cpBizNo: '6543701141' });
const cp = upCpRows('w1', true).rows;
ok(cp.length === 2, '복사: 미입차 묶음 줄은 빠짐 (' + cp.length + '줄)');
ok(cp[0].join('\t') === '2026-11-20\t러너/RUNNER\t6543701141\t일산5\tWAVE1\t용민경\tlyomvke\t출근\tD1,D2,F3\t408A', '복사: 쿠팡 양식 10열 그대로 (캠프 글자 빼고 · 비고 없음)');
ok(cp[1][5] === '이용', '복사: 이름은 아이디 주인 (괄호 뺌)');
ok(/\(wk\?\[CP_HEAD\.concat\(\['비고'\]\)\]:\[\]\)\.concat\(rows\)/.test(html.slice(html.indexOf("$('#upCopy')"), html.indexOf('function upCopyFallback')).replace(/\s/g, '')), '복사: 주차 탭은 머리글(업무일 벤더명 … 비고) 포함');
const cpy = html.slice(html.indexOf("$('#upCopy')"), html.indexOf('function upCopyFallback'));
ok(/cp\.src\[i\]\[8\]/.test(cpy), '복사: 업무라우트 옆 칸 = 비고 (표시: 408A(D2,F3))');
ok(upCpRows('w1', true).src[0][8] === '표시: 408A(D2,F3)', '복사: 용민경 줄 비고 = 표시: 408A(D2,F3)');
