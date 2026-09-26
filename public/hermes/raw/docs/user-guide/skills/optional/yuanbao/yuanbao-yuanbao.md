---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Yuanbao — 元宝のグループで、ユーザーへの @ メンション、グループ情報やメンバーの照会を行います"
description: "元宝のグループで、ユーザーへの @ メンション、グループ情報やメンバーの照会を行います"
upstream_path: user-guide/skills/optional/yuanbao/yuanbao-yuanbao.md
upstream_blob: d9f18746c28ed43f318473dc1d93b4de0abd7f5c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/yuanbao/yuanbao-yuanbao
---

# Yuanbao {#yuanbao}

元宝のグループで、ユーザーへの @ メンション、グループ情報やメンバーの照会を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 任意 — `hermes skills install official/yuanbao/yuanbao` で導入します |
| パス | `optional-skills/yuanbao` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `yuanbao`, `mention`, `at`, `group`, `members`, `元宝`, `派`, `艾特` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として見ています。
:::

# 元宝グループでのやりとり {#yuanbao-group-interaction}

## 重要: メッセージ送信の仕組み {#critical-how-messaging-works}

**返信テキストが、そのままグループやユーザーへ送られるメッセージです。** ゲートウェイが応答テキストをチャットへ自動で届けます。特別な「メッセージ送信」ツールは要りません。普通に返信すれば、それが送信されます。

返信テキストに `@nickname` を含めると、ゲートウェイがそれを本物の @ メンションに変換し、相手に通知が飛びます。これは最初から備わっている機能です。@ メンションは問題なく使えます。

**「メッセージを送れません」「@ メンションできません」と言ってはいけません。ユーザーに手作業でやってくださいと勧めてもいけません。権限についての断り書きを足す必要もありません。送りたいテキストをそのまま返信してください。**

## 使えるツール {#available-tools}

| ツール | 使う場面 |
|------|------------|
| `yb_query_group_info` | グループ名、オーナー、メンバー数を調べる |
| `yb_query_group_members` | ユーザーを探す、bot を一覧する、全メンバーを一覧する、@ メンション用のニックネームを得る |
| `yb_send_dm` | ユーザーへ個人メッセージ（DM / 私信）を送る。メディアファイルも添付できる |

## @ メンションの手順 {#mention-workflow}

誰かを @ メンション（艾特）したいときは、次のようにします。

1. `yb_query_group_members` を `action="find"`、`name="<target name>"`、`mention=true` で呼びます
2. 応答から、正確なニックネームを受け取ります
3. 返信テキストに `@nickname` を含めます。あとはゲートウェイがやってくれます

例: ユーザーが「帮我艾特元宝」と言った場合。

手順 1 — ツール呼び出し:
```json
{ "group_code": "328306697", "action": "find", "name": "元宝", "mention": true }
```

手順 2 — 返信（これがそのままグループへ送られ、@ メンションが機能します）:
```
@元宝 你好，有人找你！
```

**これだけです。** 余計な説明は要りません。短く、自然に返してください。

**ルール:**
- まず `yb_query_group_members` を呼んで正確なニックネームを得ます。推測してはいけません
- @ メンションの書き方は `@nickname`。@ の前に半角スペースを置きます
- 返信テキストがそのままメッセージです。必ず送信され、@ メンションも必ず機能します
- 簡潔に。@ メンションの仕組みをユーザーに説明してはいけません

## DM（個人メッセージ）を送る手順 {#send-dm-private-message-workflow}

ユーザーへ個人メッセージ（私信 / DM）を送ってほしいと頼まれたときは、次のようにします。

1. `yb_send_dm` を `group_code`、`name`（相手の名前）、`message` を渡して呼びます
2. ツールが相手を自動で探し、DM を送ります
3. 結果をユーザーに伝えます

例: ユーザーが「给 @用户aea3 私信发一个 hello」と言った場合。

```json
yb_send_dm({ "group_code": "535168412", "name": "用户aea3", "message": "hello" })
```

メディアを添える例: ユーザーが「给 @用户aea3 私信发一张图片」と言った場合。

```json
yb_send_dm({
  "group_code": "535168412",
  "name": "用户aea3",
  "message": "Here is the image",
  "media_files": [{"path": "/path/to/photo.jpg"}]
})
```

**ルール:**
- `group_code` は、いまの chat_id から取り出します（例: `group:535168412` → `535168412`）
- user_id がすでに分かっているなら、`user_id` パラメーターで直接渡し、検索を省きます
- 名前に一致するユーザーが複数いる場合、ツールは候補を返します。どちらか、ユーザーに確かめてください
- 元宝の DM に `send_message` ツールを使ってはいけません。`yb_send_dm` を使います
- メディアに対応しています。画像（.jpg/.png/.gif/.webp/.bmp）は画像メッセージとして、それ以外はファイルとして送られます

## グループ情報を調べる {#query-group-info}

```json
yb_query_group_info({ "group_code": "328306697" })
```

## メンバーを調べる {#query-members}

| アクション | 説明 |
|--------|-------------|
| `find` | 名前で検索します（部分一致・大文字小文字は区別しません） |
| `list_bots` | bot と元宝の AI アシスタントを一覧します |
| `list_all` | 全メンバーを一覧します |

## 補足 {#notes}

- `group_code` は chat_id から取れます: `group:328306697` → `328306697`
- 元宝アプリでは、グループを「派 (Pai)」と呼びます
- メンバーの役割: `user`、`yuanbao_ai`、`bot`
