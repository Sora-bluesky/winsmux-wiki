---
title: "cron であらゆる作業を自動化する"
description: "Hermes の cron を使った実践的な自動化パターン — 監視、レポート、パイプライン、複数スキルの組み合わせ"
upstream_path: guides/automate-with-cron.md
upstream_blob: c73d9b39ea328d0b18c2699ffe7acca2749193cb
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/automate-with-cron
---

# cron であらゆる作業を自動化する {#automate-anything-with-cron}

基本は[毎朝のブリーフィング bot チュートリアル](/hermes/docs/guides/daily-briefing-bot/)で説明しています。ここではもう一歩進んで、自分の作業に合わせて応用できる実践的な自動化パターンを5つ紹介します。

機能の全体像は[定期実行タスク（cron）](/hermes/docs/user-guide/features/cron/)を参照してください。

:::info 重要な考え方
cron ジョブは真新しいエージェントのセッションで動くため、いま話しているチャットの内容は一切覚えていません。プロンプトは**それ単体で完結**させ、エージェントが知っておくべきことをすべて書き込んでください。
:::

:::tip LLM が要らない場合は、トークンを使わない方法が2つあります
- **繰り返しの見張り役**で、送りたい文面をスクリプトがすでに作れている場合（メモリ不足の警告、ディスク容量の警告、生存確認など）は、[スクリプトだけの cron ジョブ](/hermes/docs/guides/cron-script-only/)を使います。スケジューラは同じで、LLM は動きません。チャットで Hermes に頼めば設定してもらえます。`cronjob` ツールは `no_agent=True` を選ぶべき場面を判断でき、スクリプトも書いてくれます。
- **すでに動いているスクリプトから1回だけ送りたい**場合（CI の1ステップ、コミット後のフック、デプロイ用スクリプト、外部でスケジュールされた監視など）は、[`hermes send`](/hermes/docs/guides/pipe-script-output/) を使って標準出力やファイルをそのまま Telegram / Discord / Slack などへ流します。cron に登録する必要はありません。
:::

---

## パターン1: サイトの変更を見張る {#pattern-1-website-change-monitor}

URL を監視して、内容が変わったときだけ知らせてもらいます。

ここで効いてくるのが `script` パラメータです。実行のたびに Python スクリプトが先に動き、その標準出力がエージェントへの材料になります。取得や差分の検出といった機械的な部分はスクリプトが引き受け、「この変更は気にする価値があるか」という判断はエージェントが担当します。

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

cron ジョブを登録します。次のコマンドは、1時間ごとにスクリプトを走らせて結果を Telegram へ届ける設定を作ります。

```bash
/cron add "every 1h" "If the script output says CHANGE DETECTED, summarize what changed on the page and why it might matter. If it says NO_CHANGE, respond with just [SILENT]." --script ~/.hermes/scripts/watch-site.py --name "Pricing monitor" --deliver telegram
```

:::tip [SILENT] という小技
監視の cron ジョブでは、変化がなかったときは `[SILENT]` とだけ返すようエージェントに指示しておきます。cron の配信は `[SILENT]` を「黙っていろ」の合図として扱うので、実際に何か起きたときだけ通知が届き、静かな時間帯に無駄な通知が飛びません。
:::

:::tip 失敗のお知らせを共有チャンネルに流さない
`[SILENT]` が効くのは成功した実行だけです。ジョブが完全に失敗すると、エンジンはそのジョブの配信先へ `⚠️ Cron 'X' failed…` という通知を投げます。人の多い共有チャンネルへ届けているジョブなら、`--failure-deliver local` を付けるとその通知を出さずに済みます（実行の状態は `hermes cron list` と実行履歴で確認できます）。運用向けチャンネルへ回したいときは `--failure-deliver slack:C_OPS` のように指定します。書き方は `--deliver` と同じで、省略した場合は従来どおり失敗も `--deliver` の宛先へ届きます。
:::

---

## パターン2: 週次レポート {#pattern-2-weekly-report}

複数の情報源をまとめて、体裁の整った要約にします。これは週に1回動いて、ホームチャンネルへ届きます。

```bash
/cron add "0 9 * * 1" "Generate a weekly report covering:

1. Search the web for the top 5 AI news stories from the past week
2. Search GitHub for trending repositories in the 'machine-learning' topic
3. Check Hacker News for the most discussed AI/ML posts

Format as a clean summary with sections for each source. Include links.
Keep it under 500 words — highlight only what matters." --name "Weekly AI digest" --deliver telegram
```

CLI から登録する場合は次のようにします。

```bash
hermes cron create "0 9 * * 1" \
  "Generate a weekly report covering the top AI news, trending ML GitHub repos, and most-discussed HN posts. Format with sections, include links, keep under 500 words." \
  --name "Weekly AI digest" \
  --deliver telegram
```

`0 9 * * 1` は標準的な cron の書き方で、毎週月曜の午前9時という意味です。

---

## パターン3: GitHub リポジトリの見張り {#pattern-3-github-repository-watcher}

リポジトリを監視して、新しい issue・PR・リリースを拾います。

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

:::warning プロンプトは単体で完結させる
このプロンプトには `gh` コマンドがそのまま書き込まれている点に注目してください。cron のエージェントには前回までの会話が残っていないので、何もかも書き下します。（永続メモリは読み込まれるので、MEMORY.md に保存した長く使う好みは引き継がれます。ただしジョブの成否に関わる情報をそこに頼らせないでください。）
:::

---

## パターン4: データ収集のパイプライン {#pattern-4-data-collection-pipeline}

一定の間隔でデータを取得してファイルに保存し、時間の経過とともに傾向をつかみます。このパターンは収集を担うスクリプトと、分析を担うエージェントを組み合わせます。

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

次のコマンドは、そのスクリプトを1時間ごとに走らせ、出力の分析をエージェントに任せる設定を作ります。

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

機械的な収集はスクリプトが行い、そこに考える層をエージェントが足す形です。

---

## パターン5: 複数スキルの組み合わせ {#pattern-5-multi-skill-workflow}

複雑な定期タスクは、スキルをつないで組み立てます。スキルはプロンプトが実行される前に、指定した順で読み込まれます。

```bash
# Use the arxiv skill to find papers, then the obsidian skill to save notes
/cron add "0 8 * * *" "Search arXiv for the 3 most interesting papers on 'language model reasoning' from the past day. For each paper, create an Obsidian note with the title, authors, abstract summary, and key contribution." \
  --skill arxiv \
  --skill obsidian \
  --name "Paper digest"
```

ツールから直接呼ぶ場合は次のようになります。

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

スキルは順番に読み込まれます。まず `arxiv` が論文の探し方をエージェントに教え、次に `obsidian` がノートの書き方を教えます。その2つをつなぐのがプロンプトです。

---

## ジョブの管理 {#managing-your-jobs}

次のコマンドで、一覧の確認から即時実行、一時停止、内容の編集、削除までひととおり行えます。

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

`--deliver` フラグで結果の届け先を決めます。

| 宛先 | 例 | 使いどころ |
|--------|---------|----------|
| `origin` | `--deliver origin` | ジョブを作ったチャットと同じ場所（既定） |
| `local` | `--deliver local` | ローカルのファイルに保存するだけ |
| `telegram` | `--deliver telegram` | 自分の Telegram ホームチャンネル |
| `discord` | `--deliver discord` | 自分の Discord ホームチャンネル |
| `slack` | `--deliver slack` | 自分の Slack ホームチャンネル |
| 特定のチャット | `--deliver telegram:-1001234567890` | Telegram の特定のグループ |
| スレッド指定 | `--deliver telegram:-1001234567890:17585` | Telegram の特定のトピックスレッド |
| Bot Chat | `--deliver bot-chat` | このプロファイルの正規の Bot Chat へ流し込む。bot がそれを読んで応答する |
| Bot Chat（名前つき） | `--deliver bot-chat:research` | 別のローカルプロファイルの Bot Chat |

### Bot Chat への配信 {#bot-chat-delivery}

`bot-chat` を宛先にすると、ジョブの出力が**そのプロファイルの正規の「Bot
Chat」セッションへ、本物のメッセージとして**届きます。bot は他のメッセージと
同じように受け取り、対応が必要なことがあれば手を動かし、そのチャットで返事を
します。定期実行の結果を実行履歴にしまっておくだけでなく、bot に*見せて反応
させたい*ときは、この宛先を選びます。

知っておきたいことは次のとおりです。

- **その端末の中だけで完結します。** 対象のプロファイルは、スケジューラが動いて
  いる端末に存在している必要があります（`hermes profile list`）。名前は作成時に
  検証され、別のゲートウェイや端末にあるプロファイルは指定できません。
- **bot の1ターン分を消費します。** 配信のたびに、対象の bot の Bot Chat で
  エージェントのターンがまるごと1回動きます。頻度の高いジョブでは予算を意識して
  ください。
- **組み合わせられます。** `--deliver bot-chat,telegram` なら bot と自分の
  Telegram ホームチャンネルの両方へ届きます。`all` という指定が bot-chat 宛てに
  広がることはありません。
- 届いたメッセージには接頭辞が付き、あなたからではなく定期実行のジョブから来た
  ものだと bot にわかるようになっています。

---

## コツ {#tips}

**プロンプトはそれ単体で完結させます。** cron ジョブのエージェントは、これまでの会話を覚えていません。URL、リポジトリ名、書式の希望、届け方の指示を、プロンプトの中に直接書き込んでください。

**`[SILENT]` を意識して使います。** 監視のジョブでは「変化がなければ `[SILENT]` とだけ返すこと」といった指示を入れておきます。静かなときにこの合図の意味を説明させてはいけません。cron は `[SILENT]` を配信を止める印として扱います。

**データの収集はスクリプトに任せます。** `script` パラメータを使えば、HTTP のリクエスト、ファイルの読み書き、状態の保持といった退屈な部分を Python スクリプトが引き受けます。エージェントが見るのはスクリプトの標準出力だけで、そこに判断を加えます。エージェント自身に取得させるより安く、しかも確実です。

**`/cron run` で試します。** スケジュールが来るのを待つ前に、`/cron run <job_id>` で即座に実行し、出力が期待どおりかを確かめます。

**スケジュールの書き方。** 使えるのは、相対的な待ち時間（`30m`）、間隔の指定（`every 2h`）、標準的な cron 式（`0 9 * * *`）、ISO 形式の日時（`2025-06-15T09:00:00`）です。`daily at 9am` のような自然な言い回しには対応していないので、代わりに `0 9 * * *` と書いてください。

---

*パラメータの全種類、例外的なふるまい、内部の仕組みまで含めた cron の詳細は、[定期実行タスク（cron）](/hermes/docs/user-guide/features/cron/)を参照してください。*
