// S88 관리자앱(PC) 기사 서류 올리기 · 바꾸기 (정적 검사 · 브라우저 시험은 ts88-browser.js: 로컬 시험 서버에서 9항목)
//  사용: node sbtest/ts88.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8'), adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8');
ok(/function adm_driverDocUp\(token, id, files\)/.test(eng) && /const a = requireAdmin_\(token\);\n    const o0 = driverById_/.test(eng), '1 서버: 관리자만 · 기사 확인');
ok(/image\\\/jpeg\|image\\\/png\|application\\\/pdf/.test(eng) && /DOC_UP_MAX = 10 \* 1024 \* 1024/.test(eng), '2 jpg · png · pdf 만 · 크기 한도');
ok(/function drvDocPut_\(o, files, keys, noFolderMsg\)/.test(eng) && (eng.match(/drvDocPut_\(/g) || []).length === 3, '3 기사앱 내 정보 수정과 같은 저장 (그 기사 서류 폴더 · 예전 파일 남김)');
ok(/logAdmin_\(a, '기사 서류 올리기'/.test(eng) && /\(바꿈\)/.test(eng), '4 작업 기록 (바꾼 것 표시)');
ok(/data-docup="' \+ k \+ '">' \+ \(d\.docs\[k\] \? '바꾸기' : '올리기'\)/.test(adm) && /id="docDrop"/.test(adm), '5 화면: 칸마다 올리기/바꾸기 · 여러 장 칸');
ok(/기존 ' \+ DOCS\[kind\] \+ '을\(를\) 새 파일로 바꿉니다/.test(adm) && /기존 ' \+ rep\.join\(', '\) \+ '을\(를\) 새 파일로 바꿉니다/.test(adm), '6 바꿀 때 확인 창 (칸 하나 · 여러 장)');
ok(!/서류 폴더 열기 \(드라이브\)/.test(adm) && !/id="docDrive"/.test(adm) && /id="docDl" download/.test(adm), '7 드라이브 링크 없앰 · 보기 창 [내려받기]');
ok(/html\.m \[data-docup\], html\.m #docDrop \{ display: none !important; \}/.test(adm), '8 휴대폰은 보기만');
