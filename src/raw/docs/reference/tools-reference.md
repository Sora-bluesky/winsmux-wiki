---
title: "組み込みツール一覧"
description: "Hermes の組み込みツールを、ツールセットごとにまとめた決定版の早見表"
upstream_path: reference/tools-reference.md
upstream_blob: 44db9c8993ec000e370a990a574e91e38cbf1ead
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/tools-reference
---

# 組み込みツール一覧 {#built-in-tools-reference}

このページでは、Hermes の組み込みツールをツールセットごとに説明します。どれが使えるかは、動かしている環境、資格情報、有効にしているツールセットによって変わります。

**ざっくりした数（現在の登録内容）:** 全体で 86 個ほどです。内訳は、ブラウザ操作 10 個（基本）＋ CDP がつながっているときだけ増える 2 個、ファイル操作 4 個、Home Assistant 4 個、ターミナル 2 個（`terminal`、`process`）、デスクトップアプリの画面まわり 12 個（`read_terminal`、`close_terminal`、`open_preview`、`close_preview`、`read_preview`、`drive_preview`、`annotate_preview`、`read_window_below`、`focus_pane`、`react_to_message`、`tour`、`tip` — デスクトップアプリのセッション限定）、Web 2 個、Feishu 5 個、Spotify 7 個（同梱の `spotify` プラグインが登録します）、Yuanbao 5 個、かんばん 12 個（かんばんの割り振り役がエージェントを起動したときに登録されます）、プロジェクト 3 個（デスクトップの画面があるセッション）、Discord 2 個、動画 3 個（`video_generate`、`xai_video_edit`、`xai_video_extend`）、そして単体のツールがいくつか（`memory`、`clarify`、`delegate_task`、`execute_code`、`cronjob`、`session_search`、`skill_view`/`skill_manage`/`skills_list`、`text_to_speech`、`image_generate`、`vision_analyze`、`video_analyze`、`todo`、`computer_use`、`x_search`）です。

:::tip MCP のツール
組み込みのツールに加えて、Hermes は MCP サーバーからツールをその場で読み込めます。MCP のツールには `mcp__<server>__` という接頭辞が付きます（`github` の MCP サーバーなら `mcp__github__create_issue` のような形です）。設定方法は [MCP 連携](/hermes/docs/user-guide/features/mcp/) を見てください。
:::

## `browser` ツールセット {#browser-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_back` | 履歴をたどって前のページに戻ります。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_click` | スナップショットに出てくる参照 ID（'@e5' のような形）で指した要素をクリックします。参照 ID はスナップショットの出力に角かっこ付きで表示されます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_console` | いま開いているページのコンソール出力と JavaScript のエラーを取得します。console.log/warn/error/info のメッセージと、捕まえられなかった JS の例外を返します。表に出ない JavaScript のエラー、失敗した API 呼び出し、アプリの警告を見つけるのに使います。先に… | — |
| `browser_get_images` | いま開いているページにあるすべての画像を、URL と代替テキスト付きで一覧にします。画像認識ツールで解析したい画像を探すときに便利です。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_navigate` | ブラウザで URL を開きます。セッションを立ち上げてページを読み込みます。ほかのブラウザ操作ツールより先に呼ぶ必要があります。単に情報を取りたいだけなら web_search や web_extract のほうが速くて安上がりです。ブラウザ操作は… | — |
| `browser_press` | キーボードのキーを押します。フォームの送信（Enter）、移動（Tab）、ショートカットの実行に使います。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_scroll` | ページを指定した向きにスクロールします。いま見えている範囲の上下にある内容を表示させたいときに使います。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_snapshot` | いま開いているページのアクセシビリティツリーを、テキストのスナップショットとして取得します。browser_click と browser_type で使う参照 ID（@e1、@e2 のような形）付きで、操作できる要素を返します。full=false（既定）は操作できる要素だけの簡潔な表示、full=true は… | — |
| `browser_type` | 参照 ID で指した入力欄に文字を入力します。いったん中身を消してから新しい文字を入れます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_vision` | いま開いているページのスクリーンショットを撮って、見た目を確かめられるようにします。ページがどう見えているかを知りたいとき、とくに CAPTCHA、画像による本人確認、入り組んだレイアウト、テキストのスナップショットでは大事な情報が抜け落ちる場面で使います。画像を直接扱えるモデルならスクリーンショットをそのまま渡し、そうでなければ補助の画像認識モデル… | — |

## `browser` ツールセット（CDP がつながっているときだけのツール） {#browser-toolset-cdp-gated-tools}

この 2 つは `browser` ツールセットに含まれますが、セッションの開始時に Chrome DevTools Protocol のエンドポイントにつながる場合だけ登録されます。つなぎ方は `/browser connect`、設定の `browser.cdp_url`、Browserbase のセッション、Camofox のいずれかです。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_cdp` | Chrome DevTools Protocol のコマンドを直接送ります。上位の `browser_*` ツールでは足りない操作のための逃げ道です。https://chromedevtools.github.io/devtools-protocol/ を参照してください | CDP のエンドポイント |
| `browser_dialog` | JavaScript のダイアログ（alert / confirm / prompt / beforeunload）に応答します。先に `browser_snapshot` を呼んでください。未処理のダイアログはその `pending_dialogs` の欄に出てきます。そのうえで `browser_dialog(action='accept'\|'dismiss')` を呼びます。 | CDP のエンドポイント |

## `clarify` ツールセット {#clarify-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `clarify` | 先へ進む前に確認・意見・判断がほしいとき、利用者に質問します。3 つの形式があります。1. **単一選択** — 選択肢は最大 4 つで、利用者はどれか 1 つを選ぶか、5 番目の「その他」から自分で答えを書きます。2. **複数選択** — `multi_select=true` にするとチェックボックスで表示され、選ばれた項目の一覧が返ります。3. **自由記述** — 選択肢を出さず、利用者が自由に書きます。選択肢は良いと思う順に並べます。先頭には画面上どこでも `(Recommended)` と表示され、既定で選ばれた状態になります。この表示は見た目だけのもので、エージェントが受け取る答えからは取り除かれます。従来型の CLI では、複数選択は Space キーでチェックを切り替えます。チェックボックスの表示ができないメッセージングサービスでは、利用者がカンマや空白で区切った番号（"1, 3" のような形）か、選択肢の文言そのものを返信します。 | — |

### 複数の質問をまとめて聞く {#asking-multiple-questions-at-once}

`clarify` ツールは `questions` の配列（それぞれに `choices` と `multi_select` を持つ、独立した 2〜5 個の質問）も受け取れます。順番に聞かずに、確認したいことをひとまとめにして一度に出せます。結果は同じ順番の `responses` 配列で返り、質問に `id` を付けていればそれも一緒に返ります。

画面ごとの動きは次のとおりです。

- **デスクトップ** ではすべての質問が 1 枚のカードに並びます。選んだ内容や書いた答えはその場で保持され、**Confirm and continue** ボタン（すべての質問に答えると押せるようになります）でまとめて送ります。確定するまでは答えを直せます。スキップするとまとめて取り消しになります。
- **TUI と CLI** では、状態の一覧（`✓` 回答済み / `▸` いま答える質問 / `·` 未回答）がコンパクトに表示され、いま答える質問の選択肢だけが開きます。Enter で答えを確定して次の未回答へ進み、Tab で質問の間を移動して好きな順に答えられます。Esc でまとめて取り消します。
- **メッセージングサービス**（Telegram、Discord など）では、これまでどおり 1 問ずつ順番に聞く形になります。途中で返信が止まった場合、残りの質問は送られません。

途中で待ち時間が切れても、すでに確定した答えは残ります。ツールの結果にはその答えと `"timed_out": true` が入り、未回答の項目は空のままになるので、エージェントは「意図して飛ばした」のか「相手がいなくなった」のかを見分けられます。

## `code_execution` ツールセット {#codeexecution-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `execute_code` | Hermes のツールをプログラムから呼び出せる Python スクリプトを実行します。ツールを 3 回以上呼んで間に処理を挟みたいとき、大きな出力を自分の文脈に入れる前に絞り込みたいとき、条件によって処理を分けたいとき（… | — |

## `cronjob` ツールセット {#cronjob-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `cronjob` | 定期実行のタスクをまとめて管理します。`action="create"`、`"list"`、`"update"`、`"pause"`、`"resume"`、`"run"`、`"remove"` で操作します。スキルを 1 つ以上ひも付けたジョブにも対応していて、更新時に `skills=[]` を渡すとひも付けを解除できます。定期実行はいまの会話の文脈を持たない新しいセッションで動きます。 | — |

## `delegation` ツールセット {#delegation-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `delegate_task` | 切り離された文脈でサブエージェントを起動します。それぞれが自分の会話・ターミナルのセッション・ツールセットを持ち、戻ってくるのは最後のまとめだけです。単発なら 'goal'、並列でまとめて実行するなら 'tasks' を渡します（上限や入れ子のルールは… | — |

## `feishu_doc` ツールセット {#feishudoc-toolset}

Feishu のドキュメントに付いたコメントへ自動で返信する処理（`gateway/platforms/feishu_comment.py`）専用です。`hermes-cli` や通常の Feishu チャット用の窓口では使えません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_doc_read` | file_type とトークンを指定して、Feishu/Lark のドキュメント（Docx、Doc、シート）の本文をすべて読み取ります。 | Feishu アプリの資格情報 |

## `feishu_drive` ツールセット {#feishudrive-toolset}

Feishu のドキュメントコメント処理専用です。ドライブ上のファイルに対するコメントの読み書きを担当します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_drive_add_comment` | Feishu/Lark のドキュメントやファイルに、トップレベルのコメントを付けます。 | Feishu アプリの資格情報 |
| `feishu_drive_list_comments` | Feishu/Lark のファイルに付いた、ドキュメント全体へのコメントを新しい順に一覧します。 | Feishu アプリの資格情報 |
| `feishu_drive_list_comment_replies` | 特定の Feishu のコメントスレッド（ドキュメント全体または選択範囲）への返信を一覧します。 | Feishu アプリの資格情報 |
| `feishu_drive_reply_comment` | Feishu のコメントスレッドに返信します。`@` によるメンションも付けられます。 | Feishu アプリの資格情報 |

## `file` ツールセット {#file-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `patch` | ファイルの中身を狙って置き換えます。ターミナルで sed や awk を使う代わりにこちらを使ってください。あいまい一致（9 通りの方法）に対応しているので、空白やインデントの細かな違いで失敗しません。結果は unified diff で返ります。編集後に構文チェックを自動で走らせます… | — |
| `read_file` | テキストファイルを行番号付き・ページ送りで読みます。ターミナルで cat や head、tail を使う代わりにこちらを使ってください。出力の形式は 'LINE_NUM\|CONTENT' です。見つからないときは似た名前のファイルを提案します。大きなファイルには offset と limit を使ってください。10 万文字あたりを超える読み取りは行の区切りで切り詰められ、next_offset が返ります。Jupyter ノートブック（.ipynb）、Word の文書（.docx）、Excel のブック（.xlsx）も… | — |
| `search_files` | ファイルの中身を検索したり、名前でファイルを探したりします。ターミナルで grep、rg、find、ls を使う代わりにこちらを使ってください。ripgrep を使っているのでシェルの同等品より高速です。中身の検索（target='content'）はファイル内の正規表現検索です。出力の形式は、一致した行を… | — |
| `write_file` | ファイルに内容を書き込み、もとの中身をすべて置き換えます。ターミナルで echo や cat のヒアドキュメントを使う代わりにこちらを使ってください。親ディレクトリは自動で作られます。ファイル全体を上書きするので、部分的な修正には 'patch' を使ってください。.py/.json/.yaml/.toml など構文チェックのある言語では自動で検査し、その書き込みで新しく生じたエラーだけを表示します。 | — |

## `homeassistant` ツールセット {#homeassistant-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `ha_call_service` | Home Assistant のサービスを呼んで機器を操作します。どんなサービスがあり、どんな引数を取るかは、ドメインごとに ha_list_services で調べられます。 | — |
| `ha_get_state` | Home Assistant のエンティティ 1 つについて、詳しい状態を取得します。明るさ、色、設定温度、センサーの測定値など、すべての属性が含まれます。 | — |
| `ha_list_entities` | Home Assistant のエンティティを一覧します。ドメイン（light、switch、climate、sensor、binary_sensor、cover、fan など）やエリア名（リビング、キッチン、寝室など）で絞り込めます。 | — |
| `ha_list_services` | 機器を操作するために使える Home Assistant のサービス（アクション）を一覧します。機器の種類ごとに何ができて、どんな引数を受け取るかが分かります。ha_list_entities で見つけた機器の操作方法を調べるのに使います。 | — |

## `computer_use` ツールセット {#computeruse-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `computer_use` | cua-driver を通してデスクトップを裏側から操作します。スクリーンショット（SOM / 画像 / アクセシビリティ）、クリック、ドラッグ、スクロール、入力、キー操作、待機、list_apps、focus_app ができます。利用者のマウスカーソルやキーボードの入力先を奪いません。ツールを扱えるモデルならどれでも動きます。macOS、Windows、Linux に対応します。 | `$PATH` の通った場所に `cua-driver`（`hermes tools` から導入できます）。 |

:::note
**Honcho のツール**（`honcho_profile`、`honcho_search`、`honcho_context`、`honcho_reasoning`、`honcho_conclude`）は組み込みではなくなりました。`plugins/memory/honcho/` にある Honcho のメモリプロバイダープラグインから使えます。導入と使い方は [メモリのプロバイダー](/hermes/docs/user-guide/features/memory-providers/) を見てください。
:::

## `image_gen` ツールセット {#imagegen-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `image_generate` | 文章から画像を作ったり（text-to-image）、既存の画像を編集・変換したり（image-to-image）します。利用者が設定したバックエンド（FAL.ai、OpenAI、OpenAI Codex 認証、xAI、Krea）を使います。画像を編集するときは `image_url` を、作風の参考にする画像は `reference_image_urls` を渡します。どちらも省くと文章からの生成になります。モデルは利用者が設定するもので、エージェントが選ぶことはできません。返るのは画像の URL か手元のパス 1 つです。 | FAL_KEY / OPENAI_API_KEY / Codex の OAuth / xAI の OAuth / KREA_API_KEY |

## `kanban` ツールセット {#kanban-toolset}

登録されるのは、(a) かんばんの割り振り役がエージェントを起動したとき（環境変数 `HERMES_KANBAN_TASK` が設定されているとき）か、(b) `kanban` ツールセットを明示的に有効にしたプロファイルで動いているときです。担当タスクごとの作業役は、自分のタスクを進めるためのツールを使います。取りまとめ役のプロファイルには、`kanban_list` や `kanban_unblock` のようなボード全体を動かすツールも加わります。全体の流れは [かんばんによる複数エージェント運用](/hermes/docs/user-guide/features/kanban/) を見てください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `kanban_show` | この作業役に割り当てられた、いま進行中のかんばんタスク（タイトル、説明、コメント、依存関係）を表示します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_list` | 条件を付けてボードのタスクを一覧します。取りまとめ役だけが使えます。割り振り役が起動した作業役からは見えません。 | `kanban` ツールセットを有効にしたプロファイル |
| `kanban_complete` | いまのタスクを、引き継ぎ内容（成果、成果物、次にやること）を添えて完了にします。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_block` | 利用者への質問でいまのタスクを止めます。割り振り役は処理を一時停止して質問を出し、人が答えたら再開します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_review` | 実装をレビュー役に渡します。`summary` と、任意で `metadata`、レビュー役のプロファイルを指定できます。同じタスクが `review` に移ります。これは中断ではないので、中断回数の数え上げには影響しません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_changes` | いま担当中のレビューに対するレビュー役の判定です。レビューを終了し、親タスクによる進行制限をかけ直して、タスクをもとの実装者へ差し戻します。中断としては扱われません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_heartbeat` | 時間のかかる処理の途中で進捗の合図を送り、作業役が生きていることを割り振り役に伝えます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_comment` | タスクの状態を変えずに、スレッドへコメントを足します。途中で分かったことを共有するのに便利です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_create` | いまのタスクから子タスクを枝分かれさせます。取りまとめ役や、後続の作業を切り出す作業役が使います。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_link` | タスク同士を、親から子への依存関係でつなぎます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_unblock` | 止まっているタスクを、親がすべて終わっていれば `ready` へ、まだ残っていれば `todo` へ移します。取りまとめ役だけが使えます。割り振り役が起動した作業役からは見えません。 | `kanban` ツールセットを有効にしたプロファイル |
| `kanban_attach` | ファイルの中身をそのまま（base64 で）渡して、タスクに添付します。タスクの添付ディレクトリに実ファイルとして保存され、上限は 25 MB です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attach_url` | URL を指定してタスクにファイルを添付します。Hermes がサーバー側でダウンロードし、実ファイルとして保存します（上限 25 MB）。http と https の URL だけが使えます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attachments` | タスクに添付されたファイルを一覧します。id、ファイル名、content_type、サイズ、追加した人、ディスク上の絶対パスが分かります。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |

## `project` ツールセット {#project-toolset}

デスクトップの [プロジェクト](/hermes/docs/user-guide/cli/)（名前を付けた、複数のフォルダーをまとめた作業場）を操作するツールです。`project` ツールセットを有効にすると登録されます（主にデスクトップアプリやダッシュボードの画面向けです）。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `project_create` | デスクトップのプロジェクト（名前付きの作業場）を作り、この会話をその中に移します。`path` を渡すとリポジトリやフォルダーに結び付けられます。 | — |
| `project_list` | デスクトップのプロジェクトと、いまどれが有効かを一覧します。 | — |
| `project_switch` | 既存のプロジェクト（名前、スラッグ、id のいずれかで指定）へこの会話を移します。セッションの作業場もそのプロジェクトの主フォルダーへ移ります。 | — |

## `memory` ツールセット {#memory-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `memory` | 大事な情報を、セッションをまたいで残るメモリに保存します。保存した内容はセッション開始時にシステムプロンプトへ入ります。会話をまたいで利用者や環境のことを覚えておく仕組みです。何を保存すべきか… | — |

## `session_search` ツールセット {#sessionsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `session_search` | 手元のセッションデータベースに保存された過去のセッションを検索したり、1 つのセッションの中をたどったりします。FTS5 による検索で、データベースの実際のメッセージを返します（LLM は呼びません）。使い方は 4 通りです。探す（`query` を渡す）、たどる（`session_id` と `around_message_id` を渡す）、読む（`session_id` だけ渡す）、眺める（引数なし）。 | — |

## `skills` ツールセット {#skills-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `skill_manage` | スキルを管理します（作成・更新・削除）。スキルは手順の記憶にあたるもので、繰り返し出てくる作業のやり方を再利用できる形にしたものです。新しいスキルは ~/.hermes/skills/ に作られ、既存のスキルは置かれている場所のまま変更できます。操作は create（SKILL.m… | — |
| `skill_view` | スキルには、特定の作業や進め方についての情報に加えて、スクリプトやテンプレートも入っています。スキルの中身をすべて読み込んだり、ひも付いたファイル（参考資料、テンプレート、スクリプト）を開いたりします。最初の呼び出しでは SKILL.md の内容と… | — |
| `skills_list` | 使えるスキルを一覧します（名前と説明）。中身を読み込むには skill_view(name) を使ってください。 | — |

## `terminal` ツールセット {#terminal-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `process` | terminal(background=true) で始めたバックグラウンドのプロセスを管理します。操作は 'list'（すべて表示）、'poll'（状態と新しい出力を確認）、'log'（出力全体をページ送りで表示）、'wait'（終わるか時間切れになるまで待つ）、'kill'（終了させる）、'write'（入力を送… | — |
| `terminal` | Linux 環境でシェルのコマンドを実行します。ファイルシステムは呼び出しをまたいで残ります。長く動かすサーバーには `background=true` を指定してください。`background=true` と一緒に `notify_on_complete=true` を指定すると、プロセスが終わったときに自動で通知が来るので、様子を見に行く必要がなくなります。cat/head/tail は使わず read_file を、grep/rg/find は使わず search_files を使ってください。 | — |

## `desktop_ui` ツールセット {#desktopui-toolset}

Hermes のデスクトップアプリから始まったセッションで有効になります。つないでいるバックエンドの種類（手元、SSH、URL、Hermes Cloud）は問いません。
CLI、TUI、メッセージング、定期実行のセッションでは使えません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `read_terminal` | Hermes デスクトップアプリのターミナル画面（この会話の隣にあるシェル）にいま表示されている内容を読みます。 | — |
| `close_terminal` | Hermes デスクトップアプリで、バックグラウンドのプロセス用に開いている読み取り専用のターミナルタブを閉じます。プロセス自体は止まりません。タブを閉じるだけなので、止めるには process(action='kill') を使ってください。 | — |
| `open_preview` | Hermes デスクトップアプリの、会話の隣にあるプレビュー画面で Web の URL、手元の開発サーバーの URL、ファイルのパスを開きます。 | — |
| `close_preview` | 会話の隣のプレビュー画面、またはその中の 1 つのタブを閉じます。`url` を省くと画面ごと閉じ、URL かファイルのパスを渡すとそのタブだけを閉じます。 | — |
| `read_preview` | Hermes デスクトップアプリのプレビュー画面にいま表示されている内容を読みます。内蔵ブラウザならページのテキスト（URL、タイトル、表示されている文章。`start` と `count` でページ送りできます）、ファイルや成果物のタブならその素性が分かります。 | — |
| `drive_preview` | 内蔵ブラウザで開いているページを操作します。`elements` でクリックや入力ができる要素を洗い出し（それぞれに `btn-sign-in` や `inp-email` のような名前の参照が付き、役割・ラベル・値も分かります）、`click`、`hover`、`type`、`scroll`、`press` でその参照を操作します。`back`/`forward`/`reload` は画面の履歴を動かします。ポインターとキーボードは本物の入力なので、ホバーで開くメニューもちゃんと開きます。参照はページが移動するまで有効で、要素が作り直される再描画をまたいでも残ります。そのため最初の洗い出し以降は、ページ全体ではなく差分だけ（何が増え、消え、変わり、つなぎ直されたか）が返ります。 | — |
| `annotate_preview` | 内蔵ブラウザの要素を枠で囲み、消すまで表示したままにします。`drive_preview` が動作中に一瞬だけ出す印に対して、こちらは意図して残す印です。`add` は参照に短いラベルを付けて印を置き、`remove` は 1 つ消し、`clear` はすべて消します。印は要素に追従し、要素が消えれば一緒に消えるので、ページを移動すると印もなくなります。 | — |
| `read_window_below` | Hermes デスクトップウィンドウのすぐ下にある OS のウィンドウを調べます。アプリ名、タイトル、位置と大きさが分かります（情報だけで、画面の画素は取りません）。macOS では、ほかのアプリのタイトルは画面収録の許可がすでにある場合にだけ見えます。このツールから許可を求めることはありません。 | — |
| `focus_pane` | Hermes デスクトップアプリの画面（チャット、ファイル、ターミナル、レビュー、セッション）を表示して、そこに操作の焦点を移します。 | — |
| `react_to_message` | メッセージに絵文字 1 つでリアクションします。iMessage のタップバックのような機能です。設定 → 外観（`display.message_reactions`）で有効にします。 | — |
| `tour` | その場で案内ツアーを行います。画面を暗くして要素を強調し、説明の吹き出しを付けます（driver.js を使用）。Hermes アプリ自身の画面でも、プレビュー画面で開いているページでも使えます。`targets` で画面上にあるものを調べ、`show` で 1 段ずつ説明し、`start` にすると利用者が「次へ / 戻る」で進められます。 | — |
| `tip` | 小さな色付きの吹き出しと矢印で、要素を 1 つだけ指し示します。`tour` の静かな兄弟分で、画面を暗くせず、スポットライトも「次へ / 戻る」もありません。`data-tour` の目印も、`tour(action='targets')` での調べ方も同じです。 | — |

### ツアー {#tours}

`tour` ツールは案内先を自分で探せます。`action='targets'` を呼ぶと、画面上で指し示せるすべての要素が、セレクター・ラベル・`stable` の印付きで返ります。安定したセレクターは要素そのものの目印（`data-tour`、`id`、`data-testid`、`aria-label`）に基づいていて、再描画されても壊れません。位置で指す `nth-child` の経路は壊れるので、安定したものが先に並びます。そちらを使ってください。

要素に自分専用の目印を付けたいときは、こう書きます。

```html
<div data-tour="composer">…</div>
```

目印は呼び出し側ではなく**部品そのもの**に付けます。1 か所直せば、その部品を使うすべての場所に名前が付きます。すでに用意されているのは次のとおりです。

| 目印 | 指しているもの |
|---|---|
| `overlay-nav` | 各種の重ね表示（設定、定期実行、プロファイル、エージェント）の左側のナビゲーション |
| `nav-<id>` | そのナビゲーションの 1 行 — `nav-models`、`nav-appearance` など |
| `field-<schemaKey>` | 設定項目の 1 行を設定キーで指したもの — `field-model`、`field-provider` など |
| `page-tabs` | `PageSearchShell` を使うページ（成果物、スキルなど）の絞り込みタブ |
| `artifact-card` | 一覧に並ぶ成果物のカード |

新しい画面を足すときは、画面ごとに目印を付けるのではなく、共通の部品に同じやり方で付けてください。そうすればツアーで使う語彙が増えず、セレクターが腐りません。

同じ仕組みは、デスクトップアプリに用意された（エージェントを介さない）ツアーも動かしています。機能ごとに専用の案内を同梱できます。

```ts

startTour([
  { selector: '[data-tour="composer"]', title: 'Composer', text: 'Type here.' },
  { selector: '[data-tour="files"]', title: 'Files', text: 'Browse your project.' }
])
```

各段階では、案内したい要素がある場所までアプリを移動させることもできます。ツアーが終われば元の場所に戻ります。

```ts
startTour([
  { navigate: '/artifacts', selector: '[data-tour="page-tabs"]', title: 'Filters', text: '…' },
  { pane: 'sessions', selector: '[data-slot="sidebar"]', title: 'Sessions', text: '…' }
])
```

`navigate` には画面の経路を、`pane` にはデスクトップの画面名を渡します。どちらもその段階に入るときに実行され、表示が遅れて現れる対象は待ってくれます。ツアーを閉じると（Esc も含め、どんな方法でも）始めた場所に戻ります。

2 番目の引数に `'preview'` を渡すと、アプリではなくプレビュー画面のページを相手に動きます。

### ヒント表示 {#tips}

ヒントは、演出を省いたツアーの 1 段階です。吹き出しが 1 つ、矢印が 1 本だけで、画面を暗くする幕もページ送りもありません。
「モデル名は実はボタンです」のような、指をさして伝えたほうが分かりやすい一文にちょうどよい重さで、
アプリ全体を暗くするほどではない場面に向いています。

`tip` ツールは `tour(action='targets')` が返すのと同じセレクターを受け取ります。
調べる操作はどちらも 1 回で済み、上に挙げた `data-tour` の目印もどちらからでも使えます。画面に出るヒントは常に 1 つで、新しいものが前のものと入れ替わります。

アプリ自身もヒントを出します。内蔵の機能一覧を順に紹介していくもので、通知というよりゲームのロード画面に出る豆知識のような間合いです。
起動してから早くても数分後、そのあとは 6 時間に 1 回まで、しかも本当に手が空いているときだけ出ます。
Hermes が出すヒントもこの間隔を共有するので、1 つ出れば 6 時間はアプリ側のヒントが静かになります。
順番に出てくるヒントを ✕ で閉じるとそのヒントは二度と出なくなり、設定の項目から呼び戻せます。

ヒントもツアーも既定では有効で、設定 → 外観（`display.in_app_tips`、`display.in_app_tours`）で切れます。
切るとアプリだけでなく Hermes 側にも効きます。この設定はつながっているゲートウェイの設定にまで届き、モデルに渡すスキーマからツールが外れるので、
使ってはいけない機能のことをエージェントが知らされることはありません。ほかのスキーマの変更と同じで、反映は次のセッションからです。
動いている会話は始めたときのツールセットのままなので、それまでの間はアプリ側が呼び出しを断ります。

## `todo` ツールセット {#todo-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `todo` | いまのセッションのタスク一覧を管理します。3 段階以上に分かれる複雑な作業や、利用者から複数の依頼を受けたときに使います。引数なしで呼ぶと現在の一覧を読めます。項目は入れ子にできます。項目の `parent` にほかの項目の id を書くと子タスクになり、画面には字下げした木構造で表示されます。 | — |

## `vision` ツールセット {#vision-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `vision_analyze` | AI の画像認識で画像を解析します。画像を扱えるメインモデルなら、画像そのものをツールの結果として返すので、次のやりとりでモデルが直接見られます。文字しか扱えないメインモデルの場合は、補助の画像認識モデルが画像を説明し、その文章を返します。どちらの場合もツールの呼び出し方は同じです。 | — |

## `video` ツールセット {#video-toolset}

自分で有効にするツールセットです（既定の `hermes-cli` の一式には入っていません）。`--toolsets video` を付けるか、設定の `toolsets:` に `video` を書いて有効にします。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_analyze` | URL かファイルのパスを指定して動画の中身を解析します。字幕、場面の切り分け、重要な時刻、映っているものの説明が得られます。 | — |

## `video_gen` ツールセット {#videogen-toolset}

自分で有効にするツールセットです（既定の `hermes-cli` の一式には入っていません）。`--toolsets video_gen` を付けるか、`hermes tools` → Video Generation から有効にします。後者ならバックエンド選びも案内してくれます。

バックエンドは `plugins/video_gen/<name>/` にプラグインとして入っています。

- **xAI Grok-Imagine** — 文章からの動画生成と、画像からの動画生成に対応（SuperGrok の OAuth か `XAI_API_KEY` が必要）。
- **FAL.ai** — Veo 3.1、Pixverse v6、Kling O3（`FAL_KEY` が必要）。

どちらの生成方法も `video_generate` の 1 つでまかなえます。静止画を動かすなら `image_url` を渡し、文章だけから作るなら省きます。有効なバックエンドに応じて適切なエンドポイントへ自動で振り分けられます。ツールの説明文はセッション開始時に組み立て直され、そのバックエンドで実際にできること（生成方法、縦横比、解像度、長さの範囲、参考画像の最大数、音声の可否）が反映されます。バックエンドの作り方は [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) を見てください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_generate` | 利用者が設定した動画生成のバックエンドを使って、文章から動画を作ったり（text-to-video）、静止画を動かしたり（image-to-video）します。画像を動かすときは `image_url` を渡し、文章だけから作るときは省きます。バックエンドが適切なエンドポイントへ自動で振り分けます。結果は `video` の欄に HTTP の URL か絶対パスで返ります。 | 有効な `video_gen` プラグインと、その資格情報（`XAI_API_KEY`、`FAL_KEY` など） |
| `xai_video_edit` | xAI Imagine で既存の動画を編集します。このプロバイダー専用です（`video_generate` とは別物）。`video_url` には、先に Imagine が返した公開 HTTPS の MP4 の URL を指定してください。 | xAI Imagine の資格情報（SuperGrok の OAuth か `XAI_API_KEY`） |
| `xai_video_extend` | xAI Imagine で既存の動画を延長します。このプロバイダー専用です（`video_generate` とは別物）。`video_url` には、先に Imagine が返した公開 HTTPS の MP4 の URL を指定してください。 | xAI Imagine の資格情報（SuperGrok の OAuth か `XAI_API_KEY`） |

## `web` ツールセット {#web-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `web_search` | Web を検索します。既定では最大 5 件を、タイトル・URL・説明付きで返します。`limit`（1〜100、既定は 5）も指定できます。検索語はそのまま設定したバックエンドへ渡されるので、`site:domain`、`filetype:pdf`、`intitle:word`、`-term`、`"exact phrase"` といった演算子は、バックエンドが対応していれば使えます。 | EXA_API_KEY、PARALLEL_API_KEY、FIRECRAWL_API_KEY、TAVILY_API_KEY、PERPLEXITY_API_KEY、KEENABLE_API_KEY のいずれか |
| `web_extract` | Web ページの URL から内容を取り出します。マークダウンやテキストの形で、余計なものを除いた本文が返ります（LLM による要約はしないので高速です）。PDF の URL（arxiv の論文や各種の文書）にも使えます。リンクをそのまま渡してください。文字数の上限（既定は 15000）に収まるページは全文が返り、それより大きいページは先頭と末尾を切り出した内容と、ディスクに保存した全文の場所を示す注記が返ります。1 回の呼び出しで URL は 5 つまでです。 | EXA_API_KEY、PARALLEL_API_KEY、FIRECRAWL_API_KEY、TAVILY_API_KEY、PERPLEXITY_API_KEY、KEENABLE_API_KEY のいずれか |

## `x_search` ツールセット {#xsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `x_search` | xAI に組み込まれた `x_search` の Responses ツールを使って、X（Twitter）の投稿・プロフィール・スレッドを検索します。公開されている X 上の話題・反応・主張を読み取るための機能で、書き込みはできません（一般の Web ページは対象外です）。投稿、返信、いいね、DM、メディアの添付、削除、ログイン中のアカウントの確認はできません。それらには別途、認証付きの X API（`xurl` スキルなど）が必要です。既定では無効で、`hermes tools` → 🐦 X (Twitter) Search から有効にします。スキーマが登録されるのは xAI の資格情報を設定しているときだけです（check_fn による判定）。 | XAI_API_KEY **または** xAI Grok の OAuth ログイン（SuperGrok / Premium+） |

## `tts` ツールセット {#tts-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `text_to_speech` | 文章を読み上げの音声に変換します。返るのは MEDIA: 付きのパスで、各サービスがそれを音声メッセージとして届けます。Telegram ではボイスメッセージとして再生され、Discord や WhatsApp では音声ファイルの添付になります。CLI では ~/voice-memos/ に保存されます。声とプロバイダーは… | — |

## `discord` ツールセット {#discord-toolset}

`hermes-discord` のツールセットとして登録されます（ゲートウェイ限定）。メッセージング用の窓口と同じボットのトークンを使います。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord` | Discord のサーバーを読み、やりとりに参加します。操作には `search_members`、`fetch_messages`、`send_message`、`react`、`fetch_channel`、`list_channels` などがあります。 | `DISCORD_BOT_TOKEN` |

## `discord_admin` ツールセット {#discordadmin-toolset}

`hermes-discord` のツールセットとして登録されます。管理の操作には、ボット側に対応する Discord の権限が必要です。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord_admin` | REST API を通して Discord のサーバーを管理します。サーバー・チャンネル・ロールの一覧、チャンネルの作成・編集・削除、ロールの付与、タイムアウト、キック、BAN ができます。 | `DISCORD_BOT_TOKEN` とボットの権限 |

## `spotify` ツールセット {#spotify-toolset}

同梱の `spotify` プラグインが登録します。OAuth のトークンが必要なので、`hermes auth spotify` を一度実行して認証してください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `spotify_playback` | Spotify の再生を操作したり、いまの再生状態を調べたり、最近聴いた曲を取得したりします。 | Spotify の OAuth |
| `spotify_devices` | Spotify Connect の機器を一覧したり、再生をほかの機器へ移したりします。 | Spotify の OAuth |
| `spotify_queue` | 再生待ちの一覧を調べたり、曲を追加したりします。 | Spotify の OAuth |
| `spotify_search` | Spotify のカタログから、曲・アルバム・アーティスト・プレイリスト・番組・エピソードを検索します。 | Spotify の OAuth |
| `spotify_playlists` | Spotify のプレイリストを一覧・確認・作成・更新・編集します。 | Spotify の OAuth |
| `spotify_albums` | Spotify のアルバム情報や収録曲を取得します。 | Spotify の OAuth |
| `spotify_library` | 保存済みの曲やアルバムを一覧したり、保存・削除したりします。 | Spotify の OAuth |

## `hermes-yuanbao` ツールセット {#hermes-yuanbao-toolset}

`hermes-yuanbao` のツールセットでのみ登録されます。Yuanbao はテンセントのチャットアプリで、これらのツールはその DM・グループ・スタンプの API を操作します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `yb_query_group_info` | グループ（アプリ内では「派/Pai」と呼びます）の基本情報を調べます。名前、オーナー、メンバー数が分かります。 | Yuanbao の資格情報 |
| `yb_query_group_members` | グループのメンバーを調べます（`@` によるメンション、名前からの人探し、ボットの一覧に使います）。 | Yuanbao の資格情報 |
| `yb_send_dm` | グループにいる相手に個別メッセージを送ります。メディアファイルも添えられます。 | Yuanbao の資格情報 |
| `yb_search_sticker` | Yuanbao に用意されたスタンプ（TIM の顔文字）をキーワードで探します。 | Yuanbao の資格情報 |
| `yb_send_sticker` | いまの Yuanbao のチャットに、用意されたスタンプを送ります。 | Yuanbao の資格情報 |
