---
title: "スキンとテーマ"
description: "組み込みのスキンと自分で作ったスキンで Hermes CLI の見た目を変えます"
upstream_path: user-guide/features/skins.md
upstream_blob: 75353479f12cc87c64c473cc33acf5ea4dc1fc89
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/skins
---

# スキンとテーマ {#skins-themes}

スキンは Hermes CLI の **見た目** を決めます。バナーの色、スピナーの顔と動詞、応答ボックスのラベル、ブランドの文字、ツールの実行中に付く記号などです。

会話の文体と見た目は、別のものとして分かれています。

- **人格** はエージェントの調子や言葉づかいを変えます。
- **スキン** は CLI の見た目を変えます。

## スキンを切り替える {#change-skins}

```bash
/skin                # show the current skin and list available skins
/skin ares           # switch to a built-in skin
/skin mytheme        # switch to a custom skin from ~/.hermes/skins/mytheme.yaml
```

`~/.hermes/config.yaml` で既定のスキンを決めておくこともできます。

```yaml
display:
  skin: default
```

## 組み込みのスキン {#built-in-skins}

| スキン | 説明 | エージェント名の表示 | 見た目の特徴 |
|------|-------------|----------------|------------------|
| `default` | 定番の Hermes — ゴールドとかわいさ | `Hermes Agent` | 温かみのあるゴールドの枠、コーンシルク色の文字、スピナーにはかわいい顔。おなじみのカドゥケウスのバナー。すっきりしていて親しみやすい。 |
| `ares` | 軍神のテーマ — 深紅とブロンズ | `Ares Agent` | 深い紅の枠にブロンズの差し色。勇ましいスピナーの動詞（"forging"、"marching"、"tempering steel"）。剣と盾のアスキーアートのバナー。 |
| `mono` | モノクローム — すっきりしたグレー | `Hermes Agent` | すべてグレーで色なし。枠は `#555555`、文字は `#c9d1d9`。最小限のターミナル環境や画面収録に向いています。 |
| `slate` | 涼しげな青 — 開発者向け | `Hermes Agent` | ロイヤルブルーの枠（`#4169e1`）に淡い青の文字。落ち着いていて仕事向き。スピナーは独自のものがなく、既定の顔を使います。 |
| `daylight` | 明るいターミナル向けのライトテーマ。濃い色の文字と涼しげな青の差し色 | `Hermes Agent` | 白や明るい背景のターミナル向け。濃いスレート色の文字に青い枠、淡い状態表示、明るいターミナルでも読みやすい補完メニュー。 |
| `warm-lightmode` | 明るい背景向けの、温かみのある茶とゴールドの文字 | `Hermes Agent` | 明るいターミナル向けの、羊皮紙のような温かい色合い。濃い茶色の文字にサドルブラウンの差し色、クリーム色の状態表示。涼しげな daylight に対する、土の質感の選択肢。 |
| `poseidon` | 海神のテーマ — 深い青とシーフォーム | `Poseidon Agent` | 深い青からシーフォームへのグラデーション。海をテーマにしたスピナー（"charting currents"、"sounding the depth"）。三叉の矛のアスキーアートのバナー。 |
| `sisyphus` | シーシュポスのテーマ — 厳しいグレーと粘り強さ | `Sisyphus Agent` | 明るめのグレーで強いコントラスト。岩をテーマにしたスピナー（"pushing uphill"、"resetting the boulder"、"enduring the loop"）。岩と丘のアスキーアートのバナー。 |
| `charizard` | 火山のテーマ — 焦がしたオレンジと残り火 | `Charizard Agent` | 温かい焦げオレンジから残り火へのグラデーション。炎をテーマにしたスピナー（"banking into the draft"、"measuring burn"）。ドラゴンの影絵のアスキーアートのバナー。 |

## 設定できる項目の一覧 {#complete-list-of-configurable-keys}

### 色（`colors:`） {#colors-colors}

CLI 全体の色を決めます。値は 16 進数の色文字列です。

| 項目 | 説明 | 既定値（`default` スキン） |
|-----|-------------|--------------------------|
| `banner_border` | 起動バナーを囲む枠 | `#CD7F32`（ブロンズ） |
| `banner_title` | バナーのタイトル文字の色 | `#FFD700`（ゴールド） |
| `banner_accent` | バナーの見出し（Available Tools など） | `#FFBF00`（アンバー） |
| `banner_dim` | バナーの控えめな文字（区切り線、補助ラベル） | `#B8860B`（ダークゴールデンロッド） |
| `banner_text` | バナーの本文（ツール名、スキル名） | `#FFF8DC`（コーンシルク） |
| `ui_accent` | UI 全体の差し色（強調、選択中の要素） | `#FFBF00` |
| `ui_label` | UI のラベルとタグ | `#DAA520`（ゴールデンロッド） |
| `ui_ok` | 成功の表示（チェックマーク、完了） | `#4caf50`（緑） |
| `ui_error` | エラーの表示（失敗、遮断） | `#ef5350`（赤） |
| `ui_warn` | 警告の表示（注意、承認の確認） | `#ffa726`（オレンジ） |
| `prompt` | 入力プロンプトの文字色 | `#FFF8DC` |
| `input_rule` | 入力欄の上の横線 | `#CD7F32` |
| `response_border` | エージェントの応答ボックスの枠（ANSI エスケープ） | `#FFD700` |
| `session_label` | セッションラベルの色 | `#DAA520` |
| `session_border` | セッション ID の控えめな枠の色 | `#8B8682` |
| `status_bar_bg` | TUI のステータス／使用量バーの背景色 | `#1a1a2e` |
| `voice_status_bg` | 音声モードの状態バッジの背景色 | `#1a1a2e` |
| `selection_bg` | TUI でマウス選択したときの強調の背景色。指定しない場合は `completion_menu_current_bg` を使います。 | `#3a3a55` |
| `completion_menu_bg` | 補完メニューの一覧の背景色 | `#1a1a2e` |
| `completion_menu_current_bg` | 補完メニューで選択中の行の背景色 | `#333355` |
| `completion_menu_meta_bg` | 補完メニューの補足列の背景色 | `#1a1a2e` |
| `completion_menu_meta_current_bg` | 補完メニューで選択中の行の補足列の背景色 | `#333355` |

### スピナー（`spinner:`） {#spinner-spinner}

API の応答を待つ間に出る、動くスピナーを決めます。

| 項目 | 型 | 説明 | 例 |
|-----|------|-------------|---------|
| `waiting_faces` | 文字列のリスト | API の応答待ちで順に出る顔 | `["(⚔)", "(⛨)", "(▲)"]` |
| `thinking_faces` | 文字列のリスト | モデルが考えている間に順に出る顔 | `["(⚔)", "(⌁)", "(<>)"]` |
| `thinking_verbs` | 文字列のリスト | スピナーのメッセージに出る動詞 | `["forging", "plotting", "hammering plans"]` |
| `wings` | [左, 右] の組のリスト | スピナーを囲む飾りのかっこ | `[["⟪⚔", "⚔⟫"], ["⟪▲", "▲⟫"]]` |

スピナーの値が空のとき（`default` や `mono` のように）は、`display.py` に書かれた既定値が使われます。

### ブランド表示（`branding:`） {#branding-branding}

CLI の画面のあちこちで使われる文字列です。

| 項目 | 説明 | 既定値 |
|-----|-------------|---------|
| `agent_name` | バナーのタイトルと状態表示に出る名前 | `Hermes Agent` |
| `welcome` | CLI の起動時に出るあいさつ | `Welcome to Hermes Agent! Type your message or /help for commands.` |
| `goodbye` | 終了時に出るメッセージ | `Goodbye! ⚕` |
| `response_label` | 応答ボックスの見出しのラベル | ` ⚕ Hermes ` |
| `prompt_symbol` | 入力プロンプトの前に出る記号（記号だけを書きます。後ろの空白は表示側が付けます） | `❯` |
| `help_header` | `/help` コマンドの出力の見出し | `(^_^)? Available Commands` |

### その他のトップレベルの項目 {#other-top-level-keys}

| 項目 | 型 | 説明 | 既定値 |
|-----|------|-------------|---------|
| `tool_prefix` | 文字列 | CLI でツールの出力行の先頭に付く文字 | `┊` |
| `tool_emojis` | 辞書 | スピナーと進捗に使うツールごとの絵文字（`{tool_name: emoji}`） | `{}` |
| `banner_logo` | 文字列 | Rich マークアップのアスキーアートのロゴ（既定の HERMES_AGENT バナーを置き換えます） | `""` |
| `banner_hero` | 文字列 | Rich マークアップのメインの絵（既定のカドゥケウスの絵を置き換えます） | `""` |

## 自分で作るスキン {#custom-skins}

`~/.hermes/skins/` の下に YAML ファイルを作ります。自作のスキンは、書かなかった値を組み込みの `default` スキンから引き継ぐので、変えたい項目だけを書けば十分です。

### 自作スキンの YAML テンプレート（全項目） {#full-custom-skin-yaml-template}

```yaml
# ~/.hermes/skins/mytheme.yaml
# Complete skin template — all keys shown. Delete any you don't need;
# missing values automatically inherit from the 'default' skin.

name: mytheme
description: My custom theme

colors:
  banner_border: "#CD7F32"
  banner_title: "#FFD700"
  banner_accent: "#FFBF00"
  banner_dim: "#B8860B"
  banner_text: "#FFF8DC"
  ui_accent: "#FFBF00"
  ui_label: "#4dd0e1"
  ui_ok: "#4caf50"
  ui_error: "#ef5350"
  ui_warn: "#ffa726"
  prompt: "#FFF8DC"
  input_rule: "#CD7F32"
  response_border: "#FFD700"
  session_label: "#DAA520"
  session_border: "#8B8682"
  status_bar_bg: "#1a1a2e"
  voice_status_bg: "#1a1a2e"
  selection_bg: "#333355"
  completion_menu_bg: "#1a1a2e"
  completion_menu_current_bg: "#333355"
  completion_menu_meta_bg: "#1a1a2e"
  completion_menu_meta_current_bg: "#333355"

spinner:
  waiting_faces:
    - "(⚔)"
    - "(⛨)"
    - "(▲)"
  thinking_faces:
    - "(⚔)"
    - "(⌁)"
    - "(<>)"
  thinking_verbs:
    - "processing"
    - "analyzing"
    - "computing"
    - "evaluating"
  wings:
    - ["⟪⚡", "⚡⟫"]
    - ["⟪●", "●⟫"]

branding:
  agent_name: "My Agent"
  welcome: "Welcome to My Agent! Type your message or /help for commands."
  goodbye: "See you later! ⚡"
  response_label: " ⚡ My Agent "
  prompt_symbol: "⚡"
  help_header: "(⚡) Available Commands"

tool_prefix: "┊"

# Per-tool emoji overrides (optional)
tool_emojis:
  terminal: "⚔"
  web_search: "🔮"
  read_file: "📄"

# Custom ASCII art banners (optional, Rich markup supported)
# banner_logo: |
#   [bold #FFD700] MY AGENT [/]
# banner_hero: |
#   [#FFD700]  Custom art here  [/]
```

### 最小限の自作スキンの例 {#minimal-custom-skin-example}

すべて `default` から引き継がれるので、最小限のスキンには違うところだけ書けば足ります。

```yaml
name: cyberpunk
description: Neon terminal theme

colors:
  banner_border: "#FF00FF"
  banner_title: "#00FFFF"
  banner_accent: "#FF1493"

spinner:
  thinking_verbs: ["jacking in", "decrypting", "uploading"]
  wings:
    - ["⟨⚡", "⚡⟩"]

branding:
  agent_name: "Cyber Agent"
  response_label: " ⚡ Cyber "

tool_prefix: "▏"
```

## Hermes Mod — 目で見て編集できるスキンエディタ {#hermes-mod-visual-skin-editor}

[Hermes Mod](https://github.com/cocktailpeanut/hermes-mod) は、スキンを画面上で作って管理できる、コミュニティ製のウェブ UI です。YAML を手で書く代わりに、クリック操作とその場のプレビューで編集できます。

![Hermes Mod skin editor](https://raw.githubusercontent.com/cocktailpeanut/hermes-mod/master/nous.png)

**できること:**

- 組み込みと自作のスキンをすべて一覧で表示します
- どのスキンも、Hermes のスキン項目（色、スピナー、ブランド表示、ツールの記号、ツールの絵文字）をそろえた編集画面で開けます
- 文章から `banner_logo` の文字アートを作ります
- アップロードした画像（PNG、JPG、GIF、WEBP）を `banner_hero` のアスキーアートに変換します。描き方も複数選べます（点字、アスキーの濃淡、ブロック、ドット）
- `~/.hermes/skins/` に直接保存します
- `~/.hermes/config.yaml` を更新してスキンを有効にします
- 生成された YAML とその場のプレビューを表示します

### 導入 {#install}

**方法 1 — Pinokio（1 クリック）:**

[pinokio.computer](https://pinokio.computer) で探して、1 クリックで導入します。

**方法 2 — npx（ターミナルから最短）:**

```bash
npx -y hermes-mod
```

**方法 3 — 手動:**

```bash
git clone https://github.com/cocktailpeanut/hermes-mod.git
cd hermes-mod/app
npm install
npm start
```

### 使い方 {#usage}

1. アプリを起動します（Pinokio またはターミナルから）。
2. **Skin Studio** を開きます。
3. 編集したい組み込みまたは自作のスキンを選びます。
4. 文章からロゴを作り、必要ならメインの絵にする画像をアップロードします。描き方と幅を選びます。
5. 色、スピナー、ブランド表示などの項目を編集します。
6. **Save** を押して、スキンの YAML を `~/.hermes/skins/` に書き出します。
7. **Activate** を押して、いまのスキンに設定します（`config.yaml` の `display.skin` が更新されます）。

Hermes Mod は `HERMES_HOME` 環境変数に対応しているので、[プロファイル](/hermes/docs/user-guide/profiles/)と組み合わせても動きます。

## 運用上の注意 {#operational-notes}

- 組み込みのスキンは `hermes_cli/skin_engine.py` から読み込まれます。
- 知らない名前のスキンを指定すると、自動的に `default` に戻ります。
- `/skin` は、いまのセッションの CLI テーマをその場で切り替えます。
- `~/.hermes/skins/` にある自作のスキンは、同じ名前の組み込みスキンより優先されます。
- `/skin` によるスキンの変更は、そのセッションかぎりです。ずっと使う既定にしたい場合は `config.yaml` に設定してください。
- `banner_logo` と `banner_hero` の項目は Rich のコンソールマークアップ（たとえば `[bold #FF0000]text[/]`）に対応していて、色付きのアスキーアートを書けます。
