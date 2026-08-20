---
title: "ペット（Petdex のマスコット）"
description: "CLI・TUI・デスクトップアプリを通じて、エージェントの動きに反応する動くマスコットを迎え入れる"
upstream_path: user-guide/features/pets.md
upstream_blob: f36f90a471c656cdb4b97c7bc9a5e59c7453e8f7
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/pets
---

# ペット {#pets}

Hermes は動く **ペット** を表示できます。エージェントが何をしているか（待機中、
ツールの実行中、思考中、完了、失敗）に反応する小さなマスコットで、**CLI**、
**TUI**、**デスクトップアプリ** のどこでも表示されます。ペットは公開されている
[petdex](https://github.com/crafter-station/petdex) のギャラリーから来ています。

ペットは見た目だけのものです。**プロンプトのキャッシュ、トークン、エージェントの
振る舞いには何の影響もありません**。スプライトは表示上の存在にすぎません。この機能は
**既定でオフ** で、ペットを導入して選ぶまでは何も起きません。

## 仕組み {#how-it-works}

- ペットはプロファイルの `pets/` ディレクトリ
  （`<HERMES_HOME>/pets/<slug>/`）に導入されるので、[プロファイル](/hermes/docs/user-guide/profiles/)ごとに
  別々の顔ぶれを持てます。
- ペットを選ぶと `display.pet.slug` と `display.pet.enabled` が
  `config.yaml` に書き込まれます。秘密情報や環境変数として保存されるものはありません。
- どの画面も、もともと追いかけている動きを見て、それを 6 つのアニメーション状態の
  どれかに割り当てます。この対応表は 1 か所にまとまっていて、どの画面でも同じように
  振る舞います。

  | エージェントの動き | ペットの状態 |
  | --- | --- |
  | ツールやターンが失敗した直後 | `failed` |
  | 計画をやりきった（todo がすべて完了） | `jump`（お祝い） |
  | ターンがきれいに終わった | `wave` |
  | ツールを実行している | `run` |
  | モデルが考えている・読んでいる | `review` |
  | ターンの途中（内訳は不明） | `run` |
  | こちらの返事待ち（確認や承認の問いかけが開いている） | `waiting`（旧来の 8 行のシートでは `idle` に戻ります） |
  | 何も起きていない | `idle` |

## 描画 {#rendering}

ターミナル（CLI と TUI）では、使っているターミナルが画像表示のプロトコル
（**kitty**、**Ghostty**、**WezTerm**、**iTerm2**、**sixel**）に対応していれば、
Hermes はスプライトをそのままの精度で描きます。対応していない場合は、フルカラーの
Unicode の **半角ブロック** による描画へ自動的に切り替わります。パイプやリダイレクトの
中（TTY がない状態）では、ターミナルへの描画は意図的に行いません。

デスクトップアプリでは、ペットはキャンバス上を漂うスプライトとして描かれ、
**設定 → 外観** から表示を切り替えられます。

## クイックスタート（CLI） {#quick-start-cli}

```bash
# Browse the gallery (filter by substring)
hermes pets list
hermes pets list cat

# Install a pet and make it active in one step
hermes pets install boba --select

# Preview / animate it in your terminal (Ctrl+C to stop)
hermes pets show

# Check your setup
hermes pets doctor
```

## `hermes pets` のコマンド {#hermes-pets-commands}

| やりたいこと | コマンド |
| --- | --- |
| ギャラリーを眺める | `hermes pets list [query] [--limit N]` |
| 導入済みのペットを一覧する | `hermes pets list --installed` |
| ペットを導入する | `hermes pets install <slug> [--select] [--force]` |
| 表に出すペットを決める | `hermes pets select [slug]`（slug を省くと選択画面が出ます） |
| どの画面でも大きさを変える | `hermes pets scale <factor>`（例: `0.5`、0.1〜3.0 の範囲に収まります） |
| 見た目を確かめる・動かす | `hermes pets show [slug] [--state <s>] [--cycle] [--once] [--mode <m>] [--scale <f>]` |
| ペットを止める | `hermes pets off` |
| 導入したペットを消す | `hermes pets remove <slug>` |
| 設定を診断する | `hermes pets doctor` |

`hermes pets show` のオプションは次のとおりです。

- `--state` — 状態を 1 つだけ再生します（`idle`、`wave`、`run`、`failed`、`review`、
  `jump`）。
- `--cycle` — すべての状態を順番に再生します。
- `--once` — 繰り返さず 1 回だけ再生します。
- `--mode` — 描画のプロトコルを指定します（`kitty`、`iterm`、`sixel`、
  `unicode`、`auto`）。
- `--scale` — 画面上の大きさを上書きします（`0` は設定の値を使います）。

## `/pet` スラッシュコマンド {#pet-slash-command}

CLI と TUI では、セッションを抜けずにペットを扱えます。

- `/pet` — ペットの表示を切り替えます（表に出ているペットがなければ、最初に導入した
  ものを迎え入れます）。
- `/pet list` — ギャラリーを眺めます。
- `/pet scale <factor>` — どの画面でも大きさを変えます（例: `/pet scale 0.5`）。
- `/pet <slug>` — 指定したペットを迎え入れます。
- `/pet off` — ペットを止めます。

TUI では `/pet list` が対話的な選択画面を重ねて開き、デスクトップアプリでは
Cmd+K のペットパレットが開きます。

## ペットを作る（`/hatch`） {#generating-a-pet-hatch}

ギャラリーにある出来合いのペットを導入するだけでなく、Hermes は文章での説明から **まったく新しいペットを作り出す** こともできます。スプライトを生成する仕組みを自前で持っています。

- CLI と TUI: `/hatch <description>`（別名 `/generate-pet`）、または `hermes pets` から生成の流れに入ります。
- デスクトップアプリ: 図鑑のような **generate** の画面。動く卵、孵化の演出、下書きの選択画面が付いています。

生成は次の 2 段階で、費用が膨らまないようにしてあります。

1. **元になる下書き** — 「このペットはどんな見た目か」を文章だけで表した安価な候補をいくつか作ります。そこから 1 つ選ぶか、作り直して別の候補を出します。
2. **孵化** — 選んだ元絵を参照画像として、Hermes の状態ごと（待機、思考、ツールの使用など）に 1 行ずつアニメーションを生成します。それを決まった手順でコマに切り分け、標準的な petdex / Codex のアトラス（192×208 のセルを 8×9 に並べたもの）にまとめます。できあがるのは手元に残せる正しいスプライトシートで、`petdex submit` に出すこともできます。

### 画像生成の裏側 {#image-backend}

生成には、いま有効になっている[画像生成のプロバイダー](/hermes/docs/user-guide/features/image-generation/)を使いますが、どの行のアニメーションでも同じキャラクターのままにするために **参照画像を手がかりにできること** が条件になります。参照画像を扱えるのは **Nous Portal**、**OpenRouter**、**OpenAI**（`gpt-image-2`）、**Krea** です。OpenRouter と Nous は、既定で品質を優先したモデルの並びを使います。

- 選ばれる順番は Nous Portal → OpenAI → OpenRouter です。
- 参照画像を扱えるものが 1 つも設定されていない場合、生成は `hermes tools` → Image Generation を案内する、次にすることが分かるエラーを返します。（ギャラリーのペットを導入して迎え入れるだけなら、画像生成の設定は要りません。）
- 使う先は `HERMES_PET_IMAGE_PROVIDER` 環境変数で上書きできます（例: `HERMES_PET_IMAGE_PROVIDER=openrouter`）。

## デスクトップアプリ {#desktop-app}

デスクトップアプリでは、ペットを 2 つの方法で扱えます。

- **Cmd+K → 「Pets…」** — キーボードから離れずに、眺める、探す、迎え入れる、表示を
  切り替える、までできます（テーマの選択画面と同じ操作感です）。
- **設定 → 外観** — 同じギャラリーに加えて、**大きさのスライダー** があり、
  動かすとその場で漂うマスコットの大きさが変わります。

どちらでも、迎え入れる・表示を切り替える・大きさを変えるがその場で反映されます。
大きさの変更はすぐに効き、新しいペットを迎え入れると少し待つうちに現れます。

### 歩き回る {#roaming}

設定 → 外観には **Roam** の切り替えがあります。オンにすると、エージェントが手空きの
あいだ、ペットがウィンドウの中を自分で歩き回ります。面の上を歩き、立ち止まり、
別の場所へ跳び移ります。歩き回るのは、ペットがウィンドウの中にいて、表示が有効で、
エージェントが休んでいるときだけです。エージェントの動きに応じた状態（作業中、
お祝い）が入ればすぐにそちらが優先されます。この切り替えは既定でオフで、
再起動しても設定は残ります。

### Alt + ホイールで大きさを変える {#altwheel-resizing}

ペットの上で **Alt** を押しながらマウスホイールを回すと、その場で大きさが変わります。
アプリのウィンドウの中でも、切り離した重ね表示でも同じです。重ね表示ではカーソルの
位置へ向かって拡大され、そのときの大きさが保存されるので、再起動しても残り、
アプリ内のペットとも揃ったままになります。

### かわいがると反応する {#vibe-reactions}

エージェントに優しい言葉をかけると（「good bot」「thank you」「ily」、`<3`、ハートの
絵文字など）、ペットはハートを漂わせたり（デスクトップ）、ハートを一瞬光らせたり
（CLI と TUI）して応えます。判定は選び抜いた語のリストを手元で照合するだけで、
トークンは消費しません（モデルは呼びません）。反応するのはエージェントへ向けられた
好意や感謝であって、前向きな言葉全般ではありません。CLI のペット、TUI、デスクトップの
漂うペット、切り離した重ね表示のどれもが、同じ合図で反応します。

### 切り離した重ね表示 {#pop-out-overlay}

漂っているペットを **Shift を押しながらクリック** すると、背景が透けた、常に最前面に
出る専用のウィンドウとして切り離せます。切り離しておけば Hermes を最小化していても
見えたままなので（Codex のような形です）、一目でエージェントの様子が分かります。

切り離したあとの操作は次のとおりです。

| 操作 | 起きること |
| --- | --- |
| **ドラッグ** | ペットを画面のどこへでも、アプリの外にも動かせます。位置と、切り離しているかどうかは再起動しても残ります。 |
| **シングルクリック** | 小さな入力欄が開き、いちばん新しいセッションへ指示を送れます。アプリを前面に出す必要はありません。 |
| **ダブルクリック** | アプリのウィンドウを切り替えます。前面にあれば最小化し、隠れていれば元に戻します。 |
| **Shift を押しながらクリック** | ペットをウィンドウの中へ戻します。 |
| **封筒のアイコン** | 席を外しているあいだにターンが終わったときだけ現れます。クリックすると、いちばん新しいやり取りを開いた状態でアプリが前面に出ます（既読にもなります）。 |

**吹き出し**（`working…`、`thinking…`、
`your turn` など）が出るのは切り離したペットだけです。ウィンドウの中ではアプリ自身が
その役目を果たすので、ペットは黙っています。

重ね表示はアプリ内のペットをそのまま映しているだけで、別の接続を持たず、
Dock やアプリの切り替え画面にも現れません。

## 設定 {#configuration}

設定はすべて `config.yaml` の `display.pet` の下にあります。

```yaml
display:
  pet:
    enabled: false        # master on/off (true once you select a pet)
    slug: ""              # active pet; empty = first installed
    render_mode: auto      # auto | kitty | iterm | sixel | unicode | off
    scale: 0.33           # master size knob (relative to native 192x208 frames)
    unicode_cols: 0       # hard override for terminal width (0 = derive from scale)
```

- **`scale`** が大きさを決める唯一のつまみです。この数値ひとつで、どの画面でも
  小さくなります。デスクトップのキャンバスはこの値でピクセルを縮め、CLI と TUI は
  ここからターミナルの桁数を割り出します。半角ブロックでの描画には読みやすさの下限が
  あります。kitty や GUI のようにピクセル単位で描く場合ほど小さくすると形が崩れるため、
  同じ `scale` でも kitty ではくっきり見え、半角ブロックでは下限で止まります。
- **`render_mode: auto`** は kitty、iTerm2、sixel を見分け、対応していなければ
  Unicode の半角ブロックへ切り替えます。プロトコルを固定したいときは明示的に指定し、
  デスクトップのペットは残したままターミナルの描画だけ止めたいときは `off` にします。
- **`unicode_cols`** は `scale` とは別にターミナルの桁数を固定します。`scale` から
  桁数を決めさせたい場合は `0` のままにしてください。

## 困ったときは {#troubleshooting}

`hermes pets doctor` を実行してください。次のことを教えてくれます。

- ペットのディレクトリと、導入済みのペット
- `display.pet.enabled`、`display.pet.slug`、そこから決まった、いま表に出ているペット
- 設定されている `render_mode`、見つかったターミナルの画像表示プロトコル、
  TTY で実際に使われる方式
- スプライトの読み込みに使う Pillow を読み込めるかどうか

ペットが導入され、選ばれ、表示が有効になり、Pillow も使える状態になると
`✓ ready` と表示されます。

よくある落とし穴は次のとおりです。

- ペットが現れるのは、**導入して、さらに選んだ** ときだけです（`enabled: true`）。
- パイプやリダイレクトの中（TTY がない状態）では、ターミナルへの描画は意図的に
  行いません。
- petdex の npm 版 CLI は `~/.codex/pets` に導入しますが、Hermes はプロファイルごとの
  `<HERMES_HOME>/pets/` を使います。導入は `hermes pets` から行ってください。

## 関連項目 {#see-also}

- [`hermes-agent` skill](/hermes/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent/)
  を使うと、頼んだときにエージェント自身がペットを導入したり入れ替えたりできます
  （skill の `references/petdex.md` を参照してください）。
