---
title: "契約の中継サーバー"
description: "Nous Portal の契約（や他の OAuth プロバイダー）を、外部アプリ向けの OpenAI 互換エンドポイントとして使えるようにします。"
upstream_path: user-guide/features/subscription-proxy.md
upstream_blob: 5e7e852a3cf78e3c1aff0d68607513132fe6c13b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/subscription-proxy
---

# 契約の中継サーバー {#subscription-proxy}

契約の中継サーバーは、自分の端末で動く小さな HTTP サーバーです。外部のアプリ
（OpenViking、Karakeep、Open WebUI など、OpenAI 互換の chat completions を
話せるもの全般）が、Hermes で管理しているプロバイダーの契約を、そのまま
LLM の接続先として使えるようになります。中継サーバーが正しい認証情報を
（自動で更新しながら）付けてくれるので、アプリ側に固定の API キーを持たせる
必要がありません。

これは [API サーバー](/hermes/docs/user-guide/features/api-server/) とは別物です。

| | API サーバー | 契約の中継サーバー |
|---|---|---|
| 何を出すか | 自分のエージェント（道具一式・記憶・スキルつき） | モデルの推論そのもの |
| 使いどころ | 「Hermes をチャットの裏側として使いたい」 | 「Portal の契約を別のアプリから使いたい」 |
| 認証 | 自分の `API_SERVER_KEY` | 何でもよい（本物は中継サーバーが付ける） |
| ツールの呼び出し | あり — エージェントがツールを動かす | なし — そのまま素通し |

**エージェント**を裏側にしたいときは API サーバーを使ってください。契約を通して
**モデルだけ**を使いたいときは、中継サーバーを使ってください。

## 最短の手順 {#quick-start}

### 1. プロバイダーにログインする（一度だけ） {#1-log-into-your-provider-one-time}

```bash
hermes portal
```

ブラウザが開いて、Nous Portal の OAuth の流れに入ります。Hermes は更新用の
トークンを `~/.hermes/auth.json` に保存します。Hermes のプロバイダーの
ログイン情報が置かれるのと同じ場所です。

### 2. 中継サーバーを起動する {#2-start-the-proxy}

```bash
hermes proxy start
```

```
Starting Hermes proxy for Nous Portal
  Listening on:  http://127.0.0.1:8645/v1
  Forwarding to: (resolved per-request from your subscription)
  Use any bearer token in the client — the proxy attaches your real credential.
```

これは前面で動かしたままにしておきます。ログアウトしても生かしておきたい
場合は、`tmux` や `nohup`、あるいは systemd の unit を使ってください。

### 3. アプリの接続先をここに向ける {#3-point-your-app-at-it}

OpenAI 互換のアプリなら、設定はどれも同じ 3 点です。

```
Base URL:   http://127.0.0.1:8645/v1
API key:    anything (e.g. "sk-unused")
Model:      Hermes-4-70B    # or Hermes-4.3-36B, Hermes-4-405B
```

中継サーバーは、アプリから来た `Authorization` ヘッダーを無視して、上流への
リクエストに本物の Portal の認証情報を付けます。bearer の期限が近づくと、
更新は自動で行われます。

## 使えるプロバイダー {#available-providers}

```bash
hermes proxy providers
```

いま同梱しているのは `nous`（Nous Portal）と `xai`（xAI / Grok）です。
`hermes_cli/proxy/adapters/` の `UpstreamAdapter` を実装すれば、他の OAuth
プロバイダーも足せます。

## 状態を確かめる {#check-status}

```bash
hermes proxy status
```

```
Hermes proxy upstream adapters

  [nous    ] Nous Portal — ready (bearer expires 2026-05-15T06:43:21Z)
```

`not logged in` と出たら `hermes portal` を実行してください。
`credentials need attention` と出たら、更新用のトークンが無効にされています
（まれです。Portal のウェブ画面からサインアウトしたときに起きます）。
やはり `hermes portal` をもう一度実行すれば直ります。

## 通せるパス {#allowed-paths}

中継サーバーが転送するのは、上流が実際に受け付けるパスだけです。Nous Portal
の場合は次のとおりです。

| パス | 用途 |
|------|---------|
| `/v1/chat/completions` | チャットの応答生成（ストリーミングあり・なしの両方） |
| `/v1/completions` | 昔ながらのテキスト補完 |
| `/v1/embeddings` | 埋め込みベクトル |
| `/v1/models` | モデルの一覧 |

それ以外のパス（`/v1/images/generations`、`/v1/audio/speech` など）は、通せる
パスを示すはっきりしたエラーとともに 404 を返します。行儀の悪いクライアントが
おかしなリクエストを上流へ漏らすのを防ぐためです。

## OpenViking から Portal を使う設定 {#configuring-openviking-to-use-portal}

[OpenViking](https://github.com/volcengine/OpenViking) は文脈を貯めておく
データベースで、VLM（記憶を取り出すために使う画像・言語モデル）と埋め込み
モデルのために LLM のプロバイダーを必要とします。中継サーバーを使えば、
`vlm.api_base` を自分の端末の中継サーバーに向けられます。

`~/.openviking/ov.conf` を編集します。

```json
{
  "vlm": {
    "provider": "openai",
    "model": "Hermes-4-70B",
    "api_base": "http://127.0.0.1:8645/v1",
    "api_key": "unused-proxy-attaches-real-creds"
  }
}
```

そのうえで、`openviking-server` と並べて中継サーバーを別の端末で動かします。

```bash
# Terminal 1
hermes proxy start

# Terminal 2
openviking-server
```

これで OpenViking の VLM の呼び出しが、自分の Portal の契約を通るように
なります。埋め込みモデルのほうは、まだ別途プロバイダーが要ります。Portal は
`/v1/embeddings` も提供していますが、どのモデルを選べるかは契約の等級に
よります。`portal.nousresearch.com/models` で確かめてください。

## Karakeep（やブックマーク・要約系のアプリ）の設定 {#configuring-karakeep-or-any-bookmarksummarizer-app}

[Karakeep](https://karakeep.app/) は、ブックマークの要約に OpenAI 互換の API
を使います。その設定に次を書きます。

```bash
# Karakeep .env
OPENAI_API_BASE_URL=http://127.0.0.1:8645/v1
OPENAI_API_KEY=any-non-empty-string
INFERENCE_TEXT_MODEL=Hermes-4-70B
```

同じやり方が、Open WebUI、LobeChat、NextChat をはじめ、OpenAI 互換の
クライアント全般に使えます。

## 家庭内のネットワークに出す {#exposing-on-lan}

既定では、中継サーバーは `127.0.0.1`（自分の端末の中だけ）で待ち受けます。
同じネットワークにある他の端末からも使えるようにするには、次のようにします。

```bash
hermes proxy start --host 0.0.0.0 --port 8645
```

⚠ **注意:** これでネットワーク上の誰もが、自分の Portal の契約を使えるように
なります。中継サーバー自身は認証を持たず、どんな bearer でも受け入れます。
信頼できる範囲の外へ出すのなら、ファイアウォールか VPN、あるいはきちんと
認証のある逆向きの中継を挟んでください。

## 呼び出し回数の上限 {#rate-limits}

自分の Portal の等級に付いている RPM / TPM の上限が、中継サーバー全体に
かかります。中継サーバーは呼び出しを分散させたり束ねたりしません。契約の
枠をそのまま持つ、bearer ひとつぶんです。使用量は
[portal.nousresearch.com](https://portal.nousresearch.com) で見られます。

## 仕組み {#architecture}

中継サーバーは、あえてごく小さく作ってあります。リクエストごとに次を行います。

1. アプリから `POST /v1/chat/completions` を受け取る
2. アダプターがいま持っている認証情報を調べる（期限が近ければ更新する）
3. リクエストの本文をそのまま、`Authorization: Bearer <minted-key>` を付けて転送する
4. 応答を手を加えずに流し返す（SSE もそのまま）

変換はしません。リクエストの本文を記録することもしません。エージェントの
処理も回りません。中継サーバーは、認証情報を付けるだけの通り道です。

## この先: 他の OAuth プロバイダー {#future-more-oauth-providers}

アダプターの仕組みは差し替えられるようになっています。新しいプロバイダー
（HuggingFace、GitHub Copilot のチャットのエンドポイント、OAuth 経由の
Anthropic など）を足すには、`hermes_cli/proxy/adapters/<provider>.py` に
`UpstreamAdapter` を実装して、`adapters/__init__.py` に登録します。
プロトコルの段階で OpenAI 互換でないプロバイダー（たとえば Anthropic の
Messages API）は変換の層が要るので、いまの形では対象外です。
