// 6단계 시험 (TZ=UTC): 외부 연결(휴대폰 알림) · 서명 · 막힌 주소 · 압축 풀기 · 예약 작업 · 메일 수집기 응답 모양
const zlib = require('zlib'), nodeCrypto = require('crypto');
const T1 = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js');
global.__sbPako = require('/opt/node-tools/node_modules/pako/dist/pako_inflate.min.js');
const { sbMakeServer } = require('./server-core.js'), { sbMakeExt } = require('./ext.js'), { sbMakeHandler } = require('./api-handler.js');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  // 가짜 서비스 계정 (진짜 RSA 열쇠로 서명 확인)
  const kp = nodeCrypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const SA = { client_email: 'push@runner-push.iam.gserviceaccount.com', private_key: kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), project_id: 'runner-push' };
  const sent = [];
  const fakeFetch = async (url, o) => {
    sent.push({ url, o });
    const H = { forEach: (f) => f('application/json', 'content-type') };
    if (/oauth2\.googleapis\.com\/token/.test(url)) {
      const jwt = new URLSearchParams(o.body).get('assertion') || '', [h, c, s] = jwt.split('.');
      const good = nodeCrypto.verify('RSA-SHA256', Buffer.from(h + '.' + c), kp.publicKey, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      return { status: good ? 200 : 400, headers: H, text: async () => JSON.stringify(good ? { access_token: 'AT-1', expires_in: 3600 } : { error: 'invalid_grant' }) };
    }
    if (/fcm\.googleapis\.com/.test(url)) return { status: 200, headers: H, text: async () => '{"name":"m1"}' };
    return { status: 500, headers: H, text: async () => 'no' };
  };
  const db = makeFakeDb(); db.seed(T1.seed.S);
  const mk = () => sbMakeServer({ engine: T1.F, gasNames: T1.GAS_NAMES, db, storage: db.storage, secrets: { FCM_SA: JSON.stringify(SA) }, ext: sbMakeExt({ fetch: fakeFetch }), Date: T1.KDate });
  const A = mk(), B = mk();
  // 기기 토큰 하나 (수파베이스판 기사앱에서 등록한 것처럼)
  await A.call('', ["appendObj_(SH.PPUSH, { token: 'TOKEN-ABC', driverId: 'D1', name: '기사', device: '안드로이드 크롬', createdAt: nowText_() }); 1"], 'eval');
  // 1. 휴대폰 알림 보내기 (토큰 받기 → 서명 → FCM 보내기)
  let r = await A.call('', ["pmPushSend_([{ driverId: 'D1', title: '시험', text: '내일 처음 가는 노선', kind: 'test', jobId: '' }])"], 'eval');
  const tokCalls = sent.filter((x) => /oauth2/.test(x.url)).length, fcm = sent.filter((x) => /fcm\.googleapis/.test(x.url));
  ok(r.out === 1, '1 알림 1건 보냄 (결과 ' + JSON.stringify(r.out) + ' · 실행 ' + r.T.runs + '번 · 외부 ' + Math.round(r.T.ext || 0) + 'ms)');
  ok(tokCalls === 1 && fcm.length === 1, '  구글 토큰 1번 · FCM 1번 (다시 실행해도 두 번 보내지 않음): ' + tokCalls + ' / ' + fcm.length);
  ok(fcm[0] && fcm[0].o.headers.Authorization === 'Bearer AT-1' && /TOKEN-ABC/.test(fcm[0].o.body) && /처음 가는 노선/.test(fcm[0].o.body), '  FCM 요청에 토큰·기기·내용이 들어감');
  // 2. 두 번째는 토큰을 다시 받지 않음 (함께 쓰는 임시 기억 · 다른 서버에서도)
  sent.length = 0;
  r = await B.call('', ["pmPushSend_([{ driverId: 'D1', title: '두번째', text: 'x', kind: 'test', jobId: '' }])"], 'eval');
  ok(r.out === 1 && sent.filter((x) => /oauth2/.test(x.url)).length === 0, '2 다른 서버: 받아 둔 토큰으로 바로 보냄 (토큰 요청 ' + sent.filter((x) => /oauth2/.test(x.url)).length + '번)');
  // 3. 막힌 주소
  sent.length = 0;
  r = await A.call('', ["try { UrlFetchApp.fetch('https://example.com/x'); 'sent' } catch (e) { String(e.message) }"], 'eval');
  ok(/막아 둔 주소/.test(String(r.out)) && sent.length === 0, '3 정해 둔 곳 밖 주소는 막힘: ' + r.out);
  // 4. 압축 풀기 (엑셀 = zip): 그냥 담은 파일 + 압축한 파일
  const zipOf = (files) => {
    const parts = [], cen = []; let off = 0;
    files.forEach(([name, text, deflate]) => {
      const raw = Buffer.from(text), data = deflate ? zlib.deflateRawSync(raw) : raw, nb = Buffer.from(name), crc = zlib.crc32 ? zlib.crc32(raw) : 0;
      const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(deflate ? 8 : 0, 8); lh.writeUInt32LE(crc >>> 0, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
      const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(deflate ? 8 : 0, 10); ch.writeUInt32LE(crc >>> 0, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
      parts.push(lh, nb, data); cen.push(ch, nb); off += 30 + nb.length + data.length;
    });
    const cd = Buffer.concat(cen), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
    return Buffer.concat(parts.concat([cd, e]));
  };
  const big = '<x>' + '수행률 '.repeat(4000) + '</x>';
  const z = zipOf([['a.txt', '그냥 담음', false], ['xl/b.xml', big, true]]).toString('base64');
  r = await A.call('', ["var f = Utilities.unzip(Utilities.newBlob(Utilities.base64Decode('" + z + "'), 'application/zip', 'z.zip')); f.map(function (b) { return b.getName() + ':' + b.getDataAsString().length; }).join(',')"], 'eval');
  ok(r.out === 'a.txt:5,xl/b.xml:' + big.length, '4 압축 풀기: ' + r.out);
  // 5. 예약 작업 (세션 정리)
  r = await A.call('cleanupSessions', [], 'cron');
  ok(r && r.T && r.T.runs >= 1, '5 예약 작업 세션 정리 실행 (결과 ' + JSON.stringify(r.out) + ')');
  // 6. 요청 처리: 예약 작업 열쇠 · 정해 둔 함수만 · 메일 수집기 응답 모양
  const H = sbMakeHandler({ core: async () => A, db: {}, who: async () => null, allowed: async () => false, cronOk: async (k) => k === 'sbcron_good', origins: ['https://runyjh.github.io'] });
  const post = (body, tok) => H(new Request('https://x/api', { method: 'POST', headers: Object.assign({ 'Content-Type': 'text/plain' }, tok ? { Authorization: 'Bearer ' + tok } : {}), body: JSON.stringify(body) }));
  let res = await post({ op: 'cron', fn: 'cleanupSessions' }, 'sbcron_bad'); ok(res.status === 401, '6 틀린 예약 열쇠 → 401');
  res = await post({ op: 'cron', fn: 'adm_login' }, 'sbcron_good'); ok(res.status === 400, '  예약 작업 목록에 없는 기능 → 400');
  res = await post({ op: 'cron', fn: 'cleanupSessions' }, 'sbcron_good'); ok(res.status === 200 && (await res.json()).ok === true, '  맞는 열쇠 + 세션 정리 → 200');
  res = await post({ fn: 'api_mailPing', args: ['wrong-key'] }); const mj = await res.json();
  ok(res.status === 200 && 'ok' in mj && !('out' in mj), '  메일 수집기: 원래 서버와 같은 모양 ' + JSON.stringify(mj).slice(0, 80));
  res = await post({ fn: 'adm_dashboard', args: [] }); ok(res.status === 401, '  관리자 기능은 여전히 로그인 필요 → 401');
})().catch((e) => { console.error('ERR', e); process.exit(1); });
// 7. 새 품앗이처럼 '실행마다 새 번호' 가 들어간 알림 → 다시 실행해도 같은 번호 · 알림은 한 번만 (2026-11-18 품앗이 올리기 '다른 저장 작업이 처리 중' 고침)
(async () => {
  await new Promise((r) => setTimeout(r, 1500));
  const nodeCrypto = require('crypto'), kp = nodeCrypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const SA = { client_email: 'p@x.iam.gserviceaccount.com', private_key: kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), project_id: 'runner-push' };
  let fcm = 0, oauth = 0;
  const H = { forEach: (f) => f('application/json', 'content-type') };
  const ff = async (url) => { if (/oauth2/.test(url)) { oauth++; return { status: 200, headers: H, text: async () => '{"access_token":"AT"}' }; } fcm++; return { status: 200, headers: H, text: async () => '{}' }; };
  const db = makeFakeDb(); db.seed(T1.seed.S);
  const A = sbMakeServer({ engine: T1.F, gasNames: T1.GAS_NAMES, db, storage: db.storage, secrets: { FCM_SA: JSON.stringify(SA) }, ext: sbMakeExt({ fetch: ff }), Date: T1.KDate });
  await A.call('', ["['D1','D2','D3'].forEach(function (d, i) { appendObj_(SH.PPUSH, { token: 'TK' + i, driverId: d, name: d, device: 'x', createdAt: nowText_() }); appendObj_(SH.DRIVERS, { id: d, name: d, status: ST.ACTIVE, createdAt: nowText_() }); }); 1"], 'eval');
  // 실행마다 새 번호(Utilities.getUuid · Math.random)와 지금 시각을 알림에 넣고, 기사마다 따로 보냄 (품앗이 올리기와 같은 모양)
  const r = await A.call('', ["var id = 'J' + Utilities.getUuid().slice(0, 8) + Math.floor(Math.random() * 1e6); appendObj_(SH.PJOB, { id: id, status: '모집중', createdAt: nowText_() }); ['D1','D2','D3'].forEach(function (d) { pmPushSend_([{ driverId: d, title: '새 품앗이', text: id + ' ' + new Date().getTime(), jobId: id, kind: 'pm' }]); }); id"], 'eval');
  const saved = db.DB.rows.size;
  ok(typeof r.out === 'string' && /^J/.test(r.out), '7 새 번호 품앗이 저장됨 (' + r.out + ' · 실행 ' + r.T.runs + '번 · 외부 요청 ' + r.T.extN + '개)');
  ok(oauth === 1 && fcm === 3, '  구글 토큰 1번 · 알림 3건 (기사 3명 · 다시 실행해도 더 안 보냄): ' + oauth + ' / ' + fcm);
  ok(r.T.runs <= 5, '  다시 실행 5번 이하 (예전엔 20번 넘어 실패): ' + r.T.runs);
  const t2 = await A.call('', ["Utilities.getUuid() !== Utilities.getUuid()"], 'eval'); ok(t2.out === true, '  한 실행 안의 새 번호는 서로 다름');
  ok(saved > 0, '  저장 줄 수 ' + saved);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
