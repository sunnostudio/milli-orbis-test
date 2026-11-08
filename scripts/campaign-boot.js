/* ============================================================
   Campaign boot — <head> で同期的に実行し、描画前にテーマを決定
   ------------------------------------------------------------
   キャンペーン属性を先に付けることで、
   キャンペーンバーの表示によるレイアウトシフトを防ぎます。
   ============================================================ */
(function () {
  "use strict";

  var KEY = "milli-campaign";
  var list = window.MILLI_CAMPAIGNS || [];
  var now = Date.now();
  var pref = null;

  function has(id) {
    return list.some(function (c) { return c.id === id; });
  }

  try {
    var q = new URLSearchParams(location.search).get("campaign");
    if (q) pref = q;
    else pref = localStorage.getItem(KEY);
  } catch (e) {}

  var active = null;

  if (pref === "normal") {
    active = "normal";
  } else if (pref && pref !== "auto" && has(pref)) {
    /* プレビュー / 強制表示。enabled:false のテーマも確認できます。 */
    active = pref;
  }

  if (!active) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.enabled === false) continue;
      if (now >= Date.parse(c.start) && now < Date.parse(c.end)) {
        active = c.id;
        break;
      }
    }
  }

  document.documentElement.dataset.campaign = active || "normal";
})();
