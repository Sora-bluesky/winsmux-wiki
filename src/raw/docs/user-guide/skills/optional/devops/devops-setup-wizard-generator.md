---
title: "Setup Wizard Generator — 手作業のセットアップを人に案内する bash ウィザードを作る"
description: "手作業のセットアップを人に案内する bash ウィザードを作る"
upstream_path: user-guide/skills/optional/devops/devops-setup-wizard-generator.md
upstream_blob: ec89593a37fea72f2a05b0cf8204f30b607ee12e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/devops/devops-setup-wizard-generator
---

# Setup Wizard Generator {#setup-wizard-generator}

手作業のセットアップを人に案内する bash ウィザードを作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/devops/setup-wizard-generator` で導入します |
| パス | `optional-skills/devops/setup-wizard-generator` |
| バージョン | `1.0.0` |
| 作者 | Matt Pocock (mattpocock/skills, wizard) + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `wizard`, `setup`, `onboarding`, `credentials`, `secrets`, `migration`, `bash`, `human-in-the-loop` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Setup Wizard Generator {#setup-wizard-generator}

対話式の bash **ウィザード**を生成します。手でやると面倒で、しかも毎回だれかに
説明し直すのも面倒な手順を、人に一歩ずつ案内していくスクリプトです。必要な URL を
その都度開き、どこをクリックして何をコピーするのかをはっきり伝え、受け取った値を
あるべき場所（`.env` や GitHub の secrets）へ書き込み、各段階で確認を取り、あと
何段階残っているかを表示します。

mattpocock/skills の MIT ライセンスの `wizard` skill を移植したものです。

## こんなときに使います {#when-to-use}

- Stripe、Supabase、DNS、OAuth アプリなど、ダッシュボードの操作が人にしかできない
  インフラや外部サービスを用意するとき
- 認証情報、CI の secrets、リポジトリの変数を設定するとき
- 一度きりの移行や切り替えで、人の判断を挟む取り消せない手順が含まれるとき
- 利用者が同僚に渡して実行してもらう予定の手順

エージェント自身が実行できる手順には使わないでください。その場合は直接やるほうが早いです。

## 事前に必要なもの {#prerequisites}

- `bash`。GitHub の secrets や変数を書き込む段階がある場合のみ `gh` CLI も必要です
- ライブラリのテンプレート。この skill のディレクトリにある `templates/template.sh` です

## 手順 {#procedure}

### 1. 手順の範囲を決める {#1-scope-the-procedure}

人がやらなければならない手作業をすべて洗い出し、その過程で受け取る値も残らず把握
します。いきなり質問せず、まずリポジトリを読んでください。

- セットアップの場合: `.env`、`.env.example`、`README`、`docker-compose*`、
  フレームワークの設定、そして `.github/workflows/*`（`secrets.*` や `vars.*` への
  参照は、ひとつ残らずウィザードが用意すべき値です）。
- 移行や切り替えの場合: 現在の状態、目指す状態、そのあいだにある取り消せない操作。

順番に並べた段階の一覧と、それぞれが生み出す値を利用者に見せます。追加・削除・
並べ替えの希望が出るかもしれません。すべての段階に順番どおり名前が付き、受け取る
値ごとに (a) 人がどこでその値を手に入れるのか、(b) どこへ書き込むのか（`.env`、
GitHub の secret、その両方、あるいはどこにも書かない）、(c) 秘密の値か（入力を伏せる）
公開してよい値かが分かれば完了です。

### 2. 段階ごとの道順を書き出す {#2-map-each-stages-journey}

段階ごとに、人がたどる道順を正確に書きます。どの URL を開き、そこで何をして、値が
どこに表示されるのか。たとえば「Dashboard → Developers → API keys → Reveal test key
→ コピー」のように書きます。現在の画面や正確なコマンドが分からないところは、分からない
と伝えたうえで公式ドキュメントを確認するか質問してください。存在するか怪しい手順を
作り話で埋めてはいけません。

### 3. ウィザードを書く {#3-author-the-wizard}

この skill のディレクトリにある `templates/template.sh` を、作りたい場所へコピーします。
サンプルの段階を、手順ごとの `stage` に置き換え、依存関係の順に並べます。書いた段階の
数を `TOTAL_STAGES` に設定してください。

ライブラリが用意しているのは `stage`、`say`/`step`/`note`/`warn`、`open_url`、
`ask`/`ask_secret`、`write_env`、`set_secret`/`set_var`、`pause`/`confirm`、
`banner`、`finish` です。`STAGES` の目印より上のライブラリ部分は、どのウィザードでも
まったく同じ内容です。手で書き換えないでください。その同一性こそが狙いです。

テンプレートが定めている水準を守ってください。値を尋ねる前にその URL を開く、秘密の
値には `ask_secret` を使う、保存する値はすべて `write_env` で書き込む、`set_secret` に
渡すのは CI が実際に必要とするものだけにする、取り消せない操作の前には `confirm` を
入れる、の5点です。`stage` は実行のたびに画面を消すので、人が読む必要のあるものが
流れて消えないよう、1つの段階には1つの作業だけを入れてください。

ウィザードは基本的に使い捨てです。作業用の場所か `scripts/` の下に保存し、用が済んだら
削除します。繰り返し使えるセットアップ手段をリポジトリに残したいと利用者が望んだときだけ
コミットしてください。

### 4. 確かめて引き渡す {#4-verify-and-hand-off}

- `bash -n <script>` で構文を確認し、使える環境なら `shellcheck` も走らせ、
  `chmod +x <script>` で実行権限を付けます。
- 自分で最後まで実行してはいけません。ブラウザが開き、人の入力を待って止まります。
  代わりに読んで追跡します。手順1で挙げた値がすべて受け取られ、手順1で決めた場所へ
  収まっているか、そして `set_secret` に渡す名前が CI 側の `secrets.*` への参照と
  完全に一致しているかを確かめてください。
- 実行のしかたを利用者に伝えます。繰り返し使うものなら、コミットして README から
  リンクしておきます。

## つまずきやすいところ {#pitfalls}

1. **ライブラリ部分を編集してしまう。** `STAGES` の目印より上はすべてウィザードの
   ライブラリです。書くのはその下だけにしてください。
2. **ダッシュボードの道順をでっち上げてしまう。** 外部サービスの画面は変わります。
   クリックの道順に自信がなければ、最新のドキュメントで裏を取るか、おおよその案内だと
   断っておいてください。
3. **CI が使わない値まで `set_secret` に渡してしまう。** GitHub の secrets へ送るのは、
   ワークフローが実際に参照しているものだけにします。
4. **自分でウィザードを実行してしまう。** 人の入力を待って止まります。読んで追跡することと
   `bash -n` が、ここでの確認手段です。
5. **1つの段階に詰め込みすぎる。** 段階ごとに画面が消えるので、長い段階では肝心の説明が
   流れて見えなくなります。分けてください。

## 確認 {#verification}

- [ ] 書き始める前に、段階の一覧を利用者と確認した
- [ ] `bash -n` が通り、スクリプトに実行権限が付いている
- [ ] 受け取る値がすべて、宣言した書き込み先まで追跡できている
- [ ] `set_secret` に渡す名前が、CI の `secrets.*` への参照と一致している
- [ ] ライブラリ部分がテンプレートのままになっている
