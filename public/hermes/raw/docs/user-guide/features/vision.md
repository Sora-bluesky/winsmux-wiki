---
title: "画像を見せる・貼り付ける"
description: "クリップボードの画像を Hermes の CLI に貼り付けて、画像を読ませます。"
upstream_path: user-guide/features/vision.md
upstream_blob: 44352af392d9a6851cdecf39d6323876ae90137b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/vision
---

# 画像を見せる・貼り付ける {#vision-image-paste}

Hermes Agent は**画像も読み取れます**。クリップボードにある画像をそのまま CLI に貼り付けて、中身の説明や分析、それを使った作業を頼めます。画像は base64 に変換した内容ブロックとしてモデルへ送られるので、画像を扱えるモデルならどれでも処理できます。

:::tip
Portal を契約していれば、画像を読めるモデル（Claude、GPT-5、Gemini）が同じ一覧の中に入っています。別の認証情報は要りません。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## 動く仕組み {#how-it-works}

1. 画像をクリップボードにコピーします（画面の撮影、ブラウザの画像など）
2. 下のいずれかの方法で添えます
3. 質問を打ち込んで Enter を押します
4. 入力欄の上に `[📎 Image #1]` という札が出ます
5. 送信すると、画像は画像用の内容ブロックとしてモデルへ渡ります

送る前に画像を何枚も添えられます。1枚ごとに札が付きます。`Ctrl+C` を押すと、添えた画像をまとめて外せます。

画像は `~/.hermes/images/` に、日時の入った名前の PNG として残ります。

## 貼り付けの方法 {#paste-methods}

どの方法で画像を添えられるかは、使っている端末の環境によります。どこでも全部が使えるわけではないので、全体をまとめます。

### `/paste` コマンド {#paste-command}

**画像を明示的に添えたいときの、いちばん確実な逃げ道です。**

```
/paste
```

`/paste` と打って Enter を押すと、Hermes がクリップボードの中の画像を探して添えます。端末が `Cmd+V`／`Ctrl+V` を横取りしてしまうときや、画像だけをコピーしていて貼り付け用の文字が何も来ないときは、これが安全です。

### Ctrl+V / Cmd+V {#ctrlv-cmdv}

貼り付けは、いまは段階を踏んで処理されます。
- まず普通の文字の貼り付けとして扱います
- 端末から文字がうまく届かなかったときは、OS のクリップボードや OSC52 の文字を見にいきます
- クリップボードや貼り付けられた中身が画像や画像の場所だと分かれば、画像として添えます

そのおかげで、macOS の画面撮影が置かれる一時的な場所や `file://...` という形の画像の場所を貼り付けても、ただの文字として入力欄に残らず、そのまま画像として添えられます。

:::warning
クリップボードに**画像しかない**（文字がない）ときは、端末が画像そのものを送る手立てを持っていません。そういうときは `/paste` を使って明示的に添えてください。
:::

### VS Code / Cursor / Windsurf で使う `/terminal-setup` {#terminal-setup-for-vs-code-cursor-windsurf}

macOS で、VS Code 系の内蔵端末の中で TUI を動かしている場合、複数行の入力や取り消し・やり直しの挙動をそろえるために、Hermes が推奨の `workbench.action.terminal.sendSequence` の割り当てを入れられます。

```text
/terminal-setup
```

`Cmd+Enter` や `Cmd+Z`、`Shift+Cmd+Z` が IDE に横取りされているときにとくに役立ちます。手元の端末でだけ実行してください。SSH でつないだ先では実行しないでください。

## 環境ごとの対応表 {#platform-compatibility}

| 環境 | `/paste` | Cmd/Ctrl+V | `/terminal-setup` | 補足 |
|---|:---:|:---:|:---:|---|
| **macOS Terminal / iTerm2** | ✅ | ✅ | n/a | いちばん快適です。OS のクリップボードも、画面撮影の置き場所からの復帰も効きます |
| **Apple Terminal** | ✅ | ✅ | n/a | Cmd+←/→/⌫ が書き換えられている場合は、Ctrl+A / Ctrl+E / Ctrl+U で代用します |
| **Linux X11 デスクトップ** | ✅ | ✅ | n/a | `xclip` が要ります（`apt install xclip`） |
| **Linux Wayland デスクトップ** | ✅ | ✅ | n/a | `wl-paste` が要ります（`apt install wl-clipboard`） |
| **WSL2（Windows Terminal）** | ✅ | ✅ | n/a | `powershell.exe` を使うので、追加の導入は要りません |
| **VS Code / Cursor / Windsurf（手元）** | ✅ | ✅ | ✅ | Cmd+Enter や取り消し・やり直しをそろえたいなら、こちらをおすすめします |
| **VS Code / Cursor / Windsurf（SSH 越し）** | ❌² | ❌² | ❌³ | `/terminal-setup` は手元の端末で実行してください |
| **SSH の端末（どれでも）** | ❌² | ❌² | n/a | つないだ先からは手元のクリップボードに触れません |

² 下の [SSH と遠隔のセッション](#ssh--remote-sessions) を参照してください
³ このコマンドは手元の IDE の割り当てを書き換えるものなので、つないだ先で実行してはいけません

## 環境ごとの準備 {#platform-specific-setup}

### macOS {#macos}

**準備は要りません。** Hermes は macOS に最初から入っている `osascript` でクリップボードを読みます。もっと速くしたければ `pngpaste` を入れてもかまいません。

```bash
brew install pngpaste
```

### Linux（X11） {#linux-x11}

`xclip` を入れます。

```bash
# Ubuntu/Debian
sudo apt install xclip

# Fedora
sudo dnf install xclip

# Arch
sudo pacman -S xclip
```

### Linux（Wayland） {#linux-wayland}

最近の Linux デスクトップ（Ubuntu 22.04 以降、Fedora 34 以降）は、初めから Wayland のことが多いです。`wl-clipboard` を入れます。

```bash
# Ubuntu/Debian
sudo apt install wl-clipboard

# Fedora
sudo dnf install wl-clipboard

# Arch
sudo pacman -S wl-clipboard
```

:::tip Wayland かどうかを確かめる方法
```bash
echo $XDG_SESSION_TYPE
# "wayland" = Wayland, "x11" = X11, "tty" = no display server
```
:::

### WSL2 {#wsl2}

**追加の準備は要りません。** Hermes は WSL2 を（`/proc/version` を見て）自動で見分け、`powershell.exe` から .NET の `System.Windows.Forms.Clipboard` を通して Windows 側のクリップボードを読みます。これは WSL2 の Windows 連携に元から備わっているもので、`powershell.exe` は最初から使えます。

クリップボードの中身は base64 にした PNG として標準出力で渡されるので、場所の変換や一時ファイルは要りません。

:::info WSLg の場合
WSLg（画面表示に対応した WSL2）を使っているときは、Hermes はまず PowerShell の経路を試し、だめなら `wl-paste` に切り替えます。WSLg のクリップボードの橋渡しは画像を BMP でしか扱えないため、Hermes が Pillow（入っていれば）か ImageMagick の `convert` で BMP を PNG に変換します。
:::

#### WSL2 でクリップボードが読めるか確かめる {#verify-wsl2-clipboard-access}

```bash
# 1. Check WSL detection
grep -i microsoft /proc/version

# 2. Check PowerShell is accessible
which powershell.exe

# 3. Copy an image, then check
powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::ContainsImage()"
# Should print "True"
```

## SSH と遠隔のセッション {#ssh-remote-sessions}

**SSH 越しでは、クリップボードの画像の貼り付けは十分には働きません。** SSH で別の機械につなぐと、Hermes の CLI はつないだ先で動きます。クリップボードを読む道具（`xclip`、`wl-paste`、`powershell.exe`、`osascript`）は、自分が動いている機械のクリップボードを読みます。つまり手元ではなく、つないだ先のものです。そのため手元のクリップボードにある画像は、向こう側からは見えません。

文字なら端末の貼り付けや OSC52 で渡ることもありますが、クリップボードの画像や手元の画面撮影の置き場所は、Hermes が動いている機械に結びついたままです。

### SSH のときの回り道 {#workarounds-for-ssh}

1. **画像を送っておく** — 画像を手元に保存し、`scp` や VSCode のファイル一覧への引き落とし、その他の転送手段でつないだ先に送ります。あとは場所を伝えるだけです。*（`/attach <filepath>` というコマンドは今後の版で用意する予定です。）*

2. **URL を使う** — その画像がネット上から見られるなら、メッセージに URL を貼るだけで済みます。`vision_analyze` を使えば、どんな画像の URL でもそのまま読めます。

3. **X11 の転送** — `ssh -X` でつなぐと X11 が転送されます。これでつないだ先の `xclip` から、手元の X11 のクリップボードに届きます。手元で X サーバーが動いている必要があります（macOS なら XQuartz、Linux の X11 デスクトップなら最初から入っています）。大きな画像では遅くなります。

4. **メッセージのやり取りを使う** — Telegram、Discord、Slack、WhatsApp から Hermes に画像を送ります。これらは画像の受け渡しを元から備えているので、クリップボードや端末の制約に引っかかりません。

## なぜ端末は画像を貼り付けられないのか {#why-terminals-cant-paste-images}

よく戸惑うところなので、仕組みの側から説明します。

端末は**文字のための**入り口です。Ctrl+V（や Cmd+V）を押すと、端末はこう動きます。

1. クリップボードから**文字の中身**を読みます
2. それを [bracketed paste](https://en.wikipedia.org/wiki/Bracketed-paste) という制御の並びで包みます
3. 端末の文字の流れに乗せて、動いているプログラムへ渡します

クリップボードに画像しかない（文字がない）場合、端末には渡すものがありません。画像そのものを送るための決まった制御の並びは存在しないので、端末は何もしません。

だから Hermes は、クリップボードを別に見にいきます。端末の貼り付けから画像を受け取るのではなく、OS 側の道具（`osascript`、`powershell.exe`、`xclip`、`wl-paste`）を子プロセスとして直に呼び、自前でクリップボードを読むわけです。

## 使えるモデル {#supported-models}

画像の貼り付けは、画像を読めるモデルならどれでも使えます。画像は base64 のデータ URL として、OpenAI 形式の画像の内容ブロックで送られます。

```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/png;base64,..."
  }
}
```

最近のモデルはたいていこの形に対応しています。GPT-4 Vision、画像を読める Claude、Gemini、OpenRouter 越しに使える公開のマルチモーダルなモデルなどです。

## 画像の振り分け（画像を読めるモデルと、文字だけのモデル） {#image-routing-vision-capable-vs-text-only-models}

利用者が画像を添えたとき — CLI のクリップボードからでも、ゲートウェイ（Telegram や Discord の写真）からでも、ほかのどの入り口からでも — Hermes は、いま使っているモデルが本当に画像を読めるかどうかで送り方を変えます。

| 使っているモデル | 画像がどう扱われるか |
|---|---|
| **画像を読める**（GPT-4V、画像を読める Claude、Gemini、Qwen-VL、MiMo-VL など） | 上に書いた各社の形式で、**画像そのもの**が送られます。文字での要約をはさみません。 |
| **文字だけ**（DeepSeek V3、小さめの公開モデル、会話専用の古い接続先など） | 補助の道具である `vision_analyze` を通します。補助の画像モデルが画像を説明し、その文章が会話に差し込まれます。 |

この切り替えを設定する必要はありません。Hermes が、いま使っているモデルの能力を提供元の情報から調べて、自動で正しい経路を選びます。実際のところ、途中で画像を読めるモデルと読めないモデルを行き来しても、やり方を変えずに画像の扱いがそのまま通ります。文字だけのモデルにも、受け取れない形の画像を投げつけるのではなく、画像についての筋の通った説明が届きます。

文字での説明を担う補助のモデルは `auxiliary.vision` で選べます。[補助のモデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を参照してください。

### `vision_analyze` も同じ二通りの動きをします {#visionanalyze-has-the-same-dual-behavior}

`vision_analyze` という道具そのものも、同じ振り分けに従います。いま使っている主モデルが画像を読めて、**かつ**その提供元が道具の結果の中に画像を入れられる場合（いまのところ Anthropic、OpenAI、Azure-OpenAI、Gemini 3.x の系統）、`vision_analyze` は補助の説明役を通さず、画像そのものを道具の結果として返します。主モデルは次の番でその画像を直に見ます。補助の呼び出しも、文字にすることで失われる情報も、余計な待ち時間もありません。

文字だけの主モデルのとき（あるいは道具の結果に画像を載せられない提供元のとき）、`vision_analyze` は従来どおりの経路に戻ります。設定された補助の画像モデルに説明を頼み、その文章をそのまま返します。どちらの場合も、呼び出す側から見た形は同じです。その時々のモデルに応じて、道具が自分でどちらの経路を通るか決めます。
