// S48 배번호 서류: 원본 PDF 대로 문구 맞춤 · 경력증명 확인서(별지6호) 추가 · 미리보기는 화면 안에서 (TZ=UTC)
//  사용: node sbtest/ts39.js <runner-allinone 폴더>
const fs = require('fs'), path = require('path');
const SRC = path.join(process.argv[2] || path.join(__dirname, '..', 'runyjh', 'runner-allinone'), 'src');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const adm = fs.readFileSync(path.join(SRC, 'Admin.html'), 'utf8');
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = new Function('esc', adm.slice(adm.indexOf('  const BIB_DOCS = '), adm.indexOf('  function printHtml(html)')) + '; return { html: bibDocsHtml, docs: BIB_DOCS, off: BIB_DOC_OFF };')(esc);
const co = { courierName: '쿠팡로지스틱스서비스 유한회사', courierCeo: '강현오', branchName: '러너', branchCeo: '대표', court: '서울중앙' };
const v = { name: '홍길동', birthDate: '1990-01-02', phone: '010-1-2', address: '주소지', applyDate: '2026-11-19', careerStart: '2024-03', careerEnd: '2026-10', careerYears: '2', carNo: '12가3456', carName: '포터', carYear: '2020', licenseNo: 'L-1', licenseType: '1종 보통', qualNo: 'Q-1', qualDate: '2020-01-01', manageMethod: '자동 증명', company: co };
const all = M.html(v, { confirm: 1, contract: 1, consent: 1, manage: 1, career: 1 });
const txt = all.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
// 1. 원본과 달랐던 문구 5곳 + 원본 글자
ok(/성실하게 수행하며/.test(txt) && !/성실히 수행/.test(txt), '1 계약서 제2조 ③ 성실하게');
ok(/이후의 조치에 대하여 “갑” 또는 “을”과/.test(txt) && !/대하여는/.test(txt), '2 계약서 제5조 조치에 대하여');
ok(/필요성이 상실될 경우\(허가받은/.test(txt) && !/상실된 경우/.test(txt), '3 동의서 3번 상실될 경우');
ok(/매익월 5일까지/.test(txt) && !/매월 5일까지/.test(txt), '4 허가 후 관리: 매익월 5일까지');
ok(/확인이 불가능하므로/.test(txt) && !/불가하므로/.test(txt), '5 허가 후 관리: 불가능하므로');
ok(/어떠한 귄리 의무관계도/.test(txt), '6 계약서 제2조 ④ 원본 글자 그대로');
// 2. 모양: 괄호 · 따옴표 · 도장 표시
ok((txt.match(/제\d조【/g) || []).length === 27 && !/제\d조\[/.test(txt), '7 조항 제목 【 】 9개 × 계약서 3부');
ok(!/"갑"|"을"|"병"/.test(all) && /“병”의 택배 전용 번호 신청이/.test(txt) && /‘배’번호판/.test(txt), '8 둥근 따옴표');
ok(/위 신청인 :\s+홍길동㊞/.test(txt) && !/\(서명 또는 인\)/.test(txt) && /\(서명 또는 ㊞\)/.test(txt), '9 신청인 ㊞ · 동의서 (서명 또는 ㊞)');
ok(/특별시장ㆍ광역시장ㆍ특별자치시장ㆍ도지사ㆍ특별자치도지사 귀하/.test(txt), '10 귀하 줄 가운뎃점');
// 3. 경력증명 확인서 (별지6호)
ok(M.docs.career && M.off.career === 1 && Object.keys(M.docs).length === 5, '11 서류 5종 · 경력증명은 처음에 꺼 둠');
ok(/data-page="' \+ k \+ '"' \+ \(BIB_DOC_OFF\[k\] \? '' : ' checked'\)/.test(adm), '12 고르는 칸: 꺼 둔 서류는 체크 없이');
const only = M.html(v, { career: 1 }), ot = only.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
ok((only.match(/<section/g) || []).length === 1 && /\[별지6호\]/.test(ot) && /택배종사 경력증명 확인서/.test(ot), '13 경력증명만 골라 낼 수 있음');
ok(/성\s+명 : 홍길동/.test(ot) && /생 년 월 일 : 1990년 01월 02일/.test(ot) && /전 화 번 호 : 010-1-2/.test(ot) && /차 량 번 호 : 12가3456/.test(ot) && /운전 면허 번호 : L-1/.test(ot) && /면 허 종 류 : 1종 보통/.test(ot), '14 기사 정보가 채워짐');
ok(/택배종사 시작일 : 2024 \. 3 \./.test(ot) && /택배종사 총기간 :\s+2\s+년\s+8\s+개월/.test(ot), '15 시작일 · 총기간(2024-03 ~ 2026-10 = 2년 8개월)');
ok(/허위사실이 없음을 확인하고, 허위사실이 판명될 경우 허가취소에 대하여 동의함\./.test(ot) && /배번호 허가일자 : \(보유시만 기재\)/.test(ot) && /휴무 발생\s+기간/.test(ot), '16 원본 문구');
ok((M.html(v, { confirm: 1, contract: 1, consent: 1, manage: 1 }).match(/<section/g) || []).length === 6, '17 경력증명을 안 고르면 기본 6장 (확인서 1 · 계약서 3 · 동의서 1 · 관리 신청서 1)');
ok((M.html({ company: co }, { career: 1 }).match(/<section/g) || []).length === 1, '18 빈 자료여도 오류 없이');
// 4. 미리보기: 화면 안에서
const h = adm.slice(adm.indexOf("$('#bBody').addEventListener('click'"), adm.indexOf("} else if (act === 'submit')"));
ok(!/window\.open/.test(h) && /if \(act === 'preview'\) docPreview\(html/.test(h) && /else printHtml\(html\)/.test(h), '19 미리보기는 새 창을 열지 않음');
ok(/function docPreview\(html, title\)/.test(adm) && /fr\.srcdoc = html/.test(adm) && /data-pv="print"/.test(adm) && /ev\.key === 'Escape'/.test(adm), '20 화면 안 미리보기 창 (인쇄 · 닫기 · Esc)');
// 5. 줄 맞춤 (밀림 정리)
ok(/word-break:keep-all/.test(all) && /\.kv \.k\{flex:0 0 6\.2em/.test(all) && /class="kv"><span class="k">주　　소 :<\/span>/.test(all), '21 낱말 중간에서 줄이 안 끊김 · 서명란 머리글 칸 너비 고정');
ok(/\.info\{table-layout:fixed/.test(all) && /column-rule:1px solid #777/.test(all) && /padding-top:9mm/.test(all), '22 신청 정보 밑줄 길이 고름 · 계약서 조항 테두리 · No. 칸과 표가 안 겹침');
ok(/@page\{size:A4;margin:0\}/.test(all) && /\.page\{[^}]*padding:11mm 14mm 8mm\}/.test(all), '23 인쇄 여백 0 + 쪽 안쪽 여백 (브라우저 날짜 · 주소 머리말이 안 찍힘)');
ok(/\.sign\{[^}]*white-space:nowrap\}/.test(all) && /class="small hang"/.test(all), '24 사업자명 줄이 두 줄로 안 넘어감 · ※ 줄 들여쓰기');
ok(/\(경력기간\) 20\s+년\s+월 ~ 20\s+년\s+월/.test(M.html({ company: co }, { confirm250605: 1 }).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')), '25 (250605 판) 경력기간이 비어 있으면 원본 빈칸 모양');
ok(/\[별지1호\]/.test(M.html(v, { confirm250605: 1 })) && /\[별지6호\]/.test(txt) && /집화∙배송만을/.test(txt) && /(- ){12}-\s+안\s+내\s+사\s+항\s+(- ){12}-/.test(txt), '26 원본 기호: [별지] 대괄호 · 집화∙배송 · 안내사항 줄표 13개씩');
ok(/<span class="nm">강 현 오<\/span><span class="in">\(인\)<\/span>/.test(all) && /<span class="nm">홍길동<\/span><span class="in">\(인\)<\/span>/.test(all) && /\.nm\{display:inline-block;min-width:11em\}/.test(all) && /\.info \.u \.in\{float:right/.test(all), '27 (인) 자리 원본대로: 계약서는 이름 칸 뒤 · 관리 신청서는 밑줄 오른쪽 끝 · 대표이사 강 현 오');
