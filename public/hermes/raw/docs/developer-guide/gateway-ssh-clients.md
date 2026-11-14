---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "SSH 経由のゲートウェイ: クライアント向けの取り決め"
description: "SSH トンネルを使うクライアント（Desktop またはモバイルの SSH モード）が、hermes gateway attach と hermes gateway tickets を使ってゲートウェイに接続する方法"
upstream_path: developer-guide/gateway-ssh-clients.md
upstream_blob: a0525e5d143964cc9da7a2f0ab9762b126c185e0
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-ssh-clients
---

# SSH 経由のゲートウェイ: クライアント向けの取り決め {#gateway-over-ssh-client-contract}

このページは、SSH 経由で Hermes ホストに接続するクライアントを作る人に向けたものです。こうしたクライアントは、ホスト上でコマンドを実行し、
ゲートウェイのループバックポートを転送したうえで、ローカルのクライアントと同じようにゲートウェイとやり取りします。
必要なものは、ホスト上の 2 つのコマンドですべてそろいます。

| コマンド | クライアントが受け取るもの |
|---------|------------------|
| [`hermes gateway attach --json`](/hermes/docs/developer-guide/gateway-internals/#hermes-gateway-attach) | ゲートウェイのループバックエンドポイントと、使い切りの WebSocket チケット 1 枚。`--start` を付けると、ゲートウェイが動いていないときに起動します。 |
| `hermes gateway tickets --probe --json` | このホストに `tickets` コマンドがあるかどうか、どの用途のチケットを発行できるか、そしてこのログインが Windows のサービスセッションかどうか。 |
| `hermes gateway tickets --serve --json` | 長時間開いたままにする 1 本の SSH チャネルを通じて受け取る、使い切りのチケット。HTTP リクエストごとに 1 枚と、（`interactive` を挙げているホストでは）すべてのプロファイルに使える WebSocket 用のチケットです。 |

どちらのコマンドも、コマンドを実行したプロファイル（`HERMES_HOME`、または `hermes -p <name>`）を対象に動きます。
`--serve` へのリクエストでは、同じゲートウェイが受け持っている別のプロファイルを指定することもできます。
非対話の SSH コマンドでは、`PATH` に `hermes` が含まれていないことがよくあります。そのため、クライアント側で
実行ファイルの場所を探す必要があります。

## `hermes gateway tickets --probe --json` {#hermes-gateway-tickets---probe---json}

このコマンドは何も起動せず、どのゲートウェイにも接続しません。終了コード `0` で終わり、JSON を 1 行出力します。

```json
{"protocol": 1, "purposes": ["native-http", "native-profile-create", "native-profile-registry", "interactive"],
 "windows_service_session": false}
```

（ここでは折り返して表示していますが、実際の出力は 1 行です。）`protocol` は、後述する `--serve` の行プロトコルの
バージョンです。`purposes` には、`--serve` が発行するチケットの用途が並びます。これを読み取り、知らないキーは
無視してください。今後のバージョンでキーが増えることがあります。

`native-profile-registry` を挙げているホストは、リクエストの `profile` フィールドも受け付けます（後述）。
`native-http` だけを挙げているホストは `profile` を無視し、コマンドを実行したプロファイル向けにチケットを発行します。
そのため、こうしたホストには `profile` を送らないでください。

`interactive` を挙げているホストは、WebSocket 用のチケットも発行します（[WebSocket 用のチケット](#the-websocket-ticket)を
参照）。挙げていないホストは `unsupported_purpose` と応答します。その場合は、`attach` が返したチケットで WebSocket に接続してください。

`windows_service_session` は、このログインが Windows のセッション 0 で昇格して動いている場合（管理者による
OpenSSH ログイン）に `true` になり、それ以外ではすべて `false` です。このキーを報告しないホストは
`false` として扱います。これは、`attach --json` が `start_context.windows_service_session` で報告する値と同じです。
クライアントの規則 2 も参照してください。

Hermes がこのコマンドより古いホストでは、0 以外の終了コードで終わり、標準出力に JSON を出しません。
これが、クライアントの従来の SSH 経路を使うべきだという合図になります。

## `hermes gateway tickets --serve --json` {#hermes-gateway-tickets---serve---json}

接続ごとに 1 回実行し、その SSH チャネルを開いたままにしておきます。このコマンドは、フラグなしの `attach` と同じ方法で、
プロファイルの稼働中のゲートウェイを探します。ゲートウェイを起動することはないので、先に `attach --start` を実行してください。

やり取りする行はすべて 1 行に収まった JSON オブジェクトで、1 行に 1 つずつ、標準出力（応答）と標準入力（リクエスト）で送受信します。

**最初の行。** ゲートウェイの準備ができている場合は次のようになります。

```json
{"type": "hello", "protocol": 1,
 "endpoint": {"api_origin": "http://127.0.0.1:<port>", "profile_id": "...", "instance_id": "...",
              "authority_epoch": 1, "runtime_protocol": 1, "supervisor": "none",
              "capabilities": ["..."], "control_home": null, "code_sha": "..."}}
```

（ここでは折り返して表示していますが、実際の出力は 1 行です。）`endpoint` は、`attach --json` が `endpoint` フィールドで返すものと同じオブジェクトです。
その `instance_id` が、自分の `attach` で返されたものと一致するか確かめてください。一致しない場合は、その間にゲートウェイが
置き換わっているので、もう一度 attach してください。

使えるゲートウェイがない場合は、最初の行がエラーになり、コマンドは 0 以外の終了コードで終わります。終了コードは、
同じ判定に対して `hermes gateway ensure` が返すものと同じです（ゲートウェイが存在しない場合は `5`）。

```json
{"type": "error", "error": {"code": "absent", "reason_code": null, "message": "gateway absent: not ready"}}
```

`code` は検出の状態（`absent`、`starting`、`draining`、`incompatible`、`inaccessible`、
`conflict`）です。`reason_code` は、その状態について `attach` が示す理由（たとえば
`gateway_other_session`）か `null` です。`message` は、同じ判定に対して `attach` が表示する文章です。

**リクエスト。** hello の行を受け取ったら、必要なチケット 1 枚につき 1 行を書き込みます。

```json
{"id": 7, "purpose": "native-http"}
```

`id` には任意の整数または文字列を指定します。`purpose` には、probe の `purposes` のいずれかを指定します。
省略可能な `"profile": "<name>"` を付けると、同じゲートウェイの別のプロファイル向けのチケットを要求できます
（[プロファイル](#profiles)を参照）。付けなければ、コマンドを実行したプロファイル向けのチケットになります。そうしたい場合は
キーそのものを省いてください。`"profile": null` は「指定なし」とは解釈されず、拒否されます。リクエスト行の長さは、
行末（LF または CRLF）を除いて最大 65536 バイト（64 KiB）です。これより長い行は読み込みながら破棄され、`invalid_request`
の応答が 1 行返ります。どのリクエスト行にも、送った順に、指定した `id` を含む応答行がちょうど 1 行返ります。

```json
{"id": 7, "ok": true, "ticket": "<ticket>", "expires_in": 30}
{"id": 7, "ok": false, "error": {"code": "ticket_unavailable", "message": "..."}}
```

| `error.code` | 意味 |
|--------------|---------|
| `invalid_request` | 行が整数または文字列の `id` を持つ JSON オブジェクトではない、入れ子が深すぎて解析できない、または 65536 バイト（64 KiB、行末を除く）より長い。応答の `id` は `null` になります。チャネルは開いたままです。 |
| `invalid_request`（指定した `id` 付き） | `profile` があるのに、有効なプロファイル名の文字列ではない（`null` も含む）。または、`interactive` のリクエストに `profile` が含まれている。 |
| `unsupported_purpose` | `purpose` がない、または probe の `purposes` に含まれていない。 |
| `unknown_profile` | その名前のプロファイルがホストに存在しない。 |
| `profile_not_served` | プロファイルは存在するが、稼働中のゲートウェイがそのプロファイルを受け持っていない（独自のゲートウェイを持っている、または待機状態にある）。この応答が返るのは、同じゲートウェイがまだ `ready` のままで、受け持っているプロファイルを挙げており、その中にこのプロファイルが含まれていない場合だけです。それ以外の場合の拒否は `ticket_unavailable` になります。チャネルは、ほかのプロファイルには引き続き使えます。 |
| `ticket_unavailable` | ゲートウェイがチケットを発行しなかった（停止した、置き換わった、または拒否した）。チャネルを閉じ、もう一度 `attach` を実行してから、新しいチャネルを開いてください。 |

標準入力を閉じるとコマンドが終わり、終了コードは `0` になります。

### プロファイル {#profiles}

通常は 1 つのゲートウェイがホストのすべてのプロファイルを受け持ち、各チケットはそのうちの 1 つに結び付いています。
リクエストがチケットとは別のプロファイルを選ぶと、ゲートウェイは `{"detail": "profile_scope_mismatch"}` を付けて `403` を返します。
そのため、チケットを要求するときは、HTTP リクエストで選ぶプロファイルを指定してください。

| HTTP リクエスト | `purpose` | `profile` |
|--------------|-----------|-----------|
| `?profile=<name>`、JSON 本文の `"profile": "<name>"`、`/api/profiles/<name>/...` というパス、または `/api/profiles/sessions/sidebar` での `recents_profile=<name>` によってプロファイルを選ぶ | `native-http` | `<name>` |
| プロファイルを選ばない | `native-http` | 省略 |
| `POST /api/profiles`（プロファイルの作成） | `native-profile-create` | 省略 |
| `PATCH` または `DELETE /api/profiles/<name>`（名前の変更または削除） | `native-profile-registry` | `<name>` |

`profile` には、`GET /api/profiles` で表示されるとおりのプロファイル名を指定します。ルートのプロファイルは `default` です。
これらは、Desktop アプリがローカル接続で同じリクエストに使うチケットと同じもので、発行のされ方も
制限も同じです。

- `native-http` チケットでは、プロファイルの作成・名前変更・削除はできません（`403`）。
- `native-profile-create` チケットを受け付けるのは `POST /api/profiles` だけです。
  `native-profile-registry` チケットを受け付けるのは、そのチケットで指定した 1 つのプロファイルに対する `PATCH`/`DELETE` だけです。
  それ以外のルートは、これらのチケットにすべて `401` を返します。
- ゲートウェイ自体が動いているプロファイルは、削除も移動もできません。`default` の名前を変更しても、
  表示名が変わるだけです。

プロファイルを作成・名前変更・削除すると、ゲートウェイは受け持つプロファイルを調べ直します。その直後のしばらくの間は、
チケットの要求が `ticket_unavailable` や `profile_not_served` で失敗したり、
リクエストが `401` になったりすることがあります。その場合は再試行してください。

### WebSocket 用のチケット {#the-websocket-ticket}

```json
{"id": 8, "purpose": "interactive"}
{"id": 8, "ok": true, "ticket": "<ticket>", "expires_in": 30}
```

`interactive` チケットは、`attach` が返すチケットと同じように、ゲートウェイの WebSocket（`/api/ws`）を開きます。
`attach` が返した `url` に、`attach` が返した `protocol` と
`hermes-gateway-ticket.<ticket>` をサブプロトコルとして指定して接続します。違うのは使える範囲です。`attach` が返すチケットは
`attach` を実行したプロファイルに結び付いており、そのソケット上で `profile` に別のプロファイルを指定した
フレームには、ゲートウェイが `profile_mismatch` を返します。一方、`--serve` から受け取る `interactive` チケットは、
Desktop アプリがローカル接続で要求するものと同じです。1 つのソケット上で、フレームごとの `profile` によって、
そのゲートウェイが受け持つどのプロファイルでも選べます（受け持っていないプロファイルは、やはり `profile_mismatch` になります）。
そのため、1 本の接続ですべてのプロファイルを扱えます。

このチケットは `profile` を受け付けません。このキーを含むリクエストは `invalid_request` で拒否されます。ほかのチケットと
同じく使い切り（開けるソケットは 1 つ）で、発行から `expires_in` 秒で期限が切れ、
そのゲートウェイのインスタンスに結び付いています。HTTP API はこのチケットに `401` を返します。再接続も含めて、
接続のたびに新しいチケットを要求してください。

**HTTP 用チケットの使い方。** 転送した `api_origin` への 1 回の HTTP リクエストで、
`X-Hermes-Gateway-Ticket` ヘッダーに入れて送ります。`Origin` ヘッダーは付けません。チケットは使い切りです。
認証できるのはちょうど 1 回のリクエストだけで、発行から `expires_in` 秒で期限が切れ、
1 つのプロファイルとそのゲートウェイのインスタンスに結び付いています。HTTP リクエストのたびに新しいチケットを要求してください。
`attach` が返すチケットは WebSocket 専用で、HTTP API はこれに `401` を返します。

チケットは認証情報です。コマンドはチケットを標準出力にだけ書き出し、標準エラー出力やログには決して書きません。
クライアントも、チケットをログに残してはいけません。

## クライアントの規則 {#client-rules}

1. **最初に probe を実行する。** `hermes gateway tickets --probe --json` を実行します（SSH exec 1 回）。失敗した場合や
   JSON が出力されない場合は、従来の SSH 経路をそのまま使ってください。probe が一度成功したら、従来の経路には
   戻らないでください。ゲートウェイによる拒否（認可、ドレイン中、別のセッション、プロファイル）は、そのままユーザーに表示します。
2. **Windows のサービスセッションでは attach だけを行う。** probe が
   `"windows_service_session": true` を報告した場合は `attach --json` だけを実行し、`--start` は決して使わないでください。
   ゲートウェイが存在しない場合は、そのマシンのデスクトップで、通常の（管理者ではない）ウィンドウから Hermes を起動するよう
   ユーザーに伝えてください。`hermes gateway install` を勧めてはいけません。ゲートウェイが昇格した状態で起動されることがあり、
   そうなるとそのユーザー自身のウィンドウが拒否されてしまいます。このキーを報告しないホストは
   `false` として扱います。
3. **それ以外の場合は、接続と再接続のたびに `attach --start --json` を実行する。** この方法で起動したゲートウェイは、
   操作のない状態が 10 分ほど続くと終了します。最初のタイムアウトは長めに取ってください。アップデート後の初回実行には
   1 分近くかかることがあります。
4. **返されたループバックポートを SSH で転送し**、
   [`hermes gateway attach`](/hermes/docs/developer-guide/gateway-internals/#hermes-gateway-attach) のとおりに WebSocket に接続します。probe の
   `purposes` に `interactive` が含まれている場合は、`--serve` チャネルから受け取った `interactive` チケットで接続します
   （[WebSocket 用のチケット](#the-websocket-ticket)）。こうすると、1 つのソケットですべてのプロファイルを扱えます。
   含まれていない場合は、`attach` が返したチケットで接続します。このチケットで扱えるのは、`attach` を実行したプロファイルだけです。
5. **`hermes gateway tickets --serve --json` のチャネルを 1 本開いたままにし**、HTTP ではリクエストごとに、
   [そのリクエストに必要な](#profiles)用途とプロファイルを指定してチケットを 1 枚要求します。チケットのたびに新しく SSH exec を実行すると数秒かかりますが、
   開いたままのチャネルでリクエストすれば、その時間はかかりません。
6. **1 つの接続では 1 つの経路だけを使う。** 同じ接続の中で、ゲートウェイの経路と従来の経路を
   混ぜてはいけません。
