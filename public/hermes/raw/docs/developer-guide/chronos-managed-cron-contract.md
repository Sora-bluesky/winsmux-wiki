---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Chronos managed-cron の契約"
description: "Chronos cron プロバイダーにおけるエージェントと NAS の間の通信契約"
upstream_path: developer-guide/chronos-managed-cron-contract.md
upstream_blob: c7d4c34f400a547d9666693e46c729f5644bbf39
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/chronos-managed-cron-contract
---

# Chronos managed-cron — エージェントと NAS の間の通信契約 {#chronos-managed-cron-agent-nas-wire-contract}

**位置づけ:** Chronos cron プロバイダーの通信仕様の正本です。
**対象読者:** NAS 側で `agent-cron` のエンドポイント
（`nous-account-service`）を実装する人と、managed-cron の経路をデバッグするすべての人です。

Chronos を使うと、ホスティングされた Hermes の gateway は、アイドルの間は**ゼロまで縮小**しつつ、
cron ジョブはきちんと発火させられます。プロセス内で 60 秒ごとに刻む処理の代わりに、エージェントは
NAS に、**ジョブごとに外部の単発タイマーをちょうど 1 つ、そのジョブが本当に次に発火する時刻に**
仕掛けるよう頼みます。発火の時刻になると、NAS は認証つきの webhook でエージェントを呼び戻します。
エージェントはジョブを実行し、次の単発タイマーを仕掛け直します。発火と発火の間、エージェントの
プロセスは完全に止めておけます。起きるのは本当に発火するときだけです。

NAS が単発タイマーを実現するのに使う外部のスケジューラーは、**NAS 内部の実装の詳細**です。
エージェントはそれと直接やり取りせず、その認証情報も持たず、名前を出すこともありません。
エージェントが知っているのは、以下の 3 つの NAS エンドポイントだけです。

```
create/update/pause/resume/remove a cron job (agent side)
  │
  ▼
ChronosCronScheduler.reconcile()        ── agent computes next_run_at
  │  POST {portal}/api/agent-cron/provision   (auth: agent's Nous access token)
  ▼
NAS arms a one-shot for fire_at         ── NAS owns the scheduler + its creds
  │
  ⏰ at fire_at
  ▼
scheduler → POST {portal}/api/agent-cron/relay   (auth: scheduler signature, NAS-verified)
  │
  ▼
NAS mints a short-lived agent-audience JWT (purpose=cron_fire)
  │  POST {agent_callback_url}/api/cron/fire        (auth: that JWT)
  ▼
agent verifies the NAS JWT → store CAS claim → run_one_job → re-arm next one-shot
```

## 信頼のモデル（最初に読んでください） {#trust-model-read-this-first}

| 区間 | 誰が誰を呼ぶか | 認証の仕組み | 検証する側 |
|---|---|---|---|
| 1 | エージェント → NAS（`provision`/`cancel`/`list`） | エージェントがすでに持っている **Nous Portal のアクセストークン**（Bearer）。ホスティングされたエージェントの場合、これは NAS が `auth.json` に置いた **bootstrap-session トークン**（クライアント `hermes-cli-vps`）で、`agent:*` クライアントのトークンでは**ありません** | NAS（通常のエージェントトークンの経路） |
| 2 | スケジューラー → NAS（`relay`） | スケジューラーのリクエストの**署名** | NAS（すでに持っている署名の検証経路） |
| 3 | NAS → エージェント（`/api/cron/fire`） | **NAS が発行する短命な JWT**（`aud=agent:{instance_id}`、`purpose=cron_fire`） | エージェント（PyJWT で NAS の JWKS に照らして検証） |

> **区間 1 で使うのは、正確にはどのトークンか。** ホスティングされたエージェントが `agent:{instance_id}`
> の OAuth クライアント認証情報を持つことはありません。その形の認証情報は、対話的なダッシュボードの
> 認可コードグラント（ブラウザーを使う人）でしか発行されないからです。エージェントは、自分から portal
> に出すすべての呼び出しで **bootstrap-session のアクセストークン**（`resolve_nous_access_token`）を使います。
> これは bootstrap 専用のクライアント `hermes-cli-vps` の下で発行され、最初の起動時にコンテナに
> 入れられます。そのため NAS は、呼び出してきたエージェントのインスタンス ID を、`agent:{id}` クライアント
> （セルフホストやダッシュボードからの呼び出し元）から解決するか、bootstrap トークンの場合は、トークンの
> セッション ID（`sid`）と一致する `AgentInstance.bootstrapSessionId` から、組織の範囲内で解決しなければ
> なりません。区間 3 で発行する発火用の JWT は、どちらの場合も `aud=agent:{instance_id}` を持ちます。
> （区間 1 を `agent:*` クライアントだけで絞ると、実際のホスティングされたエージェントからの provision が
> すべて 403 になります。`src/server/agent-cron/instance-auth.ts` を参照してください。）

スケジューラーからエージェントへ直接ではなく NAS を仲介させる理由: スケジューラーは **NAS の**鍵で
署名しますが、エージェントはその鍵を持っていません（持つべきでもありません）。エージェントが検証できるのは
**NAS が発行した**トークンだけで、それはすでに持っている信頼の経路です。こうすると、スケジューラーの
認証情報はすべて NAS の中にとどまります。（根拠の全文は計画の DQ-4 にあります。）

エージェントに新しいシークレットは増えません。区間 1 はエージェントが portal 用にすでに使っている
トークンを使い回し、区間 3 はエージェントがすでに行っている NAS の JWT の検証を使い回します。

---

## エンドポイント 1 — `POST /api/agent-cron/provision`（エージェント → NAS） {#endpoint-1-post-apiagent-cronprovision-agent-nas}

ジョブ 1 つにつき、単発タイマーをちょうど 1 つ仕掛けます（何度呼んでも同じ結果になる形で仕掛け直すこともあります）。

- **認証:** `Authorization: Bearer <agent Nous access token>`。NAS は通常の
  エージェントトークンの経路で検証し、その行を呼び出したエージェントと組織の範囲に結びつけます。
- **リクエストの本文:**
  ```json
  {
    "job_id": "ab12cd34",
    "fire_at": "2026-06-18T12:34:56+00:00",
    "agent_callback_url": "https://agent-xyz.fly.dev",
    "dedup_key": "ab12cd34:2026-06-18T12:34:56+00:00"
  }
  ```
  - `fire_at` — ISO 8601 で、**エージェントが計算します**。1 分未満の近い未来でもかまいません。
    NAS は秒単位の精度を守らなければなりません（時刻を決めるのはエージェントなので、スケジューラーの
    1 分という下限はありません）。
  - `agent_callback_url` — エージェント自身の、外部から届くベース URL です。NAS は
    発火の時刻に `{agent_callback_url}/api/cron/fire` へ POST します。
  - `dedup_key` — `"{job_id}:{fire_at}"`。NAS は **`(agent_id, job_id)` で upsert する**
    ので、同じ発火を仕掛け直しても結果は変わりません（単発タイマーが重複しません）。同じ `job_id`
    に新しい `fire_at` が来たら、前に仕掛けたものと置き換えます。
- **処理:** `fire_at` に発火する単発タイマーを 1 つ仕掛けます。宛先は NAS の
  **relay** ルート（エンドポイント 3）で、エージェントに直接ではありません。こうして NAS が
  経路に残り、エージェント用の JWT を発行できるようにします。`(agent_id, job_id, schedule_id,
  agent_callback_url)` を保存します。
- **レスポンス:** `200 {"schedule_id": "<opaque>"}`。

## エンドポイント 2 — `POST /api/agent-cron/cancel`（エージェント → NAS） {#endpoint-2-post-apiagent-croncancel-agent-nas}

- **認証:** エンドポイント 1 と同じです。
- **本文:** `{"job_id": "ab12cd34"}`。
- **処理:** `(agent_id, job_id)` に仕掛けてある単発タイマーを取り消し、その行を削除します。
  何度呼んでも結果は同じです。知らないジョブを取り消そうとしても、何もせず 200 を返します。
- **レスポンス:** `200 {"ok": true}`。

## エンドポイント 3 — `POST /api/agent-cron/relay`（スケジューラー → NAS、発火の中継） {#endpoint-3-post-apiagent-cronrelay-scheduler-nas-the-fire-relay}

- **認証:** スケジューラーのリクエストの**署名**で、NAS がすでに持っている署名の検証経路で
  検証します。ここが発火についての信頼の境界です。偽造された relay の呼び出しは、ここで拒否しなければなりません。
- **処理:**
  1. 保存してある行から `(agent_id, job_id) → agent_callback_url` を引きます。
  2. **短命な** JWT を発行します: `aud = "agent:{instance_id}"`、
     `iss = {portal_url}`、`purpose = "cron_fire"`、短い `exp`（およそ 60〜120 秒）で、
     NAS の通常の非対称署名鍵（JWKS で公開しているもの）で署名します。
  3. `Authorization: Bearer <that JWT>` と本文 `{"job_id": "...", "fire_at": "..."}` をつけて
     `POST {agent_callback_url}/api/cron/fire` します。
  4. エージェントの応答が 2xx 以外なら、**再試行できる**失敗として扱います（スケジューラーに
     relay を再試行させます）。エージェントのストアの CAS が二重の発火を取り除くので、再試行しても安全です。
- **スケジューラーへのレスポンス:** エージェントへの POST が受け付けられたら（202）2xx を返し、
  届いた発火をスケジューラーが再試行しないようにします。

---

## 受信する `POST /api/cron/fire`（NAS → エージェント）— エージェント側、実装済み {#inbound-post-apicronfire-nas-agent-agent-side-already-implemented}

これは、エンドポイント 3 の手順 3 で NAS が呼ぶエージェントのエンドポイントです。ホスティングされた
デプロイでは 2 つの区間を通ります。

1. **ダッシュボードのアプリ**（`hermes_cli/web_server.py`）— エージェントが外部に公開している
   唯一の HTTP の口です（Fly のプロキシが公開するポートは 1 つだけで、それがダッシュボードのものです）。
   `PUBLIC_API_PATHS` に入っているので、ダッシュボードの cookie によるゲートは、Bearer の JWT を
   持ったコールバックを検証処理まで通します。ダッシュボードは JWT を検証し、ジョブのプロファイルを
   解決してから、NAS の Bearer を保ったまま、発火をループバックで区間 2 に**転送**します。ジョブを
   自分で実行することは**ありません**。
2. **gateway の `APIServerAdapter`**（`gateway/platforms/api_server.py`、ループバックに
   バインド、既定のポートは 8642）— JWT をもう一度検証し（多層防御）、gateway の
   **稼働中のプラットフォームアダプター**でジョブを実行します。これによって、リレーを前に置いた論理的な
   プラットフォームや E2EE のルームにも配信できます（単独の送信経路はどちらにも対応できません）。
   api_server を直接公開しているセルフホストの API サーバー構成では、区間 1 を通らずに区間 2 に届きます。

区間 1 から gateway に届かないとき（ゼロからの起動がまだ終わっていない、再起動の最中、api_server が
無効）は、ダッシュボードが **503** を返し、NAS が再試行します（2xx 以外 = 再試行できる、下記参照）。
やがて起きる二重の発火は、ストアの CAS が取り除きます。ダッシュボードの中で実行するフォールバックは、
あえて用意していません。検証処理は `plugins/cron/chronos/verify.py` です。

- **認証:** `Authorization: Bearer <NAS-minted JWT>`。エージェントは次を検証します。
  - NAS の JWKS（`cron.chronos.nas_jwks_url`）に照らした署名、
  - `aud` == `cron.chronos.expected_audience`（このエージェントの
    `agent:{instance_id}`）、
  - `iss` == `cron.chronos.portal_url`、
  - `exp` / `nbf`（30 秒の猶予）、
  - `purpose == "cron_fire"` — 一般的なエージェントの JWT（purpose がない、または別の purpose）は
    拒否するので、それをこのエンドポイントに使い回すことはできません。
- **本文:** `{"job_id": "ab12cd34", "fire_at": "..."}`（使うのは `job_id` だけです）。
- **ふるまい:**
  - トークンが無効・欠落・偽造・期限切れ・aud 違い・purpose 違い → **401** で、実行はしません。
  - `job_id` がない → **400**。
  - 有効 → すぐに **202 `{"status": "accepted", "job_id": "..."}`** を返し、
    ジョブはバックグラウンドで実行します。実行前に 202 を返すので、エージェントのターンが長くても
    relay の HTTP タイムアウトに引っかかることはありません。
- **高々 1 回:** エージェントは実行の前に、ストア単位の compare-and-set
  （`claim_job_for_fire`）でジョブを確保します。最初の発火の処理中（または完了後）に届いた
  relay やスケジューラーの再試行は確保に失敗し、二重に実行されることはありません。

---

## 高々 1 回の実行と仕掛け直しの意味 {#at-most-once-re-arm-semantics}

- **繰り返し（cron／間隔）:** 発火すると、エージェントは確保の一部として（ストアのロックの下で）
  `next_run_at` を進め、ジョブを実行し、それから新しい `next_run_at` に向けて単発タイマーを
  provision し直します。古い `fire_at` についての重複した relay は、確保済み、または時刻が進んでいる
  ことに気づいて捨てられます。
- **単発（`30m`、`+90s` など）:** 1 回だけ発火し、`mark_job_run` が完了として記録します。
  仕掛け直しはしません。
- **`repeat.times = N`:** 上限に達すると `mark_job_run` がジョブを削除するので、
  最後の発火のあとは `get_job` が `None` を返します → エージェントは仕掛け直し**ません**
  → 取り残される単発タイマーもなく、スケジュールはきれいに止まります。
- **複数レプリカのエージェント:** 1 つの `HERMES_HOME` を共有する N 個の gateway レプリカの
  間でも、ストアの CAS によって発火は高々 1 回になります。各発火を実行するのは、ちょうど 1 つのレプリカです。

## 突き合わせ（自己修復） {#reconcile-self-healing}

エージェントは、あるべき状態（`jobs.json`）と仕掛けてある状態を、次のときに突き合わせます。
- `start()`（gateway の起動／目覚め）、
- ジョブの変更が成功するたび（`on_jobs_changed`）、
- 各発火のあとに相乗りで（仕掛け直し）。

突き合わせでは、仕掛けていないジョブや時刻が変わったジョブを仕掛け、持ち主のいないものを取り消します。
provision に失敗しても（NAS の一時的なエラー）、次の突き合わせで自然に直ります。眠っているエージェントを
**定期的に起こすことはありません**。それをするとゼロまで縮小する意味がなくなるからです。

## 設定（エージェント側） {#config-agent-side}

どれもシークレットではありません（`config.yaml` の `cron.chronos.*`）。エージェントは
スケジューラーの認証情報を持ちません。ホスティングされたエージェントでは、NAS が provision の時点でこれらを設定します。

| キー | 意味 |
|---|---|
| `cron.provider` | `"chronos"` で有効にします（空 = 組み込みの刻み処理） |
| `cron.chronos.portal_url` | NAS のベース URL（JWT の `iss` として期待する値でもあります） |
| `cron.chronos.callback_url` | NAS からエージェントへの発火に使う、エージェント自身の公開ベース URL |
| `cron.chronos.expected_audience` | このエージェントの JWT の `aud`（`agent:{instance_id}`） |
| `cron.chronos.nas_jwks_url` | 発火用の JWT を検証するための NAS の JWKS |

`callback_url` / `portal_url` が空か、エージェントが Nous にログインしていなければ、
`is_available()` は False を返し、解決処理はプロセス内の組み込みの刻み処理にフォールバックします。
cron が発火のきっかけを失うことはありません。

**実行時に身元が拒否される場合（`403 invalid_client`）。** `is_available()` は設定しか見ないので、
保存してある Nous のトークンが、NAS 側で provision 済みのインスタンスに結びつく身元なのか（上の区間 1）
までは判断できません。`provision` が 403 `invalid_client` を返したとき — つまり `auth.json` にある
トークンが、`hermes-cli-vps` の bootstrap セッションでも `agent:*` クライアントでもなく、ただの
`hermes-cli` のユーザーログインだったとき — その拒否は、その認証情報が生きているあいだずっと変わりません。
仕掛けるときも、仕掛け直すときも、`list` のときも同じように失敗しますし、`hermes auth` でログインし直すと
それが決定的になります（bootstrap セッションを*置き換えて*しまい、作り直せるのは NAS だけだからです）。
そこでプロバイダーは、その対処法を名指しした警告を 1 回だけ記録し、NAS を呼ぶのをやめ、プロセスが終わるまで
組み込みの刻み処理を動かします。こうすれば、遅れて走る取りこぼしの掃除（`cron.misfire_grace_minutes`）
だけに頼らず、ジョブは時間どおり発火し続けます。一時的な失敗（5xx や通信のエラー）では切り替えません。
次の突き合わせで再試行します。

## 非常口（既定ではありません） {#escape-hatch-not-default}

受信する `/api/cron/fire` の検証処理は差し替えられます（`get_fire_verifier()`）。NAS を通る
relay の量がいつか飽和したら、ジョブごとに NAS が発行する cron 用の鍵を使って、スケジューラーから
エージェントへ直接届けるモードに切り替え、NAS の JWT の検証処理を置き換えられます。その場合も
**webhook のハンドラーは変わりません**。既定は NAS を仲介する方式（この契約）です。
