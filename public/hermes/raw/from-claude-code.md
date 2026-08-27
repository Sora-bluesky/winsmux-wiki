---
title: Claude Code からの乗り換え
description: Claude Code と Hermes の概念の対応と、設定をコマンド1つで取り込む方法。
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/import-from-other-agents
  - https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
  - https://hermes-agent.nousresearch.com/docs/user-guide/configuration
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging
  - https://code.claude.com/docs/en/overview
  - https://code.claude.com/docs/en/skills
  - https://code.claude.com/docs/en/hooks
  - https://code.claude.com/docs/en/memory
  - https://code.claude.com/docs/en/mcp
  - https://code.claude.com/docs/en/settings
hermes_version: "0.20.6"
confidence: medium
raw: /hermes/raw/from-claude-code.md
---

# Claude Code からの乗り換え

## 前提の違い

Claude Code は、公式の説明によれば、コードベースを読み、ファイルを編集し、コマンドを実行し、開発ツールとつながるコーディングのためのエージェントです。ターミナル、IDE、デスクトップアプリ、ブラウザで動きます。Hermes Agent はゲートウェイという常駐プロセスを持っていて、Telegram、Discord、Slack、LINE、メールなど、設定したすべての窓口に同時につながります。ゲートウェイはセッションを管理し、cron ジョブを走らせ、音声メッセージも配ります。どちらもファイルを触ってコマンドを走らせますが、入口の置き方が違います。片方は開発端末に、もう片方は手元のメッセージアプリにも開いています。

## 概念の対応

両方の公式ドキュメントで確認できたものだけを載せています。

| Claude Code | Hermes | 備考 |
|---|---|---|
| スキル `~/.claude/skills/<名前>/SKILL.md`、`.claude/skills/<名前>/SKILL.md` | `~/.hermes/skills/<名前>/SKILL.md` | 取り込むと `~/.hermes/skills/claude-code-imports/<名前>/` に入ります |
| 全体の指示 `~/.claude/CLAUDE.md` | `~/.hermes/memories/MEMORY.md` のメモリ項目 | 置き換えではなく、重複を除いて足されます |
| プロジェクトの指示 `./CLAUDE.md`、`./.claude/CLAUDE.md` | `.hermes.md`、`AGENTS.md` | Hermes は `CLAUDE.md` もそのまま読みます。順番は `.hermes.md` → `AGENTS.override.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` で、最初に見つかった1つだけが使われます |
| 自動メモリ `~/.claude/projects/<プロジェクト>/memory/MEMORY.md` | `~/.hermes/memories/` の `MEMORY.md` と `USER.md` | どちらもエージェント自身が書きます。Hermes 側はセッション開始時の固定スナップショットとして差し込まれます |
| 設定ファイル `~/.claude/settings.json`、`.claude/settings.json`、`.claude/settings.local.json` | `~/.hermes/config.yaml` | Hermes は秘密でない設定をこの1つのファイルに集めます |
| `permissions.allow` の `Bash(...)` ルール | `config.yaml` の `command_allowlist` | `Bash(npm run test:*)` は `npm run test*` というグロブになります |
| `permissions.deny` の `Bash(...)` ルール | `config.yaml` の `approvals.deny` | `Read(...)` や `WebFetch` など `Bash` 以外のルールは、対応先なしとして報告されます |
| MCP サーバー `~/.claude.json`、`.mcp.json`、`claude mcp add` | `config.yaml` の `mcp_servers`、`hermes mcp` | 取り込みでは、秘密を思わせる名前の環境変数とヘッダーが取り除かれます |
| フック `settings.json` の `hooks` ブロック | `~/.hermes/hooks/` の `HOOK.yaml` とハンドラ、`config.yaml` の `hooks:` ブロック | Claude Code はシェルコマンドに JSON を標準入力で渡します。Hermes はフックごとのディレクトリにファイルを置きます |
| 定時実行の Routines、Desktop scheduled tasks、`/loop` | `hermes cron`（cron ツール） | Hermes は自然な言葉でも cron の式でも予約でき、スキルをひも付けられます |
| スラッシュコマンド `.claude/commands/*.md` | なし | 取り込みでは見送られます。スキルに書き換えてください |

Hermes 側にだけあるものとして、人格を書く `~/.hermes/SOUL.md` があります。どのファイルが何を担うかは [どのファイルが何をするのか](/hermes/docs/user-guide/which-file-does-what/) にまとまっています。

## 持ち込めるもの

公式に `hermes import-agent` というコマンドがあります。`~/.claude` を見て、指示・許可リスト・MCP サーバー・スキル・メモリを取り込みます。

```
hermes import-agent claude-code --dry-run
```

`--dry-run` はディスクに一切触れません。まず何が入るかを見てから、次のコマンドで実際に適用します。

```
hermes import-agent claude-code
```

書き込みの前に必ず項目ごとの計画が表示されます。対話でない実行では、`--yes` を渡さない限りその表示で止まります。Hermes 側に同じ MCP サーバーやスキルが既にあるときは重複として報告され、`--overwrite` を渡すと置き換わります。

API キーと資格情報は決して取り込まれません。`~/.claude/.credentials.json` は読まれず、MCP サーバーの `*_TOKEN` や `Authorization` といった値は取り除かれて、報告に一覧として出ます。自分の手で入れ直してください。手順の全体は [他のエージェントから取り込む](/hermes/docs/user-guide/import-from-other-agents/) にあります。

## 移行しない選択

両方を使い続けるのも普通のことです。Hermes はプロジェクトのコンテキストファイルとして `CLAUDE.md` をそのまま読むので、`CLAUDE.md` を1つ置いておけば両方が同じ内容を見ます（Claude Code が読むのは `CLAUDE.md` だけで、`AGENTS.md` は読みません）。スキルの `SKILL.md` という書式も共通なので、どちらか一方に寄せなくても書いたものは無駄になりません。端末での作業は今までどおりにして、外出先から届く窓口だけを Hermes に足す、という置き方もできます。どちらが優れているという話ではなく、開発端末で完結する作業と、手元のメッセージアプリから始まる作業とで、向いている道具が違うだけです。

続きは [よく使う](/hermes/guide/) と [運用](/hermes/ops/) にあります。設定ファイルの中身は [設定](/hermes/docs/user-guide/configuration/)、スキルの仕組みは [スキルの仕組み](/hermes/docs/user-guide/features/skills/) をご覧ください。
