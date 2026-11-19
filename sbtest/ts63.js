// S63 기사앱: 이 기기에서 본 공지인데 서버 확인 기록이 빠진 것을 다시 보냄 (공지를 받을 때마다 · 앱을 가릴 때 바로 보내기)
//  사용: node sbtest/ts63.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
const body = idx.match(/function seenSync\(\) \{[\s\S]*?\n  \}/)[0];
function mk(ls, list, q) {
  const store = { get: (k) => (k in ls ? ls[k] : null), set: (k, v) => { ls[k] = v; } };
  const ntGet = (k) => { try { return JSON.parse(ls[k] || '[]'); } catch (e) { return []; } };
  const SEEN = { q: q || [], t: 0 }; let flushed = 0;
  const env = { store, ntGet, SEEN, TOKEN: 'tok', NT_SEEN: 'runner.ntSeen', NT_POP: 'runner.ntPop', ntList: list, ntKey: (n) => n.id + '|' + (n.updatedAt || ''), seenDoneKey: () => 'runner.seenDone.D1', seenFlush: () => { flushed++; }, setTimeout: (f) => { f(); return 1; }, clearTimeout: () => {} };
  new Function(...Object.keys(env), body + '\n seenSync();')(...Object.values(env));
  return { q: SEEN.q, flushed, ls };
}
const N = [{ id: 'N1', updatedAt: 'a' }, { id: 'N2', updatedAt: 'b' }, { id: 'N3', updatedAt: 'c' }];
let r = mk({ tok: 't', 'runner.ntPop': JSON.stringify(['N1|a']), 'runner.ntSeen': JSON.stringify(['N2|b']), 'runner.seenDone.D1': JSON.stringify(['notice:N1']) }, N);
ok(r.q.map((x) => x.key).join() === 'N1,N2' && r.flushed === 1 && r.ls['runner.seenSync2.D1'] === '1', '1 처음 한 번: 이 기기에서 본 공지(팝업 확인 · 목록에서 연 것)를 「보냄」 표시와 관계없이 모두 다시 보냄 · 안 본 공지(N3)는 안 보냄');
r = mk({ tok: 't', 'runner.ntPop': JSON.stringify(['N1|a']), 'runner.ntSeen': JSON.stringify(['N2|b']), 'runner.seenDone.D1': JSON.stringify(['notice:N1']), 'runner.seenSync2.D1': '1' }, N);
ok(r.q.map((x) => x.key).join() === 'N2' && r.flushed === 1, '2 그 뒤로는 「보냄」 표시가 없는 것만 (앱을 바로 닫아 빠졌던 것)');
r = mk({ tok: 't', 'runner.ntPop': JSON.stringify(['N1|a']), 'runner.seenDone.D1': JSON.stringify(['notice:N1']), 'runner.seenSync2.D1': '1' }, N);
ok(r.q.length === 0 && r.flushed === 0, '3 다 보냈으면 아무것도 안 보냄 (서버 요청 없음)');
r = mk({ tok: 't', 'runner.ntPop': JSON.stringify(['N1|old']) }, N);
ok(r.q.length === 0, '4 공지가 고쳐져 다시 봐야 하는 것은 본 것으로 치지 않음');
r = mk({ tok: 't', 'runner.ntSeen': JSON.stringify(['N2|b']) }, N, [{ k: 'notice', key: 'N2' }]);
ok(r.q.length === 1, '5 이미 보내려고 줄 선 것은 두 번 넣지 않음');
ok(/ntList = r\.notices \|\| \[\]; renderNtCard\(\); try \{ seenSync\(\); \}/.test(idx), '6 공지를 받을 때마다 맞춰 봄');
ok(/visibilityState === 'hidden' && SEEN\.q\.length\) \{ clearTimeout\(SEEN\.t\); seenFlush\(\); \}/.test(idx), '7 앱을 닫거나 가릴 때 안 보낸 확인 기록을 바로 보냄');
