---
title: "Kanban を複数ゲートウェイで運用する"
description: "プロファイルごとの複数ゲートウェイで 1 つの kanban ボードを動かす方法。ディスパッチャーは 1 つ、配信はプロファイルごと"
upstream_path: user-guide/features/kanban-multi-gateway.md
upstream_blob: 8ff65d82220fc27ac074b8365b232efdf9a78fff
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-multi-gateway
---

# 複数ゲートウェイでの運用 {#multi-gateway-deployment}

Hermes では、複数のゲートウェイプロセスを同時に動かせます。プロファイル
（default、writer、admin、coder、researcher）ごとに 1 つずつです。各ゲートウェイは
プラットフォーム API への接続をそれぞれ開き、自分のプロファイルの購読者にメッセージを届けます。

タスクの購読には、レビューのフィードバックも含まれます。`changes_requested` のレビュー
イベントは、対応が必要な review-BLOCK 通知として届きます。`notify+wake` を使う購読では、
これに加えて、発端となったチャット／スレッド／セッションそのものを起こします。
これにより、コントローラーが既存のカードと現在の実行を確認できます。`notify` は
通知だけ、`wake` は起こすだけのままです。レビューのフィードバックによってタスクが作成、
ブロック解除、再キュー投入されたり、その他の形で変更されたりすることはありません。

## ディスパッチャーは 1 つだけにする {#single-dispatcher-posture}

kanban のディスパッチャーを持つのは、1 つのゲートウェイだけです。そのゲートウェイは
`kanban.dispatch_in_gateway: true`（既定値）のままにし、ほかのゲートウェイはすべて
`false` に設定します。

**なぜ重要か:** ディスパッチの担当を 1 つに絞ることで、複数のゲートウェイが同じ作業を
奪い合って起動する事態を防ぎます。一方、通知の配信はプロファイルごとに担当します。
各ゲートウェイは、自分がプラットフォームアダプターを抱えているプロファイルの購読だけを
ポーリングします。イベントを原子的に確保する仕組みがあるため、監視プロセスが複数あっても
二重に配信されることはありません。

## 設定 {#configuration}

ディスパッチを担当するゲートウェイ（通常は `default` プロファイル）では、変更は
不要です。ほかのプロファイルのゲートウェイでは、`~/.hermes/config.yaml` に次を追加します。

```yaml
kanban:
  dispatch_in_gateway: false
```

または、環境変数 `HERMES_KANBAN_DISPATCH_IN_GATEWAY=false` を設定します。

## 各ゲートウェイの役割 {#what-each-gateway-does}

| ゲートウェイの役割 | dispatch_in_gateway | 購読中のボード DB を開くか | ディスパッチャー | 通知 |
|---|---|---|---|---|
| default（ディスパッチロックの所有者として確定したもの） | true（既定値） | はい | はい | 自分が担当するプロファイル + 担当情報が記録されていない旧形式の購読 |
| writer、admin、coder など | false | はい（そのプロファイルに購読がある場合） | いいえ | そのゲートウェイが担当するプロファイル |

ディスパッチを担当しないゲートウェイも、自分のプラットフォームアダプター
（Telegram、Discord など）向けのメッセージは配信します。タスクのディスパッチは行わず、
自分のプロファイルが担当する購読が 1 件もないボードは読み飛ばします。
