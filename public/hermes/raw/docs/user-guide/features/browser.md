---
title: "ブラウザの自動操作"
description: "複数のプロバイダ、CDP 経由のローカルの Chromium 系ブラウザ、クラウドブラウザでブラウザを操作し、ウェブとのやり取り、フォームの入力、スクレイピングなどを行います。"
upstream_path: user-guide/features/browser.md
upstream_blob: 1b2df2a39acae4a1c63cfa378e66134886232276
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/browser
---

# ブラウザの自動操作 {#browser-automation}

Hermes Agent には、複数のバックエンドを選べるブラウザ自動操作の道具一式が入っています。

- **Browser Use のクラウドモード** — [Browser Use](https://browser-use.com) 経由。ステルス、住宅用プロキシ、CAPTCHA の解決、使い回せるブラウザのプロファイルを備えたマネージドの Chromium です
- **Browserbase のクラウドモード** — [Browserbase](https://browserbase.com) 経由。ボット対策の仕組みを備えたもう一つのクラウドブラウザのプロバイダです
- **Browser Use モード** — [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) 経由。ローカルの Chrome と Browser Use のクラウドブラウザ向けの既定のブラウザドライバです
- **Firecrawl のクラウドモード** — [Firecrawl](https://firecrawl.dev) 経由。スクレイピングを内蔵したクラウドブラウザです
- **Camofox のローカルモード** — [Camofox](https://github.com/jo-inc/camofox-browser) 経由。ローカルで検知を避けながら閲覧できます（Firefox ベースのフィンガープリントの偽装）
- **Lightpanda のローカルエンジン** — [Lightpanda](https://lightpanda.io) 経由。機械向けに Zig でゼロから作られたヘッドレスのブラウザで、すぐに起動し、Chrome よりメモリが 16 分の 1、速度は 9 倍です。Browser Use モードで動き（Hermes が起動するので Chromium も Node も要りません）、組み込みのツールでも使えます（まだ対応していない操作は自動で Chrome に切り替わります）
- **ローカルの Chromium 系の CDP** — `/browser connect` を使って、自分の Chrome、Brave、Chromium、Edge にブラウザのツールをつなぎます
- **ローカルのブラウザモード** — `agent-browser` の CLI と、ローカルにインストールした Chromium を使います

どのモードでも、エージェントはウェブサイトを移動し、ページの要素を操作し、フォームに入力し、情報を取り出せます。

## 概要 {#overview}

ページは**アクセシビリティツリー**（テキストのスナップショット）として表されるので、LLM のエージェントにとって扱いやすい形になっています。操作できる要素には `@e1`、`@e2` のような参照 ID が付き、エージェントはこれを使ってクリックや入力を行います。

主な機能は次のとおりです。

- **複数のプロバイダでクラウド実行** — Browser Use、Browserbase、Firecrawl。ローカルのブラウザは要りません
- **ローカルの Chromium 系との連携** — CDP 経由で、動いている Chrome、Brave、Chromium、Edge につないで実際に操作できます
- **クラウドでのボット対策** — Browser Use Cloud はステルス、住宅用プロキシ、CAPTCHA の解決を備えています
- **クラウドで残るプロファイル** — Browser Use Cloud はセッションをまたいで Cookie、localStorage、保存したパスワードを使い回せます
- **セッションの分離** — タスクごとに専用のブラウザセッションが割り当てられます
- **自動の片づけ** — 使われていないセッションは一定時間で閉じられます
- **視覚の解析** — スクリーンショットと AI の解析で見た目を理解します

## 準備 {#setup}

:::tip Nous の契約者の方へ
[Nous Portal](https://portal.nousresearch.com) の有料プランを契約していれば、別途 API キーを用意しなくても **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** 経由でブラウザの自動操作を使えます。新しく入れる場合は `hermes setup --portal` を実行するとログインしてゲートウェイのツールを一度にすべて有効にできます。すでに入っている場合は `hermes model` か `hermes tools` でブラウザのプロバイダとして **Nous Subscription** を選んでください。
:::

### Browser Use のクラウドモード {#browser-use-cloud-mode}

Browser Use をクラウドブラウザのプロバイダにするには、次を追加します。

```bash
# Add to ~/.hermes/.env
BROWSER_USE_API_KEY=***
```

API キーは [browser-use.com](https://browser-use.com) で取得します。

Browser Use Cloud は、[ステルス](https://docs.browser-use.com/cloud/browser/stealth)と[住宅用プロキシ](https://docs.browser-use.com/cloud/browser/proxies)を既定で有効にしたマネージドの Chromium を動かします。CAPTCHA の解決も備え、Cookie、localStorage、保存したパスワードのための[永続プロファイル](https://docs.browser-use.com/cloud/guides/authentication)にも対応します。

### Browserbase のクラウドモード {#browserbase-cloud-mode}

Browserbase が管理するクラウドブラウザを使うには、次を追加します。

```bash
# Add to ~/.hermes/.env
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=your-project-id-here
```

認証情報は [browserbase.com](https://browserbase.com) で取得します。

:::note プロバイダの選び方
上の `.env` のキーが与えるのは**認証情報だけ**です。実際に使うクラウドブラウザは、`hermes tools` → Browser Automation が書き込む `browser.cloud_provider` の選択（`browserbase`、`browser-use`、`camofox`、Nous Subscription なら `nous`）で決まります。いったん選択が保存されると、キーを足したり消したりしてもプロバイダは切り替わりません。選択したプロバイダのキーが足りない場合は、黙って別の経路に回すのではなく、`hermes tools` を実行するよう案内するエラーになります。まだ一度も設定していない環境では、これまでどおり手元の認証情報から自動で判定します。
:::

### Browser Use モード（既定） {#browser-use-mode-default}

Browser Use モードは、組み込みのブラウザのツールの代わりに [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) を使います。エージェントはブラウザの中で Python を書いて実行し、クリック、入力、ドラッグ、スクレイピング、ページの操作を行います。

**これが既定のブラウザモードです**。`browser.backend` が未設定で、`browser-use` の CLI が動かせる（インストール済み、または `uvx` で使える）なら、エージェントには `browser_exec` という 1 つのツールが渡されます。CLI が動かせない場合、Hermes は自動で組み込みのブラウザのツールに戻ります。

このモードは**ドライバ**であり、設定したブラウザのバックエンドと組み合わせて働きます。`hermes tools` → Browser Automation で選んだブラウザの供給元が、ローカルの Chrome でも、Nous の契約のクラウドブラウザでも、Browserbase でも、Firecrawl でも、Browser Use のクラウドブラウザでも、それを操作します。唯一の例外が Camofox です。こちらは仕組みがつなぎにいける CDP のエンドポイントを持たないため、Camofox の構成では自動的に組み込みのブラウザのツールが使われ続けます。

**セッションの並行実行:** `browser_exec` は `session=<name>` という引数を受け取り、どのバックエンドでも名前ごとにブラウザの作業を分離します。名前ごとに専用の常駐プロセス（専用の IPC ソケット、ログ、状態）が用意され、クラウドのバックエンドでは専用のブラウザも割り当てられます。そのため並行するサブエージェントや同時のチャットが、1 つの共有接続を奪い合うことがなくなります。`session` を省くと共有の既定の常駐プロセスを使います。1 つずつ順番に閲覧するならこれで十分です。

このモードを使わず、組み込みのブラウザのツールを強制するには `/browser use off` を使うか、次のようにします。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  backend: "off"
```

（明示的にこのモードを強制する `backend: "browser-use"` も引き続き有効です。）

Browser Use 自身のクラウドブラウザには `browser-use auth login` か `BROWSER_USE_API_KEY` が必要です。他のブラウザの供給元は、これまでの認証情報をそのまま使います。

:::note
Browser Use モードはモデルが書いた Python を手元の環境で実行するため、`browser_exec` のツールが渡されるのはターミナルも使えるセッションだけです。ターミナルの道具立てを外した構成（たとえば権限を絞ったメッセージングの窓口）では、既定のブラウザのツールがそのまま使われます。
:::

### Firecrawl のクラウドモード {#firecrawl-cloud-mode}

Firecrawl をクラウドブラウザのプロバイダにするには、次を追加します。

```bash
# Add to ~/.hermes/.env
FIRECRAWL_API_KEY=fc-***
```

API キーは [firecrawl.dev](https://firecrawl.dev) で取得します。そのうえで、ブラウザのプロバイダとして Firecrawl を選びます。

```bash
hermes setup tools
# → Browser Automation → Firecrawl
```

任意の設定は次のとおりです。

```bash
# Self-hosted Firecrawl instance (default: https://api.firecrawl.dev)
FIRECRAWL_API_URL=http://localhost:3002

# Session TTL in seconds (default: 300)
FIRECRAWL_BROWSER_TTL=600
```

### 使い分けのルーティング: 公開 URL はクラウド、LAN や localhost はローカル {#hybrid-routing-cloud-for-public-urls-local-for-lanlocalhost}

クラウドのプロバイダを設定していると、Hermes はプライベート・ループバック・LAN のアドレス（`localhost`、`127.0.0.1`、
`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`*.local`、`*.lan`、`*.internal`、
IPv6 のループバック `::1`、リンクローカルの `169.254.x.x`）に解決される URL については、**ローカルの Chromium のサイドカー**を自動で立ち上げます。公開の URL は同じ会話の中でもそのままクラウドのプロバイダを使い続けます。

これで「ローカルで開発しているけれど Browserbase を使っている」というよくある流れが解決します。プロバイダを切り替えたり SSRF の保護を切ったりしなくても、エージェントは `http://localhost:3000` のダッシュボードのスクリーンショットを撮りつつ、
`https://github.com` をスクレイピングできます。クラウドのプロバイダがプライベートな URL を見ることはありません。

この機能は**既定で有効**です。無効にする（これまでどおり、すべての URL を設定済みのクラウドのプロバイダに回す）には、次のようにします。

```yaml
# ~/.hermes/config.yaml
browser:
  cloud_provider: browserbase
  auto_local_for_private_urls: false
```

自動のルーティングを無効にすると、プライベートな URL は
`"Blocked: URL targets a private or internal address"` として拒否されます。あわせて `browser.allow_private_urls: true` を設定した場合は別です（クラウドのプロバイダが試みるようになりますが、Browserbase などはこちらの LAN に届かないので、たいていうまくいきません）。

必要なもの: ローカルのサイドカーは、完全にローカルのモードと同じ `agent-browser` の CLI を使うので、これをインストールしておく必要があります（`hermes setup tools → Browser Automation`
が自動でインストールします）。公開 URL からプライベートなアドレスへのリダイレクトは、移動したあとでも引き続き遮断されます（内部へのリダイレクトを使う抜け道で、公開の経路から LAN に入ることはできません）。

### 本物のプロファイルでの閲覧（自分のログインを使う） {#real-profile-browsing-use-your-own-logins}

既定では、ローカルの閲覧はまっさらな使い捨てのプロファイルで動くので、エージェントはどこにもログインしていません。**本物のプロファイルでの閲覧**を有効にすると、既存のログインと Cookie を使って、エージェントが*あなた*として閲覧できます。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
```

有効にすると、Hermes は既定のブラウザの**実際に使っている**プロファイル（`Local State → profile.last_used`）を、その Cookie、保存したログイン、設定ごと
`~/.hermes/browser-profile/<browser>/` の下の管理下のスナップショットにコピーし、そのスナップショットで**本物のブラウザの実行ファイル**を起動して、閲覧のエンジンをそこにつなぎます。モックのキーチェーンのスイッチを付けた同梱の Chromium ではなく本物の実行ファイルを起動するのは、OS で暗号化された Cookie を復号できるようにするためです。macOS では Chrome の Cookie はキーチェーンを通して暗号化されていて、モックのキーチェーンで起動すると Cookie が黙って全部落ち、ログアウトした状態で開いてしまいます。動いているブラウザのプロファイルが**直接開かれることはありません**。スナップショットは別のディレクトリなので、動作中のブラウザとプロファイルのロックを取り合うことがなく、Chrome 136 以降の「既定のプロファイルのディレクトリではリモートデバッグを禁止する」制限も避けられます。認証のファイル（Cookie / ログイン / 設定）は、新しいセッションを起動するたびに本物のプロファイルから同期し直されるので、自分のブラウザでログインした結果がエージェントのセッションにも現れます。コピーされるのは実際に使っているプロファイルだけで、他の Chrome のプロファイルがスナップショットされることはありません。

スナップショットのブラウザは**ヘッドレス**で動きます。目に見えるウィンドウを出さずに背後でプロファイルを操作し、フォーカスを奪うこともないので、エージェントが代わりに投稿したり、フォームを埋めたり、スクレイピングしたりしている間も作業を続けられます。
（ここでのヘッドレスは Chrome の*新しい*ヘッドレスモードで、ふだんの Cookie のストアを読むので、ログインはそのまま効きます。）動いているところを見たいなら、同じ[ヘッド付きモード](#headed-mode-visible-browser-window)の切り替えが使えます。`browser.headed: true`（または `AGENT_BROWSER_HEADED=1`）にすると、本物のプロファイルでの閲覧でも見えるウィンドウが開きます。ディスプレイのないホスト（サーバー、CI）では、常にヘッドレスで動きます。

ブラウザに複数のプロファイル（仕事用と個人用など）があって、「いちばん最後に触ったプロファイル」でエージェントの身元が決まってしまうのを避けたいなら、スナップショットの元を明示的に固定します。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
  real_profile_pin: "Profile 2"   # directory name under the browser's user-data dir
```

存在しないプロファイルのディレクトリを指定した場合は、直し方の分かるメッセージを出して安全側に倒れます。最後に使ったプロファイルへ黙って戻ることはありません。

この切り替えを元に戻すと、Hermes は次にブラウザを使うときにスナップショットの置き場（`~/.hermes/browser-profile/`）を削除するので、同意を取り消したあとにコピーした認証情報が残り続けることはありません。

:::note Windows ではブラウザを完全に終了する必要があります
Windows では、動作中の Chrome / Edge / Brave が Cookie とログインのデータベースを排他（すべて拒否）のロックで押さえるため、ブラウザが開いたままだと Hermes はそれらをコピーできません。固まったりログアウト状態のセッションを作ったりする代わりに、「ブラウザを完全に終了して再試行してください」というメッセージを出して素早く失敗します。そのため Windows で本物のプロファイルを使って閲覧するには、ブラウザを**完全に終了**する必要があります。バックグラウンドやトレイに残っているものも含みます（Chrome の「閉じた後もバックグラウンドアプリの実行を続行する」を有効にしていると、ウィンドウを閉じたあとも `chrome.exe` が生き残ります）。macOS と Linux は、ブラウザが動いていてもプロファイルをコピーできます。

`browser.real_profile_autoclose: true` を設定すると、プロファイルが押さえられているときに Hermes が**ブラウザを閉じましょうかと申し出る**ようになります。これを有効にしても Hermes が勝手に閉じることはありません。プロファイルがロックされていれば必ずいったん止まり、エージェントが先に確認します。承認したときだけ `hermes browser
close-profile` を実行し（そのプロファイルに紐づくブラウザのプロセスのまとまりを終了させるので、保存していないタブは失われます）、その後に再試行します。それでもまだロックされている場合（バックグラウンドやトレイのプロセスが立ち上がり直したときなど）、Hermes は止まったまま、ブラウザを完全に終了するよう伝えます。自分から繰り返したり、もう一度終了させたりはしません。
:::

- **対応するブラウザ:** Chrome、Edge、Brave、Brave Origin、Chromium（OS の既定になっているもの）。Chromium 系でない既定のブラウザ（Firefox など）の場合は、当て推量をせず、分かりやすいメッセージを出して安全側に倒れます。
- **どのバックエンドでも動きます。** ローカルのバックエンドなら、切り替えを有効にするだけで自動的に効きます。**クラウド**のブラウザのバックエンドでも、エージェントは `browser_exec` ツールの `local` の引数を使って、必要なときに本物のプロファイルのローカルセッションを開けます（この切り替えが有効なときだけ、ツールにこの引数が現れます）。それ以外はクラウドのバックエンドがそのまま処理します。
- **セキュリティ上の位置づけ:** これは同意を前提にした便利機能であって、隔離の境界ではありません。エージェントが開いたページは本物のログインの状態で動くので、エージェントに自分として動いてほしいときだけ有効にしてください。既定では無効です。
- **Desktop:** **Capabilities → Tools → Browser → Use My Real
  Browser Profile**（バックエンドの選択肢の上にあるスイッチ）か、Settings → Config の `browser` のセクションで切り替えます。

### Camofox のローカルモード {#camofox-local-mode}

[Camofox](https://github.com/jo-inc/camofox-browser) は、Camoufox（C++ でフィンガープリントを偽装する Firefox のフォーク）を包んだ、自分で立てる Node.js のサーバーです。クラウドに頼らず、ローカルで検知を避けながら閲覧できます。

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

`make up` はすぐに既定のコンテナを起動します。Node のヒープを大きくしたい、VNC を使いたい、プロファイルのディレクトリを残したいなど、実行時の設定を変えたい場合は、先にイメージをビルドしてから自分で起動します。

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

VNC を有効にするとブラウザはヘッド付きで動き、`http://localhost:6080`（noVNC）から動いている様子をそのまま見られます。`localhost:5901` にネイティブの VNC クライアントをつなぐこともできます。

すでに `make up` を実行しているなら、独自の設定で起動する前に、その既定のコンテナを止めて削除してください。

```bash
make down
# then run the custom docker run command above
```

そのうえで `~/.hermes/.env` に次を設定します。

```bash
CAMOFOX_URL=http://localhost:9377
```

Camofox を Docker で動かしていて、ホスト側で動いているウェブアプリを開かせたい場合は、ループバックの書き換えを有効にします。`CAMOFOX_URL` はこれまでどおりホスト側で公開されている制御 API を指しますが、`http://127.0.0.1:3000` のようなページの URL は、コンテナの中からは `http://host.docker.internal:3000` として開く必要があります。

```yaml
# ~/.hermes/config.yaml
browser:
  camofox:
    rewrite_loopback_urls: true
    loopback_host_alias: host.docker.internal  # default; use a LAN IP if needed
```

同じことをする環境変数は次のとおりです。

```bash
CAMOFOX_REWRITE_LOOPBACK_URLS=true
CAMOFOX_LOOPBACK_HOST_ALIAS=host.docker.internal
```

この書き換えが効くのは、ループバックのホスト（`localhost`、`127.0.0.1`、`::1`）を持つページの移動先の URL だけです。`CAMOFOX_URL` は変わりません。Docker を使わない Camofox の構成では無効のままにしてください。ブラウザがすでにホスト側で動いていて、ループバックの URL がそのまま正しいからです。

あるいは `hermes tools` → Browser Automation → Camofox から設定します。

Camofox は他のブラウザのバックエンドと同じように選びます。`hermes tools` → Browser Automation で **Camofox** を選ぶと、`config.yaml` に `browser.cloud_provider: camofox` が書き込まれます。`CAMOFOX_URL` はサーバーのアドレスにすぎず、ブラウザの選択がすでにある状態では、これを設定するだけでバックエンドが切り替わることはなくなりました（まだ一度も設定していない環境では、これまでどおり自動で判定します）。

#### セッションを残すブラウザ {#persistent-browser-sessions}

既定では、Camofox のセッションごとにランダムな身元が割り当てられるので、エージェントを再起動すると Cookie もログインも残りません。セッションを残すには、`~/.hermes/config.yaml` に次を追加します。

```yaml
browser:
  camofox:
    managed_persistence: true
```

そのあと、新しい設定を読み込ませるために Hermes を完全に再起動します。

:::warning 入れ子の位置が大事です
Hermes が読むのは `browser.camofox.managed_persistence` であって、トップレベルの `managed_persistence` では**ありません**。よくある間違いは次のように書いてしまうことです。

```yaml
# ❌ Wrong — Hermes ignores this
managed_persistence: true
```

フラグの位置が違うと、Hermes は黙ってランダムで使い捨ての `userId` に戻り、ログインの状態はセッションのたびに失われます。
:::

##### Hermes がすること
- プロファイルごとに決まる `userId` を Camofox に送り、サーバーがセッションをまたいで同じ Firefox のプロファイルを使い回せるようにします。
- 片づけのときにサーバー側のコンテキストの破棄を飛ばすので、エージェントのタスクをまたいで Cookie とログインが残ります。
- `userId` を有効な Hermes のプロファイル単位にするので、Hermes のプロファイルが違えばブラウザのプロファイルも別になります（プロファイルの分離）。

##### Hermes がしないこと
- Camofox のサーバーに永続化を強制することはしません。Hermes が送るのは安定した `userId` だけで、サーバーがその `userId` を永続的な Firefox のプロファイルのディレクトリに対応づけて初めて効きます。
- 使っている Camofox のサーバーのビルドが、すべてのリクエストを使い捨てとして扱う（保存済みのプロファイルを読み込まずに常に `browser.newContext()` を呼ぶなど）場合、Hermes にはそのセッションを残すことができません。userId によるプロファイルの永続化を実装した Camofox のビルドを使っているか確かめてください。

##### 効いているか確かめる

1. Hermes と Camofox のサーバーを起動します。
2. ブラウザのタスクで Google（またはログインが要るサイト）を開き、手でサインインします。
3. ブラウザのタスクを普通に終わらせます。
4. 新しいブラウザのタスクを始めます。
5. 同じサイトをもう一度開きます。サインインしたままのはずです。

5 でログアウトしていたら、Camofox のサーバーが安定した `userId` を尊重していません。設定の位置をもう一度確かめ、`config.yaml` を編集したあとに Hermes を完全に再起動したかを確認し、使っている Camofox のサーバーのバージョンがユーザーごとの永続プロファイルに対応しているかを確かめてください。

##### 状態の置き場所

Hermes は、プロファイル単位のディレクトリ `~/.hermes/browser_auth/camofox/`（既定でないプロファイルなら `$HERMES_HOME` の下の相当する場所）から、安定した `userId` を導き出します。実際のブラウザのプロファイルのデータは Camofox のサーバー側に、その `userId` を鍵として置かれます。永続プロファイルを完全にリセットするには、Camofox のサーバー側で消したうえで、対応する Hermes のプロファイルの状態のディレクトリを削除します。

#### 外部で管理する Camofox のセッション {#externally-managed-camofox-sessions}

別のアプリ（デスクトップのアシスタント、独自の連携、別のエージェント）が目に見える Camofox のブラウザを操作している場合、Hermes が自分だけの隔離されたプロファイルを作るのではなく、同じ身元の中で動くように設定できます。

挙動を決めるつまみは 3 つです。

| 設定 | 環境変数 | 効果 |
|---------|---------|--------|
| `browser.camofox.user_id` | `CAMOFOX_USER_ID` | Hermes がタブを作るときに使う Camofox の `userId`。これを設定すると、そのセッションは「外部で管理する」モードになります。 |
| `browser.camofox.session_key` | `CAMOFOX_SESSION_KEY` | タブを作るときに送る `sessionKey`（別名 `listItemId`）。既存のタブを引き継ぐときの照合に使います。未設定ならタスクごとの値が入ります。 |
| `browser.camofox.adopt_existing_tab` | `CAMOFOX_ADOPT_EXISTING_TAB` | true にすると、Hermes は最初に使うときに `GET /tabs?userId=<user_id>` を呼び、新しいタブを作る前に既存のタブを使い回します。 |

環境変数は `config.yaml` より優先されます。どちらの書き方でもかまいません。

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

- Hermes はタスクの終わりに破壊的な片づけを行いません（`managed_persistence: true` と同じです）。他のアプリのタブ、Cookie、プロファイルは残ります。
- Hermes は `DELETE /sessions/<user_id>` を**呼びません**。このエンドポイントはユーザーのデータをすべて消すので、実行されると外部のアプリのセッションまで吹き飛ばしてしまいます。

**タブの引き継ぎの流れ（`adopt_existing_tab: true` のとき）:**

1. プロセスの起動後、最初のブラウザのツールの呼び出しで、Hermes が `GET /tabs?userId=<user_id>` を発行します（5 秒のタイムアウト）。
2. 応答のなかに `listItemId == session_key` のタブがあれば、そのまとまりのなかでいちばん新しく作られたものを引き継ぎます。
3. なければ、そのユーザーのいちばん新しく作られたタブ（`listItemId` は問いません）を引き継ぎます。
4. タブが 1 つもない、またはリクエストが失敗した場合、Hermes は次の操作で新しいタブを作ります。

引き継ぎが働くのは、そのセッションの `tab_id` が埋まるまでの間だけです。実行の途中で外部のアプリが引き継いだタブを閉じると、次のブラウザのツールの呼び出しで Camofox のエラーが出ます。Hermes は呼び出しのたびに新しいタブを探し直すことはしません。

**`session_key` の選び方:** *特定の*既存のタブに確実につなぎたいなら、外部のアプリがそのタブを作ったときの `listItemId` を `session_key` に設定します。`session_key` を設定せず `user_id` だけを設定した場合、Hermes はタスクごとの `session_key`（`task_<id>`）を作ります。Cookie とプロファイルは外部のアプリと共有しますが、既存のタブを使い回すのではなく、自分のタブを隣に開きます。

**並行実行についての注意:** 外部のアプリと Hermes は同じ Camofox の `userId` を同時に操作できますが、Camofox はクライアントの間でタブごとのフォーカスを調整しません。どちらが操作するかは、アプリケーションの層で決めてください（たとえば Hermes が動いている間は外部のアプリを止める、など）。

#### VNC でのライブ表示 {#vnc-live-view}

Camofox をヘッド付きモード（目に見えるブラウザのウィンドウあり）で動かすと、ヘルスチェックの応答に VNC のポートが載ります。Hermes はこれを自動で見つけて、移動の応答に VNC の URL を含めるので、エージェントはブラウザの様子をそのまま見られるリンクを渡せます。

### Lightpanda のローカルエンジン {#lightpanda-local-engine}

[Lightpanda](https://lightpanda.io) は、ゼロから書かれたオープンソースのヘッドレスのブラウザです。すぐに起動し、Chrome より 9 倍速く、メモリは 16 分の 1 で済みます。小さな VM の上で長く動き続けるエージェントには効いてきます。

Lightpanda はクラウドのプロバイダではなく、**ローカルのエンジン**（「Local Browser」と同じ、ブラウザの供給元）です。バイナリをインストールして `PATH` に置き（[Lightpanda のインストール手順](https://lightpanda.io/docs/run-locally/installation/one-liner)を参照）、`hermes tools` → Browser Automation で **Lightpanda** を選ぶか、次のように設定します。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  cloud_provider: local
  engine: lightpanda
```

環境変数で指定することもできます。

```bash
AGENT_BROWSER_ENGINE=lightpanda
```

このエンジンは、どちらのブラウザのドライバでも動きます。

- **Browser Use モード（既定）。** Hermes が自分で `lightpanda serve --host 127.0.0.1 --port <free>` を起動し（`browser_exec` のセッション名ごと、あるいはタスクごとに 1 プロセス）、Browser Use の CLI をそこに向けます。Chromium も Playwright も Node.js も要りません。プロセスは `browser.inactivity_timeout` の経過後、終了時、そして Hermes が落ちた場合は孤児プロセスの掃除によって片づけられます。Lightpanda には描画のエンジンがないので `capture_screenshot()` は使えず、ツールの説明でモデルにテキスト中心で進めるよう伝えます。またセッションごとに 1 ページしか持てないので、モデルには `new_tab()` を一度だけ呼び、その後は `goto_url()` を使うよう伝えます（上流の [lightpanda-io/browser#1962](https://github.com/lightpanda-io/browser/issues/1962) で追跡されています）。
- **組み込みのブラウザのツール**（`/browser use off`）。Hermes はローカルの Chrome と同じように、CDP 経由で `agent-browser --engine lightpanda` を通して Lightpanda を操作します。あわせて **Chrome への自動フォールバック**が効きます。Lightpanda が対応している操作（移動、スナップショット、クリック、入力、スクロール、戻る、キー入力、評価）はそのまま処理し、対応していないものは Hermes が意識させずに Chrome で再試行します。スクリーンショットと `browser_vision` はそのまま Chrome に回ります。

**このエンジンが無視される場合。** `browser.engine` はブラウザの設定のなかでいちばん優先度が低い項目です。クラウドのプロバイダ（Nous の契約のブラウザを含みます。また、まだ一度も設定していない環境では `~/.hermes/.env` の `BROWSERBASE_API_KEY` / `BROWSER_USE_API_KEY` が自動で選ばれます）、Camofox、`browser.cdp_url` や `/browser connect` による上書き、`browser.use_real_profile` は、いずれもこれより優先されます。`hermes tools` で Lightpanda を選ぶと `cloud_provider: local` が書き込まれます。エンジンを設定したのに他の設定に隠れているときは、`/browser status` と `hermes doctor` がその事実と、何に隠されているかを教えてくれます。

### CDP 経由でローカルの Chromium 系のブラウザにつなぐ（`/browser connect`） {#local-chromium-family-browser-via-cdp-browser-connect}

クラウドのプロバイダの代わりに、Chrome DevTools Protocol（CDP）を使って、Hermes のブラウザのツールを自分の動いている Chrome、Brave、Chromium、Edge につなげます。エージェントの動きをその場で見たいとき、自分の Cookie やセッションが要るページを扱いたいとき、クラウドブラウザの費用を避けたいときに役立ちます。

:::note
`/browser connect` は**対話的な CLI のスラッシュコマンド**で、ゲートウェイからは実行されません。WebUI、Telegram、Discord などゲートウェイのチャットの中で実行しようとすると、メッセージはただの文章としてエージェントに送られ、コマンドは実行されません。ターミナルから Hermes を起動して（`hermes` か `hermes chat`）、そこで `/browser connect` を実行してください。
:::

CLI では次のように使います。

```
/browser connect                 # Auto-launch/connect to a local Chromium-family browser at http://127.0.0.1:9222
/browser connect ws://host:port  # Connect to a specific CDP endpoint
/browser status                  # Check current connection
/browser disconnect              # Detach and return to cloud/local mode
```

リモートデバッグを有効にしたブラウザがまだ動いていない場合、Hermes は対応する Chromium 系のブラウザを `--remote-debugging-port=9222` を付けて自動で起動しようとします。検出の対象には Brave、Brave Origin/Nightly、Google Chrome、Chromium、Microsoft Edge が含まれ、Linux でよくあるインストール先や、`brave-origin`、`brave-origin-nightly`、`/opt/brave.com/brave-origin/brave-origin`、`/opt/brave.com/brave-origin-nightly/brave-origin`、`/opt/brave-bin/brave`、`/snap/bin/brave` といったバイナリ名も見ます。

:::tip
Chromium 系のブラウザを手で起動して CDP を有効にするときは、専用の user-data-dir を使ってください。そうすれば、すでにふだんのプロファイルでブラウザが動いていてもデバッグのポートがちゃんと開きます。

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

そのあと Hermes の CLI を起動して `/browser connect` を実行します。

**なぜ `--user-data-dir` が要るのか。** これを付けないと、ふつうのインスタンスがすでに動いている状態で Chromium 系のブラウザを起動しても、たいていは既存のプロセスに新しいウィンドウが開くだけです。その既存のプロセスは `--remote-debugging-port` を付けずに起動されているので、ポート 9222 は開きません。専用の user-data-dir を指定すれば、デバッグのポートが実際に待ち受ける新しいブラウザのプロセスが立ち上がります。`--no-first-run --no-default-browser-check` は、新しいプロファイルの初回起動のウィザードを飛ばします。

**Chrome 136 以降では、専用のプロファイルが必須です。** セキュリティ強化の変更として、Chrome 136 以降は `--remote-debugging-port` を*既定の* user-data-dir と組み合わせたとき、リモートデバッグのポートを黙って開かなくなりました。他に Chrome が動いていない状態で起動しても同じです。ブラウザは普通に立ち上がるのに 9222 では誰も待ち受けていないので、`/browser connect`（そして手動の `curl http://127.0.0.1:9222/json/version` も）は connection refused で失敗します。エラーのメッセージは出ません。対処は上のコマンドそのもので、既定のプロファイルのディレクトリ以外を指す `--user-data-dir` を必ず渡すことです（たとえば `$HOME/.hermes/chrome-debug`）。これは、この変更を取り込んだ Chrome、Chromium、Edge、Brave のビルドに当てはまります。
:::

CDP でつないでいる間、すべてのブラウザのツール（`browser_navigate`、`browser_click` など）は、クラウドのセッションを立てるのではなく、動いている自分のブラウザを操作します。

### WSL2 と Windows の Chrome: `/browser connect` より MCP が向いています {#wsl2-windows-chrome-prefer-mcp-over-browser-connect}

Hermes が WSL2 の中で動いていて、操作したい Chrome のウィンドウが Windows のホスト側にある場合、`/browser connect` が最善とはいえないことがよくあります。

理由は次のとおりです。

- `/browser connect` は、Hermes 自身が使える CDP のエンドポイントに届くことを前提にしています
- 最近の Chrome のライブデバッグのセッションは、昔ながらの `9222` のポートと同じようには WSL から直接届かない、ホスト内部のエンドポイントを公開することがよくあります
- Windows の Chrome がデバッグできる状態であっても、Windows 側のブラウザの MCP サーバーを Chrome につないで、Hermes はその MCP サーバーと話す形がいちばんきれいに収まることが多いです

その構成では、Hermes の MCP 対応を通して `chrome-devtools-mcp` を使うほうが向いています。

実際の手順は MCP のガイドを参照してください。

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/#wsl2-bridge-hermes-in-wsl-to-windows-chrome)

### ローカルのブラウザモード {#local-browser-mode}

クラウドの認証情報を何も設定せず、`/browser connect` も使わない場合でも、Hermes は `agent-browser` が操作するローカルの Chromium を通してブラウザのツールを使えます。

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

### agent-browser の CLI を入れる {#install-agent-browser-cli}

とくに何かを入れる必要はありません。`agent-browser` は、最初にブラウザのツールを使ったときに
`npx agent-browser` で自動的に解決されます。一度だけ発生する npx の取得を避けたいなら、先にグローバルへ入れておくこともできます（任意）。

```bash
npm install -g agent-browser
```

:::info
`browser` の道具立てを設定の `toolsets` のリストに入れるか、`hermes config set toolsets '["hermes-cli", "browser"]'` で有効にする必要があります。
:::

## 使えるツール {#available-tools}

### `browser_navigate` {#browsernavigate}

URL に移動します。他のブラウザのツールより先に呼ぶ必要があります。Browserbase のセッションを初期化します。

```
Navigate to https://github.com/NousResearch
```

:::tip
単に情報を取りたいだけなら、`web_search` か `web_extract` のほうが速くて安上がりです。ブラウザのツールは、ページを**操作する**必要があるとき（ボタンを押す、フォームを埋める、動的な中身を扱う）に使ってください。
:::

### `browser_snapshot` {#browsersnapshot}

いま開いているページのアクセシビリティツリーを、テキストのスナップショットとして取得します。`browser_click` や `browser_type` で使う `@e1`、`@e2` のような参照 ID の付いた、操作できる要素が返ります。

- **`full=false`**（既定）: 操作できる要素だけを示すコンパクトな表示
- **`full=true`**: ページの中身をすべて表示

`browser.snapshot_threshold`（既定は 15,000 文字で、`web_extract` と同じページごとの上限です）を超えるスナップショットは、行の切れ目で自動的に切り詰められます。LLM による要約は入りません。切り詰めが起きたときは、完全なスナップショットが `~/.hermes/cache/web/` に保存され、ツールの出力にそのファイルのパスと、そのまま使える `read_file` の呼び出しが含まれます。これでエージェントは、切られた先にある要素の参照も含めて、スナップショットを取り直さずにアクセシビリティツリー全体を読み進められます。

元の中身をもっとエージェントに直接届けたい長いページでは、しきい値を上げます。

```yaml
# ~/.hermes/config.yaml
browser:
  snapshot_threshold: 30000
```

`hermes config set browser.snapshot_threshold 30000` でも設定できます。この設定は、明示的な `browser_snapshot` の呼び出しにも、移動のあとに自動で返るスナップショットにも効き、Camofox のバックエンドも対象です（最小は 1000）。変更したら、ブラウザの設定のキャッシュを読み直すために、いまの Hermes のセッションを再起動してください。

### `browser_click` {#browserclick}

スナップショットの参照 ID で指し示した要素をクリックします。

```
Click @e5 to press the "Sign In" button
```

### `browser_type` {#browsertype}

入力欄に文字を入れます。まず欄を空にしてから、新しい文字を入力します。

```
Type "hermes agent" into the search field @e3
```

### `browser_scroll` {#browserscroll}

ページを上下にスクロールして、続きを表示します。

```
Scroll down to see more results
```

### `browser_press` {#browserpress}

キーボードのキーを押します。フォームの送信や移動に役立ちます。

```
Press Enter to submit the form
```

対応するキー: `Enter`、`Tab`、`Escape`、`ArrowDown`、`ArrowUp` など。

### `browser_back` {#browserback}

ブラウザの履歴で 1 つ前のページに戻ります。

### `browser_get_images` {#browsergetimages}

いま開いているページのすべての画像を、URL と代替テキストとともに一覧にします。解析したい画像を探すのに役立ちます。

### `browser_vision` {#browservision}

スクリーンショットを撮り、視覚 AI で解析します。テキストのスナップショットでは拾えない見た目の情報があるときに使います。CAPTCHA、複雑なレイアウト、見た目で確かめる必要があるものにとくに向いています。

スクリーンショットは保存され、AI の解析と一緒にファイルのパスが返ります。メッセージングのプラットフォーム（Telegram、Discord、Slack、WhatsApp）では、エージェントにスクリーンショットの共有を頼めます。`MEDIA:` の仕組みを通して、そのプラットフォームの写真の添付として送られます。

```
What does the chart on this page show?
```

スクリーンショットは `~/.hermes/cache/screenshots/` に保存され、24 時間後に自動で片づけられます。

### `browser_console` {#browserconsole}

いま開いているページから、ブラウザのコンソールの出力（log / warn / error のメッセージ）と、捕まえられなかった JavaScript の例外を取得します。アクセシビリティツリーには現れない、静かな JS のエラーを見つけるのに欠かせません。

```
Check the browser console for any JavaScript errors
```

`clear=True` を使うと読んだあとにコンソールを消すので、次に呼んだときは新しいメッセージだけが出ます。

`browser_console` は `expression` の引数を付けて呼ぶと JavaScript も評価します。形は DevTools のコンソールと同じで、結果は解析された形で返ります（JSON に直せるオブジェクトは辞書になり、プリミティブな値はそのままです）。

```
browser_console(expression="document.querySelector('h1').textContent")
browser_console(expression="JSON.stringify(performance.timing)")
```

いまのセッションで CDP のスーパーバイザーが動いているとき（CDP に対応したバックエンドに対して `browser_navigate` を実行したセッションではふつう動いています）、評価はスーパーバイザーの常駐 WebSocket を通るので、サブプロセスの起動の負担がありません。そうでなければ、通常の agent-browser の CLI の経路に落ちます。どちらでも挙動は同じで、変わるのは応答の速さだけです。

評価は既定では制限されていません。エージェントは `fetch` を使い、ストレージを読み、フォームの値を調べ、DOM から自由に情報を取り出せます。ローカル以外のバックエンドでは、プライベート・内部のアドレスへのリクエストは引き続き遮断されます（SSRF の保護はこの設定とは別に働きます）。ログイン済みのプロファイルで危険なページを見るなら、機微な JS の機能（Cookie、ストレージ、クリップボード、ネットワークの呼び出し、フォームの値）を厳しく拒否したくなるでしょう。その場合は `config.yaml` で `browser.restrict_evaluate: true` にして有効にします。なお、この拒否リストは機能の*名前*で一致を見るので、`fetch` や `cookie` という語をたまたま含むだけの正当な式も止めてしまいます。

### `browser_cdp` {#browsercdp}

Chrome DevTools Protocol をそのまま通す仕組みで、他のツールで足りないブラウザの操作のための逃げ道です。OS のダイアログの処理、iframe の中での評価、Cookie やネットワークの制御など、エージェントが必要とするどの CDP の命令にも使えます。

**セッションの開始時に CDP のエンドポイントに届く場合にだけ使えます** — つまり `/browser connect` で動いている Chrome、Brave、Chromium、Edge につないでいるか、`config.yaml` に `browser.cdp_url` が設定されている場合です。既定のローカルの agent-browser のモード、Camofox、クラウドのプロバイダ（Browserbase、Browser Use、Firecrawl）は、いまのところこのツールに CDP を公開していません。クラウドのプロバイダはセッションごとの CDP の URL を持っていますが、動作中のセッションへの振り分けは今後の課題です。

**CDP のメソッドの一覧:** https://chromedevtools.github.io/devtools-protocol/ — エージェントは特定のメソッドのページを `web_extract` して、引数と戻り値の形を調べられます。

よく使う形は次のとおりです。

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

ブラウザ単位のメソッド（`Target.*`、`Browser.*`、`Storage.*`）では `target_id` を省きます。ページ単位のメソッド（`Page.*`、`Runtime.*`、`DOM.*`、`Emulation.*`）には、`Target.getTargets` で得た `target_id` が必要です。呼び出しはそれぞれ独立していて状態を持たず、呼び出しの間でセッションは残りません。

**オリジンをまたぐ iframe:** `frame_id`（`browser_snapshot.frame_tree.children[]` のうち `is_oopif=true` のもの）を渡すと、その iframe に対するスーパーバイザーの生きたセッションを通して CDP の呼び出しが行われます。Browserbase でオリジンをまたぐ iframe の中の `Runtime.evaluate` が動くのはこのおかげです。状態を持たない CDP の接続では、署名付き URL の期限切れに当たってしまいます。例を挙げます。

```
browser_cdp(
  method="Runtime.evaluate",
  params={"expression": "document.title", "returnByValue": True},
  frame_id="<frame_id from browser_snapshot>",
)
```

同じオリジンの iframe に `frame_id` は要りません。代わりに、トップレベルの `Runtime.evaluate` から `document.querySelector('iframe').contentDocument` を使ってください。

### `browser_dialog` {#browserdialog}

OS の JS のダイアログ（`alert` / `confirm` / `prompt` / `beforeunload`）に応答します。このツールができる前は、ダイアログがページの JavaScript のスレッドを黙って止めてしまい、その後の `browser_*` の呼び出しが固まったりエラーになったりしていました。いまはエージェントが `browser_snapshot` の出力で待機中のダイアログを見て、明示的に応答します。

**手順:**
1. `browser_snapshot` を呼びます。ダイアログがページを止めていれば、`pending_dialogs: [{"id": "d-1", "type": "alert", "message": "..."}]` のように現れます。
2. `browser_dialog(action="accept")` か `browser_dialog(action="dismiss")` を呼びます。`prompt()` のダイアログでは `prompt_text="..."` を渡して答えを入れます。
3. もう一度スナップショットを取ります。`pending_dialogs` は空になり、ページの JS のスレッドが動き出しています。

**検知は自動で行われます**。常駐する CDP のスーパーバイザー（タスクごとに 1 本の WebSocket で、Page / Runtime / Target のイベントを購読します）が担当します。スーパーバイザーはスナップショットに `frame_tree` の項目も入れるので、エージェントはオリジンをまたぐ（OOPIF の）iframe も含めて、いまのページの iframe の構造を見られます。

**対応の一覧:**

| バックエンド | `pending_dialogs` による検知 | 応答（`browser_dialog` ツール） |
|---|---|---|
| `/browser connect` または `browser.cdp_url` 経由のローカルの Chrome | ✓ | ✓ 一連の手順に対応 |
| Browserbase | ✓ | ✓ 一連の手順に対応（注入した XHR の橋渡し経由） |
| Camofox / 既定のローカルの agent-browser | ✗ | ✗（CDP のエンドポイントがありません） |

**Browserbase での仕組み。** Browserbase の CDP のプロキシは、本物の OS のダイアログをサーバー側で 10 ミリ秒ほどで自動的に閉じてしまうので、`Page.handleJavaScriptDialog` は使えません。そこでスーパーバイザーは `Page.addScriptToEvaluateOnNewDocument` で小さなスクリプトを注入し、`window.alert`/`confirm`/`prompt` を同期の XHR に置き換えます。その XHR を `Fetch.enable` で捕まえるので、こちらがエージェントの答えとともに `Fetch.fulfillRequest` を呼ぶまで、ページの JS のスレッドは XHR で止まったままになります。`prompt()` の戻り値は、そのままの形でページの JS に返ります。

**ダイアログの方針**は `config.yaml` の `browser.dialog_policy` で設定します。

| 方針 | 挙動 |
|--------|----------|
| `must_respond`（既定） | 捕まえてスナップショットに出し、明示的な `browser_dialog()` の呼び出しを待ちます。動きの怪しいエージェントが永久に止まらないよう、`browser.dialog_timeout_s`（既定は 300 秒）が過ぎたら安全のために自動で閉じます。 |
| `auto_dismiss` | 捕まえてすぐ閉じます。エージェントは `browser_state` の履歴でダイアログを見られますが、対応する必要はありません。 |
| `auto_accept` | 捕まえてすぐ受け入れます。`beforeunload` の確認をしつこく出すページを見て回るときに便利です。 |

`browser_snapshot.frame_tree` の中の**フレームのツリー**は、広告の多いページでも大きくなりすぎないよう、30 フレーム、OOPIF の深さ 2 までに抑えられています。上限に達したときは `truncated: true` のフラグが現れます。ツリー全体が要るエージェントは、`browser_cdp` で `Page.getFrameTree` を使えます。

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

### 動的な中身を調べる {#researching-dynamic-content}

```
User: What are the top trending repos on GitHub right now?

Agent workflow:
1. browser_navigate("https://github.com/trending")
2. browser_snapshot(full=true)  → reads trending repo list
3. Returns formatted results
```

## セッションの録画 {#session-recording}

ブラウザのセッションを WebM の動画ファイルとして自動で録画します。

```yaml
browser:
  record_sessions: true  # default: false
```

有効にすると、最初の `browser_navigate` で録画が始まり、セッションが閉じたときに `~/.hermes/browser_recordings/` に保存されます。ローカルでもクラウド（Browserbase）でも動きます。72 時間より古い録画は自動で片づけられます。

## ヘッド付きモード（目に見えるブラウザのウィンドウ） {#headed-mode-visible-browser-window}

既定では、ローカルのブラウザはヘッドレスで動きます。ヘッド付きモードを有効にすると、目で見て操作もできる Chromium のウィンドウが出ます。

```yaml
browser:
  headed: true  # default: false
```

環境変数でも指定できます: `AGENT_BROWSER_HEADED=1`。

ヘッド付きモードには 2 つの働きがあります。

1. **目に見えるウィンドウで Chromium を起動します**（ローカルのモードでは agent-browser に `--headed` を渡します）。
2. **ターンをまたいでウィンドウを開いたままにします。** ふつうはエージェントが返信するたびにブラウザのセッションが片づけられますが、ヘッド付きモードではターンごとの片づけを飛ばすので、エージェントの動きを見たり、自分で割り込んだり（サインインの確認、CAPTCHA）、会話の間ログインの状態を保ったりできます。

使われていないセッションは、これまでどおり `browser.inactivity_timeout`（既定はブラウザの操作がない状態が 120 秒）で片づけられ、終了時にはすべてのセッションが閉じられます。ヘッド付きモードが効くのはローカルのブラウザだけで、クラウドのセッション（Browserbase）には影響しません。

## ステルスの機能 {#stealth-features}

Browserbase は自動でステルスの機能を用意します。

| 機能 | 既定 | 備考 |
|---------|---------|-------|
| 基本のステルス | 常に有効 | フィンガープリントとビューポートのランダム化、CAPTCHA の解決 |
| 住宅用プロキシ | 有効 | 住宅用の IP を通してアクセスしやすくします |
| 高度なステルス | 無効 | 独自ビルドの Chromium。Scale プランが必要です |
| Keep Alive | 有効 | ネットワークが乱れたあとにセッションへつなぎ直します |

:::note
契約中のプランで有料の機能が使えない場合、Hermes は自動的に段階を下げます。まず `keepAlive` を切り、次にプロキシを切るので、無料のプランでも閲覧は続けられます。
:::

## セッションの管理 {#session-management}

- タスクごとに、Browserbase で分離されたブラウザのセッションが割り当てられます
- 操作がないセッションは自動で片づけられます（既定: 2 分）
- 背後のスレッドが 30 秒ごとに、古くなったセッションがないか確かめます
- 孤児になったセッションが残らないよう、プロセスの終了時に緊急の片づけが走ります
- セッションは Browserbase の API（`REQUEST_RELEASE` の状態）で解放されます

## 制限 {#limitations}

- **テキストでのやり取り** — ピクセルの座標ではなく、アクセシビリティツリーに頼ります
- **スナップショットの大きさ** — 大きなページは `browser.snapshot_threshold`（既定は 15,000 文字で、`web_extract` と同じ。LLM による要約はありません）で切り詰められます。完全なスナップショットは `~/.hermes/cache/web/` に保存され、出力がその場所を示すので `read_file` で読み進められます
- **セッションのタイムアウト** — クラウドのセッションは、契約しているプロバイダのプランの設定に応じて期限切れになります
- **費用** — クラウドのセッションはプロバイダのクレジットを消費します。会話が終わったとき、または操作がないときに自動で片づけられます。無料でローカルに閲覧するには `/browser connect` を使ってください
- **ファイルのダウンロード不可** — ブラウザからファイルをダウンロードすることはできません
