/* Spooky Masquerade — 招待状開封演出の進行管理＋合成SE
   状態: 0 封緘 → 1 割れ → 2 開封 → 3 取出し → 4 開き */
(function () {
  "use strict";

  var SOUND_KEY = "milli-event-spooky-sound";
  var GUEST_KEY = "milli-event-spooky-guest";
  var state = 0;
  var audioCtx = null;

  function $(id) { return document.getElementById(id); }
  function soundOn() {
    try { return localStorage.getItem(SOUND_KEY) !== "off"; }
    catch (e) { return true; }
  }
  function ac() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function noiseBuffer(ctx, sec) {
    var buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
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
      g.gain.exponentialRampToValueAtTime(gainV, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(t);
      src.stop(t + sec + 0.05);
    } catch (e) {}
  }
  function playTone(freq, sec, gainV, when, type) {
    if (!soundOn()) return;
    try {
      var ctx = ac();
      if (!ctx) return;
      var t = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gainV, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + sec + 0.05);
    } catch (e) {}
  }
  var seCrack = function () { playNoise(0.22, "highpass", 1800, 0.4); playTone(220, 0.12, 0.25, 0, "square"); };
  var seFlap = function () { playNoise(0.45, "bandpass", 900, 0.22); };
  var seSlide = function () { playNoise(0.6, "bandpass", 1400, 0.25); };
  var seOpen = function () {
    playNoise(0.5, "bandpass", 700, 0.28);
    playTone(140, 0.18, 0.2, 0.05, "triangle");
    playTone(880, 0.7, 0.18, 0.55);
    playTone(659.25, 0.9, 0.18, 0.83);
  };

  var HINTS = [
    "封蝋をタップして、封を切ってください",
    "封が切れました。フラップを開きます",
    "開封しました。招待状を取り出します",
    "二つ折りの招待状です。<b>タップして開いて</b>ください",
    "✦ 招待状を開きました ✦ ようこそ、ゲスト様"
  ];

  function render() {
    var env = $("inviteEnvelope"), card = $("inviteCard"), hint = $("inviteHint");
    if (!env || !card) return;
    env.classList.toggle("is-cracked", state >= 1);
    env.classList.toggle("is-open", state >= 2);
    env.classList.toggle("is-back", state >= 3);
    card.classList.toggle("is-out", state >= 3);
    card.classList.toggle("is-open", state >= 4);
    card.classList.toggle("is-openable", state === 3);
    if (hint) hint.innerHTML = HINTS[state];
    ["step1", "step2", "step3", "step4"].forEach(function (id, i) {
      var b = $(id);
      if (b) b.disabled = state !== i;
    });
    var auto = $("inviteAuto");
    if (auto) auto.disabled = state >= 4;
  }

  function go(n) {
    if (n <= state || n > 4) return;
    if (n === 1) seCrack();
    if (n === 2) seFlap();
    if (n === 3) seSlide();
    if (n === 4) seOpen();
    state = n;
    render();
  }
  function reset() {
    state = 0;
    render();
  }
  function autoPlay() {
    if (state >= 4) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var steps = [700, 1100, 1300, 1500];
    var i = state;
    (function next() {
      if (i >= 4) return;
      go(i + 1);
      i++;
      setTimeout(next, reduce ? 100 : steps[i]);
    })();
  }

  function initGuest() {
    var input = $("guestNameInput"), out = $("guestNameOut");
    if (!input || !out) return;
    var saved = null;
    try { saved = localStorage.getItem(GUEST_KEY); } catch (e) {}
    if (saved) { input.value = saved; out.textContent = saved; }
    input.addEventListener("input", function () {
      var v = input.value.trim() || "Guest";
      out.textContent = v.length > 14 ? v.slice(0, 14) : v;
      try { localStorage.setItem(GUEST_KEY, input.value); } catch (e) {}
    });
    /* 音声の自動再生制限：最初のタップでAudioContextを起こす */
    document.addEventListener("pointerdown", function warm() {
      try { ac(); } catch (e) {}
      document.removeEventListener("pointerdown", warm);
    });
  }

  function init() {
    if (!$("inviteEnvelope")) return;
    initGuest();
    render();
    var wax = $("inviteWax");
    if (wax) {
      var waxGo = function () {
        if (state === 0) go(1);
        else if (state === 1) go(2);
      };
      wax.addEventListener("click", waxGo);
      wax.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waxGo(); }
      });
    }
    var card = $("inviteCard");
    if (card) card.addEventListener("click", function () {
      if (state === 3) go(4);
    });
    [["step1", 1], ["step2", 2], ["step3", 3], ["step4", 4]].forEach(function (p) {
      var b = $(p[0]);
      if (b) b.addEventListener("click", function () { go(p[1]); });
    });
    var auto = $("inviteAuto"), rep = $("inviteReplay"), snd = $("inviteSound");
    if (auto) auto.addEventListener("click", autoPlay);
    if (rep) rep.addEventListener("click", reset);
    if (snd) {
      var sync = function () {
        var on = soundOn();
        snd.setAttribute("aria-pressed", on ? "true" : "false");
        snd.textContent = on ? "♪ ON" : "♪ OFF";
      };
      sync();
      snd.addEventListener("click", function () {
        try { localStorage.setItem(SOUND_KEY, soundOn() ? "off" : "on"); } catch (e) {}
        sync();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
