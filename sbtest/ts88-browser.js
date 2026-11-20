// S88 관리자앱 PC 서류 올리기 시험 (로컬 시험 서버)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const ev = (p, src) => p.evaluate(async (src) => (await fetch('/__eval', { method: 'POST', body: src })).text(), src);
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
  let dialogs = []; p.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await ev(p, "(function(){ var f = DriveApp.createFolder('기사 서류'); PropertiesService.getScriptProperties().setProperty('DOCS_FOLDER_ID', f.getId()); return 'ok'; })()").catch(() => {});
  await p.goto('http://127.0.0.1:8765/runner-sb/admin/');
  await p.waitForSelector('#sbEm'); await p.fill('#sbEm', 'me@x'); await p.fill('#sbPw', 'pw'); await p.click('#sbBox button.pri');
  await p.waitForSelector('#lgId', { state: 'visible', timeout: 30000 });
  await p.fill('#lgId', 'boss'); await p.fill('#lgPw', 'anything1'); await p.click('#lgBtn');
  await p.waitForFunction(() => { const n = document.querySelector('.nav a[data-view="dash"]'); return n && n.offsetParent; }, null, { timeout: 20000 });
  await ev(p, "PropertiesService.getScriptProperties().getProperty('DOCS_FOLDER_ID') || (function(){ var f = DriveApp.createFolder('기사 서류'); PropertiesService.getScriptProperties().setProperty('DOCS_FOLDER_ID', f.getId()); return f.getId(); })()");
  await p.click('.nav a[data-view="drivers"]'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const r = [...document.querySelectorAll('#rows tr')].find((t) => /김민수/.test(t.textContent)); r.click(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const t = [...document.querySelectorAll('#dBody .dtabs .tab')].find((x) => /서류/.test(x.textContent)); if (t) t.click(); }); await p.waitForTimeout(500);
  await p.screenshot({ path: __dirname + '/shots/s88-before.png' });
  ok(await p.evaluate(() => document.querySelectorAll('#dBody [data-docup]').length === 5 && !/서류 폴더 열기/.test(document.getElementById('dBody').textContent)), '1 서류 칸마다 올리기/바꾸기 + 여러 장 칸 · 드라이브 폴더 링크 없음');
  // 1) 칸 하나: 운전면허증 올리기 (없던 서류 → 확인 창 없이)
  let fc = p.waitForEvent('filechooser'); await p.click('#dBody [data-docup="license"]'); await (await fc).setFiles(__dirname + '/doc.jpg'); await p.waitForTimeout(2500);
  const s1 = JSON.parse(JSON.parse(await ev(p, "JSON.stringify((function(){ var o = readAll_(SH.DRIVERS).filter(function(x){return x.name==='김민수';})[0]; return { lic: o.docLicense, folder: o.docFolder }; })())")));
  ok(/drive\.google\.com\/file\/d\/sb|\/d\/sb/.test(s1.lic || '') && !!s1.folder, '2 칸 하나 올리기 → 서류 칸에 새 파일 · 서류 폴더 생김 ' + (s1.lic || '').slice(-12));
  ok(dialogs.length === 0 && await p.evaluate(() => /등록됨/.test(document.querySelector('#dBody [data-dropdoc="license"]').textContent) && /바꾸기/.test(document.querySelector('#dBody [data-docup="license"]').textContent)), '3 없던 서류는 확인 창 없이 · 칸이 바로 「등록됨 · 바꾸기」로');
  // 2) 바꾸기: 확인 창
  fc = p.waitForEvent('filechooser'); await p.click('#dBody [data-docup="license"]'); await (await fc).setFiles(__dirname + '/scan_0012.jpg'); await p.waitForTimeout(2500);
  const s2 = JSON.parse(JSON.parse(await ev(p, "JSON.stringify((function(){ var o = readAll_(SH.DRIVERS).filter(function(x){return x.name==='김민수';})[0]; return { lic: o.docLicense }; })())")));
  ok(dialogs.length === 1 && /기존 운전면허증을\(를\) 새 파일로 바꿉니다/.test(dialogs[0]) && s2.lic !== s1.lic, '4 바꾸기 = 확인 창 뒤 새 파일 (예전 파일은 남김)');
  const kept = await ev(p, "String(DriveApp.getFolderById((readAll_(SH.DRIVERS).filter(function(x){return x.name==='김민수';})[0].docFolder.match(/[-\\w]{25,}/)||[])[0]).getFiles().hasNext())");
  // 3) 여러 장: 파일 이름으로 종류 맞춤
  fc = p.waitForEvent('filechooser'); await p.click('#docDrop [data-docup=""]'); console.log('multiple', await p.evaluate(() => document.getElementById('docPick').multiple)); const fsx = require('fs'); await (await fc).setFiles([{ name: '면허증_김민수.png', mimeType: 'image/png', buffer: fsx.readFileSync(__dirname + '/면허증_김민수.png') }, { name: '사업자등록증.pdf', mimeType: 'application/pdf', buffer: fsx.readFileSync(__dirname + '/사업자등록증.pdf') }, { name: 'scan_0012.jpg', mimeType: 'image/jpeg', buffer: fsx.readFileSync(__dirname + '/scan_0012.jpg') }]); await p.waitForTimeout(800);
  const kinds = await p.evaluate(() => [...document.querySelectorAll('#dupList select')].map((s) => s.value)); console.log('DBG', await p.evaluate(() => document.getElementById('dupWho').textContent + ' | ' + document.getElementById('dupList').textContent.slice(0,300)));
  ok(JSON.stringify(kinds) === JSON.stringify(['license', 'biz', '']), '5 여러 장: 이름으로 종류 맞춤 (면허 · 사업자 · 모르면 빼기) ' + JSON.stringify(kinds));
  if (kinds.length < 3) { await b.close(); return; } await p.selectOption('#dupList [data-dupk="2"]', 'car'); await p.waitForTimeout(200);
  await p.screenshot({ path: __dirname + '/shots/s88-bulk.png' });
  dialogs = [];
  await p.click('#dupGo'); await p.waitForTimeout(3500);
  const s3 = JSON.parse(JSON.parse(await ev(p, "JSON.stringify((function(){ var o = readAll_(SH.DRIVERS).filter(function(x){return x.name==='김민수';})[0]; var m = function(u){ var id=(String(u||'').match(/\\/d\\/([-\\w]+)/)||[])[1]; return id ? DriveApp.getFileById(id).getMimeType() + ' ' + DriveApp.getFileById(id).getName() : ''; }; return { lic: m(o.docLicense), biz: m(o.docBiz), car: m(o.docCar) }; })())")));
  ok(dialogs.length === 1 && /운전면허증/.test(dialogs[0]) && !/사업자/.test(dialogs[0]) && /pdf/.test(s3.biz) && /\.pdf$/.test(s3.biz) && /jpeg/.test(s3.car) && /hidden/.test(await p.getAttribute('#dupModal', 'class')), '6 여러 장 올리기: 바뀌는 것만 확인 · PDF 그대로 · 사진은 JPG ' + JSON.stringify(s3));
  // 4) 보기 창: 내려받기 (드라이브 링크 없음)
  await p.click('#dBody [data-doc="biz"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => { const a = document.getElementById('docDl'); return !a.classList.contains('hidden') && /^blob:/.test(a.href) && /\.pdf$/.test(a.download) && !document.getElementById('docDrive'); }), '7 보기 창: [내려받기] (파일 이름 그대로) · 드라이브 링크 없음');
  await p.click('#docClose');
  const log = await ev(p, "JSON.stringify(readAll_(SH.ADMIN_LOG || SH.LOG || 'admin_log').filter(function(x){ return /기사 서류 올리기/.test(JSON.stringify(x)); }).length)").catch(() => '?');
  console.log('작업 기록 줄:', log);
  // 5) 끌어다 놓기 (칸 위)
  const dropOk = await p.evaluate(async () => {
    const dt = new DataTransfer(); const bin = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const blob = new Blob([u8], { type: 'image/png' });
    dt.items.add(new File([blob], '자격증.png', { type: 'image/png' }));
    const t = document.querySelector('#dBody [data-dropdoc="qual"]');
    t.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    const hl = t.classList.contains('drag');
    t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return hl;
  });
  await p.waitForTimeout(2500);
  ok(dropOk && dialogs.length === 2 && /화물운송 종사자격증/.test(dialogs[1]), '8 칸 위에 끌어다 놓기 → 그 서류 (있던 서류라 확인 창)');
  await p.screenshot({ path: __dirname + '/shots/s88-after.png' });
  // 6) 휴대폰 화면: 올리기 버튼 숨김
  await p.evaluate(() => document.documentElement.classList.add('m'));
  ok(await p.evaluate(() => [...document.querySelectorAll('#dBody [data-docup]')].every((x) => !x.offsetParent) && !document.getElementById('docDrop').offsetParent), '9 휴대폰: 올리기 버튼 · 여러 장 칸 숨김 (보기만)');
  console.log('예전 파일 남음:', kept);
  await b.close();
})().catch((e) => { console.log('ERR', e.message); process.exitCode = 1; });
