/* ============================================================
   Campaign boot — <head> で同期的に実行し、テーマを決定
   ------------------------------------------------------------
   - 開催期間内の最初の有効なキャンペーンを自動選択
   - ユーザーによる手動切替は行わない
     （localStorage / URL パラメータによる上書きなし）
   - キャンペーン属性を先に付けることで、
     キャンペーンバーの表示によるレイアウトシフトを防ぎます。
   ============================================================ */
(function () {
  "use strict";

  var list = window.MILLI_CAMPAIGNS || [];
  var now = Date.now();
  var active = "normal";

  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (!c || !c.id || c.enabled === false) continue;
    var start = Date.parse(c.start);
    var end = Date.parse(c.end);
    if (isNaN(start) || isNaN(end)) continue;
    if (now >= start && now < end) {
      active = c.id;
      break;
    }
  }

  document.documentElement.dataset.campaign = active;
})();
