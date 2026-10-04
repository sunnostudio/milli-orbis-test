#!/usr/bin/env node
/**
 * Discord Webhook 共通ヘルパー (Milli Orbis 非公式通知用)
 * - Node 20 標準 fetch のみ使用 (依存なし)
 * - Embed 上限 (10件/メッセージ, 合計6000文字) を守って分割送信
 */
const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "..", "data", "notify-state.json");
const DISCLAIMER = "※非公式ファンサーバーによる自動通知です。最新情報は公式をご確認ください。";

function jstToday() {
  const now = new Date(Date.now() + 9 * 3600000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function jstDateOf(iso) {
  if (!iso) return null;
  const s = String(iso).trim();
  // サイト内の naive 表記 "YYYY-MM-DD[THH:MM:SS]" (タイムゾーンなし) はJSTの壁時計として扱う。
  // Date.parseだとUTC扱いになり+9hで翌日にずれるため、先に切り出す。
  const naive = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (naive && !hasTz) return `${naive[1]}-${naive[2]}-${naive[3]}`;
  const t = Date.parse(s);
  if (!isFinite(t)) return null;
  const j = new Date(t + 9 * 3600000);
  const y = j.getUTCFullYear();
  const m = String(j.getUTCMonth() + 1).padStart(2, "0");
  const d = String(j.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const s = JSON.parse(raw);
    if (!s.goodsNotified) s.goodsNotified = {};
    if (!s.eventsNotified) s.eventsNotified = {};
    if (!s.digests) s.digests = {};
    return s;
  } catch (e) {
    return { goodsNotified: {}, eventsNotified: {}, digests: {} };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function shortHash(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function chunkEmbeds(embeds, maxPerMsg = 10) {
  const out = [];
  for (let i = 0; i < embeds.length; i += maxPerMsg) {
    out.push(embeds.slice(i, i + maxPerMsg));
  }
  return out;
}

async function postWebhook(webhookUrl, payload, opts = {}) {
  const dryRun = !!opts.dryRun;
  if (dryRun) {
    // Webhookトークンをログに残さない (Actionsログはリポジトリ閲覧者が見られるため)
    console.log("[dry-run] POST <webhook-url-masked>");
    console.log(JSON.stringify(payload, null, 2).slice(0, 4000));
    return { dryRun: true };
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const wait = Math.min(30, Math.ceil((body.retry_after || 5)) + 1);
    console.error(`rate limited, waiting ${wait}s...`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return postWebhook(webhookUrl, payload, opts);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord webhook failed: ${res.status} ${text.slice(0, 500)}`);
  }
  // Discord は 204 No Content を返すことが多い
  await res.text().catch(() => "");
  return { ok: true };
}

/** embeds配列を10件ずつに分割して順次送信。1通目にcontentを付ける */
async function sendEmbeds(webhookUrl, content, embeds, opts = {}) {
  if (!embeds.length) {
    console.log("nothing to send (0 embeds), skip");
    return { sent: 0 };
  }
  const chunks = chunkEmbeds(embeds, 10);
  let sent = 0;
  for (let i = 0; i < chunks.length; i++) {
    const payload = { embeds: chunks[i] };
    if (i === 0 && content) payload.content = content;
    // username はサーバー側設定を尊重し、未設定なら Bot 名を付ける
    payload.username = "Milli Orbis";
    console.log(`sending message ${i + 1}/${chunks.length} (${chunks[i].length} embeds)...`);
    await postWebhook(webhookUrl, payload, opts);
    sent += chunks[i].length;
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return { sent };
}

function hasArgs(flag) {
  return process.argv.includes(flag);
}

function argValue(name, def = null) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return def;
}

module.exports = {
  STATE_FILE,
  DISCLAIMER,
  jstToday,
  jstDateOf,
  loadState,
  saveState,
  shortHash,
  sendEmbeds,
  postWebhook,
  hasArgs,
  argValue,
};
