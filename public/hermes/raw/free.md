---
title: "無料枠で使う方法"
description: "クラウドのモデル利用料が無料になる代表的な経路と、無料モデルの一覧。DesktopとCLIが対象。"
raw: /hermes/raw/free.md
---

# 無料枠で使う方法

クラウドのモデル利用料が無料になる代表的な経路を、Hermes DesktopとCLI向けにまとめます。

無料モデルの一覧は公開APIから毎日更新し、経路の説明には確認日を付けています。

無料になるのはモデル利用料です。Tool Gatewayの検索・画像・音声などは別料金になる場合があります。

## 経路の比較

| 経路 | 登録・APIキー | 無料になる範囲 | 利用条件 | 公式の設定手順 | 説明の確認日 |
|---|---|---|---|---|---|
| Nous Portal Free | 登録が必要。APIキーは不要 | 無料モデルのモデル利用料 | 標準のレート制限。月次クレジットは0 | [Nous Portalの設定](https://wiki.winsmux.dev/hermes/docs/integrations/nous-portal/) | 2026-09-18 |
| OpenRouter :free | 登録とAPIキーが必要 | 末尾に:freeが付くモデルのモデル利用料 | 1分あたりと1日あたりの回数制限あり。最新値は公式ページで確認 | [AIプロバイダーの設定](https://wiki.winsmux.dev/hermes/docs/integrations/providers/) / [OpenRouterの利用制限](https://openrouter.ai/docs/api-reference/limits) | 2026-09-18 |
| OpenCode Free | 登録もAPIキーも不要 | 末尾に-freeが付く対象モデルのモデル利用料 | 無料の提供は予告なく出入りする。動作は未検証 | [AIプロバイダーの設定](https://wiki.winsmux.dev/hermes/docs/integrations/providers/) | 2026-09-18 |
| Google AI Studio（Gemini） | Google AI StudioのAPIキーが必要 | Gemini APIの無料枠 | 無料枠では入力データがGoogleの改善に使われる | [Google Geminiガイド](https://wiki.winsmux.dev/hermes/docs/guides/google-gemini/) / [Gemini APIの料金](https://ai.google.dev/gemini-api/docs/pricing) | 2026-09-18 |

ここで扱う経路は代表例です。GroqやCerebrasなど、カスタムエンドポイントの無料枠は、公式資料の[対応例](https://wiki.winsmux.dev/hermes/docs/integrations/providers/#other-compatible-providers)と[レシピ集](https://wiki.winsmux.dev/hermes/docs/integrations/providers/#cookbook-together-ai-groq-perplexity)で確認してください。

## Nous Portal Free

無料モデルのみを利用でき、標準のレート制限が適用されます。月次クレジットは0です。

無料枠かどうかは、Hermesが受け取るアカウントの状態で決まります。

公式の設定手順: [Nous Portalの設定](https://wiki.winsmux.dev/hermes/docs/integrations/nous-portal/)

最終取得: 2026-09-18

| モデル | コンテキスト上限（トークン） | ツール呼び出し（API記載） | 公開仕様の条件判定 | 提供終了予定 |
|---|---:|---|---|---|
| **inclusionAI: Ling 3.0 Flash Fin**<br>`inclusionai/ling-3.0-flash-fin:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **inclusionAI: Ling 3.0 Flash Sante (free)**<br>`inclusionai/ling-3.0-flash-sante:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Meituan: LongCat 2.0**<br>`meituan/longcat-2.0:free`<br>入力・出力の基本単価0（取得時点） | 1,048,576 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Poolside: Laguna S 2.1**<br>`poolside/laguna-s-2.1:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Poolside: Laguna XS 2.1**<br>`poolside/laguna-xs-2.1:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Union Alpha**<br>`stealth/union-alpha`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 提供終了予定: 2098-12-31 |
| **StepFun: Step 3.7 Flash**<br>`stepfun/step-3.7-flash:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Upstage: Solar Pro 4**<br>`upstage/solar-pro4:free`<br>入力・出力の基本単価0（取得時点） | 524,288 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |

## OpenRouter :free

利用にはOpenRouterへの登録とAPIキーが必要です。

無料モデルには1分あたりと1日あたりの回数制限があります。現在の数値は公式の利用制限ページで確認してください。

公式の設定手順: [AIプロバイダーの設定](https://wiki.winsmux.dev/hermes/docs/integrations/providers/) / [OpenRouterの利用制限](https://openrouter.ai/docs/api-reference/limits)

最終取得: 2026-09-18

| モデル | コンテキスト上限（トークン） | ツール呼び出し（API記載） | 公開仕様の条件判定 | 提供終了予定 |
|---|---:|---|---|---|
| **Cohere: North Mini Code (free)**<br>`cohere/north-mini-code:free`<br>入力・出力の基本単価0（取得時点） | 256,000 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Dots Studio: Dots3-Note Preview (free)**<br>`dots-studio/dots-3-note-preview:free`<br>入力・出力の基本単価0（取得時点） | 512,000 | 対応の記載あり | 条件を満たす（動作未確認） | 提供終了予定: 2026-09-30 |
| **Google: Gemma 4 26B A4B  (free)**<br>`google/gemma-4-26b-a4b-it:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Google: Gemma 4 31B (free)**<br>`google/gemma-4-31b-it:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Google: Lyria 3 Clip Preview**<br>`google/lyria-3-clip-preview`<br>入力・出力の基本単価0（取得時点） | 1,048,576 | 対応の記載なし | 条件を満たさない（ツール呼び出し） | 終了日未記載 |
| **Google: Lyria 3 Pro Preview**<br>`google/lyria-3-pro-preview`<br>入力・出力の基本単価0（取得時点） | 1,048,576 | 対応の記載なし | 条件を満たさない（ツール呼び出し） | 終了日未記載 |
| **inclusionAI: Ling 3.0 Flash Fin (free)**<br>`inclusionai/ling-3.0-flash-fin:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **inclusionAI: Ling 3.0 Flash Sante (free)**<br>`inclusionai/ling-3.0-flash-sante:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **inclusionAI: Ling 3.0 Flash VL (free)**<br>`inclusionai/ling-3.0-flash-vl:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **LiquidAI: LFM2.5-2.6B (free)**<br>`liquid/lfm-2.5-2.6b:free`<br>入力・出力の基本単価0（取得時点） | 65,536 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Nex AGI: Nex-N2.5-Mini (free)**<br>`nex-agi/nex-n2.5-mini:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Nex AGI: Nex-N2.5-Pro (free)**<br>`nex-agi/nex-n2.5-pro:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **NVIDIA: Nemotron 3 Nano Omni (free)**<br>`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`<br>入力・出力の基本単価0（取得時点） | 256,000 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **NVIDIA: Nemotron 3 Super (free)**<br>`nvidia/nemotron-3-super-120b-a12b:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **NVIDIA: Nemotron 3 Ultra (free)**<br>`nvidia/nemotron-3-ultra-550b-a55b:free`<br>入力・出力の基本単価0（取得時点） | 1,000,000 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **NVIDIA: Nemotron 3.5 Content Safety (free)**<br>`nvidia/nemotron-3.5-content-safety:free`<br>入力・出力の基本単価0（取得時点） | 128,000 | 対応の記載なし | 条件を満たさない（ツール呼び出し） | 終了日未記載 |
| **NVIDIA: Nemotron 3.5 Lightning (free)**<br>`nvidia/nemotron-3.5-lightning:free`<br>入力・出力の基本単価0（取得時点） | 1,000,000 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Free Models Router**<br>`openrouter/free`<br>入力・出力の基本単価0（取得時点） | 200,000 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Poolside: Laguna S 2.1 (free)**<br>`poolside/laguna-s-2.1:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Poolside: Laguna XS 2.1 (free)**<br>`poolside/laguna-xs-2.1:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Qwen: Qwen3.8 27B (free)**<br>`qwen/qwen3.8-27b:free`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Union Alpha**<br>`stealth/union-alpha`<br>入力・出力の基本単価0（取得時点） | 262,144 | 対応の記載あり | 条件を満たす（動作未確認） | 提供終了予定: 2098-12-31 |
| **Thinking Machines: Inkling Small (free)**<br>`thinkingmachines/inkling-small:free`<br>入力・出力の基本単価0（取得時点） | 1,048,576 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Thinking Machines: Inkling (free)**<br>`thinkingmachines/inkling:free`<br>入力・出力の基本単価0（取得時点） | 1,048,576 | 対応の記載あり | 条件を満たす（動作未確認） | 終了日未記載 |
| **Z.ai: GLM 5.2 (free)**<br>`z-ai/glm-5.2:free`<br>入力・出力の基本単価0（取得時点） | 32,768 | 対応の記載なし | 条件を満たさない（ツール呼び出し） | 終了日未記載 |

## OpenCode Free

APIキーもアカウントも要りません。リクエストは匿名で送られます。

公式資料では、無料の提供は予告なく出入りするとされています。

この経路は実機での動作を確認していません。

公式の設定手順: [AIプロバイダーの設定](https://wiki.winsmux.dev/hermes/docs/integrations/providers/)

最終取得: 2026-09-18

| モデル | コンテキスト上限（トークン） | ツール呼び出し（API記載） | 公開仕様の条件判定 | 提供終了予定 |
|---|---:|---|---|---|
| **deepseek-v4-flash-free**<br>`deepseek-v4-flash-free`<br>提供元の無料表記。料金未確認 | 未確認 | 未確認 | 判定できない | 終了日未記載 |
| **ling-3.0-flash-fin-free**<br>`ling-3.0-flash-fin-free`<br>提供元の無料表記。料金未確認 | 未確認 | 未確認 | 判定できない | 終了日未記載 |
| **mimo-v2.5-free**<br>`mimo-v2.5-free`<br>提供元の無料表記。料金未確認 | 未確認 | 未確認 | 判定できない | 終了日未記載 |
| **muse-spark-1.2-contributor-free**<br>`muse-spark-1.2-contributor-free`<br>提供元の無料表記。料金未確認 | 未確認 | 未確認 | 判定できない | 終了日未記載 |
| **muse-spark-1.3-contributor-free**<br>`muse-spark-1.3-contributor-free`<br>提供元の無料表記。料金未確認 | 未確認 | 未確認 | 判定できない | 終了日未記載 |
| **nemotron-3-ultra-free**<br>`nemotron-3-ultra-free`<br>提供元の無料表記。料金未確認 | 未確認 | 未確認 | 判定できない | 終了日未記載 |
| **nemotron-3.5-lightning-free**<br>`nemotron-3.5-lightning-free`<br>提供元の無料表記。料金未確認 | 未確認 | 未確認 | 判定できない | 終了日未記載 |

## Google AI Studio（Gemini）

無料枠では、入力データがGoogleの製品改善に使われます。

Hermesの公式資料には、個人向けのGoogle AI Pro / UltraでHermesにサインインする方法はなく、GeminiプロバイダーはAPIキー専用だと記載されています。

公式の設定手順: [Google Geminiガイド](https://wiki.winsmux.dev/hermes/docs/guides/google-gemini/) / [Gemini APIの料金](https://ai.google.dev/gemini-api/docs/pricing)

このページでは、Google AI Studioのモデル一覧を自動取得していません。対象モデルと条件は公式の料金ページで確認してください。

## 注意点

- Hermesはコンテキスト長が分からないモデルに256Kの既定値を当てて処理します。この一覧では推定せず「未確認」と表示します。
- 無料モデルや無料の提供は予告なく入れ替わります。
- OpenCode FreeはAPIキーも登録も不要ですが、この経路の動作は未検証です。
- Tool Gatewayの検索・画像・音声など、モデル以外の機能は別料金になる場合があります。
- Hermesのモデル選択では、ツール非対応モデルを一覧から除く処理はOpenRouterにだけあります。このページはAPIにある無料モデルを掲載し、条件判定を別列で示します。

## Desktopの設定

実機確認日: 2026-09-15

1. モデルを選ぶ: 右上の歯車から設定を開き、左の「モデル」を選ぶ。上のプルダウンでプロバイダー（例: Nous Portal）、下のプルダウンでモデル（例: upstage/solar-pro4:free）を選び、「適用」を押す。上部の「適用対象」で、どのプロファイルに適用するかを選べる。
2. Nous Portal をつなぐ: 設定の「プロバイダー」から「アカウント」を開き、「アカウントを接続」の一覧で Nous Portal を選ぶ。あとは画面の案内に従ってサインインする。
3. OpenRouter の API キーを入れる: 設定の「プロバイダー」から「API キー」を開き、OpenRouter の行の「OpenRouter キーを貼り付け」にキーを貼る。OpenCode Free はキーが要らないので、この操作は不要。
4. モデルのプルダウンには id がそのまま並び、この版の画面では無料の印は出ていなかった。末尾の :free や -free は提供元ごとの表記なので、無料かどうかはこのページの表の料金の根拠と、各経路の条件で確かめる。

## 正本へのリンク

### 公式ページ

- [Nous Portal](https://portal.nousresearch.com)
- [OpenRouter の利用制限](https://openrouter.ai/docs/api-reference/limits)
- [Hermes 公式ドキュメント: AI プロバイダーの設定](https://hermes-agent.nousresearch.com/docs/integrations/providers)
- [Gemini API の料金](https://ai.google.dev/gemini-api/docs/pricing)

### 一覧の取得元（毎日取得）

- [Nous Portal のモデル一覧 API](https://inference-api.nousresearch.com/v1/models)
- [OpenRouter のモデル一覧 API](https://openrouter.ai/api/v1/models)
- [OpenCode のモデル一覧 API](https://opencode.ai/zen/v1/models)

### 判定の根拠（Hermes のソース、rev 59c20a51aa）

- [hermes_cli/nous_account.py](https://github.com/NousResearch/hermes-agent/blob/59c20a51aa/hermes_cli/nous_account.py)
- [hermes_cli/providers.py](https://github.com/NousResearch/hermes-agent/blob/59c20a51aa/hermes_cli/providers.py)
- [hermes_cli/models.py](https://github.com/NousResearch/hermes-agent/blob/59c20a51aa/hermes_cli/models.py)
- [agent/model_metadata.py](https://github.com/NousResearch/hermes-agent/blob/59c20a51aa/agent/model_metadata.py)
