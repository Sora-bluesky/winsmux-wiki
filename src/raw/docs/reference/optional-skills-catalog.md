---
title: "オプションスキルの一覧"
description: "hermes-agent に同梱されている公式のオプションスキル。hermes skills install official/<category>/<skill> で導入します"
upstream_path: reference/optional-skills-catalog.md
upstream_blob: 70f0c5897afe8bcc241fea4ef0fb12ef1e1d3031
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/optional-skills-catalog
---

# オプションスキルの一覧 {#optional-skills-catalog}

オプションスキルは hermes-agent の `optional-skills/` に同梱されていますが、**最初から有効になってはいません**。使いたいものを次のように名指しで導入します。

```bash
hermes skills install official/<category>/<skill>
```

たとえば、次のように書きます。

```bash
hermes skills install official/blockchain/solana
hermes skills install official/mlops/flash-attention
```

以下の各スキルからは、定義の全文・準備の手順・使い方をまとめた専用ページへ移動できます。

外したくなったときは、次のコマンドで削除できます。

```bash
hermes skills uninstall <skill-name>
```

## autonomous-ai-agents {#autonomous-ai-agents}

| スキル | 説明 |
|-------|-------------|
| [**antigravity-cli**](/hermes/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-antigravity-cli/) | Antigravity CLI（agy）を操作します。プラグイン、認証、サンドボックスに対応。 |
| [**blackbox**](/hermes/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-blackbox/) | 複数モデルを使う Blackbox AI の CLI にコーディング作業を任せます。 |
| [**grok**](/hermes/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-grok/) | xAI Grok Build CLI にコーディングを任せます（機能追加、PR 作成）。 |
| [**honcho**](/hermes/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-honcho/) | Hermes 向けに Honcho の記憶機能を設定し、不具合を切り分けます。 |
| [**openhands**](/hermes/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-openhands/) | OpenHands CLI にコーディングを任せます（モデルを選ばず、LiteLLM 対応）。 |

## blockchain {#blockchain}

| スキル | 説明 |
|-------|-------------|
| [**evm**](/hermes/docs/user-guide/skills/optional/blockchain/blockchain-evm/) | 読み取り専用の EVM クライアント。8 つのチェーンでウォレット、トークン、ガス代を確認します。 |
| [**hyperliquid**](/hermes/docs/user-guide/skills/optional/blockchain/blockchain-hyperliquid/) | Hyperliquid の相場データ、口座の履歴、取引の振り返りに使います。 |
| [**solana**](/hermes/docs/user-guide/skills/optional/blockchain/blockchain-solana/) | Solana のウォレット、トークン、取引、NFT を米ドル建てで調べます。 |

## communication {#communication}

| スキル | 説明 |
|-------|-------------|
| [**one-three-one-rule**](/hermes/docs/user-guide/skills/optional/communication/communication-one-three-one-rule/) | 1-3-1 形式の意思決定メモ。課題 1 つ、選択肢 3 つ、推す案 1 つでまとめます。 |

## creative {#creative}

| スキル | 説明 |
|-------|-------------|
| [**audiocraft-audio-generation**](/hermes/docs/user-guide/skills/optional/creative/creative-audiocraft-audio-generation/) | AudioCraft。MusicGen で文章から音楽を、AudioGen で文章から効果音を作ります。 |
| [**baoyu-article-illustrator**](/hermes/docs/user-guide/skills/optional/creative/creative-baoyu-article-illustrator/) | 記事の挿絵。種類 × 画風 × 配色をそろえて描きます。 |
| [**baoyu-comic**](/hermes/docs/user-guide/skills/optional/creative/creative-baoyu-comic/) | 知識マンガ（知识漫画）。学習向け、伝記、手順解説に対応します。 |
| [**concept-diagrams**](/hermes/docs/user-guide/skills/optional/creative/creative-concept-diagrams/) | 平面的で装飾を抑えた学習用の SVG 図版を HTML として作ります。 |
| [**creative-ideation**](/hermes/docs/user-guide/skills/optional/creative/creative-creative-ideation/) | 創作の現場で使われてきた発想法を名指しで呼び出し、アイデアを出します。 |
| [**draw-your-font**](/hermes/docs/user-guide/skills/optional/creative/creative-draw-your-font/) | 手書き文字の写真から、そのまま使えるフォント（TTF/WOFF）を作ります。 |
| [**heartmula**](/hermes/docs/user-guide/skills/optional/creative/creative-heartmula/) | HeartMuLa。歌詞とタグから Suno のように曲を生成します。 |
| [**hyperframes**](/hermes/docs/user-guide/skills/optional/creative/creative-hyperframes/) | HTML で組んだ構成から MP4/WebM の動画を書き出します。 |
| [**kanban-video-orchestrator**](/hermes/docs/user-guide/skills/optional/creative/creative-kanban-video-orchestrator/) | 複数のエージェントで動画制作の工程を計画し、走らせます。 |
| [**meme-generation**](/hermes/docs/user-guide/skills/optional/creative/creative-meme-generation/) | ひな形に Pillow で文字を重ね、ミーム画像（PNG）を作ります。 |
| [**pixel-art**](/hermes/docs/user-guide/skills/optional/creative/creative-pixel-art/) | 時代ごとの配色（NES、ゲームボーイ、PICO-8）でドット絵を描きます。 |
| [**simple-english**](/hermes/docs/user-guide/skills/optional/creative/creative-simple-english/) | 技術文書を ASD-STE100 の簡易技術英語に書き直します。 |
| [**social-media-content-calendar**](/hermes/docs/user-guide/skills/optional/creative/creative-social-media-content-calendar/) | 複数の SNS をまたぐ施策を、企画書から投稿まで計画します。 |
| [**tldraw-offline**](/hermes/docs/user-guide/skills/optional/creative/creative-tldraw-offline/) | オフラインの tldraw キャンバスをエージェントから操作し、自動化します。 |
| [**unreal-mcp**](/hermes/docs/user-guide/skills/optional/creative/creative-unreal-mcp/) | Unreal Engine のエディタでシーン、アクター、レンダリングを自動化します。 |

## data-science {#data-science}

| スキル | 説明 |
|-------|-------------|
| [**jupyter-notebook**](/hermes/docs/user-guide/skills/optional/data-science/data-science-jupyter-notebook/) | 起動中の Jupyter カーネルで Python を少しずつ試します（hamelnb）。 |

## devops {#devops}

| スキル | 説明 |
|-------|-------------|
| [**actual-setup**](/hermes/docs/user-guide/skills/optional/devops/devops-actual-setup/) | Hermes で Actual Computer（actual.inc）の推論を使えるようにします。 |
| [**docker-management**](/hermes/docs/user-guide/skills/optional/devops/devops-docker-management/) | Docker のコンテナ、イメージ、ボリューム、Compose をまとめて扱います。 |
| [**hermes-s6-container-supervision**](/hermes/docs/user-guide/skills/optional/devops/devops-hermes-s6-container-supervision/) | Hermes の Docker イメージにある s6 サービスを書き換え、不具合を追います。 |
| [**inference-sh-cli**](/hermes/docs/user-guide/skills/optional/devops/devops-inference-sh-cli/) | inference.sh の CLI から 150 種類以上の AI アプリ（画像、動画、LLM）を動かします。 |
| [**pinggy-tunnel**](/hermes/docs/user-guide/skills/optional/devops/devops-pinggy-tunnel/) | Pinggy を使い、SSH 越しに localhost を公開します。導入作業は不要です。 |
| [**watchers**](/hermes/docs/user-guide/skills/optional/devops/devops-watchers/) | RSS、JSON の API、GitHub を定期的に見に行き、既読位置で重複を省きます。 |

## dogfood {#dogfood}

| スキル | 説明 |
|-------|-------------|
| [**adversarial-ux-test**](/hermes/docs/user-guide/skills/optional/dogfood/dogfood-adversarial-ux-test/) | 手ごわい利用者を演じ、使い勝手のつまずきを洗い出して仕分けます。 |

## email {#email}

| スキル | 説明 |
|-------|-------------|
| [**agentmail**](/hermes/docs/user-guide/skills/optional/email/email-agentmail/) | エージェント専用の受信箱を用意し、メールの送受信をできるようにします。 |

## finance {#finance}

| スキル | 説明 |
|-------|-------------|
| [**3-statement-model**](/hermes/docs/user-guide/skills/optional/finance/finance-3-statement-model/) | 損益・貸借・キャッシュフローが連動した財務ブックを Excel で作ります。 |
| [**comps-analysis**](/hermes/docs/user-guide/skills/optional/finance/finance-comps-analysis/) | 類似企業比較による評価のブックを Excel で作ります。 |
| [**dcf-model**](/hermes/docs/user-guide/skills/optional/finance/finance-dcf-model/) | 割引キャッシュフロー法による評価のブックを Excel で作ります。 |
| [**excel-author**](/hermes/docs/user-guide/skills/optional/finance/finance-excel-author/) | openpyxl を使い、検算できる財務ブックを画面なしで作ります。 |
| [**lbo-model**](/hermes/docs/user-guide/skills/optional/finance/finance-lbo-model/) | IRR と MOIC を含む LBO のブックを Excel で作ります。 |
| [**merger-model**](/hermes/docs/user-guide/skills/optional/finance/finance-merger-model/) | M&A の増益・希薄化を見るブックを Excel で作ります。 |
| [**polymarket**](/hermes/docs/user-guide/skills/optional/finance/finance-polymarket/) | Polymarket の市場、価格、板、履歴を調べます。 |
| [**pptx-author**](/hermes/docs/user-guide/skills/optional/finance/finance-pptx-author/) | python-pptx で PowerPoint の資料を画面なしで作ります。 |
| [**stocks**](/hermes/docs/user-guide/skills/optional/finance/finance-stocks/) | Yahoo 経由で株価、値動き、銘柄検索、比較、暗号資産を扱います。 |

## gaming {#gaming}

| スキル | 説明 |
|-------|-------------|
| [**minecraft-modpack-server**](/hermes/docs/user-guide/skills/optional/gaming/gaming-minecraft-modpack-server/) | Mod 入り Minecraft のサーバーを立てます（CurseForge、Modrinth）。 |
| [**pokemon-player**](/hermes/docs/user-guide/skills/optional/gaming/gaming-pokemon-player/) | 画面なしのエミュレータと RAM の読み取りでポケモンを遊びます。 |

## health {#health}

| スキル | 説明 |
|-------|-------------|
| [**fitness-nutrition**](/hermes/docs/user-guide/skills/optional/health/health-fitness-nutrition/) | wger と USDA を使い、運動の計画、栄養バランス、体の数値を管理します。 |
| [**neuroskill-bci**](/hermes/docs/user-guide/skills/optional/health/health-neuroskill-bci/) | NeuroSkill から届く、いまの集中度や気分の状態を使います。 |

## mcp {#mcp}

| スキル | 説明 |
|-------|-------------|
| [**fastmcp**](/hermes/docs/user-guide/skills/optional/mcp/mcp-fastmcp/) | Python 製の MCP サーバーを作り、試し、公開します。 |
| [**mcp-oauth-remote-gateway**](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcp-oauth-remote-gateway/) | 画面のないゲートウェイで、遠隔の MCP サーバーの OAuth を手作業で通します。 |
| [**mcporter**](/hermes/docs/user-guide/skills/optional/mcp/mcp-mcporter/) | 端末から MCP のサーバーやツールを一覧し、認証し、呼び出します。 |

## migration {#migration}

| スキル | 説明 |
|-------|-------------|
| [**openclaw-migration**](/hermes/docs/user-guide/skills/optional/migration/migration-openclaw-migration/) | OpenClaw の環境（記憶、スキル）を Hermes に取り込みます。 |

## mlops {#mlops}

| スキル | 説明 |
|-------|-------------|
| [**accelerate**](/hermes/docs/user-guide/skills/optional/mlops/mlops-accelerate/) | PyTorch の学習を、書き換えを最小限にして複数 GPU で走らせます。 |
| [**axolotl**](/hermes/docs/user-guide/skills/optional/mlops/mlops-training-axolotl/) | Axolotl。YAML で LLM を追加学習します（LoRA、DPO、GRPO）。 |
| [**chroma**](/hermes/docs/user-guide/skills/optional/mlops/mlops-chroma/) | RAG と意味検索のための埋め込みデータベースです。 |
| [**clip**](/hermes/docs/user-guide/skills/optional/mlops/mlops-clip/) | 学習なしでの画像分類と、画像と文章をまたぐ検索を行います。 |
| [**dspy**](/hermes/docs/user-guide/skills/optional/mlops/mlops-research-dspy/) | DSPy。宣言的に言語モデルを組み、プロンプトを自動で最適化し、RAG を作ります。 |
| [**faiss**](/hermes/docs/user-guide/skills/optional/mlops/mlops-faiss/) | 10 億件規模でも速いベクトル類似検索です。 |
| [**flash-attention**](/hermes/docs/user-guide/skills/optional/mlops/mlops-flash-attention/) | 長い系列を扱う Transformer の学習と推論を速くします。 |
| [**guidance**](/hermes/docs/user-guide/skills/optional/mlops/mlops-guidance/) | 文法で LLM の出力を縛り、壊れない JSON を保証します。 |
| [**huggingface-tokenizers**](/hermes/docs/user-guide/skills/optional/mlops/mlops-huggingface-tokenizers/) | 高速な BPE/WordPiece の分割と、独自語彙の学習を行います。 |
| [**instructor**](/hermes/docs/user-guide/skills/optional/mlops/mlops-instructor/) | LLM の出力を構造化し、Pydantic で検証します。 |
| [**lambda-labs**](/hermes/docs/user-guide/skills/optional/mlops/mlops-lambda-labs/) | 機械学習の学習用に、必要なときだけ GPU クラウドを借ります。 |
| [**llava**](/hermes/docs/user-guide/skills/optional/mlops/mlops-llava/) | 画像を見ながらの対話。視覚的な質問応答、説明文の生成、画像についての会話を扱います。 |
| [**modal**](/hermes/docs/user-guide/skills/optional/mlops/mlops-modal/) | 機械学習のジョブとモデル API のための、サーバー管理不要な GPU クラウドです。 |
| [**nemo-curator**](/hermes/docs/user-guide/skills/optional/mlops/mlops-nemo-curator/) | LLM の学習データを整えます。重複除去、絞り込み、個人情報の伏せ字化。 |
| [**obliteratus**](/hermes/docs/user-guide/skills/optional/mlops/mlops-obliteratus/) | OBLITERATUS。差分平均法で LLM の応答拒否を取り除きます。 |
| [**outlines**](/hermes/docs/user-guide/skills/optional/mlops/mlops-inference-outlines/) | Outlines。JSON、正規表現、Pydantic に沿った形で LLM に生成させます。 |
| [**peft**](/hermes/docs/user-guide/skills/optional/mlops/mlops-peft/) | 限られた GPU メモリでも、LoRA で大きな LLM を追加学習します。 |
| [**pinecone**](/hermes/docs/user-guide/skills/optional/mlops/mlops-pinecone/) | 本番の RAG と検索に使う、運用込みのベクトルデータベースです。 |
| [**pytorch-fsdp**](/hermes/docs/user-guide/skills/optional/mlops/mlops-pytorch-fsdp/) | 大きなモデルを、完全に分割したデータ並列で学習します。 |
| [**pytorch-lightning**](/hermes/docs/user-guide/skills/optional/mlops/mlops-pytorch-lightning/) | 見通しのよい学習ループを書け、分散学習も最初から使えます。 |
| [**qdrant**](/hermes/docs/user-guide/skills/optional/mlops/mlops-qdrant/) | 本番の RAG を支えるベクトル検索エンジンです。 |
| [**saelens**](/hermes/docs/user-guide/skills/optional/mlops/mlops-saelens/) | 疎な自己符号化器を学習させ、モデルが何を捉えているかを読み解きます。 |
| [**segment-anything-model**](/hermes/docs/user-guide/skills/optional/mlops/mlops-models-segment-anything-model/) | SAM。点、枠、マスクを手がかりに、学習なしで画像を切り分けます。 |
| [**simpo**](/hermes/docs/user-guide/skills/optional/mlops/mlops-simpo/) | 参照モデルなしの選好アライメント。DPO より手順が簡単です。 |
| [**slime**](/hermes/docs/user-guide/skills/optional/mlops/mlops-slime/) | Megatron と SGLang を使い、LLM を強化学習で仕上げます。 |
| [**stable-diffusion**](/hermes/docs/user-guide/skills/optional/mlops/mlops-stable-diffusion/) | 文章からの画像生成、部分の描き直し、画像からの画像生成を行います。 |
| [**tensorrt-llm**](/hermes/docs/user-guide/skills/optional/mlops/mlops-tensorrt-llm/) | NVIDIA の GPU で、LLM の推論をまとめて大量にさばきます。 |
| [**torchtitan**](/hermes/docs/user-guide/skills/optional/mlops/mlops-torchtitan/) | PyTorch の 4 次元並列で、LLM を大規模に事前学習します。 |
| [**trl-fine-tuning**](/hermes/docs/user-guide/skills/optional/mlops/mlops-training-trl-fine-tuning/) | TRL。LLM の RLHF に向けた SFT、DPO、GRPO、RLOO の報酬モデリングです。 |
| [**unsloth**](/hermes/docs/user-guide/skills/optional/mlops/mlops-training-unsloth/) | Unsloth。LoRA/QLoRA の追加学習が 2〜5 倍速く、VRAM も少なく済みます。 |
| [**whisper**](/hermes/docs/user-guide/skills/optional/mlops/mlops-whisper/) | 99 の言語で音声を文字に起こし、翻訳します。 |

## payments {#payments}

| スキル | 説明 |
|-------|-------------|
| [**mpp-agent**](/hermes/docs/user-guide/skills/optional/payments/payments-mpp-agent/) | HTTP 402 を返す API に、Machine Payments Protocol（MPP）で支払います。 |
| [**stripe-link-cli**](/hermes/docs/user-guide/skills/optional/payments/payments-stripe-link-cli/) | Stripe Link によるエージェントの支払い。カード、SPT、承認に対応します。 |
| [**stripe-projects**](/hermes/docs/user-guide/skills/optional/payments/payments-stripe-projects/) | Stripe Projects で SaaS を用意し、資格情報を同期します。 |

## productivity {#productivity}

| スキル | 説明 |
|-------|-------------|
| [**canvas**](/hermes/docs/user-guide/skills/optional/productivity/productivity-canvas/) | API トークンで Canvas LMS の講義と課題を取得します。 |
| [**here-now**](/hermes/docs/user-guide/skills/optional/productivity/productivity-here-now/) | &#123;slug&#125;.here.now にサイトを公開し、ファイルを Drives に保管します。 |
| [**memento-flashcards**](/hermes/docs/user-guide/skills/optional/productivity/productivity-memento-flashcards/) | 間隔をあけて復習する単語カード。作成、復習、小テスト、書き出しに対応します。 |
| [**shop**](/hermes/docs/user-guide/skills/optional/productivity/productivity-shop/) | 商品の検索、購入手続き、配送状況の確認、返品まで扱います。 |
| [**shopify**](/hermes/docs/user-guide/skills/optional/productivity/productivity-shopify/) | curl で Shopify の Admin/Storefront GraphQL API を呼び出します。 |
| [**siyuan**](/hermes/docs/user-guide/skills/optional/productivity/productivity-siyuan/) | SiYuan のノートを API 経由で検索し、編集します。 |
| [**telephony**](/hermes/docs/user-guide/skills/optional/productivity/productivity-telephony/) | Twilio の電話番号の取得、SMS/MMS の送受信、AI による発信を行います。 |

## research {#research}

| スキル | 説明 |
|-------|-------------|
| [**bioinformatics**](/hermes/docs/user-guide/skills/optional/research/research-bioinformatics/) | ゲノム解析と計算生物学の 400 以上のスキルへの入口です。 |
| [**darwinian-evolver**](/hermes/docs/user-guide/skills/optional/research/research-darwinian-evolver/) | Imbue の進化ループで、プロンプト、正規表現、SQL、コードを育てます。 |
| [**domain-intel**](/hermes/docs/user-guide/skills/optional/research/research-domain-intel/) | サブドメイン、SSL 証明書、WHOIS、DNS を、相手に触れずに調べます。 |
| [**drug-discovery**](/hermes/docs/user-guide/skills/optional/research/research-drug-discovery/) | 創薬。ChEMBL の検索、医薬品らしさの評価、相互作用の確認を行います。 |
| [**duckduckgo-search**](/hermes/docs/user-guide/skills/optional/research/research-duckduckgo-search/) | ddgs 経由で、鍵も費用も要らないウェブ、ニュース、画像の検索を行います。 |
| [**gitnexus-explorer**](/hermes/docs/user-guide/skills/optional/research/research-gitnexus-explorer/) | コードベースの知識グラフを、触って動かせるウェブ画面として提供します。 |
| [**osint-investigation**](/hermes/docs/user-guide/skills/optional/research/research-osint-investigation/) | 公開記録と制裁リストから、お金の流れを追います。 |
| [**parallel-cli**](/hermes/docs/user-guide/skills/optional/research/research-parallel-cli/) | エージェント向けのウェブ検索、深掘り調査、情報の肉付けを行います。 |
| [**pinecone-research**](/hermes/docs/user-guide/skills/optional/research/research-pinecone-research/) | Pinecone を使い、エージェントの RAG と長期の記憶を実現します。 |
| [**qmd**](/hermes/docs/user-guide/skills/optional/research/research-qmd/) | 手元のメモ、文書、書き起こしを横断して検索します。 |
| [**scrapling**](/hermes/docs/user-guide/skills/optional/research/research-scrapling/) | 目立たない閲覧と Cloudflare の回避でサイトを収集します。 |
| [**searxng-search**](/hermes/docs/user-guide/skills/optional/research/research-searxng-search/) | 70 以上の検索エンジンをまとめて引く、鍵も費用も要らないメタ検索です。 |

## security {#security}

| スキル | 説明 |
|-------|-------------|
| [**1password**](/hermes/docs/user-guide/skills/optional/security/security-1password/) | op CLI を用意し、サインインして、秘密情報を読み出すか実行時に渡します。 |
| [**godmode**](/hermes/docs/user-guide/skills/optional/security/security-godmode/) | LLM の制限を外します。Parseltongue、GODMODE、ULTRAPLINIAN。 |
| [**oss-forensics**](/hermes/docs/user-guide/skills/optional/security/security-oss-forensics/) | GitHub のサプライチェーン調査。復旧、侵害の痕跡、報告書の作成。 |
| [**sherlock**](/hermes/docs/user-guide/skills/optional/security/security-sherlock/) | あるユーザー名のアカウントを 400 以上のサービスから探します。 |
| [**unbroker**](/hermes/docs/user-guide/skills/optional/security/security-unbroker/) | 名簿業者のサイトから、自分の情報を自動で削除させます。 |
| [**web-pentest**](/hermes/docs/user-guide/skills/optional/security/security-web-pentest/) | 許可を得たうえでのウェブ侵入テスト。調査、証拠付きの実証、報告まで。 |

## software-development {#software-development}

| スキル | 説明 |
|-------|-------------|
| [**code-wiki**](/hermes/docs/user-guide/skills/optional/software-development/software-development-code-wiki/) | どんなコードベースからでも、解説文書と Mermaid の図を生成します。 |
| [**rest-graphql-debug**](/hermes/docs/user-guide/skills/optional/software-development/software-development-rest-graphql-debug/) | REST/GraphQL API の切り分け。状態コード、認証、スキーマ、再現手順。 |
| [**subagent-driven-development**](/hermes/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development/) | delegate_task のサブエージェントで計画を実行します（2 段階の点検つき）。 |

## web-development {#web-development}

| スキル | 説明 |
|-------|-------------|
| [**cloudflare-temporary-deploy**](/hermes/docs/user-guide/skills/optional/web-development/web-development-cloudflare-temporary-deploy/) | wrangler --temporary で、アカウントなしに Worker を公開します。 |
| [**page-agent**](/hermes/docs/user-guide/skills/optional/web-development/web-development-page-agent/) | ウェブアプリの画面に、言葉で操作できる相棒を組み込みます。 |

## yuanbao {#yuanbao}

| スキル | 説明 |
|-------|-------------|
| [**yuanbao**](/hermes/docs/user-guide/skills/optional/yuanbao/yuanbao-yuanbao/) | Yuanbao（元宝）のグループ。利用者への @mention、情報やメンバーの照会。 |

---

## オプションスキルを提供する {#contributing-optional-skills}

新しいオプションスキルをリポジトリに追加する手順は、次のとおりです。

1. `optional-skills/<category>/<skill-name>/` の下にディレクトリを作ります
2. 標準のフロントマター（name、description、version、author）を書いた `SKILL.md` を置きます
3. 補助のファイルは `references/`、`templates/`、`scripts/` のいずれかのサブディレクトリに入れます
4. プルリクエストを送ります。マージされると、このページに載り、専用の解説ページも用意されます
