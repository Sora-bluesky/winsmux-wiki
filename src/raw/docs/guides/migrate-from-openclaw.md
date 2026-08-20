---
title: "OpenClaw から移ってくる"
description: "OpenClaw / Clawdbot の環境を Hermes Agent へ移すための案内です。何が移るのか、設定がどう対応するのか、移したあとに何を確かめるのかをまとめます。"
upstream_path: guides/migrate-from-openclaw.md
upstream_blob: 9680717dc3bdea33f8fe26f7ebdfc9ee653a02e0
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/migrate-from-openclaw
---

# OpenClaw から移ってくる {#migrate-from-openclaw}

`hermes claw migrate` は、OpenClaw（あるいは古い Clawdbot / Moldbot）の環境を Hermes に取り込みます。この案内では、何が移るのか、設定のキーがどう対応するのか、移したあとに何を確かめるのかを、ひとつずつ見ていきます。

:::note
移ってくる先が **Claude Code** や **OpenAI Codex CLI** の場合は、[`hermes import-agent`](/hermes/docs/user-guide/import-from-other-agents/) を使ってください。
:::

:::tip
OpenClaw で複数のプロバイダーを使い分けていたなら、`hermes setup --portal` でひとつの OAuth にまとめられます。ログイン 1 回で 300 を超えるモデルと Tool Gateway が使えます。[Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
:::

## 手早く始める {#quick-start}

```bash
# Preview then migrate (always shows a preview first, then asks to confirm)
hermes claw migrate

# Preview only, no changes
hermes claw migrate --dry-run

# Full migration including API keys, skip confirmation
hermes claw migrate --preset full --migrate-secrets --yes
```

移行は必ず、何を取り込むかをひととおり見せてから、実際の変更に入ります。一覧を確かめてから、進めるかどうかを答えてください。

読み取り元は既定で `~/.openclaw/` です。古い `~/.clawdbot/` や `~/.moltbot/` のディレクトリは自動で見つけます。古い設定ファイル名（`clawdbot.json`、`moltbot.json`）も同様です。

## オプション {#options}

| オプション | 説明 |
|--------|-------------|
| `--dry-run` | 下見だけ。何が移るのかを見せた時点で止まります。 |
| `--preset <name>` | `full`（対応しているすべての設定）か `user-data`（インフラ寄りの設定を除く）。どちらのプリセットも、そのままでは秘密の値を取り込みません。`--migrate-secrets` を明示的に付けてください。 |
| `--overwrite` | ぶつかったときに、既存の Hermes 側のファイルを上書きします（既定では、計画にぶつかりがあると適用を断ります）。 |
| `--migrate-secrets` | API キーも含めます。`--preset full` でも必要です。黙って秘密の値を取り込むプリセットはありません。 |
| `--no-backup` | 移行の前に取る `~/.hermes/` の zip の控えを省きます（既定では、適用の前に復元用の書庫を 1 つ `~/.hermes/backups/pre-migration-*.zip` に書き出します。`hermes import` で戻せます）。 |
| `--source <path>` | OpenClaw のディレクトリを自分で指定します。 |
| `--workspace-target <path>` | `AGENTS.md` を置く場所です。 |
| `--skill-conflict <mode>` | `skip`（既定）、`overwrite`、`rename` のいずれか。 |
| `--yes` | 下見のあとの確認を省きます。 |

## 何が移るのか {#what-gets-migrated}

### 人格、記憶、指示 {#persona-memory-and-instructions}

| 対象 | OpenClaw 側 | Hermes 側 | 補足 |
|------|----------------|-------------------|-------|
| 人格 | `workspace/SOUL.md` | `~/.hermes/SOUL.md` | そのままコピーします |
| ワークスペースの指示 | `workspace/AGENTS.md` | `--workspace-target` の中の `AGENTS.md` | `--workspace-target` の指定が要ります |
| 長期の記憶 | `workspace/MEMORY.md` | `~/.hermes/memories/MEMORY.md` | 項目ごとに読み取り、既存のものと突き合わせて重複を除きます。区切りには `§` を使います。 |
| ユーザーのプロフィール | `workspace/USER.md` | `~/.hermes/memories/USER.md` | 記憶と同じ突き合わせの仕組みです。 |
| 日ごとの記憶ファイル | `workspace/memory/*.md` | `~/.hermes/memories/MEMORY.md` | 日ごとのファイルは、すべて本体の記憶にまとめられます。 |

ワークスペースのファイルは、`workspace.default/` と `workspace-main/` も控えの置き場として探します（OpenClaw は最近のバージョンで `workspace/` を `workspace-main/` に改名し、複数エージェントの構成では `workspace-{agentId}` を使います）。

### スキル（4 か所） {#skills-4-sources}

| 取り込み元 | OpenClaw の場所 | Hermes 側 |
|--------|------------------|-------------------|
| ワークスペースのスキル | `workspace/skills/` | `~/.hermes/skills/openclaw-imports/` |
| 管理下 / 共有のスキル | `~/.openclaw/skills/` | `~/.hermes/skills/openclaw-imports/` |
| プロジェクトをまたぐ個人のスキル | `~/.agents/skills/` | `~/.hermes/skills/openclaw-imports/` |
| プロジェクト単位の共有スキル | `workspace/.agents/skills/` | `~/.hermes/skills/openclaw-imports/` |

スキルがぶつかったときの扱いは `--skill-conflict` で決まります。`skip` は Hermes 側のスキルをそのまま残し、`overwrite` は置き換え、`rename` は `-imported` を付けた写しを作ります。

### モデルとプロバイダーの設定 {#model-and-provider-configuration}

| 対象 | OpenClaw の設定パス | Hermes 側 | 補足 |
|------|---------------------|-------------------|-------|
| 既定のモデル | `agents.defaults.model` | `config.yaml` → `model` | 文字列でも `{primary, fallbacks}` の形でも構いません |
| 自作のプロバイダー | `models.providers.*` | `config.yaml` → `custom_providers`（次の `hermes update` の設定移行で、正式な `providers:` の辞書へ自動で移されます） | `baseUrl`、`apiType`/`api` を対応づけます。短い書き方（"openai"、"anthropic"）とハイフン付きの書き方（"openai-completions"、"anthropic-messages"、"google-generative-ai"）のどちらも扱えます |
| プロバイダーの API キー | `models.providers.*.apiKey` | `~/.hermes/.env` | `--migrate-secrets` が要ります。下の [API キーの探し方](#api-key-resolution) をご覧ください。 |

### エージェントの振る舞い {#agent-behavior}

| 対象 | OpenClaw の設定パス | Hermes の設定パス | 対応 |
|------|---------------------|-------------------|---------|
| 最大の往復数 | `agents.defaults.timeoutSeconds` | `agent.max_turns` | `timeoutSeconds / 10`、上限は 200 |
| 詳しい表示 | `agents.defaults.verboseDefault` | `agent.verbose` | "off" / "on" / "full" |
| 考える深さ | `agents.defaults.thinkingDefault` | `agent.reasoning_effort` | "always"/"high"/"xhigh" → "high"、"auto"/"medium"/"adaptive" → "medium"、"off"/"low"/"none"/"minimal" → "low" |
| 圧縮 | `agents.defaults.compaction.mode` | `compression.enabled` | "off" → false、それ以外 → true |
| 圧縮に使うモデル | `agents.defaults.compaction.model` | `compression.summary_model` | 文字列をそのままコピー |
| 人らしい間 | `agents.defaults.humanDelay.mode` | `human_delay.mode` | "natural" / "custom" / "off" |
| 間の長さ | `agents.defaults.humanDelay.minMs` / `.maxMs` | `human_delay.min_ms` / `.max_ms` | そのままコピー |
| タイムゾーン | `agents.defaults.userTimezone` | `timezone` | 文字列をそのままコピー |
| コマンドの制限時間 | `tools.exec.timeoutSec` | `terminal.timeout` | そのままコピー（項目名は `timeout` ではなく `timeoutSec` です） |
| Docker の隔離 | `agents.defaults.sandbox.backend` | `terminal.backend` | "docker" → "docker" |
| Docker のイメージ | `agents.defaults.sandbox.docker.image` | `terminal.docker_image` | そのままコピー |

### セッションを区切る決まり {#session-reset-policies}

| OpenClaw の設定パス | Hermes の設定パス | 補足 |
|---------------------|-------------------|-------|
| `session.reset.mode` | `session_reset.mode` | "daily"、"idle"、またはその両方 |
| `session.reset.atHour` | `session_reset.at_hour` | 毎日の区切りの時刻（0〜23） |
| `session.reset.idleMinutes` | `session_reset.idle_minutes` | 何も起きなかった分数 |

補足: OpenClaw には `session.resetTriggers`（`["daily", "idle"]` のような素朴な文字列の配列）もあります。構造のある `session.reset` が無い場合、移行はこの `resetTriggers` から推し量ります。

### MCP のサーバー {#mcp-servers}

| OpenClaw の項目 | Hermes の項目 | 補足 |
|----------------|-------------|-------|
| `mcp.servers.*.command` | `mcp_servers.*.command` | 標準入出力での接続 |
| `mcp.servers.*.args` | `mcp_servers.*.args` | |
| `mcp.servers.*.env` | `mcp_servers.*.env` | |
| `mcp.servers.*.cwd` | `mcp_servers.*.cwd` | |
| `mcp.servers.*.url` | `mcp_servers.*.url` | HTTP/SSE での接続 |
| `mcp.servers.*.tools.include` | `mcp_servers.*.tools.include` | ツールの絞り込み |
| `mcp.servers.*.tools.exclude` | `mcp_servers.*.tools.exclude` | |

### TTS（読み上げ） {#tts-text-to-speech}

TTS の設定は、OpenClaw の**2 か所**から、この優先順で読み取ります。

1. `messages.tts.providers.{provider}.*`（正式な置き場）
2. いちばん外側の `talk.providers.{provider}.*`（控え）
3. 古い平たいキー `messages.tts.{provider}.*`（いちばん古い書き方）

| 対象 | Hermes 側 |
|------|-------------------|
| プロバイダー名 | `config.yaml` → `tts.provider` |
| ElevenLabs の声の ID | `config.yaml` → `tts.elevenlabs.voice_id` |
| ElevenLabs のモデルの ID | `config.yaml` → `tts.elevenlabs.model_id` |
| OpenAI のモデル | `config.yaml` → `tts.openai.model` |
| OpenAI の声 | `config.yaml` → `tts.openai.voice` |
| Edge TTS の声 | `config.yaml` → `tts.edge.voice`（OpenClaw は "edge" を "microsoft" に改名しました。どちらも受け付けます） |
| TTS の素材 | `~/.hermes/tts/`（ファイルのコピー） |

### メッセージのプラットフォーム {#messaging-platforms}

| プラットフォーム | OpenClaw の設定パス | Hermes の `.env` の変数 | 補足 |
|----------|---------------------|----------------------|-------|
| Telegram | `channels.telegram.botToken` または `.accounts.default.botToken` | `TELEGRAM_BOT_TOKEN` | トークンは文字列でも [SecretRef](#secretref-handling) でも構いません。平たい書き方と accounts の書き方の両方に対応します。 |
| Telegram | `credentials/telegram-default-allowFrom.json` | `TELEGRAM_ALLOWED_USERS` | `allowFrom[]` の配列をカンマでつないだもの |
| Discord | `channels.discord.token` または `.accounts.default.token` | `DISCORD_BOT_TOKEN` | |
| Discord | `channels.discord.allowFrom` または `.accounts.default.allowFrom` | `DISCORD_ALLOWED_USERS` | |
| Slack | `channels.slack.botToken` または `.accounts.default.botToken` | `SLACK_BOT_TOKEN` | |
| Slack | `channels.slack.appToken` または `.accounts.default.appToken` | `SLACK_APP_TOKEN` | |
| Slack | `channels.slack.allowFrom` または `.accounts.default.allowFrom` | `SLACK_ALLOWED_USERS` | |
| WhatsApp | `channels.whatsapp.allowFrom` または `.accounts.default.allowFrom` | `WHATSAPP_ALLOWED_USERS` | 認証は Baileys の QR での紐づけです。移行のあとに紐づけ直す必要があります |
| Signal | `channels.signal.account` または `.accounts.default.account` | `SIGNAL_ACCOUNT` | |
| Signal | `channels.signal.httpUrl` または `.accounts.default.httpUrl` | `SIGNAL_HTTP_URL` | |
| Signal | `channels.signal.allowFrom` または `.accounts.default.allowFrom` | `SIGNAL_ALLOWED_USERS` | |
| Matrix | `channels.matrix.accessToken` または `.accounts.default.accessToken` | `MATRIX_ACCESS_TOKEN` | `botToken` ではなく `accessToken` を使います |
| Mattermost | `channels.mattermost.botToken` または `.accounts.default.botToken` | `MATTERMOST_BOT_TOKEN` | |

### そのほかの設定 {#other-config}

| 対象 | OpenClaw のパス | Hermes のパス | 補足 |
|------|-------------|-------------|-------|
| 承認の仕方 | `approvals.exec.mode` | `config.yaml` → `approvals.mode` | "auto"→"off"、"always"→"manual"、"smart"→"smart" |
| 許可するコマンド | `exec-approvals.json` | `config.yaml` → `command_allowlist` | パターンをまとめて重複を除きます |
| ブラウザの CDP の URL | `browser.cdpUrl` | `config.yaml` → `browser.cdp_url` | |
| ブラウザの画面なし動作 | `browser.headless` | `config.yaml` → `browser.headless` | |
| Brave の検索キー | `tools.web.search.brave.apiKey` | `.env` → `BRAVE_API_KEY` | `--migrate-secrets` が要ります |
| ゲートウェイの認証トークン | `gateway.auth.token` | `.env` → `HERMES_GATEWAY_TOKEN` | `--migrate-secrets` が要ります |
| 作業ディレクトリ | `agents.defaults.workspace` | `config.yaml` → `terminal.cwd` | 古い移行では、互換のために `MESSAGING_CWD` を書き出すことがあります |

### 保管されるもの（Hermes に対応するものが無いため） {#archived-no-direct-hermes-equivalent}

次のものは、あとで自分で見られるように `~/.hermes/migration/openclaw/<timestamp>/archive/` に保存されます。

| 対象 | 保管先のファイル | Hermes での作り直し方 |
|------|-------------|--------------------------|
| `IDENTITY.md` | `archive/workspace/IDENTITY.md` | `SOUL.md` に取り込みます |
| `TOOLS.md` | `archive/workspace/TOOLS.md` | Hermes にはツールの説明が最初から入っています |
| `HEARTBEAT.md` | `archive/workspace/HEARTBEAT.md` | 定期の作業には cron ジョブを使います |
| `BOOTSTRAP.md` | `archive/workspace/BOOTSTRAP.md` | コンテキストのファイルかスキルを使います |
| cron ジョブ | `archive/cron-config.json` | `hermes cron create` で作り直します |
| プラグイン | `archive/plugins-config.json` | [プラグインの案内](/hermes/docs/user-guide/features/hooks/) をご覧ください |
| フック / webhook | `archive/hooks-config.json` | `hermes webhook` かゲートウェイのフックを使います |
| 記憶の保存先 | `archive/memory-backend-config.json` | `hermes honcho` で設定します |
| スキルの登録先 | `archive/skills-registry-config.json` | `hermes skills config` を使います |
| 見た目 / 名乗り | `archive/ui-identity-config.json` | `/skin` のコマンドを使います |
| ログ | `archive/logging-diagnostics-config.json` | `config.yaml` のログの節で設定します |
| 複数エージェントの一覧 | `archive/agents-list.json` | Hermes のプロファイルを使います |
| チャンネルの結びつけ | `archive/bindings.json` | プラットフォームごとに自分で設定します |
| 込み入ったチャンネル設定 | `archive/channels-deep-config.json` | プラットフォームの設定を自分で行います |

## API キーの探し方 {#api-key-resolution}

`--migrate-secrets` を付けると、API キーは**4 か所**から、この優先順で集められます。

1. **設定の値** — `openclaw.json` の `models.providers.*.apiKey` と、TTS のプロバイダーのキー
2. **環境変数のファイル** — `~/.openclaw/.env`（`OPENROUTER_API_KEY`、`ANTHROPIC_API_KEY` などのキー）
3. **設定の中の env** — `openclaw.json` の `"env"` か `"env"."vars"`（別の `.env` ではなくここに入れている構成があります）
4. **認証のプロファイル** — `~/.openclaw/agents/main/agent/auth-profiles.json`（エージェントごとの資格情報）

いちばん強いのは設定の値です。そのあとの取り込み元が、残った空きを順に埋めていきます。

### 移せるキーの一覧 {#supported-key-targets}

`OPENROUTER_API_KEY`、`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`DEEPSEEK_API_KEY`、`GEMINI_API_KEY`、`ZAI_API_KEY`、`MINIMAX_API_KEY`、`ELEVENLABS_API_KEY`、`TELEGRAM_BOT_TOKEN`、`VOICE_TOOLS_OPENAI_KEY`

この一覧に無いキーは、決してコピーされません。

## SecretRef の扱い {#secretref-handling}

OpenClaw の設定では、トークンや API キーの値を 3 通りの形で書けます。

```json
// Plain string
"channels": { "telegram": { "botToken": "123456:ABC-DEF..." } }

// Environment template
"channels": { "telegram": { "botToken": "${TELEGRAM_BOT_TOKEN}" } }

// SecretRef object
"channels": { "telegram": { "botToken": { "source": "env", "id": "TELEGRAM_BOT_TOKEN" } } }
```

移行は 3 つとも読み解きます。環境変数のひな形と、`source: "env"` の SecretRef については、`~/.openclaw/.env` と `openclaw.json` の env の中から値を探します。`source: "file"` や `source: "exec"` の SecretRef は自動では解けません。移行はこれらについて警告を出すので、その値は `hermes config set` で自分で Hermes に入れてください。

## 移行のあとに {#after-migration}

1. **移行の報告を確かめる** — 終わったところで、移したもの、飛ばしたもの、ぶつかったものの数が表示されます。

2. **保管されたファイルを見る** — `~/.hermes/migration/openclaw/<timestamp>/archive/` に入っているものは、自分で手を入れる必要があります。

3. **新しいセッションを始める** — 取り込んだスキルと記憶の項目が効くのは、今のセッションではなく新しいセッションからです。

4. **API キーを確かめる** — `hermes status` を実行して、プロバイダーの認証が通っているか見てください。

5. **メッセージ連携を試す** — プラットフォームのトークンを移したなら、ゲートウェイを再起動します: `systemctl --user restart hermes-gateway`

6. **セッションの決まりを確かめる** — `hermes config show` を実行して、`session_reset` の値が思ったとおりか見てください。

7. **WhatsApp を紐づけ直す** — WhatsApp はトークンではなく QR コードでの紐づけ（Baileys）です。`hermes whatsapp` を実行して紐づけてください。

8. **後片づけ** — すべて動くことを確かめたら、`hermes claw cleanup` を実行して、残った OpenClaw のディレクトリを `.pre-migration/` に改名します（どちらの状態を見ているのか分からなくなるのを防げます）。

## うまくいかないとき {#troubleshooting}

### 「OpenClaw のディレクトリが見つからない」と出る {#openclaw-directory-not-found}

移行は `~/.openclaw/`、次に `~/.clawdbot/`、次に `~/.moltbot/` を探します。別の場所に入れているなら、`--source /path/to/your/openclaw` で指定してください。

### 「プロバイダーの API キーが見つからない」と出る {#no-provider-api-keys-found}

キーの置き場は、OpenClaw のバージョンによっていくつかあります。`openclaw.json` の `models.providers.*.apiKey` に直接、`~/.openclaw/.env` の中、`openclaw.json` の `"env"` の中、あるいは `agents/main/agent/auth-profiles.json` です。移行はこの 4 か所すべてを見ます。キーが `source: "file"` や `source: "exec"` の SecretRef になっている場合は自動では解けないので、`hermes config set` で入れてください。

### 移行したのにスキルが出てこない {#skills-not-appearing-after-migration}

取り込まれたスキルは `~/.hermes/skills/openclaw-imports/` に入ります。効かせるには新しいセッションを始めるか、`/skills` を実行して読み込まれているか確かめてください。

### TTS の声が移っていない {#tts-voice-not-migrated}

OpenClaw は TTS の設定を 2 か所に持っています。`messages.tts.providers.*` と、いちばん外側の `talk` の設定です。移行は両方を見ます。声の ID を OpenClaw の画面から設定していた場合（別のパスに保存されます）は、自分で入れる必要があるかもしれません: `hermes config set tts.elevenlabs.voice_id YOUR_VOICE_ID`。
