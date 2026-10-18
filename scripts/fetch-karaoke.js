/* ============================================
   fetch-karaoke.js — 歌枠データを生成する
   各メンバーの歌枠プレイリストから動画一覧を取得し、
   説明欄のチャプター（タイムスタンプ）を解析して
   収録曲データ data/karaoke.js を出力する。
   使い方: YOUTUBE_API_KEY=xxx node scripts/fetch-karaoke.js
   ============================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const { parseChapters, applyEnds } = require("./song-utils.js");

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("YOUTUBE_API_KEY が設定されていません");
  process.exit(1);
}

/* 歌枠プレイリスト（9人分。虹深°ぬふは歌枠プレイリスト未作成のため対象外） */
const KARAOKE_PLAYLISTS = {
  konomi: "PL5p6FQYYgVRwG0fOgmItZh_AIpbli96dD",
  nono: "PLcuYuav35lC8RwCBxCJBQeVA9ml661gd5",
  akubi: "PLsvT9Rhal6X0lJmc3wA9ohDQwFF222uyG",
  raco: "PLWzEr1iWdJ1hZjFYw8YwQ2HCg8PdJNfdT",
  yura: "PLAOJZw9w-IQufVlAtNtTCGI6GRi6ZvEQ0",
  tsukuri: "PLQA45rTkdhddLnKlpn-FhFmuy32TS4fQG",
  koma: "PLznEl2O8TKcwt-1rYnZm5gj9W6bOt-6M8",
  liz: "PL8EAIbSZy-jnMkNIGny57MiWVsKoIljsd",
  rei: "PLFF-KpnQsuC4"
};

const BASE = "https://www.googleapis.com/youtube/v3";

/* 歌枠プレイリストに紛れ込んだ無関係動画（ミリプロメンバー外のカラオケ等）を除外 */
const EXCLUDE_VIDEO_IDS = new Set([
  "Ir1w0DDIWPc"   // 阿良々木月火（井口裕香）【白金ディスコ】off vocal カラオケ（ゆらぎゆらプレイリストに誤混入）
]);
const retry = (fn, n = 3) =>
  fn().catch((err) => {
    if (n <= 1) throw err;
    if (/HTTP 403/.test(err.message || "")) throw err;
    return new Promise((res) => setTimeout(res, 1500)).then(() => retry(fn, n - 1));
  });

async function fetchPlaylist(playlistId) {
  const items = [];
  let pageToken = "";
  do {
    const qs = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      key: API_KEY
    });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await retry(() =>
      fetch(`${BASE}/playlistItems?${qs}`).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} (${playlistId})`);
        return r.json();
      })
    );
    (data.items || []).forEach((it) => {
      const s = it.snippet || {};
      if (!it.contentDetails || !it.contentDetails.videoId) return;
      const title = s.title || "";
      if (/^(private|deleted) video$/i.test(title)) return;
      items.push({
        id: it.contentDetails.videoId,
        title,
        publishedAt: (s.publishedAt || "").slice(0, 10)
      });
    });
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return items;
}

/* ISO 8601 の動画長さ（PT1H2M30S 等）を秒に変換 */
function parseDuration(d) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(d || ""));
  if (!m) return 0;
  return (parseInt(m[1] || "0", 10) * 3600) + (parseInt(m[2] || "0", 10) * 60) + parseInt(m[3] || "0", 10);
}

/* 動画ID一括で説明文・長さを取得（50件ずつ） */
async function fetchVideosDetails(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const qs = new URLSearchParams({ part: "snippet,contentDetails", id: chunk.join(","), key: API_KEY, maxResults: "50" });
    const data = await retry(() =>
      fetch(`${BASE}/videos?${qs}`).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    );
    (data.items || []).forEach((it) => {
      out[it.id] = {
        description: (it.snippet || {}).description || "",
        duration: parseDuration((it.contentDetails || {}).duration)
      };
    });
  }
  return out;
}

async function main() {
  const all = [];
  for (const [memberId, playlistId] of Object.entries(KARAOKE_PLAYLISTS)) {
    const items = await fetchPlaylist(playlistId);
    console.log(`playlist ${memberId}: ${items.length} items`);
    const seen = new Set();
    items.forEach((v) => {
      if (EXCLUDE_VIDEO_IDS.has(v.id)) {
        console.log(`excluded: ${memberId} ${v.id} (${v.title})`);
        return;
      }
      if (seen.has(v.id)) return;
      seen.add(v.id);
      all.push({ ...v, memberId });
    });
  }

  // 説明文・長さを取得してチャプター解析
  const details = await fetchVideosDetails(all.map((v) => v.id));
  const streams = all.map((v) => {
    const d = details[v.id] || { description: "", duration: 0 };
    const chapters = parseChapters(d.description);
    // リレー等でチャプターが参加者名のみ（「曲名 / アーティスト」形式が1つもない）場合は曲とみなさない
    let songs = applyEnds(chapters, d.duration);
    if (songs.length && !songs.some((c) => /[\/／]/.test(c.title))) {
      console.log(`skip relay(no song/artist): ${v.memberId} ${v.id}`);
      songs = [];
    }
    return { id: v.id, memberId: v.memberId, publishedAt: v.publishedAt, title: v.title, duration: d.duration, songs };
  }).sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));

  const withChapters = streams.filter((s) => s.songs.length).length;
  const songCount = streams.reduce((n, s) => n + s.songs.length, 0);

  // 日本語タイトルの英訳（en.title）を付与。失敗時は日本語のまま
  const translate = require("./translate.js");
  const titles = [];
  streams.forEach((k) => {
    titles.push(k.title);
    (k.songs || []).forEach((s) => titles.push(s.title));
  });
  const map = await translate.enMap(titles);
  const attach = (r) => {
    if (r.en || !map[r.title]) return;
    r.en = { title: map[r.title] };
  };
  streams.forEach((k) => {
    attach(k);
    (k.songs || []).forEach(attach);
  });

  const src = "/* 自動生成: node scripts/fetch-karaoke.js（変更しないでください） */\nwindow.KARAOKE = " +
    JSON.stringify(streams, null, 2) + ";\n";
  fs.writeFileSync(path.join(__dirname, "..", "data", "karaoke.js"), src, "utf8");
  console.log(`generated: data/karaoke.js (streams: ${streams.length}, with chapters: ${withChapters}, songs: ${songCount})`);
}

main().catch((e) => {
  // quota切れ時は既存データを残して正常終了し、workflow全体を失敗させない
  // （fetch-data.js の成果まで破棄されるのを防ぐ）
  if (/HTTP 403/.test(e.message || "")) {
    console.warn("quota exceeded? keeping previous data:", e.message);
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
});
