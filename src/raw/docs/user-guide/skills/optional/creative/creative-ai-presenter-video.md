---
title: "Ai Presenter Video — 台本と画像から、検証済みの AI プレゼンター動画を作る"
description: "台本と画像から、検証済みの AI プレゼンター動画を作る"
upstream_path: user-guide/skills/optional/creative/creative-ai-presenter-video.md
upstream_blob: 935559cec6819d82ec399de9251b94ccebeebd5c
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-ai-presenter-video
---

# Ai Presenter Video {#ai-presenter-video}

台本と画像から、検証済みの AI プレゼンター動画を作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/creative/ai-presenter-video` で導入します |
| パス | `optional-skills/creative/ai-presenter-video` |
| バージョン | `1.0.0` |
| 作者 | cclank (https://github.com/cclank/lanshu-create-ai-presenter-video)、Hermes Agent が移植 |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `video`, `presenter`, `avatar`, `lipsync`, `tts`, `captions`, `creative` |
| 関連 skill | [`hyperframes`](/hermes/docs/user-guide/skills/optional/creative/creative-hyperframes/), [`kanban-video-orchestrator`](/hermes/docs/user-guide/skills/optional/creative/creative-kanban-video-orchestrator/), [`comfyui`](/hermes/docs/user-guide/skills/optional/creative/creative-comfyui/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# AI Presenter Video {#ai-presenter-video}

テーマ（または完成した台本）と、使用許諾のある成人プレゼンターの画像 1 枚から、
そのまま公開できるプレゼンター主導の動画を仕上げます。確定したナレーション、
リップシンクの品質確認つきのアバター生成、字幕、決定的な編集、ラウドネスを
正規化したマスター版と共有版のエンコード、機械と目視による受け入れレポートまでを含みます。

この skill は、新しいプレゼンター動画を作るときにも、既存のプレゼンター動画ジョブを
続ける・修正する・字幕を付ける・リップシンクを直す・書き出し直すときにも使います。
ワークフローは特定のプロバイダーに依存しません。生成に使う機能は、そのセッションで
実際に使えるものから選びます（`image_generate` と動画生成プラグイン経由の FAL の動画・画像モデル、
`text_to_speech` による TTS、whisper/STT ツールによる音声認識、決定的な処理はすべて ffmpeg）。

> cclank/lanshu-create-ai-presenter-video（MIT）からの移植です。上流の本文は
> 実質そのまま `references/` に残し、Hermes 向けの調整は
> このハブファイルに置いています。スクリプトは決定的です（ネットワークも認証情報も使いません）。

## Hermes 向けの調整（最初に読む） {#hermes-adaptations-read-first}

- **skill ディレクトリの解決** — 上流では、自分のエージェントの skills パスを直書きしていました。
  Hermes ではローダーが `${HERMES_SKILL_DIR}` をこの skill の導入先
  ディレクトリに展開するので、以下のコマンドはすべてこのトークンをそのまま使います。

  ```bash
  SKILL_DIR="${HERMES_SKILL_DIR}"
  ```

  シェル変数はツール呼び出しをまたいで残りません。使うターミナル呼び出しのたびに、
  この代入（または展開済みのパス）を貼り直してください。
- **機能の対応づけ** — references に「音声生成の機能」とあれば、
  `text_to_speech`（ユーザー設定に応じて OpenAI/Edge/ElevenLabs）を使います。
  「プレゼンター/アバター生成」は、設定済みの動画ツール経由の FAL image-to-video 系
  （Kling、Wan、MiniMax H3 など）か、ユーザーが使えるアバター/リップシンクの
  エンドポイントです。「単語タイムスタンプつき ASR」は STT ツール経由の whisper か、
  venv に入れた `faster-whisper` です。「決定的なコンポジター」は ffmpeg の
  フィルターグラフか、導入済みなら `hyperframes` skill です（編集の
  references にある HyperFrames の節がそのまま対応します）。
- **目視の品質確認** — 「通常速度での目視確認」の手順は、
  生成したコンタクトシートと抜き出したフレームを `vision_analyze` で見て行います
  （同一人物か、口の動きのタイミング、手、まばたき、つながり）。数値の確認は
  スクリプトが出す ffprobe の結果で行います。
- **有料生成の同意** — リモートでのアバター生成や TTS 生成は課金されます。
  上流の運用ルールに従い、最初の有料呼び出しの前に、アップロードする素材、
  依頼する秒数、わかっている費用、試作の規模、再試行の上限を伝え、
  ユーザーの明確な了承を得てください。`job.json` の `remote_upload_approved` が
  true になるまで、プレゼンター画像をリモートのプロバイダーにアップロードしてはいけません。
- **同意フラグは `input` の下にある** — `rights_confirmed`、
  `adult_presenter_confirmed`、`remote_upload_approved`、
  `voice_clone_approved` は `job.json` の `input` オブジェクトの中にあります（init の
  フラグで設定されます。手で編集するときは、ジョブのルートではなく `input.*` を対象にします）。
  `manual_input_review.*` はルートにあります。`preflight.py` は、
  `errors`（すべてを止める）と `remote_blockers`（リモート生成だけを止める）を区別します。
  リモートが止められていても、ローカルの台本や音声の作業は進めてかまいません。

## ワークフロー {#workflow}

1. **ジョブを始めるか、再開します。** 新しいジョブの場合:

   ```bash
   python3 "$SKILL_DIR/scripts/init_job.py" \
     --job-dir ~/Videos/my-presenter-video \
     --presenter-image /path/to/presenter.png \
     --topic "explain context engineering in one minute" \
     --duration 60 --aspect 9:16 \
     --rights-confirmed --adult-presenter-confirmed
   ```

   既存の台本ファイルを使うときは `--script` を指定します。ほかのフラグは `--voice-sample`、
   `--supporting-media`、`--width`、`--height`、`--fps`、`--watermark`、
   `--cta` です。既存のジョブでは、`job.json` と品質確認のレポートを読み、
   終わっていない最も早い状態から再開します。受け入れ済みの成果物は決して作り直しません。

2. **入力を人の目で確認します。** プレゼンター画像を実際に見て
   （`vision_analyze`）、音声サンプルがあれば聞きます。わかったことは
   `job.json` の `manual_input_review` の真偽値に記録します。たとえば次のとおりです。

   ```bash
   python3 - <<'PY'
   import json
   p = "~/Videos/my-presenter-video/job.json"  # expand ~ or use an absolute path
   import os; p = os.path.expanduser(p)
   j = json.load(open(p))
   j["manual_input_review"].update(image_viewed=True, single_clear_face=True,
                                   image_has_no_unwanted_text=True)
   json.dump(j, open(p, "w"), indent=2)
   PY
   ```

   続けて、関門を通します。

   ```bash
   python3 "$SKILL_DIR/scripts/preflight.py" ~/Videos/my-presenter-video/job.json
   ```

   `ok: true` のときだけ先に進み、リモート生成は
   `remote_ready: true` のときだけ行います。注意: preflight は `job.json` もその場で書き換えます
   （レポートのパスを記録します）。実行したら、古いコピーを編集せずに
   読み直してください。

3. **内容と音声を確定します** — `references/generation.md` を読みます。台本 →
   `text_to_speech` でナレーション全体を作る → ASR でナレーションを
   台本と照合する → 実際の長さを記録する、の順です。確定した音声が、以降のすべての基準となる時計になります。

4. **プレゼンターを計画し、生成します** — `references/generation.md` を読みます。
   まず短く安い試作を作り、同一人物かどうかと口の動きのタイミングの確認に
   試作が通ってから本番を回します。

5. **編集します** — `references/editing.md` を読みます。確定した音声に合わせた
   決定的なタイムラインで組みます。字幕とキーワードの強調表示は、音声と映像素材が
   確定してから入れます。

6. **検証して納品します** — `references/qa-recovery.md` を読み、レンダリングしてから次を実行します。

   ```bash
   bash "$SKILL_DIR/scripts/finalize_delivery.sh" \
     ~/Videos/my-presenter-video/renders/rendered.mp4 \
     ~/Videos/my-presenter-video/outputs my-video
   ```

   この仕上げスクリプトは、縦横比を保ったまま 2 パスのラウドネス正規化
   （番組全体で約 −16 LUFS）を行い、マスター版と共有版をエンコードし、両方がデコードできるかを確かめ、
   納品レポートの JSON を書き出し、9 コマのコンタクトシートを出力します。
   完成と言う前に、コンタクトシートを `vision_analyze` で確認してください。

## 運用ルール（譲れないもの） {#operating-rules-non-negotiable}

- 画像の権利、成人であること、リモートへのアップロードの承認、
  声のクローンの許可は、それぞれ該当するリモート操作の前に確認します。
- 画像から実在の人物の声を推測したり、クローンしたりしません。許可を得た
  サンプルか、既製の TTS 音声を使います。
- プレゼンターの生成、字幕のタイミング、最終的なシーンの区切りより前に、
  ナレーション全体を確定させます。
- 最終的な合成では動画素材の音を消します。音を持つのは、承認済みのナレーションと
  意図して入れたミックス用のトラックだけです。
- プロバイダーへのリクエスト本文とタスク ID を保存します（認証情報と期限つきの
  URL は除きます）。中断した作業は、送り直す前に状態を問い合わせます。二重課金を避けるためです。
- 有料の候補が 3 回却下されたら止め、失敗の傾向をまとめます。
- 最終ファイルが最後までデコードでき、コンタクトシートか通しの再生を
  確認するまでは、完成と言いません。

## 最小限の入力のときの既定値 {#defaults-for-minimal-input}

9:16、1080×1920、30fps。テーマから作る動画は 45〜75 秒を目安にします。許可を得た
サンプルがなければ既製の音声を使います。構成はプレゼンター主導で、つかみ → 2〜4 個の要点 → 締めです。
音楽や CTA は頼まれない限り入れません。言語は依頼から判断します。

## references の案内 {#reference-routing}

- `references/generation.md` — 受け付け、内容、声、使う機能の選び方、
  プレゼンターのプロンプト、有料生成、プロバイダーの変更。
- `references/editing.md` — タイムラインの取り決め、冒頭と締め、字幕、
  キーワード強調表示のプリセット、HyperFrames での合成、書き出し。
- `references/qa-recovery.md` — 技術的な受け入れ、目視での受け入れ、そして
  リップシンク・同一人物・手・露出・フリーズ・字幕・音声の不具合からの立て直し。

## 落とし穴 {#pitfalls}

- `preflight.py` には ffprobe が必要です。何も入っていない環境では先に ffmpeg を入れてください。
- init のフラグで設定される同意の真偽値は `input.*` の下に入ります。これを
  job-json のルートで編集しても何も起きず、エラーも出ません（preflight は止めたままです）。
- `finalize_delivery.sh` には bash と jq と awk、そして最後までデコードできる入力が必要です。
  途中で切れたレンダリングがデコード確認で落ちるのは、偶然ではなく意図した設計です。
- 長いアバター映像はずれていきます。章ごとに何本も生成し直すより、ひと続きの
  プレゼンター素材を 1 本作って音声のタイムラインに沿って切り分けるほうを選びます
  （生成し直すたびに別人のように変わっていくことが、目視の品質確認で最も多い失敗です）。
- FAL の i2v エンドポイントには長さの上限があります（多くは 5〜15 秒）。それに合わせて
  章単位のプレゼンター区間を計画し、エンドポイントが対応していれば、一貫性のために
  試作の seed とパラメーターを使い回します。

## 検証 {#verification}

実際に動かして確認済みです（2026 年 8 月）。`init_job.py` → 状態遷移の正しい `job.json` が
できました。`preflight.py` は未確認の入力で正しく止まり、確認の真偽値を立てると
`ok: true` に切り替わり、`input.remote_upload_approved` が立つまで
`remote_ready: false` を保ちました。`finalize_delivery.sh` は合成で作った 5 秒の
1080×1920 のレンダリングから、デコード確認済みのマスター版（631kbit/s）と共有版、
納品レポートの JSON、9 コマのコンタクトシートを出力し、終了コードは 0 でした。
