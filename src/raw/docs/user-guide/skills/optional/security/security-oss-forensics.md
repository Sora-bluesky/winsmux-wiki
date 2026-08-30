---
title: "Oss Forensics — GitHub サプライチェーンのフォレンジック: 復元・IOC・報告"
description: "GitHub サプライチェーンのフォレンジック: 復元・IOC・報告"
upstream_path: user-guide/skills/optional/security/security-oss-forensics.md
upstream_blob: 5b70a7f1641e22ba0357cecf44a19abc0781fa3e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/security/security-oss-forensics
---

# Oss Forensics {#oss-forensics}

GitHub のサプライチェーン・フォレンジック: 復元・IOC・報告。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/security/oss-forensics` で導入します |
| パス | `optional-skills/security\oss-forensics` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Security`, `Forensics`, `GitHub`, `Supply-Chain` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# OSS Security Forensics Skill {#oss-security-forensics-skill}

オープンソースのサプライチェーン攻撃を調べるための、7 フェーズからなるマルチエージェント調査フレームワークです。
RAPTOR のフォレンジックシステムを応用しています。GitHub Archive、Wayback Machine、GitHub API、
ローカルの git 分析、IOC の抽出、証拠に基づく仮説の立案と検証、
そして最終的なフォレンジックレポートの生成までをカバーします。

---

## ⚠️ ハルシネーション防止ガードレール {#anti-hallucination-guardrails}

調査の各ステップの前に、これらを読んでください。破ると、レポートは無効になります。

1. **証拠優先の原則**: レポート・仮説・要約のいかなる主張も、少なくとも 1 つの証拠 ID（`EV-XXXX`）を引用しなければなりません。引用のない断定は禁止です。
2. **担当を越えない**: 各サブエージェント（調査担当）は、データソースを 1 つだけ持ちます。ソースを混在させてはいけません。GH Archive の調査担当は GitHub API を照会せず、その逆も同様です。役割の境界は厳格です。
3. **事実と仮説の分離**: 検証されていない推論には、すべて `[HYPOTHESIS]` を付けます。元のソースと照合して検証された記述だけを、事実として述べられます。
4. **証拠の捏造禁止**: 仮説の検証担当は、仮説を受け入れる前に、引用された証拠 ID がすべて実際に証拠ストアに存在することを機械的に確認しなければなりません。
5. **反証には証明が必要**: 仮説は、具体的で証拠に裏づけられた反論なしには棄却できません。「証拠が見つからなかった」だけでは反証には足りません。それは仮説を「判定不能」にするだけです。
6. **SHA/URL の二重確認**: 証拠として引用するコミット SHA・URL・外部の識別子は、検証済みとするために、少なくとも 2 つのソースから独立に確認しなければなりません。
7. **不審なコードの原則**: 調査対象のリポジトリ内で見つけたコードを、ローカルで実行しては絶対にいけません。静的にのみ分析するか、サンドボックス環境で `execute_code` を使います。
8. **秘密情報のマスク**: 調査中に見つかった API キー・トークン・認証情報は、最終レポートではマスクしなければなりません。内部の記録にのみ残します。

---

## シナリオ例 {#example-scenarios}

- **シナリオ A: 依存関係の混同**: 悪意ある `internal-lib-v2` パッケージが、社内版より高いバージョン番号で NPM にアップロードされます。調査担当は、このパッケージが最初に確認された時期と、対象リポジトリの PushEvent がこのバージョンに `package.json` を更新したかどうかを追跡します。
- **シナリオ B: メンテナ乗っ取り**: 長期の貢献者アカウントが、バックドア入りの `.github/workflows/build.yml` を push するのに使われます。調査担当は、このユーザーからの PushEvent のうち、長い休止期間のあとに行われたものや、新しい IP／場所（BigQuery で検出できる場合）からのものを探します。
- **シナリオ C: force-push による隠蔽**: 開発者が本番の秘密情報をうっかりコミットし、それを「直す」ために force-push します。調査担当は `git fsck` と GH Archive を使って、元のコミット SHA を復元し、何が漏れたかを確認します。

---

> **パスの表記**: この skill 全体で、`SKILL_DIR` はこの skill の
> インストールディレクトリのルート（この `SKILL.md` を含むフォルダ）を指します。skill が読み込まれたら、
> `SKILL_DIR` を実際のパスに解決します。たとえば `~/.hermes/skills/security/oss-forensics/`
> や、`optional-skills/` 相当の場所です。すべてのスクリプトとテンプレートの参照は、それを基準とする相対パスです。

## フェーズ 0: 初期化 {#phase-0-initialization}

1. 調査用の作業ディレクトリを作成します:
   ```bash
   mkdir investigation_$(echo "REPO_NAME" | tr '/' '_')
   cd investigation_$(echo "REPO_NAME" | tr '/' '_')
   ```
2. 証拠ストアを初期化します:
   ```bash
   python SKILL_DIR/scripts/evidence-store.py --store evidence.json list
   ```
3. フォレンジックレポートのテンプレートをコピーします:
   ```bash
   cp SKILL_DIR/templates/forensic-report.md ./investigation-report.md
   ```
4. 侵害の兆候（Indicators of Compromise）を、見つけしだい記録していくための `iocs.md` ファイルを作成します。
5. 調査の開始時刻、対象リポジトリ、掲げた調査の目的を記録します。

---

## フェーズ 1: プロンプトの解析と IOC の抽出 {#phase-1-prompt-parsing-and-ioc-extraction}

**目的**: ユーザーの依頼から、調査対象となる要素をすべて構造化して取り出します。

**やること**:
- ユーザーのプロンプトを解析し、次を抽出します:
  - 対象リポジトリ（`owner/repo`）
  - 対象のアクター（GitHub ハンドル、メールアドレス）
  - 対象の期間（コミット日時の範囲、PR のタイムスタンプ）
  - 提供された侵害の兆候: コミット SHA、ファイルパス、パッケージ名、IP アドレス、ドメイン、API キー／トークン、悪意ある URL
  - リンクされているベンダーのセキュリティレポートやブログ記事

**ツール**: 推論のみ、または大きなテキストからの正規表現抽出に `execute_code`。

**アウトプット**: 抽出した IOC を `iocs.md` に記録します。各 IOC には次が必要です:
- 種別（次から: COMMIT_SHA, FILE_PATH, API_KEY, SECRET, IP_ADDRESS, DOMAIN, PACKAGE_NAME, ACTOR_USERNAME, MALICIOUS_URL, OTHER）
- 値
- 出所（ユーザー提供、推定）

**参照**: IOC の分類については [evidence-types.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/evidence-types.md) を参照してください。

---

## フェーズ 2: 並列の証拠収集 {#phase-2-parallel-evidence-collection}

`delegate_task`（バッチモード、同時実行は最大 3）で、専門の調査担当サブエージェントを最大 5 体まで起動します。各調査担当は **データソースを 1 つだけ** 持ち、ソースを混在させてはいけません。

> **オーケストレーターへの注記**: フェーズ 1 の IOC リストと調査の対象期間を、委任する各タスクの `context` フィールドで渡します。

---

### 調査担当 1: ローカル Git 調査担当 {#investigator-1-local-git-investigator}

**役割の境界**: あなたは **ローカルの git リポジトリのみ** を照会します。外部の API を一切呼び出さないでください。

**やること**:
```bash
# Clone repository
git clone https://github.com/OWNER/REPO.git target_repo && cd target_repo

# Full commit log with stats
git log --all --full-history --stat --format="%H|%ae|%an|%ai|%s" > ../git_log.txt

# Detect force-push evidence (orphaned/dangling commits)
git fsck --lost-found --unreachable 2>&1 | grep commit > ../dangling_commits.txt

# Check reflog for rewritten history
git reflog --all > ../reflog.txt

# List ALL branches including deleted remote refs
git branch -a -v > ../branches.txt

# Find suspicious large binary additions
git log --all --diff-filter=A --name-only --format="%H %ai" -- "*.so" "*.dll" "*.exe" "*.bin" > ../binary_additions.txt

# Check for GPG signature anomalies
git log --show-signature --format="%H %ai %aN" > ../signature_check.txt 2>&1
```

**収集する証拠**（`python SKILL_DIR/scripts/evidence-store.py add` で追加します）:
- 各 dangling コミットの SHA → 種別: `git`
- force-push の証拠（履歴の書き換えを示す reflog）→ 種別: `git`
- 検証済み貢献者からの未署名コミット → 種別: `git`
- 不審なバイナリファイルの追加 → 種別: `git`

**参照**: force-push されたコミットへのアクセスについては [recovery-techniques.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/recovery-techniques.md) を参照してください。

---

### 調査担当 2: GitHub API 調査担当 {#investigator-2-github-api-investigator}

**役割の境界**: あなたは **GitHub REST API のみ** を照会します。ローカルで git コマンドを実行しないでください。

**やること**:
```bash
# Commits (paginated)
curl -s "https://api.github.com/repos/OWNER/REPO/commits?per_page=100" > api_commits.json

# Pull Requests including closed/deleted
curl -s "https://api.github.com/repos/OWNER/REPO/pulls?state=all&per_page=100" > api_prs.json

# Issues
curl -s "https://api.github.com/repos/OWNER/REPO/issues?state=all&per_page=100" > api_issues.json

# Contributors and collaborator changes
curl -s "https://api.github.com/repos/OWNER/REPO/contributors" > api_contributors.json

# Repository events (last 300)
curl -s "https://api.github.com/repos/OWNER/REPO/events?per_page=100" > api_events.json

# Check specific suspicious commit SHA details
curl -s "https://api.github.com/repos/OWNER/REPO/git/commits/SHA" > commit_detail.json

# Releases
curl -s "https://api.github.com/repos/OWNER/REPO/releases?per_page=100" > api_releases.json

# Check if a specific commit exists (force-pushed commits may 404 on commits/ but succeed on git/commits/)
curl -s "https://api.github.com/repos/OWNER/REPO/commits/SHA" | jq .sha
```

**突き合わせる対象**（食い違いを証拠として記録します）:
- PR がアーカイブには存在するが API にはない → 削除の証拠
- 貢献者がアーカイブのイベントには現れるが貢献者リストにはいない → 権限剥奪の証拠
- コミットがアーカイブの PushEvent にはあるが API のコミットリストにはない → force-push／削除の証拠

**参照**: GH のイベント種別については [evidence-types.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/evidence-types.md) を参照してください。

---

### 調査担当 3: Wayback Machine 調査担当 {#investigator-3-wayback-machine-investigator}

**役割の境界**: あなたは **Wayback Machine の CDX API のみ** を照会します。GitHub API を使わないでください。

**目的**: 削除された GitHub ページ（README、issue、PR、リリース、Wiki ページ）を復元します。

**やること**:
```bash
# Search for archived snapshots of the repo main page
curl -s "https://web.archive.org/cdx/search/cdx?url=github.com/OWNER/REPO&output=json&limit=100&from=YYYYMMDD&to=YYYYMMDD" > wayback_main.json

# Search for a specific deleted issue
curl -s "https://web.archive.org/cdx/search/cdx?url=github.com/OWNER/REPO/issues/NUM&output=json&limit=50" > wayback_issue_NUM.json

# Search for a specific deleted PR
curl -s "https://web.archive.org/cdx/search/cdx?url=github.com/OWNER/REPO/pull/NUM&output=json&limit=50" > wayback_pr_NUM.json

# Fetch the best snapshot of a page
# Use the Wayback Machine URL: https://web.archive.org/web/TIMESTAMP/ORIGINAL_URL
# Example: https://web.archive.org/web/20240101000000*/github.com/OWNER/REPO

# Advanced: Search for deleted releases/tags
curl -s "https://web.archive.org/cdx/search/cdx?url=github.com/OWNER/REPO/releases/tag/*&output=json" > wayback_tags.json

# Advanced: Search for historical wiki changes
curl -s "https://web.archive.org/cdx/search/cdx?url=github.com/OWNER/REPO/wiki/*&output=json" > wayback_wiki.json
```

**収集する証拠**:
- 削除された issue／PR のアーカイブ済みスナップショットと、その内容
- 変更を示す README の過去バージョン
- アーカイブには存在するが、現在の GitHub の状態にはない内容の証拠

**参照**: CDX API のパラメータについては [github-archive-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/github-archive-guide.md) を参照してください。

---

### 調査担当 4: GH Archive / BigQuery 調査担当 {#investigator-4-gh-archive-bigquery-investigator}

**役割の境界**: あなたは **BigQuery 経由で GitHub Archive のみ** を照会します。これは、すべての公開 GitHub イベントの改ざん不能な記録です。

> **前提条件**: BigQuery にアクセスできる Google Cloud の認証情報が必要です（`gcloud auth application-default login`）。使えない場合は、この調査担当を飛ばし、その旨をレポートに記します。

**コスト最適化のルール**（必須）:
1. すべてのクエリの前に、必ず `--dry_run` を実行してコストを見積もります。
2. `_TABLE_SUFFIX` で日付範囲を絞り込み、スキャンするデータを最小化します。
3. 必要なカラムだけを SELECT します。
4. 集計でない限り、LIMIT を付けます。

```bash
# Template: safe BigQuery query for PushEvents to OWNER/REPO
bq query --use_legacy_sql=false --dry_run "
SELECT created_at, actor.login, payload.commits, payload.before, payload.head,
       payload.size, payload.distinct_size
FROM \`githubarchive.month.*\`
WHERE _TABLE_SUFFIX BETWEEN 'YYYYMM' AND 'YYYYMM'
  AND type = 'PushEvent'
  AND repo.name = 'OWNER/REPO'
LIMIT 1000
"
# If cost is acceptable, re-run without --dry_run

# Detect force-pushes: zero-distinct_size PushEvents mean commits were force-erased
# payload.distinct_size = 0 AND payload.size > 0 → force push indicator

# Check for deleted branch events
bq query --use_legacy_sql=false "
SELECT created_at, actor.login, payload.ref, payload.ref_type
FROM \`githubarchive.month.*\`
WHERE _TABLE_SUFFIX BETWEEN 'YYYYMM' AND 'YYYYMM'
  AND type = 'DeleteEvent'
  AND repo.name = 'OWNER/REPO'
LIMIT 200
"
```

**収集する証拠**:
- force-push イベント（payload.size > 0、payload.distinct_size = 0）
- ブランチ／タグの DeleteEvent
- 不審な CI/CD 自動化を示す WorkflowRunEvent
- git ログの「空白」に先立つ PushEvent（書き換えの証拠）

**参照**: 12 種類のイベントすべてとクエリパターンについては [github-archive-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/github-archive-guide.md) を参照してください。

---

### 調査担当 5: IOC エンリッチメント調査担当 {#investigator-5-ioc-enrichment-investigator}

**役割の境界**: あなたは、フェーズ 1 の **既存の IOC** を、受動的な公開ソースのみで補強します。対象リポジトリのコードを一切実行しないでください。

**やること**:
- 各コミット SHA について: GitHub の直接 URL（`github.com/OWNER/REPO/commit/SHA.patch`）経由での復元を試みます。
- 各ドメイン／IP について: パッシブ DNS と WHOIS 記録を確認します（公開 WHOIS サービスに対する `web_extract` 経由）。
- 各パッケージ名について: 一致する悪意あるパッケージの報告がないか、npm／PyPI を確認します。
- 各アクターのユーザー名について: GitHub のプロフィール、貢献履歴、アカウント作成からの経過を確認します。
- force-push されたコミットを 3 つの方法で復元します（[recovery-techniques.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/recovery-techniques.md) を参照）。

---

## フェーズ 3: 証拠の統合 {#phase-3-evidence-consolidation}

すべての調査担当が完了したら:

1. `python SKILL_DIR/scripts/evidence-store.py --store evidence.json list` を実行して、収集した証拠をすべて確認します。
2. 各証拠について、`content_sha256` ハッシュが元のソースと一致することを確認します。
3. 証拠を次のようにグループ化します:
   - **タイムライン**: タイムスタンプ付きの証拠をすべて時系列に並べます。
   - **アクター**: GitHub ハンドルまたはメールでまとめます。
   - **IOC**: 証拠を、関連する IOC に紐づけます。
4. **食い違い** を特定します: あるソースには存在するが別のソースにはない項目（重要な削除の兆候）。
5. 証拠に `[VERIFIED]`（独立した 2 つ以上のソースから確認済み）または `[UNVERIFIED]`（単一ソースのみ）の印を付けます。

---

## フェーズ 4: 仮説の立案 {#phase-4-hypothesis-formation}

仮説には次が必要です:
- 具体的な主張を述べる（例: 「アクター X は、コミット SHA を消すために DATE に BRANCH へ force-push した」）
- それを裏づける証拠 ID を少なくとも 2 つ引用する（`EV-XXXX`, `EV-YYYY`）
- それを反証するにはどんな証拠が必要かを示す
- 検証されるまでは `[HYPOTHESIS]` の印を付ける

**よくある仮説テンプレート**（[investigation-templates.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/investigation-templates.md) を参照）:
- メンテナ侵害: 正規のアカウントが乗っ取り後に使われ、悪意あるコードが注入される
- 依存関係の混同: パッケージ名のスクワッティングでインストールを横取りする
- CI/CD インジェクション: ビルド中にコードを実行させる悪意あるワークフロー変更
- タイポスクワッティング: つづり間違いを狙った、ほぼ同一のパッケージ名
- 認証情報の漏洩: トークン／キーがうっかりコミットされ、消すために force-push される

各仮説について、確定させる前に、反証となる証拠を探す `delegate_task` サブエージェントを起動します。

---

## フェーズ 5: 仮説の検証 {#phase-5-hypothesis-validation}

検証担当のサブエージェントは、次を機械的に確認しなければなりません:

1. 各仮説について、引用された証拠 ID をすべて取り出す。
2. 各 ID が `evidence.json` に存在することを確認する（1 つでも欠けていれば、捏造の可能性ありとして仮説を却下する重大な失敗）。
3. 各 `[VERIFIED]` の証拠が、2 つ以上のソースから確認されていることを確かめる。
4. 論理的な整合性を確認する: 証拠が描くタイムラインは、その仮説を支持するか。
5. 別の説明がないか確認する: 同じ証拠パターンが、無害な原因からも生じうるか。

**アウトプット**:
- `VALIDATED`: すべての証拠が引用され、検証済みで、論理的に整合し、もっともらしい別の説明がない。
- `INCONCLUSIVE`: 証拠は仮説を支持するが、別の説明が存在するか、証拠が不十分。
- `REJECTED`: 証拠 ID の欠落、検証されていない証拠を事実として引用、論理的な矛盾を検出。

却下された仮説は、改良のためにフェーズ 4 に戻します（最大 3 回まで）。

---

## フェーズ 6: 最終レポートの生成 {#phase-6-final-report-generation}

[forensic-report.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/templates/forensic-report.md) のテンプレートを使って `investigation-report.md` を作成します。

**必須のセクション**:
- エグゼクティブサマリー: 1 段落の結論（侵害あり／問題なし／判定不能）と確信度
- タイムライン: すべての重要な出来事を、証拠の引用付きで時系列に再構成
- 検証済み仮説: それぞれの状態と、裏づけとなる証拠 ID
- 証拠レジストリ: すべての `EV-XXXX` エントリを、出所・種別・検証状態とともに表にまとめる
- IOC リスト: 抽出・補強したすべての侵害の兆候
- 証拠管理の連鎖: どの証拠を、どのソースから、いつ収集したか
- 推奨事項: 侵害が検出された場合の即時の緩和策、監視の推奨

**レポートのルール**:
- すべての事実の主張に、少なくとも 1 つの `[EV-XXXX]` 引用を付ける
- エグゼクティブサマリーには確信度（高／中／低）を明記する
- すべての秘密情報／認証情報は `[REDACTED]` にマスクする

---

## フェーズ 7: 完了 {#phase-7-completion}

1. 最終的な証拠件数を数えます: `python SKILL_DIR/scripts/evidence-store.py --store evidence.json list`
2. 調査ディレクトリ全体をアーカイブします。
3. 侵害が確定した場合:
   - 即時の緩和策を挙げます（認証情報のローテーション、依存関係のハッシュ固定、影響を受けたユーザーへの通知）
   - 影響を受けたバージョン／パッケージを特定します
   - 開示義務を記します（公開パッケージの場合: パッケージレジストリと連携）
4. 最終的な `investigation-report.md` をユーザーに提示します。

---

## 倫理的な利用の指針 {#ethical-use-guidelines}

この skill は **防御的なセキュリティ調査** — オープンソースソフトウェアをサプライチェーン攻撃から守ること — のために設計されています。次の用途に使ってはいけません:

- 貢献者やメンテナへの **嫌がらせやストーキング**
- **ドキシング** — GitHub の活動を、悪意ある目的で実在の身元と結びつけること
- **競合情報の収集** — 認可なしに、専有または社内のリポジトリを調査すること
- **根拠のない告発** — 検証された証拠なしに調査結果を公開すること（ハルシネーション防止ガードレールを参照）

調査は **最小限の侵入** の原則で行うべきです。仮説を検証または反証するのに必要な証拠だけを集めます。結果を公開するときは、責任ある開示の慣行に従い、公開前に影響を受けるメンテナと連携します。

調査で本物の侵害が明らかになった場合は、協調的な脆弱性開示のプロセスに従います:
1. まずリポジトリのメンテナに非公開で通知する
2. 修正のための妥当な時間（通常 90 日）を与える
3. 公開されたパッケージが影響を受ける場合は、パッケージレジストリ（npm、PyPI など）と連携する
4. 適切であれば CVE を申請する

---

## API のレート制限 {#api-rate-limiting}

GitHub REST API にはレート制限があり、管理しないと大規模な調査が中断されます。

**認証済みリクエスト**: 5,000／時（`GITHUB_TOKEN` 環境変数または `gh` CLI 認証が必要）
**未認証リクエスト**: 60／時（調査には使えません）

**推奨事項**:
- 必ず認証する: `export GITHUB_TOKEN=ghp_...`、または `gh` CLI を使う（自動で認証されます）
- 条件付きリクエスト（`If-None-Match` / `If-Modified-Since` ヘッダ）を使い、変わっていないデータでクォータを消費しない
- ページ分割されたエンドポイントでは、全ページを順番に取得する — 同じエンドポイントに対して並列化しない
- `X-RateLimit-Remaining` ヘッダを確認する。100 を下回ったら、`X-RateLimit-Reset` のタイムスタンプまで待つ
- BigQuery には独自のクォータ（無料枠で 10 TiB／日）がある — 必ず先に dry-run する
- Wayback Machine の CDX API: 正式なレート制限はないが、礼儀として控えめにする（最大でも 1〜2 req/秒）

調査の途中でレート制限にかかった場合は、途中結果を証拠ストアに記録し、その制約をレポートに記します。

---

## 参照資料 {#reference-materials}

- [github-archive-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/github-archive-guide.md) — BigQuery クエリ、CDX API、12 種類のイベント
- [evidence-types.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/evidence-types.md) — IOC の分類、証拠のソース種別、観測の種別
- [recovery-techniques.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/recovery-techniques.md) — 削除されたコミット・PR・issue の復元
- [investigation-templates.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/references/investigation-templates.md) — 攻撃タイプ別のあらかじめ用意された仮説テンプレート
- [evidence-store.py](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/scripts/evidence-store.py) — 証拠 JSON ストアを管理する CLI ツール
- [forensic-report.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/security\oss-forensics/templates/forensic-report.md) — 構造化されたレポートテンプレート
