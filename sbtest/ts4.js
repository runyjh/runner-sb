// 파일 옮기기 작업 시험: 옮기기 열쇠 → 폴더·파일 넣기 → 서버가 바로 보는지
const { seed, makeServer } = require('./ts1.js'), { makeFakeDb } = require('./fake-db.js'), { sbMakeHandler } = require('./api-handler.js');
(async () => {
  const db = makeFakeDb(); db.seed(seed.S); const D = db.DB;
  const srv = makeServer(db);
  const mig = {
    ok: async (k) => k === 'sbmig_good',
    have: async () => [...D.files.values()].map((f) => [f.id, f.stored, f.folder]),
    refs: async () => [],
    put: async (list) => { list.forEach((x) => D.files.set(x.id, Object.assign({ size: 0, trashed: false, stored: false, created: Date.now(), updated: Date.now() }, D.files.get(x.id) || {}, x, { ver: ++D.seq }))); return list.length; },
    blob: async (meta, b64) => { const b = Buffer.from(b64, 'base64'); D.store.set(meta.id, new Uint8Array(b)); await mig.put([Object.assign({}, meta, { size: b.length, stored: true, folder: false })]); },
    props: async (p) => { Object.keys(p).forEach((k) => D.props.set(k, { v: p[k], ver: ++D.seq })); return Object.keys(p); }
  };
  const H = sbMakeHandler({ core: async () => srv, db, who: async () => null, allowed: async () => false, mig, origins: ['x'] });
  const req = (key, body) => H({ method: 'POST', headers: { get: (k) => (k === 'authorization' ? 'Bearer ' + key : null) }, json: async () => body }).then(async (r) => [r.status, JSON.parse(await r.text())]);
  console.log('1 틀린 열쇠', (await req('sbmig_bad', { op: 'mig-have' }))[0]);
  console.log('2 옮기기 열쇠로 관리자 기능', (await req('sbmig_good', { fn: 'adm_check', args: ['x'] }))[0], '(401 이어야 함)');
  await req('sbmig_good', { op: 'mig-put', data: { files: [{ id: 'ROOTxxxxxxxxxxxxxxxxxxxxxxxxxx', name: '러너 올인원 데이터', folder: true, parent: null }, { id: 'DOCSxxxxxxxxxxxxxxxxxxxxxxxxxx', name: '기사 서류', folder: true, parent: 'ROOTxxxxxxxxxxxxxxxxxxxxxxxxxx' }] } });
  console.log('3 폴더 설정', JSON.stringify((await req('sbmig_good', { op: 'mig-props', data: { props: { ROOT_FOLDER_ID: 'ROOTxxxxxxxxxxxxxxxxxxxxxxxxxx', DOCS_FOLDER_ID: 'DOCSxxxxxxxxxxxxxxxxxxxxxxxxxx' } } }))[1]));
  const jpg = Buffer.from('ffd8ffe000104a464946', 'hex');
  console.log('4 파일 하나', JSON.stringify((await req('sbmig_good', { op: 'mig-blob', data: { meta: { id: '1DocPhotoxxxxxxxxxxxxxxxxxxxxxxxx', name: '면허.jpg', mime: 'image/jpeg', parent: 'DOCSxxxxxxxxxxxxxxxxxxxxxxxxxx' }, b64: jpg.toString('base64') } }))[1]));
  const tok = (await srv.call('adm_login', ['boss', '', true], 'login')).out.token;
  const v = (await srv.call('', ["var f = DriveApp.getFileById('1DocPhotoxxxxxxxxxxxxxxxxxxxxxxxx'); [f.getName(), f.getSize(), f.getParents().next().getName(), DriveApp.getFolderById(props_().DOCS_FOLDER_ID).getFiles().next().getId() === f.getId(), Utilities.base64Encode(f.getBlob().getBytes())].join(' | ')"], 'eval'));
  console.log('5 서버가 본 파일:', v.out, '· runs', v.T.runs);
  console.log('6 have', JSON.stringify((await req('sbmig_good', { op: 'mig-have' }))[1].files));
})().catch((e) => { console.error('ERR', e); process.exit(1); });
