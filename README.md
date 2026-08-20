# winsmux-wiki

公開 URL: https://wiki.winsmux.dev/hermes/

公式 [Hermes Agent docs](https://hermes-agent.nousresearch.com/docs/) の Quickstart / Installation / Messaging の順を日本語にした独立サイトです。独自手順は作りません。

## ビルド

```
npm ci
npm run build
```

成果物は `dist/` です。Cloudflare Workers の Static Assets だけを使います。`main` ワーカースクリプトは置きません。

## デプロイ

GitHub Action が `main` への push で `wrangler deploy` します。カスタムドメイン `wiki.winsmux.dev` は wrangler の `custom_domain` に任せます。DNS を手で足さないでください。
