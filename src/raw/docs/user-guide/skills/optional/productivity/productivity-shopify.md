---
title: "Shopify — curl で Shopify の Admin / Storefront GraphQL API を使う"
description: "curl で Shopify の Admin / Storefront GraphQL API を使う"
upstream_path: user-guide/skills/optional/productivity/productivity-shopify.md
upstream_blob: 622860fe727179e76fa5ae98adc62b56b93a06a0
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/productivity/productivity-shopify
---

# Shopify {#shopify}

curl で Shopify の Admin / Storefront GraphQL API を使います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/productivity/shopify` で導入します |
| パス | `optional-skills/productivity\shopify` |
| バージョン | `1.0.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Shopify`, `E-commerce`, `Commerce`, `API`, `GraphQL` |
| 関連 skill | [`airtable`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-airtable/), [`xurl`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Shopify — Admin と Storefront の GraphQL API {#shopify-admin-storefront-graphql-apis}

`curl` から Shopify のストアを直接あつかいます。商品の一覧、在庫の管理、注文の取り出し、顧客の更新、メタフィールドの読み取りができます。SDK もアプリの枠組みも要りません。GraphQL のエンドポイントと、カスタムアプリのアクセストークンだけで動きます。

REST の Admin API は 2024-04 から旧方式の扱いになり、セキュリティ修正しか入りません。管理まわりの作業には **GraphQL Admin** を使ってください。お客さま向けの読み取り専用の問い合わせ（商品、コレクション、カート）には **Storefront GraphQL** を使います。

## 事前に用意するもの {#prerequisites}

1. Shopify の管理画面で **Settings → Apps and sales channels → Develop apps → Create an app** と進みます。
2. **Configure Admin API scopes** を押して、必要なスコープ（例は下にあります）を選んで保存します。
3. **Install app** を押すと、Admin API のアクセストークンが 1 度だけ表示されます。すぐに控えてください。Shopify は 2 度と見せてくれません。トークンは `shpat_` で始まります。
4. `${HERMES_HOME:-~/.hermes}/.env` に保存します。
   ```
   SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx
   SHOPIFY_STORE_DOMAIN=my-store.myshopify.com
   SHOPIFY_API_VERSION=2026-01
   ```

> **注意:** 2026 年 1 月 1 日から、Shopify の管理画面で「旧方式のカスタムアプリ」を新しく作ることはできなくなりました。これから用意する場合は **Dev Dashboard**（`shopify.dev/docs/apps/build/dev-dashboard`）を使ってください。管理画面ですでに作ってあるアプリはそのまま動きます。相手のストアにカスタムアプリがまだ無く、日付が 2026-01-01 より後なら、管理画面の手順ではなく Dev Dashboard を案内してください。

用途ごとによく使うスコープは次のとおりです。
- 商品 / コレクション: `read_products`, `write_products`
- 在庫: `read_inventory`, `write_inventory`, `read_locations`
- 注文: `read_orders`, `write_orders`（`read_all_orders` が無いと直近 30 件だけです）
- 顧客: `read_customers`, `write_customers`
- 下書き注文: `read_draft_orders`, `write_draft_orders`
- フルフィルメント: `read_fulfillments`, `write_fulfillments`
- メタフィールド / メタオブジェクト: 対応するリソースのスコープに含まれます

## API の基本 {#api-basics}

- **エンドポイント:** `https://$SHOPIFY_STORE_DOMAIN/admin/api/$SHOPIFY_API_VERSION/graphql.json`
- **認証ヘッダー:** `X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN`（`Authorization: Bearer` ではありません）
- **メソッド:** つねに `POST`、つねに `Content-Type: application/json`、本文は `{"query": "...", "variables": {...}}` です。
- **HTTP 200 は成功を意味しません。** GraphQL はいちばん外側の `errors` 配列と、項目ごとの `userErrors` にエラーを返します。どちらも必ず確かめてください。
- **ID は GID の文字列です:** `gid://shopify/Product/10079467700516`、`gid://shopify/Variant/...`、`gid://shopify/Order/...` のような形です。この文字列をそのまま渡してください。前の部分を削ってはいけません。
- **レート制限:** 問い合わせのコストで計算します（リーキーバケット方式）。応答ごとに `extensions.cost` が付き、`requestedQueryCost`、`actualQueryCost`、`throttleStatus.{currentlyAvailable, maximumAvailable, restoreRate}` が入っています。`currentlyAvailable` が次の問い合わせのコストを下回ったら間を空けてください。標準のストアはバケットが 100 ポイントで毎秒 50 回復、Plus は 1000 / 100 です。

curl の基本形は次のとおりです（使い回せます）。

```bash
shop_gql() {
  local query="$1"
  local variables="${2:-{}}"
  curl -sS -X POST \
    "https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION:-2026-01}/graphql.json" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Access-Token: ${SHOPIFY_ACCESS_TOKEN}" \
    --data "$(jq -nc --arg q "$query" --argjson v "$variables" '{query: $q, variables: $v}')"
}
```

読みやすくするために `jq` に通してください。`-sS` を付けると、進捗表示は消えますがエラーは見えたままになります。

## ストアの状態を調べる {#discovery}

### ストアの情報と現在の API バージョン {#shop-info-current-api-version}
```bash
shop_gql '{ shop { name myshopifyDomain primaryDomain { url } currencyCode plan { displayName } } }' | jq
```

### 使える API バージョンを一覧する {#list-all-supported-api-versions}
```bash
shop_gql '{ publicApiVersions { handle supported } }' | jq '.data.publicApiVersions[] | select(.supported)'
```

## 商品 {#products}

### 商品を検索する（条件に合う最初の 20 件） {#search-products-first-20-matching-query}
```bash
shop_gql '
query($q: String!) {
  products(first: 20, query: $q) {
    edges { node { id title handle status totalInventory variants(first: 5) { edges { node { id sku price inventoryQuantity } } } } }
    pageInfo { hasNextPage endCursor }
  }
}' '{"q":"hoodie status:active"}' | jq
```

検索の書き方では `title:`、`sku:`、`vendor:`、`product_type:`、`status:active`、`tag:`、`created_at:>2025-01-01` が使えます。文法の全体は https://shopify.dev/docs/api/usage/search-syntax にあります。

### 商品をページごとに取り出す（カーソル） {#paginate-products-cursor}
```bash
shop_gql '
query($cursor: String) {
  products(first: 100, after: $cursor) {
    edges { cursor node { id handle } }
    pageInfo { hasNextPage endCursor }
  }
}' '{"cursor":null}'
# subsequent calls: pass the previous endCursor
```

### 商品をバリエーションとメタフィールドごと取り出す {#get-a-product-with-variants-metafields}
```bash
shop_gql '
query($id: ID!) {
  product(id: $id) {
    id title handle descriptionHtml tags status
    variants(first: 20) { edges { node { id sku price compareAtPrice inventoryQuantity selectedOptions { name value } } } }
    metafields(first: 20) { edges { node { namespace key type value } } }
  }
}' '{"id":"gid://shopify/Product/10079467700516"}' | jq
```

### バリエーションを 1 つ持つ商品を作る {#create-a-product-with-one-variant}
```bash
shop_gql '
mutation($input: ProductCreateInput!) {
  productCreate(product: $input) {
    product { id handle }
    userErrors { field message }
  }
}' '{"input":{"title":"Test Hoodie","status":"DRAFT","vendor":"Hermes","productType":"Apparel","tags":["test"]}}'
```

最近のバージョンでは、バリエーションには専用のミューテーションが用意されています。

```bash
# Add variants after creating the product
shop_gql '
mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants) {
    productVariants { id sku price }
    userErrors { field message }
  }
}' '{"productId":"gid://shopify/Product/...","variants":[{"optionValues":[{"optionName":"Size","name":"M"}],"price":"49.00","inventoryItem":{"sku":"HD-M","tracked":true}}]}'
```

### 価格や SKU を更新する {#update-price-sku}
```bash
shop_gql '
mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id sku price }
    userErrors { field message }
  }
}' '{"productId":"gid://shopify/Product/...","variants":[{"id":"gid://shopify/ProductVariant/...","price":"55.00"}]}'
```

## 注文 {#orders}

### 最近の注文を一覧する（`read_all_orders` が無いと直近 30 件です） {#list-recent-orders-last-30-by-default-without-readallorders}
```bash
shop_gql '
{
  orders(first: 20, reverse: true, query: "financial_status:paid") {
    edges { node {
      id name createdAt displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      customer { id displayName email }
      lineItems(first: 10) { edges { node { title quantity sku } } }
    } }
  }
}' | jq
```

注文の絞り込みでよく使うのは `financial_status:paid|pending|refunded`、`fulfillment_status:unfulfilled|fulfilled`、`created_at:>2025-01-01`、`tag:gift`、`email:foo@example.com` です。

### 注文を 1 件、配送先ごと取り出す {#fetch-a-single-order-with-shipping-address}
```bash
shop_gql '
query($id: ID!) {
  order(id: $id) {
    id name email
    shippingAddress { name address1 address2 city province country zip phone }
    lineItems(first: 50) { edges { node { title quantity variant { sku } originalUnitPriceSet { shopMoney { amount currencyCode } } } } }
    transactions { id kind status amountSet { shopMoney { amount currencyCode } } }
  }
}' '{"id":"gid://shopify/Order/...."}' | jq
```

## 顧客 {#customers}

```bash
# Search
shop_gql '
{
  customers(first: 10, query: "email:*@example.com") {
    edges { node { id email displayName numberOfOrders amountSpent { amount currencyCode } } }
  }
}'

# Create
shop_gql '
mutation($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer { id email }
    userErrors { field message }
  }
}' '{"input":{"email":"test@example.com","firstName":"Test","lastName":"User","tags":["api-created"]}}'
```

## 在庫 {#inventory}

在庫はバリエーションに紐づく **在庫アイテム** が持っていて、数量は **ロケーション** ごとに管理されます。

```bash
# Get inventory for a variant across all locations
shop_gql '
query($id: ID!) {
  productVariant(id: $id) {
    id sku
    inventoryItem {
      id tracked
      inventoryLevels(first: 10) {
        edges { node { location { id name } quantities(names: ["available","on_hand","committed"]) { name quantity } } }
      }
    }
  }
}' '{"id":"gid://shopify/ProductVariant/..."}'
```

在庫を増減で調整する（`inventoryAdjustQuantities` を使います）。

```bash
shop_gql '
mutation($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
    inventoryAdjustmentGroup { reason changes { name delta } }
    userErrors { field message }
  }
}' '{
  "input": {
    "reason": "correction",
    "name": "available",
    "changes": [{"delta": 5, "inventoryItemId": "gid://shopify/InventoryItem/...", "locationId": "gid://shopify/Location/..."}]
  }
}'
```

在庫の数量そのものを指定する（増減ではありません） — `inventorySetQuantities` を使います。

```bash
shop_gql '
mutation($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    inventoryAdjustmentGroup { id }
    userErrors { field message }
  }
}' '{"input":{"reason":"correction","name":"available","ignoreCompareQuantity":true,"quantities":[{"inventoryItemId":"gid://shopify/InventoryItem/...","locationId":"gid://shopify/Location/...","quantity":100}]}}'
```

## メタフィールドとメタオブジェクト {#metafields-metaobjects}

メタフィールドは、独自のデータをリソース（商品、顧客、注文、ストア）に付け足す仕組みです。

```bash
# Read
shop_gql '
query($id: ID!) {
  product(id: $id) {
    metafields(first: 10, namespace: "custom") {
      edges { node { key type value } }
    }
  }
}' '{"id":"gid://shopify/Product/..."}'

# Write (works for any owner type)
shop_gql '
mutation($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id key namespace }
    userErrors { field message code }
  }
}' '{"metafields":[{"ownerId":"gid://shopify/Product/...","namespace":"custom","key":"care_instructions","type":"multi_line_text_field","value":"Wash cold. Tumble dry low."}]}'
```

## Storefront API（公開向けの読み取り専用） {#storefront-api-public-read-only}

エンドポイントもトークンも別で、お客さま向けのアプリや Hydrogen のようなヘッドレス構成で使います。ヘッダーも違います。

- **エンドポイント:** `https://$SHOPIFY_STORE_DOMAIN/api/$SHOPIFY_API_VERSION/graphql.json`
- **認証ヘッダー（公開用）:** `X-Shopify-Storefront-Access-Token: <public token>` — ブラウザーに埋め込めます
- **認証ヘッダー（非公開用）:** `Shopify-Storefront-Private-Token: <private token>` — サーバー側だけで使います

```bash
curl -sS -X POST \
  "https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION:-2026-01}/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: ${SHOPIFY_STOREFRONT_TOKEN}" \
  -d '{"query":"{ shop { name } products(first: 5) { edges { node { id title handle } } } }"}' | jq
```

## 一括処理 {#bulk-operations}

レート制限に収まらないほど大きな書き出し（商品カタログ全体、1 年分の注文すべて）には次を使います。

```bash
# 1. Start bulk query
shop_gql '
mutation {
  bulkOperationRunQuery(query: """
    { products { edges { node { id title handle variants { edges { node { sku price } } } } } } }
  """) {
    bulkOperation { id status }
    userErrors { field message }
  }
}'

# 2. Poll status
shop_gql '{ currentBulkOperation { id status errorCode objectCount fileSize url partialDataUrl } }'

# 3. When status=COMPLETED, download the JSONL file
curl -sS "$URL" > products.jsonl
```

JSONL は 1 行が 1 つのノードで、入れ子になった接続は `__parentId` を持つ別の行として出てきます。必要なら手元で組み直してください。

## Webhook {#webhooks}

出来事を受け取れるようにしておけば、こちらから問い合わせ続けずに済みます。

```bash
shop_gql '
mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
    webhookSubscription { id topic endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } }
    userErrors { field message }
  }
}' '{"topic":"ORDERS_CREATE","sub":{"callbackUrl":"https://example.com/webhook","format":"JSON"}}'
```

届いた webhook の HMAC は、アプリのクライアントシークレット（アクセストークンではありません）で確かめます。

```bash
echo -n "$REQUEST_BODY" | openssl dgst -sha256 -hmac "$APP_SECRET" -binary | base64
# Compare to X-Shopify-Hmac-Sha256 header
```

## つまずきやすいところ {#pitfalls}

- **REST のエンドポイントはまだありますが、更新は止まっています。** これから作る連携を `/admin/api/.../products.json` に対して書かないでください。GraphQL を使います。
- **トークンの形を確かめます。** Admin のトークンは `shpat_`、Storefront の公開トークンは `shpua_` で始まります。トークンとヘッダーの組み合わせを間違えると、どの要求も中身のわからない 401 で返ります。
- **正しいトークンで 403 が出たらスコープ不足です。** Shopify は `{"errors":[{"message":"Access denied for ..."}]}` を返します。アプリの Admin API scopes を設定し直してから、入れ直してトークンを作り直してください。
- **`userErrors` が空でも成功とは限りません。** `data.<mutation>.<resource>` が null でないことも確かめてください。どちらにも出ない失敗もあるので、応答の全体を見てください。
- **GID と数字の ID は別物です。** 旧来の REST は数字の ID を返していましたが、GraphQL は GID の文字列を求めます。変換は `gid://shopify/Product/<numeric>` の形にします。
- **レート制限は不意に来ます。** `products(first: 250)` を深く入れ子にしただけで 1000 ポイント以上かかり、標準プランのストアではすぐ絞られます。まずは狭く始めて、`extensions.cost` を見ながら調整してください。
- **並び順に注意します。** `products(first: N, reverse: true)` は `created_at` ではなく `id DESC` で並びます。「新しい順」にしたいときは `sortKey: CREATED_AT, reverse: true` を使ってください。
- **過去の注文には `read_all_orders` が要ります。** これが無いと `orders(...)` は黙って直近 60 日ぶんに絞られます。エラーは出ず、思ったより件数が少ないだけです。注文の多い Shopify Plus の店舗では、アプリの保護データ設定からこのスコープを申請してください。
- **金額は文字列です。** `49.0` ではなく `"49.00"` で返ります。桁の揃え方が大事な場面で、そのまま `jq tonumber` にかけないでください。
- **複数通貨の Money 項目** には `shopMoney`（ストアの通貨）と `presentmentMoney`（お客さまの通貨）の両方があります。どちらを使うかは決めてそろえてください。

## 安全のために {#safety}

Shopify のミューテーションは本番に効きます。商品を作り、返金を通し、注文を取り消し、発送を確定します。`productDelete`、`orderCancel`、`refundCreate`、一括のミューテーションを実行する前に、どのストアの何をどう変えるのかをはっきり伝えて、相手に確認を取ってください。別に開発用ストアを持っている場合を除き、本番データの控えはどこにもありません。
