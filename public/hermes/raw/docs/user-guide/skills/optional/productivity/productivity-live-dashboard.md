---
title: "Live Dashboard — 生の情報源から、自動で更新されるダッシュボードを作る"
description: "生の情報源から、自動で更新されるダッシュボードを作る"
upstream_path: user-guide/skills/optional/productivity/productivity-live-dashboard.md
upstream_blob: 9640b311fba8a61044a2fa2999e84f4026b09b0c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-live-dashboard
---

# Live Dashboard {#live-dashboard}

生の情報源から、自動で更新されるダッシュボードを作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で導入します。`hermes skills install official/productivity/live-dashboard` で入ります |
| パス | `optional-skills/productivity/live-dashboard` |
| バージョン | `0.2.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `dashboards`, `monitoring`, `status`, `automation`, `reporting` |
| 関連 skill | [`product-price-monitor`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-product-price-monitor/), [`competitor-news-monitor`](/hermes/docs/user-guide/skills/bundled/research/research-competitor-news-monitor/), [`email-inbox-triage`](/hermes/docs/user-guide/skills/bundled/email/email-email-inbox-triage/), [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Live Dashboard {#live-dashboard}

「ビザ申請のダッシュボードを作って、メールのスレッドと申請状況のサイトから毎日更新して」のような1文を、ずっと残り、自分で更新し続ける状況ページに変えます。ユーザーは見たいものを説明するだけです。あなた（エージェント）はデータの取り決めを定め、それだけで完結する HTML のダッシュボードを作り、実際の更新を1回確かめてから、定期的な更新を予約します。

準備は最初に1回だけ、手前で実行します。定期的な更新は `cronjob` の定期実行として動きます。この skill を導入すると、すべてのダッシュボードを毎日まとめて更新する処理を `/suggestions` から提案します（frontmatter にある設計図です）。

## こんなときに使います {#when-to-use}

- 「&lt;project/process> のダッシュボードを作って、更新し続けて」
- 「&lt;deals / applications / bugs / shipments> の状況を1か所で見たい」
- 「メールと &lt;website> にまたがって &lt;thing> を追いかけて、今どうなっているか見せて」
- 「&lt;slug> のダッシュボードを見せて」（既存のものを描き直す、またはプレビューする）
- 既存のダッシュボードに対して cron の定期実行が発火したとき（手順 5〜7）。

次の用途には使いません: 一度きりの状況の質問（直接答えます）、1つの商品の価格や在庫のしきい値（`product-price-monitor` を使います）、企業ニュースの追跡（`competitor-news-monitor` を使います）。

## 事前に必要なもの {#prerequisites}

- ダッシュボードが読みに行く情報源への接続が、少なくとも1つあること。メールやカレンダーは `himalaya` か `google-workspace`、Web サイトは `web_extract` か `browser_navigate`、ローカルのファイルは `read_file` で読みます。1つも設定されていない場合は、成果物を書く前に、手順 1 で情報源を決め直します。
- 定期実行のための `cronjob`。
- 任意: `desktop_preview` ツール（Hermes デスクトップアプリのセッション）。ツールセットにこれがある場合、ダッシュボードはアプリ内のプレビュー欄に表示されます。ない場合は、ユーザーにファイルのパスを伝えます。

## 手順 — 準備（手前で、1回だけ） {#procedure-setup-foreground-once}

### 1. ダッシュボードの取り決めを定める {#1-define-the-dashboard-contract}

ユーザーの1文から、次のことを確定させます。ダッシュボードの目的を1行で、追跡する対象（行）、対象ごとの項目（列や指標）、「対応が必要」とは何を指すか、各項目をどの情報源から読むか、更新の頻度です。あいまいな点は質問してください。追跡する粒度を間違えたダッシュボードには価値がありません。ダッシュボードのすべての項目に、読み取り元の情報源が書かれていれば完了です。

### 2. 各情報源を実際に1回読んで確かめる {#2-verify-each-source-with-one-live-read}

情報源ごとに、範囲を限った読み取りをいま手前で1回行います。メールやカレンダーは接続用の skill（`himalaya`、`google-workspace`）、Web サイトは `web_extract` か `browser_navigate`、ローカルのファイルは `read_file` で読みます。実際に何が取得できたかを記録してください。ログインの壁、権限の不足、空の結果は、最初の定期実行ではなく、ここで表に出てきます。失敗した情報源は外すか、別のものに差し替えます。すべての項目の情報源が実際のデータを返したか、ユーザーとはっきり決め直したら完了です。

### 3. ダッシュボードの成果物を作る {#3-build-the-dashboard-artifact}

Hermes のホームディレクトリにある `dashboards/<slug>/` の下に、2つのファイルを書きます（`config.yaml` があるのと同じディレクトリです。場所が決まっていると思い込まないでください）。

- `dashboard.json` — 取り決めと現在の状態です。目的、対象、項目ごとの値、項目ごとの情報源と取得時刻、`needs_attention` の一覧、変更履歴（追記のみ、新しいものが先頭）を持ちます。
- `index.html` — 状態を表示する、それだけで完結する1枚の HTML ページです（CSS はインラインで、外部へのリクエストはしません）。目的と最終更新時刻を載せたヘッダー、いちばん上に「対応が必要」の欄、対象の表、最近の変更の一覧を並べます。更新のたびに `dashboard.json` から作り直し、HTML の中の状態を手で編集することは決してしません。

手順 2 で読んだ内容で両方を埋め、結果を見せます（手順 8）。ページに実際のデータが表示され、そこに出ているすべての値の取得時刻が `dashboard.json` に記録されていれば完了です。

### 4. 更新を予約する {#4-schedule-the-refresh}

手順 3 が成功してから、定期実行を予約します。`/suggestions` から、すべてのダッシュボードを毎日まとめて更新する処理がすでに予約されていて、その頻度で問題なければ、このダッシュボードもそこで拾われます。そう伝えて終わりにします。そうでなければ、状態ファイルを名指ししたプロンプトで、このダッシュボード専用のジョブを作ります。

```
cronjob(action="create",
        schedule=<cadence from the contract, e.g. "0 8 * * *">,
        prompt="Load the live-dashboard skill and run the refresh tick for the dashboard at <absolute path to dashboards/<slug>/dashboard.json>.",
        deliver=<user's destination>)
```

頻度は、情報源の回数制限を守れるものを選んでください。このダッシュボードを受け持つジョブがあり、そのプロンプトに状態ファイルのパス（またはまとめて更新する処理）が書かれていれば完了です。

## 手順 — 定期実行（予約した実行のたびに） {#procedure-tick-each-scheduled-run}

### 5. 情報源を読み直して差分を取る {#5-re-read-sources-and-diff}

`dashboard.json` を読み込み（まとめて更新する処理の場合は、`dashboards/*/dashboard.json` をすべて、1つずつ）、各項目を指定された情報源から読み直して、保存済みの状態と項目単位で差分を取ります。情報源の読み取りに失敗したら、状態は「不明」です。最後に正しく取れた値を残し、その項目に失敗した時刻を添えて古いデータとして印を付けます。正しいデータをエラーで上書きすることは決してしません。すべての項目が、更新された・変わらなかった・古いと明示された、のどれかになれば完了です。

### 6. 状態を更新して描き直す {#6-update-state-and-re-render}

差分を `dashboard.json` に反映します。値と時刻を更新し、意味のある変更を変更履歴に追記し、取り決めにある「対応が必要」の条件に照らして `needs_attention` を計算し直します。更新した状態から `index.html` を作り直し、結果を見せます（手順 8）。JSON と HTML の内容が一致し、今回の実行の変更履歴が記録されていれば（または変更なしの実行として記録されていれば）完了です。

### 7. 意味のある変更があれば届け、なければ黙っている {#7-deliver-on-material-change-else-stay-silent}

差分に意味のある変更や、新しく対応が必要になった項目があれば、短い要約を届けます。何が変わったか、何に対応が必要か、ダッシュボードがどこにあるかです。そうでなければ `[SILENT]` で応答します。ユーザーが定期的なまとめを求めていないかぎり、「引き続き見ています」のような雑音は出しません。届けた内容が差分と合っていれば完了です。

## 手順 — ダッシュボードを見せる（作成や描き直しのたびに、また求められたとき） {#procedure-show-the-dashboard-after-every-build-or-re-render-and-on-request}

### 8. ユーザーが見られる場所に表示する {#8-render-where-the-user-can-see-it}

- デスクトップ/GUI のセッション（ツールセットに `desktop_preview` がある）: `desktop_preview(action="open", url=<absolute path to index.html>, label=<dashboard purpose>)` を実行して、チャットの横のプレビュー欄にページをそのまま表示します。描き直すたびに開き直し、欄に新しい状態が出るようにします。
- それ以外のセッション（CLI、メッセンジャー、GUI のない cron の定期実行）: `index.html` の絶対パスを伝え、プラットフォームが許す場合は開くことを申し出ます。

ユーザーが表示されたページを見たか、ページがどこにあるかを正確に伝えられたら完了です。

## つまずきやすいところ {#pitfalls}

- 情報源を確かめる前にページを作ること。そうするとログインの失敗が、誰も見ていない実行のときに表に出ます。
- 最後に正しく取れた値を、エラーページや空の読み取り結果で上書きすること。
- 状態を HTML にだけ書き込むこと。正本は `dashboard.json` で、HTML はそれを映したものにすぎません。
- 意味のある変更があったときではなく、更新のたびに通知すること。
- 追跡する粒度を間違えること（ユーザーは申請ごとで考えているのに、スレッドごとで追うなど）。
- Hermes のホームのパスを決め打ちすること。動いているインストールから割り出し（`config.yaml` があるディレクトリ）、cron のプロンプトには絶対パスを書きます。
- デスクトップのセッション以外で `desktop_preview` を呼ぶこと。このツールがツールセットにあるのは GUI のセッションだけです。ない場合はパスを伝える方法に切り替えます。

## 確認 {#verification}

- [ ] ダッシュボードのすべての項目に情報源が書かれていて、どの情報源も予約の前に手前での読み取りを1回通過している。
- [ ] `dashboard.json` と `index.html` があり、内容が一致している。すべての値に取得時刻が付いている。
- [ ] 読み取りに失敗した項目は、最後に正しく取れた状態を壊さずに、古いデータとして印が付いている。
- [ ] 定期実行は意味のある変更があったときだけ届けていて、変更のなかった実行は `[SILENT]` だった。
- [ ] 変更履歴を使えば、状態ファイルだけからダッシュボードの経緯をたどり直せる。
- [ ] ダッシュボードがプレビュー欄に表示された（デスクトップ）か、パスが伝えられた（それ以外）。
