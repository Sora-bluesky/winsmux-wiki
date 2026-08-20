---
title: "CLI を拡張する"
description: "Hermes の TUI に独自のウィジェット・キー割り当て・配置の変更を足す、ラッパー CLI の作り方"
upstream_path: developer-guide/extending-the-cli.md
upstream_blob: fbd6da6f946537b155f8db03af48d58fe40fca68
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/extending-the-cli
---

# CLI を拡張する {#extending-the-cli}

Hermes は `HermesCLI` に protected な拡張用のフックを用意しています。おかげで、包み込む側の CLI は 1000 行を超える `run()` を上書きしなくても、ウィジェット、キー割り当て、配置の変更を足せます。こうしておけば、内部が変わっても自分の拡張が巻き込まれずに済みます。

## 拡張できるところ {#extension-points}

つなぎ目は 5 つあります。

| フック | 役割 | 上書きするのはこんなとき |
|------|---------|------------------|
| `_get_extra_tui_widgets()` | ウィジェットを配置に差し込みます | 常に出ている画面部品（パネル、状態表示、小さなプレーヤーなど）が欲しいとき |
| `_register_extra_tui_keybindings(kb, *, input_area)` | キーの操作を足します | ホットキーが欲しいとき（パネルの開閉、再生の操作、ダイアログの呼び出しなど） |
| `_build_tui_layout_children(**widgets)` | ウィジェットの並び順をすべて自分で決めます | 既存のウィジェットを並べ替えたり包んだりしたいとき（めったにありません） |
| `process_command()` | 独自のスラッシュコマンドを足します | `/mycommand` を扱いたいとき（以前からあるフックです） |
| `_build_tui_style_dict()` | prompt_toolkit の見た目を変えます | 色や装飾を自分で決めたいとき（以前からあるフックです） |

このうち上の 3 つが新しく用意された protected なフックです。下の 2 つは以前からありました。

## まずは動かす: ラッパー CLI {#quick-start-a-wrapper-cli}

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

動かしてみます。

```bash
cd ~/.hermes/hermes-agent
source .venv/bin/activate
python my_cli.py
```

## フックの一覧 {#hook-reference}

### `_get_extra_tui_widgets()` {#getextratuiwidgets}

TUI の配置に差し込む prompt_toolkit のウィジェットを、リストで返します。ウィジェットが入るのは**余白と状態表示のあいだ**、つまり入力欄より上、本文の出力より下です。

```python
def _get_extra_tui_widgets(self) -> list:
    return []  # default: no extra widgets
```

それぞれのウィジェットは prompt_toolkit のコンテナ（`Window`、`ConditionalContainer`、`HSplit` など）にします。出したり隠したりしたいときは、`ConditionalContainer` か `filter=Condition(...)` を使います。

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

Hermes が自前のキー割り当てを登録したあと、配置が組み立てられる前に呼ばれます。自分のキー割り当てを `kb` に足してください。

```python
def _register_extra_tui_keybindings(self, kb, *, input_area):
    pass  # default: no extra keybindings
```

引数は次のとおりです。

- **`kb`** — prompt_toolkit のアプリケーション用の `KeyBindings` のインスタンス
- **`input_area`** — 入力欄の `TextArea` ウィジェット。利用者の入力を読んだり書き換えたりしたいときに使います

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

元からあるキー割り当てと**ぶつからないように**してください。`Enter`（送信）、`Escape Enter`（改行）、`Ctrl-C`（中断）、`Ctrl-D`（終了）、`Tab`（入力候補の確定）です。F2 以降のファンクションキーと Ctrl の組み合わせは、たいてい空いています。

### `_build_tui_layout_children(**widgets)` {#buildtuilayoutchildrenwidgets}

ウィジェットの並び順をすべて自分で決めたいときにだけ上書きします。たいていの拡張は `_get_extra_tui_widgets()` で足ります。

```python
def _build_tui_layout_children(self, *, sudo_widget, secret_widget,
    approval_widget, clarify_widget, model_picker_widget=None,
    spinner_widget=None, spacer, status_bar, input_rule_top,
    image_bar, input_area, input_rule_bot, voice_status_bar,
    completions_menu) -> list:
```

既定の実装が返すのは次のとおりです（`None` のウィジェットは取り除かれます）。

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

## 画面の並び {#layout-diagram}

既定の並びを、上から順に挙げます。

1. **本文の出力** — 流れていく会話の記録
2. **余白**
3. **足したウィジェット** — `_get_extra_tui_widgets()` が返したもの
4. **状態表示** — モデル、コンテキストの使用率、経過時間
5. **画像の表示** — 添えた画像の枚数
6. **入力欄** — 自分が打ち込むところ
7. **音声の状態** — 録音中かどうかの表示
8. **入力候補** — 補完の一覧

## こつ {#tips}

- **画面を描き直させる:** 状態を変えたら `self._invalidate()` を呼んで、prompt_toolkit に描き直させます。
- **エージェントの状態を見る:** `self.agent`、`self.model`、`self.conversation_history` はどれも使えます。
- **見た目を変える:** `_build_tui_style_dict()` を上書きして、自分のスタイル名の項目を足します。
- **スラッシュコマンド:** `process_command()` を上書きして自分のコマンドを扱い、それ以外は `super().process_command(cmd)` に渡します。
- **`run()` は上書きしない:** どうしようもないとき以外は避けてください。そのために、この拡張用のフックが用意されています。
