// 파일(드라이브 자리) 시험: 옮겨 온 파일 읽기 · 새로 올리기 · 다른 서버에서 읽기 · 휴지통 · 폴더 만들기 (TZ=UTC)
const { seed, makeServer } = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js');
(async () => {
  const db = makeFakeDb(); db.seed(seed.S);
  // 드라이브에서 옮겨 온 것처럼: 루트 폴더 · 캠프 사진 폴더 · 사진 1장, 그리고 camp_images 줄이 그 파일을 가리킴
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
  db.seedFile({ id: 'ROOTFOLDERxxxxxxxxxxxxxxxxxxxx', name: '러너 올인원 데이터', folder: true });
  db.seedFile({ id: 'CAMPIMGFOLDERxxxxxxxxxxxxxxxxx', name: '캠프 참고 이미지', folder: true, parent: 'ROOTFOLDERxxxxxxxxxxxxxxxxxxxx' });
  db.seedFile({ id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', name: '옛사진.png', mime: 'image/png', parent: 'CAMPIMGFOLDERxxxxxxxxxxxxxxxxx' }, png);
  [['ROOT_FOLDER_ID', 'ROOTFOLDERxxxxxxxxxxxxxxxxxxxx'], ['CAMP_IMG_FOLDER_ID', 'CAMPIMGFOLDERxxxxxxxxxxxxxxxxx']].forEach(([k, v]) => db.DB.props.set(k, { v, ver: ++db.DB.seq }));
  const A = makeServer(db), B = makeServer(db);
  const tok = (await A.call('adm_login', ['boss', '', true], 'login')).out.token;
  const camps = (await A.call('adm_routeAll', [tok])).out.camps; const cid = camps[0].id;
  // 옛 파일을 가리키는 캠프 사진 줄 하나 (옮겨 온 자료처럼)
  await A.call('', ["appendObj_(SH.CIMG, { id: 'Iold', campId: '" + cid + "', campName: 'x', file: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=drivesdk', desc: '옛', order: '1', createdAt: nowText_(), updatedAt: nowText_() }); 1"], 'eval');
  let r = await A.call('adm_campImage', [tok, 'Iold', true]); console.log('1 옮겨 온 사진 읽기', r.out.ok, r.out.mime, Buffer.from(r.out.data || '', 'base64').equals(png), 'runs', r.T.runs, '(저장소에서 받아 다시 실행)');
  r = await A.call('adm_campImage', [tok, 'Iold', true]); console.log('2 두 번째는 이 서버에 둔 것으로', r.T.runs, 'runs', db.DB.calls.filter((c) => /^get/.test(c)).length, '번 받음');
  // 새로 올리기
  const img = Buffer.alloc(3000, 7); img.write('GIF89a');
  r = await A.call('adm_campImageAdd', [tok, cid, { data: img.toString('base64'), mime: 'image/gif', desc: '새 사진' }]); console.log('3 새 사진 올리기', r.out.ok, r.out.msg || '', '· 저장소 올림', db.DB.calls.filter((c) => /^put/.test(c)).length);
  const nid = r.out.image && r.out.image.id;
  const f = [...db.DB.files.values()].find((x) => x.name.includes('새 사진')); console.log('   목록:', f && f.name, f && f.parent === 'CAMPIMGFOLDERxxxxxxxxxxxxxxxxx' ? '캠프 사진 폴더 안' : '폴더 다름', f && f.size + 'B');
  r = await B.call('adm_campImage', [tok, nid, true]); console.log('4 다른 서버에서 새 사진 읽기', r.out.ok, Buffer.from(r.out.data || '', 'base64').equals(img));
  // 지우기 → 휴지통
  const dels = (await A.call('', ["typeof adm_campImageDelete === 'function' ? 'adm_campImageDelete' : Object.keys(this).filter(function (k) { return /^adm_campImage/.test(k); }).join(',')"], 'eval')).out; console.log('   지우기 함수:', dels);
  if (dels === 'adm_campImageDelete') { r = await A.call('adm_campImageDelete', [tok, nid]); console.log('5 지우기', r.out.ok, r.out.msg || '', '· 휴지통', db.DB.files.get(f.id).trashed); }
  // 없는 파일 · 옮겨지지 않은 파일
  db.seedFile({ id: '1NotCopiedYetxxxxxxxxxxxxxxxxxxxx', name: '안옮김.jpg', mime: 'image/jpeg' }, null);
  await A.call('', ["appendObj_(SH.CIMG, { id: 'Inone', campId: '" + cid + "', campName: 'x', file: 'https://drive.google.com/file/d/1NotCopiedYetxxxxxxxxxxxxxxxxxxxx/view', desc: '', order: '9', createdAt: nowText_(), updatedAt: nowText_() }); 1"], 'eval');
  r = await A.call('adm_campImage', [tok, 'Inone', true]); console.log('6 내용 없는 파일 →', r.out.msg, 'runs', r.T.runs);
  // 공지 사진 폴더처럼 '없으면 만들기'
  const nf = (await A.call('', ["ntFolder_().getName() + ' / 부모 ' + ntFolder_().getParents().next().getId().slice(0, 10) + ' / 설정 ' + (props_().NT_FOLDER ? '저장됨' : '없음')"], 'eval')).out; console.log('7 공지 사진 폴더 만들기:', nf);
  const nf2 = (await B.call('', ["ntFolder_().getId() === props_().NT_FOLDER"], 'eval')).out; console.log('   다른 서버도 같은 폴더:', nf2, '· 폴더 수', [...db.DB.files.values()].filter((x) => x.folder && x.name === '공지사항 사진').length);
  console.log('A', JSON.stringify(A.stat()));
})().catch((e) => { console.error('ERR', e); process.exit(1); });
