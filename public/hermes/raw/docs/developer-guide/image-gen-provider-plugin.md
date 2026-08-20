---
title: "画像生成プロバイダプラグイン"
description: "Hermes Agent 用の画像生成バックエンドプラグインの作り方"
upstream_path: developer-guide/image-gen-provider-plugin.md
upstream_blob: 44b509029511de1a34bdb0a5abf280a87ec8bb14
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/image-gen-provider-plugin
---

# 画像生成プロバイダプラグインを作る {#building-an-image-generation-provider-plugin}

画像生成プロバイダプラグインは、`image_generate` ツールの呼び出しをすべて引き受けるバックエンドを登録します。DALL·E、gpt-image、Grok、Flux、Imagen、Stable Diffusion、fal、Replicate、手元の ComfyUI 環境など、何でもかまいません。組み込みのプロバイダ（OpenAI、OpenAI-Codex、xAI、FAL、Krea、DeepInfra、OpenRouter）もすべてプラグインとして同梱されています。`plugins/image_gen/<name>/` にディレクトリを置くだけで、新しいものを足すことも、同梱のものを差し替えることもできます。

:::tip
画像生成は、Hermes が対応している **バックエンドプラグイン** のひとつです。ほかには（より専用の抽象基底クラスを持つ）[メモリプロバイダプラグイン](/hermes/docs/developer-guide/memory-provider-plugin/)、[コンテキストエンジンプラグイン](/hermes/docs/developer-guide/context-engine-plugin/)、[モデルプロバイダプラグイン](/hermes/docs/developer-guide/model-provider-plugin/) があります。汎用のツール・フック・CLI のプラグインについては [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) を参照してください。
:::

## 探索のしくみ {#how-discovery-works}

Hermes は画像生成のバックエンドを次の 3 か所から探します。

1. **同梱** — `<repo>/plugins/image_gen/<name>/`（`kind: backend` として自動で読み込まれ、常に使えます）
2. **利用者** — `~/.hermes/plugins/image_gen/<name>/`（`plugins.enabled` に加えて有効にします）
3. **pip** — `hermes_agent.plugins` エントリポイントを宣言したパッケージ

各プラグインの `register(ctx)` 関数が `ctx.register_image_gen_provider(...)` を呼ぶと、`agent/image_gen_registry.py` のレジストリに登録されます。実際に使うプロバイダは `config.yaml` の `image_gen.provider` で決まり、`hermes tools` が選び方を案内してくれます。

`image_generate` ツールの受け口はレジストリに現在のプロバイダを尋ね、そこへ処理を回します。プロバイダが 1 つも登録されていなければ、ツールは `hermes tools` を案内する分かりやすいエラーを返します。

## ディレクトリ構成 {#directory-structure}

```
plugins/image_gen/my-backend/
├── __init__.py      # ImageGenProvider subclass + register()
└── plugin.yaml      # Manifest with kind: backend
```

同梱のプラグインならこれで完成です。`~/.hermes/plugins/image_gen/<name>/` に置く利用者のプラグインは、`config.yaml` の `plugins.enabled` に加える（または `hermes plugins enable <name>` を実行する）必要があります。

## ImageGenProvider 抽象基底クラス {#the-imagegenprovider-abc}

`agent.image_gen_provider.ImageGenProvider` を継承します。必須なのは `name` プロパティと `generate()` メソッドだけで、ほかは妥当な既定の動きが用意されています。

```python
# plugins/image_gen/my-backend/__init__.py
from typing import Any, Dict, List, Optional

from agent.image_gen_provider import (
    DEFAULT_ASPECT_RATIO,
    ImageGenProvider,
    error_response,
    normalize_reference_images,
    resolve_aspect_ratio,
    save_b64_image,
    success_response,
)

class MyBackendImageGenProvider(ImageGenProvider):
    @property
    def name(self) -> str:
        # Stable id used in image_gen.provider config. Lowercase, no spaces.
        return "my-backend"

    @property
    def display_name(self) -> str:
        # Human label shown in `hermes tools`. Defaults to name.title() if omitted.
        return "My Backend"

    def is_available(self) -> bool:
        # Return False if credentials or deps are missing.
        # The tool's availability gate calls this before dispatch.
        if not os.environ.get("MY_BACKEND_API_KEY"):
            return False
        try:
            import my_backend_sdk  # noqa: F401
        except ImportError:
            return False
        return True

    def list_models(self) -> List[Dict[str, Any]]:
        # Catalog shown in `hermes tools` model picker.
        return [
            {
                "id": "my-model-fast",
                "display": "My Model (Fast)",
                "speed": "~5s",
                "strengths": "Quick iteration",
                "price": "$0.01/image",
            },
            {
                "id": "my-model-hq",
                "display": "My Model (HQ)",
                "speed": "~30s",
                "strengths": "Highest fidelity",
                "price": "$0.04/image",
            },
        ]

    def default_model(self) -> Optional[str]:
        return "my-model-fast"

    def get_setup_schema(self) -> Dict[str, Any]:
        # Metadata for the `hermes tools` picker — keys to prompt for at setup.
        return {
            "name": "My Backend",
            "badge": "paid",        # optional; shown as a short tag in the picker
            "tag": "One-line description shown under the name",
            "env_vars": [
                {
                    "key": "MY_BACKEND_API_KEY",
                    "prompt": "My Backend API key",
                    "url": "https://my-backend.example.com/api-keys",
                },
            ],
        }

    def capabilities(self) -> Dict[str, Any]:
        # Declare whether this backend supports image-to-image / editing.
        # The tool layer surfaces this in the dynamic schema so the model
        # knows when `image_url` is honored. Default (if you omit this) is
        # text-only: {"modalities": ["text"], "max_reference_images": 0}.
        return {"modalities": ["text", "image"], "max_reference_images": 4}

    def generate(
        self,
        prompt: str,
        aspect_ratio: str = DEFAULT_ASPECT_RATIO,
        *,
        image_url: Optional[str] = None,
        reference_image_urls: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        prompt = (prompt or "").strip()
        aspect_ratio = resolve_aspect_ratio(aspect_ratio)

        if not prompt:
            return error_response(
                error="Prompt is required",
                error_type="invalid_input",
                provider=self.name,
                prompt="",
                aspect_ratio=aspect_ratio,
            )

        # Routing: if image_url (or reference_image_urls) is set, the call is
        # an image-to-image / edit request; otherwise text-to-image. Report
        # which path you took via the `modality` field of success_response.
        sources = []
        if image_url:
            sources.append(image_url)
        sources.extend(normalize_reference_images(reference_image_urls) or [])
        modality = "image" if sources else "text"

        # Model selection precedence: env var → config → default. The helper
        # _resolve_model() in the built-in openai plugin is a good reference.
        model_id = kwargs.get("model") or self.default_model() or "my-model-fast"

        try:
            import my_backend_sdk
            client = my_backend_sdk.Client(api_key=os.environ["MY_BACKEND_API_KEY"])
            if modality == "image":
                result = client.edit(
                    prompt=prompt,
                    model=model_id,
                    image_urls=sources,
                )
            else:
                result = client.generate(
                    prompt=prompt,
                    model=model_id,
                    aspect_ratio=aspect_ratio,
                )

            # Two shapes supported:
            #   - URL string: return it as `image`
            #   - base64 data: save under $HERMES_HOME/cache/images/ via save_b64_image()
            if result.get("image_b64"):
                path = save_b64_image(
                    result["image_b64"],
                    prefix=self.name,
                    extension="png",
                )
                image = str(path)
            else:
                image = result["image_url"]

            return success_response(
                image=image,
                model=model_id,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                provider=self.name,
                modality=modality,
            )
        except Exception as exc:
            return error_response(
                error=str(exc),
                error_type=type(exc).__name__,
                provider=self.name,
                model=model_id,
                prompt=prompt,
                aspect_ratio=aspect_ratio,
            )

def register(ctx) -> None:
    """Plugin entry point — called once at load time."""
    ctx.register_image_gen_provider(MyBackendImageGenProvider())
```

## plugin.yaml {#pluginyaml}

```yaml
name: my-backend
version: 1.0.0
description: My image backend — text-to-image via My Backend SDK
author: Your Name
kind: backend
requires_env:
  - MY_BACKEND_API_KEY
```

プラグインを画像生成の登録経路へ振り分ける目印が `kind: backend` です。`requires_env` は `hermes plugins install` の途中で入力を求められます。

## 抽象基底クラスの一覧 {#abc-reference}

完全な取り決めは `agent/image_gen_provider.py` にあります。よく上書きするメソッドは次のとおりです。

| 要素 | 必須 | 既定 | 用途 |
|---|---|---|---|
| `name` | ✅ | — | `image_gen.provider` の設定で使う固定の id |
| `display_name` | — | `name.title()` | `hermes tools` に出す表示名 |
| `is_available()` | — | `True` | 認証情報や依存が足りないときの門番 |
| `list_models()` | — | `[]` | `hermes tools` のモデル選択画面に出すカタログ |
| `default_model()` | — | `list_models()` の先頭 | モデルが設定されていないときの受け皿 |
| `get_setup_schema()` | — | 最小限 | 選択画面向けの情報と、環境変数の入力案内 |
| `generate(prompt, aspect_ratio, **kwargs)` | ✅ | — | 呼び出しの本体 |

## 返す値の形 {#response-format}

`generate()` は `success_response()` か `error_response()` で組み立てた辞書を返さなければなりません。どちらも `agent/image_gen_provider.py` にあります。

**成功:**
```python
success_response(
    image=<url-or-absolute-path>,
    model=<model-id>,
    prompt=<echoed-prompt>,
    aspect_ratio="landscape" | "square" | "portrait",
    provider=<your-provider-name>,
    extra={...},  # optional backend-specific fields
)
```

**失敗:**
```python
error_response(
    error="human-readable message",
    error_type="provider_error" | "invalid_input" | "<exception class name>",
    provider=<your-provider-name>,
    model=<model-id>,
    prompt=<prompt>,
    aspect_ratio=<resolved aspect>,
)
```

ツールの受け口はこの辞書を JSON にして LLM へ渡します。エラーもツールの実行結果としてそのまま伝わり、それをどう説明するかは LLM が判断します。

## base64 と URL、どちらの出力にも対応する {#handling-base64-vs-url-output}

画像の URL を返すバックエンド（fal、Replicate）もあれば、base64 のデータを返すバックエンド（OpenAI の gpt-image-2）もあります。base64 の場合は `save_b64_image()` を使ってください。`$HERMES_HOME/cache/images/<prefix>_<timestamp>_<uuid>.<ext>` に書き出し、絶対パスの `Path` を返します。それを `str` にして `success_response()` の `image=` に渡します。ゲートウェイ側の配信（Telegram の写真吹き出し、Discord の添付）は URL と絶対パスのどちらも認識します。

## 利用者による上書き {#user-overrides}

同梱のものと同じ `name` プロパティを持つ利用者のプラグインを `~/.hermes/plugins/image_gen/<name>/` に置き、`hermes plugins enable <name>` で有効にしてください。レジストリは後から書いたほうが勝つので、自分の実装が組み込みを置き換えます。`openai` のプラグインを自前のプロキシに向けたいときや、独自のモデルカタログに差し替えたいときに便利です。

## テスト {#testing}

```bash
export HERMES_HOME=/tmp/hermes-imggen-test
mkdir -p $HERMES_HOME/plugins/image_gen/my-backend
# …copy __init__.py + plugin.yaml into that dir…

export MY_BACKEND_API_KEY=your-test-key
hermes plugins enable my-backend

# Pick it as the active provider
echo "image_gen:" >> $HERMES_HOME/config.yaml
echo "  provider: my-backend" >> $HERMES_HOME/config.yaml

# Exercise it
hermes -z "Generate an image of a corgi in a spacesuit"
```

対話的に行うなら、`hermes tools` →「Image Generation」→ `my-backend` を選ぶ → 求められたら API キーを入力、という流れです。

## 実装の参考 {#reference-implementations}

- **`plugins/image_gen/openai/__init__.py`** — gpt-image-2 を low／medium／high の 3 段階として、1 つの API モデルに `quality` の値だけ変えた 3 つの仮想モデル ID を割り当てています。1 つのバックエンドで段階の異なるモデルを扱う例、そして config.yaml の優先順位の連鎖の例として良い題材です。
- **`plugins/image_gen/xai/__init__.py`** — xAI 経由の Grok Imagine。形がだいぶ違います（URL を返し、カタログもより単純）。
- **`plugins/image_gen/openai-codex/__init__.py`** — Codex 形式の Responses API 版で、OpenAI SDK をそのまま使い、振り分け先のベース URL だけを変えています。

## pip で配布する {#distribute-via-pip}

```toml
# pyproject.toml
[project.entry-points."hermes_agent.plugins"]
my-backend-imggen = "my_backend_imggen_package"
```

`my_backend_imggen_package` はトップレベルに `register` 関数を公開する必要があります。設定全体については、汎用のプラグインの説明にある [pip で配布する](/hermes/docs/developer-guide/plugins/#distribute-via-pip) を参照してください。

## 関連ページ {#related-pages}

- [画像生成](/hermes/docs/user-guide/features/image-generation/) — 利用者向けの機能の説明
- [プラグインの概要](/hermes/docs/user-guide/features/plugins/) — プラグインの種類がひととおり分かります
- [Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/) — 汎用のツール・フック・スラッシュコマンドの説明
