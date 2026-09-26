---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "他のエージェントから取り込む"
description: "Claude Code（~/.claude）や OpenAI Codex CLI（~/.codex）の設定を、コマンド1つで Hermes へ取り込みます。指示・許可リスト・MCP サーバー・スキル・メモリが対象です。"
upstream_path: user-guide/import-from-other-agents.md
upstream_blob: 2814766b9bf017523419cf7f8aa3b65a266e2e55
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/import-from-other-agents
---

# 他のエージェントから取り込む {#import-from-other-agents}

`hermes import-agent` は、今使っている **Claude Code** または **OpenAI Codex CLI** の設定を、コマンド1つで Hermes へ取り込みます。[`hermes claw migrate`](/hermes/docs/guides/migrate-from-openclaw/) と同じく、まず内容を見せてから実行する方式です。書き込みの前に必ず項目ごとの計画が表示され、`--dry-run` ではディスクに一切触れません。

```bash
hermes import-agent                    # auto-detect ~/.claude or ~/.codex
hermes import-agent claude-code        # import from ~/.claude
hermes import-agent codex              # import from ~/.codex
hermes import-agent claude-code --dry-run          # preview only
hermes import-agent codex --source /path/to/.codex # custom location
hermes import-agent claude-code --overwrite --yes  # replace conflicts, skip prompts
```

## 何が取り込まれるか {#what-gets-imported}

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

## 決して取り込まれないもの {#what-is-never-imported}

**API キーと資格情報です。** 資格情報のファイル（`~/.claude/.credentials.json`、`~/.codex/auth.json`）は読まれません。MCP サーバーの環境変数やヘッダーのうち、秘密を思わせる名前のもの（`*_TOKEN`、`*_API_KEY`、`Authorization` など）は取り除かれ、報告に一覧として出ます。あらためて自分の手で入れ直せるようにするためです。プロバイダーの設定は `hermes setup` で行うか、`~/.hermes/.env` に secret を書き足してください。

## 動きについての補足 {#behavior-notes}

- **必ず先に内容を見せます。** 適用する前に計画の全体を表示します。対話でない実行では、`--yes` を渡さない限りその表示の時点で止まります。
- **置き換えではなく取り込みです。** メモリの項目は既存の `MEMORY.md` と突き合わせて重複を除きます。許可リストと拒否リストのパターンは、`config.yaml` にあるものと合わせられます。
- **重複は既定で見送られます。** Hermes 側に同じ MCP サーバーやスキルが既にある場合は、重複として報告されます。`--overwrite` を渡すと置き換えます。
- **壊れたファイルがあっても処理は止まりません。** 読めない `settings.json` や `config.toml` は、その項目のエラーとして報告に載るだけで、ほかは通常どおり取り込まれます。
- OpenClaw から移ってくる場合は [`hermes claw migrate`](/hermes/docs/guides/migrate-from-openclaw/) を使ってください。

## 取り込みを最新に保つ {#keeping-imports-in-sync}

取り込みが成功するたびに、その取り込み元（と、読み込んだものすべてのダイジェスト）が `~/.hermes/import-sync.json` に登録されます。あとで相手のエージェント側の設定が変わったとき（スキルが増えた、`CLAUDE.md`/`AGENTS.md` を編集した、MCP サーバーを足した など）は、次のコマンドで変更を取り込めます。

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
