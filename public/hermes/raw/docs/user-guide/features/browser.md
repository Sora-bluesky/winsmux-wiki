---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "ブラウザの自動操作"
description: "browser_exec で本物のブラウザを操ります。Hermes が立ち上げる Chromium、クラウドのブラウザ、Lightpanda、CDP でつなぐ自分の Chrome のどれでも使え、ウェブとのやり取り、フォームの入力、情報の取り出しなどができます。"
upstream_path: user-guide/features/browser.md
upstream_blob: e7f96a28b7f1d23c1d1d6d634b4dbd98243eabf6
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/browser
---

# ブラウザの自動操作 {#browser-automation}

`browser` の道具一式は、エージェントに本物のウェブブラウザを渡します。操作を受け持つ道具は
1つだけで、**`browser_exec`** がそれです。モデルが書いた Python を、Chrome DevTools Protocol（CDP）を通して
ブラウザに対して動かします。これに付き添う道具が3つあります
（`browser_cdp` と `browser_dialog` は CDP の接続先が設定されているあいだだけです。
[付き添いの道具](#companion-tools)を見てください）。

| 道具 | 役目 |
|------|---------|
| `browser_exec` | ブラウザ用の手助け関数を読み込み済みの Python を動かして、移動、読み取り、クリック、入力、情報の取り出し、スクリーンショットを行います。 |
| `browser_cdp` | 生の CDP の命令を1つ送ります（Cookie、通信の制御、iframe に閉じた評価など、手助け関数が扱わないものすべて）。 |
| `browser_dialog` | ページを止めている JavaScript の native のダイアログ（`alert` ／ `confirm` ／ `prompt` ／ `beforeunload`）を受け入れるか閉じます。 |
| `browser_vault` | 保存したログイン、カード、住所、2 段階認証のコードを、秘密を会話に出さずに今のページへ入力します。 |

ブラウザをどこから持ってくるかは、別に選びます。

- **手元の Chromium（既定）** — Hermes が同梱の Chromium を画面なしで立ち上げます。セッションごとに1つのブラウザです。API キーも準備も要りません。
- **クラウドのブラウザ** — [Nous の購読](/hermes/docs/user-guide/features/tool-gateway/)、[Browserbase](https://browserbase.com)、[Browser Use](https://browser-use.com) のクラウド、[Firecrawl](https://firecrawl.dev)、またはブラウザのプロバイダのプラグインです。
- **[Lightpanda](https://lightpanda.io)** — 小さな機械で文字中心に見て回るための、軽い画面なしのエンジンです。
- **自分のブラウザ** — `/browser connect` で、動いている Chrome、Brave、Chromium、Edge につなぎます。
- **自分の本物のプロファイル** — 普段使っているブラウザのプロファイルを、ログインごと管理下に写したものです（自分で有効にしたときだけ）。

:::tip
ちょっとした情報を取ってくるだけなら、`web_search` か `web_extract` のほうが向いています。速くて安く済みます。ブラウザは、エージェントがページを**操作する**必要があるとき（ボタンを押す、フォームを埋める、動きのある中身を扱う）に使ってください。
:::

## `browser_exec` の仕組み {#how-browserexec-works}

呼び出しのたびに Python のかたまり（`code`）が送られ、ブラウザ用の手助け関数を
読み込み済みの状態で動きます。コードが print したものが、そのまま結果として返ります。
ブラウザのセッション（開いているタブ、Cookie、今のページ）は呼び出しをまたいで残りますが、
Python の変数は残りません。呼び出しのたびに新しいインタープリターで始まります。セッションごとの
作業用ディレクトリ（`$BH_AGENT_WORKSPACE`。`workspace` としても返ります）は
呼び出しのあいだも残るので、長い取り出しでは区切りごとにファイルへ書き足し、
最後にまとめられます。

手助け関数です。

| 手助け関数 | すること |
|--------|------|
| `new_tab(url)` | URL を開きます（最初の移動に使います）。 |
| `goto_url(url)` | 今のタブで移動します（2回目以降の移動）。 |
| `wait_for_load()` | ページの読み込みが終わるのを待ちます。 |
| `page_info()` | 今のページの状態をまとめます。 |
| `js(expr)` | JavaScript を評価して値を返します（関数の本体は `js('(() => {...})()')` のように包みます）。 |
| `fill_input(selector, text)` | 入力欄に文字を打ちます。 |
| `click_at_xy(x, y)` | 表示領域の座標をクリックします。 |
| `capture_screenshot()` | スクリーンショットを保存して、その場所を print します。 |
| `cdp('Domain.method', **kwargs)` | 生の CDP です。たとえばアクセシビリティツリーなら `cdp('Accessibility.getFullAXTree')`、クリックする座標なら `cdp('DOM.getBoxModel', backendNodeId=n)` を使います。 |
| `ensure_real_tab()` | 古くなったタブや内部用のタブから立て直します。 |

モデルは、ひとまとまりの手順（移動、待つ、取り出す、操作する）を、1つの操作ごとに呼び出しを
使うのではなく、1回の呼び出しにまとめます。

```python
# Searching GitHub trending for Python repos
new_tab("https://github.com/trending/python")
wait_for_load()
print(js("[...document.querySelectorAll('article h2 a')].slice(0, 10).map(a => a.textContent.trim())"))
```

**スクリーンショット。** 画像を直接見られるモデルなら、
`capture_screenshot()` で保存した画像が道具の結果に添付され、モデルがそれを
じかに確かめます。文字だけのモデルには、文字を先に使う（`page_info()`、`js()`、
`fill_input()`）よう伝えます。それでも、保存した場所を `vision_analyze` に渡すことはできます。
メッセージのやり取りをする場では、エージェントにスクリーンショットを送るよう頼めます。
その場の写真の添付として届きます。

**引数。** `code` のほかに、この道具は `timeout_s`（既定は 300、最大
1800）と `session` を受け取ります。`session` の名前ごとに専用のドライバのプロセスと
専用のブラウザが付きます（手元では別々の Chromium、クラウドの
プロバイダでは別々のクラウドブラウザ）。そのため、並列のサブエージェントや同時のチャットが、1つの
共有されたブラウザを奪い合うことはありません。`session` を省くと共有の既定のセッションを使います。
1つずつ見て回るならこれで十分です。[本物のプロファイルで見て回る](#real-profile-browsing-use-your-own-logins)
を有効にしているときは、この道具に `local` という旗も現れます（その節を見てください）。

:::note
`browser_exec` はモデルが書いた Python を手元の機械で動かすので、
`terminal` の道具一式も持つセッションにだけ渡されます。端末を使えないように
設定された場（たとえば締めたメッセージの窓口）には、
ブラウザは渡されません。
:::

ドライバは [browser-harness](https://github.com/browser-use/browser-use) で、
Browser Use CLI のエンジンです。Hermes の通常の Python の依存関係なので、
Desktop アプリを含むどのインストールにも最初から入っていて、別にダウンロードする必要はありません。

## 手元の Chromium（既定） {#local-chromium-default}

クラウドのプロバイダも、`/browser connect` の接続先も、本物のプロファイルの切り替えも
設定していないとき、Hermes はそのセッションのために自分で Chromium を立ち上げ、
`browser_exec` をそこに向けます。入れてある Chrome に手が触れることはありません。
`chrome://inspect` で有効にする切り替えも、「リモートデバッグを許可しますか」の確認もなく、
デスクトップのブラウザがまったくない画面なしのサーバーでも動きます。

- **セッションごとに1つのブラウザ**で、既定では使い捨ての新しいプロファイルです。
  エージェントはどこにもログインしていない状態で始まり、セッションが終われば何も残りません。
- **既定は画面なし。** 見える窓が欲しいなら `browser.headed: true` を設定します
  （[下](#headed-mode-visible-browser-window)を見てください）。
- **自動での片づけ。** ブラウザは `browser.inactivity_timeout`
  秒（既定は 120）動きがないとき、Hermes が終了するとき、そしてプロセスが落ちたときは
  迷子の掃除によって閉じられます。
- **私設のホストにも届きます。** 端末の裏方（バックエンド）が手元にあるときは、手元の
  Chromium は `localhost` や LAN のアドレスを開けます。
  `security.allow_private_urls` の設定は関係ありません。端末から届かない場所には、ブラウザも届かないからです。
  私設のアドレスへの守りが働くのは、端末からは届かないネットワークにブラウザが届くとき
  （クラウドのプロバイダ、`/browser connect` の接続先、
  Docker/SSH/Modal の端末の裏方）です。エージェントが書いたクラウドのメタデータの URL は、
  常に断られます。

**どの Chromium を使うか。** Hermes は、次のうち最初に見つかったものを使います。

1. `browser.executable_path`。設定されているとき。
2. Hermes のパッケージマネージャーが入れた Chromium（Chrome for Testing）。
   インストーラーと `hermes update` が既定で入れます。
3. 公式の Docker イメージでは `/etc/hermes/chromium-executable-path`。
4. `PATH` 上にあるシステムの `chromium` / `chromium-browser`（Android/Termux や、
   パッケージマネージャーに Chromium のビルドがない環境）。

どれも見つからないときは、ブラウザの道具は黙って失敗するのではなく、はっきりした手がかりを
出します。`--skip-browser` / `-SkipBrowser` を付けてインストールした場合や、
ダウンロードに失敗した場合は、次のコマンドで入れてください。

```bash
hermes pm install chromium
```

これで以前の `--skip-browser` の選択も取り消されるので、以後の更新でも
ブラウザが最新に保たれます。Linux では、Chromium にディストリビューションのシステムの
ライブラリが必要なこともあります（Debian/Ubuntu なら `npx playwright install-deps chromium` で
入ります）。Android/Termux では、リポジトリが提供していれば `pkg install chromium` を
実行してください。システムの Chromium がなければ、
その端末ではブラウザを使えません。

**手元向けの設定**（`~/.hermes/config.yaml`）です。

```yaml
browser:
  executable_path: ""     # Chromium binary to launch instead of the packaged one
  user_data_dir: ""       # persistent profile directory; "" = fresh profile per session
  chromium_args: []       # extra Chromium command-line flags, e.g. ["--lang=de-DE"]
  headed: false           # true = visible window
  command_timeout: 30     # Chromium launch timeout floor (seconds)
  inactivity_timeout: 120 # close an idle browser after N seconds
```

`browser.user_data_dir` を使うと、Cookie とログインがセッションをまたいで残ります。そのときは
すべてのセッションが、その1つのプロファイルのディレクトリを共有します。隔離された使い捨ての
閲覧にしたいなら、空のままにしてください。

### 画面ありモード（見えるブラウザの窓） {#headed-mode-visible-browser-window}

```yaml
browser:
  headed: true  # default: false
```

画面ありモードは2つのことをします。

1. **見える窓とともに Chromium を立ち上げます。** エージェントの働くさまを見て、
   手で割り込めます（サインインの関門、CAPTCHA）。
2. **ターンのあいだもブラウザを開いたままにします。** 普通はエージェントの返事のたびに
   ブラウザが片づけられますが、画面ありモードではターンごとの片づけを飛ばすので、
   会話のあいだログインの状態が温まったままになります。

動きのないブラウザは今も `browser.inactivity_timeout` のあとに片づけられ、終了時には
すべて閉じられます。画面のない機械（サーバー、CI）では、ブラウザは常に
画面なしで動きます。画面ありモードが効くのは手元のブラウザだけで、クラウドのセッションには
効きません。

## クラウドのブラウザ {#cloud-browsers}

:::tip Nous の購読者へ
有料の [Nous Portal](https://portal.nousresearch.com) の購読があるなら、別途 API キーを用意しなくても **[ツールゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)** 経由でクラウドのブラウザを使えます。新しく入れる場合は `hermes setup --portal` でログインすれば、ゲートウェイの道具を一度に全部有効にできます。すでに入れてある場合は、`hermes model` か `hermes tools` でブラウザのプロバイダとして **Nous Subscription** を選んでください。
:::

プロバイダは `hermes tools` → Browser Automation で選びます。そうすると `browser_exec` は、
手元の Chromium を動かすのとまったく同じように、そのプロバイダのブラウザを動かします。

### Browser Use のクラウド {#browser-use-cloud}

```bash
# Add to ~/.hermes/.env
BROWSER_USE_API_KEY=***
```

API キーは [browser-use.com](https://browser-use.com) で取れます。Browser Use Cloud は、[隠密性](https://docs.browser-use.com/cloud/browser/stealth)と[住宅用のプロキシ](https://docs.browser-use.com/cloud/browser/proxies)を既定で有効にしたお任せの Chromium を動かし、CAPTCHA の突破も備え、Cookie・localStorage・保存したパスワードのための[残るプロファイル](https://docs.browser-use.com/cloud/guides/authentication)にも対応しています。

### Browserbase {#browserbase}

```bash
# Add to ~/.hermes/.env
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=your-project-id-here
```

資格情報は [browserbase.com](https://browserbase.com) で取れます。任意の設定です。

```bash
# Residential proxies for better CAPTCHA solving (default: "true")
BROWSERBASE_PROXIES=true

# Advanced stealth with custom Chromium — requires Scale Plan (default: "false")
BROWSERBASE_ADVANCED_STEALTH=false

# Session reconnection after disconnects — requires paid plan (default: "true")
BROWSERBASE_KEEP_ALIVE=true

# Custom session timeout in seconds (max 21600 = 6 hours) (default: project default)
BROWSERBASE_SESSION_TIMEOUT=1800
```

Browserbase の隠密の働きです。

| 働き | 既定 | 備考 |
|---------|---------|-------|
| 基本の隠密 | 常に有効 | 無作為の指紋、表示領域の無作為化、CAPTCHA の突破 |
| 住宅用のプロキシ | 有効 | 住宅用の IP を通すので、より通りやすくなります |
| 進んだ隠密 | 無効 | 独自ビルドの Chromium。Scale Plan が必要です |
| Keep Alive | 有効 | 回線が乱れたあとにセッションをつなぎ直します |

有料の働きがお使いのプランで使えないときは、Hermes が自動で下げていきます。まず `keepAlive` を外し、次にプロキシを外すので、無料のプランでも見て回れます。

### Firecrawl {#firecrawl}

```bash
# Add to ~/.hermes/.env
FIRECRAWL_API_KEY=fc-***

# Optional: self-hosted Firecrawl instance (default: https://api.firecrawl.dev)
FIRECRAWL_API_URL=http://localhost:3002

# Optional: session TTL in seconds (default: 300)
FIRECRAWL_BROWSER_TTL=600
```

API キーは [firecrawl.dev](https://firecrawl.dev) で取れます。そのうえで、`hermes tools` → Browser Automation で **Firecrawl** を選んでください。

:::note プロバイダの選び方
上の `.env` の鍵が渡すのは**資格情報だけ**です。どのブラウザを使うかは、`hermes tools` → Browser Automation が書き込む `browser.cloud_provider` の選択で決まります（`local`、`browserbase`、`browser-use`、`firecrawl`、あるいは Nous Subscription なら `nous`。プロバイダのプラグインはそれぞれ自分の名前を足します）。いったん選択があると、鍵を足したり消したりしてもプロバイダは切り替わりません。選ばれているプロバイダの鍵が欠けているときは、黙って別の経路に回すのではなく、`hermes tools` を実行するよう案内してエラーになります。一度も設定したことのない状態なら、今ある資格情報から自動で見つけます。
:::

クラウドのセッションはプロバイダの残高を使います。Hermes は、
会話が終わったとき、`browser.inactivity_timeout` のあと、そしてプロセスの終了時にセッションを手放します。

### 混ぜて振り分ける: 公開の URL はクラウド、LAN や localhost は手元 {#hybrid-routing-cloud-for-public-urls-local-for-lanlocalhost}

クラウドのプロバイダが設定されていると、Hermes は私設・ループバック・LAN のアドレス（`localhost`、`127.0.0.1`、
`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`*.local`、`*.lan`、`*.internal`、
IPv6 のループバック `::1`、リンクローカルの `169.254.x.x`）に解決される URL のために、**手元の Chromium の脇役**を
自動で立ち上げます。公開の URL は同じ会話の中で
クラウドのプロバイダを使い続けます。

これで「手元で開発しているのに Browserbase を使っている」というよくある流れが解けます。
プロバイダを切り替えたり SSRF の守りを外したりしなくても、エージェントは `http://localhost:3000` のダッシュボードの
スクリーンショットを撮り、同時に `https://github.com` から情報を取り出せます。
クラウドのプロバイダが私設の URL を目にすることはありません。

この働きは**既定で有効**で、
`security.allow_private_urls` には左右されません。この設定が守るのはクラウドのブラウザとウェブの
道具です。脇役は Hermes の動く機械の上で動くので、この設定がオフでも私設のホストを開きます。
端末から `curl http://localhost` を打つのと同じことです。そのため、ホスティングした
Hermes（Docker や VPS）では、エージェントが脇役を通して、その機械自身の
ループバックのサービスやその LAN を見て回れます。私設の URL を断りたい
（すべての URL を設定したクラウドのプロバイダに回したい）ときは、こうします。

```yaml
# ~/.hermes/config.yaml
browser:
  cloud_provider: browserbase
  auto_local_for_private_urls: false
```

自動の振り分けを止めると、私設の URL は
`"Blocked: URL targets a private or internal address"` と言って断られます。ただし
`security.allow_private_urls: true`（または古い書き方の `browser.allow_private_urls: true`）も設定したときは別で、
私設の URL はクラウドのプロバイダに渡されます。とはいえ Browserbase などはこちらの LAN に
届かないので、たいていは役に立ちません。クラウドのメタデータの URL（`169.254.169.254`、
`metadata.google.internal`）は、`browser_exec` のコードや生の CDP の引数に書かれていれば、
脇役を含むどの経路でも断られます。ただし、ページが自分でそこへ転送する場合は断られません
（[セキュリティ](/hermes/docs/user-guide/security/#what-allow_private_urls-covers-and-what-it-doesnt)を見てください）。

脇役は[上](#local-chromium-default)で説明した手元の Chromium と同じものなので、
その Chromium が入っている必要があります。どちらに振り分けるかは、
`browser_exec` のコードに書かれた URL から決まります。公開のページがあとから私設のアドレスへ転送しても、
クラウドのブラウザに残ったままで、クラウドのブラウザはこちらのネットワークに届きません。

## 本物のプロファイルで見て回る（自分のログインを使う） {#real-profile-browsing-use-your-own-logins}

既定では、手元で見て回るときはまっさらな使い捨てのプロファイルが使われ、エージェントは
どこにもログインしていません。**本物のプロファイルで見て回る**を有効にすると、エージェントは
今あるログインと Cookie を持って*こちら自身*として見て回れます。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
```

有効にすると Hermes は、既定のブラウザで**実際に使っている**プロファイル
（`Local State → profile.last_used` のもの）を、その Cookie、保存した
ログイン、設定ごと
`~/.hermes/browser-profile/<browser>/` の管理下の写しにコピーし、その写しの上で**本物のブラウザの
実行ファイル**を起動して、閲覧のエンジンをそこにつなぎます。（作り物の鍵束の指定を付けた
同梱の Chromium ではなく）本物の実行ファイルを起動するのは、
OS が暗号化した Cookie を読めるままにしておくためです。macOS では Chrome の Cookie は
Keychain を通して暗号化されており、作り物の鍵束で起動すると Cookie が黙って1つ残らず
落ち、ログアウトした状態で開いてしまいます。動いているブラウザのプロファイルが**直接
開かれることはありません**。
写しは別のディレクトリなので、動いているブラウザと
プロファイルの錠を奪い合うこともなく、Chrome 136 以降が既定の
プロファイルのディレクトリへのリモートデバッグを塞いでいることも避けられます。認証まわりのファイル（Cookie／ログイン／設定）は、
新しいセッションが立ち上がるたびに本物のプロファイルから取り直されるので、
自分のブラウザでしたログインがエージェントのセッションにも現れます。コピーされるのは実際に使っている
プロファイルだけで、ほかの Chrome のプロファイルが写し取られることはありません。

写しのブラウザは**画面なし**で動きます。見えている窓もなく、焦点を奪うこともなく、
裏でこちらのプロファイルを動かすので、エージェントが代わりに投稿したり
フォームを埋めたり情報を取り出したりしているあいだも、こちらは仕事を続けられます。
（ここでの画面なしは Chrome の*新しい*画面なしモードで、普段の
Cookie の置き場を読むので、ログインはちゃんと読み込まれます。）働くさまを見ていたいなら、
同じ[画面ありモード](#headed-mode-visible-browser-window)の切り替えがここにも効きます。
`browser.headed: true` で、本物のプロファイルの閲覧にも見える窓が開きます。画面のない機械（サーバー、CI）では、
設定にかかわらず常に画面なしで動きます。

ブラウザにプロファイルがいくつもあり（たとえば仕事用と個人用）、
「最後に触ったほうのプロファイル」でエージェントの身元が決まってしまうのが困るなら、
写しの出どころをはっきり留めてください。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
  real_profile_pin: "Profile 2"   # directory name under the browser's user-data dir
```

存在しないプロファイルのディレクトリを指す留め方をしても、黙って最後に使ったプロファイルに
落ちることはありません。エージェントにはこちらのログインが入っていないまっさらなブラウザが渡され、
まちがった留め先の名前を挙げたメッセージが出ます。

この切り替えを戻すと、Hermes は次にブラウザを使うときに写しの置き場
（`~/.hermes/browser-profile/`）を消します。同意を取り下げたあとに、コピーした
資格情報が居座らないようにするためです。

:::note プロファイルをコピーできなくても、ブラウザは使えます
本物のプロファイルを使う設定にしても、ブラウザそのものが使えなくなることはありません。Hermes がプロファイルを
コピーできないとき、エージェントにはそのセッションのあいだ**こちらのログインが入っていない**まっさらなブラウザが渡され、
最初のブラウザ操作の結果にその理由（`real_profile_unavailable`）が書かれます。そのためエージェントは、
サインインしているふりをせずに、そのことをこちらに伝えられます。これが起きるのは次のときです。

- **Windows で、初めて使うときだけ:** 動いている Chrome／Edge／Brave が Cookie の
  データベースを排他（すべて拒否）の錠で握っているので、最初のコピーではブラウザを
  **完全に終了**しておく必要があります。裏や通知領域に残っているものも含めてです（Chrome の「閉じたあともバックグラウンドアプリの処理を続行する」を有効にしていると、
  窓を閉じたあとも `chrome.exe` が生き続けます）。一度コピーに成功すれば、そのあとはブラウザを開いたままでも、
  その写しを使い回して起動します。ログインの状態は最後にコピーした時点のもので、
  次に自分のブラウザを閉じた状態で Hermes がブラウザを起動したときに新しくなります。
- **既定のブラウザが対応している Chromium 系ではない**とき（Firefox や、Beta／Dev／Canary
  のチャネル）、または留めたプロファイルが存在しないとき。
- **Cookie のデータベースが読めないか壊れている**とき。メッセージにはそのデータベースの名前と
  SQLite のエラーが添えられます。

macOS と Linux では、動いている Chrome が `Login Data`、`Login Data For Account`、
`Web Data`（保存したパスワードと自動入力）を書き込みの錠で握りますが、`Cookies`
はそれでもコピーできます。サイトにサインインしたままでいられるのは Cookie のおかげです。Hermes は
Cookie をコピーし、錠のかかったパスワードと自動入力のファイルは飛ばすので、ブラウザは
開いたままでかまいません。どのデータベースも SQLite のオンラインバックアップを通してコピーします（生のファイルの
コピーはしません。それだと最近のログインを失うおそれがあるためです）。

`browser.real_profile_autoclose: true` を設定すると、プロファイルの錠を握っているブラウザ（Windows の場合です）を
**Hermes が閉じましょうかと申し出る**ようになります。これを入れていても、
Hermes が勝手に閉じることは決してありません。エージェントがまずこちらに尋ね、
こちらが承認したときにだけ `hermes browser close-profile` を実行します（そのプロファイルにつながるブラウザのプロセスの
一群を終わらせます。保存していないタブは失われます）。そのあと新しいブラウザのセッションを開くと、
こちらのプロファイルが使われます。
:::

- **対応しているブラウザ:** Chrome、Edge、Brave、Brave Origin、Chromium（OS の
  既定になっているもの）。Chromium 系でないもの（たとえば Firefox）が既定のときは、
  どのプロファイルを使うか当て推量をせず、まっさらなブラウザとはっきりしたメッセージを出します。
- **どのブラウザの出どころでも動きます。** 手元では、切り替えを入れれば自動で
  効きます。**クラウド**のブラウザのプロバイダでも、エージェントは `browser_exec` の道具の `local`
  という引数で、必要なときに本物のプロファイルの手元のセッションを開けます
  （この切り替えが入っているときだけ、道具はその引数を見せます）。
  ほかはすべてクラウドのプロバイダが受け持ち続けます。
- **安全の位置づけ:** これは同意を前提にした便利さであって、隔離の
  境目ではありません。エージェントが開いたページは、こちらの本物のログインとともに動きます。
  エージェントに自分として振る舞ってほしいときにだけ有効にしてください。既定では無効です。
- **デスクトップ:** **Capabilities → Tools → Browser → Use My Real
  Browser Profile**（切り替えは裏方の選択肢の上にあります）か、
  Settings → Config の `browser` の節で切り替えます。

### 定期実行と無人での実行 {#scheduled-and-unattended-runs}

実際のプロファイルを使うセッションなら、すでにサインインしているサイトを `cronjob` から操作させられます。
スナップショットは既定で画面を出さずに（ヘッドレスで）動きます。認証ファイル（`Cookies`、
`Login Data` など）は、新しいセッションを始めるたびに実際のプロファイルから同期し直します。
すでに開いているセッションはそのまま使い回すので、同期が起きるのは新しいセッションを
起動したときです。保管庫に認証情報を保存していない場合、そのサイトのセッションが切れていると
ログインページが表示されます。無人の定期実行はそこで止まったまま待たず、その状態を報告します。

定期実行を組む前に、次の 3 つを済ませてください。

- **切り替えをオンにします。** `browser.use_real_profile` の既定は `false` で、
  オフのままだとジョブはサインインしていないまっさらなプロファイルで動きます（上の説明を参照）。
- **ジョブにブラウザのツールセットを渡します:**
  `cronjob(action="create", enabled_toolsets=["browser", ...], ...)`。ジョブごとの
  指定は、cron プラットフォームの設定より優先されます
  （[詳しく](/hermes/docs/user-guide/features/cron/#toolsets-available-to-cron-jobs)）。
- **途中で何も入力できない前提にします。** cron、webhook、API、
  `hermes chat -q` のセッションでは入力に答える人がいません。そのため、同期した Cookie だけでは
  使えないサイト（ログインフォームや、新たに求められる 2 段階認証）では、認証アプリの鍵も含めて
  認証情報を前もって保存しておく必要があります。これは
  [認証情報の保管庫](/hermes/docs/user-guide/features/credential-vault/#headless-sessions)の役目で、
  自分のセッションが切れたあとの実行を支えるのもこの保管庫です。

**Windows での前提条件:** 最初のスナップショットを取るには、ブラウザを完全に終了しておく必要があります。
そのあとは、ブラウザを開いたまま定期実行が走っても、最後のスナップショット（ログインはそのコピーの時点のもの）を
使い回します。まだスナップショットが無い場合、その回はサインインしていないまっさらなブラウザで動きます。Hermes が確認なしにブラウザを閉じることはありません
（上の注記を参照）。

同梱の `product-price-monitor` スキルは、繰り返し実行する形の実例です。
セットアップ時に JSON で監視の取り決めを書き、定期実行のたびにそれを読み直して比べ、変化があれば知らせます。
ただし、この例が扱うのは定期実行の部分で、ログインは扱いません。

## Lightpanda のローカルエンジン {#lightpanda-local-engine}

[Lightpanda](https://lightpanda.io) は、一から書かれた公開の画面なしブラウザです。すぐ立ち上がり、Chrome より 9 倍速く動き、メモリは 16 分の1で済みます。小さな仮想機械の上で長く生き続けるエージェントには、これが効いてきます。

Lightpanda は（手元の Chromium と同じ、ブラウザの出どころという意味での）**ローカルエンジン**で、クラウドのプロバイダではありません。実行ファイルを入れて `PATH` に置き（[Lightpanda の導入の手引き](https://lightpanda.io/docs/run-locally/installation/one-liner)を見てください）、`hermes tools` → Browser Automation で **Lightpanda** を選ぶか、次のように設定します。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  cloud_provider: local
  engine: lightpanda   # auto (default, Chromium) | lightpanda
```

Hermes が自分で `lightpanda serve --host 127.0.0.1 --port <free>` を立ち上げ（`browser_exec` のセッションの名前ごと、あるいは仕事ごとに1つのプロセス）、`browser_exec` をそこに向けます。Chromium も Node.js も要りません。プロセスは `browser.inactivity_timeout` のあと、終了時、そして Hermes が落ちたときは迷子の掃除によって片づけられます。これらのプロセスはすべて `$HERMES_HOME/cache/browser-use/lightpanda/http-cache` にある1つのディスク上の HTTP のキャッシュを共有するので、同じところをもう一度訪ねるときは素材の読み直しを省けます。Hermes がキャッシュの指定を渡すのは、入っている Lightpanda がそれに対応しているとき（0.3.x 以降）だけで、古い実行ファイルは単にキャッシュなしで動きます。消したいときは、まず Lightpanda のセッションを止めてから、そのディレクトリを消してください。

Lightpanda には絵を描く部分がないので `capture_screenshot()` は使えず、道具の説明はモデルに文字を先に使うよう伝えます。またセッションごとにページを1つしか持てないので、モデルには `new_tab()` を一度だけ呼び、そのあとは `goto_url()` を使うよう伝えます（上流では [lightpanda-io/browser#1962](https://github.com/lightpanda-io/browser/issues/1962) で追われています）。

**エンジンが無視されるとき。** `browser.engine` はブラウザの設定の中でいちばん優先度が低いものです。クラウドのプロバイダ（Nous の購読のブラウザも含みます。また一度も設定したことのない状態では、`~/.hermes/.env` にある `BROWSERBASE_API_KEY` や `BROWSER_USE_API_KEY` が自動で1つ選ばれます）、`browser.cdp_url` や `/browser connect` による上書き、`browser.use_real_profile` は、どれもこれより優先されます。`hermes tools` で Lightpanda を選ぶと `cloud_provider: local` も書き込まれます。エンジンが設定されているのに何かに隠されているときは、`/browser status` と `hermes doctor` が、何に隠されているかも含めて教えてくれます。

## CDP で自分のブラウザにつなぐ（`/browser connect`） {#your-own-browser-via-cdp-browser-connect}

Hermes が立ち上げる Chromium やクラウドのプロバイダを使う代わりに、Chrome DevTools Protocol（CDP）で、動いている自分の Chrome、Brave、Chromium、Edge にブラウザの道具をつなげられます。エージェントの動きをその場で見たいとき、自分の Cookie やセッションが要るページを扱いたいとき、クラウドのブラウザの費用を避けたいときに役立ちます。

:::note
`/browser connect` は**対話的な CLI のスラッシュコマンド**で、ゲートウェイからは呼び出されません。WebUI、Telegram、Discord、そのほかのゲートウェイのチャットで打つと、そのメッセージはただの文章としてエージェントに送られ、コマンドは動きません。端末から Hermes を立ち上げ（`hermes` か `hermes chat`）、そこで `/browser connect` を打ってください。
:::

CLI ではこう使います。

```
/browser connect                 # Auto-launch/connect to a local Chromium-family browser at http://127.0.0.1:9222
/browser connect ws://host:port  # Connect to a specific CDP endpoint
/browser status                  # Check current connection
/browser disconnect              # Detach and return to cloud/local mode
```

リモートデバッグを有効にしたブラウザがまだ動いていなければ、Hermes は対応している Chromium 系のブラウザを `--remote-debugging-port=9222` 付きで自動的に立ち上げようとします。見つけに行く対象には Brave、Brave Origin／Nightly、Google Chrome、Chromium、Microsoft Edge が入り、Linux でよくある導入先や、`brave-origin`、`brave-origin-nightly`、`/opt/brave.com/brave-origin/brave-origin`、`/opt/brave.com/brave-origin-nightly/brave-origin`、`/opt/brave-bin/brave`、`/snap/bin/brave` といった実行ファイルの名前も含まれます。

:::tip
Chromium 系のブラウザを手で CDP 付きで立ち上げるときは、専用の user-data-dir を使ってください。そうすれば、普段のプロファイルでブラウザがすでに動いていても、デバッグ用のポートがちゃんと開きます。

```bash
# Linux — Brave
brave-browser \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/.hermes/chrome-debug \
  --no-first-run \
  --no-default-browser-check &

# Linux — Google Chrome
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/.hermes/chrome-debug \
  --no-first-run \
  --no-default-browser-check &

# macOS — Brave
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.hermes/chrome-debug" \
  --no-first-run \
  --no-default-browser-check &

# macOS — Google Chrome
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.hermes/chrome-debug" \
  --no-first-run \
  --no-default-browser-check &
```

そのうえで Hermes の CLI を立ち上げ、`/browser connect` を実行します。

**なぜ `--user-data-dir` が要るのか。** これがないと、普通のブラウザがすでに動いている状態で Chromium 系のブラウザを立ち上げても、たいていは今あるプロセスの上に新しい窓が開くだけです。そのプロセスは `--remote-debugging-port` 付きで立ち上げられていないので、9222 番のポートは決して開きません。専用の user-data-dir を渡すと、デバッグ用のポートがちゃんと待ち受ける、新しいブラウザのプロセスが立ち上がります。`--no-first-run --no-default-browser-check` は、新しいプロファイルでの初回起動の案内を飛ばします。

**Chrome 136 以降では、専用のプロファイルが必須になりました。** ここでは別々の 2 つのしくみが働いていて、既定ではない `--user-data-dir` を渡せば、どちらも当てはまらなくなります。1 つ目は、[Chrome 136](https://developer.chrome.com/blog/remote-debugging-port) 以降、`--remote-debugging-port` と `--remote-debugging-pipe` が「既定の Chrome のデータディレクトリをデバッグしようとする場合は、もう尊重されない」ことです。フラグは黙って無視され、ダイアログも出ず、ほかに Chrome が動いていない冷えた状態からの起動であっても、`/browser connect`（または `curl http://127.0.0.1:9222/json/version`）は接続を断られます。2 つ目は、[Chrome 144 以降](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)に加わった、本物のプロファイルのデバッグを許すための任意の*承認*の流れです。`chrome://inspect/#remote-debugging` で有効にすると、Chrome は起動ごとに 1 回ではなく**接続が来るたびに**「**Allow remote debugging?**」のダイアログを出し、**Allow** を押すまで何も待ち受けません。このダイアログが出たなら、フラグの経路ではなく承認の経路に乗っています。直し方はまさに上のコマンドで、`--user-data-dir` を既定のプロファイルのディレクトリではない場所（たとえば `$HOME/.hermes/chrome-debug`）に向けることです。そうすれば切り替えもダイアログも要りません。これは、この変更を取り込んだ Chrome、Chromium、Edge、Brave のビルドに当てはまります。

専用のプロファイルは、どこにもログインしていない状態から始まります。いまのログインを使ったまま、承認のダイアログも出さずにエージェントに見て回らせたいなら、代わりに [`browser.use_real_profile`](#real-profile-browsing-use-your-own-logins) を使ってください。使っているプロファイルを写しに取り、その写しを操るので、既定ではない user-data-dir となり、どちらのしくみも働きません。
:::

つないでいるあいだ、`browser_exec`、`browser_cdp`、`browser_dialog`、`browser_vault` はどれも、自前のブラウザを立ち上げる代わりに、動いているこちらのブラウザを操ります。接続先は、`config.yaml` の `browser.cdp_url` か、環境変数 `BROWSER_CDP_URL` で常に使うよう設定することもできます。

### WSL2 と Windows の Chrome: `/browser connect` より MCP を選ぶ {#wsl2-windows-chrome-prefer-mcp-over-browser-connect}

Hermes が WSL2 の中で動いていて、操りたい Chrome の窓が Windows のホスト側で動いているとき、`/browser connect` はたいてい最良の道ではありません。

理由です。

- `/browser connect` は、Hermes 自身が使える CDP の口に届けることを前提にしています
- 今どきの Chrome の生のデバッグのセッションは、昔ながらの `9222` のポートと同じようには WSL から直接届かない、ホストの中だけの口を出すことがよくあります
- Windows の Chrome がデバッグできる状態であっても、いちばんきれいな組み合わせは、Windows 側のブラウザの MCP サーバーに Chrome をつながせ、Hermes にはその MCP サーバーと話させることであることが多いのです

その形にするなら、Hermes の MCP 対応を通して `chrome-devtools-mcp` を使ってください。

実際の手順は MCP の手引きにあります。

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/#wsl2-bridge-hermes-in-wsl-to-windows-chrome)

## Bot Desktop の画面 {#bot-desktop-screen}

[Bot Desktop の画面](/hermes/docs/user-guide/features/bot-screen/)を動かしているゲートウェイでは、bot の
ブラウザとドックの **Browser** のアイコンは同じ画面ありの Chromium で、bot ごとに
残り続けるプロファイルを1つ持ちます。そのため、こちらが操作を引き取ってサイトにサインインし、
そのセッションをエージェントに返せます。プロファイルの場所と、そこで
`browser.executable_path` / `browser.user_data_dir` がどう効くかは、そのページを見てください。

## 付き添いの道具 {#companion-tools}

`browser_vault` は、`browser_exec` が動かすのと同じブラウザのセッションを相手に働きます。
手元の Chromium、クラウドのブラウザ、`/browser connect` でつないだブラウザのどれでもです。
`browser_cdp` と `browser_dialog` は、CDP の接続先が設定されているあいだだけ渡されます
（`/browser connect`、`BROWSER_CDP_URL`、`browser.cdp_url`）。働く相手はそのブラウザで、
立ち上げた手元のセッションやクラウドのセッションには付いてきません。

### `browser_cdp` {#browsercdp}

Chrome DevTools Protocol をそのまま通す道で、1回限りの操作のための逃げ道です。
その場のダイアログの処理、iframe に閉じた評価、Cookie や通信の
制御、そのほかエージェントに必要などの CDP の命令にも使えます。（`browser_exec` の中では、`cdp()`
の手助け関数が、何段階にもわたる作業のために同じことを受け持ちます。）

**CDP のメソッド一覧:** https://chromedevtools.github.io/devtools-protocol/ — エージェントは特定のメソッドのページを `web_extract` して、引数と返りの形を調べられます。

よくある形です。

```
# List tabs (browser-level, no target_id)
browser_cdp(method="Target.getTargets")

# Handle a native JS dialog on a tab
browser_cdp(method="Page.handleJavaScriptDialog",
            params={"accept": true, "promptText": ""},
            target_id="<tabId>")

# Evaluate JS in a specific tab
browser_cdp(method="Runtime.evaluate",
            params={"expression": "document.title", "returnByValue": true},
            target_id="<tabId>")

# Get all cookies
browser_cdp(method="Network.getAllCookies")
```

ブラウザ全体のメソッド（`Target.*`、`Browser.*`、`Storage.*`）に `target_id` は要りません。ページごとのメソッド（`Page.*`、`Runtime.*`、`DOM.*`、`Emulation.*`）には、`Target.getTargets` から取った `target_id` が要ります。呼び出しはそれぞれ状態を持たず独立していて、セッションは呼び出しのあいだに残りません。

**オリジンをまたぐ iframe:** 別プロセスで動く（オリジンをまたぐ）iframe の `frame_id` を渡すと、その iframe に対する CDP の監督役の生きたセッションを通して呼び出しが回されます。Browserbase でオリジンをまたぐ iframe の中の `Runtime.evaluate` が動くのはこの仕組みのおかげで、状態を持たない CDP の接続では署名付き URL の期限切れに当たってしまいます。同じオリジンの iframe に `frame_id` は要りません。代わりに、いちばん上での `Runtime.evaluate` から `document.querySelector('iframe').contentDocument` を使ってください。

### `browser_dialog` {#browserdialog}

その場の JS のダイアログ（`alert` ／ `confirm` ／ `prompt` ／ `beforeunload`）に応えます。開いているダイアログはページの JavaScript の流れを止めるので、そのページでのブラウザの作業は、ダイアログに応えるまで止まったままになります。

残り続ける **CDP の監督役** — 仕事ごとに1つの WebSocket が Page／Runtime／Target の出来事を購読しています — が、ダイアログが開いたそばから見つけます。エージェントは `browser_dialog(action="accept")` か `browser_dialog(action="dismiss")` で応えます。`prompt()` のダイアログには `prompt_text="..."` を渡し、ダイアログが2つ以上待っているときは `dialog_id` を渡して1つを選びます。そうするとページの JS の流れが動き出します。

**Browserbase での仕組み。** Browserbase の CDP の中継は、本物のその場のダイアログをサーバー側で 10 ミリ秒ほどのうちに自動で閉じてしまうので、`Page.handleJavaScriptDialog` は使えません。監督役は `Page.addScriptToEvaluateOnNewDocument` で小さなスクリプトを差し込み、`window.alert`/`confirm`/`prompt` を同期の XHR で置き換えます。その XHR を `Fetch.enable` で横取りし、エージェントの答えとともに `Fetch.fulfillRequest` を呼ぶまで、ページの JS の流れは XHR の上で止まったままになります。`prompt()` の戻り値は、そのままの形でページの JS へ返っていきます。

**ダイアログの方針**は、`config.yaml` の `browser.dialog_policy` で設定します。

| 方針 | ふるまい |
|--------|----------|
| `must_respond`（既定） | ダイアログを捕まえ、はっきりした `browser_dialog()` の呼び出しを待ちます。`browser.dialog_timeout_s`（既定は 300 秒）が過ぎたら安全のために自動で閉じるので、不具合のあるエージェントが永久に止まってしまうことはありません。 |
| `auto_dismiss` | 捕まえて、すぐ閉じます。エージェントは何もしなくてかまいません。 |
| `auto_accept` | 捕まえて、すぐ受け入れます。しつこい `beforeunload` の確認が出るページを渡り歩くときに便利です。 |

### `browser_vault` {#browservault}

保存したログイン、パスワード、カード、住所、ワンタイムコードを、
秘密を会話に一度も出さずに今のページで使います。エージェントは
`browser_vault(action="list")` を呼んで保存した項目をハンドル（値そのものではなく参照用の名前）として確認してから、`fill`、
`save_login`、`enter_code`、`unlock`（1Password / Bitwarden）を使います。ページのオリジンが
保存した項目と合わなければ、入力は断られます。準備、パスワードマネージャーの
裏方、画面なしでの使い方は
[認証情報の保管庫](/hermes/docs/user-guide/features/credential-vault/)のページを見てください。

## ブラウザを使わないようにする {#turning-browsing-off}

ブラウザを止める設定の切り替えはありません。代わりに `browser` の道具一式を無効にしてください。
`hermes tools` を実行して、ブラウザを使わせたくないプラットフォームで **Browser Automation** の
チェックを外すか、スクリプトから次のようにします。

```bash
hermes tools disable browser                      # CLI
hermes tools disable browser --platform telegram  # one gateway platform
```

`terminal` の道具一式がないセッションからは、`browser_exec` も消えます。

## Camofox {#camofox}

Camofox はプラグインに移りました: `hermes plugins install camofox`。すでにある Camofox の
設定（`CAMOFOX_URL` が設定されている、または `browser.cloud_provider: camofox`）は、更新のときに
自動で移されます。プラグインが入り、そのプロファイルでは本体の `browser` の道具一式が無効になります。
`browser` をどこでも無効にしていたプロファイル（`agent.disabled_toolsets`）では `camofox` も
無効になるので、ブラウザは使わないままです。
`CAMOFOX_URL` のない `browser.camofox` の節は、Camofox の設定とは見なされません。更新のあとで
プラグインを設定したプロファイルでは、`browser_exec` もそのまま並んで使えます。

## 実際の例 {#practical-examples}

### ウェブのフォームを埋める {#filling-out-a-web-form}

```
User: Sign up for an account on example.com with my email john@example.com

Agent: browser_exec(code="""
# Opening the signup form
new_tab("https://example.com/signup")
wait_for_load()
fill_input("input[name=email]", "john@example.com")
js("document.querySelector('button[type=submit]').click()")
wait_for_load()
print(page_info())
""")
```

パスワードについては、エージェントは秘密を自分で打ち込まず、`browser_vault` を使います（`save_login` が
伏せ字の欄でこちらに入力を求めます）。

### 動きのある中身を調べる {#researching-dynamic-content}

```
User: What are the top trending repos on GitHub right now?

Agent: browser_exec(code="""
# Reading GitHub trending
new_tab("https://github.com/trending")
wait_for_load()
print(js("[...document.querySelectorAll('article h2 a')].map(a => a.textContent.replace(/\\s+/g, ' ').trim())"))
""")
```

## できないこと {#limitations}

- **セッションの期限** — クラウドのセッションは、お使いのプロバイダのプランの設定に従って切れます。
- **費用** — クラウドのセッションはプロバイダの残高を使います。会話が終わったとき、あるいは動きがなくなったときにセッションは片づけられます。手元の Chromium と `/browser connect` は無料です。
- **Lightpanda** — スクリーンショットは撮れず、セッションごとにページは1つだけです。
- **端末がなければブラウザもなし** — `browser_exec` は Python を動かすので、`terminal` の道具一式がないセッションには渡されません。
