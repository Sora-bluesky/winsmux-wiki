---
title: "CLI の内部構造"
description: "hermes_cli の成り立ち — スラッシュコマンドの振り分け、設定の読み込み、スキンエンジン、トランザクション方式の更新パイプライン、プロセス同定のルール"
upstream_path: developer-guide/cli-internals.md
upstream_blob: 58792e4e51dd51773c8701b1ab4edbe700ccb810
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/cli-internals
---

# CLI の内部構造 {#cli-internals}

`hermes_cli/AGENTS.md`（ルールを定めた文書）と対になるページです。ここには長めの解説をまとめています。

## 更新パイプライン {#update-pipeline}

段階ごとの取り決め（`plan → snapshot → apply → restart-per-kind → verify → report`）と、各段階が
防いでいる現場の失敗は `hermes_cli/AGENTS.md` に書かれています。利用者から見た挙動
（レシート、`--plan`、スナップショットの各モード）は [更新する](/hermes/docs/getting-started/updating/) にあります。

systemd で力ずくの再起動に切り替えたときは、そのユニットの `TimeoutStopUSec` と
`TimeoutStartUSec` を足した時間に、クライアント側の余裕として 15 秒を加えた分だけ待ちます。
対象のユニットは再起動と同じマネージャーの範囲から読み取ります。最初の試行も再試行も
この持ち時間を使い、更新が中断されたあとの追いかけ再起動も同じです。
穏やかに処理を止めきったあとの起動では、起動側の持ち時間と余裕だけを使います。
値が無い、読み取れない、無限、のいずれかだった段階は 90 秒に読み替えるので、
無人で走る更新が終わらなくなることはありません。`systemctl` クライアント側が時間切れになっても、
マネージャー側の処理が取り消されるわけでは**ありません**。停止処理を複数のコマンドでつないでいる場合や
`EXTEND_TIMEOUT_USEC` を使っている場合は、この見積もりを超えることがあります。本当に時間切れになれば
再起動は未完了のままですし、コマンドが成功しても、これまでどおりサービスの健全性と
版の突き合わせによる確認は必要です。数値のままの `*USec` はマイクロ秒で、整形済みの値は
日・週・月・年を含む systemd の決まった単位で書かれます。合計の持ち時間には、符号付き 32 ビットの
ミリ秒で表せるポーリング上限を（丸めの余裕を見たうえで）下回る上限を設けてあるので、
極端に長いユニット側の設定でも子プロセスの待機があふれることはありません。0・不明・無限の段階は
先ほどの読み替えを使います。応答中の処理を止めきるときの設定は、これによって変わりません。

## プロセスの同定: argv の部分文字列から推測しない {#process-identity-never-infer-it-from-argv-substrings}

複数の端末をまとめて更新する場面で起きた 10 件ほどの不具合（#90778, #87594, #78089, #76129, #91964, ...）は、同じ種類のバグが原因でした。
`"serve" in cmdline` のような書き方でプロセスを分類していたのです。`kanban --preserve-cache` には
"serve" が含まれますし、フラグの値がサブコマンド名と一致することもあります（`-m dashboard serve`）。コマンドラインが途中で切られていて本当の
サブコマンドが見えないこともあります。そこで次のルールを守ってください。

- 決められた判定関数を使います。`gateway.status.looks_like_gateway_command_line`（ゲートウェイの実行かどうか）、
  `hermes_cli.update_cmd._hermes_holder_subcommand`（Hermes の argv からトップレベルのサブコマンドを取り出す）の 2 つです。
  自前でトークンを走査するコードを書かないでください。
- フラグの一覧はパーサーから導き出します（`_holder_value_flags()` が
  `build_top_level_parser()` を読み取ります）。手書きの一覧は必ずずれていくので使いません。
- プロセスの走査で祖先プロセスを一律に除外しないでください。`/update` がゲートウェイの子として動くとき、
  祖先にいるゲートウェイは一時停止の仕組みから見えている必要があります（#87594）。対話セッションの祖先だけを除外し、
  ゲートウェイらしい祖先は残します。
- 判定はコマンドラインの全文に対して行い、切り詰めるのは表示のときだけにします（#78089）。
- 新しい走査ルールを足す前に #92091 を読んでください。調整の主役はゲートウェイの制御ソケットに移っており、
  走査は古いプロセスやクラッシュしたプロセスを拾うための予備の層という位置づけです。

## スキンエンジン — スキンで変えられるもの {#skin-engine-what-skins-customize}

| 要素 | スキンのキー | 使っている場所 |
|---|---|---|
| バナーの枠線 / タイトル / 見出し / 淡色 / 本文 | `colors.banner_border`, `banner_title`, `banner_accent`, `banner_dim`, `banner_text` | `banner.py` |
| 応答ボックスの枠線 | `colors.response_border` | `cli.py` |
| スピナーの表情（待機中 / 思考中） | `spinner.waiting_faces`, `spinner.thinking_faces` | `display.py` |
| スピナーの動詞 / 羽（任意） | `spinner.thinking_verbs`, `spinner.wings` | `display.py` |
| ツール出力の接頭辞 / ツールごとの絵文字 | `tool_prefix`, `tool_emojis` | `display.py` → `get_tool_emoji()` |
| エージェント名 / 歓迎文 / 応答ラベル / プロンプト記号 | `branding.agent_name`, `welcome`, `response_label`, `prompt_symbol` | `banner.py`, `cli.py` |

同梱のスキン（`hermes_cli/skin_engine.py` の `_BUILTIN_SKINS`）は、`default`（定番の金色・かわいい系）、
`ares`（深紅と青銅色。スピナーの羽が独自）、`mono`（グレースケール）、`slate`（寒色の青）です。同梱スキンを増やすときは
`{"name", "description", "colors", "spinner", "branding", "tool_prefix"}` という辞書の要素として足します。
利用者が作るスキンは `~/.hermes/skins/<name>.yaml` に同じキーで置き、`/skin <name>` か
`display.skin: <name>` で切り替えます。YAML のひな形は
[スキンとテーマ](/hermes/docs/user-guide/features/skins/) のユーザーガイドにあります。

## プロファイル: 複数インスタンスの並行運用 {#profiles-multi-instance-support}

Hermes にはプロファイルという仕組みがあります。完全に切り離されたインスタンスで、それぞれが自分の `HERMES_HOME`（設定、API
キー、メモリ、セッション、スキル、ゲートウェイ）を持ちます。`hermes_cli/main.py` の `_apply_profile_override()` が
モジュールの読み込みより前に `HERMES_HOME` を設定するので、`get_hermes_home()` を参照する箇所はすべて有効なプロファイルを
指します。プロファイルの操作はホームディレクトリを基準にします（`_get_profiles_root()` が返すのは
`get_hermes_home() / "profiles"` ではなく `Path.home() / ".hermes" / "profiles"` です）。そのため
`hermes -p coder profile list` は、いまどのプロファイルが有効かに関係なくすべてのプロファイルを表示します。これは意図した動きです。
プロファイルを壊さないためのコーディング規約はリポジトリ直下の `AGENTS.md` に、多重化したときの秘密情報の扱いは
`gateway/AGENTS.md` にあります。
