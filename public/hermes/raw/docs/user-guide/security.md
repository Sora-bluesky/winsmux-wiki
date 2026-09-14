---
title: "セキュリティ"
description: "セキュリティモデル、危険なコマンドの承認、ユーザーの認可、コンテナの隔離、本番運用のベストプラクティス"
upstream_path: user-guide/security.md
upstream_blob: 8a69a1684b5dd448f4abe3745ab5bba68fd2edb0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/security
---

# セキュリティ {#security}

Hermes Agent は、多層防御の考え方でセキュリティを設計しています。このページでは、コマンドの承認からコンテナの隔離、メッセージングプラットフォーム上でのユーザーの認可まで、すべての境界を説明します。

## 概要 {#overview}

セキュリティモデルは8つの層でできています。

1. **ユーザーの認可** — 誰がエージェントと話せるか（許可リスト、DM のペアリング）
2. **危険なコマンドの承認** — 壊す操作の前に人が判断する
3. **ファイル書き込みの安全策** — `write_file` / `patch` に対する禁止リストと、任意で使える書き込みサンドボックス
4. **コンテナの隔離** — Docker / Singularity / Modal による、堅めの設定でのサンドボックス化
5. **MCP の認証情報のふるい分け** — MCP の子プロセスに対する環境変数の隔離
6. **コンテキストファイルの検査** — プロジェクトのファイルに仕込まれたプロンプトインジェクションの検出
7. **セッションどうしの隔離** — セッションは互いのデータや状態にアクセスできません。cron ジョブの保存先はパストラバーサル攻撃に対して固められています
8. **入力の検査** — terminal ツールのバックエンドに渡される作業ディレクトリの指定は、シェルへの注入を防ぐために許可リストと照合されます

## 危険なコマンドの承認 {#dangerous-command-approval}

Hermes はコマンドを実行する前に、危険なパターンをまとめた一覧と照合します。当てはまったときは、利用者がはっきり承認しないと動きません。

### 承認のモード {#approval-modes}

承認のしくみには3つのモードがあり、`~/.hermes/config.yaml` の `approvals.mode` で設定します。

```yaml
approvals:
  mode: smart                     # smart | manual | off
  timeout: 300                    # seconds to wait for user response (default: 300)
  cron_mode: deny                 # deny | approve — what cron jobs do when they hit a dangerous command
  single_query_mode: deny         # deny | approve — what single-query (-q) sessions do on a dangerous command
  unattended_mode: deny           # deny | approve — what webhook/API sessions do on a dangerous command
  mcp_reload_confirm: true        # /reload-mcp asks before invalidating the MCP tool cache
  destructive_slash_confirm: true # /clear, /new, /reset, /undo prompt before discarding state
```

設定できるキーは次のとおりです。

| キー | 既定値 | 何を決めるか |
|---|---|---|
| `mode` | `smart` | 危険なシェルコマンドをどう扱うか。下の表を参照してください。 |
| `timeout` | `300` | 承認の返事を Hermes が待つ秒数です。これを過ぎると打ち切ります。 |
| `cron_mode` | `deny` | [cron ジョブ](/hermes/docs/user-guide/features/cron/)が、人のいないところで危険なコマンドの確認に当たったときの動きです。`deny` はそのコマンドを止めます（エージェントは別の道を探すことになります）。`approve` は cron の中でのすべてを自動で承認します。 |
| `single_query_mode` | `deny` | 1回きりの [`hermes chat -q`](/hermes/docs/user-guide/cli/) セッションが、危険なコマンドの確認に当たったときの動きです。`-q` のセッションは1往復だけ動いて終了し、確認に答える人はいません。`deny` はそのコマンドを止め（エージェントは別の道を探すことになります）、`approve` は1回きりのセッションの中でのすべてを自動で承認します。`cron_mode` と同じ考え方です。 |
| `unattended_mode` | `deny` | 人が見ていないプログラム経由のセッション（webhook、msgraph_webhook、api_server）が、危険なコマンドの確認に当たったときの動きです。こうした場所には `/approve` に答えられる人がいないので、承認の待ち時間いっぱい止まるのではなく、`deny` はそのコマンドを即座に止め（エージェントは別の道を探すことになります）、`approve` はその中でのすべてを自動で承認します。`cron_mode` と同じ考え方です。 |
| `mcp_reload_confirm` | `true` | true のとき、`/reload-mcp` は MCP のツール一覧を組み直す前に確認します。組み直すとプロバイダー側のプロンプトキャッシュが無効になるため（ツールの定義はシステムプロンプトに入っています）、次のメッセージで入力トークンを丸ごと送り直すことになります。**Always Approve** を押した利用者は、このキーが `false` に変わります。 |
| `destructive_slash_confirm` | `true` | true のとき、会話の状態を捨てるスラッシュコマンド（`/clear`、`/new`、`/reset`、`/undo`）は、捨てる前に確認します。3択の画面（Approve Once / Always Approve / Cancel）で、Telegram、Discord、Slack では各サービスの「はい / いいえ」ボタン、それ以外では文字での入力になります。**Always Approve** を押した利用者は、このキーが `false` に変わります。TUI もこの設定を見て `/clear`、`/new`、`/reset` の確認画面を出します。`HERMES_TUI_NO_CONFIRM=1` を設定すると、設定値にかかわらずその確認画面を飛ばします。 |

| モード | 動き |
|------|----------|
| **smart**（既定） | 補助の LLM に危険度を判定させます。危険の少ないコマンド（`python -c "print('hello')"` など）は、そのコマンドにかぎって自動で承認されます。本当に危険なものは自動で拒否されます。判断がつかないものは、人への確認に上がります。 |
| **manual** | 危険なコマンドでは必ず利用者に確認します。 |
| **off** | 承認の検査をすべて止めます。`--yolo` を付けて動かすのと同じです。すべてのコマンドが確認なしで実行されます。 |

:::warning
`approvals.mode: off` にすると、安全のための確認がすべて止まります。信頼できる環境（CI/CD、コンテナなど）だけで使ってください。
:::

### YOLO モード {#yolo-mode}

YOLO モードは、そのセッションの危険なコマンドの確認を **すべて** 素通りさせます。3つの方法で有効にできます。

1. **CLI のフラグ**: `hermes --yolo` か `hermes chat --yolo` でセッションを始める
2. **スラッシュコマンド**: セッション中に `/yolo` と打って切り替える
3. **環境変数**: `HERMES_YOLO_MODE=1` を設定する

`/yolo` コマンドは **切り替え** です。使うたびにオンとオフが入れ替わります。

```
> /yolo
  ⚡ YOLO mode ON — all commands auto-approved. Use with caution.

> /yolo
  ⚠ YOLO mode OFF — dangerous commands will require approval.
```

YOLO モードは CLI でもゲートウェイのセッションでも使えます。内部では `HERMES_YOLO_MODE` 環境変数を設定していて、コマンドを実行するたびにこれが見られます。

YOLO が効いているあいだ、確認が素通りしていることを忘れないように、Hermes は2つの表示を出し続けます。

- 開始時点ですでに YOLO が効いているときは、赤い帯の行が出ます: `⚠ YOLO mode — all approval prompts bypassed`。オフのときは出ないので、ふだんの表示はすっきりしたままです。
- ステータスバーには、どの幅でも `⚠ YOLO` の表示が出ます。オンとオフを切り替えるたびにその場で変わります（装飾付きの表示でも、素の文字だけの表示でも同じです）。

:::danger
YOLO モードは、そのセッションの危険なコマンドの検査を **すべて** 止めます。ただし、下で説明する絶対拒否リストだけは **例外** です。生成されるコマンドを完全に信用できるときだけ使ってください（使い捨ての環境で、十分に試した自動化スクリプトを動かすときなど）。
:::

会話の状態を捨てるスラッシュコマンド（`/clear`、`/new` / `/reset`、`/undo`、`/quit --delete` — `/exit --delete` は別名です）については、CLI が実行前に確認します。[スラッシュコマンド — 状態を捨てるコマンドの確認](/hermes/docs/reference/slash-commands/#confirmation-prompts-for-destructive-commands)を参照してください。

### 見張られているゲートウェイの起動・停止の制限 {#supervised-gateway-lifecycle-restriction}

terminal ツールには、見張られているゲートウェイのプロセスの内側から、そのゲートウェイ自身を
止めたり再起動したりすることを防ぐ、上書きできない別の防御があります。自分で自分を再起動すると、
ツールが処理を終える前に落ちてしまい、見張り役と自動再開が延々と繰り返される状態を招きかねません。
利用者の承認も、YOLO モードも、`force=True` も、この防御は通り抜けられません。

macOS では、実行される `launchctl submit` と `launchctl bootstrap` のコマンドは、
**ジョブのラベルに関係なく** 制限されます。これは、当たりさわりのないラベルを付けた
間接的な再起動の手助けを取りこぼさないための、安全側に倒した登録の制限であって、
対象の plist を調べたうえでの判断ではありません。`RunAtLoad=false` で `KeepAlive` のキーを
持たない、独立した定時ジョブも同じように拒否されます。拒否されたからといって、そのジョブが
KeepAlive を使っているとか、Hermes を制御しているという意味には **なりません**。

正規の LaunchAgent の手入れをするときは、動いているゲートウェイの外側で別のシェルを使ってください。
独立した `load` / `unload` のコマンドのなかには、いまのところラベルによる検査を通るものもありますが、
それは対象を確かめたうえでの例外でも、`bootstrap` の拒否を回避してよいという意味でもありません。
読み取りだけの `launchctl print` は起動・停止の操作には当たりません。外側で手入れをしたあとは、
ディスク上の plist と、実際に読み込まれているジョブを分けて考えてください。plist の妥当性を確かめ、
読み込まれている予定を読み返してから、有効になったと報告します。

ツールが拒否したということは、そのツール呼び出しではコマンドが実行されなかった、ということです。
アシスタントが呼び出しそのものを見送るのは別のモデル側の判断で、モデルを変えても terminal の
この防御の方針は変わりません。

### 絶対拒否リスト（常に効く最低ライン） {#hardline-blocklist-always-on-floor}

取り返しのつかないファイルシステムの消去、フォークボム、ブロックデバイスへの直接書き込みのように、あまりにも被害が大きいコマンドについては、Hermes は次のどれであっても実行を **拒否** します。

- `--yolo` / `/yolo` がオンになっている
- `approvals.mode: off` になっている
- cron ジョブが人のいない `approve` モードで動いている
- 利用者が「常に許可」をはっきり押している

このリストは `--yolo` のさらに下にある床です。承認の層がコマンドを見る **前に** 働き、外すためのフラグはありません。いま対象になっているパターンは次のとおりです（これですべてではなく、`tools/approval.py::UNRECOVERABLE_BLOCKLIST` と同期しています）。

| パターン | なぜ絶対拒否なのか |
|---|---|
| `rm -rf /` とその明らかな変種 | ファイルシステムの根元を消してしまいます |
| `rm -rf --no-preserve-root /` | 「根元でいいと分かって書いている」変種です |
| `:(){ :\|:& };:`（bash のフォークボム） | 再起動するまでホストを使い切ります |
| マウント済みの根元デバイスに対する `mkfs.*` | 動いているシステムを初期化してしまいます |
| `dd if=/dev/zero of=/dev/sd*` | 物理ディスクをゼロで埋めます |
| ルートファイルシステムの最上位で、信用できない URL を `sh` に流し込む | リモートからコードを実行される入口で、承認して通せる範囲を超えています |

このリストに当たると、ツールの呼び出しは理由を書いたエラーをエージェントに返し、何も実行されません。もし正当な作業でこうしたコマンドが要るなら（消して入れ直す仕組みを運用している場合など）、エージェントの外で実行してください。

この最低ラインは、シェルの引用符を解釈できないコマンド（`grep 'unterminated`）でも閉じる側に倒れ、エラーには `malformed executable payload` と出ます。引用符の判定は書かれたとおりのコマンドに対して行うので、引用符で囲んだパターンの中のシェルとして正しいエスケープ（`grep -o "[^\"]*" file`）は不正と見なされません。また区切り記号の前にあるエスケープした引用符（`echo "a\"b"; reboot`）で、その後ろのコマンドが隠れることもありません。

### 利用者が決める拒否ルール（`approvals.deny`） {#user-defined-deny-rules-approvalsdeny}

絶対拒否リストは固定で、コードに埋め込まれています。`approvals.deny` はその利用者が編集できる版で、当てはまる terminal のコマンドを無条件に止めるグロブパターンの一覧です。`--yolo`、`/yolo`、`approvals.mode: off` を見る **前に** 効きます。「これとこれ以外は何でもやっていい」という形の yolo 運用に使えます。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
    - "dd if=* of=/dev/*"
```

細かいところ:

- パターンは [fnmatch](https://docs.python.org/3/library/fnmatch.html) のグロブ（`*`、`?`、`[...]`）で、コマンドの文字列全体と、そこから取り出した実行コマンドの候補それぞれに対して **大文字小文字を区別せずに** 照合します。`git push --force*` は `git push --force origin main` に当たりますが、`git push origin main` には当たりません。
- 照合は、危険なパターンの検出器が使うのと同じ、正規化して難読化を解いたコマンドに対しても行われます。ですから、`git pu""sh --force` のような単純な引用符のごまかしではすり抜けられません。
- 実行コマンドの候補は、書かれたままのパスに加えて、その末尾のファイル名でも照合されます。`sudo *` は `/usr/bin/sudo -n id` にも `./sudo -n id` にも当たります。逆に `/usr/bin/sudo *` のようにパスまで書いたルールは、`sudo` という名前の実行ファイルすべてに対するルールには **なりません**。
- 引用符を踏まえた解析により、変数の代入や先頭のリダイレクトのあと、`;`、`&&`、`||`、パイプ、グループ、コマンド置換、さらに `if` / `then` / `else` / `do` の区切りのあとに来るコマンドも取り出されます。前置きとして扱えるのは `sudo`、`env`、`command`、`exec`、`nohup`、`setsid`、`time`、`nice`、`timeout`、`stdbuf`、`ionice`、`chrt`、`taskset`、`chroot` です。既知のオプションが取る値は読み飛ばします。`command -v` や `-V` による場所の確認は実行とは見なしません。シェルの `-c` に渡された中身は、入れ子になっていても中まで調べます。`env -S` や `--split-string` に書かれた「実行ファイルと引数」の文字列は、GNU 方式の引用符とエスケープ（単語の区切りを表す `\_` や、そこで打ち切る `\c` を含みます）として読み、残りのコマンド引数をうしろに付けます。その引数の中にシェルの記号があっても、本物のシェルの `-c` が受け取らないかぎりはただのデータのままです。`env -a` や `--argv0` に渡す値は引数であって、実行ファイルの名前ではありません。シェルおよび GNU の split-string のコメントからは、実行コマンドの候補は生まれません。
- 追加で取り出す実行コマンドの候補では、単語の **あいだ** の空白はまとめられますが、引用符で囲んだ中身と引数のパスはそのまま残ります。そのため `git status` のようにぴったり書いたルールは、`env git\tstatus; echo done`（`\t` はタブ文字を表します）にも当たります。`echo 'sudo -n id'` のように引用符の中で触れているだけのものは、コマンドには格上げされません。`*sudo*` のようにコマンド全体を見るグロブは、これまでどおり、どこに出てきても当たります。これは意図した動きです。
- **YAML の書き方:** パターンは必ず引用符で囲んでください。先頭に裸の `*` があると YAML のエイリアスと見なされて読み込みに失敗します。`{`、`!`、`: ` にも YAML 上の意味があります。シェルっぽい中身にはシングルクォートがいちばん安全です。
- 利用者が決めた拒否ルールは、隔離されたコンテナを含むすべての terminal バックエンドに対して、バックエンドごとの承認の近道より前に効きます。
- 拒否されたコマンドは、再試行も言い換えもしないようにと伝える BLOCKED エラーをエージェントに返します。何も実行されません。

承認まわりのほかの設定と同じく、変更はすぐに反映されます（設定のキャッシュは更新時刻で管理されています）。セッションを開き直す必要はありません。

:::note 想定している脅威
拒否ルールはシェルコマンドに対する方針であって、シェルの完全な実装でも、OS の権限を閉じ込めるサンドボックスでもありません。正規化は、任意の変数（GNU の `env -S` における `${NAME}` の展開を含みます）、エイリアス、関数、名前を変えた実行ファイル、スクリプト、インタプリタ、そしてシェルや前置きコマンドのあらゆる文法（たとえば case のパターン構文、まとめて書いたオプション、`env -S` の文字列の中に埋め込まれたオプション）まで解くわけではありません。ファイル名だけを書いた拒否ルールを、その機能に別の道からたどり着けない保証として使わないでください。閉じ込めたいときは、OS の権限と、マウント・認証情報・ネットワークを適切に絞った隔離バックエンドを使ってください。この照合の仕方によって、設定した承認モードや、拒否リストが空という既定が変わることはありません。
:::

### 承認の待ち時間 {#approval-timeout}

危険なコマンドの確認が出たとき、利用者が答えられる時間は設定できます。その時間内に返事がなければ、既定ではそのコマンドは **拒否** されます（迷ったら止める側に倒れます）。

待ち時間は `~/.hermes/config.yaml` で設定します。

```yaml
approvals:
  timeout: 300  # seconds (default: 300)
```

### 何が承認の対象になるか {#what-triggers-approval}

次のパターンに当たると確認が出ます（`tools/approval.py` に定義されています）。

| パターン | 説明 |
|---------|-------------|
| `rm -r` / `rm --recursive` | 再帰的な削除 |
| `rm ... /` | 根元のパスでの削除 |
| `chmod 777/666` / `o+w` / `a+w` | 誰でも書き込める権限にする |
| 危ない権限を伴う `chmod --recursive` | 誰でも書き込める権限を再帰的に付ける（長いフラグ） |
| `chown -R root` / `chown --recursive root` | root への再帰的な所有者変更 |
| `mkfs` | ファイルシステムの初期化 |
| `dd if=` | ディスクの複製 |
| `> /dev/sd` | ブロックデバイスへの書き込み |
| `DROP TABLE/DATABASE` | SQL の DROP |
| WHERE のない `DELETE FROM` | WHERE のない SQL の DELETE |
| `TRUNCATE TABLE` | SQL の TRUNCATE |
| `> /etc/` | システム設定の上書き |
| `systemctl stop/restart/disable/mask` | システムのサービスの停止・再起動・無効化 |
| `kill -9 -1` | すべてのプロセスの終了 |
| `pkill -9` | プロセスの強制終了 |
| フォークボムのパターン | フォークボム |
| `bash -c` / `sh -c` / `zsh -c` / `ksh -c` | `-c` フラグ経由でのシェルコマンドの実行（`-lc` のようにまとめたフラグも含みます） |
| `python -e` / `perl -e` / `ruby -e` / `node -c` | `-e` / `-c` フラグ経由でのスクリプトの実行 |
| `curl ... \| sh` / `wget ... \| sh` | 取ってきた中身をシェルに流し込む |
| `bash <(curl ...)` / `sh <(wget ...)` | プロセス置換でリモートのスクリプトを実行する |
| `/etc/`、`~/.ssh/`、`~/.hermes/.env` への `tee` | tee による重要なファイルの上書き |
| `/etc/`、`~/.ssh/`、`~/.hermes/.env` への `>` / `>>` | リダイレクトによる重要なファイルの上書き |
| `xargs rm` | xargs と rm の組み合わせ |
| `find -exec rm` / `find -delete` | find と、消す操作の組み合わせ |
| `/etc/` への `cp` / `mv` / `install` | システム設定へのファイルのコピーや移動 |
| `/etc/` に対する `sed -i` / `sed --in-place` | システム設定のその場での書き換え |
| hermes や gateway に対する `pkill` / `killall` | 自分自身を終わらせないための防止 |
| `&` / `disown` / `nohup` / `setsid` を伴う `gateway run` | サービス管理の外でゲートウェイを起動させないための防止 |
| `docker stop/kill/restart`、`docker compose down/stop/kill/restart` | コンテナの起動・停止（全体フラグや `docker-compose` も拾います） |
| `docker -H` / `--host` / `--context`、`DOCKER_HOST=` / `DOCKER_CONTEXT=` | Docker のデーモンの切り替え。別の（多くは遠隔の）デーモンを相手にするコマンドです |
| `docker context use` | 以後のすべての docker コマンドの既定のデーモンを切り替えます |
| `podman --remote` / `-r` / `--url` / `--connection` / `--identity`、`CONTAINER_HOST=` | Podman の遠隔デーモンへの切り替え |

:::info
**コンテナでの素通り**: `docker`、`singularity`、`modal`、`daytona`、`vercel_sandbox` のバックエンドで動いているときは、危険なコマンドの検査は **飛ばされます**。コンテナそのものが安全の境界だからです。コンテナの中で壊す操作をしても、ホストには届きません。
:::

### 承認の流れ（CLI） {#approval-flow-cli}

対話型の CLI では、危険なコマンドはその場で確認が出ます。

```
  ⚠️  DANGEROUS COMMAND: recursive delete
      rm -rf /tmp/old-project

      [o]nce  |  [s]ession  |  [a]lways  |  [d]eny

      Choice [o/s/a/D]:
```

4つの選択肢は次のとおりです。

- **once** — この1回だけ許可します
- **session** — このセッションのあいだ、このパターンを許可します
- **always** — 恒久の許可リストに加えます（`config.yaml` に保存されます）
- **deny**（既定） — コマンドを止めます

### 承認の流れ（ゲートウェイ / メッセージング） {#approval-flow-gatewaymessaging}

メッセージングプラットフォームでは、エージェントが危険なコマンドの内容をチャットに送り、利用者の返信を待ちます。

- 承認するときは **yes**、**y**、**approve**、**ok**、**go** と返信します
- 拒否するときは **no**、**n**、**deny**、**cancel** と返信します

ゲートウェイを動かすときは、`HERMES_EXEC_ASK=1` 環境変数が自動で設定されます。

### 恒久の許可リスト {#permanent-allowlist}

「always」で承認したコマンドは `~/.hermes/config.yaml` に保存されます。

```yaml
# Permanently allowed dangerous command patterns
command_allowlist:
  - rm
  - systemctl
```

これらのパターンは起動時に読み込まれ、以後のセッションでは確認なしで承認されます。

この設定は文字列のリストでなければなりません。古い環境で、リストを YAML / JSON の文字列として
引用符付きで保存していた場合は、読み込み時にリストへ戻したうえで、`hermes config edit` で
保存し直すよう警告を出します。それ以外の壊れた値は警告を出して無視され、1 文字ずつの承認に
化けることはありません。読み込みによって設定ファイルが書き換えられることはありません。

:::tip
恒久の許可リストを見直したり、そこからパターンを外したりするには `hermes config edit` を使ってください。
:::

:::caution
このリストは Hermes の起動時に読み込まれます。セッションが動いている間にパターンを外しても、
そのセッションでは、次にファイルが書き込まれるとき（次に確認へ `always` と答えたとき）か
Hermes を再起動するまで、承認されたままです。安全のために外したのであれば、
再起動してください。
:::

### 承認の履歴から掘り出す（`hermes approvals suggest`） {#mining-approval-history-hermes-approvals-suggest}

同じ確認にセッションのたびに答える代わりに、これまでの承認の記録から
許可リストの候補を掘り出せます。

```bash
hermes approvals suggest            # dry run — prints a numbered proposal
hermes approvals suggest --apply 1,3  # merge picks into command_allowlist
hermes approvals suggest --json     # machine-readable output
```

このコマンドはセッションのデータベース（`~/.hermes/state.db`）を調べ、危険と分類されたのに
実際に実行されたコマンド、つまり利用者が承認したものを探し出して、パターン（`git push *` や、
複合コマンドなら危険度の分類キー）にまとめ、承認された回数の多い順に並べます。

```
Proposed command_allowlist additions (from approval history, last 90 days):

  1. git push *    — approved 14x
  2. docker restart/stop/kill (container lifecycle)    — approved 9x (class key)
```

安全のための決まり:

- **自動で適用されることは決してありません。** そのまま実行すると読み取りだけで、
  `--apply N[,M...]` をはっきり指定したときにだけ `config.yaml` に書き込みます。
- **壊す種類のものは、どれだけ承認されていても候補になりません。** 再帰的な削除、`sudo`、
  ディスクやデバイスへの書き込み、認証情報とシステム設定の書き換え、シェルへの流し込み、
  SQL の DROP と TRUNCATE、プロセスの強制終了、そして絶対拒否の分類はすべて外れます。
  `rm -rf build/` を100回承認していても、`rm` の項目が出てくることはありません。
- すでに `command_allowlist` に入っているものは候補から外れます。

役に立つフラグ: `--days N`（さかのぼる期間。既定は90）、`--min-count N`
（候補にする最低承認回数。既定は2）、`--limit N`、`--db PATH`。

## ファイル書き込みの安全策 {#file-write-safety}

`write_file` や `patch` がディスクに触れる前に、Hermes は書き込み先のパスを禁止リストと、設定されていればサンドボックスと照合します。止められた書き込みは、その場でエラーをエージェントに返します。**確認は出ませんし**、チャットの画面から押し切ることもできません。それでもモデルは「書き換えました」と言うことがあります。`display.file_mutation_verifier` が有効なとき（既定）は、アシスタントの締めくくりの文よりも[ファイル変更の確認の表示](/hermes/docs/user-guide/configuration/#file-mutation-verifier)を信じてください。

### 守られるパス（常に止まります） {#protected-paths-always-blocked}

次の種類は、`HERMES_WRITE_SAFE_ROOT` が設定されていなくても常に拒否されます。

| 種類 | 例 |
|----------|----------|
| OS の認証情報の置き場 | `~/.ssh/`（鍵、`authorized_keys`）、`~/.aws/`、`~/.kube/`、`/etc/sudoers`、`~/.netrc` |
| Hermes の認証情報の置き場 | HERMES_HOME 配下（使用中のプロファイルと全体の根元）の `auth.json`、`.env`、`.anthropic_oauth.json`、`mcp-tokens/`、`pairing/` |
| プロジェクトの秘密のファイル | ディスク上のどこにあっても `.env`、`.env.local`、`.env.production`、`.envrc` |

安全な範囲の中にあっても、重要なパスは止まります。`HERMES_WRITE_SAFE_ROOT` を `$HOME` に向けても、`~/.ssh/id_rsa` に書けるようにはなりません。

安全な範囲から外れた場合は `Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (…)` が返ります。認証情報のパスで止まった場合は `Write denied: '…' is a protected system/credential file.` になります。

**例外 — `~/.ssh/config` は完全な禁止ではなく、承認して通す扱いです。** SSH の
*クライアント設定* には秘密鍵そのものが入っておらず、これを編集すること（ホストの別名、
`ProxyJump`、VS Code の Remote-SSH の接続先）はよくある作業です。そのため `write_file` /
`patch` は、以前のような一律の拒否ではなく、terminal ツールが `~/.ssh` への書き込みで使っているのと
同じ「1回だけ / このセッション / 常に」の確認に回します。それでも `ProxyCommand` や `Match exec` の
指定でコマンドが動くことがあるので、この書き込みが黙って通ることはありません。人の応答を得られない
呼び出し元（ACP のファイル連携、人のいない裏の処理）は、止める側に倒れます。秘密鍵、
`authorized_keys`、そのほか `~/.ssh/` 配下のものは、引き続き完全に禁止です。

### HERMES_WRITE_SAFE_ROOT（任意のサンドボックス） {#hermeswritesaferoot-optional-sandbox}

設定すると、`write_file` と `patch` は指定したディレクトリの下だけに書けるようになります。その外は **完全に禁止** で、危険なコマンドの承認にも回りません。

- [公式の Docker イメージ](https://github.com/NousResearch/hermes-agent)では自動で設定されています（`HERMES_WRITE_SAFE_ROOT=/opt/data`）
- 複数の場所を指定できます。Unix では `:`、Windows では `;` で区切ります
- **軽い気持ちで `~/.hermes/.env` に足さないでください。** プロジェクトのディレクトリを指定すると、エージェントは `~/.hermes/cron/jobs.json` やプロファイルの skill など、その外にある Hermes の状態に書けなくなります

作業場所と Hermes のホームの両方を許すには、次のようにします。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

この変数を外すと、書き込みの制限は元に戻ります（守られるパスの禁止リストは残ります）。詳しくは [HERMES_WRITE_SAFE_ROOT](/hermes/docs/reference/environment-variables/#hermes_write_safe_root) を参照してください。

### cron などの Hermes の状態 {#cron-and-other-hermes-state}

`~/.hermes/cron/jobs.json` を直接 `patch` するようにエージェントへ頼まないでください。`cronjob` ツール、[`hermes cron`](/hermes/docs/user-guide/features/cron/)、`/cron` を使ってください。これらは正しい入口を通ってジョブの保存先を更新します。書き込みの安全策で直接の編集が止まったときは、ほかの Hermes の制御ファイルについても同じようにしてください。

:::note 多層防御であって、固い境界ではありません
書き込みの防御が効くのは `write_file` と `patch` だけです。`terminal` ツールは同じ OS ユーザーとして動くので、シェルのコマンドを使えば禁止されたパスを `cat` したり上書きしたりできます。禁止リストは事故を減らし、モデルにはっきりした「ここで止まれ」を伝えるためのもので、敵対的なエージェントや乗っ取られたエージェントを閉じ込めるものではありません。
:::

## ユーザーの認可（ゲートウェイ） {#user-authorization-gateway}

メッセージングのゲートウェイを動かしているとき、Hermes は誰がボットとやりとりできるかを、段階的なしくみで決めます。

### 認可を確かめる順番 {#authorization-check-order}

`_is_user_authorized()` は次の順に確かめます。

1. **プラットフォームごとの全員許可のフラグ**（`DISCORD_ALLOW_ALL_USERS=true` など）
2. **DM のペアリングで承認された一覧**（ペアリングコードで承認された利用者）
3. **プラットフォームごとの許可リスト**（`TELEGRAM_ALLOWED_USERS=12345,67890` など）
4. **全体の許可リスト**（`GATEWAY_ALLOWED_USERS=12345,67890`）
5. **全体の全員許可**（`GATEWAY_ALLOW_ALL_USERS=true`）
6. **既定: 拒否**

### プラットフォームごとの許可リスト {#platform-allowlists}

許可するユーザー ID を、`~/.hermes/.env` にカンマ区切りで書きます。

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
**許可リストがひとつも設定されておらず**、`GATEWAY_ALLOW_ALL_USERS` も設定されていないときは、**すべての利用者が拒否されます**。ゲートウェイは起動時に警告を出します。

```
No user allowlists configured. All unauthorized users will be denied.
Set GATEWAY_ALLOW_ALL_USERS=true in ~/.hermes/.env to allow open access,
or configure platform allowlists (e.g., TELEGRAM_ALLOWED_USERS=your_id).
```
:::

### DM のペアリング {#dm-pairing-system}

もう少し柔らかく認可したいときのために、Hermes にはコードを使ったペアリングのしくみがあります。ユーザー ID をあらかじめ用意する代わりに、知らない利用者には1回きりのペアリングコードが渡され、ボットの持ち主が CLI で承認します。

**流れ:**

1. 知らない利用者がボットに DM を送ります
2. ボットが8文字のペアリングコードを返します
3. ボットの持ち主が CLI で `hermes pairing approve <platform> <code>` を実行します
4. その利用者は、そのプラットフォームで恒久的に承認されます

認可されていない DM をどう扱うかは、`~/.hermes/config.yaml` で決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- チャット型の DM のプラットフォームでは `pair` が既定です。認可されていない DM にはペアリングコードが返ります。
- `ignore` は、認可されていない DM を黙って捨てます。
- メールは、`platforms.email.unauthorized_dm_behavior: pair` を設定しないかぎり `ignore` が既定です。受信箱には関係のない未読メールが入っていることがあるからです。
- プラットフォームごとの設定は全体の既定を上書きするので、Telegram ではペアリングを残しつつ WhatsApp は黙らせる、といった使い分けができます。

**安全のための工夫**（OWASP と NIST SP 800-63-4 の指針に沿っています）:

| 工夫 | 中身 |
|---------|---------|
| コードの形式 | 見間違えにくい32文字（0/O/1/I を除く）から8文字 |
| ランダム性 | 暗号用の生成（`secrets.choice()`） |
| コードの有効期間 | 1時間で失効 |
| 回数の制限 | 利用者ごとに10分に1回 |
| 未処理の上限 | プラットフォームごとに未処理のコードは3つまで |
| ロックアウト | 承認の失敗が5回で1時間のロックアウト |
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

:::tip Docker を使う人へ: ペアリングのコマンドは `hermes` ユーザーで実行してください
公式の Docker イメージは、`gosu` を使って権限のない `hermes` ユーザー（uid 10000）で
ゲートウェイを動かしますが、`docker exec` の既定は root です。root が作った承認のファイルは
`0600 root:root` で書かれるためゲートウェイから読めず、承認が黙って無視されます（[#10270][i10270]）。

必ず `-u hermes` を付けてください。

```bash
docker exec -u hermes hermes-agent hermes pairing approve telegram ABC12DEF
```

すでに root で実行してしまい、その利用者がまだ認可されないままなら、
コンテナを再起動してください。次の起動時に entrypoint が所有者を直します。

[i10270]: https://github.com/NousResearch/hermes-agent/issues/10270
:::

**保存先:** ペアリングのデータは `~/.hermes/pairing/` に、プラットフォームごとの JSON ファイルとして置かれます。
- `{platform}-pending.json` — 未処理のペアリングの申し込み
- `{platform}-approved.json` — 承認された利用者
- `_rate_limits.json` — 回数の制限とロックアウトの記録

## コンテナの隔離 {#container-isolation}

`docker` の terminal バックエンドを使うとき、Hermes はどのコンテナにも厳しめの設定を適用します。

### Docker のセキュリティのフラグ {#docker-security-flags}

どのコンテナも次のフラグ付きで動きます（`tools/environments/docker.py` に定義されています）。

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

`SETUID` と `SETGID` は基本の一覧に **入っていません**。コンテナが root で始まり、init や entrypoint が権限を落とす必要があるとき（s6 の権限降格の経路）にだけ足されます。コンテナがすでに root 以外の `--user` で動いているときは足しません。`/run` の tmpfs も基本の一覧から切り出されていて、イメージごとにマウントされます（既定では `noexec` で固め、`/run` から実行する s6-overlay のイメージのときだけ `exec` にします）。

### 資源の上限 {#resource-limits}

コンテナの資源は `~/.hermes/config.yaml` で設定できます。

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

### ファイルシステムを残すかどうか {#filesystem-persistence}

- **残すモード**（`container_persistent: true`）: `~/.hermes/sandboxes/docker/<task_id>/` から `/workspace` と `/root` をバインドマウントします
- **使い捨てモード**（`container_persistent: false`）: 作業場所に tmpfs を使うので、片付けと同時にすべて消えます

:::tip
本番のゲートウェイでは、`docker`、`modal`、`daytona`、`vercel_sandbox` のバックエンドを使って、エージェントのコマンドをホストから切り離してください。そうすれば、危険なコマンドの承認そのものが要らなくなります。
:::

:::warning
`terminal.docker_forward_env` に名前を足すと、その変数は terminal のコマンドのためにコンテナへ意図的に渡されます。`GITHUB_TOKEN` のような作業ごとの認証情報には便利ですが、コンテナの中で動くコードがそれを読み出して外へ持ち出せるということでもあります。
:::

## terminal のバックエンドのセキュリティ比較 {#terminal-backend-security-comparison}

| バックエンド | 隔離 | 危険なコマンドの検査 | 向いている用途 |
|---------|-----------|-------------------|----------|
| **local** | なし — ホストで動きます | ✅ あり | 開発、信頼できる利用者 |
| **ssh** | 別の端末 | ✅ あり | 別のサーバーで動かすとき |
| **docker** | コンテナ | ❌ 飛ばします（コンテナが境界です） | 本番のゲートウェイ |
| **singularity** | コンテナ | ❌ 飛ばします | HPC の環境 |
| **modal** | クラウドのサンドボックス | ❌ 飛ばします | 規模を伸ばせるクラウドでの隔離 |
| **daytona** | クラウドのサンドボックス | ❌ 飛ばします | 状態が残るクラウドの作業場所 |
| **vercel_sandbox** | クラウドのマイクロ VM | ❌ 飛ばします | スナップショットが残るクラウドでの実行 |

## 環境変数の受け渡し {#environment-variable-passthrough}

`execute_code` と `terminal` はどちらも、LLM が生成したコードによる認証情報の持ち出しを防ぐため、子プロセスから重要な環境変数を取り除きます。ただし、`required_environment_variables` を宣言している skill は、その変数に正当な用があります。

自社のプラットフォームの認証情報、つまり Buzz メッセージングプラットフォームが使う `BUZZ_*` の変数は、**そのセッションが実際に Buzz のエージェントとして動いているとき** にかぎって `terminal` の子プロセス（前面での実行にも、裏で動く PTY の起動にも）へ渡されます。具体的には、そのプロセスが Buzz-ACP の管理下のエージェントであるとき（Buzz Desktop の仕組みが `BUZZ_MANAGED_AGENT` を設定します）か、動いているゲートウェイのセッションのプラットフォームが `buzz` のときです。これにより、Buzz のエージェントは terminal ツールからそのプラットフォームが定めた CLI（`buzz` など）を呼べる一方で、同じホストの Telegram / CLI / cron のセッションでは変数が取り除かれたままになります。`_sanitize_subprocess_env` は検索のワーカー（ddgs のウェブ検索の子プロセスなど）、コンピュータ操作のドライバのバイナリ、利用者のスクリプトを動かす部分（`!` から始まるコマンド、クイックコマンド、cron のスクリプト、webhook のふるい分けのスクリプト）にも使われるので、Buzz のセッションから起動されたときはそれらの子プロセスにも変数が渡ります。この例外は **terminal にかぎった** もので、`execute_code`、ブラウザや TUI のホストの起動（`hermes_subprocess_env`）、Docker や Modal の子プロセス、`env_passthrough` の登録には適用されません。そちらは閉じたままです。

### しくみ {#how-it-works}

特定の変数をサンドボックスのふるいに通す方法は2つあります。

**1. skill ごとの受け渡し（自動）**

skill が読み込まれ（`skill_view` か `/skill` コマンド）、`required_environment_variables` を宣言しているとき、そのうち実際に環境に設定されているものは自動で受け渡しに登録されます。設定されていないもの（まだ準備が要る状態のもの）は登録され **ません**。

```yaml
# In a skill's SKILL.md frontmatter
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
```

この skill を読み込むと、`TENOR_API_KEY` は `execute_code`、`terminal`（local）、**そして遠隔のバックエンド（Docker、Modal）** へ渡ります。手作業の設定は要りません。

:::info Docker と Modal
v0.5.1 より前は、Docker の `forward_env` は skill の受け渡しとは別のしくみでした。いまはひとつになっていて、skill が宣言した環境変数は、`docker_forward_env` に手で足さなくても Docker のコンテナと Modal のサンドボックスへ自動で渡ります。
:::

**2. 設定での受け渡し（手動）**

どの skill も宣言していない環境変数は、`config.yaml` の `terminal.env_passthrough` に足してください。

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

### 認証情報のファイルの受け渡し（OAuth のトークンなど） {#credential-file-passthrough}

skill によっては、環境変数だけでなく **ファイル** がサンドボックスの中に要ります。たとえば Google Workspace は、OAuth のトークンを使用中のプロファイルの `HERMES_HOME` の下に `google_token.json` として置きます。skill はこれをフロントマターで宣言します。

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token (created by setup script)
  - path: google_client_secret.json
    description: Google OAuth2 client credentials
```

読み込まれると、Hermes はこれらのファイルが使用中のプロファイルの `HERMES_HOME` にあるかを確かめ、マウントの対象として登録します。

- **Docker**: 読み取り専用のバインドマウント（`-v host:container:ro`）
- **Modal**: サンドボックスを作るときにマウントし、コマンドのたびに同期します（セッションの途中で OAuth の設定をした場合にも対応します）
- **local**: 何もしません（ファイルはすでに読めます）

`config.yaml` に手で並べることもできます。

```yaml
terminal:
  credential_files:
    - google_token.json
    - my_custom_oauth_token.json
```

パスは `~/.hermes/` からの相対です。ファイルはコンテナの中の `/root/.hermes/` にマウントされます。この一覧を読むのは `tools/credential_files.py`（`terminal.credential_files`）です。`terminal:` のまとまりの中にありますが、読み込むのは認証情報のファイルの担当部分であって terminal のバックエンド本体ではないため、同梱の `DEFAULT_CONFIG` のひな形には入っていません。

### サンドボックスごとのふるい分け {#what-each-sandbox-filters}

| サンドボックス | 既定のふるい | 受け渡しでの上書き |
|---------|---------------|---------------------|
| **execute_code** | 名前に `KEY`、`TOKEN`、`SECRET`、`PASSWORD`、`CREDENTIAL`、`PASSWD`、`AUTH` を含む変数を止め、安全な接頭辞のものだけ通します | ✅ 受け渡しの変数は両方の検査を素通りします |
| **terminal**（local） | Hermes の基盤の変数（プロバイダーの鍵、ゲートウェイのトークン、ツールの API キー）を名指しで止めます | ✅ 受け渡しの変数は禁止リストを素通りします |
| **terminal**（Docker） | 既定ではホストの環境変数を渡しません | ✅ 受け渡しの変数と `docker_forward_env` を `-e` で渡します |
| **terminal**（SSH） | 既定ではホストの環境変数を渡しません | ✅ 受け渡しの変数を `SendEnv` で渡します。相手側の `sshd_config` に対応する `AcceptEnv` が要ります（[SSH のバックエンド](/hermes/docs/user-guide/configuration/#ssh-backend)を参照） |
| **terminal**（Modal） | 既定ではホストの環境変数もファイルも渡しません | ✅ 認証情報のファイルをマウントし、環境変数は同期で渡します |
| **MCP** | 安全なシステムの変数と、設定に書いた `env` 以外はすべて止めます | ❌ 受け渡しの対象外です（MCP の `env` 設定を使ってください） |

### 気をつけること {#security-considerations}

- 受け渡しが効くのは、利用者か skill がはっきり宣言した変数だけです。任意の LLM 生成コードに対する既定の守りは変わりません
- 認証情報のファイルは Docker のコンテナに **読み取り専用** でマウントされます
- Skills Guard は、導入の前に skill の中身をあやしい環境変数の扱いがないか調べます
- 設定されていない変数は登録されません（存在しないものは漏れません）
- Hermes の基盤の秘密（プロバイダーの API キー、ゲートウェイのトークン）は `env_passthrough` に足さないでください。専用のしくみがあります

## MCP の認証情報の扱い {#mcp-credential-handling}

MCP（Model Context Protocol）のサーバーの子プロセスには、認証情報がうっかり漏れないよう、**ふるいにかけた環境** が渡されます。

### 安全な環境変数 {#safe-environment-variables}

ホストから MCP の stdio の子プロセスへ渡るのは、次の変数だけです。

```
PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR
```

これに加えて `XDG_*` の変数が渡ります。ほかの環境変数（API キー、トークン、秘密）はすべて **取り除かれます**。

MCP サーバーの `env` 設定にはっきり書いた変数は渡ります。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_..."  # Only this is passed
```

### 認証情報の伏せ字化 {#credential-redaction}

MCP のツールから返るエラーメッセージは、LLM に渡る前に整えられます。次のパターンは `[REDACTED]` に置き換えられます。

- GitHub の PAT（`ghp_...`）
- OpenAI 形式の鍵（`sk-...`）
- Bearer トークン
- `token=`、`key=`、`API_KEY=`、`password=`、`secret=` のパラメーター

### アクセスできるサイトの方針 {#website-access-policy}

エージェントがウェブやブラウザのツールでアクセスできるサイトを絞れます。社内のサービスや管理画面、そのほか触れてほしくない URL への接続を防ぐのに使えます。

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

止めている URL が要求されると、ツールは方針でそのドメインが止められていると説明するエラーを返します。この禁止リストは `web_search`、`web_extract`、`browser_navigate`、そして URL を扱えるすべてのツールに効きます。

詳しくは設定ガイドの [Website Blocklist](/hermes/docs/user-guide/configuration/#website-blocklist) を参照してください。

### SSRF への対策 {#ssrf-protection}

URL を扱えるすべてのツール（ウェブ検索、ウェブ抽出、画像認識、ブラウザ）は、取りに行く前に URL を検査して、サーバー側から内部へ要求を送らせる攻撃（SSRF）を防ぎます。止められるアドレスは次のとおりです。

- **プライベートネットワーク**（RFC 1918）: `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`
- **ループバック**: `127.0.0.0/8`、`::1`
- **リンクローカル**: `169.254.0.0/16`（`169.254.169.254` のクラウドのメタデータを含みます）
- **CGNAT と共有アドレス空間**（RFC 6598）: `100.64.0.0/10`（Tailscale、WireGuard の VPN）
- **クラウドのメタデータのホスト名**: `metadata.google.internal`、`metadata.goog`
- **予約済み、マルチキャスト、未指定のアドレス**

インターネットに面した使い方では SSRF への対策は常に効いていて、DNS の失敗も止める側に倒します。リダイレクトの連鎖も1つ進むごとに検査し直すので、転送で回り込むことはできません。

#### 意図してプライベートな URL を許す {#intentionally-allowing-private-urls}

構成によっては、内部の URL に正当な用があります。`home.arpa` を RFC 1918 の範囲に解決する家庭内のネットワーク、LAN の中だけの Ollama や llama.cpp の接続先、社内の情報共有サイト、クラウドのメタデータの調査などです。そうした場合のために、全体で切り替えられる設定があります。

```yaml
security:
  allow_private_urls: true   # default: false
```

有効にすると、ウェブのツール、ブラウザ、画像認識の URL 取得、ゲートウェイのメディアのダウンロードは、RFC 1918 / ループバック / リンクローカル / CGNAT / クラウドのメタデータ宛てを拒まなくなります。**これは意図して信頼の境界をずらす設定です。** プロンプトインジェクションで仕込まれた URL をエージェントが社内ネットワークに向けて叩いても許容できる端末でだけ有効にしてください。外に公開しているゲートウェイでは切ったままにしてください。

ホスト名の部分文字列を見る守り（IP そのものが公開のものでも、見た目のよく似た Unicode のドメインのごまかしを止めます）は、この設定にかかわらず効いたままです。

### tirith による実行前のセキュリティ検査 {#tirith-pre-exec-security-scanning}

Hermes は、実行前にコマンドの中身を調べるために [tirith](https://github.com/sheeki03/tirith) を組み込んでいます。tirith は、パターン照合だけでは見逃す脅威を見つけます。

- 見た目のよく似た URL のなりすまし（国際化ドメインを使った攻撃）
- インタープリタへの流し込み（`curl | bash`、`wget | sh`）
- 端末への注入攻撃

tirith は初回の利用時に GitHub のリリースから自動で入り、SHA-256 のチェックサムで検証されます（cosign が使えるときは cosign による出所の検証も行います）。

```yaml
# In ~/.hermes/config.yaml
security:
  tirith_enabled: true       # Enable/disable tirith scanning (default: true)
  tirith_path: "tirith"      # Path to tirith binary (default: PATH lookup)
  tirith_timeout: 5          # Subprocess timeout in seconds
  tirith_fail_open: true     # Allow execution when tirith is unavailable (default: true)
```

`tirith_fail_open` が `true`（既定）のときは、tirith が入っていなかったり時間切れになったりしても、コマンドはそのまま進みます。高いセキュリティが要る環境では `false` にして、tirith が使えないときはコマンドを止めてください。

tirith は Linux（x86_64 / aarch64）と macOS（x86_64 / arm64）向けにビルド済みのバイナリを配っています。ビルド済みのバイナリが無いプラットフォーム（Windows など）では、tirith は黙って飛ばされます。パターン照合の守りは動き続けますし、CLI に「使えません」という表示は出ません。Windows で tirith を使いたいときは、WSL の上で Hermes を動かしてください。

tirith の判定は承認の流れとつながっています。安全なコマンドはそのまま通り、あやしいものと危険なものはどちらも、tirith の指摘（深刻度、見出し、説明、より安全な代わりの方法）を添えて利用者の承認に回されます。利用者は承認も拒否もできますが、人がいない場面を安全に保つため、既定の選択は拒否です。

### コンテキストファイルへの注入対策 {#context-file-injection-protection}

コンテキストファイル（AGENTS.md、.cursorrules、SOUL.md）は、システムプロンプトに入れる前にプロンプトインジェクションがないか調べられます。検査するのは次のものです。

- それまでの指示を無視するように書かれた指示
- あやしい語を含む隠れた HTML のコメント
- 秘密（`.env`、`credentials`、`.netrc`）を読もうとする動き
- `curl` による認証情報の持ち出し
- 目に見えない Unicode の文字（ゼロ幅スペース、書字方向の上書き）

止められたファイルには警告が出ます。

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

## 本番運用のベストプラクティス {#best-practices-for-production-deployment}

### ゲートウェイを本番に置くときの確認事項 {#gateway-deployment-checklist}

1. **許可リストをはっきり決める** — 本番で `GATEWAY_ALLOW_ALL_USERS=true` は使わないでください
2. **コンテナのバックエンドを使う** — config.yaml で `terminal.backend: docker` を設定します
3. **資源の上限を絞る** — CPU、メモリ、ディスクに適切な上限を設定します
4. **秘密を安全に置く** — API キーは `~/.hermes/.env` に置き、ファイルの権限を正しく設定します
5. **DM のペアリングを使う** — できるかぎり、ユーザー ID を直接書かずにペアリングコードを使います
6. **許可したコマンドを見直す** — config.yaml の `command_allowlist` を定期的に点検します
7. **`terminal.cwd` を設定する** — 大事なディレクトリからエージェントを動かさないようにします
8. **root 以外で動かす** — ゲートウェイを root で動かさないでください
9. **ログを見る** — 認可されていないアクセスの試みがないか `~/.hermes/logs/` を確認します
10. **更新し続ける** — セキュリティの修正を取り込むため、`hermes update` を定期的に実行します

### API キーを守る {#securing-api-keys}

```bash
# Set proper permissions on the .env file
chmod 600 ~/.hermes/.env

# Keep separate keys for different services
# Never commit .env files to version control
```

### ネットワークを分ける {#network-isolation}

いちばん安全にしたいときは、ゲートウェイを別の端末か VM で動かします。`config.yaml` で `terminal.backend: ssh` を設定し、接続先の情報は `~/.hermes/.env` に環境変数として書きます。

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

SSH の接続情報は `config.yaml` ではなく `.env` に置きます。そうすればリポジトリに入りませんし、プロファイルを書き出して渡すときにも付いていきません。これで、ゲートウェイのメッセージングの接続と、エージェントのコマンド実行を分けて扱えます。

## サプライチェーンの注意情報の確認 {#supply-chain-advisory-checking}

Hermes には、使用中の仮想環境に入っている Python のパッケージが、乗っ取られたと分かっている版の一覧に当てはまらないか調べるしくみが入っています（2026年5月の `mistralai 2.4.6` の汚染のような、サプライチェーンを狙うものです）。実装は `hermes_cli/security_advisories.py` にあります。

動くタイミング:

- **CLI の起動時の表示。** 当てはまるものがあれば1行の警告が出て、直し方の全文は `hermes doctor` にある、と案内します。
- **`hermes doctor`。** 効いているすべての注意情報を、版の詳しい情報と2〜4段階の直し方とともに表示します。
- **ゲートウェイの起動時。** `gateway.log` に記録され、最初の対話のメッセージで運用者向けの短い表示が出ます。

注意情報にはそれぞれ変わらない ID が付いています。読んで対処したら、以後は消しておけます。

```bash
hermes doctor --ack <advisory-id>
```

この確認済みの記録は `config.security.acked_advisories` に保存され、再起動しても残ります。古い注意情報は意図して一覧から **消していません**。残しておくことで、社内のミラーにまだ残っているかもしれない、過去に汚染された版について、新しく入れた環境でも警告が出ます。

確認そのものは標準ライブラリだけで動き、注意情報ごとに `importlib.metadata.version()` を1回呼ぶだけなので、毎回の起動で実行しても差し支えありません。

### 任意の依存関係の遅延導入 {#lazy-install-of-optional-dependencies}

多くの機能（Mistral の TTS、ElevenLabs、Honcho のメモリ、Bedrock、Slack、Matrix など）は、全員が必要とするわけではない Python のパッケージに依存しています。Hermes はこれらを `hermes-agent[all]` でまとめて入れるのではなく、最初に使うときに **その場で** 入れます。実装は `tools/lazy_deps.py` にあります。

これで解けている問題:

- **壊れやすさ。** どこかの追加機能の依存先が PyPI から取れなくなると（マルウェアで隔離された、取り下げられた、アップロードが壊れた）、`[all]` の解決そのものが失敗し、新しく入れた環境が黙って機能の少ない構成に落ちていました。関係のない10以上の追加機能が一度に失われるということです。遅延導入は機能ごとに切り分けるので、汚染されたひとつの依存先が関係のない機能を壊すことはありません。
- **重さ。** ひとつのプロバイダーとしか話さない利用者が、一度も読み込まない何百ものパッケージを引っ張ってくることがなくなります。

しくみ:

1. バックエンドの部品が、最初に読み込まれる経路の先頭で `ensure("feature.name")` を呼びます。
2. 依存先が無ければ、`ensure` は `config.yaml` の `security.allow_lazy_installs`（既定は `true`）を確かめ、許可された指定について仮想環境の中だけで `pip install` を実行します。
3. 導入に失敗したとき、あるいは利用者が遅延導入を切っているときは、pip の実際のエラー出力と `hermes tools` への案内を添えて `FeatureUnavailable` を投げます。

`tools/lazy_deps.py` が守っていること:

| 保証 | 中身 |
|---|---|
| 仮想環境の中だけ | 導入先は使用中の仮想環境の `sys.executable` です。システムの Python には決して入れません |
| PyPI から名前で指定するだけ | 指定できるのは `"package>=1.0,<2"` の形だけです。`--index-url`、`git+https://`、file: のパスは使えないので、細工された `config.yaml` で導入先を差し替えることはできません |
| 許可リスト | この経路で入れられるのは、ツリーの中の `LAZY_DEPS` の対応表に載っている指定だけです。機能名を打ち間違えても、何でも入れられる状態にはなりません |
| 切ることもできる | `security.allow_lazy_installs: false` にすると、実行中の導入を丸ごと止められます。ネットワークが制限された環境や、厳しい方針の場面で役に立ちます |
| 黙った再試行はしません | 失敗は `FeatureUnavailable` として表に出ます。おかしな状態を覚え込むことも、再試行を繰り返すこともありません |

実行中の導入を止めるには、次のようにします。

```yaml
# ~/.hermes/config.yaml
security:
  allow_lazy_installs: false
```

止めているときは、任意の依存先が要るバックエンドが、手で導入する（`pip install …`）か `hermes tools` で別のバックエンドを選ぶよう利用者に伝えます。
