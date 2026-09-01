---
title: "組み込みツール一覧"
description: "Hermes の組み込みツールを、ツールセットごとにまとめた決定版の一覧です"
upstream_path: reference/tools-reference.md
upstream_blob: 17750665533eaff0e8bec1c819d149db19f8a9ef
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/tools-reference
---

# 組み込みツール一覧 {#built-in-tools-reference}

このページでは、Hermes の組み込みツールをツールセットごとにまとめています。何が使えるかは、動かしている環境、認証情報、有効にしているツールセットによって変わります。

**ざっくりした数（現在の登録内容）:** およそ 86 個のツールがあります。内訳は、ブラウザのツール 10 個（中核）に CDP が必要なブラウザのツール 2 個、ファイルのツール 4 個、Home Assistant のツール 4 個、ターミナルのツール 2 個（`terminal`、`process`）、デスクトップ GUI のツール 12 個（`read_terminal`、`close_terminal`、`open_preview`、`close_preview`、`read_preview`、`drive_preview`、`annotate_preview`、`read_window_below`、`focus_pane`、`react_to_message`、`tour`、`tip` — デスクトップアプリのセッション限定）、Web のツール 2 個、Feishu のツール 5 個、Spotify のツール 7 個（同梱の `spotify` プラグインが登録します）、Yuanbao のツール 5 個、kanban のツール 12 個（kanban の割り振り役がエージェントを起動したときに登録されます）、プロジェクトのツール 3 個（デスクトップ / GUI のセッション）、Discord のツール 2 個、動画のツール 3 個（`video_generate`、`xai_video_edit`、`xai_video_extend`）、そして単独のツールがいくつか（`memory`、`clarify`、`delegate_task`、`execute_code`、`cronjob`、`session_search`、`skill_view` / `skill_manage` / `skills_list`、`text_to_speech`、`image_generate`、`vision_analyze`、`video_analyze`、`todo`、`computer_use`、`x_search`）です。

:::tip MCP のツール
Hermes は組み込みのツールに加えて、MCP サーバーからツールを動的に読み込めます。MCP のツールは `mcp__<server>__` という接頭辞付きで現れます（たとえば `github` の MCP サーバーなら `mcp__github__create_issue`）。設定方法は [MCP の連携](/hermes/docs/user-guide/features/mcp/)を参照してください。
:::

## `browser` ツールセット {#browser-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_back` | ブラウザの履歴をひとつ前のページへ戻ります。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_click` | スナップショットの ref ID（たとえば '@e5'）で指定した要素をクリックします。ref ID はスナップショットの出力に角かっこ付きで表示されます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_console` | 現在のページのブラウザコンソールの出力と JavaScript のエラーを取得します。console.log / warn / error / info のメッセージと、捕まえられなかった JS の例外を返します。表に出ない JavaScript のエラー、失敗した API 呼び出し、アプリの警告を見つけるのに使います。先に… | — |
| `browser_get_images` | 現在のページにあるすべての画像を、URL と代替テキスト付きで一覧します。画像を vision のツールで解析したいときに探すのに便利です。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_navigate` | ブラウザで URL を開きます。セッションを初期化してページを読み込みます。ほかのブラウザのツールより先に呼ぶ必要があります。単に情報を取りたいだけなら web_search か web_extract のほうが速くて安上がりです。ブラウザのツールは… | — |
| `browser_press` | キーボードのキーを押します。フォームの送信（Enter）、移動（Tab）、ショートカットに便利です。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_scroll` | ページを指定した向きにスクロールします。いま見えている範囲の上下にある内容を出したいときに使います。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_snapshot` | 現在のページのアクセシビリティツリーを、テキストのスナップショットとして取得します。browser_click や browser_type で使う ref ID（@e1、@e2 など）付きで、操作できる要素を返します。full=false（既定）は操作できる要素だけの簡潔な表示、full=true は完全… | — |
| `browser_type` | ref ID で指定した入力欄に文字を打ち込みます。まず欄を空にしてから、新しい文字列を入力します。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_vision` | 現在のページのスクリーンショットを撮り、見た目を確かめられるようにします。ページがどう見えているかを知る必要があるとき — とくに CAPTCHA、目視での確認課題、入り組んだレイアウト、テキストのスナップショットでは大事な見た目の情報が落ちる場合 — に使います。画像を直接扱えるモデルではスクリーンショットをそのまま添付し、そうでなければ補助の画像解析モデルに… | — |

## `browser` ツールセット（CDP が必要なツール） {#browser-toolset-cdp-gated-tools}

この 2 つは `browser` ツールセットに属しますが、セッション開始時に Chrome DevTools Protocol のエンドポイントに到達できるときだけ登録されます。到達手段は `/browser connect`、`browser.cdp_url` の設定、Browserbase のセッション、Camofox のいずれかです。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_cdp` | Chrome DevTools Protocol の生のコマンドを送ります。上位の `browser_*` ツールでは足りない操作のための逃げ道です。https://chromedevtools.github.io/devtools-protocol/ を参照してください | CDP のエンドポイント |
| `browser_dialog` | JavaScript のネイティブなダイアログ（alert / confirm / prompt / beforeunload）に応答します。先に `browser_snapshot` を呼んでください。処理待ちのダイアログはその `pending_dialogs` の欄に現れます。そのうえで `browser_dialog(action='accept'\|'dismiss')` を呼びます。 | CDP のエンドポイント |

## `clarify` ツールセット {#clarify-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `clarify` | 先へ進む前に、確認・意見・判断が必要なときに利用者へ質問します。3 つの形式があります。1. **単一選択の選択肢** — 最大 4 択で、利用者はひとつ選ぶか、5 つめの 'Other' から自分で答えを打ち込みます。2. **複数選択の選択肢** — `multi_select=true` にするとチェックボックスで表示し、選ばれた項目の一覧を返します。3. **自由回答** — 選択肢を出さず、利用者が自由に書きます。選択肢は良いものから順に並ぶので、先頭にはどの画面でも `(Recommended)` の印が付き、最初から選ばれた状態になります。この印は表示だけのもので、エージェントが読む答えからは取り除かれます。従来の CLI では、複数選択はスペースキーでチェックを切り替えます。チェックボックスの表示を持たないメッセージアプリでは、利用者がカンマや空白で区切った番号（たとえば "1, 3"）か、選択肢の文言で返します。 | — |

### まとめて複数を尋ねる {#asking-multiple-questions-at-once}

`clarify` のツールは `questions` の配列も受け付けます（それぞれ独自の `choices` と `multi_select` を持つ、独立した質問を 2〜5 個）。これでエージェントは、順番に尋ねる代わりに、確認したいことをひとつの問いかけにまとめられます。結果は同じ順序の `responses` の配列で返り、質問の `id` を渡していればそれもそのまま返ってきます。

画面ごとの動きは次のとおりです。

- **デスクトップ** では、すべての質問が 1 枚のカードに表示されます。選択や入力はその場に控えられ、**Confirm and continue** のボタン（すべての質問に答えると押せるようになります）を押すと、まとめて送られます。控えられた答えは、確定するまで直せます。Skip を押すとまとめて取り消されます。
- **TUI と CLI** では、状態の一覧が簡潔に表示され（`✓` は回答済み、`▸` は選択中、`·` は未回答）、選択中の質問の選択肢だけが開きます。Enter で選択中の答えを確定し、次の未回答へ進みます。Tab で質問の間を移動すれば、好きな順に答えられます。Esc でまとめて取り消します。
- **メッセージアプリ**（Telegram、Discord など）では、従来の 1 問ずつの問いかけに切り替えて順に尋ねます。利用者が返事をやめた場合、残りの質問は送られません。

問いかけが途中で時間切れになっても、利用者がすでに確定した答えは残ります。ツールの結果にはそれらと `"timed_out": true` が入り、未回答の項目は空のままです。これでエージェントは、意図的に飛ばされたのか、利用者が離席したのかを区別できます。

## `code_execution` ツールセット {#codeexecution-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `execute_code` | Hermes のツールをプログラムから呼べる Python スクリプトを実行します。ツールを 3 回以上呼び、その間に処理を挟みたいとき、大きなツールの出力をコンテキストに入れる前に絞り込みたいとき、条件で分岐したいとき（… | — |

## `cronjob` ツールセット {#cronjob-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `cronjob` | 定時実行の仕事をまとめて管理します。`action="create"`、`"list"`、`"update"`、`"pause"`、`"resume"`、`"run"`、`"remove"` で操作します。スキルを 1 つ以上ひも付けた仕事にも対応しており、更新時に `skills=[]` を渡すとひも付けを外せます。cron の実行は、いまのチャットの文脈を持たない新しいセッションで行われます。 | — |

## `delegation` ツールセット {#delegation-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `delegate_task` | 隔離された文脈でサブエージェントを起動します。それぞれが独自の会話・ターミナルのセッション・ツールセットを持ち、返ってくるのは最終的な要約だけです。単発なら 'goal'、並列でまとめて回すなら 'tasks' を渡します（上限や入れ子の規則は… | — |

## `feishu_doc` ツールセット {#feishudoc-toolset}

Feishu のドキュメントのコメントに自動で返す処理（`gateway/platforms/feishu_comment.py`）専用です。`hermes-cli` や通常の Feishu チャットのアダプタでは使えません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_doc_read` | file_type とトークンを指定して、Feishu / Lark のドキュメント（Docx、Doc、Sheet）の本文をすべて読みます。 | Feishu アプリの認証情報 |

## `feishu_drive` ツールセット {#feishudrive-toolset}

Feishu のドキュメントのコメントを扱う処理専用です。ドライブ上のファイルに対する、コメントの読み書きを担当します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_drive_add_comment` | Feishu / Lark のドキュメントやファイルに、最上位のコメントを付けます。 | Feishu アプリの認証情報 |
| `feishu_drive_list_comments` | Feishu / Lark のファイルに付いた、文書全体へのコメントを新しい順に一覧します。 | Feishu アプリの認証情報 |
| `feishu_drive_list_comment_replies` | Feishu の特定のコメントの流れ（文書全体宛て、または選択範囲宛て）に付いた返信を一覧します。 | Feishu アプリの認証情報 |
| `feishu_drive_reply_comment` | Feishu のコメントの流れに返信を投稿します。`@` によるメンションも付けられます。 | Feishu アプリの認証情報 |

## `file` ツールセット {#file-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `patch` | ファイルの中の狙った箇所を置き換えます。ターミナルの sed や awk の代わりに使ってください。あいまい一致（9 通りの方法）を使うので、空白やインデントの細かな違いでは壊れません。統一形式の差分を返します。編集後は構文チェックを自動で走らせ… | — |
| `read_file` | テキストファイルを行番号付きで、ページ送りしながら読みます。ターミナルの cat / head / tail の代わりに使ってください。出力の形式は 'LINE_NUM\|CONTENT' です。見つからない場合は似た名前のファイルを提案します。大きなファイルには offset と limit を使ってください。およそ 10 万文字を超える読み取りは行の境界で切られ、next_offset を返します。Jupyter のノートブック（.ipynb）、Word の文書（.docx）、Excel のブック（.xlsx）も… | — |
| `search_files` | ファイルの中身を検索したり、名前でファイルを探したりします。ターミナルの grep / rg / find / ls の代わりに使ってください。ripgrep を使うので、シェルの同等品より高速です。中身の検索（target='content'）はファイル内の正規表現検索です。出力の形式は、行番号付きの一致箇所… | — |
| `write_file` | ファイルに内容を書き込み、既存の内容をすべて置き換えます。ターミナルの echo や cat のヒアドキュメントの代わりに使ってください。親ディレクトリは自動で作られます。ファイル全体を上書きするので、狙った箇所だけ直したいときは 'patch' を使ってください。.py / .json / .yaml / .toml など、構文チェックのある言語では自動で検査し、その書き込みで新たに生じたエラーだけを報告します。 | — |

## `homeassistant` ツールセット {#homeassistant-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `ha_call_service` | Home Assistant のサービスを呼んで機器を操作します。各ドメインで使えるサービスとその引数は、ha_list_services で調べられます。 | — |
| `ha_get_state` | Home Assistant のエンティティ 1 つの詳しい状態を、すべての属性（明るさ、色、設定温度、センサーの値など）とあわせて取得します。 | — |
| `ha_list_entities` | Home Assistant のエンティティを一覧します。ドメイン（light、switch、climate、sensor、binary_sensor、cover、fan など）や、場所の名前（リビング、キッチン、寝室など）で絞り込めます。 | — |
| `ha_list_services` | 機器を操作するために使える Home Assistant のサービス（動作）を一覧します。機器の種類ごとに、どんな操作ができて、どんな引数を受け付けるかが分かります。ha_list_entities で見つけた機器の操作方法を調べるのに使ってください。 | — |

## `computer_use` ツールセット {#computeruse-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `computer_use` | cua-driver を使った、裏側でのデスクトップ操作です。スクリーンショット（SOM / vision / AX）、クリック・ドラッグ・スクロール・入力・キー・待機、list_apps、focus_app が使えます。利用者のカーソルやキーボードの操作を奪うことはありません。ツールを扱えるモデルならどれでも動きます。macOS、Windows、Linux に対応しています。 | `$PATH` の通った場所に `cua-driver`（`hermes tools` から入れられます）。 |

:::note
**Honcho のツール**（`honcho_profile`、`honcho_search`、`honcho_context`、`honcho_reasoning`、`honcho_conclude`）は、もう組み込みではありません。`plugins/memory/honcho/` にある Honcho の記憶プロバイダプラグイン経由で使えます。導入と使い方は[記憶プロバイダ](/hermes/docs/user-guide/features/memory-providers/)を参照してください。
:::

## `image_gen` ツールセット {#imagegen-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `image_generate` | 利用者が設定したバックエンド（FAL.ai、OpenAI、OpenAI Codex の認証、xAI、Krea）を使って、文章から画像を作ったり（text-to-image）、既存の画像を編集・変換したり（image-to-image）します。画像を編集するときは `image_url` を、画風の参考には `reference_image_urls` を渡します。どちらも省くと文章からの生成になります。モデルは利用者が設定するもので、エージェントは選べません。画像の URL かローカルのパスを 1 つ返します。 | FAL_KEY / OPENAI_API_KEY / Codex OAuth / xAI OAuth / KREA_API_KEY |

## `kanban` ツールセット {#kanban-toolset}

エージェントが (a) kanban の割り振り役から起動された（環境変数 `HERMES_KANBAN_TASK` が設定されている）か、(b) `kanban` ツールセットを明示的に有効にしたプロファイルで動いているときに登録されます。タスク単位のワーカーは、担当するタスクのライフサイクル用のツールを使います。まとめ役のプロファイルには、さらに `kanban_list` や `kanban_unblock` のようなボード全体を扱うツールが付きます。一連の流れは [Kanban によるマルチエージェント](/hermes/docs/user-guide/features/kanban/)を参照してください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `kanban_show` | このワーカーに割り当てられた、いま作業中の kanban のタスク（表題、説明、コメント、依存関係）を表示します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_list` | 絞り込み条件を付けてボードのタスクを一覧します。まとめ役専用で、割り振り役から起動されたタスクのワーカーには見えません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_complete` | いまのタスクを完了にし、引き継ぎの内容（結果、成果物、次にやること）を構造化して残します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_block` | いまのタスクを、利用者への質問で保留にします。割り振り役はそこで止まり、質問を人に見せ、返事が来たら再開します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_review` | `summary`、任意の構造化された `metadata`、任意のレビュー担当プロファイルを添えて、実装をレビューに回します。同じタスクを `review` に移すだけで、保留ではないので保留回数の集計にも影響しません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_changes` | いま担当しているレビューに対する、レビュー担当としての判定です。そのレビューを終え、親タスクの条件を掛け直し、保留を使わずに元の実装者へタスクを戻します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_heartbeat` | 長くかかる作業の途中で進行中の合図を送り、ワーカーが生きていることを割り振り役に知らせます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_comment` | 状態を変えずに、タスクの流れにコメントを足します。途中で分かったことを共有するのに便利です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_create` | いまのタスクから子タスクを枝分かれさせます。まとめ役や、次の作業を作るワーカーが使います。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_link` | タスク同士を、親から子への依存としてつなぎます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_unblock` | 保留中のタスクを、親がすべて終わっていれば `ready` へ、まだ開いている親があれば `todo` へ移します。まとめ役専用で、割り振り役から起動されたタスクのワーカーには見えません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_attach` | ファイルの中身をそのまま（base64 で）渡して、タスクに添付します。タスクの添付ディレクトリの下に本物の添付として保存され、上限は 25 MB です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attach_url` | URL を指定してタスクにファイルを添付します。Hermes がサーバー側でダウンロードし、本物の添付として保存します（上限 25 MB）。http と https の URL のみです。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attachments` | タスクに添付されたファイルを一覧します。id、ファイル名、content_type、サイズ、追加した人、ディスク上の絶対パスが分かります。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |

## `project` ツールセット {#project-toolset}

デスクトップの[プロジェクト](/hermes/docs/user-guide/cli/) — 名前の付いた、複数フォルダの作業場 — を操作するためのツールです。`project` ツールセットを有効にしたとき（主にデスクトップアプリやダッシュボードの画面）に登録されます。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `project_create` | デスクトップのプロジェクト（名前の付いた作業場）を作り、このチャットをその中へ移します。リポジトリやフォルダに結び付けたい場合は `path` を渡します。 | — |
| `project_list` | デスクトップのプロジェクトと、いまどれが有効かを一覧します。 | — |
| `project_switch` | 既存のプロジェクト（名前、スラッグ、id のいずれかで指定）へこのチャットを移します。セッションの作業場も、そのプロジェクトの主フォルダへ移ります。 | — |

## `memory` ツールセット {#memory-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `memory` | 大事な情報を、セッションをまたいで残る記憶に保存します。記憶はセッション開始時にシステムプロンプトへ差し込まれます。会話をまたいで、利用者のことや自分の環境を覚えておく仕組みです。保存すべき場面は… | — |

## `session_search` ツールセット {#sessionsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `session_search` | ローカルのセッション DB に保存された過去のセッションを検索したり、ひとつの中を読み進めたりします。FTS5 を使った取り出しで、DB の実際のメッセージを返します（LLM は呼びません）。使い方は 4 通りです。探す（`query` を渡す）、読み進める（`session_id` と `around_message_id` を渡す）、読む（`session_id` だけを渡す）、眺める（引数なし）。 | — |

## `skills` ツールセット {#skills-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `skill_manage` | スキルを管理します（作成、更新、削除）。スキルは手順の記憶で、繰り返し出てくる仕事に対する使い回せるやり方です。新しいスキルは ~/.hermes/skills/ に置かれ、既存のスキルは置かれている場所のまま変更できます。動作は create（SKILL.m… | — |
| `skill_view` | スキルには、特定の仕事や進め方についての情報のほか、スクリプトやひな形も入っています。スキルの中身をすべて読み込むか、ひも付いたファイル（参照資料、ひな形、スクリプト）を開きます。最初の呼び出しでは SKILL.md の内容と… | — |
| `skills_list` | 使えるスキルを一覧します（名前と説明）。中身をすべて読むには skill_view(name) を使ってください。 | — |

## `terminal` ツールセット {#terminal-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `process` | terminal(background=true) で始めた裏側のプロセスを管理します。動作は 'list'（すべて表示）、'poll'（状態と新しい出力を確認）、'log'（ページ送り付きの出力全体）、'wait'（終わるか時間切れまで待つ）、'kill'（終了させる）、'write'（送… | — |
| `terminal` | Linux 環境でシェルのコマンドを実行します。ファイルシステムは呼び出しをまたいで残ります。長く動かすサーバーには `background=true` を指定してください。`background=true` とあわせて `notify_on_complete=true` を指定すると、プロセスが終わったときに自動で知らせが届くので、様子を見に行く必要がありません。cat / head / tail は使わず read_file を、grep / rg / find は使わず search_files を使ってください。 | — |

## `desktop_ui` ツールセット {#desktopui-toolset}

Hermes のデスクトップアプリから始めたセッションで有効になります。つないでいる先が
どこであっても（ローカル、SSH、URL、Hermes Cloud）同じです。CLI・TUI・
メッセージアプリ・cron のセッションでは使えません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `read_terminal` | Hermes デスクトップ GUI のアプリ内ターミナルのペイン（このチャットの隣にある組み込みのシェル）に、いま何が表示されているかを読みます。 | — |
| `close_terminal` | Hermes デスクトップ GUI で、裏側のプロセス用の読み取り専用ターミナルのタブを閉じます。プロセスは終了しません。閉じるのはタブと表示だけで、止めるには process(action='kill') を使ってください。 | — |
| `open_preview` | Hermes デスクトップアプリで、チャットの隣のプレビューのペインに、Web の URL、localhost の開発サーバーの URL、ファイルのパスを開きます。 | — |
| `close_preview` | チャットの隣のプレビューのペイン、またはその中のタブを 1 つ閉じます。`url` を省くとペイン全体を閉じ、URL やファイルのパスを渡すとそのタブを閉じます。 | — |
| `read_preview` | Hermes デスクトップ GUI のプレビューのペインに、いま何が表示されているかを読みます。アプリ内ブラウザならページのテキスト（URL、表題、描画された文章。`start` と `count` でページ送りできます）、ファイルや成果物のタブならその素性が分かります。 | — |
| `drive_preview` | アプリ内ブラウザで開いているページを操作します。`elements` はクリックや入力ができる要素を洗い出し（それぞれに `btn-sign-in` や `inp-email` のような名前になる ref と、役割・ラベル・値が付きます）、`click`・`hover`・`type`・`scroll`・`press` が ref に対して働き、`back` / `forward` / `reload` がペインの履歴を操作します。ポインタとキーボードは本物の入力なので、ホバーで開くメニューもちゃんと開きます。ref はページが移動するまで有効で、要素を作り直す再描画をまたいでも残ります。そのため最初の洗い出しのあとは、どの操作もページ全体ではなく差分だけ — 何が増え、消え、変わり、つなぎ直されたか — を返します。 | — |
| `annotate_preview` | アプリ内ブラウザで要素を枠で囲み、消すまでその印を残します。`drive_preview` が作業中に描く一時的な合図に対する、意図して残すほうの手段です。`add` は ref に短いラベル付き（任意）で印を付け、`remove` は 1 つ消し、`clear` はすべて消します。印は要素に付いて動き、要素が消えれば一緒に消えるので、ページを移動すると片付きます。 | — |
| `read_window_below` | Hermes デスクトップのウィンドウの真下にある OS のウィンドウを特定します。アプリ名、表題、位置と大きさが分かります（付帯情報だけで、画素は一切扱いません）。macOS では、ほかのアプリの表題が見えるのは画面収録の許可がすでに与えられている場合だけで、このツールから許可を求めることはありません。 | — |
| `focus_pane` | Hermes デスクトップアプリのペイン（chat、files、terminal、review、sessions）を表示して、そこに切り替えます。 | — |
| `react_to_message` | iMessage のタップバックのように、メッセージに絵文字 1 つで反応します。Settings → Appearance（`display.message_reactions`）で明示的に有効にします。 | — |
| `tour` | その場で案内を行います。画面を暗くし、要素を強調し、説明の吹き出しを添えます（driver.js）。Hermes アプリ自身の画面でも、プレビューのペインで開いているページでも使えます。`targets` は画面にあるものを洗い出し、`show` は一歩ずつ説明し、`start` は利用者に Next / Prev の操作を渡します。 | — |
| `tip` | 小さな色付きの吹き出しと矢印で、要素を 1 つ指し示します。`tour` の静かな兄弟で、画面を暗くもせず、スポットライトも Next / Prev もありません。`data-tour` の目印も、`tour(action='targets')` による洗い出しも同じものを使います。 | — |

### 案内（ツアー） {#tours}

`tour` のツールは、案内する対象を自分で見つけます。`action='targets'` を呼ぶと、画面にある指定可能な要素すべてを、セレクタ・ラベル・`stable` の印付きで返します。安定したセレクタは要素の素性（`data-tour`、`id`、`data-testid`、`aria-label`）を手がかりにするので再描画をまたいでも残りますが、位置に基づく `nth-child` の経路は残りません。そのため安定したものが先に並び、そちらを選ぶべきです。

要素に自分で長持ちする目印を付けるには、こう書きます。

```html
<div data-tour="composer">…</div>
```

目印は呼び出し側ではなく **部品そのもの** に付けるので、1 か所直せばすべての箇所に名前が付きます。すでに用意されているものは次のとおりです。

| 目印 | 何を指すか |
|---|---|
| `overlay-nav` | 画面をかぶせる各ルート（設定、cron、プロファイル、エージェント）の左側のナビ |
| `nav-<id>` | そのナビの 1 行 — `nav-models`、`nav-appearance`、… |
| `field-<schemaKey>` | 設定の 1 行を、その設定キーで指したもの — `field-model`、`field-provider`、… |
| `page-tabs` | `PageSearchShell` を使う各ページ（成果物、スキル、…）の絞り込みタブ |
| `artifact-card` | 一覧に並ぶ成果物のカード 1 枚 |

新しい画面を足すときは、画面をひとつずつ印付けするのではなく、共通の部品に同じやり方で印を付けてください。そうすると案内の語彙が小さいまま保たれ、セレクタが腐らずに済みます。

同じ仕組みが、デスクトップアプリに用意された（エージェントによらない）案内も支えています。機能ごとに専用の手引きを同梱できます。

```ts

startTour([
  { selector: '[data-tour="composer"]', title: 'Composer', text: 'Type here.' },
  { selector: '[data-tour="files"]', title: 'Files', text: 'Browse your project.' }
])
```

各ステップは、対象がある場所までアプリを動かすこともでき、案内が終わると元の状態に戻ります。

```ts
startTour([
  { navigate: '/artifacts', selector: '[data-tour="page-tabs"]', title: 'Filters', text: '…' },
  { pane: 'sessions', selector: '[data-slot="sidebar"]', title: 'Sessions', text: '…' }
])
```

`navigate` にはルートのパスを、`pane` にはデスクトップのペイン名を渡します。どちらもそのステップに入るときに動き、あとから現れる対象は待ってくれます。案内を閉じると — Esc を含め、どんな閉じ方でも — 始めた場所へ戻ります。

第 2 引数に `'preview'` を渡すと、アプリではなくプレビューのペインで開いているページに対して動きます。

### ひとこと案内（チップ） {#tips}

チップは、演出を省いた案内の 1 ステップです。吹き出しがひとつ、矢印がひとつ、画面を暗くする幕もなく、
めくるものもありません。「モデル名はボタンです」のように、話している対象を指差しながら
言えば分かりやすい一文にちょうどよい重さで、そのためにアプリ全体を暗くするのは
やりすぎ、という場面に向いています。

`tip` のツールは `tour(action='targets')` が返すのと同じセレクタを受け取るので、
対象探しはどちらも 1 回の呼び出しで済み、先ほどの長持ちする `data-tour` の目印は
どちらの対象指定にも使えます。画面に出るチップは一度に 1 つで、新しいものが出ると
前のものは消えます。

アプリ自身も、組み込みの機能の一覧を順にたどってチップを出せます。出し方は通知というより、
ゲームのロード画面のひとことに近い調子です。起動して早くても数分は経ってから、そのあとも
6 時間に 1 回まで、しかも本当に手が空いている場面でだけ出ます。Hermes が出したチップも
この待ち時間を共有するので、利用者にとっては巡回からの 6 時間の静けさにもなります。
✕ で巡回のチップを閉じると、そのチップは二度と出なくなり、同じ設定の行から戻せます。

チップも案内もどちらも既定で有効で、Settings → Appearance
（`display.in_app_tips`、`display.in_app_tours`）で切れます。切ると、アプリだけでなく
Hermes 側にも及びます。この切り替えはつながっているゲートウェイの設定にまで届き、ツールが
モデルのスキーマから外れるので、使ってはいけない機能をエージェントが知らされることはありません。
スキーマの変更はどれもそうですが、効くのは次のセッションからです。動いている会話は始めたときの
道具立てのままで、その間はアプリ側が呼び出しを断ります。

## `todo` ツールセット {#todo-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `todo` | いまのセッションのやることリストを管理します。3 手以上かかる込み入った作業や、利用者が複数の用件を出したときに使います。引数なしで呼ぶと、いまのリストを読めます。項目は入れ子にできます。項目の任意の `parent` の欄に別の項目の id を書くと、それが子の作業になり、各画面では字下げした木の形で表示されます。 | — |

## `vision` ツールセット {#vision-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `vision_analyze` | AI の画像認識で画像を解析します。画像を扱えるメインモデルなら、生の画素をマルチモーダルなツールの結果として返すので、モデルは次のターンでそのまま見られます。テキストしか扱えないメインモデルの場合は、補助の画像解析モデルに切り替えて、画像の説明文をテキストで返します。どちらの場合もツールの引数の形は同じです。 | — |

## `video` ツールセット {#video-toolset}

明示的に有効にするツールセットです（既定の `hermes-cli` の組み合わせには入っていません）。`--toolsets video` を付けるか、設定の `toolsets:` に `video` を入れてください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_analyze` | URL やファイルのパスから動画の内容を解析します。字幕、場面の切り分け、要所の時刻、見た目の説明が得られます。 | — |

## `video_gen` ツールセット {#videogen-toolset}

明示的に有効にするツールセットです（既定の `hermes-cli` の組み合わせには入っていません）。`--toolsets video_gen` を付けるか、`hermes tools` → Video Generation で有効にしてください。後者ではバックエンドの選択まで案内してくれます。

バックエンドは `plugins/video_gen/<name>/` のプラグインとして同梱されています。

- **xAI Grok-Imagine** — 文章からの動画生成と、画像からの動画生成（SuperGrok の OAuth か `XAI_API_KEY`）。
- **FAL.ai** — Veo 3.1、Pixverse v6、Kling O3（`FAL_KEY` が必要）。

`video_generate` の 1 つのツールが、どちらの入力にも対応します。静止画を動かすなら `image_url` を渡し、文章だけから作るなら省きます。有効なバックエンドに応じて、適切なエンドポイントへ自動で振り分けられます。ツールの説明文はセッション開始時に組み直され、有効なバックエンドが実際にできること（入力の種類、縦横比、解像度、長さの範囲、参考画像の枚数、音声への対応）を反映します。バックエンドの作り方は[動画生成プロバイダのプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/)を参照してください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_generate` | 利用者が設定した動画生成のバックエンドを使って、文章から動画を作る（text-to-video）か、静止画を動かします（image-to-video）。その画像を動かすときは `image_url` を渡し、文章だけから作るときは省きます。バックエンドが適切なエンドポイントへ自動で振り分けます。結果は `video` の欄に、HTTP の URL か絶対パスのどちらかで返ります。 | 有効な `video_gen` のプラグインと、その認証情報（`XAI_API_KEY`、`FAL_KEY` など） |
| `xai_video_edit` | xAI Imagine で既存の動画を編集します。このプロバイダ専用で、`video_generate` とは別物です。`video_url` には、以前の Imagine の結果として得た、公開されている HTTPS の MP4 の URL を渡す必要があります。 | xAI Imagine の認証情報（SuperGrok の OAuth か `XAI_API_KEY`） |
| `xai_video_extend` | xAI Imagine で既存の動画を延長します。このプロバイダ専用で、`video_generate` とは別物です。`video_url` には、以前の Imagine の結果として得た、公開されている HTTPS の MP4 の URL を渡す必要があります。 | xAI Imagine の認証情報（SuperGrok の OAuth か `XAI_API_KEY`） |

## `web` ツールセット {#web-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `web_search` | Web で情報を検索します。既定では最大 5 件の結果を、表題・URL・説明付きで返します。任意で `limit`（1〜100、既定は 5）を指定できます。クエリは設定したバックエンドへそのまま渡されるので、`site:domain`、`filetype:pdf`、`intitle:word`、`-term`、`"exact phrase"` といった書き方は、バックエンドが対応していれば効きます。 | EXA_API_KEY / PARALLEL_API_KEY / FIRECRAWL_API_KEY / TAVILY_API_KEY / KEENABLE_API_KEY のいずれか |
| `web_extract` | Web ページの URL から内容を抜き出します。整形されたページの内容を markdown やテキストで返します（LLM による要約はしないので高速です）。PDF の URL（arXiv の論文や各種文書）にも使えるので、PDF のリンクをそのまま渡してください。文字数の予算（既定は 15000）以内のページはまるごと返り、それより大きいページは先頭と末尾の窓に、ディスクへ保存した全文を指すフッターが付いて返ります。1 回の呼び出しで URL は最大 5 個です。 | EXA_API_KEY / PARALLEL_API_KEY / FIRECRAWL_API_KEY / TAVILY_API_KEY / KEENABLE_API_KEY のいずれか |

## `x_search` ツールセット {#xsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `x_search` | xAI に組み込まれた Responses の `x_search` ツールを使って、X（Twitter）の投稿・プロフィール・スレッドを検索します。公開されている X 上の、いま起きている議論・反応・主張を読み取るだけのもので（一般の Web ページ向けではありません）、投稿・返信・いいね・DM・メディアのアップロード・削除はできず、認証済みの X アカウントを覗くこともできません。それらには、認証を伴う別の X API の手段（たとえば `xurl` のスキル）が必要です。既定では無効で、`hermes tools` → 🐦 X (Twitter) Search から明示的に有効にします。スキーマは xAI の認証情報が設定されているときだけ登録されます（check_fn で判定されます）。 | XAI_API_KEY **または** xAI Grok の OAuth（SuperGrok / Premium+）でのログイン |

## `tts` ツールセット {#tts-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `text_to_speech` | 文章を読み上げ音声に変換します。MEDIA: のパスを返し、各プラットフォームがそれを音声メッセージとして届けます。Telegram では音声の吹き出しとして再生され、Discord や WhatsApp では音声の添付になります。CLI では ~/voice-memos/ に保存されます。声と提供元は… | — |

## `discord` ツールセット {#discord-toolset}

`hermes-discord` のプラットフォーム用ツールセットで登録されます（ゲートウェイのみ）。メッセージのアダプタと同じ bot のトークンを使います。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord` | Discord のサーバーを読み、そこでのやり取りに参加します。動作には `search_members`、`fetch_messages`、`send_message`、`react`、`fetch_channel`、`list_channels` などがあります。 | `DISCORD_BOT_TOKEN` |

## `discord_admin` ツールセット {#discordadmin-toolset}

`hermes-discord` のプラットフォーム用ツールセットで登録されます。管理の操作には、bot 側に対応する Discord の権限が必要です。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord_admin` | REST API 経由で Discord のサーバーを管理します。ギルド・チャンネル・ロールの一覧、チャンネルの作成 / 編集 / 削除、ロールの付与、タイムアウト、キック、BAN ができます。 | `DISCORD_BOT_TOKEN` と bot の権限 |

## `spotify` ツールセット {#spotify-toolset}

同梱の `spotify` プラグインが登録します。OAuth のトークンが必要なので、`hermes auth spotify` を一度実行して許可してください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `spotify_playback` | Spotify の再生を操作したり、いまの再生状態を調べたり、最近再生した曲を取得したりします。 | Spotify の OAuth |
| `spotify_devices` | Spotify Connect の機器を一覧したり、再生を別の機器へ移したりします。 | Spotify の OAuth |
| `spotify_queue` | 再生待ちの一覧を調べたり、そこに項目を追加したりします。 | Spotify の OAuth |
| `spotify_search` | Spotify のカタログから、曲・アルバム・アーティスト・プレイリスト・番組・エピソードを検索します。 | Spotify の OAuth |
| `spotify_playlists` | Spotify のプレイリストを一覧・確認・作成・更新・編集します。 | Spotify の OAuth |
| `spotify_albums` | Spotify のアルバムの情報や、収録曲を取得します。 | Spotify の OAuth |
| `spotify_library` | 利用者が保存した Spotify の曲やアルバムを、一覧・保存・削除します。 | Spotify の OAuth |

## `hermes-yuanbao` ツールセット {#hermes-yuanbao-toolset}

`hermes-yuanbao` のプラットフォーム用ツールセットでのみ登録されます。Yuanbao はテンセントのチャットアプリで、これらのツールはその DM・グループ・スタンプの API を操作します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `yb_query_group_info` | グループ（アプリ内では「派 / Pai」と呼ばれます）の基本情報を調べます。名前、管理者、メンバー数が分かります。 | Yuanbao の認証情報 |
| `yb_query_group_members` | グループのメンバーを調べます（`@` のメンション、名前からの利用者探し、bot の一覧に使います）。 | Yuanbao の認証情報 |
| `yb_send_dm` | グループ内の利用者へ個別のメッセージを送ります。メディアファイルも添えられます。 | Yuanbao の認証情報 |
| `yb_search_sticker` | Yuanbao に組み込まれたスタンプ（TIM の顔文字）のカタログを、キーワードで検索します。 | Yuanbao の認証情報 |
| `yb_send_sticker` | いまの Yuanbao のチャットに、組み込みのスタンプを送ります。 | Yuanbao の認証情報 |
