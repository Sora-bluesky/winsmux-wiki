---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "ターミナル環境プロバイダプラグイン"
description: ""
upstream_path: developer-guide/terminal-environment-plugin.md
upstream_blob: 324e5e0595ce5b0c97c7b933f12260169b3fbcae
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/terminal-environment-plugin
---

# ターミナル環境プロバイダプラグイン {#terminal-environment-provider-plugins}

Hermes は、差し替えのきく**ターミナルバックエンド**の集まりを通してシェルコマンドを実行します。
組み込みのバックエンド（local、Docker、Modal、Daytona、Vercel Sandbox、SSH）は
本体リポジトリの `tools/environments/` にあります。公式の
[Singularity/Apptainer プラグイン](https://github.com/NousResearch/hermes-official-plugins/tree/main/singularity)
は、このページの内容をひととおり実装した例です。一方、社外の
サンドボックス事業者は**プラグイン**として組み込みます。`~/.hermes/plugins/` に置いた
独立したプラグインリポジトリがバックエンドを登録し、利用者は `config.yaml` の
`terminal.backend` で、組み込みのものとまったく同じように選べます。

このページは [ブラウザプロバイダプラグイン](/hermes/docs/developer-guide/browser-provider-plugin/)
の解説と対になっています。登録の流れも、スコープの考え方も同じです。

## プロバイダが受け持つ範囲 {#what-a-provider-controls}

登録したバックエンドは、本体の次の機能すべてに自動で組み込まれます。

| 対象 | 決めているもの |
|---|---|
| コマンドの振り分け（`terminal`、`execute_code`、ファイル操作ツール） | `create_environment()` |
| `hermes setup` のバックエンド選択画面 | `display_name`、`description`、`setup_instructions()`、`post_setup()` |
| ダッシュボードのターミナルバックエンド選択（検査結果の表示） | `probe()` |
| `hermes status` / `hermes doctor` | `doctor_checks()` |
| システムプロンプトに載る実行環境の説明 | `is_remote`、`env_description` |
| 危険なコマンドの承認を省くかどうか | `skip_container_guards` |
| コンテナ内のパスと作業ディレクトリの扱い | `is_container` |
| `terminal.cwd` が未設定か使えないときに、コマンドを始める場所 | `default_cwd` |
| Bot Desktop、`computer_use`、ブラウザをターミナルに追従させる | `supports_streams` + 環境オブジェクトの `exec_prefix()` |
| 同期したキャッシュファイルのパス変換 | `cache_path_base` |
| 起動する子プロセスから秘密情報を取り除く処理 | `strip_env_keys` |
| セッションごとのサンドボックス分離（`container_persistent: false`） | `session_isolated_when_nonpersistent` |

これらのフラグをプロバイダ側で宣言しておけば、「バックエンドを新しく足したのに N 番目の
判定箇所を直し忘れた」という昔ながらのバグがまとめて消えます。本体は名前をハードコードした
一覧ではなく、判定のたびに登録内容を参照するからです。

## 最小構成のプロバイダ {#minimal-provider}

```python title="~/.hermes/plugins/acmebox/__init__.py"
from agent.terminal_env_provider import TerminalEnvironmentProvider

class AcmeBoxEnvironment:
    """Must satisfy the BaseEnvironment duck-typed contract."""

    def __init__(self, cwd, timeout, task_id):
        self.cwd, self.timeout, self.task_id = cwd, timeout, task_id

    def execute(self, command, timeout=None, **kwargs):
        ...  # run the command in the sandbox
        return {"output": "...", "exit_code": 0}

    def cleanup(self):
        ...  # tear down / detach

class AcmeBoxProvider(TerminalEnvironmentProvider):
    name = "acmebox"
    display_name = "AcmeBox"
    is_remote = True          # commands don't run on the host
    is_container = True       # container-style path/cwd semantics

    @property
    def description(self):
        return "Run commands in an AcmeBox cloud sandbox."

    @property
    def cache_path_base(self):
        return "~/.hermes"    # where synced cache files land, or None

    @property
    def strip_env_keys(self):
        return frozenset({"ACMEBOX_TOKEN"})

    def is_available(self):
        import importlib.util, os
        return (
            importlib.util.find_spec("acmebox") is not None
            and bool(os.getenv("ACMEBOX_TOKEN"))
        )

    def create_environment(self, *, cwd, timeout, task_id="default",
                           image=None, container_config=None, **kwargs):
        return AcmeBoxEnvironment(cwd, timeout, task_id)

def register(ctx):
    ctx.register_terminal_environment_provider(AcmeBoxProvider())
```

```yaml title="~/.hermes/plugins/acmebox/plugin.yaml"
name: acmebox
version: 0.1.0
description: AcmeBox cloud sandbox terminal backend
kind: backend
```

有効にして選び、あとは動かすだけです。次の 2 行で、プラグインを使える状態にしてから
ターミナルのバックエンドとして指定します。

```bash
hermes plugins enable acmebox
hermes config set terminal.backend acmebox
```

## ルール {#rules}

- **予約されている名前があります。** 組み込みバックエンドの名前（`local`、`docker`、
  `modal`、`managed_modal`、`daytona`、`vercel_sandbox`、`ssh`）と
  ぶつかる登録は拒否されます。プラグインはバックエンドを増やすものであって、
  本体のバックエンドを覆い隠すことは決してありません。
- **`create_environment` は `**kwargs` を受け取れること。** 知らないキーは黙って
  無視してください。これは将来への互換性の約束で、生成側のシグネチャが変わっても
  古いプラグインが壊れないようにするためのものです。
- **`is_available()` と `probe()` は軽く済ませること。** ネットワーク通信は入れないで
  ください。必要条件のチェックや画面の描画のたびに呼ばれます。
- **どこでも安全側に倒すこと。** プロバイダの属性が例外を投げた場合、本体はそれを
  既定値として扱います（たとえば `skip_container_guards` が例外を投げれば、承認の層は
  有効なままになります）。例外を制御の流れに使わないでください。
- **秘密情報は `strip_env_keys` に入れること。** 事業者から渡されたトークンを、モデルが
  書いたシェルコマンドから読めるようにしては絶対にいけません。ここに挙げておけば、
  組み込みの `MODAL_*` や `DAYTONA_API_KEY` と同じように、起動するあらゆる子プロセスから
  無条件に取り除かれます。

## 環境オブジェクトの約束ごと {#environment-object-contract}

`create_environment()` は、`tools.environments.base.BaseEnvironment` と同じダックタイピングの
インターフェースを満たすオブジェクトを返します。

- `execute(command, timeout=None, ...)` → `{"output": str, "exit_code": int}`
- `cleanup()` — 資源を解放します。セッション終了時や、使われないまま放置されたときに呼ばれます
- 任意 — 組み込みのクラウドバックエンドと同じ形の永続化フック

`BaseEnvironment` を継承すると、ファイル同期やバックグラウンドプロセスまわりの共通処理を
そのまま使えるのでおすすめですが、必須ではありません。

## ファイルツールとホストのファイルシステム {#file-tools-and-the-host-filesystem}

`read_file`、`write_file`、`patch`、`search_files` は環境の `execute()` を通るので、
コマンドから見えるのとまったく同じファイルを見ます。
唯一の例外は `uses_host_filesystem = True` を宣言している環境です（宣言しているのは組み込みの
`LocalEnvironment` だけです）。その場合、ファイルツールはホストを直接読み書き・検索し、同梱の
ripgrep を実行し、ホスト上のパスを stat し、大きすぎるツール出力をそのまま
`~/.hermes/cache/spillover` に書き出し、LSP の診断を有効にします。

コマンドを閉じ込めるために `LocalEnvironment` を継承するバックエンド（パスを隠したり、読み取り専用で
マウントしたり、コマンドに専用の `$TMPDIR` を与えたりする bubblewrap などのホスト用サンドボックス）は
`True` を受け継ぐので、これを無効にしなければなりません。無効にしないと、ファイルツールが
サンドボックスを素通りします。

```python
from tools.environments.local import LocalEnvironment

class AcmeJailEnvironment(LocalEnvironment):
    uses_host_filesystem = False  # file tools run inside the jail, via execute()
```

`LocalEnvironment` を継承しないバックエンドでは設定しないでください。既定値は
`False` です。Hermes v0.22.5 以前はこの属性を無視し、`LocalEnvironment` を継承したすべての
クラスでホスト向けの高速経路を使うので、`requires_hermes` はそれより新しい版に固定してください。

## イメージ {#images}

バックエンドは、自分のイメージ設定（`config_schema` のキーか、ドキュメントに書いておく
`terminal.<name>_image` のキー）を自分で読みます。Hermes が `image=` を渡すのは、タスクごとに
上書きするときだけです。バッチ実行（`batch_runner.py`）でプロンプトごとに別のコンテナを使うと、
そのイメージが有効なバックエンドの `<name>_image` として登録され、その値が
`create_environment(image=...)` に届きます。それ以外のときの `image` は `""` なので、
自分の設定値を使ってください。

## 起動時の作業ディレクトリ {#starting-directory}

`default_cwd` を定義しない場合、プラグインのバックエンドは `/root` から始まります。また `is_container` が有効なら、
ホスト側のパスに見える `terminal.cwd` は `/root` に置き換えられます。別の場所から始めたいときは、
サンドボックス内の絶対パスを返してください。

```python
    @property
    def default_cwd(self):
        return "/home/acme"
```

ホームディレクトリがサンドボックスの起動後にしか分からない場合は、代わりに `"~"` を返します。
すると Hermes は `create_environment()` に `cwd="~"` を渡し（ホスト側で展開することはありません）、
環境オブジェクトのほうで、解決したホームの絶対パスを `self.cwd` に設定します。

```python
class AcmeBoxEnvironment(BaseEnvironment):
    def __init__(self, *, cwd, timeout, sandbox):
        if cwd == "~":
            cwd = sandbox.home()  # e.g. "/home/acme"
        super().__init__(cwd=cwd, timeout=timeout)
```

Hermes はバックエンドの既定値として `~` をそのまま保持するので、新しいサンドボックスはそれぞれ自分のホームを解決します。
各環境が解決したパスは、その環境ごとに記録されます。
コマンドが `cwd="~"` 付きで届くこともありますが、`BaseEnvironment` はすでにそこへ正しく `cd` します。
そのホーム配下へ `cd` した場合は、その場所が後続のコマンドにも引き継がれ、
ファイル操作ツールで相対パスを解決する起点にもなります。この仕組みがないと、
`/home/acme/project` のようなサンドボックス内のパスが、ホスト側のパスとみなされて捨てられてしまいます。

`default_cwd` はコマンドを実行するたびに読み込まれるので、軽い処理にしてください（ネットワーク呼び出しはしない）。
相対パスは無視されます。Hermes がホスト側を起点に解釈してしまうためです。

## Bot Desktop と `computer_use` {#bot-desktop-and-computeruse}

画面、`computer_use`、ブラウザは、stdin と stdout を開いたままの常駐プロセスをサンドボックス内で起動することで、
Docker と SSH のサンドボックス（および Singularity プラグインのもの）へターミナルと一緒に移ります。
プラグインのバックエンドも、同じ方法でこれに対応できます。

1. プロバイダに `supports_streams = True` を設定します。すると `bot_desktop.placement: auto`
   は、拒否する代わりに画面をそのバックエンドの中に置くようになります。
2. 環境オブジェクトに `exec_prefix(*, user=None, interactive=True)` メソッドを持たせます。
   このメソッドは、後ろに続くものをサンドボックス内で stdin と stdout を開いたまま実行する、
   ローカル側の argv（`docker exec -i <container>` のような形）を返します。いま実行できない場合は
   `None` を返します。Hermes は `bash -c <script>` を別々の語として後ろに付け足すので、
   クライアントはそれを手を加えずにそのまま渡す必要があり、サンドボックスには `bash` が必要です。
   `user` は実行するアカウント名です。バックエンドがユーザーを切り替えられない場合は無視してかまいません。
   コマンドを1つの文字列にせず、リストで返してください。

```python
class AcmeBoxEnvironment:
    def exec_prefix(self, *, user=None, interactive=True):
        return ["acmebox", "exec", "--stdin", self.sandbox_id, "--"]
```

サンドボックスのイメージには、デスクトップ一式（Xvnc、Xfce、Chromium、
`cua-driver`）が別途必要です。`nousresearch/hermes-sandbox:desktop` にはそろっています。Bot Desktop と
ブラウザは、作業用の一時ファイルを環境オブジェクトの `get_temp_dir()` の下に置きます。
`BaseEnvironment` を継承せず、このメソッドも持たない環境には、`BaseEnvironment` と同じ既定の動作が使われます。

ターミナルのバックエンドは、同じプロセスの中でしか動きません。ターミナルツール、ファイルツール、
`exec_prefix()`、`~` によるホームの解決は、どれも環境オブジェクトそのものを操作するからです。
`plugins.isolation: host` の下では、このオブジェクトはホストとの境界を越えられません。そのため環境を作る時点で、
`plugins.isolation: in_process` という設定名を示すメッセージとともに拒否されます（ホストがサンドボックスを起動する前です）。
Bot Desktop も `supports_streams` のバックエンドを同じように拒否します。

## セッション分離の考え方 {#session-isolation-semantics}

サンドボックスが**名前で復帰する**タイプ（バックエンドが再接続する、消えずに残る VM）なら、
`session_isolated_when_nonpersistent = True` を設定してください。
`terminal.container_persistent: false` のとき、各セッションは 1 つのサンドボックスを共有せず、
それぞれ自分のサンドボックスを持つようになります。これがないと、独立して動いている 2 つの
使い捨ての実行が同じ VM につながってしまい、互いの足元でそれを削除しかねません。
