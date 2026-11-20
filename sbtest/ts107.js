// S107 ① 홈 「지금 처리할 것」 미입차 줄에 실제 이유 (담당 미입차 · 담당 휴무 · 담당 없음 몇 일부터) · 이미 확정한 미입차는 할 일에서 빼고 회색 「확정」 줄로
//      ② 기사앱 미리 보기: 그 기사 휴대폰에서 먼저 뜨는 「알림 켜기」 창을 미리 보기에서도 띄움 (누르면 닫힘 · 기기 등록 · 상태 기록 안 함)
//  사용: node sbtest/ts107.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const ad = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8'), ix = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');

// ── ① 이유 붙이기 (실제 코드 조각을 그대로 돌림)
const a0 = ad.indexOf('      // (S107) 앞으로(PDD~) 미입차 줄에도'), a1 = ad.indexOf('    })();', a0);
ok(a0 > 0 && a1 > a0, '0 S107 미입차 이유 코드 찾음');
const block = ad.slice(a0, a1);
const routeExpand = (c) => { let n = ''; return String(c || '').split(',').flatMap((t) => { t = t.trim(); const m = t.match(/^(\d+)([A-Za-z]+)$/); if (m) { n = m[1]; return m[2].toUpperCase().split('').map((ch) => n + ch); } return []; }); };
const dates = []; for (let d = 1; d <= 30; d++) dates.push('2026-11-' + String(d).padStart(2, '0'));
const I = 20; // 11/21
function runCase(mi, cause, rm, past) {
  const K = { mi: mi };
  const byUnit = new Map(); (past || []).forEach(([k, days]) => { const c = {}; days.forEach((i) => { c[i] = {}; }); byUnit.set(k, { cells: c }); });
  const RM = new Map(Object.entries(rm || {}));
  new Function('K', 'dates', 'SchedCalc', 'causeOf', 'RM', 'byUnit', block)(K, dates, { routeExpand }, cause, RM, byUnit);
  return K.mi;
}
// A 담당 기사가 미입차 · 이슈 등록됨 → 확정 (할 일 아님)
let r = runCase([{ i: I, t: '군포1 212AB' }], () => ({ kind: 'iss', rec: true, why: '전광성 미입차', row: 'D1', cause: '🚩 전광성 미입차 · 질병 (독감을 호소) · 대체 없음' }));
ok(r[0].done === true && /^전광성 미입차 · 질병/.test(r[0].s) && r[0].row === 'D1', '1 담당이 미입차로 이슈 등록 → 확정 · 「전광성 미입차 · 질병…」 (' + r[0].s + ')');
// B 칸만 미입차 · 이슈 없음 → 할 일 · 「이슈 등록 안 됨」
r = runCase([{ i: I, t: '군포1 212AB' }], () => ({ kind: 'iss', rec: false, why: '전광성 미입차', row: 'D1', cause: '🚩 전광성 미입차 · 이슈 기록 없음' }));
ok(r[0].done === false && /이슈 등록 안 됨/.test(r[0].s) && r[0].btn === '대체', '2 칸만 미입차(이슈 없음) → 할 일 · 대체 버튼 (' + r[0].s + ')');
// C 담당 없음 · 11/1부터 계속 빔 → 할 일 · 배정
const past = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
r = runCase([{ i: I, t: '시흥2 708CD' }], () => ({ kind: 'un', un: true, why: '담당 없음', row: '', cause: '담당 기사가 없는 노선' }), {}, [['시흥2|708C', past], ['시흥2|708D', past]]);
ok(r[0].done === false && r[0].s === '담당 기사 없음 · 11/1부터 계속 빔' && r[0].btn === '배정', '3 담당 없음 → 「담당 기사 없음 · 11/1부터 계속 빔」 · 배정 (' + r[0].s + ')');
// D 담당 없음 · 오늘 처음 빔
r = runCase([{ i: I, t: '시흥2 708CD' }], () => ({ kind: 'un', un: true, row: '' }), {}, [['시흥2|708C', [5, 6]]]);
ok(/배정된 기사·용차 없음/.test(r[0].s), '4 어제는 안 비었던 담당 없음 노선 → 「배정된 기사·용차 없음」 (' + r[0].s + ')');
// E 담당 없음인데 오늘 노선 미입차 확정함 → 확정
r = runCase([{ i: I, t: '시흥2 708CD' }], () => ({ kind: 'un', un: true, row: '' }), { '2026-11-21|시흥2|708C': { result: '미입차', reason: '대체 인원 못 구함' }, '2026-11-21|시흥2|708D': { result: '미입차', reason: '대체 인원 못 구함' } }, [['시흥2|708C', past], ['시흥2|708D', past]]);
ok(r[0].done === true && /^미입차 확정 · 대체 인원 못 구함/.test(r[0].s), '5 노선 미입차 확정 → 확정 줄 (' + r[0].s + ')');
// F 한 글자만 확정 → 아직 할 일
r = runCase([{ i: I, t: '시흥2 708CD' }], () => ({ kind: 'un', un: true, row: '' }), { '2026-11-21|시흥2|708C': { result: '미입차' } });
ok(r[0].done === false, '6 708C 만 확정 · 708D 남음 → 아직 할 일');
// G 담당이 휴무 · 대체 없음
r = runCase([{ i: I, t: '군포1 212AB' }], () => ({ kind: 'own', why: '배정 없음', row: 'D1', drv: 'D1', cause: '담당 전광성 휴무' }));
ok(r[0].done === false && r[0].s === '담당 전광성 휴무 · 대체 없음' && r[0].btn === '대체', '7 담당 휴무 → 「담당 전광성 휴무 · 대체 없음」 · 대체 (' + r[0].s + ')');
// H 일부 회전만 빔 → 확정 기록이 있어도 할 일
r = runCase([{ i: I, t: '군포1 212AB(F3)' }], () => ({ kind: 'un', un: true, row: '' }), { '2026-11-21|군포1|212A': { result: '미입차' }, '2026-11-21|군포1|212B': { result: '미입차' } });
ok(r[0].done === false, '8 일부 회전만 빈 줄은 확정으로 보지 않음');

// ── 화면: 휴대폰 홈 · PC 오늘 카드
ok(/todo = miTodo\.length \+ chk\.length/.test(ad), '9 휴대폰 홈: 「지금 처리할 것」 숫자 = 확정 안 된 미입차 + 확인 필요');
ok(/tile\('r', T\.mi\.length, '미입차 노선'\)/.test(ad), '10 「미입차 노선」 칸 숫자는 그대로 (실제로 비는 노선 수)');
ok(/miTodo\.map\(\(x\) => row\(x, x\.s \|\|/.test(ad) && /x\.btn \|\| '배정'/.test(ad), '11 줄마다 실제 이유 · 버튼(배정/대체)');
ok(/td-dn-h">미입차 확정 ' \+ miDone\.length/.test(ad) && /td-row dn/.test(ad), '12 확정한 것은 회색 「미입차 확정 · 처리 끝」 아래로 (버튼 없음)');
ok(/class="tc' \+ \(x\.done \? ' dn' : ''\)/.test(ad), '13 PC 오늘 카드 칩도 이유 표시 · 확정은 흐리게');
ok(/rec: A\.every\(\(a\) => !!a\.is\)/.test(ad), '14 담당 미입차 이유에 이슈 등록 여부(rec)');

// ── ② 미리 보기 알림 창
ok(/function pushSay\(st\) \{ if \(PVT \|\| PG\.sent\[st\]\) return;/.test(ix), '15 미리 보기는 알림 상태를 서버에 기록하지 않음');
ok(/if \(PVT\) \{ pushGateOff\(\); toast\('미리 보기라 알림은 켜지 않았습니다/.test(ix), '16 미리 보기에서 [알림 켜기] 누르면 닫힘 (허용 창 · 기기 등록 없음)');
const pb = ix.slice(ix.indexOf('  function pvBar(p) {'), ix.indexOf('  // 닫기: 창을 닫아 보고'));
ok(/!PVS\.gate && !p\.mc && p\.push != null/.test(pb) && /pushGate\(st\)/.test(pb), '17 알림 못 받는 기사 미리 보기 → 실제처럼 「알림 켜기」 창 (비밀번호 변경 화면일 때는 안 띄움)');
ok(/닫기 \(미리 보기\)/.test(pb), '18 버튼 없는 창(아이폰 설치 안내)도 미리 보기에서는 닫을 수 있음');
ok(/if \(PVT\) return; \/\/ 미리 보기 창은 알림을 등록하지 않는다/.test(ix), '19 미리 보기 자동 알림 등록은 그대로 막힘');
