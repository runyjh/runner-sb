// (S186) 기사앱 미리 보기: 모든 api_ 함수가 읽기(PVW.READ) · 막음(PVW.WRITE) 중 한 곳에 있어야 함 (빠지면 미리 보기에서 「불러오는 중」에서 멈춤)
//  사용: node sbtest/ts186.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const dir = path.join(process.argv[2], 'src');
const src = fs.readdirSync(dir).filter((f) => f.endsWith('.gs')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const fns = [...new Set([...src.matchAll(/^function (api_[A-Za-z0-9]+)\(/gm)].map((m) => m[1]))];
const pv = fs.readFileSync(path.join(dir, 'Preview.gs'), 'utf8');
const R = (/READ: \[([\s\S]*?)\]/.exec(pv) || [])[1] || '', W = (/WRITE: \[([\s\S]*?)\]/.exec(pv) || [])[1] || '';
const has = (L, f) => L.includes("'" + f + "'");
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const miss = fns.filter((f) => f !== 'api_batch' && !has(R, f) && !has(W, f));
ok(miss.length === 0, '1 빠진 함수 없음 ' + (miss.length ? '(' + miss.join(', ') + ')' : ''));
ok(has(R, 'api_pmQuick') && has(R, 'api_pmOffDay'), '2 일감 주기 배차일자 · 그날 쉬는 기사는 미리 보기에서 읽힘');
ok(['api_pmGive', 'api_pmApplyMany', 'api_pmCancelMany', 'api_pmPick'].every((f) => has(W, f) && !has(R, f)), '3 맡기기 · 신청 · 취소 · 고르기는 미리 보기에서 막힘');
ok(!fns.some((f) => has(R, f) && has(W, f)), '4 두 목록에 같이 있는 함수 없음');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
