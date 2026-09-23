/* Spooky Masquerade — 事前登録ジェネレーター（開封演出なし）
   名前＋仮面選択 → 完成カードプレビュー → PNG保存 → Xポスト。
   座標は invite-base.webp（900×1350）実測。画像は同一生成元のため
   canvas は汚染されない。エレベーター系とは無関係の独立ファイル。 */
(function () {
  "use strict";

  /* A案（暫定・文面確定時にここだけ差し替え） */
  var SHARE_TEXT_TMPL = "怪しくも美しい仮面舞踏会へ、あなたをご招待します。当日は{name}がお迎えいたします #ミリプロ #SpookyMasquerade2026 #MilliOrbis";
  var PAGE_URL = "https://milli-orbis-portal.pages.dev/halloween/pre-register";
  var FILE_NAME = "grand-milli-invitation.png";

  var GUEST_KEY = "milli-event-spooky-guest";
  var MASK_KEY = "milli-event-spooky-mask";

  /* iPhone系判定（iPadOSのデスクトップ表示含む）。①保存がFiles行きになる対策用 */
  function isIOS() {
    try {
      var ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/i.test(ua)) return true;
      if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
    } catch (e) {}
    return false;
  }
  var IOS = isIOS();

  /* Chromebook判定。ChromeOSはcanShareがtrueを返すがシート先にXアプリが
     いるとは限らないため、PC扱い（intentフロー）に固定する */
  function isChromeOS() {
    try { return /\bCrOS\b/i.test(navigator.userAgent || ""); }
    catch (e) { return false; }
  }

  function canShareFile(file) {
    try {
      if (isChromeOS()) return false;
      return !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) { return false; }
  }

  function downloadBlob(blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = FILE_NAME;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 4000);
  }

  function toFile(blob) {
    try {
      if (blob) return new File([blob], FILE_NAME, { type: "image/png" });
    } catch (e) {}
    return null;
  }

  /* ネイティブ共有（画像＋文面まとめ送り）の可否。実Fileで事前判定する */
  var SHARE_SHEET_OK = false;
  try {
    if (!isChromeOS()) {
      SHARE_SHEET_OK = canShareFile(new File([""], "probe.png", { type: "image/png" }));
    }
  } catch (e) { SHARE_SHEET_OK = false; }

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

  /* 原画（900×1350）上の配置：Dear線 x150-750 に収める幅（Dear被り回避で全角1文字分絞り） */
  var NAME = { cx: 506, cy: 440, maxW: 432, baseSize: 56 };
  var OVAL = { cx: 451, cy: 764, rx: 115, ry: 114, shrink: 0.92 };

  var _measureCtx = null;
  /* 和文はZen Old Mincho（ページ読込済み）を明示。canvasの暗黙フォールバックだと
     端末によりゴシック系に落ちてプレビューとずれるため、DOMと同一スタックにする */
  function nameFont(size) {
    return 'italic 700 ' + size + 'px "Playfair Display", "Zen Old Mincho", serif';
  }
  function measureWidth(name, size) {
    try {
      if (!_measureCtx) _measureCtx = document.createElement("canvas").getContext("2d");
      _measureCtx.font = nameFont(size);
      return _measureCtx.measureText(name).width;
    } catch (e) {
      return name.length * size * 0.6;
    }
  }
  function fitSize(name) {
    var size = NAME.baseSize;
    while (size > 20 && measureWidth(name, size) > NAME.maxW) size -= 2;
    return size;
  }

  function $(id) { return document.getElementById(id); }

  function maskById(id) {
    for (var i = 0; i < MASKS.length; i++) if (MASKS[i].id === id) return MASKS[i];
    return null;
  }
  function currentName() {
    var input = $("shareNameInput");
    var v = input ? input.value.trim() : "";
    return v.length > 20 ? v.slice(0, 20) : v;
  }
  function currentMask() {
    var sel = document.querySelector(".mask-pick.is-selected");
    return sel ? sel.dataset.mask : "";
  }
  function isComplete() {
    return !!currentName() && !!currentMask();
  }
  /* 事前チェックイン（spooky-checkin.js）との共有口 */
  window.SpookyShare = {
    currentName: currentName,
    currentMask: currentMask,
    isComplete: isComplete
  };

  function render() {
    var name = currentName() || "Guest";
    var out = $("shareNameOut");
    if (out) {
      out.textContent = name;
      /* 書き出しと同率で縮小してWYSIWYG化 */
      var s = fitSize(name);
      if (s < NAME.baseSize) {
        out.style.fontSize = "calc(var(--share-cw) * " + (0.0622 * s / NAME.baseSize).toFixed(4) + ")";
      } else {
        out.style.fontSize = "";
      }
    }
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
        var want = "images/masks/" + maskId + ".webp";
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
          : (SHARE_SHEET_OK && IOS)
            ? "✦ 招待状が完成しました ✦ ①で画像を保存・共有、②でXにまとめて送信"
            : SHARE_SHEET_OK
              ? "✦ 招待状が完成しました ✦ ②でシートからXを選ぶと画像＋文面まとめて送れます"
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

  /* 完成カードの描画。成功時はPNG blobを返す */
  function renderBlob() {
    var name = currentName();
    var maskId = currentMask();
    if (!name || !maskId) return Promise.reject(new Error("empty"));
    return Promise.all([
      loadImage("images/invite/invite-base.webp"),
      loadImage("images/masks/" + maskId + ".webp"),
      (document.fonts
        ? Promise.all([
            document.fonts.load('italic 700 56px "Playfair Display"', name),
            document.fonts.load('700 56px "Zen Old Mincho"', name)
          ]).catch(function () {})
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
      /* ゲスト名（Dear行・プレビューと同率縮小） */
      var size = fitSize(name);
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font = nameFont(size);
      x.shadowColor = "rgba(246,226,122,0.65)";
      x.shadowBlur = 10;
      x.fillStyle = "#f5e2a0";
      x.fillText(name, NAME.cx, NAME.cy);
      x.shadowBlur = 0;
      return new Promise(function (resolve) {
        c.toBlob(resolve, "image/png");
      });
    });
  }

  /* ①の保存：iPhone系はFiles行きダウンロードを避けて画像単体のシートを開く */
  function exportPNG() {
    renderBlob().then(function (blob) {
      if (!blob) return;
      if (IOS) {
        var file = toFile(blob);
        if (canShareFile(file)) {
          navigator.share({ files: [file], title: "HOTEL GRAND MILLI" }).catch(function () {});
          return;
        }
      }
      downloadBlob(blob);
    }).catch(function (err) {
      if (err && err.message === "empty") return;
      var hint = $("shareHint");
      if (hint) hint.textContent = "画像の生成に失敗しました。通信状況をご確認ください。";
    });
  }

  function shareText() {
    var name = currentName();
    var mask = maskById(currentMask());
    return SHARE_TEXT_TMPL.split("{name}").join(mask ? mask.name : name);
  }

  function openIntent() {
    var url = "https://x.com/intent/post?text=" + encodeURIComponent(shareText())
      + "&url=" + encodeURIComponent(PAGE_URL);
    window.open(url, "_blank", "noopener,width=600,height=520");
  }

  /* ポスト前ガイドの記憶キー */
  var GUIDE_SKIP_KEY = "milli-event-spooky-guide-skip";
  function guideSkip() {
    try { return localStorage.getItem(GUIDE_SKIP_KEY) === "1"; }
    catch (e) { return false; }
  }
  function showGuide() {
    var veil = $("shareGuide");
    if (!veil) { proceedShare(); return; }
    var sheet = $("shareGuideSheet"), intent = $("shareGuideIntent");
    if (sheet) sheet.hidden = !SHARE_SHEET_OK;
    if (intent) intent.hidden = !!SHARE_SHEET_OK;
    veil.hidden = false;
    var ok = $("shareGuideOk");
    if (ok) ok.focus();
  }
  function hideGuide() {
    var veil = $("shareGuide");
    if (veil) veil.hidden = true;
    var post = $("sharePost");
    if (post) post.focus();
  }

  /* ②の投稿：初回はガイドを挟み、わかったで実行へ */
  function postToX() {
    if (!currentName() || !currentMask()) return;
    if (!guideSkip()) { showGuide(); return; }
    proceedShare();
  }

  /* ②の実行本体：対応端末はシートで画像＋文面まとめ送り、非対応は従来intent */
  function proceedShare() {
    renderBlob().then(function (blob) {
      var file = toFile(blob);
      if (!canShareFile(file)) { openIntent(); return; }
      navigator.share({
        files: [file],
        title: "HOTEL GRAND MILLI",
        text: shareText() + "\n" + PAGE_URL
      }).catch(function (err) {
        if (err && err.name === "AbortError") return; /* シートのキャンセルは沈黙 */
        openIntent();
      });
    }).catch(function () {
      openIntent();
    });
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
      img.src = "images/masks/" + m.id + ".webp";
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
    if (save) {
      /* iPhone系は①が画像単体シートになる旨をラベルで示す */
      try {
        if (IOS && navigator.canShare) save.textContent = "① 画像をシェア・保存";
      } catch (e) {}
      save.addEventListener("click", exportPNG);
    }
    if (post) post.addEventListener("click", postToX);
    var gOk = $("shareGuideOk"), gCancel = $("shareGuideCancel"), veil = $("shareGuide");
    if (gOk) gOk.addEventListener("click", function () {
      try {
        var skip = $("shareGuideSkip");
        if (skip && skip.checked) localStorage.setItem(GUIDE_SKIP_KEY, "1");
      } catch (e) {}
      hideGuide();
      proceedShare();
    });
    if (gCancel) gCancel.addEventListener("click", hideGuide);
    if (veil) veil.addEventListener("click", function (e) {
      if (e.target === veil) hideGuide();
    });
    document.addEventListener("keydown", function (e) {
      var v = $("shareGuide");
      if (e.key === "Escape" && v && !v.hidden) hideGuide();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
