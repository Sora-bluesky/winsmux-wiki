---
title: "Nix と NixOS のセットアップ"
description: "Nix で Hermes Agent をインストールして運用する方法。手軽な `nix run` から、コンテナモードを含む完全に宣言的な NixOS モジュールまで"
upstream_path: getting-started/nix-setup.md
upstream_blob: a663721a914a3bd6681f61c2479af0dd62d0115e
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/nix-setup
---

# Nix と NixOS のセットアップ {#nix-nixos-setup}

:::warning ティア 2 のプラットフォーム
Nix と NixOS は [ティア 2 のプラットフォーム](/hermes/docs/getting-started/platform-support/#tier-2) です。ここで説明する flake と NixOS モジュールは、できる範囲での対応にとどまります。`main` へのコミットによって、これらのパッケージがいつ壊れてもおかしくありません。

サポートされた構成にしたい場合は、標準の[インストール](/hermes/docs/getting-started/installation/)の手順、つまり Docker か FHS 環境のどちらかを使ってください。
:::

Hermes Agent は、Nix flake、NixOS モジュール、Home Manager モジュールを同梱しています。

| レベル | 向いている人 | 得られるもの |
|-------|-------------|--------------|
| **`nix run` / `nix profile install`** | Nix を使うすべての人（macOS、Linux） | 依存関係を含むビルド済みのバイナリ。あとは標準の CLI の流れで使う |
| **Home Manager モジュール** | 個人用のエージェントを、任意のディストリビューションや macOS で動かしたい人 | root なしで、宣言的な設定とユーザーサービスが手に入る |
| **NixOS モジュール（ネイティブ）** | NixOS のサーバー運用 | 宣言的な設定、堅牢化された systemd サービス、管理されたシークレット |
| **NixOS モジュール（コンテナ）** | 自分自身を書き換える必要があるエージェント | 上記すべてに加え、エージェントが `apt` / `pip` / `npm install` を実行できる永続的な Ubuntu コンテナ |

:::info 標準のインストールとの違い
`curl | bash` のインストーラは、Python、Node、依存関係を自前で管理します。Nix flake はそれらすべてを置き換えます。Python の依存関係はすべて [uv2nix](https://github.com/pyproject-nix/uv2nix) がビルドする Nix の derivation となり、実行時のツール（Node.js、git、ripgrep、ffmpeg）はバイナリの PATH に組み込まれます。実行時の pip も、venv の有効化も、`npm install` もありません。

**NixOS 以外を使う人にとって**は、変わるのはインストールの段階だけです。そのあとの（`hermes setup`、`hermes gateway install`、設定の編集といった）操作は、標準のインストールとまったく同じように動きます。

**NixOS モジュールを使う人にとって**は、ライフサイクル全体が変わります。設定は `configuration.nix` に置かれ、シークレットは sops-nix / agenix を通り、サービスは systemd のユニットになり、設定変更の CLI コマンドはブロックされます。他の NixOS のサービスと同じやり方で hermes を管理することになります。
:::

## 前提条件 {#prerequisites}

- **flakes を有効にした Nix** — [Determinate Nix](https://install.determinate.systems) がおすすめです（flakes が既定で有効になります）
- 使いたいサービスの **API キー**（最低でも OpenRouter か Anthropic のキーが 1 つ）

---

## クイックスタート（Nix を使うすべての人向け） {#quick-start-any-nix-user}

clone は不要です。取得もビルドも実行も、Nix がまとめて行います。

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

`nix profile install` のあとは、`hermes`、`hermes-agent`、`hermes-acp` が PATH に載ります。ここから先の流れは[標準のインストール](/hermes/docs/getting-started/installation/)と同じで、`hermes setup` がプロバイダの選択を案内し、`hermes gateway install` が launchd（macOS）または systemd のユーザーサービスを用意し、設定は `~/.hermes/` に置かれます。

:::warning メッセージングのプラットフォーム（Discord、Telegram、Slack）
既定のパッケージには、hermes-agent が必要とする可能性のあるライブラリがすべて含まれます。もっと小さい構成が欲しい場合は、flake の他の出力を確認してください。 

`default` のパッケージは、クロージャに約 700 MB を追加します。メッセージングのプラットフォームだけが必要なら、`#messaging` の追加はわずか約 33 MB です。

:::

<details>
<summary><strong>ローカルの clone から動かす</strong></summary>

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
nix develop
hermes setup
```

</details>

---

## NixOS モジュール {#nixos-module}

flake は `nixosModules.default` を出力します。これは、ユーザーの作成、ディレクトリ、設定の生成、シークレット、ドキュメント、サービスのライフサイクルを宣言的に管理する、完全な NixOS のサービスモジュールです。

:::note
このモジュールには NixOS が必要です。Hermes は個人のためのエージェントです。個人のためのエージェントが欲しく、システムのサービスにはしたくない場合は、[Home Manager モジュール](#home-manager-module)を使ってください。そちらのモジュールは NixOS でも、Home Manager が対応している他のシステムでも動きます。
:::

### flake の input を追加する {#add-the-flake-input}

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

### 最小限の設定 {#minimal-configuration}

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

必要なのはこれだけです。`nixos-rebuild switch` を実行すると、`hermes` ユーザーが作られ、`config.yaml` が生成され、シークレットが結び付けられ、ゲートウェイが起動します。ゲートウェイは、エージェントをメッセージングのプラットフォーム（Telegram、Discord など）につなぎ、届いたメッセージを待ち受ける常駐のサービスです。

:::warning シークレットは必須です
上の `environmentFiles` の行は、[sops-nix](https://github.com/Mic92/sops-nix) か [agenix](https://github.com/ryantm/agenix) を設定済みであることを前提にしています。指定するファイルには、少なくとも 1 つの LLM プロバイダのキー（例えば `OPENROUTER_API_KEY=sk-or-...`）が含まれている必要があります。詳しい設定は[シークレットの管理](#secrets-management)を参照してください。シークレット管理の仕組みがまだ無い場合は、出発点として平文のファイルを使えます。ただし、誰でも読める状態にはしないでください。

```bash
echo "OPENROUTER_API_KEY=sk-or-your-key" | sudo install -m 0600 -o hermes /dev/stdin /var/lib/hermes/env
```

```nix
services.hermes-agent.environmentFiles = [ "/var/lib/hermes/env" ];
```
:::

:::tip addToSystemPackages
`addToSystemPackages = true` を設定すると、2 つのことが起きます。`hermes` の CLI をシステムの PATH に載せること、**そして** `HERMES_HOME` をシステム全体に設定し、対話的な CLI がゲートウェイのサービスと状態（セッション、スキル、cron）を共有するようにすることです。設定しないと、シェルで `hermes` を実行したときに別の `~/.hermes/` ディレクトリが作られてしまいます。
:::

### コンテナを認識する CLI {#container-aware-cli}

:::info
`container.enable = true` かつ `addToSystemPackages = true` の場合、ホスト上の **すべての** `hermes` コマンドが、管理下のコンテナへ自動的に転送されます。つまり、対話的な CLI のセッションが、ゲートウェイのサービスと同じ環境の中で動き、コンテナにインストールされたパッケージやツールをすべて使えます。

- 転送は意識せずに済みます。`hermes chat`、`hermes sessions list`、`hermes --version` などは、いずれも裏側でコンテナの中に入って実行されます
- CLI のフラグはすべてそのまま引き渡されます
- コンテナが動いていない場合、CLI は少しの間だけ再試行し（対話的な用途ではスピナー付きで 5 秒、スクリプト向けには無表示で 10 秒）、そのあと明確なエラーで失敗します。黙って別の経路に落ちることはありません
- hermes のコードベースを開発する場合は、`HERMES_DEV=1` を設定するとコンテナへの転送を回避し、ローカルのチェックアウトを直接実行できます

`container.hostUsers` を設定すると、サービスの状態ディレクトリを指す `~/.hermes` のシンボリックリンクが作られ、ホストの CLI とコンテナがセッション、設定、メモリを共有します。

```nix
services.hermes-agent = {
  container.enable = true;
  container.hostUsers = [ "your-username" ];
  addToSystemPackages = true;
};
```

`hostUsers` に挙げたユーザーは、ファイルの権限を得るために `hermes` グループへ自動で追加されます。

**Podman を使う場合:** NixOS のサービスは、コンテナを root で動かします。Docker の場合は `docker` グループのソケット経由でアクセスできますが、Podman の rootful なコンテナには sudo が必要です。使っているコンテナランタイムに対して、パスワード不要の sudo を許可してください。

```nix
security.sudo.extraRules = [{
  users = [ "your-username" ];
  commands = [{
    command = "/run/current-system/sw/bin/podman";
    options = [ "NOPASSWD" ];
  }];
}];
```

CLI は sudo が必要かどうかを自動で判断し、意識させずに使います。この設定が無いと、`sudo hermes chat` のように手で実行することになります。
:::

### 動作を確認する {#verify-it-works}

`nixos-rebuild switch` のあと、サービスが動いていることを確認します。

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

このモジュールは 2 つのモードに対応しており、`container.enable` で切り替えます。

| | **ネイティブ**（既定） | **コンテナ** |
|---|---|---|
| 動き方 | ホスト上の堅牢化された systemd サービス | `/nix/store` をバインドマウントした永続的な Ubuntu コンテナ |
| セキュリティ | `NoNewPrivileges`、`ProtectSystem=strict`、`PrivateTmp` | コンテナによる隔離。内部では非特権ユーザーとして動く |
| エージェントが自分でパッケージを入れられるか | 不可 — Nix が用意した PATH 上のツールのみ | 可能 — `apt`、`pip`、`npm` でのインストールが再起動をまたいで残る |
| 設定の書き方 | 同じ | 同じ |
| どちらを選ぶか | 標準的な運用、最大限のセキュリティ、再現性 | エージェントが実行時にパッケージを入れる必要がある、書き換えられる環境、実験的なツール |

コンテナモードを有効にするには、1 行足すだけです。

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
コンテナモードは `mkDefault` を通じて `virtualisation.docker.enable` を自動で有効にします。代わりに Podman を使う場合は、`container.backend = "podman"` と `virtualisation.docker.enable = false` を設定してください。
:::

---

## 設定 {#configuration}

### 宣言的な設定 {#declarative-settings}

`settings` のオプションは任意の属性セットを受け取り、それが `config.yaml` として出力されます。複数のモジュール定義をまたいだ深いマージ（`lib.recursiveUpdate` を利用）に対応しているので、設定をファイルごとに分けられます。

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

どちらも評価の時点で深くマージされます。Nix で宣言したキーは、ディスク上の既存の `config.yaml` にあるキーより常に優先されますが、**Nix が触れないユーザー追加のキーはそのまま残ります**。つまり、エージェントや手作業の編集で `skills.disabled` や `streaming.enabled` のようなキーが追加されても、`nixos-rebuild switch` を越えて残ります。

:::note モデル名の書き方
`settings.model.default` には、使っているプロバイダが想定するモデル識別子を指定します。既定の [OpenRouter](https://openrouter.ai) の場合、`"anthropic/claude-sonnet-4"` や `"google/gemini-3-flash"` のような形になります。プロバイダ（Anthropic、OpenAI）を直接使う場合は、`settings.model.base_url` をそのプロバイダの API に向けたうえで、そのプロバイダ独自のモデル ID（例えば `"claude-sonnet-4-20250514"`）を使ってください。`base_url` を設定していない場合、Hermes は OpenRouter を既定にします。
:::

:::tip 使える設定キーを調べる
`nix build .#configKeys && cat result` を実行すると、Python の `DEFAULT_CONFIG` から抽出した末端の設定キーがすべて表示されます。既存の `config.yaml` の内容は、そのまま `settings` の属性セットに貼り付けられます。構造は 1 対 1 で対応しています。
:::

<details>
<summary><strong>完全な例: よく変更される設定をすべて含めたもの</strong></summary>

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

`config.yaml` を Nix の外で完全に自分で管理したい場合は、`configFile` を使ってください。

```nix
services.hermes-agent.configFile = /etc/hermes/config.yaml;
```

これは `settings` を完全に迂回します。マージも生成も行われません。指定したファイルは、有効化のたびに `$HERMES_HOME/config.yaml` へそのままコピーされます。

### カスタマイズの早見表 {#customization-cheatsheet}

Nix を使う人がよく変えたくなるものを、手早く引けるようにまとめました。

| やりたいこと | オプション | 例 |
|---|---|---|
| LLM のモデルを変える | `settings.model.default` | `"anthropic/claude-sonnet-4"` |
| 別のプロバイダのエンドポイントを使う | `settings.model.base_url` | `"https://openrouter.ai/api/v1"` |
| API キーを追加する | `environmentFiles` | `[ config.sops.secrets."hermes-env".path ]` |
| エージェントに人格を与える | `hermesHomeFiles."SOUL.md"` | `"You are a terse ops assistant."` |
| 作業スペースにプロジェクトの文脈を足す | `documents."AGENTS.md"` | `./documents/AGENTS.md` |
| デスクトップアプリやダッシュボード用のバックエンドを動かす | `backend.mode` | `"serve"` または `"dashboard"` |
| MCP のツールサーバーを追加する | `mcpServers.<name>` | [MCP サーバー](#mcp-servers)を参照 |
| Discord / Telegram / Slack を有効にする | `extraDependencyGroups` | `[ "messaging" ]` |
| ホストのディレクトリをコンテナにマウントする | `container.extraVolumes` | `[ "/data:/data:rw" ]` |
| コンテナに GPU を渡す | `container.extraOptions` | `[ "--gpus" "all" ]` |
| Docker ではなく Podman を使う | `container.backend` | `"podman"` |
| ホストの CLI とコンテナで状態を共有する | `container.hostUsers` | `[ "sidbin" ]` |
| エージェントが使えるツールを増やす | `extraPackages` | `[ pkgs.pandoc pkgs.imagemagick ]` |
| 独自のベースイメージを使う | `container.image` | `"ubuntu:24.04"` |
| hermes のパッケージを差し替える | `package` | `inputs.hermes-agent.packages.${system}.default.override { ... }` |
| 状態ディレクトリを変える | `stateDir` | `"/opt/hermes"` |
| エージェントの作業ディレクトリを指定する | `workingDirectory` | `"/home/user/projects"` |

---

## シークレットの管理 {#secrets-management}

:::danger API キーを `settings` や `environment` に書かないでください
Nix の式に書いた値は `/nix/store` に入り、そこは誰でも読める場所です。必ず `environmentFiles` とシークレット管理の仕組みを使ってください。
:::

`environment`（秘密でない変数）と `environmentFiles`（秘密のファイル）は、いずれも有効化の時点（`nixos-rebuild switch`）で `$HERMES_HOME/.env` にまとめられます。Hermes は起動のたびにこのファイルを読むため、変更は `systemctl restart hermes-agent` で反映され、コンテナを作り直す必要はありません。

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

シークレットのファイルには、キーと値の組が入ります。

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

### OAuth / 認証情報の初期投入 {#oauth-auth-seeding}

OAuth が必要なプラットフォーム（例えば Discord）では、`authFile` を使って初回のデプロイ時に認証情報を投入できます。

```nix
{
  services.hermes-agent = {
    authFile = config.sops.secrets."hermes/auth.json".path;
    # authFileForceOverwrite = true;  # overwrite on every activation
  };
}
```

このファイルがコピーされるのは、`auth.json` がまだ存在しない場合だけです（`authFileForceOverwrite = true` の場合を除きます）。実行時に更新された OAuth のトークンは状態ディレクトリへ書き込まれ、再ビルドをまたいで保持されます。

---

## ドキュメント {#documents}

Hermes は 2 つのディレクトリからファイルを読みます。そのためオプションも 2 つあります。ファイルを置きたいディレクトリに対応するほうを使ってください。

`documents` は、エージェントの**作業ディレクトリ**、つまり `workingDirectory` にファイルを置きます。エージェントは、その作業スペースからプロジェクトの文脈を読み取ります。

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

:::warning documents には明示的な workingDirectory が必要です
このモジュールは、`workingDirectory` を設定するまで `documents` を受け付けません。このオプションの既定値はモジュールごとに異なり、Home Manager ではホームディレクトリ、NixOS では `${stateDir}/workspace` になります。つまり既定のままにすると、自分で選んでいないディレクトリにファイルが置かれることになります。既定値と同じパスを明示的に指定するのは正しい選択であり、この決まりも満たします。
:::

`hermesHomeFiles` は **`HERMES_HOME`** にファイルを置きます。Hermes は、エージェントの人格を表すファイルとメモリのファイルを、このディレクトリから読みます。`SOUL.md` と `memories/` は、ここに置いた場合にだけ機能します。`documents` に置いた `SOUL.md` は作業スペースのファイルになり、Hermes はそれを人格として読み込みません。

```nix
{
  services.hermes-agent.hermesHomeFiles = {
    "SOUL.md" = "You are a helpful AI assistant.";
    "memories/USER.md" = ./documents/USER.md;
  };
}
```

値は文字列かパスのどちらかです。どちらのオプションでも、キーにサブディレクトリを含められ、その親ディレクトリはモジュールが作ります。ファイルは有効化のたびに置き直されます。

`hermesHomeFiles` に `workingDirectory` は不要です。`HERMES_HOME` のディレクトリはモジュールが所有しているからです。ほとんどの場合は `hermesHomeFiles` を使うことになります。

---

## MCP サーバー {#mcp-servers}

`mcpServers` のオプションは、[MCP（Model Context Protocol）](https://modelcontextprotocol.io)のサーバーを宣言的に設定します。各サーバーは、**stdio**（ローカルのコマンド）か **HTTP**（リモートの URL）のどちらかの transport を使います。

### stdio transport（ローカルのサーバー） {#stdio-transport-local-servers}

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
`env` の値に書いた環境変数は、実行時に `$HERMES_HOME/.env` から解決されます。シークレットを渡すには `environmentFiles` を使い、トークンを Nix の設定に直接書かないでください。
:::

### HTTP transport（リモートのサーバー） {#http-transport-remote-servers}

```nix
{
  services.hermes-agent.mcpServers.remote-api = {
    url = "https://mcp.example.com/v1/mcp";
    headers.Authorization = "Bearer \${MCP_REMOTE_API_KEY}";
    timeout = 180;
  };
}
```

### OAuth を使う HTTP transport {#http-transport-with-oauth}

OAuth 2.1 を使うサーバーには `auth = "oauth"` を設定します。Hermes は PKCE の一連の流れ、つまりメタデータの探索、クライアントの動的登録、トークンの交換、自動更新までを実装しています。

```nix
{
  services.hermes-agent.mcpServers.my-oauth-server = {
    url = "https://mcp.example.com/mcp";
    auth = "oauth";
  };
}
```

トークンは `$HERMES_HOME/mcp-tokens/<server-name>.json` に保存され、再起動や再ビルドをまたいで残ります。

<details>
<summary><strong>ヘッドレスなサーバーでの最初の OAuth 認可</strong></summary>

最初の OAuth の認可には、ブラウザを使った同意の手順が必要です。ヘッドレスな環境では、Hermes はブラウザを開く代わりに、認可用の URL を標準出力とログに表示します。

**方法 A: 対話的に一度だけ実行する** — `docker exec`（コンテナ）か `sudo -u hermes`（ネイティブ）で、一連の流れを 1 回だけ実行します。

```bash
# Container mode
docker exec -it hermes-agent \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth

# Native mode
sudo -u hermes HERMES_HOME=/var/lib/hermes/.hermes \
  hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
```

コンテナは `--network=host` を使うため、`127.0.0.1` で待ち受ける OAuth のコールバックにホストのブラウザから到達できます。

**方法 B: トークンを先に用意する** — 手元の作業用マシンで手順を完了させ、そのトークンをコピーします。

```bash
hermes mcp add my-oauth-server --url https://mcp.example.com/mcp --auth oauth
scp ~/.hermes/mcp-tokens/my-oauth-server{,.client}.json \
    server:/var/lib/hermes/.hermes/mcp-tokens/
# Ensure: chown hermes:hermes, chmod 0600
```

</details>

### Sampling（サーバー側から始まる LLM のリクエスト） {#sampling-server-initiated-llm-requests}

MCP のサーバーの中には、エージェントに LLM の補完を要求できるものがあります。

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

## 管理モード {#managed-mode}

NixOS モジュール経由で hermes が動いている場合、次の CLI コマンドは**ブロック**され、`configuration.nix` を編集するよう促すエラーが表示されます。

| ブロックされるコマンド | 理由 |
|---|---|
| `hermes setup` | 設定は宣言的です。Nix の設定にある `settings` を編集してください |
| `hermes config edit` | 設定は `settings` から生成されます |
| `hermes config set <key> <value>` | 設定は `settings` から生成されます |
| `hermes gateway install` | systemd のサービスは NixOS が管理します |
| `hermes gateway uninstall` | systemd のサービスは NixOS が管理します |

これにより、Nix が宣言している内容とディスク上の内容がずれることを防ぎます。判定には 2 つの手がかりを使います。

1. **`HERMES_MANAGED` の環境変数。** サービスがこれを設定し、ゲートウェイのプロセスが読み取ります。
2. **`HERMES_HOME` にある `.managed` のマーカーファイル。** 有効化のスクリプトがこれを書き、対話的なシェルが読み取ります。そのため、`docker exec -it hermes-agent hermes config set ...` のようなコマンドも CLI 側でブロックされます。

どちらの手がかりも、このインストールを管理しているシステムの名前を保持しています。そのため、拒否のメッセージには正しい再ビルドのコマンドが示されます。NixOS モジュールなら `sudo nixos-rebuild switch`、Home Manager モジュールなら `home-manager switch` です。

---

## Home Manager モジュール {#home-manager-module}

flake は `homeManagerModules.default` も出力します。Hermes は個人のためのエージェントです。認証情報も、メモリも、セッションも、cron ジョブも、すべてその個人のものです。だからこそ、個人の端末ではユーザーサービスという形が適しています。これは NixOS だけでなく、Home Manager が対応しているすべてのディストリビューションで動きます。

オプションの構成は、NixOS モジュールが使うものと同じです。`services.hermes-agent` の下に、同じ `settings`、`environmentFiles`、`documents`、`mcpServers`、`extraPlugins`、`backend` のオプションがあります。上に挙げた例は、どれも変更なしでそのまま使えます。異なるのは、必要な部分だけです。

| | NixOS モジュール | Home Manager モジュール |
|---|---|---|
| 実行主体 | `user`、`group`、`createUser` で宣言するシステムユーザー | 自分自身 |
| 状態ディレクトリ | `stateDir` と `/.hermes` | `hermesHome` を直接指定。既定は `~/.hermes` |
| サービス | `systemd.services` | Linux では `systemd.user.services`、macOS では `launchd.agents` |
| PATH 上の CLI | `addToSystemPackages`。システム全体に `HERMES_HOME` を設定する | `installPackage`。自分のセッションにだけ設定する |
| コンテナモード | 対応 | 非対応。root と Docker のソケットが必要なため |

### flake の input を追加する {#add-the-flake-input}

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

そのうえで、Home Manager の設定にモジュールを取り込みます。設定は単独でも構いませんし、NixOS や nix-darwin の設定の中の `home-manager.users.<name>` の下に置いても構いません。

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

`home-manager switch` を実行すると、`~/.hermes` が作られ、`config.yaml` が書き出され、`.env` が組み立てられ、ゲートウェイがユーザーサービスとして起動します。

:::warning linger を有効にしないと、ログアウトでサービスが止まります
注意: 自分のアカウントで linger を有効にしてください。linger が無いと、最後のセッションが終わった時点で systemd がユーザーマネージャを停止し、ゲートウェイもそれに巻き込まれて止まります。linger はアカウントの属性なので、Home Manager からは設定できません。

```nix
# NixOS
users.users.your-username.linger = true;
```

```bash
# anywhere else
sudo loginctl enable-linger your-username
```

macOS には相当するオプションがありません。`RunAtLoad` を指定した `launchd` のエージェントは、ログイン時に起動して動き続けます。
:::

### デスクトップ / ダッシュボードのバックエンドを動かす {#running-the-desktop-dashboard-backend}

`gateway.enable` は、Telegram、Discord、Slack などのプラットフォーム向けにメッセージングのゲートウェイを動かします。Hermes Desktop と Web のダッシュボードが接続するのは*別の*プロセスで、それは `hermes serve` か `hermes dashboard` です。`backend.mode` は、そのプロセスをゲートウェイと一緒に動かします。

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

`serve` は、ユーザーインターフェースなしで動きます。Hermes Desktop が接続する `/api/ws` と `/api/pty` のソケットを提供し、Web アプリケーションのビルドは行いません。`dashboard` はそのすべてに加えて、ブラウザ用の管理画面も配信します。どちらのプロセスも、ゲートウェイと 1 つの `HERMES_HOME` を共有します。そのため、セッション、スキル、メモリ、cron ジョブはすべてで同じものになります。`backend.mode` は NixOS モジュールでも同じように動きますが、コンテナモードでは使えません。

:::warning ループバック以外のアドレスにバインドする場合
既定のアドレスは `127.0.0.1` です。それ以外のアドレスを指定すると、ダッシュボードの認証ゲートが有効になります。サーバーはまた、バインドしたアドレスと異なる `Host` ヘッダを持つリクエストをすべて拒否します。これは DNS リバインディングへの防御です。クライアントが使う名前かアドレスにバインドしてください。
:::

### 動作を確認する {#verify-it-works}

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
この節が関係するのは `container.enable = true` を使っている場合だけです。ネイティブモードで運用するなら読み飛ばしてください。
:::

コンテナモードが有効な場合、hermes は永続的な Ubuntu コンテナの中で動き、Nix でビルドされたバイナリがホストから読み取り専用でバインドマウントされます。

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

Nix でビルドされたバイナリが Ubuntu のコンテナの中で動くのは、`/nix/store` がバインドマウントされているからです。バイナリは自前のインタプリタと依存関係をすべて持ち込むので、コンテナ側のシステムライブラリに頼りません。コンテナのエントリポイントは `current-package` のシンボリックリンクを経由して解決されます（`/data/current-package/bin/hermes gateway run --replace`）。`nixos-rebuild switch` の際に更新されるのはこのシンボリックリンクだけで、コンテナは動いたままです。

### 何がどこまで残るのか {#what-persists-across-what}

| 出来事 | コンテナは作り直されるか | `/data`（状態） | `/home/hermes` | 書き込み可能なレイヤ（`apt` / `pip` / `npm`） |
|---|---|---|---|---|
| `systemctl restart hermes-agent` | いいえ | 残る | 残る | 残る |
| `nixos-rebuild switch`（コードの変更） | いいえ（シンボリックリンクの更新のみ） | 残る | 残る | 残る |
| ホストの再起動 | いいえ | 残る | 残る | 残る |
| `nix-collect-garbage` | いいえ（GC ルートあり） | 残る | 残る | 残る |
| イメージの変更（`container.image`） | **はい** | 残る | 残る | **失われる** |
| ボリューム / オプションの変更 | **はい** | 残る | 残る | **失われる** |
| `environment` / `environmentFiles` の変更 | いいえ | 残る | 残る | 残る |

コンテナが作り直されるのは、その**識別ハッシュ**が変わったときだけです。ハッシュの対象は、スキーマのバージョン、イメージ、`extraVolumes`、`extraOptions`、エントリポイントのスクリプトです。環境変数、設定、ドキュメント、hermes のパッケージ自体を変えても、作り直しは**起きません**。

:::warning 書き込み可能なレイヤが失われる場合
識別ハッシュが変わると（イメージの更新、ボリュームの追加、コンテナのオプションの追加）、コンテナは破棄され、`container.image` を新たに取得し直して作り直されます。書き込み可能なレイヤに `apt install`、`pip install`、`npm install` で入れたパッケージは失われます。`/data` と `/home/hermes` の状態は保持されます（これらはバインドマウントだからです）。

エージェントが特定のパッケージに頼っている場合は、独自のイメージに焼き込む（`container.image = "my-registry/hermes-base:latest"`）か、エージェントの SOUL.md でインストールの手順を書いておくことを検討してください。
:::

### GC ルートによる保護 {#gc-root-protection}

`preStart` のスクリプトが、現在の hermes のパッケージを指す GC ルートを `${stateDir}/.gc-root` に作ります。これにより、`nix-collect-garbage` が実行中のバイナリを消してしまうのを防ぎます。何らかの理由で GC ルートが壊れた場合は、サービスを再起動すれば作り直されます。

---

## プラグイン {#plugins}

NixOS モジュールは、宣言的なプラグインのインストールに対応しています。手続き的な `hermes plugins install` は必要ありません。

### ディレクトリ形式のプラグイン（`extraPlugins`） {#directory-plugins-extraplugins}

`plugin.yaml` と `__init__.py` を持つソースツリーだけのプラグイン（例えば [hermes-lcm](https://github.com/stephenschoettler/hermes-lcm)）には、次のようにします。

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

プラグインは、有効化の時点で `$HERMES_HOME/plugins/` にシンボリックリンクとして置かれます。Hermes は通常のディレクトリの走査でそれらを見つけます。リストからプラグインを外して `nixos-rebuild switch` を実行すると、シンボリックリンクは取り除かれます。

### エントリポイント形式のプラグイン（`extraPythonPackages`） {#entry-point-plugins-extrapythonpackages}

`[project.entry-points."hermes_agent.plugins"]` で登録する pip パッケージ形式のプラグイン（例えば [rtk-hermes](https://github.com/ogallotti/rtk-hermes)）には、次のようにします。

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

そのパッケージの `site-packages` が、hermes のラッパーの PYTHONPATH に追加されます。`importlib.metadata` が、セッションの開始時にエントリポイントを見つけます。

### 任意の依存関係グループ（`extraDependencyGroups`） {#optional-dependency-groups-extradependencygroups}

hermes-agent の `pyproject.toml` で宣言されている任意の追加機能は、`extraDependencyGroups` を使ってビルド時に封じられた venv へ含めます。既定の `[all]` に入っていない追加機能には、これが必須です。Nix では、読み取り専用のストアへ実行時にインストールすることができないからです。

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

これらは中心的な依存関係と一緒に uv が解決するので、PYTHONPATH に手を入れる必要も、衝突の心配もありません。使えるグループは次のとおりです。

| グループ | 有効になるもの |
|-------|-----------------|
| `messaging` | Discord、Telegram、Slack |
| `matrix` | Matrix / Element（暗号化ありの mautrix。Linux のみ） |
| `dingtalk` | DingTalk |
| `feishu` | Feishu / Lark |
| `voice` | ローカルでの音声認識（faster-whisper） |
| `edge-tts` | Edge TTS のプロバイダ |
| `tts-premium` | ElevenLabs の TTS |
| `anthropic` | Anthropic のネイティブ SDK（OpenRouter 経由なら不要） |
| `bedrock` | AWS Bedrock（boto3） |
| `azure-identity` | Azure Entra ID の認証 |
| `honcho` | Honcho のメモリプロバイダ |
| `hindsight` | Hindsight のメモリプロバイダ |
| `modal` | Modal のターミナルバックエンド |
| `daytona` | Daytona のターミナルバックエンド |
| `exa` | Exa の Web 検索 |
| `firecrawl` | Firecrawl の Web 検索 |
| `fal` | FAL の画像生成 |

追加機能ごとに設定する代わりに、ビルド済みの `#messaging` や `#full` の flake パッケージを使うこともできます（[クイックスタート](#quick-start-any-nix-user)を参照）。

**どれを使い分けるか:**

| 必要なこと | オプション |
|------|--------|
| pyproject.toml の任意の追加機能を有効にする | `extraDependencyGroups` |
| pyproject.toml に無い外部の Python プラグインを足す | `extraPythonPackages` |
| システムのバイナリ（pandoc、jq など）を足す | `extraPackages` |
| ディレクトリ形式のプラグインのソースツリーを足す | `extraPlugins` |

### 両方を組み合わせる {#combining-both}

サードパーティの Python の依存関係を持つディレクトリ形式のプラグインには、両方のオプションが必要です。

```nix
services.hermes-agent = {
  extraPlugins = [ my-plugin-src ];          # plugin source
  extraPythonPackages = [ pkgs.python312Packages.redis ];  # its Python dep
  extraPackages = [ pkgs.redis ];            # system binary it needs
};
```

### overlay を使う {#using-the-overlay}

外部の flake から、パッケージを直接上書きできます。

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

プラグインは、それでも `config.yaml` 側で有効にする必要があります。宣言的な設定から追加してください。

```nix
services.hermes-agent.settings.plugins.enabled = [
  "hermes-lcm"
  "rtk-rewrite"
];
```

:::note
ビルド時の衝突チェックにより、プラグインのパッケージが hermes の中心的な依存関係を覆い隠すことを防いでいます。封じられた venv にすでにあるパッケージをプラグインが提供している場合、`nixos-rebuild` は分かりやすいエラーで失敗します。
:::

---

## 開発 {#development}

### 開発用のシェル {#dev-shell}

この flake は、Python 3.12、uv、Node.js、実行時のツール一式を備えた開発用のシェルを提供します。

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

同梱の `.envrc` が、開発用のシェルを自動で有効にします。

```bash
cd hermes-agent
direnv allow    # one-time
# Subsequent entries are near-instant (stamp file skips dep install)
```

### flake のチェック {#flake-checks}

この flake には、CI でもローカルでも動くビルド時の検証が含まれています。

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
<summary><strong>各チェックが確かめている内容</strong></summary>

| チェック | 何を検証するか |
|---|---|
| `package-contents` | `hermes` と `hermes-agent` のバイナリが存在し、`hermes --version` が動くこと |
| `entry-points-sync` | `pyproject.toml` の `[project.scripts]` の各項目に、対応するラップされたバイナリが Nix パッケージにあること |
| `cli-commands` | `hermes --help` に `gateway` と `config` のサブコマンドが出ること |
| `managed-guard` | `HERMES_MANAGED=true hermes config set ...` が NixOS 向けのエラーを表示すること |
| `bundled-skills` | スキルのディレクトリが存在して SKILL.md を含み、ラッパーで `HERMES_BUNDLED_SKILLS` が設定されていること |
| `config-roundtrip` | 7 通りのマージの状況: 新規インストール、Nix による上書き、ユーザーのキーの保持、混在したマージ、MCP の追記的なマージ、入れ子の深いマージ、冪等性 |

</details>

---

## オプション一覧 {#options-reference}

### 基本 {#core}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `enable` | `bool` | `false` | hermes-agent のサービスを有効にする |
| `package` | `package` | `hermes-agent` | 使用する hermes-agent のパッケージ |
| `user` | `str` | `"hermes"` | システムユーザー |
| `group` | `str` | `"hermes"` | システムグループ |
| `createUser` | `bool` | `true` | ユーザー / グループを自動で作る |
| `stateDir` | `str` | `"/var/lib/hermes"` | 状態ディレクトリ（`HERMES_HOME` の親） |
| `workingDirectory` | `str` | `"${stateDir}/workspace"` | エージェントの作業ディレクトリ |
| `addToSystemPackages` | `bool` | `false` | `hermes` の CLI をシステムの PATH に追加し、`HERMES_HOME` をシステム全体に設定する |

### 設定 {#configuration}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `settings` | `attrs`（深くマージ） | `{}` | `config.yaml` として出力される宣言的な設定。任意の入れ子に対応し、複数の定義は `lib.recursiveUpdate` でマージされる |
| `configFile` | `null` または `path` | `null` | 既存の `config.yaml` へのパス。設定すると `settings` を完全に上書きする |

### シークレットと環境変数 {#secrets-environment}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `environmentFiles` | `listOf str` | `[]` | シークレットを含む env ファイルのパス。有効化の時点で `$HERMES_HOME/.env` にまとめられる |
| `environment` | `attrsOf str` | `{}` | 秘密でない環境変数。**Nix のストアから見える**ため、シークレットをここに置かないこと |
| `authFile` | `null` または `path` | `null` | OAuth の認証情報の初期投入。初回のデプロイ時にのみコピーされる |
| `authFileForceOverwrite` | `bool` | `false` | 有効化のたびに `authFile` から `auth.json` を常に上書きする |

### ドキュメント {#documents}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `documents` | `attrsOf (either str path)` | `{}` | 作業スペースのファイル。各キーは `workingDirectory` からの相対パス。このオプションを使うには、そちらの設定が必須 |
| `hermesHomeFiles` | `attrsOf (either str path)` | `{}` | `HERMES_HOME` に置かれるファイル。`SOUL.md` と `memories/` はここに置かないと、Hermes は読み込まない |

### MCP サーバー {#mcp-servers}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `mcpServers` | `attrsOf submodule` | `{}` | MCP サーバーの定義。`settings.mcp_servers` にマージされる |
| `mcpServers.<name>.command` | `null` または `str` | `null` | サーバーのコマンド（stdio transport） |
| `mcpServers.<name>.args` | `listOf str` | `[]` | コマンドの引数 |
| `mcpServers.<name>.env` | `attrsOf str` | `{}` | サーバーのプロセスに渡す環境変数 |
| `mcpServers.<name>.url` | `null` または `str` | `null` | サーバーのエンドポイント URL（HTTP / StreamableHTTP transport） |
| `mcpServers.<name>.headers` | `attrsOf str` | `{}` | HTTP のヘッダ。例えば `Authorization` |
| `mcpServers.<name>.auth` | `null` または `"oauth"` | `null` | 認証方式。`"oauth"` で OAuth 2.1 の PKCE が有効になる |
| `mcpServers.<name>.enabled` | `bool` | `true` | このサーバーを有効 / 無効にする |
| `mcpServers.<name>.timeout` | `null` または `int` | `null` | ツール呼び出しのタイムアウト（秒。既定は 120） |
| `mcpServers.<name>.connect_timeout` | `null` または `int` | `null` | 接続のタイムアウト（秒。既定は 60） |
| `mcpServers.<name>.tools` | `null` または `submodule` | `null` | ツールの絞り込み（`include` / `exclude` のリスト） |
| `mcpServers.<name>.sampling` | `null` または `submodule` | `null` | サーバー側から始まる LLM リクエストの sampling 設定 |

### サービスの挙動 {#service-behavior}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `extraArgs` | `listOf str` | `[]` | `hermes gateway` に渡す追加の引数 |
| `extraPackages` | `listOf package` | `[]` | エージェントが使える追加のパッケージ。hermes ユーザーのユーザー単位のプロファイルに追加されるため、ターミナルのコマンド、スキル、cron ジョブのすべてから見える |
| `extraPlugins` | `listOf package` | `[]` | `$HERMES_HOME/plugins/` にシンボリックリンクされるディレクトリ形式のプラグインのパッケージ。それぞれ `plugin.yaml` を含む必要がある |
| `extraPythonPackages` | `listOf package` | `[]` | エントリポイント形式のプラグインを見つけるために PYTHONPATH へ追加する Python パッケージ。`python312Packages` でビルドする |
| `extraDependencyGroups` | `listOf str` | `[]` | 封じられた venv に含める pyproject.toml の任意の追加機能（例えば `["hindsight"]`）。uv が解決するため衝突しない |
| `restart` | `str` | `"always"` | systemd の `Restart=` の方針。macOS では使われない |
| `restartSec` | `int` | `5` | systemd の `RestartSec=` の値。macOS では使われない |

### バックエンド（`hermes serve` / `hermes dashboard`） {#backend-hermes-serve-hermes-dashboard}

このオプションは、Hermes Desktop と Web のダッシュボードが接続するプロセスを、ゲートウェイと一緒に動かします。`container.enable` とは併用できません。

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `backend.mode` | `enum ["none" "serve" "dashboard"]` | `"none"` | `serve` はユーザーインターフェースなしで動き、`/api/ws` と `/api/pty` を提供する。`dashboard` はブラウザ用の画面も配信する |
| `backend.host` | `str` | `"127.0.0.1"` | バインドするアドレス。ループバック以外のアドレスを指定すると認証ゲートが有効になる |
| `backend.port` | `port` | `9119` | バインドするポート |
| `backend.extraArgs` | `listOf str` | `[]` | バックエンドのコマンドに渡す追加の引数 |

### Home Manager 専用 {#home-manager-only}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `hermesHome` | `str` | `"${config.home.homeDirectory}/.hermes"` | `HERMES_HOME` を直接指定する。NixOS モジュールでは `stateDir` から組み立てられる |
| `installPackage` | `bool` | `true` | `hermes` の CLI を `home.packages` に追加し、自分のシェル向けに `HERMES_HOME` を設定する |
| `gateway.enable` | `bool` | `false` | メッセージングのゲートウェイを動かす。NixOS モジュールではゲートウェイ自体がサービスなので、この項目は無い |

### コンテナ（NixOS 専用） {#container-nixos-only}

| オプション | 型 | 既定値 | 説明 |
|---|---|---|---|
| `container.enable` | `bool` | `false` | OCI コンテナモードを有効にする |
| `container.backend` | `enum ["docker" "podman"]` | `"docker"` | コンテナのランタイム |
| `container.image` | `str` | `"ubuntu:24.04"` | ベースのイメージ（実行時に取得される） |
| `container.extraVolumes` | `listOf str` | `[]` | 追加のボリュームのマウント（`host:container:mode`） |
| `container.extraOptions` | `listOf str` | `[]` | `docker create` に渡す追加の引数 |
| `container.hostUsers` | `listOf str` | `[]` | サービスの stateDir を指す `~/.hermes` のシンボリックリンクを得て、`hermes` グループに自動追加される対話的なユーザー |

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

構成は同じで、それがコンテナにマウントされます。

| コンテナ側のパス | ホスト側のパス | モード | 備考 |
|---|---|---|---|
| `/nix/store` | `/nix/store` | `ro` | Hermes のバイナリと Nix の依存関係すべて |
| `/data` | `/var/lib/hermes` | `rw` | 状態、設定、作業スペースのすべて |
| `/home/hermes` | `${stateDir}/home` | `rw` | 永続的なエージェントのホーム。`pip install --user` やツールのキャッシュ用 |
| `/usr`、`/usr/local`、`/tmp` | （書き込み可能なレイヤ） | `rw` | `apt` / `pip` / `npm` でのインストール。再起動をまたいで残るが、作り直しで失われる |

---

## 更新 {#updating}

```bash
# Update the flake input (run from the directory containing flake.nix)
cd /etc/nixos && nix flake update hermes-agent

# Rebuild
sudo nixos-rebuild switch          # for the NixOS module
home-manager switch                # for the Home Manager module
```

コンテナモードでは `current-package` のシンボリックリンクが更新され、エージェントは再起動の時点で新しいバイナリを読み込みます。コンテナの作り直しは起きず、インストール済みのパッケージも失われません。

---

## トラブルシューティング {#troubleshooting}

:::tip Podman を使う場合
以下の `docker` コマンドは、いずれも `podman` でも同じように動きます。`container.backend = "podman"` を設定している場合は読み替えてください。
:::

### サービスのログ {#service-logs}

```bash
# Both modes use the same systemd unit
journalctl -u hermes-agent -f

# Container mode: also available directly
docker logs -f hermes-agent
```

### コンテナの状態を調べる {#container-inspection}

```bash
systemctl status hermes-agent
docker ps -a --filter name=hermes-agent
docker inspect hermes-agent --format='{{.State.Status}}'
docker exec -it hermes-agent bash
docker exec hermes-agent readlink /data/current-package
docker exec hermes-agent cat /data/.container-identity
```

### コンテナを強制的に作り直す {#force-container-recreation}

書き込み可能なレイヤをリセットして、まっさらな Ubuntu に戻したい場合は次のようにします。

```bash
sudo systemctl stop hermes-agent
docker rm -f hermes-agent
sudo rm /var/lib/hermes/.container-identity
sudo systemctl start hermes-agent
```

### シークレットが読み込まれているか確認する {#verify-secrets-are-loaded}

エージェントは起動するものの、LLM のプロバイダで認証できない場合は、`.env` のファイルが正しくまとめられているか確認してください。

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

### よくある問題 {#common-issues}

| 症状 | 原因 | 対処 |
|---|---|---|
| `Cannot save configuration: managed by NixOS` | CLI のガードが有効 | `configuration.nix` を編集して `nixos-rebuild switch` |
| `No adapter available for discord`（telegram / slack も同様） | 封じられた Nix の venv にメッセージングの依存関係が無い | `#messaging` の構成を入れる: `nix profile install ...#messaging`。NixOS モジュールなら `extraDependencyGroups = [ "messaging" ]`。根本のエラーは `journalctl -u hermes-agent` で `FeatureUnavailable` や `requirements not met` を確認 |
| コンテナが想定外に作り直された | `extraVolumes`、`extraOptions`、`image` のいずれかが変わった | 想定どおりの動作で、書き込み可能なレイヤはリセットされる。パッケージを入れ直すか、独自のイメージを使う |
| `hermes --version` が古いバージョンを表示する | コンテナが再起動されていない | `systemctl restart hermes-agent` |
| `/var/lib/hermes` で権限エラーになる | 状態ディレクトリが `0750 hermes:hermes` のため | `docker exec` か `sudo -u hermes` を使う |
| `nix-collect-garbage` が hermes を消してしまった | GC ルートが無い | サービスを再起動する（preStart が GC ルートを作り直す） |
| `no container with name or ID "hermes-agent"`（Podman） | Podman の rootful なコンテナが一般ユーザーから見えない | podman にパスワード不要の sudo を許可する（[コンテナモード](#container-mode)の節を参照） |
| `unable to find user hermes` | コンテナがまだ起動中（エントリポイントがユーザーを作り終えていない） | 数秒待ってやり直す。CLI も自動で再試行する |
| `extraPackages` で追加したツールがターミナルで見つからない | ユーザー単位のプロファイルを更新するために `nixos-rebuild switch` が必要 | 再ビルドして再起動する: `nixos-rebuild switch && systemctl restart hermes-agent` |
