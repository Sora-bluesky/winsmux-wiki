---
title: "課金のライフサイクル（TUI）"
description: "課金・サブスクリプションのあらゆる状態と型付きの拒否を、TUI の表示文言と回復手順に対応づけた一覧"
upstream_path: developer-guide/billing-lifecycle.md
upstream_blob: 4ac7e406fe986e69632e9c073a3e2da52df2c7ee
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/billing-lifecycle
---

# 課金のライフサイクル: クライアント側の状態、エラー、回復 {#billing-lifecycle-client-side-state-errors-and-recovery}

このページは、ゲートウェイが（NAS から）返す `billing.*`/`subscription.*` のあらゆる状態の形を
ターミナルが実際にどう表示するかに対応づけ、さらに型付きの拒否・エラーコードそれぞれを、
ユーザーに見せる正確な文言と回復手順に対応づけたものです。保証していることは次のとおりです。
NAS の課金状態も型付きの拒否も、汎用のトースト通知に流れ込むことはありません。以下のケースはすべて、
`ui-tui/src/app/slash/commands/topup.ts`、`ui-tui/src/components/billingOverlay.tsx`、
`ui-tui/src/components/subscriptionOverlay.tsx` のいずれかにある明示的な分岐です。**未知の**コードでも
表示は穏やかに縮退します。クラッシュしたり拒否を黙って捨てたりせず、`default` 分岐に入り、
サーバーのペイロードから取り出した汎用ながら実のあるメッセージを表示します（空のトーストにはなりません）。

## 1. `billing.state` の形 → 表示 {#1-billingstate-shapes-render}

出典: `ui-tui/src/components/billingOverlay.tsx`（`OverviewScreen`、
`BuyScreen`、`AutoReloadScreen`）、`ui-tui/src/app/slash/commands/topup.ts`（`/topup` の実行）。

| 状態の形 | 表示 |
|---|---|
| ログアウト状態（`s.logged_in === false`） | オーバーレイは開きません。`sys`: `💳 Not logged into Nous Portal — run /portal to log in, then /topup.` |
| `billing.state` の RPC 取得に失敗（通信エラー・タイムアウト） | **fail-closed**: `.catch(ctx.guardedErr)` により、オーバーレイは開かず、状態を推測もしません。`sys`: `error: <message or "request failed">`。「カードなし」など推測した状態は決して表示しません。ユーザーは `/topup` をやり直す必要があります。 |
| `card: null`（保存済みカードなし）、フルメニュー（`is_admin && cli_billing_enabled`） | 概要画面に `No saved card on file — "Add funds" walks you through adding one.` と表示します。「Add funds」は**カード追加の流れ**を開きます: `Add a card on the portal` / `I've added it — check again` / `Back`（金額選択は開きません。開くと `no_payment_method` で 403 になるためです）。 |
| `card` あり、`resolved_via` が設定済み | カードの出どころを反映した `display` フィールドを使い、`Card: {display}` と表示します（例: `Visa ····4242 — the card on your subscription`）。 |
| `card` あり、`resolved_via` なし（古い NAS） | 汎用の `Card: {masked}` に切り替わります。確認画面には `Your card saved on the portal will be charged.` が加わります。 |
| `auto_reload: null` | 自動チャージの行はまったく表示しません（`autoReloadLine` が `null` を返す）。この機能は表に出ません。 |
| `auto_reload.card.kind: 'canonical'` | 別カードの警告は出しません。カードの行は登録済みのカードの表示になります。 |
| `auto_reload.card.kind: 'distinct'` | 自動チャージ画面に `⚠ Auto-refill is charging {brand} ••{last4} — not your card on file.` を表示します（食い違いの通知）。 |
| `auto_reload.card.kind: 'none'` | 表示は `canonical` と同じで、別カードの警告は出しません。 |
| `monthly_cap` あり、`limit_usd != null` | `{spent_display} of {limit_display} used this month`（`is_default_ceiling` のときに限り ` (default ceiling)` を付加）。 |
| `monthly_cap` なし、または `limit_usd == null` | `No monthly cap visible (managed on the portal).` |
| 課金権限のないロール（`!is_admin`、メニューが縮小） | 注記: `Billing actions need someone with billing permissions (owner, admin, or finance admin).` メニューは `Manage on portal` / `Cancel` に縮小します。 |
| 組織の停止スイッチがオフ（`is_admin` だが `!cli_billing_enabled`） | 注記: `Remote spending is off for this org — a billing admin can turn it on from the portal's Hermes Agent page.` メニューは同じく縮小します。 |

注: `full = s.is_admin && s.cli_billing_enabled` が制御するのは**組織単位**の
スイッチで、ターミナルごとの `billing:manage` スコープではありません。スコープは事前チェックではなく
事後に判明し（請求が `insufficient_scope` で 403 になる）、再開できる
権限昇格の画面へ誘導されます。

## 2. 拒否コード（`renderBillingError`、コードに書かれた順） {#2-refusal-codes-renderbillingerror-in-code-order}

出典: `ui-tui/src/app/slash/commands/topup.ts:37-149` の `renderBillingError`。
「Portal」の行 = `sys('Portal: {portal_url}')` は、`portal_url` があれば、どのコードでも（default を含めて）末尾に付きます。

| `error` コード | 文言 | ポータル URL | `retry_after` |
|---|---|:-:|:-:|
| `insufficient_scope` | `This needs Remote Spending allowed. Start a top-up to allow it, then retry.` | あれば | — |
| `remote_spending_revoked`（CF-4） | `{An admin stopped remote spending for this terminal. \| You stopped remote spending for this terminal.}`（`actor` によって切り替え）`Reconnect to restore — run /portal to re-authorize this terminal.` あわせて `billing` オーバーレイの状態をすぐに消去します（トークンの更新を待ちません）。 | あれば | — |
| `session_revoked` | `Your session was logged out. Run /portal to log in again.` あわせて `billing` オーバーレイの状態を消去します。 | あれば | — |
| `cli_billing_disabled` / `remote_spending_disabled`（両方が送られる） | `Remote spending is off for this account — a billing admin can turn it on from the portal's Hermes Agent page.` | あれば | — |
| `role_required` | `Adding funds needs someone with billing permissions (owner, admin, or finance admin), or manage this on the portal.` | あれば | — |
| `consent_required` | `This action needs a one-time card confirmation and consent step on the portal before it can proceed.` | あれば | — |
| `org_access_denied` | `This token isn't bound to an org you can manage. Sign in with the right org, or manage this on the portal.` | あれば | — |
| `upgrade_cap_exceeded` | `🔴 Daily plan-change limit reached (5 per org) — try again tomorrow, or manage this on the portal.` | あれば | — |
| `auto_top_up_disabled_failures` | `Auto-reload was turned off after repeated charge failures. Fix the card issue, then re-enable it from /topup → Auto-reload.` | あれば | — |
| `idempotency_conflict` | `🔴 That charge key was already used for a different amount. Start a fresh top-up.` | あれば | — |
| `no_payment_method` | `💳 No saved card for terminal charges yet. Set one up on the portal (one-time credit buys don't save a reusable card).` | あれば | — |
| `monthly_cap_exceeded` | `payload.remainingUsd` があれば `🔴 Monthly spend cap reached — ${remainingUsd} headroom left.`、なければ `🔴 Monthly spend cap reached.` | あれば | — |
| `rate_limited` / `temporarily_unavailable` | `🟡 Too many charges right now{ (try again in ~N min)}. This isn't a payment failure.` | あれば | **あり**。分数は `max(1, round(retry_after/60))` で計算 |
| `stripe_unavailable` | `🟡 Stripe is having trouble right now — try again shortly{ (try again in ~N min)}.` | あれば | **あり**（同じ式） |
| *default（未知・その他）* | `🔴 {message \|\| error \|\| 'Billing request failed.'}`。サーバーが返した内容をそのまま表示し、空のトーストにはしません。 | あれば | — |

## 3. 請求の確定結果（`pollCharge` / `renderChargeFailed`） {#3-charge-settlement-outcomes-pollcharge-renderchargefailed}

出典: `pollCharge`（`ui-tui/src/app/slash/commands/topup.ts:170-258`）と
`renderChargeFailed`（`:260-290`）。ポーリング間隔は2秒、上限は5分
（`POLL_INTERVAL_MS=2000`、`POLL_CAP_MS=5*60*1000`）で、終端でない**すべての**経路
（保留中*と*スロットリング中の両方）に適用されます。そのため 429/503 が続いても、
ポーリングが永遠に続くことはありません。

| 結果 | 文言 | 補足 |
|---|---|---|
| `status: 'settled'` | `✅ ${amount_usd} added.`（金額がなければ `✅ Credits added.`） | 終端の成功。 |
| `status: 'failed'`、`reason: 'authentication_required'` | `🔴 Your bank requires verification (3DS). Complete it on the portal to finish this purchase.` | `portalUrl` があれば `Portal:` の行を追加。 |
| `status: 'failed'`、`reason: 'payment_method_expired'` | `🔴 Your card has expired. Update it on the portal.` | `Portal:` の行を追加。 |
| `status: 'failed'`、`reason: 'card_declined'` | `🔴 Your card was declined. Try another card on the portal.` | `Portal:` の行を追加。 |
| `status: 'failed'`、`reason: 'processing_error'` | `🔴 The charge didn't go through (processing_error).` | `Portal:` の行を追加。 |
| `status: 'failed'`、認識できない・欠けている `reason` | `🔴 The charge didn't go through ({reason \|\| 'processing_error'}).` | 同じくポータルへ誘導します。`cli.py` の `_billing_portal_hint` と同じ挙動です。 |
| ポーリングのタイムアウト（5分の上限を過ぎても `pending`） | `🟡 Still processing after 5 minutes — this is a timeout, not a failure. Check /topup or the portal shortly.` | `portalUrl` があれば `Portal:` の行を追加。明示的に失敗とは呼びません。 |
| ポーリング中の取り消し（ポーリング中に `remote_spending_revoked` / `session_revoked`） | 対応する §2 の文言を表示し、**そのあとに** `🟡 Your last charge's outcome is unconfirmed — check your balance/history before retrying.` を付け加えます。 | CF-7 ルール4: ポーリング中の取り消し後の 403 はどちらとも取れる（請求がすでに確定しているかもしれない）ため、決して「失敗」とは呼びません。 |
| ポーリング中の 429/503（`rate_limited`/`temporarily_unavailable`/`stripe_unavailable`） | エラーは表示しません。`retry_after` に従って間隔を空け（既定5秒、上限30秒）、5分の上限までポーリングを続け、その後はタイムアウトとして扱います。 | 支払いの失敗ではありません。 |
| それ以外の `!ok` な状態確認エラー | `🔴 Could not check the charge: {message \|\| error \|\| 'error'}` | |
| 通信の途絶（ポーリングの RPC が例外を投げる・reject される） | `🟡 Your last charge's outcome is unconfirmed — check your balance/history before retrying.`（`UNCONFIRMED_CHARGE_MESSAGE`） | ポーリング中の取り消しと同じく「未確認なので残高を確認」という伝え方です。接続が切れたことを「失敗」と読むことは決してありません。 |

## 4. サブスクリプションのプレビュー・保留中の変更・アップグレードの結果 {#4-subscription-preview-pending-change-upgrade-outcomes}

出典: `ui-tui/src/components/subscriptionOverlay.tsx` の `previewAndRoute`、`applyPendingAndRoute`、`upgradeResult`、
`stepUpDenialResult`。

**プレビューの `effect` の値**（確認画面の内容を決めます）:

| `effect` | 確認画面の文言 | 主な操作 |
|---|---|---|
| `charge_now` | `Upgrade to {target}. You will be charged {amount} now (prorated).`（月間クレジットの差分と、判定処理が確実にわかる場合はどのカードかを追加） | `Pay {amount} & upgrade now` |
| `scheduled` | `Change to {target} — takes effect {date}. No charge now; you keep your current plan until then.` | `Schedule change to {target}` |
| `no_op` | `You are already on {target} — nothing to change.` | なし（戻るのみ） |
| `blocked` | `{preview.reason}`、なければ代わりに `That change cannot be made here — manage it on the portal.` | `Manage on portal` |
| プレビューの RPC が `null` を返す・通信に失敗 | 結果画面へ直行: `Could not preview that change.` | — |
| プレビューが `!ok`、`insufficient_scope` | `stepup` 画面へ（`{kind:'preview', tierId}`） | — |
| プレビューが `!ok`、それ以外のエラー | `errorResult(p)` で結果画面へ（`message \|\| error \|\| 'Something went wrong. Try again, or manage on the portal.'`） | — |

**保留中の変更を適用した結果**（`applyPendingAndRoute`）:

| `pending.kind` | 成功時の文言 |
|---|---|
| `cancellation` | `Scheduled — your plan stays active until the end of the billing period, then it cancels. Nothing changes today.` |
| `tier_change`（ダウングレード・予約） | `Scheduled — your plan doesn't change today. You keep your current plan until the end of the billing period, then it switches.` |
| `upgrade` | `upgradeResult` を通して処理（下記） |
| どの種類でも、変更操作が `insufficient_scope` | 権限昇格へ（`{kind:'apply'}`） |

**アップグレードの `status` × `reason` の対応表**（`upgradeResult`。この
順で確認し、`reason` を `status` *より先に*確認します）:

| 条件 | 結果 |
|---|---|
| `r === null`（請求を伴う経路での通信失敗） | `Couldn't confirm the upgrade — your card may or may not have been charged. Re-run /subscription to check your plan before trying again.` どちらとも取れる状態なので、やみくもな再試行はしません。 |
| `reason: 'authentication_required'` **または** `reason: 'subscription_payment_intent_requires_action'` | `Please verify your card in the portal to finish this upgrade.` → `recovery_url`。**どちらの reason も同じ SCA の文言に対応します**。クライアントが `status` ではなく `reason` で分岐するのは、#711 より前の NAS が SCA のケースを `status: 'payment_failed'` と誤ってラベル付けする（区別できる reason がまだ無い）場合でも、はっきりした拒否として読まずに正しい「カードを確認してください」の文言へ誘導するためです。 |
| `reason: 'card_declined'` | `Your card was declined — try a different card on the portal.` → `recovery_url`。 |
| `ok && status: 'already_on_tier'` | `You are already on {target_tier_name}.`（成功） |
| `ok && status: 'upgraded'` | `Upgraded to {target_tier_name}. Your new monthly credits land in a moment.` 結果整合性を待つ適用ポーリング（下記）を開始します。 |
| `status: 'requires_action'`（区別できる reason なし） | `This upgrade needs extra verification (3DS). Finish it on the portal.` → `recovery_url`。 |
| `status: 'payment_failed'`（区別できる reason なし） | `Your card was declined. Update your payment method on the portal and try again.` → `recovery_url`。 |
| それ以外 | `errorResult(r)`: `message \|\| error \|\| 'Something went wrong. Try again, or manage on the portal.'` |

**結果整合性を待つ適用ポーリング**（`ResultScreen`。`status:
'upgraded'` の後だけ）: `billing`/サブスクリプションの状態を2秒ごと
（`UPGRADE_CONFIRM_INTERVAL_MS`）に最大15回
（`UPGRADE_CONFIRM_ATTEMPTS`、つまり約30秒）ポーリングし、`current.tier_id` が
目的のプランに切り替わるのを待ちます。待っている間の画面は `Applying…` と表示し、時間内に切り替わらなければ
`Still applying` / `Your upgrade succeeded and is still
applying — refresh in a moment.` と表示します。NAS の反映が追いついていないだけで、
アップグレードを失敗として報告し直すことは決してありません。

**権限昇格が拒否されたときの文言**（`stepUpDenialResult`、サブスクリプションの流れ）:

| `error` | 文言 |
|---|---|
| `session_revoked` | `Your session expired — run /portal to log in again, then retry the change.` |
| `remote_spending_revoked` | `{message}`、なければ `Remote spending was stopped for this terminal — reconnect from the portal, then retry.` |
| `rate_limited` | `Too many attempts — wait a moment, then try again.` |
| その他・未知 | `{message}`、なければ `Remote Spending was not allowed — someone with billing permissions (owner, admin, or finance admin) must approve it. You can also make this change on the portal.` |

権限付与後の再実行中にスコープの拒否が**再び**起きても、権限昇格の画面には
戻りません（すでにその画面が表示されており、再度差し替えると画面が固まるためです）。
代わりに `allowStepUp=false` で終端の結果を表示します: `Remote Spending still
isn’t active for this terminal — the authorization didn’t take. Retry, or make
this change on the portal.`

## テキストモード（CLI）での同等性 {#text-mode-cli-parity}

`cli.py` の `_show_billing` / `_billing_overview` と `_show_subscription` /
`_subscription_overview` は、同じ状態の形（残高のタイトル、2本のバーによる
ドル建ての利用量、自動チャージの行、カードの行、月間上限）を表示し、
「ログアウト時やポータルの一時的な不具合では fail-open とし、決してクラッシュしない」という規律も共有しています。CLI の
`/subscription` は、対話的な環境にいる有料プランの管理者・オーナーに、**ターミナル内で完結する
変更の流れ**（プラン選択 → プレビュー → 確認 → 適用。TUI オーバーレイと同等）を提供します。
メンバーや非対話的な環境では、`_billing_portal_hint` による `subscription_manage_url` へのディープリンクに
切り替わります。`/topup` の対話的なモーダル（prompt_toolkit）も同じように TUI オーバーレイに合わせてあり、
非対話的な環境では同じテキストとポータルへのリンクの表示に切り替わり、
入力を求めることはありません。

| CLI の画面・状態 | 挙動（TUI・デスクトップとの同等性） |
| --- | --- |
| **Free** プランで管理者・オーナー、かつ対話的な環境での `/subscription` | `_subscription_free_catalog` が、TUI と同じ `tiers[]` データからプランの一覧を表示します。有効な有料プランごとに1行、安い順に、`name · $/mo · $credits/mo` の形です（月間クレジットはドル建てなので `$22 credits/mo` と表示し、単なる数字にはしません）。番号で選ぶと、`plan=<tier_id>` を付けた `/manage-subscription` のディープリンクが開き、ポータル側で選んだプランが選択済みになります。新規のサブスクリプションには新しいカードが必要なので、できる操作はポータルへの受け渡しだけです（ここでターミナルが請求することはありません）。 |
| CLI が組み立てる管理・購読用のすべての URL | `subscription_manage_url(state, tier_id=…)` は、**プランが選ばれたときだけ**（Free の一覧）`plan=<tier_id>` を付けます（名前や slug ではなく、`tiers[]` の安定した ID）。ポータルがサーバー側で検証し、未知のプランは無視するので、CLI は選択があれば無条件に付け、TUI の `?plan=` と同じ挙動になります。`org_id` を先に、`plan` を後に出力します。 |
| CLI での**ダウングレード** | 通常の変更は**ネイティブ・アプリ内**で完結します（`put_subscription_pending_change` による請求なしの予約）。ダウングレードが拒否された場合は汎用の管理 URL を表示することがありますが、`plan=<tier_id>` は決して付けません。プランを指定したディープリンクは、新規のサブスクリプションとアップグレード専用です。 |
| `/topup` の概要画面の操作文言 | 1回限りのチャージと自動の補充を分け、その違いをそれぞれの最初の文で先に伝えます: `Add funds now — a single charge, added to your balance today.` と `Refill when low — charges $X automatically when your balance falls below $Y.`（ドル建てだけの `/topup` 画面では「credits」という語を使いません。「Add funds now」だけで1回限りの意味が伝わります）。自動チャージがオフのときは、自動の行に具体的な金額を載せません。 |

## 将来の互換性 {#forward-compatibility}

上の表に無い `error`/`status`/`reason` のコードは、`renderBillingError`（§2）の
`default` 分岐か、`errorResult`/`upgradeResult` の
フォールスルー（§4）に入ります。その場合もサーバー自身の `message` は表示されます（空にもクラッシュにもなりません）。
専用の文言や型付きの回復手段が無いだけです。
NAS W3 ではカードの健全性を表すコード（`card_paused`、`card_expired`、
`card_mismatch`）が導入されますが、ここではまだ型付けされていません。クライアントの更新で
明示的な分岐が追加されるまでは、未知のコードとして届き、この
default の経路へ縮退します。
