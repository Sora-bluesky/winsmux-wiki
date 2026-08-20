---
title: "ツールセット一覧"
description: "Hermes の中核・複合・プラットフォーム・動的の各ツールセットをまとめた一覧です。"
upstream_path: reference/toolsets-reference.md
upstream_blob: 5904f1a9f71890202c5f06562fc94f9917fdef79
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/toolsets-reference
---

# ツールセット一覧 {#toolsets-reference}

ツールセットは、エージェントに何をさせるかを決めるツールの束に名前を付けたものです。プラットフォームごと、セッションごと、作業ごとに、使えるツールを切り替えるための主な仕組みになります。

## ツールセットの仕組み {#how-toolsets-work}

すべてのツールは、必ずどれか一つのツールセットに属します。ツールセットを有効にすると、その束に入っているツールがまとめてエージェントから使えるようになります。ツールセットには三つの種類があります。

- **中核（Core）** — 関係するツールをひとまとまりにしたものです（例えば `file` には `read_file`、`write_file`、`patch`、`search_files` が入っています）
- **複合（Composite）** — よくある場面に合わせて、複数の中核ツールセットをまとめたものです（例えば `debugging` には file、terminal、web のツールが入ります）
- **プラットフォーム（Platform）** — ある動かし方に合わせて、ツールの構成をひととおり決めたものです（例えば `hermes-cli` は、対話的な CLI セッションで最初から使われます）

## ツールセットを設定する {#configuring-toolsets}

### セッションごと（CLI） {#per-session-cli}

```bash
hermes chat --toolsets web,file,terminal
hermes chat --toolsets debugging        # composite — expands to file + terminal + web
hermes chat --toolsets all              # everything
```

### プラットフォームごと（config.yaml） {#per-platform-configyaml}

```yaml
toolsets:
  - hermes-cli          # default for CLI
  # - hermes-telegram   # override for Telegram gateway
```

### 画面から管理する {#interactive-management}

```bash
hermes tools                            # curses UI to enable/disable per platform
```

セッションの中からなら、次のように書きます。

```
/tools list
/tools disable browser
/tools enable homeassistant
```

## 中核ツールセット {#core-toolsets}

| ツールセット | ツール | 用途 |
|---------|-------|---------|
| `browser` | `browser_back`, `browser_cdp`, `browser_click`, `browser_console`, `browser_dialog`, `browser_get_images`, `browser_navigate`, `browser_press`, `browser_scroll`, `browser_snapshot`, `browser_type`, `browser_vision`, `web_search` | ブラウザ操作の中核です。ちょっと調べたいときの逃げ道として `web_search` も入っています。`browser_cdp` と `browser_dialog` は動かしている最中に判定され、セッションの開始時に CDP の接続先へ届くときだけ登録されます（`/browser connect`、`browser.cdp_url` の設定、Browserbase、Camofox のいずれか経由）。`browser_dialog` は、CDP の監視役がつながっているときに `browser_snapshot` が足す `pending_dialogs` と `frame_tree` の項目と組みで働きます。 |
| `clarify` | `clarify` | エージェントがはっきりさせたいことがあるとき、利用者に問いかけます。 |
| `code_execution` | `execute_code` | Hermes のツールをプログラムから呼ぶ Python スクリプトを実行します。 |
| `coding` | composite (`file` + `terminal` + `search` + `web` + `skills` + `browser` + `todo` + `memory` + `session_search` + `clarify` + `code_execution` + `delegation` + `vision`) | ソフトウェアの作業向けにコードを中心へ据えた束です。ファイルの編集、端末、検索、web の資料、スキル、ブラウザ、任せる先の切り出し、コードの実行までそろいます。 |
| `cronjob` | `cronjob` | 繰り返す作業を予定に入れて管理します。 |
| `debugging` | composite (`file` + `terminal` + `web`) | 不具合を追うための束です。ファイル、プロセスと端末、web の抜き出しと検索が入ります。 |
| `delegation` | `delegate_task` | 別々に動く下請けのエージェントを起こして、並べて作業させます。 |
| `discord` | `discord` | Discord のテキスト・埋め込み・DM といった基本の操作です（gateway でのみ動きます）。`hermes-discord` のツールセットで有効になります。 |
| `discord_admin` | `discord_admin` | Discord の管理操作（追放、役割の変更、チャンネルの管理）です。`hermes-discord` のツールセットで有効になり、bot 側に該当する Discord の権限が要ります。 |
| `feishu_doc` | `feishu_doc_read` | Feishu／Lark の文書の中身を読みます。Feishu の文書コメントに自動で返す仕組みが使います。 |
| `feishu_drive` | `feishu_drive_add_comment`, `feishu_drive_list_comments`, `feishu_drive_list_comment_replies`, `feishu_drive_reply_comment` | Feishu／Lark のドライブでコメントを扱う操作です。コメント担当のエージェント専用で、`hermes-cli` などのメッセージ系ツールセットには出てきません。 |
| `file` | `patch`, `read_file`, `search_files`, `write_file` | ファイルを読む、書く、探す、直す操作です。 |
| `homeassistant` | `ha_call_service`, `ha_get_state`, `ha_list_entities`, `ha_list_services` | Home Assistant を通した家の機器の操作です。`HASS_TOKEN` を設定しているときだけ使えます。 |
| `computer_use` | `computer_use` | cua-driver を通して、裏でデスクトップを操作します。カーソルや前面の位置を奪いません。ツールを扱えるモデルならどれでも動きます。macOS、Windows、Linux に対応し、`$PATH` の通った場所に `cua-driver` が要ります。 |
| `context_engine` | (varies) | いま動いている context-engine のプラグインが出すツールです（プラグインが中身を入れるまでは空です）。 |
| `image_gen` | `image_generate` | FAL.ai を使った、文章からの画像づくりです（希望すれば OpenAI や xAI も使えます）。 |
| `video_gen` | `video_generate`, `xai_video_edit`, `xai_video_extend` | プラグインが登録した基盤（xAI Grok-Imagine、FAL.ai の Veo 3.1／Pixverse v6／Kling O3）を使い、文章や画像から動画を作ります。画像を動かしたいときは `image_url` を渡し、文章から作るときは省きます。`xai_video_edit` と `xai_video_extend` は提供元に固有の編集・延長のツールで、xAI Imagine の資格情報があるときだけ使えます。 |
| `kanban` | `kanban_attach`, `kanban_attach_url`, `kanban_attachments`, `kanban_block`, `kanban_comment`, `kanban_complete`, `kanban_create`, `kanban_heartbeat`, `kanban_link`, `kanban_list`, `kanban_request_changes`, `kanban_request_review`, `kanban_show`, `kanban_unblock` | 複数のエージェントで足並みをそろえるためのツールです。差配役が起こした作業係（`HERMES_KANBAN_TASK`）と、`kanban` ツールセットを名指しで並べたプロファイルに登録されます（`all`／`*` のまとめ指定では**有効になりません**）。作業係は仕事を終わりにする、正式な見直しを頼む、止まっていると伝える、生きていると知らせる、コメントする、続きの仕事を作ってつなげる、といったことができます。差配側のプロファイルには、これに加えて一覧や止め解除といった板を回すためのツールが付きます。`delegate_task` で生まれた子は板の持ち主にはなりません。子の側ではこのツールセットが定義から外されて無効になり、親から `HERMES_KANBAN_*` の環境変数が渡っていても、板を直に書き換える操作は実行時に弾かれます。 |
| `memory` | `memory` | セッションをまたいで残る記憶の管理です。 |
| `desktop_ui` | `annotate_preview`, `close_preview`, `close_terminal`, `drive_preview`, `focus_pane`, `open_preview`, `react_to_message`, `read_preview`, `read_terminal`, `read_window_below`, `tour` | Hermes のデスクトップアプリそのものに働きかける機能です。組み込みの端末ペインを読む・閉じる、アプリ内のブラウザを開く・読む・閉じる・操作する・書き込みを添える、アプリの背後にある OS の窓を見分ける、ペインを表に出す、メッセージにリアクションを付ける、案内を流す（アプリや下見のペインで画面の要素を光らせながら説明する）といったことができます。デスクトップアプリから始まったセッションで有効になり、つなぎ先が手元でも SSH でも URL でも Hermes Cloud でも変わりません。CLI、TUI、メッセージ、定時実行のセッションには決して現れません。 |
| `project` | `project_create`, `project_list`, `project_switch` | デスクトップの[プロジェクト](/hermes/docs/user-guide/cli/)（名前を付けた、複数のフォルダーをまとめた作業場）を作って切り替えます。画面のある、デスクトップのセッション専用です。 |
| `safe` | `image_generate`, `vision_analyze`, `web_extract`, `web_search` (via `includes`) | 読むだけの調べものと、素材づくりです。ファイルへの書き込みも、端末も、コードの実行もありません。 |
| `search` | `web_search` | web の検索だけです（抜き出しは付きません）。 |
| `session_search` | `session_search` | 過去のやりとりのセッションを探します。 |
| `skills` | `skill_manage`, `skill_view`, `skills_list` | スキルの作成・閲覧・更新・削除と、見て回る操作です。 |
| `spotify` | `spotify_albums`, `spotify_devices`, `spotify_library`, `spotify_playback`, `spotify_playlists`, `spotify_queue`, `spotify_search` | Spotify をそのまま操作します（再生、順番待ち、検索、プレイリスト、アルバム、ライブラリ）。同梱の `spotify` プラグインが登録します。 |
| `terminal` | `process`, `terminal` | シェルのコマンドの実行と、裏で動くプロセスの管理です。 |
| `todo` | `todo` | セッションの中でやることの一覧を扱います。 |
| `tts` | `text_to_speech` | 文章から読み上げの音声を作ります。 |
| `vision` | `vision_analyze` | 画像を扱えるモデルによる画像の読み取りです。 |
| `video` | `video_analyze` | 動画を読み取って中身をつかむためのツールです（初めから入ってはいません。`--toolsets` で名指しして足します）。 |
| `web` | `web_extract`, `web_search` | web の検索と、ページの中身の抜き出しです。 |
| `x_search` | `x_search` | xAI に組み込まれた `x_search` の Responses ツールを使い、公開された X を読むだけで見て回ります。X API の認証付きの読み取りやアカウントの操作には `xurl` のスキルを使ってください。初めは切ってあります。`hermes tools` から自分で入れてください。xAI の資格情報（SuperGrok の OAuth か `XAI_API_KEY`）を設定したときだけ、この定義が登録されます。 |
| `yuanbao` | `yb_query_group_info`, `yb_query_group_members`, `yb_search_sticker`, `yb_send_dm`, `yb_send_sticker` | Yuanbao の DM やグループの操作と、スタンプの検索です。`hermes-yuanbao` にだけ登録されます。 |

## プラットフォームのツールセット {#platform-toolsets}

プラットフォームのツールセットは、ある動かし先に向けたツールの構成をひととおり決めたものです。メッセージ系のプラットフォームは、たいてい `hermes-cli` と同じ内容になっています。

| ツールセット | `hermes-cli` との違い |
|---------|-------------------------------|
| `hermes-cli` | すべてが入ったツールセットで、対話的な CLI セッションで最初から使われます。file、terminal、web、browser、memory、skills、vision、image_gen、todo、tts、delegation、code_execution、cronjob、session_search、clarify、computer_use、Home Assistant、そして kanban のツールが入ります（いずれも実行時に check_fn で判定されます）。 |
| `hermes-acp` | `clarify`、`cronjob`、`image_generate`、`text_to_speech`、`computer_use`、Home Assistant の四つのツール、kanban のツールを外します。IDE の中でのコードの作業に的を絞っています。 |
| `hermes-api-server` | `clarify`、`text_to_speech`、`computer_use`、kanban のツールを外します。それ以外はそのままで、人が応じられないプログラムからの利用に向いています。 |
| `hermes-cron` | `hermes-cli` と同じです。 |
| `hermes-telegram` | `hermes-cli` と同じです。 |
| `hermes-discord` | `hermes-cli` に `discord` と `discord_admin` を足します。 |
| `hermes-slack` | `hermes-cli` と同じです。 |
| `hermes-whatsapp` | `hermes-cli` と同じです。 |
| `hermes-signal` | `hermes-cli` と同じです。 |
| `hermes-matrix` | `hermes-cli` と同じです。 |
| `hermes-mattermost` | `hermes-cli` と同じです。 |
| `hermes-email` | `hermes-cli` と同じです。 |
| `hermes-sms` | `hermes-cli` と同じです。 |
| `hermes-bluebubbles` | `hermes-cli` と同じです。 |
| `hermes-dingtalk` | `hermes-cli` と同じです。 |
| `hermes-feishu` | `feishu_doc_*` と `feishu_drive_*` の五つのツールを足します（文書コメントの処理だけが使い、ふだんのチャットのつなぎ役は使いません）。 |
| `hermes-qqbot` | `hermes-cli` と同じです。 |
| `hermes-wecom` | `hermes-cli` と同じです。 |
| `hermes-wecom-callback` | `hermes-cli` と同じです。 |
| `hermes-weixin` | `hermes-cli` と同じです。 |
| `hermes-yuanbao` | `hermes-cli` に `yb_*` の五つのツール（DM・グループ・スタンプ）を足します。 |
| `hermes-homeassistant` | `hermes-cli` と同じです（Home Assistant のツールは初めから入っていて、`HASS_TOKEN` を設定すると動きだします）。 |
| `hermes-webhook` | 安全な範囲に絞った内容で、`web_search`、`web_extract`、`vision_analyze`、`clarify` だけです。webhook から始まった実行には、端末もファイルもブラウザも渡しません。 |
| `hermes-gateway` | gateway が内側で使う差配用のツールセットで、`hermes-<platform>` のすべてを合わせたものです。gateway がどんな送り元のメッセージでも受け取る必要があるときに使います。 |

## 動的なツールセット {#dynamic-toolsets}

### MCP サーバーのツールセット {#mcp-server-toolsets}

設定した MCP サーバーごとに、動かしている最中に `mcp-<server>` というツールセットが作られます。例えば `github` の MCP サーバーを設定すると、そのサーバーが出しているツールをすべて含む `mcp-github` というツールセットができます。

```yaml
# config.yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
```

こうしてできた `mcp-github` は、`--toolsets` やプラットフォームの設定から名指しできます。

### プラグインのツールセット {#plugin-toolsets}

プラグインは、自分の初期化のときに `ctx.register_tool()` を呼んで、自前のツールセットを登録できます。登録されたものは初めから入っているツールセットと並んで現れ、同じやり方で有効にも無効にもできます。

### 自前のツールセット {#custom-toolsets}

`config.yaml` に自前のツールセットを書けば、その案件向けの束を作れます。

```yaml
toolsets:
  - hermes-cli
custom_toolsets:
  data-science:
    - file
    - terminal
    - code_execution
    - web
    - vision
```

### まとめ指定 {#wildcards}

- `all` または `*` — 登録されているすべてのツールセット（初めから入っているもの、動的なもの、プラグインのもの）に広がります

一部のツールには、ツールセットに属しているかどうかとは別に、使えるかどうかの判定がもう一段あります。これらは `all`／`*` だけでは**有効になりません**。

- **前提で決まる**ツール（browser、`computer_use`、`code_execution`、Feishu、Home Assistant、cronjob）は、その裏側の仕組みや資格情報を設定したときだけ現れます。
- **進め方で決まる**ツール、つまり `kanban` のツールセットは、あえて自分で入れる形にしてあります。`all`／`*` では kanban は**有効になりません**。`kanban` を名指しで並べるか、`HERMES_KANBAN_TASK` を持つ差配役の作業係である必要があります。kanban のツールは共有している板の状態を書き換えるので、`all` のときでも切ったままにしてあります。

## `hermes tools` との関係 {#relationship-to-hermes-tools}

`hermes tools` のコマンドは、プラットフォームごとにツールを一つずつ切り替えるための curses の画面を出します。ここではツールの単位で（ツールセットより細かく）扱い、結果は `config.yaml` に残ります。切ったツールは、そのツールセットが有効でも取り除かれます。

あわせて、個々のツールとその引数をすべて並べた[ツール一覧](/hermes/docs/reference/tools-reference/)もご覧ください。
