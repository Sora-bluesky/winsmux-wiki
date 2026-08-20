---
title: "Unbroker — データブローカーサイトから自分の情報を自動で削除する"
description: "データブローカーサイトから自分の情報を自動で削除する"
upstream_path: user-guide/skills/optional/security/security-unbroker.md
upstream_blob: 4125826689ad8c35fc4d8981388665793ee87492
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/security/security-unbroker
---

# Unbroker {#unbroker}

データブローカーサイトから自分の情報を自動で削除します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/security/unbroker` で導入します |
| パス | `optional-skills/security/unbroker` |
| バージョン | `1.0.0` |
| 作者 | SHL0MS (github.com/SHL0MS) |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `privacy`, `data-broker`, `opt-out`, `ccpa`, `gdpr`, `security`, `doxxing` |
| 関連 skill | [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/), [`agentmail`](/hermes/docs/user-guide/skills/optional/email/email-agentmail/), [`himalaya`](/hermes/docs/user-guide/skills/bundled/email/email-himalaya/), [`scrapling`](/hermes/docs/user-guide/skills/optional/research/research-scrapling/), [`osint-investigation`](/hermes/docs/user-guide/skills/optional/research/research-osint-investigation/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# unbroker {#unbroker}

ある人の個人情報（氏名、住所、電話番号、メールアドレス、親族）が、データブローカーや
人物検索サイトのどこに公開されているかを見つけ出し、それを削除します。可能なところは自動で、
CAPTCHA・政府発行 ID・電話・FAX を要求するサイトだけは人の手を案内する形で進めます。複数の人を
それぞれ独立して管理できます。ただし、アンチボット機構を突破することは**しません**。記録済みの
同意がない相手に対して行動することも**しません**。公的記録（投票・不動産・裁判）や、本人が管理する
アカウントを削除することも**しません**。

Python の CLI（`scripts/pdd.py`）が、決定論的な状態を一手に管理します。設定、ドシエと同意、
ブローカーのデータベース、ティア計画、台帳、下書き、レポート、**メール送信（SMTP）、確認リンクの
ポーリング（IMAP）、自律アクションのキュー（`next`）**です。あなた（エージェント）は、ネイティブ
ツールでスキャンとフォーム操作を担当します。検索と Web フォームには `web_extract` と
`browser_navigate` を、定期的な再スキャンには `cronjob` を使います。

## 自律性の取り決め {#autonomy-contract}

この skill は**人手をかけずに**動くよう設計されています。インテーク（＋同意の記録）のあと、正当な
人の関与点はちょうど 2 か所だけです。（1）インテークの会話そのもの、（2）実行の最後に一度だけ
まとめる人向けタスクのダイジェスト（`$PDD tasks`）です。その間は次のとおりです。

- **設定の選択をオペレーターに尋ねてはいけません。** `$PDD setup --auto` が機能を検出し、有効な設定の
  なかで最も自律的なものを自ら選びます。
- **個々の送信の前で立ち止まってはいけません**（`autonomy=full`、既定のとき）。インテークで記録した
  同意が、T0–T2 のオプトアウトに対する常時の承認になります。（`autonomy=assisted` は慎重なオペレーター
  向けに送信ごとの確認を復活させます。`next` の出力にある `confirm_first` フラグに従ってください。）
- **人にしかできない作業のために実行を中断してはいけません。** それは記録し（`record ... human_task_queued
  --reason "..."`）、そのまま進めます。すべて最後のダイジェストに一度だけ表れます。
- **実行全体を `$PDD next <subject>` に対するループとして回してください** — これは、いま取るべき
  順序どおりのアクション（スキャン、確認のポーリング、再チェック、親から先のオプトアウト、ブロックの
  再キュー投入）と、人向けダイジェストを返します。すべてのアクションを実行し、結果を記録し、`next` を
  再実行する、これを `done_for_now` まで繰り返します。そのうえでダイジェスト、レポートを示し、cron を
  設定します。

自律性が決して上書きしない厳格な制限は次のとおりです。記録済みの同意なしに行動しない、`disclosure_fields`
を超えて開示しない、CAPTCHA／アンチボットを回避しない、そして `confirmed_removed` は確認の再スキャンの
あとにだけ付ける、です。

## いつ使うか {#when-to-use}

- 「自分（または家族）のデータを、データブローカー／人物検索サイトから削除して。」
- 「オプトアウトして」「Spokeo／Whitepages などから私を消して」「ドキシングのあと片付けをして」。
- 「定期的なプライバシー監視を設定して」（ブローカーは人物を再掲載します）。
- どのブローカーがまだ誰かの情報を公開しているか、そしてその理由を確認するとき。

## 事前に必要なもの {#prerequisites}

- `python3`（標準ライブラリのみ。コアエンジンに追加パッケージは不要）。
- **任意の強化**（これらがなくても skill は設定ゼロで動きます。`setup --auto` は検出したものをすべて
  有効にし、認証情報をシェルの環境変数**と `$HERMES_HOME/.env`** から読み取るため、Hermes が自分の
  ツール用にすでに読み込んでいるキーは再エクスポートなしで拾われます。どれも、人向けタスクの一類を
  エージェントのアクションに変えます）。
  - **クラウドブラウザ（推奨の既定）: `BROWSERBASE_API_KEY`。** `setup --auto` はキーが存在するときは
    必ずこれを選びます。これが意図されたベースラインです。実在の住宅用 IP を持つクラウドブラウザは
    **ソフト／マネージド CAPTCHA（Cloudflare Turnstile、hCaptcha／reCAPTCHA のチェックボックス）を
    通常動作としてクリアする**ため、対象のブローカーは人向けタスク（T2）に落ちず自動化のまま（T1）で
    済みます。これは CAPTCHA の「解答」ではありません。ソルバーサービスも指紋偽装もなく、ブラウザが
    本当に通れない対話的／挙動ベース（「ハード」）の課題だけが人向けタスクに退避します。キーがない
    場合はプレーンなエージェントブラウザが使われ、ソフト CAPTCHA のブローカーは T2（人）に落ちます。
  - メール自動化、認証情報が要る／要らないの 2 択があります。
    - **ブラウザモード（パスワード不要）: `setup --email-mode browser`。** エージェントは
      オプトアウト／CCPA メールを送信し、確認リンクを、オペレーターの**ログイン済み Web メール**上で
      `browser_*` ツールを使って開きます。何も保存されません。これには Hermes がオペレーター自身の
      ログイン済みブラウザを指している必要があり、クラウドブラウザは**不可**です。ヘッドレスの
      クラウドブラウザ（Browserbase）は Web メールのセッションを持たず、それ自体が Web メールや
      セッション連動のブローカーゲート（例: PeopleConnect のガイドモード）で Cloudflare／DataDome の
      関門にかかります。オペレーターの実際の Chrome を CDP 経由で操作してください。
      `chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.hermes/chrome-debug"` を起動し
      （Default プロファイルではなく、Web メールに一度サインインした専用のデバッグプロファイル）、
      ブラウザツールを `127.0.0.1:9222` に接続します。**`$PDD cdp` がこれを代わりに起動します**
      （Chrome／Chromium／Brave／Edge を見つけ、専用プロファイルでデタッチ起動し、CDP エンドポイントを
      表示します。`--check` でテスト、`--print` でコマンド表示）。`references/methods.md` の
      「Browser backends: scan vs execute」を参照してください。
      受信箱に到達できない場合は、メールの下書きにフォールバックします。
    - **SMTP／IMAP（認証情報を保存）: `EMAIL_ADDRESS` + `EMAIL_PASSWORD`**（主要でないプロバイダーは
      `EMAIL_SMTP_HOST` / `EMAIL_IMAP_HOST` も。gmail／outlook／yahoo／icloud／fastmail は推測されます）。
      CLI は `send-email` で送信し、`poll-verification` で確認リンクを読み取ります。`agentmail` skill
      （ブローカーごとのエイリアス）も対象になります。
  - Google スプレッドシートのトラッカー: `google-workspace` skill。
  - ステルス／Cloudflare 保護ページ向けの `scrapling` skill。

## 実行方法 {#how-to-run}

すべて `terminal` ツールを通して実行します。この skill のディレクトリから次のようにします。

```bash
PDD="python3 scripts/pdd.py"
```

エンジンはデータを `$PDD_DATA_DIR`（既定は `$HERMES_HOME/unbroker`）の下に、`0600` で書き込みます。
実行は `terminal` で行い、`execute_code` は**使いません**（そのサンドボックスは環境変数を消去し出力を
伏せるため、ドシエの読み取りが壊れます）。

## 早見表 {#quick-reference}

| コマンド | 用途 |
|---|---|
| `$PDD setup --auto` | **自律セットアップ**: 機能を検出し、最も自律的で有効な設定を選ぶ（質問なし） |
| `$PDD doctor` | 準備状況の確認: 設定、ブローカー数、どの強化が有効／利用可能か |
| `$PDD cdp [--check] [--print] [--port N]` | フェーズ 2 のブラウザ＋Web メール向けに、オペレーターの Chrome を CDP で起動／検出する（専用のデバッグプロファイル。Web メール送信とセッション連動ゲートの通過を確実にする方法） |
| `$PDD intake --full-name "..." [--alias ...] [--email ... --phone ...] [--city --state] [--prior-location "City,ST"] --consent` | 同意済みの対象者を作成。別名＋複数のメール／電話＋過去の居住地を取り込み、`subject_id` を表示する |
| `$PDD next <subject>` | **自律ループの駆動役**: いま取るべき順序どおりのエージェントアクション＋人向けダイジェスト＋`next_wake_at` |
| `$PDD brokers [--priority crucial]` | 人物検索ブローカーのデータベース（キュレーション＋ライブ）を一覧する |
| `$PDD refresh-brokers` | 最新の BADBOOL 人物検索リスト**と CA データブローカー登録簿**を取得する（キャッシュが古いと `next` が自動で再キュー投入する） |
| `$PDD registry [--search NAME]` | 州の登録簿カバレッジ（CA は約 545 件取り込み済み。VT／OR／TX のポータルを提示）。DROP／メールのレーンであり、スキャン対象ではない |
| `$PDD drop <subject> [--filed]` | **一発の法的レバー**: 1 件の CA DROP 請求で、登録済みの全ブローカーから削除する。`--filed` で記録する |
| `$PDD plan <subject> [--priority crucial]` | ブローカーごとのティア＋方法＋`search_vectors`＋開示すべき正確なフィールド |
| `$PDD plan <subject> --batch` | **集約ビュー**: 台帳の状態を重ね、次のアクションでブローカーをグループ化し（未スキャン／発見／間接／ブロック／進行中／完了）、所有クラスタを畳み込み、**`found` クラスタを親優先で並べて専用の `parent_playbook` を出力**し、`next_actions` を表示する |
| `$PDD fanout <subject> [--priority crucial] [--size 5]` | ブローカーを並列 `delegate_task` サブエージェントにまとめる（大規模な実行では自動。5 件のバッチ — 8 件以上はタイムアウトする） |
| `$PDD record <subject> <broker> <state> [--found true] [--evidence JSON] [--disclosed F --channel C] [--reason "..."]` | 台帳を更新する（検証付きの状態機械）。**`next_recheck_at` を自動で刻む** |
| `$PDD show <subject> <broker>` | あるケースの記録済み状態＋証跡＋開示ログを読み戻す（親がサブエージェントの `found` を、掲載 URL を再導出せずに再検証できるように） |
| `$PDD send-email <subject> <broker> --listing <url> [--kind ccpa_indirect ...]` | 請求を生成＋記録する（宛先はブローカー自身のアドレスに固定）。**browser** モードは Web メールで送るための `compose` ペイロードを返す（パスワード不要）。**programmatic** モードは SMTP 送信する |
| `$PDD verify-link <subject> <broker> --text '<body>'` | **browser モード**: あなたが読んだ Web メール本文から、ブローカーの確認リンクを抽出する（フィッシング対策のスコア付き） |
| `$PDD poll-verification <subject> [--broker <id>]` | **programmatic モード**: IMAP をポーリングして確認リンクを取得する（フィッシング対策のスコア付き）。`submitted → verification_pending` を自動で進める |
| `$PDD render-email <subject> <broker> --listing <url>` | 下書きのみ（メールモード未設定時のフォールバック） |
| `$PDD due <subject>` | 再チェックの時期が来たケース（cron 再スキャンのキュー） |
| `$PDD tasks <subject>` | 人向けタスクを 1 つにまとめたダイジェスト（実行の最後に提示する） |
| `$PDD status <subject>` | Markdown の状況レポート |
| `$PDD report <subject> --sheets` | Google スプレッドシートのトラッカー用の行 |

## バッチ運用（2 フェーズ: 全件クロール、その後に削除） {#batch-operation-two-phase-crawl-all-then-delete}

ブローカーが数件を超えるなら、ブローカーごとにではなく **map → reduce → act** として実行します。

- **フェーズ 1 — DISCOVER（読み取り専用、並列、冪等）。** まず*すべての*ブローカーをクロールし、
  それぞれに判定を記録します（`found` / `not_found` / `indirect_exposure` / `blocked`）。スキャンには
  副作用がないため、並列化と再試行を安全に行えます。行動する*前に*露出の全体像を得ておくことが、
  下記のクラスタ重複排除と優先順位付けを可能にします。**既定では、親が `web_extract` プローブを直接
  駆動します** — 多くの人物検索サイトは、氏名／電話／住所の結果を静的 HTML でレンダリングするため、
  `web_extract` が数秒で読み取ります。`browser_*` へのエスカレーションは、JS のみのわずかなサイトに
  限り、`delegate_task` サブエージェントへのエスカレーションは、本当に*推論*が重い作業（大規模な同名
  異人／親族の判別）に限ります。**ブラウザツールのサブエージェントに大量のブローカーリストを渡して
  クロールさせては いけません** — 実地では、ブラウザ操作が重いためこれが何度もタイムアウトしました
  （600 秒、それぞれ約 5〜6 ブローカー、要約なし）。生き残った台帳の書き込みは、親の `web_extract` の
  10 倍のコストで得られたものでした。`blocked`（DataDome／Cloudflare／`antibot`）のサイトもサブエージェント
  の仕事ではありません。`blocked` と記録し、ステルス／クラウドブラウザ（Browserbase）のパス用に再キュー
  投入します。サブエージェントのレポートは自己申告です — 親は、`found` を信頼する前に主要な URL を
  再取得して確認します（これは両刃で、親が誤って偽陽性と思い込んでいた実在の掲載を捕まえたこともあります）。
- **REDUCE — `$PDD plan <subject> --batch`。** クロールを、フェーズ志向の計画に畳み込みます。次の
  アクションでグループ化し、**所有クラスタを畳み込み**（子を消す親の削除は N 件ではなく 1 アクション。
  例えば 1 件の Intelius／PeopleConnect の抑制が Truthfinder／Instant Checkmate／US Search／…をカバー
  します）、`next_actions` を表示します。未スキャンが 1 件でもあれば `phase` は `discover`、なければ
  `delete` です。
- **フェーズ 2 — DELETE（逐次、不可逆）。** 畳み込んだグループを**親から先に**進めます。
  `plan --batch` は `found` グループをクラスタの親優先（子が最も多いものを先頭）で並べ、親ごとに
  調整済みで順序どおりのステップを持つ `parent_playbook` を出力します。その順序とステップに従って
  ください（完全なレシピは `references/methods.md` の「Ownership clusters - DO PARENTS FIRST」）。
  クラスタの親を（カバー済みの子はスキップして）処理し、**各親が確定したらその子を再スキャンし**
  （通常は消えます）、それから独立した掲載を処理します。`indirect_exposure` のケースは CCPA／GDPR の
  PII 削除メールとして送り（`send-email --kind ccpa_indirect`）、`blocked` はステルスブラウザのパスへ
  先送りします。オプトアウトは CAPTCHA、メール確認のループ、セッション連動にぶつかります。それらは
  **一件ずつ、慎重に**進めてください（これはファンアウトの逆です）。ただし `autonomy=full` では
  送信ごとに許可を求めて止まってはいけません。`assisted` では一件ずつ確認します。ブローカーが両方を
  提供する場合（Spokeo／BeenVerified）は、**通常は抑制より削除を選びます** — ただしレコードの
  `deletion.prefer` に従ってください。**PeopleConnect は例外**（`prefer: false`）で、ここでは自分の
  ユーザーデータを削除すると抑制まで消え、公的記録の再掲載も止まらないため、代わりに抑制して維持します。
- **ブラインドオプトアウトが既定であり、フォールバックではありません。** **削除チャネルにアクセスできる
  すべてのサイトで、たとえ掲載を先に確認していなくても**、オプトアウト／削除を送信します。これは対象者
  自身の識別子を、ブローカー自身の公式チャネルにだけ開示するので、最小開示に反しません。系として 2 点。
  （1）メール＋生年月日＋氏名が一致して「該当なし」と返すガイド付きフローは、どんなスクレイプより
  **強い `not_found`** です — オプトアウトのフローが検索も兼ねます。（2）フォームが自動化に敵対的
  （ハード CAPTCHA、Cloudflare／DataDome、スライド認証）なら、`blocked` と記録するより、**ブローカーが
  掲げる権利請求メール**（氏名＋州＋連絡先メールのみ）を既定にします。CAPTCHA の方針: 挙動／トークン／
  スライダーの課題は決して破らない。対象者自身のオプトアウトで、静的な歪み文字や単純な算数の CAPTCHA を
  読むのは可です。ただし正答後にサイトが送信全体を拒否するなら止めます（自動化を指紋採取しています）。
  第三者／間接のレコードは例外で、行動する前に必ず確認します。サイトごとの作戦と、メタ検索の無意味な
  スキップリストは `references/site-playbooks.md` に、方針の全文は `references/methods.md` にあります。
- **PeopleConnect の削除は抑制を消す（恒久ルール）。** PeopleConnect の*削除*は抑制を消し、対象者は
  アフィリエイトクラスタ全体で再掲載されます。「Your deletion request for PeopleConnect.us is Complete」
  というメールが現れたら、抑制は失われています → **抑制を再実行し**、Control ステップが「suppressed」と
  読めることを再確認します。このクラスタを削除完了の状態で決して放置しないでください
  （`references/brokers/intelius.json` を参照）。

サブエージェントのレポートは自己申告です。親は `found` を記録する前、そしてどの削除の前にも、主要な
主張（掲載 URL、一致の根拠）を再検証します。

## 手順（自律ループ） {#procedure-the-autonomous-loop}

1. **セットアップ（一度、質問なし）。** `$PDD setup --auto` を実行します — 機能を検出し、最も自律的で
   有効な組み合わせを自ら設定します（`EMAIL_*` の認証情報があれば programmatic メール、Browserbase の
   キーがあればそれ、`age` バイナリがあれば age 暗号化、`autonomy=full`）。続いて `$PDD doctor` を
   実行し、準備状況の出力をオペレーターに**質問としてではなく情報として**見せて、すぐ先に進みます。
   より自律化できる要素（例: メールの認証情報）には触れつつ、待たないでください。
2. **インテーク＋同意（唯一の人との会話）。** `$PDD intake ...` を `--consent`（および
   `--consent-method`）付きで実行します。同意がなければエンジンは計画も行動も拒否します。氏名／別名、
   現在＋過去の居住都市、メール、電話をすべて一度で集めて、質問で戻らないようにします。カリフォルニア州の
   対象者では `references/legal/drop.md` も読みます。`next` が、登録済みの全ブローカー（約 545 件）から
   一度に削除する一発の `drop_submit` を提示します。これは最も効く単一のアクションです。それを提出し、
   `drop <subject> --filed` とします。CA 以外の対象者では、登録簿は個別の CCPA／GDPR メールでカバーします
   （`registry --search` のあと `send-email`）。人物検索サイトはいずれの場合も直接処理します。
3. **キューを空にする。** ループします。

   ```
   while true:
     q = $PDD next <subject>
     if q.actions is empty: break
     execute EVERY action in order; record each outcome via $PDD record
   ```

   `next` は次の順で出力します。`refresh_brokers`（キャッシュが古い）、`fanout_scan`／`scan_inline`
   （フェーズ 1 のクロール — ステップ 4 を参照）、`poll_verification`（進行中のメール確認）、
   `verify_removal`（期限の来た再チェック）、`optout_web_form`／`optout_email_send`（フェーズ 2、
   プレイブックのステップ付きで親優先）、`indirect_email_send`、`stealth_rescan`。人にしかできない作業は
   アクションとして現れず、`q.human_digest` に蓄積されます。`autonomy=full` では止まらずにアクションを
   実行し、`assisted` モードでは `confirm_first` に従います。
4. **スキャン（`next` がそう言ったら）。** `fanout_scan` では `$PDD fanout <subject>` を実行し、
   **`batch` ごとに 1 つの `delegate_task` サブエージェントを並列に立ち上げ、そのバッチの用意済みの
   `brief` を渡します** — 全ブローカーを自分で逐次スキャンしてはいけません。`scan_inline` では、
   わずかなブローカーを自分でスキャンします。いずれにせよ、各ブローカーは `references/methods.md` の
   ラダー（`web_extract` → `site:` プローブ → `browser_navigate` → `scrapling`）で**すべての**
   `search_vectors` エントリを通し、404 は判断不能（`not_found` ではない）、`antibot` が設定されていて
   ステルスブラウザがないときは `blocked` を記録し、対象者か同名異人／親族かを確認してから記録します。
   `$PDD record <subject> <broker> <found|not_found|indirect_exposure|blocked> --found <bool> --evidence '{"listing_urls":[...]}'`。
   親はサブエージェントの主要な `found` の主張を、信頼する前に再検証します。
5. **オプトアウト（`next` がそう言ったら）。** アクションは、各ブローカーレコード自身の `optout.playbook`
   の `steps` 付きで、親優先であらかじめ並べられています（フィールド検証済み。PeopleConnect、Whitepages、
   BeenVerified、Spokeo などのクラスタの親は、実地確認済みの正確なレシピを持ちます）。**通常は削除が
   抑制に勝ります**。アクションが `prefer_deletion` を持つときは、掲載を隠すフローだけでなく、レコードの
   DELETION レーンを完了します。代わりに `prefer_suppression`（**PeopleConnect** — 削除は抑制を消し
   再掲載を止めない）を持つときは、抑制フローを行って維持し、Delete ボタンは意図的なデータ消去のときだけ
   使います。方法ごとに次のとおりです。
   - **web_form** → `optout_url` を `browser_navigate`／`browser_type`／`browser_click` で駆動し、
     `disclosure_fields` だけを送信し、確認をスクリーンショットに撮り、それからアクションの `after` の
     record コマンドを実行します。プレイブックは削除権の `send-email` フォローアップで終わることが
     あります — それを行います（掲載の抑制だけでなく完全な消去）。
    - **email** → `$PDD send-email <subject> <broker> --kind <ccpa|gdpr|generic> --to <addr>
      --listing <url>` が、記録と開示を 1 ステップで行います（宛先はブローカーレコードが宣言する
      アドレスに固定。`next` は居住地から kind を選び、対象でない人に CCPA／GDPR を主張しません）。
      **browser** モードでは、宛先固定の `compose` ペイロードを返します。`compose.to` 宛の新規メッセージを、
      `compose.subject`／`compose.body` を厳密にそのまま、オペレーターの Web メール上で `browser_*` を
      使って作成し、送信します（パスワード不要）。**programmatic** モードでは SMTP 送信します。`next` は、
      人の関与が要るフォーム（電話コールバック／政府 ID）も、削除メールがあればそこへ回します — これが
      **レスキューレーン**（検証済みの Whitepages パターン）です。下書きのみのときは `render-email` ＋
      ダイジェストエントリにフォールバックします。
   - **captcha** → ソフト／マネージドの課題は既定のクラウドブラウザで自動的にクリアされます（通常どおり
     進めます）。ブラウザが通れないハードで対話的／挙動ベースの課題だけを `blocked` と記録します
     （ステルス／オペレーターブラウザのパス用に再キュー投入）。ソルバーサービスは決して使いません。
   - **phone_callback / account / gov_id / fax / mail / voice（T3）** で*削除メールがない*とき →
     エージェントのアクションには決してしません。`next` はすでにこれらをダイジェストへ回しています。
     記録します。`$PDD record <subject> <broker> human_task_queued --reason "..."`。
 6. **確認（`next` がそう言ったら）。** **programmatic** モードでは `$PDD poll-verification <subject>`
    が、届いた確認リンクを IMAP 経由で見つけます（フィッシング対策のスコア付き、状態を自動で進めます）。
    **browser** モードでは、ブローカーの確認メールをオペレーターの Web メールで開き、
    `$PDD verify-link <subject> <broker> --text '<body>'` を実行してリンクをスコア付けします。いずれの
    場合も**同じブラウザでリンクを開き**（いくつかのブローカーは、確認セッションを開いたブラウザに
    紐づけます）、フローを完了してから `awaiting_processing` を記録します。`confirmed_removed` は、確認の
    再スキャンで掲載が消えていることを示したあとにだけ付けます — 送信フロー自身の確認ページでは決して
    付けません。
7. **締めくくり（実行ごとに一度）。** `next` がアクションを返さなくなったら、`$PDD tasks <subject>`
   （まとめた人向けダイジェスト）が空でなければ提示し、続いて `$PDD status <subject>` を提示します。
   Sheets トラッカーが有効なら、`google-workspace` skill 経由で `$PDD report <subject> --sheets` の行を
   追記します。
8. **次の起動を予約する。** `next` は `next_wake_at`（最も早い再チェック期限）を返します。この skill の
   ループを対象者に対して再実行する `cronjob` を 1 つ作成します（プロンプト例: *「&lt;subject_id> の
   unbroker ループを実行して: `$PDD next` してすべてのアクションを実行して」*）。処理の期間、確認の
   ポーリング、再出現の掃引はすべて同じキューを流れるため、ケースは人の手をまったくかけずに前進し続けます。

## 落とし穴 {#pitfalls}

- **ブローカーがすでに表示している以上を、決して開示しないでください。** `disclosure_fields` だけを
  送信します。エンジンは SSN／ID 番号を自発的に出しません。あなたもそうしてはいけません。
- **同意なくして行動なし。** エンジンがこれを強制します。第三者を「調査する」ためにこれを回避しては
  いけません。
- **`send-email` は冪等でレート制限付きです。** すでに `submitted` 以降のケースの再送は拒否します
  （本当に再送が必要なときだけ `--force`）。SMTP 送信は `email_min_interval_seconds`（既定 20 秒）で
  ペース制御され、リトライ／バックオフします。「念のため」ループしてはいけません — SMTP の受け渡しが
  成功しても配信の証拠にはなりません。期限キューの再スキャンが本当の確認です。
- **台帳の書き込みはロックされます。** 同時実行（cron ＋手動）は安全に直列化されます。ロックタイムアウトを
  見たら、別の実行が書き込みの途中です — 終わるのを待ち、`.lock` を手で消さないでください。
- **自律性 ≠ 即興。** 完全な自律性とは、ステップの間で*尋ねない*ことであって、どのゲートも緩めません。
  ブローカーがフローの途中で計画した `disclosure_fields` より多くを要求したら、そのケースを止めて
  キューに入れ（`human_task_queued --reason`）、独断で追加の PII を開示すると決めてはいけません。
- **実行を質問で中断しないでください。** 設定の選択は `setup --auto` の仕事、人にしかできない作業は
  ダイジェストへ回します。実行の途中で正当な唯一の質問は、スキャンを妨げる欠けた身元情報（例: 都市が
  まったくない）だけで、それはインテークで集めておくべきものです。
- **`pdd.py` には `execute_code` ではなく `terminal` を使ってください**（秘密の消去＋出力の伏せ字が
  これを壊します）。
- **ドシエは既定で平文です**（JSON、`HERMES_HOME` の下に `0600`）。保存時の暗号化には
  `$PDD setup --encryption age` を実行します — ローカルの `age` 鍵を生成し、ドシエ＋台帳を暗号化します
  （監査ログはフィールド名だけを持ち、平文のままです）。これはうっかり／バックアップ／コミットでの
  露出を守るもので、`HERMES_HOME` 全体の読み取りは守りません。本当の鍵分離には `PDD_AGE_IDENTITY` を
  別のボリュームに設定します。`$PDD doctor` は、暗号化が（`age` がインストールされているかだけでなく）
  *実際に*有効かを表示します。
- **「無料検索から非表示」≠ 削除。** レコードが本当に消えたことを確認したあとにだけ `confirmed_removed`
  を付けます。有料ティアでの保持はレポートに記します。
- **ソフト CAPTCHA は既定でクリアされます。ハードなものと戦わないでください。** 既定のクラウドブラウザは
  マネージド／ソフトの課題を通常動作として通します（対象のブローカーは T1 のまま）。本当に通れない
  ハードで対話的なものは `blocked` と記録し、ステルス／オペレーターブラウザのパスに任せます — 第三者の
  ソルバーサービスや指紋偽装は決して使いません。
- **ブローカーのページは変わります。** フローが壊れたら、推測する代わりに `$PDD record ... blocked` と
  記録し、`references/brokers/` のブローカーファイルに再検証のフラグを立てます。
- **フィールド未検証のレコードは送信前に確認してください。** `confidence: auto` のレコードは BADBOOL の
  解析から来ました（`optout.notes`／`optout.links` を読み、本当のオプトアウト URL を確認します）。
  `confidence:
  documented` のレコード（いくつかの人物検索サイト）は、正しい公表オプトアウト URL を
  持ちますが**フィールド検証されていません**（データセンター IP に対して 403 を返します）。ですから
  初回はオペレーターの住宅用ブラウザでライブのフローを確認し、それから `last_verified` を設定します。
  フィールド検証済みのキュレーションレコード（`confidence` なし。例えばクラスタの親）は、確認済みの
  仕組みを持ち、優先されます。

## 検証 {#verification}

- `scripts/run_tests.sh tests/skills/test_unbroker_skill.py`（自己完結。ネットワーク不要）、または
  依存関係なしのランナー `python3 tests/skills/test_unbroker_skill.py`。
- 動作確認: `$PDD setup --auto && $PDD doctor && SID=$($PDD intake --full-name "Test Person"
  --email t@example.com --consent | python3 -c 'import sys,json;print(json.load(sys.stdin)["subject_id"])')
  && $PDD next "$SID"` を実行し、準備状況の要約と、順序どおりのアクションキューが出ることを確認します。
