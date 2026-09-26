---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "組み込みツール一覧"
description: "Hermes の組み込みツールをツールセットごとにまとめた公式な一覧"
upstream_path: reference/tools-reference.md
upstream_blob: 357ab37c0500b7dc1c3826a59d3edea7fa731c4c
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/tools-reference
---

# 組み込みツール一覧 {#built-in-tools-reference}

このページでは、Hermes の組み込みツールをツールセットごとに説明します。何が使えるかは、動かしている環境、資格情報、有効にしているツールセットによって変わります。

**ざっくりした数（現在の登録内容）:** 約 100 個のツールがあります。内訳は、ブラウザ用の中核ツール 10 個、CDP がある場合だけ現れるブラウザツール 2 個、ブラウザの保管庫ツール 5 個、それに `browser_exec`、ファイル操作 4 個、Home Assistant 4 個、ターミナル 2 個（`terminal`、`process_manage`）、デスクトップ GUI 用の 11 個（`read_terminal`、`close_terminal`、`desktop_preview`、`drive_preview`、`annotate_preview`、`read_window_below`、`focus_pane`、`react_to_message`、`gui_tour`、`show_tip`、`apply_layout` — デスクトップアプリのセッション限定）、ウェブ 2 個、Feishu 5 個、Spotify 7 個（同梱の `spotify` プラグインが登録します）、Yuanbao 5 個、かんばん 14 個（かんばんのディスパッチャーがエージェントを起動したときに登録されます）、プロジェクト 1 個（`desktop_project`。デスクトップ / GUI のセッション向け）、Discord 2 個、動画 3 個（`video_generate`、`xai_video_edit`、`xai_video_extend`）、そして単体のツールがいくつか（`memory`、`clarify`、`delegate_task`、`execute_code`、`cronjob_manage`、`session_search`、`skill_view`/`skill_manage`/`skills_list`、`text_to_speech`、`image_generate`、`vision_analyze`、`video_analyze`、`todo_list`、`computer_use`、`x_search`）です。

:::tip MCP ツール
Hermes は組み込みツールに加えて、MCP サーバーからツールを動的に読み込めます。MCP のツールは `mcp__<server>__` という接頭辞付きで現れます（たとえば `github` という MCP サーバーなら `mcp__github__create_issue`）。設定方法は [MCP 連携](/hermes/docs/user-guide/features/mcp/) をご覧ください。
:::

## `browser` ツールセット {#browser-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_back` | ブラウザの履歴をひとつ戻り、前のページを開きます。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_click` | スナップショットに出てくる参照 ID（'@e5' など）で指定した要素をクリックします。参照 ID はスナップショットの出力に角かっこで示されます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_console` | 現在のページのブラウザコンソール出力と JavaScript のエラーを取得します。console.log/warn/error/info のメッセージと、捕捉されなかった JS の例外を返します。黙って起きている JavaScript のエラー、失敗した API 呼び出し、アプリの警告を見つけるのに使います。先に… | — |
| `browser_get_images` | 現在のページにあるすべての画像を、URL と代替テキスト付きで一覧にします。vision ツールで解析したい画像を探すときに便利です。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_navigate` | ブラウザで URL を開きます。セッションを初期化し、ページを読み込みます。ほかのブラウザツールより先に呼ぶ必要があります。ちょっとした情報を取りたいだけなら、軽い取得用のツールが使えるならそちらのほうが速くて安上がりです。ブラウザツールは、次のような場合に使ってください… | — |
| `browser_press` | キーボードのキーを押します。フォームの送信（Enter）、移動（Tab）、ショートカットに便利です。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_scroll` | ページを指定した方向にスクロールします。いま表示されている範囲の上や下にある内容を出したいときに使います。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_snapshot` | 現在のページのアクセシビリティツリーを、文字ベースのスナップショットとして取得します。browser_click や browser_type で使う参照 ID（@e1、@e2 など）付きで、操作できる要素を返します。full=false（既定）は操作できる要素だけの簡潔な表示、full=true は… | — |
| `browser_type` | 参照 ID で指定した入力欄に文字を入力します。いったん中身を消してから、新しい文字を入力します。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_vision` | 現在のページのスクリーンショットを撮り、見た目を確かめられるようにします。ページがどう見えているかを知る必要があるとき、とくに CAPTCHA、目視での確認課題、複雑なレイアウト、文字のスナップショットでは大事な視覚情報が抜け落ちる場面で使います。視覚に対応したモデルではスクリーンショットをそのまま添付し、そうでなければ補助の視覚モデルに… | — |

## `browser` ツールセット（CDP がある場合だけ現れるツール） {#browser-toolset-cdp-gated-tools}

この 2 つは `browser` ツールセットに属しますが、セッションの開始時に Chrome DevTools Protocol の接続先に届く場合だけ登録されます。届く経路は `/browser connect`、`browser.cdp_url` の設定、Browserbase のセッション、Camofox のいずれかです。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_cdp` | Chrome DevTools Protocol のコマンドをそのまま送ります。上位の `browser_*` ツールでは手が届かないブラウザ操作のための逃げ道です。https://chromedevtools.github.io/devtools-protocol/ を参照してください。 | CDP の接続先 |
| `browser_dialog` | JavaScript の標準ダイアログ（alert / confirm / prompt / beforeunload）に応答します。先に `browser_snapshot` を呼んでください。応答待ちのダイアログはその `pending_dialogs` に出ます。そのうえで `browser_dialog(action='accept'\|'dismiss')` を呼びます。 | CDP の接続先 |

## `clarify` ツールセット {#clarify-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `clarify` | 先へ進む前に、確認・意見・判断がほしいときに利用者へ質問します。3 つの形式があります。1. **単一選択の選択式** — 選択肢は 4 つまでで、利用者はひとつ選ぶか、5 番目の「その他」から自分の答えを書けます。2. **複数選択の選択式** — `multi_select=true` にするとチェックボックスが出て、選ばれた項目の一覧が返ります。3. **自由回答** — 選択肢を出さず、利用者が自由に書きます。選択肢は良いと思う順に並べるので、先頭にはどの画面でも `(Recommended)` と付き、既定で強調されます。この表示は見せ方だけのもので、エージェントが読む回答からは取り除かれます。従来の CLI では複数選択はスペースキーでチェックを切り替えます。チェックボックスの UI がないメッセージングのプラットフォームでは、利用者はカンマや空白で区切った番号（たとえば "1, 3"）か、選択肢の文言で答えます。 | — |

### 複数の質問をまとめて聞く {#asking-multiple-questions-at-once}

`clarify` ツールは `questions` の配列（それぞれに `choices` と `multi_select` を持つ、独立した質問を 2〜5 個）も受け取れます。順番に聞く代わりに、確認したいことをひとまとめにして一度に出せます。結果は同じ順番の `responses` 配列で返り、質問に `id` を付けていればそれも一緒に返ります。

画面ごとの振る舞いは次のとおりです。

- **デスクトップ** では、すべての質問が 1 枚のカードに並びます。選択と入力はその場に溜まり、**Confirm and continue** ボタン（すべての質問に答えると押せるようになります）で一括送信します。溜めた答えは確定するまで直せます。スキップすると全体が取り消されます。
- **TUI と CLI** では、簡潔な状態一覧（`✓` 回答済み / `▸` 回答中 / `·` 未回答）が出て、回答中の質問の選択肢だけが開きます。Enter でいまの答えを確定して次の未回答へ進み、Tab で質問の間を移動して好きな順に答えられます。Esc で全体を取り消します。
- **メッセージングのプラットフォーム**（Telegram、Discord など）では、これまでどおり 1 問ずつの質問として順に聞きます。途中で返事が来なくなれば、残りの質問は送られません。

途中で待ち時間が尽きた場合も、利用者がすでに確定した答えは残ります。ツールの結果にはその答えと `"timed_out": true` が入り、未回答の欄は空のままになるので、意図的に飛ばしたのか、そもそも人がいなかったのかを見分けられます。メッセージングのプラットフォームでは、待ちが終わった理由も `"notice"` として入ります（`[user did not respond within Nm]`、プラットフォームがカードを受け付けなかったときは `[clarify prompt could not be delivered]` — Hermes はまず番号付きの箇条書きメッセージとして質問し直し、それも失敗したときだけこう報告します。問いかけるチャットが無い実行では `[clarify prompt could not be delivered: no chat surface]`）。届かなかった問いかけが、利用者の無反応として報告されることはありません。

## `connections` ツールセット {#connections-toolset}

外部アプリの 2 種類を、ひとつのツールで扱います。対象になるのは、管理されたコネクター（`"gmail"` や
`{"name": "gmail"}`。Nous のゲートウェイ経由で認可します）か、手元の MCP サーバー
（`{"name": "linear", "mcp": true}`。`mcp_servers` に書いた項目）です。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `manage_connections` | 管理されたコネクター向けの操作: `status`、`connect`、`reconnect`（つながっていないものだけ直します。`force: true` なら動いているものも入れ直します）。MCP 向けの操作は `mcp: true` の対象だけで、カタログの項目を `install`、無効にしてある設定済みサーバーを `enable`、`authorize`（OAuth）です。デスクトップアプリ、ターミナル UI、従来の CLI では、どの操作でもカードが出て、対象がつながるか、飛ばされるか、300 秒の締め切りが来るまで待ちます。結果には対象が `connected`、`skipped`、`not_connected` のいずれかで並び、リンクは付きません。MCP の `install` は、その項目の設定値をカードで集め、OAuth があればカードから実行し（リンクは利用者が開きます。勝手には開きません）、サーバーがトークンを受け付けた時点で設定・トークン・値をまとめて保存します。つながった MCP の対象には `tools`（登録された名前）と `tools_listing` が付き、そのツールは同じターンのうちに `tool_describe`/`tool_call` から呼べます。`discovery_error` が付いた対象は認可はできているものの、ツールの一覧を取れなかった状態です。もう一度 `install` か `authorize` を呼べば、あらためて同意を求めずに一覧の取得だけをやり直せます。カードが出ない画面（メッセージングや台本からの実行）では、管理されたコネクターはアプリごとに `connect_url` を返し、利用者がそれを開きます。MCP の対象はその場で実行され、`authorize` と OAuth を伴う `install` は認可用の URL を返し、それ以外の install と `enable` は結果を報告し、資格情報が足りなければ設定すべき変数名を添えて `failed` で返ります。アカウントの接続解除や権限の取り消しはできません。 | — |

1 回の呼び出しの締め切りは 5 分で、呼び出しが始まった時点でバックエンドが決めます。
チャットを開き直しても、デスクトップを再起動しても延びません。このツールが現れるのは、
ログイン中のアカウントに対して Nous Portal がコネクターを有効にしている場合（トークンに `managed_tools` の
クレームがある場合）だけです。それ以外のセッションには出てきません。

## `code_execution` ツールセット {#codeexecution-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `execute_code` | Hermes のツールをプログラムから呼べる Python スクリプトを実行します。ツールの呼び出しが 3 回以上あって間に処理を挟みたいとき、大きな出力を文脈に入れる前に絞り込みたいとき、条件分岐が必要なとき（… | — |

## `cronjob` ツールセット {#cronjob-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `cronjob_manage` | 定時実行のタスクをまとめて管理します。`action="create"`、`"list"`、`"update"`、`"pause"`、`"resume"`、`"run"`、`"remove"` で操作します。スキルをひとつ以上ひも付けたジョブにも対応し、更新時に `skills=[]` を渡すとひも付けを外せます。定時実行は、いまのチャットの文脈を持たない新しいセッションで動きます。 | — |

## `delegation` ツールセット {#delegation-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `delegate_task` | 切り離した文脈でサブエージェントを起動します。それぞれが自分の会話、ターミナルのセッション、ツールセットを持ち、戻ってくるのは最後の要約だけです。ひとつの仕事なら 'goal'、並列でまとめて走らせるなら 'tasks' を渡します（上限や入れ子の規則は… | — |

## `feishu_doc` ツールセット {#feishudoc-toolset}

Feishu の文書コメントに自動で返信する処理（`gateway/platforms/feishu_comment.py`）専用です。`hermes-cli` や通常の Feishu チャット用アダプターには出てきません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_doc_read` | file_type とトークンを指定して、Feishu / Lark の文書（Docx、Doc、Sheet）の本文を丸ごと読みます。 | Feishu アプリの資格情報 |

## `feishu_drive` ツールセット {#feishudrive-toolset}

Feishu の文書コメント処理専用です。ドライブ上のファイルに対するコメントの読み書きを担当します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_drive_add_comment` | Feishu / Lark の文書やファイルに、最上位のコメントを付けます。 | Feishu アプリの資格情報 |
| `feishu_drive_list_comments` | Feishu / Lark のファイルに付いた文書全体へのコメントを、新しい順に並べます。 | Feishu アプリの資格情報 |
| `feishu_drive_list_comment_replies` | Feishu のコメントスレッド（文書全体または選択範囲）への返信を一覧にします。 | Feishu アプリの資格情報 |
| `feishu_drive_reply_comment` | Feishu のコメントスレッドに返信します。`@` によるメンションも付けられます。 | Feishu アプリの資格情報 |

## `file` ツールセット {#file-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `patch` | ファイルの一部を狙って置き換えます。ターミナルの sed や awk の代わりに使ってください。あいまい一致（9 通りの方法）で探すので、空白や字下げの小さな違いでは失敗しません。統一形式の差分を返します。編集後には自動で構文検査を走らせます… | — |
| `read_file` | テキストファイルを行番号付き・ページ送りで読みます。ターミナルの cat や head、tail の代わりに使ってください。出力の形式は 'LINE_NUM\|CONTENT' です。見つからないときは似た名前のファイルを提案します。大きなファイルには offset と limit を使ってください。約 10 万文字を超える読み取りは行の区切りで打ち切られ、next_offset を返します。Jupyter のノートブック（.ipynb）、Word の文書（.docx）、Excel のブック（.xlsx）も… | — |
| `search_files` | ファイルの中身を検索したり、名前でファイルを探したりします。ターミナルの grep、rg、find、ls の代わりに使ってください。ripgrep を使っているので、シェルで同じことをするより高速です。中身の検索（target='content'）は、ファイル内を正規表現で探します。出力の形式は、一致した行を… | — |
| `write_file` | ファイルに内容を書き込み、元の中身をすべて置き換えます。ターミナルの echo や cat のヒアドキュメントの代わりに使ってください。親のディレクトリは自動で作られます。ファイル全体を上書きするので、一部だけ直したいときは 'patch' を使ってください。すでにあるファイルには、先に read_file を呼んでください。そのタスクでファイル全体を読んだ記録も書いた記録も無い場合、あるいは読んだあとにディスク上でファイルが変わった場合、write_file は書き込みを断ります（ファイルはそのままです）。断られたら read_file で読み直し、内容を合わせてからやり直してください。.py / .json / .yaml / .toml など構文検査のある言語では自動で検査を走らせ、その書き込みで新しく生じたエラーだけを知らせます。 | — |

手元のファイルについては、伏せ字のない全体の読み取り（同じ版のファイルの全ページを含みます）か、成功した `write_file` があれば、ファイル全体の基準が手に入ります。そのあと一部だけを読み直しても、中身のバイトが変わらないかぎりこの基準は失われません。ファイルが変わった場合、まだ読んでいない場合、伏せ字や省略のある表示しか見ていない場合は、置き換える前にあらためて全体を読む必要があります。`patch` による部分的な編集はそのまま使えます。ターミナルのコマンドや `execute_code` から書き込んでも、`write_file` の基準にはなりません。

## `homeassistant` ツールセット {#homeassistant-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `ha_call_service` | Home Assistant のサービスを呼んで機器を操作します。各ドメインで使えるサービスとその引数は ha_list_services で調べられます。 | — |
| `ha_get_state` | Home Assistant のエンティティひとつについて、明るさ・色・温度の設定値・センサーの値といった属性も含めた詳しい状態を取得します。 | — |
| `ha_list_entities` | Home Assistant のエンティティを一覧にします。ドメイン（light、switch、climate、sensor、binary_sensor、cover、fan など）や、エリア名（リビング、キッチン、寝室など）で絞り込めます。 | — |
| `ha_list_services` | 機器を操作するために使える Home Assistant のサービス（アクション）を一覧にします。機器の種類ごとにどんな操作ができて、どんな引数を取るのかがわかります。ha_list_entities で見つけた機器の動かし方を調べるのに使います。 | — |

## `computer_use` ツールセット {#computeruse-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `computer_use` | cua-driver を通じて、背後でデスクトップを操作します。スクリーンショット（SOM / 視覚 / AX）、クリック・ドラッグ・スクロール・入力・キー操作・待機、list_apps、focus_app ができます。利用者のマウスカーソルやキーボードの入力先を奪いません。ツールを扱えるモデルなら何でも使えます。macOS、Windows、Linux に対応します。 | `$PATH` に `cua-driver` があること（`hermes tools` から入れられます）。 |

:::note
**Honcho のツール**（`honcho_profile`、`honcho_search`、`honcho_context`、`honcho_reasoning`、`honcho_conclude`）は組み込みではなくなりました。`plugins/memory/honcho/` にある Honcho メモリープロバイダーのプラグインとして使えます。導入と使い方は [メモリープロバイダー](/hermes/docs/user-guide/features/memory-providers/) をご覧ください。
:::

## `image_gen` ツールセット {#imagegen-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `image_generate` | 利用者が設定したバックエンド（FAL.ai、OpenAI、OpenAI Codex の認証、xAI、Krea）を使って、文章から画像を作ったり（text-to-image）、既存の画像を編集・変換したり（image-to-image）します。画像を編集するなら `image_url` を、作風の参考にする画像があれば `reference_image_urls` を渡します。どちらも渡さなければ文章からの生成になります。モデルは利用者が設定するもので、エージェントからは選べません。画像の URL かローカルのパスをひとつ返します。 | FAL_KEY / OPENAI_API_KEY / Codex の OAuth / xAI の OAuth / KREA_API_KEY |

## `kanban` ツールセット {#kanban-toolset}

登録されるのは、エージェントが (a) かんばんのディスパッチャーから起動された（環境変数 `HERMES_KANBAN_TASK` がある）とき、または (b) `kanban` ツールセットを明示的に有効にしたプロファイルで動いているときです。タスク単位で動くワーカーは、割り当てられたタスクのライフサイクル用ツールを使います。とりまとめ役のプロファイルには、さらに `kanban_list` や `kanban_unblock` のような盤の差配用ツールが加わります。一連の流れは [かんばんによるマルチエージェント](/hermes/docs/user-guide/features/kanban/) をご覧ください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `kanban_show` | このワーカーに割り当てられている、いま進行中のかんばんタスク（題名、説明、コメント、依存関係）を表示します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_list` | 条件で絞って盤のタスクを一覧にします。とりまとめ役専用で、ディスパッチャーが起動したタスクのワーカーには出てきません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_complete` | 引き継ぎの内容（成果、成果物、残件）を構造化して添え、いまのタスクを完了にします。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_block` | 利用者への質問でいまのタスクを止めます。ディスパッチャーは処理を一時停止して質問を見せ、人が答えたら再開します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_review` | `summary`、任意の構造化された `metadata`、任意のレビュアー用プロファイルを添えて、実装をレビュアーに渡します。同じタスクが `review` へ移るだけで、ブロックではないのでブロック回数の勘定にも影響しません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_changes` | 実際に担当しているレビューに対するレビュアーの判定です。そのレビューを終了し、親タスクによる制御をかけ直したうえで、ブロックを使わずにタスクを元の実装者へ戻します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_heartbeat` | 長くかかる処理の途中で進行中の合図を送り、ワーカーが生きていることをディスパッチャーに伝えます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_comment` | 状態を変えずにタスクのスレッドへコメントを足します。途中でわかったことを共有するのに便利です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_create` | いまのタスクから子タスクを展開します。とりまとめ役や、残件を切り出すワーカーが使います。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_link` | タスク同士を親 → 子の依存関係でつなぎます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_unblock` | 止まっているタスクを、親がすべて終わっていれば `ready` へ、まだ開いている親があれば `todo` へ移します。とりまとめ役専用で、ディスパッチャーが起動したタスクのワーカーには出てきません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_attach` | ファイルの中身をそのまま（base64 で）渡して、タスクに添付します。タスクの添付ディレクトリに実ファイルとして保存され、上限は 25 MB です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attach_url` | URL を渡してタスクにファイルを添付します。Hermes がサーバー側でダウンロードし、実ファイルとして保存します（上限 25 MB）。http と https の URL だけ使えます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attachments` | タスクに添付されたファイルを一覧にします。id、ファイル名、content_type、サイズ、追加した人、ディスク上の絶対パスがわかります。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |

## `project` ツールセット {#project-toolset}

デスクトップの [プロジェクト](/hermes/docs/user-guide/cli/)（名前を付けた、複数のフォルダーをまとめた作業場）を操作するツールです。`project` ツールセットを有効にしたとき（主にデスクトップアプリやダッシュボードの画面）に登録されます。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `desktop_project` | プロジェクトに関する 3 つの操作を、ひとつの action で扱います。`create` はデスクトップのプロジェクト（名前を付けた作業場）を作り、このチャットをそこへ移します。`path` を渡せばリポジトリやフォルダーにひも付けられます。`list` はデスクトップのプロジェクトと、どれがいま有効かを表示します。`switch` は既存のプロジェクト（名前、slug、id のいずれかで指定）へこのチャットを移し、セッションの作業場所をそのプロジェクトの主フォルダーへ移します。 | — |

## `memory` ツールセット {#memory-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `memory` | セッションをまたいで残る記憶に、大事な情報を保存します。保存した記憶はセッション開始時のシステムプロンプトに現れます。これが、会話と会話のあいだで利用者や環境のことを覚えておく仕組みです。何を保存するか… | — |

## `setup` ツールセット {#setup-toolset}

デスクトップのセットアップ用プロファイル（`profile.yaml` に `role: setup` を持つもの）のセッションにだけ与えられます。設定では変えられません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `manage_catalog` | セットアップ用プロファイル専用（`setup` ツールセット）で、デスクトップのチャットでだけ使えます。`search` は、`query` に合うカタログのプラグインとハブのスキルを（必要なら `kind` を 1 つに絞って）一覧表示し、`id`、`kind`、`display`、`tier`、`platforms`、`installed`（`default` プロファイルに入っているか）を返します。何も変更しません。`install` は `items: [{kind, id}]` を受け取り、項目ごとに 1 行（Install、Advanced、Skip）が並ぶ承認カードを 1 枚表示します。カタログが知らない id や、この OS では動かないプラグインは、理由を添えて失敗として表示されます。承認された行は、カタログで審査済みのコミットで `default`（または Advanced で選んだプロファイル）にインストールされます。停止リスト、セキュリティスキャン、その場での有効化は Plugins タブと同じなので、プラグインの MCP ツールとスキルは、そのプロファイルで開いているチャットですぐに使えます。結果には各行が `connected`（`tools` と `skill` 付き）、`skipped`、`failed`（`detail` 付き）、`not_connected` のどれになったかが並びます。モデルがソース、コミット、プロファイル、設定を渡すことはできません。ほかの場所で呼ぶと、代わりに実行すべき `hermes plugins install` / `hermes skills install` のコマンドを返します。 | — |

## `session_search` ツールセット {#sessionsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `session_search` | 手元のセッション DB に保存された過去のセッションを検索したり、ひとつのセッションの中をたどったりします。FTS5 を使った検索で、DB にある実際のメッセージを返します（LLM は呼びません）。使い方は 4 通りで、探す（`query` を渡す）、たどる（`session_id` と `around_message_id` を渡す）、読む（`session_id` だけ）、眺める（引数なし）です。探す場合は期間の指定（`after`/`before` — ISO 形式の日付か、`7d`、`24h`、`2w` のような相対指定）と、繰り返し探し直すための `exclude_session_ids` が使えます。 | — |

## `skills` ツールセット {#skills-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `skill_manage` | スキルを管理します（作成・更新・削除）。スキルは手順の記憶であり、繰り返し出てくる種類の仕事に対する、使い回せるやり方です。新しいスキルは ~/.hermes/skills/ に置かれ、既存のスキルは置いてある場所で編集できます。操作は create（SKILL.m… | — |
| `skill_view` | スキルを使うと、特定の仕事や手順についての情報に加えて、スクリプトやテンプレートも読み込めます。スキルの中身をすべて読み込むか、ひも付いたファイル（参考資料、テンプレート、スクリプト）を開きます。最初の呼び出しでは SKILL.md の中身と… | — |
| `skills_list` | 使えるスキル（名前と説明）を一覧にします。中身をすべて読むには skill_view(name) を使ってください。 | — |

## `terminal` ツールセット {#terminal-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `process_manage` | terminal(background=true) で起動した背後のプロセスを管理します。操作は 'list'（すべて表示）、'poll'（状態と新しい出力を確認）、'log'（ページ送りで全出力）、'wait'（終わるか時間切れまで待つ）、'kill'（終了させる）、'write'（送… | — |
| `terminal` | Linux 環境でシェルのコマンドを実行します。ファイルシステムは呼び出しをまたいで残ります。長く動かすサーバーには `background=true` を指定してください。`background=true` と一緒に `notify_on_complete=true` を指定すると、処理が終わったときに自動で知らせが来ます（こちらから確認しにいく必要はありません）。さらに `heartbeat=N`（秒。最小 60）を足すと、前回以降に出た出力を持った知らせが定期的に届きます。マージの列やテスト一式のような、長いけれど終わりのある仕事で、失敗を終了時ではなく N 秒以内に気づくためのものです。cat / head / tail は使わず read_file を、grep / rg / find は使わず search_files を使ってください。 | — |

## `desktop_ui` ツールセット {#desktopui-toolset}

Hermes のデスクトップアプリから始まったセッションで有効になります。つないでいる先が
ローカル、SSH、URL、Hermes Cloud のいずれでもかまいません。CLI、TUI、
メッセージング、定時実行のセッションには出てきません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `read_terminal` | Hermes デスクトップ GUI のアプリ内ターミナル（このチャットの隣にある埋め込みのシェル）に、いま表示されている内容を読みます。 | — |
| `close_terminal` | Hermes デスクトップ GUI で、背後のプロセス用に開かれている読み取り専用のターミナルタブを閉じます。プロセスは終了しません。タブと表示が消えるだけなので、止めたいときは process_manage(action='kill') を使ってください。 | — |
| `desktop_preview` | Hermes デスクトップアプリのチャット横にあるプレビュー画面を操作します。`open` はウェブの URL、localhost の開発サーバーの URL、ファイルのパスを開きます（HTML はその場で描画されます）。`close` は画面全体（`url` を省略）か、中のタブひとつ（URL かファイルのパスを指定）を閉じます。`read` はいま表示されている内容、つまりアプリ内ブラウザのページの文字（URL、題名、描画された文字。`start`/`count` でページ送りできます）か、ファイルや成果物のタブの素性を返します。 | — |
| `drive_preview` | アプリ内ブラウザで開いているページを操作します。`elements` はクリックや入力ができるものを、それぞれ名前になる参照（`btn-sign-in` や `inp-email` のようなもの）と役割・ラベル・値付きで洗い出します。そのうえで `click`、`hover`、`type`、`scroll`、`press` が参照に対して働き、`back`/`forward`/`reload` が画面の履歴を動かします。ポインターとキーボードは本物の入力なので、ホバーで開くメニューもちゃんと開きます。参照はページが移動するまで有効で、要素を作り直す再描画をまたいでも生きています。そのため最初に洗い出したあとは、どの操作もページ全体ではなく差分だけ、つまり何が増え、消え、変わり、つなぎ直されたかを返します。 | — |
| `annotate_preview` | アプリ内ブラウザで要素を枠で囲み、消すまで残します。`drive_preview` が作業中に出す一瞬の目印に対する、意図して置くほうの印です。`add` は参照に短いラベル付きで印を付け、`remove` はひとつ外し、`clear` はすべて外します。印は要素について動き、要素が消えれば一緒に消えるので、ページを移動すると消えます。 | — |
| `read_window_below` | Hermes デスクトップのウィンドウのすぐ下にある OS のウィンドウを特定します。アプリ名、題名、位置と大きさ（メタデータだけで、画素は一切扱いません）がわかります。macOS では、ほかのアプリの題名は画面収録の許可がすでに与えられている場合だけ見え、このツールから許可を求めることはありません。 | — |
| `focus_pane` | Hermes デスクトップアプリの画面（チャット、ファイル、ターミナル、レビュー、セッション）を表示して前面に出します。 | — |
| `react_to_message` | メッセージに絵文字ひとつでリアクションします。iMessage のタップバックのような見え方です。設定 → 外観（`display.message_reactions`）で有効にします。 | — |
| `gui_tour` | その場で案内をします。画面を暗くし、要素を強調し、説明の吹き出しを添えます（driver.js）。Hermes アプリ自身の UI でも、プレビュー画面で開いているページでも使えます。`targets` は画面にあるものを洗い出し、`show` は順に説明し、`start` は利用者に「次へ / 戻る」の操作を渡します。 | — |
| `show_tip` | 要素ひとつを、小さな色付きの吹き出しと矢印で指し示します。`gui_tour` の静かな兄弟で、画面は暗くならず、スポットライトも「次へ / 戻る」もありません。同じ `data-tour` の手がかりと、同じ `tour(action='targets')` による洗い出しを使います。 | — |
| `apply_layout` | 利用者が作業場所の並べ替えを求めたときに、保存してあるレイアウトを Hermes デスクトップアプリへ適用します。組み込みは default（チャット + サイドバー）、focus（チャットのみ）、terminal-deck、quad で、プラグインや利用者が作ったものは id で指定します。画面をひとつだけ出したいなら `focus_pane` を使ってください。 | — |

### 案内ツアー {#tours}

`gui_tour` ツールは案内する先を自分で見つけます。`action='targets'` を呼ぶと、画面上で指し示せる要素が、セレクター、ラベル、`stable` の印付きで返ってきます。安定したセレクターは素性（`data-tour`、`id`、`data-testid`、`aria-label`）を手がかりにするので再描画をまたいでも生き残ります。位置で指定する `nth-child` の経路は生き残らないので、安定したものが先に並び、そちらを選ぶのが良いやり方です。

要素に自分で消えない手がかりを付けるには、こう書きます。

```html
<div data-tour="composer">…</div>
```

手がかりは呼び出し側ではなく**基本部品**のほうに付けるので、一度直せばすべての箇所に名前が付きます。すでにあるものは次のとおりです。

| 手がかり | 何を指すか |
|---|---|
| `overlay-nav` | 画面をかぶせる各経路（設定、定時実行、プロファイル、エージェント）の左側のナビゲーション |
| `nav-<id>` | そのナビゲーションの 1 行 — `nav-models`、`nav-appearance` など |
| `field-<schemaKey>` | 設定の 1 行を設定キーで指したもの — `field-model`、`field-provider` など |
| `page-tabs` | `PageSearchShell` を使うページ（成果物、スキルなど）の絞り込みタブ |
| `artifact-card` | 一覧に並ぶ成果物のカード |

画面を足すときは、ひとつずつ印を付けるのではなく、共有している基本部品に同じやり方で印を付けてください。そうすれば案内で使う語彙が少なく保たれ、セレクターが腐るのも防げます。

同じ仕組みは、デスクトップアプリに用意された（エージェントによらない）案内も支えています。機能ごとに専用の手ほどきを同梱できます。

```ts

startTour([
  { selector: '[data-tour="composer"]', title: 'Composer', text: 'Type here.' },
  { selector: '[data-tour="files"]', title: 'Files', text: 'Browse your project.' }
])
```

途中の手順でアプリを対象のある場所へ移すこともでき、案内が終わると元に戻ります。

```ts
startTour([
  { navigate: '/artifacts', selector: '[data-tour="page-tabs"]', title: 'Filters', text: '…' },
  { pane: 'sessions', selector: '[data-slot="sidebar"]', title: 'Sessions', text: '…' }
])
```

`navigate` には経路のパスを、`pane` にはデスクトップの画面名を渡します。どちらもその手順に入った時点で実行され、あとから現れる対象は待ってくれます。案内を閉じると、どの経路からでも、Esc であっても、始めた場所へ戻ります。

2 番目の引数に `'preview'` を渡すと、アプリではなくプレビュー画面のページを対象にできます。

### ひとこと案内 {#tips}

ひとこと案内は、演出を省いたツアーの 1 手順です。吹き出しがひとつ、矢印がひとつ、覆いも無ければ、
めくるものもありません。「モデル名はボタンです」のように、対象を指さしながら伝えたほうが
はっきりする一文にちょうどよい重さで、そのためにアプリ全体を暗くするのはやりすぎ、という場面のためのものです。

`show_tip` ツールは `gui_tour(action='targets')` が返すのと同じセレクターを取るので、
対象探しは両方で 1 回の呼び出しで済みます。前に挙げた消えない `data-tour` の手がかりも、
どちらからも対象を指せます。画面に出るひとこと案内は一度にひとつで、新しいものが前のものと入れ替わります。

アプリ自身もひとこと案内を出せます。組み込みの機能カタログを順にたどり、
通知というよりゲームのロード画面に出る豆知識くらいの間合いで見せます。起動から早くても
数分後、そのあとは 6 時間に 1 回まで、しかも本当に手が空いている瞬間だけです。
Hermes が出すひとことも同じ間合いを共有するので、出した時点で 6 時間は
このローテーションが静かになります。ローテーションは一巡だけです。カタログの各項目は、
時間切れで消えても ✕ で閉じても一度ずつ出て、全部の出番が終わればアプリは黙ります。
設定の項目から、また一巡をやり直せます。

ひとこと案内もツアーも既定では有効で、設定 → 外観
（`display.in_app_tips`、`display.in_app_tours`）で切れます。切ると Hermes 側にも効きます。
この切り替えはつないでいるゲートウェイの設定にまで届き、ツールがモデルのスキーマから外れるので、
使ってはいけない画面のことをエージェントが知らされることはありません。スキーマの変更はどれもそうですが、
効くのは次のセッションからです。進行中の会話は始めたときのツールセットを保ち、
その間はアプリ側が呼び出しを断ります。

## `todo` ツールセット {#todo-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `todo_list` | いまのセッションの作業一覧を管理します。手順が 3 つ以上ある込み入った仕事や、利用者から複数の仕事を渡されたときに使います。引数なしで呼ぶと、いまの一覧を読めます。項目は入れ子にできます。項目の `parent` にほかの項目の id を入れると子の作業になり、画面では字下げした木構造で表示されます。 | — |

## `vision` ツールセット {#vision-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `vision_analyze` | AI の視覚機能で画像を解析します。視覚に対応した主モデルでは、画像の画素をそのままマルチモーダルのツール結果として返すので、モデルは次のターンでそれを直接見られます。文字だけのモデルでは、補助の視覚モデルが画像を説明し、その説明を文字として返します。ツールの呼び出し方はどちらでも同じです。 | — |

## `video` ツールセット {#video-toolset}

任意で有効にするツールセットです（既定の `hermes-cli` の組には入っていません）。`--toolsets video` で足すか、設定の `toolsets:` に `video` を入れてください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_analyze` | URL やファイルのパスから動画の内容を解析します。字幕、場面の切り分け、重要な時刻、見た目の説明がわかります。 | — |

## `video_gen` ツールセット {#videogen-toolset}

任意で有効にするツールセットです（既定の `hermes-cli` の組には入っていません）。`--toolsets video_gen` で足すか、`hermes tools` → Video Generation から有効にしてください。後者ではバックエンド選びも案内されます。

バックエンドは `plugins/video_gen/<name>/` 以下のプラグインとして提供されます。

- **xAI Grok-Imagine** — 文章からの動画生成と画像からの動画生成（SuperGrok の OAuth か `XAI_API_KEY`）。
- **FAL.ai** — Veo 3.1、Pixverse v6、Kling 3.0 / O3（`FAL_KEY` が必要）。
- **OpenRouter** — OpenRouter の動画 API にある生成モデルすべて（Veo 3.1、Sora 2 Pro、Kling 3、Seedance 2、Wan 3、Hailuo 3、Grok Imagine、FLUX 3 Video など）。文章から、画像から、参考画像からの生成に対応し、カタログとモデルごとの上限はその場で取得します（`OPENROUTER_API_KEY` か、`hermes auth add openrouter` で追加した認証情報が必要で、料金は OpenRouter の残高から引かれます）。
- **DeepInfra** — OpenAI 互換の videos エンドポイント越しに、`video-gen` のカタログをその場で取得します（`DEEPINFRA_API_KEY` が必要）。

`video_generate` ひとつで両方の作り方をまかないます。静止画を動かすなら `image_url` を渡し、文章だけから作るなら省きます。有効なバックエンドが適切なエンドポイントへ自動で振り分けます。`image_generate` と同じく、モデルは利用者が設定するもので（`video_gen.model`）、エージェントからは選べません。動画系のツールはどれも `model` の引数を取らないのです。ツールの説明文はセッション開始時に組み立て直され、有効なバックエンドが実際にできること（生成の種類、縦横比、解像度、長さの範囲、参考画像の上限、音声の対応）を反映します。バックエンドの作り方は [動画生成プロバイダーのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) をご覧ください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_generate` | 利用者が設定した動画生成のバックエンドを使って、文章から動画を作ったり（text-to-video）、静止画を動かしたり（image-to-video）します。画像を動かすなら `image_url` を渡し、文章だけから作るなら省きます。バックエンドは適切なエンドポイントへ自動で振り分けます。結果は `video` の項目に、HTTP の URL か絶対パスのどちらかで返ります。 | 有効な `video_gen` プラグインと、その資格情報（`XAI_API_KEY`、`FAL_KEY` など） |
| `xai_video_edit` | xAI Imagine で既存の動画を編集します。この提供元に固有のもので、`video_generate` とは別です。`video_url` には、前回の Imagine の結果として得た公開 HTTPS の MP4 の URL を渡してください。 | xAI Imagine の資格情報（SuperGrok の OAuth か `XAI_API_KEY`） |
| `xai_video_extend` | xAI Imagine で既存の動画を延長します。この提供元に固有のもので、`video_generate` とは別です。`video_url` には、前回の Imagine の結果として得た公開 HTTPS の MP4 の URL を渡してください。 | xAI Imagine の資格情報（SuperGrok の OAuth か `XAI_API_KEY`） |

## `web` ツールセット {#web-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `web_search` | ウェブで情報を検索します。既定では最大 5 件を、題名・URL・説明付きで返します。任意で `limit`（1〜100、既定 5）を指定できます。検索語はそのまま設定したバックエンドへ渡すので、`site:domain`、`filetype:pdf`、`intitle:word`、`-term`、`"exact phrase"` といった演算子は、バックエンドが対応していれば使えます。 | EXA_API_KEY か PARALLEL_API_KEY か FIRECRAWL_API_KEY か TAVILY_API_KEY か PERPLEXITY_API_KEY か KEENABLE_API_KEY |
| `web_extract` | ウェブページの URL から内容を取り出します。マークダウンや素の文字として、余計なもののないページの中身を返します（LLM による要約はしないので高速です）。PDF の URL（arXiv の論文や文書）にも使えるので、PDF のリンクをそのまま渡してください。文字数の上限（既定 15000）に収まるページは丸ごと返り、それより大きいページは先頭と末尾を抜き出したうえで、ディスクに保存した全文の場所を末尾に示します。1 回につき URL は 5 つまでです。 | EXA_API_KEY か PARALLEL_API_KEY か FIRECRAWL_API_KEY か TAVILY_API_KEY か PERPLEXITY_API_KEY か KEENABLE_API_KEY |

## `x_search` ツールセット {#xsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `x_search` | xAI の Responses に組み込まれた `x_search` を使って、X（Twitter）の投稿・プロフィール・スレッドを検索します。いま何が話されているか、どんな反応や主張があるかを、公開されている X から読み取るだけの用途向けで、一般のウェブページ向けではありません。投稿、返信、いいね、DM、メディアのアップロード、削除、ログイン中のアカウントの確認はできません。それらには認証された別の X API の口（たとえば `xurl` スキル）が必要です。既定では無効で、`hermes tools` → 🐦 X (Twitter) Search から有効にします。スキーマが登録されるのは xAI の資格情報を設定しているときだけです（check_fn による判定）。 | XAI_API_KEY **または** xAI Grok の OAuth（SuperGrok / Premium+）でのログイン |

## `tts` ツールセット {#tts-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `text_to_speech` | 文章を読み上げの音声に変換します。MEDIA: で始まるパスを返し、各プラットフォームがそれを音声メッセージとして届けます。Telegram ではボイスの吹き出しとして、Discord や WhatsApp では音声の添付として再生されます。CLI では ~/voice-memos/ に保存します。声と提供元は… | — |

## `discord` ツールセット {#discord-toolset}

`hermes-discord` のプラットフォーム用ツールセットに登録されます（ゲートウェイのみ）。メッセージング用アダプターと同じボットのトークンを使います。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord` | Discord のサーバーを読み、やり取りに参加します。操作には `search_members`、`fetch_messages`、`send_message`、`react`、`fetch_channel`、`list_channels` などがあります。 | `DISCORD_BOT_TOKEN` |

## `discord_admin` ツールセット {#discordadmin-toolset}

`hermes-discord` のプラットフォーム用ツールセットに登録されます。管理の操作には、ボット側に対応する Discord の権限が必要です。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord_admin` | REST API から Discord のサーバーを管理します。ギルド・チャンネル・ロールの一覧、チャンネルの作成 / 編集 / 削除、ロールの付与、タイムアウト、キック、BAN ができます。 | `DISCORD_BOT_TOKEN` とボットの権限 |

## `spotify` ツールセット {#spotify-toolset}

同梱の `spotify` プラグインが登録します。OAuth のトークンが必要なので、`hermes auth spotify` を一度実行して認可してください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `spotify_playback` | Spotify の再生を操作したり、いまの再生状態を調べたり、最近聴いた曲を取得したりします。 | Spotify の OAuth |
| `spotify_devices` | Spotify Connect の機器を一覧にしたり、再生を別の機器へ移したりします。 | Spotify の OAuth |
| `spotify_queue` | 再生待ちの一覧を確認したり、そこに曲を足したりします。 | Spotify の OAuth |
| `spotify_search` | Spotify のカタログから、曲・アルバム・アーティスト・プレイリスト・番組・エピソードを検索します。 | Spotify の OAuth |
| `spotify_playlists` | プレイリストの一覧、確認、作成、更新、中身の変更をします。 | Spotify の OAuth |
| `spotify_albums` | Spotify のアルバム情報や、アルバムの収録曲を取得します。 | Spotify の OAuth |
| `spotify_library` | 保存した曲やアルバムを一覧にしたり、保存したり、外したりします。 | Spotify の OAuth |

## `hermes-yuanbao` ツールセット {#hermes-yuanbao-toolset}

`hermes-yuanbao` のプラットフォーム用ツールセットでのみ登録されます。Yuanbao はテンセントのチャットアプリで、これらのツールはその DM・グループ・スタンプの API を操作します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `yb_query_group_info` | グループ（アプリ内では「派 / Pai」と呼ばれます）の基本情報、つまり名前・オーナー・人数を調べます。 | Yuanbao の資格情報 |
| `yb_query_group_members` | グループのメンバーを調べます（`@` のメンション、名前からの人探し、ボットの一覧に使います）。 | Yuanbao の資格情報 |
| `yb_send_dm` | グループ内の相手に個別のメッセージを送ります。メディアのファイルも添えられます。 | Yuanbao の資格情報 |
| `yb_search_sticker` | Yuanbao に組み込まれたスタンプ（TIM face）のカタログを、キーワードで検索します。 | Yuanbao の資格情報 |
| `yb_send_sticker` | 組み込みのスタンプを、いまの Yuanbao のチャットへ送ります。 | Yuanbao の資格情報 |
