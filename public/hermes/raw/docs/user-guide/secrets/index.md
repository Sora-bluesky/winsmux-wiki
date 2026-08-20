---
title: "シークレット"
description: ""
upstream_path: user-guide/secrets/index.md
upstream_blob: 29c7df9e94e49874c284abb26c10140359f501bd
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/secrets/index
---

# シークレット {#secrets}

Hermes は API キーを `~/.hermes/.env` に置く代わりに、起動時に外部のシークレット管理サービスから取り込めます。`.env` に置くのはそのサービスへつなぐための最初のトークンだけで、それ以外のプロバイダーのキー（OpenAI、Anthropic、OpenRouter など）は管理サービス側に預けたまま、一箇所でまとめて入れ替えられます。

対応しているのは次の 3 つです。

- [Bitwarden Secrets Manager](/hermes/docs/user-guide/secrets/bitwarden/) — `bws` CLI を使います。必要になったときに自動で入り、無料プランでも動きます。
- [1Password](/hermes/docs/user-guide/secrets/onepassword/) — 公式の `op` CLI を通して `op://` 参照を解決します。サービスアカウントでも、デスクトップアプリのセッションでも認証できます。
- [コマンドヘルパー](/hermes/docs/user-guide/secrets/command/) — `KEY=VALUE` の行を出力するヘルパーを自分で設定すれば、`keepassxc-cli`、`secret-tool`、`pass`、自作スクリプトなど、どんな CLI 型の保管庫でも使えます。

## 複数の取得元を同時に使う {#multiple-sources-at-once}

シークレットの取得元は同時に 2 つ以上有効にできます。たとえばチーム共有の Bitwarden プロジェクトと、個人の保管庫プラグインを併用するといった形です。取得元は環境変数ごとに、次の決まった優先順位で組み合わさります。

1. **既定では `.env` やシェルの値が勝ちます。** 取得元がすでにある値を置き換えるのは、その取得元で `override_existing: true` を設定したときだけです（Bitwarden は中央で入れ替えられるよう、既定が true になっています）。
2. **対応表を書いた取得元が、まとめて取り込む取得元に勝ちます。** 環境変数と参照を明示的に結び付けた取得元（`env:` の対応表を持つもの）は、プロジェクト内のシークレットを丸ごと暗黙に流し込む取得元より、並び順に関係なく優先されます。
3. **同じ形なら先に書いたほうが勝ちます。** 同じ性質の取得元どうしでは、任意で書ける `secrets.sources` リストの順（書かない場合は登録順）で決まります。すでに埋まっている変数を後から取りにいっても飛ばされますが、そのときは起動時に警告が出ます。黙って捨てられることはありません。

`override_existing` を付けても、ある取得元が別の取得元の確保した変数を上書きすることはありません。また、どの取得元も他の取得元の最初のトークン（`BWS_ACCESS_TOKEN` など）を上書きできません。

```yaml
secrets:
  sources: [bitwarden]     # optional explicit ordering
  bitwarden:
    enabled: true
    project_id: "..."
```

取得元から流し込まれた認証情報には、どこから来たかの印が付きます。セットアップの流れや `hermes model` では、見つかったキーの横に `(from Bitwarden)` と表示されるので、値の出どころが常に分かります。

## プロファイルと共有の保管庫 {#profiles-and-shared-vaults}

1 つの保管庫を [プロファイル](/hermes/docs/user-guide/profiles/) 間で安全に共有するために、取りまとめ側に 2 つの設定があります。

- **`secrets.preserve_existing`** — ここに名前を挙げた環境変数は、`override_existing: true` の取得元が相手でも、既存の `.env` やシェルの値が必ず勝ちます。他はすべて中央で入れ替えつつ、プロファイルごとに意図して違えたいプラットフォーム側の値（`FEISHU_APP_SECRET` など）に使います。

  ```yaml
  secrets:
    preserve_existing: [FEISHU_APP_SECRET, TELEGRAM_BOT_TOKEN]
  ```

- **プロファイル別名の解決**（既定で有効。`secrets.profile_alias: false` で切れます） — 名前付きのプロファイルで Hermes を動かしているとき、保管庫にある `FOO_<PROFILE>` という名前のシークレットが、正規の名前 `FOO` にも入ります（対象は認証情報らしい末尾を持つものだけです: `*_API_KEY`、`*_TOKEN`、`*_SECRET`、`*_KEY`、`*_PASSWORD`）。共有プロジェクトに `TELEGRAM_BOT_TOKEN_MILLA` を置いておけば、`TELEGRAM_BOT_TOKEN` という固定の名前を読む `milla` プロファイルのアダプターに、正しい値が自動で渡ります。保管庫が正規の名前のまま直接与えている値は、別名より必ず優先されます。

どちらも、同梱のものもプラグインのものも含めて、すべての取得元に効きます。これらが取りまとめ側にあって、個々の実装側にはないからです。

## 自分で取得元を足す {#adding-your-own-backend}

他社のシークレット管理サービスへの対応は、本体への PR ではなく単独のプラグインとして配布します。実装は `agent.secret_sources.base.SecretSource` を継承し（必須のメソッドは `fetch(cfg, home_path) -> FetchResult` の 1 つだけです）、プラグインの `register(ctx)` の中で `ctx.register_secret_source(MySource())` を呼んで登録します。優先順位、衝突の扱い、タイムアウト、出どころの記録は取りまとめ側が受け持つので、自分の取得元は値を取ってくることだけを考えれば済みます。守るべき決まりごと、サブプロセスを安全に扱うための補助、適合性の確認キットまで含めた手引きは [シークレット取得プラグインを作る](https://hermes-agent.nousresearch.com/developer-guide/secret-source-plugin) にあります。

同梱するものは意図的に絞ってあります（メモリープロバイダーと同じ方針です）。本体に入るのは Bitwarden と 1Password だけです。Infisical、Proton Pass、HashiCorp Vault、AWS Secrets Manager、OS の鍵ストアなど、それ以外はプラグインのリポジトリに置くものと考えてください。作ったら Nous Research の Discord（`#plugins-skills-and-skins`）で共有してください。
