---
title: "cron で何でも自動化する"
description: "Hermes の cron を使った実務的な自動化のパターン。監視、レポート、パイプライン、複数スキルの連携"
upstream_path: guides/automate-with-cron.md
upstream_blob: dec05e43fd466e0554aebaf819aba1cb39f1907b
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/automate-with-cron
---

# cron で何でも自動化する {#automate-anything-with-cron}

基本は[毎日のブリーフィングボットのチュートリアル](/hermes/docs/guides/daily-briefing-bot/)で扱っています。このガイドはその先の話です。自分の作業に合わせて応用できる、実務的な自動化のパターンを 5 つ紹介します。

機能の全体像は[定期実行タスク（cron）](/hermes/docs/user-guide/features/cron/)を参照してください。

:::info 押さえておきたいこと
cron のジョブは、今のチャットの記憶を持たない新しいエージェントのセッションで動きます。プロンプトは**それだけで完結している**必要があります。エージェントが知っておくべきことをすべて書き込んでください。
:::

:::tip LLM が不要なら、トークンを使わない方法が 2 つあります。
- **定期的な見張り**で、スクリプトが送るべき文面をすでにそのまま出している場合（メモリの警告、ディスクの警告、生存確認など）は、[スクリプトだけの cron ジョブ](/hermes/docs/guides/cron-script-only/)を使います。スケジューラは同じで、LLM は使いません。チャットで Hermes に用意してもらうこともできます。`cronjob` ツールは `no_agent=True` を選ぶべき場面を判断し、スクリプトも書いてくれます。
- **すでに動いているスクリプトからの単発の通知**（CI の 1 ステップ、コミット後のフック、デプロイのスクリプト、外部でスケジュールされた監視など）には、[`hermes send`](/hermes/docs/guides/pipe-script-output/) を使います。cron の登録をしなくても、標準出力やファイルをそのまま Telegram / Discord / Slack などへ流し込めます。
:::

---

## パターン 1: Web ページの変更監視 {#pattern-1-website-change-monitor}

URL を見張り、何かが変わったときにだけ知らせを受け取ります。

ここで効いてくるのが `script` のパラメータです。実行のたびに事前に Python のスクリプトが走り、その標準出力がエージェントへのコンテキストになります。取得や差分の検出といった機械的な作業はスクリプトが受け持ち、「この変更は注目に値するか」という判断はエージェントが受け持ちます。

監視用のスクリプトを作ります。

```bash
mkdir -p ~/.hermes/scripts
```

```python title="~/.hermes/scripts/watch-site.py"

URL = "https://example.com/pricing"
STATE_FILE = os.path.expanduser("~/.hermes/scripts/.watch-site-state.json")

# Fetch current content
req = urllib.request.Request(URL, headers={"User-Agent": "Hermes-Monitor/1.0"})
content = urllib.request.urlopen(req, timeout=30).read().decode()
current_hash = hashlib.sha256(content.encode()).hexdigest()

# Load previous state
prev_hash = None
if os.path.exists(STATE_FILE):
    with open(STATE_FILE) as f:
        prev_hash = json.load(f).get("hash")

# Save current state
with open(STATE_FILE, "w") as f:
    json.dump({"hash": current_hash, "url": URL}, f)

# Output for the agent
if prev_hash and prev_hash != current_hash:
    print(f"CHANGE DETECTED on {URL}")
    print(f"Previous hash: {prev_hash}")
    print(f"Current hash: {current_hash}")
    print(f"\nCurrent content (first 2000 chars):\n{content[:2000]}")
else:
    print("NO_CHANGE")
```

cron のジョブを登録します。

```bash
/cron add "every 1h" "If the script output says CHANGE DETECTED, summarize what changed on the page and why it might matter. If it says NO_CHANGE, respond with just [SILENT]." --script ~/.hermes/scripts/watch-site.py --name "Pricing monitor" --deliver telegram
```

:::tip [SILENT] という小技
cron で監視するジョブでは、何も変わっていないときは `[SILENT]` とだけ答えるようにエージェントへ指示します。cron の配信は `[SILENT]` を「黙っていろ」の印として扱うので、実際に何かが起きたときにだけ通知が届き、静かな時間帯に無駄な連絡が来ることもありません。
:::

---

## パターン 2: 週次のレポート {#pattern-2-weekly-report}

複数の情報源をまとめて、体裁の整った要約にします。これは週に 1 回動いて、自分のホームのチャンネルに届きます。

```bash
/cron add "0 9 * * 1" "Generate a weekly report covering:

1. Search the web for the top 5 AI news stories from the past week
2. Search GitHub for trending repositories in the 'machine-learning' topic
3. Check Hacker News for the most discussed AI/ML posts

Format as a clean summary with sections for each source. Include links.
Keep it under 500 words — highlight only what matters." --name "Weekly AI digest" --deliver telegram
```

CLI からは次のようにします。

```bash
hermes cron create "0 9 * * 1" \
  "Generate a weekly report covering the top AI news, trending ML GitHub repos, and most-discussed HN posts. Format with sections, include links, keep under 500 words." \
  --name "Weekly AI digest" \
  --deliver telegram
```

`0 9 * * 1` は標準的な cron の書式で、毎週月曜の午前 9 時を意味します。

---

## パターン 3: GitHub リポジトリの見張り {#pattern-3-github-repository-watcher}

リポジトリの新しい issue、PR、リリースを監視します。

```bash
/cron add "every 6h" "Check the GitHub repository NousResearch/hermes-agent for:
- New issues opened in the last 6 hours
- New PRs opened or merged in the last 6 hours
- Any new releases

Use the terminal to run gh commands:
  gh issue list --repo NousResearch/hermes-agent --state open --json number,title,author,createdAt --limit 10
  gh pr list --repo NousResearch/hermes-agent --state all --json number,title,author,createdAt,mergedAt --limit 10

Filter to only items from the last 6 hours. If nothing new, respond with [SILENT].
Otherwise, provide a concise summary of the activity." --name "Repo watcher" --deliver discord
```

:::warning それだけで完結したプロンプトにする
プロンプトの中で `gh` のコマンドをそのまま書いている点に注目してください。cron のエージェントは、前回の実行の記憶も利用者の好みも知りません。すべて明示的に書き出してください。
:::

---

## パターン 4: データ収集のパイプライン {#pattern-4-data-collection-pipeline}

一定の間隔でデータを集めてファイルに保存し、時間の経過による傾向を捉えます。このパターンは、収集を担うスクリプトと分析を担うエージェントを組み合わせます。

```python title="~/.hermes/scripts/collect-prices.py"

from datetime import datetime

DATA_DIR = os.path.expanduser("~/.hermes/data/prices")
os.makedirs(DATA_DIR, exist_ok=True)

# Fetch current data (example: crypto prices)
url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
data = json.loads(urllib.request.urlopen(url, timeout=30).read())

# Append to history file
entry = {"timestamp": datetime.now().isoformat(), "prices": data}
history_file = os.path.join(DATA_DIR, "history.jsonl")
with open(history_file, "a") as f:
    f.write(json.dumps(entry) + "\n")

# Load recent history for analysis
lines = open(history_file).readlines()
recent = [json.loads(l) for l in lines[-24:]]  # Last 24 data points

# Output for the agent
print(f"Current: BTC=${data['bitcoin']['usd']}, ETH=${data['ethereum']['usd']}")
print(f"Data points collected: {len(lines)} total, showing last {len(recent)}")
print(f"\nRecent history:")
for r in recent[-6:]:
    print(f"  {r['timestamp']}: BTC=${r['prices']['bitcoin']['usd']}, ETH=${r['prices']['ethereum']['usd']}")
```

```bash
/cron add "every 1h" "Analyze the price data from the script output. Report:
1. Current prices
2. Trend direction over the last 6 data points (up/down/flat)
3. Any notable movements (>5% change)

If prices are flat and nothing notable, respond with [SILENT].
If there's a significant move, explain what happened." \
  --script ~/.hermes/scripts/collect-prices.py \
  --name "Price tracker" \
  --deliver telegram
```

機械的な収集はスクリプトが担い、その上に判断の層をエージェントが足します。

---

## パターン 5: 複数のスキルを組み合わせる {#pattern-5-multi-skill-workflow}

込み入った定期タスクでは、スキルを数珠つなぎにします。スキルはプロンプトの実行前に、指定した順で読み込まれます。

```bash
# Use the arxiv skill to find papers, then the obsidian skill to save notes
/cron add "0 8 * * *" "Search arXiv for the 3 most interesting papers on 'language model reasoning' from the past day. For each paper, create an Obsidian note with the title, authors, abstract summary, and key contribution." \
  --skill arxiv \
  --skill obsidian \
  --name "Paper digest"
```

ツールから直接指定する場合は次のようにします。

```python
cronjob(
    action="create",
    skills=["arxiv", "obsidian"],
    prompt="Search arXiv for papers on 'language model reasoning' from the past day. Save the top 3 as Obsidian notes.",
    schedule="0 8 * * *",
    name="Paper digest",
    deliver="local"
)
```

スキルは順に読み込まれます。まず `arxiv`（論文の探し方をエージェントに教える）、次に `obsidian`（メモの書き方を教える）です。その 2 つをつなぐのがプロンプトの役目です。

---

## ジョブを管理する {#managing-your-jobs}

```bash
# List all active jobs
/cron list

# Trigger a job immediately (for testing)
/cron run <job_id>

# Pause a job without deleting it
/cron pause <job_id>

# Edit a running job's schedule or prompt
/cron edit <job_id> --schedule "every 4h"
/cron edit <job_id> --prompt "Updated task description"

# Add or remove skills from an existing job
/cron edit <job_id> --skill arxiv --skill obsidian
/cron edit <job_id> --clear-skills

# Remove a job permanently
/cron remove <job_id>
```

---

## 配信先 {#delivery-targets}

結果をどこへ届けるかは `--deliver` のフラグで決めます。

| 配信先 | 書き方 | 用途 |
|--------|---------|----------|
| `origin` | `--deliver origin` | ジョブを作ったのと同じチャット（既定） |
| `local` | `--deliver local` | ローカルのファイルに保存するだけ |
| `telegram` | `--deliver telegram` | 自分の Telegram のホームチャンネル |
| `discord` | `--deliver discord` | 自分の Discord のホームチャンネル |
| `slack` | `--deliver slack` | 自分の Slack のホームチャンネル |
| 特定のチャット | `--deliver telegram:-1001234567890` | Telegram の特定のグループ |
| スレッド指定 | `--deliver telegram:-1001234567890:17585` | Telegram の特定のトピックのスレッド |

---

## コツ {#tips}

**プロンプトはそれだけで完結させる。** cron のジョブの中のエージェントは、これまでの会話を覚えていません。URL、リポジトリ名、体裁の好み、配信の指示は、すべてプロンプトに直接書いてください。

**`[SILENT]` を意識して使う。** 監視のジョブでは「何も変わっていなければ `[SILENT]` とだけ答えること」のように指示します。静かな場合にこの印を説明させてはいけません。cron は `[SILENT]` を配信を止めるための印として扱います。

**データ収集にはスクリプトを使う。** `script` のパラメータを使えば、HTTP のリクエスト、ファイルの読み書き、状態の記録といった退屈な部分を Python のスクリプトに任せられます。エージェントが見るのはスクリプトの標準出力だけで、そこに判断を加えます。取得までエージェントにやらせるより安く、確実です。

**`/cron run` で試す。** スケジュールが来るのを待つ前に、`/cron run <job_id>` ですぐ実行し、出力が期待どおりか確かめてください。

**スケジュールの書き方。** 対応している形式は、相対的な遅延（`30m`）、間隔（`every 2h`）、標準的な cron の書式（`0 9 * * *`）、ISO 形式の時刻（`2025-06-15T09:00:00`）です。`daily at 9am` のような自然言語には対応していないので、代わりに `0 9 * * *` と書いてください。

---

*cron の全体像（すべてのパラメータ、例外的なケース、内部の仕組み）については、[定期実行タスク（cron）](/hermes/docs/user-guide/features/cron/)を参照してください。*
