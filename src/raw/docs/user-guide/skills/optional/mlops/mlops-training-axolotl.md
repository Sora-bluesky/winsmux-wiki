---
title: "Axolotl — Axolotl: YAML で LLM をファインチューニングする（LoRA、DPO、GRPO）"
description: "Axolotl: YAML で LLM をファインチューニングする（LoRA、DPO、GRPO）"
upstream_path: user-guide/skills/optional/mlops/mlops-training-axolotl.md
upstream_blob: a23fb70816dc3c09f28293b14f92db20170ade03
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/mlops/mlops-training-axolotl
---

# Axolotl {#axolotl}

Axolotl: YAML で LLM をファインチューニングします（LoRA、DPO、GRPO）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/mlops/axolotl` で導入します |
| パス | `optional-skills/mlops/training/axolotl` |
| バージョン | `1.0.0` |
| 作者 | Orchestra Research |
| ライセンス | MIT |
| 依存関係 | `axolotl`, `torch`, `transformers`, `datasets`, `peft`, `accelerate`, `deepspeed` |
| 対応プラットフォーム | linux, macos |
| タグ | `Fine-Tuning`, `Axolotl`, `LLM`, `LoRA`, `QLoRA`, `DPO`, `KTO`, `ORPO`, `GRPO`, `YAML`, `HuggingFace`, `DeepSpeed`, `Multimodal` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Axolotl Skill {#axolotl-skill}

## 入っているもの {#whats-inside}

Axolotl で LLM をファインチューニングするための知見をまとめています — YAML の設定、100 種類を超えるモデル、LoRA/QLoRA、DPO/KTO/ORPO/GRPO、マルチモーダル対応。

axolotl を使った開発を助ける skill です。公式ドキュメントから作られています。

## この skill を使うとき {#when-to-use-this-skill}

次のようなときに呼び出されます:
- axolotl を使った作業をしている
- axolotl の機能や API について尋ねている
- axolotl で何かを実装している
- axolotl のコードの不具合を調べている
- axolotl の使いこなし方を学んでいる

## 早見表 {#quick-reference}

### よく使うパターン {#common-patterns}

**パターン 1:** 学習ジョブに十分な転送速度が出ているかを確かめるには、NCCL Tests を動かすとどこが詰まっているか見つけやすくなります。たとえば:

```
./build/all_reduce_perf -b 8 -e 128M -f 2 -g 3
```

**パターン 2:** Axolotl の yaml で FSDP を使うようにモデルを設定します。たとえば:

```
fsdp_version: 2
fsdp_config:
  offload_params: true
  state_dict_type: FULL_STATE_DICT
  auto_wrap_policy: TRANSFORMER_BASED_WRAP
  transformer_layer_cls_to_wrap: LlamaDecoderLayer
  reshard_after_forward: true
```

**パターン 3:** context_parallel_size は GPU の総数を割り切れる値にします。たとえば:

```
context_parallel_size
```

**パターン 4:** たとえば次のようになります。- GPU 8 枚でシーケンス並列なし: 1 ステップあたり 8 個の異なるバッチを処理 - GPU 8 枚で context_parallel_size=4: 1 ステップあたり 2 個の異なるバッチしか処理しない（それぞれ 4 枚の GPU に分割される） - GPU あたりの micro_batch_size が 2 なら、全体のバッチサイズは 16 から 4 に減る

```
context_parallel_size=4
```

**パターン 5:** 設定で save_compressed: true にすると、圧縮した形式でモデルを保存できます。これには次の効果があります。- ディスク使用量がおよそ 40% 減る - vLLM との互換性が保たれ、推論を高速化できる - llmcompressor との互換性も保たれ、さらに最適化できる（例: 量子化）

```
save_compressed: true
```

**パターン 6:** 補足 統合コードを integrations フォルダーに置く必要はありません。python 環境のパッケージとしてインストールされていれば、どこに置いてもかまいません。例はこのリポジトリを参照してください: https://github.com/axolotl-ai-cloud/diff-transformer

```
integrations
```

**パターン 7:** 1 件のデータとまとめて渡されたデータの両方に対応してください。- 1 件の場合: sample[‘input_ids’] は list[int] です - まとめて渡された場合: sample[‘input_ids’] は list[list[int]] です

```
utils.trainer.drop_long_seq(sample, sequence_len=2048, min_sequence_len=2)
```

### コード例のパターン {#example-code-patterns}

**例 1**（python）:
```python
cli.cloud.modal_.ModalCloud(config, app=None)
```

**例 2**（python）:
```python
cli.cloud.modal_.run_cmd(cmd, run_folder, volumes=None)
```

**例 3**（python）:
```python
core.trainers.base.AxolotlTrainer(
    *_args,
    bench_data_collator=None,
    eval_data_collator=None,
    dataset_tags=None,
    **kwargs,
)
```

**例 4**（python）:
```python
core.trainers.base.AxolotlTrainer.log(logs, start_time=None)
```

**例 5**（python）:
```python
prompt_strategies.input_output.RawInputOutputPrompter()
```

## 参照ファイル {#reference-files}

この skill には `references/` に詳しい資料が入っています:

- **api.md** - Api の資料
- **dataset-formats.md** - Dataset-Formats の資料
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
