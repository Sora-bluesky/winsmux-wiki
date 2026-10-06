---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "アプリケーション宣言"
description: ""
upstream_path: developer-guide/plugins/application-declarations.md
upstream_blob: d5130f27affce2d4c7e0797f0d0ab48a2fd9d145
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/plugins/application-declarations
---

# アプリケーション宣言 {#application-declarations}

MCP サーバーがデスクトップアプリケーションの窓口になっているプラグインは、それがどのアプリケーションで、サーバーがそのアプリケーションに何を求めるかを宣言します。コアはホスト上でその宣言を評価し、その結果に応じて、サーバーのツールと、そのアプリケーションを名前で指定しているスキルを出すかどうかを決めます。パーサーが import するのは標準ライブラリと `hermes_platform` だけです。

語彙は `hermes_platform/declaration.py` にあります。宣言はデータとポリシーの組で、ふつうのマッピング（デコード済みの YAML、JSON、dict リテラル）から解析されます。パーサーがファイルに触れることはありません。

```python
from hermes_platform import declaration

decl = declaration.parse_declaration(
    "my-server",
    raw_app={"linux": {"presence": "executable", "location": "/opt/my-app/server"}},
    raw_requires={"app": True},
    where="my-plugin/plugin.yaml",   # human label used in error messages
)
declaration.register("my-server", decl)
```

`register(server_name, decl)` は、設定上のサーバー名をキーにして、宣言を1つプロセス内のレジストリに保存します。ローダーへの組み込みは別の作業で、コアがプラグインの YAML を自動で読むことはありません。

登録されていない MCP サーバーは、これまでどおり接続だけを確認します。登録されていないサーバーを明示的に名指ししているスキルは表示されません。`clear()` はすべての登録を消すもので、プラグイン単位で読み込みを解除する操作ではありません。登録はプロセス全体に効き、プロファイルごとには分かれません。

## `app` — 各 OS でアプリケーションを見つける方法 {#app-how-to-find-the-application-on-each-os}

```yaml
app:
  win32:
    presence: executable
    location: "%ProgramFiles%/Vendor/Vendor App/McpServer/Server.exe"
    version: { kind: uninstall_registry, display_name_prefix: "Vendor App" }
    liveness:
      kind: server_json
      path: "%LOCALAPPDATA%/Vendor/Vendor App/McpServer/server.json"
      pid_key: pid
      url_key: http
      token_key: token
      endpoint_path: /mcp
  darwin:
    presence: bundle
    location: /Applications/Vendor.app
    version: { kind: plist }
```

`location` には、パスを1つ書くか、探す場所を順番に並べたリストを書きます。リストでは最初に見つかった場所が採用されます。ただし `requires.min_version` があるときは、見つかったすべてのコピーのバージョンを読み、条件を満たす最初のコピーが採用されます。リストの各項目は、パスか、場所の種類（location kind）を指定するマッピングです。

```yaml
app:
  win32:
    presence: executable
    location:
      - { kind: uninstall_registry, display_name_prefix: "Vendor App", file: vendor.exe }
      - "%ProgramFiles%/Vendor/Vendor App */vendor.exe"
    version: { kind: pe_resource }
  darwin:
    presence: bundle
    location: [{ kind: app_bundle, name: Vendor.app }]
    version: { kind: plist }
  linux:
    presence: executable
    location:
      - { kind: command, name: vendor }
      - { kind: flatpak, app_id: com.vendor.App }
      - { kind: snap, name: vendor }
```

| 場所の種類 | OS | キー | 探す場所 |
|---|---|---|---|
| （パス文字列） | どれでも | — | そのパス。`*` はバージョン付きのフォルダーを表し、バージョンの高いものから順に探します |
| `command` | どれでも | `name` | `PATH`（`executable` のときだけ） |
| `uninstall_registry` | `win32` | `display_name_prefix`, `file` | 条件に合うアンインストール項目それぞれの `InstallLocation` に `file` をつなげた場所 |
| `app_bundle` | `darwin` | `name` | `/Applications`、次に `~/Applications`（`bundle` のときだけ） |
| `flatpak` | `linux` | `app_id` | システム全体、次にユーザーごとの flatpak の `exports/bin` |
| `snap` | `linux` | `name` | `/snap/bin` |

種類ごとの OS、キー、presence、探し方は、`hermes_platform/resolver/app.py` の `LOCATION_KINDS` に1項目ずつ書かれています。パーサーはこの表に照らして検証するので、新しい種類を足すにはそこに1項目を加えるだけで済みます。各種類が見るディレクトリは `hermes_platform/resolver/known_dirs.py` にあります。

| フィールド | 型 | 規則 | 対応する `AppDef` |
|---|---|---|---|
| `<os>` | `win32` \| `darwin` \| `linux` | 1つ以上必要。未知のキーはエラー | `AppDef.os_family` |
| `presence` | `executable` \| `bundle` | OS ごとに必須 | `.presence` |
| `location` | str \| list | 必須。パスは、Windows ではドライブから始まる形（`C:\\...`）、または `~` / `%VAR%` / `$VAR` で始まる形。存在確認でネットワークに触れないよう UNC パスは拒否されます。`..` の区切り、`**`、URL スキームは不可。展開は検索時に行います。リストにはパスと、場所の種類を指定するマッピング（上記）を入れられます | `.locations` |
| `version.kind` | `pe_resource` \| `plist` \| `uninstall_registry` \| `none` | 既定は `none`。`pe_resource`/`uninstall_registry` は `win32` の下だけ、`plist` は `darwin` の下だけ | `.version_kind` |
| `version.display_name_prefix` | str | `uninstall_registry` のとき必須 | `.version_arg` |
| `liveness.kind` | `server_json` \| `none` | 既定は `none` | `.liveness_kind` |
| `liveness.path` | str | `server_json` のとき必須 | `.liveness_path` |
| `liveness.pid_key` / `url_key` / `token_key` | str | 既定は `pid` / `http` / `token` | `.liveness_*_key` |
| `liveness.endpoint_path` | str | 既定は `/mcp`。`initialize` に使うパスで、ファイルに書かれたパスは使いません | `.endpoint_path` |

`requires.app` が true のとき、`app:` に載っていない OS では `unsupported_os` になります。

## `requires` — サーバーを提示する前に必要なもの {#requires-what-the-server-needs-before-it-is-offered}

```yaml
requires:
  app: true
  min_version: "2.3.0"
```

| フィールド | 型 | 規則 |
|---|---|---|
| `app` | bool | true のときは `app:` が必須で、サーバーはアプリケーションの存在を条件に提示されます |
| `min_version` | str | `app: true` が必要。ドット区切りの数字。すべての `app.win32` と `app.darwin` に実際の `version.kind` を宣言する必要があります。`app.linux` では省略できます（Linux にはバージョンの情報源がありません）。その場合は存在だけを条件にしますが、Linux だけの宣言では最低バージョンを設定できません。区切りごとに数値として比較し、区切り内の数字以外の文字は捨てます（`2.3.0.12594` ≥ `2.3.0`。プレリリースの接尾辞は順序付けされません） |
| `gpu` | str | `nvidia`。`hermes_platform.host.facts.gpu_class()` がそのベンダーを返すホストでだけ、サーバーを提示します。`app` とは独立しています。`app:` ブロックのないサーバーでも GPU を条件にできます。 |

`app:` ブロックがないのに `requires.app: true` を書くと `DeclarationError` になります。

`gpu` は、確認できるインストール先がないアプリケーションや、何がインストールされていてもそのハードウェアを必要とするアプリケーションのためのものです。`gpu_class()` は Windows ではレジストリ、Linux では sysfs、macOS では CPU のアーキテクチャを読みます。サブプロセスやドライバーのライブラリは使いません。GPU を読み取れないとき（`unknown`）は、条件を満たしたものとして扱います。読み取りに失敗しただけで GPU を持つ端末を締め出してはいけないからで、接続の確認はその場合も行われます。受け付けるのは `nvidia` だけです。`gpu_class()` は搭載されているベンダーのうち優先度が最も高いものを返すので、「NVIDIA の GPU があるか」には正確に答えられますが、NVIDIA の GPU も載っている端末では、AMD や Intel について同じ問いに答えられないからです。

## 可用性: どの読み手も使う唯一の評価 {#availability-the-one-evaluation-every-reader-uses}

`hermes_platform/resolver/availability.py::availability(decl) -> Availability`

```
Availability(
  state:   available | installed_not_running | missing_app | version_too_old
         | unsupported_os | unsupported_gpu | no_requirements,
  version: str | None,       # inspected, when present
  path:    str | None,       # where the app was found or looked for
  min_version: str | None,   # from requires
)
```

- `no_requirements`: `requires.app` がなく、`requires.gpu` があればそれを満たしています。アプリケーションの条件は通りますが、接続の確認は引き続き行われます。
- `unsupported_os`: `requires.app` があり、`app.<this os>` のブロックがありません。I/O は一切発生しません。
- `unsupported_gpu`: `requires.gpu` が、このホストの GPU とは違うベンダーを指定しています。インストールは拒否され（`… is unavailable: unsupported_gpu, needs an NVIDIA GPU.`）、登録済みのサーバーの状態には「`<app>` needs an NVIDIA GPU; none was found on this machine. Use `<app>` on a machine with an NVIDIA GPU.」と表示されます（この端末には NVIDIA の GPU が見つからないので、NVIDIA の GPU がある端末でそのアプリケーションを使ってください、という意味です）。
- `missing_app`: `locate` がどの `location` でも何も見つけられませんでした。
- `version_too_old`: バージョンが最小値より低いか、読み取れません。
- `available`: 存在し、バージョンが条件を満たすか、バージョンの条件がありません。
- `installed_not_running`: 予約された語彙で、この評価器が返すことはありません。

評価には `locate`、任意のバージョンの確認、キャッシュ済みの GPU の情報を使います。サーバーを探ったり、アプリケーションを起動したり、接続したりすることはありません。ツールのレジストリは、既存の可用性キャッシュをそのまま保持します。

## 2つの関門 {#the-two-gates}

- **MCP の `check_fn`**（`tools/mcp_tool_handlers.py::_make_check_fn`）: 接続が生きていること、そしてそのサーバーに `requires.app` 付きの宣言が登録されている場合は `availability(decl).offerable` であること。レジストリは `bool(fn())` をキャッシュするので、戻り値はただの `bool` です。
- **スキルのフロントマターの `requires_apps:`**（`agent/skill_utils.py::skill_matches_apps`）: 各名前は `declaration.lookup` で解決されます。未知の名前があるとスキルは表示されません（安全側に閉じます）。`environments:` と同じく、提示する時点で絞り込むフィルターです。
