---
title: "Airtable — curl で使う Airtable REST API"
description: "curl で使う Airtable REST API"
upstream_path: user-guide/skills/bundled/productivity/productivity-airtable.md
upstream_blob: 05a3e13fba069c1e9bf3b78086031bee876db0ed
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/productivity/productivity-airtable
---

# Airtable {#airtable}

curl で Airtable の REST API を使います。レコードの作成・取得・更新・削除、絞り込み、upsert を扱います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/productivity/airtable` |
| バージョン | `1.1.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Airtable`, `Productivity`, `Database`, `API` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Airtable — ベース、テーブル、レコード {#airtable-bases-tables-records}

Airtable の REST API を、`terminal` ツールから `curl` で直接たたきます。MCP サーバーも OAuth の手続きも Python の SDK も使いません。必要なのは `curl` とパーソナルアクセストークンだけです。

## 事前に用意するもの {#prerequisites}

1. https://airtable.com/create/tokens で **パーソナルアクセストークン (PAT)** を作ります（トークンは `pat...` で始まります）。
2. 最低限、次のスコープを付けます。
   - `data.records:read` — 行を読む
   - `data.records:write` — 行を作る / 更新する / 削除する
   - `schema.bases:read` — ベースとテーブルを一覧する
3. **ここが大事です:** 同じトークンの設定画面で、使いたいベースをトークンの **Access** の一覧に追加します。PAT はベースごとに範囲が決まっていて、対象外のベースに正しいトークンで投げると `403` が返ります。
4. トークンは `${HERMES_HOME:-~/.hermes}/.env` に置きます（`hermes setup` から設定してもかまいません）。
   ```
   AIRTABLE_API_KEY=pat_your_token_here
   ```

> 補足: 古い `key...` 形式の API キーは 2024 年 2 月に廃止されました。いま使えるのは PAT と OAuth のトークンだけです。

## API の基本 {#api-basics}

- **エンドポイント:** `https://api.airtable.com/v0`
- **認証ヘッダー:** `Authorization: Bearer $AIRTABLE_API_KEY`
- **すべての要求** で JSON を使います（POST/PATCH/PUT の本文には `Content-Type: application/json` を付けます）。
- **オブジェクトの ID:** ベースは `app...`、テーブルは `tbl...`、レコードは `rec...`、フィールドは `fld...` です。ID は変わりませんが、名前は変わります。自動化では ID を使います。
- **レート制限:** 1 つのベースあたり毎秒 5 リクエストです。`429` が返ったら間を空けます。1 つのベースに一度に投げると絞られます。

curl の基本形は次のとおりです。
```bash
curl -s "https://api.airtable.com/v0/$BASE_ID/$TABLE?maxRecords=5" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```

`-s` は curl の進捗表示を消します。Hermes に渡る出力をきれいに保つため、毎回付けてください。読みやすい JSON にするには `python3 -m json.tool`（どの環境にもあります）か `jq`（入っていれば）に通します。

## フィールドの型（本文の書き方） {#field-types-request-body-shapes}

| フィールドの型 | 書き込むときの形 |
|---|---|
| 1 行テキスト | `"Name": "hello"` |
| 長いテキスト | `"Notes": "multi\nline"` |
| 数値 | `"Score": 42` |
| チェックボックス | `"Done": true` |
| 単一選択 | `"Status": "Todo"`（`typecast: true` を付けない限り、その選択肢が既にある必要があります） |
| 複数選択 | `"Tags": ["urgent", "bug"]` |
| 日付 | `"Due": "2026-04-01"` |
| 日時 (UTC) | `"At": "2026-04-01T14:30:00.000Z"` |
| URL / メール / 電話 | `"Link": "https://…"` |
| 添付ファイル | `"Files": [{"url": "https://…"}]`（Airtable が取得して自前で持ち直します） |
| リンクされたレコード | `"Owner": ["recXXXXXXXXXXXXXX"]`（レコード ID の配列） |
| ユーザー | `"AssignedTo": {"id": "usrXXXXXXXXXXXXXX"}` |

作成や更新の本文のいちばん外側に `"typecast": true` を渡すと、Airtable が値を自動で合わせてくれます（選択肢をその場で作る、`"42"` を `42` に直す、など）。

## よく使う取得 {#common-queries}

### トークンから見えるベースを一覧する {#list-bases-the-token-can-see}
```bash
curl -s "https://api.airtable.com/v0/meta/bases" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```

### ベースのテーブルとスキーマを一覧する {#list-tables-schema-for-a-base}
```bash
curl -s "https://api.airtable.com/v0/meta/bases/$BASE_ID/tables" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```
書き換えを始める前に、これを実行します。フィールドの正確な名前と ID が分かり、選択肢のフィールドなら `options.choices` も見えて、主フィールドの名前も確認できます。

### レコードを一覧する（先頭 10 件） {#list-records-first-10}
```bash
curl -s "https://api.airtable.com/v0/$BASE_ID/$TABLE?maxRecords=10" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```

### レコードを 1 件取得する {#get-a-single-record}
```bash
curl -s "https://api.airtable.com/v0/$BASE_ID/$TABLE/$RECORD_ID" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```

### レコードを絞り込む (filterByFormula) {#filter-records-filterbyformula}
Airtable の式は URL エンコードが必要です。手で書かず、Python の標準ライブラリに任せます。
```bash
FORMULA="{Status}='Todo'"
ENC=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$FORMULA")
curl -s "https://api.airtable.com/v0/$BASE_ID/$TABLE?filterByFormula=$ENC&maxRecords=20" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```

よく使う式の形は次のとおりです。
- 完全一致: `{Email}='user@example.com'`
- 部分一致: `FIND('bug', LOWER({Title}))`
- 複数の条件: `AND({Status}='Todo', {Priority}='High')`
- どちらか: `OR({Owner}='alice', {Owner}='bob')`
- 空でない: `NOT({Assignee}='')`
- 日付の比較: `IS_AFTER({Due}, TODAY())`

### 並べ替えとフィールドの指定 {#sort-select-specific-fields}
```bash
curl -s "https://api.airtable.com/v0/$BASE_ID/$TABLE?sort%5B0%5D%5Bfield%5D=Priority&sort%5B0%5D%5Bdirection%5D=asc&fields%5B%5D=Name&fields%5B%5D=Status" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```
クエリパラメータの角かっこは必ず URL エンコードします（`%5B` と `%5D`）。

### 名前の付いたビューを使う {#use-a-named-view}
```bash
curl -s "https://api.airtable.com/v0/$BASE_ID/$TABLE?view=Grid%20view&maxRecords=50" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```
ビューは、保存された絞り込みと並べ替えをサーバー側で適用します。

## よく使う書き換え {#common-mutations}

### レコードを作る {#create-a-record}
```bash
curl -s -X POST "https://api.airtable.com/v0/$BASE_ID/$TABLE" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"fields":{"Name":"New task","Status":"Todo","Priority":"High"}}' | python3 -m json.tool
```

### 1 回の呼び出しで最大 10 件作る {#create-up-to-10-records-in-one-call}
```bash
curl -s -X POST "https://api.airtable.com/v0/$BASE_ID/$TABLE" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "typecast": true,
    "records": [
      {"fields": {"Name": "Task A", "Status": "Todo"}},
      {"fields": {"Name": "Task B", "Status": "In progress"}}
    ]
  }' | python3 -m json.tool
```
まとめて扱えるエンドポイントは **1 回につき 10 件** までです。それ以上入れたいときは、10 件ずつのループにして、毎秒 5 リクエストの制限を守るために少し待ちを入れます。

### レコードを更新する（PATCH — 差分を反映し、触れていないフィールドは残ります） {#update-a-record-patch-merges-preserves-unchanged-fields}
```bash
curl -s -X PATCH "https://api.airtable.com/v0/$BASE_ID/$TABLE/$RECORD_ID" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"fields":{"Status":"Done"}}' | python3 -m json.tool
```

### 突き合わせ用のフィールドで upsert する（ID は不要） {#upsert-by-a-merge-field-no-id-needed}
```bash
curl -s -X PATCH "https://api.airtable.com/v0/$BASE_ID/$TABLE" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "performUpsert": {"fieldsToMergeOn": ["Email"]},
    "records": [
      {"fields": {"Email": "user@example.com", "Status": "Active"}}
    ]
  }' | python3 -m json.tool
```
`performUpsert` は、突き合わせ用フィールドの値が新しければレコードを作り、すでにあれば更新します。何度実行しても同じ結果になる同期に向いています。

### レコードを削除する {#delete-a-record}
```bash
curl -s -X DELETE "https://api.airtable.com/v0/$BASE_ID/$TABLE/$RECORD_ID" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```

### 1 回の呼び出しで最大 10 件削除する {#delete-up-to-10-records-in-one-call}
```bash
curl -s -X DELETE "https://api.airtable.com/v0/$BASE_ID/$TABLE?records%5B%5D=rec1&records%5B%5D=rec2" \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" | python3 -m json.tool
```

## ページ送り {#pagination}

一覧のエンドポイントが 1 ページで返すのは **最大 100 件** です。応答に `"offset": "..."` が入っていたら、それを次の呼び出しに渡します。この項目が出てこなくなるまで繰り返します。

```bash
OFFSET=""
while :; do
  URL="https://api.airtable.com/v0/$BASE_ID/$TABLE?pageSize=100"
  [ -n "$OFFSET" ] && URL="$URL&offset=$OFFSET"
  RESP=$(curl -s "$URL" -H "Authorization: Bearer $AIRTABLE_API_KEY")
  echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); [print(r["id"], r["fields"].get("Name","")) for r in d["records"]]'
  OFFSET=$(echo "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("offset",""))')
  [ -z "$OFFSET" ] && break
done
```

## Hermes での基本的な進め方 {#typical-hermes-workflow}

1. **認証を確かめます。** `curl -s -o /dev/null -w "%{http_code}\n" https://api.airtable.com/v0/meta/bases -H "Authorization: Bearer $AIRTABLE_API_KEY"` を実行して、`200` が返ることを見ます。
2. **ベースを特定します。** 上の手順でベースを一覧します。トークンに `schema.bases:read` がない場合は、`app...` の ID を本人に直接聞きます。
3. **スキーマを確認します。** `GET /v0/meta/bases/$BASE_ID/tables` を実行し、フィールドの正確な名前と主フィールドの名前を、書き換えを始める前にそのセッションで控えておきます。
4. **書く前に読みます。** 「Y のときの X を更新して」という依頼では、まず `filterByFormula` で `rec...` の ID を突き止め、それから `PATCH /v0/$BASE_ID/$TABLE/$RECORD_ID` を投げます。レコード ID を当てずっぽうで書かないでください。
5. **書き込みはまとめます。** 関係のある作成をまとめて 10 件の POST 1 回にすると、毎秒 5 リクエストの枠に収まります。
6. **消す操作には注意します。** API で消したものは元に戻せません。「X を全部消して」と言われたら、絞り込みの条件と対象の件数を返して確認を取ってから実行します。

## つまずきやすいところ {#pitfalls}

- **`filterByFormula` は必ず URL エンコードします。** 空白や非 ASCII を含むフィールド名もエンコードが必要です（`{My Field}` → `%7BMy%20Field%7D`）。上の形のとおり Python の標準ライブラリに任せ、手で書かないでください。
- **空のフィールドは応答に出てきません。** `"Assignee"` のキーが無いことは、そのフィールドが存在しないという意味ではなく、そのレコードの値が空だという意味です。フィールドが無いと判断する前に、手順 3 のスキーマを確認してください。
- **PATCH と PUT の違い。** `PATCH` は渡したフィールドをレコードに反映します。`PUT` はレコード全体を置き換えるので、渡さなかったフィールドは消えます。ふだんは `PATCH` を使います。
- **単一選択の選択肢は先に存在している必要があります。** `Shipping` が選択肢に無いのに `"Status": "Shipping"` を書くと、`INVALID_MULTIPLE_CHOICE_OPTIONS` のエラーになります。`"typecast": true` を渡すと選択肢が自動で作られます。
- **トークンの範囲はベース単位です。** あるベースでは動くのに別のベースで `403` になるのは、トークンの Access の一覧にそのベースが入っていないからで、スコープや認証の問題ではありません。https://airtable.com/create/tokens を案内して追加してもらってください。
- **レート制限はトークンごとではなくベースごとです。** `baseA` に毎秒 5、`baseB` に毎秒 5 なら問題ありませんが、`baseA` だけに毎秒 6 だと絞られます。`429` のときは `Retry-After` ヘッダーを見てください。

## Hermes 向けの注意点 {#important-notes-for-hermes}

- **必ず `terminal` ツールから `curl` を使います。** `web_extract`（認証ヘッダーを送れません）や `browser_navigate`（画面での認証が必要で遅いです）は使わないでください。
- **`AIRTABLE_API_KEY` は `${HERMES_HOME:-~/.hermes}/.env` から子プロセスへ自動で渡ります。** この skill が読み込まれていれば、`curl` を呼ぶたびに export し直す必要はありません。
- **式の中の波かっこの扱いに気をつけます。** ヒアドキュメントの本文では `{Status}` はそのままの文字です。シェルの引数でも、`{...}` のブレース展開の文脈でなければ `{Status}` は安全です。ただし、動的な文字列を URL に差し込むときは `python3 urllib.parse.quote` を通してください。
- **整形には `jq`（入っていないこともあります）より `python3 -m json.tool`（どの環境にもあります）を使います。** 絞り込みや項目の取り出しが必要なときだけ `jq` を持ち出します。
- **ページ送りはページ単位で、全体をまとめて取ることはできません。** Airtable の 100 件という上限は変えられません。`offset` の項目が出てこなくなるまでループします。
- **2xx 以外の応答では `errors` の配列を読みます。** Airtable は `AUTHENTICATION_REQUIRED`、`INVALID_PERMISSIONS`、`MODEL_ID_NOT_FOUND`、`INVALID_MULTIPLE_CHOICE_OPTIONS` のような構造化されたエラーコードを返すので、何が起きているかがはっきり分かります。
