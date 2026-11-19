// S58 업무스케줄 댓글: 서버 함수 · 시트 · 화면 코드 확인 (+ 실제 화면 시험은 sbtest 밖 로컬 시험 서버로 확인함)
//  사용: node sbtest/ts58.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8'), adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8');
ok(/MCMT: 'work_memo_comments'/.test(eng) && /'work_memo', 'work_memo_comments',/.test(eng), '1 댓글 시트 work_memo_comments (없으면 자동으로 만듦)');
ok(/function adm_memoCmtAdd\(token, memoId, content\)/.test(eng) && /function adm_memoCmtDel\(token, cmtId\)/.test(eng), '2 서버 함수 달기 · 지우기');
ok(/if \(str_\(o\.authorId\) !== who\.key\) fail_\('내가 쓴 댓글만 지울 수 있습니다\.'\)/.test(eng), '3 지우기는 쓴 사람만');
ok(/memoCmtDropFor_\(String\(id \|\| ''\)\.split\('@'\)\[0\]\)/.test(eng), '4 메모를 지우면 댓글도 (반복 메모는 모든 날짜)');
ok(/m\.cmts = cm\[m\.id\] \|\| \[\]/.test(eng) && /r\.meKey = memoCmtKey_\(a, ''\)/.test(eng), '5 한 달 메모에 댓글 · 내 구분 함께');
ok(/if \(content\.length > MCMT_MAX\)/.test(eng) && /const MCMT_MAX = 500;/.test(eng), '6 댓글 500자 제한');
ok(/api\('adm_memoCmtAdd', m\.id, txt\)/.test(adm) && /api\('adm_memoCmtDel', cid\)/.test(adm), '7 관리자앱 화면이 서버 함수를 부름');
ok(/c\.by && c\.by === memoMe \? '<button type="button" data-act="cdel"/.test(adm), '8 화면: 내 댓글에만 [지우기]');
ok(/if \(!m\.cmts\) \{ const old = memos\.find/.test(adm), '9 메모 수정·완료 뒤에도 댓글이 화면에서 안 사라짐');
// 서버 코드 실제로 돌려 보기: 댓글 맵 정렬
const fn = eng.match(/function memoCmtMap_\(\) \{[\s\S]*?\n\}/)[0];
const SH = { MCMT: 'x' }, readAll_ = () => [{ id: 'C2', memoId: 'M1', author: 'b', authorId: 'A:b', content: '둘', createdAt: '2026-11-19 10:01:00' }, { id: 'C1', memoId: 'M1', author: 'a', authorId: 'A:a', content: '하나', createdAt: '2026-11-19 10:00:00' }, { id: 'C3', memoId: 'M2@2026-11-20', author: 'a', authorId: 'D:7', content: '반복 그날', createdAt: '2026-11-19 11:00:00' }, { id: 'C4', memoId: 'M3', author: 'a', authorId: 'A:a', content: '', createdAt: '' }];
const map = eval('(' + fn.replace('function memoCmtMap_()', 'function ()') + ')')();
ok(map.M1.map((c) => c.content).join(',') === '하나,둘' && map['M2@2026-11-20'].length === 1 && !map.M3, '10 댓글 오래된 순 · 반복 메모는 그 날짜 · 빈 줄 무시 ' + JSON.stringify(Object.keys(map)));
