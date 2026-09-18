---
title: "更新とアンインストール"
description: "Hermes Agent を最新版に更新する方法と、アンインストールの手順"
upstream_path: getting-started/updating.md
upstream_blob: 9173aabb3480e814033d2f9da222bb3c668b424e
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

### 自動のお知らせを止める {#passive-update-notices}

バージョンを固定している環境や、対話操作をしないインストールでは、CLI のバージョン確認と起動時バナーの更新チェックを止められます。

```bash
hermes config set updates.check false
```

これで、キャッシュ済みの更新のお知らせと、更新確認のための通信の両方を出さなくなります。既定は `true` です。自分で実行する `hermes update --check` と `hermes update` はそのまま使えます。この設定はデスクトップアプリの更新機能には効きません。

### 更新中に何が起きるか {#what-happens-during-an-update}

`hermes update` を実行すると、次の順に処理が進みます。

1. **更新前のスナップショット** — 既定で軽量な状態スナップショットを保存します（ペアリング情報、cron ジョブ、`config.yaml`、`.env`、`auth.json` など、実行中に書き換わる状態ファイルが対象です。1 GiB を超えるファイルは個別に除外されるので、巨大なセッション DB があっても更新が遅くなりません）。コードの入れ替えとゲートウェイの再起動はすべてのプロファイルに影響するため、インストール内の **すべてのプロファイル** について同じスナップショットを取り、それぞれ専用の `state-snapshots/` ディレクトリに保存します。更新後の cron ジョブ保護も、各プロファイルを自分のスナップショットと照らし合わせます。動作は `updates.pre_update_backup` で決まります（既定は `quick`、`HERMES_HOME` 全体を zip にするなら `full`、無効にするなら `off`）。復旧は [スナップショットとロールバック](/hermes/docs/user-guide/checkpoints-and-rollback/) で説明しているスナップショット復元の流れで行えます。quick スナップショットはファイルを失ったときの復旧手段であって、コードを巻き戻すための保険ではありません。ある時点の状態を丸ごと戻したい場合は `--backup`（full モード）を使ってください。スナップショットはできる範囲での処理です。失敗した場合は `⚠ Pre-update snapshot FAILED` という警告を表示したうえで更新を続け、レシートには `pre_update_backup` が失敗した手順として記録されます（自分で `off` や `--no-backup` を指定した場合は、失敗ではなく理由付きで飛ばした処理の側に入ります）。
2. **git pull** — `main` ブランチから最新のコードを取得し、サブモジュールも更新します
3. **取得後の構文チェックと自動ロールバック** — 取得のあと、`hermes` の起動時に必ず読み込まれる重要な 9 ファイルをコンパイルします。どれか 1 つでも構文解析に失敗した場合（マージ競合マーカーの取り残し、途中で切れたファイルなど）、Hermes は `git reset --hard <pre-pull-sha>` を実行してインストールを巻き戻し、シェルが起動できる状態を保ちます。上流で修正が入ったら、あらためて `hermes update` を実行してください。
   この時点から先は、更新処理が取得したばかりのコードの上で自分自身を実行し直します（`update.log` に `=== hermes update continued on the pulled code ===` と出ます）。残りの手順で、古いモジュールと新しいモジュールが 1 つのプロセスに混ざることはありません。一瞬だけ `hermes update` のプロセスが 2 つ見えることがありますが、それがこの引き継ぎです。
4. **依存関係のインストール** — `uv pip install -e ".[all]"` を実行し、新しくなった依存関係を取り込みます
5. **設定の移行** — 使用中のバージョン以降に追加された設定項目を検出し、値を設定するよう案内します
6. **デスクトップアプリの再ビルド（ステージしてから入れ替え）** — Hermes Desktop アプリがこのチェックアウトからビルドされていた場合、GUI が新しいコードに合うよう再ビルドします。再ビルドはまず `apps/desktop/release/` の隣にある一時的なステージング用ディレクトリに書き出し、そこで検証してから、前のビルドに上書きする形で名前を付け替えます（Windows でリアルタイム検査のソフトが `release/win-unpacked` を一時的に掴んでいる場合は、短い再試行を数回はさんでやり過ごします）。Electron のダウンロード破損、依存関係の不足、ディスク不足など、途中で失敗した場合は前のアプリがそのまま残り、起動できます。このとき更新は `⚠ Update partially complete` と報告し、`hermes desktop` が再ビルドを試み直します。macOS では、再ビルドしたバンドルを `ditto` で（署名を保ったまま）古くなった `/Applications/Hermes.app` や `~/Applications/Hermes.app` に上書きコピーします。Finder や Dock から起動するアプリが、バックエンドと同じものになるようにするためです。インストール済みのアプリが動作中の場合はそれに手を付けず、いったん終了してから `hermes update` をやり直すよう案内します。
7. **ゲートウェイの自動再起動**: 更新の完了後、動作中のゲートウェイを入れ替えます。サービスとして管理されているゲートウェイ（Linux なら systemd、macOS なら launchd）は、サービスマネージャー経由で再起動します。手動で起動したゲートウェイは、その PID をプロファイルに紐付けられた場合に立ち上げ直します。手動で起動した `hermes serve` / `hermes dashboard` のバックエンドは扱いが違います。更新処理はそれらを動かしたままにして、持ち主に再起動をお願いします。[手動で起動したバックエンドの再起動のお知らせ](#manual-backend-restart-reminders) をご覧ください。動作中のデスクトップアプリが持っているバックエンドは、引き続きアプリ側の担当です。
8. **多重化への移行（複数プロファイルのインストール）** — 新しいコードでの動作が一通り確認できたあと、プロファイルが 2 つ以上あり、いまも **プロファイルごとに 1 つのゲートウェイ** を動かしているインストールは、妨げになるものがなければ、多重化した既定のゲートウェイ 1 つにまとめられます（`hermes gateway migrate --multiplex --yes` と同じです）。妨げになるもの（2 つのプロファイルで同じ Bot トークンを使っている、`/p/<profile>/` の受け口を持たない 2 番目以降のプロファイルがポートを使っている、など）がある場合は、その内容と直し方を表示するだけで、何も変更しません。プロファイルが 1 つだけのインストールには一切手を加えません。詳しくは [プロファイルごとのゲートウェイからの移行](/hermes/docs/user-guide/multi-profile-gateways/#migrating-from-per-profile-gateways) をご覧ください。

### ゲートウェイの再起動に時間がかかることがある理由 {#why-the-gateway-restart-can-take-a-while}

再起動は、処理を出し切ってから行います。動いているゲートウェイは新しいターンを受け付けなくなり、進行中の作業（チャットのターン、cron のジョブ、API の実行）が終わるのを待ってから終了します。待つ時間の上限は `agent.restart_after_turn_timeout`（既定は 30 分）で、長く走るジョブが途中で打ち切られることはありません。待っている間、アップデーターは 30 秒ごとに、ゲートウェイがまだ何を待っているかを表示します。たとえば次のとおりです。

```
  → hermes-gateway: draining (up to 1875s)...
  ⏳ still draining — 1560s left before the forced restart
     waiting on 1 active work unit(s):
       • cron job 6ba19dab68df (nightly-scout) in external worker pid 573597, running 6m40s
     finish or kill the work above to release the drain now; agent.restart_after_turn_timeout in config.yaml caps this wait
```

チャットのターンにはセッションのキー、モデル、いま使っているツールが出ます。cron のジョブにはジョブの ID、名前、それを動かしているプロセス（systemd のインストールでは再起動に耐える外部のワーカー、それ以外ではゲートウェイ自身）が出ます。ゲートウェイが処理を出し切っている間は、`hermes gateway status` でも同じ作業の一覧を見られます。待つのをやめたいときは、一覧に出ている作業を終わらせるか止めるか、`config.yaml` の `agent.restart_after_turn_timeout` を小さくしてください（`0` にすると、すぐに強制的な出し切りに入ります）。

### Windows で更新用のファイルが見つからないとき {#missing-windows-updater-files}

保守されている更新スクリプトが見当たらない場合（たとえばウイルス対策ソフトに隔離されたときです）、旧来の更新の受け渡し処理は、引き渡しに成功したと報告せずに失敗します。もう一度試す前に、インストールを修復し、セキュリティソフトの隔離レポートを確認してください。ウイルス対策そのものを止めるのはやめてください。保守されている更新処理は、成功を報告する前に、CLI の読み込み、Windows の実行ファイルのヘッダー、ASAR のヘッダーと同梱された main のエントリ、ローカルのモジュールエントリを持つ読み取り可能な画面側の HTML、最初のモジュールファイル、現在のビルド刻印を確かめます。これらは最低限の成果物チェックであって、依存関係の全数監査でも、アプリやバックエンドを実際に起動する試験でもありません。Python が見つからないことは、デスクトップアプリの終了を待つ前に報告します。依存関係の修復は、更新の一部としてそのまま実行できます。Electron は、その構成であればバックエンドを止める前に受け渡しの前提条件を確かめます。旧来のフラットな更新構成も引き続き使えるため、更新用のファイルの欠落がすべてバックエンド停止の前に見つかるわけではありません。

Windows では、パッケージ作成の途中で開き直されたデスクトップアプリを、用意したビルドへ切り替える直前にもう一度停止します。この後始末の対象は、そのチェックアウトのデスクトップリリース配下にある実行ファイルだけで、無関係なインストールは止めません。ロックが残っていた場合は、名前の付け替えのエラーを見逃さずに、切り替えそのものを失敗させます。

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

自動の stash が対象にするのは、*ソースツリー* の変更だけです。git のチェックアウトの最上位が `$HERMES_HOME` を兼ねている **フラットなインストール**（たとえば `HERMES_INSTALL_DIR=$HERMES_HOME` で入れたものや、古いインストーラーで作ったもの）では、プロファイルの実行時の状態（`state.db` とその WAL/SHM の付随ファイル、`state-snapshots/`、`backups/`、`sessions/`、`cron/jobs.json`、`cron/*.db` の保存先、`config.yaml`、`auth.json`、`memories/`、ロックや pid のファイルなど）が、追跡されていないファイルとしてチェックアウトの中に置かれています。これらのパスは git の無視対象なので、自動の stash が触れることはなく、動いているゲートウェイは更新の間もデータベースを保ったままです。フラットなインストールの最上位にほかの追跡されていないファイルを置いている場合は、チェックアウトの外へ移すか、`.git/info/exclude` に追加してください。追跡されておらず無視対象でもないものは、ソースの編集と同じように自動の stash に取り込まれます。

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

複数のプロファイルやサービスが動いている端末を更新する前に、`hermes update --plan` を実行してください。インストールの種類、プロファイルをまたいで動作中の Hermes サービス、その管理役と動いているコードのバージョン、そしてサービスごとの再起動方法が表示されます。手動で起動した `hermes serve` / `hermes dashboard` のバックエンドも、記録されたバインド先とともに出てきますが、再起動は持ち主に委ねられます。更新処理がそれらを停止したり立ち上げ直したりすることはありません。イメージやパッケージで管理されているインストールでは、代わりに外部の更新コマンドが表示されます。この計画表示は読み取りだけなので、稼働中の環境でも安全です。

同じ一覧は、実際の更新ごとに書き出されるレシート（`~/.hermes/logs/update_receipts/`）にも埋め込まれています。更新後に、更新処理が見ていたものと実際に行ったことを突き合わせられます。

### 更新レシートとバージョンの照合 {#update-receipts-and-the-fleet-version-check}

`hermes update` は実行のたびに、機械で読めるレシートを `~/.hermes/logs/update_receipts/` に書き出します（直近 20 件を保持し、`latest.json` は常に最新を指します）。中身は更新前の計画、実施した各手順、飛ばした処理とその理由、ゲートウェイ再起動の結果、そして最終的なバージョンの一覧です。SQLite の実行環境の修復もこの手順のひとつです（`sqlite_runtime_repair`）。修復に失敗した場合は実際の理由（たとえば `uv sync` のエラー）と SQLite のバージョンの組が記録され、先送りされた修復や対象外だった修復は、理由とともに飛ばした処理の側に入ります。再起動の段階を終えると、更新処理は動作中の各ゲートウェイのコードを更新後のチェックアウトと比べ、プロファイルごとの一覧を表示します。更新前のコードのまま動いているゲートウェイがあれば、具体的な再起動コマンドとともに目立つ形で報告し、更新自体も 0 以外で終了するので、バージョンの混ざった状態を自動処理が正常とみなすことはありません。`--plan` とバージョン照合はどちらも、可能であれば動作中の各ゲートウェイにローカルの制御ソケット（プロファイルのデータディレクトリにある `gateway.sock`、Windows では名前付きパイプ）経由で直接問い合わせるため、バージョンと管理役の情報はゲートウェイ本人から得られます。古いバージョンのゲートウェイは、従来どおり状態ファイルから見つけます。

多重化した既定のゲートウェイは、1 つのプロセスが複数のプロファイルを受け持つ形なので、一覧には 1 回だけ現れ、その `served_profiles` の記録にあるすべてのプロファイルを代表します。この同じ守備範囲によって「A previous `hermes update` pulled new code but did not restart running gateways」という案内も消えます。そのゲートウェイ（手動で `git pull` したあとであれば、更新が再起動したすべてのゲートウェイ）が現在のコードで動いていれば、`hermes gateway restart` だけで十分です。次の `hermes update` が新しいレシートを書き出すのを待つ必要はありません。

### 手動で起動したバックエンドの再起動のお知らせ {#manual-backend-restart-reminders}

更新のあとは、手動で起動したバックエンドそれぞれの持ち主に、`hermes serve` や `hermes dashboard` を立ち上げ直してもらってください。SSH 越しのバックエンドなら、デスクトップアプリをつなぎ直します。ゲートウェイを再起動しただけでは、これらのプロセスは新しくなりません。

動作が確認できているバックエンドについては、更新処理はその再起動を `deferred` と記録する前にお知らせを保存します。これにより、残りの確認が通れば更新を完了できます。プロセスの身元が分からない場合は、新たに先送りの扱いにはできません。

お知らせは、有効な Hermes のホーム配下にある `serve_restart_pending/` に、入れ替わっていく更新レシートとは別に置かれます。お知らせは 1 つずつ、PID と作成時刻でプロセスを特定します。起動時の警告は、そのプロセスが生きている間、あるいは生死が分からない間は保持され、まさにそのプロセスが居なくなったと確認できたときにだけ取り除かれます。あとから更新しても、ゲートウェイが健全でも、取り除かれることはありません。

保存に失敗した場合、Hermes は警告を出し、保存できなかった宿題をあとのレシートへ引き継いで再試行します。保存先の権限と空き容量を確かめ、案内のとおりバックエンドを再起動してください。お知らせとレシートの両方の保存に失敗した場合は、確実に残せる保証はありません。

### ゲートウェイの中から自動で更新する: `--no-gateway-restart` {#automated-updates-from-inside-the-gateway---no-gateway-restart}

ゲートウェイ*から*起動された更新（cron ジョブ、デスクトップ版の更新機能など、ゲートウェイの
子プロセスとして動く自動処理）は、自分が引き起こす一斉再起動を生き延びられません。ゲートウェイは
`SIGUSR1` を受けて処理を片付け、そのあと systemd の `KillMode=mixed` が cgroup に残ったものを
更新処理ごとすべて終了させるからです。`hermes update --no-gateway-restart` を使うと、取得、依存関係、
Node のワークスペース、Web 画面、保守作業までの一連の処理をすべて行い、再起動とバージョン照合だけを
飛ばします。再起動待ちの目印は残るので、次に CLI を起動したときに警告が出て、次の通常の `hermes update`
（または `hermes gateway restart`）で全体が追いつきます。再起動は別の手順として組み合わせてください。
たとえば、更新ジョブの 10〜15 分後に動くタイマーです。レシートには先送りしたことが記録され、
先送りだけが原因で古いままのゲートウェイが残っていても、更新が `partial` 扱いになることはありません。

### ゲートウェイの再起動が途中で終わったとき {#interrupted-gateway-restarts}

前回の更新がコードの取得までは終えたのに再起動をやり切れていない場合、次の `hermes update` は、チェックアウトがすでに最新でも再起動をやり直します。プロセスが見つからないことは、復旧できた証拠にはなりません。失敗した systemd のユニットや、登録済みの launchd のジョブには、動いている PID が無いこともあるからです。管理役を見つけられない、再起動に失敗した、あるいは対象のサービスが動いていると確認できないときは、印は再起動待ちのまま残り、更新は 0 以外で終了します。表示されたコマンドで対象のサービスを復旧させてから、やり直してください。

過去のレシートが失敗のまま残っていても、それだけでゲートウェイが古いままだとは言えません。起動時とゲートウェイ状態の警告、そして更新の追いつき処理は、そのレシートに記録されたゲートウェイのプロファイルすべてについて、現在のチェックアウトで動く後継がいるかを確かめます。手動でゲートウェイを起動し直せば、過去の結果を書き換えることなく、レシートだけを根拠にした案内を解消できます。手動で起動したバックエンドの宿題は、先に専用のお知らせへ引き継がれている必要があります。

再起動待ちの印は、更新前の実行時の一覧と目標のコミットを自分で記録しています。復旧の判定はその一覧を見るのであって、古いレシートの一覧を見ることはありません。解消と認めるには、確認できた現在の構成が空でないこと、記録されたゲートウェイのプロファイルすべてに目標のコミットで動く後継がいること、そして見つかった手動バックエンドの宿題が滞りなく処理されていることが必要です。手動で起動したバックエンドがまだ生きている、あるいは生死が分からない場合は、お知らせの保存が要ります。終了したと確認できたプロセスにはお知らせは要りません。ゲートウェイが見当たらない、対応していない実行環境である、お知らせの書き出しに失敗したといった場合は、印は再起動待ちのまま残ります。

一覧を持たない古い印や、壊れている・対応していない一覧は、起動時や追いつき処理の照合では自動的に解消できません。見えているゲートウェイをすべて再起動しても、その更新が何を残したのかを確かめたことにはならないからです。警告は、あとの更新が自分の一覧を持つ新しい印とともに完了し、きちんと解消されるまで残ります。

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

この二つの保護と、デスクトップ版の更新前チェック、依存関係の修復処理は、いずれもまず `venv` を、次に uv の既定である `.venv` を環境として探します。そのため `uv venv` / `uv sync` で用意したソースのチェックアウトでも、インストーラーが作った `venv` と同じように更新できます。両方のディレクトリがある場合は、更新されるのは `venv` のほうです。

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
