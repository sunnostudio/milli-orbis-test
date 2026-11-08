/* ============================================================
   Milli Orbis seasonal campaigns
   ------------------------------------------------------------
   季節イベントの表示切替をここで一元管理します。
   - start / end は日本時間。この期間だけ「自動」で有効になります。
   - enabled: false は自動では有効になりません（プレビュー用）。
   - データ本体には触れません。表示テーマだけを切り替えます。
   - ORBISTA 特設ページは standalone のため、このファイルを読みません。
   ============================================================ */
window.MILLI_CAMPAIGNS = [
  {
    id: "halloween2027",
    label: "ORBISTA Halloween 2027",
    shortLabel: "Halloween 2027",
    start: "2027-10-01T00:00:00+09:00",
    end: "2027-11-02T00:00:00+09:00",
    enabled: false,
    bar: {
      label: "ORBISTA",
      text: "ORBISTA Halloween 2027 — 2027.10 START",
      shortText: "ORBISTA Halloween 2027 10 START",
      href: "/orbista/"
    },
    spotlight: {
      eyebrow: "ORBISTA SERIES / 2027.10",
      title: "ORBISTA Halloween 2027",
      desc: "Milli Orbisが、夜の怪異の世界に変わる。ハロウィンの特別なイベントを準備中です。",
      href: "/orbista/",
      cta: "ORBISTA特設サイトへ"
    }
  }
];
