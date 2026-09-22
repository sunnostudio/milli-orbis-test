(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function pad2(n) { return String(n).padStart(2, "0"); }

  /* ============ お気に入り☆・ブックマーク（UI） ============ */
  var STAR_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.9-5 4.8 1.3 6.8L12 18.2 5.9 21.2l1.3-6.8-5-4.8 6.8-.9z"/></svg>';
  var BM_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h12a1 1 0 0 1 1 1V22l-7-4.6L5 22V3.5a1 1 0 0 1 1-1z"/></svg>';
  var PLAY_SVG = '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  function bmBtnHtml(key, attrs) {
    var on = typeof MilliFav !== "undefined" && MilliFav.isBm(key);
    return '<button type="button" class="bm-btn' + (on ? " on" : "") + '" aria-pressed="' + on + '" aria-label="' + T("bm.aria") + '" title="' + T("bm.aria") + '" data-bm-key="' + esc(key) + '"' + (attrs || "") + ">" + BM_SVG + "</button>";
  }

  function favEntryFromBtn(btn) {
    var key = btn.dataset.favKey;
    if (!key) return null;
    var e = { key: key, kind: btn.dataset.favKind || "video", title: btn.dataset.favTitle || "", sub: btn.dataset.favSub || "", thumb: btn.dataset.favThumb || "" };
    if (e.kind === "video") {
      e.vid = btn.dataset.favVid || "";
      e.start = parseInt(btn.dataset.favStart, 10) || 0;
    }
    return e;
  }

  function countdownById(id) {
    for (var i = 0; i < COUNTDOWN.length; i++) {
      if (COUNTDOWN[i].id === id) return COUNTDOWN[i];
    }
    return null;
  }

  function bmEntryFromBtn(btn) {
    var kind = btn.dataset.bmKind;
    if (!kind) return null;
    var e = { key: btn.dataset.bmKey || "", kind: kind };
    if (kind === "cd") {
      var item = countdownById(btn.dataset.bmId);
      if (!item) return null;
      e.key = "cd:" + item.id;
      e.label = item.label;
      e.enLabel = item.en && item.en.label ? item.en.label : "";
      e.date = item.date;
      e.note = item.note || "";
      e.url = item.url || "";
    } else if (kind === "event") {
      e.key = "ev:" + btn.dataset.bmType + ":" + btn.dataset.bmTitle;
      e.type = btn.dataset.bmType;
      e.title = btn.dataset.bmTitle;
      e.date = btn.dataset.bmDate || "";
      e.url = btn.dataset.bmUrl || "";
    } else if (kind === "news") {
      e.key = "nw:" + btn.dataset.bmDate + ":" + btn.dataset.bmTitle;
      e.date = btn.dataset.bmDate || "";
      e.tag = btn.dataset.bmTag || "";
      e.title = btn.dataset.bmTitle;
      e.desc = btn.dataset.bmDesc || "";
      e.url = btn.dataset.bmUrl || "";
    } else if (kind === "member") {
      e.key = "mb:" + btn.dataset.bmId;
      e.id = btn.dataset.bmId;
      e.name = btn.dataset.bmName;
      e.nameEn = btn.dataset.bmNameEn || "";
      e.color = btn.dataset.bmColor || "";
      e.img = btn.dataset.bmImg || "";
      e.url = btn.dataset.bmId + ".html";
    }
    return e;
  }

  /* ホーム: お気に入り動画/曲（今日のミリプロの下） */
  function favThumbHtml(vid, start, thumb) {
    return '<div class="fav-thumb-wrap" data-vid="' + esc(vid) + '" data-start="' + (start || "") + '">' +
      '<img class="song-thumb" src="' + esc(thumb) + '" alt="" loading="lazy">' +
      '<span class="play-overlay" aria-hidden="true">' + PLAY_SVG + "</span></div>";
  }

  function favStarFullHtml(entry) {
    var on = typeof MilliFav !== "undefined" && MilliFav.isFav(entry.key);
    return '<button type="button" class="fav-star' + (on ? " on" : "") + '" aria-pressed="' + on + '" aria-label="' + T("fav.aria") + '" title="' + T("fav.aria") + '" data-fav-key="' + esc(entry.key) + '" data-fav-kind="' + entry.kind + '"' +
      (entry.kind === "video" ? ' data-fav-vid="' + esc(entry.vid) + '" data-fav-start="' + (entry.start || "") + '"' : "") +
      ' data-fav-title="' + esc(entry.title) + '" data-fav-sub="' + esc(entry.sub || "") + '" data-fav-thumb="' + esc(entry.thumb || "") + '">' + STAR_SVG + "</button>";
  }

  function favVideoCardHtml(f) {
    var thumb = f.thumb || "https://i.ytimg.com/vi/" + f.vid + "/mqdefault.jpg";
    var entry = { key: f.key, kind: "video", vid: f.vid, start: f.start || 0, title: f.title, sub: f.sub || "", thumb: thumb };
    return '<div class="fav-card fav-video">' +
      favThumbHtml(f.vid, f.start, thumb) +
      favStarFullHtml(entry) +
      '<div class="fav-title">' + esc(f.title) + "</div>" +
      (f.sub ? '<div class="fav-sub">' + esc(f.sub) + "</div>" : "") +
      "</div>";
  }

  function favSongCardHtml(f) {
    var entry = { key: f.key, kind: "song", title: f.title, sub: f.sub || "", thumb: f.thumb || "" };
    return '<div class="fav-card fav-song">' +
      '<div class="fav-jacket">' + (f.thumb ? '<img src="' + esc(f.thumb) + '" alt="" loading="lazy">' : '<span class="fav-jacket-none">♪</span>') + "</div>" +
      favStarFullHtml(entry) +
      '<div class="fav-title">' + esc(f.title) + "</div>" +
      (f.sub ? '<div class="fav-sub">' + esc(f.sub) + "</div>" : "") +
      "</div>";
  }

  function renderFavBox() {
    var box = $("#favBox");
    if (!box || typeof MilliFav === "undefined") return;
    var favs = MilliFav.listFavs();
    var videos = favs.filter(function (f) { return f.kind === "video"; });
    var songs = favs.filter(function (f) { return f.kind === "song"; });
    if (!videos.length && !songs.length) { box.style.display = "none"; return; }
    box.style.display = "";
    var parts = [];
    if (videos.length) {
      parts.push('<div class="fav-sec"><h3 class="fav-sec-title">' + T("fav.titleVideos") + "</h3>" +
        '<div class="fav-row">' + videos.map(favVideoCardHtml).join("") + "</div></div>");
    }
    if (songs.length) {
      parts.push('<div class="fav-sec"><h3 class="fav-sec-title">' + T("fav.titleSongs") + "</h3>" +
        '<div class="fav-row">' + songs.map(favSongCardHtml).join("") + "</div></div>");
    }
    box.innerHTML = parts.join("");
  }

  /* お気に入り・ブックマークの変更を全ボタンに反映（描画し直さない） */
  function syncFavButtons() {
    $$(".fav-star").forEach(function (b) {
      var on = typeof MilliFav !== "undefined" && MilliFav.isFav(b.dataset.favKey);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
    });
    $$(".bm-btn").forEach(function (b) {
      var on = typeof MilliFav !== "undefined" && MilliFav.isBm(b.dataset.bmKey);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
    });
    renderFavBox();
  }

  /* グローバル委譲: .fav-star / .bm-btn（songs.js 側でも同じボタンを使う） */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".fav-star");
    if (btn) {
      e.preventDefault();
      var entry = favEntryFromBtn(btn);
      if (entry && typeof MilliFav !== "undefined") MilliFav.toggleFav(entry);
      return;
    }
    var bbm = e.target.closest(".bm-btn");
    if (bbm) {
      e.preventDefault();
      var bentry = bmEntryFromBtn(bbm);
      if (bentry && typeof MilliFav !== "undefined") MilliFav.toggleBm(bentry);
    }
  });

  document.addEventListener("milli-favs-change", syncFavButtons);

  /* ホームのお気に入りカード: サムネ再生・曲カードは曲データベースへ */
  var favBox = $("#favBox");
  if (favBox) {
    favBox.addEventListener("click", function (e) {
      if (e.target.closest(".fav-star") || e.target.closest("a")) return;
      var wrap = e.target.closest(".fav-thumb-wrap");
      if (wrap) {
        var src = "https://www.youtube.com/embed/" + wrap.dataset.vid + "?autoplay=1" + (parseInt(wrap.dataset.start, 10) ? "&start=" + wrap.dataset.start : "");
        wrap.innerHTML = '<iframe src="' + src + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>';
        return;
      }
      var song = e.target.closest(".fav-song");
      if (song) { location.href = "songs.html"; return; }
      var vc = e.target.closest(".fav-video");
      if (vc) {
        var fStart = parseInt(vc.dataset.start, 10);
        window.open("https://milli-unishare.pages.dev/#watch=" + vc.dataset.vid + (fStart ? "&t=" + fStart : ""), "_blank");
      }
    });
  }

  function getMember(id) {
    return MEMBERS.find(function (m) { return m.id === id; });
  }

  function getMemberByDate(mmdd, type) {
    return MEMBERS.filter(function (m) {
      if (!m.birthday) return false;
      if (type === "birthday" && m.birthday === mmdd) return true;
      if (type === "anniversary") {
        var d = m.debut.slice(5);
        return d === mmdd;
      }
      return false;
    });
  }

  function nextOccurrence(mmdd, fromDate) {
    var now = fromDate || jstNow();
    var y = now.getUTCFullYear();
    var t = new Date(Date.UTC(y, parseInt(mmdd.slice(0, 2), 10) - 1, parseInt(mmdd.slice(3), 10)));
    if (t < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))) {
      t = new Date(Date.UTC(y + 1, parseInt(mmdd.slice(0, 2), 10) - 1, parseInt(mmdd.slice(3), 10)));
    }
    return t;
  }

  function fmtDate(d) {
    return d.getUTCFullYear() + "/" + pad2(d.getUTCMonth() + 1) + "/" + pad2(d.getUTCDate());
  }

  function fmtTime(d) {
    return pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes());
  }

  /* JST 壁時計ヘルパー: ブラウザのタイムゾーンに依存させないため、
     アプリ内の日時は「JST の壁時計時刻を Date.UTC にエンコード」して持ち、
     getUTC* アクセサで読む。
     parseJst: "YYYY-MM-DD[THH:MM:SS]"（JST表記）をエンコード（非該当は null）
     toJst:    絶対時刻（Date）を JST 壁時計に変換（+9h）
     jstWallClock: JST表記か絶対ISOかを自動判定して JST 壁時計を返す */
  function parseJst(s) {
    if (s instanceof Date) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(s || ""));
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
  }
  function toJst(d) {
    return new Date(d.getTime() + 9 * 3600000);
  }
  function jstWallClock(s) {
    var d = parseJst(s);
    return d ? d : toJst(new Date(s));
  }
  function jstNow() { return toJst(new Date()); }

  /* ============ ヘッダー ============ */
  function closeNavDrops() {
    $$(".nav-drop.open").forEach(function (d) { d.classList.remove("open"); });
  }

  function initHeader() {
    var burger = $("#hamburger");
    var backdrop = $("#drawerBackdrop");
    function setDrawer(open) {
      var nav = $("#mobileNav");
      if (!nav) return;
      nav.classList.toggle("open", open);
      nav.setAttribute("aria-hidden", String(!open));
      if (backdrop) { backdrop.classList.toggle("open", open); backdrop.setAttribute("aria-hidden", String(!open)); }
      if (burger) burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    }
    if (burger) {
      burger.addEventListener("click", function (e) {
        e.stopPropagation();
        var nav = $("#mobileNav");
        var isOpen = nav && nav.classList.contains("open");
        setDrawer(!isOpen);
      });
    }
    if (backdrop) backdrop.addEventListener("click", function(){ setDrawer(false); });
    document.addEventListener("click", function(e){
      var nav=$("#mobileNav");
      if(!nav || !nav.classList.contains("open")) return;
      if(nav.contains(e.target) || (burger && burger.contains(e.target))) return;
      // ヘッダー外(メインやbackdrop外)を押したら閉じる
      setDrawer(false);
    });
    document.addEventListener("keydown", function(e){ if(e.key==="Escape"){ var nav=$("#mobileNav"); if(nav && nav.classList.contains("open")) setDrawer(false); }});
    // ドロワー内リンククリックで閉じる
    var mNav = $("#mobileNav");
    if (mNav) mNav.addEventListener("click", function(e){ if(e.target.closest("a")) setDrawer(false); });

    $$(".nav-drop").forEach(function (drop) {
      var btn = $(".nav-drop-btn", drop);
      if (!btn) return;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = drop.classList.contains("open");
        closeNavDrops();
        if (!isOpen) drop.classList.add("open");
      });
      drop.addEventListener("click", function (e) {
        if (e.target.closest(".nav-drop-menu")) closeNavDrops();
      });
    });
    document.addEventListener("click", closeNavDrops);

    var select = $("#oshiSelect");
    if (select) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = T("header.oshiOption");
      select.appendChild(empty);
      MEMBERS.forEach(function (m) {
        var opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = mName(m);
        select.appendChild(opt);
      });
      select.value = getOshi() || "";
      select.addEventListener("change", function () { setOshi(select.value); });
      colorOshiSelect(select);
    }
  }

  /* 推しセレクトの枠線・文字を推しカラーに（未選択はアクセント色） */
  function colorOshiSelect(select) {
    if (!select) return;
    var m = getMember(select.value);
    select.style.setProperty("--mc", m ? m.color : "");
    select.style.color = m ? m.color : "";
    select.style.borderColor = m ? m.color : "";
  }

  /* ============ 推しカラー ============ */
  // 共有推し（Millipro Chronicle 連携）との ID 変換。
  // 本サイトのメンバーID（raco/liz/tsukuri）と共有ID（rako/rizu/tukuri）は異なる
  var MP_OSHI_MAP = { raco: "rako", liz: "rizu", tsukuri: "tukuri" };
  function mpOshiToTalent(id) { return MP_OSHI_MAP[id] || id; }
  function mpTalentToOshi(id) {
    for (var k in MP_OSHI_MAP) if (MP_OSHI_MAP[k] === id) return k;
    return id;
  }
  function getSharedOshi() {
    if (typeof getMilliproOshi !== "function") return null;
    try { return getMilliproOshi(); } catch (e) { return null; }
  }
  // ローカル選択（milli-oshi）優先。無ければ共有の最推しを返す
  function getOshi() {
    try {
      var local = localStorage.getItem("milli-oshi");
      if (local) return local;
    } catch (e) {}
    var shared = getSharedOshi();
    if (shared && shared.ultimateOshi) return mpTalentToOshi(shared.ultimateOshi);
    return "";
  }

  function setOshi(id) {
    try { localStorage.setItem("milli-oshi", id); } catch (e) {}
    applyOshi(id);
    var select = $("#oshiSelect");
    if (select && select.value !== id) select.value = id;
    colorOshiSelect(select);
    // ログイン中は共有プロフィールへ書き戻し（推しリストは既存値を維持）
    if (typeof updateMilliproOshi === "function") {
      var shared = getSharedOshi();
      var favs = (shared && shared.favorites) || [];
      updateMilliproOshi(id ? mpOshiToTalent(id) : null, favs);
    }
  }

  function applyOshi(id) {
    var dark = document.documentElement.dataset.theme === "dark";
    var m = getMember(id);
    var color = m ? m.color : "#75b1c0";
    var soft = m ? m.subColor : "#d8ecf2";
    var r = document.documentElement.style;
    r.setProperty("--accent", color);
    r.setProperty("--accent-soft", dark ? shade(soft, -40) : soft);
    r.setProperty("--grad", dark
      ? "linear-gradient(135deg, " + shade(soft, -55) + ", #15121c 68%)"
      : "linear-gradient(135deg, " + soft + ", #ffffff 60%)");
    r.setProperty("--accent-deep", dark ? shade(color, 22) : shade(color, -35));
    document.body.style.setProperty("--mc", color);
    document.body.style.setProperty("--mc-soft", dark ? shade(soft, -45) : soft);
    document.body.dataset.oshi = id || "";
    applyPageDeco();
  }

  /* ============ ページ背景デコレーション（index: 推し連動 / タレントページ: 静的に生成済み） ============ */
  function buildDecoHtml(m) {
    var d = m.deco;
    if (!d || !(d.floats || d.shape)) return "";
    var s = "";
    (d.floats || []).forEach(function (f) {
      s += '<span class="d-f" data-k="' + f.k + '" style="left:' + f.x + "%;top:" + f.y + "%;width:" + f.size +
        "px;height:" + f.size + "px;--dur:" + f.dur + 's">' + (DECO_SVG[f.k] || "") + "</span>";
    });
    if (d.shape === "paw") s += '<span class="d-paw" style="left:82%;top:30%"><i></i><i></i><i></i><i></i></span>';
    if (d.shape === "bub") s += '<span class="d-bub" style="left:12%;top:30%"></span><span class="d-bub" style="left:76%;top:40%;animation-delay:2s"></span>';
    if (d.shape === "rain") s += '<span class="d-rain" style="left:74%;top:6%"></span><span class="d-drop" style="left:88%;top:18%"></span><span class="d-drop" style="left:66%;top:44%;animation-delay:1.4s"></span>';
    if (d.shape === "cross") s += '<span class="d-cross" style="left:82%;top:20%"></span>';
    if (d.shape === "wheel") s += '<span class="d-wheel" style="left:84%;top:12%"></span>';
    if (d.shape === "zzz") s += '<span class="d-zzz" style="left:16%;top:62%">Z</span><span class="d-zzz" style="left:27%;top:74%;font-size:2.1rem;animation-delay:1.1s">z</span><span class="d-zzz" style="left:37%;top:84%;font-size:1.4rem;animation-delay:2.1s">z</span>';
    if (d.shape === "straw") s += '<span class="d-straw" style="left:50%;top:62%;transform:translateX(-50%)">' + (DECO_SVG.ichigo || "") + "</span>";
    return s;
  }

  function applyPageDeco() {
    if (document.body.dataset.member) return;
    var m = getMember(document.body.dataset.oshi || "");
    var box = document.querySelector(".page-deco");
    if (!m || !m.deco) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.className = "page-deco";
      box.setAttribute("aria-hidden", "true");
      document.body.insertBefore(box, document.body.firstChild);
    }
    box.innerHTML = buildDecoHtml(m);
  }

  function shade(hex, pct) {
    var c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
    var n = parseInt(c, 16);
    var r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(((pct / 100) * 255) * 1.6)));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(((pct / 100) * 255) * 1.6)));
    var b = Math.max(0, Math.min(255, (n & 255) + Math.round(((pct / 100) * 255) * 1.6)));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function initOnboarding() {
    if (!$("#oshiModal")) return;
    if (getOshi()) return;
    var list = $("#oshiList");
    MEMBERS.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "oshi-option";
      b.innerHTML = (m.icon
        ? '<span class="oshi-mark"><img src="' + m.icon + '" alt=""></span>'
        : '<span class="oshi-mark">' + m.fanMark + "</span>") + mName(m);
      b.style.setProperty("--mc", m.color);
      b.addEventListener("click", function () {
        setOshi(m.id);
        closeModal();
        $(".birthday-banner") && checkBirthday();
      });
      list.appendChild(b);
    });
    $("#oshiModal").classList.add("open");
    var skip = $("#oshiSkip");
    if (skip && !skip.dataset.wired) {
      skip.dataset.wired = "1";
      skip.addEventListener("click", function () { closeModal(); });
    }
  }

  function closeModal() {
    var m = $("#oshiModal");
    if (m) m.classList.remove("open");
  }

  /* ============ カウントダウン ============ */
  function getCdStyle() {
    try { return localStorage.getItem("milli-cd-style") || "pop"; } catch (e) { return "pop"; }
  }

  function getCdFeatured() {
    try { return localStorage.getItem("milli-cd-featured") || ""; } catch (e) { return ""; }
  }

  function cdLeft(item, now) {
    var diff = parseJst(item.date).getTime() - now.getTime();
    if (diff < 0) return null;
    var secs = Math.floor(diff / 1000);
    return {
      days: Math.floor(secs / 86400),
      hours: Math.floor((secs % 86400) / 3600),
      mins: Math.floor((secs % 3600) / 60),
      secs: secs % 60
    };
  }

  function initCountdown() {
    var wrap = $("#countdown");
    var rail = $("#cdRail");
    var stylesBox = $("#cdStyles");
    if (!wrap || !rail) return;
    var style = getCdStyle();
    var featuredId = getCdFeatured();
    var valid = COUNTDOWN.filter(function (c) { return cdLeft(c, jstNow()); });
    if (valid.length === 0) return;
    /* 特装カウントダウン（featured）は最優先で表示 */
    var special = valid.find(function (c) { return c.featured; });
    if (special) featuredId = special.id;
    else if (!cdItem(featuredId) || !valid.some(function (c) { return c.id === featuredId; })) {
      featuredId = valid[0].id;
    }

    var units = [["days", "cd.d"], ["hours", "cd.h"], ["mins", "cd.m"], ["secs", "cd.s"]];

    function cdItem(id) {
      return COUNTDOWN.find(function (c) { return c.id === id; });
    }

    function renderFeatured() {
      var item = cdItem(featuredId);
      if (!item) return;
      wrap.innerHTML =
        '<div class="cd-card cd-' + style + ' cd-featured' + (item.featured ? " cd-special" : "") + '" data-id="' + item.id + '">' +
        (item.featured ? '<span class="cd-badge">' + T("cd.badge") + "</span>" : "") +
        '<div class="cd-label">' + loc(item, "label") + "</div>" +
        '<div class="cd-when">' + fmtDate(parseJst(item.date)) + " " + fmtTime(parseJst(item.date)) + " " + T("cd.until") + "</div>" +
        '<div class="cd-digits">' + units.map(function (u) {
          return '<div class="cd-unit"><div class="cd-num" data-unit="' + u[0] + '">00</div><small>' + T(u[1]) + "</small></div>";
        }).join("") + "</div>" +
        (item.note ? '<div class="cd-note">' + loc(item, "note") + "</div>" : "") +
        (item.url ? '<a class="cd-link" href="' + item.url + '">' +
          (item.url.indexOf(".html") > -1 ? T("cd.detail") : T("cd.official")) + "</a>" : "") +
        '<div class="cd-actions">' +
        (item.date ? '<a class="cd-cal" href="' + gcalUrl(loc(item, "label") + "（" + loc(item, "note") + "）", item.date) + '"' + calTarget() + ">" + T("cd.addCal") + "</a>" : "") +
        "</div>" +
        "</div>";
    }

    function renderRail() {
      rail.innerHTML = valid.map(function (item) {
        return '<div class="cd-rail-wrap">' +
          '<button type="button" class="cd-rail-item' + (item.id === featuredId ? " is-active" : "") + '" data-id="' + item.id + '">' +
          '<span class="cd-label">' + loc(item, "label") + "</span>" +
          '<span class="cd-diff" data-diff></span>' +
          "</button>" +
          bmBtnHtml("cd:" + item.id, ' data-bm-kind="cd" data-bm-id="' + esc(item.id) + '"') +
          "</div>";
      }).join("");
    }

    function updateCard(card, now) {
      var item = cdItem(card.dataset.id);
      if (!item) return;
      var left = cdLeft(item, now);
      if (!left) { card.style.display = "none"; return; }
      card.style.display = "";
      if (card.classList.contains("cd-featured")) {
        $$(".cd-num", card).forEach(function (num) {
          num.textContent = pad2(left[num.dataset.unit]);
        });
      } else {
        var diff = $("[data-diff]", card);
        if (diff) diff.textContent = T("cd.remain", { days: left.days, hours: left.hours, mins: left.mins });
      }
    }

    function tick() {
      var now = jstNow();
      var left = valid.filter(function (c) { return cdLeft(c, now); });
      if (left.length === 0) {
        if (wrap) wrap.style.display = "none";
        if (rail) rail.style.display = "none";
        if (stylesBox) stylesBox.style.display = "none";
        return;
      }
      /* 表示中の項目が期限切れになったら、次に近い項目へ自動で切り替え */
      if (!cdLeft(cdItem(featuredId), now)) {
        featuredId = left[0].id;
        try { localStorage.setItem("milli-cd-featured", featuredId); } catch (err) {}
        renderFeatured();
        renderRail();
      }
      var card = $(".cd-card", wrap);
      if (card) updateCard(card, now);
      $$(".cd-rail-item", rail).forEach(function (b) { updateCard(b, now); });
    }

    if (stylesBox) {
      $$(".cd-style-btn", stylesBox).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var s = btn.dataset.style;
          try { localStorage.setItem("milli-cd-style", s); } catch (e) {}
          style = s;
          $$(".cd-style-btn", stylesBox).forEach(function (b) { b.classList.toggle("active", b === btn); });
          renderFeatured();
          tick();
        });
        btn.classList.toggle("active", btn.dataset.style === style);
      });
    }

    rail.addEventListener("click", function (e) {
      if (e.target.closest(".bm-btn")) return;
      var b = e.target.closest(".cd-rail-item");
      if (!b || b.dataset.id === featuredId) return;
      featuredId = b.dataset.id;
      try { localStorage.setItem("milli-cd-featured", featuredId); } catch (err) {}
      renderFeatured();
      renderRail();
      tick();
    });

    renderFeatured();
    renderRail();
    tick();
    setInterval(tick, 1000);
  }

  /* ============ 誕生日バナー ============ */
  function checkBirthday() {
    var banner = $("#birthdayBanner");
    if (!banner) return;
    var now = jstNow();
    var mmdd = pad2(now.getUTCMonth() + 1) + "-" + pad2(now.getUTCDate());
    var list = getMemberByDate(mmdd, "birthday");
    if (list.length === 0) return;
    var names = list.map(function (m) { return mName(m); }).join(milliLang.get() === "en" ? ", " : "・");
    banner.innerHTML = T("birthday.banner", { names: names });
    banner.classList.add("show");
  }

  /* ============ YouTubeデータ（youtube.json） ============ */
  function loadYoutubeData() {
    fetch(YOUTUBE.dataUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(renderYoutube)
      .catch(function () {
        renderYoutube(null);
      });
  }

  /* 配信ステータス（開始・終了）を10分ごとに更新 */
  function initYoutubeRefetch() {
    setInterval(function () {
      if (document.hidden) return;
      loadYoutubeData();
    }, 10 * 60000);
  }

  var lastStreams = null;

  function renderYoutube(data) {
    lastStreams = data ? (data.streams || null) : null;
    renderStreams(data ? data.streams : null);
    renderLatestVideos(data ? data.videos : null);
    renderLiveBadge(data ? data.streams : null);
    renderTodayBox();
  }

  function videoUrl(id) { return "https://milli-unishare.pages.dev/#watch=" + id; }

  function thumbUrl(id) { return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; }

  var WEEKS = ["日", "月", "火", "水", "木", "金", "土"];

  function dowLabel(i) {
    var d = T("cal.dows");
    if (Array.isArray(d)) return d[i] || WEEKS[i];
    return (d || "").split(",")[i] || WEEKS[i];
  }

  function fmtMD(d) {
    return d.getUTCMonth() + 1 + "/" + d.getUTCDate() + "(" + dowLabel(d.getUTCDay()) + ")";
  }

  function streamBucket(start) {
    var now = jstNow();
    var today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    var day = Math.round((new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) - today) / 86400000);
    if (day <= 0) return 0;
    if (day === 1) return 1;
    if (day <= 6) return 2;
    return 3;
  }

  function bucketRange(b) {
    var now = jstNow();
    var base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (b === 0) return fmtMD(base);
    if (b === 1) return fmtMD(new Date(base.getTime() + 86400000));
    if (b === 2) {
      return fmtMD(new Date(base.getTime() + 2 * 86400000)) + "〜" + fmtMD(new Date(base.getTime() + 6 * 86400000));
    }
    return fmtMD(new Date(base.getTime() + 7 * 86400000)) + "〜";
  }

  function renderStreams(streams) {
    var box = $("#streams");
    if (!box) return;
    if (!streams || streams.length === 0) {
      box.innerHTML = '<div class="placeholder">' + T("streams.none") + "</div>";
      return;
    }
    var now = jstNow();
    var sorted = streams.slice().sort(function (a, b) {
      var la = a.status === "live" ? 0 : 1;
      var lb = b.status === "live" ? 0 : 1;
      if (la !== lb) return la - lb;
      return new Date(a.scheduledStartTime || a.scheduledStart) - new Date(b.scheduledStartTime || b.scheduledStart);
    });
    var groups = [[], [], [], []];
    sorted.forEach(function (s) {
      var start = jstWallClock(s.scheduledStartTime || s.scheduledStart);
      var isLive = s.status === "live";
      if (!start.getTime() || (!isLive && start < now)) return;
      if (groups[0].length + groups[1].length + groups[2].length + groups[3].length >= YOUTUBE.maxStreams) return;
      groups[streamBucket(start)].push({ s: s, start: start });
    });
    var names = ["streams.today", "streams.tomorrow", "streams.week", "streams.later"];
    var html = "";
    groups.forEach(function (g, b) {
      if (!g.length) return;
      html += '<div class="stream-group"><h3 class="stream-group-title">' + T(names[b]) +
        ' <span class="range">' + bucketRange(b) + "</span></h3>" +
        g.map(function (it) {
          var s = it.s, m = getMember(s.memberId) || (s.memberId === "official" ? { name: T("video.official") } : null);
          var isLive = s.status === "live";
          var diff = Math.floor((it.start.getTime() - now.getTime()) / 1000);
          var soon = isLive ? "" : (diff >= 0 ? ' <span class="stream-count">' + T("streams.in", { x: hoursText(diff) }) + "</span>" : "");
          var when = isLive ? T("streams.live") : (b === 0 ? "" : fmtMD(it.start) + " ") + fmtTime(it.start);
          var cal = isLive ? "" : '<a class="stream-cal" href="' + gcalUrl(tt(s), s.scheduledStartTime || s.scheduledStart) + '"' + calTarget() + ">" + T("streams.cal") + "</a>";
          var remind = isLive ? "" : '<button type="button" class="stream-remind' + (isReminded(s.id) ? " is-active" : "") + '" data-vid="' + s.id + '" data-time="' + (s.scheduledStartTime || s.scheduledStart || "") + '" aria-label="' + T("streams.remind") + '">' + T("streams.remind") + "</button>";
          return '<div class="stream-item card">' +
            '<a class="stream-main" href="' + videoUrl(s.id) + '" target="_blank" rel="noopener">' +
            '<div class="video-thumb"><img src="' + thumbUrl(s.id) + '" alt="" loading="lazy"></div>' +
            '<div class="video-body">' +
            '<div class="video-title">' + esc(tt(s)) + (isLive ? '<span class="video-tag">LIVE</span>' : "") + "</div>" +
            '<div class="video-meta">' + (m ? mName(m) + " ・ " : "") + when + soon + "</div>" +
            "</div></a>" +
            '<div class="stream-actions">' + cal + remind + "</div>" +
            "</div>";
        }).join("") + "</div>";
    });
    box.innerHTML = html || '<div class="placeholder">' + T("streams.none") + "</div>";
    box.onclick = function (e) {
      var btn = e.target.closest(".stream-remind");
      if (!btn) return;
      e.preventDefault();
      toggleReminder(btn);
    };
  }

  /* ---------- 配信リマインド（ブラウザ通知） ---------- */
  function getReminders() {
    try { return JSON.parse(localStorage.getItem("milli-reminders") || "[]") || []; } catch (e) { return []; }
  }
  function setReminders(list) {
    try { localStorage.setItem("milli-reminders", JSON.stringify(list)); } catch (e) {}
  }
  function isReminded(vid) {
    return getReminders().some(function (r) { return r.id === vid; });
  }
  function registerReminder(btn) {
    var key = btn.dataset.vid || btn.dataset.key;
    var time = btn.dataset.time;
    if (!key || !time || isReminded(key)) return false;
    setReminders(getReminders().concat([{
      id: key,
      time: time,
      kind: btn.dataset.kind || "stream",
      title: btn.dataset.title || ""
    }]));
    btn.classList.add("is-active");
    return true;
  }
  function toggleReminder(btn) {
    if (!("Notification" in window)) {
      alert(T("notif.unsupported"));
      return;
    }
    var key = btn.dataset.vid || btn.dataset.key;
    var time = btn.dataset.time;
    if (isReminded(key)) {
      setReminders(getReminders().filter(function (r) { return r.id !== key; }));
      btn.classList.remove("is-active");
      return;
    }
    var grant = function () {
      setReminders(getReminders().concat([{
        id: key,
        time: time,
        kind: btn.dataset.kind || "stream",
        title: btn.dataset.title || ""
      }]));
      btn.classList.add("is-active");
      showRemindHelp();
      startReminderWatcher();
    };
    if (Notification.permission === "granted") grant();
    else if (Notification.permission === "denied") alert(T("notif.denied"));
    else Notification.requestPermission().then(function (p) {
      if (p === "granted") grant();
      else alert(T("notif.failed"));
    });
  }

  /* 配信予定の全件を一括でリマインド登録 */
  function initRemindAll() {
    var btn = $("#remindAllBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var box = $("#streams");
      if (!box) return;
      var btns = $$(".stream-remind", box).filter(function (b) { return !b.classList.contains("is-active"); });
      if (!btns.length) {
        showToast(T("notif.remindAllDone"));
        return;
      }
      if (!("Notification" in window)) { alert(T("notif.unsupported")); return; }
      var grant = function () {
        var n = 0;
        btns.forEach(function (b) { if (registerReminder(b)) n++; });
        showToast(T("notif.remindAllRegistered", { n: n }));
        showRemindHelp();
      };
      if (Notification.permission === "granted") grant();
      else if (Notification.permission === "denied") alert(T("notif.denied"));
      else Notification.requestPermission().then(function (p) {
        if (p === "granted") grant();
        else alert(T("notif.failed"));
      });
    });
  }
  /* 初回リマインド登録時のみ表示する案内ポップアップ */
  function showRemindHelp() {
    var seen = false;
    try { seen = localStorage.getItem("milli-remind-seen") === "1"; } catch (e) {}
    if (seen) return;
    try { localStorage.setItem("milli-remind-seen", "1"); } catch (e) {}
    showToast(T("notif.help"));
  }

  function showToast(html) {
    var old = $(".toast");
    if (old) old.remove();
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = html + '<span class="toast-hint">' + T("toast.close") + "</span>";
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    var close = function () {
      t.classList.remove("show");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
    };
    t.addEventListener("click", close);
    setTimeout(close, 8000);
  }

  var reminderWatcherTimer = null;
  function startReminderWatcher() {
    if (reminderWatcherTimer || !("Notification" in window) || Notification.permission !== "granted") return;
    reminderWatcherTimer = setInterval(function () {
      var now = Date.now();
      var list = getReminders();
      if (!list.length) return;
      var rest = [];
      list.forEach(function (r) {
        var t = Date.parse(r.time);
        if (!isFinite(t) || isNaN(t)) return;
        var lead = r.kind === "event" ? 0 : 5 * 60000;
        if (now >= t - lead && now <= t + 10 * 60000) {
          try {
            if (r.kind === "event") {
              new Notification(T("notif.eventTitle"), {
                body: T("notif.eventBody", { title: r.title || "" }),
                icon: "images/icon/Milli%20Orbis-192.png"
              });
            } else {
              new Notification(T("notif.streamTitle"), {
                body: T("notif.streamBody"),
                icon: "images/icon/Milli%20Orbis-192.png"
              });
            }
          } catch (e) {}
        } else {
          rest.push(r);
        }
      });
      setReminders(rest);
    }, 30000);
  }

  function initReminderWatcher() {
    startReminderWatcher();
  }

  /* ---------- グッズ締切リマインド（5日前/当日） ---------- */
  function getGoodsReminders() {
    try { return JSON.parse(localStorage.getItem("milli-goods-reminders") || "[]") || []; } catch (e) { return []; }
  }
  function setGoodsReminders(list) {
    try { localStorage.setItem("milli-goods-reminders", JSON.stringify(list)); } catch (e) {}
  }
  function isGoodsReminded(gid) {
    return getGoodsReminders().some(function (r) { return r.id === gid; });
  }
  function toggleGoodsReminder(btn) {
    if (!("Notification" in window)) { alert(T("notif.unsupported")); return; }
    var gid = btn.dataset.goodsId;
    var time = btn.dataset.goodsTime;
    var title = btn.dataset.goodsTitle || "";
    if (!gid || !time) return;
    if (isGoodsReminded(gid)) {
      setGoodsReminders(getGoodsReminders().filter(function (r) { return r.id !== gid; }));
      btn.classList.remove("is-active");
      showToast("🔕 グッズ通知を解除しました");
      return;
    }
    var grant = function () {
      if (isGoodsReminded(gid)) return;
      setGoodsReminders(getGoodsReminders().concat([{ id: gid, time: time, title: title }]));
      btn.classList.add("is-active");
      showToast("🔔 締切通知を登録しました<br><span style='font-size:.78rem'>5日前と当日に通知します。通知はこのサイトを開いている間に届きます。</span>");
      startGoodsReminderWatcher();
    };
    if (Notification.permission === "granted") grant();
    else if (Notification.permission === "denied") alert(T("notif.denied"));
    else Notification.requestPermission().then(function (p) {
      if (p === "granted") grant();
      else alert(T("notif.failed"));
    });
  }
  var goodsReminderTimer = null;
  function startGoodsReminderWatcher() {
    if (goodsReminderTimer || !("Notification" in window) || Notification.permission !== "granted") return;
    goodsReminderTimer = setInterval(function () {
      var now = Date.now();
      var list = getGoodsReminders();
      if (!list.length) return;
      var jst = jstNow();
      var y = jst.getUTCFullYear(), mo = jst.getUTCMonth(), d = jst.getUTCDate();
      var todayJst = new Date(Date.UTC(y, mo, d));
      var sentKey = "milli-goods-notif-sent-" + y + "-" + pad2(mo + 1) + "-" + pad2(d);
      var sent = [];
      try { sent = JSON.parse(localStorage.getItem(sentKey) || "[]") || []; } catch (e) {}
      var changed = false;
      list.forEach(function (r) {
        var t = Date.parse(r.time);
        if (!isFinite(t) || isNaN(t)) return;
        var orderDay = new Date(t);
        // normalize to JST date
        var oj = new Date(orderDay.getTime() + 9 * 3600000);
        var oy = oj.getUTCFullYear(), om = oj.getUTCMonth(), od = oj.getUTCDate();
        var orderJst = new Date(Date.UTC(oy, om, od));
        var diffDays = Math.round((orderJst - todayJst) / 86400000);
        if (diffDays === 5 || diffDays === 0) {
          var key = r.id + ":" + diffDays;
          if (sent.indexOf(key) >= 0) return;
          sent.push(key);
          try {
            var body = diffDays === 5 ? "5日後に受注終了: " + r.title : "本日受注終了: " + r.title;
            new Notification(diffDays === 5 ? "🔔 グッズ締切 5日前" : "🔔 グッズ締切 当日", { body: body, icon: "images/icon/Milli%20Orbis-192.png" });
          } catch (e) {}
        }
        if (t < now - 86400000) changed = true;
      });
      try { localStorage.setItem(sentKey, JSON.stringify(sent)); } catch (e) {}
      if (changed) {
        var rest = list.filter(function (r) { var t = Date.parse(r.time); return isFinite(t) && t >= now - 86400000; });
        setGoodsReminders(rest);
      }
    }, 30000);
  }
  function initGoodsReminderWatcher() {
    startGoodsReminderWatcher();
  }
  try { window.getGoodsReminders = getGoodsReminders; window.isGoodsReminded = isGoodsReminded; window.toggleGoodsReminder = toggleGoodsReminder; window.startGoodsReminderWatcher = startGoodsReminderWatcher; } catch(e) {}

  /* ---------- 通知ベル（当日イベント・誕生日・カウントダウンの自動通知） ---------- */
  function notifEnabled() {
    try { return localStorage.getItem("milli-notif") === "on"; } catch (e) { return false; }
  }
  function setNotifEnabled(on) {
    try { localStorage.setItem("milli-notif", on ? "on" : "off"); } catch (e) {}
    var bells = $$("#notifBell, #mobileNotifBell");
    bells.forEach(function (b) {
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-label", on ? T("header.bellOn") : T("header.bellOff"));
      b.title = on ? T("header.bellOnTitle") : T("header.bellOffTitle");
    });
  }
  function initNotifBell() {
    var bells = $$("#notifBell, #mobileNotifBell");
    if (!bells.length) return;
    setNotifEnabled(notifEnabled());
    bells.forEach(function (b) { b.addEventListener("click", function () {
      if (!("Notification" in window)) { alert(T("notif.unsupported")); return; }
      if (notifEnabled()) {
        setNotifEnabled(false);
        showToast(T("notif.off"));
        return;
      }
      var grant = function () {
        setNotifEnabled(true);
        showToast(T("notif.on"));
        checkDailyNotif();
        startReminderWatcher();
      };
      if (Notification.permission === "granted") grant();
      else if (Notification.permission === "denied") alert(T("notif.denied"));
      else Notification.requestPermission().then(function (p) {
        if (p === "granted") grant();
        else alert(T("notif.onFailed"));
      });
    }); });
  }
  function checkDailyNotif() {
    if (!("Notification" in window) || Notification.permission !== "granted" || !notifEnabled()) return;
    var y = jstNow().getUTCFullYear(), mo = jstNow().getUTCMonth(), d = jstNow().getUTCDate();
    var sentKey = "milli-notif-sent-" + y + "-" + pad2(mo + 1) + "-" + pad2(d);
    var sent = [];
    try { sent = JSON.parse(localStorage.getItem(sentKey) || "[]") || []; } catch (e) {}
    var fire = function (key, title, body) {
      if (sent.indexOf(key) >= 0) return;
      sent.push(key);
      try { new Notification(title, { body: body, icon: "images/icon/Milli%20Orbis-192.png" }); } catch (e) {}
    };
    var t0 = new Date(Date.UTC(y, mo, d));
    for (var off = 0; off < 2; off++) {
      var t = new Date(t0.getTime() + off * 86400000);
      eventsOn(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()).forEach(function (it) {
        var label = evTypeLabel(it.ev.type);
        var m = it.ev.member ? getMember(it.ev.member) : null;
        var name = m ? mName(m) : "";
        var key = "ev" + off + ":" + it.ev.type + ":" + (it.ev.title || name || "");
        var body = (off === 1 ? T("notif.tomorrowBody", { title: loc(it.ev, "title") || name + "の" + label }) : T("notif.todayBody", { title: loc(it.ev, "title") || name + "の" + label }));
        fire(key, off === 1 ? T("notif.tomorrowTitle") : T("notif.todayTitle"), body);
      });
    }
    COUNTDOWN.forEach(function (c) {
      var t = parseJst(c.date);
      if (t.getUTCFullYear() === y && t.getUTCMonth() === mo && t.getUTCDate() === d) {
        fire("cd:" + c.id, T("notif.eventTitle"), T("notif.todayBody", { title: loc(c, "label") }));
      }
    });
    try { localStorage.setItem(sentKey, JSON.stringify(sent)); } catch (e) {}
  }

  /* ---------- Googleカレンダー追加URL ---------- */
  function gcalUrl(title, startIso) {
    var start = jstWallClock(startIso);
    if (!start.getTime()) return "#";
    var end = new Date(start.getTime() + 2 * 3600000);
    if (isTouchMobile()) return icsEventUrl(title, start, end, T("cal.icsDesc"));
    var fmt = function (d) {
      return "" + d.getUTCFullYear() +
        pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + "T" +
        pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds());
    };
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
      encodeURIComponent(title) +
      "&dates=" + fmt(start) + "/" + fmt(end) +
      "&details=" + encodeURIComponent(T("cal.icsDesc"));
  }

  /* イベント用: 終日イベント（当日 00:00〜翌日 00:00） */
  function gcalAllDayUrl(title, date, desc) {
    if (isTouchMobile()) return icsAllDayUrl(title, date, desc);
    var fmt = function (d) {
      return "" + d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
    };
    var end = new Date(date.getTime() + 86400000);
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
      encodeURIComponent(title) +
      "&dates=" + fmt(date) + "/" + fmt(end) +
      "&details=" + encodeURIComponent("Milli Orbis（ミリプロ非公式ファンポータル）のイベントカレンダーから追加" + (desc ? "  " + desc : ""));
  }

  /* ---------- スマホ向け: ネイティブカレンダー（.ics）追加URL ---------- */
  function isTouchMobile() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPod|iPad|Android/i.test(ua)) return true;
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
    return false;
  }

  function calTarget() {
    return isTouchMobile() ? "" : ' target="_blank" rel="noopener"';
  }

  function icsEscape(t) {
    return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function icsHref(ics) {
    var body = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Milli Orbis//JA//EN\r\nCALSCALE:GREGORIAN\r\n" +
      "BEGIN:VEVENT\r\n" + ics + "END:VEVENT\r\nEND:VCALENDAR";
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
      return "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
    }
    return URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  }

  function icsEventUrl(title, start, end, desc) {
    var fmt = function (d) {
      return "" + d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + "T" +
        pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds());
    };
    var stamp = new Date();
    return icsHref(
      "UID:mo-" + stamp.getTime() + "-" + Math.floor(Math.random() * 1e6) + "@milli-orbis\r\n" +
      "DTSTAMP:" + fmt(stamp) + "\r\n" +
      "DTSTART:" + fmt(start) + "\r\n" +
      "DTEND:" + fmt(end) + "\r\n" +
      "SUMMARY:" + icsEscape(title) + "\r\n" +
      "DESCRIPTION:" + icsEscape(desc || "") + "\r\n"
    );
  }

  function icsAllDayUrl(title, date, desc) {
    var fmt = function (d) {
      return "" + d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
    };
    var end = new Date(date.getTime() + 86400000);
    var stamp = new Date();
    return icsHref(
      "UID:mo-" + stamp.getTime() + "-" + Math.floor(Math.random() * 1e6) + "@milli-orbis\r\n" +
      "DTSTAMP:" + fmt(stamp) + "T000000\r\n" +
      "DTSTART;VALUE=DATE:" + fmt(date) + "\r\n" +
      "DTEND;VALUE=DATE:" + fmt(end) + "\r\n" +
      "SUMMARY:" + icsEscape(title) + "\r\n" +
      "DESCRIPTION:" + icsEscape(desc || "") + "\r\n"
    );
  }

  function hoursText(secs) {
    var d = Math.floor(secs / 86400);
    var h = Math.floor((secs % 86400) / 3600);
    var min = Math.floor((secs % 3600) / 60);
    if (d > 0) return d + T("unit.d") + (h > 0 ? h + T("unit.h") : "");
    if (h > 0) return h + T("unit.h") + (min > 0 ? min + T("unit.m") : "");
    if (min > 0) return min + T("unit.m");
    return T("unit.soon");
  }

  function relTime(d) {
    var min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 1) return T("rel.just");
    if (min < 60) return T("rel.min", { n: min });
    var h = Math.floor(min / 60);
    if (h < 24) return T("rel.hour", { n: h });
    var days = Math.floor(h / 24);
    if (days < 7) return T("rel.day", { n: days });
    return fmtDate(toJst(d));
  }

  function renderLatestVideos(videos) {
    var box = $("#latestVideos");
    if (!box) return;
    if (!videos || videos.length === 0) {
      box.innerHTML = '<div class="placeholder">' + T("videos.none") + "</div>";
      return;
    }
    var vids = videos.slice(0, YOUTUBE.maxVideos);
    box.innerHTML = vids.map(function (v) {
      var m = getMember(v.memberId) || (v.memberId === "official" ? { name: T("video.official") } : null);
      var typeLabel = v.type === "short" ? "Short" : (v.type === "live" || v.live === true) ? T("videos.stream") : "";
      var published = new Date(v.publishedAt);
      return '<a class="video-card card" href="' + videoUrl(v.id) + '" target="_blank" rel="noopener">' +
        '<div class="video-thumb"><img src="' + thumbUrl(v.id) + '" alt="" loading="lazy"></div>' +
        '<div class="video-body"><div class="video-title">' + esc(tt(v)) +
        (typeLabel ? '<span class="video-tag">' + typeLabel + "</span>" : "") + "</div>" +
        '<div class="video-meta">' + (m ? mName(m) + " ・ " : "") + relTime(published) + "</div></div></a>";
    }).join("");
  }

  function renderLiveBadge(streams) {
    var badge = $("#liveBadge");
    if (!badge) return;
    if (!streams) return;
    var live = streams.find(function (s) { return s.status === "live"; });
    if (!live) return;
    badge.classList.add("show");
    badge.href = videoUrl(live.id);
    badge.title = T("videos.liveBadge", { title: live.title });
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* グループアイコン（所属グループごと。該当なしは空） */
  function groupIconImg(m) {
    var p = m && GROUP_ICON[m.gen];
    return p ? '<img class="group-icon" src="' + esc(p) + '" alt=""> ' : "";
  }

  /* ============ ニュース ============ */
  function renderNews() {
    var box = $("#newsList");
    if (!box) return;
    var EXPANDED = 4;
    var html = NEWS.map(function (n, i) {
      var more = n.url ? '<a class="btn btn-ghost news-more" href="' + n.url + '" target="_blank" rel="noopener">' + T("news.more") + "</a>" : "";
      var bm = bmBtnHtml("nw:" + n.date + ":" + loc(n, "title"),
        ' data-bm-kind="news" data-bm-date="' + n.date + '" data-bm-tag="' + esc(loc(n, "tag")) + '"' +
        ' data-bm-title="' + esc(loc(n, "title")) + '" data-bm-desc="' + esc(loc(n, "desc") || "") + '"' +
        ' data-bm-url="' + esc(n.url || "") + '"');
      var thumb = n.image ? '<a class="news-thumb-wrap wide" href="' + esc(n.url || "#") + '" target="_blank" rel="noopener"><img class="news-thumb" src="' + esc(n.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest(\'.news-thumb-wrap\').style.display=\'none\'"></a>' : "";
      var head = '<div class="news-head"><span class="news-tag">' + esc(loc(n, "tag")) + "</span>" +
        '<span class="news-date">' + fmtDate(new Date(n.date)) + "</span>" + bm + "</div>";
      var textBody = '<div class="news-text"><div class="news-title">' + esc(loc(n, "title")) + "</div>" +
        '<div class="news-desc">' + esc(loc(n, "desc")) + "</div></div>";
      var cls = "news-item card" + (n.image ? " has-thumb" : "") + (i >= EXPANDED ? " collapsed" : "");
      return '<div class="' + cls + '" data-news-idx="' + i + '">' + head + textBody + thumb + more + "</div>";
    }).join("");
    var hidden = NEWS.length - EXPANDED;
    if (hidden > 0) {
      html += '<button class="news-toggle" type="button" data-collapsed="1">' +
        T("news.toggle", { count: hidden }) + "</button>";
    }
    box.innerHTML = html;
    var toggle = box.querySelector(".news-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var collapsed = toggle.dataset.collapsed === "1";
        box.querySelectorAll(".news-item.collapsed").forEach(function (el) {
          el.classList.toggle("show", collapsed);
          el.classList.toggle("collapsed", !collapsed);
        });
        toggle.dataset.collapsed = collapsed ? "0" : "1";
        toggle.textContent = collapsed ? T("news.collapse") : T("news.toggle", { count: hidden });
      });
    }
    box.querySelectorAll(".news-item .news-title, .news-item .news-desc").forEach(function (el) {
      el.addEventListener("click", function () {
        el.closest(".news-item").classList.toggle("desc-open");
      });
    });
  }

  /* ============ X埋め込み ============ */
  function renderXPosts() {
    var box = $("#xposts");
    if (!box) return;
    var urls = X_POSTS.filter(function (u) { return u; });
    if (urls.length === 0) return;
    box.innerHTML = urls.map(function (u) {
      return '<div class="xpost-card"><blockquote class="twitter-tweet" data-dnt="true"><a href="' + u + '"></a></blockquote></div>';
    }).join("");
    var w = document.createElement("script");
    w.src = "https://platform.twitter.com/widgets.js";
    w.async = true;
    document.body.appendChild(w);
  }

  /* ============ メンバーカード（Member Guide） ============ */
  function memberCardDeco(m) {
    var d = m.deco;
    if (!d) return "";
    var keys = [];
    if (d.label && DECO_SVG[d.label]) keys.push(d.label);
    if (d.floats && d.floats.length && keys.length < 2 && DECO_SVG[d.floats[0].k]) keys.push(d.floats[0].k);
    return '<span class="card-deco" aria-hidden="true">' + keys.map(function (k, i) {
      return '<span class="cd-' + (i === 0 ? "main" : "sub") + '">' + DECO_SVG[k] + "</span>";
    }).join("") + "</span>";
  }

  function renderMembers() {
    var box = $("#memberGrid");
    if (!box) return;
    box.innerHTML = MEMBERS.map(function (m) {
      var tags = [m.tags.stream, m.tags.clip, m.tags.art].filter(Boolean)
        .map(function (t) { return '<span>' + esc(t) + "</span>"; }).join("");
      var cardLink = m.id + ".html";
      var mark = m.icon
        ? '<span class="member-mark"><img src="' + m.icon + '" alt="' + esc(mName(m)) + '"></span>'
        : (m.img
          ? '<span class="member-mark"><img src="' + m.img + '" alt="' + esc(mName(m)) + '"></span>'
          : '<span class="member-mark">' + m.fanMark + "</span>");
      return '<a class="member-card card" href="' + cardLink + '" style="--mc:' + m.color + ";--mc-soft:" + m.subColor + '">' +
        memberCardDeco(m) +
        mark +
        '<span class="member-name">' + mName(m) + "</span>" +
        '<span class="member-gen">' + groupIconImg(m) + esc(loc(m, "gen")) + "</span>" +
        '<span class="member-catch">' + esc(loc(m, "catch")) + "</span>" +
        '<span class="member-tags">' + tags + "</span>" +
        '<span class="btn">' + T("members.detail") + "</span>" +
        "</a>";
    }).join("");
  }

  /* ============ グループ・期生まとめ ============ */
  function renderGroups() {
    var box = $("#groupList");
    if (!box) return;
    box.innerHTML = GROUP_INFO.map(function (g) {
      var memberChips = g.members.map(function (gm) {
        var m = memberById(gm.id);
        if (!m) return "";
        var note = gm.note ? '<span class="gp-note">' + esc(gm.note) + "</span>" : "";
        return '<a class="gp-member" href="' + m.id + '.html" style="--mc:' + m.color + ";--mc-soft:" + m.subColor + '">' +
          '<span class="gp-member-face" style="background:' + m.subColor + '">' +
          '<img src="' + (m.icon || m.img) + '" alt="' + esc(mName(m)) + '" loading="lazy">' +
          "</span>" +
          '<span class="gp-member-name">' + esc(mName(m)) + "</span>" + note +
          "</a>";
      }).join("");
      var badge = g.badge === "new" ? '<span class="gp-badge">' + T("groups.new") + "</span>" : "";
      var icon = g.icon ? '<img class="gp-icon" src="' + esc(g.icon) + '" alt="" loading="lazy">' : "";
      return '<div class="gp-card card">' +
        '<div class="gp-head">' + icon +
        '<div class="gp-title-wrap"><h3 class="gp-name">' + esc(loc(g, "name")) + "</h3>" +
        "</div>" + badge + "</div>" +
        '<p class="gp-desc">' + esc(loc(g, "desc")) + "</p>" +
        '<p class="gp-label">' + T("groups.members") + "</p>" +
        '<div class="gp-members">' + memberChips + "</div>" +
        "</div>";
    }).join("");
  }

  function memberById(id) {
    return MEMBERS.filter(function (m) { return m.id === id; })[0];
  }

  /* ============ クレジット（モーダル表示） ============ */
  function renderCredits() {
    var box = $("#creditsList");
    if (!box || typeof CREDITS === "undefined") return;
    box.innerHTML = CREDITS.map(function (c) {
      var links = (c.links || []).map(function (l) {
        return '<a class="credits-link" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>";
      }).join("");
      return '<div class="credits-item">' +
        '<div class="credits-name">' + esc(c.name) + "</div>" +
        '<div class="credits-role">' + esc(loc(c, "role")) + "</div>" +
        (links ? '<div class="credits-links">' + links + "</div>" : "") +
        "</div>";
    }).join("");
  }

  function initCredits() {
    var modal = $("#creditsModal");
    if (!modal) return;
    var btn = $("#creditsBtn");
    if (btn) btn.addEventListener("click", function () {
      renderCredits();
      modal.classList.add("open");
    });
    var closeBtn = $("#creditsClose");
    if (closeBtn) closeBtn.addEventListener("click", function () { modal.classList.remove("open"); });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.classList.remove("open"); });
  }

  /* ============ メンバー比較表（members.html） ============ */
  function renderMemberCompare() {
    var box = $("#memberCompare");
    if (!box) return;
    var oshi = getOshi();
    var rows = MEMBERS.map(function (m) {
      var h = /身長(\d+)cm/.exec(m.profile || "");
      var age = /年齢(\d+)歳/.exec(m.profile || "");
      var bd = m.birthday ? m.birthday.replace("-", "/") : T("cmp.private");
      var debut = m.debut || "";
      var years = debut ? (jstNow().getUTCFullYear() - parseInt(debut.slice(0, 4), 10)) : -1;
      return '<tr class="' + (oshi === m.id ? "is-oshi" : "") + '" style="--mc:' + m.color + '">' +
        '<td class="cmp-name"><span class="cmp-dot" style="background:' + m.color + '"></span>' + esc(mName(m)) + "</td>" +
        "<td>" + groupIconImg(m) + esc(loc(m, "gen")) + "</td>" +
        "<td>" + (debut ? esc(debut) + (years >= 0 ? '<span class="cmp-sub">' + T("cmp.years", { n: years }) + "</span>" : "") : "—") + "</td>" +
        "<td>" + esc(bd) + "</td>" +
        "<td>" + (h ? h[1] + "cm" : "—") + "</td>" +
        "<td>" + (age ? T("cmp.ageFmt", { n: age[1] }) : "—") + "</td>" +
        "<td>" + esc(loc(m, "fanName") || "—") + "</td>" +
        '<td class="cmp-catch">' + esc(loc(m, "catch") || "—") + "</td>" +
        "</tr>";
    }).join("");
    box.innerHTML =
      '<div class="cmp-head"><h2>' + T("cmp.title") + "</h2>" +
      "<p>" + T("cmp.desc") + "</p></div>" +
      '<div class="cmp-scroll"><table class="cmp-table"><thead><tr>' +
      "<th>" + T("cmp.member") + "</th><th>" + T("cmp.gen") + "</th><th>" + T("cmp.joined") + "</th><th>" + T("cmp.birthday") + "</th><th>" + T("cmp.height") + "</th><th>" + T("cmp.age") + "</th><th>" + T("cmp.fanName") + "</th><th>" + T("cmp.catch") + "</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  /* ============ ランチャー ============ */
  function renderLaunchers() {
    var box = $("#launcherGrid");
    if (!box) return;
    box.innerHTML = LAUNCHERS.map(function (l) {
      var badge = l.icon
        ? '<span class="launcher-icon"><img src="' + l.icon + '" alt=""></span>'
        : '<span class="shape-badge" style="background:linear-gradient(135deg,' + l.shape.grad[0] + "," + l.shape.grad[1] + ')">' + l.shape.char + "</span>";
      var inner = badge +
        "<h3>" + esc(l.name) + "</h3><p>" + esc(loc(l, "desc")) + "</p>" +
        (l.url ? '<span class="btn">' + T("launcher.open") + "</span>" : '<span class="prep-badge">' + T("launcher.soon") + "</span>");
      if (l.url) return '<a class="launcher-card card" href="' + l.url + '" target="_blank" rel="noopener">' + inner + "</a>";
      return '<div class="launcher-card card">' + inner + "</div>";
    }).join("");
  }

  /* ============ カレンダー ============ */
  var calViewMonth = (function () {
    var now = jstNow();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  })();
  var calRefresh = null;

  function evColor(type) {
    return type === "birthday" ? "#ef6a8d" : type === "anniversary" ? "#f2a93b" : "#6a9ef0";
  }

  function evTypeLabel(type) {
    return type === "birthday" ? T("ev.birthday") : type === "anniversary" ? T("ev.anniv") : T("ev.event");
  }

  function eventOccurrences(ym) {
    /* ym = {y, mo}: 表示中の月。指定時はその月の分も含める（過去月閲覧対応）。
       未指定時は「今日以降の次の1回」のみ（todayBox・通知用） */
    var list = [];
    EVENTS.forEach(function (e) {
      if (e.date) {
        var t = parseJst(e.date);
        if (ym) {
          if (t.getUTCFullYear() === ym.y && t.getUTCMonth() === ym.mo) list.push({ ev: e, date: t });
        } else if (t >= new Date(Date.UTC(jstNow().getUTCFullYear(), jstNow().getUTCMonth(), jstNow().getUTCDate()))) {
          list.push({ ev: e, date: t });
        }
        return;
      }
      if (e.member) {
        var m = getMember(e.member);
        if (!m) return;
        var slice = e.type === "birthday" ? m.birthday : (e.type === "anniversary" ? m.debut.slice(5) : null);
        if (!slice) return;
        if (ym) {
          var mm = parseInt(slice.slice(0, 2), 10) - 1;
          var dd = parseInt(slice.slice(3), 10);
          if (mm === ym.mo) list.push({ ev: e, date: new Date(Date.UTC(ym.y, mm, dd)) });
        } else if (e.type === "birthday" && m.birthday) {
          list.push({ ev: e, date: nextOccurrence(m.birthday) });
        } else if (e.type === "anniversary" && m.debut) {
          list.push({ ev: e, date: nextOccurrence(m.debut.slice(5)) });
        }
      }
    });
    return list.sort(function (a, b) { return a.date - b.date; });
  }

  /* 推しフィルター（カレンダー・グッズ共通、ローカル記憶） */
  function oshiFilterOn() {
    try { return localStorage.getItem("milli-oshifilter") === "1"; } catch (e) { return false; }
  }

  function setOshiFilter(on) {
    try { localStorage.setItem("milli-oshifilter", on ? "1" : "0"); } catch (e) {}
    ["calOshiFilter", "goodsOshiFilter"].forEach(function (id) {
      var b = $("#" + id);
      if (b) b.classList.toggle("active", on);
    });
  }

  function toggleOshiFilter() {
    if (!getOshi()) {
      showToast(T("oshi.please"));
      return;
    }
    setOshiFilter(!oshiFilterOn());
    if (calRefresh) calRefresh();
    renderGoods();
  }

  function filteredOccurrences(ym) {
    var list = eventOccurrences(ym);
    if (!oshiFilterOn()) return list;
    var oshi = getOshi();
    if (!oshi) return list;
    return list.filter(function (it) {
      return !it.ev.member || it.ev.member === oshi;
    });
  }

  function eventsOn(y, mo, d) {
    return filteredOccurrences({ y: y, mo: mo }).filter(function (it) {
      return it.date.getUTCFullYear() === y && it.date.getUTCMonth() === mo && it.date.getUTCDate() === d;
    });
  }

  function initCalendar() {
    var listBox = $("#eventList");
    var gridBox = $("#calendarGrid");
    var title = $("#calTitle");
    var listBtn = $("#calListBtn");
    var gridBtn = $("#calGridBtn");
    var modal = $("#eventModal");
    if (!listBox) return;

    function evLink(url, label) {
      if (!url) return "";
      var external = url.indexOf(".html") === -1 ? ' target="_blank" rel="noopener"' : "";
      return '<a class="btn btn-ghost" style="margin-left:auto" href="' + url + '"' + external + ">" + label + "</a>";
    }

    /* イベント用: 当日9:00の通知ボタン + 終日カレンダー追加 */
    function calActionsHtml(ev, d, detailLabel) {
      var key = "ev" + d.getTime();
      var when = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)).toISOString();
      var ymd = d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
      var bm = bmBtnHtml("ev:" + ev.type + ":" + loc(ev, "title"),
        ' data-bm-kind="event" data-bm-type="' + esc(ev.type) + '" data-bm-title="' + esc(loc(ev, "title")) + '"' +
        ' data-bm-date="' + ymd + '" data-bm-url="' + esc(ev.url || "") + '"');
      var remind = '<button type="button" class="stream-remind' + (isReminded(key) ? " is-active" : "") + '"' +
        ' data-key="' + key + '" data-time="' + when + '" data-kind="event" data-title="' + esc(loc(ev, "title")) + '"' +
        ' aria-label="' + T("cal.notify") + '">🔔 ' + T("cal.notify") + "</button>";
      var cal = '<a class="stream-cal" href="' + gcalAllDayUrl(loc(ev, "title"), d, loc(ev, "desc")) + '"' + calTarget() + ">" + T("cal.cal") + "</a>";
      return '<div class="cal-actions">' + bm + remind + cal + evLink(ev.url, detailLabel) + "</div>";
    }

    function renderList() {
      var y = calViewMonth.getUTCFullYear();
      var mo = calViewMonth.getUTCMonth();
      var items = filteredOccurrences({ y: y, mo: mo }).filter(function (it) {
        return it.date.getUTCFullYear() === y && it.date.getUTCMonth() === mo;
      });
      listBox.innerHTML = items.length ? items.map(function (it) {
        var d = it.date;
        return '<div class="cal-item card"><div class="cal-date-box"><b>' + d.getUTCDate() + "</b><small>" + T("cal.monthFmt", { m: d.getUTCMonth() + 1 }) + "</small></div>" +
          '<div><div class="cal-type" style="--ec:' + evColor(it.ev.type) + '">' + evTypeLabel(it.ev.type) + "</div>" +
          '<div class="cal-title2">' + esc(loc(it.ev, "title")) + "</div>" +
          (it.ev.desc ? '<div class="video-meta">' + esc(loc(it.ev, "desc")) + "</div>" : "") + "</div>" +
          calActionsHtml(it.ev, it.date, T("cal.detail")) + "</div>";
      }).join("") : '<div class="placeholder">' + T("cal.none") + "</div>";
    }

    function renderGrid() {
      var y = calViewMonth.getUTCFullYear();
      var mo = calViewMonth.getUTCMonth();
      var first = new Date(Date.UTC(y, mo, 1));
      var daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      var mmdd = pad2(mo + 1);
      var today = jstNow();
      var cells = [];

      for (var i = 0; i < first.getUTCDay(); i++) {
        cells.push('<div class="cal-day empty"></div>');
      }

      for (var d = 1; d <= daysInMonth; d++) {
        var evs = eventsOn(y, mo, d);
        var dow = new Date(Date.UTC(y, mo, d)).getUTCDay();
        var cls = "cal-day";
        if (dow === 0) cls += " sunday";
        if (dow === 6) cls += " saturday";
        if (d === today.getUTCDate() && mo === today.getUTCMonth() && y === today.getUTCFullYear()) cls += " today";
        if (evs.length) cls += " has-event";
        var badges = evs.slice(0, 2).map(function (it) {
          return '<span class="cal-ebadge" style="--ec:' + evColor(it.ev.type) + '">' + esc(loc(it.ev, "title")) + "</span>";
        }).join("");
        var more = evs.length > 2 ? '<span class="cal-more">+</span>' : "";
        cells.push('<div class="' + cls + '" data-ymd="' + y + "-" + mmdd + "-" + pad2(d) + '">' +
          "<b>" + d + "</b>" + badges + more + "</div>");
      }

      gridBox.innerHTML = T("cal.dows").map(function (w, i) {
        return '<div class="cal-dow' + (i === 0 ? ' sunday' : i === 6 ? ' saturday' : '') + '">' + w + "</div>";
      }).join("") + cells.join("");
      title.textContent = T("cal.titleFmt", { y: y, m: mo + 1 });
    }

    function openDayModal(ymd) {
      if (!modal) return;
      var p = ymd.split("-");
      var y = parseInt(p[0], 10), mo = parseInt(p[1], 10) - 1, d = parseInt(p[2], 10);
      var evs = eventsOn(y, mo, d);
      if (!evs.length) return;
      $("#evmDate").textContent = T("cal.evmDate", { y: y, m: mo + 1, d: d });
      $("#evmList").innerHTML = evs.map(function (it) {
        return '<div class="evm-item card"><span class="cal-type" style="--ec:' + evColor(it.ev.type) + '">' + evTypeLabel(it.ev.type) + "</span>" +
          '<div class="evm-title">' + esc(loc(it.ev, "title")) + "</div>" +
          (it.ev.desc ? '<div class="evm-desc">' + esc(loc(it.ev, "desc")) + "</div>" : "") +
          calActionsHtml(it.ev, it.date, T("cal.detailView")) + "</div>";
      }).join("");
      modal.classList.add("open");
    }

    function closeDayModal() {
      if (modal) modal.classList.remove("open");
    }

    function setView(view) {
      listBox.style.display = view === "list" ? "grid" : "none";
      gridBox.style.display = view === "grid" ? "grid" : "none";
      listBtn.classList.toggle("active", view === "list");
      gridBtn.classList.toggle("active", view === "grid");
    }

    listBtn.addEventListener("click", function () { setView("list"); });
    gridBtn.addEventListener("click", function () { setView("grid"); });
    $("#calPrev").addEventListener("click", function () {
      calViewMonth = new Date(Date.UTC(calViewMonth.getUTCFullYear(), calViewMonth.getUTCMonth() - 1, 1));
      renderList();
      renderGrid();
    });
    $("#calNext").addEventListener("click", function () {
      calViewMonth = new Date(Date.UTC(calViewMonth.getUTCFullYear(), calViewMonth.getUTCMonth() + 1, 1));
      renderList();
      renderGrid();
    });
    if (modal) {
      modal.addEventListener("click", function (e) { if (e.target === modal) closeDayModal(); });
      var closeBtn = $("#evmClose");
      if (closeBtn) closeBtn.addEventListener("click", closeDayModal);
    }
    gridBox.addEventListener("click", function (e) {
      var cell = e.target.closest(".cal-day.has-event");
      if (cell) openDayModal(cell.dataset.ymd);
    });
    var remindHandler = function (e) {
      var btn = e.target.closest(".stream-remind");
      if (!btn) return;
      e.preventDefault();
      toggleReminder(btn);
    };
    listBox.addEventListener("click", remindHandler);
    var evmList = $("#evmList");
    if (evmList) evmList.addEventListener("click", remindHandler);

    renderList();
    renderGrid();
    setView("list");
    calRefresh = function () { renderList(); renderGrid(); };
  }

  /* ============ ヒストリー ============ */
  function renderHistory() {
    var box = $("#historyList");
    if (!box) return;
    box.innerHTML = HISTORY.map(function (h) {
      return '<div class="timeline-item"><div class="timeline-date">' + esc(h.date) + "</div>" +
        '<div class="timeline-title">' + esc(loc(h, "title")) + "</div>" +
        (h.desc ? '<div class="timeline-desc">' + esc(loc(h, "desc")) + "</div>" : "") + "</div>";
    }).join("");
  }

  /* ============ リンク集 ============ */
  function renderLinks() {
    var box = $("#linkGrid");
    if (!box) return;
    box.innerHTML = LINKS.map(function (l) {
      return '<a class="link-card card" href="' + l.url + '" target="_blank" rel="noopener">' +
        '<div class="link-name">' + esc(loc(l, "name")) + "</div>" +
        '<div class="link-desc">' + esc(loc(l, "desc")) + "</div></a>";
    }).join("");
  }

  /* ============ スクロールリビール ============ */
  function initReveal() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  }

  /* ============ タレントページ ============ */
  function renderTalentPage() {
    var body = document.body;
    var memberId = body.dataset.member;
    if (!memberId) return;
    var m = getMember(memberId);
    if (!m) return;

    var hero = $("#talentHero");
    if (hero) {
      hero.style.setProperty("--mc", m.color);
      hero.style.setProperty("--mc-soft", m.subColor);
    }
    document.body.style.setProperty("--mc", m.color);
    document.body.style.setProperty("--mc-soft", m.subColor);
    var cardStyle = "style=\"--mc:" + m.color + ";--mc-soft:" + m.subColor + "\"";

    var bc = $("#bcName");
    if (bc) bc.textContent = mName(m);
    document.title = mName(m) + " | Milli Orbis";

    var tCatch = $("#tCatch");
    if (tCatch) tCatch.textContent = loc(m, "catch");
    var tGen = $("#tGen");
    if (tGen) tGen.textContent = loc(m, "gen");
    var tGenIcon = $("#tGenIcon");
    if (tGenIcon) {
      var gp = GROUP_ICON[m.gen];
      if (gp) { tGenIcon.src = gp; tGenIcon.hidden = false; }
    }

    /* 挨拶ボイス */
    var voice = $("#voiceSection");
    if (voice) {
      if (m.voice) {
        voice.innerHTML = '<div class="voice-box card profile-card"><div><h3>' + T("voice.title") + "</h3>" +
          '<button type="button" class="voice-btn" id="voiceBtn">' + T("voice.play") + "</button></div>" +
          '<div class="voice-note">' + T("voice.note") + "</div>" +
          '<audio id="voiceAudio" src="' + m.voice + '" preload="none"></audio></div>';
        var btn = $("#voiceBtn");
        var audio = $("#voiceAudio");
        btn.addEventListener("click", function () {
          if (audio.paused) { audio.play(); btn.classList.add("playing"); btn.textContent = T("voice.stop"); }
          else { audio.pause(); audio.currentTime = 0; btn.classList.remove("playing"); btn.textContent = T("voice.play"); }
        });
        audio.addEventListener("ended", function () {
          btn.classList.remove("playing");
          btn.textContent = T("voice.play");
        });
      } else {
        voice.innerHTML = '<div class="placeholder">' + T("voice.soon") + "</div>";
      }
    }

    /* プロフィール */
    var profile = $("#profileSection");
    if (profile) {
      profile.innerHTML =
        '<div class="talent-layout"><div class="profile-card card" ' + cardStyle + '><h3>' + T("profile.title") + "</h3>" +
        '<table class="profile-table"><tr><th>' + T("profile.belong") + "</th><td>" + groupIconImg(m) + esc(loc(m, "gen")) + "</td></tr>" +
        (m.birthday ? "<tr><th>" + T("profile.birthday") + "</th><td>" + T("profile.birthdayFmt", { m: m.birthday.slice(0, 2), d: parseInt(m.birthday.slice(3), 10) }) + "</td></tr>" : "") +
        (m.debut ? "<tr><th>" + T("profile.debut") + "</th><td>" + esc(m.debut) + "</td></tr>" : "") +
        (m.fanName ? "<tr><th>" + T("profile.fanName") + "</th><td>" + esc(loc(m, "fanName")) + "</td></tr>" : "") +
        (m.fanMark ? "<tr><th>" + T("profile.fanMark") + "</th><td>" +
          (m.icon ? '<span class="fanmark-img"><img src="' + esc(m.icon) + '" alt=""></span>' : "") +
          m.fanMark + "</td></tr>" : "") +
        (m.calls ? "<tr><th>" + T("profile.calls") + "</th><td>" + esc(loc(m, "calls")) + "</td></tr>" : "") +
        "<tr><th>" + T("profile.intro") + "</th><td>" + esc(loc(m, "profile")) + "</td></tr>" +
        "<tr><th>" + T("profile.skills") + "</th><td>" + esc(loc(m, "skills")) + "</td></tr></table></div>" +

        '<div class="profile-card card"><h3>' + T("profile.likes") + "</h3><p class=\"lead\">" + esc(loc(m, "likes") || T("profile.na")) + "</p>" +
        "<h3>" + T("profile.dislikes") + "</h3><p class='lead'>" + esc(loc(m, "dislikes") || T("profile.na")) + "</p></div></div>";
    }

    /* 語録 */
    var phrases = $("#phrasesSection");
    if (phrases && m.phrases && m.phrases.length) {
      phrases.innerHTML = '<div class="profile-card card" ' + cardStyle + '><h3>' + T("phrases.title") + "</h3>" +
        '<div class="phrase-list">' + loc(m, "phrases").map(function (p) {
          return '<div class="phrase-card">' + esc(p) + "</div>";
        }).join("") + "</div></div>";
    }

    /* 歴史・実績 */
    var detail = $("#detailSection");
    if (detail && m.achievements && m.achievements.length) {
      detail.innerHTML = '<div class="profile-card card"><h3>' + T("detail.title") + "</h3><div class=\"timeline\">" +
        loc(m, "achievements").map(function (a) {
          return '<div class="timeline-item"><div class="timeline-title">' + esc(a) + "</div></div>";
        }).join("") + "</div></div>";
    }

    /* 人気動画（手動選定） */
    var videos = $("#videoSection");
    if (videos) {
      if (m.featuredVideos && m.featuredVideos.length) {
        videos.innerHTML = '<div class="profile-card card"><h3>' + T("videos.title2") + "</h3><div class=\"grid grid-2\">" +
          m.featuredVideos.map(function (vid) {
            return '<div class="video-embed"><iframe src="https://www.youtube.com/embed/' + vid +
              '" loading="lazy" allowfullscreen title="' + T("videos.title2") + '"></iframe></div>';
          }).join("") + "</div></div>";
      } else {
        videos.innerHTML = '<div class="placeholder">' + T("videos.soon") + "</div>";
      }
    }

    /* 配信タグ */
    var tags = $("#tagSection");
    if (tags) {
      var items = [];
      if (m.tags.stream) items.push([T("tags.stream"), m.tags.stream]);
      if (m.tags.clip) items.push([T("tags.clip"), m.tags.clip]);
      if (m.tags.art) items.push([T("tags.art"), m.tags.art]);
      if (items.length) {
        tags.innerHTML = '<div class="profile-card card"><h3>' + T("tags.title") + "</h3><div class=\"tag-row\">" +
          items.map(function (t) {
            return '<a class="tag-btn" href="https://x.com/search?q=' + encodeURIComponent("#" + t[1]) + '" target="_blank" rel="noopener">' +
              t[0] + ": #" + esc(t[1]) + "</a>";
          }).join("") + "</div></div>";
      }
    }

    /* SNSリンク */
    var links = $("#linkSection");
    if (links) {
      var sns = [];
      if (m.links.yt) sns.push(["YouTube", m.links.yt]);
      if (m.links.x) sns.push(["X", m.links.x]);
      if (m.links.tiktok) sns.push(["TikTok", m.links.tiktok]);
      if (sns.length) {
        links.innerHTML = '<div class="profile-card card"><h3>' + T("tlinks.title") + "</h3><div class=\"sns-row\">" +
          sns.map(function (s) {
            return '<a class="sns-btn" href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + "</a>";
          }).join("") + "</div></div>";
      }
    }
  }

  /* ============ タレントイントロ演出 ============ */
  function initIntro() {
    var overlay = $("#introOverlay");
    if (!overlay) return;
    var memberId = overlay.dataset.member;
    var m = getMember(memberId);
    /* イントロは推しカラーではなく、タレント本人のカラーで演出する */
    if (m && m.color) {
      var ov = overlay.style;
      ov.setProperty("--accent", m.color);
      ov.setProperty("--accent-soft", m.subColor);
      ov.setProperty("--accent-deep", shade(m.color, -35));
    }
    var audio = $("#introAudio", overlay);
    var skipBtn = $("#introSkip", overlay);
    var catchBox = $("#introCatch", overlay);

    /* キャッチコピーを一文字ずつ表示する準備（音声に合わせて順に出現） */
    if (m && m.catchphrase && catchBox) {
      var delay = 2.1;
      catchBox.innerHTML = loc(m, "catchphrase").split("").map(function (c) {
        if (c === " ") { delay += 0.05; return " "; }
        var d = delay;
        delay += 0.05;
        return '<span class="c-char" style="--cd:' + d.toFixed(2) + 's">' + c + "</span>";
      }).join("");
    }

    function closeIntro() {
      overlay.classList.add("close");
      setTimeout(function () {
        overlay.classList.remove("show", "play", "close");
        if (audio) { audio.pause(); audio.currentTime = 0; }
      }, 1000);
    }

    function startPlay() {
      overlay.classList.remove("close");
      overlay.classList.add("show", "play");
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        closeIntro();
      };
      if (audio && m && (m.introVoice || m.voice)) {
        var started = false;
        var safetyTimer = null;
        var begin = function () {
          if (done) return;
          started = true;
          overlay.classList.remove("standby");
          audio.addEventListener("ended", function onEnded() {
            if (safetyTimer) clearTimeout(safetyTimer);
            finish();
          });
          var onMeta = function () {
            if (isFinite(audio.duration) && audio.duration > 0) {
              if (safetyTimer) clearTimeout(safetyTimer);
              // 鹿乃まほろ(14秒)など長尺ボイスでも最後まで再生しきってから遷移
              safetyTimer = setTimeout(finish, audio.duration * 1000 + 1500);
            }
          };
          if (audio.readyState >= 1) onMeta();
          else audio.addEventListener("loadedmetadata", onMeta);
          /* 音声が読み込めない場合の安全タイマー。最長ボイス(まほろ14s)でも切れないよう20秒に */
          safetyTimer = setTimeout(finish, 20000);
        };
        var tryPlay = function (force) {
          if (started && !force) return;
          try {
            if (force) {
              audio.currentTime = 0;
              started = false;
            }
            var p = audio.play();
            if (p && p.then) {
              p.then(begin).catch(function () { overlay.classList.add("standby"); });
            } else {
              begin();
            }
          } catch (e) { overlay.classList.add("standby"); }
        };
        /* 自動再生がブラウザ制限でブロックされた場合は、最初の操作を起点に再挑戦 */
        var retry = function () { tryPlay(); };
        document.addEventListener("pointerdown", retry, { once: true });
        document.addEventListener("keydown", retry, { once: true });
        /* まだ再生できない間は「▶ タップで再生」を表示し、タップで開始 */
        var startBtn = $("#introStartBtn", overlay);
        if (startBtn) {
          startBtn.addEventListener("click", function () {
            overlay.classList.remove("standby");
            tryPlay();
          });
        }
        /* 挨拶のリプレイボタン（いつでもタップで最初から再生） */
        var voiceBtn = $("#introVoiceBtn", overlay);
        if (voiceBtn) {
          voiceBtn.addEventListener("click", function () {
            overlay.classList.remove("standby");
            tryPlay(true);
          });
        }
        tryPlay();
      } else {
        setTimeout(finish, 7000);
      }
    }

    if (skipBtn) skipBtn.addEventListener("click", closeIntro);

    /* ヒーローの「▶ イントロを見る」ボタンからいつでも再再生 */
    var replayBtn = $("#introBtn");
    if (replayBtn) replayBtn.addEventListener("click", startPlay);

    /* タレントページを開くたびに自動再生（スキップは右上） */
    overlay.classList.add("show");
    startPlay();
  }

  /* ============ 最新グッズ ============ */
  function goodsTile(g) {
    if (g.image) {
      return '<img src="' + esc(g.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;" onerror="this.onerror=null;this.src=\'data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><text x=%2750%27 y=%2755%27 text-anchor=%27middle%27 font-size=%2720%27 fill=%27%2375b1c0%27>?</text></svg>\'">';
    }
    if (GOODS_ICON[g.kind]) return GOODS_ICON[g.kind];
    return '<span class="tile-char">' + esc((g.name || "?").charAt(0)) + "</span>";
  }

  var goodsCarTimer = null;

  function renderGoods() {
    var box = $("#goodsTrack");
    if (!box || !GOODS.length) return;
    var list = GOODS;
    // 裏側で販売期間をチェック: available===false のものは非表示（常設は permanent で常に残す）
    // 最新グッズ欄には販売終了品を出さない（まもなく終了バッジは表示継続）
    function isAvailable(g) {
      if (g.status === "soldout") return false;
      if (g.permanent) return true;
      if (g.available === false) return false;
      return true;
    }
    list = list.filter(isAvailable);
    if (oshiFilterOn()) {
      var oshi = getOshi();
      if (oshi) {
        var filtered = GOODS.filter(function (g) { return isAvailable(g) && g.memberId === oshi; });
        // 常設の全員向け（TCG等）は常に含める
        var permanentAll = GOODS.filter(function (g) { return isAvailable(g) && g.permanent && g.memberId === ""; });
        permanentAll.forEach(function (p) { if (filtered.indexOf(p) === -1) filtered.push(p); });
        // 該当タレントの常設ウェルカムボイスがあれば含める（上記で既に memberId===oshi で含まれる）
        // それでも空なら常設全員向けのみを表示
        if (filtered.length === 0) {
          filtered = permanentAll.length ? permanentAll : GOODS.filter(function (g) { return isAvailable(g) && g.memberId === ""; }).slice(0, 2);
        }
        list = filtered;
      }
    } else {
      list = GOODS.filter(isAvailable);
    }
    box.innerHTML = list.map(function (g) {
      var m = g.memberId ? getMember(g.memberId) : null;
      var label = m ? mName(m) : (loc(g, "memberLabel") || T("t.allLabel"));
      var color = m ? m.color : "#75b1c0";
      var old = g.oldPrice ? '<s>¥' + g.oldPrice.toLocaleString("ja-JP") + "</s> " : "";
      return '<a class="goods-card card" href="' + g.url + '" target="_blank" rel="noopener" style="--gc:' + color + '">' +
        '<span class="goods-tile" aria-hidden="true">' + goodsTile(g) + "</span>" +
        (g.tag ? '<span class="goods-tag">' + esc(g.tag) + "</span>" : "") +
        '<span class="goods-body">' +
        '<span class="goods-member">' + esc(label) + "</span>" +
        '<span class="goods-name">' + esc(loc(g, "name")) + "</span>" +
        '<span class="goods-price">' + old + "¥" + g.price.toLocaleString("ja-JP") + "</span>" +
        '<span class="btn btn-ghost">' + T("goods.shop") + "</span>" +
        "</span></a>";
    }).join("");
    initGoodsCarousel(box);
  }

  function initGoodsCarousel(box) {
    var section = $("#goods");
    if (!section) return;
    var viewport = $(".car-viewport", section);
    var prev = $("#goodsPrev");
    var next = $("#goodsNext");
    var dots = $("#goodsDots");
    if (!box.children.length) return;
    /* 再描画（推しフィルタ切替など）でもリスナーが二重登録されないよう状態を section に保持 */
    var state = section._carState || (section._carState = { idx: 0, pv: 3, n: 0 });
    state.n = box.children.length;

    function perView() {
      var w = viewport ? viewport.clientWidth : 0;
      if (!w) return 3;
      return w < 560 ? 1 : w < 900 ? 2 : 3;
    }

    function renderDots() {
      if (!dots) return;
      var pages = Math.max(1, Math.ceil(state.n / state.pv));
      dots.innerHTML = "";
      for (var i = 0; i < pages; i++) {
        (function (i2) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "car-dot";
          b.setAttribute("role", "tab");
          b.setAttribute("aria-label", T("goods.dotsAria", { n: i2 + 1, total: pages }));
          b.addEventListener("click", function () {
            go(Math.min(i2 * state.pv, state.n - state.pv), true);
            restart();
          });
          dots.appendChild(b);
        })(i);
      }
    }

    function go(i, animate) {
      if (viewport) viewport.style.setProperty("--pv", state.pv);
      var max = Math.max(0, state.n - state.pv);
      state.idx = Math.max(0, Math.min(i, max));
      box.style.transition = animate === false ? "none" : "transform .45s ease";
      box.style.transform = "translateX(-" + (state.idx * 100 / state.pv) + "%)";
      if (prev) prev.disabled = state.idx <= 0;
      if (next) next.disabled = state.idx >= max;
      if (dots) {
        var pages = Math.max(1, Math.ceil(state.n / state.pv));
        var active = Math.min(Math.floor(state.idx / state.pv), pages - 1);
        Array.prototype.forEach.call(dots.children, function (d, di) {
          d.classList.toggle("active", di === active);
          d.setAttribute("aria-selected", di === active ? "true" : "false");
        });
      }
    }

    function restart() {
      if (goodsCarTimer) clearInterval(goodsCarTimer);
      goodsCarTimer = setInterval(function () {
        go(state.idx + 1 >= state.n ? 0 : state.idx + 1, true);
      }, 5000);
    }

    function stop() {
      if (goodsCarTimer) { clearInterval(goodsCarTimer); goodsCarTimer = null; }
    }

    if (!section._carReady) {
      section._carReady = true;
      if (prev) prev.addEventListener("click", function () { go(state.idx - 1, true); restart(); });
      if (next) next.addEventListener("click", function () { go(state.idx + 1, true); restart(); });
      section.addEventListener("mouseenter", stop);
      section.addEventListener("mouseleave", restart);
      section.addEventListener("touchstart", stop, { passive: true });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop(); else restart();
      });
      window.addEventListener("resize", function () {
        state.pv = perView();
        renderDots();
        go(state.idx, false);
      });
    } else {
      state.idx = 0;
    }

    state.pv = perView();
    renderDots();
    go(0, false);
    restart();
  }

  /* ============ フロートアクション（Xシェア・トップへ） ============ */
  function initFloatActions() {
    var shareBtn = $("#shareXBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        var u = encodeURIComponent(location.href);
        var t = encodeURIComponent(T("share.text", { title: document.title }));
        window.open("https://twitter.com/intent/tweet?url=" + u + "&text=" + t, "_blank", "noopener,width=600,height=520");
      });
    }
    var topBtn = $("#toTopBtn");
    if (topBtn) {
      var onScroll = function () {
        var y = window.pageYOffset || document.documentElement.scrollTop;
        topBtn.classList.toggle("show", y > 600);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      topBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  /* ============ ダークモード ============ */
  function initTheme() {
    var btns = $$("#themeToggle, #mobileThemeToggle");
    if (!btns.length) return;
    var sync = function () {
      var dark = document.documentElement.dataset.theme === "dark";
      btns.forEach(function (b) {
        b.textContent = dark ? "☀️" : "🌙";
        b.setAttribute("aria-label", dark ? T("header.themeLight") : T("header.themeDark"));
      });
    };
    sync();
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dark = document.documentElement.dataset.theme === "dark";
        if (dark) {
          delete document.documentElement.dataset.theme;
          try { localStorage.setItem("milli-theme", "light"); } catch (e) {}
        } else {
          document.documentElement.dataset.theme = "dark";
          try { localStorage.setItem("milli-theme", "dark"); } catch (e) {}
        }
        sync();
        applyOshi(getOshi());
      });
    });
  }

  /* ============ Milli Games ゲーム紹介 ============ */
  function renderGameFeature() {
    var box = $("#gameFeature");
    if (!box || !GAME_FEATURE || !GAME_FEATURE.length) return;
    box.innerHTML = GAME_FEATURE.map(function (f) {
      var link = f.url ? '<a class="game-feature-link" href="' + f.url + '" target="_blank" rel="noopener">' + T("game.more") + "</a>"
        : '<span class="game-feature-link is-disabled">' + T("game.soon") + "</span>";
      return '<div class="game-feature">' +
        (f.icon ? '<div class="game-feature-icon"><img src="' + f.icon + '" alt="" loading="lazy"></div>' : "") +
        '<div class="game-feature-body">' +
        '<span class="game-feature-tag">' + esc(loc(f, "tag") || T("game.tag")) + "</span>" +
        '<div class="game-feature-game">' + esc(f.game) + "</div>" +
        (f.desc ? '<div class="game-feature-desc">' + esc(loc(f, "desc")) + "</div>" : "") +
        link +
        "</div>" +
        "</div>";
    }).join("");
  }

  /* ============ おすすめ楽曲（ホーム） ============ */
  function renderRecommendedSongs() {
    var box = $("#recommendList");
    if (!box) return;
    var songs = (typeof SONGS !== "undefined" ? SONGS : window.SONGS);
    if (!songs || !songs.covers) {
      box.parentElement.style.display = "none";
      return;
    }
    var picks = [];
    var seen = {};
    function normKey(s) { return String(s).toLowerCase().replace(/[\s　]/g, ""); }
    function tryAdd(title, id, memberIds, en) {
      var k = normKey(title);
      if (!k || seen[k]) return false;
      seen[k] = true;
      picks.push({ title: title, id: id, memberIds: memberIds, en: en });
      return true;
    }
    (songs.official || []).slice(0, 6).forEach(function (v) { tryAdd(v.title, v.id, v.members || [], v.en); });
    (songs.covers || []).forEach(function (g) {
      if (g.urls.length) tryAdd(g.title, g.urls[0].id, g.urls.map(function (u) { return u.memberId; }), g.en);
    });
    // 推しバイアス: ローカル推し + 共有の最推し/推しメンバーの曲を優先して4枠を埋める
    var oshiIds = {};
    try {
      var localOshi = localStorage.getItem("milli-oshi");
      if (localOshi) oshiIds[localOshi] = 1;
    } catch (e) {}
    var shared = getSharedOshi();
    if (shared) {
      if (shared.ultimateOshi) { var t0 = mpTalentToOshi(shared.ultimateOshi); if (t0) oshiIds[t0] = 1; }
      (shared.favorites || []).forEach(function (fid) { var t = mpTalentToOshi(fid); if (t) oshiIds[t] = 1; });
    }
    var hasOshi = false;
    for (var oid in oshiIds) { if (oshiIds[oid]) { hasOshi = true; break; } }
    if (hasOshi) {
      var oshiPicks = [];
      var normalPicks = [];
      picks.forEach(function (p) {
        var hit = p.memberIds.some(function (mid) { return oshiIds[mid]; });
        (hit ? oshiPicks : normalPicks).push(p);
      });
      picks = oshiPicks.concat(normalPicks).slice(0, 4);
    } else {
      picks = picks.slice(0, 4);
    }
    if (!picks.length) {
      box.parentElement.style.display = "none";
      return;
    }
    box.parentElement.style.display = "";
    box.innerHTML = picks.map(function (p) {
      var chips = p.memberIds.length
        ? p.memberIds.slice(0, 3).map(function (mid) {
          var m = getMember(mid);
          return '<span class="song-member-chip" style="--mc:' + (m ? m.color : "#75b1c0") + '">' + esc(m ? mName(m) : mid) + "</span>";
        }).join("")
        : '<span class="song-member-chip" style="--mc:#75b1c0">' + T("songs.officialLabel") + "</span>";
      if (p.memberIds.length > 3) chips += '<span class="song-member-more">+' + (p.memberIds.length - 3) + "</span>";
      return '<a class="song-card card recommend-card" href="https://milli-unishare.pages.dev/#watch=' + p.id + '" target="_blank" rel="noopener">' +
        '<img class="song-thumb" src="https://i.ytimg.com/vi/' + p.id + '/mqdefault.jpg" alt="" loading="lazy">' +
        '<div class="song-title">' + esc(tt(p)) + "</div>" +
        '<div class="song-members">' + chips + "</div>" +
        '<span class="btn btn-ghost">' + T("recommend.uniWatch") + "</span></a>";
    }).join("");
  }

  /* ============ ミリプロ検定（ホームの今日の1問） ============ */
  function renderQuizTeaser() {
    var box = $("#quizTeaserBox");
    if (!box) return;
    if (typeof QUIZ === "undefined" || !QUIZ.length) {
      box.parentElement.style.display = "none";
      return;
    }
    var q = QUIZ[Math.floor(Math.random() * QUIZ.length)];
    var qloc = loc(q, "q");
    var optsLoc = loc(q, "opts");
    box.innerHTML =
      '<div class="quiz-card card quiz-teaser">' +
      '<div class="quiz-teaser-head"><h3>' + T("quiz.todayQ") + "</h3><span class=\"quiz-teaser-badge\">" + T("quiz.totalBadge", { n: QUIZ.length }) + "</span></div>" +
      '<p class="quiz-q">' + esc(qloc) + "</p>" +
      '<div class="quiz-opts">' +
      optsLoc.map(function (o, i) {
        return '<button type="button" class="quiz-opt" data-i="' + i + '">' + esc(o) + "</button>";
      }).join("") +
      "</div>" +
      '<div class="quiz-explain quiz-teaser-explain" style="display:none;"></div>' +
      '<div class="quiz-teaser-actions">' +
      '<a class="btn" href="quiz.html">' + T("quiz.quick") + "</a>" +
      '<a class="btn btn-ghost" href="quiz.html?mode=pro">' + T("quiz.pro", { n: QUIZ.length }) + "</a>" +
      '<a class="recommend-link" href="quiz.html">' + T("quiz.page") + "</a>" +
      "</div></div>";
    var opts = box.querySelectorAll(".quiz-opt");
    opts.forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        var picked = parseInt(b.dataset.i, 10);
        var correct = picked === q.a;
        opts.forEach(function (o) {
          o.disabled = true;
          if (parseInt(o.dataset.i, 10) === q.a) o.classList.add("is-correct");
          else if (parseInt(o.dataset.i, 10) === picked) o.classList.add("is-wrong");
        });
        var ex = box.querySelector(".quiz-teaser-explain");
        ex.style.display = "block";
        ex.innerHTML = (correct ? T("quiz.correct") : T("quiz.wrong", { answer: esc(optsLoc[q.a]) })) + "<p>" + esc(loc(q, "exp")) + "</p>";
      });
    });
  }

  /* ============ PWA: サービスワーカー登録 ============ */
  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var host = location.hostname;
    if (location.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1") return;
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  /* ============ アカウント連携: ホームのようこそ表示 ============ */
  function initAccount() {
    var w = $("#mpWelcome");
    if (!w) return;
    if (typeof onMilliproAuth !== "function") { w.style.display = "none"; return; }
    onMilliproAuth(function (uid) {
      if (uid && typeof completeMilliproLogin === "function") {
        completeMilliproLogin(uid).then(renderWelcome);
      } else {
        var w = $("#mpWelcome");
        if (w) { w.classList.remove("show"); w.style.display = "none"; }
      }
    });
  }

  function renderWelcome() {
    var w = $("#mpWelcome");
    if (!w) return;
    var info = (typeof mpProfileInfo === "function") ? mpProfileInfo() : null;
    if (!info || (!info.pid && !info.name && !info.icon)) { w.classList.remove("show"); w.style.display = "none"; return; }
    var icon = "";
    if (info.icon) {
      icon = String(info.icon).indexOf("data:image/") === 0
        ? '<img src="' + esc(info.icon) + '" alt="">'
        : esc(info.icon);
    }
    w.innerHTML =
      '<span class="mp-w-icon">' + icon + "</span>" +
      '<span class="mp-w-text">' + T("welcome.hello", { name: esc(info.name || info.pid), pid: esc(info.pid || "—") }) + "</span>";
    w.classList.remove("show");
    void w.offsetWidth;
    w.classList.add("show");
    w.addEventListener("animationend", function h() {
      w.classList.remove("show");
      w.removeEventListener("animationend", h);
    });
  }

  /* 今日のミリプロボックス（誕生日・当日イベント・当日配信を自動まとめ） */
  function renderTodayBox() {
    var box = $("#todayBox");
    if (!box) return;
    var now = jstNow();
    var mmdd = pad2(now.getUTCMonth() + 1) + "-" + pad2(now.getUTCDate());
    var sameDay = function (d) {
      return d && d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
    };
    var items = [];
    getMemberByDate(mmdd, "birthday").forEach(function (m) {
      items.push(T("today.birthday", { name: esc(mName(m)) }));
    });
    getMemberByDate(mmdd, "anniversary").forEach(function (m) {
      items.push(T("today.anniv", { name: esc(mName(m)) }));
    });
    eventOccurrences().forEach(function (it) {
      if (it.ev.type !== "event" || !sameDay(it.date)) return;
      var link = it.ev.url ? '<a href="' + esc(it.ev.url) + '" target="_blank" rel="noopener">' + esc(loc(it.ev, "title")) + "</a>" : esc(loc(it.ev, "title"));
      items.push("🎊 " + link);
    });
    (lastStreams || []).forEach(function (s) {
      var start = jstWallClock(s.scheduledStartTime || s.scheduledStart);
      if (!sameDay(start)) return;
      /* 開始済みの予定は「📺 〜時」で出し続けない（配信中のみ表示） */
      if (s.status !== "live" && start <= now) return;
      var m = getMember(s.memberId) || (s.memberId === "official" ? { name: "ミリプロ公式" } : null);
      var label = s.status === "live" ? T("today.live") : T("today.stream", { time: fmtTime(start) });
      items.push(label + " " + esc(tt(s)) + (m ? "（" + esc(mName(m)) + "）" : ""));
    });
    if (!items.length) { box.style.display = "none"; box.innerHTML = ""; return; }
    box.style.display = "block";
    box.innerHTML = '<h3 class="today-box-title">' + T("today.title") + "</h3><ul class=\"today-list\">" +
      items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>";
  }

  /* ============ 起動 ============ */
  function boot() {
    applyOshi(getOshi());
    initHeader();
    initTheme();
    initCountdown();
    checkBirthday();
    renderTodayBox();
    renderFavBox();
    initAccount();
    loadYoutubeData();
    initYoutubeRefetch();
    renderNews();
    renderXPosts();
    renderMembers();
    renderGroups();
    renderMemberCompare();
    initCredits();
    renderLaunchers();
    renderGoods();
    renderGameFeature();
    renderRecommendedSongs();
    renderQuizTeaser();
    initCalendar();
    renderHistory();
    renderLinks();
    renderTalentPage();
    initIntro();
    initReveal();
    initOnboarding();
    initFloatActions();
    initReminderWatcher();
    initGoodsReminderWatcher();
    initRemindAll();
    initNotifBell();
    checkDailyNotif();
    initServiceWorker();
    ["calOshiFilter", "goodsOshiFilter"].forEach(function (id) {
      var b = $("#" + id);
      if (b) b.addEventListener("click", toggleOshiFilter);
    });
    // お問い合わせハブ導線（フッター＋ドロワー）を有効化
    try { if (window.ContactHub) window.ContactHub.inject(); } catch (e) {}
    setOshiFilter(oshiFilterOn());
  }

  // 外部(カーソル統合UI)から呼べるよう公開
  try { window.getOshi = getOshi; window.setOshi = setOshi; window.applyOshi = applyOshi; } catch(e) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
