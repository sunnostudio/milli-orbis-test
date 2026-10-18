const fs = require("fs");
const path = require("path");

const API_KEY = process.env.YOUTUBE_API_KEY;
const DATA_FILE = path.join(__dirname, "..", "data.js");
const OUT_FILE = path.join(__dirname, "..", "data", "youtube.json");
const BACKUP_FILE = path.join(__dirname, "..", "data", "youtube.backup.json");

const API = "https://www.googleapis.com/youtube/v3";

eval(fs.readFileSync(DATA_FILE, "utf8").replace(/^const (\w+) =/gm, "globalThis.$1 ="));

if (!API_KEY) {
  console.error("YOUTUBE_API_KEY is not set");
  process.exit(1);
}

const members = MEMBERS.filter((m) => m.links && m.links.yt && m.id !== "milchan");
const handleOf = (m) => {
  const u = m.links.yt;
  const i = u.indexOf("@");
  return i >= 0 ? u.slice(i) : null;
};

/* 取得対象: メンバー個人チャンネル + ミリプロ公式チャンネル */
const sources = [
  ...members.map((m) => ({ id: m.id, name: m.name, handle: handleOf(m) })),
  { id: "official", name: "ミリプロ公式", handle: "@Mil_Pro" }
];

async function fetchJson(url, tries = 3) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        let reason = "";
        try {
          const j = JSON.parse(body);
          if (j.error) reason = ` [${j.error.code || ""} ${j.error.status || ""} ${(j.error.errors || []).map((e) => e.reason || e.message).join(", ")}]`;
        } catch (e) {
          if (body) reason = ` [${body.slice(0, 200)}]`;
        }
        throw new Error(`YouTube API ${res.status}: ${url}${reason}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      // quota切れのリトライは無意味（quotaを消費するだけ）のため即時失敗させる
      if (/quotaExceeded/i.test(e.message)) throw e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

const firstPage = async (url) => {
  const j = await fetchJson(url);
  return j.items || [];
};

const valid = (v) => v && v.id && v.title;

// プレースホルダー的・ゴミの配信予定（VISAカード発表など）が calendar に混入しないよう、
// 「開始日が120日より先」の配信予定は収集しない
const MAX_FUTURE_DAYS = 120;
const inFutureWindow = (when) => {
  const t = Date.parse(when);
  return t > Date.now() && t <= Date.now() + MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000;
};

// 検索APIで取得できないがwiki等で確認済みの配信予定（API結果に含まれない場合のみ補完）
const MANUAL_EXTRA_STREAMS = [
  { id: "4Ie_l2SI0NM", memberId: "raco", member: "音ノ瀬らこ", channelTitle: "音ノ瀬らこ / OtonoseRaco", title: "???? / 音ノ瀬らこfeat.ゆらぎゆら (cover)", thumb: "", scheduledStartTime: "2026-08-15T20:00:00+09:00", status: "upcoming" },
  { id: "UhO0Vt03ZMg", memberId: "liz", member: "雨夜リズ", channelTitle: "雨夜リズ / Amayo Liz", title: "【ストリヌ/Minecraft 】影MOD入れたから街ぶらる【雨夜リズ/ミリプロ】", thumb: "", scheduledStartTime: "2026-08-15T20:00:00+09:00", status: "upcoming" },
  { id: "YzfwW0zTSpE", memberId: "mahoro", member: "鹿乃まほろ", channelTitle: "鹿乃まほろ / Kano Mahoro", title: "【#鹿乃まほろ初配信】みんなの毎日を、まほろばに！【鹿乃まほろ/ミリプロ】", thumb: "https://i.ytimg.com/vi/YzfwW0zTSpE/hqdefault.jpg", scheduledStartTime: "2026-08-22T20:00:00+09:00", status: "upcoming" }
];

async function main() {
  const errors = [];
  const failedIds = new Set();

  // channels.list は1回にまとめる（part=contentDetails,id）。streams取得時はここで得た
  // channelIdを再利用し、2回目のchannels.list呼び出しを省略してquotaを節約する
  const channelResults = await Promise.all(
    sources.map(async (s) => {
      try {
        const j = await fetchJson(
          `${API}/channels?part=contentDetails,id&forHandle=${encodeURIComponent(s.handle)}&key=${API_KEY}`
        );
        const ch = j.items && j.items[0];
        return ch ? { src: s, playlistId: ch.contentDetails.relatedPlaylists.uploads, channelId: ch.id } : null;
      } catch (e) {
        failedIds.add(s.id);
        errors.push(`${s.id}: ${e.message}`);
        return null;
      }
    })
  );

  const withPlaylist = channelResults.filter(Boolean);
  if (withPlaylist.length === 0) {
    console.error("all channels failed:", errors.join("; "));
    process.exit(1);
  }

  const videos = (
    await Promise.all(
      withPlaylist.map(async ({ src, playlistId }) => {
        try {
          const items = await firstPage(
            `${API}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=5&key=${API_KEY}`
          );
          return items.map((it) => ({
            id: it.contentDetails.videoId,
            memberId: src.id,
            member: src.name,
            channelTitle: it.snippet.channelTitle,
            title: it.snippet.title,
            thumb: it.snippet.thumbnails.high ? it.snippet.thumbnails.high.url : "",
            publishedAt: it.snippet.publishedAt,
            live: /配信|ライブ|雑談/.test(it.snippet.title)
          }));
        } catch (e) {
          failedIds.add(src.id);
          errors.push(`${src.id}: ${e.message}`);
          return [];
        }
      })
    )
  )
    .flat()
    .filter(valid)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 30);

  const streams = (
    await Promise.all(
      withPlaylist.map(async ({ src, channelId }) => {
        try {
          if (!channelId) return [];
          const out = [];
          for (const eventType of ["live", "upcoming"]) {
            const items = await firstPage(
              `${API}/search?part=snippet&channelId=${channelId}&eventType=${eventType}&type=video&maxResults=10&key=${API_KEY}`
            );
            const ids = items.map((it) => it.id.videoId).filter(Boolean);
            if (!ids.length) continue;
            const vj = await fetchJson(
              `${API}/videos?part=liveStreamingDetails&id=${ids.join(",")}&key=${API_KEY}`
            );
            const detailMap = {};
            (vj.items || []).forEach((v) => { detailMap[v.id] = v.liveStreamingDetails || null; });
            const isLive = eventType === "live";
            items.forEach((it) => {
              const det = detailMap[it.id.videoId] || {};
              const when = isLive ? (det.actualStartTime || it.snippet.publishedAt) : (det.scheduledStartTime || "");
              if (!it.id.videoId || !when) return;
              if (!isLive && !inFutureWindow(when)) return;
              out.push({
                id: it.id.videoId,
                memberId: src.id,
                member: src.name,
                title: it.snippet.title,
                thumb: it.snippet.thumbnails.high ? it.snippet.thumbnails.high.url : "",
                scheduledStartTime: when,
                status: isLive ? "live" : "upcoming"
              });
            });
          }
          return out;
        } catch (e) {
          failedIds.add(src.id);
          errors.push(`${src.id} (streams): ${e.message}`);
          return [];
        }
      })
    )
  )
    .flat()
    .filter((v) => v && v.id)
    .sort((a, b) => {
      const la = a.status === "live" ? 0 : 1;
      const lb = b.status === "live" ? 0 : 1;
      if (la !== lb) return la - lb;
      return a.scheduledStartTime > b.scheduledStartTime ? 1 : -1;
    });

  const output = {
    updatedAt: new Date().toISOString(),
    streams,
    videos,
    live: streams.filter((s) => s.status === "live")
  };

  // 失敗したチャンネルの前回データを引き継ぐ（API の一時エラーで配信予定が消えるのを防ぐ）
  if (failedIds.size > 0) {
    let prev = null;
    try { prev = JSON.parse(fs.readFileSync(OUT_FILE, "utf8")); } catch (e) { prev = null; }
    if (prev) {
      const keepStreams = (prev.streams || []).filter(
        (s) => failedIds.has(s.memberId) && s.status === "upcoming" && inFutureWindow(s.scheduledStartTime)
      );
      const keepVideos = (prev.videos || []).filter((v) => failedIds.has(v.memberId));
      const seenS = new Set(output.streams.map((v) => v.id));
      const seenV = new Set(output.videos.map((v) => v.id));
      keepStreams.forEach((s) => { if (!seenS.has(s.id)) { output.streams.push(s); seenS.add(s.id); } });
      keepVideos.forEach((v) => { if (!seenV.has(v.id)) { output.videos.push(v); seenV.add(v.id); } });
    }
  }

  // wiki 等で確認済みの配信予定を補完（API 結果に含まれない場合のみ）
  const seenStreams = new Set(output.streams.map((v) => v.id));
  MANUAL_EXTRA_STREAMS.forEach((s) => {
    if (inFutureWindow(s.scheduledStartTime) && !seenStreams.has(s.id)) {
      output.streams.push(s);
      seenStreams.add(s.id);
    }
  });
  output.streams.sort((a, b) => {
    const la = a.status === "live" ? 0 : 1;
    const lb = b.status === "live" ? 0 : 1;
    if (la !== lb) return la - lb;
    return a.scheduledStartTime > b.scheduledStartTime ? 1 : -1;
  });
  output.videos.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  output.videos = output.videos.slice(0, 30);
  output.live = output.streams.filter((s) => s.status === "live");

  const invalid = [...output.videos, ...output.streams].filter((v) => !v.id || !v.title);
  if (invalid.length > 0) {
    console.error("invalid items found, aborting:", JSON.stringify(invalid.slice(0, 5)));
    process.exit(1);
  }

  if (fs.existsSync(OUT_FILE)) {
    fs.copyFileSync(OUT_FILE, BACKUP_FILE);
  }

  // 日本語タイトルの英訳（en.title）を付与。失敗時は日本語のまま
  const translate = require("./translate.js");
  const titles = [];
  output.videos.forEach((v) => titles.push(v.title));
  output.streams.forEach((v) => titles.push(v.title));
  const map = await translate.enMap(titles);
  const attach = (v) => {
    if (v.en || !map[v.title]) return;
    v.en = { title: map[v.title] };
  };
  output.videos.forEach(attach);
  output.streams.forEach(attach);

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(
    `ok: ${output.videos.length} videos, ${output.streams.length} streams (${output.live.length} live)`
  );
  if (errors.length) console.warn("partial errors:", errors.join("; "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
