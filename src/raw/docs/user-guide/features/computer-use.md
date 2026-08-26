---
title: "コンピュータ操作"
description: ""
upstream_path: user-guide/features/computer-use.md
upstream_blob: d43f0584f7c92dd8e9d555fc746c99e52bd655e0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/computer-use
---

# コンピュータ操作 {#computer-use}

Hermes Agent は、あなたのデスクトップを **背後で** 操作できます。クリック、
入力、スクロール、ドラッグまで、**macOS・Windows・Linux** のいずれでも動きます。
あなたのカーソルは動かず、キーボードの焦点も変わらず、仮想デスクトップや
Spaces が勝手に切り替わることもありません。同じ機械の上で、あなたと
エージェントが並んで作業できます。

よくあるコンピュータ操作の連携と違い、この仕組みは **ツールを呼べるモデルなら
どれでも** 動きます。Claude、GPT、Gemini でも、ローカルの OpenAI 互換の
エンドポイントで動かすオープンなモデルでも構いません。Anthropic 独自のスキーマを
気にする必要はありません。

## 仕組み {#how-it-works}

内蔵の `computer_use` ツール群が、Hermes として推奨する連携方法です。オープンソースの
背後型コンピュータ操作ドライバーである
[`cua-driver`](https://github.com/trycua/cua) と、stdio 上の MCP で
やり取りします。プラットフォームごとに、それぞれ適したアクセシビリティと
入力の仕組みを内部で使います。

| プラットフォーム | アクセシビリティツリー | 入力の送り方 |
|---|---|---|
| macOS | AX（非公開の SkyLight SPI） | `SLPSPostEventRecordTo` — pid 単位で、カーソルは飛びません |
| Windows | UIAutomation | `SendInput` + `PostMessage` — 焦点を奪いません |
| Linux | AT-SPI（X11 + Wayland） | XTest（X11）/ virtual-keyboard（Wayland） |

結果はどのプラットフォームでも同じです。エージェントは、目に見えている窓の
アクセシビリティツリーを読み、合成したイベントを送れます。しかも窓を手前に
出したり、仮想デスクトップを切り替えたり、本物の OS のカーソルを動かしたり
することはありません。

その土台にある取り決め、つまり背後で動くことが *なぜ* 大事なのか、手前に出さない
という不変条件、クリックを送る内部の仕組みについては
**[cua.ai/docs/explanation/the-no-foreground-contract](https://cua.ai/docs/explanation/the-no-foreground-contract)** を参照してください。

## 有効にする {#enabling}

**新しくインストールした環境には、すでにドライバーが入っています。** Hermes の
インストーラー（`install.sh` / `install.ps1`）が `cua-driver` を先に入れておくので
（可能な範囲で。`--skip-computer-use` / `-SkipComputerUse` を渡せば見送れます）、
コンピュータ操作を使うには設定を切り替えるだけです。

- **`hermes tools`** → `🖱️  Computer Use` を選びます。まだ入っていなければ
  ドライバーを自動でインストールします。
- **ダッシュボードやデスクトップアプリ** → コンピュータ操作のツール群を切り替えます。
  ドライバーが無ければ、その操作が背後でインストールを自動的に始めます
  （進み具合はツール群のパネルで見られます）。

**手で入れる場合（古い環境や、インストーラーの手順を飛ばした場合）:**

```
hermes computer-use install
```

これは上流の cua-driver のインストーラーを取ってきて実行します。macOS と Linux では
`install.sh`、Windows では `install.ps1` です。入ったかどうかは `hermes computer-use
status` で確かめられます。

すでに cua-driver がありますか。0.20 のランタイムの取り決めに対応していれば、Hermes は
それをそのまま使います。セットアップ時、ツール群を有効にしたとき、`hermes update` のとき、
そしてセッションで最初に `computer_use` を呼んだときに、Hermes は手元のバージョンと
マニフェストを確認します。標準の入れ方をした古い、あるいは不完全なものは、上流の
インストーラーを通して修復します（実行中は 1 セッションにつき最大 1 回）。
`HERMES_CUA_DRIVER_CMD` で指定したバイナリは
あなたの管理下にあるものなので、Hermes は非互換を報告するだけで、手を加えません。

Cua Driver を先に入れた場合、`cua-driver skills install` を実行すると Cua のスキル一式が
`~/.cua-driver/skills/cua-driver` の下に入ります。Hermes の自動検出は cua-driver 側で
これから対応する予定なので、いまのところはそのディレクトリを Hermes に指すか、スキルの
置き場所にシンボリックリンクを張ってください。生の Cua の MCP ツールを独自の MCP サーバーとして
登録することもできますが、これは低水準の入り口が必要な人向けの代替手段です。内蔵の
ツール群のほうが、Hermes の動作・設定・承認・診断をひととおり備えています。

どの方法で入れた場合でも、インストール後にプラットフォームごとの前提条件を
許可してください。

| プラットフォーム | 前提条件 |
|---|---|
| **macOS** | システム設定 → プライバシーとセキュリティ → **アクセシビリティ** と **画面収録**。`hermes computer-use doctor` が示す名前に対して許可します。標準モードは CuaDriver.app を使い、bounded と unrestricted のモードは Hermes ホストの名義を使います。 |
| **Windows** | インストール時には不要です。RDP やコンソールではなく SSH 越しに操作する場合は、自動起動の型が必要です。Session 0 と Session 1 以降をつなぐ中継については [cua.ai/docs/how-to-guides/driver/windows-ssh](https://cua.ai/docs/how-to-guides/driver/windows-ssh) を参照してください。 |
| **Linux** | 届くディスプレイサーバー。X11 なら `DISPLAY` を設定し、Wayland なら `XDG_SESSION_TYPE=wayland` にします。Wayland のセッションでは画面の取り込みに XWayland の橋渡しが要ります。AT-SPI も有効にしておく必要があります（GNOME / KDE / Xfce では既定で有効です）。 |

そのうえで、ツール群を有効にしたセッションを開始します。

```
hermes -t computer_use chat
```

あるいは `~/.hermes/config.yaml` の有効なツール群に `computer_use` を加えます。

## 権限のモードと、ログイン済みのブラウザプロファイル {#permission-modes-and-logged-in-browser-profiles}

Hermes は、これまでの承認の使い勝手を cua-driver の変更できないランタイムの
モードに対応づけます。権限のモード、機能マニフェストの承認、既存プロファイルの
許可は、いずれも起動時の設定です。ランタイムが動き出したあとは変えられません。

| Hermes のセッション | cua-driver のモード | 人の介入 | `existing_profile` |
|---|---|---|---|
| 手動または smart の承認（既定） | `standard` | 通常の Hermes の承認。Cua は自身の保護された境界で止まります | `computer_use.grant_existing_profile: true`（設定での 1 回きりの許可）が無ければ拒否します |
| `computer_use.permission_mode: bounded` と、確認済みのマニフェスト | 専用の `bounded` デーモン | 起動時に一度だけ、機能マニフェストを読んで承認します | マニフェストに書かれたプロファイル・オリジン・ツールの中でだけ許され、それ以外は遮断されます |
| `--yolo`、`/yolo`、または `approvals.mode: off` | 専用の `unrestricted` デーモン | Hermes 側で危険を承知したことを一度明示するだけ。実行中に Cua が確認を求めることはありません | `computer_use.grant_existing_profile: true` が無ければ拒否します。YOLO はこの許可の代わりにはなりません |

### ログイン済みのブラウザにつなぐ {#attaching-to-your-signed-in-browser}

エージェントは、すでに開いている Chrome や Edge の窓を、ログイン済みの
プロファイルごと動かせます。しかも **ブラウザを再起動したり、プロファイルを
複製したり、開いているタブに触れたりせずに** です。DevTools でつなぐと
そのプロファイルの生きたページ・Cookie・ストレージが見えてしまうため、
cua-driver は人による明示的な許可を求めます。通常のツール承認では代わりになりません。
config.yaml で一度だけ許可します。

```yaml
computer_use:
  grant_existing_profile: true
```

すると Hermes は、信頼された起動元からの許可（`--grant existing-profile`）を付けて
cua-driver のランタイムを立ち上げ、
既存プロファイルを指定した `cua_browser_prepare` が、エージェントが示した
`(pid, window_id)` に対して成功するようになります。`false`（既定）のままなら、
既存プロファイルへの接続は遮断されます。ドライバーが持つ分離されたプロファイルは
どちらの設定でも使え、エージェントもそちらを好みます。

### 繰り返しの自動処理には bounded モード {#bounded-mode-for-repeatable-automation}

決まった時刻のブラウザ操作（cron の仕事や、認証の要るアプリに対する定期的な調査）には、
一度確認するだけの機能マニフェストを使う `bounded` モードが向いています。

```yaml
# config.yaml
computer_use:
  permission_mode: bounded
  capability_manifest: ~/.hermes/cua-manifest.yaml
```

マニフェストには、そのセッションが使ってよいアプリ、ブラウザプロファイルの種類、
許可するオリジン、型の決まったツールを書きます（書式は
[cua-driver の権限モードの一覧](https://cua.ai/docs/reference/cua-driver/permission-modes)
を参照してください）。Hermes は
`--capability-manifest ... --approve-capability-manifest` を付けて専用のランタイムを
起動します。マニフェストの外にあるものは、cua-driver の内側で遮断されます。
マニフェストが無かったり読めなかったりする場合は、黙って権限を下げるのではなく、
セッションの開始時にはっきり失敗します。そのセッションかぎりの YOLO は、bounded より
優先されます。

macOS では、専用セッションのデーモンは、インストールされた `CuaDriver.app` の
バンドルを通して起動します（こうすると権限の許可が、Hermes をビルドし直すたびに
消えるのではなく、ドライバー自身の名義に結び付きます）。しかも Hermes は起動する前に、
そのバンドルのコード署名を確かめます。識別子が `com.trycua.driver` そのものであること、
そして公式の署名チームであることの二つです。cua-driver をソースからビルドした場合
（署名がありません）は、明示的に許可してください。

```yaml
# config.yaml
computer_use:
  allow_unsigned_driver: true   # local driver development only
```

MCP の各つなぎ口は、自分のランタイムの中に専用の生存管理セッションを持ちます。
外から見えるセッション名は、カーソルの見分けとセッション単位の状態に付ける
ただの札です。ランタイムを選んだり、共有したり、生かし続けたりはしません。
`/yolo` を切る、Hermes のセッションを初期化または終了する、中断時の後片付け、
プロセスの終了。いずれでもそのつなぎ口のセッションは閉じます。Hermes は、bounded・
unrestricted・既存プロファイルへの接続のために自分で起動した専用ランタイムも止めます。
ある Hermes の会話が、別のランタイムのモードや許可を変えることはできません。macOS では、
既存プロファイルの許可を持つ標準ランタイムは、専用のソケット上に新しい CuaDriver.app の
デーモンを立てます。bounded と unrestricted のモードは、Hermes ホストの名義で動く
専用の組み込みサービスを使います。

`smart` の承認は `standard` のままです。LLM による分類が、確認済みのマニフェストや
起動時の許可の代わりになることはありません。

:::warning
YOLO や unrestricted のモードは、プロンプトインジェクションや意図しない入力を防いでは
くれません。使い捨ての VM の中か、まるごと乗っ取られても受け入れられるアカウントと
データでだけ使ってください。
:::

## `hermes computer-use doctor` — まずここを見る {#hermes-computer-use-doctor-your-first-triage-stop}

`hermes computer-use doctor` は cua-driver の構造化された
`health_report` という MCP ツールを実行し、検査項目ごとの一覧を表示します。
動かない理由を *突き止める* には、これが一番の近道です。

```
$ hermes computer-use doctor
⚠️  cua-driver VERSION on darwin: degraded
  ✅ binary_version: cua-driver VERSION
  ✅ platform_supported: macOS 26.4.1 (arm64)
  ✅ session_active: MCP session is active.
  ❌ bundle_identity: Process has no CFBundleIdentifier.
      → Run the binary inside CuaDriver.app so TCC grants attribute correctly.
  ✅ tcc_accessibility: Accessibility is granted.
  ✅ tcc_screen_recording: Screen Recording is granted.
  ✅ ax_capability: AX is trusted and reachable.
  ✅ screen_capture_capability: ScreenCaptureKit reachable; 1 display(s) shareable.
```

- 全体が `ok` なら **終了コードは 0** です。すべてつながっています。
- `degraded` か `failed` なら **終了コードは 1** です。少なくとも一つの検査が落ちており、それぞれの失敗に付く助言が直し方を教えてくれます。
- cua-driver のバイナリ自体に届かないときは **終了コードが 2** になります。

便利なオプションは次のとおりです。

- `--include CHECK` — 挙げた検査だけを実行します（複数指定するときは繰り返します）
- `--skip CHECK` — 検査を飛ばします（`--include` より優先されます）
- `--json` — 構造化されたそのままの中身を出します。`tools/call health_report` の
  MCP の応答と同じ形です

検査の一覧はプラットフォームに応じて変わります。`bundle_identity` と `tcc_*` は
Windows と Linux では概念が当てはまらないので `skip` になります。
`ax_capability` は macOS では AX、Windows では UIA、Linux では AT-SPI を調べ、
届かないときはそれぞれに合った助言を返します。

## エージェントのカーソルとセッション {#the-agent-cursor-and-sessions}

エージェントが動くと、**色の付いた重ね表示のカーソル** が画面を滑って、
クリックや入力やスクロールの届く先に移動するのが見えます。本物の OS の
カーソルは動きません。重ね表示は、エージェントがどこを操作しているかを示すだけです。
Hermes の実行ごとに、外から見える cua-driver の **セッション名**（`hermes-3a7b9c14d2e8`
のようなもの）が宣言されます。この名前はカーソルの見分けと関連する状態に付く札なので、
同時に走る実行やサブエージェントには別々のカーソルが割り当てられます。ランタイムの中の
生存管理セッションを持つのは MCP のつなぎ口であって、外から見える名前ではありません。

重ね表示のカーソルは見た目だけのもので、これが無くても取り込み・クリック・入力は
すべて動きます。Hermes は、不具合が起きると分かっている環境では自動的に切ります。
macOS（何もしていなくても CPU を食い続けます）、画面の無い Linux / WSL2 / コンテナ、
そして **Linux の X11 デスクトップ**（重ね表示は常に最前面に出る全画面の窓なので、
セッションがきれいに終わらなかったあと、どの作業領域の上にも居座ってデスクトップの
入力をふさいでしまうことがあります）です。Linux の Wayland と Windows では重ね表示を
残します。どのプラットフォームでもカーソルを必ず出したいときは `config.yaml` に
`computer_use.no_overlay: false` を設定してください（必ず消したいときは `true` です）。

カーソルの見た目は `cua-driver` の CLI のオプションか、実行中の
`set_agent_cursor_style` という MCP ツールで調整できます。選べるもの一式
（内蔵の `arrow` と `teardrop` の形、`--cursor-icon` で渡す独自の SVG / PNG / ICO、
実行中に変えるグラデーションの色、光のにじみ）は
[cua.ai/docs/how-to-guides/driver/personalize-cursor](https://cua.ai/docs/how-to-guides/driver/personalize-cursor)
を参照してください。

## もっと深く — cua-driver のスキル一式 {#going-deeper-the-cua-driver-skill-pack}

Hermes 側のラッパースキル（`skills/autonomous-ai-agents/computer-use/SKILL.md`）は、
Hermes 側の `computer_use` の進め方と操作の語彙に的を絞っています。プラットフォームごとの
細部、録画の扱い、ブラウザのページ操作など、Cua の深い挙動については、cua-driver の
チーム自身が配って手入れしているスキル一式を入れてください。

```
cua-driver skills install
```

このコマンドは、一式を `~/.cua-driver/skills/cua-driver` の下に入れます。Hermes の
自動検出は cua-driver 側でこれから対応する予定なので、いまのところはそのディレクトリを
Hermes に指すか、スキルの置き場所にシンボリックリンクを張ってください。ラッパーは
引き続き進め方の層を受け持ち、ドライバーの挙動については Cua が入れたスキルを指します。
一式には次のものが入っています。

| ファイル | 内容 |
|---|---|
| `SKILL.md` | プラットフォーム共通の中核（スナップショットの不変条件、手前に出さない取り決め、クリックの送り方、AX ツリーの仕組み） |
| `MACOS.md` | macOS 固有の話。手前に出さない取り決め、AXMenuBar の操作、SkyLight でのクリック送出、Apple Events の JS 橋渡し |
| `WINDOWS.md` | Windows 固有の話。UIA ツリー、UWP と `ApplicationFrameHost` による内包、Session 0 の分離、自動起動の型 |
| `LINUX.md` | Linux 固有の話。AT-SPI ツリー、X11 と Wayland、端末エミュレーターの検出 |
| `RECORDING.md` | 軌跡と動画の記録の扱い |
| `WEB_APPS.md` | ブラウザのページを操作するこつ |
| `TESTS.md` | 軌跡を再生して確かめる進め方 |

これらは **プラットフォームを掘り下げたもので、Hermes のスキルの写しではありません**。
エージェントが「Windows でクリックが違う要素に当たった」と報告してきたときは、
`WINDOWS.md` を読んで、その理由と別の手立てを説明する UIA と UWP の背景を
つかみます。

`cua-driver skills status` は、何が入っていて、どのエージェント基盤に
つながれているかを表示します。いまのところ自動検出の対象は Claude
Code、Codex、OpenCode、OpenClaw、Antigravity です。**Hermes の
自動検出は `trycua/cua` で今後対応する予定です**。それまでは
`cua-driver skills install` を一度実行して、できあがった
`~/.cua-driver/skills/cua-driver` のディレクトリを基盤に指してください
（いつものスキルの置き場所にシンボリックリンクを張っても構いません）。

## 手短な例 {#quick-example}

利用者の依頼: *「Stripe から来た最新のメールを探して、何をしてほしいのか要約して」*

エージェントの段取りは次のようになります（macOS / Windows / Linux のどれでも形は同じで、
モデルがそのプラットフォームらしい近道の操作とアプリ名に読み替えます）。

1. `computer_use(action="capture", mode="som", app="Mail")` — メールアプリの
   スクリーンショットを取ります。サイドバーの項目、ツールバーのボタン、
   メッセージの行に、それぞれ番号が振られます。
2. `computer_use(action="click", element=14)` — 検索欄をクリックします。
3. `computer_use(action="type", text="from:stripe")`
4. `computer_use(action="key", keys="return", capture_after=True)` —
   送信して、新しいスクリーンショットを取ります。
5. 一番上の結果をクリックし、本文を読み、要約します。

この間ずっと、あなたのカーソルは置いた場所にとどまり、メールアプリが
手前に出ることもありません。

## スクリーンショットそのものを受け取る {#receiving-the-actual-screenshot}

コンピュータ操作の途中で撮ったスクリーンショットは、ふだんは内部だけのものです。
モデルが画面を見るために存在し、エージェントは文章で答えます。ただし画像を撮るたびに、
共有できる大きさに抑えた写しが Hermes の画像キャッシュにも保存され、その場所が報告されます。
そのため、添付を扱えるところ（Telegram、Discord、デスクトップ、その他のゲートウェイの
プラットフォーム）では、こう頼むだけで済みます。

> *「画面のスクリーンショットを送って」*

すると、エージェントは説明ではなく本物の画像を、その場の添付として届けます。
CLI には添付の経路が無いので、代わりに保存されたファイルの場所を教えてくれます。

保存されるのは直近 20 枚だけで、スクリーンショットが勝手に送られることはありません。
頼んだときだけです。

### 画面全体とデスクトップの面 {#whole-screen-vs-desktop-surface}

「画面のスクリーンショットを撮って」と言うと、**いま映っているものすべて** が
撮られます。PrtScn を押したときのように、見えている窓をすべて合成した一枚です。
この画像にはクリックできる要素が無いので、そこに写っているものを *操作* するには、
エージェントがそのアプリを撮り直します。

代わりに **デスクトップ** を頼むと、OS のシェルの面そのもの、つまり壁紙・
デスクトップのアイコン・タスクバーが、クリックできる要素ごと対象になります。
だから「デスクトップのごみ箱を開いて」といった頼み方も通ります。

## プロバイダーごとの対応 {#provider-compatibility}

| プロバイダー | 画像対応 | 動くか | 補足 |
|---|---|---|---|
| Anthropic（Claude Sonnet / Opus 3 以降） | ✅ | ✅ | 総合的に最良。SOM と生の座標の両方が使えます。 |
| OpenRouter（画像を扱えるモデル） | ✅ | ✅ | 複数パートのツールメッセージに対応しています。 |
| OpenAI（GPT-4 以降、GPT-5） | ✅ | ✅ | 上と同じです。 |
| Google（Gemini 2 以降） | ✅ | ✅ | ツール呼び出しと画像の両方に対応しています。 |
| ローカルの vLLM / LM Studio / Ollama（画像を扱えるモデル） | ✅ | ✅ | モデルが複数パートのツール内容に対応していれば動きます。 |
| テキストだけのモデル | ❌ | ✅（機能は落ちます） | `mode="ax"` を使い、アクセシビリティツリーだけで操作します。 |

スクリーンショットは、OpenAI 形式の `image_url` のパートとしてツールの結果に
そのまま添えて送られます。Anthropic の場合、アダプターがこれを本来の `tool_result` の
画像ブロックに変換します。画像の MIME の種類は cua-driver が明示する
`mimeType` の項目（`image/png` か `image/jpeg`）から取るので、クライアント側で
先頭バイトを見て推測することはありません。

## 安全性 {#safety}

Hermes は何重にも歯止めをかけています。

- 取り返しのつかない操作（click、type、drag、scroll、key、focus_app）には
  承認が要ります。CLI の確認画面か、メッセージ用のプラットフォームの承認ボタンで
  行います。
- ツールの層で完全に止めるキーの組み合わせ: ごみ箱を空にする、強制削除、
  画面ロック、ログアウト、強制ログアウト。
- 完全に止める入力の型: `curl | bash`、`sudo rm -rf /`、フォーク
  ボムなど。
- エージェントのシステムプロンプトにも明記しています。権限の確認画面を
  クリックしない、パスワードを打たない、スクリーンショットに埋め込まれた
  指示に従わない。

すべての操作を確認したい場合は、`~/.hermes/config.yaml` の
`approvals.mode: manual` と組み合わせてください。

## トークンの効率 {#token-efficiency}

スクリーンショットは高くつきます。Hermes は四つの層で無駄を削ります。

- **スクリーンショットの追い出し** — Anthropic のアダプターは、直近 3 枚の
  スクリーンショットだけをコンテキストに残します。古いものは `[screenshot removed
  to save context]` という差し込みに変わります。
- **クライアント側での圧縮時の間引き** — コンテキストの圧縮処理が、複数の形式を
  含むツールの結果を見つけて、古いものから画像のパートを取り除きます。
- **画像を考慮したトークンの見積もり** — 画像 1 枚は base64 の文字数ではなく、
  およそ 1500 トークンとして数えます（Anthropic の一律の値です）。
- **サーバー側でのコンテキスト編集（Anthropic のみ）** — 有効なとき、アダプターは
  `context_management` を通して `clear_tool_uses_20250919` を有効にし、
  Anthropic の API がサーバー側で古いツールの結果を消せるようにします。

1568×900 の画面で 20 回の操作を行うセッションなら、スクリーンショットが占める
コンテキストはおよそ 60 万トークンではなく 3 万トークンで済みます。

## 制限 {#limitations}

- **速度。** 背後で動くモードは手前で動かすより遅くなります。アクセシビリティを
  経由するイベントは、直接 HID に送る場合と比べて macOS でおよそ 5〜20 ミリ秒、
  Windows の UIA でおよそ 3〜10 ミリ秒、Linux の AT-SPI でおよそ 5〜15 ミリ秒
  かかります。エージェントの速さでクリックするぶんには気づきませんが、速さを
  競う記録を撮ろうとすると分かります。
- **パスワードのキーボード入力はできません。** `type` にはコマンドシェル向けの
  文字列を止める仕組みがあります。パスワードには OS の自動入力
  （macOS のキーチェーン / Windows の資格情報マネージャー / GNOME キーリング /
  KWallet）を使ってください。
- **アクセシビリティツリーを出さないアプリもあります。** Windows の最近の UWP アプリ、
  Linux の Electron 28 未満、独自描画をしている一部の macOS アプリ（Logic、
  Final Cut、いくつかのゲーム）は、AX ツリーが乏しいか空です。
  ツリーが空ならピクセルの座標に切り替えるか、その作業自体をあきらめてください。
- **Windows: 管理者権限に上がった窓は、通常のエージェントからは操作できません。**
  Windows の UIPI（ユーザーインターフェイス特権分離）は整合レベルの境界を強制します。
  中程度の整合レベルで動くプロセス（既定の Hermes エージェント）は、高い整合レベル
  （管理者）のプロセスが持つ窓の UIA ツリーを列挙することも、マウス入力を送り込む
  こともできません。症状としては、`capture(mode='som')` が要素を 0 個返し、`click(...)`
  は成功と報告しながら何も起きません。スクリーンショット自体はきちんと写ります
  （GDI での取り込みは整合レベルの検査より下で動くためです）。キーボードの
  イベントは UIPI を部分的に回り込むので、Tab や Enter で権限の上がった確認画面を
  たどることはできます。これは OS の制約であって cua-driver の不具合ではありません。
  Windows の自動操作の仕組みはすべて同じ影響を受けます。権限の上がった窓を操作するには、
  Hermes エージェント自体を高い整合レベルで動かしてください（権限を上げた端末から
  起動します）。そうしない場合は、権限の上がっていない窓を対象にしてください。
- **プラットフォームごとの導入時の落とし穴:**
  - **macOS** は非公開の SkyLight SPI を使います。Apple はどの OS の更新でも
    これを変えられます。Hermes は、入っている cua-driver が検証済みの
    バージョンより古い場合に警告します。
  - **Windows** の SSH セッションは **Session 0** で動きますが、ここには
    対話できるデスクトップがありません。RDP やコンソールのセッションの中から
    Hermes を動かすか、cua-driver の自動起動のタスクスケジューラーを設定してください。
    手順は [windows-ssh](https://cua.ai/docs/how-to-guides/driver/windows-ssh)
    にあります。
  - **Linux** には届くディスプレイサーバーが要ります。画面の無いサーバーでは、
    `computer_use` がイベントを取り込んだり送ったりする前に Xvfb
    （`Xvfb :99 -screen 0 1920x1080x24`）が必要です。Wayland だけのセッションでは、
    画面の取り込みに XWayland の橋渡しが要ります（cua-driver の Wayland への
    入力経路は、それとは別に動きます）。

デスクトップの手間をかけずに（そして TCC / Session 0 / X11 の準備もせずに）
プラットフォームをまたぐ GUI の自動操作をしたい場合、`browser` のツール群は
本物のヘッドレス Chromium を使うので、Web だけで完結する作業にはこちらが正解です。

## 設定 {#configuration}

権限のモードとマニフェスト（上の
[権限のモード](#permission-modes-and-logged-in-browser-profiles) を参照）:

```yaml
computer_use:
  permission_mode: standard        # standard (default) | bounded
  capability_manifest: ""          # capability manifest path, required for bounded
  grant_existing_profile: false    # opt-in: attach in standard or unrestricted mode
```

ドライバーのバイナリの場所を上書きする（テスト / CI / 自前ビルド向け）:

```
HERMES_CUA_DRIVER_CMD=/path/to/your/cua-driver
```

バックエンドをまるごと差し替える（テスト用）:

```
HERMES_COMPUTER_USE_BACKEND=noop   # records calls, no side effects
```

### テレメトリ {#telemetry}

cua-driver は上流の既定で、匿名の利用状況テレメトリ（PostHog）を有効にして配られています。
**Hermes はこれを止めています**。cua-driver を呼ぶたびに（MCP のバックエンド、`status`、
`doctor`、インストールのいずれでも）、Hermes はドライバーの環境に
`CUA_DRIVER_RS_TELEMETRY_ENABLED=0` を設定します。

送信を有効に戻したい場合（cua-driver の既定に任せてテレメトリを送る場合）は、
`config.yaml` に次を書きます。

```yaml
computer_use:
  cua_telemetry: true   # default: false (telemetry off)
```

有効なとき `hermes computer-use doctor` は `telemetry: enabled` と表示し、
無効なとき（既定）は `telemetry: disabled via CUA_DRIVER_RS_TELEMETRY_ENABLED` と表示します。

## 自前でビルドした cua-driver で試す {#testing-against-a-local-cua-driver-build}

cua-driver 自体を開発しているとき、あるいはまだ公開されていない修正を試したいときは、
公開されている版ではなく、ソースからビルドしたバイナリを Hermes に指させます。
Hermes はドライバーを `shutil.which("cua-driver")` で解決し、
**`HERMES_CUA_DRIVER_VERSION` を強制しません** ので、自前のビルド
（`0.0.0-local-*` として報告されます）はそのまま受け入れられます。方法は二つあります。

### 方法 A — `install-local`（ビルドして PATH に置く） {#option-a-install-local-build-put-it-on-path}

`trycua/cua` のチェックアウトから、上流のローカル用インストーラーを実行します。
Rust のバックエンドをリリースモードでビルドし、本番のインストーラーと同じ配置で
`cua-driver` を置き、その bin ディレクトリを PATH に加えます。

```powershell
# Windows (PowerShell), from the cua repo root
./libs/cua-driver/scripts/install-local.ps1 -NoAutoStart
```

```bash
# macOS / Linux, from the cua repo root  (defaults to a debug build without --release)
./libs/cua-driver/scripts/install-local.sh --release
```

- Windows では `%USERPROFILE%\.cua-driver\packages\…` の下にビルドを置き、
  そこへ
  `%LOCALAPPDATA%\Programs\Cua\cua-driver\bin`（ユーザーの PATH に追加されます）を
  ジャンクションで結びます。macOS と Linux では `cua-driver` を `~/.local/bin` に
  シンボリックリンクします（`--bin-dir <path>` で変更できます）。
- `-NoAutoStart` は、ログオン時に動く `cua-driver-serve` の登録を飛ばします。
  Hermes の検証には要りません（補足を参照）。

そのあと新しいシェルを開いて（PATH の変更が反映されるように）、確認します。

```
cua-driver --version                 # local builds report 0.0.0-local-release
# Windows:      (Get-Command cua-driver).Source
# macOS/Linux:  which cua-driver
```

### 方法 B — ビルドしたバイナリを Hermes に直接指す（一番速い） {#option-b-point-hermes-straight-at-the-built-binary-fastest-loop}

インストールの手続きはまるごと飛ばします。`cargo build` して、できたバイナリを
`HERMES_CUA_DRIVER_CMD` に設定するだけです。編集・ビルド・検証を素早く回すのに
向いています。

```bash
cargo build -p cua-driver            # add --release for a release build; run from libs/cua-driver/rust
```

```
# Windows (.env)
HERMES_CUA_DRIVER_CMD=C:\path\to\cua\libs\cua-driver\rust\target\debug\cua-driver.exe
# macOS / Linux (.env)
HERMES_CUA_DRIVER_CMD=/path/to/cua/libs/cua-driver/rust/target/debug/cua-driver
```

### 自前のビルドが使われているか確かめる {#confirm-hermes-is-using-your-build}

- `hermes computer-use status` は、解決されたバイナリの場所とバージョンを
  表示します。
- `hermes computer-use doctor` は、バイナリに届くことを確かめ、MCP の経路を
  端から端まで動かします。
- セッションの中では、`computer_use(action="capture")` が子プロセスとして
  起動した `cua-driver mcp` を実際に動かします。

### 補足と落とし穴 {#notes-gotchas}

- **Hermes は `cua-driver mcp` の stdio 中継を起動します。** 通常のセッションでは、
  この中継が機械ごとの標準のデーモンにつなぎます（必要なら起動もします）。Hermes で
  明示的に YOLO にした場合は、代わりに Hermes 自身が `cua-driver serve --embedded` の
  子プロセスを持ち、その専用のソケットや名前付きパイプに中継を向けます。SSH から
  Session 1 以降に対話的な入力を送る場合は、Windows の自動起動と UIAccess の型が
  やはり効いてきます。制限の節を参照してください。
- **Windows でバイナリが掴まれる問題。** `cua-driver-serve` のデーモンが動いていると、
  `cua-driver.exe` を掴んだままになり、ビルドし直したときの上書きを妨げます。
  `install-local.ps1` は掴まれたバイナリを自動で退けます。方法 B で自分で
  `cargo build` する場合は、先に `cua-driver autostart disable`（または `schtasks /End /TN
  cua-driver-serve`）で止めてください。
- **ビルドし直す流れ。** cua-driver のソースを編集したら、方法 A なら
  `install-local` を実行し直します（ビルドし直し、置き直し、`current` の
  ジャンクションを張り替えます）。方法 B なら `cargo build` をやり直すだけです。
  どちらも Hermes 側の変更は要りません。
- **自前のビルドはバージョン検査を飛ばします。** Hermes は、入っている cua-driver が
  OS ごとの検証済みの下限より古い場合に警告しますが、`0.0.0-local-*` の開発ビルドは
  対象外です。自前のビルドでこの警告が出ることはありません。

## 困ったときは {#troubleshooting}

**何かおかしいと思ったら、まず `hermes computer-use doctor` を実行してください。**
検査項目ごとの構造化された一覧が、あなたにも（そして手伝ってくれるエージェントにも）
何が悪いのかを正確に伝えます。

doctor では捕まらない、個別の症状は次のとおりです。

**`computer_use backend unavailable: cua-driver is not installed`** —
`hermes computer-use install` で cua-driver のバイナリを取ってくるか、
`hermes tools` を実行してコンピュータ操作のツール群を有効にしてください。

**クリックが効いていないように見える** — 画面を取り込んで確かめてください。
気づかなかったモーダルが入力をふさいでいることがあります。`escape` か閉じる
ボタンで消してください。

**要素の番号が古い** — SOM の番号は次の `capture` までしか有効ではありません。
状態を変える操作をしたら、必ず取り直してください。ラッパーは古さを検出する
ための不透明な `element_token` を持ち回るので、間違ったクリックではなく
はっきりしたエラーが返ります。

**「blocked pattern in type text」** — `type` しようとした文字列が、危険な
シェルの型の一覧に当たっています。コマンドを分けるか、やり方を考え直してください。

**Linux で取り込みが空になる** — `DISPLAY` が設定されていないか、XWayland の
橋渡しの無い Wayland だけの環境です。`hermes computer-use doctor` は
`ax_capability: fail` として、`Set DISPLAY (X11)…` という助言を添えて知らせます。

**Windows で SSH 越しに取り込みが空になる** — Session 0（サービス用の
セッション）にいます。RDP やコンソールから直接動かすか、自動起動の型を
設定してください。手順は
[cua.ai/docs/how-to-guides/driver/windows-ssh](https://cua.ai/docs/how-to-guides/driver/windows-ssh) にあります。

## 関連情報 {#see-also}

- **Hermes 側のスキル** — `skills/autonomous-ai-agents/computer-use/SKILL.md` — Hermes の
  `computer_use` の操作の語彙を教えるもので、エージェントが読み込むのはこれです。
- **cua-driver のスキル一式** — プラットフォームごとの掘り下げ
  （macOS の手前に出さない取り決め、Windows の UIA と Session 0、Linux の AT-SPI と
  X11 / Wayland、録画、ブラウザのページ）については、
  `cua-driver skills install` を実行して `MACOS.md` / `WINDOWS.md` /
  `LINUX.md` / `RECORDING.md` / `WEB_APPS.md` を読んでください。Hermes の自動検出は
  今後の対応予定です。いまのところは、入れた一式のディレクトリを Hermes に指すか、
  スキルの置き場所にシンボリックリンクを張ってください。
- **cua.ai/docs** — cua-driver プロジェクトの文書:
  - [コンピュータ操作とは](https://cua.ai/docs/explanation/what-is-computer-use) — 概念の紹介
  - [手前に出さない取り決め](https://cua.ai/docs/explanation/the-no-foreground-contract) — 背後で動くことが *なぜ* 大事なのか
  - [インストールの手引き](https://cua.ai/docs/how-to-guides/driver/install) — プラットフォームごとのインストールの詳細
  - [エージェントのカーソルを好みに変える](https://cua.ai/docs/how-to-guides/driver/personalize-cursor) — 内蔵の形、独自の素材、実行中の上書き
  - [SSH 越しに Windows を操作する](https://cua.ai/docs/how-to-guides/driver/windows-ssh) — Session 0 から Session 1 以降への自動起動の型
  - [cua-driver を動かし続ける](https://cua.ai/docs/how-to-guides/driver/keep-running) — 自動起動とデーモンの生存管理
  - [エージェントをつなぐ](https://cua.ai/docs/how-to-guides/driver/connect-your-agent) — さまざまな基盤（Hermes を含む）に cua-driver を登録する
- [cua-driver のソース（trycua/cua）](https://github.com/trycua/cua)
- ネイティブアプリを操作する必要のない、プラットフォームをまたぐ Web の作業には [ブラウザ自動操作](/hermes/docs/user-guide/features/browser/) をどうぞ。
