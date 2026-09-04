---
title: "ブラウザの自動操作"
description: "いくつものプロバイダ、CDP でつなぐ手元の Chromium 系ブラウザ、あるいはクラウドのブラウザでブラウザを操り、ウェブとのやり取り、フォームの入力、情報の取り出しなどを行います。"
upstream_path: user-guide/features/browser.md
upstream_blob: 0a5dbf5bb55018bc0d7f88fdfc86554ce67170d9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/browser
---

# ブラウザの自動操作 {#browser-automation}

Hermes Agent には、いくつもの裏方を選べるブラウザ自動操作の道具一式が入っています。

- **Browser Use のクラウドモード** — [Browser Use](https://browser-use.com) を通じて、隠密性、住宅用のプロキシ、CAPTCHA の突破、使い回せるブラウザのプロファイルを備えた、お任せの Chromium を使います
- **Browserbase のクラウドモード** — [Browserbase](https://browserbase.com) を通じて、bot 対策への備えを持つもう1つのクラウドブラウザのプロバイダを使います
- **Browser Use モード** — [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) を通じて。手元の Chrome と Browser Use のクラウドブラウザに対する既定のブラウザドライバです
- **Firecrawl のクラウドモード** — [Firecrawl](https://firecrawl.dev) を通じて、情報の取り出しが組み込まれたクラウドのブラウザを使います
- **Camofox のローカルモード** — [Camofox](https://github.com/jo-inc/camofox-browser) を通じて、手元で検知を避けながら見て回ります（Firefox をもとにした指紋のごまかし）
- **Lightpanda のローカルエンジン** — [Lightpanda](https://lightpanda.io) を通じて。機械のために Zig で一から書かれた画面なしのブラウザで、すぐ立ち上がり、Chrome より 16 倍メモリが少なく 9 倍速く動きます。Browser Use モードで動き（Hermes が起動するので Chromium も Node も要りません）、組み込みの道具でも動きます（まだ対応していない操作は自動で Chrome に回されます）
- **手元の Chromium 系への CDP 接続** — `/browser connect` を使って、自分の Chrome、Brave、Chromium、Edge にブラウザの道具をつなぎます
- **ローカルブラウザモード** — `agent-browser` の CLI と、手元に入れた Chromium を使います

どのモードでも、エージェントはサイトを見て回り、ページの要素を操作し、フォームを埋め、情報を取り出せます。

## 概要 {#overview}

ページは**アクセシビリティツリー**（文字での写し取り）として表されるので、LLM のエージェントにはうってつけです。操作できる要素には（`@e1`、`@e2` のような）参照の ID が付き、エージェントはこれを使ってクリックしたり入力したりします。

主なできること。

- **いくつものプロバイダでのクラウド実行** — Browser Use、Browserbase、Firecrawl。手元のブラウザは要りません
- **手元の Chromium 系との連携** — 動いている自分の Chrome、Brave、Chromium、Edge に CDP でつなぎ、自分の手で見て回れます
- **クラウドでの bot 対策** — Browser Use Cloud には隠密性、住宅用のプロキシ、CAPTCHA の突破が入っています
- **クラウドに残るプロファイル** — Browser Use Cloud なら、Cookie、localStorage、保存したパスワードをセッションをまたいで使い回せます
- **セッションの隔離** — 仕事ごとに専用のブラウザのセッションが割り当てられます
- **自動での片づけ** — 動きのないセッションは時間が経つと閉じられます
- **見た目の解析** — スクリーンショットと AI の解析で、目で見た内容を理解します

## 準備 {#setup}

:::tip Nous の購読者へ
有料の [Nous Portal](https://portal.nousresearch.com) の購読があるなら、別途 API キーを用意しなくても **[ツールゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)** 経由でブラウザの自動操作を使えます。新しく入れる場合は `hermes setup --portal` でログインすれば、ゲートウェイの道具を一度に全部有効にできます。すでに入れてある場合は、`hermes model` か `hermes tools` でブラウザのプロバイダとして **Nous Subscription** を選んでください。
:::

### Browser Use のクラウドモード {#browser-use-cloud-mode}

Browser Use をクラウドブラウザのプロバイダとして使うには、次を足します。

```bash
# Add to ~/.hermes/.env
BROWSER_USE_API_KEY=***
```

API キーは [browser-use.com](https://browser-use.com) で取れます。

Browser Use Cloud は、[隠密性](https://docs.browser-use.com/cloud/browser/stealth)と[住宅用のプロキシ](https://docs.browser-use.com/cloud/browser/proxies)を既定で有効にしたお任せの Chromium を動かし、CAPTCHA の突破も備え、Cookie・localStorage・保存したパスワードのための[残るプロファイル](https://docs.browser-use.com/cloud/guides/authentication)にも対応しています。

### Browserbase のクラウドモード {#browserbase-cloud-mode}

Browserbase にお任せするクラウドのブラウザを使うには、次を足します。

```bash
# Add to ~/.hermes/.env
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=your-project-id-here
```

資格情報は [browserbase.com](https://browserbase.com) で取れます。

:::note プロバイダの選び方
上の `.env` の鍵が渡すのは**資格情報だけ**です。どのクラウドブラウザを使うかは、`hermes tools` → Browser Automation が書き込む `browser.cloud_provider` の選択で決まります（`browserbase`、`browser-use`、`camofox`、あるいは Nous Subscription なら `nous`）。いったん選択があると、鍵を足したり消したりしてもプロバイダは切り替わりません。選ばれているプロバイダの鍵が欠けているときは、黙って別の経路に回すのではなく、`hermes tools` を実行するよう案内してエラーになります。一度も設定したことのない状態なら、今ある資格情報から自動で見つけます。
:::

### Browser Use モード（既定） {#browser-use-mode-default}

Browser Use モードは、組み込みのブラウザの道具の代わりに [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) を使います。エージェントはブラウザの中で Python を書いて動かし、クリック、入力、ドラッグ、情報の取り出し、ページとのやり取りをします。

**これが既定のブラウザモードです。** `browser.backend` が設定されておらず、`browser-use` の CLI が動かせる（入っているか、`uvx` から使える）とき、エージェントには `browser_exec` という道具が1つ渡されます。CLI が動かせないときは、Hermes が自動で組み込みのブラウザの道具に戻します。

このモードは**ドライバ**で、設定したブラウザの裏方と組み合わせて動きます。Hermes 自身の画面なしの Chromium、Nous の購読で使えるクラウドのブラウザ、Browserbase、Firecrawl、Browser Use のクラウドブラウザ — `hermes tools` → Browser Automation で選んだブラウザの出どころなら、どれでも動かします。唯一の例外は Camofox で、こちらは仕組みがつなぎに行ける CDP の口を持ちません。Camofox の設定では、自動的に組み込みのブラウザの道具のままになります。

**手元で見て回るときに使うのは同梱の Chromium で、こちらの Chrome ではありません。** クラウドのプロバイダも `/browser connect` の接続先も設定していないときは、Hermes は組み込みの道具が使うのと同じ Chromium を立ち上げ（`hermes tools` → Browser Automation で入れて、agent-browser 経由で動かします）、そこへ Browser Use の CLI を向けます。入れてある Chrome に手が触れることはないので、`chrome://inspect` でリモートデバッグを有効にする必要も、「リモートデバッグを許可しますか」の確認が出ることもありません。Chrome がまったく入っていない画面なしの機械でも動きます。このブラウザは組み込みの一式と寿命を共にし、`browser.inactivity_timeout` の時間が過ぎたとき、終了するとき、迷子の掃除のときに閉じられます。自分がログイン済みのブラウザを動かしたいときは、`/browser connect` か[本物のプロファイルの切り替え](#real-profile-browsing-use-your-own-logins)を使ってください。

**同時に走るセッション:** `browser_exec` は `session=<name>` という引数を受け取り、どの裏方でも名前ごとにブラウザの作業を切り分けます。名前ごとに専用の仕組みの常駐（専用の IPC ソケット、ログ、状態）が付き、専用のブラウザも付きます（手元では別々の同梱 Chromium、クラウドの裏方では別々のクラウドブラウザ）。並列のサブエージェントや同時のチャットが、1つの共有された接続を奪い合うことはもうありません。`session` を省くと共有の既定の常駐を使います。1つずつ見て回るならこれで十分です。

これをやめて組み込みのブラウザの道具を強いるには、`/browser use off` を使うか、次のようにします。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  backend: "off"
```

（`backend: "browser-use"` は、モードをはっきり強いる指定として今も有効です。）

Browser Use 自身のクラウドブラウザには `browser-use auth login` か `BROWSER_USE_API_KEY` が要ります。ほかのブラウザの出どころは、今ある資格情報をそのまま使います。

:::note
Browser Use モードはモデルが書いた Python を手元の機械で動かすので、`browser_exec` の道具は端末も使えるセッションにだけ渡されます。端末の道具一式なしで設定された場（たとえば締めたメッセージの窓口）では、既定のブラウザの道具のままになります。
:::

### Firecrawl のクラウドモード {#firecrawl-cloud-mode}

Firecrawl をクラウドブラウザのプロバイダとして使うには、次を足します。

```bash
# Add to ~/.hermes/.env
FIRECRAWL_API_KEY=fc-***
```

API キーは [firecrawl.dev](https://firecrawl.dev) で取れます。そのうえで、Firecrawl をブラウザのプロバイダに選びます。

```bash
hermes setup tools
# → Browser Automation → Firecrawl
```

任意の設定です。

```bash
# Self-hosted Firecrawl instance (default: https://api.firecrawl.dev)
FIRECRAWL_API_URL=http://localhost:3002

# Session TTL in seconds (default: 300)
FIRECRAWL_BROWSER_TTL=600
```

### 混ぜて振り分ける: 公開の URL はクラウド、LAN や localhost は手元 {#hybrid-routing-cloud-for-public-urls-local-for-lanlocalhost}

クラウドのプロバイダが設定されていると、Hermes は私設・ループバック・LAN のアドレス（`localhost`、`127.0.0.1`、`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`*.local`、`*.lan`、`*.internal`、IPv6 のループバック `::1`、リンクローカルの `169.254.x.x`）に解決される URL のために、**手元の Chromium の脇役**を自動で立ち上げます。公開の URL は同じ会話の中でクラウドのプロバイダを使い続けます。

これで「手元で開発しているのに Browserbase を使っている」というよくある流れが解けます。プロバイダを切り替えたり SSRF の守りを外したりしなくても、エージェントは `http://localhost:3000` のダッシュボードのスクリーンショットを撮り、同時に `https://github.com` から情報を取り出せます。クラウドのプロバイダが私設の URL を目にすることはありません。

この働きは**既定で有効**です。止めたい（これまでどおり、すべての URL を設定したクラウドのプロバイダに回したい）ときは、こうします。

```yaml
# ~/.hermes/config.yaml
browser:
  cloud_provider: browserbase
  auto_local_for_private_urls: false
```

自動の振り分けを止めると、`browser.allow_private_urls: true` も設定していない限り、私設の URL は `"Blocked: URL targets a private or internal address"` と言って断られます（この設定を入れるとクラウドのプロバイダが試みますが、Browserbase などはこちらの LAN に届かないので、たいていうまくいきません）。

必要なもの。手元の脇役は純粋なローカルモードと同じ `agent-browser` の CLI を使うので、これが入っている必要があります（`hermes setup tools → Browser Automation` が自動で入れます）。公開の URL から私設のアドレスへ、ページを開いたあとに転送されるものは今も止められます（内部への転送という抜け道で、公開の経路からこちらの LAN に届くことはできません）。

### 本物のプロファイルで見て回る（自分のログインを使う） {#real-profile-browsing-use-your-own-logins}

既定では、手元で見て回るときはまっさらな使い捨てのプロファイルが使われ、エージェントはどこにもログインしていません。**本物のプロファイルで見て回る**を有効にすると、エージェントは今あるログインと Cookie を持って*こちら自身*として見て回れます。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
```

有効にすると Hermes は、既定のブラウザで**実際に使っている**プロファイル（`Local State → profile.last_used` のもの）を、その Cookie、保存したログイン、設定ごと `~/.hermes/browser-profile/<browser>/` の管理下の写しにコピーし、その写しの上で**本物のブラウザの実行ファイル**を起動して、閲覧のエンジンをそこにつなぎます。（作り物の鍵束の指定を付けた同梱の Chromium ではなく）本物の実行ファイルを起動するのは、OS が暗号化した Cookie を読めるままにしておくためです。macOS では Chrome の Cookie は Keychain を通して暗号化されており、作り物の鍵束で起動すると Cookie が黙って1つ残らず落ち、ログアウトした状態で開いてしまいます。動いているブラウザのプロファイルが**直接開かれることはありません**。写しは別のディレクトリなので、動いているブラウザとプロファイルの錠を奪い合うこともなく、Chrome 136 以降が既定のプロファイルのディレクトリへのリモートデバッグを塞いでいることも避けられます。認証まわりのファイル（Cookie／ログイン／設定）は、新しいセッションが立ち上がるたびに本物のプロファイルから取り直されるので、自分のブラウザでしたログインがエージェントのセッションにも現れます。コピーされるのは実際に使っているプロファイルだけで、ほかの Chrome のプロファイルが写し取られることはありません。

写しのブラウザは**画面なし**で動きます。見えている窓もなく、焦点を奪うこともなく、裏でこちらのプロファイルを動かすので、エージェントが代わりに投稿したりフォームを埋めたり情報を取り出したりしているあいだも、こちらは仕事を続けられます。（ここでの画面なしは Chrome の*新しい*画面なしモードで、普段の Cookie の置き場を読むので、ログインはちゃんと読み込まれます。）働くさまを見ていたいなら、同じ[画面ありモード](#headed-mode-visible-browser-window)の切り替えがここにも効きます。`browser.headed: true`（あるいは `AGENT_BROWSER_HEADED=1`）で、本物のプロファイルの閲覧にも見える窓が開きます。画面のない機械（サーバー、CI）では、設定にかかわらず常に画面なしで動きます。

ブラウザにプロファイルがいくつもあり（たとえば仕事用と個人用）、「最後に触ったほうのプロファイル」でエージェントの身元が決まってしまうのが困るなら、写しの出どころをはっきり留めてください。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
  real_profile_pin: "Profile 2"   # directory name under the browser's user-data dir
```

存在しないプロファイルのディレクトリを指す留め方をすると、直し方の分かるメッセージを出して安全側で止まります。黙って最後に使ったプロファイルに落ちることはありません。

この切り替えを戻すと、Hermes は次にブラウザを使うときに写しの置き場（`~/.hermes/browser-profile/`）を消します。同意を取り下げたあとに、コピーした資格情報が居座らないようにするためです。

:::note Windows では、ブラウザを完全に閉じてください
Windows では、動いている Chrome／Edge／Brave が Cookie とログインのデータベースを排他（すべて拒否）の錠で握るので、ブラウザが開いているあいだ Hermes はそれをコピーできません。固まったりログアウト状態のセッションを作ったりする代わりに、「ブラウザを完全に終了して、もう一度やってください」というメッセージを出してすぐ止まります。そのため Windows で本物のプロファイルを使うには、ブラウザを**完全に終了**する必要があります。裏や通知領域に残っているものも含めてです（Chrome の「閉じたあともバックグラウンドアプリの処理を続行する」を有効にしていると、窓を閉じたあとも `chrome.exe` が生き続けます）。macOS と Linux は、ブラウザが動いているあいだでもプロファイルをコピーできます。

`browser.real_profile_autoclose: true` を設定すると、プロファイルを握っているブラウザを **Hermes が閉じましょうかと申し出る**ようになります。これを入れていても、Hermes が勝手に閉じることは決してありません。プロファイルに錠がかかっていれば必ず止まり、エージェントがまずこちらに尋ねます。こちらが承認したときにだけ `hermes browser close-profile` を実行し（そのプロファイルにつながるブラウザのプロセスの一群を終わらせます。保存していないタブは失われます）、そのうえでやり直します。そのあともまだ錠がかかっていれば（たとえば裏や通知領域のものが再び立ち上がったなら）、Hermes は止まったまま、ブラウザを完全に終了するよう伝えます。自分で繰り返したり、もう一度終わらせに行ったりはしません。
:::

- **対応しているブラウザ:** Chrome、Edge、Brave、Brave Origin、Chromium（OS の既定になっているもの）。Chromium 系でないもの（たとえば Firefox）が既定のときは、当て推量をせず、はっきりしたメッセージを出して安全側で止まります。
- **どの裏方でも動きます。** 手元の裏方では、切り替えを入れれば自動で効きます。**クラウド**のブラウザの裏方でも、エージェントは `browser_exec` の道具の `local` という引数で、必要なときに本物のプロファイルの手元のセッションを開けます（この切り替えが入っているときだけ、道具はその引数を見せます）。ほかはすべてクラウドの裏方が受け持ち続けます。
- **安全の位置づけ:** これは同意を前提にした便利さであって、隔離の境目ではありません。エージェントが開いたページは、こちらの本物のログインとともに動きます。エージェントに自分として振る舞ってほしいときにだけ有効にしてください。既定では無効です。
- **デスクトップ:** **Capabilities → Tools → Browser → Use My Real Browser Profile**（切り替えは裏方の選択肢の上にあります）か、Settings → Config の `browser` の節で切り替えます。

### Camofox のローカルモード {#camofox-local-mode}

[Camofox](https://github.com/jo-inc/camofox-browser) は、Camoufox（C++ で指紋をごまかす Firefox の派生）を包んだ、自分で立てる Node.js のサーバーです。クラウドに頼らず、手元で検知を避けながら見て回れます。

```bash
# Clone the Camofox browser server first
git clone https://github.com/jo-inc/camofox-browser
cd camofox-browser

# Build and start with Docker using the default container settings
# (auto-detects arch: aarch64 on M1/M2, x86_64 on Intel)
make up

# Stop and remove the default container
make down

# Force a clean rebuild (for example, after upgrading VERSION/RELEASE)
make reset

# Just download binaries without building
make fetch

# Override arch or version explicitly
make up ARCH=x86_64
make up VERSION=135.0.1 RELEASE=beta.24
```

`make up` は既定のコンテナをすぐ立ち上げます。Node のヒープを大きくする、VNC を使う、プロファイルのディレクトリを残す、といった実行時の設定を自分で決めたいなら、先にイメージを作ってから自分で走らせてください。

```bash
# Build the image without starting the default container
make build

# Start with persistence, VNC live view, and a larger Node heap
mkdir -p ~/.camofox-docker
docker run -d \
  --name camofox-browser \
  --restart unless-stopped \
  -p 9377:9377 \
  -p 6080:6080 \
  -p 5901:5900 \
  -e CAMOFOX_PORT=9377 \
  -e ENABLE_VNC=1 \
  -e VNC_BIND=0.0.0.0 \
  -e VNC_RESOLUTION=1920x1080 \
  -e MAX_OLD_SPACE_SIZE=2048 \
  -v ~/.camofox-docker:/root/.camofox \
  camofox-browser:135.0.1-aarch64
```

VNC を有効にすると、ブラウザは画面ありで動き、`http://localhost:6080`（noVNC）でその様子をこちらのブラウザから生で見られます。native の VNC クライアントを `localhost:5901` につなぐこともできます。

すでに `make up` を実行しているなら、自分で決めた設定のものを立ち上げる前に、既定のコンテナを止めて消してください。

```bash
make down
# then run the custom docker run command above
```

そのうえで `~/.hermes/.env` に設定します。

```bash
CAMOFOX_URL=http://localhost:9377
```

Camofox を Docker で動かしていて、ホストの機械が出しているウェブアプリを開かせたいなら、ループバックの書き換えを有効にしてください。`CAMOFOX_URL` はホスト側で公開している制御 API を指したままにしますが、`http://127.0.0.1:3000` のようなページの URL は、コンテナの中からは `http://host.docker.internal:3000` として開く必要があります。

```yaml
# ~/.hermes/config.yaml
browser:
  camofox:
    rewrite_loopback_urls: true
    loopback_host_alias: host.docker.internal  # default; use a LAN IP if needed
```

同じことをする環境変数です。

```bash
CAMOFOX_REWRITE_LOOPBACK_URLS=true
CAMOFOX_LOOPBACK_HOST_ALIAS=host.docker.internal
```

書き換えが効くのは、ループバックのホスト（`localhost`、`127.0.0.1`、`::1`）を持つページ移動の URL だけです。`CAMOFOX_URL` は変えません。Docker を使わない Camofox の導入では、ブラウザがすでにホストの上で動いていてループバックの URL がそのまま正しいので、無効のままにしてください。

あるいは `hermes tools` → Browser Automation → Camofox から設定します。

Camofox は、ほかのブラウザの裏方と同じように選びます。`hermes tools` → Browser Automation で **Camofox** を選ぶと、`config.yaml` に `browser.cloud_provider: camofox` が書き込まれます。`CAMOFOX_URL` はサーバーの場所を示すだけで、ブラウザの選択がいったんあると、これを設定しただけでは裏方は選ばれません（一度も設定したことのない状態なら、今も自動で見つけます）。

#### 残り続けるブラウザのセッション {#persistent-browser-sessions}

既定では、Camofox のセッションごとに身元が無作為に決まるので、Cookie とログインはエージェントの再起動を越えて残りません。セッションが残るようにするには、`~/.hermes/config.yaml` に次を足します。

```yaml
browser:
  camofox:
    managed_persistence: true
```

そのうえで、新しい設定が読み込まれるように Hermes を完全に再起動してください。

:::warning 入れ子の位置が大事です
Hermes が読むのは `browser.camofox.managed_persistence` であって、いちばん上の `managed_persistence` では**ありません**。よくある間違いはこう書いてしまうことです。

```yaml
# ❌ Wrong — Hermes ignores this
managed_persistence: true
```

旗を間違った位置に置くと、Hermes は黙って無作為で使い捨ての `userId` に落ち、ログインの状態はセッションのたびに失われます。
:::

##### Hermes がすること
- プロファイルごとに決まる `userId` を Camofox に送り、サーバーがセッションをまたいで同じ Firefox のプロファイルを使い回せるようにします。
- 片づけのときにサーバー側の文脈の破棄を飛ばすので、Cookie とログインがエージェントの仕事のあいだで生き残ります。
- `userId` を動いている Hermes のプロファイルの範囲に閉じるので、Hermes のプロファイルが違えばブラウザのプロファイルも違います（プロファイルの隔離）。

##### Hermes がしないこと
- Camofox のサーバーに残ることを強いはしません。Hermes は変わらない `userId` を送るだけで、サーバー側がその `userId` を残るタイプの Firefox のプロファイルのディレクトリに結びつけて応えなければなりません。
- お使いの Camofox サーバーのビルドが、どの求めも使い捨てとして扱う（たとえば、保存したプロファイルを読まずに常に `browser.newContext()` を呼ぶ）なら、Hermes にはそのセッションを残らせることはできません。userId をもとにしたプロファイルの保持を実装した Camofox のビルドを動かしているか確かめてください。

##### 効いているか確かめる

1. Hermes と Camofox のサーバーを立ち上げます。
2. ブラウザの仕事で Google（かログインのあるサイト）を開き、手でサインインします。
3. ブラウザの仕事を普通に終えます。
4. 新しいブラウザの仕事を始めます。
5. 同じサイトをもう一度開きます。サインインしたままのはずです。

5 でログアウトしていたら、Camofox のサーバーが変わらない `userId` に応えていません。設定の位置をもう一度確かめ、`config.yaml` を直したあとに Hermes を完全に再起動したか確かめ、Camofox のサーバーの版がユーザーごとの残るプロファイルに対応しているか確かめてください。

##### 状態の置き場

Hermes は、変わらない `userId` を、プロファイルごとのディレクトリ `~/.hermes/browser_auth/camofox/`（既定でないプロファイルなら `$HERMES_HOME` の下の同じもの）から作ります。実際のブラウザのプロファイルのデータは Camofox のサーバー側に、その `userId` を鍵として置かれます。残るプロファイルを完全に消すには、Camofox のサーバー側で消したうえで、対応する Hermes のプロファイルの状態のディレクトリも消してください。

#### 外で管理される Camofox のセッション {#externally-managed-camofox-sessions}

別のアプリ（デスクトップの助手、独自の連携、別のエージェント）が、見えている Camofox のブラウザを動かしているときは、Hermes が自前の隔離されたプロファイルを立てるのではなく、同じ身元の中で動くように設定します。

ふるまいを決めるつまみが3つあります。

| 設定 | 環境変数 | 効き方 |
|---------|---------|--------|
| `browser.camofox.user_id` | `CAMOFOX_USER_ID` | タブを作るときに Hermes が使う Camofox の `userId`。これを設定すると、そのセッションは「外で管理される」モードに入ります。 |
| `browser.camofox.session_key` | `CAMOFOX_SESSION_KEY` | タブを作るときに送る `sessionKey`（別名 `listItemId`）。引き継ぎのときに既存のタブと突き合わせるのに使います。設定しなければ仕事ごとの値になります。 |
| `browser.camofox.adopt_existing_tab` | `CAMOFOX_ADOPT_EXISTING_TAB` | true にすると、Hermes は最初に使うときに `GET /tabs?userId=<user_id>` を呼び、新しく作る前に既存のタブを使い回します。 |

環境変数は `config.yaml` より優先されます。どちらの書き方でも動きます。

```yaml
browser:
  camofox:
    user_id: shared-camofox
    session_key: visible-tab
    adopt_existing_tab: true
```

```bash
CAMOFOX_USER_ID=shared-camofox
CAMOFOX_SESSION_KEY=visible-tab
CAMOFOX_ADOPT_EXISTING_TAB=true
```

**`user_id` を設定すると変わること:**

- Hermes は仕事の終わりに壊す片づけをしません（`managed_persistence: true` と同じです）。別のアプリのタブ・Cookie・プロファイルは生き残ります。
- Hermes は `DELETE /sessions/<user_id>` を呼び**ません**。この口はユーザーのデータをすべて消し去るので、発火すれば外のアプリのセッションまで吹き飛ばしてしまいます。

**タブの引き継ぎの仕組み（`adopt_existing_tab: true` のとき）:**

1. プロセスが立ち上がってから最初のブラウザの道具の呼び出しで、Hermes は `GET /tabs?userId=<user_id>` を投げます（制限時間は5秒）。
2. 返ってきたタブのどれかが `listItemId == session_key` なら、Hermes はその組の中でいちばん新しく作られたものを引き継ぎます。
3. そうでなければ、そのユーザーのいちばん新しく作られたタブを引き継ぎます（`listItemId` は問いません）。
4. タブが1つもないか、求めが失敗したときは、Hermes は次の操作で新しいタブを作るほうに落ちます。

引き継ぎが起きるのは、そのセッションの `tab_id` が埋まるまでです。外のアプリが途中で引き継いだタブを閉じると、次のブラウザの道具の呼び出しで Camofox のエラーが表に出ます。Hermes は呼び出しのたびに新しいタブを探し直すことはしません。

**`session_key` の決め方:** *特定の*既存のタブに確実につながせたいなら、外のアプリがそれを作ったときに使った `listItemId` を `session_key` に設定してください。`session_key` を設定せず `user_id` だけを設定した場合、Hermes は仕事ごとの `session_key`（`task_<id>`）を作ります。Cookie とプロファイルは外のアプリと共有しますが、既存のものを使い回さず、隣に自分のタブを開きます。

**同時に動かすときの注意:** 外のアプリと Hermes は同じ Camofox の `userId` を同時に動かせますが、Camofox はクライアントのあいだでタブごとの焦点を調整しません。どちらが持ち主かはアプリの側で決めてください（たとえば、Hermes が動くあいだは外のアプリを止める、など）。

#### VNC での生の眺め {#vnc-live-view}

Camofox が画面ありで（見えるブラウザの窓を出して）動いているとき、Camofox は健全性の確認の返事に VNC のポートを載せます。Hermes はこれを自動で見つけ、ページ移動の返事に VNC の URL を含めるので、エージェントはブラウザの様子を生で見るための繋ぎ先を伝えられます。

### Lightpanda のローカルエンジン {#lightpanda-local-engine}

[Lightpanda](https://lightpanda.io) は、一から書かれた公開の画面なしブラウザです。すぐ立ち上がり、Chrome より 9 倍速く動き、メモリは 16 分の1で済みます。小さな仮想機械の上で長く生き続けるエージェントには、これが効いてきます。

Lightpanda は（「ローカルブラウザ」と同じ、ブラウザの出どころという意味での）**ローカルエンジン**で、クラウドのプロバイダではありません。実行ファイルを入れて `PATH` に置き（[Lightpanda の導入の手引き](https://lightpanda.io/docs/run-locally/installation/one-liner)を見てください）、`hermes tools` → Browser Automation で **Lightpanda** を選ぶか、次のように設定します。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  cloud_provider: local
  engine: lightpanda
```

環境変数でもできます。

```bash
AGENT_BROWSER_ENGINE=lightpanda
```

このエンジンは、2つのブラウザのドライバのどちらでも動きます。

- **Browser Use モード（既定）。** Hermes が自分で `lightpanda serve --host 127.0.0.1 --port <free>` を立ち上げ（`browser_exec` のセッションの名前ごと、あるいは仕事ごとに1つのプロセス）、Browser Use の CLI をそこに向けます。Chromium も Playwright も Node.js も要りません。プロセスは `browser.inactivity_timeout` のあと、終了時、そして Hermes が落ちたときは迷子の掃除によって片づけられます。これらのプロセスはすべて `$HERMES_HOME/cache/browser-use/lightpanda/http-cache` にある1つのディスク上の HTTP のキャッシュを共有するので、同じところをもう一度訪ねるときは素材の読み直しを省けます。Hermes がキャッシュの指定を渡すのは、入っている Lightpanda がそれに対応しているとき（0.3.x 以降）だけで、古い実行ファイルは単にキャッシュなしで動きます。消したいときは、まず Lightpanda のセッションを止めてから、そのディレクトリを消してください。Lightpanda には絵を描く部分がないので `capture_screenshot()` は使えず、道具の説明はモデルに文字を先に使うよう伝えます。またセッションごとにページを1つしか持てないので、モデルには `new_tab()` を一度だけ呼び、そのあとは `goto_url()` を使うよう伝えます（上流では [lightpanda-io/browser#1962](https://github.com/lightpanda-io/browser/issues/1962) で追われています）。
- **組み込みのブラウザの道具**（`/browser use off`）。Hermes は手元の Chrome を動かすのと同じように、`agent-browser --engine lightpanda` を通して CDP で Lightpanda を動かします。ここには**自動での Chrome への切り替え**が付きます。Lightpanda は対応している操作（移動、写し取り、クリック、入力、スクロール、戻る、キー押下、評価）を受け持ち、対応していないものは Hermes が黙って Chrome でやり直します。スクリーンショットと `browser_vision` は、そのまま Chrome に回されます。

**エンジンが無視されるとき。** `browser.engine` はブラウザの設定の中でいちばん優先度が低いものです。クラウドのプロバイダ（Nous の購読のブラウザも含みます。また一度も設定したことのない状態では、`~/.hermes/.env` にある `BROWSERBASE_API_KEY` や `BROWSER_USE_API_KEY` が自動で1つ選ばれます）、Camofox、`browser.cdp_url` や `/browser connect` による上書き、`browser.use_real_profile` は、どれもこれより優先されます。`hermes tools` で Lightpanda を選ぶと `cloud_provider: local` も書き込まれます。エンジンが設定されているのに何かに隠されているときは、`/browser status` と `hermes doctor` が、何に隠されているかも含めて教えてくれます。

### CDP で手元の Chromium 系ブラウザにつなぐ（`/browser connect`） {#local-chromium-family-browser-via-cdp-browser-connect}

クラウドのプロバイダを使う代わりに、Chrome DevTools Protocol（CDP）で、動いている自分の Chrome、Brave、Chromium、Edge に Hermes のブラウザの道具をつなげられます。エージェントの動きをその場で見たいとき、自分の Cookie やセッションが要るページを扱いたいとき、クラウドのブラウザの費用を避けたいときに役立ちます。

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

**Chrome 136 以降では、専用のプロファイルが必須になりました。** 安全を固める変更として、Chrome 136 以降は `--remote-debugging-port` が*既定の* user-data-dir と一緒に使われると、ほかに Chrome が動いていない冷えた状態からの起動であっても、黙ってリモートデバッグのポートを開きません。ブラウザは普通に立ち上がるのに 9222 番では誰も待ち受けないので、`/browser connect`（および手で打つ `curl http://127.0.0.1:9222/json/version`）は接続を断られて失敗します。エラーのメッセージは出ません。直し方はまさに上のコマンドで、既定のプロファイルのディレクトリではない場所（たとえば `$HOME/.hermes/chrome-debug`）を指す `--user-data-dir` を必ず渡すことです。これは、この変更を取り込んだ Chrome、Chromium、Edge、Brave のビルドに当てはまります。
:::

CDP でつないでいるあいだ、ブラウザの道具（`browser_navigate`、`browser_click` など）はクラウドのセッションを立ち上げる代わりに、動いているこちらのブラウザを相手に働きます。

### WSL2 と Windows の Chrome: `/browser connect` より MCP を選ぶ {#wsl2-windows-chrome-prefer-mcp-over-browser-connect}

Hermes が WSL2 の中で動いていて、操りたい Chrome の窓が Windows のホスト側で動いているとき、`/browser connect` はたいてい最良の道ではありません。

理由です。

- `/browser connect` は、Hermes 自身が使える CDP の口に届けることを前提にしています
- 今どきの Chrome の生のデバッグのセッションは、昔ながらの `9222` のポートと同じようには WSL から直接届かない、ホストの中だけの口を出すことがよくあります
- Windows の Chrome がデバッグできる状態であっても、いちばんきれいな組み合わせは、Windows 側のブラウザの MCP サーバーに Chrome をつながせ、Hermes にはその MCP サーバーと話させることであることが多いのです

その形にするなら、Hermes の MCP 対応を通して `chrome-devtools-mcp` を使ってください。

実際の手順は MCP の手引きにあります。

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/#wsl2-bridge-hermes-in-wsl-to-windows-chrome)

### ローカルブラウザモード {#local-browser-mode}

クラウドの資格情報を何も設定**せず**、`/browser connect` も使わない場合でも、Hermes は `agent-browser` が動かす手元の Chromium を通してブラウザの道具を使えます。

### 任意の環境変数 {#optional-environment-variables}

```bash
# Residential proxies for better CAPTCHA solving (default: "true")
BROWSERBASE_PROXIES=true

# Advanced stealth with custom Chromium — requires Scale Plan (default: "false")
BROWSERBASE_ADVANCED_STEALTH=false

# Session reconnection after disconnects — requires paid plan (default: "true")
BROWSERBASE_KEEP_ALIVE=true

# Custom session timeout in seconds (max 21600 = 6 hours) (default: project default)
# Examples: 600 (10min), 1800 (30min), 21600 (6h max)
BROWSERBASE_SESSION_TIMEOUT=1800

# Inactivity timeout before auto-cleanup in seconds (default: 120)
BROWSER_INACTIVITY_TIMEOUT=120

# Local browser engine. Equivalent to browser.engine in config.yaml. In
# Browser Use mode (default) "lightpanda" makes Hermes spawn `lightpanda serve`;
# with the built-in tools it is passed to agent-browser as --engine.
#   auto       — Chrome (default)
#   lightpanda — Lightpanda
#   chrome     — force Chrome explicitly
AGENT_BROWSER_ENGINE=auto

# Extra Chromium launch flags (comma- or newline-separated). Hermes auto-injects
# `--no-sandbox,--disable-dev-shm-usage` when it detects root or AppArmor-restricted
# unprivileged user namespaces (Ubuntu 23.10+, DGX Spark, many container images),
# so most users don't need to set this. Set it manually only if you need a flag
# Hermes doesn't add automatically; setting it disables the auto-injection.
AGENT_BROWSER_ARGS=--no-sandbox
```

### agent-browser CLI を入れる {#install-agent-browser-cli}

何も入れる必要はありません。`agent-browser` は、ブラウザの道具を最初に使うときに `npx agent-browser` で自動的に解決されます。npx が一度だけ取りに行く手間を避けたいなら、先に全体に入れておくこともできます（任意）。

```bash
npm install -g agent-browser
```

:::info
`browser` の道具一式が設定の `toolsets` の並びに入っているか、`hermes config set toolsets '["hermes-cli", "browser"]'` で有効にされている必要があります。
:::

## 使える道具 {#available-tools}

### `browser_navigate` {#browsernavigate}

URL へ移動します。ほかのブラウザの道具より先に呼ぶ必要があります。Browserbase のセッションを立ち上げます。

```
Navigate to https://github.com/NousResearch
```

:::tip
ちょっとした情報を取ってくるだけなら、`web_search` か `web_extract` のほうが向いています。速くて安く済みます。ブラウザの道具は、ページを**操作する**必要があるとき（ボタンを押す、フォームを埋める、動きのある中身を扱う）に使ってください。
:::

### `browser_snapshot` {#browsersnapshot}

今のページのアクセシビリティツリーを、文字での写しとして取ります。`browser_click` や `browser_type` で使うための、`@e1`、`@e2` のような参照の ID が付いた操作できる要素が返ります。

- **`full=false`**（既定）: 操作できる要素だけを見せる、詰めた眺め
- **`full=true`**: ページの中身をすべて

`browser.snapshot_threshold`（既定は 15,000 文字。`web_extract` と同じ、ページごとの予算です）より大きい写しは、行の切れ目で自動的に切り詰められます。LLM による要約は挟みません。切り詰めが起きたときは、写し全体が `~/.hermes/cache/web/` に保存され、道具の出力にはそのファイルの場所と、そのまま使える `read_file` の呼び出しが載ります。エージェントは写しを取り直さずに、切られた先にある要素の参照も含めて、アクセシビリティツリー全体を順に読めます。

長いページで、もっと多くの中身をそのままエージェントに届けたいときは、上限を上げてください。

```yaml
# ~/.hermes/config.yaml
browser:
  snapshot_threshold: 30000
```

`hermes config set browser.snapshot_threshold 30000` でも設定できます。この設定は、はっきり呼んだ `browser_snapshot` にも、ページ移動のあとに自動で返る写しにも効き、Camofox の裏方にも効きます（最小は 1000）。変えたあとは、ブラウザの設定のキャッシュが読み直されるように、今の Hermes のセッションを再起動してください。

### `browser_click` {#browserclick}

写しにある参照の ID で示した要素をクリックします。

```
Click @e5 to press the "Sign In" button
```

### `browser_type` {#browsertype}

入力欄に文字を打ちます。まず欄を空にしてから、新しい文字を打ちます。

```
Type "hermes agent" into the search field @e3
```

### `browser_scroll` {#browserscroll}

ページを上下にスクロールして、続きを出します。

```
Scroll down to see more results
```

### `browser_press` {#browserpress}

キーボードのキーを押します。フォームの送信やページ移動に便利です。

```
Press Enter to submit the form
```

使えるキー: `Enter`、`Tab`、`Escape`、`ArrowDown`、`ArrowUp` など。

### `browser_back` {#browserback}

ブラウザの履歴で1つ前のページに戻ります。

### `browser_get_images` {#browsergetimages}

今のページにある画像を、URL と代替テキストとともに並べます。解析したい画像を探すのに便利です。

### `browser_vision` {#browservision}

スクリーンショットを撮り、目で見る AI で解析します。文字の写しでは大事な見た目の情報が拾えないときに使います。CAPTCHA、込み入った配置、目で確かめる関門にとくに効きます。

スクリーンショットは残る形で保存され、AI の解析と一緒にファイルの場所が返ります。メッセージのやり取りをする場（Telegram、Discord、Slack、WhatsApp）では、エージェントにスクリーンショットを送るよう頼めます。`MEDIA:` の仕組みを通して、その場の写真の添付として送られます。

```
What does the chart on this page show?
```

スクリーンショットは `~/.hermes/cache/screenshots/` に置かれ、24 時間後に自動で片づけられます。

### `browser_console` {#browserconsole}

今のページのブラウザのコンソールの出力（log／warn／error のメッセージ）と、拾われなかった JavaScript の例外を取ります。アクセシビリティツリーには現れない、静かな JS のエラーを見つけるのに欠かせません。

```
Check the browser console for any JavaScript errors
```

`clear=True` を使うと読んだあとにコンソールを空にするので、次からは新しいメッセージだけが見えます。

`browser_console` は、`expression` の引数を付けて呼ぶと JavaScript の評価もします。DevTools のコンソールと同じ形で、結果は解いた形で返ります（JSON にできる物は辞書になり、素の値は素のままです）。

```
browser_console(expression="document.querySelector('h1').textContent")
browser_console(expression="JSON.stringify(performance.timing)")
```

今のセッションで CDP の監督役が動いているとき（CDP を扱える裏方に対して `browser_navigate` を実行したセッションなら、たいていそうです）、評価は監督役の残り続ける WebSocket の上で走るので、子プロセスを立ち上げる費用がかかりません。そうでなければ、いつもの agent-browser の CLI の経路に落ちます。ふるまいはどちらでも同じで、変わるのは待ち時間だけです。

評価は既定では制限されません。エージェントは `fetch` を使い、保存領域を読み、フォームの値を調べ、DOM から何でも取り出せます。私設や内部のアドレスを狙う求めは、手元でない裏方では今も止められます（SSRF の守りはこの設定とは別に働きます）。ログイン済みのプロファイルで危ないページを見て回っていて、機微な JS の部品（Cookie、保存領域、クリップボード、通信、フォームの値）に厳しい拒否の一覧をかけたいなら、`config.yaml` で `browser.restrict_evaluate: true` を選んでください。この拒否の一覧は部品の*名前*で当たるので、`fetch` や `cookie` といった語をたまたま含むだけの真っ当な式も止まる点に注意してください。

### `browser_cdp` {#browsercdp}

Chrome DevTools Protocol をそのまま通す道です。ほかの道具では届かないブラウザの操作のための逃げ道になります。その場のダイアログの処理、iframe に閉じた評価、Cookie や通信の制御、そのほかエージェントに必要などの CDP の命令にも使えます。

**セッションの始まりに CDP の口に届くときだけ使えます。** つまり `/browser connect` で動いている Chrome、Brave、Chromium、Edge につないでいるか、`config.yaml` に `browser.cdp_url` が設定されている場合です。既定の手元の agent-browser のモード、Camofox、クラウドのプロバイダ（Browserbase、Browser Use、Firecrawl）は、今のところこの道具に CDP を出していません。クラウドのプロバイダにはセッションごとの CDP の URL がありますが、動いているセッションへの振り分けはこれからの課題です。

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

**オリジンをまたぐ iframe:** `frame_id`（`browser_snapshot.frame_tree.children[]` の `is_oopif=true` のもの）を渡すと、その iframe に対する監督役の生きたセッションを通して CDP の呼び出しが回されます。Browserbase でオリジンをまたぐ iframe の中の `Runtime.evaluate` が動くのはこの仕組みのおかげで、状態を持たない CDP の接続では署名付き URL の期限切れに当たってしまいます。例です。

```
browser_cdp(
  method="Runtime.evaluate",
  params={"expression": "document.title", "returnByValue": True},
  frame_id="<frame_id from browser_snapshot>",
)
```

同じオリジンの iframe に `frame_id` は要りません。代わりに、いちばん上での `Runtime.evaluate` から `document.querySelector('iframe').contentDocument` を使ってください。

### `browser_dialog` {#browserdialog}

その場の JS のダイアログ（`alert` ／ `confirm` ／ `prompt` ／ `beforeunload`）に応えます。この道具ができる前は、ダイアログが黙ってページの JavaScript の流れを止め、続く `browser_*` の呼び出しが固まったり例外を投げたりしていました。今は、エージェントが `browser_snapshot` の出力で待っているダイアログを見て、はっきり応えられます。

**流れ:**
1. `browser_snapshot` を呼びます。ダイアログがページを止めていれば、`pending_dialogs: [{"id": "d-1", "type": "alert", "message": "..."}]` として現れます。
2. `browser_dialog(action="accept")` か `browser_dialog(action="dismiss")` を呼びます。`prompt()` のダイアログには `prompt_text="..."` を渡して答えを与えます。
3. もう一度写しを取ります。`pending_dialogs` は空になり、ページの JS の流れは動き出しています。

**見つけるのは自動です。** 残り続ける CDP の監督役 — 仕事ごとに1つの WebSocket が Page／Runtime／Target の出来事を購読しています — が受け持ちます。監督役は写しに `frame_tree` の項目も埋めるので、エージェントは今のページの iframe の構造を、オリジンをまたぐもの（OOPIF）も含めて見られます。

**使えるかどうかの一覧:**

| 裏方 | `pending_dialogs` で見つけられるか | 応答（`browser_dialog` の道具） |
|---|---|---|
| `/browser connect` か `browser.cdp_url` でつないだ手元の Chrome | ✓ | ✓ 一連の流れが使えます |
| Browserbase | ✓ | ✓ 一連の流れが使えます（差し込んだ XHR の橋を通して） |
| Camofox ／ 既定の手元の agent-browser | ✗ | ✗（CDP の口がありません） |

**Browserbase での仕組み。** Browserbase の CDP の中継は、本物のその場のダイアログをサーバー側で 10 ミリ秒ほどのうちに自動で閉じてしまうので、`Page.handleJavaScriptDialog` は使えません。監督役は `Page.addScriptToEvaluateOnNewDocument` で小さなスクリプトを差し込み、`window.alert` ／ `confirm` ／ `prompt` を同期の XHR で置き換えます。その XHR を `Fetch.enable` で横取りし、エージェントの答えとともに `Fetch.fulfillRequest` を呼ぶまで、ページの JS の流れは XHR の上で止まったままになります。`prompt()` の戻り値は、そのままの形でページの JS へ返っていきます。

**ダイアログの方針**は、`config.yaml` の `browser.dialog_policy` で設定します。

| 方針 | ふるまい |
|--------|----------|
| `must_respond`（既定） | 捕まえて写しに出し、はっきりした `browser_dialog()` の呼び出しを待ちます。`browser.dialog_timeout_s`（既定は 300 秒）が過ぎたら安全のために自動で閉じるので、不具合のあるエージェントが永久に止まってしまうことはありません。 |
| `auto_dismiss` | 捕まえて、すぐ閉じます。エージェントは `browser_state` の履歴でダイアログを見られますが、応えなくてかまいません。 |
| `auto_accept` | 捕まえて、すぐ受け入れます。しつこい `beforeunload` の確認が出るページを渡り歩くときに便利です。 |

**フレームの木**（`browser_snapshot.frame_tree` の中）は、広告の多いページでも渡す量が膨らまないよう、30 フレーム、OOPIF の深さ2までに抑えられています。上限に当たったときは `truncated: true` の旗が現れます。木の全体が要るエージェントは、`browser_cdp` で `Page.getFrameTree` を使えます。

## 実際の例 {#practical-examples}

### ウェブのフォームを埋める {#filling-out-a-web-form}

```
User: Sign up for an account on example.com with my email john@example.com

Agent workflow:
1. browser_navigate("https://example.com/signup")
2. browser_snapshot()  → sees form fields with refs
3. browser_type(ref="@e3", text="john@example.com")
4. browser_type(ref="@e5", text="SecurePass123")
5. browser_click(ref="@e8")  → clicks "Create Account"
6. browser_snapshot()  → confirms success
```

### 動きのある中身を調べる {#researching-dynamic-content}

```
User: What are the top trending repos on GitHub right now?

Agent workflow:
1. browser_navigate("https://github.com/trending")
2. browser_snapshot(full=true)  → reads trending repo list
3. Returns formatted results
```

## セッションの録画 {#session-recording}

ブラウザのセッションを WebM の動画として自動で録画します。

```yaml
browser:
  record_sessions: true  # default: false
```

有効にすると、最初の `browser_navigate` で録画が自動的に始まり、セッションが閉じるときに `~/.hermes/browser_recordings/` へ保存されます。手元のモードでもクラウド（Browserbase）のモードでも動きます。72 時間より古い録画は自動で片づけられます。

## 画面ありモード（見えるブラウザの窓） {#headed-mode-visible-browser-window}

既定では、手元のブラウザは画面なしで動きます。画面ありモードにすると、こちらが見て触れる Chromium の窓が出ます。

```yaml
browser:
  headed: true  # default: false
```

環境変数でもできます: `AGENT_BROWSER_HEADED=1`。

画面ありモードは2つのことをします。

1. **見える窓とともに Chromium を立ち上げます**（手元のモードでは `--headed` を agent-browser に渡します）。
2. **ターンのあいだも窓を開いたままにします。** 普通はエージェントの返事のたびにブラウザのセッションが片づけられますが、画面ありモードではターンごとの片づけを飛ばすので、エージェントの働くさまを見たり、手で割り込んだり（サインインの関門、CAPTCHA）、会話のあいだログインの状態を温めておいたりできます。

動きのないセッションは今も `browser.inactivity_timeout`（既定ではブラウザの動きが 120 秒ない状態）で片づけられ、終了時にはすべてのセッションが閉じられます。画面ありモードが効くのは手元のブラウザだけで、クラウドのセッション（Browserbase）には効きません。

## 隠密の働き {#stealth-features}

Browserbase は、自動で隠密の働きを備えています。

| 働き | 既定 | 備考 |
|---------|---------|-------|
| 基本の隠密 | 常に有効 | 無作為の指紋、表示領域の無作為化、CAPTCHA の突破 |
| 住宅用のプロキシ | 有効 | 住宅用の IP を通すので、より通りやすくなります |
| 進んだ隠密 | 無効 | 独自ビルドの Chromium。Scale Plan が必要です |
| Keep Alive | 有効 | 回線が乱れたあとにセッションをつなぎ直します |

:::note
有料の働きがお使いのプランで使えないときは、Hermes が自動で下げていきます。まず `keepAlive` を外し、次にプロキシを外すので、無料のプランでも見て回れます。
:::

## セッションの扱い {#session-management}

- 仕事ごとに、Browserbase の隔離されたブラウザのセッションが割り当てられます
- 動きがないと、セッションは自動で片づけられます（既定では2分）
- 裏で動く流れが 30 秒ごとに、古びたセッションがないか確かめます
- 迷子のセッションが残らないよう、プロセスの終了時に緊急の片づけが走ります
- セッションは Browserbase の API を通して手放されます（`REQUEST_RELEASE` の状態）

## できないこと {#limitations}

- **文字でのやり取り** — 画素の座標ではなく、アクセシビリティツリーに頼っています
- **写しの大きさ** — 大きなページは `browser.snapshot_threshold` で切り詰められます（既定は 15,000 文字で、`web_extract` と揃えてあります。LLM による要約はしません）。写しの全体は `~/.hermes/cache/web/` に保存され、出力が `read_file` で順に読むための場所を指します
- **セッションの期限** — クラウドのセッションは、お使いのプロバイダのプランの設定に従って切れます
- **費用** — クラウドのセッションはプロバイダの残高を使います。会話が終わったとき、あるいは動きがなくなったときに自動で片づけられます。無料で手元から見て回るなら `/browser connect` を使ってください
- **ファイルの取り込みはできません** — ブラウザからファイルを落とすことはできません
