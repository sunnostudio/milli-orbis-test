/* Spooky Masquerade — 4F「舞踏会のお菓子キャッチ」（Phase C2）
   金の盆で落ちてくるお菓子を受け止める45秒ゲーム。外部素材なし（絵文字描画）。
   操作：←→/ADキー・マウス・タッチ。保存はベストのみ端末保存。鍵・ログイン不要。 */
(function () {
  "use strict";

  var BEST_KEY = "milli-event-spooky-catch-best";
  var DANCE_KEY = "milli-event-spooky-dance";
  var PAGE_URL = "https://milli-orbis-portal.pages.dev/halloween/floor-4-salon.html#catch";
  var TAG = " #ミリプロ #SpookyMasquerade2026 #MilliOrbis";
  var GAME_SEC = 45;

  var W = 480, H = 560, TRAY_Y = H - 64, TRAY_W = 116, TRAY_H = 18;

  /* 抽選テーブル：[絵文字, 良いか, 素点, 重み] */
  var TABLE = [
    ["🍬", true, 10, 30],
    ["🍪", true, 10, 20],
    ["🍫", true, 10, 15],
    ["🍭", true, 20, 12],
    ["🧁", true, 20, 10],
    ["⭐", true, 30, 3],
    ["👻", false, 0, 6],
    ["💀", false, 0, 4]
  ];
  var BAG = [];
  TABLE.forEach(function (t) {
    for (var i = 0; i < t[3]; i++) BAG.push(t);
  });

  function $(id) { return document.getElementById(id); }

  function best() {
    try { return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {}
  }
  function dancePartner() {
    try {
      var o = JSON.parse(localStorage.getItem(DANCE_KEY) || "null");
      return o && o.partner ? o.partner : "";
    } catch (e) { return ""; }
  }

  var NAMES = {
    konomi: "甘狼このみ", nono: "音ノ乃のの", akubi: "あくび・でもんすぺーど",
    koma: "小廻こま", raco: "音ノ瀬らこ", yura: "ゆらぎゆら",
    nuhu: "虹深°ぬふ", tsukuri: "眠雲ツクリ", liz: "雨夜リズ",
    rei: "夕霧レイ", mahoro: "鹿乃まほろ", aoi: "海琳あおい", milchan: "ミリちゃん"
  };

  function rankFor(s) {
    if (s >= 400) return { r: "S", msg: "シャンデリア級！今夜の主役はあなたです。" };
    if (s >= 250) return { r: "A", msg: "ホール中が拍手！立派な舞踏会デビューです。" };
    if (s >= 120) return { r: "B", msg: "上出来！もう一踊りでAランクが見えます。" };
    return { r: "C", msg: "まずは盆の感覚掴みから。もう一度どうぞ！" };
  }

  function init() {
    var canvas = $("catchCanvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var veil = $("catchVeil"), veilTitle = $("catchVeilTitle"), veilText = $("catchVeilText"),
      startBtn = $("catchStart"), scoreEl = $("catchScore"), timeEl = $("catchTime"),
      heartsEl = $("catchHearts"), bestEl = $("catchBest"), msgEl = $("catchMsg"),
      retryBtn = $("catchRetry"), shareBtn = $("catchShare"), partnerEl = $("catchPartner");

    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

    var state = "idle"; /* idle | playing | over */
    var px = W / 2, targetX = W / 2, keyL = false, keyR = false;
    var items = [], flashes = [];
    var score = 0, hearts = 3, combo = 0, maxCombo = 0, timeLeft = GAME_SEC;
    var spawnAcc = 0, elapsed = 0, last = 0, raf = 0, paused = false;
    var lastScore = 0, lastRank = "C";

    if (bestEl) bestEl.textContent = String(best());
    var partner = dancePartner();
    if (partnerEl && partner && NAMES[partner]) {
      partnerEl.textContent = "（" + NAMES[partner] + "が見守っています）";
    }

    function speedMul() { return reduce ? 0.6 : 1; }

    function spawn() {
      var t = BAG[(Math.random() * BAG.length) | 0];
      var diff = 1 + (elapsed / GAME_SEC) * 0.9; /* 後半ほど速く・密に */
      items.push({
        e: t[0], good: t[1], base: t[2],
        x: 24 + Math.random() * (W - 48),
        y: -30,
        vy: (150 + Math.random() * 90) * diff * speedMul(),
        vx: (Math.random() - 0.5) * 40,
        spin: Math.random() * Math.PI * 2
      });
    }

    function hud() {
      if (scoreEl && score !== lastScore) { scoreEl.textContent = String(score); lastScore = score; }
      if (timeEl) timeEl.textContent = String(Math.ceil(timeLeft));
      if (heartsEl) heartsEl.textContent = hearts >= 3 ? "♥♥♥" : hearts === 2 ? "♥♥♡" : hearts === 1 ? "♥♡♡" : "♡♡♡";
    }

    function say(t) { if (msgEl) msgEl.textContent = t; }

    function loop(now) {
      if (state !== "playing") return;
      raf = requestAnimationFrame(loop);
      if (paused) { last = now; return; }
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; hud(); return finish(); }

      /* 盆の移動：キー優先、なければポインタ追従 */
      var kv = 0;
      if (keyL) kv -= 1;
      if (keyR) kv += 1;
      if (kv !== 0) {
        px += kv * 340 * dt;
        targetX = px;
      } else {
        px += (targetX - px) * Math.min(1, dt * 14);
      }
      px = Math.max(TRAY_W / 2 + 6, Math.min(W - TRAY_W / 2 - 6, px));

      /* 出現 */
      spawnAcc += dt * 1000;
      var interval = Math.max(340, 820 - elapsed * 11);
      while (spawnAcc >= interval) { spawnAcc -= interval; spawn(); }

      /* 落下・判定 */
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.y += it.vy * dt;
        it.x += it.vx * dt;
        if (it.x < 16) { it.x = 16; it.vx *= -1; }
        if (it.x > W - 16) { it.x = W - 16; it.vx *= -1; }
        var inY = it.y > TRAY_Y - 26 && it.y < TRAY_Y + 14;
        var inX = Math.abs(it.x - px) < TRAY_W / 2 + 12;
        if (inY && inX) {
          items.splice(i, 1);
          if (it.good) {
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            score += it.base + Math.min(combo, 10);
            flashes.push({ x: it.x, y: TRAY_Y - 10, r: 6, max: 34, good: true });
            if (combo > 0 && combo % 15 === 0) say(combo + "連続！ホールがどよめいています✦");
          } else {
            hearts--;
            combo = 0;
            flashes.push({ x: it.x, y: TRAY_Y - 10, r: 6, max: 44, good: false });
            say(it.e === "👻" ? "お化けのいたずら！ハート−1" : "ドクロに注意！ハート−1");
            if (hearts <= 0) { hud(); return finish(); }
          }
          continue;
        }
        if (it.y > H + 30) {
          items.splice(i, 1);
          if (it.good) combo = 0; /* 取りこぼしで連続途切れ */
        }
      }

      draw();
      hud();
    }

    /* 夜景の窓：星は初期配置、瞬きは時刻で */
    var STARS = [];
    (function () {
      var seed = 1234567;
      function rnd() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      }
      for (var i = 0; i < 64; i++) {
        STARS.push({
          x: rnd() * W,
          y: rnd() * (H * 0.62),
          r: 0.8 + rnd() * 1.8,
          p: rnd() * Math.PI * 2,
          s: 1.5 + rnd() * 2.5
        });
      }
    })();
    var TOWN_LIT = [
      [52, 498], [86, 498], [150, 496], [216, 500], [268, 496],
      [330, 500], [392, 496], [438, 500]
    ];

    function drawSky(now) {
      /* 夜空 */
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#070b24");
      sky.addColorStop(0.6, "#141c48");
      sky.addColorStop(1, "#2c3a72");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      /* 星（瞬き） */
      var t = (now || 0) / 1000;
      ctx.fillStyle = "#ffffff";
      for (var i = 0; i < STARS.length; i++) {
        var st = STARS[i];
        var a = 0.45 + 0.45 * Math.sin(t * st.s + st.p);
        ctx.globalAlpha = reduce ? 0.8 : Math.max(0.15, a);
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* 月 */
      var mx = W - 92, my = 108;
      var mg = ctx.createRadialGradient(mx, my, 4, mx, my, 74);
      mg.addColorStop(0, "rgba(253,246,221,0.85)");
      mg.addColorStop(0.5, "rgba(232,221,176,0.25)");
      mg.addColorStop(1, "rgba(232,221,176,0)");
      ctx.fillStyle = mg;
      ctx.fillRect(mx - 74, my - 74, 148, 148);
      ctx.fillStyle = "#f4ead0";
      ctx.beginPath();
      ctx.arc(mx, my, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(221,208,168,0.8)";
      ctx.beginPath();
      ctx.arc(mx - 9, my - 6, 6, 0, Math.PI * 2);
      ctx.arc(mx + 8, my + 9, 4, 0, Math.PI * 2);
      ctx.fill();
      /* 対岸の街 */
      ctx.fillStyle = "#05070f";
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, 500);
      ctx.lineTo(40, 500); ctx.lineTo(40, 482); ctx.lineTo(78, 482); ctx.lineTo(78, 502);
      ctx.lineTo(130, 502); ctx.lineTo(130, 478); ctx.lineTo(172, 478); ctx.lineTo(172, 500);
      ctx.lineTo(230, 500); ctx.lineTo(230, 486); ctx.lineTo(262, 486); ctx.lineTo(262, 502);
      ctx.lineTo(320, 502); ctx.lineTo(320, 480); ctx.lineTo(360, 480); ctx.lineTo(360, 502);
      ctx.lineTo(410, 502); ctx.lineTo(410, 488); ctx.lineTo(440, 488); ctx.lineTo(440, 502);
      ctx.lineTo(W, 502); ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd873";
      for (var j = 0; j < TOWN_LIT.length; j++) {
        ctx.fillRect(TOWN_LIT[j][0], TOWN_LIT[j][1], 7, 9);
      }
    }

    function draw() {
      drawSky(performance.now());
      /* シャンデリアの光（室内側の温かみ） */
      var g = ctx.createRadialGradient(W / 2, -30, 10, W / 2, -30, 320);
      g.addColorStop(0, "rgba(246,226,122,0.30)");
      g.addColorStop(1, "rgba(246,226,122,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      /* 落下物 */
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "30px serif";
      for (var i = 0; i < items.length; i++) {
        ctx.fillText(items[i].e, items[i].x, items[i].y);
      }
      /* フラッシュ */
      for (var f = flashes.length - 1; f >= 0; f--) {
        var fl = flashes[f];
        fl.r += 3;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.strokeStyle = fl.good ? "rgba(246,226,122,0.9)" : "rgba(255,110,110,0.9)";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (fl.r >= fl.max) flashes.splice(f, 1);
      }
      /* 盆 */
      ctx.save();
      ctx.shadowColor = "rgba(246,226,122,0.8)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#e9cf6e";
      roundRect(px - TRAY_W / 2, TRAY_Y, TRAY_W, TRAY_H, 9);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#8a6d1f";
      roundRect(px - TRAY_W / 2, TRAY_Y + TRAY_H - 6, TRAY_W, 6, 3);
      ctx.fill();
      ctx.restore();
      /* コンボ */
      if (combo >= 5) {
        ctx.fillStyle = "rgba(246,226,122,0.95)";
        ctx.font = "bold 16px serif";
        ctx.fillText(combo + "連続!", W - 58, 24);
      }
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function start() {
      state = "playing";
      px = W / 2; targetX = W / 2;
      items = []; flashes = [];
      score = 0; hearts = 3; combo = 0; maxCombo = 0;
      timeLeft = GAME_SEC; elapsed = 0; spawnAcc = 0; lastScore = -1;
      if (veil) veil.hidden = true;
      if (retryBtn) retryBtn.hidden = true;
      if (shareBtn) shareBtn.hidden = true;
      say("");
      hud();
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function finish() {
      state = "over";
      cancelAnimationFrame(raf);
      var rk = rankFor(score);
      lastRank = rk.r;
      var b = best();
      var isNew = score > b;
      if (isNew) { saveBest(score); b = score; }
      if (bestEl) bestEl.textContent = String(b);
      var p = dancePartner();
      var pname = p && NAMES[p] ? NAMES[p] : "";
      var text = score + "点・ランク" + rk.r + "（最大" + maxCombo + "連続）" + (isNew ? " ✦新記録！" : "");
      say(rk.msg + (score >= 150 ? " ご褒美に、6F客室で鍵の噂を聞いてみて。" : ""));
      if (veil) {
        veil.hidden = false;
        if (veilTitle) veilTitle.textContent = "結果発表 — " + score + "点";
        if (veilText) {
          veilText.textContent = "ランク" + rk.r + "・最大" + maxCombo + "連続" +
            (isNew ? " ✦新記録！" : "（ベスト" + b + "点）") +
            (pname ? " " + pname + "が拍手しています。" : "") +
            (score >= 150 ? " 6F客室で鍵の噂を聞いてみて。" : "");
        }
        if (startBtn) startBtn.textContent = "もう一度遊ぶ";
      }
      if (retryBtn) retryBtn.hidden = false;
      if (shareBtn) {
        shareBtn.hidden = false;
        shareBtn.onclick = function () {
          var t = "4Fゲームサロンでお菓子キャッチに挑戦！" + score + "点（ランク" + lastRank + "）でした" +
            (pname ? " " + pname + "が見守ってくれました" : "") + TAG;
          window.open("https://x.com/intent/post?text=" + encodeURIComponent(t) +
            "&url=" + encodeURIComponent(PAGE_URL), "_blank", "noopener,width=600,height=520");
        };
      }
    }

    /* 入力 */
    function toGameX(clientX) {
      var r = canvas.getBoundingClientRect();
      return (clientX - r.left) * (W / r.width);
    }
    canvas.addEventListener("pointerdown", function (e) {
      targetX = toGameX(e.clientX);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse" && e.buttons === 0 && state !== "playing") return;
      targetX = toGameX(e.clientX);
    });
    document.addEventListener("keydown", function (e) {
      if (state !== "playing") return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keyL = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keyR = true;
      if (["ArrowLeft", "ArrowRight", " "].indexOf(e.key) >= 0) e.preventDefault();
    });
    document.addEventListener("keyup", function (e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keyL = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keyR = false;
    });
    document.addEventListener("visibilitychange", function () {
      paused = document.hidden && state === "playing";
    });
    window.addEventListener("blur", function () { if (state === "playing") paused = true; });
    window.addEventListener("focus", function () { paused = false; });

    if (startBtn) startBtn.addEventListener("click", start);
    if (retryBtn) retryBtn.addEventListener("click", start);

    /* 待機画面の初期描画 */
    draw();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
