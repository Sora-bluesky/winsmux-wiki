---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "Yuanbao"
description: "Yuanbao は Hermes 本体から Hermes Labs の yuanbao プラグインへ移りました"
upstream_path: user-guide/messaging/yuanbao.md
upstream_blob: bd81fa960564820984a26d509c9401a9b1b488ea
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/messaging/yuanbao
---

# Yuanbao {#yuanbao}

:::warning Hermes Labs プラグイン
Yuanbao は現在、Hermes Labs プラグインとして提供されています。Nous Research が開発したものですが、サポート対象外で、今後はメンテナンスされない可能性が高いです。コミュニティからの修正は歓迎します。
:::

[Yuanbao](https://yuanbao.tencent.com/) のゲートウェイプラットフォームと、その `yb_*` ツール（`yb_query_group_info`、`yb_query_group_members`、`yb_send_dm`、`yb_search_sticker`、`yb_send_sticker`）は、Hermes 本体には含まれなくなりました。これらは [NousResearch/hermes-labs-plugins](https://github.com/NousResearch/hermes-labs-plugins/tree/main/yuanbao) の `yuanbao` プラグインとして配布されており、設定手順の全文もそちらに載っています。

## インストール {#install}

```bash
hermes plugins install yuanbao
```

プラグインはプロファイルごとにインストールされます。別のプロファイルに入れる場合は `hermes -p <profile> plugins install yuanbao` を実行してください。インストール後にゲートウェイを再起動すると、Yuanbao のプラットフォームが使えるようになります。

名前はすべてこれまでと同じです。`YUANBAO_*` 環境変数（`YUANBAO_APP_ID` または旧来の `YUANBAO_APP_KEY`、`YUANBAO_APP_SECRET`、`YUANBAO_HOME_CHANNEL` など）、`config.yaml` 内の `platforms.yuanbao` ブロック（および旧来の `gateway.yuanbao` ブロック）、`yuanbao` ツールセット、各ツール名はいずれも変わりません。

:::info Yuanbao が同梱されていたリリースからアップグレードする場合
特に作業は必要ありません。すでに Yuanbao を使っていたプロファイル（`.env` に `YUANBAO_APP_ID` または `YUANBAO_APP_KEY` と `YUANBAO_APP_SECRET` がある、`config.yaml` で `platforms.yuanbao` が有効になっている、または別のプラットフォーム向けに `yuanbao` / `hermes-yuanbao` ツールセットが指定されている）には、`hermes update` を実行したとき、またはそのプロファイルを初めて起動したとき（エージェントかゲートウェイの起動時。`security.allow_lazy_installs` の設定に従います）に、カタログからプラグインが自動でインストールされます。失敗した場合は間隔を空けて再試行され、`hermes update` では毎回再試行されます。この自動インストールはプロファイルごとに一度だけです。後でプラグインを削除した場合（`hermes plugins remove yuanbao`）、削除したままになります。
:::
