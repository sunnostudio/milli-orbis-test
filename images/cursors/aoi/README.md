# MilliOrbis 海琳あおい Cursors for Windows

![preview](preview.png)

**海琳あおい（Aoi）** のオリジナルカーソル 15種（`arrow` / `appstar` / `beam` / `cross` / `hand` / `help` / `move` / `no` / `pen` / `person` / `sizenesw` / `sizens` / `sizenwse` / `sizewe` / `wait`）を Windows のマウスポインターとして使えます。ホットスポット（矢印の先端等）は調整済みです。

## インストール（Windows 10 / 11）— INFで一括登録

1. `MilliOrbis-Aoi.zip` を解凍 → フォルダ `MilliOrbis-Aoi/` を開く
2. `install.inf` を **右クリック → インストール**（Windows 11 は `その他のオプションを表示 → インストール`）→ UACで `はい`
3. `設定 → Bluetoothとデバイス → マウス → その他のマウス設定 → ポインター` を開く
4. `配色`（Scheme）で `MilliOrbis-Aoi` を選択 → `適用` → `OK`

> 右クリックに `インストール` が出ない場合: 解凍できているか確認してください。ZIPのままでは表示されません。代替として `install.bat` を右クリック → 管理者として実行 でも登録できます。

### 手動で割り当てる場合（INFが使えない環境）

`設定 → Bluetoothとデバイス → マウス → その他のマウス設定 → ポインター` で各役割を `参照` から個別に指定 → `名前を付けて保存` で `MilliOrbis-Aoi` を作成。

| Windowsの役割 | ファイル |
|---|---|
| 通常選択 | `arrow.cur` |
| ヘルプ選択 | `help.cur` |
| 動作中(バックグラウンド) | `appstar.cur` |
| ビジー | `wait.cur` |
| 精度選択 | `cross.cur` |
| テキスト選択 | `beam.cur` |
| 手書き | `pen.cur` |
| 使用不可 | `no.cur` |
| 垂直サイズ変更 | `sizens.cur` |
| 水平サイズ変更 | `sizewe.cur` |
| 斜めサイズ変更1 | `sizenwse.cur` |
| 斜めサイズ変更2 | `sizenesw.cur` |
| 移動 | `move.cur` |
| 予備選択 | `arrow.cur` |
| リンク選択 | `hand.cur` |
| 位置選択 | `hand.cur` |
| 人物選択 | `person.cur` |

## アンインストール

`設定 → Bluetoothとデバイス → マウス → その他のマウス設定 → ポインター` で配色を `Windows Default` に戻し、`C:\Windows\Cursors\MilliOrbis-Aoi\` を削除してください。

## ファイル

- `install.inf` — レジストリ登録用（`HKCU\Control Panel\Cursors\Schemes`）。`Cursors.Files` と `[Strings]` のファイル名は完全一致している必要があります。
- `preview.png` — プレビュー画像（本カーソルの `arrow.png` を流用）

## ライセンス

- 個人で楽しむ範囲での利用のみ可。**再配布・転載・販売・商用利用はすべて禁止**です。
- 詳細は同梱の `LICENSE` を参照してください。
- キャラクター等の権利はミリプロ（Million Production）様に、カーソル画像の著作権は作者（すんすん）に帰属します。

## クレジット

- Cursor design: すんすん (@SunSunmachi)
- INF template: [david-ly gist](https://gist.github.com/david-ly/687922256a5c6a7b7b98a52980a984a1) (MIT), [Der-Floh/Cursor-Installer-Creator](https://github.com/Der-Floh/Cursor-Installer-Creator)
