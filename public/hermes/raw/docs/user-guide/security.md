---
title: "セキュリティ"
description: "セキュリティモデル、危険なコマンドの承認、利用者の認可、コンテナによる隔離、本番運用のベストプラクティス"
upstream_path: user-guide/security.md
upstream_blob: 02fb4cd8c7a8d32221a901083f8092c3fc411143
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/security
---

# セキュリティ {#security}

Hermes Agent は、多層防御のセキュリティモデルで作られています。このページでは、コマンドの承認からコンテナによる隔離、メッセージングプラットフォームでの利用者の認可まで、すべてのセキュリティ境界を扱います。

## 概要 {#overview}

セキュリティモデルは 8 つの層でできています。

1. **利用者の認可** — 誰がエージェントと話せるか（許可リスト、DM のペアリング）
2. **危険なコマンドの承認** — 破壊的な操作に人の判断を挟む
3. **ファイル書き込みの安全装置** — `write_file`/`patch` に対する拒否リストと、任意で使える書き込みサンドボックス
4. **コンテナによる隔離** — Docker / Singularity / Modal によるサンドボックスと堅牢な設定
5. **MCP の資格情報のふるい分け** — MCP のサブプロセスに対する環境変数の隔離
6. **コンテキストファイルの走査** — プロジェクト内のファイルに対するプロンプトインジェクション検出
7. **セッション間の隔離** — セッションどうしは互いのデータや状態にさわれません。cron ジョブの保存先パスは、パストラバーサル攻撃に耐えるよう固めてあります
8. **入力の無害化** — ターミナルツールのバックエンドで受け取る作業ディレクトリの指定は、シェルインジェクションを防ぐために許可リストと照合されます

## 危険なコマンドの承認 {#dangerous-command-approval}

コマンドを実行する前に、Hermes はそれを危険なパターンの一覧と照らし合わせます。当てはまるものがあれば、利用者がはっきり承認しないかぎり実行されません。

### 承認のモード {#approval-modes}

承認のしくみには 3 つのモードがあり、`~/.hermes/config.yaml` の `approvals.mode` で設定します。

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
| `mode` | `smart` | 危険なシェルコマンドに対する承認の方針です。下の表を参照してください。 |
| `timeout` | `300` | 承認の返事を待つ秒数です。これを過ぎると時間切れになります。 |
| `cron_mode` | `deny` | [cron ジョブ](/hermes/docs/user-guide/features/cron/)が危険なコマンドの確認を出したとき、人がいない状態でどう振る舞うかです。`deny` はそのコマンドを止めます（エージェントは別の道を探すことになります）。`approve` は cron の文脈ですべて自動承認します。 |
| `single_query_mode` | `deny` | 一回きりの [`hermes chat -q`](/hermes/docs/user-guide/cli/) セッションが危険なコマンドの確認を出したときの振る舞いです。`-q` のセッションは 1 ターンだけ動いて終了し、確認に答える人はいません。`deny` はそのコマンドを止め（エージェントは別の道を探すことになります）、`approve` は単発クエリの文脈ですべて自動承認します。`cron_mode` と同じ考え方です。 |
| `unattended_mode` | `deny` | 人の付いていないプログラム的なプラットフォーム（webhook、msgraph_webhook、api_server）のセッションが危険なコマンドの確認を出したときの振る舞いです。こうした窓口には `/approve` に答えられる人がいないので、承認の時間切れまで待たずに、`deny` はそのコマンドをただちに止め（エージェントは別の道を探すことになります）、`approve` は無人の文脈ですべて自動承認します。`cron_mode` と同じ考え方です。 |
| `mcp_reload_confirm` | `true` | true のとき、`/reload-mcp` は MCP のツール一式を組み直す前に確認します。組み直すとプロバイダー側のプロンプトキャッシュが効かなくなるため（ツールのスキーマはシステムプロンプトに入っています）、次のメッセージで入力トークンを丸ごと送り直すことになります。**常に承認** を選ぶと、このキーが `false` に変わります。 |
| `destructive_slash_confirm` | `true` | true のとき、セッションを壊す種類のスラッシュコマンド（`/clear`、`/new`、`/reset`、`/undo`）は、会話の状態を捨てる前に確認します。3 択のダイアログ（今回だけ承認 / 常に承認 / 取り消し）で、Telegram、Discord、Slack では各プラットフォームの はい / いいえ ボタンを使い、それ以外ではテキストで代替します。**常に承認** を選ぶと、このキーが `false` に変わります。TUI も `/clear`、`/new`、`/reset` のダイアログでこの設定に従います。`HERMES_TUI_NO_CONFIRM=1` を立てると、設定値にかかわらずそのダイアログを飛ばします。 |

| モード | 振る舞い |
|------|----------|
| **smart**（既定） | 補助の LLM に危険度を判定させます。危険の少ないコマンド（たとえば `python -c "print('hello')"`）は、そのコマンドにかぎって自動承認されます。本当に危険なコマンドは自動で拒否されます。判断がつかないものは、人への確認に上げます。 |
| **manual** | 危険なコマンドでは必ず利用者に確認します。 |
| **off** | 承認の検査をすべて止めます。`--yolo` を付けて動かすのと同じです。どのコマンドも確認なしで実行されます。 |

:::warning
`approvals.mode: off` にすると、安全のための確認がすべて無くなります。信頼できる環境（CI/CD、コンテナなど）だけで使ってください。
:::

### YOLO モード {#yolo-mode}

YOLO モードは、いまのセッションで危険なコマンドの確認を **すべて** 飛ばします。有効にする方法は 3 つあります。

1. **CLI のフラグ**: `hermes --yolo` または `hermes chat --yolo` でセッションを開始する
2. **スラッシュコマンド**: セッション中に `/yolo` と打って切り替える
3. **環境変数**: `HERMES_YOLO_MODE=1` を設定する

`/yolo` コマンドは **切り替え** です。使うたびに入 / 切が反転します。

```
> /yolo
  ⚡ YOLO mode ON — all commands auto-approved. Use with caution.

> /yolo
  ⚠ YOLO mode OFF — dangerous commands will require approval.
```

YOLO モードは CLI でもゲートウェイのセッションでも使えます。内部では `HERMES_YOLO_MODE` 環境変数を立てており、コマンドを実行するたびにこれが確認されます。

YOLO が有効なあいだ、確認が飛ばされていることを忘れにくいように、Hermes は 2 つの表示を出し続けます。

- すでに YOLO が有効な状態でセッションを始めたときに出る、赤い帯の行です: `⚠ YOLO mode — all approval prompts bypassed`。YOLO が切のときは出ないので、ふだんの表示はすっきりしたままです。
- ステータスバーに出る `⚠ YOLO` の表示です。どの幅でも表示され、YOLO を切り替えるとその場で変わります（リッチテキストの描画でも、プレーンテキストの代替でも同じです）。

:::danger
YOLO モードは、そのセッションで危険なコマンドの安全確認を **すべて** 止めます。ただし後述の絶対禁止リストだけは **例外** です。生成されるコマンドを完全に信頼できるときだけ使ってください（たとえば、使い捨ての環境で走らせる、十分に試した自動化スクリプトなど）。
:::

セッションを壊す種類のスラッシュコマンド（`/clear`、`/new` / `/reset`、`/undo`、`/quit --delete` — `/exit --delete` は別名）については、CLI も実行前に確認を出します。[スラッシュコマンド — 破壊的なコマンドの確認](/hermes/docs/reference/slash-commands/#confirmation-prompts-for-destructive-commands)を参照してください。

### 監視下のゲートウェイに対するライフサイクル制限 {#supervised-gateway-lifecycle-restriction}

ターミナルツールには、監視下にある自分自身のプロセスの中からゲートウェイを
止めたり再起動したりすることを防ぐ、上書きできない別の防護があります。自分で
自分を再起動すると、ツールが終わりきる前に落ちてしまい、監視役による自動再開の
ループを招きかねません。利用者の承認も、YOLO モードも、`force=True` も、この
防護は素通りできません。

この防護は、ゲートウェイが動いているインタープリターのイメージを狙ったプロセス
終了にも働きます。`taskkill /F /IM python.exe`、`taskkill /FI "IMAGENAME eq python.exe"`、
`Stop-Process -Name python`、`pkill -9 python3`、`killall python`、`pkill -f python`、
さらに `pgrep python | xargs kill` のように名前から導く終了もそうです。監視下の
ゲートウェイは文字どおり `python` のプロセスなので、こうしたコマンドはゲートウェイ
（とエージェント自身のターン）まで道連れにします。エージェントが持っている
プロセスに絞った終了は通ります。バックグラウンドジョブの `proc_*` の id
（`process(action="kill", …)`）や、明示した PID（`taskkill /F /PID <pid>`、`kill <pid>`）が
それにあたります。別のイメージ名（`taskkill /F /IM notepad.exe`）は影響を受けません。
この防護は、生成されるどの起動方式でも働きます。systemd のユニット、launchd の plist、
s6 の run スクリプト、Windows のタスク スケジューラのいずれも、
`HERMES_SUPERVISED_CHILD` の印を出すためです。

macOS では、実行される `launchctl submit` と `launchctl bootstrap` のコマンドが
**ジョブのラベルに関係なく** 制限されます。これは、当たり障りのないラベルを付けた
間接的な再起動の仕掛けを捕まえるための、控えめな登録の制限であって、対象の plist を
調べているわけではありません。`RunAtLoad=false` で `KeepAlive` のキーを持たない、
独立したスケジュールジョブも拒否されます。拒否されたことは、そのジョブが KeepAlive を
使っているとか、Hermes を制御しているとかいう **証拠にはなりません**。

許可された LaunchAgent の保守作業は、動いているゲートウェイの外にある別のシェルで
行ってください。独立した `load`/`unload` のコマンドの中には、いまのところラベルに
基づく検査を通るものもありますが、それは対象を確かめたうえでの例外ではありませんし、
`bootstrap` の拒否を回避してよいという意味でもありません。読み取りだけの
`launchctl print` は、ライフサイクルの操作にはあたりません。外での保守作業のあとは、
ディスク上の plist と読み込み済みのジョブを区別してください。plist を検証し、
読み込まれているスケジュールを読み返してから、有効になったと報告することです。

ツールが拒否したということは、そのツール呼び出しではコマンドが実行されなかった、
という意味です。アシスタントが呼び出し自体を控えるのは、モデル側の別の判断です。
モデルを変えても、ターミナル側の防護の方針は変わりません。

### 絶対禁止リスト（つねに効く床） {#hardline-blocklist-always-on-floor}

取り返しのつかないファイルシステムの消去、フォーク爆弾、ブロックデバイスへの直接書き込みなど、あまりに壊滅的なコマンドについては、Hermes は次のいずれであっても実行を **拒否** します。

- `--yolo` / `/yolo` が入っている
- `approvals.mode: off` になっている
- cron ジョブが人のいない `approve` モードで動いている
- 利用者がはっきり「常に許可」を押した

この禁止リストは `--yolo` のさらに下にある床です。承認の層がコマンドを見るよりも **前** に働き、上書きするフラグはありません。いま対象になっているパターンは次のとおりです（すべてではありません。`tools/approval.py::UNRECOVERABLE_BLOCKLIST` と同期しています）。

| パターン | 絶対禁止の理由 |
|---|---|
| `rm -rf /` と、その明らかな変種 | ファイルシステムの根元を消し去ります |
| `rm -rf --no-preserve-root /` | 「本当に根元でいい」と明示した変種です |
| `:(){ :\|:& };:`（bash のフォーク爆弾） | 再起動するまでホストを占拠します |
| マウント済みのルートデバイスへの `mkfs.*` | 動いているシステムを初期化します |
| `dd if=/dev/zero of=/dev/sd*` | 物理ディスクをゼロで埋めます |
| 信頼できない URL をルートファイルシステムの最上位で `sh` に流し込む | 遠隔からのコード実行の入口として、承認するには広すぎます |

禁止リストに当たると、ツール呼び出しは理由を説明するエラーをエージェントに返し、何も実行されません。まっとうな作業でこうしたコマンドが必要な場合（消去して入れ直す仕組みを運用している、など）は、エージェントの外で実行してください。

この床は、シェルの引用符が解釈できないコマンド（`grep 'unterminated`）でも閉じる側に倒れます。エラーには `malformed executable payload` と出ます。引用符の判定は書かれたとおりのコマンドに対して行うので、引用符で囲まれたパターンの中にあるシェルとして正しいエスケープ（`grep -o "[^\"]*" file`）は壊れているとは見なされませんし、区切りの前にエスケープされた引用符があっても（`echo "a\"b"; reboot`）、その後ろのコマンドが隠れることはありません。

### 利用者が定義する拒否ルール（`approvals.deny`） {#user-defined-deny-rules-approvalsdeny}

絶対禁止リストは固定で、コードとともに出荷されます。`approvals.deny` は、その利用者が編集できる版です。当てはまるターミナルのコマンドを無条件で止めるグロブパターンの一覧で、`--yolo`、`/yolo`、`approvals.mode: off` より **前** に効きます。「これだけは絶対にさせない」という例外付きの yolo 運用に使えます。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
    - "dd if=* of=/dev/*"
```

詳しく見ていきます。

- パターンは [fnmatch](https://docs.python.org/3/library/fnmatch.html) のグロブ（`*`、`?`、`[...]`）で、コマンド全体の文字列と、実行されうるコマンドの候補それぞれに対して **大文字小文字を区別せず** 照合されます。`git push --force*` は `git push --force origin main` に当たりますが、`git push origin main` には当たりません。
- 照合は、危険パターンの検出器が使うのと同じ、正規化して難読化を解いたコマンドの変種に対しても走ります。そのため、引用符を使った単純なごまかし（`git pu""sh --force`）ではルールをすり抜けられません。
- 実行されうる候補は、書かれたパスをそのまま保ちつつ、その末尾のファイル名にも当たります。`sudo *` は `/usr/bin/sudo -n id` と `./sudo -n id` の両方を覆います。`/usr/bin/sudo *` のようにパスまで指定したルールが、`sudo` という名前のすべてのバイナリに対するルールに **なることはありません**。
- 引用符を踏まえた解析により、変数の代入や先頭のリダイレクトのあと、`;`、`&&`、`||`、パイプ、グループ、コマンド置換、それに `if`/`then`/`else`/`do` のふつうの切り替わりの先にあるコマンドも見えるようになります。対応している起動役には `sudo`、`env`、`command`、`exec`、`nohup`、`setsid`、`time`、`nice`、`timeout`、`stdbuf`、`ionice`、`chrt`、`taskset`、`chroot` が含まれます。既知のオプションの引数は読み飛ばします。`command -v`/`-V` による検索は実行ではありません。シェルの `-c` に渡される中身は再帰的に調べます。`env -S` / `--split-string` の中に文字どおり書かれた実行ファイルと引数の文字列は、GNU 式の引用符とエスケープ（`\_` による語の区切りや `\c` による打ち切りを含みます）として読み、残りのコマンド引数を後ろに付けます。その引数の中にあるシェルの記号は、実際にシェルの `-c` がそれを受け取らないかぎりデータのままです。`env -a` / `--argv0` の値は引数であって、実行ファイル名ではありません。シェルと GNU の split-string のコメントからは、実行の候補は生まれません。
- 追加で拾う実行候補では、語と語の **あいだ** の空白はまとめられますが、引用符の中身と引数のパスはそのまま残ります。そのため `git status` という厳密なルールは、`env git\tstatus; echo done` にも当たります（`\t` はタブを表します）。`echo 'sudo -n id'` のように引用符の中で言及しただけのものは、コマンドには格上げされません。`*sudo*` のような入力全体に対する従来のグロブは、これまでどおりどこに出てきても当たります。
- **YAML の引用符について:** パターンは必ず引用符で囲んでください。先頭が裸の `*` だと YAML のエイリアスと解釈されて読み込みに失敗します。`{`、`!`、`: ` にも YAML 上の意味があります。シェル寄りの中身には、シングルクォートがいちばん安全です。
- 利用者が定義した拒否ルールは、隔離されたコンテナも含めてすべてのターミナルのバックエンドに、バックエンド固有の承認の近道より前に適用されます。
- 拒否されたコマンドは、やり直したり言い換えたりしないようにという BLOCKED エラーをエージェントに返します。何も実行されません。

承認まわりの他の設定と同じく、変更はすぐ効きます（設定のキャッシュは更新時刻で管理されています）。セッションを開き直す必要はありません。

:::note 想定する脅威
拒否ルールはシェルコマンドに対する方針であって、完全なシェルの解釈器でも、OS の権限を囲うサンドボックスでもありません。正規化は、任意の変数（GNU の `env -S` における `${NAME}` の展開を含みます）、別名、関数、名前を変えたバイナリ、スクリプト、インタープリターのプログラム、そしてあらゆるシェル・起動役の文法（たとえば case のパターン構文、まとめて書いた起動役のオプション、`env -S` の文字列に埋め込まれたオプションなど）までは解決しません。ファイル名だけの拒否ルールを、その機能に他の手段で到達できない保証として使わないでください。閉じ込めたい場合は、OS の権限と、マウント・資格情報・ネットワークを適切に絞った隔離バックエンドを使ってください。ここでの照合の振る舞いは、設定した承認モードや、拒否リストが空という既定を変えるものではありません。
:::

### 承認の時間切れ {#approval-timeout}

危険なコマンドの確認が出ると、利用者には設定した長さの時間が与えられます。その時間内に返事がないと、そのコマンドは既定で **拒否** されます（閉じる側に倒れます）。

時間切れになった確認は開き直せません。保留中の項目は捨てられ、エージェントにはそのターンの中で勝手にやり直さないよう伝えられます。やはり実行したい場合は、あらためて頼むメッセージを送ってください（たとえば「さっきのをいま実行して」）。エージェントは新しくツールを呼び、新しい承認のカードが出ます。「今回だけ」の承認はその呼び出しにだけ効きます。時間切れは拒否として数えられないので、もう一度頼んでも不利にはなりません。

時間は `~/.hermes/config.yaml` で設定します。

```yaml
approvals:
  timeout: 300  # seconds (default: 300)
```

### 何が承認の対象になるか {#what-triggers-approval}

次のパターンが承認の確認を出します（`tools/approval.py` で定義されています）。

| パターン | 説明 |
|---------|-------------|
| `rm -r` / `rm --recursive` | 再帰的な削除 |
| `rm ... /` | ルートパスでの削除 |
| `chmod 777/666` / `o+w` / `a+w` | 誰でも書き込める権限 |
| 危険な権限を伴う `chmod --recursive` | 誰でも書き込める権限を再帰的に付与（長い形式のフラグ） |
| `chown -R root` / `chown --recursive root` | root への再帰的な所有者変更 |
| `mkfs` | ファイルシステムの初期化 |
| `dd if=` | ディスクの複製 |
| `> /dev/sd` | ブロックデバイスへの書き込み |
| `DROP TABLE/DATABASE` | SQL の DROP |
| `DELETE FROM`（WHERE なし） | WHERE を付けない SQL の DELETE |
| `TRUNCATE TABLE` | SQL の TRUNCATE |
| `> /etc/` | システム設定の上書き |
| `systemctl stop/restart/disable/mask` | システムのサービスの停止・再起動・無効化 |
| `kill -9 -1` | すべてのプロセスの終了 |
| `pkill -9` | プロセスの強制終了 |
| フォーク爆弾のパターン | フォーク爆弾 |
| `bash -c` / `sh -c` / `zsh -c` / `ksh -c` | `-c` フラグによるシェルコマンドの実行（`-lc` のような組み合わせも含みます） |
| `python -e` / `perl -e` / `ruby -e` / `node -c` | `-e`/`-c` フラグによるスクリプトの実行 |
| `curl ... \| sh` / `wget ... \| sh` | 遠隔から取得した内容をシェルに流し込む |
| `bash <(curl ...)` / `sh <(wget ...)` | プロセス置換による遠隔スクリプトの実行 |
| `/etc/`、`~/.ssh/`、`~/.hermes/.env` への `tee` | tee による重要なファイルの上書き |
| `/etc/`、`~/.ssh/`、`~/.hermes/.env` への `>` / `>>` | リダイレクトによる重要なファイルの上書き |
| `xargs rm` | xargs と rm の組み合わせ |
| `find -exec rm` / `find -delete` | find に破壊的な動作を組み合わせたもの |
| `/etc/` への `cp`/`mv`/`install` | システム設定へのファイルの複製・移動 |
| `/etc/` に対する `sed -i` / `sed --in-place` | システム設定のその場での書き換え |
| hermes / gateway に対する `pkill`/`killall` | 自分自身を終了させないための防止 |
| `&`/`disown`/`nohup`/`setsid` を伴う `gateway run` | サービス管理の外でゲートウェイを起動させないための防止 |
| `docker stop/kill/restart`、`docker compose down/stop/kill/restart` | コンテナのライフサイクル（全体オプションや `docker-compose` も拾います） |
| `docker -H`/`--host`/`--context`、`DOCKER_HOST=`/`DOCKER_CONTEXT=` | Docker のデーモンの向き先変更 — 別の（多くは遠隔の）デーモンを相手にするコマンドです |
| `docker context use` | 以降のすべての docker コマンドの既定のデーモンを切り替えます |
| `podman --remote`/`-r`/`--url`/`--connection`/`--identity`、`CONTAINER_HOST=` | Podman の遠隔デーモンへの向き先変更 |

:::info
**コンテナでの省略**: `docker`、`singularity`、`modal`、`daytona`、`vercel_sandbox` のバックエンドで動いているときは、コンテナそのものがセキュリティの境界になるため、危険なコマンドの検査は **飛ばされます**。コンテナの中の破壊的なコマンドは、ホストを傷つけられません。
:::

### 承認の流れ（CLI） {#approval-flow-cli}

対話型の CLI では、危険なコマンドはその場で承認の確認を出します。

```
  ⚠️  DANGEROUS COMMAND: recursive delete
      rm -rf ~/old-project

      [o]nce  |  [s]ession  |  [a]lways  |  [d]eny

      Choice [o/s/a/D]:
```

4 つの選択肢があります。

- **once** — この 1 回だけ実行を許します
- **session** — このセッションのあいだ、このパターンを許します
- **always** — 恒久的な許可リストに加えます（`config.yaml` に保存されます）
- **deny**（既定） — コマンドを止めます

### 承認の流れ（ゲートウェイ / メッセージング） {#approval-flow-gatewaymessaging}

メッセージングのプラットフォームでは、エージェントが危険なコマンドの詳細をチャットに送り、利用者の返事を待ちます。

- 承認するときは **yes**、**y**、**approve**、**ok**、**go** のいずれかを返します
- 拒否するときは **no**、**n**、**deny**、**cancel** のいずれかを返します

ゲートウェイを動かすと、`HERMES_EXEC_ASK=1` 環境変数が自動で設定されます。

### 恒久的な許可リスト {#permanent-allowlist}

「always」で承認したコマンドは `~/.hermes/config.yaml` に保存されます。

```yaml
# Permanently allowed dangerous command patterns
command_allowlist:
  - rm
  - systemctl
```

これらのパターンは起動時に読み込まれ、以降のセッションでは黙って承認されます。

書けるのは、コマンドそのものの文字列、シェル式のグロブ（`podman *`）、あるいは `script execution via heredoc` のような危険パターンのルールキー（承認の確認に表示される見出し）です。ルールキーはどの窓口でも尊重されます。人のいない窓口でも同じで、`cron_mode`/`single_query_mode`/`unattended_mode: deny` のもとで動く cron ジョブ、`hermes chat -q` の実行、webhook のセッションであっても、検出されたルールキーが `command_allowlist` にあるコマンドは実行されます。同じコマンドに対する Tirith のコンテンツ検査の指摘は、引き続きそれを止めます。

この設定は文字列の一覧でなければなりません。一覧を引用符付きの YAML/JSON 文字列として保存していた古い環境では、読み込み時にその一覧を復元し、`hermes config edit` で保存し直すよう警告を出します。それ以外の壊れた値は警告を出して無視されます。1 文字ずつの承認に化けることは決してありません。読み込みによって設定ファイルが書き換わることもありません。

:::tip
恒久的な許可リストの中身を見直したり消したりするには `hermes config edit` を使ってください。
:::

:::caution
この一覧は Hermes の起動時に読まれます。セッションが動いているあいだに消したパターンは、そのセッションの中では、次にファイルが書かれるまで（次に確認へ `always` と答えるまで）、あるいは Hermes を再起動するまで承認されたままです。安全のために消したのであれば、再起動してください。
:::

### 承認の履歴から掘り起こす（`hermes approvals suggest`） {#mining-approval-history-hermes-approvals-suggest}

毎回同じ確認に答える代わりに、これまでの承認の判断から許可リストの案を掘り起こせます。

```bash
hermes approvals suggest            # dry run — prints a numbered proposal
hermes approvals suggest --apply 1,3  # merge picks into command_allowlist
hermes approvals suggest --json     # machine-readable output
```

このコマンドはセッションのデータベース（`~/.hermes/state.db`）を調べ、危険と判定されたうえで実際に実行されたコマンド、つまり承認したコマンドを集めてパターンにまとめ（`git push *` や、複合コマンドなら危険分類のキー）、承認された回数の多い順に並べます。

```
Proposed command_allowlist additions (from approval history, last 90 days):

  1. git push *    — approved 14x
  2. docker restart/stop/kill (container lifecycle)    — approved 9x (class key)
```

安全のための決まりごとです。

- **自動で適用されることは決してありません。** 既定の実行は読み取りだけで、
  `--apply N[,M...]` をはっきり指定したときだけ `config.yaml` に書き込みます。
- **破壊的な分類は、どれだけ承認されていても提案されません。** 再帰的な削除、
  `sudo`、ディスクやデバイスへの書き込み、資格情報やシステム設定の書き換え、
  シェルへの流し込み、SQL の DROP/TRUNCATE、プロセスの終了、そして絶対禁止の
  分類はすべて最初から外されます。`rm -rf build/` を 100 回承認していても、
  `rm` の項目が出てくることはありません。
- すでに `command_allowlist` で覆われている提案は飛ばされます。
- **掘り起こしたコマンドの中の資格情報は伏せられます**（`ghp_…`、
  `bot<id>:<token>` の URL、`KEY=value` の代入、bearer トークン）。表示される
  `e.g.` の例でも `--json` の出力でも、ターミナル出力と同じ伏せ字処理を使います。
  伏せた文字列が許可リストのパターンとして使われることはありません。グロブに
  資格情報が入り込んでしまうコマンド（`TOKEN=… git …`）は、代わりに危険分類の
  キーで提案されます。セッションのデータベース自体には、実行されたときのままの
  コマンドが残ります。

便利なフラグとして `--days N`（履歴の範囲、既定 90）、`--min-count N`（対象にする最低の承認回数、既定 2）、`--limit N`、`--db PATH` があります。

## ファイル書き込みの安全装置 {#file-write-safety}

`write_file` や `patch` がディスクにさわる前に、Hermes は書き込み先のパスを拒否リストと、任意で設定するサンドボックスに照らします。止められた書き込みは、すぐにエラーとしてエージェントに返ります。**承認の確認は出ませんし**、チャットの画面から上書きする手段もありません。それでもモデルは編集に成功したと言うことがあります。`display.file_mutation_verifier` が入っているとき（既定）は、アシスタントの締めくくりの要約より[ファイル変更の検証フッター](/hermes/docs/user-guide/configuration/#file-mutation-verifier)を信じてください。

### 保護されたパス（つねに拒否） {#protected-paths-always-blocked}

次の種類は、`HERMES_WRITE_SAFE_ROOT` を設定していなくてもつねに拒否されます。

| 種類 | 例 |
|----------|----------|
| OS の資格情報の保管場所 | `~/.ssh/`（鍵、`authorized_keys`）、`~/.aws/`、`~/.kube/`、`/etc/sudoers`、`~/.netrc` |
| Hermes の秘密情報の保管場所 | HERMES_HOME 配下（有効なプロファイルと全体の root の両方）の `.env`、`.anthropic_oauth.json`、`auth/google_oauth.json`、Bitwarden のキャッシュ（`cache/bws_cache.json`、`cache/bws_cache.enc.json`）、`vault/`、`browser-profile/`、`mcp-tokens/`、`pairing/`。制御用のファイル（`auth.json`、`config.yaml`、`webhook_subscriptions.json`）は読み取りが拒否されますが、書き込みはできます。 |
| Windows の NT / デバイス名前空間のパス | `\??\...`、`\\.\...`、`\\?\UNC\...`、`\\?\GLOBALROOT...` — どのプラットフォームでも、読み取りも書き込みも拒否されます。Windows では、こうしたパスを *解決するだけ* で（たとえば `\??\UNC\host\share`）外向きの SMB 認証が走り、利用者の NTLM ハッシュが漏れることがあります。これらの接頭辞は、ふつうのパス正規化も回避します。ふつうの長いローカルパス（`\\?\C:\...`）や素の UNC 共有（`\\server\share`）は影響を受けません。 |

プロジェクトの中にある `.env`、`.env.local`、`.env.production`、`.envrc` は、ディスク上のどこにあっても **読み取りが拒否** されますが（ファイル系のツールは読み取りを断ります）、書き込みはできます。エージェントは代わりに作ったり編集したりできて、ただ中身を読み返せない、ということです。

安全なルートの内側にあっても、重要なパスは止められたままです。`HERMES_WRITE_SAFE_ROOT` を `$HOME` に向けても、`~/.ssh/id_rsa` に書けるようにはなりません。

OS の資格情報の行にある `~` は、プロセスの `HOME` だけでなく、書き込みが着地しうる *すべての* ホームを指します。OS 利用者の本当のホーム、プロファイルのホーム（`TERMINAL_HOME_MODE=profile` のときの `{HERMES_HOME}/home`、およびコンテナや生成されたワーカーで、プロセスの `HOME` が固定されている場合）、そして名前付きのアカウント（`~root/.ssh/authorized_keys`）です。本当のホームの `~/.aws/credentials` を絶対パスで指した場合、エージェントのプロセスが `HOME` を別の場所に向けて動いていても拒否されます。

安全なルートの違反は `Write denied: '…' is outside HERMES_WRITE_SAFE_ROOT (…)` を返します。資格情報のパスを止めた場合は `Write denied: '…' is a protected system/credential file.` です。

**例外 — `~/.ssh/config` は完全な拒否ではなく、承認をはさみます。** SSH の
*クライアント設定* には秘密鍵そのものは入っておらず、これを編集する作業
（ホストの別名、`ProxyJump`、VS Code Remote-SSH の接続先）はよくあることです。
そこで `write_file` / `patch` は、以前のような一律の拒否ではなく、ターミナル
ツールが `~/.ssh` への書き込みで使っているのと同じ「今回だけ / セッション中 /
常に」の確認を通します。それでも `ProxyCommand` や `Match exec` のような、
コマンドを実行する指定を書き込めるので、この書き込みが黙って通ることはありません。
対話できない呼び出し元（ACP のファイル橋渡し、人のいないバックグラウンドの
ジョブ）は閉じる側に倒れます。秘密鍵、`authorized_keys`、そのほか `~/.ssh/`
配下のものは、これまでどおり完全に拒否されます。

### HERMES_WRITE_SAFE_ROOT（任意のサンドボックス） {#hermeswritesaferoot-optional-sandbox}

設定すると、`write_file` と `patch` は挙げたディレクトリの下だけを対象にできます。その外は **完全に拒否** され、危険なコマンドの承認には回りません。

- [公式の Docker イメージ](https://github.com/NousResearch/hermes-agent)では自動で設定されます（`HERMES_WRITE_SAFE_ROOT=/opt/data`）
- Unix では `:`、Windows では `;` で区切って複数のルートを指定できます
- **軽い気持ちで `~/.hermes/.env` に足さないでください。** プロジェクトのディレクトリに設定すると、エージェントは `~/.hermes/cron/jobs.json` やプロファイルのスキル、その接頭辞の外にある他の Hermes の状態に書けなくなります

作業場所と Hermes のホームの両方を許すには、次のようにします。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

この変数を外すと、書き込みの制限は元に戻ります（保護されたパスの拒否リストは引き続き効きます）。詳しくは [HERMES_WRITE_SAFE_ROOT](/hermes/docs/reference/environment-variables/#hermes_write_safe_root) を参照してください。

### cron などの Hermes の状態 {#cron-and-other-hermes-state}

`~/.hermes/cron/jobs.json` を直接 `patch` するようエージェントに頼まないでください。`cronjob_manage` ツール、[`hermes cron`](/hermes/docs/user-guide/features/cron/)、`/cron` を使ってください。これらは正式な API を通してジョブの保存先を更新します。書き込みの安全装置が直接の編集を止めるとき、他の Hermes の制御用ファイルについても同じことが言えます。

:::note 多層防御であって、固い境界ではありません
書き込みの防護が効くのは `write_file` と `patch` だけです。ただし 1 つ例外があり、Windows の NT / デバイス名前空間の行は読み取りにも適用されます。`read_file`、`search_files`、`@file:`/`@folder:` のコンテキスト参照、ACP のファイル橋渡しのいずれも、解決する前の生の文字列の段階でそうしたパスを断ります。`terminal` ツールは同じ OS 利用者として動くので、シェルのコマンド経由なら拒否されたパスを `cat` したり上書きしたりできます。この拒否リストは、うっかりの被害を減らし、モデルにはっきりした停止の合図を与えるものであって、敵意のある、あるいは乗っ取られたエージェントを閉じ込めるものではありません。
:::

## 利用者の認可（ゲートウェイ） {#user-authorization-gateway}

メッセージングのゲートウェイを動かすとき、Hermes は段階的な認可のしくみで、誰がボットとやりとりできるかを決めます。

### 認可を確かめる順番 {#authorization-check-order}

`_is_user_authorized()` メソッドは次の順に確かめます。

1. **プラットフォームごとの全員許可フラグ**（たとえば `DISCORD_ALLOW_ALL_USERS=true`）
2. **DM ペアリングで承認した一覧**（ペアリングコードで承認した利用者）
3. **プラットフォームごとの許可リスト**（たとえば `TELEGRAM_ALLOWED_USERS=12345,67890`）
4. **全体の許可リスト**（`GATEWAY_ALLOWED_USERS=12345,67890`）
5. **全体の全員許可**（`GATEWAY_ALLOW_ALL_USERS=true`）
6. **既定: 拒否**

### プラットフォームごとの許可リスト {#platform-allowlists}

許可する利用者 ID を、`~/.hermes/.env` にコンマ区切りで書きます。

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

全体の全員許可は `config.yaml` に `gateway.allow_all_users: true`（またはいちばん上の階層に `allow_all_users: true`）として書くこともできます。true のときはゲートウェイの起動時に `GATEWAY_ALLOW_ALL_USERS` へ橋渡しされ（設定の読み込みと再起動のたびに導出し直すので、`false` に戻せば入口は閉じます）、環境変数を明示していればそちらが優先され、ゲートウェイは許可の出どころが `config.yaml` であることを名指しした警告を記録します。複数プロファイルのゲートウェイでは、二次のプロファイルは自分の `.env` に `GATEWAY_ALLOW_ALL_USERS` を書きます（そちらの `config.yaml` がプロセスの環境変数に橋渡しされることはありません）。

:::warning
**許可リストがひとつも設定されておらず**、`GATEWAY_ALLOW_ALL_USERS` も立っていない場合、**すべての利用者が拒否されます**。ゲートウェイは起動時に警告を記録します。

```
No user allowlists configured. All unauthorized users will be denied.
Set GATEWAY_ALLOW_ALL_USERS=true in ~/.hermes/.env to allow open access,
or configure platform allowlists (e.g., TELEGRAM_ALLOWED_USERS=your_id).
```
:::

### DM のペアリング {#dm-pairing-system}

もっと柔軟に認可したい場合のために、Hermes にはコードを使ったペアリングのしくみがあります。あらかじめ利用者 ID を集めておく代わりに、知らない利用者に 1 回かぎりのペアリングコードを渡し、ボットの持ち主が CLI で承認します。

**流れはこうです。**

1. 知らない利用者がボットに DM を送る
2. ボットが 8 文字のペアリングコードを返す
3. ボットの持ち主が CLI で `hermes pairing approve <platform> <code>` を実行する
4. その利用者が、そのプラットフォームで恒久的に承認される

認可していない相手からの DM をどう扱うかは、`~/.hermes/config.yaml` で決めます。

```yaml
unauthorized_dm_behavior: pair

whatsapp:
  unauthorized_dm_behavior: ignore
```

- チャット型の DM プラットフォームでは `pair` が既定です。認可していない DM にはペアリングコードを返します。
- `ignore` は、認可していない DM を黙って捨てます。
- `decline` は、ペアリングコードの代わりに短く丁寧な断り（「持ち主としか話せません」）を 1 回だけ送り、その後 24 時間はその送り主からのメッセージを無視します。文面は `unauthorized_dm_decline_message` で変えられます。
- メールは既定が `ignore` です（`platforms.email.unauthorized_dm_behavior: pair` を書いた場合を除きます）。受信箱には関係のない未読が入っていることがあるためです。
- プラットフォームごとの設定が全体の既定を上書きするので、Telegram ではペアリングを使いつつ、WhatsApp は黙らせておく、といったこともできます。

**安全のためのしくみ**（OWASP と NIST SP 800-63-4 の指針に基づきます）

| 項目 | 内容 |
|---------|---------|
| コードの形式 | 紛らわしい文字を除いた 32 文字（0/O/1/I なし）から 8 文字 |
| 乱数 | 暗号論的に安全なもの（`secrets.choice()`） |
| コードの有効期間 | 1 時間で失効 |
| 回数の制限 | 利用者ごとに 10 分あたり 1 回 |
| 保留の上限 | プラットフォームごとに保留中のコードは最大 3 件 |
| 締め出し | 承認の失敗が 5 回で 1 時間の締め出し |
| ファイルの保護 | ペアリングのデータファイルはすべて `chmod 0600` |
| ログ | コードが標準出力に記録されることはありません |

**ペアリングの CLI コマンド**

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

:::tip Docker を使っている場合: ペアリングのコマンドは `hermes` ユーザーで実行してください
公式の Docker イメージは、`gosu` を使って権限の低い `hermes` ユーザー（uid 10000）で
ゲートウェイを動かしますが、`docker exec` は既定で root になります。root が作った
承認のファイルは `0600 root:root` で書かれるためゲートウェイが読めず、承認は
黙って無視されます（[#10270][i10270]）。

必ず `-u hermes` を付けてください。

```bash
docker exec -u hermes hermes-agent hermes pairing approve telegram ABC12DEF
```

すでに root で実行してしまい、利用者が認可されないままなら、コンテナを再起動して
ください。次回の起動時に、入口のスクリプトが所有者を直します。

[i10270]: https://github.com/NousResearch/hermes-agent/issues/10270
:::

**保存場所:** ペアリングのデータは `~/.hermes/pairing/` に、プラットフォームごとの JSON ファイルとして保存されます。
- `{platform}-pending.json` — 保留中のペアリング要求
- `{platform}-approved.json` — 承認済みの利用者
- `_rate_limits.json` — 回数の制限と締め出しの記録

## コンテナによる隔離 {#container-isolation}

`docker` のターミナルバックエンドを使うとき、Hermes はすべてのコンテナに厳しい防護を施します。

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
    # no-tmp: ok — configures the sandbox's own tmpfs
    "--tmpfs", "/tmp:rw,nosuid,size=512m",         # Size-limited /tmp
    "--tmpfs", "/var/tmp:rw,noexec,nosuid,size=256m",  # No-exec /var/tmp
]
```

`SETUID`/`SETGID` は基本の一覧に **入っていません**。コンテナが root で始まり、init や入口のスクリプトが権限を落とす必要があるとき（s6 の権限降格の経路）にだけ、条件付きで足されます。コンテナがすでに root 以外の `--user` で動いている場合は付きません。`/run` の tmpfs も基本の一覧から切り出され、イメージごとにマウントされます（既定では `noexec` で固め、`/run` から実行する s6-overlay のイメージのときだけ `exec` にします）。

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

### ファイルシステムの持続 {#filesystem-persistence}

- **持続モード**（`container_persistent: true`）: `~/.hermes/sandboxes/docker/<task_id>/` から `/workspace` と `/root` をバインドマウントします
- **使い捨てモード**（`container_persistent: false`）: 作業場所に tmpfs を使うので、後片付けですべて消えます

:::tip
本番のゲートウェイ運用では、`docker`、`modal`、`daytona`、`vercel_sandbox` のバックエンドを使って、エージェントのコマンドをホストから切り離してください。そうすれば、危険なコマンドの承認そのものが要らなくなります。
:::

:::warning
`terminal.docker_forward_env` に名前を足すと、その変数は意図してコンテナのターミナルコマンドに渡されます。`GITHUB_TOKEN` のような作業ごとの資格情報には便利ですが、コンテナの中で動くコードがそれを読み出して外へ持ち出せる、ということでもあります。
:::

## ターミナルバックエンドのセキュリティ比較 {#terminal-backend-security-comparison}

| バックエンド | 隔離 | 危険コマンドの検査 | 向いている用途 |
|---------|-----------|-------------------|----------|
| **local** | なし — ホスト上で動きます | ✅ あり | 開発、信頼できる利用者 |
| **ssh** | 別のマシン | ✅ あり | 別のサーバーで動かす場合 |
| **docker** | コンテナ | ❌ 飛ばします（コンテナが境界） | 本番のゲートウェイ |
| **singularity** | コンテナ | ❌ 飛ばします | HPC の環境 |
| **modal** | クラウドのサンドボックス | ❌ 飛ばします | 伸縮するクラウドでの隔離 |
| **daytona** | クラウドのサンドボックス | ❌ 飛ばします | 残しておけるクラウドの作業場所 |
| **vercel_sandbox** | クラウドのマイクロ VM | ❌ 飛ばします | スナップショットを残せるクラウド実行 |

## 環境変数の受け渡し {#environment-variable-passthrough}

`execute_code` と `terminal` はどちらも、LLM が書いたコードによる資格情報の持ち出しを防ぐため、子プロセスから重要な環境変数を取り除きます。とはいえ、`required_environment_variables` を宣言しているスキルは、正当な理由でそれらを必要とします。

自社プラットフォームの資格情報 — Buzz メッセージングプラットフォームが使う `BUZZ_*` の変数 — は、**そのセッションが実際に Buzz のエージェントとして動いているときにかぎり**、`terminal` の子プロセス（前面のものと、背後 / PTY で起こしたものの両方）へ渡されます。判定の条件は、そのプロセスが Buzz-ACP の管理下のエージェントであること（Buzz Desktop の仕組みが `BUZZ_MANAGED_AGENT` を立てます）、あるいは動いているゲートウェイのセッションのプラットフォームが `buzz` であることです。これにより、Buzz プラットフォームのエージェントは、プラットフォームが定めた CLI（たとえば `buzz`）をターミナルツールから呼べる一方、同じホスト上の Telegram / CLI / cron のセッションでは変数が取り除かれたままになります。`_sanitize_subprocess_env` は検索のワーカー（たとえば ddgs のウェブ検索のサブプロセス）、computer-use のドライバーのバイナリ、利用者のスクリプトを動かすもの（`!` で始まるコマンド、クイックコマンド、cron のスクリプト、webhook のフィルタースクリプト）にも使われるので、Buzz のセッションから起こされた場合はそれらの子プロセスにも変数が渡ります。この例外は **ターミナルにかぎった** もので、`execute_code`、ブラウザや TUI ホストの起動（`hermes_subprocess_env`）、Docker / Modal の子プロセス、`env_passthrough` の登録には及びません。そちらは閉じたままです。

### しくみ {#how-it-works}

特定の変数をサンドボックスのふるいの外へ通す方法は 2 つあります。

**1. スキルに紐づく受け渡し（自動）**

スキルが読み込まれ（`skill_view` や `/skill` コマンド経由）、そこに `required_environment_variables` が宣言されていると、実際に環境に設定されている変数だけが自動で受け渡しの対象として登録されます。設定されていない変数（まだ準備が要る状態のもの）は登録され **ません**。

```yaml
# In a skill's SKILL.md frontmatter
required_environment_variables:
  - name: TENOR_API_KEY
    prompt: Tenor API key
    help: Get a key from https://developers.google.com/tenor
```

このスキルを読み込むと、`TENOR_API_KEY` は `execute_code`、`terminal`（ローカル）、**さらに遠隔のバックエンド（Docker、Modal）** にも渡ります。手作業の設定は要りません。

:::info Docker と Modal
v0.5.1 より前は、Docker の `forward_env` はスキル側の受け渡しとは別のしくみでした。いまは統合されており、スキルが宣言した環境変数は、`docker_forward_env` に自分で足さなくても Docker のコンテナや Modal のサンドボックスへ自動で転送されます。
:::

**2. 設定による受け渡し（手動）**

どのスキルも宣言していない環境変数は、`config.yaml` の `terminal.env_passthrough` に足します。

```yaml
terminal:
  env_passthrough:
    - MY_CUSTOM_KEY
    - ANOTHER_TOKEN
```

どちらの一覧も、`terminal`、`execute_code`、`no_agent` の cron スクリプトに等しく効きます。宣言された変数は、その子プロセスが属するプロファイルの値で渡されます。1 つのプロセスが複数のプロファイルを受け持つ場合（複数プロファイルのゲートウェイ、デスクトップやダッシュボードのバックエンド）、各プロファイルの値はそれぞれの `.env` や秘密情報の取得元から来るのであって、起動したプロファイルが用意したプロセスの環境から来ることはありません。起動したプロファイルの `.env` の資格情報は、受け持たれた側のプロファイルの子プロセスからは落とされます。

### 資格情報ファイルの受け渡し（OAuth トークンなど） {#credential-file-passthrough}

スキルによっては、環境変数だけでなく **ファイル** をサンドボックスの中で必要とします。たとえば Google Workspace は、OAuth のトークンを有効なプロファイルの `HERMES_HOME` の下に `google_token.json` として置きます。スキルはこれをフロントマターで宣言します。

```yaml
required_credential_files:
  - path: google_token.json
    description: Google OAuth2 token (created by setup script)
  - path: google_client_secret.json
    description: Google OAuth2 client credentials
```

読み込まれると、Hermes は有効なプロファイルの `HERMES_HOME` にこれらのファイルがあるかを確かめ、マウントの対象として登録します。

- **Docker**: 読み取り専用のバインドマウント（`-v host:container:ro`）
- **Modal**: サンドボックスの作成時にマウントし、コマンドのたびに同期します（セッションの途中で OAuth の設定をした場合にも対応します）
- **ローカル**: 何もしません（ファイルにはすでにさわれます）

資格情報のファイルは `config.yaml` に自分で並べることもできます。

```yaml
terminal:
  credential_files:
    - google_token.json
    - my_custom_oauth_token.json
```

パスは `~/.hermes/` からの相対です。ファイルはコンテナの中の `/root/.hermes/` にマウントされます。この一覧を読むのは `tools/credential_files.py` です（`terminal.credential_files`）。`terminal:` のブロックの下にありますが、読み込むのは中核のターミナルバックエンドではなく資格情報ファイルのモジュールなので、同梱の `DEFAULT_CONFIG` のひな型には含まれていません。

### 他の CLI のログインを借りる（Codex CLI、Claude Code） {#borrowed-cli-logins}

`openai-codex` や `anthropic` について Hermes 自身の使えるログインが無いとき、Hermes は Codex CLI の `~/.codex/auth.json` と Claude Code の `~/.claude/.credentials.json`（またはキーチェーンの項目）を借り、代わりに更新できます。どちらも 1 回かぎりで入れ替わる更新用トークンを使うので、2 つのプログラムが同じトークンの系統を持つと、先に更新したほうが相手の分を無効にします。これは「ターミナルで 1 回ログインしたのに Hermes が失敗し続ける」（あるいはその逆）という形で現れます。これらの CLI を Hermes と並べて使うなら、Hermes には自分のログインを与えて、借用を切ってください。

```yaml
auth:
  adopt_external_logins: false   # default: true
```

この切り替えを切ると、Hermes はそれらのファイルを読むことも更新することもしません。資格情報プールの `claude_code` の行は消え、`hermes auth list` がその旨を 1 行表示し、ログにはプロセスごとに INFO が 1 行残ります。影響を受けるのは自動の借用だけです。`hermes auth add openai-codex` は、既存の Codex CLI のログインを取り込む前に、これまでどおり確認します。自動の復旧も、Hermes がすでに持っている資格情報を直すだけです。Codex CLI やデスクトップから別の ChatGPT のワークスペースにログインした場合は警告とともに断られますし（`hermes auth add openai-codex` で認証し直してください）、復旧が動いているあいだに済ませたログインが上書きされることもありません。自分のログインは `hermes auth add anthropic` / `hermes auth add openai-codex` で足してください。

### サンドボックスごとのふるい分け {#what-each-sandbox-filters}

| サンドボックス | 既定のふるい | 受け渡しによる例外 |
|---------|---------------|---------------------|
| **execute_code** | 名前に `KEY`、`TOKEN`、`SECRET`、`PASSWORD`、`CREDENTIAL`、`PASSWD`、`AUTH` を含む変数を止め、安全な接頭辞の変数だけを通します | ✅ 受け渡しの変数は両方の検査を素通りします |
| **terminal**（ローカル） | Hermes の基盤にあたる変数（プロバイダーの鍵、ゲートウェイのトークン、ツールの API キー）を名指しで止めます | ✅ 受け渡しの変数は拒否リストを素通りします |
| **terminal**（Docker） | 既定ではホストの環境変数を渡しません | ✅ 受け渡しの変数と `docker_forward_env` を `-e` で転送します |
| **terminal**（SSH） | 既定ではホストの環境変数を渡しません | ✅ 受け渡しの変数を `SendEnv` で転送します。相手側の `sshd_config` に対応する `AcceptEnv` が必要です（[SSH バックエンド](/hermes/docs/user-guide/configuration/#ssh-backend)を参照） |
| **terminal**（Modal） | 既定ではホストの環境変数もファイルも渡しません | ✅ 資格情報のファイルをマウントし、環境変数は同期で渡します |
| **MCP** | 安全なシステムの変数と、設定に書いた `env` 以外はすべて止めます | ❌ 受け渡しの影響を受けません（代わりに MCP の `env` 設定を使ってください） |

### 気をつけること {#security-considerations}

- 受け渡しが効くのは、自分かスキルがはっきり宣言した変数だけです。LLM が書いた任意のコードに対する既定の守りは変わりません
- 資格情報のファイルは、Docker のコンテナへ **読み取り専用** でマウントされます
- Skills Guard が、導入の前にスキルの中身をあやしい環境変数のさわり方がないか走査します
- 設定されていない変数は登録されません（存在しないものは漏れようがありません）
- Hermes の基盤にあたる秘密情報（プロバイダーの API キー、ゲートウェイのトークン）は、`env_passthrough` に足すべきではありません。専用のしくみがあります

## MCP の資格情報の扱い {#mcp-credential-handling}

MCP（Model Context Protocol）サーバーのサブプロセスは、うっかりの資格情報漏れを防ぐため、**ふるいにかけた環境** を受け取ります。

### 安全な環境変数 {#safe-environment-variables}

ホストから MCP の stdio サブプロセスへ渡されるのは、次の変数だけです。

```
PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR
```

これに加えて `XDG_*` の変数が渡ります。ほかの環境変数（API キー、トークン、秘密情報）はすべて **取り除かれます**。

MCP サーバーの `env` 設定にはっきり書いた変数は渡されます。

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_..."  # Only this is passed
```

### 資格情報の伏せ字 {#credential-redaction}

MCP のツールから返るエラーメッセージは、LLM に渡る前に無害化されます。次のパターンが `[REDACTED]` に置き換わります。

- GitHub の PAT（`ghp_...`）
- OpenAI 形式の鍵（`sk-...`）
- bearer トークン
- `token=`、`key=`、`API_KEY=`、`password=`、`secret=` のパラメーター

### ウェブサイトへのアクセス方針 {#website-access-policy}

エージェントがウェブやブラウザのツールでどのサイトにアクセスできるかを絞れます。内部のサービスや管理画面、その他の重要な URL にさわらせたくないときに役立ちます。

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

止めた URL が要求されると、ツールはそのドメインが方針で止められている旨のエラーを返します。この拒否リストは `web_search`、`web_extract`、`browser_navigate`、そして URL を扱えるすべてのツールに効きます。

詳しくは設定ガイドの [ウェブサイトの拒否リスト](/hermes/docs/user-guide/configuration/#website-blocklist)を参照してください。

### SSRF への防御 {#ssrf-protection}

URL を扱えるツール（ウェブ検索、ウェブ抽出、画像認識、ブラウザ）はすべて、サーバーサイドリクエストフォージェリ（SSRF）を防ぐため、取得の前に URL を検証します。止められるアドレスには次のものがあります。

- **プライベートネットワーク**（RFC 1918）: `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`
- **ループバック**: `127.0.0.0/8`、`::1`
- **リンクローカル**: `169.254.0.0/16`（`169.254.169.254` のクラウドのメタデータを含みます）
- **CGNAT / 共有アドレス空間**（RFC 6598）: `100.64.0.0/10`（Tailscale、WireGuard の VPN）
- **クラウドのメタデータのホスト名**: `metadata.google.internal`、`metadata.goog`
- **予約済み、マルチキャスト、未指定のアドレス**

インターネットに面した利用では SSRF への防御はつねに働き、DNS の失敗は止められたものとして扱われます（閉じる側に倒れます）。リダイレクトの連鎖は、経由するたびに検証し直すので、リダイレクトを使った回避もできません。

同じ防護は、URL が自分ではなく相手方から来る取得にも効きます。生成のプロバイダーが返した画像や動画の URL、編集のためにモデルが差し出す参照画像の URL、ペットのスプライトシートと petdex の目録、skills.sh のサイトマップの項目などです。プロバイダーや索引がそれらをプライベートなアドレスやメタデータのアドレスに向けていれば、接続を開く前に断られます。運用者自身が設定したプロバイダーの `base_url` は影響を受けません。設定した `base_url` から直接取ってくるダウンロード（OpenRouter の動画コンテンツの窓口）は、最初の 1 回にかぎってプライベートアドレスの分類の検査だけを飛ばしますが、クラウドのメタデータの床は効いたままで、そこから出るリダイレクトはすべて検証し直されます。また、LAN 上に置いた画像生成のプロバイダーが返す *結果* の URL をローカルにキャッシュするには、後述の `security.allow_private_urls: true` が必要です。

#### あえてプライベートな URL を許す {#intentionally-allowing-private-urls}

環境によっては、内部やプライベートの URL へのアクセスがどうしても要ります。`home.arpa` を RFC 1918 の空間に解決する家庭のネットワーク、LAN からしか見えない Ollama / llama.cpp の窓口、社内の情報共有サイト、クラウドのメタデータの調査などです。そうした場合のために、全体で外す設定があります。

```yaml
security:
  allow_private_urls: true   # default: false
```

有効にすると、ウェブのツール、ブラウザ、画像認識の URL 取得、ゲートウェイのメディアのダウンロードは、RFC 1918 / ループバック / リンクローカル / CGNAT / クラウドのメタデータ宛てを断らなくなります。**これは意図して信頼の線を引き直す設定です。** プロンプトインジェクションで与えられた URL をエージェントがローカルのネットワークに対して叩いても許容できるマシンでだけ有効にしてください。外部に面したゲートウェイでは切ったままにすべきです。

ホスト名の部分一致による防護（元の IP が公開のものでも、そっくりに見せる Unicode のドメインの細工を止めます）は、この設定にかかわらず効き続けます。

#### ローカルプロキシの fake-ip の範囲 {#local-proxy-fake-ip-ranges}

fake-ip モードの TUN プロキシ（Mihomo/Clash の `fake-ip`、Surge の拡張モード）は、自分の
フィルターの外にある名前すべてに対して、自分の持つブロック — 既定では `198.18.0.0/15`
（RFC 2544 のベンチマーク用）— のアドレスを DNS の答えとして返します。この答えは内部の
ホストではなくプロキシの目印なのですが、そのままではプライベート IP の防護が外向きの
取得をことごとく断ってしまいます。`web_extract`、プラットフォームの添付のダウンロード、
ブラウザの中継のいずれも *URL targets a private or internal network address* で失敗し、
要求はネットワークに届きません。目印を通すには、そのブロックを宣言します。

```yaml
security:
  fake_ip_ranges:
    - 198.18.0.0/15
```

既定では空で、`allow_private_urls` より狭い設定です。例外になるのは宣言したブロックだけで、
それはローカルのプロキシが持つ範囲であるべきですし（接続先はあくまでプロキシで、本当の
相手はプロキシ自身が解決します）、ループバック、RFC 1918、リンクローカル、CGNAT、クラウドの
メタデータ宛ては止められたままです。それらの分類と重なる項目（`0.0.0.0/0` や `::/0` を
含みます）は、防護を広げる代わりに警告を出して無視されます。クラウドのブラウザの
プロバイダーを使っているホストでは、宣言した目印は
`browser.auto_local_for_private_urls` にとってもプライベート扱いでなくなるので、
そうしたページは引き続きクラウドのブラウザへ回ります。

### Tirith による実行前のセキュリティ走査 {#tirith-pre-exec-security-scanning}

Hermes は、実行前にコマンドの中身を走査するために [tirith](https://github.com/sheeki03/tirith) を組み込んでいます。Tirith は、パターン照合だけでは取りこぼす脅威を見つけます。

- 見た目のそっくりな URL のなりすまし（国際化ドメインを使った攻撃）
- インタープリターへ流し込むパターン（`curl | bash`、`wget | sh`）
- ターミナルへの注入攻撃

Tirith は初回の利用時に GitHub のリリースから自動で導入され、SHA-256 のチェックサムで検証されます（cosign が使えれば、cosign による来歴の検証も行います）。

```yaml
# In ~/.hermes/config.yaml
security:
  tirith_enabled: true       # Enable/disable tirith scanning (default: true)
  tirith_path: "tirith"      # Path to tirith binary (default: PATH lookup)
  tirith_timeout: 5          # Subprocess timeout in seconds
  tirith_fail_open: true     # Allow execution when tirith is unavailable (default: true)
```

`tirith_fail_open` が `true`（既定）のときは、tirith が入っていなかったり時間切れになったりしても、コマンドはそのまま進みます。厳しい環境では `false` にして、tirith が使えないときはコマンドを止めてください。

動作上の失敗（起動のエラー、時間切れ、異常終了）が 3 回続くと、壊れたバイナリがすべてのコマンドを止めてしまわないよう、走査を 5 分間休みます。その後は 1 つのコマンドが tirith を試し直し、走査が最後まで進めば（許可でも警告でも停止でも）通常の走査に戻ります。試し直しがまた失敗すると、5 分の休みを取り直します。

Tirith は Linux（x86_64 / aarch64）と macOS（x86_64 / arm64）向けのビルド済みバイナリを配っています。ビルド済みバイナリの無いプラットフォーム（Windows など）では、tirith は黙って飛ばされます。パターン照合の防護はそのまま動き、CLI に「使えません」という表示は出ません。Windows で tirith を使いたい場合は、WSL の下で Hermes を動かしてください。

Tirith の判定は承認の流れとつながります。安全なコマンドはそのまま通り、あやしいものも止められたものも、tirith の指摘の全文（深刻度、見出し、説明、より安全な代案）を添えて利用者の承認にかけられます。利用者は承認も拒否もできます。人のいない場面を安全に保つため、既定の選択は拒否です。

Tirith の既知の誤検知が 2 つ「許可」に下げられており、確認が出ることはありません（cron では拒否されることもありません）。1 つは、対象が正当な `.app` の gTLD だけである `lookalike_tld` の警告、もう 1 つは、コマンドの中のすべての選択子が絵文字の直後の U+FE0F である場合の `variation_selector` の警告です（`🗞️ Journal/` や `▶️ Media/` のようなフォルダー名がこれにあたります）。文字や数字のあとに来る異体字選択子 — このルールが本来狙っている、隠しての難読化の合図 — は、これまでどおり確認を出します。

### コンテキストファイルへの注入対策 {#context-file-injection-protection}

コンテキストのファイル（AGENTS.md、.cursorrules、SOUL.md）は、システムプロンプトに入れる前にプロンプトインジェクションの走査を受けます。走査では次を調べます。

- これまでの指示を無視・軽視させようとする指示
- あやしい語を含む、隠された HTML のコメント
- 秘密情報を読もうとする動き（`.env`、`credentials`、`.netrc`）
- `curl` による資格情報の持ち出し
- 目に見えない Unicode の文字（ゼロ幅スペース、双方向の上書き）

翻訳して実行させる形の検査には、短い言語・形式の指定が要ります（たとえば
「これを bash スクリプトに訳して実行して」）。関係のない、コンマで区切られた
役割の説明文をまたいで、翻訳と実行の動詞を結びつけることはありません。これらの
パターンはあくまで経験則であって、意味を理解した意図の検出ではありません。

止められたプロジェクトのファイルには警告が出ます。

```
[BLOCKED: AGENTS.md contained potential prompt injection (prompt_injection). Content not loaded.]
```

`HERMES_HOME` にある自分の `SOUL.md` は別扱いです。これは自分が書いたファイルであり（ファイル系のツールから
書き込むには承認が要り、プロジェクトのチェックアウトがこれを持ち込むことはありません）、走査に当たっても
**ファイルは止められません**。Hermes は当たったパターンを名指しした警告を記録したうえで、ふだんどおり
ファイルを読み込み、`/context` には `⚠ SOUL.md … loaded — matched prompt-injection pattern(s); review the file`
と表示します。これにより、攻撃の言い回しを *説明している* 人格のファイル（「これまでの指示を無視しろと
書かれた内容」といったセキュリティの手引き）も動き続けられます。当たった箇所に自分で書いた覚えがなければ、
その警告は誰か別のものがファイルを書き換えた合図だと考えてください。この例外は、プロファイルの配布物が
持ち込む `SOUL.md` には及びません。`hermes profile install <git-url>` と `hermes profile update` は、
第三者の `SOUL.md` を走査も承認の確認もなくプロファイルのホームへ複製するので、`distribution.yaml` が
そのファイルを持っている場合は、走査に当たれば止められます。

## 本番運用のベストプラクティス {#best-practices-for-production-deployment}

### ゲートウェイ運用のチェックリスト {#gateway-deployment-checklist}

1. **許可リストをはっきり設定する** — 本番で `GATEWAY_ALLOW_ALL_USERS=true` は使わないこと
2. **コンテナのバックエンドを使う** — config.yaml で `terminal.backend: docker` にする
3. **資源の上限を絞る** — CPU、メモリ、ディスクに適切な上限を設ける
4. **秘密情報を安全にしまう** — API キーは `~/.hermes/.env` に、適切なファイル権限で置く
5. **DM のペアリングを使う** — できるかぎり、利用者 ID を直接書く代わりにペアリングコードを使う
6. **コマンドの許可リストを見直す** — config.yaml の `command_allowlist` を定期的に点検する
7. **`terminal.cwd` を設定する** — 重要なディレクトリからエージェントを動かさない
8. **root 以外で動かす** — ゲートウェイを root で動かさない
9. **ログを見張る** — `~/.hermes/logs/` に認可されていないアクセスの跡がないか確かめる
10. **最新に保つ** — セキュリティ修正のため `hermes update` をこまめに実行する

### API キーを守る {#securing-api-keys}

```bash
# Set proper permissions on the .env file
chmod 600 ~/.hermes/.env

# Keep separate keys for different services
# Never commit .env files to version control
```

### ネットワークの分離 {#network-isolation}

いちばん安全にしたいなら、ゲートウェイを別のマシンか VM で動かしてください。`config.yaml` で `terminal.backend: ssh` を設定し、接続先の情報は `~/.hermes/.env` に環境変数として書きます。

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

SSH の接続情報を `config.yaml` ではなく `.env` に置くのは、リポジトリに入ったりプロファイルの書き出しと一緒に配られたりしないようにするためです。こうすることで、ゲートウェイのメッセージング接続と、エージェントのコマンド実行を切り分けられます。

## 置いた場所で信頼される拡張点 {#trusted-by-placement}

Hermes が動かせる第三者のコードは、たいてい明示的な許可リストで守られています。一般のプラグインには `plugins.enabled` が要り、シェルのフックには初回の承認（または `hooks_auto_accept`）が要り、MCP サーバーは設定に書きます。1 つだけ、意図して違う窓口があります。

| 拡張点 | 読み込み元 | 読み込まれるとき | 同意の形 |
|-----------------|-------------|-------------|--------|
| [ゲートウェイのイベントフック](/hermes/docs/user-guide/features/hooks/#gateway-event-hooks) | `<profile home>/hooks/<name>/`（`HOOK.yaml` + `handler.py`） | ゲートウェイの起動時（`HookRegistry.discover_and_load()`）、受け持つプロファイルごと | **ディレクトリを置くこと自体。** `plugins.enabled` への記載も確認も不要で、`HERMES_SAFE_MODE` でも飛ばされません。 |

ゲートウェイは、正しい形のフックのディレクトリをすべてプロセス内に、ゲートウェイ自身の権限で読み込みます。これは見落としではなく、文書化された取り決めです（`3988c3c245f` 以降）。プロファイルのホームは運用者が持つ設定であり、そこに書ける人はすでに `config.yaml` のシェルフックや `plugins.enabled` の編集を通じてあなたとしてコードを動かせるので、`hooks/` にだけ別の同意の関門を設けても、手間が増えるだけで信頼の線は動きません。`~/.hermes/hooks/` の中身は `config.yaml` の中身と同じように扱ってください。置く前に `handler.py` を読み、プロファイルのホームを点検するときはいつも `ls ~/.hermes/hooks/` も見ることです（このディレクトリは[保護されたパスの拒否リスト](#file-write-safety)に入っていないので、ふつうに書き込める状態です）。詳しくは[ゲートウェイのフックの信頼モデル](/hermes/docs/user-guide/features/hooks/#gateway-hook-trust)を参照してください。

## 供給網に関する勧告の確認 {#supply-chain-advisory-checking}

Hermes には、いま使っている仮想環境の Python パッケージのうち、乗っ取られたことが分かっている版の一覧と一致するものを知らせる、組み込みの勧告スキャナーが入っています（2026 年 5 月の `mistralai 2.4.6` の汚染のような、供給網を狙うワームが対象です）。実装は `hermes_cli/security_advisories.py` にあります。

動くタイミングは次のとおりです。

- **CLI の起動時の帯。** 当てはまる勧告があれば 1 行の警告が出て、詳しい対処は `hermes doctor` を見るよう案内します。
- **`hermes doctor`。** 有効な勧告をすべて、版の詳細と 2〜4 段階の対処手順とともに示します。
- **ゲートウェイの起動時。** `gateway.log` に記録され、最初の対話メッセージに短い運用者向けの帯が付きます。

勧告にはそれぞれ変わらない id が付いています。読んで対処したら、以後は消しておけます。

```bash
hermes doctor --ack <advisory-id>
```

この確認済みの記録は `config.security.acked_advisories` に保存され、再起動しても残ります。古い勧告は意図して一覧から **消しません**。残しておくことで、私設のミラーにまだ残っているかもしれない、過去に汚染された版について、新しく入れた環境にも警告が届きます。

この確認自体は標準ライブラリだけで動き、勧告ごとに `importlib.metadata.version()` を 1 回引くだけなので、毎回の起動時に走らせても大丈夫です。

### 任意の依存関係の遅延導入 {#lazy-install-of-optional-dependencies}

多くの機能（Mistral の TTS、ElevenLabs、Honcho のメモリ、Bedrock、Slack、Matrix など）は、誰もが必要とするわけではない Python のパッケージに依存しています。Hermes はこれらを `hermes-agent[all]` でまとめて入れるのではなく、最初に使うときに **遅らせて** 入れます。実装は `tools/lazy_deps.py` にあります。

これで解けるのは、次の引き換えです。

- **脆さ。** ある追加機能の依存の依存が PyPI から使えなくなると（マルウェアで隔離された、取り下げられた、アップロードが壊れた）、`[all]` の解決が丸ごと失敗し、新しく入れた環境が黙って削ぎ落とされた構成に落ちてしまいます。関係のない 10 個以上の追加機能を一度に失う、ということです。遅延導入は各バックエンドを切り離すので、汚染された 1 つの依存が無関係な機能を壊すことはありません。
- **膨らみ。** プロバイダーを 1 つしか使わない人が、一度も読み込まない何百ものパッケージを引っ張ってくることが無くなります。

しくみはこうです。

1. バックエンドのモジュールが、最初に読み込まれる経路の先頭で `ensure("feature.name")` を呼びます。
2. 依存が足りなければ、`ensure` が `config.yaml` の `security.allow_lazy_installs`（既定 `true`）を確かめ、許可された指定に対して仮想環境に閉じた `pip install` を実行します。
3. 導入に失敗した場合や、遅延導入を切っている場合は、実際の pip の標準エラーと `hermes tools` への案内を添えて `FeatureUnavailable` を投げます。

`tools/lazy_deps.py` が保証していることは次のとおりです。

| 保証 | 意味 |
|---|---|
| 仮想環境の中だけ | 導入先は有効な仮想環境の `sys.executable` です。システムの Python には決して入れません |
| PyPI から名前で指定するだけ | 指定できるのは `"package>=1.0,<2"` の書き方だけです。`--index-url`、`git+https://`、file: のパスは使えないので、悪意ある `config.yaml` が導入先をすり替えることはできません |
| 許可リスト | この経路で入れられるのは、ツリー内の `LAZY_DEPS` の対応表にある指定だけです。機能名を打ち間違えても、何でも入れられる状態にはなりません |
| 無効にできる | `security.allow_lazy_installs: false` にすると、実行時の導入を完全に止められます。ネットワークが制限された環境や、厳しい方針のもとで役立ちます |
| 黙って再試行しない | 失敗は `FeatureUnavailable` として表に出ます。悪い状態を覚え込むことも、再試行が嵐のように走ることもありません |

実行時の導入を止めるには、次のようにします。

```yaml
# ~/.hermes/config.yaml
security:
  allow_lazy_installs: false
```

止めている場合、任意の依存を必要とするバックエンドは、自分で導入する（`pip install …`）か、`hermes tools` で別のバックエンドを選ぶよう利用者に伝えます。
