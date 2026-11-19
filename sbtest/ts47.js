// S55 배번호 서류: 비어 있어서 손으로 꼭 적어야 하는 칸은 노란 칸으로 (값이 있으면 그대로) (TZ=UTC)
//  사용: node sbtest/ts47.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = new Function('esc', adm.slice(adm.indexOf('  const BIB_DOCS = '), adm.indexOf('  function printHtml(html)')) + '; return bibDocsHtml;')(esc);
const co = { courierName: '쿠팡로지스틱스서비스 유한회사', courierCeo: '강현오', courierAddr: '서울', court: '서울중앙', branchName: '러너', branchCeo: '대표', branchAddr: '부천', branchPhone: '010-1', branchBizNo: '1-2-3' };
const full = { name: '홍길동', rrn: '900101-1234567', address: '주소', phone: '010-1234-5678', birthDate: '1990-01-01', applyDate: '2026-11-19', contractStart: '2026-11-01', contractEnd: '2027-10-31', contractYears: '1', fuel: 'LPG', bodyType: '탑형', carNo: '12가3456', carName: '포터2', carYear: '2020', maxLoad: '1000', licenseNo: '11-1', licenseType: '1종 보통', qualNo: 'Q1', qualDate: '2020-01-01', manageMethod: '자동 증명', company: co };
const P = { confirmOld: 1, contractOld: 1, consent: 1, cls3: 1, manage: 1, permit: 1 };
const body = (h) => h.replace(/<style>[\s\S]*?<\/style>/, '');
const cnt = (h) => (body(h).match(/class="need[g"]/g) || []).length + (body(h).match(/class="needg"/g) || []).length * 0;
// 1. 다 채워져 있으면 노란 칸 없음 (계약서 원본의 노란 배경 .hl 은 별개)
ok(cnt(html(full, P)) === 0, '1 다 채워져 있으면 노란 칸 없음');
// 2. 빈 칸마다 노란 칸
const one = (k, pages) => cnt(html(Object.assign({}, full, { [k]: '' }), pages || { confirmOld: 1 }));
ok(one('rrn') === 1 && one('phone') === 1 && one('licenseNo') === 1 && one('qualNo') === 1 && one('qualDate') === 1 && one('maxLoad') === 1 && one('carName') === 2 && one('carYear') === 1, '2 확인서: 주민번호 · 연락처 · 면허번호 · 자격증번호 · 자격취득일 · 최대적재량 · 연식이 비면 각각 노란 칸 (차명이 비면 제조사 줄까지 2곳)');
ok(one('contractStart') === 1 && one('contractEnd') === 1 && one('contractYears') === 1 && one('applyDate') === 1, '3 확인서: 계약 시작 · 종료 · 기간 · 날짜');
ok(one('fuel') === 1 && one('bodyType') === 1 && one('licenseType') === 1, '4 확인서: 연료 · 형태 · 면허종류를 하나도 안 골랐으면 그 줄이 노랗게');
ok(cnt(html(Object.assign({}, full, { carName: '다마스' }), { confirmOld: 1 })) === 1, '5 제조사를 알 수 없으면(현대 · 기아 아님) 제조사 줄이 노랗게');
ok(one('name', { confirmOld: 1 }) === 2 && one('address', { confirmOld: 1 }) === 1, '6 이름(성명 · 위 신청인) · 주소');
// 3. 다른 서류
ok(one('carNo', { manage: 1 }) === 1 && one('birthDate', { manage: 1 }) === 1 && one('phone', { manage: 1 }) === 1 && one('applyDate', { manage: 1 }) === 1, '7 허가 후 관리 신청서: 차량번호 · 생년월일 · 연락처 · 날짜');
ok(one('applyDate', { consent: 1 }) === 1 && one('name', { consent: 1 }) === 1 && one('applyDate', { cls3: 1 }) === 1 && one('name', { cls3: 1 }) === 1, '8 동의서 2종: 날짜 · 성명');
ok(one('carNo', { permit: 1 }) === 1 && one('rrn', { permit: 1 }) === 1 && one('applyDate', { permit: 1 }) === 1, '9 별지2호: 자동차등록번호 · 주민번호 · 날짜');
ok(one('birthDate', { contractOld: 1 }) === 3 && one('phone', { contractOld: 1 }) === 3, '10 계약서 3부: 생년월일 · 연락처');
const noCo = cnt(html(Object.assign({}, full, { company: Object.assign({}, co, { branchAddr: '', branchPhone: '', branchBizNo: '' }) }), { confirmOld: 1, contractOld: 1, permit: 1 }));
ok(noCo === 2 + 3 * 2 + 1, '11 사업자 정보(주소 · 연락처 · 사업자번호)가 비면 서류마다 노란 칸 (' + noCo + ')');
// 4. 일부러 안 칠하는 칸
const blankAll = body(html({ company: co }, P));
ok(!/계약번호[^<]*<\/b> : <span class="need/.test(blankAll) && !/주&nbsp;[^<]*소<sup>1\)<\/sup><\/td><td colspan="4" class="val"><span class="need/.test(blankAll) && /회사명 :<span class="in2">/.test(blankAll), '12 꼭 적는 칸이 아닌 곳(계약번호 · 주사무소 주소 · 회사명 · No.)은 그대로');
ok(/\.need\{background:#ffff00;display:inline-block/.test(html(full, P)) && /\.needg\{background:#ffff00\}/.test(html(full, P)), '13 노란색 = 계약서 원본 노란 배경과 같은 색');
ok(!/<title>[^<]*<span/.test(html({ company: co }, P)), '14 창 제목에는 노란 칸 표시가 안 들어감');
// 5. 값이 칸을 넘으면 글자를 줄여 넣는 맞춤 · 동그라미 인
const fh = html(full, P);
ok(/<span class="fv">홍길동<\/span>/.test(fh) && /<script>\(function \(\) \{[\s\S]*querySelectorAll\('\.fv'\)[\s\S]*\}\)\(\);<\/script><\/body>/.test(fh), '15 값은 .fv 로 감싸고 서류 끝에 맞춤 스크립트가 들어감');
ok(/var min = c\.className === 'vv' \? 80 : 58/.test(fh) && /set\(0\); c\.style\.whiteSpace = ws;/.test(fh), '16 58% 까지(계약서 서명란 80%) 줄이고 그래도 넘으면 원래 크기로 줄바꿈');
ok((fh.match(/<i class="ci">인<\/i>/g) || []).length === 3 && !/㊞/.test(fh) && /\.ci\{[^}]*border-radius:50%/.test(fh), '17 도장 표시: 동그라미 안 한글 인 (확인서 2 · 협회 동의서 1)');
// 맞춤 스크립트를 가짜 화면으로 돌려 본다: 넓이 300 칸에 글자 폭 420 → 줄어듦
(function () {
  const src = adm.slice(adm.indexOf('  const BIB_FIT = function () {') + '  const BIB_FIT = '.length, adm.indexOf('  function bibDocsHtml(v, pages) {')).trim().replace(/;$/, '');
  const mk = (cls, textW, roomW) => { const fv = { style: {}, closest: () => c }; const c = { className: cls, style: {}, clientWidth: roomW, querySelectorAll: () => [fv], _w: () => textW * (parseFloat(fv.style.fontSize || '100') / 100) }; return { fv, c }; };
  const run = (cls, textW, roomW) => { const o = mk(cls, textW, roomW); const document = { querySelectorAll: () => [o.fv], createRange: () => ({ selectNodeContents() {}, getBoundingClientRect: () => ({ width: o.c._w() }) }) }; const getComputedStyle = () => ({ paddingLeft: '0', paddingRight: '0' }); new Function('document', 'getComputedStyle', '(' + src + ')();')(document, getComputedStyle); return o; };
  let o = run('', 420, 300); ok(parseFloat(o.fv.style.fontSize) <= 71 && parseFloat(o.fv.style.fontSize) >= 58 && o.c.style.whiteSpace === 'nowrap', '18 칸보다 긴 값은 글자를 줄여 한 줄에 (' + o.fv.style.fontSize + ')');
  o = run('', 200, 300); ok(!o.fv.style.fontSize, '19 칸에 들어가면 그대로');
  o = run('', 900, 300); ok(!o.fv.style.fontSize && o.c.style.whiteSpace !== 'nowrap', '20 너무 길면 원래 크기로 줄바꿈');
  o = run('vv', 420, 300); ok(!o.fv.style.fontSize && o.c.style.whiteSpace !== 'nowrap', '21 계약서 서명란은 80% 로 안 되면 두 줄');
  o = run('vv', 330, 300); ok(parseFloat(o.fv.style.fontSize) >= 80, '22 계약서 서명란: 조금 넘는 건 줄여서 한 줄 (' + o.fv.style.fontSize + ')');
})();

if (process.env.DBG) { for (const k of ['rrn','phone','licenseNo','qualNo','qualDate','maxLoad','carName','carYear','name','address']) console.log(k, one(k)); console.log('consent name', one('name', { consent: 1 }), 'date', one('applyDate', { consent: 1 }), 'cls3 name', one('name', { cls3: 1 }), one('applyDate', { cls3: 1 })); }
