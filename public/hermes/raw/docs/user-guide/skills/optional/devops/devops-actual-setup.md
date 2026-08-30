---
title: "Actual Setup — Actual Computer（actual.inc）の推論を Hermes に設定する"
description: "Actual Computer（actual.inc）の推論を Hermes に設定する"
upstream_path: user-guide/skills/optional/devops/devops-actual-setup.md
upstream_blob: 450eb93bc9125da47a16fe0aeec1a171a72d34bc
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-actual-setup
---

# Actual Setup {#actual-setup}

Actual Computer（actual.inc）の推論を Hermes に設定します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/devops/actual-setup` で導入します |
| パス | `optional-skills/devops\actual-setup` |
| バージョン | `2.0.0` |
| 作者 | shl0ms + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `actual`, `actual-inc`, `provider`, `local-inference`, `relay`, `gguf`, `setup` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Actual Computer Setup Skill {#actual-computer-setup-skill}

[actual.inc](https://actual.inc)（Actual Computer）を Hermes の推論の提供元として設定します。
Actual はユーザー自身のハードウェアを自分だけの推論クラスタに変え、OpenAI 互換の API を 2 通りで
公開します。1 つは `https://api.actual.inc` にある、両端で暗号化されたホスト型の中継
（`ac_` で始まるキーで認証します）。もう 1 つは `http://127.0.0.1:8080` で動く、端末上の
デーモンです（ループバックでは認証不要）。この skill は Actual のデーモンをユーザーの代わりに
インストールしません。端末の認可には、人がブラウザで操作する必要があるからです。

## 使いどころ {#when-to-use}

- ユーザーが actual.inc を推論の提供元として追加したいとき（クラウドの中継でも、端末上でも）。
- ユーザーが `ac_` のキーを持っていて、Hermes を自分の Actual クラスタ経由にしたいとき。
- ユーザーが Actual のデーモンで、完全に端末内だけの推論をしたいとき。
- 困ったとき: Actual へのリクエストが、分かりにくい 400 や空のストリームで失敗する。

## 前提条件 {#prerequisites}

- Hermes は **`actual` を提供元として正式に扱えます**（提供元 id は `actual`、別名は
  `actual-computer`、`actualcomputer`、`aci`）。今の Hermes では、Actual を
  `custom_providers` や `providers.actual.*` の項目として設定しないでください。組み込みの
  提供元がこの名前を持っていて、base-url の正規化、Responses の通信、ローカルでの認証なしを
  自動で扱います。
- 中継を使う場合: Actual のアカウントと、https://actual.inc/user/keys で取れる `ac_` の
  推論キーが要ります。
- 端末上で使う場合: ユーザーがデーモンをインストールし
  （`curl -fsSL "https://actual.inc/install" | bash`）、`actual` を一度実行して表示された
  `https://actual.inc/device?code=...` の URL をブラウザで開き、端末の認可を済ませていること。
  その URL はユーザーに伝えて**待ってください**。メールアドレスをでっち上げたり、代わりに
  認可したりは決してしないでください。コードは 5 分で切れるので、新しいものが要るなら
  `actual` を実行し直してもらいます。

## 実行方法 {#how-to-run}

### 中継 / API を使う {#relay-api-mode}

1. キーは `.env` に置きます（秘密の値だけです。config.yaml には決して書きません）。
   `~/.hermes/.env` に `ACTUAL_API_KEY=ac_...` を追記します。
2. `terminal` でキーを確かめ、使えるモデルを調べます:
   ```bash
   curl -s https://api.actual.inc/v1/models -H "Authorization: Bearer $ACTUAL_API_KEY"
   ```
3. 提供元とモデルを選びます:
   ```bash
   hermes config set model.provider actual
   hermes config set model.default "MODEL_ID_FROM_DISCOVERY"
   ```
4. 端から端まで通ることを確かめます:
   ```bash
   hermes chat -Q -q "Reply with exactly: ACTUAL_OK" --provider actual -m MODEL_ID
   ```

### 端末上で使う {#local-mode}

1. 人がデーモンをインストールし、認可を済ませておきます（「前提条件」を参照）。
2. モデルをダウンロードして読み込みます（認可さえ済めばスクリプトから実行できます）:
   ```bash
   actual models search "qwen2.5 0.5b instruct gguf" --limit 8 --no-prompt
   # Downloads REQUIRE an explicit quantization (409 ambiguous_model_download otherwise):
   actual models download "Qwen/Qwen2.5-0.5B-Instruct-GGUF/Q4_K_M"
   actual models list        # note the INSTALLED name (differs from download id)
   actual models load "qwen2.5-0.5b-instruct-q4_k_m"   # load by installed name
   ```
3. Hermes をデーモンに向けます。`ACTUAL_BASE_URL` にループバックのホストを指定すると、
   組み込みの提供元が自動でローカルの認証なしモードに切り替わり、キーは要りません。
   `~/.hermes/.env` に `ACTUAL_BASE_URL=http://127.0.0.1:8080` を追記してから:
   ```bash
   hermes config set model.provider actual
   hermes config set model.default "INSTALLED_MODEL_NAME"
   ```
4. 確かめます（ツールを絞った状態で。下のコンテキスト長のつまずきどころを参照）:
   ```bash
   hermes chat -Q -q "Reply with exactly: LOCAL_OK" --provider actual -m INSTALLED_NAME -t file,web
   ```

## 早見表 {#quick-reference}

| 項目 | 値 |
|---|---|
| ホスト型の中継 | `https://api.actual.inc/v1`（ホスト名だけ書いても自動で正規化されます） |
| 端末上のデーモン | `http://127.0.0.1:8080/v1`（ループバックでは認証なし） |
| キーの環境変数 | `ACTUAL_API_KEY`（`ac_...`） |
| Base URL の環境変数 | `ACTUAL_BASE_URL`（ループバックのホスト ⇒ ローカルの認証なしモード） |
| 提供元 id / 別名 | `actual` / `actual-computer`, `actualcomputer`, `aci` |
| 通信方式 | Responses API（`codex_responses`）— 組み込みです。上書きしないでください |
| クラスタの固定 | config.yaml の `providers.actual.extra_headers` で `X-Cluster-ID` ヘッダーを付けます |
| モデルの大きさの目安 | 0.5B Q4_K_M で約 470MB（お試し）、7-8B Q4_K_M で約 4.5GB（普段使い）、32B で約 20GB |

## つまずきどころ {#pitfalls}

1. **reasoning_effort の罠（正式な提供元になってからは Hermes が面倒を見ます）。**
   Actual の SGLang / vLLM のバックエンドは `none/low/medium/high/max` しか受け付けません。
   以前は `xhigh` や `ultra` を渡すと、分かりにくい
   `Expecting value: line 1 column 1 (char 0)`（中身は HTTP 400）で失敗していました。
   組み込みの提供元は、送信時に `xhigh→high`、`ultra→max` と丸めます。古い Hermes で
   まだこの形の 400 が出るなら、モデルごとに上限を設定してください。config.yaml の
   `agent.reasoning_overrides.<model>: high` です。
2. **小さなローカルモデルでのコンテキスト長あふれ。** Hermes の既定のツール一式はスキーマだけで
   約 26k トークン、加えてシステムプロンプトが約 9k トークンあります。32k のコンテキストで
   読み込んだモデルは最初のやり取りの前にあふれ、llama.cpp 系のサーバーは
   `data: [DONE]` だけを返すので、Hermes は
   `Provider returned an empty stream with no finish_reason` と報告します。これは SSE の
   不具合ではありません。対処は、ツールを絞る（`-t file,web`）、`n_ctx` を大きくしてモデルを
   読み込む、またはツール一式をそのまま使うなら 64k 以上のコンテキストを持つモデルを選ぶ、
   のいずれかです。上流での追跡先は #51448 です（新しい issue は立てず、そこに証拠を
   足してください）。似ていますが別のものとして、#65631（HTTP 200 の SSE が 400 を運ぶ）と
   #56516（reasoning だけのストリーム）があります。
3. **ダウンロードの id とインストール後の名前は別物です。** `actual models download` は
   `repo/QUANT` を取り、量子化を明示しないと 409 になります。`actual models load` は
   `actual models list` に出るインストール後の名前を取ります。
4. **reasoning 系のモデルが本文を返さない。** GLM や Qwen の reasoning 版は、思考を別の
   `reasoning` フィールドに出すため、`max_tokens` が小さいとそれだけで使い切ることがあります。
   失敗と決めつける前に、max_tokens をたっぷり取ってください。
5. **`actual` という名前の独自プロバイダを作らないでください。** 正式対応の前に書かれた古い
   手引きは `providers.actual.*` の設定ブロックを書かせていました。今の Hermes では組み込みの
   提供元がこの名前を取るので、古い独自ブロックは無視されるか、ぶつかります。消したうえで、
   上に書いた環境変数と model.provider の流れを使ってください。

## 検証 {#verification}

```bash
# Relay:
hermes chat -Q -q "Reply with exactly: ACTUAL_OK" --provider actual -m MODEL
# Local (small model — reduced toolset):
hermes chat -Q -q "Reply with exactly: LOCAL_OK" --provider actual -m MODEL -t file,web
# Provider status (local no-auth shows key_source=local-offline):
hermes status
```

OpenCode など、他の OpenAI 互換のクライアントについては `references/opencode.md` を
参照してください。
