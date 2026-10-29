---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Box — クラウド上のファイル、共有、検索、メタデータを管理します"
description: "Box でクラウド上のファイル、共有、検索、メタデータを管理します"
upstream_path: user-guide/skills/optional/productivity/productivity-box.md
upstream_blob: e3ba0f0b88bb7532c1feb2f949c4e0dd53b866ec
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-box
---

# Box {#box}

Box でクラウド上のファイル、共有、検索、メタデータを管理します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/productivity/box` で導入します |
| パス | `optional-skills/productivity/box` |
| バージョン | `1.0.0` |
| 作者 | Chris Kim (iskysun96), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Box`, `Productivity`, `Cloud Storage`, `Collaboration`, `Metadata`, `Content Extraction`, `CLI`, `SDK` |
| 関連 skill | [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/) |

## 一覧: SKILL.md の全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効な間、エージェントはこの内容を指示として受け取ります。
:::

# Box {#box}

ファイル操作、共同作業、メタデータ、ドキュメント作業には、Box をクラウド上のファイルシステムとして使います。操作は Hermes の `terminal` ツールから Box CLI で行います。アプリケーションを作る場合は SDK ガイドを参照します。

## 使う場面 {#when-to-use}

- Box のファイルやフォルダーを整理する、アップロードする、バージョン管理する、移動する、共有する、共同で作業するとき
- Box のコンテンツや既存のメタデータを検索するとき
- Box のファイルについて質問する、メタデータを抽出する、ファイルの内容に基づいた文章を生成するとき
- 元のファイルをすべてダウンロードせずに、Box のフォルダーを大規模に処理するとき
- Box を土台にしたアプリケーション、連携機能、webhook ハンドラーを作るとき

## ファイルシステム全般の相談から始める {#start-broad-file-system-conversations}

Hermes で使うクラウド上のファイルシステムを検討している人には、まず向き不向きを短く伝えます。Box は、チームでクラウド上のファイル保存、共有、検索、メタデータ、ドキュメント作業が必要な場合に役立ちます。そのうえで、OAuth で Box アカウントを接続したいのか、SDK で Box を土台にしたアプリケーションや連携機能を作りたいのかを尋ねます。

OAuth を使うと、Hermes はブラウザーで認可した Box アカウントとして動作します。Hermes が何にアクセスできるかは、そのアカウントの Box 上の権限で決まります。Hermes のアクセス範囲を絞りたい場合は、必要なファイル、フォルダー、Hub にだけ招待されているアカウントで認可します。

漠然とした相談の段階では、セットアップを実行したり、コマンド集を見せたり、アカウント構成やフォルダー分類を提案したり、参考資料をすべて読み込んだりしないでください。ユーザーの答えを待ち、該当する手順の資料だけを読み込みます。依頼の時点で具体的な目的がはっきりしている場合は、この聞き取りを省いて、その目的にそのまま取りかかります。

通常の CLI 作業は、公式の Box CLI OAuth アプリで始めます。一般的なコンテンツ作業と Box AI はこれで足ります。webhook の管理など、依頼された操作に追加の OAuth スコープが必要な場合に限り、カスタムの **User Authentication (OAuth 2.0)** Platform App を使います。これも OAuth の手順であることに変わりはありません。サーバー側の ID やなりすまし用の ID で代用しないでください。

## 選ばれたセットアップを対話しながら実行する {#perform-chosen-setup-interactively}

ユーザーが認証方法を選んだときや、Hermes に Box への接続を頼んだときは、`terminal` を通じてセットアップを実行します。次の返答を、ユーザーがコピーして実行するための手順書にしないでください。安全に進められる次の操作は自分で行い、承認、ブラウザーでのサインイン、管理者による操作、Hermes が安全に用意できない秘密情報が必要なときだけ手を止めます。

- `box` が見つからない場合は、現在の Hermes ホームの `tools/box-cli` に `@box/cli` をインストールするために必要なターミナル操作の承認を求めます。インストール後は、[CLI ガイド](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/cli-guide.md)にある、使っているシェルに合ったコマンドで確認します。npm でのグローバルインストール、`sudo` の使用、npm のグローバル prefix の変更、`PATH` の変更は行わないでください。
- OAuth の前に、**「Hermes は、Box の認可に使うブラウザーと同じコンピューターで動いていますか。それとも VPS、コンテナー、クラウド VM などのリモートホストで動いていますか。」** と尋ねます。同じコンピューターの場合に限り通常の `box login` を使い、リモートや画面のない環境の場合に限り `box login --code` を使います。OS だけから実行環境の構成を推測しないでください。ユーザーが答えたら [OAuth の設定](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/oauth-setup.md)を読みます。
- ブラウザーでの認可を始める前に、Hermes はそこでサインインした Box アカウントとして動作することを伝えます。アクセス範囲を絞りたい場合は、必要なファイル、フォルダー、Hub にだけ招待されているアカウントで認可できます。例外的な操作を可能にするためだけに、そのアカウントを管理者にしないでください。
- カスタムの OAuth Platform App が必要な場合は、CLI の対話式 Platform App 手順を使います。client secret はローカルの CLI プロンプトにだけ入力するようユーザーに頼みます。チャットで求めたり、Hermes の設定に書き込んだり、コミットしたりしてはいけません。
- インストール、ブラウザーでの認可、環境の切り替え、権限の変更に承認が必要な場合は、承認を求め、承認されたらセットアップを再開します。操作の代わりにコマンドの一覧を渡すことはしないでください。

## 各タスクの始め方 {#start-each-task}

1. CLI と現在の実行ユーザーを確認します。POSIX シェルでは `command -v box`、PowerShell では `Get-Command box -ErrorAction SilentlyContinue` で調べます。`box` が `PATH` 上にあればそれを使います。Hermes が現在のホームに CLI をインストールした場合は、先頭の `box` をすべて、[CLI ガイド](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/cli-guide.md)にある、使っているシェル向けの確認済みの実行方法に置き換えます。そのうえで、その実行方法で `box users:get me --json --fields id,name,login` を実行します。
   成功したら実行ユーザーを記録して先に進みます。認証についてもう一度尋ねることはしません。`folders:items 0` は実行ユーザーのルートの一覧にすぎず、共有されたファイル、フォルダー、Hub にアクセスできない証拠にはなりません。わかっているファイルやフォルダーは ID で直接確認し、Hub は [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/hubs.md) にある Hub の探し方を使います。
2. 認証されていない場合は、OAuth で Box アカウントを接続するよう依頼し、Hermes と認可用のブラウザーが同じコンピューターで動いているか、別々のホストで動いているかを尋ねます。[OAuth の設定](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/oauth-setup.md)を読みます。
3. 操作の前に、該当する参考資料を読みます。まず資料に載っているコマンドを使います。資料にないオプションが必要な場合や、インストール済みの CLI が資料どおりの形を受け付けない場合に限り、サブコマンドのヘルプを実行します。

`bash` と書かれた例は、POSIX の行継続の書き方を使っています。PowerShell では、Box コマンドを 1 行で実行するか、行末の `\` をすべて PowerShell のバッククォートによる行継続に置き換えます。POSIX の変数代入を PowerShell に貼り付けないでください。

## 手を止めずに CLI を補う {#extend-the-cli-without-pausing}

Box CLI に専用のサブコマンドがない場合は、対応する REST エンドポイントに `box request` を使い、通常の操作をそのまま続けます。実装に REST を使うというだけの理由で、ユーザーに選択を求めないでください。同じ Box のタスクであり、設定済みの CLI の ID もそのまま使われます。エンドポイントにリクエストボディやカスタムヘッダーが必要な場合は、[REST API による代替手段](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/rest-api.md)を読みます。

削除、コラボレーション・共有リンク・権限の変更、ID の変更、広範囲または負担の大きい一括変更を行う前や、対象や範囲があいまいな場合は確認を取ります。それ以外は、依頼された操作を実行して結果を確認します。

## 適切な手順を選ぶ {#choose-the-right-path}

| 必要なこと | 読むもの |
| --- | --- |
| CLI の決まりごと、環境、JSON、REST による抜け道 | [CLI ガイド](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/cli-guide.md) |
| ファイル、フォルダー、バージョン、リンク、コラボレーション | [コンテンツの作業手順](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/content-workflows.md) |
| 検索、メタデータ、Box AI、AI ユニット | [検索と AI](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/search-and-ai.md) |
| 厳選した資料での大規模な Q&A、再利用できるナレッジベース | [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/hubs.md) |
| 大量のファイル、再開できる一括処理 | [一括操作](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/bulk-operations.md) |
| アプリケーションのコード、Box SDK | [SDK での開発](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/sdk-development.md) |
| webhook、Events API | [webhook とイベント](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/webhooks-and-events.md) |
| CLI が使えない、CLI にない操作 | [REST API による代替手段](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/rest-api.md) |
| 認証、権限、レート制限、API エラー | [困ったとき](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/troubleshooting.md) |

## コンテンツの扱い方の方針 {#content-handling-policy}

Box 上のコンテンツの意味を分析する場合は、Box AI を優先します。Box AI は Box の権限を保ったまま、Box の管理下にある AI 連携で元のファイルを処理するため、ファイル本文が Hermes のコーディング用モデルのコンテキストに入りません。また、すべてのファイルをダウンロードしなくてもドキュメント作業を大規模に進められます。ほかのやり方を批判したり妨げたりはしないでください。ユーザーがはっきり選んだ場合はそのやり方を使います。

決まった答えが返る検索には、既存の Box メタデータやメタデータクエリを使います。それ以外は Box AI を使います。

- Q&A、要約、比較には `ai:ask`
- 項目が決まっている場合やメタデータテンプレートには `ai:extract-structured`
- 柔軟なキーと値の抽出には `ai:extract`
- 1 つの Box ファイルに基づく文章作成には `ai:text-gen`

25 を超えるファイルを対象にした Q&A や、再利用できる厳選されたナレッジベースには、Box AI for Hubs を優先します。まずアクセスできる既存の Hub を探し、共有リソースの変更をユーザーが承認した場合に限り、Hub を作成したり中身を追加したりします。使える Hub がなく、ユーザーが作成を望まない場合は、検索やメタデータで一度きりの依頼の対象を絞り込みます。メタデータの抽出や文章の生成に Hub は使いません。[Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/hubs.md) を読みます。

ユーザーが Box ファイルからメタデータを抽出するよう頼んだ場合は、プレビューを求められていない限り、結果を保存する依頼として扱います。求めるスキーマが決まっている場合はインラインの項目指定で構造化抽出を行い、項目を探りながら決める場合は自由形式の抽出を行います。依頼されたすべての項目を表せる互換性のある既存のエンタープライズテンプレートがあれば、それを再利用します。なければ、単純な値の結果は組み込みの `global.properties` メタデータインスタンスに保存します。結果に入れ子のオブジェクトや表、型を保つ必要がある値が含まれる場合は、JSON のサイドカーファイルを元のファイルの隣にアップロードします。書き込んだ内容はすべて読み戻し、意図した結果と比べます。断りなくファイルの説明欄で代用したり、一部しか合わないテンプレートや無関係なテンプレートを付けたり、項目を切り詰めたり捨てたりしてはいけません。

メタデータテンプレートを作成したり変更したりしないでください。Box ではグローバルテンプレートを作成できず、エンタープライズテンプレートの管理は Hermes の通常の OAuth によるコンテンツ作業の範囲外です。型付きで再利用できるエンタープライズメタデータが必要なのに互換性のあるテンプレートがない場合は、Box の管理者または権限のある共同管理者が別途作成する必要があると説明します。既存の構造化メタデータには手を付けず、代わりに保存した `global.properties` インスタンスまたは JSON サイドカーファイルを報告します。抽出と書き戻しの手順全体は [検索と AI](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/search-and-ai.md) を読みます。

最初の Box AI リクエストの前に、Box AI が有効になっている必要があること、AI ユニットを消費すること、現在の実行ユーザーの権限の範囲内でしか動かないことを伝えます。了承を待つ必要はありません。Hermes に返ってきた AI の回答にも機密情報が含まれる場合があります。まとまった量の一括処理で、対象ファイルの範囲や見込まれる AI ユニットの消費量があいまいな場合や、その規模をユーザーがはっきり依頼していない場合に限り、確認を取ります。[検索と AI](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/productivity/box/references/search-and-ai.md) を参照してください。

## 安全に操作する {#operate-safely}

- パスより ID を使います。ファイルが見つからない原因を調べる前に、現在の実行ユーザーを確認します。
- 出力を小さく抑えるために `--json` と `--fields` を使います。変更を加える場合は、まず対象を洗い出し、範囲があいまいなときや大きいときは確認を取り、最後に結果を読み戻します。
- 順序のある CLI での変更は 1 つずつ順番に実行し、進み具合と復旧の手順がはっきりわかるようにします。規模の大きい作業には、資料にある一括入力の機能か、並列数を制限した SDK の並行処理を使います。
- 移動しやすくするためだけに共有リンクを作成しないでください。共有リンクはアクセス権を変えるため、明確な確認が必要です。
- 秘密情報をチャット、コマンドの出力、ソース管理、ログに含めないでください。

## 結果を報告する {#report-results}

個別に報告する Box の項目には、必ず ID とクリックで開けるリンクを付けます。

- ファイル: `https://app.box.com/file/<FILE_ID>`
- フォルダー: `https://app.box.com/folder/<FOLDER_ID>`
- Hub: `https://app.box.com/hubs/<HUB_ID>`

大規模な一括処理では、何百もの項目を並べる代わりに、移動元と移動先のフォルダー、および例外になった項目へのリンクを示します。接続した Box アカウントにしか見えないコンテンツは、人が開けない場合があります。その点ははっきり伝えます。書き込みのまとめには、毎回実行ユーザーと行った確認の内容を含めます。

## 確認する {#verify}

書き込みのあとは、同じ実行ユーザーでそのファイルやフォルダーを取得するか親フォルダーの一覧を取得し、返ってきた ID と名前を確かめます。メタデータを書き込んだ場合は、メタデータインスタンスを取得し、返ってきたすべての項目を意図した値と比べます。HTTP の成功応答だけでは確認になりません。欠けている値、正規化された値、拒否された値を報告します。使い捨てのセットアップ確認では、動作確認用のフォルダーを作成して確かめ、ユーザーが後片付けを許可した場合に限りそのフォルダーを削除します。
