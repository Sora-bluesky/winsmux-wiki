---
title: "画像の貼り付けと視覚認識"
description: "クリップボードの画像を Hermes CLI に貼り付けて、マルチモーダルな画像解析を行います。"
upstream_path: user-guide/features/vision.md
upstream_blob: 4e777c42e340474da91b65bb86d27e60366f0e92
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/vision
---

# 画像の貼り付けと視覚認識 {#vision-image-paste}

Hermes Agent は**マルチモーダルな視覚認識**に対応しています。クリップボードの画像をそのまま CLI に貼り付けて、解析や説明、その画像を使った作業をエージェントに頼めます。画像は base64 でエンコードしたコンテンツブロックとしてモデルへ送られるため、画像を扱えるモデルならどれでも処理できます。

:::tip
Portal を契約していれば、画像を扱えるモデル（Claude、GPT-5、Gemini）が同じカタログに並びます。追加の認証情報は要りません。[Nous Portal](/hermes/docs/integrations/nous-portal/) を参照してください。
:::

## 仕組み {#how-it-works}

1. 画像をクリップボードにコピーします（スクリーンショット、ブラウザ上の画像など）
2. 下記のいずれかの方法で添付します
3. 質問を入力して Enter を押します
4. 入力欄の上に `[📎 Image #1]` というバッジで画像が表示されます
5. 送信すると、画像は視覚認識用のコンテンツブロックとしてモデルへ渡ります

送信前に複数の画像を添付できます。添付するたびにバッジが1つ増えます。`Ctrl+C` を押すと添付した画像をすべて取り消せます。

画像は日時を入れたファイル名の PNG として `~/.hermes/images/` に保存されます。

## 貼り付けの方法 {#paste-methods}

どの方法で添付できるかは、使っているターミナル環境によって変わります。どこでも全部が使えるわけではないので、以下に全体像をまとめます。

### `/paste` コマンド {#paste-command}

**明示的に画像を添付したいときの、もっとも確実な手段です。**

```
/paste
```

`/paste` と入力して Enter を押すと、Hermes がクリップボードの画像を探して添付します。ターミナルが `Cmd+V`/`Ctrl+V` を横取りしている場合や、画像だけをコピーしていてブラケットペーストのテキストが一切届かない場合でも、この方法なら安全です。

### Ctrl+V / Cmd+V {#ctrlv-cmdv}

Hermes は貼り付けを段階的な流れとして扱うようになりました。

- まず通常のテキスト貼り付け
- ターミナルがテキストをうまく渡せなかった場合は、OS のクリップボードや OSC52 によるテキスト取得
- クリップボードや貼り付けた内容が画像・画像のパスだと判明したら画像として添付

そのため、macOS のスクリーンショットの一時パスや `file://...` 形式の画像 URI を貼り付けると、入力欄に文字列として残らず、そのまま画像として添付されます。

:::warning
クリップボードに**画像しか入っていない**（テキストがない）場合、ターミナルは画像のバイナリをそのまま送れません。明示的に画像を添付する手段として `/paste` を使ってください。
:::

### VS Code / Cursor / Windsurf 向けの `/terminal-setup` {#terminal-setup-for-vs-code-cursor-windsurf}

macOS のローカル環境で VS Code 系のエディタに内蔵されたターミナルから TUI を動かしている場合、複数行入力や取り消し・やり直しの挙動を揃えるために、Hermes が推奨の `workbench.action.terminal.sendSequence` キーバインドを入れてくれます。

```text
/terminal-setup
```

`Cmd+Enter` や `Cmd+Z`、`Shift+Cmd+Z` をエディタ側が横取りしているときにとくに役立ちます。実行するのは手元の端末だけにしてください。SSH 接続先で実行してはいけません。

## 環境ごとの対応状況 {#platform-compatibility}

| 環境 | `/paste` | Cmd/Ctrl+V | `/terminal-setup` | 補足 |
|---|:---:|:---:|:---:|---|
| **macOS Terminal / iTerm2** | ✅ | ✅ | n/a | もっとも快適です。OS のクリップボードとスクリーンショットのパス解決が効きます |
| **Apple Terminal** | ✅ | ✅ | n/a | Cmd+←/→/⌫ が横取りされる場合は Ctrl+A / Ctrl+E / Ctrl+U で代用します |
| **Linux X11 デスクトップ** | ✅ | ✅ | n/a | `xclip` が必要です（`apt install xclip`） |
| **Linux Wayland デスクトップ** | ✅ | ✅ | n/a | `wl-paste` が必要です（`apt install wl-clipboard`） |
| **WSL2（Windows Terminal）** | ✅ | ✅ | n/a | `powershell.exe` を使うので追加インストールは不要です |
| **VS Code / Cursor / Windsurf（手元）** | ✅ | ✅ | ✅ | Cmd+Enter や取り消し・やり直しを揃えたいなら推奨です |
| **VS Code / Cursor / Windsurf（SSH）** | ❌² | ❌² | ❌³ | 代わりに手元の端末で `/terminal-setup` を実行します |
| **SSH 接続のターミナル（すべて）** | ❌² | ❌² | n/a | 接続先から手元のクリップボードは読めません |

² 下の [SSH とリモート接続](#ssh--remote-sessions) を参照してください
³ このコマンドは手元のエディタのキーバインドを書き換えるものなので、接続先で実行するものではありません

## 環境ごとの準備 {#platform-specific-setup}

### macOS {#macos}

**準備は不要です。** Hermes は macOS に最初から入っている `osascript` でクリップボードを読みます。速度を上げたい場合は `pngpaste` を入れておくこともできます。

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

最近の Linux デスクトップ（Ubuntu 22.04 以降、Fedora 34 以降）は、既定で Wayland を使っていることが多いです。`wl-clipboard` を入れます。

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

**追加の準備は要りません。** Hermes は `/proc/version` を見て WSL2 を自動で判別し、`powershell.exe` 経由で .NET の `System.Windows.Forms.Clipboard` から Windows 側のクリップボードを読みます。これは WSL2 の Windows 連携に最初から備わっている仕組みで、`powershell.exe` は既定で使えます。

クリップボードのデータは base64 にした PNG として標準出力でやり取りするので、パスの変換や一時ファイルは必要ありません。

:::info WSLg での注意
WSLg（GUI 対応の WSL2）を使っている場合、Hermes はまず PowerShell 経路を試し、駄目なら `wl-paste` に切り替えます。WSLg のクリップボード連携は画像を BMP でしか扱えないため、Hermes が Pillow（入っていれば）か ImageMagick の `convert` コマンドで BMP を PNG に自動変換します。
:::

#### WSL2 のクリップボードが読めるか確認する {#verify-wsl2-clipboard-access}

```bash
# 1. Check WSL detection
grep -i microsoft /proc/version

# 2. Check PowerShell is accessible
which powershell.exe

# 3. Copy an image, then check
powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::ContainsImage()"
# Should print "True"
```

## SSH とリモート接続 {#ssh-remote-sessions}

**SSH 越しでは、クリップボードからの画像貼り付けは十分に機能しません。** SSH で接続すると、Hermes CLI は接続先のマシンで動きます。クリップボードを扱うツール（`xclip`、`wl-paste`、`powershell.exe`、`osascript`）は、自分が動いているマシン、つまり接続先サーバーのクリップボードを読むので、手元のクリップボードにある画像には届きません。

テキストならターミナルの貼り付けや OSC52 で橋渡しできることもありますが、画像のクリップボードや手元のスクリーンショットの一時パスは、Hermes が動いているマシンに紐づいたままです。

### SSH での回避策 {#workarounds-for-ssh}

1. **画像ファイルを転送する** — 画像を手元に保存し、`scp` や VSCode のファイルツリー（ドラッグ＆ドロップ）などで接続先へ送ります。あとはパスで指定すれば使えます。*（`/attach <filepath>` コマンドは今後のリリースで用意する予定です。）*

2. **URL を使う** — その画像がネット上にあるなら、メッセージに URL を貼るだけで済みます。エージェントは `vision_analyze` を使って、画像の URL を直接見に行けます。

3. **X11 転送を使う** — `ssh -X` で接続して X11 を転送します。こうすると接続先の `xclip` が手元の X11 クリップボードを読めます。手元で X サーバーが動いている必要があります（macOS なら XQuartz、Linux の X11 デスクトップなら標準で入っています）。大きな画像では遅くなります。

4. **メッセージングサービスを使う** — Telegram、Discord、Slack、WhatsApp から Hermes へ画像を送ります。これらは画像のアップロードを自前で扱うので、クリップボードやターミナルの制約を受けません。

## ターミナルが画像を貼り付けられない理由 {#why-terminals-cant-paste-images}

ここはよく誤解されるところなので、技術的な背景を説明します。

ターミナルは**文字を扱う**ための仕組みです。Ctrl+V（または Cmd+V）を押すと、ターミナルエミュレーターは次のように動きます。

1. クリップボードから**テキスト**を読む
2. [ブラケットペースト](https://en.wikipedia.org/wiki/Bracketed-paste)のエスケープシーケンスで囲む
3. ターミナルの文字列の流れに乗せてアプリへ送る

クリップボードに画像しかない（テキストがない）場合、ターミナルには送るものがありません。画像のバイナリを送るための標準的なエスケープシーケンスは存在しないので、ターミナルは何もしません。

そのため Hermes は、貼り付けイベントから画像を受け取るのではなく、クリップボードの確認を別に行っています。OS のツール（`osascript`、`powershell.exe`、`xclip`、`wl-paste`）を子プロセスとして直接呼び出し、独自にクリップボードを読んでいます。

## 対応モデル {#supported-models}

画像の貼り付けは、画像を扱えるモデルならどれでも使えます。画像は OpenAI の視覚認識用コンテンツ形式に沿って、base64 のデータ URL として送られます。

```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/png;base64,..."
  }
}
```

GPT-4 Vision、画像対応の Claude、Gemini、OpenRouter 経由で提供されるオープンソースのマルチモーダルモデルなど、最近のモデルはたいていこの形式に対応しています。

## 画像の振り分け（画像対応モデルとテキスト専用モデル） {#image-routing-vision-capable-vs-text-only-models}

CLI のクリップボード、ゲートウェイ（Telegram や Discord の写真）、その他どの入口から画像が添付されても、Hermes はいま使っているモデルが実際に画像を扱えるかどうかで送り方を振り分けます。

| 使っているモデル | 画像の扱われ方 |
|---|---|
| **画像対応**（GPT-4V、画像対応の Claude、Gemini、Qwen-VL、MiMo-VL、DeepSeek Flash / V4.1-Flash など） | 上記のプロバイダー標準の画像形式で、**画像そのもの**として送られます。テキストに要約する段階は挟みません。 |
| **テキスト専用**（DeepSeek V4 Pro、DeepSeek V3、小さめのオープンソースモデル、画像非対応の古いチャット用エンドポイント) | 補助ツールの `vision_analyze` を経由します。補助の画像モデルが画像を説明し、その文章が会話に差し込まれます。 |

この切り替えに設定は要りません。Hermes がプロバイダーのメタデータからいまのモデルの能力を調べ、適切な経路を自動で選びます。実際の使い心地としては、会話の途中で画像対応モデルとそうでないモデルを行き来しても、手順を変えずに画像がそのまま扱えます。テキスト専用モデルには、受け取れずに弾くしかないマルチモーダルなデータではなく、画像について筋の通った文脈が渡ります。

自動の判断を上書きしたい場合は、`config.yaml` で `agent.image_input_mode` を設定します。

| 値 | 動作 |
|-------|----------|
| `auto`（既定） | モデルが画像対応を申告していれば画像そのものを、そうでなければ `vision_analyze` による説明を使います。`auxiliary.vision` を明示的に設定した場合（`provider` を `auto` 以外にした、あるいは `model` / `base_url` を指定した場合）も、主モデルが画像対応であっても説明の経路が選ばれます。 |
| `native` | カタログ上はテキスト専用となっていても、常に画像そのものを添付します。 |
| `text` | 常に `vision_analyze` の説明を経由し、主モデルへのリクエストには画像そのものを添付しません。 |

この設定が効くのは、テキストは受け付けるのに画像そのものは拒むバックエンドを使うときです（たとえば `openai-codex` のアカウントで、バックエンドが画像リクエストに `server_error` を返す場合など）。主モデルはそのままに、`auxiliary.vision` を別の画像対応プロバイダーとモデルに向けてください（`auxiliary.vision.provider: auto` のままだと、説明役として同じ主モデルが再び自動選択されてしまいます）。これだけで `auto` のまま説明の経路へ切り替わりますし、`agent.image_input_mode: text` を書けば同じ選択を明示できます。

説明を担当する補助モデルは `auxiliary.vision` の下で設定できます。[補助モデル](/hermes/docs/user-guide/configuration/#auxiliary-models)を参照してください。

### `vision_analyze` も同じ二段構え {#visionanalyze-has-the-same-dual-behavior}

`vision_analyze` ツール自体も同じ振り分けに従います。いま使っている主モデルが画像対応で、**かつ**そのプロバイダーがツールの結果に画像を含められる場合（現在は Anthropic、OpenAI、Azure-OpenAI、Gemini 3.x 系）、`vision_analyze` は補助の説明役を飛ばして、画像そのものをマルチモーダルなツール結果として返します。主モデルは次のターンで画像をそのまま見ることになり、補助への呼び出しも、要約による情報の目減りも、余分な待ち時間もありません。例外が1つあり、いまのユーザーメッセージにすでに画像として添付されているものは埋め込み直しません。その場合の `vision_analyze` は「画像はすでに文脈にあります」という短い文章を返します（`region` を渡して一部を拡大する場合は、切り出した部分が埋め込まれます）。

テキスト専用の主モデル（またはツール結果に画像を載せられないプロバイダー）では、`vision_analyze` は従来の経路に戻ります。設定した補助の画像モデルに説明を依頼し、その説明を文章として返します。どちらの場合も呼び出し方は同じで、実行時にどちらの経路を通るかをツールが判断します。

### Responses 系バックエンドでの SVG など非ラスター画像 {#svg-and-other-non-raster-images-on-responses-backends}

Responses 形式のバックエンド（たとえば `openai-codex`）は、埋め込みの JPEG、PNG、GIF、WebP しか受け付けません。それ以外の `data:image/*` が混ざると**リクエスト全体**が拒否され、しかもその部分は履歴に残るので、以降のターンも同じように失敗し続けます。Hermes は送信の段階でこれを処理します。埋め込みの **SVG** は、変換ツールが入っていれば PNG に描き起こされるので（`cairosvg`、`svglib`+`reportlab`、`rsvg-convert`、`inkscape` のいずれか。`vision_analyze` が使うものと同じ任意の依存関係です）、モデルは絵をそのまま見られます。変換ツールがない場合、SVG や BMP・TIFF といった対応外の埋め込み形式は、短い文章（`[image omitted: image/svg+xml is not a supported image format]`）に置き換えられ、同じメッセージ内の有効な画像はそのまま送られます。

### 埋め込んだ画像はセッションに残り続ける: `vision.embed_target_bytes` と `vision.max_calls_per_image` {#native-embeds-ride-the-session-visionembedtargetbytes-and-visionmaxcallsperimage}

`vision_analyze` が画像そのものを返すと、その画像はツール結果に焼き込まれ、以降そのセッションの API 呼び出しのたびに毎回送り直されます。この繰り返しのコストを抑えるために、`config.yaml` に2つの設定があります。

```yaml
vision:
  embed_target_bytes: 262144   # per-embed byte budget; clamped 64 KiB..4 MiB (default 256 KB)
  max_calls_per_image: 3       # unset = 3 inside delegated subagents, unlimited for the main agent
```

- **`embed_target_bytes`** — 上限を超える画像（または横幅が 1568 px を超える画像）は、収まるサイズの JPEG に縮小されます。256 KB なら普通のスクリーンショットを安く扱えますが、表がぎっしり写ったスマートフォンのスクリーンショットだと、このサイズでは読めなくなることがあります。モデルが図を「読めない」と言い続けるようなら、たとえば `1048576` まで上げてください。ブラウザのスクリーンショットを画像のまま渡す場合も、同じ上限が使われます。
- **`max_calls_per_image`** — **同じ**画像（その一部を切り出したものを含みます。ローカルのパスは解決後のパスで比較します）を、1セッションで何回まで埋め込めるかです。上限に達すると、ツールは埋め込みの代わりに `"vision_analyze refused: this image has already been loaded into context N time(s) …"` を返すので、モデルはすでに見えているものから答えることになります。設定しない場合、上限（3回）がかかるのは `delegate_task` で委任したサブエージェントだけです。サブエージェントは自動で動き、途中で CLI から方向を修正できないため、読み込み直しのループが起きて5ファイルで 158 回も呼び出した例があります。すべてのセッションに上限をかけたいなら数値を、どこでも無制限にしたいなら `0` を設定してください。
