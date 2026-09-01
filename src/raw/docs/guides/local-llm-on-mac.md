---
title: "Mac でローカル LLM を動かす"
description: "llama.cpp または MLX を使って macOS 上に OpenAI 互換のローカル LLM サーバーを立てる手順。モデルの選び方、メモリの節約、Apple Silicon での実測ベンチマークまで"
upstream_path: guides/local-llm-on-mac.md
upstream_blob: f35e8ef2cf1ed1bea912746071815501697e9082
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/local-llm-on-mac
---

# Mac でローカル LLM を動かす {#run-local-llms-on-mac}

:::tip デスクトップ版にはワンクリックの近道があります
Hermes のデスクトップアプリなら、**設定 → プロバイダ → ローカルモデル** から
llama.cpp のローカルサーバーを入れて管理できます。モデルのダウンロード、メモリに収まる
設定、コンテキスト長の調整までまとめて任せられます。[ローカルモデル](/hermes/docs/user-guide/local-models/) を見てください。
このページは手作業で組み立てる場合の説明です。MLX を使う、自分でビルドする、
サーバーを自分で動かす、といったときに読んでください。
:::

このガイドでは、OpenAI 互換の API を備えたローカル LLM サーバーを macOS で動かすところまでを順に説明します。データは手元から出ず、API の費用はゼロ、そして Apple Silicon では意外なほどよく動きます。

取り上げるバックエンドは 2 つです。

| バックエンド | インストール | 得意なこと | 形式 |
|---------|---------|---------|--------|
| **llama.cpp** | `brew install llama.cpp` | 最初のトークンが返るまでが最速。量子化した KV キャッシュで省メモリ | GGUF |
| **omlx** | [omlx.ai](https://omlx.ai) | トークン生成が最速。Metal 向けにそのまま最適化されている | MLX (safetensors) |

どちらも OpenAI 互換の `/v1/chat/completions` エンドポイントを備えています。Hermes はどちらとも動くので、`http://localhost:8080` か `http://localhost:8000` を向けるだけです。

:::info Apple Silicon 専用
このガイドは Apple Silicon（M1 以降）を積んだ Mac を対象にしています。Intel Mac でも llama.cpp は動きますが GPU による高速化は効かないため、速度はかなり落ちます。
:::

---

## モデルを選ぶ {#choosing-a-model}

まず試すなら **Qwen3.5-9B** をおすすめします。推論の力が強く、量子化すればユニファイドメモリ 8GB 以上に余裕を持って収まります。

| 種類 | ディスク上のサイズ | 必要なメモリ（128K コンテキスト） | バックエンド |
|---------|-------------|---------------------------|---------|
| Qwen3.5-9B-Q4_K_M (GGUF) | 5.3 GB | 量子化 KV キャッシュ使用でおよそ 10 GB | llama.cpp |
| Qwen3.5-9B-mlx-lm-mxfp4 (MLX) | 約 5 GB | 約 12 GB | omlx |

**メモリの目安**: モデルのサイズ + KV キャッシュ。9B の Q4 モデルはおよそ 5 GB です。128K コンテキストの KV キャッシュを Q4 で量子化すると、そこに 4〜5 GB ほど加わります。標準の f16 の KV キャッシュのままだと、これが 16 GB 前後まで膨らみます。llama.cpp の KV キャッシュ量子化のフラグが、メモリの厳しい環境での決め手になります。

もっと大きいモデル（27B、35B）を動かすなら、ユニファイドメモリは 32 GB 以上必要です。8〜16 GB のマシンでは 9B がちょうどいいところです。

---

## 選択肢 A: llama.cpp {#option-a-llamacpp}

llama.cpp はローカル LLM の実行環境としてもっとも移植性が高いものです。macOS では、何も設定しなくても Metal による GPU 高速化が効きます。

### インストール {#install}

```bash
brew install llama.cpp
```

これで `llama-server` コマンドがどこからでも使えるようになります。

### モデルをダウンロードする {#download-the-model}

GGUF 形式のモデルが必要です。いちばん手軽な入手先は Hugging Face で、`huggingface-cli` を使います。

```bash
brew install huggingface-cli
```

そのうえでダウンロードします。

```bash
huggingface-cli download unsloth/Qwen3.5-9B-GGUF Qwen3.5-9B-Q4_K_M.gguf --local-dir ~/models
```

:::tip 利用申請が必要なモデル
Hugging Face のモデルには、認証を求めるものがあります。401 や 404 のエラーが出たら、先に `huggingface-cli login` を実行してください。
:::

### サーバーを起動する {#start-the-server}

```bash
llama-server -m ~/models/Qwen3.5-9B-Q4_K_M.gguf \
  -ngl 99 \
  -c 131072 \
  -np 1 \
  -fa on \
  --cache-type-k q4_0 \
  --cache-type-v q4_0 \
  --host 0.0.0.0
```

それぞれのフラグの働きは次のとおりです。

| フラグ | 役割 |
|------|---------|
| `-ngl 99` | すべての層を GPU（Metal）へ載せます。CPU 側に残らないよう、大きめの数を指定します。 |
| `-c 131072` | コンテキストの大きさ（128K トークン）。メモリが足りないときはここを減らします。 |
| `-np 1` | 並列スロットの数。1 人で使うなら 1 のままに。増やすとメモリの取り分が分かれます。 |
| `-fa on` | flash attention。メモリの使用量を抑え、長いコンテキストの推論を速くします。 |
| `--cache-type-k q4_0` | キーのキャッシュを 4bit に量子化します。**メモリ削減の効果がいちばん大きいのがこれです。** |
| `--cache-type-v q4_0` | 値のキャッシュを 4bit に量子化します。上と合わせると、KV キャッシュのメモリは f16 に比べておよそ 75% 減ります。 |
| `--host 0.0.0.0` | すべてのインターフェイスで待ち受けます。ネットワーク越しに使う必要がなければ `127.0.0.1` にします。 |

次の表示が出たら、サーバーの準備は完了です。

```
main: server is listening on http://0.0.0.0:8080
srv  update_slots: all slots are idle
```

### メモリに余裕がない環境での節約 {#memory-optimization-for-constrained-systems}

メモリが限られている環境では、`--cache-type-k q4_0 --cache-type-v q4_0` がもっとも効く設定です。128K コンテキストでの差は次のとおりです。

| KV キャッシュの型 | KV キャッシュのメモリ（128K コンテキスト、9B モデル） |
|---------------|--------------------------------------|
| f16（標準） | 約 16 GB |
| q8_0 | 約 8 GB |
| **q4_0** | **約 4 GB** |

8 GB の Mac では、KV キャッシュを `q4_0` にしたうえで、Hermes が求める最低 64K のコンテキストに収まる小さめのモデルを選んでください。16 GB あれば 128K のコンテキストを余裕を持って扱えます。32 GB 以上なら、もっと大きなモデルや複数の並列スロットも動かせます。

それでもメモリが足りないときは、Hermes の最低ラインである 64K を下回らない範囲でコンテキストを減らします。それで足りなければ、より小さいモデルか、より小さい量子化（Q4_K_M ではなく Q3_K_M）に切り替えてください。

### 動作を確かめる {#test-it}

```bash
curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.5-9B-Q4_K_M.gguf",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq .choices[0].message.content
```

### モデル名を調べる {#get-the-model-name}

モデル名を忘れてしまったら、モデル一覧のエンドポイントに問い合わせます。

```bash
curl -s http://localhost:8080/v1/models | jq '.data[].id'
```

---

## 選択肢 B: omlx で MLX を使う {#option-b-mlx-via-omlx}

[omlx](https://omlx.ai) は、MLX のモデルを管理して配信する macOS ネイティブのアプリです。MLX は Apple 自身の機械学習フレームワークで、Apple Silicon のユニファイドメモリ構造に合わせて作られています。

### インストール {#install}

[omlx.ai](https://omlx.ai) からダウンロードしてインストールします。モデル管理用の GUI と、サーバー機能が付いています。

### モデルをダウンロードする {#download-the-model}

omlx のアプリからモデルを探してダウンロードします。`Qwen3.5-9B-mlx-lm-mxfp4` を検索して取得してください。モデルは手元に保存されます（通常は `~/.omlx/models/` です）。

### サーバーを起動する {#start-the-server}

omlx は標準で `http://127.0.0.1:8000` からモデルを配信します。アプリの画面から配信を開始するか、使える場合は CLI から起動します。

### 動作を確かめる {#test-it}

```bash
curl -s http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.5-9B-mlx-lm-mxfp4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }' | jq .choices[0].message.content
```

### 使えるモデルを一覧する {#list-available-models}

omlx は複数のモデルを同時に配信できます。

```bash
curl -s http://127.0.0.1:8000/v1/models | jq '.data[].id'
```

---

## ベンチマーク: llama.cpp と MLX {#benchmarks-llamacpp-vs-mlx}

どちらのバックエンドも、同じマシン（Apple M5 Max、ユニファイドメモリ 128 GB）で、同じモデル（Qwen3.5-9B）を近い量子化レベル（GGUF は Q4_K_M、MLX は mxfp4）で動かして測りました。傾向の異なる 5 つのプロンプトを、それぞれ 3 回ずつ。資源の奪い合いを避けるため、バックエンドは順番に試しています。

### 結果 {#results}

| 指標 | llama.cpp (Q4_K_M) | MLX (mxfp4) | 優勢 |
|--------|-------------------|-------------|--------|
| **最初のトークンまでの時間（平均）** | **67 ms** | 289 ms | llama.cpp（4.3 倍速い） |
| **最初のトークンまでの時間（中央値）** | **66 ms** | 286 ms | llama.cpp（4.3 倍速い） |
| **生成速度（平均）** | 70 tok/s | **96 tok/s** | MLX（37% 速い） |
| **生成速度（中央値）** | 70 tok/s | **96 tok/s** | MLX（37% 速い） |
| **合計時間（512 トークン）** | 7.3s | **5.5s** | MLX（25% 速い） |

### この結果の読み方 {#what-this-means}

- **llama.cpp** はプロンプトの処理が得意です。flash attention と量子化 KV キャッシュの組み合わせで、最初のトークンがおよそ 66ms で返ってきます。応答が速く感じられることが効いてくる用途（チャットボット、入力補完）を作っているなら、この差には意味があります。

- **MLX** は走り出したあとのトークン生成が 37% ほど速くなります。まとめて処理する用途、長い文章の生成、あるいは最初の待ち時間より終わるまでの合計時間が大事な作業では、MLX のほうが早く終わります。

- どちらのバックエンドも**とても安定**していて、実行ごとのばらつきはごくわずかでした。この数値はそのまま当てにできます。

### どちらを選ぶべきか {#which-one-should-you-pick}

| 用途 | おすすめ |
|----------|---------------|
| 対話的なチャット、待ち時間を短くしたいツール | llama.cpp |
| 長い文章の生成、大量の処理 | MLX (omlx) |
| メモリが限られている（8〜16 GB） | llama.cpp（量子化 KV キャッシュに勝るものがない） |
| 複数のモデルを同時に配信する | omlx（複数モデル対応を最初から備えている） |
| とにかく幅広い環境で動かす（Linux も含む） | llama.cpp |

---

## Hermes につなぐ {#connect-to-hermes}

ローカルのサーバーが動いたら、次を実行します。

```bash
hermes model
```

**Custom endpoint** を選んで、案内に従ってください。ベース URL とモデル名を聞かれるので、上で用意したバックエンドの値を入れます。

---

## タイムアウト {#timeouts}

Hermes はローカルのエンドポイント（localhost や LAN の IP）を自動で見分け、ストリーミングのタイムアウトを緩めます。たいていの構成では設定は要りません。

それでもタイムアウトのエラーが出るとき（性能の低いハードウェアで非常に大きなコンテキストを扱う場合など）は、ストリーミングの読み取りタイムアウトを上書きできます。

```bash
# In your .env — raise from the 120s default to 30 minutes
HERMES_STREAM_READ_TIMEOUT=1800
```

| タイムアウト | 標準値 | ローカル時の自動調整 | 環境変数での上書き |
|---------|---------|----------------------|------------------|
| ストリームの読み取り（ソケット単位） | 120s | 1800s へ引き上げ | `HERMES_STREAM_READ_TIMEOUT` |
| ストリームの停滞の検知 | 180s | 完全に無効化 | `HERMES_STREAM_STALE_TIMEOUT` |
| API 呼び出し（非ストリーミング） | 1800s | 調整の必要なし | `HERMES_API_TIMEOUT` |

問題になりやすいのはストリームの読み取りタイムアウトです。これは次のデータの塊を受け取るまでの、ソケット単位の期限を指します。大きなコンテキストの前処理の最中は、ローカルのモデルがプロンプトを読み込むあいだ数分にわたって何も出力しないことがあります。自動判別がこれをうまく吸収します。

:::tip 最初のターンの沈黙は、たいてい前処理であって停止ではありません
Hermes は呼び出しのたびにシステムプロンプトとツールのスキーマを送るため、性能の低いハードウェアでは、モデルがそれを読み込んでいるあいだ、最初のターンで数分の沈黙が続くことがあります。これは前処理が進んでいるのであって、セッションが止まっているわけではありません。モデルを読み込んだままにする、`hermes prompt-size` で固定部分のプロンプトを削るといった対策は、Ollama のガイドの [Slow first response (prefill)](/hermes/docs/guides/local-ollama-setup/#slow-first-response-prefill) をご覧ください。
:::
