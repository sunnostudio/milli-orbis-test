/* ============================================
   cursor.js — オリジナルマウスカーソル（プレビュー移植）
   preview: video.css + js/storage.js + js/video.js の移植
   localStorage: milli-cursor {enabled:boolean, talentId:string}
   初回は preview の milpro_cursor からのマイグレーションも読む
   ============================================ */
(function () {
  "use strict";

  var KEY = "milli-cursor";
  var LEGACY_KEY = "milpro_cursor";

  // 旧 milpro_cursor からのマイグレーション（初回のみ）
  function migrateLegacy() {
    try {
      if (localStorage.getItem(KEY)) return;
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) localStorage.setItem(KEY, legacy);
    } catch (e) {}
  }

  function getCursorSettings() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }

  function saveCursorSettings(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function initCursorSettings() {
    migrateLegacy();
    var existing = getCursorSettings();
    if (existing && typeof existing === "object") return existing;
    var s = { enabled: false, talentId: "default" };
    saveCursorSettings(s);
    return s;
  }

  function applyCursor(s) {
    var html = document.documentElement;
    if (!s || !s.enabled) {
      html.classList.remove("cursor-custom");
      for (var i = 0; i < html.classList.length; ) {
        var c = html.classList[i];
        if (c.indexOf("cursor-") === 0) html.classList.remove(c);
        else i++;
      }
      html.classList.remove("cursor-custom");
    } else {
      html.classList.add("cursor-custom");
      // remove old cursor-* except cursor-custom
      var toRemove = [];
      for (var j = 0; j < html.classList.length; j++) {
        var cc = html.classList[j];
        if (cc.indexOf("cursor-") === 0 && cc !== "cursor-custom") toRemove.push(cc);
      }
      toRemove.forEach(function (c) { html.classList.remove(c); });
      var id = (s.talentId && s.talentId !== "default") ? s.talentId : "";
      if (id) html.classList.add("cursor-" + id);
    }
    // トップバーの表示を更新（旧 + 新統合）
    try {
      var label = document.getElementById("cursorTopLabel");
      var preview = document.getElementById("cursorTopPreview");
      var btn = document.getElementById("cursorTopBtn");
      if (label) {
        if (!s || !s.enabled) label.textContent = "カーソルOFF";
        else {
          var m = null;
          if (typeof MEMBERS !== "undefined") {
            for (var k = 0; k < MEMBERS.length; k++) if (MEMBERS[k].id === s.talentId) { m = MEMBERS[k]; break; }
            if (!m && s.talentId === "milli-chan") m = { name: "ミリちゃん" };
            if (!m && s.talentId === "milli-chan") m = { name: "ミリちゃん" };
          }
          label.textContent = m ? m.name : "カーソル";
        }
      }
      if (preview) {
        if (s && s.enabled && s.talentId && s.talentId !== "default") {
          var pngMap1 = {raco:"rako", liz:"rizu"};
          var cid1 = pngMap1[s.talentId] || s.talentId;
          var icon = "/images/cursors/" + cid1 + ".png";
          if (s.talentId === "milli-chan") icon = "/images/cursors/milli-chan.png";
          // fallback to talent icon if png missing (handled via onerror in dropdown, but here just keep png)
          if (!icon) {
            if (typeof MEMBERS !== "undefined") {
              for (var kk = 0; kk < MEMBERS.length; kk++) if (MEMBERS[kk].id === s.talentId) { icon = MEMBERS[kk].icon || icon; break; }
            }
          }
          preview.style.backgroundImage = "url('" + icon + "')";
          preview.style.backgroundSize = "cover";
          preview.style.backgroundColor = "#fff";
        } else if (s && s.enabled) {
          preview.style.backgroundImage = "url('/images/cursors/default.png')";
          preview.style.backgroundSize = "cover";
          preview.style.backgroundColor = "#fff";
        } else {
          preview.style.backgroundImage = "";
          preview.style.backgroundColor = "#7a4fc4";
        }
      }
      if (btn) btn.style.opacity = s && s.enabled ? "1" : "0.7";
      var items = document.querySelectorAll(".cursor-dropdown-item");
      for (var ii = 0; ii < items.length; ii++) {
        var el = items[ii];
        var active = el.dataset.id === (s ? s.talentId : "default") || (!s.enabled && el.dataset.id === "__off");
        if (!s || !s.enabled) active = el.dataset.id === "__off";
        else active = el.dataset.id === s.talentId;
        el.classList.toggle("active", active);
      }
      // 新統合ボタン用
      var oshiPrev = document.getElementById("oshiCursorPreview");
      if (oshiPrev) {
        if (s && s.enabled && s.talentId && s.talentId !== "default") {
          var pngMap2 = {raco:"rako", liz:"rizu"};
          var cid2 = pngMap2[s.talentId] || s.talentId;
          var icon2 = "/images/cursors/" + cid2 + ".png";
          if (s.talentId === "milli-chan") icon2 = "/images/cursors/milli-chan.png";
          oshiPrev.style.backgroundImage = "url('" + icon2 + "')";
          oshiPrev.style.backgroundSize = "cover";
          oshiPrev.style.backgroundColor = "#fff";
        } else if (s && s.enabled) {
          oshiPrev.style.backgroundImage = "url('/images/cursors/default.png')";
          oshiPrev.style.backgroundSize = "cover";
          oshiPrev.style.backgroundColor = "#fff";
        } else {
          oshiPrev.style.backgroundImage = "";
          oshiPrev.style.backgroundColor = "#7a4fc4";
        }
      }
      // oshiDot はアイコン表示（背景設定）に変更
      try {
        var oshiDot = document.getElementById("oshiDot");
        if (oshiDot && typeof getOshi === "function") {
          var oshiId = getOshi();
          var mOshi = null;
          if (oshiId && typeof MEMBERS !== "undefined") {
            for (var oi=0; oi<MEMBERS.length; oi++) if (MEMBERS[oi].id === oshiId) { mOshi = MEMBERS[oi]; break; }
            if (!mOshi && oshiId==="milchan") {
              for(var oi2=0; oi2<MEMBERS.length; oi2++) if(MEMBERS[oi2].id==="milchan"){ mOshi=MEMBERS[oi2]; break; }
            }
          }
          if (mOshi && mOshi.icon) {
            oshiDot.style.backgroundImage = "url('" + normalizeIconPath(mOshi.icon) + "')";
            oshiDot.style.backgroundSize = "cover";
            oshiDot.style.backgroundPosition = "center";
            oshiDot.style.backgroundColor = "#fff";
            oshiDot.style.outlineColor = mOshi.color || "var(--accent)";
          } else {
            oshiDot.style.backgroundImage = "";
            oshiDot.style.backgroundColor = "var(--accent)";
            oshiDot.style.outlineColor = "var(--accent)";
          }
        }
      } catch(eo) {}
    } catch (e) {}
  }

  function initCursor() {
    try { applyCursor(initCursorSettings()); } catch (e) {}
  }

  function initCursorTopBar() {
    var wrap = document.getElementById("cursorTopWrap");
    var btn = document.getElementById("cursorTopBtn");
    var dd = document.getElementById("cursorDropdown");
    if (!wrap || !btn || !dd) return;
    wrap.style.display = "";
    var members = [];
    if (typeof MEMBERS !== "undefined") {
      for (var i = 0; i < MEMBERS.length; i++) {
        var id = MEMBERS[i].id;
        if (id === "milchan") continue;
        members.push(MEMBERS[i]);
      }
    }
    function renderDropdown() {
      var cur = getCursorSettings() || { enabled: false, talentId: "default" };
      var items = [];
      var offActive = !cur.enabled ? " active" : "";
      items.push('<button class="cursor-dropdown-item' + offActive + '" data-id="__off" role="menuitem"><span style="width:28px;height:28px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:12px">🚫</span><span>OFF（標準）</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>');
      for (var mi = 0; mi < members.length; mi++) {
        var m = members[mi];
        var active = cur.enabled && cur.talentId === m.id ? " active" : "";
        var icon = m.icon || ("/images/cursors/" + m.id + ".png");
        // Handle portal's icon path with encoded space etc. Keep as is, fallback via onerror
        items.push('<button class="cursor-dropdown-item' + active + '" data-id="' + m.id + '" role="menuitem"><img src="' + icon + '" alt="" onerror="this.src=\'/images/cursors/default.png\'"><span>' + esc(m.name) + '</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>');
      }
      // ミリちゃん — タレントサイトのアイコンを使用
      {
        var mId = "milli-chan";
        var a = cur.enabled && cur.talentId === mId ? " active" : "";
        var ic = "images/icon/milli%20chan_profile.JPEG";
        // find milchan member icon if MEMBERS available
        try {
          for (var _mi=0; _mi<MEMBERS.length; _mi++) if (MEMBERS[_mi].id==="milchan") { ic = MEMBERS[_mi].icon || ic; break; }
        } catch(e) {}
        items.push('<button class="cursor-dropdown-item' + a + '" data-id="' + mId + '" role="menuitem"><img src="' + ic + '" alt="" onerror="this.src=\'/images/cursors/default.png\'"><span>ミリちゃん</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>');
      }
      dd.innerHTML = items.join("");
      var els = dd.querySelectorAll(".cursor-dropdown-item");
      for (var ei = 0; ei < els.length; ei++) (function (el) {
        el.addEventListener("click", function () {
          var id = el.dataset.id;
          if (id === "__off") {
            var s = { enabled: false, talentId: "default" };
            saveCursorSettings(s);
            applyCursor(s);
          } else {
            var s2 = { enabled: true, talentId: id };
            saveCursorSettings(s2);
            applyCursor(s2);
          }
          dd.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
          dd.setAttribute("aria-hidden", "true");
          renderDropdown();
          applyCursor(getCursorSettings());
        });
      })(els[ei]);
    }
    renderDropdown();
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = dd.classList.contains("open");
      dd.classList.toggle("open", !open);
      btn.setAttribute("aria-expanded", String(!open));
      dd.setAttribute("aria-hidden", String(open));
      if (!open) renderDropdown();
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) {
        dd.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        dd.setAttribute("aria-hidden", "true");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        dd.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        dd.setAttribute("aria-hidden", "true");
      }
    });
    applyCursor(getCursorSettings());
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Mobile select (hamburger)
  function initMobileCursor() {
    var sel = document.getElementById("mobileCursorSelect");
    var off = document.getElementById("mobileCursorOff");
    if (!sel) return;
    var members = [];
    if (typeof MEMBERS !== "undefined") {
      for (var i = 0; i < MEMBERS.length; i++) {
        var id = MEMBERS[i].id;
        if (id === "milchan") continue;
        members.push(MEMBERS[i]);
      }
    }
    function renderMobile() {
      var cur = getCursorSettings() || { enabled: false, talentId: "default" };
      sel.innerHTML = "";
      members.forEach(function (m) {
        var opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        if (cur.enabled && cur.talentId === m.id) opt.selected = true;
        sel.appendChild(opt);
      });
      var optM = document.createElement("option");
      optM.value = "milli-chan";
      optM.textContent = "ミリちゃん";
      if (cur.enabled && cur.talentId === "milli-chan") optM.selected = true;
      sel.appendChild(optM);
      // opacity when OFF
      sel.style.opacity = cur.enabled ? "1" : "0.45";
      if (off) off.style.opacity = cur.enabled ? "1" : "0.45";
    }
    renderMobile();
    sel.addEventListener("change", function () {
      var s = { enabled: true, talentId: sel.value };
      saveCursorSettings(s);
      applyCursor(s);
      renderMobile();
    });
    if (off) off.addEventListener("click", function () {
      var s = { enabled: false, talentId: "default" };
      saveCursorSettings(s);
      applyCursor(s);
      renderMobile();
    });
    // sync when header dropdown changes
    document.addEventListener("click", function () { setTimeout(renderMobile, 200); });
  }

  function normalizeIconPath(p) {
    if (!p) return p;
    if (p.indexOf("http") === 0 || p.indexOf("/") === 0 || p.indexOf("data:") === 0) return p;
    if (p.indexOf("images/") === 0) return "/" + p;
    return p;
  }

  // Combined oshi+cursor dropdown
  function initOshiCursor() {
    var wrap = document.getElementById("oshiCursorWrap");
    var btn = document.getElementById("oshiCursorBtn");
    var dd = document.getElementById("oshiCursorDropdown");
    if (!wrap || !btn || !dd) return;
    var members = [];
    if (typeof MEMBERS !== "undefined") {
      for (var i = 0; i < MEMBERS.length; i++) {
        if (MEMBERS[i].id === "milchan") continue;
        members.push(MEMBERS[i]);
      }
    }
    function renderCombined() {
      var cur = getCursorSettings() || { enabled: false, talentId: "default" };
      var oshiId = "";
      try { oshiId = typeof getOshi === "function" ? getOshi() : ""; } catch(e) { oshiId = ""; }
      var html = '<div class="oshi-cursor-cols">';
      html += '<div class="oshi-cursor-col"><div class="oshi-section-title">カーソル<span class="caret-sm" aria-hidden="true"></span></div><div class="oshi-col-list">';
      var offActive = !cur.enabled ? ' active' : '';
      html += '<button class="cursor-dropdown-item' + offActive + '" data-cur="__off" role="menuitem"><span style="width:28px;height:28px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:12px">🚫</span><span>OFF（標準）</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>';
      for (var mi=0; mi<members.length; mi++) {
        var m = members[mi];
        var active = cur.enabled && cur.talentId === m.id ? ' active' : '';
        var pngMap = {raco:"rako", liz:"rizu"};
        var cid = pngMap[m.id] || m.id;
        var icon = "/images/cursors/" + cid + ".png";
        html += '<button class="cursor-dropdown-item' + active + '" data-cur="' + m.id + '" role="menuitem"><img src="' + icon + '" alt="" onerror="this.src=\'/images/cursors/default.png\'"><span>' + esc(m.name) + '</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>';
      }
      // milli-chan cursor
      {
        var mId = "milli-chan";
        var a = cur.enabled && cur.talentId === mId ? ' active' : '';
        var ic = "/images/cursors/milli-chan.png";
        html += '<button class="cursor-dropdown-item' + a + '" data-cur="' + mId + '" role="menuitem"><img src="' + ic + '" alt="" onerror="this.src=\'/images/cursors/default.png\'"><span>ミリちゃん</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>';
      }
      html += '</div></div>';
      html += '<div class="oshi-cursor-col"><div class="oshi-section-title">推し（背景）<span class="caret-sm" aria-hidden="true"></span></div><div class="oshi-col-list">';
      html += '<button class="oshi-dropdown-item' + (!oshiId ? ' active' : '') + '" data-oshi="" role="menuitem"><span class="oshi-dot-sm" style="background:#f6f1e9;border-color:var(--accent);"></span><span>未選択（デフォルト）</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>';
      for (var oi=0; oi<members.length; oi++) {
        var mo = members[oi];
        var act = oshiId === mo.id ? ' active' : '';
        var oshiIcon = normalizeIconPath(mo.icon || "");
        html += '<button class="oshi-dropdown-item' + act + '" data-oshi="' + mo.id + '" role="menuitem"><img src="' + oshiIcon + '" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid #eee;flex-shrink:0;" onerror="this.style.display=\'none\'"><span>' + esc(mo.name) + '</span><span class="check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg></span></button>';
      }
      // milli-chan as oshi? not a talent for oshi, skip
      html += '</div></div></div>';
      dd.innerHTML = html;
      // cursor handlers
      dd.querySelectorAll("[data-cur]").forEach(function(el){
        el.addEventListener("click", function(){
          var id = el.dataset.cur;
          if (id === "__off") {
            var s = { enabled:false, talentId:"default" };
            saveCursorSettings(s); applyCursor(s);
          } else {
            var s2 = { enabled:true, talentId:id };
            saveCursorSettings(s2); applyCursor(s2);
          }
          renderCombined();
          // keep dropdown open for oshi selection, don't close
        });
      });
      // oshi handlers
      dd.querySelectorAll("[data-oshi]").forEach(function(el){
        el.addEventListener("click", function(){
          var id = el.dataset.oshi;
          try {
            if (typeof setOshi === "function") setOshi(id);
            else {
              try { localStorage.setItem("milli-oshi", id); } catch(e) {}
              if (typeof applyOshi === "function") applyOshi(id);
            }
          } catch(e) {}
          renderCombined();
          // sync hidden select
          var sel = document.getElementById("oshiSelect");
          if (sel) sel.value = id;
          // update dot
          applyCursor(getCursorSettings());
        });
      });
    }
    renderCombined();
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      // スマホではドロップダウンではなく最初の推し選択ポップアップを出す
      try {
        if (typeof window !== "undefined" && window.innerWidth <= 720) {
          var modal = document.getElementById("oshiModal");
          if (modal) {
            // 既存の onboarding を再利用: 中身が空なら生成
            if (!modal.querySelector("#oshiList") || !modal.querySelector("#oshiList").children.length) {
              try { if (typeof initOnboarding === "function") initOnboarding(); } catch(e2) {}
              // initOnboarding が getOshi() で return する場合があるので強制でリスト生成
              var list = document.getElementById("oshiList");
              if (list && !list.children.length && typeof MEMBERS !== "undefined") {
                MEMBERS.forEach(function(m){
                  var b=document.createElement("button");
                  b.type="button"; b.className="oshi-option";
                  b.innerHTML=(m.icon?'<span class="oshi-mark"><img src="'+m.icon+'" alt="" loading="lazy" decoding="async"></span>':'<span class="oshi-mark">'+m.fanMark+'</span>')+m.name;
                  b.style.setProperty("--mc", m.color);
                  b.addEventListener("click", function(){
                    modal.classList.remove("open");
                    var apply=function(){
                      try { if (typeof setOshi==="function") setOshi(m.id); else localStorage.setItem("milli-oshi", m.id); } catch(e){}
                      try { if (typeof applyOshi==="function") applyOshi(m.id); } catch(e){}
                      try { renderCombined(); } catch(e){}
                    };
                    if (typeof requestAnimationFrame==="function") requestAnimationFrame(apply);
                    else apply();
                  });
                  list.appendChild(b);
                });
              }
            }
            modal.classList.add("open");
            return;
          }
        }
      } catch(e) {}
      var open = dd.classList.contains("open");
      dd.classList.toggle("open", !open);
      btn.setAttribute("aria-expanded", String(!open));
      dd.setAttribute("aria-hidden", String(open));
      if (!open) renderCombined();
    });
    document.addEventListener("click", function(e){
      if (!wrap.contains(e.target)) {
        dd.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        dd.setAttribute("aria-hidden", "true");
      }
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape") {
        dd.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        dd.setAttribute("aria-hidden", "true");
      }
    });
    // sync when external changes (e.g., mobile select)
    document.addEventListener("milli-oshi-change", renderCombined);
    // also watch storage changes
    window.addEventListener("storage", renderCombined);
    // wrap setOshi to sync combined dropdown when oshi changes via other UI
    try {
      if (typeof window.setOshi === "function" && !window.setOshi._wrappedForOshiCursor) {
        var _origSetOshi = window.setOshi;
        window.setOshi = function(id){
          var r = _origSetOshi.apply(this, arguments);
          try { renderCombined(); } catch(e) {}
          try { applyCursor(getCursorSettings()); } catch(e) {}
          return r;
        };
        window.setOshi._wrappedForOshiCursor = true;
      }
    } catch(e) {}
  }

  // Expose globally for other scripts
  window.CursorStore = {
    get: getCursorSettings,
    save: saveCursorSettings,
    init: initCursorSettings,
    apply: applyCursor
  };
  window.initCursor = initCursor;
  window.initCursorTopBar = initCursorTopBar;
  window.initMobileCursor = initMobileCursor;
  window.initOshiCursor = initOshiCursor;

  // Auto-init on DOMContentLoaded (defer-safe)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initCursor();
      try { initCursorTopBar(); } catch (e) {}
      try { initMobileCursor(); } catch (e) {}
      try { initOshiCursor(); } catch (e) {}
    });
  } else {
    initCursor();
    try { initCursorTopBar(); } catch (e) {}
    try { initMobileCursor(); } catch (e) {}
    try { initOshiCursor(); } catch (e) {}
  }
})();
