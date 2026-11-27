// (S233) 기사앱: 「품앗이 확인」 화면에서 앱이 다시 열리면 예전 목록 모양([맡기기] 없음 · 제목 「내가 올린 일감」)으로 뜨던 것 → 보던 모양 그대로
//  사용: node sbtest/ts233.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const ix = fs.readFileSync(path.join(process.argv[2], 'src', 'Index.html'), 'utf8');
let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const la = ix.indexOf('      pmmine: () => '), line = ix.slice(la, ix.indexOf('\n', la)).replace(/\/\/.*$/, '');
const a = ix.indexOf('  function openPmCheck(sub) {'), b = ix.indexOf('\n  }\n', a) + 5;
function sim(ext, saved, reopen) {
  const ss = Object.assign({}, saved), log = [];
  const cl = { add: (c) => log.push('+' + c), remove: (c) => log.push('-' + c) };
  const f = new Function('ssGet', 'ssSet', 'show', 'loadPmMine', 'menuBlocked', '$', 'pmTabsOn', 'pmExt', 'reopen',
    "let pmMineKind = '';\n" + ix.slice(a, b) + '\nconst open = {\n' + line + '\n};\nif (reopen) open.pmmine(); else openPmCheck();\nreturn pmMineKind;');
  const kind = f((k) => (k in ss ? ss[k] : null), (k, v) => { if (v == null) delete ss[k]; else ss[k] = v; log.push('set ' + k + '=' + v); }, (v) => log.push('show ' + v), () => log.push('load'), () => false, () => ({ classList: cl }), (k) => log.push('tab ' + k), ext, reopen);
  return { ss, log: log.join(','), kind };
}
let r = sim(false, {}, false);
ok(r.ss['runner.pmCk'] === '1' && /\+pmck/.test(r.log), '1 품앗이 확인을 열면 그 모양으로 봤다고 적어 둠');
r = sim(false, { 'runner.pmCk': '1', 'runner.pmKind': 'applied' }, true);
ok(/\+pmck/.test(r.log) && /tab chk/.test(r.log) && r.kind === 'applied', '2 다시 열리면 품앗이 확인 모양 · 보던 탭(받은 일감) 그대로 (' + r.log + ')');
r = sim(false, { 'runner.pmKind': 'done' }, true);
ok(!/\+pmck/.test(r.log) && /show pmmine,load/.test(r.log) && r.kind === 'done', '3 적어 둔 것이 없으면(예전 방식으로 보던 화면) 예전 그대로');
r = sim(true, { 'runner.pmCk': '1' }, false);
ok(!('runner.pmCk' in r.ss) && /-pmck/.test(r.log), '4 외부용 품앗이로 열면 표시를 지움 → 다시 열려도 외부용 모양');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과'); process.exit(bad ? 1 : 0);
