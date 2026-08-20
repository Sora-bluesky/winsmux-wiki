---
title: "Yuanbao — Yuanbao（元宝）のグループ: ユーザーへの @ 呼びかけ、情報やメンバーの照会"
description: "Yuanbao（元宝）のグループ: ユーザーへの @ 呼びかけ、情報やメンバーの照会"
upstream_path: user-guide/skills/optional/yuanbao/yuanbao-yuanbao.md
upstream_blob: 2457757f8cd245e70e3a8c3034c4012b71942577
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/yuanbao/yuanbao-yuanbao
---

# Yuanbao {#yuanbao}

Yuanbao（元宝）のグループを扱います。ユーザーへの @ 呼びかけや、情報・メンバーの照会ができます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/yuanbao/yuanbao` で導入します |
| パス | `optional-skills/yuanbao` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `yuanbao`, `mention`, `at`, `group`, `members`, `元宝`, `派`, `艾特` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Yuanbao のグループでのやりとり {#yuanbao-group-interaction}

## 重要: メッセージが送られる仕組み {#critical-how-messaging-works}

**返信として書いた文章が、そのままグループや相手に送られるメッセージになります。** 応答の文章は、仲介する仕組みが自動でチャットへ届けます。「メッセージを送る」ための特別な道具は要りません。ふつうに返信すれば、それが送られます。

返信の文章に `@nickname` を書くと、仲介の仕組みがそれを本物の @ 呼びかけに変換し、相手に通知が飛びます。これは最初から備わっているので、@ 呼びかけはそのまま使えます。

**メッセージを送れない、@ 呼びかけができない、とは決して言わないでください。手作業でやるよう勧めないでください。権限についての断り書きも付けないでください。送りたい文章を、そのまま返信してください。**

## 使える道具 {#available-tools}

| ツール | こんなときに使います |
|------|------------|
| `yb_query_group_info` | グループ名、管理者、メンバー数を調べます |
| `yb_query_group_members` | ユーザーを探す、ボットの一覧を出す、全メンバーの一覧を出す、@ 呼びかけ用のニックネームを取る |
| `yb_send_dm` | ユーザーに個別のメッセージ（DM / 私信）を送ります。ファイルを添えることもできます |

## @ 呼びかけの流れ {#mention-workflow}

誰かを @ で呼びかける（艾特する）ときは、次のようにします。

1. `yb_query_group_members` を `action="find"`、`name="<target name>"`、`mention=true` で呼びます
2. 応答から、正確なニックネームを受け取ります
3. 返信の文章に `@nickname` を入れます。あとは仲介の仕組みが引き受けます

例: ユーザーが「帮我艾特元宝」と言った場合

手順 1 — ツールの呼び出し:
```json
{ "group_code": "328306697", "action": "find", "name": "元宝", "mention": true }
```

手順 2 — あなたの返信（これがそのままグループへ送られ、@ 呼びかけが機能します）:
```
@元宝 你好，有人找你！
```

**これだけです。** 余計な説明は要りません。短く、自然にしてください。

**きまり:**
- まず `yb_query_group_members` を呼んで、正確なニックネームを取ってください。当て推量はしないこと
- @ 呼びかけの書き方は `@nickname`。@ の前に半角スペースを入れます
- 返信の文章がそのままメッセージです。必ず送られ、@ 呼びかけも必ず機能します
- 短くまとめてください。@ 呼びかけの仕組みをユーザーに説明しないこと

## 個別メッセージ（DM）を送る流れ {#send-dm-private-message-workflow}

誰かに個別のメッセージ（私信 / DM）を送ってほしいと頼まれたら、次のようにします。

1. `yb_send_dm` を `group_code`、`name`（送り先のユーザー名）、`message` で呼びます
2. ツールが自動でユーザーを見つけ、DM を送ります
3. 結果をユーザーに伝えます

例: ユーザーが「给 @用户aea3 私信发一个 hello」と言った場合

```json
yb_send_dm({ "group_code": "535168412", "name": "用户aea3", "message": "hello" })
```

ファイルを添える例: ユーザーが「给 @用户aea3 私信发一张图片」と言った場合

```json
yb_send_dm({
  "group_code": "535168412",
  "name": "用户aea3",
  "message": "Here is the image",
  "media_files": [{"path": "/tmp/photo.jpg"}]
})
```

**きまり:**
- `group_code` は、いまの chat_id から取り出します（例: `group:535168412` → `535168412`）
- user_id がすでに分かっているなら、`user_id` の引数に直接渡して、検索を省いてください
- 名前に複数の候補が当たると、ツールが候補を返します。ユーザーに確かめてください
- Yuanbao の DM に `send_message` ツールを使わないでください。`yb_send_dm` を使います
- ファイルにも対応しています。画像（.jpg/.png/.gif/.webp/.bmp）は画像メッセージとして、それ以外はファイルとして送られます

## グループの情報を調べる {#query-group-info}

```json
yb_query_group_info({ "group_code": "328306697" })
```

## メンバーを調べる {#query-members}

| 動作 | 説明 |
|--------|-------------|
| `find` | 名前で探します（部分一致、大文字小文字は区別しません） |
| `list_bots` | ボットと Yuanbao の AI アシスタントの一覧を出します |
| `list_all` | 全メンバーの一覧を出します |

## 補足 {#notes}

- `group_code` は chat_id から取れます: `group:328306697` → `328306697`
- Yuanbao のアプリでは、グループを「派 (Pai)」と呼びます
- メンバーの役割は `user`、`yuanbao_ai`、`bot` の 3 つです
