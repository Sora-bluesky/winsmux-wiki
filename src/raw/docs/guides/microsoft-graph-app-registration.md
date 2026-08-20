---
title: "Microsoft Graph のアプリケーションを登録する"
description: "Teams 会議パイプラインを動かすためのアプリ登録を、Azure ポータルで作る手順"
upstream_path: guides/microsoft-graph-app-registration.md
upstream_blob: 70de0498cfedc9f9687eb0dc5961c80842f5304a
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/microsoft-graph-app-registration
---

# Microsoft Graph のアプリケーションを登録する {#register-a-microsoft-graph-application}

Teams 会議パイプラインは、会議の文字起こし・録画・関連ファイルを Microsoft Graph から読み取ります。このとき使うのは **アプリ専用**（デーモン）認証です。ユーザーがサインインすることも、会議ごとに同意を求められることもありません。そのかわり、管理者が同意したアプリケーション許可を持つ Azure AD のアプリ登録が必要になります。

このページで扱うのは次の流れです。

1. アプリ登録を作る
2. クライアントシークレットを作る
3. パイプラインに必要な Graph API の許可を与える
4. その許可に管理者として同意する
5. （任意）アプリケーションアクセスポリシーで、対象ユーザーを絞り込む

最後までやり切るには **テナント管理者の権限** が要ります（自分に権限がない場合は、管理者に同意を代行してもらってください）。途中で集めた値は控えておいてください。最後に `~/.hermes/.env` へ書き込みます。

## 事前に必要なもの {#prerequisites}

- 会議の文字起こしと録画が作られる Teams Premium もしくは Teams のライセンスを持つ Microsoft 365 テナント
- [entra.microsoft.com](https://entra.microsoft.com) の Azure ポータルへの管理者アクセス
- Graph の変更通知を受け取る、インターネットから到達できる HTTPS のエンドポイント（設定は後半の Webhook リスナーの手順で行います）

## 手順 1: アプリ登録を作る {#step-1-create-the-app-registration}

1. テナント管理者として [entra.microsoft.com](https://entra.microsoft.com) にサインインします。
2. **ID → アプリケーション → アプリの登録** を開きます。
3. **新規登録** をクリックします。
4. 次のように入力します。
   - **名前:** `Hermes Teams Meeting Pipeline`（自分が見分けられる名前なら何でも構いません）。
   - **サポートされているアカウントの種類:** *この組織ディレクトリのみに含まれるアカウント（シングルテナント）*。
   - **リダイレクト URI:** 空のままにします。アプリ専用認証では不要です。
5. **登録** をクリックします。

アプリの概要ページが開きます。ここから 2 つの値をコピーしてください。

- **アプリケーション (クライアント) ID** → `MSGRAPH_CLIENT_ID`
- **ディレクトリ (テナント) ID** → `MSGRAPH_TENANT_ID`

## 手順 2: クライアントシークレットを作る {#step-2-create-a-client-secret}

1. 左側のメニューから **証明書とシークレット** を開きます。
2. **新しいクライアント シークレット** をクリックします。
3. **説明:** `hermes-graph-secret`。**有効期限:** 自分のローテーション方針に合う値を選びます（6〜24 か月が一般的です）。
4. **追加** をクリックします。
5. **値** の列をその場でコピーします。一度しか表示されません。この値が `MSGRAPH_CLIENT_SECRET` です。

> **シークレット ID** の列はシークレットではありません。必要なのは **値** の列です。

## 手順 3: Graph API の許可を与える {#step-3-grant-graph-api-permissions}

パイプラインが使うアプリケーション許可は、必要最小限にとどめてあります。追加するのは必要なものだけにしてください。ひとつ増やすたびに、アプリがテナント全体で読み取れる範囲が広がります。

1. 左側のメニューから **API のアクセス許可** を開きます。
2. **アクセス許可の追加** → **Microsoft Graph** → **アプリケーションの許可** の順にクリックします。
3. パイプラインにやらせたいことに合わせて、下の表から許可を追加します。
4. 追加したら **`<your tenant>` に管理者の同意を与えます** をクリックします。すべての許可について、状態の列が緑のチェックマークに変わるはずです。

### 文字起こしを軸にした要約に必要なもの {#required-for-transcript-first-summaries}

| 許可 | アプリができるようになること |
|------------|--------------------------|
| `OnlineMeetings.Read.All` | Teams のオンライン会議のメタデータ（件名・参加者・参加 URL）を読み取る。 |
| `OnlineMeetingTranscript.Read.All` | Teams が生成した会議の文字起こしを読み取る。 |

### 録画にフォールバックする場合に必要なもの（文字起こしが手に入らないとき） {#required-for-recording-fallback-when-a-transcript-is-unavailable}

| 許可 | アプリができるようになること |
|------------|--------------------------|
| `OnlineMeetingRecording.Read.All` | オフラインの音声認識にかけるため、Teams の会議録画をダウンロードする。 |
| `CallRecords.Read.All` | 参加 URL しか分からないときに、通話レコードから会議を特定する。 |

### 要約を送り出すのに必要なもの（Graph モードのみ） {#required-for-outbound-summary-delivery-graph-mode-only}

`platforms.teams.extra.delivery_mode` が `graph` の場合、パイプラインは Graph API 経由で Teams のチャネルかチャットに要約を投稿します。`incoming_webhook` の配信モードを使うなら、この許可は不要です。

| 許可 | アプリができるようになること |
|------------|--------------------------|
| `ChannelMessage.Send` | アプリの名義で Teams のチャネルにメッセージを投稿する。 |
| `Chat.ReadWrite.All` | 1 対 1 やグループのチャットにメッセージを投稿する（配信先に `chat_id` を指定したときだけ必要です）。 |

### おすすめしないもの {#not-recommended}

- `OnlineMeetings.ReadWrite.All` や、`.All` の付かない `Chat.ReadWrite` — パイプラインに必要な範囲より広すぎます。
- 委任された許可 — パイプラインはアプリ専用（クライアント資格情報）のフローを使うため、ユーザーのサインインがない委任された許可では動きません。

## 手順 4: （推奨）アプリケーションアクセスポリシーで範囲を絞る {#step-4-recommended-scope-the-app-with-an-application-access-policy}

`OnlineMeetings.Read.All` のようなアプリケーション許可は、初期状態ではテナント内の **すべての** 会議へのアクセスをアプリに与えます。パートナー向けのデモや開発用テナントならそれで構いませんが、本番ではまず、どのユーザーの会議を読み取れるかを制限したくなるはずです。

Microsoft はこの用途のために Teams の **アプリケーションアクセスポリシー** を用意しています。このポリシーは PowerShell からしか触れません。ポータルの画面はありません。

MicrosoftTeams モジュールを入れて接続した管理者用の PowerShell（`Connect-MicrosoftTeams`）から実行します。

```powershell
# Create a policy scoped to the Hermes app
New-CsApplicationAccessPolicy `
  -Identity "Hermes-Meeting-Pipeline-Policy" `
  -AppIds "<MSGRAPH_CLIENT_ID>" `
  -Description "Restrict Hermes meeting pipeline to allow-listed users"

# Grant the policy to specific users whose meetings the pipeline may read
Grant-CsApplicationAccessPolicy `
  -PolicyName "Hermes-Meeting-Pipeline-Policy" `
  -Identity "alice@example.com"

Grant-CsApplicationAccessPolicy `
  -PolicyName "Hermes-Meeting-Pipeline-Policy" `
  -Identity "bob@example.com"
```

割り当ててから反映されるまで、最大 30 分ほどかかります。次のコマンドで確認できます。

```powershell
Test-CsApplicationAccessPolicy -Identity "alice@example.com" -AppId "<MSGRAPH_CLIENT_ID>"
```

このポリシーがないと、**どの** ユーザーの会議も読める状態になります。許可そのものが技術的にはそこまで与えているからです。本番のテナントでは、この手順を飛ばさないでください。

## 手順 5: 認証情報を env ファイルに書く {#step-5-write-the-credentials-to-your-env-file}

集めた 3 つの値を `~/.hermes/.env` に書き込みます。

```bash
MSGRAPH_TENANT_ID=<directory-tenant-id>
MSGRAPH_CLIENT_ID=<application-client-id>
MSGRAPH_CLIENT_SECRET=<client-secret-value>
```

シークレットを自分だけが読めるように、ファイルの権限を設定します。

```bash
chmod 600 ~/.hermes/.env
```

## 手順 6: トークンの取得を確かめる {#step-6-verify-the-token-flow}

Hermes には Graph 認証のスモークテストが同梱されています。Hermes をインストールした場所から実行してください。

```python
python -c "

from tools.microsoft_graph_auth import MicrosoftGraphTokenProvider
provider = MicrosoftGraphTokenProvider.from_env()
token = asyncio.run(provider.get_access_token())
print('Token acquired, length:', len(token))
print(provider.inspect_token_health())
"
```

うまくいくと、長いトークン文字列と、`cached: True` および 3600 前後の `expires_in_seconds` を含むヘルス情報の辞書が表示されます。失敗した場合は Azure のエラーコードを含む `MicrosoftGraphTokenError` が出ます。よくあるものは次のとおりです。

| Azure のエラー | 意味 | 対処 |
|-------------|---------|-----|
| `AADSTS7000215: Invalid client secret` | シークレットの値が違うか、期限切れです。 | 手順 2 でシークレットを作り直し、`.env` を更新します。 |
| `AADSTS700016: Application not found` | `MSGRAPH_CLIENT_ID` かテナントが違います。 | 手順 1 の 2 つの値が同じアプリのものか、もう一度確かめます。 |
| `AADSTS90002: Tenant not found` | `MSGRAPH_TENANT_ID` の打ち間違いです。 | アプリの概要ページから、ディレクトリ (テナント) ID をコピーし直します。 |
| トークン取得時ではなく呼び出し時の `insufficient_claims` | トークンは取れるのに、Graph が 401 か 403 を返しています。 | 手順 3 の管理者の同意を飛ばしたか、許可を追加したあとに同意し直していません。API のアクセス許可に戻って、もう一度 **管理者の同意を与えます** をクリックしてください。 |

## クライアントシークレットをローテーションする {#rotating-the-client-secret}

Azure のクライアントシークレットには、動かしようのない有効期限があります。切れる前に次を行ってください。

1. 手順 2 の要領で、既存のシークレットは消さずに 2 つ目のクライアントシークレットを作ります。
2. `~/.hermes/.env` の `MSGRAPH_CLIENT_SECRET` を新しい値に更新します。
3. 新しいシークレットを読み込ませるため、ゲートウェイを再起動します: `hermes gateway restart`。
4. 上のスモークテストで動作を確かめます。
5. 古いシークレットを Azure ポータルから削除します。

## 次の一歩 {#next-steps}

認証情報の確認が通ったら、次に進んでください。

- **Webhook リスナーの設定** — Graph の変更通知を受け取る `msgraph_webhook` ゲートウェイプラットフォームを立ち上げます。
- **パイプラインの設定** — Teams 会議パイプラインのランタイムと運用者向け CLI を設定します。
- **送信側の配信** — 要約を Teams のチャネルかチャットに戻す経路をつなぎます。

これらのページは、対応するランタイムを追加する PR と合わせて公開されます。ここで扱った認証情報の設定はそれ自体で完結しているので、先に済ませておいても問題ありません。
