---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "同梱 skill カタログ"
description: "Hermes Agent に最初から入っている skill の一覧"
upstream_path: reference/skills-catalog.md
upstream_blob: 0c17cbbd927af3001b7fed43d71cb655b1bfa59b
sources:
  - https://hermes-agent.nousresearch.com/docs/reference/skills-catalog
---

# 同梱 skill カタログ {#bundled-skills-catalog}

Hermes には大きな skill ライブラリが組み込まれていて、インストール時に `~/.hermes/skills/` へコピーされます。以下の各 skill は、定義の全文・準備の手順・使い方をまとめた専用ページにつながっています。

Hermes は `hermes update` のたびに同梱 skill を同期しますが、同期の manifest は手元で削除したものや編集したものをそのまま尊重します。ここに載っている skill が自分のプロファイルの `~/.hermes/skills/` に見当たらなくても、Hermes に同梱されていること自体は変わりません。`hermes skills reset <name> --restore` で元に戻せます。

この一覧には無いのにリポジトリには入っている skill があれば、`website/scripts/generate-skill-docs.py` でカタログを作り直してください。

## apple {#apple}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`apple-notes`](/hermes/docs/user-guide/skills/bundled/apple/apple-apple-notes/) | memo CLI で Apple のメモを扱います。作成・検索・編集ができます。 | `apple/apple-notes` |
| [`apple-reminders`](/hermes/docs/user-guide/skills/bundled/apple/apple-apple-reminders/) | remindctl で Apple のリマインダーを追加・一覧表示・完了にします。 | `apple/apple-reminders` |
| [`findmy`](/hermes/docs/user-guide/skills/bundled/apple/apple-findmy/) | macOS の FindMy.app 経由で Apple 製品や AirTag の位置を追います。 | `apple/findmy` |
| [`imessage`](/hermes/docs/user-guide/skills/bundled/apple/apple-imessage/) | macOS の imsg CLI で iMessage や SMS を送受信します。 | `apple/imessage` |

## autonomous-ai-agents {#autonomous-ai-agents}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`claude-code`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code/) | コーディングを Claude Code CLI に任せます（機能追加や PR）。 | `autonomous-ai-agents/claude-code` |
| [`codex`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex/) | コーディングを OpenAI Codex CLI に任せます（機能追加や PR）。 | `autonomous-ai-agents/codex` |
| [`computer-use`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-computer-use/) | まず裏側でデスクトップを操作し、必要な合図が出たら前面に切り替えます。 | `autonomous-ai-agents/computer-use` |
| [`hermes-agent`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/) | Hermes Agent を使い、設定し、見た目を変え、拡張し、まとめて動かします。 | `autonomous-ai-agents/hermes-agent` |
| [`opencode`](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode/) | コーディングを OpenCode CLI に任せます（機能追加や PR レビュー）。 | `autonomous-ai-agents/opencode` |

## creative {#creative}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`architecture-diagram`](/hermes/docs/user-guide/skills/bundled/creative/creative-architecture-diagram/) | 構成図やクラウド・インフラ図を、暗い配色の SVG として HTML に書き出します。 | `creative/architecture-diagram` |
| [`ascii-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-ascii-video/) | 動画や音声を色付きアスキーアートの MP4／GIF に変換します。 | `creative/ascii-video` |
| [`baoyu-infographic`](/hermes/docs/user-guide/skills/bundled/creative/creative-baoyu-infographic/) | インフォグラフィック。21 種のレイアウト × 21 種のスタイル（信息图, 可视化）。 | `creative/baoyu-infographic` |
| [`claude-design`](/hermes/docs/user-guide/skills/bundled/creative/creative-claude-design/) | 単発の HTML 作品をデザインします（LP・スライド・試作）。 | `creative/claude-design` |
| [`design-md`](/hermes/docs/user-guide/skills/bundled/creative/creative-design-md/) | Google の DESIGN.md トークン仕様ファイルを書き、検証し、書き出します。 | `creative/design-md` |
| [`humanizer`](/hermes/docs/user-guide/skills/bundled/creative/creative-humanizer/) | 文章から AI らしい言い回しを取り除き、自分の声を足します。 | `creative/humanizer` |
| [`manim-video`](/hermes/docs/user-guide/skills/bundled/creative/creative-manim-video/) | Manim CE のアニメーション。3Blue1Brown 風の数学・アルゴリズム動画を作ります。 | `creative/manim-video` |
| [`p5js`](/hermes/docs/user-guide/skills/bundled/creative/creative-p5js/) | p5.js のスケッチ。ジェネラティブアート、シェーダー、対話的な作品、3D。 | `creative/p5js` |
| [`popular-web-designs`](/hermes/docs/user-guide/skills/bundled/creative/creative-popular-web-designs/) | 実在する 54 のデザインシステム（Stripe、Linear、Vercel）を HTML/CSS で再現します。 | `creative/popular-web-designs` |
| [`songwriting-and-ai-music`](/hermes/docs/user-guide/skills/bundled/creative/creative-songwriting-and-ai-music/) | 作詞作曲の作法と、Suno AI に渡す音楽プロンプト。 | `creative/songwriting-and-ai-music` |

## devops {#devops}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`sdlc-review`](/hermes/docs/user-guide/skills/bundled/devops/devops-sdlc-review/) | カンバンの受け渡しを点検し、確認できた成果を次の担当へ回します。 | `devops/sdlc-review` |

## email {#email}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`email-inbox-triage`](/hermes/docs/user-guide/skills/bundled/email/email-email-inbox-triage/) | 受信箱を仕分けします。スレッドに優先順位を付け、返信案を安全に下書きします。 | `email/email-inbox-triage` |
| [`himalaya`](/hermes/docs/user-guide/skills/bundled/email/email-himalaya/) | Himalaya CLI。IMAP／SMTP のメールを端末から扱います。 | `email/himalaya` |

## media {#media}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`gif-search`](/hermes/docs/user-guide/skills/bundled/media/media-gif-search/) | curl と jq で Tenor の GIF を検索・ダウンロードします。 | `media/gif-search` |
| [`songsee`](/hermes/docs/user-guide/skills/bundled/media/media-songsee/) | 音声のスペクトログラムや特徴量（メル、クロマ、MFCC）を CLI で求めます。 | `media/songsee` |
| [`youtube-content`](/hermes/docs/user-guide/skills/bundled/media/media-youtube-content/) | YouTube の文字起こしを、要約・スレッド・ブログ記事に変えます。 | `media/youtube-content` |

## note-taking {#note-taking}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`obsidian`](/hermes/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian/) | Obsidian の保管庫にあるノートを読み、検索し、作成し、編集します。 | `note-taking/obsidian` |

## productivity {#productivity}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`airtable`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-airtable/) | curl 経由の Airtable REST API。レコードの作成・取得・更新・削除、絞り込み、upsert。 | `productivity/airtable` |
| [`box`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-box/) | Box でクラウド上のファイル、共有、検索、メタデータを扱います。 | `productivity/box` |
| [`document-to-action-items`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-document-to-action-items/) | 文書から、出典付きで義務・期限・作業を取り出します。 | `productivity/document-to-action-items` |
| [`docx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-docx/) | Word の .docx ファイルを作成・閲覧・編集し、ひな形化やレビューをします。 | `productivity/docx` |
| [`google-workspace`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-google-workspace/) | gws CLI か Python で Gmail、カレンダー、ドライブ、ドキュメント、スプレッドシートを扱います。 | `productivity/google-workspace` |
| [`maps`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-maps/) | OpenStreetMap／OSRM で住所変換、地点検索、経路、タイムゾーンを調べます。 | `productivity/maps` |
| [`meeting-action-items`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-meeting-action-items/) | 議事メモを、出典付きの決定事項・担当者・チケットに変えます。 | `productivity/meeting-action-items` |
| [`notion`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-notion/) | Notion API と ntn CLI。ページ、データベース、マークダウン、Workers。 | `productivity/notion` |
| [`pdf`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-pdf/) | PDF ファイルの作成、閲覧、結合、入力、OCR、文字の編集。 | `productivity/pdf` |
| [`powerpoint`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-powerpoint/) | python-pptx で .pptx のスライドを作成・閲覧・編集します。 | `productivity/powerpoint` |
| [`product-price-monitor`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-product-price-monitor/) | 商品・航空券・出品の価格を見張り、目標額になったら知らせます。 | `productivity/product-price-monitor` |
| [`teams-meeting-pipeline`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-teams-meeting-pipeline/) | Teams 会議の要約、ジョブの再実行、Graph のサブスクリプション。 | `productivity/teams-meeting-pipeline` |
| [`weekly-review-planning`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-weekly-review-planning/) | 週次の棚卸し。約束したこと、止まっている作業、来週の計画。 | `productivity/weekly-review-planning` |
| [`xlsx`](/hermes/docs/user-guide/skills/bundled/productivity/productivity-xlsx/) | Excel の .xlsx ブックや CSV を作成・閲覧・編集します。 | `productivity/xlsx` |

## research {#research}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`arxiv`](/hermes/docs/user-guide/skills/bundled/research/research-arxiv/) | arXiv の論文を、キーワード・著者・分野・ID で検索します。 | `research/arxiv` |
| [`competitor-news-monitor`](/hermes/docs/user-guide/skills/bundled/research/research-competitor-news-monitor/) | 指定した企業の重要なニュースを見張り、出典付きのまとめを作ります。 | `research/competitor-news-monitor` |
| [`grounded-citations`](/hermes/docs/user-guide/skills/bundled/research/research-grounded-citations/) | 回答や文書を、引用できて確かめられる出典に結び付けます。 | `research/grounded-citations` |
| [`llm-wiki`](/hermes/docs/user-guide/skills/bundled/research/research-llm-wiki/) | Karpathy の LLM Wiki。相互リンクしたマークダウンの知識ベースを作って引きます。 | `research/llm-wiki` |

## social-media {#social-media}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`xurl`](/hermes/docs/user-guide/skills/bundled/social-media/social-media-xurl/) | xurl CLI で X（Twitter）を扱います。生の投稿検索、投稿、DM、メディア。 | `social-media/xurl` |

## software-development {#software-development}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`codebase-inspection`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-codebase-inspection/) | pygount でコードベースを調べます。行数、使用言語、その比率。 | `software-development/codebase-inspection` |
| [`dogfood`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-dogfood/) | Web アプリを手探りで検証します。不具合を見つけ、証拠を残し、報告します。 | `software-development/dogfood` |
| [`github`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-github/) | gh CLI で GitHub を扱います。PR、issue、レビュー、リポジトリ、認証。 | `software-development/github` |
| [`hermes-agent-skill-authoring`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-hermes-agent-skill-authoring/) | リポジトリ内の SKILL.md を書きます。frontmatter と構成の作法。 | `software-development/hermes-agent-skill-authoring` |
| [`inspecting-hermes-desktop-dom`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-inspecting-hermes-desktop-dom/) | CDP 経由で、動いている Hermes デスクトップの DOM／CSS を読みます。 | `software-development/inspecting-hermes-desktop-dom` |
| [`node-inspect-debugger`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-node-inspect-debugger/) | --inspect と Chrome DevTools Protocol の CLI で Node.js をデバッグします。 | `software-development/node-inspect-debugger` |
| [`python-debugpy`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-python-debugpy/) | Python のデバッグ。pdb の対話環境と debugpy のリモート接続（DAP）。 | `software-development/python-debugpy` |
| [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/) | コミット前のレビュー。安全性の走査、品質の関門、自動修正。 | `software-development/requesting-code-review` |
| [`simplify-code`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-simplify-code/) | 直近のコード変更を、4 つのエージェントが並行して整理します。 | `software-development/simplify-code` |
| [`spike`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-spike/) | 作り込む前に思い付きを確かめる、使い捨ての実験。 | `software-development/spike` |
| [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/) | 4 段階で原因を突き止めるデバッグ。直す前に不具合を理解します。 | `software-development/systematic-debugging` |
| [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/) | TDD。RED-GREEN-REFACTOR を守らせ、コードより先にテストを書きます。 | `software-development/test-driven-development` |

## web {#web}

| Skill | 説明 | パス |
|-------|-------------|------|
| [`blocked-page-recovery`](/hermes/docs/user-guide/skills/bundled/web/web-blocked-page-recovery/) | 取得に失敗したときに使います。403／429、有料の壁、WAF、ボット判定。 | `web/blocked-page-recovery` |
