/* ============================================
   songs-master.js — 曲まとめページ（元曲から探す）
   依存: data/songs.js, data/songs-extra.js, data/song-master.js,
         data/karaoke.js, scripts/song-data.js
   元曲（カバー・歌枠・公式オリジナル曲）を一覧表示し、
   タップすると歌っているタレントと動画リンクを展開表示する。
   ============================================ */
(function () {
  "use strict";

  var data = typeof SONGS !== "undefined" ? SONGS : window.SONGS;
  var extra = typeof SONGS_EXTRA !== "undefined" ? SONGS_EXTRA : (window.SONGS_EXTRA || {});
  var master = (typeof SONG_MASTER !== "undefined" ? SONG_MASTER : (window.SONG_MASTER || {})).songs || {};
  var autoKaraoke = (typeof KARAOKE !== "undefined" ? KARAOKE : (window.KARAOKE || [])) || [];
  var meta = extra.meta || {};
  var SD = window.SongData;
  var MEMBERS_ALL = (typeof MEMBERS !== "undefined" && MEMBERS) ? MEMBERS : [];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return SD.esc(s); }
  var PLAY_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var STAR_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.9-5 4.8 1.3 6.8L12 18.2 5.9 21.2l1.3-6.8-5-4.8 6.8-.9z"/></svg>';

  /* お気に入り☆ボタン（曲まとめカード右上） */
  function favStarHtml(key, entryAttrs) {
    var on = typeof MilliFav !== "undefined" && MilliFav.isFav(key);
    return '<button type="button" class="fav-star sm-fav-star' + (on ? " on" : "") + '" aria-pressed="' + on + '" aria-label="' + T("fav.aria") + '" title="' + T("fav.aria") + '" data-fav-key="' + esc(key) + '"' + (entryAttrs || "") + ">" + STAR_SVG + "</button>";
  }

  function songFavAttrs(key, title, sub, thumb) {
    return ' data-fav-kind="song" data-fav-title="' + esc(title) + '" data-fav-sub="' + esc(sub || "") + '" data-fav-thumb="' + esc(thumb || "") + '"';
  }

  var listBox = $("smList");
  if (!listBox) return;

  var search = $("smSearch");
  var countEl = $("smCount");
  var keyword = "";

  /* 歌枠（自動＋手動）をマージし、カバー曲リストを構築 */
  var karaokeStreams = SD.mergeKaraoke(autoKaraoke, extra.karaoke || []);
  var coverData = SD.buildCoverList(data, karaokeStreams);
  var coverList = coverData.list;

  /* ---- 元曲一覧を構築（カバー＋歌枠由来の曲） ---- */
  var originals = coverList.map(function (g) {
    return {
      key: g.key,
      kind: "cover",
      title: g.title,
      en: g.en,
      info: SD.songInfo(meta, master, g.key),
      urls: g.urls
    };
  });

  /* ---- 公式オリジナル曲も元曲として含める ---- */
  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function cleanOfficialTitle(t) {
    var s = String(t || "").replace(/【[^】]*】/g, "").trim();
    MEMBERS_ALL.forEach(function (m) {
      var nm = escapeRe(m.name);
      s = s.replace(new RegExp("\\s*[/／]\\s*" + nm + "\\s*（[^）]*）?\\s*$"), "");
      s = s.replace(new RegExp("\\s*[/／]\\s*" + nm + "\\s*\\([^)]*\\)?\\s*$"), "");
    });
    s = s.replace(/\s*[/／]\s*(Official\s*MV|Official\s*Music\s*Video|Million\s*Production|official).*$/i, "");
    s = s.replace(/\s*（official）\s*$/i, "").replace(/\s*\(official[^)]*\)\s*$/i, "");
    return s.trim();
  }
  function thumbUrl(id) {
    return "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg";
  }
  (data.official || []).forEach(function (v) {
    var members = (v.members && v.members.length) ? v.members : ["official"];
    originals.push({
      key: "of:" + v.id,
      kind: "official",
      title: cleanOfficialTitle(v.title),
      en: v.en,
      info: null,
      cover: thumbUrl(v.id),
      officialId: v.id,
      urls: members.map(function (mid) {
        return { id: v.id, memberId: mid, publishedAt: v.publishedAt, official: true };
      })
    });
  });

  /* 新しい順（カバー/歌枠は最新歌唱日、公式は公開日） */
  originals.sort(function (a, b) {
    var na = Math.max.apply(null, a.urls.map(function (u) { return u.publishedAt || ""; }));
    var nb = Math.max.apply(null, b.urls.map(function (u) { return u.publishedAt || ""; }));
    return na > nb ? -1 : 1;
  });

  /* ---- 表示 ---- */
  function memberSearchText(m) {
    if (!m) return "";
    return [m.name, m.nameEn, m.fanName, m.calls].filter(Boolean).join(" ");
  }

  function matchKeyword(text) {
    if (!keyword) return true;
    return SD.normKana(text).indexOf(keyword) !== -1;
  }

  /* 検索ハイライト: 一致文字列を推し色で強調 */
  function hlColor() {
    try {
      var oshi = localStorage.getItem("milli-oshi");
      if (oshi) return SD.chipColor(oshi);
    } catch (e) { /* localStorage 不可時はデフォルト色 */ }
    return "#e8590c";
  }

  function highlight(text) {
    if (!keyword || !text) return esc(text);
    var raw = String(text);
    var norm = SD.normKana(raw).toLowerCase();
    var kw = keyword.toLowerCase();
    var out = "";
    var i = 0;
    var idx;
    while ((idx = norm.indexOf(kw, i)) !== -1) {
      out += esc(raw.slice(i, idx)) +
        '<mark class="song-hl" style="--hlc:' + hlColor() + '">' + esc(raw.slice(idx, idx + kw.length)) + "</mark>";
      i = idx + kw.length;
    }
    return out + esc(raw.slice(i));
  }

  function chipHtml(id) {
    return '<span class="song-member-chip" style="--mc:' + SD.chipColor(id) + '">' + highlight(SD.memberLabel(id)) + "</span>";
  }

  function jacketSrc(o) {
    return o.kind === "official" ? (o.cover || "") : (o.info && o.info.cover ? o.info.cover : "");
  }

  function jacketHtml(o) {
    var src = jacketSrc(o);
    if (src) {
      return '<div class="sm-jacket-wrap"><img class="sm-jacket" src="' + esc(src) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="sm-jacket-none" style="display:none">♪</div></div>';
    }
    return '<div class="sm-jacket-wrap"><div class="sm-jacket-none">♪</div></div>';
  }

  function playInWrap(wrap, id, start) {
    if (!wrap) return;
    var src = id ? "https://www.youtube.com/embed/" + id + "?autoplay=1" + (start ? "&start=" + start : "") : "";
    if (!src) return;
    wrap.classList.add("open");
    wrap.innerHTML = '<iframe src="' + src + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>';
  }

  function versionHtml(u) {
    var href = SD.videoUrl(u.id, u.start);
    var badge = u.karaoke ? '<span class="song-kind song-kind-karaoke">' + T("songs.karaokeBadge") + "</span>"
      : (u.official ? '<span class="song-kind song-kind-official">' + T("sm.officialBadge") + "</span>" : "");
    var ts = u.karaoke && u.start ? '<span class="song-ts">' + SD.fmtTs(u.start) + "〜" + (u.end ? SD.fmtTs(u.end) : "") + "</span>" : "";
    var vdate = u.publishedAt ? '<span class="song-vdate">' + esc(u.publishedAt) + "</span>" : "";
    return '<div class="sm-version">' +
      '<button type="button" class="sm-play" data-vid="' + u.id + '" data-start="' + (u.start || "") + '" aria-label="' + T("songs.play") + '">' + PLAY_SVG + "</button>" +
      '<a class="song-member-chip" href="' + href + '" target="_blank" rel="noopener" style="--mc:' + SD.chipColor(u.memberId) + '">' + highlight(SD.memberLabel(u.memberId)) + "</a>" +
      badge + ts + vdate +
      "</div>";
  }

  function cardHtml(o) {
    var uniqueMembers = [];
    o.urls.forEach(function (u) {
      if (uniqueMembers.indexOf(u.memberId) === -1) uniqueMembers.push(u.memberId);
    });
    var chips = uniqueMembers.map(chipHtml).join("");
    var artist = o.kind === "official"
      ? T("sm.officialArtist")
      : (o.info && o.info.artist ? o.info.artist : T("sm.artistUnknown"));
    var versions = o.urls.map(versionHtml).join("");
    var detail = '<div class="sm-detail">' +
      '<p class="sm-detail-label">' + T("sm.sangBy") + "</p>" +
      '<div class="sm-versions">' + versions + "</div>" +
      "</div>";
    return '<div class="sm-card card" data-key="' + esc(o.key) + '">' +
      favStarHtml("s:" + o.key, songFavAttrs(o.key, o.title, artist, jacketSrc(o))) +
      '<div class="sm-top">' +
      jacketHtml(o) +
      '<div class="sm-body">' +
      '<div class="sm-title">' + highlight(tt(o)) + "</div>" +
      '<div class="sm-artist">' + highlight(artist) + "</div>" +
      '<div class="sm-members">' + chips + "</div>" +
      "</div>" +
      "</div>" +
      '<div class="sm-player"></div>' +
      '<span class="sm-expand-btn">' + T("sm.expand") + "</span>" +
      detail +
      "</div>";
  }

  function render() {
    var list = originals.slice();
    if (keyword) {
      list = list.filter(function (o) {
        if (matchKeyword(SD.searchText(o))) return true;
        var info = o.info || {};
        if (matchKeyword(info.artist || "")) return true;
        if (matchKeyword(info.album || "")) return true;
        return o.urls.some(function (u) { return matchKeyword(memberSearchText(SD.memberById(u.memberId))); });
      });
    }
    if (countEl) countEl.textContent = T("sm.count", { n: list.length });
    if (!list.length) {
      listBox.innerHTML = '<div class="placeholder">' + T("sm.none") + "</div>";
      return;
    }
    listBox.innerHTML = '<div class="sm-grid">' + list.map(cardHtml).join("") + "</div>";
  }

  if (search) search.addEventListener("input", function () {
    if (search._t) clearTimeout(search._t);
    search._t = setTimeout(function () {
      keyword = SD.normKana(search.value.trim());
      render();
    }, 150);
  });

  /* バージョンの再生ボタン → カード内にタイムスタンプ付きプレイヤー展開 / リンク部分は除外して展開 */
  listBox.addEventListener("click", function (e) {
    if (e.target.closest("a") || e.target.closest(".fav-star")) return;
    var pb = e.target.closest(".sm-play");
    if (pb) {
      var pcard = pb.closest(".sm-card");
      playInWrap(pcard && pcard.querySelector(".sm-player"), pb.dataset.vid, parseInt(pb.dataset.start, 10) || 0);
      return;
    }
    var card = e.target.closest(".sm-card");
    if (!card) return;
    var wasOpen = card.classList.contains("open");
    var cards = listBox.querySelectorAll(".sm-card.open");
    Array.prototype.forEach.call(cards, function (c) { c.classList.remove("open"); });
    if (!wasOpen) card.classList.add("open");
  });

  /* 初回は遅延レンダリング: 曲まとめタブ初回表示まで待機 (INP 816ms対策) */
  var rendered = false;
  function lazyRender() {
    if (rendered) return;
    rendered = true;
    var run = function () { render(); };
    if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 800 });
    else if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else run();
  }
  window.__smLazyRender = lazyRender;
  (function initLazy() {
    var sec = document.getElementById("masterSection");
    var hidden = sec && sec.style.display === "none";
    if (!hidden) {
      lazyRender();
    } else {
      listBox.innerHTML = '<div class="placeholder">' + T("sm.none") + "</div>";
    }
  })();
})();
