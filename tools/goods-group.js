#!/usr/bin/env node
/**
 * グッズ括りまとめ共有ライブラリ
 * - 公式ショップは「○○記念グッズ」等の単位で一気に発売されるため、
 *   1商品1通ではなく1括り1通にまとめて通知する。
 * - タレント表示は先頭1人でなく全員 (memberId + tags内の名前の和集合)。
 */
const { DISCLAIMER } = require("./discord");

const MEMBER_JA = {
  konomi: "甘狼このみ", nono: "音ノ乃のの", akubi: "あくび・でもんすぺーど",
  koma: "小廻こま", raco: "音ノ瀬らこ", yura: "ゆらぎゆら",
  nuhu: "虹深°ぬふ", tsukuri: "眠雲ツクリ", liz: "雨夜リズ",
  rei: "夕霧レイ", mahoro: "鹿乃まほろ", milchan: "ミリちゃん", aoi: "海琳あおい",
};
// 表示順 (サイトの並びに合わせる)
const MEMBER_ORDER = ["konomi", "nono", "akubi", "koma", "raco", "yura", "nuhu", "tsukuri", "liz", "rei", "mahoro", "aoi", "milchan"];
const JA_SET = new Set(Object.values(MEMBER_JA));

function fmtPrice(n) {
  if (n == null) return null;
  return "¥" + Number(n).toLocaleString("ja-JP");
}

/** 商品に関わるタレント名(日本語)を正規順で全件返す */
function goodsMembers(g) {
  const found = new Set();
  if (g.memberId && MEMBER_JA[g.memberId]) found.add(MEMBER_JA[g.memberId]);
  if (g.memberLabel && JA_SET.has(g.memberLabel)) found.add(g.memberLabel);
  for (const t of g.tags || []) {
    const name = String(t).trim();
    if (JA_SET.has(name)) found.add(name);
  }
  const order = new Map(MEMBER_ORDER.map((id, i) => [MEMBER_JA[id], i]));
  return [...found].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

function jstDay(s) {
  if (!s) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(s));
  return m ? m[1] : "";
}

/**
 * 括りキーの素案 (タイトル基準):
 * タイトル末尾の商品名トークンを除去した残りが公式の括り名になる。
 * 例: 「眠雲ツクリ 誕生日記念グッズ 2026 アクリルスタンド」→「眠雲ツクリ 誕生日記念グッズ 2026」
 * 末尾の「全5種」等のバリエーション表記も除去して寄せる。
 */
function collectionBase(g) {
  const title = String(g.name || g.handle || g.id || "");
  // 区切りは空白・全角空白・ハイフンのみ。長音「ー」はカタカナの一部なので割らない
  const tokens = title.split(/[\s　-]+/).filter(Boolean);
  // 末尾のバリエーション表記 (全5種等) を除去
  while (tokens.length > 1 && /^全?\d+種$/.test(tokens[tokens.length - 1])) tokens.pop();
  if (tokens.length >= 2) {
    tokens.pop(); // 商品名トークンを除去
    return "T:" + tokens.join(" ");
  }
  // トークン分割できない場合はhandle基準にフォールバック
  const h = String(g.handle || g.id || "");
  if (h.includes("_")) {
    const parts = h.split("_");
    parts.pop();
    return "H:" + parts.join("_");
  }
  return "T:" + title;
}

/** 最終キー = 括り素案 + 発売日 + 締切日 (別企画の同日被りを分離) */
function groupKey(g) {
  const pub = jstDay(g.published_at);
  const to = (g.period && g.period.orderTo) ? jstDay(g.period.orderTo) : "(none)";
  return `${collectionBase(g)}|${pub}|${to}`;
}

function commonPrefix(strs) {
  if (!strs.length) return "";
  let pre = strs[0];
  for (const s of strs.slice(1)) {
    let i = 0;
    while (i < pre.length && i < s.length && pre[i] === s[i]) i++;
    pre = pre.slice(0, i);
    if (!pre) break;
  }
  // 末尾の区切り文字・空白・中途半端な「グッズ」等を整える
  return pre.replace(/[\s　・\-_／\/]+$/, "").trim();
}

function shortName(full, prefix) {
  if (prefix && full.startsWith(prefix)) {
    const rest = full.slice(prefix.length).replace(/^[\s　・\-_／\/]+/, "").trim();
    if (rest) return rest;
  }
  return full;
}

/** キービジュ候補: フルセット系優先 → 公開が早い順 → 画像あり */
function pickKeyVisual(items) {
  const withImg = items.filter((g) => g.image && /^https?:\/\//.test(g.image));
  if (!withImg.length) return null;
  const byDate = withImg.slice().sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0));
  const setLike = byDate.find((g) =>
    g.kind === "fullset" || /フルセット|タレントセット|プレミアムセット|コンプリートセット/.test(g.name || "")
  );
  return setLike || byDate[0];
}

/**
 * 1括り → Embed最大2個 (キービジュ先行＋詳細)。
 * DiscordのEmbedは画像が必ず本文の下に出るため、目線順のために
 * キービジュ専用Embedを先頭に分離する。商品は inline フィールドの3列グリッド。
 * opts: { titlePrefix } 例: "🛍️" / "⏰ 本日締切:"
 */
function groupToEmbeds(group, opts = {}) {
  const prefix = opts.titlePrefix || "🛍️";
  const items = group.items;
  const names = items.map((g) => String(g.name || g.id));
  const cpre = commonPrefix(names);
  const title = (cpre || "新着グッズ") + ` (${items.length}点)`;

  const members = [...new Set(items.flatMap(goodsMembers))];
  // 価格帯
  const prices = items.map((g) => g.price).filter((p) => p != null);
  const priceRange = !prices.length
    ? "価格未定(プライズ等)"
    : Math.min(...prices) === Math.max(...prices)
      ? fmtPrice(prices[0])
      : `${fmtPrice(Math.min(...prices))}〜${fmtPrice(Math.max(...prices))}`;
  // 受注期間 (括り内は基本同一。異なれば先頭のみ+注記)
  const raws = [...new Set(items.map((g) => g.period && g.period.rawOrder).filter(Boolean))];
  const ships = [...new Set(items.map((g) => g.period && g.period.rawShip).filter(Boolean))];
  const cats = [...new Set(items.map((g) => g.category || g.product_type).filter(Boolean))].slice(0, 3);

  const lines = [];
  if (members.length) lines.push(`👥 ${members.join("、")}`);
  if (raws.length) lines.push(`🗓️ ${raws[0]}` + (raws.length > 1 ? " ほか" : ""));
  if (ships.length) lines.push(`📦 ${ships[0]}` + (ships.length > 1 ? " ほか" : ""));
  lines.push(`💴 ${priceRange}` + (cats.length ? ` ｜ ${cats.join(" / ")}` : ""));
  lines.push(`🗂️ [Milli Orbisグッズ一覧](https://milli-orbis-portal.pages.dev/goods/current.html)`);

  const kv = pickKeyVisual(items);
  const isCollab = items.some((g) => g.shop !== "official");
  const color = prefix.includes("締切") ? 0xe74c3c : isCollab ? 0x9b59b6 : 0xe85d9e;
  const fullTitle = `${prefix} ${title}`.slice(0, 250);
  const embeds = [];
  if (kv) {
    // キービジュ先行Embed (タイトル＋画像のみ。詳細より先に目に入る)
    embeds.push({
      title: fullTitle,
      url: /^https?:\/\//.test(kv.url || "") ? kv.url : undefined,
      image: { url: kv.image },
      color,
    });
  }
  const main = {
    // キービジュありの場合は詳細Embedのタイトルを省略 (重複見出し防止)
    title: kv ? undefined : fullTitle,
    description: lines.join("\n").slice(0, 4000),
    color,
    footer: { text: `${isCollab ? "コラボ/プライズ・書籍含む" : "公式ショップ"} ｜ ${DISCLAIMER}`.slice(0, 200) },
  };

  if (items.length === 1) {
    // 単品括りは商品名の繰り返しを避け、リンク1行のみ
    main.url = /^https?:\/\//.test(items[0].url || "") ? items[0].url : undefined;
  } else {
    // 商品グリッド (inline 3列。個別画像Embedは作らず縦長化を防ぐ)
    const MAX_FIELDS = 24;
    main.fields = items.slice(0, MAX_FIELDS).map((g) => {
      const sn = shortName(String(g.name || g.id), cpre).slice(0, 50) || "商品";
      const pr = g.price != null ? fmtPrice(g.price) : "価格未定";
      return { name: sn, value: `${pr}\n[開く](${g.url})`, inline: true };
    });
    if (items.length > MAX_FIELDS) {
      main.fields.push({
        name: `ほか${items.length - MAX_FIELDS}点`,
        value: "[ショップで見る](https://shop.milpr.com/)",
        inline: true,
      });
    }
  }
  embeds.push(main);
  return embeds;
}

/** items → group配列 (公開日昇順・グループ内も公開日昇順) */
function groupGoods(items) {
  const map = new Map();
  for (const g of items) {
    const k = groupKey(g);
    if (!map.has(k)) map.set(k, { key: k, isCollab: g.shop !== "official", items: [] });
    const grp = map.get(k);
    grp.items.push(g);
    if (g.shop !== "official") grp.isCollab = true;
  }
  const groups = [...map.values()];
  const ts = (g) => new Date(g.published_at || 0).getTime();
  groups.forEach((grp) => grp.items.sort((a, b) => ts(a) - ts(b)));
  groups.sort((a, b) => ts(a.items[0]) - ts(b.items[0]));
  return groups;
}

module.exports = {
  MEMBER_JA,
  MEMBER_ORDER,
  goodsMembers,
  collectionBase,
  groupKey,
  commonPrefix,
  shortName,
  groupGoods,
  groupToEmbeds,
};
