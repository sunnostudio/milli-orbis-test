#!/usr/bin/env node
/**
 * グッズ即時通知: 新規グッズ (公式 + コラボ/プライズ手動分) をDiscordへ
 *
 * 使い方:
 *   DISCORD_WEBHOOK_GOODS=https://discord.com/api/webhooks/... node tools/notify-goods.js [--dry-run] [--init] [--force] [--limit N]
 *   --init  : 初回のみ。全件を通知せずstateに登録する (初回スパム防止)
 *   --force : init済みでも強制送信 (テスト用)
 *   --limit : 最大通知件数 (Embed分割前の上限。デフォルト50)
 *
 * 検知ロジック:
 *   - data/goods-fetched.json (公式自動取得) の id集合
 *   - data/goods-collab.js (手動: 書籍・プライズ・コラボ) の id集合
 *   - data/notify-state.json の goodsNotified に無い id = 新規
 *   - status==="soldout" の新規は除外 (再掲防止)
 */
const fs = require("fs");
const path = require("path");
const {
  DISCLAIMER,
  loadState,
  saveState,
  sendEmbeds,
  hasArgs,
  argValue,
} = require("./discord");

const ROOT = path.join(__dirname, "..");
const FETCHED = path.join(ROOT, "data", "goods-fetched.json");
const COLLAB = path.join(ROOT, "data", "goods-collab.js");

const MEMBER_JA = {
  konomi: "甘狼このみ", nono: "音ノ乃のの", akubi: "あくび・でもんすぺーど",
  koma: "小廻こま", raco: "音ノ瀬らこ", yura: "ゆらぎゆら",
  nuhu: "虹深°ぬふ", tsukuri: "眠雲ツクリ", liz: "雨夜リズ",
  rei: "夕霧レイ", mahoro: "鹿乃まほろ", milchan: "ミリちゃん", aoi: "海琳あおい",
};

function loadOfficial() {
  try {
    return JSON.parse(fs.readFileSync(FETCHED, "utf-8"));
  } catch (e) {
    console.error("goods-fetched.json not found, trying data.js GOODS...");
    const js = fs.readFileSync(path.join(ROOT, "data.js"), "utf-8");
    const m = js.match(/const GOODS = \[[\s\S]*?\];/);
    if (!m) return [];
    return new Function(m[0] + ";return GOODS;")();
  }
}

function loadCollab() {
  try {
    const js = fs.readFileSync(COLLAB, "utf-8");
    const m = js.match(/const GOODS_COLLAB = \[[\s\S]*?\];/s);
    if (!m) {
      // フォールバック: ファイル全体を実行 (const宣言のみなので安全)
      const fn = new Function(js + ";return (typeof GOODS_COLLAB !== 'undefined' ? GOODS_COLLAB : []);");
      return fn();
    }
    return new Function(m[0] + ";return GOODS_COLLAB;")();
  } catch (e) {
    console.error("load collab failed:", e.message);
    return [];
  }
}

function fmtPrice(g) {
  if (g.price == null) return "価格未定(プライズ等)";
  let s = `¥${Number(g.price).toLocaleString("ja-JP")}`;
  if (g.oldPrice && g.oldPrice !== g.price) s += ` (旧¥${Number(g.oldPrice).toLocaleString("ja-JP")})`;
  return s;
}

function goodsToEmbed(g, isCollab) {
  const memberJa = MEMBER_JA[g.memberId] || g.memberLabel || "";
  const lines = [];
  lines.push(`💴 ${fmtPrice(g)} ｜ ${g.category || g.product_type || "グッズ"}`);
  if (memberJa) lines.push(`👤 ${memberJa}`);
  if (g.period && g.period.rawOrder) lines.push(`🗓️ ${g.period.rawOrder}`);
  if (g.period && g.period.rawShip) lines.push(`📦 ${g.period.rawShip}`);
  if (g.place) lines.push(`🏬 ${g.place}`);
  if (g.tags && g.tags.length) lines.push(`🏷️ ${g.tags.slice(0, 4).join(" / ")}`);
  lines.push(`🔗 [商品ページ](${g.url})`);
  lines.push(`🗂️ [Milli Orbisグッズ](https://milli-orbis-portal.pages.dev/goods/current.html)`);

  const embed = {
    title: (isCollab ? "🤝 " : "🛍️ ") + String(g.name || g.id).slice(0, 250),
    url: g.url,
    description: lines.join("\n").slice(0, 4000),
    color: g.permanent ? 0x8a9ba8 : isCollab ? 0x9b59b6 : 0xe85d9e,
    footer: { text: `${isCollab ? "コラボ/プライズ・書籍" : "公式ショップ"} ｜ ${DISCLAIMER}`.slice(0, 200) },
    timestamp: g.published_at || undefined,
  };
  if (g.image && /^https?:\/\//.test(g.image)) {
    embed.image = { url: g.image };
  }
  return embed;
}

async function main() {
  const dryRun = hasArgs("--dry-run");
  const initMode = hasArgs("--init");
  const force = hasArgs("--force");
  const limit = parseInt(argValue("--limit", "50"), 10);

  const webhook = process.env.DISCORD_WEBHOOK_GOODS || "";
  if (!webhook && !dryRun && !initMode) {
    console.error("ERROR: DISCORD_WEBHOOK_GOODS is not set. Add it to GitHub Secrets.");
    process.exit(1);
  }

  const official = loadOfficial();
  const collab = loadCollab();
  console.log(`official: ${official.length}, collab: ${collab.length}`);

  const state = loadState();
  const isFirstRun = Object.keys(state.goodsNotified || {}).length === 0;

  // 新規検出
  const fresh = [];
  for (const g of official) {
    if (!g || !g.id) continue;
    if (state.goodsNotified[g.id] && !force) continue;
    if (g.status === "soldout") {
      // 初出から売切は通知しないが、stateには記録して次回以降も無視
      state.goodsNotified[g.id] = g.published_at || "soldout";
      continue;
    }
    fresh.push({ g, isCollab: false });
  }
  for (const g of collab) {
    if (!g || !g.id) continue;
    if (state.goodsNotified[g.id] && !force) continue;
    if (g.status === "soldout") {
      state.goodsNotified[g.id] = g.published_at || "soldout";
      continue;
    }
    fresh.push({ g, isCollab: true });
  }

  // published_at昇順 (古→新) で最大limit件
  fresh.sort((a, b) => new Date(a.g.published_at || 0) - new Date(b.g.published_at || 0));
  const targets = fresh.slice(0, limit);
  console.log(`new goods: ${fresh.length} (sending ${targets.length})`);

  if (isFirstRun && !force && !initMode) {
    console.log("first run detected (empty state). Registering all IDs WITHOUT notifying to avoid spam.");
    console.log("If you really want to notify everything, re-run with --force.");
    for (const g of official.concat(collab)) {
      if (g && g.id) state.goodsNotified[g.id] = g.published_at || "1";
    }
    if (!dryRun) saveState(state);
    return;
  }
  if (initMode && !force) {
    console.log(`--init: registering ${official.length + collab.length} IDs without notifying.`);
    for (const g of official.concat(collab)) {
      if (g && g.id && !state.goodsNotified[g.id]) state.goodsNotified[g.id] = g.published_at || "1";
    }
    if (!dryRun) saveState(state);
    else console.log("[dry-run] state not written");
    return;
  }

  if (!targets.length) {
    // soldout除外分のstate更新だけは保存 (無駄な再計算防止)
    if (!dryRun) saveState(state);
    console.log("no new goods to notify.");
    return;
  }

  const embeds = targets.map((t) => goodsToEmbed(t.g, t.isCollab));
  const nCollab = targets.filter((t) => t.isCollab).length;
  const content =
    `🛍️ **新着グッズ ${targets.length}件**` +
    (nCollab ? ` (うちコラボ/プライズ ${nCollab}件)` : "") +
    (fresh.length > targets.length ? ` — ほか${fresh.length - targets.length}件は次回` : "");

  const url = webhook || "https://discord.com/api/webhooks/dry-run";
  const res = await sendEmbeds(url, content, embeds, { dryRun });
  console.log(`sent embeds: ${res.sent}`);

  if (!dryRun) {
    for (const t of targets) state.goodsNotified[t.g.id] = t.g.published_at || "1";
    // 送信しきれなかった残りは次回に回すためstateに書かない
    saveState(state);
    console.log("state updated.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
