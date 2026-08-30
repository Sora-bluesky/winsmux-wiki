---
title: "Pytorch Fsdp — 大きなモデルを完全シャーディングでデータ並列に学習する"
description: "大きなモデルを完全シャーディングでデータ並列に学習する"
upstream_path: user-guide/skills/optional/mlops/mlops-pytorch-fsdp.md
upstream_blob: 023d06742f9067b8594e738c563b952ba47ad2ba
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-pytorch-fsdp
---

# Pytorch Fsdp {#pytorch-fsdp}

大きなモデルを完全シャーディングでデータ並列に学習します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/pytorch-fsdp` で導入します |
| パス | `optional-skills/mlops\pytorch-fsdp` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `torch>=2.0`, `transformers` |
| 対応プラットフォーム | linux, macos |
| タグ | `Distributed Training`, `PyTorch`, `FSDP`, `Data Parallel`, `Sharding`, `Mixed Precision`, `CPU Offloading`, `FSDP2`, `Large-Scale Training` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Pytorch-Fsdp Skill {#pytorch-fsdp-skill}

pytorch-fsdp を使った開発を助ける skill です。公式ドキュメントから作られています。

## この skill を使うとき {#when-to-use-this-skill}

次のようなときに呼び出されます:
- pytorch-fsdp を使った作業をしている
- pytorch-fsdp の機能や API について尋ねている
- pytorch-fsdp で何かを実装している
- pytorch-fsdp のコードの不具合を調べている
- pytorch-fsdp の使いこなし方を学んでいる

## 早見表 {#quick-reference}

よく使うパターンをまとめた全文（そのまま動かせる FSDP のコード片が約 157k 文字）は
`references/common-patterns.md` にあります。ラップの仕方、シャーディング方針、
チェックポイント、混合精度の例が必要になったら `read_file` で読み込んでください。記憶を頼りに
FSDP の呪文を組み立て直すより、まずここを見るのが確実です。

## 参照ファイル {#reference-files}

この skill には `references/` に詳しい資料が入っています:

- **other.md** - そのほかの資料

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
