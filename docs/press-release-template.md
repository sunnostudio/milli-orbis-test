# プレスリリース追加手順

`data/press-releases.js` の `window.PRESS_RELEASES` にオブジェクトを追加し、`node scripts/gen-news.js` を実行します。生成先は `news/press/<slug>/index.html` です。

## 1. 下書きを追加する

```js
window.PRESS_RELEASES = [
  {
    slug: "christmas-2026",
    published: false,
    date: "2026-12-01",
    updated: "",
    category: "イベント",
    title: "Milli Orbis Christmas 2026 開催決定",
    lead: "クリスマス企画の概要をここに書きます。",
    image: "dist/press/christmas-2026.png",
    imageAlt: "クリスマス企画のキービジュアル",
    imageCaption: "キービジュアル",
    body: `
      <p>本文をHTMLで書きます。</p>
      <h2>見出し</h2>
      <p>段落・リスト・リンクなどが使えます。</p>
    `
  }
];
```

- `slug` は公開URLになります。英小文字・数字・ハイフンだけにしてください。
- `body` はHTMLとしてそのまま埋め込まれます。外部サイトの文章をそのまま転載せず、必要な範囲の引用・要約にとどめてください。
- `image` はサイトルート基準のパス（例: `dist/press/foo.png`）または絶対URLを指定できます。
- `published: false` の間は `noindex,nofollow,noarchive` が付与され、`/news/`・トップページ・ナビ・サイトマップからリンクしません。
- `published: false` はアクセス制限ではありません。URLを知っている人は閲覧できます。本格的な非公開が必要な場合は、別途アクセス制限を検討してください。

## 2. 下書きを生成する

```sh
node scripts/gen-news.js
```

表示例:

```text
generated: news/press/christmas-2026/ (noindex)
```

生成されたURLを直接共有してください。

## 3. 公開する

1. `published: true` に変更します。
2. `node scripts/gen-news.js` を再実行します。
3. `data.js` の `NEWS` 配列の先頭に、通常のお知らせと同じ形式で1件追加します。`url` は `/news/press/<slug>/` にします。
4. 必要に応じて `data/news-archive.js` ではなく、通常の `NEWS` 側で管理します。公開後も同じURLのままです。

```js
{
  date: "2026-12-01",
  tag: "イベント",
  title: "Milli Orbis Christmas 2026 開催決定",
  desc: "クリスマス企画の概要。",
  image: "dist/press/christmas-2026.png",
  url: "/news/press/christmas-2026/"
}
```

`published: true` で再生成すると `noindex` が外れます。`/news/` への掲載は自動ではないため、`NEWS` への追加を忘れないでください。
