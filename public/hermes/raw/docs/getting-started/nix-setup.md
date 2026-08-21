---
title: "Nix と NixOS のセットアップ"
description: "Nix で Hermes Agent をインストールして動かす方法。手軽な `nix run` から、コンテナモードまで備えた完全に宣言的な NixOS モジュールまで"
upstream_path: getting-started/nix-setup.md
upstream_blob: 3041696e5dc1bbf88e905823a64c1596c38a5ac2
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/nix-setup
---

# Nix と NixOS のセットアップ {#nix-nixos-setup}

:::warning Tier 2 のプラットフォームです
Nix と NixOS は [Tier 2 のプラットフォーム](/hermes/docs/getting-started/platform-support/#tier-2)です。ここで説明する flake と NixOS モジュールは、できる範囲での対応にとどまります。`main` へのコミットによって、これらのパッケージがいつ壊れてもおかしくありません。

正式に対応された手順で進めたい場合は、標準の[インストール](/hermes/docs/getting-started/installation/)方法、つまり Docker か FHS 環境のどちらかを使ってください。
:::

Hermes Agent は Nix flake、NixOS モジュール、Home Manager モジュールを同梱しています。

| 段階 | 向いている人 | 手に入るもの |
|-------|-------------|--------------|
| **`nix run` / `nix profile install`** | Nix を使っている人全般（macOS、Linux） | 依存関係をすべて含んだビルド済みバイナリ。あとは通常どおり CLI を使うだけです |
| **Home Manager モジュール** | どのディストリビューションでも、あるいは macOS でも、自分ひとり用のエージェントを動かしたい人 | root なしで、宣言的な設定とユーザーサービスが手に入ります |
| **NixOS モジュール（ネイティブ）** | NixOS サーバーに配置する人 | 宣言的な設定、堅牢化された systemd サービス、管理されたシークレット |
| **NixOS モジュール（コンテナ）** | エージェント自身に環境を書き換えさせたい人 | 上記すべてに加えて、エージェントが `apt`/`pip`/`npm install` を実行できる永続的な Ubuntu コンテナ |

:::info 標準のインストールとの違い
`curl | bash` のインストーラーは、Python、Node、依存関係を自前で管理します。Nix flake はそれをまるごと置き換えます。Python の依存関係はすべて [uv2nix](https://github.com/pyproject-nix/uv2nix) がビルドする Nix derivation になり、実行時に使うツール（Node.js、git、ripgrep、ffmpeg）はバイナリの PATH に包み込まれます。実行時の pip も、venv の有効化も、`npm install` もありません。

**NixOS 以外の利用者にとって**は、変わるのはインストールの手順だけです。そのあと（`hermes setup`、`hermes gateway install`、設定ファイルの編集）は標準のインストールとまったく同じように動きます。

**NixOS モジュールの利用者にとって**は、運用の流れそのものが変わります。設定は `configuration.nix` に置き、シークレットは sops-nix や agenix を通し、サービスは systemd ユニットになり、設定変更用の CLI コマンドは使えなくなります。ほかの NixOS サービスと同じやり方で hermes を扱うことになります。
:::

## 事前に必要なもの {#prerequisites}

- **flakes を有効にした Nix** — [Determinate Nix](https://install.determinate.systems) がおすすめです（flakes が最初から有効になります）
- 使いたいサービスの **API キー**（最低でも OpenRouter か Anthropic のキーが 1 つ必要です）

---

## クイックスタート（Nix を使っている人向け） {#quick-start-any-nix-user}

リポジトリを clone する必要はありません。Nix が取得からビルド、実行までまとめて面倒を見ます。

```bash
# Run the desktop app
nix run github:NousResearch/hermes-agent#desktop

# Or install persistently
nix profile install github:NousResearch/hermes-agent#desktop

# run the tui
nix run github:NousResearch/hermes-agent -- setup
nix run github:NousResearch/hermes-agent -- --tui

# or install it in your profile
nix profile install github:NousResearch/hermes-agent
hermes setup
hermes --tui
```

`nix profile install` を実行すると、`hermes`、`hermes-agent`、`hermes-acp` が PATH に入ります。ここから先は[標準のインストール](/hermes/docs/getting-started/installation/)と同じです。`hermes setup` がプロバイダー選択を案内し、`hermes gateway install` が launchd（macOS）または systemd のユーザーサービスを用意し、設定は `~/.hermes/` に置かれます。

:::warning メッセージ連携（Discord、Telegram、Slack）
既定のパッケージには、hermes-agent が必要としうるライブラリがすべて入っています。もっと小さいものが欲しい場合は、ほかの flake output を見てください。

`default` パッケージはクロージャを 700 MB ほど大きくします。メッセージ連携だけが必要なら、`#messaging` の追加分は 33 MB ほどで済みます。

:::

<details>
<summary><strong>手元の clone から実行する</strong></summary>

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
nix develop
hermes setup
```

</details>

---

## NixOS モジュール {#nixos-module}

この flake は `nixosModules.default` を公開しています。ユーザーの作成、ディレクトリ、設定ファイルの生成、シークレット、ドキュメント、サービスの起動と停止までを宣言的に扱う、NixOS のサービスモジュールです。

:::note
このモジュールには NixOS が必要です。Hermes はひとりのためのエージェントです。システムサービスではなく自分ひとり用のエージェントが欲しい場合は、[Home Manager モジュール](#home-manager-module)を使ってください。こちらは NixOS でも、Home Manager が対応しているほかのシステムでも動きます。
:::

### flake の input に追加する {#add-the-flake-input}

```nix
# /etc/nixos/flake.nix (or your system flake)
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    hermes-agent.url = "github:NousResearch/hermes-agent";
  };

  outputs = { nixpkgs, hermes-agent, ... }: {
    nixosConfigurations.your-host = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        hermes-agent.nixosModules.default
        ./configuration.nix
      ];
    };
  };
}
```

### 最小の設定 {#minimal-configuration}

```nix
# configuration.nix
{ config, ... }: {
  services.hermes-agent = {
    enable = true;
    settings.model.default = "anthropic/claude-sonnet-4";
    environmentFiles = [ config.sops.secrets."hermes-env".path ];
    addToSystemPackages = true;
  };
}
```

これで終わりです。`nixos-rebuild switch` を実行すると `hermes` ユーザーが作られ、`config.yaml` が生成され、シークレットが接続され、ゲートウェイが起動します。ゲートウェイは常駐するサービスで、エージェントをメッセージ連携（Telegram、Discord など）につなぎ、届いたメッセージを待ち受けます。

:::warning シークレットの用意が必要です
上の `environmentFiles` の行は、[sops-nix](https://github.com/Mic92/sops-nix) か [agenix](https://github.com/ryantm/agenix) を設定済みであることを前提にしています。ファイルの中身には、LLM プロバイダーのキーが少なくとも 1 つ（たとえば `OPENROUTER_API_KEY=sk-or-...`）必要です。設定の全体像は[シークレットの管理](#secrets-management)を見てください。まだシークレット管理の仕組みがない場合は、ひとまず普通のファイルから始めても構いません。ただし誰からでも読める状態にはしないでください。

```bash
echo "OPENROUTER_API_KEY=sk-or-your-key" | sudo install -m 0600 -o hermes /dev/stdin /var/lib/hermes/env
```

```nix
services.hermes-agent.environmentFiles = [ "/var/lib/hermes/env" ];
```
:::

:::tip addToSystemPackages
`addToSystemPackages = true` を指定すると 2 つのことが起きます。`hermes` CLI がシステムの PATH に入り、**さらに** `HERMES_HOME` がシステム全体に設定されるため、対話的に使う CLI がゲートウェイサービスと状態（セッション、スキル、cron）を共有します。これを付けないと、シェルで `hermes` を動かしたときに別の `~/.hermes/` ディレクトリが作られます。
:::

### コンテナを意識した CLI {#container-aware-cli}

:::info
`container.enable = true` と `addToSystemPackages = true` の両方が有効な場合、ホスト上の **すべての** `hermes` コマンドが自動的に管理下のコンテナへ流れます。つまり、対話的な CLI もゲートウェイサービスと同じ環境の中で動き、コンテナに入れたパッケージやツールをそのまま使えます。

- 流し込みは意識せずに済みます。`hermes chat`、`hermes sessions list`、`hermes --version` などはすべて、裏側でコンテナに入って実行されます
- CLI のフラグはそのまま渡されます
- コンテナが動いていない場合、CLI は短い時間だけ再試行し（対話利用では 5 秒スピナーを出し、スクリプトでは 10 秒静かに待ちます）、その後わかりやすいエラーで止まります。黙って別の経路に落ちることはありません
- hermes 本体のコードを触っている開発者は、`HERMES_DEV=1` を設定するとコンテナへの流し込みを回避し、手元のチェックアウトを直接実行できます

`container.hostUsers` を設定すると、サービスの状態ディレクトリへの `~/.hermes` シンボリックリンクが作られ、ホストの CLI とコンテナがセッション、設定、記憶を共有します。

```nix
services.hermes-agent = {
  container.enable = true;
  container.hostUsers = [ "your-username" ];
  addToSystemPackages = true;
};
```

`hostUsers` に並べたユーザーは、ファイルにアクセスできるよう自動的に `hermes` グループへ追加されます。

**Podman を使う場合:** NixOS のサービスはコンテナを root で動かします。Docker では `docker` グループのソケット経由でアクセスできますが、Podman の rootful なコンテナには sudo が要ります。使っているコンテナランタイムに、パスワードなしの sudo を許可してください。

```nix
security.sudo.extraRules = [{
  users = [ "your-username" ];
  commands = [{
    command = "/run/current-system/sw/bin/podman";
    options = [ "NOPASSWD" ];
  }];
}];
```

CLI は sudo が必要かどうかを自動で判断し、意識させずに使います。この設定がないと、自分で `sudo hermes chat` と打つ必要があります。
:::

### 動いているか確かめる {#verify-it-works}

`nixos-rebuild switch` のあと、サービスが動いているか確認します。

```bash
# Check service status
systemctl status hermes-agent

# Watch logs (Ctrl+C to stop)
journalctl -u hermes-agent -f

# If addToSystemPackages is true, test the CLI
hermes --version
hermes config       # shows the generated config
```

### 動かし方を選ぶ {#choosing-a-deployment-mode}

このモジュールには 2 つの動かし方があり、`container.enable` で切り替えます。

| | **ネイティブ**（既定） | **コンテナ** |
|---|---|---|
| 動き方 | ホスト上の堅牢化された systemd サービス | `/nix/store` を bind mount した永続的な Ubuntu コンテナ |
| セキュリティ | `NoNewPrivileges`、`ProtectSystem=strict`、`PrivateTmp` | コンテナによる隔離。中では権限のないユーザーとして動きます |
| エージェント自身でパッケージを入れられるか | いいえ。Nix が用意した PATH 上のツールだけです | はい。`apt`、`pip`、`npm` で入れたものは再起動しても残ります |
| 設定できる項目 | 同じ | 同じ |
| 選ぶ場面 | 一般的な配置、セキュリティを最優先したいとき、再現性を重視するとき | 実行中にパッケージを入れたい、環境を書き換えたい、実験的なツールを試したいとき |

コンテナモードにするには、1 行足すだけです。

```nix
{
  services.hermes-agent = {
    enable = true;
    container.enable = true;
    # ... rest of config is identical
  };
}
```

:::info
コンテナモードでは `virtualisation.docker.enable` が `mkDefault` によって自動で有効になります。代わりに Podman を使う場合は `container.backend = "podman"` と `virtualisation.docker.enable = false` を設定してください。
:::

---

## 設定 {#configuration}

### 宣言的な設定項目 {#declarative-settings}

`settings` オプションは任意の attrset を受け取り、それを `config.yaml` として書き出します。複数のモジュール定義をまたいだ深いマージ（`lib.recursiveUpdate` によるもの）に対応しているので、設定をファイルごとに分けられます。

```nix
# base.nix
services.hermes-agent.settings = {
  model.default = "anthropic/claude-sonnet-4";
  toolsets = [ "all" ];
  terminal = { backend = "local"; timeout = 180; };
};

# personality.nix
services.hermes-agent.settings = {
  display = { compact = false; personality = "kawaii"; };
  memory = { memory_enabled = true; user_profile_enabled = true; };
};
```

どちらも評価時に深くマージされます。Nix で宣言したキーは、ディスク上にある既存の `config.yaml` のキーよりも常に優先されますが、**Nix が触れていない、利用者が足したキーはそのまま残ります**。つまり、エージェントや手作業の編集で `skills.disabled` や `streaming.enabled` のようなキーが増えても、`nixos-rebuild switch` を越えて生き残ります。

:::note モデル名の書き方
`settings.model.default` には、プロバイダーが期待するモデル識別子を書きます。既定の [OpenRouter](https://openrouter.ai) なら `"anthropic/claude-sonnet-4"` や `"google/gemini-3-flash"` のような形です。プロバイダー（Anthropic、OpenAI）を直接使う場合は、`settings.model.base_url` にその API を指定し、そのプロバイダー独自のモデル ID（たとえば `"claude-sonnet-4-20250514"`）を書いてください。`base_url` を設定しない場合、Hermes は OpenRouter を既定として使います。
:::

:::tip 設定できるキーを調べる
`nix build .#configKeys && cat result` を実行すると、Python の `DEFAULT_CONFIG` から抜き出した末端の設定キーがすべて表示されます。手元の `config.yaml` の中身は、そのまま `settings` の attrset に貼り付けられます。構造が 1 対 1 で対応しているからです。
:::

<details>
<summary><strong>すべて入りの例: よく変更される設定をひととおり</strong></summary>

```nix
{ config, ... }: {
  services.hermes-agent = {
    enable = true;
    container.enable = true;

    # ── Model ──────────────────────────────────────────────────────────
    settings = {
      model = {
        base_url = "https://openrouter.ai/api/v1";
        default = "anthropic/claude-opus-4.6";
      };
      toolsets = [ "all" ];
      max_turns = 100;
      terminal = { backend = "local"; cwd = "."; timeout = 180; };
      compression = {
        enabled = true;
        threshold = 0.85;
        summary_model = "google/gemini-3-flash-preview";
      };
      memory = { memory_enabled = true; user_profile_enabled = true; };
      display = { compact = false; personality = "kawaii"; };
      agent = { max_turns = 60; verbose = false; };
    };

    # ── Secrets ────────────────────────────────────────────────────────
    environmentFiles = [ config.sops.secrets."hermes-env".path ];

    # ── Documents ──────────────────────────────────────────────────────
    # USER.md is memory, so it goes to HERMES_HOME. Workspace files use
    # `documents`, and that option needs an explicit `workingDirectory`.
    hermesHomeFiles = {
      "memories/USER.md" = ./documents/USER.md;
    };

    # ── MCP Servers ────────────────────────────────────────────────────
    mcpServers.filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };

    # ── Container options ──────────────────────────────────────────────
    container = {
      image = "ubuntu:24.04";
      backend = "docker";
      hostUsers = [ "your-username" ];
      extraVolumes = [ "/home/user/projects:/projects:rw" ];
      extraOptions = [ "--gpus" "all" ];
    };

    # ── Service tuning ─────────────────────────────────────────────────
    addToSystemPackages = true;
    extraArgs = [ "--verbose" ];
    restart = "always";
    restartSec = 5;
  };
}
```

</details>

### 逃げ道: 自前の設定ファイルを使う {#escape-hatch-bring-your-own-config}

`config.yaml` を Nix の外で丸ごと自分で管理したい場合は、`configFile` を使います。

```nix
services.hermes-agent.configFile = /etc/hermes/config.yaml;
```

これは `settings` を完全に迂回します。マージも生成も行われません。有効化のたびに、そのファイルがそのまま `$HERMES_HOME/config.yaml` へコピーされます。

### カスタマイズの早見表 {#customization-cheatsheet}

Nix 利用者がよく変えたい項目をまとめた早見表です。

| やりたいこと | オプション | 例 |
|---|---|---|
| LLM のモデルを変える | `settings.model.default` | `"anthropic/claude-sonnet-4"` |
| 別のプロバイダーのエンドポイントを使う | `settings.model.base_url` | `"https://openrouter.ai/api/v1"` |
| API キーを追加する | `environmentFiles` | `[ config.sops.secrets."hermes-env".path ]` |
| エージェントに人格を与える | `hermesHomeFiles."SOUL.md"` | `"You are a terse ops assistant."` |
| 作業ディレクトリにプロジェクトの前提を置く | `documents."AGENTS.md"` | `./documents/AGENTS.md` |
| デスクトップアプリやダッシュボード用のバックエンドを動かす | `backend.mode` | `"serve"` または `"dashboard"` |
| MCP のツールサーバーを追加する | `mcpServers.<name>` | [MCP サーバー](#mcp-servers)を参照 |
| Discord / Telegram / Slack を有効にする | `extraDependencyGroups` | `[ "messaging" ]` |
| ホストのディレクトリをコンテナへマウントする | `container.extraVolumes` | `[ "/data:/data:rw" ]` |
| コンテナから GPU を使えるようにする | `container.extraOptions` | `[ "--gpus" "all" ]` |
| Docker ではなく Podman を使う | `container.backend` | `"podman"` |
| ホストの CLI とコンテナで状態を共有する | `container.hostUsers` | `[ "sidbin" ]` |
| エージェントが使えるツールを増やす | `extraPackages` | `[ pkgs.pandoc pkgs.imagemagick ]` |
| 独自のベースイメージを使う | `container.image` | `"ubuntu:24.04"` |
| hermes パッケージを差し替える | `package` | `inputs.hermes-agent.packages.${system}.default.override { ... }` |
| 状態ディレクトリを変える | `stateDir` | `"/opt/hermes"` |
| エージェントの作業ディレクトリを決める | `workingDirectory` | `"/home/user/projects"` |

---

## シークレットの管理 {#secrets-management}

:::danger API キーを `settings` や `environment` に書かないでください
Nix の式に書いた値は `/nix/store` に残り、そこは誰からでも読めます。必ずシークレット管理の仕組みと `environmentFiles` を組み合わせてください。
:::

`environment`（秘密でない変数）と `environmentFiles`（秘密のファイル）は、どちらも有効化のとき（`nixos-rebuild switch`）に `$HERMES_HOME/.env` へまとめられます。Hermes は起動のたびにこのファイルを読むので、変更は `systemctl restart hermes-agent` で反映されます。コンテナを作り直す必要はありません。

### sops-nix {#sops-nix}

```nix
{
  sops = {
    defaultSopsFile = ./secrets/hermes.yaml;
    age.keyFile = "/home/user/.config/sops/age/keys.txt";
    secrets."hermes-env" = { format = "yaml"; };
  };

  services.hermes-agent.environmentFiles = [
    config.sops.secrets."hermes-env".path
  ];
}
```

シークレットのファイルには、キーと値の組を書きます。

```yaml
# secrets/hermes.yaml (encrypted with sops)
hermes-env: |
    OPENROUTER_API_KEY=sk-or-...
    TELEGRAM_BOT_TOKEN=123456:ABC...
    ANTHROPIC_API_KEY=sk-ant-...
```

### agenix {#agenix}

```nix
{
  age.secrets.hermes-env.file = ./secrets/hermes-env.age;

  services.hermes-agent.environmentFiles = [
    config.age.secrets.hermes-env.path
  ];
}
```

### OAuth と認証情報の初期投入 {#oauth-auth-seeding}

OAuth が必要なプラットフォーム（Discord など）では、`authFile` を使って最初の配置時に認証情報を入れておけます。

```nix
{
  services.hermes-agent = {
    authFile = config.sops.secrets."hermes/auth.json".path;
    # authFileForceOverwrite = true;  # overwrite on every activation
  };
}
```

このファイルは、`auth.json` がまだ存在しないときだけコピーされます（`authFileForceOverwrite = true` の場合を除く）。実行中に更新された OAuth トークンは状態ディレクトリに書かれ、再ビルドしても残ります。

---

## ドキュメント {#documents}

Hermes は 2 つのディレクトリからファイルを読みます。そのためオプションも 2 つあります。置きたいディレクトリに合わせて使い分けてください。

`documents` は、エージェントの **作業ディレクトリ**、つまり `workingDirectory` に置きます。エージェントはその作業場所からプロジェクトの前提を読み取ります。

```nix
{
  services.hermes-agent = {
    # documents needs this option. Read the note below.
    workingDirectory = "/var/lib/hermes/workspace";
    documents = {
      "AGENTS.md" = ./documents/AGENTS.md;   # path reference, copied from Nix store
      "notes/oncall.md" = "Page #infra before restarting anything.";
    };
  };
}
```

:::warning documents には workingDirectory の明示が要ります
`workingDirectory` を設定するまで、このモジュールは `documents` を受け付けません。このオプションの既定値はモジュールごとに違います。Home Manager では自分のホームディレクトリ、NixOS では `${stateDir}/workspace` です。つまり既定のままだと、自分で選んでいないディレクトリにファイルが置かれてしまいます。既定と同じパスを書くのも正しい選択であり、それでこの決まりを満たせます。
:::

`hermesHomeFiles` は **`HERMES_HOME`** に置きます。Hermes は、エージェントの人格ファイルと記憶のファイルをそのディレクトリから読みます。`SOUL.md` と `memories/` はそこに置いたときだけ働きます。`documents` に置いた `SOUL.md` は、ただの作業ファイルになります。Hermes はそれを人格として読み込みません。

```nix
{
  services.hermes-agent.hermesHomeFiles = {
    "SOUL.md" = "You are a helpful AI assistant.";
    "memories/USER.md" = ./documents/USER.md;
  };
}
```

値は文字列かパスです。どちらのオプションでも、キーにサブディレクトリを含められ、その親ディレクトリはモジュールが作ります。有効化のたびにファイルは置き直されます。

`hermesHomeFiles` に `workingDirectory` は要りません。`HERMES_HOME` ディレクトリはモジュールが持っているからです。たいていの場合は `hermesHomeFiles` のほうが目的に合います。

---

## MCP サーバー {#mcp-servers}

`mcpServers` オプションは、[MCP（Model Context Protocol）](https://modelcontextprotocol.io)のサーバーを宣言的に設定します。各サーバーは **stdio**（手元のコマンド）か **HTTP**（リモートの URL）のどちらかで通信します。

### stdio 経由（手元のサーバー） {#stdio-transport-local-servers}

```nix
{
  services.hermes-agent.mcpServers = {
    filesystem = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-filesystem" "/data/workspace" ];
    };
    github = {
      command = "npx";
      args = [ "-y" "@modelcontextprotocol/server-github" ];
      env.GITHUB_PERSONAL_ACCESS_TOKEN = "\${GITHUB_TOKEN}"; # resolved from .env
    };
  };
}
```

:::tip
`env` の値に書いた環境変数は、実行時に `$HERMES_HOME/.env` から解決されます。秘密の値は `environmentFiles` から流し込んでください。Nix の設定にトークンを直接書いてはいけません。
:::

### HTTP 経由（リモートのサーバー） {#http-transport-remote-servers}

```nix
{
  services.hermes-agent.mcpServers.remote-api = {
    url = "https://mcp.example.com/v1/mcp";
    headers.Authorization = "Bearer \${MCP_REMOTE_API_KEY}";
    timeout = 180;
  };
}
```

### OAuth を使う HTTP 経由 {#http-transport-with-oauth}

OAuth 2.1 を使うサーバーには `auth = "oauth"` を指定します。Hermes は PKCE の流れを一式実装しています。メタデータの探索、クライアントの動的登録、トークンの交換、自動更新まで含みます。

```nix
{
  services.hermes-agent.mcpServers.my-oauth-server = {
    url = "https://mcp.example.com/mcp";
    auth = "oauth";
  };
}
```

トークンは `$HERMES_HOME/mcp-tokens/<server-name>.json` に保存され、再起動しても再ビルドしても残ります。

<details>
<summary><strong>画面のないサーバーで最初の OAuth 認可を通す</strong></summary>

最初の OAuth 認可には、ブラウザでの同意が必要です。画面のない環境では、Hermes はブラウザを開く代わりに認可 URL を標準出力とログに表示します。

**方法 A: 対話的に一度だけ通す** — `docker exec`（コンテナ）または `sudo -u hermes`（ネイティブ）で一度だけ実行します。

```bash
# Container mode
docker exec -it hermes-agent \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth

# Native mode
sudo -u hermes HERMES_HOME=/var/lib/hermes/.hermes \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
```

コンテナは `--network=host` で動くので、`127.0.0.1` で待ち受ける OAuth のコールバックにホストのブラウザから届きます。

**方法 B: トークンを先に入れておく** — 手元の端末で認可を済ませてから、トークンをコピーします。

```bash
hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
scp ~/.hermes/mcp-tokens/my-oauth-server{,.client}.json \
    server:/var/lib/hermes/.hermes/mcp-tokens/
# Ensure: chown hermes:hermes, chmod 0600
```

</details>

### サンプリング（サーバー側から LLM を呼ぶ） {#sampling-server-initiated-llm-requests}

MCP サーバーの中には、エージェントに LLM の応答生成を頼めるものがあります。

```nix
{
  services.hermes-agent.mcpServers.analysis = {
    command = "npx";
    args = [ "-y" "analysis-server" ];
    sampling = {
      enabled = true;
      model = "google/gemini-3-flash";
      max_tokens_cap = 4096;
      timeout = 30;
      max_rpm = 10;
    };
  };
}
```

---

## 管理下モード {#managed-mode}

NixOS モジュール経由で hermes を動かしている場合、次の CLI コマンドは **使えなくなり**、`configuration.nix` を見るよう促すエラーが出ます。

| 使えなくなるコマンド | 理由 |
|---|---|
| `hermes setup` | 設定は宣言的です。Nix の設定にある `settings` を編集してください |
| `hermes config edit` | 設定は `settings` から生成されます |
| `hermes config set <key> <value>` | 設定は `settings` から生成されます |
| `hermes gateway install` | systemd のサービスは NixOS が管理します |
| `hermes gateway uninstall` | systemd のサービスは NixOS が管理します |

これによって、Nix が宣言した内容とディスク上の内容がずれるのを防ぎます。判定には 2 つの手がかりを使います。

1. **`HERMES_MANAGED` 環境変数。** サービスがこれを設定し、ゲートウェイのプロセスが読みます。
2. **`HERMES_HOME` にある `.managed` マーカーファイル。** 有効化のスクリプトが書き、対話的なシェルが読みます。そのため CLI は `docker exec -it hermes-agent hermes config set ...` のようなコマンドも止めます。

どちらの手がかりも、このインストールを管理しているシステムの名前を持っています。そのため、拒否のメッセージには正しい再ビルドのコマンドが出ます。NixOS モジュールなら `sudo nixos-rebuild switch`、Home Manager モジュールなら `home-manager switch` です。

---

## Home Manager モジュール {#home-manager-module}

この flake は `homeManagerModules.default` も公開しています。Hermes はひとりのためのエージェントです。認証情報も、記憶も、セッションも、cron ジョブも、すべてその人のものです。ですから個人の端末では、ユーザーサービスという形がふさわしいのです。NixOS だけでなく、Home Manager が対応しているどのディストリビューションでも動きます。

オプションの一式は NixOS モジュールと同じです。`services.hermes-agent` の下に、同じ `settings`、`environmentFiles`、`documents`、`mcpServers`、`extraPlugins`、`backend` があります。ここまでの例はどれもそのまま使えます。違うのは、違わざるをえない部分だけです。

| | NixOS モジュール | Home Manager モジュール |
|---|---|---|
| 動かす主体 | `user`、`group`、`createUser` で宣言したシステムユーザー | あなた自身 |
| 状態ディレクトリ | `stateDir` と `/.hermes` | `hermesHome` を直接指定します。既定は `~/.hermes` です。 |
| サービス | `systemd.services` | Linux では `systemd.user.services`、macOS では `launchd.agents` |
| PATH に載る CLI | `addToSystemPackages`。システム全体に `HERMES_HOME` を書き出します | `programs.hermes-agent.enable`。自分のセッションにだけ書き出します |
| デスクトップアプリ | 使えません。システムサービスはユーザーセッションを持てないからです | `programs.hermes-agent.desktop.enable` |
| コンテナモード | 使えます | 使えません。root と Docker のソケットが要るからです |

### flake の input に追加する {#add-the-flake-input}

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager.url = "github:nix-community/home-manager";
    home-manager.inputs.nixpkgs.follows = "nixpkgs";
    hermes-agent.url = "github:NousResearch/hermes-agent";
  };
}
```

そのうえで、Home Manager の設定にモジュールを import します。設定は単体でも構いませんし、NixOS や nix-darwin の設定の中で `home-manager.users.<name>` の下に置いても構いません。

```nix
{
  imports = [ hermes-agent.homeManagerModules.default ];

  services.hermes-agent = {
    enable = true;
    gateway.enable = true;
    settings.model.default = "anthropic/claude-sonnet-4";
    environmentFiles = [ config.sops.secrets."hermes-env".path ];
  };
}
```

`home-manager switch` を実行すると `~/.hermes` が作られ、`config.yaml` が書かれ、`.env` が組み立てられ、ゲートウェイがユーザーサービスとして起動します。

:::warning linger を有効にしないと、ログアウトでサービスが止まります
注意してください。自分のアカウントで linger を有効にしてください。linger がないと、最後のセッションが終わった時点で systemd がユーザーマネージャーを止め、ゲートウェイも一緒に止まります。linger はアカウントの属性なので、Home Manager からは設定できません。

```nix
# NixOS
users.users.your-username.linger = true;
```

```bash
# anywhere else
sudo loginctl enable-linger your-username
```

macOS に相当する設定はありません。`RunAtLoad` を付けた `launchd` のエージェントはログイン時に起動し、そのまま動き続けます。
:::

### デスクトップ / ダッシュボードのバックエンドを動かす {#running-the-desktop-dashboard-backend}

`gateway.enable` は、Telegram、Discord、Slack などのメッセージ用ゲートウェイを動かします。Hermes Desktop とブラウザのダッシュボードがつなぐ先は、*別の* プロセス、つまり `hermes serve` か `hermes dashboard` です。`backend.mode` はそのプロセスをゲートウェイと一緒に動かします。

```nix
{
  services.hermes-agent = {
    enable = true;
    gateway.enable = true;      # messaging platforms
    backend.mode = "dashboard"; # + the browser dashboard on 127.0.0.1:9119
    backend.port = 9119;
  };
}
```

`serve` は画面を持たずに動きます。Hermes Desktop がつなぐ `/api/ws` と `/api/pty` のソケットを提供し、ウェブアプリのビルドは行いません。`dashboard` はそのすべてに加えて、ブラウザの管理画面も配信します。どちらのプロセスもゲートウェイと同じ `HERMES_HOME` を使います。ですからセッション、スキル、記憶、cron ジョブはすべて共通です。`backend.mode` は NixOS モジュールでも同じように働きますが、コンテナモードでは使えません。

:::warning ループバック以外のアドレスにバインドする場合
既定のアドレスは `127.0.0.1` です。それ以外のアドレスにすると、ダッシュボードの認証ゲートが有効になります。サーバーは、バインドしたアドレスと違う `Host` ヘッダーの付いたリクエストも拒否します。これは DNS リバインディングへの備えです。クライアントが実際に使う名前かアドレスにバインドしてください。
:::

### 動いているか確かめる {#verify-it-works}

```bash
# Linux
systemctl --user status hermes-agent
journalctl --user -u hermes-agent -f

# macOS
launchctl list | grep hermes
tail -f ~/Library/Logs/hermes-agent.log

hermes --version
hermes config     # shows the configuration that Nix wrote
```

---

## コンテナの構成 {#container-architecture}

:::info
この節は `container.enable = true` を使う場合にだけ関係します。ネイティブモードで動かしているなら読み飛ばして構いません。
:::

コンテナモードを有効にすると、hermes は永続的な Ubuntu コンテナの中で動き、Nix でビルドしたバイナリがホストから読み取り専用で bind mount されます。

```
Host                                    Container
────                                    ─────────
/nix/store/...-hermes-agent-0.1.0  ──►  /nix/store/... (ro)
~/.hermes -> /var/lib/hermes/.hermes       (symlink bridge, per hostUsers)
/var/lib/hermes/                    ──►  /data/          (rw)
  ├── current-package -> /nix/store/...    (symlink, updated each rebuild)
  ├── .gc-root -> /nix/store/...           (prevents nix-collect-garbage)
  ├── .container-identity                  (sha256 hash, triggers recreation)
  ├── .hermes/                             (HERMES_HOME)
  │   ├── .env                             (merged from environment + environmentFiles)
  │   ├── config.yaml                      (Nix-generated, deep-merged by activation)
  │   ├── .managed                         (marker file)
  │   ├── .container-mode                  (routing metadata: backend, exec_user, etc.)
  │   ├── state.db, sessions/, memories/   (runtime state)
  │   └── mcp-tokens/                      (OAuth tokens for MCP servers)
  ├── home/                                ──►  /home/hermes    (rw)
  └── workspace/                           (agent working directory)
      ├── AGENTS.md                        (from the documents option)
      └── (agent-created files)

Container writable layer (apt/pip/npm):   /usr, /usr/local, /tmp
```

Nix でビルドしたバイナリが Ubuntu コンテナの中で動くのは、`/nix/store` が bind mount されているからです。インタープリターも依存関係も自前で持ち込むので、コンテナ側のシステムライブラリに頼りません。コンテナの起動処理は `current-package` シンボリックリンクをたどります。実体は `/data/current-package/bin/hermes gateway run --replace` です。`nixos-rebuild switch` のときに更新されるのはこのシンボリックリンクだけで、コンテナは動き続けます。

### 何がどこまで残るか {#what-persists-across-what}

| 出来事 | コンテナは作り直される？ | `/data`（状態） | `/home/hermes` | 書き込みレイヤー（`apt`/`pip`/`npm`） |
|---|---|---|---|---|
| `systemctl restart hermes-agent` | いいえ | 残ります | 残ります | 残ります |
| `nixos-rebuild switch`（コードの更新） | いいえ（シンボリックリンクの更新のみ） | 残ります | 残ります | 残ります |
| ホストの再起動 | いいえ | 残ります | 残ります | 残ります |
| `nix-collect-garbage` | いいえ（GC ルートがあります） | 残ります | 残ります | 残ります |
| イメージの変更（`container.image`） | **はい** | 残ります | 残ります | **失われます** |
| ボリュームやオプションの変更 | **はい** | 残ります | 残ります | **失われます** |
| `environment` / `environmentFiles` の変更 | いいえ | 残ります | 残ります | 残ります |

コンテナが作り直されるのは、その **識別ハッシュ** が変わったときだけです。ハッシュの対象は、スキーマのバージョン、イメージ、`extraVolumes`、`extraOptions`、起動スクリプトです。環境変数、設定、ドキュメント、hermes パッケージそのものの変更では、作り直しは **起きません**。

:::warning 書き込みレイヤーが失われます
識別ハッシュが変わると（イメージの更新、ボリュームの追加、コンテナオプションの追加）、コンテナは破棄され、`container.image` を取り直して作り直されます。書き込みレイヤーに `apt install`、`pip install`、`npm install` で入れたパッケージは失われます。`/data` と `/home/hermes` の状態は残ります（こちらは bind mount だからです）。

エージェントが特定のパッケージに依存しているなら、独自イメージに焼き込む（`container.image = "my-registry/hermes-base:latest"`）か、エージェントの SOUL.md にインストール手順を書いておくことを検討してください。
:::

### GC ルートによる保護 {#gc-root-protection}

`preStart` のスクリプトは、現在の hermes パッケージを指す GC ルートを `${stateDir}/.gc-root` に作ります。これによって `nix-collect-garbage` が、動作中のバイナリを消してしまうのを防ぎます。何かの拍子に GC ルートが壊れても、サービスを再起動すれば作り直されます。

---

## プラグイン {#plugins}

NixOS モジュールは、プラグインの宣言的なインストールに対応しています。手作業の `hermes plugins install` は要りません。

### ディレクトリ型のプラグイン（`extraPlugins`） {#directory-plugins-extraplugins}

`plugin.yaml` と `__init__.py` を含むソースツリーだけのプラグイン（たとえば [hermes-lcm](https://github.com/stephenschoettler/hermes-lcm)）向けです。

```nix
services.hermes-agent.extraPlugins = [
  (pkgs.fetchFromGitHub {
    owner = "stephenschoettler";
    repo = "hermes-lcm";
    rev = "v0.7.0";
    hash = "sha256-...";
  })
];
```

プラグインは有効化のときに `$HERMES_HOME/plugins/` へシンボリックリンクされます。Hermes は通常のディレクトリ走査でそれを見つけます。一覧からプラグインを外して `nixos-rebuild switch` を実行すれば、シンボリックリンクも消えます。

### エントリーポイント型のプラグイン（`extraPythonPackages`） {#entry-point-plugins-extrapythonpackages}

`[project.entry-points."hermes_agent.plugins"]` で登録される、pip パッケージ形式のプラグイン（たとえば [rtk-hermes](https://github.com/ogallotti/rtk-hermes)）向けです。

```nix
services.hermes-agent.extraPythonPackages = [
  (pkgs.python312Packages.buildPythonPackage {
    pname = "rtk-hermes";
    version = "1.0.0";
    src = pkgs.fetchFromGitHub {
      owner = "ogallotti";
      repo = "rtk-hermes";
      rev = "v1.0.0";
      hash = "sha256-...";
    };
    format = "pyproject";
    build-system = [ pkgs.python312Packages.setuptools ];
  })
];
```

そのパッケージの `site-packages` が、hermes のラッパーで PYTHONPATH に追加されます。セッションの開始時に `importlib.metadata` がエントリーポイントを見つけます。

### 追加の依存グループ（`extraDependencyGroups`） {#optional-dependency-groups-extradependencygroups}

hermes-agent の `pyproject.toml` に宣言されている追加機能を使うには、`extraDependencyGroups` を指定して、ビルド時に封じた venv へ含めます。既定の `[all]` に入っていない追加機能では、これが必須です。Nix では読み取り専用のストアに実行時インストールができないからです。

```nix
# Enable Discord, Telegram, Slack
services.hermes-agent.extraDependencyGroups = [ "messaging" ];
```

```nix
# Enable a memory provider
services.hermes-agent = {
  extraDependencyGroups = [ "hindsight" ];
  settings.memory.provider = "hindsight";
};
```

これらは中核の依存関係と一緒に uv が解決します。PYTHONPATH を書き換える必要も、衝突の心配もありません。使えるグループは次のとおりです。

| グループ | 有効になるもの |
|-------|-----------------|
| `messaging` | Discord、Telegram、Slack |
| `matrix` | Matrix / Element（暗号化に対応した mautrix。Linux のみ） |
| `dingtalk` | DingTalk |
| `feishu` | Feishu / Lark |
| `voice` | 手元での音声認識（faster-whisper） |
| `edge-tts` | Edge TTS のプロバイダー |
| `tts-premium` | ElevenLabs の TTS |
| `anthropic` | Anthropic 純正の SDK（OpenRouter 経由なら不要です） |
| `bedrock` | AWS Bedrock（boto3） |
| `azure-identity` | Azure Entra ID による認証 |
| `honcho` | Honcho の記憶プロバイダー |
| `hindsight` | Hindsight の記憶プロバイダー |
| `modal` | Modal のターミナルバックエンド |
| `daytona` | Daytona のターミナルバックエンド |
| `exa` | Exa のウェブ検索 |
| `firecrawl` | Firecrawl のウェブ検索 |
| `fal` | FAL の画像生成 |

追加機能を個別に設定する代わりに、ビルド済みの `#messaging` や `#full` の flake パッケージを使うこともできます（[クイックスタート](#quick-start-any-nix-user)を参照）。

**どれを使うか:**

| やりたいこと | オプション |
|------|--------|
| pyproject.toml の追加機能を有効にする | `extraDependencyGroups` |
| pyproject.toml にない外部の Python プラグインを足す | `extraPythonPackages` |
| システムのコマンド（pandoc、jq など）を足す | `extraPackages` |
| ディレクトリ型のプラグインのソースツリーを足す | `extraPlugins` |

### 両方を組み合わせる {#combining-both}

サードパーティの Python 依存を持つディレクトリ型プラグインには、両方のオプションが要ります。

```nix
services.hermes-agent = {
  extraPlugins = [ my-plugin-src ];          # plugin source
  extraPythonPackages = [ pkgs.python312Packages.redis ];  # its Python dep
  extraPackages = [ pkgs.redis ];            # system binary it needs
};
```

### overlay を使う {#using-the-overlay}

外部の flake から、パッケージを直接差し替えられます。

```nix
{
  inputs.hermes-agent.url = "github:NousResearch/hermes-agent";
  outputs = { hermes-agent, nixpkgs, ... }: {
    nixpkgs.overlays = [ hermes-agent.overlays.default ];
    # Then:
    #   pkgs.hermes-agent.override { extraPythonPackages = [...]; }
    #   pkgs.hermes-agent.override { extraDependencyGroups = [ "hindsight" ]; }
  };
}
```

### プラグインの設定 {#plugin-configuration}

プラグインは、それでも `config.yaml` で有効にする必要があります。宣言的な設定から追加してください。

```nix
services.hermes-agent.settings.plugins.enabled = [
  "hermes-lcm"
  "rtk-rewrite"
];
```

:::note
ビルド時の衝突チェックによって、プラグインのパッケージが hermes 本体の依存関係を覆い隠すことを防いでいます。封じた venv にすでにあるパッケージをプラグインが持ち込むと、`nixos-rebuild` がわかりやすいエラーで止まります。
:::

---

## 開発 {#development}

### 開発用シェル {#dev-shell}

この flake は、Python 3.12、uv、Node.js、実行時のツール一式が入った開発用シェルを提供します。

```bash
cd hermes-agent
nix develop

# Shell provides:
#   - Python 3.12 + uv (deps installed into .venv on first entry)
#   - Node.js 26, ripgrep, git, openssh, ffmpeg on PATH
#   - Stamp-file optimization: re-entry is near-instant if deps haven't changed

hermes setup
hermes chat
```

### direnv（おすすめ） {#direnv-recommended}

同梱の `.envrc` が、開発用シェルを自動で有効にします。

```bash
cd hermes-agent
direnv allow    # one-time
# Subsequent entries are near-instant (stamp file skips dep install)
```

### flake のチェック {#flake-checks}

この flake には、CI でも手元でも走るビルド時の検証が含まれています。

```bash
# Run all checks
nix flake check

# Individual checks
nix build .#checks.x86_64-linux.package-contents   # binaries exist + version
nix build .#checks.x86_64-linux.entry-points-sync  # pyproject.toml ↔ Nix package sync
nix build .#checks.x86_64-linux.cli-commands        # gateway/config subcommands
nix build .#checks.x86_64-linux.managed-guard       # HERMES_MANAGED blocks mutation
nix build .#checks.x86_64-linux.bundled-skills      # skills present in package
nix build .#checks.x86_64-linux.config-roundtrip    # merge script preserves user keys
```

<details>
<summary><strong>各チェックが確かめていること</strong></summary>

| チェック | 確かめる内容 |
|---|---|
| `package-contents` | `hermes` と `hermes-agent` のバイナリが存在し、`hermes --version` が動くこと |
| `entry-points-sync` | `pyproject.toml` の `[project.scripts]` の各項目に、Nix パッケージ側のラップされたバイナリがあること |
| `cli-commands` | `hermes --help` に `gateway` と `config` のサブコマンドが出ること |
| `managed-guard` | `HERMES_MANAGED=true hermes config set ...` が NixOS 用のエラーを表示すること |
| `bundled-skills` | スキルのディレクトリがあり、SKILL.md を含み、ラッパーで `HERMES_BUNDLED_SKILLS` が設定されていること |
| `config-roundtrip` | マージの 7 つの場面: 新規インストール、Nix による上書き、利用者のキーの保持、混在したマージ、MCP の追記的マージ、入れ子の深いマージ、冪等性 |

</details>

---

## オプション早見表 {#options-reference}

### 基本 {#core}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `enable` | `bool` | `false` | hermes-agent のサービスを有効にします |
| `package` | `package` | `hermes-agent` | 使う hermes-agent のパッケージ |
| `user` | `str` | `"hermes"` | システムユーザー |
| `group` | `str` | `"hermes"` | システムグループ |
| `createUser` | `bool` | `true` | ユーザーとグループを自動で作ります |
| `stateDir` | `str` | `"/var/lib/hermes"` | 状態ディレクトリ（`HERMES_HOME` の親） |
| `workingDirectory` | `str` | `"${stateDir}/workspace"` | エージェントの作業ディレクトリ |
| `addToSystemPackages` | `bool` | `false` | `hermes` CLI をシステムの PATH に入れ、`HERMES_HOME` をシステム全体に設定します |

### 設定 {#configuration}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `settings` | `attrs`（深くマージされます） | `{}` | `config.yaml` として書き出される宣言的な設定。任意の入れ子に対応し、複数の定義は `lib.recursiveUpdate` でマージされます |
| `configFile` | `null` または `path` | `null` | 既存の `config.yaml` へのパス。設定すると `settings` を完全に上書きします |

### シークレットと環境変数 {#secrets-environment}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `environmentFiles` | `listOf str` | `[]` | シークレットを含む env ファイルのパス。有効化のときに `$HERMES_HOME/.env` へまとめられます |
| `environment` | `attrsOf str` | `{}` | 秘密でない環境変数。**Nix ストアから見えます**。ここに秘密の値を書かないでください |
| `authFile` | `null` または `path` | `null` | OAuth 認証情報の初期値。最初の配置時にだけコピーされます |
| `authFileForceOverwrite` | `bool` | `false` | 有効化のたびに `authFile` から `auth.json` を上書きします |

### ドキュメント {#documents}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `documents` | `attrsOf (either str path)` | `{}` | 作業ディレクトリのファイル。各キーは `workingDirectory` からの相対パスです。使うにはそのオプションの設定が必要です。 |
| `hermesHomeFiles` | `attrsOf (either str path)` | `{}` | `HERMES_HOME` に置くファイル。`SOUL.md` と `memories/` はここに置かないと、Hermes が読み込みません。 |

### MCP サーバー {#mcp-servers}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `mcpServers` | `attrsOf submodule` | `{}` | MCP サーバーの定義。`settings.mcp_servers` にマージされます |
| `mcpServers.<name>.command` | `null` または `str` | `null` | サーバーのコマンド（stdio 経由） |
| `mcpServers.<name>.args` | `listOf str` | `[]` | コマンドの引数 |
| `mcpServers.<name>.env` | `attrsOf str` | `{}` | サーバープロセスに渡す環境変数 |
| `mcpServers.<name>.url` | `null` または `str` | `null` | サーバーのエンドポイント URL（HTTP / StreamableHTTP 経由） |
| `mcpServers.<name>.headers` | `attrsOf str` | `{}` | HTTP ヘッダー。たとえば `Authorization` |
| `mcpServers.<name>.auth` | `null` または `"oauth"` | `null` | 認証方式。`"oauth"` にすると OAuth 2.1 の PKCE を使います |
| `mcpServers.<name>.enabled` | `bool` | `true` | このサーバーを使うかどうか |
| `mcpServers.<name>.timeout` | `null` または `int` | `null` | ツール呼び出しのタイムアウト秒数（既定: 120） |
| `mcpServers.<name>.connect_timeout` | `null` または `int` | `null` | 接続のタイムアウト秒数（既定: 60） |
| `mcpServers.<name>.tools` | `null` または `submodule` | `null` | ツールの絞り込み（`include` / `exclude` の一覧） |
| `mcpServers.<name>.sampling` | `null` または `submodule` | `null` | サーバー側から LLM を呼ぶときのサンプリング設定 |

### サービスの挙動 {#service-behavior}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `extraArgs` | `listOf str` | `[]` | `hermes gateway` に渡す追加の引数 |
| `extraPackages` | `listOf package` | `[]` | エージェントが使える追加パッケージ。hermes ユーザーのプロファイルに入るので、ターミナルのコマンド、スキル、cron ジョブのどこからでも見えます |
| `extraPlugins` | `listOf package` | `[]` | `$HERMES_HOME/plugins/` へシンボリックリンクするディレクトリ型プラグインのパッケージ。それぞれ `plugin.yaml` を含む必要があります |
| `extraPythonPackages` | `listOf package` | `[]` | エントリーポイント型プラグインの検出のため PYTHONPATH に追加する Python パッケージ。`python312Packages` でビルドしてください |
| `extraDependencyGroups` | `listOf str` | `[]` | 封じた venv に含める pyproject.toml の追加機能（たとえば `["hindsight"]`）。uv が解決するので衝突しません |
| `restart` | `str` | `"always"` | systemd の `Restart=` の方針。macOS では使われません。 |
| `restartSec` | `int` | `5` | systemd の `RestartSec=` の値。macOS では使われません。 |

### バックエンド（`hermes serve` / `hermes dashboard`） {#backend-hermes-serve-hermes-dashboard}

このオプションは、Hermes Desktop とブラウザのダッシュボードがつなぐプロセスを、ゲートウェイと一緒に動かします。`container.enable` とは併用できません。

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `backend.mode` | `enum ["none" "serve" "dashboard"]` | `"none"` | `serve` は画面を持たずに動き、`/api/ws` と `/api/pty` を提供します。`dashboard` はブラウザの管理画面も配信します。 |
| `backend.host` | `str` | `"127.0.0.1"` | バインドするアドレス。ループバック以外にすると認証ゲートが有効になります。 |
| `backend.port` | `port` | `9119` | バインドするポート |
| `backend.extraArgs` | `listOf str` | `[]` | バックエンドのコマンドに渡す追加の引数 |

### Home Manager 専用 {#home-manager-only}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `hermesHome` | `str` | `"${config.home.homeDirectory}/.hermes"` | `HERMES_HOME` を直接指定します。NixOS モジュールはこれを `stateDir` から組み立てます。 |
| `gateway.enable` | `bool` | `false` | メッセージ用のゲートウェイを動かします。NixOS モジュールではゲートウェイがサービスそのものなので、このオプションはありません。 |

### `programs.hermes-agent`（Home Manager 専用） {#programshermes-agent-home-manager-only}

Home Manager は「このアプリを入れる」と「この常駐プロセスを動かす」を
分けて扱います。`services.hermes-agent` は状態、設定、常駐プロセスを
受け持ちます。`programs.hermes-agent` は自分で使うものを入れ、
`hermesHome` とバックエンドのアドレスをサービス側から読みます。

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `enable` | `bool` | `false` | `hermes` CLI を `home.packages` に加え、自分のシェルに `HERMES_HOME` を書き出します |
| `package` | `package` | `services.hermes-agent.package` | 入れるパッケージ。既定ではサービス側の `extraPythonPackages` と `extraDependencyGroups` が反映されるので、ビルドは 1 回で済みます。 |
| `desktop.enable` | `bool` | `false` | Hermes Desktop アプリを追加します。Linux ではランチャーの項目も付きます |
| `desktop.package` | `package` | `package.hermesDesktop` | デスクトップ用のパッケージ。既定では `package` に追従するので、アプリとサービスが同じ Hermes ランタイムで動きます。 |

```nix
programs.hermes-agent = {
  enable = true;
  desktop.enable = true;
};

services.hermes-agent = {
  enable = true;
  backend.mode = "serve";
  backend.sessionTokenFile = config.sops.secrets."hermes/desktop-token".path;
};
```

ランチャーは `HERMES_HOME` を自分で持ちます。デスクトップのメニューは
シェルのプロファイルを読まないので、`programs.hermes-agent.enable` が
`home.sessionVariables` で書き出す値は、対話的なシェルにしか届きません。
ランチャーにこの値がないと、アプリは `~/.hermes` を開くのに
サービスは `hermesHome` を使うことになり、セッションもキーも見えなくなります。

`backend.sessionTokenFile` を使うと、アプリは自前のバックエンドを起動せず、
サービスのバックエンドにつなぎます。両側とも起動時にこのファイルを読むので、
トークンが Nix ストアのパスに入ることはありません。このオプションがない場合は、
それぞれが自前のバックエンドを動かします。

`services.hermes-agent.installPackage` は、この分割によって削除されました。
まだこれを設定している構成では、代わりに何を使うかを示すエラーが出ます。

### コンテナ（NixOS 専用） {#container-nixos-only}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `container.enable` | `bool` | `false` | OCI コンテナモードを有効にします |
| `container.backend` | `enum ["docker" "podman"]` | `"docker"` | コンテナのランタイム |
| `container.image` | `str` | `"ubuntu:24.04"` | ベースイメージ（実行時に取得されます） |
| `container.extraVolumes` | `listOf str` | `[]` | 追加のボリュームマウント（`host:container:mode`） |
| `container.extraOptions` | `listOf str` | `[]` | `docker create` に渡す追加の引数 |
| `container.hostUsers` | `listOf str` | `[]` | サービスの stateDir への `~/.hermes` シンボリックリンクを受け取り、`hermes` グループへ自動追加される対話利用のユーザー |

---

## ディレクトリの構成 {#directory-layout}

### ネイティブモード {#native-mode}

```
/var/lib/hermes/                     # stateDir (owned by hermes:hermes, 0750)
├── .hermes/                         # HERMES_HOME
│   ├── SOUL.md                      # from hermesHomeFiles: the agent identity
│   ├── config.yaml                  # Nix-generated (deep-merged each rebuild)
│   ├── .managed                     # Marker: CLI config mutation blocked
│   ├── .env                         # Merged from environment + environmentFiles
│   ├── auth.json                    # OAuth credentials (seeded, then self-managed)
│   ├── gateway.pid
│   ├── state.db
│   ├── mcp-tokens/                  # OAuth tokens for MCP servers
│   ├── sessions/
│   ├── memories/
│   ├── skills/
│   ├── cron/
│   └── logs/
├── home/                            # Agent HOME
└── workspace/                       # Agent working directory
    ├── AGENTS.md                    # from the documents option
    └── (agent-created files)
```

### Home Manager {#home-manager}

```
~/.hermes/                           # hermesHome (HERMES_HOME), 0700
├── SOUL.md                          # from hermesHomeFiles
├── config.yaml                      # written by Nix, merged at each activation
├── .managed                         # marker: names the system that manages this
├── .env                             # written again from environment + environmentFiles
├── auth.json                        # OAuth credentials: seeded, then Hermes owns it
├── memories/  sessions/  skills/  cron/  logs/  plugins/
└── (runtime state)

~/                                   # workingDirectory, your home by default
└── AGENTS.md                        # from the documents option
```

### コンテナモード {#container-mode}

構成は同じで、それをコンテナへマウントします。

| コンテナ側のパス | ホスト側のパス | モード | 補足 |
|---|---|---|---|
| `/nix/store` | `/nix/store` | `ro` | hermes のバイナリと Nix の依存関係すべて |
| `/data` | `/var/lib/hermes` | `rw` | 状態、設定、作業ディレクトリのすべて |
| `/home/hermes` | `${stateDir}/home` | `rw` | 消えないエージェントのホーム。`pip install --user` やツールのキャッシュ置き場です |
| `/usr`、`/usr/local`、`/tmp` | （書き込みレイヤー） | `rw` | `apt` / `pip` / `npm` で入れたもの。再起動しても残りますが、作り直しで失われます |

---

## 更新する {#updating}

```bash
# Update the flake input (run from the directory containing flake.nix)
cd /etc/nixos && nix flake update hermes-agent

# Rebuild
sudo nixos-rebuild switch          # for the NixOS module
home-manager switch                # for the Home Manager module
```

コンテナモードでは `current-package` のシンボリックリンクが更新され、再起動したエージェントが新しいバイナリを使い始めます。コンテナの作り直しも、入れたパッケージの消失もありません。

---

## うまくいかないとき {#troubleshooting}

:::tip Podman を使っている場合
以下の `docker` コマンドは、すべて `podman` でも同じように動きます。`container.backend = "podman"` にしているなら読み替えてください。
:::

### サービスのログ {#service-logs}

```bash
# Both modes use the same systemd unit
journalctl -u hermes-agent -f

# Container mode: also available directly
docker logs -f hermes-agent
```

### コンテナの中を見る {#container-inspection}

```bash
systemctl status hermes-agent
docker ps -a --filter name=hermes-agent
docker inspect hermes-agent --format='{{.State.Status}}'
docker exec -it hermes-agent bash
docker exec hermes-agent readlink /data/current-package
docker exec hermes-agent cat /data/.container-identity
```

### コンテナを強制的に作り直す {#force-container-recreation}

書き込みレイヤーを初期状態（まっさらな Ubuntu）に戻したい場合は次のとおりです。

```bash
sudo systemctl stop hermes-agent
docker rm -f hermes-agent
sudo rm /var/lib/hermes/.container-identity
sudo systemctl start hermes-agent
```

### シークレットが読み込まれているか確かめる {#verify-secrets-are-loaded}

エージェントは起動するのに LLM のプロバイダーで認証できない場合は、`.env` ファイルが正しくまとめられているか確かめてください。

```bash
# Native mode
sudo -u hermes cat /var/lib/hermes/.hermes/.env

# Container mode
docker exec hermes-agent cat /data/.hermes/.env
```

### GC ルートの確認 {#gc-root-verification}

```bash
nix-store --query --roots $(docker exec hermes-agent readlink /data/current-package)
```

### よくあるつまずき {#common-issues}

| 症状 | 原因 | 対処 |
|---|---|---|
| `Cannot save configuration: managed by NixOS` | CLI の保護が働いています | `configuration.nix` を編集して `nixos-rebuild switch` を実行します |
| `No adapter available for discord`（telegram や slack でも同様） | 封じた Nix の venv にメッセージ連携の依存が入っていません | `#messaging` の版を入れます: `nix profile install ...#messaging`。NixOS モジュールなら `extraDependencyGroups = [ "messaging" ]` です。根本の原因は `journalctl -u hermes-agent` で `FeatureUnavailable` や `requirements not met` を探すとわかります。 |
| コンテナが思いがけず作り直された | `extraVolumes`、`extraOptions`、`image` のどれかが変わりました | 想定どおりの動きです。書き込みレイヤーは初期化されます。パッケージを入れ直すか、独自イメージを使ってください |
| `hermes --version` が古い版を表示する | コンテナが再起動されていません | `systemctl restart hermes-agent` を実行します |
| `/var/lib/hermes` で権限がないと言われる | 状態ディレクトリが `0750 hermes:hermes` になっています | `docker exec` か `sudo -u hermes` を使ってください |
| `nix-collect-garbage` が hermes を消した | GC ルートがありません | サービスを再起動してください（preStart が GC ルートを作り直します） |
| `no container with name or ID "hermes-agent"`（Podman） | Podman の rootful なコンテナは一般ユーザーから見えません | podman にパスワードなしの sudo を許可してください（[コンテナモード](#container-mode)の節を参照） |
| `unable to find user hermes` | コンテナがまだ起動中です（起動処理がユーザーを作り終えていません） | 数秒待って再実行してください。CLI は自動で再試行します |
| `extraPackages` で足したツールがターミナルで見つからない | ユーザーのプロファイルを更新するため `nixos-rebuild switch` が必要です | 再ビルドして再起動します: `nixos-rebuild switch && systemctl restart hermes-agent` |
