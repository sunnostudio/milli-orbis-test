const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE_URL = "https://milli-orbis-portal.pages.dev";
const dataPath = path.join(ROOT, "data", "press-releases.js");
const outDir = path.join(ROOT, "news", "press");

if (!fs.existsSync(dataPath)) {
  console.error("data/press-releases.js が見つかりません。");
  process.exit(1);
}

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(dataPath, "utf8"), ctx);
const releases = ctx.window.PRESS_RELEASES;

if (!Array.isArray(releases)) {
  console.error("data/press-releases.js の window.PRESS_RELEASES は配列で定義してください。");
  process.exit(1);
}

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

function absUrl(url) {
  if (!url) return SITE_URL + "/images/Milli-Orbis-OGP.png";
  if (/^https?:\/\//i.test(url)) return url;
  return SITE_URL + (url.charAt(0) === "/" ? url : "/" + url.replace(/^\.?\//, ""));
}

function imageSrc(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url.charAt(0) === "/" ? url : "/" + url.replace(/^\.?\//, "");
}

function formatDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!m) return date || "";
  return m[1] + "年" + parseInt(m[2], 10) + "月" + parseInt(m[3], 10) + "日";
}

function render(release) {
  const published = release.published === true;
  const title = String(release.title || "").trim();
  const slug = String(release.slug || "").trim();
  const date = String(release.date || "").trim();
  const lead = String(release.lead || "").trim();
  const body = String(release.body || "").trim();
  const category = String(release.category || "").trim();
  const image = String(release.image || "").trim();
  const imageAlt = String(release.imageAlt || "").trim();
  const imageCaption = String(release.imageCaption || "").trim();
  const updated = String(release.updated || "").trim();
  const description = lead || title;
  const canonical = SITE_URL + "/news/press/" + slug + "/";
  const ogImage = absUrl(release.ogImage || image);
  const isMilipro50 = slug === "milipro-50";
  const robots = published
    ? '<meta name="robots" content="index,follow">'
    : '<meta name="robots" content="noindex,nofollow,noarchive">';

  const figure = image
    ? '<figure class="press-figure"><img src="' + esc(imageSrc(image)) + '" alt="' + esc(imageAlt || title) + '" loading="lazy" decoding="async">' +
      (imageCaption ? '<figcaption>' + esc(imageCaption) + "</figcaption>" : "") +
      "</figure>"
    : "";

  const isOrbista = /orbista/i.test(title) || /orbista/i.test(category || "") || /orbista/i.test(slug || "");

  const orbistaLogo = isOrbista ? `
    <div class="press-orbista-mark" aria-label="ORBISTA logo">
      <img src="../../../ORBISTA-rogo.png" alt="ORBISTA logo" width="620" height="210" loading="eager" decoding="async">
    </div>
  ` : "";

  const relatedLinks = isMilipro50 ? "" : `
    <div class="press-related">
      <h3>関連サイト</h3>
      <ul>
        <li><a href="https://milli-orbis-portal.pages.dev/" target="_blank" rel="noopener">Milli Orbis</a></li>
        <li><a href="https://milli-unishare.pages.dev/" target="_blank" rel="noopener">Milli Unishare</a></li>
        <li><a href="https://milli-games.onrender.com/index.html" target="_blank" rel="noopener">Milli Games</a></li>
        <li><a href="https://milli-kit.pages.dev/" target="_blank" rel="noopener">Milli Kit</a></li>
        <li><a href="https://milli-orbis-portal.pages.dev/contact.html" target="_blank" rel="noopener">お問い合わせ</a></li>
      </ul>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Milli Orbis</title>
<meta name="description" content="${esc(description)}">
${robots}
<meta property="og:type" content="article">
<meta property="og:site_name" content="Milli Orbis">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="../../../images/icon/Milli%20Orbis.ico" sizes="any">
<link rel="apple-touch-icon" sizes="192x192" href="../../../images/icon/Milli%20Orbis-192.png">
<link rel="manifest" href="../../../manifest.webmanifest">
<meta name="theme-color" content="#75b1c0">
<script>try{if(localStorage.getItem("milli-theme")==="dark"||(!localStorage.getItem("milli-theme")&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark";}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../../style.css">
<link rel="stylesheet" href="../press.css">
</head>
<body class="press-page${isOrbista ? " orbista-press" : ""}${isMilipro50 ? " milipro-50-press" : ""}" data-oshi="">
<header id="siteHeader">
  <div class="header-inner">
    <a class="logo" href="../../../index.html"><img src="../../../images/rogo/Milli%20Orbis-rogo.png" alt="Milli Orbis" width="1774" height="430" decoding="async"></a>
    <nav class="nav">
      <a href="../../../index.html#home">Home</a>
      <div class="nav-drop" id="memberDrop">
        <button type="button" class="nav-drop-btn">Member Guide<span class="caret"></span></button>
        <div class="nav-drop-menu">
          <a class="drop-top" href="../../../index.html#members" data-i18n="nav.memberAll">Member Guide 一覧へ</a>
          <div class="drop-sep"></div>
          <a href="../../../konomi.html" data-i18n-name="konomi">甘狼このみ</a>
          <a href="../../../nono.html" data-i18n-name="nono">音ノ乃のの</a>
          <a href="../../../akubi.html" data-i18n-name="akubi">あくび・でもんすぺーど</a>
          <a href="../../../koma.html" data-i18n-name="koma">小廻こま</a>
          <a href="../../../raco.html" data-i18n-name="raco">音ノ瀬らこ</a>
          <a href="../../../yura.html" data-i18n-name="yura">ゆらぎゆら</a>
          <a href="../../../nuhu.html" data-i18n-name="nuhu">虹深°ぬふ</a>
          <a href="../../../tsukuri.html" data-i18n-name="tsukuri">眠雲ツクリ</a>
          <a href="../../../liz.html" data-i18n-name="liz">雨夜リズ</a>
          <a href="../../../rei.html" data-i18n-name="rei">夕霧レイ</a>
          <a href="../../../mahoro.html" data-i18n-name="mahoro">鹿乃まほろ</a>
          <a href="../../../aoi.html" data-i18n-name="aoi">海琳あおい</a>
          <a href="../../../milchan.html" data-i18n-name="milchan">ミリちゃん</a>
          <div class="drop-sep"></div>
          <a href="../../../members.html" data-i18n="nav.compare">メンバー比較表</a>
          <a href="../../../account.html" data-i18n="nav.account">マイページ</a>
        </div>
      </div>
      <a href="../../../news/" data-i18n="nav.news">お知らせ</a>
      <a href="../../../goods/current.html">MilliDex</a>
      <a href="../../../index.html#groups" data-i18n="nav.groups">グループ・期生</a>
      <a href="../../../songs.html" data-i18n="nav.songs">曲データベース</a>
      <a href="../../../index.html#calendar">Event Calendar</a>
      <a href="../../../index.html#links">Official Links</a>
      <a href="../../../cursors.html">カーソル配布</a>
    </nav>
    <div class="header-actions">
      <a id="liveBadge" class="live-badge" href="#" target="_blank" rel="noopener">● LIVE</a>
      <button type="button" class="profile-btn" id="profile-btn" onclick="mpOpenAccount()" aria-label="Milli Orbisアカウント" data-i18n-aria="header.profile">
        <span class="profile-icon" id="profile-header-icon">?</span>
      </button>
      <div class="oshi-cursor-wrap" id="oshiCursorWrap">
        <button id="oshiCursorBtn" class="oshi-cursor-btn" aria-label="カーソルと推しを選択" aria-expanded="false" aria-haspopup="true">
          <span id="oshiCursorPreview" class="oshi-cursor-preview" style="width:18px;height:18px;border-radius:50%;background:#7a4fc4;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);display:inline-block;flex-shrink:0"></span>
          <span id="oshiDot" class="oshi-dot" style="width:18px;height:18px;border-radius:50%;background:var(--accent);border:2px solid #fff;outline:1px solid var(--accent);display:inline-block;flex-shrink:0;background-size:cover;background-position:center;"></span>
          <span class="oshi-cursor-label">表示</span>
        </button>
        <div id="oshiCursorDropdown" class="oshi-cursor-dropdown" role="menu" aria-hidden="true"></div>
      </div>
      <select id="oshiSelect" class="oshi-select" aria-label="推しメンバーを選択" data-i18n-aria="header.oshi" style="display:none"></select>
      <button id="hamburger" class="hamburger" aria-label="メニュー" data-i18n-aria="header.menu" aria-expanded="false" aria-controls="mobileNav">
        <svg viewBox="0 0 28 20" width="30" height="22" aria-hidden="true"><path d="M2 3h24M2 10h24M2 17h24" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>
      </button>
    </div>
  </div>
  <div id="drawerBackdrop" class="drawer-backdrop" aria-hidden="true"></div>
  <nav id="mobileNav" class="mobile-nav" aria-hidden="true">
    <div class="drawer-section-label">設定</div>
    <div class="drawer-settings">
      <button type="button" class="notif-bell" id="mobileNotifBell" aria-label="通知設定" data-i18n-aria="header.notif">🔔</button>
      <button type="button" class="theme-toggle" id="mobileThemeToggle" aria-label="ダークモード切替" data-i18n-aria="header.theme">🌙</button>
      <button type="button" class="lang-toggle" id="mobileLangToggle" aria-label="言語切替" data-i18n-aria="header.lang">EN</button>
      <span style="font-size:0.78rem;color:var(--muted);font-weight:700;">通知 / テーマ / 言語</span>
    </div>
    <div class="drawer-section-label">セクション</div>
    <a href="../../../index.html#home">Home</a>
    <a href="../../" data-i18n="nav.news">お知らせ</a>
    <a href="../../../index.html#groups" data-i18n="nav.groups">グループ・期生</a>
    <a href="../../../index.html#members">Member Guide</a>
    <a href="../../../index.html#calendar">Event Calendar</a>
    <a href="../../../index.html#links">Official Links</a>
    <div class="drawer-section-label">Member Guide</div>
    <a class="mobile-sub" href="../../../konomi.html" data-i18n-name="konomi">甘狼このみ</a>
    <a class="mobile-sub" href="../../../nono.html" data-i18n-name="nono">音ノ乃のの</a>
    <a class="mobile-sub" href="../../../akubi.html" data-i18n-name="akubi">あくび・でもんすぺーど</a>
    <a class="mobile-sub" href="../../../koma.html" data-i18n-name="koma">小廻こま</a>
    <a class="mobile-sub" href="../../../raco.html" data-i18n-name="raco">音ノ瀬らこ</a>
    <a class="mobile-sub" href="../../../yura.html" data-i18n-name="yura">ゆらぎゆら</a>
    <a class="mobile-sub" href="../../../nuhu.html" data-i18n-name="nuhu">虹深°ぬふ</a>
    <a class="mobile-sub" href="../../../tsukuri.html" data-i18n-name="tsukuri">眠雲ツクリ</a>
    <a class="mobile-sub" href="../../../liz.html" data-i18n-name="liz">雨夜リズ</a>
    <a class="mobile-sub" href="../../../rei.html" data-i18n-name="rei">夕霧レイ</a>
    <a class="mobile-sub" href="../../../mahoro.html" data-i18n-name="mahoro">鹿乃まほろ</a>
    <a class="mobile-sub" href="../../../aoi.html" data-i18n-name="aoi">海琳あおい</a>
    <a class="mobile-sub" href="../../../milchan.html" data-i18n-name="milchan">ミリちゃん</a>
    <a href="../../../members.html" data-i18n="nav.compare">メンバー比較表</a>
    <div class="drawer-section-label">MilliDex</div>
    <a href="../../../goods/current.html">現在販売中</a>
    <a href="../../../goods/shops.html" class="mobile-sub">販売箇所検索</a>
    <a href="../../../goods/map.html" class="mobile-sub">有志マップ</a>
    <a href="../../../goods/archive.html" class="mobile-sub">過去アーカイブ</a>
    <a href="../../../goods/mine.html" class="mobile-sub">マイグッズ</a>
    <div class="drawer-section-label">コンテンツ</div>
    <a href="../../../quiz.html" data-i18n="nav.quiz">ミリプロ検定</a>
    <a href="../../../songs.html" data-i18n="nav.songs">曲データベース</a>
    <a href="../../../cursors.html">カーソル配布</a>
    <a href="../../../account.html" data-i18n="nav.account">マイページ</a>
    <div class="drawer-section-label" data-i18n="footer.about">サイトについて</div>
    <div class="drawer-legal"><a href="../../../legal.html" data-i18n="footer.terms">利用規約</a><span class="sep">・</span><a href="../../../privacy.html" data-i18n="footer.privacy">プライバシーポリシー</a><span class="sep">・</span><a href="../../../rights.html" data-i18n="footer.rights">権利表記</a><br><a href="https://x.com/milliorbis_info" target="_blank" rel="noopener">𝕏 @milliorbis_info</a></div>
  </nav>
</header>

<main class="press-main">
  <article class="press-release" aria-labelledby="pressTitle">
    ${orbistaLogo.trim()}
    <p class="press-label">PRESS RELEASE</p>
    <h1 id="pressTitle">${esc(title)}</h1>
    <div class="press-meta">
      <time datetime="${esc(date)}">${esc(formatDate(date))}</time>
      ${category ? '<span class="press-category">' + esc(category) + "</span>" : ""}
      ${updated ? "<span>更新: " + esc(formatDate(updated)) + "</span>" : ""}
    </div>
    ${lead ? '<p class="press-lead">' + esc(lead) + "</p>" : ""}
    ${figure.trim()}
    <div class="press-body">${body}</div>
    ${relatedLinks.trim()}
    <div class="press-actions">
      ${isOrbista ? '<a class="btn" href="../../../orbista/">ORBISTA特設サイトへ →</a>' : ""}
      <a class="btn btn-ghost" href="../../">お知らせ一覧へ ←</a>
    </div>
  </article>
</main>

<footer class="press-footer">
  <p>本サイトはファンが運営する非公式のポータルサイトです。ミリプロ公式様とは一切関係ありません。</p>
  <p><a href="../../../legal.html">利用規約</a>・<a href="../../../privacy.html">プライバシーポリシー</a>・<a href="../../../rights.html">権利表記</a></p>
  <p>© 2026 Milli Orbis（非公式ファンサイト）</p>
</footer>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
<script src="../../../firebase-config.js"></script>
<script src="../../../firebase-init.js"></script>
<script src="../../../data.js"></script>
<script src="../../../data/i18n.js"></script>
<script src="../../../scripts/i18n.js"></script>
<script src="../../../scripts/fav-store.js"></script>
<script src="../../../scripts/cursor.js"></script>
<script src="../../../scripts/contact.js?v=20260909"></script>
<script src="../../../script.js"></script>
</body>
</html>
`.replace(/^[ \t]+$/gm, "");
}

const seen = new Set();
let generated = 0;

for (const release of releases) {
  if (!release || typeof release !== "object") {
    console.error("不正なリリースデータをスキップしました。");
    continue;
  }
  const slug = String(release.slug || "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    console.error("slug は英小文字・数字・ハイフンで指定してください: " + slug);
    process.exitCode = 1;
    continue;
  }
  if (seen.has(slug)) {
    console.error("slug が重複しています: " + slug);
    process.exitCode = 1;
    continue;
  }
  seen.add(slug);
  if (!release.title || !release.date || !release.body) {
    console.error("title / date / body は必須です: " + slug);
    process.exitCode = 1;
    continue;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(release.date))) {
    console.error("date は YYYY-MM-DD 形式で指定してください: " + slug);
    process.exitCode = 1;
    continue;
  }

  const dir = path.join(outDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), render(release), "utf8");
  generated++;
  console.log("generated: news/press/" + slug + "/ (" + (release.published === true ? "published" : "noindex") + ")");
}

if (generated === 0) {
  console.log("press release は 0 件です。data/press-releases.js に追加してください。");
}
