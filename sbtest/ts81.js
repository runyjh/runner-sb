// S81 기사앱 내 정보 수정: 바꿀 수 있는 항목 6묶음만 · 정산 계좌는 비밀번호 확인 · 서류 사진 교체 · 관리자 작업 기록
//  사용: node sbtest/ts81.js <빌드 결과 폴더 (SB_OUT)>   (실제 저장 시험은 로컬 시험 서버에서 확인함)
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8'), app = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const m = eng.match(/const MY_EDIT = (\{[\s\S]*?\n\});/), E = m ? eval('(' + m[1] + ')') : {};
const keys = [].concat(E.base || [], E.qual || [], E.car || [], E.bank || [], E.biz || []);
ok(Object.keys(E).join() === 'base,qual,car,bank,biz', '1 묶음: 기본 정보 · 자격·면허 · 차량 · 정산 계좌 · 사업자 정보 (+ 서류 사진)');
const NEVER = ['name', 'loginId', 'rrn', 'driverType', 'title', 'status', 'schCampId', 'baseRoute', 'tiOn', 'enr', 'memo', 'subId1', 'subId2', 'driverCode', 'workStatus', 'stlMode', 'fbCut', 'insEx'];
ok(!NEVER.some((k) => keys.indexOf(k) >= 0), '2 이름 · 아이디 · 주민번호 · 단가코드 · 캠프 · 직함 · 상태 · 역발행 등은 못 바꿈');
ok(/if \(MY_EDIT_KEYS\.indexOf\(k\) < 0\) fail_\('바꿀 수 없는 항목입니다: ' \+ k\)/.test(eng), '3 서버가 목록 밖 항목을 거절');
ok(/if \(MY_EDIT\.bank\.some\(function \(k\) \{ return ch\[k\] !== undefined; \}\)\)/.test(eng) && /if \(!checkPassword_\(String\(pw \|\| ''\), me\)\)/.test(eng), '4 정산 계좌를 바꾸면 비밀번호 확인 (실패 반복 시 15분 잠금)');
ok(/const r = updateDriverCore_\(who, me\.id, ch, null\)/.test(eng) && /name: me\.name \+ ' \(기사앱 본인\)'/.test(eng), '5 관리자 수정과 같은 검사·암호화·연동 · 작업 기록에 「기사앱 본인」');
ok(/if \(write && typeof _pv !== 'undefined' && _pv\) fail_\('미리 보기 창에서는 고칠 수 없습니다\.'\)/.test(eng) && /'api_myInfo', 'api_myProfile', 'api_myPerf'/.test(eng) && /'api_bibDocUp', 'api_myProfileSave'\]/.test(eng), '6 미리 보기: 보기만 되고 저장은 막힘');
ok(/logAdmin_\(who, '기사 서류 교체'/.test(eng) && (/if \(!me\.docFolder\) urls\.docFolder = folder\.getUrl\(\)/.test(eng) || (/drvDocPut_\(me, files, docKeys,/.test(eng) && /if \(!o\.docFolder \|\| !fid\) urls\.docFolder = folder\.getUrl\(\)/.test(eng))), '7 서류 사진: 내 서류 폴더에 새로 올림 (예전 사진은 남김)');
ok(/<section id="v-myedit" class="view">/.test(app) && /id="miEdit"/.test(app) && /api\('api_myProfileSave', pmTok\(\), ch, files, pw\)/.test(app), '8 기사앱: 내 정보 → [내 정보 수정] 화면 · 바꾼 것만 보냄');
ok(/'<label class="mdoc" data-mdoc="' \+ k \+ '">/.test(app) && !/class="doc"[^>]*data-mdoc/.test(app), '9 서류 칸은 가입 화면 서류 칸과 따로 (섞이지 않음)');
ok(/if \(MY_SECRET\.indexOf\(k\) >= 0 && !val\) return;/.test(eng), '10 가린 번호(계좌·면허) 칸을 비워 두면 그대로');
