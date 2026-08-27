---
title: 料金と実例
description: かかるのはモデルの利用料。つなぎ方3択の費用構造と、Portal の実際の単価。
sources:
  - https://hermes-agent.nousresearch.com/docs/integrations/nous-portal
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuring-models
  - https://hermes-agent.nousresearch.com/docs/guides/tips
  - https://hermes-agent.nousresearch.com/docs/guides/local-ollama-setup
  - https://portal.nousresearch.com/models
hermes_version: "0.20.6"
confidence: medium
raw: /hermes/raw/cost.md
---

# 料金と実例

Hermes 本体は無料の OSS です。ダウンロードにも利用にもお金はかかりません。かかるのは、頭脳にあたるモデル（LLM）の利用料と、使う場合はツール（検索・画像生成など）の利用料です。公式資料と Portal の一覧を突き合わせてまとめました（切り口はこのサイトのものなので確度は medium です）。

## お金のかかりどころ

支払いが発生するのはモデルの推論、つまり「入力トークン」と「出力トークン」に対してです。単価はモデルごとに違い、1M（100 万）トークンあたり何ドル、という形で決まっています。会話の履歴が長くなるほど、毎ターン読み直す入力が増えます。

Tool Gateway の検索・画像生成・音声合成・ブラウザ操作は、Portal の契約を使う場合は別会社の契約なしで使えますが、無料ではありません。使った分が Nous の契約に従量で請求されます（公式の言い方は「pay-as-you-use billed against your Nous subscription」。無料アカウントにはこのツール群は付きません）。自分のキーで各社に直接つなぐ場合は、その各社の料金が別に立ちます（[Tool Gateway](/hermes/docs/user-guide/features/tool-gateway/)）。

## つなぎ方3択の費用構造

**Nous Portal（サブスク口座への従量課金）** — ひとつの契約でモデルもツールもまとまります。使った分が Nous の契約に乗る従量課金で、公式の推奨。支払い先がひとつで済むのが最大の利点です。切り替えても請求先は変わらないので、モデルを試す回数が多い人ほど向いています（[Nous Portal](/hermes/docs/integrations/nous-portal/)）。

**各社の API キー直（従量）** — OpenRouter、OpenAI、Anthropic、Google など。使った分だけ払います。すでにキーを持っているならその日から動きます。反面、提供元ごとに残高と管理画面が増えます（[AI プロバイダー](/hermes/docs/integrations/providers/)）。

**ローカルの Ollama（API 料金ゼロ）** — 手元のマシンだけで動かします。API 料金はかかりません。かわりに必要なのはメモリと GPU で、公式の手順では 3B 級で 8 GB、27B 以上なら 32 GB 以上が目安とされています。ツール呼び出しに対応したモデルでないとエージェントとしては働けない点に注意してください（[Ollama でローカルに動かす](/hermes/docs/guides/local-ollama-setup/)）。

## 価格の実例

Nous Portal のモデル一覧から、価格帯ごとに 6 つ引いたものです。単位は 1M トークンあたりのドル、in が入力、out が出力です。

| モデル | in（$/1M） | out（$/1M） |
|---|---|---|
| Upstage: Solar Pro 4（`upstage/solar-pro4:free`） | 0 | 0 |
| Mistral: Mistral Nemo（`mistralai/mistral-nemo`） | 0.0152 | 0.024 |
| Google: Gemini 3.1 Flash Lite（`google/gemini-3.1-flash-lite`） | 0.2 | 1.2 |
| DeepSeek: DeepSeek V4 Pro（`deepseek/deepseek-v4-pro`） | 0.696 | 1.392 |
| Claude Sonnet 4.6（`anthropic/claude-sonnet-4.6`） | 2.4 | 12 |
| OpenAI: GPT-5.5 Pro（`openai/gpt-5.5-pro`） | 24 | 144 |

**2026-08-27 時点の値です。最新は [モデルと料金](/hermes/models/) で確認してください。**

同じ日の一覧には全 372 件、うちテキスト系が 329 件ありました。有料のものだけで見ると、入力単価は最安の 0.0152 ドルから上位の 24 ドルまで開きます。同じ会話でも、どのモデルに投げるかで支払いは 3 桁変わるということです。

テキスト系 329 件のうち 317 件には、定価から 20% 引きの価格が付いていました。上の表の値はすべて引き後です（たとえば Claude Sonnet 4.6 は定価 3 ドル / 15 ドルに対して 2.4 ドル / 12 ドル。分類上は TEXT ではなく OTHER 帯ですが、割引の付き方は同じです）。

## 目安の考え方

「1 回の会話でだいたい何ドル」を先に決めることはできません。支払いは **単価 × 使った量** でしか決まらず、量は作業の中身で大きく変わるからです。目安が欲しいなら、量のほうを測ります。

- `/usage` — いまのセッションのトークン消費を見ます
- `/insights` — 直近 30 日の使い方の傾向を見ます
- `hermes prompt-size` — 会話を始める前から乗っている固定分（システムプロンプト、スキルの索引、メモリ、ツールのスキーマ）をバイト単位で出します。オフラインでも動きます（[CLI コマンド](/hermes/docs/reference/cli-commands/)）

公式の [Ollama でローカルに動かす](/hermes/docs/guides/local-ollama-setup/) には、入力 10 万 / 出力 2 万トークンのセッションを想定した比較表が載っています。自分の使い方がこれに近いかどうかは、上の 3 つで測ってから判断してください。

量を減らす手として、公式の [使い方のコツ](/hermes/docs/guides/tips/) は次を挙げています。

- プロンプトのキャッシュを壊さない。長いセッションで `/model` を行き来すると、次のターンで会話全体の入力料金を払い直すことになります
- 長くなったら `/compress` で履歴を要約する
- 並行して調べたいことは `delegate_task` に任せる。サブエージェントの本文は本体の会話に戻りません
- まとめ作業はスクリプトを書かせて一度に実行する

補助的な仕事（セッション名の生成、圧縮、承認の判断など）にだけ安いモデルを割り当てることもできます。設定は [モデルの設定](/hermes/docs/user-guide/configuring-models/) にあります。

## 無料で試す構成

2026-08-27 時点の Portal の一覧には、無料枠のテキストモデルが 6 件ありました。Solar Pro 4、Poolside Laguna S 2.1 / XS 2.1、Tencent Hy3、StepFun Step 3.7 Flash、Meituan LongCat 2.0 です。単価は入力・出力ともに 0 でした。

手元だけで完結させたいなら Ollama です。API 料金はゼロで、会話の内容が外に出ることもありません。ツール呼び出しに対応したモデルを選び、コンテキスト長を広げるところまでやると、エージェントとして使える状態になります。

難しい依頼だけクラウドに逃がす形も公式が案内しています。ふだんはローカル、失敗したときだけ有料のモデル、という組み方です（[フォールバック](/hermes/docs/user-guide/features/fallback-providers/)、[プロバイダー振り分け](/hermes/docs/user-guide/features/provider-routing/)）。

まだ動かしていない場合は [Hermes Agentをインストールする](/hermes/docs/getting-started/quickstart/) から、よく使うページは [よく使う](/hermes/guide/) にあります。
