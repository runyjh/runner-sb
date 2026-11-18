/*
 * 한국 시각 날짜 — 서버(세계 표준시)에서도 서버 코드의 new Date(년,월,일) · getDate() 같은 '현지 시각' 계산이
 * 앱스 스크립트(Asia/Seoul)와 똑같이 나오게 한다. 엔진 안의 Date 자리에 이것을 넣는다.
 */
function sbMakeKDate() {
  var OFF = 9 * 3600000, N = Date;
  var nativeOff = function (t) { return -new N(t).getTimezoneOffset() * 60000; }; // 이 컴퓨터의 현지 시각 차이
  var asLocal = function (s) { return typeof s === 'string' && !/^\s*\d{4}-\d\d(-\d\d)?\s*$/.test(s) && !/(Z|GMT|UTC|[+-]\d\d:?\d\d)\s*$/i.test(s); };
  function KDate(a, b, c, d, e, f, g) {
    var n = arguments.length, t;
    if (!new.target) return new N().toString();
    if (n === 0) t = N.now();
    else if (n === 1) {
      if (a instanceof N) t = a.getTime();
      else if (typeof a === 'string') { t = N.parse(a); if (asLocal(a) && !isNaN(t)) t = t + nativeOff(t) - OFF; }
      else t = +a;
    } else t = N.UTC(a, b, n > 2 ? c : 1, n > 3 ? d : 0, n > 4 ? e : 0, n > 5 ? f : 0, n > 6 ? g : 0) - OFF;
    return Reflect.construct(N, [t], new.target);
  }
  KDate.prototype = Object.create(N.prototype, { constructor: { value: KDate, writable: true, configurable: true } });
  Object.setPrototypeOf(KDate, N);
  KDate.now = N.now; KDate.UTC = N.UTC;
  KDate.parse = function (s) { return new KDate(String(s)).getTime(); };
  var P = KDate.prototype, k = function (x) { return new N(x.getTime() + OFF); };
  ['FullYear', 'Month', 'Date', 'Day', 'Hours', 'Minutes', 'Seconds', 'Milliseconds'].forEach(function (u) {
    P['get' + u] = function () { return k(this)['getUTC' + u](); };
    if (u !== 'Day') P['set' + u] = function () { var x = k(this); x['setUTC' + u].apply(x, arguments); return this.setTime(x.getTime() - OFF); };
  });
  P.getYear = function () { return this.getFullYear() - 1900; };
  P.getTimezoneOffset = function () { return -540; };
  var two = function (v) { return (v < 10 ? '0' : '') + v; };
  P.toString = function () { if (isNaN(this.getTime())) return 'Invalid Date'; var x = k(this); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x.getUTCDay()] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.getUTCMonth()] + ' ' + two(x.getUTCDate()) + ' ' + x.getUTCFullYear() + ' ' + two(x.getUTCHours()) + ':' + two(x.getUTCMinutes()) + ':' + two(x.getUTCSeconds()) + ' GMT+0900 (KST)'; };
  P.toDateString = function () { return this.toString().slice(0, 15); };
  P.toTimeString = function () { return this.toString().slice(16); };
  var loc = N.prototype.toLocaleString;
  P.toLocaleString = function (l, o) { return loc.call(this, l, Object.assign({ timeZone: 'Asia/Seoul' }, o || {})); };
  P.toLocaleDateString = function (l, o) { return N.prototype.toLocaleDateString.call(this, l, Object.assign({ timeZone: 'Asia/Seoul' }, o || {})); };
  P.toLocaleTimeString = function (l, o) { return N.prototype.toLocaleTimeString.call(this, l, Object.assign({ timeZone: 'Asia/Seoul' }, o || {})); };
  return KDate;
}
if (typeof module !== 'undefined') module.exports = { sbMakeKDate: sbMakeKDate };
