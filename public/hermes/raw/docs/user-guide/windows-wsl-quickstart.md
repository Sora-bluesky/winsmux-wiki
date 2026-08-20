---
title: "Windows（WSL2）ガイド"
description: "WSL2 を使って Windows で Hermes Agent を動かす方法。セットアップ、Windows と Linux の間のファイルのやり取り、ネットワーク、よくあるつまずき"
upstream_path: user-guide/windows-wsl-quickstart.md
upstream_blob: 2128b3be9147d810566c79c22701b8dabcb9cb5d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/windows-wsl-quickstart
---

# Windows（WSL2）ガイド {#windows-wsl2-guide}

Hermes Agent は、ネイティブの Windows と WSL2 の**どちらにも**対応しています。  このページは WSL2 のほうを扱います。PowerShell からのネイティブなインストールについては、専用の **[Windows（ネイティブ）ガイド](/hermes/docs/user-guide/windows-native/)**を参照してください。

**ネイティブではなく WSL2 を選ぶ場面:**
- ダッシュボードに埋め込まれたターミナル（`/chat` タブ）を使いたい。このペインは POSIX の PTY が要るので、WSL2 でしか使えません。
- POSIX 寄りの開発をしていて、Hermes のセッションを開発ツールと同じファイルシステム・同じパスで動かしたい。
- すでに WSL2 の環境があり、2 つ目のインストールを抱えたくない。

**ネイティブで十分な（あるいはそのほうがよい）場面:**
- 対話的なチャット、ゲートウェイ（Telegram / Discord など）、cron のスケジューラ、ブラウザツール、MCP サーバ、そのほか Hermes のほとんどの機能は、Windows でそのまま動きます。
- ファイルを指したり URL を開いたりするたびに、WSL と Windows の境界を意識したくない。

WSL2 では、事実上 2 台のコンピュータが動いています。Windows のホストと、WSL が管理する Linux の仮想マシンです。  混乱のほとんどは、いま自分がどちらにいるのか分からなくなることから生まれます。

このガイドでは、その分かれ目のうち Hermes に特に関わる部分を扱います。WSL2 の導入、Windows と Linux の間でのファイルのやり取り、双方向のネットワーク、そして実際によく踏むつまずきです。

:::info 简体中文
最小構成のインストール手順を中国語で説明したものが、この同じページに用意されています。右上の**言語**メニューから **简体中文** を選んでください。
:::

## なぜ WSL2 なのか（ネイティブの Windows との比較） {#why-wsl2-vs-native-windows}

ネイティブのインストールは Windows の中でそのまま動きます。Windows のターミナル（PowerShell、Windows ターミナルなど）、Windows のパス（`C:\Users\…`）、Windows のプロセスです。  Hermes はシェルのコマンドを Git Bash で実行します。これは Claude Code をはじめ、いまどきのエージェントが Windows を扱うやり方で、全面的な書き直しをせずに POSIX と Windows の差を回避します。

WSL2 は軽量な仮想マシンの中で本物の Linux カーネルを動かすので、その中の Hermes は Ubuntu で動かすのとほぼ同じです。  本物の POSIX 環境が欲しいときには、これが効いてきます。`fork`、`/tmp`、UNIX ソケット、シグナルの扱い、PTY に支えられたターミナル、`bash` や `zsh` のようなシェル、そして `rg`、`git`、`ffmpeg` といったツールが Linux と同じように振る舞います。

WSL2 にすると、実際には次のようになります。

- Hermes の CLI、ゲートウェイ、セッション、記憶、スキル、ツールの実行環境は、すべて Linux の仮想マシンの中にあります。
- Windows のプログラム（ブラウザ、ネイティブアプリ、ログイン済みのプロファイルを持つ Chrome）は、その外側にあります。
- その 2 つをやり取りさせたいとき（ファイルの共有、URL を開く、Chrome の操作、手元のモデルサーバへの接続、Hermes のゲートウェイをスマートフォンから見えるようにする）は、いつでも境界をまたぐことになります。このガイドが扱うのは、その境界の話です。

## WSL2 を導入する {#install-wsl2}

**管理者権限の PowerShell** か Windows ターミナルから実行します。

```powershell
wsl --install
```

まっさらな Windows 10 22H2 以降、または Windows 11 の環境なら、これで WSL2 のカーネル、仮想マシン プラットフォームの機能、そして既定の Ubuntu が入ります。促されたら再起動してください。再起動後に Ubuntu が開き、Linux のユーザー名とパスワードを聞かれます。これは**新しい Linux のユーザー**で、Windows のアカウントとは関係ありません。

いま動いているのが本当に WSL2 か（古い WSL1 ではないか）確認します。

```powershell
wsl --list --verbose
```

`VERSION  2` と出るはずです。`VERSION  1` になっているディストリビューションがあれば、変換します。

```powershell
wsl --set-version Ubuntu 2
wsl --set-default-version 2
```

Hermes は WSL1 では安定して動きません。WSL1 は Linux のシステムコールをその場で置き換えていて、一部の振る舞い（procfs、シグナル、ネットワーク）が本物の Linux と食い違うためです。

### ディストリビューションの選択 {#distro-choice}

私たちが動作確認しているのは Ubuntu（LTS）です。Debian でも動きます。Arch や NixOS も、それを望む人には使えますが、1 行のインストーラは Debian 系の `apt` を前提にしています。その場合は [Nix セットアップガイド](https://hermes-agent.nousresearch.com/getting-started/nix-setup)を参照してください。

### systemd を有効にする（おすすめ） {#enable-systemd-recommended}

hermes のゲートウェイ（と、動かし続けたいものすべて）は、systemd があるほうが扱いやすくなります。最近の WSL なら、ディストリビューションの中で一度設定すれば済みます。

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true

[interop]
enabled=true
appendWindowsPath=true

[automount]
options = "metadata,umask=22,fmask=11"
EOF
```

そのうえで PowerShell から実行します。

```powershell
wsl --shutdown
```

WSL のターミナルを開き直します。`ps -p 1 -o comm=` を実行すると `systemd` と表示されるはずです。

上の `metadata` というマウントのオプションは重要です。これが無いと `/mnt/c/...` のファイルが Linux 本来のパーミッションのビットを保存できず、Windows 側のパスに置いたスクリプトへの `chmod +x` などが効かなくなります。

### WSL の中に Hermes を入れる {#install-hermes-inside-wsl}

WSL2 のシェルを開いたら、次を実行します。

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc
hermes
```

インストーラは WSL2 をただの Linux として扱うので、WSL 向けの特別な作業は要りません。全体の構成は [インストール](https://hermes-agent.nousresearch.com/getting-started/installation)を参照してください。

## ファイルシステム: Windows と WSL2 の境界をまたぐ {#filesystem-crossing-the-windows-wsl2-boundary}

ここが一番つまずく人の多いところです。ファイルシステムは**2 つ**あり、ファイルをどちらに置くかで、速さも正しさも、どのツールから見えるかも変わります。

### 2 つの方向 {#the-two-directions}

| 方向 | 元のパス | 使うパス |
|---|---|---|
| Windows のディスクを WSL から見る | `C:\Users\you\Documents` | `/mnt/c/Users/you/Documents` |
| WSL のディスクを Windows から見る | `/home/you/code` | `\\wsl$\Ubuntu\home\you\code`（新しいビルドでは `\\wsl.localhost\Ubuntu\...`） |

どちらも本物で、どちらも使えますが、**同じファイルシステムではありません**。裏では 9P というネットワークのプロトコルで橋渡しされています。そのせいで、速さの面でも振る舞いの面でも実際に違いが出ます。

### Hermes と自分のプロジェクトをどこに置くか {#where-to-put-hermes-and-your-projects}

**目安: Linux 寄りのものは Linux のファイルシステムの中にすべて置く。**

- Hermes のインストール先（`~/.hermes/`）は Linux 側です。インストーラがすでにそうしています。
- WSL から作業する git のリポジトリも Linux 側（`~/code/...`、`~/projects/...`）に。
- モデル、データセット、仮想環境も Linux 側に。

この目安に従うと、次のようになります。

- **入出力が速い。** `/mnt/c/...` に対する操作は 9P を通るので、ネイティブの ext4 と比べて 10〜100 倍遅くなります。`~/code` の下なら一瞬に感じる 1 万ファイルのリポジトリの `git status` が、`/mnt/c` の下では 15 秒以上かかることもあります。
- **パーミッションが正しく扱われる。** `/mnt/c` では Linux のパーミッションのビットは、できる範囲でまねているだけです。`ssh` が「パーミッションが不適切」と言って鍵を受け付けない、`chmod +x` が黙って効かない、といったことがよく起こります。
- **ファイル監視が確実に動く。** 9P をまたぐ inotify は不安定で、ファイル監視（開発サーバ、テストの実行ツール）は `/mnt/c` では変更を取りこぼしがちです。
- **大文字小文字で驚かされない。** Windows のパスは既定で大文字と小文字を区別しませんが、Linux は区別します。`Readme.md` と `README.md` が両方あるプロジェクトは、どちら側から見るかで挙動が変わります。

`/mnt/c` に置くのは、そのファイルが Windows 側にある**必要がある**ときだけにしてください。たとえば Windows の GUI アプリから開きたい場合や、Windows の Chrome の DevTools MCP が Windows から辿れるパスを作業ディレクトリとして要求する場合です。

### ファイルをやり取りする {#getting-files-back-and-forth}

**Windows から WSL へ:** いちばん簡単なのは、エクスプローラーを開いてアドレスバーに `\\wsl.localhost\Ubuntu` と入れる方法です。そこから `\home\<you>\...` にドラッグ＆ドロップできます。PowerShell からなら次のようにします。

```powershell
wsl cp /mnt/c/Users/you/Downloads/file.pdf ~/incoming/
```

**WSL から Windows へ:** `/mnt/c/Users/<you>/...` にコピーすれば、すぐに Windows のエクスプローラーに現れます。

```bash
cp ~/reports/output.pdf /mnt/c/Users/you/Desktop/
```

**WSL のファイルを Windows のアプリで開く**（GUI のエディタ、ブラウザなど）には、`explorer.exe` か `wslview` を使います。

```bash
sudo apt install wslu     # once — gives you wslview, wslpath, wslopen, etc.
wslview ~/reports/output.pdf    # opens with the Windows default handler
explorer.exe .                  # opens the current WSL dir in Windows Explorer
```

**2 つの世界の間でパスを変換する:**

```bash
wslpath -w ~/code/project        # → \\wsl.localhost\Ubuntu\home\you\code\project
wslpath -u 'C:\Users\you'        # → /mnt/c/Users/you
```

### 改行コード、BOM、git {#line-endings-boms-and-git}

Windows 側のエディタでファイルを編集すると、改行が `CRLF` になることがあります。それを Linux 側の `bash` や Python が読むと、シェルスクリプトは `bad interpreter: /bin/bash^M` で壊れ、Python は BOM 付きの `.env` ファイルで失敗することがあります。

対処は、WSL の中で git を素直に設定することです（Windows 側ではありません）。

```bash
git config --global core.autocrlf input
git config --global core.eol lf
```

すでに CRLF になっているファイルには、次を使います。

```bash
sudo apt install dos2unix
dos2unix path/to/script.sh
```

### 「WSL の中と `/mnt/c` のどちらにクローンする？」 {#clone-inside-wsl-or-on-mntc}

WSL の中です。特別な理由がないかぎり、いつでもそうしてください。ふだんの Hermes の使い方（`hermes chat`、リポジトリを `rg`／`ripgrep` で探すツールの呼び出し、ファイル監視、裏で動くゲートウェイ）は、`/mnt/c/Users/you/myrepo` よりも `~/code/myrepo` に対するほうが、はるかに速く確実です。

例外が 1 つあります。**Windows のバイナリを起動する MCP のブリッジ**です。`cmd.exe` を通して `chrome-devtools-mcp` を使っている場合（[MCP ガイド: WSL から Windows の Chrome へ](https://hermes-agent.nousresearch.com/guides/use-mcp-with-hermes#wsl2-bridge-hermes-in-wsl-to-windows-chrome)を参照）、Hermes の作業ディレクトリが `~` だと Windows が `UNC` の警告を出すことがあります。その場合は、Windows のプロセスにドライブレターの作業ディレクトリを持たせるために、`/mnt/c/` の下のどこかから Hermes を起動してください。

## ネットワーク: WSL と Windows {#networking-wsl-windows}

WSL2 は軽量な仮想マシンの中で、自分専用のネットワークを持って動きます。つまり、WSL の中の `localhost` は Windows の `localhost` と**同じではありません**。ネットワークから見れば、2 つは別々のホストです。サービスごとに、通信がどちらの向きに流れるのかを決めて、それに合う橋渡しを選ぶ必要があります。

よく出てくるのは 2 つの場合です。

### 場合 1 — WSL の中の Hermes が、Windows のサービスと話す {#case-1-hermes-in-wsl-talks-to-a-service-on-windows}

いちばん多いのは、**Windows で Ollama、LM Studio、llama-server を動かして**いて、WSL の中の Hermes からそこにつなぎたい、という場合です。

この手順の正本はプロバイダのガイドにあります。**[ローカルモデルのための WSL2 のネットワーク →](https://hermes-agent.nousresearch.com/integrations/providers#wsl2-networking-windows-users)**

要点だけ書くと、次のとおりです。

- **Windows 11 22H2 以降:** ミラーモードのネットワークを有効にします（`%USERPROFILE%\.wslconfig` に `networkingMode=mirrored` を書いて `wsl --shutdown`）。これで `localhost` が双方向に通じます。
- **Windows 10 や古いビルド:** Windows ホストの IP（WSL の仮想ネットワークの既定ゲートウェイ）を使い、Windows 側のサーバが `127.0.0.1` だけでなく `0.0.0.0` で待ち受けるようにします。たいていは Windows ファイアウォールにもそのポートの規則が要ります。

Ollama / LM Studio / vLLM / SGLang の待ち受けアドレス、ファイアウォールの規則を作る 1 行、IP が変わるときの補助スクリプト、Hyper-V のファイアウォールの回避策といった全体の表は、上のリンク先を参照してください。ここでは重複させません。

### 場合 2 — Windows（または LAN）の何かが、WSL の中の Hermes と話す {#case-2-something-on-windows-or-your-lan-talks-to-hermes-in-wsl}

こちらは逆向きで、他ではあまり説明されていませんが、次のようなときに必要になります。

- Hermes の **Web ダッシュボード**を Windows のブラウザから使う。
- **OpenAI 互換の API サーバ**（`API_SERVER_ENABLED=true` のときに `hermes gateway` が公開します）を Windows 側のツールから使う。[API サーバの機能ページ](https://hermes-agent.nousresearch.com/user-guide/features/api-server)を参照してください。
- **メッセージングのゲートウェイ**（Telegram、Discord など）を試す。プラットフォーム側が手元の webhook の URL を叩く形になりますが、たいていは素のポート転送ではなく `cloudflared` や `ngrok` を使います。

#### 場合 2a: Windows のホスト自身から {#subcase-2a-from-the-windows-host-itself}

**Windows 11 22H2 以降でミラーモードを有効にしている**なら、何もすることはありません。WSL の中で `0.0.0.0:8080`（あるいは `127.0.0.1:8080` でも）を待ち受けているプロセスに、Windows のブラウザから `http://localhost:8080` で届きます。WSL が待ち受けを自動でホスト側に出してくれます。

**NAT モード**（Windows 10 や古い Windows 11）では、WSL2 の既定の localhost 転送が、たいてい Linux 側の `127.0.0.1` の待ち受けを Windows の `localhost` に流してくれるので、`--host 127.0.0.1` で起動した Hermes のサービスには、ふつう Windows から `http://localhost:PORT` で届きます。届かない場合は次のようにします。

- WSL の中で明示的に `0.0.0.0` を待ち受けます。
- `ip -4 addr show eth0 | grep inet` で WSL の仮想マシンの IP を調べ、Windows からそこへつなぎます。

#### 場合 2b: LAN 上の別の端末から（スマートフォン、タブレット、別の PC） {#subcase-2b-from-another-device-on-your-lan-phone-tablet-another-pc}

ここが本当に面倒なところです。通信は **LAN の端末 → Windows のホスト → WSL の仮想マシン**と流れるので、この 2 段の両方を用意する必要があります。

1. **WSL の中で、すべてのインターフェースを待ち受ける。** `127.0.0.1` を待ち受けているプロセスには、仮想マシンの外からは決して届きません。`0.0.0.0` を使ってください。

2. **Windows から WSL の仮想マシンへポートを転送する。** ミラーモードでは自動です。NAT モードでは、管理者権限の PowerShell でポートごとに自分で設定します。

   ```powershell
   # Grab the WSL VM's current IP (it changes on every WSL restart under NAT)
   $wslIp = (wsl hostname -I).Trim().Split(' ')[0]

   # Forward Windows port 8080 → WSL:8080
   netsh interface portproxy add v4tov4 `
     listenaddress=0.0.0.0 listenport=8080 `
     connectaddress=$wslIp connectport=8080

   # Allow it through Windows Firewall
   New-NetFirewallRule -DisplayName "Hermes WSL 8080" `
     -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
   ```

   あとで消すときは `netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8080` を使います。

3. **LAN の端末を `http://<windows-lan-ip>:8080` に向ける。**

NAT モードでは WSL の仮想マシンの IP が再起動のたびに変わるので、その場かぎりの規則は次の `wsl --shutdown` までしかもちません。ずっと使いたいなら、ミラーモードにするか、ポート転送の手順を Windows のログイン時に走るスクリプトに入れてください。

クラウドのメッセージングのサービスからの webhook（Telegram の `setWebhook`、Slack のイベントなど）については、ポート転送と格闘せず `cloudflared` のトンネルを使ってください。[webhook のガイド](https://hermes-agent.nousresearch.com/user-guide/messaging/webhooks)を参照してください。

## Windows で Hermes のサービスを長く動かし続ける {#running-hermes-services-long-term-on-windows}

Hermes の [Tool Gateway](https://hermes-agent.nousresearch.com/user-guide/features/tool-gateway) と API サーバは、長く動かし続けるプロセスです。WSL2 では、それを保つのにいくつかの選択肢があります。

### Hermes をすぐ開くためのデスクトップのショートカット {#desktop-shortcut-for-opening-hermes-quickly}

対話的な Hermes をダブルクリックで開きたいだけなら、Windows 側にショートカットを作って、
WSL に入るところまでやってもらいます。

1. Windows のデスクトップを右クリックして **新規作成 -> ショートカット** を選びます。
2. リンク先には、自分のディストリビューション名を使います（`Ubuntu` の部分は必要に応じて置き換えてください）。

   ```text
   wt.exe -w 0 -p "Ubuntu" wsl.exe -d Ubuntu --cd ~ -- bash -ic "hermes"
   ```

3. `Hermes` のような分かりやすい名前を付けます。

これで Windows ターミナルが開き、WSL のディストリビューションが起動し、Linux のホーム
ディレクトリに入って、Hermes が立ち上がります。`hermes` がまだ PATH に無ければ、一度 WSL を
手で開いて `source ~/.bashrc` を実行するか、コマンドをプロジェクトのチェックアウトの中で
`uv run hermes` に置き換えてください。

もう少し整えるなら、次のようにします。

- **アイコンを変える:** **プロパティ -> アイコンの変更**を開き、`.ico` のファイル（リポジトリにある
  Hermes の favicon など）を指定します。
- **ランチャーを固定する:** ショートカットが動いたら、スタートやタスクバーに固定して、
  毎回探さなくて済むようにします。

### WSL の中で systemd を使う（おすすめ） {#inside-wsl-with-systemd-recommended}

上のセットアップの節のとおり systemd を有効にしてあれば、`hermes gateway` と API サーバは、ふつうの Linux と同じように動きます。ゲートウェイのセットアップウィザードを使ってください。

```bash
hermes gateway setup
```

WSL が起動したときにゲートウェイが自動で立ち上がるよう、systemd のユーザーユニットを入れるか尋ねてくれます。

### Windows のログイン時に WSL 自体を起動する {#making-wsl-itself-start-on-windows-login}

WSL の仮想マシンは、何かがそれを使っている間だけ生きています。ターミナルのウィンドウを開いたままにせずにゲートウェイに届く状態を保つには、タスク スケジューラで Windows のログイン時に WSL のプロセスを 1 つ起動します。

- **トリガー:** ログオン時（自分のユーザー）。
- **操作:** プログラムの開始
  - プログラム: `C:\Windows\System32\wsl.exe`
  - 引数: `-d Ubuntu --exec /bin/sh -c "sleep infinity"`

これで仮想マシンが生き続け、systemd が管理するゲートウェイも動き続けます。Windows 11 では、新しい `wsl --install --no-launch` と自動起動の仕組みも使えます。`sleep infinity` の手は、どの環境でも通じるやり方です。

## GPU の受け渡し（手元のモデル） {#gpu-passthrough-local-models}

WSL2 は WSL カーネル 5.10.43 以降、**NVIDIA** の GPU にそのまま対応しています。Windows 側に通常の NVIDIA のドライバを入れてください（WSL の中に Linux 用の NVIDIA ドライバを入れては**いけません**）。そうすれば WSL の中の `nvidia-smi` から GPU が見えます。そこから先は、CUDA のツールキット、`torch`、`vllm`、`sglang`、`llama-server` が、いつもどおり本物の GPU に対してビルドされます。

WSL2 の中の AMD ROCm と Intel Arc の対応はまだ発展途上で、Hermes の動作確認の対象外です。いまのドライバなら動くかもしれませんが、おすすめできる手順は用意できていません。

すでに Windows のドライバ経由で GPU を使っている **Windows ネイティブ**のモデルサーバ（Windows 版 Ollama、LM Studio）を動かしているなら、WSL の GPU の受け渡しはまったく要りません。上の場合 1 に従って、WSL からネットワーク越しにつなぐだけです。

## よくあるつまずき {#common-pitfalls}

**Windows で動かしている Ollama / LM Studio に「Connection refused」と出る。**
[WSL2 のネットワーク](https://hermes-agent.nousresearch.com/integrations/providers#wsl2-networking-windows-users)を参照してください。9 割がた、サーバが `127.0.0.1` を待ち受けていて `0.0.0.0` にする必要があるか（Ollama なら `OLLAMA_HOST=0.0.0.0`）、ファイアウォールの規則が足りていません。

**リポジトリの中で `git status` や `hermes chat` がとんでもなく遅い。**
おそらく `/mnt/c/...` の下で作業しています。リポジトリを `~/code/...`（Linux 側）に移してください。桁違いに速くなります。

**スクリプトで `bad interpreter: /bin/bash^M` と出る。**
Windows のエディタが付けた CRLF の改行です。`dos2unix script.sh` を実行し、WSL の git の設定で `core.autocrlf input` にしてください。

**MCP から起動した Windows のバイナリが「UNC paths are not supported」と警告する。**
Hermes の作業ディレクトリが Linux のファイルシステムの中にあり、Windows の `cmd.exe` はそれをどう扱えばいいか分かりません。そのセッションだけ `/mnt/c/...` から Hermes を起動するか、Windows の実行ファイルを呼ぶ前に Windows から辿れるパスへ `cd` するラッパーを使ってください。

**スリープや休止のあとに時刻がずれる。**
ホストがスリープから復帰すると、WSL2 の時計が数分ずれることがあります。証明書に関わるもの（OAuth、HTTPS の API）は、これで動かなくなります。その場で直すには次を実行します。

```bash
sudo hwclock -s
```

あるいは `ntpdate` を入れて、ログイン時に実行してください。

**ミラーモードを有効にしたあと、または VPN の接続中に DNS が効かなくなる。**
ミラーモードはホストのネットワーク設定を WSL に持ち込みます。Windows 側の DNS が素直でない場合（VPN のスプリットトンネル、社内のリゾルバなど）、WSL もそれを引き継ぎます。回避策は `resolv.conf` を自分で用意することです（`/etc/wsl.conf` に `generateResolvConf=false` を書き、`1.1.1.1` や VPN の DNS を書いた `/etc/resolv.conf` を自分で置きます）。

**インストーラを実行したのに `hermes` が見つからない。**
インストーラは `~/.bashrc` を通じて `~/.local/bin` をシェルの PATH に追加します。いまのセッションで反映させるには `source ~/.bashrc` を実行する（か、新しいターミナルを開く）必要があります。

**Windows Defender が WSL のファイルに対して遅い。**
Windows からアクセスしたファイルは、Defender が 9P の橋渡し越しに検査するので、`/mnt/c` のような境界をまたぐアクセスの遅さがさらに際立ちます。WSL のファイルを WSL の中からしか触らないなら関係ありません。Windows のツールから `\\wsl$\...` をよく使うなら、その WSL のディストリビューションのパスをリアルタイム検査の対象から外すことを検討してください。

**ディスクが足りなくなる。**
WSL2 は仮想マシンのディスクを、`%LOCALAPPDATA%\Packages\...` の下にスパースな VHDX として保存します。大きくはなりますが、ファイルを消しても自動では縮みません。空き容量を取り戻すには、`wsl --shutdown` してから管理者権限の PowerShell で `Optimize-VHD -Path <path-to-ext4.vhdx> -Mode Full` を実行します（Hyper-V のツールが要ります）。もっと簡単な `diskpart` を使う方法も WSL の公式ドキュメントに載っています。

## 次に読むもの {#where-to-go-next}

- **[インストール](https://hermes-agent.nousresearch.com/getting-started/installation)** — 実際のインストール手順（Linux / WSL2 / Termux は同じインストーラを使います）。
- **[統合 → プロバイダ → WSL2 のネットワーク](https://hermes-agent.nousresearch.com/integrations/providers#wsl2-networking-windows-users)** — 手元のモデルサーバのためのネットワークの、詳しい正本。
- **[MCP ガイド → WSL から Windows の Chrome へ](https://hermes-agent.nousresearch.com/guides/use-mcp-with-hermes#wsl2-bridge-hermes-in-wsl-to-windows-chrome)** — ログイン済みの Windows の Chrome を、WSL の中の Hermes から操作する方法。
- **[Tool Gateway](https://hermes-agent.nousresearch.com/user-guide/features/tool-gateway)** と **[Web ダッシュボード](https://hermes-agent.nousresearch.com/user-guide/features/web-dashboard)** — WSL からネットワークの他の場所に公開したくなることが一番多い、長く動かし続けるサービス。
