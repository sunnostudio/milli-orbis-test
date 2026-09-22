/* ============================================
   account.js — マイページ（お気に入り☆・ブックマーク一覧）
   依存: scripts/fav-store.js（MilliFav）
   ログイン状態・お気に入り（動画/曲）・ブックマーク（配信予定/イベント/お知らせ/タレント）を表示
   ============================================ */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function T(key) {
    return typeof window.T === "function" ? window.T(key) : key;
  }

  function isEn() {
    try { return localStorage.getItem("milli-lang") === "en"; } catch (e) { return false; }
  }

  function fmtDate(s) {
    if (!s) return "";
    var d = new Date(String(s).slice(0, 10) + "T00:00:00Z");
    if (!d.getTime()) return s;
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }

  function labelOf(entry) {
    if (isEn() && entry.enLabel) return entry.enLabel;
    return entry.label || entry.title || entry.name || "";
  }

  function subOf(entry) {
    if (entry.kind === "cd") return entry.date ? fmtDate(entry.date) : "";
    if (entry.kind === "event") return entry.date ? fmtDate(entry.date) : "";
    if (entry.kind === "news") return (entry.date ? fmtDate(entry.date) : "") + (entry.tag ? " / " + entry.tag : "");
    if (entry.kind === "song") return entry.sub || "";
    if (entry.kind === "video") return entry.sub || "";
    if (entry.kind === "member") return entry.nameEn || "";
    return "";
  }

  function linkOf(entry) {
    if (entry.kind === "video") {
      return { href: "https://milli-unishare.pages.dev/#watch=" + entry.vid + (entry.start ? "&t=" + entry.start : ""), label: T("songs.uniWatch"), external: true };
    }
    if (entry.kind === "song") {
      return { href: "songs.html", label: T("account.openSongs"), external: false };
    }
    if (entry.kind === "cd") {
      return entry.url ? { href: entry.url, label: T("account.viewDetail"), external: entry.url.indexOf(".html") === -1 } : null;
    }
    if (entry.kind === "event") {
      return entry.url ? { href: entry.url, label: T("account.viewDetail"), external: entry.url.indexOf(".html") === -1 }
        : { href: "index.html#calendar", label: T("account.eventCal"), external: false };
    }
    if (entry.kind === "news") {
      return entry.url ? { href: entry.url, label: T("account.viewDetail"), external: entry.url.indexOf(".html") === -1 } : null;
    }
    if (entry.kind === "member") {
      return { href: entry.url || entry.id + ".html", label: T("account.openPage"), external: false };
    }
    return null;
  }

  function itemHtml(entry) {
    var label = labelOf(entry);
    if (entry.kind === "member" && entry.color) {
      label = '<span style="color:' + esc(entry.color) + ';font-weight:900">' + esc(label) + "</span>";
    } else {
      label = esc(label);
    }
    var sub = subOf(entry);
    var link = linkOf(entry);
    var list = (entry.kind === "video" || entry.kind === "song") ? "favs" : "bookmarks";
    return '<div class="acct-item card">' +
      '<div class="acct-item-body">' +
      '<div class="acct-item-title">' + label + "</div>" +
      (sub ? '<div class="acct-item-sub">' + esc(sub) + "</div>" : "") +
      "</div>" +
      (link ? '<a class="btn btn-ghost acct-item-link" href="' + esc(link.href) + '"' + (link.external ? ' target="_blank" rel="noopener"' : "") + ">" + esc(link.label) + "</a>" : "") +
      '<button type="button" class="acct-remove" data-remove-key="' + esc(entry.key) + '" data-remove-list="' + list + '">' + T("account.remove") + "</button>" +
      "</div>";
  }

  function sectionHtml(title, items, emptyKey, hintKey) {
    var body = items.length
      ? '<div class="acct-group">' + items.map(itemHtml).join("") + "</div>"
      : '<div class="placeholder">' + T(emptyKey) + "<br><small>" + T(hintKey) + "</small></div>";
    return '<div class="acct-sec"><h3 class="acct-sec-title">' + T(title) + "</h3>" + body + "</div>";
  }

  function favEntryFromStored(entry) {
    return entry;
  }

  function renderFavs() {
    var el = $("acctFavs");
    if (!el) return;
    var favs = typeof MilliFav !== "undefined" ? MilliFav.listFavs() : [];
    var videos = favs.filter(function (f) { return f.kind === "video"; });
    var songs = favs.filter(function (f) { return f.kind === "song"; });
    var html = "";
    html += sectionHtml("fav.titleVideos", videos, "account.emptyFavs", "account.emptyFavsHint");
    html += sectionHtml("fav.titleSongs", songs, "account.emptyFavs", "account.emptyFavsHint");
    el.innerHTML = html;
  }

  function renderBms() {
    var el = $("acctBms");
    if (!el) return;
    var bms = typeof MilliFav !== "undefined" ? MilliFav.listBms() : [];
    var groups = [
      { key: "bm.cd", items: bms.filter(function (b) { return b.kind === "cd"; }) },
      { key: "bm.event", items: bms.filter(function (b) { return b.kind === "event"; }) },
      { key: "bm.news", items: bms.filter(function (b) { return b.kind === "news"; }) },
      { key: "bm.member", items: bms.filter(function (b) { return b.kind === "member"; }) }
    ];
    var html = groups.map(function (g) {
      return sectionHtml(g.key, g.items, "account.emptyBms", "account.emptyBmsHint");
    }).join("");
    el.innerHTML = html;
  }

  function renderStatus() {
    var el = $("acctStatus");
    if (!el) return;
    var uid = typeof MilliFav !== "undefined" ? MilliFav.uid() : null;
    el.innerHTML =
      '<div class="acct-status-line' + (uid ? " ok" : "") + '">' + T(uid ? "account.synced" : "account.loginNote") + "</div>" +
      '<div class="acct-status-btn"><button type="button" class="btn" onclick="mpOpenAccount()">' + T("account.openLogin") + "</button></div>";
  }

  /* ---------- 推し表示（ローカル推し + 共有の最推し/推し） ---------- */

  var OSHI_ID_MAP = { raco: "rako", liz: "rizu", tsukuri: "tukuri" };
  var OSHI_ID_INV = { rako: "raco", rizu: "liz", tukuri: "tsukuri" };

  function oshiTalentToLocal(tid) { return OSHI_ID_INV[tid] || tid; }

  function memberOf(id) {
    if (typeof MEMBERS === "undefined" || !MEMBERS) return null;
    for (var i = 0; i < MEMBERS.length; i++) {
      if (MEMBERS[i].id === id) return MEMBERS[i];
    }
    return null;
  }

  function memberLabel(m) {
    if (!m) return "";
    if (isEn()) {
      return (typeof window.mName === "function") ? window.mName(m) : (m.nameEn || m.name || "");
    }
    return m.name || m.nameEn || "";
  }

  function renderOshi() {
    var el = $("acctOshi");
    if (!el) return;
    var localOshi = "";
    try { localOshi = localStorage.getItem("milli-oshi") || ""; } catch (e) {}
    var shared = null;
    if (typeof getMilliproOshi === "function") {
      try { shared = getMilliproOshi(); } catch (e) {}
    }
    var ultId = "";
    var favIds = [];
    if (shared && shared.ultimateOshi) {
      ultId = oshiTalentToLocal(shared.ultimateOshi);
    } else if (localOshi) {
      ultId = localOshi;
    }
    if (shared && Array.isArray(shared.favorites)) {
      favIds = shared.favorites.map(oshiTalentToLocal).filter(function (id) {
        return id !== ultId && memberOf(id) !== null;
      });
    } else if (localOshi && memberOf(localOshi)) {
      favIds = [];
    }
    var ultM = memberOf(ultId);
    var linked = !!(shared && shared.ultimateOshi);
    var html = '<div class="acct-oshi-title">' + T("account.oshi") + "</div>";
    if (!ultM && !favIds.length) {
      html += '<div class="placeholder">' + T("account.oshiNone") + "<br><small>" + T("account.oshiHint") + "</small></div>";
    } else {
      var items = [];
      if (ultM) {
        items.push('<span class="acct-oshi-chip is-ult" style="--mc:' + esc(ultM.color || "#75b1c0") + '">' +
          T("account.oshiUlt") + ": " + esc(memberLabel(ultM)) + "</span>");
      }
      favIds.forEach(function (id) {
        var m = memberOf(id);
        if (m) {
          items.push('<span class="acct-oshi-chip" style="--mc:' + esc(m.color || "#75b1c0") + '">' + esc(memberLabel(m)) + "</span>");
        }
      });
      html += '<div class="acct-oshi-list">' + items.join("") + "</div>";
      html += '<small class="acct-oshi-note">' + (linked ? T("account.oshiSyncNote") : T("account.oshiHint")) + "</small>";
    }
    el.innerHTML = html;
  }

  function render() {
    renderStatus();
    renderOshi();
    renderFavs();
    renderBms();
  }

  document.addEventListener("milli-favs-change", render);

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".acct-remove");
    if (!btn || typeof MilliFav === "undefined") return;
    e.preventDefault();
    var key = btn.dataset.removeKey;
    var list = btn.dataset.removeList;
    var entry = MilliFav.listFavs().filter(function (x) { return x.key === key; })[0] ||
      MilliFav.listBms().filter(function (x) { return x.key === key; })[0];
    if (!entry) return;
    if (list === "favs") MilliFav.toggleFav(entry);
    else MilliFav.toggleBm(entry);
  });

  render();
})();