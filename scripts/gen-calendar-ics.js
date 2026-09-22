/* ============================================
   gen-calendar-ics.js — calendar.ics を生成する
   データ源: data.js（EVENTS / COUNTDOWN / MEMBERS）＋ data/youtube.json（配信予定）
   使い方: node scripts/gen-calendar-ics.js
   ============================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), ctx);

const MEMBERS = ctx.MEMBERS || [];
const EVENTS = ctx.EVENTS || [];
const COUNTDOWN = ctx.COUNTDOWN || [];

let streams = [];
try {
  const raw = JSON.parse(fs.readFileSync(path.join(root, "data", "youtube.json"), "utf8"));
  streams = (raw && raw.streams) || [];
} catch (e) { /* データが無い場合は配信なしで生成 */ }

function escText(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function icsDate(d) {
  return d.getUTCFullYear() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0");
}

function icsDateTime(d) {
  return icsDate(d) + "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    "00Z";
}

// JST（+9）のローカル表記 "YYYY-MM-DDTHH:MM:SS" を UTC に変換
function jstToUtc(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]));
}

const lines = [];
lines.push("BEGIN:VCALENDAR");
lines.push("VERSION:2.0");
lines.push("PRODID:-//Milli Orbis//JP//JA");
lines.push("CALSCALE:GREGORIAN");
lines.push("METHOD:PUBLISH");
lines.push("X-WR-CALNAME:Milli Orbis イベントカレンダー");
lines.push("X-WR-TIMEZONE:Asia/Tokyo");

const nowStamp = icsDateTime(new Date());

function addEvent(uid, dtstart, dtend, summary, desc, url, rrule) {
  lines.push("BEGIN:VEVENT");
  lines.push("UID:milli-orbis-" + uid + "@milli-orbis-portal.onrender.com");
  lines.push("DTSTAMP:" + nowStamp);
  lines.push("DTSTART" + dtstart);
  if (dtend) lines.push("DTEND" + dtend);
  lines.push("SUMMARY:" + escText(summary));
  if (desc) lines.push("DESCRIPTION:" + escText(desc));
  if (url) lines.push("URL:" + url);
  if (rrule) lines.push("RRULE:" + rrule);
  lines.push("END:VEVENT");
}

// ---- イベント（終日） ----
EVENTS.forEach(function (e) {
  if (e.date) {
    const d = new Date(e.date + "T00:00:00Z");
    if (isNaN(d.getTime())) return;
    const next = new Date(d.getTime() + 86400000);
    addEvent(
      hash("ev:" + e.date + ":" + e.title),
      ";VALUE=DATE:" + icsDate(d),
      ";VALUE=DATE:" + icsDate(next),
      e.title,
      e.desc,
      e.url && e.url.indexOf(".html") === -1 ? e.url : "",
      null
    );
    return;
  }
  // 誕生日・デビュー記念日（毎年繰り返し）
  const m = MEMBERS.find(function (x) { return x.id === e.member; });
  if (!m) return;
  let md = null;
  if (e.type === "birthday" && m.birthday) md = m.birthday;
  else if (e.type === "anniversary" && m.debut) md = m.debut.slice(5);
  if (!md) return;
  const pm = /^(\d{2})-(\d{2})$/.exec(md);
  if (!pm) return;
  const year = new Date().getUTCFullYear();
  const d = new Date(Date.UTC(year, +pm[1] - 1, +pm[2]));
  const next = new Date(d.getTime() + 86400000);
  addEvent(
    hash("mem:" + e.member + ":" + e.type + ":" + md),
    ";VALUE=DATE:" + icsDate(d),
    ";VALUE=DATE:" + icsDate(next),
    e.title,
    e.desc,
    (e.url && e.url.indexOf(".html") === -1) ? e.url : "",
    "FREQ=YEARLY"
  );
});

// ---- カウントダウン（00:00 は終日、それ以外は時刻付き） ----
COUNTDOWN.forEach(function (c) {
  if (!c.date) return;
  const isAllDay = /T00:00:00/.test(c.date);
  if (isAllDay) {
    const d = new Date(c.date.slice(0, 10) + "T00:00:00Z");
    if (isNaN(d.getTime())) return;
    const next = new Date(d.getTime() + 86400000);
    addEvent(
      hash("cd:" + c.id),
      ";VALUE=DATE:" + icsDate(d),
      ";VALUE=DATE:" + icsDate(next),
      c.label,
      c.note,
      (c.url && c.url.indexOf(".html") === -1) ? c.url : "",
      null
    );
  } else {
    const d = jstToUtc(c.date);
    if (!d || isNaN(d.getTime())) return;
    const end = new Date(d.getTime() + 2 * 3600000);
    addEvent(
      hash("cd:" + c.id),
      ":" + icsDateTime(d),
      ":" + icsDateTime(end),
      c.label,
      c.note,
      (c.url && c.url.indexOf(".html") === -1) ? c.url : "",
      null
    );
  }
});

// ---- 配信予定（youtube.json、時刻付き 2 時間枠） ----
streams.forEach(function (s) {
  const start = new Date(s.scheduledStartTime || s.scheduledStart);
  if (isNaN(start.getTime())) return;
  const end = new Date(start.getTime() + 2 * 3600000);
  const member = MEMBERS.find(function (x) { return x.id === s.memberId; });
  addEvent(
    hash("st:" + s.id),
    ":" + icsDateTime(start),
    ":" + icsDateTime(end),
    s.title,
    member ? "配信者: " + member.name : "",
    "https://milli-unishare.pages.dev/#watch=" + s.id,
    null
  );
});

lines.push("END:VCALENDAR");

fs.writeFileSync(path.join(root, "calendar.ics"), lines.join("\r\n") + "\r\n", "utf8");
console.log("generated: calendar.ics (" + (EVENTS.length + COUNTDOWN.length + streams.length) + " events)");