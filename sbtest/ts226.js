// (S226) 기사앱: 홈에 올 때마다 부르는 읽기(배번호 안내 api_bibMine) · 상태 기록(api_appState · api_pushState)이
//  「저장」으로 잡혀, 받아 둔 화면(스케줄 · 품앗이 · 마이페이지)을 2분 동안 못 쓰던 것
//  사용: node sbtest/ts226.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
const gs = fs.readFileSync(path.join(process.argv[2], 'src', 'Code.gs'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const line = (k) => { const a = ix.indexOf('  const ' + k + ' = '); return ix.slice(a, ix.indexOf('\n', a)); };
const L = new Function(line('API_BG') + '\n' + line('SWR_STALE') + '\n' + line('SWR_NOWRITE') + '\nreturn { nw: SWR_NOWRITE, st: SWR_STALE };')();
// api() 의 마지막 갈래 그대로: 읽기 목록에도 「저장 아님」 목록에도 없으면 받아 둔 화면을 버린다
const drops = (fn) => !L.st.includes(fn) && !L.nw.includes(fn);
ok(!drops('api_bibMine'), '1 배번호 안내 읽기는 받아 둔 화면을 버리지 않음');
ok(!drops('api_appState') && !drops('api_pushState'), '2 앱 · 알림 상태 기록도 버리지 않음');
ok(!drops('api_seen') && !drops('api_seenAck'), '3 확인 기록은 예전처럼 버리지 않음');
['api_bibDocUp', 'api_fakeAck', 'api_pmApply', 'api_pmSave', 'api_pmCancelApply', 'api_myProfileSave', 'api_memoSave', 'api_bdSave', 'api_pmAvailSave'].forEach((f) => ok(drops(f), '4 저장은 그대로 버림: ' + f));
ok(/'api_seen', 'api_seenAck',[^\n]*'api_bibMine'/.test(gs), '5 서버도 배번호 안내를 읽기로 봄 (확인 기록과 같은 읽기 목록)');
// 홈으로 올 때 실제로 부르는지 (seenBoot → bibBoot → api_bibMine)
ok(/function seenBoot\(\)[\s\S]{0,400}bibBoot\(\)/.test(ix) && /function bibBoot\(open\)[\s\S]{0,300}api\('api_bibMine'/.test(ix), '6 홈에 올 때마다 배번호 안내를 읽음 (그래서 중요)');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
