/* Spooky Masquerade — 事前チェックイン（pre-register.html専用）
   ジェネレーター完成（名前＋仮面）後にログイン状態で押すと、
   招待状データを uid 紐づけで RTDB millipro/spookyCheckin/$uid に保存する。
   公開後の初回開封が自分の名前＋仮面になるための予約。
   依存: spooky-share.js（window.SpookyShare）/ ../firebase-init.js（任意・無ければ縮退） */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  var pendingAuto = false;   // 未ログイン押下→ログイン完了後に自動チェックイン
  var checkedIn = null;      // サーバー済み記録 {guest, mask, checkedInAt}

  function share() {
    try { return window.SpookyShare || null; } catch (e) { return null; }
  }
  function isComplete() {
    try {
      var s = share();
      return !!(s && s.isComplete && s.isComplete());
    } catch (e) { return false; }
  }
  function currentPair() {
    try {
      var s = share();
      if (s && s.currentName && s.currentMask) {
        return { name: s.currentName(), mask: s.currentMask() };
      }
    } catch (e) {}
    return { name: "", mask: "" };
  }
  function uid() {
    try {
      if (typeof getMilliproUid === "function") return getMilliproUid();
    } catch (e) {}
    return null;
  }
  function displayName() {
    try {
      if (typeof mpProfileInfo === "function") {
        var info = mpProfileInfo();
        if (info && info.name) return info.name;
      }
      var ud = JSON.parse(localStorage.getItem("millipro_userdata") || "null");
      if (ud && ud.playerName) return ud.playerName;
    } catch (e) {}
    var u = uid();
    return u ? "ID:" + String(u).slice(0, 6) : "";
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

  /* トースト（.spooky-toastの見た目を借りる。要素は動的生成） */
  var toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "spooky-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  function fmtDate(ts) {
    try {
      var d = new Date(ts);
      return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
    } catch (e) { return ""; }
  }

  /* ログイン状態行の描画 */
  function renderLogin() {
    var box = $("loginStatus");
    if (!box) return;
    var u = uid();
    if (!u) {
      box.innerHTML = "";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "login-link";
      b.id = "loginLink";
      b.textContent = "ログインする";
      b.addEventListener("click", function () {
        if (typeof mpOpenLogin === "function") mpOpenLogin();
        else toast("現在ログイン機能を利用できません");
      });
      box.appendChild(b);
      return;
    }
    box.textContent = "";
    var s = document.createElement("span");
    s.textContent = "ログイン中：" + displayName() + (checkedIn ? " ｜ チェックイン済み" : "");
    box.appendChild(s);
    box.appendChild(document.createTextNode(" "));
    var acc = document.createElement("button");
    acc.type = "button";
    acc.className = "login-link";
    acc.textContent = "アカウント";
    acc.addEventListener("click", function () {
      if (typeof mpOpen === "function") mpOpen();
    });
    box.appendChild(acc);
  }

  /* チェックイン行の描画 */
  function refresh() {
    renderLogin();
    var btn = $("checkinBtn"), hint = $("checkinHint");
    if (!btn) return;
    var done = isComplete();
    btn.disabled = !done;
    if (!hint) return;
    if (!done) {
      btn.textContent = "🏨 事前チェックインする";
      hint.textContent = "名前と仮面がそろうとチェックインできます（要ログイン）";
    } else if (!uid()) {
      btn.textContent = "🏨 事前チェックインする";
      hint.textContent = "招待状が完成しました。チェックインにはログインが必要です";
    } else if (checkedIn) {
      btn.textContent = "✓ チェックイン済み（再登録する）";
      hint.textContent = "チェックイン済み（" + fmtDate(checkedIn.checkedInAt) + "）上書きもできます";
    } else {
      btn.textContent = "🏨 事前チェックインする";
      hint.textContent = "招待状が完成しました。チェックインできます";
    }
  }

  function fetchCheckin() {
    var u = uid(), d = db();
    if (!u || !d) { checkedIn = null; refresh(); return; }
    try {
      d.ref("millipro/spookyCheckin/" + u).once("value").then(function (snap) {
        var v = snap && snap.val();
        checkedIn = (v && v.guest && v.mask) ? v : null;
        refresh();
      }).catch(function () { checkedIn = null; refresh(); });
    } catch (e) { checkedIn = null; refresh(); }
  }

  function doCheckin() {
    var p = currentPair();
    if (!p.name || !p.mask) return;
    var u = uid();
    if (!u) {
      toast("ログインしていません、ログインしてください");
      pendingAuto = true;
      try {
        if (typeof mpOpenLogin === "function") mpOpenLogin();
      } catch (e) {}
      return;
    }
    var d = db();
    if (!d) {
      toast("通信状況をご確認ください");
      return;
    }
    var payload = { guest: p.name.slice(0, 20), mask: p.mask.slice(0, 32), checkedInAt: Date.now() };
    var btn = $("checkinBtn");
    if (btn) btn.disabled = true;
    try {
      d.ref("millipro/spookyCheckin/" + u).set(payload).then(function () {
        checkedIn = payload;
        refresh();
        toast("チェックインしました。当日お待ちしています");
      }).catch(function () {
        refresh();
        toast("保存に失敗しました。通信状況をご確認ください");
      });
    } catch (e) {
      refresh();
      toast("保存に失敗しました。通信状況をご確認ください");
    }
  }

  function init() {
    if (!$("checkinBtn")) return;
    /* halloween内は相対パスがずれるため補正（firebase-init.jsは関数orum共有・上書き可） */
    try {
      if (typeof mpOpenMypage === "function") {
        window.mpOpenMypage = function () { window.location.href = "../account.html"; };
      }
    } catch (e) {}
    var input = $("shareNameInput");
    if (input) input.addEventListener("input", refresh);
    var grid = $("maskGrid");
    if (grid) grid.addEventListener("click", function () { setTimeout(refresh, 0); });
    var btn = $("checkinBtn");
    if (btn) btn.addEventListener("click", doCheckin);
    try {
      if (typeof onMilliproAuth === "function") {
        onMilliproAuth(function (u) {
          checkedIn = null;
          if (u) {
            fetchCheckin();
            if (pendingAuto) {
              pendingAuto = false;
              if (isComplete()) setTimeout(doCheckin, 600);
              else refresh();
            }
          } else {
            pendingAuto = false;
            refresh();
          }
        });
      } else {
        refresh();
      }
    } catch (e) {
      refresh();
    }
    refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
