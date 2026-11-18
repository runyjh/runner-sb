/**
 * 러너 올인원 → 수파베이스 파일 옮기기 (한 번만 쓰는 복사용 스크립트)
 *
 *  - 구글 드라이브는 읽기만 한다. 원래 파일·폴더·기존 Apps Script 는 그대로 둔다.
 *  - '러너 올인원 데이터' 폴더(하위 폴더 전부)와 세금계산서 그림 폴더의 파일을 같은 파일 번호로 수파베이스에 복사한다.
 *  - 자료(시트)에 주소가 적힌 파일이 그 폴더 밖에 있으면 그것도 복사한다.
 *  - 한 번에 5분쯤 돌고, 남은 게 있으면 1분 뒤 스스로 이어서 돈다. 다 끝나면 스스로 멈춘다.
 *  - 다시 돌려도 이미 옮긴 파일은 건너뛴다.
 *
 * 쓰는 법: [옮기기] 실행 → 권한 허용 → 실행 로그에서 진행 상황 확인. 멈추려면 [멈추기] 실행.
 */
const API = 'https://nlczahktyiwdbuakfncb.supabase.co/functions/v1/api';
const KEY = '__KEY__';                                   // 옮기기 전용 열쇠 (기한이 지나면 못 씀)
const ROOT_NAME = '러너 올인원 데이터';
const EXTRA_FOLDERS = ['1E4paY0gl8H8m5fJe4VhXyvVWYLA4G-jl']; // 세금계산서 그림 폴더 (매입_계산서)
const MAX_BYTES = 15 * 1024 * 1024;                     // 이보다 큰 파일은 목록만 옮기고 내용은 건너뜀
const BUDGET_MS = 4.5 * 60 * 1000;
const PROP_OF = {
  '기사 서류': 'DOCS_FOLDER_ID', '캠프 참고 이미지': 'CAMP_IMG_FOLDER_ID', '공지사항 사진': 'NT_FOLDER', '자유게시판 첨부': 'BD_FOLDER',
  '품앗이 첨부': 'PM_FOLDER', '노선 정보 사진': 'RN_FOLDER', '쿠팡 정산서': 'STL_FILE_FOLDER', '서류 올리기': 'UPLOAD_FOLDER_ID'
};

function 옮기기() { run_(); }
function 멈추기() { stopTrigger_(); Logger.log('멈췄습니다.'); }
/** 옮기기 전에: 파일 수와 크기만 세어 본다 (아무것도 보내지 않음) */
function 크기보기() {
  const tree = folders_(); let n = 0, bytes = 0, big = 0, google = 0;
  tree.list.forEach(function (x) { const it = x.f.getFiles(); while (it.hasNext()) { const f = it.next(); if (f.isTrashed()) continue; const m = f.getMimeType(); if (/^application\/vnd\.google-apps\./.test(m)) { google++; continue; } const s = f.getSize(); if (s > MAX_BYTES) big++; else { n++; bytes += s; } } });
  Logger.log('폴더 ' + tree.list.length + '개 · 옮길 파일 ' + n + '개 · ' + Math.round(bytes / 1048576) + 'MB · 큰 파일 ' + big + '개 · 구글 시트·문서 ' + google + '개(옮기지 않음)');
}
function 상황() { Logger.log(PropertiesService.getScriptProperties().getProperty('stats') || '아직 시작하지 않았습니다.'); }

function call_(op, data) {
  const r = UrlFetchApp.fetch(API, { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + KEY }, payload: JSON.stringify({ op: op, data: data || {} }), muteHttpExceptions: true });
  const code = r.getResponseCode(), text = r.getContentText();
  if (code !== 200) throw new Error(op + ' 실패 (' + code + '): ' + text.slice(0, 300));
  return JSON.parse(text);
}
function stopTrigger_() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === '옮기기') ScriptApp.deleteTrigger(t); }); }
function later_() { stopTrigger_(); ScriptApp.newTrigger('옮기기').timeBased().after(60 * 1000).create(); }

/** 뿌리 폴더: 이름이 '러너 올인원 데이터' 이고 그 안에 '기사 서류' 가 있는 폴더 */
function root_() {
  const it = DriveApp.getFoldersByName(ROOT_NAME), all = [];
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed()) all.push(f); }
  const pick = all.filter(function (f) { return f.getFoldersByName('기사 서류').hasNext(); });
  if (!pick.length && !all.length) throw new Error("'" + ROOT_NAME + "' 폴더를 찾지 못했습니다.");
  return (pick[0] || all[0]);
}
/** 폴더 나무 (위에서부터) */
function folders_() {
  const out = [], seen = {};
  const walk = function (f, parentId) {
    const id = f.getId(); if (seen[id]) return; seen[id] = 1;
    out.push({ f: f, meta: { id: id, name: f.getName(), mime: 'application/vnd.google-apps.folder', parent: parentId, folder: true, created: f.getDateCreated().getTime() } });
    const it = f.getFolders(); while (it.hasNext()) { const c = it.next(); if (!c.isTrashed()) walk(c, id); }
  };
  const root = root_(); walk(root, null);
  EXTRA_FOLDERS.forEach(function (id) { try { walk(DriveApp.getFolderById(id), null); } catch (e) { Logger.log('폴더를 열 수 없음 (건너뜀): ' + id); } });
  return { root: root, list: out };
}
function send_(file, parentId, stats, have) {
  const id = file.getId();
  if (have[id]) return;
  const mime = file.getMimeType(), size = file.getSize();
  const meta = { id: id, name: file.getName(), mime: mime, parent: parentId, created: file.getDateCreated().getTime() };
  if (/^application\/vnd\.google-apps\./.test(mime)) { stats.skipGoogle++; have[id] = 1; return; } // 구글 시트·문서 자체는 옮기지 않음 (자료는 따로 옮김)
  if (size > MAX_BYTES) { call_('mig-put', { files: [Object.assign({ size: size, folder: false, stored: false }, meta)] }); stats.skipBig++; stats.bigList.push(meta.name + ' (' + Math.round(size / 1048576) + 'MB)'); have[id] = 1; return; }
  call_('mig-blob', { meta: meta, b64: Utilities.base64Encode(file.getBlob().getBytes()) });
  stats.n++; stats.bytes += size; have[id] = 1;
}

function run_() {
  const t0 = Date.now(), P = PropertiesService.getScriptProperties();
  const stats = JSON.parse(P.getProperty('stats') || 'null') || { n: 0, bytes: 0, skipBig: 0, skipGoogle: 0, err: 0, errList: [], bigList: [], done: false };
  const have = {};
  call_('mig-have').files.forEach(function (x) { if (x[1] || x[2]) have[x[0]] = 1; });
  const tree = folders_();
  // 1) 폴더 목록 · 폴더 설정 (처음 한 번)
  if (!P.getProperty('folders_done')) {
    const metas = tree.list.map(function (x) { return x.meta; });
    for (let i = 0; i < metas.length; i += 500) call_('mig-put', { files: metas.slice(i, i + 500) });
    const props = { ROOT_FOLDER_ID: tree.root.getId() };
    tree.list.forEach(function (x) { if (x.meta.parent === tree.root.getId() && PROP_OF[x.meta.name]) props[PROP_OF[x.meta.name]] = x.meta.id; });
    call_('mig-props', { props: props });
    P.setProperty('folders_done', '1');
    Logger.log('폴더 ' + metas.length + '개 · 폴더 설정 ' + Object.keys(props).join(', '));
  }
  const save = function () { stats.errList = stats.errList.slice(-30); P.setProperty('stats', JSON.stringify(stats)); };
  const timeUp = function () { return Date.now() - t0 > BUDGET_MS; };
  // 2) 폴더 안 파일
  for (let i = 0; i < tree.list.length; i++) {
    const x = tree.list[i], it = x.f.getFiles();
    while (it.hasNext()) {
      if (timeUp()) { save(); later_(); Logger.log('잠시 쉬고 1분 뒤 이어서 합니다. 지금까지 ' + stats.n + '개 · ' + Math.round(stats.bytes / 1048576) + 'MB'); return; }
      const f = it.next();
      if (f.isTrashed()) continue;
      try { send_(f, x.meta.id, stats, have); } catch (e) { stats.err++; stats.errList.push(f.getName() + ': ' + String(e.message || e).slice(0, 120)); have[f.getId()] = 1; }
    }
  }
  // 3) 자료에 주소가 적혔는데 폴더 밖에 있는 파일
  const refs = call_('mig-refs').ids.filter(function (id) { return !have[id]; });
  for (let i = 0; i < refs.length; i++) {
    if (timeUp()) { save(); later_(); Logger.log('잠시 쉬고 1분 뒤 이어서 합니다 (폴더 밖 파일 ' + (refs.length - i) + '개 남음)'); return; }
    let f = null; try { f = DriveApp.getFileById(refs[i]); } catch (e) { have[refs[i]] = 1; continue; } // 지워졌거나 권한 없음 · 폴더 번호 등
    let parent = null; try { const ps = f.getParents(); if (ps.hasNext()) parent = ps.next().getId(); } catch (e) { parent = null; }
    try { send_(f, parent, stats, have); } catch (e) { stats.err++; stats.errList.push(f.getName() + ': ' + String(e.message || e).slice(0, 120)); }
  }
  stats.done = true; save(); stopTrigger_();
  Logger.log('끝 — 옮긴 파일 ' + stats.n + '개 · ' + Math.round(stats.bytes / 1048576) + 'MB · 큰 파일 건너뜀 ' + stats.skipBig + ' · 오류 ' + stats.err + (stats.errList.length ? '\n' + stats.errList.join('\n') : '') + (stats.bigList.length ? '\n큰 파일: ' + stats.bigList.join(', ') : ''));
}
