/* Spooky Masquerade — 鍵基盤（Phase B）
   13F出現・入室判定の唯一の窓口。保存先は二層:
     1) 端末ミラー localStorage milli-event-spooky-key（即時UX・door.js注入が参照）
     2) Firebase RTDB millipro/spookyKeys/$playerId（端末間共有・直URL判定）
   前提: firebase-app-compat / database-compat / ../firebase-config.js /
   ../firebase-init.js を先に読む。オフライン・未設定時は端末層のみで動く。
   playerId は millipro_userdata（なければ発行して保存）。 */
(function () {
  "use strict";

  var KEY_KEY = "milli-event-spooky-key";
  var GUEST_KEY = "milli-event-spooky-guest";
  var MASK_KEY = "milli-event-spooky-mask";
  var REMOTE_TIMEOUT_MS = 5000;

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function hasLocal() {
    return lsGet(KEY_KEY) === "1";
  }
  function grantLocal() {
    lsSet(KEY_KEY, "1");
  }

  /* 匿名playerIdの解決（なければ発行）。Firebase未利用時は "local" を返す */
  function ensurePlayerId() {
    try {
      if (typeof getMilliproPlayerId === "function") {
        var pid = getMilliproPlayerId();
        if (pid) return pid;
      }
      if (typeof newPlayerIdFallback === "function" &&
          typeof setMilliproPlayerId === "function") {
        var fresh = newPlayerIdFallback();
        setMilliproPlayerId(fresh);
        return fresh;
      }
    } catch (e) {}
    return "local";
  }

  function db() {
    try {
      if (typeof initFirebase === "function") initFirebase();
      if (typeof firebaseAvailable === "function" && !firebaseAvailable()) return null;
      if (typeof firebase === "undefined" || !firebase.database) return null;
      return firebase.database();
    } catch (e) {
      return null;
    }
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error("timeout")); }, ms);
      })
    ]);
  }

  /* リモート照会→あればミラーに反映。結果は true(所持)/false を返す */
  function syncFromRemote() {
    var pid = ensurePlayerId();
    var d = db();
    if (!d || !pid || pid === "local") return Promise.resolve(hasLocal());
    try {
      return withTimeout(
        d.ref("millipro/spookyKeys/" + pid).once("value"),
        REMOTE_TIMEOUT_MS
      ).then(function (snap) {
        var v = snap && snap.val();
        if (v && v.clearedAt) {
          grantLocal();
          return true;
        }
        return hasLocal();
      }).catch(function () {
        return hasLocal();
      });
    } catch (e) {
      return Promise.resolve(hasLocal());
    }
  }

  /* 鍵付与（クエストクリア時）。リモート書込→ミラー。オフラインでもミラーは付与 */
  function grant() {
    grantLocal();
    var pid = ensurePlayerId();
    var d = db();
    if (!d || !pid || pid === "local") return Promise.resolve(true);
    var payload = { clearedAt: Date.now() };
    var guest = lsGet(GUEST_KEY);
    var mask = lsGet(MASK_KEY);
    if (guest) payload.guest = String(guest).slice(0, 32);
    if (mask) payload.mask = String(mask).slice(0, 32);
    try {
      return d.ref("millipro/spookyKeys/" + pid).set(payload).then(
        function () { return true; },
        function () { return true; }
      );
    } catch (e) {
      return Promise.resolve(true);
    }
  }

  /* 13F直URL判定。lockedEl（鍵扉表示）と frameEl（本編枠）を切り替える */
  function requireKey(opts) {
    opts = opts || {};
    var frameEl = opts.frame ? document.getElementById(opts.frame) : null;
    var lockedEl = opts.locked ? document.getElementById(opts.locked) : null;
    function show(open) {
      if (frameEl) frameEl.hidden = !open;
      if (lockedEl) lockedEl.hidden = !!open;
      if (!open) {
        try {
          var el = document.getElementById("spookyToast");
          if (el) {
            el.textContent = "―― この階には鍵が必要です ――";
            el.classList.add("show");
            setTimeout(function () { el.classList.remove("show"); }, 2200);
          }
        } catch (e) {}
      }
    }
    if (hasLocal()) {
      show(true);
      /* 裏で同期だけしておく */
      syncFromRemote();
      return;
    }
    /* 初回は「確認中」表示のまま照会 */
    syncFromRemote().then(function (ok) {
      show(!!ok);
    });
  }

  window.SpookyKey = {
    hasLocal: hasLocal,
    syncFromRemote: syncFromRemote,
    grant: grant,
    requireKey: requireKey
  };
})();
