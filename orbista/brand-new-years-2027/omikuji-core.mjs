import {
  sampleFortunes,
  standardItemPools
} from "./omikuji-samples.mjs";

export const fortuneTypes = Object.freeze({
  normal: "通常のおみくじ",
  jewel: "宝石みくじ",
  love: "恋みくじ"
});

export const specialCategoryWeights = Object.freeze([
  { category: "talent", weight: 10, label: "個人タレント" },
  { category: "milichan", weight: 7, label: "ミリちゃん" },
  { category: "generation", weight: 5, label: "期生" },
  { category: "nova", weight: 5, label: "NOVA" },
  { category: "uni", weight: 5, label: "UNI" },
  { category: "sona", weight: 5, label: "SONA" },
  { category: "pukaama", weight: 5, label: "ぷかあま" },
  { category: "allstar", weight: 2, label: "ミリプロオールスター" }
]);

export const ordinaryRankWeights = Object.freeze([
  { rank: "大吉", weight: 20 },
  { rank: "吉", weight: 25 },
  { rank: "中吉", weight: 25 },
  { rank: "小吉", weight: 20 },
  { rank: "凶", weight: 10 }
]);

const specialWeightTotal = specialCategoryWeights.reduce((total, item) => total + item.weight, 0);
const rankWeightTotal = ordinaryRankWeights.reduce((total, item) => total + item.weight, 0);

if (specialWeightTotal > 100) {
  throw new Error("特別運勢の合計確率が100%を超えています。");
}

if (rankWeightTotal !== 100) {
  throw new Error("通常運勢の割合は合計100%にしてください。");
}

function getRandomValue(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("抽選関数は0以上1未満の数値を返してください。");
  }
  return value;
}

function weightedChoice(items, random) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const point = getRandomValue(random) * total;
  let cumulative = 0;

  for (const item of items) {
    cumulative += item.weight;
    if (point < cumulative) return item;
  }

  throw new Error("抽選対象を決定できませんでした。");
}

function chooseEntry(entries, random) {
  if (entries.length === 0) {
    throw new Error("選択された運勢カテゴリに結果データがありません。");
  }
  return entries[Math.floor(getRandomValue(random) * entries.length)];
}

function choosePoolItem(items, random, label) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${label}の候補文がありません。`);
  }
  return items[Math.floor(getRandomValue(random) * items.length)];
}

export function composeStandardFortune(rank, type, random = Math.random) {
  const typeLabel = fortuneTypes[type];
  if (!typeLabel) throw new RangeError("未対応のおみくじ形式です。");

  const pool = standardItemPools[rank];
  if (!pool) throw new RangeError("項目プールがまだ用意されていない運勢です。");

  const composedFields = Object.fromEntries(
    Object.entries(pool.fields).map(([label, items]) => [
      label,
      choosePoolItem(items, random, label)
    ])
  );

  return {
    id: `standard-pool-${rank}`,
    category: "standard",
    categoryLabel: "通常運勢",
    rank,
    message: choosePoolItem(pool.messages, random, "総合メッセージ"),
    fields: composedFields,
    jewel: {
      title: "今日の宝石",
      value: choosePoolItem(pool.jewel, random, "宝石みくじ")
    },
    love: {
      title: "恋のひとこと",
      value: choosePoolItem(pool.love, random, "恋みくじ")
    },
    type,
    typeLabel
  };
}

export function drawFortune(type, random = Math.random, entries = sampleFortunes) {
  const typeLabel = fortuneTypes[type];
  if (!typeLabel) throw new RangeError("未対応のおみくじ形式です。");

  const categoryWeights = [
    ...specialCategoryWeights,
    { category: "standard", weight: 100 - specialWeightTotal, label: "通常運勢" }
  ];
  const chosenCategory = weightedChoice(categoryWeights, random);

  let chosenEntry;
  if (chosenCategory.category === "standard") {
    const chosenRank = weightedChoice(ordinaryRankWeights, random);
    chosenEntry = standardItemPools[chosenRank.rank]
      ? composeStandardFortune(chosenRank.rank, type, random)
      : chooseEntry(
        entries.filter((entry) => entry.category === "standard" && entry.rank === chosenRank.rank),
        random
      );
  } else {
    chosenEntry = chooseEntry(
      entries.filter((entry) => entry.category === chosenCategory.category),
      random
    );
  }

  return {
    ...chosenEntry,
    type,
    typeLabel,
    categoryLabel: chosenEntry.categoryLabel ?? chosenCategory.label
  };
}

export function getJapanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatJapanDate(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}
