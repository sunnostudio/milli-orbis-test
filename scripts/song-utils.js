/* ============================================
   song-utils.js — 楽曲データの共通ユーティリティ（Node 用）
   fetch-songs.js / fetch-karaoke.js から使用する。
   - normalizeTitle / displayTitle: タイトル正規化（カバー曲のキー生成）
   - parseChapters: 説明欄のチャプター（タイムスタンプ）解析
   ============================================ */
"use strict";

const MEMBER_NAMES = {
  konomi: "甘狼このみ",
  nono: "音ノ乃のの",
  akubi: "あくび・でもんすぺーど",
  koma: "小廻こま",
  raco: "音ノ瀬らこ",
  yura: "ゆらぎゆら",
  nuhu: "虹深°ぬふ",
  tsukuri: "眠雲ツクリ",
  liz: "雨夜リズ",
  rei: "夕霧レイ",
  mahoro: "鹿乃まほろ",
  aoi: "海琳あおい"
};

/* かな表記など別名でのメンバー検出（例: あまかみこのみ） */
const MEMBER_ALIASES = [
  ["あまかみこのみ", "konomi"],
  ["おとのののの", "nono"],
  ["こまわりこま", "koma"],
  ["おとのせらこ", "raco"],
  ["にじぷかぬふ", "nuhu"],
  ["ぬふちゃ", "nuhu"],
  ["ねむくもつくり", "tsukuri"],
  ["あまよりず", "liz"],
  ["ゆうぎりれい", "rei"],
  ["かのまほろ", "mahoro"],
  ["まほろ", "mahoro"],
  ["鹿乃", "mahoro"],
  ["みたまあおい", "aoi"],
  ["海琳あおい", "aoi"],
  ["海琳", "aoi"]
];

/* タイトル正規化: 括弧タグ除去・記号除去・小文字化 → 楽曲名キー */
function normalizeTitle(t) {
  let s = String(t || "");
  s = s.replace(/\s*covered\s+by\s+.*$/i, "");   // covered by 以降（コラボ相手名など）を除去
  // メンバー名（漢字・かな）は正規化（ー・記号除去）より先に除去する
  for (const name of Object.values(MEMBER_NAMES)) {
    s = s.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  }
  MEMBER_ALIASES.forEach(([alias]) => {
    s = s.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  });
  s = s.replace(/【[^】]*】/g, "");         // 【歌ってみた】等
  s = s.replace(/https?:\/\/\S+/gi, "");    // URL を除去
  s = s.replace(/\[[^\]]*\]/g, "");         // [ ... ] タグ
  s = s.replace(/（[^）]*）/g, "");          // （字幕）等
  s = s.replace(/\([^)]*\)/g, "");
  s = s.replace(/[「」『』"“”・×]|<\/?[^>]+>/g, "");
  s = s.replace(/[\s　ー~〜]/g, "");
  s = s.replace(/歌ってみた|カバー|cover|弾いてみた|歌枠|歌って|歌う|歌/gi, "");
  s = s.replace(/[\/|｜:：／]/g, "");
  s = s.replace(/millionproduction|ミリプロ|officialmv|official|mv/gi, "");
  s = s.replace(/[\/\-|｜:：／]+$/g, "");   // 末尾に残ったセパレータを除去
  return s.toLowerCase();
}

/* 表示用タイトル整理: カバー表記や「/ メンバー名（cover）」等を除去 */
function displayTitle(t) {
  let s = String(t || "");
  s = s.replace(/【[^】]*】/g, "").trim();
  s = s.replace(/\s*\/\s*[^/]*?（cover）$/i, "");   // / 甘狼このみ（cover）
  s = s.replace(/\s*\/\s*[^/]*?\(cover\)$/i, "");   // / 夕霧レイ (cover)
  s = s.replace(/\s*-\s*cover\s*$/i, "");           // - cover
  s = s.replace(/\s+covered by\s+[^/]*$/i, "");     // covered by 音ノ乃のの
  // 末尾の「 / メンバー名」（カバー表記なし）を除去
  const names = Object.values(MEMBER_NAMES).concat(MEMBER_ALIASES.map((a) => a[0]));
  s = s.replace(new RegExp("\\s*[/／]\\s*(?:" + names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\s*$"), "");
  s = s.replace(/\s*\(.*?\)\s*$/g, "").trim();
  s = s.replace(/https?:\/\/\S+/gi, "").trim();       // URL を除去
  s = s.replace(/[\s\/|｜]+$/, "");                  // 末尾のスラッシュ等を除去
  return s;
}

/* ---- チャプター（タイムスタンプ）解析 ---- */

/* 非歌唱（トーク等）とみなすチャプターのストップワード
   - PREFIX: 先頭一致で除去（セグメント見出し系。曲名と被りにくい語）
   - EXACT: 完全一致のみ除去（曲名に含まれ得る語はこちら） */
const CHAPTER_STOP_PREFIX = [
  "オープニングトーク", "オープニング", "オープニング曲", "イントロ", "エンディング", "エンディング曲", "アウトロ",
  "挨拶", "あいさつ", "MC", "雑談", "フリートーク", "おしゃべり", "お喋り",
  "告知", "お知らせ", "情報", "恒例", "ニュース",
  "待機", "待機所", "準備", "休憩", "ブレイク",
  "コメント返し", "コメント", "感想", "振り返り", "反省会",
  "おつかれ", "お疲れ", "配信終了", "終了",
  "リクエスト募集", "メンバーシップ", "スポンサー", "質疑応答", "ぐだぐだ", "だらだら", "本編", "第一部", "第二部",
  "開会式", "閉会式", "開会", "閉会"
];
const CHAPTER_STOP_EXACT = [
  "挨拶", "あいさつ", "オープニング", "オープニングトーク", "イントロ", "OP", "オープニング曲",
  "エンディング", "アウトロ", "ED", "エンディング曲",
  "MC", "雑談", "フリートーク", "トーク", "おしゃべり", "お喋り",
  "告知", "お知らせ", "情報", "恒例", "ニュース",
  "待機", "待機所", "準備", "スタート", "開始", "入場",
  "休憩", "ブレイク", "飲み物", "トイレ",
  "コメント", "コメント返し", "感想", "振り返り", "反省会",
  "ありがとう", "配信終了", "おつかれ", "お疲れ", "バイバイ", "ばいばい", "終了",
  "リクエスト募集", "リクエスト", "アンケート", "メンバーシップ", "スポンサー", "スパチャ", "お気持ち",
  "練習", "リハーサル", "発声", "ウォームアップ", "ボイトレ", "準備運動",
  "おまけ", "オマケ", "BGM", "SE", "効果音",
  "質問", "Q&A", "質疑応答", "ぐだぐだ", "だらだら", "本編", "第一部", "第二部",
  "声入り", "セトリ", "セットリスト"
];

/* チャプタータイトルが非歌唱（トーク系）かを判定 */
function isTalkChapter(title) {
  const s = String(title || "");
  if (!s) return false;
  const norm = s.normalize("NFKC").toLowerCase().replace(/[\s　]+/g, "");
  if (!norm) return true;
  if (CHAPTER_STOP_EXACT.some((w) => norm === w.normalize("NFKC").toLowerCase())) return true;
  if (CHAPTER_STOP_PREFIX.some((w) => norm.indexOf(w.normalize("NFKC").toLowerCase()) === 0)) return true;
  // 【】タグのみ等の装飾だけのチャプターは除去
  if (/^[【\[（(].+[】\]）)]$/.test(norm)) return true;
  return false;
}

/* チャプター行のタイム文字列を秒に変換（mm:ss / h:mm:ss、全角コロン対応） */
function tsToSec(ts) {
  const m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(String(ts || "").trim());
  if (!m) return null;
  const h = m[3] !== undefined ? parseInt(m[1], 10) : 0;
  const min = m[3] !== undefined ? parseInt(m[2], 10) : parseInt(m[1], 10);
  const sec = m[3] !== undefined ? parseInt(m[3], 10) : parseInt(m[2], 10);
  if (min > 59 || sec > 59) return null;
  return h * 3600 + min * 60 + sec;
}

/* 説明文からチャプター一覧を解析 → [{ start, title, clean, key }]（start 昇順）
   clean: 表示用に整えた曲名（空なら非歌唱扱い）、key: カバー曲キー（空なら登録不可） */
function parseChapters(description, opts) {
  const o = opts || {};
  const lines = String(description || "").normalize("NFKC").split(/\r?\n/);
  const chapters = [];
  lines.forEach((line) => {
    const m = /^(\d+:\d{1,2}(?::\d{1,2})?)\s+(.+)$/.exec(line.trim());
    if (!m) return;
    const start = tsToSec(m[1]);
    if (start === null) return;
    let raw = m[2].trim().replace(/^[〜~]+\s*/, "");   // リレー形式の先頭「〜」を除去
    if (isTalkChapter(raw)) return;
    const clean = o.cleanTitle ? o.cleanTitle(raw) : displayTitle(raw);
    if (!clean) return;
    // キーは「曲名 / アーティスト」の曲名部分のみ（カバー曲キーと一致させるため）
    const key = normalizeTitle(clean.split(/[/／]/)[0]);
    if (!key) return;
    chapters.push({ start, title: clean, key });
  });
  chapters.sort((a, b) => a.start - b.start);
  // 同一タイムスタンプの重複除去
  const seen = new Set();
  return chapters.filter((c) => {
    if (seen.has(c.start)) return false;
    seen.add(c.start);
    return true;
  });
}

/* チャプター列に end（次チャプター開始 or 動画長さ）を付与 */
function applyEnds(chapters, durationSec) {
  return chapters.map((c, i) => {
    const end = i + 1 < chapters.length ? chapters[i + 1].start : (durationSec || 0);
    return { key: c.key, title: c.title, start: c.start, end };
  });
}

module.exports = {
  MEMBER_NAMES,
  MEMBER_ALIASES,
  normalizeTitle,
  displayTitle,
  parseChapters,
  applyEnds,
  tsToSec,
  isTalkChapter
};
