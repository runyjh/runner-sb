/* (S47) 같이 짜기: '바뀌면 그때 답하기' — 서버 함수가 요청을 쥐고 있다가 DB 신호(LISTEN sb_live)가 오면 바로 답한다
 *  - 신호 A<FS_AREAS 글자>: 기사스케줄 · 품앗이 · 공지가 바뀐 시각 (DB 방아쇠 sb_live_notify 가 보냄 · 내용은 안 실림)
 *  - 신호 P<json>: 관리자가 보고 있는 칸 (칸 위치 · 이름만) — 저장하지 않고 서버 기억에만 (30초 지나면 사라짐)
 *  - 기다리는 요청이 30초 동안 없으면 듣기를 끊어 DB 연결을 돌려준다 · 듣는 연결이 너무 많으면(MAXL) 기다리지 않고 busy
 *  deps = { listen(ch, onMsg, onListen) → Promise<{ unlisten }>, notify(ch, text) → Promise, readAreas() → Promise<string>, listeners() → Promise<number>, now(), setTimeout, clearTimeout }
 */
function sbMakeLive(deps) {
  var CH = 'sb_live', MAXL = 6, WAIT = 25000, IDLE = 30000, PTTL = 30000, BUSY = 60000;
  var T = deps.setTimeout || setTimeout, C = deps.clearTimeout || clearTimeout;
  var st = { on: null, sub: null, areas: '', pres: {}, waiters: [], idleT: null, busyUntil: 0 };
  var cut = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
  function areasObj() { try { return JSON.parse(st.areas || '{}') || {}; } catch (e) { return {}; } }
  function presList(exId) {
    var now = deps.now(), out = [];
    Object.keys(st.pres).sort().forEach(function (k) { var p = st.pres[k]; if (now - p.at > PTTL) { delete st.pres[k]; return; } if (k !== exId) out.push({ id: k, who: p.who, name: p.name, sel: p.sel, view: p.view }); });
    return out;
  }
  function snap(q) { var a = areasObj(), pl = presList(cut(q && q.id, 80)); return { ok: true, schAt: +a.sch || 0, schBy: a.schBy || '', pmAt: +a.pm || 0, pmBy: a.pmBy || '', nbAt: +a.nb || 0, pres: pl, ph: JSON.stringify(pl) }; }
  function changed(q, s) { return s.schAt > (+q.schAt || 0) || s.pmAt > (+q.pmAt || 0) || s.nbAt > (+q.nbAt || 0) || s.ph !== String(q.ph == null ? '[]' : q.ph); }
  function wake() {
    st.waiters.slice().forEach(function (w) { var s = snap(w.q); if (changed(w.q, s)) w.done(s); });
  }
  function onMsg(p) {
    p = String(p || '');
    if (p.charAt(0) === 'A') { st.areas = p.slice(1); wake(); return; }
    if (p.charAt(0) !== 'P') return;
    var o = null; try { o = JSON.parse(p.slice(1)); } catch (e) { o = null; }
    if (!o || !o.id) return;
    if (o.gone) delete st.pres[o.id]; else st.pres[o.id] = { who: cut(o.who, 60), name: cut(o.name, 40), sel: cut(o.sel, 80), view: cut(o.view, 60), at: deps.now() };
    wake();
  }
  function stop() {
    var sub = st.sub; st.on = null; st.sub = null; st.pres = {}; st.areas = '';
    try { if (sub && sub.unlisten) sub.unlisten(); } catch (e) { /* 이미 끊김 */ }
  }
  function idleCheck() { C(st.idleT); st.idleT = null; if (!st.waiters.length && st.on) st.idleT = T(function () { if (!st.waiters.length) stop(); }, IDLE); }
  function start() {
    C(st.idleT); st.idleT = null;
    if (st.on) return st.on;
    if (deps.now() < st.busyUntil) return Promise.reject(new Error('BUSY'));
    var p = st.on = Promise.resolve().then(function () { return deps.listeners(); }).then(function (n) {
      if (n >= MAXL) { st.busyUntil = deps.now() + BUSY; throw new Error('BUSY'); }
      // 듣기 시작 · 다시 이어질 때마다 지금 값을 한 번 읽는다 (끊긴 사이의 변경을 놓치지 않게)
      return deps.listen(CH, onMsg, function () { Promise.resolve(deps.readAreas()).then(function (a) { st.areas = String(a || ''); wake(); }, function () {}); });
    }).then(function (sub) { st.sub = sub; return Promise.resolve(deps.readAreas()).then(function (a) { st.areas = String(a || ''); }); });
    p.catch(function () { if (st.on === p) { st.on = null; st.sub = null; } });
    return p;
  }
  return {
    /** q = { first, schAt, pmAt, nbAt, ph, id } → 지금 값이 q 와 다르면 바로 · 같으면 바뀔 때까지(최대 25초) 기다렸다가 */
    wait: function (q) {
      q = q || {};
      return start().then(function () {
        var s = snap(q);
        if (q.first || changed(q, s)) { idleCheck(); return s; }
        return new Promise(function (res) {
          var w = { q: q, done: null }, t = T(function () { w.done(Object.assign(snap(q), { idle: true })); }, WAIT);
          w.done = function (v) { C(t); var i = st.waiters.indexOf(w); if (i >= 0) st.waiters.splice(i, 1); idleCheck(); res(v); };
          st.waiters.push(w);
        });
      }, function (e) { if (String(e && e.message) === 'BUSY') return { ok: false, busy: true }; throw e; });
    },
    /** p = { id, who, name, sel, view, gone } → 다른 서버들에도 알림 (저장 안 함) */
    here: function (p) {
      p = p || {};
      var id = cut(p.id, 80); if (!id) return Promise.resolve({ ok: false });
      var o = { id: id, who: cut(p.who, 60), name: cut(p.name, 40), sel: cut(p.sel, 80), view: cut(p.view, 60) }; if (p.gone) o.gone = 1;
      return Promise.resolve(deps.notify(CH, 'P' + JSON.stringify(o))).then(function () { return { ok: true }; });
    },
    stat: function () { return { on: !!st.on, waiters: st.waiters.length, pres: Object.keys(st.pres).length }; },
    _msg: onMsg, _stop: stop
  };
}
if (typeof module !== 'undefined') module.exports = { sbMakeLive: sbMakeLive };
