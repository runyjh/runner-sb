/* 서버 코드(src/*.gs)를 그대로 이어 붙여 '한 번 부를 때마다 새로 시작하는' 함수로 만든다 (앱스 스크립트와 같은 방식: 호출마다 전역이 새로 만들어짐) */
const fs = require('fs'), path = require('path');
const GAS_NAMES = ['Date', 'SpreadsheetApp', 'Utilities', 'CacheService', 'LockService', 'PropertiesService', 'DriveApp', 'UrlFetchApp', 'ScriptApp', 'Session', 'HtmlService', 'ContentService', 'Logger', 'MailApp', 'GmailApp'];
function engineSource(srcDir) {
  const files = fs.readdirSync(srcDir).filter((f) => /\.gs$/.test(f)).sort();
  const code = files.map((f) => '// ───── ' + f + ' ─────\n' + fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n;\n');
  const names = []; const re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm; let m;
  while ((m = re.exec(code))) if (names.indexOf(m[1]) < 0) names.push(m[1]);
  // 시험판 전용 도우미 (서버 코드 밖 · 서버 코드의 함수만 부른다)
  const extra = `
;globalThis.__sbLogin = function (loginId, auto) {
  return run_(function () {
    const id = normLoginId_(loginId);
    const o = adminByLogin_(id);
    if (!o) fail_('관리자 아이디를 찾을 수 없습니다.');
    if (o.status !== AST.ACTIVE) fail_('사용이 중지된 관리자 계정입니다.');
    if (!o.id) fail_('관리자ID가 비어 있습니다.');
    const s = createSession_(ADMIN_SESSION + o.id, auto === true);
    return { ok: true, token: s.token, admin: { name: o.name, loginId: o.loginId.toLowerCase() } };
  });
};
globalThis.__sbAdmins = function () { try { return readAll_(SH.ADMINS).filter(function (a) { return a.status === AST.ACTIVE; }).map(function (a) { return { name: a.name, loginId: a.loginId }; }); } catch (e) { return []; } };
globalThis.__sbEval = function (src) { return eval(src); };
`;
  const epi = '\n;Object.assign(globalThis, {' + names.map((n) => n + ': typeof ' + n + " === 'function' ? " + n + ' : undefined').join(', ') + '});' + extra + '\nreturn globalThis;';
  return { code: code + epi, params: ['globalThis'].concat(GAS_NAMES), files: files, fnCount: names.length };
}
module.exports = { engineSource, GAS_NAMES };
