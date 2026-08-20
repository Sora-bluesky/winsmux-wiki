---
title: "LSP — 意味を読み取る診断"
description: "本物の言語サーバー（pyright、gopls、rust-analyzer など）を、write_file と patch の書き込み後チェックにつなぎます。"
upstream_path: user-guide/features/lsp.md
upstream_blob: 8f5830f47914631f574953b3072115c3310f569a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/lsp
---

# Language Server Protocol (LSP) {#language-server-protocol-lsp}

Hermes は、pyright、gopls、rust-analyzer、typescript-language-server、clangd
など 20 種類以上の言語サーバーをそのままバックグラウンドの
子プロセスとして動かし、そこから返る意味レベルの診断を、`write_file` と
`patch` のあとに走るチェックへ流し込みます。エージェントがファイルを
書き換えると、その書き換えが持ち込んだエラーだけがそのまま見えます。
文法の誤りだけでなく、**型の食い違い、未定義の名前、足りない import、
プロジェクト全体にまたがる意味的な問題**まで、言語サーバーが見つけたものが
そろって出てきます。

これは、一流のコーディングエージェントが使っているのと同じ作りです。
Hermes はそれを丸ごと自前で持っています。エディタを立ち上げておく必要も、
プラグインを入れる必要も、別のデーモンを世話する必要もありません。

## LSP が動くとき {#when-lsp-runs}

LSP が動くかどうかは、**git のワークスペースかどうか**で決まります。
エージェントの作業ディレクトリ（または編集中のファイル）が git リポジトリの
中にあれば、そのワークスペースに対して LSP が動きます。どちらも git
リポジトリの中になければ、LSP は眠ったままです。作業ディレクトリが
ホームディレクトリで、診断すべきプロジェクトが特にないメッセージング用の
ゲートウェイでは、これが助かります。

チェックは二段構えです。まずプロセス内での文法チェック（マイクロ秒で
終わります）、文法がきれいなら次に LSP の診断です。言語サーバーが不安定でも
入っていなくても、書き込みが壊れることはありません。LSP 側の失敗は
すべて、静かに文法チェックだけの結果へ戻ります。

具体的には、`write_file` や `patch` が成功するたびに次のことが起きます。

1. Hermes がそのファイルの現在の診断を基準として控えます。
2. 書き込みを実行します。
3. 言語サーバーに問い合わせ直し、もともと基準にあった診断をふるい落として、
   新しく出てきたものだけを差し出します。

エージェントには、こんな内容が見えます。

```
{
  "bytes_written": 42,
  "dirs_created": false,
  "lint": {"status": "ok", "output": ""},
  "lsp_diagnostics": "LSP diagnostics introduced by this edit:\n<diagnostics file=\"/path/to/foo.py\">\nERROR [42:5] Cannot find name 'foo' [reportUndefinedVariable] (Pyright)\nERROR [50:1] Argument of type \"str\" is not assignable to \"int\" [reportArgumentType] (Pyright)\n</diagnostics>"
}
```

`lint` の欄には文法チェックの結果が入ります（`ast.parse` や `json.loads`
などを使った、マイクロ秒で終わるプロセス内の解析です）。`lsp_diagnostics`
の欄には、本物の言語サーバーが返した意味レベルの診断が入ります。二つの
経路がそれぞれ独立した信号を運ぶので、文法はきれいなのに意味の上で問題が
あるファイルは、エージェントからは ``lint: ok`` と、中身の入った
``lsp_diagnostics`` として見えます。

## 対応している言語 {#supported-languages}

| 言語 | サーバー | 自動インストール |
|----------|--------|--------------|
| Python | `pyright-langserver` | npm |
| TypeScript / JavaScript / JSX / TSX | `typescript-language-server` | npm |
| Vue | `@vue/language-server` | npm |
| Svelte | `svelte-language-server` | npm |
| Astro | `@astrojs/language-server` | npm |
| Go | `gopls` | `go install` |
| Rust | `rust-analyzer` | 手動（rustup） |
| C / C++ | `clangd` | 手動（LLVM） |
| Bash / Zsh | `bash-language-server` | npm |
| YAML | `yaml-language-server` | npm |
| Lua | `lua-language-server` | 手動（GitHub のリリース） |
| PHP | `intelephense` | npm |
| OCaml | `ocaml-lsp` | 手動（opam） |
| Dockerfile | `dockerfile-language-server-nodejs` | npm |
| Terraform | `terraform-ls` | 手動 |
| Dart | `dart language-server` | 手動（dart sdk） |
| Haskell | `haskell-language-server` | 手動（ghcup） |
| Julia | `julia` + LanguageServer.jl | 手動 |
| Clojure | `clojure-lsp` | 手動 |
| Nix | `nixd` | 手動 |
| Zig | `zls` | 手動 |
| Gleam | `gleam lsp` | 手動（gleam install） |
| Elixir | `elixir-ls` | 手動 |
| Prisma | `prisma language-server` | 手動 |
| Kotlin | `kotlin-language-server` | 手動 |
| Java | `jdtls` | 手動 |
| PowerShell | `PowerShellEditorServices`（`pwsh` がホスト） | 手動（リリースの zip） |

「手動」となっているものは、その言語でふつうに使われているツール管理の
仕組み（rustup、ghcup、opam、brew など）でサーバーを入れてください。
Hermes は PATH の上か `<HERMES_HOME>/lsp/bin/` の中にある実行ファイルを
自動で見つけます。

### PowerShell {#powershell}

PowerShellEditorServices は 1 つの実行ファイルではありません。`pwsh`
（PowerShell 7 以降）や `powershell` をホストにして起動する、PowerShell の
モジュールの束です。設定は次のとおりです。

1. `pwsh`（または Windows の `powershell`）が PATH に載るように
   [PowerShell](https://github.com/PowerShell/PowerShell) を入れます。
2. [PowerShellEditorServices のリリース](https://github.com/PowerShell/PowerShellEditorServices/releases)
   から最新の zip を落として展開します。
3. 展開した束の場所を Hermes に教えます。指すのは
   `PowerShellEditorServices/Start-EditorServices.ps1` が入っている
   ディレクトリです。やり方は次のどれかです。
   - `config.yaml` に
     `lsp.servers.powershell.command: ["/path/to/bundle"]` と書く、
   - `<HERMES_HOME>/lsp/PowerShellEditorServices` に展開する、
   - あるいは `PSES_BUNDLE_PATH=/path/to/bundle` を export する。

`pwsh` が見つかれば、`hermes lsp status` は `installed` と表示します。束が
見当たらないときは、ダウンロード先のリンク付きの警告がログに一度だけ出ます。

一部のサーバーは、npm が自動では引いてこない相棒のパッケージと一緒に
入れる必要があります。今のところ該当するのは
`typescript-language-server` で、同じ `node_modules` の木から
`typescript` の SDK を読み込める必要があります。`hermes lsp install typescript`
を実行したときや、初回利用で自動インストールが走ったときには、Hermes が
両方のパッケージをまとめて入れます。

## CLI {#cli}

```
hermes lsp status          # service state + per-server install status
hermes lsp list            # registry, optionally --installed-only
hermes lsp install <id>    # eagerly install one server
hermes lsp install-all     # try every server with a known recipe
hermes lsp restart         # tear down running clients
hermes lsp which <id>      # print resolved binary path
```

まずは `hermes lsp status` から見るのがおすすめです。今日の時点でどの言語が
意味レベルの診断を受け取れて、どの言語は実行ファイルの用意が要るのかが
わかります。

## 設定 {#configuration}

たいていの環境では、初期値のままで動きます。実行ファイルが PATH にあるなら、
設定することは何もありません。

```yaml
# config.yaml
lsp:
  # Master toggle. Disabling skips the entire subsystem — no servers
  # spawn, no background event loop runs.
  enabled: true

  # How long to wait for diagnostics after each write.
  wait_mode: document      # "document" or "full"
  # Max seconds to wait for the server to re-check the file after an
  # edit. Only *fresh* diagnostics (produced for the post-edit
  # content) are ever reported; if the server doesn't finish within
  # this budget, the edit reports "no LSP data" rather than stale
  # errors from before the edit. Raise this for slow servers on big
  # projects (tsserver, rust-analyzer mid-indexing).
  wait_timeout: 5.0

  # How to handle missing server binaries.
  #   auto    — install via npm/pip/go install into <HERMES_HOME>/lsp/bin
  #   manual  — only use binaries already on PATH
  install_strategy: auto

  # How long an unused language-server client stays alive (seconds).
  # Idle servers are shut down automatically and respawned on the next
  # relevant file operation. Set to 0 to disable idle reaping and keep
  # servers alive for the life of the process. Values below 30s are
  # clamped to 30 so a sweep can never reap a client mid-operation.
  idle_timeout: 600

  # Per-server overrides (all optional).
  servers:
    pyright:
      disabled: false
      command: ["/abs/path/to/pyright-langserver", "--stdio"]
      env: { PYRIGHT_LOG_LEVEL: "info" }
      initialization_options:
        python:
          analysis:
            typeCheckingMode: "strict"
    typescript:
      disabled: true       # skip TS even when its extensions match
```

### サーバーごとの設定項目 {#per-server-keys}

* `disabled: true` — 拡張子が一致していても、このサーバーはまったく
  使いません。
* `command: [bin, ...args]` — 実行ファイルの場所を自分で決め打ちします。
  自動インストールは行われません。
* `env: {KEY: value}` — 起動するプロセスに渡す環境変数を足します。
* `initialization_options: {...}` — `initialize` のやりとりで送る LSP の
  `initializationOptions` に混ぜ込みます。中身はサーバーごとに違うので、
  その言語サーバーの説明を見てください。

## インストール先 {#installation-locations}

`install_strategy: auto` のとき、Hermes は実行ファイルを
`<HERMES_HOME>/lsp/bin/` に入れます。NPM のパッケージは
`<HERMES_HOME>/lsp/node_modules/` に置かれ、その一つ上に実行ファイルへの
シンボリックリンクが張られます。Go の実行ファイルは、`GOBIN` を置き場所へ
向けた `go install` で作られます。

`/usr/local/` や `~/.local/` のような、みんなで共有する場所には何も
入れません。置き場所は完全に Hermes のもので、プロファイルを初期化すると
一緒に消えます。

## 速さのこと {#performance-characteristics}

言語サーバーは、**最初に必要になったときに起動します**。まだ `.py`
ファイルを扱ったことのないプロジェクトで Python のファイルを編集すると、
そこで pyright が立ち上がります。起動にかかる時間はたいてい 1〜3 秒です
（まっさらなプロジェクトの rust-analyzer は 10 秒以上かかることも
あります）。同じワークスペースでの次の編集からは、動いているサーバーを
そのまま使い回します。

診断が何も出ないきれいな書き込みでは、LSP の層が足す時間は数ミリ秒です。
診断が出るときの待ち時間は `wait_timeout` 秒までで、実際には
pyright や tsserver なら数十ミリ秒、索引を作っている最中の rust-analyzer
なら数秒というところです。

診断には**新しさの関門**があります。今回の編集後の中身に対してサーバーが
出したものだけを結果として数えます（変更のとき以降に届いた
`publishDiagnostics` の通知か、そのあとに返ってきた問い合わせの答えです）。
まだ見直しが終わっていない遅いサーバーの場合、その編集は「データなし」に
なります。昨日のエラーが今のものとして出し直されることはありません。

サーバーは使っている間は生かしておき、ファイルの動きが
`lsp.idle_timeout` 秒（初期値は 600）続かなかったら閉じます。たくさんの
作業ツリーに触れる、長く動き続けるゲートウェイでも、ワークスペースごとの
言語サーバーのプロセスが延々とたまり続けることはもうありません。閉じた
サーバーは、次にファイルを扱うときに自動でまた立ち上がります。
`idle_timeout: 0` にすれば片付けをやめて、プロセスが生きている間ずっと
すべてのサーバーの索引を温かいまま保てます。

## 止めるには {#disabling}

`config.yaml` で `lsp.enabled: false` にすると、この仕組みを丸ごと止め
られます。書き込み後のチェックは、プロセス内の文法チェック（Python なら
`ast.parse`、JSON なら `json.loads` など）に戻ります。これは以前の版から
変わっていません。

層ごと止めずに、ある言語だけを止めたいときは次のようにします。

```yaml
lsp:
  servers:
    rust-analyzer:
      disabled: true
```

## うまくいかないとき {#troubleshooting}

**`hermes lsp status` にサーバーが "missing" と出る**

実行ファイルが PATH になく、`<HERMES_HOME>/lsp/bin/` にもありません。
`hermes lsp install <server_id>` で自動インストールを試すか、その言語の
ふつうの手順で自分で入れてください。

**`hermes lsp status` に `Backend warnings` の欄が出る**

サーバーによっては、診断そのものは外部のコマンドに任せる薄い包み紙に
なっています。この手のサーバーは問題なく起動して要求も受け取りますが、
肝心の相棒の実行ファイルがないとエラーを一つも出しません。よくあるのは
`bash-language-server` で、診断を `shellcheck` に任せています。
`hermes lsp status` に `Backend warnings` の欄が出たら、名前の挙がっている
ツールを OS のパッケージ管理から入れてください。

```
apt install shellcheck      # Debian / Ubuntu
brew install shellcheck     # macOS
scoop install shellcheck    # Windows
```

同じ警告は、サーバーの起動時に `~/.hermes/logs/agent.log` へ一度だけ
記録されます。

**サーバーは起動するのに診断がまったく返ってこない**

`~/.hermes/logs/agent.log` の `[agent.lsp.client]` の行を見てください。
言語サーバーの標準エラー出力も、やりとりの中で起きたエラーも、どちらも
ここに落ちてきます。サーバーによっては（とくに rust-analyzer）、
プロジェクト全体の索引づくりを終えないとファイルごとの診断を出しません。
起動直後の最初の編集は診断なしで終わり、そのあとの編集から拾えるように
なることがあります。

**サーバーが落ちた**

落ちたサーバーは「壊れたもの」の一覧に入れられ、そのセッションの間は
もう試されません。`hermes lsp restart` でその一覧を空にすれば、次の編集で
また立ち上がります。

**git リポジトリの外にあるファイルを編集している**

LSP は git リポジトリの中でしか動かない作りになっています。まだ
プロジェクトを初期化していないなら、`git init` を実行すると LSP の診断が
使えるようになります。そうでなければ、プロセス内の文法チェックだけが
働きます。
