---
title: "モデルカタログ"
description: "OpenRouter と Nous Portal のモデル選択リストを組み立てる、遠隔に置かれた一覧ファイルです。"
upstream_path: reference/model-catalog.md
upstream_blob: b26a1399f0c8688c82c5464a72be1efdbfb80b4c
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/model-catalog
---

# モデルカタログ {#model-catalog}

Hermes は **OpenRouter** と **Nous Portal** 向けに選び抜いたモデルの一覧を、ドキュメントのサイトと同じ場所に置かれた JSON から取ってきます。こうしておくと、保守する側は `hermes-agent` を新しく出さなくても、選択画面に並ぶモデルを更新できます。

その JSON に届かないとき(オフライン、通信が遮断されている、置き場所の障害など)、Hermes は何も言わずに、CLI に同梱されているリポジトリ内の控えに戻ります。この一覧が原因で選択画面が壊れることはありません。最悪でも、いま入れている版に同梱されていた一覧が見えるだけです。

## 配信されている一覧の URL {#live-manifest-url}

```
https://hermes-agent.nousresearch.com/docs/api/model-catalog.json
```

`main` にマージされるたび、これまでどおり `deploy-site.yml` の GitHub Pages の仕組みで公開されます。おおもとはリポジトリの `website/static/api/model-catalog.json` にあります。

## スキーマ {#schema}

```json
{
  "version": 1,
  "updated_at": "2026-04-25T22:00:00Z",
  "metadata": {},
  "providers": {
    "openrouter": {
      "metadata": {},
      "models": [
        {"id": "z-ai/glm-5.2",         "description": "default", "default": true},
        {"id": "moonshotai/kimi-k3",   "description": "recommended", "metadata": {}},
        {"id": "openai/gpt-5.4",       "description": ""}
      ]
    },
    "nous": {
      "metadata": {},
      "models": [
        {"id": "z-ai/glm-5.2", "default": true},
        {"id": "anthropic/claude-opus-4.7"},
        {"id": "moonshotai/kimi-k3"}
      ]
    }
  }
}
```

各項目の補足です。

- **`version`** — スキーマの版を表す整数です。将来スキーマが変わるとこの数字が上がります。Hermes は自分が解釈できない版の一覧を受け付けず、埋め込みの控えに戻ります。
- **`metadata`** — 一覧全体、プロバイダー、モデルのそれぞれの階層に置ける自由な辞書です。どんなキーでも書けます。Hermes は知らない項目を無視するので、スキーマの変更を待たずに注記(`"tier": "paid"`、`"tags": [...]` など)を足せます。
- **`description`** — OpenRouter だけで使います。選択画面のバッジの文字(`"recommended"`、`"free"`、`"default"`、または空)になります。Nous Portal では使いません。無料枠かどうかは、Portal の価格のエンドポイントからその場で判断します。
- **`default`** — プロバイダーごとに、`"default": true` を付けられるのはちょうど 1 つです。そのモデルが **黙って選ばれる既定** になります。つまり、利用者がモデルを一度も選んでいないとき(GUI の初期設定の確認カード、`provider` は設定したが `model` は書いていないとき、`model.default` が空のとき)に Hermes が落ち着く先です。実行時はディスクの控えだけを見るので(`get_default_model_from_cache`)、頻繁に通る解決の経路が通信をすることはありません。控えが一つもないときは、リポジトリ内の定数 `PREFERRED_SILENT_DEFAULT_MODEL` に戻ります。この定数は、印の付いた項目と一致していなければなりません。こうしておくと、保守する側は新しい版を出さずに、黙って選ばれる既定を入れ替えられます。ここには、値段のいちばん高い旗艦ではなく、費用が安くて力のあるモデルを意図して置いています。
- **価格と文脈の長さ** は、この一覧には入っていません。取得のたびに、各プロバイダーの実際の API(`/v1/models` のエンドポイントや models.dev)から得ます。

## 取得のときの動き {#fetch-behavior}

| どんなとき | 何が起きるか |
|---|---|
| `/model` または `hermes model` | ディスクの控えが古ければ取りにいき、そうでなければ控えを使います |
| ゲートウェイが動いているとき | `ttl_minutes`(既定 20)ごとに裏側で更新するので、選択画面が公開済みの一覧より遅れるのは最大でも1回分の間隔です |
| ディスクの控えが新しい(TTL 内) | 通信しません |
| 通信に失敗し、控えがある | 何も言わずに控えへ戻り、ログを 1 行だけ残します |
| 通信に失敗し、控えもない | 何も言わずにリポジトリ内の控えへ戻ります |
| 一覧がスキーマの検査に通らない | 届かなかったときと同じ扱いになります |

控えの置き場所は `~/.hermes/cache/model_catalog.json` です。

## 設定 {#config}

```yaml
model_catalog:
  enabled: true
  url: https://hermes-agent.nousresearch.com/docs/api/model-catalog.json
  ttl_minutes: 20
  providers: {}
```

`enabled: false` にすると、遠隔からの取得をまったくやめて、常にリポジトリ内の控えを使います(ゲートウェイの裏側での更新も止まります)。`ttl_minutes` は、控えの有効期限とゲートウェイの更新の間隔の両方を決めます。従来の `ttl_hours` キーも、明示的に設定すれば引き続き使えます。

### プロバイダーごとに URL を差し替える {#per-provider-override-urls}

第三者も、同じスキーマで自分の選定リストを置けます。プロバイダーごとに、独自の URL を指すよう書きます。

```yaml
model_catalog:
  providers:
    openrouter:
      url: https://example.com/my-openrouter-curation.json
```

差し替える側の一覧は、自分が扱いたいプロバイダーの部分だけ書けば十分です。他のプロバイダーは、これまでどおりおおもとの URL から解決されます。

### 選択画面からプロバイダーを隠す {#hiding-providers-from-the-picker}

`excluded_providers` を使うと、正しい資格情報があっても、特定のプロバイダーを `/model` の選択画面から隠せます。ふだんは使わない古いプロバイダーや試験用のプロバイダーの資格情報が残っているとき(`auth.json` に古い Copilot や OpenRouter のトークンが残っている、`gh` CLI 経由で見つかってしまう、など)に便利です。

```yaml
model_catalog:
  excluded_providers:
    - copilot
    - openrouter
    - openai
```

この除外は、プロバイダーが名乗りうるすべてのキー — Hermes の id と models.dev の id(組み込みで対応付けられたプロバイダー)、オーバーレイの pid と解決後の Hermes の slug(オーバーレイのプロバイダー)、正式な slug(正式なプロバイダー) — に対して、大文字と小文字を区別せずに照合されます。ですので `copilot` と 1 行書けば、どの区分から出てきたものであってもそのプロバイダーが隠れます。`/model` の選択画面はすべてこれに従います。ゲートウェイの対話形式・文字形式の選択画面、TUI の選択画面、対話形式の `hermes model` の選択画面です。空のリストを書いた場合(またはキー自体を書かない場合)は、何も起きません。

## 一覧を更新する {#updating-the-manifest}

保守する側の手順です。

```bash
# Re-generate from the in-repo hardcoded lists (keeps manifest in sync after
# editing OPENROUTER_MODELS or _PROVIDER_MODELS["nous"] in hermes_cli/models.py).
python scripts/build_model_catalog.py
```

そのあと、生まれた `website/static/api/model-catalog.json` の変更を `main` へ PR に出します。マージするとドキュメントのサイトが自動で配信され、数分のうちに新しい一覧が反映されます。

リポジトリ内の控えに入れるほどではない細かな metadata の変更なら、JSON を直に手で書き換えてもかまいません。生成スクリプトは便利道具であって、唯一のよりどころではありません。
