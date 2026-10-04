#!/usr/bin/env node
/**
 * グッズ即時通知: 新規グッズ (公式 + コラボ/プライズ手動分) をDiscordへ
 * 1商品1通ではなく、公式の括り (○○記念グッズ等) ごとに1通にまとめる。
 *
 * 使い方:
 *   DISCORD_WEBHOOK_GOODS=https://discord.com/api/webhooks/... node tools/notify-goods.js [--dry-run] [--init] [--force] [--limit N]
 *   --init  : 初回のみ。全件を通知せずstateに登録する (初回スパム防止)
 *   --force : init済みでも強制送信 (テスト用)
 *   --limit : 最大通知商品数 (デフォルト50。括り単位で丸める)
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
  loadState,
  saveState,
  sendEmbeds,
  hasArgs,
  argValue,
} = require("./discord");
const { groupGoods, groupToEmbeds } = require("./goods-group");

const ROOT = path.join(__dirname, "..");
const FETCHED = path.join(ROOT, "data", "goods-fetched.json");
const COLLAB = path.join(ROOT, "data", "goods-collab.js");

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
      const fn = new Function(js + ";return (typeof GOODS_COLLAB !== 'undefined' ? GOODS_COLLAB : []);");
      return fn();
    }
    return new Function(m[0] + ";return GOODS_COLLAB;")();
  } catch (e) {
    console.error("load collab failed:", e.message);
    return [];
  }
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

  // 新規検出 (商品単位)
  const fresh = [];
  const all = official.concat(collab);
  for (const g of all) {
    if (!g || !g.id) continue;
    if (state.goodsNotified[g.id] && !force) continue;
    if (g.status === "soldout") {
      state.goodsNotified[g.id] = g.published_at || "soldout";
      continue;
    }
    fresh.push(g);
  }

  // 公開日昇順で最大limit件 → 括り単位で丸める (途中で切らない)
  fresh.sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0));
  let targets = fresh.slice(0, limit);
  if (fresh.length > targets.length) {
    // limit境界が括り途中の場合、その括り全体を含める
    const { groupKey } = require("./goods-group");
    const boundary = groupKey(fresh[targets.length]);
    while (targets.length < fresh.length && groupKey(fresh[targets.length]) === boundary) {
      targets.push(fresh[targets.length]);
      if (targets.length - limit > 20) break; // 安全弁
    }
  }
  console.log(`new goods: ${fresh.length} items (sending ${targets.length})`);

  const registerAll = (list) => {
    for (const g of list) {
      if (g && g.id && !state.goodsNotified[g.id]) state.goodsNotified[g.id] = g.published_at || "1";
    }
  };

  if (isFirstRun && !force && !initMode) {
    console.log("first run detected (empty state). Registering all IDs WITHOUT notifying to avoid spam.");
    console.log("If you really want to notify everything, re-run with --force.");
    registerAll(all);
    if (!dryRun) saveState(state);
    return;
  }
  if (initMode && !force) {
    console.log(`--init: registering ${all.length} IDs without notifying.`);
    registerAll(all);
    if (!dryRun) saveState(state);
    else console.log("[dry-run] state not written");
    return;
  }

  if (!targets.length) {
    if (!dryRun) saveState(state);
    console.log("no new goods to notify.");
    return;
  }

  const groups = groupGoods(targets);
  console.log(`groups: ${groups.length}`);
  const embeds = groups.flatMap((grp) => groupToEmbeds(grp, {}));
  const nCollab = targets.filter((g) => g.shop !== "official").length;
  const content =
    `🛍️ **新着グッズ ${groups.length}括り・${targets.length}点**` +
    (nCollab ? ` (うちコラボ/プライズ ${nCollab}点)` : "") +
    (fresh.length > targets.length ? ` — ほか${fresh.length - targets.length}点は次回` : "");

  const url = webhook || "https://discord.com/api/webhooks/dry-run";
  const res = await sendEmbeds(url, content, embeds, { dryRun });
  console.log(`sent embeds: ${res.sent}`);

  if (!dryRun) {
    for (const g of targets) state.goodsNotified[g.id] = g.published_at || "1";
    saveState(state);
    console.log("state updated.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
