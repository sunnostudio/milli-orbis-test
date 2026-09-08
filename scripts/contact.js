/* ============================================
   ContactHub: お問い合わせ集結ハブ送信基盤
   - 2系統 (service/millidex) を共有 Firebase の contactQueue へ push
   - 未ログイン可 + honeypot + 1分1件制限。仕様は docs/contact-hub.md
   - モーダルUIは acct-overlay/acct-box 意匠を流用し本JS内で生成
   ============================================ */
(function () {
  "use strict";

  var QUEUE = "contactQueue";
  var RATE_KEY = "milli-contact-last";
  var RATE_MS = 60000;
  var TARGETS = ["orbis", "unishare", "games", "other", "map", "goods"];
  var TARGET_LABEL = { orbis: "Milli Orbis", unishare: "Milli Unishare", games: "Milli Games", other: "その他", map: "有志マップ", goods: "過去グッズ申請" };
  var PREFS = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function trimStr(s, n) { s = String(s == null ? "" : s).trim(); return s.length > n ? s.slice(0, n) : s; }
  function getUid() {
    try { if (typeof getMilliproUid === "function") { var u = getMilliproUid(); if (u) return u; } } catch (e) {}
    try {
      var ud = JSON.parse(localStorage.getItem("millipro_userdata") || "null");
      if (ud && ud.playerId) return "pid:" + ud.playerId;
    } catch (e) {}
    return null;
  }
  function db() {
    try {
      if (typeof initFirebase === "function") initFirebase();
      if (typeof firebase === "undefined" || !firebase.apps || !firebase.apps.length) return null;
      return firebase.database();
    } catch (e) { return null; }
  }
  function rateBlocked() {
    try {
      var last = parseInt(localStorage.getItem(RATE_KEY) || "0", 10);
      return Date.now() - last < RATE_MS;
    } catch (e) { return false; }
  }
  function markSent() { try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch (e) {} }

  /* 送信本体。成功時 {ok:true}、失敗時 {ok:false, error} を返す */
  function pushContact(entry, target, d) {
    d = d || {};
    if (d.company) return Promise.resolve({ ok: false, error: "spam" });
    if (entry !== "service" && entry !== "millidex") return Promise.resolve({ ok: false, error: "entry" });
    if (TARGETS.indexOf(target) === -1) return Promise.resolve({ ok: false, error: "target" });
    var body = trimStr(d.body, 2000);
    if (!body) return Promise.resolve({ ok: false, error: "empty" });
    if (rateBlocked()) return Promise.resolve({ ok: false, error: "rate" });
    var fields = {};
    ["shop", "pref", "date", "item", "member", "url", "image", "price", "period"].forEach(function (k) {
      if (d[k] != null && String(d[k]).trim() !== "") fields[k] = trimStr(d[k], 200);
    });
    if (target === "map" && (!fields.shop || !fields.pref || !fields.item)) {
      return Promise.resolve({ ok: false, error: "required" });
    }
    if (target === "goods" && !fields.item) return Promise.resolve({ ok: false, error: "required" });
    var database = db();
    if (!database) return Promise.resolve({ ok: false, error: "unavailable" });
    var rec = {
      entry: entry, target: target,
      serviceNote: trimStr(d.serviceNote, 100) || null,
      subject: trimStr(d.subject, 100) || null,
      body: body, fields: fields,
      contact: trimStr(d.contact, 200) || null,
      uid: getUid(), status: "pending", createdAt: Date.now(),
    };
    try { rec.ua = String(navigator.userAgent || "").slice(0, 120); } catch (e) {}
    return database.ref(QUEUE).push(rec).then(function () {
      markSent();
      return { ok: true };
    }).catch(function () {
      return { ok: false, error: "db" };
    });
  }

  var ERR_MSG = {
    spam: "送信できませんでした。",
    entry: "種別エラーです。開き直してお試しください。",
    target: "選択エラーです。開き直してお試しください。",
    empty: "本文を入力してください。",
    rate: "連続投稿は1分ほど空けてください。",
    required: "必須項目を入力してください。",
    unavailable: "送信基盤に接続できませんでした。時間をおいてお試しください。",
    db: "送信できませんでした（権限または通信）。時間をおいてお試しください。",
  };

  /* ---------- モーダルUI ---------- */
  var overlay = null, boxBody = null, current = null;

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "contactModal";
    overlay.className = "acct-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<div class="acct-box" role="dialog" aria-modal="true" style="max-width:520px">'
      + '<button type="button" class="acct-close" data-contact-close aria-label="閉じる">×</button>'
      + '<div id="contactBoxBody" style="padding:0 22px 18px;overflow-y:auto;max-height:80vh"></div></div>';
    document.body.appendChild(overlay);
    boxBody = overlay.querySelector("#contactBoxBody");
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest("[data-contact-close]")) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  function open() { ensureOverlay(); overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false"); }
  function close() { if (overlay) { overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true"); } }

  function pillRow(name, opts, sel) {
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0" data-pills="' + name + '">'
      + opts.map(function (o) {
        return '<button type="button" class="cd-style-btn' + (o.v === sel ? " on" : "") + '" data-val="' + o.v + '" style="flex:1;min-width:100px">'
          + esc(o.t) + "</button>";
      }).join("") + "</div>";
  }
  function field(label, inner, hint) {
    return '<label style="display:block;margin:10px 0 2px;font-weight:800;font-size:.82rem">' + label + "</label>" + inner
      + (hint ? '<p class="acct-hint" style="margin:2px 0 0">' + hint + "</p>" : "");
  }
  function input(name, ph, val, type) {
    return '<input data-f="' + name + '" type="' + (type || "text") + '" placeholder="' + esc(ph || "") + '" value="' + esc(val || "") + '" style="width:100%;box-sizing:border-box">';
  }
  function textarea(name, ph, rows) {
    return '<textarea data-f="' + name + '" placeholder="' + esc(ph || "") + '" rows="' + (rows || 4) + '" style="width:100%;box-sizing:border-box"></textarea>';
  }
  function memberOptions() {
    var ms = (typeof MEMBERS !== "undefined" && MEMBERS.length) ? MEMBERS : (window.MEMBERS || []);
    return '<option value="">選択なし</option>' + ms.map(function (m) {
      return '<option value="' + esc(m.id) + '">' + esc(m.name || m.id) + "</option>";
    }).join("");
  }
  function collect() {
    var o = {};
    boxBody.querySelectorAll("[data-f]").forEach(function (el) { o[el.getAttribute("data-f")] = el.value; });
    var hp = boxBody.querySelector('[data-f="company"]');
    o.company = hp ? hp.value : "";
    return o;
  }
  function showMsg(kind, text) {
    var el = boxBody.querySelector("[data-contact-msg]");
    if (el) { el.textContent = text; el.style.color = kind === "err" ? "#c0392b" : "var(--accent-deep)"; }
  }

  function renderService(sel) {
    sel = sel || "orbis";
    var svcs = [{ v: "orbis", t: "Milli Orbis" }, { v: "unishare", t: "Milli Unishare" }, { v: "games", t: "Milli Games" }, { v: "other", t: "その他" }];
    boxBody.innerHTML = '<h3 style="margin:0 0 4px">お問い合わせ <span style="font-size:.72rem;color:var(--muted)">全サービス共通窓口</span></h3>'
      + '<p class="acct-hint">まず対象サービスを選んでください。内容は運営が確認します（返信が必要な場合は連絡先へ）。</p>'
      + pillRow("target", svcs, sel)
      + '<div data-area="serviceNote" style="display:' + (sel === "other" ? "" : "none") + '">'
      + field("サイト名・サービス名", input("serviceNote", "例：○○（URLがあれば本文へ）")) + "</div>"
      + field("件名（任意）", input("subject", "例：誤字の報告"))
      + field("本文（必須）", textarea("body", "お問い合わせ内容を記入してください", 5))
      + field("連絡先（任意・X IDやメール）", input("contact", "返信が必要な場合のみ"))
      + '<input data-f="company" type="text" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;top:0" aria-hidden="true">'
      + '<p class="acct-msg" data-contact-msg></p>'
      + '<button type="button" class="btn" data-contact-send style="width:100%;justify-content:center">送信する</button>';
    wirePills("target", function (v) { renderService(v); });
    wireSend("service", function () { return { target: current.target }; });
  }

  function renderMillidex(sel) {
    sel = sel || "map";
    boxBody.innerHTML = '<h3 style="margin:0 0 4px">MilliDexへのお問い合わせ</h3>'
      + '<p class="acct-hint">有志マップの目撃情報・過去グッズの追加依頼はこちら。運営が確認後にサイトへ反映します。</p>'
      + pillRow("target", [{ v: "map", t: "有志マップ" }, { v: "goods", t: "過去グッズ申請" }], sel)
      + '<div data-area="form"></div>'
      + '<input data-f="company" type="text" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;top:0" aria-hidden="true">'
      + '<p class="acct-msg" data-contact-msg></p>'
      + '<button type="button" class="btn" data-contact-send style="width:100%;justify-content:center">送信する</button>';
    wirePills("target", function (v) { renderMillidex(v); });
    renderMillidexFields(sel);
    wireSend("millidex", function () { return { target: current.target }; });
  }

  function renderMillidexFields(sel) {
    var area = boxBody.querySelector('[data-area="form"]');
    if (!area) return;
    if (sel === "map") {
      area.innerHTML = field("店舗名（必須）", input("shop", "例：アニメイト池袋本店"))
        + field("都道府県（必須）", '<select data-f="pref" style="width:100%;box-sizing:border-box"><option value="">選択してください</option>'
          + PREFS.map(function (p) { return '<option value="' + p + '">' + p + "</option>"; }).join("") + "</select>")
        + field("目撃日（任意）", input("date", "例：2026-09-06", "", "date"))
        + field("グッズ名（必須）", input("item", "例：レトロポップver. 缶バッジ"))
        + field("タレント（任意）", '<select data-f="member" style="width:100%;box-sizing:border-box">' + memberOptions() + "</select>")
        + field("補足・コメント", textarea("body", "在庫状況・売場の場所など", 3))
        + field("連絡先（任意）", input("contact", "X IDやメール（返信が必要な場合のみ）"));
    } else {
      area.innerHTML = field("グッズ名（必須）", input("item", "例：○○記念グッズ アクリルスタンド"))
        + field("公式商品URL（任意）", input("url", "https://…", "", "url"))
        + field("画像URL（任意）", input("image", "https://…", "", "url"))
        + field("金額（任意）", input("price", "例：1800", "", "number"))
        + field("販売時期（任意）", input("period", "例：2025年8月〜9月"))
        + field("補足", textarea("body", "販売場所・受注期間など分かる範囲で", 3))
        + field("連絡先（任意）", input("contact", "X IDやメール（返信が必要な場合のみ）"));
    }
  }

  function wirePills(name, onPick) {
    var wrap = boxBody.querySelector('[data-pills="' + name + '"]');
    if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-val]");
      if (!b) return;
      current.target = b.getAttribute("data-val");
      onPick(current.target);
    });
  }
  function wireSend(entry, getTarget) {
    var btn = boxBody.querySelector("[data-contact-send]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var d = collect();
      var t = getTarget();
      btn.disabled = true;
      showMsg("ok", "送信中…");
      pushContact(entry, t.target, d).then(function (r) {
        btn.disabled = false;
        if (r.ok) {
          boxBody.innerHTML = '<h3 style="margin:0 0 8px">送信しました</h3>'
            + '<p class="acct-hint">内容を受け付けました。運営が確認後にサイトへ反映します（返信が必要な場合のみ連絡先へご連絡します）。</p>'
            + '<button type="button" class="btn" data-contact-close style="width:100%;justify-content:center">閉じる</button>';
        } else {
          showMsg("err", ERR_MSG[r.error] || ERR_MSG.db);
        }
      });
    });
  }

  function openService() { current = { entry: "service", target: "orbis" }; ensureOverlay(); renderService("orbis"); open(); }
  function openMillidex(preset) {
    current = { entry: "millidex", target: preset === "goods" ? "goods" : "map" };
    ensureOverlay(); renderMillidex(current.target); open();
  }

  /* ---------- フッター＋ドロワー注入 ---------- */
  function inject() {
    try {
      var footers = document.querySelectorAll("footer");
      footers.forEach(function (ft) {
        if (ft.querySelector("[data-contacthub]")) return;
        var p = document.createElement("p");
        p.className = "source-note";
        p.setAttribute("data-contacthub", "1");
        p.innerHTML = 'お問い合わせ: <a href="javascript:void(0)" data-ch="service">全サービス</a> ／ <a href="javascript:void(0)" data-ch="millidex">MilliDex（マップ・グッズ申請）</a>';
        ft.appendChild(p);
      });
      var navs = document.querySelectorAll("#mobileNav");
      navs.forEach(function (nv) {
        if (nv.querySelector("[data-contacthub]")) return;
        var label = document.createElement("div");
        label.className = "drawer-section-label";
        label.textContent = "お問い合わせ";
        var a1 = document.createElement("a");
        a1.href = "javascript:void(0)"; a1.setAttribute("data-ch", "service"); a1.textContent = "全サービスへのお問い合わせ";
        var a2 = document.createElement("a");
        a2.href = "javascript:void(0)"; a2.setAttribute("data-ch", "millidex"); a2.className = "mobile-sub"; a2.textContent = "MilliDex（マップ・グッズ申請）";
        var wrap = document.createElement("div");
        wrap.setAttribute("data-contacthub", "1");
        wrap.appendChild(label); wrap.appendChild(a1); wrap.appendChild(a2);
        nv.appendChild(wrap);
      });
      document.addEventListener("click", function (e) {
        var a = e.target.closest("[data-ch]");
        if (!a) return;
        e.preventDefault();
        var k = a.getAttribute("data-ch");
        if (k === "service") openService();
        else if (k === "millidex-map") openMillidex("map");
        else if (k === "millidex-goods") openMillidex("goods");
        else openMillidex();
      });
    } catch (e) {}
  }

  /* ---------- 直リンク限定オープン（テスト用。UI導線は出さない） ---------- */
  /* ?contact=service | millidex-map | millidex-goods | millidex */
  function openFromUrl() {
    var v = null;
    try { v = new URLSearchParams(location.search).get("contact"); } catch (e) {}
    if (!v) return;
    try {
      if (v === "service") openService();
      else if (v === "millidex-map") openMillidex("map");
      else if (v === "millidex-goods") openMillidex("goods");
      else if (v === "millidex") openMillidex();
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", openFromUrl);
  else openFromUrl();

  window.ContactHub = { openService: openService, openMillidex: openMillidex, push: pushContact, inject: inject };
})();
