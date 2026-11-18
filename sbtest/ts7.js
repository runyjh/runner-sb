// S11 백업 내려받기 시험: 서버 문(로그인 필요) · 탭·줄 나눠 받기 · 엑셀 쓰기 → 읽기(xlsx.js) 되돌림이 1글자도 다르지 않음
const fs = require('fs'), path = require('path');
const { sbMakeHandler } = require('./api-handler.js'), { sbReadXlsx } = require('./xlsx.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const src = fs.readFileSync(path.join(__dirname, 'boot.js'), 'utf8');
const sbWriteXlsx = new Function(src.slice(src.indexOf('// ── xlsx 쓰기 시작'), src.indexOf('// ── xlsx 쓰기 끝')) + '\nreturn sbWriteXlsx;')();
(async () => {
  // 1. 서버 문: 로그인 없으면 401 · 승인 계정이면 탭 목록 · 줄 · 마지막 백업 기록
  const calls = [];
  const db = {
    expTabs: async () => { calls.push('tabs'); return { tabs: [{ uid: 'u', book: 'main', tab: 'drivers', ord: 0 }], rows: 1 }; },
    expRows: async (t, a) => { calls.push('rows:' + t + ':' + a); return { rows: [[1024, ['a']]], more: false }; },
    expDone: async () => { calls.push('done'); }
  };
  const H = sbMakeHandler({ core: async () => { throw new Error('엔진을 부르면 안 됨'); }, db, who: async (t) => (t === 'user' ? 'u1' : null), allowed: async () => true, origins: ['https://runyjh.github.io'] });
  const post = (tok, op, data) => H(new Request('https://x/api', { method: 'POST', headers: tok ? { Authorization: 'Bearer ' + tok } : {}, body: JSON.stringify({ op: op, data: data }) }));
  ok((await post('', 'exp-tabs', {})).status === 401, '1 로그인 없이 백업 받기 → 401');
  ok((await post('nope', 'exp-rows', { tab: 'u' })).status === 401, '  틀린 로그인 → 401');
  const j1 = await (await post('user', 'exp-tabs', {})).json(); ok(j1.tabs && j1.tabs.length === 1, '  탭 목록 ' + JSON.stringify(j1));
  const j2 = await (await post('user', 'exp-rows', { tab: 'u', after: 2048 })).json(); ok(j2.rows && calls.indexOf('rows:u:2048') >= 0, '  줄 이어 받기 (after 2048)');
  await post('user', 'exp-rows', { tab: 'u' }); ok(calls.indexOf('rows:u:null') >= 0, '  처음 받기 (after 없음)');
  ok((await post('user', 'exp-done', {})).status === 200 && calls.indexOf('done') >= 0, '  마지막 백업 시각 기록 · 서버 엔진은 안 부름');
  // 2. 엑셀 되돌림: 글자 · 숫자 · 참거짓 · 날짜(한국 시각) · 빈 줄 · 특수 글자 · 긴 글자(45,000자) · 열 735개
  const d = new Date(Date.UTC(2026, 10, 18, 5, 12, 34, 567));
  const sheets = [
    { name: 'drivers', maxRows: 1200, maxCols: 735, rows: [['id', '이름', '날짜'], ['a_x0041_b', '  앞뒤 공백  ', d, 12345.678, true, false, 0, -1], [], ['줄\n바꿈\r\n', '<태그>&"\'', '0012', '1e5', '\u0001\u0008\u001f'], ['가'.repeat(45000)], (function () { const r = []; r[734] = '끝칸'; return r; })()] },
    { name: 'stl_raw', maxRows: 3, maxCols: 3, rows: [['머리']] }
  ];
  const buf = Buffer.from(await (await sbWriteXlsx(sheets)).arrayBuffer());
  const back = await sbReadXlsx(buf);
  const norm = (v) => (v instanceof Date ? 'D' + v.getTime() : v);
  let bad = [];
  sheets.forEach((sh, i) => {
    const R = back[i];
    if (!R || R.name !== sh.name) { bad.push('탭 ' + sh.name); return; }
    sh.rows.forEach((row, ri) => { for (let ci = 0; ci < row.length; ci++) { const a = norm(row[ci]), b = norm((R.rows[ri] || [])[ci]); if ((a == null || a === '') && (b == null || b === '')) continue; if (a !== b) bad.push(sh.name + ' ' + (ri + 1) + '줄 ' + (ci + 1) + '칸'); } });
  });
  ok(!bad.length, '2 엑셀로 쓰고 다시 읽으면 똑같음' + (bad.length ? ' — 다름: ' + bad.slice(0, 5).join(', ') : ' (' + buf.length.toLocaleString() + ' bytes)'));
  ok(back[0].maxRows === 1200 && back[0].maxCols === 735, '  탭 크기(줄 1200 · 열 735) 그대로 → 가져오기 때 max_rows · max_cols 같음');
  ok(norm(back[0].rows[1][2]) === 'D' + d.getTime(), '  날짜 ms 까지 같음');
  ok(back[0].rows[2] && back[0].rows[2].length === 0, '  빈 줄 자리 그대로');
})();
// 3. S13: 서버 오류는 기록 (errLog)
(async () => {
  const { sbMakeHandler } = require('./api-handler.js'); const logs = [];
  const H = sbMakeHandler({ core: async () => ({ call: async () => { throw new Error('일부러 낸 오류'); } }), db: { errLog: async (fn, m) => { logs.push(fn + '|' + m); } }, who: async () => 'u1', allowed: async () => true, origins: ['https://runyjh.github.io'] });
  const r = await H(new Request('https://x/api', { method: 'POST', headers: { Authorization: 'Bearer user' }, body: JSON.stringify({ fn: 'adm_rcSave', args: [] }) }));
  const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
  ok(r.status === 500 && logs[0] === 'adm_rcSave|일부러 낸 오류', '3 서버 오류 기록: ' + JSON.stringify(logs));
})();
