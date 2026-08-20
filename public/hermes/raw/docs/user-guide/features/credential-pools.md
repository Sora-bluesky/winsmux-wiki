---
title: "認証情報プール"
description: "プロバイダーごとに複数の API キーや OAuth トークンをまとめ、自動で切り替えてレート制限から復帰させます。"
upstream_path: user-guide/features/credential-pools.md
upstream_blob: f66f2a624a9165b31f084da837c3b2ba5577d023
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/credential-pools
---

# 認証情報プール {#credential-pools}

認証情報プールを使うと、同じプロバイダーに対して API キーや OAuth トークンを複数登録できます。あるキーがレート制限や請求の上限に当たったとき、Hermes が自動的に次の使えるキーへ切り替えるので、プロバイダーを変えずにセッションを続けられます。

これは [フォールバックプロバイダー](/hermes/docs/user-guide/features/fallback-providers/) とは別ものです。あちらは *別の* プロバイダーへ丸ごと切り替えます。認証情報プールは同じプロバイダーの中での切り替え、フォールバックプロバイダーはプロバイダーをまたぐ切り替えです。まず試されるのはプールのほうで、プールのキーを全部使い切って *はじめて* フォールバックプロバイダーが働きます。

:::warning キーを切り替えるとプロンプトキャッシュが消えます
プロバイダー側のプロンプトキャッシュ（Anthropic、OpenAI、OpenRouter）は、リクエストを送ったアカウントや API キーに紐づいています。セッションの途中でプールが別のキーへ切り替わると、新しいキーにはその会話のキャッシュがないため、次のリクエストは履歴全体を割引なしの入力価格で読み直します。あとで元のキーへ戻るときも、そのキーのキャッシュの有効期限がまだ生きていない限り、また全部の読み直しです。セッションを止めないための切り替えなのでそれ自体が目的にかなっていますが、長い会話では切り替えのたびに文脈を丸ごと定価で通すことになります。
:::

:::tip
認証情報プールが主に役立つのは、API キーを使うプロバイダー（OpenRouter、Anthropic）です。[Nous Portal](/hermes/docs/integrations/nous-portal/) は OAuth ひとつで 300 以上のモデルをカバーするので、Portal を使っている人はたいていプールを用意する必要がありません。
:::

## 仕組み {#how-it-works}

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

## 手早く使い始める {#quick-start}

`.env` に API キーをすでに設定してある場合、Hermes はそれを自動的に見つけてキー 1 本のプールとして扱います。プールの利点を活かすには、キーを増やします。

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

`←` が付いているのが、いま選ばれている認証情報です。

## 対話形式で管理する {#interactive-management}

サブコマンドを付けずに `hermes auth` を実行すると、対話形式のウィザードが開きます。

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

API キーと OAuth の両方に対応しているプロバイダー（Anthropic、Nous、Codex）では、追加のときにどちらを使うか聞かれます。

```
anthropic supports both API keys and OAuth login.
  1. API key (paste a key from the provider dashboard)
  2. OAuth login (authenticate via browser)
Type [1/2]:
```

## CLI のコマンド {#cli-commands}

| コマンド | 説明 |
|---------|-------------|
| `hermes auth` | 対話形式でプールを管理するウィザードを開きます |
| `hermes auth list` | すべてのプールと認証情報を表示します |
| `hermes auth list <provider>` | 特定のプロバイダーのプールを表示します |
| `hermes auth add <provider>` | 認証情報を追加します（種類とキーを聞かれます） |
| `hermes auth add <provider> --type api-key --api-key <key>` | 対話なしで API キーを追加します |
| `hermes auth add <provider> --type oauth` | ブラウザーでのログインを通じて OAuth の認証情報を追加します |
| `hermes auth remove <provider> <index>` | 1 から数えた番号で認証情報を削除します |
| `hermes auth reset <provider>` | 待機時間と使い切り状態をすべて解除します |

## 切り替えの方針 {#rotation-strategies}

`hermes auth` の「Set rotation strategy」から、または `config.yaml` で設定します。

```yaml
credential_pool_strategies:
  openrouter: round_robin
  anthropic: least_used
```

| 方針 | 動き |
|----------|----------|
| `fill_first`（既定値） | 最初の使えるキーを使い切るまで使い、それから次へ移ります |
| `round_robin` | キーを均等に一巡させ、選ぶたびに次へずらします |
| `least_used` | つねにリクエスト回数がいちばん少ないキーを選びます |
| `random` | 使えるキーの中からランダムに選びます |

## エラーからの復帰 {#error-recovery}

プールはエラーの種類ごとに動きを変えます。

| エラー | 動き | 待機時間 |
|-------|----------|----------|
| **429 レート制限** | 一時的なものとみなして同じキーで 1 回だけ再試行します。2 回続けて 429 なら次のキーへ切り替えます | 1 時間 |
| **402 請求・上限** | すぐに次のキーへ切り替えます | 1 時間 |
| **401 認証切れ** | まず OAuth トークンの更新を試します。更新に失敗したときだけ切り替えます | 5 分 |
| **すべてのキーを使い切った** | 設定してあれば `fallback_model` へ降ります | — |

プロバイダーが `reset_at` のタイムスタンプを返してきた場合は、上の既定の待機時間より優先されます。

`has_retried_429` のフラグは API 呼び出しが成功するたびにリセットされるので、一時的な 429 が 1 回起きただけでは切り替えは起きません。

## 独自エンドポイントのプール {#custom-endpoint-pools}

OpenAI 互換の独自エンドポイント（Together.ai、RunPod、ローカルのサーバーなど）にも、それぞれのプールがあります。プールの鍵になるのは、config.yaml の `providers:` の辞書（または自動で移行される古い形式の `custom_providers` のリスト）に書かれたエンドポイント名です。

`hermes model` から独自のエンドポイントを設定すると、「Together.ai」や「Local (localhost:8080)」のような名前が自動で付きます。この名前がそのままプールの鍵になります。

```bash
# After setting up a custom endpoint via hermes model:
hermes auth list
# Shows:
#   Together.ai (1 credential):
#     #1  config key    api_key config:Together.ai ←

# Add a second key for the same endpoint:
hermes auth add Together.ai --api-key sk-together-second-key
```

独自エンドポイントのプールは、`auth.json` の `credential_pool` の下に `custom:` を付けた鍵で保存されます。

```json
{
  "credential_pool": {
    "openrouter": [...],
    "custom:together.ai": [...]
  }
}
```

## 自動的な読み取り {#auto-discovery}

Hermes は複数の置き場所から認証情報を自動的に見つけ、起動時にプールへ入れます。

| 取得元 | 例 | 自動で入るか |
|--------|---------|-------------|
| 環境変数 | `OPENROUTER_API_KEY`、`ANTHROPIC_API_KEY` | はい |
| OAuth トークン（auth.json） | Codex のデバイスコード、Nous のデバイスコード | はい |
| Claude Code の認証情報 | `~/.claude/.credentials.json` | はい（Anthropic として） |
| Hermes の PKCE OAuth | `~/.hermes/auth.json` | はい（Anthropic として） |
| 独自エンドポイントの設定 | config.yaml の `model.api_key` | はい（独自エンドポイントとして） |
| 手で追加したもの | `hermes auth add` で追加 | auth.json に保存されます |

自動で入った項目はプールを読み込むたびに更新されます。環境変数を消せば、その項目もプールから自動的に取り除かれます。`hermes auth add` で手で追加した項目が勝手に消されることはありません。

実行時に借りてくる秘密の情報（たとえば環境変数、Bitwarden / Vault / キーリング / systemd への参照、独自の設定値など）は、`auth.json` の境界では参照だけを保持します。Hermes はその実行のあいだメモリー上で解決した値を使えますが、保存するのは取得元の参照、ラベル、状態、リクエスト回数、そして元に戻せない指紋といったメタ情報だけです。手で追加した項目と、Hermes 自身が持つ OAuth・デバイスコードの状態は、更新に必要なトークンをそのまま保持します。

## 委任とサブエージェントでの共有 {#delegation-subagent-sharing}

エージェントが `delegate_task` でサブエージェントを立ち上げるとき、親の認証情報プールは自動的に子へ共有されます。

- **同じプロバイダーのとき** — 子は親のプールをまるごと受け取り、レート制限のときにキーを切り替えられます
- **別のプロバイダーのとき** — 子はそのプロバイダー自身のプールを読み込みます（設定してあれば）
- **プールが無いとき** — 子は引き継いだ API キー 1 本で動きます

つまりサブエージェントも、追加の設定なしに親と同じだけレート制限に強くなります。タスクごとに認証情報を貸し出す仕組みがあるので、子どうしが同時にキーを切り替えてもぶつかりません。

## スレッド安全性 {#thread-safety}

認証情報プールは、状態を変える処理（`select()`、`mark_exhausted_and_rotate()`、`try_refresh_current()`、`mark_used()`）のすべてでスレッドのロックを使います。ゲートウェイが複数のチャットセッションを同時に扱うときも、安全に共有できます。

## 構成 {#architecture}

データの流れ全体を図で見るには、リポジトリの [`docs/credential-pool-flow.excalidraw`](https://excalidraw.com/#json=2Ycqhqpi6f12E_3ITyiwh,c7u9jSt5BwrmiVzHGbm87g) を参照してください。

認証情報プールは、プロバイダーを解決する層に組み込まれています。

1. **`agent/credential_pool.py`** — プールの管理。保存、選択、切り替え、待機時間
2. **`hermes_cli/auth_commands.py`** — CLI のコマンドと対話形式のウィザード
3. **`hermes_cli/runtime_provider.py`** — プールを踏まえた認証情報の解決
4. **`run_agent.py`** — エラーからの復帰。429 / 402 / 401 → プールの切り替え → フォールバック

## 保存場所 {#storage}

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

上の OpenRouter の項目は外部から借りてきたものなので、生のキーは `auth.json` に保存されていません。手で追加した Anthropic の項目は、意図して Hermes の認証情報の置き場に入れたものなので、トークンをそのまま保存できます。

切り替えの方針は `auth.json` ではなく `config.yaml` に保存されます。

```yaml
credential_pool_strategies:
  openrouter: round_robin
  anthropic: least_used
```
