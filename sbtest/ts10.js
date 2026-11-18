// S16 기사스케줄 칸 글자 규칙 (관리자 화면 cellRuleFix) — 정해진 말 · [캠프] 노선(회전)만
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src', 'Admin.html');
const h = fs.readFileSync(SRC, 'utf8');
const pick = (a, b) => h.slice(h.indexOf(a), h.indexOf(b));
const code = pick("  const SOPTS = [", "  const CELL_RULE_MSG");
const SD = { camps: ['강서1캠프', '군포1캠프', '서초1캠프', '일산5캠프', '안양1캠프', '인천7캠프', '인천8캠프', '시흥1캠프', '시흥2캠프', 'F_삼성1캠프'].map((name) => ({ name })) };
const shortCamp = (n) => String(n || '').replace(/\s*캠프\s*$/, '').trim();
const fix = new Function('SD', 'shortCamp', code + '\nreturn cellRuleFix;')(SD, shortCamp);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
// 1. 지금 실제 칸에 있는 글자 (2026-11-18 운영 자료) 는 모두 통과
const real = ['103AB', '110CD (D1,D2)', '116C,723D (dasom1125) 업무등록', '119AB', '204ABC [라우트,입차지 변경]', '204D,205AB', '205C (D2,F3)', '205C(D1),205D', '212AB (dmsdud3810) 업무등록', '405CD (D1)', '408A (D2,F3)', '408A(D1),408B', '527B (D1,D2) [B01]', '527B (F3) [B02]', '530A,530B(D1,D2)', '530AB (F3)', '강서1 527B (F3) [B02]', '고정휴무', '군포1 212AB (dmsdud3810) 업무등록', '미입차', '병가', '서초1 405C (D2)', '안양1 724ABCD (D1,D2)', '인천7 919CD (kbk2623) 업무등록', '일산5 408A (D1)', '추가휴무', '출근', '휴무', 'F_삼성1 204ABC', '(eeiei7llss) 업무등록'];
const bad1 = real.filter((v) => !fix(v).ok);
ok(!bad1.length, '1 실제 칸 글자 ' + real.length + '개 통과' + (bad1.length ? ' — 막힘: ' + bad1.join(' | ') : ''));
// 2. 사용자가 든 예 · 소문자는 대문자로
ok(fix('캠프1 232CD').ok === false && fix('군포1 123C(D1,D2)').v === '군포1 123C(D1,D2)' && fix('강서1 232cd').v === '강서1 232CD', '2 예시: 군포1 123C(D1,D2) 통과 · 강서1 232cd → ' + fix('강서1 232cd').v + ' · 없는 캠프(캠프1) 막힘');
// 3. 그 밖의 글은 막힘
const no = ['간담회', '출근 간담회', '오전만', '232CD 늦게', '232CD (D4)', '232', 'abc', '강서 232CD', '232CD,', '휴무?'];
const pass = no.filter((v) => fix(v).ok);
ok(!pass.length, '3 규칙 밖 글 막힘 ' + no.length + '개' + (pass.length ? ' — 통과해 버림: ' + pass.join(' | ') : ''));
