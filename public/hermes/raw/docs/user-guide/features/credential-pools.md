---
title: "認証情報プール"
description: "プロバイダごとに複数の API キーや OAuth トークンをまとめておき、自動で切り替えてレート制限から復帰します。"
upstream_path: user-guide/features/credential-pools.md
upstream_blob: 05c0e988b6195cd5887f4d9f79ee48661f9e009b
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/credential-pools
---

# 認証情報プール {#credential-pools}

認証情報プールを使うと、同じプロバイダに対して複数の API キーや OAuth トークンを登録しておけます。あるキーがレート制限や課金の上限に当たると、Hermes は自動で次の健全なキーへ切り替えます。プロバイダを乗り換えることなく、会話を続けられます。

これは[フォールバックプロバイダ](/hermes/docs/user-guide/features/fallback-providers/)とは別のしくみです。あちらは*まったく別の*プロバイダへ切り替えます。認証情報プールは同じプロバイダの中での切り替え、フォールバックプロバイダはプロバイダをまたぐ切り替えです。先に試されるのはプールのほうで、プールのキーを使い切って*はじめて*フォールバックプロバイダが動きます。

:::warning キーを切り替えるとプロンプトキャッシュは消える
プロバイダ側のプロンプトキャッシュ（Anthropic、OpenAI、OpenRouter）は、そのリクエストを送ったアカウントや API キーに紐づいています。セッションの途中でプールが別のキーへ切り替わると、新しいキーにはその会話のキャッシュがありません。次のリクエストは履歴全体を割引なしの入力価格で読み直します。あとで元のキーに戻る場合も、そのキャッシュの有効期限が生きていない限りもう一度読み直しになります。切り替えによって会話が止まらずに済むこと自体が目的ですが、長い会話では切り替えのたびに文脈を丸ごと定価で 1 往復ぶん読むコストがかかります。
:::

:::tip
認証情報プールは主に API キー方式のプロバイダ（OpenRouter、Anthropic）向けのしくみです。[Nous Portal](/hermes/docs/integrations/nous-portal/) は OAuth ひとつで 300 以上のモデルをまかなうので、Portal を使っているならプールが要る場面はほとんどありません。
:::

## しくみ {#how-it-works}

```
Your request
  → Pick key from pool (round_robin / least_used / fill_first / random)
  → Send to provider
  → 429 rate limit?
      → Plan/usage limit reached (e.g. ChatGPT/Codex "usage limit reached")?
          → Rotate to next pool key immediately (no retry — the cap won't clear on retry)
      → Generic / transient 429?
          → Retry same key once (transient blip)
          → Second 429 → rotate to next pool key
      → All keys exhausted → fallback_model (different provider)
  → 402 billing error?
      → Immediately rotate to next pool key (1h cooldown)
  → 401 auth expired?
      → Try refreshing the token (OAuth)
      → Refresh failed → rotate to next pool key
  → Success → continue normally
```

## すぐに使い始める {#quick-start}

`.env` にすでに API キーを書いてある場合、Hermes はそれを自動で見つけてキー 1 本のプールとして扱います。プールの利点を活かすには、キーを増やしてください。

```bash
# Add a second OpenRouter key
hermes auth add openrouter --api-key sk-or-v1-your-second-key

# Add a second Anthropic key
hermes auth add anthropic --type api-key --api-key sk-ant-api03-your-second-key

# Add an Anthropic OAuth credential (requires Claude Max plan + extra usage credits)
hermes auth add anthropic --type oauth
# Opens browser for OAuth login
```

プールの中身を確認します。

```bash
hermes auth list
```

出力はこうなります。
```
openrouter (2 credentials):
  #1  OPENROUTER_API_KEY   api_key env:OPENROUTER_API_KEY ←
  #2  backup-key           api_key manual

anthropic (3 credentials):
  #1  hermes_pkce          oauth   hermes_pkce ←
  #2  claude_code          oauth   claude_code
  #3  ANTHROPIC_API_KEY    api_key env:ANTHROPIC_API_KEY
```

`←` が現在選ばれている認証情報を指しています。

## 対話式の管理 {#interactive-management}

サブコマンドなしで `hermes auth` を実行すると、対話式のウィザードが開きます。

```bash
hermes auth
```

プールの状態がひととおり表示され、次のメニューが出ます。

```
What would you like to do?
  1. Add a credential
  2. Remove a credential
  3. Reset cooldowns for a provider
  4. Set rotation strategy for a provider
  5. Exit
```

API キーと OAuth の両方に対応しているプロバイダ（Anthropic、Nous、Codex）では、追加のときにどちらかを尋ねられます。

```
anthropic supports both API keys and OAuth login.
  1. API key (paste a key from the provider dashboard)
  2. OAuth login (authenticate via browser)
Type [1/2]:
```

## CLI のコマンド {#cli-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes auth` | 対話式のプール管理ウィザードを開きます |
| `hermes auth list` | すべてのプールと認証情報を表示します |
| `hermes auth list <provider>` | 指定したプロバイダのプールを表示します |
| `hermes auth add <provider>` | 認証情報を追加します（種類とキーを尋ねられます） |
| `hermes auth add <provider> --type api-key --api-key <key>` | 対話なしで API キーを追加します |
| `hermes auth add <provider> --type oauth` | ブラウザでのログインを通して OAuth の認証情報を追加します |
| `hermes auth remove <provider> <index>` | 1 から数えた番号で認証情報を削除します |
| `hermes auth reset <provider>` | 待機時間と使い切り扱いをすべて解除します |

## 切り替えの方針 {#rotation-strategies}

`hermes auth` の「Set rotation strategy」から、または `config.yaml` で設定します。

```yaml
credential_pool_strategies:
  openrouter: round_robin
  anthropic: least_used
```

| 方針 | 動き |
|----------|----------|
| `fill_first`（既定） | 最初の健全なキーを使い切るまで使い、それから次へ移ります |
| `round_robin` | 選ぶたびに次のキーへ移り、均等に回します |
| `least_used` | 常にリクエスト数が最も少ないキーを選びます |
| `random` | 健全なキーの中からランダムに選びます |

## エラーからの復帰 {#error-recovery}

プールはエラーの種類ごとに動きを変えます。

| エラー | 動き | 待機時間 |
|-------|----------|----------|
| **429 レート制限** | 同じキーで 1 回だけやり直します（一時的なものとみなす）。続けて 2 回目の 429 が出たら次のキーへ切り替えます | 1 時間 |
| **402 課金・上限** | ただちに次のキーへ切り替えます | 1 時間 |
| **401 認証切れ** | まず OAuth トークンの更新を試みます。更新に失敗したときだけ切り替えます | 5 分 |
| **キーをすべて使い切った** | 設定してあれば `fallback_model` へ回します | — |

プロバイダから `reset_at` の時刻が返ってきた場合は、上の既定の待機時間より優先されます。

`has_retried_429` のフラグは API 呼び出しが成功するたびに戻るので、一時的な 429 が 1 回出ただけで切り替えが起きることはありません。

## 独自エンドポイントのプール {#custom-endpoint-pools}

OpenAI 互換の独自エンドポイント（Together.ai、RunPod、手元のサーバーなど）も、それぞれ独自のプールを持ちます。キーになるのは config.yaml の `providers:` 辞書に書いたエンドポイント名です（旧来の `custom_providers` リストも自動で移行されます）。

`hermes model` から独自エンドポイントを設定すると、「Together.ai」「Local (localhost:8080)」のような名前が自動で作られます。この名前がそのままプールのキーになります。

```bash
# After setting up a custom endpoint via hermes model:
hermes auth list
# Shows:
#   Together.ai (1 credential):
#     #1  config key    api_key config:Together.ai ←

# Add a second key for the same endpoint:
hermes auth add Together.ai --api-key sk-together-second-key
```

独自エンドポイントのプールは `auth.json` の `credential_pool` の下に、`custom:` を付けた形で保存されます。

```json
{
  "credential_pool": {
    "openrouter": [...],
    "custom:together.ai": [...]
  }
}
```

## 自動の読み取り {#auto-discovery}

Hermes は起動時にいくつもの場所から認証情報を見つけ出し、プールの初期値にします。

| 取得元 | 例 | 自動で入る？ |
|--------|---------|-------------|
| 環境変数 | `OPENROUTER_API_KEY`、`ANTHROPIC_API_KEY` | はい |
| OAuth トークン（auth.json） | Codex のデバイスコード、Nous のデバイスコード | はい |
| Claude Code の認証情報 | `~/.claude/.credentials.json` | はい（Anthropic として） |
| Hermes の PKCE OAuth | `~/.hermes/auth.json` | はい（Anthropic として） |
| 独自エンドポイントの設定 | config.yaml の `model.api_key` | はい（独自エンドポイントとして） |
| 手で追加したもの | `hermes auth add` で追加 | auth.json に保存されます |

自動で入った項目はプールを読み込むたびに更新されます。環境変数を消せば、対応する項目も自動で取り除かれます。手で追加した項目（`hermes auth add` によるもの）が自動で消えることはありません。

外部から借りてくる実行時の秘密情報（環境変数、Bitwarden / Vault / keyring / systemd への参照、独自設定の値など）は、`auth.json` の側では参照だけを持ちます。Hermes はその実行の間だけ解決した値をメモリ上で使い、ディスクに残すのは取得元の参照、ラベル、状態、リクエストの回数、元に戻せない指紋といった情報だけです。手で追加した項目と、Hermes 自身が持つ OAuth・デバイスコードの状態については、更新に必要なトークンをそのまま保持します。

## 委譲とサブエージェントでの共有 {#delegation-subagent-sharing}

エージェントが `delegate_task` でサブエージェントを起動すると、親の認証情報プールが子へ自動的に共有されます。

- **同じプロバイダのとき** — 子は親のプールをそのまま受け取り、レート制限に当たったときにキーを切り替えられます
- **別のプロバイダのとき** — 子はそのプロバイダ自身のプールを読み込みます（設定してあれば）
- **プールがないとき** — 子は受け継いだ 1 本の API キーだけで動きます

つまりサブエージェントも、追加の設定なしに親と同じだけレート制限に強くなります。タスクごとに認証情報を貸し出すので、子どうしが同時にキーを切り替えてもぶつかりません。

## スレッド安全性 {#thread-safety}

認証情報プールは、状態を変えるすべての操作（`select()`、`mark_exhausted_and_rotate()`、`try_refresh_current()`、`mark_used()`）でスレッドのロックを使います。これにより、ゲートウェイが複数のチャットセッションを同時にさばいていても安全に扱えます。

プロセスをまたぐ場合（多数のサブエージェント、ゲートウェイと CLI の併用、定時実行など）は、`auth.json` のファイルロックによって OAuth の更新が順番に処理されます。共有された OAuth の許可が多数のプロセスの下で同時に期限切れになっても、更新を行うのはちょうど 1 つのプロセスだけです。残りはディスク上のトークンが失敗したものと違っていることに気づき、1 回しか使えないリフレッシュトークンを重ねて使うのではなく、新しいほうを採用します。ロックの取り合いに負けたプロセスは自分の項目を健全なまま保ってやり直します。ロックの競合が認証情報の失敗として記録されることはありません。

## 構成 {#architecture}

データの流れ全体の図は、リポジトリの [`docs/credential-pool-flow.excalidraw`](https://excalidraw.com/#json=2Ycqhqpi6f12E_3ITyiwh,c7u9jSt5BwrmiVzHGbm87g) を参照してください。

認証情報プールは、プロバイダを解決する層に組み込まれています。

1. **`agent/credential_pool.py`** — プールの管理。保存、選択、切り替え、待機時間
2. **`hermes_cli/auth_commands.py`** — CLI のコマンドと対話式ウィザード
3. **`hermes_cli/runtime_provider.py`** — プールを踏まえた認証情報の解決
4. **`run_agent.py`** — エラーからの復帰。429 / 402 / 401 → プール内での切り替え → フォールバック

## 保存先 {#storage}

プールの状態は `~/.hermes/auth.json` の `credential_pool` キーの下に保存されます。

```json
{
  "version": 1,
  "credential_pool": {
    "openrouter": [
      {
        "id": "abc123",
        "label": "OPENROUTER_API_KEY",
        "auth_type": "api_key",
        "priority": 0,
        "source": "env:OPENROUTER_API_KEY",
        "secret_source": "bitwarden",
        "secret_fingerprint": "sha256:12ab34cd56ef7890",
        "last_status": "ok",
        "request_count": 142
      }
    ],
    "anthropic": [
      {
        "id": "manual1",
        "label": "personal-api-key",
        "auth_type": "api_key",
        "priority": 0,
        "source": "manual",
        "access_token": "sk-ant-api03-..."
      }
    ]
  }
}
```

上の OpenRouter の項目は外部から借りてきたものなので、キーそのものは `auth.json` に入っていません。手で追加したほうの Anthropic の項目は Hermes の保管場所へ意図して登録したものなので、トークンをそのまま保存できます。

方針の設定は `auth.json` ではなく `config.yaml` に保存されます。

```yaml
credential_pool_strategies:
  openrouter: round_robin
  anthropic: least_used
```
