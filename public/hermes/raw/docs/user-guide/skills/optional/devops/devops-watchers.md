---
title: "Watchers — RSS・JSON API・GitHub を定期的に見に行き、既読の印で重複を省く"
description: "RSS・JSON API・GitHub を定期的に見に行き、既読の印で重複を省く"
upstream_path: user-guide/skills/optional/devops/devops-watchers.md
upstream_blob: b1860772f7b217648a161850b8a2ddf47f4e6823
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-watchers
---

# Watchers {#watchers}

RSS・JSON API・GitHub を定期的に見に行き、既読の印で重複を省きます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/devops/watchers` で入れます |
| パス | `optional-skills/devops\watchers` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `cron`, `polling`, `rss`, `github`, `http`, `automation`, `monitoring` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Watchers {#watchers}

外部の情報源を一定の間隔で見に行き、新しいものにだけ反応します。すぐ使えるスクリプトが 3 本と、既読の印を扱う共通の部品が付いています。cron に組み込んでもいいですし、必要なときに端末から手で動かしても構いません。

## 使う場面 {#when-to-use}

- RSS / Atom のフィードを見張って、新しい記事を知らせてほしいとき
- GitHub リポジトリの issue / pull request / リリース / コミットを見張りたいとき
- 好きな JSON のエンドポイントを定期的に見に行き、新しい項目が出たら知らせてほしいとき
- 「X を見張るものを作って」「X が変わったら教えて」と頼まれたとき

## 考え方 {#mental-model}

見張り役は、次のことをするだけのスクリプトです。

1. 外部の情報源からデータを取ってくる
2. これまでに見た ID を記録したファイルと突き合わせる
3. 新しい記録を書き戻す
4. 新しいものを標準出力に出す（何もなければ何も出さない）

下で紹介するスクリプトは、この 3 つをまとめて面倒を見ます。エージェントは terminal ツールからこれらを実行し（cron のジョブでも、Webhook からでも、対話の途中でも構いません）、新しく出たものを報告します。

## すぐ使えるスクリプト {#ready-made-scripts}

3 本とも、skill を入れると `$HERMES_HOME/skills/devops/watchers/scripts/` に置かれます。どれも状態ファイルの置き場として `WATCHER_STATE_DIR`（既定は `$HERMES_HOME/watcher-state/`）を読み、`--name` に渡した名前で区別します。

| スクリプト | 見張る対象 | 重複を省く鍵 |
|---|---|---|
| `watch_rss.py` | RSS 2.0 か Atom のフィードの URL | `<guid>` / `<id>` |
| `watch_http_json.py` | オブジェクトの配列を返す JSON のエンドポイント全般 | 設定できる id のフィールド |
| `watch_github.py` | リポジトリの issue / pull request / リリース / コミット | `id` / `sha` |

3 本に共通する点:

- 初回の実行は基準を記録するだけ — すでにあるフィードを流し直しません
- 記録する ID は上限つき（最大 500 件）で、メモリが膨らまないようにしています
- 出力の形式は項目ごとに `## <title>\n<url>\n\n<optional body>`
- 新しいものがなければ標準出力は空 — 呼び出す側はそれを「何もなし」として扱います
- 取得に失敗したときは 0 以外の終了コードを返します

## 使い方 {#usage}

terminal ツールから直接実行します。

```bash
python $HERMES_HOME/skills/devops/watchers/scripts/watch_rss.py \
  --name hn --url https://news.ycombinator.com/rss --max 5
```

GitHub のリポジトリを見張ります（匿名だと 1 時間あたり 60 回の制限に当たるので、`${HERMES_HOME:-~/.hermes}/.env` に `GITHUB_TOKEN` を設定してください）。

```bash
python $HERMES_HOME/skills/devops/watchers/scripts/watch_github.py \
  --name hermes-issues --repo NousResearch/hermes-agent --scope issues
```

好きな JSON の API を見に行きます。

```bash
python $HERMES_HOME/skills/devops/watchers/scripts/watch_http_json.py \
  --name api --url https://api.example.com/events \
  --id-field event_id --items-path data.events
```

## cron に組み込む {#wiring-into-cron}

cron のジョブを組んでほしいと、こんなふうにエージェントに頼みます。

> 15 分おきに `watch_rss.py --name hn --url https://news.ycombinator.com/rss` を実行してください。何か出たら見出しをまとめて届けてください。何も出なければ黙っていてください。

エージェントは cron のジョブの中のエージェントのループから、terminal ツール経由でスクリプトを呼びます。cron に組み込みの `--script` フラグを変える必要はありません。

## 状態ファイル {#state-files}

どの見張り役も `$HERMES_HOME/watcher-state/<name>.json` を書きます。中を見るには、こうします。

```bash
cat $HERMES_HOME/watcher-state/hn.json
```

もう一度最初から流し直したい（次の実行を初回として扱いたい）ときは、こうします。

```bash
rm $HERMES_HOME/watcher-state/hn.json
```

## 自分で書く {#writing-your-own}

3 本のスクリプトはどれも同じ型です。既読の印を読み、取ってきて、差分を出し、保存し、出力する。共通の部品は `scripts/_watermark.py` で、これを import すれば、書き込みの安全性・ID 件数の上限・初回の基準づくりがそのまま手に入ります。どれだけ短く書けるかは、3 本のどれを見てもわかります。

## よくつまずくところ {#common-pitfalls}

1. **毎回「新着なし」の見出しを出してしまう。** 呼び出す側は「標準出力が空＝何もなし」と決めてかかっています。差分が空のときに何か出すと、通知先を埋め尽くしてしまいます。同梱のスクリプトは気をつけていますが、自作のものも同じようにしてください。
2. **初回の実行で項目が出ると思い込む。** 出ません。初回は基準を記録するだけです。最初にまとめて受け取りたいなら、初回の実行後に状態ファイルを消すか、自作のスクリプトに `--prime-with-latest N` のようなフラグを足してください。
3. **既読の印が際限なく増える。** 共通の部品は 500 件で頭打ちにします。更新の多いフィードでは増やし、容量の厳しいファイルシステムでは減らしてください。
4. **エージェントのサンドボックスから書けない場所を状態の置き場にする。** `$HERMES_HOME/watcher-state/` なら必ず書けます。Docker や Modal のバックエンドからは、ホスト側の任意のパスが見えないことがあります。
