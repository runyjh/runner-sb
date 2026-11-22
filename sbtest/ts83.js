// S83 품앗이 받는 조건: 화물운송 종사자격증 '사진' → '번호'(숫자 9~10자리) · 번호 저장할 때 형식 검사 (가입 · 관리자 · 기사앱 내 정보 수정)
//  사용: node sbtest/ts83.js <빌드 결과 폴더 (SB_OUT)>
const fs = require('fs'), path = require('path');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2] || path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(OUT, 'engine.js'), 'utf8'), app = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8'), adm = fs.readFileSync(path.join(OUT, 'admin', 'index.html'), 'utf8');
const f = (eng.match(/function qualNoOk_\(v\) \{[^\n]*\}/) || [''])[0]; let qualNoOk_ = null; try { qualNoOk_ = eval('(' + f + ')'); } catch (e) { /* 없음 */ }
const cases = [['1-23-456789', true], ['123456789', true], ['12-34-567890', true], ['1234567890', true], ['12345678', false], ['abc123456', false], ['1-23-45678X', false], ['', false], ['12345678901', false]];
ok(typeof qualNoOk_ === 'function' && cases.every(([v, w]) => qualNoOk_(v) === w), '1 번호 형식: 숫자 9~10자리만 (하이픈 상관없음 · 글자 섞이면 안 됨)');
ok(/function qualOk_\(o\) \{ return !!o && qualNoOk_\(o\.qualNo\); \}/.test(eng) && !/if \(!me\.docQual\) fail_/.test(eng) && (eng.match(/if \(!(?:pm[Qq]|q)ualOk_\(me\)\) fail_\('화물운송 종사자격증 번호를 등록한 기사만/g) || []).length === 2 /* (S165) 외부용 = pmQualOk_ (내부용은 조건 없음) */, '2 지원하기 · 근무 가능일 저장: 번호 기준 (사진 기준 없앰)');
ok(!/qual: !!o\.docQual|qual: !!me\.docQual/.test(eng) && (eng.match(/qual: (?:pmQ|q)ualOk_\((o|me)\)/g) || []).length === 4, '3 화면에 보내는 자격증 표시 4곳 모두 번호 기준');
ok(/if \(!qualNoOk_\(out\.qualNo\)\) fail_\('화물운송 종사자격증 번호는 숫자 9~10자리로/.test(eng) && /case 'qualNo': f\.qualNo = qualFmt_\(opt\(v, '자격증 번호', 30\)\); if \(f\.qualNo && !qualNoOk_\(f\.qualNo\)\) fail_/.test(eng), '4 저장 때 형식 검사 (가입 · 관리자 수정 · 기사앱 내 정보 수정)');
ok(/화물운송 종사자격증 번호를 등록한 기사만 품앗이를 받을 수 있습니다\. 마이페이지 › 내 정보 수정에서 자격증 번호를 넣어 주세요\./.test(app) && /\['화물자격증 번호', i\.qual/.test(app) && /a\.qual \? '자격증 번호 ✓'/.test(app), '5 기사앱 문구');
ok(/<th>자격증 번호<\/th>/.test(adm), '6 관리자앱 지원자 표 머리');
