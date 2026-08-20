---
title: "個人の端末や仕事用の端末で Hermes を動かす"
description: "普段使いの端末で Hermes Agent を動かすときの安全策をひととおり見ていきます。既定で守られること、さらに締めるための設定、そして失敗を取り消す方法です"
upstream_path: guides/secure-hermes-on-a-work-machine.md
upstream_blob: 280f26b4bd095b2489f5fe6d7b2f2fa695ac4204
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/secure-hermes-on-a-work-machine
---

# 個人の端末や仕事用の端末で Hermes を動かす {#running-hermes-on-a-personal-or-work-machine}

これから、普段使っている端末でエージェントを動かそうとしています。個人のノートパソコンかもしれませんし、勤務先が管理するワークステーションかもしれません。安全に使うには、どう構えればよいでしょうか。

手短に言えば、既定の設定がすでにほとんどの仕事をしてくれます。Hermes は最初から安全側に倒した設定で配布されており、コマンドの承認、ファイル書き込みの安全確保、認証情報の取り扱いを多層で守るようになっています。このページでは、何もしなくても有効になっている保護、共用の端末や仕事用の端末で締めておきたい設定、そして問題が起きたときの取り消し方を順に見ていきます。ここで触れる仕組みはすべて、[セキュリティ](/hermes/docs/user-guide/security/) のページで詳しく説明しています。

## 既定で守られること {#what-the-defaults-already-protect}

インストールしただけで何も設定していない状態でも、次の保護が働いています。

**危険なコマンドには承認が要ります。** Hermes はコマンドを実行する前に、危険なパターンを集めた一覧と照らし合わせます。再帰的な削除、`/etc/` への書き込み、ディスク操作、パイプでシェルに流し込む形などです。既定の `approvals.mode: smart` では補助的な LLM が危険度を判断し、危険の少ないコマンドはそのコマンドに限って自動承認、明らかに危険なものは自動で拒否、判断がつかないものは手元での確認に回します。

**承認の確認は、応答がなければ拒否になります。** 承認の確認に時間内（既定は 300 秒）に答えなければ、そのコマンドは**拒否**されます。席を外している間に、何かが黙って承認されることはありません。

**絶対に通さない一覧が、いつでも床として働きます。** `rm -rf /`、フォーク爆弾、物理ディスクのゼロ埋めといった一部のコマンドは、承認の設定、`--yolo`、「常に許可」の指定に**かかわらず**拒否されます。この一覧は承認の層がコマンドを見る前に働き、無効にするフラグはありません。

**重要な場所へのファイル書き込みは遮断されます。** `write_file` と `patch` のツールは、OS の認証情報の保管場所（`~/.ssh/`、`~/.aws/`、`~/.kube/`、`/etc/sudoers`、`~/.netrc`）、Hermes の認証情報の保管場所（`auth.json`、`.env`、ペアリングのデータ）、プロジェクトの秘密情報のファイル（`.env`、`.env.local`、`.envrc`）に、ディスク上のどこにあっても触れません。遮断された書き込みはその場でエラーになります。承認の確認は出ませんし、チャットの画面から無効にする方法もありません。

**秘密情報は出力から伏せられます。** `security.redact_secrets` は既定で有効です。ツールの出力に含まれる API キー、トークン、パスワードらしき文字列は、会話の文脈やログに入る前に伏せ字にされます。

**データは指定した先にしか行きません。** API の呼び出しは、**設定した LLM のプロバイダーにだけ**送られます。Hermes Agent は利用状況の計測や分析情報の収集を行いません。会話、記憶、スキルはすべて手元の `~/.hermes/` に保存されます。[よくある質問](/hermes/docs/reference/faq/#is-my-data-sent-anywhere) も参照してください。

:::info
表に出てこない部分もあります。URL を扱えるすべてのツールに対する SSRF 対策、MCP のサブプロセスに渡す環境変数の絞り込み、文脈として読むファイルに対するプロンプトインジェクションの検査などです。層ごとの詳細は [セキュリティ](/hermes/docs/user-guide/security/) のページに載っています。
:::

## 共用の端末や仕事用の端末で締める {#tightening-for-a-shared-or-work-machine}

勤務先のデータ、本番環境の認証情報、他人のファイルが載っている端末では、既定の保護に次を重ねてください。

### 承認を手動にする {#switch-approvals-to-manual}

`smart` は危険の少ないコマンドを自動で承認します。引っかかったコマンドを毎回自分の目で見たい場合は、次のようにします。

```yaml
approvals:
  mode: manual
```

手動にすると、引っかかったコマンドを実行する前に必ず確認が出ます。

### 自分で拒否ルールを足す {#add-your-own-deny-rules}

`approvals.deny` は、一致したターミナルのコマンドを無条件に止めるパターンの一覧です。`--yolo`、`/yolo`、`mode: off` のもとでも効きます。組み込みの「絶対に通さない一覧」に対する、利用者が編集できる側の仕組みです。この端末では絶対に走らせたくないものを、ここに書いておきましょう。

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
    - "dd if=* of=/dev/*"
```

パターンは大文字小文字を区別しない [fnmatch](https://docs.python.org/3/library/fnmatch.html) 形式で、コマンド全体の文字列と照合されます。照合は、危険なパターンの検出器が使うのと同じ正規化・難読化解除の変形にも及ぶので、引用符を使った小細工でルールをすり抜けることはできません。パターンは必ず引用符でくくってください。先頭の `*` を裸で書くと YAML の解析エラーになります。変更はすぐに反映され、再起動は不要です。詳しくは [利用者が定義する拒否ルール](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny) を参照してください。

### ファイル書き込みの範囲を限定する {#sandbox-file-writes}

`HERMES_WRITE_SAFE_ROOT` は、`write_file` と `patch` の書き込み先を、列挙したディレクトリの配下だけに制限します。その外は完全に遮断されます。Unix では複数の起点を `:` で区切ります。

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

制限の内側にあっても、重要な場所への書き込みは引き続き遮断されます。`$HOME` を指定したからといって `~/.ssh/id_rsa` に書けるようにはなりません。

:::caution
これを軽い気持ちで `~/.hermes/.env` に書かないでください。プロジェクトのディレクトリだけを指定すると、エージェントは `~/.hermes/cron/jobs.json` やプロファイルのスキル、そのほか配下の外にある Hermes の状態を書き換えられなくなります。上の例のように、Hermes のホームも 2 つめの起点として含めてください。
:::

### コマンドの実行そのものを端末の外へ出す {#move-command-execution-off-the-host}

いちばん強い分離は、そもそも自分の端末でコマンドを走らせないことです。ターミナルのツールは複数の [実行基盤](/hermes/docs/user-guide/features/tools/#terminal-backends) に対応しています。

| 実行基盤 | 分離の度合い |
|---------|-----------|
| `local` | なし。端末上で実行します（危険なコマンドの検査は働きます） |
| `docker` | コンテナ。コンテナそのものが安全の境界になります |
| `ssh` | 別の端末。実行を別のサーバーに保ちます |

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_forward_env: []  # Explicit allowlist only; empty keeps secrets out of the container
```

Docker のコンテナはどれも強化した設定で動きます。Linux のケーパビリティはすべて外し（最小限だけ戻します）、`no-new-privileges` を有効にし、プロセス数に上限を設け、tmpfs のマウントにも容量の上限を付けます。コンテナを実行基盤にすれば、その中の破壊的なコマンドが端末を傷つけることはありません。だからこそ、コンテナ内では危険なコマンドの検査を省いています。

`ssh` を使う場合は、`config.yaml` で `terminal.backend: ssh` を設定し、接続先の情報を `~/.hermes/.env` の `TERMINAL_SSH_HOST`、`TERMINAL_SSH_USER`、`TERMINAL_SSH_KEY` で渡します。[ネットワークの分離](/hermes/docs/user-guide/security/#network-isolation) も参照してください。

### メッセージング機能を使うなら: 許可リストとペアリング {#if-messaging-is-on-allowlists-and-pairing}

この端末で [ゲートウェイ](/hermes/docs/user-guide/security/#user-authorization-gateway) を動かしますか。既定はすでに拒否側です。許可リストが何も設定されておらず `GATEWAY_ALLOW_ALL_USERS` も設定されていなければ、**すべての利用者が拒否されます**。そのうえで、許可する相手は明示しておきましょう。

```bash
# ~/.hermes/.env
TELEGRAM_ALLOWED_USERS=123456789
GATEWAY_ALLOWED_USERS=123456789
```

ID を直接書く代わりに、ダイレクトメッセージでのペアリングを使う手もあります。知らない利用者には一度きりのペアリングコードが渡され、こちらは `hermes pairing approve <platform> <code>` で承認します。大切な端末では、`GATEWAY_ALLOW_ALL_USERS=true` を設定しないでください。

## 取り消しの層: チェックポイントと `/rollback` {#the-undo-layer-checkpoints-and-rollback}

承認の関門は被害を未然に防ぎ、[チェックポイント](/hermes/docs/user-guide/checkpoints-and-rollback/) は起きてしまった変更を巻き戻します。有効にすると、Hermes は破壊的な操作の前にプロジェクトの状態を自動で控えます。対象は `write_file`、`patch`、そして `rm`、`mv`、`sed -i`、`git reset` のような破壊的なターミナルのコマンドです。控えは `~/.hermes/checkpoints/store/` の下にある影の git 保管庫に置かれ、実際のプロジェクトの `.git` には一切触れません。

チェックポイントは自分で有効にする仕組みです。セッション単位で有効にするには、次のようにします。

```bash
hermes chat --checkpoints
```

全体で有効にする場合は、次のとおりです。

```yaml
checkpoints:
  enabled: true
```

セッションの中では、次のコマンドを使います。

| コマンド | 説明 |
|---------|-------------|
| `/rollback` | 変更の統計を添えて、すべてのチェックポイントを一覧表示します |
| `/rollback diff <N>` | チェックポイント N 以降の変更内容を確認します |
| `/rollback <N>` | チェックポイント N の状態へ戻します（直前の会話のターンも取り消します） |
| `/rollback <N> <file>` | チェックポイント N から 1 つのファイルだけ戻します |

:::tip
戻す前に `/rollback diff <N>` で中身を確認してください。git の worktree と組み合わせると、より安全になります。Hermes のセッションごとに worktree を分け、そのうえでチェックポイントを重ねる形です。
:::

## この想定が守るもの、守らないもの {#what-this-threat-model-is-and-isnt}

これらの仕組みが何から守るのかは、はっきりさせておきましょう。[セキュリティ](/hermes/docs/user-guide/security/#user-defined-deny-rules-approvalsdeny) のページには、こう書かれています。

> 拒否ルールは、悪意はないが誤った判断をするエージェントに対する手すりであり、危険なパターンの検出器と同じ想定に立っています。意図的に敵対してくるプロセスを閉じ込めるためのものではありません。それが必要なら、分離された実行基盤（Docker、Modal）か、外向きの通信を制限した環境を使ってください。

ファイル書き込みの保護についても同じことが言えます。効くのは `write_file` と `patch` に対してだけで、`terminal` のツールは OS 上の同じ利用者として動きます。拒否の一覧は事故による被害を減らし、モデルにはっきりした停止の合図を与えますが、敵対的あるいは乗っ取られたエージェントを閉じ込めるものではありません。手すりではなく封じ込めが必要なら、答えは分離された実行基盤です。そのために設計された境界はそちらにあります。

## 慎重めの初期設定 {#a-cautious-starting-config}

ここまでの内容をひとまとめにしたものです。`~/.hermes/config.yaml` で好みに合わせて調整してください。

```yaml
approvals:
  mode: manual                  # See every flagged command yourself
  timeout: 300                  # Unanswered prompts are denied (fail-closed)
  deny:                         # Never-run list — survives even /yolo
    - "git push --force*"
    - "*curl*|*sh*"
    - "dd if=* of=/dev/*"

security:
  redact_secrets: true          # Already the default; stated here for clarity

checkpoints:
  enabled: true                 # Snapshot before destructive operations

terminal:
  backend: docker               # Or ssh — keep execution off the host
  docker_forward_env: []        # No host secrets inside the container
```

書き込み範囲の制限も使いたい場合は、`~/.hermes/.env` に次を書きます。

```bash
HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

## 関連ページ {#see-also}

- **[セキュリティ](/hermes/docs/user-guide/security/)** — 多層の守りをすべてまとめた一覧です。承認のパターン、コンテナ強化のフラグ、ゲートウェイの認可、MCP に渡す認証情報の絞り込みまで扱います
- **[チェックポイントと巻き戻し](/hermes/docs/user-guide/checkpoints-and-rollback/)** — 設定、保管庫の手入れ、復元の手順です
- **[ツールとツールセット](/hermes/docs/user-guide/features/tools/)** — ターミナルの実行基盤とその設定をすべて扱います
- **[設定](/hermes/docs/user-guide/configuration/)** — `config.yaml` の項目をひととおり載せた一覧です
