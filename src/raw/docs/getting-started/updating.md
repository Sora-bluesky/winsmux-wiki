---
title: "更新とアンインストール"
description: "Hermes Agent を最新版に更新する方法と、アンインストールの手順"
upstream_path: getting-started/updating.md
upstream_blob: 8c20bc1558d1d169b269df24080f4738ad865230
sources:
  - https://hermes-agent.nousresearch.com/docs/getting-started/updating
---

# 更新とアンインストール {#updating-uninstalling}

## 更新する {#updating}

最新版への更新は、コマンド 1 つで済みます。

```bash
hermes update
```

このコマンドは `main` から最新のコードを取り込み、依存関係を更新し、前回の更新以降に追加された設定項目があれば、その場で設定するよう案内します。

:::tip
`hermes update` は新しい設定項目を自動で見つけ、追加するかどうかを尋ねます。その案内を飛ばしてしまった場合は、`hermes config check` を実行すると足りない項目が分かり、`hermes config migrate` で対話形式で追加できます。
:::

### 更新中に何が起きるか {#what-happens-during-an-update}

`hermes update` を実行すると、次の順に処理が進みます。

1. **更新前のスナップショット** — 既定で軽量な状態スナップショットを保存します（ペアリング情報、cron ジョブ、`config.yaml`、`.env`、`auth.json` など、実行中に書き換わる状態ファイルが対象です。1 GiB を超えるファイルは個別に除外されるので、巨大なセッション DB があっても更新が遅くなりません）。コードの入れ替えとゲートウェイの再起動はすべてのプロファイルに影響するため、インストール内の **すべてのプロファイル** について同じスナップショットを取り、それぞれ専用の `state-snapshots/` ディレクトリに保存します。更新後の cron ジョブ保護も、各プロファイルを自分のスナップショットと照らし合わせます。動作は `updates.pre_update_backup` で決まります（既定は `quick`、`HERMES_HOME` 全体を zip にするなら `full`、無効にするなら `off`）。復旧は [スナップショットとロールバック](/hermes/docs/user-guide/checkpoints-and-rollback/) で説明しているスナップショット復元の流れで行えます。quick スナップショットはファイルを失ったときの復旧手段であって、コードを巻き戻すための保険ではありません。ある時点の状態を丸ごと戻したい場合は `--backup`（full モード）を使ってください。
2. **git pull** — `main` ブランチから最新のコードを取得し、サブモジュールも更新します
3. **取得後の構文チェックと自動ロールバック** — 取得のあと、`hermes` の起動時に必ず読み込まれる重要な 9 ファイルをコンパイルします。どれか 1 つでも構文解析に失敗した場合（マージ競合マーカーの取り残し、途中で切れたファイルなど）、Hermes は `git reset --hard <pre-pull-sha>` を実行してインストールを巻き戻し、シェルが起動できる状態を保ちます。上流で修正が入ったら、あらためて `hermes update` を実行してください。
4. **依存関係のインストール** — `uv pip install -e ".[all]"` を実行し、新しくなった依存関係を取り込みます
5. **設定の移行** — 使用中のバージョン以降に追加された設定項目を検出し、値を設定するよう案内します
6. **デスクトップアプリの再ビルド（ステージしてから入れ替え）** — Hermes Desktop アプリがこのチェックアウトからビルドされていた場合、GUI が新しいコードに合うよう再ビルドします。再ビルドはまず `apps/desktop/release/` の隣にある一時的なステージング用ディレクトリに書き出し、そこで検証してから、前のビルドに上書きする形で名前を付け替えます。Electron のダウンロード破損、依存関係の不足、ディスク不足など、途中で失敗した場合は前のアプリがそのまま残り、起動できます。このとき更新は `⚠ Update partially complete` と報告し、`hermes desktop` が再ビルドを試み直します。
7. **ゲートウェイの自動再起動** — 更新の完了後、動作中のゲートウェイを入れ替えて新しいコードをすぐ反映します。サービスとして管理されているゲートウェイ（Linux なら systemd、macOS なら launchd）は、サービスマネージャー経由で再起動します。手動で起動したゲートウェイは、動作中の PID をプロファイルに紐付けられた場合に自動で立ち上げ直します。手動で起動した `hermes serve` / `hermes dashboard` のバックエンド（たとえばリモートのデスクトップアプリ向けにネットワークへ公開している serve）も同じ扱いです。各バックエンドは起動時に自分のバインドアドレスをインストールの spawn 台帳へ記録するので、更新はコード入れ替えの前に停止し、そのあと **同じホストとポート** で立ち上げ直します。その接続先を見ているリモートのデスクトップアプリは、取り残されずに再接続できます。動作中のデスクトップアプリが持っているバックエンドは、アプリ自身の再起動処理に任せます。

### 既定以外のブランチに対して更新する: `--branch` {#updating-against-a-non-default-branch---branch}

`hermes update` は既定で `origin/main` を追いかけます。別のブランチに対して更新したい場合は `--branch <name>` を渡します。QA 用のチャンネル、機能ブランチ、リリース候補の検証などで役立ちます。

```bash
hermes update --branch release-candidate
hermes update --check --branch experimental   # preview behindness only
```

手元のチェックアウトが別のブランチにある場合、Hermes はコミットしていない作業を自動で stash し、HEAD を目的のブランチへ切り替えてから取得します。ローカルに存在しないブランチは `origin/<name>` から自動で追跡します（`git checkout -B <name> origin/<name>`）。どこにも存在しないブランチを指定した場合はきれいに失敗し、stash した変更は終了前に戻るので、中途半端な状態に取り残されることはありません。`main` でのみ働くフォークと上流の同期処理は、`main` 以外のブランチでは自動的に飛ばされます。

### 機能ブランチに置きっぱなしのチェックアウト {#checkout-parked-on-a-feature-branch}

ソースのチェックアウトが機能ブランチに置かれたままになっていた場合（ツールの都合、worktree での試行、手動での切り替えなど）、作業ツリーがきれいであれば `hermes update` が自動で更新対象のブランチへ戻します。

- **ブランチがすべてマージ済み**（すべてのコミットが既に `origin/main` に含まれていて、`git cherry` が未マージのものを報告しない場合）: 更新はその旨を `Checkout was parked on '<branch>' (fully merged) — switched back to main` と伝え、そのあとは `main` に留まります。
- **未マージのコミットがある**が作業ツリーはきれいな場合: 更新を進めるために、それでも `main` へ切り替えます。デスクトップの更新ボタン、ゲートウェイの `/update`、cron といった対話できない呼び出し元は、中断を解決する手段がないためこの動作に頼っています。コミットした内容には手を付けません。`git checkout` がコミット済みの作業を捨てることはなく、更新はブランチ名とコミット数、そしてあとで作業を再開するための `git checkout <branch>` コマンドを目立つ形で表示します。

独自のブランチを *意図して* 運用している場合（main の上に自前のパッチを載せて維持しているようなケース）は、`config.yaml` に `updates.parked_branch_strategy: update_in_place` を設定してください。更新はブランチから離れる代わりに、`origin/main` をあなたのブランチ **へ** マージします。チェックアウトは動かず、コミットも残り、動作するコードだけが進みます。可能なら fast-forward し、履歴が分かれている場合は `pre-update-<stamp>` という安全用のタグを付けたうえで通常のマージを行い、競合したときは何も変更せずきれいに停止します。`hermes update --switch-branch` を使うと、その 1 回だけ切り替え方式に戻せます。更新由来のマージコミットを溜めたくない、深い機能ブランチで作業しているときに便利です。

置きっぱなしのブランチに **コミットしていない変更** がある（作業ツリーが汚れている）場合、Hermes はそこに手を付け **ません**。コードの更新は **SKIPPED** として記録され、ブランチ名、`origin/main` からどれだけ遅れているか、解決するための具体的なコマンドを添えた警告が目立つ形で出ます。更新が成功したふりをすることはありません。完了行には常に実際のブランチと HEAD が表示される（`✓ Update complete! [main @ 30fcf9580]`）ので、ずれがひと目で分かります。自動切り替えそのものを止めたい場合は、`config.yaml` に `updates.auto_switch_parked_branch: false` を設定してください（切り替えを飛ばした際の警告は引き続き出ます）。

### 対話できない更新でのローカル変更 {#local-changes-on-non-interactive-updates}

端末から `hermes update` を実行した場合、Hermes はソースツリーのコミットしていない変更を stash し、取得したあとに戻すかどうかを **尋ねます**。これは以前からの動作そのままで、対話的な更新では何も変わりません。

端末のない状態で更新が走る場合 — デスクトップやチャットアプリの「Update」ボタン、あるいはゲートウェイ経由の更新 — は、答えるべき問いかけが出せません。stash した変更をどう扱うかは、`updates.non_interactive_local_changes` の設定で決まります。

```yaml
# ~/.hermes/config.yaml
updates:
  non_interactive_local_changes: stash   # default: keep + auto-restore
  # non_interactive_local_changes: discard  # throw local source edits away
```

- `stash`（既定） — 自動で stash し、取得し、更新後のコードの上に変更を自動で戻します。何も失われません。戻すときに競合した場合は git の stash に残るので、あとから手作業で回収できます。
- `discard` — 自動で stash し、取得後にその stash を捨てるので、更新は常にきれいなツリーに着地します。Hermes のソースへのローカルな変更をまったく残すつもりがない端末だけで使ってください。処理は stash の削除であって `git reset --hard` + `git clean -fd` ではないため、`node_modules`、`venv`、ビルド成果物のような無視対象のパスには一切触れません。

デスクトップアプリでは **Settings → Advanced → In-App Update Local Changes** に相当します。

**デスクトップからの更新では自動復元を行いません。** デスクトップの更新処理は `hermes update --keep-stash` を呼びます。更新を進めるためにローカルのソース変更は stash されますが、そのあと戻すことは **ありません**。変更は `git stash` に置かれたままになり、更新ログには取り戻すための `git stash apply <ref>` コマンドがそのまま表示されます。こうすることで、ローカルの変更が黙ってデスクトップの更新に紛れ込み、更新したばかりのインストールを壊すのを防げます（破棄を選んでいる場合は `non_interactive_local_changes: discard` が優先されます）。置いたままの変更を手で戻すには、次のようにします。

```bash
cd ~/.hermes/hermes-agent   # or your install root
git stash list --format='%gd %H %s'   # find the hermes-update-autostash entry
git stash apply stash@{0}
```

端末での `hermes update` でも `--keep-stash` を渡せます。対話的な実行でも同じく「戻さない」動作にしたいときに使ってください。

### 確認だけする: `hermes update --check` {#preview-only-hermes-update---check}

取得する前に更新があるかどうかだけ知りたい場合は、`hermes update --check` を実行します。フェッチして `origin/main` とコミットを比べるだけで、ファイルは書き換わらず、ゲートウェイも再起動しません。「更新があるか」で処理を分けるスクリプトや cron ジョブで役立ちます。

### まとめて事前確認する: `hermes update --plan` {#fleet-preview-hermes-update---plan}

複数のプロファイルやサービスが動いている端末を更新する前に、`hermes update --plan` を実行すると、何も変更せずに更新計画の全体が表示されます。インストールの種類（git チェックアウト、Docker イメージ、Nix や apt による管理）、すべてのプロファイルで動作中の Hermes サービスと、その管理役（systemd、launchd、手動）、実際に動いているコードのバージョン、そしてそれぞれに適用される再起動方法が分かります。手動で起動した `hermes serve` / `hermes dashboard` のバックエンドも spawn 台帳から拾われ、記録されたバインド先と「コード入れ替えの前に停止し、記録された起動引数で立ち上げ直す」という再起動方法が示されます。イメージやパッケージで管理されているインストールでは、その場では更新できない旨と、正しい更新コマンドが表示されます。読み取りだけなので、稼働中の環境でも安全です。

同じ一覧は、実際の更新ごとに書き出されるレシート（`~/.hermes/logs/update_receipts/`）にも埋め込まれています。更新後に、更新処理が見ていたものと実際に行ったことを突き合わせられます。

### 更新レシートとバージョンの照合 {#update-receipts-and-the-fleet-version-check}

`hermes update` は実行のたびに、機械で読めるレシートを `~/.hermes/logs/update_receipts/` に書き出します（直近 20 件を保持し、`latest.json` は常に最新を指します）。中身は更新前の計画、実施した各手順、飛ばした処理とその理由、ゲートウェイ再起動の結果、そして最終的なバージョンの一覧です。再起動の段階を終えると、更新処理は動作中の各ゲートウェイのコードを更新後のチェックアウトと比べ、プロファイルごとの一覧を表示します。更新前のコードのまま動いているゲートウェイがあれば、具体的な再起動コマンドとともに目立つ形で報告し、更新自体も 0 以外で終了するので、バージョンの混ざった状態を自動処理が正常とみなすことはありません。`--plan` とバージョン照合はどちらも、可能であれば動作中の各ゲートウェイにローカルの制御ソケット（プロファイルのデータディレクトリにある `gateway.sock`、Windows では名前付きパイプ）経由で直接問い合わせるため、バージョンと管理役の情報はゲートウェイ本人から得られます。古いバージョンのゲートウェイは、従来どおり状態ファイルから見つけます。

### 更新前の完全バックアップ: `--backup` {#full-pre-update-backup---backup}

大事なプロファイル（本番のゲートウェイ、チームで共有しているインストールなど）では、取得前に `HERMES_HOME` を丸ごとバックアップする方式を選べます（設定、認証情報、セッション、スキル、ペアリングを含みます）。

```bash
hermes update --backup
```

毎回これを既定にすることもできます。

```yaml
# ~/.hermes/config.yaml
updates:
  pre_update_backup: full
```

`updates.pre_update_backup` は 3 つのモードを持つ 1 つのつまみです。`quick`（既定 — 上で説明した軽量な状態スナップショット）、`full`（quick のスナップショットに加えて `HERMES_HOME` 全体の zip。ホームが大きいと数分かかることがあります）、`off`（更新前のバックアップを一切取らない。`--no-backup` を渡すと 1 回だけ同じ扱いになります）です。従来の真偽値も使えます。`true` は `full`、`false` は `off` を意味します。

:::tip 別の端末へ引っ越すのですか？
更新時のバックアップは、その場での更新を守るためのものです。環境まるごとを別のハードウェアへ移すのであれば、代わりに `hermes backup` と `hermes import` を使ってください。詳しくは [Hermes を別の端末へ移す](/hermes/docs/reference/faq/#exporting-hermes-to-another-machine) と [`hermes backup` と `hermes profile export` の違い](/hermes/docs/reference/faq/#hermes-backup-vs-hermes-profile-export) をご覧ください。
:::

### Windows: 別の `hermes.exe` が動いている {#windows-another-hermesexe-is-running}

Windows では、venv のエントリポイントとなる実行ファイルを掴んでいる別の `hermes.exe` プロセスが見つかると、`hermes update` は実行を拒みます。よくあるのは Hermes Desktop アプリが起動したバックエンド、別の端末で開いたままの `hermes` REPL、動作中のゲートウェイです。

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

表示されたプロセスを終了してから、もう一度実行してください。同時に動いているプロセスが邪魔をしないと確信できる場合（まれです。たいていはウイルス対策ソフトの介在が誤って報告されたときくらいです）は、`--force` を渡すとこの確認を飛ばせます。その場合でも更新処理は `.exe` の名前付け替えを間隔を空けて再試行し、それでもロックが外れなければ `MoveFileEx(MOVEFILE_DELAY_UNTIL_REBOOT)` で次回の再起動時に置き換えるよう予約するので、更新は完了できます。

これとは別に、venv の Python インタープリタから動いているプロセスがある間（デスクトップアプリのバックエンド、ゲートウェイ、Python の REPL など）、venv に触れることを拒む二つ目の保護があります。こうしたプロセスはネイティブ拡張のファイル（`.pyd`）をロックし続けるため、依存関係の同期がアクセス拒否で途中終了すると、インストールがバージョンの中間で止まってしまいます。この保護は `--force` では **解除できません**。検出された保持者が誤検知だと確信できる場合は、明示的に `hermes update --force-venv` を使ってください。

#### Windows の venv 再作成はトランザクション方式 {#windows-venv-recreation-is-transactional}

Windows のインストーラーが既存の `venv` を作り直す必要があるとき、まず古いディレクトリを重複しない `venv.stale.*` という名前へ移し、そのあとで置き換え先を作って検証します。古いツリーが削除されるのは、依存関係のインストールが完了し、新しいツリーで基本的なインポートが通ったあとだけです。それまでは巻き戻しの元として残ります（`venv.pending-backup` に記録されます）。

移動を完了できなかった場合、インストーラーは処理を止め、稼働中の `venv` には手を付けません。`uv` が失敗した場合や、成功と報告しながらインタープリタを作っていない場合は、途中まで作られたものを `venv.failed.*` へ移し、前の venv を戻します。これにより、インストールに失敗したあとでも健全性チェックや阻害要因の確認が使える状態を保てます。

別のプロセスがまだファイルハンドルを握っていると、`venv.stale.*` や `venv.failed.*` のディレクトリが残ることがあります。そのインストールを使っている Hermes Desktop、ゲートウェイ、Python のプロセスを終了してから、インストールや更新をやり直してください。残ったディレクトリは、再作成に成功したあとで可能な範囲で片付けられます。

出力はおおむね次のようになります。

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

### 更新後に確認しておきたいこと {#recommended-post-update-validation}

`hermes update` は更新の本筋を引き受けますが、簡単な確認をしておくと、すべてきれいに反映されたと分かります。

1. `git status --short` — 思い当たらない変更が出ていたら、先へ進む前に中身を確かめます
2. `hermes doctor` — 設定、依存関係、サービスの状態を点検します
3. `hermes --version` — 期待どおりバージョンが上がったか確かめます
4. ゲートウェイを使っている場合: `hermes gateway status`
5. `doctor` が npm の脆弱性を報告した場合: 指摘されたディレクトリで `npm audit fix` を実行します

:::warning 更新後に作業ツリーが汚れている場合
`hermes update` のあとに `git status --short` で身に覚えのない変更が出ていたら、そこで止めて中身を確認してください。たいていは、ローカルの変更が更新後のコードの上に戻されたか、依存関係の処理がロックファイルを更新したかのどちらかです。
:::

### 更新の途中で端末が切れたら {#if-your-terminal-disconnects-mid-update}

`hermes update` は、うっかり端末を失っても大丈夫なように作られています。

- 更新は `SIGHUP` を無視するので、SSH の接続や端末のウィンドウを閉じても、インストールの途中で止まることはありません。`pip` と `git` の子プロセスもこの保護を引き継ぐため、接続が切れても Python 環境が中途半端なまま残ることはありません。
- 更新中の出力はすべて `~/.hermes/logs/update.log` にも書き出されます。端末が消えてしまったら、接続し直してログを見れば、更新が終わったか、ゲートウェイの再起動が成功したかを確認できます。

```bash
tail -f ~/.hermes/logs/update.log
```

- `Ctrl-C`（SIGINT）とシステムのシャットダウン（SIGTERM）は従来どおり効きます。こちらは事故ではなく、意図した中断だからです。

端末が切れても大丈夫なように `hermes update` を `screen` や `tmux` で包む必要は、もうありません。

### 今のバージョンを確認する {#checking-your-current-version}

```bash
hermes --version
```

[GitHub のリリースページ](https://github.com/NousResearch/hermes-agent/releases) にある最新版と見比べてください。

### メッセージングアプリから更新する {#updating-from-messaging-platforms}

Telegram、Discord、Slack、WhatsApp、Teams から次のように送っても更新できます。

```
/update
```

これで最新のコードを取得し、依存関係を更新し、動作中のゲートウェイを再起動します。再起動の間だけボットは一時的に応答しなくなり（おおむね 5〜15 秒）、そのあと復帰します。

### 手動で更新する {#manual-update}

クイックインストーラーを使わず、手動でインストールした場合は次のようにします。

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

更新で不具合が出た場合は、前のバージョンへ戻せます。

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

特定のリリースタグへ戻す場合は、次のようにします（タグは自分が使っていたものに置き換えてください。たとえば `v2026.5.16` のような最近のリリースや、`git tag --sort=-version:refname` で出てくる以前のタグです）。

```bash
git checkout vX.Y.Z
uv pip install -e ".[all]"
```

:::warning
新しい設定項目が追加されていた場合、巻き戻すと設定が噛み合わなくなることがあります。戻したあとに `hermes config check` を実行し、エラーが出るようなら認識されない項目を `config.yaml` から取り除いてください。
:::

### イメージで管理されたインストール（Docker）と来歴マーカー {#image-managed-installs-docker-the-provenance-marker}

公開されている Docker イメージには、そのファイルシステムがイメージで管理されていることを確実に示す小さな読み取り専用のマーカー（`/etc/hermes/image-provenance.json`）が焼き込まれています。`hermes update`、`hermes update --check`、ダッシュボードの Update ボタンは、いずれも何かに触れる前にこれを確認します。イメージ管理のインストールではきれいに実行を拒み（終了コード 2）、本来の更新コマンド（`docker pull nousresearch/hermes-agent:latest`）を表示し、`refused` のレシートを書き出すので、運用ツールから試行の跡が見えます。ソースのチェックアウトがコンテナへバインドマウントされていても、マーカーが優先されます。拒否の判断は、見た目ではなく動いているファイルシステムが *何であるか* に基づいているからです。マーカーが壊れている場合も拒否します（安全側に倒す設計です）。Nix や apt で管理されたインストールも、従来の検出を使って同じ関門で拒否されます。

### Nix を使っている方へ {#note-for-nix-users}

Nix は明示的にサポートされるインストール経路ではなくなりました（できる範囲での対応のみです）。詳しくは [Nix のセットアップ](/hermes/docs/getting-started/nix-setup/) をご覧ください。Nix の flake でインストールした場合、更新は Nix のパッケージマネージャーが担います。

```bash
# Update the flake input
nix flake update hermes-agent

# Or rebuild with the latest
nix profile upgrade hermes-agent
```

Nix でのインストールは変更不能なので、巻き戻しは Nix の世代管理に任せます。

```bash
nix profile rollback
```

詳しくは [Nix のセットアップ](/hermes/docs/getting-started/nix-setup/) をご覧ください。

---

## アンインストールする {#uninstalling}

```bash
hermes uninstall
```

アンインストーラーは、あとで入れ直すときのために設定ファイル（`~/.hermes/`）を残すかどうかを選ばせてくれます。

:::tip やめるのではなく、別の端末へ引っ越すのですか？
何かを消す前に、環境を持ち出しておきましょう。`hermes backup` は認証情報を含めて `~/.hermes` ディレクトリ全体を保存します。`hermes profile export` は 1 つのプロファイルをまとめますが、設計上そこに認証情報は含まれません（したがってエクスポートだけでは完全なバックアップになりません）。詳しくは [`hermes backup` と `hermes profile export` の違い](/hermes/docs/reference/faq/#hermes-backup-vs-hermes-profile-export) をご覧ください。
:::

### 手動でアンインストールする {#manual-uninstall}

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
