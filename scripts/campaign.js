/* ============================================================
   Campaign runtime — バー・トップページバナー・切替UI
   ------------------------------------------------------------
   - html[data-campaign] は campaign-boot.js が描画前に設定
   - ここでは文言の差し込み、スポットライト、切替UIを担当
   - 切り替えても localStorage の表示設定以外は変更しません
   ============================================================ */
(function () {
  "use strict";

  var KEY = "milli-campaign";
  var list = window.MILLI_CAMPAIGNS || [];
  var root = document.documentElement;
  var bar = document.getElementById("campaignBar");
  var barText = document.getElementById("campaignBarText");
  var spotlight = document.getElementById("campaignSpotlight");
  var live = null;

  function byId(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function autoId() {
    var now = Date.now();
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.enabled === false) continue;
      if (now >= Date.parse(c.start) && now < Date.parse(c.end)) return c.id;
    }
    return "normal";
  }

  function stored() {
    try { return localStorage.getItem(KEY) || "auto"; } catch (e) { return "auto"; }
  }

  function store(value) {
    try {
      if (value === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, value);
    } catch (e) {}
  }

  function setText(el, value) {
    if (el) el.textContent = value || "";
  }

  function renderBar(c) {
    if (!bar) return;
    if (!c) return;
    bar.setAttribute("href", c.bar.href || "/orbista/");
    if (barText) {
      var short = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
      barText.textContent = (short && c.bar.shortText) ? c.bar.shortText : c.bar.text;
    }
    bar.setAttribute("aria-label", c.bar.ariaLabel || ((c.label || "ORBISTA") + " 特設サイトへ"));
  }

  function renderSpotlight(c) {
    if (!spotlight) return;
    if (!c || !c.spotlight) {
      spotlight.hidden = true;
      return;
    }
    var s = c.spotlight;
    setText(spotlight.querySelector("[data-campaign-eyebrow]"), s.eyebrow);
    setText(spotlight.querySelector("[data-campaign-title]"), s.title);
    setText(spotlight.querySelector("[data-campaign-desc]"), s.desc);
    var link = spotlight.querySelector("[data-campaign-cta]");
    if (link) {
      link.setAttribute("href", s.href || "/orbista/");
      setText(link.querySelector("[data-campaign-cta-label]"), s.cta || "特設サイトへ");
    }
    spotlight.dataset.campaign = c.id;
    spotlight.hidden = false;
  }

  function activeId() {
    var id = root.dataset.campaign || "normal";
    return id === "normal" || byId(id) ? id : "normal";
  }

  function apply(pref) {
    var id;
    if (pref === "auto") id = autoId();
    else if (pref === "normal") id = "normal";
    else id = byId(pref) ? pref : autoId();

    store(pref);
    root.dataset.campaign = id;
    var c = byId(id);
    if (c) {
      renderBar(c);
      renderSpotlight(c);
    } else {
      if (bar) bar.setAttribute("href", "/orbista/");
      renderSpotlight(null);
    }
    sync();
    if (live) {
      live.textContent = c ? ("表示テーマ: " + c.label) : "表示テーマ: 通常";
    }
  }

  function sync() {
    if (!switcher) return;
    var pref = stored();
    var current = activeId();
    switcher.querySelectorAll('input[name="milli-campaign"]').forEach(function (input) {
      if (input.value === "auto") input.checked = pref === "auto" || !pref;
      else if (input.value === "normal") input.checked = pref === "normal" || (pref !== "auto" && current === "normal");
      else input.checked = pref === input.value;
    });
    var status = switcher.querySelector("[data-campaign-status]");
    var c = byId(current);
    if (status) status.textContent = c ? ("現在: " + c.label) : "現在: 通常";
  }

  /* ---------- 切替UI ---------- */
  var switcher = null;

  function buildSwitcher() {
    if (switcher || !list.length) return;
    switcher = document.createElement("div");
    switcher.className = "campaign-switcher";
    switcher.innerHTML =
      '<button type="button" class="campaign-switcher-toggle" aria-expanded="false" aria-controls="campaignSwitcherPanel" aria-label="季節テーマを切り替える">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6l2.2 6.2 6.6.3-5.2 4.1 1.8 6.4-5.4-3.8-5.4 3.8 1.8-6.4L3.2 9.1l6.6-.3z" fill="currentColor"/></svg>' +
        '<span>テーマ</span>' +
      '</button>' +
      '<section class="campaign-switcher-panel" id="campaignSwitcherPanel" hidden aria-label="季節テーマの切替">' +
        '<div class="campaign-switcher-head">' +
          '<div><p class="campaign-switcher-kicker">DISPLAY THEME</p><h2>季節テーマ</h2></div>' +
          '<button type="button" class="campaign-switcher-close" aria-label="閉じる">×</button>' +
        '</div>' +
        '<p class="campaign-switcher-note">表示だけを切り替えます。サイトのデータは変更されません。</p>' +
        '<div class="campaign-switcher-options">' +
          '<label><input type="radio" name="milli-campaign" value="auto"><span><b>自動</b><small>開催期間に合わせる</small></span></label>' +
          '<label><input type="radio" name="milli-campaign" value="normal"><span><b>通常</b><small>季節テーマをオフ</small></span></label>' +
          list.map(function (c) {
            return '<label><input type="radio" name="milli-campaign" value="' + c.id + '"><span><b>' + c.label + '</b><small>' + (c.enabled === false ? "プレビュー" : "開催期間中") + '</small></span></label>';
          }).join("") +
        '</div>' +
        '<p class="campaign-switcher-status" data-campaign-status aria-live="polite"></p>' +
        '<button type="button" class="campaign-switcher-reset">通常表示に戻す</button>' +
      '</section>';
    document.body.appendChild(switcher);

    live = document.createElement("p");
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);

    var toggle = switcher.querySelector(".campaign-switcher-toggle");
    var panel = switcher.querySelector(".campaign-switcher-panel");
    var close = switcher.querySelector(".campaign-switcher-close");
    var reset = switcher.querySelector(".campaign-switcher-reset");

    function open() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      var checked = panel.querySelector('input[name="milli-campaign"]:checked') || panel.querySelector('input[name="milli-campaign"]');
      if (checked) checked.focus();
    }
    function closePanel() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (panel.hidden) open(); else closePanel();
    });
    close.addEventListener("click", closePanel);
    reset.addEventListener("click", function () { apply("normal"); });
    panel.addEventListener("change", function (e) {
      if (e.target && e.target.name === "milli-campaign") apply(e.target.value);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) closePanel();
    });
    document.addEventListener("click", function (e) {
      if (panel.hidden) return;
      if (!switcher.contains(e.target)) {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function boot() {
    buildSwitcher();
    var current = byId(activeId());
    if (current) {
      renderBar(current);
      renderSpotlight(current);
    } else {
      renderSpotlight(null);
    }
    sync();
  }

  window.addEventListener("resize", function () {
    var current = byId(activeId());
    if (current) renderBar(current);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MilliCampaign = {
    list: list,
    active: activeId,
    auto: autoId,
    set: function (value) { apply(value); },
    reset: function () { apply("normal"); }
  };
})();
