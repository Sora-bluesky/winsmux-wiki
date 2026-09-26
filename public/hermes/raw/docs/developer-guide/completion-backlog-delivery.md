---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "たまったバックグラウンド完了通知"
description: ""
upstream_path: developer-guide/completion-backlog-delivery.md
upstream_blob: 8a516ce4769b3f4a0c9dd3e89993259c7d9c75bd
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/completion-backlog-delivery
---

# たまったバックグラウンド完了通知 {#background-completion-backlogs}

対話画面では、ひとつの会話にすでに届いているバックグラウンド処理の完了通知が続いているとき、
それらをまとめて 1 回の通知ターンにします。わざと遅らせるわけではありませんし、
終わった時刻がばらばらの処理まで必ずまとめる、という約束でもありません。失敗も成功時の出力も
そのまとまりに残りますし、完了通知が 1 件だけならもとの文面のまま出ます。

処理の同定は配信の直前まで有効です。そのため `process_manage` の wait / log / kill で結果を
明示的に受け取ると、その完了通知は、すでに処理の一覧から外れて入力待ちの列に入ったあとでも
CLI に出なくなります。まとまりの中身がすべて受け取り済みなら、ターンは始まりません。
出力の見張りと非同期の委任結果は、これまでどおり別の通知として、もとの順序で届きます。
完了通知のまとまりに畳み込まれることはありません。

## 使う側と受け持ち {#consumers-and-ownership}

- **従来の CLI:** `hermes_cli/cli_process_notifications.py` が、待機中とターン後の吐き出し、
  圧縮を踏まえた受け持ちの判定、最後の入力のほどきを担当します。
- **TUI とデスクトップ:** `tui_gateway/session_notifications.py` が、受け持ちを確かめたうえで、
  ポーラーが取った「届いている分」のスナップショットをまとめます。処理ごとの UI 表示は
  これまでどおりそれぞれ出ます。会話が動いている最中のセッションは、組み立て済みの文字列ではなく
  構造化したイベントのまま列に戻します。
- **TUI のターン後の受け皿:** `tui_gateway/prompt_turn.py` が同じ振り分けと描画の経路を使います。
  デスクトップとダッシュボードのチャットは、この裏側を共有しています。
- **メッセージングのゲートウェイ:** `gateway/run_notifications.py` は、すでに宛先ごとの
  短い時間窓でまとめる仕組みを自前で持っています。今回の対話側の変更は、その仕組みを置き換えるものでも、
  アダプターの送信を変えるものでもありません。
- **対話しない使い方（ヘッドレス）:** この変更で、API リクエストや ACP クライアント、
  一度きりの CLI 実行のために新しい自動通知ループができるわけではありません。

共通の描画部分は `tools/process_registry_notifications.py::ProcessNotificationBatch` です。
まとまり自体も、その配信状況も、システムプロンプトには残しません。宛先の決まったイベントには
証明できる持ち主が必要で、別の動いているセッションが横から引き取ることはできません。
委任の配信は、これまでどおり永続的な claim / complete の台帳を通り、処理のまとまりごとではなく
委任 1 件につき 1 回です。

## 手元での検証と、その限界 {#local-validation-and-its-limits}

`evals/completion_backlog_probe.py REPO OUTPUT.json` は、一時ディレクトリの中で実際のシェルの
子プロセスを起こし、本物の完了イベントを読み、本番の CLI・TUI のポーラー・ターン後の通知経路を
そのまま動かします。ターンの受け口はループバックの HTTP に差し替えてあり、`chat` と
`_run_prompt_submit` の代わりになります。実際に配信されたものは記録しますが、モデルの推論、
ネイティブの描画とのやり取り、ホスティングされた環境までは**動かしません**。見張りと委任の封筒は
テスト用に作ったものだと分かるようにしてあり、委任の claim には一時的な本物の SQLite 台帳を使います。
たまった分を扱う検証には、終了コードが 0 でないものも含めてあります。

このプローブが確かめるのは、届いている分がたまっている場合、1 件だけの完全一致、
明示的に受け取り済みの結果、他人が持ち主の場合、そして見張りや委任が完了通知と混ざる場合です。
測っているのは通知の境目でターンがいくつ立ち上がるかであって、モデルのトークン節約量ではありません。
