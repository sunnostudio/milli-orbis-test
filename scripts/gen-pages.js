const fs = require("fs");
const path = require("path");

const dataSrc = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
eval(dataSrc.replace(/^const (\w+) =/gm, "globalThis.$1 ="));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function tabs(m) {
  return MEMBERS.map((x) =>
    '<a class="t-tab' + (x.id === m.id ? " active" : "") + '" href="' + x.id + '.html" data-i18n-name="' + x.id + '">' +
    (x.icon ? '<img src="' + x.icon + '" alt="" loading="lazy">' : "") +
    x.name + "</a>"
  ).join("");
}

function introOverlay(m) {
  return '<div id="introOverlay" class="intro-overlay" data-member="' + m.id + '" aria-hidden="true">' +
    '<button type="button" class="intro-skip" id="introSkip" data-i18n="t.skip">スキップ</button>' +
    '<span class="intro-ring r1"></span><span class="intro-ring r2"></span>' +
    '<span class="intro-ring r3"></span><span class="intro-ring r4"></span>' +
    '<span class="intro-ring r5"></span>' +
    (m.fx ? fxHtml(m.fx) : "") +
    '<div class="intro-stage">' +
    (m.logo ? '<img class="intro-logo" src="' + m.logo + '" alt="">' : "") +
    (m.img ? '<img class="intro-art" src="' + m.img + '" alt="' + m.name + '">' : "") +
    '<p class="intro-name" data-i18n-name="' + m.id + '">' + m.name + "</p>" +
    '<p class="intro-catch" id="introCatch"></p>' +
    (m.introVoice || m.voice ? '<button type="button" class="intro-voice-btn" id="introVoiceBtn" data-i18n="t.playVoice">🔁 挨拶を再生</button>' : "") +
    "</div>" +
    '<audio id="introAudio" src="' + (m.introVoice || m.voice || "") + '" preload="auto"></audio>' +
    '<button type="button" class="intro-start" id="introStartBtn" data-i18n="t.tapPlay">▶ タップで再生</button>' +
    "</div>";
}

/* タレント別 イントロFX演出（data.js の fx 種別 → オーバーレイ内の演出HTML） */
function fxHtml(kind) {
  var waveSvg = function (fill) {
    return '<svg class="fx-wave-svg" viewBox="0 0 1440 80" preserveAspectRatio="none"><path fill="' + fill +
      '" d="M0,42 Q120,6 240,42 T480,42 T720,42 T960,42 T1200,42 T1440,42 L1440,80 L0,80 Z"/></svg>';
  };
  var V = {
    choco:
      '<span class="fx-chip" style="left:10%;animation-delay:0s"></span>' +
      '<span class="fx-chip" style="left:30%;animation-delay:1.3s"></span>' +
      '<span class="fx-chip" style="left:52%;animation-delay:0.7s"></span>' +
      '<span class="fx-chip" style="left:72%;animation-delay:1.9s"></span>' +
      '<span class="fx-chip" style="left:88%;animation-delay:0.4s"></span>' +
      '<span class="fx-heart" style="left:16%;top:24%;animation-delay:0.3s"></span>' +
      '<span class="fx-heart" style="left:70%;top:16%;animation-delay:1.1s;animation-duration:5.5s"></span>' +
      '<span class="fx-heart" style="left:44%;top:64%;animation-delay:1.7s;animation-duration:6s"></span>' +
      '<span class="fx-spark" style="left:24%;top:40%;animation-delay:0.8s"></span>' +
      '<span class="fx-spark" style="left:85%;top:55%;animation-delay:1.5s"></span>' +
      '<span class="fx-ears"><i></i><i></i></span>' +
      '<span class="fx-paw" style="right:8%;bottom:9%;animation-delay:1.2s"><b></b></span>' +
      '<span class="fx-paw" style="right:22%;bottom:25%;animation-delay:1.7s;transform:scale(0.8) rotate(14deg)"><b></b></span>' +
      '<span class="fx-paw" style="right:37%;bottom:41%;animation-delay:2.2s;transform:scale(0.62) rotate(26deg)"><b></b></span>' +
      '<span class="fx-flash"></span>',
    note:
      '<span class="fx-note-i" style="left:12%;animation-delay:0s;font-size:34px">♩</span>' +
      '<span class="fx-note-i" style="left:32%;animation-delay:1.4s;font-size:26px">♪</span>' +
      '<span class="fx-note-i" style="left:56%;animation-delay:0.7s;font-size:40px">♫</span>' +
      '<span class="fx-note-i" style="left:78%;animation-delay:2.1s;font-size:30px">♬</span>' +
      '<span class="fx-note-i" style="left:92%;animation-delay:1s;font-size:24px">♪</span>' +
      '<span class="fx-note-gem" style="left:22%;top:18%;animation-delay:0.4s"></span>' +
      '<span class="fx-note-gem" style="left:76%;top:32%;animation-delay:1.6s;animation-duration:4s"></span>' +
      '<span class="fx-spot"></span>' +
      '<span class="fx-vinyl"></span>' +
      '<span class="fx-eq"><i style="animation-delay:0s"></i><i style="animation-delay:0.15s;animation-duration:1.05s"></i>' +
      '<i style="animation-delay:0.3s"></i><i style="animation-delay:0.45s;animation-duration:0.95s"></i>' +
      '<i style="animation-delay:0.6s"></i><i style="animation-delay:0.75s;animation-duration:1.1s"></i></span>' +
      '<span class="fx-flash"></span>' +
      '<span class="fx-fin">SHINE</span>',
    demon:
      '<span class="fx-bat" style="top:16%"></span>' +
      '<span class="fx-bat" style="top:36%;animation-delay:3.2s;animation-duration:11s;width:88px;opacity:0.7"></span>' +
      '<span class="fx-bat" style="top:62%;animation-delay:5.6s;animation-duration:9.5s;width:128px"></span>' +
      '<span class="fx-flame" style="left:16%;bottom:-16px"></span>' +
      '<span class="fx-flame" style="left:78%;bottom:-22px;animation-delay:0.8s;width:80px;height:98px"></span>' +
      '<span class="fx-penta"></span>' +
      '<span class="fx-flame2" style="left:9%;bottom:-24px"></span>' +
      '<span class="fx-flame2" style="right:8%;bottom:-30px;animation-delay:1.6s;animation-duration:2s"></span>' +
      '<span class="fx-flash"></span>',
    sea:
      '<span class="fx-sun"></span>' +
      '<span class="fx-bub2" style="left:12%;bottom:-30px"></span>' +
      '<span class="fx-bub2" style="left:38%;bottom:-30px;animation-delay:1.2s;animation-duration:6.5s"></span>' +
      '<span class="fx-bub2" style="left:66%;bottom:-30px;animation-delay:2s;animation-duration:5s"></span>' +
      '<span class="fx-bub2" style="left:88%;bottom:-30px;animation-delay:0.6s;animation-duration:7s"></span>' +
      '<span class="fx-shell">' + DECO_SVG.shell + "</span>" +
      '<span class="fx-shell" style="left:82%;top:42%;animation-delay:1.4s;animation-duration:7.5s">' + DECO_SVG.shell + "</span>" +
      '<span class="fx-spark" style="left:30%;top:10%;animation-delay:0.5s"></span>' +
      '<span class="fx-spark" style="left:70%;top:14%;animation-delay:1.1s"></span>' +
      '<span class="fx-ball" style="left:26%;bottom:14%"></span>' +
      '<span class="fx-deck"><i class="fx-plate"></i><i class="fx-fader"></i></span>' +
      '<span class="fx-beat"></span>' +
      waveSvg("rgba(255,255,255,0.4)") +
      waveSvg("rgba(255,255,255,0.22)") +
      '<span class="fx-flash"></span>',
    deep:
      '<span class="fx-ray" style="left:12%;animation-delay:0s"></span>' +
      '<span class="fx-ray" style="left:55%;animation-delay:1.6s;transform:rotate(-12deg)"></span>' +
      '<span class="fx-ray" style="left:78%;animation-delay:0.8s;animation-duration:5.5s"></span>' +
      '<span class="fx-bub3" style="left:15%;bottom:-30px"></span>' +
      '<span class="fx-bub3" style="left:35%;bottom:-30px;animation-delay:1.4s;animation-duration:8s"></span>' +
      '<span class="fx-bub3" style="left:60%;bottom:-30px;animation-delay:2.2s;animation-duration:6s"></span>' +
      '<span class="fx-bub3" style="left:82%;bottom:-30px;animation-delay:0.7s;animation-duration:9s"></span>' +
      '<span class="fx-bub3" style="left:92%;bottom:-30px;animation-delay:1.9s;animation-duration:7.5s"></span>' +
      '<span class="fx-glowdot" style="left:25%;top:30%;animation-delay:0.3s"></span>' +
      '<span class="fx-glowdot" style="left:70%;top:22%;animation-delay:1.2s"></span>' +
      '<span class="fx-glowdot" style="left:48%;top:70%;animation-delay:2s"></span>' +
      '<span class="fx-glowdot" style="left:88%;top:66%;animation-delay:0.9s;animation-duration:4.5s"></span>' +
      '<span class="fx-jelly" style="right:9%;top:8%;width:104px">' +
      '<span class="j-dome"></span>' +
      '<span class="j-t" style="left:24%;height:44px;animation-delay:0.2s"></span>' +
      '<span class="j-t" style="left:42%;height:60px;animation-delay:0.8s;animation-duration:2.2s"></span>' +
      '<span class="j-t" style="left:60%;height:52px;animation-delay:1.3s"></span>' +
      '<span class="j-t" style="left:78%;height:40px;animation-delay:1.8s;animation-duration:3s"></span>' +
      "</span>" +
      '<span class="fx-jelly" style="left:7%;bottom:12%;width:64px;opacity:0.65;animation-delay:3.4s;animation-duration:13s">' +
      '<span class="j-dome" style="height:40px"></span>' +
      '<span class="j-t" style="left:26%;height:30px;animation-delay:0.4s"></span>' +
      '<span class="j-t" style="left:52%;height:42px;animation-delay:1s"></span>' +
      '<span class="j-t" style="left:74%;height:28px;animation-delay:1.6s;animation-duration:2.2s"></span>' +
      "</span>" +
      '<span class="fx-flash"></span>',
    koma:
      '<span class="fx-koma-spin" style="left:10%;top:10%;width:96px">' + DECO_SVG.top + "</span>" +
      '<span class="fx-koma-spin" style="right:8%;bottom:6%;width:72px;animation-duration:4.2s">' + DECO_SVG.top + "</span>" +
      '<span class="fx-daruma" style="right:13%;top:12%">' +
      '<i class="fx-d-h"></i><i class="fx-d-b" style="--i:1"></i><i class="fx-d-b" style="--i:2"></i>' +
      '<i class="fx-d-b" style="--i:3"></i><i class="fx-d-b" style="--i:4"></i></span>' +
      '<span class="fx-seigaiha" style="left:6%;bottom:2%;width:170px;height:170px"></span>' +
      '<span class="fx-seigaiha" style="right:16%;bottom:24%;width:110px;height:110px;animation-duration:44s"></span>' +
      '<span class="fx-lantern" style="left:8%;top:10%"></span>' +
      '<span class="fx-lantern" style="left:16%;top:20%;animation-delay:1.4s;animation-duration:7s"></span>' +
      '<span class="fx-hanabi" style="left:60%;top:22%"></span>' +
      '<span class="fx-hanabi fx-hana2" style="left:22%;top:36%;width:88px;height:88px;animation-delay:1.1s"></span>' +
      '<span class="fx-flash"></span>',
    sleep:
      '<span class="fx-cloud" style="top:12%;animation-duration:26s"></span>' +
      '<span class="fx-cloud" style="top:30%;animation-delay:8s;animation-duration:32s;opacity:0.5;width:150px"></span>' +
      '<span class="fx-cloud" style="top:52%;animation-delay:15s;animation-duration:38s;opacity:0.35;width:120px"></span>' +
      '<span class="fx-moon"><svg viewBox="0 0 100 100" aria-hidden="true"><path fill="#fff" d="M70,10 A46,46 0 1 0 70,90 A34,34 0 0 1 70,10Z"/></svg></span>' +
      '<span class="fx-zzz" style="left:18%;bottom:16%;animation-delay:0s">Z</span>' +
      '<span class="fx-zzz" style="left:28%;bottom:26%;animation-delay:1.2s;font-size:1.5rem">z</span>' +
      '<span class="fx-zzz" style="left:36%;bottom:34%;animation-delay:2.3s;font-size:1.1rem;animation-duration:5s">z</span>' +
      '<span class="fx-star-shoot"></span>' +
      '<span class="fx-spark" style="left:12%;top:18%;animation-delay:0.4s"></span>' +
      '<span class="fx-spark" style="left:86%;top:22%;animation-delay:0.9s"></span>' +
      '<span class="fx-spark" style="left:70%;top:60%;animation-delay:1.5s"></span>' +
      '<span class="fx-spark" style="left:26%;top:52%;animation-delay:2s;width:12px;height:12px"></span>' +
      '<span class="fx-pillow"></span>' +
      '<span class="fx-flash"></span>',
    rain:
      '<span class="fx-rain-s" style="left:8%;animation-delay:0s"></span>' +
      '<span class="fx-rain-s" style="left:22%;animation-delay:0.6s;animation-duration:1.9s"></span>' +
      '<span class="fx-rain-s" style="left:37%;animation-delay:1.3s"></span>' +
      '<span class="fx-rain-s" style="left:52%;animation-delay:0.3s;animation-duration:2.1s"></span>' +
      '<span class="fx-rain-s" style="left:66%;animation-delay:1.7s"></span>' +
      '<span class="fx-rain-s" style="left:80%;animation-delay:0.9s;animation-duration:1.7s"></span>' +
      '<span class="fx-rain-s" style="left:93%;animation-delay:2s"></span>' +
      '<span class="fx-rip" style="left:18%;bottom:6%;animation-delay:0s"></span>' +
      '<span class="fx-rip" style="left:55%;bottom:10%;animation-delay:1.2s"></span>' +
      '<span class="fx-rip" style="left:82%;bottom:6%;animation-delay:2.2s;animation-duration:3.8s"></span>' +
      '<span class="fx-puddle" style="left:30%;bottom:-6px"></span>' +
      '<span class="fx-puddle" style="left:70%;bottom:-2px;animation-delay:0.9s"></span>' +
      '<span class="fx-umbrella"><svg viewBox="0 0 120 110" aria-hidden="true"><path d="M14 58a46 46 0 0 1 92 0z" fill="#3d4a55"/><path d="M14 58a46 46 0 0 1 92 0" fill="none" stroke="#5a6a78" stroke-width="2.5"/><g stroke="#54626f" stroke-width="3" stroke-linecap="round"><path d="M34 59L60 92 86 59"/><path d="M60 92v12"/></g><path d="M53 104q7 11 14 0" fill="none" stroke="#ef8b8b" stroke-width="4" stroke-linecap="round"/></svg></span>' +
      '<span class="fx-bolt"><svg viewBox="0 0 120 260" aria-hidden="true"><polygon points="72,0 26,140 62,140 38,260 100,108 62,108 88,0" fill="#ffe9a8"/></svg></span>' +
      '<span class="fx-flash2"></span>',
    paint:
      '<svg class="fx-rainbow-svg" viewBox="0 0 340 170" aria-hidden="true"><path stroke="#ff8fab" stroke-width="22" d="M20,170 A150,150 0 0 1 320,170"/><path stroke="#ffd166" stroke-width="20" d="M40,170 A130,130 0 0 1 300,170"/><path stroke="#6bc77b" stroke-width="18" d="M60,170 A110,110 0 0 1 280,170"/><path stroke="#4d96ff" stroke-width="16" d="M80,170 A90,90 0 0 1 260,170"/><path stroke="#b980f0" stroke-width="14" d="M100,170 A70,70 0 0 1 240,170"/></svg>' +
      '<span class="fx-splat" style="left:15%;top:14%;background:#ff7aa2;animation-delay:0.2s"></span>' +
      '<span class="fx-splat" style="left:84%;top:20%;background:#ffd166;animation-delay:0.9s;width:64px;height:58px"></span>' +
      '<span class="fx-splat" style="left:76%;top:66%;background:#8bd3dd;animation-delay:1.5s;width:50px;height:46px"></span>' +
      '<span class="fx-splat" style="left:9%;top:58%;background:#c49fe0;animation-delay:1.1s;width:44px;height:40px;animation-duration:6s"></span>' +
      '<span class="fx-drip" style="left:26%;background:#ff7aa2;animation-delay:0s;animation-duration:6s"></span>' +
      '<span class="fx-drip" style="left:63%;background:#8bd3dd;animation-delay:1.6s"></span>' +
      '<span class="fx-drip" style="left:82%;background:#ffd166;animation-delay:3s;height:34px"></span>' +
      '<span class="fx-spark" style="left:40%;top:26%;animation-delay:0.4s"></span>' +
      '<span class="fx-spark" style="left:58%;top:60%;animation-delay:1.3s;width:20px;height:20px"></span>' +
      '<span class="fx-blob" style="left:30%;top:16%;background:#ff8fab;animation-delay:1.9s"></span>' +
      '<span class="fx-blob" style="left:55%;top:12%;background:#ffd166;animation-delay:2.14s;width:14px;height:14px"></span>' +
      '<span class="fx-blob" style="left:42%;top:30%;background:#4d96ff;animation-delay:2.4s;width:12px;height:12px"></span>' +
      '<span class="fx-blob" style="left:66%;top:42%;background:#6bc77b;animation-delay:2.7s;width:20px;height:20px"></span>' +
      '<span class="fx-flash"></span>',
    lockon:
      '<div class="fx-grid"></div>' +
      '<span class="fx-scan"></span>' +
      '<span class="fx-scan" style="animation-delay:1.7s;opacity:0.5"></span>' +
      '<i class="fx-corner c1"></i><i class="fx-corner c2"></i><i class="fx-corner c3"></i><i class="fx-corner c4"></i>' +
      '<span class="fx-hud-top"><i class="fx-dot"></i>LOCK ON SYSTEM v4.6</span>' +
      '<span class="fx-hud-bot">対象を捕捉中…</span>' +
      '<span class="fx-code">SEC:04 // RNG:13.42%</span>' +
      '<span class="fx-clock">▮ 00:14:36</span>' +
      '<span class="fx-plus" style="left:20%;top:30%;animation-delay:0.3s"></span>' +
      '<span class="fx-plus" style="left:75%;top:18%;animation-delay:1s"></span>' +
      '<span class="fx-plus" style="left:60%;top:72%;animation-delay:0.6s"></span>' +
      '<span class="fx-plus" style="left:14%;top:60%;animation-delay:1.4s"></span>' +
      '<span class="fx-plus" style="left:88%;top:52%;animation-delay:2s"></span>' +
      '<span class="fx-reticle">' +
      '<b class="fx-lock"><i class="fx-lock2"></i></b>' +
      '<span class="fx-r-ring"></span>' +
      "</span>" +
      '<span class="fx-locktext">LOCK ON</span>' +
      '<span class="fx-lockflash"></span>',
    straw:
      '<span class="fx-straw" style="left:10%;animation-delay:0s">' + DECO_SVG.ichigo + "</span>" +
      '<span class="fx-straw" style="left:30%;animation-delay:1.2s;width:24px;height:24px">' + DECO_SVG.ichigo + "</span>" +
      '<span class="fx-straw" style="left:52%;animation-delay:0.6s;width:36px;height:36px">' + DECO_SVG.ichigo + "</span>" +
      '<span class="fx-straw" style="left:72%;animation-delay:1.8s;width:26px;height:26px">' + DECO_SVG.ichigo + "</span>" +
      '<span class="fx-straw" style="left:90%;animation-delay:0.9s">' + DECO_SVG.ichigo + "</span>" +
      '<span class="fx-heart" style="left:16%;top:24%;animation-delay:0.3s"></span>' +
      '<span class="fx-heart" style="left:70%;top:18%;animation-delay:1.2s;animation-duration:5.5s"></span>' +
      '<span class="fx-heart" style="left:46%;top:64%;animation-delay:1.8s;animation-duration:6s"></span>' +
      '<span class="fx-spark" style="left:26%;top:40%;animation-delay:0.8s"></span>' +
      '<span class="fx-spark" style="left:84%;top:52%;animation-delay:1.5s"></span>' +
      '<span class="fx-antler" style="right:9%;top:12%"></span>' +
      '<span class="fx-antler" style="left:8%;bottom:16%;width:64px;height:64px;animation-delay:1.2s;animation-duration:7s;opacity:0.7"></span>' +
      '<span class="fx-flash"></span>'
  };
  var html = V[kind];
  if (!html) return "";
  return '<div class="intro-fx fx-' + kind + '">' + html + "</div>";
}

const navDrop = (home) => `
      <div class="nav-drop" id="memberDrop">
        <button type="button" class="nav-drop-btn">Member Guide<span class="caret"></span></button>
        <div class="nav-drop-menu">
          <a class="drop-top" href="${home}#members" data-i18n="nav.memberAll">Member Guide 一覧へ</a>
          <div class="drop-sep"></div>
          <a href="konomi.html" data-i18n-name="konomi">甘狼このみ</a>
          <a href="nono.html" data-i18n-name="nono">音ノ乃のの</a>
          <a href="akubi.html" data-i18n-name="akubi">あくび・でもんすぺーど</a>
          <a href="koma.html" data-i18n-name="koma">小廻こま</a>
          <a href="raco.html" data-i18n-name="raco">音ノ瀬らこ</a>
          <a href="yura.html" data-i18n-name="yura">ゆらぎゆら</a>
          <a href="nuhu.html" data-i18n-name="nuhu">虹深°ぬふ</a>
          <a href="tsukuri.html" data-i18n-name="tsukuri">眠雲ツクリ</a>
          <a href="liz.html" data-i18n-name="liz">雨夜リズ</a>
          <a href="rei.html" data-i18n-name="rei">夕霧レイ</a>
          <a href="mahoro.html" data-i18n-name="mahoro">鹿乃まほろ</a>
          <a href="milchan.html" data-i18n-name="milchan">ミリちゃん</a>
          <div class="drop-sep"></div>
          <a href="members.html" data-i18n="nav.compare">メンバー比較表</a>
          <a href="account.html" data-i18n="nav.account">マイページ</a>
        </div>
      </div>
      <a href="goods/current.html">MilliDex</a>
      <a href="${home}#groups" data-i18n="nav.groups">グループ・期生</a>
      <a href="songs.html" data-i18n="nav.songs">曲データベース</a>
      <a href="${home}#calendar">Event Calendar</a>
      <a href="${home}#links">Official Links</a>
      <a href="cursors.html">カーソル配布</a>`;

const mobileNav = (home) => `
      <div class="drawer-section-label">設定</div>
      <div class="drawer-settings">
        <button type="button" class="notif-bell" id="mobileNotifBell" aria-label="通知設定" data-i18n-aria="header.notif">🔔</button>
        <button type="button" class="theme-toggle" id="mobileThemeToggle" aria-label="ダークモード切替" data-i18n-aria="header.theme">🌙</button>
        <button type="button" class="lang-toggle" id="mobileLangToggle" aria-label="言語切替" data-i18n-aria="header.lang">EN</button>
        <span style="font-size:0.78rem;color:var(--muted);font-weight:700;">通知 / テーマ / 言語</span>
      </div>
      <div class="drawer-section-label">セクション</div>
      <a href="${home}#home">Home</a>
      <a href="${home}#groups" data-i18n="nav.groups">グループ・期生</a>
      <a href="${home}#members">Member Guide</a>
      <a href="${home}#calendar">Event Calendar</a>
      <a href="${home}#links">Official Links</a>
      <div class="drawer-section-label">Member Guide</div>
      <a class="mobile-sub" href="konomi.html" data-i18n-name="konomi">甘狼このみ</a>
      <a class="mobile-sub" href="nono.html" data-i18n-name="nono">音ノ乃のの</a>
      <a class="mobile-sub" href="akubi.html" data-i18n-name="akubi">あくび・でもんすぺーど</a>
      <a class="mobile-sub" href="koma.html" data-i18n-name="koma">小廻こま</a>
      <a class="mobile-sub" href="raco.html" data-i18n-name="raco">音ノ瀬らこ</a>
      <a class="mobile-sub" href="yura.html" data-i18n-name="yura">ゆらぎゆら</a>
      <a class="mobile-sub" href="nuhu.html" data-i18n-name="nuhu">虹深°ぬふ</a>
      <a class="mobile-sub" href="tsukuri.html" data-i18n-name="tsukuri">眠雲ツクリ</a>
      <a class="mobile-sub" href="liz.html" data-i18n-name="liz">雨夜リズ</a>
      <a class="mobile-sub" href="rei.html" data-i18n-name="rei">夕霧レイ</a>
      <a class="mobile-sub" href="mahoro.html" data-i18n-name="mahoro">鹿乃まほろ</a>
      <a class="mobile-sub" href="milchan.html" data-i18n-name="milchan">ミリちゃん</a>
      <a href="members.html" data-i18n="nav.compare">メンバー比較表</a>
      <div class="drawer-section-label">MilliDex</div>
      <a href="goods/current.html">現在販売中</a>
      <a href="goods/shops.html" class="mobile-sub">販売箇所検索</a>
      <a href="goods/map.html" class="mobile-sub">有志マップ</a>
      <a href="goods/archive.html" class="mobile-sub">過去アーカイブ</a>
      <a href="goods/mine.html" class="mobile-sub">マイグッズ</a>
      <div class="drawer-section-label">コンテンツ</div>
      <a href="quiz.html" data-i18n="nav.quiz">ミリプロ検定</a>
      <a href="songs.html" data-i18n="nav.songs">曲データベース</a>
      <a href="cursors.html">カーソル配布</a>
      <a href="account.html" data-i18n="nav.account">マイページ</a>`;

/* 言語切替ボタン（全ページ共通のヘッダー用） */
const langToggleHtml = `
      <button type="button" class="lang-toggle" id="langToggle" aria-label="言語切替" data-i18n-aria="header.lang">EN</button>`;

const headerActions = (memberHome) => `
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
    </div>`;

const loginPopupHtml = `
<!-- Milli Unishare 参考: アカウント連携 4モーダル構成 -->
<div id="acctModal" class="acct-overlay" aria-hidden="true">
  <div class="acct-box">
    <button class="acct-close" data-close="acctModal" aria-label="閉じる">×</button>
    <h3><span style="background:linear-gradient(120deg,#4fc3f7,#b48cf2,#f78fc0);-webkit-background-clip:text;background-clip:text;color:transparent;">🔗</span> <span data-i18n="login.title">Milli Orbisアカウント連携</span></h3>
    <div style="padding:0 22px 18px;overflow-y:auto;">
      <p class="acct-hint" data-i18n-html="login.desc">Milli Orbisアカウントでログイン（または連携IDの設定）すると、Milli Games / Milli Unishare / Millipro Chronicle と同じアカウントを共有できます。<br>未ログインでも本サイトの全機能は利用できます。</p>
      <div id="mp-account-guest">
        <p class="acct-hint" data-i18n="login.guestHint">Milli Orbisアカウントでログインすると、お気に入り・推し・応援履歴を全端末で共有できて便利です。</p>
        <div class="acct-row">
          <button type="button" onclick="mpOpenLogin()" data-i18n="login.tabLogin">ログイン</button>
          <button type="button" onclick="mpOpenSignup()" data-i18n="login.tabSignup">新規登録</button>
        </div>
        <p class="acct-hint" style="text-align:center;margin:8px 0;" data-i18n="login.or">— または 連携IDを入力 —</p>
        <div id="mp-id-input">
          <div class="acct-pw-wrap"><input id="mp-id" placeholder="連携ID（例: TEST001）" data-i18n-placeholder="login.linkIdPh" autocomplete="off"></div>
          <button type="button" onclick="mpSetId()" style="width:100%" data-i18n="login.set">連携IDを保存</button>
        </div>
        <div class="acct-row" style="margin-top:10px;">
          <button type="button" class="mp-oauth-btn mp-oauth-google" onclick="mpOAuthLogin('google')" aria-label="Googleでログイン" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid #dadce0;border-radius:999px;background:#fff;color:#3c4043;font-weight:700;cursor:pointer;"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Google</button>
          <button type="button" class="mp-oauth-btn mp-oauth-x" onclick="mpOAuthLogin('twitter')" aria-label="Xでログイン" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:999px;background:#000;color:#fff;font-weight:700;cursor:pointer;">𝕏 X</button>
        </div>
        <p id="mp-msg" class="acct-msg"></p>
      </div>
      <div id="mp-account-ok" style="display:none;">
        <div class="acct-profile">
          <div id="mp-profile-icon" class="acct-avatar"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <div>
            <div id="mp-profile-name" style="font-size:15px;font-weight:800;"></div>
            <div id="mp-profile-msg" style="font-size:12px;color:var(--muted);word-wrap:break-word;"></div>
          </div>
        </div>
        <p style="word-wrap:break-word;font-size:13px;"><span data-i18n="login.linkId">連携ID:</span> <b id="mp-pid"></b></p>
        <div class="acct-row">
          <button type="button" onclick="mpCopyId()" data-i18n="login.copyId">コピー</button>
          <button type="button" onclick="mpStartEdit()" data-i18n="login.editSep">編集</button>
          <button type="button" onclick="mpLogout()" data-i18n="login.logout" style="background:#999;">ログアウト</button>
        </div>
        <div id="mp-link-providers" style="margin-top:12px;"></div>
        <div id="mp-link-msg" class="acct-msg"></div>
        <div class="acct-row" style="margin-top:8px;">
          <button type="button" onclick="mpOpenMypage()" style="width:100%;" data-i18n="account.mine">マイページ（応援・お気に入り）</button>
        </div>
        <div id="mp-account-edit" style="display:none;margin-top:14px;padding-top:12px;border-top:2px dashed var(--border);">
          <p class="acct-hint" data-i18n="login.editNote">⇒ 名前・アイコン・一言を保存（Firebase に反映）</p>
          <!-- ニックネーム登録: Unishare と同機構 + ポータル独自の絵文字/画像選択 -->
          <div class="acct-picon-row">
            <div id="mp-picon-preview" class="acct-avatar" style="width:42px;height:42px;font-size:20px;">?</div>
            <input id="mp-picon" placeholder="アイコン（文字 or 画像URL）" data-i18n-placeholder="login.iconPh" oninput="mpUpdatePiconPreview()" autocomplete="off">
          </div>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <label class="btn btn-ghost" style="font-size:12px;flex:none;" data-i18n="login.pickImg">画像を選ぶ<input type="file" id="mp-edit-icon-file" accept="image/*" hidden onchange="mpPickIconFile(this)"></label>
            <span class="acct-hint" style="margin:0;align-self:center;" data-i18n="login.emojiHint">または絵文字:</span>
          </div>
          <div class="mp-emoji-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
            <button type="button" class="mp-emoji-btn" data-emoji="🐺" onclick="mpPickEmoji('🐺')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🐺</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🍫" onclick="mpPickEmoji('🍫')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🍫</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🎧" onclick="mpPickEmoji('🎧')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🎧</button>
            <button type="button" class="mp-emoji-btn" data-emoji="👿" onclick="mpPickEmoji('👿')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">👿</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🐾" onclick="mpPickEmoji('🐾')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🐾</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🦦" onclick="mpPickEmoji('🦦')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🦦</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🌙" onclick="mpPickEmoji('🌙')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🌙</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🧊" onclick="mpPickEmoji('🧊')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🧊</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🔧" onclick="mpPickEmoji('🔧')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🔧</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🧸" onclick="mpPickEmoji('🧸')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🧸</button>
            <button type="button" class="mp-emoji-btn" data-emoji="🦭" onclick="mpPickEmoji('🦭')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">🦭</button>
            <button type="button" class="mp-emoji-btn" data-emoji="✨" onclick="mpPickEmoji('✨')" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:#fff;cursor:pointer;">✨</button>
          </div>
          <input id="mp-pname" placeholder="表示名（ニックネーム）" data-i18n-placeholder="login.namePh" maxlength="20" autocomplete="off">
          <input id="mp-pmsg" placeholder="一言（自己紹介）" data-i18n-placeholder="login.msgPh" autocomplete="off">
          <!-- 互換: 旧ID mp-edit-name / mp-edit-icon-preview への同期用 hidden -->
          <input id="mp-edit-name" style="display:none;">
          <div class="acct-row" style="margin-top:8px;">
            <button type="button" onclick="mpSaveProfile()" data-i18n="login.save">保存</button>
            <button type="button" onclick="mpCancelEdit()" style="background:#999;" data-i18n="login.cancel">キャンセル</button>
          </div>
          <p id="mp-edit-note" class="acct-msg"></p>
          <!-- 旧ID互換 -->
          <span id="mp-edit-icon-preview" style="display:none;"></span>
        </div>
        <p id="mp-edit-locked" class="acct-hint" style="display:none;" data-i18n="login.locked">名前・アイコンの変更はログイン後に使えます。</p>
      </div>
    </div>
  </div>
</div>

<div id="loginModal" class="acct-overlay" aria-hidden="true">
  <div class="acct-box">
    <button class="acct-close" data-close="loginModal" aria-label="閉じる">×</button>
    <h3 data-i18n="login.tabLogin">Milli Orbisアカウントにログイン</h3>
    <div style="padding:0 22px 18px;">
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button type="button" onclick="VideoApp && VideoApp._oauthLogin ? VideoApp._oauthLogin('google') : mpOAuthLogin('google')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid #dadce0;border-radius:999px;background:#fff;color:#3c4043;font-weight:700;cursor:pointer;"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Google</button>
        <button type="button" onclick="VideoApp && VideoApp._oauthLogin ? VideoApp._oauthLogin('twitter') : mpOAuthLogin('twitter')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:999px;background:#000;color:#fff;font-weight:700;cursor:pointer;">𝕏 X</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0;color:var(--muted);font-size:12px;"><span style="flex:1;height:1px;background:var(--border);"></span><span data-i18n="login.or">または</span><span style="flex:1;height:1px;background:var(--border);"></span></div>
      <input id="mp-email" type="email" placeholder="メールアドレス" data-i18n-placeholder="login.email" autocomplete="email">
      <div class="acct-pw-wrap">
        <input id="mp-pass" type="password" placeholder="パスワード" data-i18n-placeholder="login.pass" autocomplete="current-password">
        <button type="button" class="acct-pw-btn" data-pw="mp-pass" onclick="mpTogglePw('mp-pass')" aria-label="表示切替">👁</button>
      </div>
      <!-- 互換: 旧 mpToggle('mp-pass','mp-pass-eye') 呼び出し -->
      <span id="mp-pass-eye" style="display:none;"></span>
      <button type="button" onclick="mpSubmitLogin()" style="width:100%;" data-i18n="login.btnLogin">ログイン</button>
      <p class="acct-msg" id="mp-msg-login"></p>
      <p id="mp-msg" class="acct-msg" style="display:none;"></p>
      <p class="acct-hint" style="text-align:center;"><span data-i18n="login.noAccount">Milli Orbisアカウントをお持ちでない場合は</span> <a href="javascript:mpOpenSignup()" data-i18n="login.tabSignup">新規登録</a></p>
      <p style="text-align:center;margin-top:6px;"><button type="button" class="btn btn-ghost" onclick="mpOpenReset()" style="font-size:12px;padding:6px 12px;" data-i18n="login.forgot">パスワードをお忘れですか？</button></p>
      <div style="margin-top:14px; padding-top:12px; border-top:2px dashed var(--border);">
        <div class="acct-row">
          <button type="button" onclick="mpOpenSignup()" style="flex:1; background:#fff; color:var(--accent-deep); border:2px solid var(--accent); box-shadow:none;" data-i18n="login.goSignup">新規登録はこちら</button>
          <button type="button" onclick="mpOpenLinkId()" style="flex:1; background:#fff; color:var(--ink); border:2px solid var(--border); box-shadow:none;" data-i18n="login.goLinkId">連携IDで続ける</button>
        </div>
        <p class="acct-hint" style="text-align:center; margin:6px 0 0;">連携IDはログインせずに使える簡易IDです</p>
      </div>
    </div>
  </div>
</div>

<div id="signupModal" class="acct-overlay" aria-hidden="true">
  <div class="acct-box">
    <button class="acct-close" data-close="signupModal" aria-label="閉じる">×</button>
    <h3 data-i18n="login.tabSignup">Milli Orbisアカウントに新規登録</h3>
    <div style="padding:0 22px 18px;">
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button type="button" onclick="VideoApp && VideoApp._oauthLogin ? VideoApp._oauthLogin('google') : mpOAuthLogin('google')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1px solid #dadce0;border-radius:999px;background:#fff;color:#3c4043;font-weight:700;cursor:pointer;"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Google</button>
        <button type="button" onclick="VideoApp && VideoApp._oauthLogin ? VideoApp._oauthLogin('twitter') : mpOAuthLogin('twitter')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:999px;background:#000;color:#fff;font-weight:700;cursor:pointer;">𝕏 X</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0;color:var(--muted);font-size:12px;"><span style="flex:1;height:1px;background:var(--border);"></span><span data-i18n="login.or">または</span><span style="flex:1;height:1px;background:var(--border);"></span></div>
      <input id="mp-semail" type="email" placeholder="メールアドレス" data-i18n-placeholder="login.email" autocomplete="email">
      <!-- 互換: 旧 mp2-email -->
      <input id="mp2-email" type="email" placeholder="メールアドレス" style="display:none;">
      <div class="acct-pw-wrap">
        <input id="mp-spass1" type="password" placeholder="パスワード（6文字以上）" data-i18n-placeholder="login.passPh" autocomplete="new-password">
        <button type="button" class="acct-pw-btn" data-pw="mp-spass1" onclick="mpTogglePw('mp-spass1')" aria-label="表示切替">👁</button>
      </div>
      <div class="acct-pw-wrap">
        <input id="mp-spass2" type="password" placeholder="パスワード（確認）" data-i18n-placeholder="login.passConfirm" autocomplete="new-password">
        <button type="button" class="acct-pw-btn" data-pw="mp-spass2" onclick="mpTogglePw('mp-spass2')" aria-label="表示切替">👁</button>
      </div>
      <input id="mp2-pass" type="password" style="display:none;">
      <input id="mp2-pass2" type="password" style="display:none;">
      <span id="mp2-pass-eye" style="display:none;"></span>
      <button type="button" onclick="mpSubmitSignup()" style="width:100%;" data-i18n="login.btnRegister">Milli Orbisアカウントを作成</button>
      <p class="acct-msg" id="mp-msg-signup"></p>
      <p id="mp2-msg" class="acct-msg" style="display:none;"></p>
      <p class="acct-hint" style="text-align:center;"><span data-i18n="login.hasAccount">既にMilli Orbisアカウントをお持ちの場合は</span> <a href="javascript:mpOpenLogin()" data-i18n="login.tabLogin">ログイン</a></p>
      <div style="margin-top:14px; padding-top:12px; border-top:2px dashed var(--border);">
        <div class="acct-row">
          <button type="button" onclick="mpOpenLogin()" style="flex:1; background:#fff; color:var(--accent-deep); border:2px solid var(--accent); box-shadow:none;" data-i18n="login.goLogin">ログインはこちら</button>
          <button type="button" onclick="mpOpenLinkId()" style="flex:1; background:#fff; color:var(--ink); border:2px solid var(--border); box-shadow:none;" data-i18n="login.goLinkId">連携IDで続ける</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="mypageModal" class="acct-overlay" aria-hidden="true">
  <div class="acct-box">
    <button class="acct-close" data-close="mypageModal" aria-label="閉じる">×</button>
    <h3>🏷️ <span data-i18n="nav.account">マイページ</span></h3>
    <div style="padding:0 22px 18px;">
      <div id="mp-mypage-stats"><p class="acct-hint" data-i18n="account.loading">読み込み中…</p></div>
      <div class="acct-row" style="margin-top:12px;">
        <a href="account.html" class="btn" style="width:100%;justify-content:center;text-decoration:none;" data-i18n="account.openPage">マイページを開く</a>
      </div>
    </div>
  </div>
</div>

<div id="password-reset-dialog" class="acct-overlay hidden" aria-hidden="true" onclick="if(event.target===this)mpCloseReset()">
  <div class="acct-box" style="max-width:400px;">
    <button type="button" class="acct-close" data-close="password-reset-dialog" onclick="mpCloseReset()" aria-label="閉じる">×</button>
    <h3 data-i18n="login.resetTitle">🔑 パスワードを再設定</h3>
    <div style="padding:0 22px 18px;">
      <p class="acct-hint" data-i18n="login.resetSub">登録したメールアドレスに再設定用のリンクを送信します。</p>
      <input class="mp-input" id="reset-email" type="email" placeholder="メールアドレス" data-i18n-placeholder="login.email" autocomplete="email">
      <button type="button" class="btn" style="width:100%;justify-content:center;" id="reset-send-btn" onclick="mpResetSubmit()" data-i18n="login.resetSend">メールを送信</button>
      <p id="reset-msg" class="acct-msg"></p>
    </div>
  </div>
</div>

<!-- 旧 login-popup 互換レイヤー（非表示）: 旧JSからの参照を壊さないため残す -->
<div id="login-popup" class="login-popup" style="display:none !important;" aria-hidden="true">
  <div id="mp-popup-close" style="display:none;"></div>
  <div id="mp-account-guest-dup" style="display:none;"></div>
  <div id="mp-account-ok-dup" style="display:none;"></div>
  <span id="mp-msg-dup" style="display:none;"></span>
</div>`;

const footerHtml = `
<footer>
  <p class="disclaimer" data-i18n="footer.disclaimer">本サイトはファンが運営する非公式のポータルサイトです。ミリプロ公式様とは一切関係ありません。</p>
  <p class="source-note"><span data-i18n="footer.source">ミリプロ（Million Production）公式サイト:</span> <a href="https://milpr.com/" target="_blank" rel="noopener">https://milpr.com/</a></p>
  <p class="source-note"><span data-i18n="footer.apiPre">YouTube Data API を利用しています（</span><a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener">YouTube API Services Terms of Service</a><span data-i18n="footer.apiPost">）</span></p>
  <p class="source-note"><span data-i18n="footer.yt">本サイトは YouTube の利用規約に同意の上でご利用ください: </span><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">https://www.youtube.com/t/terms</a></p>
  <p data-i18n="footer.copy">© 2026 Milli Orbis（非公式ファンサイト）</p>
  <p class="source-note"><span data-i18n="footer.admin">作成・管理者：</span><a href="https://x.com/SunSunmachi" target="_blank" rel="noopener">すんすん（@SunSunmachi）</a></p>
</footer>`;

const i18nScriptTags = `
<script src="data/i18n.js"></script>
<script src="scripts/i18n.js"></script>`;

function decoHtml(m) {
  var d = m.deco;
  if (!d || !(d.floats || d.shape)) return "";
  var s = "";
  (d.floats || []).forEach(function (f) {
    s += '<span class="d-f" data-k="' + f.k + '" style="left:' + f.x + "%;top:" + f.y + "%;width:" + f.size +
      "px;height:" + f.size + "px;--dur:" + f.dur + 's">' + (DECO_SVG[f.k] || "") + "</span>";
  });
  if (d.shape === "paw") s += '<span class="d-paw" style="left:82%;top:30%"><i></i><i></i><i></i><i></i></span>';
  if (d.shape === "bub") s += '<span class="d-bub" style="left:12%;top:30%"></span><span class="d-bub" style="left:76%;top:40%;animation-delay:2s"></span>';
  if (d.shape === "rain") s += '<span class="d-rain" style="left:74%;top:6%"></span><span class="d-drop" style="left:88%;top:18%"></span><span class="d-drop" style="left:66%;top:44%;animation-delay:1.4s"></span>';
  if (d.shape === "cross") s += '<span class="d-cross" style="left:82%;top:20%"></span>';
  if (d.shape === "wheel") s += '<span class="d-wheel" style="left:84%;top:12%"></span>';
  if (d.shape === "zzz") s += '<span class="d-zzz" style="left:16%;top:62%">Z</span><span class="d-zzz" style="left:27%;top:74%;font-size:2.1rem;animation-delay:1.1s">z</span><span class="d-zzz" style="left:37%;top:84%;font-size:1.4rem;animation-delay:2.1s">z</span>';
  if (d.shape === "straw") s += '<span class="d-straw" style="left:50%;top:62%;transform:translateX(-50%)">' + (DECO_SVG.ichigo || "") + "</span>";
  return '<div class="page-deco" aria-hidden="true">' + s + "</div>";
}

function page(m) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title data-i18n="pageTitle.member" data-i18n-var-name="${m.id}">${m.name}（${m.nameEn}）| Milli Orbis</title>
<meta name="description" content="${esc(m.catch)}。${m.gen}の${m.name}の非公式ファンページ。ファンネーム: ${esc(m.fanName || "—")}。">
<link rel="icon" href="images/icon/Milli%20Orbis.ico" sizes="any">
<link rel="apple-touch-icon" sizes="192x192" href="images/icon/Milli%20Orbis-192.png">
<link rel="apple-touch-icon" sizes="518x518" href="images/icon/Milli%20Orbis-518.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#75b1c0">
<script>try{if(localStorage.getItem("milli-theme")==="dark"||(!localStorage.getItem("milli-theme")&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark";}catch(e){}</script>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Milli Orbis">
<meta property="og:title" content="${m.name}（${m.nameEn}）| Milli Orbis">
<meta property="og:description" content="${esc(m.catch)}">
<meta property="og:url" content="${SITE_CONFIG.siteUrl}/${m.id}.html">
<meta property="og:image" content="${SITE_CONFIG.siteUrl}${SITE_CONFIG.ogImage}">
<meta property="og:image:width" content="1729">
<meta property="og:image:height" content="910">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${m.name}（${m.nameEn}）| Milli Orbis">
<meta name="twitter:description" content="${esc(m.catch)}">
<meta name="twitter:image" content="${SITE_CONFIG.siteUrl}${SITE_CONFIG.ogImage}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body data-member="${m.id}" data-oshi="">
${decoHtml(m)}
<header id="siteHeader">
  <div class="header-inner">
    <a class="logo" href="index.html"><img src="images/rogo/Milli%20Orbis-rogo.png" alt="Milli Orbis"></a>
    <nav class="nav">
      <a href="index.html#home">Home</a>
      ${navDrop("index.html")}
    </nav>
    ${headerActions()}
  </div>
  <div id="drawerBackdrop" class="drawer-backdrop" aria-hidden="true"></div>
  <nav id="mobileNav" class="mobile-nav" aria-hidden="true">
    ${mobileNav("index.html")}
  </nav>
</header>

<nav class="talent-tabs" aria-label="タレント切り替え" data-i18n-aria="t.tabsAria">
  ${tabs(m)}
</nav>

<main class="container">
  <nav class="breadcrumb"><a href="index.html">Home</a><a href="index.html#members">Member Guide</a><span id="bcName" data-i18n-name="${m.id}">${m.name}</span></nav>

  <section id="talentHero" class="talent-hero">
    <div class="heroSweep"></div>
    <div class="talent-hero-inner">
      ${m.logo ? '<img class="talent-hero-logo" src="' + m.logo + '" alt="">' : ""}
      ${m.img ? '<img class="talent-hero-art" src="' + m.img + '" alt="' + m.name + '">' : ""}
      <h1 data-i18n-name="${m.id}">${m.name}</h1>
      <p class="talent-name-en">${m.nameEn}</p>
      <p class="talent-catch" id="tCatch"></p>
      <p class="talent-tags">
        <img id="tGenIcon" class="group-icon" alt="" hidden>
        <span id="tGen"></span>
        <span data-i18n-html="t.fanName" data-i18n-var-name="${m.fanName || "—"}">ファンネーム: ${m.fanName || "—"}</span>
      </p>
      <button type="button" class="intro-btn" id="introBtn" data-i18n="t.intro">▶ イントロを見る</button>
      <button type="button" class="bm-btn talent-hero-bm" aria-label="ブックマーク" data-i18n-aria="bm.aria" data-bm-kind="member" data-bm-key="mb:${m.id}" data-bm-id="${m.id}" data-bm-name="${esc(m.name)}" data-bm-nameen="${esc(m.nameEn)}" data-bm-color="${m.color}" data-bm-img="${esc(m.img || m.icon || "")}"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h12a1 1 0 0 1 1 1V22l-7-4.6L5 22V3.5a1 1 0 0 1 1-1z"/></svg></button>
    </div>
  </section>

  <section id="voiceSection" class="section"></section>

  <section id="profileSection" class="section"></section>

  <section id="phrasesSection" class="section"></section>

  <section id="detailSection" class="section"></section>

  <section id="tagSection" class="section"></section>

  <section id="videoSection" class="section"></section>

  <section id="linkSection" class="section"></section>

  <p class="back-to-guide"><a href="index.html#members" data-i18n="t.back">← Member Guide に戻る</a></p>
</main>

${footerHtml}

${introOverlay(m)}

${loginPopupHtml}

<div class="float-actions">
  <button type="button" class="share-x" id="shareXBtn" data-i18n="share.x">Xで共有</button>
  <button type="button" class="to-top" id="toTopBtn" aria-label="ページ上部へ" data-i18n-aria="toTop.aria">▲</button>
</div>

<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
<script src="firebase-config.js"></script>
<script src="firebase-init.js"></script>
<script src="data.js"></script>
${i18nScriptTags}
<script src="scripts/fav-store.js"></script>
<script src="scripts/cursor.js"></script>
<script src="scripts/contact.js?v=20260909"></script>
<script src="script.js"></script>
</body>
</html>
`;
}

const outDir = path.join(__dirname, "..");

/* 検定・楽曲など汎用サブページ（共通ヘッダー/フッター/ログインポップアップ付き） */
function simplePage(o) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title${o.ti18n ? ' data-i18n="' + o.ti18n + '"' : ""}>${o.title} | Milli Orbis</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="icon" href="images/icon/Milli%20Orbis.ico" sizes="any">
<link rel="apple-touch-icon" sizes="192x192" href="images/icon/Milli%20Orbis-192.png">
<link rel="apple-touch-icon" sizes="518x518" href="images/icon/Milli%20Orbis-518.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#75b1c0">
<script>try{if(localStorage.getItem("milli-theme")==="dark"||(!localStorage.getItem("milli-theme")&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark";}catch(e){}</script>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Milli Orbis">
<meta property="og:title" content="${o.title} | Milli Orbis">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${SITE_CONFIG.siteUrl}/${o.file}">
<meta property="og:image" content="${SITE_CONFIG.siteUrl}${SITE_CONFIG.ogImage}">
<meta property="og:image:width" content="1729">
<meta property="og:image:height" content="910">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${o.title} | Milli Orbis">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${SITE_CONFIG.siteUrl}${SITE_CONFIG.ogImage}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body data-member="" data-oshi="">
<header id="siteHeader">
  <div class="header-inner">
    <a class="logo" href="index.html"><img src="images/rogo/Milli%20Orbis-rogo.png" alt="Milli Orbis"></a>
    <nav class="nav">
      <a href="index.html#home">Home</a>
      ${navDrop("index.html")}
    </nav>
    ${headerActions()}
  </div>
  <div id="drawerBackdrop" class="drawer-backdrop" aria-hidden="true"></div>
  <nav id="mobileNav" class="mobile-nav" aria-hidden="true">
    ${mobileNav("index.html")}
  </nav>
</header>

<main class="container">
  <nav class="breadcrumb"><a href="index.html">Home</a><span${o.ti18n ? ' data-i18n="' + o.ti18n + '"' : ""}>${o.title}</span></nav>

  <section class="subpage-hero">
    <h1${o.ti18n ? ' data-i18n="' + o.ti18n + '"' : ""}>${o.title}</h1>
    <p${o.di18n ? ' data-i18n="' + o.di18n + '"' : ""}>${esc(o.desc)}</p>${o.note ? '\n    <p class="cmp-disclaimer"' + (o.ni18n ? ' data-i18n="' + o.ni18n + '"' : "") + ">" + esc(o.note) + "</p>" : ""}${o.cta ? "\n    " + o.cta : ""}
  </section>

  ${o.body}
</main>

${footerHtml}

${loginPopupHtml}

<div class="float-actions">
  <button type="button" class="share-x" id="shareXBtn" data-i18n="share.x">Xで共有</button>
  <button type="button" class="to-top" id="toTopBtn" aria-label="ページ上部へ" data-i18n-aria="toTop.aria">▲</button>
</div>

<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
<script src="firebase-config.js"></script>
<script src="firebase-init.js"></script>
<script src="data.js"></script>
${i18nScriptTags}
<script src="scripts/fav-store.js"></script>
<script src="scripts/cursor.js"></script>
<script src="scripts/contact.js?v=20260909"></script>
<script src="script.js"></script>
${o.scripts}
</body>
</html>
`;
}

fs.writeFileSync(path.join(outDir, "quiz.html"), simplePage({
  file: "quiz.html",
  title: "ミリプロ検定",
  ti18n: "pageTitle.quiz",
  di18n: "pageDesc.quiz",
  desc: "ミリプロについての25問クイズに挑戦！クイック10問からプロの全問出題まで。全問正解で「ミリプロ博士」の称号を目指せ！",
  body: `
  <section id="quizStart" class="section quiz-section">
    <div class="quiz-card card">
      <h2 data-i18n="quizp.title">ミリプロ検定に挑戦！</h2>
      <p data-i18n="quizp.sub">ミリプロメンバー・設立・流行語まで、ここでしか出ない25問。</p>
      <p class="quiz-note" data-i18n="quizp.note">答えはMember Guideから導き出せます（プロは推しの情報も丸暗記）。</p>
      <div class="quiz-mode-row">
        <div class="quiz-mode-card">
          <span class="quiz-mode-label" data-i18n="quizp.modeQuick">クイック</span>
          <p data-i18n="quizp.modeQuickDesc" data-i18n-html>ランダムに10問だけ出題。<br>隙間時間の腕試しに。</p>
          <button type="button" class="btn quiz-big-btn" id="quizStartBtn" data-i18n="quiz.quick">▶ クイック（10問）</button>
        </div>
        <div class="quiz-mode-card">
          <span class="quiz-mode-label" data-i18n="quizp.modePro">プロ</span>
          <p data-i18n="quizp.modeProDesc" data-i18n-html>全25問を出題。<br>ミリプロ博士はプロで決まる！</p>
          <button type="button" class="btn btn-ghost quiz-big-btn" id="quizStartPro" data-i18n-html="quiz.pro" data-i18n-var-n="25">▶ プロ（全25問）</button>
        </div>
      </div>
      <button type="button" class="btn btn-ghost quiz-big-btn" id="quizReviewBtn" disabled data-i18n="quizp.reviewBtn" data-i18n-var-n="0">📖 復習（間違えた問題）</button>
      <div class="quiz-stats" id="quizStats"></div>
    </div>
  </section>
  <section id="quizScreen" class="section quiz-section" style="display:none;">
    <div class="quiz-card card">
      <div class="quiz-progress-row"><span class="quiz-progress" id="quizProgress"></span></div>
      <h2 class="quiz-q" id="quizQ"></h2>
      <div class="quiz-opts" id="quizOpts"></div>
      <div class="quiz-explain" id="quizExplain" style="display:none;"></div>
      <button type="button" class="btn quiz-next" id="quizNext" style="display:none;" data-i18n="quizp.next">次の問題 →</button>
    </div>
  </section>
  <section id="quizResult" class="section quiz-section" style="display:none;">
    <div class="quiz-card card quiz-result">
      <div class="quiz-result-score" id="quizScore"></div>
      <div class="quiz-rank" id="quizRank"></div>
      <div class="quiz-btn-row">
        <a class="btn" id="quizShare" href="#" target="_blank" rel="noopener" data-i18n="quizp.share">Xで結果を共有</a>
        <button type="button" class="btn btn-ghost" id="quizRetry" data-i18n="quizp.retry">もう一度挑戦</button>
      </div>
    </div>
  </section>`,
  scripts: '<script src="scripts/quiz.js"></script>'
}), "utf8");
console.log("generated: quiz.html");

fs.writeFileSync(path.join(outDir, "songs.html"), simplePage({
  file: "songs.html",
  title: "曲データベース",
  ti18n: "pageTitle.songs",
  di18n: "pageDesc.songs",
  desc: "ミリプロの楽曲・歌動画をまとめたデータベース。歌ってみた・公式楽曲・歌枠を曲単位で検索でき、元曲から誰が歌っているかも調べられます。",
  cta: `
      <a class="unishare-cta" href="https://milli-unishare.onrender.com/" target="_blank" rel="noopener">
        <img src="images/icon/Milli%20Unishare-icon.PNG" alt="Milli Unishare" loading="lazy">
        <span data-i18n="songs.unishare">通常動画・ショート・ライブ配信のデータベースはこちら</span>
      </a>
      <a class="millivibe-cta" href="https://milli-unishare.onrender.com/millivibe" target="_blank" rel="noopener">
        <span class="mv-badge" data-i18n="songs.millivibeBadge">新サービス</span>
        <img src="images/rogo/Millivibe-rogo.png" alt="Millivibe" loading="lazy">
        <span data-i18n="songs.millivibe">曲を聴けるサブスク風サイトはこちら</span>
      </a>`,
  body: `
  <section class="section">
    <div class="song-modes">
      <button type="button" class="song-mode active" id="songsModeVideos" data-i18n="songs.modeVideos">歌動画</button>
      <button type="button" class="song-mode" id="songsModeMaster" data-i18n="songs.modeMaster">曲まとめ</button>
    </div>
    <div id="videosSection">
      <div class="song-tools">
        <input id="songsSearch" class="song-search" type="search" placeholder="曲名・メンバー名で検索…" data-i18n-placeholder="songs.search" autocomplete="off">
        <div class="song-tabs">
          <button type="button" class="song-tab active" id="songsTabAll" data-i18n="songs.tabAll">すべて</button>
          <button type="button" class="song-tab" id="songsTabCovers" data-i18n="songs.tabCovers">歌ってみた</button>
          <button type="button" class="song-tab" id="songsTabOfficial" data-i18n="songs.tabOfficial">公式楽曲</button>
          <button type="button" class="song-tab" id="songsTabKaraoke" data-i18n="songs.tabKaraoke">歌枠</button>
        </div>
      </div>
      <div class="song-chips" id="songsChips"></div>
      <p class="song-tab-label" id="songsTabLabel"></p>
      <p class="song-note" id="songsNote" style="display:none;" data-i18n="songs.note"></p>
      <div id="songsList"></div>
    </div>
    <div id="masterSection" style="display:none;">
      <div class="song-tools">
        <input id="smSearch" class="song-search" type="search" placeholder="曲名・アーティスト・メンバー名で検索…" data-i18n-placeholder="sm.search" autocomplete="off">
      </div>
      <p class="sm-disclaimer" data-i18n="sm.disclaimer">注意: このページの元曲のアーティスト・アルバムジャケット・タイムスタンプは自動取得・自動解析のため、正確でない可能性があります。誤りを見つけた場合はお知らせください。</p>
      <p class="sm-hint" data-i18n="sm.hint">元曲をタップすると、歌っているタレントと動画リンクが表示されます</p>
      <p class="song-tab-label" id="smCount"></p>
      <div id="smList"></div>
    </div>
  </section>`,
  scripts: '<script src="data/songs.js"></script>\n<script src="data/songs-extra.js"></script>\n<script src="data/song-master.js"></script>\n<script src="data/karaoke.js"></script>\n<script src="data/karaoke-shazam.js"></script>\n<script src="scripts/song-data.js"></script>\n<script src="scripts/songs.js"></script>\n<script src="scripts/songs-master.js"></script>'
}), "utf8");
console.log("generated: songs.html");

fs.writeFileSync(path.join(outDir, "members.html"), simplePage({
  file: "members.html",
  title: "メンバー比較表",
  ti18n: "pageTitle.members",
  di18n: "pageDesc.members",
  ni18n: "cmp.disclaimer",
  desc: "ミリプロ全メンバーの期・加入日・誕生日・身長などを一覧で比較できるメンバー比較表。推しの行はハイライトされます。",
  body: `
  <section id="memberCompare" class="section"></section>`,
  note: "掲載情報はすべて各メンバーの公式プロフィールに基づく事実情報であり、優劣を評価するものではありません。",
  scripts: ""
}), "utf8");
console.log("generated: members.html");

fs.writeFileSync(path.join(outDir, "account.html"), simplePage({
  file: "account.html",
  title: "マイページ",
  ti18n: "pageTitle.account",
  di18n: "pageDesc.account",
  desc: "お気に入り☆とブックマークの一覧ページ。ログインするとお気に入り・ブックマークが端末間で同期されます。",
  body: `
  <section class="section">
    <div class="acct-status card" id="acctStatus"></div>
    <div class="acct-oshi card" id="acctOshi"></div>
    <h2 class="acct-block-title" data-i18n="account.favs">お気に入り</h2>
    <div id="acctFavs" class="acct-list"></div>
    <h2 class="acct-block-title" data-i18n="account.bms">ブックマーク</h2>
    <div id="acctBms" class="acct-list"></div>
  </section>`,
  scripts: '<script src="scripts/account.js"></script>'
}), "utf8");
console.log("generated: account.html");

fs.writeFileSync(path.join(outDir, "cursors.html"), simplePage({
  file: "cursors.html",
  title: "オリジナルカーソル配布",
  desc: "Milli Orbis オリジナルマウスカーソルを配布しています。推しメンバーのカーソルをWindowsで使えます。サイト内でもカーソルを切り替えられます。",
  body: `
  <section class="section">
    <div class="card" style="padding:20px 22px;margin-bottom:22px;">
      <h3 style="font-family:var(--font-display);font-weight:900;margin-bottom:8px;">使い方</h3>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:12px;">お使いの機種のタブを選んでください。サイト内のカーソル切替（ヘッダー右の「カーソル」）は <b>Windows / Mac / Chromebook 全てで動作</b>します（ブラウザ内）。</p>
      <div class="cursor-tabs" id="cursorTabs" style="display:flex;gap:8px;margin-bottom:16px;">
        <button type="button" class="cursor-tab active" data-tab="win">Windows</button>
        <button type="button" class="cursor-tab" data-tab="mac">Mac</button>
        <button type="button" class="cursor-tab" data-tab="chromebook">Chromebook</button>
      </div>
      <div id="cursorTabWin">
        <ol style="padding-left:1.2em;line-height:1.9;font-size:0.92rem;">
          <li>下の一覧から「<b>一括DL（zip）</b>」をダウンロード → 解凍（右クリック → すべて展開）</li>
          <li>解凍したフォルダ内の <code>install.inf</code> を <b>右クリック → インストール</b>（Win11は <i>その他のオプションを表示 → インストール</i>）→ UACで <b>はい</b></li>
          <li><code>設定 → Bluetoothとデバイス → マウス → その他のマウス設定 → ポインター</code> で <b>配色</b> から <code>MilliOrbis-○○</code> を選択 → <b>適用</b></li>
          <li>うまくいかない場合: <code>install.bat</code> を右クリック → 管理者として実行、または手動で各役割を <code>参照</code> から指定</li>
        </ol>
        <p style="font-size:0.82rem;color:var(--muted);margin-top:10px;">※ zipには 15種の <code>.cur</code> + <code>install.inf</code> + <code>README.md</code> + <code>LICENSE</code> + <code>preview.png</code> + <code>install.bat</code> が同梱。<br>※ 全タレント一括の <a href="/dist/cursors/win/MilliOrbis-Cursors-All.zip" download>All.zip (Win)</a> も用意しています。</p>
        <p style="margin-top:12px;"><a href="/dist/cursors/win/MilliOrbis-Cursors-All.zip" download class="btn">全タレント一括DL（Win All.zip）</a></p>
      </div>
      <div id="cursorTabMac" style="display:none;">
        <p style="font-size:0.92rem;font-weight:700;margin-bottom:8px;">Mac — Mousecape でワンクリック（Windowsの install.inf 相当）</p>
        <ol style="padding-left:1.2em;line-height:1.9;font-size:0.92rem;">
          <li><a href="https://github.com/alexzielenski/Mousecape/releases" target="_blank" rel="noopener">Mousecape</a> をダウンロード → <code>Mousecape.app</code> を Applications に移動 → 起動</li>
          <li>初回は <code>System Settings → Privacy & Security → Accessibility</code> で Mousecape を許可</li>
          <li>下の一覧から「<b>Mac用DL</b>」をダウンロード → 解凍 → 中の <code>MilliOrbis-○○.cape</code> を<b>ダブルクリック</b> → Mousecapeに自動登録 → リストから <code>MilliOrbis-○○</code> を選択 → <code>Apply</code></li>
        </ol>
        <p style="font-size:0.82rem;color:var(--muted);margin-top:10px;">※ <code>*.cape</code> はWindowsの <code>install.inf</code> 相当で、ダブルクリックで15種が一括登録されます（手動の <code>png/</code> ドラッグもフォールバックで可能です）。<br>※ サイト内のカーソル切替は Mac のブラウザでも即時有効です。<br>※ 全タレント一括の <a href="/dist/cursors/mac/MilliOrbis-Cursors-All-mac.zip" download>All.zip (Mac)</a> も用意しています。</p>
        <p style="margin-top:12px;"><a href="/dist/cursors/mac/MilliOrbis-Cursors-All-mac.zip" download class="btn">全タレント一括DL（Mac All.zip）</a></p>
      </div>
      <div id="cursorTabChromebook" style="display:none;">
        <p style="font-size:0.92rem;font-weight:700;margin-bottom:8px;">Chromebook — 拡張でChromeブラウザ内に適用</p>
        <ol style="padding-left:1.2em;line-height:1.9;font-size:0.92rem;">
          <li>Chromeウェブストアで <a href="https://chrome.google.com/webstore/detail/custom-cursor-for-chrome/ogdlpmhglpejoiomcodnpjnfgcpmgale" target="_blank" rel="noopener">Custom Cursor for Chrome</a> を <code>Add to Chrome</code></li>
          <li>拡張の管理画面で <code>Upload cursor</code> から下の「<b>Chromebook用DL</b>」を解凍した <code>png/</code> 内の png を登録（対応表は同梱の README 参照）</li>
          <li>必要なら <code>Chromebook Settings → Accessibility → Cursor</code> でサイズ調整</li>
        </ol>
        <p style="font-size:0.82rem;color:var(--muted);margin-top:10px;">※ ChromebookはOS制限でシステム全体のカスタム画像は非対応のため、<b>Chromeブラウザ内のみ</b>有効です（Chromebookの主用途はブラウザのため実用上は十分です）。<br>※ サイト内のカーソル切替は Chromebook でも有効です。<br>※ 全タレント一括の <a href="/dist/cursors/chromebook/MilliOrbis-Cursors-All-chromebook.zip" download>All.zip (Chromebook)</a> も用意しています。</p>
        <p style="margin-top:12px;"><a href="/dist/cursors/chromebook/MilliOrbis-Cursors-All-chromebook.zip" download class="btn">全タレント一括DL（Chromebook All.zip）</a></p>
      </div>
    </div>
    <div class="card" style="padding:16px 20px;margin-bottom:22px;background:var(--accent-soft);">
      <h3 style="font-family:var(--font-display);font-weight:900;margin-bottom:8px;font-size:0.95rem;">ご利用についてのお願い</h3>
      <ul style="padding-left:1.2em;line-height:1.9;font-size:0.85rem;margin:0;">
        <li>個人で楽しむ範囲でご自由にお使いください。</li>
        <li>ファイルの二次配布・転載・販売・貸与（有償・無償を問いません）、加工したものの配布、商用利用はすべて禁止です。お友だちにはこのページを教えてあげてください。</li>
        <li>キャラクター等の権利はミリプロ（Million Production）様に、カーソル画像の著作権は作者（<a href="https://x.com/SunSunmachi" target="_blank" rel="noopener">すんすん @SunSunmachi</a>）に帰属します。</li>
      </ul>
    </div>
    <div id="cursorDistGrid" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;"></div>
  </section>`,
  scripts: '<script src="scripts/cursors-page.js"></script>'
}), "utf8");
console.log("generated: cursors.html");

for (const m of MEMBERS) {
  fs.writeFileSync(path.join(outDir, m.id + ".html"), page(m), "utf8");
  console.log("generated: " + m.id + ".html");
}
