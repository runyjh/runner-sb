// index.ts 만들기: 템플릿 + 요청 처리 코드 + engine.js 지문
const fs = require('fs'), path = require('path');
const sha = fs.readFileSync(process.argv[2], 'utf8').trim();
const h = fs.readFileSync(path.join(__dirname, 'api-handler.js'), 'utf8').replace(/\nif \(typeof module !== 'undefined'\) module\.exports = [^\n]*\n?/, '\n');
const out = fs.readFileSync(path.join(__dirname, 'index.template.ts'), 'utf8').replace('__SHA__', sha).replace('__HANDLER__', h.replace(/^\/\*[\s\S]*?\*\/\n/, ''));
fs.writeFileSync(process.argv[3], out); console.log('index.ts', out.length, 'bytes');
