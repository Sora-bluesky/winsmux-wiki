---
title: "同梱スキルの一覧"
description: "Hermes Agent に最初から入っているスキルの一覧です。"
upstream_path: reference/skills-catalog.md
upstream_blob: b6ab7f5c21a95a8cfe67eb3b5c443d99aa620146
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/skills-catalog
---

# 同梱スキルの一覧 {#bundled-skills-catalog}

Hermes には大きな組み込みのスキル集が付いていて、インストールのときに `~/.hermes/skills/` へ複製されます。下のスキルはそれぞれ、定義の全文と設定・使い方を載せた専用のページにつながっています。

同梱スキルは `hermes update` のたびにも同期されますが、同期の一覧表は手元で削除したものや編集したものを尊重します。ここに載っているスキルがプロファイルの `~/.hermes/skills/` の下に見当たらなくても、Hermes には同梱されたままです。`hermes skills reset <name> --restore` で戻せます。

リポジトリにはあるのにここに載っていないスキルがある場合は、`website/scripts/generate-skill-docs.py` で一覧を作り直します。

## apple {#apple}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`apple-notes`](/hermes/docs/user-guide/skills/bundled/apple/apple-apple-notes/) | memo CLI で Apple Notes を扱います。作成・検索・編集ができます。 | `apple\apple-notes` |
| [`apple-reminders`](/hermes/docs/user-guide/skills/bundled/apple/apple-apple-reminders/) | remindctl で Apple のリマインダーを追加・一覧・完了にします。 | `apple\apple-reminders` |
| [`findmy`](/hermes/docs/user-guide/skills/bundled/apple/apple-findmy/) | macOS の FindMy.app で Apple の端末や AirTag の場所を追います。 | `apple\findmy` |
| [`imessage`](/hermes/docs/user-guide/skills/bundled/apple/apple-imessage/) | macOS の imsg CLI で iMessage / SMS を送受信します。 | `apple\imessage` |

## autonomous-ai-agents {#autonomous-ai-agents}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/) | Claude Code CLI にコーディング（機能追加や PR）を任せます。 | `autonomous-ai-agents\claude-code` |
| [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/) | OpenAI Codex CLI にコーディング（機能追加や PR）を任せます。 | `autonomous-ai-agents\codex` |
| [`computer-use`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-computer-use/) | まず裏でデスクトップを操作し、必要な合図が出たときだけ前面に出します。 | `autonomous-ai-agents\computer-use` |
| [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) | Hermes Agent を使う・設定する・見た目を変える・拡張する・指揮します。 | `autonomous-ai-agents\hermes-agent` |
| [`merge-reconciler`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-merge-reconciler/) | エージェント同士のマージの衝突を、中立の第三者として解きほぐします。 | `autonomous-ai-agents\merge-reconciler` |
| [`opencode`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode/) | OpenCode CLI にコーディング（機能追加や PR レビュー）を任せます。 | `autonomous-ai-agents\opencode` |

## creative {#creative}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/) | 暗い配色の SVG で、構成図・クラウド図・基盤の図を HTML として描きます。 | `creative\architecture-diagram` |
| [`ascii-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-ascii-video/) | ASCII の動画。映像や音声を色つき ASCII の MP4 / GIF に変換します。 | `creative\ascii-video` |
| [`baoyu-infographic`](/hermes/docs/user-guide/skills/bundled/creative/creative-baoyu-infographic/) | 図解。21 の配置 × 21 の作風（信息图、可视化）。 | `creative\baoyu-infographic` |
| [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/) | 使い捨ての HTML 制作物（着地ページ、スライド、試作）を作ります。 | `creative\claude-design` |
| [`design-md`](/hermes/docs/user-guide/skills/bundled/creative/creative-design-md/) | Google の DESIGN.md 形式のトークン定義を書く・検証する・書き出す。 | `creative\design-md` |
| [`humanizer`](/hermes/docs/user-guide/skills/bundled/creative/creative-humanizer/) | 文章から AI くささを取り除き、生きた声を足します。 | `creative\humanizer` |
| [`manim-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-manim-video/) | Manim CE のアニメーション。3Blue1Brown 風の数学・アルゴリズムの動画。 | `creative\manim-video` |
| [`p5js`](/hermes/docs/user-guide/skills/bundled/creative/creative-p5js/) | p5.js のスケッチ。生成アート、シェーダー、操作できる作品、3D。 | `creative\p5js` |
| [`popular-web-designs`](/hermes/docs/user-guide/skills/bundled/creative/creative-popular-web-designs/) | 実在する 54 のデザイン体系（Stripe、Linear、Vercel）を HTML/CSS で。 | `creative\popular-web-designs` |
| [`songwriting-and-ai-music`](/hermes/docs/user-guide/skills/bundled/creative/creative-songwriting-and-ai-music/) | 作詞作曲の技法と、Suno の AI 音楽向けの指示文。 | `creative\songwriting-and-ai-music` |

## devops {#devops}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`sdlc-review`](/hermes/docs/user-guide/skills/bundled/devops/devops-sdlc-review/) | かんばんの受け渡しを確認し、裏が取れた成果を次へ回します。 | `devops\sdlc-review` |

## email {#email}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`email-inbox-triage`](/hermes/docs/user-guide/skills/bundled/email/email-email-inbox-triage/) | 受信箱の仕分け。やりとりに優先順位を付け、返信案を安全に下書きします。 | `email\email-inbox-triage` |
| [`himalaya`](/hermes/docs/user-guide/skills/bundled/email/email-himalaya/) | Himalaya CLI。端末から IMAP / SMTP のメールを扱います。 | `email\himalaya` |

## media {#media}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`gif-search`](/hermes/docs/user-guide/skills/bundled/media/media-gif-search/) | curl と jq で Tenor の GIF を検索・取得します。 | `media\gif-search` |
| [`songsee`](/hermes/docs/user-guide/skills/bundled/media/media-songsee/) | 音声のスペクトログラムや特徴量（mel、chroma、MFCC）を CLI で。 | `media\songsee` |
| [`youtube-content`](/hermes/docs/user-guide/skills/bundled/media/media-youtube-content/) | YouTube の字幕を、要約・連投・ブログ記事に仕立てます。 | `media\youtube-content` |

## note-taking {#note-taking}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`obsidian`](/hermes/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian/) | Obsidian の保管庫でノートを読む・探す・作る・直す。 | `note-taking\obsidian` |

## productivity {#productivity}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`airtable`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-airtable/) | curl で Airtable の REST API を叩きます。レコードの読み書き、絞り込み、追加更新。 | `productivity\airtable` |
| [`box`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-box/) | Box でクラウド上のファイル・共有・検索・付随情報を扱います。 | `productivity\box` |
| [`document-to-action-items`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-document-to-action-items/) | 書類から、出典つきで義務・期限・作業を抜き出します。 | `productivity\document-to-action-items` |
| [`docx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-docx/) | Word の .docx を作る・読む・直す・雛形にする・見直す。 | `productivity\docx` |
| [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/) | Gmail、カレンダー、Drive、Docs、Sheets を gws CLI か Python で。 | `productivity\google-workspace` |
| [`maps`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-maps/) | OpenStreetMap / OSRM で住所の座標化、地点探し、経路、時間帯を扱います。 | `productivity\maps` |
| [`meeting-action-items`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-meeting-action-items/) | 会議のメモを、出典つきの決定事項・担当・課題票に変えます。 | `productivity\meeting-action-items` |
| [`notion`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-notion/) | Notion の API と ntn CLI。ページ、データベース、markdown、Workers。 | `productivity\notion` |
| [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/) | PDF を作る・読む・つなぐ・記入する・OCR する・文字を直す。 | `productivity\pdf` |
| [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) | python-pptx で .pptx のスライドを作る・読む・直す。 | `productivity\powerpoint` |
| [`product-price-monitor`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-product-price-monitor/) | 商品・航空券・出品の値段を見張り、目標に届いたら知らせます。 | `productivity\product-price-monitor` |
| [`teams-meeting-pipeline`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-teams-meeting-pipeline/) | Teams の会議の要約、job の再実行、Graph の購読。 | `productivity\teams-meeting-pipeline` |
| [`weekly-review-planning`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-weekly-review-planning/) | 週の仕切り直し。約束ごと、止まっている仕事、来週の計画。 | `productivity\weekly-review-planning` |
| [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/) | Excel の .xlsx や CSV を作る・読む・直す。 | `productivity\xlsx` |

## research {#research}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/) | arXiv の論文を、語句・著者・分野・ID で探します。 | `research\arxiv` |
| [`competitor-news-monitor`](/hermes/docs/user-guide/skills/bundled/research/research-competitor-news-monitor/) | 指定した企業の重要な報道を見張り、出典つきでまとめます。 | `research\competitor-news-monitor` |
| [`grounded-citations`](/hermes/docs/user-guide/skills/bundled/research/research-grounded-citations/) | 回答や書類を、出典が示せて確かめられる情報に裏づけます。 | `research\grounded-citations` |
| [`llm-wiki`](/hermes/docs/user-guide/skills/bundled/research/research-llm-wiki/) | Karpathy の LLM Wiki。相互に結んだ markdown の知識の土台を作って引きます。 | `research\llm-wiki` |

## social-media {#social-media}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`xurl`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/) | xurl CLI で X / Twitter を扱います。投稿のそのままの検索、投稿、DM、画像や動画。 | `social-media\xurl` |

## software-development {#software-development}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`codebase-inspection`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-codebase-inspection/) | pygount でコードを調べます。行数、言語、割合。 | `software-development\codebase-inspection` |
| [`dogfood`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-dogfood/) | ウェブアプリを触って探る品質確認。不具合と証拠を見つけて報告します。 | `software-development\dogfood` |
| [`github`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-github/) | gh CLI で GitHub を扱います。PR、issue、レビュー、リポジトリ、認証。 | `software-development\github` |
| [`hermes-agent-skill-authoring`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-hermes-agent-skill-authoring/) | リポジトリ内の SKILL.md を書きます。冒頭の定義部分と構成。 | `software-development\hermes-agent-skill-authoring` |
| [`inspecting-hermes-desktop-dom`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-inspecting-hermes-desktop-dom/) | CDP 経由で、動いている Hermes デスクトップの DOM / CSS を読みます。 | `software-development\inspecting-hermes-desktop-dom` |
| [`node-inspect-debugger`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-node-inspect-debugger/) | --inspect と Chrome DevTools Protocol の CLI で Node.js を追います。 | `software-development\node-inspect-debugger` |
| [`python-debugpy`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-python-debugpy/) | Python を追います。pdb の対話と、debugpy による遠隔（DAP）。 | `software-development\python-debugpy` |
| [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/) | コミット前のレビュー。安全性の検査、品質の関門、自動修正。 | `software-development\requesting-code-review` |
| [`simplify-code`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-simplify-code/) | 直近の変更を、4 体のエージェントで並行して片づけます。 | `software-development\simplify-code` |
| [`spike`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-spike/) | 作り込む前に思いつきを確かめる、使い捨ての実験。 | `software-development\spike` |
| [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/) | 4 段階で原因にたどり着きます。直す前に不具合を理解します。 | `software-development\systematic-debugging` |
| [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/) | TDD。RED-GREEN-REFACTOR を守り、コードより先にテストを書きます。 | `software-development\test-driven-development` |

## web {#web}

| スキル | 内容 | パス |
|-------|-------------|------|
| [`blocked-page-recovery`](/hermes/docs/user-guide/skills/bundled/web/web-blocked-page-recovery/) | 取得に失敗したときに使います。403 / 429、有料の壁、WAF、ボット判定の割り込み。 | `web\blocked-page-recovery` |
