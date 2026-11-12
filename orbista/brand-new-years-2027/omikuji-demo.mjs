import {
  composeStandardFortune,
  drawFortune,
  fortuneTypes,
  formatJapanDate,
  getJapanDateKey
} from "./omikuji-core.mjs";

const STORAGE_KEY = "orbista.brand-new-years-2027.omikuji-demo.v2";
const drawButton = document.querySelector("#drawButton");
const previewButton = document.querySelector("#previewDaikichi");
const resetButton = document.querySelector("#resetDemo");
const status = document.querySelector("#drawStatus");
const result = document.querySelector("#fortuneResult");
const placeholder = document.querySelector("#resultPlaceholder");
const typeInputs = [...document.querySelectorAll('input[name="fortune-type"]')];

let history = {};
let storageReady = true;

function setStatus(message) {
  status.textContent = message;
}

function readHistory() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("保存された試作履歴の形式が正しくありません。");
  }
  return parsed;
}

function selectedType() {
  return typeInputs.find((input) => input.checked)?.value;
}

function getTodayRecord(type) {
  const record = history[type];
  return record?.date === getJapanDateKey() ? record : null;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderFortune(fortune, isPreview = false) {
  const paper = createElement("div", "fortune-paper");
  paper.append(createElement("p", "result-type", fortune.typeLabel));

  if (isPreview) {
    paper.append(createElement("p", "result-preview-label", "大吉プールのプレビュー"));
  }

  if (fortune.category !== "standard") {
    paper.append(createElement("p", "result-special", `${fortune.categoryLabel}運勢・サンプル`));
  }

  paper.append(createElement("h3", "result-rank", fortune.rank));
  paper.append(createElement("p", "result-main-message", fortune.message));
  paper.append(createElement("p", "result-date", `${formatJapanDate()} のおみくじ`));

  if (fortune.type === "jewel") {
    const callout = createElement("div", "theme-callout");
    callout.append(createElement("strong", "", fortune.jewel.title));
    callout.append(createElement("p", "", fortune.jewel.value));
    paper.append(callout);
  } else if (fortune.type === "love") {
    const callout = createElement("div", "theme-callout");
    callout.append(createElement("strong", "", fortune.love.title));
    callout.append(createElement("p", "", fortune.love.value));
    paper.append(callout);
  }

  const list = createElement("dl", "fortune-fields");
  for (const [label, value] of Object.entries(fortune.fields)) {
    const row = document.createElement("div");
    row.append(createElement("dt", "", label));
    row.append(createElement("dd", "", value));
    list.append(row);
  }
  paper.append(list);

  result.replaceChildren(paper);
  result.hidden = false;
  placeholder.hidden = true;
}

function showSavedResult(record) {
  const fortune = record.result;
  if (!fortune || !fortuneTypes[record.type] || fortune.type !== record.type) {
    throw new Error("保存されたおみくじ形式が正しくありません。履歴をリセットしてください。");
  }
  renderFortune(fortune);
}

function clearResult() {
  result.replaceChildren();
  result.hidden = true;
  placeholder.hidden = false;
}

function updateSelectedType() {
  const type = selectedType();
  if (!type) return;

  const record = getTodayRecord(type);
  drawButton.disabled = !storageReady || Boolean(record);
  drawButton.innerHTML = record ? "本日の結果は引いてあります" : "おみくじを引く <span aria-hidden=\"true\">✦</span>";

  if (record) {
    try {
      showSavedResult(record);
      setStatus("本日の結果を表示しています。別の種類も各1回ずつ引けます。");
    } catch (error) {
      console.error(error);
      clearResult();
      setStatus(error.message);
    }
  } else {
    clearResult();
    setStatus(storageReady ? "この種類のおみくじは、今日はまだ引いていません。" : "保存機能を利用できないため、抽選を停止しています。");
  }
}

function handleStorageError(error, action) {
  console.error(error);
  storageReady = false;
  drawButton.disabled = true;
  setStatus(`試作履歴を${action}できませんでした。ブラウザーの保存設定を確認してください。`);
}

for (const input of typeInputs) {
  input.addEventListener("change", updateSelectedType);
}

previewButton.addEventListener("click", () => {
  const type = selectedType();
  if (!type) return;

  try {
    const fortune = composeStandardFortune("大吉", type);
    renderFortune(fortune, true);
    setStatus("大吉プールのプレビューです。抽選回数には含まず、保存もしていません。");
  } catch (error) {
    console.error(error);
    setStatus("大吉の組み合わせを作れませんでした。項目プールを確認してください。");
  }
});

drawButton.addEventListener("click", () => {
  if (!storageReady) return;
  const type = selectedType();
  if (!type) return;

  const existing = getTodayRecord(type);
  if (existing) {
    updateSelectedType();
    return;
  }

  let fortune;
  try {
    fortune = drawFortune(type);
  } catch (error) {
    console.error(error);
    setStatus("おみくじを抽選できませんでした。試作データを確認してください。");
    return;
  }

  const record = {
    date: getJapanDateKey(),
    result: fortune,
    type
  };
  const nextHistory = { ...history, [type]: record };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
  } catch (error) {
    handleStorageError(error, "保存");
    return;
  }

  history = nextHistory;
  renderFortune(fortune);
  drawButton.disabled = true;
  drawButton.textContent = "本日の結果は引いてあります";
  setStatus("結果をこのブラウザーに保存しました。");
});

resetButton.addEventListener("click", () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    history = {};
    storageReady = true;
    setStatus("この試作のおみくじ履歴をリセットしました。");
    updateSelectedType();
  } catch (error) {
    handleStorageError(error, "リセット");
  }
});

try {
  history = readHistory();
} catch (error) {
  console.error(error);
  storageReady = false;
  setStatus("試作履歴を読み込めませんでした。リセットボタンで履歴を消去してください。");
}

updateSelectedType();
