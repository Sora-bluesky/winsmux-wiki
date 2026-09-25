---
title: "Youtube Content — YouTube の文字起こしを要約・スレッド・ブログ記事にする"
description: "YouTube の文字起こしを要約・スレッド・ブログ記事にする"
upstream_path: user-guide/skills/bundled/media/media-youtube-content.md
upstream_blob: 94aed9d17793b3b63b3fdca5db0574879fd1bec2
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/media/media-youtube-content
---

# Youtube Content {#youtube-content}

YouTube の文字起こしを要約・スレッド・ブログ記事にします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/media/youtube-content` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `YouTube`, `Video`, `Transcripts`, `Media` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効な間、エージェントはこれを指示として受け取ります。
:::

# YouTube Content Tool {#youtube-content-tool}

## 使う場面 {#when-to-use}

ユーザーが YouTube の URL や動画のリンクを共有したとき、動画の要約を頼んだとき、文字起こしを求めたとき、または YouTube 動画の内容を取り出して別の形に整えたいときに使います。文字起こしを、構造化されたコンテンツ（チャプター、要約、スレッド、ブログ記事）に変換します。

YouTube 動画から文字起こしを取り出し、使いやすい形式に変換します。

## 準備 {#setup}

PM で準備した Hermes のソースチェックアウトにある Python を、`terminal` で使います。
`youtube` の追加機能に、補助スクリプトが必要とする依存関係が宣言されています。素の pip や、
プロジェクトを自動検出する `uv run` で Hermes にパッケージを入れないでください。

そのチェックアウトで、まず
[パッケージ管理](https://hermes-agent.nousresearch.com/docs/reference/package-management#developer-workflow)にある、分離した開発用ホームの設定を行います。
続けて追加機能を準備し、補助スクリプトを動かす前にもう一度環境を有効化します。

```bash
source ./activate
python -c "import pm; pm.sync_venv(['youtube'], explicit=True)"
source ./activate
python -c "import youtube_transcript_api; print(youtube_transcript_api.__file__)"
```

Windows では、`source ./activate` の代わりに `. .\activate.ps1` を使います。ターミナルが
別のホストやサンドボックスで動いている場合は、エージェントの本番環境ではなく、そこで明示的に分離した
補助用の環境を使ってください。以下のコマンドは、どれも import の確認が通ったインタープリターで実行します。

## 補助スクリプト {#helper-script}

`SKILL_DIR` は、この SKILL.md ファイルがあるディレクトリです。スクリプトは、標準的な YouTube の URL 形式、短縮リンク（youtu.be）、ショート、埋め込み、ライブのリンク、または 11 文字の動画 ID そのものを受け付けます。

```bash
# JSON output with metadata
python SKILL_DIR/scripts/fetch_transcript.py "https://youtube.com/watch?v=VIDEO_ID"

# Plain text (good for piping into further processing)
python SKILL_DIR/scripts/fetch_transcript.py "URL" --text-only

# With timestamps
python SKILL_DIR/scripts/fetch_transcript.py "URL" --timestamps

# Specific language with fallback chain
python SKILL_DIR/scripts/fetch_transcript.py "URL" --language tr,en
```

## 出力形式 {#output-formats}

文字起こしを取得したら、ユーザーの求めに合わせて整形します。

- **チャプター**: 話題の切り替わりでまとめ、タイムスタンプ付きのチャプター一覧を出力します
- **要約**: 動画全体を 5〜10 文で簡潔にまとめます
- **チャプターごとの要約**: チャプターごとに短い段落の要約を付けます
- **スレッド**: Twitter/X のスレッド形式です。番号付きの投稿で、それぞれ 280 文字以内にします
- **ブログ記事**: タイトル、節、要点を備えた記事全体です
- **引用**: 印象的な発言をタイムスタンプ付きで抜き出します

### 例 — チャプターの出力 {#example-chapters-output}

```
00:00 Introduction — host opens with the problem statement
03:45 Background — prior work and why existing solutions fall short
12:20 Core method — walkthrough of the proposed approach
24:10 Results — benchmark comparisons and key takeaways
31:55 Q&A — audience questions on scalability and next steps
```

## 作業の流れ {#workflow}

1. **取得**: `terminal` と準備済みの Python を使い、`--text-only --timestamps` を付けて文字起こしを取得します。
2. **確認**: 出力が空でなく、想定した言語になっているかを確かめます。空なら `--language` を外して再実行し、使える文字起こしをどれでも取得します。それでも空なら、その動画は文字起こしが無効になっている可能性が高いとユーザーに伝えます。
3. **必要なら分割**: 文字起こしが約 5 万文字を超える場合は、重なりを持たせたチャンク（約 4 万文字、重なり 2 千文字）に分け、チャンクごとに要約してから統合します。
4. **変換**: 求められた出力形式に変換します。ユーザーが形式を指定していなければ、要約にします。
5. **検証**: 提示する前に変換結果を読み直し、話のつながり、タイムスタンプの正しさ、抜けがないかを確かめます。

## エラーへの対応 {#error-handling}

- **文字起こしが無効**: ユーザーに伝え、動画のページで字幕が使えるかを確かめるよう提案します。
- **非公開または視聴できない動画**: エラーをそのまま伝え、URL を確かめるようユーザーに頼みます。
- **一致する言語がない**: `--language` を外して再実行し、使える文字起こしを取得してから、実際の言語をユーザーに伝えます。
- **依存関係が足りない**: 上の PM での準備と再有効化をやり直し、補助スクリプトがその Python を使っているかを確かめます。選択中の世代を pip で修復しないでください。
