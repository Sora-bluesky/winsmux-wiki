---
title: "ブラウザ自動操作"
description: "複数のプロバイダー、CDP 経由のローカル Chromium 系ブラウザ、クラウドブラウザを使ってブラウザを操作し、Web の操作・フォーム入力・スクレイピングなどを行います。"
upstream_path: user-guide/features/browser.md
upstream_blob: 43ed89309228b21a39ed58f714b2de44923c2199
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/browser
---

# ブラウザ自動操作 {#browser-automation}

Hermes Agent には、複数のバックエンドを選べる本格的なブラウザ自動操作ツール群が入っています。

- **Browser Use クラウドモード** — [Browser Use](https://browser-use.com) のマネージドな Chromium を使います。ステルス機能、住宅用プロキシ、CAPTCHA の突破、使い回せるブラウザプロファイルが付いています
- **Browserbase クラウドモード** — もう一つのクラウドブラウザ提供元として [Browserbase](https://browserbase.com) を、ボット検出対策の機能ごと使います
- **Browser Use モード** — [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) を使います。手元の Chrome と Browser Use のクラウドブラウザを動かす、既定のブラウザドライバーです
- **Firecrawl クラウドモード** — [Firecrawl](https://firecrawl.dev) のクラウドブラウザを、内蔵のスクレイピング機能ごと使います
- **Camofox ローカルモード** — [Camofox](https://github.com/jo-inc/camofox-browser) で、検出されにくい閲覧をローカルで行います（Firefox ベースの指紋偽装）
- **Lightpanda ローカルエンジン** — [Lightpanda](https://lightpanda.io) は、機械のためにゼロから Zig で書かれたヘッドレスブラウザです。起動が一瞬で、メモリ消費は Chrome の 16 分の 1、速度は 9 倍。まだ対応していない操作は自動で Chrome に回されます
- **ローカル Chromium 系の CDP** — `/browser connect` を使って、自分の Chrome・Brave・Chromium・Edge にブラウザツールをつなぎます
- **ローカルブラウザモード** — `agent-browser` CLI とローカルの Chromium を使います

どのモードでも、エージェントは Web サイトを移動し、ページ内の要素を操作し、フォームを埋め、情報を取り出せます。

## 概要 {#overview}

ページは **アクセシビリティツリー**（テキスト形式のスナップショット）として表現されるので、LLM エージェントにとって扱いやすくなっています。操作できる要素には `@e1`、`@e2` のような参照 ID が振られ、エージェントはこれを使ってクリックや入力を行います。

主な機能は次のとおりです。

- **複数プロバイダーのクラウド実行** — Browser Use、Browserbase、Firecrawl のいずれか。手元にブラウザは要りません
- **ローカル Chromium 系との連携** — 起動中の Chrome・Brave・Chromium・Edge に CDP でつなぎ、手を動かしながら閲覧できます
- **クラウド側のボット検出対策** — Browser Use Cloud には、ステルス機能・住宅用プロキシ・CAPTCHA の突破が含まれます
- **クラウドのプロファイルを残す** — Browser Use Cloud なら、Cookie・localStorage・保存したパスワードをセッションをまたいで使い回せます
- **セッションの分離** — タスクごとに専用のブラウザセッションが割り当てられます
- **自動クリーンアップ** — 使われていないセッションは一定時間で閉じられます
- **画像の解析** — スクリーンショットと AI の解析で、見た目の情報を理解します

## セットアップ {#setup}

:::tip Nous のサブスクリプション契約者の方へ
[Nous Portal](https://portal.nousresearch.com) の有料サブスクリプションがあれば、個別の API キーなしで **[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)** 経由のブラウザ自動操作が使えます。新規インストールなら `hermes setup --portal` でログインすれば、ゲートウェイのツールをまとめて有効にできます。すでに導入済みなら、`hermes model` または `hermes tools` でブラウザのプロバイダーとして **Nous Subscription** を選んでください。
:::

### Browser Use クラウドモード {#browser-use-cloud-mode}

クラウドブラウザの提供元として Browser Use を使うには、次を追加します。

```bash
# Add to ~/.hermes/.env
BROWSER_USE_API_KEY=***
```

API キーは [browser-use.com](https://browser-use.com) で取得できます。

Browser Use Cloud は、[ステルス機能](https://docs.browser-use.com/cloud/browser/stealth) と [住宅用プロキシ](https://docs.browser-use.com/cloud/browser/proxies) を既定で有効にしたマネージドな Chromium を動かします。CAPTCHA の突破も含まれ、Cookie・localStorage・保存したパスワードを残す [プロファイルの保存](https://docs.browser-use.com/cloud/guides/authentication) にも対応しています。

### Browserbase クラウドモード {#browserbase-cloud-mode}

Browserbase の管理するクラウドブラウザを使うには、次を追加します。

```bash
# Add to ~/.hermes/.env
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=your-project-id-here
```

認証情報は [browserbase.com](https://browserbase.com) で取得できます。

:::note プロバイダーの選び方
上の `.env` のキーが与えるのは **認証情報だけ** です。実際に使うクラウドブラウザは、`hermes tools` → Browser Automation が書き込む `browser.cloud_provider` の選択で決まります（`browserbase`、`browser-use`、`camofox`、または Nous Subscription なら `nous`）。いったん選択が保存されていれば、キーを足したり消したりしてもプロバイダーは切り替わりません。選ばれているプロバイダーのキーが無い場合は、黙って別の経路に回すのではなく、`hermes tools` を実行するよう案内してエラーになります。一度も設定したことがない環境では、手元にある認証情報から自動判定します。
:::

### Browser Use モード（既定） {#browser-use-mode-default}

Browser Use モードは、内蔵のブラウザツールの代わりに [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) を使います。エージェントはブラウザの中で Python を書いて実行し、クリック・入力・ドラッグ・スクレイピングなどページ上の操作を行います。

**これが既定のブラウザモードです**。`browser.backend` が未設定で、かつ `browser-use` CLI が実行できる状態（インストール済み、または `uvx` から使える）なら、エージェントには `browser_exec` という一つのツールが渡されます。CLI が動かせない場合、Hermes は自動的に内蔵のブラウザツールへ戻します。

このモードは **ドライバー** であり、設定済みのブラウザバックエンドと組み合わせて動きます。手元の Chrome、Nous サブスクリプションのクラウドブラウザ、Browserbase、Firecrawl、Browser Use のクラウドブラウザのうち、`hermes tools` → Browser Automation で選ばれているものを動かします。唯一の例外は Camofox で、基盤が接続できる CDP のエンドポイントがないため、Camofox の環境では自動的に内蔵のブラウザツールのままになります。

**セッションの同時実行:** `browser_exec` は `session=<name>` 引数を受け取り、どのバックエンドでも名前ごとにブラウザ作業を分離します。名前ごとに専用の基盤デーモン（専用の IPC ソケット・ログ・状態）が用意され、クラウドバックエンドでは専用のブラウザも割り当てられます。そのため、並列のサブエージェントや同時進行のチャットが一つの接続を奪い合うことがなくなります。`session` を省略すると共有の既定デーモンを使いますが、一度に一つずつ閲覧するぶんには問題ありません。

このモードをやめて内蔵のブラウザツールを強制したい場合は、`/browser use off` を使うか、次のように書きます。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  backend: "off"
```

（明示的にこのモードを強制する `backend: "browser-use"` も引き続き有効です。）

Browser Use 自身のクラウドブラウザには `browser-use auth login` か `BROWSER_USE_API_KEY` が必要です。それ以外のブラウザは、これまでどおりの認証情報をそのまま使います。

:::note
Browser Use モードはモデルが書いた Python を手元の機械で実行するため、`browser_exec`
ツールはターミナルにもアクセスできるセッションにだけ提供されます。ターミナルの
ツール群を持たない設定のプラットフォーム（たとえば権限を絞ったメッセージ用の窓口）
では、既定のブラウザツールが使われます。
:::

### Firecrawl クラウドモード {#firecrawl-cloud-mode}

クラウドブラウザの提供元として Firecrawl を使うには、次を追加します。

```bash
# Add to ~/.hermes/.env
FIRECRAWL_API_KEY=fc-***
```

API キーは [firecrawl.dev](https://firecrawl.dev) で取得できます。取得したら、ブラウザのプロバイダーとして Firecrawl を選びます。

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

### 振り分け: 公開 URL はクラウド、LAN や localhost はローカル {#hybrid-routing-cloud-for-public-urls-local-for-lanlocalhost}

クラウドのプロバイダーが設定されているとき、Hermes は private・ループバック・LAN のアドレスに解決される URL
（`localhost`、`127.0.0.1`、`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`*.local`、`*.lan`、`*.internal`、
IPv6 のループバック `::1`、リンクローカルの `169.254.x.x`）に対して、**ローカルの Chromium サイドカー** を自動で起動します。
公開 URL は同じ会話の中で引き続きクラウドのプロバイダーが処理します。

これで「ローカルで開発しているのに Browserbase を使っている」というよくある状況が解決します。
プロバイダーを切り替えたり SSRF ガードを外したりしなくても、エージェントは `http://localhost:3000` の
ダッシュボードをスクリーンショットしつつ、`https://github.com` をスクレイピングできます。
private な URL がクラウドのプロバイダーに渡ることはありません。

この機能は **既定で有効** です。無効にする（これまでどおり、すべての URL を設定済みの
クラウドのプロバイダーに送る）には次のようにします。

```yaml
# ~/.hermes/config.yaml
browser:
  cloud_provider: browserbase
  auto_local_for_private_urls: false
```

自動の振り分けを無効にすると、private な URL は
`"Blocked: URL targets a private or internal address"` で拒否されます。あわせて
`browser.allow_private_urls: true` を設定すればクラウドのプロバイダーに試させることはできますが、
Browserbase などは手元の LAN に届かないので、たいていうまくいきません。

必要なもの: ローカルのサイドカーは純粋なローカルモードと同じ `agent-browser` CLI を使うので、
インストールしておく必要があります（`hermes setup tools → Browser Automation`
が自動で入れてくれます）。公開 URL から private なアドレスへのリダイレクトは、移動後も
引き続き遮断されます（内部へのリダイレクトを踏み台にして手元の LAN に到達することはできません）。

### 普段のプロファイルで閲覧する（自分のログインを使う） {#real-profile-browsing-use-your-own-logins}

既定では、ローカルの閲覧はまっさらな使い捨てのプロファイルで動くので、エージェントはどのサイトにもログインしていません。
**普段のプロファイルでの閲覧** を有効にすると、手元にある既存のログインや Cookie を引き継ぎ、
エージェントが *自分自身* として閲覧できるようになります。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
```

有効にすると、Hermes は既定のブラウザで **実際に使っている** プロファイル（`Local State → profile.last_used` が指すもので、
Cookie・保存したログイン・各種設定を含みます）を `~/.hermes/browser-profile/<browser>/` の下の管理された複製へ取り込み、
その複製に対して **本物のブラウザの実行ファイル** を起動して、ブラウジングエンジンをそこへ接続します。
同梱の Chromium を mock-keychain のスイッチ付きで起動するのではなく本物の実行ファイルを起動することが、
OS に暗号化された Cookie を復号できる状態に保つ鍵です。macOS では Chrome の Cookie は Keychain 越しに
暗号化されているため、mock-keychain で起動すると Cookie が一つ残らず黙って落ち、サインアウトした状態で
開いてしまいます。生きているブラウザのプロファイルが **直接開かれることはありません**。
複製は別のディレクトリなので、動作中のブラウザとプロファイルのロックを奪い合うこともなく、既定のプロファイルディレクトリ
ではリモートデバッグを許さない Chrome 136 以降の制限も避けられます。認証まわりのファイル（Cookie・ログイン・設定）は
新しいセッションが立ち上がるたびに実際のプロファイルから同期し直されるので、自分のブラウザで済ませたログインが
エージェントのセッションにも反映されます。複製されるのは実際に使っているプロファイルだけで、他の Chrome の
プロファイルが取り込まれることはありません。

複製を動かすブラウザは **ヘッドレス** で動作します。窓を出さず背景で自分のプロファイルを操作し、フォーカスを
奪うこともないので、エージェントが代わりに投稿したりフォームを埋めたり情報を集めたりしている間も、こちらは
そのまま作業を続けられます（ここでのヘッドレスは Chrome の *新しい* ヘッドレスモードで、普段の Cookie の
保管場所を読むため、ログイン状態はそのまま引き継がれます）。動いているところを見たいときは、
[窓を出すモード](#headed-mode-visible-browser-window) の切り替えがここでも使えます。
`browser.headed: true`（または `AGENT_BROWSER_HEADED=1`）にすれば、普段のプロファイルの閲覧でも
見える窓が開きます。画面のないホスト（サーバーや CI）では、設定にかかわらず常にヘッドレスで動きます。

ブラウザに複数のプロファイル（仕事用と個人用など）があり、「最後に触ったプロファイル」でエージェントの
身元が決まってしまうのが困る場合は、複製の取得元をはっきり指定できます。

```yaml
# ~/.hermes/config.yaml
browser:
  use_real_profile: true
  real_profile_pin: "Profile 2"   # directory name under the browser's user-data dir
```

存在しないプロファイルのディレクトリを指定した場合は、直し方のわかるメッセージを出して安全側で止まります。
黙って最後に使ったプロファイルに戻ることはありません。

この設定を切り戻すと、Hermes は次にブラウザを使うときに複製の保管場所（`~/.hermes/browser-profile/`）を削除します。
許可を取り消したあとに、複製された認証情報が残り続けることはありません。

:::note Windows ではブラウザを完全に終了してください
Windows では、動作中の Chrome / Edge / Brave が Cookie とログイン情報のデータベースを排他（他をすべて拒む）ロックで
押さえているため、ブラウザが開いている間 Hermes はそれらを複製できません。固まったりサインアウト状態のセッションを
作ったりせず、「ブラウザを完全に終了してからやり直してください」というメッセージですぐに失敗します。そのため
Windows で普段のプロファイルの閲覧を使うには、ブラウザを **完全に終了** させる必要があります。背景やタスクトレイに
残っているものも含みます（Chrome の「閉じた後もバックグラウンドアプリの処理を続行する」設定は、窓を閉じたあとも
`chrome.exe` を生かしたままにします）。macOS と Linux では、ブラウザが動いていてもプロファイルを複製できます。

`browser.real_profile_autoclose: true` を設定すると、プロファイルが押さえられているときに Hermes が
**ブラウザを閉じましょうかと申し出る** ようになります。これを有効にしても、Hermes が勝手に閉じることはありません。
プロファイルがロックされていれば必ずそこで止まり、エージェントが先に確認します。承諾したときだけ
`hermes browser close-profile`（そのプロファイルに結びついたブラウザのプロセス群を終了させます。保存していないタブは
失われます）を実行し、そのうえでやり直します。それでもプロファイルがロックされたままなら（背景やタスクトレイの
インスタンスが立ち上がり直した場合など）、Hermes は止まったままブラウザを完全に終了するよう伝えます。自分から
繰り返したり、もう一度終了させにいったりはしません。
:::

- **対応するブラウザ:** Chrome、Edge、Brave、Brave Origin、Chromium（OS の既定になっているもの）。既定が Chromium 系でない場合
  （Firefox など）は、当て推量をせず、はっきりしたメッセージを出して安全側で止まります。
- **どのバックエンドでも動きます。** ローカルのバックエンドなら、この設定を有効にするだけで自動的に使われます。
  **クラウド** のブラウザバックエンドの下でも、エージェントは `browser_exec` ツールの `local` 引数で、
  必要なときに普段のプロファイルのローカルセッションを開けます（この引数がツールに現れるのは、この設定が
  有効なときだけです）。それ以外はこれまでどおりクラウドのバックエンドが処理します。
- **安全面の位置づけ:** これは許可を前提にした便利機能であって、隔離の境界ではありません。エージェントが開いた
  ページは本物のログイン状態で動くので、エージェントに自分の代わりを務めさせたいときだけ有効にしてください。
  既定では無効です。
- **デスクトップ版:** **Capabilities → Tools → Browser → Use My Real Browser Profile** で切り替えます
  （この切り替えはバックエンドの選択肢の上にあります）。Settings → Config の `browser` の節からでも設定できます。

### Camofox ローカルモード {#camofox-local-mode}

[Camofox](https://github.com/jo-inc/camofox-browser) は、Camoufox（C++ で指紋偽装を行う Firefox のフォーク）を包んだ、自分で立てる Node.js のサーバーです。クラウドに依存せず、検出されにくい閲覧をローカルで行えます。

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

`make up` を実行すると既定のコンテナがすぐ立ち上がります。Node のヒープを大きくしたい、VNC を使いたい、プロファイルのディレクトリを残したいといった独自の実行設定が必要なら、まずイメージをビルドしてから自分で起動してください。

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

VNC を有効にするとブラウザは画面ありで動き、`http://localhost:6080`（noVNC）から手元のブラウザで様子をそのまま見られます。ネイティブの VNC クライアントを `localhost:5901` につなぐこともできます。

すでに `make up` を実行しているなら、独自のコンテナを起動する前に既定のコンテナを停止して削除してください。

```bash
make down
# then run the custom docker run command above
```

そのうえで `~/.hermes/.env` に次を設定します。

```bash
CAMOFOX_URL=http://localhost:9377
```

Camofox を Docker で動かしていて、ホスト側で動かしている Web アプリを開かせたい場合は、ループバックの書き換えを有効にします。`CAMOFOX_URL` はホスト側で公開している制御 API を指したままにしますが、`http://127.0.0.1:3000` のようなページの URL は、コンテナの中からは `http://host.docker.internal:3000` として開く必要があります。

```yaml
# ~/.hermes/config.yaml
browser:
  camofox:
    rewrite_loopback_urls: true
    loopback_host_alias: host.docker.internal  # default; use a LAN IP if needed
```

同じ内容の環境変数は次のとおりです。

```bash
CAMOFOX_REWRITE_LOOPBACK_URLS=true
CAMOFOX_LOOPBACK_HOST_ALIAS=host.docker.internal
```

書き換えが効くのは、ループバックのホスト（`localhost`、`127.0.0.1`、`::1`）を含むページ移動の URL だけです。`CAMOFOX_URL` は変更されません。Docker を使わない Camofox の環境では、ブラウザがすでにホスト上で動いておりループバックの URL はそのままで正しいので、無効のままにしておいてください。

`hermes tools` → Browser Automation → Camofox から設定することもできます。

Camofox の選び方は他のブラウザバックエンドと同じです。`hermes tools` → Browser Automation で **Camofox** を選ぶと、`config.yaml` に `browser.cloud_provider: camofox` が書き込まれます。`CAMOFOX_URL` はサーバーのアドレスにすぎず、ブラウザの選択が保存されている状態では、これを設定するだけではバックエンドは切り替わりません（一度も設定したことがない環境では、これまでどおり自動判定します）。

#### ブラウザセッションを残す {#persistent-browser-sessions}

既定では、Camofox のセッションごとにランダムな身元が割り当てられるため、Cookie やログイン状態はエージェントを再起動すると消えます。セッションを残すには、`~/.hermes/config.yaml` に次を追加します。

```yaml
browser:
  camofox:
    managed_persistence: true
```

そのあと、新しい設定が読み込まれるように Hermes を完全に再起動してください。

:::warning ネストの位置に注意
Hermes が読むのは `browser.camofox.managed_persistence` であって、トップレベルの `managed_persistence` では **ありません**。よくある間違いは次の書き方です。

```yaml
# ❌ Wrong — Hermes ignores this
managed_persistence: true
```

この設定を間違った位置に置くと、Hermes は黙ってランダムな使い捨ての `userId` に戻り、ログイン状態はセッションごとに失われます。
:::

##### Hermes がすること
- プロファイルごとに決まる `userId` を Camofox に送り、サーバーが同じ Firefox のプロファイルをセッションをまたいで再利用できるようにします。
- クリーンアップ時にサーバー側のコンテキスト破棄を行わないので、Cookie とログイン状態がエージェントの作業をまたいで残ります。
- `userId` を実行中の Hermes のプロファイル単位に閉じるので、Hermes のプロファイルが違えばブラウザのプロファイルも別になります（プロファイルの分離）。

##### Hermes がしないこと
- Camofox サーバーに保存を強制することはしません。Hermes が送るのは安定した `userId` だけで、その `userId` を永続的な Firefox のプロファイルディレクトリに結びつけるのはサーバー側の役目です。
- 使っている Camofox サーバーのビルドが、すべてのリクエストを使い捨てとして扱う（たとえば保存済みのプロファイルを読み込まずに常に `browser.newContext()` を呼ぶ）場合、Hermes の側からセッションを残すことはできません。userId ごとのプロファイル保存に対応した Camofox のビルドを使っているか確認してください。

##### 動いているか確かめる

1. Hermes と Camofox サーバーを起動します。
2. ブラウザの作業で Google（またはログインのあるサイト）を開き、手でサインインします。
3. ブラウザの作業を普通に終わらせます。
4. 新しいブラウザの作業を始めます。
5. 同じサイトをもう一度開きます。サインインしたままのはずです。

手順 5 でログアウトしているなら、Camofox サーバーが安定した `userId` を尊重していません。設定の位置をもう一度確認し、`config.yaml` を編集したあとに Hermes を完全に再起動したかを確かめ、Camofox サーバーのバージョンがユーザーごとのプロファイル保存に対応しているか確認してください。

##### 状態の置き場所

Hermes は、プロファイル単位のディレクトリ `~/.hermes/browser_auth/camofox/`（既定以外のプロファイルでは `$HERMES_HOME` 配下の同等の場所）から安定した `userId` を導き出します。実際のブラウザのプロファイルデータは Camofox サーバー側に、その `userId` を鍵として保存されます。保存されたプロファイルを完全に消したい場合は、Camofox サーバー側で消したうえで、対応する Hermes プロファイルの状態ディレクトリを削除してください。

#### 外部が管理する Camofox セッション {#externally-managed-camofox-sessions}

別のアプリ（デスクトップの助手、独自の連携、他のエージェントなど）が目に見える Camofox のブラウザを動かしている場合は、Hermes が自分専用の分離されたプロファイルを立ち上げるのではなく、その同じ身元の中で動くように設定します。

挙動を決めるつまみは三つあります。

| 設定 | 環境変数 | 効果 |
|---------|---------|--------|
| `browser.camofox.user_id` | `CAMOFOX_USER_ID` | Hermes がタブを作るときに使う Camofox の `userId`。これを設定すると、そのセッションは「外部が管理する」モードに入ります。 |
| `browser.camofox.session_key` | `CAMOFOX_SESSION_KEY` | タブの作成時に送られる `sessionKey`（別名 `listItemId`）。既存のタブを引き継ぐときの照合に使います。未設定なら作業ごとの値が既定になります。 |
| `browser.camofox.adopt_existing_tab` | `CAMOFOX_ADOPT_EXISTING_TAB` | 有効にすると、Hermes は最初の利用時に `GET /tabs?userId=<user_id>` を呼び、新しいタブを作る前に既存のタブを再利用します。 |

環境変数は `config.yaml` より優先されます。どちらの書き方でも構いません。

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

**`user_id` を設定すると何が変わるか:**

- Hermes は作業の終わりに破壊的なクリーンアップを行いません（`managed_persistence: true` と同じ挙動です）。別アプリのタブ・Cookie・プロファイルはそのまま残ります。
- Hermes は `DELETE /sessions/<user_id>` を **呼びません**。このエンドポイントはユーザーのデータをすべて消すため、実行すると外部アプリのセッションまで消し飛ばしてしまうからです。

**タブの引き継ぎはどう動くか（`adopt_existing_tab: true` のとき）:**

1. プロセス起動後の最初のブラウザツール呼び出しで、Hermes は `GET /tabs?userId=<user_id>` を発行します（タイムアウトは 5 秒）。
2. 応答の中に `listItemId == session_key` のタブがあれば、そのグループのうち最後に作られたものを引き継ぎます。
3. 無ければ、そのユーザーが最後に作ったタブを引き継ぎます（`listItemId` は問いません）。
4. タブが一つも無い場合やリクエストが失敗した場合は、次の操作で新しいタブを作る動きに戻ります。

引き継ぎが行われるのは、そのセッションの `tab_id` が埋まるまでです。引き継いだタブを外部アプリが途中で閉じてしまうと、次のブラウザツール呼び出しで Camofox のエラーが出ます。Hermes は呼び出しのたびに新しいタブを探し直したりはしません。

**`session_key` の決め方:** *特定の* 既存タブに確実につなぎたいなら、外部アプリがそのタブを作ったときに使った `listItemId` を `session_key` に設定してください。`session_key` を未設定のまま `user_id` だけを設定した場合、Hermes は作業ごとの `session_key`（`task_<id>`）を生成します。この場合、Cookie とプロファイルは外部アプリと共有しますが、既存のタブを再利用せず自分のタブを隣に開きます。

**同時実行についての注意:** 外部アプリと Hermes が同じ Camofox の `userId` を同時に動かすことはできますが、Camofox はクライアント間でタブごとの焦点を調整しません。どちらが操作するかはアプリケーション側で決めてください（たとえば Hermes が動いている間は外部アプリを止める、など）。

#### VNC でのライブ表示 {#vnc-live-view}

Camofox を画面ありのモード（ブラウザの窓が見える状態）で動かすと、ヘルスチェックの応答に VNC のポートが載ります。Hermes はこれを自動で見つけ、ページ移動の応答に VNC の URL を含めるので、エージェントはブラウザの様子をそのまま見られるリンクを共有できます。

### Lightpanda ローカルエンジン {#lightpanda-local-engine}

[Lightpanda](https://lightpanda.io) は、ゼロから書かれたオープンソースのヘッドレスブラウザです。起動は一瞬、動作は Chrome の 9 倍速く、メモリは 16 分の 1 で済みます。小さな VM の上で長時間動き続けるエージェントには、この差が効いてきます。

Lightpanda は **ローカルエンジン** で、クラウドのプロバイダーではなくローカルの `agent-browser` の経路の下で選びます。バイナリをインストールして `PATH` に置き（[Lightpanda のインストール手順](https://lightpanda.io/docs) を参照）、次を設定します。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  engine: lightpanda
```

環境変数でも設定できます。

```bash
AGENT_BROWSER_ENGINE=lightpanda
```

Hermes は、ローカルの Chrome を動かすときと同じように、`agent-browser` を通して CDP 越しに Lightpanda を動かします。

**Chrome への自動フォールバック。** Lightpanda はまだ Chrome のすべてをカバーしているわけではないので、この連携は邪魔にならないように作られています。対応している操作は Lightpanda が処理し、そうでないものは Hermes が裏で Chrome にやり直させます。対応しているのはエージェントの中心的な流れ、つまり移動・スナップショット・クリック・入力・スクロール・戻る・キー押下・評価です。スクリーンショットも Chrome に回されます。Lightpanda には描画エンジンが無いためで、同じ理由から `browser_vision` は最初から Chrome に振り分けられます。

### CDP 経由でローカルの Chromium 系ブラウザを使う（`/browser connect`） {#local-chromium-family-browser-via-cdp-browser-connect}

クラウドのプロバイダーを使う代わりに、Chrome DevTools Protocol（CDP）を通して、起動中の自分の Chrome・Brave・Chromium・Edge に Hermes のブラウザツールをつなげられます。エージェントの動きをその場で見たいとき、自分の Cookie やセッションが必要なページを扱いたいとき、クラウドブラウザの費用を避けたいときに向いています。

:::note
`/browser connect` は **対話式 CLI のスラッシュコマンド** で、ゲートウェイからは実行されません。WebUI、Telegram、Discord などゲートウェイ経由のチャットで実行しようとすると、その文字列はただのテキストとしてエージェントに送られ、コマンドは実行されません。ターミナルから Hermes を起動し（`hermes` または `hermes chat`）、そこで `/browser connect` を実行してください。
:::

CLI では次のように使います。

```
/browser connect                 # Auto-launch/connect to a local Chromium-family browser at http://127.0.0.1:9222
/browser connect ws://host:port  # Connect to a specific CDP endpoint
/browser status                  # Check current connection
/browser disconnect              # Detach and return to cloud/local mode
```

リモートデバッグを有効にしたブラウザがまだ動いていない場合、Hermes は対応する Chromium 系のブラウザを `--remote-debugging-port=9222` 付きで自動起動しようとします。検出の対象は Brave、Brave Origin / Nightly、Google Chrome、Chromium、Microsoft Edge で、`brave-origin`、`brave-origin-nightly`、`/opt/brave.com/brave-origin/brave-origin`、`/opt/brave.com/brave-origin-nightly/brave-origin`、`/opt/brave-bin/brave`、`/snap/bin/brave` といった Linux でよくあるインストール先や実行ファイル名も見ます。

:::tip
Chromium 系のブラウザを手動で CDP 有効のまま起動するときは、専用の user-data-dir を指定してください。そうしないと、普段のプロファイルでブラウザがすでに動いている場合にデバッグ用のポートが開きません。

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

そのうえで Hermes の CLI を起動し、`/browser connect` を実行します。

**なぜ `--user-data-dir` が要るのか。** これを付けずに Chromium 系のブラウザを起動すると、通常のインスタンスがすでに動いている場合はたいてい既存のプロセスに新しい窓が開くだけになります。その既存のプロセスは `--remote-debugging-port` 付きで起動されていないので、9222 番のポートはいつまでも開きません。専用の user-data-dir を指定すれば、デバッグ用のポートが実際に待ち受ける新しいブラウザのプロセスが必ず立ち上がります。`--no-first-run --no-default-browser-check` は、新しいプロファイルの初回起動ウィザードを飛ばすためのものです。

**Chrome 136 以降では専用プロファイルが必須です。** セキュリティ強化として、Chrome 136 以降は `--remote-debugging-port` を *既定の* user-data-dir と組み合わせた場合、リモートデバッグのポートを黙って開かなくなりました。他に Chrome が動いていない状態で起動しても同じです。ブラウザは普通に立ち上がるのに 9222 番では誰も待ち受けていないので、`/browser connect`（や手動の `curl http://127.0.0.1:9222/json/version`）は接続拒否で失敗します。エラーメッセージは出ません。直し方は上のコマンドそのもので、既定のプロファイルとは別の場所（たとえば `$HOME/.hermes/chrome-debug`）を指す `--user-data-dir` を必ず渡してください。これはこの変更を取り込んだ Chrome、Chromium、Edge、Brave のビルドに当てはまります。
:::

CDP でつながっている間は、すべてのブラウザツール（`browser_navigate`、`browser_click` など）が、クラウドのセッションを立ち上げるのではなく、目の前の生きたブラウザに対して動きます。

### WSL2 と Windows の Chrome: `/browser connect` より MCP を選ぶ {#wsl2-windows-chrome-prefer-mcp-over-browser-connect}

Hermes が WSL2 の中で動いていて、操作したい Chrome の窓は Windows のホスト側にある、という場合、`/browser connect` は最善の道でないことが多いです。

理由は次のとおりです。

- `/browser connect` は、Hermes 自身が使える CDP のエンドポイントに届くことを前提にしています
- 最近の Chrome のライブデバッグのセッションは、昔ながらの `9222` ポートのようには WSL から直接届かない、ホストに閉じたエンドポイントを出すことがよくあります
- Windows の Chrome がデバッグ可能な場合でも、Windows 側のブラウザ用 MCP サーバーを Chrome につないで、Hermes はその MCP サーバーと話す形にするのが一番きれいなことが多いです

この構成では、Hermes の MCP 対応を通した `chrome-devtools-mcp` をおすすめします。

実際の手順は MCP の案内を参照してください。

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/#wsl2-bridge-hermes-in-wsl-to-windows-chrome)

### ローカルブラウザモード {#local-browser-mode}

クラウドの認証情報を **一つも** 設定せず、`/browser connect` も使わない場合でも、Hermes は `agent-browser` が動かすローカルの Chromium を通してブラウザツールを使えます。

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

# Local browser engine. Applies to the built-in browser tools
# (agent-browser path). Equivalent to browser.engine in config.yaml.
#   auto       — agent-browser's default (currently Chrome)
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

何かを入れておく必要はありません。`agent-browser` は、ブラウザツールを最初に使ったときに
`npx agent-browser` として自動的に解決されます。初回の npx 取得を避けたい場合は、
先に全体へインストールしておくこともできます（任意）。

```bash
npm install -g agent-browser
```

:::info
`browser` のツール群は、設定の `toolsets` の一覧に入っているか、`hermes config set toolsets '["hermes-cli", "browser"]'` で有効にしておく必要があります。
:::

## 使えるツール {#available-tools}

### `browser_navigate` {#browsernavigate}

URL に移動します。他のどのブラウザツールより先に呼ぶ必要があります。Browserbase のセッションもここで初期化されます。

```
Navigate to https://github.com/NousResearch
```

:::tip
単に情報を取ってくるだけなら、`web_search` か `web_extract` のほうが速くて安上がりです。ブラウザツールは、ページを **操作** する必要があるとき（ボタンを押す、フォームを埋める、動的な内容を扱う）に使ってください。
:::

### `browser_snapshot` {#browsersnapshot}

いま開いているページのアクセシビリティツリーを、テキスト形式のスナップショットとして取ります。操作できる要素は `@e1`、`@e2` のような参照 ID 付きで返り、`browser_click` や `browser_type` で使えます。

- **`full=false`**（既定）: 操作できる要素だけを載せた簡潔な表示
- **`full=true`**: ページの内容すべて

`browser.snapshot_threshold`（既定は 15,000 文字。`web_extract` と同じ、ページごとの上限）を超えるスナップショットは、行の切れ目で自動的に切り詰められます。LLM による要約は挟みません。切り詰めが起きたときは、完全なスナップショットが `~/.hermes/cache/web/` に保存され、ツールの出力にそのファイルパスとすぐ使える `read_file` の呼び出しが載ります。エージェントは取り直すことなく、切り落とされた先の要素の参照も含めてアクセシビリティツリー全体を読み進められます。

長いページで、より多くの内容をそのままエージェントに届けたい場合は、上限を引き上げます。

```yaml
# ~/.hermes/config.yaml
browser:
  snapshot_threshold: 30000
```

`hermes config set browser.snapshot_threshold 30000` でも構いません。この設定は、明示的な `browser_snapshot` の呼び出しにも、移動のあとに自動で返るスナップショットにも効きます。Camofox のバックエンドも対象です（最小値は 1000）。変更したら、ブラウザ設定のキャッシュが読み直されるように、いま動いている Hermes のセッションを再起動してください。

### `browser_click` {#browserclick}

スナップショットの参照 ID で指定した要素をクリックします。

```
Click @e5 to press the "Sign In" button
```

### `browser_type` {#browsertype}

入力欄に文字を打ちます。先に欄を空にしてから、新しい文字を入れます。

```
Type "hermes agent" into the search field @e3
```

### `browser_scroll` {#browserscroll}

ページを上下にスクロールして、続きの内容を出します。

```
Scroll down to see more results
```

### `browser_press` {#browserpress}

キーボードのキーを押します。フォームの送信やページ移動に便利です。

```
Press Enter to submit the form
```

対応しているキー: `Enter`、`Tab`、`Escape`、`ArrowDown`、`ArrowUp` など。

### `browser_back` {#browserback}

ブラウザの履歴をたどって、前のページに戻ります。

### `browser_get_images` {#browsergetimages}

いま開いているページの画像を、URL と代替テキストごと一覧します。解析したい画像を探すのに便利です。

### `browser_vision` {#browservision}

スクリーンショットを撮って、画像を扱える AI で解析します。テキストのスナップショットでは大事な見た目の情報が拾えないときに使ってください。CAPTCHA、込み入ったレイアウト、目視での確認が要る場面でとくに役立ちます。

スクリーンショットは消えない形で保存され、AI の解析結果と一緒にファイルパスが返ります。メッセージ系のプラットフォーム（Telegram、Discord、Slack、WhatsApp）では、エージェントにスクリーンショットの共有を頼めます。`MEDIA:` の仕組みを通して、その場の写真の添付として送られます。

```
What does the chart on this page show?
```

スクリーンショットは `~/.hermes/cache/screenshots/` に置かれ、24 時間で自動的に片付けられます。

### `browser_console` {#browserconsole}

いま開いているページから、ブラウザのコンソール出力（log / warn / error のメッセージ）と、捕捉されなかった JavaScript の例外を取ります。アクセシビリティツリーには出てこない、静かな JS のエラーを見つけるのに欠かせません。

```
Check the browser console for any JavaScript errors
```

`clear=True` を使うと読み取り後にコンソールを消せるので、次からの呼び出しでは新しいメッセージだけが出ます。

`browser_console` は `expression` 引数付きで呼ぶと JavaScript の評価も行います。形は DevTools のコンソールと同じで、結果は解析済みで返ります（JSON 化されたオブジェクトは辞書になり、単純な値は単純な値のままです）。

```
browser_console(expression="document.querySelector('h1').textContent")
browser_console(expression="JSON.stringify(performance.timing)")
```

そのセッションで CDP の監督役が動いている場合（CDP に対応したバックエンドに対して `browser_navigate` を実行したセッションなら、たいていそうなります）、評価は監督役が保持している WebSocket の上で走るため、子プロセスの起動コストがかかりません。そうでない場合は通常の agent-browser CLI の経路に落ちます。挙動はどちらでも同じで、変わるのは待ち時間だけです。

評価は既定では制限されていません。エージェントは `fetch` を使い、ストレージを読み、フォームの値を調べ、DOM からの抽出を何でも実行できます。private や内部のアドレスを狙うリクエストは、ローカル以外のバックエンドでは引き続き遮断されます（SSRF ガードはこの設定とは独立しています）。ログイン済みのプロファイルで危険なページを見て回るなら、機微な JS の機能（Cookie、ストレージ、クリップボード、ネットワーク呼び出し、フォームの値）を厳しく拒否する一覧を、`config.yaml` の `browser.restrict_evaluate: true` で有効にできます。この拒否の一覧は機能の *名前* で照合するので、`fetch` や `cookie` といった語をたまたま含むだけの正当な式まで止まる点にご注意ください。

### `browser_cdp` {#browsercdp}

Chrome DevTools Protocol をそのまま通す機能で、他のツールでは届かないブラウザ操作のための逃げ道です。ネイティブのダイアログの処理、iframe に閉じた評価、Cookie やネットワークの制御など、エージェントが必要とする CDP のコマンドを何でも呼べます。

**使えるのは、セッション開始の時点で CDP のエンドポイントに届く場合だけです**。つまり `/browser connect` で起動中の Chrome・Brave・Chromium・Edge につながっているか、`config.yaml` に `browser.cdp_url` が設定されている場合です。既定のローカル agent-browser モード、Camofox、クラウドのプロバイダー（Browserbase、Browser Use、Firecrawl）は、いまのところこのツールに CDP を出していません。クラウドのプロバイダーにはセッションごとの CDP の URL がありますが、生きたセッションへの振り分けは今後の課題です。

**CDP のメソッド一覧:** https://chromedevtools.github.io/devtools-protocol/ — エージェントは特定のメソッドのページを `web_extract` して、引数と戻り値の形を調べられます。

よくある使い方は次のとおりです。

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

ブラウザ全体に効くメソッド（`Target.*`、`Browser.*`、`Storage.*`）は `target_id` を省きます。ページ単位のメソッド（`Page.*`、`Runtime.*`、`DOM.*`、`Emulation.*`）には、`Target.getTargets` から得た `target_id` が必要です。呼び出しはそれぞれ独立していて状態を持たず、セッションが次の呼び出しに引き継がれることはありません。

**オリジンをまたぐ iframe:** `frame_id`（`browser_snapshot.frame_tree.children[]` のうち `is_oopif=true` のもの）を渡すと、その iframe に対する監督役の生きたセッションを通して CDP の呼び出しが流れます。Browserbase 上でオリジンをまたぐ iframe の中の `Runtime.evaluate` が動くのはこの仕組みのおかげで、状態を持たない CDP の接続では署名付き URL の期限切れに当たってしまいます。例:

```
browser_cdp(
  method="Runtime.evaluate",
  params={"expression": "document.title", "returnByValue": True},
  frame_id="<frame_id from browser_snapshot>",
)
```

同じオリジンの iframe に `frame_id` は要りません。トップレベルの `Runtime.evaluate` から `document.querySelector('iframe').contentDocument` を使ってください。

### `browser_dialog` {#browserdialog}

ネイティブの JS ダイアログ（`alert` / `confirm` / `prompt` / `beforeunload`）に応答します。このツールが無かった頃は、ダイアログが黙ってページの JavaScript を止めてしまい、あとに続く `browser_*` の呼び出しが固まったり例外を投げたりしていました。いまは待機中のダイアログが `browser_snapshot` の出力に現れ、エージェントが明示的に応答できます。

**手順:**
1. `browser_snapshot` を呼びます。ダイアログがページを止めていれば、`pending_dialogs: [{"id": "d-1", "type": "alert", "message": "..."}]` として現れます。
2. `browser_dialog(action="accept")` か `browser_dialog(action="dismiss")` を呼びます。`prompt()` のダイアログには `prompt_text="..."` で返す文字列を渡します。
3. もう一度スナップショットを取ります。`pending_dialogs` は空になり、ページの JS が動き出しています。

**検出は自動で行われます**。作業ごとに一つ、Page / Runtime / Target のイベントを購読する WebSocket を持つ CDP の監督役が常駐しているためです。この監督役はスナップショットに `frame_tree` の項目も入れるので、エージェントはオリジンをまたぐ iframe（OOPIF）も含めて、いまのページの iframe の構造を見られます。

**対応状況の表:**

| バックエンド | `pending_dialogs` による検出 | 応答（`browser_dialog` ツール） |
|---|---|---|
| `/browser connect` または `browser.cdp_url` 経由のローカル Chrome | ✓ | ✓ すべての手順が使えます |
| Browserbase | ✓ | ✓ すべての手順が使えます（注入した XHR の橋渡し経由） |
| Camofox / 既定のローカル agent-browser | ✗ | ✗（CDP のエンドポイントが無いため） |

**Browserbase ではどう動くか。** Browserbase の CDP プロキシは、本物のネイティブのダイアログをサーバー側で 10 ミリ秒ほどで自動的に閉じてしまうため、`Page.handleJavaScriptDialog` は使えません。そこで監督役は `Page.addScriptToEvaluateOnNewDocument` で小さなスクリプトを注入し、`window.alert` / `confirm` / `prompt` を同期の XHR に差し替えます。その XHR を `Fetch.enable` で横取りし、エージェントの応答を載せた `Fetch.fulfillRequest` を呼ぶまで、ページの JS は XHR の待ちで止まったままになります。`prompt()` の戻り値も、そのままページの JS に返ります。

**ダイアログの扱い方** は `config.yaml` の `browser.dialog_policy` で設定します。

| 方針 | 挙動 |
|--------|----------|
| `must_respond`（既定） | 捕まえてスナップショットに出し、明示的な `browser_dialog()` の呼び出しを待ちます。`browser.dialog_timeout_s`（既定 300 秒）が過ぎたら安全のため自動で閉じるので、不具合のあるエージェントが永久に止まることはありません。 |
| `auto_dismiss` | 捕まえて、すぐ閉じます。エージェントは `browser_state` の履歴でダイアログを見られますが、対応する必要はありません。 |
| `auto_accept` | 捕まえて、すぐ受け入れます。しつこい `beforeunload` の確認が出るページを渡り歩くときに便利です。 |

**フレームの木構造** は `browser_snapshot.frame_tree` の中にあり、広告の多いページでも大きくなりすぎないよう、30 フレーム・OOPIF の深さ 2 で打ち切られます。上限に当たると `truncated: true` の印が付きます。木全体が必要なエージェントは、`browser_cdp` で `Page.getFrameTree` を呼べます。

## 実際の例 {#practical-examples}

### Web フォームを埋める {#filling-out-a-web-form}

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

### 動的な内容を調べる {#researching-dynamic-content}

```
User: What are the top trending repos on GitHub right now?

Agent workflow:
1. browser_navigate("https://github.com/trending")
2. browser_snapshot(full=true)  → reads trending repo list
3. Returns formatted results
```

## セッションの録画 {#session-recording}

ブラウザのセッションを WebM の動画として自動的に録画できます。

```yaml
browser:
  record_sessions: true  # default: false
```

有効にすると、最初の `browser_navigate` で録画が始まり、セッションが閉じたときに `~/.hermes/browser_recordings/` へ保存されます。ローカルでもクラウド（Browserbase）でも動きます。72 時間より古い録画は自動的に片付けられます。

## 画面ありのモード（ブラウザの窓が見える） {#headed-mode-visible-browser-window}

既定では、ローカルのブラウザはヘッドレスで動きます。画面ありのモードを有効にすると、自分で見たり触ったりできる Chromium の窓が出ます。

```yaml
browser:
  headed: true  # default: false
```

環境変数 `AGENT_BROWSER_HEADED=1` でも設定できます。

画面ありのモードがすることは二つです。

1. **窓の見える Chromium を起動します**（ローカルモードでは agent-browser に `--headed` を渡します）。
2. **やり取りをまたいで窓を開いたままにします。** 通常はエージェントが返答するたびにブラウザのセッションが片付けられますが、画面ありのモードでは毎回のクリーンアップを飛ばします。そのため、エージェントの作業を眺めたり、手で割り込んだり（サインインの確認や CAPTCHA）、会話の間ログイン状態を保ったままにできます。

放置されたセッションは `browser.inactivity_timeout`（既定ではブラウザの活動が 120 秒無いこと）で回収されますし、終了時にはすべてのセッションが閉じられます。画面ありのモードが効くのはローカルのブラウザだけで、クラウドのセッション（Browserbase）には影響しません。

## ステルス機能 {#stealth-features}

Browserbase は次のステルス機能を自動で提供します。

| 機能 | 既定 | 補足 |
|---------|---------|-------|
| 基本のステルス | 常に有効 | 指紋のランダム化、表示領域のランダム化、CAPTCHA の突破 |
| 住宅用プロキシ | 有効 | 住宅用の IP を経由し、アクセスしやすくします |
| 高度なステルス | 無効 | 独自ビルドの Chromium。Scale Plan が必要です |
| Keep Alive | 有効 | ネットワークが途切れたあとにセッションを繋ぎ直します |

:::note
契約しているプランで有料の機能が使えない場合、Hermes は自動的に段階を下げます。まず `keepAlive` を切り、次にプロキシを切るので、無料プランでも閲覧は続けられます。
:::

## セッションの管理 {#session-management}

- 作業ごとに、Browserbase の分離されたブラウザセッションが割り当てられます
- 使われていないセッションは自動的に片付けられます（既定: 2 分）
- 背後のスレッドが 30 秒ごとに、古くなったセッションを調べます
- プロセス終了時には緊急のクリーンアップが走り、セッションが取り残されるのを防ぎます
- セッションは Browserbase の API で解放されます（`REQUEST_RELEASE` の状態）

## 制限 {#limitations}

- **テキストによる操作** — ピクセルの座標ではなく、アクセシビリティツリーに頼っています
- **スナップショットの大きさ** — 大きなページは `browser.snapshot_threshold` で切り詰められます（既定は 15,000 文字で、`web_extract` と同じ。LLM による要約はありません）。完全なスナップショットは `~/.hermes/cache/web/` に保存され、出力がその場所を示すので `read_file` で読み進められます
- **セッションのタイムアウト** — クラウドのセッションは、契約しているプランの設定に従って期限切れになります
- **費用** — クラウドのセッションはプロバイダーのクレジットを消費します。会話が終わったとき、または放置されたときに自動で片付けられます。無料でローカルの閲覧をしたい場合は `/browser connect` を使ってください
- **ファイルのダウンロード不可** — ブラウザからファイルを落とすことはできません
