// (S166) 품앗이 일감 기본 정보: 캠프 주소 · 상차지 · 평균 수량 · 사무실 필수 안내(캠프 '기사 필수 안내' 새 칸) · 노선 정보 글 · 맡기는 기사 차량
//  사용: node sbtest/ts166.js <runner-allinone 폴더>
const path = require('path');
const { sbMakeStore } = require('./store.js'), { sbMakeGas } = require('./gas.js'), { engineSource, GAS_NAMES } = require('./engine-build.js'), { sbMakeKDate } = require('./kdate.js');
Object.assign(global, { sbMakeStore, sbMakeGas });
const SRC = path.join(process.argv[2], 'src');
const E = engineSource(SRC), F = new Function(...E.params, E.code), KDate = sbMakeKDate();
const S = sbMakeStore(); S.DateCls = KDate;
const G = sbMakeGas(S, { Date: KDate, ext: () => ({ code: 0, err: 'x', text: '' }) });
['main', 'sch', 'stl'].forEach((b) => S.newTab(S.book(b), '시트1'));
Object.assign(S.props, { DB_ID: 'main', SCH_DB_ID: 'sch', STL_DB_ID: 'stl', FS_OFF: '1', ENC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', MAC_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=', PEPPER: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI=' });
const fresh = () => F.apply(null, [{}].concat(GAS_NAMES.map((n) => G[n])));
const call = (fn, args) => JSON.parse(fresh().doPost({ postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
const ev = (src) => fresh().__sbEval(src);
const J = (src) => JSON.parse(ev('JSON.stringify(' + src + ')'));
KDate.__setClock(() => Date.parse('2026-11-21T10:00:00+09:00'));
fresh().ensureColumns_();
ev("appendObj_(SH.ADMINS, { id: 'A1', loginId: 'boss', name: '대표', status: AST.ACTIVE, createdAt: nowText_() }); schSheet_(); 1");
const tok = fresh().__sbLogin('boss', true).token;
call('adm_campSave', [tok, { name: '군포1캠프' }]);
const CAMP = call('adm_routeAll', [tok]).camps[0].id;
['212A', '212B'].forEach((r) => call('adm_routeSave', [tok, { campId: CAMP, code: r }]));
const NM = { P: '기사P', B: '기사B', C: '기사C' };
Object.keys(NM).forEach((k, i) => call('adm_createDriver', [tok, { name: NM[k], loginId: k.toLowerCase() + 'pm01', driverType: '고정', phone: '010-4000-10' + (10 + i), schCampId: CAMP, baseRoute: '212A' }]));
const D = {}; call('adm_listDrivers', [tok]).rows.forEach((d) => { const k = Object.keys(NM).find((x) => NM[x] === d.name); if (k) D[k] = d.id; });
ev("readAll_(SH.DRIVERS).forEach(function (o) { writeFields_(SH.DRIVERS, o._row, { qualNo: '', carName: o.name === '기사P' ? '봉고3 하이탑' : '포터2' }); }); 1"); // 자격증 번호 없음
const T = {}; Object.keys(D).forEach((k) => { T[k] = ev("createSession_('" + D[k] + "', true).token"); });



let bad = 0; const ok = (c, m) => { if (c) console.log('통과 ' + m); else { bad++; console.log('문제 ' + m); } };
const cv = call('adm_routeAll', [tok]).camps[0];
let r = call('adm_campSave', [tok, { id: CAMP, name: cv.name, address: '경기 군포시 테스트로 1', memo: '내부 메모', guide: '게이트에서 차량번호 말하기\n프레시백 꼭 회수', addresses: [{ label: '상차지', address: '군포 상차지 2' }], seen: cv.updatedAt }]);
ok(r.ok, '1 캠프에 기사 필수 안내 저장 (' + (r.msg || '') + ')');
ok(call('adm_routeAll', [tok]).camps[0].guide === '게이트에서 차량번호 말하기\n프레시백 꼭 회수', '2 노선관리에서 다시 불러오면 그대로');
ev("appendObj_(SH.RNOTE, { id: 'RN1', campId: '" + CAMP + "', route: '212A', text: '212A 는 지하 주차장 B2', author: '기사B', authorId: '" + D.B + "', status: '공개', createdAt: nowText_() }); appendObj_(SH.RNOTE, { id: 'RN2', campId: '" + CAMP + "', route: '212B', text: '다른 코드 글', author: '기사B', status: '공개', createdAt: nowText_() }); 1");
call('adm_schSave', [tok, [{ row: D.P, date: '2026-11-24', value: '212A', old: '' }]]);
r = call('api_pmGive', [T.P, { date: '2026-11-24', codes: ['212A'], time: '21:30' }]);
const jr = call('api_pmJob', [T.B, r.ids[0]]);
const i = jr.job && jr.job.info;
ok(i && i.address === '경기 군포시 테스트로 1' && i.addrs.length === 1 && i.addrs[0].address === '군포 상차지 2', '3 캠프 주소 · 상차지');
ok(i && /프레시백 꼭 회수/.test(i.guide) && !/내부 메모/.test(JSON.stringify(jr)), '4 사무실 필수 안내는 보이고 내부 메모는 안 보임');
ok(i && i.notes.length === 1 && /지하 주차장/.test(i.notes[0].text), '5 그 코드(212A) 노선 정보 글만');
ok(jr.job.car === '봉고3 하이탑', '6 맡기는 기사 차량');
ok(i && 'qty' in i, '7 평균 수량 칸 (자료 없으면 빈칸 → 화면은 \'자료 없음\')');
console.log(bad ? '문제 ' + bad + '가지' : '모두 통과');
process.exit(bad ? 1 : 0);
