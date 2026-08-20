---
title: "動画生成プロバイダプラグイン"
description: "Hermes Agent 向けの動画生成バックエンドプラグインを作る方法"
upstream_path: developer-guide/video-gen-provider-plugin.md
upstream_blob: 4301b6bd261ea5ed17734e48e6ce88f58216cf0b
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/video-gen-provider-plugin
---

# 動画生成プロバイダプラグインを作る {#building-a-video-generation-provider-plugin}

動画生成プロバイダプラグインは、`video_generate` ツールの呼び出しをすべて引き受けるバックエンドを登録します。組み込みのプロバイダ（xAI、FAL、DeepInfra）もプラグインとして同梱されています。新しいものを足したい場合も、同梱のものを差し替えたい場合も、`plugins/video_gen/<name>/` にディレクトリを 1 つ置くだけです。

:::tip
動画生成は [画像生成プロバイダプラグイン](/hermes/docs/developer-guide/image-gen-provider-plugin/) とほぼ 1 行ずつ対応した作りになっています。画像生成のバックエンドを作ったことがあるなら、形はもう分かっているはずです。違うのは主に 2 点で、対応するモダリティ・アスペクト比・尺を伝える `capabilities()` メソッドがあることと、振り分けの決まりごと（`image_url` を渡せば画像から動画、渡さなければテキストから動画。どちらのエンドポイントを使うかはプロバイダが内部で選びます）があることです。
:::

## 1 つのツールで 2 つのモダリティを扱う {#the-unified-surface-one-tool-two-modalities}

`video_generate` ツールは、パラメータ 1 つで 2 つのモダリティを使い分けます。

- **テキストから動画** — `prompt` だけを指定して呼び出します。プロバイダはテキストから動画を作るエンドポイントへ振り分けます。
- **画像から動画** — `prompt` と `image_url` を指定して呼び出します。プロバイダは画像から動画を作るエンドポイントへ振り分けます。

編集や拡張は、あえて対象外にしています。対応していないバックエンドが多く、揃わないままにするとバックエンドごとの説明文をエージェントのツール説明に書き込むはめになるからです。

## 見つけ方 {#how-discovery-works}

Hermes は動画生成のバックエンドを次の 3 か所から探します。

1. **同梱** — `<repo>/plugins/video_gen/<name>/`（`kind: backend` として自動で読み込まれます）
2. **ユーザー** — `~/.hermes/plugins/video_gen/<name>/`（`plugins.enabled` で自分から有効にします）
3. **Pip** — `hermes_agent.plugins` のエントリポイントを宣言したパッケージ

各プラグインの `register(ctx)` 関数が `ctx.register_video_gen_provider(...)` を呼びます。実際に使うプロバイダは `config.yaml` の `video_gen.provider` で決まります。`hermes tools` の Video Generation から選べば、その場で案内が出ます。`image_generate` と違って、こちらにはツリー内に残った古いバックエンドはなく、どのプロバイダもプラグインです。

## ディレクトリ構成 {#directory-structure}

```
plugins/video_gen/my-backend/
├── __init__.py      # VideoGenProvider subclass + register()
└── plugin.yaml      # Manifest with kind: backend
```

## VideoGenProvider の抽象基底クラス {#the-videogenprovider-abc}

`agent.video_gen_provider.VideoGenProvider` を継承します。必須なのは `name` プロパティと `generate()` メソッドです。

```python
# plugins/video_gen/my-backend/__init__.py
from typing import Any, Dict, List, Optional

from agent.video_gen_provider import (
    VideoGenProvider,
    error_response,
    success_response,
)

class MyVideoGenProvider(VideoGenProvider):
    @property
    def name(self) -> str:
        return "my-backend"

    @property
    def display_name(self) -> str:
        return "My Backend"

    def is_available(self) -> bool:
        return bool(os.environ.get("MY_API_KEY"))

    def list_models(self) -> List[Dict[str, Any]]:
        # Each entry is a model FAMILY — a name the user picks once.
        # Your provider's generate() routes within the family based on
        # whether image_url was passed.
        return [
            {
                "id": "fast",
                "display": "Fast",
                "speed": "~30s",
                "strengths": "Cheapest tier",
                "price": "$0.05/s",
                "modalities": ["text", "image"],  # advisory
            },
        ]

    def default_model(self) -> Optional[str]:
        return "fast"

    def capabilities(self) -> Dict[str, Any]:
        return {
            "modalities": ["text", "image"],
            "aspect_ratios": ["16:9", "9:16"],
            "resolutions": ["720p", "1080p"],
            "min_duration": 1,
            "max_duration": 10,
            "supports_audio": False,
            "supports_negative_prompt": True,
            "max_reference_images": 0,
        }

    def get_setup_schema(self) -> Dict[str, Any]:
        return {
            "name": "My Backend",
            "badge": "paid",
            "tag": "Short description shown in `hermes tools`",
            "env_vars": [
                {
                    "key": "MY_API_KEY",
                    "prompt": "My Backend API key",
                    "url": "https://mybackend.example.com/keys",
                },
            ],
        }

    def generate(
        self,
        prompt: str,
        *,
        model: Optional[str] = None,
        image_url: Optional[str] = None,
        reference_image_urls: Optional[List[str]] = None,
        duration: Optional[int] = None,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
        negative_prompt: Optional[str] = None,
        audio: Optional[bool] = None,
        seed: Optional[int] = None,
        **kwargs: Any,  # always ignore unknown kwargs for forward-compat
    ) -> Dict[str, Any]:
        # ROUTE: image_url presence picks the endpoint.
        if image_url:
            endpoint = "my-backend/image-to-video"
            modality_used = "image"
        else:
            endpoint = "my-backend/text-to-video"
            modality_used = "text"

        # ... call your API ...

        return success_response(
            video="https://your-cdn/output.mp4",
            model=model or "fast",
            prompt=prompt,
            modality=modality_used,
            aspect_ratio=aspect_ratio,
            duration=duration or 5,
            provider=self.name,
        )

def register(ctx) -> None:
    ctx.register_video_gen_provider(MyVideoGenProvider())
```

## プラグインのマニフェスト {#the-plugin-manifest}

```yaml
# plugins/video_gen/my-backend/plugin.yaml
name: my-backend
version: 1.0.0
description: "My video generation backend"
author: Your Name
kind: backend
requires_env:
  - MY_API_KEY
```

## `video_generate` のスキーマ {#the-videogenerate-schema}

このツールのスキーマは、どのバックエンドでも同じ 1 つです。対応していないパラメータは、プロバイダ側が読み飛ばします。

| パラメータ | 何をするか |
|---|---|
| `prompt` | 文章での指示（必須） |
| `image_url` | 指定すると画像から動画、省くとテキストから動画になります |
| `reference_image_urls` | 画風や登場人物の参考画像（対応はプロバイダ次第） |
| `duration` | 秒数。範囲はプロバイダが丸めます |
| `aspect_ratio` | `"16:9"`、`"9:16"`、`"1:1"` など。範囲はプロバイダが丸めます |
| `resolution` | `"480p"` / `"540p"` / `"720p"` / `"1080p"`。範囲はプロバイダが丸めます |
| `negative_prompt` | 出したくない内容（Pixverse と Kling のみ） |
| `audio` | 音声つきで生成します（Veo3 と Pixverse の該当プラン） |
| `seed` | 同じ結果を再現するための値 |
| `model` | 使用中のモデルやファミリーを上書きします |

このうちどれが実際に効くかは、プロバイダの `capabilities()` が伝えます。エージェントは使用中のバックエンドの対応内容をツール説明として受け取り、`hermes tools` でバックエンドを変えると、その説明もその場で組み直されます。

## モデルファミリーとエンドポイントの振り分け（FAL のやり方） {#model-families-and-endpoint-routing-the-fal-pattern}

FAL のように、1 つの「モデル」に複数のエンドポイントがあるバックエンド、つまりどのファミリー（Veo 3.1、Pixverse v6、Kling O3）にも `/text-to-video` と `/image-to-video` の両方の URL があるような場合は、**ファミリー**ごとにカタログの項目を 1 つ用意します。`generate()` は、`image_url` が渡されたかどうかで使うエンドポイントを選びます。

```python
FAMILIES = {
    "veo3.1": {
        "text_endpoint": "fal-ai/veo3.1",
        "image_endpoint": "fal-ai/veo3.1/image-to-video",
        # ... family-specific capability flags ...
    },
}

def generate(self, prompt, *, image_url=None, model=None, **kwargs):
    family_id, family = _resolve_family(model)
    endpoint = family["image_endpoint"] if image_url else family["text_endpoint"]
    # ... build payload from family's declared capability flags, call endpoint ...
```

利用者は `hermes tools` で `veo3.1` を一度選ぶだけです。エージェントはエンドポイントを気にすることなく、`image_url` を渡すか渡さないかだけを決めます。

## どれが優先されるか {#selection-precedence}

呼び出しごとのモデル指定は、次の順で決まります（`plugins/video_gen/fal/__init__.py` を参照してください）。

1. ツール呼び出しでの `model=` キーワード
2. 環境変数 `<PROVIDER>_VIDEO_MODEL`
3. `config.yaml` の `video_gen.<provider>.model`
4. `config.yaml` の `video_gen.model`（その値が自分の ID のどれかと一致する場合）
5. プロバイダの `default_model()`

## 返す形 {#response-shape}

`success_response()` と `error_response()` が、どのバックエンドでも共通の辞書の形を作ります。自分で辞書を組み立てず、この 2 つを使ってください。

成功時のキーは `success`、`video`（URL か絶対パス）、`model`、`prompt`、`modality`（`"text"` か `"image"`）、`aspect_ratio`、`duration`、`provider`、それに `extra` です。

エラー時のキーは `success`、`video`（None）、`error`、`error_type`、`model`、`prompt`、`aspect_ratio`、`provider` です。

## 生成物の置き場所 {#where-to-save-artifacts}

バックエンドが base64 を返す場合は、`save_b64_video()` で `$HERMES_HOME/cache/videos/` の下に書き出します。あとから HTTP で取得した生のバイト列なら `save_bytes_video()` を使います。それ以外は上流の URL をそのまま返してかまいません。リモートの URL は、受け渡しのときにゲートウェイが解決します。

## テスト {#testing}

`tests/plugins/video_gen/test_<name>_plugin.py` に軽い動作確認のテストを置きます。xAI と FAL のテストがお手本です。登録し、カタログを確かめ、`image_url` ありとなしの両方で振り分けを動かし、認証情報がないときにきちんとエラーを返すことを確認します。
