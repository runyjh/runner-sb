// S22 기사스케줄 위 📌 업무스케줄 항상 보기 (스케줄 짤 때 참고)
//  사용: node sbtest/ts16.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const H = fs.readFileSync(path.join(process.argv[2] || '.', 'src', 'Admin.html'), 'utf8');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const v = H.slice(H.indexOf('<section id="view-sched"'), H.indexOf('id="sWrap"'));
ok(/id="sPinBox"/.test(v) && v.indexOf('id="sPinBox"') < v.indexOf('id="sChk"'), '1 기사스케줄 표 위에 항상 보기 칸');
const i0 = H.indexOf('const SPIN = {'), i1 = H.indexOf('function loadSched(start) {');
const code = H.slice(i0, i1).replace(/\$\('#sPinBox'\)\.addEventListener[\s\S]*?\n  \}\);\n/, '');
const box = { cls: new Set(['hidden']), innerHTML: '', classList: { toggle: (c, on) => (on ? box.cls.add(c) : box.cls.delete(c)) } };
let calls = 0, resolveApi;
const store = {};
const env = { $: () => box, esc: (x) => String(x), mcCls: (x) => (x.color ? ' mc-' + x.color : ''), ymdLocal: () => '2026-11-18', localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } },
  api: () => { calls++; return { then: (f) => { f({ ok: true, pinned: [{ id: '1', date: '2026-11-17', until: '2026-11-30', content: '12월 휴무 신청 받기', author: '유정훈', color: 'r' }, { id: '2', date: '2026-11-10', content: '끝난 일', done: true }, { id: '3', date: '2026-11-11', content: '비고', note: true }] }); return { catch: () => ({ finally: (g) => g() }) }; } }; } };
const S = new Function(...Object.keys(env), code + ' return { SPIN, sPinLoad, sPinPaint };')(...Object.values(env));
S.sPinLoad();
ok(calls === 1 && !box.cls.has('hidden') && /12월 휴무 신청 받기/.test(box.innerHTML) && /항상 보기 1건/.test(box.innerHTML) && !/끝난 일|비고/.test(box.innerHTML), '2 완료 · 비고 빼고 항상 보기만 보임 (1건)');
ok(/11\/17 ~ 11\/30까지/.test(box.innerHTML) && /mc-r/.test(box.innerHTML), '3 적은 날 · 까지 · 글자색 그대로');
S.sPinLoad(); ok(calls === 1, '4 1분 안에는 다시 받지 않음 (2주 넘길 때 느려지지 않게)');
store['runner.sch.pinOpen'] = '0'; S.sPinPaint(); ok(/항상 보기 1건/.test(box.innerHTML) && !/12월 휴무/.test(box.innerHTML), '5 접으면 제목만 (이 기기에 기억)');
S.SPIN.list = []; S.sPinPaint(); ok(box.cls.has('hidden'), '6 항상 보기가 없으면 칸을 숨김');
