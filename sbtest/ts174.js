// S174 관리자앱 표 머리글(위에 붙음)이 아래로 내려간 줄의 버튼·선택 칸·흐린 줄과 겹쳐 보이던 것 → 머리글을 위에 (z-index 2)
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const adm = fs.readFileSync(path.join(process.argv[2] || path.join(__dirname, '..'), 'admin', 'index.html'), 'utf8');
ok(/\n  th \{ font-size: 12px; color: var\(--sub\); font-weight: 600; background: #fafbfc; position: sticky; top: 0; z-index: 2; \}/.test(adm), '1 표 머리글이 내려간 줄보다 위 (모든 관리자앱 표)');
ok(/\.sg thead th \{ position: sticky; background: #fafbfc; z-index: 3;/.test(adm) && /table\.tk-stick thead th:first-child \{ left: 0; z-index: 3; \}/.test(adm), '2 기사스케줄 등 원래 더 높게 잡은 머리글은 그대로');
