---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "他のエージェントから取り込む"
description: "OpenClaw（~/.openclaw）、Claude Code（~/.claude）、OpenAI Codex CLI（~/.codex）、Cursor（~/.cursor）の設定を、コマンド1つで Hermes へ取り込みます。指示・ルール・許可リスト・MCP サーバー・スキル・メモリが対象です。"
upstream_path: user-guide/import-from-other-agents.md
upstream_blob: 89f56ec6cbc346e985c2a8e2dceeb749e80f698e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/import-from-other-agents
---

# 他のエージェントから取り込む {#import-from-other-agents}

`hermes import-agent` は、今使っている **OpenClaw**、**Claude Code**、**OpenAI Codex CLI**、**Cursor** の設定を、コマンド1つで Hermes へ取り込みます。書き込みの前に必ず項目ごとの計画が表示され、`--dry-run` ではディスクに一切触れません。

このコマンドは、[プラグインカタログ](/hermes/docs/user-guide/features/plugins/)にある公式の **`agent-importers` プラグイン**が提供します。管理しているのは Nous Research で、置き場所は [NousResearch/hermes-official-plugins](https://github.com/NousResearch/hermes-official-plugins/tree/main/agent-importers) です。

## かんたんな方法: `hermes setup` {#the-easy-way-hermes-setup}

新しく入れた直後に `hermes setup` を実行すると、ほかの何よりも先に `~/.openclaw`（または旧名の `~/.clawdbot` / `~/.moltbot`）、`~/.claude`、`~/.codex`、`~/.cursor` があるかを調べます。見つかると、見つかったものの名前を入れて **「Claude Code から設定を取り込みますか？」** と尋ねます。複数見つかった場合は、続けてチェックリストからどれを取り込むかを選びます（最初は全部にチェックが入っています）。「はい」と答えると、setup はカタログから `agent-importers` プラグインを入れ（すでに入っていれば入れません）、選んだものごとに下で説明する取り込みを実行します。内容の確認と承認の手順もそのまま含まれます。OpenClaw の場合は、以前 Hermes に組み込まれていた OpenClaw 用の手順と同じく `--migrate-secrets` を渡すので、API キーやボットのトークンも引き継がれ、このあとのプロバイダーとメッセージングの設定はすでに埋まった状態になります。「いいえ」と答えた場合や、これらのフォルダーが1つもない場合は、何もインストールされません。すでに設定を済ませている場合は、下のコマンドを使ってください。

## 手で実行する {#by-hand}

プラグインは、プロファイルごとに一度だけ入れます。

```bash
hermes plugins install agent-importers
```

```bash
hermes import-agent                    # auto-detect ~/.openclaw, ~/.claude, ~/.codex or ~/.cursor
hermes import-agent openclaw           # import from ~/.openclaw (see the OpenClaw guide)
hermes import-agent claude-code        # import from ~/.claude
hermes import-agent codex              # import from ~/.codex
hermes import-agent cursor             # import from ~/.cursor
hermes import-agent claude-code --dry-run          # preview only
hermes import-agent codex --source /path/to/.codex # custom location
hermes import-agent claude-code --overwrite --yes  # replace conflicts, skip prompts
```

## 何が取り込まれるか {#what-gets-imported}

### OpenClaw（`~/.openclaw`） {#openclaw-openclaw}

OpenClaw には専用のガイド **[OpenClaw から移ってくる](/hermes/docs/guides/migrate-from-openclaw/)** があります。そこに、対応関係の全体（ペルソナ、メモリ、スキル、モデルのプロバイダー、メッセージングのプラットフォーム、エージェントのふるまい、MCP サーバーなど）、`--preset`・`--migrate-secrets`・`--workspace-target`・`--skill-conflict` の各フラグ、移行前のバックアップ、`hermes claw cleanup` がまとまっています。以前の書き方の `hermes claw migrate` も引き続き使え、同じ取り込みを実行します。

### Claude Code（`~/.claude`） {#claude-code-claude}

| Claude Code | Hermes |
|---|---|
| `CLAUDE.md`（全体の指示） | `~/.hermes/memories/MEMORY.md` のメモリ項目 |
| `settings.json` の `permissions.allow`（`Bash(...)` のルール） | `config.yaml` の `command_allowlist` |
| `settings.json` の `permissions.deny`（`Bash(...)` のルール） | `config.yaml` の `approvals.deny` |
| `mcpServers`（`~/.claude.json` と `settings.json` から） | `config.yaml` の `mcp_servers` |
| `skills/<name>/`（`SKILL.md` を含むディレクトリ） | `~/.hermes/skills/claude-code-imports/<name>/` |
| `commands/*.md`（スラッシュコマンド） | 注記を付けて見送られます。スキルに書き換えてください |

Claude の `Bash(npm run test:*)` という前方一致のルールは、`npm run test*` というグロブになります。`Bash` 以外の権限ルール（`Read(...)`、`WebFetch` など）は Claude 固有のツールを制御するものなので、取り込まずに「対応先なし」として報告されます。

### Codex CLI（`~/.codex`） {#codex-cli-codex}

| Codex CLI | Hermes |
|---|---|
| `AGENTS.md`（全体の指示） | `~/.hermes/memories/MEMORY.md` のメモリ項目 |
| `config.toml` の `[mcp_servers.*]` | `config.yaml` の `mcp_servers` |
| `memories/*.md` | `~/.hermes/memories/MEMORY.md` のメモリ項目 |
| `skills/<name>/`（`SKILL.md` を含むディレクトリ） | `~/.hermes/skills/codex-imports/<name>/` |

### Cursor（`~/.cursor`） {#cursor-cursor}

| Cursor | Hermes |
|---|---|
| `AGENTS.md`（全体の指示） | `~/.hermes/memories/MEMORY.md` のメモリ項目 |
| `rules/*.md`、`rules/*.mdc`（ユーザールール） | `~/.hermes/memories/MEMORY.md` のメモリ項目 |
| `mcp.json` の `mcpServers` | `config.yaml` の `mcp_servers` |
| `skills/**/<name>/`（`SKILL.md` を含むディレクトリ。カテゴリ用のフォルダーで分けてあってもかまいません） | `~/.hermes/skills/cursor-imports/<name>/` |

`.mdc` のフロントマター（`description`、`globs`、`alwaysApply`）は Cursor のルールエンジンが振り分けに使う情報なので取り除かれ、ルールの本文だけが取り込まれます。スキルは `SKILL.md` を含むフォルダーのことなので、`skills/shipping/land-it/` は `cursor-imports/land-it/` として取り込まれます。別々のフォルダーに同じ名前のスキルが2つある場合は、重複として報告されます。

## 決して取り込まれないもの {#what-is-never-imported}

**API キーと資格情報です。**（例外は OpenClaw だけで、許可リストに載っている API キーとボットのトークンは、`--migrate-secrets` を渡したときに限って引き継がれます。）資格情報のファイル（`~/.claude/.credentials.json`、`~/.codex/auth.json`、`~/.cursor/cli-config.json`）は読まれません。MCP サーバーの環境変数やヘッダーのうち、秘密を思わせる名前のもの（`*_TOKEN`、`*_API_KEY`、`Authorization` など）は取り除かれ、報告に一覧として出ます。あらためて自分の手で入れ直せるようにするためです。プロバイダーの設定は `hermes setup` で行うか、`~/.hermes/.env` に secret を書き足してください。

## 動きについての補足 {#behavior-notes}

- **必ず先に内容を見せます。** 適用する前に計画の全体を表示します。対話でない実行では、`--yes` を渡さない限りその表示の時点で止まります。
- **置き換えではなく取り込みです。** メモリの項目は既存の `MEMORY.md` と突き合わせて重複を除きます。許可リストと拒否リストのパターンは、`config.yaml` にあるものと合わせられます。
- **重複は既定で見送られます。** Hermes 側に同じ MCP サーバーやスキルが既にある場合は、重複として報告されます。`--overwrite` を渡すと置き換えます。
- **壊れたファイルがあっても処理は止まりません。** 読めない `settings.json` や `config.toml` は、その項目のエラーとして報告に載るだけで、ほかは通常どおり取り込まれます。

## 取り込みを最新に保つ {#keeping-imports-in-sync}

Claude Code、Codex CLI、Cursor からの取り込みが成功するたびに、その取り込み元（と、読み込んだものすべてのダイジェスト）が `~/.hermes/import-sync.json` に登録されます。あとで相手のエージェント側の設定が変わったとき（スキルが増えた、`CLAUDE.md`/`AGENTS.md` を編集した、MCP サーバーを足した など）は、次のコマンドで変更を取り込めます。

```bash
hermes import-agent --sync            # re-import every changed source
hermes import-agent --sync --dry-run  # preview what a sync would do
```

同期は確認を求めず、手間もかかりません。ファイルが変わっていない取り込み元はダイジェストの比較で読み飛ばされるので、定期実行（たとえば毎日の [cron ジョブ](/hermes/docs/user-guide/features/cron/)）にしても安全です。決まりは次のとおりです。

- **メモリと設定の取り込みは、重複を除く動きのままです** — 同期しても、すでにある項目やパターンが二重になることはありません。
- **以前 `import-agent` で取り込んだスキルは、元のファイルが変わるとその場で更新されます。**
- **取り込み用のカテゴリの下で自分で作ったり手を加えたりしたスキルは、決して上書きされません** — ふだんの重複の扱いのままです（手動で実行するときに `--overwrite` を付けると強制的に置き換えます）。
- **資格情報のファイルが同期のきっかけになることはありません** — `~/.claude/.credentials.json` や `~/.codex/auth.json` でトークンが更新されてもダイジェストでは無視され、取り込むものから秘密情報が取り除かれるのも従来どおりです。

これは ChatGPT Work の *Settings > Import* にある自動更新と同じ考え方を、裏で動くサービスではなく、明示的に実行して中身を確かめられるコマンドにしたものです。

この登録情報はプロファイルごとに持ちます。`hermes profile create <name> --clone --sync-imports` で作ったプロファイルはこれを引き継ぐので、`hermes -p <name> import-agent --sync` で同じ外部のフォルダーから引き続き取り込めます（[プロファイル](/hermes/docs/user-guide/profiles/#keep-a-clones-imported-agent-setups-synced---sync-imports)を参照してください）。

## `import-agent` が組み込まれていた版から更新する {#upgrading-from-a-version-with-import-agent-built-in}

`hermes import-agent` と `hermes claw` は、以前は Hermes 本体に同梱されていました。プラグインになっても、コマンド、フラグ、`import-sync.json` の登録情報は変わりません。

- **同期元が登録されているプロファイル**（定期的な `--sync` の実行が読む `import-sync.json` があるもの）では、`hermes update` のとき、または更新後の最初の起動時に、プラグインが自動で入ります（このとき `security.allow_lazy_installs` の設定に従います）。あとで外した場合（`hermes plugins remove agent-importers`）は、外したままになります。
- **それ以外の人**は、必要になったときに入れます。新しく `hermes setup` を実行してこれらのエージェントが見つかれば入れるかどうかを尋ねられますし、プラグインなしで `hermes import-agent` や `hermes claw` を実行すると、インストール用のコマンドが表示されます。
