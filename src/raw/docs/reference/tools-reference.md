---
title: "組み込みツールの一覧"
description: "Hermes の組み込みツールを、ツールセットごとにまとめた正式な一覧です。"
upstream_path: reference/tools-reference.md
upstream_blob: 5363e351873b14ccec1dc3be6064e77b4db3198e
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/tools-reference
---

# 組み込みツールの一覧 {#built-in-tools-reference}

このページでは、Hermes の組み込みツールをツールセットごとにまとめています。使えるかどうかは、動かしている環境、資格情報、有効にしているツールセットによって変わります。

**いまの登録内容のおおよその数:** 全部で 86 ほどです。内訳は、ブラウザーのツールが 10 個（中核）に CDP のあるときだけ加わる 2 個、ファイルのツールが 4 個、Home Assistant のツールが 4 個、端末のツールが 2 個（`terminal`、`process`）、デスクトップの画面まわりが 11 個（`read_terminal`、`close_terminal`、`open_preview`、`close_preview`、`read_preview`、`drive_preview`、`annotate_preview`、`read_window_below`、`focus_pane`、`react_to_message`、`tour` — デスクトップアプリのセッション限定）、ウェブのツールが 2 個、Feishu のツールが 5 個、Spotify のツールが 7 個（同梱の `spotify` プラグインが登録します）、Yuanbao のツールが 5 個、かんばんのツールが 12 個（かんばんの割り振り役がエージェントを立ち上げたときに登録されます）、プロジェクトのツールが 3 個（デスクトップや GUI のセッション）、Discord のツールが 2 個、動画のツールが 3 個（`video_generate`、`xai_video_edit`、`xai_video_extend`）、そして単独のツールがいくつか（`memory`、`clarify`、`delegate_task`、`execute_code`、`cronjob`、`session_search`、`skill_view` と `skill_manage` と `skills_list`、`text_to_speech`、`image_generate`、`vision_analyze`、`video_analyze`、`todo`、`computer_use`、`x_search`）です。

:::tip MCP のツール
組み込みのツールに加えて、Hermes は MCP サーバーからツールをその場で読み込めます。MCP のツールには `mcp__<server>__` という接頭辞が付きます（たとえば `github` という MCP サーバーなら `mcp__github__create_issue` です）。設定のしかたは [MCP との連携](/hermes/docs/user-guide/features/mcp/) をご覧ください。
:::

## `browser` ツールセット {#browser-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_back` | 閲覧履歴をたどって、ひとつ前のページに戻ります。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_click` | スナップショットに出てくる参照 ID（たとえば '@e5'）で指した要素をクリックします。参照 ID はスナップショットの出力に角かっこ付きで表示されます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_console` | いまのページのブラウザーのコンソール出力と JavaScript のエラーを取得します。console.log/warn/error/info のメッセージと、捕まえられなかった JS の例外を返します。静かに起きている JavaScript のエラー、失敗した API 呼び出し、アプリの警告を見つけるのに使います。先に… | — |
| `browser_get_images` | いまのページにあるすべての画像を、URL と代替テキスト付きで一覧にします。vision のツールで解析する画像を探すときに便利です。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_navigate` | ブラウザーで URL を開きます。セッションを用意してページを読み込みます。他のブラウザーのツールより先に呼ぶ必要があります。単に情報を取りたいだけなら、web_search か web_extract のほうが速くて安く済みます。ブラウザーのツールは、どうしても必要なときに… | — |
| `browser_press` | キーボードのキーを押します。フォームの送信（Enter）、移動（Tab）、ショートカットに使えます。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_scroll` | ページを指定した向きにスクロールします。いまの表示範囲の上や下にある内容を出したいときに使います。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_snapshot` | いまのページのアクセシビリティツリーを、文字で表したスナップショットとして取得します。browser_click や browser_type で使う参照 ID（@e1、@e2 のようなもの）付きで、操作できる要素を返します。full=false（既定）は操作できる要素だけの簡潔な表示、full=true は… | — |
| `browser_type` | 参照 ID で指した入力欄に文字を打ち込みます。まず欄を空にしてから、新しい文字を入れます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_vision` | いまのページのスクリーンショットを撮って、目で見て確かめられるようにします。ページの見た目を把握したいとき、とくに CAPTCHA、目視での確認を求める仕掛け、入り組んだレイアウト、文字のスナップショットでは大事な見た目の情報が抜け落ちる場面で使います。画像をそのまま扱えるモデルではスクリーンショットを直接添え、そうでなければ補助の vision モデルに… | — |

## `browser` ツールセット（CDP があるときだけのツール） {#browser-toolset-cdp-gated-tools}

この 2 つは `browser` ツールセットに属しますが、セッションの開始時に Chrome DevTools Protocol のエンドポイントへ届くときだけ登録されます。届く経路は `/browser connect`、`browser.cdp_url` の設定、Browserbase のセッション、Camofox です。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_cdp` | Chrome DevTools Protocol のコマンドをそのまま送ります。上位の `browser_*` ツールでは届かないブラウザー操作のための抜け道です。https://chromedevtools.github.io/devtools-protocol/ をご覧ください | CDP のエンドポイント |
| `browser_dialog` | JavaScript の標準ダイアログ（alert / confirm / prompt / beforeunload）に答えます。まず `browser_snapshot` を呼んでください。応答待ちのダイアログはその `pending_dialogs` の項目に出てきます。そのうえで `browser_dialog(action='accept'\|'dismiss')` を呼びます。 | CDP のエンドポイント |

## `clarify` ツールセット {#clarify-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `clarify` | 先へ進む前に、確認したいこと・意見・判断を利用者に尋ねます。3 つの形があります。1. **選択肢から 1 つ選ぶ** — 選択肢は最大 4 つで、利用者はどれかを選ぶか、5 つめの「その他」で自分の答えを打ち込めます。2. **選択肢から複数選ぶ** — `multi_select=true` にするとチェックボックスで表示され、選ばれたものの一覧が返ります。3. **自由記述** — 選択肢を出さず、利用者が自由に書きます。選択肢は良いと思う順に並んでいるので、最初のものはどの画面でも `(Recommended)` と表示され、既定で選ばれた状態になります。この表示はあくまで見た目のもので、エージェントが受け取る答えからは取り除かれます。従来の CLI では、複数選択はスペースキーで切り替えるチェックボックスになります。チェックボックスの UI を持たないメッセージ系のサービスでは、利用者がカンマや空白で区切った番号（たとえば "1, 3"）か、選択肢の文字そのものを返します。 | — |

### いくつかの質問をまとめて尋ねる {#asking-multiple-questions-at-once}

`clarify` のツールは `questions` の配列（それぞれに `choices` と `multi_select` を持つ、互いに独立した 2〜5 個の質問）も受け取れます。これにより、エージェントは確認したいことを 1 回のやりとりにまとめられ、順番に尋ねずに済みます。結果は同じ並び順の `responses` の配列で返り、質問に `id` を付けていればそれもそのまま返ります。

画面ごとの動きです。

- **デスクトップ** では、すべての質問が 1 枚のカードに出ます。選んだ内容や打ち込んだ答えはその場に控えられ、すべての質問に答えると使えるようになる **Confirm and continue** のボタンひとつで、まとめて送られます。控えた答えは、その確定までは直せます。Skip を押すと、まとめて取りやめになります。
- **TUI と CLI** では、状態の一覧（`✓` は回答済み、`▸` は回答中、`·` は未回答）が簡潔に出て、いま答えている質問の選択肢だけが開いた状態になります。Enter でその答えを確定して次の未回答へ進み、Tab で質問を行き来して好きな順に答えられ、Esc でまとめて取りやめます。
- **メッセージ系のサービス**（Telegram、Discord など）では、これまでどおり 1 問ずつ尋ねる形に落ちます。利用者が途中で返事をやめた場合、残りの質問は送られません。

やりとりが途中で時間切れになっても、利用者がすでに確定した答えは残ります。ツールの結果にはその答えと `"timed_out": true` が載り、未回答のところは空のままになるので、エージェントは「わざと飛ばした」のか「その場にいなかった」のかを見分けられます。

## `code_execution` ツールセット {#codeexecution-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `execute_code` | Hermes のツールをプログラムから呼べる Python のスクリプトを走らせます。ツールを 3 回以上呼びつつ間で処理を挟みたいとき、大きなツールの出力を自分の文脈に入れる前に絞り込みたいとき、条件で処理を分けたいときに使います（… | — |

## `cronjob` ツールセット {#cronjob-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `cronjob` | 定時実行の仕事をまとめて扱います。`action="create"`、`"list"`、`"update"`、`"pause"`、`"resume"`、`"run"`、`"remove"` で管理します。ひとつ以上のスキルを結び付けた仕事にも対応していて、更新のときに `skills=[]` を渡すと結び付けを解けます。定時実行は、いまの会話の文脈を持たない新しいセッションで動きます。 | — |

## `delegation` ツールセット {#delegation-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `delegate_task` | 切り離された文脈で下請けのエージェントを立ち上げます。それぞれが自分の会話、端末のセッション、ツール群を持ち、最後のまとめだけが呼び出し元に返ります。ひとつの仕事なら 'goal'、まとめて並行させるなら 'tasks' を渡します（上限と入れ子の決まりは… | — |

## `feishu_doc` ツールセット {#feishudoc-toolset}

Feishu の文書コメントに自動で返す処理（`gateway/platforms/feishu_comment.py`）の中だけで使えます。`hermes-cli` や通常の Feishu チャットの窓口には出てきません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_doc_read` | file_type とトークンを渡して、Feishu/Lark の文書（Docx、Doc、Sheet）の本文をすべて読みます。 | Feishu アプリの資格情報 |

## `feishu_drive` ツールセット {#feishudrive-toolset}

Feishu の文書コメントの処理の中だけで使えます。ドライブ上のファイルに対するコメントの読み書きを担います。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_drive_add_comment` | Feishu/Lark の文書やファイルに、最上位のコメントを付けます。 | Feishu アプリの資格情報 |
| `feishu_drive_list_comments` | Feishu/Lark のファイルに付いた文書全体へのコメントを、新しい順に並べます。 | Feishu アプリの資格情報 |
| `feishu_drive_list_comment_replies` | Feishu の特定のコメントの流れ（文書全体宛て、または選択範囲宛て）に付いた返信を並べます。 | Feishu アプリの資格情報 |
| `feishu_drive_reply_comment` | Feishu のコメントの流れに返信します。`@` での呼びかけも付けられます。 | Feishu アプリの資格情報 |

## `file` ツールセット {#file-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `patch` | ファイルの中の狙った箇所を探して置き換えます。端末で sed や awk を使うかわりにこちらを使ってください。あいまい一致（9 通りのやり方）を使うので、空白や字下げの細かな違いでは壊れません。統一形式の差分を返します。編集のあとは自動で文法の検査もします… | — |
| `read_file` | テキストファイルを、行番号付きで少しずつ読みます。端末で cat や head や tail を使うかわりにこちらを使ってください。出力の形は 'LINE_NUM\|CONTENT' です。見つからないときは似た名前を教えます。大きなファイルには offset と limit を使います。10 万文字あたりを超える読み取りは行の切れ目で打ち切られ、next_offset を返します。Jupyter のノートブック（.ipynb）、Word の文書（.docx）、Excel のブック（.xlsx）も… | — |
| `search_files` | ファイルの中身を検索したり、名前でファイルを探したりします。端末で grep、rg、find、ls を使うかわりにこちらを使ってください。ripgrep を使っているので、シェルで同じことをするより速いです。中身の検索（target='content'）は、ファイルの中を正規表現で探します。出力の形は、行付きの一致をすべて出すものと… | — |
| `write_file` | ファイルに内容を書き込み、もとの中身をすべて置き換えます。端末で echo や cat のヒアドキュメントを使うかわりにこちらを使ってください。親のディレクトリは自動で作ります。ファイル全体を上書きするので、狙った箇所だけ直すときは 'patch' を使ってください。.py/.json/.yaml/.toml など、検査のできる言語では書き込みのあとに自動で文法を調べ、その書き込みで新しく生まれたエラーだけを知らせます。 | — |

## `homeassistant` ツールセット {#homeassistant-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `ha_call_service` | Home Assistant のサービスを呼んで機器を操作します。どのサービスがあり、領域ごとにどんな引数を取るのかは ha_list_services で調べられます。 | — |
| `ha_get_state` | Home Assistant のひとつの対象について、詳しい状態を取得します。明るさ、色、設定温度、センサーの値など、すべての属性を含みます。 | — |
| `ha_list_entities` | Home Assistant の対象を並べます。領域（light、switch、climate、sensor、binary_sensor、cover、fan など）や、場所の名前（リビング、キッチン、寝室など）で絞り込めます。 | — |
| `ha_list_services` | 機器を操作するために使える Home Assistant のサービス（動作）を並べます。機器の種類ごとにどんな操作ができて、どんな引数を取るのかが分かります。ha_list_entities で見つけた機器の操作方法を調べるのに使ってください。 | — |

## `computer_use` ツールセット {#computeruse-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `computer_use` | cua-driver を通じて、裏側でデスクトップを操作します。スクリーンショット（SOM / vision / AX）、クリック、ドラッグ、スクロール、文字入力、キー操作、待機、list_apps、focus_app ができます。利用者のカーソルやキーボードの操作を横取りすることはありません。ツールを扱えるモデルならどれでも動きます。macOS、Windows、Linux に対応しています。 | `$PATH` の上に `cua-driver` があること（`hermes tools` で入れられます）。 |

:::note
**Honcho のツール**（`honcho_profile`、`honcho_search`、`honcho_context`、`honcho_reasoning`、`honcho_conclude`）は、もう組み込みではありません。`plugins/memory/honcho/` にある Honcho の記憶プラグインとして使えます。入れ方と使い方は [記憶の提供元](/hermes/docs/user-guide/features/memory-providers/) をご覧ください。
:::

## `image_gen` ツールセット {#imagegen-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `image_generate` | 利用者が設定した仕組み（FAL.ai、OpenAI、OpenAI Codex の認証、xAI、Krea）を使って、文字から画像を作ったり（text-to-image）、すでにある画像を直したり変えたりします（image-to-image）。画像を直すときは `image_url` を、雰囲気の見本にする画像は `reference_image_urls` を渡します。どちらも渡さなければ文字から画像を作ります。使うモデルは利用者が設定するもので、エージェントは選べません。画像の URL か、手元のパスをひとつ返します。 | FAL_KEY / OPENAI_API_KEY / Codex OAuth / xAI OAuth / KREA_API_KEY |

## `kanban` ツールセット {#kanban-toolset}

登録されるのは、エージェントが (a) かんばんの割り振り役から立ち上げられたとき（環境変数 `HERMES_KANBAN_TASK` が設定されている）か、(b) `kanban` のツールセットをはっきり有効にしたプロファイルで動いているときです。仕事ごとの担い手は、割り当てられた仕事のための進行用のツールを使い、まとめ役のプロファイルにはさらに `kanban_list` や `kanban_unblock` といった盤全体を差配するツールが加わります。流れの全体は [かんばんによる複数エージェント](/hermes/docs/user-guide/features/kanban/) をご覧ください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `kanban_show` | この担い手に割り当てられた、いま進行中のかんばんの仕事（題名、説明、コメント、依存関係）を表示します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_list` | 条件を付けて盤の仕事を並べます。まとめ役だけが使えます。割り振り役から立ち上げられた担い手には出てきません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_complete` | いまの仕事を完了にし、引き継ぎの内容（結果、成果物、次にやること）を整った形で残します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_block` | いまの仕事を、利用者への質問で止めます。割り振り役はいったん待ち、質問を表に出して、人が答えたら再開します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_review` | 実装を確認する側に引き渡します。`summary` と、任意の `metadata`、任意で確認する側のプロファイルを渡します。同じ仕事が `review` へ移るだけで、止める操作ではなく、止まった回数にも数えません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_changes` | いま引き受けている確認作業に対する、確認する側の判定です。その確認を終わらせ、親の側の条件を掛け直して、仕事をもとの実装者に戻します。止める操作は使いません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_heartbeat` | 時間のかかる処理の途中で進み具合の合図を送り、担い手がまだ生きていることを割り振り役に伝えます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_comment` | 仕事の状態を変えずに、その流れにコメントを足します。途中で分かったことを共有するのに向いています。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_create` | いまの仕事から、子の仕事を枝分かれさせます。まとめ役や、次の仕事を生む担い手が使います。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_link` | 仕事どうしを、親から子への依存関係でつなぎます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_unblock` | 止まっている仕事を、親がすべて終わっていれば `ready` へ、まだ開いている親があれば `todo` へ移します。まとめ役だけが使えます。割り振り役から立ち上げられた担い手には出てきません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_attach` | ファイルの中身をそのまま（base64 で）渡して、仕事に添付します。仕事の添付ディレクトリの下に、実体のある添付として保存されます。上限は 25 MB です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attach_url` | URL を渡してファイルを仕事に添付します。Hermes がサーバー側で取ってきて、実体のある添付として保存します（上限は 25 MB）。http と https の URL だけです。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attachments` | 仕事に添付されたファイルを並べます。id、ファイル名、content_type、大きさ、載せた人、そしてディスク上の絶対パスが分かります。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |

## `project` ツールセット {#project-toolset}

デスクトップの [プロジェクト](/hermes/docs/user-guide/cli/) — 名前の付いた、複数のフォルダーをまとめた作業場所 — を動かすためのツールです。`project` のツールセットを有効にしたとき（主にデスクトップアプリやダッシュボードの画面）に登録されます。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `project_create` | デスクトップのプロジェクト（名前の付いた作業場所）を作り、このチャットをそこへ切り替えます。`path` を渡すと、リポジトリやフォルダーに結び付けられます。 | — |
| `project_list` | デスクトップのプロジェクトと、いまどれが有効かを並べます。 | — |
| `project_switch` | このチャットを、すでにあるプロジェクト（名前、slug、id のいずれかで指定）へ切り替えます。セッションの作業場所は、そのプロジェクトの主フォルダーへ移ります。 | — |

## `memory` ツールセット {#memory-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `memory` | セッションをまたいで残る記憶に、大事なことを書き留めます。書き留めた記憶は、セッションの開始時にシステムプロンプトへ現れます。会話と会話のあいだで、利用者のことや自分の環境のことを覚えておく仕組みです。どんなときに書き留めるか… | — |

## `session_search` ツールセット {#sessionsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `session_search` | 手元のセッションのデータベースに残った過去のセッションを検索したり、そのひとつの中をたどったりします。FTS5 による検索で、データベースにある実際のメッセージを返します（LLM は呼びません）。使い方は 4 通りです。探す（`query` を渡す）、たどる（`session_id` と `around_message_id` を渡す）、読む（`session_id` だけ渡す）、眺める（何も渡さない）。 | — |

## `skills` ツールセット {#skills-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `skill_manage` | スキルを管理します（作成、更新、削除）。スキルは手順の記憶であり、繰り返し出てくる種類の仕事に使い回せるやり方です。新しいスキルは ~/.hermes/skills/ に置かれ、すでにあるスキルはどこにあっても直せます。動作は create（SKILL.m… | — |
| `skill_view` | スキルを使うと、特定の仕事や進め方についての情報に加えて、スクリプトやひな形も読み込めます。スキルの中身をすべて読み込んだり、結び付いたファイル（参考資料、ひな形、スクリプト）にたどり着いたりします。最初の呼び出しでは SKILL.md の中身と… | — |
| `skills_list` | 使えるスキル（名前と説明）を並べます。中身をすべて読むには skill_view(name) を使ってください。 | — |

## `terminal` ツールセット {#terminal-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `process` | terminal(background=true) で始めた裏側のプロセスを扱います。動作は 'list'（すべて表示）、'poll'（状態と新しい出力を確認）、'log'（少しずつ全出力を表示）、'wait'（終わるか時間切れになるまで待つ）、'kill'（終了させる）、'write'（送… | — |
| `terminal` | Linux の環境でシェルのコマンドを実行します。ファイルシステムは呼び出しをまたいで残ります。長く動かすサーバーには `background=true` を指定してください。`background=true` と一緒に `notify_on_complete=true` を指定すると、プロセスが終わったときに自動で知らせが届くので、様子を見にいく必要がありません。cat/head/tail は使わず read_file を、grep/rg/find は使わず search_files を使ってください。 | — |

## `desktop_ui` ツールセット {#desktopui-toolset}

Hermes のデスクトップアプリから始まったセッションで使えます。つなぎ先がどこであっても（手元、SSH、URL、Hermes Cloud）同じです。CLI、TUI、メッセージ系、定時実行のセッションにはありません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `read_terminal` | Hermes デスクトップの画面で、アプリ内の端末の枠（チャットの横に埋め込まれたシェル）にいま出ている内容を読みます。 | — |
| `close_terminal` | Hermes デスクトップの画面で、裏側のプロセスのための読み取り専用の端末タブを閉じます。プロセスは止まりません。タブと表示が消えるだけです。止めるには process(action='kill') を使ってください。 | — |
| `open_preview` | Hermes デスクトップアプリで、チャットの横の下見の枠に、ウェブの URL、localhost の開発サーバーの URL、ファイルのパスを開きます。 | — |
| `close_preview` | チャットの横の下見の枠、またはその中のひとつのタブを閉じます。`url` を渡さなければ枠ごと閉じ、URL やファイルのパスを渡すとそのタブを閉じます。 | — |
| `read_preview` | Hermes デスクトップの画面で、下見の枠にいま出ている内容を読みます。アプリ内のブラウザーのページの文字（URL、題名、描かれた文字。`start` と `count` で少しずつ読めます）か、ファイルや成果物のタブが何であるかが分かります。 | — |
| `drive_preview` | アプリ内のブラウザーで開いているページを操作します。`elements` はクリックや入力のできるものを一覧にし（それぞれに `btn-sign-in` や `inp-email` のような名前になる参照が付き、役割、ラベル、値も分かります）、そのうえで `click`、`hover`、`type`、`scroll`、`press` が参照に対して働き、`back`/`forward`/`reload` が枠の履歴を動かします。ポインターとキーボードは本物の入力なので、ホバーで開くメニューもちゃんと開きます。参照はページが移るまで有効で、要素を作り直す再描画をまたいでも残ります。ですので最初に一覧を取ったあとは、どの操作もページ全体ではなく差分だけ — 何が増え、消え、変わり、つなぎ直されたか — を返します。 | — |
| `annotate_preview` | アプリ内のブラウザーで要素を枠線で囲み、消すまでその印を残します。`drive_preview` が動きながら描く一瞬の目印に対して、意図して残すほうの印です。`add` は参照に短いラベル付きで印を付け、`remove` はひとつ外し、`clear` はすべて外します。印は対象の要素についてまわり、要素が消えれば一緒に消えるので、ページが移ると印も消えます。 | — |
| `read_window_below` | Hermes デスクトップのウィンドウのすぐ下にある OS のウィンドウが何かを調べます。アプリ名、題名、位置と大きさ（あくまで情報だけで、画素は取りません）が分かります。macOS では、他のアプリの題名は画面収録の許可がすでに与えられている場合にだけ見えます。このツールから許可を求めることはありません。 | — |
| `focus_pane` | Hermes デスクトップアプリの枠（チャット、ファイル、端末、レビュー、セッション）を表に出して、そこに焦点を移します。 | — |
| `react_to_message` | メッセージに絵文字ひとつで反応します。iMessage のタップバックのような形です。設定 → 外観（`display.message_reactions`）で自分から有効にします。 | — |
| `tour` | その場で案内をします。画面を暗くし、要素を目立たせて、語りの付いた吹き出しを添えます（driver.js を使います）。Hermes アプリ自身の画面でも、下見の枠に開いたページでも動きます。`targets` で画面にあるものを調べ、`show` で一歩ずつ語り、`start` は利用者に Next/Prev の操作を委ねます。 | — |

### 案内 {#tours}

`tour` のツールは、案内する対象を自分で見つけます。`action='targets'` を呼ぶと、画面にある指し示せる要素をすべて、セレクター、ラベル、`stable` の印付きで返します。安定したセレクターは、そのものの正体（`data-tour`、`id`、`data-testid`、`aria-label`）を手がかりにするので、再描画をまたいでも残ります。位置で指す `nth-child` の道筋は残らないので、安定したもののほうが先に並びますし、そちらを選ぶべきです。

自分で長持ちする取っ手を要素に付けたいときは、こう書きます。

```html
<div data-tour="composer">…</div>
```

取っ手は呼び出す側ではなく、**元になる部品** に付けます。ですので、一度直せばすべての使われ方に名前が付きます。すでにあるものはこちらです。

| 取っ手 | 何を指すか |
|---|---|
| `overlay-nav` | 画面を覆う各画面（設定、定時実行、プロファイル、エージェント）の左のナビ |
| `nav-<id>` | そのナビの 1 行 — `nav-models`、`nav-appearance` など |
| `field-<schemaKey>` | 設定の 1 行を、その設定キーで指したもの — `field-model`、`field-provider` など |
| `page-tabs` | `PageSearchShell` を使う画面（成果物、スキルなど）の絞り込みタブ |
| `artifact-card` | 一覧に並ぶ成果物のカード |

新しい画面を足すときは、画面ごとに印を付けるのではなく、共有している元の部品に同じやり方で印を付けてください。そうすれば案内の語彙は小さいままで、セレクターが古びていくのも防げます。

同じ仕組みは、デスクトップアプリであらかじめ用意された（エージェントを介さない）案内も支えています。ですので、機能ごとに独自の道案内を付けて出せます。

```ts

startTour([
  { selector: '[data-tour="composer"]', title: 'Composer', text: 'Type here.' },
  { selector: '[data-tour="files"]', title: 'Files', text: 'Browse your project.' }
])
```

案内の一歩ごとに、対象のある場所までアプリを動かすこともできますし、案内が終われば元に戻ります。

```ts
startTour([
  { navigate: '/artifacts', selector: '[data-tour="page-tabs"]', title: 'Filters', text: '…' },
  { pane: 'sessions', selector: '[data-slot="sidebar"]', title: 'Sessions', text: '…' }
])
```

`navigate` には道筋を、`pane` にはデスクトップの枠の名前を渡します。どちらもその一歩に入った時点で動き、あとから現れる対象は待ってから指し示し、案内を閉じると — どんな道筋であっても、Esc も含めて — 始めた場所に戻ります。

2 つめの引数に `'preview'` を渡すと、アプリではなく下見の枠に開いたページを対象にできます。

## `todo` ツールセット {#todo-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `todo` | いまのセッションのやることの一覧を扱います。手順が 3 つ以上ある込み入った仕事や、利用者からいくつも用件を渡されたときに使います。引数なしで呼ぶと、いまの一覧が読めます。書き込むときは、'todos' の配列を渡して項目を作ったり直したりします。merge=… | — |

## `vision` ツールセット {#vision-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `vision_analyze` | AI の視覚で画像を解析します。画像を扱える主モデルでは、画素をそのまま複数種の結果として返すので、モデルは次の応答でそれを直に見られます。文字しか扱えない主モデルでは、補助の視覚モデルが画像を言葉で説明し、その説明を文字で返します。呼び出しの形はどちらでも同じです。 | — |

## `video` ツールセット {#video-toolset}

自分から入れるツールセットです（`hermes-cli` の既定の組み合わせには入っていません）。`--toolsets video` を付けるか、設定の `toolsets:` に `video` を書いて足します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_analyze` | URL やファイルのパスから動画の中身を解析します。字幕、場面の区切り、重要な時刻、見た目の説明が得られます。 | — |

## `video_gen` ツールセット {#videogen-toolset}

自分から入れるツールセットです（`hermes-cli` の既定の組み合わせには入っていません）。`--toolsets video_gen` を付けるか、`hermes tools` → Video Generation で有効にします。後者ではどの仕組みを使うかも案内してくれます。

使う仕組みは、`plugins/video_gen/<name>/` のプラグインとして提供されています。

- **xAI Grok-Imagine** — 文字から動画、画像から動画（SuperGrok の OAuth か `XAI_API_KEY`）。
- **FAL.ai** — Veo 3.1、Pixverse v6、Kling O3（`FAL_KEY` が必要です）。

`video_generate` のひとつのツールが両方に対応します。静止画を動かすなら `image_url` を渡し、文字だけから作るなら渡しません。いま選んでいる仕組みが、正しいエンドポイントへ自動で振り分けます。このツールの説明文は、セッションの開始時に、いま選んでいる仕組みが実際にできること（扱える入力、縦横比、解像度、長さの範囲、見本にできる画像の数、音の有無）に合わせて組み直されます。仕組みを自分で作りたいときは [動画生成のプラグイン](/hermes/docs/developer-guide/video-gen-provider-plugin/) をご覧ください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_generate` | 利用者が設定した動画生成の仕組みを使い、文字から動画を作ったり（text-to-video）、静止画を動かしたり（image-to-video）します。動かしたい画像があれば `image_url` を渡し、文字だけから作るなら渡しません。仕組みのほうが正しいエンドポイントへ自動で振り分けます。`video` の項目に、HTTP の URL か絶対パスのどちらかを返します。 | 有効な `video_gen` のプラグインと、その資格情報（`XAI_API_KEY`、`FAL_KEY` など） |
| `xai_video_edit` | すでにある動画を xAI Imagine で編集します。この仕組み専用で、`video_generate` とは別です。`video_url` には、前回の Imagine の結果として得た、公開されている HTTPS の MP4 の URL を渡してください。 | xAI Imagine の資格情報（SuperGrok の OAuth か `XAI_API_KEY`） |
| `xai_video_extend` | すでにある動画を xAI Imagine で伸ばします。この仕組み専用で、`video_generate` とは別です。`video_url` には、前回の Imagine の結果として得た、公開されている HTTPS の MP4 の URL を渡してください。 | xAI Imagine の資格情報（SuperGrok の OAuth か `XAI_API_KEY`） |

## `web` ツールセット {#web-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `web_search` | ウェブから情報を探します。既定では最大 5 件を、題名、URL、説明付きで返します。`limit`（1〜100、既定は 5）も指定できます。検索の文字列はそのまま設定した検索の仕組みへ渡されるので、`site:domain`、`filetype:pdf`、`intitle:word`、`-term`、`"exact phrase"` といった書き方は、その仕組みが対応していれば効きます。 | EXA_API_KEY か PARALLEL_API_KEY か FIRECRAWL_API_KEY か TAVILY_API_KEY |
| `web_extract` | ウェブページの URL から中身を取り出します。整った内容を markdown や文字で返します（LLM でのまとめはしないので速いです）。PDF の URL でも動きます（arxiv の論文や文書など）。PDF のリンクをそのまま渡してください。文字数の目安（既定は 15000）に収まるページはまるごと返り、それより大きいページは先頭と末尾を切り出した形で返り、末尾にディスクへ保存した全文の場所が添えられます。1 回に渡せる URL は 5 つまでです。 | EXA_API_KEY か PARALLEL_API_KEY か FIRECRAWL_API_KEY か TAVILY_API_KEY |

## `x_search` ツールセット {#xsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `x_search` | xAI に組み込まれた Responses の `x_search` を使って、X（Twitter）の投稿、プロフィール、スレッドを検索します。公開されている X の中で、いま何が話されているか、どんな反応や主張があるかを読み取るためのもので、一般のウェブページ向けではありません。投稿、返信、いいね、DM、メディアの添付、削除、ログイン中のアカウントの確認はできません。それらには認証を伴う別の X の API（たとえば `xurl` のスキル）が要ります。既定では無効で、`hermes tools` → 🐦 X (Twitter) Search から自分で有効にします。定義が登録されるのは、xAI の資格情報を設定しているときだけです（check_fn による制御です）。 | XAI_API_KEY **または** xAI Grok の OAuth ログイン（SuperGrok / Premium+） |

## `tts` ツールセット {#tts-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `text_to_speech` | 文字を読み上げた音声に変えます。MEDIA: から始まるパスを返し、各サービスがそれを音声メッセージとして届けます。Telegram では音声の吹き出しとして、Discord や WhatsApp では音声の添付として再生されます。CLI では ~/voice-memos/ に保存されます。声と提供元は… | — |

## `discord` ツールセット {#discord-toolset}

`hermes-discord` のツールセットに登録されます（ゲートウェイ限定）。メッセージのやりとりと同じ bot のトークンを使います。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord` | Discord のサーバーを読み、そこに加わります。`search_members`、`fetch_messages`、`send_message`、`react`、`fetch_channel`、`list_channels` などの動作があります。 | `DISCORD_BOT_TOKEN` |

## `discord_admin` ツールセット {#discordadmin-toolset}

`hermes-discord` のツールセットに登録されます。管理の操作には、bot 側にそれに見合う Discord の権限が要ります。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord_admin` | REST の API を通じて Discord のサーバーを管理します。ギルド、チャンネル、ロールの一覧、チャンネルの作成・変更・削除、ロールの付与、発言の一時停止、追い出し、出入り禁止ができます。 | `DISCORD_BOT_TOKEN` と bot の権限 |

## `spotify` ツールセット {#spotify-toolset}

同梱の `spotify` プラグインが登録します。OAuth のトークンが要るので、最初に一度 `hermes auth spotify` で許可してください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `spotify_playback` | Spotify の再生を操作したり、いまの再生の状態を調べたり、最近聴いた曲を取ってきたりします。 | Spotify の OAuth |
| `spotify_devices` | Spotify Connect の機器を並べたり、再生を別の機器へ移したりします。 | Spotify の OAuth |
| `spotify_queue` | 利用者の Spotify の再生待ちを調べたり、そこに曲を足したりします。 | Spotify の OAuth |
| `spotify_search` | Spotify のカタログから、曲、アルバム、アーティスト、プレイリスト、番組、エピソードを探します。 | Spotify の OAuth |
| `spotify_playlists` | Spotify のプレイリストを並べる、中身を見る、作る、直す、変更する、といったことができます。 | Spotify の OAuth |
| `spotify_albums` | Spotify のアルバムの情報や、そのアルバムに入っている曲を取ってきます。 | Spotify の OAuth |
| `spotify_library` | 利用者が保存した Spotify の曲やアルバムを並べたり、保存したり、外したりします。 | Spotify の OAuth |

## `hermes-yuanbao` ツールセット {#hermes-yuanbao-toolset}

`hermes-yuanbao` のツールセットにだけ登録されます。Yuanbao は Tencent のチャットアプリで、これらのツールはその DM、グループ、スタンプの API を動かします。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `yb_query_group_info` | グループ（アプリの中では「派/Pai」と呼ばれます）の基本の情報を調べます。名前、持ち主、人数です。 | Yuanbao の資格情報 |
| `yb_query_group_members` | グループの参加者を調べます（`@` で呼びかける、名前から人を探す、bot を並べる、といった用途です）。 | Yuanbao の資格情報 |
| `yb_send_dm` | グループの中の相手に個人あてのメッセージを送ります。メディアのファイルも添えられます。 | Yuanbao の資格情報 |
| `yb_search_sticker` | Yuanbao に組み込まれたスタンプ（TIM face）の一覧を、言葉で検索します。 | Yuanbao の資格情報 |
| `yb_send_sticker` | 組み込みのスタンプを、いまの Yuanbao のチャットに送ります。 | Yuanbao の資格情報 |
