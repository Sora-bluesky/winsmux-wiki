---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "CLI の内部構造"
description: "hermes_cli の成り立ち — スラッシュコマンドの振り分け、設定の読み込み、スキンエンジン、トランザクション方式の更新パイプライン、プロセス同定のルール"
upstream_path: developer-guide/cli-internals.md
upstream_blob: 510507aa2bf296c9000b7d27fa0fc308c7f9d601
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/cli-internals
---

# CLI の内部構造 {#cli-internals}

`hermes_cli/AGENTS.md`（ルールを定めた文書）と対になるページです。ここには長めの解説をまとめています。

## 更新パイプライン {#update-pipeline}

利用者から見た挙動（レシート、`--plan`、スナップショットの各モード）は
[更新する](/hermes/docs/getting-started/updating/) にあります。ルールの短い版は `hermes_cli/AGENTS.md` に書かれています。

もとになったのは、フリート全体の更新をめぐる取り組み #91277（2026 年 8 月）です。どこかの段階を弱める PR は、
その段階が防いでいる失敗の種類について説明する責任を負います。段階は `plan → snapshot → apply → restart-per-kind → verify → report` の順です。

- **Plan**（`update_inventory.py`、`hermes update --plan`）: 読み取りだけの棚卸しです。インストールの種類、
  すべてのプロファイル、動いているすべてのゲートウェイについて、そのスーパーバイザーと実行中のコードの版を調べます。デプロイの種類は
  正式に区別して扱います。`git` はその場で更新しますが、`docker`/`nix`/`apt` はその場で更新できる種類では**ありません**。
  そのため更新処理はデプロイの仕組みと争わず、代わりに実行すべき正しい外部コマンドを案内します。
- **Snapshot**（`backup.py`）: 更新の前に、**すべての**プロファイルについて手早いスナップショットを取ります（コードの入れ替えと
  フリート全体の再起動はすべてのプロファイルに影響するためです）。それぞれ自分の `state-snapshots/` に、同じファイル一式を、
  1 ファイルあたり 1 GiB を上限として、1 世代だけ保存します。**一部だけ・段階別のスナップショットを足さないでください**。対象がまちまちになると、
  スキーマの世代をまたいで中途半端に復元された状態が生まれます。手早いスナップショットは**ファイル消失からの復旧用**です（プロファイルごとの
  cron ジョブの安全網はここから復元します）。コードを巻き戻すための保険では**ありません**。巻き戻しは `--backup`
  のフルモードが受け持ちます。
- **Apply**: git pull を行います。Windows では ZIP によるフォールバックもありますが、これは git そのものが失敗したときに**だけ**
  発動します（`_should_zip_fallback_on_update_error` が argv から判定します。依存パッケージのインストール失敗で、ツリーを上書きする再ダウンロードが
  始まってはなりません）。作業ツリーが汚れているときは**拒否します**（`-uall` で調べ、入れ替え直前に TOCTOU 対策の再確認もします。ただし
  `!!` の行は、入れ替えによって消えてしまうかどうかで分類します。ZIP に含まれないルート項目の下にある無視対象のパス（`.bytecode-fingerprint`、`.hermes-bootstrap-complete`、
  `hermes_agent.egg-info/`。ダウンロード前は追跡中のルート項目を ZIP の中身の代わりに使い、再確認では実物を使います）、
  入れ子になった `__pycache__`/`node_modules`、`_ZIP_PRESERVED_NESTED` の
  出力物は通します。配布されるディレクトリの下にあるそれ以外の無視対象ファイルは、引き続き更新を止めます）。さらに、動いている入れ子の
  ビルド出力（`_ZIP_PRESERVED_NESTED`: `apps/desktop/{release,dist,node_modules,build}`、
  `hermes_cli/web_dist`、`ui-tui/{dist,node_modules,packages/hermes-ink/dist}`、`web/node_modules`、
  `scripts/whatsapp-bridge/node_modules`）を、ハードリンクで入れ替え用の準備領域へ移植します（GitHub のソース ZIP には
  これらが1つも含まれていないので、移植しないと入れ替えで消えてしまいます）。入れ替えのあと、デスクトップを
  再ビルドするかどうかの判断では HERMES_HOME の下にあるビルドの刻印も参考にします。そのため、以前の更新ですでに
  成果物を失っていたインストールも「忘れられる」ことなく再ビルドされます（#90495）。
- **Restart-per-kind**: systemd と launchd の再起動は、更新中のインストールの中で**フリート全体**に対して行います（ホームが更新中のルート、
  またはその `profiles/<name>` のどれかである、すべての `hermes-gateway*` ユニット / `ai.hermes.gateway*` LaunchAgent が対象です）。
  まず処理を止めきり（SIGUSR1）、ユニットやラベルごとに失敗を切り離します。更新を実行したプロファイルのサービスだけを
  再起動すると、ほかのプロファイルはクラッシュするまで古い `sys.modules` のまま動き続けます。このリポジトリの歴史で最大の重複 PR の
  かたまりは、このバグから生まれました。フリートの範囲は名前空間ではなくホームで決まります。
  `hermes_cli/update_fleet_scope.py` は、ユニット・ラベル・プロセスのそれぞれを、実際に動いているホーム
  （実行中の environ、ユニットの `Environment=`、plist の `HERMES_HOME`）で判定します。同じアカウントにある別の `HERMES_HOME` の
  ランタイム、たとえば隣にある別のインストールや、作業用のホームから見た本物の `hermes-gateway.service` は、名前を示したうえで
  手を付けず、再起動しません（#93349）。
- **Verify**: ゲートウェイは、実行状態を書き込むたびに `code_sha`/`code_version` を `gateway_state.json` へ刻みます
  （`gateway/status.py`）。更新処理は動いているゲートウェイを1つずつ
  取り出したばかりのコードと比べ、フリートの版の一覧表を表示します。確定点（ツリーが動いた時点）を過ぎたあとは、
  何が起きても `hermes update` は失敗になりません（コードを巻き戻した場合を除き exit 0）。古いままだと証明できるゲートウェイや
  止まっているゲートウェイ、ビルド・ランチャー・設定の移行・バイトコードの掃除・チャンネルの引き継ぎ・Windows での再開の失敗は、
  どれも `⚠` を表示し、レシートには `outcome: "success"` と `followups: [{step, reason}]` として残ります。
  それぞれの残り作業の印（後半の処理なら `source-completion-pending`、ゲートウェイならフリート再起動の印）は立ったままになるので、
  次の起動や次の `hermes update` が（「Already up to date」のときも含めて）やり直します。版が混在したフリートが
  健全に見えることを防いでいるのは、フリートの再起動が残っているときに CLI の起動時に出る警告です。完了処理のプロセスを
  起動できなかった場合（一時ディレクトリ、依頼ファイル、プロセスの生成）や、対応する結果を残さずに落ちた場合（OOM、SIGKILL）も
  同じ種類の残り作業として扱われます。`completion` の follow-up が残り、ソース更新の後半の処理の印が立て直され、exit 0 になります。
  exit 2（拒否・同時実行）と exit 1（何も確定していない・巻き戻した）の意味は変わりません。確定したあとで exit 1 になる唯一の例は、
  autostash の復元が衝突して退避したままになったときです。このときレシートは `partial` になり `user_action` が付きます。
  利用者にしか当て直せない変更は、ほかの何もやり直してくれないからです（#122557）。
- **Report**: 実行のたびに、機械で読める記録（レシート）を ROOT ホームの
  `logs/update_receipts/` に書き込みます（固定したプロファイルのホームには書きません。`update.log` も同じです）。`latest.json` が最新を指し、
  手順、理由**付き**のスキップ、再起動の結果、計画、フリートのスナップショット、`followups` を含みます。レシートは最初から
  `outcome: "running"` としてディスクにあり、段階の区切りごとに書き直されます。次の更新は、プロセスがもう残っていない `running` の記録を
  `interrupted` とし、そのことを表示します。読む側（`hermes logs update`、デバッグ用のまとめ、ダッシュボードの状態表示、pm のレシート）も ROOT ホームを使います。
  完了処理の立ち上げで依存関係の同期に失敗したときは `dependencies` の follow-up になり（A6）、
  確定点を過ぎてからの Ctrl-C は `interrupted`（exit 130）で締めくくられ、`failed` にはなりません。
  ソースを入れ替える前に、親プロセスが計画・スナップショット・レシートと、Windows の一時停止トークンを確保します。
  `update_completion.py` は、サイトの初期化を無効にした状態で新しいコードの PM の準備を行い、続いて
  選択した Python でのビルド、保守作業、走査と再起動、確認を行います。git・現行・ZIP のどの経路も
  この担当を共有します。古いインタープリターのまま続けるためにモジュールを再読み込みしたり消したりしないでください。親はロックを保持したまま待ち、
  対応付けの取れた最終結果だけを受け入れます。`cmd_update` は今でも、
  早い段階の失敗や、子プロセスが見つからない・強制終了された場合の後始末をします。PM が拒否したときの情報は引き継ぎのあとも失われません。
  `website/docs/developer-guide/source-update-completion.md` も参照してください。書き始めたのに書き終えていないレシートはバグです。
- **取り込んだコードを、取り込む前のインタープリターで動かすことはありません。** このツリーは更新の仕上げを
  `update_completion.run_completion` / `_update_takeover.py` で行います。
  `hermes_cli/update_handoff.py` と `hermes_cli/update_serve_obligations.py` は、
  チェックアウトの入れ替え後に**新しい**ツリーからこれらのモジュール名を遅延 import する
  リリースのための、**凍結された互換用の窓口**です。
  公開されている名前を import できる状態に保ち、挙動も変えないでください。これらは
  `_old_updater.stop_for_relaunch` → `_run_child` を呼び出します。名前を1つでも消すと、
  すべてのリリースが更新の途中で動かなくなります。`tests/compat/old_updater_surface.json` を参照してください。

更新処理、serve/ダッシュボード、ゲートウェイの間でプロセスを走査して調整する仕組みは、
ゲートウェイが持つ制御ソケットへ置き換えが進んでいます（#92091）。走査は古いプロセスやクラッシュしたプロセスのための予備の層です。
走査のルールを足す前に #92091 を読んでください。プロセス同定のルール（argv の部分文字列に頼らない、決められた
判定関数を使う、フラグの一覧はパーサーから導く、ゲートウェイの祖先を一律に除外しない、#87594）は、リポジトリ直下の
`AGENTS.md` と `website/docs/developer-guide/cli-internals.md` にあります。

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

## Nous のサインイン {#nous-sign-in}

Nous のサインインは、どれもふつうのデバイスコードによるログインです。サインインの仕上げは `settle_after_upgrade` という1つの関数が受け持ち、
完了1回につき1回呼ばれます。この関数は、ウェルカム用の経路にある設定を、
アカウントのホストと、その枠で推奨される既定のモデル（`models.recommended_nous_default_model`。
`GET /api/model/recommended-default` と共通）へ移します。

共通の流れ・状態・文言は `anon_sign_in.py` に、CLI での表示は
`anon_sign_in_cli.py` にあります。`anon_auth.py` は身元と仕上げを受け持ち、サインインの
API を再公開しています。流れの中で使う身元と保存の協力役は、呼び出した時点で `anon_auth` を通して解決します。
モジュール属性を monkeypatch で差し替えられる継ぎ目を残すためです。

サインインそのものは1つの組み立てでできています。`anon_auth.run_sign_in()` は `SignInState` を順に返します（`Code`、
`Waiting`、`Completed`、`Cancelled`、`TimedOut`、`Failed`、`AlreadySignedIn`）。デバイスコードを
要求し、1つの期限のなかでトークンのエンドポイントをポーリングし（コードの期限が切れたら `TimedOut`）、アカウントを保存して、
`settle_after_upgrade` をちょうど1回実行します。保存や仕上げの失敗を例外として外へ漏らすことはなく、
`Failed` に変えます。ディスクに無料枠があってもなくても動きます。`Completed.email` は
アクセストークンの `email` クレームから取ります。`Completed.handoff` はゲストの引き継ぎ結果の行（何が移ったか、何をつなぎ直すか）を持ち、
`Completed.handoff_status` は最新の記録をフィールドとして持ちます
（`guest_handoff.wire_status`: 公開用の見え方に、その `lines` を加えたもの）。結果を自分で表示する画面のためのものです。どの状態も自分の `.copy`（チャット用の文面。
生の例外、URL、`hermes` の動詞は含みません）と `.copy_terminal` を持っているので、呼び出し側が
理由を文字列に対応付けることはありません。`cancelled()` は、トークンのポーリング中は少なくとも1秒に1回、
保存の前にもう1回確認されます。キャンセルは必ず優先され、何も保存されません。TLS の検証は
`_resolve_verify` から来るので、`HERMES_CA_BUNDLE` などの設定が効きます。`scope` に入るのは
前提条件の確認と保存のブロックの間だけで、`yield` やネットワークの待機をまたぐことはありません。
`run_in_executor` は contextvars を引き継がないためです。`replace_account=True` を付けると、サインイン済みのインストールでも
もう一度サインインできます（デスクトップの「別のアカウントをつなぐ」）。付けなければ、サインイン済みのインストールには
ネットワークに出る前に `AlreadySignedIn` が返ります。`upgrade_guest`（`hermes auth upgrade`）、CLI と TUI の
`/login`、ゲートウェイの `/login`、デスクトップの開始経路は、これの上に載った表示役です。キャンセルの確認と保存を
不可分にしたい画面は `persist_guard` を渡します。`hermes model` と
`hermes auth add nous` は `_login_nous` を使い続けます（`--portal-url`、`--ca-bundle`、`--insecure`
と、共有ストアからの取り込みを持っているためです）。これも同じふつうのデバイスログインで、引き継ぎの結果も
同じように表示します。アカウントを保存するサインインはどれも（`run_sign_in`、`_login_nous`、`hermes auth add
nous`、課金のための追加認証、ツール設定でのログイン）、ロックを手放したあとで自分で
`settle_after_upgrade` を1回呼びます。引き継ぎの実行役が仕上げをすることはありません。

### サインイン後のゲストの引き継ぎ {#guest-handoff-after-a-sign-in}

どの書き込み役であっても、無料枠の身元の上に Nous のアカウントを保存すると、`hermes_cli/guest_handoff.py` が
その身元につないでいたアプリをアカウントへ引き渡します。アカウント自身の Bearer トークンを付けて
`POST /api/anonymous/claim {"token": "<anon_...>"}` を送ります。事前に利用者へ確認はせず、結果はあとから表示します
（`hermes auth status nous`。デスクトップはサインインのポーリングの `handoff_status` から読み取り、移動がまだ再試行中のあいだは
`GET /api/providers/oauth/nous/handoff?since=&wait=` のロングポーリングからも読み取ります。こちらは
記録の `updated_at` が変わった時点で応答します）。仕組みは2つに分かれています。

- `note_replacement` は、もっとも低い2つの書き込みの継ぎ目（`auth._store_provider_state` と
  `auth_nous._write_shared_nous_state`）で、呼び出し元の認証ストアのロックを持ったまま動き、保留中の記録を書くだけです。
  記録は共有の Nous ストアの隣にある `guest_handoff.json` に置かれ、
  `anon_` 認証情報のハッシュをキーにします。そのため、1つの無料枠の身元を共有するプロファイルは、記録も引き取りの要求も1つを共有します。
- 共有ストアがどの身元を持つかを変えるのは、サインインだけです。`_write_shared_nous_state` の
  呼び出し元はどれも `renewal` を宣言します。トークンの更新（`renewal=True`）がそこで別の身元を置き換えることはありません
  （身元とは、ゲストなら `anon_` 認証情報、アカウントなら JWT の `sub` です）。そのため、あるプロファイルの
  アカウントを更新しても、別のプロファイルが作ったゲストが置き換わることはありません。その更新結果は、保持している
  身元の隣に `renewal` として置かれ、同じアカウントのほかのプロファイルは、次に使う1回限りの
  更新トークンをそこから読みます。
- `drain` は、このプロファイルの期限が来た記録それぞれに1回ずつ試行し、それぞれの結果を返します。リクエストを
  送るので、認証ストアのロックの外でだけ動きます。どのサインインの画面も保存の直後にこれを呼び
  （`run_sign_in` は `persist_guard` を手放したあと）、無料枠の整合処理、
  `hermes auth status`、`hermes auth upgrade` も呼びます。移すのはアプリだけで、設定の仕上げ
  （`settle_after_upgrade`）はアカウントを保存したサインインの側に残ります。
- 一時的なエラーで再試行中になった移動は、長く動き続ける Nous のプロセスがどれも起動する再試行の
  ワーカーが仕上げます（ゲストかどうかに関係なく `start_nous_auth_keepalive` が起動します）。各回で、
  そのプロセス自身のプロファイルを処理します。
- 試行の回数を数えることと、記録を借り受けること（約 30 秒は期限が来ない扱いにする）は、リクエストを送り出す前に
  ロックを取った1回の書き込みで行います。そのため、応答が失われても回数は数えられ、2つの実行が同じ記録を送ることもありません。

応答の扱いは次のとおりです。`claimed` は何が移ったかを記録します（アカウントのトークンを更新するのは
`cohort_carried` のときだけです。`connectors` を含まない応答は「何も移らなかった」ではなく、不明として読みます）。
`unknown_token` は Gone として扱い、以前に試行していれば「たぶん移った」と読みます（成功の応答が失われた場合です）。
`already_retired` も Gone です。最終とするのは、あとの試行で変わりようのないコードだけです
（`client_not_allowed`、`account_locked`、`invalid_request`）。それ以外の応答（401 や未知の
コードを含む）と通信の失敗はすべて、1分後、10分後、1時間後、6時間後に再試行し
（Retry-After があれば従います）、それでもだめなら記録は Failed になります。Claimed の記録が開き直されることはなく、利用者向けの文面に
サーバーのコードが出ることもありません。アプリのスラッグは表示名で示します（`tools.tool_labels.app_title`）。

## プロセスの同定: argv の部分文字列から推測しない {#process-identity-never-infer-it-from-argv-substrings}

フリートの更新で起きた 10 件ほどの不具合（#90778, #87594, #78089, #76129, #91964, ...）は、同じ種類のバグが原因でした。
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
`display.skin: <name>` で切り替えます。YAML のひな形の全文は
[スキンとテーマ](/hermes/docs/user-guide/features/skins/) のユーザーガイドにあります。

## プロファイル: 複数インスタンスの並行運用 {#profiles-multi-instance-support}

Hermes にはプロファイルという仕組みがあります。完全に切り離されたインスタンスで、それぞれが自分の `HERMES_HOME`（設定、API
キー、メモリ、セッション、スキル、ゲートウェイ）を持ちます。1 つのプロファイルに対するコマンド（`hermes -p x <cmd>`）では、
`hermes_cli/main.py` の `_apply_profile_override()` がモジュールの読み込みより前に `HERMES_HOME` を設定するので、
`get_hermes_home()` を参照する箇所はすべて有効なプロファイルを指します。一方、多重化したゲートウェイと、デスクトップやダッシュボードの
`serve` バックエンドは、1 つのプロセスで複数のプロファイルを扱います。この場合、有効なプロファイルは処理の単位ごとに結び付けた
contextvar による上書きで決まり、`os.environ["HERMES_HOME"]` は起動したプロファイルのままです。ホームから導いたモジュールレベルの定数も、
起動したプロファイルの値で固定されます（[ゲートウェイの内部構造 § 多重化したプロファイル](/hermes/docs/developer-guide/gateway-internals/#multiplexed-profiles) を参照してください）。
プロファイルの操作はホームディレクトリを基準にします（`_get_profiles_root()` が返すのは
`get_hermes_home() / "profiles"` ではなく `Path.home() / ".hermes" / "profiles"` です）。そのため
`hermes -p coder profile list` は、いまどのプロファイルが有効かに関係なくすべてのプロファイルを表示します。これは意図した動きです。
プロファイルを壊さないためのコーディング規約はリポジトリ直下の `AGENTS.md` に、多重化したときの秘密情報の扱いは
`gateway/AGENTS.md` にあります。
