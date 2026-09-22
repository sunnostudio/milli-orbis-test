/* Spooky Masquerade — 事前登録ジェネレーター（開封演出なし）
   名前＋仮面選択 → 完成カードプレビュー → PNG保存 → Xポスト。
   座標は invite-base.webp（900×1350）実測。画像は同一生成元のため
   canvas は汚染されない。エレベーター系とは無関係の独立ファイル。 */
(function () {
  "use strict";

  /* A案（暫定・文面確定時にここだけ差し替え） */
  var SHARE_TEXT_TMPL = "怪しくも美しい仮面舞踏会へ、あなたをご招待します。当日は{name}がお迎えいたします #ミリプロ #SpookyMasquerade2026 #MilliOrbis";
  var PAGE_URL = "https://milli-orbis-portal.pages.dev/halloween/pre-register.html";
  var FILE_NAME = "grand-milli-invitation.png";

  var GUEST_KEY = "milli-event-spooky-guest";
  var MASK_KEY = "milli-event-spooky-mask";

  /* data.js の MEMBERS 順・表示名に合わせる */
  var MASKS = [
    { id: "konomi", name: "甘狼このみ" },
    { id: "nono", name: "音ノ乃のの" },
    { id: "akubi", name: "あくび・でもんすぺーど" },
    { id: "koma", name: "小廻こま" },
    { id: "raco", name: "音ノ瀬らこ" },
    { id: "yura", name: "ゆらぎゆら" },
    { id: "nuhu", name: "虹深°ぬふ" },
    { id: "tsukuri", name: "眠雲ツクリ" },
    { id: "liz", name: "雨夜リズ" },
    { id: "rei", name: "夕霧レイ" },
    { id: "mahoro", name: "鹿乃まほろ" },
    { id: "aoi", name: "海琳あおい" },
    { id: "milchan", name: "ミリちゃん" }
  ];

  /* 原画（900×1350）上の配置 */
  var NAME = { cx: 450, cy: 560, maxW: 600, baseSize: 56 };
  var OVAL = { cx: 451, cy: 844, rx: 115, ry: 114, shrink: 0.92 };

  function $(id) { return document.getElementById(id); }

  function maskById(id) {
    for (var i = 0; i < MASKS.length; i++) if (MASKS[i].id === id) return MASKS[i];
    return null;
  }
  function currentName() {
    var input = $("shareNameInput");
    var v = input ? input.value.trim() : "";
    return v.length > 14 ? v.slice(0, 14) : v;
  }
  function currentMask() {
    var sel = document.querySelector(".mask-pick.is-selected");
    return sel ? sel.dataset.mask : "";
  }

  function render() {
    var name = currentName() || "Guest";
    var out = $("shareNameOut");
    if (out) out.textContent = name;
    var maskId = currentMask();
    var holder = $("shareMaskOut");
    if (holder) {
      holder.classList.toggle("is-empty", !maskId);
      var img = holder.querySelector("img");
      if (maskId) {
        if (!img) {
          img = document.createElement("img");
          img.alt = "";
          holder.appendChild(img);
        }
        var want = "images/masks/" + maskId + ".png";
        if (img.getAttribute("src") !== want) img.src = want;
      } else if (img) {
        img.remove();
      }
    }
    var ok = !!currentName() && !!maskId;
    ["shareSave", "sharePost"].forEach(function (id) {
      var b = $(id);
      if (b) b.disabled = !ok;
    });
    var hint = $("shareHint");
    if (hint) {
      hint.innerHTML = !currentName()
        ? "お名前を入力してください"
        : !maskId
          ? "ご案内役の仮面を選んでください"
          : "✦ 招待状が完成しました ✦ ①保存 → ②画像を添えてポスト";
    }
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawCover(x, img, dx, dy, dw, dh) {
    var s = Math.max(dw / img.width, dh / img.height);
    var w = img.width * s, h = img.height * s;
    x.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
  }

  function exportPNG() {
    var name = currentName();
    var maskId = currentMask();
    if (!name || !maskId) return;
    var mask = maskById(maskId);
    Promise.all([
      loadImage("images/invite/invite-base.webp"),
      loadImage("images/masks/" + maskId + ".png"),
      (document.fonts
        ? document.fonts.load('italic 700 56px "Playfair Display"', name).catch(function () {})
        : Promise.resolve())
    ]).then(function (r) {
      var art = r[0], maskImg = r[1];
      var c = document.createElement("canvas");
      c.width = 900;
      c.height = 1350;
      var x = c.getContext("2d");
      x.drawImage(art, 0, 0, 900, 1350);
      /* 仮面（楕円クリップ） */
      x.save();
      x.beginPath();
      x.ellipse(OVAL.cx, OVAL.cy, OVAL.rx * OVAL.shrink, OVAL.ry * OVAL.shrink, 0, 0, Math.PI * 2);
      x.clip();
      drawCover(x, maskImg,
        OVAL.cx - OVAL.rx * OVAL.shrink, OVAL.cy - OVAL.ry * OVAL.shrink,
        OVAL.rx * 2 * OVAL.shrink, OVAL.ry * 2 * OVAL.shrink);
      x.restore();
      /* ゲスト名（Dear行） */
      var size = NAME.baseSize;
      x.textAlign = "center";
      x.textBaseline = "middle";
      do {
        x.font = 'italic 700 ' + size + 'px "Playfair Display", serif';
        if (x.measureText(name).width <= NAME.maxW || size <= 20) break;
        size -= 2;
      } while (true);
      x.shadowColor = "rgba(246,226,122,0.65)";
      x.shadowBlur = 10;
      x.fillStyle = "#f5e2a0";
      x.fillText(name, NAME.cx, NAME.cy);
      x.shadowBlur = 0;
      c.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = FILE_NAME;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 4000);
      }, "image/png");
    }).catch(function () {
      var hint = $("shareHint");
      if (hint) hint.textContent = "画像の生成に失敗しました。通信状況をご確認ください。";
    });
  }

  function postToX() {
    var name = currentName();
    var maskId = currentMask();
    if (!name || !maskId) return;
    var mask = maskById(maskId);
    var text = SHARE_TEXT_TMPL.split("{name}").join(mask ? mask.name : name);
    var url = "https://x.com/intent/post?text=" + encodeURIComponent(text)
      + "&url=" + encodeURIComponent(PAGE_URL);
    window.open(url, "_blank", "noopener,width=600,height=520");
  }

  function buildGrid() {
    var grid = $("maskGrid");
    if (!grid) return;
    var saved = null;
    try { saved = localStorage.getItem(MASK_KEY); } catch (e) {}
    MASKS.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mask-pick" + (saved === m.id ? " is-selected" : "");
      b.dataset.mask = m.id;
      b.setAttribute("aria-pressed", saved === m.id ? "true" : "false");
      var img = document.createElement("img");
      img.src = "images/masks/" + m.id + ".png";
      img.alt = m.name + "の仮面";
      img.loading = "lazy";
      var label = document.createElement("span");
      label.textContent = m.name;
      b.appendChild(img);
      b.appendChild(label);
      b.addEventListener("click", function () {
        grid.querySelectorAll(".mask-pick").forEach(function (o) {
          o.classList.remove("is-selected");
          o.setAttribute("aria-pressed", "false");
        });
        b.classList.add("is-selected");
        b.setAttribute("aria-pressed", "true");
        try { localStorage.setItem(MASK_KEY, m.id); } catch (e) {}
        render();
      });
      grid.appendChild(b);
    });
  }

  function init() {
    if (!$("maskGrid")) return;
    var input = $("shareNameInput");
    if (input) {
      try {
        var saved = localStorage.getItem(GUEST_KEY);
        if (saved) input.value = saved;
      } catch (e) {}
      input.addEventListener("input", function () {
        try { localStorage.setItem(GUEST_KEY, input.value); } catch (e) {}
        render();
      });
    }
    buildGrid();
    render();
    var save = $("shareSave"), post = $("sharePost");
    if (save) save.addEventListener("click", exportPNG);
    if (post) post.addEventListener("click", postToX);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
