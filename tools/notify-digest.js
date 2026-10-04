#!/usr/bin/env node
/**
 * 当日ダイジェスト (毎朝08:00 JST想定)
 *  - グッズch: 受注締切が「今日」の商品 (permanent/soldout除外)
 *  - イベントch: 今日の EVENTS発生日 / COUNTDOWN / collabs期間中(開始・終了が今日)
 *
 * 使い方:
 *   DISCORD_WEBHOOK_GOODS=... DISCORD_WEBHOOK_EVENTS=... node tools/notify-digest.js [--dry-run] [--force] [--date YYYY-MM-DD]
 *   --date を付けるとその日として判定 (テスト用)。未指定はJST今日。
 *   同一日は二重投稿しない (data/notify-state.json digests)。--forceで再送可。
 */
const fs = require("fs");
const path = require("path");
const {
  DISCLAIMER,
  OGP_URL,
  loadState,
  saveState,
  sendEmbeds,
  jstToday,
  jstDateOf,
  portraitUrl,
  countdownMemberId,
  hasArgs,
  argValue,
} = require("./discord");
const { groupGoods, groupToEmbeds } = require("./goods-group");

const ROOT = path.join(__dirname, "..");

function extractConst(js, name) {
  const m = js.match(new RegExp(`const ${name} = \\[[\\s\\S]*?\\];`));
  if (!m) return [];
  return new Function(m[0] + `;return ${name};`)();
}

function loadAll() {
  const js = fs.readFileSync(path.join(ROOT, "data.js"), "utf-8");
  let official = [];
  try {
    official = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "goods-fetched.json"), "utf-8"));
  } catch (e) {
    official = extractConst(js, "GOODS");
  }
  let collab = [];
  try {
    const cjs = fs.readFileSync(path.join(ROOT, "data", "goods-collab.js"), "utf-8");
    const m = cjs.match(/const GOODS_COLLAB = \[[\s\S]*?\];/s);
    collab = new Function((m ? m[0] : cjs) + ";return GOODS_COLLAB;")();
  } catch (e) {
    console.error("collab load failed:", e.message);
  }
  let collabs = [];
  try {
    collabs = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "collabs.json"), "utf-8"));
  } catch (e) {}
  return {
    goods: official.concat(collab),
    events: extractConst(js, "EVENTS"),
    countdown: extractConst(js, "COUNTDOWN"),
    news: extractConst(js, "NEWS"),
    members: extractConst(js, "MEMBERS"),
    collabs,
  };
}

function memberMap(members) {
  const map = {};
  for (const m of members) map[m.id] = m;
  return map;
}

/** EVENTSのうち今日発生するものを解決 (birthday/anniversaryはMEMBERSから) */
function eventsToday(events, members, today) {
  const mmdd = today.slice(5); // MM-DD
  const byId = memberMap(members);
  const out = [];
  for (const e of events) {
    if (e.date) {
      if (String(e.date).slice(0, 10) === today) out.push({ e, label: e.date });
      continue;
    }
    if (e.member && byId[e.member]) {
      const m = byId[e.member];
      if (e.type === "birthday" && m.birthday === mmdd) {
        out.push({ e, label: `誕生日 (${mmdd})` });
      } else if (e.type === "anniversary" && (m.debut || "").slice(5) === mmdd) {
        out.push({ e, label: `記念日 (${mmdd})` });
      }
    }
  }
  return out;
}

async function main() {
  const dryRun = hasArgs("--dry-run");
  const force = hasArgs("--force");
  const today = argValue("--date", jstToday());
  console.log(`digest date (JST): ${today}`);

  const goodsWebhook = process.env.DISCORD_WEBHOOK_GOODS || "";
  const eventsWebhook = process.env.DISCORD_WEBHOOK_EVENTS || "";
  if (!dryRun && !goodsWebhook && !eventsWebhook) {
    console.error("ERROR: no webhook env set.");
    process.exit(1);
  }

  const state = loadState();
  if (!state.digests) state.digests = {};

  const { goods, events, countdown, members, collabs } = loadAll();

  // ---- グッズ: 本日締切 ----
  const goodsKey = `${today}-goods-deadline`;
  if (!state.digests[goodsKey] || force || dryRun) {
    const due = goods.filter((g) => {
      if (!g || g.permanent || g.status === "soldout") return false;
      const to = g.period && g.period.orderTo;
      return jstDateOf(to) === today;
    });
    console.log(`goods due today: ${due.length}`);
    if (due.length && (goodsWebhook || dryRun)) {
      const groups = groupGoods(due);
      console.log(`due groups: ${groups.length}`);
      const embeds = groups.flatMap((grp) => groupToEmbeds(grp, { titlePrefix: "⏰ 本日締切:" }));
      const url = goodsWebhook || "https://discord.com/api/webhooks/dry-run";
      await sendEmbeds(url, `⏰ **本日受注締切 ${groups.length}括り・${due.length}点 (${today})** お忘れなく！`, embeds, { dryRun });
      if (!dryRun) state.digests[goodsKey] = due.length;
    } else if (!due.length) {
      console.log("no goods due today, skip (no empty post).");
      if (!dryRun) state.digests[goodsKey] = 0;
    }
  } else {
    console.log(`goods digest ${today} already sent, skip.`);
  }

  // ---- イベント: 今日 ----
  const evKey = `${today}-events-today`;
  if (!state.digests[evKey] || force || dryRun) {
    const todays = eventsToday(events, members, today);
    const cds = countdown.filter((c) => String(c.date || "").slice(0, 10) === today);
    const collabToday = collabs.filter((c) => {
      // 開始日・終了日が今日 or 期間中なら含める (開始/終了の節目を強調)
      if (c.start === today || c.end === today) return true;
      if (c.start && c.end && c.start <= today && today <= c.end) return true;
      return false;
    });
    console.log(`events today: ${todays.length}, countdown: ${cds.length}, collabs: ${collabToday.length}`);
    const total = todays.length + cds.length + collabToday.length;
    if (total && (eventsWebhook || dryRun)) {
      const embeds = [];
      for (const { e, label } of todays.slice(0, 5)) {
        const typeJa = e.type === "birthday" ? "🎂 誕生日" : e.type === "anniversary" ? "🎉 記念日" : "📅 イベント";
        embeds.push({
          title: `${typeJa}: ${String(e.title || "").slice(0, 230)}`,
          description: [label, e.desc ? String(e.desc).slice(0, 200) : null, e.url ? `🔗 [詳細](${e.url})` : null].filter(Boolean).join("\n").slice(0, 4000),
          color: e.type === "birthday" ? 0xef6a8d : e.type === "anniversary" ? 0xf2a93b : 0x6a9ef0,
          url: e.url && /^https?:\/\//.test(e.url) ? e.url : undefined,
          footer: { text: DISCLAIMER.slice(0, 200) },
          image: { url: e.member ? portraitUrl(e.member) : OGP_URL },
        });
      }
      for (const c of cds.slice(0, 3)) {
        embeds.push({
          title: `⏳ 本日: ${String(c.label || c.id).slice(0, 240)}`,
          description: [c.note || null, c.url ? `🔗 [詳細](${c.url})` : null].filter(Boolean).join("\n").slice(0, 1000) || "本日です！",
          color: 0xf39c12,
          footer: { text: DISCLAIMER.slice(0, 200) },
          image: { url: countdownMemberId(c) ? portraitUrl(countdownMemberId(c)) : OGP_URL },
        });
      }
      for (const c of collabToday.slice(0, 5)) {
        const mark = c.end === today ? "🔚 最終日" : c.start === today ? "🆕 開始" : "🤝 開催中";
        embeds.push({
          title: `${mark}: ${String(c.title || "").slice(0, 235)}`,
          description: [`🏬 ${c.shop || ""}`, `🗓️ ${c.start || "?"} 〜 ${c.end || "?"}`, c.url ? `🔗 [詳細](${c.url})` : null].filter(Boolean).join("\n").slice(0, 1000),
          color: 0x9b59b6,
          url: /^https?:\/\//.test(c.url || "") ? c.url : undefined,
          footer: { text: DISCLAIMER.slice(0, 200) },
          image: { url: (c.image && /^https?:\/\//.test(c.image)) ? c.image : OGP_URL },
        });
      }
      const url = eventsWebhook || "https://discord.com/api/webhooks/dry-run";
      await sendEmbeds(url, `📅 **本日(${today})のイベント・コラボ ${total}件**`, embeds.slice(0, 10), { dryRun });
      if (!dryRun) state.digests[evKey] = total;
    } else if (!total) {
      console.log("no events today, skip (no empty post).");
      if (!dryRun) state.digests[evKey] = 0;
    }
  } else {
    console.log(`events digest ${today} already sent, skip.`);
  }

  if (!dryRun) {
    saveState(state);
    console.log("state updated.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
