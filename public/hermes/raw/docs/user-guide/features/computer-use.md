---
title: "画面を操ってもらう"
description: ""
upstream_path: user-guide/features/computer-use.md
upstream_blob: 54fc0f8012336c0619813b63504fef2e60caa4cc
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/computer-use
---

# 画面を操ってもらう {#computer-use}

Hermes Agent は、あなたの画面を代わりに動かせます。押す、打つ、送る、つまんで動かす — それを **macOS、Windows、Linux** で、**裏側で**行います。あなたの矢印は動きませんし、打ち込む先も変わりませんし、仮想の画面や Spaces が勝手に切り替わることもありません。同じ機械の上で、あなたと並んで作業できます。

この手の仕組みの多くと違って、ここでは**道具を呼べるモデルならどれでも**使えます。Claude でも、GPT でも、Gemini でも、手元の OpenAI 互換の接続先で動く公開モデルでもかまいません。Anthropic 独自の書き方に合わせる必要はありません。

## 動く仕組み {#how-it-works}

備え付けの `computer_use` という道具のまとまりが、Hermes として勧める形です。これは
[`cua-driver`](https://github.com/trycua/cua) という、裏側で画面を動かすための公開のドライバと、標準入出力越しの MCP でやり取りします。中では、それぞれの OS に合った支援機能と入力の仕組みを使います。

| OS | 画面の構造を読む仕組み | 入力の送り方 |
|---|---|---|
| macOS | AX（非公開の SkyLight SPI） | `SLPSPostEventRecordTo` — プロセス単位。矢印は飛びません |
| Windows | UIAutomation | `SendInput` + `PostMessage` — 打ち込む先を奪いません |
| Linux | AT-SPI（X11 と Wayland） | XTest（X11）／virtual-keyboard（Wayland） |

結果はどの OS でも同じです。見えている窓なら、その画面の構造を読み取ったうえで、手前に持ってくることも、仮想の画面を切り替えることも、本物の矢印を動かすこともなく、作った入力を送り込めます。

その土台にある約束 — *なぜ*裏側で動くことが大事なのか、手前に出さないという決まり、押す動きの中身 — については
**[cua.ai/docs/explanation/the-no-foreground-contract](https://cua.ai/docs/explanation/the-no-foreground-contract)** を読んでください。

## 使えるようにする {#enabling}

**新しく入れた場合、ドライバはもう入っています。** Hermes の導入用の仕掛け
（`install.sh`／`install.ps1`）が `cua-driver` を先に入れてくれるので（できる範囲で。
`--skip-computer-use`／`-SkipComputerUse` を渡せば見送れます）、あとは設定を切り替えるだけです。

- **`hermes tools`** → `🖱️  Computer Use` を選びます。まだ入っていなければ、ドライバも自動で入ります。
- **ダッシュボードやデスクトップの画面** → Computer Use のまとまりを切り替えます。ドライバがなければ、切り替えた時点で裏側で導入が始まります（進み具合は道具の一覧で見られます）。

**手で入れる場合（古い環境や、導入時に見送った場合）:**

```
hermes computer-use install
```

これは上流の cua-driver の導入用の仕掛けを取ってきて走らせます。macOS と Linux では `install.sh`、Windows では `install.ps1` です。入ったかどうかは `hermes computer-use
status` で確かめられます。

すでに cua-driver をお持ちですか。0.20 の実行時の約束に沿っていれば、Hermes はそれをそのまま使います。初期設定のとき、道具のまとまりを有効にしたとき、`hermes update` のとき、そしてその回の最初の `computer_use` の呼び出しのときに、Hermes は手元の版と目録を確かめます。標準の入れ方をしたもので、古かったり欠けていたりすれば、上流の導入用の仕掛けを通して直します（実行中は1回のやり取りにつき最大1度まで）。`HERMES_CUA_DRIVER_CMD` で選んだ実行ファイルは
あなたの持ち物なので、合わないことだけを伝えて、そのままにしておきます。

先に Cua Driver を入れてある場合、`cua-driver skills install` を走らせると Cua のスキル一式が
`~/.cua-driver/skills/cua-driver` の下に入ります。Hermes を自動で見つける仕組みは cua-driver 側で今後入る予定なので、いまのところは Hermes からそのディレクトリを指すか、自分のスキルの置き場にリンクを張ってください。Cua の MCP の道具をそのまま独自の MCP サーバーとして登録することもできますが、これは低い層の入り口が要る人向けの別の道です。備え付けのまとまりのほうは、Hermes としての動き、設定、承認、診断まで面倒を見ます。

どの道を通ったにせよ、入れたあとは OS ごとの前提を整えてください。

| OS | 前提 |
|---|---|
| **macOS** | システム設定 → プライバシーとセキュリティ → **アクセシビリティ** と **画面収録**。`hermes computer-use doctor` が示す名前に対して許可します。標準の形では CuaDriver.app を、bounded と unrestricted では Hermes 本体の名義を使います。 |
| **Windows** | 導入時には何も要りません。SSH 越しに（RDP やコンソールではなく）動かす場合は、自動起動の型が要ります。Session 0 と Session 1 以降のあいだをつなぐ話は [cua.ai/docs/how-to-guides/driver/windows-ssh](https://cua.ai/docs/how-to-guides/driver/windows-ssh) にあります。 |
| **Linux** | 届く画面のサーバーが要ります。X11 なら `DISPLAY` を、Wayland なら `XDG_SESSION_TYPE=wayland` を設定します。Wayland では画面を写すのに XWayland の橋渡しが要ります。AT-SPI も有効にしてください（GNOME／KDE／Xfce では初めから有効です）。 |

そのうえで、このまとまりを有効にして始めます。

```
hermes -t computer_use chat
```

または `~/.hermes/config.yaml` の、有効にする道具のまとまりに `computer_use` を足します。

## 許しの与え方と、ログイン済みのブラウザ {#permission-modes-and-logged-in-browser-profiles}

Hermes は、これまでの承認のやり方を cua-driver の変えられない実行時の形に重ねています。許しの与え方、できることの目録の承認、すでに開いているブラウザへの許可は、どれも起動時の設定です。動き出したあとには変えられません。

| Hermes 側 | cua-driver の形 | 人の関わり方 | `existing_profile` |
|---|---|---|---|
| 手動または賢い承認（既定） | `standard` | いつもの Hermes の承認。Cua は自分の守りの境目で止まります | `computer_use.grant_existing_profile: true`（設定で一度だけ許す）がなければ断ります |
| `computer_use.permission_mode: bounded` と、目を通した目録 | 専用の `bounded` の常駐 | できることの目録を、起動時に一度だけ確かめて承認します | 目録に書かれたブラウザ・接続先・道具の範囲でだけ許され、それ以外は必ず止まります |
| `--yolo`、`/yolo`、または `approvals.mode: off` | 専用の `unrestricted` の常駐 | Hermes 側で危険を承知したと一度だけ示します。動作中に Cua が尋ねてくることはありません | `computer_use.grant_existing_profile: true` がなければ断ります。YOLO はこの許可の代わりにはなりません |

### ログイン済みのブラウザにつなぐ {#attaching-to-your-signed-in-browser}

すでに開いている Chrome や Edge の窓 — ログイン済みのものも含めて — を、**ブラウザを開き直すことも、設定を写すことも、開いているタブに触ることもなく**動かせます。ただし DevTools でつなぐと、そのブラウザの今のページ、クッキー、保存された中身まで見えてしまいます。そのため cua-driver は、道具ごとの承認では代えられない、人からのはっきりした許可を求めます。config.yaml に一度書けば済みます。

```yaml
computer_use:
  grant_existing_profile: true
```

こう書くと Hermes は、信頼された起動元としての許可
（`--grant existing-profile`）を付けて cua-driver を立ち上げます。そして
`cua_browser_prepare` で、すでに開いているブラウザに対して、示された
`(pid, window_id)` そのものへつなげるようになります。`false`（既定）のままなら、すでに開いているブラウザへのつなぎは必ず止まります。ドライバ自身が持つ切り離されたブラウザはどちらの設定でも使えますし、そちらのほうが好んで選ばれます。

### 繰り返す作業のための bounded {#bounded-mode-for-repeatable-automation}

決まったブラウザ作業を繰り返すとき（定時の処理、ログインが要るサービスへの定期的な調べもの）は、一度だけ目を通す「できることの目録」を使う `bounded` が向いています。

```yaml
# config.yaml
computer_use:
  permission_mode: bounded
  capability_manifest: ~/.hermes/cua-manifest.yaml
```

この目録には、使ってよいアプリ、ブラウザの種類、つないでよい接続先、呼んでよい道具を書きます（書き方は
[cua-driver の許しの与え方の早見表](https://cua.ai/docs/reference/cua-driver/permission-modes)
にあります）。Hermes は
`--capability-manifest ... --approve-capability-manifest` を付けて専用の実行環境を立ち上げます。目録の外のことは、cua-driver の中で必ず止まります。目録が見つからない、あるいは読めないときは、黙って弱い形に落ちるのではなく、始まる時点ではっきり失敗します。その回だけ YOLO を使えば、bounded より優先されます。

MCP のつなぎ口はそれぞれ、実行環境の中に自分だけの持ち場を持ちます。外から見えるやり取りの名前は、矢印の見分けと、そのやり取りに紐づく状態のための札にすぎません。それによって実行環境が選ばれたり、共有されたり、生かされ続けたりはしません。`/yolo` を切る、Hermes のやり取りをやり直すか閉じる、途中で止めたあとの片づけ、処理そのものの終了 — どれでもそのつなぎ口の持ち場は閉じます。bounded、unrestricted、すでに開いているブラウザへのつなぎのために Hermes が立ち上げた専用の実行環境も、あわせて止めます。ある会話が、別の実行環境の形や許可を変えることはできません。macOS では、すでに開いているブラウザへの許可が付いた標準の実行環境は、専用の口につながる新しい CuaDriver.app を使います。bounded と unrestricted では、Hermes 本体の名義で動く専用の組み込みの仕組みを使います。

`smart` な承認は `standard` のままです。モデルによる判断が、目を通した目録や起動時の許可の代わりになることはありません。

:::warning
YOLO や unrestricted は、指示の紛れ込みや意図しない入力を防いでくれません。使い捨ての仮想機械の中か、丸ごと乗っ取られても構わないアカウントとデータでだけ使ってください。
:::

## `hermes computer-use doctor` — 困ったらまずここ {#hermes-computer-use-doctor-your-first-triage-stop}

`hermes computer-use doctor` は、cua-driver の
`health_report` という MCP の道具を呼んで、項目ごとの一覧を出します。うまく動かない*理由*を突き止めるのに、いちばん速い方法です。

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

- 全体が `ok` なら**終了コードは 0** です。すべてつながっています。
- `degraded` か `failed` なら**終了コードは 1** です。少なくとも1つ引っかかっています。失敗ごとに出る助言が、何を直せばよいかを教えてくれます。
- cua-driver の実行ファイルそのものに届かないときは**終了コードが 2** です。

役に立つ指定:

- `--include CHECK` — 挙げた項目だけを調べます（いくつも並べられます）
- `--skip CHECK` — その項目を飛ばします（`--include` より優先されます）
- `--json` — そのままの構造化された中身を出します。`tools/call health_report` の MCP の返事と同じ形です

項目の一覧は OS に合わせて変わります。`bundle_identity` と `tcc_*` は Windows と Linux では
`skip` になります。そもそも当てはまらないからです。
`ax_capability` は macOS では AX、Windows では UIA、Linux では AT-SPI を見にいき、届かないときはそれぞれに合った助言を出します。

## 代わりの矢印と、やり取りの区切り {#the-agent-cursor-and-sessions}

代わりに操作しているあいだ、押す・打つ・送るのそれぞれの場所へ、**色の付いた重ねの矢印**が滑っていくのが見えます。本物の矢印は動きません。重ねの矢印は、どこを操作しているかを示すだけです。Hermes は1回動くごとに、外から見える cua-driver の**やり取りの名前**（`hermes-3a7b9c14d2e8` のようなもの）を決めます。この名前が矢印の見分けとそれに紐づく状態の札になるので、同時に動くものや下請けのやり取りにも別々の矢印が付きます。実行環境の中の持ち場を持っているのは MCP のつなぎ口のほうで、外から見える名前ではありません。

矢印の見た目は、`cua-driver` の指定や、動作中に呼べる
`set_agent_cursor_style` という MCP の道具で変えられます。詳しくは
[cua.ai/docs/how-to-guides/driver/personalize-cursor](https://cua.ai/docs/how-to-guides/driver/personalize-cursor)
にあります（備え付けの `arrow` と `teardrop` の形、`--cursor-icon` で渡す
SVG／PNG／ICO、動作中に変えられる色の重なり、光の輪など）。

## もっと深く — cua-driver のスキル一式 {#going-deeper-the-cua-driver-skill-pack}

Hermes 側のスキル（`skills/autonomous-ai-agents/computer-use/SKILL.md`）は、Hermes としての `computer_use` の進め方と、指示できる動きの語彙に絞ってあります。OS ごとの細かい話、記録の取り方、ブラウザのページの操作といった Cua の深いところは、cua-driver の作り手が配って手入れしているスキル一式を入れてください。

```
cua-driver skills install
```

このコマンドで、一式が `~/.cua-driver/skills/cua-driver` の下に入ります。Hermes を自動で見つける仕組みは cua-driver 側で今後入る予定なので、いまのところは Hermes からそのディレクトリを指すか、自分のスキルの置き場にリンクを張ってください。Hermes 側のスキルは進め方の層のままで、ドライバの振る舞いについては Cua の入れたスキルを指します。一式の中身はこうです。

| ファイル | 中身 |
|---|---|
| `SKILL.md` | OS をまたぐ核（画面を写したときの決まり、手前に出さない約束、押す動きの送り方、画面の構造の扱い） |
| `MACOS.md` | macOS 固有の話。手前に出さない約束、AXMenuBar のたどり方、SkyLight での押し方、Apple Events の JS の橋渡し |
| `WINDOWS.md` | Windows 固有の話。UIA の構造、UWP と `ApplicationFrameHost` の入れ子、Session 0 の切り離し、自動起動の型 |
| `LINUX.md` | Linux 固有の話。AT-SPI の構造、X11 と Wayland、端末アプリの見分け |
| `RECORDING.md` | 動きの記録と動画の記録の決まり |
| `WEB_APPS.md` | ブラウザのページを操るときのこつ |
| `TESTS.md` | 記録した動きをなぞって試す手順 |

これは **OS ごとの深掘りであって、Hermes 側のスキルの写しではありません**。「Windows で、押したつもりの場所と違うものが押された」と伝えてきたときに、なぜそうなるのか、どうすればよいのかを `WINDOWS.md` の UIA と UWP の話から読み取れます。

`cua-driver skills status` を使うと、何が入っていて、どの仕組みにつながっているかが分かります。今のところ自動で見つけられるのは Claude
Code、Codex、OpenCode、OpenClaw、Antigravity です。**Hermes を自動で見つける仕組みは `trycua/cua` で今後入る予定です。**それまでは
`cua-driver skills install` を一度走らせて、できあがった
`~/.cua-driver/skills/cua-driver` のディレクトリを指す（あるいは、ふだんのスキルの置き場にリンクを張る）ようにしてください。

## 短い例 {#quick-example}

こう頼んだとします。*「Stripe からの最新のメールを探して、何をしてほしいのか要約して」*

そのときの段取りはこうなります（macOS でも Windows でも Linux でも形は同じで、その OS でよく使う近道とアプリの名前に置き換わるだけです）。

1. `computer_use(action="capture", mode="som", app="Mail")` —
   メールのアプリを写して、脇の一覧の項目も、道具の並びのボタンも、メールの行にも番号を振ります。
2. `computer_use(action="click", element=14)` — 検索欄を押します。
3. `computer_use(action="type", text="from:stripe")`
4. `computer_use(action="key", keys="return", capture_after=True)` —
   決定して、新しくなった画面を写します。
5. いちばん上の結果を押し、本文を読んで、要約します。

このあいだ、あなたの矢印は置いた場所から動きませんし、メールのアプリが手前に出てくることもありません。

## 写した画面そのものを受け取る {#receiving-the-actual-screenshot}

操作の途中で写した画面は、ふだんは内側だけのものです。画面を見るために写しているだけで、返事は文章で来ます。とはいえ写すたびに、大きさを抑えた受け渡し用の写しが Hermes の画像の置き場に残り、その場所も知らされます。そのため、画像を渡せる場所（Telegram、Discord、デスクトップ、そのほかの窓口）では、こう頼むだけで済みます。

> *「今の画面を送って」*

すると、説明ではなく本物の画像がそのまま添えて届きます。CLI には画像を添える道がないので、代わりに保存された場所を教えてくれます。

残るのは新しいほうから20件までで、写した画面が勝手に送られることはありません。頼まれたときだけです。

## 提供元ごとの対応 {#provider-compatibility}

| 提供元 | 画像を読める？ | 動く？ | 補足 |
|---|---|---|---|
| Anthropic（Claude Sonnet/Opus 3 以降） | ✅ | ✅ | 総じていちばん良いです。番号付けも生の座標も使えます。 |
| OpenRouter（画像を読めるモデル） | ✅ | ✅ | 道具の返事を複数の部分に分けて渡せます。 |
| OpenAI（GPT-4 以降、GPT-5） | ✅ | ✅ | 上と同じです。 |
| Google（Gemini 2 以降） | ✅ | ✅ | 道具の呼び出しも画像もどちらも使えます。 |
| 手元の vLLM／LM Studio／Ollama（画像を読めるモデル） | ✅ | ✅ | 道具の返事を複数の部分に分けて扱えるモデルなら使えます。 |
| 文字だけのモデル | ❌ | ✅（力は落ちます） | `mode="ax"` にして、画面の構造だけで動かします。 |

写した画面は、OpenAI 形式の `image_url` として道具の返事に添えて送られます。Anthropic 向けには、受け口が本来の `tool_result` の画像の塊に変えます。画像の種類は cua-driver がはっきり示す
`mimeType`（`image/png` か `image/jpeg`）から取ります。こちら側で先頭の数バイトを見て推し量ることはしません。

## 安全のために {#safety}

Hermes は何層にも守りを重ねています。

- 取り返しのつかない動き（押す、打つ、つまんで動かす、送る、キーを押す、アプリを前に出す）には承認が要ります。CLI の問いかけか、メッセージのやり取りに出る承認のボタンで答えます。
- 道具の側で必ず止めるキーの組み合わせがあります。ごみ箱を空にする、強制的に消す、画面を施錠する、サインアウトする、強制的にサインアウトする。
- 打ち込む中身にも必ず止める型があります。`curl | bash`、`sudo rm -rf /`、際限なく増える処理などです。
- 指示の文面にもはっきり書いてあります。許可を尋ねる窓を押さないこと、合言葉を打たないこと、写した画面の中に紛れ込んだ指示に従わないこと。

すべての動きを確かめたいなら、`~/.hermes/config.yaml` で `approvals.mode: manual` と合わせて使ってください。

## やり取りの量を抑える {#token-efficiency}

写した画面はかさばります。Hermes は4つの層で減らしています。

- **古い画面を落とす** — Anthropic 向けの受け口は、新しいほうから3枚だけを残します。それより古いものは `[screenshot removed
  to save context]` という札に変わります。
- **こちら側で減らす** — 話の内容を縮めるときに、複数の部分からなる道具の返事を見つけて、古いものから画像の部分を取り除きます。
- **画像を織り込んだ見積もり** — 画像1枚を、base64 の文字数ではなく約1500として数えます（Anthropic の一律の数え方です）。
- **向こう側で消してもらう（Anthropic のみ）** — 使えるときは `context_management` を通して `clear_tool_uses_20250919` を有効にし、Anthropic 側で古い道具の返事を消してもらいます。

1568×900 の画面で20回ほど操作しても、写した画面の分はだいたい 30K で収まります。600K にはなりません。

## できないこと {#limitations}

- **速さ。** 裏側で動かすぶん、手前で動かすより遅くなります。支援機能を通した入力は、直に送る場合に比べて macOS で約5〜20ミリ秒、Windows の UIA で約3〜10ミリ秒、Linux の AT-SPI で約5〜15ミリ秒かかります。代わりに操作させる速さなら気になりませんが、最速記録を狙うような使い方では気になります。
- **合言葉は打てません。** `type` には、シェルに渡すような中身を必ず止める型があります。合言葉は OS の自動入力に任せてください（macOS のキーチェーン、Windows の資格情報マネージャー、GNOME Keyring、KWallet）。
- **画面の構造を出さないアプリもあります。** Windows の今どきの UWP のアプリ、Linux の Electron 28 より前のもの、独自に描いている一部の macOS のアプリ（Logic、Final Cut、いくつかのゲーム）は、構造が薄いか空です。空だったら座標に切り替えるか、その作業自体をやめてください。
- **Windows では、管理者として上げた窓は普通の状態からは動かせません。**
  Windows の UIPI（ユーザーインターフェイス特権の分離）が、権限の高さの境目を守るからです。中くらいの権限の処理（Hermes は既定でこれです）は、高い権限（管理者）の処理が持つ窓の構造をたどることも、そこへ入力を送り込むこともできません。
  症状としては、`capture(mode='som')` が要素を0個と返し、`click(...)` は成功したと言うのに何も起きません。それでいて写した画面はちゃんと映ります（画面を写す仕組みは、この権限の検査より下にあるためです）。キーの入力は一部この壁を越えるので、Tab や Enter で上げた窓をたどることはできます。これは OS のきまりであって、cua-driver の欠陥ではありません。Windows で画面を動かす仕組みはどれも同じ制約を受けます。上げた窓を動かしたいなら、Hermes そのものを高い権限で走らせてください（管理者として開いた端末から立ち上げます）。そうでなければ、上げていない窓を相手にしてください。
- **OS ごとの落とし穴:**
  - **macOS** は非公開の SkyLight SPI を使います。Apple はこれを、どの更新でも変えられます。入っている cua-driver が、動作を確かめた版より古いときは Hermes が知らせます。
  - **Windows** の SSH は **Session 0** で動き、そこには操作できる画面がありません。RDP かコンソールの中から Hermes を動かすか、cua-driver の自動起動の予定処理を仕立ててください。手順は
    [windows-ssh](https://cua.ai/docs/how-to-guides/driver/windows-ssh)
    にあります。
  - **Linux** では届く画面のサーバーが要ります。画面のないサーバーでは、`computer_use` が写したり入力を送ったりする前に Xvfb（`Xvfb :99 -screen 0 1920x1080x24`）が要ります。Wayland だけの環境では、画面を写すのに XWayland の橋渡しが要ります（入力のほうは cua-driver の Wayland の経路が単独で扱います）。

画面まわりの手間をかけずに、OS をまたいで画面の操作をしたいなら（TCC や Session 0、X11 の準備も要りません）、`browser` のまとまりが本物の画面なしの Chromium を使うので、ウェブだけで済む作業にはそちらが正解です。

## 設定 {#configuration}

許しの与え方と目録（上の
[許しの与え方](#permission-modes-and-logged-in-browser-profiles)を参照）:

```yaml
computer_use:
  permission_mode: standard        # standard (default) | bounded
  capability_manifest: ""          # capability manifest path, required for bounded
  grant_existing_profile: false    # opt-in: attach in standard or unrestricted mode
```

ドライバの実行ファイルの場所を差し替える（試験、CI、手元で組んだもの向け）:

```
HERMES_CUA_DRIVER_CMD=/path/to/your/cua-driver
```

中身ごと入れ替える（試すため）:

```
HERMES_COMPUTER_USE_BACKEND=noop   # records calls, no side effects
```

### 利用状況の送信 {#telemetry}

cua-driver には、名前の出ない利用状況の送信（PostHog）が上流では初めから有効な形で入っています。**Hermes はこれを切ってあります。** cua-driver を呼ぶたびに（MCP の裏側、`status`、`doctor`、導入のいずれでも）、Hermes がドライバの環境に
`CUA_DRIVER_RS_TELEMETRY_ENABLED=0` を設定します。

送るほうに戻したい場合（cua-driver の元の設定に任せて送らせたい場合）は、`config.yaml` にこう書きます。

```yaml
computer_use:
  cua_telemetry: true   # default: false (telemetry off)
```

送るようにしていれば `hermes computer-use doctor` は `telemetry: enabled` と出します。切ってあるとき（既定）は `telemetry: disabled via
CUA_DRIVER_RS_TELEMETRY_ENABLED` と出ます。

## 手元で組んだ cua-driver で試す {#testing-against-a-local-cua-driver-build}

cua-driver そのものを作っているとき、あるいはまだ出ていない直しを試したいときは、配られている版ではなく、自分で組んだ実行ファイルを Hermes に指させます。Hermes は
`shutil.which("cua-driver")` でドライバを見つけ、**`HERMES_CUA_DRIVER_VERSION` を強いません**。そのため、手元で組んだもの（`0.0.0-local-*` と名乗ります）はそのまま受け入れられます。やり方は2つです。

### 案A — `install-local`（組んで PATH に置く） {#option-a-install-local-build-put-it-on-path}

`trycua/cua` を取ってきたところで、上流の手元用の導入の仕掛けを走らせます。Rust の中身を配布用に組み立て、本番の導入と同じ置き方で `cua-driver` を置き、その入れ物のディレクトリを PATH に足します。

```powershell
# Windows (PowerShell), from the cua repo root
./libs/cua-driver/scripts/install-local.ps1 -NoAutoStart
```

```bash
# macOS / Linux, from the cua repo root  (defaults to a debug build without --release)
./libs/cua-driver/scripts/install-local.sh --release
```

- Windows では組んだものを `%USERPROFILE%\.cua-driver\packages\…`
  の下に置き、`%LOCALAPPDATA%\Programs\Cua\cua-driver\bin`（利用者の PATH に足されます）からそこへつなぎます。macOS と Linux では `cua-driver` を `~/.local/bin` にリンクします（`--bin-dir <path>` で変えられます）。
- `-NoAutoStart` を付けると、`cua-driver-serve` をログイン時に立ち上げる登録を飛ばします。Hermes で試すぶんには要りません（あとの注意を参照）。

そのあと新しい画面を開いて（PATH の変更が効くように）、確かめます。

```
cua-driver --version                 # local builds report 0.0.0-local-release
# Windows:      (Get-Command cua-driver).Source
# macOS/Linux:  which cua-driver
```

### 案B — 組んだ実行ファイルを Hermes に直接指させる（いちばん速い） {#option-b-point-hermes-straight-at-the-built-binary-fastest-loop}

導入の手続きはいっさい飛ばします。`cargo build` して、できたものを
`HERMES_CUA_DRIVER_CMD` に指すだけです。直して組んで試す、を繰り返すときに向いています。

```bash
cargo build -p cua-driver            # add --release for a release build; run from libs/cua-driver/rust
```

```
# Windows (.env)
HERMES_CUA_DRIVER_CMD=C:\path\to\cua\libs\cua-driver\rust\target\debug\cua-driver.exe
# macOS / Linux (.env)
HERMES_CUA_DRIVER_CMD=/path/to/cua/libs/cua-driver/rust/target/debug/cua-driver
```

### 自分の組んだものが使われているか確かめる {#confirm-hermes-is-using-your-build}

- `hermes computer-use status` が、見つかった実行ファイルの場所と版を出します。
- `hermes computer-use doctor` は、その実行ファイルに届くことを確かめ、MCP の道すじを端から端まで動かします。
- やり取りの中で `computer_use(action="capture")` を呼べば、立ち上がった
  `cua-driver mcp` の子の処理まで動きます。

### 注意と落とし穴 {#notes-gotchas}

- **Hermes は `cua-driver mcp` を標準入出力の中継として立ち上げます。** ふだんは、その中継が機械ごとの標準の常駐につながります（必要なら立ち上げます）。Hermes ではっきり YOLO にしたときは、代わりに Hermes 自身が `cua-driver serve --embedded` の子を持ち、その専用の口や名前付きのつなぎ先へ中継を向けます。SSH から Session 1 以降の画面へ入力を送る場合は、Windows の自動起動と UIAccess の型が引き続き効いてきます。できないことの節を参照してください。
- **Windows では実行ファイルが掴まれます。** 動いている `cua-driver-serve` の常駐が
  `cua-driver.exe` を掴んでいると、組み直したときの上書きができません。
  `install-local.ps1` は掴まれた実行ファイルの名前を自動でずらします。案Bのように自分で `cargo build` する場合は、先に `cua-driver autostart disable`（または `schtasks /End /TN
  cua-driver-serve`）で止めてください。
- **組み直すとき。** cua-driver の中身を直したら、案Aなら `install-local` をもう一度走らせます（組み直し、置き直し、`current` のつなぎ先を切り替えます）。案Bなら `cargo build` をやり直すだけです。どちらにしても Hermes 側で変えることはありません。
- **手元で組んだものは版の確認を通りません。** 入っている cua-driver が、OS ごとに動作を確かめた基準より古ければ Hermes は知らせますが、`0.0.0-local-*` の開発中のものは除きます。だから手元で組んだものでその知らせが出ることはありません。

## うまくいかないとき {#troubleshooting}

**何かおかしいと思ったら、まず `hermes computer-use doctor` です。**
項目ごとに並んだ結果が、あなたにも、手伝っている相手にも、何が悪いのかを正確に伝えます。

そこでは分からない、特定の失敗はこちらです。

**`computer_use backend unavailable: cua-driver is not installed`** —
`hermes computer-use install` で cua-driver の実行ファイルを取ってくるか、
`hermes tools` を走らせて Computer Use のまとまりを有効にしてください。

**押しても何も起きないように見える** — 写して確かめてください。見えていない前面の窓が入力をふさいでいるかもしれません。`escape` か閉じるボタンで片づけます。

**要素の番号が古い** — 番号は、次の `capture` までのあいだしか通じません。状態が変わる操作をしたら写し直してください。中では見えない `element_token` を持って回っているので、間違ったところが押されるのではなく、はっきりとした失敗が返ります。

**「blocked pattern in type text」** — `type` で打とうとした中身が、危ないシェルの型の一覧に当たりました。命令を分けるか、やり方を考え直してください。

**Linux で何も写らない** — `DISPLAY` が設定されていないか、XWayland の橋渡しがない Wayland だけの環境です。`hermes computer-use doctor` が `ax_capability: fail` として、`Set DISPLAY (X11)…` という助言を添えて知らせます。

**Windows の SSH 越しで何も写らない** — Session 0（サービス用の側）にいます。RDP かコンソールから直に動かすか、自動起動の型を仕立ててください。手順は
[cua.ai/docs/how-to-guides/driver/windows-ssh](https://cua.ai/docs/how-to-guides/driver/windows-ssh) にあります。

## あわせて読む {#see-also}

- **Hermes 側のスキル** — `skills/autonomous-ai-agents/computer-use/SKILL.md` — Hermes の
  `computer_use` で指示できる動きの語彙をまとめたもので、実際に読み込まれるのはこれです。
- **cua-driver のスキル一式** — OS ごとの深掘り（macOS の手前に出さない約束、Windows の UIA と Session 0、Linux の AT-SPI と X11／Wayland、記録、ブラウザのページ）は、
  `cua-driver skills install` を走らせて `MACOS.md`／`WINDOWS.md`／
  `LINUX.md`／`RECORDING.md`／`WEB_APPS.md` を読んでください。Hermes を自動で見つける仕組みは今後入る予定なので、いまのところは入った一式のディレクトリを Hermes から指すか、自分のスキルの置き場にリンクを張ってください。
- **cua.ai/docs** — cua-driver そのものの説明書:
  - [What is computer use?](https://cua.ai/docs/explanation/what-is-computer-use) — 考え方の入り口
  - [The no-foreground contract](https://cua.ai/docs/explanation/the-no-foreground-contract) — *なぜ*裏側で動くことが大事なのか
  - [Install reference](https://cua.ai/docs/how-to-guides/driver/install) — OS ごとの導入の詳しい話
  - [Personalize the agent cursor](https://cua.ai/docs/how-to-guides/driver/personalize-cursor) — 備え付けの形、自前の絵、動作中の差し替え
  - [Drive Windows over SSH](https://cua.ai/docs/how-to-guides/driver/windows-ssh) — Session 0 から Session 1 以降へつなぐ自動起動の型
  - [Keep cua-driver running](https://cua.ai/docs/how-to-guides/driver/keep-running) — 自動起動と常駐の面倒の見方
  - [Connect your agent](https://cua.ai/docs/how-to-guides/driver/connect-your-agent) — cua-driver をいろいろな仕組みに登録する方法（Hermes もその1つです）
- [cua-driver のソース（trycua/cua）](https://github.com/trycua/cua)
- ネイティブのアプリを動かす必要のない、OS をまたぐウェブの作業には [ブラウザの操作](/hermes/docs/user-guide/features/browser/)を使ってください。
