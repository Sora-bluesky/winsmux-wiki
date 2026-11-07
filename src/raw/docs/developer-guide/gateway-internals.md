---
title: "ゲートウェイの内部"
description: "メッセージングのゲートウェイが起動し、利用者を認可し、セッションを振り分け、メッセージを届けるまで"
upstream_path: developer-guide/gateway-internals.md
upstream_blob: d5dbff3985ed556b0529244291b9ddd7eca24e94
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals
---

# ゲートウェイの内部 {#gateway-internals}

メッセージングのゲートウェイは、Hermes を 20 以上の外部メッセージングサービスへ、ひとつの共通の作りでつなぐ常駐プロセスです。

## 正式なグループのメタデータとプロファイルの探索 {#canonical-group-metadata-and-profile-discovery}

認証済みの正式な WebSocket は、`groups.capabilities`、`groups.list`、
`groups.state`、`groups.log` を `session:read` で使えるようにしています。`groups.create`、
`groups.rename`、`groups.disband` には `session:control` が要ります。これらは、持ち主の権限元のデータベースにある
ホスト型ルームのメタデータの取り決めをそのまま使います。明示した
`profile` の指定は、その権限元のホームを指していなければなりません。解散 (disband) は、
決着していないドライバーの作業が残るルームを、Stop を飛ばして消すのではなく拒否します。

これは **メタデータの管理であって、ホスト型ルームでの推論ではありません**。既存のローカルの
ホスト型ルームのドライバーは、いまも旧来の TUI のセッション処理を使っています。そのため正式な窓口は
`driver: false` を返し、送信・再試行・承認・相手への権限付与の操作を提供しているとは示しません。
グループのターンを実行するためにそのドライバーを読み込むこともありません。

`profiles.list` には `session:read` が要り、まず認証済みのプロファイルを、
表示用のメタデータとアバターの有無を含めて返し、続いて同じゲートウェイが扱う兄弟プロファイルと
ホスト型ルームの宛先を、探索用のメタデータとして返します。`include_sessions` の既定は
true です。`canonical_session` は最新の会話ではなく、`Bot Chat` という題名とぴったり一致するものを指し、
`last_session` は見えているローカルの会話のうち最も新しいものです（隠された行が選ばれることはありません）。
どちらも、その利用者が持ち主であるか、運用者として読めるローカルのチャットだけを数えます。
つまり、新しく発行された `local-*` のチャットと、アップグレード前のチャットのうち恒久的な結び付けのもとで
引き継がれたもの（古い id のまま）です。兄弟プロファイルの行に同じ項目が入るのは、この接続がすでに
セッションの操作をその兄弟へ振り分けている場合（ホスト単位の許可。Desktop の共有ソケットやダッシュボード）だけで、
その値は兄弟自身の権限元から、この接続の主体と権限で読み取られます。プロファイルに結び付いたチケットには
メタデータだけが返ります。退役中の兄弟、別の宛先へ振り分けられる名前で載っている兄弟、
保存先が応答しない兄弟も、メタデータだけです。起動中の兄弟は、まだ一覧に載りません。
行は、そのプロファイルの保存先が動いていない間は使い回されます。探索では、セッションの作成・復元・
アーカイブ解除をせず、自分用のデータベースの接続を開くことも、扱いをやめたときに閉じた接続を開き直すこともなく、
推論もしません。

## 正式な付随情報の読み取り {#canonical-ancillary-reads}

Desktop と Ink は、認証済みの `session.control.read`、`process.list`、
`subagent.list`、`subagent.tail` を `session_id` 付きで使います。これらには
`session:read` と、持ち主のプロファイルとセッションの身元が要ります。この定期的な問い合わせは、
止まっているセッションを復元しません。先に `session.resume` を使ってください。役目を終えた経路の結び付けは、
差し替え先の会話を見せるのではなく `stale_generation` を返します。

制御情報の読み取りは、実際の会話記録に保存されたゴール、ループ、ハートビートを、
既存のフロントエンド向けの項目許可リストを通して見せます。管理役を組み立てることも、
待ち合わせの関門を外すこともしません。リビジョンは見えているスナップショットのハッシュです。時間付きの待ち合わせの関門は、
保存された状態を変えないまま期限を過ぎて消えることがあります。
プロセスの読み取りは、すでに持っている登録簿のオブジェクトを使い、上限付きの出力の末尾を含めます。
プロセスを回復させたり、通知を消費したり、保持している受領記録を走査したりはしません。
サブエージェントの読み取りには、セッション ID が同じというだけでなく、いまの親が生きたオブジェクトとして
祖先にあることが要ります。末尾は 16 KiB までです。見つからない子や役目を終えた子は
`available: false` を返します。これは読み取りであり、子への指示や停止の操作ではありません。

`subagent.list` の行には `child_session_id` も入ります。これは子自身の保存されたセッションです
(まだないうちは `null`)。子の保存された会話記録は、動いている間も終わった後も、
`subagent_id` を付けた `session.transcript` で読めます ([ゲートウェイのローカルセッション](/hermes/docs/developer-guide/gateway-local-sessions/) を参照)。

管理されたワーカーの方針では、プロセスとサブエージェントの読み取りに `unsupported_projection` を返します。
持ち主のプロセス内の登録簿では、別のインタープリターの様子を正しく描けないからです。
制御の変更 (`session.control`)、プロセスの変更、サブエージェントへの指示は、
これらの読み取りの見せ方では有効になりません。

## 共有権限元の保留中入力のスナップショット {#shared-authority-pending-input-snapshots}

`session.resume` は、保留中の受け入れそれぞれについて、元の `input_id` と
確定した公開用の `text` を、正式な `admission_id`、順番、状態とあわせて返します。
メッセージングサービスからのネイティブな入力も、ローカルのクライアントからの入力も含みます。スナップショットは、
非公開のネイティブな経路情報、送り元、認可の包みを見せません。送信と受領の
ACK の形は従来のままです。クライアントは、取り消しや受領の問い合わせに `admission_id` を使ってください。
元の入力 ID と同じだと決めつけてはいけません。
キューへの受け入れ、引き受け、取り消し、決着のときにも、接続中の閲覧側へ `session.info` が配信されます。
その `pending` の行は、resume と同じ見せ方です。決着時は、この状態を
`message.complete` より前に配信し、終わりのイベントがそのターンの最後のイベントになるようにしています。
Desktop は、どちらの経路も既存の
`pending_submissions` のキューの保存先へ変換します。

持ち主のゲートウェイが落ちたときに `started` だったターンは、次の持ち主が
`unknown` として回復させます。Hermes はどの副作用が起きたかを証明できないため、
入力をやり直すことも、その後ろに並ぶターンを動かすこともしません。`prompt.resolve_unknown`
(`session:control`、引数は `session_id`、`admission_id`、`execution_generation`)
で、失われたことを認めます。その行は `interrupted` として決着し、セッションの FIFO が再開して、
後続が1回だけ動きます。世代は、unknown の行に刻まれたもの
(resume や `session.info` の見せ方で見えます) でなければならないため、古い行やすでに解決済みの
行は `stale_generation` で拒否されます。Desktop は、そうした行をキューの欄に
「Turn lost during restart」と表示し、**Discard** ボタンを付けます。ゲートウェイの CLI では
`/discard <admission_id>` として使えます。失われた入力は、利用者が送り直せるよう会話記録に残ります。
破棄すると、その入力は (失敗したターンと同じように) Hermes の通知で閉じられるため、
後続のモデルへのリクエストに混ざることはありません。

このように止まったセッションのメッセージング利用者 (Telegram、Discord など) には、
一時停止の1回につき一度だけ、アダプターの通常の返信経路で、会話が止まっていることと
`/reset` で新しい会話を始められることが伝えられます。同じ停止中に届いた以降のメッセージは、黙って受け入れられ
キューに残ります。その配達待ちは、アダプターのループを止めておくのではなく、停止の理由とともに解放されます。`/reset` は
経路を新しいセッションへ切り替えます (失われたターンとその後続は古いセッションに残ります)。
運用者は代わりに、Desktop や CLI から unknown の行を解決することもできます。

## 共有権限元のプロンプト添付 {#shared-authority-prompt-attachments}

`prompt.submit` は、`text` と並べて、省略できる `attachments: [{path, mime}]` の一覧を受け付けます。
クライアントは画像のバイト列を、プロファイルの画像キャッシュ (配信中の
`HERMES_HOME` の下の `cache/images/`。メッセージングのアダプターがダウンロードを置くのと同じ場所) に置きます。パスは
そのディレクトリの直下にある通常のファイルで、`mime` は画像の種類
(`image/png`、`image/jpeg`、`image/gif`、`image/webp`) でなければなりません。1回の送信につき 10 個まで、それぞれ
`gateway.max_inbound_media_bytes` 未満です。権限元は受け入れの時点でバイト列を、
書き換えのできない `native-inputs` の保存先へ写し、sha256 で確かめた参照を
非公開の中身に記録します。そのため、置いたファイルを後で書き換えたりキャッシュを掃除したりしても、
持ち主の再起動後も含めて、実行される内容は変わりません。実行時には、それらを
`MessageEvent.media_urls`/`media_types` へ戻し、通常の画像の振り分け
(`agent.image_input_mode`、ネイティブな `image_url` の部品か、文字での事前解析か) が適用されます。
文字だけの送信は、`{text}` の中身と指紋を変えません。ACP のトランスポートの
エージェントは、画像、画像のリソースリンク、埋め込み画像のプロンプトブロックにこの仕組みを使います。
Ink と Desktop は、いまも旧来の `image.attach`/`file.attach` の RPC で添付します。

## ネイティブな受け入れの起動時の回復 {#native-admission-startup-recovery}

通常のゲートウェイの起動では、アダプターの接続、
経路の公開、起動時の復元の関門を経てから、受け入れ済みのネイティブな入力を回復させます。対象は、一度も始まっていない
キューの作業だけです。回復ではいまの経路の索引と接続済みのアダプターを使い、
送り手の認可と、保持しているコネクターとプロファイルの結び付けを確かめ直します。経路、トランスポート、認可の
どれかが使えないときは、行をキューに残します。その設定を戻せば、
後の起動で回復できます。

始まっていた受け入れが中断されると `unknown` になり、そのセッションの FIFO を止めます。
後続は自動では動きません。旧来の合成された再起動のターンは、
正式な受け入れの履歴を持つセッションからは外されるため、永続的な
キューと競合したり、unknown による停止をすり抜けたりできません。完了した入力が再起動で推論し直されることはありません。
`gateway.multiplex_profiles` のもとでは、起動処理が配信するプロファイルのホームごと
(既定のものと、`profiles/` の下のすべてのディレクトリ) にセッションの権限元を1つずつ作ります。それぞれは
そのホームの `state.db` に結び付き、そのプロファイルの実行時の範囲の中で動きます。すべての
受け入れの経路 (ボットのメッセージ、`/p/<profile>/` の API と webhook、cron の発火、かんばんの
振り分け、ネイティブな CLI・Desktop・ACP の接続) は、振り分け先の
プロファイルのホームから権限元を決めます。そのため、回復、FIFO の順番、ちょうど1回の決着はプロファイルごとに保たれ、
二番手のプロファイルの行が既定のプロファイルの台帳に入ることはありません。配信中の二番手のプロファイルの
クライアントは、既定のホームの記述 (`served_profiles`) から多重化の仕組みを見つけ、
自分の `profile_id` でその制御ソケットに接続します
([ローカルの制御ソケット](#local-control-socket-public-client-contract))。

## 共有権限元のローカルのスラッシュコマンド {#shared-authority-local-slash-commands}

認証済みのローカルのセッションは、`slash.exec({session_id, command})` と
`command.dispatch({session_id, name, arg})` を受け付けます。どちらも既存のコマンドの登録簿と
ゲートウェイの処理を使い、旧来のスラッシュ用ワーカーや2つ目の実行環境は使いません。
省略できる `profile` の指定は、持ち主のデーモンのプロファイルと一致しなければなりません。呼び出し側からの送り元や
経路の上書きは拒否されます。認証済みの別の利用者がそのセッションを
操作することはできません。

対応している読み取りのコマンドは、`/help`、`/commands`、`/status`、`/context`、`/version`、
`/whoami` (`session:read`) です。`/title` は問い合わせだけでも `session:control` が要り、
既存の「処理中なので拒否」の動きもそのままです。登録簿の別名も使えます。処理の結果は
`{type: "exec", output}` の形です。

スキル名と、設定した quick command の別名 (対応するコマンドやスキルを指すもの) は、
持ち主のプロファイルで解決されます。スキルの解決には `session:submit` が要り、
`{type: "skill", name, message, display}` を返します。Desktop と Ink は、展開された
メッセージを通常の身元付きの `prompt.submit` で送ります。解決は
受け入れの ACK ではありません。再試行と実行は権限元の永続的な FIFO が受け持ち、スキルの
内容は、キャッシュされたシステムの先頭部分を変えずに、利用者のメッセージのまま扱われます。

`type: exec` の quick command とプラグインのスラッシュコマンドには `session:control` が必要で、
メッセージングのゲートウェイ自身の quick/プラグイン振り分けを通して実行されます（スラッシュのアクセスポリシー、
無害化した環境変数での実行と30秒の上限、出力の伏せ字処理、プラグインのセッション環境変数）。

それ以外のコマンドは `unsupported_command` を返します。設定や実行環境の変更、ライフサイクルのコマンド、承認や秘密情報の
スラッシュショートカットは提供していません。世代に結び付いた既存の承認と中断の
RPC は別のままです。カタログに載る範囲は、確認済みのこの実行範囲より広くなっています。

## 共有権限元の処理中の入力と修正 {#shared-authority-busy-input-and-corrections}

`config.get({session_id, key: "busy"})` は、そのセッションで固定された処理中の入力の
設定を見せます。`config.set({session_id, key: "busy", value})` は `interrupt`、
`steer`、`queue` のどれかを受け付け、その動いているセッションの設定だけを変えます。この設定は、
持ち主が再起動するまで、そのセッションの閲覧側で共有されます。どちらの操作も、プロファイルの設定や
キャッシュされたエージェントとシステムのプロンプトは変えません。ほかの設定キーは、このアダプターでは扱いません。

`session.steer` と `session.redirect` には、`session_id`、`text`、いまの
`execution_generation` に加えて、認証済みのセッション制御の権限が要ります。省略できる
`profile` は権限元と一致しなければなりません。どちらの操作も、すでに動いているエージェントを対象にします。
steer は通常の修正の受け渡しを使います。redirect は進行中のモデルへのリクエストを取り消し、
同じターンを続けます (ツールの切れ目では steer として扱います)。新しく
キューへ受け入れることも、黙って新しいターンへ切り替えることもしません。`queued` (steer) と
`redirected` は、実行環境が受け取ったことを示すだけで、落ちても残る配達を保証するものではありません。あいまいな返事を
自動で再試行しないでください。`rejected` は、実行環境が修正を受け付けられる時間帯を逃したことを示し、
`stale_generation` は決着済みや差し替え済みの作業を拒否したことを示します。
管理されたワーカーでの修正は、いまは `unsupported_control` を返します。通常の永続的な
キューへの送信と Stop は、別の操作のままです。

## 共有権限元の準備状況の確認 {#shared-authority-setup-readiness}

認証済みのローカルのクライアントは、セッションを作る前に `setup.status` と `setup.runtime_check` を
呼べます。どちらも `session:create` が要り、デーモンが持つ
プロファイルに対して動きます。ほかのプロファイルの指定は拒否されます。実行環境の準備状況の確認では、
既存のプロバイダーの解決処理をイベントループの外で使い、旧来のセッションの
実行環境は作りません。プロバイダーの認証情報がないときは、準備失敗という結果のままで、
初期設定を飛ばす抜け道にはなりません。

## 共有権限元の聞き返しの取り決め {#shared-authority-clarification-protocol}

HTTP/WebSocket の窓口が `SessionAuthority` に結び付いているとき、接続中で認可された
閲覧側は、`clarify.request` のイベントと、`session.resume` の
`prompts` のスナップショットにある保留中の質問を受け取ります。これは権限元の API の取り決めであり、
どのネイティブなフロントエンドもすでに共有のフォームを表示できるとか、通常の起動処理が完成しているとかいう意味ではありません。

返答には、`session_id`、`execution_generation`、`prompt_id`、
文字列の `answer` を付けた `clarify.respond` を使います。接続中の閲覧側は購読していて、
`session:respond` を持っていなければなりません。権限元は動いている世代を確かめ、既存の
ネイティブな聞き返しの待ち手を、プロンプト ID の完全一致で解決します。利用者のプロンプトを受け入れの
キューに足すことはありません。最初の返答が採用され、切断してもそれは取り消されません。ネイティブ側の返答とタイムアウトも
同じプロンプトを終わらせ、`clarify.settled` を出します。返答の文字列は
制御の再生ストリームには入りませんが、通常の聞き返しツールの結果は
会話の一部になります。質問と選択肢のラベルには、既存の表示用の伏せ字処理がかかります。

配信は、ネイティブ側のカードが届いた後に行われます。ネイティブ側への配達に失敗したときは、
操作できる共有のフォームは作られません。通常の承認は、別の `approval.respond` の
権限の経路を使います。sudo や秘密情報のプロンプト、デーモンの再起動後の永続的な制御の復元は、
この聞き返しの経路では実装されていません。

## リビジョンを確かめるセッションのメタデータ {#revision-checked-session-metadata}

権限元に結び付いた WebSocket は、登録済みのセッションに対して `session.mutate` を受け付けます。
引数は `session_id`、`request_id`、`expected_revision`、`operation`、
`payload` です。`rename` は `{"title": "New title"}` だけを、`archive` は
`{"archived": true}` か `{"archived": false}` だけを受け付けます。呼び出し側には `session:control` が要ります。
いまのリビジョンは、`session.resume` のセッションのハンドルから得られます。

編集とその再試行用の受領記録は、まとめて確定します。同じリクエストを繰り返すと、
リビジョンをもう一度増やさずに元の結果を返します。同じ ID を
違う内容で使い回すと `admission_conflict` を返します。古い
リビジョンで競合する編集は `revision_conflict` を返します。終了処理中は、新しい変更や新しい
セッションの登録を、経路の決定や会話記録の作成の前に拒否します。これらの編集は
動いているターンを中断しません。正式なリセット、削除、巻き戻し、モデル、分岐、
圧縮の操作も、同じ受領記録の境界を使います。`branch` は、省略できる
`title` と `through_message_id` (残す最後のメッセージの行 ID。アシスタントの切れ目に答えるツールの結果も
いっしょに残ります) を受け付けます。指定しなければ、有効な会話記録全体が
写されます。リクエストが切断されても、
持ち主が抱えている変更は取り消されません。確定、実際の見せ方の更新、キューの
起こしはまとめて終わり、プロファイルの引退はその作業を待ってから
保存先を手放します。同じ古い受領記録が、新しく動いているエージェントを追い出すことはできません。

正式な通信のモデルは `tui_gateway/contracts/canonical*.py` にあり、そこから
`CanonicalRpcMethods` と OpenRPC の `x-canonical-methods` のカタログを、
単独の取り決めとは別に作ります。引数と成功時の結果の両方が検査されます。

ACP と、終わりのある CLI の閲覧側は、受け入れた
入力が unknown の実行の後ろで止まると、回復のための明示的な通知を出して切り離されます。受け入れた入力は
キューに残ります。送り直すのではなく、失われたターンを解決してから続けてください。

## 非公開の制御リクエストのワーカー {#private-control-request-workers}

POSIX の制御の待ち受けは、自分専用の実行器 (executor) を2つ持ちます。ひとつはホスト型の生産者 (producer) の
リクエスト用、もうひとつはそれ以外のすべての制御リクエスト用です。`hosted-producer` の操作は、
`hosted-attest` と `identify` を通して同期的に呼び返し、そのあと持ち主のループで正式なセッションの作業を待ちます。
そのため、その呼び返しが、それを待っている生産者の後ろに並んではいけません。また、どちらのプールも、
セッションの作業が使うループの既定の実行器を占有しません。各プールのワーカー数は
`ThreadPoolExecutor` の既定値で、キューに上限はありません。同じ種類の遅いリクエストが同時に十分な数届けば、
いまも互いの後ろに並びます。分けたことで取り除かれるのは、生産者と呼び返しの間の依存の循環だけです。
リクエストの割り当ては、既存の相手と包み (envelope) の検査の代わりにはなりません。

待ち受けを止めると、キューにある作業を取り消し、両方のプールを退役させます。すでに動いている
処理は、既存の RPC の期限をそのまま持ちます。再起動した待ち受けは新しいプールを使います。
Windows の名前付きパイプの待ち受けは、これまでどおりネイティブなワーカーのライフサイクルで動きます。

ホスト型ルームの回復は、方針のチェックポイントの作業より前に、保存された停止を処理します。
結果の定まらない正式な試行が解決されるのは、そのタスクと実行の世代をちょうど指定した保存済みの Stop があり、
かつメンバーがその試行を動いていないと報告したときだけです。
ルームのタスクを取り消し済みにする前に、メンバーの正式なキューが取り消しを認めなければなりません。
動いていない `unknown` の試行そのものは、認めたことにはなりません。
解決すると、メンバーのキューが実際に確定した結果が報告されます。その持ち主がターンの完成した答えを
まだ持っていた (決着の書き込みだけが失敗した) ときは、答えが確定され、ルームはタスクを取り消すのではなく、
それを決着させて一度だけ公開します。結果の定まらない試行の破棄も、同じ規則に従います。
これにより履歴が保たれ、失われたターンをやり直さずに、次のグループの入力へ進めます。

## 非公開のネイティブな HTTP 認証 {#private-native-http-authentication}

権限を持つデーモンは、同じ利用者の非公開の制御ソケットから、**リクエストごとに新しい、1回だけ使える HTTP の許可** を
受け付けます。`session-ticket` には、ちょうど
`profile_id` (正式な配信中の主ホーム)、`instance_id` (準備のできたデーモンの
起動 ID)、`purpose: "native-http"` を付けて送ります。返ってくるチケットは 30 秒で期限が切れ、
`http:owner` だけを持ちます。ネイティブな
メインプロセスから `X-Hermes-Gateway-Ticket` に入れて送ってください。URL、Cookie、公開の記述、レンダラーの設定、
ログには決して入れないでください。公開ページを読み取ってダッシュボードのトークンを得ることもしないでください。

既存の HTTP 認証の継ぎ目は、一致する
準備済みのデーモンと主プロファイルに対してだけ許可を引き換えます。信頼済みプロキシによる書き換えの前に捉えた、
実際のループバックのソケットの相手であることと、**Origin ヘッダーがまったくないこと** (空の
Origin も拒否されます) が必要です。無効、重複、期限切れ、再使用、目的違いの
ヘッダーは 401 を返し、渡された固定のトークンや OAuth の Cookie には切り替えません。
終了処理中や準備前の待ち受けは受け入れを拒否し、再起動と停止で許可は取り消されます。
HTTP の許可で WebSocket は認証できず、対話用・公開用・ワーカー用の許可で
HTTP は認証できません。このヘッダーのないリクエストは、従来どおりの固定の
セッショントークン、OAuth の bearer や Cookie、Host、経路ごとのトークン提供の関門を通ります。

このローカルの起動処理は、同じ OS の利用者に限った明示的な管理の境界であり、
リモートのクライアントのための OAuth の抜け道ではありません。公開用のプロキシは、リモートの呼び出し側の
認証情報を自分のネイティブな許可に差し替えてはいけません。また、同じ OS の利用者としてすでに動いているコードに対する
ファイルシステムのサンドボックスでもありません。

ネイティブな許可で、URL や JSON の `profile` の指定によってデーモンの対象を変えることはできません。
渡した指定はどれも、配信中の主ホームを指していなければなりません。既存の
設定の `current`・空・既定名の取り決めはそのまま保ち、
`default` を任意の起動ホームの別名として扱うことはしません。プロファイルをまたぐ対象は
403 `profile_scope_mismatch` を返します。食い違う重複した問い合わせの指定も同じです。
`GET /api/profiles` と `GET /api/profiles/active` は、探索のメタデータの
取り決めを保ちます。探索で、ほかのプロファイルのデータへの権限が得られることはありません。セッションやサイドバーの
集計の経路には自分のプロファイルの明示的な指定が要り、cron のジョブの経路には
自分のプロファイルの明示的な問い合わせが要ります。全プロファイルのプロジェクトや会話記録の集計、
プロファイルの作成・取り込み・有効化、プロファイルの名前変更・削除は、
この主プロファイルの認証情報では許可されません。ネイティブなクライアントは、`all` を `current` に書き換えたり、
主プロファイルの許可を借りてプロファイルをまたぐ失敗を隠したりしてはいけません。

ネイティブな Desktop からプロファイルを作るときは、別の、同じ利用者の
`purpose: "native-profile-create"` の許可を使います。これは `profiles:create` だけを持ち、
`POST /api/profiles` でだけ受け付けられます。プロファイルの読み取り、
取り込み、有効化、名前変更、削除、WebSocket の利用は許可しません。既存の作成の
処理が名前と複製の設定を検証します。省略できる `soul` の内容は、
公開前の準備中のプロファイルの中に書き込まれるため、作成後の追加の
書き込みや、新しいプロファイルのゲートウェイの起動は要りません。適用されたことは `soul_set` で確かめられます。古い
リモートのバックエンドでは、プロファイルを明示した別の SOUL の更新が残っています。
Desktop はこの許可を作成の
リクエストごとに発行し、レンダラーへは決して送りません。その後のリクエストには、通常のプロファイルに結び付いた
許可を使います。期限、1回限り、デーモン、ソケットの相手、
Origin の検査も同じように適用されます。通常の `native-http` の許可で作成しようとすると、いまも 403 になります。

ネイティブな HTTP の連携は、`tests/gateway/test_native_http_auth.py` にある、実際の通常のデーモン・制御ソケット・TCP を使う
検査で確かめられています。あわせて、関門付きの OAuth や Cookie と、
実際のループバックでない相手の対照も検査しています。ただし、これでネイティブな Desktop の UI が同等であることや、
Windows や macOS ごとの起動処理の検証が済んだことにはなりません。

## 固定されたローカルの起動時の認証情報 {#frozen-local-launch-credentials}

ローカルの `session.create` の受領記録は、平文の API キーではなく、起動時の方針を保持します。
プロファイルの設定に直接書いた認証情報は、再起動後にその既存の非公開の
置き場所から借りてきます。このとき、正式なプロファイルのホーム、認証情報のパス、値の指紋、
固定された方針の身元が一致しなければなりません。プロバイダーのエンドポイントとリクエストの設定は、いまの設定ではなく、
固定された方針から取ります。認証情報が見つからないか変わっているときは、別のキーを選ぶのではなく、
安全側に失敗します。2つ目の秘密情報の置き場所は作りません。
認証情報を含むヘッダー、環境変数の対応表、端末の見せ方は、
永続的な方針の JSON からは伏せられ、同じ置き場所の検査を通して非公開のまま補われます。

作成のリクエストを再試行すると、いまの差し替え後の認証情報を結び付けずに、
元のセッションと方針を返します。その場で渡した `--api-key` は、権限元が動いている間だけ有効です。
再起動で取り消されるのはそのキーであって、設定にもとづくセッションではありません。インスタンスに結び付いた
認証情報の参照しか持たない古い受領記録は、失われた値を安全に取り戻せないため、
安全側に失敗したままです。その履歴は読めます。いまの認証情報を使うには、新しいセッションを作ってください。
認証情報の指紋は非公開のメタデータであり、公開の API の応答には決して含まれません。

CLI の費用と学習データ利用への同意は、ゲートウェイの探索とセッションの作成より前に行われます。
最上位の1回限りの起動も含みます。これがプロセス全体の設定になることはありません。

## 主なファイル {#key-files}

| ファイル | 役割 |
|------|---------|
| `gateway/run.py` | `GatewayRunner` の入口。`gateway/run_*.py` の兄弟ミックスイン (起動、アダプター、受信、ターン、実行中、ゴール、通知、終了など) と `gateway/slash_commands_*.py` のハンドラーを組み合わせます |
| `gateway/session.py` | `SessionStore`。会話の保存とセッションキーの組み立て |
| `gateway/delivery.py` | 相手先のサービスやチャンネルへメッセージを送り出す処理 |
| `gateway/pairing.py` | 利用者を認可するための DM ペアリングの流れ |
| `gateway/channel_directory.py` | cron の配信に向けて、チャット ID を読める名前に対応づけます |
| `gateway/hooks.py` | フックの発見・読み込みと、ライフサイクルイベントの振り分け |
| `gateway/mirror.py` | `send_message` のための、セッションをまたいだメッセージの写し |
| `gateway/status.py` | プロファイル単位のゲートウェイのためのトークンロック管理 |
| `gateway/platform_registry.py` | アダプターの登録簿、生成処理、同梱サービスプラグインの遅延ローダー |
| `plugins/platforms/<name>/` | 同梱のメッセージングアダプター (多くのサービスは `adapter.py` と `plugin.yaml` の組) |
| `gateway/platforms/` | 共通の `base.py` と、昔からの直接アダプター (Signal、API サーバー、Webhook など) |

## サービスの導入は任意 {#optional-service-installation}

ゲートウェイが動いていることと、OS のサービスとして入っていることは別のことです。`hermes gateway run`
はサービスがなくても動きます。メッセージングサービスを1つも設定していなくても同じです。

`hermes setup`、クイックセットアップ、`hermes gateway setup` は、対話で使っている利用者に一度だけ次のように尋ねます。

> Install the gateway service so Hermes starts automatically at login and keeps scheduled jobs and messaging available?

プロファイルの `gateway.service_install_choice` には、`null`、`install`、`decline` のどれかが入ります。
未設定は、導入してよいという意味ではありません。断ると `decline` が記録され、サービスの作成、
有効化、削除はどれも行いません。ゲートウェイのウィザードで **Start now** を選び、
サービスの導入を断ると、管理されていないゲートウェイが立ち上がります。無効化されたサービスが作られるわけではありません。
サービスとして残さない場合、ログアウトや再起動でメッセージングと予定された作業は止まります。マシンの電源が切れている間は、
ジョブは動けません。

対話のないセットアップや取り込みでは、取り込んだ設定が `install` でも、
入っていないサービスを導入しません。すでに入っているサービスはそのまま正として扱われ、
保存された設定にかかわらず起動できます。後から明示的に導入するには `hermes gateway install` を実行します。
選択が記録されるのは、導入に成功した後だけです。セットアップでもう一度尋ねてほしいときは、
`hermes config set gateway.service_install_choice null` で選択を戻してください。

セットアップの段取りは `hermes_cli/gateway_setup_service.py` にあります。その
`ensure_gateway_service` の補助関数は、実行環境を探したり自動で起動したりする汎用の API ではありません。
通常の呼び出しで、保存された設定だけを理由に、入っていないサービスを入れ直すことはありません。

## `hermes gateway ensure` {#hermes-gateway-ensure}

クライアント (Desktop、`hermes chat`、TUI) は、`hermes gateway ensure --json --timeout 60` で
プロファイルのセッションの実行環境を見つけるか起動します。概要は
[CLI の一覧](/hermes/docs/reference/cli-commands/#local-runtime-discovery-and-startup) にあります。

タイムアウトは、秒単位の有限で正の、全体の期限です (既定は `60`。負荷の高いマシンで
デーモンを冷えた状態から起動するのに足りる長さです)。
すでにある予約や起動中の持ち主は、置き換えずに待ちます。いないことが
確かめられたら、すでにあるサービスを優先します。管理されていないプロセスを
求めるのは、サービスが見つからないときだけです。このコマンドは、サービスの定義を入れたり書き換えたりせず、
linger を有効にせず、権限を昇格させず、更新の囲いも外しません。
持ち主があいまいなときや確かめられないときは、安全側に失敗します。

サービスの起動を求める前に、`ensure` はユニットやタスクの名前だけでなく、正式なプロファイルのディレクトリと
実行するアカウントを確かめます。Linux ではサービス管理の仕組みが読み込んだ
コマンドと環境 (有効な drop-in を含む) を使い、macOS ではディスク上の plist が最新だと決めつけずに
読み込まれた launchd のジョブを確かめ、Windows では
実際のタスクの XML、実行主体、導入されたランチャーを問い合わせます。

- `profile_mismatch`: 入っているサービスが、違うホームやプロファイルを指しています。
  そのサービスの `HERMES_HOME` とコマンドラインのプロファイルの指定を確かめ、
  一致するプロファイルを使うか、サービスの設定を明示的に直してください。
- `service_account_mismatch`: サービスが別のアカウントのものです。
  そのアカウントでクライアントを動かすか、使いたい利用者向けにサービスを明示的に設定してください。
- `service_identity_unverified`: サービス管理の仕組みが身元を確かめるのに十分な情報を出していないか、
  定義が対応していない動的な設定を使っています。
  `systemctl [--user] show <unit> --all`、`launchctl print <domain>/<label>`、
  `schtasks /Query /TN <task> /XML` で確かめてください。Linux の環境ファイル、PAM や動的な利用者、
  起動時のフック、別のルートファイルシステムは運用者の確認が必要です。
  任意のシェルのランチャーや、書き換えた Windows のランチャーのスクリプトは
  `ensure` では解釈しません。もう一度試す前に、意図したサービス管理の操作で、
  対応している明示的な定義に戻してください。

これらの拒否では、サービスを起動せず、設定を書き換えず、
管理されていない代わりのプロセスも立ち上げません。明示的に結び付けた標準の既定ルートと独自ルートの導入は
対象のままです。起動の求めが通っても、実際の準備状況の確認には合格しなければなりません。

POSIX では、ローカルの起動処理は、プロファイルのディレクトリの中の制御ソケットを信頼する前に、
そのディレクトリを確かめます。新しく予約したホームはモード `0700` で作ります。
既存の権限を `ensure` が変えることはありません。ホームは運用者が決めた
モードのままです (シンボリックリンクにした `~/.hermes`、`HERMES_HOME_MODE` の `0701`/`0750`、`0755` の
ホームのどれでも動きます)。読み取りと探索のビットでは、持ち主だけが使える (`0600`)
ソケットには何もできません。拒否するのは、別の利用者がソケットをすり替えるのに使える書き込みの権限だけで、
`inaccessible / unsafe_control_permissions` を返します。だれでも書き込める場合は常に拒否し、
グループで書き込める場合は、そのグループが持ち主専用のグループ (umask `002` での
利用者専用グループの既定) で、ほかのメンバーがおらず、アクセスの ACL もない場合を除いて拒否します。ソケット、
その指し先のファイル、代わりのソケットのディレクトリは、厳密に持ち主だけが使えるままです。
ローカルでの接続をもう一度試す前に、余分な書き込みのビットを外してください (`chmod o-w,g-w`)。

| 終了コード | 意味 |
|-----------|---------|
| `0` | 互換性のあるセッションの実行環境の準備ができています。 |
| `2` | 呼び出し方が正しくありません。無効なタイムアウトや知らない引数も含みます。 |
| `3` | 実行環境の取り決めや機能に互換性がありません。 |
| `4` | 認可またはプロファイルが一致しません。 |
| `5` | 期限に達しました。起動はまだ途中かもしれません。 |
| `6` | 実行環境が終了処理中か、更新中です。 |
| `7` | 実行環境に届かない、監督役が衝突している、または起動に失敗しました。 |

サービスの起動コマンドやプロセスの作成は、準備ができた合図ではありません。
セッションの権限元の機能をまだ出していないゲートウェイは、メッセージングのアダプターが動いていても、
期限まで `starting` のままのことがあります。終了コード
`5` を、その持ち主を置き換えてよいという許可と受け取らないでください。Windows で、スタートアップフォルダーだけの
導入の場合は、管理されていない代わりの起動ではなく、ログインが必要です。親のジョブから切り離せなかったときは、
弱いプロセスの分離で再試行するのではなく、そのことを報告します。

サービスとして残すかどうかは、セットアップで別に選ぶ任意のものです。取り込みや対話のない
セットアップでは、取り込んだ設定を理由に、入っていないサービスを導入しません。
[サービスの導入は任意](#optional-service-installation) を参照してください。

## ローカルの制御ソケット (公開のクライアントの取り決め) {#local-control-socket-public-client-contract}

各ゲートウェイは、ローカルの制御ソケットで待ち受けています。同じマシンのクライアントは、これを使って、
自分のプロファイルを受け持つゲートウェイを見つけ、Python を起動せずに WebSocket のチケットを受け取ります。
公開されている操作は3つで、`identify` (読み取り専用)、`resolve-profile`、`session-ticket` の公開の形です。
それ以外の操作、`session-ticket` の引数 `subject` と `scope`、`interactive` 以外の目的は、
Hermes の内部向け (Desktop、ダッシュボード、更新処理) で、変わることがあります。
ゲートウェイの起動や回復は、これまでどおり `hermes gateway attach --start` / `--recover` で行います
([下記](#hermes-gateway-attach))。

**包み (envelope)。** 1つの接続で運ぶリクエストは1つです。UTF-8 の JSON オブジェクト1つと `\n` (最大
64 KiB) を送ると、返事の行が1行 (最大 512 KiB) 返り、サーバーが接続を閉じます。リクエストは
`{"protocol": 1, "id": 1, "verb": "<verb>", "params": {...}}` の形で、`protocol` は整数の `1`、
`id` は整数か 128 文字以内の文字列です。`resolve-profile` と `session-ticket` は、
ほかの最上位のキーや、オブジェクトでない `params` を拒否します。返事は `{"ok": true, "protocol": 1, "id": <your id>, "result": {...}}` か
`{"ok": false, "protocol": 1, "id": <your id>, "error": "<text>"}` です。下に挙げる `error` の文字列も
取り決めの一部です。

**`resolve-profile`** は `{"home": "<absolute profile home>"}` を受け取り、
`hermes gateway attach` の探索がそのホームについて出すのと同じ判定を返します (接続できない判定でも
`ok: true` です)。余計なもののない絶対パスを送ってください。`.` や `..` の部分、続けて重ねた区切り文字、
末尾の区切り文字を含むパスは、無効な引数として拒否されます。パスの中のシンボリックリンクは解決されます。

| 項目 | 意味 |
|---|---|
| `resolve_protocol` | `1` |
| `state`、`reason_code`、`detail` | 探索の判定です。`ready`、`draining`、`starting`、`absent`、`inaccessible`、`incompatible`、`conflict` のどれかで、上限付きのコードと対処法が付きます |
| `attachable` | `ready` か、再起動でターンの終わりを待っている状態 (`draining`/`restart_wait`) です |
| `update_fenced` | 更新が導入先を押さえています。`hermes gateway attach --start` はこの判定をそのままは返さないため、起動したいクライアントは CLI を通します |
| `control` | `self` (プロファイル自身のソケット)、`host` (受け持つかもしれないプロファイルに代わって答える多重化の仕組み)、`null` (このゲートウェイのルートの外にあるホーム) のどれかです |
| `message` | 接続できないときに、`attach --json` が出力する `gateway <state>: <reason>` の各行です |
| `endpoint` | `null` か、`attach --json` の `endpoint` に `ws_url`、`ws_protocol`、`ticket_protocol_prefix` を加えたものです |
| `install_code_sha` | いまディスクに導入されているコミットです。`endpoint.code_sha` と違うときは、ゲートウェイが `hermes update` の後も古いまま動き続けています |

**`session-ticket` の公開の形:** `{"profile_id": <endpoint.profile_id>, "instance_id":
<endpoint.instance_id>, "purpose": "interactive"}` を送ります。機械的に問い合わせを繰り返すクライアントは、
`"restart_wait": "refuse"` も付けます。`profile_id` は `resolve-profile` が返したものをそのまま (ゲートウェイは
文字列として比べます)、答えたのと同じソケットへ送ってください。返事に `profile_id`、`instance_id`、
`runtime_protocol: 1` がそのまま返っていることを確かめてください。その `ticket` は `expires_in_seconds` (30) で期限が切れます。
次に、`ws_url` へ、サブプロトコル `[ws_protocol, ticket_protocol_prefix + ticket]` を指定し、ループバックから、
`Origin` ヘッダーを付けずに接続して、サーバーが `ws_protocol` を選んだことを確かめてください。
接続と再接続のたびに、新しいチケットを発行してください。

| 場合 | `error` |
|---|---|
| `resolve-profile`: 包みが正しくない | `PermissionError: invalid resolve envelope` |
| `resolve-profile`: `params` が絶対パスの `home` 1つだけではない | `PermissionError: invalid resolve parameters` |
| その操作より古いゲートウェイ | `unknown verb: 'resolve-profile'` (と `supported_verbs`)。`hermes gateway attach --json` を使ってください |
| 相手が自分の OS の利用者だと確かめられない | `PermissionError: authenticated runtime bootstrap unavailable` |
| `session-ticket`: 包みが正しくない | `PermissionError: invalid bootstrap envelope` |
| 引数が足りない、知らない引数がある、`restart_wait` が `refuse` 以外 | `PermissionError: invalid bootstrap parameters` (`restart_wait` より古い持ち主もこれを返します。付けずに一度だけ再試行してください) |
| `resolve-profile` の後に持ち主が再起動した | `PermissionError: stale runtime instance`。もう一度 resolve してください |
| このゲートウェイが受け持たないプロファイル、知らない目的 | `PermissionError: bootstrap binding rejected` |
| 未使用のチケットが 1024 個ある | `PermissionError: bootstrap capacity exhausted` |

**待ち合わせ場所。** ソケットのノードと、それを指す `gateway.sock.path` は、クライアントがプロファイルのホームの中で
触れる唯一のファイルです。これらは待ち合わせ場所であって、Hermes のデータではありません。ロック、状態ファイル、
設定は読まないでください。まずプロファイルのホームを試し、名前付きのプロファイル `<root>/profiles/<name>` (名前が
`.` で始まらないもの) なら、次にルートを試します。ルートの多重化の仕組みは、自分が受け持つプロファイルに代わって答えます。
どの候補も、Python の `Path.resolve` と同じように正規化してから使います。

- **POSIX (Linux、macOS):** 候補は、自分が持ち主で、ほかの人が書き込めないディレクトリでなければなりません
  (グループで書き込めるホームには、Python が行うグループの非公開性の確認が要ります。CLI を使ってください)。
  `<candidate>/gateway.sock` があればそれを使います。これは自分が持ち主で、グループやほかの人のアクセスがない
  ソケットでなければなりません。なければ `<candidate>/gateway.sock.path` を読みます (リンクをたどらずに開きます。
  自分が持ち主の通常のファイルで、モード 0600、4096 バイト以内)。その指し先は絶対パスで、
  `hermes-gw-<sha256 of the canonical home, 16 hex>/control.sock` で終わり、自分が持ち主の 0700 のディレクトリの中にある、
  自分が持ち主の 0600 のソケットでなければなりません。指し先の一時ディレクトリのルートを、自分の `TMPDIR` と比べないでください。
  **launchd** が起動したゲートウェイは独自の `$TMPDIR` (`/var/folders/…/T/`) を持っていて、正しいのは指し先のファイルのほうです。
  ノードがない、または接続を拒まれた (落ちたゲートウェイの残りもの) ときは、次の候補を試します。
  それ以外の検査に失敗したときは拒否として扱います。そこで止め、次の候補は試さないでください。
- **Windows:** パイプ `\\.\pipe\hermes-gateway-<sha256 of the normcased canonical home, 16 hex>` を使います。
  クライアントは、答えを信頼する前に、パイプのサーバーが自分の SID で動いていることを確かめなければなりません。
  確かめられないクライアント (Node) は、接続のたびに `hermes gateway attach --json` を使います。

`resolve-profile` に最初に答えた候補に尋ねてください。プロファイル自身のソケットから `profile_mismatch` が返ったときは、
次の候補を試します。それ以外は、その答えが判定で、そのソケットがチケットを発行します。
どの候補も答えないときは、ゲートウェイは動いていません。

**セキュリティの考え方。** 境界は、同じマシンの同じ OS の利用者です。ソケットが TCP のポートになることはありません。
POSIX では、ソケットはほかの人が書き込めないホーム (または 0700 の非公開のディレクトリ) の中にあるモード 0600 のもので、
ゲートウェイは接続のたびに、カーネルから相手の uid を読み取ります (Linux では `SO_PEERCRED`、macOS では `getpeereid`)。
チケットは自分と同じ uid にだけ発行し、相手の認証情報を報告しない環境では一切発行しません。
Windows では、パイプに利用者の SID だけを許可する保護された DACL を付け、リモートのクライアントを拒み、
最初のインスタンスを確保し、クライアントのトークンの SID がゲートウェイのものと同じであることを求めます。
チケットは 256 ビットの乱数で、ハッシュとしてだけ保存され、30 秒間有効で、1回限り使え、
ゲートウェイのインスタンス、プロファイル、目的に結び付き、ゲートウェイが止まると取り消されます。
チケットで認証できるのは `/api/ws` だけです。ゲートウェイはチケットをログに残しません。クライアントも、チケット、
サブプロトコルの一覧、CLI の標準出力をログに残したり、チケットを URL に入れたりしてはいけません。`resolve-profile` は
認証情報を持たず、`identify` と同じように、接続できる相手ならだれにでも答えます。ホームの中を見る前に、
答えるゲートウェイのルートと照らし合わせます。解決したホームは、ゲートウェイ自身のホームか、
そのすぐ下の名前付きのプロファイル `<root>/profiles/<name>` でなければなりません。そのため、ルートの外へ出る
シンボリックリンクは外側に解決され、拒否されます。そのうえで初めて、非公開のオーバーレイの
`gateway.lock` のリンクをたどります。たどる先も、同じ確認に合格する持ち主のホームに限られます。それ以外のホームには
`control: null` 付きの `profile_mismatch` を返し、ルートの外では何も開かず、作らず、変えません
(外へ届く呼び出しは、ホームのパスの解決と、ルートの中の
`gateway.lock` のリンクだけです)。受け付けたホームに対しては、探索と同じことをします。受け持っていないプロファイルの、
同じ利用者のロックが古い Hermes によってモード 0644 のまま残っていれば、
`hermes gateway attach` と同じように 0600 に狭めます。どれも、すでに自分の利用者や root として
動いているコードから守るものではありません。

この取り決めは `apps/shared/src/node/control-socket.vectors.json` で固定されています。どの言語のクライアントでも
再生できるリクエストと返事の組で、
`tests/gateway/test_control_socket_vectors.py` がゲートウェイに対して実行します。

## `hermes gateway attach` {#hermes-gateway-attach}

`hermes gateway attach --json` は、自前の UI を持ち、ゲートウェイへ自分で接続するローカルのクライアントのための、公開の接続手順です。
このコマンドは `hermes_cli/gateway_runtime_attach.py::attach_gateway` を実行します。これは Ink の TUI の `ui-tui/scripts/gateway_bootstrap.py` が
内部で使っているのと同じ関数なので、どちらのクライアントでも、探索、起動、回復の進み方と
判定の結果が同じになります。

| フラグ | 意味 |
|------|---------|
| (なし) | 有効なプロファイルを受け持つ持ち主を探します。持ち主を起動することはありません。 |
| `--start` | `ensure` と同じように、持ち主がいる状態にします (クライアントを初めて起動するときに使います)。 |
| `--recover` | 持ち主を探し、準備ができていない (落ちた、アイドル終了で終わった、停止された、または古い Hermes のゲートウェイが応答した) ときは、持ち主がいる状態にします。Ink が `OWNER_RECOVERY_LIMIT` でしているように、クライアントがこれを使う回数には上限を設けてください。そうすれば、落ちては起動を繰り返す持ち主が休みなく再起動されることはありません。 |
| `--timeout S` | `--start`/`--recover` での起動の期限です (既定は `60`)。探索とチケットの発行は、それぞれ最大 5 秒ずつ加わります。`--start` と `--recover` は同時に指定できません。 |

サービスが入っていないとき、`attach` はアイドル終了付きの管理されていないゲートウェイを起動します。このゲートウェイは、
クライアント、アダプター、ジョブのどれにも必要とされなくなると自分で止まり、次の `attach --start` で新しいものが起動します。
`attach` が起動したのが入っているサービスなら、`ensure` のときと同じように動き続けます。再起動でターンの終わりを
待っている間 (`draining`/`restart_wait`) も接続できるため、クライアントは保留中のプロンプトにまだ答えられます。
起動時の方針 (モデル、プロバイダー、ツールセット、cwd、かんばんのボード) は `session.create` で指定するものです。
このコマンドは、デーモンを起動する前に、それらの変数を自分の環境から取り除きます。

成功すると (終了コード `0`)、JSON を1行出力します。中身は `ensure` の項目 (`state`、`reason_code`、`detail`、
`endpoint`、`client_code_sha`) に、次のものを加えたものです。

```json
{"url": "ws://127.0.0.1:<port>/api/ws", "protocol": "hermes-gateway-v1",
 "protocols": ["hermes-gateway-v1", "hermes-gateway-ticket.<ticket>"], "ticket": "<ticket>"}
```

`endpoint` には、`profile_id`、`instance_id`、`capabilities`、`code_sha` などの探索の
項目が入ります。`url` へは、`protocols` を WebSocket のサブプロトコルに指定し、ループバックから、**`Origin` ヘッダーを
付けずに** 接続して、サーバーが `protocol` を選んだことを確かめてください。そのうえで `hermes-gateway-v1` でやり取りします。
まず `runtime.describe` で持ち主の `session.create` の取り決めを確かめ、次に `session.create` か
`session.resume` を呼びます。`client_code_sha` と `endpoint.code_sha` が違うときは、ゲートウェイが
`hermes update` の後も古いまま動き続けています。古いコードに接続し続けるのではなく、ゲートウェイを再起動してください (`hermes gateway restart`)。

チケットは、その WebSocket の唯一の認証情報です。チケットは、制御ソケットの
`session-ticket` の操作 (目的は `interactive`、範囲は `profile`) で、同じ利用者のソケット、Windows では
SID を確かめる名前付きパイプを通して発行されます。既定の多重化の仕組みが受け持つプロファイルは、
多重化の仕組みの制御ソケットからチケットを受け取ります。チケットは1回限りで、呼び出し側のプロファイルとその
持ち主の `instance_id` に結び付き、30 秒で期限が切れます。`attach` はチケットを、呼び出したプロセスのためだけに標準出力へ出し、
ログには決して残しません。新しく接続するたび、また再接続するたびに、`attach` をもう一度実行してください。
制御ソケットと直接やり取りするクライアントは、プロセスを起動せずに同じ判定とチケットを得られます。
[ローカルの制御ソケット](#local-control-socket-public-client-contract) を参照してください。

接続できる持ち主がいないときは、JSON に `message` が加わり、`url` と `ticket` は含まれません。`message` は
Ink が表示する判定です。まず `gateway <state>: <reason_code>` (コードがないときは `not ready`) の行があり、
続いて、拒否の対処法の各行、または起動に失敗したときの伏せ字処理済みの出力の各行ごとに、`gateway <state>: …` という行が1行ずつ並びます。
同じ文は標準エラー出力にも出ます。終了コードは、その判定に対する `ensure` のものと同じです。
持ち主には接続できたのにチケットを発行できなかった (持ち主がいなくなったか、許可を拒んだ) ときの
判定は `inaccessible`/`ticket_unavailable` (終了コード `7`) で、`detail` には上限付きの原因か、ローカルでの
修復コマンドが入ります。`attach` をもう一度実行してください。引数が正しくないときは、`ensure` の
`invalid_invocation` の行を出して終了コード `2` で終わります。

## 全体の眺め {#architecture-overview}

```text
┌─────────────────────────────────────────────────┐
│                  GatewayRunner                  │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Telegram │  │ Discord  │  │  Slack   │       │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │
│       └─────────────┼─────────────┘             │
│                     ▼                           │
│              _handle_message()                  │
│                     │                           │
│         ┌───────────┼───────────┐               │
│         ▼           ▼           ▼               │
│  Slash command   AIAgent    Queue/BG            │
│    dispatch      creation   sessions            │
│                     │                           │
│                     ▼                           │
│                 SessionStore                    │
│              (SQLite persistence)               │
└───────┴─────────────┴─────────────┴─────────────┘
```

## メッセージの流れ {#message-flow}

どのサービスからメッセージが届いた場合も、次の順に進みます。

1. **サービスのアダプター** が生のイベントを受け取り、`MessageEvent` の形に整えます
2. **共通のアダプター** が、そのセッションが実行中かどうかを見張ります。
   - そのセッションでエージェントが動いていれば、メッセージを待ち行列に入れ、割り込みを知らせます
   - `/approve`、`/deny`、`/stop` は見張りを素通りします (その場で処理されます)
3. **GatewayRunner._handle_message()** がイベントを受け取ります。
   - `_session_key_for_source()` でセッションキーを決めます (形式は `agent:{namespace}:{platform}:{chat_type}:{chat_id}`。namespace は既定のプロファイルなら `main`、多重化しているときは `<profile>` になります。[多重化したプロファイル](#multiplexed-profiles) を参照)
   - 認可を確かめます (下の「認可」を参照)
   - スラッシュコマンドなら、コマンドのハンドラーへ渡します
   - すでにエージェントが動いていれば、`/stop` や `/status` などのコマンドを横取りします
   - どれでもなければ、`AIAgent` を作って会話を進めます
4. **返事** は、来たときと同じサービスのアダプターを通って送り返されます

### セッションキーの形式 {#session-key-format}

セッションキーには、振り分けに必要な情報がすべて入っています。

```
agent:{namespace}:{platform}:{chat_type}:{chat_id}
```

たとえば既定のプロファイルなら `agent:main:telegram:private:123456789`、
多重化の仕組みがそのチャットをプロファイル `work` へ振り分けたときは `agent:work:telegram:private:123456789` になります
(`gateway/session.py::_session_key_namespace`。`main` という名前そのもののプロファイルは `main~` と印が付きます)。

スレッドを持つサービス (Telegram のフォーラムトピック、Discord のスレッド、Slack のスレッド) では、chat_id の部分にスレッド ID が入ることがあります。**セッションキーを手で組み立てないでください**。かならず `gateway/session.py` の `build_session_key()` を使います。

### 二段構えのメッセージ見張り {#two-level-message-guard}

エージェントが動いている最中に届いたメッセージは、2 つの見張りを順に通ります。

1. **一段目 — 共通のアダプター** (`gateway/platforms/base.py`): `_active_sessions` を見ます。そのセッションが動いていれば、メッセージを `_pending_messages` に入れ、割り込みを知らせます。ここで、ゲートウェイ本体に届く *前* に捕まえます。

2. **二段目 — ゲートウェイ本体** (`gateway/run_inbound.py`): `_running_agents` を見ます。特定のコマンド (`/stop`、`/new`、`/queue`、`/status`、`/approve`、`/deny`) を横取りして、それぞれの処理へ回します。それ以外はすべて `running_agent.interrupt()` を呼びます。

エージェントが手を止めているあいだにも本体まで届く必要があるコマンド (`/approve` など) は、`await self._message_handler(event)` で **その場で** 処理されます。競合を避けるため、背後のタスクの仕組みを通しません。

## 認可 {#authorization}

ゲートウェイの認可は何層かに分かれていて、次の順に判定されます。

1. **サービスごとの全員許可フラグ** (たとえば `TELEGRAM_ALLOW_ALL_USERS`)。設定されていれば、そのサービスの利用者は全員が認可されます
2. **サービスごとの許可リスト** (たとえば `TELEGRAM_ALLOWED_USERS`)。利用者 ID をカンマ区切りで並べます
3. **DM ペアリング**。認可済みの利用者が、ペアリングコードで新しい利用者を追加できます
4. **全体の全員許可** (`GATEWAY_ALLOW_ALL_USERS`、または `config.yaml` の `gateway.allow_all_users`。後者は `gateway/config_loader.py::bridge_core_env_settings` が環境変数へ橋渡しします)。設定されていれば、すべてのサービスの利用者が認可されます
5. **既定は拒否**。認可されていない利用者は弾かれます

### DM ペアリングの流れ {#dm-pairing-flow}

```text
Admin: /pair
Gateway: "Pairing code: ABC123. Share with the user."
New user: ABC123
Gateway: "Paired! You're now authorized."
```

ペアリングの状態は `gateway/pairing.py` が保存し、再起動しても残ります。

## スラッシュコマンドの振り分け {#slash-command-dispatch}

ゲートウェイのスラッシュコマンドは、すべて同じ流れで解決されます。

1. `hermes_cli/commands.py` の `resolve_command()` が、入力を正式な名前に直します (別名や前方一致にも対応します)
2. その正式な名前が `GATEWAY_KNOWN_COMMANDS` にあるかを確かめます
3. `_handle_message()` (`gateway/run_inbound.py`) が名前からハンドラーを引きます。`gateway/slash_commands_*.py` のミックスインにある `_handle_<name>_command` を、`gateway/run_busy.py` の `_IDLE_COMMANDS` と `_PLAIN_COMMANDS` をもとにした `_command_handler_table` から探します。`if canonical == ...` を並べた分岐はありません
4. 一部のコマンドは設定によって使える・使えないが決まります (`CommandDef` の `gateway_config_gate`)

### 実行中の見張り {#running-agent-guard}

エージェントが処理している最中に動かしてはいけないコマンドは、早い段階で断ります。

`_quick_key in self._running_agents` のあいだ、`gateway/run_busy.py` の `_dispatch_busy_slash_command()` が、認識できたコマンドを `CommandDef.busy_policy` と `busy_handler` に従って振り分けます。実行中用の変種 (`_busy_<key>_command`) があればそれを、無ければ `busy_policy` が許すときに通常のハンドラーを使い、どちらでもなければ断りの返事を出します (「⏳ Agent is running — `/model` can't run mid-turn…」)。

素通りするコマンド (`/stop`、`/new`、`/approve`、`/deny`、`/queue`、`/status`) には実行中用のハンドラーがあり、その場で処理されます。

## 設定の読み込み元 {#config-sources}

ゲートウェイは、いくつかの場所から設定を読みます。

| 読み込み元 | 何が入っているか |
|--------|-----------------|
| `~/.hermes/.env` | API キー、ボットのトークン、各サービスの資格情報 |
| `~/.hermes/config.yaml` | モデルの設定、ツールの設定、表示の設定 |
| 環境変数 | 上のどれでも上書きできます |

CLI は `load_cli_config()` を使い、既定値をコードに持っています。いっぽうゲートウェイは `config.yaml` を YAML ローダーで直接読みます。そのため、CLI の既定値の辞書にはあるのに設定ファイルには書かれていないキーは、CLI とゲートウェイで振る舞いが変わることがあります。

## サービスのアダプター {#platform-adapters}

メッセージングサービスはどれも、`plugins/platforms/<name>/` の下にプラグインのアダプターとして入っています。`gateway/platforms/` に残っているのは、土台のクラスと、HTTP で受け付けるアダプター（`api_server`、`webhook`、`msgraph_webhook`）だけです。どれも `gateway/platforms/base.py` の `BasePlatformAdapter` を継承しています。

```text
plugins/platforms/                  # plugin-packaged adapters (one dir each)
├── telegram/adapter.py     # Telegram Bot API (long polling or webhook)
├── discord/adapter.py      # Discord bot via discord.py
├── slack/adapter.py        # Slack Socket Mode
├── whatsapp/adapter.py     # WhatsApp via the local Baileys bridge
├── whatsapp_cloud/adapter.py # WhatsApp Business Cloud API
├── matrix/adapter.py       # Matrix via mautrix (optional E2EE)
├── mattermost/adapter.py   # Mattermost WebSocket API
├── email/adapter.py        # Email via IMAP/SMTP
├── sms/adapter.py          # SMS via Twilio
├── dingtalk/adapter.py     # DingTalk WebSocket
├── feishu/adapter.py       # Feishu/Lark WebSocket or webhook
├── wecom/adapter.py        # WeCom (WeChat Work) callback
├── line/adapter.py         # LINE Messaging API
├── teams/adapter.py        # Microsoft Teams
├── signal/adapter.py       # Signal via signal-cli HTTP daemon (SSE + JSON-RPC)
├── irc/adapter.py          # IRC (canonical scoped-lock example)
├── bluebubbles/adapter.py  # Apple iMessage via BlueBubbles macOS server
├── weixin/adapter.py       # Weixin (personal WeChat) via iLink Bot API
├── qqbot/                  # QQ Bot (Tencent QQ) via Official API v2
└── …                       # google_chat, ntfy, photon, raft, simplex, …

gateway/platforms/                  # core base + HTTP ingress adapters
├── base.py              # BasePlatformAdapter — shared logic for all platforms
├── msgraph_webhook.py   # Microsoft Graph change-notification webhook (Teams, Outlook, etc.)
├── webhook.py           # Inbound/outbound webhook adapter
└── api_server.py        # REST API server adapter
```

**遅れて読み込む仕組み:** 同梱の `kind: platform` プラグインは、`gateway/platform_registry.py` に軽い `register_deferred` のローダーを登録します (`hermes_cli/plugins.py` 経由)。おかげで各サービスの SDK は、ゲートウェイが起動したとき、メッセージを送るとき、セットアップや状態確認を走らせたときにだけ読み込まれます。ふつうに `hermes chat` を使うぶんには読み込まれません。名前を引いたときは、そのアダプターだけを読み込みます。全部を並べる必要がある場面でだけ、残りのローダーもまとめて動きます。

試験的なコネクター経由のサービスは、専用のモジュールではなく `gateway/relay/` の汎用リレーアダプターを使います。`GATEWAY_RELAY_URL` か `gateway.relay_url` が設定されていると、ゲートウェイは `relay` というサービスを登録し、外向きの WebSocket でコネクターにつなぎ、その同じ接続で `descriptor`、`inbound`、`interrupt_inbound` のフレームを受け取ります。コネクター側は `CapabilityDescriptor` を名乗ります。Hermes からは、ふつうの返信、トークンの要らない `follow_up` 操作、割り込みのフレームを、リレー越しに送り返せます。実装に即した通信の取り決めは [Relay ↔ Connector contract](/hermes/docs/developer-guide/relay-connector-contract/) にあります。

アダプターは共通の作法を実装します。
- `connect()` と `disconnect()` — つなぐ・切るの管理
- `send()` — メッセージを送り出す
- 受け取ったイベントは `MessageEvent` に整えられ、`handle_message()` へ渡されます


内部からの起こしは `gateway.wake.admit_internal_event` を通ります。公開されている
`handle_message()` は今までどおり `None` を返しますが、そのイベントのプロセス内の受領記録
`_gateway_accepted` が立つのは、実際に処理を予約するかキューへ入れたあとだけです。処理役がいない場合、
明示されたセッションキーが合わない場合、キューの上限で捨てられた場合は、受け付けたことになりません。
入口を差し替える独自アダプターは、内部イベントを `BasePlatformAdapter.handle_message()` へ委ねるか、
実際に受け付けたことを自分で記録してください。コールバックを消費した・捨てたことを、受け付けたことと
同じ扱いにしてはいけません。この受領記録はハートビートの実行の集計とは別のもので、認可・緊急停止・
そのあとのターン準備の関門を迂回するものでもありません。

### トークンロック {#token-locks}

固有の資格情報でつなぐアダプターは、`connect()` で `acquire_scoped_lock()` を、`disconnect()` で `release_scoped_lock()` を呼びます。こうすると、2 つのプロファイルが同じボットのトークンを同時に使ってしまうことがなくなります。

ロックがぶつかったときは `{scope}_lock` として、`retryable=True` を付けて知らせます。**動いている最中** の再接続なら、相手が抜けたあとに復帰できるからです。ただし **起動時** に他のプロセスがロックを握っているなら、それは設定のぶつかりです。`gateway/restart.py::is_global_startup_conflict()` が `*_lock` と `lock_conflict` の系統のコードを見分け、起動側はそのサービスを再試行の列に入れず `fatal` として止めます。他に何もつながっていなければ、ゲートウェイは `78` (`EX_CONFIG`、`gateway_state=startup_failed`) で終了し、見守り役が再起動を繰り返さないようにします。systemd は `RestartPreventExitStatus=78` で、s6 は finish→125 で、launchd は stderr のラッパーが 78→0 に読み替えたうえで `KeepAlive.SuccessfulExit=false` で止まります。本当に一時的な失敗をした相手と同居している場合は、ゲートウェイ自体は生き続け、その相手だけがやり直します。

## 送り出しの経路 {#delivery-path}

送り出し (`gateway/delivery.py`) が扱うのは次のとおりです。

- **そのまま返信** — 来たチャットへ返事を送ります
- **ホームチャンネルへの配信** — cron のジョブの出力や、背後で動いた結果を、決めておいたホームチャンネルへ流します
- **宛先を指定した配信** — `telegram:-1001234567890` のように送信側が宛先を指定します。シェルスクリプト向けには [`hermes send` コマンド](/hermes/docs/guides/pipe-script-output/) から、cron からは `deliver:` の宛先から使えます
- **サービスをまたいだ配信** — 届いたのとは違うサービスへ送ります

cron のジョブの配信は、ゲートウェイのセッション履歴には写されません。cron 自身のセッションにだけ残ります。これは、発言の順番が崩れるのを避けるための、意図した設計です。

## フック {#hooks}

ゲートウェイのフックは、ライフサイクルのイベントに反応する Python のモジュールです。

### ゲートウェイのフックイベント {#gateway-hook-events}

| イベント | 発火するとき |
|-------|-----------|
| `gateway:startup` | ゲートウェイのプロセスが起動したとき |
| `session:start` | 新しい会話のセッションが始まったとき |
| `session:end` | セッションが終わった、または時間切れになったとき |
| `session:reset` | `/new` でセッションを作り直したとき |
| `agent:start` | エージェントがメッセージの処理を始めたとき |
| `agent:step` | エージェントがツール呼び出しを 1 周終えたとき |
| `agent:end` | エージェントが終わって返事を返したとき |
| `command:*` | いずれかのスラッシュコマンドが実行されたとき |

フックは `<profile home>/hooks/` (自分で入れたもの。既定のプロファイルなら `~/.hermes/hooks/`、多重化しているときは受け持つプロファイルごとに1つのディレクトリ。パスは読み込み時ではなく呼び出し時に決まります) から見つけられます。フックはそれぞれ、`HOOK.yaml` という定義ファイルと `handler.py` を置いたディレクトリです。

## メモリープロバイダーとの連携 {#memory-provider-integration}

メモリープロバイダーのプラグイン (Honcho など) を有効にすると、次のように動きます。

1. ゲートウェイは、メッセージごとにセッション ID を持たせた `AIAgent` を作ります
2. `MemoryManager` が、セッションの情報を渡してプロバイダーを初期化します
3. プロバイダーのツール (`honcho_profile`、`viking_search` など) は次の順で呼ばれます

```text
AIAgent._invoke_tool()
  → self._memory_manager.handle_tool_call(name, args)
    → provider.handle_tool_call(name, args)
```

4. セッションが終わる・作り直されるときに `on_session_end()` が呼ばれ、後片づけと最後の書き出しをします

### メモリー書き出しの流れ {#memory-flush-lifecycle}

会話の区切りをはっきり指示したとき（`/new`、`/reset`、`/resume` など）は、出ていくセッションの内容を
書き出して締めくくります。何もしないまま時間が経ったときや、日付が変わったときには、締めくくりません。

資源の都合だけで起きる追い出し（TTL、しばらく使われていないものから外す仕組み、メモリー逼迫時）は、
エージェントのクライアントを手放す前に、控えていたやり取りを設定済みのメモリープロバイダーへ書き込みます。
保存された会話そのものを閉じるわけではありません。次のターンでは、同じやり取りと同じ人格が読み直されます。

## 裏で動く手入れ {#background-maintenance}

ゲートウェイは、メッセージの処理と並行して、決まった手入れを繰り返しています。

- **cron の刻み** — ジョブの予定を確かめ、時間の来たものを動かします
- **セッションの時間切れ** — 放っておかれたセッションを、時間が過ぎたら片づけます
- **メモリーの書き出し** — セッションが時間切れになる前に、先回りして書き出します
- **キャッシュの更新** — モデルの一覧とプロバイダーの状態を取り直します

## プロセスの扱い {#process-management}

ゲートウェイは常駐プロセスで、次の手段で管理します。

- `hermes gateway start` と `hermes gateway stop` — 手で動かす
- `systemctl` (Linux) や `launchctl` (macOS) — サービスとして管理する
- `~/.hermes/gateway.pid` の PID ファイル — プロファイル単位でプロセスを追う

**プロファイル単位か、全体か**: `start_gateway()` はプロファイル単位の PID ファイルを使います。単独運用 (プロファイルごとにゲートウェイが1つ) なら、`hermes -p x gateway stop` はそのプロファイルのゲートウェイだけを止めます。多重化しているときはゲートウェイのプロセスはホストごとに1つだけで、それを起動したプロファイルが持ち主になります (`gateway/host_rendezvous.py` がその PID・ホーム・受け持つプロファイルの一覧を公開し、`gateway/host_attach.py` が、合流するか・再走査させるか・断るかを決めます。起動や停止などの操作はすべてこの判断を通ります)。持ち主のプロファイルで `hermes gateway stop` を実行すると受け持つプロファイルがすべて止まり、受け持たれている側のプロファイルで `hermes -p x gateway stop` を実行すると、終了コード 78 で断られます (そのプロファイル自身のゲートウェイはないためです)。受け持たれているプロファイルで2つ目の `gateway run` を実行すると、既存のプロセスに合流して終了コード 0 で終わります。サービスの監視役の下では代わりに 75 (EX_TEMPFAIL) で終わるので、余分なユニットは止めたままにされず、あとで再試行されます。「いまは別のプロセスが自分を受け持っている」というのは実行中に観測した事実で、そのプロセスが終われば成り立たなくなります。systemd・s6・launchd はどれも 78 を恒久的な失敗として扱うので、78 で終わるとそのプロファイルは取り残されてしまいます。合流するには、持ち主から `identify` への生きた応答が必要です。待ち合わせの記録があっても、その裏で何も応答しなければ、持ち主がいることは分かっても自分を受け持っていることの証明にはなりません。そのため合流はせず、一時的な拒否 (終了コード 75) になります。再走査の依頼に `multiplex: False` と答える持ち主は、別のプロファイルの*単独運用の*ゲートウェイであって、自分を除外した多重化ゲートウェイではありません。この場合、操作は断らずに、このプロファイル自身のゲートウェイをその横で起動します (プロファイルごとにプロセスを1つ持つ構成です)。以前はここで断っていたため終了コード 78 で終わり、最初にホストのロックを取ったもの以外の launchd ユニットがすべて止まったままになっていました。`hermes gateway stop --all` は `ps aux` で全体を走査し、ゲートウェイのプロセスをすべて止めます (更新のときに使われます)。生きているかどうかは `gateway.status.live_gateway_pid_for_home` (PID と起動時刻の指紋) で判断し、PID が存在するかどうかだけでは決めません。

## バックグラウンドプロセスの通知 {#background-process-notifications}

`terminal(background=true, notify_on_complete=true)` を使うと、ゲートウェイの見張り役が起動し、
処理の完了を検知してエージェントの新しいターンを始めます。通知の詳しさは `display.background_process_notifications`
（または `HERMES_BACKGROUND_NOTIFICATIONS`）で決めます。`concise`（既定。1 行だけで、失敗したときは出力の
末尾を添えます）、`all`（実行中の途中経過 + 最後の生の出力）、`result`（最後の生の出力だけ）、`error`
（終了コードが 0 以外のときだけ最後の生の出力）、`off` から選びます。

見張り役は、登録した時点でゲートウェイのループに仕掛けられます（`terminal_tool_background.py::
_register_completion_watcher` → `run_notifications.py::arm_process_watcher`）。`pending_watchers`
は、ゲートウェイが受け付けを始める前（チェックポイントからの復旧）や停止中に登録されたプロセスのための
予備にすぎず、起動時とターンの後に吐き出されます。エージェントに知らせる見張り役は、利用者向けの
受領の知らせを送りません（エージェントの次のターンが報告になるためです）。ただし、プロセスの終了時にそれを起動したターンがまだ動いている場合は例外です。
そのときは差し込みが後続の予約をするだけなので、簡潔な受領の知らせがすぐに送られます。

待機中の完了見張り役は `watch_match` / `watch_disabled` も吐き出します。利用者が後から何かする
必要はありません。通知をオフにしている場合は、エージェントを起こさずにこれらを吐き出します。送信経路の失敗は再試行します。
永続化した完了の持ち主や送信経路が使えないときは、配達の試行回数を消費しません。プロファイルの名前空間付きのプロセス
イベントは、生の途中経過や最終の知らせも含めて、持ち主のアダプターを保ちます。アダプターが受け取ったことは
少なくとも 1 回の受け入れであり、モデルのターンや最後の返信の送信が完了した証明ではありません。API サーバーの
非同期の完了は永続化した配達の行のままで、自律的にモデルの新しいターンを始めることはありません。完了や見張りの差し込みには
`admit_internal_event` の受領を必須にします。None を返すハンドラーは受け入れたことになりません。
受け入れを拒否されたときは、確保したバッチの兄弟をすべて返却し、試行回数は消費しません。
実際の配達エラーは、上限のある再試行の方針をそのまま保ちます。認識できた生の API の経路は、
永続化したメッセージングの発信元の後に解決し、使えないときは静かに先送りします。形の崩れた経路は引き続き警告を出します。

セッションが処理中のあいだに届いた完了は、キューに入ったひとつのターンにまとめられます
（`session_automation.py::_admit_folded_completion`）。同じ経路の完了がすでに FIFO のいちばん最後で待っている場合、
新しい完了は、両方をまとめた受け入れ（両方の文面、すべての発生元の身元、「N background process results」という見出し）でそれを置き換え、
待っていた行は同じトランザクションの中で取り消します。まとめるのは末尾だけなので、完了の後にキューへ入ったプロンプトは
2つの完了のあいだの位置を保ちます。待っていた行が先に引き受けられた場合、新しい完了は単独でキューに並びます。

cron の実行には専用のセッションがあります。続きのやり取りができる対象の配達は、
返信先の会話に写したり、その会話の起点を作ったりできます。対象は、発信元、発信元がないときのホームへの代替、利用者が書いたプラットフォーム名だけのホーム、
または明示的にオプトインした宛先です。`all` で展開した宛先は、ホームへの写しの対象になりません。写した
概要は、ターンの区切りに追加されるラベル付きのユーザーターンなので、ロールの交互性が保たれます
（`cron/AGENTS.md`）。

## `/login`（ターン外、ペア済みの DM 限定） {#login-off-turn-paired-dm-only}

`/login` は `hermes_cli/commands.py` に `busy_policy="dispatch"` と
`desktop="settings"` で登録され、`run_busy.py::_PLAIN_COMMANDS` に載り、
`GatewayLoginCommandsMixin`（`gateway/slash_commands_login.py`）が処理します。ペア済みの DM 以外では断ります。
条件は、`chat_type in {"dm","private"}` であること、`chat_id` が空でないこと、そしてプラットフォームの `"dm"` が本当にペア済みの
会話であることです。ntfy、raft、a2a はどれも、ブロードキャストのトピック、チャネル、
エージェント同士の相手に対して `chat_type="dm"` を返すので、そこへサインインのリンクとコードを投稿すると公開されてしまいます。

**このコマンドはインストール全体を結び付けます。** サインインはシングルトンの `providers.nous` に書き込むので、
コードを承認した人が、このゲートウェイが受け持つすべてのチャットの推論とコネクターを握ることになります。スラッシュ
コマンドの制限はオプトインです（`gateway/slash_access.py`）。`allow_admin_from` を設定していなければ、
ボットに DM を送れる利用者は誰でも実行できます。共有のゲートウェイを運用する人は必ず設定してください。

ハンドラーはすぐに受領の返事を返し、`anon_auth.run_sign_in` を**専用の単一ワーカーの
エグゼキューター**（`_login_executor`）で処理します。10 スレッドの共有ゲートウェイプールは使いません。トークンのポーリングは
コードの有効期限いっぱいまで続くことがあり、共有プールに生きたワーカーが残っていると、停止時に SessionDB の
クローズやチェックポイントが飛ばされてしまうからです。試行はプロセスごとに 1 つで、始めた本人の識別情報が刻まれます。
同じ本人が 2 回目の `/login` を送ると前の試行を取り消し（取り消された側は、その旨の文面が自分の
チャットに送られて終わります）、別の本人からの場合は断ります。`task.cancel()` ではワーカースレッド内の
ブロックしているポーリングを中断できないので、停止も差し替えも `attempt.cancelled` を通して働きます。
トークンのポーリングはこれを 1 秒以下の間隔で確かめ、保存の直前にももう一度確かめます。取り消された試行は何も保存しません。
停止で取り消された試行は何も送りません。タスクは終わりかけで、アダプターもすでになくなっているかもしれないからです。
完了時の文面には、無料枠の引き継ぎで移ったものが書かれます。

完了すると、ハンドラーはまだ `nous/welcome` を使っているキャッシュ済みのエージェントをすべて**追い出し**、
それに固定されたセッションのモデル上書きを消します。エージェントをその場で切り替えることも、モデルの
上書きを書き込むこともしません。`settle_after_upgrade` が設定の `model.default`/`model.base_url` をすでに移しており、
毎ターン設定と認証情報を解決し直し、経路が変われば `_agent_config_signature` がすでに作り直しを
強制するからです。その場で入れ替えてもキャッシュの温かさは得られず、上書きを書けば、誰も更新しない
期限付きのアクセストークンを固定してしまいます。

## 多重化したプロファイル {#multiplexed-profiles}

`gateway.multiplex_profiles: true` にすると、1つのプロセスが既定のプロファイルと、`profiles/` の下にある有効なディレクトリすべてを受け持ちます (`hermes_cli/profiles.py::profiles_to_serve(multiplex=True)`)。`os.environ` とモジュールのグローバル変数には **起動した** プロファイルの値が入っているため、ほかのプロファイルのための処理はどれも、自分の範囲を明示的に結び付けます。プロファイルとは、ホームと秘密情報の範囲と端末の範囲をひとまとめにしたものです。

| 処理 | 結び付け方 |
|---|---|
| 振り分けられたターン | `run_turn.py::_profile_scope_for_source` 経由の `gateway/run.py::_profile_runtime_scope(home)` |
| エージェントの解放・追い出し (TTL、LRU、メモリ逼迫) | `gateway/run_agent_cache.py::_run_release_in_profile_scope` |
| 終了処理 | `gateway/run_shutdown.py::_finalize_session` |
| ターン後のメディア配信 | `gateway/platforms/base.py::_media_delivery_scope` |
| cron の定期実行 | `cron/scheduler_provider.py::_profile_cron_scope(home)` (実行役は1つで、プロファイルを順に回ります) |
| 子プロセス (`hermes -p X` のワーカー、リレーのターン、ブラウザーのドライバー) | `tools/environments/local.py::served_profile_child_env` |
| バックグラウンドのスレッド | `agent/memory_provider.py::spawn_context_thread` |

秘密情報の読み出しが安全側に失敗する (`agent.secret_scope.get_secret` が `UnscopedSecretError` を投げる) のは、`set_multiplex_active(True)` が呼ばれたあとだけです。これを呼ぶのは、ゲートウェイ、cron、`gateway migrate`、Desktop やダッシュボードの `serve` バックエンドです。多重化しているとき、アダプターの YAML は `os.environ` に書き込まれません。`gateway/platforms/_shared.py::apply_yaml_bridge` が `PlatformConfig.extra` に値を入れ、ほかのプロファイルの範囲では環境変数への書き込みを飛ばします。有効かどうかの判定は `platform_gate_env` を通して読みます。入口を共有するサービス (WhatsApp のブリッジ、Relay) は既定のプロファイルでだけ動きます。ほかのプロファイルでこれらを有効にすると、ログに一度だけ記録され、実行時の状態に印が付きます (`run_adapters.py::_note_unserved_secondary_platform`)。利用者から見たプロファイルごとの分離は [複数プロファイルのゲートウェイ § プロファイルごとに分離されるもの](/hermes/docs/user-guide/multi-profile-gateways/#what-is-isolated-per-profile) を参照してください。

## 実行中のプラグイン読み込み {#mid-run-plugin-loading}

アダプターの接続後に読み込まれたプラグイン（CLI・Desktop・ダッシュボード・
`plugins.manage` からのインストールや有効化、ツールがきっかけの強制的な再検出）は、再起動しなくてもプラットフォームのハンドラーを配線し直します
(#87770)。構成要素はすべて `gateway/run_plugin_rewire.py` にあります。

- **検出リスナー** — 起動プロファイルでは `_start_recover_previous_run` が `PluginManager.on_plugin_loaded` を購読し、
  配信対象のプロファイルごとには `_load_secondary_profile_config` が同じく購読します。このイベントは新たに読み込まれたプラグインについて
  `discover_and_load` の内部から発火します（RPC から発火することはありません）。コールバックは `call_soon_threadsafe` でゲートウェイの
  イベントループへ移ります。
- **冪等な再配線** — `BasePlatformAdapter.rewire_plugin_handlers()` が
  `get_platform_handler_factories(platform)` を読み直し、稼働中のネイティブクライアントにまだ配線されていないファクトリーだけを実行します
  （強制リロードでは新しい関数オブジェクトが返るため、キーは `(plugin, qualname)` です）。Telegram では
  追加したハンドラーをコアの catch-all より前に持ち上げます。Slack ではさらに、足りない
  `register_slack_action_handler` のコールバックを `AsyncApp` ごとに1回だけ登録し直します。
- **`reload-plugins` 制御動詞** — ほかのプロセス（`hermes plugins install`、`hermes serve`）は
  稼働中のゲートウェイに、指定した（配信中の）ホームを強制的に再スキャンするよう依頼します。応答には `plugins`、プラグインごとの
  `activations`、`adapters_rewired` が入るので、呼び出し側は「いま有効になった」と正確に伝えられます。
- **適用範囲の限界** — 対象はハンドラーだけです。あとから読み込まれたプラグインのツールやシステムプロンプトの節は、次の
  セッションまで待ちます（プロンプトキャッシュの不変条件のため）。持ち運べる MCP サーバーは `mcp.reload` まで待ちます。無効化しても配線は外れません。

## 関連ページ {#related-docs}

- [セッションの保存](/hermes/docs/developer-guide/session-storage/)
- [cron の内部](/hermes/docs/developer-guide/cron-internals/)
- [ACP の内部](/hermes/docs/developer-guide/acp-internals/)
- [エージェントループの内部](/hermes/docs/developer-guide/agent-loop/)
- [メッセージングゲートウェイ (利用の手引き)](/hermes/docs/user-guide/messaging/)
