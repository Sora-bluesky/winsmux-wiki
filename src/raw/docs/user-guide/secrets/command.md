---
title: "user-guide/secrets/command"
description: ""
upstream_path: user-guide/secrets/command.md
upstream_blob: 04184eb95de5c9bc52cc09ca8a5faccec90f7799
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/secrets/command
---

# コマンドヘルパーによる secret の取得 {#command-helper-secret-source}

起動時に自分のヘルパーコマンドを走らせて、資格情報を解決する方法です。CLI を備えた secret 置き場ならどれでも使えます。`keepassxc-cli`、`secret-tool`（GNOME Keyring）、`pass`、`gpg`、Vaultwarden の CLI、あるいは tmpfs 上の env ファイルを cat するだけのスクリプトでもかまいません。ヘルパーは `KEY=VALUE` 形式の行を標準出力に出すだけで、Hermes は [Bitwarden](/hermes/docs/user-guide/secrets/bitwarden/) や [1Password](/hermes/docs/user-guide/secrets/onepassword/) と同じ仕組みでその値を適用します。複数の取得元を同時に有効にしてもかまいません。

## しくみ {#how-it-works}

1. `config.yaml` にヘルパーコマンドを設定します（`.env` には書きません。コマンドは設定であり、`.env` は値を置く場所です）。
2. 起動時、`.env` を読み込んだあとに、Hermes は `/bin/sh -c` 経由でヘルパーを一度だけ実行し、その標準出力を dotenv 形式として解釈します。
3. 読み取られたキーは通常の優先順位に従います。`override_existing: true` でない限り `.env` やシェルの値が勝ち、同じ変数を取り合ったときは個別に対応づけられた取得元がこの一括取得より優先され、最初に名乗り出たものが採用されます。

```yaml
secrets:
  command:
    enabled: true
    command: "cat /run/user/1000/hermes-secrets.env"
    # or any vault CLI that dumps KEY=VALUE lines:
    # command: "pass show hermes/env"
    # command: "secret-tool lookup service hermes-env"
```

## 設定 {#config}

| キー | 既定値 | はたらき |
|---|---|---|
| `enabled` | `false` | 全体の切り替えスイッチ。 |
| `command` | `""` | `/bin/sh -c` 経由で実行されるヘルパー。`KEY=VALUE` 形式の行を標準出力に出す必要があります。 |
| `helper_timeout_seconds` | `3` | ヘルパー1回の実行に対する上限時間。あえて短くしてあります。ヘルパーは速く、対話を挟まないもの（ロック解除の入力も、指紋や PIN の確認もない）である必要があります。 |
| `override_existing` | `false` | ヘルパーの値で `.env` やシェルの値を上書きします。ローカルのヘルパーは値を一元的に更新する権威ではないため、Bitwarden や 1Password とは違って既定では無効です。 |

## セキュリティの考え方 {#security-model}

- ヘルパーのコマンド文字列は利用者自身の設定であり、自分で管理する `.env` ファイルと同じ信頼度で扱われます。
- 出力は 1 MiB で頭打ちにしてあります。暴走したヘルパーが起動を止めてしまうことはありません（時間切れの際はプロセスグループごと終了させます）。
- ヘルパーの**標準エラー出力は捨てられます**。secret 置き場の CLI が出す診断メッセージには秘密の情報が混ざりうるため、Hermes の出力には届きません。失敗時に記録するのは構造化された項目（終了コード・シグナル・errno）だけで、コマンド文字列は残しません。
- 空白しかない値は「値なし」として扱われます。仮置きの項目が Authorization ヘッダーに流れ込むことはありません。
- POSIX 環境専用です（`/bin/sh` が必要）。Windows ではこの取得元は「未設定」と自己申告し、起動はそのまま続きます。

## うまくいかないとき {#failure-modes}

起動が止まることはありません。エラーは1行と、`→` に続く対処のヒントとして表示されます。

| 症状 | 原因 | 対処 |
|---|---|---|
| `secrets.command.command is empty` | コマンドを指定せずに有効化した | config.yaml で `secrets.command.command` を設定します |
| `helper command failed` | 終了コードが 0 以外、時間切れ、起動失敗 | ヘルパーをシェルで手動実行して本当のエラーを確認します（Hermes は意図的にその標準エラー出力を捨てています） |
| `helper output was not a KEY=VALUE map` | ヘルパーが値だけ、あるいは無関係な文字列を出力した | ヘルパーが dotenv 形式の行を出すように直します |

## プラグインとの使い分け {#when-to-use-this-vs-a-plugin}

このコマンド方式は、専用の連携が同梱されていない secret 置き場のための逃げ道です。込み入った CLI の手順を長いスクリプトで包み込むようになってきたら、きちんとした [secret ソースプラグイン](/hermes/docs/developer-guide/secret-source-plugin/) にすることを検討してください。プラグインならキャッシュ、出どころのラベル、型付きの設定が手に入ります。
