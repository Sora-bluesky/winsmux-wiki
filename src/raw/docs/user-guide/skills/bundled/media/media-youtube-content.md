---
title: "Youtube Content — YouTube の文字起こしを要約・スレッド・ブログ記事にする"
description: "YouTube の文字起こしを要約・スレッド・ブログ記事にする"
upstream_path: user-guide/skills/bundled/media/media-youtube-content.md
upstream_blob: 6324aca0419150294365acbd8a7f23d68d4fce26
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/media/media-youtube-content
---

# Youtube Content {#youtube-content}

YouTube の文字起こしを要約・スレッド・ブログ記事にします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/media\youtube-content` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `YouTube`, `Video`, `Transcripts`, `Media` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# YouTube コンテンツツール {#youtube-content-tool}

## こんなときに {#when-to-use}

YouTube の URL や動画リンクが渡されたとき、動画の要約を頼まれたとき、文字起こしを求められたとき、YouTube 動画の内容を取り出して別の形に整えたいときに使います。文字起こしを、章立て・要約・スレッド・ブログ記事といった構造のあるコンテンツに変換します。

YouTube 動画から文字起こしを取り出し、使いやすい形式に変換します。

## 準備 {#setup}

`uv` を使って、補助スクリプトを動かす Hermes 管理下の環境と同じ場所に依存パッケージを入れます。

```bash
uv pip install youtube-transcript-api
```

## 補助スクリプト {#helper-script}

`SKILL_DIR` は、この SKILL.md が置かれているディレクトリです。このスクリプトは、標準的な YouTube の URL、短縮リンク（youtu.be）、shorts、埋め込み用リンク、ライブのリンク、11 文字の動画 ID のいずれでも受け取れます。

```bash
# JSON output with metadata
uv run python SKILL_DIR/scripts/fetch_transcript.py "https://youtube.com/watch?v=VIDEO_ID"

# Plain text (good for piping into further processing)
uv run python SKILL_DIR/scripts/fetch_transcript.py "URL" --text-only

# With timestamps
uv run python SKILL_DIR/scripts/fetch_transcript.py "URL" --timestamps

# Specific language with fallback chain
uv run python SKILL_DIR/scripts/fetch_transcript.py "URL" --language tr,en
```

## 出力形式 {#output-formats}

文字起こしを取得したあと、頼まれた内容に合わせて次のように整えます。

- **章立て**: 話題の切り替わりでまとめ、タイムスタンプ付きの章リストにします
- **要約**: 動画全体を 5〜10 文で簡潔にまとめます
- **章ごとの要約**: 章立てに、それぞれ短い段落の要約を添えます
- **スレッド**: Twitter / X のスレッド形式。番号付きの投稿にし、1 件を 280 文字以内に収めます
- **ブログ記事**: タイトル・節・要点を備えた記事の全文にします
- **引用**: 印象的な発言をタイムスタンプ付きで抜き出します

### 例 — 章立ての出力 {#example-chapters-output}

```
00:00 Introduction — host opens with the problem statement
03:45 Background — prior work and why existing solutions fall short
12:20 Core method — walkthrough of the proposed approach
24:10 Results — benchmark comparisons and key takeaways
31:55 Q&A — audience questions on scalability and next steps
```

## 進め方 {#workflow}

1. **取得**: 補助スクリプトに `--text-only --timestamps` を付け、`uv run python` 経由で文字起こしを取ります。
2. **確認**: 出力が空でないこと、想定した言語であることを確かめます。空だった場合は `--language` を外して再実行し、取得できるものを取ります。それでも空なら、その動画はおそらく文字起こしが無効になっていることを伝えます。
3. **必要なら分割**: 文字起こしが 5 万文字ほどを超える場合は、重なりを持たせて分割し（4 万文字ずつ、2 千文字の重なり）、それぞれを要約してからまとめます。
4. **変換**: 頼まれた出力形式に整えます。形式の指定がなければ要約にします。
5. **見直し**: 出来上がったものを読み返し、話の筋が通っているか、タイムスタンプが正しいか、抜けがないかを確かめてから提示します。

## うまくいかないとき {#error-handling}

- **文字起こしが無効**: その旨を伝え、動画ページで字幕があるか確認するようにすすめます。
- **非公開・視聴できない動画**: エラーの内容をそのまま伝え、URL を確認してもらいます。
- **該当する言語がない**: `--language` を外して再実行し、取得できる文字起こしを取ったうえで、実際の言語を伝えます。
- **依存パッケージがない**: `uv pip install youtube-transcript-api` を実行してからやり直します。
