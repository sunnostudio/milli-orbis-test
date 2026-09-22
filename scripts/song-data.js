/* ============================================
   song-data.js — 楽曲ページ共通の実行時データ処理
   songs.js（歌動画まとめ）と songs-master.js（曲まとめ）から使用する。
   依存: data/songs.js, data/songs-extra.js, data/song-master.js, data/karaoke.js
   ============================================ */
window.SongData = (function () {
  "use strict";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ひらがな/カタカナを同一視する検索用正規化（半角→全角→ひらがな→小文字） */
  function normKana(s) {
    return String(s).normalize("NFKC").replace(/[\u30A1-\u30F6]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    }).toLowerCase();
  }

  function memberById(id) {
    if (typeof MEMBERS === "undefined" || !MEMBERS) return null;
    for (var i = 0; i < MEMBERS.length; i++) {
      if (MEMBERS[i].id === id) return MEMBERS[i];
    }
    return null;
  }

  function memberLabel(id) {
    var m = memberById(id);
    return m ? (typeof mName === "function" ? mName(m) : m.name) : (id === "official" ? T("songs.officialLabel") : id);
  }

  /* 検索対象テキスト: 日本語タイトル＋英語タイトル（あれば） */
  function searchText(obj) {
    if (!obj) return "";
    var s = obj.title || "";
    if (obj.en && obj.en.title && obj.en.title !== s) s += " " + obj.en.title;
    return s;
  }

  function chipColor(id) {
    var m = memberById(id);
    return m ? m.color : "#75b1c0";
  }

  function videoUrl(id, start) {
    return "https://milli-unishare.pages.dev/#watch=" + id + (start ? "&t=" + start : "");
  }

  function fmtTs(sec) {
    if (!sec) return "";
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* 自動取得の歌枠（KARAOKE）と手動の歌枠（SONGS_EXTRA.karaoke）をマージ。
     手動が自動を id 単位で上書きする（songs 指定があればそちらが優先） */
  function mergeKaraoke(auto, manual) {
    var map = new Map();
    (auto || []).forEach(function (st) { map.set(st.id, st); });
    (manual || []).forEach(function (st) {
      var prev = map.get(st.id);
      if (!prev) { map.set(st.id, st); return; }
      map.set(st.id, {
        id: st.id,
        memberId: st.memberId || prev.memberId,
        publishedAt: st.publishedAt || prev.publishedAt,
        title: st.title || prev.title,
        duration: st.duration || prev.duration,
        en: st.en || prev.en,
        songs: (st.songs && st.songs.length ? st.songs : prev.songs || [])
      });
    });
    return Array.from(map.values());
  }

  /* カバー曲リストを構築（歌枠の曲を key で統合）。
     歌枠由来の曲で既存カバーと一致しないものは新規曲として末尾に追加 */
  function buildCoverList(SONGS, karaokeStreams) {
    var byKey = new Map();
    (SONGS.covers || []).forEach(function (g) { byKey.set(g.key, g); });
    var karaokeOnly = [];
    (karaokeStreams || []).forEach(function (st) {
      (st.songs || []).forEach(function (s) {
        var url = { id: st.id, memberId: st.memberId, publishedAt: st.publishedAt, karaoke: true, start: s.start, end: s.end };
        var g = byKey.get(s.key);
        if (g) {
          if (!g.urls.some(function (u) { return u.id === url.id && u.start === url.start; })) g.urls.push(url);
        } else {
          var ng = { key: s.key, title: s.title || s.key, urls: [url] };
          if (s.en && s.en.title) ng.en = { title: s.en.title };
          byKey.set(s.key, ng);
          karaokeOnly.push(ng);
        }
      });
    });
    var list = (SONGS.covers || []).concat(karaokeOnly).sort(function (a, b) {
      var na = Math.max.apply(null, a.urls.map(function (u) { return u.publishedAt || ""; }));
      var nb = Math.max.apply(null, b.urls.map(function (u) { return u.publishedAt || ""; }));
      return na > nb ? -1 : 1;
    });
    return { list: list, byKey: byKey };
  }

  /* 元曲情報（アーティスト等）: 手動 meta → 自動 song-master → なし
     master は SONG_MASTER.songs（内部オブジェクト）を受け取る */
  function songInfo(meta, master, key) {
    var m = meta && meta[key];
    if (m && (m.artist || m.album || m.cover)) return m;
    var s = master && master[key];
    if (s) return s;
    return null;
  }

  return {
    esc: esc,
    normKana: normKana,
    memberById: memberById,
    memberLabel: memberLabel,
    searchText: searchText,
    chipColor: chipColor,
    videoUrl: videoUrl,
    fmtTs: fmtTs,
    mergeKaraoke: mergeKaraoke,
    buildCoverList: buildCoverList,
    songInfo: songInfo
  };
})();
