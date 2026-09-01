---
title: "Hermes の管理画面"
description: "設定、API キー、MCP サーバー、メッセージ連携の紐付け、Webhook、ゲートウェイ、記憶、認証情報、セッション、ログ、集計、定時実行、スキルをブラウザから管理する画面です"
upstream_path: user-guide/features/web-dashboard.md
upstream_blob: e3a8bbff75c2889a1d7b9beb5d9af394896903ac
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard
---

# Hermes の管理画面 {#hermes-web-dashboard}

管理画面は、導入した Hermes Agent をブラウザから扱うための操作盤です。YAML を書き換えたり CLI のコマンドを打ったりしなくても、設定を変え、API キーを管理し、セッションの様子を見られます。

:::tip
ホスト型での認証には Nous Portal の OAuth を使います。管理画面から実際のバックエンドにもつなぎたい場合は、`hermes setup --portal` がモデルとツールのゲートウェイまで結線してくれます。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## 手早く使い始める {#quick-start}

```bash
hermes dashboard
```

これでローカルにウェブサーバーが立ち上がり、ブラウザで `http://127.0.0.1:9119` が開きます。管理画面はすべて手元の端末の中で動き、データが localhost の外へ出ることはありません。

### オプション {#options}

| フラグ | 既定 | 説明 |
|------|---------|-------------|
| `--port` | `9119` | ウェブサーバーを動かすポート |
| `--host` | `127.0.0.1` | 待ち受けるアドレス |
| `--no-open` | — | ブラウザを自動で開かない |
| `--insecure` | 無効 | **非推奨・何もしません。** かつては loopback 以外に割り当てたときの認証を素通りさせるものでしたが、今は認証を無効にしません。loopback 以外に割り当てた場合は、つねに認証のしくみ（パスワードか OAuth）が要ります |
| `--isolated` | 無効 | 名前付きのプロファイルから起動したとき（`worker dashboard`）、端末共通の管理画面へ回さず、そのプロファイル専用のサーバーを動かします |

```bash
# Custom port
hermes dashboard --port 8080

# Bind to all interfaces (use with caution on shared networks)
hermes dashboard --host 0.0.0.0

# Start without opening browser
hermes dashboard --no-open
```

## 複数のプロファイルを扱う {#managing-multiple-profiles}

管理画面は**端末ごと**の操作盤です。1つのサーバーが、その端末にある
[プロファイル](/hermes/docs/user-guide/profiles/)すべてを管理します。横の欄にあるプロファイルの
切り替え（プロファイルが2つ以上あるときに現れます）で、管理のページが読み書きする
プロファイルが決まります。設定、API キー、スキル、
MCP、モデル、そしてチャットのタブが、すべてこれに従います。管理画面自身のもの以外の
プロファイルを選んでいるあいだは、琥珀色の帯が管理中のプロファイル名を出すので、
どこに書き込まれるのか分からなくなることはありません。

選んだプロファイルは URL に入るので（`?profile=<name>`）、
`http://127.0.0.1:9119/skills?profile=worker` のような深い場所へのリンクを開くと切り替えが
選ばれた状態になり、再読み込みしても保たれます。

プロファイルの別名から管理画面を起動すると、2つ目のサーバーを立てるのではなく、
端末共通の管理画面へつながります。

```bash
worker dashboard
# → already running: opens the browser at ?profile=worker
# → not running:     starts the machine dashboard with "worker" preselected
```

`--isolated` を付けると、この動きをやめて、そのプロファイルだけを対象にした専用の
サーバーを動かせます（一本化する前の動きです。プロファイルごとの管理画面を、
わざと別々の認証で公開したいときに役立ちます）。

**チャット**のタブも切り替えに従います。プロファイルを絞ったチャットは、選んだ
プロファイルの `HERMES_HOME` を渡して PTY の子プロセスを起こすので、そのプロファイルの
モデル・スキル・記憶・セッション履歴で会話が進みます。プロファイルを切り替えると、
新しいターミナルのセッションが始まります。

切り替えが吸収しない、プロファイルごとのままのもの。ゲートウェイのプロセス
（`hermes -p <name> gateway …` で扱ってください）、プロファイルごとの
セッションのデータベース、そして定時実行の仕組み（定時実行のページは、すでに
プロファイルをまたいでまとめ、独自の絞り込みを持っています）。

## 前もって要るもの {#prerequisites}

既定の `hermes-agent` の導入では、HTTP まわりの部品も PTY の補助も入りません。どちらも追加で入れるものです。**管理画面**には FastAPI と Uvicorn（`web` の追加分）が要ります。**チャット**のタブでは、疑似端末の後ろで TUI を起こすために `ptyprocess` も要ります（POSIX では `pty` の追加分）。両方まとめて入れるには次のようにします。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"
```

`web` の追加分は FastAPI と Uvicorn を、`pty` の追加分は `ptyprocess`（POSIX）または `pywinpty`（Windows 本体。ただし埋め込みの TUI 自体はやはり WSL が要ります）を連れてきます。`cd ~/.hermes/hermes-agent && uv pip install -e ".[all]"` は両方を含むので、メッセージ連携や音声なども使いたいなら、これがいちばん手軽です。

依存するものを入れずに `hermes dashboard` を実行すると、何を入れればよいか教えてくれます。画面側がまだ組み立てられておらず `npm` が使えるなら、最初の起動時に自動で組み立てられます。

チャットのタブは `hermes dashboard` の起動につねに付いてきます。ブラウザに埋め込まれたチャットの面（PTY と WebSocket ごしに TUI を動かすもの）は、追加のフラグなしでいつでも使えます。

## ページ {#pages}

### 状況 {#status}

最初に開くページには、導入したものの今の様子がまとめて出ます。

- **エージェントの版**と公開日
- **ゲートウェイの状態** — 動作中か停止中か、PID、つながっているプラットフォームとその状態
- **動いているセッション** — 直近5分に動きのあったセッションの数
- **最近のセッション** — 直近20件の一覧。モデル、メッセージ数、トークンの使用量、会話の冒頭が見えます

状況のページは5秒ごとに自動で読み直します。

#### 資源のひっ迫を知らせる帯 {#resource-pressure-banner}

動かしている端末のメモリやディスクが乏しくなると、管理画面の上部に帯が現れます
（状況の読み取りと同じ経路で運ばれるので、余分な通信は増えません）。

- **「エージェントのメモリがほとんど残っておらず、再起動するかもしれません」** — システムの
  空きメモリが *注意* の水準（128 MiB 未満、または 15% 未満）や *危険* の水準
  （64 MiB 未満、または 5% 未満）まで下がったときです。ゲートウェイが30秒ごとに送る
  鼓動から拾っています。
- **「エージェントが予期せず再起動しました。メモリ不足の可能性が高いです」** — 前回の
  起動で、メモリがひっ迫した状態のまま行儀の悪い終わり方をしたことが、
  生存記録に残っている場合です（OOM で落とされた疑い）。
- **ディスクの警告** — `~/.hermes` が置かれているボリュームがほぼ満杯です
  （空きが 512 MB を切ると *注意*、256 MB を切ると *危険*）。

同時に出るのは、いちばん重い警告ひとつだけです（ディスク危険 > メモリ危険 >
OOM による再起動 > ディスク注意 > メモリ注意）。閉じたことは今のゲートウェイの起動中だけ
覚えられます。ひとつ閉じると次の警告が出ますし、ゲートウェイの再起動や段の繰り上がり
（注意 → 危険）でまた開きます。鼓動が古びているときは、あてにならない警告を出さずに
何も表示しません。

### チャット {#chat}

**チャット**のタブには、Hermes の TUI がまるごと（`hermes --tui` で出るものと同じ画面が）ブラウザに埋め込まれます。ターミナルの TUI でできること、つまりスラッシュコマンド、モデルの選択、ツール呼び出しの札、マークダウンの流し込み、確認や sudo や承認のやり取り、見た目の切り替えは、ここでもそっくり同じに動きます。管理画面が本物の TUI を動かし、その ANSI の出力を [xterm.js](https://xtermjs.org/) の WebGL 描画で、升目のずれなく描いているからです。

**しくみ:**

- `/api/pty` が、管理画面のセッションの合鍵で認証された WebSocket を開きます
- サーバーが POSIX の疑似端末の後ろで `hermes --tui` を起こします
- 打鍵は PTY へ届き、ANSI の出力がブラウザへ流れ戻ります
- xterm.js の WebGL 描画が升目をピクセル単位の格子に描きます。マウスの追跡（SGR 1006）、全角文字（Unicode 11）、罫線の字形が、そのまま正しく出ます
- ブラウザの窓の大きさを変えると、`@xterm/addon-fit` を通して TUI の大きさも変わります

**続きから始める:** **セッション**のタブで、どれかのセッションの横にある再生の印（▶）を押します。すると `/chat?resume=<id>` へ移り、`--resume` を付けて TUI が立ち上がり、履歴がすべて読み込まれます。

**セッションの切り替え（右の細い欄）:** チャットのタブは、ターミナルの横の細い欄に、ChatGPT のような会話の一覧を持っています。ページを離れずに会話を移れます。欄の上にモデルの選択、その下にセッションの一覧が並び、画面のほとんどはターミナルが占めます。一覧には、選んでいるプロファイルの最近のセッションが出ます。題名（なければメッセージの冒頭）、最後に動いた時刻の相対表示、メッセージ数、そして CLI 以外のセッションではどの経路から来たかが見えます。どれかの行を押すとその場で続きから始まり（ターミナルがその会話の履歴を持って立ち上がり直します）、いま動いているセッションは目立つように示されます。**新しいチャット**で新しいセッションを始められ、読み直しの操作で一覧を取り直せます。この欄は切り替えのためだけのもので、削除・名前の変更・書き出し・まとめての片づけは、これまでどおり**セッション**のタブにあります。画面が狭いときは、横から出てくる面に畳まれます。

**前もって要るもの:**

- Node.js（`hermes --tui` と同じ条件です。TUI の一式は最初の起動時に組み立てられます）
- `ptyprocess` — `pty` の追加分で入ります（`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`、または `[all]` で両方まかなえます）
- POSIX の中核（Linux、macOS、WSL2）。`/chat` のターミナルの面だけは POSIX の PTY が要ります。Windows 本体の Python には同じものがないので、Windows に直接入れた場合、管理画面のほかの部分（セッション、仕事、計測、設定の編集）は動きますが、`/chat` のタブにはその機能には WSL2 を使うようにという帯が出ます。

ブラウザのタブを閉じれば、サーバー側の PTY はきれいに片づけられます。開き直すと新しいセッションが立ち上がります。

自前のバックエンドの代わりに、別の端末で動いている管理画面へ [Hermes デスクトップ版](#connecting-hermes-desktop-to-a-remote-backend)を向けたい場合は、下の離れたバックエンドの節を参照してください。

### Hermes デスクトップ版を離れたバックエンドにつなぐ {#connecting-hermes-desktop-to-a-remote-backend}

Hermes デスクトップ版はふだん自分のバックエンドを立ち上げますが、離れた端末（仮想機械や自宅のサーバーなど）で動いている管理画面につなぐこともできます。**設定 → ゲートウェイ → 離れたゲートウェイ**から行います。「デスクトップ版はバックエンドの準備ができたと言うのにチャットがつながらない」という報告のいちばん多い原因がここです。デスクトップ版の準備確認は、実際のチャットの接続が必要とするものより少ない範囲しか見ていないからです。

:::info 前提: 離れた端末で `hermes dashboard` が動いていること
デスクトップ版がつなぐ「離れたバックエンド」とは、離れた端末で動いている `hermes dashboard` のプロセス**そのもの**です。このページで説明しているサーバーと同じものです。下の手順はどれも、それが動いていて届くようになっていて初めて意味を持ちます。デスクトップ版はそこにつなぐだけで、代わりに立ち上げてはくれません。ログアウトや再起動をまたいで残るよう、`systemd` や `tmux` などの下で動かし続けてください。**ゲートウェイ**（Telegram / Discord / Slack など）は*別の*長く動き続けるプロセスです。メッセージ連携の経路を使うなら、それは独立に立ち上げてください。デスクトップ版がつなぐ相手ではありません。
:::

デスクトップ版の「離れたバックエンドの準備ができた」という確認は `GET /api/status` を叩くだけで、これは誰でも触れる入口です。その端末で*何らかの*管理画面が動いていれば、すぐ応えてしまいます。実際のチャットの接続は `/api/ws`（と `/api/pty`）への**別の** WebSocket で、この通り道には、状況の確認がまったく触れない検査があと2つ待ち構えています。

1. **認証を通っていること。** 管理画面が loopback 以外のアドレスに割り当てられていると、認証の関門が働きます。利用者名とパスワードで守ってください（同梱の[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)）。デスクトップ版は一度サインインし、その結果できたセッションを、使い捨ての引換券を通して WebSocket でも使い回します。しくみを設定していないと、loopback 以外に割り当てた管理画面は**起動の時点で閉じて止まります**。
2. **割り当てたアドレスがその相手を通し、Host のヘッダーと一致すること。** loopback（`127.0.0.1`）への割り当ては loopback の相手しか受け付けないので、資格情報が正しくても、離れた端末はソケットの段階で断られます。loopback 以外のアドレス（`--host 0.0.0.0`）に割り当てて、相手の IP を見る守りが通してくれるようにしてください。デスクトップ版に入れる離れた URL は、割り当てたのと同じ名前で管理画面に届くものでなければなりません。DNS の付け替えを防ぐ守りが、Host のヘッダーの一致を求めるからです。

#### 離れた管理画面の準備 {#remote-dashboard-setup}

利用者名とパスワードを決めてから、届くアドレスに割り当てて管理画面を動かします。`systemd` のサービスなら次のようにします。

```ini
[Service]
EnvironmentFile=%h/.hermes/.env
ExecStart=/path/to/venv/bin/python -m hermes_cli.main dashboard \
    --host 0.0.0.0 --port 9119 --no-open
```

`~/.hermes/.env` の中身はこうです。

```bash
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=choose-a-strong-password
HERMES_DASHBOARD_BASIC_AUTH_SECRET=<32+ random bytes; openssl rand -base64 32>
```

あとはデスクトップ版で**離れた URL**（たとえば `http://VM_IP:9119`）を入れ、その利用者名とパスワードで**サインイン**します。設定できる項目の全体は[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)の節を参照してください。

:::tip デスクトップ版で試し直す前に関門が働いているか確かめる
どの端末からでも、管理画面が利用者名とパスワードのしくみを名乗っているか確認できます。

```bash
curl -s http://VM_IP:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["basic"]
```

- `auth_required: true` で一覧に `"basic"` がある → デスクトップ版の**サインイン**は通ります。
- `auth_required: false` → loopback に割り当てられているか、関門が働いていません。loopback 以外のアドレスに割り当ててください。
- `auth_required: true` なのに `"basic"` がない → 利用者名とパスワードの環境変数が読み込まれていません。まずそこを直してください。
:::

`/api/status` が `"basic"` 付きで関門ありと示しているのに、サインインしてもデスクトップ版が*まだ*つながらないなら、基本の準備より先に原因があります。同じやり直しの時間帯の `desktop.log`（設定 → ゲートウェイ → ログを開く）と管理画面のログをそろえて取り、`/api/ws` の切断コードを探してください（4403 は要求の検査でチャットの WebSocket が断られたもの、たとえば Host や相手の不一致です。4401 は WebSocket の引換券が認証を通らなかったものです）。

### 設定 {#config}

`config.yaml` をフォームで編集する画面です。150 を超える設定の項目はすべて `DEFAULT_CONFIG` から自動で拾われ、タブに分けて並びます。

![設定の管理ページ — 左に区分の絞り込み、右に自動で拾われた項目](https://hermes-agent.nousresearch.com/img/dashboard/admin-config.png)

- **model** — 既定のモデル、提供元、ベース URL、推論の設定
- **terminal** — 実行の土台（local / docker / ssh / modal）、待ち時間の上限、シェルの好み
- **display** — 見た目、ツールの進み具合、続きから始めるときの表示、待ち回しの設定
- **agent** — 繰り返しの上限、ゲートウェイの待ち時間、サービスの階級
- **delegation** — 下請けエージェントの上限、推論にかける手間
- **memory** — 記憶のしくみの選択、文脈への差し込みの設定
- **approvals** — 危ないコマンドの承認のしかた（smart / manual / off）
- ほかにも — config.yaml のどの区分にも対応する項目があります

とりうる値が決まっている項目（実行の土台、見た目、承認のしかたなど）は選択式になります。真偽の値は切り替えのつまみになります。それ以外は文字の入力欄です。

**できること:**

- **保存** — 変更をすぐ `config.yaml` に書き込みます
- **既定に戻す** — すべての項目を既定の値に戻します（保存を押すまで書き込まれません）
- **書き出し** — 今の設定を JSON として取り出します
- **読み込み** — JSON の設定ファイルを渡して、今の値を置き換えます

:::tip
設定の変更は、次のエージェントのセッションか、ゲートウェイの再起動から効きます。管理画面が編集するのは、`hermes config set` やゲートウェイが読むのと同じ `config.yaml` です。
:::

### API キー {#api-keys}

API キーや資格情報を収めている `.env` を扱います。キーは種類ごとにまとめられています。

- **LLM の提供元** — OpenRouter、Anthropic、OpenAI、DeepSeek など
- **ツールの API キー** — Browserbase、Firecrawl、Tavily、Keenable、ElevenLabs など
- **メッセージ連携のプラットフォーム** — Telegram、Discord、Slack のボットの合鍵など
- **エージェントの設定** — `API_SERVER_ENABLED` のような、秘密ではない環境変数

キーごとに次のものが見えます。
- いま設定されているかどうか（値は伏せた形で少しだけ見えます）
- 何のためのものかの説明
- 提供元の登録・キー発行のページへのリンク
- 値を入れたり更新したりする入力欄
- 消すためのボタン

込み入ったもの・めったに使わないものは、既定では切り替えの裏に隠れています。

### セッション {#sessions}

エージェントのセッションをすべて見て回れます。各行には、セッションの題名、どこから来たかの印（CLI、Telegram、Discord、Slack、定時実行）、モデル名、メッセージ数、ツール呼び出しの数、最後に動いてからの時間が出ます。生きているセッションには、脈打つ印が付きます。

- **絞り込み** — **チャット / 自動 / すべて**のタブで範囲が決まります。*チャット*（既定）は人との会話だけを出し、自動のもの（定時実行、ツール、API、ACP のセッション）を隠します。*自動*はそれだけを出します。*すべて*は全部を出します。さらに、どこから来たかを選ぶ一覧で、1つの経路だけに絞れます（たとえば Telegram だけ）。検索は今の絞り込みに従います。
- **検索** — FTS5 を使って、すべてのメッセージの中身を全文で探します。結果には目立たせた抜粋が出て、開くと最初に一致したメッセージまで自動で送られます。
- **数字** — 上のまとめの帯に、セッションの総数、記録の中で生きている数、保管された数、メッセージの総数、そしてどこから来たかの内訳が出ます。
- **開く** — セッションを押すと、メッセージの履歴がすべて読み込まれます。メッセージは役割ごと（利用者、アシスタント、システム、ツール）に色分けされ、マークダウンとして描かれ、コードには色が付きます。
- **ツール呼び出し** — ツールを呼んだアシスタントのメッセージには、関数名と JSON の引数を畳める形で見せる塊が付きます。
- **名前の変更** — その場でセッションの題名を付けたり消したりできます（鉛筆の印）。
- **書き出し** — セッション（付帯する情報とメッセージの履歴すべて）を JSON として取り出せます（下向きの印）。
- **古いものの片づけ** — 見出しにある「古いセッションを片づける」で、終わってから N 日を過ぎたセッションを消せます。
- **削除** — ごみ箱の印で、セッションとそのメッセージの履歴を消せます。

![セッションの管理ページ — 数字の帯、片づけ、行ごとの名前の変更 / 書き出し / 削除](https://hermes-agent.nousresearch.com/img/dashboard/admin-sessions.png)

### ログ {#logs}

エージェント、ゲートウェイ、エラーのログを、絞り込みや追いかけ表示つきで見られます。

- **ファイル** — `agent`、`errors`、`gateway` のログを切り替えます
- **段階** — ログの段階で絞ります。ALL、DEBUG、INFO、WARNING、ERROR
- **部位** — どこから出たかで絞ります。all、gateway、agent、tools、cli、cron
- **行数** — 表示する行数を選びます（50、100、200、500）
- **自動の読み直し** — 5秒ごとに新しい行を拾う追いかけ表示を、入り切りできます
- **色分け** — 重さに応じて行に色が付きます（エラーは赤、警告は黄、詳細は薄く）

### 集計 {#analytics}

セッションの履歴から出した、使用量と費用の集計です。期間（7日、30日、90日）を選ぶと次のものが見えます。

- **まとめの札** — トークンの総数（入力 / 出力）、キャッシュの当たり率、見積もりまたは実際の費用の合計、セッションの総数と1日あたりの平均
- **日ごとのトークンの図** — 日ごとの入力と出力のトークンを積み上げた棒の図。ポインタを重ねると内訳と費用が出ます
- **日ごとの内訳の表** — 日付、セッション数、入力トークン、出力トークン、キャッシュの当たり率、費用
- **モデルごとの内訳** — 使ったモデルごとの、セッション数、トークンの使用量、見積もりの費用

### 定時実行 {#cron}

決まった間隔でエージェントへの指示を走らせる、定時実行の仕事を作って管理します。

- **作成** — 名前（省いても可）、指示、cron の書き方（たとえば `0 9 * * *`）、届け先（手元、Telegram、Discord、Slack、メール）を埋めます
- **仕事の一覧** — 各仕事に、名前、指示の冒頭、時刻の書き方、状態の印（有効 / 休止 / エラー）、届け先、前回の実行時刻、次回の実行時刻が出ます
- **休止 / 再開** — 仕事を動く状態と休みの状態で切り替えます
- **編集** — すでに入った値の入った小窓を開き、仕事の指示、時刻、名前、届け先を変えられます
- **今すぐ実行** — 決まった時刻を待たずに、その場で走らせます
- **削除** — 定時実行の仕事を完全に取り除きます

### プロファイル {#profiles}

[プロファイル](/hermes/docs/user-guide/profiles/)、つまり設定もスキルもセッションも別々に持つ Hermes を作って管理します。

- **プロファイルの札** — それぞれに、モデルと提供元、スキルの数、ゲートウェイの状態、説明、印（動作中、既定、別名）が出ます
- **作成** — 名前と、任意で「既定から複製」「まるごと複製」「同梱のスキルなし」、説明、モデルを指定します。専用のプロファイル作成のページ（`/profiles/new`）では、モデル・MCP・スキルまで含めた一通りの流れが使えます
- **スキルとツールを扱う** — そのプロファイルに絞ったスキルのページへ移ります（横の欄のプロファイルの切り替えもそこに合わせます）
- **これを動作中にする** — **この先の CLI やゲートウェイの実行**が拾う、貼り付いた既定を切り替えます（`hermes profile use` と同じです）。管理画面が扱う対象は*変わりません*。そちらはプロファイルの切り替えの役目です
- **モデル / 説明 / SOUL を編集** — その場で編集して、そのプロファイルに書き込みます
- **名前の変更 / 削除** — 名前付きのプロファイルだけが対象です

### スキル {#skills}

入っているスキルとツールの束を見て、探して、入り切りできます。ハブから新しいものを入れることもできます。スキルは `~/.hermes/skills/` から読み込まれ、種類ごとにまとめられます。

- **検索** — 入っているスキルとツールの束を、名前・説明・種類で絞ります
- **種類での絞り込み** — 種類の札を押して一覧を狭めます（MLOps、MCP、Red Teaming、AI など）
- **入り切り** — スキルごとにつまみで有効・無効を切り替えます。次のセッションから効きます。
- **ツールの束** — 別の見方では、組み込みのツールの束（ファイル操作、ウェブの閲覧など）が、動いているかどうか、準備に何が要るか、どのツールを含むかとともに出ます
- **ハブを見て回る** — 3つ目の見方では、すべての出どころを横断してスキルのハブを探せます（`hermes skills search` と同じです）。見つかったものは識別子を指定して入れられ、その場で導入のログが流れます。入っているスキルをまとめて新しくする「すべて更新」のボタンもあります。

![スキルの管理ページ — ハブを見て回る画面。検索、導入、更新](https://hermes-agent.nousresearch.com/img/dashboard/admin-skills-hub.png)

### MCP {#mcp}

CLI を使わずに [MCP](/hermes/docs/user-guide/features/mcp/) のサーバーを扱えます。`hermes mcp` が読むのと同じ、
`config.yaml` の `mcp_servers` の塊を触ります。

**自分の MCP サーバー:**

- **追加** — HTTP / SSE のサーバー（URL）か、stdio のサーバー（コマンドと引数）を登録します。stdio のサーバーには `KEY=VALUE` の環境変数も付けられます
- **有効 / 無効** — 消さずにサーバーを入り切りします。無効にしたサーバーも設定に残るので、あとで戻せます。次のゲートウェイの再起動から効きます。
- **試す** — サーバーにつなぎ、持っているツールを並べ、切ります。エージェントが頼る前に、つながることを確かめられます
- **取り除く** — 設定からサーバーを消します
- 秘密らしい形の環境変数の値は、一覧では伏せられます

**カタログ:** Nous が認めた MCP サーバー（同梱の `optional-mcps/` の
カタログ）を見て回り、どれでもひと押しで入れられます。API キーが要るものは
その場で入力を求められ、値は `.env` へ入ります。`hermes mcp catalog` や
`hermes mcp install` が使うのと同じカタログです。

![MCP の管理ページ — 自分のサーバーと有効・無効の切り替え、それに導入のカタログ](https://hermes-agent.nousresearch.com/img/dashboard/admin-mcp.png)

### Webhook {#webhooks}

その都度作る [Webhook の受け口](/hermes/docs/user-guide/messaging/webhooks/)を扱います。先に
メッセージ連携の設定で Webhook のプラットフォームを有効にしておく必要があり、そうでない場合は
その旨が出ます。

- **作成** — 名前、説明、拾う出来事の条件、届け先、任意で直接届ける形、そしてエージェントへの指示を決めます。作ると、その場で経路の URL と、一度きりしか見えない HMAC の秘密が出るので写しておきます。
- **有効 / 無効** — 受け口を入り切りします。無効にした経路も購読のファイルには残りますが、ゲートウェイは入ってきた出来事を断ります（403）。ゲートウェイはファイルを動いたまま読み直すので、次の出来事から効きます。再起動は要りません。
- **一覧** — 受け口ごとに、URL、拾う出来事、届け先が出ます
- **削除** — 受け口を取り除きます

![Webhook の管理ページ — 受け口と有効・無効の切り替え](https://hermes-agent.nousresearch.com/img/dashboard/admin-webhooks.png)

### 紐付け {#pairing}

CLI を使わずに、メッセージ連携の利用者を認めたり取り消したりできます。離れたところにいる
管理者が、紐付け済みのゲートウェイに Telegram や Discord などの利用者を迎え入れる道です。
`hermes pairing` と同じことができます。

- **待っている申し込み** — それぞれにプラットフォーム、合言葉、利用者、経過時間が出て、承認のボタンが付きます
- **認めた利用者** — それぞれにプラットフォームと利用者が出て、取り消しのボタンが付きます
- **待ちを空にする** — 残っている紐付けの合言葉をすべて捨てます

![紐付けの管理ページ](https://hermes-agent.nousresearch.com/img/dashboard/admin-pairing.png)

### 経路 {#channels}

ブラウザから、どのメッセージ連携のプラットフォームにも Hermes をつなげます。
`hermes setup gateway` と同じことができます。このページには、対応しているすべての経路
（Telegram、Discord、Slack、Matrix、Mattermost、WhatsApp、Signal、BlueBubbles / iMessage、
メール、SMS / Twilio、DingTalk、Feishu / Lark、WeCom、WeChat、QQ Bot、Yuanbao、それに
API サーバーと Webhook の受け口）が、今つながっているかどうかとともに並びます。

- **設定** — プラットフォームごとに、その経路に要る項目だけが並ぶ入力の面が開きます（ボットの合鍵、アプリの合鍵、サーバーの URL、通す相手の一覧など）。秘密はパスワードの入力欄として描かれ、伏せた形で収められます。空のままにした項目は、今の値がそのまま残ります。必須の項目には印が付き、確かめられます。「設定の手引き」のリンクから、そのプラットフォームの資格情報の説明へ行けます。
- **有効 / 無効** — 経路を入り切りします。資格情報はディスクに残り、動いているかどうかだけが変わります。
- **試す** — その経路が設定されていて、有効になっていて、ゲートウェイから見て生きているかを確かめます。
- **ゲートウェイの再起動** — 資格情報は `~/.hermes/.env` に、有効かどうかの印は `config.yaml` に書かれます。ゲートウェイは次に再起動したときに、有効な経路それぞれにつなぎます。その再起動はこのページから直接かけられます。

![経路の管理ページ — すべてのメッセージ連携のプラットフォームと、状態、有効の切り替え、プラットフォームごとの設定の面](https://hermes-agent.nousresearch.com/img/dashboard/admin-channels.png)

### システム {#system}

導入したもの全体にかかわる操作を、ひとつにまとめた画面です。

- **端末** — 今のシステムの様子。OS と中核、命令の型、端末名、Python と Hermes の版、CPU の芯の数と使用率、メモリ、Hermes の置き場のディスク使用量、稼働時間、負荷の平均。（CPU・メモリ・ディスクは `psutil` が入っているときに出ます。素性の項目はつねに出ます。）Hermes の版には**更新の状態を示す印**（最新 / N コミット遅れ）と**更新を確認**のボタンが付きます。git で入れていて更新があるときは、**今すぐ更新**のボタンが確認の小窓を開き、いくつのコミットを取り込むかを見せてから、後ろで `hermes update` を走らせます。Docker や Nix で入れた場合、管理画面はその場で更新をあてられないので、代わりに外から打つべき正しいコマンドを出します。
- **Nous Portal** — ログインの状態、いま使っている推論の提供元、そしてツールゲートウェイの割り振り表（どのツールが Portal 経由で、どれが手元で動くか）。契約を扱うページへのリンクも付きます。`hermes portal` を読むだけの形で映したものです。
- **スキルの世話役** — 裏で動くスキルの手入れの状態（動作中 / 休止、間隔、前回の実行）と、休止・再開、今すぐ実行のボタン。`hermes curator` を映したものです。
- **ゲートウェイ** — メッセージ連携のゲートウェイの開始・停止・再起動。今の状態（動作中か停止中か、PID、状態）も見えます
- **記憶** — 外部の記憶のしくみを選び（組み込みだけにもできます）、組み込みの `MEMORY.md` と `USER.md` を白紙に戻せます
- **認証情報の束** — エージェントが順ぐりに使う API キーを、提供元ごとに足したり外したりします。一覧では値が伏せられ、素の値はエージェントにしか渡りません。
- **操作** — `doctor` の実行、安全性の点検、控えの作成、控えからの復元、スキルの更新、システムへの指示文の大きさの内訳の表示、支援用の一式の書き出し、退役した設定の移し替え。どれも裏で走る処理を起こし、そのログがこのページへ流れ込みます。
- **通過点** — `/rollback` の影の記録の大きさを見て、片づけます
- **シェルのフック** — 設定されたフックを、同意の有無と実行できるかどうかとともに並べ、フックを**作り**（出来事、コマンド、条件、待ち時間の上限、そして同意を与えるかどうか）、外します。フックは任意のコマンドを走らせるので、作成の面には安全上の警告が付き、同意を与えるまでフックは動きません。

![システムの管理ページ — 端末の様子と Nous Portal の状態](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-top.png)

![システムの管理ページ — スキルの世話役、ゲートウェイ、記憶、認証情報の束](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-curator.png)

![システムの管理ページ — 操作、通過点、シェルのフック](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-ops.png)

シェルのフックを作るところ（同意の確認欄と、任意のコマンドが走るという警告に注目してください）。

![新しいシェルのフックの小窓](https://hermes-agent.nousresearch.com/img/dashboard/admin-hook-create.png)

:::warning セキュリティ
管理画面は、API キーや秘密の入った `.env` を読み書きします。既定では `127.0.0.1` に割り当てられ、手元の端末からしか触れず、ログインも要りません。loopback 以外のアドレス（`0.0.0.0` を含みます）に割り当てると[認証の関門](#authentication-gated-mode)が働き、認証のしくみ（利用者名とパスワード、または OAuth）を設定するまでサーバーは起動しません。
:::

## `/reload` スラッシュコマンド {#reload-slash-command}

管理画面の変更では、対話式の CLI に `/reload` のスラッシュコマンドも加わりました。管理画面で API キーを変えたあと（あるいは `.env` を直に書き換えたあと）、動いている CLI のセッションで `/reload` を打つと、立ち上げ直さずに変更を拾えます。

```
You → /reload
  Reloaded .env (3 var(s) updated)
```

これは `~/.hermes/.env` を、動いているプロセスの環境に読み直します。管理画面で新しい提供元のキーを足して、すぐ使いたいときに便利です。

## REST の API {#rest-api}

管理画面は、画面側が使う REST の API を備えています。自動化のために、これらの入口を直に叩くこともできます。

:::tip プロファイルを絞れる入口
管理のための入口の一群、つまり `/api/config`、`/api/env`、`/api/skills`、
`/api/tools/toolsets`、`/api/mcp`、`/api/model/{info,options,auxiliary,set}` は、
任意の `?profile=<name>` というクエリの項目（書き込みでは JSON の中身の `"profile"`）を
受け取り、読み書きをそのプロファイルの `HERMES_HOME` に向けます。
省くと管理画面自身のプロファイルになります。知らない名前を渡すと `404` が返ります。
`/api/pty` の WebSocket も同じ項目を受け取り、選んだプロファイルでチャットを起こします。
:::

### GET /api/status {#get-apistatus}

エージェントの版、ゲートウェイの状態、プラットフォームの状態、動いているセッションの数を返します。

返り値には、参考として資源の様子を伝える塊も2つ入っています（`components` や `overall` の
健康の判定には影響しません）。

- **`memory`** — ゲートウェイの30秒ごとの鼓動と、生存記録から絞り出したものです。
  項目は `pressure`（`ok` / `elevated` / `critical` /
  `unknown`）、`gateway_rss_mb`、`system_total_mb`、`system_available_mb`、
  `swap_used_mb`、`sampled_at`、`boot_id`、`last_boot_unclean`、
  `last_boot_suspected_oom`。ひっ迫は、システムの空きメモリが 128 MiB（または 15%）を
  切ると `elevated`、64 MiB（または 5%）を切ると `critical` になります。行儀の悪い終わり方が
  OOM で落とされた疑いと見なされるのと同じ水準です。150 秒より古い（あるいは未来の日付の）
  鼓動は、数字はそのままに `pressure` だけ `unknown` へ落とします。死んだゲートウェイの
  最後の標本が、生きた値のふりをできないようにするためです。
- **`disk`** — `~/.hermes` が置かれているボリュームを、`shutil.disk_usage()` でその場で
  測ったものです。項目は `pressure`、`free_mb`、`total_mb`、`used_percent`、
  `sampled_at`。ひっ迫は、空きが 512 MB を切る（または使用率 85% 以上で
  残り 4 GB 未満）と `elevated`、256 MB を切る（または使用率 95% 以上で
  残り 1 GB 未満）と `critical` になります。

どちらの採取も安全側に倒れます。測るときに何か失敗しても、状況の入口ごと失敗させるのではなく、
その塊を `{"pressure": "unknown"}` に落とします。`/api/status` は誰でも触れるので、
数字は粗いもの（MB 単位、パーセント単位）です。

### GET /api/sessions {#get-apisessions}

直近20件のセッションを、付帯する情報（モデル、トークン数、時刻、冒頭）とともに返します。

### GET /api/config {#get-apiconfig}

今の `config.yaml` の中身を JSON で返します。

### GET /api/config/defaults {#get-apiconfigdefaults}

設定の既定値を返します。

### GET /api/config/schema {#get-apiconfigschema}

設定のすべての項目について、型・説明・区分・選べる値（あるもの）を書いた図式を返します。画面側はこれを見て、項目ごとに正しい入力の部品を描きます。

### PUT /api/config {#put-apiconfig}

新しい設定を保存します。中身は `{"config": {...}}` です。

### GET /api/env {#get-apienv}

知られている環境変数をすべて、設定済みかどうか、伏せた値、説明、区分とともに返します。

### PUT /api/env {#put-apienv}

環境変数を設定します。中身は `{"key": "VAR_NAME", "value": "secret"}` です。

### DELETE /api/env {#delete-apienv}

環境変数を取り除きます。中身は `{"key": "VAR_NAME"}` です。

### GET /api/sessions/\{session_id\} {#get-apisessionssessionid}

1つのセッションに付帯する情報を返します。

### GET /api/sessions/\{session_id\}/messages {#get-apisessionssessionidmessages}

メッセージの履歴を、ツール呼び出しと時刻も含めて、区切って返します。既定では最新の500件を古い順に返します。はっきり区切りたいときは `limit`（最大500）、`offset`、`order=oldest|latest` を使います。

### GET /api/sessions/search {#get-apisessionssearch}

メッセージの中身を全文で探します。クエリの項目は `q` です。一致したセッションの ID と、目立たせた抜粋を返します。

### DELETE /api/sessions/\{session_id\} {#delete-apisessionssessionid}

セッションとそのメッセージの履歴を消します。

### GET /api/logs {#get-apilogs}

ログの行を返します。クエリの項目は `file`（agent / errors / gateway）、`lines`（行数）、`level`、`component` です。

### GET /api/analytics/usage {#get-apianalyticsusage}

トークンの使用量、費用、セッションの集計を返します。クエリの項目は `days`（既定は30）です。返り値には日ごとの内訳とモデルごとの合計が入ります。

### GET /api/cron/jobs {#get-apicronjobs}

設定されている定時実行の仕事を、状態・時刻・実行の履歴とともにすべて返します。

### POST /api/cron/jobs {#post-apicronjobs}

定時実行の仕事を新しく作ります。中身は `{"prompt": "...", "schedule": "0 9 * * *", "name": "...", "deliver": "local"}` です。

### POST /api/cron/jobs/\{job_id\}/pause {#post-apicronjobsjobidpause}

定時実行の仕事を休止します。

### POST /api/cron/jobs/\{job_id\}/resume {#post-apicronjobsjobidresume}

休止している定時実行の仕事を再開します。

### POST /api/cron/jobs/\{job_id\}/trigger {#post-apicronjobsjobidtrigger}

決まった時刻を待たずに、定時実行の仕事をその場で走らせます。

### DELETE /api/cron/jobs/\{job_id\} {#delete-apicronjobsjobid}

定時実行の仕事を消します。

### GET /api/skills {#get-apiskills}

すべてのスキルを、名前・説明・種類・有効かどうかとともに返します。

### PUT /api/skills/toggle {#put-apiskillstoggle}

スキルを有効または無効にします。中身は `{"name": "skill-name", "enabled": true}` です。

### GET /api/tools/toolsets {#get-apitoolstoolsets}

すべてのツールの束を、名札・説明・含むツールの一覧・動いているか設定済みかとともに返します。

### 管理用の入口 {#admin-endpoints}

MCP、経路、Webhook、紐付け、システムの各ページを支えているものです。どれも `/api/` の
ほかの部分と同じ認証の関門の後ろにあります。

| 手段と道 | 役目 |
|---------------|---------|
| `GET /api/mcp/servers` | 設定された MCP サーバーの一覧（環境変数の値は伏せます） |
| `POST /api/mcp/servers` | サーバーを足します。中身は `{name, url?, command?, args?, env?, auth?}` |
| `POST /api/mcp/servers/{name}/test` | つないで、ツールを並べて、切ります |
| `PUT /api/mcp/servers/{name}/enabled` | サーバーを有効・無効にします |
| `DELETE /api/mcp/servers/{name}` | サーバーを取り除きます |
| `GET /api/mcp/catalog` | Nous が認めた MCP のカタログを見ます |
| `POST /api/mcp/catalog/install` | カタログの項目を入れます（要る環境変数も渡します） |
| `GET /api/messaging/platforms` | メッセージ連携の経路を、状態とプラットフォームごとの設定項目とともに並べます |
| `PUT /api/messaging/platforms/{id}` | 経路を設定します。中身は `{enabled?, env?, clear_env?}`（env は `.env` へ、enabled は `config.yaml` へ書かれます） |
| `POST /api/messaging/platforms/{id}/test` | 経路が設定され、有効で、つながっているかを伝えます |
| `GET /api/pairing` | 待っている利用者と認めた利用者を並べます |
| `POST /api/pairing/approve` | 合言葉を承認します。中身は `{platform, code}` |
| `POST /api/pairing/revoke` | 利用者を取り消します。中身は `{platform, user_id}` |
| `POST /api/pairing/clear-pending` | 待っている合言葉をすべて捨てます |
| `GET /api/webhooks` | 受け口と、プラットフォームが有効かどうかを並べます |
| `POST /api/webhooks` | 受け口を作ります（一度きりの秘密を返します） |
| `DELETE /api/webhooks/{name}` | 受け口を取り除きます |
| `GET /api/credentials/pool` | 順ぐりに使うキーを並べます（伏せた形で） |
| `POST /api/credentials/pool` | キーを足します。中身は `{provider, api_key, label?}` |
| `DELETE /api/credentials/pool/{provider}/{index}` | キーを外します（番号は1から） |
| `GET /api/memory` | 今のしくみと、使えるしくみと、組み込みのファイルの大きさ |
| `PUT /api/memory/provider` | しくみを選びます（空にすると組み込みだけ） |
| `POST /api/memory/reset` | 組み込みの記憶を白紙に戻します。中身は `{target: all\|memory\|user}` |
| `POST /api/gateway/start` · `/stop` · `/restart` | ゲートウェイの開始・停止・再起動（裏で走ります） |
| `POST /api/ops/doctor` · `/security-audit` · `/backup` · `/import` | 診断と手入れ（裏で走ります。`/api/actions/{name}/status` で様子を追えます） |
| `GET /api/ops/hooks` | 設定されたシェルのフックと、許可の状態 |
| `GET /api/ops/checkpoints` · `POST .../prune` | `/rollback` の記録を見る・片づける |
| `POST /api/ops/hooks` · `DELETE /api/ops/hooks` | シェルのフックを作る・外す（同意が要ります） |
| `GET /api/system/stats` | 端末の様子 — OS、CPU、メモリ、ディスク、稼働時間 |
| `GET /api/hermes/update/check` | 更新があるか（何コミット遅れか、どう入れたか）を、あてずに伝えます。git で入れていて遅れている場合は、何が変わったかの `commits` の一覧（`sha`、`summary`、`author`、`at`）も返します。`?force=1` で6時間の一時記憶を無視します |
| `GET /api/curator` · `PUT .../paused` · `POST .../run` | スキルの世話役の状態と、休止・再開と、実行 |
| `GET /api/portal` | Nous Portal の認証とツールゲートウェイの割り振り（読むだけ） |
| `POST /api/ops/prompt-size` · `/dump` · `/config-migrate` | 診断（裏で走ります） |
| `PUT /api/webhooks/{name}/enabled` | Webhook の経路を有効・無効にします |
| `POST /api/skills/hub/install` · `/uninstall` · `/update` | スキルのハブでの操作（裏で走ります） |
| `GET /api/skills/hub/search` | すべての出どころを横断してスキルのハブを探します |
| `GET /api/sessions/stats` | セッションの記録についての数字 |
| `PATCH /api/sessions/{id}` | セッションの名前を変える・保管する |
| `GET /api/sessions/{id}/export` | セッション（付帯する情報とメッセージ）を JSON で取り出します |
| `POST /api/sessions/prune` | 終わってから N 日を過ぎたセッションを消します |
| `PUT /api/cron/jobs/{id}` | 定時実行の仕事の指示・時刻・名前・届け先を変えます |

## 認証（関門のある形） {#authentication-gated-mode}

管理画面が公開のアドレスや loopback 以外のアドレス、つまり `127.0.0.1` や `localhost` 以外に割り当てられていると、Hermes Agent は認証の関門を働かせます。どの要求も、確かめられたセッションの合鍵を持っていなければログインのページへ跳ね返されます。同梱のしくみは3つです。

- **[利用者名とパスワード](#usernamepassword-provider-no-oauth-idp)** — 自前で立てた、社内の、あるいは自宅の管理画面に認証を付ける、いちばん簡単な道です。外の身元の基盤は要りません。**信頼できるネットワークの中か、VPN の後ろでだけ使ってください。公開のインターネットに晒す用途には向きません。**
- **[OAuth（Nous Portal）](#default-provider-nous-research)** — ホスト型の運用や、公開のインターネットから届く管理画面のためのものです。[離れた Hermes デスクトップ版をつなぐ](#connecting-hermes-desktop-to-a-remote-backend)ときにもこれを勧めます。ログインのたびに Nous のアカウントで確かめられるので、インターネットに向けて使えるのはこのしくみです。
- **[自前の OIDC](#self-hosted-oidc-provider)** — 標準の OpenID Connect を通して、自分の身元の基盤を持ち込むためのものです（Keycloak、Auth0、Okta、Google、OIDC の橋渡しごしの GitHub など）。Nous Portal は関わりません。規格に沿った OIDC のサーバーを前に置くなら、公開のインターネットに晒しても大丈夫です。

自分で持っていて loopback に割り当てた管理画面は、これまでどおりです。認証もログインのページもありません。

### 関門が働く条件 {#when-the-gate-engages}

| フラグ | 認証の関門 | 使いどころ |
|-------|-----------|----------|
| `hermes dashboard`（既定。`127.0.0.1` に割り当て） | 無効 | 手元での開発 |
| `hermes dashboard --host 0.0.0.0` | **有効** | 離れたところ・本番。利用者名とパスワードか OAuth で守ってください |

関門が働くのは、割り当てたアドレスが `127.0.0.1`、`::1`、`localhost` のいずれでもないときだけです。`0.0.0.0`（あるいは RFC1918 や LAN のアドレス）に割り当てると働きます。古い `--insecure` のフラグは、**もうこれを止められません**。後方互換のために受け付けはしますが、警告を出して無視されます。

:::danger `--insecure` は何もしません — 認証は止まりません
2026年6月の引き締め以降、`--insecure` は管理画面の認証を素通りさせません。loopback 以外に割り当てた場合は、つねに認証のしくみ（利用者名とパスワードのしくみか OAuth）が要ります。認証なしの管理画面が欲しいなら、`127.0.0.1` に割り当てて、SSH のトンネルか Tailscale ごしに触ってください。
:::

### 失敗したら閉じる作り {#fail-closed-semantics}

関門が働くはずなのに `DashboardAuthProvider` が1つも登録されていない（Nous の差し込みも自作の差し込みもない）場合、`hermes dashboard` ははっきりしたエラーを出して待ち受けを拒みます。「既定では断るが、実際には全部通す」といった逃げ道はありません。設定を誤った、関門付きの管理画面は決して起動しません。

`hermes dashboard --host 0.0.0.0` を**対話的に**（本物のターミナルで）実行して、まだしくみが設定されていないとき、Hermes はただ失敗するのではなく、その場で用意することを申し出ます。**利用者名とパスワード**（`config.yaml` に `dashboard.basic_auth` を書き、数秒で動き出します）か、**OAuth**（`hermes dashboard register` へ案内します）を選べます。対話的でない呼び出し、つまり Docker や s6、CI、パイプ越しの実行では、この問いかけを飛ばして上に書いた「失敗したら閉じる」エラーに当たります。人のいない配備でも、認証なしでは決して起動しません。

### 既定のしくみ: Nous Research {#default-provider-nous-research}

同梱の `plugins/dashboard_auth/nous` の差し込みは**つねに入っていて**、自動で読み込まれます。クライアント ID が設定されると、`nous` という名前の `DashboardAuthProvider` を自分で登録します。

ログインのたびに Nous Portal で確かめられ、Nous のアカウントで守られるので、**管理画面を公開のインターネットに晒すのに向いているのは、この Nous のしくみです。**

#### 管理画面を登録する {#registering-a-dashboard}

Nous のしくみを使うには、OAuth のクライアント ID（`agent:{id}` の形）が要ります。手に入れる道は2つあります。

- **CLI — `hermes dashboard register`。** 管理画面を置く端末で実行します。すでにある Nous のログインを見つけ（ログインしていなければ先に `hermes setup` を実行してください）、自前運用の OAuth クライアントを Portal に登録し、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書いてくれます。任意のフラグは `--name`（人が読む名札。指定しなければ自動で付きます）と `--redirect-uri`（インターネットに向いた端末のための、公開の HTTPS の戻り先 URL）です。

  ```bash
  hermes dashboard register
  # ✓ Registered dashboard "swift_falcon"
  # …writes HERMES_DASHBOARD_OAUTH_CLIENT_ID to ~/.hermes/.env
  ```

- **画面 — ローカルの管理画面のページ。** Nous Portal の [`/local-dashboards`](https://portal.nousresearch.com/local-dashboards) を開くと、自前運用の管理画面をブラウザから登録し、名前を付け、扱い、取り消せます。できた `agent:{id}` のクライアント ID を `HERMES_DASHBOARD_OAUTH_CLIENT_ID`（環境変数）か `dashboard.oauth.client_id`（config.yaml）に写します。CLI から登録した管理画面を取り消すのも、ここです。

#### 設定 {#configuration}

この差し込みは2か所を読みます。環境変数に空でない値が入っていれば、そちらが勝ちます。

**`config.yaml`** — こちらが本来の置き場です。

```yaml
dashboard:
  oauth:
    client_id: agent:01HXYZ…             # required to engage the gate
```

**環境変数** — 運用側からの上書きです。

| 環境変数 | 上書きする先 | 形 | 用意するもの |
|---------|-----------|--------|----------------|
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | `dashboard.oauth.client_id` | `agent:{instance_id}` | `hermes dashboard register` |

Hermes Agent の決まりごと（`~/.hermes/.env` は API キーや秘密のためだけのもの）にならい、手元の開発でも、社内の運用でも、自分で直接扱う配備でも、**これらの値は `config.yaml` に置くのが勧められる形です**。環境変数の道があるのは、置き場を提供する基盤が秘密を注ぎ込むときに、イメージの中の `config.yaml` を誰も書き換えずに配備ごとの `client_id` を渡せるようにするためで、それがおもな目的です。

環境変数の値が空のときは設定なしとして扱われるので、用意されただけで中身の入っていない基盤側の秘密が、正しい `config.yaml` の値をうっかり覆い隠すことはありません。

どちらにも client_id がない場合、差し込みは理由をはっきり伝え、管理画面の「失敗したら閉じる」待ち受けのエラーが、何を直せばよいかを正確に教えてくれます。

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

#### 実際にやってみる: Nous Research {#worked-example-nous-research}

Nous にログイン済みの Hermes から、Nous の関門付きの管理画面まで、3段階で進みます。

**1. ログインして管理画面を登録する。** `hermes dashboard register` は、すでにある Nous のログインを使って OAuth のクライアントを用意し、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書いてくれます。

```bash
hermes setup            # if you're not already logged into Nous Portal
hermes dashboard register
# ✓ Registered dashboard "swift_falcon"
# …writes HERMES_DASHBOARD_OAUTH_CLIENT_ID to ~/.hermes/.env
```

**2. 届くアドレスで管理画面を動かす。** loopback 以外に割り当てると OAuth の関門が働き、いま書かれた `client_id` が `nous` のしくみを起こします。

```bash
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

**3. ログインする。** `http://<host>:9119/` を開くと `/login` へ跳ね返されます。**Sign in with Nous Research** を押し、Portal で認証すると、認証を通った管理画面に戻ります。関門はどの端末からでも確かめられます。

```bash
curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["nous"]
```

そのあと `GET /api/auth/me` が、確かめられたセッション（`provider: nous`）を返します。インターネットに向いた端末では、`--redirect-uri https://hermes.example.com/auth/callback` を付けて登録し、`HERMES_DASHBOARD_PUBLIC_URL` を設定して、OAuth の戻り先が公開の URL になるようにしてください（[公開 URL の上書き](#public-url-override)を参照）。

### 利用者名とパスワードのしくみ（OAuth の身元基盤なし） {#usernamepassword-provider-no-oauth-idp}

OAuth の身元の基盤まで結線したくない、つまり「管理画面にパスワードを掛けたいだけ」という自前運用なら、同梱の `plugins/dashboard_auth/basic` の差し込みが `basic` という名前の `DashboardAuthProvider` を登録し、OAuth の飛ばし合いの代わりに**利用者名とパスワード**で認証します。

つながる先は OAuth のしくみと同じ関門です。loopback 以外に割り当てると関門が働き、ログインのページはこのしくみのための入力の面（「◯◯でログイン」のボタンではなく）を描き、ログインより後ろにあるもの、つまりセッションの合鍵、ひとりでに行われる更新、WebSocket の引換券、ログアウト、監査の記録は、OAuth の道とまったく同じです。セッションは、しくみ自身が HMAC で署名して発行する持ち歩きの合鍵なので、**データベースも外の身元の基盤も要りません**。パスワードのハッシュには標準ライブラリの `scrypt` を使います（外部の部品は要りません）。

:::warning 信頼できるネットワークだけで使ってください — 公開のインターネットには向きません
利用者名とパスワードのしくみは、**信頼できるネットワーク**にある、あるいは **VPN** ごしにしか届かない、自前運用・社内・自宅の管理画面のためのものです。守っているのは共有された資格情報ひとつだけで、その後ろに外の身元の基盤も多要素認証も利用者ごとのアカウントもないので、**管理画面を公開のインターネットに直に晒す用途には向きません**。インターネットに向けるなら、代わりに [Nous Research のしくみ](#default-provider-nous-research)（あるいは自前の[自前の OIDC](#self-hosted-oidc-provider) や[自作のしくみ](#custom-providers)）を使ってください。
:::

#### 設定 {#configuration}

Nous のしくみと同じく、本来の置き場である `config.yaml` を読み、環境変数に空でない値が入っていればそちらが勝ちます。`username` に加えて `password_hash`（こちらが望ましい）か `password` のどちらかが設定されて初めて動き出すので、そうでなければ何もしません。OAuth の利用者も loopback の運用者も影響を受けません。

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

| 環境変数 | 上書きする先 | 覚え書き |
|---------|-----------|-------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | `dashboard.basic_auth.username` | 動き出すのに必須 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | `dashboard.basic_auth.password_hash` | こちらが望ましい（そのままの文字が残りません） |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | `dashboard.basic_auth.password` | そのままの文字。設定の `password_hash` **より優先される**ので、環境変数で入れ替えられます |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | `dashboard.basic_auth.secret` | 合鍵に署名する鍵 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | `dashboard.basic_auth.session_ttl_seconds` | 合鍵の有効な長さ |

:::caution セッションを保たせるには `secret` をはっきり決めてください
`secret` が空のときは、プロセスごとにでたらめな署名の鍵が作られます。1つのプロセスなら困りませんが、**立ち上げ直すたびにセッションがすべて無効になり**、複数の働き手をまたいでも**セッションが通じません**。再起動をまたいで残したい場合や、複数の働き手で動かす場合は、`secret` をはっきり決めてください。
:::

`/auth/password-login` の入口は、つないできた IP ごとに回数が抑えられ（既定は1分に10回まで。超えると HTTP 429）、知らない利用者でもパスワード違いでも、同じそっけない `401 Invalid credentials` を返します。利用者名を探り当てる道具には使えません。

#### 実際にやってみる: 利用者名とパスワード {#worked-example-usernamepassword}

何もないところから、信頼できるネットワークの中でパスワードの関門が付いた管理画面まで、3段階で進みます。

**1. `~/.hermes/.env` に資格情報を書く。** そのままの文字が残らないようパスワードをハッシュにし、再起動をまたいでセッションが残るよう、署名の鍵も決めておきます。

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

**2. 届くアドレスで管理画面を動かす。** loopback 以外に割り当てると関門が働き、利用者名とハッシュが `basic` のしくみを起こします。

```bash
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

**3. ログインする。** `http://<host>:9119/` を開くと `/login` へ跳ね返されます。そこに出るのは「◯◯でサインイン」のボタンではなく、**資格情報の入力の面**です。`admin` と決めたパスワードを入れると、認証を通った管理画面に着きます。関門はどの端末からでも確かめられます。

```bash
curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["basic"]
```

そのあと `GET /api/auth/me` が、確かめられたセッション（`provider: basic`）を返します。これは VPN の後ろに置いてください。上の警告のとおりです。公開の端末では、代わりに [Nous Research](#default-provider-nous-research) か[自前の OIDC](#self-hosted-oidc-provider) のしくみを使ってください。

#### パスワードのしくみを自分で書く {#writing-your-own-password-provider}

`basic` は、差し込みの口のひとつの実装にすぎません。どの差し込みでもパスワードのしくみを登録できます。`DashboardAuthProvider` を継いだクラスに `supports_password = True` を置き、`complete_password_login(*, username, password) -> Session` を書きます（断るときは `InvalidCredentialsError`、後ろの保管所が落ちているときは `ProviderError` を投げます）。パスワードだけのしくみなら、OAuth の `start_login` と `complete_login` は `NotImplementedError` のままで構いません。LDAP での照合、資格情報のデータベース、そのほか飛ばし合いを使わない認証の道は、ここから作れます。入力の面も、経路も、合鍵も、更新も、枠組みが引き受けてくれます。

### 自前の OIDC のしくみ {#self-hosted-oidc-provider}

自分で身元の基盤を動かしているなら、同梱の `plugins/dashboard_auth/self_hosted` の差し込みが、**標準の OpenID Connect** を使って管理画面をそこで認証します。基盤ごとの専用のコードも要らず、Nous Portal も関わりません。規格に沿った OIDC のサーバーで確かめられていて、どれでも動きます。

> **Authentik · Keycloak · Zitadel · Authelia · Auth0 · Okta · Google · …**

Nous のしくみと同じく自動で読み込まれ、設定されて初めて自分を登録するので、loopback の管理画面では何もしません。

#### 設定 {#configuration}

**issuer** と **client_id**（PKCE を使う公開のクライアント。クライアントの秘密は要りません）を設定します。差し込みは基盤の `authorization_endpoint`、`token_endpoint`、`jwks_uri` を `{issuer}/.well-known/openid-configuration` から取ってくるので、入口の URL を書き写す必要はありません。

**`config.yaml`** — こちらが本来の置き場です。

```yaml
dashboard:
  oauth:
    provider: self-hosted
    self_hosted:
      issuer: https://auth.example.com/application/o/hermes/   # required
      client_id: hermes-dashboard                              # required
      scopes: "openid profile email"                           # optional (this is the default)
```

**環境変数** — 運用側からの上書きです（空でない値が入っていれば `config.yaml` より優先され、空の値は設定なしとして扱われます）。

| 環境変数 | 上書きする先 | 覚え書き |
|---------|-----------|-------|
| `HERMES_DASHBOARD_OIDC_ISSUER` | `dashboard.oauth.self_hosted.issuer` | OIDC の issuer の URL。必須 |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | `dashboard.oauth.self_hosted.client_id` | 公開のクライアント ID。必須 |
| `HERMES_DASHBOARD_OIDC_SCOPES` | `dashboard.oauth.self_hosted.scopes` | 既定は `openid profile email` |

身元の基盤の側では、認可コードと PKCE（S256）の方式を使う**公開の**アプリケーション（クライアント）を登録し、管理画面の戻り先を許される戻り先 URI に加えてください。戻り先は `<dashboard public URL>/auth/callback` です（proxy の後ろで管理画面がどう公開の URL を導くかは[公開 URL の上書き](#public-url-override)を参照）。

#### 何を確かめているか {#what-it-verifies}

このしくみは、OpenID Connect の **ID トークン**（RS256 / ES256）を、見つけてきた `jwks_uri` に照らして確かめます。`iss` と `aud` の主張は、設定した `issuer` と `client_id` に釘付けにされます。標準の OIDC の主張は、管理画面のセッションに次のように対応します。

| セッションの項目 | 主張 |
|---------------|----------|
| `user_id` | `sub`（必須） |
| `email` | `email` |
| `display_name` | `name` → `preferred_username` → `nickname` → `email` |
| `org_id` | `org_id` / `organization`、なければ `groups` をつなげたもの |

身元を立てるのは ID トークンのほうです。アクセストークンは中身を見ない扱いにします（OIDC の規格はそれが JWT であることを求めていません）。入口の URL は HTTPS でなければなりません（手元での開発用の基盤に限り loopback の `http://` を許します）。また、見つけてきた設定が名乗る `issuer` は、設定したものと一致していなければなりません（末尾のスラッシュの差は大目に見ます）。基盤が更新の合鍵を出す場合は、標準の `refresh_token` の方式で黙って認証をやり直すのに使われます。ログアウトのときは、基盤が名乗っていれば RFC 7009 の `revocation_endpoint` を呼びます。

> **秘密を持つクライアント**（`client_secret` があるもの）にはまだ対応していません。公開かつ PKCE のクライアントを設定してください。ブラウザに向いた管理画面では、そちらが普通の選び方です。

#### 実際にやってみる: Keycloak {#worked-example-keycloak}

[Keycloak](https://www.keycloak.org/) は、手元で試すのにいちばん立ち上げやすい自前運用の OIDC サーバーのひとつです。開発の形なら1つのコンテナで動き（データベースはメモリの中）、お手本のような OIDC の情報公開を出します。この道筋をたどれば、何もないところから数分で管理画面のログインが動きます。

**1. あらかじめ用意した realm で Keycloak を動かす。** 次の realm の書き出しを `realm-hermes.json` として保存します。`hermes` の realm、**PKCE を使う公開のクライアント**（`hermes-dashboard`）、そして試験用の利用者が定義してあり、起動時にすべて取り込まれるので、管理の画面で押すものは何もありません。

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

そのファイルを取り込み用のディレクトリに載せて起動します（Keycloak 26 以降）。

```bash
docker run --rm -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v "$PWD/realm-hermes.json:/opt/keycloak/data/import/realm-hermes.json:ro" \
  quay.io/keycloak/keycloak:26.0 \
  start-dev --import-realm
```

立ち上がると、その realm は標準の OIDC の情報を
`http://localhost:8080/realms/hermes/.well-known/openid-configuration` で公開します（issuer は
`http://localhost:8080/realms/hermes`）。管理の画面は
`http://localhost:8080/` です（`admin` / `admin`）。

**2. 管理画面をそこへ向ける。** 自前運用の差し込みは loopback の `http://` の issuer を許すので（loopback 以外の issuer には HTTPS が要ります）、手元の Keycloak はそのままで動きます。

```bash
export HERMES_DASHBOARD_OIDC_ISSUER="http://localhost:8080/realms/hermes"
export HERMES_DASHBOARD_OIDC_CLIENT_ID="hermes-dashboard"
export HERMES_DASHBOARD_PUBLIC_URL="http://localhost:9119"
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

`HERMES_DASHBOARD_PUBLIC_URL` は、OAuth の戻り先が
`http://localhost:9119/auth/callback` であることを管理画面に教えます。上の realm に登録した
戻り先 URI と同じものです。`0.0.0.0`（loopback 以外）に割り当てることが、
OAuth の関門を働かせます。

**3. ログインする。** `http://localhost:9119/` を開くと `/login` へ跳ね返されます。**Sign in with Self-Hosted OIDC** を押し、Keycloak で `testuser` / `testpassword` として認証すると、認証を通った管理画面に戻ります。横の欄に `Logged in as Test User via self-hosted` と出て、`GET /api/auth/me` が確かめられたセッション（`provider: self-hosted`、`email: testuser@example.com`）を返します。

> 別の端末名やポートで待ち受けたり見に行ったりする場合は、その出どころの
> `…/auth/callback` を、Keycloak の管理の画面でクライアントの**有効な戻り先 URI**に
> 加えてください（Clients → hermes-dashboard → Settings）。同じやり方が
> Authentik、Zitadel、Authelia、そのほかの OIDC のサーバーでも通じます。違うのは issuer の
> URL とクライアント登録の画面だけです。

### 公開 URL の上書き {#public-url-override}

既定では、管理画面は OAuth の戻り先 URL を要求から組み立て直します。`X-Forwarded-Host` と `X-Forwarded-Proto` と `X-Forwarded-Prefix` を使います（uvicorn が `proxy_headers=True` で動いているときで、関門の下では `start_server` がそれを有効にします）。この3つのヘッダーを正しく送る proxy の後ろなら、そのままで動きます。

そのヘッダーを当てにできない proxy の後ろに置く場合（手で組んだ nginx、社内の入口、proxy の連なりが不完全な独自ドメインの配備など）は、`dashboard.public_url`（または `HERMES_DASHBOARD_PUBLIC_URL`）に、管理画面へ届く**公開の URL 全体**を設定してください。

```yaml
dashboard:
  public_url: "https://dashboard.example.com/hermes"
  trusted_proxies:
    - "172.20.0.5"
```

設定すると、OAuth の戻り先 URL はそのまま `<public_url>/auth/callback` になります。この道筋では `X-Forwarded-Prefix` は無視されます。公開の URL を運用者がはっきり宣言したからです。これは意図してのことです。前置きを重ねると、`public_url` にすでに前置きが入っている普通の場合に、二重になってしまいます。

`public_url` の中の端末名は、HTTP の `Host` と WebSocket の `Origin` の値としても、**そのままの形で**受け入れられます。
ブラウザから見える端末名を保ったまま、`127.0.0.1` に割り当てた管理画面へ
流す proxy に対応するためです。ワイルドカードや末尾一致は許さないので、
`dashboard.example.com.evil.test` のような攻め手の端末名は、DNS の付け替えを防ぐ
守りが引き続き断ります。

loopback 以外の `public_url` を宣言すると、後ろ側が loopback に割り当てられていても、
つねに管理画面の認証の関門が働きます。先にパスワードか OAuth のしくみを設定してください。
どちらもないと、Hermes は起動の時点で閉じて止まります。手元の画面のセッションの合鍵が、
proxy を通して離れたところからの認証の手段に化けてしまうのを防ぐためです。この形では
Uvicorn の proxy のヘッダーの処理も有効になります。loopback の proxy は自動で信頼されます。
TLS を終端するものが別のコンテナや端末からつないでくる場合は、その正確な IP アドレスを
`dashboard.trusted_proxies` に加えてください。アドレスが変わるなら、proxy 専用の
ネットワークに限った CIDR を加えます。

```yaml
dashboard:
  public_url: "https://dashboard.example.com/hermes"
  trusted_proxies:
    - "172.20.0.0/24"
```

`X-Forwarded-Proto` と `X-Forwarded-For` を渡せるのは、そこに挙げた相手だけです。
Hermes はつねに loopback の信頼を保ち、`*`、`0.0.0.0/0`、
`::/0` は断ります。ネットワークを信頼するということは、そのネットワークにいる
すべてのコンテナや端末が転送の情報を渡せるということなので、正確な proxy の IP か、
proxy だけのネットワークを選んでください。

```bash
# Backend remains reachable only on this machine.
hermes dashboard --host 127.0.0.1 --port 9119 --no-open
```

TLS の proxy を `http://127.0.0.1:9119` に向け、
`dashboard.public_url` には外から見える同じ出どころを書きます。

Tailscale Serve は、この形の配備のひとつの例です。`https://<machine>.<tailnet>.ts.net` という
端末名で tailnet の中だけの HTTPS を終端しつつ、loopback の管理画面へ流せます。その
HTTPS の出どころを、そのまま `dashboard.public_url` に使ってください。これも
ブラウザから見える loopback 以外の出どころとして扱われるので、管理画面の認証のしくみが
要ります。とはいえ、そのサービスを公開のインターネットから届くようにする必要は
ありません。

優先の順は管理画面のほかの設定と同じで、環境変数が `config.yaml` に勝ちます。

| 置き場 | 上書きする道 | 使いどころ |
|---------|---------------|-------------|
| `config.yaml` の `dashboard.public_url` | `HERMES_DASHBOARD_PUBLIC_URL` | 手元での開発・社内の運用（本来の置き場） |
| 環境変数 `HERMES_DASHBOARD_PUBLIC_URL` | — | 置き場を提供する基盤の秘密・CI |
| （未設定） | — | 既定。`X-Forwarded-*` のヘッダーから組み立て直します |

`http://` や `https://` の方式がない値、端末名がない値、引用符・山括弧・空白・制御文字を含む値は、確かめの段階で断られます。形の崩れた値は黙ってヘッダーからの組み立て直しに落ちるので、利用者を怪しい URL へ送り出すのではなく、ログインの流れがそのまま動き続けます。

> **注:** `public_url` が上書きするのは OAuth の戻り先 URL だけです。合鍵の `Secure` の印は、これまでどおり `request.url.scheme` で決まり、`X-Forwarded-Proto` を見るのは、つないできた相手が loopback か `trusted_proxies` に挙げられているときだけです。proxy が loopback にないときは、HTTPS の `public_url` に、TLS の終端と、範囲を絞った信頼する proxy の指定を添えてください。

### OAuth の流れ {#oauth-flow}

このしくみは [Nous Portal の OAuth の取り決め v1](https://github.com/NousResearch/nous-account-service/blob/main/docs/agent-dashboard-oauth-contract.md) を実装しています。PKCE（S256）を使う認可コードの方式です。

1. 利用者がセッションの合鍵なしで `/` に来ると、関門が `/login` へ送ります。
2. ログインのページに「Continue with Nous Research」のボタンが出ます → `/auth/login?provider=nous`。
3. サーバーは PKCE の状態を短命な合鍵にしまい、利用者を `https://portal.nousresearch.com/oauth/authorize?…` へ送ります。
4. 利用者が Portal で認証し、`/auth/callback?code=…&state=…` に着きます。
5. サーバーは `POST /api/oauth/token` でコードをアクセストークンに交換し、Portal の JWKS（`/.well-known/jwks.json`）に照らして JWT の署名を確かめ、`hermes_session_at` の合鍵を置きます。
6. 利用者は `/` へ（あるいは `next=` のクエリの項目で指定された、もとの深い場所へ）送られます。

アクセストークンの有効な長さは15分です。**取り決め v1 に更新の合鍵はありません。** トークンが切れると、画面側の通信の包みが 401 の返りを見つけ、ページごと `/login` へ移って流れをやり直します。

### 置かれる合鍵 {#cookies-set}

| 名前 | 有効な長さ | 覚え書き |
|------|----------|-------|
| `hermes_session_at` | トークンの有効な長さ（15分） | HttpOnly、SameSite=Lax、HTTPS のときは Secure |
| `hermes_session_pkce` | 10分 | HttpOnly。行き帰りのあいだ PKCE の照合子と、どのしくみかの手がかりを持ちます。HTTPS では SameSite=None と Secure（サイトをまたぐ身元基盤への転送の連なりを越えて残る必要があります。Chromium は、サイトをまたぐ連なりの 302 で置かれた SameSite=Lax の合鍵を捨てます）。loopback の HTTP では SameSite=Lax |
| `hermes_session_rt` | v1 では使いません | 先々のために取ってあります。`refresh_token` が空のときは書かれません |

3つとも `Path=/` です。セッションの合鍵は `SameSite=Lax`、PKCE の合鍵は HTTPS で置かれるときは `SameSite=None` です（上の表のとおり）。`Secure` の印は、管理画面に HTTPS で届いたときに付きます（要求の URL の方式で見分けます。`proxy_headers=True` の下では、上流で TLS を終端するものからの `X-Forwarded-Proto` も尊重します）。

### ログアウト {#logout}

横の欄の小さな表示に `Logged in as <user_id…> via nous` と出て、ログアウトの印が付きます。押すと `/auth/logout` に送られ、管理画面の認証の合鍵がすべて消され、`/login` へ戻ります。

### 監査の記録 {#audit-log}

ログインの開始、成功、失敗、そしてセッションの確認の失敗は、すべて JSON の1行として `$HERMES_HOME/logs/dashboard-auth.log` に書かれます。秘密の項目（`access_token`、`refresh_token`、`code`、`code_verifier`、`state`、`Authorization` のヘッダー）は、書く前に伏せられます。

### 自作のしくみ {#custom-providers}

Nous 以外の OAuth のしくみ（Google、GitHub、独自の OIDC など）を差し込むには、`DashboardAuthProvider` を登録する差し込みを作ります。

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

ログインのページには登録されたしくみがすべて並びます。いくつも重ねられ、利用者は `/login` でどれかを選びます。

### 対話によらない認証（持参する合鍵） {#non-interactive-bearer-token-auth}

人が対話でログインする道（セッションの合鍵と更新）と並んで、`DashboardAuthProvider` の枠組みは、**対話によらない、機械どうしの**認証も `supports_token = True` と `verify_token(token=...)` で支えています。しくみがそれを選ぶと、届いた `Authorization: Bearer <token>` が確かめられ、通れば `TokenPrincipal` が要求に付きます（`request.state.token_principal`）。対象は、そのしくみが機械の認証を許すと印を付けた入口だけです。合鍵も、飛ばし合いも、更新もありません。

同梱の最初の使い手は **drain** のしくみです（`plugins/dashboard_auth/drain`）。`nous-account-service` が `HERMES_DASHBOARD_DRAIN_SECRET` を通してエージェントごとの秘密を用意し、このしくみが届いた合鍵をそれと時間の変わらない比較で確かめ、`/api/gateway/drain` を機械の認証が使える入口として登録します。**失敗したら閉じます**。弱い、あるいは短い秘密（256 ビット未満）は登録の時点で断られ、その入口は無効のままです。環境変数が未設定なら何もしません。ふるまいのつまみ（`scope`、`min_secret_chars`）は `config.yaml` の `dashboard.drain_auth` の下にあります。

自作のしくみも、同じやり方で `supports_token` と `verify_token` を実装して、機械が認証できる入口を出せます。

### 関門が働いているか確かめる {#verifying-the-gate-is-on}

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

管理画面の React の状況のページにも、「Web server」の下に同じ項目が出ます。サインインすると、横の欄の認証の表示に今の身元が出ます。

## Hermes デスクトップ版を離れたバックエンドにつなぐ {#connecting-hermes-desktop-to-a-remote-backend}

Hermes デスクトップ版は、別の端末（VPS、自宅のサーバー、Tailscale の後ろの Mini など）で動いている Hermes のバックエンドを動かせます。アプリの中では**設定 → ゲートウェイ → 離れたゲートウェイ**にあり、**離れた URL** と**サインイン**の手立てを尋ねられます。（デスクトップ版そのもの、つまり導入・設定・チャットについては [Hermes デスクトップ版](/hermes/docs/user-guide/desktop/)のページを参照してください。）

離れた管理画面は、同梱の認証のしくみのどれかで守り、デスクトップ版はバックエンドが名乗るしくみでサインインします。自分の端末の外から届くバックエンド、つまり VPS や公開の端末、インターネットに向いたものには、**OAuth（Nous Portal）**を勧めます（[`hermes dashboard register`](#registering-a-dashboard) で登録し、*Sign in with Nous Research* でサインインします）。同梱の[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)は、バックエンドが信頼できる LAN の中にあるか、VPN ごしにしか届かないときのいちばん手早い選び方ですが、**公開のインターネットに直に晒す用途には向きません**。管理画面を loopback 以外のアドレスに割り当てると認証の関門が働きます。いったんサインインすれば、デスクトップ版はそのセッションをチャットの WebSocket にも自動で使い回すので、合鍵を写して貼る作業はありません。

下の手順は、信頼できるネットワークでいちばん手早く立ち上がる、利用者名とパスワードの道を使っています。OAuth の道は[既定のしくみ: Nous Research](#default-provider-nous-research)を参照してください。

### バックエンド側（離れた端末）で {#on-the-backend-the-remote-machine}

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

そのままの文字を残したくないなら、代わりに `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` に scrypt のハッシュを入れてください。設定できる項目の全体は[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)を参照してください。

管理画面を systemd のサービスとして動かす場合、そのユニットに `EnvironmentFile=%h/.hermes/.env` があれば `~/.hermes/.env` は自動で読まれるので、起動の時点で資格情報が環境に入ります。

:::warning
管理画面は `.env`（API キーや秘密）を読み書きし、エージェントのコマンドも走らせられます。ここで示した**利用者名とパスワード**の形は、信頼できるネットワーク向けです。パスワードで守った管理画面を、そのまま開いたインターネットに晒さないでください。VPN の後ろに置いてください。[Tailscale](https://tailscale.com/) はすっきりした選び方です。その端末の tailscale の IP に割り当て（`--host <tailscale-ip>`）、離れた URL には `http://<tailscale-ip>:9119` を使います。tailnet にいる機器だけが届きます。公開のインターネットごしにバックエンドへ届かせるなら、代わりに **OAuth（Nous Portal）**のしくみを使ってください。
:::

### Hermes デスクトップ版で {#in-hermes-desktop}

**設定 → ゲートウェイ → 離れたゲートウェイ:**

- **離れた URL** — `http://<backend-host>:9119`（proxy を前に置くなら `/hermes` のような前置きの道も使えます）
- **サインイン** — アプリが利用者名とパスワードのゲートウェイを見つけて**サインイン**のボタンを出します。押して、手順1の資格情報を入れます
- **保存してつなぎ直す** — デスクトップ版の土台を、離れたバックエンドへ切り替えます

バックエンドで `HERMES_DASHBOARD_BASIC_AUTH_SECRET` を決めてあれば、セッションは自動で更新され、立ち上げ直しても残ります。

### 環境変数による上書き {#environment-variable-override}

アプリの中の設定の代わりに、立ち上げる前に環境変数でバックエンドを指すこともできます。`HERMES_DESKTOP_REMOTE_URL` が設定されていると、アプリに保存された URL を上書きします（ゲートウェイの設定の面に「env override」の印が出て、編集できなくなります）。それでも**サインイン**は、その面から利用者名とパスワードで行います。

| 環境変数 | 値 |
|---------|-------|
| `HERMES_DESKTOP_REMOTE_URL` | `http://<backend-host>:9119` |

### うまくいかないとき {#troubleshooting}

- **「Remote gateway incomplete」** — 離れた URL を入れていません。
- **サインインが 401 や「Invalid credentials」で失敗する** — 利用者名かパスワードが、バックエンドの `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` や `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` と合っていません。バックエンドは、知らない利用者でもパスワード違いでも同じそっけないエラーを返すので、両方を確かめてください。関門は `curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'` で確かめられます。`true` と `"basic"` が出るはずです。
- **「サインイン」のボタンが出ず、代わりにセッションの合鍵を求められる** — 利用者名とパスワードのしくみが動いていません（`/api/status` に `"basic"` が出ません）。利用者名と、パスワード（またはそのハッシュ）が設定され、管理画面のプロセスがそれを読み込んでいるか確かめてください。
- **立ち上げ直すたびにログアウトされる** — `HERMES_DASHBOARD_BASIC_AUTH_SECRET` に変わらない値を決めてください。そうしないと、署名の鍵が起動のたびに作り直されます。
- **つなげない・時間切れになる** — バックエンドが届くアドレスではなく `127.0.0.1`（既定）に割り当てられているか、ファイアウォールや VPN がポートを塞いでいます。`0.0.0.0` か tailscale の IP に割り当て、信頼できるネットワークにポートを開いてください。

## CORS {#cors}

このウェブサーバーは、CORS を localhost の出どころだけに絞っています。

- `http://localhost:9119` / `http://127.0.0.1:9119`（本番）
- `http://localhost:3000` / `http://127.0.0.1:3000`
- `http://localhost:5173` / `http://127.0.0.1:5173`（Vite の開発用サーバー）

自分で決めたポートでサーバーを動かすと、その出どころは自動で加えられます。

## 開発 {#development}

管理画面の画面側に手を入れるなら、次のようにします。

```bash
# Terminal 1: start the backend API
hermes dashboard --no-open

# Terminal 2: start the Vite dev server with HMR
cd web/
npm install
npm run dev
```

`http://localhost:5173` の Vite の開発用サーバーが、`/api` への要求を `http://127.0.0.1:9119` の FastAPI へ回します。

画面側は React 19、TypeScript、Tailwind CSS v4、shadcn/ui 風の部品で作られています。本番向けの組み立ての出力は `hermes_cli/web_dist/` に置かれ、FastAPI のサーバーがそれを静的な SPA として配ります。

## 更新時の自動の組み立て {#automatic-build-on-update}

`hermes update` を実行すると、`npm` があれば画面側が自動で組み立て直されます。これで管理画面がコードの更新に付いていきます。`npm` が入っていない場合、更新は画面側の組み立てを飛ばし、`hermes dashboard` が最初の起動時に組み立てます。

## 見た目と差し込み {#themes-plugins}

管理画面には8つの見た目が組み込まれていて、自分で作った見た目、差し込みのタブ、後ろ側の API の経路で広げられます。どれも置くだけで使え、リポジトリを写してくる必要はありません。

**見た目はその場で切り替えられます**。上の帯にある、言語の切り替えの隣のパレットの印を押してください。選んだものは `config.yaml` の `dashboard.theme` に残り、ページを読み込むと戻ってきます。

**フォントは見た目とは別に変えられます**。同じ選択の面の、見た目の一覧の下にある**フォント**の欄が、今の見た目の画面用のフォントを上書きします。この選択は見た目を切り替えても残ります（`config.yaml` の `dashboard.font`）。**Theme default** を選ぶと消えて、今の見た目そのもののフォントに戻ります。

組み込みの見た目:

| 見た目 | 持ち味 |
|-------|-----------|
| **Hermes Teal**（`default`） | 濃い青緑とクリーム色、システムのフォント、ゆったりした間隔 |
| **Hermes Teal (Large)**（`default-large`） | 既定と同じで、文字が 18px、間隔がさらにゆったり |
| **Nous Blue**（`nous-blue`） | Nous らしい青の差し色と、風通しのよい間隔 |
| **Midnight**（`midnight`） | 深い青紫、Inter と JetBrains Mono |
| **Ember**（`ember`） | 暖かい深紅と青銅色、Spectral のセリフと IBM Plex Mono |
| **Mono**（`mono`） | 白黒、IBM Plex、詰まった配置 |
| **Cyberpunk**（`cyberpunk`） | 黒地にネオンの緑、Share Tech Mono |
| **Rosé**（`rose`） | 桃色と象牙色、Fraunces のセリフ、広い間隔 |

自分の見た目を作る、差し込みのタブを足す、外枠の差し込み口に埋め込む、差し込み専用の REST の入口を出す、といったことは **[管理画面を広げる](/hermes/docs/user-guide/features/extending-the-dashboard/)**を参照してください。次のことが一通り書かれています。

- 見た目の YAML の書き方 — palette、typography、layout、assets、componentStyles、colorOverrides、customCSS
- 配置の型 — `standard`、`cockpit`、`tiled`
- 差し込みの目録、SDK、外枠の差し込み口、ページごとの差し込み口（組み込みのページを置き換えずに部品を埋め込めます）、後ろ側の FastAPI の経路
- 見た目と差し込みを組み合わせた通しの手順（Strike Freedom の cockpit の実演）
- 見つけ方、読み直し、うまくいかないときの手当て
