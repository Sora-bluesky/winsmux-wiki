---
title: "更新とアンインストール"
description: "Hermes Agent を最新版に更新する方法と、アンインストールする方法"
upstream_path: getting-started/updating.md
upstream_blob: 4e1f33e9bccd7f62556340cf4206d2810791158f
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/updating
---

# 更新とアンインストール {#updating-uninstalling}

## 更新 {#updating}

最新版への更新は、次のコマンド 1 つで済みます。

```bash
hermes update
```

このコマンドは `main` から最新のコードを取得し、依存関係を更新したうえで、前回の更新以降に追加された新しい設定項目があれば、その設定を促してくれます。

:::tip
`hermes update` は新しい設定項目を自動で検出し、追加するかどうかを尋ねます。その確認をとばしてしまった場合は、`hermes config check` を手動で実行すると不足している項目が分かり、続けて `hermes config migrate` を実行すると対話形式で追加できます。
:::

### 更新中に何が起きるのか {#what-happens-during-an-update}

`hermes update` を実行すると、次の手順が順に進みます。

1. **更新前のスナップショット** — 既定で、軽量な状態スナップショットが保存されます（ペアリング情報、cron ジョブ、`config.yaml`、`.env`、`auth.json` など、実行中に書き換わる状態ファイルが対象です。1 GiB を超えるファイルは個別にスキップされるため、大きなセッション DB があっても更新が遅くなることはありません）。この動作は `updates.pre_update_backup` で制御します（既定は `quick`、`HERMES_HOME` 全体を zip 化するなら `full`、無効にするなら `off`）。復旧は [スナップショットとロールバック](/hermes/docs/user-guide/checkpoints-and-rollback/) で説明しているスナップショット復元の流れで行えます。
2. **Git pull** — `main` ブランチから最新のコードを取得し、サブモジュールも更新します
3. **取得後の構文検証と自動ロールバック** — 取得のあと、Hermes は `hermes` コマンドの起動時に必ず読み込まれる重要な 9 ファイルをコンパイルします。どれかが解析できなかった場合（例えばマージ衝突マーカーが残っている、ファイルが誤って途中で切れている）、Hermes は `git reset --hard <pre-pull-sha>` を実行してインストールを巻き戻し、シェルから起動できる状態を保ちます。上流で修正が入ったら、あらためて `hermes update` を実行してください。
4. **依存関係のインストール** — `uv pip install -e ".[all]"` を実行し、新規または変更された依存関係を取り込みます
5. **設定のマイグレーション** — 使用中のバージョン以降に追加された設定項目を検出し、値の設定を促します
6. **ゲートウェイの自動再起動** — 更新の完了後、稼働中のゲートウェイが読み込み直され、新しいコードがすぐ反映されます。サービスとして管理されているゲートウェイ（Linux の systemd、macOS の launchd）は、サービスマネージャ経由で再起動されます。手動起動のゲートウェイは、稼働中の PID からプロファイルを特定できた場合に自動で起動し直されます。

### 既定以外のブランチで更新する: `--branch` {#updating-against-a-non-default-branch---branch}

`hermes update` は既定で `origin/main` を追跡します。`--branch <name>` を渡すと別のブランチを対象に更新でき、QA 用のチャネル、機能ブランチ、リリース候補の検証などに役立ちます。

```bash
hermes update --branch release-candidate
hermes update --check --branch experimental   # preview behindness only
```

手元のチェックアウトが別のブランチにある場合、Hermes はコミットしていない作業を自動で stash し、HEAD を目的のブランチへ切り替えてから取得します。ローカルに存在しないブランチは `origin/<name>` から自動で追跡されます（`git checkout -B <name> origin/<name>`）。どこにも存在しないブランチを指定した場合はきれいに失敗し、終了する前に stash した変更が戻されるので、おかしな状態に取り残されることはありません。`main` 専用のフォーク上流同期の処理は、`main` 以外のブランチでは自動的にスキップされます。

### チェックアウトが機能ブランチに置き去りになっている場合 {#checkout-parked-on-a-feature-branch}

ツールの動作、worktree の試行、手動のチェックアウトなどで、ソースのチェックアウトが機能ブランチに置き去りになっている場合、`hermes update` が更新対象のブランチへ自動で戻すのは、安全だと証明できるときだけです。具体的には、作業ツリーがきれいであり、**かつ** 置き去りのブランチのコミットがすべて `origin/main` に含まれている（`git cherry` が未マージのものを報告しない）場合です。この条件を満たすと、更新はその旨を `Checkout was parked on '<branch>' (fully merged) — switched back to main` と表示し、以降は `main` にとどまります。

置き去りのブランチにコミットしていない変更や未マージのコミットがある場合、Hermes はそのブランチに**手を触れません**。コードの更新は **SKIPPED** として扱われ、対象のブランチ名、`origin/main` からどれだけ遅れているか、解消するための正確なコマンドを示す目立つ警告が出ます。更新が成功したふりはしません。完了行には常に実際のブランチと HEAD が表示されるので（`✓ Update complete! [main @ 30fcf9580]`）、ずれがひと目で分かります。自動の切り替えを完全に止めたい場合は、`config.yaml` に `updates.auto_switch_parked_branch: false` を設定してください（スキップ時の警告は引き続き出ます）。

### 非対話的な更新でのローカル変更の扱い {#local-changes-on-non-interactive-updates}

ターミナルで `hermes update` を実行すると、Hermes はソースツリーのコミットしていない変更を stash し、取得を行い、そのあとで変更を戻すかどうかを**尋ねます**。従来どおりの動作で、対話的な更新については何も変わりません。

一方、**ターミナルがない状態**で更新が走る場合、たとえばデスクトップ / チャットアプリの「Update」ボタンやゲートウェイ経由の更新では、答えるべき確認が表示されません。stash された変更をどう扱うかは、`updates.non_interactive_local_changes` の設定で決まります。

```yaml
# ~/.hermes/config.yaml
updates:
  non_interactive_local_changes: stash   # default: keep + auto-restore
  # non_interactive_local_changes: discard  # throw local source edits away
```

- `stash`（既定） — 自動で stash し、取得したうえで、更新後のコードの上に変更を自動で戻します。失われるものはありません。戻す際に衝突が起きても、内容は git の stash に保持されるので手動で復旧できます。
- `discard` — 自動で stash し、取得後にその stash を破棄します。更新は常にきれいなツリーの上に着地します。Hermes のソースへローカルの編集を残すつもりが一切ない端末でのみ使ってください。動作は stash の破棄であって `git reset --hard` + `git clean -fd` ではないため、`node_modules`、`venv`、ビルド成果物といった無視対象のパスには手が触れられません。

デスクトップアプリでは、**Settings → Advanced → In-App Update Local Changes** がこの設定にあたります。

**デスクトップからの更新では、変更が自動で戻されることはありません。** デスクトップの更新処理は `hermes update --keep-stash` を呼びます。更新を進めるためにソースのローカル編集は stash されますが、そのあと再適用は**されません**。編集は `git stash` に置かれたままとなり、更新のログには元に戻すための `git stash apply <ref>` コマンドがそのまま表示されます。これにより、ローカルの編集が黙ってデスクトップ更新に紛れ込み、更新したてのインストールを壊してしまうことを防げます（破棄する設定を選んでいる場合は、`non_interactive_local_changes: discard` が優先されます）。置かれたままの変更を手動で戻すには、次のようにします。

```bash
cd ~/.hermes/hermes-agent   # or your install root
git stash list --format='%gd %H %s'   # find the hermes-update-autostash entry
git stash apply stash@{0}
```

対話的な操作でも同じく「絶対に再適用しない」動作にしたい場合は、ターミナルの `hermes update` にも `--keep-stash` を渡せます。

### 確認だけ行う: `hermes update --check` {#preview-only-hermes-update---check}

取得する前に更新の有無だけ知りたい場合は、`hermes update --check` を実行してください。フェッチして `origin/main` とコミットを比較します。ファイルは変更されず、ゲートウェイも再起動しません。「更新があるかどうか」で処理を分けるスクリプトや cron ジョブで役立ちます。

### 更新前の完全バックアップ: `--backup` {#full-pre-update-backup---backup}

本番のゲートウェイやチームで共有しているインストールなど、価値の高いプロファイルでは、取得前に `HERMES_HOME` 全体（設定、認証情報、セッション、スキル、ペアリング）をバックアップするよう指定できます。

```bash
hermes update --backup
```

毎回の実行でこれを既定にすることもできます。

```yaml
# ~/.hermes/config.yaml
updates:
  pre_update_backup: full
```

`updates.pre_update_backup` は 1 つの設定で 3 つのモードを切り替えます。`quick`（既定 — 前述の軽量な状態スナップショット）、`full`（quick のスナップショットに加えて `HERMES_HOME` 全体の zip も作成。ホームが大きいと数分かかることがあります）、`off`（更新前のバックアップを一切行わない。1 回の実行だけ無効にしたい場合は `--no-backup` でも同じです）です。従来の真偽値も引き続き使え、`true` は `full`、`false` は `off` を意味します。

:::tip 別の端末へ移行したい場合
更新時のバックアップは、その場での更新を守るためのものです。環境一式を別のハードウェアへ移行したい場合は、代わりに `hermes backup` と `hermes import` を使ってください。[Hermes を別の端末へ書き出す](https://hermes-agent.nousresearch.com/reference/faq#exporting-hermes-to-another-machine) と [`hermes backup` と `hermes profile export` の違い](https://hermes-agent.nousresearch.com/reference/faq#hermes-backup-vs-hermes-profile-export) を参照してください。
:::

### Windows: 別の `hermes.exe` が動いている場合 {#windows-another-hermesexe-is-running}

Windows では、venv のエントリポイント実行ファイルを掴んでいる別の `hermes.exe` プロセスが見つかると、`hermes update` は実行を拒否します。よくあるのは、Hermes Desktop アプリが起動したバックエンド、別のターミナルで開いたままの `hermes` の REPL、稼働中のゲートウェイです。

```
$ hermes update
✗ Another hermes.exe is running:
    PID 12345  hermes.exe

  Updating now would fail to overwrite ...\venv\Scripts\hermes.exe because
  Windows blocks REPLACE on a running executable.

  Close Hermes Desktop, exit any open `hermes` REPLs, and
  stop the gateway (`hermes gateway stop`) before retrying.
  Override with `hermes update --force` if you've already
  confirmed those processes will not write to the venv.
```

表示されたプロセスを終了してから、あらためて実行してください。同時に動いているプロセスが干渉しないと確信できる場合（まれで、たいていはウイルス対策ソフトの介在が誤って検出されたときくらいです）は、`--force` を渡すとこの検査をとばせます。その場合でも、更新処理は `.exe` のリネームを指数バックオフで再試行し、どうしてもロックが外れないときは `MoveFileEx(MOVEFILE_DELAY_UNTIL_REBOOT)` で次回の再起動時に置き換えるよう予約するので、更新を完了させられます。

これとは別に、もう 1 つの保護があり、venv の Python インタプリタから動いているプロセス（デスクトップアプリのバックエンド、ゲートウェイ、Python の REPL）がある間は venv に手を触れません。こうしたプロセスはネイティブ拡張のファイル（`.pyd`）をロックしたままにするため、依存関係の同期がアクセス拒否のエラーで途中で止まると、インストールがバージョンの中間で宙づりになってしまいます。この保護は `--force` では回避**できません**。検出されたプロセスが誤検出だと確信できる場合は、明示的に `hermes update --force-venv` を使ってください。

#### Windows の venv 再作成はトランザクション的に行われる {#windows-venv-recreation-is-transactional}

Windows のインストーラが既存の `venv` を作り直す必要がある場合、まず古いディレクトリを重複しない `venv.stale.*` という名前へ移動し、そのうえで置き換え先を作成して検証します。古いツリーが削除されるのは、依存関係のインストールが完了し、新しいツリーで基本的な import が通ったあとだけです。それまでは、古いツリーがロールバック元になります（その情報は `venv.pending-backup` に記録されます）。

移動を完了できなかった場合、インストーラは処理を止め、稼働中の `venv` には手を触れません。`uv` が失敗したり、成功と報告しながらインタプリタを作らなかったりした場合は、途中まで作られた置き換え先が `venv.failed.*` へ移され、以前の venv が復元されます。これにより、インストールに失敗したあとでも健全性チェックや阻害要因のチェックを引き続き使えます。

別のプロセスがファイルハンドルを掴んだままだと、`venv.stale.*` や `venv.failed.*` のディレクトリが残ることがあります。そのインストールを使っている Hermes Desktop、ゲートウェイ、Python のプロセスを終了してから、インストールや更新をやり直してください。置き去りのディレクトリは、再作成が成功したあとに可能な範囲で片づけられます。

想定される出力は次のとおりです。

```
$ hermes update
Updating Hermes Agent...
📥 Pulling latest code...
Already up to date.  (or: Updating abc1234..def5678)
📦 Updating dependencies...
✅ Dependencies updated
🔍 Checking for new config options...
✅ Config is up to date  (or: Found 2 new options — running migration...)
🔄 Restarting gateways...
✅ Gateway restarted
✅ Hermes Agent updated successfully!
```

### 更新後におすすめの確認 {#recommended-post-update-validation}

`hermes update` が更新の本筋を処理してくれますが、簡単に確認しておくと、すべてがきれいに反映されたと確信できます。

1. `git status --short` — ツリーが想定外に汚れていたら、先へ進む前に中身を確認してください
2. `hermes doctor` — 設定、依存関係、サービスの健全性を確認します
3. `hermes --version` — バージョンが想定どおり上がったか確認します
4. ゲートウェイを使っている場合は `hermes gateway status`
5. `doctor` が npm の監査で問題を報告した場合は、指摘されたディレクトリで `npm audit fix` を実行してください

:::warning 更新後に作業ツリーが汚れている場合
`hermes update` のあとに `git status --short` が想定外の変更を表示したら、そこで止めて中身を確認してから先へ進んでください。たいていは、更新後のコードの上にローカルの変更が再適用されたか、依存関係の処理でロックファイルが書き換わったことを意味します。
:::

### 更新の途中でターミナルが切れた場合 {#if-your-terminal-disconnects-mid-update}

`hermes update` は、うっかりターミナルを失っても大丈夫なように守られています。

- 更新処理は `SIGHUP` を無視するので、SSH のセッションやターミナルのウィンドウを閉じても、インストールの途中で止まることはありません。`pip` と `git` の子プロセスもこの保護を受け継ぐため、接続が切れて Python 環境が中途半端なままになることはありません。
- 更新中の出力はすべて `~/.hermes/logs/update.log` にも書き出されます。ターミナルが消えてしまったら、接続し直してログを確認すれば、更新が完了したかどうか、ゲートウェイの再起動が成功したかどうかが分かります。

```bash
tail -f ~/.hermes/logs/update.log
```

- `Ctrl-C`（SIGINT）とシステムのシャットダウン（SIGTERM）は引き続き受け付けます。これらは事故ではなく、意図した中止だからです。

ターミナルが切れても生き延びるために `hermes update` を `screen` や `tmux` で包む必要は、もうありません。

### 現在のバージョンを確認する {#checking-your-current-version}

```bash
hermes --version
```

[GitHub のリリースページ](https://github.com/NousResearch/hermes-agent/releases)にある最新のリリースと見比べてください。

### メッセージングのプラットフォームから更新する {#updating-from-messaging-platforms}

Telegram、Discord、Slack、WhatsApp、Teams から、次のメッセージを送って直接更新することもできます。

```
/update
```

これで最新のコードを取得し、依存関係を更新し、稼働中のゲートウェイを再起動します。再起動の間、ボットは短時間オフラインになり（通常は 5〜15 秒）、そのあと復帰します。

### 手動での更新 {#manual-update}

クイックインストーラを使わず、手動でインストールした場合は次のようにします。

```bash
cd /path/to/hermes-agent
# Activate the venv you created during install (outside the source tree)
export VIRTUAL_ENV="$HOME/.hermes/venvs/hermes-dev"
export PATH="$VIRTUAL_ENV/bin:$PATH"

# Pull latest code
git pull origin main

# Reinstall (picks up new dependencies)
uv pip install -e ".[all]"

# Check for new config options
hermes config check
hermes config migrate   # Interactively add any missing options
```

### ロールバックの手順 {#rollback-instructions}

更新によって問題が起きた場合は、以前のバージョンへ戻せます。

```bash
cd /path/to/hermes-agent

# List recent versions
git log --oneline -10

# Roll back to a specific commit
git checkout <commit-hash>
uv pip install -e ".[all]"

# Restart the gateway if running
hermes gateway restart
```

特定のリリースタグへ戻す場合は、次のようにします（タグの部分は自分が使っていたものに置き換えてください。たとえば `v2026.5.16` のような最近のリリースや、`git tag --sort=-version:refname` で分かる過去のタグです）。

```bash
git checkout vX.Y.Z
uv pip install -e ".[all]"
```

:::warning
新しい設定項目が追加されていた場合、ロールバックすると設定の互換性が崩れることがあります。戻したあとに `hermes config check` を実行し、エラーが出るようなら認識されない項目を `config.yaml` から削除してください。
:::

### Nix を使っている場合の注意 {#note-for-nix-users}

Nix は明示的にサポートされるインストール方法ではなくなりました（できる範囲での対応のみです）。[Nix のセットアップ](/hermes/docs/getting-started/nix-setup/) を参照してください。Nix flake でインストールした場合、更新は Nix のパッケージマネージャで管理します。

```bash
# Update the flake input
nix flake update hermes-agent

# Or rebuild with the latest
nix profile upgrade hermes-agent
```

Nix でのインストールはイミュータブルであり、ロールバックは Nix の世代管理の仕組みが担います。

```bash
nix profile rollback
```

詳しくは [Nix のセットアップ](/hermes/docs/getting-started/nix-setup/) を参照してください。

---

## アンインストール {#uninstalling}

```bash
hermes uninstall
```

アンインストーラは、あとで入れ直すときのために設定ファイル（`~/.hermes/`）を残すかどうかを選ばせてくれます。

:::tip 完全にやめるのではなく、別の端末へ移りたい場合
何かを消す前に、環境を持ち出しておいてください。`hermes backup` は認証情報も含めた `~/.hermes` ディレクトリ全体を保存し、`hermes profile export` は 1 つのプロファイルをまとめますが、設計上そこに認証情報は含まれません（つまり書き出しだけでは完全なバックアップになりません）。[`hermes backup` と `hermes profile export` の違い](https://hermes-agent.nousresearch.com/reference/faq#hermes-backup-vs-hermes-profile-export) を参照してください。
:::

### 手動でのアンインストール {#manual-uninstall}

```bash
rm -f ~/.local/bin/hermes
rm -rf /path/to/hermes-agent
rm -rf ~/.hermes            # Optional — keep if you plan to reinstall
```

:::info
ゲートウェイをシステムのサービスとしてインストールしている場合は、先に停止して無効化してください。
```bash
hermes gateway stop
# Linux: systemctl --user disable hermes-gateway
# macOS: launchctl remove ai.hermes.gateway
```
:::
