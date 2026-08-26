---
title: "更新とアンインストール"
description: "Hermes Agent を最新版に更新する方法と、アンインストールする方法"
upstream_path: getting-started/updating.md
upstream_blob: 5ae1f14787f0221de19b060d8fd66374918e7912
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

1. **更新前のスナップショット** — 既定で、軽量な状態スナップショットが保存されます（ペアリング情報、cron ジョブ、`config.yaml`、`.env`、`auth.json` など、実行中に書き換わる状態ファイルが対象です。1 GiB を超えるファイルは個別にスキップされるため、大きなセッション DB があっても更新が遅くなることはありません）。コードの入れ替えとゲートウェイの再起動はすべてのプロファイルに影響するため、同じスナップショットがインストール内の**すべてのプロファイル**について取られ、それぞれ自分用の `state-snapshots/` ディレクトリに保存されます。更新後に走る cron ジョブの安全網も、各プロファイルを自分のスナップショットと突き合わせて確認します。この動作は `updates.pre_update_backup` で制御します（既定は `quick`、`HERMES_HOME` 全体を zip 化するなら `full`、無効にするなら `off`）。復旧は [スナップショットとロールバック](/hermes/docs/user-guide/checkpoints-and-rollback/) で説明しているスナップショット復元の流れで行えます。軽量なスナップショットはファイルを失ったときの復旧手段であって、コードを巻き戻すための保険ではありません。ある時点の状態へ矛盾なく戻したい場合は `--backup`（full モード）を使ってください。
2. **Git pull** — `main` ブランチから最新のコードを取得し、サブモジュールも更新します
3. **取得後の構文検証と自動ロールバック** — 取得のあと、Hermes は `hermes` コマンドの起動時に必ず読み込まれる重要な 9 ファイルをコンパイルします。どれかが解析できなかった場合（例えばマージ衝突マーカーが残っている、ファイルが誤って途中で切れている）、Hermes は `git reset --hard <pre-pull-sha>` を実行してインストールを巻き戻し、シェルから起動できる状態を保ちます。上流で修正が入ったら、あらためて `hermes update` を実行してください。
4. **依存関係のインストール** — `uv pip install -e ".[all]"` を実行し、新規または変更された依存関係を取り込みます
5. **設定のマイグレーション** — 使用中のバージョン以降に追加された設定項目を検出し、値の設定を促します
6. **ゲートウェイの自動再起動** — 更新の完了後、稼働中のゲートウェイが読み込み直され、新しいコードがすぐ反映されます。サービスとして管理されているゲートウェイ（Linux の systemd、macOS の launchd）は、サービスマネージャ経由で再起動されます。手動起動のゲートウェイは、稼働中の PID からプロファイルを特定できた場合に自動で起動し直されます。手動で立ち上げた `hermes serve` / `hermes dashboard` のバックエンド（たとえば遠隔のデスクトップ用にネットワークへ公開している serve など）も同じ扱いです。各バックエンドは起動時に自分の待ち受けアドレスをインストール内の spawn ledger に記録するため、更新はコードを入れ替える前にそれを停止し、あとから**同じホストとポート**で起動し直します。その接続先を見ている遠隔のデスクトップは、切り離されずに再接続できます。稼働中のデスクトップアプリが抱えているバックエンドは、アプリ自身の起動し直しに任されます。

### 既定以外のブランチで更新する: `--branch` {#updating-against-a-non-default-branch---branch}

`hermes update` は既定で `origin/main` を追跡します。`--branch <name>` を渡すと別のブランチを対象に更新でき、QA 用のチャネル、機能ブランチ、リリース候補の検証などに役立ちます。

```bash
hermes update --branch release-candidate
hermes update --check --branch experimental   # preview behindness only
```

手元のチェックアウトが別のブランチにある場合、Hermes はコミットしていない作業を自動で退避し、HEAD を対象のブランチへ切り替えてから取得します。手元に存在しないブランチは `origin/<name>` から自動で追跡されます（`git checkout -B <name> origin/<name>`）。どこにも存在しないブランチを指定した場合はきれいに失敗し、退避した変更は終了前に元へ戻されるので、中途半端な状態に取り残されることはありません。`main` のときだけ働くフォーク元との同期処理は、`main` 以外のブランチでは自動的に省かれます。

### チェックアウトが機能ブランチに置き去りになっている場合 {#checkout-parked-on-a-feature-branch}

ツールの動作、ワークツリーでの試行、手動のチェックアウトなどが原因で、ソースのチェックアウトが機能ブランチに置き去りになっていることがあります。この場合でも、作業ツリーがきれいであれば `hermes update` は自動で更新対象のブランチへ戻します。

- **ブランチがすべて取り込み済みのとき**（すべてのコミットが `origin/main` に含まれていて、`git cherry` が未取り込みのものを 1 つも報告しない状態）: 更新は `Checkout was parked on '<branch>' (fully merged) — switched back to main` と表示し、そのあとは `main` に留まります。
- **未取り込みのコミットがあるがツリーはきれいなとき**: 更新を進められるよう、それでも `main` へ切り替えます。デスクトップの更新ボタン、ゲートウェイの `/update`、cron といった対話できない呼び出し元は、処理を飛ばされても解決する手段がないため、この挙動を前提にしています。コミットした内容はそのまま残ります。`git checkout` はコミット済みの作業を捨てることはなく、更新はブランチ名とコミット数、そのあと作業を再開するための `git checkout <branch>` コマンドを目立つ形で表示します。

手元に当てたパッチを main の上で保守しているなど、*意図して*独自ブランチを使っている場合は、`config.yaml` に `updates.parked_branch_strategy: update_in_place` を設定してください。更新はブランチから離れる代わりに、`origin/main` を自分のブランチ**へ**取り込みます。チェックアウトは動かず、コミットも残り、動作するコードだけが新しくなります。可能なら早送りで、分岐しているときは `pre-update-<stamp>` という安全用タグを付けたうえで本来のマージを行い、衝突した場合は何も変更しないまま静かに停止します。`hermes update --switch-branch` を使うと、その 1 回だけ切り替える動作に戻せます。更新によるマージコミットを溜めたくない、深い機能ブランチで作業しているときに役立ちます。

置き去りのブランチに**コミットしていない変更**がある（作業ツリーが汚れている）場合、Hermes はそれに**手を触れません**。コードの更新は **SKIPPED** として記録され、ブランチ名、`origin/main` からどれだけ遅れているか、解消するための具体的なコマンドが目立つ警告として表示されます。更新が成功したふりはしません。完了行には常に実際のブランチと HEAD が出るので（`✓ Update complete! [main @ 30fcf9580]`）、ずれがひと目で分かります。自動での切り替えを完全にやめたい場合は、`config.yaml` に `updates.auto_switch_parked_branch: false` を設定してください（この場合もスキップの警告は出ます）。

### 対話できない更新でのローカル変更 {#local-changes-on-non-interactive-updates}

端末で `hermes update` を実行すると、Hermes はソースツリーのコミットしていない変更を退避し、取得を行い、そのあと変更を戻すかどうかを**尋ねます**。従来どおりの動作で、対話的な更新については何も変わりません。

一方、デスクトップやチャットアプリの「Update」ボタン、あるいはゲートウェイ経由の更新など、**端末のない状態**で更新が走る場合は、答えるべき確認そのものがありません。退避した変更をどう扱うかは `updates.non_interactive_local_changes` の設定で決まります。

```yaml
# ~/.hermes/config.yaml
updates:
  non_interactive_local_changes: stash   # default: keep + auto-restore
  # non_interactive_local_changes: discard  # throw local source edits away
```

- `stash`（既定） — 自動で退避し、取得を行い、更新後のコードの上に変更を自動で戻します。失われるものはありません。戻すときに衝突した場合は、手作業で復旧できるよう git の stash に保持されます。
- `discard` — 自動で退避し、取得のあとその退避を捨てます。更新は常にきれいなツリーの上に着地します。Hermes のソースに手を入れた状態を残すつもりが一切ない端末でだけ使ってください。捨てるのは stash であって `git reset --hard` と `git clean -fd` ではないため、`node_modules`、`venv`、ビルド成果物のような無視対象のパスに影響することはありません。

デスクトップアプリでは、**Settings → Advanced → In-App Update Local Changes** がこの設定にあたります。

**デスクトップの更新では、変更が自動で戻されることはありません。** デスクトップの更新処理は `hermes update --keep-stash` を呼び出します。更新を進めるためにソースの変更は退避されますが、そのあと**当て直されることはありません**。変更は `git stash` に置かれたままになり、更新のログには元へ戻すための `git stash apply <ref>` コマンドがそのまま表示されます。こうしておくと、デスクトップの更新のたびにローカルの変更が気づかないうちに紛れ込み、更新したばかりのインストールを壊してしまう事態を防げます（`non_interactive_local_changes: discard` を選んでいる場合は、そちらが優先されます）。置かれたままの変更を手作業で戻すには次のようにします。

```bash
cd ~/.hermes/hermes-agent   # or your install root
git stash list --format='%gd %H %s'   # find the hermes-update-autostash entry
git stash apply stash@{0}
```

対話的な更新でも同じく「二度と当て直さない」動作にしたい場合は、端末での `hermes update` にも `--keep-stash` を渡せます。

### 確認だけする: `hermes update --check` {#preview-only-hermes-update---check}

取得する前に、更新があるかどうかだけ知りたいこともあります。`hermes update --check` を実行すると、取得したうえで `origin/main` とのコミットを比較します。ファイルは書き換わらず、ゲートウェイも再起動しません。「更新があるかどうか」で処理を分けるスクリプトや cron ジョブで役立ちます。

### 端末全体の下見: `hermes update --plan` {#fleet-preview-hermes-update---plan}

複数のプロファイルやサービスを動かしている端末を更新する前に、`hermes update --plan` を実行すると、何も変更しないまま更新計画の全体が表示されます。インストールの種類（git のチェックアウト、Docker イメージ、Nix や apt による管理）、すべてのプロファイルにわたって稼働中の Hermes サービスと、その管理方式（systemd、launchd、手動）、実際に動かしているコードのバージョン、そしてそれぞれに適用される再起動の方法が分かります。手動で立ち上げた `hermes serve` / `hermes dashboard` のバックエンドも（spawn ledger をもとに）一覧に出てきて、記録されている待ち受け先と、「コードを入れ替える前に停止し、記録された起動引数で立ち上げ直す」という再起動の方法が示されます。イメージやパッケージで管理されているインストールでは、その場では更新できない旨と、代わりに使うべき更新コマンドが示されます。読み取りだけを行うので、稼働中の環境で実行しても安全です。

同じ一覧は実際の更新すべての控え（`~/.hermes/logs/update_receipts/`）にも埋め込まれるため、更新のあとで「更新処理が何を見ていたか」と「実際に何をしたか」を突き合わせられます。

### 更新の控えとバージョン確認 {#update-receipts-and-the-fleet-version-check}

`hermes update` は実行するたびに、機械で読める控えを `~/.hermes/logs/update_receipts/` に書き出します（直近 20 件を保持し、`latest.json` は常に最新を指します）。内容は、更新前の計画、実施した各手順、飛ばした処理とその理由、ゲートウェイ再起動の結果、そして最終的なバージョンの一覧です。再起動の段階が終わると、更新処理は稼働中の各ゲートウェイが動かしているコードと更新後のチェックアウトを比較し、プロファイルごとの一覧を表示します。更新前のコードを動かし続けているゲートウェイがあれば、正確な再起動コマンドとともに目立つ形で報告され、更新は 0 以外で終了します。これにより、バージョンが混在した状態を自動化の仕組みが正常とみなすことはありません。`--plan` とバージョン確認はいずれも、可能な場合は稼働中の各ゲートウェイへローカルの制御ソケット（プロファイルのデータディレクトリにある `gateway.sock`。Windows では名前付きパイプ）越しに直接問い合わせるため、バージョンと管理方式の情報はゲートウェイ自身から得られます。古いバージョンのゲートウェイは、従来どおり状態ファイルから見つけ出します。

### 更新前の完全バックアップ: `--backup` {#full-pre-update-backup---backup}

本番のゲートウェイやチームで共有しているインストールなど、価値の高いプロファイルでは、取得前に `HERMES_HOME`（設定、認証情報、セッション、スキル、ペアリング）を丸ごとバックアップする動作を選べます。

```bash
hermes update --backup
```

毎回それを既定にすることもできます。

```yaml
# ~/.hermes/config.yaml
updates:
  pre_update_backup: full
```

`updates.pre_update_backup` は 1 つの設定で 3 つの動作を切り替えます。`quick`（既定。前述の軽量な状態スナップショット）、`full`（軽量なスナップショットに加えて `HERMES_HOME` 全体の zip。ホームが大きいと数分かかることがあります）、`off`（更新前のバックアップを一切取らない。1 回だけなら `--no-backup` でも同じです）です。従来の真偽値もそのまま使えて、`true` は `full`、`false` は `off` として扱われます。

:::tip 新しい端末へ移りたい場合は
更新時のバックアップは、その場での更新を守るためのものです。環境一式を別のハードウェアへ移すのであれば、代わりに `hermes backup` と `hermes import` を使ってください。[Hermes を別の端末へ移す](/hermes/docs/reference/faq/#exporting-hermes-to-another-machine) と [`hermes backup` と `hermes profile export` の違い](/hermes/docs/reference/faq/#hermes-backup-vs-hermes-profile-export) を参照してください。
:::

### Windows: 別の `hermes.exe` が動いている場合 {#windows-another-hermesexe-is-running}

Windows では、venv のエントリポイント実行ファイルを掴んでいる別の `hermes.exe` プロセスを見つけると、`hermes update` は実行を拒否します。よくあるのは、Hermes Desktop アプリが起動したバックエンド、別の端末で開いたままの `hermes` の対話環境、稼働中のゲートウェイです。

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

表示されたプロセスを終了してから、あらためて実行してください。同時に動いているプロセスが邪魔をしないと確信できる場合は（まれです。たいていはウイルス対策ソフトの代理プロセスが誤って検出されたときくらいです）、`--force` を渡すとこの確認を飛ばせます。その場合でも、更新処理は `.exe` の置き換えを間隔を延ばしながら再試行し、どうしても掴まれたままなら `MoveFileEx(MOVEFILE_DELAY_UNTIL_REBOOT)` で次回起動時の置き換えとして予約し、更新を完了させます。

これとは別に、venv の Python インタプリタから動いているプロセス（デスクトップアプリのバックエンド、ゲートウェイ、Python の対話環境）がある間は venv に手を触れない、という 2 つ目の防御があります。こうしたプロセスはネイティブ拡張のファイル（`.pyd`）を掴み続けるため、依存関係の同期がアクセス拒否の途中で止まると、インストールがバージョンの間で宙ぶらりんになってしまいます。この防御は `--force` では解除**されません**。検出されたプロセスが誤検出だと確信できる場合は、専用の `hermes update --force-venv` を使ってください。

#### Windows での venv 再作成はやり直しが利く {#windows-venv-recreation-is-transactional}

Windows のインストーラが既存の `venv` を作り直す必要があるとき、まず古いディレクトリを重複しない `venv.stale.*` という名前へ移し、それから置き換え先を作って検証します。古いほうが削除されるのは、依存関係のインストールが完了し、新しいツリーで基本的な読み込みが通ったあとです。それまでは巻き戻し用の元として保持されます（`venv.pending-backup` に記録されます）。

移動を完了できない場合、インストーラはそこで停止し、稼働中の `venv` には手を触れません。`uv` が失敗した場合や、成功したと報告しながらインタプリタを作れていない場合は、途中まで作った置き換え先が `venv.failed.*` へ移され、直前の venv が元に戻されます。これにより、インストールに失敗したあとでも健全性の確認や問題の切り分けを続けられます。

別のプロセスがまだファイルを掴んでいると、`venv.stale.*` や `venv.failed.*` のディレクトリが残ることがあります。そのインストールを使っている Hermes Desktop、ゲートウェイ、Python のプロセスを終了してから、インストールや更新をやり直してください。残されたディレクトリは、作り直しが成功したあとに可能な範囲で片付けられます。

実行結果は次のように表示されます。

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

`hermes update` が更新の主要な流れを引き受けてくれますが、簡単に確認しておくと、すべてがきれいに反映されたと分かります。

1. `git status --short` — 予期せず変更が残っている場合は、先へ進む前に中身を確かめてください
2. `hermes doctor` — 設定、依存関係、サービスの状態を確認します
3. `hermes --version` — バージョンが想定どおり上がったか確かめます
4. ゲートウェイを使っている場合: `hermes gateway status`
5. `doctor` が npm の監査結果を報告した場合: 指摘されたディレクトリで `npm audit fix` を実行します

:::warning 更新後に作業ツリーが汚れている
`hermes update` のあとに `git status --short` が想定外の変更を表示した場合は、そこで止まって中身を確かめてください。たいていは、更新後のコードの上にローカルの変更が当て直されたか、依存関係の処理がロックファイルを更新したことが原因です。
:::

### 更新の途中で端末が切れた場合 {#if-your-terminal-disconnects-mid-update}

`hermes update` には、端末をうっかり失っても大丈夫なようにする仕組みがあります。

- 更新は `SIGHUP` を無視するため、SSH のセッションや端末のウィンドウを閉じても、インストールの途中で止まってしまうことはありません。`pip` と `git` の子プロセスもこの保護を引き継ぐので、接続が切れても Python の環境が中途半端なまま残ることはありません。
- 更新が動いている間、出力はすべて `~/.hermes/logs/update.log` にも書き出されます。端末が消えてしまったら、つなぎ直してログを見れば、更新が終わったかどうか、ゲートウェイの再起動が成功したかどうかを確認できます。

```bash
tail -f ~/.hermes/logs/update.log
```

- `Ctrl-C`（SIGINT）とシステムの終了（SIGTERM）は従来どおり効きます。こちらは事故ではなく、意図した中断だからです。

端末が切れても大丈夫なように `hermes update` を `screen` や `tmux` で包む必要は、もうありません。

### 現在のバージョンを確認する {#checking-your-current-version}

```bash
hermes --version
```

[GitHub のリリースページ](https://github.com/NousResearch/hermes-agent/releases) にある最新のリリースと見比べてください。

### メッセージングアプリから更新する {#updating-from-messaging-platforms}

Telegram、Discord、Slack、WhatsApp、Teams から次のように送っても更新できます。

```
/update
```

これで最新のコードを取得し、依存関係を更新し、稼働中のゲートウェイを再起動します。再起動の間、ボットは短い時間だけ応答しなくなり（おおむね 5〜15 秒）、そのあと元に戻ります。

### 手作業での更新 {#manual-update}

（簡易インストーラではなく）手作業でインストールした場合は次のようにします。

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

### 巻き戻しの手順 {#rollback-instructions}

更新で不具合が出た場合は、以前のバージョンへ戻せます。

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

特定のリリースタグへ戻す場合は次のようにします（以前使っていたタグに置き換えてください。たとえば `v2026.5.16` のような最近のリリースや、`git tag --sort=-version:refname` で出てくる過去のタグです）。

```bash
git checkout vX.Y.Z
uv pip install -e ".[all]"
```

:::warning
新しい設定項目が追加されていた場合、巻き戻すと設定が食い違うことがあります。戻したあとは `hermes config check` を実行し、エラーが出るようなら `config.yaml` から認識されない項目を取り除いてください。
:::

### イメージで管理されるインストール（Docker）と出自マーカー {#image-managed-installs-docker-the-provenance-marker}

公開されている Docker イメージには、そのファイルシステムがイメージで管理されていることを確実に示す小さな読み取り専用のマーカー（`/etc/hermes/image-provenance.json`）が焼き込まれています。`hermes update`、`hermes update --check`、そしてダッシュボードの更新ボタンは、いずれも何かに手を付ける前にこれを確認します。イメージで管理されたインストールでは、きれいに実行を断り（終了コード 2）、本来使うべき更新コマンド（`docker pull nousresearch/hermes-agent:latest`）を表示し、実行が試みられたことを運用ツール側から確認できるよう `refused` の記録を書き出します。ソースのチェックアウトをコンテナに bind mount している場合でも、マーカーの判断が優先されます。見た目がどうかではなく、動いているファイルシステムが実際に何であるかで決めるからです。マーカーが壊れている場合も同じく拒否します（安全側に倒す作りです）。Nix や apt で管理されているインストールも、既存の判別のしくみを使って同じ関門で拒否されます。

### Nix を使っている場合の注意 {#note-for-nix-users}

Nix は明示的に対応するインストール方法ではなくなり、できる範囲での対応にとどまります。[Nix のセットアップ](/hermes/docs/getting-started/nix-setup/) を参照してください。Nix の flake でインストールした場合、更新は Nix のパッケージマネージャで管理します。

```bash
# Update the flake input
nix flake update hermes-agent

# Or rebuild with the latest
nix profile upgrade hermes-agent
```

Nix によるインストールは書き換えられないため、巻き戻しは Nix の世代管理の仕組みが引き受けます。

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

:::tip 完全にやめるのではなく、新しい端末へ移る場合は
何かを消す前に、環境を持ち出しておいてください。`hermes backup` は認証情報を含めて `~/.hermes` ディレクトリ全体を取り込みます。`hermes profile export` は 1 つのプロファイルをまとめますが、設計上、認証情報は含めません（そのため、書き出しただけでは完全なバックアップにはなりません）。[`hermes backup` と `hermes profile export` の違い](/hermes/docs/reference/faq/#hermes-backup-vs-hermes-profile-export) を参照してください。
:::

### 手作業でのアンインストール {#manual-uninstall}

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
