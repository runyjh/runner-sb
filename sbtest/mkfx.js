// 엔진이 만든 빈 DB(+관리자 1명 · 기사 2명)를 JSON 으로 떨어뜨림 → 파이썬이 엑셀로
const { S, fresh } = require('./t1.js');
let g = fresh();
g.__sbEval("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: 'd1', loginId: 'kim1', name: '김기사', status: ST.ACTIVE, driverType: '고정' }); appendObj_(SH.DRIVERS, { id: 'd2', loginId: 'lee2', name: '이기사', status: ST.ACTIVE, driverType: '백업' }); schSheet_(); stlSheet_('stl_ids');");
const out = {}; Object.keys(S.books).forEach((b) => { out[b] = S.books[b].tabs.map((t) => ({ name: t.name, rows: t.rows.map((r) => r.c.map((v) => (v instanceof Date ? v.toISOString() : v))) })); });
require('fs').writeFileSync('fx.json', JSON.stringify(out));
