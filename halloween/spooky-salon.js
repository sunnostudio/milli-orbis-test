/* Spooky Masquerade — 4F ゲームサロン「今宵のダンス相手診断」（Phase C1）
   5問×3択 → 13人のダンス相手から1名を診断。仮面画像は images/masks/<id>.webp を再利用。
   保存は端末のみ（localStorage milli-event-spooky-dance）。鍵・ログイン・Firebase不要。
   X共有はテキストintent（事前登録と同タグ）。 */
(function () {
  "use strict";

  var STORE_KEY = "milli-event-spooky-dance";
  var PAGE_URL = "https://milli-orbis-portal.pages.dev/halloween/floor-4-salon.html#diagnosis";
  var TAG = " #ミリプロ #SpookyMasquerade2026 #MilliOrbis";

  /* 13人のダンス相手（spooky-share.js のMASKS順と合わせる） */
  var PARTNERS = [
    { id: "konomi", name: "甘狼このみ", trait: "明るいリードで緊張をほぐす", line: "「まずは一曲、肩の力を抜いて。リードは任せて」",
      desc: "シャンデリアの下でくるりと回り、緊張するあなたの手をそっと取る。甘い香りのドレスの裾が、ワルツに合わせて柔らかく揺れる。",
      treat: "おすすめの一品：はちみつキャンディ" },
    { id: "nono", name: "音ノ乃のの", trait: "輪の中心で手を引く", line: "「真ん中で踊ろう。音楽に身を任せて」",
      desc: "ホールの真ん中でスポットライトを浴びながら、堂々と手を差し出す。最初の一歩さえ踏み出せば、音楽が背中を押してくれる。",
      treat: "おすすめの一品：銀紙のチョコ" },
    { id: "akubi", name: "あくび・でもんすぺーど", trait: "0時を過ぎても終わらない夜の主", line: "「0時を過ぎてもまだ踊ろう。今夜は特別だから」",
      desc: "0時を告げる鐘が鳴っても、彼女の夜は終わらない。いたずらっぽい笑みで「まだ帰さない」と手を引く、秘密の夜の主。",
      treat: "おすすめの一品：月夜のパンプキンパイ" },
    { id: "koma", name: "小廻こま", trait: "小さな一歩に寄り添う", line: "「ゆっくりでいいよ。隣で合わせるから」",
      desc: "人混みが苦手なあなたに、そっと寄り添ってくれる。小さなステップを二人で刻めば、いつの間にか笑顔になっている。",
      treat: "おすすめの一品：小さなクッキー" },
    { id: "raco", name: "音ノ瀬らこ", trait: "華やかなステップで魅せる", line: "「シャンデリアの下が似合うね。もう一曲！」",
      desc: "金の仮面がシャンデリアの光を反射して、ホール中の視線を集める。華やかなターンを決めれば、今夜の主役はあなた。",
      treat: "おすすめの一品：キャラメルポップコーン" },
    { id: "yura", name: "ゆらぎゆら", trait: "波のような揺らぎで誘う", line: "「ゆらゆら揺れて、気づけば踊ってるかも」",
      desc: "波に揺られるように、ふわりふわりと誘ってくれる。リズムに身を任せれば、恥ずかしさもどこかへ消えていく。",
      treat: "おすすめの一品：ソーダキャンディ" },
    { id: "nuhu", name: "虹深°ぬふ", trait: "不思議な間合いで惹き込む", line: "「深いところへ案内するよ。手を離さないで」",
      desc: "少し不思議な間合いで、深い夜の底へエスコートする。めったに見せない微笑みが、仮面越しにこぼれる。",
      treat: "おすすめの一品：グレープグミ" },
    { id: "tsukuri", name: "眠雲ツクリ", trait: "夢と現の境でエスコート", line: "「夢みたいな一曲にしよう。目を閉じてみて」",
      desc: "夢と現の境目で、眠たげな声が「大丈夫」と囁く。雲の上を歩くような、ふわふわの一曲になる。",
      treat: "おすすめの一品：雲みたいな綿あめ" },
    { id: "liz", name: "雨夜リズ", trait: "静かな雨音のような寄り添い", line: "「壁際で一息ついたら、次は私と踊ろう」",
      desc: "雨音みたいに静かなステップで、壁際からそっと誘ってくれる。賑やかさが苦手な二人には、ちょうどいい距離感。",
      treat: "おすすめの一品：雨粒みたいな飴" },
    { id: "rei", name: "夕霧レイ", trait: "霧の向こうからそっと手を差し出す", line: "「見つけてくれてありがとう。最後まで一緒だよ」",
      desc: "霧の向こうから現れて、迷子のあなたを見つけてくれる。手を取れば霧が晴れて、ホールの灯りが戻ってくる。",
      treat: "おすすめの一品：夕焼け色のマドレーヌ" },
    { id: "mahoro", name: "鹿乃まほろ", trait: "あたたかい微笑みで包む", line: "「緊張してる？大丈夫、私もだから。一緒にね」",
      desc: "あたたかい微笑みで「私も緊張してる」と打ち明けてくれる。同じ気持ちと知れば、足取りは自然と軽くなる。",
      treat: "おすすめの一品：ミルククッキー" },
    { id: "aoi", name: "海琳あおい", trait: "月夜のテラスへ誘う", line: "「テラスで月を見よう。曲が変わる前に戻ろうね」",
      desc: "踊りの合間にテラスへ連れ出して、月夜と海の話をしてくれる。曲が変わる前に戻る約束が、少しだけ特別に感じる。",
      treat: "おすすめの一品：月光ソーダ" },
    { id: "milchan", name: "ミリちゃん", trait: "館の案内人・全力歓迎", line: "「ようこそホテルへ！最初の一曲は私とね！」",
      desc: "館の案内人として全力歓迎！最初の一曲は基本のステップから丁寧に教えてくれる。初心者にいちばん優しい相手。",
      treat: "おすすめの一品：虹色キャンディ" }
  ];

  /* 各選択肢の加点：[メンバーid, 点] の配列。2=主、1=従 */
  var QUESTIONS = [
    {
      q: "第一問．舞踏会の夜、最初に向かうのは？",
      scene: "開演のファンファーレ。シャンデリアが瞬き、司会の声が響く——",
      a: [
        { t: "シャンデリアの下、踊りの輪へ", s: [["nono", 2], ["raco", 2], ["yura", 2], ["milchan", 2], ["konomi", 1], ["akubi", 1]] },
        { t: "壁際、音楽と様子を楽しむ席へ", s: [["liz", 2], ["rei", 2], ["tsukuri", 2], ["nuhu", 2], ["mahoro", 1], ["aoi", 1]] },
        { t: "テラス、夜風と月を見に行く", s: [["aoi", 2], ["mahoro", 2], ["konomi", 2], ["koma", 2], ["akubi", 1], ["tsukuri", 1]] }
      ]
    },
    {
      q: "第二問．仮面の誰かに声をかけられたら？",
      scene: "仮面の紳士淑女が行き交う中、一人があなたに気づいて——",
      a: [
        { t: "「踊りましょう」と手を差し出す", s: [["nono", 2], ["konomi", 2], ["raco", 2], ["akubi", 2], ["milchan", 1]] },
        { t: "微笑んで少しおしゃべりする", s: [["mahoro", 2], ["aoi", 2], ["liz", 2], ["nono", 1], ["yura", 1]] },
        { t: "仮面の意匠を褒めて打ち解ける", s: [["tsukuri", 2], ["nuhu", 2], ["koma", 2], ["rei", 2], ["yura", 1]] }
      ]
    },
    {
      q: "第三問．鏡の前で仮面を選ぶなら？",
      scene: "鏡の前で仮面を選ぶ刻。どれが今夜のあなたになる？",
      a: [
        { t: "華やかで目立つ金", s: [["raco", 2], ["yura", 2], ["nono", 2], ["milchan", 2], ["akubi", 1]] },
        { t: "夜に溶け込む黒と紫", s: [["rei", 2], ["liz", 2], ["nuhu", 2], ["akubi", 2], ["tsukuri", 1]] },
        { t: "温かみのある手作り感", s: [["koma", 2], ["konomi", 2], ["mahoro", 2], ["aoi", 2], ["milchan", 1]] }
      ]
    },
    {
      q: "第四問．夜食のワゴンが回ってきたら？",
      scene: "休憩のワゴンが回ってきた。甘い香りがホールに漂う——",
      a: [
        { t: "甘いお菓子を分け合う", s: [["konomi", 2], ["koma", 2], ["milchan", 2], ["mahoro", 2], ["yura", 1]] },
        { t: "珍しい飲み物に挑戦する", s: [["akubi", 2], ["nuhu", 2], ["tsukuri", 2], ["rei", 2], ["raco", 1]] },
        { t: "軽いものを少しだけ", s: [["aoi", 2], ["liz", 2], ["yura", 2], ["mahoro", 1], ["rei", 1]] }
      ]
    },
    {
      q: "最終問．0時の鐘が近づいたら、あなたは？",
      scene: "0時の鐘が近づく。魔法が解ける前に——",
      a: [
        { t: "まだまだ踊り続ける", s: [["nono", 2], ["raco", 2], ["yura", 2], ["milchan", 2], ["akubi", 1]] },
        { t: "秘密の階を探しに行く", s: [["akubi", 2], ["nuhu", 2], ["tsukuri", 2], ["rei", 2], ["koma", 1]] },
        { t: "自分の部屋で余韻に浸る", s: [["konomi", 2], ["koma", 2], ["mahoro", 2], ["aoi", 2], ["liz", 2]] }
      ]
    }
  ];

  function $(id) { return document.getElementById(id); }

  function partnerById(id) {
    for (var i = 0; i < PARTNERS.length; i++) if (PARTNERS[i].id === id) return PARTNERS[i];
    return null;
  }

  /* 集計：合計点＋同点時は後の設問で加点された方を優先 */
  function judge(picks) {
    var score = {}, lastHit = {};
    PARTNERS.forEach(function (p) { score[p.id] = 0; lastHit[p.id] = -1; });
    picks.forEach(function (ai, qi) {
      var ans = QUESTIONS[qi].a[ai];
      if (!ans) return;
      ans.s.forEach(function (pair) {
        if (score[pair[0]] == null) return;
        score[pair[0]] += pair[1];
        lastHit[pair[0]] = qi;
      });
    });
    var best = PARTNERS[0], bs = -1, bl = -1;
    PARTNERS.forEach(function (p) {
      var s = score[p.id], l = lastHit[p.id];
      if (s > bs || (s === bs && l > bl)) { best = p; bs = s; bl = l; }
    });
    return best;
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return o && partnerById(o.partner) ? o : null;
    } catch (e) { return null; }
  }
  function saveResult(id) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ partner: id, answeredAt: Date.now() })); } catch (e) {}
  }

  function shareText(p) {
    return "4Fゲームサロンで占ったら、今宵のダンス相手は" + p.name + "でした✦ " + p.line + TAG;
  }
  function openShare(p) {
    var url = "https://x.com/intent/post?text=" + encodeURIComponent(shareText(p))
      + "&url=" + encodeURIComponent(PAGE_URL);
    window.open(url, "_blank", "noopener,width=600,height=520");
  }

  function renderDots(progressEl, step) {
    if (!progressEl) return;
    var html = "";
    for (var i = 0; i < QUESTIONS.length; i++) {
      html += '<span class="salon-dot' + (i < step ? " is-done" : "") + (i === step ? " is-now" : "") + '"></span>';
    }
    progressEl.innerHTML = html;
  }

  function init() {
    var startBtn = $("salonStart"), qWrap = $("salonQuiz"), resultEl = $("salonResult"),
      qText = $("salonQ"), choicesEl = $("salonChoices"), countEl = $("salonCount"),
      dotsEl = $("salonDots"), retryBtn = $("salonRetry"), shareBtn = $("salonShare"),
      lastEl = $("salonLast");
    if (!qWrap || !qText || !choicesEl) return; /* 4F以外では何もしない */

    var step = 0, picks = [];

    /* 前回の相手があれば一行表示（ハブの記録行と共有） */
    var saved = loadSaved();
    if (saved) {
      var sp = partnerById(saved.partner);
      if (sp) {
        if (lastEl) lastEl.textContent = "前回のダンス相手：" + sp.name;
        try { window.__salonLastName = sp.name; } catch (e) {}
      }
    }
    /* 前回結果があれば復元表示（再訪時のおもてなし） */
    if (saved && resultEl) showResult(partnerById(saved.partner), true);

    function start() {
      step = 0; picks = [];
      if (resultEl) resultEl.hidden = true;
      qWrap.hidden = false;
      if (startBtn) startBtn.hidden = true;
      renderQ();
      if (qText) qText.focus && qText.focus();
    }

    function renderQ() {
      var Q = QUESTIONS[step];
      if (countEl) countEl.textContent = "Q" + (step + 1) + " / " + QUESTIONS.length;
      renderDots(dotsEl, step);
      var sceneEl = $("salonScene");
      if (sceneEl) sceneEl.textContent = Q.scene || "";
      qText.textContent = Q.q;
      choicesEl.innerHTML = "";
      Q.a.forEach(function (ans, ai) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "salon-choice";
        b.textContent = ans.t;
        b.addEventListener("click", function () {
          picks[step] = ai;
          step++;
          if (step < QUESTIONS.length) renderQ();
          else finish();
        });
        choicesEl.appendChild(b);
      });
    }

    function finish() {
      var p = judge(picks);
      saveResult(p.id);
      qWrap.hidden = true;
      showResult(p, false);
    }

    function showResult(p, restored) {
      if (!p || !resultEl) return;
      var img = $("salonMask"), nameEl = $("salonName"),
        lineEl = $("salonLine"), traitEl = $("salonTrait"), hintEl = $("salonHint"),
        descEl = $("salonDesc"), treatEl = $("salonTreat");
      if (img) { img.src = "images/masks/" + p.id + ".webp"; img.alt = p.name + "の仮面"; }
      if (nameEl) nameEl.textContent = "✦ " + p.name + " ✦";
      if (lineEl) lineEl.textContent = p.line;
      if (traitEl) traitEl.textContent = "踊りの相性：" + p.trait;
      if (descEl) descEl.textContent = p.desc || "";
      if (treatEl) treatEl.textContent = p.treat || "";
      /* あくび＝10/31生まれの裏パーティへの布石。ネタバレしすぎず一行だけ */
      if (hintEl) {
        if (p.id === "akubi") {
          hintEl.hidden = false;
          hintEl.textContent = "✦ 0時を過ぎたら、噂の秘密の階（13F）の話を聞いてみて。6F客室から鍵の噂を追えます。";
        } else {
          hintEl.hidden = true;
          hintEl.textContent = "";
        }
      }
      resultEl.hidden = false;
      if (!restored && lastEl) lastEl.textContent = "前回のダンス相手：" + p.name;
      try { window.__salonLastName = p.name; } catch (e) {}
      if (shareBtn) shareBtn.onclick = function () { openShare(p); };
      /* 結果へスクロール（ reduced-motion では瞬間移動） */
      try {
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        resultEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
      } catch (e) {}
    }

    if (startBtn) startBtn.addEventListener("click", start);
    if (retryBtn) retryBtn.addEventListener("click", start);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
