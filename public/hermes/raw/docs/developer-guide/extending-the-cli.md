---
title: "CLI を拡張する"
description: "Hermes の TUI に独自のウィジェット・キーバインド・レイアウト変更を足すラッパー CLI を作る"
upstream_path: developer-guide/extending-the-cli.md
upstream_blob: c1a2cafd3039cf5bf189665c07b8ec231951c9a7
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/extending-the-cli
---

# CLI を拡張する {#extending-the-cli}

Hermes は `HermesCLI` に保護された拡張フックを用意しています。おかげでラッパー CLI 側は、`run()` メソッドや `hermes_cli/cli_tui_mixin.py` の中の TUI 組み立て処理を上書きしなくても、ウィジェット・キーバインド・レイアウトの調整を足せます (フックはこのファイルで定義されていて、`cli.py` の `HermesCLI` がそれを取り込んでいます)。この作りなら、内部の変更に拡張が引きずられません。

## 拡張のポイント {#extension-points}

使える拡張の継ぎ目は 5 つあります。

| フック | 用途 | 上書きするのはこんなとき |
|------|---------|------------------|
| `_get_extra_tui_widgets()` | レイアウトにウィジェットを差し込む | 常に出しておきたい UI 要素 (パネル、ステータス行、ミニプレーヤー) が要るとき |
| `_register_extra_tui_keybindings(kb, *, input_area)` | キーボードショートカットを足す | ホットキー (パネルの開閉、再生操作、モーダルのショートカット) が要るとき |
| `_build_tui_layout_children(**widgets)` | ウィジェットの並び順を完全に握る | 既存のウィジェットを並べ替えたり包んだりしたいとき (まれです) |
| `process_command()` | 独自のスラッシュコマンドを足す | `/mycommand` を処理したいとき (以前からあるフック) |
| `_build_tui_style_dict()` | prompt_toolkit のスタイルを自作する | 独自の色やスタイルが要るとき (以前からあるフック) |

最初の 3 つが新しく入った保護フックです。あとの 2 つはもともとありました。

## さっそく試す: ラッパー CLI {#quick-start-a-wrapper-cli}

```python
#!/usr/bin/env python3
"""my_cli.py — Example wrapper CLI that extends Hermes."""

from cli import HermesCLI
from prompt_toolkit.layout import FormattedTextControl, Window
from prompt_toolkit.filters import Condition

class MyCLI(HermesCLI):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._panel_visible = False

    def _get_extra_tui_widgets(self):
        """Add a toggleable info panel above the status bar."""
        cli_ref = self
        return [
            Window(
                FormattedTextControl(lambda: "📊 My custom panel content"),
                height=1,
                filter=Condition(lambda: cli_ref._panel_visible),
            ),
        ]

    def _register_extra_tui_keybindings(self, kb, *, input_area):
        """F2 toggles the custom panel."""
        cli_ref = self

        @kb.add("f2")
        def _toggle_panel(event):
            cli_ref._panel_visible = not cli_ref._panel_visible

    def process_command(self, cmd: str) -> bool:
        """Add a /panel slash command."""
        if cmd.strip().lower() == "/panel":
            self._panel_visible = not self._panel_visible
            state = "visible" if self._panel_visible else "hidden"
            print(f"Panel is now {state}")
            return True
        return super().process_command(cmd)

if __name__ == "__main__":
    cli = MyCLI()
    cli.run()
```

次のように実行します。

```bash
cd ~/.hermes/hermes-agent
source .venv/bin/activate
python my_cli.py
```

## フックの一覧 {#hook-reference}

### `_get_extra_tui_widgets()` {#getextratuiwidgets}

TUI のレイアウトへ差し込む prompt_toolkit ウィジェットのリストを返します。ウィジェットは **スペーサーとステータスバーのあいだ** に出ます。つまり入力欄より上、メインの出力より下です。

```python
def _get_extra_tui_widgets(self) -> list:
    return []  # default: no extra widgets
```

それぞれのウィジェットは prompt_toolkit のコンテナ (`Window`、`ConditionalContainer`、`HSplit` など) にしてください。表示を切り替えられるようにするには `ConditionalContainer` か `filter=Condition(...)` を使います。

```python
from prompt_toolkit.layout import ConditionalContainer, Window, FormattedTextControl
from prompt_toolkit.filters import Condition

def _get_extra_tui_widgets(self):
    return [
        ConditionalContainer(
            Window(FormattedTextControl("Status: connected"), height=1),
            filter=Condition(lambda: self._show_status),
        ),
    ]
```

### `_register_extra_tui_keybindings(kb, *, input_area)` {#registerextratuikeybindingskb-inputarea}

Hermes が自前のキーバインドを登録したあと、レイアウトが組み立てられる前に呼ばれます。自分のキーバインドは `kb` に足してください。

```python
def _register_extra_tui_keybindings(self, kb, *, input_area):
    pass  # default: no extra keybindings
```

引数は次のとおりです。
- **`kb`** — prompt_toolkit アプリケーション用の `KeyBindings` インスタンス
- **`input_area`** — メインの `TextArea` ウィジェット。入力内容を読んだり書き換えたりしたいときに使います

```python
def _register_extra_tui_keybindings(self, kb, *, input_area):
    cli_ref = self

    @kb.add("f3")
    def _clear_input(event):
        input_area.text = ""

    @kb.add("f4")
    def _insert_template(event):
        input_area.text = "/search "
```

組み込みのキーバインドとは **ぶつからないように** してください。`Enter` (送信)、`Escape Enter` (改行)、`Ctrl-C` (中断)、`Ctrl-D` (終了)、`Tab` (入力候補の確定) が使われています。F2 以降のファンクションキーと Ctrl の組み合わせなら、だいたい安全です。

### `_build_tui_layout_children(**widgets)` {#buildtuilayoutchildrenwidgets}

ウィジェットの並び順を全部自分で決めたいときだけ、これを上書きしてください。たいていの拡張は `_get_extra_tui_widgets()` で足ります。

```python
def _build_tui_layout_children(self, *, sudo_widget, secret_widget,
    approval_widget, clarify_widget, model_picker_widget=None,
    spinner_widget=None, spacer, status_bar, input_rule_top,
    image_bar, input_area, input_rule_bot, voice_status_bar,
    completions_menu) -> list:
```

既定の実装は次を返します (`None` のウィジェットは取り除かれます)。

```python
[
    Window(height=0),       # anchor
    sudo_widget,            # sudo password prompt (conditional)
    secret_widget,          # secret input prompt (conditional)
    approval_widget,        # dangerous command approval (conditional)
    clarify_widget,         # clarify question UI (conditional)
    model_picker_widget,    # model picker overlay (conditional)
    spinner_widget,         # thinking spinner (conditional)
    spacer,                 # fills remaining vertical space
    *self._get_extra_tui_widgets(),  # YOUR WIDGETS GO HERE
    status_bar,             # model/token/context status line
    input_rule_top,         # ─── border above input
    image_bar,              # attached images indicator
    input_area,             # user text input
    input_rule_bot,         # ─── border below input
    voice_status_bar,       # voice mode status (conditional)
    completions_menu,       # autocomplete dropdown
]
```

## レイアウトの図 {#layout-diagram}

既定のレイアウトを上から順に並べると、こうなります。

1. **出力エリア** — スクロールする会話の履歴
2. **スペーサー**
3. **追加ウィジェット** — `_get_extra_tui_widgets()` が返したもの
4. **ステータスバー** — モデル、コンテキストの使用率、経過時間
5. **画像バー** — 添付した画像の枚数
6. **入力エリア** — こちらが打ち込む文章
7. **音声ステータス** — 録音中かどうかの表示
8. **入力候補メニュー** — 補完の候補

## コツ {#tips}

- **表示を更新する**: 状態を変えたあとは `self._invalidate()` を呼ぶと、prompt_toolkit が描き直します。
- **エージェントの状態にさわる**: `self.agent`、`self.model`、`self.conversation_history` はどれも使えます。
- **独自のスタイル**: `_build_tui_style_dict()` を上書きして、自作のスタイルクラスの分を足してください。
- **スラッシュコマンド**: `process_command()` を上書きし、自分のコマンドを処理して、それ以外は `super().process_command(cmd)` に渡します。
- **`run()` は上書きしない**: どうしても必要なとき以外は避けてください。拡張フックは、まさにその結びつきを避けるために用意されています。
