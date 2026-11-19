// S66 허위배송 문구: 「선 배송완료 검수된 결과입니다.」 (기사 알림 · 기사앱)
//  사용: node sbtest/ts66.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const fk = fs.readFileSync(path.join(SRC, 'FakeDel.gs'), 'utf8'), idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
ok(!/실제로 놓고 사진을 찍은 뒤 눌러 주세요/.test(fk + idx), '1 예전 문구 없음');
ok((fk.match(/선 배송완료 검수된 결과입니다\./g) || []).length === 1 && /허위 배송완료 ' \+ o\.grade \+ '등급'[^\n]*선 배송완료 검수된 결과입니다\./.test(fk), '2 3~4등급 알림에만 (의심 건 알림에는 안 넣음)');
ok(/로 의심되었습니다\. \(마이페이지 › 허위 배송완료에서 사진 확인\)/.test(fk), '2-1 의심 건 알림: 「…의심되었습니다. (마이페이지 › 허위 배송완료에서 사진 확인)」');
ok(/<div class="grnote">선 배송완료 검수된 결과입니다\. 처리율 =/.test(idx), '3 기사앱 안내 줄');
