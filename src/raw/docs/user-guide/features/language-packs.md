---
title: "言語パック"
description: "CLI・ゲートウェイ・TUI・Desktop の表示言語を、プラグインか個人用の上書きファイルで追加・変更します"
upstream_path: user-guide/features/language-packs.md
upstream_blob: 37eda965733c8ab370996afc95fe205db49a8bae
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/language-packs
---

# 言語パック {#language-packs}

Hermes には 17 の表示言語が付属しています（`display.language`）。この一覧は**差し替え可能**です。言語パックは
プラグイン（または Hermes のホームに置くフォルダー）で、新しい言語を追加したり、既存の言語の言い回しを
上書きしたりできます。対象は Python 側（CLI の承認プロンプト、ゲートウェイの返信、ツールの動詞、ヒント）、
`hermes --tui` の画面、Desktop アプリで、1 つのパックでまとめて扱えます。

パックが翻訳するのは**固定の画面表示の文言**です。エージェントの応答、ツールの出力、ログ、スラッシュコマンドの
*名前*はそのままです。エージェント自身に別の言語で答えさせたいときは、プロンプトでそう伝えてください。

## 言語はどこから来るか {#where-languages-come-from}

Hermes は文字列を探すとき、次の層を上から順にたどり、最初に見つかったものを使います。

1. **プラグインの言語パック** — `provides_locales` を宣言している、インストール済みのすべてのプラグイン（2 つのパックが
   同じキーを持つ場合は、最後に読み込まれたものが勝ちます）。
2. **自分の上書きファイル** — `<HERMES_HOME>/locales/<lang>.yaml`（プロファイルごと。各プロファイルのホームに専用の
   `locales/` フォルダーがあります）。
3. **同梱** — Hermes に付属する `locales/<lang>.yaml` ファイル。
4. 英語について同じ 3 つの層、それでもなければキーそのもの。

どの層も**一部だけ**で構いません。パックや上書きファイルには、変更したいキーだけを書けば足ります。

`hermes config set display.language <id>` は、これらの層のどれかが提供している id なら何でも受け付けます。知らない id は
使える言語の一覧を添えて拒否されます。

```
$ hermes config set display.language pl
✗ Unknown language 'pl' for display.language. Available: en, af, ar, de, es, ...
  Install a language pack plugin (hermes plugins install <pack>) or drop <HERMES_HOME>/locales/<id>.yaml to add one.
```

## パックを使う {#using-a-pack}

```bash
hermes plugins install https://github.com/teknium1/hermes-lang-pl   # or a catalog name
hermes config set display.language pl
```

動いているゲートウェイや TUI は、パックを読み込ませるために再起動してください。TUI と Desktop の言語切り替えには、
同梱の言語、上書きファイルで足した言語、インストール済みのすべてのパックが、その言語自身での名前（自称名）で並びます。
`.env` の `HERMES_LANGUAGE` は、引き続き `display.language` より優先されます。

## パックを作る {#writing-a-pack}

パックに **Python のコードは要りません**。最小の構成は次のとおりです。

```
hermes-lang-pl/
  plugin.yaml
  locales/
    pl.yaml            # core: Python-side strings (approval.*, gateway.*, cli.*, display.*, slash.*, tips.*, ...)
    pl.tui.yaml        # optional: hermes --tui strings
    pl.desktop.yaml    # optional: Hermes Desktop strings
```

`plugin.yaml`:

```yaml
name: hermes-lang-pl
version: 1.0.0
description: Polish language pack for Hermes
provides_locales:
  - id: pl            # lowercase BCP-47-style tag: pl, pt-br, zh-hant
    endonym: Polski   # shown in language switchers
    rtl: false        # true for right-to-left scripts (flips the Desktop layout)
```

`provides_locales` の項目は id だけ（`- pl`）でも書けます。その場合、自称名は id と同じになります。
マニフェストが `provides_locales` を宣言していると、プラグインローダーが
`locales/<lang>[.tui|.desktop].yaml` をすべて自動で登録します。

### ファイルとキー {#files-and-keys}

- **`pl.yaml`（コア）** は、同梱の `locales/en.yaml` と同じ構造にします。入れ子の YAML はドット区切りのキーに
  平たく展開されます（`approval.denied`、`gateway.goal_cleared`）。`en.yaml` をコピーして値を翻訳し、上書きしたくない
  ものは消してください。
- **`pl.tui.yaml` / `pl.desktop.yaml`** は、TUI と Desktop アプリの英語カタログと同じ構造にします。キーの一覧は
  Hermes リポジトリの `locales/_keys.tui.json` と `locales/_keys.desktop.json` に書き出されており、
  検証ツールはこれと照合します。
- YAML の値は**文字列**でなければなりません。数値、リスト、`true`/`false`、空の値は拒否されます。
- YAML の予約語（`on`、`off`、`yes`、`no`）はキーに使わないでください。

### プレースホルダー {#placeholders}

- コア（Python）の文字列では、英語と同じ**名前付き**プレースホルダーをそのまま使います: `"⏳ Draining {count} active agent(s)..."`。
  英語の値にある `{name}` はすべて残してください。1 つでも欠けたり綴りが違ったりすると、Hermes はそのキーについて
  翻訳前の文字列に戻します。
- TUI と Desktop の項目のうち、英語の値が*関数*（引数を取るもの）になっているものは、YAML では
  **位置指定**のプレースホルダーを使った文字列として書きます: `"{0} of {1} sessions"`。

### 検証する {#validate}

```bash
hermes plugins validate ./hermes-lang-pl
```

検証ツールは、宣言したすべての id に `locales/<id>.yaml` があること、各ファイルが読み込めて文字列だけで
できていること（文字列以外の値は**エラー**）を確かめます。また、その画面の英語カタログに存在しないキーがあれば、
一覧にして**警告**します（害はありませんが、何の効果もありません）。`.tui.yaml` /
`.desktop.yaml` の検査は、対応する `_keys.*.json` の書き出しがあるときに行われます。

### Python から登録する（任意） {#register-from-python-optional}

すでに Python のコードを持っているプラグインは、カタログを自分で登録できます。

```python
from pathlib import Path

def register(ctx):
    here = Path(__file__).parent
    ctx.register_locale("pl", here / "locales" / "pl.yaml", endonym="Polski")
    ctx.register_locale("pl", {"approval": {"denied": "      ✗ Odrzucono"}})          # dict, nested or flat
    ctx.register_locale("pl", here / "locales" / "pl.tui.yaml", surface="tui")
    ctx.register_locale_dir(here / "locales")                                         # everything at once
```

`register_locale(lang, source, *, endonym=None, rtl=False, surface="core")` は YAML のパスか
マッピングを受け取ります。`surface` は `core`、`tui`、`desktop` のいずれかです。登録はプラグインがアンロードされると
取り消され、`display.language` を変えることはありません。

## プラグインなしで個人的に上書きする {#personal-overrides-without-a-plugin}

Hermes のホームに、一部だけを書いたファイルを置きます。

```yaml
# ~/.hermes/locales/en.yaml — only the keys you want to change
approval:
  denied: "      ✗ Nope."
```

この上書きはそのプロファイルにだけ効きます（名前付きプロファイルなら `~/.hermes/profiles/<name>/locales/`）。
Hermes に同梱されていない言語の上書きファイルを置くと、その言語も選べるようになります。編集内容は、
次回の起動時か、次に `display.language` を変えたときに読み込まれます。

## うまくいかないとき {#troubleshooting}

- **`Unknown language ... for display.language`** — パックがインストールされていないか有効になっていない
  （`hermes plugins list`）、または `provides_locales` の id とファイル名が合っていません
  （`pl` なら `locales/pl.yaml` が必要です）。
- **翻訳したはずの文字列が英語のまま** — そのキーが英語カタログにありません（
  `hermes plugins validate` を実行すると、知らないキーが一覧で出ます）。または、プレースホルダーの組み合わせが英語と違っています。
- **一覧には出るのに TUI/Desktop が英語のまま** — パックに `.tui.yaml` /
  `.desktop.yaml` がありません。これらの画面は、英語に、パックが提供する分を重ねて表示します。同梱の 16 言語については、
  TUI が Hermes のツリー内に専用の `locales/<lang>.tui.yaml` を持っている（Desktop はアプリ内に翻訳を同梱している）ので、
  それらの言語向けのパックには、上書きしたいキーだけを書けば足ります。
