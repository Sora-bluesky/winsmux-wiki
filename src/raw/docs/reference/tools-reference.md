---
title: "組み込みツールの一覧"
description: "Hermes の組み込みツールを、ツールセットごとにまとめた正式な一覧です"
upstream_path: reference/tools-reference.md
upstream_blob: 706f718a23bd74719038c3603433894282126b95
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/tools-reference
---

# 組み込みツールの一覧 {#built-in-tools-reference}

このページでは、Hermes に最初から入っているツールを、ツールセットごとにまとめています。どれが使えるかは、動かしている環境・登録している認証情報・有効にしているツールセットによって変わります。

**今の登録内容での本数:** およそ 86 本です。内訳は、ブラウザ 10 本（基本）＋ CDP がある場合だけ増えるブラウザ 2 本、ファイル 4 本、Home Assistant 4 本、端末 2 本（`terminal`、`process`）、デスクトップ画面まわり 12 本（`read_terminal`、`close_terminal`、`open_preview`、`close_preview`、`read_preview`、`drive_preview`、`annotate_preview`、`read_window_below`、`focus_pane`、`react_to_message`、`tour`、`tip` — デスクトップアプリのセッションだけ）、Web 2 本、Feishu 5 本、Spotify 7 本（同梱の `spotify` プラグインが登録します）、Yuanbao 5 本、かんばん 12 本（かんばんの割り振り役がエージェントを起動したときに登録されます）、プロジェクト 3 本（デスクトップ／画面ありのセッション）、Discord 2 本、動画 3 本（`video_generate`、`xai_video_edit`、`xai_video_extend`）、そして単独で立っているひとにぎりのツール（`memory`、`clarify`、`delegate_task`、`execute_code`、`cronjob`、`session_search`、`skill_view`/`skill_manage`/`skills_list`、`text_to_speech`、`image_generate`、`vision_analyze`、`video_analyze`、`todo`、`computer_use`、`x_search`）です。

:::tip MCP のツール
組み込みのツールに加えて、Hermes は MCP サーバーからツールをその場で読み込めます。MCP のツールには `mcp__<server>__` という接頭辞が付きます（たとえば `github` という MCP サーバーなら `mcp__github__create_issue`）。設定のしかたは [MCP Integration](/hermes/docs/user-guide/features/mcp/) を見てください。
:::

## `browser` ツールセット {#browser-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_back` | ブラウザの履歴をひとつ前のページへ戻ります。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_click` | スナップショットの ref ID（'@e5' など）で指した要素をクリックします。ref ID はスナップショットの出力に角かっこで示されます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_console` | いま開いているページから、ブラウザのコンソール出力と JavaScript のエラーを取り出します。console.log/warn/error/info のメッセージと、捕まえられなかった JS の例外を返します。表に出ない JavaScript のエラー、失敗した API 呼び出し、アプリの警告を見つけるのに使います。先に… | — |
| `browser_get_images` | いま開いているページにある画像を、URL と代替テキストつきで一覧にします。vision のツールで解析したい画像を探すときに便利です。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_navigate` | ブラウザで URL を開きます。セッションを用意してページを読み込みます。ほかのブラウザ系ツールより先に呼ぶ必要があります。ちょっと調べるだけなら web_search か web_extract のほうが速くて安く済みます。ブラウザ系のツールは、必要なとき… | — |
| `browser_press` | キーボードのキーを押します。フォームの送信（Enter）、移動（Tab）、ショートカットに使えます。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_scroll` | ページを指した向きにスクロールします。今見えている範囲の上や下にある中身を出したいときに使います。先に browser_navigate を呼んでおく必要があります。 | — |
| `browser_snapshot` | いま開いているページのアクセシビリティツリーを、文字で写し取ります。browser_click や browser_type で使う ref ID（@e1、@e2 など）つきで、操作できる要素を返します。full=false（既定）は操作できる要素だけの簡潔な形、full=true は… | — |
| `browser_type` | ref ID で指した入力欄に文字を打ち込みます。いったん欄を空にしてから新しい文字を入れます。先に browser_navigate と browser_snapshot を呼んでおく必要があります。 | — |
| `browser_vision` | いま開いているページのスクリーンショットを撮り、見た目で確かめられるようにします。ページがどう見えているかを知る必要があるとき——とくに CAPTCHA、目視の確認課題、入り組んだ配置、文字のスナップショットでは落ちてしまう情報があるときに使います。画像をそのまま扱えるモデルではスクリーンショットを直接渡し、そうでなければ補助の画像モデルに… | — |

## `browser` ツールセット（CDP があるときだけ使えるもの） {#browser-toolset-cdp-gated-tools}

次の 2 本は `browser` ツールセットに属しますが、セッション開始時に Chrome DevTools Protocol の接続先が見つかったときだけ登録されます。接続先は `/browser connect`、`browser.cdp_url` の設定、Browserbase のセッション、Camofox のいずれかで用意します。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `browser_cdp` | Chrome DevTools Protocol のコマンドを生のまま送ります。高い層の `browser_*` ツールでは届かない操作のための抜け道です。https://chromedevtools.github.io/devtools-protocol/ を参照してください | CDP の接続先 |
| `browser_dialog` | JavaScript の標準ダイアログ（alert / confirm / prompt / beforeunload）に答えます。先に `browser_snapshot` を呼んでください。返答待ちのダイアログは、その `pending_dialogs` の欄に出ます。そのうえで `browser_dialog(action='accept'\|'dismiss')` を呼びます。 | CDP の接続先 |

## `clarify` ツールセット {#clarify-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `clarify` | 先へ進む前に、確認・意見・判断が必要になったときに利用者へ問いかけます。3 つの形があります。1. **択一の選択肢** — 最大 4 つまで。利用者はどれかを選ぶか、5 つめの「その他」から自分で書けます。2. **複数選べる選択肢** — `multi_select=true` にするとチェックボックスになり、選ばれたものが一覧で返ります。3. **自由回答** — 選択肢を出さず、利用者が自由に書きます。選択肢は良いと思う順に並べます。先頭のものはどの画面でも `(Recommended)` と表示され、最初から選ばれた状態になります。この表示は見た目だけのもので、エージェントが読む答えからは取り除かれます。従来の CLI では、複数選択はスペースキーでチェックを付け外しします。チェックボックスの画面を持たないメッセージ系のプラットフォームでは、利用者がコンマや空白で区切った番号（「1, 3」など）か、選択肢の文言そのものを返信します。 | — |

### まとめて質問する {#asking-multiple-questions-at-once}

`clarify` のツールは `questions` の配列も受け取れます（独立した 2〜5 問で、それぞれに `choices` と `multi_select` を持てます）。ひとつずつ聞かずに、確認したいことをまとめて 1 回で問いかけられます。結果は同じ順に並んだ `responses` の配列で返り、各問いに `id` を付けていればそれもそのまま返ります。

画面ごとの動きは次のとおりです。

- **デスクトップ**は、すべての問いを 1 枚のカードに出します。選んだ内容や書いた答えはその場に置かれ、**確認して続ける**のボタン（全問に答えると押せるようになります）でまとめて送られます。置いてある答えは、その確認を押すまで直せます。スキップすると全部が取り消されます。
- **TUI と CLI** は、状態を短い一覧（`✓` 回答済み / `▸` 今の問い / `·` これから）で示し、今の問いの選択肢だけを開きます。Enter で今の答えを確定して次の未回答へ進み、Tab で問いのあいだを行き来して好きな順に答えられます。Esc でまとめて取り消します。
- **メッセージ系のプラットフォーム**（Telegram、Discord など）では、これまでどおり 1 問ずつ順番に聞く形になります。利用者が返事をやめた場合、残りの問いは送られません。

途中で時間切れになっても、利用者がすでに確定した答えは残ります。ツールの結果にはその答えと `"timed_out": true` が入り、答えていない項目は空のままです。これによってエージェントは、わざと飛ばされたのか、人がいなくなったのかを区別できます。

## `code_execution` ツールセット {#codeexecution-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `execute_code` | Hermes のツールをプログラムから呼べる Python のスクリプトを走らせます。ツール呼び出しが 3 回以上あって途中に処理を挟みたいとき、大きなツール出力を自分の文脈に入れる前に絞り込みたいとき、条件で処理を分けたいとき（… | — |

## `cronjob` ツールセット {#cronjob-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `cronjob` | 予定した仕事をまとめて扱います。`action="create"`、`"list"`、`"update"`、`"pause"`、`"resume"`、`"run"`、`"remove"` でジョブを操作します。スキルを 1 つ以上結び付けたジョブにも対応し、更新時に `skills=[]` を渡すと結び付けを外せます。定期実行は、今のチャットの文脈を持たない新しいセッションで動きます。 | — |

## `delegation` ツールセット {#delegation-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `delegate_task` | 切り離された文脈で下位のエージェントを立ち上げます。それぞれが自分の会話・端末セッション・ツールセットを持ち、最後のまとめだけが手元に返ります。ひとつの仕事なら 'goal'、まとめて並行させるなら 'tasks' を渡します（本数の上限や入れ子の決まりは… | — |

## `feishu_doc` ツールセット {#feishudoc-toolset}

Feishu のドキュメントのコメントに自動で返す処理（`gateway/platforms/feishu_comment.py`）専用です。`hermes-cli` や、ふだんの Feishu チャットのつなぎ込みには出てきません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_doc_read` | file_type とトークンを渡して、Feishu／Lark のドキュメント（Docx、Doc、Sheet）の本文をすべて読みます。 | Feishu アプリの認証情報 |

## `feishu_drive` ツールセット {#feishudrive-toolset}

Feishu のドキュメントのコメント処理専用です。ドライブ上のファイルに付いたコメントの読み書きを担います。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `feishu_drive_add_comment` | Feishu／Lark のドキュメントやファイルに、いちばん上の階層のコメントを付けます。 | Feishu アプリの認証情報 |
| `feishu_drive_list_comments` | Feishu／Lark のファイルに付いた、文書全体へのコメントを新しい順に並べます。 | Feishu アプリの認証情報 |
| `feishu_drive_list_comment_replies` | Feishu の特定のコメントの流れ（文書全体または選択範囲）に付いた返信を並べます。 | Feishu アプリの認証情報 |
| `feishu_drive_reply_comment` | Feishu のコメントの流れに返信します。`@` での呼びかけも付けられます。 | Feishu アプリの認証情報 |

## `file` ツールセット {#file-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `patch` | ファイルの狙った箇所を置き換えます。端末で sed や awk を使う代わりにこれを使います。あいまい一致（9 とおりの方法）を使うので、空白や字下げの小さな違いでは崩れません。差分を統一形式で返します。編集後には構文チェックが自動で走り… | — |
| `read_file` | テキストファイルを行番号つき・ページ送りつきで読みます。端末で cat や head や tail を使う代わりにこれを使います。出力の形は 'LINE_NUM\|CONTENT' です。見つからないときは似た名前のファイルを挙げます。大きなファイルには offset と limit を使ってください。およそ 10 万文字を超える読み取りは行の切れ目で打ち切られ、next_offset を返します。Jupyter ノートブック（.ipynb）、Word の文書（.docx）、Excel のブック（.xlsx）も… | — |
| `search_files` | ファイルの中身を検索したり、名前でファイルを探したりします。端末で grep や rg や find や ls を使う代わりにこれを使います。Ripgrep を土台にしていて、シェルで同じことをするより高速です。中身の検索（target='content'）は正規表現でファイル内を探します。出力の形は、一致した行を全部出すもの… | — |
| `write_file` | ファイルに内容を書き込み、もとの中身をすべて置き換えます。端末で echo や cat のヒアドキュメントを使う代わりにこれを使います。親のディレクトリは自動で作られます。ファイル全体を上書きするので、狙った箇所だけ直したいときは 'patch' を使ってください。.py／.json／.yaml／.toml などチェックできる言語では構文チェックが自動で走り、その書き込みで新しく出たエラーだけが示されます。 | — |

## `homeassistant` ツールセット {#homeassistant-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `ha_call_service` | Home Assistant のサービスを呼んで機器を操作します。どんなサービスがあり、どの引数を取るかは ha_list_services で調べられます。 | — |
| `ha_get_state` | Home Assistant のひとつのエンティティについて、細かい状態を取り出します。明るさ、色、設定温度、センサーの値など、すべての属性を含みます。 | — |
| `ha_list_entities` | Home Assistant のエンティティを並べます。ドメイン（light、switch、climate、sensor、binary_sensor、cover、fan など）や、部屋の名前（居間、台所、寝室など）で絞り込めます。 | — |
| `ha_list_services` | 機器を操作するために使える Home Assistant のサービス（動作）を並べます。機器の種類ごとに何ができて、どんな引数を取るのかが分かります。ha_list_entities で見つけた機器の動かし方を調べるのに使います。 | — |

## `computer_use` ツールセット {#computeruse-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `computer_use` | cua-driver を通して、裏側でデスクトップを操作します。スクリーンショット（SOM／画像／AX）、クリック・ドラッグ・スクロール・入力・キー・待機、list_apps、focus_app に対応します。利用者のカーソルやキーボードの操作を奪いません。ツールを扱えるモデルならどれでも動きます。macOS、Windows、Linux に対応します。 | `$PATH` の通ったところに `cua-driver`（`hermes tools` から入れられます）。 |

:::note
**Honcho のツール**（`honcho_profile`、`honcho_search`、`honcho_context`、`honcho_reasoning`、`honcho_conclude`）は、もう組み込みではありません。`plugins/memory/honcho/` にある Honcho の記憶プロバイダのプラグインから使えます。入れ方と使い方は [Memory Providers](/hermes/docs/user-guide/features/memory-providers/) を見てください。
:::

## `image_gen` ツールセット {#imagegen-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `image_generate` | 利用者が設定した処理先（FAL.ai、OpenAI、OpenAI Codex 認証、xAI、Krea）を使って、文章から画像を作ったり（text-to-image）、手元の画像を直したり作り変えたり（image-to-image）します。画像を直すときは `image_url` を、作風の見本を渡すときは `reference_image_urls` を指定します。どちらも省くと文章からの生成になります。モデルは利用者が設定するもので、エージェントは選べません。画像の URL かローカルのパスをひとつ返します。 | FAL_KEY / OPENAI_API_KEY / Codex OAuth / xAI OAuth / KREA_API_KEY |

## `kanban` ツールセット {#kanban-toolset}

登録されるのは、(a) かんばんの割り振り役がエージェントを起動したとき（環境変数 `HERMES_KANBAN_TASK` が入っているとき）か、(b) `kanban` ツールセットをはっきり有効にしたプロファイルで動いているときです。仕事ごとの担い手は、自分に割り当てられた仕事の進行に使うツールを持ちます。まとめ役のプロファイルには、これに加えて `kanban_list` や `kanban_unblock` のような盤面をさばくツールが付きます。全体の流れは [Kanban Multi-Agent](/hermes/docs/user-guide/features/kanban/) を見てください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `kanban_show` | この担い手に割り当てられている、今のかんばんの仕事を表示します（題名、説明、コメント、依存関係）。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_list` | 盤面の仕事を絞り込んで並べます。まとめ役だけが使え、割り振りで起きた担い手には見えません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_complete` | 今の仕事を完了にし、引き継ぎの内容（結果、成果物、あとに残る作業）を型どおりに残します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_block` | 利用者への問いを立てて、今の仕事を止めます。割り振り役はいったん手を止め、問いを人に見せ、返事が来たら再開します。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_review` | 作ったものを確認役へ渡します。`summary` と、任意で構造化した `metadata`、確認役のプロファイルを添えられます。同じ仕事が `review` へ移るだけで、止まったことにはならず、停止回数の集計にも影響しません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_request_changes` | 確認中の仕事に対する、確認役の差し戻しの判断です。その確認を終わらせ、親の条件を掛け直したうえで、仕事をもとの作り手へ戻します。停止としては数えません。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_heartbeat` | 時間のかかる作業の途中で進み具合を知らせ、担い手がまだ生きていることを割り振り役に伝えます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_comment` | 仕事の状態は変えずに、その流れへコメントを足します。途中で分かったことを共有するのに向きます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_create` | 今の仕事から子の仕事を切り出します。まとめ役や、あとに残る作業を作る担い手が使います。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_link` | 仕事どうしを、親から子への依存関係でつなぎます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_unblock` | 止まっている仕事を、親がすべて終わっていれば `ready` へ、まだ開いている親があれば `todo` へ移します。まとめ役だけが使え、割り振りで起きた担い手には見えません。 | `kanban` ツールセットを持つプロファイル |
| `kanban_attach` | ファイルの中身をそのまま（base64 で）渡して、仕事に添付します。その仕事の添付ディレクトリに実体として保存され、上限は 25 MB です。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attach_url` | URL を渡してファイルを仕事に添付します。Hermes がサーバー側で取ってきて実体として保存します（上限 25 MB）。http／https の URL だけです。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |
| `kanban_attachments` | 仕事に添付されているファイルを並べます。id、ファイル名、content_type、大きさ、上げた人、ディスク上の絶対パスが出ます。 | `HERMES_KANBAN_TASK` または `kanban` ツールセット |

## `project` ツールセット {#project-toolset}

デスクトップの [Projects](/hermes/docs/user-guide/cli/) を動かすためのツールです。Projects は、名前を付けた、複数のフォルダをまとめた作業場です。`project` ツールセットを有効にしたとき（主にデスクトップアプリやダッシュボードの画面）に登録されます。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `project_create` | デスクトップの Project（名前を付けた作業場）を作り、このチャットをそこへ移します。`path` を渡すと、リポジトリやフォルダに結び付けられます。 | — |
| `project_list` | デスクトップの Project を並べ、どれが今使われているかを示します。 | — |
| `project_switch` | このチャットを、すでにある Project（名前、slug、id のいずれかで指定）へ移します。セッションの作業場は、その Project の主フォルダに移ります。 | — |

## `memory` ツールセット {#memory-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `memory` | セッションをまたいで残る記憶に、大事なことを書き留めます。この記憶はセッションの初めにシステムプロンプトへ差し込まれます。会話と会話のあいだで、利用者のことや自分の置かれた環境を覚えておくしくみです。何を書き留めるかは… | — |

## `session_search` ツールセット {#sessionsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `session_search` | 手元のセッション DB に残っている過去のセッションを検索したり、そのなかを前後にたどったりします。FTS5 を土台にした取り出しで、DB にある実際のメッセージを返します（LLM は呼びません）。使い方は 4 とおりです。探す（`query` を渡す）、たどる（`session_id` と `around_message_id` を渡す）、読む（`session_id` だけ渡す）、眺める（引数なし）。 | — |

## `skills` ツールセット {#skills-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `skill_manage` | スキルを扱います（作る、直す、消す）。スキルは手順の記憶であり、繰り返し出てくる仕事への使い回せる進め方です。新しいスキルは ~/.hermes/skills/ に置かれます。すでにあるスキルは、どこにあっても直せます。動作は create（SKILL.m… | — |
| `skill_view` | スキルは、特定の仕事や進め方の情報に加えて、スクリプトやひな形も読み込めるようにするものです。スキルの中身をすべて読み込むか、そこから結び付けられたファイル（参照資料、ひな形、スクリプト）を開きます。最初の呼び出しでは SKILL.md の中身と… | — |
| `skills_list` | 使えるスキルを並べます（名前と説明）。中身をすべて読み込むには skill_view(name) を使います。 | — |

## `terminal` ツールセット {#terminal-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `process` | terminal(background=true) で始めた裏側のプロセスを扱います。動作は 'list'（すべて表示）、'poll'（状態と新しい出力を確認）、'log'（ページ送りつきで出力を全部見る）、'wait'（終わるか時間切れになるまで待つ）、'kill'（終わらせる）、'write'（送… | — |
| `terminal` | Linux の環境でシェルのコマンドを実行します。ファイルシステムは呼び出しをまたいで残ります。長く動かすサーバーには `background=true` を指定します。`background=true` と一緒に `notify_on_complete=true` を指定すると、プロセスが終わったときに自動で知らせが届き、様子を見に行かずに済みます。cat／head／tail は使わず read_file を使ってください。grep／rg／find も使わず search_files を使ってください。 | — |

## `desktop_ui` ツールセット {#desktopui-toolset}

Hermes のデスクトップアプリから始まったセッションで有効になります。つないでいるバックエンドの種類（ローカル、SSH、URL、Hermes Cloud）は問いません。CLI、TUI、メッセージ系、定期実行のセッションには出てきません。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `read_terminal` | Hermes デスクトップ画面の、アプリ内の端末ペイン（このチャットの隣にあるシェル）にいま出ている内容を読みます。 | — |
| `close_terminal` | Hermes デスクトップ画面で、裏側のプロセス用に開かれている読み取り専用の端末タブを閉じます。プロセスは止めません。タブが消えるだけです。止めるには process(action='kill') を使ってください。 | — |
| `open_preview` | Hermes デスクトップアプリで、Web の URL、localhost の開発サーバーの URL、あるいはファイルのパスを、チャットの隣のプレビューペインに開きます。 | — |
| `close_preview` | チャットの隣のプレビューペイン、またはその中のタブをひとつ閉じます。`url` を省くとペイン全体を閉じ、URL かファイルのパスを渡すとそのタブだけを閉じます。 | — |
| `read_preview` | Hermes デスクトップ画面のプレビューペインにいま出ている内容を読みます。アプリ内ブラウザのページの文字（URL、題名、表示されている文字。`start`／`count` でページ送りできます）か、ファイルや成果物のタブが何であるかが分かります。 | — |
| `drive_preview` | アプリ内ブラウザで開いているページを操作します。`elements` は、押せるもの・打ち込めるものを一覧にします（それぞれに `btn-sign-in` や `inp-email` のような名前になる ref が付き、役割・ラベル・値も分かります）。そのうえで `click`、`hover`、`type`、`scroll`、`press` が ref に対して働き、`back`／`forward`／`reload` がペインの履歴を動かします。ポインタとキーボードは本物の入力なので、乗せると開くメニューもちゃんと開きます。ref はページが移るまで有効で、要素を作り直す再描画をまたいでも保たれます。そのため最初に一覧を取ったあとは、どの操作もページ全体ではなく差分だけ——何が増え、消え、変わり、つなぎ直されたか——を返します。 | — |
| `annotate_preview` | アプリ内ブラウザで要素を枠で囲み、消すまでその印を残します。`drive_preview` が作業中に出す一瞬の合図に対して、こちらは意図して残すほうです。`add` は ref に短いラベルつきで印を付け、`remove` はひとつ外し、`clear` はすべて外します。印は要素について動き、要素が消えれば一緒に消えるので、ページが移ると印もなくなります。 | — |
| `read_window_below` | Hermes デスクトップの窓のすぐ下にある OS の窓が何かを調べます。アプリ名、題名、位置と大きさが分かります（情報だけで、画素は一切取りません）。macOS では、ほかのアプリの題名は画面収録の許可がすでに出ているときだけ見えます。このツールから許可を求めることはありません。 | — |
| `focus_pane` | Hermes デスクトップアプリのペイン（チャット、ファイル、端末、レビュー、セッション）を出して、そこに焦点を移します。 | — |
| `react_to_message` | メッセージに絵文字ひとつで反応します。iMessage のタップバックのような形です。設定 → 外観（`display.message_reactions`）で自分から有効にします。 | — |
| `tour` | その場で案内をします。画面を暗くし、要素を目立たせ、語りの吹き出しを添えます（driver.js）。Hermes アプリ自身の画面でも、プレビューペインに開いたどのページでも使えます。`targets` は画面に何があるかを調べ、`show` は一歩ずつ語り、`start` は次へ／前への操作を利用者に渡します。 | — |
| `tip` | ひとつの要素を、小さな色つきの吹き出しと矢印で指します。`tour` の静かな兄弟で、画面を暗くせず、絞り込みもせず、次へ／前へもありません。`data-tour` の目印も、`tour(action='targets')` で調べるやり方も同じです。 | — |

### 案内 {#tours}

`tour` のツールは、指す先を自分で見つけます。`action='targets'` を呼ぶと、画面にある指定できる要素すべてを、セレクタ・ラベル・`stable` の印つきで返します。安定したセレクタは、そのものを表す情報（`data-tour`、`id`、`data-testid`、`aria-label`）を手がかりにするので、再描画されても生き残ります。位置で数える `nth-child` の道筋はそうはいきません。だから安定したものが先に並び、そちらを選ぶべきです。

自分で長持ちする目印を要素に付けたいときは、こう書き加えます。

```html
<div data-tour="composer">…</div>
```

目印は呼び出し側ではなく**部品そのもの**に付けます。一度直せば、その部品を使っている場所すべてに名前が付きます。すでに用意されているものは次のとおりです。

| 目印 | 何を指すか |
|---|---|
| `overlay-nav` | 画面をかぶせる各ルート（設定、定期実行、プロファイル、エージェント）の左側のナビゲーション |
| `nav-<id>` | そのナビゲーションの 1 行（`nav-models`、`nav-appearance` など） |
| `field-<schemaKey>` | 設定の 1 行を、その設定キーで指す（`field-model`、`field-provider` など） |
| `page-tabs` | `PageSearchShell` を使うページ（成果物、スキルなど）の絞り込みタブ |
| `artifact-card` | 一覧に並ぶ成果物のカード |

新しい画面を足すときは、画面をひとつずつ印付けするのではなく、共通の部品に同じやり方で印を付けてください。そうすれば案内で使う語彙は小さいままで、セレクタが腐りません。

同じしくみは、デスクトップアプリの中にあらかじめ用意された（エージェントによらない）案内も支えています。機能ごとに自前の道案内を同梱できます。

```ts

startTour([
  { selector: '[data-tour="composer"]', title: 'Composer', text: 'Type here.' },
  { selector: '[data-tour="files"]', title: 'Files', text: 'Browse your project.' }
])
```

一歩ごとに、指す先がある場所へアプリを移すこともできます。案内が終われば、元の場所に戻ります。

```ts
startTour([
  { navigate: '/artifacts', selector: '[data-tour="page-tabs"]', title: 'Filters', text: '…' },
  { pane: 'sessions', selector: '[data-slot="sidebar"]', title: 'Sessions', text: '…' }
])
```

`navigate` にはルートのパスを、`pane` にはデスクトップのペイン名を渡します。どちらもその一歩に入るときに走り、あとから現れる対象は待ってくれます。案内を閉じれば——どのルートからでも、Esc でも——始めた場所に戻ります。

第 2 引数に `'preview'` を渡すと、アプリではなくプレビューペインのページに対して動きます。

### ひとこと案内 {#tips}

ひとこと案内は、演出を省いた案内の一歩です。吹き出しがひとつ、矢印がひとつ。画面を暗くもせず、めくるものもありません。「モデル名は実はボタンです」といった一文に指を添えるだけで分かりやすくなる場面には、これくらいの重さがちょうどよく、アプリ全体を暗くするほどではありません。

`tip` のツールは `tour(action='targets')` が返すのと同じセレクタを受け取ります。だから調べるのは 1 回で両方に足り、上に挙げた `data-tour` の目印もどちらからも使えます。画面に出るひとこと案内は同時にひとつだけで、新しいものが前のものと入れ替わります。

アプリ自身も、内蔵の機能一覧を順に巡ってひとこと案内を出せます。こちらは既定で有効で、設定 → 外観で切れます。出方は通知というよりゲームの読み込み画面の豆知識に近く、起動から早くても数分あと、そのあとも 6 時間に 1 回まで、しかも本当に手が空いているときだけです。✕ でひとつ閉じると、そのひとことは以後もう出てきません。同じ設定の行から戻せます。ツールのほうはこの切り替えの外にあり、`tour` と同じく、手が空いたときではなく会話に応じて動きます。ただし待ち時間は共有しているので、Hermes からひとこと案内を出すと、利用者にはそのあと 6 時間ぶんの静けさが訪れます。

## `todo` ツールセット {#todo-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `todo` | 今のセッションでやることの一覧を扱います。手順が 3 つ以上ある入り組んだ仕事や、利用者から複数の仕事を渡されたときに使います。引数なしで呼ぶと今の一覧を読めます。項目は入れ子にできます。項目に付けられる `parent` の欄に別の項目の id を書くと、それが下位の項目になり、画面では枝分かれが字下げで描かれます。 | — |

## `vision` ツールセット {#vision-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `vision_analyze` | AI の画像理解で画像を解析します。画像を扱えるメインモデルでは、画像の画素をそのままツールの結果として返すので、次のやり取りでモデルが直接見られます。文字しか扱えないメインモデルでは、補助の画像モデルが画像を説明し、その説明を文字で返します。どちらの場合もツールの呼び出し方は同じです。 | — |

## `video` ツールセット {#video-toolset}

自分で選んで入れるツールセットです（既定の `hermes-cli` の一式には入っていません）。`--toolsets video` を付けるか、設定の `toolsets:` に `video` を入れてください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_analyze` | URL やファイルのパスから動画の中身を解析します。字幕、場面の切れ目、要になる時刻、見た目の説明が得られます。 | — |

## `video_gen` ツールセット {#videogen-toolset}

自分で選んで入れるツールセットです（既定の `hermes-cli` の一式には入っていません）。`--toolsets video_gen` を付けるか、`hermes tools` → Video Generation で有効にしてください。後者では、どの処理先を使うかも順に選べます。

処理先は `plugins/video_gen/<name>/` にプラグインとして同梱されています。

- **xAI Grok-Imagine** — 文章から動画、画像から動画（SuperGrok の OAuth か `XAI_API_KEY`）。
- **FAL.ai** — Veo 3.1、Pixverse v6、Kling O3（`FAL_KEY` が必要）。

`video_generate` の 1 本でどちらのやり方もまかなえます。静止画を動かすなら `image_url` を渡し、文章だけから作るなら省きます。有効な処理先に応じて、適切な送り先へ自動で振り分けられます。ツールの説明文はセッションの初めに組み直され、有効な処理先が実際にできること（扱える入力、縦横比、解像度、長さの範囲、見本にできる画像の数、音への対応）を映します。処理先そのものの作り方は [Video Generation Provider Plugins](/hermes/docs/developer-guide/video-gen-provider-plugin/) を見てください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `video_generate` | 利用者が設定した動画生成の処理先を使って、文章から動画を作る（text-to-video）か、静止画を動かします（image-to-video）。動かしたい画像があれば `image_url` を渡し、文章だけから作るなら省きます。処理先は適切な送り先へ自動で振り分けます。`video` の欄に、HTTP の URL かファイルの絶対パスのどちらかを返します。 | 有効な `video_gen` プラグインと、その認証情報（`XAI_API_KEY`、`FAL_KEY` など） |
| `xai_video_edit` | xAI Imagine で、すでにある動画を編集します。処理先ごとの専用ツールで、`video_generate` とは別物です。`video_url` には、前の Imagine の結果として得られた公開の HTTPS の MP4 の URL を渡してください。 | xAI Imagine の認証情報（SuperGrok の OAuth か `XAI_API_KEY`） |
| `xai_video_extend` | xAI Imagine で、すでにある動画を伸ばします。処理先ごとの専用ツールで、`video_generate` とは別物です。`video_url` には、前の Imagine の結果として得られた公開の HTTPS の MP4 の URL を渡してください。 | xAI Imagine の認証情報（SuperGrok の OAuth か `XAI_API_KEY`） |

## `web` ツールセット {#web-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `web_search` | Web を検索します。既定では最大 5 件を、題名・URL・説明つきで返します。`limit`（1〜100、既定 5）も指定できます。検索語はそのまま設定した検索の処理先へ渡されるので、`site:domain`、`filetype:pdf`、`intitle:word`、`-term`、`"exact phrase"` といった書き方は、処理先が対応していれば効きます。 | EXA_API_KEY または PARALLEL_API_KEY または FIRECRAWL_API_KEY または TAVILY_API_KEY |
| `web_extract` | Web ページの URL から中身を取り出します。整えられたページの内容を markdown か文字で返します（LLM による要約はしないので高速です）。PDF の URL（arxiv の論文や文書など）にも使えます。PDF のリンクをそのまま渡してください。文字数の上限（既定 15000）に収まるページはまるごと返り、それより大きいページは先頭と末尾を返し、ディスクに保存された全文の場所を末尾に示します。1 回につき URL は 5 件までです。 | EXA_API_KEY または PARALLEL_API_KEY または FIRECRAWL_API_KEY または TAVILY_API_KEY |

## `x_search` ツールセット {#xsearch-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `x_search` | xAI に組み込まれた `x_search` の Responses ツールを使って、X（Twitter）の投稿・プロフィール・スレッドを検索します。今どんな話がされていて、どんな反応や主張があるかを、公開されている X の範囲で読むだけのものです（一般の Web ページは対象外）。投稿・返信・いいね・DM・メディアの投稿・削除はできず、ログインしている X アカウントを覗くこともできません。それらには別の、認証を伴う X の API が要ります（たとえば `xurl` のスキル）。既定では切ってあり、`hermes tools` → 🐦 X (Twitter) Search から自分で入れます。スキーマは xAI の認証情報を設定したときだけ登録されます（check_fn で判定）。 | XAI_API_KEY **または** xAI Grok の OAuth ログイン（SuperGrok／Premium+） |

## `tts` ツールセット {#tts-toolset}

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `text_to_speech` | 文章を読み上げの音声に変えます。MEDIA: のパスを返し、それぞれのプラットフォームが音声メッセージとして届けます。Telegram では音声の吹き出しとして再生され、Discord や WhatsApp では音声の添付になります。CLI では ~/voice-memos/ に保存されます。声と提供元は… | — |

## `discord` ツールセット {#discord-toolset}

`hermes-discord` のプラットフォームのツールセットとして登録されます（ゲートウェイのみ）。メッセージのつなぎ込みと同じボットのトークンを使います。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord` | Discord のサーバーを読み、そこに加わります。動作には `search_members`、`fetch_messages`、`send_message`、`react`、`fetch_channel`、`list_channels` などがあります。 | `DISCORD_BOT_TOKEN` |

## `discord_admin` ツールセット {#discordadmin-toolset}

`hermes-discord` のプラットフォームのツールセットとして登録されます。管理の操作をするには、ボットがそれに見合う Discord の権限を持っている必要があります。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `discord_admin` | REST API を通して Discord のサーバーを管理します。サーバー／チャンネル／ロールの一覧、チャンネルの作成・編集・削除、ロールの付与、タイムアウト、キック、BAN ができます。 | `DISCORD_BOT_TOKEN` とボットの権限 |

## `spotify` ツールセット {#spotify-toolset}

同梱の `spotify` プラグインが登録します。OAuth のトークンが必要です。`hermes auth spotify` を一度だけ実行して許可してください。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `spotify_playback` | Spotify の再生を操作したり、今の再生状態を調べたり、最近聴いた曲を取り出したりします。 | Spotify の OAuth |
| `spotify_devices` | Spotify Connect の機器を並べたり、再生をほかの機器へ移したりします。 | Spotify の OAuth |
| `spotify_queue` | 再生待ちの列を調べたり、そこに曲を足したりします。 | Spotify の OAuth |
| `spotify_search` | Spotify のカタログから、曲・アルバム・アーティスト・プレイリスト・番組・エピソードを探します。 | Spotify の OAuth |
| `spotify_playlists` | Spotify のプレイリストを並べる、調べる、作る、直す、中身を入れ替える、といった操作をします。 | Spotify の OAuth |
| `spotify_albums` | Spotify のアルバムの情報や、収録曲を取り出します。 | Spotify の OAuth |
| `spotify_library` | 保存済みの曲やアルバムを並べる、保存する、外すといった操作をします。 | Spotify の OAuth |

## `hermes-yuanbao` ツールセット {#hermes-yuanbao-toolset}

`hermes-yuanbao` のプラットフォームのツールセットでだけ登録されます。Yuanbao はテンセントのチャットアプリで、これらのツールはその個別メッセージ・グループ・スタンプの API を動かします。

| ツール | 説明 | 必要な環境 |
|------|-------------|----------------------|
| `yb_query_group_info` | グループ（アプリ内では「派/Pai」と呼ばれます）の基本の情報を調べます。名前、作成者、人数が分かります。 | Yuanbao の認証情報 |
| `yb_query_group_members` | グループの参加者を調べます（`@` での呼びかけ、名前から人を探す、ボットを並べる、といった用途）。 | Yuanbao の認証情報 |
| `yb_send_dm` | グループ内の相手に個別のメッセージを送ります。メディアのファイルも添えられます。 | Yuanbao の認証情報 |
| `yb_search_sticker` | Yuanbao に組み込まれたスタンプ（TIM face）のカタログを、キーワードで探します。 | Yuanbao の認証情報 |
| `yb_send_sticker` | 組み込みのスタンプを、今の Yuanbao のチャットへ送ります。 | Yuanbao の認証情報 |
