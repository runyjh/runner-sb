// S42 품앗이 아이콘: 이모지 🤝 → 직접 그린 진한 초록 원 + 흰 악수 (기사앱 · 관리자앱 모든 곳 · 휴대폰 기종마다 같은 모양)
//  사용: node sbtest/ts32.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const idx = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8'), adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const code = (s) => s.split('\n').filter((l) => !/^\s*(\/\*\*|\/\/)/.test(l)).map((l) => l.replace(/\s\/\/ .*$/, ''));
const pmiOf = (s) => (s.match(/const PMI = '(<svg class="pmi"[^']+<\/svg>)';/) || [])[1] || '';
// 1. 그림 정의 (두 앱 같은 그림 · 초록 원 + 흰 선)
const pi = pmiOf(idx), pa = pmiOf(adm);
ok(pi && pi === pa && /<circle cx="12" cy="12" r="12" fill="#0b7a3e"\/>/.test(pi) && /stroke="#fff"/.test(pi) && /aria-hidden="true"/.test(pi), '1 기사앱 · 관리자앱 같은 그림 (진한 초록 원 + 흰 악수)');
ok(/\.pmi \{ display: inline-block; width: 1\.3em; height: 1\.3em;/.test(idx) && /\.pmi \{ display: inline-block; width: 1\.3em; height: 1\.3em;/.test(adm), '2 글자 크기에 맞춰 커지는 크기(em)');
// 2. 기사앱: 화면에 그려지는 곳에 이모지가 남지 않음
const leftI = code(idx).filter((l) => l.indexOf('🤝') >= 0);
ok(leftI.length === 0, '3 기사앱: 그려지는 🤝 없음' + (leftI.length ? ' → ' + leftI[0].trim().slice(0, 80) : ''));
ok(/id="mPm" type="button"><i class="ti"><svg class="pmi"/.test(idx) && /pm: '' \+ PMI \+ ' 품앗이'/.test(idx) && /\$\('#moName'\)\.innerHTML = MENU_NM\[k\]/.test(idx), '4 기사앱: 메뉴 타일 · 준비 중 안내');
ok((idx.match(/<i class="cp">' \+ PMI \+ ' /g) || []).length === 2 && /<span title="품앗이">' \+ PMI \+ '<\/span>/.test(idx) && (idx.match(/<b>' \+ PMI \+ ' 품앗이 /g) || []).length >= 5, '5 기사앱: 달력 칩 · 칸 아이콘 · 그날 카드');
// 3. 관리자앱: 글자로 남긴 곳(휴대폰 칸 글자 top · 노선 rt)만 🤝 · 그릴 때 pmi 로 바꿈
const leftA = code(adm).filter((l) => l.indexOf('🤝') >= 0 && !/const pmi = |top: '🤝 |c\.kind === 'pmk' && c\.pmRoute \? '🤝 ' \+ c\.pmRoute : base|pmi\(esc\(/.test(l));
ok(leftA.length === 0, '6 관리자앱: 그려지는 🤝 없음' + (leftA.length ? ' → ' + leftA[0].trim().slice(0, 80) : ''));
ok(/const pmi = \(h\) => String\(h\)\.replace\(\/🤝\/g, PMI\);/.test(adm) && (adm.match(/pmi\(esc\(/g) || []).length >= 5, '7 관리자앱 휴대폰: 칸 글자는 esc 한 뒤 그림으로 (' + (adm.match(/pmi\(esc\(/g) || []).length + '곳)');
const pmi = (h) => String(h).replace(/🤝/g, pa), esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const out = pmi(esc('🤝 <인천8> 119AB'));
ok(out.indexOf('<svg class="pmi"') === 0 && out.indexOf('&lt;인천8&gt; 119AB') > 0 && out.indexOf('🤝') < 0, '8 esc 뒤에 바꿈: 글자는 안전하게 · 🤝 만 그림');
// 4. 기사스케줄 표 칸: 글자(attr)에는 이모지 없음 · 그림은 바탕 그림
ok(/if \(!list\.length\) return '품앗이 ' \+ pm;/.test(adm) && /\? \(t\.to \|\| ''\) \+ '\\n품앗이 맡김' : \(t\.from \|\| '러너'\) \+ '\\n품앗이 받음'/.test(adm), '9 표 칸 글자: 이름 / 품앗이 맡김·받음 (이모지 없음)');
const rule = (adm.match(/\.sg td\.c\.pmk::after \{[^}]+\}/) || [''])[0];
ok(/content: attr\(data-pm\)/.test(rule) && /background: #e6f6ec url\('data:image\/svg\+xml,%3Csvg/.test(rule) && /no-repeat 3px 2px \/ 14px 14px/.test(rule) && /padding: 1px 3px 1px 20px/.test(rule) && rule.indexOf('"') < 0, '10 표 칸: 왼쪽 위 그림(바탕) + 글자 자리 띄움');
ok(/\.sg td\.c\.pmk\.pmonly::after \{ margin-top: 0; background-color: transparent; background-position: 0 1px; padding: 0 0 0 17px;/.test(adm), '11 품앗이만 있는 칸: 바탕색만 없애고 그림은 그대로');
ok(/c\.top === '🤝 ' \+|top: '🤝 ' \+ \(rt \|\| '품앗이'\)/.test(adm) && /top: '🤝 맡김'/.test(adm), '12 휴대폰 칸 글자 규칙(S30)은 그대로');
