---
title: "Unsloth — Unsloth: LoRA/QLoRA のファインチューニングが 2〜5 倍速く、VRAM も少なくて済む"
description: "Unsloth: LoRA/QLoRA のファインチューニングが 2〜5 倍速く、VRAM も少なくて済む"
upstream_path: user-guide/skills/optional/mlops/mlops-training-unsloth.md
upstream_blob: 28b70227971ef81d50345281da1ddee763f7e309
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-training-unsloth
---

# Unsloth {#unsloth}

Unsloth: LoRA/QLoRA のファインチューニングが 2〜5 倍速く、VRAM も少なくて済みます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/unsloth` で導入します |
| パス | `optional-skills/mlops/training/unsloth` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `unsloth`, `torch`, `transformers`, `trl`, `datasets`, `peft` |
| 対応プラットフォーム | linux, macos |
| タグ | `Fine-Tuning`, `Unsloth`, `Fast Training`, `LoRA`, `QLoRA`, `Memory-Efficient`, `Optimization`, `Llama`, `Mistral`, `Gemma`, `Qwen` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Unsloth Skill {#unsloth-skill}

unsloth を使った開発を助ける skill です。公式ドキュメントから作られています。

## この skill を使うとき {#when-to-use-this-skill}

次のようなときに呼び出されます:
- unsloth を使った作業をしている
- unsloth の機能や API について尋ねている
- unsloth で何かを実装している
- unsloth のコードの不具合を調べている
- unsloth の使いこなし方を学んでいる

## 早見表 {#quick-reference}

### よく使うパターン {#common-patterns}

*よく使うパターンは、この skill を使いながら追加していきます。*

## 参照ファイル {#reference-files}

この skill には `references/` にドキュメントの全文が入っています:

- **llms-txt.md** - Llms-Txt の資料

細かい情報が必要になったら `view` で目的の参照ファイルを読んでください。

## この skill の使い方 {#working-with-this-skill}

### はじめて使う方へ {#for-beginners}
まずは getting_started や tutorials の参照ファイルから読んで、基礎になる考え方をつかんでください。

### 特定の機能を調べたいとき {#for-specific-features}
該当する分類の参照ファイル（api、guides など）を開くと、詳しい情報が載っています。

### コード例がほしいとき {#for-code-examples}
上の早見表の節に、公式ドキュメントから抜き出したよく使うパターンが載っています。

## 参考リンク {#resources}

### references/ {#references}
公式の情報源から抜き出して整理した資料です。次のものが入っています:
- 詳しい説明
- 言語の指定付きのコード例
- 元のドキュメントへのリンク
- すぐ目的の場所へ飛べる目次

### scripts/ {#scripts}
よくある作業を自動化する補助スクリプトはここに置きます。

### assets/ {#assets}
ひな形や定型のコード、サンプルのプロジェクトはここに置きます。

## 補足 {#notes}

- この skill は公式ドキュメントから自動で作られました
- 参照ファイルは元のドキュメントの構成と例をそのまま残しています
- コード例には言語の判定が入っていて、色分けが見やすくなります
- 早見表のパターンは、ドキュメントのよくある使用例から抜き出したものです

## 更新の仕方 {#updating}

新しいドキュメントの内容でこの skill を作り直すには:
1. 同じ設定でスクレイパーをもう一度動かします
2. 最新の情報で skill が組み直されます

<!-- Trigger re-upload 1763621536 -->
