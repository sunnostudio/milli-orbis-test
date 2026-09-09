# お問い合わせ集結ハブ仕様（MilliDex／全サービス共通）

作成日: 2026-09-06 / 実装: `scripts/contact.js`（送信基盤）＋2系統モーダル

## 1. 概要

- 本ポータルを窓口に、2系統のお問い合わせを受け付ける
  - ① 全サービスへのお問い合わせ：`Milli Orbis／Milli Unishare／Milli Games／その他`
  - ② MilliDexへのお問い合わせ：`有志マップ／過去グッズ申請`
- 投稿は共有 Firebase（millipro-shared）の `contactQueue` に `status:pending` で蓄積。
  運営がコンソールで精査し、`data/sightings.json`・グッズデータへ手動反映する（既存PRレビュー運用と接続）。
- 未ログイン投稿を許可（honeypot＋1分1件制限）。荒らし時はログイン必須へ切替可能な作り。

## 2. データ仕様 `contactQueue/{pushId}`

| field | 型 | 必須 | 内容 |
|---|---|---|---|
| `entry` | string | ○ | `service`（①）／`millidex`（②） |
| `target` | string | ○ | ①：`orbis`／`unishare`／`games`／`other`。②：`map`／`goods` |
| `kind` | string | △ | ①のみ種別：`request`（追加依頼）／`bug`（バグ報告）／`remove`（削除依頼）／`other`（その他）。未指定時は `other` |
| `email` | string | ①のみ○ | ①のみ必須（迷惑行為防止）。形式 `*@*.*`・5〜200字 |
| `serviceNote` | string | △ | `target:other` 時のサイト名等（最大100字） |
| `subject` | string | △ | ①のみ件名（最大100字） |
| `body` | string | ○ | 本文（最大2000字。②map/goodsでは補足・コメント欄） |
| `fields` | object | ○ | 種別固有項目（下表。値は文字列・最大200字/項目） |
| `contact` | string | — | 連絡先（最大200字）。①ではXアカウント、②ではX IDやメール等の任意記入 |
| `uid` | string/null | ○ | Firebase uid（未ログインは `null`。匿名表示の運用） |
| `status` | string | ○ | `pending`（運営が `approved`／`rejected` に更新） |
| `createdAt` | number | ○ | `Date.now()` |
| `ua` | string | — | UA先頭120字（任意・運用参考） |

`fields`（種別固有・すべて文字列）：

- `target:map`：`shop`（店舗名・必須）／`pref`（都道府県・必須）／`date`（目撃日・任意）／`item`（グッズ名・必須）／`member`（タレントID・任意）
- `target:goods`：`item`（グッズ名・必須）／`url`／`image`／`price`／`period`（販売時期・いずれも任意）
- `target:orbis|unishare|games|other`：`fields:{}`（本文のみ）

## 3. 貼付用 Realtime Database ルール（コンソール作業）

既存ルールに以下を**追記**して公開する。`contactQueue` 以外には触らないこと。

```json
"contactQueue": {
  "$id": {
    ".write": "newData.exists() && !data.exists()",
    ".read": "false",
    ".validate": "newData.hasChildren(['entry','target','body','fields','status','createdAt']) && newData.child('status').val() === 'pending' && (newData.child('entry').val() === 'service' || newData.child('entry').val() === 'millidex') && (newData.child('target').val() === 'orbis' || newData.child('target').val() === 'unishare' || newData.child('target').val() === 'games' || newData.child('target').val() === 'other' || newData.child('target').val() === 'map' || newData.child('target').val() === 'goods') && newData.child('body').isString() && newData.child('body').val().length > 0 && newData.child('body').val().length <= 2000 && (!newData.hasChild('kind') || newData.child('kind').val() === 'request' || newData.child('kind').val() === 'bug' || newData.child('kind').val() === 'remove' || newData.child('kind').val() === 'other') && (newData.child('entry').val() !== 'service' || (newData.child('email').isString() && newData.child('email').val().length >= 5 && newData.child('email').val().length <= 200 && newData.child('email').val().matches(/^[^@]+@[^@]+[.][^@]+$/)))"
  }
}
```

※ `.read:false` のため一覧閲覧・承認操作は Firebase コンソール（管理者権限）で行う。
※ 未ログイン許可のため `.write` は認証不問。荒らし発生時は `"auth != null &&"` を先頭に付与してログイン必須化する。

## 4. 運用手順

1. Firebaseコンソール → Realtime Database → `contactQueue` で `status:pending` を確認
2. 内容精査：
   - `target:map` → 妥当なら `data/sightings.json` に `status:approved` で追記（緯度経度を補完）→ PR
   - `target:goods` → 妥当ならグッズデータへ追記 → PR
   - `target:orbis|unishare|games|other` → 対応（返信が必要なら `contact` 欄宛て）
3. 対応済みレコードの `status` を `approved`／`rejected` に更新
4. 迷惑投稿が続く場合は rules に `auth != null &&` を追加（本書§3参照）

## 5. 他サイト向け申送り（集結の契約）

- 各サイト（Milli Unishare／Milli Games 等）は同一PJの `contactQueue` へ `push()` するだけでよい
- 必須フィールドは本書§2の表通り。`entry` は各サイト任意の値でよいが `target` は上記 enum を使うこと（`other`＋`serviceNote` で拡張可）
- 承認・表示は本ポータル側に集約する。各サイト側に閲覧UIは作らない

## 6. 実装メモ（本リポジトリ）

- `scripts/contact.js`：`pushContact(entry, target, data)`／honeypot（`company` 欄）／1分1件制限（localStorage `milli-contact-last`）／未設定・rules未適用時の画面案内
- モーダルは `acct-overlay`／`acct-box` 意匠を流用し `scripts/contact.js` 内で生成（各頁HTMLは触らない）
- 専用ページ `contact.html`：`ContactHub.renderPageForm()` でインライン描画（`?entry=`・`?target=` で初期選択可）。他画面からの導線は未設置
- テスト用直リンク：`?contact=service`／`millidex-map`／`millidex-goods`（`openFromUrl` が自動オープン。UI導線は出さない）
- 導線：全頁フッター＋全頁ドロワーへ2リンク注入（`script.js boot` から `ContactHub.inject()` 呼び出し）。`goods/map.html` の提供リンク・`goods/archive.html` の追加依頼ボタンは各専用フォームへ直結
