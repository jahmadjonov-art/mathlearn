/* The page must never sit on "Getting your progress" forever. Every way the
   account lookup can fail or hang has to end with the page opening. */
var assert = require('assert');
var Store = require('../src/store.js');

var mem = {};
global.window = { localStorage: { getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = v; } } };
var never = function () { return new Promise(function () {}); };
var good = { skills: { a: { a: 5 } } };

function run(name, claude, expectData, ms) {
  global.claude = claude; global.window.claude = claude;
  var st = new Store(function () {});
  var t0 = Date.now();
  return st.open(ms || 300).then(function (d) {
    assert.strictEqual(JSON.stringify(d), JSON.stringify(expectData), name + ': wrong data');
    console.log('  ok  ' + name + ' (' + (Date.now() - t0) + 'ms)');
    return st;
  });
}

setTimeout(function () { console.error('FAIL: the page would hang'); process.exit(1); }, 5000);
(function () {
  mem['mathacademy.progress.v2'] = JSON.stringify(good);
  return run('use("db") never answers', { use: never }, good)
    .then(function () { return run('user.id() never answers', { use: function (n) { return Promise.resolve(n === 'db' ? {} : { id: never }); } }, good); })
    .then(function () { return run('doc.get() never answers', { use: function (n) { return Promise.resolve(n === 'db' ? { doc: function () { return { get: never }; } } : { id: function () { return Promise.resolve('u1'); } }); } }, good); })
    .then(function () { return run('use() rejects', { use: function () { return Promise.reject(new Error('x')); } }, good); })
    .then(function () { return run('no claude at all', undefined, good); })
    .then(function () { delete mem['mathacademy.progress.v2']; return run('first visit, hung account', { use: never }, null); })
    .then(function () {
      /* a late answer after giving up must not attach the account */
      var late;
      var claude = { use: function (n) { return new Promise(function (r) { late = late || r; setTimeout(function () { r(n === 'db' ? { doc: function () { return { get: function () { return Promise.resolve({ exists: false }); } }; } } : { id: function () { return Promise.resolve('u'); } }); }, 500); }); } };
      global.claude = global.window.claude = claude;
      var st = new Store(function () {});
      return st.open(100).then(function () {
        return new Promise(function (r) { setTimeout(r, 900); }).then(function () {
          assert.strictEqual(st.doc, null, 'late answer attached the account after giving up');
          console.log('  ok  late answer is ignored');
        });
      });
    })
    .then(function () { console.log('store: all passed'); process.exit(0); })
    .catch(function (e) { console.error('FAIL', e.message); process.exit(1); });
})();
