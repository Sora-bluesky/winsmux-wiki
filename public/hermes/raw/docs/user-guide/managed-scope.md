---
title: "管理者による適用範囲"
description: "システム全体の管理用ディレクトリを使い、管理者が固定して利用者側では変更できない設定と秘密情報を配る仕組みです"
upstream_path: user-guide/managed-scope.md
upstream_blob: 46f9654477fe5efaf25e095b7738f6fa39d49eb4
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/managed-scope
---

# 管理者による適用範囲 {#managed-scope}

**管理者による適用範囲**を使うと、管理者が設定と秘密情報の基準となる内容を配り、
一般の（root ではない）利用者がそれを**上書きできない**ようにできます。想定しているのは、
組織や複数の端末をまとめて運用する場面で、たとえばモデルのプロバイダ、共有の
API のベース URL、`security.redact_secrets: true` などを、その端末を使うすべての利用者に対して固定したいときです。

管理下の適用範囲が存在する場合、そこで指定された値は利用者の
`~/.hermes/config.yaml`、`~/.hermes/.env`、さらにはシェルの環境変数よりも優先されます。ただしそれは
固定されたキーに限った話です。それ以外はすべて、これまでどおり利用者が自由に決められます。

:::note パッケージマネージャーで固定されたインストールとの違い
パッケージマネージャーが管理するインストール（宣言的なディストリビューションや formula によるもの）は、設定の変更を*すべて*
遮断して、パッケージマネージャーを使うよう案内します。管理者による適用範囲はそれとは別の仕組みで、設定全体を
固定するのではなく、キーごとに*特定の変更できない値*を差し込みます。この 2 つは互いに独立していて、同時に使えます。
:::

## どこに置かれるか {#where-it-lives}

管理下の適用範囲は、システム全体のディレクトリ（既定では `/etc/hermes`）から読み込まれます。

```text
/etc/hermes/
├── config.yaml     # managed config layer (wins over ~/.hermes/config.yaml)
└── .env            # managed env layer (wins over ~/.hermes/.env + shell)
```

このディレクトリとファイルの所有者は `root` で（ディレクトリのモードは `0755`、ファイルは
`0644`）、誰でも読めますが、書き込めるのは管理者だけです。**この
ファイルの権限そのものが、強制力の正体です。** 一般の利用者は管理下のファイルを読めますが、
編集はできません。

どちらのファイルも必須ではありません。管理用のディレクトリやファイルが無い場合は、単に「管理下の適用範囲は無い」
という意味になり、この機能が無いときとまったく同じように設定が解決されます。

### ディレクトリの場所を変える {#relocating-the-directory}

場所は環境変数 `HERMES_MANAGED_DIR` で変更できます
（コンテナや、`/etc` 以外に置く構成のためです）。これは `HERMES_HOME` と同じく、配置や
初期設定のための調整項目で、管理下のファイルを所有するのと同じ管理者が設定します。Hermes がこれを
どこかの `.env` に**書き残すことはありません**。

```bash
# Point managed scope at a custom directory (set by IT / the deployment, not the user)
export HERMES_MANAGED_DIR=/opt/org/hermes-policy
```

:::warning
`HERMES_MANAGED_DIR` を設定できる利用者は、管理下の適用範囲を自分の管理下にあるディレクトリへ
向け直せてしまい、仕組みを無効化できます。実際の運用では、この変数は管理者が
固定すべきもので（たとえばサービスのユニットやコンテナのイメージに焼き込むなど）、利用者が
設定できる状態にしておくべきではありません。`hermes doctor` は*解決された*管理用ディレクトリを報告するので、
向け先が変わっていれば分かります。
:::

## 優先順位 {#precedence}

管理下の層が指定しているキーについては、順位は次のとおりです（上ほど優先されます）。

| 段 | config.yaml | .env |
|---|---|---|
| 1 | `/etc/hermes/config.yaml`（管理下） | `/etc/hermes/.env`（管理下） |
| 2 | `~/.hermes/config.yaml`（利用者） | `~/.hermes/.env`（利用者） |
| 3 | 組み込みの既定値 | もともとのシェルの環境変数 |

統合は**末端の値ごと**に行われます。`model.default` を固定しても、`model.*` の残りが
固定されるわけではありません。管理下の `config.yaml` が次の内容だとします。

```yaml
model:
  default: org/standard-model
```

この場合、すべての利用者に対して `model.default` が強制されますが、`model.fallback`（およびその他の
すべてのキー）は利用者の管理下に残ります。

:::note 優先順位についての補足
管理下の適用範囲は、固定したキーについては意図的にシェルの環境変数よりも優先されます。そうでなければ
「管理下」とは言えないからです。「環境変数は config.yaml より優先される」という通常の決まりが
反転するのはここだけで、それも管理下の層が指定した特定のキーにのみ当てはまります。
:::

## 何が管理下にあるのかを見る {#seeing-whats-managed}

```bash
hermes config        # shows a header naming the managed source + the pinned keys
hermes doctor        # reports the resolved managed dir + pinned key counts
```

管理下の値を変更しようとすると、Hermes は拒否したうえで、その出どころを示します。

```bash
$ hermes config set model.default my/model
Cannot set 'model.default': it is managed by your administrator
(/etc/hermes/config.yaml) and cannot be changed.
```

管理下の秘密情報についても同じです。管理下の `.env` が固定している環境変数のキーには、`hermes config set` も
セットアップも、利用者側の値を書き込みません。

## 管理下の適用範囲を用意する（管理者向け） {#setting-up-a-managed-scope-administrators}

```bash
sudo mkdir -p /etc/hermes

# Pin some config values for every user on this machine
sudo tee /etc/hermes/config.yaml >/dev/null <<'YAML'
model:
  provider: nous
security:
  redact_secrets: true
YAML

# Optionally pin a shared, non-sensitive env value
sudo tee /etc/hermes/.env >/dev/null <<'ENV'
OPENAI_API_BASE=https://inference.example.com/v1
ENV

sudo chmod 0755 /etc/hermes
sudo chmod 0644 /etc/hermes/config.yaml /etc/hermes/.env
```

変更は、次に Hermes を起動したときに反映されます（管理下のファイルの書式が壊れている場合は、はっきりと
ログに記録されたうえで無視されます。起動を止めることはありませんが、方針が適用されているかどうかを
管理者が `hermes doctor` で確認すべきです）。

## セキュリティ上の考え方と制限（v1） {#security-model-and-limitations-v1}

- **強制する手段はファイルの権限だけです。** 利用者が管理用ディレクトリへ書き込める場合（あるいは
  Hermes を `root` で動かしている場合）、管理下の適用範囲は助言にとどまります。
- **管理下の `.env` は誰でも読める状態です**（`0644`）。したがって、そこに置いた秘密情報は
  同じ端末の利用者なら誰でも読めます。機微性の高い秘密情報ではなく、共有できて機微でない値
  （組織の API のベース URL、機能の既定値など）に使ってください。
- **エージェント自身のツールは、管理下の*環境変数*の値から完全には遮断されていません。** 管理下の
  環境変数は起動時に適用されますが、エージェントが自分のサブプロセスのシェルの中で別の値を設定することは
  妨げられません。v1 は、通常の利用者に対する運用上の線引きであって、抜け出せない
  サンドボックスではありません。

次の項目は、v1 では意図的に**対象外**としていて、今後対応する可能性があります。

- エージェント自身にも抜け出せない、厳密な境界。
- macOS と Windows のネイティブな管理用の場所（v1 は Linux / POSIX が先です）。
- 方針を重ねるための、追加ファイルを置くディレクトリ（`managed.d/`）。
- 署名や完全性の検証が付いた管理下のファイル。
- リモートや端末管理（MDM）による配布。
- 管理下の秘密情報に対する、より厳しい（グループ単位の）権限。
