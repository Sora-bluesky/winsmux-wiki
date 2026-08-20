---
title: "機能の概要"
description: ""
upstream_path: user-guide/features/overview.md
upstream_blob: 094b29622604f2c96def3f563525182c67330d1e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/overview
---

# 機能の概要 {#features-overview}

Hermes Agent には、ただのチャットにとどまらない多彩な機能がそろっています。セッションをまたいで残る記憶、ファイルを踏まえた文脈の把握、ブラウザの自動操作、声での会話まで、これらが噛み合うことで Hermes は自分で動けるアシスタントになります。

:::tip どこから手をつけるか迷ったら
`hermes setup --portal` を実行すると、モデルの提供元に加えて Tool Gateway の4つのツール（ウェブ検索・画像生成・TTS・ブラウザ）が一度に設定されます。詳しくは [Nous Portal](/hermes/docs/integrations/nous-portal/) をご覧ください。
:::

## 中心となる機能 {#core}

- **[ツールとツールセット](/hermes/docs/user-guide/features/tools/)** — ツールはエージェントの能力を広げる関数です。用途ごとのツールセットにまとめられていて、プラットフォームごとに有効・無効を切り替えられます。ウェブ検索、ターミナルの実行、ファイル編集、記憶、委任などが含まれます。
- **[スキルの仕組み](/hermes/docs/user-guide/features/skills/)** — 必要になったときだけエージェントが読み込む知識の文書です。段階的に開示する作りでトークンの消費を抑えており、[agentskills.io](https://agentskills.io/specification) のオープン標準にも対応しています。
- **[セッションをまたぐ記憶](/hermes/docs/user-guide/features/memory/)** — 量を絞って整理された、セッションをまたいで残る記憶です。好み、進行中のプロジェクト、環境、学んだことを `MEMORY.md` と `USER.md` に書き留めておきます。
- **[コンテキストファイル](/hermes/docs/user-guide/features/context-files/)** — プロジェクトの文脈を書いたファイル（`.hermes.md`、`AGENTS.md`、`CLAUDE.md`、`SOUL.md`、`.cursorrules`）を Hermes が自動で見つけて読み込み、そのプロジェクトでの振る舞いに反映します。
- **[コンテキスト参照](/hermes/docs/user-guide/features/context-references/)** — `@` に続けて参照先を書くと、ファイル・フォルダ・git の差分・URL をそのままメッセージに差し込めます。Hermes が参照をその場で展開し、中身を自動で末尾に足します。
- **[チェックポイント](/hermes/docs/user-guide/checkpoints-and-rollback/)** — ファイルを変更する前に作業ディレクトリの状態を自動で保存します。うまくいかなかったときは `/rollback` で巻き戻せる安全網になります。

## 自動化 {#automation}

- **[定時タスク（cron）](/hermes/docs/user-guide/features/cron/)** — 普段の言葉づかい、または cron の書式でタスクを自動実行するよう予約できます。ジョブにスキルを紐づけたり、結果を好きなプラットフォームへ届けたり、一時停止・再開・編集もできます。
- **[サブエージェントへの委任](/hermes/docs/user-guide/features/delegation/)** — `delegate_task` ツールは、独立した文脈・絞り込んだツールセット・専用のターミナルセッションを持つ子エージェントを立ち上げます。既定では3つのサブエージェントを同時に走らせられます（設定で変更可能）。
- **[コードの実行](/hermes/docs/user-guide/features/code-execution/)** — `execute_code` ツールを使うと、エージェントが Hermes のツールをプログラムから呼び出す Python スクリプトを書けます。サンドボックス内の RPC 実行によって、何段階もの作業が LLM の1ターンに収まります。
- **[イベントフック](/hermes/docs/user-guide/features/hooks/)** — 節目となる場面で独自のコードを走らせます。ゲートウェイ側のフックはログ・通知・webhook を、プラグイン側のフックはツールの横取り・計測・安全策を担います。
- **[一括処理](/hermes/docs/user-guide/features/batch-processing/)** — 数百から数千のプロンプトに対して Hermes エージェントを並列で走らせ、学習データの生成や評価に使える ShareGPT 形式の軌跡データを出力します。

## メディアとウェブ {#media-web}

- **[音声モード](/hermes/docs/user-guide/features/voice-mode/)** — CLI とメッセージングのプラットフォーム全体で声のやり取りができます。マイクで話しかけ、返答を音声で聞き、Discord のボイスチャンネルではその場で会話できます。
- **[ウェイクワード](/hermes/docs/user-guide/features/wake-word/)** — CLI・TUI・デスクトップアプリで使える「Hey Hermes」の呼びかけです。端末上で動く待ち受けが合図の言葉を聞き取り、音声セッションを始めます。
- **[ブラウザの自動操作](/hermes/docs/user-guide/features/browser/)** — 複数の実行方式に対応したブラウザ自動操作です。Browserbase のクラウド、Browser Use のクラウド、CDP 経由でローカルの Chrome / Brave / Chromium / Edge、あるいはローカルの Chromium を使えます。サイトを開き、フォームを埋め、情報を取り出します。
- **[画像認識と貼り付け](/hermes/docs/user-guide/features/vision/)** — 画像も扱えるマルチモーダル対応です。クリップボードの画像を CLI に貼り付け、画像を読めるモデルで解析・説明・加工を頼めます。
- **[画像生成](/hermes/docs/user-guide/features/image-generation/)** — FAL.ai を使って文章から画像を作ります。11 のモデル（FLUX 2 Klein/Pro、GPT-Image 1.5/2、Nano Banana Pro、Ideogram V3、Recraft V4 Pro、Qwen、Z-Image Turbo、Krea V2 Medium/Large）に対応し、`hermes tools` で選べます。
- **[音声と TTS](/hermes/docs/user-guide/features/tts/)** — すべてのメッセージングのプラットフォームで、読み上げ音声の出力と音声メッセージの文字起こしができます。標準で使える提供元は Edge TTS（無料）、ElevenLabs、OpenAI TTS、MiniMax、Mistral Voxtral、Google Gemini、xAI、NeuTTS、KittenTTS、Piper の10種類で、手元の TTS コマンドを自作の提供元として登録することもできます。

## 外部サービスとの連携 {#integrations}

- **[MCP 連携](/hermes/docs/user-guide/features/mcp/)** — stdio または HTTP で任意の MCP サーバーにつながります。GitHub、データベース、ファイルシステム、社内 API のツールを、Hermes 用のツールを書かずに使えます。サーバーごとのツール絞り込みとサンプリングにも対応しています。
- **[提供元の振り分け](/hermes/docs/user-guide/features/provider-routing/)** — どの AI 提供元にリクエストを処理させるかを細かく決められます。並び順・許可リスト・拒否リスト・優先順位で、費用・速度・品質のどれを取るか調整できます。
- **[予備の提供元](/hermes/docs/user-guide/features/fallback-providers/)** — 主に使う LLM でエラーが起きたとき、自動で予備の提供元に切り替えます。画像認識や圧縮といった補助的な処理にも、独立した予備を設定できます。
- **[認証情報のプール](/hermes/docs/user-guide/features/credential-pools/)** — 同じ提供元の複数のキーに API 呼び出しを分散させます。レート制限や失敗が起きたときは自動で切り替わります。
- **[プロンプトキャッシュ](/hermes/docs/user-guide/configuration/#prompt-caching)** — Anthropic 直結、OpenRouter、Nous Portal 上の Claude に対して、セッションをまたぐ1時間の前方一致キャッシュが組み込まれています。常に有効で、設定は要りません。
- **[記憶の提供元](/hermes/docs/user-guide/features/memory-providers/)** — 外部の記憶の仕組み（Honcho、OpenViking、Mem0、Hindsight、Holographic、RetainDB、ByteRover、Supermemory）を差し込めます。組み込みの記憶を超えて、セッションをまたいだ利用者像の把握や個別最適ができます。
- **[API サーバー](/hermes/docs/user-guide/features/api-server/)** — Hermes を OpenAI 互換の HTTP エンドポイントとして公開します。OpenAI の形式を話せるフロントエンドなら何でもつながります。Open WebUI、LobeChat、LibreChat などです。
- **[エディタ連携（ACP）](/hermes/docs/user-guide/features/acp/)** — VS Code、Zed、JetBrains など ACP に対応したエディタの中で Hermes を使えます。会話、ツールの動き、ファイルの差分、ターミナルのコマンドがエディタ内に表示されます。
- **[一括処理](/hermes/docs/user-guide/features/batch-processing/)** — CLI から多数のプロンプトやタスクに対してエージェントを並列で走らせます。出力は構造化され、軌跡も記録されるので、評価や学習用のパイプラインにそのまま使えます。

## 自分好みの調整 {#customization}

- **[人格と SOUL.md](/hermes/docs/user-guide/features/personality/)** — エージェントの人格を自由に作り込めます。`SOUL.md` は人格を決める中心のファイルで、システムプロンプトの先頭に置かれます。セッションごとに `/personality` で組み込みの設定や自作の設定へ切り替えられます。
- **[スキンとテーマ](/hermes/docs/user-guide/features/skins/)** — CLI の見た目を変えられます。バナーの色、待機中の表情と動詞、応答枠のラベル、ブランド表記、ツールの動作表示の頭につく記号などです。
- **[プラグイン](/hermes/docs/user-guide/features/plugins/)** — 本体のコードに手を入れずに、独自のツール・フック・連携を追加できます。種類は3つで、一般のプラグイン（ツールとフック）、記憶の提供元（セッションをまたぐ知識）、コンテキストエンジン（別方式の文脈管理）です。管理は `hermes plugins` の対話画面にまとまっています。
