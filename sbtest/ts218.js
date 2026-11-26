// S218 관리자앱 처음 여는 로그인 창 문구: 「수파베이스 시험판 · 시험판 로그인」 → 「러너 올인원 관리자 프로그램 최초 로그인」 (잠금 기능은 그대로)
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const boot = fs.readFileSync(path.join(OUT, 'admin', 'boot.js'), 'utf8'), adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8');
const fn = boot.slice(boot.indexOf('function showLogin'), boot.indexOf('function logout'));
ok(/<h2>러너 올인원 관리자 프로그램 최초 로그인<\/h2>/.test(fn) && !/시험판/.test(fn), '1 로그인 창 제목 바뀜 · 「시험판」 없음');
ok(/authCall\('password'/.test(fn) && /id="sbEm"/.test(fn) && /id="sbPw"/.test(fn), '2 로그인 기능(이메일 · 비밀번호 · 수파베이스 확인)은 그대로');
const h = require('crypto').createHash('sha256').update(boot).digest('hex');
ok(adm.includes('boot.js?v='), '3 관리자 화면이 새 boot.js 를 받음 (버전 꼬리표)');
