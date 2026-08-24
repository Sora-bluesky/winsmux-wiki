---
title: "Hermes の管理画面"
description: "設定、API キー、MCP サーバー、メッセージ連携の紐付け、Webhook、ゲートウェイ、記憶、認証情報、セッション、ログ、集計、定時実行、スキルをブラウザから管理する画面です"
upstream_path: user-guide/features/web-dashboard.md
upstream_blob: fb60a602809a4896c1ea03f7c561abf6c9dd573a
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
端末共通の管理画面へ回されます。

```bash
worker dashboard
# → already running: opens the browser at ?profile=worker
# → not running:     starts the machine dashboard with "worker" preselected
```

これをやめて、そのプロファイル専用のサーバーを動かしたいときは `--isolated` を渡します
（一本化する前の振る舞いです。プロファイルごとの管理画面を、あえて別々の認証で
公開したいときに役立ちます）。

**チャット**のタブも切り替えに従います。範囲を絞ったチャットは、選ばれた
プロファイルの `HERMES_HOME` を持たせて PTY の子プロセスを立ち上げるので、そのプロファイルの
モデル、スキル、記憶、セッションの履歴で会話が進みます。プロファイルを
切り替えると、端末のセッションは新しく始まります。

切り替えに引きずられず、プロファイルごとに残るものもあります。ゲートウェイの
プロセス（`hermes -p <name> gateway …` で管理してください）、プロファイルごとの
セッションのデータベース、そして定時実行の管理役（定時実行のページはすでに
プロファイルをまたいで集め、独自の絞り込みを持っています）です。

## 前もって要るもの {#prerequisites}

既定の `hermes-agent` の導入には、HTTP まわりの部品も PTY の補助も入っていません。どちらも任意の追加分です。**管理画面**には FastAPI と Uvicorn（`web` の追加分）が要ります。**チャット**のタブにはさらに、疑似端末の後ろで TUI を立ち上げるための `ptyprocess`（POSIX では `pty` の追加分）が要ります。両方まとめて入れるには次のようにします。

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"
```

`web` の追加分が FastAPI と Uvicorn を、`pty` が `ptyprocess`（POSIX）または `pywinpty`（Windows そのもの。ただし埋め込みの TUI 自体は今も WSL が要ります）を引き入れます。`cd ~/.hermes/hermes-agent && uv pip install -e ".[all]"` は両方の追加分を含むので、メッセージ連携や音声なども使いたいならこれがいちばん楽です。

必要なものがないまま `hermes dashboard` を実行すると、何を入れればよいか教えてくれます。画面側がまだ組み立てられておらず、`npm` が使えるときは、最初の起動時に自動で組み立てられます。

チャットのタブは `hermes dashboard` を起動すればいつでも付いてきます。ブラウザに埋め込まれたチャットの区画（PTY と WebSocket 越しに TUI を動かしています）は、追加のフラグなしにつねに使えます。

## ページ {#pages}

### 状況 {#status}

最初のページには、導入したものの今の様子がまとめて出ます。

- **エージェントの版**と公開日
- **ゲートウェイの状況** — 動いているか止まっているか、PID、つながっている基盤とその状態
- **動いているセッション** — 直近5分に動きのあったセッションの数
- **最近のセッション** — 直近20件のセッションを、モデル、メッセージ数、トークンの使用量、会話の冒頭とあわせて一覧にします

状況のページは5秒ごとに自動で更新されます。

#### 資源のひっ迫を知らせる帯 {#resource-pressure-banner}

動かしている端末のメモリやディスクが足りなくなってきたとき、管理画面の上に
帯が現れます（状況の定期取得と同じ情報を使うので、余計な通信は発生しません）。

- **「エージェントのメモリがほとんど残っておらず、再起動するかもしれません」** — ゲートウェイの
  30秒ごとの心拍で測った、システムの空きメモリが*要注意*（128 MiB 未満または 15% 未満）か
  *危険*（64 MiB 未満または 5% 未満）まで下がったときです。
- **「エージェントが不意に再起動しました。メモリ不足の可能性が高いです」**
  — 前回の起動時に、メモリがひっ迫した状態できれいに終われなかったことが
  生存記録に残っている場合です（OOM で落とされた疑い）。
- **ディスクの警告** — `~/.hermes` の置かれた区画がほぼ満杯です
  （空きが 512 MB を切ると*要注意*、256 MB を切ると*危険*）。

いちばん重い警告だけがそのつど出ます（ディスク危険 > メモリ危険 > OOM による再起動 >
ディスク要注意 > メモリ要注意）。閉じた記録はそのときのゲートウェイの起動の
あいだだけ有効です。1つ閉じると次のものが出て、ゲートウェイの再起動や段階の上昇
（要注意 → 危険）でまた開きます。心拍が古くなっているときは、当てにならない警告を出すより
何も出しません。

### チャット {#chat}

**チャット**のタブには、Hermes の TUI（`hermes --tui` で出るものと同じ画面）がまるごとブラウザに埋め込まれています。端末の TUI でできることは、スラッシュコマンドも、モデルの選択も、ツール呼び出しの札も、Markdown の流し込みも、確認・権限・承認の問いかけも、見た目の着せ替えも、そっくり同じように動きます。管理画面が本物の TUI を動かし、その ANSI 出力を [xterm.js](https://xtermjs.org/) の WebGL 描画で、升目がぴたりと合うように描いているからです。

**しくみはこうです:**

- `/api/pty` が、管理画面のセッションの合鍵で認証された WebSocket を開きます
- サーバーが POSIX の疑似端末の後ろで `hermes --tui` を立ち上げます
- 打鍵は PTY へ送られ、ANSI の出力がブラウザへ流れ戻ります
- xterm.js の WebGL 描画が升目を整数のピクセルに合わせて描き、マウスの追従（SGR 1006）、全角文字（Unicode 11）、罫線の記号もそのまま描かれます
- ブラウザの窓の大きさを変えると、`@xterm/addon-fit` によって TUI も追従します

**既にあるセッションを再開する:** **セッション**のタブで、どれかのセッションの横にある再生の印（▶）を押します。すると `/chat?resume=<id>` へ移り、`--resume` を付けて TUI が立ち上がり、履歴がまるごと読み込まれます。

**セッションの切り替え（右の細い欄）:** チャットのタブは、端末の横の細い欄に、ChatGPT のような会話の一覧を持っています。ページを離れずに会話を行き来できます。この欄はモデルの選択を上に、セッションの一覧をそのすぐ下に積み、画面の大半は端末が占めます。一覧には、選んでいるプロファイルの最近のセッションが並びます。題名（なければ冒頭のメッセージ）、最後に動いてからの時間、メッセージ数、そして CLI 以外のセッションでは元になった経路です。どれかの行を押せばその場で再開でき（端末がその会話の履歴を持って立ち上げ直されます）、今開いているものは強調されます。**新しいチャット**で新しいセッションが始まり、更新の操作で一覧を取り直せます。この欄は切り替え専用で、削除・改名・書き出し・まとめての片付けは**セッション**のタブにあります。画面が狭いときは、横から滑り出す区画に畳まれます。

**前もって要るもの:**

- Node.js（`hermes --tui` と同じです。TUI の一式は最初の起動時に組み立てられます）
- `ptyprocess` — `pty` の追加分で入ります（`cd ~/.hermes/hermes-agent && uv pip install -e ".[web,pty]"`、あるいは `[all]` でも両方入ります）
- POSIX のカーネル（Linux、macOS、WSL2）。`/chat` の端末の区画だけは POSIX の PTY が要ります。Windows そのものの Python には同じものがないので、Windows に直接入れた場合、管理画面のほかの部分（セッション、作業、指標、設定の編集）は動きますが、`/chat` のタブにはその機能のために WSL2 を使うよう促す帯が出ます。

ブラウザのタブを閉じると、サーバー側で PTY はきれいに片付けられます。開き直すと新しいセッションが立ち上がります。

自前のバックエンドではなく、別の端末で動いている管理画面に [Hermes デスクトップ版](#connecting-hermes-desktop-to-a-remote-backend)をつなぎたい場合は、後述の離れたバックエンドの節を参照してください。

### Hermes デスクトップ版を離れたバックエンドにつなぐ {#connecting-hermes-desktop-to-a-remote-backend}

Hermes デスクトップ版はふだん自分でローカルのバックエンドを立ち上げますが、離れた端末（仮想サーバー、自宅のサーバーなど）で動いている管理画面につなぐこともできます。**設定 → ゲートウェイ → リモートゲートウェイ**からです。「デスクトップ版はバックエンドの準備ができたと言うのにチャットが動かない」という報告のいちばん多い原因がここにあります。デスクトップ版の準備確認は、実際のチャットの接続に必要なものより少ないことしか確かめていないからです。

:::info 前提: 離れた端末で `hermes dashboard` が動いていること
デスクトップ版がつなぐ「離れたバックエンド」とは、離れた端末で動いている `hermes dashboard` のプロセス**そのもの**です。このページで説明しているサーバーと同じものです。以下の手順はどれも、それが立ち上がっていて届くことが前提です。デスクトップ版はそこに接続するだけで、代わりに立ち上げてはくれません。`systemd` や `tmux` などの下で動かし、ログアウトや再起動を越えて残るようにしてください。**ゲートウェイ**（Telegram / Discord / Slack など）は*別の*常駐プロセスです。メッセージ連携を使うなら別途起動してください。デスクトップ版がつなぐ相手ではありません。
:::

デスクトップ版の「離れたバックエンドの準備ができた」という確認は `GET /api/status` を叩くだけで、これは誰でも見られる入口です。その端末で*何らかの*管理画面が動いていれば、すぐに応答が返ります。実際のチャットの接続は `/api/ws`（と `/api/pty`）への**別の** WebSocket で、この接続には、状況の確認がまったく触れない2つの関門があります。

1. **認証を通っていること。** 管理画面が loopback 以外のアドレスに割り当てられていると、認証のしくみが働きます。利用者名とパスワード（同梱の[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)）で守ってください。デスクトップ版は一度ログインすれば、そのセッションを使い捨ての引換券で WebSocket にも使い回します。しくみを何も設定していないと、loopback 以外に割り当てた管理画面は**起動の時点で止まります**。
2. **割り当てたアドレスがその接続元を許し、Host の見出しと一致すること。** loopback に割り当てている場合（`127.0.0.1`）は loopback からの接続しか受けないので、離れた端末は認証情報に関係なくソケットの層で弾かれます。loopback 以外のアドレス（`--host 0.0.0.0`）に割り当てて、接続元の IP を見る関門が離れた端末を通すようにしてください。デスクトップ版に入れる URL は、割り当てたのと同じホスト名で管理画面に届く必要があります。DNS の付け替えを防ぐ関門が、Host の見出しの一致を求めるからです。

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

そのうえでデスクトップ版に**リモート URL**（たとえば `http://VM_IP:9119`）を入れ、その利用者名とパスワードで**サインイン**します。設定できる項目のすべては[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)の節を参照してください。

:::tip デスクトップ版を試す前に関門が働いているか確かめる
どの端末からでも、管理画面が利用者名とパスワードのしくみを掲げているか確かめられます。

```bash
curl -s http://VM_IP:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["basic"]
```

- `auth_required: true` で、一覧に `"basic"` がある → デスクトップ版の**サインイン**は通ります。
- `auth_required: false` → loopback に割り当てられているか、関門が働いていません。loopback 以外のアドレスに割り当ててください。
- `auth_required: true` なのに `"basic"` がない → 利用者名とパスワードの環境変数が読み込まれていません。まずそこを直してください。
:::

`/api/status` で関門が働いていて `"basic"` も出ているのに、サインインしたあとでもデスクトップ版がつながらない場合は、基本的な準備より先の問題です。そのときは、やり直した同じ時間帯の `desktop.log`（設定 → ゲートウェイ → ログを開く）と管理画面側のログの両方を取り、`/api/ws` の切断コードを探してください（4403 = 要求の関門がチャットの WebSocket を弾いた。Host や接続元の食い違いなど。4401 = WebSocket の引換券が認証を通らなかった）。

### 設定 {#config}

`config.yaml` を入力欄で編集するページです。150以上ある設定の項目はすべて `DEFAULT_CONFIG` から自動で拾われ、タブに分かれた分類にまとめられます。

![設定の管理ページ — 左に節の絞り込み、右に自動で拾われた項目](https://hermes-agent.nousresearch.com/img/dashboard/admin-config.png)

- **model** — 既定のモデル、プロバイダ、基点となる URL、推論の設定
- **terminal** — 端末の実体（local/docker/ssh/modal）、制限時間、シェルの好み
- **display** — 見た目、ツールの進み具合、再開時の表示、待機表示の設定
- **agent** — 折り返しの上限、ゲートウェイの制限時間、サービスの等級
- **delegation** — サブエージェントの上限、推論のかけ具合
- **memory** — 記憶のしくみの選択、文脈への差し込みの設定
- **approvals** — 危ないコマンドの承認のしかた（賢く／手動／なし）
- そのほかにも — config.yaml のどの節にも、対応する入力欄があります

取りうる値が決まっている項目（端末の実体、見た目、承認のしかたなど）は選択式になります。真偽の値は切り替えの形になり、それ以外は文字の入力欄です。

**操作:**

- **保存** — その場で `config.yaml` に書き込みます
- **既定に戻す** — すべての項目を既定値に戻します（保存を押すまでは書き込まれません）
- **書き出し** — 今の設定を JSON で取り出します
- **読み込み** — JSON の設定ファイルを渡して、今の値を置き換えます

:::tip
設定の変更は、次のエージェントのセッションかゲートウェイの再起動から効きます。管理画面は、`hermes config set` やゲートウェイが読むのと同じ `config.yaml` を書き換えています。
:::

### API キー {#api-keys}

API キーや認証情報を置いている `.env` を管理します。キーは分類ごとにまとめられます。

- **LLM のプロバイダ** — OpenRouter、Anthropic、OpenAI、DeepSeek など
- **ツールの API キー** — Browserbase、Firecrawl、Tavily、ElevenLabs など
- **メッセージの基盤** — Telegram、Discord、Slack のボットの合鍵など
- **エージェントの設定** — `API_SERVER_ENABLED` のような、秘密ではない環境変数

キーごとに次のものが出ます。

- 今設定されているかどうか（値は伏せた形で少しだけ見えます）
- 何のためのものかの説明
- そのプロバイダの登録・鍵の発行ページへのリンク
- 値を入れたり更新したりする欄
- 取り除くための削除ボタン

込み入ったもの、めったに使わないものは、既定では切り替えの裏に隠れています。

### セッション {#sessions}

エージェントのセッションを見て回るページです。行ごとに、セッションの題名、元になった基盤の印（CLI、Telegram、Discord、Slack、定時実行）、モデル名、メッセージ数、ツールの呼び出し回数、最後に動いてからの時間が出ます。今動いているセッションには脈打つ印が付きます。

- **絞り込み** — **会話 / 自動 / すべて**のタブで一覧の範囲を切ります。*会話*（既定）は人との会話を見せ、自動のものの雑音（定時実行、ツール、API、ACP のセッション）を隠します。*自動*はそれだけを見せ、*すべて*は全部見せます。さらに元の経路を1つに絞る選択欄もあります（Telegram だけ、など）。検索も今の絞り込みに従います。
- **検索** — FTS5 を使って、すべてのメッセージの中身を全文検索します。結果には該当箇所が強調されて出て、開くと最初に一致したメッセージまで自動でたどり着きます。
- **統計** — 上の帯に、セッションの総数、保管されている中で動いているものの数、書庫に入れた数、メッセージの総数、そして経路ごとの内訳が出ます。
- **展開** — セッションを押すと、そのメッセージの履歴がすべて読み込まれます。メッセージは役割（利用者、アシスタント、システム、ツール）ごとに色分けされ、Markdown として構文の色付きで描かれます。
- **ツールの呼び出し** — ツールを呼んだアシスタントのメッセージには、関数名と JSON の引数が畳めるかたまりで出ます。
- **改名** — セッションの題名をその場で付けたり消したりできます（鉛筆の印）。
- **書き出し** — セッション（付帯情報とメッセージの履歴すべて）を JSON で取り出せます（下向き矢印の印）。
- **片付け** — 見出しにある「古いセッションを片付ける」のボタンで、N 日より前に終わったセッションを消します。
- **削除** — ゴミ箱の印で、セッションとそのメッセージの履歴を取り除きます。

![セッションの管理ページ — 統計の帯、片付け、行ごとの改名／書き出し／削除](https://hermes-agent.nousresearch.com/img/dashboard/admin-sessions.png)

### ログ {#logs}

エージェント、ゲートウェイ、エラーの記録を、絞り込みと追いかけ表示つきで見られます。

- **ファイル** — `agent`、`errors`、`gateway` の記録を切り替えます
- **水準** — 記録の水準で絞ります。ALL、DEBUG、INFO、WARNING、ERROR
- **出どころ** — どの部品からかで絞ります。all、gateway、agent、tools、cli、cron
- **行数** — 何行表示するかを選びます（50、100、200、500）
- **自動更新** — 5秒ごとに新しい行を取りに行く、追いかけ表示の切り替えです
- **色分け** — 記録の行は重さで色が付きます（エラーは赤、警告は黄、詳細は薄く）

### 集計 {#analytics}

セッションの履歴から計算した、使用量と費用の集計です。期間（7日、30日、90日）を選ぶと次のものが見られます。

- **要約の札** — トークンの総数（入力／出力）、使い回しの当たった割合、見積もりまたは実際の総費用、そしてセッションの総数と1日あたりの平均
- **日ごとのトークンの図** — 入力と出力のトークンを日ごとに積み上げた棒の図で、指を乗せると内訳と費用が出ます
- **日ごとの内訳の表** — 日付、セッション数、入力トークン、出力トークン、使い回しの当たった割合、その日の費用
- **モデルごとの内訳** — 使ったモデルごとに、セッション数、トークンの使用量、見積もりの費用を並べた表

### 定時実行 {#cron}

エージェントへの指示を繰り返し走らせる、予約した作業を作って管理します。

- **作成** — 名前（任意）、指示、cron の書き方（`0 9 * * *` など）、そして届け先（手元、Telegram、Discord、Slack、メール）を入れます
- **作業の一覧** — 作業ごとに、名前、指示の冒頭、予定の式、状態の札（有効／一時停止／エラー）、届け先、前回の実行時刻、次回の実行時刻が出ます
- **一時停止・再開** — 作業を有効と一時停止のあいだで切り替えます
- **編集** — あらかじめ埋まった小窓を開き、指示、予定、名前、届け先を変えます
- **今すぐ実行** — ふだんの予定とは別に、その場で走らせます
- **削除** — 予約した作業を消します

### プロファイル {#profiles}

[プロファイル](/hermes/docs/user-guide/profiles/)を作って管理します。設定もスキルもセッションも別々に持つ、切り離された Hermes です。

- **プロファイルの札** — それぞれにモデルとプロバイダ、スキルの数、ゲートウェイの状態、説明、そして印（使用中、既定、別名）が出ます
- **作成** — 名前と、任意で「既定から複製」「まるごと複製」「同梱のスキルなし」の選択、説明、モデルを入れます。専用のプロファイル作成ページ（`/profiles/new`）では、モデル・MCP・スキルまで含めた一式の流れが使えます
- **スキルとツールの管理** — そのプロファイルに絞ったスキルのページへ移ります（横の欄のプロファイル切り替えも合わせて動きます）
- **使用中にする** — **これから始まる CLI とゲートウェイの実行**が拾う、既定のプロファイルを切り替えます（`hermes profile use` と同じです）。管理画面が管理する対象は*変わりません*。そちらはプロファイルの切り替えの仕事です
- **モデル・説明・SOUL の編集** — その場で編集して、そのプロファイルへ書き込みます
- **改名・削除** — 名前付きのプロファイルだけです

### スキル {#skills}

入れてあるスキルとツール群を見て回り、検索し、有効・無効を切り替え、拠点から新しいものを入れられます。スキルは `~/.hermes/skills/` から読み込まれ、分類ごとにまとめられます。

- **検索** — 入れてあるスキルとツール群を、名前・説明・分類で絞り込みます
- **分類の絞り込み** — 分類の丸い札を押して一覧を絞ります（MLOps、MCP、Red Teaming、AI など）
- **切り替え** — スキルを1つずつ有効・無効にできます。変更は次のセッションから効きます。
- **ツール群** — 別の表示で、内蔵のツール群（ファイル操作、ウェブ閲覧など）を、有効かどうか、準備に何が要るか、どのツールを含むかとあわせて見られます
- **拠点を見る** — 3つ目の表示では、すべての出どころにまたがってスキルの拠点を検索し（`hermes skills search` と同じです）、見つけたものを識別子で入れながら導入の記録をその場で流し、入れてあるスキルをまとめて新しくする「すべて更新」のボタンも用意されています。

![スキルの管理ページ — 拠点を見る表示: 検索、導入、更新](https://hermes-agent.nousresearch.com/img/dashboard/admin-skills-hub.png)

### MCP {#mcp}

[MCP](/hermes/docs/user-guide/features/mcp/) のサーバーを CLI なしで管理します。`hermes mcp` が読むのと同じ
`config.yaml` の `mcp_servers` のかたまりです。

**自分の MCP サーバー:**

- **追加** — HTTP/SSE のサーバー（URL）か stdio のサーバー（コマンドと引数）を登録します。stdio のサーバーには `KEY=VALUE` の形の環境変数も付けられます
- **有効・無効** — サーバーを消さずに切り替えます。無効にしたサーバーも設定に残るので、あとで戻せます。次のゲートウェイの再起動から効きます。
- **接続の確認** — サーバーにつなぎ、ツールを一覧し、切ります。エージェントが頼りにする前に、つながることを確かめられます
- **取り除く** — 設定からサーバーを消します
- 秘密らしい形の環境変数の値は、一覧では伏せられます

**目録:** Nous が認めた MCP サーバー（同梱の `optional-mcps/` の
目録）を見て、どれでも一押しで入れられます。API キーが要るものは
その場で入力を求められ、値は `.env` へ書かれます。`hermes mcp catalog` /
`hermes mcp install` が使うのと同じ目録です。

![MCP の管理ページ — 有効・無効の切り替え付きの自分のサーバーと、導入用の目録](https://hermes-agent.nousresearch.com/img/dashboard/admin-mcp.png)

### Webhook {#webhooks}

動的な [Webhook の購読](/hermes/docs/user-guide/messaging/webhooks/)を管理します。
先にメッセージの設定で Webhook の基盤を有効にしておく必要があり、そうでないときは
その旨がページに出ます。

- **作成** — 名前、説明、拾う出来事の条件、届け先、任意で直接届ける方式、そしてエージェントへの指示を入れます。作ると、経路の URL と一度きりの HMAC の秘密がページに出るので、写し取ってください。
- **有効・無効** — 購読を切り替えます。無効にした経路も購読のファイルには残りますが、ゲートウェイは届いた出来事を拒みます（403）。ゲートウェイはこのファイルを動いたまま読み直すので、次の出来事から効きます。再起動は要りません。
- **一覧** — 購読ごとに、URL、拾う出来事、届け先が出ます
- **削除** — 購読を取り除きます

![Webhook の管理ページ — 有効・無効の切り替え付きの購読一覧](https://hermes-agent.nousresearch.com/img/dashboard/admin-webhooks.png)

### 紐付け {#pairing}

メッセージ連携の利用者を CLI なしで承認・取り消しできます。離れた場所の管理者が、
紐付けたゲートウェイに Telegram や Discord などの利用者を迎え入れるときの入口です。
`hermes pairing` と同じことがすべてできます。

- **保留中の申請** — それぞれに基盤、コード、利用者、経過時間が出て、承認のボタンが付きます
- **承認済みの利用者** — それぞれに基盤と利用者が出て、取り消しのボタンが付きます
- **保留中をすべて消す** — 残っている紐付けのコードをまとめて捨てます

![紐付けの管理ページ](https://hermes-agent.nousresearch.com/img/dashboard/admin-pairing.png)

### 経路 {#channels}

Hermes をどのメッセージの基盤にもブラウザからつなげます。`hermes setup gateway` と
まったく同じことができます。このページには、対応するすべての経路（Telegram、
Discord、Slack、Matrix、Mattermost、WhatsApp、Signal、BlueBubbles/iMessage、
メール、SMS/Twilio、DingTalk、Feishu/Lark、WeCom、WeChat、QQ Bot、Yuanbao、それに
API サーバーと Webhook の受け口）が、今の接続の状態とあわせて並びます。

- **設定** — 経路ごとの入力の形が開き、その経路に必要な項目だけが出ます（ボットの合鍵、アプリの合鍵、サーバーの URL、許可の一覧など）。秘密はパスワードの入力欄として描かれ、伏せた形で保存されます。空のままにすると今の値が残ります。必須の項目には印が付き、内容が確かめられます。「準備の手引き」のリンクから、その基盤の認証情報の説明へ行けます。
- **有効・無効** — 経路を切り替えます。認証情報はディスクに残り、有効かどうかだけが変わります。
- **接続の確認** — その経路が設定済みか、有効か、ゲートウェイから見て実際につながっているかを確かめます。
- **ゲートウェイの再起動** — 認証情報は `~/.hermes/.env` に、有効かどうかは `config.yaml` に書かれます。ゲートウェイは次の再起動で、有効な経路それぞれにつなぎます。その再起動はこのページから直接かけられます。

![経路の管理ページ — 状態、有効の切り替え、基盤ごとの設定欄が並んだメッセージの基盤の一覧](https://hermes-agent.nousresearch.com/img/dashboard/admin-channels.png)

### システム {#system}

導入したもの全体に関わる操作を1か所にまとめた盤です。

- **ホスト** — 今の端末の様子: OS とカーネル、アーキテクチャ、ホスト名、Python と Hermes の版、CPU のコア数と使用率、メモリ、Hermes の置き場所のディスク使用量、稼働時間、負荷の平均。（CPU・メモリ・ディスクは `psutil` が入っているときに取れます。素性の項目はつねに出ます。）Hermes の版には**更新の状態の札**（最新／N コミット遅れ）と**更新を確認**のボタンが付きます。git で入れたものに更新があるときは、**今すぐ更新**のボタンから確認の小窓が開き、いくつのコミットを取り込むかを示してから、裏側で `hermes update` を走らせます。Docker や Nix で入れた場合は管理画面からその場で更新できないので、代わりに正しい外部のコマンドが表示されます。
- **Nous Portal** — ログインの状態、使っている推論のプロバイダ、そしてツールのゲートウェイの経路表（どのツールが Portal 経由でどれが手元で動くか）と、契約を管理するリンク。`hermes portal` を読み取り専用で写したものです。
- **スキルの世話役** — 裏で動くスキルの手入れの状態（動作中／一時停止、間隔、前回の実行）と、一時停止・再開、今すぐ実行のボタン。`hermes curator` と同じものです。
- **ゲートウェイ** — メッセージのゲートウェイの起動・停止・再起動と、今の状態（動作中／停止、PID、状態）
- **記憶** — 外部の記憶のしくみを選ぶ（あるいは内蔵だけにする）ほか、内蔵の `MEMORY.md` / `USER.md` を初期化します
- **認証情報の持ち回り** — エージェントが順に使い分ける API キーを（プロバイダごとに）足したり外したりします。一覧では伏せられ、生の値はエージェントにしか渡りません。
- **運用** — `doctor`、安全性の点検、控えの作成、控えからの復元、スキルの更新、システムプロンプトの大きさの内訳の表示、支援用の情報の書き出し、退役した設定の移行を実行します。それぞれ裏側の処理として走り、その記録がページに流れます。
- **保存点** — `/rollback` の影の置き場所の大きさを見て、片付けます
- **シェルのフック** — 設定されたフックを、同意と実行可能かの状態とあわせて並べ、フックを**作り**（出来事、コマンド、対象の条件、制限時間、そして同意を与えるかの選択）、外せます。フックは任意のコマンドを走らせるので、作成の欄には安全上の注意が付き、同意を与えたあとでなければ動きません。

![システムの管理ページ — ホストの様子と Nous Portal の状態](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-top.png)

![システムの管理ページ — スキルの世話役、ゲートウェイ、記憶、認証情報の持ち回り](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-curator.png)

![システムの管理ページ — 運用、保存点、シェルのフック](https://hermes-agent.nousresearch.com/img/dashboard/admin-system-ops.png)

シェルのフックを作るところ（同意の確認と、任意のコマンドが走るという注意に注目してください）:

![新しいシェルのフックの小窓](https://hermes-agent.nousresearch.com/img/dashboard/admin-hook-create.png)

:::warning 安全について
管理画面は、API キーや秘密の入った `.env` を読み書きします。既定では `127.0.0.1` に割り当てられ、手元の端末からしか届かず、ログインも要りません。loopback 以外のアドレス（`0.0.0.0` を含む）に割り当てると[認証のしくみ](#authentication-gated-mode)が働き、認証のしくみ（利用者名とパスワード、または OAuth）を設定するまでサーバーは起動しなくなります。
:::

## `/reload` スラッシュコマンド {#reload-slash-command}

管理画面を入れた変更では、対話式の CLI に `/reload` というスラッシュコマンドも加わりました。管理画面から（あるいは `.env` を直に書き換えて）API キーを変えたあと、動いている CLI のセッションで `/reload` を打てば、再起動せずにその変更を取り込めます。

```
You → /reload
  Reloaded .env (3 var(s) updated)
```

これは `~/.hermes/.env` を、動いているプロセスの環境に読み直します。管理画面から新しいプロバイダの鍵を足して、すぐ使いたいときに便利です。

## REST の API {#rest-api}

管理画面は、画面側が使っている REST の API を公開しています。自動化のために、これらの入口を直に呼ぶこともできます。

:::tip プロファイルを指定できる入口
管理系の入口の一群 — `/api/config`、`/api/env`、`/api/skills`、
`/api/tools/toolsets`、`/api/mcp`、`/api/model/{info,options,auxiliary,set}` — は、
任意の `?profile=<name>` という問い合わせの引数（書き込みでは JSON の中の
`"profile"`）を受け付け、読み書きの対象をそのプロファイルの
`HERMES_HOME` に絞ります。書かなければ管理画面自身のプロファイルです。知らない名前は
`404` を返します。`/api/pty` の WebSocket も同じ引数を受け付け、選んだプロファイルで
チャットを立ち上げます。
:::

### GET /api/status {#get-apistatus}

エージェントの版、ゲートウェイの状態、基盤ごとの状態、動いているセッションの数を返します。

応答にはさらに、参考として2つの資源のかたまりが載ります（
`components` / `overall` の健全性の判定には影響しません）。

- **`memory`** — ゲートウェイの30秒ごとの心拍と
  生存記録から絞り出したものです。項目は `pressure`（`ok` / `elevated` / `critical` /
  `unknown`）、`gateway_rss_mb`、`system_total_mb`、`system_available_mb`、
  `swap_used_mb`、`sampled_at`、`boot_id`、`last_boot_unclean`、
  `last_boot_suspected_oom`。ひっ迫の度合いは、システムの空きメモリが
  128 MiB（または 15%）を切ると `elevated`、64 MiB（または 5%）を切ると `critical` です。これは、
  そのあときれいに終われなかったときに OOM で落とされた疑いとして印が付くのと
  同じ水準です。150秒より古い（あるいは未来の日付の）心拍は、
  数値はそのままに `pressure` だけ `unknown` に落とされるので、止まったゲートウェイの
  最後の値が今の値のふりをすることはありません。
- **`disk`** — `~/.hermes` の置かれた区画を `shutil.disk_usage()` でその場で測ったものです。
  項目は `pressure`、`free_mb`、`total_mb`、`used_percent`、
  `sampled_at`。ひっ迫の度合いは、空きが 512 MB を切る（または使用率が 85% 以上で
  残りが 4 GB 未満）と `elevated`、空きが 256 MB を切る（または使用率が 95% 以上で
  残りが 1 GB 未満）と `critical` です。

どちらの採取も安全側に倒してあります。測定に失敗しても、状況の入口ごと失敗させるのではなく
そのかたまりを `{"pressure": "unknown"}` に落とします。`/api/status` は誰でも見られるので、
数値は粗くしてあります（MB 単位、パーセントも整数）。

### GET /api/sessions {#get-apisessions}

直近20件のセッションを、付帯情報（モデル、トークン数、時刻、冒頭）とあわせて返します。

### GET /api/config {#get-apiconfig}

今の `config.yaml` の中身を JSON で返します。

### GET /api/config/defaults {#get-apiconfigdefaults}

設定の既定値を返します。

### GET /api/config/schema {#get-apiconfigschema}

設定の項目それぞれについて、型、説明、分類、そして当てはまる場合は選べる値を書いた定義を返します。画面側はこれを使って、項目ごとに正しい入力の部品を描いています。

### PUT /api/config {#put-apiconfig}

新しい設定を保存します。本文は `{"config": {...}}` です。

### GET /api/env {#get-apienv}

分かっている環境変数をすべて、設定済みかどうか、伏せた値、説明、分類とあわせて返します。

### PUT /api/env {#put-apienv}

環境変数を設定します。本文は `{"key": "VAR_NAME", "value": "secret"}` です。

### DELETE /api/env {#delete-apienv}

環境変数を取り除きます。本文は `{"key": "VAR_NAME"}` です。

### GET /api/sessions/\{session_id\} {#get-apisessionssessionid}

1つのセッションの付帯情報を返します。

### GET /api/sessions/\{session_id\}/messages {#get-apisessionssessionidmessages}

メッセージの履歴を、件数を区切ったページで返します。ツールの呼び出しと時刻も含みます。既定では最新の500件を時系列で返します。細かく分けたいときは `limit`（最大500）、`offset`、`order=oldest|latest` を使ってください。

### GET /api/sessions/search {#get-apisessionssearch}

メッセージの中身を全文検索します。問い合わせの引数は `q` です。一致したセッションの ID を、強調した抜粋とあわせて返します。

### DELETE /api/sessions/\{session_id\} {#delete-apisessionssessionid}

セッションとそのメッセージの履歴を消します。

### GET /api/logs {#get-apilogs}

記録の行を返します。問い合わせの引数は `file`（agent/errors/gateway）、`lines`（行数）、`level`、`component` です。

### GET /api/analytics/usage {#get-apianalyticsusage}

トークンの使用量、費用、セッションの集計を返します。問い合わせの引数は `days`（既定は30）です。応答には日ごとの内訳とモデルごとの合計が入ります。

### GET /api/cron/jobs {#get-apicronjobs}

設定されている予約の作業を、状態、予定、実行の履歴とあわせてすべて返します。

### POST /api/cron/jobs {#post-apicronjobs}

新しい予約の作業を作ります。本文は `{"prompt": "...", "schedule": "0 9 * * *", "name": "...", "deliver": "local"}` です。

### POST /api/cron/jobs/\{job_id\}/pause {#post-apicronjobsjobidpause}

予約の作業を一時停止します。

### POST /api/cron/jobs/\{job_id\}/resume {#post-apicronjobsjobidresume}

一時停止した予約の作業を再開します。

### POST /api/cron/jobs/\{job_id\}/trigger {#post-apicronjobsjobidtrigger}

予定とは別に、予約の作業をその場で走らせます。

### DELETE /api/cron/jobs/\{job_id\} {#delete-apicronjobsjobid}

予約の作業を消します。

### GET /api/skills {#get-apiskills}

すべてのスキルを、名前、説明、分類、有効かどうかとあわせて返します。

### PUT /api/skills/toggle {#put-apiskillstoggle}

スキルの有効・無効を切り替えます。本文は `{"name": "skill-name", "enabled": true}` です。

### GET /api/tools/toolsets {#get-apitoolstoolsets}

すべてのツール群を、名札、説明、含むツールの一覧、有効・設定済みかどうかとあわせて返します。

### 管理用の入口 {#admin-endpoints}

MCP、経路、Webhook、紐付け、システムの各ページを支えているものです。どれも
`/api/` のほかの部分と同じ認証のしくみの後ろにあります。

| メソッドと経路 | 用途 |
|---------------|---------|
| `GET /api/mcp/servers` | 設定済みの MCP サーバーの一覧（環境変数の値は伏せられます） |
| `POST /api/mcp/servers` | サーバーを追加します。本文は `{name, url?, command?, args?, env?, auth?}` |
| `POST /api/mcp/servers/{name}/test` | つないで、ツールを一覧して、切ります |
| `PUT /api/mcp/servers/{name}/enabled` | サーバーの有効・無効を切り替えます |
| `DELETE /api/mcp/servers/{name}` | サーバーを取り除きます |
| `GET /api/mcp/catalog` | Nous が認めた MCP の目録を見ます |
| `POST /api/mcp/catalog/install` | 目録の項目を入れます（必要な環境変数つき） |
| `GET /api/messaging/platforms` | メッセージの経路をすべて、状態と基盤ごとの設定項目とあわせて並べます |
| `PUT /api/messaging/platforms/{id}` | 経路を設定します。本文は `{enabled?, env?, clear_env?}`（env は `.env` へ、enabled は `config.yaml` へ書かれます） |
| `POST /api/messaging/platforms/{id}/test` | その経路が設定済みか、有効か、つながっているかを返します |
| `GET /api/pairing` | 保留中と承認済みのメッセージ連携の利用者を並べます |
| `POST /api/pairing/approve` | コードを承認します。本文は `{platform, code}` |
| `POST /api/pairing/revoke` | 利用者を取り消します。本文は `{platform, user_id}` |
| `POST /api/pairing/clear-pending` | 保留中のコードをすべて捨てます |
| `GET /api/webhooks` | 購読の一覧と、基盤が有効かどうかを返します |
| `POST /api/webhooks` | 購読を作ります（一度きりの秘密を返します） |
| `DELETE /api/webhooks/{name}` | 購読を取り除きます |
| `GET /api/credentials/pool` | 持ち回りの鍵を並べます（伏せた形で） |
| `POST /api/credentials/pool` | 鍵を足します。本文は `{provider, api_key, label?}` |
| `DELETE /api/credentials/pool/{provider}/{index}` | 鍵を外します（番号は1から） |
| `GET /api/memory` | 使用中のしくみ、選べるしくみ、内蔵ファイルの大きさ |
| `PUT /api/memory/provider` | しくみを選びます（空にすると内蔵だけ） |
| `POST /api/memory/reset` | 内蔵の記憶を初期化します。本文は `{target: all\|memory\|user}` |
| `POST /api/gateway/start` · `/stop` · `/restart` | ゲートウェイの起動・停止（裏側で走ります） |
| `POST /api/ops/doctor` · `/security-audit` · `/backup` · `/import` | 診断と手入れ（裏側で走り、`/api/actions/{name}/status` で経過を追えます） |
| `GET /api/ops/hooks` | 設定されたシェルのフックと、許可の状態 |
| `GET /api/ops/checkpoints` · `POST .../prune` | `/rollback` の置き場所を見る・片付ける |
| `POST /api/ops/hooks` · `DELETE /api/ops/hooks` | シェルのフックを作る・外す（同意が要ります） |
| `GET /api/system/stats` | 端末の様子 — OS、CPU、メモリ、ディスク、稼働時間 |
| `GET /api/hermes/update/check` | 更新があるか（何コミット遅れているか、どう入れたか）を、適用せずに返します。git で入れていて遅れている場合は、変わった中身の `commits` の一覧（`sha`、`summary`、`author`、`at`）も返します。`?force=1` で6時間の使い回しを外せます |
| `GET /api/curator` · `PUT .../paused` · `POST .../run` | スキルの世話役の状態と、一時停止・再開・実行 |
| `GET /api/portal` | Nous Portal の認証とツールのゲートウェイの経路（読み取り専用） |
| `POST /api/ops/prompt-size` · `/dump` · `/config-migrate` | 診断（裏側で走ります） |
| `PUT /api/webhooks/{name}/enabled` | Webhook の経路の有効・無効を切り替えます |
| `POST /api/skills/hub/install` · `/uninstall` · `/update` | スキルの拠点の操作（裏側で走ります） |
| `GET /api/skills/hub/search` | すべての出どころにまたがってスキルの拠点を検索します |
| `GET /api/sessions/stats` | セッションの保管の統計 |
| `PATCH /api/sessions/{id}` | セッションの改名・書庫入れ |
| `GET /api/sessions/{id}/export` | セッション（付帯情報とメッセージ）を JSON で書き出します |
| `POST /api/sessions/prune` | N 日より前に終わったセッションを消します |
| `PUT /api/cron/jobs/{id}` | 予約の作業の指示・予定・名前・届け先を編集します |

## 認証（関門のある形） {#authentication-gated-mode}

管理画面を公開のアドレスや loopback 以外のアドレス（`127.0.0.1` / `localhost` 以外のすべて）に割り当てると、Hermes Agent は認証の関門を働かせます。どの要求も、確かめられたセッションの合鍵を持っていなければログインのページへ送り返されます。同梱のしくみは3つあります。

- **[利用者名とパスワード](#usernamepassword-provider-no-oauth-idp)** — 自前で立てた／構内の／自宅の管理画面に認証を付ける、いちばん手軽な方法です。外部の身元のしくみは要りません。**信頼できるネットワークの中か VPN の後ろでだけ使ってください。インターネットへの公開には向きません。**
- **[OAuth（Nous Portal）](#default-provider-nous-research)** — ホスト型の導入や、インターネットから届く管理画面向けで、[離れた Hermes デスクトップ版からの接続](#connecting-hermes-desktop-to-a-remote-backend)にもこれをお勧めします。ログインのたびに Nous のアカウントで確かめられるので、インターネットに面した用途に耐えるのはこのしくみです。
- **[自前の OIDC](#self-hosted-oidc-provider)** — 標準の OpenID Connect を使って、自分の身元のしくみ（Keycloak、Auth0、Okta、Google、OIDC の橋渡しを介した GitHub など）を持ち込むためのものです。Nous Portal は関わりません。規格に沿った OIDC のサーバーを前に立てるなら、インターネットへの公開にも耐えます。

loopback に割り当てた、運用者自身のための管理画面には何も起きません。認証もログインのページもありません。

### 関門が働く条件 {#when-the-gate-engages}

| フラグ | 認証の関門 | 使いどころ |
|-------|-----------|----------|
| `hermes dashboard`（既定。`127.0.0.1` に割り当て） | 働かない | 手元での開発 |
| `hermes dashboard --host 0.0.0.0` | **働く** | 離れた場所／本番。利用者名とパスワード、または OAuth で守ってください |

関門が働くのは、割り当てたアドレスが `127.0.0.1`、`::1`、`localhost` のいずれでもないとき、かつそのときだけです。`0.0.0.0`（や RFC1918 の私設アドレス、LAN のアドレス）に割り当てると働きます。古い `--insecure` のフラグでは**もう無効にできません**。後方互換のために受け付けはしますが、警告を出して無視されます。

:::danger `--insecure` は何もしません。認証は無効になりません
2026年6月の強化以降、`--insecure` では管理画面の認証を素通りできません。loopback 以外に割り当てた場合は、つねに認証のしくみ（利用者名とパスワード、または OAuth）が要ります。認証なしの管理画面が欲しいときは、`127.0.0.1` に割り当てて SSH のトンネルか Tailscale 越しに届かせてください。
:::

### 失敗したら閉じる作り {#fail-closed-semantics}

関門が働く条件なのに `DashboardAuthProvider` が**1つも**登録されていない場合（Nous の差し込みも自作の差し込みもない場合）、`hermes dashboard` ははっきりしたエラーを出して起動を断ります。「既定では拒むが実際は何でも通す」といった逃げ道はありません。設定を誤った関門つきの管理画面が、そのまま立ち上がることはないのです。

`hermes dashboard --host 0.0.0.0` を**対話的に**（本物の端末で）実行していて、まだ何のしくみも設定していないとき、Hermes はただ失敗するのではなく、その場で設定するかを聞いてきます。**利用者名とパスワード**を選べば（`config.yaml` に `dashboard.basic_auth` が書かれ、数秒で動き始めます）、**OAuth** を選べば `hermes dashboard register` を案内されます。対話的でない呼び出し（Docker/s6、CI、流し込みでの実行）はこの問いかけを飛ばして上記の「失敗したら閉じる」エラーに当たるので、人が見ていない導入が認証なしで立ち上がることはありません。

### 既定のしくみ: Nous Research {#default-provider-nous-research}

同梱の `plugins/dashboard_auth/nous` の差し込みは**つねに入っていて**、自動で読み込まれます。クライアント ID が設定されると、`nous` という名前の `DashboardAuthProvider` を自分で登録します。

ログインのたびに Nous Portal で確かめられ、Nous のアカウントで守られているので、**管理画面をインターネットへ公開するのに耐えるのは、この Nous のしくみです。**

#### 管理画面を登録する {#registering-a-dashboard}

Nous のしくみを使うには、OAuth のクライアント ID（`agent:{id}` の形）が要ります。手に入れ方は2つあります。

- **CLI — `hermes dashboard register`。** 管理画面を動かす端末で実行してください。今の Nous のログインを解決し（ログインしていなければ先に `hermes setup` を実行してください）、自前の管理画面用の OAuth クライアントを Portal に登録して、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書き込んでくれます。任意のフラグとして `--name`（人が読む名札。なければ自動で付きます）と `--redirect-uri`（インターネットに面した端末向けの、公開の HTTPS の戻り先）があります。

  ```bash
  hermes dashboard register
  # ✓ Registered dashboard "swift_falcon"
  # …writes HERMES_DASHBOARD_OAUTH_CLIENT_ID to ~/.hermes/.env
  ```

- **画面 — ローカルダッシュボードのページ。** Nous Portal の [`/local-dashboards`](https://portal.nousresearch.com/local-dashboards) を開くと、自前の管理画面をブラウザから登録・命名・管理・取り消しできます。出てきた `agent:{id}` のクライアント ID を `HERMES_DASHBOARD_OAUTH_CLIENT_ID`（環境変数）か `dashboard.oauth.client_id`（config.yaml）に写してください。CLI から登録した管理画面を取り消すのも、ここです。

#### 設定 {#configuration}

この差し込みは2か所を読み、環境変数に空でない値が入っているときはそちらが勝ちます。

**`config.yaml`** — こちらが正式な置き場所です。

```yaml
dashboard:
  oauth:
    client_id: agent:01HXYZ…             # required to engage the gate
```

**環境変数** — 運用者による上書きです。

| 環境変数 | 上書きする先 | 形式 | 用意するもの |
|---------|-----------|--------|----------------|
| `HERMES_DASHBOARD_OAUTH_CLIENT_ID` | `dashboard.oauth.client_id` | `agent:{instance_id}` | `hermes dashboard register` |

Hermes Agent の決まり（`~/.hermes/.env` は API キーと秘密のためのものです）に従い、手元での開発、構内の導入、自分で直に面倒を見る導入では、**この値は `config.yaml` に書くことをお勧めします**。環境変数の道が用意されているのは、ホスティング基盤の秘密の注入が、イメージの中の `config.yaml` を誰も編集せずに導入ごとの `client_id` を押し込めるようにするためで、それが本来の用途です。

環境変数が空のときは設定されていないものとして扱われるので、用意だけされて中身の入っていない基盤側の秘密が、正しい `config.yaml` の値をうっかり覆い隠すことはありません。

どちらからも client_id が得られない場合、差し込みは具体的な理由を報告し、管理画面が「失敗したら閉じる」で出すエラーが、何を直せばよいかを正確に教えてくれます。

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

ログイン済みの Hermes から、Nous で守られた管理画面まで3手順です。

**1. ログインして管理画面を登録する。** `hermes dashboard register` は今の Nous のログインを使って OAuth のクライアントを用意し、`HERMES_DASHBOARD_OAUTH_CLIENT_ID` を `~/.hermes/.env` に書き込みます。

```bash
hermes setup            # if you're not already logged into Nous Portal
hermes dashboard register
# ✓ Registered dashboard "swift_falcon"
# …writes HERMES_DASHBOARD_OAUTH_CLIENT_ID to ~/.hermes/.env
```

**2. 届くアドレスで管理画面を動かす。** loopback 以外への割り当てで OAuth の関門が働き、今書き込んだ `client_id` が `nous` のしくみを目覚めさせます。

```bash
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

**3. ログインする。** `http://<host>:9119/` を開くと `/login` へ送られます。**Sign in with Nous Research** を押して Portal で認証すると、認証済みの管理画面に戻ってきます。関門が働いているかは、どの端末からでも確かめられます。

```bash
curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["nous"]
```

そのあと `GET /api/auth/me` は、確かめられたセッション（`provider: nous`）を返します。インターネットに面した端末では、`--redirect-uri https://hermes.example.com/auth/callback` を付けて登録し、`HERMES_DASHBOARD_PUBLIC_URL` を設定して OAuth の戻り先が公開の URL になるようにしてください（[公開 URL の上書き](#public-url-override)を参照）。

### 利用者名とパスワードのしくみ（OAuth の身元基盤なし） {#usernamepassword-provider-no-oauth-idp}

OAuth の身元基盤を結線したくない場合 —「管理画面にとりあえずパスワードを掛けたい」という自前の導入 — 同梱の `plugins/dashboard_auth/basic` の差し込みが、OAuth の転送ではなく**利用者名とパスワード**で認証する `basic` という名前の `DashboardAuthProvider` を登録します。

これは OAuth のしくみとまったく同じ関門に差し込まれます。loopback 以外への割り当てで関門が働き、ログインのページは（「◯◯でログイン」のボタンではなく）認証情報の入力欄を描き、ログインから先のすべて — セッションの合鍵、裏での更新、WebSocket の引換券、ログアウト、監査の記録 — は OAuth の道とまったく同じです。セッションは、このしくみが自分で作る、状態を持たない HMAC で署名した合鍵なので、**データベースも外部の身元基盤も要りません**。パスワードのハッシュには標準ライブラリの `scrypt` を使います（外部の部品は要りません）。

:::warning 信頼できるネットワークでだけ使ってください。インターネットには向きません
利用者名とパスワードのしくみは、**信頼できるネットワーク**の中、あるいは **VPN** 越しにだけ届く、自前・構内・自宅の管理画面のためのものです。共有の認証情報を1組守るだけで、その後ろに外部の身元基盤も多要素認証も利用者ごとのアカウントもないので、**管理画面をインターネットに直接さらす用途には向きません**。インターネットに面した管理画面には、[Nous Research のしくみ](#default-provider-nous-research)（あるいは自分の[自前の OIDC](#self-hosted-oidc-provider) や[自作のしくみ](#custom-providers)）を使ってください。
:::

#### 設定 {#configuration}

Nous のしくみと同じく、`config.yaml`（正式な置き場所）を読み、環境変数に空でない値があればそちらが勝ちます。`username` と、`password_hash`（こちらが望ましい）か `password` のどちらかがそろったときだけ働き、そうでなければ何もしないので、OAuth を使う人にも loopback で使う人にも影響しません。

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

| 環境変数 | 上書きする先 | 備考 |
|---------|-----------|-------|
| `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` | `dashboard.basic_auth.username` | 働かせるのに必須 |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` | `dashboard.basic_auth.password_hash` | こちらが望ましい（平文を残さずに済みます） |
| `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` | `dashboard.basic_auth.password` | 平文。設定の `password_hash` **より優先される**ので、環境変数で入れ替えられます |
| `HERMES_DASHBOARD_BASIC_AUTH_SECRET` | `dashboard.basic_auth.secret` | 合鍵に署名するための鍵 |
| `HERMES_DASHBOARD_BASIC_AUTH_TTL_SECONDS` | `dashboard.basic_auth.session_ttl_seconds` | 合鍵の有効期間 |

:::caution セッションを保たせるには `secret` をはっきり決めてください
`secret` が空だと、プロセスごとに乱数の署名鍵が作られます。1つのプロセスならそれで困りませんが、**再起動のたびにセッションがすべて無効になり**、複数のワーカーにまたがることも**できません**。再起動を越えたい導入や、ワーカーを複数動かす導入では、`secret` をはっきり決めてください。
:::

`/auth/password-login` の入口は接続元の IP ごとに回数が制限され（既定は毎分10回まで。超えると HTTP 429）、知らない利用者のときも間違ったパスワードのときも同じ `401 Invalid credentials` を返すので、利用者名を探る手掛かりには使えません。

#### 実際にやってみる: 利用者名とパスワード {#worked-example-usernamepassword}

何もない状態から、信頼できるネットワークでパスワードの掛かった管理画面まで3手順です。

**1. `~/.hermes/.env` に認証情報を書く。** 平文を残さないようパスワードをハッシュにし、再起動を越えてセッションが残るように、変わらない署名の秘密も決めます。

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

**2. 届くアドレスで管理画面を動かす。** loopback 以外への割り当てで関門が働き、利用者名とハッシュが `basic` のしくみを目覚めさせます。

```bash
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

**3. ログインする。** `http://<host>:9119/` を開くと `/login` へ送られ、そこには（「◯◯でログイン」のボタンではなく）**認証情報の入力欄**が出ます。`admin` と自分のパスワードを入れれば、認証済みの管理画面に着きます。関門が働いているかは、どの端末からでも確かめられます。

```bash
curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'
# true
# ["basic"]
```

そのあと `GET /api/auth/me` は、確かめられたセッション（`provider: basic`）を返します。これは VPN の後ろに置いてください。上の注意を参照してください。公開の端末には、[Nous Research](#default-provider-nous-research) か[自前の OIDC](#self-hosted-oidc-provider) のしくみを使ってください。

#### パスワードのしくみを自分で書く {#writing-your-own-password-provider}

`basic` は拡張の口に対する実装の1つにすぎません。どんな差し込みでもパスワードのしくみを登録できます。`DashboardAuthProvider` を継承したクラスに `supports_password = True` を立て、`complete_password_login(*, username, password) -> Session` を実装してください（拒むときは `InvalidCredentialsError` を、後ろの保管先が落ちているときは `ProviderError` を投げます）。パスワードだけのしくみなら、OAuth の `start_login` / `complete_login` は `NotImplementedError` のままで構いません。LDAP のバインドや、認証情報のデータベース、そのほか転送を伴わない認証の方式はこの道を通ります。入力欄も、経路も、合鍵も、更新も、枠組みのほうが引き受けてくれます。

### 自前の OIDC のしくみ {#self-hosted-oidc-provider}

自分で身元のしくみを運用している場合、同梱の `plugins/dashboard_auth/self_hosted` の差し込みが、**標準の OpenID Connect** を使って管理画面をそこに認証させます。身元基盤ごとのコードも要らず、Nous Portal も関わりません。規格に沿った OIDC のサーバーで確かめられていて、どれでも動きます。

> **Authentik · Keycloak · Zitadel · Authelia · Auth0 · Okta · Google · …**

Nous のしくみと同じく自動で読み込まれ、設定されたときにだけ自分を登録するので、loopback の管理画面では何もしません。

#### 設定 {#configuration}

**issuer** と **client_id**（クライアントの秘密を持たない、PKCE を使う公開のクライアント）を設定します。差し込みは身元基盤の `authorization_endpoint`、`token_endpoint`、`jwks_uri` を `{issuer}/.well-known/openid-configuration` から取ってくるので、接続先の URL を自分で書き込む必要はありません。

**`config.yaml`** — こちらが正式な置き場所です。

```yaml
dashboard:
  oauth:
    provider: self-hosted
    self_hosted:
      issuer: https://auth.example.com/application/o/hermes/   # required
      client_id: hermes-dashboard                              # required
      scopes: "openid profile email"                           # optional (this is the default)
```

**環境変数** — 運用者による上書きです（空でない値が入っていれば `config.yaml` より優先され、空の値は設定されていないものとして扱われます）。

| 環境変数 | 上書きする先 | 備考 |
|---------|-----------|-------|
| `HERMES_DASHBOARD_OIDC_ISSUER` | `dashboard.oauth.self_hosted.issuer` | OIDC の issuer の URL。必須です |
| `HERMES_DASHBOARD_OIDC_CLIENT_ID` | `dashboard.oauth.self_hosted.client_id` | 公開のクライアント ID。必須です |
| `HERMES_DASHBOARD_OIDC_SCOPES` | `dashboard.oauth.self_hosted.scopes` | 既定は `openid profile email` です |

身元基盤の側では、認可コード + PKCE（S256）で動く**公開**のアプリケーション／クライアントを登録し、管理画面の戻り先を許可する URI に加えてください。戻り先は `<dashboard public URL>/auth/callback` です（中継の後ろで公開 URL をどう決めるかは[公開 URL の上書き](#public-url-override)を参照）。

#### 何を確かめているか {#what-it-verifies}

このしくみは、OpenID Connect の **ID トークン**（RS256/ES256）を、見つけてきた `jwks_uri` に照らして確かめます。`iss` と `aud` の主張は、設定した `issuer` と `client_id` に固定されます。標準の OIDC の主張は、管理画面のセッションに次のように対応します。

| セッションの項目 | 主張 |
|---------------|----------|
| `user_id` | `sub`（必須） |
| `email` | `email` |
| `display_name` | `name` → `preferred_username` → `nickname` → `email` |
| `org_id` | `org_id` / `organization`、なければつないだ `groups` |

身元を決めるのは ID トークンのほうで、アクセストークンは中身を読まないものとして扱われます（OIDC の仕様は、これが JWT であることを求めていません）。接続先の URL は HTTPS であることが求められます（手元で開発する身元基盤のために、loopback の `http://` は許されます）。また、見つけてきた設定が掲げる `issuer` は、こちらが設定したものと一致していなければなりません（末尾のスラッシュの違いは大目に見られます）。身元基盤が更新用の合鍵を出す場合は、標準の `refresh_token` の付与を使って裏で認証をやり直します。ログアウトでは、掲げられていれば身元基盤の RFC 7009 の `revocation_endpoint` を呼びます。

> **秘密を持つクライアント**（`client_secret` のあるもの）にはまだ対応していません。ブラウザに面した管理画面ではふつうそうするように、公開 + PKCE のクライアントを設定してください。

#### 実際にやってみる: Keycloak {#worked-example-keycloak}

[Keycloak](https://www.keycloak.org/) は、手元で試すのにいちばん立ち上げやすい自前の OIDC サーバーの1つです。開発向けの起動なら単一のコンテナで動き（データベースはメモリ上）、お手本のような OIDC の探索を掲げます。この道筋をたどれば、何もない状態から管理画面へのログインまで数分です。

**1. 用意した realm つきで Keycloak を動かす。** この realm の書き出しを `realm-hermes.json` として保存してください。`hermes` という realm、**PKCE を使う公開のクライアント**（`hermes-dashboard`）、そして試験用の利用者を定義していて、起動時にまとめて読み込まれるので、管理画面で押すものは何もありません。

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

そのファイルを読み込み用のディレクトリに載せて起動します（Keycloak 26 以降）。

```bash
docker run --rm -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v "$PWD/realm-hermes.json:/opt/keycloak/data/import/realm-hermes.json:ro" \
  quay.io/keycloak/keycloak:26.0 \
  start-dev --import-realm
```

立ち上がると、この realm は
`http://localhost:8080/realms/hermes/.well-known/openid-configuration` で標準の OIDC の探索を掲げます（issuer は
`http://localhost:8080/realms/hermes` です）。管理の画面は
`http://localhost:8080/`（`admin` / `admin`）にあります。

**2. 管理画面をそこに向ける。** 自前の OIDC の差し込みは loopback の `http://` の issuer を許すので（loopback 以外の issuer には HTTPS が要ります）、手元の Keycloak はそのまま使えます。

```bash
export HERMES_DASHBOARD_OIDC_ISSUER="http://localhost:8080/realms/hermes"
export HERMES_DASHBOARD_OIDC_CLIENT_ID="hermes-dashboard"
export HERMES_DASHBOARD_PUBLIC_URL="http://localhost:9119"
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
```

`HERMES_DASHBOARD_PUBLIC_URL` は、OAuth の戻り先が
`http://localhost:9119/auth/callback` であることを管理画面に伝えます。これが上の realm に
登録した戻り先の URI です。OAuth の関門を働かせているのは、
`0.0.0.0`（loopback 以外）への割り当てのほうです。

**3. ログインする。** `http://localhost:9119/` を開くと `/login` へ送られます。**Sign in with Self-Hosted OIDC** を押し、Keycloak で `testuser` / `testpassword` として認証すると、認証済みの管理画面に戻ってきます。横の欄には `Logged in as Test User via self-hosted` と出て、`GET /api/auth/me` は確かめられたセッション（`provider: self-hosted`、`email: testuser@example.com`）を返します。

> 別のホストやポートで動かしたり見たりする場合は、その出どころの
> `…/auth/callback` を、Keycloak の管理画面でクライアントの**有効な戻り先の URI**に
> 加えてください（Clients → hermes-dashboard → Settings）。同じやり方が
> Authentik、Zitadel、Authelia などの OIDC サーバーでも通じます。違うのは issuer の
> URL とクライアント登録の画面だけです。

### 公開 URL の上書き {#public-url-override}

既定では、管理画面は OAuth の戻り先の URL を要求から組み立て直します。`X-Forwarded-Host` + `X-Forwarded-Proto` + `X-Forwarded-Prefix` を使います（uvicorn が `proxy_headers=True` で動いているときで、関門が働いているときは `start_server` がこれを有効にします）。この3つの見出しを正しく渡す中継の後ろなら、何もしなくても動きます。

これらの見出しを確実に渡してくれない中継の後ろで動かす場合（手作りの nginx、構内の入口、経路の一部だけを中継する独自ドメインの導入など）は、`dashboard.public_url`（または `HERMES_DASHBOARD_PUBLIC_URL`）に、管理画面に届く**完全な公開 URL** を設定してください。

```yaml
dashboard:
  public_url: "https://dashboard.example.com/hermes"
```

設定すると、OAuth の戻り先の URL はそのまま `<public_url>/auth/callback` になります。この道筋では `X-Forwarded-Prefix` は無視されます。運用者が公開 URL をはっきり宣言しているからです。これは意図してそうしています。上に前置きを重ねると、前置きがすでに `public_url` に入っている大多数の場合に、二重に付いてしまうからです。

`public_url` に書かれたホスト名は、HTTP の `Host` と WebSocket の `Origin` の値としても
**完全一致で**受け入れられます。ブラウザから見えるホスト名を保ったまま、
`127.0.0.1` に割り当てた管理画面へ渡す中継のためです。
ワイルドカードや後方一致は許されないので、
`dashboard.example.com.evil.test` のような攻撃者のホストは、DNS の付け替えを防ぐ関門に
弾かれたままです。

loopback 以外の `public_url` を宣言すると、バックエンドが loopback に割り当てられていても、
つねに管理画面の認証の関門が働きます。先にパスワードか OAuth のしくみを
設定してください。それがないと、Hermes は起動の時点で止まります。手元の SPA の
セッションの合鍵が、中継を通して離れた場所からの認証の手段になってしまうのを防ぐためです。
このとき Uvicorn は、信頼できる中継の見出しの処理も有効にするので、手元の TLS の
終端が `X-Forwarded-Proto: https` を渡して安全な合鍵にできます。

```bash
# Backend remains reachable only on this machine.
hermes dashboard --host 127.0.0.1 --port 9119 --no-open
```

TLS を終端する中継を `http://127.0.0.1:9119` に向け、
`dashboard.public_url` には同じ外向きの出どころを書いてください。

Tailscale Serve はこの形の一例です。`https://<machine>.<tailnet>.ts.net` というホスト名で
tailnet の中だけの HTTPS を終端しつつ、loopback の管理画面へ中継できます。
その HTTPS の出どころをそのまま `dashboard.public_url` に使ってください。それでも
loopback 以外のブラウザ向けの出どころとして扱われるので、管理画面の認証のしくみが要ります。
インターネットから届くようにする必要は
ありません。

優先の順番はほかの管理画面の設定と同じで、環境変数が `config.yaml` に勝ちます。

| 置き場所 | 上書きする経路 | 使いどころ |
|---------|---------------|-------------|
| `config.yaml` の `dashboard.public_url` | `HERMES_DASHBOARD_PUBLIC_URL` | 手元での開発／構内（正式な置き場所） |
| 環境変数 `HERMES_DASHBOARD_PUBLIC_URL` | — | ホスティング基盤の秘密／CI |
| （未設定） | — | 既定 — `X-Forwarded-*` の見出しから組み立て直します |

`http://` / `https://` の書き出しがない値、ホストのない値、引用符・不等号・空白・制御文字を含む値は受け付けられません。形の壊れた値は黙って見出しからの組み立てに落ちるので、利用者を危ない URL へ送り出す代わりに、ログインの流れがそのまま動き続けます。

> **注:** `public_url` が上書きするのは OAuth の戻り先の URL だけです。合鍵の `Secure` の印は今も `request.url.scheme`（proxy_headers の下では X-Forwarded-Proto）で決まるので、TLS を終端した公開の導入で `public_url` に `http://` を書くと、Secure の付かない合鍵ができてしまいます。これは運用者が踏みやすい落とし穴です。`public_url` を使うときは、上流できちんと TLS を終端させてください。

### OAuth の流れ {#oauth-flow}

このしくみは [Nous Portal の OAuth の取り決め v1](https://github.com/NousResearch/nous-account-service/blob/main/docs/agent-dashboard-oauth-contract.md) を実装しています。PKCE（S256）を使う認可コードの方式です。

1. 利用者がセッションの合鍵なしで `/` に来る → 関門が `/login` へ送ります。
2. ログインのページに「Continue with Nous Research」のボタンが出ます → `/auth/login?provider=nous`。
3. サーバーが PKCE の状態を短命の合鍵にしまい、利用者を `https://portal.nousresearch.com/oauth/authorize?…` へ送ります。
4. 利用者が Portal で認証し、`/auth/callback?code=…&state=…` に着きます。
5. サーバーが `POST /api/oauth/token` でコードをアクセストークンに交換し、Portal の JWKS（`/.well-known/jwks.json`）に照らして JWT の署名を確かめ、`hermes_session_at` の合鍵を置きます。
6. 利用者は `/`（あるいは `next=` の引数で指定された、もともと行きたかった深い場所）へ送られます。

アクセストークンの有効期間は15分です。**取り決め v1 に更新用の合鍵はありません。** 期限が切れると、SPA の取得の包みが 401 の返りを見つけ、ページごと `/login` へ移動してこの流れをやり直します。

### 置かれる合鍵 {#cookies-set}

| 名前 | 有効期間 | 備考 |
|------|----------|-------|
| `hermes_session_at` | 合鍵の有効期間（15分） | HttpOnly、SameSite=Lax、HTTPS のときは Secure |
| `hermes_session_pkce` | 10分 | HttpOnly。往復のあいだ PKCE の検証子とどのしくみかの手掛かりを持ちます。HTTPS では SameSite=None + Secure（サイトをまたぐ身元基盤への転送の連なりを越える必要があります。Chromium は、サイトをまたぐ連なりの中で 302 とともに置かれた SameSite=Lax の合鍵を捨てるためです）。loopback の HTTP では SameSite=Lax |
| `hermes_session_rt` | v1 では使いません | 将来のために取ってあります。`refresh_token` が空のときは書かれません |

3つとも `Path=/` です。セッションの合鍵は `SameSite=Lax` で、PKCE の合鍵は HTTPS 越しに置かれるときだけ `SameSite=None` です（表を参照）。`Secure` の印は、管理画面に HTTPS で届いているときに付きます（要求の URL の書き出しで判断し、`proxy_headers=True` の下では上流の TLS の終端から来る `X-Forwarded-Proto` を尊重します）。

### ログアウト {#logout}

横の欄の小さな表示に `Logged in as <user_id…> via nous` とログアウトの印が出ます。それを押すと `/auth/logout` へ送られ、管理画面の認証の合鍵がすべて消えて `/login` に戻ります。

### 監査の記録 {#audit-log}

ログインの開始、成功、失敗、そしてセッションの確認の失敗は、すべて JSON の1行として `$HERMES_HOME/logs/dashboard-auth.log` に書かれます。取り扱いに注意の要る項目（`access_token`、`refresh_token`、`code`、`code_verifier`、`state`、`Authorization` の見出し）は、記録する前に伏せられます。

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

ログインのページには登録されたしくみがすべて並びます。複数を重ねておいて、利用者が `/login` で選ぶこともできます。

### 対話によらない認証（持参する合鍵） {#non-interactive-bearer-token-auth}

人が対話でログインする道（セッションの合鍵と更新）とは別に、`DashboardAuthProvider` の抽象基底クラスは、`supports_token = True` と `verify_token(token=...)` によって、**対話によらないサービス間**のやり方にも対応しています。しくみがこれを選ぶと、届いた `Authorization: Bearer <token>` が確かめられ、通ればそのしくみが機械向けと印を付けた入口に対して、要求に `TokenPrincipal` が付きます（`request.state.token_principal`）。合鍵も転送も更新もありません。

同梱の最初の使い手は **drain** のしくみ（`plugins/dashboard_auth/drain`）です。`nous-account-service` がエージェントごとの秘密を `HERMES_DASHBOARD_DRAIN_SECRET` で用意し、このしくみが届いた合鍵をそれと時間の一定な比較で確かめて、`/api/gateway/drain` を機械向けの入口として登録します。**失敗したら閉じる**作りで、弱い／短い秘密（256 ビット未満）は登録の時点で拒まれ、入口は無効のままです。環境変数が設定されていないときは何もしません。振る舞いのつまみ（`scope`、`min_secret_chars`）は `config.yaml` の `dashboard.drain_auth` の下にあります。

自作のしくみも、同じやり方で `supports_token` と `verify_token` を実装すれば、自分の機械向けの入口を公開できます。

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

管理画面の React で作られた状況のページにも、「Web server」の下に同じ項目が出ます。サインインすると、横の欄の認証の表示に今の身元が出ます。

## Hermes デスクトップ版を離れたバックエンドにつなぐ {#connecting-hermes-desktop-to-a-remote-backend}

Hermes デスクトップ版は、別の端末（仮想サーバー、自宅のサーバー、Tailscale の後ろの小型機）で動く Hermes のバックエンドを動かせます。アプリの中では**設定 → ゲートウェイ → リモートゲートウェイ**にあり、**リモート URL** と**サインイン**の方法を聞かれます。（デスクトップ版そのもの — 導入、設定、チャット — については [Hermes デスクトップ版](/hermes/docs/user-guide/desktop/)のページを参照してください。）

離れた管理画面は、同梱の認証のしくみのどれかで守り、デスクトップ版はバックエンドが掲げているほうでサインインします。自分の端末の外から届くバックエンド（仮想サーバー、公開の端末、インターネットに面したもの）には、**OAuth（Nous Portal）**をお勧めします（[`hermes dashboard register`](#registering-a-dashboard) で登録し、*Sign in with Nous Research* からサインインします）。同梱の[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)は、バックエンドが信頼できる構内網にあるか VPN 越しにしか届かないときにいちばん手早い選択肢ですが、**インターネットへの直接の公開には向きません**。管理画面を loopback 以外のアドレスに割り当てると認証の関門が働きます。一度サインインすれば、デスクトップ版はそのセッションをチャットの WebSocket にも自動で使い回すので、合鍵を写し取って貼り付ける必要はありません。

以下の手順では、信頼できるネットワークでいちばん早く立ち上がる利用者名とパスワードの道を使います。OAuth の道は[既定のしくみ: Nous Research](#default-provider-nous-research) を参照してください。

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

平文を残したくないですか。代わりに `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` に scrypt のハッシュを入れてください。設定できるすべては[利用者名とパスワードのしくみ](#usernamepassword-provider-no-oauth-idp)を参照してください。

管理画面を systemd のサービスとして動かす場合、そのユニットに `EnvironmentFile=%h/.hermes/.env` があれば `~/.hermes/.env` は自動で拾われるので、起動の時点で認証情報が環境に入ります。

:::warning
管理画面はあなたの `.env`（API キー、秘密）を読み書きし、エージェントのコマンドも走らせられます。ここで示した**利用者名とパスワード**の作りは、信頼できるネットワーク向けです。パスワードで守っただけの管理画面を、外のインターネットに直接さらしてはいけません。VPN の後ろに置いてください。[Tailscale](https://tailscale.com/) はきれいな選択肢です。その端末の tailscale の IP に割り当て（`--host <tailscale-ip>`）、リモート URL には `http://<tailscale-ip>:9119` を使ってください。自分の tailnet の中の機器からしか届きません。インターネット越しにバックエンドへ届かせたいときは、代わりに **OAuth（Nous Portal）**のしくみを使ってください。
:::

### Hermes デスクトップ版で {#in-hermes-desktop}

**設定 → ゲートウェイ → リモートゲートウェイ:**

- **リモート URL** — `http://<backend-host>:9119`（前に中継を置くなら、`/hermes` のような経路の前置きも使えます）
- **サインイン** — アプリが利用者名とパスワードのゲートウェイだと気付いて**サインイン**のボタンを出すので、それを押して手順1の認証情報を入れます
- **保存して接続し直す** — デスクトップ版の外側を、離れたバックエンドへ切り替えます

バックエンドで `HERMES_DASHBOARD_BASIC_AUTH_SECRET` を設定してあれば、セッションは自動で更新され、再起動を越えて残ります。

### 環境変数による上書き {#environment-variable-override}

アプリの中の設定の代わりに、起動の前に環境変数でバックエンドを指すこともできます。`HERMES_DESKTOP_REMOTE_URL` を設定すると、アプリに保存された URL より優先されます（ゲートウェイの設定の区画に「env override」の札が出て、編集できなくなります）。**サインイン**はそのまま、その区画から利用者名とパスワードで行います。

| 環境変数 | 値 |
|---------|-------|
| `HERMES_DESKTOP_REMOTE_URL` | `http://<backend-host>:9119` |

### うまくいかないとき {#troubleshooting}

- **「Remote gateway incomplete」** — リモート URL を入れていません。
- **サインインが 401 や「Invalid credentials」で失敗する** — 利用者名かパスワードが、バックエンドの `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` と合っていません。バックエンドは、知らない利用者のときも間違ったパスワードのときも同じ文言を返すので、両方を確かめてください。関門は `curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'` で確かめられます。`true` が返り、`"basic"` が含まれるはずです。
- **「サインイン」のボタンが出ず、代わりにセッションの合鍵を求められる** — 利用者名とパスワードのしくみが働いていません（`/api/status` に `"basic"` が出ません）。利用者名とパスワード（またはそのハッシュ）が設定されていて、管理画面のプロセスがそれを読み込んでいるか確かめてください。
- **再起動のたびにサインアウトされる** — `HERMES_DASHBOARD_BASIC_AUTH_SECRET` に変わらない値を設定してください。そうしないと、起動のたびに署名鍵が作り直されます。
- **接続を拒まれる・時間切れになる** — バックエンドが届くアドレスではなく `127.0.0.1`（既定）に割り当てられているか、ファイアウォールや VPN がポートを塞いでいます。`0.0.0.0` か tailscale の IP に割り当てて、信頼できるネットワークにポートを開けてください。

## CORS {#cors}

ウェブサーバーは、CORS を localhost の出どころだけに限っています。

- `http://localhost:9119` / `http://127.0.0.1:9119`（本番）
- `http://localhost:3000` / `http://127.0.0.1:3000`
- `http://localhost:5173` / `http://127.0.0.1:5173`（Vite の開発サーバー）

別のポートでサーバーを動かした場合、その出どころは自動で加えられます。

## 開発 {#development}

管理画面の画面側に手を入れる場合は、次のようにします。

```bash
# Terminal 1: start the backend API
hermes dashboard --no-open

# Terminal 2: start the Vite dev server with HMR
cd web/
npm install
npm run dev
```

`http://localhost:5173` の Vite の開発サーバーは、`/api` への要求を `http://127.0.0.1:9119` の FastAPI のバックエンドへ中継します。

画面側は React 19、TypeScript、Tailwind CSS v4、そして shadcn/ui 風の部品で作られています。本番向けの組み立ての出力は `hermes_cli/web_dist/` に置かれ、FastAPI のサーバーがそれを静的な SPA として配ります。

## 更新時の自動の組み立て {#automatic-build-on-update}

`hermes update` を実行すると、`npm` が使えるときは画面側も自動で組み立て直されます。これでコードの更新と管理画面がずれずに済みます。`npm` が入っていない場合、更新は画面側の組み立てを飛ばし、`hermes dashboard` が最初の起動時に組み立てます。

## 見た目と差し込み {#themes-plugins}

管理画面には8つの見た目が同梱されていて、自分で作った見た目、差し込みのタブ、バックエンドの API の経路で広げられます。どれも置くだけで使え、リポジトリを写し取る必要はありません。

**見た目をその場で切り替える**には、上の帯にある、言語の切り替えの隣のパレットの印を押します。選んだものは `config.yaml` の `dashboard.theme` に保存され、次にページを開いたときも復元されます。

**フォントだけを変える**のも同じ選択画面からできます。見た目の一覧の下にある**フォント**の節が、今使っている見た目の文字を上書きします。この選択は見た目を切り替えても残ります（`config.yaml` の `dashboard.font`）。**見た目の既定**を選べば、これを消してその見た目そのもののフォントに戻ります。

同梱の見た目は次のとおりです。

| 見た目 | 持ち味 |
|-------|-----------|
| **Hermes Teal**（`default`） | 暗い青緑とクリーム、システムのフォント、ゆったりした余白 |
| **Hermes Teal (Large)**（`default-large`） | 既定と同じで、文字は18pxで余白はさらに広め |
| **Nous Blue**（`nous-blue`） | Nous らしい青の差し色と、風通しのよい余白 |
| **Midnight**（`midnight`） | 深い青紫、Inter と JetBrains Mono |
| **Ember**（`ember`） | 温かい深紅と青銅、Spectral の明朝と IBM Plex Mono |
| **Mono**（`mono`） | 灰色だけ、IBM Plex、詰まった余白 |
| **Cyberpunk**（`cyberpunk`） | 黒地にネオンの緑、Share Tech Mono |
| **Rosé**（`rose`） | 桃色と象牙色、Fraunces の明朝、広めの余白 |

自分の見た目を作る、差し込みのタブを足す、外枠の差し込み口に入れ込む、差し込み固有の REST の入口を公開するといったことは、**[管理画面を広げる](/hermes/docs/user-guide/features/extending-the-dashboard/)**を参照してください。ひととおりの手引きとして、次を扱っています。

- 見た目の YAML の定義 — 配色、書体、配置、素材、componentStyles、colorOverrides、customCSS
- 配置の型 — `standard`、`cockpit`、`tiled`
- 差し込みの目録、SDK、外枠の差し込み口、ページごとの差し込み口（内蔵のページを置き換えずに部品を入れ込めます）、バックエンドの FastAPI の経路
- 見た目と差し込みを組み合わせた通しの道筋（Strike Freedom のコックピットの実演）
- 見つけ方、読み直し、うまくいかないときの手当て
