#!/usr/bin/env node
/* ============================================================
   Inject / remove the seasonal campaign layer.
   ------------------------------------------------------------
   Usage:
     node scripts/inject-campaign.js
     node scripts/inject-campaign.js --remove
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REMOVE = process.argv.includes("--remove");

const EXCLUDE = [
  "orbista/",
  "news/press/",
  "halloween/",
  "dist/",
];

const HEAD_START = "<!-- MILLI_CAMPAIGN_HEAD_START -->";
const HEAD_END = "<!-- MILLI_CAMPAIGN_HEAD_END -->";
const BAR_START = "<!-- MILLI_CAMPAIGN_BAR_START -->";
const BAR_END = "<!-- MILLI_CAMPAIGN_BAR_END -->";

const HEAD_BLOCK = `${HEAD_START}
<script src="/data/campaigns.js"></script>
<script src="/scripts/campaign-boot.js"></script>
<script src="/scripts/campaign.js" defer></script>
<link rel="stylesheet" href="/campaigns.css">
${HEAD_END}`;

const BAR_BLOCK = `${BAR_START}
<a class="campaign-bar" id="campaignBar" href="/orbista/" aria-label="ORBISTA 特設サイトへ">
  <span class="campaign-bar-star" aria-hidden="true">✦</span>
  <span class="campaign-bar-label">ORBISTA</span>
  <span class="campaign-bar-text" id="campaignBarText">季節のイベントシリーズ「ORBISTA」</span>
  <span class="campaign-bar-cta">特設サイトへ <span aria-hidden="true">→</span></span>
</a>
${BAR_END}`;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (EXCLUDE.some((prefix) => (rel + "/").startsWith(prefix))) continue;
      walk(full, out);
    } else if (entry.name.endsWith(".html")) {
      out.push({ full, rel });
    }
  }
  return out;
}

const files = walk(ROOT);
let changed = 0;

for (const { full, rel } of files) {
  let html = fs.readFileSync(full, "utf8");
  if (!html.includes('id="siteHeader"')) continue;

  const before = html;
  html = html.replace(new RegExp(`\\n?${HEAD_START}[\\s\\S]*?${HEAD_END}\\n?`, "g"), "\n");
  html = html.replace(new RegExp(`\\n?${BAR_START}[\\s\\S]*?${BAR_END}\\n?`, "g"), "\n");

  if (!REMOVE) {
    if (!html.includes(HEAD_START)) {
      const headEnd = html.lastIndexOf("</head>");
      if (headEnd === -1) continue;
      html = html.slice(0, headEnd) + HEAD_BLOCK + "\n" + html.slice(headEnd);
    }

    if (!html.includes(BAR_START)) {
      const headerStart = html.indexOf('<header id="siteHeader"');
      const headerEnd = html.indexOf("</header>", headerStart);
      if (headerStart === -1 || headerEnd === -1) continue;
      const at = headerEnd + "</header>".length;
      html = html.slice(0, at) + "\n" + BAR_BLOCK + html.slice(at);
    }
  }

  if (html !== before) {
    fs.writeFileSync(full, html, "utf8");
    changed += 1;
    console.log((REMOVE ? "cleaned: " : "updated: ") + rel);
  }
}

console.log(`\n${changed} file(s) ${REMOVE ? "cleaned" : "updated"}.`);
