// S79 기사앱 알림 안내 창 [켰어요, 다시 확인]: 누르면 '확인 중…' → 아직 꺼져 있으면 창 안에 빨간 안내 (아래쪽 알림 글은 창에 가려 안 보였음)
//  + 안내에 브라우저 사이트 알림 허용 단계 · 아래쪽 알림 글(.toast)을 창(.gate 90)보다 위로
//  사용: node sbtest/ts79.js <빌드 결과 폴더 (SB_OUT)>   (실제 누르기 시험은 로컬 시험 서버에서 확인함)
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const h = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
ok(/<div class="pg-err hidden" id="pushPopErr" role="alert"><\/div>/.test(h), '1 창 안 안내 줄');
ok(/b\.disabled = true; b\.textContent = '확인 중…'; pgErr\(''\);/.test(h) && /return pgErr\('아직 알림이 꺼져 있습니다 \('/.test(h) && !/return toast\('아직 알림이 꺼져 있습니다/.test(h), '2 누르면 확인 중 → 꺼져 있으면 창 안에 안내');
ok(/4\. 그래도 안 되면 브라우저에서도 켜기\\n  · 삼성인터넷: 설정 → 사이트 및 다운로드 → 알림\\n  · 크롬: 설정 → 사이트 설정 → 알림/.test(h), '3 브라우저 사이트 알림 단계');
const tz = (h.match(/\.toast \{[^}]*z-index: (\d+)/) || [])[1], gz = (h.match(/\.ihelp\.gate \{[^}]*z-index: (\d+)/) || [])[1];
ok(+tz > +gz, '4 아래쪽 알림 글이 안내 창 위 (' + tz + ' > ' + gz + ')');
ok(/PG\.st = st; pushSay\(st\); pgErr\(''\);/.test(h) && /function pushGateOff\(\) \{ PG\.st = ''; pgErr\(''\);/.test(h), '5 창을 다시 띄우거나 닫으면 안내 줄 지움');
