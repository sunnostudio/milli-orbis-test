/* Spooky Masquerade — エレベーター乗車体験（依存なし・素のJS）
   流れ:
     ホール「エレベーターに乗る」→ 扉が閉じる（乗車・かごの中）
     → 階ボタン → ランプが途中階を進み、かごがわずかに揺れる（移動）
     → 到着音 → 扉が開く（降車）。裏でページ遷移する。
   - かごの中（body.aboard）の間だけパネルが見える
   - is-locked（R階など）はシェイク＋トーストのみ
   - ホールの案内リンク（a[data-door-href]）は直通運転（閉→遷移→開）
   - prefers-reduced-motion では演出なし即時遷移
   - 音はすべて合成（到着音・階通過音・扉音）。♪トグルと連動
   共有キー: milli-event-spooky-sound / milli-event-spooky-last-floor /
             milli-event-spooky-door（遷移受け渡し・使い切り）/
             milli-event-spooky-aboard（乗車中フラグ） */
(function () {
  "use strict";

  var CLOSE_MS = 1400;
  var HOLD_MS = 300;
  var OPEN_MS = 1000;
  var STEP_TOTAL_MAX = 1800;
  var STEP_MIN = 120;
  var DOOR_KEY = "milli-event-spooky-door";
  var KEY_KEY = "milli-event-spooky-key";
  var ABOARD_KEY = "milli-event-spooky-aboard";
  var LAST_FLOOR_KEY = "milli-event-spooky-last-floor";
  var SOUND_KEY = "milli-event-spooky-sound";

  /* 下から上へ（移動方向の判定用） */
  var ORDER = ["G", "1", "2", "3", "4", "5", "6", "13"];
  var FLOOR_NAMES = {
    G: "正面玄関",
    1: "1F グランド・ロビー",
    2: "2F クローゼット",
    3: "3F ミリ・シアター",
    4: "4F ゲームサロン",
    5: "5F グランド・ボールルーム",
    6: "6F 客室",
    13: "13F 秘密のパーティ会場"
  };

  var audioCtx = null;
  var doorBusy = false;
  var travelBusy = false;
  var navigating = false;
  var summonBtn = null;
  var lampFloor = null;
  var lampArrow = null;
  var lampDir = "";

  function reducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function soundOn() {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch (e) {
      return true;
    }
  }

  function ac() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  /* 合成音の素振り */
  function tone(freq, sec, gainV, when, type) {
    if (!soundOn()) return;
    try {
      var ctx = ac();
      if (!ctx) return;
      var t = ctx.currentTime + (when || 0);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(gainV, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + sec + 0.05);
    } catch (e) { /* 鳴らなくても演出は続ける */ }
  }

  /* 到着音「ピン―ポン」 */
  function chime() {
    tone(880, 0.9, 0.22, 0);
    tone(659.25, 1.0, 0.22, 0.28);
  }

  /* 階通過の小さな音 */
  function blip() {
    tone(740, 0.09, 0.14, 0);
  }

  /* 扉が閉まりきる低い音 */
  function thud() {
    tone(120, 0.18, 0.2, 0, "triangle");
  }

  /* ---------- 実在感のための合成SE（ノイズ系） ---------- */
  function noiseBuffer(ctx, sec) {
    var buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * sec), ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function playNoise(sec, filterType, freq, gainV, when) {
    if (!soundOn()) return;
    try {
      var ctx = ac();
      if (!ctx) return;
      var t = ctx.currentTime + (when || 0);
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, sec);
      var f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gainV, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t);
      src.stop(t + sec + 0.05);
    } catch (e) {}
  }
  /* 金属扉のスライド音（開閉の最初に鳴らす） */
  function doorSlide() {
    playNoise(0.9, "bandpass", 520, 0.22, 0);
    playNoise(1.1, "lowpass", 300, 0.18, 0.05);
    tone(68, 0.7, 0.1, 0, "triangle");
  }
  /* ボタンのカチッという押下音 */
  function buttonClick() {
    playNoise(0.06, "highpass", 2500, 0.3, 0);
    tone(1560, 0.06, 0.12, 0, "square");
  }
  /* かごのモーター唸り（移動時間だけ鳴らす） */
  function motorHum(sec) {
    if (!soundOn()) return;
    try {
      var ctx = ac();
      if (!ctx) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(52, t);
      o.frequency.linearRampToValueAtTime(58, t + sec * 0.3);
      o.frequency.linearRampToValueAtTime(50, t + sec);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.25);
      g.gain.setValueAtTime(0.07, t + Math.max(0.25, sec - 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + sec + 0.05);
    } catch (e) {}
  }
  /* ランプの移動中表示ON/OFF */
  function startLampMoving() {
    var lamp = document.getElementById("doorLamp");
    if (lamp) lamp.classList.add("is-moving");
  }
  function stopLampMoving() {
    var lamp = document.getElementById("doorLamp");
    if (lamp) lamp.classList.remove("is-moving");
  }
  /* ボタンの沈み込みを一瞬見せる */
  function pressFlash(btn) {
    if (!btn) return;
    btn.classList.add("is-pressed");
    setTimeout(function () { btn.classList.remove("is-pressed"); }, 260);
  }

  function toast(msg) {
    var el = document.getElementById("spookyToast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  function currentFloor() {
    return (document.body && document.body.dataset.doorFloor) || "G";
  }

  /* 鍵所持フラグ（Phase BでFirebaseと同期。ここでは端末ミラーを読む） */
  function hasKey() {
    try { return localStorage.getItem(KEY_KEY) === "1"; } catch (e) { return false; }
  }

  function aboard() {
    return document.body.classList.contains("aboard");
  }

  function setAboard(on) {
    document.body.classList.toggle("aboard", !!on);
    try { sessionStorage.setItem(ABOARD_KEY, on ? "1" : "0"); } catch (e) {}
    if (summonBtn) summonBtn.setAttribute("aria-expanded", on ? "true" : "false");
  }

  function setLamp(floor, dir) {
    if (dir !== undefined) lampDir = dir;
    if (lampFloor) lampFloor.textContent = floor;
    if (lampArrow) lampArrow.textContent = lampDir;
  }

  /* 表示窓・ボタン・部屋ハイライトのすべてを更新（到着・乗車時） */
  function setCurrent(floor) {
    var indicator = document.getElementById("spookyFloorNow");
    var box = document.getElementById("spookyIndicator");
    if (indicator) indicator.textContent = floor;
    if (box) {
      box.classList.remove("is-moving");
      void box.offsetWidth;
      box.classList.add("is-moving");
    }
    document.querySelectorAll(".spooky-floor-btn").forEach(function (b) {
      var on = b.dataset.floor === String(floor);
      b.classList.toggle("is-current", on);
      if (on) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    document.querySelectorAll(".spooky-floor").forEach(function (s) {
      s.classList.toggle("is-active", s.dataset.floor === String(floor));
    });
    setLamp(floor, lampDir);
    try { localStorage.setItem(LAST_FLOOR_KEY, String(floor)); } catch (e) {}
  }

  /* 移動中：位置表示だけ進める（押したボタンは点灯のまま） */
  function setPosition(floor) {
    var indicator = document.getElementById("spookyFloorNow");
    if (indicator) {
      indicator.textContent = floor;
      indicator.classList.remove("tick");
      void indicator.offsetWidth;
      indicator.classList.add("tick");
    }
    if (lampFloor) {
      lampFloor.textContent = floor;
      lampFloor.classList.remove("tick");
      void lampFloor.offsetWidth;
      lampFloor.classList.add("tick");
    }
  }

  function shakePanel() {
    var panel = document.getElementById("spookyElevator");
    if (!panel) return;
    panel.classList.remove("shake");
    void panel.offsetWidth;
    panel.classList.add("shake");
  }

  /* ---------- 乗車 ---------- */
  function board() {
    if (aboard() || doorBusy || travelBusy || navigating) return;
    var cur = currentFloor();
    setLamp(cur, "");
    if (reducedMotion()) {
      try { document.documentElement.classList.remove("is-shut"); } catch (e) {}
      setAboard(true);
      setCurrent(cur);
      toast("―― 乗車しました ―― 行き先の階をどうぞ");
      return;
    }
    doorBusy = true;
    doorSlide();
    document.body.classList.add("door-closing");
    setTimeout(thud, Math.max(0, CLOSE_MS - 250));
    setTimeout(function () {
      document.body.classList.remove("door-closing");
      /* 扉は閉じたまま維持（is-shutで固定）。パネルはその前面に出る */
      try { document.documentElement.classList.add("is-shut"); } catch (e) {}
      setAboard(true);
      setCurrent(cur);
      setLamp(cur, "");
      toast("―― 扉が閉まりました ―― 行き先の階をどうぞ");
      doorBusy = false;
    }, CLOSE_MS);
  }

  /* ---------- 移動 ---------- */
  function travel(floor, href) {
    if (travelBusy || navigating || doorBusy) return;
    var cur = currentFloor();
    /* 今いる階＝そのまま開扉（ドア開ボタン相当） */
    if (floor === cur) {
      alight({ quiet: true });
      return;
    }
    travelBusy = true;
    /* 移動中は扉を閉じたまま固定する */
    try { document.documentElement.classList.add("is-shut"); } catch (e) {}
    document.body.classList.add("car-moving");
    /* 発車のドスンという沈み（直後に揺れへ移る） */
    document.body.classList.add("car-settle");
    setTimeout(function () { document.body.classList.remove("car-settle"); }, 550);
    startLampMoving();
    buttonClick();
    /* 押したボタンを点灯させたままにする */
    document.querySelectorAll(".spooky-floor-btn").forEach(function (b) {
      var on = b.dataset.floor === String(floor);
      b.classList.toggle("is-current", on);
      if (on) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    try { localStorage.setItem(LAST_FLOOR_KEY, String(floor)); } catch (e) {}
    var dir = ORDER.indexOf(floor) > ORDER.indexOf(cur) ? "▲" : "▼";
    setLamp(cur, dir);
    /* 途中階の列挙 */
    var path = [];
    (function () {
      var a = ORDER.indexOf(cur), b = ORDER.indexOf(floor);
      if (a < 0 || b < 0) return;
      var step = a < b ? 1 : -1;
      for (var i = a + step; ; i += step) {
        path.push(ORDER[i]);
        if (i === b) break;
      }
    })();
    if (reducedMotion() || path.length === 0) {
      finishTravel(floor, href);
      return;
    }
    var per = Math.max(STEP_MIN, Math.floor(Math.min(STEP_TOTAL_MAX, 420 * path.length) / path.length));
    motorHum((per * path.length + 200) / 1000);
    var i = 0;
    (function next() {
      if (i >= path.length) {
        setTimeout(function () { finishTravel(floor, href); }, 200);
        return;
      }
      setPosition(path[i]);
      blip();
      i++;
      setTimeout(next, per);
    })();
  }

  function finishTravel(floor, href) {
    document.body.classList.remove("car-moving");
    stopLampMoving();
    /* 到着のドスンという沈み */
    document.body.classList.add("car-settle");
    setTimeout(function () { document.body.classList.remove("car-settle"); }, 550);
    chime();
    if (!samePage(href)) {
      /* 別フロア：閉ドアの裏で遷移 */
      navigating = true;
      travelBusy = false;
      try {
        sessionStorage.setItem(DOOR_KEY, String(floor));
        sessionStorage.setItem(ABOARD_KEY, "1");
      } catch (e) {}
      setTimeout(function () { window.location.href = href; }, HOLD_MS);
      return;
    }
    travelBusy = false;
    setCurrent(floor);
    alight({ quiet: false });
  }

  /* ---------- 降車（開扉） ---------- */
  function alight(opts) {
    opts = opts || {};
    if (navigating) return;
    travelBusy = false;
    document.body.classList.remove("car-moving");
    stopLampMoving();
    document.body.classList.remove("door-closing");
    var floor = currentFloor();
    if (reducedMotion()) {
      try { document.documentElement.classList.remove("is-shut"); } catch (e) {}
      setAboard(false);
      if (!opts.quiet) toast("✦ " + (FLOOR_NAMES[floor] || floor) + " に到着 ✦");
      return;
    }
    /* パネルを先に格納し、閉じた扉のまま1フレーム置いてから開く */
    setAboard(false);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try { document.documentElement.classList.remove("is-shut"); } catch (e) {}
        document.body.classList.add("door-opening");
        doorSlide();
        if (!opts.quiet) {
          setTimeout(chime, 150);
          setTimeout(function () {
            toast("✦ " + (FLOOR_NAMES[floor] || floor) + " に到着 ✦");
          }, 400);
        }
        setTimeout(function () {
          document.body.classList.remove("door-opening");
        }, OPEN_MS + 100);
      });
    });
  }

  /* ホールの案内リンク用：直通運転（閉→遷移→開） */
  function departExpress(floor, href) {
    if (navigating || doorBusy || travelBusy || aboard()) return;
    navigating = true;
    buttonClick();
    setTimeout(chime, 200);
    if (reducedMotion()) {
      try { sessionStorage.removeItem(DOOR_KEY); } catch (e) {}
      window.location.href = href;
      return;
    }
    try {
      sessionStorage.setItem(DOOR_KEY, String(floor));
      sessionStorage.setItem(ABOARD_KEY, "0");
    } catch (e) {}
    doorSlide();
    document.body.classList.add("door-closing");
    setTimeout(function () { window.location.href = href; }, CLOSE_MS + HOLD_MS);
  }

  function arrive() {
    var pending = null;
    try { pending = sessionStorage.getItem(DOOR_KEY); } catch (e) {}
    try { sessionStorage.removeItem(DOOR_KEY); } catch (e) {}
    if (!pending) {
      /* 直リンク・リロード時：ホール状態に正規化（ドアは既定で開いている） */
      document.documentElement.classList.remove("is-shut");
      document.body.classList.remove("door-opening", "door-closing", "car-moving", "car-settle");
      stopLampMoving();
      setAboard(false);
      return;
    }
    var floor = (document.body && document.body.dataset.doorFloor) || pending;
    setCurrent(floor);
    setLamp(floor, "");
    if (reducedMotion()) {
      document.documentElement.classList.remove("is-shut");
      setAboard(false);
      toast("✦ " + (FLOOR_NAMES[floor] || floor) + " に到着 ✦");
      return;
    }
    /* 閉ドアの裏で乗車状態にしておき、開扉と同時に降車へ */
    setAboard(true);
    stopLampMoving();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove("is-shut");
        setAboard(false);
        document.body.classList.add("door-opening");
        doorSlide();
        /* 到着音は自動再生制限で鳴らない場合がある。鳴らなくても演出は続く */
        setTimeout(chime, 250);
        setTimeout(function () {
          toast("✦ " + (FLOOR_NAMES[floor] || floor) + " に到着 ✦");
        }, 400);
        setTimeout(function () {
          document.body.classList.remove("door-opening");
        }, OPEN_MS + 100);
      });
    });
  }

  function samePage(href) {
    try {
      var cur = new URL(window.location.href);
      var next = new URL(href, window.location.href);
      return cur.pathname === next.pathname;
    } catch (e) {
      return false;
    }
  }

  /* ---------- かご設備の注入（HTML側の編集なし） ---------- */
  function initCar() {
    var panel = document.getElementById("spookyElevator");
    var door = document.getElementById("spookyDoor");
    /* ドア上の階数ランプ＋方向矢印 */
    if (door && !document.getElementById("doorLamp")) {
      var lamp = document.createElement("div");
      lamp.className = "door-lamp";
      lamp.id = "doorLamp";
      lamp.setAttribute("aria-hidden", "true");
      var f = document.createElement("span");
      f.className = "lamp-floor en";
      f.textContent = currentFloor();
      var a = document.createElement("span");
      a.className = "lamp-arrow en";
      a.textContent = "";
      lamp.appendChild(f);
      lamp.appendChild(a);
      door.appendChild(lamp);
      lampFloor = f;
      lampArrow = a;
    }
    if (panel) {
      /* パネル内の閉じる（＝開扉）ボタン */
      if (!panel.querySelector(".elevator-close")) {
        var x = document.createElement("button");
        x.type = "button";
        x.className = "elevator-close";
        x.setAttribute("aria-label", "扉を開けて降りる");
        x.textContent = "×";
        x.addEventListener("click", function () {
          if (aboard() && !travelBusy && !doorBusy && !navigating) alight({ quiet: true });
        });
        panel.insertBefore(x, panel.firstChild);
      }
      /* かご内の小さな案内 */
      if (!panel.querySelector(".car-hint")) {
        var hint = document.createElement("p");
        hint.className = "car-hint";
        hint.textContent = "降りるときは今の階を";
        var btns = panel.querySelector(".spooky-floor-rows");
        if (btns) panel.insertBefore(hint, btns);
        else panel.appendChild(hint);
      }
      /* 13Fは鍵所持時だけ出現する（存在しない階） */
      if (hasKey() && !panel.querySelector('[data-floor="13"]')) {
        var rowsBox = panel.querySelector(".spooky-floor-rows");
        if (rowsBox) {
          var row13 = document.createElement("div");
          row13.className = "spooky-floor-row";
          var b13 = document.createElement("button");
          b13.type = "button";
          b13.className = "spooky-floor-btn";
          b13.setAttribute("data-floor", "13");
          b13.setAttribute("data-href", "floor-13.html");
          b13.setAttribute("aria-label", "13階 秘密のパーティ会場へ移動");
          var f13 = document.createElement("span");
          f13.className = "f";
          f13.textContent = "13";
          var s13 = document.createElement("small");
          s13.textContent = "秘密";
          b13.appendChild(f13);
          b13.appendChild(s13);
          var p13 = document.createElement("span");
          p13.className = "spooky-plate";
          p13.textContent = "秘密のパーティ";
          var ps13 = document.createElement("small");
          ps13.textContent = "招待客専用";
          p13.appendChild(ps13);
          row13.appendChild(b13);
          row13.appendChild(p13);
          rowsBox.insertBefore(row13, rowsBox.firstChild);
        }
      }
    }
    /* 左端の縦書きタブ */
    if (!document.querySelector(".elevator-summon")) {
      summonBtn = document.createElement("button");
      summonBtn.type = "button";
      summonBtn.className = "elevator-summon";
      summonBtn.setAttribute("aria-expanded", "false");
      summonBtn.setAttribute("aria-controls", "spookyElevator");
      summonBtn.textContent = "エレベーターに乗る";
      summonBtn.addEventListener("click", board);
      document.body.appendChild(summonBtn);
    } else {
      summonBtn = document.querySelector(".elevator-summon");
      summonBtn.addEventListener("click", board);
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && aboard() && !travelBusy && !doorBusy && !navigating) {
        alight({ quiet: true });
      }
    });
  }

  function onClick(e) {
    /* 修飾キー・中ボタン・右クリックはブラウザ標準に任せる */
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== undefined && e.button !== 0) return;
    var t = e.target && e.target.closest
      ? e.target.closest(".elevator-summon, .spooky-floor-btn[data-href], a[data-door-href]")
      : null;
    if (!t) return;
    if (t.classList.contains("elevator-summon")) {
      e.preventDefault();
      board();
      return;
    }

    var href = t.getAttribute("data-href") || t.getAttribute("href");
    var floor = t.dataset.floor || t.getAttribute("data-door-floor") || currentFloor();
    if (!href) return;

    /* 宿泊客専用（7〜12F）は遷移しない */
    if (t.classList.contains("is-locked")) {
      e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      shakePanel();
      toast("―― " + floor + "階は宿泊客専用です ――");
      return;
    }

    e.preventDefault();
    /* 既存 elevator 制御の scrollIntoView と二重発火させない */
    if (e.stopPropagation) e.stopPropagation();
    if (t.classList.contains("spooky-floor-btn")) {
      if (!aboard() || travelBusy || doorBusy || navigating) return;
      pressFlash(t);
      travel(floor, href);
    } else {
      departExpress(floor, href);
    }
  }

  function init() {
    /* capture で先に拾い、既存パネルの同一ページ遷移と競合させない */
    document.addEventListener("click", onClick, true);
    initCar();
    arrive();
    /* bfcache復帰（戻る/進む）で止まった演出クラスが残らないよう正規化 */
    window.addEventListener("pageshow", function () {
      doorBusy = false;
      travelBusy = false;
      navigating = false;
      arrive();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
