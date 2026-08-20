---
title: "Box — Box でクラウド上のファイル、共有、検索、メタデータを扱う"
description: "Box でクラウド上のファイル、共有、検索、メタデータを扱う"
upstream_path: user-guide/skills/bundled/productivity/productivity-box.md
upstream_blob: ed5f012031e5499b7ef67dd8b1f914702505c4d8
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-box
---

# Box {#box}

Box でクラウド上のファイル、共有、検索、メタデータを扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/box` |
| バージョン | `1.0.0` |
| 作者 | Chris Kim (iskysun96), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Box`, `Productivity`, `Cloud Storage`, `Collaboration`, `Metadata`, `Content Extraction`, `CLI`, `SDK` |
| 関連 skill | [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Box {#box}

Box をクラウド上のファイルシステムとして扱い、ファイルの操作、共同作業、メタデータ、書類まわりの作業を進めます。操作は Hermes の `terminal` ツールから Box CLI で実行します。アプリケーションを作る場合は SDK の手引きを読んでください。

## 使いどころ {#when-to-use}

- Box のファイルやフォルダを整理する、アップロードする、版を管理する、移動する、共有する、共同で編集する
- Box の中身や、すでに付いているメタデータを検索する
- Box のファイルについて質問する、メタデータを取り出す、ファイルを根拠にした文章を作る
- 元のファイルをすべてダウンロードすることなく、Box のフォルダをまとめて処理する
- Box を土台にしたアプリケーション、連携、Webhook の受け口を作る

## クラウドのファイル管理という広い相談から始まったとき {#start-broad-file-system-conversations}

Hermes 用にクラウドのファイル管理を検討している段階なら、まず短く向き不向きを伝えます。Box は、チームでクラウドにファイルを置き、共有・検索・メタデータ・書類まわりの作業をしたいときに向いています。そのうえで、OAuth で Box のアカウントをつなぎたいのか、SDK で Box を土台にしたアプリケーションや連携を作りたいのかを尋ねます。

OAuth を使うと、Hermes はブラウザで認可した Box のアカウントとして動きます。そのアカウントが Box 上で持っている権限が、そのまま Hermes に見える範囲になります。範囲を狭めたい場合は、必要なファイル・フォルダ・Hub にだけ招待されているアカウントで認可してもらいます。

広く探っている段階の質問に対して、セットアップを始めたり、コマンド集を見せたり、アカウントの構成案やフォルダの分類を提案したり、参考資料を全部読み込んだりしないでください。相手の答えを待ってから、必要な道すじだけを読み込みます。依頼の時点でやりたいことがはっきりしているなら、この確認は飛ばして、そのまま取りかかります。

ふだんの CLI の作業は、公式の Box CLI の OAuth アプリで始めます。これで通常の内容の操作と Box AI はまかなえます。Webhook の管理のように追加の OAuth スコープが必要な操作のときだけ、独自の **User Authentication (OAuth 2.0)** のプラットフォームアプリを使います。これも OAuth の流れであることに変わりはありません。サーバー側の資格情報や、なりすましの資格情報で代用しないでください。

## 選ばれたセットアップは対話しながら実施する {#perform-chosen-setup-interactively}

認証の方法が選ばれたとき、あるいは Box につないでほしいと頼まれたときは、`terminal` からセットアップを実施します。次の返答を、相手が写して実行するための手順書にしないでください。安全にできる次の一手は自分で進め、承認・ブラウザでのサインイン・管理者の操作・Hermes が安全に用意できない秘密の入力が必要なときだけ止まります。

- `box` が入っていない場合は、いまの Hermes ホームの下の `tools/box-cli` に `@box/cli` を入れるために必要な、ターミナル操作の承認をもらいます。入れたら、[CLI ガイド](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/cli-guide.md) にあるシェルに合ったコマンドで動作を確かめます。npm のグローバルインストール、`sudo`、npm のグローバル prefix の変更、`PATH` の変更はしないでください。
- OAuth を始める前に、こう尋ねます。**「Hermes は、Box の認可に使うブラウザと同じ端末で動いていますか。それとも VPS・コンテナ・クラウド VM のような別のホストで動いていますか」**。同じ端末のときだけ、ふつうの `box login` を使います。リモートや画面のない環境では `box login --code` を使います。OS の種類だけで実行環境を判断しないでください。相手の答えを聞いてから [OAuth のセットアップ](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/oauth-setup.md) を読みます。
- ブラウザでの認可を始める前に、Hermes はそこでサインインした Box のアカウントとして動くことを伝えます。範囲を狭めたい場合は、必要なファイル・フォルダ・Hub にだけ招待されているアカウントで認可できます。例外的な操作を通すために、そのアカウントを管理者にしないでください。
- 独自の OAuth プラットフォームアプリが必要な場合は、CLI の対話式のプラットフォームアプリの流れを使います。クライアントシークレットは、ローカルの CLI のプロンプトにだけ入力してもらいます。チャットで聞き出したり、Hermes の設定に書いたり、コミットしたりしないでください。
- インストール、ブラウザでの認可、環境の切り替え、権限の変更に承認が必要なときは、その承認を求めて、通ったところからセットアップを再開します。操作の代わりにコマンドの一覧を出すのはやめてください。

## 作業のはじめに {#start-each-task}

1. CLI と、いまどのアカウントとして動いているかを確認します。POSIX 系のシェルなら `command -v box`、PowerShell なら `Get-Command box -ErrorAction SilentlyContinue` で調べます。`box` が `PATH` にあればそれを使います。Hermes がいまのホームの下に CLI を入れた場合は、先頭の `box` をすべて、[CLI ガイド](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/cli-guide.md) にあるシェルに合った確認済みの起動方法に置き換えます。そのうえで `box users:get me --json --fields id,name,login` を実行します。
   これが通れば、どのアカウントかを控えて先に進みます。認証について改めて尋ねないでください。`folders:items 0` はそのアカウントのルートを一覧しているだけで、共有されたファイル・フォルダ・Hub が見えないことの証拠にはなりません。ファイルやフォルダの ID が分かっているならそれを直接確かめます。Hub の場合は [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/hubs.md) にある Hub の見つけ方に従います。
2. 認証されていない場合は、OAuth で Box のアカウントをつなぐことを提案し、Hermes と認可用のブラウザが同じ端末か別のホストかを尋ねます。[OAuth のセットアップ](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/oauth-setup.md) を読みます。
3. 操作する前に、対応する参考資料を読みます。まずは資料に載っているコマンドを使い、資料にないオプションが必要なときや、入っている CLI が載っている形を受け付けないときだけ、サブコマンドのヘルプを見ます。

`bash` と書かれた例は POSIX の行継続の書き方です。PowerShell では Box のコマンドを 1 行で書くか、行末の `\` を PowerShell のバッククォートの行継続に置き換えてください。POSIX の変数代入をそのまま PowerShell に貼り付けないでください。

## CLI にない操作でも止まらない {#extend-the-cli-without-pausing}

Box CLI に専用のサブコマンドがないときは、対応する REST のエンドポイントを `box request` で呼んで、そのまま作業を続けます。実装が REST になるというだけの理由で、相手に選ばせないでください。同じ Box の作業であり、CLI に設定された資格情報もそのまま使われます。リクエストの本文や独自のヘッダーが必要なときは [REST API での代替](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/rest-api.md) を読みます。

削除、共同編集者や共有リンクや権限の変更、アカウントの切り替え、広い範囲や費用のかかるまとめての書き換え、対象や範囲があいまいなときは、先に確認を取ります。それ以外は、頼まれた操作を実行して、結果を確かめます。

## どの資料を読むか {#choose-the-right-path}

| やりたいこと | 読むもの |
| --- | --- |
| CLI の書き方、環境、JSON、REST への逃げ道 | [CLI ガイド](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/cli-guide.md) |
| ファイル、フォルダ、版、リンク、共同編集者 | [内容の操作](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/content-workflows.md) |
| 検索、メタデータ、Box AI、AI ユニット | [検索と AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/search-and-ai.md) |
| 大量の資料に対する Q&A や、繰り返し使う知識のまとまり | [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/hubs.md) |
| たくさんのファイル、途中から再開できるまとめ処理 | [まとめての操作](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/bulk-operations.md) |
| アプリケーションのコード、Box の SDK | [SDK での開発](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/sdk-development.md) |
| Webhook や Events API | [Webhook とイベント](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/webhooks-and-events.md) |
| CLI が使えない、CLI にない操作 | [REST API での代替](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/rest-api.md) |
| 認証、権限、レート制限、API のエラー | [困ったとき](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/troubleshooting.md) |

## 中身の扱い方 {#content-handling-policy}

Box に置かれた内容を意味の面から分析するときは、Box AI を優先します。Box の権限がそのまま守られ、元のファイルは Box の管理下にある AI の仕組みで処理され、ファイル本文が Hermes のコーディングモデルの文脈に入らず、すべてをダウンロードしなくても大量の書類を扱えます。ほかのやり方を否定したり止めたりする必要はありません。本人がそちらを選んだのなら、それを使ってください。

決まった条件で引くだけなら、既存の Box のメタデータやメタデータの検索を使います。それ以外は Box AI を使います。

- `ai:ask` は質問への回答、要約、比較に
- `ai:extract-structured` は項目が決まっている場合やメタデータのテンプレートがある場合に
- `ai:extract` は柔軟にキーと値を取り出したい場合に
- `ai:text-gen` は Box の 1 つのファイルを根拠に文章を書く場合に

25 を超えるファイルにまたがる Q&A や、繰り返し使う知識のまとまりが必要なときは、Hubs 向けの Box AI を優先します。まず、すでにアクセスできる Hub がないかを探します。共有される資源が変わるので、Hub を作ったり中身を入れたりするのは、承認をもらってからにします。使える Hub がなく、作ることも望まれない場合は、検索やメタデータで一度きりの依頼の範囲を絞ります。メタデータの抽出や文章生成に Hub を使わないでください。[Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/hubs.md) を読みます。

Box のファイルからメタデータを取り出してほしいと言われたら、下書きだけでよいと言われない限り、結果を保存するところまでが依頼だと考えます。欲しい形が分かっているときは、項目を直接指定した構造化の抽出を使い、項目を探っている段階なら自由な形の抽出を使います。求められた項目をすべて表せる企業向けテンプレートがすでにあるなら、それを再利用します。それ以外の場合は、平坦な値なら組み込みの `global.properties` のメタデータに保存し、入れ子のオブジェクト・表・型を保ちたい値が含まれるなら、元のファイルの隣に JSON のファイルを添えてアップロードします。書き込んだものはすべて読み返して、意図した結果と突き合わせます。ファイルの説明で勝手に代用したり、中途半端なテンプレートや関係のないテンプレートを付けたり、項目を切り詰めたり捨てたりしないでください。

メタデータのテンプレートを作ったり変えたりしないでください。Box ではグローバルのテンプレートを作ることはできず、企業向けテンプレートの管理は Hermes がふだん使う OAuth の内容操作の外側にあります。型の付いた企業向けメタデータを繰り返し使いたいのに、合うテンプレートがない場合は、Box の管理者か権限を持つ副管理者が別途作る必要があることを伝え、いまある構造化されたメタデータには手を付けず、代わりに保存した `global.properties` のインスタンスか JSON のファイルを報告します。抽出と書き戻しの手順の全体は [検索と AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/search-and-ai.md) を読んでください。

Box AI を初めて呼ぶ前に、Box AI が有効になっている必要があること、AI ユニットを消費すること、いま使っているアカウントの権限の範囲でしか動かないことを伝えます。返事を待つ必要はありません。Hermes に返ってきた AI の応答にも、機密の情報が含まれていることがあります。確認を取るのは、まとまった量の処理でファイルの範囲や見込みの AI ユニット消費があいまいなとき、あるいはその規模を本人がはっきり求めていないときだけです。[検索と AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/search-and-ai.md) を参照してください。

## 安全に操作する {#operate-safely}

- パスより ID を使い、ファイルが見当たらない原因を調べる前に、いまどのアカウントとして動いているかを確かめます。
- 出力を小さく保つために `--json` と `--fields` を使います。書き換えるときは、まず対象を洗い出し、あいまいなときや対象が多いときは確認を取り、実行後に結果を読み返します。
- 順序のある CLI の書き換えは 1 つずつ実行して、どこまで進んだか、どこから戻せるかがはっきりするようにします。規模の大きい作業では、資料に載っているまとめ入力の仕組みか、上限を決めた SDK の並列実行を使います。
- 場所を示したいだけの理由で共有リンクを作らないでください。共有リンクはアクセスできる範囲を変えるので、はっきりした確認が必要です。
- 秘密の情報を、チャット、コマンドの出力、ソース管理、ログに残さないでください。

## 結果の伝え方 {#report-results}

Box の項目を1つずつ報告するときは、その ID と、そのまま開けるリンクを添えます。

- ファイル: `https://app.box.com/file/<FILE_ID>`
- フォルダ: `https://app.box.com/folder/<FOLDER_ID>`
- Hub: `https://app.box.com/hubs/<HUB_ID>`

まとまった量を扱ったときは、何百件も並べるのではなく、元のフォルダと移し先のフォルダ、それに例外だけをリンクします。つないだ Box のアカウントにしか見えない内容は、人が開けないこともあります。その点ははっきり伝えてください。書き込みの報告には、どのアカウントで行ったか、どう確かめたかを必ず入れます。

## 確かめる {#verify}

書き込んだあとは、同じアカウントでそのファイルやフォルダを取得するか、親のフォルダを一覧して、返ってきた ID と名前を確認します。メタデータを書いた場合は、そのメタデータのインスタンスを取得して、返ってきた項目を1つずつ意図した値と突き合わせます。HTTP が成功しただけでは確認になりません。欠けている値、正規化された値、受け付けられなかった値は報告します。セットアップの動作確認には、使い捨てのフォルダを作って確かめ、片付けの許可が出ている場合にかぎり削除します。
