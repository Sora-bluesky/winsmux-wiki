---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "ボットの画面"
description: ""
upstream_path: user-guide/features/bot-screen.md
upstream_blob: 141c6d2e050cc6a3e5fa2e5b1236dd647af7efaa
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/bot-screen
---

# ボットの画面 {#bot-screen}

画面を持たない Linux のゲートウェイホスト（サーバー、クラウド VM、Hermes Cloud）では、
ボットごとに**専用のデスクトップ**が用意されます。ボットの `computer_use` と画面付きブラウザが操作する
Xfce の画面で、その様子は Hermes Desktop にライブで映ります。ボットの作業を見守り、
ログイン、2FA の確認、CAPTCHA、支払いの手順に差しかかったら**操作を引き継ぎ**、終わったら
**操作を返して**、いまサインインしたセッションのまま続きを任せられます。
アプリを閉じてもノート PC の電源を切っても、ボットは作業を続けます。
画面はあなたの端末ではなく、ゲートウェイホスト側にあるからです。

Hermes のプロファイル（「ボット」）には、それぞれ専用の画面、ブラウザプロファイル、
Cookie があります。画面は作業のための場所であって、セキュリティの境界ではありません。
ボットどうしはホストのユーザーアカウント、ファイル、ネットワークを共有します（ほかのホスト型エージェント製品と同じ考え方です）。

**脅威モデル。** 画面の RFB ソケット、X ディスプレイ、ブラウザプロファイル、
操作権（リース）のファイルは、どれもゲートウェイを動かす OS ユーザーのものです。そのユーザーとして
動くプロセス（同じホストの別のボットや、ボット自身の `terminal` ツールも含みます）は、
ペインやリースを通らずに直接それらへ触れられます。リースは `computer_use` とブラウザ系ツールに
かけたツール側の柵であって、OS の仕組みではありません。OS ユーザーより広い境界が 1 つあります。
Chromium の DevTools ポート（ドックの Browser と agent-browser の起動は、エージェントが接続できるよう
ループバックにこれを公開します）には、ホスト上の**どの**ローカルユーザーでも到達でき、
Chromium にはユーザーごとに制限する手段がありません。ボットごとに別の OS ユーザーで動かすことは
対象外です。その分離が必要な場合や、ホストに信頼できないローカルユーザーがいる場合は、
ボットを別々のホストに置いてください。タイミングについて知っておきたい点が 2 つあります。
WebSocket のブリッジは、リースのファイルを読み直すまでの最大 250 ms、リースの判定をキャッシュします。
そのため別のプロセスが引き継ぎを行った場合、その反映はこの時間内になります（ボットのツール結果は、
この時間に関係なくリースのエポックで無効になります）。また、ビューアーの 1 回限り・30 秒有効の
`display_ticket` は、意図して URL のクエリパラメーターで送られます。noVNC は WebSocket の
サブプロトコルを交渉できず、ヘッダーでは渡せないためです。その結果、
リバースプロキシのアクセスログに使用済みのチケットが残ることがあります。

## 必要なもの {#requirements}

- ゲートウェイホストが Linux であること。macOS と Windows のホストにはもともと実際の
  ディスプレイがあるので、このペインは表示されません。
- ホストに TigerVNC の `Xvnc` と Xfce の中核コンポーネントが入っていること。
  これらが黙って入ることはありません。`hermes update` でも新規インストールでも、
  どの端末もそのままです。足りないときは Hermes Desktop の Screen ペインに
  **Install on host** が出ます。1 クリックでゲートウェイホストのパッケージマネージャーが動き
  （そのホストの sudo パスワードを伏せ字のカードで尋ねます。パスワードはそのホストにだけ送られ、
  保存されません）、ログが流れます。Hermes 自体が root で動いているとき
  （コンテナではふつうこちらです）は、インストーラーが sudo もパスワードのカードも使わずに
  パッケージマネージャーを直接動かします。root ではなく、ホストに `sudo` がまったくない場合は、
  カードの代わりにペインと CLI が、ホストで実行するためのインストールコマンドをそのまま表示します。
  公式の Docker イメージ（`nousresearch/hermes-agent`。Hermes Cloud もこれで動いています）は
  この 2 つ目の場合にあたります。ゲートウェイは権限のないユーザーで動き、イメージには
  `sudo` がないので、ペインには `apt-get` の行が出ます。運用者がコンテナ内で root として
  1 回だけ実行してください（`docker exec -u 0 <container> apt-get install -y …`）。
  ドックの Browser アイコンがほしい場合は、その行に `chromium` を加えます。詳しくは下の
  [ブラウザのセッション](#browser-sessions-that-survive-the-handoff) を参照してください。シェルからは、
  `hermes computer-use screen status` がその行をそのまま表示し、
  `hermes computer-use screen install` が実行します。

  | ディストリビューション | パッケージ |
  |---|---|
  | Debian / Ubuntu | `tigervnc-standalone-server xfce4-panel xfwm4 xfdesktop4 xfce4-settings xfce4-terminal dbus-x11 x11-xserver-utils x11-utils xauth fonts-dejavu-core` |
  | Fedora | `tigervnc-x11-server xfce4-panel xfwm4 xfdesktop xfce4-settings xfce4-terminal dbus-daemon xsetroot xset xdpyinfo xprop xorg-x11-xauth setxkbmap dejavu-sans-fonts` |
  | Arch | `tigervnc xfce4-panel xfwm4 xfdesktop xfce4-settings xfce4-terminal xorg-xsetroot xorg-xset xorg-xdpyinfo xorg-xprop xorg-xauth xorg-setxkbmap ttf-dejavu` |

  Fedora では、`Xvnc` の本体は `tigervnc-x11-server` に入っており（
  `tigervnc-server-minimal` ではありません）、`dbus-run-session` は `dbus-daemon` に含まれます。
  `xfce4` のメタパッケージは意図して**使いません**。スクリーンセーバー、
  電源管理、polkit エージェントまで入り、画面のないデスクトップをロックしたり確認を求めたりするからです。
- ボットで [Computer Use](/hermes/docs/user-guide/features/computer-use/) が有効になっていること（cua-driver がインストール済み）。
- メモリ。公式イメージでの実測では、ゲートウェイの待機時が約 300 MB、Xvnc と
  Xfce で約 220 MB 増え、引き継ぎ中に人が開く画面付き Chromium でさらに
  0.5〜1 GB 増えます（1 ページで約 550 MB）。**ブラウザを開いた画面 1 つにつき約 1.1〜1.5 GB** を
  見込んでください。デスクトップだけなら軽く、重いのはブラウザです。CPU は制約になりません
  （待機中のデスクトップで約 0.01 コア、ライブ配信中で約 0.03 コア）。パッケージは
  Debian 13 で約 930 MB のディスクを使います。

  画面を起動する前に、Hermes はホスト（またはコンテナの cgroup のうち、厳しいほう）に
  `bot_desktop.min_free_memory_mb`（既定は 1536。`0` にすると確認しません）以上の空きがあるかを確かめます。
  足りない場合、ペインには **Start screen** の代わりにその理由が表示され、
  `hermes computer-use screen start` も起動を拒否します。すでに動いている画面がこの確認で
  止められることはありません。だれも使っていない画面は
  `bot_desktop.idle_stop_minutes`（既定は 30）が過ぎると止まり、次に使うときに戻ってきます。
  つまりインスタンスがデスクトップのぶんを負担するのは、そこで何かが動いている間だけです。
  小さなインスタンス向けの目安: 4 GB でデスクトップは動き、ブラウザを使った引き継ぎに
  余裕が出るのは 8 GB からです。

### パッケージをコンテナイメージに組み込む {#baking-the-packages-into-a-container-image}

ホスト型や権限のない環境向けのイメージは実行時に何もインストールできないので、
パッケージをビルド時に組み込んでおく必要があります。CI はバージョンごとに 2 種類を公開しています。
接尾辞のないタグ（`:latest`、`:v*`）にはパッケージが入っておらず、
**`-desktop` タグ**（`:latest-desktop`、`:v*-desktop`）には入っています。ホスト型の環境
（Fly Machines、Azure のコンテナインスタンス）では、接尾辞付きのタグを取得すれば Bot Screen が使えます。
こうした環境はビルドを一度も実行しないので、ビルド引数ではどのみち届きません。
いまのところプロビジョナーには `-desktop` を選ぶ仕組みがないため、ホスト型のインスタンスは
軽量版のまま立ち上がります。接尾辞付きのタグを自分で取得する方法なら、現時点でも使えます。

自前でビルドするのは、独自のイメージにパッケージを入れたい場合だけです。公式の `Dockerfile` には、
有効にしたときだけ効くビルド引数があります。既定ではオフなので、ふつうの
`docker build .` は軽いままです。

```bash
docker build --build-arg HERMES_BOT_DESKTOP=1 -t hermes-agent:screen .
```

これで TigerVNC、Xfce のコンポーネント、ディストリビューションの `chromium`（[引き継ぎ後も残る
ブラウザのセッション](#browser-sessions-that-survive-the-handoff)で説明している、サンドボックス用の予備）が入ります。
apt のレイヤーは Debian 13 で約 930 MB でした（実測）。Playwright のブラウザが 2 つ目として加わることはありません。
slim でも `-desktop` でも、どのイメージにも PM が固定したフル版の Chromium がすでに入っていて、
これはウィンドウを開けます。起動時には何も動かないので、この方法で作った
イメージは、画面を起動するまでメモリを使いません。

## 使い方 {#using-it}

どのボットのコンピューターにも、Hermes Desktop の 3 か所から 1 クリックで開けます。

- **Bots → ボット → Scheduled Jobs**: ペインのいちばん上、タイトルやルーティンより上に
  ボットの画面が大きく表示されます。デスクトップのライブプレビュー（ペインが見えている間は
  数秒ごとに更新）と、だれが操作しているかが出ます。画像をクリックすると広がってライブで操作できます。
  画面が止まっているときや未インストールのときは、同じ枠にその旨と Start / Install が出ます。
- **Bots → ボットを右クリック → Open Screen**。同じメニューには **Open Screen
  when the bot uses it** もあります。これにチェックを入れると、1 回の実行でボットが最初に
  `computer_use` かブラウザを呼んだ時点で Screen タブが前に出るので、あとで知るのではなく
  作業する様子をそのまま見られます。既定はオフで、ボットごとに設定します。タブを前に出しても
  キーボードのフォーカスは奪わず、再生された履歴では発火せず、
  30 秒に 1 回までです。実行の途中でタブを閉じた場合は、ボットの次の実行まで閉じたままになります。
- **Sessions サイドバー**（ゲートウェイ / プロファイルごとにまとまっています）: 各プロファイルの
  見出しの下に同じ **Screen** の枠があるので、会話からもそのプロファイルのマシンを開けます。

1. 上のどれかの入口から Screen を開きます。
   画面は**既定でオフ**で、勝手に起動することはありません。ペインの **Start screen** をクリックするか、
   ホストで `hermes computer-use screen start` を実行するか、画面のないホストで
   ボットが最初に `computer_use` を呼んだときや画面付きブラウザを最初に使ったとき
   （`browser.headed: true`）に自動で起動させたい場合は `bot_desktop.auto_start: true` を設定します。
   既定がオフなのは、TigerVNC を入れただけで、だれも頼んでいない画面ができないようにするためです。
   画面が動いていれば、画面付きブラウザはそこに開きます。
2. ペインにボットのデスクトップが映ります。見出しのチップが、だれが操作しているかを示します。
   既定は **Bot is in control** です。
3. **Take over** をクリックします。枠が赤くなり、あなたのキーボードとマウスでボットの画面を
   操作できるようになります。サインインし、CAPTCHA を解き、支払いを承認してください。
4. **Hand back** をクリックします。ボットが操作を取り戻し、続きに進む前に画面を取り込み直します。
   ペインを閉じても操作は返ります。ただし接続が*切れた*場合は別です。操作中に
   ノート PC のふたを閉じたり Wi-Fi が切れたりしても、操作権はあなたに残ります。ログインの途中かもしれない
   画面からボットを締め出したまま、再接続して返すまで待ちます。再読み込み後に戻ってきて、
   ペインがまだ人が操作中だと表示している場合は、それを解除する **Hand back (force)**
   ボタンが出ます。

あなたが操作している間、ボットの `computer_use` とブラウザ系ツールは、画面の取り込みも含めて
`human_has_control` で拒否されます。これはツール側の柵であって、OS の仕組みではありません。
ボットは画面と同じユーザーで動いています。信用して任せられないボットに秘密を入力しないでください。

ボットが自分でやるべきでない手順（ログイン、2FA、CAPTCHA、支払い）に差しかかると、
返信でそう伝えてターンを終えます。その依頼は、あなたがいまどのチャットにいても届きます。
準備ができたら引き継ぎ、手順を済ませて返し、ボットに続けるよう伝えてください。
待っている間、ボット側で止まっているものはありません。引き継ぎを始めるのは常にあなたで、
ボットがあなたを待ってツールの呼び出しを開いたままにすることはありません。

1 つの画面を 2 人が見ている場合は、最後に **Take over** したほうが優先され、
それまで操作していた人は見るだけに戻ります。

## 引き継ぎ後も残るブラウザのセッション {#browser-sessions-that-survive-the-handoff}

画面が動いている間、ボットのブラウザツールとドックの **Browser** アイコンは
同じブラウザです。agent-browser が操作する Chromium で、ボットごとに永続する
user-data-dir を 1 つ持ちます（`<HERMES_HOME>/bot-desktop/browser-profile`。自分で固定したい場合は
`AGENT_BROWSER_PROFILE` を設定します。`~` は展開され、`pin` のような相対パスは
そのボットの `HERMES_HOME` を基準に解決されます。つまり `<HERMES_HOME>/pin` です）。
引き継ぎ中に Browser をクリックすると、
ボット自身のウィンドウと Cookie の中に入れます。そこでサインインしたものは、そのあともボットが
使い、以降のすべてのセッションでも、サイト側でログインが切れるまで使われます。
ボット自身のブラウジングも画面に表示したい場合は `browser.headed: true` を設定してください。

ドックの内容が用意されるのは、そのプロファイルで初めて画面を起動したときの**1 回だけ**です。
その目印になるのがパネルのレイアウトファイル
`<HERMES_HOME>/bot-desktop/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml` です。
このファイルがある間、ランチャーはパネルに手を加えません。そのため
`AGENT_BROWSER_EXECUTABLE_PATH` や `AGENT_BROWSER_PROFILE` を変えて画面を
再起動しても、Browser アイコンは付け直されません。このファイルを削除すると、次の
`screen start` のときに、その時点で入っているものからドックが作り直されます。

ドックとボットがどの Chromium を使うか: `AGENT_BROWSER_EXECUTABLE_PATH` を明示すればそれが
優先されます。指定がなければ、Hermes は PM が管理する Chromium を使い、
それが使えなければシステムの `chromium` / `google-chrome` に切り替えます。
ただし `kernel.apparmor_restrict_unprivileged_userns=1` のホスト（Ubuntu 23.10 以降）で
root 以外のユーザーが動かす場合は、この順が逆になります。そこでは PM が管理するビルドが
サンドボックスを準備できず `FATAL: No usable sandbox!` で終了する一方、ディストリビューションの
Chromium にはそれを許可する AppArmor プロファイルが付いているからです。この選び方がホストに合わない場合は、
ゲートウェイの環境に `AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium`（または Chrome のパス）を
設定してください。公式の Docker イメージは `AGENT_BROWSER_EXECUTABLE_PATH` を、ウィンドウを描ける
PM 固定のフル版 Chromium に向けているので、ドックの Browser アイコンはそれを使います。`-desktop` のタグには
ディストリビューションの `chromium` も入っています。固定ビルドのサンドボックスを拒むホストでは、
`AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium` を設定してください。Playwright の *headless shell* が
アイコンに使われることはありません。それしかブラウザがないときは、画面付きのブラウザ（`apt-get install chromium`）を
入れるまで、ペインと `screen status` は **no headed browser** と報告します。
ドックのアイコンは、そのコンテナで agent-browser が使うのと同じサンドボックス設定でブラウザを起動するので、
人が使う Browser とボットのブラウザはまったく同じものになります。

## CLI {#cli}

```bash
hermes computer-use screen status          # installed? running? who holds control?
hermes computer-use screen start           # start this profile's screen
hermes computer-use screen stop            # stop it; refuses while a human holds control
hermes computer-use screen stop --force    # ...unless you say so (also frees a stuck lease)
hermes computer-use screen install [-y]    # apt/dnf/pacman the packages
hermes -p research computer-use screen start   # another bot's screen
```

## 設定 {#configuration}

```yaml
bot_desktop:
  geometry: "1440x900"      # screen size; the viewer scales to fit the pane
  auto_start: false         # set true to start on the first computer_use call or headed browser use
  min_free_memory_mb: 1536  # refuse to start below this much free memory (0 = never check)
  idle_stop_minutes: 30     # stop a screen nobody used for this long (0 = keep it up)
```

`auto_start` は既定でオフです。画面は Desktop の Screen
ペイン（**Start screen**）か `hermes computer-use screen start` から起動します。あるいは、
画面のないホストで、ボットが初めて `computer_use` を呼んだときや画面付きブラウザを開いたとき
（`browser.headed:
true`）に、使えるディスプレイがなければ画面を立ち上げたい場合は、このフラグを `true` にします。

状態はプロファイルごとに `<HERMES_HOME>/bot-desktop/` の下に置かれます（RFB の Unix ソケット、
Xauthority、ランチャーのログ、プロファイルごとの xfconf）。

## 仕組み {#how-it-works}

- **TigerVNC `Xvnc`** は、X サーバーと RFB サーバーを 1 つのプロセスで兼ね、プロファイルごとに
  動きます。待ち受けるのは `0600` の Unix ソケットだけです。TCP ポートも VNC の
  パスワードもありません。到達できるのはゲートウェイのユーザーとして動くプロセスだけで（上の
  脅威モデルを参照）、外から入る正規の経路は、認証付きのゲートウェイの WebSocket ブリッジです。
- **Xfce** は、プライベートな D-Bus セッションの下でコンポーネント単位（`xfsettingsd`、`xfwm4 --compositor=off`、
  `xfdesktop`、`xfce4-panel`）に起動します。
  `xfce4-session` は使わないので、画面をロックしようとしたり `logind` に接続しようとしたりするものはありません。
- **Hermes Desktop** には noVNC が同梱されています。いつもの認証付き接続でゲートウェイに
  1 回限りのチケット（`display.observe`）を求め、別の WebSocket を
  `/api/display/ws` に開きます。ゲートウェイは RFB のストリームをそのままつなぎます。
  新たに公開されるものはなく、このペインはローカル、SSH、URL+トークン、
  Hermes Cloud のどの接続でも同じように動きます。
- **操作のリース。** ゲートウェイは、リースを持っていないビューアーからのキーボード、ポインター、
  クリップボードのメッセージを RFB のバイト単位で捨てます。noVNC の
  閲覧専用フラグは UI 上の目安にすぎません。同じリースが `computer_use` と
  ブラウザ系ツールも制御します。リースは `<HERMES_HOME>/bot-desktop/` の下のファイルです。ファイルがなければ
  ボットが操作権を持ちます（新しいプロファイルの状態）。ファイルがあるのに読めない、または解析できない場合は
  安全側に倒れ、次に引き継ぎが成功してファイルが書き直されるまで、ボットは締め出された扱いになります。
  Xvnc が画面のクリップボードをビューアーへ送ることはないので（`-SendCutText=0`）、
  見ているだけの人に、操作している人がコピーした内容は届きません。画面への貼り付けはこれまでどおりできます。
- **ディスプレイの結び付け。** ランチャーは `DISPLAY`、`XAUTHORITY`、
  D-Bus のアドレスを公開します。そのプロファイルで起動する cua-driver と画面付きブラウザはすべて
  これを引き継ぐので、ボットが人の座っているディスプレイを操作することはありません。

## トラブルシューティング {#troubleshooting}

- **「Screen packages missing」** — ペインの **Install on host** をクリックするか、
  表示されたインストール行をゲートウェイホストで実行してください（Hermes Desktop を動かしている
  端末ではありません）。インストールの実行中に、ペインが 2 回目のインストールを受け付けることはありません。
- **画面が起動してすぐ止まる** — `<HERMES_HOME>/bot-desktop/launcher.log` を確認してください。
- **引き継ぎ中に入力すると違う文字が出る** — RFB のキーシムと cua-driver の解釈をそろえるため、
  画面は US キーマップで動いています。さらに noVNC は、Xvnc が対応を示すと生のキーコード
  （QEMU 拡張キーイベント）を送ります。そのため US 以外の物理キーボードでは、配列に依存するキー（Y/Z や記号）が、
  操作している間は US 配列の対応するキーとして入力されます。パスワードはそのつもりで入力するか、
  その `DISPLAY` で `setxkbmap` を使って配列を変えてください。
- **離れたあとにボットが `human_has_control` と言う** — ペインの **Hand back** をクリックします
  （再読み込み後なら **Hand back (force)**）。シェルからは、
  `hermes computer-use screen stop --force` でリースを解放して画面を止められます
  （`--force` なしだと、人が操作している間はコマンドが拒否するので、運用手順書が
  進行中の引き継ぎを奪い取ることはありません）。`hermes computer-use screen start` で、
  ボットが操作する状態で画面が戻ります。

### WSL で試す {#testing-under-wsl}

WSL2 は対応する Linux ホストとして扱われます。`screen status` もそう報告し、
ペインも表示されます。ただし WSLg の癖が 1 つ、最初の起動を邪魔します。WSLg は
<!-- no-tmp: ok — the X11 socket directory is fixed by the protocol, not a scratch path -->
`/tmp/.X11-unix` を読み取り専用でマウントするので、`Xvnc` がディスプレイのソケットを作れず、
`launcher.log` に `Cannot establish any listening sockets` を残して終了します。
画面を起動する前に、このマウントを書き込めるディレクトリに置き換えてください。

```bash
sudo umount /tmp/.X11-unix  # no-tmp: ok — X11 socket directory, fixed by the protocol
sudo mkdir -p /tmp/.X11-unix && sudo chmod 1777 /tmp/.X11-unix  # no-tmp: ok — same
```

このマウントは WSL を次に再起動すると元に戻るので、そのたびに 2 つのコマンドを実行し直してください。
