#!/usr/bin/env node
/**
 * イベント即時通知: NEWS / EVENTS / COUNTDOWN (data.js手動更新) + collabs.json
 *
 * 使い方:
 *   DISCORD_WEBHOOK_EVENTS=https://discord.com/api/webhooks/... node tools/notify-events.js [--dry-run] [--init] [--force] [--limit N]
 *
 * 検知ロジック: data/notify-state.json の eventsNotified に無いハッシュ = 新規
 *   - NEWS: date + title
 *   - EVENTS: type + title + (date|member)
 *   - COUNTDOWN: id + date
 *   - collabs.json: title + start + shop
 */
const fs = require("fs");
const path = require("path");
const {
  DISCLAIMER,
  loadState,
  saveState,
  sendEmbeds,
  shortHash,
  hasArgs,
  argValue,
} = require("./discord");

const ROOT = path.join(__dirname, "..");

function extractConst(js, name) {
  const m = js.match(new RegExp(`const ${name} = \\[[\\s\\S]*?\\];`));
  if (!m) return [];
  return new Function(m[0] + `;return ${name};`)();
}

function loadDataJs() {
  const js = fs.readFileSync(path.join(ROOT, "data.js"), "utf-8");
  return {
    news: extractConst(js, "NEWS"),
    events: extractConst(js, "EVENTS"),
    countdown: extractConst(js, "COUNTDOWN"),
  };
}

function loadCollabs() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "collabs.json"), "utf-8"));
  } catch (e) {
    console.error("collabs.json load failed:", e.message);
    return [];
  }
}

function newsKey(n) {
  return "news:" + shortHash((n.date || "") + "|" + (n.title || ""));
}
function eventKey(e) {
  return "ev:" + shortHash((e.type || "") + "|" + (e.title || "") + "|" + (e.date || e.member || ""));
}
function cdKey(c) {
  return "cd:" + shortHash((c.id || "") + "|" + (c.date || "") + "|" + (c.label || ""));
}
function collabKey(c) {
  return "collab:" + shortHash((c.title || "") + "|" + (c.start || "") + "|" + (c.shop || ""));
}

function newsEmbed(n) {
  const lines = [];
  if (n.date) lines.push(`🗓️ ${n.date}`);
  if (n.tag) lines.push(`🏷️ ${n.tag}`);
  if (n.desc) lines.push(String(n.desc).slice(0, 300));
  if (n.url) {
    const abs = /^https?:\/\//.test(n.url) ? n.url : `https://milli-orbis-portal.pages.dev/${n.url}`;
    lines.push(`🔗 [詳細](${abs})`);
  }
  const embed = {
    title: ("📰 " + String(n.title || "(無題)").slice(0, 250)),
    description: lines.join("\n").slice(0, 4000),
    color: /重大発表/.test(n.tag || "") ? 0xe74c3c : /イベント/.test(n.tag || "") ? 0x3498db : /グッズ/.test(n.tag || "") ? 0xe85d9e : 0x2ecc71,
    footer: { text: `サイト更新 ｜ ${DISCLAIMER}`.slice(0, 200) },
  };
  if (n.url) {
    const abs = /^https?:\/\//.test(n.url) ? n.url : `https://milli-orbis-portal.pages.dev/${n.url}`;
    embed.url = abs;
  }
  if (n.image && /^https?:\/\//.test(n.image)) embed.image = { url: n.image };
  return embed;
}

function eventEmbed(e) {
  const typeJa = e.type === "birthday" ? "誕生日" : e.type === "anniversary" ? "記念日" : "イベント";
  const lines = [];
  if (e.date) lines.push(`🗓️ ${e.date}`);
  if (e.member) lines.push(`👤 ${e.member}`);
  if (e.desc) lines.push(String(e.desc).slice(0, 300));
  if (e.url) {
    const abs = /^https?:\/\//.test(e.url) ? e.url : `https://milli-orbis-portal.pages.dev/${e.url}`;
    lines.push(`🔗 [詳細](${abs})`);
  }
  const embed = {
    title: (`📅 [${typeJa}] ` + String(e.title || "(無題)").slice(0, 240)),
    description: lines.join("\n").slice(0, 4000),
    color: e.type === "birthday" ? 0xef6a8d : e.type === "anniversary" ? 0xf2a93b : 0x6a9ef0,
    footer: { text: `カレンダー ｜ ${DISCLAIMER}`.slice(0, 200) },
  };
  if (e.url && /^https?:\/\//.test(e.url)) embed.url = e.url;
  return embed;
}

function cdEmbed(c) {
  const lines = [];
  if (c.date) lines.push(`🗓️ ${String(c.date).slice(0, 16)}`);
  if (c.note) lines.push(String(c.note).slice(0, 300));
  if (c.url) {
    const abs = /^https?:\/\//.test(c.url) ? c.url : `https://milli-orbis-portal.pages.dev/${c.url}`;
    lines.push(`🔗 [詳細](${abs})`);
  }
  return {
    title: ("⏳ " + String(c.label || c.id).slice(0, 250)),
    description: lines.join("\n").slice(0, 4000),
    color: 0xf39c12,
    url: c.url && /^https?:\/\//.test(c.url) ? c.url : undefined,
    footer: { text: `カウントダウン ｜ ${DISCLAIMER}`.slice(0, 200) },
  };
}

function collabEmbed(c) {
  const lines = [];
  if (c.shop) lines.push(`🏬 ${c.shop}`);
  if (c.start || c.end) lines.push(`🗓️ ${c.start || "?"} 〜 ${c.end || "?"}`);
  if (c.desc) lines.push(String(c.desc).slice(0, 300));
  if (c.url) lines.push(`🔗 [詳細](${c.url})`);
  return {
    title: ("🤝 " + String(c.title || "(無題)").slice(0, 250)),
    url: /^https?:\/\//.test(c.url || "") ? c.url : undefined,
    description: lines.join("\n").slice(0, 4000),
    color: 0x9b59b6,
    footer: { text: `コラボ ｜ ${DISCLAIMER}`.slice(0, 200) },
  };
}

async function main() {
  const dryRun = hasArgs("--dry-run");
  const initMode = hasArgs("--init");
  const force = hasArgs("--force");
  const limit = parseInt(argValue("--limit", "20"), 10);

  const webhook = process.env.DISCORD_WEBHOOK_EVENTS || "";
  if (!webhook && !dryRun && !initMode) {
    console.error("ERROR: DISCORD_WEBHOOK_EVENTS is not set. Add it to GitHub Secrets.");
    process.exit(1);
  }

  const { news, events, countdown } = loadDataJs();
  const collabs = loadCollabs();
  console.log(`news: ${news.length}, events: ${events.length}, countdown: ${countdown.length}, collabs: ${collabs.length}`);

  const state = loadState();
  if (!state.eventsNotified) state.eventsNotified = {};
  const isFirstRun = Object.keys(state.eventsNotified).length === 0;

  const fresh = [];
  for (const n of news) {
    const k = newsKey(n);
    if (state.eventsNotified[k] && !force) continue;
    fresh.push({ key: k, embed: newsEmbed(n) });
  }
  for (const e of events) {
    const k = eventKey(e);
    if (state.eventsNotified[k] && !force) continue;
    fresh.push({ key: k, embed: eventEmbed(e) });
  }
  for (const c of countdown) {
    const k = cdKey(c);
    if (state.eventsNotified[k] && !force) continue;
    fresh.push({ key: k, embed: cdEmbed(c) });
  }
  for (const c of collabs) {
    const k = collabKey(c);
    if (state.eventsNotified[k] && !force) continue;
    fresh.push({ key: k, embed: collabEmbed(c) });
  }

  const targets = fresh.slice(0, limit);
  console.log(`new events: ${fresh.length} (sending ${targets.length})`);

  if (isFirstRun && !force && !initMode) {
    console.log("first run detected. Registering all WITHOUT notifying to avoid spam. Re-run with --force to send.");
    for (const n of news) state.eventsNotified[newsKey(n)] = 1;
    for (const e of events) state.eventsNotified[eventKey(e)] = 1;
    for (const c of countdown) state.eventsNotified[cdKey(c)] = 1;
    for (const c of collabs) state.eventsNotified[collabKey(c)] = 1;
    if (!dryRun) saveState(state);
    return;
  }
  if (initMode && !force) {
    console.log("--init: registering without notifying.");
    for (const n of news) if (!state.eventsNotified[newsKey(n)]) state.eventsNotified[newsKey(n)] = 1;
    for (const e of events) if (!state.eventsNotified[eventKey(e)]) state.eventsNotified[eventKey(e)] = 1;
    for (const c of countdown) if (!state.eventsNotified[cdKey(c)]) state.eventsNotified[cdKey(c)] = 1;
    for (const c of collabs) if (!state.eventsNotified[collabKey(c)]) state.eventsNotified[collabKey(c)] = 1;
    if (!dryRun) saveState(state);
    else console.log("[dry-run] state not written");
    return;
  }

  if (!targets.length) {
    console.log("no new events to notify.");
    return;
  }

  const url = webhook || "https://discord.com/api/webhooks/dry-run";
  const content = `📢 **新着情報 ${targets.length}件**` + (fresh.length > targets.length ? ` — ほか${fresh.length - targets.length}件は次回` : "");
  const res = await sendEmbeds(url, content, targets.map((t) => t.embed), { dryRun });
  console.log(`sent embeds: ${res.sent}`);

  if (!dryRun) {
    for (const t of targets) state.eventsNotified[t.key] = 1;
    saveState(state);
    console.log("state updated.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
