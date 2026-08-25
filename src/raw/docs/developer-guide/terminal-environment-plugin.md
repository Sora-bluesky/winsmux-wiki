---
title: "ターミナル環境プロバイダプラグイン"
description: ""
upstream_path: developer-guide/terminal-environment-plugin.md
upstream_blob: dd102de46cc1ab90d20a6262612362188b5ecf0d
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/terminal-environment-plugin
---

# ターミナル環境プロバイダプラグイン {#terminal-environment-provider-plugins}

Hermes は、差し替えのきく**ターミナルバックエンド**の集まりを通してシェルコマンドを実行します。
組み込みのバックエンド（local、Docker、Singularity、Modal、Daytona、Vercel
Sandbox、SSH）は本体リポジトリの `tools/environments/` にあります。一方、社外の
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
  `singularity`、`modal`、`managed_modal`、`daytona`、`vercel_sandbox`、`ssh`）と
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

## セッション分離の考え方 {#session-isolation-semantics}

サンドボックスが**名前で復帰する**タイプ（バックエンドが再接続する、消えずに残る VM）なら、
`session_isolated_when_nonpersistent = True` を設定してください。
`terminal.container_persistent: false` のとき、各セッションは 1 つのサンドボックスを共有せず、
それぞれ自分のサンドボックスを持つようになります。これがないと、独立して動いている 2 つの
使い捨ての実行が同じ VM につながってしまい、互いの足元でそれを削除しかねません。
