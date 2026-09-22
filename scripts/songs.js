/* ============================================
   楽曲一覧 (songs.html)
   依存: data/songs.js の SONGS ＋ data/songs-extra.js の SONGS_EXTRA（曲マスター・歌枠）
   曲を単位に、公式楽曲・歌ってみた・歌枠をまとめて表示する
   ============================================ */
(function () {
  "use strict";

  var data = typeof SONGS !== "undefined" ? SONGS : window.SONGS;
  var extra = typeof SONGS_EXTRA !== "undefined" ? SONGS_EXTRA : (window.SONGS_EXTRA || {});
  var meta = extra.meta || {};
  var master = (typeof SONG_MASTER !== "undefined" ? SONG_MASTER : (window.SONG_MASTER || {})).songs || {};
  var autoKaraoke = (typeof KARAOKE !== "undefined" ? KARAOKE : (window.KARAOKE || [])) || [];
  var SD = window.SongData;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return SD.esc(s); }

  var listBox = $("songsList");
  if (!listBox) return;

  if (!data) {
    listBox.innerHTML = '<div class="placeholder">' + T("songs.nodata") + "</div>";
    return;
  }

  var search = $("songsSearch");
  var chips = $("songsChips");
  var tabOfficial = $("songsTabOfficial");
  var tabCovers = $("songsTabCovers");
  var tabKaraoke = $("songsTabKaraoke");
  var tabAll = $("songsTabAll");
  var tabLabel = $("songsTabLabel");
  var note = $("songsNote");
  var modeVideos = $("songsModeVideos");
  var modeMaster = $("songsModeMaster");
  var videosSection = $("videosSection");
  var masterSection = $("masterSection");

  var view = "all";
  var mode = "videos";
  var keyword = "";
  var memberFilter = "";

  /* モード切替: 歌動画 ⇔ 曲まとめ */
  function setMode(m) {
    mode = m;
    if (videosSection) videosSection.style.display = m === "videos" ? "" : "none";
    if (masterSection) masterSection.style.display = m === "master" ? "" : "none";
    if (modeVideos) modeVideos.classList.toggle("active", m === "videos");
    if (modeMaster) modeMaster.classList.toggle("active", m === "master");
  }
  if (modeVideos) modeVideos.addEventListener("click", function () { setMode("videos"); });
  if (modeMaster) modeMaster.addEventListener("click", function () { setMode("master"); });

  /* 歌枠: 自動取得（KARAOKE）＋手動（SONGS_EXTRA.karaoke）を id 単位でマージ（手動優先） */
  var karaokeStreams = SD.mergeKaraoke(autoKaraoke, extra.karaoke || []);

  /* カバー曲リスト（歌枠の曲を key で統合） */
  var coverData = SD.buildCoverList(data, karaokeStreams);
  var coverList = coverData.list;
  var coverByKey = coverData.byKey;

  function normKana(s) { return SD.normKana(s); }

  /* ---- 埋め込みプレイヤー（サムネ＋再生ボタン → iframe） ---- */
  function embedUrl(id, start) {
    return "https://www.youtube.com/embed/" + id + "?autoplay=1" + (start ? "&start=" + start : "");
  }

  function iframeHtml(src) {
    return '<iframe src="' + src + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>';
  }

  var PLAY_SVG = '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var YT_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z"/></svg>';
  var UNI_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var STAR_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.9-5 4.8 1.3 6.8L12 18.2 5.9 21.2l1.3-6.8-5-4.8 6.8-.9z"/></svg>';

  /* お気に入り☆ボタン（カード右上・サムネの上に重ねる） */
  function favStarHtml(key, entryAttrs) {
    var on = typeof MilliFav !== "undefined" && MilliFav.isFav(key);
    return '<button type="button" class="fav-star' + (on ? " on" : "") + '" aria-pressed="' + on + '" aria-label="' + T("fav.aria") + '" title="' + T("fav.aria") + '" data-fav-key="' + esc(key) + '"' + (entryAttrs || "") + ">" + STAR_SVG + "</button>";
  }

  function videoFavAttrs(vid, start, title, sub) {
    return ' data-fav-kind="video" data-fav-vid="' + esc(vid) + '" data-fav-start="' + (start || "") + '" data-fav-title="' + esc(title) + '" data-fav-sub="' + esc(sub || "") + '" data-fav-thumb="https://i.ytimg.com/vi/' + esc(vid) + '/mqdefault.jpg"';
  }

  function thumbHtml(id, start) {
    return '<div class="song-thumb-wrap" data-src="' + embedUrl(id, start) + '">' +
      '<img class="song-thumb" src="https://i.ytimg.com/vi/' + id + '/mqdefault.jpg" alt="" loading="lazy">' +
      '<span class="play-overlay" aria-hidden="true">' + PLAY_SVG + "</span>" +
      "</div>";
  }

  function playInWrap(wrap, id, start) {
    if (!wrap) return;
    var src = id ? embedUrl(id, start) : wrap.getAttribute("data-src");
    if (!src) return;
    var f = wrap.querySelector("iframe");
    if (f) { if (f.getAttribute("src") !== src) f.setAttribute("src", src); }
    else { wrap.innerHTML = iframeHtml(src); }
  }

  function ytBtnHtml(id) {
    return '<a class="btn btn-ghost song-ytbtn" href="https://milli-unishare.pages.dev/#watch=' + id + '" target="_blank" rel="noopener">' + UNI_SVG + " " + T("songs.uniWatch") + "</a>";
  }

  /* メンバー検索対象: 名前・読み・ファンネーム・呼称・英語名 */
  function memberSearchText(m) {
    if (!m) return "";
    return [m.name, m.nameEn, m.fanName, m.calls].filter(Boolean).join(" ");
  }

  function matchKeyword(text) {
    if (!keyword) return true;
    return normKana(text).indexOf(keyword) !== -1;
  }

  function matchMember(m) {
    return matchKeyword(memberSearchText(m));
  }

  /* 検索ハイライト: 一致文字列を推し色で強調（歌枠セトリ含む全テキスト用） */
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

  function memberChipHtml(id, url) {
    var inner = '<span class="song-member-chip" style="--mc:' + SD.chipColor(id) + '">' + esc(SD.memberLabel(id)) + "</span>";
    return url ? '<a class="song-member-chip" href="' + url + '" target="_blank" rel="noopener" style="--mc:' + SD.chipColor(id) + '">' + esc(SD.memberLabel(id)) + "</a>" : inner;
  }

  /* カバー・歌枠に登場するメンバー一覧 */
  function coverMembers() {
    var list = [];
    coverList.forEach(function (g) {
      g.urls.forEach(function (u) {
        if (u.memberId === "official") return;
        if (list.indexOf(u.memberId) === -1) list.push(u.memberId);
      });
    });
    return list.sort();
  }

  function chipsHtml() {
    var members = coverMembers();
    var html = '<button type="button" class="song-chip' + (memberFilter ? "" : " active") + '" data-m="">' + T("songs.all") + "</button>";
    html += members.map(function (id) {
      return '<button type="button" class="song-chip' + (memberFilter === id ? " active" : "") + '" data-m="' + id + '"' +
        ' style="--mc:' + SD.chipColor(id) + '">' + esc(SD.memberLabel(id)) + "</button>";
    }).join("");
    return html;
  }

  function isNew(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr);
    if (!d.getTime()) return false;
    return (Date.now() - d.getTime()) <= 14 * 86400000;
  }

  function artistOf(g) {
    var info = SD.songInfo(meta, master, g.key);
    return info && info.artist ? info.artist : "";
  }

  function memberNames(g) {
    var seen = [];
    (g.urls || []).forEach(function (u) {
      var label = SD.memberLabel(u.memberId);
      if (label && seen.indexOf(label) === -1) seen.push(label);
    });
    return seen.join("・");
  }

  /* ---- 歌ってみた: 曲カード（受け取った urls をバージョンとして表示） ---- */
  function songCardHtml(g, urls) {
    var list = urls && urls.length ? urls : g.urls;
    var primary = list[0] || { id: "", publishedAt: "" };
    // 混在時に karaoke が先頭に来ても非karaokeを優先（防御）
    if (primary.karaoke) {
      for (var _pi = 0; _pi < list.length; _pi++) { if (!list[_pi].karaoke) { primary = list[_pi]; break; } }
    }
    var art = artistOf(g);
    var versions = list.map(function (u) {
      var href = SD.videoUrl(u.id, u.start);
      var badge = u.karaoke ? '<span class="song-kind song-kind-karaoke">' + T("songs.karaokeBadge") + "</span>" : "";
      var ts = u.karaoke && u.start ? '<span class="song-ts">' + SD.fmtTs(u.start) + "〜" + (u.end ? SD.fmtTs(u.end) : "") + "</span>" : "";
      var vdate = u.publishedAt ? '<span class="song-vdate">' + esc(u.publishedAt) + "</span>" : "";
      return '<div class="song-version">' +
        memberChipHtml(u.memberId, href) + badge + ts + vdate +
        "</div>";
    }).join("");
    return '<div class="song-card card">' +
      thumbHtml(primary.id, primary.start) +
      favStarHtml("v:" + primary.id, videoFavAttrs(primary.id, primary.start, g.title, art || memberNames(g))) +
      (isNew(primary.publishedAt) ? '<span class="song-new">NEW</span>' : "") +
      '<div class="song-title">' + highlight(tt(g)) + "</div>" +
      (art ? '<div class="song-artist">' + highlight(art) + "</div>" : "") +
      (list.length > 1 ? '<div class="song-collab">' + T("songs.collab") + "</div>" : "") +
      '<div class="song-versions">' + versions + "</div>" +
      ytBtnHtml(primary.id) +
      "</div>";
  }

  /* ---- 歌ってみた: 歌みた動画は動画ごとに1カード。
     歌枠由来のバージョンは「すべて」「歌枠」タブでのみ集約カードとして表示し、
     「歌ってみた」タブには含めない（タイトルは合っているのに歌枠サムネ/タイムスタンプになるバグの修正） ---- */
  function coverCards(opts) {
    var includeKaraoke = !opts || opts.includeKaraoke !== false;
    var list = coverList.slice();
    if (keyword) {
      list = list.filter(function (g) {
        if (matchKeyword(SD.searchText(g))) return true;
        if (matchKeyword(artistOf(g))) return true;
        return g.urls.some(function (u) { return matchMember(SD.memberById(u.memberId)); });
      });
    }
    if (memberFilter) {
      list = list.filter(function (g) { return g.urls.some(function (u) { return u.memberId === memberFilter; }); });
    }
    var cards = [];
    list.forEach(function (g) {
      var videos = (g.urls || []).filter(function (u) { return !u.karaoke; });
      var karaoke = (g.urls || []).filter(function (u) { return u.karaoke; });
      /* コラボ動画（同じ動画を複数メンバーで歌唱）は1カードにまとめる */
      var byVideo = {};
      videos.forEach(function (u) {
        (byVideo[u.id] = byVideo[u.id] || []).push(u);
      });
      Object.keys(byVideo).forEach(function (id) {
        var us = byVideo[id];
        cards.push({ date: us[0].publishedAt || "", html: songCardHtml(g, us) });
      });
      if (includeKaraoke && karaoke.length) {
        var kdate = "";
        karaoke.forEach(function (u) { if (u.publishedAt && u.publishedAt > kdate) kdate = u.publishedAt; });
        cards.push({ date: kdate, html: songCardHtml(g, karaoke) });
      }
    });
    return cards;
  }

  function coversHtml() {
    var cards = coverCards({ includeKaraoke: false });
    if (!cards.length) return '<div class="placeholder">' + T("songs.none") + "</div>";
    return gridHtml(cards);
  }

  function gridHtml(cards) {
    return '<div class="song-grid">' + cards.map(function (c) { return c.html; }).join("") + "</div>";
  }

  /* ---- 公式楽曲 ---- */
  function officialCards() {
    var list = (data.official || []).slice();
    if (keyword) {
      list = list.filter(function (v) {
        if (matchKeyword(SD.searchText(v))) return true;
        return (v.members || []).some(function (mid) { return matchMember(SD.memberById(mid)); });
      });
    }
    if (memberFilter) {
      list = list.filter(function (v) {
        return (v.members && v.members.length ? v.members : ["official"]).indexOf(memberFilter) !== -1;
      });
    }
    return list.map(function (v) {
      var chips = (v.members && v.members.length ? v.members : ["official"]).map(function (mid) {
        return memberChipHtml(mid, "");
      }).join("");
      var sub = (v.members || []).map(function (mid) { return SD.memberLabel(mid); }).join(typeof milliLang !== "undefined" && milliLang.get() === "en" ? ", " : "・") || T("songs.officialLabel");
      return { date: v.publishedAt || "", html:
        '<div class="song-card card">' +
        thumbHtml(v.id) +
        favStarHtml("v:" + v.id, videoFavAttrs(v.id, "", v.title, sub)) +
        (isNew(v.publishedAt) ? '<span class="song-new">NEW</span>' : "") +
        '<div class="song-title">' + highlight(tt(v)) + "</div>" +
        '<div class="song-members">' + chips + "</div>" +
        '<div class="song-meta">' + esc(v.publishedAt) + "</div>" +
        ytBtnHtml(v.id) +
        "</div>" };
    });
  }

  function officialHtml() {
    var cards = officialCards();
    if (!cards.length) return '<div class="placeholder">' + T("songs.none") + "</div>";
    return gridHtml(cards);
  }

  /* ---- 歌枠: 配信単位カード（収録曲とタイムスタンプ） ---- */
  function karaokeCards() {
    var list = karaokeStreams.slice();
    if (keyword) {
      list = list.filter(function (st) {
        if (matchKeyword(SD.searchText(st))) return true;
        return (st.songs || []).some(function (s) {
          return matchKeyword(SD.searchText(s) || s.key) || matchKeyword(SD.searchText(coverByKey.get(s.key) || {}));
        });
      });
    }
    if (memberFilter) {
      list = list.filter(function (st) { return st.memberId === memberFilter; });
    }
    return list.map(function (st) {
      var songs = (st.songs || []).map(function (s, i) {
        var g = coverByKey.get(s.key);
        var label = (g && tt(g)) || tt(s) || s.key;
        return '<div class="song-kitem" role="button" tabindex="0" data-stream="' + st.id + '" data-start="' + (s.start || "") + '">' +
          '<span class="song-kidx">' + (i + 1) + "</span>" +
          '<span class="song-kname">' + highlight(label) + "</span>" +
          '<span class="song-ts">' + (s.start ? SD.fmtTs(s.start) + "〜" + (s.end ? SD.fmtTs(s.end) : "") : "–") + "</span>" +
          '<a class="song-kext" href="' + SD.videoUrl(st.id, s.start) + '" target="_blank" rel="noopener" aria-label="' + T("songs.openYt") + '">' + YT_SVG + "</a>" +
          "</div>";
      }).join("");
      var setlist = songs;
      /* セットリスト折りたたみ: 最初の2行のみ表示、残りはトグルで展開 */
      var VISIBLE = 2;
      var rows = setlist.split("");
      var items = setlist.match(/<div class="song-kitem[\s\S]*?<\/div>|<div class="song-shazam-divider">[\s\S]*?<\/div>/g) || [];
      var setHtml = "";
      var restHtml = "";
      items.forEach(function (it, i) {
        if (i < VISIBLE) setHtml += it;
        else restHtml += it;
      });
      var toggle = restHtml
        ? '<button type="button" class="song-setlist-toggle" data-open="0">' +
          '<span class="song-setlist-more">' + T("songs.setlistShow", { n: items.length - VISIBLE }) + "</span>" +
          '<span class="song-setlist-less">' + T("songs.setlistHide") + "</span>" +
          "</button>"
        : "";
      return { date: st.publishedAt || "", html:
        '<div class="song-card card">' +
        thumbHtml(st.id) +
        favStarHtml("v:" + st.id, videoFavAttrs(st.id, "", st.title, SD.memberLabel(st.memberId))) +
        (isNew(st.publishedAt) ? '<span class="song-new">NEW</span>' : "") +
        '<div class="song-title">' + highlight(tt(st)) + "</div>" +
        '<div class="song-members">' + memberChipHtml(st.memberId, "") + "</div>" +
        '<div class="song-meta">' + esc(st.publishedAt) + (shz ? ' <span class="song-shazam-badge">' + T("songs.shazamDone") + "</span>" : "") + "</div>" +
        '<div class="song-klist">' + setHtml +
        (restHtml ? '<div class="song-krest">' + restHtml + "</div>" : "") +
        toggle +
        "</div>" +
        ytBtnHtml(st.id) +
        "</div>" };
    });
  }

  function karaokeHtml() {
    var cards = karaokeCards();
    if (!cards.length) return '<div class="placeholder">' + T("songs.none") + "</div>";
    return gridHtml(cards);
  }

  /* ---- すべて: 歌ってみた・公式・歌枠を新しい順に統合表示 ---- */
  function allHtml() {
    var cards = coverCards().concat(officialCards(), karaokeCards());
    if (!cards.length) return '<div class="placeholder">' + T("songs.none") + "</div>";
    cards.sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    return gridHtml(cards);
  }

  function coverCardCount(opts) {
    var includeKaraoke = !opts || opts.includeKaraoke !== false;
    var n = 0;
    coverList.forEach(function (g) {
      var videos = (g.urls || []).filter(function (u) { return !u.karaoke; });
      var karaoke = (g.urls || []).filter(function (u) { return u.karaoke; });
      var seen = {};
      videos.forEach(function (u) { seen[u.id] = true; });
      n += Object.keys(seen).length + (includeKaraoke && karaoke.length ? 1 : 0);
    });
    return n;
  }

  function render() {
    var n = view === "all"
      ? coverCardCount({ includeKaraoke: true }) + (data.official || []).length + karaokeStreams.length
      : view === "official" ? (data.official || []).length
        : view === "karaoke" ? karaokeStreams.length : coverCardCount({ includeKaraoke: false });
    tabLabel.textContent = view === "all" ? T("songs.tabLabelAll", { n: n }) :
      view === "covers" ? T("songs.tabLabelCovers", { n: n }) :
        view === "official" ? T("songs.tabLabelOfficial", { n: n }) : T("songs.tabLabelKaraoke", { n: n });
    note.style.display = view === "covers" ? "none" : "block";
    note.textContent = view === "karaoke" ? T("songs.karaokeNote")
      : view === "all" ? T("songs.note") + " " + T("songs.karaokeNote")
        : T("songs.note");
    listBox.innerHTML = view === "all" ? allHtml()
      : view === "covers" ? coversHtml()
        : view === "official" ? officialHtml() : karaokeHtml();
  }

  function setView(v) {
    view = v;
    if (tabAll) tabAll.classList.toggle("active", v === "all");
    if (tabOfficial) tabOfficial.classList.toggle("active", v === "official");
    if (tabCovers) tabCovers.classList.toggle("active", v === "covers");
    if (tabKaraoke) tabKaraoke.classList.toggle("active", v === "karaoke");
    render();
  }

  if (tabAll) tabAll.addEventListener("click", function () { setView("all"); });
  if (tabOfficial) tabOfficial.addEventListener("click", function () { setView("official"); });
  if (tabCovers) tabCovers.addEventListener("click", function () { setView("covers"); });
  if (tabKaraoke) tabKaraoke.addEventListener("click", function () { setView("karaoke"); });

  if (search) search.addEventListener("input", function () {
    keyword = normKana(search.value.trim());
    render();
  });

  /* サムネ・再生ボタン → iframe再生 / 歌枠セトリ行 → タイムスタンプ付きで再生 / リンク系は既定動作 */
  listBox.addEventListener("click", function (e) {
    var toggle = e.target.closest(".song-setlist-toggle");
    if (toggle) {
      var open = toggle.dataset.open === "1";
      toggle.dataset.open = open ? "0" : "1";
      toggle.classList.toggle("open", !open);
      var rest = toggle.closest(".song-klist").querySelector(".song-krest");
      if (rest) rest.classList.toggle("show", !open);
      return;
    }
    if (e.target.closest("a")) return;
    var wrap = e.target.closest(".song-thumb-wrap");
    if (wrap) { playInWrap(wrap); return; }
    var kitem = e.target.closest(".song-kitem");
    if (kitem) {
      var card = kitem.closest(".song-card");
      playInWrap(card && card.querySelector(".song-thumb-wrap"), kitem.dataset.stream, parseInt(kitem.dataset.start, 10) || 0);
    }
  });

  listBox.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var kitem = e.target.closest(".song-kitem");
    if (!kitem) return;
    e.preventDefault();
    var card = kitem.closest(".song-card");
    playInWrap(card && card.querySelector(".song-thumb-wrap"), kitem.dataset.stream, parseInt(kitem.dataset.start, 10) || 0);
  });

  if (chips) chips.addEventListener("click", function (e) {
    var b = e.target.closest(".song-chip");
    if (!b) return;
    memberFilter = b.dataset.m || "";
    chips.innerHTML = chipsHtml();
    render();
  });

  chips.innerHTML = chipsHtml();
  setView("all");
})();