---
title: "公開されたサブエージェントのライフサイクル API"
description: ""
upstream_path: developer-guide/subagent-lifecycle-api.md
upstream_blob: 7054afcdb7356a8da9966c1b1243085a26957a43
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/subagent-lifecycle-api
---

# 公開されたサブエージェントのライフサイクル API {#public-subagent-lifecycle-api}

プラグインは、`tools.delegate_tool` やゲートウェイの内部、TUI の状態、`AIAgent` の
フィールドを持ち込まなくても、新しい Hermes の子セッションを立ち上げて見守れます。
このサービスは、いま動いているエージェントのターンから親をたどるので、
CLI でも、ゲートウェイでも、対話なしの実行でも、kanban のワーカーのセッションでも動きます。
エージェントのターンが動いていないところで立ち上げようとすると、
`No active Hermes parent session` を出して、閉じたまま失敗します。

```python
from agent.subagent_lifecycle import SubagentLaunchRequest

def launch_review(ctx):
    # Call from a plugin tool or hook while an agent turn is active.
    service = ctx.subagent_lifecycle
    handle = service.launch(SubagentLaunchRequest(
        goal="Review this change for regressions.",
        context="Only inspect the supplied repository.",
        role="leaf",
        correlation_id="review-42",
        allowed_toolsets=("file",),
    ))
    # Persist handle.to_dict() if desired.
    if service.wait(handle, timeout_seconds=2).timed_out:
        return handle.to_dict()
    return service.result(handle)
```

`SubagentHandle` はそのまま保存できる形で、版が付いた、中身の見えない権限を持っています。
これを `status`、`wait`、`cancel`、`result`、`reconnect` に渡してください。壊れた
ハンドルや偽造されたハンドルは `UNKNOWN` / `UNKNOWN_HANDLE` を返すだけで、子には触れません。

安定した状態は `PENDING`、`STARTING`、`RUNNING`、`SUCCEEDED`、`FAILED`、
`INTERRUPTED`、`CANCEL_REQUESTED`、`CANCELLED`、`UNKNOWN` です。

`cancel(handle, reason=...)` は協調的な取り消しです。子のエージェントに、
次の安全な区切りで中断するよう頼み、`CANCEL_REQUESTED` を返します。`wait` か
`result` が終わりの状態を実際に見るまで、終わったとは言いません。終わったあとの結果は
書き換わらず、何度読んでも同じで、32k 文字までに収まり、やり取りの記録や
表に出さない思考を含まず、変わらない結果のハッシュが付きます。

この API は、ライフサイクルを管理しながら非同期に実行するためのものです。子の生成と
完了は、`delegate_task` とまったく同じ、ホストが受け持つ経路を通ります。親側の
ツール解決の復元、記憶への通知、順番に並べた `subagent_stop` のフック、資源の後始末、
子の費用の集計まで含みます。同期版の `delegate_task` ツール、まとめて任せるやり方、
そのゲートウェイや TUI での見え方は、どれも変わりません。最初の実装では、
メタデータと終わったあとの結果を、プロセスの中に一時間だけ保持します。
プロセスを再起動したあとは、`reconnect` が `RECONNECT_UNAVAILABLE` を返し、
代わりの子を立ち上げることはありません。動いている Python のスレッドも、
プロセスの終了を越えては生き残れません。呼び出す側は、そうしたハンドルを
プロセスの終了によって中断されたものとして扱ってください。

要求は、閉じたまま失敗する側に倒してあります。goal・context・メタデータの大きさには
上限があり、知らないツールセットや親より広いツールセットは拒まれます。ツール単位での
遮断、作業ディレクトリの上書き、立ち上げごとのタイムアウトは、隔離を弱めずに
Hermes が支えられるようになるまで、はっきり拒みます。子の範囲を狭めたいときは
`allowed_toolsets` を使ってください。Hermes にもとからある、危険なツールを
遮断する仕組みは、そのまま効いています。
