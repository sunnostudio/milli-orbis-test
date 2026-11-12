/* ============================================================
   Campaign runtime — バー・トップページバナー
   ------------------------------------------------------------
   - html[data-campaign] は campaign-boot.js が描画前に設定
   - ここでは文言の差し込みとスポットライトの表示を担当
   - ユーザーによるテーマ切替は行いません
   ============================================================ */
(function () {
  "use strict";

  var list = window.MILLI_CAMPAIGNS || [];
  var root = document.documentElement;
  var bar = document.getElementById("campaignBar");
  var barText = document.getElementById("campaignBarText");
  var spotlight = document.getElementById("campaignSpotlight");

  function byId(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function activeId() {
    var id = root.dataset.campaign || "normal";
    return id === "normal" || byId(id) ? id : "normal";
  }

  function setText(el, value) {
    if (el) el.textContent = value || "";
  }

  function renderBar(c) {
    if (!bar || !c || !c.bar) return;
    bar.setAttribute("href", c.bar.href || "/orbista/");
    if (barText) {
      var short = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
      barText.textContent = (short && c.bar.shortText) ? c.bar.shortText : (c.bar.text || "");
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

  function render() {
    var c = byId(activeId());
    if (c) {
      renderBar(c);
      renderSpotlight(c);
    } else {
      renderSpotlight(null);
    }
  }

  window.addEventListener("resize", function () {
    var c = byId(activeId());
    if (c) renderBar(c);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();

  window.MilliCampaign = {
    list: list,
    active: activeId
  };
})();
