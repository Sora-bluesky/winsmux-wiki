---
title: "Web ダッシュボード"
description: "設定、API キー、MCP サーバー、メッセージングのペアリング、Webhook、ゲートウェイ、メモリ、認証情報、セッション、ログ、分析、cron ジョブ、スキルをブラウザーから管理する画面"
upstream_path: user-guide/features/web-dashboard.md
upstream_blob: 50a11f2c287514872f7820f2e66e5bba8d4619e9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard
---

# Web ダッシュボード {#web-dashboard}

Web ダッシュボードは、Hermes Agent のインストール環境をブラウザーから管理する画面です。YAML ファイルを直接編集したり CLI コマンドを打ったりしなくても、設定の変更、API キーの管理、セッションの監視を、すっきりした Web 画面から行えます。

:::tip
ホスト型モードの認証には Nous Portal の OAuth を使います。ダッシュボードから実際のバックエンドにも接続したい場合は、`hermes setup --portal` を実行するとモデルとツールのゲートウェイまでまとめて設定されます。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## クイックスタート {#quick-start}

```bash
hermes dashboard
```

このコマンドでローカルの Web サーバーが立ち上がり、ブラウザーで `http://127.0.0.1:9119` が開きます。ダッシュボードは完全に手元のマシン上で動くので、データが localhost の外に出ることはありません。

### オプション {#options}

| フラグ | 既定値 | 説明 |
|------|---------|-------------|
| `--port` | `9119` | Web サーバーを動かすポート |
| `--host` | `127.0.0.1` | バインドするアドレス |
| `--no-open` | — | ブラウザーを自動で開かない |
| `--insecure` | オフ | **非推奨・何もしません。** 以前はループバック以外へのバインド時に認証を迂回していましたが、現在は認証を無効化しません。ループバック以外にバインドする場合は必ず認証プロバイダー（パスワードまたは OAuth）が必要です |
| `--isolated` | オフ | 名前付きプロファイルから起動したとき（`worker dashboard`）、マシン共通のダッシュボードに転送せず、そのプロファイル専用のサーバーを起動します |

```bash
# Custom port
hermes dashboard --port 8080

# Bind to all interfaces (use with caution on shared networks)
hermes dashboard --host 0.0.0.0

# Start without opening browser
hermes dashboard --no-open
```

## 複数のプロファイルを扱う {#managing-multiple-profiles}

ダッシュボードは**マシン単位**の管理画面です。1 つのサーバーが、そのマシン上の
[プロファイル](/hermes/docs/user-guide/profiles/)すべてを管理します。サイドバーのプロファイル切り替え
（プロファイルが 2 つ以上あるときに表示されます）が、管理ページの読み書き対象を
決めます。Config、API Keys、Skills、MCP、Models、Chat タブはすべてこの選択に
従います。ダッシュボード自身のプロファイル以外を選んでいる間は、琥珀色のバナーが
管理中のプロファイル名を表示するので、どこに書き込むのかが曖昧になりません。

選択内容は URL（`?profile=<name>`）に保持されるため、
`http://127.0.0.1:9119/skills?profile=worker` のようなディープリンクを開くと
切り替えが選択済みの状態で表示され、再読み込みしても維持されます。

プロファイルのエイリアスからダッシュボードを起動すると、2 つ目のサーバーを立ち上げる
代わりにマシン共通のダッシュボードへ転送されます。

```bash
worker dashboard
# → already running: opens the browser at ?profile=worker
# → not running:     starts the machine dashboard with "worker" preselected
```

この動作をやめて、そのプロファイル専用のサーバーを動かしたい場合は `--isolated` を
渡します（統合前の挙動です。プロファイルごとに別々の認証でダッシュボードを公開したい
ときに役立ちます）。

**Chat** タブも切り替えに従います。プロファイルを絞ったチャットは、選択中の
プロファイルの `HERMES_HOME` を使って PTY の子プロセスを起動するので、会話は
そのプロファイルのモデル、スキル、メモリ、セッション履歴で動きます。プロファイルを
切り替えると、ターミナルのセッションは新しく開始されます。

切り替えの対象外で、プロファイルごとに残るものもあります。ゲートウェイの
プロセス（`hermes -p <name> gateway …` で管理します）、各プロファイルの
セッションデータベース、そして cron のスケジューラー（Cron ページには独自の
フィルターがあり、すでにプロファイルをまたいで集約表示します）です。

## 事前に必要なもの {#prerequisites}

既定の `hermes-agent` インストールには、HTTP まわりの一式と PTY ヘルパーは含まれません。どちらも追加インストール扱いです。**Web ダッシュボード**には FastAPI と Uvicorn（`web` の追加分）が必要です。**Chat** タブはさらに、埋め込みの TUI を擬似ターミナル越しに起動するため `ptyprocess`（POSIX では `pty` の追加分）が必要です。両方まとめて入れるには次を実行します。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"
```

`web` の追加分は FastAPI と Uvicorn を、`pty` の追加分は `ptyprocess`（POSIX）または `pywinpty`（Windows ネイティブ。ただし埋め込みの TUI 自体は依然として WSL が必要です）を入れます。`cd ~/.hermes/hermes-agent && uv pip install -e ".[all]"` は両方を含むので、メッセージングや音声なども併せて使いたいなら、こちらが一番手軽です。

依存関係が入っていない状態で `hermes dashboard` を実行すると、何をインストールすればよいか表示されます。フロントエンドがまだビルドされておらず `npm` が使える場合は、初回起動時に自動でビルドされます。

Chat タブは `hermes dashboard` を起動すれば常に含まれます。ブラウザーに埋め込まれたチャット画面（PTY と WebSocket 越しに TUI を動かすもの）は、追加のフラグなしでいつでも使えます。

## ページ {#pages}

### Status {#status}

最初に表示されるページには、インストール環境の状況がリアルタイムで並びます。

- **エージェントのバージョン**とリリース日
- **ゲートウェイの状態** — 稼働中か停止中か、PID、接続中のプラットフォームとその状態
- **アクティブなセッション** — 直近 5 分間に動いていたセッションの数
- **最近のセッション** — 直近 20 件のセッション一覧。モデル、メッセージ数、トークン使用量、会話のプレビュー付き

Status ページは 5 秒ごとに自動更新されます。

#### リソース逼迫のバナー {#resource-pressure-banner}

ホストのメモリやディスクが少なくなると、ダッシュボードの上部にバナーが出ます
（Status の定期取得と同じデータを使うので、リクエストは増えません）。

- **「Your agent is almost out of memory and may restart」** — 利用可能な
  システムメモリが *elevated*（128 MiB 未満または 15% 未満）または *critical*
  （64 MiB 未満または 5% 未満）まで落ちたときに出ます。判定はゲートウェイが
  30 秒ごとに送るハートビートの値によります。
- **「Your agent restarted unexpectedly, most likely because it ran out of
  memory」** — 前回の起動時に、メモリ逼迫下での異常終了がライフサイクルの記録に
  残っている場合に出ます（OOM による強制終了の疑い）。
- **ディスクの警告** — `~/.hermes` があるボリュームの空きが少ないときに出ます
  （*elevated* は空き 512 MB 未満、*critical* は空き 256 MB 未満）。

同時に出るのは、そのときいちばん深刻な警告 1 つだけです（ディスク critical ＞
メモリ critical ＞ OOM による再起動 ＞ ディスク elevated ＞ メモリ elevated）。
非表示にした状態は現在のゲートウェイの起動中だけ保持されます。1 つ閉じると次の
警告が出て、ゲートウェイの再起動や深刻度の上昇（elevated → critical）で再び
表示されます。ハートビートが古い場合は、誤った警告を出す代わりに何も表示しません。

### Chat {#chat}

**Chat** タブは、Hermes の TUI そのもの（`hermes --tui` で起動するのと同じ画面）をブラウザーに埋め込みます。スラッシュコマンド、モデル選択、ツール呼び出しのカード、Markdown のストリーミング表示、clarify や sudo や承認のプロンプト、スキンのテーマ設定など、ターミナルの TUI でできることはここでもそのまま動きます。ダッシュボードが本物の TUI を動かし、その ANSI 出力を [xterm.js](https://xtermjs.org/) の WebGL レンダラーで描画しているので、文字セルの配置までぴったり一致します。

**仕組み:**

- `/api/pty` が、ダッシュボードのセッショントークンで認証された WebSocket を開きます
- サーバーは POSIX の擬似ターミナル越しに `hermes --tui` を起動します
- キー入力は PTY へ送られ、ANSI の出力がブラウザーへ戻ってきます
- xterm.js の WebGL レンダラーが各セルを整数ピクセルのグリッドに描画します。マウス追跡（SGR 1006）、全角文字（Unicode 11）、罫線素片もすべてそのまま表示されます
- ブラウザーのウィンドウをリサイズすると、`@xterm/addon-fit` アドオン経由で TUI の表示サイズも追従します

**既存のセッションを再開する:** **Sessions** タブで、任意のセッションの横にある再生アイコン（▶）をクリックします。`/chat?resume=<id>` に移動して `--resume` 付きで TUI が起動し、履歴がすべて読み込まれます。

**セッション切り替え（右側の縦帯）:** Chat タブには、ターミナルの横に細い縦帯があり、ChatGPT のような会話一覧が並びます。ページを離れずに会話を切り替えられます。縦帯は上にモデル選択、その直下にセッション一覧という構成で、画面の大部分はターミナルが占めます。一覧には、選択中のプロファイルの直近のセッションが表示されます。タイトル（無ければメッセージのプレビュー）、最後に使ってからの経過時間、メッセージ数、そして CLI 以外のセッションでは発生元のチャンネルが並びます。行をクリックするとその場で再開でき（ターミナルがその会話の履歴を読み込み直して起動します）、選択中のセッションは強調表示されます。**New chat** で新しいセッションを始められ、更新ボタンで一覧を取得し直せます。この縦帯は切り替え専用の読み取り表示で、削除、名前の変更、書き出し、まとめて整理は今までどおり **Sessions** タブにあります。画面幅が狭いときは、スライドして開くパネルに畳まれます。

**事前に必要なもの:**

- Node.js（`hermes --tui` と同じ要件です。TUI 用の一式は初回起動時にビルドされます）
- `ptyprocess` — `pty` の追加分で入ります（`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`、または `[all]` で両方まかなえます）
- POSIX のカーネル（Linux、macOS、WSL2）。`/chat` のターミナル画面だけは POSIX の PTY を必要とします。Windows ネイティブの Python には相当する仕組みがないため、Windows ネイティブのインストール環境では、ダッシュボードの他の機能（セッション、ジョブ、メトリクス、設定エディター）は動きますが、`/chat` タブにはこの機能には WSL2 を使うよう案内するバナーが出ます。

ブラウザーのタブを閉じると、サーバー側の PTY はきれいに後始末されます。開き直すと新しいセッションが起動します。

自前のバックエンドではなく、別のマシンで動いているダッシュボードに [Hermes Desktop](#connecting-hermes-desktop-to-a-remote-backend) を接続したい場合は、後述のリモートバックエンドの節を参照してください。

### Hermes Desktop を離れたバックエンドにつなぐ {#connecting-hermes-desktop-to-a-remote-backend}

Hermes Desktop は通常、自分でローカルのバックエンドを起動しますが、別のマシン（VM や自宅サーバーなど）で動いているダッシュボードに **Settings → Gateways → Remote gateway** から接続することもできます。「Desktop はバックエンドの準備ができたと言うのに、チャットがまったく動かない」という報告の多くはこの構成で起きます。Desktop の準備完了チェックが、実際のチャット接続に必要な条件よりも緩いからです。

:::info 前提: 離れたホストで `hermes dashboard` が動いていること
Desktop がつなぐ「リモートバックエンド」の正体**そのもの**が、離れたマシンで動いている `hermes dashboard` のプロセス、つまりこのページで説明しているサーバーです。これが起動していて到達できる状態でなければ、以下の手順はどれも意味を持ちません。Desktop はそこに接続するだけで、代わりに起動してはくれません。ログアウトや再起動をまたいで動き続けるよう、`systemd` や `tmux` などの下で常駐させてください。**ゲートウェイ**（Telegram、Discord、Slack など）はこれとは*別の*常駐プロセスです。メッセージングのチャンネルを使うなら個別に起動してください。デスクトップアプリが接続する相手ではありません。
:::

Desktop の「リモートバックエンドの準備ができた」という判定は `GET /api/status` を叩くだけです。これは認証不要の公開エンドポイントなので、そのホストで*何らかの*ダッシュボードが動いてさえいれば応答が返ります。一方、実際のチャット接続は `/api/ws`（および `/api/pty`）への**別の** WebSocket で、こちらは状態確認では触れない次の 2 つの条件で守られています。

1. **認証を通っている必要があります。** ループバック以外のアドレスにバインドされたダッシュボードは認証のゲートを有効にします。ユーザー名とパスワードで保護してください（同梱の[ユーザー名とパスワードのプロバイダー](#usernamepassword-provider-no-oauth-idp)）。Desktop は一度サインインすれば、そのセッションを使い捨てのチケット経由で WebSocket にも使い回します。プロバイダーを設定していないと、ループバック以外にバインドされたダッシュボードは**起動時点で拒否**されます。
2. **バインド先がそのクライアントを許可し、Host ヘッダーと一致している必要があります。** ループバックへのバインド（`127.0.0.1`）はループバックのクライアントしか受け付けないので、資格情報が正しくても離れたマシンはソケットの段階で弾かれます。ループバック以外のアドレス（`--host 0.0.0.0`）にバインドして、接続元 IP の検査を通るようにしてください。また Desktop に入力するリモートの URL は、バインドしたホスト名と同じ名前でダッシュボードに届く必要があります。DNS リバインディング対策として Host ヘッダーの一致が求められるためです。

#### 離れたホストでのダッシュボード設定 {#remote-dashboard-setup}

ユーザー名とパスワードを設定し、到達できるアドレスにバインドしてダッシュボードを起動します。`systemd` のサービスにする場合は次のようにします。

```ini
[Service]
EnvironmentFile=%h/.hermes/.env
ExecStart=/path/to/venv/bin/python -m hermes_cli.main dashboard \
    --host 0.0.0.0 --port 9119 --no-open
```

そして `~/.hermes/.env` には次を書きます。

```bash
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=choose-a-strong-password
HERMES_DASHBOARD_BASIC_AUTH_SECRET=<32+ random bytes; openssl rand -base64 32>
```

あとは Desktop で **Remote URL**（例: `http://VM_IP:9119`）を入力し、そのユーザー名とパスワードで **Sign in** します。設定できる項目の全体は[ユーザー名とパスワードのプロバイダー](#usernamepassword-provider-no-oauth-idp)の節を参照してください。

:::tip Desktop を試し直す前にゲートが有効か確かめる
どのマシンからでも、ダッシュボードがユーザー名とパスワードのプロバイダーを提示しているか確認できます。

```bash
curl -s http://VM_IP:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["basic"]
```

- `auth_required: true` で、プロバイダー一覧に `"basic"` がある → Desktop の **Sign in** は正しく動きます。
- `auth_required: false` → バインド先がループバックか、ゲートが有効になっていません。ループバック以外のアドレスにバインドしてください。
- `auth_required: true` なのに `"basic"` プロバイダーが無い → ユーザー名とパスワードの環境変数が読み込まれていません。まずそこを直してください。
:::

`/api/status` でゲートが有効かつ `"basic"` プロバイダーありと出ているのに、サインイン後もなお Desktop がつながらない場合は、基本設定より先の段階に原因があります。`desktop.log` を取り直し（Settings → Gateways → Open logs）、同じ時間帯のダッシュボード側のログと突き合わせて、`/api/ws` のクローズコードを探してください（4403 = リクエストの検査でチャットの WebSocket が拒否された、たとえば Host や接続元の不一致。4401 = WebSocket のチケットが認証されなかった）。

### Config {#config}

`config.yaml` をフォームで編集するページです。150 以上ある設定項目はすべて `DEFAULT_CONFIG` から自動的に読み取られ、タブ分けされたカテゴリーに整理されます。

![Config の管理ページ — 左にセクションの絞り込み、右に自動抽出された項目](https://hermes-agent.nousresearch.com/img/dashboard/admin-config.png)

- **model** — 既定のモデル、プロバイダー、ベース URL、推論の設定
- **terminal** — バックエンド（local/docker/ssh/modal）、タイムアウト、シェルの設定
- **display** — スキン、ツールの進捗表示、再開時の表示、スピナーの設定
- **agent** — 最大反復回数、ゲートウェイのタイムアウト、サービスティア
- **delegation** — サブエージェントの上限、推論の強度
- **memory** — プロバイダーの選択、コンテキスト注入の設定
- **approvals** — 危険なコマンドの承認モード（smart/manual/off）
- ほかにも — config.yaml のすべてのセクションに対応するフォームがあります

有効な値が決まっている項目（ターミナルのバックエンド、スキン、承認モードなど）はドロップダウンで表示されます。真偽値はトグル、それ以外はテキスト入力になります。

**操作:**

- **Save** — 変更をその場で `config.yaml` に書き込みます
- **Reset to defaults** — すべての項目を既定値に戻します（Save を押すまで保存はされません）
- **Export** — 現在の設定を JSON でダウンロードします
- **Import** — JSON の設定ファイルをアップロードして、現在の値を置き換えます

:::tip
設定の変更は、次のエージェントのセッションかゲートウェイの再起動から反映されます。Web ダッシュボードが編集するのは、`hermes config set` やゲートウェイが読むのと同じ `config.yaml` です。
:::

### API Keys {#api-keys}

API キーや認証情報を保存する `.env` ファイルを管理します。キーはカテゴリー別にまとまっています。

- **LLM Providers** — OpenRouter、Anthropic、OpenAI、DeepSeek など
- **Tool API Keys** — Browserbase、Firecrawl、Tavily、ElevenLabs など
- **Messaging Platforms** — Telegram、Discord、Slack のボットトークンなど
- **Agent Settings** — `API_SERVER_ENABLED` のような、秘密ではない環境変数

各キーには次が表示されます。

- 現在設定されているかどうか（値は伏せ字のプレビュー付き）
- 何に使うキーかの説明
- そのプロバイダーの登録・キー発行ページへのリンク
- 値を設定・更新する入力欄
- 値を削除するボタン

高度な設定やめったに使わないキーは、トグルの裏に隠れています。

### Sessions {#sessions}

エージェントのセッションをすべて一覧して中身を確認できます。各行には、セッションのタイトル、発生元のアイコン（CLI、Telegram、Discord、Slack、cron）、モデル名、メッセージ数、ツール呼び出しの回数、最後に動いてからの経過時間が並びます。稼働中のセッションには点滅するバッジが付きます。

- **絞り込み** — **Chats / Automation / All** のタブで一覧の範囲を変えます。*Chats*（既定）は人間との会話を表示し、自動化まわりのノイズ（cron、ツール、API、ACP のセッション）を隠します。*Automation* はそれらだけを、*All* はすべてを表示します。さらに発生元のドロップダウンで 1 つのチャンネル（Telegram だけ、など）に絞り込めます。検索も現在の絞り込みに従います。
- **検索** — FTS5 を使って、すべてのメッセージ本文を全文検索します。結果には該当箇所が強調されたスニペットが出て、展開すると最初に一致したメッセージまで自動でスクロールします。
- **統計** — 上部のバーに、セッションの総数、保存済みで有効なもの、アーカイブ済みの数、メッセージ総数、発生元ごとの内訳が出ます。
- **展開** — セッションをクリックすると全メッセージ履歴を読み込みます。メッセージは役割（user、assistant、system、tool）ごとに色分けされ、Markdown として構文強調付きで表示されます。
- **ツール呼び出し** — ツールを呼んだアシスタントのメッセージには、関数名と JSON の引数が入った折りたたみブロックが付きます。
- **名前の変更** — セッションのタイトルをその場で設定・削除できます（鉛筆アイコン）。
- **書き出し** — セッション（メタデータと全メッセージ履歴）を JSON でダウンロードします（ダウンロードアイコン）。
- **整理** — ヘッダーの「Prune old sessions」ボタンで、終了してから N 日以上経ったセッションを削除します。
- **削除** — ゴミ箱アイコンで、セッションとそのメッセージ履歴を消します。

![Sessions の管理ページ — 統計バー、整理、行ごとの名前変更・書き出し・削除](https://hermes-agent.nousresearch.com/img/dashboard/admin-sessions.png)

### Logs {#logs}

エージェント、ゲートウェイ、エラーの各ログファイルを、絞り込みとリアルタイム追尾つきで表示します。

- **File** — `agent`、`errors`、`gateway` のログファイルを切り替えます
- **Level** — ログレベルで絞り込みます: ALL、DEBUG、INFO、WARNING、ERROR
- **Component** — 発生元のコンポーネントで絞り込みます: all、gateway、agent、tools、cli、cron
- **Lines** — 表示する行数を選びます（50、100、200、500）
- **Auto-refresh** — 5 秒ごとに新しい行を取得する追尾表示を切り替えます
- **色分け** — ログ行は深刻度で色が付きます（エラーは赤、警告は黄、デバッグは薄い色）

### Analytics {#analytics}

セッション履歴から計算した、使用量とコストの分析です。期間（7 日、30 日、90 日）を選ぶと次が見られます。

- **サマリーカード** — 総トークン数（入力・出力）、キャッシュヒット率、推定または実際の総コスト、総セッション数と 1 日あたりの平均
- **日次トークングラフ** — 1 日ごとの入力・出力トークンを積み上げた棒グラフ。ホバーすると内訳とコストが出ます
- **日次の内訳表** — 日付、セッション数、入力トークン、出力トークン、キャッシュヒット率、その日のコスト
- **モデル別の内訳** — 使ったモデルごとに、セッション数、トークン使用量、推定コストを並べた表

### Cron {#cron}

決まった間隔でエージェントへのプロンプトを実行する cron ジョブを作成・管理します。

- **作成** — 名前（省略可）、プロンプト、cron 式（例: `0 9 * * *`）、送り先（ローカル、Telegram、Discord、Slack、メール）を入力します
- **ジョブ一覧** — 各ジョブに、名前、プロンプトのプレビュー、スケジュール式、状態のバッジ（enabled/paused/error）、送り先、前回の実行時刻、次回の実行時刻が並びます
- **一時停止・再開** — ジョブの有効・一時停止を切り替えます
- **編集** — 内容が入力済みのモーダルを開いて、プロンプト、スケジュール、名前、送り先を変更します
- **今すぐ実行** — スケジュールとは関係なく、その場でジョブを実行します
- **削除** — cron ジョブを完全に削除します

### Profiles {#profiles}

[プロファイル](/hermes/docs/user-guide/profiles/)を作成・管理します。プロファイルは、独自の設定、スキル、セッションを持つ、互いに分離された Hermes の実行環境です。

- **プロファイルのカード** — モデルとプロバイダー、スキル数、ゲートウェイの状態、説明、バッジ（active、default、alias）が並びます
- **作成** — 名前に加えて、既定からの複製・すべて複製・同梱スキルなし（いずれも省略可）、説明、モデルを指定します。専用の Profile Builder ページ（`/profiles/new`）では、モデル・MCP・スキルまで含めた一連の流れをたどれます
- **スキルとツールの管理** — そのプロファイルに絞った Skills ページへ移動します（サイドバーのプロファイル切り替えも変わります）
- **Set as active** — **これから実行する CLI やゲートウェイ**が使う既定を切り替えます（`hermes profile use` と同じです）。ダッシュボードが管理する対象は*変わりません*。そちらはプロファイル切り替えの役目です
- **モデル・説明・SOUL の編集** — その場で編集して、そのプロファイルに書き込みます
- **名前の変更・削除** — 名前付きプロファイルのみ対象です

### Skills {#skills}

インストール済みのスキルとツールセットを一覧・検索し、有効・無効を切り替えられます。ハブから新しいスキルを入れることもできます。スキルは `~/.hermes/skills/` から読み込まれ、カテゴリー別にまとまります。

- **検索** — インストール済みのスキルとツールセットを、名前、説明、カテゴリーで絞り込みます
- **カテゴリーの絞り込み** — カテゴリーのタグをクリックして一覧を絞ります（MLOps、MCP、Red Teaming、AI など）
- **切り替え** — スイッチで個々のスキルを有効・無効にします。変更は次のセッションから反映されます。
- **ツールセット** — 別の表示で、組み込みのツールセット（ファイル操作、Web ブラウジングなど）を、有効かどうか、設定に必要なもの、含まれるツールの一覧とともに確認できます
- **ハブを見る** — 3 つ目の表示では、すべての提供元をまたいでスキルのハブを検索し（`hermes skills search` と同じです）、識別子を指定して結果をインストールしながらログをリアルタイムで確認できます。インストール済みのスキルをまとめて更新する「Update all」ボタンもあります。

![Skills の管理ページ — ハブの表示: 検索、インストール、更新](https://hermes-agent.nousresearch.com/img/dashboard/admin-skills-hub.png)

### MCP {#mcp}

[MCP](/hermes/docs/user-guide/features/mcp/) サーバーを CLI なしで管理します。`hermes mcp` が読むのと同じ
`config.yaml` の `mcp_servers` ブロックを扱います。

**登録済みの MCP サーバー:**

- **追加** — HTTP/SSE のサーバー（URL）または stdio のサーバー（コマンドと引数）を登録します。stdio のサーバーには `KEY=VALUE` 形式の環境変数も付けられます
- **有効・無効** — 削除せずにサーバーのオン・オフを切り替えます。無効にしたサーバーも設定には残るので、あとから戻せます。反映はゲートウェイの次回再起動からです。
- **テスト** — サーバーに接続してツール一覧を取得し、切断します。エージェントが頼る前に接続を確かめられます
- **削除** — 設定からサーバーを取り除きます
- 秘密らしき環境変数の値は、一覧では伏せ字になります

**カタログ:** Nous が確認済みの MCP サーバー（同梱の `optional-mcps/`
カタログ）を眺めて、どれでもワンクリックで導入できます。API キーが必要な項目は
その場で入力を求められ、値は `.env` に書き込まれます。`hermes mcp catalog` /
`hermes mcp install` が使うのと同じカタログです。

![MCP の管理ページ — 登録済みサーバーの有効・無効の切り替えと、導入カタログ](https://hermes-agent.nousresearch.com/img/dashboard/admin-mcp.png)

### Webhooks {#webhooks}

動的な [Webhook の購読](/hermes/docs/user-guide/messaging/webhooks/)を管理します。先にメッセージングの
設定で webhook のプラットフォームを有効にしておく必要があり、無効な間はページに
その案内が出ます。

- **作成** — 名前、説明、イベントの絞り込み、送り先、直接配信モード（省略可）、エージェントへのプロンプトを指定します。作成すると、経路の URL と一度だけ表示される HMAC のシークレットがページに出るので、控えておきます。
- **有効・無効** — 購読のオン・オフを切り替えます。無効にした経路も購読ファイルには残りますが、ゲートウェイは届いたイベントを拒否します（403）。ゲートウェイはこのファイルを自動で読み直すので、次のイベントから反映されます。再起動は不要です。
- **一覧** — 各購読について、URL、イベント、送り先が表示されます
- **削除** — 購読を取り除きます

![Webhooks の管理ページ — 有効・無効の切り替えつきの購読一覧](https://hermes-agent.nousresearch.com/img/dashboard/admin-webhooks.png)

### Pairing {#pairing}

メッセージングの利用者を CLI なしで承認・取り消しできます。離れた場所にいる管理者が、
ペアリング済みのゲートウェイに Telegram や Discord などの利用者を登録するための画面です。
`hermes pairing` と同じことがひととおりできます。

- **承認待ちの申請** — プラットフォーム、コード、利用者、経過時間が並び、Approve ボタンが付きます
- **承認済みの利用者** — プラットフォームと利用者が並び、Revoke ボタンが付きます
- **承認待ちを消す** — 未処理のペアリングコードをすべて破棄します

![Pairing の管理ページ](https://hermes-agent.nousresearch.com/img/dashboard/admin-pairing.png)

### Channels {#channels}

Hermes をあらゆるメッセージングのプラットフォームにブラウザーから接続できます。
`hermes setup gateway` と同じことがひととおりできます。このページには対応する
チャンネル（Telegram、Discord、Slack、Matrix、Mattermost、WhatsApp、Signal、
BlueBubbles/iMessage、メール、SMS/Twilio、DingTalk、Feishu/Lark、WeCom、WeChat、
QQ Bot、Yuanbao、さらに API サーバーと webhook のエンドポイント）が、現在の接続状態
とともにすべて並びます。

- **設定** — チャンネルごとに、そのチャンネルに必要な項目だけが並ぶフォームを開きます（ボットトークン、アプリトークン、サーバー URL、許可リストなど）。秘密の項目はパスワード入力になり、伏せ字で保存されます。空欄のままにすると既存の値が保たれます。必須項目には印が付き、入力内容が検証されます。「Setup guide」のリンクから、そのプラットフォームの資格情報に関する説明へ移動できます。
- **有効・無効** — チャンネルのオン・オフを切り替えます。資格情報はディスクに残ったままで、有効かどうかだけが変わります。
- **テスト** — そのチャンネルが設定済みか、有効か、ゲートウェイから見て実際に接続できているかを確認します。
- **ゲートウェイの再起動** — 資格情報は `~/.hermes/.env` に、有効フラグは `config.yaml` に書き込まれます。ゲートウェイは次回の再起動時に、有効な各チャンネルへ接続します。その再起動はこのページからそのまま実行できます。

![Channels の管理ページ — 各メッセージングプラットフォームの状態、有効の切り替え、プラットフォームごとの設定フォーム](https://hermes-agent.nousresearch.com/img/dashboard/admin-channels.png)

### System {#system}

インストール環境全体に関わる操作をまとめた管理パネルです。

- **Host** — システムの現況: OS とカーネル、アーキテクチャ、ホスト名、Python と Hermes のバージョン、CPU のコア数と使用率、メモリ、Hermes のホームディレクトリがあるディスクの使用状況、稼働時間、ロードアベレージ。（CPU・メモリ・ディスクは `psutil` が入っているときに取得されます。識別情報は常に表示されます。）Hermes のバージョンには**更新状況のバッジ**（最新 / N コミット遅れ）と **Check for updates** ボタンが付きます。git でインストールした環境に更新がある場合は **Update now** ボタンが出て、確認ダイアログ（何コミット取り込むかを表示します）を経てから、バックグラウンドで `hermes update` を実行します。Docker や Nix でのインストールではダッシュボードからその場で更新できないため、代わりに外部で実行すべき正しいコマンドが表示されます。
- **Nous Portal** — ログイン状態、現在の推論プロバイダー、Tool Gateway のルーティング表（どのツールが Portal 経由で、どれがローカルで動くか）。サブスクリプションの管理ページへのリンクも付きます。`hermes portal` の内容を読み取り専用で映したものです。
- **Skill curator** — バックグラウンドでスキルを整備する処理の状態（動作中 / 一時停止、実行間隔、前回の実行）と、一時停止・再開、今すぐ実行のボタン。`hermes curator` に対応します。
- **Gateway** — メッセージングのゲートウェイの開始・停止・再起動と、現在の状態（稼働中か停止中か、PID、状態）
- **Memory** — 外部のメモリプロバイダーを選ぶ（もしくは組み込みのみにする）ほか、組み込みの `MEMORY.md` / `USER.md` を初期化します
- **Credential pool** — エージェントが順番に使い回す API キーを、プロバイダーごとに追加・削除します。一覧では伏せ字になり、生の値はエージェントにしか渡りません。
- **Operations** — `doctor` の実行、セキュリティ監査、バックアップの作成、バックアップからの復元、スキルの更新、システムプロンプトの内訳表示、サポート用のダンプ生成、廃止された設定の移行を実行できます。それぞれバックグラウンドで動き、実行中のログがページに流れます。
- **Checkpoints** — `/rollback` 用の控えの容量を確認し、整理します
- **Shell hooks** — 設定済みのフックを、同意の有無と実行可能かどうかとともに一覧し、フックの**作成**（イベント、コマンド、マッチャー、タイムアウト、明示的な同意の付与）と削除ができます。フックは任意のコマンドを実行するため、作成フォームにはセキュリティの警告が付き、同意を与えるまでフックは動きません。

![System の管理ページ — ホストの状況と Nous Portal の状態](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-top.png)

![System の管理ページ — スキルの整備、ゲートウェイ、メモリ、認証情報のプール](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-curator.png)

![System の管理ページ — 各種操作、チェックポイント、シェルフック](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-ops.png)

シェルフックを作るところ（同意のチェックボックスと、任意のコマンドが動くという警告に注目してください）:

![シェルフックの新規作成モーダル](https://hermes-agent.nousresearch.com/img/dashboard/admin-hook-create.png)

:::warning セキュリティ
Web ダッシュボードは、API キーや秘密情報が入った `.env` ファイルを読み書きします。既定では `127.0.0.1` にバインドされ、手元のマシンからのみアクセスでき、ログインは不要です。ループバック以外のアドレス（`0.0.0.0` を含む）にバインドすると[認証のゲート](#authentication-gated-mode)が有効になり、認証プロバイダー（ユーザー名とパスワード、または OAuth）を設定するまでサーバーは起動しなくなります。
:::

## `/reload` スラッシュコマンド {#reload-slash-command}

ダッシュボードの導入に合わせて、対話型 CLI に `/reload` スラッシュコマンドも追加されました。Web ダッシュボードで API キーを変えたあと（あるいは `.env` を直接編集したあと）、動いている CLI セッションで `/reload` を実行すると、再起動せずに変更を取り込めます。

```
You → /reload
  Reloaded .env (3 var(s) updated)
```

これは `~/.hermes/.env` を読み直して、動作中のプロセスの環境に反映します。ダッシュボードから新しいプロバイダーのキーを追加して、すぐ使いたいときに便利です。

## REST API {#rest-api}

Web ダッシュボードは、フロントエンドが利用する REST API を公開しています。自動化のために、これらのエンドポイントを直接呼ぶこともできます。

:::tip プロファイル単位のエンドポイント
管理系のエンドポイント群 — `/api/config`、`/api/env`、`/api/skills`、
`/api/tools/toolsets`、`/api/mcp`、`/api/model/{info,options,auxiliary,set}` — は
`?profile=<name>` というクエリパラメーター（書き込みでは JSON ボディの
`"profile"`）を任意で受け付け、そのプロファイルの `HERMES_HOME` に対して
読み書きします。省略した場合はダッシュボード自身のプロファイルが対象です。
知らないプロファイル名には `404` を返します。`/api/pty` の WebSocket も同じ
パラメーターを受け付け、選択したプロファイルでチャットを起動します。
:::

### GET /api/status {#get-apistatus}

エージェントのバージョン、ゲートウェイの状態、各プラットフォームの状態、アクティブなセッション数を返します。

レスポンスには、参考情報としてリソースに関する 2 つのブロックも含まれます（これらが
`components` や `overall` の健全性の判定に影響することはありません）。

- **`memory`** — ゲートウェイの 30 秒ごとのハートビートと、ライフサイクルの記録から
  まとめた値です。フィールドは `pressure`（`ok` / `elevated` / `critical` /
  `unknown`）、`gateway_rss_mb`、`system_total_mb`、`system_available_mb`、
  `swap_used_mb`、`sampled_at`、`boot_id`、`last_boot_unclean`、
  `last_boot_suspected_oom`。利用可能なシステムメモリが 128 MiB（または 15%）を
  下回ると `elevated`、64 MiB（または 5%）を下回ると `critical` になります。これは
  そのあとに異常終了した場合に OOM による強制終了の疑いと判定される水準と同じです。
  150 秒より古い（あるいは未来の日時が入った）ハートビートは、数値はそのまま残しつつ
  `pressure` を `unknown` に落とすので、止まったゲートウェイの最後の値が生きた計測に
  見えることはありません。
- **`disk`** — `~/.hermes` があるボリュームを `shutil.disk_usage()` でその場で測った
  値です。フィールドは `pressure`、`free_mb`、`total_mb`、`used_percent`、
  `sampled_at`。空きが 512 MB を下回る（または使用率 85% 以上で残り 4 GB 未満）と
  `elevated`、空きが 256 MB を下回る（または使用率 95% 以上で残り 1 GB 未満）と
  `critical` になります。

どちらの計測も安全側に倒れます。測定に失敗した場合はエンドポイント自体を失敗させず、
そのブロックを `{"pressure": "unknown"}` に落とします。`/api/status` は誰でも
叩けるため、数値は粗い単位（MB 単位、パーセントは整数）になっています。

### GET /api/sessions {#get-apisessions}

直近 20 件のセッションを、メタデータ（モデル、トークン数、日時、プレビュー）付きで返します。

### GET /api/config {#get-apiconfig}

現在の `config.yaml` の内容を JSON で返します。

### GET /api/config/defaults {#get-apiconfigdefaults}

設定の既定値を返します。

### GET /api/config/schema {#get-apiconfigschema}

すべての設定項目について、型、説明、カテゴリー、該当する場合は選択肢を記述したスキーマを返します。フロントエンドはこれを見て、項目ごとに適切な入力欄を描画します。

### PUT /api/config {#put-apiconfig}

新しい設定を保存します。ボディ: `{"config": {...}}`。

### GET /api/env {#get-apienv}

既知の環境変数をすべて、設定済みかどうかの状態、伏せ字にした値、説明、カテゴリー付きで返します。

### PUT /api/env {#put-apienv}

環境変数を設定します。ボディ: `{"key": "VAR_NAME", "value": "secret"}`。

### DELETE /api/env {#delete-apienv}

環境変数を削除します。ボディ: `{"key": "VAR_NAME"}`。

### GET /api/sessions/\{session_id\} {#get-apisessionssessionid}

1 つのセッションのメタデータを返します。

### GET /api/sessions/\{session_id\}/messages {#get-apisessionssessionidmessages}

メッセージ履歴を、件数を区切ったページ単位で返します。ツール呼び出しと日時も含みます。既定では最新の 500 件を時系列順で返します。明示的にページを指定するには `limit`（最大 500）、`offset`、`order=oldest|latest` を使います。

### GET /api/sessions/search {#get-apisessionssearch}

メッセージ本文の全文検索です。クエリパラメーターは `q`。該当するセッション ID を、強調表示のスニペット付きで返します。

### DELETE /api/sessions/\{session_id\} {#delete-apisessionssessionid}

セッションとそのメッセージ履歴を削除します。

### GET /api/logs {#get-apilogs}

ログ行を返します。クエリパラメーターは `file`（agent/errors/gateway）、`lines`（行数）、`level`、`component`。

### GET /api/analytics/usage {#get-apianalyticsusage}

トークン使用量、コスト、セッションの分析を返します。クエリパラメーターは `days`（既定 30）。レスポンスには日次の内訳とモデル別の集計が含まれます。

### GET /api/cron/jobs {#get-apicronjobs}

設定済みの cron ジョブをすべて、状態、スケジュール、実行履歴付きで返します。

### POST /api/cron/jobs {#post-apicronjobs}

cron ジョブを新規作成します。ボディ: `{"prompt": "...", "schedule": "0 9 * * *", "name": "...", "deliver": "local"}`。

### POST /api/cron/jobs/\{job_id\}/pause {#post-apicronjobsjobidpause}

cron ジョブを一時停止します。

### POST /api/cron/jobs/\{job_id\}/resume {#post-apicronjobsjobidresume}

一時停止した cron ジョブを再開します。

### POST /api/cron/jobs/\{job_id\}/trigger {#post-apicronjobsjobidtrigger}

スケジュールとは関係なく、cron ジョブをその場で実行します。

### DELETE /api/cron/jobs/\{job_id\} {#delete-apicronjobsjobid}

cron ジョブを削除します。

### GET /api/skills {#get-apiskills}

すべてのスキルを、名前、説明、カテゴリー、有効かどうか付きで返します。

### PUT /api/skills/toggle {#put-apiskillstoggle}

スキルの有効・無効を切り替えます。ボディ: `{"name": "skill-name", "enabled": true}`。

### GET /api/tools/toolsets {#get-apitoolstoolsets}

すべてのツールセットを、ラベル、説明、ツール一覧、有効かどうかと設定済みかどうか付きで返します。

### 管理系のエンドポイント {#admin-endpoints}

MCP、Channels、Webhooks、Pairing、System の各ページを支えるものです。いずれも `/api/` の他と
同じ認証のゲートの内側にあります。

| メソッドとパス | 用途 |
|---------------|---------|
| `GET /api/mcp/servers` | 設定済みの MCP サーバーを一覧する（環境変数の値は伏せ字） |
| `POST /api/mcp/servers` | サーバーを追加する。ボディ: `{name, url?, command?, args?, env?, auth?}` |
| `POST /api/mcp/servers/{name}/test` | 接続してツールを一覧し、切断する |
| `PUT /api/mcp/servers/{name}/enabled` | サーバーを有効・無効にする |
| `DELETE /api/mcp/servers/{name}` | サーバーを削除する |
| `GET /api/mcp/catalog` | Nous が確認済みの MCP カタログを見る |
| `POST /api/mcp/catalog/install` | カタログの項目を導入する（必要な環境変数付き） |
| `GET /api/messaging/platforms` | すべてのメッセージングのチャンネルを、状態とプラットフォームごとの設定項目付きで一覧する |
| `PUT /api/messaging/platforms/{id}` | チャンネルを設定する。ボディ: `{enabled?, env?, clear_env?}`（env は `.env` へ、enabled は `config.yaml` へ書き込みます） |
| `POST /api/messaging/platforms/{id}/test` | チャンネルが設定済みか、有効か、接続できているかを報告する |
| `GET /api/pairing` | 承認待ちと承認済みのメッセージング利用者を一覧する |
| `POST /api/pairing/approve` | コードを承認する。ボディ: `{platform, code}` |
| `POST /api/pairing/revoke` | 利用者を取り消す。ボディ: `{platform, user_id}` |
| `POST /api/pairing/clear-pending` | 承認待ちのコードをすべて破棄する |
| `GET /api/webhooks` | 購読の一覧とプラットフォームが有効かどうか |
| `POST /api/webhooks` | 購読を作成する（一度だけ表示されるシークレットを返します） |
| `DELETE /api/webhooks/{name}` | 購読を削除する |
| `GET /api/credentials/pool` | 使い回し用のキーを一覧する（伏せ字） |
| `POST /api/credentials/pool` | キーを追加する。ボディ: `{provider, api_key, label?}` |
| `DELETE /api/credentials/pool/{provider}/{index}` | キーを削除する（添字は 1 始まり） |
| `GET /api/memory` | 現在のプロバイダー、利用できるプロバイダー、組み込みファイルのサイズ |
| `PUT /api/memory/provider` | プロバイダーを選ぶ（空なら組み込みのみ） |
| `POST /api/memory/reset` | 組み込みのメモリを初期化する。ボディ: `{target: all\|memory\|user}` |
| `POST /api/gateway/start` · `/stop` · `/restart` | ゲートウェイの起動と停止（バックグラウンド実行） |
| `POST /api/ops/doctor` · `/security-audit` · `/backup` · `/import` | 診断と保守（バックグラウンド実行。`/api/actions/{name}/status` で経過を追えます） |
| `GET /api/ops/hooks` | 設定済みのシェルフックと許可リストの状態 |
| `GET /api/ops/checkpoints` · `POST .../prune` | `/rollback` の控えを確認・整理する |
| `POST /api/ops/hooks` · `DELETE /api/ops/hooks` | シェルフックを作成・削除する（同意が必要） |
| `GET /api/system/stats` | ホストの状況 — OS、CPU、メモリ、ディスク、稼働時間 |
| `GET /api/hermes/update/check` | 更新があるかどうか（何コミット遅れか、インストール方法）を、適用せずに報告する。git でのインストールで遅れている場合は、変更内容の `commits` 一覧（`sha`、`summary`、`author`、`at`）も返します。`?force=1` で 6 時間のキャッシュを無視します |
| `GET /api/curator` · `PUT .../paused` · `POST .../run` | スキル整備の状態と、一時停止・再開・実行 |
| `GET /api/portal` | Nous Portal の認証状態と Tool Gateway のルーティング（読み取り専用） |
| `POST /api/ops/prompt-size` · `/dump` · `/config-migrate` | 診断（バックグラウンド実行） |
| `PUT /api/webhooks/{name}/enabled` | webhook の経路を有効・無効にする |
| `POST /api/skills/hub/install` · `/uninstall` · `/update` | スキルのハブに対する操作（バックグラウンド実行） |
| `GET /api/skills/hub/search` | すべての提供元をまたいでスキルのハブを検索する |
| `GET /api/sessions/stats` | セッションの保存状況に関する統計 |
| `PATCH /api/sessions/{id}` | セッションの名前変更・アーカイブ |
| `GET /api/sessions/{id}/export` | セッション（メタデータとメッセージ）を JSON で書き出す |
| `POST /api/sessions/prune` | 終了してから N 日以上経ったセッションを削除する |
| `PUT /api/cron/jobs/{id}` | cron ジョブのプロンプト・スケジュール・名前・送り先を編集する |

## 認証（ゲートが有効なモード） {#authentication-gated-mode}

ダッシュボードが公開アドレスやループバック以外のアドレス、つまり `127.0.0.1` / `localhost` 以外にバインドされているとき、Hermes Agent は認証のゲートを有効にします。すべてのリクエストは検証済みのセッションクッキーを持っている必要があり、無ければログインページへ戻されます。同梱のプロバイダーは 3 つです。

- **[ユーザー名とパスワード](#usernamepassword-provider-no-oauth-idp)** — 自前で立てた社内や自宅のダッシュボードに認証を付ける、いちばん手軽な方法です。外部の ID プロバイダーは要りません。**信頼できるネットワーク上か VPN の内側でだけ使ってください。インターネットへの公開には向きません。**
- **[OAuth（Nous Portal）](#default-provider-nous-research)** — ホスト型の環境や、インターネットから到達できるダッシュボード向けです。[Hermes Desktop を離れたバックエンドにつなぐ](#connecting-hermes-desktop-to-a-remote-backend)場合にも、これが推奨されます。ログインのたびに Nous のアカウントで検証されるので、インターネット公開に耐えるのはこのプロバイダーです。
- **[自前の OIDC](#self-hosted-oidc-provider)** — 標準の OpenID Connect で自分の ID プロバイダーを使う方式です（Keycloak、Auth0、Okta、Google、OIDC ブリッジ経由の GitHub など）。Nous Portal は関与しません。仕様に沿った OIDC サーバーを前段に置けば、インターネット公開にも耐えます。

自分で運用していてループバックにバインドしているダッシュボードは影響を受けません。認証もログインページもありません。

### ゲートが有効になる条件 {#when-the-gate-engages}

| フラグ | 認証のゲート | 用途 |
|-------|-----------|----------|
| `hermes dashboard`（既定 — `127.0.0.1` にバインド） | オフ | ローカルでの開発 |
| `hermes dashboard --host 0.0.0.0` | **オン** | 離れた場所からの利用・本番 — ユーザー名とパスワード、または OAuth で保護する |

ゲートが有効になるのは、バインド先が `127.0.0.1`、`::1`、`localhost` のいずれでもない場合だけです。`0.0.0.0`（あるいは RFC1918 や LAN のアドレス）にバインドすると有効になります。古い `--insecure` フラグでは**もう無効化できません**。後方互換のために受け付けはしますが、警告を出して無視します。

:::danger `--insecure` は何もしません — 認証は無効になりません
2026 年 6 月の強化以降、`--insecure` でダッシュボードの認証を迂回することはできません。ループバック以外にバインドする場合は、必ず認証プロバイダー（ユーザー名とパスワードのプロバイダーか OAuth）が要ります。認証なしで使いたい場合は `127.0.0.1` にバインドして、SSH トンネルや Tailscale 越しにアクセスしてください。
:::

### 失敗したら閉じる方針 {#fail-closed-semantics}

ゲートが有効になる条件でありながら、`DashboardAuthProvider` が 1 つも登録されていない場合（Nous のプラグインも独自プラグインも無い場合）、`hermes dashboard` は明確なエラーメッセージを出してバインドを拒否します。「既定は拒否だが実際は全部通す」という逃げ道はありません。設定を誤ったままのゲート付きダッシュボードは、そもそも起動しません。

`hermes dashboard --host 0.0.0.0` を**対話的に**（本物のターミナルから）実行し、まだプロバイダーが未設定なら、Hermes は失敗するだけで終わらず、その場で設定を提案します。**ユーザー名とパスワード**を選べば（`config.yaml` に `dashboard.basic_auth` が書き込まれ）数秒で動き出しますし、**OAuth** を選べば `hermes dashboard register` を案内されます。対話的でない呼び出し — Docker や s6、CI、パイプ経由の実行 — ではこの確認は省かれ、上記の起動拒否になります。無人でのデプロイが認証なしで立ち上がることはありません。

### 既定のプロバイダー: Nous Research {#default-provider-nous-research}

同梱の `plugins/dashboard_auth/nous` プラグインは**常にインストールされ**、自動で読み込まれます。クライアント ID が設定されていれば、`nous` という名前の `DashboardAuthProvider` を自動的に登録します。

ログインのたびに Nous Portal で検証され、Nous のアカウントで守られるため、**インターネットにダッシュボードを公開する場合に適するのは Nous のプロバイダーです。**

#### ダッシュボードを登録する {#registering-a-dashboard}

Nous のプロバイダーを使うには OAuth のクライアント ID（`agent:{id}` の形）が必要です。取得方法は 2 つあります。

- **CLI — `hermes dashboard register`。** ダッシュボードを動かすホストで実行します。既存の Nous ログインを解決し（ログインしていない場合は先に `hermes setup` を実行してください）、自前運用の OAuth クライアントを Portal に登録し、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書き込みます。任意のフラグとして `--name`（人が読むためのラベル。省略すると自動生成されます）と `--redirect-uri`（インターネット公開のホスト向けに、公開された HTTPS のコールバック URL）があります。

  ```bash
  hermes dashboard register
  # ✓ Registered dashboard "swift_falcon"
  # …writes HERMES_DASHBOARD_OAUTH_CLIENT_ID to ~/.hermes/.env
  ```

- **画面から — Local Dashboards のページ。** Nous Portal の [`/local-dashboards`](https://portal.nousresearch.com/local-dashboards) を開くと、自前運用のダッシュボードの登録、名前付け、管理、取り消しをブラウザーから行えます。表示された `agent:{id}` のクライアント ID を `HERMES_DASHBOARD_OAUTH_CLIENT_ID`（環境変数）または `dashboard.oauth.client_id`（config.yaml）に入れてください。CLI で登録したダッシュボードを取り消すのもこのページです。

#### 設定 {#configuration}

このプラグインは 2 か所を読み、環境変数が空でない値で設定されていればそちらが優先されます。

**`config.yaml`** — 本来の設定場所です。

```yaml
dashboard:
  oauth:
    client_id: agent:01HXYZ…             # required to engage the gate
```

**環境変数** — 運用者による上書きです。

| 環境変数 | 上書き対象 | 形式 | 設定するもの |
|---------|-----------|--------|----------------|
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | `dashboard.oauth.client_id` | `agent:{instance_id}` | `hermes dashboard register` |

Hermes Agent の慣習では `~/.hermes/.env` は API キーや秘密情報だけのためのものなので、ローカル開発、社内運用、自分で直接管理するデプロイでは、**これらの値は `config.yaml` に書くことをおすすめします**。環境変数の経路は、ホスティング基盤の秘密情報の注入によって、イメージの中の `config.yaml` を誰も編集せずにデプロイごとの `client_id` を渡せるようにするためのもので、それが本来の用途です。

空の環境変数は未設定として扱われるため、用意はされたが値が入っていないプラットフォーム側の秘密情報が、正しい `config.yaml` の値を意図せず覆い隠すことはありません。

どちらにも client_id が無い場合、プラグインは具体的な理由を報告し、ダッシュボードの起動拒否メッセージが何を直せばよいかを正確に伝えます。

```
Refusing to bind dashboard to 0.0.0.0 — the auth gate engages on
non-loopback binds, but no auth providers are registered.

Bundled providers reported these issues:
  • nous: HERMES_DASHBOARD_OAUTH_CLIENT_ID is not set (and
    dashboard.oauth.client_id in config.yaml is empty). …

Configure an auth provider before exposing the dashboard:
  • Password: set dashboard.basic_auth.username + password_hash in config.yaml
  • OAuth: run `hermes dashboard register` (Nous Portal) or install a
    DashboardAuthProvider plugin.
There is no unauthenticated public-bind option — to keep it local, bind
127.0.0.1 and tunnel in (SSH / Tailscale).
```

#### 実例: Nous Research {#worked-example-nous-research}

Nous にログイン済みの Hermes から、Nous で守られたダッシュボードまで 3 ステップです。

**1. ログインしてダッシュボードを登録する。** `hermes dashboard register` は既存の Nous ログインを使って OAuth クライアントを用意し、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書き込みます。

```bash
hermes setup            # if you're not already logged into Nous Portal
hermes dashboard register
# ✓ Registered dashboard "swift_falcon"
# …writes HERMES_DASHBOARD_OAUTH_CLIENT_ID to ~/.hermes/.env
```

**2. 到達できるアドレスでダッシュボードを動かす。** ループバック以外にバインドすると OAuth のゲートが有効になり、いま書き込まれた `client_id` が `nous` プロバイダーを起動させます。

```bash
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

**3. ログインする。** `http://<host>:9119/` を開くと `/login` に飛ばされます。**Sign in with Nous Research** をクリックし、Portal で認証すると、認証済みのダッシュボードに戻ってきます。ゲートの状態はどのマシンからでも確認できます。

```bash
curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["nous"]
```

このあと `GET /api/auth/me` は検証済みのセッション（`provider: nous`）を返します。インターネット公開のホストでは、`--redirect-uri https://hermes.example.com/auth/callback` を付けて登録し、OAuth のコールバックが公開 URL に解決されるよう `HERMES_DASHBOARD_PUBLIC_URL` を設定してください（[公開 URL の上書き](#public-url-override)を参照）。

### ユーザー名とパスワードのプロバイダー（OAuth の IDP なし） {#usernamepassword-provider-no-oauth-idp}

OAuth の ID プロバイダーを用意したくない、つまり「自前のダッシュボードにパスワードを付けたいだけ」という場合のために、同梱の `plugins/dashboard_auth/basic` プラグインが `basic` という名前の `DashboardAuthProvider` を登録します。OAuth のリダイレクトではなく、**ユーザー名とパスワード**で認証します。

これは OAuth のプロバイダーと同じゲートに組み込まれます。ループバック以外へのバインドでゲートが有効になり、ログインページには「◯◯でログイン」ボタンの代わりに資格情報の入力フォームが出ます。ログイン後の動き — セッションクッキー、裏側での更新、WebSocket 用のチケット、ログアウト、監査ログ — は OAuth の場合とまったく同じです。セッションはプロバイダー自身が発行する、HMAC で署名された状態を持たないトークンなので、**データベースも外部の ID プロバイダーも不要**です。パスワードのハッシュには標準ライブラリの `scrypt` を使うので、サードパーティ製の依存関係も増えません。

:::warning 信頼できるネットワークでのみ使ってください — インターネット公開には不向きです
ユーザー名とパスワードのプロバイダーは、**信頼できるネットワーク**上、あるいは **VPN** 越しにしか届かない、自前運用や社内・自宅のダッシュボードのためのものです。守っているのは共有の資格情報 1 組だけで、その背後に外部の ID プロバイダーも多要素認証もユーザーごとのアカウントもありません。したがって、**ダッシュボードをインターネットに直接公開する用途には適しません**。インターネットに面したダッシュボードには、[Nous Research のプロバイダー](#default-provider-nous-research)（もしくは自前の[自前 OIDC](#self-hosted-oidc-provider) や[独自のプロバイダー](#custom-providers)）を使ってください。
:::

#### 設定 {#configuration}

Nous のプロバイダーと同じく、本来の設定場所は `config.yaml` で、環境変数が空でない値で設定されていればそちらが優先されます。有効になるのは `username` に加えて `password_hash`（推奨）または `password` のどちらかが設定されているときだけで、そうでなければ何もしません。OAuth を使う人やループバックで運用している人には影響しません。

**`config.yaml`:**

```yaml
dashboard:
  basic_auth:
    username: admin
    # Preferred — no plaintext at rest. Compute with:
    #   python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"
    password_hash: "scrypt$16384$8$1$…$…"
    # ...or a plaintext password (hashed in-memory at load; less safe at rest):
    # password: "s3cret"
    secret: "<32+ random bytes, base64 or hex>"  # token-signing key
    session_ttl_seconds: 43200                    # optional; access-token lifetime (default 12h)
```

**環境変数による上書き:**

| 環境変数 | 上書き対象 | 備考 |
|---------|-----------|-------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | `dashboard.basic_auth.username` | 有効化に必須 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | `dashboard.basic_auth.password_hash` | 推奨（平文を残さずに済みます） |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | `dashboard.basic_auth.password` | 平文。設定側の `password_hash` **より優先される**ので、環境変数で入れ替えられます |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | `dashboard.basic_auth.secret` | トークン署名の鍵 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | `dashboard.basic_auth.session_ttl_seconds` | アクセストークンの有効期間 |

:::caution セッションを保つには `secret` を明示的に設定してください
`secret` が空のときは、プロセスごとにランダムな署名鍵が生成されます。単一プロセスなら問題ありませんが、**再起動のたびにすべてのセッションが無効**になり、複数のワーカーをまたいでセッションが共有**されません**。再起動をまたぎたい場合や複数ワーカー構成の場合は、`secret` を明示的に設定してください。
:::

`/auth/password-login` エンドポイントはクライアント IP ごとに回数制限があり（既定は 1 分あたり 10 回まで、超えると HTTP 429）、存在しないユーザー名でも間違ったパスワードでも同じ `401 Invalid credentials` を返すので、ユーザー名の存在を探る手段にはできません。

#### 実例: ユーザー名とパスワード {#worked-example-usernamepassword}

何も無い状態から、信頼できるネットワーク上でパスワード付きのダッシュボードを動かすまで 3 ステップです。

**1. `~/.hermes/.env` に資格情報を書く。** 平文が残らないようパスワードをハッシュ化し、再起動してもセッションが続くよう署名用のシークレットも固定します。

```bash
# Compute a scrypt hash of your chosen password:
HASH=$(python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('choose-a-strong-password'))")

cat >> ~/.hermes/.env <<EOF
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH=$HASH
HERMES_DASHBOARD_BASIC_AUTH_SECRET=$(openssl rand -base64 32)
EOF
chmod 600 ~/.hermes/.env
```

**2. 到達できるアドレスでダッシュボードを動かす。** ループバック以外にバインドするとゲートが有効になり、ユーザー名とハッシュが `basic` プロバイダーを起動させます。

```bash
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

**3. ログインする。** `http://<host>:9119/` を開くと `/login` に飛ばされ、そこには「◯◯でログイン」ボタンではなく**資格情報の入力フォーム**が出ます。`admin` と設定したパスワードを入れると、認証済みのダッシュボードに移ります。ゲートの状態はどのマシンからでも確認できます。

```bash
curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["basic"]
```

このあと `GET /api/auth/me` は検証済みのセッション（`provider: basic`）を返します。上の警告のとおり、これは VPN の内側に置いてください。公開ホストでは [Nous Research](#default-provider-nous-research) か[自前の OIDC](#self-hosted-oidc-provider) のプロバイダーを使ってください。

#### 独自のパスワードプロバイダーを書く {#writing-your-own-password-provider}

`basic` は拡張ポイントの実装のひとつにすぎません。どのプラグインでもパスワードのプロバイダーを登録できます。`DashboardAuthProvider` のサブクラスに `supports_password = True` を設定し、`complete_password_login(*, username, password) -> Session` を実装してください（拒否するときは `InvalidCredentialsError` を、裏側の保存先が落ちているときは `ProviderError` を投げます）。パスワードだけのプロバイダーなら、OAuth 用の `start_login` / `complete_login` は `NotImplementedError` のままで構いません。LDAP バインドや資格情報のデータベース、そのほかリダイレクトを使わない認証方式を組み込む道はこれです。フォーム、ルート、クッキー、更新処理は仕組み側が面倒を見ます。

### 自前の OIDC プロバイダー {#self-hosted-oidc-provider}

自分で ID プロバイダーを運用しているなら、同梱の `plugins/dashboard_auth/self_hosted` プラグインが、**標準の OpenID Connect** でダッシュボードをそこに認証させます。IDP ごとの個別コードも、Nous Portal も要りません。仕様に沿った OIDC サーバーであれば動作を確認済みです。

> **Authentik · Keycloak · Zitadel · Authelia · Auth0 · Okta · Google · …**

Nous のプロバイダーと同じく自動で読み込まれ、設定が済むまで自分を登録しないので、ループバックのダッシュボードでは何もしません。

#### 設定 {#configuration}

**issuer** と **client_id**（クライアントシークレットを持たない、PKCE の公開クライアント）を設定します。プラグインは IDP の `authorization_endpoint`、`token_endpoint`、`jwks_uri` を `{issuer}/.well-known/openid-configuration` から取得するので、エンドポイントの URL を直接書く必要はありません。

**`config.yaml`** — 本来の設定場所です。

```yaml
dashboard:
  oauth:
    provider: self-hosted
    self_hosted:
      issuer: https://auth.example.com/application/o/hermes/   # required
      client_id: hermes-dashboard                              # required
      scopes: "openid profile email"                           # optional (this is the default)
```

**環境変数** — 運用者による上書きです（空でない値が設定されていれば `config.yaml` より優先されます。空の値は未設定として扱われます）。

| 環境変数 | 上書き対象 | 備考 |
|---------|-----------|-------|
| `HERMES_DASHBOARD_OIDC_ISSUER` | `dashboard.oauth.self_hosted.issuer` | OIDC の issuer URL — 必須 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | `dashboard.oauth.self_hosted.client_id` | 公開クライアントの id — 必須 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | `dashboard.oauth.self_hosted.scopes` | 既定は `openid profile email` |

IDP 側では、認可コードと PKCE（S256）を使う**公開**アプリケーション（クライアント）を登録し、ダッシュボードのコールバックを許可するリダイレクト URI に追加します。コールバックは `<dashboard public URL>/auth/callback` です（プロキシの背後で公開 URL がどう決まるかは[公開 URL の上書き](#public-url-override)を参照してください）。

#### 何を検証するか {#what-it-verifies}

このプロバイダーは、OpenID Connect の **ID トークン**（RS256/ES256）を、取得した `jwks_uri` に照らして検証します。`iss` と `aud` のクレームは、設定した `issuer` と `client_id` に固定されます。標準的な OIDC のクレームは、ダッシュボードのセッションに次のように対応づけられます。

| セッションの項目 | 対応するクレーム |
|---------------|----------|
| `user_id` | `sub`（必須） |
| `email` | `email` |
| `display_name` | `name` → `preferred_username` → `nickname` → `email` |
| `org_id` | `org_id` / `organization`、無ければ `groups` を連結したもの |

身元を決めるのは ID トークンです。アクセストークンは中身を解釈しない値として扱います（OIDC の仕様はアクセストークンが JWT であることを求めていません）。エンドポイントの URL は HTTPS である必要があります（ローカル開発の IDP 向けにループバックの `http://` は許容されます）。また、ディスカバリー文書が示す `issuer` は設定した値と一致していなければなりません（末尾のスラッシュの違いは許容されます）。IDP がリフレッシュトークンを発行する場合は、標準の `refresh_token` グラントで裏側の再認証に使われます。ログアウト時は、IDP が RFC 7009 の `revocation_endpoint` を提示していればそれを呼びます。

> **秘密鍵を持つクライアント**（`client_secret` があるもの）にはまだ対応していません。ブラウザーから使うダッシュボードでは一般的な、公開クライアントと PKCE の組み合わせで設定してください。

#### 実例: Keycloak {#worked-example-keycloak}

[Keycloak](https://www.keycloak.org/) は、手元で試すのにいちばん立ち上げやすい自前運用の OIDC サーバーのひとつです。開発モードならコンテナ 1 つ（メモリ内 DB）で動き、教科書どおりの OIDC ディスカバリーを提示します。ここでは何も無い状態から、数分でダッシュボードにログインできるところまで進めます。

**1. realm を設定済みの Keycloak を起動する。** 次の realm のエクスポートを `realm-hermes.json` として保存します。`hermes` realm、**PKCE の公開クライアント**（`hermes-dashboard`）、テスト用のユーザーが定義されており、起動時に取り込まれるので管理画面で何かをクリックする必要はありません。

```json
{
  "realm": "hermes",
  "enabled": true,
  "clients": [
    {
      "clientId": "hermes-dashboard",
      "name": "Hermes Agent Dashboard",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "protocol": "openid-connect",
      "redirectUris": ["http://localhost:9119/auth/callback"],
      "webOrigins": ["http://localhost:9119"],
      "attributes": { "pkce.code.challenge.method": "S256" }
    }
  ],
  "users": [
    {
      "username": "testuser",
      "enabled": true,
      "emailVerified": true,
      "email": "testuser@example.com",
      "firstName": "Test",
      "lastName": "User",
      "credentials": [
        { "type": "password", "value": "testpassword", "temporary": false }
      ]
    }
  ]
}
```

そのファイルを取り込み用ディレクトリにマウントして起動します（Keycloak 26 以降）。

```bash
docker run --rm -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v "$PWD/realm-hermes.json:/opt/keycloak/data/import/realm-hermes.json:ro" \
  quay.io/keycloak/keycloak:26.0 \
  start-dev --import-realm
```

起動すると、この realm は標準の OIDC ディスカバリーを
`http://localhost:8080/realms/hermes/.well-known/openid-configuration` に提示します
（issuer は `http://localhost:8080/realms/hermes`）。管理コンソールは
`http://localhost:8080/`（`admin` / `admin`）です。

**2. ダッシュボードをそこに向ける。** 自前 OIDC のプラグインはループバックの `http://` issuer を許容するので（ループバック以外の issuer では HTTPS が必須です）、ローカルの Keycloak はそのまま使えます。

```bash
export HERMES_DASHBOARD_OIDC_ISSUER="http://localhost:8080/realms/hermes"
export HERMES_DASHBOARD_OIDC_CLIENT_ID="hermes-dashboard"
export HERMES_DASHBOARD_PUBLIC_URL="http://localhost:9119"
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

`HERMES_DASHBOARD_PUBLIC_URL` は、OAuth のコールバックが
`http://localhost:9119/auth/callback` であることをダッシュボードに伝えます。上で
realm に登録したリダイレクト URI と同じものです。OAuth のゲートを有効にするのは、
`0.0.0.0`（ループバック以外）へのバインドです。

**3. ログインする。** `http://localhost:9119/` を開くと `/login` に飛ばされます。**Sign in with Self-Hosted OIDC** をクリックし、Keycloak で `testuser` / `testpassword` として認証すると、認証済みのダッシュボードに戻ってきます。サイドバーには `Logged in as Test User via self-hosted` と表示され、`GET /api/auth/me` は検証済みのセッション（`provider: self-hosted`、`email: testuser@example.com`）を返します。

> 別のホストやポートでバインド・アクセスする場合は、そのオリジンの
> `…/auth/callback` を Keycloak の管理コンソールでクライアントの **Valid redirect URIs**
> に追加してください（Clients → hermes-dashboard → Settings）。同じ手順が
> Authentik、Zitadel、Authelia など他の OIDC サーバーでも通用します。違うのは issuer の
> URL とクライアント登録の画面だけです。

### 公開 URL の上書き {#public-url-override}

既定では、ダッシュボードは OAuth のコールバック URL をリクエストから組み立てます（`X-Forwarded-Host` と `X-Forwarded-Proto` と `X-Forwarded-Prefix` を使います。uvicorn が `proxy_headers=True` で動いているとき、つまりゲートが有効なときに `start_server` がそう設定します）。3 つのヘッダーを正しく付けるリバースプロキシの背後なら、これで問題なく動きます。

これらのヘッダーが確実に転送されないデプロイ（手組みの nginx、社内のイングレス、プロキシの連鎖が部分的なカスタムドメインのデプロイなど）では、`dashboard.public_url`（または `HERMES_DASHBOARD_PUBLIC_URL`）に、ダッシュボードに到達するための**完全な公開 URL** を設定します。

```yaml
dashboard:
  public_url: "https://dashboard.example.com/hermes"
```

設定すると、OAuth のコールバック URL はそのまま `<public_url>/auth/callback` になります。この経路では `X-Forwarded-Prefix` は無視されます。運用者が公開 URL を明示的に宣言しているからです。これは意図した挙動で、そうしないと、プレフィックスがすでに `public_url` に含まれているという一般的なケースで、プレフィックスが二重に付いてしまいます。

優先順位は他のダッシュボードの設定と同じで、環境変数が `config.yaml` より優先されます。

| 設定場所 | 上書きする側 | 使いどころ |
|---------|---------------|-------------|
| `config.yaml` の `dashboard.public_url` | `HERMES_DASHBOARD_PUBLIC_URL` | ローカル開発・社内運用（本来の設定場所） |
| 環境変数 `HERMES_DASHBOARD_PUBLIC_URL` | — | ホスティング基盤の秘密情報・CI |
| （未設定） | — | 既定 — `X-Forwarded-*` ヘッダーから組み立てる |

`http://` / `https://` のスキームが無い値、ホストが無い値、引用符・不等号・空白・制御文字を含む値は、検証で弾かれます。値が不正な場合は、利用者を怪しい URL へ飛ばす代わりに、黙ってヘッダーからの組み立てに戻り、ログインの流れはそのまま動き続けます。

> **補足:** `public_url` が上書きするのは OAuth のコールバック URL だけです。クッキーの `Secure` フラグは今までどおり `request.url.scheme`（proxy_headers 有効時は X-Forwarded-Proto）で決まるので、TLS で終端する公開環境に `http://` の `public_url` を設定すると、クッキーにこのフラグが付かなくなります。これは運用上の落とし穴です。`public_url` を使うなら、前段の TLS 終端も正しく整えてください。

### OAuth の流れ {#oauth-flow}

このプロバイダーは [Nous Portal OAuth contract v1](https://github.com/NousResearch/nous-account-service/blob/main/docs/agent-dashboard-oauth-contract.md) を実装しています。PKCE（S256）付きの認可コードグラントです。

1. セッションクッキーを持たずに `/` を開くと、ゲートが `/login` へリダイレクトします。
2. ログインページに「Continue with Nous Research」のボタンが出て、`/auth/login?provider=nous` へ進みます。
3. サーバーは PKCE の状態を短命のクッキーに保存し、`https://portal.nousresearch.com/oauth/authorize?…` へリダイレクトします。
4. 利用者が Portal で認証し、`/auth/callback?code=…&state=…` に戻ってきます。
5. サーバーは `POST /api/oauth/token` でコードをアクセストークンと交換し、Portal の JWKS（`/.well-known/jwks.json`）で JWT の署名を検証して、`hermes_session_at` クッキーを設定します。
6. 利用者は `/`（または `next=` クエリパラメーターで指定された元のディープリンク先）へリダイレクトされます。

アクセストークンの有効期間は 15 分です。**contract v1 にリフレッシュトークンはありません。** トークンが切れると、SPA の fetch ラッパーが 401 のレスポンスを検知し、ページ全体を `/login` に遷移させて流れをやり直します。

### 設定されるクッキー {#cookies-set}

| 名前 | 有効期間 | 備考 |
|------|----------|-------|
| `hermes_session_at` | トークンの有効期間（15 分） | HttpOnly、SameSite=Lax、HTTPS のときは Secure |
| `hermes_session_pkce` | 10 分 | HttpOnly。往復の間、PKCE の verifier とプロバイダーの手がかりを保持します |
| `hermes_session_rt` | v1 では未使用 | 将来のために予約。`refresh_token` が空のときは書き込まれません |

3 つとも `Path=/` かつ `SameSite=Lax` です。`Secure` フラグは、ダッシュボードに HTTPS で到達したときに付きます（リクエスト URL のスキームで判定し、`proxy_headers=True` のときは前段の TLS 終端からの `X-Forwarded-Proto` も見ます）。

### ログアウト {#logout}

サイドバーのウィジェットには `Logged in as <user_id…> via nous` とログアウトのアイコンが出ます。クリックすると `/auth/logout` に POST され、ダッシュボードの認証クッキーがすべて消去されて `/login` に戻ります。

### 監査ログ {#audit-log}

ログインの開始、成功、失敗、セッション検証の失敗は、すべて JSON の 1 行として `$HERMES_HOME/logs/dashboard-auth.log` に書き出されます。機微な項目（`access_token`、`refresh_token`、`code`、`code_verifier`、`state`、`Authorization` ヘッダー）は、記録される前に伏せられます。

### 独自のプロバイダー {#custom-providers}

Nous 以外の OAuth プロバイダー（Google、GitHub、独自の OIDC など）をつなぐには、`DashboardAuthProvider` を登録するプラグインを作ります。

```python
# ~/.hermes/plugins/dashboard-auth-myidp/__init__.py
from hermes_cli.dashboard_auth import DashboardAuthProvider, Session, LoginStart

class MyIdPProvider(DashboardAuthProvider):
    name = "myidp"
    display_name = "My Identity Provider"

    def start_login(self, *, redirect_uri): ...
    def complete_login(self, *, code, state, code_verifier, redirect_uri): ...
    def verify_session(self, *, access_token): ...
    def refresh_session(self, *, refresh_token): ...
    def revoke_session(self, *, refresh_token): ...

def register(ctx):
    ctx.register_dashboard_auth_provider(MyIdPProvider())
```

ログインページには登録されたプロバイダーがすべて並びます。複数を同時に用意しておき、利用者が `/login` で選ぶこともできます。

### 対話なしの認証（ベアラートークン） {#non-interactive-bearer-token-auth}

人が対話的にログインする方式（セッションクッキーと更新）に加えて、`DashboardAuthProvider` の抽象基底クラスは、**サービス間の対話なし**の認証を `supports_token = True` と `verify_token(token=...)` で受け付けます。プロバイダーがこれに対応すると、届いた `Authorization: Bearer <token>` が検証され、成功したときはリクエストに `TokenPrincipal` が付きます（`request.state.token_principal`）。対象は、そのプロバイダーがトークンで認証可能と指定したエンドポイントに限られ、クッキーもリダイレクトも更新処理もありません。

同梱の最初の利用例が **drain** プロバイダー（`plugins/dashboard_auth/drain`）です。`nous-account-service` がエージェントごとのシークレットを `HERMES_DASHBOARD_DRAIN_SECRET` として用意し、プロバイダーは届いたベアラートークンを実行時間が一定の比較で照合したうえで、`/api/gateway/drain` をトークン認証の対象として登録します。これは**失敗したら閉じる**方針です。弱い、あるいは短いシークレット（256 ビット未満）は登録の時点で拒否され、エンドポイントは無効のままになります。環境変数が未設定なら何もしません。挙動の細かい設定（`scope`、`min_secret_chars`）は `config.yaml` の `dashboard.drain_auth` の下にあります。

独自のプロバイダーでも、同じように `supports_token` と `verify_token` を実装すれば、機械から認証できるエンドポイントを用意できます。

### ゲートが有効か確かめる {#verifying-the-gate-is-on}

```bash
# Quick env-var path.
HERMES_DASHBOARD_OAUTH_CLIENT_ID=agent:test \
  hermes dashboard --host 0.0.0.0

# Or the equivalent via config.yaml (recommended for local dev / on-prem):
#
#   dashboard:
#     oauth:
#       client_id: agent:test
#
# then just:
hermes dashboard --host 0.0.0.0

# Hit /api/status to see the gate state:
curl -s http://127.0.0.1:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["nous"]
```

ダッシュボードの React 製 StatusPage でも、同じ項目が「Web server」の下に表示されます。サイドバーの AuthWidget は、サインイン後に現在の身元を表示します。

## Hermes Desktop を離れたバックエンドにつなぐ {#connecting-hermes-desktop-to-a-remote-backend}

Hermes Desktop は、別のマシン（VPS、自宅サーバー、Tailscale の内側にある Mini など）で動く Hermes のバックエンドを操作できます。アプリでは **Settings → Gateways → Remote gateway** にあり、**Remote URL** と **Sign in** の方法を尋ねられます。（デスクトップアプリ自体のインストール、設定、チャットについては [Hermes Desktop](/hermes/docs/user-guide/desktop/) のページを参照してください。）

離れたダッシュボードは同梱の認証プロバイダーのどれかで保護し、デスクトップアプリはバックエンドが提示しているプロバイダーでサインインします。自分のマシンの外から届くバックエンド — VPS、公開ホスト、インターネットに面したもの — では、**OAuth（Nous Portal）**が推奨です（[`hermes dashboard register`](#registering-a-dashboard) で登録し、*Sign in with Nous Research* でサインインします）。同梱の[ユーザー名とパスワードのプロバイダー](#usernamepassword-provider-no-oauth-idp)は、バックエンドが信頼できる LAN 上か VPN 越しにしか届かない場合にいちばん手早い選択肢ですが、**インターネットへの直接公開には適しません**。ダッシュボードをループバック以外のアドレスにバインドすると認証のゲートが有効になり、サインインしたあとは Desktop がそのセッションをチャットの WebSocket にも自動で使い回します。トークンをコピーして貼り付ける作業はありません。

以下の手順は、信頼できるネットワーク上でいちばん手早く立ち上がるユーザー名とパスワードの方式を使います。OAuth の方式については[既定のプロバイダー: Nous Research](#default-provider-nous-research) を参照してください。

### バックエンド側（離れたマシン）で {#on-the-backend-the-remote-machine}

```bash
# 1. Set the dashboard login credentials in ~/.hermes/.env (secrets file, 0600).
cat >> ~/.hermes/.env <<'EOF'
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=choose-a-strong-password
# Recommended: a stable signing secret so sessions survive restarts.
HERMES_DASHBOARD_BASIC_AUTH_SECRET=$(openssl rand -base64 32)
EOF
chmod 600 ~/.hermes/.env

# 2. Run the dashboard bound to a reachable address. The non-loopback bind
#    engages the auth gate; the username/password provider handles login.
hermes dashboard --no-open --host 0.0.0.0 --port 9119
```

平文を残したくない場合は、代わりに `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` に scrypt のハッシュを設定してください。設定できる項目の全体は[ユーザー名とパスワードのプロバイダー](#usernamepassword-provider-no-oauth-idp)を参照してください。

ダッシュボードを systemd のサービスとして動かす場合、ユニットに `EnvironmentFile=%h/.hermes/.env` があれば `~/.hermes/.env` は自動で読み込まれるので、起動時から資格情報が環境に入っています。

:::warning
ダッシュボードは `.env`（API キー、秘密情報）を読み書きし、エージェントのコマンドも実行できます。ここで示した**ユーザー名とパスワード**の構成は信頼できるネットワーク向けです。パスワードで守っただけのダッシュボードを、インターネットに直接さらしてはいけません。VPN の内側に置いてください。[Tailscale](https://tailscale.com/) がすっきりした選択肢です。マシンの tailscale の IP にバインドし（`--host <tailscale-ip>`）、`http://<tailscale-ip>:9119` を Remote URL にします。tailnet 上の端末からしか届きません。インターネット越しにバックエンドへ届かせたい場合は、代わりに **OAuth（Nous Portal）**のプロバイダーを使ってください。
:::

### Hermes Desktop 側で {#in-hermes-desktop}

**Settings → Gateways → Remote gateway:**

- **Remote URL** — `http://<backend-host>:9119`（リバースプロキシを前段に置けば `/hermes` のようなパスのプレフィックスも使えます）
- **Sign in** — アプリがユーザー名とパスワードのゲートウェイを検出して **Sign in** ボタンを表示します。クリックして手順 1 の資格情報を入力します
- **Save and reconnect** — デスクトップの画面を、離れたバックエンドに切り替えます

バックエンドで `HERMES_DASHBOARD_BASIC_AUTH_SECRET` を設定していれば、セッションは自動で更新され、再起動しても保たれます。

### 環境変数による上書き {#environment-variable-override}

アプリ内の設定を使わず、起動前に環境変数でバックエンドを指定することもできます。`HERMES_DESKTOP_REMOTE_URL` を設定すると、アプリに保存された URL より優先されます（Gateway の設定パネルに「env override」のバッジが出て、編集できなくなります）。この場合も、パネルからユーザー名とパスワードで **Sign in** します。

| 環境変数 | 値 |
|---------|-------|
| `HERMES_DESKTOP_REMOTE_URL` | `http://<backend-host>:9119` |

### つながらないとき {#troubleshooting}

- **「Remote gateway incomplete」** — リモートの URL を入力していません。
- **サインインが 401 や「Invalid credentials」で失敗する** — ユーザー名かパスワードが、バックエンドの `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` と一致していません。バックエンドは存在しないユーザーでも間違ったパスワードでも同じエラーを返すので、両方を確かめてください。ゲートの状態は `curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'` で確認できます。`true` と `"basic"` が返るはずです。
- **「Sign in」ボタンが出ず、セッショントークンを求められる** — ユーザー名とパスワードのプロバイダーが有効になっていません（`/api/status` に `"basic"` が出ません）。ユーザー名とパスワード（またはパスワードのハッシュ）が設定され、ダッシュボードのプロセスがそれを読み込んでいるか確かめてください。
- **再起動のたびにサインアウトされる** — `HERMES_DASHBOARD_BASIC_AUTH_SECRET` に固定の値を設定してください。設定しないと、起動のたびに署名鍵が作り直されます。
- **接続が拒否される・応答が返ってこない** — バックエンドが到達できるアドレスではなく `127.0.0.1`（既定）にバインドしているか、ファイアウォールや VPN がポートを塞いでいます。`0.0.0.0` か tailscale の IP にバインドし、信頼できるネットワークに対してポートを開けてください。

## CORS {#cors}

Web サーバーは CORS を localhost のオリジンだけに制限しています。

- `http://localhost:9119` / `http://127.0.0.1:9119`（本番）
- `http://localhost:3000` / `http://127.0.0.1:3000`
- `http://localhost:5173` / `http://127.0.0.1:5173`（Vite の開発サーバー）

独自のポートでサーバーを動かす場合は、そのオリジンが自動的に追加されます。

## 開発 {#development}

Web ダッシュボードのフロントエンドに手を入れる場合は次のようにします。

```bash
# Terminal 1: start the backend API
hermes dashboard --no-open

# Terminal 2: start the Vite dev server with HMR
cd web/
npm install
npm run dev
```

`http://localhost:5173` の Vite 開発サーバーは、`/api` へのリクエストを `http://127.0.0.1:9119` の FastAPI バックエンドに転送します。

フロントエンドは React 19、TypeScript、Tailwind CSS v4、shadcn/ui 風のコンポーネントで作られています。本番向けのビルドは `hermes_cli/web_dist/` に出力され、FastAPI のサーバーが静的な SPA として配信します。

## 更新時の自動ビルド {#automatic-build-on-update}

`hermes update` を実行すると、`npm` が使える環境では Web のフロントエンドも自動で再ビルドされます。これでダッシュボードがコードの更新に追従します。`npm` が入っていない場合、更新ではフロントエンドのビルドが飛ばされ、`hermes dashboard` の初回起動時にビルドされます。

## テーマとプラグイン {#themes-plugins}

ダッシュボードには 8 つのテーマが組み込まれており、独自のテーマ、プラグインのタブ、バックエンドの API ルートを追加して拡張できます。いずれも置くだけで動き、リポジトリを取ってくる必要はありません。

**テーマはその場で切り替えられます。** ヘッダーの、言語切り替えの隣にあるパレットのアイコンをクリックしてください。選んだテーマは `config.yaml` の `dashboard.theme` に保存され、次にページを開いたときに復元されます。

**フォントも同じ選択画面から個別に変えられます。** テーマ一覧の下にある **Font** の欄で、いま有効なテーマの UI フォントを上書きできます。この選択はテーマを切り替えても保たれます（`config.yaml` の `dashboard.font`）。**Theme default** を選ぶと解除され、有効なテーマ本来のフォントに戻ります。

組み込みのテーマ:

| テーマ | 雰囲気 |
|-------|-----------|
| **Hermes Teal**（`default`） | 濃いティール＋クリーム、システムフォント、ゆったりした余白 |
| **Hermes Teal (Large)**（`default-large`） | default と同じで、文字が 18px、余白がさらに広め |
| **Nous Blue**（`nous-blue`） | Nous らしい青のアクセントと、空気感のある余白 |
| **Midnight**（`midnight`） | 深い青紫、Inter ＋ JetBrains Mono |
| **Ember**（`ember`） | 温かみのある深紅＋ブロンズ、Spectral のセリフ体 ＋ IBM Plex Mono |
| **Mono**（`mono`） | グレースケール、IBM Plex、詰まった配置 |
| **Cyberpunk**（`cyberpunk`） | 黒地にネオングリーン、Share Tech Mono |
| **Rosé**（`rose`） | ピンク＋アイボリー、Fraunces のセリフ体、広めの余白 |

自分でテーマを作る、プラグインのタブを足す、画面の差し込み口に埋め込む、プラグイン独自の REST エンドポイントを公開する、といった話は **[Extending the Dashboard](/hermes/docs/user-guide/features/extending-the-dashboard/)** を参照してください。次の内容を網羅しています。

- テーマの YAML スキーマ — palette、typography、layout、assets、componentStyles、colorOverrides、customCSS
- レイアウトの種類 — `standard`、`cockpit`、`tiled`
- プラグインのマニフェスト、SDK、画面の差し込み口、ページ単位の差し込み口（組み込みのページを置き換えずにウィジェットを埋め込めます）、バックエンドの FastAPI ルート
- テーマとプラグインを組み合わせた通しの手順（Strike Freedom の cockpit デモ）
- 検出、再読み込み、うまくいかないときの対処
