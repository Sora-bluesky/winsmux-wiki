---
title: "ブラウザ自動操作"
description: "複数の提供元、CDP 経由のローカルな Chromium 系ブラウザ、あるいはクラウドのブラウザでブラウザを操作し、ウェブとのやり取り、入力欄の記入、収集などを行います。"
upstream_path: user-guide/features/browser.md
upstream_blob: f9687772011c83fa865a3d331411907a03907457
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/browser
---

# ブラウザ自動操作 {#browser-automation}

Hermes Agent には、複数の裏側の選択肢を備えた本格的なブラウザ自動操作の道具一式が入っています。

- **Browserbase クラウドモード** — [Browserbase](https://browserbase.com) 経由で、運用込みのクラウドブラウザと対ボット対策の仕組みを使います
- **Browser Use クラウドモード** — [Browser Use](https://browser-use.com) 経由で、もう一つのクラウドブラウザ提供元として使います
- **Browser Use モード** — [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) 経由。ウェブ上の作業で最高水準の新しいブラウザ基盤で、手元の Chrome や Browser Use のクラウドブラウザを動かします
- **Firecrawl クラウドモード** — [Firecrawl](https://firecrawl.dev) 経由で、収集機能を内蔵したクラウドブラウザを使います
- **Camofox ローカルモード** — [Camofox](https://github.com/jo-inc/camofox-browser) 経由で、手元での検知回避ブラウジング（Firefox 系の指紋偽装）を行います
- **Lightpanda ローカルエンジン** — [Lightpanda](https://lightpanda.io) 経由。機械のためにゼロから Zig で書かれたヘッドレスブラウザで、起動が一瞬、メモリは Chrome の 16 分の 1、速度は 9 倍です。まだ対応していない操作は自動で Chrome に回されます
- **ローカルの Chromium 系 CDP** — `/browser connect` を使って、手元の Chrome、Brave、Chromium、Edge にブラウザ用ツールをつなぎます
- **ローカルブラウザモード** — `agent-browser` CLI と手元の Chromium を使います

どのモードでも、エージェントはウェブサイトを移動し、ページ上の要素を操作し、入力欄を埋め、情報を取り出せます。

## 概要 {#overview}

ページは**アクセシビリティツリー**（文字による写し）として表されるので、LLM を使うエージェントとの相性がとても良いです。操作できる要素には `@e1`、`@e2` のような ref ID が付き、エージェントはこれを使って押したり打ち込んだりします。

主な機能は次のとおりです。

- **複数の提供元によるクラウド実行** — Browserbase、Browser Use、Firecrawl のいずれか。手元のブラウザは不要です
- **ローカルの Chromium 系との連携** — 動かしている Chrome、Brave、Chromium、Edge に CDP でつなぎ、実際に見ながら操作できます
- **検知回避を内蔵** — 指紋のランダム化、CAPTCHA の突破、住宅用プロキシ（Browserbase）
- **セッションの分離** — 作業ごとに専用のブラウザセッションが割り当てられます
- **自動の後片づけ** — 使われていないセッションは一定時間で閉じられます
- **視覚による解析** — 画面の写しを撮り、AI に見せて内容を読み取ります

## 設定 {#setup}

:::tip Nous の契約者の方へ
有料の [Nous Portal](https://portal.nousresearch.com) を契約していれば、別途 API キーを用意しなくても **[ツールゲートウェイ](/hermes/docs/user-guide/features/tool-gateway/)** 経由でブラウザ自動操作を使えます。新しく入れる場合は `hermes setup --portal` を実行するとログインとゲートウェイのツール一括有効化がまとめて済みます。すでに入れてある場合は、`hermes model` か `hermes tools` でブラウザの提供元として **Nous Subscription** を選んでください。
:::

### Browserbase クラウドモード {#browserbase-cloud-mode}

Browserbase が運用するクラウドブラウザを使うには、次を書き足します。

```bash
# Add to ~/.hermes/.env
BROWSERBASE_API_KEY=***
BROWSERBASE_PROJECT_ID=your-project-id-here
```

認証情報は [browserbase.com](https://browserbase.com) で取得できます。

### Browser Use クラウドモード {#browser-use-cloud-mode}

クラウドブラウザの提供元として Browser Use を使うには、次を書き足します。

```bash
# Add to ~/.hermes/.env
BROWSER_USE_API_KEY=***
```

API キーは [browser-use.com](https://browser-use.com) で取得できます。

:::note 提供元の選び方
上の `.env` のキーが渡すのは**認証情報だけ**です。実際に使うクラウドブラウザは、`hermes tools` → Browser Automation が書き込む `browser.cloud_provider` の選択（`browserbase`、`browser-use`、`camofox`、Nous Subscription なら `nous`）で決まります。いったん選択が保存されると、キーを足したり消したりしても提供元は切り替わりません。選ばれている提供元のキーが欠けている場合は、黙って別の経路に回さず、`hermes tools` を実行するよう案内するエラーになります。一度も設定していない環境では、これまでどおり手元にある認証情報から自動で判別します。
:::

### Browser Use モード（既定） {#browser-use-mode-default}

Browser Use モードは、組み込みのブラウザ用ツールの代わりに [Browser Use CLI 3.0](https://github.com/browser-use/browser-use) を使います。ウェブ上の作業で最高水準の新しいブラウザ基盤です。エージェントはブラウザの中で Python を書いて実行し、押す・打ち込む・引きずる・情報を集めるといった操作をページ上で行います。

**これが既定のブラウザモードです**。`browser.backend` が未設定で、`browser-use` CLI が実行できる状態（導入済み、または `uvx` から使える）なら、エージェントには `browser_exec` という 1 つのツールが渡されます。CLI を実行できない場合、Hermes は自動で組み込みのブラウザ用ツールに戻ります。

このモードは**動かす側**にあたるもので、設定済みのブラウザの裏側と組み合わせて働きます。手元の Chrome、Nous 契約のクラウドブラウザ、Browserbase、Firecrawl、Browser Use のクラウドブラウザのうち、`hermes tools` → Browser Automation で選ばれているものを動かします。唯一の例外が Camofox で、こちらは基盤がつなぎに行くための CDP の窓口を持たないため、Camofox の環境では自動的に組み込みのブラウザ用ツールのままになります。

**同時に走らせるセッション:** `browser_exec` は `session=<name>` という引数を受け取り、どの裏側でも名前ごとにブラウザ作業を切り分けます。名前ごとに専用の基盤の常駐処理（専用の IPC ソケット、ログ、状態）が立ち、クラウドの裏側では専用のブラウザも立つので、並列で動くサブエージェントや同時進行の会話が 1 本の共有接続を奪い合うことがなくなります。`session` を省くと共有の既定の常駐処理を使いますが、1 つずつ順に見て回るだけならこれで十分です。

このモードをやめて組み込みのブラウザ用ツールを強制するには、`/browser use off` を使うか、次のように書きます。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  backend: "off"
```

（`backend: "browser-use"` と書いて明示的にこのモードを強制することもできます。）

Browser Use 自身のクラウドブラウザを使うには `browser-use auth login` か `BROWSER_USE_API_KEY` が必要です。その他のブラウザについては、これまでの認証情報がそのまま使えます。

:::note
Browser Use モードはモデルが書いた Python をあなたの機械の上で実行するため、
`browser_exec` ツールは端末を使えるセッションにだけ渡されます。
端末の道具一式なしで設定された場所（たとえば権限を絞った
メッセージ画面）では、既定のブラウザ用ツールが使われます。
:::

### Firecrawl クラウドモード {#firecrawl-cloud-mode}

クラウドブラウザの提供元として Firecrawl を使うには、次を書き足します。

```bash
# Add to ~/.hermes/.env
FIRECRAWL_API_KEY=fc-***
```

API キーは [firecrawl.dev](https://firecrawl.dev) で取得できます。取得したら、ブラウザの提供元として Firecrawl を選びます。

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

### 使い分けの経路: 公開 URL はクラウド、LAN や localhost は手元 {#hybrid-routing-cloud-for-public-urls-local-for-lanlocalhost}

クラウドの提供元が設定されているとき、Hermes は非公開・ループバック・LAN のアドレス
（`localhost`、`127.0.0.1`、`192.168.x.x`、`10.x.x.x`、`172.16-31.x.x`、`*.local`、
`*.lan`、`*.internal`、IPv6 のループバック `::1`、リンクローカルの `169.254.x.x`）に
解決される URL のために、**手元の Chromium の脇役**を自動で立ち上げます。公開 URL は
同じ会話の中でもこれまでどおりクラウドの提供元を使います。

これは「手元で開発しているのに Browserbase を使っている」というよくある流れを解きます。
提供元を切り替えたり SSRF の防壁を切ったりしなくても、エージェントは
`http://localhost:3000` の管理画面の写しを撮りつつ、`https://github.com` から
情報を集められます。クラウドの提供元が非公開の URL を目にすることはありません。

この機能は**既定で有効**です。無効にする（これまでどおり、すべての URL を設定済みの
クラウドの提供元に送る）には次のようにします。

```yaml
# ~/.hermes/config.yaml
browser:
  cloud_provider: browserbase
  auto_local_for_private_urls: false
```

自動の振り分けを無効にすると、非公開の URL は
`"Blocked: URL targets a private or internal address"` として拒否されます。
あわせて `browser.allow_private_urls: true` を設定した場合はクラウドの提供元が
試みますが、Browserbase などはあなたの LAN に届かないので、たいていうまくいきません。

必要なもの: 手元の脇役は純粋なローカルモードと同じ `agent-browser` CLI を使うので、
これを入れておく必要があります（`hermes setup tools → Browser Automation` が
自動で入れてくれます）。公開 URL から非公開のアドレスへ移動後に転送される経路は
今も遮断されます（内部への転送という抜け道で LAN に届くことはできません）。

### Camofox ローカルモード {#camofox-local-mode}

[Camofox](https://github.com/jo-inc/camofox-browser) は、Camoufox（C++ による指紋偽装を備えた Firefox の派生版）を包んだ、自分で立てる Node.js のサーバーです。クラウドに頼らずに、手元で検知回避のブラウジングができます。

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

`make up` は既定のコンテナをその場で起動します。Node のヒープを大きくしたい、VNC を使いたい、プロファイルの置き場所を残したいといった独自の実行時設定が必要なら、まずイメージを組み立ててから自分で走らせます。

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

VNC を有効にすると、ブラウザは画面ありで動き、`http://localhost:6080`（noVNC）から手元のブラウザで様子を眺められます。`localhost:5901` に native の VNC クライアントをつなぐこともできます。

すでに `make up` を実行してある場合は、独自のコンテナを起動する前に既定のコンテナを止めて消します。

```bash
make down
# then run the custom docker run command above
```

そのうえで `~/.hermes/.env` に次を設定します。

```bash
CAMOFOX_URL=http://localhost:9377
```

Camofox を Docker で動かしていて、ホスト側で提供しているウェブアプリを開かせたい場合は、ループバックの書き換えを有効にします。`CAMOFOX_URL` はホスト側で公開している操作用 API を指したままにしますが、`http://127.0.0.1:3000` のようなページの URL は、コンテナの中からは `http://host.docker.internal:3000` として開く必要があります。

```yaml
# ~/.hermes/config.yaml
browser:
  camofox:
    rewrite_loopback_urls: true
    loopback_host_alias: host.docker.internal  # default; use a LAN IP if needed
```

同じことを環境変数で書くと次のようになります。

```bash
CAMOFOX_REWRITE_LOOPBACK_URLS=true
CAMOFOX_LOOPBACK_HOST_ALIAS=host.docker.internal
```

書き換えが働くのは、ループバックのホスト（`localhost`、`127.0.0.1`、`::1`）を持つページ移動用の URL だけです。`CAMOFOX_URL` は変わりません。Docker を使わない Camofox の環境では、ブラウザがすでにホスト側で動いていてループバックの URL がそのまま正しいので、無効のままにしてください。

`hermes tools` → Browser Automation → Camofox から設定することもできます。

Camofox の選び方は、ほかのブラウザの裏側と同じです。`hermes tools` → Browser Automation で **Camofox** を選ぶと、`config.yaml` に `browser.cloud_provider: camofox` が書き込まれます。`CAMOFOX_URL` はサーバーの場所を示すだけのもので、ブラウザの選択がすでに保存されていれば、これを設定しただけで裏側が切り替わることはありません（一度も設定していない環境では、これまでどおり自動で判別します）。

#### 状態が残るブラウザセッション {#persistent-browser-sessions}

既定では、Camofox のセッションごとに毎回ばらばらの人格が割り当てられます。つまり cookie やログイン状態はエージェントを再起動すると消えます。状態が残るブラウザセッションを有効にするには、`~/.hermes/config.yaml` に次を書き足します。

```yaml
browser:
  camofox:
    managed_persistence: true
```

そのうえで、新しい設定を読ませるために Hermes を完全に再起動します。

:::warning 入れ子の場所が重要です
Hermes が読むのは `browser.camofox.managed_persistence` であって、一番上の階層の `managed_persistence` では**ありません**。よくある間違いは次のように書くことです。

```yaml
# ❌ Wrong — Hermes ignores this
managed_persistence: true
```

置き場所を間違えると、Hermes は黙ってその場限りのランダムな `userId` に戻り、ログイン状態はセッションのたびに失われます。
:::

##### Hermes がすること
- プロファイル単位で決まる `userId` を Camofox に送り、サーバーが同じ Firefox のプロファイルをセッションをまたいで使い回せるようにします。
- 後片づけのときサーバー側のコンテキスト破棄を飛ばすので、cookie とログイン状態がエージェントの作業をまたいで残ります。
- `userId` を動作中の Hermes のプロファイル単位に切り分けるので、Hermes のプロファイルが違えばブラウザのプロファイルも別になります（プロファイルの分離）。

##### Hermes がしないこと
- Camofox のサーバーに状態の保持を強制することはしません。Hermes が送るのは安定した `userId` だけで、その `userId` を状態の残る Firefox のプロファイルの置き場所に結び付けるのはサーバーの役目です。
- あなたの Camofox サーバーの版が、すべての要求をその場限りとして扱う（たとえば保存済みのプロファイルを読み込まず、常に `browser.newContext()` を呼ぶ）作りなら、Hermes の側でそのセッションを残すことはできません。userId ごとのプロファイル保持を実装した Camofox の版を動かしているか確かめてください。

##### 効いているか確かめる

1. Hermes と Camofox のサーバーを起動します。
2. ブラウザの作業で Google（またはログインできるサイト）を開き、手でサインインします。
3. ブラウザの作業をふつうに終わらせます。
4. 新しいブラウザの作業を始めます。
5. 同じサイトをもう一度開きます。サインインしたままのはずです。

手順 5 でログアウトしていたら、Camofox のサーバーが安定した `userId` を尊重していません。設定を書いた場所をもう一度確かめ、`config.yaml` を編集したあとに Hermes を完全に再起動したか確認し、Camofox サーバーの版がユーザーごとの状態の残るプロファイルに対応しているか確かめてください。

##### 状態の置き場所

Hermes は、プロファイル単位の置き場所 `~/.hermes/browser_auth/camofox/`（既定以外のプロファイルなら `$HERMES_HOME` 配下の相当する場所）から、安定した `userId` を導き出します。実際のブラウザのプロファイルのデータは Camofox サーバー側に、その `userId` を鍵として置かれます。状態の残るプロファイルを完全に消したいときは、Camofox サーバー側でそれを消し、あわせて対応する Hermes のプロファイルの状態の置き場所を削除してください。

#### 外部が受け持つ Camofox セッション {#externally-managed-camofox-sessions}

目に見える Camofox のブラウザを別のアプリ（デスクトップの助手、独自の連携、別のエージェント）が動かしている場合は、Hermes が自分専用の切り離されたプロファイルを立てるのではなく、同じ人格の中で動くように設定します。

振る舞いを決めるつまみは 3 つです。

| 設定 | 環境変数 | 効果 |
|---------|---------|--------|
| `browser.camofox.user_id` | `CAMOFOX_USER_ID` | タブを作るときに Hermes が使う Camofox の `userId`。これを設定すると、そのセッションは「外部が受け持つ」動きになります。 |
| `browser.camofox.session_key` | `CAMOFOX_SESSION_KEY` | タブ作成時に送る `sessionKey`（別名 `listItemId`）。引き継ぎのときに既存のタブと突き合わせるために使います。未設定なら作業ごとの値が既定になります。 |
| `browser.camofox.adopt_existing_tab` | `CAMOFOX_ADOPT_EXISTING_TAB` | 有効にすると、Hermes は最初の利用時に `GET /tabs?userId=<user_id>` を呼び、新しいタブを作る前に既存のタブを使い回します。 |

環境変数は `config.yaml` より優先されます。どちらの書き方でも使えます。

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

- Hermes は作業の終わりに破壊的な後片づけを飛ばします（`managed_persistence: true` と同じ動きです）。相手のアプリのタブ・cookie・プロファイルはそのまま残ります。
- Hermes は `DELETE /sessions/<user_id>` を呼び**ません**。この窓口はそのユーザーのデータをすべて消してしまうため、動いてしまうと外部のアプリのセッションまで吹き飛ばすからです。

**タブの引き継ぎの流れ（`adopt_existing_tab: true` のとき）:**

1. 処理の起動後に最初のブラウザ用ツールが呼ばれたとき、Hermes は `GET /tabs?userId=<user_id>` を投げます（待ち時間の上限は 5 秒）。
2. 応答の中に `listItemId == session_key` のタブがあれば、その一群のうち最後に作られたものを引き継ぎます。
3. なければ、そのユーザーについて最後に作られたタブ（`listItemId` は問いません）を引き継ぎます。
4. タブが 1 つもない、または要求が失敗した場合は、次の操作のときに新しいタブを作る動きに戻ります。

引き継ぎが起きるのは、そのセッションの `tab_id` が埋まるまでの間だけです。引き継いだタブを外部のアプリが途中で閉じた場合、次のブラウザ用ツールの呼び出しで Camofox のエラーが表に出ます。Hermes は呼び出しのたびに新しいタブを探し直すことはしません。

**`session_key` の選び方:** Hermes を*特定の*既存タブに確実につなぎたいなら、外部のアプリがそのタブを作ったときに使った `listItemId` を `session_key` に設定します。`session_key` を空のまま `user_id` だけを設定した場合、Hermes は作業ごとの `session_key`（`task_<id>`）を作ります。cookie とプロファイルは外部のアプリと共有しますが、既存のタブを使い回さず自分のタブを隣に開きます。

**同時利用について:** 外部のアプリと Hermes は同じ Camofox の `userId` を同時に動かせますが、Camofox は複数の利用者の間でタブごとの焦点を調整してくれません。どちらが主導するかはアプリ側で取り決めてください（たとえば Hermes が動いている間は外部のアプリを止める、など）。

#### VNC で様子を眺める {#vnc-live-view}

Camofox を画面ありで（ブラウザの窓が見える状態で）動かすと、健康確認の応答に VNC の口が載ります。Hermes はこれを自動で見つけ、移動の応答に VNC の URL を含めるので、エージェントからブラウザの様子を眺めるためのリンクを渡してもらえます。

### Lightpanda ローカルエンジン {#lightpanda-local-engine}

[Lightpanda](https://lightpanda.io) は、ゼロから書かれたオープンソースのヘッドレスブラウザです。起動は一瞬で、Chrome より 9 倍速く、メモリは 16 分の 1 で済みます。これは小さな仮想機械の上で長く動き続けるエージェントにとって効いてきます。

Lightpanda は**ローカルのエンジン**で、手元の `agent-browser` の経路の下で選びます（クラウドの提供元ではありません）。実行ファイルを入れて `PATH` に置き（[Lightpanda の導入案内](https://lightpanda.io/docs)を参照）、次のように設定します。

```yaml
# Add to ~/.hermes/config.yaml
browser:
  engine: lightpanda
```

環境変数でも設定できます。

```bash
AGENT_BROWSER_ENGINE=lightpanda
```

Hermes は、手元の Chrome を動かすときと同じように、`agent-browser` を通して CDP 越しに Lightpanda を動かします。

**Chrome への自動の切り替え。** Lightpanda はまだ Chrome にできることをすべて覆えていないので、この連携は流れを止めない作りになっています。対応している操作は Lightpanda が引き受け、対応していないものは Hermes が黙って Chrome で試し直します。対応している範囲はエージェントの中心的な流れ、つまり移動・写しの取得・押す・打ち込む・巻く・戻る・キー入力・評価を覆っています。画面の写しも Chrome に回されます。Lightpanda には描画の仕組みがないためで、同じ理由から `browser_vision` は最初から Chrome に振り分けられます。

### CDP 経由でローカルの Chromium 系ブラウザを使う（`/browser connect`） {#local-chromium-family-browser-via-cdp-browser-connect}

クラウドの提供元を使う代わりに、Chrome DevTools Protocol（CDP）を通して、動かしている Chrome、Brave、Chromium、Edge に Hermes のブラウザ用ツールをつなげます。エージェントの動きをその場で見たいとき、自分の cookie やログイン状態が必要なページを扱いたいとき、クラウドのブラウザの費用を避けたいときに役立ちます。

:::note
`/browser connect` は**対話式 CLI のスラッシュコマンド**で、ゲートウェイからは実行されません。WebUI、Telegram、Discord などゲートウェイ側の会話の中で実行しようとすると、その文字列はただの本文としてエージェントに送られ、コマンドは動きません。端末から Hermes を起動し（`hermes` か `hermes chat`）、そこで `/browser connect` を実行してください。
:::

CLI では次のように使います。

```
/browser connect                 # Auto-launch/connect to a local Chromium-family browser at http://127.0.0.1:9222
/browser connect ws://host:port  # Connect to a specific CDP endpoint
/browser status                  # Check current connection
/browser disconnect              # Detach and return to cloud/local mode
```

遠隔デバッグを有効にしたブラウザがまだ動いていない場合、Hermes は対応する Chromium 系のブラウザを `--remote-debugging-port=9222` 付きで自動起動しようとします。見つけに行く対象には Brave、Google Chrome、Chromium、Microsoft Edge が含まれ、`/opt/brave-bin/brave` や `/snap/bin/brave` といった Linux でよくある導入先も見ます。

:::tip
Chromium 系のブラウザを手で CDP 有効にして起動するときは、専用の user-data-dir を使ってください。ふだんのプロファイルでブラウザがすでに動いていても、デバッグ用の口がちゃんと開くようになります。

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

**なぜ `--user-data-dir` が要るのか。** これを付けないと、ふつうのブラウザがすでに動いている状態で Chromium 系のブラウザを起動しても、たいていは既存の処理の上に新しい窓が開くだけです。その既存の処理は `--remote-debugging-port` 付きで起動されていないので、9222 番の口は開きません。専用の user-data-dir を渡すと新しいブラウザの処理が立ち上がり、そこでデバッグ用の口が実際に待ち受けます。`--no-first-run --no-default-browser-check` は、新しいプロファイルの初回起動時の案内を飛ばします。

**Chrome 136 以降では専用プロファイルが必須です。** 安全性を高める変更として、Chrome 136 以降は `--remote-debugging-port` を*既定*の user-data-dir と組み合わせると、遠隔デバッグの口を黙って開かなくなりました。ほかに Chrome が動いていない状態で冷えたところから起動しても同じです。ブラウザはふつうに立ち上がりますが 9222 番では誰も待ち受けていないので、`/browser connect`（や手動の `curl http://127.0.0.1:9222/json/version`）は接続拒否で失敗します。エラーの表示は出ません。直し方は上のコマンドのとおりで、既定のプロファイルの置き場所とは別の場所（たとえば `$HOME/.hermes/chrome-debug`）を指す `--user-data-dir` を必ず渡すことです。これは Chrome、Chromium、Edge、および同じ変更を取り込んだ Brave の版に当てはまります。
:::

CDP でつながっている間は、すべてのブラウザ用ツール（`browser_navigate`、`browser_click` など）が、クラウドのセッションを立ち上げる代わりに、動いているあなたのブラウザに対して働きます。

### WSL2 と Windows の Chrome: `/browser connect` より MCP を使う {#wsl2-windows-chrome-prefer-mcp-over-browser-connect}

Hermes が WSL2 の中で動いていて、操作したい Chrome の窓は Windows のホスト側で動いている場合、`/browser connect` が最善の道であることはあまりありません。

理由は次のとおりです。

- `/browser connect` は、Hermes 自身が使える CDP の窓口に届くことを前提にしています
- 今どきの Chrome のライブデバッグのセッションは、昔ながらの `9222` 番の口と同じようには WSL から直接届かない、ホストの中だけの窓口を出すことが多いです
- Windows の Chrome がデバッグ可能な場合でも、いちばんきれいにまとまるのは、Windows 側のブラウザ用 MCP サーバーに Chrome をつながせて、Hermes はその MCP サーバーと話す形にすることです

この構成では、Hermes の MCP 対応を通して `chrome-devtools-mcp` を使うのが良いです。

実際の手順は MCP の案内を見てください。

- [Hermes で MCP を使う](/hermes/docs/guides/use-mcp-with-hermes/#wsl2-bridge-hermes-in-wsl-to-windows-chrome)

### ローカルブラウザモード {#local-browser-mode}

クラウドの認証情報を一切設定**せず**、`/browser connect` も使わない場合でも、Hermes は `agent-browser` が動かす手元の Chromium を通してブラウザ用ツールを使えます。

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

何も入れなくて構いません。`agent-browser` は最初にブラウザ用ツールを使った時点で
`npx agent-browser` から自動で解決されます。この一度きりの npx の取得を避けたいなら、
先に全体向けに入れておくこともできます（任意です）。

```bash
npm install -g agent-browser
```

:::info
`browser` の道具一式を設定の `toolsets` の並びに入れておくか、`hermes config set toolsets '["hermes-cli", "browser"]'` で有効にしておく必要があります。
:::

## 使えるツール {#available-tools}

### `browser_navigate` {#browsernavigate}

URL へ移動します。ほかのブラウザ用ツールより先に呼ぶ必要があります。Browserbase のセッションもここで用意されます。

```
Navigate to https://github.com/NousResearch
```

:::tip
ただ情報を取ってくるだけなら、`web_search` か `web_extract` のほうが速くて安く済みます。ページを**操作する**必要があるとき（ボタンを押す、入力欄を埋める、動的な内容を扱う）にブラウザ用ツールを使ってください。
:::

### `browser_snapshot` {#browsersnapshot}

いま開いているページのアクセシビリティツリーを、文字による写しとして取ります。操作できる要素が `@e1`、`@e2` のような ref ID 付きで返り、`browser_click` や `browser_type` で使えます。

- **`full=false`**（既定）: 操作できる要素だけを載せた簡潔な形
- **`full=true`**: ページの内容すべて

15,000 文字を超える写しは、自動で切り詰められるか LLM に要約されます（`web_extract` と同じ、1 ページあたりの上限です）。そうなった場合、写しの全体は `~/.hermes/cache/web/` に保存され、ツールの出力にはその置き場所と、そのまま使える `read_file` の呼び出しが載ります。おかげでエージェントは、写しを取り直さなくても、切られた先にある要素の ref を含めてアクセシビリティツリーの全体をたどれます。

### `browser_click` {#browserclick}

写しに載っている ref ID で指定した要素を押します。

```
Click @e5 to press the "Sign In" button
```

### `browser_type` {#browsertype}

入力欄に文字を打ち込みます。まず欄を空にしてから、新しい文字を打ちます。

```
Type "hermes agent" into the search field @e3
```

### `browser_scroll` {#browserscroll}

ページを上下に巻いて、続きを表示します。

```
Scroll down to see more results
```

### `browser_press` {#browserpress}

キーを押します。入力の確定やページ移動に便利です。

```
Press Enter to submit the form
```

対応するキー: `Enter`、`Tab`、`Escape`、`ArrowDown`、`ArrowUp` ほか。

### `browser_back` {#browserback}

ブラウザの履歴をたどって、前のページへ戻ります。

### `browser_get_images` {#browsergetimages}

いま開いているページの画像を、URL と代替テキスト付きで一覧にします。解析したい画像を探すときに使えます。

### `browser_vision` {#browservision}

画面の写しを撮り、視覚を扱う AI に解析させます。文字の写しでは大事な見た目の情報が拾えないとき、とくに CAPTCHA や込み入った配置、目で確かめる必要のある課題に役立ちます。

画面の写しは残る形で保存され、AI の解析結果とあわせてその置き場所が返ります。メッセージのやり取りができる場（Telegram、Discord、Slack、WhatsApp）では、エージェントに画面の写しを送ってもらえます。`MEDIA:` の仕組みを通して、そのまま写真の添付として届きます。

```
What does the chart on this page show?
```

画面の写しは `~/.hermes/cache/screenshots/` に置かれ、24 時間で自動的に片づけられます。

### `browser_console` {#browserconsole}

いま開いているページから、ブラウザのコンソールの出力（log・warn・error）と、拾われなかった JavaScript の例外を取ります。アクセシビリティツリーには表れない、静かに起きている JS のエラーを見つけるのに欠かせません。

```
Check the browser console for any JavaScript errors
```

`clear=True` を使うと読んだあとにコンソールを空にできるので、次からは新しい分だけが出ます。

`browser_console` は `expression` 引数を付けて呼ぶと JavaScript の評価も行います。DevTools のコンソールと同じ形で、結果は解釈済みで返ります（JSON になるオブジェクトは辞書に、単純な値はそのままの型で返ります）。

```
browser_console(expression="document.querySelector('h1').textContent")
browser_console(expression="JSON.stringify(performance.timing)")
```

いま動いているセッションで CDP の見張り役が働いている場合（CDP を扱える裏側に対して `browser_navigate` を実行したセッションでは、たいていそうなります）、評価はその見張り役が保つ WebSocket の上で走るので、子処理を立ち上げる分の時間がかかりません。そうでなければ、通常の agent-browser CLI の経路に落ちます。振る舞いはどちらでも同じで、変わるのは待ち時間だけです。

評価は既定では制限されていません。エージェントは `fetch` を使い、保存領域を読み、入力欄の値を調べ、DOM から好きに情報を取り出せます。ローカル以外の裏側では、非公開・内部のアドレスに向かう要求は引き続き遮断されます（SSRF の防壁はこの設定とは独立です）。ログイン済みのプロファイルで危なそうなページを見て回るので、機微な JS の機能（cookie、保存領域、クリップボード、通信、入力欄の値）を厳しく拒否したいという場合は、`config.yaml` で `browser.restrict_evaluate: true` を選んでください。この拒否の一覧は機能の*名前*で照合するので、`fetch` や `cookie` という語がたまたま入っているだけの正当な式まで弾かれることに注意してください。

### `browser_cdp` {#browsercdp}

Chrome DevTools Protocol をそのまま通す口で、ほかのツールで覆えないブラウザ操作のための逃げ道です。ブラウザ本体のダイアログの扱い、iframe に閉じた評価、cookie や通信の制御など、エージェントが必要とする CDP の命令すべてに使えます。

**セッションの開始時に CDP の窓口に届く場合にだけ使えます**。つまり `/browser connect` で動いている Chrome、Brave、Chromium、Edge につないだか、`config.yaml` に `browser.cdp_url` を設定した場合です。既定のローカルの agent-browser モード、Camofox、クラウドの提供元（Browserbase、Browser Use、Firecrawl）は、いまのところこのツールに CDP を出していません。クラウドの提供元はセッションごとの CDP の URL を持ってはいますが、動いているセッションへの振り分けは今後の課題です。

**CDP のメソッド一覧:** https://chromedevtools.github.io/devtools-protocol/ — エージェントは特定のメソッドのページを `web_extract` して、引数と返り値の形を調べられます。

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

ブラウザ全体に効くメソッド（`Target.*`、`Browser.*`、`Storage.*`）は `target_id` を省きます。ページに効くメソッド（`Page.*`、`Runtime.*`、`DOM.*`、`Emulation.*`）は `Target.getTargets` で得た `target_id` が必要です。呼び出しはそれぞれ状態を持たず独立していて、セッションは呼び出しをまたいで続きません。

**オリジンの違う iframe:** `frame_id`（`browser_snapshot.frame_tree.children[]` のうち `is_oopif=true` のもの）を渡すと、その iframe のために見張り役が保っているセッションを通して CDP の呼び出しが送られます。Browserbase 上でオリジンの違う iframe の中の `Runtime.evaluate` が動くのはこの仕組みのおかげで、状態を持たない CDP の接続では署名付き URL の期限切れに当たってしまいます。例を挙げます。

```
browser_cdp(
  method="Runtime.evaluate",
  params={"expression": "document.title", "returnByValue": True},
  frame_id="<frame_id from browser_snapshot>",
)
```

オリジンが同じ iframe に `frame_id` は要りません。一番上の階層の `Runtime.evaluate` から `document.querySelector('iframe').contentDocument` を使ってください。

### `browser_dialog` {#browserdialog}

ブラウザ本体の JS のダイアログ（`alert` / `confirm` / `prompt` / `beforeunload`）に応えます。このツールができる前は、ダイアログが黙ってページの JavaScript の流れを止めてしまい、後続の `browser_*` の呼び出しが固まったり失敗したりしていました。いまは待機中のダイアログが `browser_snapshot` の出力に見え、エージェントがはっきり応えられます。

**流れ:**
1. `browser_snapshot` を呼びます。ダイアログがページを止めていれば、`pending_dialogs: [{"id": "d-1", "type": "alert", "message": "..."}]` のように現れます。
2. `browser_dialog(action="accept")` か `browser_dialog(action="dismiss")` を呼びます。`prompt()` のダイアログには `prompt_text="..."` を渡して返事を入れます。
3. 写しを取り直します。`pending_dialogs` は空になり、ページの JS の流れは再開しています。

**見つけるのは自動です**。作業ごとに 1 本の WebSocket を保つ CDP の見張り役が Page / Runtime / Target の出来事を購読しています。この見張り役は写しに `frame_tree` の項目も入れるので、エージェントはいま開いているページの iframe の構造を、オリジンの違う（OOPIF）iframe も含めて見られます。

**対応の一覧:**

| 裏側 | `pending_dialogs` での検知 | 応答（`browser_dialog` ツール） |
|---|---|---|
| `/browser connect` か `browser.cdp_url` 経由の手元の Chrome | ✓ | ✓ 流れの全体 |
| Browserbase | ✓ | ✓ 流れの全体（差し込んだ XHR の橋渡し経由） |
| Camofox / 既定のローカルの agent-browser | ✗ | ✗（CDP の窓口がありません） |

**Browserbase での仕組み。** Browserbase の CDP の中継は、本物のブラウザ本体のダイアログをサーバー側で 10 ミリ秒ほどのうちに自動で閉じてしまうので、`Page.handleJavaScriptDialog` は使えません。そこで見張り役は `Page.addScriptToEvaluateOnNewDocument` で小さなスクリプトを差し込み、`window.alert` / `confirm` / `prompt` を同期の XHR に置き換えます。その XHR を `Fetch.enable` で捕まえ、こちらがエージェントの返事を載せて `Fetch.fulfillRequest` を呼ぶまで、ページの JS の流れは XHR の待ちで止まったままになります。`prompt()` の返り値はページの JS までそのままの形で戻ります。

**ダイアログの扱い方**は、`config.yaml` の `browser.dialog_policy` で設定します。

| 方針 | 振る舞い |
|--------|----------|
| `must_respond`（既定） | 捕まえて写しに載せ、`browser_dialog()` の明示的な呼び出しを待ちます。`browser.dialog_timeout_s`（既定 300 秒）を過ぎると安全のため自動で閉じるので、不具合のあるエージェントがいつまでも止まり続けることはありません。 |
| `auto_dismiss` | 捕まえて、すぐ閉じます。エージェントは `browser_state` の履歴でそのダイアログを見られますが、対応する必要はありません。 |
| `auto_accept` | 捕まえて、すぐ受け入れます。しつこい `beforeunload` の確認が出るページを見て回るときに便利です。 |

`browser_snapshot.frame_tree` の中の**フレームの木**は、広告の多いページでも大きさが膨らみすぎないよう、30 フレームと OOPIF の深さ 2 までに抑えられています。上限に当たった場合は `truncated: true` の印が出ます。木の全体が必要なエージェントは、`browser_cdp` で `Page.getFrameTree` を使えます。

## 実際の例 {#practical-examples}

### ウェブの入力欄を埋める {#filling-out-a-web-form}

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

ブラウザのセッションを WebM の動画として自動で録画できます。

```yaml
browser:
  record_sessions: true  # default: false
```

有効にすると、最初の `browser_navigate` で録画が始まり、セッションが閉じるときに `~/.hermes/browser_recordings/` へ保存されます。手元でもクラウド（Browserbase）でも動きます。72 時間より古い録画は自動で片づけられます。

## 画面ありモード（ブラウザの窓が見える） {#headed-mode-visible-browser-window}

既定では、手元のブラウザは画面なしで動きます。画面ありモードにすると、見て触れる Chromium の窓が出ます。

```yaml
browser:
  headed: true  # default: false
```

環境変数でも設定できます: `AGENT_BROWSER_HEADED=1`。

画面ありモードは 2 つのことをします。

1. **窓の見える Chromium を起動します**（手元での実行時に agent-browser へ `--headed` を渡します）。
2. **やり取りの合間も窓を開いたままにします。** ふだんはエージェントが返事をするたびにブラウザのセッションが片づけられますが、画面ありモードではその都度の後片づけを飛ばします。おかげでエージェントの作業を眺め、手で割り込み（サインインの確認、CAPTCHA）、会話の間じゅうログイン状態を温めておけます。

放っておかれたセッションは、これまでどおり `browser.inactivity_timeout`（既定ではブラウザの動きが 120 秒ない場合）で回収され、すべてのセッションは終了時に閉じられます。画面ありモードが効くのは手元のブラウザだけで、クラウドのセッション（Browserbase）には影響しません。

## 検知回避の機能 {#stealth-features}

Browserbase は検知回避の機能を自動で用意します。

| 機能 | 既定 | 補足 |
|---------|---------|-------|
| 基本の検知回避 | 常に有効 | 指紋のランダム化、表示領域のランダム化、CAPTCHA の突破 |
| 住宅用プロキシ | 有効 | 住宅用の IP を通し、アクセスしやすくします |
| 高度な検知回避 | 無効 | 独自に組んだ Chromium を使い、Scale Plan が必要です |
| Keep Alive | 有効 | 通信が途切れたあとにセッションをつなぎ直します |

:::note
契約している料金体系で有料の機能が使えない場合、Hermes は自動で段階を下げます。まず `keepAlive` を切り、次にプロキシを切るので、無料の料金体系でもブラウジングは動き続けます。
:::

## セッションの管理 {#session-management}

- 作業ごとに、Browserbase 上で切り離されたブラウザセッションが割り当てられます
- 使われていないセッションは自動で片づけられます（既定では 2 分）
- 裏で動く処理が 30 秒ごとに、古くなったセッションを確認します
- 処理の終了時には緊急の後片づけが走り、取り残されたセッションが残らないようにします
- セッションは Browserbase の API（`REQUEST_RELEASE` の状態）で解放されます

## 制約 {#limitations}

- **文字によるやり取り** — 画素の座標ではなく、アクセシビリティツリーに頼ります
- **写しの大きさ** — 大きなページは 15,000 文字のところで切り詰められるか LLM に要約されます（`web_extract` と同じです）。写しの全体は `~/.hermes/cache/web/` に保存され、出力がそこを指すので `read_file` でたどれます
- **セッションの期限** — クラウドのセッションは、契約している提供元の料金体系の設定に従って切れます
- **費用** — クラウドのセッションは提供元のクレジットを消費します。会話が終わったとき、あるいは使われないまま時間が過ぎたときに自動で片づけられます。無料で手元のブラウジングをするなら `/browser connect` を使ってください
- **ファイルの取得はできません** — ブラウザからファイルをダウンロードすることはできません
