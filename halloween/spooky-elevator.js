/* Spooky Masquerade — エレベーター制御（依存なし・素のJS）
   - 到着音は外部素材なしで WebAudio 合成（エレベーターの「ピン」）
   - 音はユーザー操作後にのみ鳴らす（自動再生制限対策）
   - 進行は localStorage milli-event-spooky-* に保存できるよう土台だけ用意 */
(function () {
  "use strict";
  var PANEL_ID = "spookyElevator";
  var INDICATOR_FLOOR_ID = "spookyFloorNow";
  var INDICATOR_ID = "spookyIndicator";
  var TOAST_ID = "spookyToast";
  var SOUND_KEY = "milli-event-spooky-sound";
  var LAST_FLOOR_KEY = "milli-event-spooky-last-floor";

  var FLOOR_LABEL = { "13": "13", "6": "6", "5": "5", "4": "4", "3": "3", "2": "2", "1": "1", G: "G" };

  var audioCtx = null;
  function soundEnabled() {
    try { return localStorage.getItem(SOUND_KEY) !== "off"; }
    catch (e) { return true; }
  }
  function setSoundEnabled(on) {
    try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch (e) {}
  }

  /* エレベーターの到着音「ピン―ポン」を合成（880Hz→659Hz、正弦波＋減衰） */
  function chime() {
    if (!soundEnabled()) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var t0 = audioCtx.currentTime;
      [{ f: 880, t: 0 }, { f: 659.25, t: 0.28 }].forEach(function (n) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.f, t0 + n.t);
        gain.gain.setValueAtTime(0.0001, t0 + n.t);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.t + 0.9);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t0 + n.t);
        osc.stop(t0 + n.t + 1);
      });
    } catch (e) { /* 音が出なくても遷移は続ける */ }
  }

  function toast(msg) {
    var el = document.getElementById(TOAST_ID);
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  function setIndicator(floor) {
    var f = document.getElementById(INDICATOR_FLOOR_ID);
    var box = document.getElementById(INDICATOR_ID);
    if (f) f.textContent = FLOOR_LABEL[floor] || floor;
    if (box) {
      box.classList.remove("is-moving");
      void box.offsetWidth;
      box.classList.add("is-moving");
    }
    document.querySelectorAll(".spooky-floor-btn").forEach(function (b) {
      b.classList.toggle("is-current", b.dataset.floor === String(floor));
      if (b.dataset.floor === String(floor)) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    document.querySelectorAll(".spooky-floor").forEach(function (s) {
      s.classList.toggle("is-active", s.dataset.floor === String(floor));
    });
    try { localStorage.setItem(LAST_FLOOR_KEY, String(floor)); } catch (e) {}
  }

  function goToFloor(floor) {
    var target = document.querySelector('[data-floor-section="' + floor + '"]');
    if (!target) return;
    chime();
    setIndicator(floor);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    var names = { G: "正面玄関", 1: "1F グランド・ロビー", 2: "2F クローゼット", 3: "3F ミリ・シアター", 4: "4F ゲームサロン", 5: "5F グランド・ボールルーム", 6: "6F 客室", 13: "13F 秘密のパーティ会場" };
    toast("✦ " + (names[floor] || floor) + " に到着 ✦");
  }

  function init() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    // 音トグル初期化
    var snd = document.getElementById("spookySoundToggle");
    if (snd) {
      var on = soundEnabled();
      snd.setAttribute("aria-pressed", on ? "true" : "false");
      snd.textContent = on ? "♪ ON" : "♪ OFF";
      snd.addEventListener("click", function () {
        var next = !soundEnabled();
        setSoundEnabled(next);
        snd.setAttribute("aria-pressed", next ? "true" : "false");
        snd.textContent = next ? "♪ ON" : "♪ OFF";
        if (next) chime();
      });
    }

    // ボタン押下
    panel.addEventListener("click", function (e) {
      var btn = e.target.closest(".spooky-floor-btn");
      if (!btn) return;
      if (btn.classList.contains("is-locked")) {
        toast("―― " + btn.dataset.floor + "階は宿泊客専用です ――");
        return;
      }
      goToFloor(btn.dataset.floor);
    });

    // スクロール連動：今見ているフロアを点灯
    var sections = Array.prototype.slice.call(document.querySelectorAll("[data-floor-section]"));
    if ("IntersectionObserver" in window && sections.length) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) setIndicator(en.target.dataset.floorSection);
        });
      }, { rootMargin: "-40% 0px -50% 0px" });
      sections.forEach(function (s) { obs.observe(s); });
    }

    // 前回の階を復元（表示だけ・自動スクロールはしない）
    try {
      var last = localStorage.getItem(LAST_FLOOR_KEY);
      if (last && FLOOR_LABEL[last]) setIndicator(last);
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
