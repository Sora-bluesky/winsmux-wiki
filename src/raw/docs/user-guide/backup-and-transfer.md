---
title: "バックアップと移行"
description: "設定画面から、エージェント全体をバックアップしたり、Hermes Cloud のエージェントをこのエージェントで置き換えたりできます"
upstream_path: user-guide/backup-and-transfer.md
upstream_blob: ea1de8c7ee88e3ff42a2d2568e3ad805ba9a0d74
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/backup-and-transfer
---

# バックアップと移行 {#backup-transfer}

Hermes Desktop(および Webapp)の **Settings ▸ Backup & Transfer** では、次の 2 つのことができます。

- **Back up** は、エージェント全体を 1 つのファイルに保存します。
- **Transfer to Hermes Cloud** は、Hermes Cloud 上にあるエージェントの 1 つを、このエージェントで置き換えます。この操作は元に戻せます。

Hermes Cloud 自体が提供している Webapp では、このセクションは **Backup** という名前になり、バックアップ機能だけが表示されます。そのタブ自体がすでにクラウド上のエージェントだからです。

## バックアップする {#back-up}

**Back up** を押すと、設定画面で表示中のエージェントに対して [`hermes backup`](/hermes/docs/reference/cli-commands/#hermes-backup) が実行され、そのあと zip ファイルの保存先を尋ねられます。この zip には Hermes のホームディレクトリ全体が含まれます。すべてのプロファイル、メモリ、ペルソナ、スキル、会話、スケジュール済みのジョブ、設定に加えて、キーやログイン情報(`.env`、`auth.json`)も入っています。他人に渡さないよう大切に保管してください。復元するときは `hermes import <zip>` を実行します。

## Hermes Cloud へ移行する {#transfer-to-hermes-cloud}

1. セクションで求められたら Nous Portal にサインインします。サインインすると、Hermes Cloud 上のエージェントが一覧表示されます。
2. 置き換えたいエージェントを選びます。
3. 置き換えられる内容と、エージェント側に残る内容を確認してから **I understand this replaces &lt;agent&gt;** にチェックを入れ、**Replace &lt;agent&gt;** をクリックします。

Hermes はまず、クラウド上のエージェントが移行を受け取れる状態かを確認します(この機能より前のバージョンのエージェントの場合は、Hermes の更新が必要だと表示されます)。次にこのエージェントをバックアップし、そのバックアップを数メガバイトずつクラウド上のエージェントへコピーします。クラウド上のエージェントは `hermes import --keep-host --messaging-off` でそれを復元します。クラウド上のエージェントは、ゲートウェイが処理中の作業を終えたあと、何かを変更する前に、自分自身のバックアップを取ります。このバックアップが「元に戻す」ための復元ポイントになります。バックアップとコピーの最中は **Cancel** で中止できますが、復元が始まると止められないため、ボタンは消えます。

**移行される内容:** メモリ、ペルソナ(SOUL.md)、スキル、会話、スケジュール済みのジョブ、すべてのプロファイル、設定、そして API キーやログイン情報(Nous Portal のものを除く)です。移行はエージェントを置き換える操作なので、バックアップに含まれていないものは削除されます。ただし、クラウド上のエージェントにしかないプロファイルはそのまま残ります。クラウド上のエージェントのワークスペースと、そのエージェント自身のドットファイル(`.ssh`、`.gitconfig`、`.config`)は削除されることはありません。

**クラウド上のエージェントに残る内容:** Nous Portal へのサインイン、モデルとプロバイダー、Hermes Cloud のツール(Web、画像、音声)、ダッシュボードへのサインイン、スケジューラーの設定です。これらは Hermes Cloud が設定したもので、クラウド上ですでに動いているためです。

**メッセージングボット**(Telegram、Discord、Slack など)は、トークン、許可リスト、設定ごと移行されますが、クラウド上のエージェントではオフの状態になります。ボットのトークンは、同時に 1 つの起動中の Hermes でしか使えないため、引き続きこのコンピューターが応答を担当します。完了画面には、オフの状態で移行されたボットの名前が表示されます。準備ができたら、**Messaging** ページでボットを 1 つずつ切り替えてください。このコンピューターではオフにし、クラウド上のエージェントではオンにします。元に戻した場合は、クラウド上のエージェントがもともと持っていたボットが元の状態に戻ります。

完了画面の **Undo** を押すと、クラウド上のエージェントが復元ポイントから復元され、移行で追加されたものは削除されます。移行が途中で失敗した場合、エラー画面には **Retry** のほかに **Undo** も表示されます。Undo では常に最初の復元ポイント、つまり何も変更される前に取ったバックアップが使われます。**Start again** を押すと、エージェントの一覧に戻ります。

**Webapp からのサインイン:** Webapp は、このインストール環境自身の Nous Portal サインイン(Settings ▸ Providers)を使います。ブラウザーを別のコンピューターで開いている場合、クラウド上のエージェントへのサインインは、そのコンピューターでは開けないアドレスで終わります。そのアドレスをセクションに表示される入力欄に貼り付けると、サインインが完了します。

**New cloud agent** を押すと Nous Portal が開き、そこで新しいエージェントを作成できます。Hermes Desktop からはまだエージェントを作成できません。

## コマンドラインから行う {#from-the-command-line}

```bash
hermes backup -o my-agent.zip                 # on this computer
# copy my-agent.zip to the cloud agent, then on it:
hermes import my-agent.zip --keep-host        # prints the undo point
hermes import <undo point> --force --keep-host   # undo
```

[`hermes import --keep-host`](/hermes/docs/reference/cli-commands/#--keep-host-replace-an-agent-but-keep-its-hosts-setup) のページに、残される内容が正確に載っています。