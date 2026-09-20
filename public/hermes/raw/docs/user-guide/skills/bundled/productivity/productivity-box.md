---
title: "Box — Box でクラウド上のファイル、共有、検索、メタデータを扱う"
description: "Box でクラウド上のファイル、共有、検索、メタデータを扱います"
upstream_path: user-guide/skills/bundled/productivity/productivity-box.md
upstream_blob: 6f4620becb2f673598c6f83e03ecd9130a0def70
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
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# Box {#box}

Box は、ファイル操作・共同作業・メタデータ・文書仕事のためのクラウドファイルシステムとして使ってください。操作は Hermes の `terminal` ツールから Box CLI で行い、アプリケーションを作るときは SDK のガイドを参照します。

## 使いどころ {#when-to-use}

- Box のファイルやフォルダを整理する、アップロードする、版を管理する、移動する、共有する、一緒に作業する
- Box の中身や、すでに付いているメタデータを検索する
- Box のファイルについて質問する、メタデータを取り出す、ファイルに基づいた文章を作る
- すべての元ファイルをダウンロードせずに、Box のフォルダをまとめて処理する
- Box を土台にしたアプリケーション、連携、webhook の受け口を作る

## ファイルシステムの話は広いところから始める {#start-broad-file-system-conversations}

Hermes 向けにクラウドファイルシステムを検討している人が相手なら、まず向き不向きを短く伝えます。Box が役に立つのは、チームでクラウドのファイル保管・共有・検索・メタデータ・文書仕事が必要な場面です。そのうえで、OAuth で Box アカウントをつなぎたいのか、SDK を使って Box を土台にしたアプリケーションや連携を作りたいのかを尋ねます。

OAuth を使うと、Hermes はブラウザで認可した Box アカウントとして振る舞います。そのアカウントが Box 上で持っている権限が、そのまま Hermes の手の届く範囲になります。範囲を狭めたい場合は、必要なファイル・フォルダ・Hub にだけ招待されたアカウントで認可してください。

ざっくりした相談の段階で、準備を走らせたり、コマンド集を見せたり、アカウント計画やフォルダの分類案を出したり、参照ドキュメントを全部読み込んだりしてはいけません。相手の答えを待ってから、関係する道だけを読み込みます。最初から具体的な目的が示されている依頼なら、この聞き取りは飛ばして、その目的にそのまま取りかかってください。

通常の CLI 作業は、公式の Box CLI OAuth アプリから始めます。これで普段の中身の操作と Box AI はまかなえます。webhook の管理のように追加の OAuth スコープが要る操作のときだけ、独自の **User Authentication (OAuth 2.0)** Platform App を使ってください。これも OAuth の流れであることに変わりはなく、サーバー側の身元や代理の身元に置き換えてはいけません。

## 選ばれた準備は対話しながら進める {#perform-chosen-setup-interactively}

利用者が認証の道を選んだとき、あるいは Box につないでほしいと言われたときは、準備を `terminal` で実際に進めます。次の返答を、相手が写して実行するための手順書にしてはいけません。安全に踏める次の一歩は自分で踏み、承認・ブラウザでのサインイン・管理者の操作・Hermes が安全に用意できない秘密情報が必要なときだけ手を止めます。

- `box` が入っていない場合は、現在の Hermes ホーム配下の `tools/box-cli` に `@box/cli` を入れるための端末操作の承認を求め、そのうえで [CLI guide](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/cli-guide.md) にある、使っているシェルに合ったコマンドで動作を確かめます。npm のグローバルインストール、`sudo`、npm のグローバル prefix の変更、`PATH` の変更はどれもしないでください。
- OAuth の前に、こう尋ねます。**「Hermes は、Box の認可に使うブラウザと同じコンピューターで動いていますか。それとも VPS、コンテナ、クラウド VM のような別のホストで動いていますか。」** 同じコンピューターの場合だけ通常の `box login` を使い、遠隔や画面のない環境では `box login --code` を使います。動作している場所を OS の種類だけから推測してはいけません。相手の答えを聞いてから [OAuth setup](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/oauth-setup.md) を読んでください。
- ブラウザでの認可を始める前に、Hermes はそこでサインインした Box アカウントとして振る舞うと伝えます。範囲を狭めたい場合は、必要なファイル・フォルダ・Hub にだけ招待されたアカウントで認可できます。例外的な操作を通すために、そのアカウントを管理者にしてはいけません。
- 独自の OAuth Platform App がどうしても必要なときは、CLI の対話式 Platform App の流れを使います。クライアントシークレットは手元の CLI のプロンプトにだけ入力してもらい、チャットで尋ねたり、Hermes の設定に書いたり、コミットしたりしないでください。
- インストール、ブラウザでの認可、環境の切り替え、権限の変更に承認が要るときは、その承認を求め、下りてから準備を続けます。作業をコマンドの羅列に置き換えないでください。

## 作業のはじめに毎回すること {#start-each-task}

1. CLI と、いま誰として動いているかを確かめます。POSIX 系のシェルなら `command -v box`、PowerShell なら `Get-Command box -ErrorAction SilentlyContinue` で確認します。`box` が `PATH` にあればそれを使います。Hermes が現在のホーム配下に CLI を入れているなら、先頭の `box` をすべて、[CLI guide](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/cli-guide.md) にある、シェルに合った動作確認済みの実行方法に置き換えます。そのうえで `box users:get me --json --fields id,name,login` を実行します。
   これが通ったら、誰として動いているかを記録して先へ進みます。認証のことを再び尋ねてはいけません。`folders:items 0` の結果は、あくまでそのアカウントのルート直下の一覧です。共有されたファイル・フォルダ・Hub に手が届かない証拠にはなりません。ファイルやフォルダの ID が分かっているならそれを直接確かめ、Hub の場合は [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/hubs.md) にある Hub の探し方に従ってください。
2. 認証がまだなら、OAuth で Box アカウントをつなぐことを提案し、続けて Hermes と認可用のブラウザが同じコンピューターにあるのか、別のホストなのかを尋ねます。[OAuth setup](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/oauth-setup.md) を読んでください。
3. 操作する前に、関係する参照ドキュメントを読みます。まずは文書化されたコマンドを使い、参照に載っていないオプションが必要なときや、入っている CLI が文書どおりの書き方を受け付けないときだけ、サブコマンドのヘルプを見てください。

`bash` と書かれた例は POSIX の行継続の書き方です。PowerShell では Box のコマンドを 1 行で書くか、行末の `\` を PowerShell のバッククォートによる行継続に置き換えてください。POSIX の変数代入をそのまま PowerShell に貼ってはいけません。

## 手を止めずに CLI を補う {#extend-the-cli-without-pausing}

Box CLI に専用のサブコマンドが無いときは、対応する REST エンドポイントを `box request` で呼び、そのまま通常の操作を続けます。実装が REST になるというだけの理由で、利用者に選択を求めないでください。Box としては同じ作業ですし、設定済みの CLI の身元もそのまま保たれます。エンドポイントにリクエストボディや独自ヘッダーが要るときは [REST API fallback](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/rest-api.md) を読んでください。

削除、共同編集者や共有リンクや権限の変更、身元の切り替え、範囲の広い操作や費用のかかる一括変更、そして対象や範囲があいまいなときは、先に確認を取ります。それ以外は、頼まれた操作を実行し、結果を確かめてください。

## 読むものを選ぶ {#choose-the-right-path}

| 知りたいこと | 読むもの |
| --- | --- |
| CLI の作法、環境、JSON、REST への逃げ道 | [CLI guide](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/cli-guide.md) |
| ファイル、フォルダ、版、リンク、共同編集 | [Content workflows](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/content-workflows.md) |
| 検索、メタデータ、Box AI、AI ユニット | [Search and AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/search-and-ai.md) |
| 選び抜いた大量の資料への Q&A、使い回せる知識ベース | [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/hubs.md) |
| 大量のファイル、途中から再開できる一括処理 | [Bulk operations](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/bulk-operations.md) |
| アプリケーションのコード、Box の SDK | [SDK development](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/sdk-development.md) |
| webhook、Events API | [Webhooks and events](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/webhooks-and-events.md) |
| CLI が使えない、CLI に無い操作 | [REST API fallback](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/rest-api.md) |
| 認証、権限、レート制限、API のエラー | [Troubleshooting](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/troubleshooting.md) |

## 中身の扱い方 {#content-handling-policy}

Box に置かれた中身を意味的に分析するときは、Box AI を優先します。Box の権限がそのまま守られ、元ファイルは Box が管理する AI 連携の中で処理され、元ファイルの本文が Hermes のコーディングモデルの文脈に入らず、すべてをダウンロードしなくても大量の文書仕事をこなせるからです。ほかのやり方を否定したり止めたりする必要はありません。利用者がはっきりそちらを選んだなら、それを使ってください。

答えが一意に決まる照会には、すでにある Box のメタデータやメタデータ検索を使います。それ以外は Box AI を使ってください。

- `ai:ask` は質疑応答、要約、比較に
- `ai:extract-structured` は項目が決まっている場合やメタデータのひな形に
- `ai:extract` は柔軟なキーと値の抽出に
- `ai:text-gen` は Box 上の 1 ファイルに基づいた文章作成に

25 件を超えるファイルへの質疑応答や、使い回せる知識ベースを作るときは、Hub 向けの Box AI を優先します。まずは手の届く既存の Hub を探してください。作成したり中身を足したりするのは、共有リソースを変えることについて利用者の承認を得てからです。使える Hub が無く、新しく作ることも望まれていない場合は、その場かぎりの依頼として検索やメタデータで対象を絞ります。メタデータの抽出や文章作成に Hub を使ってはいけません。[Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/hubs.md) を読んでください。

Box のファイルからメタデータを取り出してほしいと言われたら、下見だと明示されないかぎり、結果を保存するところまでが依頼だと考えます。欲しい項目の形が分かっているなら、項目を直接指定した構造化抽出を使い、探りながらの段階なら自由形式の抽出を使います。求められた項目をすべて表せる企業向けのひな形がすでにあるなら、それを再利用してください。そうでなければ、入れ子のない単純な値は組み込みの `global.properties` メタデータインスタンスに保存し、入れ子の構造・表・型を保ちたい値が含まれるときは、元ファイルの隣に JSON のサイドカーをアップロードします。書き込んだ結果は必ず読み返し、意図した内容と突き合わせてください。ファイルの説明文で黙って代用する、部分的なひな形や無関係なひな形を当てる、項目を切り詰める、項目を捨てる、といったことは絶対にしないでください。

メタデータのひな形を作ったり変えたりしてはいけません。Box は全体共通のひな形の作成を許していませんし、企業向けひな形の管理は Hermes が通常の OAuth で行う中身の作業の外にあります。型付きで使い回せる企業向けメタデータが必要なのに、合うひな形が無い場合は、Box の管理者か権限を持つ副管理者に別途作ってもらう必要があると説明し、既存の構造化メタデータには手を付けず、代わりに保存した `global.properties` インスタンスか JSON のサイドカーを報告してください。抽出と書き戻しの手順の全体は [Search and AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/search-and-ai.md) にあります。

最初に Box AI を呼ぶ前に、Box AI は有効化が必要で、AI ユニットを消費し、いま動いているアカウントの権限の範囲を超えないことを伝えます。返事を待つ必要はありません。Hermes に返ってきた AI の応答にも、機微な情報が含まれていることがあります。確認を取るのは、まとまった量の処理で対象ファイルの範囲や見込みの AI ユニット消費があいまいなとき、あるいは利用者がその規模をはっきり求めていないときだけです。[Search and AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity/box/references/search-and-ai.md) を参照してください。

## 安全に操作する {#operate-safely}

- パスより ID を優先し、ファイルが見つからない原因を探る前に、いま誰として動いているかを確かめます。
- `--json` と `--fields` で出力を小さく保ちます。変更を伴う操作では、まず対象を洗い出し、あいまいなときや範囲が大きいときは確認を取り、最後に結果を読み返します。
- 順番のある CLI の変更操作は 1 つずつ実行し、どこまで進んだか、どこから戻せるかが分かるようにします。規模の大きい作業では、文書化された一括入力の仕組みか、上限を決めた SDK の並行処理を使ってください。
- 案内のためだけに共有リンクを作ってはいけません。共有リンクはアクセスできる範囲を変えるので、はっきりした確認が要ります。
- 秘密情報を、チャット、コマンドの出力、ソース管理、ログに残さないでください。

## 結果を報告する {#report-results}

個別に報告する Box の項目には、ID と、そのまま開けるリンクを添えます。

- ファイル: `https://app.box.com/file/<FILE_ID>`
- フォルダ: `https://app.box.com/folder/<FOLDER_ID>`
- Hub: `https://app.box.com/hubs/<HUB_ID>`

件数が多いときは、何百件も並べる代わりに、元のフォルダと移動先のフォルダ、それに例外となったものへのリンクを示します。つないだ Box アカウントにしか見えない中身は、人間が開けないことがあります。その点ははっきり書いてください。書き込みの報告には毎回、誰として実行したかと、どんな確認をしたかを含めます。

## 確認する {#verify}

書き込みのあとは、同じアカウントでそのファイルやフォルダを取得するか、親フォルダの一覧を出して、返ってきた ID と名前を確かめます。メタデータを書いたときは、メタデータインスタンスを取得し、返ってきた項目を 1 つずつ意図した値と突き合わせます。HTTP が成功しただけでは確認したことになりません。足りない値、正規化された値、拒否された値は報告してください。捨ててよい動作確認をするときは、確認用のフォルダを作って中身を確かめ、片付けの許可が出ている場合にかぎって削除します。
