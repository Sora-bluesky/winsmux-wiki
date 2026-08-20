---
title: "コントリビュート"
description: "Hermes Agent へのコントリビュートの進め方 — 開発環境の準備、コードスタイル、PR の流れ"
upstream_path: developer-guide/contributing.md
upstream_blob: 4d3b00d5762e01e5e9867840bcc59489d1c1eadc
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/contributing
---

# コントリビュート {#contributing}

Hermes Agent へのコントリビュートをありがとうございます。このページでは、開発環境の準備、コードベースの読み解き方、そして PR をマージまで持っていく流れを扱います。

## コントリビュートの優先順位 {#contribution-priorities}

次の順で歓迎しています。

1. **バグ修正** — クラッシュ、誤った挙動、データの消失
2. **クロスプラットフォーム対応** — macOS、各種 Linux ディストリビューション、WSL2
3. **セキュリティの強化** — シェルインジェクション、プロンプトインジェクション、パストラバーサル
4. **性能と堅牢さ** — 再試行の仕組み、エラー処理、機能を落としながら動き続ける工夫
5. **新しいスキル** — 広く役に立つもの（[スキルを作る](/hermes/docs/developer-guide/creating-skills/) を参照）
6. **新しいツール** — 必要になることはまれです。たいていの機能はスキルで足ります
7. **ドキュメント** — 誤りの修正、説明の補足、新しい例

## よくあるコントリビュートの入り口 {#common-contribution-paths}

- Hermes 本体に手を入れず、自分用やローカル向けのツールを作りたい場合は [Hermes のプラグインを作る](/hermes/docs/developer-guide/plugins/) から
- Hermes 本体に組み込みのツールを新しく足したい場合は [ツールを追加する](/hermes/docs/developer-guide/adding-tools/) から
- 新しいスキルを作りたい場合は [スキルを作る](/hermes/docs/developer-guide/creating-skills/) から
- 新しい推論プロバイダーを作りたい場合は [プロバイダーを追加する](/hermes/docs/developer-guide/adding-providers/) から

## 開発環境の準備 {#development-setup}

### 事前に必要なもの {#prerequisites}

| 必要なもの          | 補足                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Git**              | `git-lfs` 拡張を入れておいてください                                                        |
| **Python 3.11–3.13** | 入っていなければ uv が入れてくれます                                                                 |
| **uv**               | 高速な Python のパッケージマネージャー（[インストール](https://docs.astral.sh/uv/)）                           |
| **Node.js 26+**      | 任意 — ブラウザ関連のツールと WhatsApp ブリッジで必要です（ルートの `package.json` の engines と揃えています） |

### 標準のインストーラーで入れる {#install-with-the-standard-installer}

たいていの場合、開発環境として最良の出発点は利用者と同じ道をたどることです。
標準のインストーラーを実行し、それが clone したリポジトリの中で作業します。
インストーラーは Hermes の venv を作り、`hermes` コマンドを通し、`hermes update` 用に
インストール方法を記録し、git プロジェクト一式を
`$HERMES_HOME/hermes-agent`（通常は `~/.hermes/hermes-agent`）に clone します。こうしておけば、
CLI・アップデーター・依存関係の遅延インストーラー・ゲートウェイ・ドキュメントが前提にしている
配置のまま開発できます。

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
cd "${HERMES_HOME:-$HOME/.hermes}/hermes-agent"

# Add dev/test extras on top of the standard install.
uv pip install -e ".[all,dev]"

# Optional: browser tools / docs site dependencies.
npm install
```

そのあとは、その作業ツリーからブランチを切ってテストを走らせます。

```bash
git checkout -b fix/description
scripts/run_tests.sh
```

完全に隔離した Hermes インスタンスを動かすこともできます（使い捨ての HERMES_HOME、独立した
Electron の userData、そして単一インスタンスのロックを避けるための別名の Electron アプリ名を使います）。

```bash
scripts/dev-sandbox.sh python -m hermes_cli.main
scripts/dev-sandbox.sh --persistent python -m hermes_cli.main desktop  # state survives restarts, but lives in the worktree :)
```

### 手動で clone する場合 {#manual-clone-fallback}

こちらは、Hermes が管理するインストール構成をあえて使いたくないときにだけ選んでください
（コンテナや CI ジョブの中の使い捨ての clone などです）。この方法で入れた場合は、
`hermes` のエントリーポイントをその venv から実行してください。システムの
`python3 -m hermes_cli.main` を叩くと、無関係なシステムの Python パッケージを
拾ってしまうことがあります。

venv は clone したソースツリーの **外側** に作ってください。エージェントが作業する
ディレクトリの中に venv があると、エージェントが自分の作業ツリーに対して相対パスの
コマンド（`rm -rf venv`、`uv venv venv` など）を実行したときに消し飛び、
動いている実行環境がセッションの途中で黙って壊れます。ツリーの外に置いておけば、
ワークスペースからの相対パスがそこに届くことはありません。

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent

# Create venv with Python 3.11, OUTSIDE the source tree
uv venv ~/.hermes/venvs/hermes-dev --python 3.11
export VIRTUAL_ENV="$HOME/.hermes/venvs/hermes-dev"
export PATH="$VIRTUAL_ENV/bin:$PATH"

# Install with all extras (messaging, cron, CLI menus, dev tools)
uv pip install -e ".[all,dev]"

# Optional: browser tools
npm install
```

### 開発用の設定 {#configure-for-development}

```bash
mkdir -p ~/.hermes/{cron,sessions,logs,memories,skills}
cp cli-config.yaml.example ~/.hermes/config.yaml
touch ~/.hermes/.env

# Add at minimum an LLM provider key:
echo 'OPENROUTER_API_KEY=sk-or-v1-your-key' >> ~/.hermes/.env
```

### 実行する {#run}

```bash
# The standard installer already put `hermes` on PATH.
hermes doctor
hermes chat -q "Hello"
```

手動で clone した場合は、その作業ツリーから `./hermes` を実行するか、
この clone の venv を明示的にシンボリックリンクしてください。

```bash
mkdir -p ~/.local/bin
ln -sf "$(pwd)/venv/bin/hermes" ~/.local/bin/hermes
```

### テストを実行する {#run-tests}

```bash
scripts/run_tests.sh
```

## コードスタイル {#code-style}

- **PEP 8** に沿いつつ、実用上の例外は認めています（行の長さは厳密には縛りません）
- **コメント**: 意図が読み取りにくいところ、トレードオフ、API の癖を説明するときだけ書きます
- **エラー処理**: 例外は具体的に捕まえます。想定外のエラーには `logger.warning()` / `logger.error()` を `exc_info=True` 付きで使います
- **クロスプラットフォーム**: Unix を前提にしないでください（後述します）
- **プロファイルを壊さないパス**: `~/.hermes` を直書きしないでください。コードの中のパスには `hermes_constants` の `get_hermes_home()` を、利用者に見せるメッセージには `display_hermes_home()` を使います。ルールの全文は [AGENTS.md](https://github.com/NousResearch/hermes-agent/blob/main/AGENTS.md#profiles-multi-instance-support) にあります。

## クロスプラットフォーム対応 {#cross-platform-compatibility}

**[対応プラットフォーム](/hermes/docs/getting-started/platform-support/)** を参照してください。Windows でそのまま動かす場合、シェルコマンドには（[Git for Windows](https://git-scm.com/download/win) の）Git Bash を使います。POSIX のカーネル機能が要る一部の機能には制限があります。ダッシュボードに埋め込まれた PTY ターミナルのペイン（`/chat` タブ）は POSIX の PTY を必要とします（Linux、macOS、WSL2）。Windows まわりの開発が中心なら、push する前に Windows の落とし穴を検出する lint（`scripts/check-windows-footguns.py`）を走らせてください。

コードを書くときは、次のことを頭に置いてください。

- **`signal.SIGKILL` をそのまま使わないでください。** Windows には定義がありません。`gateway.status.terminate_pid(pid, force=True)`（Windows では `taskkill /T /F`、POSIX では SIGKILL を実行する共通の処理）を通すか、`getattr(signal, "SIGKILL", signal.SIGTERM)` で退避してください。
- **`os.kill(pid, 0)` で生存を確かめるときは、`ProcessLookupError` に加えて `OSError` も捕まえてください。** すでに消えている PID に対して、Windows は `ProcessLookupError` ではなく `OSError`（WinError 87、「パラメーターが正しくありません」）を投げます。
- **ターミナルに POSIX の作法を強いないでください。** `os.setsid`、`os.killpg`、`os.getpgid`、`os.fork` はいずれも Windows で例外になります。`if sys.platform != "win32":` や `if os.name != "nt":` で囲ってください。
- **ファイルを開くときは `encoding="utf-8"` を明示してください。** Windows での Python の既定はシステムのロケール（多くは cp1252）で、ラテン文字以外のテキストが文字化けするかクラッシュします。
- **`pathlib.Path` か `os.path.join` を使い、`/` での手動の連結はしないでください。** OS から返ってきた文字列よりも、こちらが組み立てて子プロセスに渡す文字列でこそ効いてきます。

主なパターンは次のとおりです。

### 1. ファイルのエンコーディング {#1-file-encoding}

環境によっては、`.env` ファイルが UTF-8 以外で保存されていることがあります。

```python
try:
    load_dotenv(env_path)
except UnicodeDecodeError:
    load_dotenv(env_path, encoding="latin-1")
```

### 2. プロセスの扱い {#2-process-management}

`os.setsid()`、`os.killpg()`、シグナルの扱いはプラットフォームごとに違います。

```python

if platform.system() != "Windows":
    kwargs["preexec_fn"] = os.setsid
```

### 3. パスの区切り文字 {#3-path-separators}

`/` で文字列を連結せず、`pathlib.Path` を使ってください。

## セキュリティで気をつけること {#security-considerations}

Hermes はターミナルにアクセスできます。セキュリティは重要です。

### すでにある防御 {#existing-protections}

| 層                           | 実装                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| **sudo のパスワードの受け渡し**        | シェルインジェクションを防ぐため `shlex.quote()` を使っています                             |
| **危険なコマンドの検出** | `tools/approval.py` の正規表現パターンと、利用者に承認を求める流れ               |
| **cron のプロンプトインジェクション**       | 指示を上書きしようとするパターンをスキャナーがブロックします                                 |
| **書き込みの拒否リスト**             | シンボリックリンクによる回避を防ぐため、保護対象のパスを `os.path.realpath()` で解決します |
| **スキルのガード**                | ハブから入れたスキル向けのセキュリティスキャナー                                       |
| **コード実行のサンドボックス**      | 子プロセスは API キーを取り除いた状態で動きます                                   |
| **コンテナの堅牢化**         | Docker では、すべての capability を落とし、権限昇格を禁止し、PID 数に上限を設けています       |

### セキュリティに関わるコードを書くとき {#contributing-security-sensitive-code}

- 利用者の入力をシェルコマンドに埋め込むときは、必ず `shlex.quote()` を使う
- アクセス制御の判定の前に、`os.path.realpath()` でシンボリックリンクを解決する
- 秘密の情報をログに出さない
- ツールの実行のまわりでは、広めに例外を捕まえる
- ファイルパスやプロセスに触れる変更なら、すべてのプラットフォームでテストする

## プルリクエストの流れ {#pull-request-process}

### ブランチの名前 {#branch-naming}

```
fix/description        # Bug fixes
feat/description       # New features
docs/description       # Documentation
test/description       # Tests
refactor/description   # Code restructuring
```

### 提出する前に {#before-submitting}

1. **テストを走らせる**: CI と同じ結果にするには `scripts/run_tests.sh` を使います。直接 `python -m pytest ...` を叩くのは、このラッパーが使えないときか、意図してラッパーの外でデバッグしているときだけにしてください。
2. **手で動かす**: `hermes` を実行し、変更した経路を実際に通してみます
3. **他のプラットフォームへの影響を確かめる**: macOS、Linux、WSL2、そして Windows そのものを考えます。ファイル入出力、プロセスの扱い、ターミナルの扱い、サブプロセス、シグナルに触れたなら `scripts/check-windows-footguns.py` を走らせてください。
4. **PR は絞る**: ひとつの PR にはひとつの論理的な変更を

### PR の説明 {#pr-description}

次を書いてください。

- **何を** 変え、**なぜ** そうしたか
- **どう試すか**
- **どのプラットフォームで** 試したか
- 関連する issue への参照

### コミットメッセージ {#commit-messages}

[Conventional Commits](https://www.conventionalcommits.org/) を使っています。

```
<type>(<scope>): <description>
```

| 種別       | 使いどころ                       |
| ---------- | ----------------------------- |
| `fix`      | バグ修正                     |
| `feat`     | 新機能                  |
| `docs`     | ドキュメント                 |
| `test`     | テスト                         |
| `refactor` | コードの整理            |
| `chore`    | ビルド、CI、依存関係の更新 |

スコープ: `cli`、`gateway`、`tools`、`skills`、`agent`、`install`、`whatsapp`、`security`

例:

```
fix(cli): prevent crash in save_config_value when model is a string
feat(gateway): add WhatsApp multi-user session isolation
fix(security): prevent shell injection in sudo password piping
```

### リポジトリに置くレビュー用チェックリスト: `.agents/checks/*.md` {#repo-local-review-checklists-agentschecksmd}

Hermes の上に作られた（あるいは Hermes にレビューさせる）プロジェクトでは、レビュー用のチェックリストをリポジトリの `.agents/checks/` に置けます。それぞれのファイルは論点をひとつに絞った素のマークダウンのチェックリストで、その領域に触れる変更をレビューする前にエージェントが読み込みます。

```
.agents/
  checks/
    security.md        # e.g. "grep the diff for shell interpolation; check subprocess calls quote args"
    migrations.md      # e.g. "every schema change ships a backfill and a rollback note"
    public-api.md      # e.g. "exported signatures changed? flag for semver review"
```

うまく働かせるためのコツは次のとおりです。

- **1 ファイルに 1 つの論点** とし、その論点にちなんだ名前を付けます。小さいファイルは丸ごと読まれますが、ひとつにまとめた `checklist.md` は流し読みされます。
- **確かめられる行動として書きます**（「X を実行して Y を確認する」）。願望（「コードは安全であるべき」）ではありません。
- **どんなときに使うかを冒頭に書きます** — どのパスやどの種類の変更が対象かを書いておけば、エージェント（や人間）が関係ないものを安く読み飛ばせます。
- 守る対象のコードの隣で、バージョン管理下に置いてください。チェックリストはコードベースと一緒に育ちますし、ルールを変える PR は同じ差分の中でチェックリストも変えることになります。

`.agents/checks/` があるリポジトリで PR のレビューを Hermes に頼むときは、関係するチェックリストを先に読んでそれに沿って報告するよう伝えてください（またはスキルとして覚えさせてください）。こうすると、汎用のレビュー用プロンプトでは拾えない、そのプロジェクト固有の基準をレビュー役のエージェントに渡せます。

## 問題を報告する {#reporting-issues}

- [GitHub Issues](https://github.com/NousResearch/hermes-agent/issues) を使ってください
- 次を書いてください: OS、Python のバージョン、Hermes のバージョン（`hermes --version`）、エラーのトレースバックの全文
- 再現の手順も書いてください
- 重複を避けるため、既存の issue を先に確認してください
- セキュリティの脆弱性は、公開の場ではなく非公開で報告してください

## コミュニティ {#community}

- **Discord**: [discord.gg/NousResearch](https://discord.gg/NousResearch)
- **GitHub Discussions**: 設計の提案やアーキテクチャの議論はこちらで
- **Skills Hub**: 専門的なスキルをアップロードして、コミュニティで共有できます

## ライセンス {#license}

コントリビュートすると、その内容が [MIT License](https://github.com/NousResearch/hermes-agent/blob/main/LICENSE) の下でライセンスされることに同意したものとみなされます。
