# Discord自動通知 (グッズ / イベント) 運用メモ

非公式Discordサーバー向け。YouTube系は Milli Unishare 側で実装済みのため対象外。
このリポジトリからは **グッズ** と **イベント/コラボ** のみ通知する。

## チャンネル構成

| 用途 | Secrets名 | スクリプト |
|---|---|---|
| グッズch | `DISCORD_WEBHOOK_GOODS` | `tools/notify-goods.js` (新着) + `tools/notify-digest.js` (当日締切) |
| イベントch | `DISCORD_WEBHOOK_EVENTS` | `tools/notify-events.js` (新着) + `tools/notify-digest.js` (当日分) |

## セットアップ

1. Discord側で対象チャンネル → チャンネル設定 → 連携サービス → ウェブフック → 新規作成 → URLコピー (2ch分)。
2. GitHubリポジトリ → Settings → Secrets and variables → Actions → New repository secret:
   - `DISCORD_WEBHOOK_GOODS`
   - `DISCORD_WEBHOOK_EVENTS`
3. Actions → "Discord Notify" → Run workflow でログ確認 (既定 `dry_run: true` = 投稿なし) → 本番は `dry_run: false` で実行。
   ⚠️ ワークフロー画面の「再実行 (Re-run)」は**元のコミットにピン留め**され、古いコード・古いstateで再送されるため二重投稿になる。流し直しは必ず Run workflow で**新規実行**すること。

## 動作

- **即時**: `data.js` / `data/collabs.json` / `data/goods-collab.js` / `data/goods-fetched.json` へのpushで起動。新規ID/ハッシュのみ投稿。
  - 公式グッズは `goods-fetch.yml` (毎夜03:00 JST) 内でも直接通知 → push契機の二重投稿は `data/notify-state.json` で抑止 (冪等)。
- **グッズは括りまとめ** (`tools/goods-group.js`): 「○○誕生日記念グッズ」等の同時発売単位で**Embed1個**にまとめる (縦長防止のため商品別画像Embedはなし)。
  - 括りキー = タイトル共通部 + 発売日 + 締切日 (別企画の同日被りは分離)。
  - 本文にタレント**全員**・受注期間・価格帯。商品は inline 3列グリッド (商品名・価格・リンク)。画像はキービジュ (フルセット系優先) 1枚のみ。
- **イベントは画像付き**: 記事画像 ＞ メンバー顔写真 (`images/talents/`) ＞ サイトロゴ の順で必ず画像を添付。
  - 誕生日/記念日・カウントダウン (`xxx.html` からメンバー特定) は顔写真。`collabs.json` はロゴ (将来 `image` フィールド追加で差し替え可)。
- **定期**: 毎日08:00 JST (`cron: 0 23 * * *`) に当日分のみ:
  - グッズ: `period.orderTo` が今日 (JST) のもの。常設・売切除外。0件の日は投稿なし。締切も括り表示。
  - イベント: 今日発生のEVENTS (誕生日/記念日含む) + `date` が今日のCOUNTDOWN + 期間に今日を含むcollabs。0件の日は投稿なし。
- 全文に `※非公式ファンサーバーによる自動通知です` を付与。

## cronサボり対策 (GitHub Actionsのschedule遅延・欠落)

GitHubのscheduleは遅延 (5〜15分) や、長期無操作 (60日) での無効化がありうる。対策:

1. **本命**: `schedule-image.yml` が毎日画像commitするため無操作無効化は実質回避できている。digestは08:00に加え手動再送可能。
2. **予備 (任意)**: cron-job.org の無料枠でバックアップ起動:
   - cron-job.org → Create cronjob → URLは使わず「advanced」ではなく、GitHub APIを叩く外部スクリプト形態が確実。
   - 簡易版: Fine-grained PAT (`Actions: read/write`) を発行 → cron-job.orgから毎日08:10 JSTに以下をPOST:
     ```
     POST https://api.github.com/repos/<owner>/<repo>/actions/workflows/notify.yml/dispatches
     Authorization: Bearer <PAT>
     {"ref":"main","inputs":{"mode":"digest","dry_run":"false"}}
     ```
   - `digests` に日付キーが入るため、万が一scheduleと二重起動しても二重投稿されない。
3. **確認**: Actions → notify → 履歴で `Daily digest` が実行されているか週1で目視。来ていない日はRun workflowから手動実行。

## テスト

```bash
# ログのみ (投稿なし)
node tools/notify-goods.js --dry-run
node tools/notify-events.js --dry-run
node tools/notify-digest.js --dry-run
node tools/notify-digest.js --dry-run --date 2026-10-12  # 締切日指定テスト
# 指定括りのテスト投稿 (例: 魔法少女コレクション。stateは更新されない)
node tools/notify-goods.js --dry-run --test-filter 魔法少女コレクション

# state初期化 (初回・Secrets未設定時)
node tools/notify-goods.js --init
node tools/notify-events.js --init

# 強制再送 (テストch向け)
DISCORD_WEBHOOK_GOODS=... node tools/notify-goods.js --force --limit 3
```

## 注意

- 初回は全件を投稿せずstate登録のみ (スパム防止)。流したい場合は `--force`。
- Embedは10件/メッセージで自動分割。大量追加日は複数メッセージになる。
- `milpr.com/news` 自動取得は未実装 (STUDIO製SPAで壊れやすいため)。当面は手動で `NEWS` 追記 → push即時通知で運用。
- 画像なし商品 (ベルハウス/タイトー/セガ等、規約でホットリンク不可) はテキストのみ通知。
