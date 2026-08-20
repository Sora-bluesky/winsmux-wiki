---
title: "セキュリティ"
description: "セキュリティモデル、危険なコマンドの承認、ユーザー認可、コンテナの隔離、本番運用のベストプラクティス"
upstream_path: user-guide/security.md
upstream_blob: e63199af0b5fc34d99dc4e83a3def242cf23453f
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/security
---

# セキュリティ {#security}

Hermes Agent は、多層防御のセキュリティモデルを前提に設計されています。このページでは、コマンドの承認からコンテナの隔離、メッセージングプラットフォームでのユーザー認可まで、すべてのセキュリティ境界を説明します。

## 概要 {#overview}

セキュリティモデルは 8 つの層でできています。

1. **ユーザー認可** — 誰がエージェントと話せるか（許可リスト、DM のペアリング）
2. **危険なコマンドの承認** — 破壊的な操作には人の判断を挟みます
3. **ファイル書き込みの安全策** — `write_file` / `patch` 向けの拒否リストと、任意で使える書き込みサンドボックス
4. **コンテナの隔離** — Docker / Singularity / Modal によるサンドボックス化と、堅牢な設定
5. **MCP の資格情報フィルタリング** — MCP のサブプロセスに対する環境変数の隔離
6. **コンテキストファイルの走査** — プロジェクトのファイルに仕込まれたプロンプトインジェクションの検出
7. **セッション間の隔離** — セッションどうしは互いのデータや状態にアクセスできません。cron ジョブの保存先パスは、パストラバーサル攻撃に耐えられるよう固めてあります
8. **入力のサニタイズ** — ターミナルツールのバックエンドに渡す作業ディレクトリのパラメータは許可リストで検証し、シェルインジェクションを防ぎます

## 危険なコマンドの承認 {#dangerous-command-approval}

Hermes はコマンドを実行する前に、危険なパターンを集めたリストと照合します。一致した場合は、ユーザーがはっきり承認しないかぎり実行しません。

### 承認モード {#approval-modes}

承認のしくみには 3 つのモードがあり、`~/.hermes/config.yaml` の `approvals.mode` で設定します。

```yaml
approvals:
  mode: smart                     # smart | manual | off
  timeout: 300                    # seconds to wait for user response (default: 300)
  cron_mode: deny                 # deny | approve — what cron jobs do when they hit a dangerous command
  single_query_mode: deny         # deny | approve — what single-query (-q) sessions do on a dangerous command
  mcp_reload_confirm: true        # /reload-mcp asks before invalidating the MCP tool cache
  destructive_slash_confirm: true # /clear, /new, /reset, /undo prompt before discarding state
```

キーの全体は次のとおりです。

| キー | 既定値 | 何を決めるか |
|---|---|---|
| `mode` | `smart` | 危険なシェルコマンドに対する承認の方針です。下の表をご覧ください。 |
| `timeout` | `300` | 承認の返事を待つ秒数です。これを過ぎるとタイムアウトします。 |
| `cron_mode` | `deny` | [cron ジョブ](/hermes/docs/user-guide/features/cron/) が誰も見ていない状態で危険なコマンドの確認に当たったときの動きです。`deny` はコマンドを止めます（エージェントは別の方法を探すことになります）。`approve` は cron の文脈ですべて自動的に承認します。 |
| `single_query_mode` | `deny` | 一度きりの [`hermes chat -q`](/hermes/docs/user-guide/cli/) セッションが危険なコマンドの確認に当たったときの動きです。`-q` のセッションは 1 ターンだけ実行して終了するため、確認に答えるユーザーがいません。`deny` はコマンドを止め（エージェントは別の方法を探すことになります）、`approve` は単発クエリの文脈ですべて自動的に承認します。`cron_mode` と同じ考え方です。 |
| `mcp_reload_confirm` | `true` | true のとき、`/reload-mcp` は MCP のツール一式を作り直す前に確認します。作り直すとプロバイダのプロンプトキャッシュが無効になり（ツールのスキーマはシステムプロンプトに入っています）、次のメッセージで入力トークンを丸ごと送り直すことになります。**Always Approve** を選ぶと、このキーは `false` になります。 |
| `destructive_slash_confirm` | `true` | true のとき、会話の状態を捨てるスラッシュコマンド（`/clear`、`/new`、`/reset`、`/undo`）は実行前に確認します。3 択のダイアログ（Approve Once / Always Approve / Cancel）で、Telegram・Discord・Slack ではプラットフォーム標準の yes/no ボタン、それ以外ではテキストで表示されます。**Always Approve** を選ぶと、このキーは `false` になります。TUI も `/clear`、`/new`、`/reset` のモーダルでこの設定に従います。`HERMES_TUI_NO_CONFIRM=1` を指定すると、設定値にかかわらずそのモーダルを飛ばします。 |

| モード | 動き |
|------|----------|
| **smart**（既定） | 補助の LLM がリスクを判定します。リスクの低いコマンド（例: `python -c "print('hello')"`）は、そのコマンドに限って自動で承認されます。本当に危険なコマンドは自動で拒否されます。判断がつかない場合は、手動の確認に回されます。 |
| **manual** | 危険なコマンドでは必ずユーザーに確認します。 |
| **off** | 承認のチェックをすべて無効にします。`--yolo` を付けて実行するのと同じです。すべてのコマンドが確認なしで実行されます。 |

:::warning
`approvals.mode: off` にすると、安全のための確認がすべて無効になります。信頼できる環境（CI/CD、コンテナなど）だけで使ってください。
:::

### YOLO モード {#yolo-mode}

YOLO モードは、そのセッションの危険なコマンドの確認を **すべて** 飛ばします。有効にする方法は 3 つあります。

1. **CLI のフラグ**: `hermes --yolo` または `hermes chat --yolo` でセッションを開始する
2. **スラッシュコマンド**: セッション中に `/yolo` と入力して切り替える
3. **環境変数**: `HERMES_YOLO_MODE=1` を設定する

`/yolo` コマンドは **切り替え式** で、使うたびにオン・オフが入れ替わります。

```
> /yolo
  ⚡ YOLO mode ON — all commands auto-approved. Use with caution.

> /yolo
  ⚠ YOLO mode OFF — dangerous commands will require approval.
```

YOLO モードは CLI でもゲートウェイのセッションでも使えます。内部では `HERMES_YOLO_MODE` 環境変数を設定していて、コマンドを実行するたびにこの値が確認されます。

YOLO が有効なあいだ、承認の確認が飛ばされていることを忘れないよう、Hermes は 2 つの表示を出し続けます。

- YOLO がすでに有効な場合、セッション開始時に赤いバナー行が出ます: `⚠ YOLO mode — all approval prompts bypassed`。YOLO がオフのときは表示されないので、既定のバナーがすっきりしたままです。
- ステータスバーには、どの表示幅でも `⚠ YOLO` の断片が出ます。YOLO を切り替えるとその場で更新されます（リッチテキストの描画でも、プレーンテキストの代替表示でも同じです）。

:::danger
YOLO モードは、そのセッションの危険なコマンドの安全確認を **すべて** 無効にします。**ただし** ハードラインのブロックリスト（後述）だけは例外です。生成されるコマンドを完全に信頼できるとき（使い捨ての環境で、十分にテスト済みの自動化スクリプトを動かすときなど）だけ使ってください。
:::

会話の状態を捨てるスラッシュコマンド（`/clear`、`/new` / `/reset`、`/undo`、`/quit --delete` — `/exit --delete` は別名です）については、CLI も実行前に確認します。[スラッシュコマンド — 破壊的なコマンドの確認](/hermes/docs/reference/slash-commands/#confirmation-prompts-for-destructive-commands) をご覧ください。

### ハードラインのブロックリスト（常時働く最低ライン） {#hardline-blocklist-always-on-floor}

取り返しのつかないファイルシステムの消去、フォークボム、ブロックデバイスへの直接書き込みなど、被害があまりに大きいコマンドについては、Hermes は次のいずれであっても実行を拒否します。

- `--yolo` / `/yolo` がオンになっている
- `approvals.mode: off` になっている
- cron ジョブが誰も見ていない状態の `approve` モードで動いている
- ユーザーが「常に許可」をはっきり選んでいる

このブロックリストは `--yolo` よりさらに下にある最低ラインです。承認の層がコマンドを見るより **前** に働き、これを外すフラグはありません。現在カバーしているパターンは次のとおりです（すべてではありません。`tools/approval.py::UNRECOVERABLE_BLOCKLIST` と同期しています）。

| パターン | ハードラインである理由 |
|---|---|
| `rm -rf /` とその明らかな変種 | ファイルシステムのルートを消してしまいます |
| `rm -rf --no-preserve-root /` | 「ルートで間違いない」と明示した変種です |
| `:(){ :\|:& };:`（bash のフォークボム） | 再起動するまでホストを占有します |
| マウント済みのルートデバイスに対する `mkfs.*` | 動いているシステムをフォーマットします |
| `dd if=/dev/zero of=/dev/sd*` | 物理ディスクをゼロで埋めます |
| 信頼できない URL をルートファイルシステムの直下で `sh` に流し込む | 遠隔からコードを実行される攻撃経路で、承認するには範囲が広すぎます |

ブロックリストに当たると、ツールの呼び出しはエージェントに理由を説明するエラーを返し、何も実行されません。正当な作業でこうしたコマンドが必要な場合（消去して入れ直すパイプラインの運用者である、など）は、エージェントの外で実行してください。

### ユーザーが決める拒否ルール（`approvals.deny`） {#user-defined-deny-rules-approvalsdeny}

ハードラインのブロックリストは固定で、コードに同梱されています。`approvals.deny` はそのユーザー編集版で、一致するターミナルコマンドを無条件でブロックする glob パターンのリストです。`--yolo`、`/yolo`、`approvals.mode: off` を見るより **前** に働きます。「これとこれだけは絶対に禁止、あとはエージェントの好きにさせる」という運用に使えます。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
    - "dd if=* of=/dev/*"
```

詳しく見ていきます。

- パターンは [fnmatch](https://docs.python.org/3/library/fnmatch.html) の glob（`*`、`?`、`[...]`）で、コマンド全体に対して **大文字・小文字を区別せず** 照合されます。`git push --force*` は `git push --force origin main` に一致しますが、`git push origin main` には一致しません。
- 照合は、危険パターンの検出器が使うのと同じ正規化・難読化解除済みのコマンド候補に対して行われます。そのため、引用符を使った単純なごまかし（`git pu""sh --force`）ではルールをすり抜けられません。
- **YAML の引用符について:** パターンは必ず引用符で囲んでください。先頭の `*` を裸で書くと YAML のエイリアスと解釈されて読み込みに失敗します。`{`、`!`、`: ` にも YAML 上の意味があります。シェルらしい内容を書くならシングルクォートがいちばん安全です。
- 拒否ルールが働くのは、ホストに届くバックエンド（ローカル、SSH、ホストをマウントした Docker）です。隔離されたコンテナのバックエンドは、従来どおりこのガードの層をまるごと飛ばします。コンテナの中で何を実行してもホストには届かないためです。
- 拒否されたコマンドは、再実行や言い換えをしないよう伝える BLOCKED エラーをエージェントに返します。何も実行されません。

承認まわりの他の設定と同じく、変更はすぐ反映されます（設定のキャッシュは更新時刻で管理しています）。セッションを開き直す必要はありません。

:::note 想定する脅威
拒否ルールは、悪意はないが間違えるエージェントに対する安全策で、危険パターンの検出器と同じ脅威を想定しています。意図的に敵対してくるプロセスに対するサンドボックスではありません。そちらが必要なら、隔離されたバックエンド（Docker、Modal）か、外部への通信を制限した環境を使ってください。
:::

### 承認のタイムアウト {#approval-timeout}

危険なコマンドの確認が出たとき、ユーザーが答えるまでの時間には上限があり、設定で変えられます。時間内に返事がなければ、そのコマンドは既定で **拒否** されます（安全側に倒れます）。

タイムアウトは `~/.hermes/config.yaml` で設定します。

```yaml
approvals:
  timeout: 300  # seconds (default: 300)
```

### 何が承認の対象になるか {#what-triggers-approval}

次のパターンに当たると、承認の確認が出ます（`tools/approval.py` で定義されています）。

| パターン | 説明 |
|---------|-------------|
| `rm -r` / `rm --recursive` | 再帰的な削除 |
| `rm ... /` | ルートのパスでの削除 |
| `chmod 777/666` / `o+w` / `a+w` | 誰でも書き込める権限 |
| 危険な権限を伴う `chmod --recursive` | 誰でも書き込める権限を再帰的に付与（長い形式のフラグ） |
| `chown -R root` / `chown --recursive root` | root への再帰的な所有者変更 |
| `mkfs` | ファイルシステムのフォーマット |
| `dd if=` | ディスクのコピー |
| `> /dev/sd` | ブロックデバイスへの書き込み |
| `DROP TABLE/DATABASE` | SQL の DROP |
| WHERE のない `DELETE FROM` | WHERE を書かない SQL の DELETE |
| `TRUNCATE TABLE` | SQL の TRUNCATE |
| `> /etc/` | システム設定の上書き |
| `systemctl stop/restart/disable/mask` | システムのサービスの停止・再起動・無効化 |
| `kill -9 -1` | すべてのプロセスの強制終了 |
| `pkill -9` | プロセスの強制終了 |
| フォークボムのパターン | フォークボム |
| `bash -c` / `sh -c` / `zsh -c` / `ksh -c` | `-c` フラグによるシェルコマンドの実行（`-lc` のようにまとめたフラグも含みます） |
| `python -e` / `perl -e` / `ruby -e` / `node -c` | `-e` / `-c` フラグによるスクリプトの実行 |
| `curl ... \| sh` / `wget ... \| sh` | 遠隔から取得した内容をシェルに流し込む |
| `bash <(curl ...)` / `sh <(wget ...)` | プロセス置換で遠隔のスクリプトを実行する |
| `/etc/`、`~/.ssh/`、`~/.hermes/.env` への `tee` | tee による重要なファイルの上書き |
| `/etc/`、`~/.ssh/`、`~/.hermes/.env` への `>` / `>>` | リダイレクトによる重要なファイルの上書き |
| `xargs rm` | xargs と rm の組み合わせ |
| `find -exec rm` / `find -delete` | find と破壊的な操作の組み合わせ |
| `/etc/` への `cp` / `mv` / `install` | システム設定へのファイルのコピー・移動 |
| `/etc/` に対する `sed -i` / `sed --in-place` | システム設定のその場での書き換え |
| hermes / gateway に対する `pkill` / `killall` | 自分自身を終了させないための対策 |
| `&` / `disown` / `nohup` / `setsid` を伴う `gateway run` | サービスマネージャの外でゲートウェイが起動するのを防ぎます |
| `docker stop/kill/restart`、`docker compose down/stop/kill/restart` | コンテナのライフサイクル操作（グローバルなフラグや `docker-compose` も検出します） |
| `docker -H` / `--host` / `--context`、`DOCKER_HOST=` / `DOCKER_CONTEXT=` | Docker デーモンの向き先の変更。別の（多くは遠隔の）デーモンを操作することになります |
| `docker context use` | 以後のすべての docker コマンドについて、既定のデーモンを切り替えます |
| `podman --remote` / `-r` / `--url` / `--connection` / `--identity`、`CONTAINER_HOST=` | Podman の遠隔デーモンへの向き先の変更 |

:::info
**コンテナでは飛ばされます**: `docker`、`singularity`、`modal`、`daytona`、`vercel_sandbox` のバックエンドで動いているときは、危険なコマンドのチェックは **飛ばされます**。コンテナ自体がセキュリティの境界になっているためです。コンテナの中で破壊的なコマンドを実行しても、ホストは傷つきません。
:::

### 承認の流れ（CLI） {#approval-flow-cli}

対話型の CLI では、危険なコマンドはその場で承認の確認を表示します。

```
  ⚠️  DANGEROUS COMMAND: recursive delete
      rm -rf /tmp/old-project

      [o]nce  |  [s]ession  |  [a]lways  |  [d]eny

      Choice [o/s/a/D]:
```

4 つの選択肢があります。

- **once** — この 1 回だけ実行を許可します
- **session** — このセッションのあいだ、このパターンを許可します
- **always** — 恒久的な許可リストに追加します（`config.yaml` に保存されます）
- **deny**（既定） — コマンドをブロックします

### 承認の流れ（ゲートウェイ / メッセージング） {#approval-flow-gatewaymessaging}

メッセージングプラットフォームでは、エージェントが危険なコマンドの内容をチャットに送り、ユーザーの返事を待ちます。

- 承認するには **yes**、**y**、**approve**、**ok**、**go** のいずれかを返します
- 拒否するには **no**、**n**、**deny**、**cancel** のいずれかを返します

`HERMES_EXEC_ASK=1` 環境変数は、ゲートウェイを動かすときに自動で設定されます。

### 恒久的な許可リスト {#permanent-allowlist}

「always」で承認したコマンドは `~/.hermes/config.yaml` に保存されます。

```yaml
# Permanently allowed dangerous command patterns
command_allowlist:
  - rm
  - systemctl
```

これらのパターンは起動時に読み込まれ、以後のセッションでは何も表示せずに承認されます。

:::tip
恒久的な許可リストの中身を確認したり削除したりするには、`hermes config edit` を使ってください。
:::

### 承認の履歴から候補を掘り出す（`hermes approvals suggest`） {#mining-approval-history-hermes-approvals-suggest}

セッションのたびに同じ確認に答えるかわりに、これまでの承認の判断から許可リストの候補を
掘り出せます。

```bash
hermes approvals suggest            # dry run — prints a numbered proposal
hermes approvals suggest --apply 1,3  # merge picks into command_allowlist
hermes approvals suggest --json     # machine-readable output
```

このコマンドはセッションのデータベース（`~/.hermes/state.db`）を調べ、危険と判定されたうえで
実際に実行されたコマンド、つまりあなたが承認したコマンドを集めます。それらをパターン
（`git push *`、複合コマンドの場合は危険クラスのキー）にまとめ、承認された回数の多い順に
並べます。

```
Proposed command_allowlist additions (from approval history, last 90 days):

  1. git push *    — approved 14x
  2. docker restart/stop/kill (container lifecycle)    — approved 9x (class key)
```

安全のための決まりごとです。

- **自動で適用されることは決してありません**。既定の実行は読み取りだけで、
  `--apply N[,M...]` をはっきり指定したときだけ `config.yaml` に書き込みます。
- **破壊的なクラスは、どれだけ承認されていても候補になりません**。再帰的な削除、
  `sudo`、ディスクやデバイスへの書き込み、資格情報やシステム設定の書き換え、
  シェルへの流し込み、SQL の DROP / TRUNCATE、プロセスの強制終了、そして
  ハードラインのクラスはすべて最初から除外されます。`rm -rf build/` を 100 回
  承認していても、`rm` の項目が出てくることはありません。
- すでに `command_allowlist` に入っているものと重なる候補は飛ばされます。

便利なフラグ: `--days N`（履歴をさかのぼる日数、既定は 90）、`--min-count N`
（候補になるのに必要な承認回数、既定は 2）、`--limit N`、`--db PATH`。

## ファイル書き込みの安全策 {#file-write-safety}

`write_file` や `patch` がディスクに触れる前に、Hermes は対象のパスを拒否リストと、任意で設定できるサンドボックスに照らして確認します。ブロックされた書き込みは、その場でエージェントにエラーを返します。**承認の確認は出ませんし**、チャットの画面から解除する手段もありません。それでもモデルは編集が成功したと言うことがあります。`display.file_mutation_verifier` が有効なら（既定で有効です）、アシスタントの締めくくりの説明よりも [ファイル変更の検証フッター](/hermes/docs/user-guide/configuration/#file-mutation-verifier) を信じてください。

### 保護されたパス（常にブロック） {#protected-paths-always-blocked}

次の種類は、`HERMES_WRITE_SAFE_ROOT` が設定されていなくても常に拒否されます。

| 種類 | 例 |
|----------|----------|
| OS の資格情報の保管場所 | `~/.ssh/`（鍵、`authorized_keys`）、`~/.aws/`、`~/.kube/`、`/etc/sudoers`、`~/.netrc` |
| Hermes の資格情報の保管場所 | HERMES_HOME 配下（使用中のプロファイルと全体のルート）の `auth.json`、`.env`、`.anthropic_oauth.json`、`mcp-tokens/`、`pairing/` |
| プロジェクトの秘密情報のファイル | ディスク上のどこにあっても `.env`、`.env.local`、`.env.production`、`.envrc` |

安全なルートの中にある重要なパスも、やはりブロックされます。`HERMES_WRITE_SAFE_ROOT` を `$HOME` に向けても、`~/.ssh/id_rsa` に書き込めるようにはなりません。

安全なルートの外に出た場合は `Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (…)` が返ります。資格情報のパスがブロックされた場合は `Write denied: '…' is a protected system/credential file.` になります。

**例外 — `~/.ssh/config` はハードブロックではなく承認の対象です。** SSH の
*クライアント設定* には秘密鍵そのものは入っておらず、ここを編集する作業（ホストの別名、
`ProxyJump`、VS Code Remote-SSH の接続先）はよくあることです。そのため `write_file` /
`patch` はこのファイルについて、これまでのような一律の拒否ではなく、ターミナルツールが
`~/.ssh` への書き込みで使っているのと同じ once / session / always の確認に回します。
とはいえ `ProxyCommand` や `Match exec` のようにコマンドを実行する記述を書けてしまうので、
書き込みが黙って行われることはありません。対話できない呼び出し元（ACP のファイルブリッジ、
人に尋ねる経路のないバックグラウンドジョブ）では安全側に倒して失敗します。秘密鍵、
`authorized_keys`、そのほか `~/.ssh/` 配下のものはすべてハードブロックのままです。

### HERMES_WRITE_SAFE_ROOT（任意のサンドボックス） {#hermeswritesaferoot-optional-sandbox}

これを設定すると、`write_file` と `patch` は指定したディレクトリの配下にしか書き込めなくなります。外にあるものは **ハードブロック** で、危険なコマンドの承認には回されません。

- [公式の Docker イメージ](https://github.com/NousResearch/hermes-agent) では自動的に設定されています（`HERMES_WRITE_SAFE_ROOT=/opt/data`）
- Unix では `:`、Windows では `;` で区切って複数のルートを指定できます
- **軽い気持ちで `~/.hermes/.env` に追加しないでください。** プロジェクトのディレクトリを指定すると、エージェントは `~/.hermes/cron/jobs.json` やプロファイルのスキル、そのほかその配下にない Hermes の状態ファイルに書き込めなくなります

作業用のディレクトリと Hermes のホームの両方を許可するには、次のようにします。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

この変数を外せば、書き込みの制限がなくなります（保護されたパスの拒否リストは残ります）。詳しい一覧: [HERMES_WRITE_SAFE_ROOT](/hermes/docs/reference/environment-variables/#hermes_write_safe_root)。

### cron やそのほかの Hermes の状態ファイル {#cron-and-other-hermes-state}

`~/.hermes/cron/jobs.json` を `patch` で直接書き換えるようエージェントに頼まないでください。`cronjob` ツール、[`hermes cron`](/hermes/docs/user-guide/features/cron/)、`/cron` を使ってください。これらはサポートされた API を通じてジョブの保存先を更新します。書き込みの安全策が直接の編集をブロックする場合、そのほかの Hermes の制御ファイルについても同じことが言えます。

:::note 多層防御であって、硬い境界ではありません
書き込みのガードが効くのは `write_file` と `patch` だけです。`terminal` ツールは同じ OS ユーザーとして動くので、シェルのコマンドを使えば拒否されたパスでも `cat` したり上書きしたりできます。拒否リストは、うっかりによる被害を減らし、モデルにはっきりした停止の合図を与えるためのものです。敵対的な、あるいは乗っ取られたエージェントを閉じ込めるものではありません。
:::

## ユーザー認可（ゲートウェイ） {#user-authorization-gateway}

メッセージングのゲートウェイを動かすとき、Hermes は層になった認可のしくみで、誰がボットとやり取りできるかを制御します。

### 認可のチェックの順番 {#authorization-check-order}

`_is_user_authorized()` メソッドは次の順に確認します。

1. **プラットフォームごとの全員許可フラグ**（例: `DISCORD_ALLOW_ALL_USERS=true`）
2. **DM のペアリングで承認された一覧**（ペアリングコードで承認されたユーザー）
3. **プラットフォームごとの許可リスト**（例: `TELEGRAM_ALLOWED_USERS=12345,67890`）
4. **全体の許可リスト**（`GATEWAY_ALLOWED_USERS=12345,67890`）
5. **全体の全員許可**（`GATEWAY_ALLOW_ALL_USERS=true`）
6. **既定: 拒否**

### プラットフォームごとの許可リスト {#platform-allowlists}

許可するユーザー ID を、カンマ区切りで `~/.hermes/.env` に設定します。

```bash
# Platform-specific allowlists
TELEGRAM_ALLOWED_USERS=123456789,987654321
DISCORD_ALLOWED_USERS=111222333444555666
WHATSAPP_ALLOWED_USERS=15551234567
SLACK_ALLOWED_USERS=U01ABC123

# Cross-platform allowlist (checked for all platforms)
GATEWAY_ALLOWED_USERS=123456789

# Per-platform allow-all (use with caution)
DISCORD_ALLOW_ALL_USERS=true

# Global allow-all (use with extreme caution)
GATEWAY_ALLOW_ALL_USERS=true
```

:::warning
**許可リストが 1 つも設定されておらず**、`GATEWAY_ALLOW_ALL_USERS` も設定されていない場合、**すべてのユーザーが拒否されます**。ゲートウェイは起動時に警告を出します。

```
No user allowlists configured. All unauthorized users will be denied.
Set GATEWAY_ALLOW_ALL_USERS=true in ~/.hermes/.env to allow open access,
or configure platform allowlists (e.g., TELEGRAM_ALLOWED_USERS=your_id).
```
:::

### DM のペアリングのしくみ {#dm-pairing-system}

もっと柔軟に認可したい場合のために、Hermes にはコードを使ったペアリングのしくみがあります。ユーザー ID をあらかじめ登録しておくかわりに、知らないユーザーには使い捨てのペアリングコードが渡され、ボットの持ち主が CLI で承認します。

**流れは次のとおりです。**

1. 知らないユーザーがボットに DM を送ります
2. ボットは 8 文字のペアリングコードを返します
3. ボットの持ち主が CLI で `hermes pairing approve <platform> <code>` を実行します
4. そのユーザーは、そのプラットフォームで恒久的に承認されます

認可されていない DM をどう扱うかは、`~/.hermes/config.yaml` で決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- チャット形式で DM を扱うプラットフォームでは `pair` が既定です。認可されていない DM にはペアリングコードが返ります。
- `ignore` は認可されていない DM を何も言わずに捨てます。
- メールは `platforms.email.unauthorized_dm_behavior: pair` を設定しないかぎり `ignore` が既定です。受信箱には無関係の未読メールが入っていることがあるためです。
- プラットフォームごとの設定は全体の既定を上書きするので、Telegram ではペアリングを使いつつ、WhatsApp では黙って捨てる、といった使い分けができます。

**安全のための工夫**（OWASP と NIST SP 800-63-4 の指針にもとづきます）

| 工夫 | 内容 |
|---------|---------|
| コードの形式 | 紛らわしい文字（0/O/1/I）を除いた 32 文字の中から 8 文字 |
| ランダム性 | 暗号論的な生成（`secrets.choice()`） |
| コードの有効期限 | 1 時間 |
| レート制限 | ユーザーごとに 10 分に 1 回まで |
| 保留の上限 | プラットフォームごとに保留中のコードは最大 3 件 |
| ロックアウト | 承認の失敗が 5 回続くと 1 時間ロックされます |
| ファイルの保護 | ペアリングのデータファイルはすべて `chmod 0600` |
| ログ | コードが標準出力に記録されることはありません |

**ペアリングの CLI コマンド:**

```bash
# List pending and approved users
hermes pairing list

# Approve a pairing code
hermes pairing approve telegram ABC12DEF

# Revoke a user's access
hermes pairing revoke telegram 123456789

# Clear all pending codes
hermes pairing clear-pending
```

:::tip Docker を使う場合は、ペアリングのコマンドを `hermes` ユーザーで実行してください
公式の Docker イメージは、`gosu` を使って権限のない `hermes` ユーザー（uid 10000）で
ゲートウェイを動かしますが、`docker exec` は既定で root になります。root が作った承認の
ファイルは `0600 root:root` で書かれ、ゲートウェイからは読めません。その結果、承認は
何も言わずに無視されます（[#10270][i10270]）。

必ず `-u hermes` を付けてください。

```bash
docker exec -u hermes hermes-agent hermes pairing approve telegram ABC12DEF
```

すでに root で実行してしまい、そのユーザーがまだ認可されていない場合は、コンテナを
再起動してください。次回の起動時にエントリポイントが所有者を直します。

[i10270]: https://github.com/NousResearch/hermes-agent/issues/10270
:::

**保存場所:** ペアリングのデータは `~/.hermes/pairing/` に、プラットフォームごとの JSON ファイルとして保存されます。
- `{platform}-pending.json` — 保留中のペアリング申請
- `{platform}-approved.json` — 承認されたユーザー
- `_rate_limits.json` — レート制限とロックアウトの記録

## コンテナの隔離 {#container-isolation}

`docker` のターミナルバックエンドを使うとき、Hermes はすべてのコンテナに厳しいセキュリティ設定を適用します。

### Docker のセキュリティフラグ {#docker-security-flags}

どのコンテナも次のフラグ付きで動きます（`tools/environments/docker.py` で定義されています）。

```python
_BASE_SECURITY_ARGS = [
    "--cap-drop", "ALL",                          # Drop ALL Linux capabilities
    "--cap-add", "DAC_OVERRIDE",                  # Root can write to bind-mounted dirs
    "--cap-add", "CHOWN",                         # Package managers need file ownership
    "--cap-add", "FOWNER",                        # Package managers need file ownership
    "--security-opt", "no-new-privileges",         # Block privilege escalation
    "--pids-limit", "256",                         # Limit process count
    "--tmpfs", "/tmp:rw,nosuid,size=512m",         # Size-limited /tmp
    "--tmpfs", "/var/tmp:rw,noexec,nosuid,size=256m",  # No-exec /var/tmp
]
```

`SETUID` と `SETGID` は基本の一覧に **含まれていません**。コンテナが root で起動し、init やエントリポイントが権限を落とす必要があるとき（s6 の権限降格の経路）にだけ、条件付きで追加されます。コンテナが最初から非 root の `--user` で動いている場合は追加されません。`/run` の tmpfs も基本の一覧から切り離され、イメージごとにマウントされます（既定では `noexec` で固め、`/run` から実行する s6-overlay のイメージだけ `exec` にします）。

### リソースの上限 {#resource-limits}

コンテナのリソースは `~/.hermes/config.yaml` で設定できます。

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_forward_env: []  # Explicit allowlist only; empty keeps secrets out of the container
  container_cpu: 1        # CPU cores
  container_memory: 5120  # MB (default 5GB)
  container_disk: 51200   # MB (default 50GB, requires overlay2 on XFS)
  container_persistent: true  # Persist filesystem across sessions
```

### ファイルシステムの永続化 {#filesystem-persistence}

- **永続モード**（`container_persistent: true`）: `~/.hermes/sandboxes/docker/<task_id>/` から `/workspace` と `/root` をバインドマウントします
- **使い捨てモード**（`container_persistent: false`）: 作業領域に tmpfs を使うため、後片付けの時点ですべて失われます

:::tip
本番でゲートウェイを動かす場合は、`docker`、`modal`、`daytona`、`vercel_sandbox` のいずれかのバックエンドを使い、エージェントのコマンドをホストから切り離してください。これで、危険なコマンドの承認そのものが不要になります。
:::

:::warning
`terminal.docker_forward_env` に名前を追加すると、その変数は意図的にコンテナへ渡され、ターミナルのコマンドから使えるようになります。`GITHUB_TOKEN` のような作業ごとの資格情報には便利ですが、同時に、コンテナの中で動くコードがそれを読み取って外に持ち出せるということでもあります。
:::

## ターミナルバックエンドのセキュリティ比較 {#terminal-backend-security-comparison}

| バックエンド | 隔離 | 危険コマンドのチェック | 向いている用途 |
|---------|-----------|-------------------|----------|
| **local** | なし — ホスト上で動きます | ✅ あり | 開発、信頼できるユーザー |
| **ssh** | 別のマシン | ✅ あり | 別のサーバーで動かす場合 |
| **docker** | コンテナ | ❌ 飛ばします（コンテナが境界） | 本番のゲートウェイ |
| **singularity** | コンテナ | ❌ 飛ばします | HPC の環境 |
| **modal** | クラウドのサンドボックス | ❌ 飛ばします | 規模を広げやすいクラウドでの隔離 |
| **daytona** | クラウドのサンドボックス | ❌ 飛ばします | 内容が残るクラウドの作業環境 |
| **vercel_sandbox** | クラウドのマイクロ VM | ❌ 飛ばします | スナップショットが残るクラウドでの実行 |

## 環境変数の受け渡し {#environment-variable-passthrough}

`execute_code` と `terminal` はどちらも、LLM が生成したコードによる資格情報の持ち出しを防ぐため、子プロセスから重要な環境変数を取り除きます。とはいえ、`required_environment_variables` を宣言しているスキルは、それらの変数を正当に必要としています。

### しくみ {#how-it-works}

特定の変数をサンドボックスのフィルタに通すしくみが 2 つあります。

**1. スキル単位の受け渡し（自動）**

スキルが読み込まれ（`skill_view` か `/skill` コマンド経由）、`required_environment_variables` を宣言している場合、その中で実際に環境に設定されている変数は自動的に受け渡しの対象になります。設定されていない変数（まだ準備が必要な状態のもの）は **登録されません**。

```yaml
# In a skill's SKILL.md frontmatter
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
```

このスキルを読み込むと、`TENOR_API_KEY` は `execute_code`、`terminal`（ローカル）、**さらに遠隔のバックエンド（Docker、Modal）** にも渡ります。手作業の設定は要りません。

:::info Docker と Modal
v0.5.1 より前は、Docker の `forward_env` はスキルの受け渡しとは別のしくみでした。現在は統合されていて、スキルが宣言した環境変数は、`docker_forward_env` に手で追加しなくても Docker のコンテナと Modal のサンドボックスへ自動的に渡されます。
:::

**2. 設定による受け渡し（手動）**

どのスキルも宣言していない環境変数は、`config.yaml` の `terminal.env_passthrough` に追加します。

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

### 資格情報ファイルの受け渡し（OAuth トークンなど） {#credential-file-passthrough}

スキルによっては、環境変数だけでなく **ファイル** をサンドボックスの中に必要とします。たとえば Google Workspace は、使用中のプロファイルの `HERMES_HOME` に OAuth トークンを `google_token.json` として保存します。スキルはこれをフロントマターで宣言します。

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token (created by setup script)
  - path: google_client_secret.json
    description: Google OAuth2 client credentials
```

読み込み時に Hermes は、これらのファイルが使用中のプロファイルの `HERMES_HOME` にあるかを確認し、マウントの対象として登録します。

- **Docker**: 読み取り専用のバインドマウント（`-v host:container:ro`）
- **Modal**: サンドボックスの作成時にマウントし、コマンドの実行前に毎回同期します（セッションの途中で OAuth の設定を済ませた場合にも対応します）
- **ローカル**: 何もしません（ファイルにはもともとアクセスできます）

資格情報ファイルは、`config.yaml` に手で並べることもできます。

```yaml
terminal:
  credential_files:
    - google_token.json
    - my_custom_oauth_token.json
```

パスは `~/.hermes/` からの相対で指定します。ファイルはコンテナの中の `/root/.hermes/` にマウントされます。この一覧を読むのは `tools/credential_files.py`（`terminal.credential_files`）です。`terminal:` のブロックの下にありますが、読み込むのはターミナルバックエンドの本体ではなく資格情報ファイルのモジュールなので、同梱の `DEFAULT_CONFIG` のスナップショットには含まれていません。

### サンドボックスごとに何を取り除くか {#what-each-sandbox-filters}

| サンドボックス | 既定のフィルタ | 受け渡しによる上書き |
|---------|---------------|---------------------|
| **execute_code** | 名前に `KEY`、`TOKEN`、`SECRET`、`PASSWORD`、`CREDENTIAL`、`PASSWD`、`AUTH` を含む変数をブロックし、安全な接頭辞の変数だけを通します | ✅ 受け渡しの対象はどちらのチェックも通り抜けます |
| **terminal**（ローカル） | Hermes の基盤にあたる変数（プロバイダのキー、ゲートウェイのトークン、ツールの API キー）を明示的にブロックします | ✅ 受け渡しの対象は拒否リストを通り抜けます |
| **terminal**（Docker） | 既定ではホストの環境変数を渡しません | ✅ 受け渡しの対象と `docker_forward_env` が `-e` で渡されます |
| **terminal**（Modal） | 既定ではホストの環境変数もファイルも渡しません | ✅ 資格情報ファイルはマウントされ、環境変数は同期で渡されます |
| **MCP** | 安全なシステム変数と、明示的に設定した `env` を除いてすべてブロックします | ❌ 受け渡しの影響を受けません（かわりに MCP の `env` 設定を使ってください） |

### セキュリティ上の注意 {#security-considerations}

- 受け渡しが効くのは、あなたやスキルがはっきり宣言した変数だけです。LLM が勝手に生成したコードに対する既定の守りは変わりません
- 資格情報ファイルは Docker のコンテナに **読み取り専用** でマウントされます
- Skills Guard は、インストールの前にスキルの内容を調べ、環境変数への怪しいアクセスがないか確認します
- 設定されていない変数は登録されません（存在しないものは漏れようがありません）
- Hermes の基盤にあたる秘密情報（プロバイダの API キー、ゲートウェイのトークン）は `env_passthrough` に入れないでください。専用のしくみが用意されています

## MCP の資格情報の扱い {#mcp-credential-handling}

MCP（Model Context Protocol）のサーバーのサブプロセスには、うっかり資格情報が漏れないよう **絞り込んだ環境** が渡されます。

### 安全な環境変数 {#safe-environment-variables}

ホストから MCP の stdio サブプロセスへ渡されるのは、次の変数だけです。

```
PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR
```

これに加えて `XDG_*` の変数も渡されます。そのほかの環境変数（API キー、トークン、秘密情報）はすべて **取り除かれます**。

MCP サーバーの `env` 設定にはっきり書いた変数は渡されます。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_..."  # Only this is passed
```

### 資格情報の伏せ字化 {#credential-redaction}

MCP のツールから返るエラーメッセージは、LLM に渡る前に整えられます。次のパターンは `[REDACTED]` に置き換えられます。

- GitHub の PAT（`ghp_...`）
- OpenAI 形式のキー（`sk-...`）
- Bearer トークン
- `token=`、`key=`、`API_KEY=`、`password=`、`secret=` のパラメータ

### アクセスできるサイトの方針 {#website-access-policy}

エージェントが web やブラウザのツールでどのサイトにアクセスできるかを制限できます。社内のサービスや管理画面など、重要な URL にエージェントが触れないようにしたいときに役立ちます。

```yaml
# In ~/.hermes/config.yaml
security:
  website_blocklist:
    enabled: true
    domains:
      - "*.internal.company.com"
      - "admin.example.com"
    shared_files:
      - "/etc/hermes/blocked-sites.txt"
```

ブロックされた URL が要求されると、ツールは方針によってそのドメインがブロックされていることを伝えるエラーを返します。このブロックリストは `web_search`、`web_extract`、`browser_navigate`、そのほか URL を扱えるすべてのツールに適用されます。

詳しくは、設定のガイドの [サイトのブロックリスト](/hermes/docs/user-guide/configuration/#website-blocklist) をご覧ください。

### SSRF への対策 {#ssrf-protection}

URL を扱えるすべてのツール（web 検索、web の抽出、画像認識、ブラウザ）は、取得の前に URL を検証し、SSRF（Server-Side Request Forgery）攻撃を防ぎます。ブロックされるアドレスは次のとおりです。

- **プライベートネットワーク**（RFC 1918）: `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`
- **ループバック**: `127.0.0.0/8`、`::1`
- **リンクローカル**: `169.254.0.0/16`（`169.254.169.254` のクラウドのメタデータを含みます）
- **CGNAT / 共有アドレス空間**（RFC 6598）: `100.64.0.0/10`（Tailscale や WireGuard の VPN）
- **クラウドのメタデータのホスト名**: `metadata.google.internal`、`metadata.goog`
- **予約済み、マルチキャスト、未指定のアドレス**

SSRF への対策は、インターネットに面した利用のために常に有効です。DNS の解決に失敗した場合もブロック扱いになります（安全側に倒れます）。リダイレクトの連鎖は各段階で再検証され、リダイレクトを使った回避を防ぎます。

#### あえてプライベートな URL を許可する {#intentionally-allowing-private-urls}

`home.arpa` を RFC 1918 のアドレスに解決する家庭内のネットワーク、LAN の中だけで動く Ollama や llama.cpp のエンドポイント、社内の情報共有サイト、クラウドのメタデータの調査など、プライベートな URL や内部の URL に正当にアクセスしたい構成もあります。そうした場合のために、全体で無効にできる設定があります。

```yaml
security:
  allow_private_urls: true   # default: false
```

有効にすると、web のツール、ブラウザ、画像認識の URL 取得、ゲートウェイのメディアのダウンロードは、RFC 1918 / ループバック / リンクローカル / CGNAT / クラウドのメタデータ宛てを拒否しなくなります。**これは意識して越える信頼の境界です。** プロンプトインジェクションされた URL をエージェントがローカルのネットワークに向けて実行してしまうことを、リスクとして受け入れられるマシンでだけ有効にしてください。公開されたゲートウェイでは無効のままにしてください。

ホスト名の部分文字列によるガード（見た目のよく似た Unicode のドメインを使ったごまかしを、実際の IP が公開のものであってもブロックします）は、この設定にかかわらず有効なままです。

### tirith による実行前のセキュリティ走査 {#tirith-pre-exec-security-scanning}

Hermes は [tirith](https://github.com/sheeki03/tirith) を組み込んでいて、実行の前にコマンドの中身を走査します。tirith は、パターン照合だけでは見逃してしまう脅威を検出します。

- 見た目のよく似た文字を使った URL のなりすまし（国際化ドメインを使った攻撃）
- インタプリタへの流し込み（`curl | bash`、`wget | sh`）
- 端末に対するインジェクション攻撃

tirith は初回の利用時に GitHub のリリースから自動でインストールされ、SHA-256 のチェックサムで検証されます（cosign が使えれば cosign による出所の検証も行います）。

```yaml
# In ~/.hermes/config.yaml
security:
  tirith_enabled: true       # Enable/disable tirith scanning (default: true)
  tirith_path: "tirith"      # Path to tirith binary (default: PATH lookup)
  tirith_timeout: 5          # Subprocess timeout in seconds
  tirith_fail_open: true     # Allow execution when tirith is unavailable (default: true)
```

`tirith_fail_open` が `true`（既定）のとき、tirith が入っていなかったりタイムアウトしたりしてもコマンドは実行されます。高いセキュリティが求められる環境では `false` にして、tirith が使えないときはコマンドをブロックしてください。

tirith は Linux（x86_64 / aarch64）と macOS（x86_64 / arm64）向けのビルド済みバイナリを配布しています。ビルド済みバイナリがないプラットフォーム（Windows など）では、tirith は何も言わずに飛ばされます。パターン照合によるガードは動き続け、CLI に「使えません」というバナーは出ません。Windows で tirith を使いたい場合は、WSL の上で Hermes を動かしてください。

tirith の判定は承認の流れに組み込まれています。安全なコマンドはそのまま通り、疑わしいコマンドとブロックされたコマンドはどちらも、tirith の検出内容（深刻度、見出し、説明、より安全な代替）を添えてユーザーの承認に回されます。ユーザーは承認も拒否もできますが、既定は拒否です。誰も見ていない場面でも安全を保つためです。

### コンテキストファイルへのインジェクション対策 {#context-file-injection-protection}

コンテキストファイル（AGENTS.md、.cursorrules、SOUL.md）は、システムプロンプトに取り込まれる前にプロンプトインジェクションの走査を受けます。走査で見ているのは次の点です。

- それまでの指示を無視・軽視するよう促す記述
- 怪しいキーワードを含む隠された HTML コメント
- 秘密情報（`.env`、`credentials`、`.netrc`）を読もうとする試み
- `curl` を使った資格情報の持ち出し
- 目に見えない Unicode 文字（ゼロ幅スペース、双方向の上書き文字）

ブロックされたファイルには警告が出ます。

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

## 本番運用のベストプラクティス {#best-practices-for-production-deployment}

### ゲートウェイを本番に置くときの確認事項 {#gateway-deployment-checklist}

1. **許可リストをはっきり設定する** — 本番で `GATEWAY_ALLOW_ALL_USERS=true` を使わないでください
2. **コンテナのバックエンドを使う** — config.yaml で `terminal.backend: docker` を設定します
3. **リソースの上限を絞る** — CPU、メモリ、ディスクに適切な上限を設定します
4. **秘密情報を安全に保管する** — API キーは `~/.hermes/.env` に置き、ファイルの権限を適切にします
5. **DM のペアリングを使う** — できるかぎり、ユーザー ID を直接書くのではなくペアリングコードを使います
6. **コマンドの許可リストを見直す** — config.yaml の `command_allowlist` を定期的に点検します
7. **`terminal.cwd` を設定する** — 重要なディレクトリからエージェントを動かさないようにします
8. **非 root で動かす** — ゲートウェイを root で動かしてはいけません
9. **ログを見る** — `~/.hermes/logs/` に不正なアクセスの試みがないか確認します
10. **最新に保つ** — セキュリティ修正のために `hermes update` を定期的に実行します

### API キーを守る {#securing-api-keys}

```bash
# Set proper permissions on the .env file
chmod 600 ~/.hermes/.env

# Keep separate keys for different services
# Never commit .env files to version control
```

### ネットワークの分離 {#network-isolation}

安全性を最大限に高めたいなら、ゲートウェイを別のマシンや VM で動かします。`config.yaml` で `terminal.backend: ssh` を設定し、接続先の情報は `~/.hermes/.env` の環境変数で渡します。

```yaml
# ~/.hermes/config.yaml
terminal:
  backend: ssh
```

```bash
# ~/.hermes/.env
TERMINAL_SSH_HOST=agent-worker.local
TERMINAL_SSH_USER=hermes
TERMINAL_SSH_KEY=~/.ssh/hermes_agent_key
```

SSH の接続情報を `config.yaml` ではなく `.env` に置くのは、バージョン管理に入ったり、プロファイルの書き出しと一緒に共有されたりしないようにするためです。これでゲートウェイのメッセージング接続と、エージェントのコマンド実行を切り離せます。

## サプライチェーンの注意喚起のチェック {#supply-chain-advisory-checking}

Hermes には、使用中の venv に入っている Python パッケージのうち、侵害が判明しているバージョンの一覧に一致するものを知らせるスキャナが組み込まれています（2026 年 5 月の `mistralai 2.4.6` 汚染のような、サプライチェーンを狙うワームが対象です）。実装は `hermes_cli/security_advisories.py` にあります。

動くタイミングは次のとおりです。

- **CLI の起動時のバナー。** 一致するものがあれば 1 行の警告が出て、詳しい対処は `hermes doctor` を見るよう案内します。
- **`hermes doctor`。** 該当するすべての注意喚起について、バージョンの詳細と 2〜4 手順の対処方法を表示します。
- **ゲートウェイの起動時。** `gateway.log` に記録され、最初の対話メッセージで運用者向けの短いバナーが出ます。

それぞれの注意喚起には固定の id が付いています。読んで対処し終えたら、以後は表示しないようにできます。

```bash
hermes doctor --ack <advisory-id>
```

この確認済みの記録は `config.security.acked_advisories` に保存され、再起動しても残ります。古い注意喚起は意図的に一覧から **消していません**。残しておくことで、社内のミラーにまだ残っているかもしれない、過去に汚染されたバージョンについて、新しくインストールした人にも警告が届きます。

チェック自体は標準ライブラリだけで動き、注意喚起 1 件につき `importlib.metadata.version()` を 1 回呼ぶだけなので、起動のたびに実行しても問題ありません。

### 任意の依存関係の遅延インストール {#lazy-install-of-optional-dependencies}

多くの機能（Mistral TTS、ElevenLabs、Honcho のメモリ、Bedrock、Slack、Matrix など）は、全員が必要とするわけではない Python のパッケージに依存しています。Hermes はこれらを `hermes-agent[all]` でまとめて入れるのではなく、最初に使うときに **遅延して** インストールします。実装は `tools/lazy_deps.py` にあります。

これで解消される問題は次の 2 つです。

- **壊れやすさ。** ある extra の依存先が PyPI から使えなくなったとき（マルウェアで隔離された、取り下げられた、アップロードが壊れた）、`[all]` の依存解決が丸ごと失敗し、新しいインストールが何も言わずに機能の削られた構成に落ちてしまいます。無関係な extra が 10 個以上まとめて失われるということです。遅延インストールならバックエンドごとに切り離されるので、汚染された依存先ひとつが無関係な機能を壊すことはありません。
- **肥大化。** ひとつのプロバイダしか使わない人が、決して読み込むことのない数百ものパッケージを引きずり込まずに済みます。

しくみは次のとおりです。

1. バックエンドのモジュールが、最初に読み込まれる経路の先頭で `ensure("feature.name")` を呼びます。
2. 依存関係が足りなければ、`ensure` は `config.yaml` の `security.allow_lazy_installs`（既定は `true`）を確認し、許可リストにある指定について venv の中で `pip install` を実行します。
3. インストールに失敗した場合や、遅延インストールを無効にしている場合は、実際の pip の標準エラー出力と `hermes tools` への案内を添えて `FeatureUnavailable` を送出します。

`tools/lazy_deps.py` が守るセキュリティ上の約束です。

| 約束 | 内容 |
|---|---|
| venv の中だけ | インストール先は使用中の venv の `sys.executable` です。システムの Python には決して入れません |
| PyPI から名前で指定するだけ | 指定できるのは `"package>=1.0,<2"` のような書き方だけです。`--index-url`、`git+https://`、file: のパスは使えないので、細工された `config.yaml` からインストール先を変えることはできません |
| 許可リスト | この経路でインストールできるのは、ツリーの中の `LAZY_DEPS` の対応表に載っている指定だけです。機能名を打ち間違えても、何でもインストールできるようにはなりません |
| 無効にできる | `security.allow_lazy_installs: false` にすると、実行中のインストールを完全に止められます。ネットワークが制限された環境や、厳しいセキュリティ方針のもとで役立ちます |
| 黙って再試行しない | 失敗は `FeatureUnavailable` として表に出ます。悪い状態をキャッシュすることも、再試行を繰り返すこともありません |

実行中のインストールを無効にするには、次のようにします。

```yaml
# ~/.hermes/config.yaml
security:
  allow_lazy_installs: false
```

無効にすると、任意の依存関係が必要なバックエンドは、手動でのインストール（`pip install …`）か、`hermes tools` で別のバックエンドを選ぶようユーザーに伝えます。
