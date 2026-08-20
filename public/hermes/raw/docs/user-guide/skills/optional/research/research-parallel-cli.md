---
title: "Parallel Cli — エージェント向けのウェブ検索・深い調査・情報の補完"
description: "エージェント向けのウェブ検索・深い調査・情報の補完"
upstream_path: user-guide/skills/optional/research/research-parallel-cli.md
upstream_blob: 07e55f9b80347718d80d79de50753f3ae121063c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-parallel-cli
---

# Parallel Cli {#parallel-cli}

エージェント向けのウェブ検索・深い調査・情報の補完を行います。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加の skill です。`hermes skills install official/research/parallel-cli` で入れられます |
| パス | `optional-skills/research/parallel-cli` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Research`, `Web`, `Search`, `Deep-Research`, `Enrichment`, `CLI` |
| 関連 skill | [`duckduckgo-search`](/hermes/docs/user-guide/skills/optional/research/research-duckduckgo-search/), [`mcporter`](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcporter/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が動き出したときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Parallel CLI {#parallel-cli}

`parallel-cli` は、利用者がはっきり Parallel を使いたいと言ったとき、あるいはウェブ検索・本文の抽出・深い調査・情報の補完・対象の洗い出し・変化の監視といった作業を、Parallel 独自の仕組みで端末から進めたいときに使います。

これは Hermes 本体の機能ではなく、外部サービスを使う追加の作業手順です。

前提として知っておいてほしいこと:
- Parallel は無料枠のある有料サービスであり、完全に無料の手元ツールではありません。
- Hermes が最初から持っている `web_search` / `web_extract` と役割が重なるため、普通の調べものでこちらを優先しないでください。
- 利用者が Parallel を名指ししたとき、あるいは Parallel の情報補完・FindAll・監視といった機能が必要なときに、この skill を選んでください。

`parallel-cli` はエージェントが扱うことを前提に作られています:
- `--json` で構造化された出力が得られます
- 対話なしでコマンドを実行できます
- `--no-wait`、`status`、`poll` で時間のかかる処理を非同期に回せます
- `--previous-interaction-id` で前のやり取りの文脈を引き継げます
- 検索・抽出・調査・情報補完・対象の洗い出し・監視が 1 つの CLI にまとまっています

## こんなときに使います {#when-to-use-it}

次の場合はこの skill が向いています:
- 利用者が Parallel や `parallel-cli` を名指ししたとき
- 一度きりの検索・抽出では足りず、もっと手の込んだ流れが必要なとき
- 深い調査を非同期で走らせ、あとから結果を取りに行きたいとき
- 構造化された情報補完、FindAll による対象の洗い出し、変化の監視が必要なとき

Parallel を特に求められていない、その場かぎりの短い調べものなら、Hermes が最初から持っている `web_search` / `web_extract` を使ってください。

## 導入 {#installation}

その環境で使える中から、いちばん影響の小さい入れ方を選んでください。

### Homebrew {#homebrew}

```bash
brew install parallel-web/tap/parallel-cli
```

### npm {#npm}

```bash
npm install -g parallel-web-cli
```

### Python パッケージ {#python-package}

```bash
pip install "parallel-web-tools[cli]"
```

### 単体のインストーラ {#standalone-installer}

```bash
curl -fsSL https://parallel.ai/install.sh | bash
```

Python の環境を分けて入れたいなら、`pipx` でも構いません:

```bash
pipx install "parallel-web-tools[cli]"
pipx ensurepath
```

## 認証 {#authentication}

対話形式でのログイン:

```bash
parallel-cli login
```

画面のない環境・SSH 越し・CI の場合:

```bash
parallel-cli login --device
```

API キーを環境変数で渡す場合:

```bash
export PARALLEL_API_KEY="***"
```

いまの認証状態を確かめます:

```bash
parallel-cli auth
```

認証にブラウザ操作が要る場合は、`pty=true` を付けて実行してください。

## 基本の決まりごと {#core-rule-set}

1. 機械で読める出力が必要なときは、必ず `--json` を優先します。
2. 引数をはっきり書き、対話を挟まない流れを選びます。
3. 時間のかかる処理では `--no-wait` を使い、そのあと `status` / `poll` で確認します。
4. CLI の出力に含まれる URL だけを出典として示します。
5. 追加の質問が来そうなときは、大きな JSON 出力を一時ファイルに保存しておきます。
6. バックグラウンド実行は本当に長い処理のときだけにし、それ以外は前面で実行します。
7. 利用者が Parallel を求めている場合や Parallel にしかない流れが必要な場合を除き、Hermes 本体のツールを優先します。

## 早見表 {#quick-reference}

<!-- ascii-guard-ignore -->
```text
parallel-cli
├── auth
├── login
├── logout
├── search
├── extract / fetch
├── research run|status|poll|processors
├── enrich run|status|poll|plan|suggest|deploy
├── findall run|ingest|status|poll|result|enrich|extend|schema|cancel
└── monitor create|list|get|update|delete|events|event-group|simulate
```
<!-- ascii-guard-ignore-end -->

## よく使うフラグと書き方 {#common-flags-and-patterns}

役に立つフラグ:
- `--json` で構造化された出力にします
- `--no-wait` で処理を非同期にします
- `--previous-interaction-id <id>` で前の文脈を引き継いだ追加の依頼ができます
- `--max-results <n>` で検索結果の件数を決めます
- `--mode one-shot|agentic` で検索のやり方を切り替えます
- `--include-domains domain1.com,domain2.com`
- `--exclude-domains domain1.com,domain2.com`
- `--after-date YYYY-MM-DD`

都合がよければ標準入力から読み込ませることもできます:

```bash
echo "What is the latest funding for Anthropic?" | parallel-cli search - --json
echo "Research question" | parallel-cli research run - --json
```

## 検索 {#search}

いまのウェブを調べて、構造化された結果を受け取ります。

```bash
parallel-cli search "What is Anthropic's latest AI model?" --json
parallel-cli search "SEC filings for Apple" --include-domains sec.gov --json
parallel-cli search "bitcoin price" --after-date 2026-01-01 --max-results 10 --json
parallel-cli search "latest browser benchmarks" --mode one-shot --json
parallel-cli search "AI coding agent enterprise reviews" --mode agentic --json
```

絞り込みに便利なもの:
- `--include-domains` で信頼できる出典に限定します
- `--exclude-domains` でノイズの多いドメインを外します
- `--after-date` で新しい情報だけに絞ります
- `--max-results` で対象を広げたいときに使います

追加の質問が来そうなら、出力を保存しておきます:

```bash
parallel-cli search "latest React 19 changes" --json -o /tmp/react-19-search.json
```

結果をまとめるときは:
- 最初に答えを書きます
- 日付・名前・具体的な事実を入れます
- 返ってきた出典だけを示します
- URL や出典名をこしらえてはいけません

## 本文の抽出 {#extraction}

URL から、きれいな本文や Markdown を取り出します。

```bash
parallel-cli extract https://example.com --json
parallel-cli extract https://company.com --objective "Find pricing info" --json
parallel-cli extract https://example.com --full-content --json
parallel-cli fetch https://example.com --json
```

ページの内容が幅広く、その一部だけが必要なときは `--objective` を使ってください。

## 深い調査 {#deep-research}

時間がかかることもある、段階を踏んだ調査に使います。

よく使う処理の段階:
- `lite` / `base` は速くて費用も控えめです
- `core` / `pro` はより丁寧にまとめます
- `ultra` はいちばん重い調査向けです

### 同期実行 {#synchronous}

```bash
parallel-cli research run \
  "Compare the leading AI coding agents by pricing, model support, and enterprise controls" \
  --processor core \
  --json
```

### 非同期で開始して結果を取りに行く {#async-launch-poll}

```bash
parallel-cli research run \
  "Compare the leading AI coding agents by pricing, model support, and enterprise controls" \
  --processor ultra \
  --no-wait \
  --json

parallel-cli research status trun_xxx --json
parallel-cli research poll trun_xxx --json
parallel-cli research processors --json
```

### 文脈の引き継ぎ・追加の質問 {#context-chaining-follow-up}

```bash
parallel-cli research run "What are the top AI coding agents?" --json
parallel-cli research run \
  "What enterprise controls does the top-ranked one offer?" \
  --previous-interaction-id trun_xxx \
  --json
```

Hermes でのおすすめの進め方:
1. `--no-wait --json` で開始します
2. 返ってきた実行 ID / タスク ID を控えます
3. 利用者が別の作業を進めたいなら、そのまま先へ進みます
4. あとから `status` か `poll` を呼びます
5. 返ってきた出典を引きながら、最終の報告をまとめます

## 情報の補完 {#enrichment}

利用者が CSV / JSON / 表形式のデータを持っていて、ウェブ調査から列を足したいときに使います。

### 列の候補を出す {#suggest-columns}

```bash
parallel-cli enrich suggest "Find the CEO and annual revenue" --json
```

### 設定を組み立てる {#plan-a-config}

```bash
parallel-cli enrich plan -o config.yaml
```

### データを直接渡す {#inline-data}

```bash
parallel-cli enrich run \
  --data '[{"company": "Anthropic"}, {"company": "Mistral"}]' \
  --intent "Find headquarters and employee count" \
  --json
```

### 対話なしでファイルを処理する {#non-interactive-file-run}

```bash
parallel-cli enrich run \
  --source-type csv \
  --source companies.csv \
  --target enriched.csv \
  --source-columns '[{"name": "company", "description": "Company name"}]' \
  --intent "Find the CEO and annual revenue"
```

### YAML の設定で実行する {#yaml-config-run}

```bash
parallel-cli enrich run config.yaml
```

### 状態の確認 {#status-polling}

```bash
parallel-cli enrich status <task_group_id> --json
parallel-cli enrich poll <task_group_id> --json
```

対話なしで動かすときは、列の定義を JSON の配列としてはっきり書いてください。
成功を報告する前に、出力されたファイルを確かめてください。

## FindAll {#findall}

短い答えではなく、条件に合う対象の一覧そのものがほしいときに、ウェブ規模で洗い出します。

```bash
parallel-cli findall run "Find AI coding agent startups with enterprise offerings" --json
parallel-cli findall run "AI startups in healthcare" -n 25 --json
parallel-cli findall status <run_id> --json
parallel-cli findall poll <run_id> --json
parallel-cli findall result <run_id> --json
parallel-cli findall schema <run_id> --json
```

あとから見直したり、絞り込んだり、情報を足したりできる一覧がほしい場合は、普通の検索よりこちらが向いています。

## 監視 {#monitor}

時間をかけて変化を見つけたいときに使います。

```bash
parallel-cli monitor list --json
parallel-cli monitor get <monitor_id> --json
parallel-cli monitor events <monitor_id> --json
parallel-cli monitor delete <monitor_id> --json
```

作成は、確認の間隔や通知の届け方が絡むぶん、いちばん慎重にしたいところです:

```bash
parallel-cli monitor create --help
```

一度きりの取得ではなく、ページや情報源を継続して追いかけたいときに使ってください。

## Hermes でのおすすめの使い方 {#recommended-hermes-usage-patterns}

### 出典付きで手早く答える {#fast-answer-with-citations}
1. `parallel-cli search ... --json` を実行します
2. 見出し・URL・日付・抜粋を読み取ります
3. 返ってきた URL だけを本文中に引きながらまとめます

### URL を調べる {#url-investigation}
1. `parallel-cli extract URL --json` を実行します
2. 必要なら `--objective` や `--full-content` を付けて実行し直します
3. 取り出した Markdown を引用するか、要約します

### 時間のかかる調査 {#long-research-workflow}
1. `parallel-cli research run ... --no-wait --json` を実行します
2. 返ってきた ID を控えます
3. 別の作業を続けるか、ときどき結果を確認します
4. 出典を引きながら最終の報告をまとめます

### 表データを補完する {#structured-enrichment-workflow}
1. 入力ファイルと列を確認します
2. `enrich suggest` を使うか、足したい列をはっきり指定します
3. `enrich run` を実行します
4. 必要なら完了まで確認を繰り返します
5. 成功を報告する前に、出力されたファイルを確かめます

## エラーへの対応と終了コード {#error-handling-and-exit-codes}

CLI の説明にある終了コードは次のとおりです:
- `0` 成功
- `2` 入力の誤り
- `3` 認証エラー
- `4` API エラー
- `5` タイムアウト

認証エラーが出たときは:
1. `parallel-cli auth` を確認します
2. `PARALLEL_API_KEY` を確かめるか、`parallel-cli login` / `parallel-cli login --device` を実行します
3. `parallel-cli` が `PATH` にあるか確かめます

## 保守 {#maintenance}

いまの認証状態と導入状況を確認します:

```bash
parallel-cli auth
parallel-cli --help
```

更新のためのコマンド:

```bash
parallel-cli update
pip install --upgrade parallel-web-tools
parallel-cli config auto-update-check off
```

## つまずきやすいところ {#pitfalls}

- 人が読む形式を求められていない限り、`--json` を省かないでください。
- CLI の出力にない出典を示さないでください。
- `login` には PTY やブラウザ操作が要ることがあります。
- 短い処理は前面で実行し、バックグラウンド実行を使いすぎないでください。
- 結果が大きいときは、すべてを文脈に詰め込まず `/tmp/*.json` に保存してください。
- Hermes 本体のツールで足りている場面で、黙って Parallel を選ばないでください。
- これは外部サービスを使う流れであり、たいていアカウント認証と、無料枠を超えれば料金が必要になります。
