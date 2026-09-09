#!/usr/bin/env node
/**
 * Fetch goods from shop.milpr.com/products.json nightly and update data.js GOODS array.
 * - pages through ?limit=250&page=N
 * - parses period from body_html (rawOrder/rawShip) via Japanese date regex
 * - guesses memberId/kind/category from tags/title/handle
 * - merges into data.js by replacing `const GOODS = [...]` block
 */
const fs = require("fs");
const path = require("path");

const DATA_JS = path.join(__dirname, "..", "data.js");
const BASE = "https://shop.milpr.com/products.json?limit=250&page=";

const MEMBER_MAP = [
  { id: "konomi", names: ["甘狼このみ", "このみ"] },
  { id: "nono", names: ["音ノ乃のの", "のの"] },
  { id: "akubi", names: ["あくび・でもんすぺーど", "あくび"] },
  { id: "koma", names: ["小廻こま", "こま"] },
  { id: "raco", names: ["音ノ瀬らこ", "らこ"] },
  { id: "yura", names: ["ゆらぎゆら", "ゆら"] },
  { id: "nuhu", names: ["虹深°ぬふ", "ぬふ", "nufu"] },
  { id: "tsukuri", names: ["眠雲ツクリ", "ツクリ"] },
  { id: "liz", names: ["雨夜リズ", "リズ"] },
  { id: "rei", names: ["夕霧レイ", "レイ"] },
  { id: "mahoro", names: ["鹿乃まほろ", "まほろ"] },
  { id: "milchan", names: ["ミリちゃん"] },
];

function tagsText(p) {
  // Shopify側が tags を文字列でなく配列で返す商品があるため正規化
  if (Array.isArray(p.tags)) return p.tags.join(",");
  return p.tags || "";
}

function guessMemberId(p) {
  const hay = (p.handle || "") + " " + (p.title || "") + " " + tagsText(p) + " " + (p.product_type || "");
  const low = hay.toLowerCase();
  // handle prefix like konomi_, koma_birthday
  for (const m of MEMBER_MAP) {
    if (low.includes(m.id)) return m.id;
    for (const n of m.names) {
      if (hay.includes(n)) return m.id;
    }
  }
  // tags first exact member name
  if (p.tags) {
    const tags = tagsText(p).split(",").map(s => s.trim());
    for (const t of tags) {
      for (const m of MEMBER_MAP) {
        if (m.names.includes(t)) return m.id;
      }
    }
  }
  return "";
}

const KIND_MAP = [
  { kw: ["フルセット", "fullset"], kind: "fullset" },
  { kw: ["アクリルスタンド", "アクスタ", "ジオラマ", "アクキー", "アクリル"], kind: "stand" },
  { kw: ["缶バッジ", "ピンバッジ", "バッジ"], kind: "badge" },
  { kw: ["カード", "チェキ", "ポストカード", "フォト"], kind: "card" },
  { kw: ["ボイス", "voice"], kind: "voice" },
  { kw: ["ボトル", "タンブラー", "グラス", "ペットボトル"], kind: "bottleholder" },
  { kw: ["クリアファイル", "アクリルボード", "ボード"], kind: "clearfile" },
  { kw: ["クッション", "抱き枕", "枕"], kind: "bodypillow" },
  { kw: ["靴下", "ソックス", "sock"], kind: "sock" },
  { kw: ["キーホルダー", "keyholder", "チャーム", "アクキー"], kind: "keyholder" },
  { kw: ["ネックレス"], kind: "necklace" },
];

function guessKind(p) {
  const hay = (p.title || "") + " " + (p.product_type || "") + " " + tagsText(p);
  for (const m of KIND_MAP) {
    for (const kw of m.kw) if (hay.includes(kw)) return m.kind;
  }
  // fallback by product_type
  if (p.product_type === "フルセット") return "fullset";
  if (p.product_type === "アクリルグッズ") return "stand";
  if (p.product_type?.includes("バッジ")) return "badge";
  if (p.product_type?.includes("カード")) return "card";
  return "clearfile";
}

function guessCategory(p) {
  const hay = (p.title || "") + " " + tagsText(p);
  if (hay.includes("誕生日")) return "誕生日記念";
  if (hay.includes("周年")) return "周年記念";
  if (hay.includes("加入")) return "加入記念";
  if (hay.includes("新衣装")) return "新衣装記念";
  if (hay.includes("常設")) return "常設";
  if (hay.includes("TCG")) return "TCG";
  // fallback to product_type or first tag
  if (p.product_type) return p.product_type;
  return "";
}

function parsePeriod(bodyHtml) {
  // body_html often contains: 受注期間 2026年9月5日 〜 2026年10月5日 / お届け時期 2027年1月上旬〜
  const text = (bodyHtml || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  // normalize
  const rawOrderMatch = text.match(/受注[^0-9]*([0-9]{4}年[^〜～]+[〜～][^<\n]+)/);
  const rawShipMatch = text.match(/(?:お届け|発送|配送)[^0-9]*([0-9]{4}年[^<\n]+)/);
  const rawOrder = rawOrderMatch ? rawOrderMatch[1].trim().replace(/\s+/g, " ") : null;
  const rawShip = rawShipMatch ? rawShipMatch[1].trim().replace(/\s+/g, " ") : null;
  function parseJaDateRange(s) {
    if (!s) return { from: null, to: null };
    // extract two dates like 2026年9月5日 〜 2026年10月5日 or 2026年9月5日〜10月3日
    const re = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
    const dates = [];
    let m;
    while ((m = re.exec(s)) !== null) {
      const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
      // if second date missing year, use first year
      dates.push({ y, mo, d });
    }
    if (dates.length === 0) return { from: null, to: null };
    // handle case like "2026年9月5日〜10月3日" where second date missing year
    if (dates.length === 1 && s.includes("〜")) {
      const second = s.split("〜")[1] || s.split("～")[1];
      const mm = second && second.match(/(\d{1,2})月\s*(\d{1,2})日/);
      if (mm) dates.push({ y: dates[0].y, mo: parseInt(mm[1], 10), d: parseInt(mm[2], 10) });
    }
    const toIso = (o) => `${o.y}-${String(o.mo).padStart(2, "0")}-${String(o.d).padStart(2, "0")}T00:00:00`;
    const toIsoEnd = (o) => `${o.y}-${String(o.mo).padStart(2, "0")}-${String(o.d).padStart(2, "0")}T23:59:00`;
    if (dates.length === 1) return { from: toIso(dates[0]), to: null };
    return { from: toIso(dates[0]), to: toIsoEnd(dates[1]) };
  }
  const o = parseJaDateRange(rawOrder);
  const s = parseJaDateRange(rawShip);
  // ship may be like "2027年1月上旬" -> approximate to 1st
  function approxShip(sRaw) {
    if (!sRaw) return { from: null, to: null };
    const m = sRaw.match(/(\d{4})年\s*(\d{1,2})月/);
    if (m) {
      const y = parseInt(m[1], 10), mo = parseInt(m[2], 10);
      return { from: `${y}-${String(mo).padStart(2, "0")}-01`, to: `${y}-${String(mo).padStart(2, "0")}-28` };
    }
    return { from: null, to: null };
  }
  let shipFrom = s.from, shipTo = s.to;
  if (!shipFrom) {
    const a = approxShip(rawShip);
    shipFrom = a.from; shipTo = a.to;
  }
  return {
    orderFrom: o.from, orderTo: o.to,
    shipFrom, shipTo,
    rawOrder, rawShip
  };
}

async function fetchAll() {
  let page = 1;
  let all = [];
  while (true) {
    const url = BASE + page;
    console.log(`fetch ${url}`);
    const res = await fetch(url, { headers: { "User-Agent": "MilliOrbisBot/1.0" } });
    if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
    const data = await res.json();
    const products = data.products || [];
    if (products.length === 0) break;
    all = all.concat(products);
    if (products.length < 250) break;
    page++;
    if (page > 10) break; // safety
  }
  console.log(`total products: ${all.length}`);
  return all;
}

function toGoods(p) {
  const handle = p.handle;
  const title = p.title;
  const product_type = p.product_type || "";
  const tags = tagsText(p);
  const price = p.variants && p.variants[0] ? Math.round(parseFloat(p.variants[0].price)) : 0;
  const oldPrice = p.variants && p.variants[0] && p.variants[0].compare_at_price ? Math.round(parseFloat(p.variants[0].compare_at_price)) : null;
  const image = p.images && p.images[0] ? p.images[0].src : "";
  const url = `https://shop.milpr.com/products/${handle}`;
  const memberId = guessMemberId(p);
  const kind = guessKind(p);
  const category = guessCategory(p);
  const period = parsePeriod(p.body_html || "");
  // status logic: available===false -> soldout, else check orderTo < now
  const now = new Date();
  let status = "onSale";
  let permanent = false;
  let tag = null;
  const tagList = tags.split(",").map(s => s.trim()).filter(Boolean);
  if (tagList.includes("常設商品") || title.includes("常設")) {
    permanent = true;
    status = "onSale";
  } else if (p.available === false || tagList.includes("販売終了")) {
    status = "soldout";
    tag = "販売終了";
  } else if (period.orderTo && new Date(period.orderTo) < now) {
    status = "soldout";
    tag = "販売終了";
  } else if (period.orderTo) {
    const diff = new Date(period.orderTo) - now;
    if (diff > 0 && diff < 3 * 86400000) tag = "まもなく終了";
  }
  // also respect Shopify tags
  if (tagList.includes("まもなく終了")) tag = "まもなく終了";

  return {
    id: handle,
    name: title,
    handle,
    memberId,
    memberLabel: "",
    kind,
    category,
    price,
    oldPrice: oldPrice && oldPrice !== price ? oldPrice : null,
    image,
    url,
    shop: "official",
    place: "ミリプロオフィシャルショップ",
    period: {
      orderFrom: period.orderFrom,
      orderTo: period.orderTo,
      shipFrom: period.shipFrom,
      shipTo: period.shipTo,
      rawOrder: period.rawOrder,
      rawShip: period.rawShip
    },
    status,
    permanent,
    tag,
    tags: tagList,
    product_type,
    available: !!p.available,
    published_at: p.published_at || null
  };
}

async function main() {
  const products = await fetchAll();
  const goods = products.map(toGoods);
  // sort by published_at desc like original
  goods.sort((a,b) => new Date(b.published_at||0) - new Date(a.published_at||0));

  let js = fs.readFileSync(DATA_JS, "utf-8");
  // 既存の手直し（担当メンバー表示）を維持：既知IDは memberId/memberLabel を引き継ぎ、新規のみ自動判定を使う
  try {
    const m = js.match(/const GOODS = \[[\s\S]*?\];/);
    if (m) {
      const prev = new Function(m[0] + ";return GOODS;")();
      const prevMap = {};
      for (const g of prev) prevMap[g.id] = g;
      for (const g of goods) {
        const p = prevMap[g.id];
        if (p) {
          if (p.memberId !== undefined) g.memberId = p.memberId;
          g.memberLabel = p.memberLabel || "";
        }
      }
    }
  } catch (e) { console.error("keep existing memberId failed:", e.message); }
  // 既存ファイルに合わせて1行1アイテムのコンパクト形式で出力（差分を小さく保つ）
  const newGoodsStr = "const GOODS = [\n" + goods.map(g => "  " + JSON.stringify(g)).join(",\n") + "\n];";
  // replace existing GOODS block: from "const GOODS = [" to "];"
  const re = /const GOODS = \[[\s\S]*?\];/;
  if (!re.test(js)) {
    console.error("GOODS block not found in data.js");
    process.exit(1);
  }
  js = js.replace(re, newGoodsStr.replace(/\$/g, "$$")); // escape $
  fs.writeFileSync(DATA_JS, js, "utf-8");
  console.log(`updated ${DATA_JS} with ${goods.length} items`);
  // also write a debug json
  fs.writeFileSync(path.join(__dirname, "..", "data", "goods-fetched.json"), JSON.stringify(goods, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
