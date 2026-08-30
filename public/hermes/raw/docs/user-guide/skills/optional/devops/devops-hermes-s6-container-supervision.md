---
title: "Hermes S6 Container Supervision — Hermes の Docker イメージで s6 サービスを直したり調べたりする"
description: "Hermes の Docker イメージで s6 サービスを直したり調べたりする"
upstream_path: user-guide/skills/optional/devops/devops-hermes-s6-container-supervision.md
upstream_blob: 76b34e9c3e7a4d13c073c51eefc5ec0ff0196157
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-hermes-s6-container-supervision
---

# Hermes S6 Container Supervision {#hermes-s6-container-supervision}

Hermes の Docker イメージで s6 サービスを直したり調べたりします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/devops/hermes-s6-container-supervision` で入れます |
| パス | `optional-skills/devops\hermes-s6-container-supervision` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux |
| タグ | `docker`, `s6`, `supervision`, `gateway`, `profiles` |
| 関連 skill | [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Hermes s6-overlay Container Supervision {#hermes-s6-overlay-container-supervision}

## この skill を使う場面 {#when-to-use-this-skill}

次のような作業のときに、この skill を読み込みます。
- Hermes の Docker イメージに固定のサービスを足す、または外す（ダッシュボードのように、コンテナが起動するたびに必ず監視下に置きたいもの）
- プロファイルごとの gateway が起動しない、再起動しない、`docker restart` で消えてしまう、といった原因を調べる
- コンテナの CMD が `/opt/hermes/docker/main-wrapper.sh` になっている理由と、先頭がダッシュの引数がどうやってユーザーのプログラムまで届くのかを理解する
- `cont-init.d` の起動スクリプト（UID の付け替え、ボリュームへの初期配置、プロファイルの復元）を書き換える
- プロファイルごとの gateway 用に生成される run スクリプトを変更する（フェーズ 4）

Hermes Agent をただ動かしたくて Docker を使いたいだけなら、代わりに `website/docs/user-guide/docker.md` を見てください。

## 全体像 {#architecture-at-a-glance}

<!-- ascii-guard-ignore -->
```
/init                                  ← PID 1 (s6-overlay v3.2.3.0)
├── cont-init.d                        ← oneshot setup, runs as root
│   ├── 01-hermes-setup                ← docker/stage2-hook.sh
│   │   ├── UID/GID remap
│   │   ├── chown /opt/data
│   │   ├── chown /opt/data/profiles (every boot)
│   │   ├── seed .env / config.yaml / SOUL.md
│   │   └── skills_sync.py
│   └── 02-reconcile-profiles          ← hermes_cli.container_boot
│       ├── chown /run/service (hermes-writable for runtime register)
│       └── walk $HERMES_HOME/profiles/<name>/gateway_state.json
│           → recreate /run/service/gateway-<name>/
│           → auto-start only those with prior_state == "running"
│
├── s6-rc.d (static services, in /etc/s6-overlay/s6-rc.d/)
│   ├── main-hermes/run                ← exec sleep infinity (no-op slot)
│   └── dashboard/run                  ← if HERMES_DASHBOARD=1, runs `hermes dashboard`
│
├── /run/service (s6-svscan watches; tmpfs)
│   ├── gateway-coder/                 ← runtime-registered per-profile
│   │   ├── type        ("longrun")
│   │   ├── run         ("#!/command/with-contenv sh ... exec s6-setuidgid hermes hermes -p coder gateway run")
│   │   ├── down        (marker — present means "registered but don't auto-start")
│   │   └── log/run     (s6-log → $HERMES_HOME/logs/gateways/coder/current)
│   └── ...
│
└── CMD ("main program")               ← /opt/hermes/docker/main-wrapper.sh
    └── routes user args: bare exec | hermes subcommand | hermes (no args)
        — exec'd by /init with stdin/stdout/stderr inherited (TTY for --tui)
```
<!-- ascii-guard-ignore-end -->

## 主なファイル {#key-files}

| パス | 役割 |
|---|---|
| `Dockerfile` | s6-overlay の導入、cont-init.d の組み込み、`ENTRYPOINT ["/opt/hermes/docker/entrypoint-dispatch.sh"]` |
| `docker/entrypoint-dispatch.sh` | PID 1 の振り分け役。イメージ自身が PID 1 を持つときは `/init` と main-wrapper を exec します。PID 1 が別に用意される環境（Fly Machines、`docker run --init`）では、s6 の補助コマンドの PATH を先に戻したうえで、stage2-hook と main-wrapper を直に呼ぶ経路に切り替えます（#38349）。 |
| `docker/stage2-hook.sh` | 「以前の entrypoint の処理」そのもの — UID の付け替え、chown、初期配置、skill の同期。cont-init.d/01-hermes-setup として動きます。 |
| `docker/cont-init.d/02-reconcile-profiles` | 起動のたびに `hermes_cli.container_boot` を呼び、永続ボリュームからプロファイルの gateway の枠を復元します。 |
| `docker/main-wrapper.sh` | コンテナの CMD。ユーザーの引数を振り分け、`s6-setuidgid` で hermes に切り替え、選ばれたプログラムを exec します。 |
| `docker/s6-rc.d/main-hermes/run` | 何もしない `sleep infinity` — s6-rc の user バンドルを成立させるための枠で、本体の hermes は監視サービスではなく CMD として動きます。 |
| `docker/s6-rc.d/dashboard/run` | 条件付きのサービス — `HERMES_DASHBOARD` が真でなければ `exec sleep infinity` になります。 |
| `docker/entrypoint.sh` | stage2 のフックを `exec` するだけの後方互換用。古い entrypoint のパスを直書きしていた外部スクリプトも、そのまま動きます。 |
| `hermes_cli/service_manager.py` | `S6ServiceManager`: `register_profile_gateway`、`unregister_profile_gateway`、`start/stop/restart/is_running`、`list_profile_gateways`。 |
| `hermes_cli/container_boot.py` | `reconcile_profile_gateways()` — 永続化されたプロファイルをたどり、s6 の枠を作り直し、`container-boot.log` を書き出します。 |
| `hermes_cli/gateway.py::_dispatch_via_service_manager_if_s6` | `hermes gateway start/stop/restart` を横取りし、コンテナ内で動いているときは s6 へ回します。 |

## なぜ構成 B（s6 の監視下ではなく CMD を本体にする）なのか {#why-architecture-b-cmd-as-main-program-not-s6-supervised}

当初の計画（v1〜v3）では、本体の hermes を s6-rc の監視サービスとして動かすつもりでした。しかし s6-overlay v3 の実際の仕組みが 2 点でそれを阻みました。

1. **cont-init.d のスクリプトには CMD の引数が渡ってこない** — そのため stage2 のフックでは `docker run <image> chat -q "hi"` を解釈して、サービスの `run` スクリプトが読む `HERMES_ARGS` を組み立てられません。
2. **`/run/s6/basedir/bin/halt` は、`/run/s6-linux-init-container-results/exitcode` に書かれた終了コードを引き継ぎません。** コンテナは何であれ 143（SIGTERM）で終了してしまいます。これは s6 の作者である skarnet が [issue #477](https://github.com/just-containers/s6-overlay/issues/477) で確認しています。_「コンテナを終了させたいなら、CMD を終了させるか、CMD がないなら望む終了コードを書いてから halt を呼ぶ必要がある」_

そこで、振り分け役を通して s6-overlay 本来の CMD パターンを使っています。`ENTRYPOINT ["/opt/hermes/docker/entrypoint-dispatch.sh"]` を置き、PID 1 のときはそこから `/init /opt/hermes/docker/main-wrapper.sh "$@"` を exec します。ユーザーの引数の前にこのラッパーが自動で足されるので、`docker run <image> --version` は `/init main-wrapper.sh --version` になり、`--version` が /init 側の POSIX シェルに横取りされません。ラッパーは `s6-setuidgid` で hermes に切り替えてから、選ばれたプログラムを exec します。そのプログラムの終了コードがそのままコンテナの終了コードになり、s6 導入前の tini と同じ約束事が保たれます。entrypoint が PID 1 でないとき（Fly Machines、`docker run --init`）は、振り分け役が `/init` をまるごと飛ばし（そのままでは `can only run as pid 1` で止まってしまいます）、s6 の補助コマンドの PATH を戻し、stage2-hook.sh を実行してから main-wrapper.sh を直に exec します。この経路では監視サービスは動きません（#38349）。

代わりに手放したもの: 本体の hermes は s6 の監視下にありません。これは tini だった頃（s6 導入前のイメージ）の挙動とまったく同じです。**新しく**保証されたのはダッシュボードの監視だけで、`/run/service/` 配下のプロファイルごとの gateway は完全に監視されます。

## すぐ使える手順 {#quick-recipes}

### 動いているコンテナで s6 が PID 1 か確かめる {#verify-s6-is-pid-1-in-a-running-container}

```sh
docker exec <c> sh -c 'cat /proc/1/comm; readlink /proc/1/exe'
# Expect: s6-svscan or init / /package/admin/s6/.../s6-svscan
```

### プロファイルの gateway サービスを見る {#inspect-a-profile-gateway-service}

```sh
# /command/ isn't on docker-exec PATH — use absolute path
docker exec <c> /command/s6-svstat /run/service/gateway-<name>
# "up (pid …) … seconds"            → running
# "down (exitcode N) … seconds, normally up, want up, …" → s6 wants it up but the process keeps exiting (crash loop)
# "down … normally up, ready …"     → user stopped it
```

### サービスを手で上げ下げする {#bring-a-service-updown-manually}

```sh
docker exec <c> /command/s6-svc -u /run/service/gateway-<name>   # up
docker exec <c> /command/s6-svc -d /run/service/gateway-<name>   # down
docker exec <c> /command/s6-svc -t /run/service/gateway-<name>   # SIGTERM (restart)
```

### cont-init の復元ログを眺める {#watch-the-cont-init-reconciler-log}

```sh
docker exec <c> tail -n 50 /opt/data/logs/container-boot.log
# 2026-05-21T06:18:05+0000 profile=coder prior_state=running action=started
# 2026-05-21T06:18:05+0000 profile=writer prior_state=stopped action=registered
```

### 固定のサービスを新しく足す {#add-a-new-static-service}

1. `docker/s6-rc.d/<name>/type` に `longrun\n` と書き、`docker/s6-rc.d/<name>/run` を作ります（`#!/command/with-contenv sh` と `# shellcheck shell=sh` を使ってください）。
2. run の先頭で `s6-setuidgid hermes` を使って hermes に切り替えます（どうしても root が要る場合を除きます）。
3. 空の `docker/s6-rc.d/<name>/dependencies.d/base` を作り、base バンドルの後に起動するようにします。
4. 空の `docker/s6-rc.d/user/contents.d/<name>` を作り、user バンドルに加わるようにします。
5. Dockerfile の `COPY docker/s6-rc.d/` が自動で拾うので、ほかに変更は要りません。

### プロファイルごとの gateway の起動コマンドを変える {#change-the-per-profile-gateway-run-command}

`hermes_cli/service_manager.py` の `S6ServiceManager._render_run_script` を書き換えます。この関数は起動時の復元処理でも `hermes_cli/container_boot.py::_register_service` から呼ばれるので、ここが唯一の正本です。あわせて `tests/hermes_cli/test_service_manager.py::test_s6_register_creates_service_dir_and_triggers_scan` の該当するアサーションも直してください。

### docker のテスト一式を走らせる {#run-the-docker-test-harness}

```sh
docker build -t hermes-agent-harness:latest .
HERMES_TEST_IMAGE=hermes-agent-harness:latest scripts/run_tests.sh tests/docker/ -v
# Expect 19 passed, 0 xfailed against the s6 image
```

テスト一式は `tests/docker/` にあり、Docker が使えない環境では飛ばされます。テストごとの制限時間は 180 秒まで延ばしてあります（`tests/docker/conftest.py` を参照）。

## よくつまずくところ {#common-pitfalls}

### `docker exec` で「command not found」になる {#command-not-found-via-docker-exec}

`/command/`（s6-overlay がバイナリを置く場所）が PATH に入るのは、監視ツリーから起動されたプロセス — サービス、cont-init.d、main-wrapper.sh — だけです。`docker exec <c> s6-svstat …` は「command not found」で失敗するので、必ず絶対パスの `/command/s6-svstat` を使ってください。`hermes` コマンドが動くのは、Dockerfile が実行時の `ENV PATH` に `/opt/hermes/.venv/bin` を足しているからです。

### プロファイルのディレクトリの所有者 {#profile-directory-ownership}

cont-init の復元処理は hermes として動きます（`02-reconcile-profiles` の中の `s6-setuidgid hermes`）。プロファイルのディレクトリが root 所有になってしまうと（たとえば `docker exec <c> hermes profile create …` が既定どおり root で走った場合）、復元処理が SOUL.md を読めず `PermissionError` で失敗します。対策として、`stage2-hook.sh` が起動の**たびに** `$HERMES_HOME/profiles` の所有者を hermes に直します（何度実行しても同じ結果になります）。この部分は消さないでください。

### `docker exec` で書いたファイルは root 所有になる {#files-written-by-docker-exec-are-root-owned}

`docker exec` は既定で root として動きます。`--user hermes` を渡すか、次回起動時の stage2 の chown に任せてください。`$HERMES_HOME/profiles/<name>/` の下に root で手作業のファイルを書かないこと — 次の復元処理で直りはしますが、その最中の処理が権限エラーに当たることがあります。

### サービスの枠はあるのに s6-svstat が「s6-supervise not running」と言う {#service-slot-exists-but-s6-svstat-says-s6-supervise-not-running}

サービスのディレクトリは tmpfs 上にあるので、コンテナの再起動で消えます。cont-init の復元処理がまだ走っていないか（`docker restart` の直後なら少し待ってください）、失敗しています。`docker logs <c> | grep '02-reconcile'` で確認してください。

### gateway が起動した直後に落ちる（svstat が `down (exitcode 1)`） {#gateway-starts-then-immediately-exits-down-exitcode-1-in-svstat}

たいていは、そのプロファイルにモデルか認証が設定されていません。サービスの枠は正しく、gateway 自体が未設定なだけです。先に `hermes -p <profile> setup` を実行してください。s6 の監視役は再起動を繰り返しますが、これは狙いどおりの動きです（設定を直せば、次の試行で起動して、そのまま動き続けます）。

### 復元処理があるプロファイルを飛ばした {#reconciler-skipped-a-profile}

復元処理は「本物のプロファイル」の目印として **`SOUL.md` があるかどうか**を見ています。`hermes profile create` は必ずこれを置きます。プロファイルのディレクトリに SOUL.md がない場合（迷子のディレクトリ、途中までの復元、バックアップ中など）、復元処理はわざと飛ばします。中身が空でもいいので `SOUL.md` を置けば、また対象に戻ります。

### 「助けて、コンテナが 143 で終了する！」 {#help-the-container-exits-143}

`s6-svscanctl -t` か `/run/s6/basedir/bin/halt` を呼んでいるものがないか確認してください。どちらも /init に stage 3 の終了処理を始めさせますが、望んだ終了コードではなく 143（SIGTERM）を返します。これがフェーズ 2 で構成を A から B に切り替えた理由です。本当の終了コードでコンテナを終わらせたいなら、CMD（main-wrapper.sh）を正常に終了させるしかありません。finish スクリプトで終了コードを制御しようとし**ない**でください。

## 関連 skill {#related-skills}

- `hermes-agent-dev`: hermes-agent のコードベース全般を読むための skill
- `hermes-tool-quirks`: Hermes のツール固有の回避策（sed / grep など）— s6 まわりと Hermes 組み込みツールのやり取りを調べるときに読み込みます。
