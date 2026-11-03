(function () {
  "use strict";

  var PAGE_SIZE = 12;
  var listEl = document.getElementById("newsArchiveList");
  if (!listEl) return;

  var searchEl = document.getElementById("newsSearch");
  var tagsEl = document.getElementById("newsTags");
  var countEl = document.getElementById("newsCount");
  var emptyEl = document.getElementById("newsEmpty");
  var moreEl = document.getElementById("newsMore");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".news-tab"));

  var state = {
    source: "all",
    tag: "all",
    q: "",
    shown: PAGE_SIZE
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function tr(key, fallback, vars) {
    try {
      if (typeof T === "function") {
        var v = T(key, vars);
        if (v && v !== key) return v;
      }
    } catch (e) {}
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        fallback = fallback.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return fallback;
  }

  function lang() {
    try {
      return window.milliLang ? window.milliLang.get() : "ja";
    } catch (e) {
      return "ja";
    }
  }

  function loc(n, key) {
    try {
      if (typeof window.loc === "function") {
        var v = window.loc(n, key);
        if (v !== undefined && v !== null && v !== "") return v;
      }
    } catch (e) {}
    return n[key] || "";
  }

  function sourceOf(n) {
    if (n.source === "milliorbis" || n.source === "milipro") return n.source;
    var url = n.url || "";
    if (/^https?:\/\/(?:www\.)?(?:milpr\.com|shop\.milpr\.com|x\.com|twitter\.com)\//i.test(url)) return "milipro";
    return "milliorbis";
  }

  function newsHref(url) {
    if (!url) return "";
    if (/^(?:https?:|mailto:|tel:)/i.test(url)) return url;
    if (url.charAt(0) === "/") return url;
    return "/" + url.replace(/^\.?\//, "");
  }

  function imageHref(src) {
    if (!src) return "";
    if (/^(?:https?:|data:)/i.test(src)) return src;
    if (src.charAt(0) === "/") return src;
    return "/" + src.replace(/^\.?\//, "");
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url || "");
  }

  function dateValue(n) {
    return n.date || "";
  }

  function monthKey(date) {
    return String(date || "").slice(0, 7);
  }

  function formatDate(date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
    if (!m) return date || "";
    if (lang() === "en") return m[1] + "." + m[2] + "." + m[3];
    return m[1] + "." + m[2] + "." + m[3];
  }

  function monthLabel(key) {
    var m = /^(\d{4})-(\d{2})$/.exec(key || "");
    if (!m) return key || "";
    if (lang() === "en") {
      var names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return names[parseInt(m[2], 10) - 1];
    }
    return parseInt(m[2], 10) + "月";
  }

  function yearLabel(key) {
    return lang() === "en" ? key : key + "年";
  }

  function allItems() {
    var current = [];
    try {
      if (typeof NEWS !== "undefined") current = NEWS;
    } catch (e) {
      current = window.NEWS || [];
    }
    var archive = window.NEWS_ARCHIVE || [];
    var seen = Object.create(null);
    var out = [];
    current.concat(archive).forEach(function (n, i) {
      if (!n || !n.title || !n.date) return;
      var key = n.date + "|" + n.title;
      if (seen[key]) return;
      seen[key] = true;
      out.push({
        data: n,
        order: i,
        source: sourceOf(n),
        href: newsHref(n.url)
      });
    });
    out.sort(function (a, b) {
      var d = dateValue(b.data).localeCompare(dateValue(a.data));
      return d !== 0 ? d : a.order - b.order;
    });
    return out;
  }

  var ITEMS = allItems();

  function baseItems() {
    var q = state.q.toLowerCase();
    return ITEMS.filter(function (item) {
      if (state.source !== "all" && item.source !== state.source) return false;
      if (!q) return true;
      var n = item.data;
      var hay = [
        loc(n, "title"),
        n.title,
        loc(n, "desc"),
        n.desc,
        n.tag,
        loc(n, "tag"),
        item.source
      ].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function filteredItems() {
    var items = baseItems();
    if (state.tag !== "all") {
      items = items.filter(function (item) { return item.data.tag === state.tag; });
    }
    return items;
  }

  function sourceLabel(source) {
    if (source === "milipro") return tr("newsArchive.milipro", "ミリプロ公式");
    return tr("newsArchive.milliorbis", "Milli Orbis");
  }

  function tagLabel(tag) {
    if (lang() !== "en") return tag;
    for (var i = 0; i < ITEMS.length; i++) {
      var n = ITEMS[i].data;
      if (n.tag === tag && n.en && n.en.tag) return n.en.tag;
    }
    return tag;
  }

  function linkLabel(item) {
    if (!item.href) return "";
    if (isExternal(item.href)) {
      if (/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\//i.test(item.href)) {
        return tr("newsArchive.viewX", "Xで見る");
      }
      return tr("newsArchive.viewOfficial", "公式サイトで読む");
    }
    return tr("newsArchive.viewDetail", "詳しく見る");
  }

  function cardHtml(item) {
    var n = item.data;
    var title = loc(n, "title");
    var desc = loc(n, "desc");
    var tag = loc(n, "tag") || n.tag;
    var image = imageHref(n.image);
    var status = loc(n, "status");
    var note = loc(n, "note");
    var hasThumb = !!image;
    var link = item.href;
    var label = linkLabel(item);
    var classes = "news-card" + (hasThumb ? " has-thumb" : "");

    var titleHtml = link
      ? '<a href="' + esc(link) + '"' + (isExternal(link) ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + esc(title) + "</a>"
      : esc(title);

    var thumbHtml = hasThumb
      ? (link
        ? '<a class="news-card-thumb" href="' + esc(link) + '"' + (isExternal(link) ? ' target="_blank" rel="noopener noreferrer"' : "") + '><img src="' + esc(image) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>'
        : '<div class="news-card-thumb"><img src="' + esc(image) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>')
      : "";

    var foot = [];
    if (status) foot.push('<span class="news-card-status">' + esc(status) + "</span>");
    if (link) {
      foot.push('<a class="news-card-link" href="' + esc(link) + '"' + (isExternal(link) ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + esc(label) + (isExternal(link) ? " ↗" : " →") + "</a>");
    }
    if (note) foot.push('<span class="news-card-note">' + esc(note) + "</span>");

    return '<article class="' + classes + '">' +
      '<div class="news-card-body">' +
        '<div class="news-card-top">' +
          '<span class="news-source is-' + item.source + '">' + esc(sourceLabel(item.source)) + "</span>" +
          (tag ? '<span class="news-card-tag">' + esc(tag) + "</span>" : "") +
          '<time class="news-card-time" datetime="' + esc(n.date) + '">' + esc(formatDate(n.date)) + "</time>" +
        "</div>" +
        '<h4 class="news-card-title">' + titleHtml + "</h4>" +
        (desc ? '<p class="news-card-desc">' + esc(desc) + "</p>" : "") +
        (foot.length ? '<div class="news-card-foot">' + foot.join("") + "</div>" : "") +
      "</div>" +
      thumbHtml +
    "</article>";
  }

  function renderTags() {
    var available = [];
    var seen = Object.create(null);
    baseItems().forEach(function (item) {
      var t = item.data.tag;
      if (!t || seen[t]) return;
      seen[t] = true;
      available.push(t);
    });
    if (state.tag !== "all" && !seen[state.tag]) state.tag = "all";

    var html = '<button type="button" class="news-tag-filter' + (state.tag === "all" ? " is-active" : "") + '" data-tag="all" aria-pressed="' + (state.tag === "all") + '">' + esc(tr("newsArchive.allTags", "すべて")) + "</button>";
    html += available.map(function (t) {
      var active = state.tag === t;
      return '<button type="button" class="news-tag-filter' + (active ? " is-active" : "") + '" data-tag="' + esc(t) + '" aria-pressed="' + active + '">' + esc(tagLabel(t)) + "</button>";
    }).join("");
    tagsEl.innerHTML = html;
  }

  function render() {
    renderTags();
    var items = filteredItems();
    var visible = items.slice(0, state.shown);
    var years = [];
    visible.forEach(function (item) {
      var yearKey = String(item.data.date || "").slice(0, 4);
      var year = years[years.length - 1];
      if (!year || year.key !== yearKey) {
        year = { key: yearKey, months: [] };
        years.push(year);
      }
      var mKey = monthKey(item.data.date);
      var month = year.months[year.months.length - 1];
      if (!month || month.key !== mKey) {
        month = { key: mKey, items: [] };
        year.months.push(month);
      }
      month.items.push(item);
    });

    listEl.innerHTML = years.map(function (year) {
      var yearCount = 0;
      year.months.forEach(function (month) { yearCount += month.items.length; });
      var monthsHtml = year.months.map(function (month) {
        var count = tr("newsArchive.items", "{n}件", { n: month.items.length });
        return '<div class="news-month">' +
          '<div class="news-month-head"><h3>' + esc(monthLabel(month.key)) + '</h3><span class="news-month-count">' + esc(count) + "</span></div>" +
          '<div class="news-month-list">' + month.items.map(cardHtml).join("") + "</div>" +
        "</div>";
      }).join("");
      return '<section class="news-year">' +
        '<div class="news-year-head"><h2>' + esc(yearLabel(year.key)) + '</h2><span class="news-year-count">' + esc(tr("newsArchive.items", "{n}件", { n: yearCount })) + "</span></div>" +
        '<div class="news-year-body">' + monthsHtml + "</div>" +
      "</section>";
    }).join("");

    emptyEl.hidden = items.length !== 0;
    moreEl.hidden = visible.length >= items.length;
    moreEl.textContent = tr("newsArchive.more", "もっと見る");

    if (!items.length) {
      countEl.textContent = tr("newsArchive.countEmpty", "0件のお知らせ");
    } else if (visible.length < items.length) {
      countEl.textContent = tr("newsArchive.countShown", "全{total}件中 {shown}件を表示", { total: items.length, shown: visible.length });
    } else {
      countEl.textContent = tr("newsArchive.countAll", "全{total}件のお知らせ", { total: items.length });
    }

    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-source") === state.source;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.source !== "all") p.set("source", state.source);
    if (state.tag !== "all") p.set("tag", state.tag);
    if (state.q) p.set("q", state.q);
    var qs = p.toString();
    try {
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    } catch (e) {}
  }

  function resetAndRender() {
    state.shown = PAGE_SIZE;
    render();
    syncUrl();
  }

  function initFromUrl() {
    var p = new URLSearchParams(location.search);
    var source = p.get("source");
    if (source === "milliorbis" || source === "milipro") state.source = source;
    var tag = p.get("tag");
    if (tag) state.tag = tag;
    var q = p.get("q");
    if (q) {
      state.q = q;
      if (searchEl) searchEl.value = q;
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      state.source = tab.getAttribute("data-source") || "all";
      resetAndRender();
    });
  });

  tagsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".news-tag-filter");
    if (!btn) return;
    state.tag = btn.getAttribute("data-tag") || "all";
    resetAndRender();
  });

  var timer;
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = searchEl.value.trim();
        resetAndRender();
      }, 160);
    });
  }

  moreEl.addEventListener("click", function () {
    state.shown += PAGE_SIZE;
    render();
  });

  initFromUrl();
  render();
})();
