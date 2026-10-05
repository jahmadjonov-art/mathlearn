/* store.js — where progress lives.
   Two tiers. The artifact `db` capability keeps one document per learner, so
   progress follows them between devices and survives republishing the page.
   Browser storage is the fallback and the instant-read cache: it is written
   first so a reload is never slow, and never trusted as the only copy.
   Writes are coalesced — one question answered should not mean one network
   write — and the status is reported so the page can say honestly whether
   progress is being saved anywhere. */
(function (root) {
  'use strict';
  var KEY = 'mathacademy.progress.v2';
  var SAVE_DELAY = 1800;
  var OPEN_TIMEOUT = 6000;   /* how long the page waits for the account before using this browser's copy */

  function Store(onStatus) {
    this.db = null;
    this.uid = null;
    this.doc = null;
    this.timer = null;
    this.pending = null;
    this.writing = false;
    this.status = 'local';      /* local | syncing | synced | error */
    this.onStatus = onStatus || function () {};
  }

  Store.prototype.setStatus = function (s, detail) {
    this.status = s;
    try { this.onStatus(s, detail); } catch (e) { /* the page decides what to show */ }
  };

  Store.prototype.readLocal = function () {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }      /* private window, blocked storage, bad JSON */
  };

  Store.prototype.writeLocal = function (data) {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* nothing to do */ }
  };

  /* Resolve the capability and return whatever progress exists. Never rejects:
     a learner with no account still gets a working page. */
  Store.prototype.open = function (timeoutMs) {
    var self = this;
    var local = self.readLocal();
    var timer = null;
    var give_up = new Promise(function (resolve) {
      timer = setTimeout(function () {
        self.abandoned = true;      /* a late answer must not attach the account and overwrite newer work */
        self.setStatus('local', 'This browser only');
        resolve(local);
      }, timeoutMs || OPEN_TIMEOUT);
    });
    var attempt = self.openAccount(local);
    return Promise.race([attempt, give_up]).then(function (data) {
      clearTimeout(timer);
      return data;
    });
  };

  Store.prototype.openAccount = function (local) {
    var self = this;
    if (!root.claude || typeof root.claude.use !== 'function') {
      self.setStatus('local', 'This browser only');
      return Promise.resolve(local);
    }
    return Promise.all([root.claude.use('db'), root.claude.use('user')])
      .then(function (pair) {
        var db = pair[0], user = pair[1];
        if (!db || !user) { self.setStatus('local', 'This browser only'); return local; }
        return user.id().then(function (uid) {
          if (!uid || self.abandoned) { return local; }
          self.db = db; self.uid = uid;
          self.doc = db.doc('data/users/' + uid + '/progress');
          return self.doc.get().then(function (snap) {
            if (self.abandoned) { self.doc = null; return local; }
            if (snap.exists) {
              var remote = snap.data();
              self.setStatus('synced', 'Saved to your account');
              /* Prefer whichever copy has seen more answers. A device that was
                 offline for a week should not overwrite the newer record. */
              if (local && countAnswers(local) > countAnswers(remote)) {
                self.save(local);
                return local;
              }
              self.writeLocal(remote);
              return remote;
            }
            self.setStatus('synced', 'Saved to your account');
            if (local) self.save(local);
            return local;
          });
        });
      })
      .catch(function () { if (!self.abandoned) self.setStatus('local', 'This browser only'); return local; });
  };

  function countAnswers(p) {
    var n = 0;
    Object.keys((p && p.skills) || {}).forEach(function (k) { n += p.skills[k].a || 0; });
    return n;
  }

  /* Queue a save. Local storage is written immediately; the account copy is
     written once the learner pauses. */
  Store.prototype.save = function (data) {
    var self = this;
    self.writeLocal(data);
    if (!self.doc) return;
    self.pending = data;
    if (self.timer) clearTimeout(self.timer);
    self.timer = setTimeout(function () { self.flush(); }, SAVE_DELAY);
  };

  /* Write now — called on the delay, and when the page is being hidden. */
  Store.prototype.flush = function () {
    var self = this;
    if (!self.doc || !self.pending || self.writing) return Promise.resolve();
    var payload = self.pending;
    self.pending = null;
    self.writing = true;
    self.setStatus('syncing');
    return self.doc.set(payload)
      .then(function () {
        self.writing = false;
        self.setStatus('synced', 'Saved to your account');
        if (self.pending) return self.flush();   /* more arrived while writing */
      })
      .catch(function (err) {
        self.writing = false;
        var code = (err && err.code) || 'unavailable';
        if (code === 'unavailable') {
          /* transient: try once more, then fall back to local only */
          return new Promise(function (res) { setTimeout(res, 1200 + Math.random() * 800); })
            .then(function () { self.pending = payload; return self.flush(); });
        }
        self.setStatus('error', code === 'quota_exceeded'
          ? 'Your saved progress is full — this browser still has a copy.'
          : 'Progress is saved in this browser only.');
      });
  };

  root.STORE = Store;
  if (typeof module !== 'undefined' && module.exports) module.exports = Store;
})(typeof window !== 'undefined' ? window : globalThis);
